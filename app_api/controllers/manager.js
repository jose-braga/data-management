var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
const nodemailer = require('../controllers/emailer');
let transporter = nodemailer.transporter;
var userModule = require('../models/users');
var permissions = require('../config/permissions');
var externalAPI = require('../config/external-api');

var WEBSITE_API_BASE_URL = externalAPI.baseURL;

/**************************** Utility Functions *******************************/

var rolesObj = {
    'scientific': 1,
    'technical': 2,
    'scienceManagement': 3,
    'administrative': 4
};

var getLocation = function(req, res, next, callback) {
    // gets cities associated with resources (person in lab) to be altered
    var personIDs = [];
    var arr = req.body.deleteNeverMember;
    for (var ind in arr) {
        personIDs.push(arr[ind]['id']);
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
        sendJSONResponse(res, 304, {"status": "no changes or not authorized", "statusCode": 304});
        return;
        //return callback(req,res,next, personIDs, []);
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

function joinResponses(row, newRows, newKey, i, newSubRows, newSubKey) {
    if (newKey !== undefined) {
        if (newSubRows !== undefined && newSubKey !== undefined && i !== undefined) {
            row[newKey][i][newSubKey] = newSubRows;
            return row;
        } else {
            row[newKey] = newRows;
            return row;
        }
    } else {
        // this will be OK only if each row of newRows is different
        for (var ind in newRows) {
            Object.assign(row,newRows[ind]);
        }
        return row;
    }
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

function filterLabTimes(rows) {
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
        var overlap = timeOverlap(rows[ind].valid_from,rows[ind].valid_until,
            rows[ind].labs_groups_valid_from,rows[ind].labs_groups_valid_until);
        if (overlap) {
            rows[ind].valid_from = overlap[0];
            rows[ind].valid_until = overlap[1];
            filteredRows.push(rows[ind]);
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

var queryUpdateAllPeopleData = function (req, res, next, personIDs, userCity) {
    var updated = moment.tz('Europe/Lisbon').format('YYYY-MM-DD HH:mm:ss');
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
    var data;
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
            if (deleteNeverMemberArrPre[ind]['id'] === permissionsGeo[indGeoPerm]['person_id']
                    && permissionsGeo[indGeoPerm]['permission']) {
                hasPermissionGeo = true;
            }
        }
        if ((req.payload.personID !== deleteNeverMemberArrPre[ind]['id']
                    && hasPermissionGeo)
             || req.payload.personID === deleteNeverMemberArrPre[ind]['id']) {
            deleteNeverMemberArr.push(deleteNeverMemberArrPre[ind]);
        }
    }
    if (updateLabArr.length > 0) {
        data = updateLabArr[0];
        return queryUpdateLab(req, res, next,
                            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, data, 0,-1,-1,-1,-1);
    }
    if (updateTechArr.length > 0) {
        data = updateTechArr[0];
        return queryUpdateTech(req, res, next,
                            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, data, 0,0,-1,-1,-1);

    }
    if (updateManageArr.length > 0) {
        data = updateManageArr[0];
        return queryUpdateScMan(req, res, next,
                            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, data, 0,0, 0,-1,-1);
    }
    if (updateAdmArr.length > 0) {
        data = updateAdmArr[0];
        return queryUpdateAdm(req, res, next,
                            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, data, 0,0, 0,0,-1);
    }
    if (deleteNeverMemberArr.length > 0) {
        data = deleteNeverMemberArr[0];
        return queryDeleteNeverMember(req, res, next,
                            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, data, 0,0, 0,0,0);
    }
    if (updateLabArr.length === 0
        && updateTechArr.length === 0
        && updateManageArr.length === 0
        && updateAdmArr.length === 0
        && deleteNeverMemberArr.length === 0) {
        sendJSONResponse(res, 304,
                {"status": "No changes or User not authorized",
                "statusCode": 304});
    }
};

var queryUpdateLab = function (req, res, next,
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                        updated, data, iLab,iTech,iMan,iAdm,iDel) {
    var places = [];
    var querySQL = '';
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    querySQL = querySQL + 'UPDATE `people_labs`' +
                      ' SET `lab_id` = ?,' +
                      ' `lab_position_id` = ?,' +
                      ' `dedication` = ?,' +
                      ' `valid_from` = ?,' +
                      ' `valid_until` = ?' +
                      ' WHERE `id` = ?';
    querySQL = querySQL + '; ';
    places.push(data.lab_id,
            data.position_id,
            data.dedication,
            data.valid_from,
            data.valid_until,
            data.people_labs_id);
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
                var peopleOfficeID = data.people_labs_id;
                return queryUpdateLabHistory(req, res, next, peopleOfficeID,
                                updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                                updated, data, iLab,iTech,iMan,iAdm,iDel);
            }
        );
    });

};

var queryUpdateLabHistory = function (req, res, next, peopleOfficeID,
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                        updated, data, iLab,iTech,iMan,iAdm,iDel) {
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    var changed_by = req.body.changed_by;
    var personID = data.person_id;
    var query = 'INSERT INTO people_labs_history' +
                  ' (people_labs_id,person_id,lab_id,lab_position_id,sort_order,dedication,'+
                    'valid_from,valid_until,updated,operation,changed_by)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?,?);';
    var places = [peopleOfficeID,personID, data.lab_id,
                data.position_id,data.sort_order,data.dedication,
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
                                'UCIBIO API error updating by manager of person information (lab affiliation [personID,lab_id]) :', [personID,data.lab_id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by manager of person information (lab affiliation [personID,lab_id]) :', [personID,data.lab_id]);
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[],
                            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, iLab,iTech,iMan,iAdm,iDel,'lab update');
            }
        );
    });
};

