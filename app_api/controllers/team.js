var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
const nodemailer = require('../controllers/emailer');
let transporter = nodemailer.transporter;
var userModule = require('../models/users');
var permissions = require('../config/permissions');
var externalAPI = require('../config/external-api');

var WEBSITE_API_BASE_URL = externalAPI.baseURL;
var MANAGER_PERMISSION_LEVEL = 15;

/**************************** Utility Functions *******************************/

var getLocation = function(req, res, next, callback, type) {
    // gets cities associated with resources (person in lab) to be altered
    var personIDs = [];
    var arr;
    if (type === undefined) {
        /*arr = req.body.newPersonLab;
        for (var ind in arr) {
            personIDs.push(arr[ind]['person_id']);
        }
        */
        arr = req.body.updateLabPerson;
        for (var ind in arr) {
            personIDs.push(arr[ind]['person_id']);
        }
        arr = req.body.deleteLabPerson;
        for (var ind in arr) {
            personIDs.push(arr[ind]['person_id']);
        }
    } else if (type === 'technician'
            || type === 'scienceManager'
            || type === 'administrative'){
        arr = req.body.updateOfficePerson;
        for (var ind in arr) {
            personIDs.push(arr[ind]['person_id']);
        }
        arr = req.body.deleteOfficePerson;
        for (var ind in arr) {
            personIDs.push(arr[ind]['person_id']);
        }
    }
    // get geographical location of resource
    var queryLocation = 'SELECT person_id,city_id FROM people_institution_city WHERE';
    for (var ind in personIDs) {
        queryLocation = queryLocation + ' person_id = ?';
        if (ind < personIDs.length - 1) {
            queryLocation = queryLocation + ' OR';
        }
    }
    queryLocation = queryLocation + ';';
    if (personIDs.length > 0) {
        pool.getConnection(function(err, connection) {
            if (err) {
                sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
                return;
            }
            // Use the connection
            connection.query( queryLocation, personIDs, function(err, userCity) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                if (type === undefined) {
                    return callback(req,res,next, personIDs, userCity, queryUpdateLabPeople);
                }
                if (type === 'technician') {
                    return callback(req,res,next, personIDs, userCity, queryUpdateTechPeople);
                }
                if (type === 'scienceManager') {
                    return callback(req,res,next, personIDs, userCity, queryUpdateScManPeople);
                }
                if (type === 'administrative') {
                    return callback(req,res,next, personIDs, userCity, queryUpdateAdmPeople);
                }
            });
        });
    } else {
        sendJSONResponse(res, 200, {"status": "no changes", "statusCode": 200});
        return;
    }

};

var getTeam = function(req, res, next, personIDs, userCity, callback) {
    // get team of resource
    var queryTeam = 'SELECT person_id,lab_id FROM people_labs WHERE';
    for (var ind in personIDs) {
        queryTeam = queryTeam + ' person_id = ?';
        if (ind < personIDs.length - 1) {
            queryTeam = queryTeam + ' OR';
        }
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        // Use the connection
        connection.query( queryTeam, personIDs, function(err, labs) {
            // And done with the connection.
            connection.release();
            if (err) {
                sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                return;
            }
            return callback(req,res,next, userCity, labs);
        });
    });
};

var getTechTeam = function(req, res, next, personIDs, userCity, callback) {
    // get team of resource
    var queryTeam = 'SELECT person_id,technician_office_id FROM technicians WHERE';
    for (var ind in personIDs) {
        queryTeam = queryTeam + ' person_id = ?';
        if (ind < personIDs.length - 1) {
            queryTeam = queryTeam + ' OR';
        }
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        // Use the connection
        connection.query( queryTeam, personIDs, function(err, labs) {
            // And done with the connection.
            connection.release();
            if (err) {
                sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                return;
            }
            return callback(req,res,next, userCity, labs);
        });
    });
};

var getScManTeam = function(req, res, next, personIDs, userCity, callback) {
    // get team of resource
    var queryTeam = 'SELECT person_id,science_manager_office_id FROM science_managers WHERE';
    for (var ind in personIDs) {
        queryTeam = queryTeam + ' person_id = ?';
        if (ind < personIDs.length - 1) {
            queryTeam = queryTeam + ' OR';
        }
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        // Use the connection
        connection.query( queryTeam, personIDs, function(err, labs) {
            // And done with the connection.
            connection.release();
            if (err) {
                sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                return;
            }
            return callback(req,res,next, userCity, labs);
        });
    });
};

var getAdmTeam = function(req, res, next, personIDs, userCity, callback) {
    // get team of resource
    var queryTeam = 'SELECT person_id,administrative_office_id FROM people_administrative_offices WHERE';
    for (var ind in personIDs) {
        queryTeam = queryTeam + ' person_id = ?';
        if (ind < personIDs.length - 1) {
            queryTeam = queryTeam + ' OR';
        }
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        // Use the connection
        connection.query( queryTeam, personIDs, function(err, labs) {
            // And done with the connection.
            connection.release();
            if (err) {
                sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                return;
            }
            return callback(req,res,next, userCity, labs);
        });
    });
};

var sendJSONResponse = function(res, status, content) {
    res.status(status);
    res.json(content);
};

var getQueryResponse = function(querySQL, req, res, next) {
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        // Use the connection
        connection.query( querySQL, function(err, rows) {
            // And done with the connection.
            connection.release();
            if (err) {
                sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                return;
            }
            sendJSONResponse(res, 200,
                {"status": "success", "statusCode": 200, "count": rows.length,
                 "result" : rows});
        });
    });
};

var escapedQuery = function(querySQL, place, req, res, next) {
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        // Use the connection
        connection.query( querySQL, place, function(err, rows) {
            // And done with the connection.
            connection.release();
            if (err) {
                sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                return;
            }
            sendJSONResponse(res, 200,
                {"status": "success", "statusCode": 200, "count": rows.length,
                 "result" : rows});
        });
    });
};

var escapedQueryPersonSearch = function(querySQL, req, res, next) {
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        // Use the connection
        connection.query( querySQL, function(err, rows) {
            // And done with the connection.
            connection.release();
            if (err) {
                sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                return;
            }
            var newRows = [];
            for (var el in rows) {

                if (rows[el].lab_id !== null) {
                   var thisRow = filterLabTimes([rows[el]],'team-leader');
                   if (thisRow.length != 0) {
                       newRows.push(rows[el]);
                   }
                } else {
                    newRows.push(rows[el]);
                }
            }
            sendJSONResponse(res, 200,
                {"status": "success", "statusCode": 200, "count": newRows.length,
                 "result" : newRows});
        });
    });
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

function getGeoPermissions(req, userCity) {
    var geoPermissions = [];
    var requesterStatus = req.payload.stat;
    var citiesPermissions = permissions.geographicAccess(requesterStatus);
    for (var ind in userCity) {
        if (citiesPermissions.indexOf(userCity[ind].city_id) !== -1) {
            geoPermissions.push(
                {
                    'person_id': userCity[ind].person_id,
                    'city_id':  userCity[ind].city_id,
                    'permission': true
                });
        } else {
            geoPermissions.push(
                {
                    'person_id': userCity[ind].person_id,
                    'city_id':  userCity[ind].city_id,
                    'permission': false
                });
        }
    }
    return geoPermissions;
}

function getLabPermissions(req, labs) {
    var labPermissions = [];
    var requesterLab = req.payload.labID;
    var requesterStatus = req.payload.stat;
    for (var indLabs in labs) {
        for (var indRequester in requesterLab) {
            var foundPermissions = false;
            if (requesterStatus <= MANAGER_PERMISSION_LEVEL) {
                foundPermissions = true;
                labPermissions.push(
                    {
                        'person_id': labs[indLabs].person_id,
                        'lab_id':  labs[indLabs].lab_id,
                        'permission': true
                    });
            } else {
                if (requesterLab[indRequester] === labs[indLabs].lab_id) {
                    foundPermissions = true;
                    labPermissions.push(
                        {
                            'person_id': labs[indLabs].person_id,
                            'lab_id':  labs[indLabs].city_id,
                            'permission': true
                        });
                }
            }
        }
        if (!foundPermissions) {
            labPermissions.push(
                {
                    'person_id': labs[indLabs].person_id,
                    'lab_id':  labs[indLabs].city_id,
                    'permission': false
                });
        }
    }
    return labPermissions;
}

function momentToDate(timedate, timezone, timeformat) {
    if (timezone === undefined) {
        timezone = 'Europe/Lisbon';
    }
    if (timeformat === undefined) {
        timeformat = 'YYYY-MM-DD';
    }
    return timedate !== null ? moment.tz(timedate,timezone).format(timeformat) : null;
}

function findEarliestDate(dates) {
    if (dates.length > 0) {
        var minDate = moment(dates[0]);
        for (var ind in dates) {
            if (dates[ind] !== null) {
                if (moment(dates[ind]).isBefore(minDate)) {
                    minDate = moment(dates[ind]);
                }
            }
        }
        return minDate;
    } else {
        return null;
    }
}

