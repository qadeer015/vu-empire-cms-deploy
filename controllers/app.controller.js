// controllers/app.controller.js
const AppService = require('../services/app.service');
const User = require('../models/User');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Option = require('../models/Option');
const Assignment = require('../models/Assignment');
const GdbSolution = require('../models/GdbSolution');
const PastPaper = require('../models/PastPaper');
const cache = require('../services/cacheService');
const TTL = require('../config/cacheTTL');

const SITE_URL = process.env.SITE_URL || 'https://vuempire.online';

// ── Shared render helper ─────────────────────────────────────────────
function buildBreadcrumbs(data = {}) {
    const page = data.page || '';
    const mode = data.mode || '';
    const breadcrumbs = data.breadcrumbs || [];
    
    if (breadcrumbs.length > 0) {
        return breadcrumbs;
    }
    
    const pageLabels = {
        'dashboard': 'Dashboard',
        'courses': 'Courses',
        'quizzes': 'Quizzes',
        'assignments': 'Assignments',
        'gdb-solutions': 'GDB Solutions',
        'past-papers': 'Past Papers'
    };
    
    const pageUrls = {
        'dashboard': '/',
        'courses': '/courses',
        'quizzes': '/quizzes',
        'assignments': '/assignments',
        'gdb-solutions': '/gdb-solutions',
        'past-papers': '/pastpapers'
    };
    
    const crumbs = [
        { label: 'Home', href: '/' }
    ];
    
    if (page && pageLabels[page]) {
        const parentCrumb = { label: pageLabels[page], href: pageUrls[page] };
        
        if (mode === 'new') {
            crumbs.push(parentCrumb);

            if (page === 'quizzes' && data.quiz) {
                crumbs.push({ label: data.quiz.title, href: '/quizzes/' + data.quiz.quizId });
            }

            crumbs.push({ label: 'Add New', href: '' });
        } else if (mode === 'edit') {
            crumbs.push(parentCrumb);

            if (page === 'courses' && data.course) {
                crumbs.push({ label: data.course.courseCode, href: '/courses/' + data.course.courseId });
            } else if (page === 'quizzes' && data.quiz) {
                crumbs.push({ label: data.quiz.title, href: '/quizzes/' + data.quiz.quizId });
            } else if (page === 'assignments' && data.assignment) {
                crumbs.push({ label: 'Assignment', href: '/assignments/' + data.assignment.id });
            } else if (page === 'gdb-solutions' && data.solution) {
                crumbs.push({ label: 'GDB Solution', href: '/gdb-solutions/' + data.solution.id });
            } else if (page === 'past-papers' && data.paper) {
                crumbs.push({ label: 'Past Paper', href: '/pastpapers/' + data.paper.id });
            }

            crumbs.push({ label: 'Edit', href: '' });
        } else if (mode === 'show' && data.paper) {
            crumbs.push(parentCrumb);
            crumbs.push({ label: 'Past Paper', href: '/pastpapers/' + data.paper.id });
        } else if (mode === 'show' && data.assignment) {
            crumbs.push(parentCrumb);
            crumbs.push({ label: 'Assignment', href: '/assignments/' + data.assignment.id });
        } else if (mode === 'show' && data.solution) {
            crumbs.push(parentCrumb);
            crumbs.push({ label: 'GDB Solution', href: '/gdb-solutions/' + data.solution.id });
        } else if (mode === 'show' && data.quiz) {
            crumbs.push(parentCrumb);
            crumbs.push({ label: data.quiz.title, href: '/quizzes/' + data.quiz.quizId });
        } else if (page === 'courses' && data.course) {
            crumbs.push(parentCrumb);
            crumbs.push({ label: data.course.courseCode, href: '/courses/' + data.course.courseId });
        } else if (page === 'quizzes' && data.quiz) {
            crumbs.push(parentCrumb);
            crumbs.push({ label: data.quiz.title, href: '/quizzes/' + data.quiz.quizId + '/edit' });
        } else {
            crumbs.push(parentCrumb);
        }
    }
    
    return crumbs;
}

function renderAdmin(res, view, data = {}) {
    const breadcrumbs = buildBreadcrumbs(data);
    res.render(view, {
        title: 'VU Empire CMS',
        sidebar: true,
        isGenie: true,
        currentPage: data.page || '',
        breadcrumbs,
        ...data
    });
}

