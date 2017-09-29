const fs = require('fs-extra');
var path = require('path');
//var mkdirp = require('mkdirp');
var moment = require('moment-timezone');
var server = require('../models/server');
var pool = server.pool;

var multer = require('multer');
var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, callback) {
        var personID = req.params.personID;
        var imageType = req.params.imageType;
        var tempDirectory = 'public/images/people/' + personID + '/' + imageType;
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
        var datetimestamp = momentToDate(moment(), undefined, 'YYYYMMDD_HHmmss');
        var fileInfo = path.parse(file.originalname);
        callback(null, fileInfo.name + '-' + datetimestamp + fileInfo.ext);
    }
});

/**************************** Utility Functions *******************************/
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

var sendJSONResponse = function(res, status, content) {
    res.status(status);
    res.json(content);
};

var unique = function (a) {
    var seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
};

var uniqueIDs = function (objArr, key) {
    var ids = [];
    for (var ind in objArr) {
        var id = objArr[ind][key];
        if (ids.indexOf(id) === -1) {
            ids.push(id);
        }
    }
    return ids;
};

var uniqueObj = function (a) {
    // TODO: Relying on particular order of keys!!!!!!!!!!!!!!
    // Change algorithm or use a newer version of node with support for ES6 Object comparison utilities
	var aUnique = [];
	var aNew = [];
	if (a.length > 1) {
	    // removing, for all data entries with length larger than 1,
	    // the records that have only null values
	    for (var ind in a) {
	        var objKeys = Object.keys(a[ind]);
    	    var onlyNulls = true;
    	    for (var key in objKeys) {
    	        if (a[ind][objKeys[key]] !== null) {
    	            onlyNulls = false;
    	            break;
    	        }
    	    }
    	    if (!onlyNulls) {
    	        aNew.push(a[ind]);
    	    }
	    }
        // if only null values that entry is kept
        if (aNew.length !== 0) {
            a = aNew;
        }
	}
	for (var indObj in a) {
		aUnique.push(JSON.stringify(a[indObj]));
	}
	aUnique = unique(aUnique);
	for (var indObj in aUnique) {
		aUnique[indObj] = JSON.parse(aUnique[indObj]);
	}
	return aUnique;
};

var mergeInfoSinglePerson = function(rows, propsMerge) {
    //propsMerge is an array with the properties to merge
	var singleRow = Object.assign({}, rows[0]);
	for (var indProp in propsMerge) {
		if (!Array.isArray(propsMerge[indProp])) {
			singleRow[propsMerge[indProp]] = [];
		} else {
			// first element of array is the name of the new key
			// that will gather all related information
			singleRow[propsMerge[indProp][0]] = [];
			for (var indKey in propsMerge[indProp]) {
			    if (Array.isArray(propsMerge[indProp][indKey])) {
			        singleRow[propsMerge[indProp][0]][propsMerge[indProp][indKey][0]] = [];
			        for (var indKey2 in propsMerge[indProp][indKey]) {
			            if (indKey2 > 0) {
			                delete singleRow[propsMerge[indProp][indKey][indKey2]];
			            }
			        }
			    } else {
    			    if (indKey > 0) {
    			        delete singleRow[propsMerge[indProp][indKey]];
    			    }
			    }
			}
		}
	}
    for (var indRow in rows){
		for (var indProp in propsMerge) {
			if (!Array.isArray(propsMerge[indProp])) {
				singleRow[propsMerge[indProp]].push(rows[indRow][propsMerge[indProp]]);
			} else {
				var obj = {};
				for (var indKey in propsMerge[indProp]) {
				    var obj2 = {};
				    if (Array.isArray(propsMerge[indProp][indKey])) {
				        obj[propsMerge[indProp][indKey][0]] = [];
				        for (var indKey2 in propsMerge[indProp][indKey]) {
				            var thisProp2 = propsMerge[indProp][indKey][indKey2];
				            if (indKey2 > 0) {
    						    obj2[thisProp2] = rows[indRow][thisProp2];
    					    }
				        }
				        obj[propsMerge[indProp][indKey][0]].push(obj2);
				    } else {
    					var thisProp = propsMerge[indProp][indKey];
    					if (indKey > 0) {
    						obj[thisProp] = rows[indRow][thisProp];
    					}
				    }
				}
				singleRow[propsMerge[indProp][0]].push(obj);
			}
		}
	}
	for (indProp in propsMerge) {
		if (!Array.isArray(propsMerge[indProp])) {
			singleRow[propsMerge[indProp]] = unique(singleRow[propsMerge[indProp]]);
		} else {
			singleRow[propsMerge[indProp][0]] = uniqueObj(singleRow[propsMerge[indProp][0]]);
		}
	}
	return singleRow;
};

var compactData =  function(rows, ids, rules) {
    var compact = [];
    for (var ind in ids) {
        var toMerge = [];
        for (var indRow in rows) {
            if (rows[indRow].id === ids[ind]) {
                toMerge.push(rows[indRow]);
            }
        }
        var mergedRow = mergeInfoSinglePerson(toMerge,rules);
        if (mergedRow.image_type === 1 && mergedRow.image_name !== null) {
            mergedRow['image_path'] = 'images/people/' + mergedRow.id + '/1/' + mergedRow.image_name;
        } else {
            mergedRow['image_path'] = null;
        }
        delete mergedRow.image_type;
        delete mergedRow.image_name;
        compact.push(mergedRow);
    }
    return compact;
};

var getQueryResponse = function(querySQL, req, res, next) {
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        // Use the connection
        connection.query( querySQL, function(err, rows) {
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

var getLocation = function(req, res, next, callback) {
    // gets city associated with resource (person) to be altered
    var personID = req.params.personID;
    // get geographical location of resource
    var queryLocation = "SELECT city_id FROM people_institution_city WHERE person_id = ?";
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        // Use the connection
        connection.query( queryLocation, [personID], function(err, userCity) {
            connection.release();
            if (err) {
                sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                return;
            }
            return callback(req,res,next,userCity);
            // And done with the connection.
        });
    });
};

var getLocationJobs = function(req, res, next) {
    // gets city associated with resource (person) to be altered
    var personID = req.params.personID;
    // get geographical location of resource
    var queryLocation = "SELECT city_id FROM people_institution_city WHERE person_id = ?";
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        // Use the connection
        connection.query( queryLocation, [personID], function(err, userCity) {
            connection.release();
            if (err) {
                sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                return;
            }
            if (req.body.updateJobs.length > 0) {
                var jobUpdate = req.body.updateJobs[0];
                return queryUpdateJob(req,res,next,userCity,jobUpdate,0);
            } else if (req.body.newJobs.length > 0) {
                var jobAdd = req.body.newJobs[0];
                return queryAddJob(req,res,next,userCity,jobAdd,0);
            } else if (req.body.deleteJobs.length > 0) {

                var jobDelete = req.body.deleteJobs[0];
                return queryDeleteJob(req,res,next,userCity,jobDelete,0);
            } else {
                sendJSONResponse(res, 200, {"status": "success", "statusCode": 200, "result" : "No changes."});
                return;
            }
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
            sendJSONResponse(res, 200,
                {"status": "success", "statusCode": 200, "count": rows.length,
                 "result" : rows});
        });
    });
};

var escapedQueryPersonSearch = function(querySQL, place, rules, req, res, next) {
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
            var uniquePersons = uniqueIDs(rows,'id');
            var rowsProcessed = compactData(rows,uniquePersons, rules);
            sendJSONResponse(res, 200,
                {"status": "success", "statusCode": 200, "count": rowsProcessed.length,
                 "result" : rowsProcessed});
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

var getUserPermitSelf = function (req, res, permissions, callback) {
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
                if (parseInt(req.payload.personID,10) === parseInt(req.params.personID,10)) {
                    return callback(req, res, username);
                }
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

function getGeoPermissions(req, userCity) {
    var requesterStatus = req.payload.stat;
    var citiesPermissions = geographicAccess(requesterStatus);
    for (var ind in userCity) {
        if (citiesPermissions.indexOf(userCity[ind].city_id) !== -1) {
            return true;
        }
    }
    return false;
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

var queryAffiliationsDepartmentPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var updated = momentToDate(moment(),undefined,'YYYY-MM-DD HH:mm:ss');
        var created = updated;
        var changed_by = req.body.changed_by;
        var updateArr = req.body.updateAffiliationsDep;
        var newArr = req.body.newAffiliationsDep;
        var deleteArr = req.body.deleteAffiliationsDep;
        if (updateArr.length > 0) {
            return queryUpdateAffiliationsDepartment(req, res, next, userCity, personID, updateArr,deleteArr,newArr,
                                 updated, created, changed_by, updateArr[0], 0);
        } else if (deleteArr.length > 0) {
            return queryDeleteAffiliationsDepartment(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, deleteArr[0], 0);
        } else if (newArr.length > 0) {
            return queryAddAffiliationsDepartment(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[0], 0);
        }
        if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
            sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
            return;
        }
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
        return;
    }
};

var queryUpdateAffiliationsDepartment = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var querySQL = '';
    var places = [];
    data.department_start = momentToDate(data.department_start);
    data.department_end = momentToDate(data.department_end);
    querySQL = querySQL + 'UPDATE `people_departments`' +
                          ' SET `department_id` = ?,' +
                          ' `valid_from` = ?,' +
                          ' `valid_until` = ?' +
                          ' WHERE `id` = ?';
    querySQL = querySQL + '; ';
    places.push(data.department_id,
                data.department_start,
                data.department_end,
                data.people_departments_id);
    querySQL = querySQL + 'INSERT INTO `people_departments_history`' +
                          ' (`people_departments_id`,`person_id`,`department_id`,'+
                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(data.people_departments_id,personID,
                data.department_id,data.department_start,data.department_end,
                updated,'U',changed_by);
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
                    return queryUpdateAffiliationsDepartment(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeleteAffiliationsDepartment(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddAffiliationsDepartment(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[0], 0);
                } else {
                    return queryPeopleGetRow(req, res, next, userCity, updated, created, changed_by);
                }
            }
        );
    });
};

var queryDeleteAffiliationsDepartment = function (req, res, next, userCity,personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, data, i) {
    var querySQL = '';
    var places = [];
    data.department_start = momentToDate(data.department_start);
    data.department_end = momentToDate(data.department_end);
    querySQL = querySQL + 'DELETE FROM `people_departments`' +
                          ' WHERE id=?';
    querySQL = querySQL + '; ';
    places.push(data.people_departments_id);
    querySQL = querySQL + 'INSERT INTO `people_departments_history`' +
                          ' (`people_departments_id`,`person_id`,`department_id`,'+
                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(data.people_departments_id,personID,
                data.department_id, data.department_start,data.department_end,
                updated,'D',changed_by);
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
                    return queryDeleteAffiliationsDepartment(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, deleteArr[i+1], i+1);
                } else if (newArr.length > 0){
                    return queryAddAffiliationsDepartment(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[0], 0);
                } else {
                    return queryPeopleGetRow(req, res, next, userCity, updated, created, changed_by);
                }
            }
        );
    });
};

var queryAddAffiliationsDepartment = function (req, res, next, userCity ,personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, data, i) {
    var querySQL = '';
    var places = [];
    data.department_start = momentToDate(data.department_start);
    data.department_end = momentToDate(data.department_end);
    querySQL = querySQL + 'INSERT INTO `people_departments`' +
                          ' (`person_id`,`department_id`,`valid_from`,`valid_until`)' +
                          ' VALUES (?, ?, ?, ?)';
    querySQL = querySQL + '; ';
    places.push(personID, data.department_id, data.department_start, data.department_end);
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
                var peopleDepartmentID = resQuery.insertId;
                return queryAddAffiliationsDepartmentHistory(req, res, next, userCity, personID,peopleDepartmentID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, data, i);
            }
        );
    });
};

var queryAddAffiliationsDepartmentHistory = function (req, res, next, userCity, personID,peopleDepartmentID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, data, i) {
    var querySQL = '';
    var places = [];
    data.department_start = momentToDate(data.department_start);
    data.department_end = momentToDate(data.department_end);
    querySQL = querySQL + 'INSERT INTO `people_departments_history`' +
                          ' (`people_departments_id`,`person_id`,`department_id`,'+
                            '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(peopleDepartmentID,personID,
                data.department_id,data.department_start,data.department_end,
                created,'C',changed_by);
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
                    return queryAddAffiliationsDepartment(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[i+1], i+1);
                } else {
                    return queryPeopleGetRow(req, res, next, userCity, updated, created, changed_by);
                }
            }
        );
    });
};

var queryPeopleGetRow = function (req, res, next, userCity, updated, created, changed_by,column) {
    var personID = req.params.personID;
    var querySQL = 'SELECT * from `people` WHERE id =?';
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
                if (column === 'active_until') {
                    return queryPeopleEndDateUpdate(req, res, next, userCity, updated, created, changed_by, resQuery[0]);
                } else {
                    return queryPeopleStartDateUpdate(req, res, next, userCity, updated, created, changed_by, resQuery[0]);
                }
            }
        );
    });
};

var queryPeopleStartDateUpdate = function (req, res, next, userCity, updated, created, changed_by, resQuery) {
    var personID = req.params.personID;
    var minDate = momentToDate(req.body.earliest_date);
    var places = [];
    var querySQL = 'UPDATE `people`' +
                   ' SET `active_from` = ?' +
                   ' WHERE `id` = ?';
    querySQL = querySQL + '; ';
    places.push(minDate, personID);
    querySQL = querySQL + 'INSERT INTO `people_history`' +
                   ' (`person_id`,`user_id`,`name`,`colloquial_name`,`birth_date`,`gender`,' +
                     '`active_from`,`active_until`,`status`,`updated`,`operation`,`changed_by`)' +
                   ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(personID,resQuery.user_id,resQuery.name,resQuery.colloquial_name,
                resQuery.birth_date,resQuery.gender,
                minDate,resQuery.active_until,1,updated,'U',changed_by);
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
                sendJSONResponse(res, 200, { message: 'All done.' });
                return;
            }
        );
    });
};

var queryPeopleEndDateUpdate = function (req, res, next, userCity, updated, created, changed_by, resQuery) {
    var personID = req.params.personID;
    var active_until = req.body.active_until;
    var places = [];
    var querySQL = 'INSERT INTO `people_history`' +
                   ' (`person_id`,`user_id`,`name`,`colloquial_name`,`birth_date`,`gender`,' +
                     '`active_from`,`active_until`,`status`,`updated`,`operation`,`changed_by`)' +
                   ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?);';
    places.push(personID,resQuery.user_id,resQuery.name,resQuery.colloquial_name,
                resQuery.birth_date,resQuery.gender,
                resQuery.active_from,
                momentToDate(active_until),
                1,updated,'U',changed_by);
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
                // affiliation end dates are altered only when active_until is not null
                // and when active_until is earlier than end date
                if (active_until !== null) {
                    return queryAffiliationsEndDate(req,res,next,updated,created,changed_by);
                } else {
                    sendJSONResponse(res, 200, { message: 'All done.' });
                    return;
                }
            }
        );
    });
};