var make_password = function(n, a) {
  var index = (Math.random() * (a.length - 1)).toFixed(0);
  return n > 0 ? a[index] + make_password(n - 1, a) : '';
};

function filterLabTimes(rows, type) {
    // lab_start is when person started in the lab
    // lab_end is when person left the lab

    // lab_opened => when lab was inaugurated
    // lab_closed => when lab ceased
    // labs_groups_valid_from => when lab entered a group
    // labs_groups_valid_until => when lab left a group

    // 1. back-end - lab, group and units times must be defined consistently
    // 2. front-end - lab_start cannot be less than lab_opened, lab_end cannot be more than lab_closed
    var filteredRows = [];
    for (var ind in rows) {
        var overlap;
        if (type === undefined) {
            overlap = timeOverlap(rows[ind].valid_from,rows[ind].valid_until,
                rows[ind].labs_groups_valid_from,rows[ind].labs_groups_valid_until);
            if (overlap) {
                // TODO: momentToDate???
                rows[ind].valid_from = overlap[0];
                rows[ind].valid_until = overlap[1];
                filteredRows.push(rows[ind]);
            }
        } else {
            overlap = timeOverlap(rows[ind].lab_start,rows[ind].lab_end,
                rows[ind].labs_groups_valid_from,rows[ind].labs_groups_valid_until);
            if (overlap) {
                // TODO: momentToDate???
                rows[ind].valid_from = overlap[0];
                rows[ind].valid_until = overlap[1];
                filteredRows.push(rows[ind]);
            }
        }
    }
    return filteredRows;
}

function timeOverlap(d1_start,d1_end, d2_start, d2_end) {
    // returns false if no overlap
    // else returns [startoverlap,endoverlap]
    // null in start time is assumed to be -Inf
    // null in end time is assumed to be +Inf
    var startOverlap;
    var endOverlap;
    if (d1_start !== null) {
        if (d1_end !== null) {
            if (d2_start !== null) {
                if (d2_end !== null) {
                    if (moment(d1_start).isSameOrAfter(moment(d2_end))
                        || moment(d1_end).isSameOrBefore(moment(d2_start))) {
                        return false;
                    } else {
                        // there's overlap
                        if (moment(d1_start).isAfter(moment(d2_start))) {
                            startOverlap = d1_start;
                        } else {
                            startOverlap = d2_start;
                        }
                        if (moment(d1_end).isBefore(moment(d2_end))) {
                            endOverlap = d1_end;
                        } else {
                            endOverlap = d2_end;
                        }
                        return [startOverlap,endOverlap];
                    }
                } else {
                    if (moment(d1_end).isSameOrBefore(moment(d2_start))) {
                        return false;
                    } else {
                        // there's overlap
                        if (moment(d1_start).isAfter(moment(d2_start))) {
                            startOverlap = d1_start;
                        } else {
                            startOverlap = d2_start;
                        }
                        endOverlap = d1_end;
                        return [startOverlap,endOverlap];
                    }
                }
            } else {
                // d2_start is null
                if (d2_end !== null) {
                    if (moment(d1_start).isSameOrAfter(moment(d2_end))) {
                        return false;
                    } else {
                        // there's overlap
                        startOverlap = d1_start;
                        endOverlap = d1_end;
                        if (moment(d1_end).isBefore(moment(d2_end))) {

                        } else {
                            endOverlap = d2_end;
                        }
                        return [startOverlap,endOverlap];
                    }
                } else {
                    // there's overlap
                    startOverlap = d1_start;
                    endOverlap = d1_end;
                    return [startOverlap,endOverlap];
                }
            }
        } else {
            // d1_end is null
            if (d2_start !== null) {
                if (d2_end !== null) {
                    if (moment(d1_start).isSameOrAfter(moment(d2_end))) {
                        return false;
                    } else {
                        // there's overlap
                        if (moment(d1_start).isAfter(moment(d2_start))) {
                            startOverlap = d1_start;
                        } else {
                            startOverlap = d2_start;
                        }
                        if (moment(d1_end).isBefore(moment(d2_end))) {
                            endOverlap = d1_end;
                        } else {
                            endOverlap = d2_end;
                        }
                        return [startOverlap,endOverlap];
                    }
                } else {
                    if (moment(d1_end).isSameOrBefore(moment(d2_start))) {
                        return false;
                    } else {
                        // there's overlap
                        if (moment(d1_start).isAfter(moment(d2_start))) {
                            startOverlap = d1_start;
                        } else {
                            startOverlap = d2_start;
                        }
                        endOverlap = d1_end;
                        return [startOverlap,endOverlap];
                    }
                }
            } else {
                // d2_start is null
                if (d2_end !== null) {
                    if (moment(d1_start).isSameOrAfter(moment(d2_end))) {
                        return false;
                    } else {
                        // there's overlap
                        startOverlap = d1_start;
                        if (moment(d1_end).isBefore(moment(d2_end))) {
                            endOverlap = d1_end;
                        } else {
                            endOverlap = d2_end;
                        }
                        return [startOverlap,endOverlap];
                    }
                } else {
                    // there's overlap
                    startOverlap = d1_start;
                    endOverlap = d1_end;
                    return [startOverlap,endOverlap];
                }
            }
        }
    } else {
        // d1_start is null
        if (d1_end !== null) {
            if (d2_start !== null) {
                if (d2_end !== null) {
                    if (moment(d1_end).isSameOrBefore(moment(d2_start))) {
                        return false;
                    } else {
                        // there's overlap
                        startOverlap = d2_start;
                        if (moment(d1_end).isBefore(moment(d2_end))) {
                            endOverlap = d1_end;
                        } else {
                            endOverlap = d2_end;
                        }
                        return [startOverlap,endOverlap];
                    }
                } else {
                    if (moment(d1_end).isSameOrBefore(moment(d2_start))) {
                        return false;
                    } else {
                        // there's overlap
                        startOverlap = d2_start;
                        endOverlap = d1_end;
                        return [startOverlap,endOverlap];
                    }
                }
            } else {
                // d2_start is null
                if (d2_end !== null) {
                    // there's overlap
                    startOverlap = d1_start; // yes it's null
                    if (moment(d1_end).isBefore(moment(d2_end))) {
                        endOverlap = d1_end;
                    } else {
                        endOverlap = d2_end;
                    }
                    return [startOverlap,endOverlap];
                } else {
                    // there's overlap
                    startOverlap = d1_start;
                    endOverlap = d1_end;
                    return [startOverlap,endOverlap];
                }
            }
        } else {
            // d1_end is null
            startOverlap = d2_start; //even if it is null
            endOverlap = d2_end; //even if it is null
            return [startOverlap,endOverlap];
        }
    }
}

/***************************** Query Functions ********************************/

var queryGetLabs = function (req,res,next, personID, dates, updateArr, deleteArr, updated, i, type) {
    var query = 'SELECT *' +
                ' FROM people_labs' +
                ' WHERE person_id = ?;';
    var places = [personID];
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
                for (var ind in rowsQuery) {
                    dates.push(rowsQuery[ind].valid_from);
                }
                return queryGetTechnicianAffiliation(req,res,next, personID, dates, updateArr, deleteArr, updated,i,type);
            }
        );
    });
};

var queryGetTechnicianAffiliation = function (req,res,next, personID, dates, updateArr, deleteArr, updated, i, type) {
    var query = 'SELECT *' +
                ' FROM technicians' +
                ' WHERE person_id = ?;';
    var places = [personID];
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
                for (var ind in rowsQuery) {
                    dates.push(rowsQuery[ind].valid_from);
                }
                return queryGetScienceManagerAffiliation(req,res,next, personID, dates, updateArr, deleteArr, updated,i,type);
            }
        );
    });
};

var queryGetScienceManagerAffiliation = function (req,res,next, personID, dates, updateArr, deleteArr, updated, i, type) {
    var query = 'SELECT *' +
                ' FROM science_managers' +
                ' WHERE person_id = ?;';
    var places = [personID];
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
                for (var ind in rowsQuery) {
                    dates.push(rowsQuery[ind].valid_from);
                }
                return queryGetAdministrativeAffiliation(req,res,next, personID, dates, updateArr, deleteArr, updated,i,type);
            }
        );
    });
};

var queryGetAdministrativeAffiliation = function (req,res,next, personID, dates, updateArr, deleteArr, updated, i, type) {
    var query = 'SELECT *' +
                ' FROM people_administrative_offices' +
                ' WHERE person_id = ?;';
    var places = [personID];
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
                for (var ind in rowsQuery) {
                    dates.push(rowsQuery[ind].valid_from);
                }
                return queryGetDepartments(req,res,next, personID, dates, updateArr, deleteArr, updated,i,type);
            }
        );
    });
};

var queryGetDepartments = function (req,res,next, personID, dates, updateArr, deleteArr, updated, i, type) {
    var query = 'SELECT *' +
                ' FROM people_departments' +
                ' WHERE person_id = ?;';
    var places = [personID];
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
                for (var ind in rowsQuery) {
                    dates.push(rowsQuery[ind].valid_from);
                }
                return queryPeopleStartDateGetRow(req,res,next, personID, dates, updateArr, deleteArr, updated,i,type);
            }
        );
    });
};

