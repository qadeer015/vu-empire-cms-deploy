// config/firebase.js
const admin = require('firebase-admin');

// Check if Firebase is already initialized (for hot reloading)
if (admin.apps.length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        console.log('Firebase Admin initialized successfully.');
    } else {
        console.warn('Firebase environment variables not set. Using local Firestore emulator or mock.');
        // Use a dummy app that throws clear errors when used
        admin.initializeApp({ projectId: 'vu-empire-local' });
    }
}

const db = admin.firestore();

module.exports = { admin, db };