var queryUpdateTech = function (req, res, next,
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                        updated, data, iLab,iTech,iMan,iAdm,iDel) {
    var places = [];
    var querySQL = '';
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    querySQL = querySQL + 'UPDATE `technicians`' +
                          ' SET `technician_office_id` = ?,' +
                          ' `technician_position_id` = ?,' +
                          ' `dedication` = ?,' +
                          ' `valid_from` = ?,' +
                          ' `valid_until` = ?' +
                          ' WHERE `id` = ?';
    querySQL = querySQL + '; ';
    places.push(data.technician_office_id,
                data.position_id,
                data.dedication,
                data.valid_from,
                data.valid_until,
                data.technicians_id);
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
                var peopleOfficeID = data.technicians_id;
                return queryUpdateTechHistory(req, res, next, peopleOfficeID,
                                updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                                updated, data, iLab,iTech,iMan,iAdm,iDel);
            }
        );
    });
};

var queryUpdateTechHistory = function (req, res, next, peopleOfficeID,
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                        updated, data, iLab,iTech,iMan,iAdm,iDel) {
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
                                'UCIBIO API error updating by manager of person information (tech affiliation [personID,office_id]) :', [personID,data.technician_office_id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by manager of person information (tech affiliation [personID,office_id]) :', [personID,data.technician_office_id]);
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[],
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, iLab,iTech,iMan,iAdm,iDel,'technician update');
            }
        );
    });
};


var queryUpdateScMan = function (req, res, next,
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                        updated, data, iLab,iTech,iMan,iAdm,iDel) {
    var places = [];
    var querySQL = '';
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    querySQL = querySQL + 'UPDATE `science_managers`' +
                              ' SET `science_manager_office_id` = ?,' +
                              ' `science_manager_position_id` = ?,' +
                              ' `dedication` = ?,' +
                              ' `valid_from` = ?,' +
                              ' `valid_until` = ?' +
                              ' WHERE `id` = ?';
    querySQL = querySQL + '; ';
    places.push(data.science_manager_office_id,
                data.position_id,
                data.dedication,
                data.valid_from,
                data.valid_until,
                data.science_managers_id);
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
                var peopleOfficeID = data.science_managers_id;
                return queryUpdateScManHistory(req, res, next, peopleOfficeID,
                                updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                                updated, data, iLab,iTech,iMan,iAdm,iDel);
            }
        );
    });
};


var queryUpdateScManHistory = function (req, res, next, peopleOfficeID,
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                        updated, data, iLab,iTech,iMan,iAdm,iDel) {
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
                                'UCIBIO API error updating by manager of person information (sc. man. affiliation [personID,office_id]) :', [personID,data.science_manager_office_id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by manager of person information (sc. man. affiliation [personID,office_id]) :', [personID,data.science_manager_office_id]);
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[],
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, iLab,iTech,iMan,iAdm,iDel,'scMan update');
            }
        );
    });
};

var queryUpdateAdm = function (req, res, next,
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                        updated, data, iLab,iTech,iMan,iAdm,iDel) {
    var places = [];
    var querySQL = '';
    data.valid_from = momentToDate(data.valid_from);
    data.valid_until = momentToDate(data.valid_until);
    querySQL = querySQL + 'UPDATE `people_administrative_offices`' +
                              ' SET `administrative_office_id` = ?,' +
                              ' `administrative_position_id` = ?,' +
                              ' `dedication` = ?,' +
                              ' `valid_from` = ?,' +
                              ' `valid_until` = ?' +
                              ' WHERE `id` = ?';
    querySQL = querySQL + '; ';
    places.push(data.administrative_office_id,
                data.position_id,
                data.dedication,
                data.valid_from,
                data.valid_until,
                data.people_administrative_offices_id);
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
                var peopleOfficeID = data.people_administrative_offices_id;
                return queryUpdateAdmHistory(req, res, next, peopleOfficeID,
                                updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                                updated, data, iLab,iTech,iMan,iAdm,iDel);
            }
        );
    });
};

var queryUpdateAdmHistory = function (req, res, next, peopleOfficeID,
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                        updated, data, iLab,iTech,iMan,iAdm,iDel ) {
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
                                'UCIBIO API error updating by manager of person information (adm. affiliation [personID,office_id]) :', [personID,data.administrative_office_id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by manager of person information (adm. affiliation [personID,office_id]) :', [personID,data.administrative_office_id]);
                //checks remaining affiliations and finds earliest date
                return queryGetLabs(req,res,next,personID,[],
                            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, iLab,iTech,iMan,iAdm,iDel,'administrative update');
            }
        );
    });
};


var queryGetLabs = function (req,res,next, personID, dates,
                updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                updated, iLab,iTech,iMan,iAdm,iDel, type) {
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
                return queryGetTechnicianAffiliation(req,res,next, personID, dates,
                            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated,iLab,iTech,iMan,iAdm,iDel,type);
            }
        );
    });
};

var queryGetTechnicianAffiliation = function (req,res,next, personID, dates,
            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
            updated, iLab,iTech,iMan,iAdm,iDel, type) {
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
                return queryGetScienceManagerAffiliation(req,res,next, personID, dates,
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                        updated,iLab,iTech,iMan,iAdm,iDel,type);
            }
        );
    });
};

var queryGetScienceManagerAffiliation = function (req,res,next, personID, dates,
            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
            updated, iLab,iTech,iMan,iAdm,iDel, type) {
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
                return queryGetAdministrativeAffiliation(req,res,next, personID, dates,
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                        updated,iLab,iTech,iMan,iAdm,iDel,type);
            }
        );
    });
};

var queryGetAdministrativeAffiliation = function (req,res,next, personID, dates,
                updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                updated, iLab,iTech,iMan,iAdm,iDel, type) {
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
                return queryGetDepartments(req,res,next, personID, dates,
                    updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                    updated,iLab,iTech,iMan,iAdm,iDel,type);
            }
        );
    });
};

var queryGetDepartments = function (req,res,next, personID, dates,
            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
            updated, iLab,iTech,iMan,iAdm,iDel, type) {
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
                return queryPeopleStartDateGetRow(req,res,next, personID, dates,
                    updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                    updated,iLab,iTech,iMan,iAdm,iDel,type);
            }
        );
    });
};

