var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
const nodemailer = require('../controllers/emailer');
let transporter = nodemailer.transporter;
var userModule = require('../models/users');

/**************************** Utility Functions *******************************/
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

var getUser = function (req, res, next, permissions, callback) {
    if (req.payload && req.payload.username) {
        var username = req.payload.username;
        // select only users that are pre-registering
        // after pre-registering same user cannot register
        pool.query(
            'SELECT * FROM users' +
            ' LEFT JOIN people ON users.id = people.user_id' +
            ' WHERE users.username = ? AND people.status = 2',
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
                return callback(req, res, next);
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
        // this will OK only if each row of newRows is different
        for (var ind in newRows) {
            Object.assign(row,newRows[ind]);
        }
        return row;
    }
}

/***************************** Query Functions ********************************/

var queryUpdateUser = function (req, res, next) {
    var userID = req.body.user_id;
    var username = req.body.username;
    var password = req.body.password;
    var hashedPassword = userModule.hashPassword(password);
    // status will only be changed by the manager in the end of the process
    var queryPerson = 'UPDATE `users`' +
                      ' SET `username` = ?' +
                      ', `password` = ?' +
                      ' WHERE `id` = ?;';
    var places = [username, hashedPassword,userID];
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
                return queryUpdatePerson(req, res, next);
            }
        );
    });
};

var queryUpdatePerson = function (req, res, next) {
    var personID = req.body.id;
    var userID = req.body.changed_by;
    var updated = moment.tz('Europe/Lisbon').format('YYYY-MM-DD HH:mm:ss');
    var created = updated;
    var changed_by = req.body.changed_by;
    var name = req.body.name;
    var colloquialName = req.body.colloquialName;
    var gender = req.body.gender;
    var birth_date = momentToDate(req.body.birth_date);
    var active_from = momentToDate(req.body.earliest_date);
    // status will only be changed by the manager in the end of the process
    var queryPerson = 'UPDATE `people`' +
                      ' SET `name` = ?' +
                      ', `colloquial_name` = ?' +
                      ', `gender` = ?' +
                      ', `birth_date` = ?' +
                      ', `active_from` = ?' +
                      ' WHERE `id` = ?;';
    var places = [name,colloquialName,gender,birth_date,active_from,personID];
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
                return queryAddPersonHistory(req, res, next, userID, personID, name, colloquialName,
                                             gender,birth_date,active_from,updated,created, changed_by);
            }
        );
    });
};

var queryAddPersonHistory = function (req, res, next, userID, personID,
                                      name, colloquialName,gender,birth_date,active_from,
                                      updated,created, changed_by) {
    var query = 'INSERT INTO `people_history` ' +
                    '(`person_id`,`user_id`,`name`,`colloquial_name`,' +
                     '`gender`,`birth_date`,`active_from`,`status`,`created`,`operation`,`changed_by`) ' +
                    'VALUES (?,?,?,?,?,?,?,?,?,?,?);';
    var places = [personID,userID,name,colloquialName,gender,birth_date,
                  active_from,2,updated,'U',changed_by];
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
                var dep;
                var hasLabAffiliation = false;
                var hasTechnicianAffiliation = false;
                var hasScienceManagerAffiliation = false;
                var hasAdministrativeAffiliation = false;
                for (var ind in req.body.lab_data) {
                    if (req.body.lab_data[ind].lab_id !== null) {
                        hasLabAffiliation = true;
                    }
                }
                for (var ind in req.body.technician_offices) {
                    if (req.body.technician_offices[ind].tech_id !== null) {
                        hasTechnicianAffiliation = true;
                    }
                }
                for (var ind in req.body.science_manager_offices) {
                    if (req.body.science_manager_offices[ind].sc_man_id !== null) {
                        hasScienceManagerAffiliation = true;
                    }
                }
                for (var ind in req.body.administrative_offices) {
                    if (req.body.administrative_offices[ind].adm_id !== null) {
                        hasAdministrativeAffiliation = true;
                    }
                }
                if (req.body.jobs.length > 0) {
                    var job = req.body.jobs[0];
                    return queryAddJob(req,res,next,userID,personID,job,0,'',[],
                                hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                created,changed_by);
                } else if (hasLabAffiliation) {
                    return queryAddResearcher(req,res,next,userID,personID,'',[],
                                hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                created,changed_by);
                } else if (req.body.affiliationsDepartment.length > 0){
                    dep = req.body.affiliationsDepartment[0];
                    return queryAddDepartment(req, res, next, userID, personID,'',[],dep, 0,
                                            hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                            created,changed_by);
                } else {
                    return queryAddRemainingInfo(req,res,next,userID,personID,'',[],
                                            hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                            created,changed_by);
                }
            }
        );
    });
};

