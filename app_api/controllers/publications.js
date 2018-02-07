var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
var levenshtein = require('fast-levenshtein');

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
    for (var indRow in resQuery) {
        indRow = Number.parseInt(indRow,10);
        if (rowsSkip.indexOf(indRow) === -1) {
            rowsSkip.push(indRow);
            var person_selected = [];
            if (resQuery[indRow].person_selected === 1) person_selected.push(resQuery[indRow].person_id);
            var lab_selected = [];
            if (resQuery[indRow].lab_selected === 1) {
                lab_selected.push({
                    lab_id: resQuery[indRow].lab_id,
                    group_id: resQuery[indRow].group_id,
                    unit_id: resQuery[indRow].unit_id
                });
            }
            var person = [];
            if (resQuery[indRow].person_id !== null) person.push(resQuery[indRow].person_id);
            var lab = [];
            if (resQuery[indRow].lab_id !== null) {
                lab.push({
                    lab_id: resQuery[indRow].lab_id,
                    group_id: resQuery[indRow].group_id,
                    unit_id: resQuery[indRow].unit_id
                });
            }
            for (var ind = indRow + 1; ind < resQuery.length; ind++) {
                if (resQuery[ind].id == resQuery[indRow].id) {
                    rowsSkip.push(ind);
                    if (resQuery[ind].person_selected === 1) {
                        if (person_selected.indexOf(resQuery[ind].person_selected) === -1) {
                            person_selected.push(resQuery[ind].person_id);
                        }
                    }
                    if (resQuery[ind].lab_selected === 1) {
                        let objTest = {
                            lab_id: resQuery[ind].lab_id,
                            group_id: resQuery[ind].group_id,
                            unit_id: resQuery[ind].unit_id
                        };
                        if (!containsObj(lab_selected,objTest)) {
                            lab_selected.push(objTest);
                        }
                    }
                    if (resQuery[ind].person_id !== null) {
                        if (person.indexOf(resQuery[ind].person_id) === -1) {
                            person.push(resQuery[ind].person_id);
                        }
                    }
                    if (resQuery[ind].lab_id !== null) {
                        let objTest = {
                            lab_id: resQuery[ind].lab_id,
                            group_id: resQuery[ind].group_id,
                            unit_id: resQuery[ind].unit_id
                        };
                        if (!containsObj(lab,objTest)) {
                            lab.push(objTest);
                        }
                    }
                }
            }
            delete resQuery[indRow].group_id;
            delete resQuery[indRow].unit_id;
            resQuery[indRow].person_selected = person_selected;
            resQuery[indRow].lab_selected = lab_selected;
            resQuery[indRow].person_id = person;
            resQuery[indRow].lab_id = lab;
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
};

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
                        {"status": "success", "statusCode": 200, "count": 1,
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
                        {"status": "success", "statusCode": 200, "count": 1,
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
                        {"status": "success", "statusCode": 200, "count": 1,
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
                        {"status": "success", "statusCode": 200, "count": 1,
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
    querySQL = querySQL + 'SELECT id, title, doi FROM  publications' +
                ' WHERE title = ? OR doi = ?;';
    places.push(add[i].title,add[i].doi);
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
                ' (authors_raw,number_authors,title,year,journal_id,volume,page_start,page_end,publication_date,doi)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?);';
    places.push(add[i].authors_raw,numberAuthors,add[i].title,add[i].year,
                journalID,volume,pageStart,pageEnd, date, add[i].doi);
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

/***************************** Public API Person Queries *****************************/
module.exports.getPublicationInfo = function (req, res, next) {
    var pubID = req.params.pubID;
    var querySQL = 'SELECT people_publications.selected AS person_selected,' +
                    ' labs_publications.selected AS lab_selected,'+
                    ' people_publications.person_id,' +
                    ' labs_publications.lab_id,labs_publications.group_id, units.id AS unit_id,' +
                    ' publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM publications' +
                    ' LEFT JOIN people_publications ON people_publications.publication_id = publications.id' +
                    ' LEFT JOIN labs_publications ON labs_publications.publication_id = publications.id' +
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
                        {"status": "No data returned!", "statusCode": 200, "count": 1,
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
    if (req.query.hasOwnProperty('unit')) {
        unitID = req.query.unit;
    }
    var querySQL = 'SELECT people_publications.person_id, people_publications.selected AS person_selected,' +
                    ' labs_publications.lab_id,labs_publications.group_id, units.id AS unit_id,' +
                    ' labs_publications.selected AS lab_selected,' +
                    ' publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM publications' +
                    ' LEFT JOIN people_publications ON people_publications.publication_id = publications.id' +
                    ' LEFT JOIN labs_publications ON labs_publications.publication_id = publications.id' +
                    ' LEFT JOIN labs ON labs.id = labs_publications.lab_id' +
                    ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                    ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                    ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                    ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                    ' LEFT JOIN journals ON publications.journal_id = journals.id';
    var places = [];
    if (unitID !== null) {
        querySQL = querySQL + ' WHERE units.id = ?';
        places.push(unitID);
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
                        {"status": "No data returned!", "statusCode": 200, "count": 1,
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
                    ' LEFT JOIN lab_selected_publications ON lab_selected_publications.publication_id = publications.id' +
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
                        {"status": "No data returned!", "statusCode": 200, "count": 1,
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

/******************** Call SQL Generators after Validations *******************/

module.exports.listAllPublications = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryAllPublications(req,res,next);
        }
    );
};

module.exports.listPersonPublications = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
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
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            queryUpdatePersonSelectedPublications(req,res,next);
        }
    );
};

module.exports.updatePersonAuthorNames = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            queryUpdatePersonAuthorNames(req,res,next);
        }
    );
};

module.exports.deletePublicationsPerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
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
    getUser(req, res, [0, 5, 10, 15, 16],
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

module.exports.updateTeamSelectedPub = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30],
        function (req, res, username) {
            queryUpdateTeamSelectedPublications(req,res,next);
        }
    );
};