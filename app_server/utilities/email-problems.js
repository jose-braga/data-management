const nodemailer = require('./emailer');
let transporter = nodemailer.transporter;

if (process.env.NODE_ENV === 'production') {
    var recipients = 'josecbraga@gmail.com';
    var subject = '';
    if (process.argv[2] === 'backup') {
        subject = 'Generating backup file.';
    } else if (process.argv[2] === 'drive') {
        subject = 'Saving to GDrive.';
    }
    let mailOptions = {
        from: '"Admin" <admin@laqv-ucibio.info>', // sender address
        to: recipients, // list of receivers (comma-separated)
        subject: 'Backup problem: ' + subject, // Subject line
        text: 'Please verify connection or server status.\nBest regards,\nAdmin',
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
    });
}