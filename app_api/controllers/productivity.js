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
    var new_row;
    if (Array.isArray(aggregate_key)) {
        for (var el in arr) {
            if (used_keys.indexOf(arr[el][key]) === -1) {
                used_keys.push(arr[el][key]);
                new_row = Object.assign({}, arr[el]);
                // first of array is the name of the key in the final array
                new_row[aggregate_key[0]] = [];
                for (var el2 in arr) {
                    if (arr[el2][key] == arr[el][key]) {
                        var new_obj = {};
                        for (var el_agg in aggregate_key) {
                            new_obj[aggregate_key[el_agg]] = arr[el2][aggregate_key[el_agg]];
                            if (aggregate_key[el_agg] !== aggregate_key[0]) {
                                delete new_row[aggregate_key[el_agg]];
                            }
                        }
                        new_row[aggregate_key[0]].push(new_obj);
                    }
                }
                compact_arr.push(new_row);
            }
        }
    } else {
        for (var el in arr) {
            if (used_keys.indexOf(arr[el][key]) === -1) {
                used_keys.push(arr[el][key]);
                new_row = Object.assign({}, arr[el]);
                new_row[aggregate_key] = [];
                for (var el2 in arr) {
                    if (arr[el2][key] == arr[el][key]) {
                        new_row[aggregate_key].push(arr[el2][aggregate_key]);
                    }
                }
                compact_arr.push(new_row);
            }
        }
    }
    return compact_arr;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
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
                                ' people_publications.selected AS selected, people_publications.in_institutional_repository, publications.*,' +
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
var queryPersonPUREPublications = function (req, res, next) {
    let pureID = req.params.pureID;
    let offset = parseInt(req.query.offset, 10);
    let size = parseInt(req.query.size, 10);
    externalAPI.contactPURE(req, res,
        process.env.PURE_BASE_URL,
        process.env.PURE_VERSION,
        process.env.PURE_API_KEY,
        'persons',
        pureID,
        'research-outputs',
        undefined,
        offset,
        size,
        []
        )
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
    querySQL = querySQL + 'SELECT person_id, people.colloquial_name, author_type_id, position ' +
                          'FROM people_publications ' +
                          'JOIN people ON people_publications.person_id = people.id ' +
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
var queryUpdatePersonSelectedCommunications = function (req, res, next) {
    var personID = req.params.personID;
    var addPublic = req.body.addPublicWork;
    var delPublic = req.body.delPublicWork;
    var querySQL = '';
    var places = [];
    for (var ind in addPublic) {
        querySQL = querySQL + 'UPDATE communications' +
                              ' SET public = 1' +
                              ' WHERE id = ?;';
        places.push(addPublic[ind].id);
    }
    for (var ind in delPublic) {
        querySQL = querySQL + 'UPDATE communications' +
                              ' SET public = 0' +
                              ' WHERE id = ?;';
        places.push(delPublic[ind].id);
    }
    if (addPublic.length !== 0 || delPublic.length !== 0) {
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
                    return;
                }
            );
        });
    } else {
        sendJSONResponse(res, 200, {"status": "No changes", "statusCode": 200});
        return;
    }
};

var queryUpdatePublicationData = function (req, res, next) {
    var pubID = req.params.pubID;
    var data = req.body;

    var querySQL = '';
    var places = [];

    for (var ind in data.corresponding_authors) {
        querySQL = querySQL + 'UPDATE people_publications' +
                              ' SET author_type_id = 1' +
                              ' WHERE publication_id = ? AND person_id = ?;';
        places.push(pubID,data.corresponding_authors[ind]);
    }
    // the remaining LAQV/UCIBIO are standard authors
    for (var ind in data.unit_authors) {
        if (data.corresponding_authors.indexOf(data.unit_authors[ind].person_id) === -1) {
            querySQL = querySQL + 'UPDATE people_publications' +
                                  ' SET author_type_id = 2' +
                                  ' WHERE publication_id = ? AND person_id = ?;';
            places.push(pubID,data.unit_authors[ind].person_id);
        }
    }
    // first delete
    querySQL = querySQL + 'DELETE FROM publication_descriptions WHERE publication_id = ?;';
    places.push(pubID);
    // then add publication types
    for (var ind in data.publication_type) {
        if (data.publication_type[ind].id !== null) {
            querySQL = querySQL + 'INSERT INTO publication_descriptions (publication_id, publication_type)' +
                                  ' VALUES (?, ?);';
            places.push(pubID, data.publication_type[ind].id);
        }
    }
    querySQL = querySQL + 'UPDATE people_publications' +
                          ' SET position = ?' +
                          ' WHERE id = ?;';
    places.push(data.author_position, data.people_publications_id);
    if (data.doi !== null && data.doi !== undefined) {
        data.doi = data.doi.toLowerCase()
            .replace('https://doi.org/','')
            .replace('http://dx.doi.org/','')
            .replace('doi: ','')
            .replace('doi:','')
            .replace('doi ','');
    }
    querySQL = querySQL + 'UPDATE publications' +
                          ' SET title = ?,' +
                          ' volume = ?,' +
                          ' page_start = ?,' +
                          ' page_end = ?,' +
                          ' doi = ?,' +
                          ' publication_date = ?' +
                          ' WHERE id = ?;';
    places.push(data.title,
                data.volume,
                data.page_start,
                data.page_end,
                data.doi,
                data.publication_date,
                data.id);
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
                                            'UCIBIO API error updating publication data (id, person) :', [pubID, data.id]);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', pubID,
                                            'LAQV API error updating publication data (id, person) :', [pubID, data.id]);
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": 1,
                     "result" : "OK!"});
                return;
            }
        );
    });
};
var queryUpdateCommunicationData = function (req, res, next) {
    var workID = req.params.workID;
    var data = req.body;

    var querySQL = '';
    var places = [];

    querySQL = querySQL + 'UPDATE communications' +
                          ' SET title = ?,' +
                          ' type_id = ?,' +
                          ' authors_raw = ?,' +
                          ' presenter = ?,' +
                          ' conference_title = ?,' +
                          ' conference_type_id = ?,' +
                          ' international = ?,' +
                          ' city = ?,' +
                          ' country_id = ?,' +
                          ' date = ?' +
                          ' WHERE id = ?;';
    places.push(data.title,
                data.communication_type_id,
                data.authors_raw,
                data.presenter,
                data.conference_title,
                data.conference_type_id,
                data.international,
                data.city,
                data.country_id,
                momentToDate(data.date),
                workID);
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
                return;
            }
        );
    });
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

