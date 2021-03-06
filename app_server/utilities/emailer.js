require('dotenv').config({path: process.env.DOT_ENV_PATH});
const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    service: "GandiMail",
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

exports.transporter = transporter;