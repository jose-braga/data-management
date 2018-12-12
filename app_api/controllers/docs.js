var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;
const fs = require('fs-extra');
var path = require('path');
var multer = require('multer');

var addDocID;

//var permissions = require('../config/permissions');
var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, callback) {
        var unitID = req.params.unitID;
        var unitFolder;
        if (unitID === '1') {
            unitFolder = 'UCIBIO';
        } else if (unitID === '2') {
            unitFolder = 'LAQV';
        }
        var tempDirectory = 'public/documents/' + unitFolder + '/' + addDocID;
        fs.ensureDir(tempDirectory)
            .then(() => {
                fs.emptyDir(tempDirectory)
                    .then(() => {
                        callback(null, tempDirectory);
                    })
                    .catch((err) => {
                        console.log(err);
                        callback(null, tempDirectory);
                    });
            })
            .catch((err) => {
                console.log(err);
                callback(null, tempDirectory);
            });
    },
    filename: function (req, file, callback) {
        var fileInfo = path.parse(file.originalname);
        callback(null, fileInfo.name + fileInfo.ext);
    }
});


/**************************** Utility Functions *******************************/

var sendJSONResponse = function(res, status, content) {
    res.status(status);
    res.json(content);
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
function momentToDate(timedate, timezone, timeformat) {
    if (timezone === undefined) {
        timezone = 'Europe/Lisbon';
    }
    if (timeformat === undefined) {
        timeformat = 'YYYY-MM-DD';
    }
    return (timedate !== null && timedate !== undefined) ? moment.tz(timedate,timezone).format(timeformat) : null;
}

/***************************** Query Functions ********************************/
var queryGetUnitsActiveDocs = function (req, res, next) {
    var unitID = req.params.unitID;
    var query = 'SELECT unit_documents.*, document_types.name AS doc_type_name FROM unit_documents' +
                ' JOIN document_types ON unit_documents.doc_type_id = document_types.id' +
                ' WHERE unit_documents.unit_id = ?' +
                ' AND ((unit_documents.valid_from <= CURRENT_DATE() OR unit_documents.valid_from IS NULL) ' +
                 ' AND (unit_documents.valid_until >= CURRENT_DATE() OR unit_documents.valid_until IS NULL));';
    var places = [unitID];
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
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": rowsQuery.length,
                     "result" : rowsQuery});
                return;
            }
        );
    });
};

var queryGetUnitsDocs = function (req, res, next) {
    var unitID = req.params.unitID;
    var query = 'SELECT unit_documents.*, document_types.name AS doc_type_name FROM unit_documents' +
                ' JOIN document_types ON unit_documents.doc_type_id = document_types.id' +
                ' WHERE unit_documents.unit_id = ?;';
    var places = [unitID];
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
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": rowsQuery.length,
                     "result" : rowsQuery});
                return;
            }
        );
    });
};

var queryAddDocDBWrite = function (req, res, next) {
    var unitID = req.params.unitID;
    var query = 'INSERT INTO unit_documents' +
                ' (unit_id)' +
                ' VALUES (?)';
    var places = [unitID];
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
                var docID = rowsQuery.insertId;
                addDocID = docID;
                return  queryAddDocFileWrite(req, res, next, docID);
            }
        );
    });
};

var queryAddDocDBWriteUpdateRemaining = function (req, res, next, docID, webPath) {
    var docData = req.body;
    var valid_from = momentToDate(docData.valid_from);
    var valid_until = momentToDate(docData.valid_until);

    var url = null;
    if (webPath !== null) {
        url = webPath.replace(/\s/g,'%20');
    } else if (docData.doc_url !== null && docData.doc_url !== undefined) {
        url = docData.doc_url;
    }

    var query = 'UPDATE unit_documents' +
                ' SET doc_type_id = ?,' +
                ' title = ?,' +
                ' content = ?,' +
                ' attachment_url = ?,' +
                ' valid_from = ?,' +
                ' valid_until = ?' +
                ' WHERE id = ?';
    var places = [docData.type,
                docData.title,
                docData.contents,
                url,
                valid_from,
                valid_until,
                docID];
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
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200});
                return;
            }
        );
    });
};

