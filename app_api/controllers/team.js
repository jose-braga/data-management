var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
const nodemailer = require('../controllers/emailer');
let transporter = nodemailer.transporter;
var userModule = require('../models/users');

var MANAGER_PERMISSION_LEVEL = 15;

/**************************** Utility Functions *******************************/
var geographicAccess = function (stat) {
    var accessTable = {
        0: [1,2],   // admin
        5: [1,2],   // super-manager
        10: [1],    // Lisbon manager
        15: [2],    // Porto manager
        20: [1,2],  // unit level (only a few functionalities)
        30: [1,2],  // team level
        40: [1,2],
        1000: []    // no access
    };
    return accessTable[stat];
};

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
    var citiesPermissions = geographicAccess(requesterStatus);
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

                if (moment(resQuery[0].active_from).isSame(minDate)) {
                    sendJSONResponse(res, 200, {"status": "OK!", "statusCode": 200});
                    return;
                } else {
                    return queryPeopleUpdateStartDate(req,res,next, personID, resQuery[0],minDate, updateArr, deleteArr, updated,i,type);
                }
            }
        );
    });
};

var queryPeopleUpdateStartDate = function (req,res,next, personID, resQuery, minDate, updateArr, deleteArr, updated, i, type) {
    var querySQL = 'UPDATE `people`' +
                   ' SET `active_from` = ?' +
                   ' WHERE `id` = ?;';
    var places = [momentToDate(minDate),personID];
    querySQL = querySQL + 'INSERT INTO `people_history`' +
                   ' (`person_id`,`user_id`,`name`,`colloquial_name`,`birth_date`,`gender`,' +
                     '`active_from`,`active_until`,`status`,`updated`,`operation`,`changed_by`)' +
                   ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(personID,resQuery.user_id,resQuery.name,resQuery.colloquial_name,
                resQuery.birth_date,resQuery.gender,
                momentToDate(minDate),resQuery.active_until,1,updated,'U',req.body.changed_by);
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
                var data;
                if (type.indexOf('update') !== -1) {
                    if (i + 1 < updateArr.length) {
                        data = updateArr[i+1];
                        if (type.indexOf('lab') !== -1) {
                            return queryUpdateLab(req, res, next, updateArr, deleteArr, updated, data, i+1);
                        }
                        if (type.indexOf('technician') !== -1) {
                            return queryUpdateTech(req, res, next, updateArr, deleteArr, updated, data, i+1);
                        }
                        if (type.indexOf('scMan') !== -1) {
                            return queryUpdateScMan(req, res, next, updateArr, deleteArr, updated, data, i+1);
                        }
                        if (type.indexOf('administrative') !== -1) {
                            return queryUpdateAdm(req, res, next, updateArr, deleteArr, updated, data, i+1);
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
        return queryUpdateLab(req, res, next, updateArr, deleteArr, updated, data, 0);
    } else if (deleteArr.length > 0) {
        data = deleteArr[0];
        return queryDeleteLab(req, res, next, updateArr, deleteArr, updated, data, 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0) {
        sendJSONResponse(res, 200, {"status": "No changes or User not authorized", "statusCode": 200});
    } else {
        // TODO: think if it is useful to add a callback for deleting roles when
        // the person doesn't not have any lab affiliations
        escapedQuery(querySQL, places, req, res, next);
    }
};

var queryUpdateLab = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var query = 'UPDATE `people_labs`' +
                ' SET `lab_position_id` = ?,' +
                ' `dedication` = ?,' +
                ' `valid_from` = ?,' +
                ' `valid_until` = ?' +
                ' WHERE `id` = ?;';
    var places = [data.lab_position_id, data.dedication,
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
    var query = 'INSERT INTO `people_labs_history`' +
                  ' (`people_labs_id`,`person_id`,`lab_id`,`lab_position_id`,`dedication`,'+
                    '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    var places = [peopleOfficeID,personID, data.lab_id,
                data.lab_position_id,data.dedication,
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
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[], updateArr, deleteArr, updated, i,'lab update');
            }
        );
    });
};

