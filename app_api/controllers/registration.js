var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
const nodemailer = require('../controllers/emailer');
let transporter = nodemailer.transporter;
var userModule = require('../models/users');
var permissions = require('../config/permissions');

/**************************** Utility Functions *******************************/

var getLocation = function(req, res, next) {
    // gets city associated with resource (person) to be altered
    var requesterCities = permissions.geographicAccess(req.payload.stat);
    var newUserInstitutionCity = req.body.institution_city.id;
    if (requesterCities.indexOf(newUserInstitutionCity) !== -1) {
        return queryAddUser(req,res,next);
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
        return;
    }
/*
    // get geographical location of resource
    var queryLocation = "SELECT city_id FROM people_institution_city WHERE person_id = ?";
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        // Use the connection
        connection.query( queryLocation, [personID], function(err, userCity) {
            if (err) {
                sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                return;
            }
            //connection.release();
            return callback(req,res,next,userCity);
            // And done with the connection.
        });
    });
*/
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
                // these permissions are in terms of access to functionalities
                // there are 2 additional layers:
                // - geographic location
                // - teams
                if (req.payload.personID !== req.params.personID
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

var sendJSONResponse = function(res, status, content) {
    res.status(status);
    res.json(content);
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

/***************************** Query Functions ********************************/

var queryAddPerson = function (req, res, next, userID, created) {
    var changed_by = req.body.changed_by;
    var queryPerson = 'INSERT INTO `people` (`user_id`,`name`,`colloquial_name`,`gender`,`birth_date`,`active_from`,`status`) ' +
                    'VALUES (?,?,?,?,?,?,?);';
    var name = req.body.name;
    var colloquialName = req.body.colloquialName;
    var gender = req.body.gender;
    var birth_date = momentToDate(req.body.birth_date);
    var active_from = momentToDate(req.body.earliest_date);
    var stat = 1; // this is the status on `people` table refering to user being OK
    var places = [userID,name,colloquialName,gender,birth_date,active_from,stat];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(queryPerson, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var personID = resQuery.insertId;
                return queryAddPersonHistory(req, res, next, userID, personID, name, colloquialName,
                                             gender,birth_date,active_from,stat, created, changed_by);
            }
        );
    });
};

var queryAddPersonHistory = function (req, res, next, userID, personID,
                                      name, colloquialName,gender,birth_date,active_from,stat,
                                      created, changed_by) {
    var query = 'INSERT INTO `people_history` ' +
                    '(`person_id`,`user_id`,`name`,`colloquial_name`,' +
                     '`gender`,`birth_date`,`active_from`,`status`,`created`,`operation`,`changed_by`) ' +
                    'VALUES (?,?,?,?,?,?,?,?,?,?,?);';
    var places = [personID,userID,name,colloquialName,gender,birth_date,
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
                var office, dep;
                if (req.body.jobs.length > 0) {
                    var job = req.body.jobs[0];
                    return queryAddJob(req,res,next,userID,personID,job,0,'',[],created,changed_by);
                } else if (req.body.researcher_data.affiliation_lab.length > 0) {
                    var lab = req.body.researcher_data.affiliation_lab[0];
                    return queryAddLab(req,res,next,userID,personID,lab,0,'',[],created,changed_by);
                } else if (req.body.technician_data.office.length > 0) {
                    office = req.body.technician_data.office[0];
                    return queryAddTechnician(req, res, next, userID, personID, office, 0,
                                              '', [], created, changed_by);
                } else if (req.body.science_manager_data.office.length > 0) {
                    office = req.body.science_manager_data.office[0];
                    return queryAddScienceManager(req, res, next, userID, personID, office, 0,
                                              '', [], created, changed_by);
                } else if (req.body.administrative_data.office.length > 0) {
                    office = req.body.administrative_data.office[0];
                    return queryAddAdministrative(req, res, next, userID, personID, office, 0,
                                              '', [], created, changed_by);
                } else if (req.body.affiliationsDepartment.length > 0){
                    dep = req.body.affiliationsDepartment[0];
                    return queryAddDepartment(req, res, next, userID, personID,'',[], dep, 0,
                                            created,changed_by);
                } else {
                    return queryAddRemainingInfo(req,res,next,userID,personID,'',[],
                                            created,changed_by);
                }
            }
        );
    });
};