var queryAffiliationsEndDate = function (req,res,next,updated,created,changed_by) {
    var personID = req.params.personID;
    var active_until = req.body.active_until;
    var active_until_tz = momentToDate(active_until);
    var data;
    var querySQL = '';
    var places = [];
    // department end dates are not affected
    for (var ind in req.body.lab_data) {
        data = req.body.lab_data[ind];
        if (active_until !== null) {
            if (data.people_lab_id !== null) {
                if ((data.lab_start !== null && data.lab_end === null)
                    || (data.lab_end !== null && moment(data.lab_end).isAfter(moment(active_until)))) {
                    querySQL = querySQL + 'UPDATE `people_labs` ' +
                                          'SET `valid_until` = ? ' +
                                          'WHERE `id` = ?;';
                    places.push(active_until_tz,data.people_lab_id);
                    querySQL = querySQL + 'INSERT INTO `people_labs_history`' +
                                          ' (`people_labs_id`,`person_id`,`lab_id`,`lab_position_id`,`dedication`,'+
                                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                                          ' VALUES (?,?,?,?,?,?,?,?,?,?);';
                    places.push(data.people_lab_id,personID,data.lab_id, data.lab_position_id,data.dedication,
                                data.lab_start,active_until_tz,
                                updated,'U',changed_by);
                }
            }
        }
    }
    for (var ind in req.body.technician_offices) {
        data = req.body.technician_offices[ind];
        if (active_until !== null) {
            if (data.tech_id !== null) {
                if ((data.tech_valid_from !== null && data.tech_valid_until === null)
                    || (data.tech_valid_until !== null && moment(data.tech_valid_until).isAfter(moment(active_until)))) {
                    querySQL = querySQL + 'UPDATE `technicians` ' +
                                          'SET `valid_until` = ? ' +
                                          'WHERE `id` = ?;';
                    places.push(active_until_tz,data.tech_id);
                    querySQL = querySQL + 'INSERT INTO `technicians_history`' +
                                          ' (`technician_id`,`person_id`,`technician_office_id`,`technician_position_id`,`dedication`,'+
                                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                                          ' VALUES (?,?,?,?,?,?,?,?,?,?);';
                    places.push(data.tech_id,personID,data.tech_office_id, data.tech_position_id,data.tech_dedication,
                                data.tech_valid_from, active_until_tz,
                                updated,'U',changed_by);
                }
            }
        }
    }
    for (var ind in req.body.science_manager_offices) {
        data = req.body.science_manager_offices[ind];
        if (active_until !== null) {
            if (data.sc_man_id !== null) {
                if ((data.sc_man_valid_from !== null && data.sc_man_valid_until === null)
                    || (data.sc_man_valid_until !== null && moment(data.sc_man_valid_until).isAfter(moment(active_until)))) {
                    querySQL = querySQL + 'UPDATE `science_managers` ' +
                                          'SET `valid_until` = ? ' +
                                          'WHERE `id` = ?;';
                    places.push(active_until_tz,data.sc_man_id);
                    querySQL = querySQL + 'INSERT INTO `science_managers_history`' +
                                          ' (`science_managers_id`,`person_id`,`science_manager_office_id`,`science_manager_position_id`,`dedication`,'+
                                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                                          ' VALUES (?,?,?,?,?,?,?,?,?,?);';
                    places.push(data.sc_man_id,personID,data.sc_man_office_id, data.sc_man_position_id,data.sc_man_dedication,
                                data.sc_man_valid_from, active_until_tz,
                                updated,'U',changed_by);
                }
            }
        }
    }
    for (var ind in req.body.administrative_offices) {
        data = req.body.administrative_offices[ind];
        if (active_until !== null) {
            if (data.adm_id !== null) {
                if ((data.adm_valid_from !== null && data.adm_valid_until === null)
                    || (data.adm_valid_until !== null && moment(data.adm_valid_until).isAfter(moment(active_until)))) {
                    querySQL = querySQL + 'UPDATE `people_administrative_offices` ' +
                                          'SET `valid_until` = ? ' +
                                          'WHERE `id` = ?;';
                    places.push(active_until_tz,data.adm_id);
                    querySQL = querySQL + 'INSERT INTO `people_administrative_offices_history`' +
                                          ' (`people_administrative_offices_id`,`person_id`,`administrative_office_id`,`administrative_position_id`,`dedication`,'+
                                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                                          ' VALUES (?,?,?,?,?,?,?,?,?,?);';
                    places.push(data.adm_id,personID,data.adm_office_id, data.adm_position_id,data.adm_dedication,
                                data.adm_valid_from, active_until_tz,
                                updated,'U',changed_by);
                }
            }
        }
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
                sendJSONResponse(res, 200, { message: 'All done.' });
                return;
            }
        );
    });
};
/*
var queryAffiliationTechEndDate = function (req,res,next,updated,created,changed_by) {

};

var queryAffiliationScManEndDate = function (req,res,next,updated,created,changed_by) {

};

var queryAffiliationAdmEndDate = function (req,res,next,updated,created,changed_by) {

};

var queryAffiliationDepEndDate = function (req,res,next,updated,created,changed_by) {

};

*/
var queryAffiliationsLabPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var updated = momentToDate(moment(),undefined,'YYYY-MM-DD HH:mm:ss');
        var created = updated;
        var changed_by = req.body.changed_by;
        var updateArr = req.body.updateAffiliationsLab;
        var newArr = req.body.newAffiliationsLab;
        var deleteArr = req.body.deleteAffiliationsLab;
        if (updateArr.length > 0) {
            return queryUpdateAffiliationsLab(req, res, next, userCity, personID, updateArr,deleteArr,newArr,
                                 updated, created, changed_by, updateArr[0], 0);
        } else if (deleteArr.length > 0) {
            return queryDeleteAffiliationsLab(req, res, next, userCity, personID, updateArr,deleteArr,newArr,
                                 updated, created, changed_by, deleteArr[0], 0);
        } else if (newArr.length > 0) {
            return queryAddAffiliationsLab(req, res, next, userCity, personID, updateArr,deleteArr,newArr,
                                 updated, created, changed_by, newArr[0], 0);
        }
        if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
            sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
            return;
        }
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
        return;
    }
};


var queryUpdateAffiliationsLab = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var querySQL = '';
    var places = [];
    data.lab_start = momentToDate(data.lab_start);
    data.lab_end = momentToDate(data.lab_end);
    querySQL = querySQL + 'UPDATE `people_labs`' +
                          ' SET `lab_id` = ?,' +
                          ' `lab_position_id` = ?,' +
                          ' `dedication` = ?,' +
                          ' `valid_from` = ?,' +
                          ' `valid_until` = ?' +
                          ' WHERE `id` = ?';
    querySQL = querySQL + '; ';
    places.push(data.lab_id, data.lab_position_id, data.dedication,
                data.lab_start, data.lab_end, data.people_lab_id);
    querySQL = querySQL + 'INSERT INTO `people_labs_history`' +
                          ' (`people_labs_id`,`person_id`,`lab_id`,`lab_position_id`,`dedication`,'+
                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(data.people_lab_id,personID, data.lab_id, data.lab_position_id,data.dedication,
                data.lab_start,data.lab_end,
                updated,'U',changed_by);
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
                    return queryUpdateAffiliationsLab(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeleteAffiliationsLab(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddAffiliationsLab(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[0], 0);
                } else {
                    return queryAddRole(req, res, next, personID, userCity, 1, updated, created, changed_by);
                }
            }
        );
    });
};

var queryDeleteAffiliationsLab = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var querySQL = '';
    var places = [];
    data.lab_start = momentToDate(data.lab_start);
    data.lab_end = momentToDate(data.lab_end);
    querySQL = querySQL + 'DELETE FROM `people_labs`' +
                          ' WHERE id=?';
    querySQL = querySQL + '; ';
    places.push(data.people_lab_id);
    querySQL = querySQL + 'INSERT INTO `people_labs_history`' +
                          ' (`people_labs_id`,`person_id`,`lab_id`,`lab_position_id`,`dedication`,'+
                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(data.people_lab_id,personID, data.lab_id, data.lab_position_id,data.dedication,
                data.lab_start,data.lab_end,
                updated,'D',changed_by);
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
                    return queryDeleteAffiliationsLab(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddAffiliationsLab(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[0], 0);
                } else {
                    return queryAddRole(req, res, next, personID, userCity, 1, updated, created, changed_by);
                }
            }
        );
    });
};

var queryAddAffiliationsLab = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var querySQL = '';
    var places = [];
    data.lab_start = momentToDate(data.lab_start);
    data.lab_end = momentToDate(data.lab_end);
    querySQL = querySQL + 'INSERT INTO `people_labs`' +
                          ' (`person_id`,`lab_id`,`lab_position_id`,`dedication`,`valid_from`,`valid_until`)' +
                          ' VALUES (?, ?, ?, ?, ?, ?)';
    querySQL = querySQL + '; ';
    places.push(personID, data.lab_id, data.lab_position_id,data.dedication,
                data.lab_start, data.lab_end);
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
                var peopleLabID = resQuery.insertId;
                return queryAddAffiliationsLabHistory(req, res, next, userCity, personID, peopleLabID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, data, i);
            }
        );
    });
};

var queryAddAffiliationsLabHistory = function (req, res, next, userCity, personID, peopleLabID, updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var querySQL = '';
    var places = [];
    data.lab_start = momentToDate(data.lab_start);
    data.lab_end = momentToDate(data.lab_end);
    querySQL = querySQL + 'INSERT INTO `people_labs_history`' +
                          ' (`people_labs_id`,`person_id`,`lab_id`,`lab_position_id`,`dedication`,'+
                            '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(peopleLabID,personID, data.lab_id, data.lab_position_id,data.dedication,
                data.lab_start,data.lab_end,
                created,'C',changed_by);
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
                    return queryAddAffiliationsLab(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[i+1], i+1);
                } else {
                    return queryAddRole(req, res, next, personID, userCity, 1, updated, created, changed_by);
                }
            }
        );
    });
};

var queryTechnicianAffiliationsPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var updated = momentToDate(moment(),undefined,'YYYY-MM-DD HH:mm:ss');
        var created = updated;
        var changed_by = req.body.changed_by;
        var updateArr = req.body.updateAffiliations;
        var newArr = req.body.newAffiliations;
        var deleteArr = req.body.deleteAffiliations;
        if (updateArr.length > 0) {
            return queryUpdateTechnicianAffiliations(req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, updateArr[0], 0);
        } else if (deleteArr.length > 0) {
            return queryDeleteTechnicianAffiliations(req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, deleteArr[0], 0);

        } else if (newArr.length > 0) {
            return queryAddTechnicianAffiliations(req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, newArr[0], 0);
        }
        if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
            sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
            return;
        }
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryUpdateTechnicianAffiliations = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var places = [];
    var querySQL = '';
    data.tech_valid_from = momentToDate(data.tech_valid_from);
    data.tech_valid_until = momentToDate(data.tech_valid_until);
    querySQL = querySQL + 'UPDATE `technicians`' +
                          ' SET `technician_office_id` = ?,' +
                          ' `technician_position_id` = ?,' +
                          ' `dedication` = ?,' +
                          ' `valid_from` = ?,' +
                          ' `valid_until` = ?' +
                          ' WHERE `id` = ?';
    querySQL = querySQL + '; ';
    places.push(data.tech_office_id, data.tech_position_id, data.tech_dedication,
                data.tech_valid_from,data.tech_valid_until, data.tech_id);
    querySQL = querySQL + 'INSERT INTO `technicians_history`' +
                          ' (`technician_id`,`person_id`,`technician_office_id`,`technician_position_id`,`dedication`,'+
                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(data.tech_id,personID, data.tech_office_id, data.tech_position_id,data.tech_dedication,
                data.tech_valid_from,data.tech_valid_until,
                updated,'U',changed_by);
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
                    return queryUpdateTechnicianAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeleteTechnicianAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddTechnicianAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[0], 0);
                } else {
                    return queryAddRole(req, res, next, personID, userCity, 2, updated, created, changed_by);
                }
            }
        );
    });
};

var queryDeleteTechnicianAffiliations = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var places = [];
    var querySQL = '';
    data.tech_valid_from = momentToDate(data.tech_valid_from);
    data.tech_valid_until = momentToDate(data.tech_valid_until);
    querySQL = querySQL + 'DELETE FROM `technicians`' +
                          ' WHERE id=?';
    querySQL = querySQL + '; ';
    places.push(data.tech_id);
    querySQL = querySQL + 'INSERT INTO `technicians_history`' +
                          ' (`technician_id`,`person_id`,`technician_office_id`,`technician_position_id`,`dedication`,'+
                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(data.tech_id,personID, data.tech_office_id, data.tech_position_id,data.tech_dedication,
                data.tech_valid_from,data.tech_valid_until,
                updated,'D',changed_by);
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
                    return queryDeleteTechnicianAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddTechnicianAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[0], 0);
                } else {
                    return queryAddRole(req, res, next, personID, userCity, 2, updated, created, changed_by);
                }
            }
        );
    });
};

var queryAddTechnicianAffiliations = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var places = [];
    var querySQL = '';
    data.tech_valid_from = momentToDate(data.tech_valid_from);
    data.tech_valid_until = momentToDate(data.tech_valid_until);

    data.tech_valid_from = momentToDate(data.tech_valid_from);
    data.tech_valid_until = momentToDate(data.tech_valid_until);
    querySQL = querySQL + 'INSERT INTO `technicians`' +
                          ' (`person_id`,`technician_office_id`,`technician_position_id`,`dedication`,`valid_from`,`valid_until`)' +
                          ' VALUES (?, ?, ?, ?, ?, ?)';
    querySQL = querySQL + '; ';
    places.push(personID, data.tech_office_id,data.tech_position_id, data.tech_dedication,
                data.tech_valid_from, data.tech_valid_until);
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
                var techID = resQuery.insertId;
                return queryAddTechnicianAffiliationsHistory(req, res, next, userCity, personID, techID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, data, i);
            }
        );
    });
};

var queryAddTechnicianAffiliationsHistory = function (req, res, next, userCity, personID, techID, updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var places = [];
    var querySQL = '';
    data.tech_valid_from = momentToDate(data.tech_valid_from);
    data.tech_valid_until = momentToDate(data.tech_valid_until);
    querySQL = querySQL + 'INSERT INTO `technicians_history`' +
                          ' (`technician_id`,`person_id`,`technician_office_id`,`technician_position_id`,`dedication`,'+
                            '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(techID,personID, data.tech_office_id, data.tech_position_id,data.tech_dedication,
                data.tech_valid_from,data.tech_valid_until,
                created,'C',changed_by);
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
                    return queryAddTechnicianAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[i+1], i+1);
                } else {
                    return queryAddRole(req, res, next, personID, userCity, 2, updated, created, changed_by);
                }
            }
        );
    });
};

var queryScienceManagerAffiliationsPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var updated = momentToDate(moment(),undefined,'YYYY-MM-DD HH:mm:ss');
        var created = updated;
        var changed_by = req.body.changed_by;
        var updateArr = req.body.updateAffiliations;
        var newArr = req.body.newAffiliations;
        var deleteArr = req.body.deleteAffiliations;
        var places = [];
        var querySQL = '';
        if (updateArr.length > 0) {
            return queryUpdateScienceManagerAffiliations(req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, updateArr[0], 0);
        } else if (deleteArr.length > 0) {
            return queryDeleteScienceManagerAffiliations(req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, deleteArr[0], 0);
        } else if (newArr.length > 0) {
            return queryAddScienceManagerAffiliations(req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, newArr[0], 0);
        }
        if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
            sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
            return;
        }
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
        return;
    }
};

var queryUpdateScienceManagerAffiliations = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var places = [];
    var querySQL = '';
    data.sc_man_valid_from = momentToDate(data.sc_man_valid_from);
    data.sc_man_valid_until = momentToDate(data.sc_man_valid_until);
    querySQL = querySQL + 'UPDATE `science_managers`' +
                          ' SET `science_manager_office_id` = ?,' +
                          ' `science_manager_position_id` = ?,' +
                          ' `dedication` = ?,' +
                          ' `valid_from` = ?,' +
                          ' `valid_until` = ?' +
                          ' WHERE `id` = ?';
    querySQL = querySQL + '; ';
    places.push(data.sc_man_office_id, data.sc_man_position_id, data.sc_man_dedication,
                data.sc_man_valid_from, data.sc_man_valid_until, data.sc_man_id);
    querySQL = querySQL + 'INSERT INTO `science_managers_history`' +
                          ' (`science_managers_id`,`person_id`,`science_manager_office_id`,`science_manager_position_id`,`dedication`,'+
                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(data.sc_man_id,personID, data.sc_man_office_id, data.sc_man_position_id,data.sc_man_dedication,
                data.sc_man_valid_from,data.sc_man_valid_until,
                updated,'U',changed_by);
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
                    return queryUpdateScienceManagerAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeleteScienceManagerAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddScienceManagerAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[0], 0);
                } else {
                    return queryAddRole(req, res, next, personID, userCity, 3, updated, created, changed_by);
                }
            }
        );
    });
};

var queryDeleteScienceManagerAffiliations = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var places = [];
    var querySQL = '';
    data.sc_man_valid_from = momentToDate(data.sc_man_valid_from);
    data.sc_man_valid_until = momentToDate(data.sc_man_valid_until);
    querySQL = querySQL + 'DELETE FROM `science_managers`' +
                          ' WHERE id=?';
    querySQL = querySQL + '; ';
    places.push(data.sc_man_id);
    querySQL = querySQL + 'INSERT INTO `science_managers_history`' +
                          ' (`science_managers_id`,`person_id`,`science_manager_office_id`,`science_manager_position_id`,`dedication`,'+
                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(data.sc_man_id,personID, data.sc_man_office_id, data.sc_man_position_id,data.sc_man_dedication,
                data.sc_man_valid_from,data.sc_man_valid_until,
                updated,'D',changed_by);
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
                    return queryDeleteScienceManagerAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddScienceManagerAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[0], 0);
                } else {
                    return queryAddRole(req, res, next, personID, userCity, 3, updated, created, changed_by);
                }
            }
        );
    });
};

