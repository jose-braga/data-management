var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
/*
const nodemailer = require('../controllers/emailer');
let transporter = nodemailer.transporter;
var userModule = require('../models/users');
*/

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
}

/***************************** Query Functions ********************************/

var queryPersonPublications = function (req, res, next) {
    var personID = req.params.personID;
    var userID = req.body.user_id;
    var querySQL = '';
    var places = [];
    // TODO: add impact factors, citations
    querySQL = querySQL + 'SELECT people_publications.id AS people_publications_id, people_publications.position AS author_position,' +
                                ' people_publications.author_type_id, author_types.name_en AS author_type, ' +
                                ' person_selected_publications.publication_id AS selected, publications.*,' +
                                ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                                ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +

                          'FROM people_publications' +
                          ' LEFT JOIN author_types ON people_publications.author_type_id = author_types.id' +
                          ' LEFT JOIN publications ON people_publications.publication_id = publications.id' +
                          ' LEFT JOIN person_selected_publications ON person_selected_publications.publication_id = publications.id' +
                          ' LEFT JOIN journals ON publications.journal_id = journals.id' +
                          ' WHERE people_publications.person_id = ?;';
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
                return queryPersonPublicationDescription(req,res,next,resQuery,0);
            }
        );
    });
};

var queryPersonPublicationDescription = function (req, res, next, rows,i) {
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
                    return queryPersonPublicationDescription(req,res,next,rows,i+1);
                } else {
                    return queryPersonPublicationAuthors(req,res,next,rows,0);
                }

            }
        );
    });
};

var queryPersonPublicationAuthors = function (req, res, next, rows,i) {
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
                    return queryPersonPublicationAuthors(req,res,next,rows,i+1);
                } else {
                    return queryPersonPublicationCitations(req,res,next,rows,0);
                }

            }
        );
    });
};

var queryPersonPublicationCitations = function (req, res, next, rows,i) {
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
                    return queryPersonPublicationCitations(req,res,next,rows,i+1);
                } else {
                    return queryPersonPublicationImpact(req,res,next,rows,0);
                }

            }
        );
    });
};

var queryPersonPublicationImpact = function (req, res, next, rows,i) {
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
                    return queryPersonPublicationImpact(req,res,next,rows,i+1);
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

/******************** Call SQL Generators after Validations *******************/

module.exports.listPersonPublications = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            queryPersonPublications(req,res,next);
        }
    );
};

module.exports.updatePersonSelectedPub = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            queryUpdatePersonSelectedPublications(req,res,next);
        }
    );
};