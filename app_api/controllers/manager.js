var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
const nodemailer = require('../controllers/emailer');
let transporter = nodemailer.transporter;
var userModule = require('../models/users');

/**************************** Utility Functions *******************************/

var rolesObj = {
    'scientific': 1,
    'technical': 2,
    'scienceManagement': 3,
    'administrative': 4
};

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

var getLocation = function(req, res, next, callback) {
    // gets cities associated with resources (person in lab) to be altered
    var personIDs = [];
    var arr = req.body.deleteNeverMember;
    for (var ind in arr) {
        personIDs.push(arr[ind]);
    }
    arr = req.body.updateLabPerson;
    for (var ind in arr) {
        personIDs.push(arr[ind]['person_id']);
    }
    arr = req.body.updateTechPerson;
    for (var ind in arr) {
        personIDs.push(arr[ind]['person_id']);
    }
    arr = req.body.updateManagePerson;
    for (var ind in arr) {
        personIDs.push(arr[ind]['person_id']);
    }
    arr = req.body.updateAdmPerson;
    for (var ind in arr) {
        personIDs.push(arr[ind]['person_id']);
    }


    // get geographical location of resource
    var queryLocation = 'SELECT person_id,city_id FROM people_institution_city WHERE';
    for (var ind in personIDs) {
        queryLocation = queryLocation + ' person_id = ?';
        if (ind < personIDs.length - 1) {
            queryLocation = queryLocation + ' OR';
        }
    }
    if (personIDs.length > 0) {
        pool.getConnection(function(err, connection) {
            if (err) {
                sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
                return;
            }
            // Use the connection
            connection.query( queryLocation, personIDs, function(err, userCity) {
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                return callback(req,res,next, personIDs, userCity);
            });
        });
    } else {
        //sendJSONResponse(res, 304, {"status": "no changes or empty query", "statusCode": 304});
        //return;
        return callback(req,res,next, personIDs, []);
    }

};

var sendJSONResponse = function(res, status, content) {
    res.status(status);
    res.json(content);
};

var processAllPeopleRows = function (rows) {
    var newRows = [];
    var counter = 0;
    for (var row in rows) {
        var rowObj = {
                        "row_id": null,
                        "person_id": null,
                        "person_name": null,
                        "people_labs_id": null,
                        "lab_id": null,
                        "group_id": null,
                        "unit_id": null,
                        "position_id": null,
                        "dedication": null,
                        "valid_from": null,
                        "valid_until": null
                     };
        rowObj['row_id'] = counter; counter++;
        rowObj['person_id'] = rows[row]['person_id'];
        rowObj['person_name'] = rows[row]['person_name'];
        rowObj['people_labs_id'] = rows[row]['people_labs_id'];
        rowObj['lab_id'] = rows[row]['lab_id'];
        rowObj['group_id'] = rows[row]['lab_group_id'];
        rowObj['unit_id'] = rows[row]['lab_unit_id'];
        rowObj['position_id'] = rows[row]['lab_position_id'];
        rowObj['dedication'] = rows[row]['lab_dedication'];
        rowObj['valid_from'] = rows[row]['lab_valid_from'];
        rowObj['valid_until'] = rows[row]['lab_valid_until'];
        newRows.push(rowObj);
    }
    return newRows;
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

var escapedQuery = function(querySQL, place, req, res, next, sh) {
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
            if (rows.length === undefined) {
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200,
                    "count": 1,
                    "result" : rows});
            } else if (rows.length === 0) {
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200,
                    "count": 0,
                    "result" : []});
            } else {
                var rowsProcessed = rows;
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200,
                    "count": rowsProcessed.length,
                    "result" : rowsProcessed});
            }
        });
    });
};

