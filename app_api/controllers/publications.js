var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
var levenshtein = require('fast-levenshtein');
var externalAPI = require('../config/external-api');

var WEBSITE_API_BASE_URL = externalAPI.baseURL;

/**************************** Utility Functions *******************************/
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

function processPublications(resQuery) {
    function containsObj(list, obj) {
        for (var i in list) {
            if (JSON.stringify(list[i]) === JSON.stringify(obj)) {
                return true;
            }
        }
        return false;
    }
    var rowsSkip = [];
    var publications = [];
    var found;
    for (var indRow in resQuery) {
        indRow = Number.parseInt(indRow,10);
        if (rowsSkip.indexOf(indRow) === -1) {
            rowsSkip.push(indRow);
            var person_selected = [];
            if (resQuery[indRow].person_selected === 1
                && resQuery[indRow].person_public === 1
                && person_selected.indexOf(resQuery[indRow].person_id) === -1) {person_selected.push(resQuery[indRow].person_id);}
            var lab_selected = [];
            if (resQuery[indRow].lab_selected === 1
                    && resQuery[indRow].lab_public === 1) {
                found = false;
                for (var elab in lab_selected) {
                    if (lab_selected[elab].lab_id == resQuery[indRow].lab_id
                            && lab_selected[elab].group_id == resQuery[indRow].group_id
                            && lab_selected[elab].unit_id == resQuery[indRow].unit_id) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    lab_selected.push({
                        lab_id: resQuery[indRow].lab_id,
                        group_id: resQuery[indRow].group_id,
                        unit_id: resQuery[indRow].unit_id
                    });
                }
            }
            var person = [];
            if (resQuery[indRow].person_id !== null
                && resQuery[indRow].person_public === 1
                && person.indexOf(resQuery[indRow].person_id) === -1) {person.push(resQuery[indRow].person_id);}
            var lab = [];
            if (resQuery[indRow].lab_id !== null && resQuery[indRow].lab_public === 1) {
                found = false;
                for (var elab in lab) {
                    if (lab[elab].lab_id == resQuery[indRow].lab_id
                            && lab[elab].group_id == resQuery[indRow].group_id
                            && lab[elab].unit_id == resQuery[indRow].unit_id) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    lab.push({
                        lab_id: resQuery[indRow].lab_id,
                        group_id: resQuery[indRow].group_id,
                        unit_id: resQuery[indRow].unit_id
                    });
                }
            }
            var unit = [];
            if (resQuery[indRow].unit_pub_unit_id !== null
                && resQuery[indRow].unit_public === 1
                && unit.indexOf(resQuery[indRow].unit_pub_unit_id) === -1) {unit.push(resQuery[indRow].unit_pub_unit_id);}
            for (var ind = indRow + 1; ind < resQuery.length; ind++) {
                if (resQuery[ind].id == resQuery[indRow].id) {
                    rowsSkip.push(ind);
                    if (resQuery[ind].person_selected === 1 && resQuery[ind].person_public === 1) {
                        if (person_selected.indexOf(resQuery[ind].person_id) === -1) {
                            person_selected.push(resQuery[ind].person_id);
                        }
                    }
                    if (resQuery[ind].lab_selected === 1 && resQuery[ind].lab_public === 1) {
                        let objTest = {
                            lab_id: resQuery[ind].lab_id,
                            group_id: resQuery[ind].group_id,
                            unit_id: resQuery[ind].unit_id
                        };
                        if (!containsObj(lab_selected,objTest)) {
                            lab_selected.push(objTest);
                        }
                    }
                    if (resQuery[ind].person_id !== null && resQuery[ind].person_public === 1) {
                        if (person.indexOf(resQuery[ind].person_id) === -1) {
                            person.push(resQuery[ind].person_id);
                        }
                    }
                    if (resQuery[ind].lab_id !== null && resQuery[ind].lab_public === 1) {
                        let objTest = {
                            lab_id: resQuery[ind].lab_id,
                            group_id: resQuery[ind].group_id,
                            unit_id: resQuery[ind].unit_id
                        };
                        if (!containsObj(lab,objTest)) {
                            lab.push(objTest);
                        }
                    }
                    if (resQuery[ind].unit_pub_unit_id !== null && resQuery[ind].unit_public === 1) {
                        if (unit.indexOf(resQuery[ind].unit_pub_unit_id) === -1) {
                            unit.push(resQuery[ind].unit_pub_unit_id);
                        }
                    }
                }
            }
            delete resQuery[indRow].group_id;
            delete resQuery[indRow].unit_id;
            delete resQuery[indRow].unit_pub_unit_id;
            delete resQuery[indRow].person_public;
            delete resQuery[indRow].lab_public;
            delete resQuery[indRow].unit_public;
            resQuery[indRow].person_selected = person_selected;
            resQuery[indRow].lab_selected = lab_selected;
            resQuery[indRow].person_id = person;
            resQuery[indRow].lab_id = lab;
            resQuery[indRow].unit_id = unit;
            publications.push(resQuery[indRow]);
        }
    }
    return publications;
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
function compactData(arr, key, aggregate_key) {
    var used_keys = [];
    var compact_arr = [];
    for (var el in arr) {
        if (used_keys.indexOf(arr[el][key]) === -1) {
            used_keys.push(arr[el][key]);
            var new_row = Object.assign({}, arr[el]);
            new_row[aggregate_key] = [];
            for (var el2 in arr) {
                if (arr[el2][key] == arr[el][key]) {
                    new_row[aggregate_key].push(arr[el2][aggregate_key]);
                }
            }
            compact_arr.push(new_row);
        }
    }
    return compact_arr;
}

/***************************** Query Functions ********************************/

var queryAllPublications = function (req, res, next) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT publications.*,' +
                                ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                                ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn' +
                          ' FROM publications' +
                          ' LEFT JOIN journals ON publications.journal_id = journals.id;';
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
                if (resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                        "result" : resQuery});
                return;
            }
        );
    });
};
var queryPersonPublications = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_publications.id AS people_publications_id, people_publications.public, people_publications.position AS author_position,' +
                                ' people_publications.author_type_id, author_types.name_en AS author_type, ' +
                                ' people_publications.selected AS selected, publications.*,' +
                                ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                                ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                          'FROM people_publications' +
                          ' LEFT JOIN author_types ON people_publications.author_type_id = author_types.id' +
                          ' LEFT JOIN publications ON people_publications.publication_id = publications.id' +
                          ' LEFT JOIN journals ON publications.journal_id = journals.id' +
                          ' WHERE people_publications.person_id = ?';
    places.push(personID,personID);
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
                if (resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                return queryPublicationDescription(req,res,next,resQuery,0);
            }
        );
    });
};
var queryTeamPublications = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT labs_publications.id AS labs_publications_id, publications.*,' +
                                ' labs_publications.selected AS selected, labs_publications.public AS public,' +
                                ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                                ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                          'FROM labs_publications' +
                          ' LEFT JOIN publications ON labs_publications.publication_id = publications.id' +
                          ' LEFT JOIN journals ON publications.journal_id = journals.id' +
                          ' WHERE labs_publications.group_id = ? AND labs_publications.lab_id = ?;';
    places.push(groupID, teamID);
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
                if (resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                return queryPublicationDescription(req,res,next,resQuery,0);
            }
        );
    });
};
var queryMembersPublications = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT publications.*, journals.short_name AS journal_short_name, journals.name AS journal_name,' +
                          ' journals.publisher, journals.publisher_city, journals.eissn AS eissn, journals.issn AS issn' +
                          ' FROM publications' +
                          ' LEFT JOIN journals ON journals.id = publications.journal_id' +
                          ' LEFT JOIN people_publications ON people_publications.publication_id = publications.id' +
                          ' LEFT JOIN people_labs ON people_labs.person_id = people_publications.person_id' +
                          ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                          ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                          ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                          ' WHERE groups.id = ? AND labs.id = ?;';
    places.push(groupID, teamID);
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
                if (resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                var non_duplicates = [];
                var id_collection = [];
                for (var ind in resQuery) {
                    if (id_collection.indexOf(resQuery[ind].id) === -1) {
                        id_collection.push(resQuery[ind].id);
                        non_duplicates.push(resQuery[ind]);
                    }
                }

                sendJSONResponse(res, 200,
                {
                    "status": "success",
                    "statusCode": 200,
                    "count": non_duplicates.length,
                    "result": non_duplicates
                });
                return;
            }
        );
    });
};
var queryPersonCommunications = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT communications.id, communications.person_id, communications.authors_raw, ' +
                          ' communications.presenter, communications.title, communications.type_id AS communication_type_id, ' +
                          ' communication_types.name AS communication_type_name,' +
                          ' communications.conference_title, communications.international, communications.city, communications.country_id, countries.name AS country_name,' +
                          ' communications.date, communications.doi, communications.public,' +
                          ' communication_types.name AS communication_type_name, communications.conference_type_id, conference_types.name AS conference_type_name ' +
                          'FROM communications' +
                          ' LEFT JOIN communication_types ON communication_types.id = communications.type_id' +
                          ' LEFT JOIN conference_types ON conference_types.id = communications.conference_type_id' +
                          ' LEFT JOIN countries ON countries.id = communications.country_id' +
                          ' WHERE communications.person_id = ?';
    places.push(personID);
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
                if (resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                        "result" : resQuery});
                    return;
            }
        );
    });
};
var queryPublicationDescription = function (req, res, next, rows,i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT publication_descriptions.publication_type, publication_types.name_en ' +
                          'FROM publication_descriptions' +
                          ' LEFT JOIN publication_types ON publication_descriptions.publication_type = publication_types.id' +
                          ' WHERE publication_descriptions.publication_id = ?;';
    places.push(rows[i].id);
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
                rows[i].publication_type = resQuery;
                if (i + 1 < rows.length) {
                    return queryPublicationDescription(req,res,next,rows,i+1);
                } else {
                    return queryPublicationAuthors(req,res,next,rows,0);
                }

            }
        );
    });
};
var queryPublicationAuthors = function (req, res, next, rows,i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT author_type_id, position ' +
                          'FROM people_publications ' +
                          'WHERE publication_id = ?;';
    places.push(rows[i].id);
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
                rows[i].unit_authors = resQuery;
                if (i + 1 < rows.length) {
                    return queryPublicationAuthors(req,res,next,rows,i+1);
                } else {
                    return queryPublicationCitations(req,res,next,rows,0);
                }

            }
        );
    });
};
var queryPublicationCitations = function (req, res, next, rows,i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT citations, year ' +
                          'FROM citations ' +
                          'WHERE publication_id = ?;';
    places.push(rows[i].id);
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
                rows[i].citations = resQuery;
                if (i + 1 < rows.length) {
                    return queryPublicationCitations(req,res,next,rows,i+1);
                } else {
                    return queryJournalImpact(req,res,next,rows,0);
                }

            }
        );
    });
};
var queryJournalImpact = function (req, res, next, rows,i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT impact_factor, year ' +
                          'FROM impact_factors ' +
                          'WHERE journal_id = ?;';
    places.push(rows[i].journal_id);
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
                /*
                var impacts = [];
                for (var el in resQuery) {
                    impacts[resQuery[el].year] = resQuery[el].impact_factor;
                }*/
                rows[i].impact_factors = resQuery;
                //rows[i].impact_factors = resQuery;
                if (i + 1 < rows.length) {
                    return queryJournalImpact(req,res,next,rows,i+1);
                } else {
                    sendJSONResponse(res, 200,
                    {
                        "status": "success",
                        "statusCode": 200,
                        "count": rows.length,
                        "result": rows
                    });
                    return;
                }
            }
        );
    });
};
var queryUpdatePersonSelectedPublications = function (req, res, next) {
    var personID = req.params.personID;
    var add = req.body.addSelectedPub;
    var del = req.body.delSelectedPub;
    var addPublic = req.body.addPublicPub;
    var delPublic = req.body.delPublicPub;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'UPDATE people_publications' +
                              ' SET selected = 1' +
                              ' WHERE person_id = ? AND publication_id  = ?;';
        places.push(personID,add[ind].id);
    }
    for (var ind in del) {
        querySQL = querySQL + 'UPDATE people_publications' +
                              ' SET selected = 0' +
                              ' WHERE person_id = ? AND publication_id  = ?;';
        places.push(personID,del[ind].id);
    }
    for (var ind in addPublic) {
        querySQL = querySQL + 'UPDATE people_publications' +
                              ' SET public = 1' +
                              ' WHERE person_id = ? AND publication_id  = ?;';
        places.push(personID,addPublic[ind].id);
    }
    for (var ind in delPublic) {
        querySQL = querySQL + 'UPDATE people_publications' +
                              ' SET public = 0' +
                              ' WHERE person_id = ? AND publication_id  = ?;';
        places.push(personID,delPublic[ind].id);
    }
    if (add.length !== 0 || del.length !== 0 || addPublic.length !== 0 || delPublic.length !== 0) {
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
                    for (var ind in add) {
                        externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', add[ind].id,
                                                'UCIBIO API error updating highlight status (on) of publication (id, person) :', [add[ind].id,personID]);
                        externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', add[ind].id,
                                                'LAQV API error updating highlight status (on) of publication (id, person) :', [add[ind].id,personID]);
                    }
                    for (var ind in del) {
                        externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', del[ind].id,
                                                'UCIBIO API error updating highlight status (off) of publication (id, person) :', [del[ind].id,personID]);
                        externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', del[ind].id,
                                                'LAQV API error updating highlight status (off) of publication (id, person) :', [del[ind].id,personID]);
                    }
                    for (var ind in addPublic) {
                        externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', addPublic[ind].id,
                                                'UCIBIO API error updating (public status - on) of publication (id, person) :', [addPublic[ind].id,personID]);
                        externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', addPublic[ind].id,
                                                'LAQV API error updating (public status - on) of publication (id, person) :', [addPublic[ind].id,personID]);
                    }
                    for (var ind in delPublic) {
                        externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', delPublic[ind].id,
                                                'UCIBIO API error updating (public status - off) of publication (id, person) :', [delPublic[ind].id,personID]);
                        externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', delPublic[ind].id,
                                                'LAQV API error updating (public status - off) of publication (id, person) :', [delPublic[ind].id,personID]);
                    }
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 1,
                         "result" : "OK!"});
                    return;
                }
            );
        });
    } else {
        sendJSONResponse(res, 200, {"status": "No changes", "statusCode": 200});
        return;
    }
};
var queryUpdatePersonAuthorNames = function (req, res, next) {
    var personID = req.params.personID;
    var add = req.body.addAuthorNames;
    var del = req.body.delAuthorNames;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO author_names' +
                              ' (person_id,name)' +
                              ' VALUES (?,?);';
        places.push(personID,add[ind].author_name);
    }
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM author_names' +
                              ' WHERE id = ?;';
        places.push(del[ind].author_name_id);
    }
    if (querySQL !== '') {
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
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 1,
                         "result" : "OK!"});
                }
            );
        });
    } else {
        sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "message": "No changes"});
    }
};
var queryUpdateTeamSelectedPublications = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var add = req.body.addSelectedPub;
    var del = req.body.delSelectedPub;
    var addPublic = req.body.addPublicPub;
    var delPublic = req.body.delPublicPub;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'UPDATE labs_publications' +
                              ' SET selected = 1' +
                              ' WHERE group_id = ? AND lab_id = ? AND publication_id  = ?;';
        places.push(groupID,teamID,add[ind].id);
    }
    for (var ind in del) {
        querySQL = querySQL + 'UPDATE labs_publications' +
                              ' SET selected = 0' +
                              ' WHERE group_id = ? AND lab_id = ? AND publication_id  = ?;';
        places.push(groupID, teamID,del[ind].id);
    }
    for (var ind in addPublic) {
        querySQL = querySQL + 'UPDATE labs_publications' +
                              ' SET public = 1' +
                              ' WHERE group_id = ? AND lab_id = ? AND publication_id  = ?;';
        places.push(groupID,teamID,addPublic[ind].id);
    }
    for (var ind in delPublic) {
        querySQL = querySQL + 'UPDATE labs_publications' +
                              ' SET public = 0' +
                              ' WHERE group_id = ? AND lab_id = ? AND publication_id  = ?;';
        places.push(groupID, teamID,delPublic[ind].id);
    }
    if (add.length !== 0 || del.length !== 0 || addPublic.length !== 0 || delPublic.length !== 0) {
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
                    for (var ind in add) {
                        externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', add[ind].id,
                                                'UCIBIO API error updating highlight status (on) of publication (pub_id,lab_id, group_id) :', [add[ind].id,teamID,groupID]);
                        externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', add[ind].id,
                                                'LAQV API error updating highlight status (on) of publication (pub_id,lab_id, group_id) :', [add[ind].id,teamID,groupID]);
                    }
                    for (var ind in del) {
                        externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', del[ind].id,
                                                'UCIBIO API error updating highlight status (off) of publication (pub_id,lab_id, group_id) :', [del[ind].id,teamID,groupID]);
                        externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', del[ind].id,
                                                'LAQV API error updating highlight status (off) of publication (pub_id,lab_id, group_id) :', [del[ind].id,teamID,groupID]);
                    }
                    for (var ind in addPublic) {
                        externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', addPublic[ind].id,
                                                'UCIBIO API error updating public status (on) of publication (pub_id,lab_id, group_id) :', [addPublic[ind].id,teamID,groupID]);
                        externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', addPublic[ind].id,
                                                'LAQV API error updating public status (on) of publication (pub_id,lab_id, group_id) :', [addPublic[ind].id,teamID,groupID]);
                    }
                    for (var ind in delPublic) {
                        externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', delPublic[ind].id,
                                                'UCIBIO API error updating public status (off) of publication (pub_id,lab_id, group_id) :', [delPublic[ind].id,teamID,groupID]);
                        externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', delPublic[ind].id,
                                                'LAQV API error updating public status (off) of publication (pub_id,lab_id, group_id) :', [delPublic[ind].id,teamID,groupID]);
                    }
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 1,
                         "result" : "OK!"});
                    return;
                }
            );
        });
    } else {
        sendJSONResponse(res, 200, {"status": "No changes", "statusCode": 200});
        return;
    }
};
var queryDeletePublicationsPerson = function (req, res, next) {
    var personID = req.params.personID;
    var del = req.body.deletePublications;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM people_publications' +
                              ' WHERE id = ?;';
        places.push(del[ind].people_publications_id);
    }
    if (querySQL !== '') {
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
                    for (var ind in del) {
                        externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', del[ind].id,
                                                'UCIBIO API error updating (delete association of publication to person) (id, person) :', [del[ind].id,personID]);
                        externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', del[ind].id,
                                                'LAQV API error updating (delete association of publication to person) (id, person) :', [del[ind].id,personID]);
                    }
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 1,
                         "result" : "OK!"});
                }
            );
        });
    } else {
        sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "message": "No changes"});
    }
};
var queryDeletePublicationsTeam = function (req, res, next) {
    var groupID = req.params.groupID;
    var teamID = req.params.teamID;
    var del = req.body.deletePublications;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM labs_publications' +
                              ' WHERE id = ?;';
        places.push(del[ind].labs_publications_id);
    }
    if (querySQL !== '') {
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
                    for (var ind in del) {
                        externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', del[ind].id,
                                                'UCIBIO API error updating (delete association of publication to team) (id, lab, group) :', [del[ind].id,teamID,groupID]);
                        externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', del[ind].id,
                                                'LAQV API error updating (delete association of publication to team) (id, lab, group) :', [del[ind].id,teamID,groupID]);
                    }
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 1,
                         "result" : "OK!"});
                }
            );
        });
    } else {
        sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "message": "No changes"});
    }
};
var queryAddPublicationsPerson = function (req, res, next) {
    var personID = req.params.personID;
    var add = req.body.addPublications;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO people_publications (person_id,publication_id, author_type_id, position)' +
                              ' VALUES (?,?,?,?);';
        places.push(personID, add[ind].id, add[ind].author_type_id, add[ind].position);
    }
    if (querySQL !== '') {
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
                    for (var ind in add) {
                        externalAPI.contactCreateOrUpdate(WEBSITE_API_BASE_URL[1], 'publications', add[ind].id,
                                                'UCIBIO API error updating (adding association of publication to person) (id, person) :', [add[ind].id, personID]);
                        externalAPI.contactCreateOrUpdate(WEBSITE_API_BASE_URL[2], 'publications', add[ind].id,
                                                'LAQV API error updating (adding association of publication to person) (id, person) :', [add[ind].id, personID]);
                    }
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 1,
                         "result" : "OK!"});
                }
            );
        });
    } else {
        sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "message": "No changes"});
    }
};
var queryAddPublicationsLab = function(req, res, next) {
    var groupID = req.params.groupID;
    var teamID = req.params.teamID;
    var add = req.body.addPublications;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO labs_publications (lab_id, group_id, publication_id,public)' +
                              ' VALUES (?,?,?,1);';
        places.push(teamID,groupID, add[ind].id);
    }
    if (querySQL !== '') {
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
                    for (var ind in add) {
                        externalAPI.contactCreateOrUpdate(WEBSITE_API_BASE_URL[1], 'publications', add[ind].id,
                                                'UCIBIO API error updating (adding association of publication to team) (id, lab, group) :', [add[ind].id, teamID, groupID]);
                        externalAPI.contactCreateOrUpdate(WEBSITE_API_BASE_URL[2], 'publications', add[ind].id,
                                                'LAQV API error updating (adding association of publication to team) (id, lab, group) :', [add[ind].id, teamID, groupID]);
                    }
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 1,
                         "result" : "OK!"});
                }
            );
        });
    } else {
        sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "message": "No changes"});
    }
};
var queryORCIDGetJournalID = function (req, res, next,i) {
    // NOTE: position and year are strings, must be converted to int?
    var add = req.body.addPublications;
    var querySQL = '';
    var places = [];
    var journal_name = add[i].journal_name
                                 .toLowerCase()
                                 .replace(/[:;,\-\(\)\.]/g, ' ')
                                 .replace(/[\s\s]/g, ' ');
    var journal_name_search = '%' + journal_name.replace(/\s/g, '%') + '%';

    querySQL = querySQL + 'SELECT id, name, short_name from journals ' +
                          ' WHERE name LIKE ? OR short_name LIKE ?;';
    places.push(journal_name_search,journal_name_search);
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
                if (resQuery.length === 0) {
                    // journal name not found, add to journal list
                    return queryORCIDInsertNewJournal(req,res,next,i, add[i].journal_name);
                }
                if (resQuery.length === 1) {
                    // only 1 journal found, get its identity
                    return queryORCIDCheckIfExistsPublication(req,res,next,i,resQuery[0].id);
                }
                if (resQuery.length > 1) {
                    // several journals found, get the most similar
                    var minDistance, minInd;
                    for (var ind in resQuery) {
                        var distance = levenshtein.get(resQuery[ind].name.toLowerCase(), journal_name);
                        if (ind == 0 || distance < minDistance) {
                            minDistance = distance;
                            minInd = ind;
                        }
                    }
                    return queryORCIDCheckIfExistsPublication(req,res,next,i,resQuery[minInd].id);
                }
            }
        );
    });
};
var queryORCIDInsertNewJournal = function (req, res, next,i, journal_name) {
    var querySQL = '';
    var places = [];
    // journal information from ORCID is scarce so we use journal name = short_name
    querySQL = querySQL + 'INSERT INTO journals (name, short_name) ' +
                          ' VALUES (?,?);';
    places.push(journal_name,journal_name);
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
                var journalID = resQuery.insertId;
                return queryORCIDCheckIfExistsPublication(req,res,next,i,journalID);
            }
        );
    });
};
var queryORCIDCheckIfExistsPublication = function (req, res, next,i, journalID) {
    var add = req.body.addPublications;
    var querySQL = '';
    var places = [];
    if (add[i].title !== null && add[i].doi !== null) {
        querySQL = querySQL + 'SELECT id, title, doi FROM publications' +
                ' WHERE title = ? AND doi = ?;';
        places.push(add[i].title,add[i].doi);
    } else {
        querySQL = querySQL + 'SELECT id, title, doi FROM publications' +
                ' WHERE title = ? OR doi = ?;';
        places.push(add[i].title,add[i].doi);
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
                if (resQuery.length === 0) {
                    // publication does not exist
                    return queryORCIDInsertPublication(req,res,next,i,journalID);
                } else {
                    // if there are no duplicates only 1 publication at most should appear
                    var pubID = resQuery[0].id;
                    return queryORCIDInsertPeoplePublications(req,res,next,i,pubID);
                }
            }
        );
    });
};
var queryORCIDInsertPublication = function (req, res, next,i, journalID) {
    var add = req.body.addPublications;
    var querySQL = '';
    var places = [];
    var numberAuthors;
    if (add[i].authors_raw !== null && add[i].authors_raw !== undefined) {
        numberAuthors = add[i].authors_raw.split(';').length;
    } else {
        numberAuthors = null;
    }
    var pageStart = null;
    var pageEnd = null;
    if (add[i].pages !== null) {
        if (add[i].pages.indexOf('-') !== -1) {
            var pageArray = add[i].pages.split('-');
            pageStart = pageArray[0];
            pageEnd = pageArray[1];
        } else {
            pageStart = add[i].pages;
        }
    }
    var volume = null;
    if (add[i].volume !== null && add[i].number !== null) {
        volume = add[i].volume + '(' + add[i].number + ')';
    } else {
        volume = add[i].volume;
    }
    var date = null;
    var month;
    if (add[i].month !== null) {
        if (isNaN(+add[i].month)) {
            month = moment().month(add[i].month).format('MMM');
        } else {
            month = moment().month(parseInt(add[i].month,10) - 1).format('MMM');
        }
        if (add[i].day !== null) {
            date = month + ' ' + add[i].day;
        } else {
            date = month;
        }
    }
    querySQL = querySQL + 'INSERT INTO  publications' +
                ' (authors_raw,number_authors,title,year,journal_id,volume,page_start,page_end,publication_date,doi,publication_source_id)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?,?);';
    places.push(add[i].authors_raw,numberAuthors,add[i].title,add[i].year,
                journalID,volume,pageStart,pageEnd, date, add[i].doi,2);
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
                var pubID = resQuery.insertId;
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'create', 'publications', pubID,
                                                'UCIBIO API error creating (adding association of publication to person, from ORCID) (id) :', pubID);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'create', 'publications', pubID,
                                                'LAQV API error creating (adding association of publication to person, from ORCID) (id) :', pubID);
                if (add[i].publication_type_id !== null && add[i].publication_type_id !== undefined) {
                    if (add[i].publication_type_id.length > 0) {
                        return queryORCIDInsertPublicationDescription(req,res,next,i, pubID);
                    } else {
                        return queryORCIDInsertPeoplePublications(req,res,next,i, pubID);
                    }
                } else {
                    return queryORCIDInsertPeoplePublications(req,res,next,i, pubID);
                }
            }
        );
    });
};
var queryORCIDInsertPublicationDescription = function (req, res, next, i, pubID) {
    var add = req.body.addPublications;
    var querySQL = '';
    var places = [];
    for (var ind in add[i].publication_type_id) {
        querySQL = querySQL + 'INSERT INTO publication_descriptions (publication_id, publication_type) ' +
                              ' VALUES (?,?);';
        places.push(pubID, add[i].publication_type_id[ind]);
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
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', pubID,
                                                'UCIBIO API error updating (adding description, from ORCID) (id) :', pubID);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', pubID,
                                                'LAQV API error updating (adding description, from ORCID) (id) :', pubID);
                return queryORCIDInsertPeoplePublications(req,res,next,i, pubID);
            }
        );
    });
};
var queryORCIDInsertPeoplePublications = function (req, res, next, i, pubID) {
    var add = req.body.addPublications;
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    // journal information from ORCID is scarce so we use journal name = short_name
    querySQL = querySQL + 'INSERT INTO people_publications (person_id, publication_id,author_type_id, position) ' +
                          ' VALUES (?,?,?,?);';
    places.push(personID,pubID, add[i].author_type_id, add[i].position);
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
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', pubID,
                                                'UCIBIO API error updating (adding association to person, from ORCID) (id) :', pubID);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', pubID,
                                                'LAQV API error updating (adding association to person, from ORCID) (id) :', pubID);
                if (i+1<add.length) {
                    return queryORCIDGetJournalID(req,res,next,i+1);
                } else {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 1,
                         "result" : "all done"});
                }
            }
        );
    });
};
var queryORCIDInsertCommunication = function (req, res, next, i) {
    var personID = req.params.personID;
    var add = req.body.add;
    var querySQL = '';
    var places = [];
    var date = momentToDate(add[i].date);
    querySQL = querySQL + 'INSERT INTO  communications' +
                ' (person_id,authors_raw,presenter,title,type_id,conference_title,' +
                  'conference_type_id, international,city,country_id,date,doi)' +
                ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?);';
    places.push(personID,
                add[i].authors_raw,
                add[i].presenter,
                add[i].title,
                add[i].communication_type_id,
                add[i].conference,
                add[i].conference_type_id,
                add[i].international,
                add[i].city,
                add[i].country_id.country_id,
                date,
                add[i].doi);
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
                if (i+1 < add.length) {
                    return queryORCIDInsertCommunication(req,res,next,i+1);
                } else {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 1,
                         "result" : "all done"});
                }
            }
        );
    });
};
var queryUpdatePersonCommunications = function (req, res, next, i) {
    var personID = req.params.personID;
    var upd = req.body.upd;
    var querySQL = '';
    var places = [];
    if (upd.length > 0) {
        var date = momentToDate(upd[i].date);
        querySQL = querySQL + 'UPDATE  communications' +
                    ' SET authors_raw = ?,' +
                    ' presenter = ?,' +
                    ' title = ?,' +
                    ' type_id = ?,' +
                    ' conference_title = ?,' +
                    ' conference_type_id = ?,' +
                    ' international = ?, ' +
                    ' city = ?, ' +
                    ' country_id = ?,' +
                    ' date = ?,' +
                    ' doi = ?,' +
                    ' public = ?' +
                    ' WHERE id = ?;';
        places.push(upd[i].authors_raw,
                    upd[i].presenter,
                    upd[i].title,
                    upd[i].communication_type_id,
                    upd[i].conference_title,
                    upd[i].conference_type_id,
                    upd[i].international,
                    upd[i].city,
                    upd[i].country_id,
                    date,
                    upd[i].doi,
                    upd[i].public,
                    upd[i].id);
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
                    if (i+1 < upd.length) {
                        return queryUpdatePersonCommunications(req,res,next,i+1);
                    } else {
                        sendJSONResponse(res, 200,
                            {"status": "success", "statusCode": 200, "count": 1,
                             "result" : "all done"});
                    }
                }
            );
        });
    } else {
        sendJSONResponse(res, 200,
                            {"status": "no changes", "statusCode": 200, "count": 0,
                             "result" : "all done"});
    }
};