var queryPeopleStartDateGetRow = function (req,res,next, personID, dates,
            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
            updated, iLab,iTech,iMan,iAdm,iDel, type) {
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
                var data;
                if (moment(resQuery[0].active_from).isSame(minDate)) {
                    if (iLab + 1 < updateLabArr.length) {
                        data = updateLabArr[iLab+1];
                        return queryUpdateLab(req, res, next,
                                updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                                updated, data, iLab+1,iTech,iMan,iAdm,iDel);
                    } else if (iTech + 1 < updateTechArr.length) {
                        data = updateTechArr[iTech+1];
                        return queryUpdateTech(req, res, next, updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                                updated, data, iLab,iTech+1,iMan,iAdm,iDel);
                    } else if (iMan + 1 < updateManageArr.length) {
                        data = updateManageArr[iMan+1];
                        return queryUpdateScMan(req, res, next, updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                                updated, data, iLab,iTech,iMan+1,iAdm,iDel);
                    }  else if (iAdm + 1 < updateAdmArr.length) {
                        data = updateAdmArr[iAdm+1];
                        return queryUpdateScMan(req, res, next, updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                                updated, data, iLab,iTech,iMan,iAdm+1,iDel);
                    } else if (iDel + 1 < deleteNeverMemberArr.length) {
                        data = deleteNeverMemberArr[iDel+1];
                        return queryDeleteNeverMember(req, res, next, updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                                updated, data, iLab,iTech,iMan,iAdm,iDel+1);
                    } else {
                        sendJSONResponse(res, 200, { message: 'All done.' });
                        return;
                    }
                } else {
                    return queryPeopleUpdateStartDate(req,res,next, personID, resQuery[0],minDate,
                            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, iLab,iTech,iMan,iAdm,iDel,type);
                }
            }
        );
    });
};

var queryPeopleUpdateStartDate = function (req,res,next, personID, resQuery, minDate,
            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
            updated, iLab,iTech,iMan,iAdm,iDel, type) {
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
                                'UCIBIO API error updating by manager of person information (activity start) :', personID);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'people', personID,
                                'LAQV API error updating by manager of person information (activity start) :', personID);
                var data;
                if (iLab + 1 < updateLabArr.length) {
                    data = updateLabArr[iLab+1];
                    return queryUpdateLab(req, res, next,
                            updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, data, iLab+1,iTech,iMan,iAdm,iDel);
                } else if (iTech + 1 < updateTechArr.length) {
                    data = updateTechArr[iTech+1];
                    return queryUpdateTech(req, res, next, updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, data, iLab,iTech+1,iMan,iAdm,iDel);
                } else if (iMan + 1 < updateManageArr.length) {
                    data = updateManageArr[iMan+1];
                    return queryUpdateScMan(req, res, next, updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, data, iLab,iTech,iMan+1,iAdm,iDel);
                }  else if (iAdm + 1 < updateAdmArr.length) {
                    data = updateAdmArr[iAdm+1];
                    return queryUpdateScMan(req, res, next, updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, data, iLab,iTech,iMan,iAdm+1,iDel);
                } else if (iDel + 1 < deleteNeverMemberArr.length) {
                    data = deleteNeverMemberArr[iDel+1];
                    return queryDeleteNeverMember(req, res, next, updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, data, iLab,iTech,iMan,iAdm,iDel+1);
                } else {
                    sendJSONResponse(res, 200, { message: 'All done.' });
                    return;
                }
            }
        );
    });
};


var queryDeleteNeverMember  = function (req, res, next,
                        updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                        updated, data, iLab,iTech,iMan,iAdm,iDel) {
    var places = [];
    var querySQL = '';
    querySQL = querySQL + 'UPDATE `people`' +
                          ' SET `status` = ?' +
                          ' WHERE `id`=?';
    querySQL = querySQL + '; ';
    places.push(0, data.id);
    querySQL = querySQL + 'INSERT INTO `people_history`' +
                       ' (`person_id`,`user_id`,`name`,`colloquial_name`,`birth_date`,`gender`,' +
                         '`active_from`,`active_until`,`status`,`updated`,`operation`,`changed_by`)' +
                       ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    // the person is not truly deleted, only the status is updated
    places.push(data.id,data.user_id,data.name,data.colloquial_name,
                    momentToDate(data.birth_date),data.gender,
                    momentToDate(data.active_from),momentToDate(data.active_until),
                    0,updated,'U',req.body.changed_by);

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
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'delete', 'people', data.id,
                                'UCIBIO API error delete person :', data.id);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'delete', 'people', data.id,
                                'LAQV API error delete person :', data.id);
                if (iDel + 1 < deleteNeverMemberArr.length) {
                    data = deleteNeverMemberArr[iDel+1];
                    return queryDeleteNeverMember(req, res, next, updateLabArr, updateTechArr, updateManageArr, updateAdmArr, deleteNeverMemberArr,
                            updated, data, iLab,iTech,iMan,iAdm,iDel+1);
                } else {
                    sendJSONResponse(res, 200, { message: 'All done.' });
                    return;
                }
            }
        );
    });
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
    var unit = req.body.unit;
    var changed_by = req.body.changed_by;
    var updated = momentToDate(moment(),undefined,'YYYY-MM-DD HH:mm:ss');
    var requesterCities = permissions.geographicAccess(req.payload.stat);
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
                    for (var ind in unit) {
                        if (unit[ind] == 1) {
                            externalAPI.contact(WEBSITE_API_BASE_URL[1], 'create', 'people', personID,
                                    'UCIBIO API error creation of person :', personID);
                        }
                        if (unit[ind] == 2) {
                            externalAPI.contact(WEBSITE_API_BASE_URL[2], 'create', 'people', personID,
                                    'LAQV API error creation of person :', personID);
                        }
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
    var requesterCities = permissions.geographicAccess(req.payload.stat);
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

var queryUpdateUserPermissions = function (req, res, next) {
    var userID = req.body.user_id;
    var username = req.body.username;
    var permission = req.body.permissions;
    var requesterCities = permissions.geographicAccess(req.payload.stat);
    var querySQL = '';
    var places = [];
    if (requesterCities.indexOf(req.body.city_id) !== -1) {
        querySQL = querySQL + 'UPDATE `users`' +
                              ' SET username = ?,' +
                              ' status = ?' +
                              ' WHERE id = ?;';
        places.push(username,permission,userID);
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
    var mailError = [];
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
                    console.log('Message to person %s not sent due to error below.', req.body.person_id);
                    console.log(error);
                    mailError.push('Not send to user: sending problem.');
                }
                console.log('Message %s was sent to person %s with response: %s', info.messageId, req.body.person_id, info.response);
            });
        } else {
            console.log('User validation warning: email not sent for person %s',
                         req.body.person_id);
            mailError.push('Not send to user: email not defined.');
        }
    } else {
        // just for testing purposes
    }
    return sendEmailsCar(req, res, next, mailError);
};