var queryPUREGetJournalID = function (req, res, next, i) {
    // NOTE: position and year are strings, must be converted to int?
    var add = req.body.newPURE;
    if (add.length > 0) {
        var querySQL = '';
        var places = [];
        var journal_name = add[i].journal_name
            .toLowerCase()
            .replace(/[:;,\-\(\)\.]/g, ' ')
            .replace(/[\s\s]/g, ' ');
        var journal_name_search = '%' + journal_name.replace(/\s/g, '%') + '%';
        querySQL = querySQL + 'SELECT id, name, short_name from journals ' +
            ' WHERE name LIKE ? OR short_name LIKE ?;';
        places.push(journal_name_search, journal_name_search);
        pool.getConnection(function (err, connection) {
            if (err) {
                sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                return;
            }
            connection.query(querySQL, places,
                function (err, resQuery) {
                    // And done with the connection.
                    connection.release();
                    if (err) {
                        sendJSONResponse(res, 400, { "status": "error", "statusCode": 400, "error": err.stack });
                        return;
                    }
                    if (resQuery.length === 0) {
                        // journal name not found, add to journal list
                        return queryPUREInsertNewJournal(req, res, next, i, add[i].journal_name);
                    }
                    if (resQuery.length === 1) {
                        // only 1 journal found, get its identity
                        return queryPURECheckIfExistsPublication(req, res, next, i, resQuery[0].id);
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
                        return queryPURECheckIfExistsPublication(req, res, next, i, resQuery[minInd].id);
                    }
                }
            );
        });
    } else {
        return queryUpdateInstitutionalRepository(req, res, next);
    }
};
var queryPUREInsertNewJournal = function (req, res, next, i, journal_name) {
    var querySQL = '';
    var places = [];
    // PURE journal information contains no short_name version for journal name
    querySQL = querySQL + 'INSERT INTO journals (name, short_name) ' +
        ' VALUES (?,?);';
    places.push(journal_name, journal_name);
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        connection.query(querySQL, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, { "status": "error", "statusCode": 400, "error": err.stack });
                    return;
                }
                var journalID = resQuery.insertId;
                return queryPURECheckIfExistsPublication(req, res, next, i, journalID);
            }
        );
    });
};
var queryPURECheckIfExistsPublication = function (req, res, next, i, journalID) {
    var add = req.body.newPURE;
    var querySQL = '';
    var places = [];
    if (add[i].title !== null && add[i].doi !== null && add[i].doi !== undefined) {
        querySQL = querySQL + 'SELECT id, title, doi FROM publications' +
            ' WHERE title = ? AND doi = ?;';
        places.push(add[i].title, add[i].doi);
    } else if (add[i].title !== null) {
        querySQL = querySQL + 'SELECT id, title, doi FROM publications' +
            ' WHERE title = ?;';
        places.push(add[i].title);
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        connection.query(querySQL, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, { "status": "error", "statusCode": 400, "error": err.stack });
                    return;
                }
                if (resQuery.length === 0) {
                    // publication does not exist
                    return queryPUREInsertPublication(req, res, next, i, journalID);
                } else {
                    // if there are no duplicates only 1 publication at most should appear
                    var pubID = resQuery[0].id;
                    return queryPUREInsertPeoplePublications(req, res, next, i, pubID);
                }
            }
        );
    });
};
var queryPUREInsertPublication = function (req, res, next, i, journalID) {
    var add = req.body.newPURE;
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
    if (add[i].pages !== null && add[i].pages !== undefined ) {
        if (add[i].pages.indexOf('-') !== -1) {
            var pageArray = add[i].pages.split('-');
            pageStart = pageArray[0];
            pageEnd = pageArray[1];
        } else {
            pageStart = add[i].pages;
        }
    }
    var volume = null;
    if (add[i].volume !== null
        && add[i].number !== null && add[i].number !== undefined) {
        volume = add[i].volume + '(' + add[i].number + ')';
    } else {
        volume = add[i].volume;
    }
    var date = null;
    var month;
    if (add[i].month !== null && add[i].month !== undefined) {
        if (isNaN(+add[i].month)) {
            month = moment().month(add[i].month).format('MMM');
        } else {
            month = moment().month(parseInt(add[i].month, 10) - 1).format('MMM');
        }
        if (add[i].day !== null && add[i].day !== undefined) {
            date = month + ' ' + add[i].day;
        } else {
            date = month;
        }
    }
    if (add[i].doi !== null && add[i].doi !== undefined) {
        add[i].doi = add[i].doi.toLowerCase()
            .replace('https://doi.org/', '')
            .replace('http://dx.doi.org/', '')
            .replace('doi: ', '')
            .replace('doi:', '')
            .replace('doi ', '');
    }
    querySQL = querySQL + 'INSERT INTO  publications' +
        ' (authors_raw,number_authors,title,year,journal_id,volume,page_start,page_end,publication_date,doi,publication_source_id)' +
        ' VALUES (?,?,?,?,?,?,?,?,?,?,?);';
    places.push(add[i].authors_raw, numberAuthors, add[i].title, add[i].year,
        journalID, volume, pageStart, pageEnd, date, add[i].doi, 4);
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        connection.query(querySQL, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, { "status": "error", "statusCode": 400, "error": err.stack });
                    return;
                }
                var pubID = resQuery.insertId;
                /*
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'create', 'publications', pubID,
                    'UCIBIO API error creating (adding association of publication to person, from ORCID) (id) :', pubID, i);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'create', 'publications', pubID,
                    'LAQV API error creating (adding association of publication to person, from ORCID) (id) :', pubID, i * add.length);
                */
                if (add[i].publication_type_id !== null && add[i].publication_type_id !== undefined) {
                    if (add[i].publication_type_id.length > 0) {
                        return queryPUREInsertPublicationDescription(req, res, next, i, pubID);
                    } else {
                        return queryPUREInsertPeoplePublications(req, res, next, i, pubID);
                    }
                } else {
                    return queryPUREInsertPeoplePublications(req, res, next, i, pubID);
                }
            }
        );
    });
};
var queryPUREInsertPublicationDescription = function (req, res, next, i, pubID) {
    var add = req.body.newPURE;
    var querySQL = '';
    var places = [];
    for (var ind in add[i].publication_type_id) {
        querySQL = querySQL + 'INSERT INTO publication_descriptions (publication_id, publication_type) ' +
            ' VALUES (?,?);';
        places.push(pubID, add[i].publication_type_id[ind]);
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        connection.query(querySQL, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, { "status": "error", "statusCode": 400, "error": err.stack });
                    return;
                }
                /*
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', pubID,
                    'UCIBIO API error updating (adding description, from ORCID) (id) :', pubID);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', pubID,
                    'LAQV API error updating (adding description, from ORCID) (id) :', pubID);
                */
                return queryPUREInsertPeoplePublications(req, res, next, i, pubID);
            }
        );
    });
};
var queryPUREInsertPeoplePublications = function (req, res, next, i, pubID) {
    var add = req.body.newPURE;
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'INSERT INTO people_publications (person_id, publication_id,author_type_id, position, in_institutional_repository) ' +
        ' VALUES (?,?,?,?,?);';
    places.push(personID, pubID, add[i].author_type_id, add[i].position,1);
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        connection.query(querySQL, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, { "status": "error", "statusCode": 400, "error": err.stack });
                    return;
                }
                externalAPI.contactCreateOrUpdate(WEBSITE_API_BASE_URL[1], 'publications', pubID,
                    'UCIBIO API error updating (adding association to person, from ORCID) (id) :', pubID, i);
                externalAPI.contactCreateOrUpdate(WEBSITE_API_BASE_URL[2], 'publications', pubID,
                    'LAQV API error updating (adding association to person, from ORCID) (id) :', pubID, i + add.length);
                if (i + 1 < add.length) {
                    return queryPUREGetJournalID(req, res, next, i + 1);
                } else {
                    return queryUpdateInstitutionalRepository(req, res, next);
                }
            }
        );
    });
};
var queryUpdateInstitutionalRepository = function (req, res, next) {
    var personID = req.params.personID;
    let update = req.body.matchedPURE;
    if (update.length > 0) {
        var query = 'UPDATE people_publications SET in_institutional_repository = 1 WHERE ';
        var places = [];
        for (var el in update) {
            if (parseInt(el,10) < update.length - 1) {
                query = query + '(person_id = ? AND publication_id = ?) OR ';
            } else {
                query = query + '(person_id = ? AND publication_id = ?);';
            }
            places.push(personID, update[el].id);
        }
        pool.getConnection(function (err, connection) {
            if (err) {
                sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
                return;
            }
            connection.query(query, places,
                function (err, resQuery) {
                    // And done with the connection.
                    connection.release();
                    if (err) {
                        sendJSONResponse(res, 400, { "status": "error", "statusCode": 400, "error": err.stack });
                        return;
                    }
                    sendJSONResponse(res, 200,
                        {
                            "status": "success", "statusCode": 200, "count": 1,
                            "result": "all done"
                        });
                }
            );
        });
    } else {
        sendJSONResponse(res, 200,
            {
                "status": "success", "statusCode": 200, "count": 0,
                "result": "no changes"
            });
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
    if (add[i].title !== null && add[i].doi !== null && add[i].doi !== undefined) {
        querySQL = querySQL + 'SELECT id, title, doi FROM publications' +
                ' WHERE title = ? AND doi = ?;';
        places.push(add[i].title,add[i].doi);
    } else if (add[i].title !== null) {
        querySQL = querySQL + 'SELECT id, title, doi FROM publications' +
            ' WHERE title = ?;';
        places.push(add[i].title);
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
    if (add[i].volume !== null
        && add[i].number !== null && add[i].number !== undefined) {
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
    if (add[i].doi !== null && add[i].doi !== undefined) {
        add[i].doi = add[i].doi.toLowerCase()
                .replace('https://doi.org/','')
                .replace('http://dx.doi.org/','')
                .replace('doi: ','')
                .replace('doi:','')
                .replace('doi ','');
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
                /*
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'create', 'publications', pubID,
                                                'UCIBIO API error creating (adding association of publication to person, from ORCID) (id) :', pubID);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'create', 'publications', pubID,
                                                'LAQV API error creating (adding association of publication to person, from ORCID) (id) :', pubID);
                */
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
                /*
                externalAPI.contact(WEBSITE_API_BASE_URL[1], 'update', 'publications', pubID,
                                                'UCIBIO API error updating (adding description, from ORCID) (id) :', pubID);
                externalAPI.contact(WEBSITE_API_BASE_URL[2], 'update', 'publications', pubID,
                                                'LAQV API error updating (adding description, from ORCID) (id) :', pubID);
                */
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
                externalAPI.contactCreateOrUpdate(WEBSITE_API_BASE_URL[1], 'publications', pubID,
                                                'UCIBIO API error updating (adding association to person, from ORCID) (id) :', pubID, i);
                externalAPI.contactCreateOrUpdate(WEBSITE_API_BASE_URL[2], 'publications', pubID,
                                                'LAQV API error updating (adding association to person, from ORCID) (id) :', pubID, i + add.length);
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
    if (add[i].doi !== null && add[i].doi !== undefined) {
        add[i].doi = add[i].doi.toLowerCase()
                .replace('https://doi.org/','')
                .replace('http://dx.doi.org/','')
                .replace('doi: ','')
                .replace('doi:','')
                .replace('doi ','');
    }
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
        if (upd[i].doi !== null && upd[i].doi !== undefined) {
            upd[i].doi = upd[i].doi.toLowerCase()
                    .replace('https://doi.org/','')
                    .replace('http://dx.doi.org/','')
                    .replace('doi: ','')
                    .replace('doi:','')
                    .replace('doi ','');
        }
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

var queryDeleteCommunicationPerson = function (req, res, next) {
    var personID = req.params.personID;
    var del = req.body.deleteWorks;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM communications' +
                              ' WHERE id = ?;';
        places.push(del[ind].id);
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
var queryTeamCommunications = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT labs_communications.id AS labs_communications_id, communications.*,' +
                                ' communication_types.name AS communication_type_name, ' +
                                ' conference_types.name AS conference_type, ' +
                                ' countries.name AS country_name ' +
                          'FROM labs_communications' +
                          ' LEFT JOIN communications ON labs_communications.communication_id = communications.id' +
                          ' LEFT JOIN countries ON communications.country_id = countries.id' +
                          ' LEFT JOIN communication_types ON communication_types.id = communications.type_id' +
                          ' LEFT JOIN conference_types ON conference_types.id = communications.conference_type_id' +
                          ' WHERE labs_communications.group_id = ? AND labs_communications.lab_id = ?;';
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
                sendJSONResponse(res, 200,
                    {
                        "status": "success",
                        "statusCode": 200,
                        "count": resQuery.length,
                        "result": resQuery
                    });
                return;
            }
        );
    });
};
var queryMembersCommunications = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT communications.*, ' +
                            ' communication_types.name AS communication_type_name, ' +
                            ' conference_types.name AS conference_type, ' +
                            ' countries.name AS country_name ' +
                          ' FROM communications' +
                          ' LEFT JOIN countries ON communications.country_id = countries.id' +
                          ' LEFT JOIN communication_types ON communication_types.id = communications.type_id' +
                          ' LEFT JOIN conference_types ON conference_types.id = communications.conference_type_id' +
                          ' LEFT JOIN people_labs ON people_labs.person_id = communications.person_id' +
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
var queryAddCommunicationsLab = function(req, res, next) {
    var groupID = req.params.groupID;
    var teamID = req.params.teamID;
    var add = req.body.addCommunications;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO labs_communications (lab_id, group_id, communication_id)' +
                              ' VALUES (?,?,?);';
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
var queryDeleteCommunicationsTeam = function (req, res, next) {
    var del = req.body.deleteCommunications;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM labs_communications' +
                              ' WHERE id = ?;';
        places.push(del[ind].labs_communications_id);
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

var queryTeamPatents = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT labs_patents.id AS labs_patents_id, patents.*,' +
                            ' patent_types.name_en AS patent_type_name, patent_status.name_en AS patent_status_name ' +
                          'FROM labs_patents' +
                          ' LEFT JOIN patents ON labs_patents.patent_id = patents.id' +
                          ' LEFT JOIN patent_types ON patent_types.id = patents.patent_type_id' +
                          ' LEFT JOIN patent_status ON patent_status.id = patents.status_id' +
                          ' WHERE labs_patents.group_id = ? AND labs_patents.lab_id = ?;';
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
                sendJSONResponse(res, 200,
                    {
                        "status": "success",
                        "statusCode": 200,
                        "count": resQuery.length,
                        "result": resQuery
                    });
                return;
            }
        );
    });
};
var queryMembersPatents = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT patents.*,' +
                            ' patent_types.name_en AS patent_type_name, patent_status.name_en AS patent_status_name ' +
                          ' FROM patents' +
                          ' LEFT JOIN patent_types ON patent_types.id = patents.patent_type_id' +
                          ' LEFT JOIN patent_status ON patent_status.id = patents.status_id' +
                          ' LEFT JOIN people_patents ON people_patents.patent_id = patents.id' +
                          ' LEFT JOIN people_labs ON people_labs.person_id = people_patents.person_id' +
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
var queryAddPatentsLab = function(req, res, next) {
    var groupID = req.params.groupID;
    var teamID = req.params.teamID;
    var add = req.body.addPatents;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO labs_patents (lab_id, group_id, patent_id)' +
                              ' VALUES (?,?,?);';
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
var queryDeletePatentsTeam = function (req, res, next) {
    var del = req.body.deletePatents;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM labs_patents' +
                              ' WHERE id = ?;';
        places.push(del[ind].labs_patents_id);
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

var queryTeamPrizes = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT labs_prizes.id AS labs_prizes_id, prizes.* ' +
                          'FROM labs_prizes' +
                          ' LEFT JOIN prizes ON labs_prizes.prize_id = prizes.id' +
                          ' WHERE labs_prizes.group_id = ? AND labs_prizes.lab_id = ?;';
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
                sendJSONResponse(res, 200,
                    {
                        "status": "success",
                        "statusCode": 200,
                        "count": resQuery.length,
                        "result": resQuery
                    });
                return;
            }
        );
    });
};
var queryMembersPrizes = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT prizes.*' +
                          ' FROM prizes' +
                          ' LEFT JOIN people_prizes ON people_prizes.prize_id = prizes.id' +
                          ' LEFT JOIN people_labs ON people_labs.person_id = people_prizes.person_id' +
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
var queryAddPrizesLab = function(req, res, next) {
    var groupID = req.params.groupID;
    var teamID = req.params.teamID;
    var add = req.body.addPrizes;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO labs_prizes (lab_id, group_id, prize_id)' +
                              ' VALUES (?,?,?);';
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
var queryDeletePrizesTeam = function (req, res, next) {
    var del = req.body.deletePrizes;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM labs_prizes' +
                              ' WHERE id = ?;';
        places.push(del[ind].labs_prizes_id);
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

var queryTeamDatasets = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT labs_data_sets.id AS labs_data_sets_id, data_sets.*, data_set_types.name AS data_set_type_name' +
                          ' FROM labs_data_sets' +
                          ' LEFT JOIN data_sets ON labs_data_sets.data_set_id = data_sets.id' +
                          ' LEFT JOIN data_set_types ON data_set_types.id = data_sets.data_set_type_id' +
                          ' WHERE labs_data_sets.group_id = ? AND labs_data_sets.lab_id = ?;';
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
                sendJSONResponse(res, 200,
                    {
                        "status": "success",
                        "statusCode": 200,
                        "count": resQuery.length,
                        "result": resQuery
                    });
                return;
            }
        );
    });
};
var queryMembersDatasets = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT data_sets.*, data_set_types.name AS data_set_type_name' +
                          ' FROM data_sets' +
                          ' LEFT JOIN data_set_types ON data_set_types.id = data_sets.data_set_type_id' +
                          ' LEFT JOIN people_data_sets ON people_data_sets.data_set_id = data_sets.id' +
                          ' LEFT JOIN people_labs ON people_labs.person_id = people_data_sets.person_id' +
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
var queryAddDatasetsLab = function(req, res, next) {
    var groupID = req.params.groupID;
    var teamID = req.params.teamID;
    var add = req.body.addDatasets;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO labs_data_sets (lab_id, group_id, data_set_id)' +
                              ' VALUES (?,?,?);';
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
var queryDeleteDatasetsTeam = function (req, res, next) {
    var del = req.body.deleteDatasets;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM labs_data_sets' +
                              ' WHERE id = ?;';
        places.push(del[ind].labs_data_sets_id);
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

var queryTeamStartups = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT labs_startups.id AS labs_startups_id, startups.*' +
                          ' FROM labs_startups' +
                          ' LEFT JOIN startups ON labs_startups.startup_id = startups.id' +
                          ' WHERE labs_startups.group_id = ? AND labs_startups.lab_id = ?;';
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
                sendJSONResponse(res, 200,
                    {
                        "status": "success",
                        "statusCode": 200,
                        "count": resQuery.length,
                        "result": resQuery
                    });
                return;
            }
        );
    });
};
var queryMembersStartups = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT startups.* ' +
                          ' FROM startups' +
                          ' LEFT JOIN people_startups ON people_startups.startup_id = startups.id' +
                          ' LEFT JOIN people_labs ON people_labs.person_id = people_startups.person_id' +
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
var queryAddStartupsLab = function(req, res, next) {
    var groupID = req.params.groupID;
    var teamID = req.params.teamID;
    var add = req.body.addStartups;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO labs_startups (lab_id, group_id, startup_id)' +
                              ' VALUES (?,?,?);';
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
var queryDeleteStartupsTeam = function (req, res, next) {
    var del = req.body.deleteStartups;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM labs_startups' +
                              ' WHERE id = ?;';
        places.push(del[ind].labs_startups_id);
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

var queryTeamBoards = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT labs_boards.id AS labs_boards_id, boards.*, board_types.name AS board_type_name ' +
                          ' FROM labs_boards' +
                          ' LEFT JOIN boards ON labs_boards.board_id = boards.id' +
                          ' LEFT JOIN board_types ON board_types.id = boards.board_type_id' +
                          ' WHERE labs_boards.group_id = ? AND labs_boards.lab_id = ?;';
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
                sendJSONResponse(res, 200,
                    {
                        "status": "success",
                        "statusCode": 200,
                        "count": resQuery.length,
                        "result": resQuery
                    });
                return;
            }
        );
    });
};
var queryMembersBoards = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT boards.*, board_types.name AS board_type_name ' +
                          ' FROM boards' +
                          ' LEFT JOIN board_types ON board_types.id = boards.board_type_id' +
                          ' LEFT JOIN people_boards ON people_boards.board_id = boards.id' +
                          ' LEFT JOIN people_labs ON people_labs.person_id = people_boards.person_id' +
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
var queryAddBoardsLab = function(req, res, next) {
    var groupID = req.params.groupID;
    var teamID = req.params.teamID;
    var add = req.body.addBoards;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO labs_boards (lab_id, group_id, board_id)' +
                              ' VALUES (?,?,?);';
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
var queryDeleteBoardsTeam = function (req, res, next) {
    var del = req.body.deleteBoards;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM labs_boards' +
                              ' WHERE id = ?;';
        places.push(del[ind].labs_boards_id);
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

var queryTeamOutreaches = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT labs_outreach.id AS labs_outreaches_id, outreach.*' +
                          ' FROM labs_outreach' +
                          ' LEFT JOIN outreach ON labs_outreach.outreach_id = outreach.id' +
                          ' WHERE labs_outreach.group_id = ? AND labs_outreach.lab_id = ?;';
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
                sendJSONResponse(res, 200,
                    {
                        "status": "success",
                        "statusCode": 200,
                        "count": resQuery.length,
                        "result": resQuery
                    });
                return;
            }
        );
    });
};
var queryMembersOutreaches = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT outreach.* ' +
                          ' FROM outreach' +
                          ' LEFT JOIN people_outreach ON people_outreach.outreach_id = outreach.id' +
                          ' LEFT JOIN people_labs ON people_labs.person_id = people_outreach.person_id' +
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
var queryAddOutreachesLab = function(req, res, next) {
    var groupID = req.params.groupID;
    var teamID = req.params.teamID;
    var add = req.body.addOutreaches;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO labs_outreach (lab_id, group_id, outreach_id)' +
                              ' VALUES (?,?,?);';
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
var queryDeleteOutreachesTeam = function (req, res, next) {
    var del = req.body.deleteOutreaches;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM labs_outreach' +
                              ' WHERE id = ?;';
        places.push(del[ind].labs_outreaches_id);
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

var queryAllProjects = function (req, res, next) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_projects.id, people_projects.person_id,  people_projects.position_id, person_project_positions.name_en AS position_name,' +
                          ' projects.id AS project_id, projects.title, projects.acronym, projects.reference,' +
                          ' projects.project_type_id, project_types.name AS project_type,' +
                          ' projects.call_type_id, call_types.name AS call_type,' +
                          ' projects_funding_entities.id AS project_funding_entity_id, projects_funding_entities.funding_entity_id,' +
                          ' funding_agencies.official_name AS funding_entity_official_name, funding_agencies.short_name AS funding_entity_short_name,' +
                          ' projects_other_funding_entities.id AS project_other_funding_entity_id, projects_other_funding_entities.name AS other_funding_entity,' +
                          ' projects_management_entities.id AS project_management_entity_id, projects_management_entities.management_entity_id, projects_management_entities.amount AS entity_amount,' +
                          ' management_entities.official_name AS management_entity_official_name, management_entities.short_name AS management_entity_short_name,' +
                          ' projects.start, projects.end, projects.global_amount,' +
                          ' projects.website, projects.notes ' +
                          'FROM people_projects' +
                          ' RIGHT JOIN projects ON projects.id = people_projects.project_id' +
                          ' LEFT JOIN project_types ON project_types.id = projects.project_type_id' +
                          ' LEFT JOIN person_project_positions ON person_project_positions.id = people_projects.position_id' +
                          ' LEFT JOIN call_types ON call_types.id = projects.call_type_id' +
                          ' LEFT JOIN projects_funding_entities ON projects_funding_entities.project_id = projects.id' +
                          ' LEFT JOIN funding_agencies ON projects_funding_entities.funding_entity_id = funding_agencies.id' +
                          ' LEFT JOIN projects_management_entities ON projects_management_entities.project_id = projects.id' +
                          ' LEFT JOIN management_entities ON projects_management_entities.management_entity_id = management_entities.id' +
                          ' LEFT JOIN projects_other_funding_entities ON projects_other_funding_entities.project_id = projects.id;';
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
                resQuery = compactData(resQuery, 'project_id', ['person_id','position_id','position_name']);
                return queryGetResearchAreasProjects(req, res, next, resQuery, 0);
            }
        );
    });
};
var queryPersonProjects = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_projects.id, people_projects.person_id,  people_projects.position_id, person_project_positions.name_en AS position_name,' +
                          ' projects.id AS project_id, projects.title, projects.acronym, projects.reference,' +
                          ' projects.project_type_id, project_types.name AS project_type,' +
                          ' projects.call_type_id, call_types.name AS call_type,' +
                          ' projects_funding_entities.id AS project_funding_entity_id, projects_funding_entities.funding_entity_id,' +
                          ' funding_agencies.official_name AS funding_agency_official_name, funding_agencies.short_name AS funding_agency_short_name,' +
                          ' projects_other_funding_entities.id AS project_other_funding_entity_id, projects_other_funding_entities.name AS other_funding_entity,' +
                          ' projects_management_entities.id AS project_management_entity_id, projects_management_entities.management_entity_id, projects_management_entities.amount AS entity_amount,' +
                          ' management_entities.official_name AS management_entity_official_name, management_entities.short_name AS management_entity_short_name,' +
                          ' projects.start, projects.end, projects.global_amount,' +
                          ' projects.website, projects.notes ' +
                          'FROM people_projects' +
                          ' LEFT JOIN projects ON projects.id = people_projects.project_id' +
                          ' LEFT JOIN project_types ON project_types.id = projects.project_type_id' +
                          ' LEFT JOIN person_project_positions ON person_project_positions.id = people_projects.position_id' +
                          ' LEFT JOIN call_types ON call_types.id = projects.call_type_id' +
                          ' LEFT JOIN projects_funding_entities ON projects_funding_entities.project_id = projects.id' +
                          ' LEFT JOIN funding_agencies ON projects_funding_entities.funding_entity_id = funding_agencies.id' +
                          ' LEFT JOIN projects_other_funding_entities ON projects_other_funding_entities.project_id = projects.id' +
                          ' LEFT JOIN projects_management_entities ON projects_management_entities.project_id = projects.id' +
                          ' LEFT JOIN management_entities ON projects_management_entities.management_entity_id = management_entities.id' +
                          ' WHERE people_projects.project_id = ANY ' +
                          ' (SELECT people_projects.project_id FROM people_projects WHERE people_projects.person_id = ?);';
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
                resQuery = compactData(resQuery, 'project_id', ['person_id','position_id','position_name']);
                return queryGetResearchAreasProjects(req, res, next, resQuery, 0);
            }
        );
    });
};
var queryGetResearchAreasProjects  = function (req, res, next, rows, i) {
    var projectID = rows[i].project_id;
    var querySQL =  'SELECT research_area AS area ' +
                'FROM project_areas ' +
                'WHERE project_id = ?;';
    var places = [projectID];
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
                rows[i].project_areas = resQuery;
                if (i + 1 < rows.length) {
                    return queryGetResearchAreasProjects(req, res, next, rows, i+1);
                } else {
                    sendJSONResponse(res, 200,
                            {"status": "success", "statusCode": 200, "count": rows.length,
                            "result" : rows});
                    return;
                }
            }
        );
    });
};
var queryUpdatePersonProjects = function (req, res, next) {
    var personID = req.params.personID;
    var updateArr = req.body.updateProject;
    var newArr = req.body.newProject;
    var deleteArr = req.body.deleteProject;
    if (updateArr.length > 0) {
        return queryUpdateProject(req, res, next, personID, updateArr,deleteArr,newArr, updateArr[0], 0);
    } else if (deleteArr.length > 0) {
        return queryDeleteProject(req, res, next, personID, updateArr,deleteArr,newArr, deleteArr[0], 0);
    } else if (newArr.length > 0) {
        return queryAddProject(req, res, next, personID, updateArr,deleteArr,newArr, newArr[0], 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
        sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        return;
    }
};
var queryUpdateProject = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    var start = momentToDate(data.start);
    var end = momentToDate(data.end);
    querySQL = querySQL + 'UPDATE projects' +
                          ' SET project_type_id = ?,' +
                          ' call_type_id = ?,' +
                          ' title = ?,' +
                          ' acronym = ?,' +
                          ' reference = ?,' +
                          ' start = ?,' +
                          ' end = ?,' +
                          ' global_amount = ?,' +
                          ' website = ?,' +
                          ' notes = ?' +
                          ' WHERE id = ?;';
    places.push(data.project_type_id,
                data.call_type_id,
                data.title,
                data.acronym,
                data.reference,
                start,
                end,
                data.global_amount,
                data.website,
                data.notes,
                data.project_id);
    // first delete all ocurrences of project in people_project
    querySQL = querySQL + 'DELETE FROM people_projects WHERE project_id = ?;';
    places.push(data.project_id);
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_projects (person_id, position_id, project_id) VALUES (?, ?, ?);';
        places.push(data.person_id[el].person_id, data.person_id[el].position_id, data.project_id);
    }
    querySQL = querySQL + 'DELETE FROM project_areas WHERE project_id = ?;';
    places.push(data.project_id);
    for (var el in data.project_areas) {
        querySQL = querySQL + 'INSERT INTO project_areas (project_id, research_area) VALUES (?, ?);';
        places.push(data.project_id, data.project_areas[el].area);
    }
    // always delete (it could be initially an 'other funding entity' changed to a pre-defined cal type)
    querySQL = querySQL + 'DELETE FROM projects_funding_entities WHERE project_id = ?;';
    places.push(data.project_id);
    querySQL = querySQL + 'DELETE FROM projects_other_funding_entities WHERE project_id = ?;';
    places.push(data.project_id);
    if (data.funding_entity_id !== null && data.funding_entity_id !== 'other') {
        querySQL = querySQL + 'INSERT INTO projects_funding_entities (project_id, funding_entity_id) VALUES (?, ?);';
        places.push(data.project_id, data.funding_entity_id);
    }
    if (data.funding_entity_id === 'other') {
        querySQL = querySQL + 'INSERT INTO projects_other_funding_entities (project_id, name) VALUES (?, ?);';
        places.push(data.project_id, data.other_funding_entity);
    }
    querySQL = querySQL + 'DELETE FROM projects_management_entities WHERE project_id = ?;';
    places.push(data.project_id);
    if (data.management_entity_id !== null) {
        querySQL = querySQL + 'INSERT INTO projects_management_entities (project_id, management_entity_id, amount) VALUES (?, ?, ?);';
        places.push(data.project_id, data.management_entity_id, data.entity_amount);
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
                    return queryUpdateProject(req, res, next, personID,
                                updateArr,deleteArr,newArr, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeleteProject(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddProject(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryDeleteProject = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'DELETE FROM people_projects' +
                          ' WHERE person_id = ? AND project_id = ?;';
    places.push(personID, data.project_id);
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
                    return queryDeleteProject(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddProject(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryAddProject = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    var start = momentToDate(data.start);
    var end = momentToDate(data.end);

    querySQL = querySQL + 'INSERT INTO projects' +
                          ' (project_type_id, call_type_id, title, acronym, reference, start, end, global_amount, website, notes)' +
                          ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);';
    places.push(data.project_type_id,
                data.call_type_id,
                data.title,
                data.acronym,
                data.reference,
                start,
                end,
                data.global_amount,
                data.website,
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
                var projectID = resQuery.insertId;
                return queryAddProjectPerson(req, res, next, personID,updateArr,deleteArr,newArr, data, i, projectID);
            }
        );
    });
};
var queryAddProjectPerson = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i, projectID) {
    var querySQL = '';
    var places = [];
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_projects (person_id, position_id, project_id) VALUES (?, ?, ?);';
        places.push(data.person_id[el].person_id, data.person_id[el].position_id, projectID);
    }
    // Add remaining info
    for (var el in data.project_areas) {
        querySQL = querySQL + 'INSERT INTO project_areas (project_id, research_area) VALUES (?, ?);';
        places.push(projectID, data.project_areas[el].area);
    }
    if (data.funding_entity_id !== null && data.funding_entity_id !== 'other') {
        querySQL = querySQL + 'INSERT INTO projects_funding_entities (project_id, funding_entity_id) VALUES (?, ?);';
        places.push(projectID, data.funding_entity_id);
    }
    if (data.funding_entity_id === 'other') {
        querySQL = querySQL + 'INSERT INTO projects_other_funding_entities (project_id, name) VALUES (?, ?);';
        places.push(projectID, data.other_funding_entity);
    }
    if (data.management_entity_id !== null) {
        querySQL = querySQL + 'INSERT INTO projects_management_entities (project_id, management_entity_id, amount) VALUES (?, ?, ?);';
        places.push(projectID, data.management_entity_id, data.entity_amount);
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
                    return queryAddProject(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[i+1], i+1);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryTeamProjects = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT labs_projects.id AS labs_projects_id,' +
                          ' people_projects.person_id, people.colloquial_name, people_projects.position_id, person_project_positions.name_en AS position_name,'  +
                          ' projects.id AS project_id, projects.title, projects.acronym, projects.reference,' +
                          ' projects.project_type_id, project_types.name AS project_type,' +
                          ' projects.call_type_id, call_types.name AS call_type,' +
                          ' projects_funding_entities.id AS project_funding_entity_id, projects_funding_entities.funding_entity_id,' +
                          ' funding_agencies.official_name AS funding_agency_official_name, funding_agencies.short_name AS funding_agency_short_name,' +
                          ' projects_other_funding_entities.id AS project_other_funding_entity_id, projects_other_funding_entities.name AS other_funding_entity,' +
                          ' projects_management_entities.id AS project_management_entity_id, projects_management_entities.management_entity_id,  projects_management_entities.amount AS entity_amount,' +
                          ' management_entities.official_name AS management_entity_official_name, management_entities.short_name AS management_entity_short_name,' +
                          ' projects.start, projects.end, projects.global_amount,' +
                          ' projects.website, projects.notes,' +
                          ' labs_projects.amount, labs_projects.percentage_hire_postdoc, percentage_hire_student, percentage_hire_other' +
                          ' FROM labs_projects' +
                          ' LEFT JOIN projects ON labs_projects.project_id = projects.id' +
                          ' LEFT JOIN people_projects ON labs_projects.project_id = people_projects.project_id' +
                          ' LEFT JOIN people ON people.id = people_projects.person_id' +
                          ' LEFT JOIN project_types ON project_types.id = projects.project_type_id' +
                          ' LEFT JOIN person_project_positions ON person_project_positions.id = people_projects.position_id' +
                          ' LEFT JOIN call_types ON call_types.id = projects.call_type_id' +
                          ' LEFT JOIN projects_funding_entities ON projects_funding_entities.project_id = projects.id' +
                          ' LEFT JOIN funding_agencies ON projects_funding_entities.funding_entity_id = funding_agencies.id' +
                          ' LEFT JOIN projects_other_funding_entities ON projects_other_funding_entities.project_id = projects.id' +
                          ' LEFT JOIN projects_management_entities ON projects_management_entities.project_id = projects.id' +
                          ' LEFT JOIN management_entities ON projects_management_entities.management_entity_id = management_entities.id' +
                          ' WHERE labs_projects.group_id = ? AND labs_projects.lab_id = ?;';
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
                resQuery = compactData(resQuery, 'project_id', ['person_id','colloquial_name','position_id','position_name']);
                return queryGetResearchAreasProjects(req, res, next, resQuery, 0);
            }
        );
    });
};
var queryMembersProjects = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT projects.*, projects_management_entities.amount AS entity_amount ' +
                          ' FROM projects' +
                          ' LEFT JOIN people_projects ON people_projects.project_id = projects.id' +
                          ' LEFT JOIN projects_management_entities ON projects_management_entities.project_id = projects.id' +
                          ' LEFT JOIN people_labs ON people_labs.person_id = people_projects.person_id' +
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
var queryAddProjectsLab = function(req, res, next) {
    var groupID = req.params.groupID;
    var teamID = req.params.teamID;
    var add = req.body.addProjects;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO labs_projects (lab_id, group_id, project_id, amount, percentage_hire_postdoc, percentage_hire_student, percentage_hire_other)' +
                              ' VALUES (?,?,?,?,?,?,?);';
        places.push(teamID,groupID, add[ind].id, add[ind].amount, add[ind].percentage_hire_postdoc, add[ind].percentage_hire_student, add[ind].percentage_hire_other);
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
var queryDeleteProjectsTeam = function (req, res, next) {
    var del = req.body.deleteProjects;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM labs_projects' +
                              ' WHERE id = ?;';
        places.push(del[ind].labs_projects_id);
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

var queryAllAgreements = function (req, res, next) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_private_agreements.id, people_private_agreements.person_id,' +
                          ' private_agreements.id AS agreement_id, private_agreements.title, private_agreements.acronym, private_agreements.reference,' +
                          ' private_agreements.agreement_type_id, private_agreement_types.name AS agreement_type,' +
                          ' private_agreements.confidential, private_agreements.start, private_agreements.end,' +
                          ' private_agreements.global_amount,' +
                          ' private_agreements_management_entities.id AS agreement_management_entity_id, private_agreements_management_entities.management_entity_id, private_agreements_management_entities.amount AS entity_amount,' +
                          ' management_entities.official_name AS management_entity_official_name, management_entities.short_name AS management_entity_short_name,' +
                          ' private_agreements.website, private_agreements.notes ' +
                          'FROM people_private_agreements' +
                          ' RIGHT JOIN private_agreements ON private_agreements.id = people_private_agreements.agreement_id' +
                          ' LEFT JOIN private_agreement_types ON private_agreement_types.id = private_agreements.agreement_type_id' +
                          ' LEFT JOIN private_agreements_management_entities ON private_agreements_management_entities.agreement_id = private_agreements.id' +
                          ' LEFT JOIN management_entities ON private_agreements_management_entities.management_entity_id = management_entities.id' +
                          ' WHERE private_agreements.confidential = 0;';
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
                resQuery = compactData(resQuery, 'agreement_id', ['person_id']);
                return queryGetResearchAreasAgreements(req, res, next, resQuery, 0);
            }
        );
    });
};
var queryPersonAgreements = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_private_agreements.id, people_private_agreements.person_id,' +
                          ' private_agreements.id AS agreement_id, private_agreements.title, private_agreements.acronym, private_agreements.reference,' +
                          ' private_agreements.agreement_type_id, private_agreement_types.name AS agreement_type,' +
                          ' private_agreements.confidential, private_agreements.start, private_agreements.end,' +
                          ' private_agreements.global_amount,' +
                          ' private_agreements_management_entities.id AS agreement_management_entity_id, private_agreements_management_entities.management_entity_id, private_agreements_management_entities.amount AS entity_amount,' +
                          ' management_entities.official_name AS management_entity_official_name, management_entities.short_name AS management_entity_short_name,' +
                          ' private_agreements.website, private_agreements.notes ' +
                          'FROM people_private_agreements' +
                          ' LEFT JOIN private_agreements ON private_agreements.id = people_private_agreements.agreement_id' +
                          ' LEFT JOIN private_agreement_types ON private_agreement_types.id = private_agreements.agreement_type_id' +
                          ' LEFT JOIN private_agreements_management_entities ON private_agreements_management_entities.agreement_id = private_agreements.id' +
                          ' LEFT JOIN management_entities ON private_agreements_management_entities.management_entity_id = management_entities.id' +
                          ' WHERE people_private_agreements.agreement_id = ANY ' +
                          ' (SELECT people_private_agreements.agreement_id FROM people_private_agreements WHERE people_private_agreements.person_id = ?);';
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
                resQuery = compactData(resQuery, 'agreement_id', ['person_id']);
                return queryGetResearchAreasAgreements(req, res, next, resQuery, 0);
            }
        );
    });
};
var queryGetResearchAreasAgreements  = function (req, res, next, rows, i) {
    var agreementID = rows[i].agreement_id;
    var querySQL =  'SELECT research_area AS area ' +
                'FROM private_agreement_areas ' +
                'WHERE agreement_id = ?;';
    var places = [agreementID];
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
                rows[i].agreement_areas = resQuery;
                if (i + 1 < rows.length) {
                    return queryGetResearchAreasAgreements(req, res, next, rows, i+1);
                } else {
                    return queryGetPartnersAgreements(req, res, next, rows, 0);
                }
            }
        );
    });
};
var queryGetPartnersAgreements  = function (req, res, next, rows, i) {
    var agreementID = rows[i].agreement_id;
    var querySQL =  'SELECT private_agreements_partners.*, countries.name AS country ' +
                'FROM private_agreements_partners ' +
                ' LEFT JOIN countries ON private_agreements_partners.country_id = countries.id ' +
                'WHERE agreement_id = ?;';
    var places = [agreementID];
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
                rows[i].agreement_partners = resQuery;
                if (i + 1 < rows.length) {
                    return queryGetPartnersAgreements(req, res, next, rows, i+1);
                } else {
                    sendJSONResponse(res, 200,
                            {"status": "success", "statusCode": 200, "count": rows.length,
                            "result" : rows});
                    return;
                }
            }
        );
    });
};
var queryUpdatePersonAgreements = function (req, res, next) {
    var personID = req.params.personID;
    var updateArr = req.body.updateAgreement;
    var newArr = req.body.newAgreement;
    var deleteArr = req.body.deleteAgreement;
    if (updateArr.length > 0) {
        return queryUpdateAgreement(req, res, next, personID, updateArr,deleteArr,newArr, updateArr[0], 0);
    } else if (deleteArr.length > 0) {
        return queryDeleteAgreement(req, res, next, personID, updateArr,deleteArr,newArr, deleteArr[0], 0);
    } else if (newArr.length > 0) {
        return queryAddAgreement(req, res, next, personID, updateArr,deleteArr,newArr, newArr[0], 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
        sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        return;
    }
};
var queryUpdateAgreement = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    var start = momentToDate(data.start);
    var end = momentToDate(data.end);
    querySQL = querySQL + 'UPDATE private_agreements' +
                          ' SET agreement_type_id = ?,' +
                          ' confidential = ?,' +
                          ' title = ?,' +
                          ' acronym = ?,' +
                          ' reference = ?,' +
                          ' start = ?,' +
                          ' end = ?,' +
                          ' global_amount = ?,' +
                          ' website = ?,' +
                          ' notes = ?' +
                          ' WHERE id = ?;';
    places.push(data.agreement_type_id,
                data.confidential,
                data.title,
                data.acronym,
                data.reference,
                start,
                end,
                data.global_amount,
                data.website,
                data.notes,
                data.agreement_id);
    // first delete all ocurrences of agreement in people_agreement
    querySQL = querySQL + 'DELETE FROM people_private_agreements WHERE agreement_id = ?;';
    places.push(data.agreement_id);
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_private_agreements (person_id, agreement_id) VALUES (?, ?);';
        places.push(data.person_id[el].person_id, data.agreement_id);
    }
    querySQL = querySQL + 'DELETE FROM private_agreement_areas WHERE agreement_id = ?;';
    places.push(data.agreement_id);
    for (var el in data.agreement_areas) {
        querySQL = querySQL + 'INSERT INTO private_agreement_areas (agreement_id, research_area) VALUES (?, ?);';
        places.push(data.agreement_id, data.agreement_areas[el].area);
    }
    querySQL = querySQL + 'DELETE FROM private_agreements_partners WHERE agreement_id = ?;';
    places.push(data.agreement_id);
    for (var el in data.agreement_partners) {
        querySQL = querySQL + 'INSERT INTO private_agreements_partners (agreement_id, name, country_id) VALUES (?, ?, ?);';
        places.push(data.agreement_id, data.agreement_partners[el].name, data.agreement_partners[el].country_id);
    }
    querySQL = querySQL + 'DELETE FROM private_agreements_management_entities WHERE agreement_id = ?;';
    places.push(data.agreement_id);
    if (data.management_entity_id !== null) {
        querySQL = querySQL + 'INSERT INTO private_agreements_management_entities (agreement_id, management_entity_id, amount) VALUES (?, ?, ?);';
        places.push(data.agreement_id, data.management_entity_id, data.entity_amount);
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
                    return queryUpdateAgreement(req, res, next, personID,
                                updateArr,deleteArr,newArr, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeleteAgreement(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddAgreement(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryDeleteAgreement = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'DELETE FROM people_private_agreements' +
                          ' WHERE person_id = ? AND agreement_id = ?;';
    places.push(personID, data.agreement_id);
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
                    return queryDeleteAgreement(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddAgreement(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryAddAgreement = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    var start = momentToDate(data.start);
    var end = momentToDate(data.end);

    querySQL = querySQL + 'INSERT INTO private_agreements' +
                          ' (agreement_type_id, confidential, title, acronym, reference, start, end, global_amount, website, notes)' +
                          ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);';
    places.push(data.agreement_type_id,
                data.confidential,
                data.title,
                data.acronym,
                data.reference,
                start,
                end,
                data.global_amount,
                data.website,
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
                var agreementID = resQuery.insertId;
                return queryAddAgreementPerson(req, res, next, personID,updateArr,deleteArr,newArr, data, i, agreementID);
            }
        );
    });
};
var queryAddAgreementPerson = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i, agreementID) {
    var querySQL = '';
    var places = [];
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_private_agreements (person_id, agreement_id) VALUES (?, ?);';
        places.push(data.person_id[el].person_id, agreementID);
    }
    // Add remaining info
    for (var el in data.agreement_areas) {
        querySQL = querySQL + 'INSERT INTO private_agreement_areas (agreement_id, research_area) VALUES (?, ?);';
        places.push(agreementID, data.agreement_areas[el].area);
    }
    for (var el in data.agreement_partners) {
        querySQL = querySQL + 'INSERT INTO private_agreements_partners (agreement_id, name, country_id) VALUES (?, ?, ?);';
        places.push(agreementID, data.agreement_partners[el].name, data.agreement_partners[el].country_id);
    }
    if (data.management_entity_id !== null) {
        querySQL = querySQL + 'INSERT INTO private_agreements_management_entities (agreement_id, management_entity_id, amount) VALUES (?, ?, ?);';
        places.push(agreementID, data.management_entity_id, data.entity_amount);
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
                    return queryAddAgreement(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[i+1], i+1);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryTeamAgreements = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT labs_private_agreements.id AS labs_private_agreements_id,' +
                          ' people_private_agreements.person_id, people.colloquial_name,'  +
                          ' private_agreements.id AS agreement_id, private_agreements.confidential, private_agreements.title, private_agreements.acronym, private_agreements.reference,' +
                          ' private_agreements.agreement_type_id, private_agreement_types.name AS agreement_type,' +
                          ' private_agreements_management_entities.id AS agreement_management_entity_id, private_agreements_management_entities.management_entity_id,  private_agreements_management_entities.amount AS entity_amount,' +
                          ' management_entities.official_name AS management_entity_official_name, management_entities.short_name AS management_entity_short_name,' +
                          ' private_agreements.start, private_agreements.end, private_agreements.global_amount,' +
                          ' private_agreements.website, private_agreements.notes,' +
                          ' labs_private_agreements.amount, labs_private_agreements.percentage_hire_postdoc, percentage_hire_student, percentage_hire_other' +
                          ' FROM labs_private_agreements' +
                          ' LEFT JOIN private_agreements ON labs_private_agreements.agreement_id = private_agreements.id' +
                          ' LEFT JOIN people_private_agreements ON labs_private_agreements.agreement_id = people_private_agreements.agreement_id' +
                          ' LEFT JOIN people ON people.id = people_private_agreements.person_id' +
                          ' LEFT JOIN private_agreement_types ON private_agreement_types.id = private_agreements.agreement_type_id' +
                          ' LEFT JOIN private_agreements_management_entities ON private_agreements_management_entities.agreement_id = private_agreements.id' +
                          ' LEFT JOIN management_entities ON private_agreements_management_entities.management_entity_id = management_entities.id' +
                          ' WHERE labs_private_agreements.group_id = ? AND labs_private_agreements.lab_id = ?;';
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
                resQuery = compactData(resQuery, 'agreement_id', ['person_id','colloquial_name']);
                return queryGetResearchAreasAgreements(req, res, next, resQuery, 0);
            }
        );
    });
};
var queryMembersAgreements = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT private_agreements.*, private_agreements_management_entities.amount AS entity_amount ' +
                          ' FROM private_agreements' +
                          ' LEFT JOIN people_private_agreements ON people_private_agreements.agreement_id = private_agreements.id' +
                          ' LEFT JOIN private_agreements_management_entities ON private_agreements_management_entities.agreement_id = private_agreements.id' +
                          ' LEFT JOIN people_labs ON people_labs.person_id = people_private_agreements.person_id' +
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
var queryAddAgreementsLab = function(req, res, next) {
    var groupID = req.params.groupID;
    var teamID = req.params.teamID;
    var add = req.body.addAgreements;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO labs_private_agreements (lab_id, group_id, agreement_id, amount, percentage_hire_postdoc, percentage_hire_student, percentage_hire_other)' +
                              ' VALUES (?,?,?,?,?,?,?);';
        places.push(teamID,groupID, add[ind].id, add[ind].amount, add[ind].percentage_hire_postdoc, add[ind].percentage_hire_student, add[ind].percentage_hire_other);
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
var queryDeleteAgreementsTeam = function (req, res, next) {
    var del = req.body.deleteAgreements;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM labs_private_agreements' +
                              ' WHERE id = ?;';
        places.push(del[ind].labs_private_agreements_id);
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

var queryAllTrainings = function (req, res, next) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_training_networks.id, people_training_networks.person_id,' +
                          ' people_training_networks.role_id, training_network_roles.name AS role_name,' +
                          ' training_networks.id AS training_id, training_networks.network_name, training_networks.title,' +
                          ' training_networks.acronym, training_networks.reference,' +
                          ' training_networks.start, training_networks.end,' +
                          ' training_networks.coordinating_entity, training_networks.country_id,' +
                          ' training_networks.global_amount,' +
                          ' training_networks_management_entities.id AS training_management_entity_id, training_networks_management_entities.management_entity_id, training_networks_management_entities.amount AS entity_amount,' +
                          ' management_entities.official_name AS management_entity_official_name, management_entities.short_name AS management_entity_short_name,' +
                          ' training_networks.website, training_networks.notes ' +
                          'FROM people_training_networks' +
                          ' RIGHT JOIN training_networks ON training_networks.id = people_training_networks.training_id' +
                          ' LEFT JOIN training_network_roles ON people_training_networks.role_id = training_network_roles.id' +
                          ' LEFT JOIN training_networks_management_entities ON training_networks_management_entities.training_id = training_networks.id' +
                          ' LEFT JOIN management_entities ON training_networks_management_entities.management_entity_id = management_entities.id;';
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
                resQuery = compactData(resQuery, 'training_id', ['person_id','role_id','role_name']);
                sendJSONResponse(res, 200,
                            {"status": "success", "statusCode": 200, "count": resQuery.length,
                            "result" : resQuery});
                return;
            }
        );
    });
};
var queryPersonTrainings = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_training_networks.id, people_training_networks.person_id,' +
                          ' people_training_networks.role_id, training_network_roles.name AS role_name,' +
                          ' training_networks.id AS training_id, training_networks.network_name, training_networks.title,' +
                          ' training_networks.acronym, training_networks.reference,' +
                          ' training_networks.start, training_networks.end,' +
                          ' training_networks.coordinating_entity, training_networks.country_id,' +
                          ' training_networks.global_amount,' +
                          ' training_networks_management_entities.id AS training_management_entity_id, training_networks_management_entities.management_entity_id, training_networks_management_entities.amount AS entity_amount,' +
                          ' management_entities.official_name AS management_entity_official_name, management_entities.short_name AS management_entity_short_name,' +
                          ' training_networks.website, training_networks.notes ' +
                          'FROM people_training_networks' +
                          ' LEFT JOIN training_networks ON training_networks.id = people_training_networks.training_id' +
                          ' LEFT JOIN training_network_roles ON people_training_networks.role_id = training_network_roles.id' +
                          ' LEFT JOIN training_networks_management_entities ON training_networks_management_entities.training_id = training_networks.id' +
                          ' LEFT JOIN management_entities ON training_networks_management_entities.management_entity_id = management_entities.id' +
                          ' WHERE people_training_networks.training_id = ANY ' +
                          ' (SELECT people_training_networks.training_id FROM people_training_networks WHERE people_training_networks.person_id = ?);';
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
                resQuery = compactData(resQuery, 'training_id', ['person_id','role_id','role_name']);
                sendJSONResponse(res, 200,
                            {"status": "success", "statusCode": 200, "count": resQuery.length,
                            "result" : resQuery});
                return;
            }
        );
    });
};
var queryUpdatePersonTrainings = function (req, res, next) {
    var personID = req.params.personID;
    var updateArr = req.body.updateTraining;
    var newArr = req.body.newTraining;
    var deleteArr = req.body.deleteTraining;
    if (updateArr.length > 0) {
        return queryUpdateTraining(req, res, next, personID, updateArr,deleteArr,newArr, updateArr[0], 0);
    } else if (deleteArr.length > 0) {
        return queryDeleteTraining(req, res, next, personID, updateArr,deleteArr,newArr, deleteArr[0], 0);
    } else if (newArr.length > 0) {
        return queryAddTraining(req, res, next, personID, updateArr,deleteArr,newArr, newArr[0], 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
        sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        return;
    }
};
var queryUpdateTraining = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    var start = momentToDate(data.start);
    var end = momentToDate(data.end);
    querySQL = querySQL + 'UPDATE training_networks' +
                          ' SET network_name = ?,' +
                          ' title = ?,' +
                          ' acronym = ?,' +
                          ' reference = ?,' +
                          ' start = ?,' +
                          ' end = ?,' +
                          ' coordinating_entity = ?,' +
                          ' country_id = ?,' +
                          ' global_amount = ?,' +
                          ' website = ?,' +
                          ' notes = ?' +
                          ' WHERE id = ?;';
    places.push(data.network_name,
                data.title,
                data.acronym,
                data.reference,
                start,
                end,
                data.coordinating_entity,
                data.country_id,
                data.global_amount,
                data.website,
                data.notes,
                data.training_id);
    // first delete all ocurrences of agreement in people_agreement
    querySQL = querySQL + 'DELETE FROM people_training_networks WHERE training_id = ?;';
    places.push(data.training_id);
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_training_networks (person_id, training_id, role_id) VALUES (?, ?, ?);';
        places.push(data.person_id[el].person_id, data.training_id, data.person_id[el].role_id);
    }
    querySQL = querySQL + 'DELETE FROM training_networks_management_entities WHERE training_id = ?;';
    places.push(data.training_id);
    if (data.management_entity_id !== null) {
        querySQL = querySQL + 'INSERT INTO training_networks_management_entities (training_id, management_entity_id, amount) VALUES (?, ?, ?);';
        places.push(data.training_id, data.management_entity_id, data.entity_amount);
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
                    return queryUpdateTraining(req, res, next, personID,
                                updateArr,deleteArr,newArr, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeleteTraining(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddTraining(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryDeleteTraining = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'DELETE FROM people_training_networks' +
                          ' WHERE person_id = ? AND training_id = ?;';
    places.push(personID, data.training_id);
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
                    return queryDeleteTraining(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddTraining(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryAddTraining = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    var start = momentToDate(data.start);
    var end = momentToDate(data.end);

    querySQL = querySQL + 'INSERT INTO training_networks' +
                          ' (network_name, title, acronym, reference, coordinating_entity, country_id, start, end, global_amount, website, notes)' +
                          ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);';
    places.push(data.network_name,
                data.title,
                data.acronym,
                data.reference,
                data.coordinating_entity,
                data.country_id,
                start,
                end,
                data.global_amount,
                data.website,
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
                var trainingID = resQuery.insertId;
                return queryAddTrainingPerson(req, res, next, personID,updateArr,deleteArr,newArr, data, i, trainingID);
            }
        );
    });
};
var queryAddTrainingPerson = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i, trainingID) {
    var querySQL = '';
    var places = [];
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_training_networks (person_id, training_id, role_id) VALUES (?, ?, ?);';
        places.push(data.person_id[el].person_id, trainingID, data.person_id[el].role_id);
    }
    // Add remaining info
    if (data.management_entity_id !== null) {
        querySQL = querySQL + 'INSERT INTO training_networks_management_entities (training_id, management_entity_id, amount) VALUES (?, ?, ?);';
        places.push(trainingID, data.management_entity_id, data.entity_amount);
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
                    return queryAddTraining(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[i+1], i+1);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};