var queryPeopleStartDateGetRow = function (req,res,next, personID, dates, updateArr, deleteArr, updated, i, type) {
    var querySQL = 'SELECT * from `people` WHERE id = ?;';
    var places = [personID];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(querySQL,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var minDate = findEarliestDate(dates);
                var data
                if (moment(resQuery[0].active_from).isSame(minDate)) {
                    if (type.indexOf('update') !== -1) {
                        if (i + 1 < updateArr.length) {
                            data = updateArr[i+1];
                            if (type.indexOf('lab') !== -1) {
                                return queryUpdateResearcher(req, res, next, updateArr, deleteArr, updated, data, i+1);
                            }
                            if (type.indexOf('technician') !== -1) {
                                return queryUpdateTechInfo(req, res, next, updateArr, deleteArr, updated, data, i+1);
                            }
                            if (type.indexOf('scMan') !== -1) {
                                return queryUpdateScManInfo(req, res, next, updateArr, deleteArr, updated, data, i+1);
                            }
                            if (type.indexOf('administrative') !== -1) {
                                return queryUpdateAdmInfo(req, res, next, updateArr, deleteArr, updated, data, i+1);
                            }
                        } else if (deleteArr.length > 0) {
                            data = deleteArr[0];
                            if (type.indexOf('lab') !== -1) {
                                return queryDeleteLab(req, res, next, updateArr, deleteArr, updated, data, 0);
                            }
                            if (type.indexOf('technician') !== -1) {
                                return queryDeleteTech(req, res, next, updateArr, deleteArr, updated, data, 0);
                            }
                            if (type.indexOf('scMan') !== -1) {
                                return queryDeleteScMan(req, res, next, updateArr, deleteArr, updated, data, 0);
                            }
                            if (type.indexOf('administrative') !== -1) {
                                return queryDeleteAdm(req, res, next, updateArr, deleteArr, updated, data, 0);
                            }
                        } else {
                            sendJSONResponse(res, 200, { message: 'All done.' });
                            return;
                        }
                    } else if (type.indexOf('delete') !== -1){
                        if (i + 1 < deleteArr.length) {
                            data = deleteArr[i+1];
                            if (type.indexOf('lab') !== -1) {
                                return queryDeleteLab(req, res, next, updateArr, deleteArr, updated, data, i+1);
                            }
                            if (type.indexOf('technician') !== -1) {
                                return queryDeleteTech(req, res, next, updateArr, deleteArr, updated, data, i+1);
                            }
                            if (type.indexOf('scMan') !== -1) {
                                return queryDeleteScMan(req, res, next, updateArr, deleteArr, updated, data, i+1);
                            }
                            if (type.indexOf('administrative') !== -1) {
                                return queryDeleteScMan(req, res, next, updateArr, deleteArr, updated, data, i+1);
                            }
                        } else {
                            sendJSONResponse(res, 200, { message: 'All done.' });
                            return;
                        }
                    }
                } else {
                    return queryPeopleUpdateStartDate(req,res,next, personID, resQuery[0],minDate, updateArr, deleteArr, updated,i,type);
                }
            }
        );
    });
};

var queryPeopleUpdateStartDate = function (req,res,next, personID, resQuery, minDate, updateArr, deleteArr, updated, i, type) {
    var querySQL;
    var places;
    if (isNaN(minDate)) {
        querySQL = 'SELECT * FROM `people`' +
                       ' WHERE `id` = ?;';
        places = [personID];
    } else {
        querySQL = 'UPDATE `people`' +
                       ' SET `active_from` = ?' +
                       ' WHERE `id` = ?;';
        places = [momentToDate(minDate),personID];
        querySQL = querySQL + 'INSERT INTO `people_history`' +
                       ' (`person_id`,`user_id`,`name`,`colloquial_name`,`birth_date`,`gender`,' +
                         '`active_from`,`active_until`,`status`,`updated`,`operation`,`changed_by`)' +
                       ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
        querySQL = querySQL + '; ';
        places.push(personID,resQuery.user_id,resQuery.name,resQuery.colloquial_name,
                    resQuery.birth_date,resQuery.gender,
                    momentToDate(minDate),resQuery.active_until,1,updated,'U',req.body.changed_by);
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(querySQL,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'people', personID,
                                'UCIBIO API error updating by team leader person information (activity start) :', personID);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by team leader person information (activity start) :', personID);
                var data;
                if (type.indexOf('update') !== -1) {
                    if (i + 1 < updateArr.length) {
                        data = updateArr[i+1];
                        if (type.indexOf('lab') !== -1) {
                            return queryUpdateResearcher(req, res, next, updateArr, deleteArr, updated, data, i+1);
                        }
                        if (type.indexOf('technician') !== -1) {
                            return queryUpdateTechInfo(req, res, next, updateArr, deleteArr, updated, data, i+1);
                        }
                        if (type.indexOf('scMan') !== -1) {
                            return queryUpdateScManInfo(req, res, next, updateArr, deleteArr, updated, data, i+1);
                        }
                        if (type.indexOf('administrative') !== -1) {
                            return queryUpdateAdmInfo(req, res, next, updateArr, deleteArr, updated, data, i+1);
                        }
                    } else if (deleteArr.length > 0) {
                        data = deleteArr[0];
                        if (type.indexOf('lab') !== -1) {
                            return queryDeleteLab(req, res, next, updateArr, deleteArr, updated, data, 0);
                        }
                        if (type.indexOf('technician') !== -1) {
                            return queryDeleteTech(req, res, next, updateArr, deleteArr, updated, data, 0);
                        }
                        if (type.indexOf('scMan') !== -1) {
                            return queryDeleteScMan(req, res, next, updateArr, deleteArr, updated, data, 0);
                        }
                        if (type.indexOf('administrative') !== -1) {
                            return queryDeleteAdm(req, res, next, updateArr, deleteArr, updated, data, 0);
                        }
                    } else {
                        sendJSONResponse(res, 200, { message: 'All done.' });
                        return;
                    }
                } else if (type.indexOf('delete') !== -1){
                    if (i + 1 < deleteArr.length) {
                        data = deleteArr[i+1];
                        if (type.indexOf('lab') !== -1) {
                            return queryDeleteLab(req, res, next, updateArr, deleteArr, updated, data, i+1);
                        }
                        if (type.indexOf('technician') !== -1) {
                            return queryDeleteTech(req, res, next, updateArr, deleteArr, updated, data, i+1);
                        }
                        if (type.indexOf('scMan') !== -1) {
                            return queryDeleteScMan(req, res, next, updateArr, deleteArr, updated, data, i+1);
                        }
                        if (type.indexOf('administrative') !== -1) {
                            return queryDeleteScMan(req, res, next, updateArr, deleteArr, updated, data, i+1);
                        }
                    } else {
                        sendJSONResponse(res, 200, { message: 'All done.' });
                        return;
                    }
                }
            }
        );
    });
};

var queryUpdateLabPeople = function (req, res, next, userCity, labs) {
    var permissionsGeo = getGeoPermissions(req, userCity);
    var permissionsLab = getLabPermissions(req, labs);
    var updateArrPre = req.body.updateLabPerson;
    var deleteArrPre = req.body.deleteNeverMember;
    var updated = moment.tz('Europe/Lisbon').format('YYYY-MM-DD HH:mm:ss');

    var updateArr = [];
    var deleteArr = [];
    var hasPermissionGeo;
    var hasPermissionLab;
    for (var ind in updateArrPre) {
        hasPermissionGeo = false;
        hasPermissionLab = false;
        for (var indGeoPerm in permissionsGeo) {
            if (updateArrPre[ind]['person_id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        for (var indLabPerm in permissionsLab) {
            if (updateArrPre[ind]['person_id'] === permissionsLab[indLabPerm]['person_id']
                    && permissionsLab[indLabPerm]['permission']) {
                hasPermissionLab = true;
            }
        }

        if ((req.payload.personID !== updateArrPre[ind]['person_id']
                    && hasPermissionGeo && hasPermissionLab)
             || req.payload.personID === updateArrPre[ind]['person_id']) {
            updateArr.push(updateArrPre[ind]);
        }
    }
    for (var ind in deleteArrPre) {
        hasPermissionGeo = false;
        hasPermissionLab = false;
        for (var indGeoPerm in permissionsGeo) {
            if (deleteArrPre[ind]['person_id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        for (var indLabPerm in permissionsLab) {
            if (deleteArrPre[ind]['person_id'] === permissionsLab[indLabPerm]['person_id']
                    && permissionsLab[indLabPerm]['permission']) {
                hasPermissionLab = true;
            }
        }
        if ((req.payload.personID !== deleteArrPre[ind]['person_id']
                    && hasPermissionGeo && hasPermissionLab)
             || req.payload.personID === deleteArrPre[ind]['person_id']) {
            deleteArr.push(deleteArrPre[ind]);
        }
    }
    var places = [];
    var querySQL = '';
    var data;
    if (updateArr.length > 0) {
        data = updateArr[0];
        return queryUpdateResearcher(req, res, next, updateArr, deleteArr, updated, data, 0);
    } else if (deleteArr.length > 0) {
        data = deleteArr[0];
        return queryDeleteLab(req, res, next, updateArr, deleteArr, updated, data, 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0) {
        sendJSONResponse(res, 200, {"status": "No changes or User not authorized", "statusCode": 200});
    } else {
        escapedQuery(querySQL, places, req, res, next);
    }
};

var queryUpdateResearcher = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    var query;
    var places;
    if (data.researchers_id !== null) {
        query = 'UPDATE `researchers`' +
                ' SET `association_key` = ?,' +
                ' `ORCID` = ?' +
                ' WHERE `id` = ?;';
        places = [data.association_key, data.ORCID, data.researchers_id];
    } else {
        query = 'INSERT INTO `researchers`' +
                ' (person_id, association_key, ORCID)' +
                ' VALUES (?,?,?);';
        places = [data.person_id,data.association_key, data.ORCID];
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                return queryUpdateLab(req, res, next, updateArr, deleteArr, updated, data, i);
            }
        );
    });
};

var queryUpdateLab = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var query = 'UPDATE people_labs' +
                ' SET lab_position_id = ?,' +
                ' sort_order = ?,' +
                ' dedication = ?,' +
                ' valid_from = ?,' +
                ' valid_until = ?' +
                ' WHERE id = ?;';
    var places = [data.lab_position_id, data.sort_order, data.dedication,
            data.valid_from, data.valid_until, data.id];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var peopleOfficeID = data.id;
                return queryUpdateLabHistory(req, res, next, peopleOfficeID,
                                updateArr, deleteArr, updated, data, i);
            }
        );
    });
};

