// upload.controller.js
const { uploadToCloudinary } = require('../services/driveUpload');
const { v4: uuidv4 } = require('uuid');

class UploadController {
    /**
     * Upload a content image (for quiz/assignment/past-paper descriptions).
     */
    static async uploadContentImage(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const filePath = req.file.path;
            const uploadResult = await uploadToCloudinary(filePath, {
                folder: 'vu-empire-cms/content',
                public_id: `img_${uuidv4()}`,
                resource_type: 'image'
            });

            return res.status(200).json({
                success: true,
                message: 'Image uploaded successfully',
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Upload a document (e.g., handout PDF attachment).
     */
    static async uploadDocument(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            const filePath = req.file.path;
            const uploadResult = await uploadToCloudinary(filePath, {
                folder: 'vu-empire-cms/documents',
                public_id: `doc_${uuidv4()}`,
                resource_type: 'raw'
            });

            return res.status(200).json({
                success: true,
                message: 'Document uploaded successfully',
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = UploadController;