var queryAddDocFileWrite = function (req, res, next, docID) {

    var upload = multer({
            storage: storage,
        }).single('file');
    upload(req,res,function(err){
        if(err){
             sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
             return;
        }
        var unitID = req.params.unitID;
        var unitFolder;
        if (unitID === '1') {
            unitFolder = 'UCIBIO';
        } else if (unitID === '2') {
            unitFolder = 'LAQV';
        }
        var webPath = null;
        if (req.body.file_name) {
            webPath = 'documents/' + unitFolder + '/' + docID + '/' + req.body.file_name;
        }
        return queryAddDocDBWriteUpdateRemaining(req, res, next, docID, webPath);
    });
};

var queryUpdateDocFileOperations = function (req, res, next) {
    var docID = req.params.docID;
    addDocID = docID;

    var upload = multer({
            storage: storage,
        }).single('file');
    upload(req,res,function(err){
        if(err){
             sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
             return;
        }
        var unitID = req.params.unitID;
        var unitFolder;
        if (unitID === '1') {
            unitFolder = 'UCIBIO';
        } else if (unitID === '2') {
            unitFolder = 'LAQV';
        }
        if (req.body.changeAttachment === 'Yes'
                && (req.body.hasAttachment === 'None' || req.body.hasAttachment === 'URL')) {
            var deleteDirectory = 'public/documents/' + unitFolder + '/' + docID;
            fs.remove(deleteDirectory);
        }

        var webPath = null;
        if (req.body.changeAttachment === 'Yes' && req.body.file_name) {
            webPath = 'documents/' + unitFolder + '/' + docID + '/' + req.body.file_name;
        }
        return queryUpdateDBWriteUpdateRemaining(req, res, next, docID, webPath);
    });
};

var queryUpdateDBWriteUpdateRemaining = function (req, res, next, docID, webPath) {
    var docData = req.body;
    var valid_from = momentToDate(docData.valid_from);
    var valid_until = momentToDate(docData.valid_until);

    var url = null;
    if (webPath !== null) {
        url = webPath.replace(/\s/g,'%20');
    } else if (docData.doc_url !== null && docData.doc_url !== undefined) {
        url = docData.doc_url;
    }
    var query, places;
    if (req.body.changeAttachment === 'Yes') {
        query = 'UPDATE unit_documents' +
                    ' SET doc_type_id = ?,' +
                    ' title = ?,' +
                    ' content = ?,' +
                    ' attachment_url = ?,' +
                    ' valid_from = ?,' +
                    ' valid_until = ?' +
                    ' WHERE id = ?';
        places = [docData.doc_type_id,
                    docData.title,
                    docData.content,
                    url,
                    valid_from,
                    valid_until,
                    docID];
    } else {
        query = 'UPDATE unit_documents' +
                    ' SET doc_type_id = ?,' +
                    ' title = ?,' +
                    ' content = ?,' +
                    ' valid_from = ?,' +
                    ' valid_until = ?' +
                    ' WHERE id = ?';
        places = [docData.doc_type_id,
                    docData.title,
                    docData.content,
                    valid_from,
                    valid_until,
                    docID];
    }
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
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200});
                return;
            }
        );
    });
};

var queryDeleteDocFileOperations = function (req, res, next) {
    var docID = req.params.docID;

    var unitID = req.params.unitID;
    var unitFolder;
    if (unitID === '1') {
        unitFolder = 'UCIBIO';
    } else if (unitID === '2') {
        unitFolder = 'LAQV';
    }

    var deleteDirectory = 'public/documents/' + unitFolder + '/' + docID;
    fs.remove(deleteDirectory);
    return queryDeleteDocDB(req, res, next, docID);
};

var queryDeleteDocDB = function (req, res, next, docID) {
    var query = 'DELETE FROM unit_documents WHERE id = ?';
    var places = [docID];
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
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200});
                return;
            }
        );
    });
};

/***************************** Entry Functions ********************************/
module.exports.getUnitActiveDocs = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 16, 20, 30, 40],
        function (req, res, username) {
            queryGetUnitsActiveDocs(req,res,next);
        }
    );
};

module.exports.getUnitDocs = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 16, 20],
        function (req, res, username) {
            queryGetUnitsDocs(req,res,next);
        }
    );
};

module.exports.addDoc = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 16, 20],
        function (req, res, username) {
            queryAddDocDBWrite(req,res,next);
        }
    );
};

module.exports.updateDoc = function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 16, 20],
        function (req, res, username) {
            queryUpdateDocFileOperations(req,res,next);
        }
    );
};

module.exports.deleteDoc= function (req, res, next) {
    // managers can change data based on their geographical location
    getUser(req, res, [0, 5, 10, 15, 16, 20],
        function (req, res, username) {
            queryDeleteDocFileOperations(req,res,next);
        }
    );
};