var sendEmailsCar = function (req, res, next, mailError) {
    if (process.env.NODE_ENV === 'production') {
        if (req.body.datum.cars.length !== 0) {
            if (req.body.city_id == 1) {
                var recipients = nodemailer.emailRecipients.car;
                let mailOptions = {
                    from: '"Admin" <admin@laqv-ucibio.info>', // sender address
                    to: recipients, // list of receivers (comma-separated)
                    subject: 'Permissão de circulação no campus FCT - User: ' + req.body.colloquial_name +
                             ', ID: ' +  req.body.person_id, // Subject line
                    text: 'Olá ,\n\n' +
                          'O utilizador requer autorização para circular no campus FCT.\n\n' +
                          'Dirija-se a https://laqv-ucibio.info/manager para recolher a informação necessária.\n\n' +
                          'Com os melhores cumprimentos,\nAdmin',
                };
                // send mail with defined transport object
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log('Message to car manager (Lisboa) for person %s not sent due to error below.', req.body.person_id);
                        console.log(error);
                        mailError.push('Not send to car manager (Lisboa).');
                    }
                    console.log('Message %s was sent to car manager (Lisboa) for person %s with response: %s',
                                info.messageId, req.body.person_id, info.response);
                });
            }
        }
    } else {
        // just for testing purposes
    }
    return sendEmailsEmail(req, res, next, mailError);
};

var sendEmailsEmail = function (req, res, next, mailError) {

    // in the end send response
    if (mailError.length == 0) {
        sendJSONResponse(res, 200, {"status": "All done!", "statusCode": 200});
        return;

    } else {
        sendJSONResponse(res, 400, {"status": mailError, "statusCode": 400});
        return;
    }


};

var getMoreInfo = function (req, res, next, rows, i, irole) {
    if (rows[irole].length > 0) {
        return getDepartments(req, res, next, rows, i, irole);
    } else if (irole + 1 < rows.length) {
        return getMoreInfo(req, res, next, rows, 0, irole+1);
    } else {
        sendJSONResponse(res, 200,
            {"status": "success", "statusCode": 200, "count": rows.length,
             "result" : rows});
    }
};

var getDepartments = function (req, res, next, rows, i, irole) {
    var query = 'SELECT people_departments.id AS people_departments_id,' +
                ' people_departments.department_id AS department_id, departments.name_en AS department,' +
                ' people_departments.valid_from AS department_start, people_departments.valid_until AS department_end,' +
                ' schools.shortname_en AS school_shortname_en, universities.shortname_en AS university_shortname_en' +
                ' FROM people' +
                ' LEFT JOIN people_departments ON people.id = people_departments.person_id' +
                ' LEFT JOIN departments ON people_departments.department_id = departments.id' +
                ' LEFT JOIN schools ON schools.id = departments.school_id' +
                ' LEFT JOIN universities ON universities.id = schools.university_id' +
                ' WHERE people.id = ?';
    var places = [rows[irole][i].person_id];
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
                rows[irole][i] = joinResponses(rows[irole][i], rowsQuery, 'departments');
                return getDegrees(req, res, next, rows, i, irole);
            }
        );
    });

};

var getDegrees = function (req, res, next, rows, i, irole) {
    var query = 'SELECT degrees_people.id AS degrees_people_id, ' +
                ' degrees_people.degree_id AS degree_type_id, degrees.name_en AS degree_name_en,' +
                ' degrees_people.area AS degree_area, degrees_people.institution AS degree_institution,' +
                ' degrees_people.program AS degree_program,' +
                ' degrees_people.start AS degree_start, degrees_people.estimate_end AS degree_estimate_end, degrees_people.end AS degree_end,' +
                ' degrees_people.title AS degree_title' +
                ' FROM people' +
                ' LEFT JOIN degrees_people ON people.id = degrees_people.person_id' +
                ' LEFT JOIN degrees ON degrees_people.degree_id = degrees.id' +
                ' WHERE people.id = ?;';
    var places = [rows[irole][i].person_id];
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
                rows[irole][i] = joinResponses(rows[irole][i], rowsQuery, 'degrees');
                return getWorkEmails(req, res, next, rows, i, irole);
            }
        );
    });

};
var getWorkEmails = function (req, res, next, rows, i, irole) {
    var query = 'SELECT email AS work_email ' +
                ' FROM emails' +
                ' WHERE person_id = ?;';
    var places = [rows[irole][i].person_id];
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
                rows[irole][i] = joinResponses(rows[irole][i], rowsQuery, 'work_email');
                return getPersonalEmails(req, res, next, rows, i, irole);
            }
        );
    });

};
var getPersonalEmails = function (req, res, next, rows, i, irole) {
    var query = 'SELECT email AS personal_email ' +
                ' FROM personal_emails' +
                ' WHERE person_id = ?;';
    var places = [rows[irole][i].person_id];
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
                rows[irole][i] = joinResponses(rows[irole][i], rowsQuery, 'personal_email');
                return getJobs(req, res, next, rows, i, irole);
            }
        );
    });

};