var queryUpdateLabHistory = function (req, res, next, peopleOfficeID,
                                updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var changed_by = req.body.changed_by;
    var personID = data.person_id;
    var query = 'INSERT INTO people_labs_history' +
                  ' (people_labs_id,person_id,lab_id,lab_position_id,sort_order,dedication,'+
                    'valid_from,valid_until,updated,operation,changed_by)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?,?);';
    var places = [peopleOfficeID,personID, data.lab_id,
                data.lab_position_id,data.sort_order,data.dedication,
                data.valid_from,data.valid_until,
                updated,'U',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'people', personID,
                                'UCIBIO API error updating by team leader person information (lab affiliation [personID,lab_id]) :', [personID,data.lab_id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by team leader person information (lab affiliation [personID,lab_id]) :', [personID,data.lab_id]);
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[], updateArr, deleteArr, updated, i,'lab update');
            }
        );
    });
};

var queryDeleteLab = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    var query = 'DELETE FROM people_labs' +
                          ' WHERE id=?;';
    var places = data.id;
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                return queryDeleteLabHistory(req, res, next,
                                updateArr, deleteArr, updated, data, i);
            }
        );
    });
};

var queryDeleteLabHistory = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var personID = data.person_id;
    var changed_by = req.body.changed_by;
    var query = 'INSERT INTO `people_labs_history`' +
                  ' (`people_labs_id`,`person_id`,`lab_id`,`lab_position_id`,`dedication`,'+
                    '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?);';
     var places = [data.id,personID, data.lab_id, data.lab_position_id,data.dedication,
                data.valid_from,data.valid_until,
                updated,'D',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'people', personID,
                                'UCIBIO API error updating by team leader person information (delete lab affiliation [personID,lab_id]) :', [personID,data.lab_id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by team leader person information (delete lab affiliation [personID,lab_id]) :', [personID,data.lab_id]);
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[], updateArr, deleteArr, updated, i,'lab delete');
            }
        );
    });
};

var queryUpdateTechPeople = function (req, res, next, userCity, labs) {
    var permissionsGeo = getGeoPermissions(req, userCity);
    var permissionsLab = getLabPermissions(req, labs);
    var updateArrPre = req.body.updateOfficePerson;
    var deleteArrPre = req.body.deleteOfficePerson;
    var updated = moment.tz('Europe/Lisbon').format('YYYY-MM-DD HH:mm:ss');

    var updateArr = [];
    var deleteArr = [];
    var hasPermissionGeo;
    var hasPermissionLab;
    for (var ind in updateArrPre) {
        hasPermissionGeo = false;
        hasPermissionLab = false;
        for (var indGeoPerm in permissionsGeo) {
            if (updateArrPre[ind]['person_id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        for (var indLabPerm in permissionsLab) {
            if (updateArrPre[ind]['person_id'] === permissionsLab[indLabPerm]['person_id']
                    && permissionsLab[indLabPerm]['permission']) {
                hasPermissionLab = true;
            }
        }

        if ((req.payload.personID !== updateArrPre[ind]['person_id']
                    && hasPermissionGeo && hasPermissionLab)
             || req.payload.personID === updateArrPre[ind]['person_id']) {
            updateArr.push(updateArrPre[ind]);
        }
    }
    for (var ind in deleteArrPre) {
        hasPermissionGeo = false;
        hasPermissionLab = false;
        for (var indGeoPerm in permissionsGeo) {
            if (deleteArrPre[ind]['person_id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        for (var indLabPerm in permissionsLab) {
            if (deleteArrPre[ind]['person_id'] === permissionsLab[indLabPerm]['person_id']
                    && permissionsLab[indLabPerm]['permission']) {
                hasPermissionLab = true;
            }
        }
        if ((req.payload.personID !== deleteArrPre[ind]['person_id']
                    && hasPermissionGeo && hasPermissionLab)
             || req.payload.personID === deleteArrPre[ind]['person_id']) {
            deleteArr.push(deleteArrPre[ind]);
        }
    }
    var places = [];
    var querySQL = '';
    var data;
    if (updateArr.length > 0) {
        data = updateArr[0];
        return queryUpdateTechInfo(req, res, next, updateArr, deleteArr, updated, data, 0);
    } else if (deleteArr.length > 0) {
        data = deleteArr[0];
        return queryDeleteTech(req, res, next, updateArr, deleteArr, updated, data, 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0) {
        sendJSONResponse(res, 200, {"status": "No changes or User not authorized", "statusCode": 200});
    } else {
        escapedQuery(querySQL, places, req, res, next);
    }
};

var queryUpdateTechInfo = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    var query;
    var places;
    if (data.technicians_info_id !== null) {
        query = 'UPDATE `technicians_info`' +
                ' SET `association_key` = ?,' +
                ' `ORCID` = ?' +
                ' WHERE `id` = ?;';
        places = [data.association_key, data.ORCID, data.technicians_info_id];
    } else {
        query = 'INSERT INTO `technicians_info`' +
                ' (person_id, association_key, ORCID)' +
                ' VALUES (?,?,?);';
        places = [data.person_id,data.association_key, data.ORCID];
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                return queryUpdateTech(req, res, next, updateArr, deleteArr, updated, data, i);
            }
        );
    });
};

var queryUpdateTech = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var query = 'UPDATE `technicians`' +
                ' SET `technician_position_id` = ?,' +
                ' `dedication` = ?,' +
                ' `valid_from` = ?,' +
                ' `valid_until` = ?' +
                ' WHERE `id` = ?;';
    var places = [data.technician_position_id, data.dedication,
            data.valid_from, data.valid_until, data.id];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var peopleOfficeID = data.id;
                return queryUpdateTechHistory(req, res, next, peopleOfficeID,
                                updateArr, deleteArr, updated, data, i);
            }
        );
    });
};

var queryUpdateTechHistory = function (req, res, next, peopleOfficeID,
                                updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var changed_by = req.body.changed_by;
    var personID = data.person_id;
    var query = 'INSERT INTO `technicians_history`' +
                  ' (`technician_id`,`person_id`,`technician_office_id`,`technician_position_id`,`dedication`,'+
                    '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    var places = [peopleOfficeID,personID, data.technician_office_id,
                data.technician_position_id,data.dedication,
                data.valid_from,data.valid_until,
                updated,'U',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'people', personID,
                                'UCIBIO API error updating by team leader person information (update tech affiliation [personID,office_id]) :', [personID,data.technician_office_id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by team leader person information (update tech affiliation [personID,office_id]) :', [personID,data.technician_office_id]);
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[], updateArr, deleteArr, updated, i,'technician update');
            }
        );
    });
};

var queryDeleteTech = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    var query = 'DELETE FROM `technicians`' +
                          ' WHERE id=?;';
    var places = data.id;
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                return queryDeleteTechHistory(req, res, next,
                                updateArr, deleteArr, updated, data, i);
            }
        );
    });
};

