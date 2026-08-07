// controllers/app.controller.js
const AppService = require('../services/app.service');
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
            crumbs.push({ label: 'Add New', href: '' });
        } else if (mode === 'edit') {
            crumbs.push(parentCrumb);
            crumbs.push({ label: 'Edit', href: '' });
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
            const result = await AppService.dashboard();
            return renderAdmin(res, 'admin/dashboard', { ...result, page: 'dashboard' });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/', header: false, footer: false });
        }
    }

    // ================= COURSES =================
    static async adminCourses(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 50;
            const offset = (page - 1) * limit;

            const [courses, total] = await Promise.all([
                Course.findAll({ limit, offset }),
                Course.countAll()
            ]);

            renderAdmin(res, 'admin/courses', {
                page: 'courses',
                courses,
                total,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/', header: false, footer: false });
        }
    }

    static async adminCourseNew(req, res) {
        renderAdmin(res, 'admin/course_form', { page: 'courses', mode: 'new', course: '' });
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

            renderAdmin(res, 'admin/course_show', {
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
            renderAdmin(res, 'admin/course_form', { page: 'courses', mode: 'edit', course });
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

            renderAdmin(res, 'admin/quizzes', {
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
            renderAdmin(res, 'admin/quiz_form', {
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

    static async adminQuizEdit(req, res) {
        try {
            const [quiz, courses] = await Promise.all([
                Quiz.findById(req.params.id),
                Course.findAll({ limit: 500 })
            ]);
            if (!quiz) return res.redirect('/quizzes');

            const questions = await Question.findByQuizId(quiz.quizId);

            renderAdmin(res, 'admin/quiz_form', { page: 'quizzes', mode: 'edit', quiz, courses, questions });
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
            renderAdmin(res, 'admin/question_form', { page: 'quizzes', mode: 'new', quiz, courses, question: '' });
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

    static async adminQuestionBulkCreate(req, res) {
        try {
            const { quizId } = req.params;
            const quiz = await Quiz.findById(quizId);
            if (!quiz) return res.redirect('/quizzes');

            // Only allow bulk creation for quizzes with title "Main"
            if (quiz.title !== 'Main') {
                return res.status(403).render('error', {
                    title: 'Forbidden',
                    message: 'Bulk question upload is only allowed for quizzes with title "Main".',
                    error: null,
                    redirect_url: '/quizzes/' + quizId + '/edit',
                    header: false,
                    footer: false
                });
            }

            if (!req.file) {
                return res.status(400).render('error', {
                    title: 'Error',
                    message: 'No JSON file uploaded.',
                    error: null,
                    redirect_url: '/quizzes/' + quizId + '/edit',
                    header: false,
                    footer: false
                });
            }

            let payload;
            try {
                payload = JSON.parse(req.file.buffer.toString('utf-8'));
            } catch (parseErr) {
                return res.status(400).render('error', {
                    title: 'Error',
                    message: 'Invalid JSON file: ' + parseErr.message,
                    error: null,
                    redirect_url: '/quizzes/' + quizId + '/edit',
                    header: false,
                    footer: false
                });
            }

            if (!payload.questions || !Array.isArray(payload.questions)) {
                return res.status(400).render('error', {
                    title: 'Error',
                    message: 'JSON must contain a "questions" array.',
                    error: null,
                    redirect_url: '/quizzes/' + quizId + '/edit',
                    header: false,
                    footer: false
                });
            }

            const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            const courseId = quiz.courseId;

            // Build set of existing question texts for this course to avoid duplicates
            const existingQuestions = await Question.findByCourse(courseId);
            const existingTexts = new Set(
                existingQuestions.map(q => q.questionText.trim().toLowerCase())
            );

            const normalizedInputTexts = new Set();
            let createdCount = 0;
            let skippedDuplicates = 0;

            for (const q of payload.questions) {
                if (!q.questionText || !q.options || !Array.isArray(q.options) || q.options.length < 2) {
                    continue;
                }

                const normalizedText = q.questionText.trim().toLowerCase();

                // Skip if duplicate within the uploaded file
                if (normalizedInputTexts.has(normalizedText)) {
                    skippedDuplicates++;
                    continue;
                }

                // Skip if already exists in database
                if (existingTexts.has(normalizedText)) {
                    skippedDuplicates++;
                    continue;
                }

                normalizedInputTexts.add(normalizedText);

                const question = await Question.create({
                    courseId,
                    quizId,
                    questionText: q.questionText.trim(),
                    explanation: q.explanation ? q.explanation.trim() : '',
                    timestamp: new Date()
                }, true);

                const optionData = q.options.map((optText, idx) => ({
                    questionId: question.questionId,
                    letter: letters[idx] || String.fromCharCode(65 + idx),
                    optionText: optText.trim(),
                    optionIndex: idx + 1,
                    isCorrect: idx === 0 ? 1 : 0
                }));

                if (optionData.length > 0) {
                    await Option.createMultiple(optionData);
                }
                createdCount++;
            }

            // Invalidate caches once after all inserts
            await Question._invalidateQuestionCaches(null, courseId, quizId);

            const message = skippedDuplicates > 0
                ? `Successfully created ${createdCount} questions. Skipped ${skippedDuplicates} duplicate(s).`
                : `Successfully created ${createdCount} questions.`;

            req.flash = req.flash || ((type, msg) => { req._flash = { type, msg }; });
            req.flash('success', message);
            res.redirect('/quizzes/' + quizId + '/edit');
        } catch (err) {
            res.status(400).render('error', {
                title: 'Error',
                message: err.message,
                error: null,
                redirect_url: '/quizzes/' + req.params.quizId + '/edit',
                header: false,
                footer: false
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

            renderAdmin(res, 'admin/question_form', { page: 'quizzes', mode: 'edit', question, quiz, courses });
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

            renderAdmin(res, 'admin/assignments', {
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
            renderAdmin(res, 'admin/assignment_form', {
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

            await Assignment.create({
                courseCode,
                courseName: resolvedCourseName,
                title: title.trim(),
                description: description || '',
                dueDate: dueDate || null,
                filePath: filePath || null,
                originalFilename: originalFilename || null,
                status: status || 'draft'
            });
            res.redirect('/assignments');
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

            renderAdmin(res, 'admin/assignment_form', { page: 'assignments', mode: 'edit', assignment, courses });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/assignments', header: false, footer: false });
        }
    }

    static async adminAssignmentUpdate(req, res) {
        try {
            await Assignment.update(req.params.id, req.body);
            res.redirect('/assignments/' + req.params.id + '/edit');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/assignments', header: false, footer: false });
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

            renderAdmin(res, 'admin/gdb-solutions', {
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
            renderAdmin(res, 'admin/gdb_form', {
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

            await GdbSolution.create({
                courseCode,
                courseName: resolvedCourseName,
                gdbTitle: gdbTitle.trim(),
                solution: solution.trim()
            });
            res.redirect('/gdb-solutions');
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

            renderAdmin(res, 'admin/gdb_form', { page: 'gdb-solutions', mode: 'edit', solution, courses });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/gdb-solutions', header: false, footer: false });
        }
    }

    static async adminGdbSolutionUpdate(req, res) {
        try {
            await GdbSolution.update(req.params.id, req.body);
            res.redirect('/gdb-solutions/' + req.params.id + '/edit');
        } catch (err) {
            res.status(400).render('error', { title: 'Error', message: err.message, error: null, redirect_url: '/gdb-solutions', header: false, footer: false });
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

            renderAdmin(res, 'admin/past-papers', {
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
            renderAdmin(res, 'admin/pastpaper_form', {
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

            await PastPaper.create({
                courseId,
                year: parseInt(year) || new Date().getFullYear(),
                type: type || null,
                semester: semester || null,
                filePath: filePath || null,
                storageProvider: 'gdrive',
                storageKey: null,
                originalFilename: originalFilename || null,
                fileSize: fileSize ? parseInt(fileSize) : null,
                status: status || 'draft'
            });
            res.redirect('/pastpapers');
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

            renderAdmin(res, 'admin/pastpaper_form', { page: 'past-papers', mode: 'edit', paper, courses });
        } catch (err) {
            res.status(500).render('error', { title: 'Server Error', message: err.message, error: null, redirect_url: '/pastpapers', header: false, footer: false });
        }
    }

    static async adminPastPaperUpdate(req, res) {
        try {
            await PastPaper.update(req.params.id, req.body);
            res.redirect('/pastpapers/' + req.params.id + '/edit');
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