var queryTeamTrainings = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT labs_training_networks.id AS labs_training_networks_id,' +
                          ' people_training_networks.person_id, people.colloquial_name,'  +
                          ' people_training_networks.role_id, training_network_roles.name AS role_name,' +
                          ' training_networks.id AS training_id, training_networks.network_name, training_networks.title,' +
                          ' training_networks.acronym, training_networks.reference,' +
                          ' training_networks.start, training_networks.end,' +
                          ' training_networks.coordinating_entity, training_networks.country_id, countries.name AS country_name,' +
                          ' training_networks.global_amount,' +
                          ' training_networks_management_entities.id AS training_management_entity_id, training_networks_management_entities.management_entity_id, training_networks_management_entities.amount AS entity_amount,' +
                          ' management_entities.official_name AS management_entity_official_name, management_entities.short_name AS management_entity_short_name,' +
                          ' training_networks.website, training_networks.notes, ' +
                          ' labs_training_networks.amount ' +
                          ' FROM labs_training_networks' +
                          ' LEFT JOIN training_networks ON labs_training_networks.training_id = training_networks.id' +
                          ' LEFT JOIN people_training_networks ON labs_training_networks.training_id = people_training_networks.training_id' +
                          ' LEFT JOIN people ON people.id = people_training_networks.person_id' +
                          ' LEFT JOIN countries ON training_networks.country_id = countries.id' +
                          ' LEFT JOIN training_network_roles ON people_training_networks.role_id = training_network_roles.id' +
                          ' LEFT JOIN training_networks_management_entities ON training_networks_management_entities.training_id = training_networks.id' +
                          ' LEFT JOIN management_entities ON training_networks_management_entities.management_entity_id = management_entities.id' +
                          ' WHERE labs_training_networks.group_id = ? AND labs_training_networks.lab_id = ?;';
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
                resQuery = compactData(resQuery, 'training_id', ['person_id','colloquial_name','role_id','role_name']);
                sendJSONResponse(res, 200,
                    {
                        "status": "success", "statusCode": 200, "count": resQuery.length, "result": resQuery
                    });
                return;
            }
        );
    });
};
var queryMembersTrainings = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT training_networks.*, training_networks_management_entities.amount AS entity_amount ' +
                          ' FROM training_networks' +
                          ' LEFT JOIN people_training_networks ON people_training_networks.training_id = training_networks.id' +
                          ' LEFT JOIN training_networks_management_entities ON training_networks_management_entities.training_id = training_networks.id' +
                          ' LEFT JOIN people_labs ON people_labs.person_id = people_training_networks.person_id' +
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
var queryAddTrainingsLab = function(req, res, next) {
    var groupID = req.params.groupID;
    var teamID = req.params.teamID;
    var add = req.body.addTrainings;
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO labs_training_networks (lab_id, group_id, training_id, amount)' +
                              ' VALUES (?,?,?,?);';
        places.push(teamID,groupID, add[ind].id, add[ind].amount);
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
var queryDeleteTrainingsTeam = function (req, res, next) {
    var del = req.body.deleteTrainings;
    var querySQL = '';
    var places = [];
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM labs_training_networks' +
                              ' WHERE id = ?;';
        places.push(del[ind].labs_training_networks_id);
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

var queryAllPatents = function (req, res, next) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_patents.id, people_patents.person_id, patents.id AS patent_id, patents.authors_raw, ' +
                          ' patents.title, patents.reference_number1 AS reference1, patents.reference_number2 AS reference2, ' +
                          ' patents.patent_type_id, patent_types.name_en AS patent_type,' +
                          ' patents.status_id AS patent_status_id, patent_status.name_en AS patent_status,' +
                          ' patents.status_date AS status_date, patents.description ' +
                          'FROM people_patents' +
                          ' RIGHT JOIN patents ON patents.id = people_patents.patent_id' +
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
    querySQL = querySQL + 'SELECT people_prizes.id, people_prizes.person_id, prizes.id AS prize_id,' +
                          ' prizes.recipients, prizes.name, prizes.organization, prizes.year, prizes.amount_euro, prizes.notes ' +
                          'FROM people_prizes' +
                          ' RIGHT JOIN prizes ON prizes.id = people_prizes.prize_id;';
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
    querySQL = querySQL + 'SELECT people_data_sets.id, people_data_sets.person_id, data_sets.id AS data_set_id,' +
                          ' data_sets.short_description, data_sets.number_sets, data_sets.data_set_type_id, data_set_types.name,' +
                          ' data_sets.database_name, data_sets.url, data_sets.year ' +
                          'FROM people_data_sets' +
                          ' RIGHT JOIN data_sets ON data_sets.id = people_data_sets.data_set_id'+
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

var queryAllStartups = function (req, res, next) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_startups.id, people_startups.person_id, startups.id AS startup_id,' +
                          ' startups.short_description, startups.name, startups.start, startups.end ' +
                          'FROM people_startups' +
                          ' RIGHT JOIN startups ON startups.id = people_startups.startup_id';
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
                resQuery = compactData(resQuery, 'startup_id', ['person_id','position_name']);
                sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                        "result" : resQuery});
                return;
            }
        );
    });
};
var queryPersonStartups = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_startups.*,' +
                          ' startups.short_description, startups.name, startups.start, startups.end ' +
                          'FROM people_startups' +
                          ' LEFT JOIN startups ON startups.id = people_startups.startup_id' +
                          ' WHERE people_startups.startup_id = ANY ' +
                          ' (SELECT people_startups.startup_id FROM people_startups WHERE people_startups.person_id = ?);';
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
                resQuery = compactData(resQuery, 'startup_id', ['person_id','position_name']);
                sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                        "result" : resQuery});
                return;
            }
        );
    });
};
var queryUpdatePersonStartups = function (req, res, next) {
    var personID = req.params.personID;
    var updateArr = req.body.updateStartup;
    var newArr = req.body.newStartup;
    var deleteArr = req.body.deleteStartup;
    if (updateArr.length > 0) {
        return queryUpdateStartup(req, res, next, personID, updateArr,deleteArr,newArr, updateArr[0], 0);
    } else if (deleteArr.length > 0) {
        return queryDeleteStartup(req, res, next, personID, updateArr,deleteArr,newArr, deleteArr[0], 0);
    } else if (newArr.length > 0) {
        return queryAddStartup(req, res, next, personID, updateArr,deleteArr,newArr, newArr[0], 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
        sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        return;
    }
};
var queryUpdateStartup = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var start = momentToDate(data.start);
    var end = momentToDate(data.end);
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'UPDATE startups' +
                          ' SET name = ?,' +
                          ' start = ?,' +
                          ' end = ?,' +
                          ' short_description = ?' +
                          ' WHERE id = ?;';
    places.push(data.name,
                start,
                end,
                data.short_description,
                data.startup_id);
    // first delete all ocurrences of patent in people_patent
    querySQL = querySQL + 'DELETE FROM people_startups WHERE startup_id = ?;';
    places.push(data.startup_id);
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_startups (startup_id, person_id, position_name) VALUES (?,?,?);';
        places.push(data.startup_id, data.person_id[el].person_id, data.person_id[el].position_name);
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
                    return queryUpdateStartup(req, res, next, personID,
                                updateArr,deleteArr,newArr, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeleteStartup(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddStartup(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryDeleteStartup = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'DELETE FROM people_startups' +
                          ' WHERE person_id = ? AND startup_id = ?;';
    places.push(personID, data.startup_id);
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
                    return queryDeleteStartup(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddStartup(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryAddStartup = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    var start = momentToDate(data.start);
    var end = momentToDate(data.end);
    querySQL = querySQL + 'INSERT INTO startups' +
                          ' (name, start, end, short_description)' +
                          ' VALUES (?, ?, ?, ?);';
    places.push(data.name,
                start,
                end,
                data.short_description);
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
                var startupID = resQuery.insertId;
                return queryAddStartupPerson(req, res, next, personID,updateArr,deleteArr,newArr, data, i, startupID);
            }
        );
    });
};
var queryAddStartupPerson = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i, startupID) {
    var querySQL = '';
    var places = [];
    for (var el in data.person_id) {
        querySQL = querySQL + 'INSERT INTO people_startups (person_id, startup_id, position_name) VALUES (?,?,?);';
        places.push(data.person_id[el].person_id, startupID, data.person_id[el].position_name);
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
                    return queryAddStartup(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[i+1], i+1);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};

var queryPersonBoards = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_boards.*, ' +
                          ' boards.short_description, boards.role, boards.board_type_id, boards.board_name, board_types.name,' +
                          ' boards.international, boards.start_date, boards.end_date ' +
                          'FROM people_boards' +
                          ' LEFT JOIN boards ON boards.id = people_boards.board_id' +
                          ' LEFT JOIN board_types ON board_types.id = boards.board_type_id' +
                          ' WHERE people_boards.board_id = ANY ' +
                          ' (SELECT people_boards.board_id FROM people_boards WHERE people_boards.person_id = ?);';
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
                resQuery = compactData(resQuery, 'board_id', 'person_id');
                sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                        "result" : resQuery});
                return;
            }
        );
    });
};
var queryUpdatePersonBoards = function (req, res, next) {
    var personID = req.params.personID;
    var updateArr = req.body.updateBoard;
    var newArr = req.body.newBoard;
    var deleteArr = req.body.deleteBoard;
    if (updateArr.length > 0) {
        return queryUpdateBoard(req, res, next, personID, updateArr,deleteArr,newArr, updateArr[0], 0);
    } else if (deleteArr.length > 0) {
        return queryDeleteBoard(req, res, next, personID, updateArr,deleteArr,newArr, deleteArr[0], 0);
    } else if (newArr.length > 0) {
        return queryAddBoard(req, res, next, personID, updateArr,deleteArr,newArr, newArr[0], 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
        sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        return;
    }
};
var queryUpdateBoard = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'UPDATE boards' +
                          ' SET short_description = ?,' +
                          ' role = ?,' +
                          ' board_type_id = ?,' +
                          ' board_name = ?,' +
                          ' international = ?,' +
                          ' start_date = ?,' +
                          ' end_date = ? ' +
                          ' WHERE id = ?;';
    places.push(data.short_description,
                data.role,
                data.board_type_id,
                data.board_name,
                data.international,
                momentToDate(data.start_date),
                momentToDate(data.end_date),
                data.board_id);
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
                    return queryUpdateBoard(req, res, next, personID,
                                updateArr,deleteArr,newArr, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeleteBoard(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddBoard(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryDeleteBoard = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'DELETE FROM people_boards' +
                          ' WHERE person_id = ? AND board_id = ?;';
    places.push(personID, data.board_id);
    querySQL = querySQL + 'DELETE FROM boards' +
                          ' WHERE id = ?;';
    places.push(data.board_id);
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
                    return queryDeleteBoard(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddBoard(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryAddBoard = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'INSERT INTO boards' +
                          ' (short_description, role, board_type_id, board_name, international, start_date, end_date)' +
                          ' VALUES (?, ?, ?, ?, ?, ?, ?);';
    places.push(data.short_description,
                data.role,
                data.board_type_id,
                data.board_name,
                data.international,
                momentToDate(data.start_date),
                momentToDate(data.end_date));
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
                var boardID = resQuery.insertId;
                return queryAddBoardPerson(req, res, next, personID,updateArr,deleteArr,newArr, data, i, boardID);
            }
        );
    });
};
var queryAddBoardPerson = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i, boardID) {
    var querySQL = '';
    var places = [];

    querySQL = querySQL + 'INSERT INTO people_boards (person_id, board_id) VALUES (?,?);';
    places.push(personID, boardID);

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
                    return queryAddBoard(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[i+1], i+1);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};