var queryAddResearcher = function (req, res, next,userID, personID, querySQL, places,
                            hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                            created, changed_by) {
    var researcherAssociationKey = req.body.researcher_data[0].association_key;
    var researcherResearcherID = req.body.researcher_data[0].researcherID;
    var researcherORCID = req.body.researcher_data[0].ORCID;
    var researcherScopusID = req.body.researcher_data[0].scopusID;
    var integrated = req.body.researcher_data[0].integrated;
    var pluriannual = req.body.researcher_data[0].pluriannual;
    var nuclearCV = req.body.researcher_data[0].nuclearCV;
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
                                          hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                          created, changed_by);
            }
        );
    });
};

var queryAddResearcherHistory = function (req, res, next,userID, personID, resID, querySQL, places,
                                   hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
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
                if (req.body.affiliationsDepartment.length > 0){
                    var dep = req.body.affiliationsDepartment[0];
                    return queryAddDepartment(req, res, next, userID, personID, querySQL,places,dep, 0,
                                            hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                            created,changed_by);
                } else {
                    return queryAddRemainingInfo(req,res,next,userID,personID,querySQL,places,
                                            hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                            created,changed_by);
                }
            }
        );
    });
};

var queryAddDepartment = function (req, res, next,userID, personID, querySQL, places, data, i,
                                   hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
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
                                          hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                          created, changed_by);
            }
        );
    });
};

var queryAddDepartmentHistory = function (req, res, next,userID, personID, depID, data, i, querySQL, places,
                                   hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
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
                    return queryAddDepartment(req, res, next, userID, personID, querySQL,places, dep, i+1,
                                              hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                              created,changed_by);
                } else {
                    return queryAddRemainingInfo(req,res,next,userID,personID,querySQL,places,
                                                 hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                                 created,changed_by);
                }
            }
        );
    });
};

var queryAddRemainingInfo = function (req, res, next, userID, personID, querySQL, places,
                                     hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                     created, changed_by) {
    var identifications = req.body.identifications;
    var responsibles = req.body.responsibles;
    var nationalities = req.body.nationalities;
    var address = req.body.address;
    var postalCode = req.body.postal_code;
    var city = req.body.city;
    var personalPhone = req.body.personal_phone;
    var personalEmail = req.body.personal_email;
    var workPhone = req.body.work_phone;
    var workEmail = req.body.work_email;
    var roles = req.body.roles_data;
    var managerAssociationKey = req.body.science_manager_data[0].association_key;
    var managerResearcherID = req.body.science_manager_data[0].researcherID;
    var managerORCID = req.body.science_manager_data[0].ORCID;
    var technicianAssociationKey = req.body.technician_data[0].association_key;
    var technicianResearcherID = req.body.technician_data[0].researcherID;
    var technicianORCID = req.body.technician_data[0].ORCID;
    var administrativeAssociationKey = req.body.administrative_data[0].association_key;

    //identifications
    for (var ind in identifications) {
        querySQL = querySQL +
                    'INSERT INTO `identifications` (`person_id`,`card_type_id`,`card_number`,`valid_until`) ' +
                    'VALUES (?,?,?,?);';
        places.push(personID, identifications[ind].card_type_id,identifications[ind].card_number,
                    momentToDate(identifications[ind].card_valid_until));
    }
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
                'UPDATE `personal_emails` SET `email` = ? ' +
                'WHERE id = ?;';
    places.push(personalEmail[0].personal_email, personalEmail[0].personal_email_id);
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
    // save researcher, technician, science_manager and administrative data to corresponding tables
    for (var ind in roles) {
        if (roles[ind].role_name === 'Scientific') {
            // already added to DB
        } else if (roles[ind].role_name === 'Technical') {
            querySQL = querySQL +
                    'INSERT INTO `technicians_info` (`person_id`,`researcherID`,`association_key`,`ORCID`) ' +
                    'VALUES (?,?,?,?);';
            places.push(personID, technicianResearcherID, technicianAssociationKey, technicianORCID);
        } else if (roles[ind].role_name === 'Science management') {
            querySQL = querySQL +
                    'INSERT INTO `science_managers_info` (`person_id`,`researcherID`,`association_key`,`ORCID`) ' +
                    'VALUES (?,?,?,?);';
            places.push(personID, managerResearcherID, managerAssociationKey, managerORCID);
        } else if (roles[ind].role_name === 'Administrative') {
            querySQL = querySQL +
                    'INSERT INTO `administrative_info` (`person_id`,`association_key`) ' +
                    'VALUES (?,?);';
            places.push(personID, administrativeAssociationKey);
        }
    }

    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(querySQL, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                return finalizeSendEmail(req,res,next,userID,personID,created,changed_by);
            }
        );
    });
};

