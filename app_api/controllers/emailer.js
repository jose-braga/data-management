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
        security: 'mimrc@fct.unl.pt',
        email: 'mimrc@fct.unl.pt',
        students: 'beatrizdobem@fct.unl.pt',
        fct: {name:'XXX XXXX', email: 'josecbraga@gmail.com'},
        managers: {
                Lisboa: 'tsc@fct.unl.pt, josebraga@fct.unl.pt',
                Porto: 'josebraga@fct.unl.pt',
                Aveiro: 'josebraga@fct.unl.pt'
            }
    };

exports.transporter = transporter;
exports.emailRecipients = emailRecipients;

