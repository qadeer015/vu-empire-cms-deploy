//models/Option.js
const db = require('../config/db');

class Option {
    static async findByQuestionId(questionId) {
        const [rows] = await db.query(
            'SELECT * FROM options WHERE questionId = ? ORDER BY optionIndex',
            [questionId]
        );
        return rows;
    }

    static async findCorrectOption(questionId) {
        const [rows] = await db.query(
            'SELECT * FROM options WHERE questionId = ? AND isCorrect = TRUE',
            [questionId]
        );
        return rows[0];
    }

    static async findById(optionId) {
        const [rows] = await db.query('SELECT * FROM options WHERE optionId = ?', [optionId]);
        return rows[0];
    }

    static async create(optionData) {
        const { questionId, letter, optionText, optionIndex, isCorrect } = optionData;
        const [result] = await db.query(
            'INSERT INTO options (questionId, letter, optionText, optionIndex, isCorrect) VALUES (?, ?, ?, ?, ?)',
            [questionId, letter, optionText, optionIndex, isCorrect]
        );
        return { optionId: result.insertId, ...optionData };
    }

    static async createMultiple(optionsData) {
        const values = optionsData.map(opt => [
            opt.questionId,
            opt.letter,
            opt.optionText,
            opt.optionIndex,
            opt.isCorrect || false
        ]);

        const [result] = await db.query(
            'INSERT INTO options (questionId, letter, optionText, optionIndex, isCorrect) VALUES ?',
            [values]
        );
        return result.affectedRows;
    }

    static async update(optionId, optionData) {
        const { letter, optionText, optionIndex, isCorrect } = optionData;
        const [result] = await db.query(
            'UPDATE options SET letter = ?, optionText = ?, optionIndex = ?, isCorrect = ? WHERE optionId = ?',
            [letter, optionText, optionIndex, isCorrect, optionId]
        );
        return result.affectedRows > 0;
    }

    static async delete(optionId) {
        const [result] = await db.query('DELETE FROM options WHERE optionId = ?', [optionId]);
        return result.affectedRows > 0;
    }

    static async deleteByQuestionId(questionId) {
        const [result] = await db.query('DELETE FROM options WHERE questionId = ?', [questionId]);
        return result.affectedRows;
    }
}

module.exports = Option;