var getJobs = function (req, res, next, rows, i, irole) {
    var query = 'SELECT jobs.id AS job_id,' +
    ' jobs.situation_id AS job_situation_id, situations.name_en AS job_situation_name_en,' +
    ' situations.requires_unit_contract AS job_situation_requires_unit_contract,' +
    ' situations.requires_fellowship AS job_situation_requires_fellowship,' +
    ' jobs.category_id AS job_category_id, categories.name_en AS job_category_name_en,' +
    ' jobs.organization AS job_organization, jobs.dedication AS job_dedication,' +
    ' jobs.valid_from AS job_valid_from, jobs.valid_until AS job_valid_until,' +
    ' jobs_contracts.id AS jobs_contracts_id, jobs_contracts.contract_id AS contract_id,' +
    ' contracts.reference AS contract_reference,' +
    ' contracts.start AS contract_start, contracts.end AS contract_end, contracts.maximum_extension AS contract_maximum_extension,' +
    ' jobs_fellowships.id AS jobs_fellowships_id, jobs_fellowships.fellowship_id AS fellowship_id,' +
    ' fellowships.fellowship_type_id, fellowship_types.name AS fellowship_type_name, fellowship_types.acronym AS fellowship_type_acronym,' +
    ' fellowships.reference AS fellowship_reference,' +
    ' fellowships.start AS fellowship_start, fellowships.end AS fellowship_end, fellowships.maximum_extension AS fellowship_maximum_extension,' +
    ' fellowships_funding_agencies.id AS fellowships_funding_agencies_id, fellowships_funding_agencies.funding_agency_id AS funding_agency_id,' +
    ' funding_agencies.official_name AS funding_agency_official_name, funding_agencies.short_name AS funding_agency_short_name,' +
    ' fellowships_management_entities.id AS fellowships_management_entities_id, fellowships_management_entities.management_entity_id AS management_entity_id,' +
    ' management_entities.official_name AS management_entity_official_name, management_entities.short_name AS management_entity_short_name' +
    ' FROM people' +
    ' LEFT JOIN jobs ON people.id = jobs.person_id' +
    ' LEFT JOIN situations ON jobs.situation_id = situations.id' +
    ' LEFT JOIN categories ON jobs.category_id = categories.id' +
    ' LEFT JOIN jobs_contracts ON jobs.id = jobs_contracts.job_id' +
    ' LEFT JOIN contracts ON jobs_contracts.contract_id = contracts.id' +

    ' LEFT JOIN jobs_fellowships ON jobs.id = jobs_fellowships.job_id' +
    ' LEFT JOIN fellowships ON jobs_fellowships.fellowship_id = fellowships.id' +
    ' LEFT JOIN fellowship_types ON fellowships.fellowship_type_id = fellowship_types.id' +
    ' LEFT JOIN fellowships_funding_agencies ON fellowships_funding_agencies.fellowship_id = fellowships.id' +
    ' LEFT JOIN fellowships_management_entities ON fellowships_management_entities.fellowship_id = fellowships.id' +
    ' LEFT JOIN management_entities ON fellowships_management_entities.management_entity_id = management_entities.id' +
    ' LEFT JOIN funding_agencies ON fellowships_funding_agencies.funding_agency_id = funding_agencies.id' +

    ' WHERE people.id = ?';
    var places = [rows[irole][i].person_id];
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
                rows[irole][i] = joinResponses(rows[irole][i], rowsQuery, 'jobs');
                if (i + 1 < rows[irole].length) {
                    return getMoreInfo(req, res, next, rows, i+1, irole);
                } else {
                    if (irole + 1 < rows.length) {
                        return getMoreInfo(req, res, next, rows, 0, irole+1);
                    } else {
                        sendJSONResponse(res, 200,
                            {"status": "success", "statusCode": 200, "count": rows.length,
                             "result" : rows});
                    }
                }
            }
        );
    });

};