var queryDeleteTechHistory = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var personID = data.person_id;
    var changed_by = req.body.changed_by;
    var query = 'INSERT INTO `technicians_history`' +
                  ' (`technician_id`,`person_id`,`technician_office_id`,`technician_position_id`,`dedication`,'+
                    '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?);';
     var places = [data.id,personID, data.technician_office_id, data.technician_position_id,data.dedication,
                data.valid_from,data.valid_until,
                updated,'D',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'people', personID,
                                'UCIBIO API error updating by team leader person information (delete tech affiliation [personID,office_id]) :', [personID,data.technician_office_id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by team leader person information (delete tech affiliation [personID,office_id]) :', [personID,data.technician_office_id]);
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[], updateArr, deleteArr, updated, i,'technician delete');
            }
        );
    });
};

var queryUpdateScManPeople = function (req, res, next, userCity, labs) {
    var permissionsGeo = getGeoPermissions(req, userCity);
    var permissionsLab = getLabPermissions(req, labs);
    var updateArrPre = req.body.updateOfficePerson;
    var deleteArrPre = req.body.deleteOfficePerson;
    var updated = moment.tz('Europe/Lisbon').format('YYYY-MM-DD HH:mm:ss');
    var updateArr = [];
    var deleteArr = [];
    var hasPermissionGeo;
    var hasPermissionLab;
    for (var ind in updateArrPre) {
        hasPermissionGeo = false;
        hasPermissionLab = false;
        for (var indGeoPerm in permissionsGeo) {
            if (updateArrPre[ind]['person_id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        for (var indLabPerm in permissionsLab) {
            if (updateArrPre[ind]['person_id'] === permissionsLab[indLabPerm]['person_id']
                    && permissionsLab[indLabPerm]['permission']) {
                hasPermissionLab = true;
            }
        }

        if ((req.payload.personID !== updateArrPre[ind]['person_id']
                    && hasPermissionGeo && hasPermissionLab)
             || req.payload.personID === updateArrPre[ind]['person_id']) {
            updateArr.push(updateArrPre[ind]);
        }
    }
    for (var ind in deleteArrPre) {
        hasPermissionGeo = false;
        hasPermissionLab = false;
        for (var indGeoPerm in permissionsGeo) {
            if (deleteArrPre[ind]['person_id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        for (var indLabPerm in permissionsLab) {
            if (deleteArrPre[ind]['person_id'] === permissionsLab[indLabPerm]['person_id']
                    && permissionsLab[indLabPerm]['permission']) {
                hasPermissionLab = true;
            }
        }
        if ((req.payload.personID !== deleteArrPre[ind]['person_id']
                    && hasPermissionGeo && hasPermissionLab)
             || req.payload.personID === deleteArrPre[ind]['person_id']) {
            deleteArr.push(deleteArrPre[ind]);
        }
    }
    var places = [];
    var querySQL = '';
    var data;
    if (updateArr.length > 0) {
        data = updateArr[0];
        return queryUpdateScManInfo(req, res, next, updateArr, deleteArr, updated, data, 0);
    } else if (deleteArr.length > 0) {
        data = deleteArr[0];
        return queryDeleteScMan(req, res, next, updateArr, deleteArr, updated, data, 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0) {
        sendJSONResponse(res, 200, {"status": "No changes or User not authorized", "statusCode": 200});
    } else {
        escapedQuery(querySQL, places, req, res, next);
    }
};

var queryUpdateScManInfo = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    var query;
    var places;
    if (data.science_managers_info_id !== null) {
        query = 'UPDATE `science_managers_info`' +
                ' SET `association_key` = ?,' +
                ' `ORCID` = ?' +
                ' WHERE `id` = ?;';
        places = [data.association_key, data.ORCID, data.science_managers_info_id];
    } else {
        query = 'INSERT INTO `science_managers_info`' +
                ' (person_id, association_key, ORCID)' +
                ' VALUES (?,?,?);';
        places = [data.person_id,data.association_key, data.ORCID];
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                return queryUpdateScMan(req, res, next, updateArr, deleteArr, updated, data, i);
            }
        );
    });
};

var queryUpdateScMan = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var query = 'UPDATE `science_managers`' +
                ' SET `science_manager_position_id` = ?,' +
                ' `dedication` = ?,' +
                ' `valid_from` = ?,' +
                ' `valid_until` = ?' +
                ' WHERE `id` = ?;';
    var places = [data.science_manager_position_id, data.dedication,
            data.valid_from, data.valid_until, data.id];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var peopleOfficeID = data.id;
                return queryUpdateScManHistory(req, res, next, peopleOfficeID,
                                updateArr, deleteArr, updated, data, i);
            }
        );
    });
};

var queryUpdateScManHistory = function (req, res, next, peopleOfficeID,
                                updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var changed_by = req.body.changed_by;
    var personID = data.person_id;
    var query = 'INSERT INTO `science_managers_history`' +
                  ' (`science_managers_id`,`person_id`,`science_manager_office_id`,`science_manager_position_id`,`dedication`,'+
                    '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    var places = [peopleOfficeID,personID, data.science_manager_office_id,
                data.science_manager_position_id,data.dedication,
                data.valid_from,data.valid_until,
                updated,'U',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'people', personID,
                                'UCIBIO API error updating by team leader person information (update sc. man. affiliation [personID,office_id]) :', [personID,data.science_manager_office_id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by team leader person information (update sc. man. affiliation [personID,office_id]) :', [personID,data.science_manager_office_id]);
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[], updateArr, deleteArr, updated, i,'scMan update');
            }
        );
    });
};

var queryDeleteScMan = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    var query = 'DELETE FROM `science_managers`' +
                          ' WHERE id=?;';
    var places = data.id;
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                return queryDeleteScManHistory(req, res, next,
                                updateArr, deleteArr, updated, data, i);
            }
        );
    });
};

var queryDeleteScManHistory = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var personID = data.person_id;
    var changed_by = req.body.changed_by;
    var query = 'INSERT INTO `science_managers_history`' +
                  ' (`science_managers_id`,`person_id`,`science_manager_office_id`,`science_manager_position_id`,`dedication`,'+
                    '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?);';
     var places = [data.id,personID, data.science_manager_office_id, data.science_manager_position_id,data.dedication,
                data.valid_from,data.valid_until,
                updated,'D',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'people', personID,
                                'UCIBIO API error updating by team leader person information (delete sc. man. affiliation [personID,office_id]) :', [personID,data.science_manager_office_id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by team leader person information (delete sc. man. affiliation [personID,office_id]) :', [personID,data.science_manager_office_id]);
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[], updateArr, deleteArr, updated, i,'scMan delete');
            }
        );
    });
};

var queryUpdateAdmPeople = function (req, res, next, userCity, labs) {
    var permissionsGeo = getGeoPermissions(req, userCity);
    var permissionsLab = getLabPermissions(req, labs);
    var updateArrPre = req.body.updateOfficePerson;
    var deleteArrPre = req.body.deleteOfficePerson;
    var updated = moment.tz('Europe/Lisbon').format('YYYY-MM-DD HH:mm:ss');

    var updateArr = [];
    var deleteArr = [];
    var hasPermissionGeo;
    var hasPermissionLab;
    for (var ind in updateArrPre) {
        hasPermissionGeo = false;
        hasPermissionLab = false;
        for (var indGeoPerm in permissionsGeo) {
            if (updateArrPre[ind]['person_id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        for (var indLabPerm in permissionsLab) {
            if (updateArrPre[ind]['person_id'] === permissionsLab[indLabPerm]['person_id']
                    && permissionsLab[indLabPerm]['permission']) {
                hasPermissionLab = true;
            }
        }

        if ((req.payload.personID !== updateArrPre[ind]['person_id']
                    && hasPermissionGeo && hasPermissionLab)
             || req.payload.personID === updateArrPre[ind]['person_id']) {
            updateArr.push(updateArrPre[ind]);
        }
    }
    for (var ind in deleteArrPre) {
        hasPermissionGeo = false;
        hasPermissionLab = false;
        for (var indGeoPerm in permissionsGeo) {
            if (deleteArrPre[ind]['person_id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        for (var indLabPerm in permissionsLab) {
            if (deleteArrPre[ind]['person_id'] === permissionsLab[indLabPerm]['person_id']
                    && permissionsLab[indLabPerm]['permission']) {
                hasPermissionLab = true;
            }
        }
        if ((req.payload.personID !== deleteArrPre[ind]['person_id']
                    && hasPermissionGeo && hasPermissionLab)
             || req.payload.personID === deleteArrPre[ind]['person_id']) {
            deleteArr.push(deleteArrPre[ind]);
        }
    }
    var places = [];
    var querySQL = '';
    var data;
    if (updateArr.length > 0) {
        data = updateArr[0];
        return queryUpdateAdmInfo(req, res, next, updateArr, deleteArr, updated, data, 0);
    }
    if (deleteArr.length > 0) {
        data = deleteArr[0];
        return queryDeleteAdm(req, res, next, updateArr, deleteArr, updated, data, 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0) {
        sendJSONResponse(res, 200, {"status": "No changes or User not authorized", "statusCode": 200});
    } else {
        escapedQuery(querySQL, places, req, res, next);
    }
};

var queryUpdateAdmInfo = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    var query;
    var places;
    if (data.administrative_info_id !== null) {
        query = 'UPDATE `administrative_info`' +
                ' SET `association_key` = ?' +
                ' WHERE `id` = ?;';
        places = [data.association_key, data.administrative_info_id];
    } else {
        query = 'INSERT INTO `administrative_info`' +
                ' (person_id, association_key)' +
                ' VALUES (?,?);';
        places = [data.person_id,data.association_key];
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                return queryUpdateAdm(req, res, next, updateArr, deleteArr, updated, data, i);
            }
        );
    });
};

var queryUpdateAdm = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var query = 'UPDATE `people_administrative_offices`' +
                ' SET `administrative_position_id` = ?,' +
                ' `dedication` = ?,' +
                ' `valid_from` = ?,' +
                ' `valid_until` = ?' +
                ' WHERE `id` = ?;';
    var places = [data.administrative_position_id, data.dedication,
            data.valid_from, data.valid_until, data.id];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var peopleOfficeID = data.id;
                return queryUpdateAdmHistory(req, res, next, peopleOfficeID,
                                updateArr, deleteArr, updated, data, i);
            }
        );
    });
};