var queryAddRole = function (req, res, next,userID, personID,role, querySQL, places,
                             created, changed_by) {
    var roleID;
    if (role === 'lab') {
        roleID = 1;
    } else if (role === 'technician') {
        roleID = 2;
    } else if (role === 'scienceManager') {
        roleID = 3;
    } else if (role === 'administrative') {
        roleID = 4;
    }
    var query = 'INSERT INTO `people_roles`' +
                          ' (`person_id`,`role_id`)' +
                          ' SELECT ?,? FROM DUAL' +
                          ' WHERE NOT EXISTS (' +
                          'SELECT * FROM `people_roles` WHERE person_id = ? AND role_id = ?);';
    var placeholders = [personID,roleID,personID,roleID];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(query,placeholders,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var office,dep;
                if (role === 'lab') {
                    //moves on to the next roles
                    if (req.body.technician_data.office.length > 0) {
                        office = req.body.technician_data.office[0];
                        return queryAddTechnician(req, res, next, userID, personID, office, 0,
                                                  querySQL, places, created, changed_by);
                    } else if (req.body.science_manager_data.office.length > 0) {
                        office = req.body.science_manager_data.office[0];
                        return queryAddScienceManager(req, res, next, userID, personID, office, 0,
                                                  querySQL, places, created, changed_by);
                    } else if (req.body.administrative_data.office.length > 0) {
                        office = req.body.administrative_data.office[0];
                        return queryAddAdministrative(req, res, next, userID, personID, office, 0,
                                                  querySQL, places, created, changed_by);
                    } else if (req.body.affiliationsDepartment.length > 0){
                        dep = req.body.affiliationsDepartment[0];
                        return queryAddDepartment(req, res, next, userID, personID, querySQL,places, dep, 0, created,changed_by);
                    } else {
                        return queryAddRemainingInfo(req,res,next,userID,personID,querySQL,places,created,changed_by);
                    }
                } else if (role === 'technician') {
                     if (req.body.science_manager_data.office.length > 0) {
                        office = req.body.science_manager_data.office[0];
                        return queryAddScienceManager(req, res, next, userID, personID, office, 0,
                                                  querySQL, places, created, changed_by);
                    } else if (req.body.administrative_data.office.length > 0) {
                        office = req.body.administrative_data.office[0];
                        return queryAddAdministrative(req, res, next, userID, personID, office, 0,
                                                  querySQL, places, created, changed_by);
                    } else if (req.body.affiliationsDepartment.length > 0){
                        dep = req.body.affiliationsDepartment[0];
                        return queryAddDepartment(req, res, next, userID, personID, querySQL,places, dep, 0, created,changed_by);
                    } else {
                        return queryAddRemainingInfo(req,res,next,userID,personID,querySQL,places,created,changed_by);
                    }
                } else if (role === 'scienceManager') {
                    if (req.body.administrative_data.office.length > 0) {
                        office = req.body.administrative_data.office[0];
                        return queryAddAdministrative(req, res, next, userID, personID, office, 0,
                                                  querySQL, places, created, changed_by);
                    } else if (req.body.affiliationsDepartment.length > 0){
                        dep = req.body.affiliationsDepartment[0];
                        return queryAddDepartment(req, res, next, userID, personID, querySQL,places, dep, 0, created,changed_by);
                    } else {
                        return queryAddRemainingInfo(req,res,next,userID,personID,querySQL,places,created,changed_by);
                    }
                } else if (role === 'administrative') {
                    if (req.body.affiliationsDepartment.length > 0){
                        dep = req.body.affiliationsDepartment[0];
                        return queryAddDepartment(req, res, next, userID, personID, querySQL,places, dep, 0, created,changed_by);
                    } else {
                        return queryAddRemainingInfo(req,res,next,userID,personID,querySQL,places,created,changed_by);
                    }
                }
            }
        );
    });
};

var queryAddLab = function (req, res, next,userID, personID, data, i, querySQL, places,
                            created, changed_by) {
    var query = 'INSERT INTO `people_labs` (`person_id`,`lab_id`,`lab_position_id`,`dedication`,`valid_from`,`valid_until`) ' +
                    'VALUES (?,?,?,?,?,?);';
    var placeholders = [personID, data.lab_id, data.lab_position_id,
                data.dedication, momentToDate(data.start), momentToDate(data.end)];
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
                var officeID = resQuery.insertId;
                return queryAddLabHistory(req, res, next,userID, personID, officeID, data, i, querySQL, places,
                                          created, changed_by);
            }
        );
    });
};