class AppController {

    // ================= DASHBOARD =================
    static async dashboard(req, res) {
        try {
            if (!req.user) {
                return res.redirect('/auth/login');
            }
            const courseSearch = req.query.courseSearch || '';
            const result = await AppService.dashboard(courseSearch);
            return renderAdmin(res, 'dashboard', { ...result, page: 'dashboard', courseSearch });
        } catch (err) {
            console.error('DASHBOARD ERROR:', err);
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/', header: false, footer: false });
        }
    }

    // ================= USERS =================
    static async adminUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 50;
            const offset = (page - 1) * limit;

            const [users, total] = await Promise.all([
                User.findAll({ limit, offset }),
                User.countAll()
            ]);

            renderAdmin(res, 'users/index', {
                page: 'users',
                users,
                total,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/', header: false, footer: false });
        }
    }

    static async adminUserShow(req, res) {
        try {
            console.log(req.params.studentId)
            const userClient = await User.findById(req.params.studentId);
            console.log('userCLinet', userClient)

            if (!userClient) return res.redirect('/users');

            renderAdmin(res, 'users/show', {
                page: 'users',
                userClient
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/courses', header: false, footer: false });
        }
    }

    // ================= COURSES =================
    static async adminCourses(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 50;
            const offset = (page - 1) * limit;
            const search = req.query.q || '';
            const handout = req.query.handout || 'all';

            console.log('COURSES FILTER:', { search, handout, page, limit, offset });

            const [courses, total] = await Promise.all([
                Course.findAllWithFilters({ search, handout, limit, offset }),
                Course.countAllWithFilters({ search, handout })
            ]);

            console.log('COURSES RESULT:', { total, count: courses.length });

            renderAdmin(res, 'courses/index', {
                page: 'courses',
                courses,
                total,
                q: search,
                handout,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (err) {
            console.error('COURSES ERROR:', err);
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/', header: false, footer: false });
        }
    }

    static async adminCourseNew(req, res) {
        renderAdmin(res, 'courses/new', { page: 'courses', mode: 'new', course: '' });
    }

    static async adminCourseCreate(req, res) {
        try {
            const { courseCode, courseName } = req.body;
            if (!courseCode || !courseName) {
                req.flash = req.flash || ((type, msg) => { req._flash = { type, msg }; });
                return res.redirect('/courses/new');
            }
            await Course.create({ courseCode, courseName });
            res.redirect('/courses');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/courses', header: false, footer: false });
        }
    }

    static async adminCourseShow(req, res) {
        try {
            const course = await Course.findById(req.params.id);
            if (!course) return res.redirect('/courses');

            const [quizzes, pastPapers, assignments, gdbSolutions] = await Promise.all([
                Quiz.findByCourse(course.courseId),
                PastPaper.getByCourse(course.courseId),
                Assignment.getByCourse(course.courseCode),
                GdbSolution.getByCourse(course.courseCode)
            ]);

            renderAdmin(res, 'courses/show', {
                page: 'courses',
                course,
                quizzes: quizzes || [],
                pastPapers: pastPapers || [],
                assignments: assignments || [],
                gdbSolutions: gdbSolutions || []
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/courses', header: false, footer: false });
        }
    }

    static async adminCourseEdit(req, res) {
        try {
            const course = await Course.findById(req.params.id);
            if (!course) return res.redirect('/courses');
            renderAdmin(res, 'courses/edit', { page: 'courses', mode: 'edit', course });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/courses', header: false, footer: false });
        }
    }

    static async adminCourseUpdate(req, res) {
        try {
            await Course.update(req.params.id, req.body);
            res.redirect('/courses');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/courses', header: false, footer: false });
        }
    }

    static async adminCourseDelete(req, res) {
        try {
            await Course.delete(req.params.id);
            res.redirect('/courses');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/courses', header: false, footer: false });
        }
    }

    // ================= QUIZZES =================
    static async adminQuizzes(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 50;
            const offset = (page - 1) * limit;

            const [quizzes, total] = await Promise.all([
                Quiz.findAll({ limit, offset }),
                Quiz.countAll()
            ]);

            renderAdmin(res, 'quizzes/index', {
                page: 'quizzes',
                quizzes,
                total,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/', header: false, footer: false });
        }
    }

    static async adminQuizNew(req, res) {
        try {
            const courses = await Course.findAll({ limit: 500 });
            const selectedCourseCode = req.query.courseCode ? String(req.query.courseCode).trim() : '';
            const selectedCourse = selectedCourseCode ? await Course.findByCode(selectedCourseCode) : null;
            renderAdmin(res, 'quizzes/new', {
                page: 'quizzes',
                mode: 'new',
                courses,
                quiz: '',
                selectedCourseId: selectedCourse ? selectedCourse.courseId : null,
                selectedCourseCode
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/quizzes', header: false, footer: false });
        }
    }

    static async adminQuizCreate(req, res) {
        try {
            const { courseId, title, type } = req.body;
            if (!courseId || !title) {
                return res.redirect('/quizzes/new');
            }
            await Quiz.create({ courseId, title: title.trim(), type: type || 'quiz' });
            res.redirect('/quizzes');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/quizzes', header: false, footer: false });
        }
    }

    static async adminQuizShow(req, res) {
        try {
            const quiz = await Quiz.findById(req.params.id);
            if (!quiz) return res.redirect('/quizzes');

            const questions = await Question.findByQuizId(quiz.quizId);

            renderAdmin(res, 'quizzes/show', { page: 'quizzes', mode: 'show', quiz, questions });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/quizzes', header: false, footer: false });
        }
    }

    static async adminQuizEdit(req, res) {
        try {
            const [quiz, courses] = await Promise.all([
                Quiz.findById(req.params.id),
                Course.findAll({ limit: 500 })
            ]);
            if (!quiz) return res.redirect('/quizzes');

            const questions = await Question.findByQuizId(quiz.quizId);

            renderAdmin(res, 'quizzes/edit', { page: 'quizzes', mode: 'edit', quiz, courses, questions });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/quizzes', header: false, footer: false });
        }
    }

    static async adminQuizUpdate(req, res) {
        try {
            await Quiz.update(req.params.id, req.body);
            res.redirect('/quizzes/' + req.params.id + '/edit');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/quizzes', header: false, footer: false });
        }
    }

    static async adminQuizDelete(req, res) {
        try {
            await Quiz.delete(req.params.id);
            res.redirect('/quizzes');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/quizzes', header: false, footer: false });
        }
    }

    // Quiz question CRUD
    static async adminQuestionNew(req, res) {
        try {
            const quiz = await Quiz.findById(req.params.quizId);
            if (!quiz) return res.redirect('/quizzes');
            const courses = await Course.findAll({ limit: 500 });
            renderAdmin(res, 'quizzes/questions/new', { page: 'quizzes', mode: 'new', quiz, courses, question: '' });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/quizzes', header: false, footer: false });
        }
    }

    static async adminQuizQuestions(req, res) {
        try {
            const quiz = await Quiz.findById(req.params.quizId);
            if (!quiz) return res.redirect('/quizzes');

            const questions = await Question.findByQuizId(quiz.quizId);

            renderAdmin(res, 'quizzes/questions/index', {
                page: 'quizzes',
                mode: 'show',
                quiz,
                questions: questions || []
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/quizzes', header: false, footer: false });
        }
    }

    static async adminQuestionCreate(req, res) {
        try {
            const { quizId } = req.params;
            const { courseId, questionText, explanation, options } = req.body;

            const quiz = await Quiz.findById(quizId);
            if (!quiz) return res.redirect('/quizzes');

            // Create question
            const question = await Question.create({
                courseId: courseId || quiz.courseId,
                quizId,
                questionText: questionText.trim(),
                explanation: explanation || '',
                timestamp: new Date()
            });

            // Insert options
            if (options && Array.isArray(options)) {
                const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                const optionData = options
                    .filter(o => o && o.text && o.text.trim())
                    .map((o, idx) => {
                        const isCorrect = o.isCorrect === 'on' || o.isCorrect === 'true' || o.isCorrect === true || o.isCorrect === '1';
                        return {
                            questionId: question.questionId,
                            letter: o.letter || letters[idx] || String.fromCharCode(65 + idx),
                            optionText: o.text.trim(),
                            optionIndex: idx + 1,
                            isCorrect: isCorrect ? 1 : 0
                        };
                    });
                if (optionData.length > 0) {
                    await Option.createMultiple(optionData);
                }
            }

            res.redirect('/quizzes/' + quizId + '/edit');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/quizzes', header: false, footer: false });
        }
    }

    static async adminQuestionBulkPreview(req, res) {
        try {
            const { quizId } = req.params;
            const quiz = await Quiz.findById(quizId);
            if (!quiz) {
                return res.status(404).json({ success: false, message: 'Quiz not found' });
            }

            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No JSON file uploaded.' });
            }

            let payload;
            try {
                payload = JSON.parse(req.file.buffer.toString('utf-8'));
            } catch (parseErr) {
                return res.status(400).json({ success: false, message: 'Invalid JSON file: ' + parseErr.message });
            }

            // Accept either a top-level array or an object with a questions array
            const questions = Array.isArray(payload)
                ? payload
                : (payload.questions && Array.isArray(payload.questions)
                    ? payload.questions
                    : null);

            if (!questions) {
                return res.status(400).json({ success: false, message: 'JSON must be an array of questions or contain a "questions" array.' });
            }

            const courseId = quiz.courseId;
            const existingQuestions = await Question.findByCourse(courseId);
            const existingTexts = new Set(
                existingQuestions.map(q => q.questionText.trim().toLowerCase().substring(0, 100))
            );

            const normalizedInputTexts = new Set();
            const preview = questions.map((q, i) => {
                const originalIndex = i + 1;
                if (!q.questionText || !q.options || !Array.isArray(q.options) || q.options.length < 2) {
                    return {
                        originalIndex,
                        questionText: q.questionText || '(empty)',
                        status: 'invalid',
                        reason: 'Missing text or options',
                        options: q.options || [],
                        explanation: q.explanation || ''
                    };
                }

                const normalizedText = q.questionText.trim().toLowerCase().substring(0, 100);

                if (normalizedInputTexts.has(normalizedText)) {
                    return {
                        originalIndex,
                        questionText: q.questionText,
                        status: 'duplicate_in_file',
                        reason: 'Duplicate within uploaded file',
                        options: q.options || [],
                        explanation: q.explanation || ''
                    };
                }

                if (existingTexts.has(normalizedText)) {
                    return {
                        originalIndex,
                        questionText: q.questionText,
                        status: 'duplicate_in_db',
                        reason: 'Already exists in database',
                        options: q.options || [],
                        explanation: q.explanation || ''
                    };
                }

                normalizedInputTexts.add(normalizedText);
                return {
                    originalIndex,
                    questionText: q.questionText,
                    status: 'ready',
                    reason: 'Ready to create',
                    options: q.options || [],
                    explanation: q.explanation || ''
                };
            });

            const summary = {
                total: preview.length,
                valid: preview.filter(p => p.status === 'ready').length,
                invalid: preview.filter(p => p.status === 'invalid').length,
                duplicateInFile: preview.filter(p => p.status === 'duplicate_in_file').length,
                duplicateInDb: preview.filter(p => p.status === 'duplicate_in_db').length
            };

            return res.status(200).json({ success: true, summary, preview });
        } catch (err) {
            return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
        }
    }

    static async adminQuestionBulkCreate(req, res) {
        try {
            const { quizId } = req.params;
            const quiz = await Quiz.findById(quizId);
            if (!quiz) {
                return res.status(404).json({ success: false, message: 'Quiz not found' });
            }

            // Only allow bulk creation for quizzes with title "Main"
            if (quiz.title !== 'Main') {
                return res.status(403).json({
                    success: false,
                    message: 'Bulk question upload is only allowed for quizzes with title "Main".'
                });
            }

            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No JSON file uploaded.' });
            }

            let payload;
            try {
                payload = JSON.parse(req.file.buffer.toString('utf-8'));
            } catch (parseErr) {
                return res.status(400).json({ success: false, message: 'Invalid JSON file: ' + parseErr.message });
            }

            // Accept either a top-level array or an object with a questions array
            const questions = Array.isArray(payload)
                ? payload
                : (payload.questions && Array.isArray(payload.questions)
                    ? payload.questions
                    : null);

            if (!questions) {
                return res.status(400).json({ success: false, message: 'JSON must be an array of questions or contain a "questions" array.' });
            }

            const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            const courseId = quiz.courseId;

            // Build set of existing question texts for this course to avoid duplicates.
            // IMPORTANT: The DB unique index is on (courseId, questionText(100)),
            // so we must normalize to the same 100-char prefix to avoid false negatives
            // that would otherwise blow up with ER_DUP_ENTRY at INSERT time.
            const existingQuestions = await Question.findByCourse(courseId);
            const existingTexts = new Set(
                existingQuestions.map(q => q.questionText.trim().toLowerCase().substring(0, 100))
            );

            const normalizedInputTexts = new Set();
            let createdCount = 0;
            let skippedDuplicates = 0;
            let errorCount = 0;

            const createdQuestions = [];
            const skippedQuestions = [];

            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];

                if (!q.questionText || !q.options || !Array.isArray(q.options) || q.options.length < 2) {
                    skippedQuestions.push({
                        originalIndex: i + 1,
                        questionText: q.questionText || '(empty)',
                        reason: 'Invalid question: missing text or options',
                        options: q.options || [],
                        explanation: q.explanation || ''
                    });
                    skippedDuplicates++;
                    continue;
                }

                const normalizedText = q.questionText.trim().toLowerCase().substring(0, 100);

                // Skip if duplicate within the uploaded file
                if (normalizedInputTexts.has(normalizedText)) {
                    skippedQuestions.push({
                        originalIndex: i + 1,
                        questionText: q.questionText,
                        reason: 'Duplicate within uploaded file',
                        options: q.options || [],
                        explanation: q.explanation || ''
                    });
                    skippedDuplicates++;
                    continue;
                }

                // Skip if already exists in database
                if (existingTexts.has(normalizedText)) {
                    skippedQuestions.push({
                        originalIndex: i + 1,
                        questionText: q.questionText,
                        reason: 'Duplicate question already exists',
                        options: q.options || [],
                        explanation: q.explanation || ''
                    });
                    skippedDuplicates++;
                    continue;
                }

                normalizedInputTexts.add(normalizedText);

                try {
                    const question = await Question.create({
                        courseId,
                        quizId,
                        questionText: q.questionText.trim(),
                        explanation: q.explanation ? q.explanation.trim() : '',
                        timestamp: new Date()
                    }, true);

                    // The uploaded JSON format (CS001.json) does not include correct-answer
                    // metadata, so we do NOT mark any option as correct by default.
                    // If the file ever includes a `solution.correctAnswers` array we honor it.
                    const solution = q.solution && typeof q.solution === 'object' ? q.solution : null;
                    const correctLetters = new Set(
                        (solution && Array.isArray(solution.correctAnswers)
                            ? solution.correctAnswers
                            : []
                        ).map(l => String(l).trim().toUpperCase())
                    );

                    const options = Array.isArray(q.options) ? q.options : [];
                    const optionData = options.map((opt, idx) => {
                        const text = typeof opt === 'string' ? opt : (opt.text || '');
                        const label = typeof opt === 'string' ? '' : String(opt.label || '').trim().toUpperCase();
                        const letter = label || letters[idx] || String.fromCharCode(65 + idx);
                        const isCorrect = correctLetters.has(letter);
                        return {
                            questionId: question.questionId,
                            letter: letter,
                            optionText: text.trim(),
                            optionIndex: idx + 1,
                            isCorrect: isCorrect ? 1 : 0
                        };
                    });

                    if (optionData.length > 0) {
                        await Option.createMultiple(optionData);
                    }

                    createdCount++;
                    createdQuestions.push({
                        questionId: question.questionId,
                        questionText: q.questionText.trim(),
                        optionsCount: options.length
                    });
                } catch (err) {
                    errorCount++;
                    let reason = 'Error: ' + err.message;
                    if (err.code === 'ER_DUP_ENTRY') {
                        reason = 'Duplicate question (database constraint violation)';
                    }
                    skippedQuestions.push({
                        originalIndex: i + 1,
                        questionText: q.questionText,
                        reason: reason,
                        options: q.options || [],
                        explanation: q.explanation || ''
                    });
                }
            }

            // Invalidate caches once after all inserts
            await Question._invalidateQuestionCaches(null, courseId, quizId);

            res.status(200).json({
                success: true,
                summary: {
                    total: questions.length,
                    created: createdCount,
                    skipped: skippedDuplicates,
                    errors: errorCount
                },
                createdQuestions,
                skippedQuestions
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: 'Server error: ' + err.message
            });
        }
    }

    static async adminQuestionEdit(req, res) {
        try {
            const [question, courses] = await Promise.all([
                Question.getQuestionWithOptions(req.params.questionId),
                Course.findAll({ limit: 500 })
            ]);
            if (!question) return res.redirect('/quizzes');

            const quiz = await Quiz.findById(question.quizId);

            renderAdmin(res, 'quizzes/questions/edit', { page: 'quizzes', mode: 'edit', question, quiz, courses });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/quizzes', header: false, footer: false });
        }
    }

    static async adminQuestionUpdate(req, res) {
        try {
            const { questionId } = req.params;
            const { courseId, questionText, explanation, options } = req.body;

            const current = await Question.findById(questionId);
            if (!current) return res.redirect('/quizzes');

            await Question.update(questionId, {
                courseId: courseId || current.courseId,
                quizId: current.quizId,
                questionText: questionText.trim(),
                explanation: explanation || '',
                timestamp: current.timestamp || new Date()
            });

            // Delete old options and recreate
            await Option.deleteByQuestionId(questionId);

            if (options && Array.isArray(options)) {
                const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                const optionData = options
                    .filter(o => o && o.text && o.text.trim())
                    .map((o, idx) => {
                        const isCorrect = o.isCorrect === 'on' || o.isCorrect === 'true' || o.isCorrect === true || o.isCorrect === '1';
                        return {
                            questionId,
                            letter: o.letter || letters[idx] || String.fromCharCode(65 + idx),
                            optionText: o.text.trim(),
                            optionIndex: idx + 1,
                            isCorrect: isCorrect ? 1 : 0
                        };
                    });
                if (optionData.length > 0) {
                    await Option.createMultiple(optionData);
                }
            }

            res.redirect('/quizzes/' + current.quizId + '/edit');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/quizzes', header: false, footer: false });
        }
    }

    static async adminQuestionDelete(req, res) {
        try {
            const question = await Question.findById(req.params.questionId);
            await Question.delete(req.params.questionId);
            res.redirect('/quizzes/' + (question ? question.quizId : '') + '/edit');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/quizzes', header: false, footer: false });
        }
    }

    static async adminQuestionCreateApi(req, res) {
        try {
            const { quizId } = req.params;
            const { courseId, questionText, explanation, options } = req.body;

            const quiz = await Quiz.findById(quizId);
            if (!quiz) {
                return res.status(404).json({ success: false, message: 'Quiz not found' });
            }

            const targetCourseId = courseId || quiz.courseId;
            const trimmedText = questionText.trim();

            // Check for duplicates
            const existing = await Question.findByCourseAndText(targetCourseId, trimmedText);
            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: 'Duplicate question already exists',
                    data: { existingQuestionId: existing.questionId }
                });
            }

            let question;
            try {
                question = await Question.create({
                    courseId: targetCourseId,
                    quizId,
                    questionText: trimmedText,
                    explanation: explanation ? explanation.trim() : '',
                    timestamp: new Date()
                });
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        success: false,
                        message: 'Duplicate question already exists'
                    });
                }
                throw err;
            }

            if (options && Array.isArray(options)) {
                const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                const optionData = options
                    .filter(o => o && o.text && o.text.trim())
                    .map((o, idx) => {
                        const isCorrect = o.isCorrect === 'on' || o.isCorrect === 'true' || o.isCorrect === true || o.isCorrect === '1';
                        return {
                            questionId: question.questionId,
                            letter: o.letter || letters[idx] || String.fromCharCode(65 + idx),
                            optionText: o.text.trim(),
                            optionIndex: idx + 1,
                            isCorrect: isCorrect ? 1 : 0
                        };
                    });
                if (optionData.length > 0) {
                    await Option.createMultiple(optionData);
                }
            }

            const questionWithOptions = await Question.getQuestionWithOptions(question.questionId);

            res.status(201).json({
                success: true,
                data: questionWithOptions
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }


    // ================= ASSIGNMENTS =================
    static async adminAssignments(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;

            const [assignments, total] = await Promise.all([
                Assignment.findAll({ limit, offset }),
                Assignment.countAll()
            ]);

            renderAdmin(res, 'assignments/index', {
                page: 'assignments',
                assignments,
                total,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/', header: false, footer: false });
        }
    }

    static async adminAssignmentNew(req, res) {
        try {
            const courses = await Course.findAll({ limit: 500 });
            const selectedCourseCode = req.query.courseCode ? String(req.query.courseCode).trim() : '';
            const selectedCourse = selectedCourseCode ? await Course.findByCode(selectedCourseCode) : null;
            renderAdmin(res, 'assignments/new', {
                page: 'assignments',
                mode: 'new',
                courses,
                assignment: '',
                selectedCourseCode: selectedCourse ? selectedCourse.courseCode : selectedCourseCode,
                selectedCourseName: selectedCourse ? selectedCourse.courseName : ''
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/assignments', header: false, footer: false });
        }
    }

    static async adminAssignmentCreate(req, res) {
        try {
            const { courseCode, courseName, title, description, dueDate, filePath, originalFilename, status } = req.body;

            const course = await Course.findByCode(courseCode);
            const resolvedCourseName = courseName || (course ? course.courseName : courseCode);

            const assignment = await Assignment.create({
                courseCode,
                courseName: resolvedCourseName,
                title: title.trim(),
                description: description || '',
                dueDate: dueDate || null,
                filePath: filePath || null,
                originalFilename: originalFilename || null,
                status: status || 'draft',
                authorId: req.user.id
            });
            res.redirect('/assignments/' + assignment.id);
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/assignments', header: false, footer: false });
        }
    }

    static async adminAssignmentEdit(req, res) {
        try {
            const [assignment, courses] = await Promise.all([
                Assignment.findById(req.params.id),
                Course.findAll({ limit: 500 })
            ]);
            if (!assignment) return res.redirect('/assignments');

            renderAdmin(res, 'assignments/edit', { page: 'assignments', mode: 'edit', assignment, courses });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/assignments', header: false, footer: false });
        }
    }

    static async adminAssignmentUpdate(req, res) {
        try {
            await Assignment.update(req.params.id, req.body);
            res.redirect('/assignments/' + req.params.id);
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/assignments', header: false, footer: false });
        }
    }

    static async adminAssignmentShow(req, res) {
        try {
            const assignment = await Assignment.findById(req.params.id);
            if (!assignment) return res.redirect('/assignments');

            const courses = await Course.findAll({ limit: 500 });
            renderAdmin(res, 'assignments/show', { page: 'assignments', mode: 'show', assignment, courses });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/assignments', header: false, footer: false });
        }
    }

    static async adminAssignmentDelete(req, res) {
        try {
            await Assignment.delete(req.params.id);
            res.redirect('/assignments');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/assignments', header: false, footer: false });
        }
    }

    // ================= GDB SOLUTIONS =================
    static async adminGdbSolutions(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;

            const [solutions, total] = await Promise.all([
                GdbSolution.findAll({ limit, offset }),
                GdbSolution.countAll()
            ]);

            renderAdmin(res, 'gdbs/index', {
                page: 'gdb-solutions',
                solutions,
                total,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/', header: false, footer: false });
        }
    }

    static async adminGdbSolutionNew(req, res) {
        try {
            const courses = await Course.findAll({ limit: 500 });
            const selectedCourseCode = req.query.courseCode ? String(req.query.courseCode).trim() : '';
            const selectedCourse = selectedCourseCode ? await Course.findByCode(selectedCourseCode) : null;
            renderAdmin(res, 'gdbs/new', {
                page: 'gdb-solutions',
                mode: 'new',
                courses,
                solution: '',
                selectedCourseCode: selectedCourse ? selectedCourse.courseCode : selectedCourseCode,
                selectedCourseName: selectedCourse ? selectedCourse.courseName : ''
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/gdb-solutions', header: false, footer: false });
        }
    }

    static async adminGdbSolutionCreate(req, res) {
        try {
            const { courseCode, courseName, gdbTitle, solution } = req.body;

            const course = await Course.findByCode(courseCode);
            const resolvedCourseName = courseName || (course ? course.courseName : courseCode);

            const gdbSolution = await GdbSolution.create({
                courseCode,
                courseName: resolvedCourseName,
                gdbTitle: gdbTitle.trim(),
                solution: solution.trim(),
                authorId: req.user.id
            });
            res.redirect('/gdb-solutions/' + gdbSolution.id);
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/gdb-solutions', header: false, footer: false });
        }
    }

    static async adminGdbSolutionEdit(req, res) {
        try {
            const [solution, courses] = await Promise.all([
                GdbSolution.findById(req.params.id),
                Course.findAll({ limit: 500 })
            ]);
            if (!solution) return res.redirect('/gdb-solutions');

            renderAdmin(res, 'gdbs/edit', { page: 'gdb-solutions', mode: 'edit', solution, courses });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/gdb-solutions', header: false, footer: false });
        }
    }

    static async adminGdbSolutionUpdate(req, res) {
        try {
            await GdbSolution.update(req.params.id, req.body);
            res.redirect('/gdb-solutions/' + req.params.id);
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/gdb-solutions', header: false, footer: false });
        }
    }

    static async adminGdbSolutionShow(req, res) {
        try {
            const solution = await GdbSolution.findById(req.params.id);
            if (!solution) return res.redirect('/gdb-solutions');
            const courses = await Course.findAll({ limit: 500 });
            renderAdmin(res, 'gdbs/show', { page: 'gdb-solutions', mode: 'show', solution, courses });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/gdb-solutions', header: false, footer: false });
        }
    }

    static async adminGdbSolutionDelete(req, res) {
        try {
            await GdbSolution.delete(req.params.id);
            res.redirect('/gdb-solutions');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/gdb-solutions', header: false, footer: false });
        }
    }

    // ================= PAST PAPERS =================
    static async adminPastPapers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 20;
            const offset = (page - 1) * limit;

            const [papers, total] = await Promise.all([
                PastPaper.getAll(limit, offset),
                PastPaper.countAll()
            ]);

            renderAdmin(res, 'pastpapers/index', {
                page: 'past-papers',
                papers,
                total,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/', header: false, footer: false });
        }
    }

    static async adminPastPaperNew(req, res) {
        try {
            const courses = await Course.findAll({ limit: 500 });
            const selectedCourseCode = req.query.courseCode ? String(req.query.courseCode).trim() : '';
            const selectedCourse = selectedCourseCode ? await Course.findByCode(selectedCourseCode) : null;
            renderAdmin(res, 'pastpapers/new', {
                page: 'past-papers',
                mode: 'new',
                courses,
                paper: '',
                selectedCourseId: selectedCourse ? selectedCourse.courseId : null,
                selectedCourseCode
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/pastpapers', header: false, footer: false });
        }
    }

    static async adminPastPaperCreate(req, res) {
        try {
            const { courseId, year, type, semester, filePath, originalFilename, fileSize, status } = req.body;

            if (!courseId) {
                return res.redirect('/pastpapers/new');
            }

            const paper = await PastPaper.create({
                courseId,
                year: parseInt(year) || new Date().getFullYear(),
                type: type || null,
                semester: semester || null,
                filePath: filePath || null,
                storageProvider: 'gdrive',
                storageKey: null,
                originalFilename: originalFilename || null,
                fileSize: fileSize ? parseInt(fileSize) : null,
                status: status || 'draft',
                authorId: req.user.id
            });
            res.redirect('/pastpapers/' + paper.id);
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/pastpapers', header: false, footer: false });
        }
    }

    static async adminPastPaperEdit(req, res) {
        try {
            const [paper, courses] = await Promise.all([
                PastPaper.findById(req.params.id),
                Course.findAll({ limit: 500 })
            ]);
            if (!paper) return res.redirect('/pastpapers');

            renderAdmin(res, 'pastpapers/edit', { page: 'past-papers', mode: 'edit', paper, courses });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/pastpapers', header: false, footer: false });
        }
    }

    static async adminPastPaperShow(req, res) {
        try {
            const paper = await PastPaper.findById(req.params.id);
            if (!paper) return res.redirect('/pastpapers');

            renderAdmin(res, 'pastpapers/show', { page: 'past-papers', mode: 'show', paper });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/pastpapers', header: false, footer: false });
        }
    }

    static async adminPastPaperUpdate(req, res) {
        try {
            await PastPaper.update(req.params.id, req.body);
            res.redirect('/pastpapers/' + req.params.id);
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/pastpapers', header: false, footer: false });
        }
    }

    static async adminPastPaperDelete(req, res) {
        try {
            await PastPaper.delete(req.params.id);
            res.redirect('/pastpapers');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/pastpapers', header: false, footer: false });
        }
    }

    // ================= QUIZ DETAILS (legacy) =================
    static async quizDetails(req, res) {
        try {
            const quizId = req.params.quizId;
            res.render('genie/quiz_details', {
                quizId,
                title: 'Quiz Details',
                sidebar: true,
                isGenie: true
            });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
}

module.exports = AppController;