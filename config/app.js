//config/app.js
const express = require('express');
const cors = require('cors');
const morgan = require("morgan");
const cookieParser = require('cookie-parser');
const methodOverride = require("method-override");
const expressLayouts = require("express-ejs-layouts");
const quizRoutes = require('../routes/api/quiz.route');
const authRoutes = require('../routes/api/auth.route');
const courseRoutes = require('../routes/api/course.route');
const uploadRoutes = require('../routes/api/upload.route');
const pastPaperRoutes = require('../routes/api/pastPaper.route');
const assignmentRoutes = require('../routes/api/assignment.route');
const gdbSolutionRoutes = require('../routes/api/gdbSolution.route');
const analyticsRoutes = require('../routes/api/analytics.route');

//web routes
const webAppRoutes = require('../routes/web/app.route');
const webAuthRoutes = require('../routes/web/auth.route');
const path = require('path');

const { optionalAuthenticate } = require('../middlewares/authenticate');
const { errorHandler, notFoundHandler } = require('../utils/errorHandler');

const app = express();

require("dotenv").config();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), serial=(), clipboard-read=(), clipboard-write=()');
    next();
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(optionalAuthenticate); // Set req.user if authenticated, but don't block if not authenticated

app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/courses', courseRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/past-papers', pastPaperRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/gdb-solutions', gdbSolutionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);

// Global variables for views
app.use((req, res, next) => {
    res.locals.header = true;
    res.locals.footer = true;
    res.locals.sidebar = false;
    res.locals.isGenie = false;
    res.locals.layout = "layouts/application";
    res.locals.user = req.user;
    res.locals.page = req.path.split('/')[1];
    res.locals.currentPage = '';
    res.locals.currentYear = new Date().getFullYear();
    next();
});

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(expressLayouts);

// Web Routes
app.use('/', webAppRoutes);
app.use('/auth', webAuthRoutes);

// 404 catch-all (must be after all routes)
app.use(notFoundHandler);

// Generic error handler (must be last)
app.use(errorHandler);

module.exports = app;