var queryPersonOutreaches = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'SELECT people_outreach.*, ' +
                          ' outreach.name, outreach.description,' +
                          ' outreach.international, outreach.event_date ' +
                          'FROM people_outreach' +
                          ' LEFT JOIN outreach ON outreach.id = people_outreach.outreach_id' +
                          ' WHERE people_outreach.outreach_id = ANY ' +
                          ' (SELECT people_outreach.outreach_id FROM people_outreach WHERE people_outreach.person_id = ?);';
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
                resQuery = compactData(resQuery, 'outreach_id', 'person_id');
                sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                        "result" : resQuery});
                return;
            }
        );
    });
};
var queryUpdatePersonOutreaches = function (req, res, next) {
    var personID = req.params.personID;
    var updateArr = req.body.updateOutreach;
    var newArr = req.body.newOutreach;
    var deleteArr = req.body.deleteOutreach;
    if (updateArr.length > 0) {
        return queryUpdateOutreach(req, res, next, personID, updateArr,deleteArr,newArr, updateArr[0], 0);
    } else if (deleteArr.length > 0) {
        return queryDeleteOutreach(req, res, next, personID, updateArr,deleteArr,newArr, deleteArr[0], 0);
    } else if (newArr.length > 0) {
        return queryAddOutreach(req, res, next, personID, updateArr,deleteArr,newArr, newArr[0], 0);
    }
    if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
        sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        return;
    }
};
var queryUpdateOutreach = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'UPDATE outreach' +
                          ' SET description = ?,' +
                          ' name = ?,' +
                          ' international = ?,' +
                          ' event_date = ?' +
                          ' WHERE id = ?;';
    places.push(data.description,
                data.name,
                data.international,
                momentToDate(data.event_date),
                data.outreach_id);
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
                    return queryUpdateOutreach(req, res, next, personID,
                                updateArr,deleteArr,newArr, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeleteOutreach(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddOutreach(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryDeleteOutreach = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'DELETE FROM people_outreach' +
                          ' WHERE person_id = ? AND outreach_id = ?;';
    places.push(personID, data.outreach_id);
    querySQL = querySQL + 'DELETE FROM outreach' +
                          ' WHERE id = ?;';
    places.push(data.outreach_id);
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
                    return queryDeleteOutreach(req, res, next, personID,
                                updateArr,deleteArr,newArr, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddOutreach(req, res, next, personID,
                                updateArr,deleteArr,newArr, newArr[0], 0);
                } else {
                    sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
                    return;
                }
            }
        );
    });
};
var queryAddOutreach = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'INSERT INTO outreach' +
                          ' (description, name, international, event_date)' +
                          ' VALUES (?, ?, ?, ?);';
    places.push(data.description,
                data.name,
                data.international,
                momentToDate(data.event_date));
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
                var outreachID = resQuery.insertId;
                return queryAddOutreachPerson(req, res, next, personID,updateArr,deleteArr,newArr, data, i, outreachID);
            }
        );
    });
};
var queryAddOutreachPerson = function (req, res, next, personID,updateArr,deleteArr,newArr, data, i, outreachID) {
    var querySQL = '';
    var places = [];

    querySQL = querySQL + 'INSERT INTO people_outreach (person_id, outreach_id) VALUES (?,?);';
    places.push(personID, outreachID);

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
                    return queryAddOutreach(req, res, next, personID,
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
module.exports.getLatestPublications = function (req, res, next) {
    let unitID = req.params.unitID;
    let numberPublications = 20; // the default number of publications to retrieve
    let currentYear = moment().year();
    let now = moment();
    var querySQL;
    var places;

    if (req.query.hasOwnProperty('size')) {
        numberPublications = parseInt(req.query.size, 10);
    }
    if (now.isAfter(moment(currentYear + '-04-30'))) {
        querySQL = 'SELECT publications.*, journals.name AS journal_name'
                + ' FROM publications'
                + ' LEFT JOIN journals ON journals.id = publications.journal_id'
                + ' LEFT JOIN units_publications ON units_publications.publication_id = publications.id'
                + ' WHERE publications.year = ? AND units_publications.unit_id = ?;';
        places = [currentYear, unitID];
    } else {
        querySQL = 'SELECT publications.*, journals.name AS journal_name'
                + ' FROM publications'
                + ' LEFT JOIN journals ON journals.id = publications.journal_id'
                + ' LEFT JOIN units_publications ON units_publications.publication_id = publications.id'
                + ' WHERE (publications.year = ? OR publications.year = ?) AND units_publications.unit_id = ?;';
        places = [currentYear, currentYear - 1, unitID];
    }
    pool.getConnection(function (err, connection) {
        if (err) {
            sendJSONResponse(res, 500, { "status": "error", "statusCode": 500, "error": err.stack });
            return;
        }
        connection.query(querySQL, places,
            function (err, resQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, { "status": "error", "statusCode": 400, "error": err.stack });
                    return;
                }
                if (resQuery.length === 0 || resQuery === undefined) {
                    sendJSONResponse(res, 200,
                        {
                            "status": "No data returned!", "statusCode": 200, "count": 0,
                            "result": []
                        });
                    return;
                } else {
                    if (resQuery.length < numberPublications) {
                        sendJSONResponse(res, 200,
                            {
                                "status": "Success", "statusCode": 200, "count": resQuery.length,
                                "result": resQuery
                            });
                        return;

                    } else {
                        // get all publications in which month (and preferably day) is known
                        // sorts publications according to publication date
                        // and then picks up first numberPublications
                        let publicationsWithDate = [];
                        let idsUsed = [];
                        for (let ind in resQuery) {
                            if (resQuery[ind].publication_date !== null) {
                                let thisDate = resQuery[ind].publication_date;
                                let dateComponents = thisDate.split(' ');
                                let month = null;
                                let day = null;
                                let addToList = false;
                                if (dateComponents.length === 1) {
                                    // might be a number (reject)
                                    // a string representing only month
                                    // a range of months (e.g. 'MAY-JUN') (take only  first)
                                    if (!Number.isNaN(parseInt(dateComponents[0], 10))) {
                                        // is a number => do nothing
                                    } else if (dateComponents[0].includes('-')) {
                                        let dateRangeSplit = dateComponents[0].split('-');
                                        let initialMonth = dateRangeSplit[0];
                                        if (moment(initialMonth, 'MMM').isValid()) {
                                            month = moment(initialMonth, 'MMM').month();
                                            day = 1;
                                            addToList = true;
                                        }
                                    } else {
                                        // this must be a single month
                                        if (moment(dateComponents[0], 'MMM').isValid()) {
                                            month = moment(dateComponents[0], 'MMM').month();
                                            day = 1;
                                            addToList = true;
                                        }
                                    }
                                } else if (dateComponents.length === 2) {
                                    if (moment(thisDate, ['MMM DD', 'MMM D']).isValid()) {
                                        month = moment(thisDate, ['MMM DD', 'MMM D']).month();
                                        day = moment(thisDate, ['MMM DD', 'MMM D']).date();
                                        addToList = true;
                                    }
                                }
                                if (addToList) {
                                    resQuery[ind].curated_date = moment({
                                        year: currentYear,
                                        month: month,
                                        day: day
                                    });
                                    publicationsWithDate.push(resQuery[ind]);
                                    idsUsed.push(resQuery[ind].id);
                                }
                            }
                        }
                        publicationsWithDate.sort((a, b) => {
                            if (a.curated_date.isBefore(b.curated_date)) {
                                return +1;
                            } else {
                                return -1;
                            }
                        });
                        if (publicationsWithDate.length < numberPublications) {
                            // adding random publications from the remaining to fill array
                            while (publicationsWithDate.length < numberPublications
                                    && publicationsWithDate.length < resQuery.length) {
                                let indRand = getRandomInt(0, numberPublications);
                                if (idsUsed.indexOf(indRand) === -1) {
                                    publicationsWithDate.push(resQuery[indRand]);
                                    idsUsed.push(resQuery[indRand].id);
                                }
                            }

                            sendJSONResponse(res, 200,
                                {
                                    "status": "Success", "statusCode": 200, "count": publicationsWithDate.length,
                                    "result": publicationsWithDate
                                });
                            return;

                        } else {
                            sendJSONResponse(res, 200,
                                {
                                    "status": "Success", "statusCode": 200, "count": numberPublications,
                                    "result": publicationsWithDate.slice(0, numberPublications)
                                });
                            return;
                        }
                    }
                }
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
module.exports.listPersonPUREPublications = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryPersonPUREPublications(req, res, next);
        }
    );
};

module.exports.addPUREPublicationsPerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryPUREGetJournalID(req, res, next, 0);
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
module.exports.updatePublicationData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePublicationData(req,res,next);
        }
    );
};