var queryDeleteLab = function (req, res, next,
                                 updateArr, deleteArr, updated, data, i) {
    var query = 'DELETE FROM `people_labs`' +
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
        return queryUpdateTech(req, res, next, updateArr, deleteArr, updated, data, 0);
    } else if (deleteArr.length > 0) {
        data = deleteArr[0];
        return queryDeleteTech(req, res, next, updateArr, deleteArr, updated, data, 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0) {
        sendJSONResponse(res, 200, {"status": "No changes or User not authorized", "statusCode": 200});
    } else {
        // TODO: think if it is useful to add a callback for deleting roles when
        // the person doesn't not have any lab affiliations
        escapedQuery(querySQL, places, req, res, next);
    }
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
        return queryUpdateScMan(req, res, next, updateArr, deleteArr, updated, data, 0);
    } else if (deleteArr.length > 0) {
        data = deleteArr[0];
        return queryDeleteScMan(req, res, next, updateArr, deleteArr, updated, data, 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0) {
        sendJSONResponse(res, 200, {"status": "No changes or User not authorized", "statusCode": 200});
    } else {
        // TODO: think if it is useful to add a callback for deleting roles when
        // the person doesn't not have any lab affiliations
        escapedQuery(querySQL, places, req, res, next);
    }
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
        return queryUpdateAdm(req, res, next, updateArr, deleteArr, updated, data, 0);
    }
    if (deleteArr.length > 0) {
        data = deleteArr[0];
        return queryDeleteAdm(req, res, next, updateArr, deleteArr, updated, data, 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0) {
        sendJSONResponse(res, 200, {"status": "No changes or User not authorized", "statusCode": 200});
    } else {
        // TODO: think if it is useful to add a callback for deleting roles when
        // the person doesn't not have any lab affiliations
        escapedQuery(querySQL, places, req, res, next);
    }
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
    query = query + 'INSERT INTO `people_roles`' +
                          ' (`person_id`,`role_id`)' +
                          ' SELECT ?,? FROM DUAL' +
                          ' WHERE NOT EXISTS (' +
                          'SELECT * FROM `people_roles` WHERE person_id = ? AND role_id = ?);';
    placeholders.push(personID,1,personID,1);
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
                return queryPreRegisterAddLabHistory(req, res, next,userID, personID, peopleOfficeID,
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
    query = query + 'INSERT INTO `people_roles`' +
                          ' (`person_id`,`role_id`)' +
                          ' SELECT ?,? FROM DUAL' +
                          ' WHERE NOT EXISTS (' +
                          'SELECT * FROM `people_roles` WHERE person_id = ? AND role_id = ?);';
    placeholders.push(personID,2,personID,2);
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
                return queryPreRegisterAddTechnicianHistory(req, res, next, userID, personID, peopleOfficeID,
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
    query = query + 'INSERT INTO `people_roles`' +
                          ' (`person_id`,`role_id`)' +
                          ' SELECT ?,? FROM DUAL' +
                          ' WHERE NOT EXISTS (' +
                          'SELECT * FROM `people_roles` WHERE person_id = ? AND role_id = ?);';
    placeholders.push(personID,3,personID,3);
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
                return queryPreRegisterAddScienceManagerHistory(req, res, next, userID, personID, peopleOfficeID,
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
    query = query + 'INSERT INTO `people_roles`' +
                          ' (`person_id`,`role_id`)' +
                          ' SELECT ?,? FROM DUAL' +
                          ' WHERE NOT EXISTS (' +
                          'SELECT * FROM `people_roles` WHERE person_id = ? AND role_id = ?);';
    placeholders.push(personID,4,personID,4);
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
                return queryPreRegisterAddAdministrativeHistory(req, res, next, userID, personID, peopleOfficeID,
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
    console.log('https://laqv-ucibio.info/pre-register/'+ req.body.username +
                        '/' + password)
    if (process.env.NODE_ENV === 'production') {
        var recipients;
        if (req.body.institution_city.city === 'Lisboa') {
            recipients = req.body.personal_email;
        } else if (req.body.institution_city.city === 'Porto') {
            recipients = req.body.personal_email; // TODO: Change this!!!!
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
module.exports.listLabData = function (req, res, next) {

};

module.exports.listLabPeopleData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            var teamID = req.params.teamID;
            var places = [];
            var querySQL = 'SELECT people_labs.*, people.name AS person_name ' +
                           ' FROM people_labs' +
                           ' LEFT JOIN people ON people_labs.person_id = people.id' +
                           ' WHERE lab_id = ? AND people.status = 1' +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            places.push(teamID);
            escapedQuery(querySQL, places, req, res, next);
        }
    );
};

module.exports.listTechPeopleData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            var teamID = req.params.teamID;
            var places = [];
            var querySQL = 'SELECT technicians.*, people.name AS person_name ' +
                           ' FROM technicians' +
                           ' LEFT JOIN people ON technicians.person_id = people.id' +
                           ' WHERE technician_office_id = ? AND people.status = 1' +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            places.push(teamID);
            escapedQuery(querySQL, places, req, res, next);
        }
    );
};

module.exports.listScManPeopleData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            var teamID = req.params.teamID;
            var places = [];
            var querySQL = 'SELECT science_managers.*, people.name AS person_name ' +
                           ' FROM science_managers' +
                           ' LEFT JOIN people ON science_managers.person_id = people.id' +
                           ' WHERE science_manager_office_id = ? AND people.status = 1' +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            places.push(teamID);
            escapedQuery(querySQL, places, req, res, next);
        }
    );
};

module.exports.listAdmPeopleData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            var teamID = req.params.teamID;
            var places = [];
            var querySQL = 'SELECT people_administrative_offices.*, people.name AS person_name ' +
                           ' FROM people_administrative_offices' +
                           ' LEFT JOIN people ON people_administrative_offices.person_id = people.id' +
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
    getUser(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, getTeam);
        }
    );
};

module.exports.updateTechPeople = function (req, res, next) {
    // managers can change data based on their geographical location
    // lab leaders (or their lab managers) can only change
    getUser(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, getTechTeam, 'technician');
        }
    );
};

module.exports.updateScManPeople = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, getScManTeam, 'scienceManager');
        }
    );
};

module.exports.updateAdmPeople = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, getAdmTeam, 'administrative');
        }
    );
};

module.exports.preRegister = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            queryPreRegisterAddUser(req,res,next);
        }
    );
};