var queryAllPatents = function (req, res, next) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_patents.*, patents.authors_raw, ' +
                          ' patents.title, patents.reference_number1 AS reference1, patents.reference_number2 AS reference2, ' +
                          ' patents.patent_type_id, patent_types.name_en AS patent_type,' +
                          ' patents.status_id AS patent_status_id, patent_status.name_en AS patent_status,' +
                          ' patents.status_date AS status_date, patents.description ' +
                          'FROM people_patents' +
                          ' LEFT JOIN patents ON patents.id = people_patents.patent_id' +
                          ' LEFT JOIN patent_types ON patent_types.id = patents.patent_type_id' +
                          ' LEFT JOIN patent_status ON patent_status.id = patents.status_id;';
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
                if (resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                resQuery = compactData(resQuery, 'patent_id', 'person_id');
                sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                        "result" : resQuery});
                return;
            }
        );
    });
};
var queryPersonPatents = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_patents.*, patents.authors_raw, ' +
                          ' patents.title, patents.reference_number1 AS reference1, patents.reference_number2 AS reference2, ' +
                          ' patents.patent_type_id, patent_types.name_en AS patent_type,' +
                          ' patents.status_id AS patent_status_id, patent_status.name_en AS patent_status,' +
                          ' patents.status_date AS status_date, patents.description ' +
                          'FROM people_patents' +
                          ' LEFT JOIN patents ON patents.id = people_patents.patent_id' +
                          ' LEFT JOIN patent_types ON patent_types.id = patents.patent_type_id' +
                          ' LEFT JOIN patent_status ON patent_status.id = patents.status_id' +
                          ' WHERE people_patents.patent_id = ANY ' +
                          ' (SELECT people_patents.patent_id FROM people_patents WHERE people_patents.person_id = ?);';
    places.push(personID);
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
                if (resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                resQuery = compactData(resQuery, 'patent_id', 'person_id');
                sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                        "result" : resQuery});
                return;
            }
        );
    });
};
var queryUpdatePersonPatents = function (req, res, next) {
    var personID = req.params.personID;
    var updateArr = req.body.updatePatent;
    var newArr = req.body.newPatent;
    var deleteArr = req.body.deletePatent;
    if (updateArr.length > 0) {
        return queryUpdatePatent(req, res, next, personID, updateArr,deleteArr,newArr, updateArr[0], 0);
    } else if (deleteArr.length > 0) {
        return queryDeletePatent(req, res, next, personID, updateArr,deleteArr,newArr, deleteArr[0], 0);
    } else if (newArr.length > 0) {
        return queryAddPatent(req, res, next, personID, updateArr,deleteArr,newArr, newArr[0], 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
        sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        return;
    }
};
var queryUpdatePatent = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    var status_date = momentToDate(data.status_date);
    querySQL = querySQL + 'UPDATE patents' +
                          ' SET patent_type_id = ?,' +
                          ' authors_raw = ?,' +
                          ' title = ?,' +
                          ' reference_number1 = ?,' +
                          ' reference_number2 = ?,' +
                          ' status_id = ?,' +
                          ' status_date = ?,' +
                          ' description = ?' +
                          ' WHERE id = ?;';
    places.push(data.patent_type_id,
                data.authors_raw,
                data.title,
                data.reference1,
                data.reference2,
                data.patent_status_id,
                status_date,
                data.description,
                data.patent_id);
    // first delete all ocurrences of patent in people_patent
    querySQL = querySQL + 'DELETE FROM people_patents WHERE patent_id = ?;';
    places.push(data.patent_id);
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_patents (patent_id, person_id) VALUES (?,?);';
        places.push(data.patent_id, data.person_id[el]);
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
                if (i + 1 < updateArr.length) {
                    return queryUpdatePatent(req, res, next, personID,
                                updateArr,deleteArr,newArr, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeletePatent(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddPatent(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryDeletePatent = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'DELETE FROM people_patents' +
                          ' WHERE person_id = ? AND patent_id = ?;';
    places.push(personID, data.patent_id);
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
                if (i + 1 < deleteArr.length) {
                    return queryDeletePatent(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddPatent(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryAddPatent = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    var status_date = momentToDate(data.status_date);
    querySQL = querySQL + 'INSERT INTO patents' +
                          ' (patent_type_id, authors_raw, title, reference_number1, reference_number2, status_id, status_date, description)' +
                          ' VALUES (?, ?, ?, ?, ?, ?, ?, ?);';
    places.push(data.patent_type_id,
                data.authors_raw,
                data.title,
                data.reference1,
                data.reference2,
                data.patent_status_id,
                status_date,
                data.description);
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
                var patentID = resQuery.insertId;
                return queryAddPatentPerson(req, res, next, personID,updateArr,deleteArr,newArr, data, i, patentID);
            }
        );
    });
};
var queryAddPatentPerson = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i, patentID) {
    var querySQL = '';
    var places = [];
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_patents (person_id, patent_id) VALUES (?,?);';
        places.push(data.person_id[el], patentID);
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
                if (i + 1 < newArr.length) {
                    return queryAddPatent(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[i+1], i+1);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};

var queryAllPrizes = function (req, res, next) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_prizes.*,' +
                          ' prizes.recipients, prizes.name, prizes.organization, prizes.year, prizes.amount_euro, prizes.notes ' +
                          'FROM people_prizes' +
                          ' LEFT JOIN prizes ON prizes.id = people_prizes.prize_id;';
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
                if (resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                resQuery = compactData(resQuery, 'prize_id', 'person_id');
                sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                        "result" : resQuery});
                return;
            }
        );
    });
};
var queryPersonPrizes = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_prizes.*, ' +
                          ' prizes.recipients, prizes.name, prizes.organization, prizes.year, prizes.amount_euro, prizes.notes ' +
                          'FROM people_prizes' +
                          ' LEFT JOIN prizes ON prizes.id = people_prizes.prize_id' +
                          ' WHERE people_prizes.prize_id = ANY ' +
                          ' (SELECT people_prizes.prize_id FROM people_prizes WHERE people_prizes.person_id = ?);';
    places.push(personID);
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
                if (resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                resQuery = compactData(resQuery, 'prize_id', 'person_id');
                sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                        "result" : resQuery});
                return;
            }
        );
    });
};
var queryUpdatePersonPrizes = function (req, res, next) {
    var personID = req.params.personID;
    var updateArr = req.body.updatePrize;
    var newArr = req.body.newPrize;
    var deleteArr = req.body.deletePrize;
    if (updateArr.length > 0) {
        return queryUpdatePrize(req, res, next, personID, updateArr,deleteArr,newArr, updateArr[0], 0);
    } else if (deleteArr.length > 0) {
        return queryDeletePrize(req, res, next, personID, updateArr,deleteArr,newArr, deleteArr[0], 0);
    } else if (newArr.length > 0) {
        return queryAddPrize(req, res, next, personID, updateArr,deleteArr,newArr, newArr[0], 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
        sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        return;
    }
};
var queryUpdatePrize = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'UPDATE prizes' +
                          ' SET recipients = ?, name = ?,' +
                          ' organization = ?,' +
                          ' year = ?,' +
                          ' amount_euro = ?,' +
                          ' notes = ? ' +
                          ' WHERE id = ?;';
    places.push(data.recipients,
                data.name,
                data.organization,
                data.year,
                data.amount_euro,
                data.notes,
                data.prize_id);
    // first delete all ocurrences of patent in people_patent
    querySQL = querySQL + 'DELETE FROM people_prizes WHERE prize_id = ?;';
    places.push(data.prize_id);
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_prizes (prize_id, person_id) VALUES (?,?);';
        places.push(data.prize_id, data.person_id[el]);
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
                if (i + 1 < updateArr.length) {
                    return queryUpdatePrize(req, res, next, personID,
                                updateArr,deleteArr,newArr, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeletePrize(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddPrize(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryDeletePrize = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'DELETE FROM people_prizes' +
                          ' WHERE person_id = ? AND prize_id = ?;';
    places.push(personID, data.prize_id);
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
                if (i + 1 < deleteArr.length) {
                    return queryDeletePrize(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddPrize(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryAddPrize = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'INSERT INTO prizes' +
                          ' (recipients, name, organization, year, amount_euro, notes)' +
                          ' VALUES (?, ?, ?, ?, ?, ?);';
    places.push(data.recipients,
                data.name,
                data.organization,
                data.year,
                data.amount_euro,
                data.notes);
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
                var prizeID = resQuery.insertId;
                return queryAddPrizePerson(req, res, next, personID,updateArr,deleteArr,newArr, data, i, prizeID);
            }
        );
    });
};
var queryAddPrizePerson = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i, prizeID) {
    var querySQL = '';
    var places = [];
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_prizes (person_id, prize_id) VALUES (?,?);';
        places.push(data.person_id[el], prizeID);
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
                if (i + 1 < newArr.length) {
                    return queryAddPrize(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[i+1], i+1);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};

var queryAllDatasets = function (req, res, next) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_data_sets.*,' +
                          ' data_sets.short_description, data_sets.number_sets, data_sets.data_set_type_id, data_set_types.name,' +
                          ' data_sets.database_name, data_sets.url, data_sets.year ' +
                          'FROM people_data_sets' +
                          ' LEFT JOIN data_sets ON data_sets.id = people_data_sets.data_set_id'+
                          ' LEFT JOIN data_set_types ON data_set_types.id = data_sets.data_set_type_id;';
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
                if (resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                resQuery = compactData(resQuery, 'data_set_id', 'person_id');
                sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                        "result" : resQuery});
                return;
            }
        );
    });
};
var queryPersonDatasets = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_data_sets.*, ' +
                          ' data_sets.short_description, data_sets.number_sets, data_sets.data_set_type_id, data_set_types.name,' +
                          ' data_sets.database_name, data_sets.url, data_sets.year ' +
                          'FROM people_data_sets' +
                          ' LEFT JOIN data_sets ON data_sets.id = people_data_sets.data_set_id' +
                          ' LEFT JOIN data_set_types ON data_set_types.id = data_sets.data_set_type_id' +
                          ' WHERE people_data_sets.data_set_id = ANY ' +
                          ' (SELECT people_data_sets.data_set_id FROM people_data_sets WHERE people_data_sets.person_id = ?);';
    places.push(personID);
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
                if (resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                resQuery = compactData(resQuery, 'data_set_id', 'person_id');
                sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                        "result" : resQuery});
                return;
            }
        );
    });
};
var queryUpdatePersonDatasets = function (req, res, next) {
    var personID = req.params.personID;
    var updateArr = req.body.updateDataset;
    var newArr = req.body.newDataset;
    var deleteArr = req.body.deleteDataset;
    if (updateArr.length > 0) {
        return queryUpdateDataset(req, res, next, personID, updateArr,deleteArr,newArr, updateArr[0], 0);
    } else if (deleteArr.length > 0) {
        return queryDeleteDataset(req, res, next, personID, updateArr,deleteArr,newArr, deleteArr[0], 0);
    } else if (newArr.length > 0) {
        return queryAddDataset(req, res, next, personID, updateArr,deleteArr,newArr, newArr[0], 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
        sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        return;
    }
};
var queryUpdateDataset = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'UPDATE data_sets' +
                          ' SET short_description = ?,' +
                          ' number_sets = ?,' +
                          ' data_set_type_id = ?,' +
                          ' database_name = ?,' +
                          ' year = ?,' +
                          ' url = ? ' +
                          ' WHERE id = ?;';
    places.push(data.short_description,
                data.number_sets,
                data.data_set_type_id,
                data.database_name,
                data.year,
                data.url,
                data.data_set_id);
    // first delete all ocurrences of patent in people_patent
    querySQL = querySQL + 'DELETE FROM people_data_sets WHERE data_set_id = ?;';
    places.push(data.data_set_id);
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_data_sets (data_set_id, person_id) VALUES (?,?);';
        places.push(data.data_set_id, data.person_id[el]);
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
                if (i + 1 < updateArr.length) {
                    return queryUpdateDataset(req, res, next, personID,
                                updateArr,deleteArr,newArr, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeleteDataset(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddDataset(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryDeleteDataset = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'DELETE FROM people_data_sets' +
                          ' WHERE person_id = ? AND data_set_id = ?;';
    places.push(personID, data.data_set_id);
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
                if (i + 1 < deleteArr.length) {
                    return queryDeleteDataset(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddDataset(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryAddDataset = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'INSERT INTO data_sets' +
                          ' (short_description, number_sets, data_set_type_id, database_name, year, url)' +
                          ' VALUES (?, ?, ?, ?, ?, ?);';
    places.push(data.short_description,
                data.number_sets,
                data.data_set_type_id,
                data.database_name,
                data.year,
                data.url);
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
                var datasetID = resQuery.insertId;
                return queryAddDatasetPerson(req, res, next, personID,updateArr,deleteArr,newArr, data, i, datasetID);
            }
        );
    });
};
var queryAddDatasetPerson = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i, datasetID) {
    var querySQL = '';
    var places = [];
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_data_sets (person_id, data_set_id) VALUES (?,?);';
        places.push(data.person_id[el], datasetID);
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
                if (i + 1 < newArr.length) {
                    return queryAddDataset(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[i+1], i+1);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};


/************************* Public API Person Queries **************************/
module.exports.getPublicationInfo = function (req, res, next) {
    var pubID = req.params.pubID;
    var querySQL = 'SELECT people_publications.selected AS person_selected,' +
                    ' labs_publications.selected AS lab_selected,'+
                    ' people_publications.person_id, people_publications.public AS person_public,' +
                    ' labs_publications.lab_id,labs_publications.group_id, units.id AS unit_id, labs_publications.public AS lab_public,' +
                    ' units_publications.unit_id AS unit_pub_unit_id, units_publications.public AS unit_public,' +
                    ' publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM publications' +
                    ' LEFT JOIN people_publications ON people_publications.publication_id = publications.id' +
                    ' LEFT JOIN labs_publications ON labs_publications.publication_id = publications.id' +
                    ' LEFT JOIN units_publications ON units_publications.publication_id = publications.id' +
                    ' LEFT JOIN labs ON labs.id = labs_publications.lab_id' +
                    ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                    ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                    ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                    ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                    ' LEFT JOIN journals ON publications.journal_id = journals.id' +
                    ' WHERE publications.id = ?;';
    var places = [pubID];
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
                if(resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "No data returned!", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                var publications = processPublications(resQuery);
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": publications.length,
                     "result" : publications});
                return;
            }
        );
    });
};
module.exports.getAllPublications = function (req, res, next) {
    var unitID = null;
    /*
    if (req.query.hasOwnProperty('unit')) {
        unitID = req.query.unit;
    }
    */
    var querySQL = 'SELECT people_publications.selected AS person_selected,' +
                    ' labs_publications.selected AS lab_selected,'+
                    ' people_publications.person_id, people_publications.public AS person_public,' +
                    ' labs_publications.lab_id,labs_publications.group_id, units.id AS unit_id, labs_publications.public AS lab_public,' +
                    ' units_publications.unit_id AS unit_pub_unit_id, units_publications.public AS unit_public,' +
                    ' publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM publications' +
                    ' LEFT JOIN people_publications ON people_publications.publication_id = publications.id' +
                    ' LEFT JOIN labs_publications ON labs_publications.publication_id = publications.id' +
                    ' LEFT JOIN units_publications ON units_publications.publication_id = publications.id' +
                    ' LEFT JOIN labs ON labs.id = labs_publications.lab_id' +
                    ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                    ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                    ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                    ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                    ' LEFT JOIN journals ON publications.journal_id = journals.id';
    var places = [];
    /*
    if (unitID !== null) {
        querySQL = querySQL + ' WHERE units.id = ?';
        places.push(unitID);
    }
    */
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
                if(resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "No data returned!", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                var publications = processPublications(resQuery);

                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": publications.length,
                     "result" : publications});
                return;
            }
        );
    });
};
module.exports.getPersonPublicationInfo = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = 'SELECT people_publications.author_type_id,' +
                    ' people_publications.selected, publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM people_publications' +
                    ' LEFT JOIN author_types ON people_publications.author_type_id = author_types.id' +
                    ' LEFT JOIN publications ON people_publications.publication_id = publications.id' +
                    ' LEFT JOIN journals ON publications.journal_id = journals.id' +
                    ' WHERE people_publications.person_id = ? AND people_publications.public = 1;';
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
                if(resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "No data returned!", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                for (var ind in resQuery) {
                    if (resQuery[ind].selected === null) {resQuery[ind].selected = false;}
                    else if (resQuery[ind].selected !== null) {resQuery[ind].selected = true;}
                }
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": resQuery.length,
                     "result" : resQuery});
                return;
            }
        );
    });
};
module.exports.getLabPublicationInfo = function (req, res, next) {
    var labID = req.params.labID;
    var groupID = req.params.groupID;
    var querySQL = 'SELECT labs_publications.selected AS selected, publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM labs_publications' +
                    ' LEFT JOIN publications ON labs_publications.publication_id = publications.id' +
                    ' LEFT JOIN journals ON publications.journal_id = journals.id' +
                    ' WHERE labs_publications.group_id = ? AND labs_publications.lab_id = ?' +
                    ' AND  labs_publications.public = 1;';
    var places = [groupID,labID];
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
                if(resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "No data returned!", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                for (var ind in resQuery) {
                    if (resQuery[ind].selected === null) {resQuery[ind].selected = false;}
                    else if (resQuery[ind].selected !== null) {resQuery[ind].selected = true;}
                }
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": resQuery.length,
                     "result" : resQuery});
                return;
            }
        );
    });
};
module.exports.getGroupPublicationInfo = function (req, res, next) {
    var groupID = req.params.groupID;
    var querySQL = 'SELECT publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM labs_publications' +
                    ' LEFT JOIN publications ON labs_publications.publication_id = publications.id' +
                    ' LEFT JOIN journals ON publications.journal_id = journals.id' +
                    ' WHERE labs_publications.group_id = ?' +
                    ' AND  labs_publications.public = 1;';
    var places = [groupID];
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
                if(resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "No data returned!", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                for (var ind in resQuery) {
                    if (resQuery[ind].selected === null) {resQuery[ind].selected = false;}
                    else if (resQuery[ind].selected !== null) {resQuery[ind].selected = true;}
                }
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": resQuery.length,
                     "result" : resQuery});
                return;
            }
        );
    });
};
module.exports.getUnitPublicationInfo = function (req, res, next) {
    var unitID = req.params.unitID;
    var querySQL = 'SELECT people_publications.selected AS person_selected,' +
                    ' labs_publications.selected AS lab_selected,'+
                    ' people_publications.person_id, people_publications.public AS person_public,' +
                    ' labs_publications.lab_id,labs_publications.group_id, units.id AS unit_id, labs_publications.public AS lab_public,' +
                    ' units_publications.unit_id AS unit_pub_unit_id, units_publications.public AS unit_public,' +
                    ' publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM publications' +
                    ' LEFT JOIN people_publications ON people_publications.publication_id = publications.id' +
                    ' LEFT JOIN labs_publications ON labs_publications.publication_id = publications.id' +
                    ' LEFT JOIN units_publications ON units_publications.publication_id = publications.id' +
                    ' LEFT JOIN labs ON labs.id = labs_publications.lab_id' +
                    ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                    ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                    ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                    ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                    ' LEFT JOIN journals ON publications.journal_id = journals.id' +
                    ' WHERE units_publications.unit_id = ? AND units_publications.public = 1;';
    var places = [unitID];
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
                if(resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {"status": "No data returned!", "statusCode": 200, "count": 0,
                        "result" : []});
                    return;
                }
                var publications = processPublications(resQuery);
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": publications.length,
                     "result" : publications});
                return;
            }
        );
    });
};

