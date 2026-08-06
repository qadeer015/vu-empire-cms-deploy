-- =============================================================================
-- Schema: vu_quiz_questions_data
-- All column names in camelCase, proper data types throughout.
-- Tables are ordered so referenced tables are created before their dependents.
-- =============================================================================

-- CREATE DATABASE IF NOT EXISTS vu_quiz_questions_data
--   CHARACTER SET utf8mb4
--   COLLATE utf8mb4_unicode_ci;

USE vu_quiz_questions_data;

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- 1. students
--    Root table — no foreign keys. Referenced by users and quiz_submissions.
-- =============================================================================

CREATE TABLE students (
  studentId          VARCHAR(50)                    NOT NULL,
  studentName        VARCHAR(255)                   NOT NULL,

  -- Personal details
  fatherName         VARCHAR(100)                   NULL,
  gender             ENUM('Male','Female','Other')  NULL,
  dateOfBirth        DATE                           NULL,
  cnic               VARCHAR(15)                    NULL,
  mobile             VARCHAR(15)                    NULL,
  phone              VARCHAR(15)                    NULL,
  personalEmail      VARCHAR(150)                   NULL,
  vuEmail            VARCHAR(150)                   NULL,
  mailingAddress     TEXT                           NULL,
  permanentAddress   TEXT                           NULL,

  -- Academic info
  registrationNo VARCHAR(30)                    NULL,
  formNo             VARCHAR(20)                    NULL,
  admissionDate      DATE                           NULL,
  program       VARCHAR(100)                   NULL,
  studyStatus        VARCHAR(20)                    NULL,
  semester           VARCHAR(20)                    NULL,
  currentSemester    TINYINT UNSIGNED               NULL,

  -- Academic marks
  matricMarks        DECIMAL(6,2)                   NULL,
  matricTotal        SMALLINT UNSIGNED              NULL,
  interMarks         DECIMAL(6,2)                   NULL,
  interTotal         SMALLINT UNSIGNED              NULL,
  bachelorDegree     VARCHAR(100)                   NULL,
  bachelorMarks      DECIMAL(6,2)                   NULL,
  masterDegree       VARCHAR(100)                   NULL,
  masterMarks        DECIMAL(6,2)                   NULL,

  createdAt          TIMESTAMP                      NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (studentId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. users
--    Auth/account table. FK → students.studentId.
-- =============================================================================

CREATE TABLE users (
  id                  BIGINT UNSIGNED                    NOT NULL AUTO_INCREMENT,
  studentId           VARCHAR(50)                       NOT NULL,
  password            VARCHAR(255)                       NOT NULL,
  role                ENUM('student','admin')            NULL     DEFAULT 'student',
  isOnline            TINYINT(1)                         NULL     DEFAULT 0,
  status              ENUM('active','blocked','deleted') NULL     DEFAULT 'active',
  avatar              VARCHAR(255)                       NULL     DEFAULT '/avatars/default.png',
  resetToken          VARCHAR(255)                       NULL,
  resetTokenExpiresAt DATETIME                           NULL,
  lastLoginAt         DATETIME                           NULL,
  createdAt           TIMESTAMP                          NULL     DEFAULT CURRENT_TIMESTAMP,
  updatedAt           TIMESTAMP                          NULL     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  UNIQUE INDEX uq_users_studentId (studentId),
         INDEX idx_users_status   (status),

  CONSTRAINT fk_users_studentId
    FOREIGN KEY (studentId) REFERENCES students(studentId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. courses
--    Core lookup table. Referenced by quizzes and questions.
-- =============================================================================

CREATE TABLE courses (
  courseId   INT          NOT NULL AUTO_INCREMENT,
  courseCode VARCHAR(20)  NOT NULL,
  courseName VARCHAR(255) NOT NULL,
  handoutPdf VARCHAR(255)  NULL,
  handoutOriginalFilename VARCHAR(255)  NULL,
  downloadCount INT NOT NULL DEFAULT 0,
  createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (courseId),

  UNIQUE INDEX uq_courses_courseCode (courseCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. quizzes
--    FK → courses.courseId.
-- =============================================================================

CREATE TABLE quizzes (
  quizId    INT          NOT NULL AUTO_INCREMENT,
  courseId  INT          NOT NULL,
  title     VARCHAR(255) NULL,
  type      VARCHAR(50)  NULL,
  createdAt DATETIME     NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (quizId),

  INDEX idx_quizzes_courseId (courseId),

  CONSTRAINT fk_quizzes_courseId
    FOREIGN KEY (courseId) REFERENCES courses(courseId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. questions
--    FK → courses.courseId (required), quizzes.quizId (optional).
-- =============================================================================

CREATE TABLE questions (
  questionId   INT           NOT NULL AUTO_INCREMENT,
  courseId     INT           NOT NULL,
  quizId       INT           NULL,
  questionText VARCHAR(1000) NOT NULL,
  explanation  TEXT          NULL,
  timestamp    DATETIME      NULL,

  PRIMARY KEY (questionId),

  INDEX idx_questions_courseId  (courseId),
  INDEX idx_questions_quizId    (quizId),
  INDEX idx_questions_timestamp (timestamp),

  CONSTRAINT fk_questions_courseId
    FOREIGN KEY (courseId) REFERENCES courses(courseId) ON DELETE CASCADE,

  CONSTRAINT fk_questions_quizId
    FOREIGN KEY (quizId)   REFERENCES quizzes(quizId)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. options
--    Answer choices for each question. FK → questions.questionId.
-- =============================================================================

CREATE TABLE options (
  optionId    INT              NOT NULL AUTO_INCREMENT,
  questionId  INT              NOT NULL,
  letter      VARCHAR(5)       NOT NULL,         -- e.g. 'A', 'B', 'C', 'D'
  optionText  TEXT             NOT NULL,
  optionIndex TINYINT UNSIGNED NOT NULL,         -- display order
  isCorrect   TINYINT(1)       NULL DEFAULT 0,

  PRIMARY KEY (optionId),

  INDEX idx_options_questionId (questionId),

  CONSTRAINT fk_options_questionId
    FOREIGN KEY (questionId) REFERENCES questions(questionId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. quiz_submissions
--    Per-question student answers. FKs → students, questions, quizzes.
-- =============================================================================

CREATE TABLE quiz_submissions (
  submissionId   INT         NOT NULL AUTO_INCREMENT,
  studentId      VARCHAR(50) NOT NULL,
  questionId     INT         NOT NULL,
  quizId         INT         NULL,
  selectedAnswer VARCHAR(5)  NULL,               -- letter chosen by student
  isCorrect      TINYINT(1)  NULL,
  submittedAt    DATETIME    NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (submissionId),

  INDEX idx_submissions_studentId  (studentId),
  INDEX idx_submissions_questionId (questionId),
  INDEX idx_submissions_quizId     (quizId),

  CONSTRAINT fk_submissions_studentId
    FOREIGN KEY (studentId)  REFERENCES students(studentId)   ON DELETE CASCADE,

  CONSTRAINT fk_submissions_questionId
    FOREIGN KEY (questionId) REFERENCES questions(questionId) ON DELETE CASCADE,

  CONSTRAINT fk_submissions_quizId
    FOREIGN KEY (quizId)     REFERENCES quizzes(quizId)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. feedback
--    User feedback/ratings. FK → users.id.
-- =============================================================================

CREATE TABLE feedback (
  feedbackId   INT                                                      NOT NULL AUTO_INCREMENT,
  userId       BIGINT UNSIGNED                                          NOT NULL,
  rating       TINYINT UNSIGNED                                         NOT NULL,
  feedbackType ENUM('feature','bug','suggestion','compliment','rating') NULL,
  message      TEXT                                                     NULL,
  contactEmail VARCHAR(255)                                             NULL,
  createdAt    TIMESTAMP                                                NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt    TIMESTAMP                                                NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (feedbackId),

  INDEX idx_feedback_userId (userId),

  CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),

  CONSTRAINT fk_feedback_userId
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. ad_campaigns
--    Top-level advertising campaigns. No foreign keys.
-- =============================================================================

CREATE TABLE ad_campaigns (
  id        INT          NOT NULL AUTO_INCREMENT,
  name      VARCHAR(255) NOT NULL,
  budget    DECIMAL(12,4) NULL,
  startDate DATETIME     NOT NULL,
  endDate   DATETIME     NULL,
  createdAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 10. ad_zones
--     Placement slots where ads can appear. No foreign keys.
-- =============================================================================

CREATE TABLE ad_zones (
  id            INT          NOT NULL AUTO_INCREMENT,
  name          VARCHAR(255) NOT NULL,
  description   TEXT         NULL,
  width         INT          NULL,
  height        INT          NULL,
  supportsVideo TINYINT(1)   NOT NULL DEFAULT 0,

  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 11. ad_creatives
--     Individual ad assets. FKs → ad_campaigns.id, ad_zones.id.
-- =============================================================================

CREATE TABLE ad_creatives (
  id             INT                                  NOT NULL AUTO_INCREMENT,
  campaignId     INT                                  NOT NULL,
  zoneId         INT                                  NOT NULL,
  type           ENUM('image','html','text','video')  NOT NULL,
  title          VARCHAR(255)                         NULL,
  description    TEXT                                 NULL,
  imageUrl       TEXT                                 NULL,
  videoUrl       TEXT                                 NULL,
  htmlCode       TEXT                                 NULL,
  destinationUrl TEXT                                 NOT NULL,
  cpcRate        DECIMAL(10,4)                        NOT NULL DEFAULT 0.0000,
  cpmRate        DECIMAL(10,4)                        NOT NULL DEFAULT 0.0000,
  priority       INT                                  NOT NULL DEFAULT 0,
  isActive       TINYINT(1)                           NOT NULL DEFAULT 1,
  createdAt      DATETIME                             NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  INDEX idx_creatives_campaignId (campaignId),
  INDEX idx_creatives_zoneId     (zoneId),

  CONSTRAINT fk_creatives_campaignId
    FOREIGN KEY (campaignId) REFERENCES ad_campaigns(id) ON DELETE CASCADE,

  CONSTRAINT fk_creatives_zoneId
    FOREIGN KEY (zoneId)     REFERENCES ad_zones(id)     ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 12. ad_targeting
--     Targeting rules for creatives. FK → ad_creatives.id.
-- =============================================================================

CREATE TABLE ad_targeting (
  id         INT          NOT NULL AUTO_INCREMENT,
  creativeId INT          NOT NULL,
  targetKey  VARCHAR(100) NOT NULL,              -- e.g. 'country', 'device'
  targetValue VARCHAR(255) NOT NULL,             -- e.g. 'PK', 'mobile'

  PRIMARY KEY (id),

  INDEX idx_targeting_creativeId (creativeId),

  CONSTRAINT fk_targeting_creativeId
    FOREIGN KEY (creativeId) REFERENCES ad_creatives(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 13. ad_impressions
--     One row per ad view event. FKs → ad_creatives.id, ad_zones.id.
-- =============================================================================

CREATE TABLE ad_impressions (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  creativeId     INT             NOT NULL,
  zoneId         INT             NOT NULL,
  userHash       VARCHAR(64)     NOT NULL,        -- anonymised user fingerprint
  sessionId      VARCHAR(64)     NOT NULL,
  impressionTime DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  INDEX idx_impressions_creativeId (creativeId),
  INDEX idx_impressions_zoneId     (zoneId),

  CONSTRAINT fk_impressions_creativeId
    FOREIGN KEY (creativeId) REFERENCES ad_creatives(id) ON DELETE CASCADE,

  CONSTRAINT fk_impressions_zoneId
    FOREIGN KEY (zoneId)     REFERENCES ad_zones(id)     ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 14. ad_clicks
--     One row per click event. FKs → ad_impressions.id, ad_creatives.id.
-- =============================================================================

CREATE TABLE ad_clicks (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  impressionId BIGINT UNSIGNED  NULL,              -- nullable: click without tracked impression
  creativeId   INT             NOT NULL,
  userHash     VARCHAR(64)     NOT NULL,
  clickTime    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  clickCost    DECIMAL(10,4)   NOT NULL,
  isValid      TINYINT(1)      NOT NULL DEFAULT 1,

  PRIMARY KEY (id),

  INDEX idx_clicks_impressionId (impressionId),
  INDEX idx_clicks_creativeId   (creativeId),

  CONSTRAINT fk_clicks_impressionId
    FOREIGN KEY (impressionId) REFERENCES ad_impressions(id) ON DELETE SET NULL,

  CONSTRAINT fk_clicks_creativeId
    FOREIGN KEY (creativeId)   REFERENCES ad_creatives(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 15. ad_frequency_daily
--     Daily per-user impression frequency cap. FK → ad_creatives.id.
-- =============================================================================

CREATE TABLE ad_frequency_daily (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  creativeId  INT             NOT NULL,
  userHash    VARCHAR(64)     NOT NULL,
  day         DATE            NOT NULL,
  impressions INT UNSIGNED    NOT NULL DEFAULT 0,

  PRIMARY KEY (id),

  UNIQUE INDEX uq_freq_creative_user_day (creativeId, userHash, day),
  INDEX        idx_freq_creativeId       (creativeId),

  CONSTRAINT fk_freq_creativeId
    FOREIGN KEY (creativeId) REFERENCES ad_creatives(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 16. ad_revenue_daily
--     Aggregated daily revenue per campaign. FK → ad_campaigns.id.
-- =============================================================================

CREATE TABLE ad_revenue_daily (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  campaignId  INT             NOT NULL,
  day         DATE            NOT NULL,
  impressions INT UNSIGNED    NOT NULL DEFAULT 0,
  clicks      INT UNSIGNED    NOT NULL DEFAULT 0,
  revenue     DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,

  PRIMARY KEY (id),

  UNIQUE INDEX uq_revenue_campaign_day (campaignId, day),
  INDEX        idx_revenue_campaignId  (campaignId),

  CONSTRAINT fk_revenue_campaignId
    FOREIGN KEY (campaignId) REFERENCES ad_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- VIEW: question_bank_view
--     Denormalised view joining courses, questions, and options.
-- =============================================================================

CREATE OR REPLACE VIEW question_bank_view AS
  SELECT
    c.courseCode,
    c.courseName,
    q.questionId,
    q.questionText,
    q.explanation,
    q.timestamp                                          AS questionAdded,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'optionId',    o.optionId,
        'letter',      o.letter,
        'optionText',  o.optionText,
        'optionIndex', o.optionIndex,
        'isCorrect',   o.isCorrect
      )
    )                                                    AS options,
    GROUP_CONCAT(
      IF(o.isCorrect = 1, o.letter, NULL)
      ORDER BY o.letter
      SEPARATOR ','
    )                                                    AS correctAnswers
  FROM      questions q
  JOIN      courses   c ON q.courseId   = c.courseId
  LEFT JOIN options   o ON o.questionId = q.questionId
  GROUP BY  q.questionId;



-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    userId BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT,
    thumbnail VARCHAR(512),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    postId BIGINT UNSIGNED NOT NULL,
    userId BIGINT UNSIGNED NOT NULL,
    content VARCHAR(250) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================================================
-- MIGRATION: drop `url` from `questions` (idempotent).
-- Safe to run on an existing database. Skips silently if column already gone.
-- =============================================================================

SET @col_exists := (
  SELECT COUNT(*)
  FROM   information_schema.COLUMNS
  WHERE  TABLE_SCHEMA = DATABASE()
    AND  TABLE_NAME   = 'questions'
    AND  COLUMN_NAME  = 'url'
);

SET @stmt := IF(
  @col_exists > 0,
  'ALTER TABLE questions DROP COLUMN url',
  'SELECT ''questions.url already removed'' AS note'
);

PREPARE drop_url_stmt FROM @stmt;
EXECUTE drop_url_stmt;
DEALLOCATE PREPARE drop_url_stmt;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- VERIFY after running:
--   SHOW TABLES;
--   SHOW CREATE TABLE students\G
--   SHOW CREATE TABLE users\G
--   SHOW CREATE TABLE quiz_submissions\G
--   SHOW CREATE TABLE ad_creatives\G
--   SELECT * FROM question_bank_view LIMIT 3\G
-- =============================================================================