module.exports.updatePersonSelectedComm = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonSelectedCommunications(req,res,next);
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
module.exports.updateCommunicationData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdateCommunicationData(req,res,next);
        }
    );
};
module.exports.deleteCommunicationsPerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryDeleteCommunicationPerson(req,res,next);
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

module.exports.listStartups = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryAllStartups(req,res,next);
        }
    );
};
module.exports.listPersonStartups = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryPersonStartups(req,res,next);
        }
    );
};
module.exports.updatePersonStartups = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonStartups(req,res,next,0);
        }
    );
};

module.exports.listPersonBoards = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryPersonBoards(req,res,next);
        }
    );
};
module.exports.updatePersonBoards = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonBoards(req,res,next,0);
        }
    );
};

module.exports.listPersonOutreaches = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryPersonOutreaches(req,res,next);
        }
    );
};
module.exports.updatePersonOutreaches = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonOutreaches(req,res,next,0);
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

module.exports.listTeamCommunications = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryTeamCommunications(req,res,next);
        }
    );
};
module.exports.listMembersCommunications = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryMembersCommunications(req,res,next);
        }
    );
};
module.exports.addCommunicationsLab = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryAddCommunicationsLab(req,res,next);
        }
    );
};
module.exports.deleteCommunicationsTeam = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryDeleteCommunicationsTeam(req,res,next);
        }
    );
};

