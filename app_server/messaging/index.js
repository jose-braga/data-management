var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');

var auth = jwt({
    secret: process.env.JWT_SECRET,
    requestProperty: 'payload'
});

var ctrlMessage = require('./controllers/message.js');

router.post('/all', auth, ctrlMessage.adminSendMessageAll);
// get all messages currently in server
router.get('/all', auth, ctrlMessage.getServerMessages);
// clears messages (server or also in the client)
router.get('/clear/:option', auth, ctrlMessage.adminMessagesClear);

module.exports = router;