var queryAddLabHistory = function (req, res, next,userID, personID, officeID, data, i, querySQL, places,
                                   created, changed_by) {
    var query = 'INSERT INTO `people_labs_history`' +
              ' (`people_labs_id`,`person_id`,`lab_id`,`lab_position_id`,`dedication`,'+
                '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
              ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    var placeholders = [officeID,personID, data.lab_id, data.lab_position_id,data.dedication,
                momentToDate(data.start),momentToDate(data.end),
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
                if (i + 1 < req.body.researcher_data.affiliation_lab.length) {
                    var lab = req.body.researcher_data.affiliation_lab[i+1];
                    return queryAddLab(req,res,next,userID,personID,lab,i+1,querySQL,places,created,changed_by);
                } else {
                    return queryAddResearcher(req,res,next,userID,personID, querySQL, places,created,changed_by);
                }
            }
        );
    });
};

var queryAddResearcher = function (req, res, next,userID, personID, querySQL, places,
                            created, changed_by) {
    var researcherAssociationKey = req.body.researcher_data.association_key;
    var researcherResearcherID = req.body.researcher_data.researcherID;
    var researcherORCID = req.body.researcher_data.ORCID;
    var researcherScopusID = req.body.researcher_data.scopusID;
    var integrated = req.body.researcher_data.integrated;
    var pluriannual = req.body.researcher_data.pluriannual;
    var nuclearCV = req.body.researcher_data.nuclearCV;
    var query = 'INSERT INTO `researchers` (`person_id`,`researcherID`,`ORCID`,`scopusID`,`association_key`,`pluriannual`,`integrated`,`nuclearCV`) ' +
                    'VALUES (?,?,?,?,?,?,?,?);';
    var placeholders = [personID, researcherResearcherID,researcherORCID, researcherScopusID,
                            researcherAssociationKey, pluriannual, integrated, nuclearCV];
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
                var resID = resQuery.insertId;
                return queryAddResearcherHistory(req, res, next,userID, personID, resID, querySQL, places,
                                          created, changed_by);
            }
        );
    });
};

var queryAddResearcherHistory = function (req, res, next,userID, personID, resID, querySQL, places,
                                   created, changed_by) {
    var researcherAssociationKey = req.body.researcher_data.association_key;
    var researcherResearcherID = req.body.researcher_data.researcherID;
    var researcherORCID = req.body.researcher_data.ORCID;
    var researcherScopusID = req.body.researcher_data.scopusID;
    var integrated = req.body.researcher_data.integrated;
    var pluriannual = req.body.researcher_data.pluriannual;
    var nuclearCV = req.body.researcher_data.nuclearCV;
    var query = 'INSERT INTO `researchers_history`' +
                '(`researcher_id`,`person_id`,`researcherID`,`ORCID`,`scopusID`,`association_key`,' +
                '`pluriannual`,`integrated`,`nuclearCV`,`created`,`operation`,`changed_by`) ' +
                    'VALUES (?,?,?,?,?,?,?,?,?,?,?,?);';
    var placeholders = [resID,personID, researcherResearcherID,researcherORCID, researcherScopusID,
                        researcherAssociationKey, pluriannual, integrated, nuclearCV,
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
                return queryAddRole(req,res,next,userID,personID,'lab', querySQL, places,created,changed_by);
            }
        );
    });
};

var queryAddTechnician = function (req, res, next,userID, personID, data, i, querySQL, places,
                            created, changed_by) {
    var query = 'INSERT INTO `technicians`' +
                 ' (`person_id`,`technician_office_id`,`technician_position_id`,`dedication`,`valid_from`,`valid_until`)' +
                 ' VALUES (?,?,?,?,?,?);';
    var placeholders = [personID, data.office_id, data.office_position_id,
                data.dedication, momentToDate(data.start), momentToDate(data.end)];
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
                var officeID = resQuery.insertId;
                return queryAddTechnicianHistory(req, res, next,userID, personID, officeID, data, i, querySQL, places,
                                          created, changed_by);
            }
        );
    });
};