var sendAdditionEmail = function (req, res, next) {
    var mailError = [];
    if (process.env.NODE_ENV === 'production') {
        if (req.body.personal_email !== null) {
            var recipients = nodemailer.emailRecipients.fct.email;
            var cc = req.body.person_details.pers_email[0].personal_email + ', '
                        + nodemailer.emailRecipients.managers.Lisboa;
            let mailOptions = {
                from: '"Admin" <admin@laqv-ucibio.info>', // sender address
                to: recipients, // list of receivers (comma-separated)
                cc: cc,
                subject: 'Adição de investigador à equipa da unidade: ' +
                         req.body.unit_name, // Subject line
                text: 'Olá ' + nodemailer.emailRecipients.fct.name +',\n\n' +
                      'Pedimos que seja adicionado à equipa da unidade ' + req.body.unit_name +
                      ' o utilizador com os seguintes dados:\n\n' +
                      '.\n\n' +
                      'Com os melhores cumprimentos,\nJosé Braga\n' +
                      'IT and scientific network specialist\n\n' +
                      'UCIBIO - Applied Molecular Biosciences Unit\n' +
                      'LAQV - Associated Laboratory for Green Chemistry\n' +
                      'Faculdade de Ciências e Tecnologia - Universidade Nova de Lisboa,\n' +
                      '2829-516 Caparica, Portugal\n' +
                      'Tel: +351 212949608 (ext: 10906)',
                html: 'Olá ' + nodemailer.emailRecipients.fct.name +',<br><br>' +
                      'Pedimos que seja adicionado à equipa da unidade ' + req.body.unit_name +
                      ' o utilizador com os seguintes dados:<br><br>' +
                      '.<br><br>' +
                      'Com os melhores cumprimentos,<br>José Braga<br>' +
                      'IT and scientific network specialist<br><br>' +
                      '<div class="m_5221355845973084392gmail_signature" data-smartmail="gmail_signature">' +
                      '      <div dir="ltr">'+
                      '         <div style="font-size:12.8px">'+
                      '             <font face="arial, helvetica, sans-serif"><br></font>'+
                      '         </div>'+
                      '         <a href="http://www.requimte.pt/ucibio/" style="font-size:12.8px" target="_blank" data-saferedirecturl="https://www.google.com/url?hl=en&amp;q=http://www.requimte.pt/ucibio/&amp;source=gmail&amp;ust=1511884494937000&amp;usg=AFQjCNEi6tmk4g415gRX4N7I5Sd2z19rkg">'+
                      '             <font color="#3d85c6" face="arial, helvetica, sans-serif">UCIBIO - Applied Molecular Biosciences Unit</font>'+
                      '         </a>' +
                      '         <div style="font-size:12.8px">'+
                      '             <a href="http://www.requimte.pt/laqv/" target="_blank" data-saferedirecturl="https://www.google.com/url?hl=en&amp;q=http://www.requimte.pt/laqv/&amp;source=gmail&amp;ust=1511884494937000&amp;usg=AFQjCNH0-WcrUnyL4748RufZFbe0tMvSYw">'+
                      '                 <font color="#6aa84f" face="arial, helvetica, sans-serif">LAQV - Associated Laboratory for Green Chemistry</font>'+
                      '             </a>'+
                      '         </div>'+
                      '         <div style="font-size:12.8px">'+
                      '             <font face="arial, helvetica, sans-serif">'+
                      '                 <span style="font-size:12.8px">Faculdade de Ciências e Tecnologia - Universidade Nova de Lisboa,&nbsp;</span>'+
                      '                 <br style="font-size:12.8px">'+
                      '                 <span style="font-size:12.8px">2829-516 Caparica, Portugal</span>'+
                      '                 <br style="font-size:12.8px">'+
                      '             </font>Tel: <a href="tel:+351%2021%20294%209608" value="+351212949608" target="_blank">+351 212949608</a> (ext: 10906)'+
                      '         </div>'+
                      '     </div>'+
                      ' </div>',
            };
            // send mail with defined transport object
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Message to person %s not sent due to error below.', req.body.person_id);
                    console.log(error);
                    mailError.push('Not sent to user: sending problem. Changes not saved.');
                }
                console.log('Message %s was sent to person %s with response: %s', info.messageId, req.body.person_id, info.response);
            });
        } else {
            console.log('User validation warning: email not sent for person %s',
                         req.body.person_id);
            mailError.push('Not send to user: email not defined. Changes not saved.');
        }
    } else {
        // just for testing purposes
        //mailError.push('Not sent to user: sending problem. Changes not saved.');
    }
    if (mailError.length === 0) {
        return queryUpdateFctStatus(req, res, next, mailError);
    } else {
        sendJSONResponse(res, 400, {"status": mailError, "statusCode": 400});
        return;
    }
};
var sendRemovalEmail = function (req, res, next) {
    var mailError = [];
    if (process.env.NODE_ENV === 'production') {
        if (req.body.personal_email !== null) {
            var recipients = nodemailer.emailRecipients.fct;
            var cc = req.body.person_details.pers_email[0].personal_email + ', '
                        + nodemailer.emailRecipients.managers.Lisboa;
            let mailOptions = {
                from: '"Admin" <admin@laqv-ucibio.info>', // sender address
                to: recipients, // list of receivers (comma-separated)
                cc: cc,
                subject: 'Remoção de investigador da equipa da unidade: ' +
                         req.body.unit_name, // Subject line
                text: 'Olá ' + nodemailer.emailRecipients.fct.name +',\n\n' +
                      'Pedimos que seja adicionado à equipa da unidade ' + req.body.unit_name +
                      ' o utilizador com os seguintes dados:\n\n' +
                      '.\n\n' +
                      'Com os melhores cumprimentos,\nJosé Braga\n' +
                      'IT and scientific network specialist\n\n' +
                      'UCIBIO - Applied Molecular Biosciences Unit\n' +
                      'LAQV - Associated Laboratory for Green Chemistry\n' +
                      'Faculdade de Ciências e Tecnologia - Universidade Nova de Lisboa,\n' +
                      '2829-516 Caparica, Portugal\n' +
                      'Tel: +351 212949608 (ext: 10906)',
                html: 'Olá ' + nodemailer.emailRecipients.fct.name +',<br><br>' +
                      'Pedimos que seja adicionado à equipa da unidade ' + req.body.unit_name +
                      ' o utilizador com os seguintes dados:<br><br>' +
                      '.<br><br>' +
                      'Com os melhores cumprimentos,<br>José Braga<br>' +
                      'IT and scientific network specialist<br><br>' +
                      '<div class="m_5221355845973084392gmail_signature" data-smartmail="gmail_signature">' +
                      '      <div dir="ltr">'+
                      '         <div style="font-size:12.8px">'+
                      '             <font face="arial, helvetica, sans-serif"><br></font>'+
                      '         </div>'+
                      '         <a href="http://www.requimte.pt/ucibio/" style="font-size:12.8px" target="_blank" data-saferedirecturl="https://www.google.com/url?hl=en&amp;q=http://www.requimte.pt/ucibio/&amp;source=gmail&amp;ust=1511884494937000&amp;usg=AFQjCNEi6tmk4g415gRX4N7I5Sd2z19rkg">'+
                      '             <font color="#3d85c6" face="arial, helvetica, sans-serif">UCIBIO - Applied Molecular Biosciences Unit</font>'+
                      '         </a>' +
                      '         <div style="font-size:12.8px">'+
                      '             <a href="http://www.requimte.pt/laqv/" target="_blank" data-saferedirecturl="https://www.google.com/url?hl=en&amp;q=http://www.requimte.pt/laqv/&amp;source=gmail&amp;ust=1511884494937000&amp;usg=AFQjCNH0-WcrUnyL4748RufZFbe0tMvSYw">'+
                      '                 <font color="#6aa84f" face="arial, helvetica, sans-serif">LAQV - Associated Laboratory for Green Chemistry</font>'+
                      '             </a>'+
                      '         </div>'+
                      '         <div style="font-size:12.8px">'+
                      '             <font face="arial, helvetica, sans-serif">'+
                      '                 <span style="font-size:12.8px">Faculdade de Ciências e Tecnologia - Universidade Nova de Lisboa,&nbsp;</span>'+
                      '                 <br style="font-size:12.8px">'+
                      '                 <span style="font-size:12.8px">2829-516 Caparica, Portugal</span>'+
                      '                 <br style="font-size:12.8px">'+
                      '             </font>Tel: <a href="tel:+351%2021%20294%209608" value="+351212949608" target="_blank">+351 212949608</a> (ext: 10906)'+
                      '         </div>'+
                      '     </div>'+
                      ' </div>',
            };
            // send mail with defined transport object
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Message to person %s not sent due to error below.', req.body.person_id);
                    console.log(error);
                    mailError.push('Not sent to user: sending problem. Changes not saved.');
                }
                console.log('Message %s was sent to person %s with response: %s', info.messageId, req.body.person_id, info.response);
            });
        } else {
            console.log('User validation warning: email not sent for person %s',
                         req.body.person_id);
            mailError.push('Not send to user: email not defined. Changes not saved.');
        }
    } else {
        // just for testing purposes
        //mailError.push('Not sent to user: sending problem. Changes not saved.');
    }
    if (mailError.length === 0) {
        return queryUpdateFctStatus(req, res, next, mailError, 'removal');
    } else {
        sendJSONResponse(res, 400, {"status": mailError, "statusCode": 400});
        return;
    }
};