module.exports.listProjects = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryAllProjects(req,res,next);
        }
    );
};
module.exports.listPersonProjects = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            queryPersonProjects(req,res,next);
        }
    );
};
module.exports.updatePersonProjects = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonProjects(req,res,next,0);
        }
    );
};
module.exports.listTeamProjects = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryTeamProjects(req,res,next);
        }
    );
};
module.exports.listMembersProjects = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryMembersProjects(req,res,next);
        }
    );
};
module.exports.addProjectsLab = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryAddProjectsLab(req,res,next);
        }
    );
};
module.exports.deleteProjectsTeam = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryDeleteProjectsTeam(req,res,next);
        }
    );
};

module.exports.listAgreements = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryAllAgreements(req,res,next);
        }
    );
};
module.exports.listPersonAgreements = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            queryPersonAgreements(req,res,next);
        }
    );
};
module.exports.updatePersonAgreements = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonAgreements(req,res,next,0);
        }
    );
};
module.exports.listTeamAgreements = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryTeamAgreements(req,res,next);
        }
    );
};
module.exports.listMembersAgreements = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryMembersAgreements(req,res,next);
        }
    );
};
module.exports.addAgreementsLab = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryAddAgreementsLab(req,res,next);
        }
    );
};
module.exports.deleteAgreementsTeam = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryDeleteAgreementsTeam(req,res,next);
        }
    );
};