var queryAddTechnicianHistory = function (req, res, next,userID, personID, officeID, data, i, querySQL, places,
                                   created, changed_by) {
    var query = 'INSERT INTO `technicians_history`' +
                  ' (`technician_id`,`person_id`,`technician_office_id`,`technician_position_id`,`dedication`,'+
                    '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    var placeholders = [officeID,personID, data.office_id, data.office_position_id,data.dedication,
                momentToDate(data.start),momentToDate(data.end),
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
                if (i + 1 < req.body.technician_data.office.length) {
                    var office = req.body.technician_data.office[i+1];
                    return queryAddTechnician(req,res,next,userID,personID,office,i+1,querySQL,places,created,changed_by);
                } else {
                    return queryAddRole(req,res,next,userID,personID,'technician', querySQL, places,created,changed_by);
                }
            }
        );
    });
};
var queryAddScienceManager = function (req, res, next,userID, personID, data, i, querySQL, places,
                            created, changed_by) {
    var query = 'INSERT INTO `science_managers`' +
                 ' (`person_id`,`science_manager_office_id`,`science_manager_position_id`,`dedication`,`valid_from`,`valid_until`)' +
                 ' VALUES (?,?,?,?,?,?);';
    var placeholders = [personID, data.office_id, data.office_position_id,
                data.dedication, momentToDate(data.start), momentToDate(data.end)];
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
                var officeID = resQuery.insertId;
                return queryAddScienceManagerHistory(req, res, next,userID, personID, officeID, data, i,
                                                querySQL, places, created, changed_by);
            }
        );
    });
};

var queryAddScienceManagerHistory = function (req, res, next,userID, personID, officeID, data, i, querySQL, places,
                                   created, changed_by) {
    var query = 'INSERT INTO `science_managers_history`' +
                  ' (`science_managers_id`,`person_id`,`science_manager_office_id`,`science_manager_position_id`,`dedication`,'+
                    '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                  ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    var placeholders = [officeID,personID, data.office_id, data.office_position_id,data.dedication,
                momentToDate(data.start),momentToDate(data.end),
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
                if (i + 1 < req.body.science_manager_data.office.length) {
                    var office = req.body.science_manager_data.office[i+1];
                    return queryAddScienceManager(req,res,next,userID,personID,office,i+1,querySQL,places,created,changed_by);
                } else {
                    return queryAddRole(req,res,next,userID,personID,'scienceManager', querySQL, places,created,changed_by);
                }
            }
        );
    });
};

var queryAddAdministrative = function (req, res, next,userID, personID, data, i, querySQL, places,
                            created, changed_by) {
    var query = 'INSERT INTO `people_administrative_offices` (`person_id`,`administrative_office_id`,`administrative_position_id`,`dedication`,`valid_from`,`valid_until`) ' +
                    'VALUES (?,?,?,?,?,?);';
    var placeholders = [personID, data.office_id, data.office_position_id,
                data.dedication, momentToDate(data.start), momentToDate(data.end)];
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
                var officeID = resQuery.insertId;
                return queryAddAdministrativeHistory(req, res, next,userID, personID, officeID, data, i, querySQL, places,
                                          created, changed_by);
            }
        );
    });
};

var queryAddAdministrativeHistory = function (req, res, next,userID, personID, officeID, data, i, querySQL, places,
                                   created, changed_by) {
    var query = 'INSERT INTO `people_administrative_offices_history`' +
                ' (`people_administrative_offices_id`,`person_id`,`administrative_office_id`,`administrative_position_id`,`dedication`,'+
                  '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    var placeholders = [officeID,personID, data.office_id, data.office_position_id,data.dedication,
                        momentToDate(data.start),momentToDate(data.end),
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
                if (i + 1 < req.body.administrative_data.office.length) {
                    var office = req.body.administrative_data.office[i+1];
                    return queryAddAdministrative(req,res,next,userID,personID,office,i+1,querySQL,places,created,changed_by);
                } else {
                    return queryAddRole(req,res,next,userID,personID,'administrative', querySQL, places,created,changed_by);
                }
            }
        );
    });
};

var queryAddDepartment = function (req, res, next,userID, personID, querySQL, places, data, i,
                                   created, changed_by) {
    var query = 'INSERT INTO `people_departments` (`person_id`,`department_id`,`valid_from`,`valid_until`) ' +
                'VALUES (?,?,?,?);';
    var placeholders = [personID, data.department_id,
                momentToDate(data.start), momentToDate(data.end)];
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
                var depID = resQuery.insertId;
                return queryAddDepartmentHistory(req, res, next,userID, personID, depID, data, i, querySQL, places,
                                          created, changed_by);
            }
        );
    });
};

