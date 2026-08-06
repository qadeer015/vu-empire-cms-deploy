// auth.routes.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const AppError = require('../../utils/AppError');
require("dotenv").config();

// const { google } = require("googleapis");
// const oauth2Client = new google.auth.OAuth2(
//     process.env.GOOGLE_CLIENT_ID,
//     process.env.GOOGLE_CLIENT_SECRET,
//     process.env.GOOGLE_REDIRECT_URI
// );
// console.log({
//     clientId: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET?.slice(0, 10),
//     redirect: process.env.GOOGLE_REDIRECT_URI
// });
// router.get("/google", (req, res) => {
//     const url = oauth2Client.generateAuthUrl({
//         access_type: "offline",
//         prompt: "consent",
//         scope: ["https://www.googleapis.com/auth/drive"]
//     });

//     res.redirect(url);
// });

// router.get("/callback", async (req, res) => {
//     try {
//         const code = req.query.code;

//         const params = new URLSearchParams({
//             client_id: process.env.GOOGLE_CLIENT_ID,
//             client_secret: process.env.GOOGLE_CLIENT_SECRET,
//             redirect_uri: process.env.GOOGLE_REDIRECT_URI,
//             code,
//             grant_type: "authorization_code",
//         });

//         const response = await fetch(
//             "https://oauth2.googleapis.com/token",
//             {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/x-www-form-urlencoded",
//                 },
//                 body: params,
//             }
//         );

//         const data = await response.json();

//         console.log(data);

//         res.json(data);

//     } catch (err) {
//         console.error(err);
//         res.status(500).json(err);
//     }
// });

router.get('/login', (req, res) => {
    if(req.user) {
        return res.redirect('/');
    }
    res.render('auth/login', {
        title: 'Login',
        header: false,
        footer: false
    });
});

router.get('/forgot-password', (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Forgot Password',
        header: false,
        footer: false
    });
});

router.get('/reset-password', async (req, res) => {
    const token = req.query.token;

    const user = await User.findByResetToken(token);

    if (!user) {
        res.render('error', {
            title: 'Invalid Reset Link',
            message: 'The password reset link is invalid or has expired.',
            error: new AppError('Invalid or expired reset token', 400),
            redirect_url: req.get('Referrer') || '/',
            header: false,
            footer: false
        });
        return;
    }

    res.render('auth/reset-password', {
        title: 'Reset Password',
        header: false,
        footer: false,
        token: req.query.token
    });
});

module.exports = router;