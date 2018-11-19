
var server = require('../../../app_api/models/server');
var pool = server.pool;
var socketAPI = require('../socketAPI');

/**************************** Utility Functions *******************************/
var sendJSONResponse = function(res, status, content) {
    res.status(status);
    res.json(content);
};

var getUser = function (req, res, permissions, callback) {
    // permissions - array containing which types of users can access resource
    if (req.payload && req.payload.username) {
        var username = req.payload.username;
        pool.query(
            "SELECT * FROM users WHERE username = ?",
            [username],
            function(err, rows){
                if (err) {
                    sendJSONResponse(res, 404, err);
                    return;
                }
                if (!rows.length) {
                    sendJSONResponse(res, 404, { message: 'Username not found.' });
                    return;
                }
                if (req.payload.personID != req.params.personID
                    && permissions.indexOf(req.payload.stat) === -1) {
                    sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
                    return;
                }
                // all is well, return successful user
                return callback(req, res, username);
            }
        );
    }
};


/**************************** Messaging Functions *****************************/
var makeAdminSendMessageAll = function (req, res, next) {
    var message = req.body.message_all;
    socketAPI.adminMessageAll(message);
    sendJSONResponse(res, 200,
        {"status": "success", "statusCode": 200});
};

var makeAdminMessagesClear = function (req, res, next) {
    var option = req.params.option;
    socketAPI.adminMessagesClear(option);
    sendJSONResponse(res, 200,
        {"status": "success", "statusCode": 200});
};

var makeGetServerMessages = function (req, res, next) {
    var history = socketAPI.getServerMessages();
    sendJSONResponse(res, 200,
        {"status": "success", "statusCode": 200,  "count": history.length,
         "result" : history});
};



/******************** Call SQL Generators after Validations *******************/
module.exports.adminSendMessageAll = function (req, res, next) {
    getUser(req, res, [0],
        function (req, res, username) {
            makeAdminSendMessageAll(req, res, next);
        }
    );
};

module.exports.adminMessagesClear = function (req, res, next) {
    getUser(req, res, [0],
        function (req, res, username) {
            makeAdminMessagesClear(req, res, next);
        }
    );
};

module.exports.getServerMessages = function (req, res, next) {
    getUser(req, res, [0],
        function (req, res, username) {
            makeGetServerMessages(req, res, next);
        }
    );
};