var finalizeSendEmail = function (req, res,next,userID,personID,updated,changed_by) {
    var name = req.body.name;
    var colloquialName = req.body.colloquialName;
    var gender = req.body.gender;
    var birth_date = momentToDate(req.body.birth_date);
    var active_from = momentToDate(req.body.earliest_date);
    var queryPerson = 'UPDATE `people`' +
                      ' SET `status` = 3' +
                      ' WHERE `id` = ?;';
    var places = [personID];
    queryPerson = queryPerson + 'INSERT INTO `people_history` ' +
                    '(`person_id`,`user_id`,`name`,`colloquial_name`,' +
                     '`gender`,`birth_date`,`active_from`,`status`,`created`,`operation`,`changed_by`) ' +
                    'VALUES (?,?,?,?,?,?,?,?,?,?,?);';
    places.push(personID,userID,name,colloquialName,gender,birth_date,
                  active_from,3,updated,'U',changed_by);
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
                var institutionCityName = req.body.institution_city_name;
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
                        subject: 'Request for validation: ' + req.body.name, // Subject line
                        text: 'Hi,\n\n' +
                              'The user ' + (req.body.name) +
                              ' is requesting validation of his pre-registration.\n\n' +
                              'He/She added the following remarks:\n\n' +
                              '"' + req.body.comments +'"\n\n' +
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
                sendJSONResponse(res, 200, { message: 'All done.' });
                return;
            }
        );
    });
};

var queryAddJob = function (req, res, next,userID, personID, job, i, querySQL, places,
                            hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                            created, changed_by) {
    var queryJob = 'INSERT INTO `jobs` (`person_id`,`situation_id`,`category_id`,`organization`,`dedication`,`valid_from`,`valid_until`) ' +
                    'VALUES (?,?,?,?,?,?,?);';
    var situationID = job.situation.id;
    var categoryID = job.category_id;
    var organization = job.organization !== null ? job.organization : job.unit.name;
    var dedication = job.dedication;
    var start = momentToDate(job.start);
    var end = momentToDate(job.end);
    var placeholders = [personID, situationID, categoryID, organization,dedication,start, end];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(queryJob,placeholders,
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
                        return queryAddJob(req,res,next,userID,personID,job,i + 1,querySQL, places,
                                           hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                           created,changed_by);
                    } else if (hasLabAffiliation) {
                        return queryAddResearcher(req,res,next,userID,personID,querySQL,places,
                                    hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                    created,changed_by);
                    } else if (req.body.affiliationsDepartment.length > 0){
                        var dep = req.body.affiliationsDepartment[0];
                        return queryAddDepartment(req, res, next, userID, personID,querySQL,places,dep, 0,
                                                hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                                created,changed_by);
                    } else {
                        return queryAddRemainingInfo(req,res,next,userID,personID,querySQL,places,
                                                hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                                created,changed_by);
                    }
                }
            }
        );
    });
};

var queryAddContract = function (req,res,next,userID, personID, job, jobID, i, querySQL,places,
                                hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
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
                                               querySQL,places,
                                               hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                               created,changed_by);
            }
        );
    });
};

var queryJobContractDetails = function (req,res, next, userID, personID,job, jobID, contractID, i, querySQL, places,
                                        hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
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
        if (hasLabAffiliation) {
            return queryAddResearcher(req,res,next,userID,personID,querySQL, places,
                        hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                        created,changed_by);
        } else if (req.body.affiliationsDepartment.length > 0){
            var dep = req.body.affiliationsDepartment[0];
            return queryAddDepartment(req, res, next, userID, personID, querySQL,places,dep, 0,
                                    hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                    created,changed_by);
        } else {
            return queryAddRemainingInfo(req,res,next,userID,personID,querySQL,places,
                                    hasLabAffiliation,hasTechnicianAffiliation,hasScienceManagerAffiliation,hasAdministrativeAffiliation,
                                    created,changed_by);
        }
    }
};

