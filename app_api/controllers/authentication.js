var passport = require('../config/passport');
var server = require('../models/server');
var pool = server.pool;
var moment = require('moment-timezone');
var userModule = require('../models/users');

/**************************** Utility Functions *******************************/
var sendJSONResponse = function(res, status, content) {
    res.status(status);
    res.json(content);
};

var getUser = function (req, res, callback) {
    if (req.payload && req.payload.username) {
        var userID = req.params.userID;
        pool.query('SELECT users.id AS user_id, users.username, users.password, users.status AS stat, people.id as person_id ' +
             'FROM users LEFT JOIN people ON people.user_id = users.id ' +
             'WHERE users.id = ?',
            [userID],
            function(err, rows){
                if (err) {
                    sendJSONResponse(res, 404, err);
                    return;
                }
                if (!rows.length) {
                    sendJSONResponse(res, 404, { message: 'Username not found.' });
                    return;
                }
                if (req.payload.userID != rows[0].user_id && req.payload.stat != 0) {
                    sendJSONResponse(res, 404, { message: 'This user is not authorized to this operation.' });
                    return;
                }
                // all is well, return successful user
                return callback(req, res, req.payload, rows[0]);
            });
    }
};

function momentToDate(timedate, timezone, timeformat) {
    if (timezone === undefined) {
        timezone = 'Europe/Lisbon';
    }
    if (timeformat === undefined) {
        timeformat = 'YYYY-MM-DD';
    }
    return timedate !== null ? moment.tz(timedate,timezone).format(timeformat) : null;
}

/************************ Controllers for authentication **********************/
module.exports.login = function(req, res, next) {
    if(!req.body.username || !req.body.password) {
        sendJSONResponse(res, 400, {
            "message": "All fields required"
        });
        return;
    }
    passport.authenticate('local-login', function(err, user, info) {
        if (err) {
            sendJSONResponse(res, 404, err);
            return;
        }
        if (user) {
            var token = userModule.generateJWT(user.user_id,user.person_id,
                            user.stat,user.username, user.lab_id, user.city_id);
            sendJSONResponse(res, 200, {
                "token" : token
            });
        } else {
            sendJSONResponse(res, 401, info);
        }
    })(req, res);
};

module.exports.preRegistration = function(req, res, next) {
    if(!req.body.username || !req.body.password) {
        sendJSONResponse(res, 400, {
            "message": "All fields required"
        });
        return;
    }
    passport.authenticate('local-prereg', function(err, user, info) {
        if (err) {
            sendJSONResponse(res, 404, err);
            return;
        }
        if (user) {
            var token = userModule.generateJWTPreReg(user.user_id,user.person_id,
                            user.stat,user.username, user.city_id);
            sendJSONResponse(res, 200, {
                "token" : token
            });
        } else {
            sendJSONResponse(res, 401, info);
        }
    })(req, res);
};

module.exports.changePassword = function(req, res, next) {
    getUser(req, res,
        function (req, res, payload, row) {
            if(!req.body.username || !req.body.password || !req.body.newPassword1) {
                sendJSONResponse(res, 400, {
                    "message": "All fields required"
                });
                return;
            }
            var places = [];
            var querySQL = '';
            var timeChanged = momentToDate(moment(),undefined,'YYYY-MM-DD HH:mm:ss');
            querySQL = querySQL + 'UPDATE `users`' +
                                          ' SET `password` = ?,' +
                                          ' `updated` = ?' +
                                          ' WHERE `id` = ?;';
            places.push(userModule.hashPassword(req.body.newPassword1),timeChanged,row.user_id);
            pool.getConnection(function(err, connection) {
                if (err) {
                    sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
                    return;
                }
                // Use the connection
                connection.query(querySQL, places,
                    function(err, rows) {
                        // And done with the connection.
                        connection.release();
                        if (err) {
                            sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                            return;
                        }
                        if (row.user_id == payload.userID) {
                            var token = userModule.generateJWT(payload.userID,payload.personID,payload.stat,payload.username);
                            sendJSONResponse(res, 200, {
                                "token" : token
                            });
                        } else {
                            sendJSONResponse(res, 200, {
                                "status": "success", "result": "Changed user password successfully."
                            });
                        }
                });
            });
        }
    )(req, res);
};