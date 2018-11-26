var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;

//var permissions = require('../config/permissions');

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

/***************************** Query Functions ********************************/
var queryGetGenderDistribution = function (req, res, next) {
    var unitID = req.params.unitID;
    var query = 'SELECT people.id, people.gender' +
                ' FROM people' +
                ' LEFT JOIN people_labs ON people_labs.person_id = people.id' +
                ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                ' LEFT JOIN lab_positions ON lab_positions.id = people_labs.lab_position_id' +
                ' JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                ' JOIN groups ON groups.id = labs_groups.group_id' +
                ' JOIN groups_units ON groups_units.group_id = groups.id' +
                ' JOIN units ON units.id = groups_units.unit_id' +
                ' WHERE units.id = ? AND people.name IS NOT NULL AND' +
                ' (people_labs.valid_until >= CURRENT_DATE() OR people_labs.valid_until IS NULL) AND' +
                ' (labs.finished >= CURRENT_DATE() OR labs.finished IS NULL) AND' +
                ' (labs_groups.valid_until >= CURRENT_DATE() OR labs_groups.valid_until IS NULL) AND' +
                ' (groups.finished >= CURRENT_DATE() OR groups.finished IS NULL) AND' +
                ' (groups_units.valid_until >= CURRENT_DATE() OR groups_units.valid_until IS NULL);';
    var places = [unitID];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, rowsQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": rowsQuery.length,
                     "result" : rowsQuery});
                return;
            }
        );
    });
};

var queryGetPositionsDistribution = function (req, res, next) {
    var unitID = req.params.unitID;
    var query = 'SELECT people.id, people_labs.lab_position_id' +
                ' FROM people' +
                ' LEFT JOIN people_labs ON people_labs.person_id = people.id' +
                ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                ' LEFT JOIN lab_positions ON lab_positions.id = people_labs.lab_position_id' +
                ' JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                ' JOIN groups ON groups.id = labs_groups.group_id' +
                ' JOIN groups_units ON groups_units.group_id = groups.id' +
                ' JOIN units ON units.id = groups_units.unit_id' +
                ' WHERE units.id = ? AND people.name IS NOT NULL AND' +
                ' (people_labs.valid_until >= CURRENT_DATE() OR people_labs.valid_until IS NULL) AND' +
                ' (labs.finished >= CURRENT_DATE() OR labs.finished IS NULL) AND' +
                ' (labs_groups.valid_until >= CURRENT_DATE() OR labs_groups.valid_until IS NULL) AND' +
                ' (groups.finished >= CURRENT_DATE() OR groups.finished IS NULL) AND' +
                ' (groups_units.valid_until >= CURRENT_DATE() OR groups_units.valid_until IS NULL);';
    var places = [unitID];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, rowsQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": rowsQuery.length,
                     "result" : rowsQuery});
                return;
            }
        );
    });
};

var queryGetPoleDistribution = function (req, res, next) {
    var unitID = req.params.unitID;
    var query = 'SELECT people.id, institution_city.id AS city_id, institution_city.city' +
                ' FROM people' +
                ' LEFT JOIN people_institution_city ON people_institution_city.person_id = people.id' +
                ' LEFT JOIN institution_city ON people_institution_city.city_id = institution_city.id' +
                ' LEFT JOIN people_labs ON people_labs.person_id = people.id' +
                ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                ' LEFT JOIN lab_positions ON lab_positions.id = people_labs.lab_position_id' +
                ' JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                ' JOIN groups ON groups.id = labs_groups.group_id' +
                ' JOIN groups_units ON groups_units.group_id = groups.id' +
                ' JOIN units ON units.id = groups_units.unit_id' +
                ' WHERE units.id = ? AND people.name IS NOT NULL AND' +
                ' (people_labs.valid_until >= CURRENT_DATE() OR people_labs.valid_until IS NULL) AND' +
                ' (labs.finished >= CURRENT_DATE() OR labs.finished IS NULL) AND' +
                ' (labs_groups.valid_until >= CURRENT_DATE() OR labs_groups.valid_until IS NULL) AND' +
                ' (groups.finished >= CURRENT_DATE() OR groups.finished IS NULL) AND' +
                ' (groups_units.valid_until >= CURRENT_DATE() OR groups_units.valid_until IS NULL);';
    var places = [unitID];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, rowsQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": rowsQuery.length,
                     "result" : rowsQuery});
                return;
            }
        );
    });
};

var queryGetPublicationsByYear = function (req, res, next) {
    var unitID = req.params.unitID;
    var query = 'SELECT publications.id, publications.year' +
                ' FROM units_publications' +
                ' JOIN publications ON publications.id = units_publications.publication_id' +
                ' WHERE units_publications.unit_id = ?;';
    var places = [unitID];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, rowsQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": rowsQuery.length,
                     "result" : rowsQuery});
                return;
            }
        );
    });
};


/***************************** Entry Functions ********************************/

module.exports.getGenderDistribution = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 16, 20],
        function (req, res, username) {
            queryGetGenderDistribution(req,res,next);
        }
    );
};

module.exports.getPositionsDistribution = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 16, 20],
        function (req, res, username) {
            queryGetPositionsDistribution(req,res,next);
        }
    );
};

module.exports.getPoleDistribution = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 16, 20],
        function (req, res, username) {
            queryGetPoleDistribution(req,res,next);
        }
    );
};

module.exports.getPublicationsByYear = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 16, 20],
        function (req, res, username) {
            queryGetPublicationsByYear(req,res,next);
        }
    );
};