var queryAddDepartmentHistory = function (req, res, next,userID, personID, depID, data, i, querySQL, places,
                                   created, changed_by) {
    var query = 'INSERT INTO `people_departments_history`' +
            ' (`people_departments_id`,`person_id`,`department_id`,'+
              '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
            ' VALUES (?,?,?,?,?,?,?,?);';
    var placeholders = [depID,personID,
                data.department_id,momentToDate(data.start),momentToDate(data.end),
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
                if (i + 1 < req.body.affiliationsDepartment.length) {
                    var dep = req.body.affiliationsDepartment[i+1];
                    return queryAddDepartment(req, res, next, userID, personID, querySQL,places, dep, i+1, created,changed_by);
                } else {
                    return queryAddRemainingInfo(req,res,next,userID,personID,querySQL,places,created,changed_by);
                }
            }
        );
    });
};

var queryAddRemainingInfo = function (req, res, next, userID, personID, querySQL, places,
                                      created, changed_by) {
    var responsibles = req.body.responsibles;
    var nationalities = req.body.nationalities;
    var address = req.body.address;
    var postalCode = req.body.postal_code;
    var city = req.body.city;
    var personalPhone = req.body.personal_phone;
    var personalEmail = req.body.personal_email;
    var workPhone = req.body.work_phone;
    var workEmail = req.body.work_email;
    var institutionCity = req.body.institution_city.id;
    var institutionCityName = req.body.institution_city.city;
    var roles = req.body.roles;
    var managerAssociationKey = req.body.science_manager_data.association_key;
    var managerResearcherID = req.body.science_manager_data.researcherID;
    var managerORCID = req.body.science_manager_data.ORCID;
    var technicianAssociationKey = req.body.technician_data.association_key;
    var technicianResearcherID = req.body.technician_data.researcherID;
    var technicianORCID = req.body.technician_data.ORCID;
    var administrativeAssociationKey = req.body.administrative_data.association_key;

    //responsibles
    for (var ind in responsibles) {
        querySQL = querySQL +
                    'INSERT INTO `people_responsibles` (`person_id`,`responsible_id`,`valid_from`,`valid_until`) ' +
                    'VALUES (?,?,?,?);';
        places.push(personID, responsibles[ind].responsible_id,
                    momentToDate(responsibles[ind].valid_from),
                    momentToDate(responsibles[ind].valid_until));
    }


    //nationalities
    for (var ind in nationalities) {
        querySQL = querySQL +
                    'INSERT INTO `people_countries` (`person_id`,`country_id`) ' +
                    'VALUES (?,?);';
        places.push(personID, nationalities[ind].country_id);
    }
    //personal_addresses
    querySQL = querySQL +
                'INSERT INTO `personal_addresses` (`person_id`,`address`,`postal_code`,`city`) ' +
                'VALUES (?,?,?,?);';
    places.push(personID, address, postalCode, city);
    //personal_phones
    querySQL = querySQL +
                'INSERT INTO `personal_phones` (`person_id`,`phone`) ' +
                'VALUES (?,?);';
    places.push(personID, personalPhone[0]);
    //personal_emails
    querySQL = querySQL +
                'INSERT INTO `personal_emails` (`person_id`,`email`) ' +
                'VALUES (?,?);';
    places.push(personID, personalEmail[0]);
    //work_phones
    querySQL = querySQL +
                'INSERT INTO `phones` (`person_id`,`phone`,`extension`) ' +
                'VALUES (?,?,?);';
    places.push(personID, workPhone[0].phone, workPhone[0].extension);
    //work_emails
    querySQL = querySQL +
                'INSERT INTO `emails` (`person_id`,`email`) ' +
                'VALUES (?,?);';
    places.push(personID, workEmail[0]);
    //institution_city
    querySQL = querySQL +
                'INSERT INTO `people_institution_city` (`person_id`,`city_id`, `valid_from`) ' +
                'VALUES (?,?,?);';
    places.push(personID, institutionCity,
            momentToDate(req.body.earliest_date));
    // save researcher, technician, science_manager and administrative data to corresponding tables
    for (var ind in roles) {
        if (roles[ind].name_en === 'Scientific') {
            // already added to DB
        } else if (roles[ind].name_en === 'Technical') {
            querySQL = querySQL +
                    'INSERT INTO `technicians_info` (`person_id`,`researcherID`,`association_key`,`ORCID`) ' +
                    'VALUES (?,?,?,?);';
            places.push(personID, technicianResearcherID, technicianAssociationKey, technicianORCID);
        } else if (roles[ind].name_en === 'Science management') {
            querySQL = querySQL +
                    'INSERT INTO `science_managers_info` (`person_id`,`researcherID`,`association_key`,`ORCID`) ' +
                    'VALUES (?,?,?,?);';
            places.push(personID, managerResearcherID, managerAssociationKey, managerORCID);
        } else if (roles[ind].name_en === 'Administrative') {
            querySQL = querySQL +
                    'INSERT INTO `administrative_info` (`person_id`,`association_key`) ' +
                    'VALUES (?,?);';
            places.push(personID, administrativeAssociationKey);
        }
    }
    if (process.env.NODE_ENV === 'production') {
        var recipients;
        if (institutionCityName === 'Lisboa') {
            recipients = 'tsc@fct.unl.pt, jd.ribeiro@fct.unl.pt, jasl@fct.unl.pt, dq.helpdesk@fct.unl.pt';
        } else if (institutionCityName === 'Porto') {
            recipients = 'josecbraga@gmail.com'; // TODO: Change this!!!!
        }
        let mailOptions = {
            from: '"Admin" <admin@laqv-ucibio.info>', // sender address
            to: recipients, // list of receivers (comma-separated)
            subject: 'New user added to database: ' + req.body.name, // Subject line
            text: 'Hi,\n\n' +
                  'The relevant data for this user is:\n\n' +
                  'Name: ' + (req.body.name) + '\n' +
                  'Work Email: ' + (req.body.work_email === null ? 'N/A' : req.body.work_email) + '\n' +
                  'Personal Email: ' + (req.body.personal_email=== null ? 'N/A' : req.body.personal_email) + '\n\n' +
                  'Check further details on web app.\n\n' +
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
    escapedQuery(querySQL, places, req, res, next);
};

var queryAddJob = function (req, res, next,userID, personID, job, i, querySQL, places,
                            created, changed_by) {
    var queryJob = 'INSERT INTO `jobs` (`person_id`,`situation_id`,`category_id`,`organization`,`dedication`,`valid_from`,`valid_until`) ' +
                    'VALUES (?,?,?,?,?,?,?);';
    var situationID = job.situation.id;
    var categoryID = job.category_id;
    var organization = job.organization !== null ? job.organization : job.unit.name;
    var dedication = job.dedication;
    var start = momentToDate(job.start);
    var end = momentToDate(job.end);
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(queryJob,[personID, situationID, categoryID, organization,dedication,start, end],
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var jobID = resQuery.insertId;
                if (job.situation.requires_fellowship === 1 || job.situation.requires_unit_contract === 1) {
                    return queryAddContract(req,res,next,userID, personID,job, jobID, i, querySQL,places,created,changed_by);
                } else {
                    if (i + 1 < req.body.jobs.length) {
                        job = req.body.jobs[i + 1];
                        return queryAddJob(req,res,next,userID,personID,job,i + 1,querySQL, places,created,changed_by);
                    } else {
                        var office, dep;
                        if (req.body.researcher_data.affiliation_lab.length > 0) {
                            var lab = req.body.researcher_data.affiliation_lab[0];
                            return queryAddLab(req,res,next,userID,personID,lab,0,querySQL,places,created,changed_by);
                        } else if (req.body.technician_data.office.length > 0) {
                            office = req.body.technician_data.office[0];
                            return queryAddTechnician(req, res, next, userID, personID, office, 0,
                                                      querySQL,places, created, changed_by);
                        } else if (req.body.science_manager_data.office.length > 0) {
                            office = req.body.science_manager_data.office[0];
                            return queryAddScienceManager(req, res, next, userID, personID, office, 0,
                                                      querySQL,places, created, changed_by);
                        } else if (req.body.administrative_data.office.length > 0) {
                            office = req.body.administrative_data.office[0];
                            return queryAddAdministrative(req, res, next, userID, personID, office, 0,
                                                      querySQL,places, created, changed_by);
                        } else if (req.body.affiliationsDepartment.length > 0){
                            dep = req.body.affiliationsDepartment[0];
                            return queryAddDepartment(req, res, next, userID, personID,querySQL,places, dep, 0,
                                                    created,changed_by);
                        } else {
                            return queryAddRemainingInfo(req,res,next,userID,personID,querySQL,places,
                                                    created,changed_by);
                        }
                    }
                }
            }
        );
    });
};

