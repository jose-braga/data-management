const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    service: "GandiMail",
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
    }
});

var emailRecipients = {
        car: 'mimrc@fct.unl.pt',
        email: 'mimrc@fct.unl.pt',
        students: 'beatrizdobem@fct.unl.pt',
        fct: 'fct@fct.mctes.pt'
    };

exports.transporter = transporter;
exports.emailRecipients = emailRecipients;