var queryAddScienceManagerAffiliations = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var places = [];
    var querySQL = '';
    data.sc_man_valid_from = momentToDate(data.sc_man_valid_from);
    data.sc_man_valid_until = momentToDate(data.sc_man_valid_until);
    querySQL = querySQL + 'INSERT INTO `science_managers`' +
                          ' (`person_id`,`science_manager_office_id`,`science_manager_position_id`,`dedication`,`valid_from`,`valid_until`)' +
                          ' VALUES (?, ?, ?, ?, ?, ?)';
    querySQL = querySQL + '; ';
    places.push(personID, data.sc_man_office_id, data.sc_man_position_id, data.sc_man_dedication,
                data.sc_man_valid_from, data.sc_man_valid_until);
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
                var scManID = resQuery.insertId;
                return queryAddScienceManagerAffiliationsHistory(req, res, next, userCity, personID, scManID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, data, i);
            }
        );
    });

};

var queryAddScienceManagerAffiliationsHistory = function (req, res, next, userCity, personID, scManID, updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var places = [];
    var querySQL = '';
    data.sc_man_valid_from = momentToDate(data.sc_man_valid_from);
    data.sc_man_valid_until = momentToDate(data.sc_man_valid_until);
    querySQL = querySQL + 'INSERT INTO `science_managers_history`' +
                          ' (`science_managers_id`,`person_id`,`science_manager_office_id`,`science_manager_position_id`,`dedication`,'+
                            '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(scManID,personID, data.sc_man_office_id, data.sc_man_position_id,data.sc_man_dedication,
                data.sc_man_valid_from,data.sc_man_valid_until,
                created,'C',changed_by);
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
                    return queryAddScienceManagerAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[i+1], i+1);
                } else {
                    return queryAddRole(req, res, next, personID, userCity, 3, updated, created, changed_by);
                }
            }
        );
    });
};

var queryAdministrativeAffiliationsPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var updated = momentToDate(moment(),undefined,'YYYY-MM-DD HH:mm:ss');
        var created = updated;
        var changed_by = req.body.changed_by;
        var updateArr = req.body.updateAffiliations;
        var newArr = req.body.newAffiliations;
        var deleteArr = req.body.deleteAffiliations;

        if (updateArr.length > 0) {
            return queryUpdateAdministrativeAffiliations(req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, updateArr[0], 0);
        } else if (deleteArr.length > 0) {
            return queryDeleteAdministrativeAffiliations(req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, deleteArr[0], 0);

        } else if (newArr.length > 0) {
            return queryAddAdministrativeAffiliations(req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, newArr[0], 0);
        }
        if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
            sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        }
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryUpdateAdministrativeAffiliations = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var places = [];
    var querySQL = '';
    data.adm_valid_from = momentToDate(data.adm_valid_from);
    data.adm_valid_until = momentToDate(data.adm_valid_until);
    querySQL = querySQL + 'UPDATE `people_administrative_offices`' +
                          ' SET `administrative_office_id` = ?,' +
                          ' `administrative_position_id` = ?,' +
                          ' `dedication` = ?,' +
                          ' `valid_from` = ?,' +
                          ' `valid_until` = ?' +
                          ' WHERE `id` = ?';
    querySQL = querySQL + '; ';
    places.push(data.adm_office_id, data.adm_position_id, data.adm_dedication,
                data.adm_valid_from, data.adm_valid_until, data.adm_id);
    querySQL = querySQL + 'INSERT INTO `people_administrative_offices_history`' +
                          ' (`people_administrative_offices_id`,`person_id`,`administrative_office_id`,`administrative_position_id`,`dedication`,'+
                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(data.adm_id,personID, data.adm_office_id, data.adm_position_id,data.adm_dedication,
                data.adm_valid_from,data.adm_valid_until,
                updated,'U',changed_by);
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
                    return queryUpdateAdministrativeAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, updateArr[i+1], i+1);
                } else if (deleteArr.length > 0) {
                    return queryDeleteAdministrativeAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, deleteArr[0], 0);
                } else if (newArr.length > 0) {
                    return queryAddAdministrativeAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[0], 0);
                } else {
                    return queryAddRole(req, res, next, personID, userCity, 4, updated, created, changed_by);
                }
            }
        );
    });
};

var queryDeleteAdministrativeAffiliations = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var places = [];
    var querySQL = '';
    data.adm_valid_from = momentToDate(data.adm_valid_from);
    data.adm_valid_until = momentToDate(data.adm_valid_until);
    querySQL = querySQL + 'DELETE FROM `people_administrative_offices`' +
                          ' WHERE id=?';
    querySQL = querySQL + '; ';
    places.push(data.adm_id);
    querySQL = querySQL + 'INSERT INTO `people_administrative_offices_history`' +
                          ' (`people_administrative_offices_id`,`person_id`,`administrative_office_id`,`administrative_position_id`,`dedication`,'+
                            '`valid_from`,`valid_until`,`updated`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(data.adm_id,personID, data.adm_office_id, data.adm_position_id,data.adm_dedication,
                data.adm_valid_from,data.adm_valid_until,
                updated,'D',changed_by);
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
                    return queryDeleteAdministrativeAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, deleteArr[i+1], i+1);
                } else if (newArr.length > 0) {
                    return queryAddAdministrativeAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[0], 0);
                } else {
                    return queryAddRole(req, res, next, personID, userCity, 4, updated, created, changed_by);
                }
            }
        );
    });
};

var queryAddAdministrativeAffiliations = function (req, res, next, userCity, personID,updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var places = [];
    var querySQL = '';
    data.adm_valid_from = momentToDate(data.adm_valid_from);
    data.adm_valid_until = momentToDate(data.adm_valid_until);
    querySQL = querySQL + 'INSERT INTO `people_administrative_offices`' +
                          ' (`person_id`,`administrative_office_id`,`administrative_position_id`,`dedication`,`valid_from`,`valid_until`)' +
                          ' VALUES (?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(personID, data.adm_office_id, data.adm_position_id, data.adm_dedication,
                data.adm_valid_from, data.adm_valid_until);
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
                var admID = resQuery.insertId;
                return queryAddAdministrativeAffiliationsHistory(req, res, next, userCity, personID, admID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, data, i);
            }
        );
    });
};

var queryAddAdministrativeAffiliationsHistory = function (req, res, next, userCity, personID, admID, updateArr,deleteArr,newArr,
                                        updated, created, changed_by, data, i) {
    var places = [];
    var querySQL = '';
    data.adm_valid_from = momentToDate(data.adm_valid_from);
    data.adm_valid_until = momentToDate(data.adm_valid_until);
    querySQL = querySQL + 'INSERT INTO `people_administrative_offices_history`' +
                          ' (`people_administrative_offices_id`,`person_id`,`administrative_office_id`,`administrative_position_id`,`dedication`,'+
                            '`valid_from`,`valid_until`,`created`,`operation`,`changed_by`)' +
                          ' VALUES (?,?,?,?,?,?,?,?,?,?)';
    querySQL = querySQL + '; ';
    places.push(admID,personID, data.adm_office_id, data.adm_position_id,data.adm_dedication,
                data.adm_valid_from,data.adm_valid_until,
                created,'C',changed_by);
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
                    return queryAddAdministrativeAffiliations(req, res, next, userCity, personID,
                                updateArr,deleteArr,newArr, updated, created, changed_by, newArr[i+1], i+1);
                } else {
                    return queryAddRole(req, res, next, personID, userCity, 4, updated, created, changed_by);
                }
            }
        );
    });
};

var queryAddRole = function (req, res, next, personID, userCity, role, updated, created, changed_by) {
    var querySQL = '';
    var places = [];
    querySQL = querySQL + 'INSERT INTO `people_roles`' +
                          ' (`person_id`,`role_id`)' +
                          ' SELECT ?,? FROM DUAL' +
                          ' WHERE NOT EXISTS (' +
                          'SELECT * FROM `people_roles` WHERE person_id = ? AND role_id = ?);';
    places.push(personID,role,personID,role);
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
                return queryPeopleGetRow(req, res, next, userCity, updated, created, changed_by);
            }
        );
    });
};

var queryDeleteRolePerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var role = req.params.role;
        var personID = req.params.personID;
        var roleID;
        var querySQL = '';
        var places = [];
        if (role === 'researcher') {
            roleID = 1;
            querySQL = querySQL + 'DELETE FROM `researchers` WHERE `person_id` = ?;';
            places.push(personID);
            querySQL = querySQL + 'DELETE FROM `people_labs` WHERE `person_id` = ?;';
            places.push(personID);
        } else if (role === 'technician') {
            roleID = 2;
            querySQL = querySQL + 'DELETE FROM `technicians_info` WHERE `person_id` = ?;';
            places.push(personID);
            querySQL = querySQL + 'DELETE FROM `technicians` WHERE `person_id` = ?;';
            places.push(personID);
        } else if (role === 'scienceManager') {
            roleID = 3;
            querySQL = querySQL + 'DELETE FROM `science_managers_info` WHERE `person_id` = ?;';
            places.push(personID);
            querySQL = querySQL + 'DELETE FROM `science_managers` WHERE `person_id` = ?;';
            places.push(personID);
        } else if (role === 'administrative') {
            roleID = 4;
            querySQL = querySQL + 'DELETE FROM `administrative_info` WHERE `person_id` = ?;';
            places.push(personID);
            querySQL = querySQL + 'DELETE FROM `people_administrative_offices` WHERE `person_id` = ?;';
            places.push(personID);
        } else {
            sendJSONResponse(res, 500, { message: 'Wrong path.' });
            return;
        }
        querySQL = querySQL + 'DELETE FROM `people_roles` WHERE `person_id` = ? AND role_id = ?;';
        places.push(personID,roleID);
        escapedQuery(querySQL, places, req, res, next);
        return;
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
        return;
    }
};