var queryUpdateFctStatus = function (req, res, next, mailError, type) {
    var personID = req.params.personID;
    var status_fct_id = req.body.status_fct_id;
    var requesterCities = permissions.geographicAccess(req.payload.stat);
    var valid_from = momentToDate(req.body.valid_from);
    var valid_until = momentToDate(req.body.valid_until);
    var querySQL = '';
    var places = [];
    if (requesterCities.indexOf(req.body.person_details.institution_city_id) !== -1) {
        if (status_fct_id === null || status_fct_id === 'new') {
            querySQL = querySQL + 'INSERT INTO status_fct' +
                              ' (person_id,unit_id,must_be_added,addition_requested,valid_from,locked)' +
                              ' VALUES (?,?,1,1,?,1);';
            places.push(personID,
                        req.body.unit_id,
                        valid_from);
        } else if (type === undefined) {
            querySQL = querySQL + 'UPDATE status_fct' +
                                  ' SET must_be_added = 1,' +
                                  ' addition_requested = 1,' +
                                  ' valid_from = ?,' +
                                  ' locked = 1' +
                                  ' WHERE id = ?;';
            places.push(valid_from, status_fct_id);
        } else {
            if (type === 'removal') {// for removing from FCT
                querySQL = querySQL + 'UPDATE status_fct' +
                                  ' SET must_be_removed = 1,' +
                                  ' removal_requested = 1,' +
                                  ' valid_until = ?' +
                                  ' WHERE id = ?;';
                places.push(valid_until,
                    req.body.status_fct_id);
            }
        }
        pool.getConnection(function(err, connection) {
            if (err) {
                sendJSONResponse(res, 500, {"status": "error connection", "statusCode": 500, "error" : err.stack});
                return;
            }
            connection.query(querySQL,places,
                function (err, resQuery) {
                    // And done with the connection.
                    connection.release();
                    if (err) {
                        sendJSONResponse(res, 400, {"status": "error SQL command", "statusCode": 400, "error" : err.stack});
                        return;
                    }
                    sendJSONResponse(res, 200, {"status": "All done!", "statusCode": 200});
                    return;
                }
            );
        });
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
        return;
    }

};

var updateStatusFCTNoEmail = function (req, res, next) {
    var personID = req.params.personID;
    var updateArr = req.body.updateStatusFCT;
    var newArr = req.body.newStatusFCT;
    var deleteArr = req.body.deleteStatusFCT;
    var requesterCities = permissions.geographicAccess(req.payload.stat);
    var querySQL = '';
    var places = [];
    if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
        sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        return;
    }
    if (requesterCities.indexOf(req.body.person_details.institution_city_id) !== -1) {
        if (updateArr.length > 0) {
            for (var el in updateArr) {
                if (updateArr[el].locked !== 1 && updateArr[el].removal_requested !== 1) {
                    querySQL = querySQL + 'UPDATE status_fct' +
                                      ' SET unit_id = ?,' +
                                      ' must_be_added = ?,' +
                                      ' valid_from = ?,' +
                                      ' must_be_removed = ?,' +
                                      ' valid_until = ?' +
                                      ' WHERE id = ?;';
                    places.push(updateArr[el].unit_id,
                                updateArr[el].must_be_added,
                                momentToDate(updateArr[el].valid_from),
                                updateArr[el].must_be_removed,
                                momentToDate(updateArr[el].valid_until),
                                updateArr[el].status_fct_id
                                );
                } else if (updateArr[el].removal_requested !== 1) {
                    querySQL = querySQL + 'UPDATE status_fct' +
                                      ' SET must_be_removed = ?,' +
                                      ' valid_until = ?' +
                                      ' WHERE id = ?;';
                    places.push(updateArr[el].must_be_removed,
                                momentToDate(updateArr[el].valid_until),
                                updateArr[el].status_fct_id
                                );
                } else if (updateArr[el].locked !== 1) {
                    querySQL = querySQL + 'UPDATE status_fct' +
                                      ' SET must_be_added = ?,' +
                                      ' valid_from = ?' +
                                      ' WHERE id = ?;';
                    places.push(updateArr[el].must_be_added,
                                momentToDate(updateArr[el].valid_from),
                                updateArr[el].status_fct_id
                                );
                }
            }
        }
        if (newArr.length > 0) {
            for (var el in newArr) {
                if (newArr[el].locked !== 1) {
                    querySQL = querySQL + 'INSERT INTO status_fct' +
                                      ' (person_id, unit_id,must_be_added,valid_from,must_be_removed,valid_until)' +
                                      ' VALUES (?,?,?,?,?,?);';
                    places.push(personID,
                                newArr[el].unit_id,
                                newArr[el].must_be_added,
                                momentToDate(newArr[el].valid_from),
                                newArr[el].must_be_removed,
                                momentToDate(newArr[el].valid_until)
                                );
                } else if (updateArr[el].removal_requested !== 1) {
                    querySQL = querySQL + 'INSERT INTO status_fct' +
                                      ' (person_id, unit_id, must_be_removed, valid_until)' +
                                      ' VALUES (?,?,?,?);';
                    places.push(personID,
                                newArr[el].unit_id,
                                newArr[el].must_be_removed,
                                momentToDate(newArr[el].valid_until)
                                );
                } else if (updateArr[el].locked !== 1) {
                    querySQL = querySQL + 'INSERT INTO status_fct' +
                                      ' (person_id, unit_id, must_be_added, valid_from)' +
                                      ' VALUES (?,?,?,?);';
                    places.push(personID,
                                newArr[el].unit_id,
                                newArr[el].must_be_added,
                                momentToDate(newArr[el].valid_from)
                                );
                }
            }
        }
        if (deleteArr.length > 0) {
            for (var el in deleteArr) {
                if (deleteArr[el].locked !== 1) {
                    querySQL = querySQL + 'DELETE FROM status_fct WHERE id = ?;';
                    places.push(deleteArr[el].status_fct_id);
                }
            }
        }
        if (querySQL === '') {
            sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
            return;
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
                    sendJSONResponse(res, 200, {"status": "All done!", "statusCode": 200});
                    return;
                }
            );
        });
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
        return;
    }
};

