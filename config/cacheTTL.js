// config/cacheTTL.js
// Centralised TTL (time-to-live) values for all cache categories.
// All values are in seconds.

const TTL = {
    // Static data – changes infrequently
    COURSES:       3600,   // 1 hour
    QUESTIONS:     3600,   // 1 hour
    QUIZZES:       3600,   // 1 hour
    SETTINGS:      3600,   // 1 hour

    // Semi-dynamic data
    POSTS:         600,    // 10 minutes
    PROFILES:      600,    // 10 minutes
    USERS:         600,    // 10 minutes
    STUDENTS:      600,    // 10 minutes
    ENROLLMENTS:   600,    // 10 minutes
    ASSIGNMENTS:   600,    // 10 minutes
    GDB_SOLUTIONS: 600,    // 10 minutes
    PASTPAPERS:    600,    // 10 minutes

    // Dashboard statistics
    DASHBOARD:     60,     // 1 minute

    // Search results
    SEARCH:        300,    // 5 minutes

    // Question bank & quiz tree (semi-static)
    QUESTION_BANK: 1800,   // 30 minutes
    QUIZ_TREE:     1800,   // 30 minutes
};

module.exports = TTL;