var queryUpdateJob = function (req, res, next, userCity, jobUpdate, i) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var queryJobUpdate = 'UPDATE `jobs`' +
                              ' SET `situation_id` = ?,' +
                              ' `category_id` = ?,' +
                              ' `organization` = ?,' +
                              ' `dedication` = ?,' +
                              ' `valid_from` = ?,' +
                              ' `valid_until` = ?' +
                              ' WHERE `id` = ?;';
        var placesJobUpdate = [jobUpdate.job_situation_id,
                               jobUpdate.job_category_id,
                               jobUpdate.job_organization,
                               jobUpdate.job_dedication,
                               momentToDate(jobUpdate.job_valid_from),
                               momentToDate(jobUpdate.job_valid_until),
                               jobUpdate.job_id];
        for (var indOri in req.body.originalJobData) {
            if (req.body.originalJobData[indOri].job_id === jobUpdate.job_id) {
                var originalRequiresFellowship = req.body.originalJobData[indOri].job_situation_requires_fellowship;
                var originalRequiresContract = req.body.originalJobData[indOri].job_situation_requires_unit_contract;
                var originalFellowshipID = req.body.originalJobData[indOri].fellowship_id;
                var originalJobFellowshipID = req.body.originalJobData[indOri].jobs_fellowships_id;
                var originalContractID = req.body.originalJobData[indOri].contract_id;
                var originalJobContractID = req.body.originalJobData[indOri].jobs_contracts_id;
                break;
            }
        }
        pool.getConnection(function(err, connection) {
            if (err) {
                sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
                return;
            }
            connection.query(queryJobUpdate,placesJobUpdate,
                function (err, resQuery) {
                    // And done with the connection.
                    connection.release();
                    if (err) {
                        sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                        return;
                    }
                    if (originalRequiresContract === 0 && jobUpdate.job_situation_requires_unit_contract === 1) {
                        // add contract
                        return queryAddContractOnUpdate(req, res, next,userCity, jobUpdate,
                                originalRequiresContract,originalRequiresFellowship,
                                originalContractID, originalJobContractID,
                                originalFellowshipID,originalJobFellowshipID,
                                i);
                    } else if (originalRequiresFellowship === 0 && jobUpdate.job_situation_requires_fellowship === 1) {
                        // add fellowship
                        return queryAddFellowshipOnUpdate(req, res, next,userCity, jobUpdate,
                                originalRequiresContract,originalRequiresFellowship,
                                originalContractID, originalJobContractID,
                                originalFellowshipID,originalJobFellowshipID,
                                i);
                    } else if (originalRequiresContract === 1 && jobUpdate.job_situation_requires_unit_contract === 0) {
                        if (jobUpdate.job_situation_requires_fellowship === 1) {
                            return queryAddFellowshipOnUpdate(req, res, next,userCity, jobUpdate,
                                    originalRequiresContract,originalRequiresFellowship,
                                    originalContractID, originalJobContractID,
                                    originalFellowshipID,originalJobFellowshipID,
                                    i);
                        } else {
                            return queryDeleteContractOnUpdate(req, res, next,userCity, jobUpdate, jobUpdate.contract_id,
                                    originalRequiresContract,originalRequiresFellowship,
                                    jobUpdate.contract_id, jobUpdate.jobs_contracts_id,
                                    originalFellowshipID,originalJobFellowshipID,
                                    i);
                        }
                    } else if (originalRequiresFellowship === 1 && jobUpdate.job_situation_requires_fellowship === 0) {
                        if (jobUpdate.job_situation_requires_unit_contract === 1) {
                            return queryAddContractOnUpdate(req, res, next,userCity, jobUpdate,
                                    originalRequiresContract,originalRequiresFellowship,
                                    originalContractID, originalJobContractID,
                                    originalFellowshipID,originalJobFellowshipID,
                                    i);
                        } else {
                            return queryDeleteFellowshipOnUpdate(req, res, next,userCity, jobUpdate, jobUpdate.fellowship_id,
                                    originalRequiresContract,originalRequiresFellowship,
                                    originalContractID, originalJobContractID,
                                    jobUpdate.fellowship_id, jobUpdate.jobs_fellowships_id,
                                    i);
                        }
                    } else if (originalRequiresContract === 1 && jobUpdate.job_situation_requires_unit_contract === 1){
                        return queryUpdateContract(req,res,next, userCity, jobUpdate,i);
                    } else if (originalRequiresFellowship === 1 && jobUpdate.job_situation_requires_fellowship === 1) {
                        return queryUpdateFellowship(req,res,next, userCity, jobUpdate,i);
                    } else if (originalRequiresContract === 0 && jobUpdate.job_situation_requires_unit_contract === 0
                          && originalRequiresFellowship === 0 && jobUpdate.job_situation_requires_fellowship === 0) {
                        // nothing to do on contracts and fellowships and jobs are already updated
                        if (i + 1 < req.body.updateJobs.length) {
                            jobUpdate = req.body.updateJobs[i + 1];
                            return queryUpdateJob(req,res,next,userCity, jobUpdate, i + 1);
                        } else if (req.body.newJobs.length > 0) {
                            var jobAdd = req.body.newJobs[0];
                            return queryAddJob(req,res,next,userCity,jobAdd,0);
                        } else if (req.body.deleteJobs.length > 0) {
                            var jobDelete = req.body.deleteJobs[0];
                            return queryDeleteJob(req,res,next,userCity,jobDelete,0);
                        } else {
                            sendJSONResponse(res, 200, { message: 'All done.' });
                            return;
                        }
                    } else {
                        if (i + 1 < req.body.updateJobs.length) {
                            jobUpdate = req.body.updateJobs[i + 1];
                            return queryUpdateJob(req,res,next,userCity, jobUpdate, i + 1);
                        } else if (req.body.newJobs.length > 0) {
                            var jobAdd = req.body.newJobs[0];
                            return queryAddJob(req,res,next,userCity,jobAdd,0);
                        } else if (req.body.deleteJobs.length > 0) {
                            var jobDelete = req.body.deleteJobs[0];
                            return queryDeleteJob(req,res,next,userCity,jobDelete,0);
                        } else {
                            sendJSONResponse(res, 200, { message: 'All done.' });
                            return;
                        }
                    }
                }
            );
        });
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryUpdateContract = function (req, res, next,userCity, jobUpdate,i) {
    var query = 'UPDATE `contracts`' +
                ' SET `reference` = ?,' +
                ' `start` = ?,' +
                ' `end` = ?,' +
                ' `maximum_extension` = ?' +
                ' WHERE `id` = ?;';
    var places = [jobUpdate.contract_reference,
                  momentToDate(jobUpdate.job_valid_from),
                  momentToDate(jobUpdate.job_valid_until),
                  momentToDate(jobUpdate.contract_maximum_extension),
                  jobUpdate.contract_id];
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
                if (i + 1 < req.body.updateJobs.length) {
                    jobUpdate = req.body.updateJobs[i + 1];
                    return queryUpdateJob(req,res,next,userCity, jobUpdate, i + 1);
                } else if (req.body.newJobs.length > 0) {
                    var jobAdd = req.body.newJobs[0];
                    return queryAddJob(req,res,next,userCity,jobAdd,0);
                } else if (req.body.deleteJobs.length > 0) {
                    var jobDelete = req.body.deleteJobs[0];
                    return queryDeleteJob(req,res,next,userCity,jobDelete,0);
                } else {
                    sendJSONResponse(res, 200, { message: 'All done.' });
                    return;
                }
            }
        );
    });
};
var queryUpdateFellowship = function (req, res, next,userCity, jobUpdate,i) {
    var query = 'UPDATE `fellowships`' +
                ' SET `fellowship_type_id` = ?,' +
                ' `reference` = ?,' +
                ' `start` = ?,' +
                ' `end` = ?,' +
                ' `maximum_extension` = ?' +
                ' WHERE `id` = ?;';
    var places = [jobUpdate.fellowship_type_id,
                  jobUpdate.fellowship_reference,
                  momentToDate(jobUpdate.job_valid_from),
                  momentToDate(jobUpdate.job_valid_until),
                  momentToDate(jobUpdate.fellowship_maximum_extension),
                  jobUpdate.fellowship_id];
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
                if (i + 1 < req.body.updateJobs.length) {
                    jobUpdate = req.body.updateJobs[i + 1];
                    return queryUpdateJob(req,res,next,userCity, jobUpdate, i + 1);
                } else if (req.body.newJobs.length > 0) {
                    var jobAdd = req.body.newJobs[0];
                    return queryAddJob(req,res,next,userCity,jobAdd,0);
                } else if (req.body.deleteJobs.length > 0) {
                    var jobDelete = req.body.deleteJobs[0];
                    return queryDeleteJob(req,res,next,userCity,jobDelete,0);
                } else {
                    sendJSONResponse(res, 200, { message: 'All done.' });
                    return;
                }
            }
        );
    });
};
var queryAddContractOnUpdate = function (req, res, next, userCity, jobUpdate,
                                    oReqContract, oReqFellowship,
                                    oContractID,oJobContractID,
                                    oFellowshipID,oJobFellowshipID,
                                    i) {
    var query = 'INSERT INTO `contracts`' +
                      ' (`reference`,`start`,`end`,`maximum_extension`)' +
                      ' VALUES (?,?,?,?);';
    var places = [jobUpdate.contract_reference,
                momentToDate(jobUpdate.job_valid_from),
                momentToDate(jobUpdate.job_valid_until),
                momentToDate(jobUpdate.contract_maximum_extension)];
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
                var contractID = resQuery.insertId;
                return queryAddContractJobOnUpdate(req,res,next,userCity,jobUpdate, contractID,
                                oReqContract,oReqFellowship,
                                oContractID, oJobContractID,
                                oFellowshipID,oJobFellowshipID,
                                i);
            }
        );
    });
};
var queryAddFellowshipOnUpdate = function (req, res, next,  userCity, jobUpdate,
                                    oReqContract, oReqFellowship,
                                    oContractID,oJobContractID,
                                    oFellowshipID,oJobFellowshipID,
                                    i) {
    var query = 'INSERT INTO `fellowships`' +
                ' (`fellowship_type_id`,`reference`,`start`,`end`,`maximum_extension`)' +
                ' VALUES (?,?,?,?,?);';
    var places = [jobUpdate.fellowship_type_id,
              jobUpdate.fellowship_reference,
              momentToDate(jobUpdate.job_valid_from),
              momentToDate(jobUpdate.job_valid_until),
              momentToDate(jobUpdate.fellowship_maximum_extension)];
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
                var fellowshipID = resQuery.insertId;
                return queryAddFellowshipJobOnUpdate(req,res,next,userCity,jobUpdate, fellowshipID,
                                oReqContract,oReqFellowship,
                                oContractID, oJobContractID,
                                oFellowshipID,oJobFellowshipID,
                                i);
            }
        );
    });
};
var queryAddContractJobOnUpdate = function (req, res, next, userCity,jobUpdate, newID,
                                    oReqContract, oReqFellowship,
                                    oContractID,oJobContractID,
                                    oFellowshipID,oJobFellowshipID,
                                    i) {
    var query = 'INSERT INTO `jobs_contracts`' +
                      ' (`job_id`,`contract_id`)' +
                      ' VALUES (?,?);';
    var places = [jobUpdate.job_id, newID];
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
                // check if we have to delete previous fellowship
                // if true, then delete
                // if not, either repeats another updateJob or proceeds to addJob
                if (oReqFellowship === 1) {
                    // delete fellowship entry
                    return queryDeleteFellowshipOnUpdate(req,res,next,userCity,jobUpdate,newID,
                                oReqContract,oReqFellowship,
                                oContractID,oJobContractID,
                                oFellowshipID,oJobFellowshipID,
                                i);

                } else {
                    if (i + 1 < req.body.updateJobs.length) {
                        jobUpdate = req.body.updateJobs[i + 1];
                        return queryUpdateJob(req,res,next,userCity, jobUpdate, i + 1);
                    } else if (req.body.newJobs.length > 0) {
                        var jobAdd = req.body.newJobs[0];
                        return queryAddJob(req,res,next,userCity,jobAdd,0);
                    } else if (req.body.deleteJobs.length > 0) {
                        var jobDelete = req.body.deleteJobs[0];
                        return queryDeleteJob(req,res,next,userCity,jobDelete,0);
                    } else {
                        sendJSONResponse(res, 200, { message: 'All done.' });
                        return;
                    }
                }
            }
        );
    });
};
var queryAddFellowshipJobOnUpdate = function (req, res, next, userCity,jobUpdate, newID,
                                    oReqContract, oReqFellowship,
                                    oContractID,oJobContractID,
                                    oFellowshipID,oJobFellowshipID,
                                    i) {
    var query = 'INSERT INTO `jobs_fellowships`' +
                ' (`job_id`,`fellowship_id`)' +
                ' VALUES (?,?);' +
                'INSERT INTO `fellowships_funding_agencies`' +
                ' (`fellowship_id`,`funding_agency_id`)' +
                ' VALUES (?,?);' +
                'INSERT INTO `fellowships_management_entities`' +
                ' (`fellowship_id`,`management_entity_id`)' +
                ' VALUES (?,?);';
    var places = [jobUpdate.job_id, newID,
                  newID,jobUpdate.funding_agency_id,
                  newID,jobUpdate.management_entity_id];
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
                // check if we have to delete previous contract
                // if true, then delete
                // if not, either repeats another updateJob or proceeds to addJob
                if (oReqContract === 1) {
                    // delete contract entry
                    return queryDeleteContractOnUpdate(req,res,next,userCity,jobUpdate,newID,
                                oReqContract,oReqFellowship,
                                oContractID,oJobContractID,
                                oFellowshipID,oJobFellowshipID,
                                i);

                } else {
                    if (i + 1 < req.body.updateJobs.length) {
                        jobUpdate = req.body.updateJobs[i + 1];
                        return queryUpdateJob(req,res,next,userCity, jobUpdate, i + 1);
                    } else if (req.body.newJobs.length > 0) {
                        var jobAdd = req.body.newJobs[0];
                        return queryAddJob(req,res,next,userCity,jobAdd,0);
                    } else if (req.body.deleteJobs.length > 0) {
                        var jobDelete = req.body.deleteJobs[0];
                        return queryDeleteJob(req,res,next,userCity,jobDelete,0);
                    } else {
                        sendJSONResponse(res, 200, { message: 'All done.' });
                        return;
                    }
                }
            }
        );
    });
};
var queryDeleteContractOnUpdate = function (req, res, next,userCity,jobUpdate,newID,
                                        oReqContract,oReqFellowship,
                                        oContractID,oJobContractID,
                                        oFellowshipID,oJobFellowshipID,
                                        i) {
    var query = 'DELETE FROM `jobs_contracts`' +
                ' WHERE `id` = ?;' +
                'DELETE FROM `contracts`' +
                ' WHERE `id` = ?;';
    var places = [oJobContractID,oContractID];
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
                if (i + 1 < req.body.updateJobs.length) {
                    jobUpdate = req.body.updateJobs[i + 1];
                    return queryUpdateJob(req,res,next,userCity, jobUpdate, i + 1);
                } else if (req.body.newJobs.length > 0) {
                    var jobAdd = req.body.newJobs[0];
                    return queryAddJob(req,res,next,userCity,jobAdd,0);
                } else if (req.body.deleteJobs.length > 0) {
                    var jobDelete = req.body.deleteJobs[0];
                    return queryDeleteJob(req,res,next,userCity,jobDelete,0);
                }  else {
                    sendJSONResponse(res, 200, { message: 'All done.' });
                    return;
                }
            }
        );
    });
};
var queryDeleteFellowshipOnUpdate = function (req, res, next,userCity,jobUpdate,newID,
                                        oReqContract,oReqFellowship,
                                        oContractID,oJobContractID,
                                        oFellowshipID,oJobFellowshipID,
                                        i) {
    var query = 'DELETE FROM `jobs_fellowships`' +
                ' WHERE `id` = ?;' +
                'DELETE FROM `fellowships_funding_agencies`' +
                ' WHERE `id` = ?;' +
                'DELETE FROM `fellowships_management_entities`' +
                ' WHERE `id` = ?;' +
                'DELETE FROM `fellowships`' +
                ' WHERE `id` = ?;';
    var places = [oJobFellowshipID,
                  jobUpdate.fellowships_funding_agencies_id,
                  jobUpdate.fellowships_management_entities_id,
                  oFellowshipID];
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
                if (i + 1 < req.body.updateJobs.length) {
                    jobUpdate = req.body.updateJobs[i + 1];
                    return queryUpdateJob(req,res,next,userCity, jobUpdate, i + 1);
                } else if (req.body.newJobs.length > 0) {
                    var jobAdd = req.body.newJobs[0];
                    return queryAddJob(req,res,next,userCity,jobAdd,0);
                } else if (req.body.deleteJobs.length > 0) {
                    var jobDelete = req.body.deleteJobs[0];
                    return queryDeleteJob(req,res,next,userCity,jobDelete,0);
                }  else {
                    sendJSONResponse(res, 200, { message: 'All done.' });
                    return;
                }
            }
        );
    });
};

var queryAddJob = function (req, res, next, userCity, jobAdd, i) {
    var query = 'INSERT INTO `jobs`' +
                ' (`person_id`,`situation_id`,`category_id`,`organization`,`dedication`,`valid_from`,`valid_until`)' +
                ' VALUES (?,?,?,?,?,?,?);';
    var places = [req.params.personID,
                  jobAdd.job_situation_id,
                  jobAdd.job_category_id,
                  jobAdd.job_organization,
                  jobAdd.job_dedication,
                  momentToDate(jobAdd.job_valid_from),
                  momentToDate(jobAdd.job_valid_until)];
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
                var jobID = resQuery.insertId;
                if (jobAdd.job_situation_requires_unit_contract === 1) {
                    return queryAddContractOnAdd(req,res,next,userCity,jobAdd,jobID,i);
                } else if (jobAdd.job_situation_requires_fellowship === 1) {
                    return queryAddFellowshipOnAdd(req,res,next,userCity,jobAdd,jobID,i);
                } else {
                    if (i + 1 < req.body.newJobs.length) {
                        jobAdd = req.body.newJobs[i + 1];
                        return queryAddJob(req,res,next,userCity, jobAdd, i + 1);
                    } else if (req.body.deleteJobs.length > 0) {
                        var jobDelete = req.body.deleteJobs[0];
                        return queryDeleteJob(req,res,next,userCity,jobDelete,0);
                    } else {
                        sendJSONResponse(res, 200, { message: 'All done.' });
                        return;
                    }
                }
            }
        );
    });
};
var queryAddContractOnAdd = function (req, res, next,userCity,jobAdd,jobID,i) {
    var query = 'INSERT INTO `contracts`' +
                ' (`reference`,`start`,`end`,`maximum_extension`)' +
                ' VALUES (?,?,?,?);';
    var places = [jobAdd.contract_reference,
                momentToDate(jobAdd.job_valid_from),
                momentToDate(jobAdd.job_valid_until),
                momentToDate(jobAdd.contract_maximum_extension)];
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
                var contractID = resQuery.insertId;
                return queryAddContractJobOnAdd(req,res,next,userCity,jobAdd, jobID, contractID,i);
            }
        );
    });
};
var queryAddFellowshipOnAdd = function (req, res, next,userCity,jobAdd,jobID,i) {
    var query = 'INSERT INTO `fellowships`' +
                ' (`fellowship_type_id`,`reference`,`start`,`end`,`maximum_extension`)' +
                ' VALUES (?,?,?,?,?);';
    var places = [jobAdd.fellowship_type_id,
              jobAdd.fellowship_reference,
              momentToDate(jobAdd.job_valid_from),
              momentToDate(jobAdd.job_valid_until),
              momentToDate(jobAdd.fellowship_maximum_extension)];
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
                var fellowshipID = resQuery.insertId;
                return queryAddFellowshipJobOnAdd(req,res,next,userCity,jobAdd, jobID, fellowshipID,i);
            }
        );
    });
};
var queryAddContractJobOnAdd = function (req, res, next,userCity,jobAdd,jobID,newID,i) {
    var query = 'INSERT INTO `jobs_contracts`' +
                      ' (`job_id`,`contract_id`)' +
                      ' VALUES (?,?);';
    var places = [jobID, newID];
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
                if (i + 1 < req.body.newJobs.length) {
                    jobAdd = req.body.newJobs[i + 1];
                    return queryAddJob(req,res,next,userCity, jobAdd, i + 1);
                } else if (req.body.deleteJobs.length > 0) {
                    var jobDelete = req.body.deleteJobs[0];
                    return queryDeleteJob(req,res,next,userCity,jobDelete,0);
                } else {
                    sendJSONResponse(res, 200, { message: 'All done.' });
                    return;
                }

            }
        );
    });
};
var queryAddFellowshipJobOnAdd = function (req, res, next,userCity,jobAdd,jobID,newID,i) {
     var query = 'INSERT INTO `jobs_fellowships`' +
                 ' (`job_id`,`fellowship_id`)' +
                 ' VALUES (?,?);' +
                 'INSERT INTO `fellowships_funding_agencies`' +
                 ' (`fellowship_id`,`funding_agency_id`)' +
                 ' VALUES (?,?);' +
                 'INSERT INTO `fellowships_management_entities`' +
                 ' (`fellowship_id`,`management_entity_id`)' +
                 ' VALUES (?,?);';
    var places = [jobID, newID,
                  newID,jobAdd.funding_agency_id,
                  newID,jobAdd.management_entity_id];
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
                if (i + 1 < req.body.newJobs.length) {
                    jobAdd = req.body.newJobs[i + 1];
                    return queryAddJob(req,res,next,userCity, jobAdd, i + 1);
                } else if (req.body.deleteJobs.length > 0) {
                    var jobDelete = req.body.deleteJobs[0];
                    return queryDeleteJob(req,res,next,userCity,jobDelete,0);
                } else {
                    sendJSONResponse(res, 200, { message: 'All done.' });
                    return;
                }
            }
        );
    });
};

var queryDeleteJob = function (req, res, next, userCity, jobDelete,i) {
    var query = 'DELETE FROM `jobs_contracts`' +
                ' WHERE `id` = ?;' +
                'DELETE FROM `jobs_fellowships`' +
                ' WHERE `id` = ?;' +
                'DELETE FROM `fellowships_funding_agencies`' +
                ' WHERE `id` = ?;' +
                'DELETE FROM `fellowships_management_entities`' +
                ' WHERE `id` = ?;' +
                'DELETE FROM `contracts`' +
                ' WHERE `id` = ?;' +
                'DELETE FROM `fellowships`' +
                ' WHERE `id` = ?;' +
                'DELETE FROM `jobs`' +
                ' WHERE `id` = ?;';
    var places = [jobDelete.jobs_contracts_id,
                  jobDelete.jobs_fellowships_id,
                  jobDelete.fellowships_funding_agencies_id,
                  jobDelete.fellowships_management_entities_id,
                  jobDelete.contract_id,
                  jobDelete.fellowship_id,
                  jobDelete.job_id];
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
                if (i + 1 < req.body.deleteJobs.length) {
                    jobDelete = req.body.deleteJobs[i + 1];
                    return queryDeleteJob(req,res,next,userCity, jobDelete, i + 1);
                } else {
                    sendJSONResponse(res, 200, { message: 'All done.' });
                    return;
                }
            }
        );
    });
};