var queryGetPersonalEmails = function (req,res,next) {
    var personID = req.params.personID;
    var row = {};
    var query = 'SELECT personal_emails.id AS personal_email_id, personal_emails.email AS personal_email' +
                ' FROM people' +
                ' LEFT JOIN personal_emails ON people.id = personal_emails.person_id' +
                ' WHERE people.id = ?';
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
                row = joinResponses(row,rowsQuery,'personal_email');
                return queryGetUsername(req,res,next, personID, row);
            }
        );
    });
};

var queryGetUsername = function (req,res,next, personID, row) {
    var userID = req.payload.userID;
    var query = 'SELECT id AS user_id, username' +
                ' FROM users' +
                ' WHERE id = ?';
    var places = [userID];
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
                row = joinResponses(row,rowsQuery);
                return queryGetInstitutionCity(req,res,next, personID, row);
            }
        );
    });
};

var queryGetInstitutionCity = function (req,res,next, personID, row) {
    var query = 'SELECT people_institution_city.id AS people_institution_city_id,' +
                ' institution_city.id AS institution_city_id, institution_city.city AS institution_city_name' +
                ' FROM people' +
                ' LEFT JOIN people_institution_city ON people.id = people_institution_city.person_id' +
                ' LEFT JOIN institution_city ON people_institution_city.city_id = institution_city.id' +
                ' WHERE people.id = ?';
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
                row = joinResponses(row,rowsQuery);
                return queryGetRoles(req,res,next, personID, row);
            }
        );
    });
};

var queryGetRoles = function (req,res,next, personID, row) {
    var query = 'SELECT people_roles.id AS people_roles_id,' +
                ' people_roles.role_id,' +
                ' roles.name_en AS role_name' +
                ' FROM people' +
                ' LEFT JOIN people_roles ON people.id = people_roles.person_id' +
                ' LEFT JOIN roles ON people_roles.role_id = roles.id' +
                ' WHERE people.id = ?;';
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
                row = joinResponses(row,rowsQuery, 'roles_data');
                return queryGetLabs(req,res,next, personID, row);
            }
        );
    });
};

var queryGetLabs = function (req,res,next, personID, row) {
    var query = 'SELECT labs.id AS lab_id,' +
                ' labs.name AS lab,' +
                ' people_labs.id AS people_lab_id, people_labs.valid_from AS lab_start, people_labs.valid_until AS lab_end,' +
                ' people_labs.dedication, lab_positions.id AS lab_position_id, lab_positions.name_en AS lab_position,' +
                ' groups.id AS group_id, groups.name AS group_name,' +
                ' units.id AS unit_id, units.name AS unit' +
                ' FROM people' +
                ' LEFT JOIN people_labs ON people.id = people_labs.person_id' +
                ' LEFT JOIN labs ON people_labs.lab_id = labs.id' +
                ' LEFT JOIN lab_positions ON people_labs.lab_position_id = lab_positions.id' +
                ' LEFT JOIN groups ON labs.group_id = groups.id' +
                ' LEFT JOIN units ON groups.unit_id = units.id' +
                ' WHERE people.id = ?;';
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
                row = joinResponses(row,rowsQuery, 'lab_data');
                return queryGetResearcherData(req,res,next, personID, row);
            }
        );
    });
};

var queryGetResearcherData = function (req,res,next, personID, row) {
    var query = 'SELECT researchers.id AS researcher_id,' +
                ' researchers.researcherID,researchers.ORCID,researchers.scopusID,researchers.association_key,' +
                ' researchers.integrated,researchers.nuclearCV,researchers.pluriannual,' +
                ' researchers.valid_from AS res_valid_from, researchers.valid_until AS res_valid_until' +
                ' FROM people' +
                ' LEFT JOIN researchers ON people.id = researchers.person_id' +
                ' WHERE people.id = ?;';
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
                row = joinResponses(row,rowsQuery, 'researcher_data');
                return queryGetTechnicianAffiliation(req,res,next, personID, row);
            }
        );
    });
};

var queryGetTechnicianAffiliation = function (req,res,next, personID, row) {
    var query = 'SELECT technicians.id AS tech_id,' +
                ' technicians.technician_office_id AS tech_office_id,technician_offices.name_en AS tech_office_name_en,' +
                ' technicians.technician_position_id AS tech_position_id,technician_positions.name_en AS tech_position_name_en,' +
                ' technicians.dedication AS tech_dedication,' +
                ' technicians.valid_from AS tech_valid_from,technicians.valid_until AS tech_valid_until' +
                ' FROM people' +
                ' LEFT JOIN technicians ON people.id = technicians.person_id' +
                ' LEFT JOIN technician_offices ON technicians.technician_office_id = technician_offices.id' +
                ' LEFT JOIN technician_positions ON technicians.technician_position_id = technician_positions.id' +
                ' WHERE people.id = ?;';
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
                row = joinResponses(row,rowsQuery, 'technician_offices');
                return queryGetTechnicianData(req,res,next, personID, row);
            }
        );
    });
};