var getUser = function (req, res, permissions, callback) {
    // permissions - array containing which types of users can access resource
    if (req.payload && req.payload.username) {
        var username = req.payload.username;
        pool.query("SELECT * FROM users WHERE username = ?",[username], function(err, rows){
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
                sendJSONResponse(res, 404, { message: 'This user is not authorized to this operation.' });
                return;
            }
            // all is well, return successful user
            return callback(req, res, username)
        });
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

function momentToDate(timedate, timezone, timeformat) {
    if (timezone === undefined) {
        timezone = 'Europe/Lisbon';
    }
    if (timeformat === undefined) {
        timeformat = 'YYYY-MM-DD';
    }
    return timedate !== null ? moment.tz(timedate,timezone).format(timeformat) : null;
}

/***************************** Query Functions ********************************/

var queryUpdateAllPeopleData = function (req, res, next, personIDs, userCity) {
    var permissionsGeo = getGeoPermissions(req, userCity);

    var updateLabArrPre = req.body.updateLabPerson;
    var updateTechArrPre = req.body.updateTechPerson;
    var updateManageArrPre = req.body.updateManagePerson;
    var updateAdmArrPre = req.body.updateAdmPerson;
    var deleteNeverMemberArrPre = req.body.deleteNeverMember;

    var updateLabArr = [];
    var updateTechArr = [];
    var updateManageArr = [];
    var updateAdmArr = [];
    var deleteNeverMemberArr = [];

    var hasPermissionGeo;
    for (var ind in updateLabArrPre) {
        hasPermissionGeo = false;
        for (var indGeoPerm in permissionsGeo) {
            if (updateLabArrPre[ind]['person_id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        if ((req.payload.personID !== updateLabArrPre[ind]['person_id']
                    && hasPermissionGeo)
             || req.payload.personID === updateLabArrPre[ind]['person_id']) {
            updateLabArr.push(updateLabArrPre[ind]);
        }
    }

    for (var ind in updateTechArrPre) {
        hasPermissionGeo = false;
        for (var indGeoPerm in permissionsGeo) {
            if (updateTechArrPre[ind]['person_id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        if ((req.payload.personID !== updateTechArrPre[ind]['person_id']
                    && hasPermissionGeo)
             || req.payload.personID === updateTechArrPre[ind]['person_id']) {
            updateTechArr.push(updateTechArrPre[ind]);
        }
    }

    for (var ind in updateManageArrPre) {
        hasPermissionGeo = false;
        for (var indGeoPerm in permissionsGeo) {
            if (updateManageArrPre[ind]['person_id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        if ((req.payload.personID !== updateManageArrPre[ind]['person_id']
                    && hasPermissionGeo)
             || req.payload.personID === updateManageArrPre[ind]['person_id']) {
            updateManageArr.push(updateManageArrPre[ind]);
        }
    }

    for (var ind in updateAdmArrPre) {
        hasPermissionGeo = false;
        for (var indGeoPerm in permissionsGeo) {
            if (updateAdmArrPre[ind]['person_id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        if ((req.payload.personID !== updateAdmArrPre[ind]['person_id']
                    && hasPermissionGeo)
             || req.payload.personID === updateAdmArrPre[ind]['person_id']) {
            updateAdmArr.push(updateAdmArrPre[ind]);
        }
    }
    for (var ind in deleteNeverMemberArrPre) {
        hasPermissionGeo = false;
        for (var indGeoPerm in permissionsGeo) {
            if (deleteNeverMemberArrPre[ind] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        if ((req.payload.personID !== deleteNeverMemberArrPre[ind]
                    && hasPermissionGeo)
             || req.payload.personID === deleteNeverMemberArrPre[ind]) {
            deleteNeverMemberArr.push(deleteNeverMemberArrPre[ind]);
        }
    }
    var places = [];
    var querySQL = '';

    if (updateLabArr.length > 0) {
        for (var ind in updateLabArr) {
            updateLabArr[ind].valid_from = momentToDate(updateLabArr[ind].valid_from);
            updateLabArr[ind].valid_until = momentToDate(updateLabArr[ind].valid_until);
            querySQL = querySQL + 'UPDATE `people_labs`' +
                              ' SET `lab_id` = ?,' +
                              ' `lab_position_id` = ?,' +
                              ' `dedication` = ?,' +
                              ' `valid_from` = ?,' +
                              ' `valid_until` = ?' +
                              ' WHERE `id` = ?';
            querySQL = querySQL + '; ';
            places.push(updateLabArr[ind].lab_id,
                    updateLabArr[ind].position_id,
                    updateLabArr[ind].dedication,
                    updateLabArr[ind].valid_from,
                    updateLabArr[ind].valid_until,
                    updateLabArr[ind].people_labs_id);
        }
    }

    if (updateTechArr.length > 0) {
        for (var ind in updateTechArr) {
            updateTechArr[ind].valid_from = momentToDate(updateTechArr[ind].valid_from);
            updateTechArr[ind].valid_until = momentToDate(updateTechArr[ind].valid_until);
            querySQL = querySQL + 'UPDATE `technicians`' +
                              ' SET `technician_office_id` = ?,' +
                              ' `technician_position_id` = ?,' +
                              ' `dedication` = ?,' +
                              ' `valid_from` = ?,' +
                              ' `valid_until` = ?' +
                              ' WHERE `id` = ?';
            querySQL = querySQL + '; ';
            places.push(updateTechArr[ind].technician_office_id,
                    updateTechArr[ind].position_id,
                    updateTechArr[ind].dedication,
                    updateTechArr[ind].valid_from,
                    updateTechArr[ind].valid_until,
                    updateTechArr[ind].technicians_id);
        }
    }

    if (updateManageArr.length > 0) {
        for (var ind in updateManageArr) {
            updateManageArr[ind].valid_from = momentToDate(updateManageArr[ind].valid_from);
            updateManageArr[ind].valid_until = momentToDate(updateManageArr[ind].valid_until);
            querySQL = querySQL + 'UPDATE `science_managers`' +
                              ' SET `science_manager_office_id` = ?,' +
                              ' `science_manager_position_id` = ?,' +
                              ' `dedication` = ?,' +
                              ' `valid_from` = ?,' +
                              ' `valid_until` = ?' +
                              ' WHERE `id` = ?';
            querySQL = querySQL + '; ';
            places.push(updateManageArr[ind].science_manager_office_id,
                    updateManageArr[ind].position_id,
                    updateManageArr[ind].dedication,
                    updateManageArr[ind].valid_from,
                    updateManageArr[ind].valid_until,
                    updateManageArr[ind].science_managers_id);
        }
    }

    if (updateAdmArr.length > 0) {
        for (var ind in updateAdmArr) {
            updateAdmArr[ind].valid_from = momentToDate(updateAdmArr[ind].valid_from);
            updateAdmArr[ind].valid_until = momentToDate(updateAdmArr[ind].valid_until);
            querySQL = querySQL + 'UPDATE `people_administrative_offices`' +
                              ' SET `administrative_office_id` = ?,' +
                              ' `administrative_position_id` = ?,' +
                              ' `dedication` = ?,' +
                              ' `valid_from` = ?,' +
                              ' `valid_until` = ?' +
                              ' WHERE `id` = ?';
            querySQL = querySQL + '; ';
            places.push(updateAdmArr[ind].administrative_office_id,
                    updateAdmArr[ind].position_id,
                    updateAdmArr[ind].dedication,
                    updateAdmArr[ind].valid_from,
                    updateAdmArr[ind].valid_until,
                    updateAdmArr[ind].people_administrative_offices_id);
        }
    }

    if (deleteNeverMemberArr.length > 0) {
        for (var ind in deleteNeverMemberArr) {
            querySQL = querySQL + 'UPDATE `people`' +
                                  ' SET `status` = ?' +
                                  ' WHERE `id`=?';
            querySQL = querySQL + '; ';
            places.push(0, deleteNeverMemberArr[ind]);
        }
    }

    if (updateLabArr.length === 0
        && updateTechArr.length === 0
        && updateManageArr.length === 0
        && updateAdmArr.length === 0
        && deleteNeverMemberArr.length === 0) {
        sendJSONResponse(res, 304,
                {"status": "No changes or User not authorized",
                "statusCode": 304});
    } else {
        escapedQuery(querySQL, places, req, res, next);
    }
};

var queryValidatePerson = function (req, res, next) {
    var personID = req.params.personID;
    var userID = req.body.user_id;
    var name = req.body.name;
    var colloquial_name = req.body.colloquial_name;
    var birth_date = momentToDate(req.body.birth_date);
    var gender = req.body.gender;
    var active_from = momentToDate(req.body.active_from);
    var active_until = momentToDate(req.body.active_until);
    var changed_by = req.body.changed_by;
    var updated = momentToDate(moment(),undefined,'YYYY-MM-DD HH:mm:ss');
    var requesterCities = geographicAccess(req.payload.stat);
    var querySQL = '';
    var places = [];
    if (requesterCities.indexOf(req.body.city_id) !== -1) {
        querySQL = querySQL + 'UPDATE `people`' +
                              ' SET status = 1' +
                              ' WHERE id = ?;';
        places.push(req.params.personID);
        querySQL = querySQL + 'INSERT INTO `people_history`' +
                       ' (`person_id`,`user_id`,`name`,`colloquial_name`,`birth_date`,`gender`,' +
                         '`active_from`,`active_until`,`status`,`updated`,`operation`,`changed_by`)' +
                       ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?);';
        places.push(personID,userID,name,colloquial_name,birth_date,gender,
                    active_from,active_until,1,updated,'U',changed_by);
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
                    return sendEmailsToUsers(req, res, next);
                }
            );
        });

    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
        return;
    }
};

var queryPasswordReset = function (req, res, next) {
    var personID = req.params.personID;
    var userID = req.body.user_id;
    var password = req.body.password;
    var hashedPassword = userModule.hashPassword(password);
    var requesterCities = geographicAccess(req.payload.stat);
    var querySQL = '';
    var places = [];
    if (requesterCities.indexOf(req.body.city_id) !== -1) {
        querySQL = querySQL + 'UPDATE `users`' +
                              ' SET password = ?' +
                              ' WHERE id = ?;';
        places.push(hashedPassword,userID);
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
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            );
        });

    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
        return;
    }
};

