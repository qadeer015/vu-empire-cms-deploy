// middlewares/upload.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');

/**
 * Create a Cloudinary storage instance for a specific folder with transformations
 * @param {string} subFolder - e.g., 'posts', 'avatars', 'payments'
 * @param {Object} transformations - Cloudinary transformation options
 * @returns {CloudinaryStorage}
 */
const createCloudinaryStorage = (subFolder, transformations = {}) => {
    const defaultTransformations = {
        quality: 'auto',
        fetch_format: 'auto'
    };

    const finalTransformations = { ...defaultTransformations, ...transformations };

    // Convert transformations object to array format for Cloudinary
    const transformationArray = Object.entries(finalTransformations).map(([key, value]) => {
        if (key === 'crop' && value === 'limit') {
            return { [key]: value };
        }
        return { [key]: value };
    });

    return new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: `${process.env.APP_NAME || 'app'}/${subFolder}`,
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            transformation: transformationArray
        }
    });
};

/**
 * Get transformation settings based on resource type
 * @param {string} resourceType - 'thumbnail', 'content', 'avatar', 'payment'
 * @param {Object} customOptions - Custom width/height options
 * @returns {Object}
 */
const getResourceTransformations = (resourceType, customOptions = {}) => {
    const transformations = {
        thumbnail: {
            width: customOptions.width || 800,
            height: customOptions.height || 600,
            crop: 'limit',
            quality: 'auto:good'
        },
        content: {
            width: customOptions.width || 1200,
            height: customOptions.height || 1200,
            crop: 'limit',
            quality: 'auto:good'
        },
        avatar: {
            width: customOptions.width || 300,
            height: customOptions.height || 300,
            crop: 'fill',
            gravity: 'face',
            radius: 'max',
            quality: 'auto:best'
        },
        payment: {
            width: customOptions.width || 1500,
            height: customOptions.height || 1500,
            crop: 'limit',
            quality: 'auto:good'
        }
    };

    return transformations[resourceType] || transformations.content;
};

/**
 * File filter – only images
 */
const imageFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Only image files are allowed (jpeg, jpg, png, gif, webp)', 400), false);
    }
};

/**
 * File filter – documents (PDF, DOC, DOCX, TXT)
 */
const documentFilter = (req, file, cb) => {
    const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];
    const allowedExts = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = file.originalname ? '.' + file.originalname.split('.').pop().toLowerCase() : '';
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new AppError('Only document files are allowed (PDF, DOC, DOCX, TXT)', 400), false);
    }
};

/**
 * Create a multer instance configured for a specific resource
 * @param {string} resource - 'posts', 'avatars', 'payments', etc.
 * @param {Object} options - { fieldName, maxSize, multiple, width, height, transformationType }
 * @returns {Object} - multer instance with appropriate .single() or .array() method
 */
const uploadForResource = (resource, options = {}) => {
    const transformationType = options.transformationType ||
        (resource === 'posts' ? 'content' :
            resource === 'avatars' ? 'avatar' :
                resource === 'payments' ? 'payment' : 'content');

    const transformations = getResourceTransformations(transformationType, {
        width: options.width,
        height: options.height
    });

    const storage = createCloudinaryStorage(resource, transformations);
    const maxSize = options.maxSize || 5 * 1024 * 1024; // default 5MB

    const upload = multer({
        storage: storage,
        limits: { fileSize: maxSize },
        fileFilter: imageFilter
    });

    const fieldName = options.fieldName || 'file';
    const multiple = options.multiple || false;

    if (multiple) {
        return upload.array(fieldName, options.maxCount || 10);
    }
    return upload.single(fieldName);
};

/**
 * Create a multer instance for document upload (raw files)
 * Documents are uploaded as raw files without image transformations
 * @param {string} resource - 'documents', etc.
 * @param {Object} options - { fieldName, maxSize }
 * @returns {Object} - multer instance with .single() method
 */
const uploadDocument = (resource = 'documents', options = {}) => {
    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: `${process.env.APP_NAME || 'app'}/${resource}`,
            allowed_formats: ['pdf', 'doc', 'docx', 'txt'],
            resource_type: 'raw'
        }
    });

    const maxSize = options.maxSize || 10 * 1024 * 1024; // default 10MB

    const upload = multer({
        storage: storage,
        limits: { fileSize: maxSize },
        fileFilter: documentFilter
    });

    const fieldName = options.fieldName || 'document';
    return upload.single(fieldName);
};

module.exports = { uploadForResource, getResourceTransformations, uploadDocument };