var queryResponsibles = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var updateArr = req.body.updateResponsibles;
        var newArr = req.body.newResponsibles;
        var deleteArr = req.body.deleteResponsibles;
        var places = [];
        var querySQL = '';
        if (updateArr.length > 0) {
            for (var ind in updateArr) {
                updateArr[ind].valid_from = momentToDate(updateArr[ind].valid_from);
                updateArr[ind].valid_until = momentToDate(updateArr[ind].valid_until);
                querySQL = querySQL + 'UPDATE `people_responsibles`' +
                                      ' SET `responsible_id` = ?,' +
                                      ' `responsible_type_id` = ?,' +
                                      ' `valid_from` = ?,' +
                                      ' `valid_until` = ?' +
                                      ' WHERE `id` = ?';
                querySQL = querySQL + '; ';
                places.push(updateArr[ind].responsible_id,
                            updateArr[ind].responsible_type_id,
                            updateArr[ind].valid_from,
                            updateArr[ind].valid_until,
                            updateArr[ind].people_responsibles_id);
            }
        }
        if (newArr.length > 0) {
            for (var ind in newArr) {
                newArr[ind].valid_from = momentToDate(newArr[ind].valid_from);
                newArr[ind].valid_until = momentToDate(newArr[ind].valid_until);
                querySQL = querySQL + 'INSERT INTO `people_responsibles`' +
                                      ' (`person_id`,`responsible_id`,`responsible_type_id`,`valid_from`,`valid_until`)' +
                                      ' VALUES (?,?,?,?,?)';
                querySQL = querySQL + '; ';
                places.push(personID,
                            newArr[ind].responsible_id,
                            newArr[ind].responsible_type_id,
                            newArr[ind].valid_from,
                            newArr[ind].valid_until);
            }
        }
        if (deleteArr.length > 0) {
            for (var ind in deleteArr) {
                querySQL = querySQL + 'DELETE FROM `people_responsibles`' +
                                      ' WHERE id=?';
                querySQL = querySQL + '; ';
                places.push(deleteArr[ind].people_responsibles_id);
            }
        }
        if (deleteArr.length === 0 && updateArr.length == 0 && newArr.length === 0) {
            sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        } else {
            escapedQuery(querySQL, places, req, res, next);
        }
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryContactInfoPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var addressID = req.body.personal_address_id;
        var phoneID = req.body.personal_phone_id;
        var emailID = req.body.personal_email_id;
        var address = req.body.address;
        var postal_code = req.body.postal_code;
        var city = req.body.city;
        var personal_phone = req.body.personal_phone;
        var personal_email = req.body.personal_email;
        var places = [];
        var querySQL;
        // assuming only one personal address per person
        if (addressID == null) {
            querySQL = 'INSERT INTO `personal_addresses` (person_id, address, postal_code, city)' +
                           ' SELECT ?, ?, ?, ? FROM DUAL' +
                           ' WHERE NOT EXISTS (' +
                                'SELECT person_id FROM `personal_addresses`' +
                                ' WHERE person_id = ?)';
            querySQL = querySQL + '; ';
            places.push(personID,address,postal_code,city,personID);
        } else {
            querySQL = 'UPDATE `personal_addresses`' +
                           ' SET `address` = ?' +
                           ',`postal_code` = ?' +
                           ',`city` = ?' +
                           ' WHERE `person_id` = ?';
            querySQL = querySQL + '; ';
            places.push(address,postal_code,city,personID);
        }
        if (phoneID == null) {
             querySQL = querySQL + 'INSERT INTO `personal_phones` (person_id, phone)' +
                           ' SELECT ?, ? FROM DUAL' +
                           ' WHERE NOT EXISTS (' +
                                'SELECT person_id FROM `personal_phones`' +
                                ' WHERE person_id = ?)';
            querySQL = querySQL + '; ';
            places.push(personID,personal_phone,personID);
        } else {
            querySQL = querySQL + 'UPDATE `personal_phones`' +
                           ' SET `phone` = ?' +
                           ' WHERE `person_id` = ?';
            querySQL = querySQL + '; ';
            places.push(personal_phone,personID);
        }
        if (emailID == null) {
             querySQL = querySQL + 'INSERT INTO `personal_emails` (person_id, email)' +
                           ' SELECT ?, ? FROM DUAL' +
                           ' WHERE NOT EXISTS (' +
                                'SELECT person_id FROM `personal_emails`' +
                                ' WHERE person_id = ?)';
            querySQL = querySQL + '; ';
            places.push(personID,personal_email,personID);
        } else {
            querySQL = querySQL + 'UPDATE `personal_emails`' +
                           ' SET `email` = ?' +
                           ' WHERE `person_id` = ?';
            querySQL = querySQL + '; ';
            places.push(personal_email,personID);
        }
        escapedQuery(querySQL, places, req, res, next);
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }

};

var queryEmergencyContactsPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var updateContacts = req.body.updateContacts;
        var newContacts = req.body.newContacts;
        var deleteContacts = req.body.deleteContacts;
        var places = [];
        var querySQL = '';
        if (updateContacts.length > 0) {
            for (var ind in updateContacts) {
                querySQL = querySQL + 'UPDATE `emergency_contacts`' +
                                      ' SET `name` = ?,' +
                                      ' `phone` = ?' +
                                      ' WHERE `id` = ?';
                querySQL = querySQL + '; ';
                places.push(updateContacts[ind].emergency_name,
                            updateContacts[ind].emergency_phone,
                            updateContacts[ind].emergency_id);
            }
        }
        if (newContacts.length > 0) {
            for (var ind in newContacts) {
                querySQL = querySQL + 'INSERT INTO `emergency_contacts` (`person_id`,`name`, `phone`)' +
                                      ' VALUES (?, ?, ?)';
                querySQL = querySQL + '; ';
                places.push(personID, newContacts[ind].emergency_name,
                            newContacts[ind].emergency_phone);
            }
        }
        if (deleteContacts.length > 0) {
            for (var ind in deleteContacts) {
                querySQL = querySQL + 'DELETE FROM `emergency_contacts`' +
                                      ' WHERE id=?';
                querySQL = querySQL + '; ';
                places.push(deleteContacts[ind].emergency_id);
            }
        }
        if (updateContacts.length === 0
            && newContacts.length === 0
            && deleteContacts.length === 0) {
                sendJSONResponse(res, 200, { message: 'No changes.' });
        } else {
            escapedQuery(querySQL, places, req, res, next);
        }
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryFinishedDegreesPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var updateDegrees = req.body.degree_data.updateDegrees;
        var newDegrees = req.body.degree_data.newDegrees;
        var deleteDegrees = req.body.degree_data.deleteDegrees;
        var dataSupervisors = req.body.degree_supervisors;
        var dataExtSupervisors = req.body.degree_ext_supervisors;
        var places = [];
        var querySQL = '';
        var degID;
        if (updateDegrees.length > 0) {
            for (var ind in updateDegrees) {
                updateDegrees[ind].degree_start = momentToDate(updateDegrees[ind].degree_start);
                updateDegrees[ind].degree_end = momentToDate(updateDegrees[ind].degree_end);
                querySQL = querySQL + 'UPDATE `degrees_people`' +
                                      ' SET `degree_id` = ?,' +
                                      ' `area` = ?,' +
                                      ' `institution` = ?,' +
                                      ' `program` = ?,' +
                                      ' `title` = ?,' +
                                      ' `start` = ?,' +
                                      ' `end` = ?' +
                                      ' WHERE `id` = ?';
                querySQL = querySQL + '; ';
                places.push(updateDegrees[ind].degree_type_id,
                            updateDegrees[ind].degree_area,
                            updateDegrees[ind].degree_institution,
                            updateDegrees[ind].degree_program,
                            updateDegrees[ind].degree_title,
                            updateDegrees[ind].degree_start,
                            updateDegrees[ind].degree_end,
                            updateDegrees[ind].degrees_people_id);
                if (dataSupervisors.hasOwnProperty(updateDegrees[ind].degrees_people_id)) {
                    degID = updateDegrees[ind].degrees_people_id;
                    if (dataSupervisors[degID].updateSupervisors.length >0) {
                        for (var indSup in dataSupervisors[degID].updateSupervisors) {
                            querySQL = querySQL + 'UPDATE `degrees_supervisors`' +
                                          ' SET `supervisor_type_id` = ?,' +
                                          ' `supervisor_id` = ?,' +
                                          ' `valid_from` = ?,' +
                                          ' `valid_until` = ?' +
                                          ' WHERE `id` = ?';
                            querySQL = querySQL + '; ';
                            places.push(dataSupervisors[degID].updateSupervisors[indSup].supervisor_type_id,
                                        dataSupervisors[degID].updateSupervisors[indSup].supervisor_id,
                                        momentToDate(dataSupervisors[degID].updateSupervisors[indSup].valid_from),
                                        momentToDate(dataSupervisors[degID].updateSupervisors[indSup].valid_until),
                                        dataSupervisors[degID].updateSupervisors[indSup].degrees_supervisors_id);
                        }
                    }
                    if (dataSupervisors[degID].newSupervisors.length >0) {
                        for (var indSup in dataSupervisors[degID].newSupervisors) {
                            querySQL = querySQL + 'INSERT INTO `degrees_supervisors`' +
                                          ' (`degree_person_id`,`supervisor_type_id`,`supervisor_id`,`valid_from`,`valid_until`)' +
                                          ' VALUES (?,?,?,?,?)';
                            querySQL = querySQL + '; ';
                            places.push(degID,
                                        dataSupervisors[degID].newSupervisors[indSup].supervisor_type_id,
                                        dataSupervisors[degID].newSupervisors[indSup].supervisor_id,
                                        momentToDate(dataSupervisors[degID].newSupervisors[indSup].valid_from),
                                        momentToDate(dataSupervisors[degID].newSupervisors[indSup].valid_until));
                        }
                    }
                    if (dataSupervisors[degID].deleteSupervisors.length >0) {
                        for (var indSup in dataSupervisors[degID].deleteSupervisors) {
                            querySQL = querySQL + 'DELETE FROM `degrees_supervisors`' +
                                          ' WHERE id =?';
                            querySQL = querySQL + '; ';
                            places.push(dataSupervisors[degID].deleteSupervisors[indSup].degrees_supervisors_id);
                        }
                    }
                }
                if (dataExtSupervisors.hasOwnProperty(updateDegrees[ind].degrees_people_id)) {
                    degID = updateDegrees[ind].degrees_people_id;
                    if (dataExtSupervisors[degID].updateSupervisors.length >0) {
                        for (var indSup in dataExtSupervisors[degID].updateSupervisors) {
                            querySQL = querySQL + 'UPDATE `degrees_external_supervisors`' +
                                          ' SET `supervisor_type_id` = ?,' +
                                          ' `colloquial_name` = ?,' +
                                          ' `organization` = ?,' +
                                          ' `valid_from` = ?,' +
                                          ' `valid_until` = ?' +
                                          ' WHERE `id` = ?';
                            querySQL = querySQL + '; ';
                            places.push(dataExtSupervisors[degID].updateSupervisors[indSup].supervisor_type_id,
                                        dataExtSupervisors[degID].updateSupervisors[indSup].supervisor_name,
                                        dataExtSupervisors[degID].updateSupervisors[indSup].supervisor_organization,
                                        momentToDate(dataExtSupervisors[degID].updateSupervisors[indSup].valid_from),
                                        momentToDate(dataExtSupervisors[degID].updateSupervisors[indSup].valid_until),
                                        dataExtSupervisors[degID].updateSupervisors[indSup].degrees_ext_supervisors_id);
                        }
                    }
                    if (dataExtSupervisors[degID].newSupervisors.length >0) {
                        for (var indSup in dataExtSupervisors[degID].newSupervisors) {
                            querySQL = querySQL + 'INSERT INTO `degrees_external_supervisors`' +
                                          ' (`degree_person_id`,`supervisor_type_id`,`colloquial_name`,`organization`,`valid_from`,`valid_until`)' +
                                          ' VALUES (?,?,?,?,?,?)';
                            querySQL = querySQL + '; ';
                            places.push(degID,
                                        dataExtSupervisors[degID].newSupervisors[indSup].supervisor_type_id,
                                        dataExtSupervisors[degID].newSupervisors[indSup].supervisor_name,
                                        dataExtSupervisors[degID].newSupervisors[indSup].supervisor_organization,
                                        momentToDate(dataExtSupervisors[degID].newSupervisors[indSup].valid_from),
                                        momentToDate(dataExtSupervisors[degID].newSupervisors[indSup].valid_until));
                        }
                    }
                    if (dataExtSupervisors[degID].deleteSupervisors.length >0) {
                        for (var indSup in dataExtSupervisors[degID].deleteSupervisors) {
                            querySQL = querySQL + 'DELETE FROM `degrees_external_supervisors`' +
                                          ' WHERE id =?';
                            querySQL = querySQL + '; ';
                            places.push(dataExtSupervisors[degID].deleteSupervisors[indSup].degrees_ext_supervisors_id);
                        }
                    }

                }
            }
        }
        if (deleteDegrees.length > 0) {
            // first delete from degrees_supervisors and degrees_external supervisors
            for (var ind in deleteDegrees) {
                querySQL = querySQL + 'DELETE FROM `degrees_supervisors`' +
                                      ' WHERE degree_person_id=?';
                querySQL = querySQL + '; ';
                places.push(deleteDegrees[ind].degrees_people_id);
                querySQL = querySQL + 'DELETE FROM `degrees_external_supervisors`' +
                                      ' WHERE degree_person_id=?';
                querySQL = querySQL + '; ';
                places.push(deleteDegrees[ind].degrees_people_id);
                querySQL = querySQL + 'DELETE FROM `degrees_people`' +
                                      ' WHERE id=?';
                querySQL = querySQL + '; ';
                places.push(deleteDegrees[ind].degrees_people_id);
            }
        }
        if (newDegrees.length > 0) {
            return queryAddDegreePerson(req,res,next, userCity, querySQL, places, personID,
                                 newDegrees, 0);
        } else {
            if (updateDegrees.length === 0
                && newDegrees.length === 0
                && deleteDegrees.length === 0) {
                sendJSONResponse(res, 200, { message: 'No changes.' });
            } else {
                escapedQuery(querySQL, places, req, res, next);
            }
        }
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryAddDegreePerson = function (req,res, next, userCity, otherSQL, otherPlaces, personID,
                                     newDegrees, i) {
    newDegrees[i].degree_start = momentToDate(newDegrees[i].degree_start);
    newDegrees[i].degree_end = momentToDate(newDegrees[i].degree_end);
    var query = 'INSERT INTO `degrees_people`' +
                   ' (`person_id`,`degree_id`,`area`,`institution`,`program`,`title`,`start`,`end`)' +
                   ' VALUES (?,?,?,?,?,?,?,?);';
    var places = [personID,
                  newDegrees[i].degree_type_id,
                  newDegrees[i].degree_area,
                  newDegrees[i].degree_institution,
                  newDegrees[i].degree_program,
                  newDegrees[i].degree_title,
                  newDegrees[i].degree_start,
                  newDegrees[i].degree_end];
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
                var degID = resQuery.insertId;
                return queryAddSupervisorPerson(req,res,next, userCity, otherSQL, otherPlaces, personID,
                                                newDegrees, degID, i);
            }
        );
    });
};

var queryAddSupervisorPerson = function (req,res, next, userCity, otherSQL, otherPlaces, personID,
                                     newDegrees, degID, i) {
    var query = '';
    var places = [];
    for (var indSup in newDegrees[i].supervisors) {
        query = query + 'INSERT INTO `degrees_supervisors`' +
                          ' (`degree_person_id`,`supervisor_type_id`,`supervisor_id`,`valid_from`,`valid_until`)' +
                          ' VALUES (?,?,?,?,?);';
        places.push(degID,
                  newDegrees[i].supervisors[indSup].supervisor_type_id,
                  newDegrees[i].supervisors[indSup].supervisor_id,
                  momentToDate(newDegrees[i].supervisors[indSup].valid_from),
                  momentToDate(newDegrees[i].supervisors[indSup].valid_until));
    }
    for (var indSup in newDegrees[i].external_supervisors) {
        query = query + 'INSERT INTO `degrees_external_supervisors`' +
                              ' (`degree_person_id`,`supervisor_type_id`,`colloquial_name`,`organization`,`valid_from`,`valid_until`)' +
                              ' VALUES (?,?,?,?,?,?);';
        places.push(degID,
                    newDegrees[i].external_supervisors[indSup].supervisor_type_id,
                    newDegrees[i].external_supervisors[indSup].supervisor_name,
                    newDegrees[i].external_supervisors[indSup].supervisor_organization,
                    momentToDate(newDegrees[i].external_supervisors[indSup].valid_from),
                    momentToDate(newDegrees[i].external_supervisors[indSup].valid_until));
    }
    if (places.length > 0) {
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
                    if (i + 1 < newDegrees.length) {
                        return queryAddDegreePerson(req,res,next, userCity, otherSQL, otherPlaces, personID,
                                                    newDegrees, i+1);
                    } else {
                        return queryAddDegreeFinalInfo(req, res, next, otherSQL, otherPlaces);
                    }
                }
            );
        });
    } else {
        if (i + 1 < newDegrees.length) {
            return queryAddDegreePerson(req,res,next, userCity, otherSQL, otherPlaces, personID,
                                        newDegrees, i+1);
        } else {
            return queryAddDegreeFinalInfo(req, res, next, otherSQL, otherPlaces);
        }
    }
};

var queryAddDegreeFinalInfo = function (req,res, next, otherSQL, otherPlaces) {
    if (otherPlaces.length > 0) {
        escapedQuery(otherSQL, otherPlaces, req, res, next);
    } else {
        sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        return;
    }
};

var queryIdentificationsInfoPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        // data to be added/updated to resource
        var personID = req.params.personID;
        var updateIDs = req.body.updateIDs;
        var newIDs = req.body.newIDs;
        var deleteIDs = req.body.deleteIDs;
        var places = [];
        var querySQL = '';
        if (updateIDs.length > 0) {
            for (var ind in updateIDs) {
                if (updateIDs[ind].card_valid_until !== null) {
                    updateIDs[ind].card_valid_until = moment.tz(updateIDs[ind].card_valid_until,'Europe/Lisbon').format('YYYY-MM-DD');
                    updateIDs[ind].card_valid_until = updateIDs[ind].card_valid_until.substr(0,10);
                }
                querySQL = querySQL + 'UPDATE `identifications`' +
                                      ' SET `card_type_id` = ?,' +
                                      ' `card_number` = ?,' +
                                      ' `valid_until` = ?' +
                                      ' WHERE `id` = ?';
                querySQL = querySQL + '; ';
                places.push(updateIDs[ind].card_type_id,
                            updateIDs[ind].card_number,
                            updateIDs[ind].card_valid_until,
                            updateIDs[ind].card_id);
            }
        }
        if (newIDs.length > 0) {
            for (var ind in newIDs) {
                if (newIDs[ind].card_valid_until !== null) {
                    newIDs[ind].card_valid_until = moment.tz(newIDs[ind].card_valid_until,'Europe/Lisbon').format('YYYY-MM-DD');
                    newIDs[ind].card_valid_until = newIDs[ind].card_valid_until.substr(0,10);
                }
                querySQL = querySQL + 'INSERT INTO `identifications` (`person_id`,`card_type_id`, `card_number`, `valid_until` )' +
                                      ' VALUES (?, ?, ?, ?)';
                querySQL = querySQL + '; ';
                places.push(personID,
                            newIDs[ind].card_type_id,
                            newIDs[ind].card_number,
                            newIDs[ind].card_valid_until);
            }
        }
        if (deleteIDs.length > 0) {
            for (var ind in deleteIDs) {
                querySQL = querySQL + 'DELETE FROM `identifications`' +
                                      ' WHERE id=?';
                querySQL = querySQL + '; ';
                places.push(deleteIDs[ind].card_id);
            }
        }
        if (updateIDs.length === 0
            && newIDs.length === 0
            && deleteIDs.length === 0) {
            sendJSONResponse(res, 200, { message: 'No changes.' });
        } else {
            escapedQuery(querySQL, places, req, res, next);
        }
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }


};

var queryInstitutionalContactsPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var phone_id = req.body.phone_id;
        var phone = req.body.phone;
        var extension = req.body.extension;
        var email_id = req.body.email_id;
        var email = req.body.email;
        var places = [];
        var querySQL = '';
        if (phone_id !== null) {
            querySQL = querySQL + 'UPDATE `phones`' +
                       ' SET `phone` = ?,' +
                       ' `extension` = ?' +
                       ' WHERE `id` = ?';
            places.push(phone,extension,phone_id);
            querySQL = querySQL + '; ';
        } else {
            querySQL = querySQL + 'INSERT INTO `phones`' +
                       ' (`person_id`,`phone`,`extension`)' +
                       ' VALUES (?,?,?)';
            places.push(personID,phone,extension);
            querySQL = querySQL + '; ';
        }
        if (email_id !== null) {
            querySQL = querySQL + 'UPDATE `emails`' +
                       ' SET `email` = ?' +
                       ' WHERE `id` = ?';
            places.push(email,email_id);
            querySQL = querySQL + '; ';
        } else {
            querySQL = querySQL + 'INSERT INTO `emails`' +
                       ' (`person_id`,`email`)' +
                       ' VALUES (?,?)';
            places.push(personID,email);
            querySQL = querySQL + '; ';
        }
        escapedQuery(querySQL, places, req, res, next);
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryNuclearInfoPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        // data to be added/updated to resource
        var personID = req.params.personID;
        var name = req.body.name;
        var colloquial_name = req.body.colloquial_name;
        var birth_date = momentToDate(req.body.birth_date);
        var user_id = req.body.user_id;
        var active_from = momentToDate(req.body.active_from);
        var active_until = momentToDate(req.body.active_until);
        var updated = momentToDate(moment(),undefined,'YYYY-MM-DD HH:mm:ss');
        var changed_by = req.body.changed_by;
        var gender = req.body.gender;
        var newNationalities = req.body.new_nationalities;
        var deleteNationalities = req.body.del_nationalities;
        var places = [];
        var querySQL = 'UPDATE `people`' +
                       ' SET `name` = ?' +
                       ',`colloquial_name` = ?' +
                       ',`birth_date` = ?' +
                       ',`gender` = ?' +
                       ' WHERE `id` = ?';
        querySQL = querySQL + '; ';
        places.push(name,colloquial_name,birth_date,gender,personID);
        querySQL = querySQL + 'INSERT INTO `people_history`' +
                       ' (`person_id`,`user_id`,`name`,`colloquial_name`,`birth_date`,`gender`,' +
                         '`active_from`,`active_until`,`status`,`updated`,`operation`,`changed_by`)' +
                       ' VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
        querySQL = querySQL + '; ';
        places.push(personID,user_id,name,colloquial_name,birth_date,gender,
                    active_from,active_until,1,updated,'U',changed_by);
        if (newNationalities.length > 0) {
            for (var ind in newNationalities) {
                querySQL = querySQL + 'INSERT INTO `people_countries` (`person_id`,`country_id`)' +
                                      ' VALUES (?, ?)';
                querySQL = querySQL + '; ';
                places.push(personID, newNationalities[ind].country_id);
            }
        }
        if (deleteNationalities.length > 0) {
            for (var ind in deleteNationalities) {
                querySQL = querySQL + 'DELETE FROM `people_countries`' +
                                      ' WHERE `id`= ?';
                querySQL = querySQL + '; ';
                places.push(deleteNationalities[ind].people_countries_id);
            }
        }

        escapedQuery(querySQL, places, req, res, next);
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }


};

var queryInstitutionCityPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        // data to be added/updated to resource
        var personID = req.params.personID;
        var people_institution_city_id = req.body.people_institution_city_id;
        var pole = req.body.pole;
        var places = [];
        var querySQL;
        if (people_institution_city_id !== null) {
            querySQL = 'UPDATE `people_institution_city`' +
                           ' SET `city_id` = ?' +
                           ' WHERE `id` = ?';
            querySQL = querySQL + '; ';
            places.push(pole,people_institution_city_id);
        } else {
            querySQL = 'INSERT INTO `people_institution_city`' +
                           ' (`person_id`,`city_id`)' +
                           ' VALUES (?,?)';
            querySQL = querySQL + '; ';
            places.push(personID,pole);
        }
        escapedQuery(querySQL, places, req, res, next);
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }


};

var queryOngoingDegreesPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var updateDegrees = req.body.degree_data.updateDegrees;
        var newDegrees = req.body.degree_data.newDegrees;
        var deleteDegrees = req.body.degree_data.deleteDegrees;
        var dataSupervisors = req.body.degree_supervisors;
        var dataExtSupervisors = req.body.degree_ext_supervisors;
        var places = [];
        var querySQL = '';
        var degID;
        if (updateDegrees.length > 0) {
            for (var ind in updateDegrees) {
                updateDegrees[ind].degree_start = momentToDate(updateDegrees[ind].degree_start);
                updateDegrees[ind].degree_estimate_end = momentToDate(updateDegrees[ind].degree_estimate_end);
                updateDegrees[ind].degree_end = momentToDate(updateDegrees[ind].degree_end);
                querySQL = querySQL + 'UPDATE `degrees_people`' +
                                      ' SET `degree_id` = ?,' +
                                      ' `area` = ?,' +
                                      ' `institution` = ?,' +
                                      ' `program` = ?,' +
                                      ' `title` = ?,' +
                                      ' `start` = ?,' +
                                      ' `estimate_end` = ?,' +
                                      ' `end` = ?' +
                                      ' WHERE `id` = ?';
                querySQL = querySQL + '; ';
                places.push(updateDegrees[ind].degree_type_id,
                            updateDegrees[ind].degree_area,
                            updateDegrees[ind].degree_institution,
                            updateDegrees[ind].degree_program,
                            updateDegrees[ind].degree_title,
                            updateDegrees[ind].degree_start,
                            updateDegrees[ind].degree_estimate_end,
                            updateDegrees[ind].degree_end,
                            updateDegrees[ind].degrees_people_id);
                if (dataSupervisors.hasOwnProperty(updateDegrees[ind].degrees_people_id)) {
                    degID = updateDegrees[ind].degrees_people_id;
                    if (dataSupervisors[degID].updateSupervisors.length >0) {
                        for (var indSup in dataSupervisors[degID].updateSupervisors) {
                            querySQL = querySQL + 'UPDATE `degrees_supervisors`' +
                                          ' SET `supervisor_type_id` = ?,' +
                                          ' `supervisor_id` = ?,' +
                                          ' `valid_from` = ?,' +
                                          ' `valid_until` = ?' +
                                          ' WHERE `id` = ?';
                            querySQL = querySQL + '; ';
                            places.push(dataSupervisors[degID].updateSupervisors[indSup].supervisor_type_id,
                                        dataSupervisors[degID].updateSupervisors[indSup].supervisor_id,
                                        momentToDate(dataSupervisors[degID].updateSupervisors[indSup].valid_from),
                                        momentToDate(dataSupervisors[degID].updateSupervisors[indSup].valid_until),
                                        dataSupervisors[degID].updateSupervisors[indSup].degrees_supervisors_id);
                        }
                    }
                    if (dataSupervisors[degID].newSupervisors.length >0) {
                        for (var indSup in dataSupervisors[degID].newSupervisors) {
                            querySQL = querySQL + 'INSERT INTO `degrees_supervisors`' +
                                          ' (`degree_person_id`,`supervisor_type_id`,`supervisor_id`,`valid_from`,`valid_until`)' +
                                          ' VALUES (?,?,?,?,?)';
                            querySQL = querySQL + '; ';
                            places.push(degID,
                                        dataSupervisors[degID].newSupervisors[indSup].supervisor_type_id,
                                        dataSupervisors[degID].newSupervisors[indSup].supervisor_id,
                                        momentToDate(dataSupervisors[degID].newSupervisors[indSup].valid_from),
                                        momentToDate(dataSupervisors[degID].newSupervisors[indSup].valid_until));
                        }
                    }
                    if (dataSupervisors[degID].deleteSupervisors.length >0) {
                        for (var indSup in dataSupervisors[degID].deleteSupervisors) {
                            querySQL = querySQL + 'DELETE FROM `degrees_supervisors`' +
                                          ' WHERE id =?';
                            querySQL = querySQL + '; ';
                            places.push(dataSupervisors[degID].deleteSupervisors[indSup].degrees_supervisors_id);
                        }
                    }
                }
                if (dataExtSupervisors.hasOwnProperty(updateDegrees[ind].degrees_people_id)) {
                    degID = updateDegrees[ind].degrees_people_id;
                    if (dataExtSupervisors[degID].updateSupervisors.length >0) {
                        for (var indSup in dataExtSupervisors[degID].updateSupervisors) {
                            querySQL = querySQL + 'UPDATE `degrees_external_supervisors`' +
                                          ' SET `supervisor_type_id` = ?,' +
                                          ' `colloquial_name` = ?,' +
                                          ' `organization` = ?,' +
                                          ' `valid_from` = ?,' +
                                          ' `valid_until` = ?' +
                                          ' WHERE `id` = ?';
                            querySQL = querySQL + '; ';
                            places.push(dataExtSupervisors[degID].updateSupervisors[indSup].supervisor_type_id,
                                        dataExtSupervisors[degID].updateSupervisors[indSup].supervisor_name,
                                        dataExtSupervisors[degID].updateSupervisors[indSup].supervisor_organization,
                                        momentToDate(dataExtSupervisors[degID].updateSupervisors[indSup].valid_from),
                                        momentToDate(dataExtSupervisors[degID].updateSupervisors[indSup].valid_until),
                                        dataExtSupervisors[degID].updateSupervisors[indSup].degrees_ext_supervisors_id);
                        }
                    }
                    if (dataExtSupervisors[degID].newSupervisors.length >0) {
                        for (var indSup in dataExtSupervisors[degID].newSupervisors) {
                            querySQL = querySQL + 'INSERT INTO `degrees_external_supervisors`' +
                                          ' (`degree_person_id`,`supervisor_type_id`,`colloquial_name`,`organization`,`valid_from`,`valid_until`)' +
                                          ' VALUES (?,?,?,?,?,?)';
                            querySQL = querySQL + '; ';
                            places.push(degID,
                                        dataExtSupervisors[degID].newSupervisors[indSup].supervisor_type_id,
                                        dataExtSupervisors[degID].newSupervisors[indSup].supervisor_name,
                                        dataExtSupervisors[degID].newSupervisors[indSup].supervisor_organization,
                                        momentToDate(dataExtSupervisors[degID].newSupervisors[indSup].valid_from),
                                        momentToDate(dataExtSupervisors[degID].newSupervisors[indSup].valid_until));
                        }
                    }
                    if (dataExtSupervisors[degID].deleteSupervisors.length >0) {
                        for (var indSup in dataExtSupervisors[degID].deleteSupervisors) {
                            querySQL = querySQL + 'DELETE FROM `degrees_external_supervisors`' +
                                          ' WHERE id =?';
                            querySQL = querySQL + '; ';
                            places.push(dataExtSupervisors[degID].deleteSupervisors[indSup].degrees_ext_supervisors_id);
                        }
                    }

                }
            }
        }
        if (deleteDegrees.length > 0) {
            // first delete from degrees_supervisors and degrees_external supervisors
            for (var ind in deleteDegrees) {
                querySQL = querySQL + 'DELETE FROM `degrees_supervisors`' +
                                      ' WHERE degree_person_id=?';
                querySQL = querySQL + '; ';
                places.push(deleteDegrees[ind].degrees_people_id);
                querySQL = querySQL + 'DELETE FROM `degrees_external_supervisors`' +
                                      ' WHERE degree_person_id=?';
                querySQL = querySQL + '; ';
                places.push(deleteDegrees[ind].degrees_people_id);
                querySQL = querySQL + 'DELETE FROM `degrees_people`' +
                                      ' WHERE id=?';
                querySQL = querySQL + '; ';
                places.push(deleteDegrees[ind].degrees_people_id);
            }
        }
        if (newDegrees.length > 0) {
            return queryAddOngoingDegreePerson(req,res,next, userCity, querySQL, places, personID,
                                 newDegrees, 0);
        } else {
            escapedQuery(querySQL, places, req, res, next);
        }
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryAddOngoingDegreePerson = function (req,res, next, userCity, otherSQL, otherPlaces, personID,
                                     newDegrees, i) {
    newDegrees[i].degree_start = momentToDate(newDegrees[i].degree_start);
    newDegrees[i].degree_end = momentToDate(newDegrees[i].degree_end);
    var query = 'INSERT INTO `degrees_people`' +
                   ' (`person_id`,`degree_id`,`area`,`institution`,`program`,`title`,`start`,`estimate_end`,`end`)' +
                   ' VALUES (?,?,?,?,?,?,?,?,?);';
    var places = [personID,
                  newDegrees[i].degree_type_id,
                  newDegrees[i].degree_area,
                  newDegrees[i].degree_institution,
                  newDegrees[i].degree_program,
                  newDegrees[i].degree_title,
                  newDegrees[i].degree_start,
                  newDegrees[i].degree_estimate_end,
                  newDegrees[i].degree_end];
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
                var degID = resQuery.insertId;
                return queryAddOngoingSupervisorPerson(req,res,next, userCity, otherSQL, otherPlaces, personID,
                                                newDegrees, degID, i);
            }
        );
    });
};

