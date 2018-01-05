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
    querySQL = querySQL + 'SELECT people_publications.id AS people_publications_id, people_publications.position AS author_position,' +
                                ' people_publications.author_type_id, author_types.name_en AS author_type, ' +
                                ' person_selected_publications.publication_id AS selected, person_selected_publications.person_id AS selected_by, publications.*,' +
                                ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                                ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                          'FROM people_publications' +
                          ' LEFT JOIN author_types ON people_publications.author_type_id = author_types.id' +
                          ' LEFT JOIN publications ON people_publications.publication_id = publications.id' +
                          ' LEFT JOIN person_selected_publications ON person_selected_publications.publication_id = publications.id' +
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
                var processed_result = [];
                var rows_to_skip = [];
                for (var ind in resQuery) {
                    if (rows_to_skip.indexOf(ind) === -1) {
                        if (resQuery[ind].selected === null) {
                            processed_result.push(resQuery[ind]);
                            rows_to_skip.push(ind);
                        } else {
                            var found = false;
                            for (var ind_dup in resQuery) {
                                if (ind_dup !== ind
                                        && resQuery[ind_dup].id == resQuery[ind].id) {
                                    rows_to_skip.push(ind_dup);

                                    if (resQuery[ind_dup].selected_by == personID) {
                                        processed_result.push(resQuery[ind_dup]);
                                        found = true;
                                    }
                                }
                            }
                            if (!found) {
                                processed_result.push(resQuery[ind]);
                                rows_to_skip.push(ind);
                            }
                        }
                    }
                }
                return queryPublicationDescription(req,res,next,processed_result,0);
            }
        );
    });
};

var queryTeamPublications = function (req, res, next) {
    var teamID = req.params.teamID;
    var groupID = req.params.groupID;
    var querySQL = '';
    var places = [];
    // should only select papers that have been published while in te lab
    // papers published during the year the person entered or left the lab will count
    querySQL = querySQL + 'SELECT lab_selected_publications.publication_id AS selected, publications.*,' +
                                ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                                ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                          'FROM labs_publications' +
                          ' LEFT JOIN publications ON labs_publications.publication_id = publications.id' +
                          ' LEFT JOIN lab_selected_publications ON lab_selected_publications.publication_id = publications.id' +
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
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO person_selected_publications' +
                              ' (person_id,publication_id)' +
                              ' VALUES (?,?);';
        places.push(personID,add[ind].id);
    }
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM person_selected_publications' +
                              ' WHERE person_id = ? AND publication_id = ?;';
        places.push(personID,del[ind].id);
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
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": 1,
                     "result" : "OK!"});
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
    var querySQL = '';
    var places = [];
    for (var ind in add) {
        querySQL = querySQL + 'INSERT INTO lab_selected_publications' +
                              ' (group_id,lab_id,publication_id)' +
                              ' VALUES (?,?,?);';
        places.push(groupID,teamID,add[ind].id);
    }
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM lab_selected_publications' +
                              ' WHERE groupID = ? AND lab_id = ? AND publication_id = ?;';
        places.push(groupID, teamID,del[ind].id);
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
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": 1,
                     "result" : "OK!"});
            }
        );
    });
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
    for (var ind in del) {
        querySQL = querySQL + 'DELETE FROM person_selected_publications' +
                              ' WHERE person_id = ? AND publication_id = ?;';
        places.push(personID,del[ind].id);
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

/*


*/


/***************************** Public API Person Queries *****************************/
module.exports.getPublicationInfo = function (req, res, next) {
    var pubID = req.params.pubID;
    var querySQL = 'SELECT person_selected_publications.person_id AS person_selected,' +
                    ' lab_selected_publications.lab_id AS lab_selected,'+
                    ' people_publications.person_id,' +
                    ' labs_publications.lab_id,' +
                    ' publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM publications' +
                    ' LEFT JOIN people_publications ON people_publications.publication_id = publications.id' +
                    ' LEFT JOIN labs_publications ON labs_publications.publication_id = publications.id' +
                    ' LEFT JOIN person_selected_publications ON person_selected_publications.publication_id = publications.id' +
                    ' LEFT JOIN lab_selected_publications ON lab_selected_publications.publication_id = publications.id' +
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
                var person_selected = [];
                var lab_selected = [];
                var person = [];
                var lab = [];
                for (var ind in resQuery) {
                    if (resQuery[ind].person_selected !== null) {
                        if (person_selected.indexOf(resQuery[ind].person_selected) === -1) {person_selected.push(resQuery[ind].person_selected);}
                    }
                    if (resQuery[ind].lab_selected !== null) {
                        if (lab_selected.indexOf(resQuery[ind].lab_selected) === -1) {lab_selected.push(resQuery[ind].lab_selected);}
                    }
                    if (resQuery[ind].person_id !== null) {
                        if (person.indexOf(resQuery[ind].person_id) === -1) {person.push(resQuery[ind].person_id);}
                    }
                    if (resQuery[ind].lab_id !== null) {
                        if (lab.indexOf(resQuery[ind].lab_id) === -1) {lab.push(resQuery[ind].lab_id);}
                    }

                }
                resQuery[0].person_selected = person_selected;
                resQuery[0].lab_selected = lab_selected;
                resQuery[0].person_id = person;
                resQuery[0].lab_id = lab;
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": 1,
                     "result" : resQuery[0]});
                return;
            }
        );
    });
};
module.exports.getPersonPublicationInfo = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = 'SELECT people_publications.author_type_id,' +
                    ' person_selected_publications.publication_id AS selected, publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM people_publications' +
                    ' LEFT JOIN author_types ON people_publications.author_type_id = author_types.id' +
                    ' LEFT JOIN publications ON people_publications.publication_id = publications.id' +
                    ' LEFT JOIN person_selected_publications ON person_selected_publications.publication_id = publications.id' +
                    ' LEFT JOIN journals ON publications.journal_id = journals.id' +
                    ' WHERE people_publications.person_id = ?;';
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
    var querySQL = 'SELECT lab_selected_publications.publication_id AS selected, publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM labs_publications' +
                    ' LEFT JOIN publications ON labs_publications.publication_id = publications.id' +
                    ' LEFT JOIN lab_selected_publications ON lab_selected_publications.publication_id = publications.id' +
                    ' LEFT JOIN journals ON publications.journal_id = journals.id' +
                    ' WHERE labs_publications.group_id = ? AND labs_publications.lab_id = ?;';
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

module.exports.addPublicationsPerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 16],
        function (req, res, username) {
            queryAddPublicationsPerson(req,res,next);
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