/******************** Call SQL Generators after Validations *******************/

module.exports.listAllPublications = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryAllPublications(req,res,next);
        }
    );
};
module.exports.listPersonPublications = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryPersonPublications(req,res,next);
        }
    );
};
module.exports.listTeamPublications = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryTeamPublications(req,res,next);
        }
    );
};
module.exports.listMembersPublications = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryMembersPublications(req,res,next);
        }
    );
};
module.exports.updatePersonSelectedPub = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonSelectedPublications(req,res,next);
        }
    );
};
module.exports.updatePersonAuthorNames = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonAuthorNames(req,res,next);
        }
    );
};
module.exports.deletePublicationsPerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryDeletePublicationsPerson(req,res,next);
        }
    );
};
module.exports.deletePublicationsTeam = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryDeletePublicationsTeam(req,res,next);
        }
    );
};
module.exports.addPublicationsPerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryAddPublicationsPerson(req,res,next);
        }
    );
};
module.exports.addPublicationsLab = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryAddPublicationsLab(req,res,next);
        }
    );
};
module.exports.addORCIDPublicationsPerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryORCIDGetJournalID(req,res,next,0);
        }
    );
};
module.exports.addORCIDCommunicationsPerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryORCIDInsertCommunication(req,res,next,0);
        }
    );
};
module.exports.updateTeamSelectedPub = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryUpdateTeamSelectedPublications(req,res,next);
        }
    );
};
module.exports.listPersonCommunications = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryPersonCommunications(req,res,next);
        }
    );
};
module.exports.updatePersonCommunications = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonCommunications(req,res,next,0);
        }
    );
};

module.exports.listPatents = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryAllPatents(req,res,next);
        }
    );
};
module.exports.listPersonPatents = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            queryPersonPatents(req,res,next);
        }
    );
};
module.exports.updatePersonPatents = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonPatents(req,res,next,0);
        }
    );
};

module.exports.listPrizes = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryAllPrizes(req,res,next);
        }
    );
};
module.exports.listPersonPrizes = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryPersonPrizes(req,res,next);
        }
    );
};
module.exports.updatePersonPrizes = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonPrizes(req,res,next,0);
        }
    );
};

module.exports.listDatasets = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryAllDatasets(req,res,next);
        }
    );
};
module.exports.listPersonDatasets = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryPersonDatasets(req,res,next);
        }
    );
};
module.exports.updatePersonDatasets = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonDatasets(req,res,next,0);
        }
    );
};