var queryAddContract = function (req,res,next,userID, personID, job, jobID, i, querySQL,places,
                                created, changed_by) {
    var queryContract;
    var placesContract;
    if (job.situation.requires_fellowship === 1) {
        queryContract = 'INSERT INTO `fellowships` (`fellowship_type_id`,`reference`,`start`,`end`,`maximum_extension`) ' +
                         'VALUES (?,?,?,?,?);';
        placesContract = [job.fellowship_type_id,job.reference,
                           momentToDate(job.start),momentToDate(job.end),momentToDate(job.maximum_end)];
    } else if (job.situation.requires_unit_contract === 1) {
        queryContract = 'INSERT INTO `contracts` (`reference`,`start`,`end`,`maximum_extension`) ' +
                         'VALUES (?,?,?,?);';
        placesContract = [job.reference,
                           momentToDate(job.start),momentToDate(job.end),momentToDate(job.maximum_end)];
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(queryContract,placesContract,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var contractID = resQuery.insertId;
                return queryJobContractDetails(req,res,next,userID, personID,job, jobID, contractID, i,
                                               querySQL,places,created,changed_by);
            }
        );
    });
};

var queryJobContractDetails = function (req,res, next, userID, personID,job, jobID, contractID, i, querySQL, places,
                                        created, changed_by) {
    if (job.situation.requires_fellowship === 1) {
        querySQL = querySQL + 'INSERT INTO `jobs_fellowships` (`job_id`,`fellowship_id`) VALUES (?,?);' +
                              'INSERT INTO `fellowships_funding_agencies` (`fellowship_id`,`funding_agency_id`) VALUES (?,?);' +
                              'INSERT INTO `fellowships_management_entities` (`fellowship_id`,`management_entity_id`) VALUES (?,?);';
        places.push(jobID, contractID,
                    contractID, job.funding_agency_id,
                    contractID, job.management_entity_id);
    } else if (job.situation.requires_unit_contract === 1) {
        querySQL = querySQL + 'INSERT INTO `jobs_contracts` (`job_id`,`contract_id`) VALUES (?,?);';
        places.push(jobID, contractID);
    }
    if (i + 1 < req.body.jobs.length) {
        job = req.body.jobs[i + 1];
        return queryAddJob(req,res,next,userID,personID,job,i + 1,querySQL, places,created,changed_by);
    } else {
        var office,dep;
        if (req.body.researcher_data.affiliation_lab.length > 0) {
            var lab = req.body.researcher_data.affiliation_lab[0];
            return queryAddLab(req,res,next,userID,personID,lab,0,
                               querySQL,places,created,changed_by);
        } else if (req.body.technician_data.office.length > 0) {
            office = req.body.technician_data.office[0];
            return queryAddTechnician(req, res, next, userID, personID, office, 0,
                                querySQL,places, created, changed_by);
        } else if (req.body.science_manager_data.office.length > 0) {
            office = req.body.science_manager_data.office[0];
            return queryAddScienceManager(req, res, next, userID, personID, office, 0,
                                querySQL,places, created, changed_by);
        } else if (req.body.administrative_data.office.length > 0) {
            office = req.body.administrative_data.office[0];
            return queryAddAdministrative(req, res, next, userID, personID, office, 0,
                                querySQL,places, created, changed_by);
        }  else if (req.body.affiliationsDepartment.length > 0){
            dep = req.body.affiliationsDepartment[0];
            return queryAddDepartment(req, res, next, userID, personID, querySQL,places, dep, 0, created,changed_by);
        } else {
            return queryAddRemainingInfo(req,res,next,userID,personID,querySQL,places,created,changed_by);
        }
    }
};

var queryAddUser = function (req, res, next) {
    var queryUser = 'INSERT INTO `users` (`username`,`password`,`status`,`created`) ' +
                    'VALUES (?,?,?,?);';
    var username = req.body.username;
    var password = userModule.hashPassword(req.body.password);
    var stat = req.body.permissions.permissions_id;
    var dateNow = moment.tz('Europe/Lisbon').format('YYYY-MM-DD HH:mm:ss');
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(queryUser,[username, password, stat, dateNow],
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                var userID = resQuery.insertId;
                return queryAddPerson(req, res, next, userID, dateNow);
            }
        );
    });
};


/******************** Call SQL Generators after Validations *******************/

module.exports.addPerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            getLocation(req, res, next);
        }
    );
};