var sendEmailsToUsers = function (req, res, next) {
    if (process.env.NODE_ENV === 'production') {
        if (req.body.personal_email !== null) {
            var recipients = req.body.personal_email;
            let mailOptions = {
                from: '"Admin" <admin@laqv-ucibio.info>', // sender address
                to: recipients, // list of receivers (comma-separated)
                subject: 'LAQV/UCIBIO pre-registration successfully validated', // Subject line
                text: 'Hi ' + req.body.colloquial_name +',\n\n' +
                      'Your pre-registration laqv-ucibio.info was successful.\n\n' +
                      'Head to https://laqv-ucibio.info and login with the credentials you set.\n\n' +
                      'After login you can further complete your profile.\n\n' +
                      'Best regards,\nAdmin',
            };
            // send mail with defined transport object
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('Message %s sent: %s', info.messageId, info.response);
            });
        } else {
            console.log('User validation warning: email not set for user %s',
                         req.body.user_id);
            sendJSONResponse(res, 400, { message: 'Email not set for this user.' });
            return;
        }
    }
    sendJSONResponse(res, 200, {"status": "All done!", "statusCode": 200});
    return;
};


/******************** Call SQL Generators after Validations *******************/

module.exports.listAllPeopleWithRolesData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            var places = [];
            //TODO: To have all data of people retrieve all 'technicians', 'administrative' and 'science_managers'
            var querySQL = 'SELECT people.id AS person_id, people.name AS person_name,' +
                           ' people_institution_city.city_id AS pole_id, institution_city.city AS pole_name,' +
                           ' people_roles.role_id, people_roles.id AS people_roles_id,' +
                           ' people_labs.lab_id, people_labs.valid_from AS valid_from, labs.name AS lab,' +
                           ' people_labs.dedication AS dedication,' +
                           ' people_labs.valid_until AS valid_until,' +
                           ' people_labs.lab_position_id AS position_id,' +
                           ' people_labs.id AS people_labs_id,' +
                           ' groups.id AS group_id,' +
                           ' units.id AS unit_id ' +
                           ' FROM people' +
                            ' LEFT JOIN people_institution_city ON people_institution_city.person_id = people.id' +
                            ' LEFT JOIN institution_city ON people_institution_city.city_id = institution_city.id' +
                            ' LEFT JOIN people_roles ON people_roles.person_id = people.id' +
                            ' LEFT JOIN people_labs ON people_labs.person_id = people.id' +
                            ' LEFT JOIN labs ON people_labs.lab_id = labs.id' +
                            ' LEFT JOIN groups ON labs.group_id = groups.id' +
                            ' LEFT JOIN units ON groups.unit_id = units.id' +
                           ' WHERE people.status = 1' + ' AND ' + 'people_roles.role_id = ' + rolesObj['scientific'] +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            var querySQL = querySQL + 'SELECT people.id AS person_id, people.name AS person_name,' +
                           ' people_institution_city.city_id AS pole_id, institution_city.city AS pole_name,' +
                           ' people_roles.role_id, people_roles.id AS people_roles_id,' +
                           ' technicians.technician_office_id, technician_offices.name_en AS lab,' +
                           ' technicians.valid_from AS valid_from, technicians.valid_until AS valid_until,' +
                           ' technicians.dedication AS dedication,' +
                           ' technicians.technician_position_id AS position_id,' +
                           ' technicians.id AS technicians_id ' +
                           ' FROM people' +
                            ' LEFT JOIN people_institution_city ON people_institution_city.person_id = people.id' +
                            ' LEFT JOIN institution_city ON people_institution_city.city_id = institution_city.id' +
                            ' LEFT JOIN people_roles ON people_roles.person_id = people.id' +
                            ' LEFT JOIN technicians ON technicians.person_id = people.id' +
                            ' LEFT JOIN technician_offices ON technicians.technician_office_id = technician_offices.id' +
                           ' WHERE people.status = 1' + ' AND ' + 'people_roles.role_id = ' + rolesObj['technical'] +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            var querySQL = querySQL + 'SELECT people.id AS person_id, people.name AS person_name,' +
                           ' people_institution_city.city_id AS pole_id, institution_city.city AS pole_name,' +
                           ' people_roles.role_id, people_roles.id AS people_roles_id,' +
                           ' science_managers.science_manager_office_id, science_manager_offices.name_en AS lab,' +
                           ' science_managers.valid_from AS valid_from, science_managers.valid_until AS valid_until,' +
                           ' science_managers.dedication AS dedication,' +
                           ' science_managers.science_manager_position_id AS position_id,' +
                           ' science_managers.id AS science_managers_id ' +
                           ' FROM people' +
                            ' LEFT JOIN people_institution_city ON people_institution_city.person_id = people.id' +
                            ' LEFT JOIN institution_city ON people_institution_city.city_id = institution_city.id' +
                            ' LEFT JOIN people_roles ON people_roles.person_id = people.id' +
                            ' LEFT JOIN science_managers ON science_managers.person_id = people.id' +
                            ' LEFT JOIN science_manager_offices ON science_managers.science_manager_office_id = science_manager_offices.id' +
                           ' WHERE people.status = 1' + ' AND ' + 'people_roles.role_id = ' + rolesObj['scienceManagement'] +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            var querySQL = querySQL + 'SELECT people.id AS person_id, people.name AS person_name,' +
                           ' people_institution_city.city_id AS pole_id, institution_city.city AS pole_name,' +
                           ' people_roles.role_id, people_roles.id AS people_roles_id,' +
                           ' people_administrative_offices.administrative_office_id, administrative_offices.name_en AS lab,' +
                           ' people_administrative_offices.valid_from AS valid_from, people_administrative_offices.valid_until AS valid_until,' +
                           ' people_administrative_offices.dedication AS dedication,' +
                           ' people_administrative_offices.administrative_position_id AS position_id,' +
                           ' people_administrative_offices.id AS people_administrative_offices_id ' +
                           ' FROM people' +
                            ' LEFT JOIN people_institution_city ON people_institution_city.person_id = people.id' +
                            ' LEFT JOIN institution_city ON people_institution_city.city_id = institution_city.id' +
                            ' LEFT JOIN people_roles ON people_roles.person_id = people.id' +
                            ' LEFT JOIN people_administrative_offices ON people_administrative_offices.person_id = people.id' +
                            ' LEFT JOIN administrative_offices ON people_administrative_offices.administrative_office_id = administrative_offices.id' +
                           ' WHERE people.status = 1' + ' AND ' + 'people_roles.role_id = ' + rolesObj['administrative'] +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            //places.push(teamID);
            escapedQuery(querySQL, places, req, res, next);
        }
    );
};