var queryUpdateAdmHistory = function (req, res, next, peopleOfficeID,
                                updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var changed_by = req.body.changed_by;
    var personID = data.person_id;
    var query = 'INSERT INTO `people_administrative_offices_history`' +
                  ' (`people_administrative_offices_id`,`person_id`,`administrative_office_id`,`administrative_position_id`,`dedication`,'+
                    '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    var places = [peopleOfficeID,personID, data.administrative_office_id,
                data.administrative_position_id,data.dedication,
                data.valid_from,data.valid_until,
                updated,'U',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'people', personID,
                                'UCIBIO API error updating by team leader person information (update adm. affiliation [personID,office_id]) :', [personID,data.administrative_office_id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by team leader person information (update adm. affiliation [personID,office_id]) :', [personID,data.administrative_office_id]);
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[], updateArr, deleteArr, updated, i,'administrative update');
            }
        );
    });
};

var queryDeleteAdm = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    var query = 'DELETE FROM `people_administrative_offices`' +
                          ' WHERE id=?;';
    var places = data.id;
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                return queryDeleteAdmHistory(req, res, next,
                                updateArr, deleteArr, updated, data, i);
            }
        );
    });
};

var queryDeleteAdmHistory = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var personID = data.person_id;
    var changed_by = req.body.changed_by;
    var query = 'INSERT INTO `people_administrative_offices_history`' +
                  ' (`people_administrative_offices_id`,`person_id`,`administrative_office_id`,`administrative_position_id`,`dedication`,'+
                    '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?);';
     var places = [data.id,personID, data.administrative_office_id, data.administrative_position_id,data.dedication,
                data.valid_from,data.valid_until,
                updated,'D',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'people', personID,
                                'UCIBIO API error updating by team leader person information (delete adm. affiliation [personID,office_id]) :', [personID,data.administrative_office_id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by team leader person information (delete adm. affiliation [personID,office_id]) :', [personID,data.administrative_office_id]);
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[], updateArr, deleteArr, updated, i,'administrative delete');
            }
        );
    });
};

var queryPreRegisterAddUser = function (req,res,next) {
    var queryUser = 'INSERT INTO `users` (`username`,`password`,`status`,`created`) ' +
                    'VALUES (?,?,?,?);';
    var username = req.body.username;
    var password = make_password(30,'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    var hashedPassword = userModule.hashPassword(password);
    var stat = 40;
    var dateNow = moment.tz('Europe/Lisbon').format('YYYY-MM-DD HH:mm:ss');
    var places = [username,hashedPassword,stat,dateNow];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(queryUser,places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var userID = resQuery.insertId;
                return queryPreRegisterAddPerson(req, res, next, userID, dateNow, password);
            }
        );
    });
};

var queryPreRegisterAddPerson = function (req, res, next, userID, created, password) {
    var changed_by = req.body.changed_by;
    var query = 'INSERT INTO `people` (`user_id`,`active_from`,`status`) ' +
                    'VALUES (?,?,?);';
    var active_from = momentToDate(req.body.earliest_date);
    var stat = 2; // this is the status of pre-registered people
    var places = [userID,active_from,stat];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var personID = resQuery.insertId;
                return queryPreRegisterAddPersonHistory(req, res, next, userID, personID, active_from,stat, created, changed_by,password);
            }
        );
    });
};

var queryPreRegisterAddPersonHistory = function (req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password) {
    var query = 'INSERT INTO `people_history` ' +
                    '(`person_id`,`user_id`,' +
                     '`active_from`,`status`,`created`,`operation`,`changed_by`) ' +
                    'VALUES (?,?,?,?,?,?,?);';
    var places = [personID,userID,
                  active_from,stat,created,'C',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var type;
                if (req.body.affiliations[0].data.id !== null) {
                    type = req.body.affiliations[0].data.type;
                    if (type === 'lab') {
                        return queryPreRegisterAddLab(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,0);
                    } else if (type === 'technician') {
                        return queryPreRegisterAddTechnician(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,0);
                    } else if (type === 'scienceManager') {
                        return queryPreRegisterAddScienceManager(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,0);
                    } else if (type === 'administrative') {
                        return queryPreRegisterAddAdministrative(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,0);
                    }
                } else {
                    return queryPreRegisterInstitutionCity(req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password);
                }
            }
        );
    });
};

var queryPreRegisterAddRole = function(req, res, next, userID, personID, role, peopleOfficeID,
                                      active_from,stat, created, changed_by,password,i) {
    var query = 'INSERT INTO `people_roles`' +
                      ' (`person_id`,`role_id`)' +
                      ' SELECT ?,? FROM DUAL' +
                      ' WHERE NOT EXISTS (' +
                      ' SELECT * FROM `people_roles` WHERE person_id = ? AND role_id = ?);';
    var placeholders = [personID,role,personID,role];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, placeholders,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                if (role === 1) {
                    return queryPreRegisterAddLabHistory(req, res, next,userID, personID, peopleOfficeID,
                                          active_from,stat, created, changed_by,password,i);
                }
                if (role === 2) {
                    return queryPreRegisterAddTechnicianHistory(req, res, next,userID, personID, peopleOfficeID,
                                          active_from,stat, created, changed_by,password,i);
                }
                if (role === 3) {
                    return queryPreRegisterAddScienceManagerHistory(req, res, next,userID, personID, peopleOfficeID,
                                          active_from,stat, created, changed_by,password,i);
                }
                if (role === 4) {
                    return queryPreRegisterAddAdministrativeHistory(req, res, next,userID, personID, peopleOfficeID,
                                          active_from,stat, created, changed_by,password,i);
                }
            }
        );
    });

};

var queryPreRegisterAddLab = function (req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password,i) {
    var lab_id = req.body.affiliations[i].data.id;
    var dedication = req.body.affiliations[i].dedication;
    var lab_position_id = req.body.affiliations[i].lab_position_id;
    var start = req.body.affiliations[i].start;
    var end = req.body.affiliations[i].end;
    var query = 'INSERT INTO `people_labs` (`person_id`,`lab_id`,`lab_position_id`,`dedication`,`valid_from`,`valid_until`) ' +
                    'VALUES (?,?,?,?,?,?);';
    var placeholders = [personID, lab_id, lab_position_id,
                dedication, momentToDate(start), momentToDate(end)];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, placeholders,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var peopleOfficeID = resQuery.insertId;
                return queryPreRegisterAddRole(req, res, next,userID, personID, 1, peopleOfficeID,
                                          active_from,stat, created, changed_by,password,i);
            }
        );
    });
};

var queryPreRegisterAddLabHistory = function (req, res, next, userID, personID, peopleOfficeID,
                                      active_from,stat, created, changed_by,password,i) {
    var lab_id = req.body.affiliations[i].data.id;
    var dedication = req.body.affiliations[i].dedication;
    var lab_position_id = req.body.affiliations[i].lab_position_id;
    var start = req.body.affiliations[i].start;
    var end = req.body.affiliations[i].end;
    var query = 'INSERT INTO `people_labs_history`' +
              ' (`people_labs_id`,`person_id`,`lab_id`,`lab_position_id`,`dedication`,'+
                '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
              ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    var placeholders = [peopleOfficeID,personID, lab_id, lab_position_id,dedication,
                momentToDate(start),momentToDate(end),
                created,'C',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, placeholders,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                if (i + 1 < req.body.affiliations.length) {
                    var type = req.body.affiliations[i+1].data.type;
                    if (type === 'lab') {
                        return queryPreRegisterAddLab(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    } else if (type === 'technician') {
                        return queryPreRegisterAddTechnician(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    } else if (type === 'scienceManager') {
                        return queryPreRegisterAddScienceManager(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    } else if (type === 'administrative') {
                        return queryPreRegisterAddAdministrative(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    }
                } else {
                    return queryPreRegisterInstitutionCity(req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password);
                }
            }
        );
    });
};

var queryPreRegisterAddTechnician = function (req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password,i) {
    var office_id = req.body.affiliations[i].data.id;
    var dedication = req.body.affiliations[i].dedication;
    var office_position_id = req.body.affiliations[i].tech_position_id;
    var start = req.body.affiliations[i].start;
    var end = req.body.affiliations[i].end;
    var query = 'INSERT INTO `technicians`' +
                 ' (`person_id`,`technician_office_id`,`technician_position_id`,`dedication`,`valid_from`,`valid_until`)' +
                 ' VALUES (?,?,?,?,?,?);';
    var placeholders = [personID, office_id, office_position_id,
                dedication, momentToDate(start), momentToDate(end)];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, placeholders,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var peopleOfficeID = resQuery.insertId;
                return queryPreRegisterAddRole(req, res, next,userID, personID, 2, peopleOfficeID,
                                          active_from,stat, created, changed_by,password,i);
            }
        );
    });
};