module.exports.listTrainings = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryAllTrainings(req,res,next);
        }
    );
};
module.exports.listPersonTrainings = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            queryPersonTrainings(req,res,next);
        }
    );
};
module.exports.updatePersonTrainings = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryUpdatePersonTrainings(req,res,next,0);
        }
    );
};
module.exports.listTeamTrainings = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryTeamTrainings(req,res,next);
        }
    );
};
module.exports.listMembersTrainings = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryMembersTrainings(req,res,next);
        }
    );
};
module.exports.addTrainingsLab = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryAddTrainingsLab(req,res,next);
        }
    );
};
module.exports.deleteTrainingsTeam = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryDeleteTrainingsTeam(req,res,next);
        }
    );
};



module.exports.listTeamPatents = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryTeamPatents(req,res,next);
        }
    );
};
module.exports.listMembersPatents = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryMembersPatents(req,res,next);
        }
    );
};
module.exports.addPatentsLab = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryAddPatentsLab(req,res,next);
        }
    );
};
module.exports.deletePatentsTeam = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryDeletePatentsTeam(req,res,next);
        }
    );
};

module.exports.listTeamPrizes = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryTeamPrizes(req,res,next);
        }
    );
};
module.exports.listMembersPrizes = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryMembersPrizes(req,res,next);
        }
    );
};
module.exports.addPrizesLab = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryAddPrizesLab(req,res,next);
        }
    );
};
module.exports.deletePrizesTeam = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryDeletePrizesTeam(req,res,next);
        }
    );
};

