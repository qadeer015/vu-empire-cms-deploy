const drive = require('../config/googleDrive');
const { Readable } = require('stream');

// 🔍 Find folder
const findFolder = async (folderName, parentId = null) => {
    const query = parentId
        ? `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents`
        : `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`;

    const res = await drive.files.list({
        q: query,
        fields: 'files(id, name)'
    });

    return res.data.files[0];
};

// 📁 Create folder
const createFolder = async (folderName, parentId = null) => {
    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId && { parents: [parentId] })
    };

    const res = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id'
    });

    return res.data.id;
};

// 🎯 Year folder
const getOrCreateYearFolder = async (year) => {
    let root = await findFolder('VUEmpire');

    if (!root) {
        const rootId = await createFolder('VUEmpire');
        root = { id: rootId };
    }

    const name = `year_${year}`;
    let folder = await findFolder(name, root.id);

    if (!folder) {
        const id = await createFolder(name, root.id);
        folder = { id };
    }

    return folder.id;
};

// course folder
const getOrCreateCourseFolder = async (year, courseCode) => {
    const yearFolderId = await getOrCreateYearFolder(year);
    const courseFolderName = `course_${courseCode}`;
    let courseFolder = await findFolder(courseFolderName, yearFolderId);

    if (!courseFolder) {
        const id = await createFolder(courseFolderName, yearFolderId);
        courseFolder = { id };
    }

    return courseFolder.id;
};

// 📤 Upload
const uploadToDrive = async (file, year) => {
    try {
        let folderId = await getOrCreateYearFolder(year);

        if (file.mimetype === 'application/pdf') {
            folderId = await getOrCreateCourseFolder(year, file.originalname);
        }

        console.log("folderId:", folderId);

        const { PassThrough } = require('stream');
        const bufferStream = new PassThrough();
        bufferStream.end(file.buffer);

        const res = await drive.files.create({
            requestBody: {
                name: file.originalname,
                parents: [folderId]
            },
            media: {
                mimeType: file.mimetype,
                body: bufferStream
            },
            fields: 'id, webViewLink, webContentLink',
            supportsAllDrives: true // 🔥 IMPORTANT
        });

        console.log("drive response:", res.data);

        return res.data;

    } catch (error) {
        console.error("UPLOAD ERROR FULL:", error.response?.data || error.message);
        throw error;
    }
};

// 🌍 Make public
const makeFilePublic = async (fileId) => {
    await drive.permissions.create({
        fileId,
        requestBody: {
            role: 'reader',
            type: 'anyone'
        }
    });
};

module.exports = {
    findFolder,
    createFolder,
    getOrCreateYearFolder,
    getOrCreateCourseFolder,
    uploadToDrive,
    makeFilePublic
};