var queryAddOngoingSupervisorPerson = function (req,res, next, userCity, otherSQL, otherPlaces, personID,
                                     newDegrees, degID, i) {
    var query = '';
    var places = [];
    for (var indSup in newDegrees[i].supervisors) {
        query = query + 'INSERT INTO `degrees_supervisors`' +
                          ' (`degree_person_id`,`supervisor_type_id`,`supervisor_id`,`valid_from`,`valid_until`)' +
                          ' VALUES (?,?,?,?,?);';
        places.push(degID,
                  newDegrees[i].supervisors[indSup].supervisor_type_id,
                  newDegrees[i].supervisors[indSup].supervisor_id,
                  momentToDate(newDegrees[i].supervisors[indSup].valid_from),
                  momentToDate(newDegrees[i].supervisors[indSup].valid_until));
    }
    for (var indSup in newDegrees[i].external_supervisors) {
        query = query + 'INSERT INTO `degrees_external_supervisors`' +
                              ' (`degree_person_id`,`supervisor_type_id`,`colloquial_name`,`organization`,`valid_from`,`valid_until`)' +
                              ' VALUES (?,?,?,?,?,?);';
        places.push(degID,
                    newDegrees[i].external_supervisors[indSup].supervisor_type_id,
                    newDegrees[i].external_supervisors[indSup].supervisor_name,
                    newDegrees[i].external_supervisors[indSup].supervisor_organization,
                    momentToDate(newDegrees[i].external_supervisors[indSup].valid_from),
                    momentToDate(newDegrees[i].external_supervisors[indSup].valid_until));
    }
    if (places.length > 0) {
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
                    if (i + 1 < newDegrees.length) {
                        return queryAddOngoingDegreePerson(req,res,next, userCity, otherSQL, otherPlaces, personID,
                                                    newDegrees, i+1);
                    } else {
                        return queryAddOngoingDegreeFinalInfo(req, res, next, otherSQL, otherPlaces);
                    }
                }
            );
        });
    } else {
        if (i + 1 < newDegrees.length) {
            return queryAddOngoingDegreePerson(req,res,next, userCity, otherSQL, otherPlaces, personID,
                                        newDegrees, i+1);
        } else {
            return queryAddOngoingDegreeFinalInfo(req, res, next, otherSQL, otherPlaces);
        }
    }
};

var queryAddOngoingDegreeFinalInfo = function (req,res, next, otherSQL, otherPlaces) {
    if (otherPlaces.length > 0) {
        escapedQuery(otherSQL, otherPlaces, req, res, next);
    } else {
        sendJSONResponse(res, 200, {"status": "success", "statusCode": 200});
        return;
    }
};

var queryResearcherInfoPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var researcher_id = req.body.researcher_id;
        var association_key = req.body.association_key;
        var researcherID = req.body.researcherID;
        var scopusID = req.body.scopusID;
        var ORCID = req.body.ORCID;
        var pluriannual = req.body.pluriannual;
        var integrated = req.body.integrated;
        var nuclearCV = req.body.nuclearCV;
        var places = [];
        var querySQL = '';
        if (researcher_id !== null) {
            querySQL = querySQL + 'UPDATE `researchers`' +
                       ' SET `researcherID` = ?,' +
                       ' `ORCID` = ?,' +
                       ' `scopusID` = ?,' +
                       ' `association_key` = ?,' +
                       ' `pluriannual` = ?,' +
                       ' `integrated` = ?,' +
                       ' `nuclearCV` = ?' +
                       ' WHERE `id` = ?';
            querySQL = querySQL + '; ';
            places.push(researcherID, ORCID,scopusID,association_key,
                        pluriannual, integrated, nuclearCV,
                        researcher_id);
        } else {
            querySQL = querySQL + 'INSERT INTO `researchers`' +
                       ' (`person_id`,`researcherID`,`ORCID`,`scopusID`,`association_key`,`pluriannual`,`integrated`,`nuclearCV`)' +
                       ' VALUES (?,?,?,?,?,?,?,?)';
            querySQL = querySQL + '; ';
            places.push(personID,researcherID,ORCID,scopusID,association_key,pluriannual,integrated, nuclearCV);
        }
        // insert role in case it doesn't exist already
        querySQL = querySQL + 'INSERT INTO `people_roles`' +
                              ' (`person_id`,`role_id`)' +
                              ' SELECT ?,? FROM DUAL' +
                                ' WHERE NOT EXISTS (' +
                                  'SELECT * FROM `people_roles` WHERE person_id = ? AND role_id = ?);';
        places.push(personID,1,personID,1);

        escapedQuery(querySQL, places, req, res, next);
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryGetUsername = function (req,res,next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var query = 'SELECT people.*, users.username ' +
                       ' FROM people' +
                       ' LEFT JOIN users ON people.user_id = users.id' +
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
                    // there's only 1 username per person
                    var row = rowsQuery[0];
                    return queryGetCountries(req,res,next, personID, row);
                }
            );
        });
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryGetCountries = function (req,res,next, personID, row) {
    var query = 'SELECT people_countries.id AS people_countries_id,' +
                    ' countries.id AS country_id, countries.name AS country' +
                ' FROM people' +
                ' LEFT JOIN people_countries ON people.id = people_countries.person_id' +
                ' LEFT JOIN countries ON people_countries.country_id = countries.id' +
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
                row = joinResponses(row,rowsQuery,'nationalities');
                return queryGetPersonalAddress(req,res,next, personID, row);
            }
        );
    });
};

var queryGetPersonalAddress = function (req,res,next, personID, row) {
    var query = 'SELECT personal_addresses.id AS personal_address_id,' +
                    ' personal_addresses.address, personal_addresses.postal_code, personal_addresses.city ' +
                ' FROM people' +
                ' LEFT JOIN personal_addresses ON people.id = personal_addresses.person_id' +
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
                return queryGetEmergencyContacts(req,res,next, personID, row);
            }
        );
    });
};

var queryGetEmergencyContacts = function (req,res,next, personID, row) {
    var query = 'SELECT emergency_contacts.id AS emergency_id, emergency_contacts.name AS emergency_name,' +
                    ' emergency_contacts.phone AS emergency_phone ' +
                ' FROM people' +
                ' LEFT JOIN emergency_contacts ON people.id = emergency_contacts.person_id' +
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
                row = joinResponses(row,rowsQuery,'emergency_contacts');
                return queryGetPersonalEmails(req,res,next, personID, row);
            }
        );
    });
};

var queryGetPersonalEmails = function (req,res,next, personID, row) {
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
                row = joinResponses(row,rowsQuery,'pers_email');
                return queryGetPersonalPhones(req,res,next, personID, row);
            }
        );
    });
};

var queryGetPersonalPhones = function (req,res,next, personID, row) {
    var query = 'SELECT personal_phones.id AS personal_phone_id, personal_phones.phone AS personal_phone' +
                ' FROM people' +
                ' LEFT JOIN personal_phones ON people.id = personal_phones.person_id' +
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
                row = joinResponses(row,rowsQuery,'pers_phone');
                return queryGetPersonalURLs(req,res,next, personID, row);
            }
        );
    });
};

var queryGetPersonalURLs = function (req,res,next, personID, row) {
    var query = 'SELECT personal_urls.id AS personal_url_id, personal_urls.url AS personal_url' +
                ' FROM people' +
                ' LEFT JOIN personal_urls ON people.id = personal_urls.person_id' +
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
                row = joinResponses(row,rowsQuery,'pers_url');
                return queryGetPersonalPhotos(req,res,next, personID, row);
            }
        );
    });
};

var queryGetPersonalPhotos = function (req,res,next, personID, row) {
    var query = 'SELECT personal_photo.id AS personal_photo_id,' +
                ' personal_photo.photo_type_id,' +
                ' personal_photo_type.name_en AS photo_type_name_en,' +
                ' personal_photo.url AS image_path' +
                ' FROM people' +
                ' LEFT JOIN personal_photo ON people.id = personal_photo.person_id' +
                ' LEFT JOIN personal_photo_type ON personal_photo.photo_type_id = personal_photo_type.id' +
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
                row = joinResponses(row,rowsQuery,'pers_photo');
                return queryGetIdentifications(req,res,next, personID, row);
            }
        );
    });
};

var queryGetIdentifications = function (req,res,next, personID, row) {
    var query = 'SELECT identifications.id AS card_id, identifications.card_number,' +
                ' identifications.card_type_id, card_types.name_en AS card_type,' +
                ' identifications.valid_until AS card_valid_until, identifications.image_url AS card_image_path' +
                ' FROM people' +
                ' LEFT JOIN identifications ON people.id = identifications.person_id' +
                ' LEFT JOIN card_types ON identifications.card_type_id = card_types.id' +
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
                row = joinResponses(row,rowsQuery,'identifications');
                return queryGetWorkEmails(req,res,next, personID, row);
            }
        );
    });
};

var queryGetWorkEmails = function (req,res,next, personID, row) {
    var query = 'SELECT emails.id AS email_id, emails.email ' +
                ' FROM people' +
                ' LEFT JOIN emails ON people.id = emails.person_id' +
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
                row = joinResponses(row,rowsQuery,'work_email');
                return queryGetWorkPhones(req,res,next, personID, row);
            }
        );
    });
};

var queryGetWorkPhones = function (req,res,next, personID, row) {
    var query = 'SELECT phones.id AS phone_id, phones.phone, phones.extension' +
                ' FROM people' +
                ' LEFT JOIN phones ON people.id = phones.person_id' +
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
                row = joinResponses(row,rowsQuery,'work_phone');
                return queryGetDegrees(req,res,next, personID, row);
            }
        );
    });
};

var queryGetDegrees = function (req,res,next, personID, row) {
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
                row = joinResponses(row,rowsQuery,'degrees');
                return queryGetDegreesSupervisors(req,res,next, personID, row, rowsQuery,0);
            }
        );
    });
};

var queryGetDegreesSupervisors = function (req,res,next, personID, row, rowsDegrees,i) {
    var query = 'SELECT degrees_supervisors.id AS degrees_supervisors_id, ' +
                ' degrees_supervisors.supervisor_type_id, supervisor_types.name_en AS supervisor_type_name_en,' +
                ' degrees_supervisors.supervisor_id AS supervisor_id, supervisors.colloquial_name AS supervisor_name,' +
                ' degrees_supervisors.valid_from, degrees_supervisors.valid_until' +
                ' FROM degrees_people' +
                ' LEFT JOIN degrees_supervisors ON degrees_people.id = degrees_supervisors.degree_person_id' +
                ' LEFT JOIN supervisor_types ON degrees_supervisors.supervisor_type_id = supervisor_types.id' +
                ' LEFT JOIN people AS supervisors ON degrees_supervisors.supervisor_id = supervisors.id' +
                ' WHERE degrees_people.id = ?';
    var places = [rowsDegrees[i].degrees_people_id];
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
                row = joinResponses(row,rowsDegrees,'degrees', i, rowsQuery, 'supervisors');
                if (i + 1 < rowsDegrees.length) {
                    return queryGetDegreesSupervisors(req,res,next, personID, row, rowsDegrees, i+1);
                } else {
                    return queryGetDegreesExternalSupervisors(req,res,next, personID, row, rowsDegrees, 0);
                }
            }
        );
    });
};

var queryGetDegreesExternalSupervisors = function (req,res,next, personID, row, rowsDegrees,i) {
    var query = 'SELECT degrees_external_supervisors.id AS degrees_ext_supervisors_id, ' +
                ' degrees_external_supervisors.supervisor_type_id, supervisor_types.name_en AS supervisor_type_name_en,' +
                ' degrees_external_supervisors.colloquial_name AS supervisor_name,' +
                ' degrees_external_supervisors.organization AS supervisor_organization,' +
                ' degrees_external_supervisors.valid_from, degrees_external_supervisors.valid_until' +
                ' FROM degrees_people' +
                ' LEFT JOIN degrees_external_supervisors ON degrees_people.id = degrees_external_supervisors.degree_person_id' +
                ' LEFT JOIN supervisor_types ON degrees_external_supervisors.supervisor_type_id = supervisor_types.id' +
                ' WHERE degrees_people.id = ?';
    var places = [rowsDegrees[i].degrees_people_id];
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
                row = joinResponses(row,rowsDegrees,'degrees', i, rowsQuery, 'external_supervisors');
                if (i + 1 < rowsDegrees.length) {
                    return queryGetDegreesExternalSupervisors(req,res,next, personID, row, rowsDegrees, i+1);
                } else {
                    return queryGetResponsibles(req,res,next, personID, row);
                }
            }
        );
    });
};

var queryGetResponsibles = function (req,res,next, personID, row) {
    var query = 'SELECT people_responsibles.id AS people_responsibles_id,' +
                ' people_responsibles.responsible_id, responsibles.colloquial_name,' +
                ' people_responsibles.responsible_type_id,' +
                ' responsible_types.name_en AS type_name_en,' +
                ' people_responsibles.valid_from, people_responsibles.valid_until' +
                ' FROM people' +
                ' LEFT JOIN people_responsibles ON people.id = people_responsibles.person_id' +
                ' LEFT JOIN people AS responsibles ON people_responsibles.responsible_id = responsibles.id' +
                ' LEFT JOIN responsible_types ON people_responsibles.responsible_type_id = responsible_types.id' +
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
                row = joinResponses(row,rowsQuery,'responsibles');
                return queryGetDepartments(req,res,next, personID, row);
            }
        );
    });
};

var queryGetDepartments = function (req,res,next, personID, row) {
    var query = 'SELECT people_departments.id AS people_departments_id,' +
                ' people_departments.department_id AS department_id, departments.name_en AS department,' +
                ' people_departments.valid_from AS department_start, people_departments.valid_until AS department_end' +
                ' FROM people' +
                ' LEFT JOIN people_departments ON people.id = people_departments.person_id' +
                ' LEFT JOIN departments ON people_departments.department_id = departments.id' +
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
                row = joinResponses(row,rowsQuery,'department_data');
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
                return queryGetJobs(req,res,next, personID, row);
            }
        );
    });
};

var queryGetJobs = function (req,res,next, personID, row) {
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
                ' LEFT JOIN fellowships_management_entities ON fellowships.id = fellowships_management_entities.fellowship_id' +
                ' LEFT JOIN management_entities ON fellowships_management_entities.management_entity_id = management_entities.id' +
                ' LEFT JOIN fellowships_funding_agencies ON fellowships.id = fellowships_funding_agencies.fellowship_id' +
                ' LEFT JOIN funding_agencies ON fellowships_funding_agencies.funding_agency_id = funding_agencies.id' +
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
                row = joinResponses(row,rowsQuery, 'job_data');
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
                return queryGetAuthorNames(req,res,next, personID, row);
            }
        );
    });
};

var queryGetAuthorNames = function (req,res,next, personID, row) {
    var query = 'SELECT author_names.id AS author_name_id, author_names.name AS author_name,' +
                ' author_names.valid_from AS aut_valid_from,author_names.valid_until AS aut_valid_until' +
                ' FROM people' +
                ' LEFT JOIN author_names ON people.id = author_names.person_id' +
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
                row = joinResponses(row,rowsQuery, 'author_data');
                return queryGetSpaces(req,res,next, personID, row);
            }
        );
    });
};

var queryGetSpaces = function (req,res,next, personID, row) {
    var query = 'SELECT users_spaces.id AS users_spaces_id,' +
                ' spaces.id AS space_id, spaces.reference AS space_reference, spaces.name_en AS space_name_en,' +
                ' users_spaces.role_id, space_roles.name_en AS space_role_en,' +
                ' spaces.space_type_id, space_types.name_en AS space_type_en, ' +
                ' users_spaces.valid_from AS usrspace_valid_from, users_spaces.valid_until AS usrspace_valid_until' +
                ' FROM people' +
                ' LEFT JOIN users_spaces ON people.id = users_spaces.person_id' +
                ' LEFT JOIN spaces ON users_spaces.space_id = spaces.id' +
                ' LEFT JOIN space_roles ON users_spaces.role_id = space_roles.id' +
                ' LEFT JOIN space_types ON spaces.space_type_id = space_types.id' +
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
                row = joinResponses(row,rowsQuery, 'spaces_data');
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": 1,
                     "result" : row});
            }
        );
    });
};

var queryTechnicianInfoPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var id = req.body.id;
        var association_key = req.body.association_key;
        var researcherID = req.body.researcherID;
        var ORCID = req.body.ORCID;
        var places = [];
        var querySQL = '';
        if (id !== null && id !== 'new') {
            querySQL = querySQL + 'UPDATE `technicians_info`' +
                       ' SET `researcherID` = ?,' +
                       ' `ORCID` = ?,' +
                       ' `association_key` = ?' +
                       ' WHERE `id` = ?';
            querySQL = querySQL + '; ';
            places.push(researcherID, ORCID,association_key,
                        id);
        } else {
            querySQL = querySQL + 'INSERT INTO `technicians_info`' +
                       ' (`person_id`,`researcherID`,`ORCID`,`association_key`)' +
                       ' VALUES (?,?,?,?)';
            querySQL = querySQL + '; ';
            places.push(personID,researcherID,ORCID,association_key);
        }
        // insert role in case it doesn't exist already
        querySQL = querySQL + 'INSERT INTO `people_roles`' +
                              ' (`person_id`,`role_id`)' +
                              ' SELECT ?,? FROM DUAL' +
                                ' WHERE NOT EXISTS (' +
                                  'SELECT * FROM `people_roles` WHERE person_id = ? AND role_id = ?);';
        places.push(personID,2,personID,2);

        escapedQuery(querySQL, places, req, res, next);
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryScienceManagerInfoPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var id = req.body.id;
        var association_key = req.body.association_key;
        var researcherID = req.body.researcherID;
        var ORCID = req.body.ORCID;
        var places = [];
        var querySQL = '';
        if (id !== null) {
            querySQL = querySQL + 'UPDATE `science_managers_info`' +
                       ' SET `researcherID` = ?,' +
                       ' `ORCID` = ?,' +
                       ' `association_key` = ?' +
                       ' WHERE `id` = ?';
            querySQL = querySQL + '; ';
            places.push(researcherID, ORCID,association_key,
                        id);
        } else {
            querySQL = querySQL + 'INSERT INTO `science_managers_info`' +
                       ' (`person_id`,`researcherID`,`ORCID`,`association_key`)' +
                       ' VALUES (?,?,?,?)';
            querySQL = querySQL + '; ';
            places.push(personID,researcherID,ORCID,association_key);
        }
        // insert role in case it doesn't exist already
        querySQL = querySQL + 'INSERT INTO `people_roles`' +
                              ' (`person_id`,`role_id`)' +
                              ' SELECT ?,? FROM DUAL' +
                                ' WHERE NOT EXISTS (' +
                                  'SELECT * FROM `people_roles` WHERE person_id = ? AND role_id = ?);';
        places.push(personID,3,personID,3);

        escapedQuery(querySQL, places, req, res, next);
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryAdministrativeInfoPerson = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var id = req.body.id;
        var association_key = req.body.association_key;
        var places = [];
        var querySQL = '';
        if (id !== null) {
            querySQL = querySQL + 'UPDATE `administrative_info`' +
                       ' SET `association_key` = ?' +
                       ' WHERE `id` = ?';
            querySQL = querySQL + '; ';
            places.push(association_key,id);
        } else {
            querySQL = querySQL + 'INSERT INTO `administrative_info`' +
                       ' (`person_id`,`association_key`)' +
                       ' VALUES (?,?)';
            querySQL = querySQL + '; ';
            places.push(personID, association_key);
        }
        // insert role in case it doesn't exist already
        querySQL = querySQL + 'INSERT INTO `people_roles`' +
                              ' (`person_id`,`role_id`)' +
                              ' SELECT ?,? FROM DUAL' +
                                ' WHERE NOT EXISTS (' +
                                  'SELECT * FROM `people_roles` WHERE person_id = ? AND role_id = ?);';
        places.push(personID,4,personID,4);

        escapedQuery(querySQL, places, req, res, next);
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
    }
};

var queryPersonLeft = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {
        var personID = req.params.personID;
        var active_until = momentToDate(req.body.active_until);
        var changed_by = req.body.changed_by;
        var updated =  momentToDate(moment(),undefined,'YYYY-MM-DD HH:mm:ss');
        var created = updated;
        var places = [];
        var querySQL = '';
        // updates people table even if valid_from is null
        querySQL = querySQL + 'UPDATE `people`' +
                       ' SET `active_until` = ?' +
                       ' WHERE `id` = ?';
        querySQL = querySQL + '; ';
        places.push(momentToDate(active_until), personID);
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
                    return queryPeopleGetRow(req, res, next, userCity, updated, created, changed_by, 'active_until');
                }
            );
        });
    } else {
        sendJSONResponse(res, 403, { message: 'This user is not authorized to this operation.' });
        return;
    }
};

var queryUpdatePhoto = function (req, res, next, userCity) {
    var hasPermission = getGeoPermissions(req, userCity);
    if ((req.payload.personID !== req.params.personID && hasPermission)
            || req.payload.personID === req.params.personID) {

        var upload = multer({
            storage: storage,
        }).single('file');
        upload(req,res,function(err){
            if(err){
                 sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
                 return;
            }
            return queryUpdatePhotoDatabaseGetPrevious(req, res, next, req.file);
        })
    }
};

var queryUpdatePhotoDatabaseGetPrevious = function (req, res, next, file) {
    var personID = req.params.personID;
    var query = 'SELECT *' +
                ' FROM personal_photo' +
                ' WHERE person_id = ? AND photo_type_id = ?;';
    var places = [personID, 1];
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
                var action;
                if (rowsQuery.length > 0) {
                    action = 'update';
                } else {
                    action = 'insert';
                }
                return queryUpdatePhotoDatabaseFinal(req, res, next, file, action);
            }
        );
    });
};

var queryUpdatePhotoDatabaseFinal = function (req, res, next, file, action) {
    var personID = req.params.personID;
    var filePath = process.env.PATH_PREFIX + '/' + file.path.replace('public/','');
    var query;
    var places;
    if (action === 'update') {
        query = 'UPDATE personal_photo' +
                ' SET photo_type_id = ?,' +
                ' url = ?' +
                ' WHERE person_id = ?;';
        places = [1, filePath, personID];
    } else {
        query = 'INSERT INTO personal_photo' +
                ' (person_id,photo_type_id,url)' +
                ' VALUES (?,?,?);';
        places = [personID, 1, filePath];
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
                    {"status": "success", "statusCode": 200, "count": 1,
                     "result" : "OK!"});
            }
        );
    });
};

/***************************** Public API Queries *****************************/
module.exports.searchPeople = function (req, res, next) {
    var now = momentToDate(moment());
    var name;
    var lab;
    if (req.query.hasOwnProperty('name')) {
        name = req.query.name.replace(' ','%');
    } else {
        name = '';
    }
    if (req.query.hasOwnProperty('lab')) {
        lab = req.query.lab.replace(' ','%');
    } else {
        lab = '';
    }
    name = '%' + name + '%';
    lab =  '%' + lab + '%';
    var querySQL = 'SELECT people.id, people.name, people.colloquial_name,' +
                   ' emails.email, phones.phone, phones.extension AS phone_extension,' +
                   ' labs.id AS lab_id, labs.name AS lab_name,' +
                   ' groups.id AS group_id, groups.name AS group_name,' +
                   ' units.id AS unit_id, units.name AS unit_name,' +
                   ' lab_positions.id AS lab_position_id, lab_positions.name_en AS lab_position_name_en, lab_positions.name_pt  AS lab_position_name_pt,' +

                  ' personal_photo.photo_type_id AS image_type, personal_photo.url AS image_name' +
                  ' FROM people' +
                  ' LEFT JOIN emails ON people.id = emails.person_id' +
                  ' LEFT JOIN phones ON people.id = phones.person_id' +
                  ' LEFT JOIN people_labs ON people.id = people_labs.person_id' +
                  ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                  ' LEFT JOIN groups ON groups.id = labs.group_id' +
                  ' LEFT JOIN units ON units.id = groups.unit_id' +
                  ' LEFT JOIN lab_positions ON lab_positions.id = people_labs.lab_position_id' +
                  ' LEFT JOIN personal_photo ON people.id = personal_photo.person_id' +
                  ' WHERE people.name LIKE ?' +
                    ' AND (labs.name LIKE ? OR labs.name IS NULL)' +
                    ' AND (people.active_until > ? OR (people.active_from < ? AND people.active_until IS NULL))' +
                  ';';
    var places = [name,lab,now,now];
    var mergeRules = [
                      ['lab_data', 'lab_position_id','lab_position_name_en','lab_position_name_pt',
                       'lab_id','lab_name','group_id','group_name','unit_id', 'unit_name']
                    ];

    escapedQueryPersonSearch(querySQL, places, mergeRules, req, res, next);
};
module.exports.getLabMembers = function (req, res, next) {
    var now = momentToDate(moment());
    var lab;
    if (req.query.hasOwnProperty('lab')) {
        lab = req.query.lab.replace(' ','%');
    } else {
        lab = '';
    }

    // TODO: filter by start/end dates from affiliations

    var querySQL = 'SELECT people.id, people.name, people.colloquial_name,' +
                   ' emails.email, phones.phone, phones.extension AS phone_extension,' +
                   ' labs.id AS lab_id, labs.name AS lab_name,' +
                   ' groups.id AS group_id, groups.name AS group_name,' +
                   ' units.id AS unit_id, units.name AS unit_name,' +
                   ' lab_positions.id AS lab_position_id, lab_positions.name_en AS lab_position_name_en, lab_positions.name_pt  AS lab_position_name_pt,' +

                  ' personal_photo.photo_type_id AS image_type, personal_photo.url AS image_name' +
                  ' FROM people' +
                  ' LEFT JOIN emails ON people.id = emails.person_id' +
                  ' LEFT JOIN phones ON people.id = phones.person_id' +
                  ' LEFT JOIN people_labs ON people.id = people_labs.person_id' +
                  ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                  ' LEFT JOIN groups ON groups.id = labs.group_id' +
                  ' LEFT JOIN units ON units.id = groups.unit_id' +
                  ' LEFT JOIN lab_positions ON lab_positions.id = people_labs.lab_position_id' +
                  ' LEFT JOIN personal_photo ON people.id = personal_photo.person_id' +
                  ' WHERE labs.id = ?' +
                    ' AND (people.active_until > ? OR (people.active_from < ? AND people.active_until IS NULL))' +
                  ';';
    var places = [lab,now,now];
    var mergeRules = [
                      ['lab_data', 'lab_position_id','lab_position_name_en','lab_position_name_pt',
                       'lab_id','lab_name','group_id','group_name','unit_id', 'unit_name']
                    ];

    escapedQueryPersonSearch(querySQL, places, mergeRules, req, res, next);
};
module.exports.listOf = function (req, res, next) {
    var listOf = req.params.listOf;
    var querySQL = '';
    if (listOf === 'countries') {
        querySQL = 'SELECT countries.id AS country_id, countries.name FROM countries';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'card-types') {
        querySQL = 'SELECT card_types.id AS card_type_id, card_types.name_en FROM card_types;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'permissions') {
        querySQL = 'SELECT permissions.id AS permissions_id, permissions.name_en, permissions.description_en FROM permissions' +
                    ' WHERE id != 0 AND id != 1000;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'degree-types') {
        querySQL = 'SELECT degrees.id AS degree_type_id, degrees.name_en FROM degrees;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'institution-cities') {
        querySQL = 'SELECT * FROM institution_city;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'professional-situations') {
        querySQL = 'SELECT * FROM situations ORDER BY `name_en`;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'professional-categories') {
        querySQL = 'SELECT * FROM categories ORDER BY name_en;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'fellowship-types') {
        querySQL = 'SELECT * FROM fellowship_types;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'management-entities') {
        querySQL = 'SELECT * FROM management_entities;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'funding-agencies') {
        querySQL = 'SELECT * FROM funding_agencies;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'universities') {
        querySQL = 'SELECT * FROM universities;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'schools') {
        querySQL = 'SELECT * FROM schools;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'departments') {
        querySQL = 'SELECT departments.id AS department_id, departments.name_en AS department_name_en, ' +
                   'schools.id AS school_id, schools.name_en AS school_name_en, ' +
                   'schools.shortname_en AS school_shortname_en, ' +
                   'universities.id AS university_id, universities.name_en AS university_name_en, ' +
                   'universities.shortname_en AS university_shortname_en' +
                   ' FROM departments' +
                   ' LEFT JOIN schools ON departments.school_id = schools.id' +
                   ' LEFT JOIN universities ON schools.university_id = universities.id;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'units') {
        querySQL = 'SELECT * FROM units;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'groups') {
        querySQL = 'SELECT groups.id AS group_id, groups.name, groups.started, groups.finished, groups.unit_id FROM groups;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'labs') {
        querySQL = 'SELECT labs.id AS lab_id, labs.name AS lab, labs.group_id, groups.name AS group_name, labs.name, labs.started, labs.finished, groups.unit_id, units.name AS unit' +
                   ' FROM labs' +
                   ' LEFT JOIN groups ON labs.group_id = groups.id' +
                   ' LEFT JOIN units ON groups.unit_id = units.id;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'administrative-offices') {
        querySQL = 'SELECT * FROM administrative_offices;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'administrative-positions') {
        querySQL = 'SELECT * FROM administrative_positions;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'science-management-offices') {
        querySQL = 'SELECT * FROM science_manager_offices;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'science-management-positions') {
        querySQL = 'SELECT * FROM science_manager_positions;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'facilities') {
        querySQL = 'SELECT * FROM technician_offices;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'technician-positions') {
        querySQL = 'SELECT * FROM technician_positions;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'lab-positions') {
        querySQL = 'SELECT lab_positions.id AS lab_position_id, lab_positions.name_en' +
                   ' FROM lab_positions;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'group-positions') {
        querySQL = 'SELECT groups_positions.id AS group_position_id, groups_positions.name_en' +
                   ' FROM groups_positions;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'supervisor-types') {
        querySQL = 'SELECT * FROM supervisor_types;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'roles') {
        querySQL = 'SELECT roles.id AS role_id, roles.name_en, roles.name_pt' +
                   ' FROM roles;';
        getQueryResponse(querySQL, req, res, next);
    } else if (listOf === 'usernames') {
        querySQL = 'SELECT username FROM users;';
        getQueryResponse(querySQL, req, res, next);
    } else {
        var errorNum = 404;
        sendJSONResponse(res, errorNum, {"status": "error", "statusCode": errorNum, "error" : "Does not exist!"});
    }
};

/******************** Call SQL Generators after Validations *******************/
module.exports.listActivePeople = function (req, res, next) {
    var now = moment.tz(moment(),'Europe/Lisbon').format('YYYY-MM-DD');
    var querySQL = 'SELECT colloquial_name' +
                   'FROM people WHERE (active_until > ' + now +
                   ' OR (active_until IS NULL AND active_from < ' + now + ')' +
                   ' OR (active_until IS NULL AND active_from IS NULL)' +
                   ')' ;
    getQueryResponse(querySQL, req, res, next);
};

module.exports.listAllPeople = function (req, res, next) {
    var querySQL = 'SELECT id, name, colloquial_name FROM people' +
                   ' WHERE status = 1' +
                   ' ORDER BY colloquial_name;';
    getQueryResponse(querySQL, req, res, next);
};

module.exports.updateIdentificationsInfoPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            getLocation(req, res, next, queryIdentificationsInfoPerson);
        }
    );
};

module.exports.updateEmergencyContactsPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            getLocation(req, res, next, queryEmergencyContactsPerson);
        }
    );
};

module.exports.updateFinishedDegreesPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, queryFinishedDegreesPerson);
        }
    );
};

module.exports.updateContactInfoPerson = function (req, res, next) {
    // TODO: prepare to hold more personal phones...
    getUserPermitSelf(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            getLocation(req, res, next, queryContactInfoPerson);
        }
    );
};

module.exports.updateNuclearInfoPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            getLocation(req, res, next, queryNuclearInfoPerson);
        }
    );
};

module.exports.updateInstitutionCityPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            getLocation(req, res, next, queryInstitutionCityPerson);
        }
    );
};

module.exports.updateInstitutionalContactsPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            getLocation(req, res, next, queryInstitutionalContactsPerson);
        }
    );
};

module.exports.updateOngoingDegreesPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, queryOngoingDegreesPerson);
        }
    );
};

module.exports.updateResearcherInfoPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next,queryResearcherInfoPerson);
        }
    );
};

module.exports.updateTechnicianInfoPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, queryTechnicianInfoPerson);
        }
    );
};

module.exports.updateScienceManagerInfoPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, queryScienceManagerInfoPerson);
        }
    );
};

module.exports.updateAdministrativeInfoPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, queryAdministrativeInfoPerson);
        }
    );
};

module.exports.updateAffiliationsDepartmentPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            getLocation(req, res, next, queryAffiliationsDepartmentPerson);
        }
    );
};

module.exports.updateAffiliationsLabPerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, queryAffiliationsLabPerson);
        }
    );
};

module.exports.updateTechnicianAffiliationsPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, queryTechnicianAffiliationsPerson);
        }
    );
};

module.exports.updateScienceManagerAffiliationsPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, queryScienceManagerAffiliationsPerson);
        }
    );
};

module.exports.updateAdministrativeAffiliationsPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, queryAdministrativeAffiliationsPerson);
        }
    );
};

module.exports.updatePersonLeft = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 20, 30],
        function (req, res, username) {
            getLocation(req, res, next, queryPersonLeft);
        }
    );
};

module.exports.updateJobsPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            getLocationJobs(req, res, next);
        }
    );
};

module.exports.updatePhoto = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            getLocation(req, res, next, queryUpdatePhoto);
        }
    );
};

module.exports.updateResponsiblesPerson = function (req, res, next) {
    getUserPermitSelf(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            getLocation(req, res, next, queryResponsibles);
        }
    );
};

module.exports.deleteRolePerson = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15],
        function (req, res, username) {
            getLocation(req, res, next, queryDeleteRolePerson);
        }
    );
};

module.exports.listPersonData = function (req, res, next) {
    getUser(req, res, [0, 5, 10, 15, 20, 30, 40],
        function (req, res, username) {
            getLocation(req, res, next, queryGetUsername);
        }
    );
};