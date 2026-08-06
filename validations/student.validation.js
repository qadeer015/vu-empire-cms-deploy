// student.validation.js
const validate = require('../middlewares/validate');
const Joi = require('joi');

const studentValidation = {
    enrollStudentValidation: Joi.object({
        courses: Joi.array()
            .items(
                Joi.object({
                    courseCode: Joi.string()
                        .required()
                        .messages({
                            'any.required': 'Course code is required',
                            'string.base': 'Course code must be a string',
                            'string.empty': 'Course code cannot be empty'
                        }),
                    courseName: Joi.string()
                        .optional()
                        .messages({
                            'string.base': 'Course name must be a string'
                        }),
                    semester: Joi.string()
                        .optional()
                        .messages({
                            'string.base': 'Semester must be a string'
                        }),
                    currentSemester: Joi.number()
                        .integer()
                        .min(1)
                        .max(8)
                        .optional()
                        .messages({
                            'number.base': 'Current semester must be a number',
                            'number.integer': 'Current semester must be an integer',
                            'number.min': 'Current semester must be at least 1',
                            'number.max': 'Current semester cannot exceed 8'
                        })
                })
            )
            .min(1)
            .required()
            .messages({
                'any.required': 'Courses array is required',
                'array.base': 'Courses must be an array',
                'array.min': 'At least one course is required'
            }),
        semester: Joi.string()
            .optional()
            .messages({
                'string.base': 'Semester must be a string'
            }),
        currentSemester: Joi.number()
            .integer()
            .min(1)
            .max(8)
            .optional()
            .messages({
                'number.base': 'Current semester must be a number',
                'number.integer': 'Current semester must be an integer',
                'number.min': 'Current semester must be at least 1',
                'number.max': 'Current semester cannot exceed 8'
            })
    }),

    createStudentValidation: Joi.object({
        studentName: Joi.string().required().messages({
            'any.required': 'Student Name is required'
        }),
        studentId: Joi.string().email().required().messages({
            'any.required': 'Student Id is required'
        })
    }),
    updateStudentValidation: Joi.object({
        studentName: Joi.string().required().messages({
            'any.required': 'Student Name is required'
        }),
        admissionDate: Joi.date().iso().messages({
            'date.iso': 'Admission Date must be a valid ISO date'
        }),
        bachelorDegree: Joi.string().messages({
            'string.base': 'Bachelor Degree must be a string'
        }),
        bachelorMarks: Joi.number().messages({
            'number.base': 'Bachelor Marks must be a number'
        }),
        cnic: Joi.string().messages({
            'string.base': 'CNIC must be a string'
        }),
        currentSemester: Joi.number()
            .integer()
            .min(1)
            .max(8)
            .optional()
            .messages({
                'number.base': 'Current semester must be a number',
                'number.integer': 'Current semester must be an integer',
                'number.min': 'Current semester must be at least 1',
                'number.max': 'Current semester cannot exceed 8'
            }),
        dateOfBirth: Joi.date().iso().messages({
            'date.iso': 'Date of Birth must be a valid ISO date'
        }),
        fatherName: Joi.string().messages({
            'string.base': 'Father Name must be a string'
        }),
        formNo: Joi.string().messages({
            'string.base': 'Form No must be a string'
        }),
        gender: Joi.string().messages({
            'string.base': 'Gender must be a string'
        }),
        interMarks: Joi.number().messages({
            'number.base': 'Intermediate Marks must be a number'
        }),
        interTotal: Joi.number().messages({
            'number.base': 'Intermediate Total must be a number'
        }),
        mailingAddress: Joi.string().messages({
            'string.base': 'Mailing Address must be a string'
        }),
        masterDegree: Joi.string().messages({
            'string.base': 'Master Degree must be a string'
        }),
        masterMarks: Joi.string().messages({
            'string.base': 'Master Marks must be a string'
        }),
        matricMarks: Joi.string().messages({
            'string.base': 'Matric Marks must be a string'
        }),
        matricTotal: Joi.string().messages({
            'string.base': 'Matric Total must be a string'
        }),
        mobile: Joi.string().messages({
            'string.base': 'Mobile must be a string'
        }),
        permanentAddress: Joi.string().messages({
            'string.base': 'Permanent Address must be a string'
        }),
        personalEmail: Joi.string().email().messages({
            'string.email': 'Personal Email must be a valid email address'
        }),
        phone: Joi.string().messages({
            'string.base': 'Phone must be a string'
        }),
        registrationNumber: Joi.string().messages({
            'string.base': 'Registration Number must be a string'
        }),
        semester: Joi.string().messages({
            'string.base': 'Semester must be a string'
        }),
        studyProgram: Joi.string().messages({
            'string.base': 'Study Program must be a string'
        }),
        studyStatus: Joi.string().messages({
            'string.base': 'Study Status must be a string'
        })
    })
};

module.exports = {
    ...studentValidation,
    validate
};