USE vu_quiz_questions_data;

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    vu_email VARCHAR(191) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') DEFAULT 'student',
    is_online TINYINT(1) DEFAULT 0,
    status ENUM('active', 'blocked', 'deleted') DEFAULT 'active',
    avatar VARCHAR(255) DEFAULT '/avatars/default.png',
    reset_token VARCHAR(255),
    reset_token_expires_at DATETIME,
    last_login_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_id (student_id),
    INDEX idx_vu_email (vu_email),
    INDEX idx_status (status)
)