var queryGetTechnicianData = function (req,res,next, personID, row) {
    var query = 'SELECT technicians_info.id AS id,' +
                ' technicians_info.researcherID, technicians_info.ORCID, technicians_info.association_key' +
                ' FROM people' +
                ' LEFT JOIN technicians_info ON people.id = technicians_info.person_id' +
                ' WHERE people.id = ?;';
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
                row = joinResponses(row,rowsQuery, 'technician_data');
                return queryGetScienceManagerAffiliation(req,res,next, personID, row);
            }
        );
    });
};

var queryGetScienceManagerAffiliation = function (req,res,next, personID, row) {
    var query = 'SELECT science_managers.id AS sc_man_id,' +
                ' science_managers.science_manager_office_id AS sc_man_office_id,science_manager_offices.name_en AS sc_man_office_name_en,'+
                ' science_managers.science_manager_position_id AS sc_man_position_id,science_manager_positions.name_en AS sc_man_position_name_en,' +
                ' science_managers.dedication AS sc_man_dedication,' +
                ' science_managers.valid_from AS sc_man_valid_from,science_managers.valid_until AS sc_man_valid_until' +
                ' FROM people' +
                ' LEFT JOIN science_managers ON people.id = science_managers.person_id' +
                ' LEFT JOIN science_manager_offices ON science_managers.science_manager_office_id = science_manager_offices.id' +
                ' LEFT JOIN science_manager_positions ON science_managers.science_manager_position_id = science_manager_positions.id' +
                ' WHERE people.id = ?;';
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
                row = joinResponses(row,rowsQuery, 'science_manager_offices');
                return queryGetScienceManagerData(req,res,next, personID, row);
            }
        );
    });
};

var queryGetScienceManagerData = function (req,res,next, personID, row) {
    var query = 'SELECT science_managers_info.id AS id,' +
                ' science_managers_info.association_key, science_managers_info.researcherID, science_managers_info.ORCID' +
                ' FROM people' +
                ' LEFT JOIN science_managers_info ON people.id = science_managers_info.person_id' +
                ' WHERE people.id = ?;';
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
                row = joinResponses(row,rowsQuery, 'science_manager_data');
                return queryGetAdministrativeAffiliation(req,res,next, personID, row);
            }
        );
    });
};

var queryGetAdministrativeAffiliation = function (req,res,next, personID, row) {
    var query = 'SELECT people_administrative_offices.id AS adm_id,' +
                ' people_administrative_offices.administrative_office_id AS adm_office_id,administrative_offices.name_en AS adm_office_name_en,' +
                ' people_administrative_offices.administrative_position_id AS adm_position_id,administrative_positions.name_en AS adm_position_name_en,' +
                ' people_administrative_offices.dedication AS adm_dedication,' +
                ' people_administrative_offices.valid_from AS adm_valid_from,people_administrative_offices.valid_until AS adm_valid_until' +
                ' FROM people' +
                ' LEFT JOIN people_administrative_offices ON people.id = people_administrative_offices.person_id' +
                ' LEFT JOIN administrative_offices ON people_administrative_offices.administrative_office_id = administrative_offices.id' +
                ' LEFT JOIN administrative_positions ON people_administrative_offices.administrative_position_id = administrative_positions.id' +
                ' WHERE people.id = ?;';
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
                row = joinResponses(row,rowsQuery, 'administrative_offices');
                return queryGetAdministrativeData(req,res,next, personID, row);
            }
        );
    });
};

var queryGetAdministrativeData = function (req,res,next, personID, row) {
    var query = 'SELECT administrative_info.id, administrative_info.association_key' +
                ' FROM people' +
                ' LEFT JOIN administrative_info ON people.id = administrative_info.person_id' +
                ' WHERE people.id = ?;';
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
                row = joinResponses(row,rowsQuery, 'administrative_data');
                row['id'] = personID;
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": 1,
                     "result" : row});
                return;
            }
        );
    });
};

/******************** Call SQL Generators after Validations *******************/

module.exports.preRegisterPerson = function (req, res, next) {
    getUser(req, res, next, [40], //pre-registered users have always permission level 40
        queryUpdateUser
    );
};

module.exports.getPersonData = function (req, res, next) {
    getUser(req, res, next, [40], //pre-registered users have always permission level 40
        queryGetPersonalEmails
    );
};