module.exports.listAllPeopleNoRolesData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            var places = [];
            var querySQL = 'SELECT people.id AS person_id, people.name AS person_name,' +
                           ' people_institution_city.city_id AS pole_id, institution_city.city AS pole_name' +
                           ' FROM people' +
                            ' LEFT JOIN people_institution_city ON people_institution_city.person_id = people.id' +
                            ' LEFT JOIN institution_city ON people_institution_city.city_id = institution_city.id' +
                            ' LEFT JOIN people_roles ON people_roles.person_id = people.id' +
                           ' WHERE people.status = 1' + ' AND' + ' people_roles.role_id IS NULL' +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            escapedQuery(querySQL, places, req, res, next, true);
        }
    );
};

module.exports.listPeopleValidate = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            var places = [];
            var querySQL = 'SELECT people.id AS person_id, people.name AS person_name,' +
                           ' people_institution_city.city_id AS pole_id, institution_city.city AS pole_name' +
                           ' FROM people' +
                            ' LEFT JOIN people_institution_city ON people_institution_city.person_id = people.id' +
                            ' LEFT JOIN institution_city ON people_institution_city.city_id = institution_city.id' +
                           ' WHERE people.status = 3 AND people.name IS NOT NULL' +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
            escapedQuery(querySQL, places, req, res, next, true);
        }
    );
};

module.exports.updateAllPeopleData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            getLocation(req, res, next, queryUpdateAllPeopleData);
        }
    );
};

module.exports.validatePerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            queryValidatePerson(req,res,next);
        }
    );
};

module.exports.passwordReset = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            queryPasswordReset(req,res,next);
        }
    );
};