var queryPreRegisterAddTechnicianHistory = function (req, res, next, userID, personID, peopleOfficeID,
                                      active_from,stat, created, changed_by,password,i) {
    var office_id = req.body.affiliations[i].data.id;
    var dedication = req.body.affiliations[i].dedication;
    var office_position_id = req.body.affiliations[i].tech_position_id;
    var start = req.body.affiliations[i].start;
    var end = req.body.affiliations[i].end;
    var query = 'INSERT INTO `technicians_history`' +
                  ' (`technician_id`,`person_id`,`technician_office_id`,`technician_position_id`,`dedication`,'+
                    '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    var placeholders = [peopleOfficeID,personID, office_id, office_position_id,dedication,
                momentToDate(start),momentToDate(end),
                created,'C',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, placeholders,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                if (i + 1 < req.body.affiliations.length) {
                    var type = req.body.affiliations[i+1].data.type;
                    if (type === 'lab') {
                        return queryPreRegisterAddLab(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    } else if (type === 'technician') {
                        return queryPreRegisterAddTechnician(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    } else if (type === 'scienceManager') {
                        return queryPreRegisterAddScienceManager(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    } else if (type === 'administrative') {
                        return queryPreRegisterAddAdministrative(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    }
                } else {
                    return queryPreRegisterInstitutionCity(req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password);
                }
            }
        );
    });
};

var queryPreRegisterAddScienceManager = function (req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password,i) {
    var office_id = req.body.affiliations[i].data.id;
    var dedication = req.body.affiliations[i].dedication;
    var office_position_id = req.body.affiliations[i].sc_man_position_id;
    var start = req.body.affiliations[i].start;
    var end = req.body.affiliations[i].end;
    var query = 'INSERT INTO `science_managers`' +
                 ' (`person_id`,`science_manager_office_id`,`science_manager_position_id`,`dedication`,`valid_from`,`valid_until`)' +
                 ' VALUES (?,?,?,?,?,?);';
    var placeholders = [personID, office_id, office_position_id,
                dedication, momentToDate(start), momentToDate(end)];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, placeholders,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var peopleOfficeID = resQuery.insertId;
                return queryPreRegisterAddRole(req, res, next,userID, personID, 3, peopleOfficeID,
                                          active_from,stat, created, changed_by,password,i);
            }
        );
    });
};

var queryPreRegisterAddScienceManagerHistory = function (req, res, next, userID, personID, peopleOfficeID,
                                      active_from,stat, created, changed_by,password,i) {
    var office_id = req.body.affiliations[i].data.id;
    var dedication = req.body.affiliations[i].dedication;
    var office_position_id = req.body.affiliations[i].sc_man_position_id;
    var start = req.body.affiliations[i].start;
    var end = req.body.affiliations[i].end;
    var query = 'INSERT INTO `science_managers_history`' +
                  ' (`science_managers_id`,`person_id`,`science_manager_office_id`,`science_manager_position_id`,`dedication`,'+
                    '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    var placeholders = [peopleOfficeID,personID, office_id, office_position_id,dedication,
                momentToDate(start),momentToDate(end),
                created,'C',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, placeholders,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                if (i + 1 < req.body.affiliations.length) {
                    var type = req.body.affiliations[i+1].data.type;
                    if (type === 'lab') {
                        return queryPreRegisterAddLab(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    } else if (type === 'technician') {
                        return queryPreRegisterAddTechnician(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    } else if (type === 'scienceManager') {
                        return queryPreRegisterAddScienceManager(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    } else if (type === 'administrative') {
                        return queryPreRegisterAddAdministrative(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    }
                } else {
                    return queryPreRegisterInstitutionCity(req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password);
                }
            }
        );
    });
};

var queryPreRegisterAddAdministrative = function (req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password,i) {
    var office_id = req.body.affiliations[i].data.id;
    var dedication = req.body.affiliations[i].dedication;
    var office_position_id = req.body.affiliations[i].adm_position_id;
    var start = req.body.affiliations[i].start;
    var end = req.body.affiliations[i].end;
    var query = 'INSERT INTO `people_administrative_offices` (`person_id`,`administrative_office_id`,`administrative_position_id`,`dedication`,`valid_from`,`valid_until`) ' +
                    'VALUES (?,?,?,?,?,?);';
    var placeholders = [personID, office_id, office_position_id,
                dedication, momentToDate(start), momentToDate(end)];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, placeholders,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var peopleOfficeID = resQuery.insertId;
                return queryPreRegisterAddRole(req, res, next,userID, personID, 4, peopleOfficeID,
                                          active_from,stat, created, changed_by,password,i);
            }
        );
    });
};

var queryPreRegisterAddAdministrativeHistory = function (req, res, next, userID, personID, peopleOfficeID,
                                      active_from,stat, created, changed_by,password,i) {
    var office_id = req.body.affiliations[i].data.id;
    var dedication = req.body.affiliations[i].dedication;
    var office_position_id = req.body.affiliations[i].adm_position_id;
    var start = req.body.affiliations[i].start;
    var end = req.body.affiliations[i].end;
    var query = 'INSERT INTO `people_administrative_offices_history`' +
                ' (`people_administrative_offices_id`,`person_id`,`administrative_office_id`,`administrative_position_id`,`dedication`,'+
                  '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    var placeholders = [peopleOfficeID,personID, office_id, office_position_id,dedication,
                        momentToDate(start),momentToDate(end),
                        created,'C',changed_by];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, placeholders,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                if (i + 1 < req.body.affiliations.length) {
                    var type = req.body.affiliations[i+1].data.type;
                    if (type === 'lab') {
                        return queryPreRegisterAddLab(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    } else if (type === 'technician') {
                        return queryPreRegisterAddTechnician(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    } else if (type === 'scienceManager') {
                        return queryPreRegisterAddScienceManager(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    } else if (type === 'administrative') {
                        return queryPreRegisterAddAdministrative(req,res,next,userID,personID,
                                        active_from, stat, created,changed_by,password,i+1);
                    }
                } else {
                    return queryPreRegisterInstitutionCity(req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password);
                }
            }
        );
    });
};

var queryPreRegisterInstitutionCity = function (req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password) {
    var query = 'INSERT INTO `people_institution_city` (`person_id`,`city_id`, `valid_from`) ' +
                'VALUES (?,?,?);';
    var placeholders = [personID, req.body.institution_city.id,
            momentToDate(req.body.earliest_date)];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, placeholders,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                return queryPreRegisterPersonalEmails(req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password);
            }
        );
    });
};

var queryPreRegisterPersonalEmails = function (req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password) {
    var query = 'INSERT INTO `personal_emails` (`person_id`,`email`) ' +
                'VALUES (?,?);';
    var placeholders = [personID, req.body.personal_email];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query, placeholders,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                return sendEmailsToUsers(req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password);
            }
        );
    });
};


var sendEmailsToUsers = function (req, res, next, userID, personID,
                                      active_from,stat, created, changed_by,password) {
    if (process.env.NODE_ENV !== 'production') {
        console.log('https://laqv-ucibio.info/pre-register/'+ req.body.username +'/' + password);
    }
    if (process.env.NODE_ENV === 'production') {
        var recipients;
        if (req.body.institution_city.city === 'Lisboa') {
            recipients = req.body.personal_email;
        } else if (req.body.institution_city.city === 'Porto') {
            recipients = req.body.personal_email;
        }
        let mailOptions = {
            from: '"Admin" <admin@laqv-ucibio.info>', // sender address
            to: recipients, // list of receivers (comma-separated)
            subject: 'User "' + req.body.username + '" was pre-registered at laqv-ucibio.info', // Subject line
            text: 'Hi,\n\n' +
                  'You were pre-registered on laqv-ucibio.info.\n\n' +
                  'Please click on the following link to continue pre-registration:\n\n' +
                  'https://laqv-ucibio.info/pre-register/'+ req.body.username +
                        '/' + password +'\n\n' +
                  'Follow instructions and after filling all required information, press "Submit" button and wait for validation by a manager.\n' +
                  'Upon validation you will be notified, and then you can login to:\n\n' +
                  'https://laqv-ucibio.info\n\n' +
                  'Best regards,\nAdmin',
        };
        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message %s sent: %s', info.messageId, info.response);
        });
    }
    sendJSONResponse(res, 200, {"status": "All done!", "statusCode": 200});
            return;
};


