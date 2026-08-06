// page.routes.js
const express = require('express');
const router = express.Router();

const SITE_URL = process.env.SITE_URL || 'https://vuempire.online';

router.get('/terms', (req, res) => {
    res.render('pages/terms', {
        title: 'Terms of Service | VU Empire',
        currentPage: 'terms',
        seo: {
            title: 'Terms of Service | VU Empire',
            description: 'Read the terms of service for VU Empire. Learn about the rules and guidelines for using our VU study resources platform.',
            canonical: SITE_URL + '/terms',
            keywords: 'VU Empire terms, terms of service, VU platform rules'
        }
    });
});

router.get('/about', (req, res) => {
    res.render('pages/about', {
        title: 'About Us | VU Empire',
        currentPage: 'about',
        seo: {
            title: 'About Us | VU Empire',
            description: 'Learn about VU Empire - the leading platform for Virtual University students offering past papers, quizzes, handouts, and study resources.',
            canonical: SITE_URL + '/about',
            keywords: 'about VU Empire, Virtual University platform, VU study resources'
        }
    });
});

router.get('/privacy', (req, res) => {
    res.render('pages/privacy', {
        title: 'Privacy Policy | VU Empire',
        currentPage: 'privacy',
        seo: {
            title: 'Privacy Policy | VU Empire',
            description: 'Read the privacy policy for VU Empire. Understand how we collect, use, and protect your personal data.',
            canonical: SITE_URL + '/privacy',
            keywords: 'VU Empire privacy policy, data protection, user privacy'
        }
    });
});

router.get('/support', (req, res) => {
    res.render('pages/support', {
        title: 'Support | VU Empire',
        currentPage: 'support',
        seo: {
            title: 'Get Help & Support | VU Empire',
            description: 'Need help with VU Empire? Contact our support team for assistance with quizzes, handouts, and study resources.',
            canonical: SITE_URL + '/support',
            keywords: 'VU Empire support, help, contact, customer service'
        }
    });
});

router.get('/docs', (req, res) => {
    res.render('pages/docs', {
        title: 'Documentation | VU Empire',
        currentPage: 'docs',
        layout: 'layouts/genie',
        seo: {
            title: 'Documentation | VU Empire',
            description: 'Comprehensive documentation for VU Empire. Learn how to use our platform, access study resources, and get the most out of your Virtual University experience.',
            canonical: SITE_URL + '/docs',
            keywords: 'VU Empire documentation, user guide, platform instructions, Virtual University resources'
        }
    });
});

router.get('/handouts', (req, res) => {
    res.render('pages/handouts', {
        title: 'Course Handouts | VU Empire',
        currentPage: 'handouts',
        seo: {
            title: 'Download Course Handouts | VU Empire',
            description: 'Download free course handouts for all Virtual University subjects. Complete study materials for ACC, CS, MATH, ENG, and more.',
            canonical: SITE_URL + '/handouts',
            keywords: 'VU handouts, course handouts download, VU study materials, Virtual University handouts'
        }
    });
});

router.get('/past-papers', (req, res) => {
    res.render('pages/past-papers', {
        title: 'Past Papers Archive | VU Empire',
        currentPage: 'past-papers',
        seo: {
            title: 'Past Papers Archive | VU Empire',
            description: 'Access mid and final term past papers with solved answers for all Virtual University courses. Spot exam patterns and prepare effectively.',
            canonical: SITE_URL + '/past-papers',
            keywords: 'VU past papers, mid term papers, final term papers, solved papers, VU exam preparation'
        }
    });
});

router.get('/gdb-solutions', (req, res) => {
    res.render('pages/gdb-solutions', {
        title: 'GDB Solutions | VU Empire',
        currentPage: 'gdb-solutions',
        seo: {
            title: 'GDB Solutions | VU Empire',
            description: 'Top-scoring GDB solutions for Virtual University courses. Well-argued, unique, and deadline-ready discussion answers.',
            canonical: SITE_URL + '/gdb-solutions',
            keywords: 'VU GDB solutions, GDB answers, discussion board solutions, Virtual University GDB'
        }
    });
});

router.get('/assignments', (req, res) => {
    res.render('pages/assignments', {
        title: 'Assignment Solutions | VU Empire',
        currentPage: 'assignments',
        seo: {
            title: 'Assignment Solutions | VU Empire',
            description: 'Step-by-step assignment solutions with explanations for Virtual University courses. Understand concepts, not just answers.',
            canonical: SITE_URL + '/assignments',
            keywords: 'VU assignments, assignment solutions, solved assignments, VU study help'
        }
    });
});

module.exports = router;