/*******************************************************************************/

var listAllPeopleWithRolesDataRemaining = function (req,res,next, data) {
    var querySQL = 'SELECT people.id AS person_id, people.name AS person_name, people.colloquial_name, people.birth_date, people.gender,' +
                   ' people_institution_city.city_id AS pole_id, institution_city.city AS pole_name,' +
                   ' people_roles.role_id, people_roles.id AS people_roles_id,' +
                   ' technicians_info.association_key, technicians_info.ORCID,' +
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
                    ' LEFT JOIN technicians_info ON technicians_info.person_id = people.id' +
                    ' LEFT JOIN technician_offices ON technicians.technician_office_id = technician_offices.id' +
                   ' WHERE people.status = 1' + ' AND ' + 'people_roles.role_id = ' + rolesObj['technical'] +
                   ' ORDER BY people.name';
    querySQL = querySQL + '; ';
    querySQL = querySQL + 'SELECT people.id AS person_id, people.name AS person_name, people.colloquial_name, people.birth_date, people.gender,' +
                   ' people_institution_city.city_id AS pole_id, institution_city.city AS pole_name,' +
                   ' people_roles.role_id, people_roles.id AS people_roles_id,' +
                   ' science_managers_info.association_key, science_managers_info.ORCID,' +
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
                    ' LEFT JOIN science_managers_info ON science_managers_info.person_id = people.id' +
                    ' LEFT JOIN science_manager_offices ON science_managers.science_manager_office_id = science_manager_offices.id' +
                   ' WHERE people.status = 1' + ' AND ' + 'people_roles.role_id = ' + rolesObj['scienceManagement'] +
                   ' ORDER BY people.name';
    querySQL = querySQL + '; ';
    querySQL = querySQL + 'SELECT people.id AS person_id, people.name AS person_name, people.colloquial_name, people.birth_date, people.gender,' +
                   ' people_institution_city.city_id AS pole_id, institution_city.city AS pole_name,' +
                   ' people_roles.role_id, people_roles.id AS people_roles_id,' +
                   ' administrative_info.association_key, NULL AS ORCID,' +
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
                    ' LEFT JOIN administrative_info ON administrative_info.person_id = people.id' +
                    ' LEFT JOIN administrative_offices ON people_administrative_offices.administrative_office_id = administrative_offices.id' +
                   ' WHERE people.status = 1' + ' AND ' + 'people_roles.role_id = ' + rolesObj['administrative'] +
                   ' ORDER BY people.name';
    querySQL = querySQL + '; ';
    var places = [];
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
                var result = [];
                result.push(data);
                for (var el in rowsQuery) {
                    result.push(rowsQuery[el]);
                }
                return getMoreInfo(req, res, next, result, 0, 0);
            }
        );
    });

};

/******************** Call SQL Generators after Validations *******************/

module.exports.listAllPeopleWithRolesData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            var places = [];
            var querySQL = 'SELECT people.id AS person_id, people.name AS person_name, people.colloquial_name, people.birth_date, people.gender,' +
                           ' people_institution_city.city_id AS pole_id, institution_city.city AS pole_name,' +
                           ' people_roles.role_id, people_roles.id AS people_roles_id,' +
                           ' researchers.association_key, researchers.ciencia_id, researchers.ORCID,' +
                           ' people_labs.lab_id,' +
                           ' labs.name AS lab,' +
                           ' labs.started AS lab_opened, labs.finished AS lab_closed,' +
                           ' labs_groups.valid_from AS labs_groups_valid_from, labs_groups.valid_until AS labs_groups_valid_until,' +
                           ' people_labs.dedication AS dedication,' +
                           ' people_labs.valid_from AS valid_from, people_labs.valid_until AS valid_until,' +
                           ' people_labs.lab_position_id AS position_id, people_labs.sort_order,' +
                           ' people_labs.id AS people_labs_id,' +
                           ' groups.id AS group_id,' +
                           ' units.id AS unit_id ' +
                           ' FROM people' +
                            ' LEFT JOIN people_institution_city ON people_institution_city.person_id = people.id' +
                            ' LEFT JOIN institution_city ON people_institution_city.city_id = institution_city.id' +
                            ' LEFT JOIN people_roles ON people_roles.person_id = people.id' +
                            ' LEFT JOIN people_labs ON people_labs.person_id = people.id' +
                            ' LEFT JOIN researchers ON researchers.person_id = people.id' +
                            ' LEFT JOIN labs ON people_labs.lab_id = labs.id' +
                            ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                            ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                            ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                            ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                           ' WHERE people.status = 1' + ' AND ' + 'people_roles.role_id = ' + rolesObj['scientific'] +
                           ' ORDER BY people.name';
            querySQL = querySQL + '; ';
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
                        return listAllPeopleWithRolesDataRemaining(req,res,next, rowsQuery);
                    }
                );
            });
        }
    );
};

module.exports.listAllPeopleNoRolesData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
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
    getUser(req, res, [0, 5, 10, 15, 16],
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
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            getLocation(req, res, next, queryUpdateAllPeopleData);
        }
    );
};

module.exports.validatePerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            queryValidatePerson(req,res,next);
        }
    );
};

module.exports.sendAdditionEmail = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            sendAdditionEmail(req,res,next);
        }
    );
};

module.exports.sendRemovalEmail = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            sendRemovalEmail(req,res,next);
        }
    );
};

module.exports.updateStatusFCT = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            updateStatusFCTNoEmail(req,res,next);
        }
    );
};

module.exports.passwordReset = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            queryPasswordReset(req,res,next);
        }
    );
};

module.exports.updateUserPermissions = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            queryUpdateUserPermissions(req,res,next);
        }
    );
};