/**************************** SQL Generators **********************************/
/* TODO: check if this is really needed */
module.exports.listLabData = function (req, res, next) {

};


module.exports.listAllPeople = function (req, res, next) {
    var querySQL = 'SELECT people.id, people.name, people.colloquial_name,' +
                   ' people.active_from, people.active_until,' +
                   ' emails.email,' +
                   ' people_labs.sort_order, people_labs.valid_from AS lab_start, people_labs.valid_until AS lab_end,' +
                   ' labs.id AS lab_id, labs.name AS lab_name,' +
                   ' labs_groups.valid_from AS labs_groups_valid_from, labs_groups.valid_until AS labs_groups_valid_until,' +
                   ' groups.id AS group_id, groups.name AS group_name,' +
                   ' units.id AS unit_id, units.short_name AS unit_name,' +
                   ' lab_positions.id AS lab_position_id, lab_positions.name_en AS lab_position_name_en, lab_positions.name_pt  AS lab_position_name_pt,' +
                   ' technicians.id AS technician_id, technicians.technician_office_id, technician_offices.name_en AS technician_office_name,' +
                   ' technicians.valid_from AS technician_start, technicians.valid_until AS technician_end,' +
                   ' technicians_units.unit_id AS technician_unit_id, technician_units.short_name AS technician_unit_name,' +
                   ' technicians.technician_position_id, technician_positions.name_en AS technician_position_name_en, technician_positions.name_pt AS technician_position_name_pt,' +
                   ' science_managers.id AS science_manager_id, science_managers.science_manager_office_id, science_manager_offices.name_en AS science_manager_office_name,' +
                   ' science_managers.valid_from AS science_manager_start, science_managers.valid_until AS science_manager_end,' +
                   ' science_managers_units.unit_id AS science_manager_unit_id, science_manager_units.short_name AS science_manager_unit_name,' +
                   ' science_managers.science_manager_position_id, science_manager_positions.name_en AS science_manager_position_name_en, science_manager_positions.name_pt AS science_manager_position_name_pt,' +
                   ' people_administrative_offices.id AS administrative_id, people_administrative_offices.administrative_office_id, administrative_offices.name_en AS administrative_office_name,' +
                   ' people_administrative_offices.valid_from AS administrative_start, people_administrative_offices.valid_until AS administrative_end,' +
                   ' people_administrative_units.unit_id AS administrative_unit_id, administrative_units.short_name AS administrative_unit_name,' +
                   ' people_administrative_offices.administrative_position_id, administrative_positions.name_en AS administrative_position_name_en, administrative_positions.name_pt AS administrative_position_name_pt' +
                  ' FROM people' +
                  ' LEFT JOIN emails ON people.id = emails.person_id' +
                  ' LEFT JOIN people_labs ON people.id = people_labs.person_id' +
                  ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                  ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                  ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                  ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                  ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                  ' LEFT JOIN lab_positions ON lab_positions.id = people_labs.lab_position_id' +
                  ' LEFT JOIN technicians ON technicians.person_id = people.id' +
                  ' LEFT JOIN technician_offices ON technician_offices.id = technicians.technician_office_id' +
                  ' LEFT JOIN technicians_units ON technicians_units.technician_id = technicians.id' +
                  ' LEFT JOIN units AS technician_units ON technician_units.id = technicians_units.unit_id' +
                  ' LEFT JOIN technician_positions ON technician_positions.id = technicians.technician_position_id' +
                  ' LEFT JOIN science_managers ON science_managers.person_id = people.id' +
                  ' LEFT JOIN science_manager_offices ON science_manager_offices.id = science_managers.science_manager_office_id' +
                  ' LEFT JOIN science_managers_units ON science_managers_units.science_manager_id = science_managers.id' +
                  ' LEFT JOIN units AS science_manager_units ON science_manager_units.id = science_managers_units.unit_id' +
                  ' LEFT JOIN science_manager_positions ON science_manager_positions.id = science_managers.science_manager_position_id' +
                  ' LEFT JOIN people_administrative_offices ON people_administrative_offices.person_id = people.id' +
                  ' LEFT JOIN administrative_offices ON administrative_offices.id = people_administrative_offices.administrative_office_id' +
                  ' LEFT JOIN people_administrative_units ON people_administrative_units.administrative_id = people_administrative_offices.id' +
                  ' LEFT JOIN units AS administrative_units ON administrative_units.id = people_administrative_units.unit_id' +
                  ' LEFT JOIN administrative_positions ON administrative_positions.id = people_administrative_offices.administrative_position_id' +
                  ' WHERE people.status = 1' +
                  ' ORDER BY people.colloquial_name;';
    escapedQueryPersonSearch(querySQL, req, res, next);
};

module.exports.listLabPeopleData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            var teamID = req.params.teamID;
            var groupID = req.params.groupID;
            var places = [];
            var querySQL = 'SELECT people_labs.*, people.name AS person_name, ' +
                           ' researchers.id AS researchers_id,researchers.association_key, researchers.ORCID,' +
                           ' labs.started AS lab_opened, labs.finished AS lab_closed,' +
                           ' labs_groups.valid_from AS labs_groups_valid_from, labs_groups.valid_until AS labs_groups_valid_until,' +
                           ' groups.id AS group_id, groups.name AS group_name' +
                           ' FROM people_labs' +
                           ' LEFT JOIN people ON people_labs.person_id = people.id' +
                           ' LEFT JOIN researchers ON researchers.person_id = people_labs.person_id' +
                           ' LEFT JOIN labs ON people_labs.lab_id = labs.id' +
                           ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                           ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                           ' WHERE labs_groups.group_id = ? AND labs_groups.lab_id = ? AND people.status = 1' +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            places.push(groupID, teamID);
            pool.getConnection(function(err, connection) {
                if (err) {
                    sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
                    return;
                }
                connection.query(querySQL,places,
                    function (err, rowsQuery) {
                        // And done with the connection.
                        connection.release();
                        if (err) {
                            sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                            return;
                        }
                        rowsQuery = filterLabTimes(rowsQuery);
                        sendJSONResponse(res, 200,
                            {"status": "success", "statusCode": 200, "count": rowsQuery.length,
                             "result" : rowsQuery});
                        return;
                    }
                );
            });
        }
    );
};

module.exports.listTechPeopleData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            var teamID = req.params.teamID;
            var places = [];
            var querySQL = 'SELECT technicians.*, people.name AS person_name, ' +
                           ' technicians_info.id AS technicians_info_id, technicians_info.association_key, technicians_info.ORCID' +
                           ' FROM technicians' +
                           ' LEFT JOIN people ON technicians.person_id = people.id' +
                           ' LEFT JOIN technicians_info ON technicians_info.person_id = technicians.person_id' +
                           ' WHERE technician_office_id = ? AND people.status = 1' +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            places.push(teamID);
            escapedQuery(querySQL, places, req, res, next);
        }
    );
};

module.exports.listScManPeopleData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            var teamID = req.params.teamID;
            var places = [];
            var querySQL = 'SELECT science_managers.*, people.name AS person_name, ' +
                           ' science_managers_info.id AS science_managers_info_id, science_managers_info.association_key, science_managers_info.ORCID' +
                           ' FROM science_managers' +
                           ' LEFT JOIN people ON science_managers.person_id = people.id' +
                           ' LEFT JOIN science_managers_info ON science_managers_info.person_id = science_managers.person_id' +
                           ' WHERE science_manager_office_id = ? AND people.status = 1' +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            places.push(teamID);
            escapedQuery(querySQL, places, req, res, next);
        }
    );
};

module.exports.listAdmPeopleData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            var teamID = req.params.teamID;
            var places = [];
            var querySQL = 'SELECT people_administrative_offices.*, people.name AS person_name, ' +
                           ' administrative_info.id AS administrative_info_id, administrative_info.association_key' +
                           ' FROM people_administrative_offices' +
                           ' LEFT JOIN people ON people_administrative_offices.person_id = people.id' +
                           ' LEFT JOIN administrative_info ON administrative_info.person_id = people_administrative_offices.person_id' +
                           ' WHERE administrative_office_id = ? AND people.status = 1' +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            places.push(teamID);
            escapedQuery(querySQL, places, req, res, next);
        }
    );
};

module.exports.updateLabPeople = function (req, res, next) {
    // managers can change data based on their geographical location
    // lab leaders (or their lab managers) can only change
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, getTeam);
        }
    );
};

module.exports.updateTechPeople = function (req, res, next) {
    // managers can change data based on their geographical location
    // lab leaders (or their lab managers) can only change
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, getTechTeam, 'technician');
        }
    );
};

module.exports.updateScManPeople = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, getScManTeam, 'scienceManager');
        }
    );
};

module.exports.updateAdmPeople = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, getAdmTeam, 'administrative');
        }
    );
};

module.exports.preRegister = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryPreRegisterAddUser(req,res,next);
        }
    );
};