module.exports.listTeamDatasets = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryTeamDatasets(req,res,next);
        }
    );
};
module.exports.listMembersDatasets = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryMembersDatasets(req,res,next);
        }
    );
};
module.exports.addDatasetsLab = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryAddDatasetsLab(req,res,next);
        }
    );
};
module.exports.deleteDatasetsTeam = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryDeleteDatasetsTeam(req,res,next);
        }
    );
};

module.exports.listTeamStartups = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryTeamStartups(req,res,next);
        }
    );
};
module.exports.listMembersStartups = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryMembersStartups(req,res,next);
        }
    );
};
module.exports.addStartupsLab = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryAddStartupsLab(req,res,next);
        }
    );
};
module.exports.deleteStartupsTeam = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryDeleteStartupsTeam(req,res,next);
        }
    );
};

module.exports.listTeamBoards = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryTeamBoards(req,res,next);
        }
    );
};
module.exports.listMembersBoards = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryMembersBoards(req,res,next);
        }
    );
};
module.exports.addBoardsLab = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryAddBoardsLab(req,res,next);
        }
    );
};
module.exports.deleteBoardsTeam = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryDeleteBoardsTeam(req,res,next);
        }
    );
};

module.exports.listTeamOutreaches = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryTeamOutreaches(req,res,next);
        }
    );
};
module.exports.listMembersOutreaches = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryMembersOutreaches(req,res,next);
        }
    );
};
module.exports.addOutreachesLab = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryAddOutreachesLab(req,res,next);
        }
    );
};
module.exports.deleteOutreachesTeam = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryDeleteOutreachesTeam(req,res,next);
        }
    );
};