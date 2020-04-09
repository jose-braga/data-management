var server = require('../models/server');
var moment = require('moment-timezone');
var userModule = require('../models/users');

var pool = server.pool;

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
var escapedQueryPersonSearch = function(querySQL, place, rules, req, res, next, type) {
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
            if (type === undefined) {
                rows = filterLabTimes(rows);
            }
            var uniquePersons = uniqueIDs(rows,'id');
            var rowsProcessed = compactData(rows,uniquePersons, rules);
            sendJSONResponse(res, 200,
                {"status": "success", "statusCode": 200, "count": rowsProcessed.length,
                 "result" : rowsProcessed});
        });
    });
};
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
        var overlap = timeOverlap(rows[ind].lab_start,rows[ind].lab_end,
            rows[ind].labs_groups_valid_from,rows[ind].labs_groups_valid_until);
        if (overlap) {
            // TODO: momentToDate???
            rows[ind].lab_start = overlap[0];
            rows[ind].lab_end = overlap[1];
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
        compact.push(mergedRow);
    }
    return compact;
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
function momentToDate(timedate, timezone, timeformat) {
    if (timezone === undefined) {
        timezone = 'Europe/Lisbon';
    }
    if (timeformat === undefined) {
        timeformat = 'YYYY-MM-DD';
    }
    return timedate !== null ? moment.tz(timedate,timezone).format(timeformat) : null;
}
function joinLabs(rows) {
    var indToExclude = [];
    var newRows = [];
    for (var ind in rows) {
        ind = parseInt(ind,10);
        if (indToExclude.indexOf(ind) === -1) {
            var labObj = {
                lab_id: rows[ind].lab_id,
                lab: rows[ind].lab,
                lab_short_name: rows[ind].lab_short_name,
                lab_opened: rows[ind].lab_opened,
                lab_closed: rows[ind].lab_closed,
                lab_history: [{
                    group_id: rows[ind].group_id,
                    group_name: rows[ind].group_name,
                    group_short_name: rows[ind].group_short_name,
                    labs_groups_valid_from: rows[ind].labs_groups_valid_from,
                    labs_groups_valid_until: rows[ind].labs_groups_valid_until,
                    unit_id: rows[ind].unit_id,
                    unit: rows[ind].unit,
                    unit_full_name: rows[ind].unit_full_name
                }]
            };
            indToExclude.push(ind);
            var currID = rows[ind].lab_id;

            for (var ind2 in rows) {
                ind2 = parseInt(ind2,10);
                if (ind2 > ind && indToExclude.indexOf(ind2) === -1) {
                    if (rows[ind2].lab_id == currID) {
                        indToExclude.push(ind2);
                        labObj.lab_history.push({
                            group_id: rows[ind2].group_id,
                            group_name: rows[ind2].group_name,
                            group_short_name: rows[ind2].group_short_name,
                            labs_groups_valid_from: rows[ind2].labs_groups_valid_from,
                            labs_groups_valid_until: rows[ind2].labs_groups_valid_until,
                            unit_id: rows[ind2].unit_id,
                            unit: rows[ind2].unit,
                            unit_full_name: rows[ind2].unit_full_name
                        });
                    }
                }
            }
            newRows.push(labObj);
        }
    }
    return newRows;
}
function processPublications(resQuery, type) {
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


            var group = [];
            if (resQuery[indRow].lab_id !== null && resQuery[indRow].lab_public === 1) {
                found = false;
                for (var egroup in group) {
                    if (group[egroup].group_id == resQuery[indRow].group_id
                            && group[egroup].unit_id == resQuery[indRow].unit_id) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    group.push({
                        group_id: resQuery[indRow].group_id,
                        unit_id: resQuery[indRow].unit_id
                    });
                }
            }




            var unit = [];
            if (resQuery[indRow].unit_pub_unit_id !== null
                    && resQuery[indRow].unit_public === 1
                    && unit.indexOf(resQuery[indRow].unit_pub_unit_id) === -1) {
                unit.push(resQuery[indRow].unit_pub_unit_id);
            }
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
            if (type !== 'single-person') {
                resQuery[indRow].person_selected = person_selected;
                resQuery[indRow].lab_selected = lab_selected;
                resQuery[indRow].person_id = person;
            }
            resQuery[indRow].lab_id = lab;
            resQuery[indRow].group_id = group;
            resQuery[indRow].unit_id = unit;
            publications.push(resQuery[indRow]);
        }
    }
    return publications;
}
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


module.exports.login = function (req, res, next) {
    var now = momentToDate(moment());
    var username = req.body.username;
    var password = req.body.password;
    var places = [];
    var unitID = null;
    if (req.query.hasOwnProperty('unit')) {
        unitID = req.query.unit;
    }
    var querySQL = 'SELECT people.id, users.id AS user_id, users.username, users.password' +
                ' FROM users' +
                ' LEFT JOIN people ON people.user_id = users.id' +
                ' LEFT JOIN people_labs ON people_labs.person_id = people.id' +
                ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                ' LEFT JOIN technicians ON technicians.person_id = people.id' +
                ' LEFT JOIN technician_offices ON technician_offices.id = technicians.technician_office_id' +
                ' LEFT JOIN technicians_units ON technicians_units.technician_id = technicians.id' +
                ' LEFT JOIN science_managers ON science_managers.person_id = people.id' +
                ' LEFT JOIN science_manager_offices ON science_manager_offices.id = science_managers.science_manager_office_id' +
                ' LEFT JOIN science_managers_units ON science_managers_units.science_manager_id = science_managers.id' +
                ' LEFT JOIN people_administrative_offices ON people_administrative_offices.person_id = people.id' +
                ' LEFT JOIN administrative_offices ON administrative_offices.id = people_administrative_offices.administrative_office_id' +
                ' LEFT JOIN people_administrative_units ON people_administrative_units.administrative_id = people_administrative_offices.id' +
                ' WHERE users.username = ?  AND people.status = 1 AND ' +
                ' (groups_units.unit_id = 2 OR technicians_units.unit_id = 2 OR ' +
                ' science_managers_units.unit_id = 2 OR people_administrative_units.unit_id = 2);';
    places = [username];
    pool.getConnection(function(err, connection) {
        if (err) {
            return done(err);
        }
        connection.query(querySQL,places,
            function (err, rows) {
                // And done with the connection.
                connection.release();
                if (err) {
                    return sendJSONResponse(res, 500,
                        {statusCode: 500, error: err}
                    );
                }
                if (rows.length < 1) {
                    return sendJSONResponse(res, 400,
                        { statusCode: 400, message: 'Incorrect credentials.' }
                    );
                }
                // if the user is found but the password is wrong
                if (!userModule.checkPassword(password, rows[0].password)) {
                    return sendJSONResponse(res, 400,
                        { statusCode: 400, message: 'Incorrect credentials.' }
                    );
                }
                // all is well, return successful user
                let response = {};
                response.person_id = rows[0].id;
                return sendJSONResponse(res, 200,
                    {
                        statusCode: 200,
                        result: response
                    }
                );
            }
        );
    });

};
module.exports.searchPeople = function (req, res, next) {
    var now = momentToDate(moment());
    var name;
    var lab;
    if (req.query.hasOwnProperty('name')) {
        name = req.query.name.replace(/\s/gi,'%');
    } else {
        name = '';
    }
    if (req.query.hasOwnProperty('lab')) {
        lab = req.query.lab.replace(/\s/gi,'%');
    } else {
        lab = '';
    }
    var unitID = null;
    if (req.query.hasOwnProperty('unit')) {
        unitID = req.query.unit;
    }
    var querySQL;
    var places;
    if (name === '' && lab === '') {
        var querySQL = 'SELECT people.id, people.name AS full_name, people.colloquial_name AS name,' +
                    ' people.active_from, people.active_until,' +
                    ' emails.email, phones.phone, phones.extension AS phone_extension,' +
                    ' website_texts.title AS website_text_title, website_texts.text AS website_text, website_texts.text_type_id AS website_text_type_id, website_text_types.name_en AS website_text_type_name_en,' +
                    ' personal_urls.url, personal_urls.url_type_id, personal_url_types.type_en AS url_type, personal_urls.description AS url_description,' +
                    ' degrees_people.start AS degree_start, degrees_people.end AS degree_end,' +
                    ' degrees_people.degree_id AS degree_type_id, degrees.name_en AS degree,' +
                    ' degrees_people.area AS degree_field, degrees_people.institution AS degree_institution,' +
                    ' research_interests.interests, research_interests.sort_order AS interests_sort_order,' +
                    ' researchers.ORCID, researchers.researcherID, researchers.ciencia_id,' +
                    ' people_labs.sort_order, people_labs.valid_from AS lab_start, people_labs.valid_until AS lab_end,' +
                    ' labs.id AS lab_id, labs.name AS lab_name,' +
                    ' labs_groups.valid_from AS labs_groups_valid_from, labs_groups.valid_until AS labs_groups_valid_until,' +
                    ' groups.id AS group_id, groups.name AS group_name,' +
                    ' units.id AS unit_id, units.name AS unit_name,' +
                    ' lab_positions.id AS lab_position_id, lab_positions.name_en AS lab_position_name_en, lab_positions.name_pt  AS lab_position_name_pt,' +
                    ' lab_positions.sort_order  AS lab_position_sort_order,' +
                    ' technicians.id AS technician_id, technicians.technician_office_id, technician_offices.name_en AS technician_office_name,' +
                    ' technicians.valid_from AS technician_start, technicians.valid_until AS technician_end,' +
                    ' technicians_units.unit_id AS technician_unit_id, technician_units.name AS technician_unit_name,' +
                    ' technicians.technician_position_id, technician_positions.name_en AS technician_position_name_en, technician_positions.name_pt AS technician_position_name_pt,' +
                    ' science_managers.id AS science_manager_id, science_managers.science_manager_office_id, science_manager_offices.name_en AS science_manager_office_name,' +
                    ' science_managers.valid_from AS science_manager_start, science_managers.valid_until AS science_manager_end,' +
                    ' science_managers_units.unit_id AS science_manager_unit_id, science_manager_units.name AS science_manager_unit_name,' +
                    ' science_managers.science_manager_position_id, science_manager_positions.name_en AS science_manager_position_name_en, science_manager_positions.name_pt AS science_manager_position_name_pt,' +
                    ' people_administrative_offices.id AS administrative_id, people_administrative_offices.administrative_office_id, administrative_offices.name_en AS administrative_office_name,' +
                    ' people_administrative_offices.valid_from AS administrative_start, people_administrative_offices.valid_until AS administrative_end,' +
                    ' people_administrative_units.unit_id AS administrative_unit_id, administrative_units.name AS administrative_unit_name,' +
                    ' people_administrative_offices.administrative_position_id, administrative_positions.name_en AS administrative_position_name_en, administrative_positions.name_pt AS administrative_position_name_pt,' +
                    ' jobs.category_id, categories.name_en AS category, jobs.organization, jobs.valid_from AS job_start, jobs.valid_until AS job_end,' +
                    ' personal_photo.photo_type_id, personal_photo_type.name_en AS photo_type_name_en, personal_photo.url AS image_path' +
                    ' FROM people' +
                    ' LEFT JOIN emails ON people.id = emails.person_id' +
                    ' LEFT JOIN phones ON people.id = phones.person_id' +
                    ' LEFT JOIN personal_urls ON people.id = personal_urls.person_id' +
                    ' LEFT JOIN personal_url_types ON personal_urls.url_type_id = personal_url_types.id' +
                    ' LEFT JOIN website_texts ON people.id = website_texts.person_id' +
                    ' LEFT JOIN website_text_types ON website_text_types.id = website_texts.text_type_id' +
                    ' LEFT JOIN degrees_people ON people.id = degrees_people.person_id' +
                    ' LEFT JOIN degrees ON degrees_people.degree_id = degrees.id' +
                    ' LEFT JOIN jobs ON people.id = jobs.person_id' +
                    ' LEFT JOIN categories ON jobs.category_id = categories.id' +
                    ' LEFT JOIN research_interests ON people.id = research_interests.person_id' +
                    ' LEFT JOIN researchers ON people.id = researchers.person_id' +
                    ' LEFT JOIN people_labs ON people.id = people_labs.person_id' +
                    ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                    ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                    ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                    ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                    ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                    ' LEFT JOIN lab_positions ON lab_positions.id = people_labs.lab_position_id' +
                    ' LEFT JOIN technicians ON technicians.person_id = people.id' +
                    ' LEFT JOIN technician_offices ON technician_offices.id = technicians.technician_office_id' +
                    ' LEFT JOIN technicians_units ON technicians_units.technician_id = technicians.id' +
                    ' LEFT JOIN units AS technician_units ON technician_units.id = technicians_units.unit_id' +
                    ' LEFT JOIN technician_positions ON technician_positions.id = technicians.technician_position_id' +
                    ' LEFT JOIN science_managers ON science_managers.person_id = people.id' +
                    ' LEFT JOIN science_manager_offices ON science_manager_offices.id = science_managers.science_manager_office_id' +
                    ' LEFT JOIN science_managers_units ON science_managers_units.science_manager_id = science_managers.id' +
                    ' LEFT JOIN units AS science_manager_units ON science_manager_units.id = science_managers_units.unit_id' +
                    ' LEFT JOIN science_manager_positions ON science_manager_positions.id = science_managers.science_manager_position_id' +
                    ' LEFT JOIN people_administrative_offices ON people_administrative_offices.person_id = people.id' +
                    ' LEFT JOIN administrative_offices ON administrative_offices.id = people_administrative_offices.administrative_office_id' +
                    ' LEFT JOIN people_administrative_units ON people_administrative_units.administrative_id = people_administrative_offices.id' +
                    ' LEFT JOIN units AS administrative_units ON administrative_units.id = people_administrative_units.unit_id' +
                    ' LEFT JOIN administrative_positions ON administrative_positions.id = people_administrative_offices.administrative_position_id' +
                    ' LEFT JOIN personal_photo ON people.id = personal_photo.person_id' +
                    ' LEFT JOIN personal_photo_type ON personal_photo_type.id = personal_photo.photo_type_id' +
                    ' WHERE people.status = ? AND people.visible_public = 1' +
                    ' AND (people.active_until > ? OR (people.active_from < ? AND people.active_until IS NULL) OR (people.active_from IS NULL AND people.active_until IS NULL))'
                    ;
        var places = [1,now,now];
    } else if (name !== '' && lab === '') {
        name = '%' + name + '%';
        querySQL = 'SELECT people.id, people.name AS full_name, people.colloquial_name AS name,' +
                       ' people.active_from, people.active_until,' +
                       ' emails.email, phones.phone, phones.extension AS phone_extension,' +
                       ' website_texts.title AS website_text_title, website_texts.text AS website_text, website_texts.text_type_id AS website_text_type_id, website_text_types.name_en AS website_text_type_name_en,' +
                    ' personal_urls.url, personal_urls.url_type_id, personal_url_types.type_en AS url_type, personal_urls.description AS url_description,' +
                    ' degrees_people.start AS degree_start, degrees_people.end AS degree_end,' +
                    ' degrees_people.degree_id AS degree_type_id, degrees.name_en AS degree,' +
                    ' degrees_people.area AS degree_field, degrees_people.institution AS degree_institution,' +
                    ' research_interests.interests, research_interests.sort_order AS interests_sort_order,' +
                    ' researchers.ORCID, researchers.researcherID, researchers.ciencia_id,' +
                       ' people_labs.valid_from AS lab_start, people_labs.valid_until AS lab_end,' +
                       ' labs.id AS lab_id, labs.name AS lab_name,' +
                       ' labs_groups.valid_from AS labs_groups_valid_from, labs_groups.valid_until AS labs_groups_valid_until,' +
                       ' groups.id AS group_id, groups.name AS group_name,' +
                       ' units.id AS unit_id, units.name AS unit_name,' +
                       ' lab_positions.id AS lab_position_id, lab_positions.name_en AS lab_position_name_en, lab_positions.name_pt  AS lab_position_name_pt,' +
                       ' lab_positions.sort_order  AS lab_position_sort_order,' +
                       ' technicians.id AS technician_id, technicians.technician_office_id, technician_offices.name_en AS technician_office_name,' +
                   ' technicians.valid_from AS technician_start, technicians.valid_until AS technician_end,' +
                   ' technicians_units.unit_id AS technician_unit_id, technician_units.name AS technician_unit_name,' +
                   ' technicians.technician_position_id, technician_positions.name_en AS technician_position_name_en, technician_positions.name_pt AS technician_position_name_pt,' +
                   ' science_managers.id AS science_manager_id, science_managers.science_manager_office_id, science_manager_offices.name_en AS science_manager_office_name,' +
                   ' science_managers.valid_from AS science_manager_start, science_managers.valid_until AS science_manager_end,' +
                   ' science_managers_units.unit_id AS science_manager_unit_id, science_manager_units.name AS science_manager_unit_name,' +
                   ' science_managers.science_manager_position_id, science_manager_positions.name_en AS science_manager_position_name_en, science_manager_positions.name_pt AS science_manager_position_name_pt,' +
                   ' people_administrative_offices.id AS administrative_id, people_administrative_offices.administrative_office_id, administrative_offices.name_en AS administrative_office_name,' +
                   ' people_administrative_offices.valid_from AS administrative_start, people_administrative_offices.valid_until AS administrative_end,' +
                   ' people_administrative_units.unit_id AS administrative_unit_id, administrative_units.name AS administrative_unit_name,' +
                   ' people_administrative_offices.administrative_position_id, administrative_positions.name_en AS administrative_position_name_en, administrative_positions.name_pt AS administrative_position_name_pt,' +
                   ' jobs.category_id, categories.name_en AS category, jobs.organization, jobs.valid_from AS job_start, jobs.valid_until AS job_end,' +
                   ' personal_photo.photo_type_id, personal_photo_type.name_en AS photo_type_name_en, personal_photo.url AS image_path' +
                   ' FROM people' +
                   ' LEFT JOIN emails ON people.id = emails.person_id' +
                   ' LEFT JOIN phones ON people.id = phones.person_id' +
                   ' LEFT JOIN personal_urls ON people.id = personal_urls.person_id' +
                    ' LEFT JOIN personal_url_types ON personal_urls.url_type_id = personal_url_types.id' +
                    ' LEFT JOIN website_texts ON people.id = website_texts.person_id' +
                    ' LEFT JOIN website_text_types ON website_text_types.id = website_texts.text_type_id' +
                    ' LEFT JOIN degrees_people ON people.id = degrees_people.person_id' +
                    ' LEFT JOIN degrees ON degrees_people.degree_id = degrees.id' +
                    ' LEFT JOIN jobs ON people.id = jobs.person_id' +
                    ' LEFT JOIN categories ON jobs.category_id = categories.id' +
                    ' LEFT JOIN research_interests ON people.id = research_interests.person_id' +
                    ' LEFT JOIN researchers ON people.id = researchers.person_id' +
                   ' LEFT JOIN people_labs ON people.id = people_labs.person_id' +
                   ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                   ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                   ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                   ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                   ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                   ' LEFT JOIN lab_positions ON lab_positions.id = people_labs.lab_position_id' +
                   ' LEFT JOIN technicians ON technicians.person_id = people.id' +
                   ' LEFT JOIN technician_offices ON technician_offices.id = technicians.technician_office_id' +
                   ' LEFT JOIN technicians_units ON technicians_units.technician_id = technicians.id' +
                   ' LEFT JOIN units AS technician_units ON technician_units.id = technicians_units.unit_id' +
                   ' LEFT JOIN technician_positions ON technician_positions.id = technicians.technician_position_id' +
                   ' LEFT JOIN science_managers ON science_managers.person_id = people.id' +
                   ' LEFT JOIN science_manager_offices ON science_manager_offices.id = science_managers.science_manager_office_id' +
                   ' LEFT JOIN science_managers_units ON science_managers_units.science_manager_id = science_managers.id' +
                   ' LEFT JOIN units AS science_manager_units ON science_manager_units.id = science_managers_units.unit_id' +
                   ' LEFT JOIN science_manager_positions ON science_manager_positions.id = science_managers.science_manager_position_id' +
                   ' LEFT JOIN people_administrative_offices ON people_administrative_offices.person_id = people.id' +
                   ' LEFT JOIN administrative_offices ON administrative_offices.id = people_administrative_offices.administrative_office_id' +
                   ' LEFT JOIN people_administrative_units ON people_administrative_units.administrative_id = people_administrative_offices.id' +
                   ' LEFT JOIN units AS administrative_units ON administrative_units.id = people_administrative_units.unit_id' +
                   ' LEFT JOIN administrative_positions ON administrative_positions.id = people_administrative_offices.administrative_position_id' +
                   ' LEFT JOIN personal_photo ON people.id = personal_photo.person_id' +
                   ' LEFT JOIN personal_photo_type ON personal_photo_type.id = personal_photo.photo_type_id' +
                   ' WHERE people.visible_public = 1 AND people.name LIKE ?' +
                     ' AND (people.active_until > ? OR (people.active_from < ? AND people.active_until IS NULL) OR (people.active_from IS NULL AND people.active_until IS NULL))';
        places = [name,now,now];
    } else if (name === '' && lab !== '') {
        lab =  '%' + lab + '%';
        querySQL = 'SELECT people.id, people.name AS full_name, people.colloquial_name AS name,' +
                       ' people.active_from, people.active_until,' +
                       ' emails.email, phones.phone, phones.extension AS phone_extension,' +
                       ' website_texts.title AS website_text_title, website_texts.text AS website_text, website_texts.text_type_id AS website_text_type_id, website_text_types.name_en AS website_text_type_name_en,' +
                    ' personal_urls.url, personal_urls.url_type_id, personal_url_types.type_en AS url_type, personal_urls.description AS url_description,' +
                    ' degrees_people.start AS degree_start, degrees_people.end AS degree_end,' +
                    ' degrees_people.degree_id AS degree_type_id, degrees.name_en AS degree,' +
                    ' degrees_people.area AS degree_field, degrees_people.institution AS degree_institution,' +
                    ' research_interests.interests, research_interests.sort_order AS interests_sort_order,' +
                    ' researchers.ORCID, researchers.researcherID, researchers.ciencia_id,' +
                       ' people_labs.valid_from AS lab_start, people_labs.valid_until AS lab_end,' +
                       ' labs.id AS lab_id, labs.name AS lab_name,' +
                       ' labs_groups.valid_from AS labs_groups_valid_from, labs_groups.valid_until AS labs_groups_valid_until,' +
                       ' groups.id AS group_id, groups.name AS group_name,' +
                       ' units.id AS unit_id, units.name AS unit_name,' +
                       ' lab_positions.id AS lab_position_id, lab_positions.name_en AS lab_position_name_en, lab_positions.name_pt  AS lab_position_name_pt,' +
                       ' lab_positions.sort_order  AS lab_position_sort_order,' +
                       ' technicians.id AS technician_id, technicians.technician_office_id, technician_offices.name_en AS technician_office_name,' +
                   ' technicians.valid_from AS technician_start, technicians.valid_until AS technician_end,' +
                   ' technicians_units.unit_id AS technician_unit_id, technician_units.name AS technician_unit_name,' +
                   ' technicians.technician_position_id, technician_positions.name_en AS technician_position_name_en, technician_positions.name_pt AS technician_position_name_pt,' +
                   ' science_managers.id AS science_manager_id, science_managers.science_manager_office_id, science_manager_offices.name_en AS science_manager_office_name,' +
                   ' science_managers.valid_from AS science_manager_start, science_managers.valid_until AS science_manager_end,' +
                   ' science_managers_units.unit_id AS science_manager_unit_id, science_manager_units.name AS science_manager_unit_name,' +
                   ' science_managers.science_manager_position_id, science_manager_positions.name_en AS science_manager_position_name_en, science_manager_positions.name_pt AS science_manager_position_name_pt,' +
                   ' people_administrative_offices.id AS administrative_id, people_administrative_offices.administrative_office_id, administrative_offices.name_en AS administrative_office_name,' +
                   ' people_administrative_offices.valid_from AS administrative_start, people_administrative_offices.valid_until AS administrative_end,' +
                   ' people_administrative_units.unit_id AS administrative_unit_id, administrative_units.name AS administrative_unit_name,' +
                   ' people_administrative_offices.administrative_position_id, administrative_positions.name_en AS administrative_position_name_en, administrative_positions.name_pt AS administrative_position_name_pt,' +
                   ' jobs.category_id, categories.name_en AS category, jobs.organization, jobs.valid_from AS job_start, jobs.valid_until AS job_end,' +
                   ' personal_photo.photo_type_id, personal_photo_type.name_en AS photo_type_name_en, personal_photo.url AS image_path' +
                      ' FROM people' +
                      ' LEFT JOIN emails ON people.id = emails.person_id' +
                      ' LEFT JOIN phones ON people.id = phones.person_id' +
                      ' LEFT JOIN personal_urls ON people.id = personal_urls.person_id' +
                    ' LEFT JOIN personal_url_types ON personal_urls.url_type_id = personal_url_types.id' +
                    ' LEFT JOIN website_texts ON people.id = website_texts.person_id' +
                    ' LEFT JOIN website_text_types ON website_text_types.id = website_texts.text_type_id' +
                    ' LEFT JOIN degrees_people ON people.id = degrees_people.person_id' +
                    ' LEFT JOIN degrees ON degrees_people.degree_id = degrees.id' +
                    ' LEFT JOIN jobs ON people.id = jobs.person_id' +
                    ' LEFT JOIN categories ON jobs.category_id = categories.id' +
                    ' LEFT JOIN research_interests ON people.id = research_interests.person_id' +
                    ' LEFT JOIN researchers ON people.id = researchers.person_id' +
                      ' LEFT JOIN people_labs ON people.id = people_labs.person_id' +
                      ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                      ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                      ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                      ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                      ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                      ' LEFT JOIN lab_positions ON lab_positions.id = people_labs.lab_position_id' +
                      ' LEFT JOIN technicians ON technicians.person_id = people.id' +
                  ' LEFT JOIN technician_offices ON technician_offices.id = technicians.technician_office_id' +
                  ' LEFT JOIN technicians_units ON technicians_units.technician_id = technicians.id' +
                  ' LEFT JOIN units AS technician_units ON technician_units.id = technicians_units.unit_id' +
                  ' LEFT JOIN technician_positions ON technician_positions.id = technicians.technician_position_id' +
                  ' LEFT JOIN science_managers ON science_managers.person_id = people.id' +
                  ' LEFT JOIN science_manager_offices ON science_manager_offices.id = science_managers.science_manager_office_id' +
                  ' LEFT JOIN science_managers_units ON science_managers_units.science_manager_id = science_managers.id' +
                  ' LEFT JOIN units AS science_manager_units ON science_manager_units.id = science_managers_units.unit_id' +
                  ' LEFT JOIN science_manager_positions ON science_manager_positions.id = science_managers.science_manager_position_id' +
                  ' LEFT JOIN people_administrative_offices ON people_administrative_offices.person_id = people.id' +
                  ' LEFT JOIN administrative_offices ON administrative_offices.id = people_administrative_offices.administrative_office_id' +
                  ' LEFT JOIN people_administrative_units ON people_administrative_units.administrative_id = people_administrative_offices.id' +
                  ' LEFT JOIN units AS administrative_units ON administrative_units.id = people_administrative_units.unit_id' +
                  ' LEFT JOIN administrative_positions ON administrative_positions.id = people_administrative_offices.administrative_position_id' +
                      ' LEFT JOIN personal_photo ON people.id = personal_photo.person_id' +
                      ' LEFT JOIN personal_photo_type ON personal_photo_type.id = personal_photo.photo_type_id' +
                      ' WHERE people.visible_public = 1 AND (labs.name LIKE ?)' +
                        ' AND (people.active_until > ? OR (people.active_from < ? AND people.active_until IS NULL) OR (people.active_from IS NULL AND people.active_until IS NULL))';
        places = [lab,now,now];

    } else if (name !== '' && lab !== '') {
        name = '%' + name + '%';
        lab =  '%' + lab + '%';
        querySQL = 'SELECT people.id, people.name AS full_name, people.colloquial_name AS name,' +
                    ' people.active_from, people.active_until,' +
                    ' emails.email, phones.phone, phones.extension AS phone_extension,' +
                    ' website_texts.title AS website_text_title, website_texts.text AS website_text, website_texts.text_type_id AS website_text_type_id, website_text_types.name_en AS website_text_type_name_en,' +
                    ' personal_urls.url, personal_urls.url_type_id, personal_url_types.type_en AS url_type, personal_urls.description AS url_description,' +
                    ' degrees_people.start AS degree_start, degrees_people.end AS degree_end,' +
                    ' degrees_people.degree_id AS degree_type_id, degrees.name_en AS degree,' +
                    ' degrees_people.area AS degree_field, degrees_people.institution AS degree_institution,' +
                    ' research_interests.interests, research_interests.sort_order AS interests_sort_order,' +
                    ' researchers.ORCID, researchers.researcherID, researchers.ciencia_id,' +
                    ' people_labs.valid_from AS lab_start, people_labs.valid_until AS lab_end,' +
                    ' labs.id AS lab_id, labs.name AS lab_name,' +
                    ' labs_groups.valid_from AS labs_groups_valid_from, labs_groups.valid_until AS labs_groups_valid_until,' +
                    ' groups.id AS group_id, groups.name AS group_name,' +
                    ' units.id AS unit_id, units.name AS unit_name,' +
                    ' lab_positions.id AS lab_position_id, lab_positions.name_en AS lab_position_name_en, lab_positions.name_pt  AS lab_position_name_pt,' +
                    ' lab_positions.sort_order AS lab_position_sort_order,' +
                    ' technicians.id AS technician_id, technicians.technician_office_id, technician_offices.name_en AS technician_office_name,' +
                   ' technicians.valid_from AS technician_start, technicians.valid_until AS technician_end,' +
                   ' technicians_units.unit_id AS technician_unit_id, technician_units.name AS technician_unit_name,' +
                   ' technicians.technician_position_id, technician_positions.name_en AS technician_position_name_en, technician_positions.name_pt AS technician_position_name_pt,' +
                   ' science_managers.id AS science_manager_id, science_managers.science_manager_office_id, science_manager_offices.name_en AS science_manager_office_name,' +
                   ' science_managers.valid_from AS science_manager_start, science_managers.valid_until AS science_manager_end,' +
                   ' science_managers_units.unit_id AS science_manager_unit_id, science_manager_units.name AS science_manager_unit_name,' +
                   ' science_managers.science_manager_position_id, science_manager_positions.name_en AS science_manager_position_name_en, science_manager_positions.name_pt AS science_manager_position_name_pt,' +
                   ' people_administrative_offices.id AS administrative_id, people_administrative_offices.administrative_office_id, administrative_offices.name_en AS administrative_office_name,' +
                   ' people_administrative_offices.valid_from AS administrative_start, people_administrative_offices.valid_until AS administrative_end,' +
                   ' people_administrative_units.unit_id AS administrative_unit_id, administrative_units.name AS administrative_unit_name,' +
                   ' people_administrative_offices.administrative_position_id, administrative_positions.name_en AS administrative_position_name_en, administrative_positions.name_pt AS administrative_position_name_pt,' +
                   ' jobs.category_id, categories.name_en AS category, jobs.organization, jobs.valid_from AS job_start, jobs.valid_until AS job_end,' +
                   ' personal_photo.photo_type_id, personal_photo_type.name_en AS photo_type_name_en, personal_photo.url AS image_path' +
                      ' FROM people' +
                      ' LEFT JOIN emails ON people.id = emails.person_id' +
                      ' LEFT JOIN phones ON people.id = phones.person_id' +
                      ' LEFT JOIN personal_urls ON people.id = personal_urls.person_id' +
                    ' LEFT JOIN personal_url_types ON personal_urls.url_type_id = personal_url_types.id' +
                    ' LEFT JOIN website_texts ON people.id = website_texts.person_id' +
                    ' LEFT JOIN website_text_types ON website_text_types.id = website_texts.text_type_id' +
                    ' LEFT JOIN degrees_people ON people.id = degrees_people.person_id' +
                    ' LEFT JOIN degrees ON degrees_people.degree_id = degrees.id' +
                    ' LEFT JOIN jobs ON people.id = jobs.person_id' +
                    ' LEFT JOIN categories ON jobs.category_id = categories.id' +
                    ' LEFT JOIN research_interests ON people.id = research_interests.person_id' +
                    ' LEFT JOIN researchers ON people.id = researchers.person_id' +
                      ' LEFT JOIN people_labs ON people.id = people_labs.person_id' +
                      ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                      ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                      ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                      ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                      ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                      ' LEFT JOIN lab_positions ON lab_positions.id = people_labs.lab_position_id' +
                      ' LEFT JOIN technicians ON technicians.person_id = people.id' +
                  ' LEFT JOIN technician_offices ON technician_offices.id = technicians.technician_office_id' +
                  ' LEFT JOIN technicians_units ON technicians_units.technician_id = technicians.id' +
                  ' LEFT JOIN units AS technician_units ON technician_units.id = technicians_units.unit_id' +
                  ' LEFT JOIN technician_positions ON technician_positions.id = technicians.technician_position_id' +
                  ' LEFT JOIN science_managers ON science_managers.person_id = people.id' +
                  ' LEFT JOIN science_manager_offices ON science_manager_offices.id = science_managers.science_manager_office_id' +
                  ' LEFT JOIN science_managers_units ON science_managers_units.science_manager_id = science_managers.id' +
                  ' LEFT JOIN units AS science_manager_units ON science_manager_units.id = science_managers_units.unit_id' +
                  ' LEFT JOIN science_manager_positions ON science_manager_positions.id = science_managers.science_manager_position_id' +
                  ' LEFT JOIN people_administrative_offices ON people_administrative_offices.person_id = people.id' +
                  ' LEFT JOIN administrative_offices ON administrative_offices.id = people_administrative_offices.administrative_office_id' +
                  ' LEFT JOIN people_administrative_units ON people_administrative_units.administrative_id = people_administrative_offices.id' +
                  ' LEFT JOIN units AS administrative_units ON administrative_units.id = people_administrative_units.unit_id' +
                  ' LEFT JOIN administrative_positions ON administrative_positions.id = people_administrative_offices.administrative_position_id' +
                  ' LEFT JOIN personal_photo ON people.id = personal_photo.person_id' +
                  ' LEFT JOIN personal_photo_type ON personal_photo_type.id = personal_photo.photo_type_id' +
                      ' WHERE people.visible_public = 1 AND people.name LIKE ?' +
                        ' AND (labs.name LIKE ?)' +
                        ' AND (people.active_until > ? OR (people.active_from < ? AND people.active_until IS NULL) OR (people.active_from IS NULL AND people.active_until IS NULL))';
        places = [name,lab,now,now];
    }
    if (unitID !== null) {
        querySQL = querySQL + ' AND (units.id = ? OR technicians_units.unit_id = ? OR science_managers_units.unit_id = ? OR people_administrative_units.unit_id = ?)';
        places.push(unitID,unitID,unitID,unitID);
    }
    var mergeRules = [
                      ['photo_data', 'photo_type_id', 'photo_type_name_en', 'image_path'],
                      ['website_texts', 'website_text_title', 'website_text', 'website_text_type_id', 'website_text_type_name_en'],
                      ['personal_url_data', 'url', 'url_type_id', 'url_type', 'url_description'],
                      ['degree_data', 'degree_start', 'degree_end', 'degree_type_id', 'degree', 'degree_field', 'degree_institution'],
                      ['job_data', 'job_start', 'job_end', 'category_id', 'category', 'organization'],
                      ['research_interests', 'interests', 'interests_sort_order'],
                      ['lab_data', 'lab_start', 'lab_end', 'lab_position_id','lab_position_name_en','lab_position_name_pt', 'lab_position_sort_order','sort_order',
                       'lab_id','lab_name','labs_groups_valid_from','labs_groups_valid_until','group_id','group_name','unit_id', 'unit_name'],
                      ['technician_data', 'technician_start', 'technician_end', 'technician_position_id','technician_position_name_en','technician_position_name_pt',
                       'technician_id','technician_office_id','technician_office_name','technician_unit_id','technician_unit_name'],
                      ['science_management_data', 'science_manager_start', 'science_manager_end', 'science_manager_position_id','science_manager_position_name_en','science_manager_position_name_pt',
                       'science_manager_id','science_manager_office_id','science_manager_office_name','science_manager_unit_id','science_manager_unit_name'],
                      ['administrative_data', 'administrative_start', 'administrative_end', 'administrative_position_id','administrative_position_name_en','administrative_position_name_pt',
                       'administrative_id','administrative_office_id','administrative_office_name','administrative_unit_id','administrative_unit_name']
                    ];

    escapedQueryPersonSearch(querySQL, places, mergeRules, req, res, next);
};
module.exports.getPersonInfo = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = 'SELECT people.id, people.name AS full_name, people.colloquial_name AS name,' +
                   ' people.active_from, people.active_until,' +
                   ' emails.email, phones.phone, phones.extension AS phone_extension,' +
                   ' website_texts.title AS website_text_title, website_texts.text AS website_text, website_texts.text_type_id AS website_text_type_id, website_text_types.name_en AS website_text_type_name_en,' +
                   ' personal_urls.url, personal_urls.url_type_id, personal_url_types.type_en AS url_type, personal_urls.description AS url_description,' +
                   ' degrees_people.start AS degree_start, degrees_people.end AS degree_end,' +
                   ' degrees_people.degree_id AS degree_type_id, degrees.name_en AS degree,' +
                   ' degrees_people.area AS degree_field, degrees_people.institution AS degree_institution,' +
                   ' research_interests.interests, research_interests.sort_order AS interests_sort_order,' +
                   ' researchers.ORCID, researchers.researcherID, researchers.ciencia_id,' +
                   ' people_labs.valid_from AS lab_start, people_labs.valid_until AS lab_end, people_labs.sort_order,' +
                   ' labs.id AS lab_id, labs.name AS lab_name,' +
                   ' labs_groups.valid_from AS labs_groups_valid_from, labs_groups.valid_until AS labs_groups_valid_until,' +
                   ' groups.id AS group_id, groups.name AS group_name,' +
                   ' units.id AS unit_id, units.name AS unit_name,' +
                   ' lab_positions.id AS lab_position_id, lab_positions.name_en AS lab_position_name_en, lab_positions.name_pt  AS lab_position_name_pt,' +
                   ' lab_positions.sort_order AS lab_position_sort_order,' +
                   ' technicians.id AS technician_id, technicians.technician_office_id, technician_offices.name_en AS technician_office_name,' +
                   ' technicians.valid_from AS technician_start, technicians.valid_until AS technician_end,' +
                   ' technicians_units.unit_id AS technician_unit_id, technician_units.name AS technician_unit_name,' +
                   ' technicians.technician_position_id, technician_positions.name_en AS technician_position_name_en, technician_positions.name_pt AS technician_position_name_pt,' +
                   ' science_managers.id AS science_manager_id, science_managers.science_manager_office_id, science_manager_offices.name_en AS science_manager_office_name,' +
                   ' science_managers.valid_from AS science_manager_start, science_managers.valid_until AS science_manager_end,' +
                   ' science_managers_units.unit_id AS science_manager_unit_id, science_manager_units.name AS science_manager_unit_name,' +
                   ' science_managers.science_manager_position_id, science_manager_positions.name_en AS science_manager_position_name_en, science_manager_positions.name_pt AS science_manager_position_name_pt,' +
                   ' people_administrative_offices.id AS administrative_id, people_administrative_offices.administrative_office_id, administrative_offices.name_en AS administrative_office_name,' +
                   ' people_administrative_offices.valid_from AS administrative_start, people_administrative_offices.valid_until AS administrative_end,' +
                   ' people_administrative_units.unit_id AS administrative_unit_id, administrative_units.name AS administrative_unit_name,' +
                   ' people_administrative_offices.administrative_position_id, administrative_positions.name_en AS administrative_position_name_en, administrative_positions.name_pt AS administrative_position_name_pt,' +
                   ' jobs.category_id, categories.name_en AS category, jobs.organization, jobs.valid_from AS job_start, jobs.valid_until AS job_end,' +
                   ' personal_photo.photo_type_id, personal_photo_type.name_en AS photo_type_name_en, personal_photo.url AS image_path' +
                  ' FROM people' +
                  ' LEFT JOIN emails ON people.id = emails.person_id' +
                  ' LEFT JOIN phones ON people.id = phones.person_id' +
                  ' LEFT JOIN personal_urls ON people.id = personal_urls.person_id' +
                  ' LEFT JOIN personal_url_types ON personal_urls.url_type_id = personal_url_types.id' +
                  ' LEFT JOIN website_texts ON people.id = website_texts.person_id' +
                  ' LEFT JOIN website_text_types ON website_text_types.id = website_texts.text_type_id' +
                  ' LEFT JOIN degrees_people ON people.id = degrees_people.person_id' +
                  ' LEFT JOIN degrees ON degrees_people.degree_id = degrees.id' +
                  ' LEFT JOIN jobs ON people.id = jobs.person_id' +
                  ' LEFT JOIN categories ON jobs.category_id = categories.id' +
                  ' LEFT JOIN research_interests ON people.id = research_interests.person_id' +
                  ' LEFT JOIN researchers ON people.id = researchers.person_id' +
                  ' LEFT JOIN people_labs ON people.id = people_labs.person_id' +
                  ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                  ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                  ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                  ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                  ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                  ' LEFT JOIN lab_positions ON lab_positions.id = people_labs.lab_position_id' +
                  ' LEFT JOIN technicians ON technicians.person_id = people.id' +
                  ' LEFT JOIN technician_offices ON technician_offices.id = technicians.technician_office_id' +
                  ' LEFT JOIN technicians_units ON technicians_units.technician_id = technicians.id' +
                  ' LEFT JOIN units AS technician_units ON technician_units.id = technicians_units.unit_id' +
                  ' LEFT JOIN technician_positions ON technician_positions.id = technicians.technician_position_id' +
                  ' LEFT JOIN science_managers ON science_managers.person_id = people.id' +
                  ' LEFT JOIN science_manager_offices ON science_manager_offices.id = science_managers.science_manager_office_id' +
                  ' LEFT JOIN science_managers_units ON science_managers_units.science_manager_id = science_managers.id' +
                  ' LEFT JOIN units AS science_manager_units ON science_manager_units.id = science_managers_units.unit_id' +
                  ' LEFT JOIN science_manager_positions ON science_manager_positions.id = science_managers.science_manager_position_id' +
                  ' LEFT JOIN people_administrative_offices ON people_administrative_offices.person_id = people.id' +
                  ' LEFT JOIN administrative_offices ON administrative_offices.id = people_administrative_offices.administrative_office_id' +
                  ' LEFT JOIN people_administrative_units ON people_administrative_units.administrative_id = people_administrative_offices.id' +
                  ' LEFT JOIN units AS administrative_units ON administrative_units.id = people_administrative_units.unit_id' +
                  ' LEFT JOIN administrative_positions ON administrative_positions.id = people_administrative_offices.administrative_position_id' +
                  ' LEFT JOIN personal_photo ON people.id = personal_photo.person_id' +
                  ' LEFT JOIN personal_photo_type ON personal_photo_type.id = personal_photo.photo_type_id' +
                  ' WHERE people.id = ? AND people.visible_public = 1;';
    var places = [personID];
    var mergeRules = [
                      ['photo_data', 'photo_type_id', 'photo_type_name_en', 'image_path'],
                      ['website_texts', 'website_text_title', 'website_text', 'website_text_type_id', 'website_text_type_name_en'],
                      ['personal_url_data', 'url', 'url_type_id', 'url_type', 'url_description'],
                      ['degree_data', 'degree_start', 'degree_end', 'degree_type_id', 'degree', 'degree_field', 'degree_institution'],
                      ['job_data', 'job_start', 'job_end', 'category_id', 'category', 'organization'],
                      ['research_interests', 'interests', 'interests_sort_order'],
                      ['lab_data', 'lab_start', 'lab_end', 'lab_position_id','lab_position_name_en','lab_position_name_pt', 'lab_position_sort_order', 'sort_order',
                       'lab_id','lab_name','labs_groups_valid_from','labs_groups_valid_until','group_id','group_name','unit_id', 'unit_name'],
                      ['technician_data', 'technician_start', 'technician_end', 'technician_position_id','technician_position_name_en','technician_position_name_pt',
                       'technician_id','technician_office_id','technician_office_name','technician_unit_id','technician_unit_name'],
                      ['science_management_data', 'science_manager_start', 'science_manager_end', 'science_manager_position_id','science_manager_position_name_en','science_manager_position_name_pt',
                       'science_manager_id','science_manager_office_id','science_manager_office_name','science_manager_unit_id','science_manager_unit_name'],
                      ['administrative_data', 'administrative_start', 'administrative_end', 'administrative_position_id','administrative_position_name_en','administrative_position_name_pt',
                       'administrative_id','administrative_office_id','administrative_office_name','administrative_unit_id','administrative_unit_name']
                    ];

    escapedQueryPersonSearch(querySQL, places, mergeRules, req, res, next);
};
module.exports.getPersonPublications = function (req, res, next) {
    var personID = req.params.personID;
    var querySQL = 'SELECT people_publications.author_type_id,' +
                    ' people_publications.selected,' +
                    ' labs_publications.lab_id,labs_publications.group_id, units.id AS unit_id, labs_publications.public AS lab_public,' +
                    ' units_publications.unit_id AS unit_pub_unit_id, units_publications.public AS unit_public,' +
                    ' publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM people_publications' +
                    ' LEFT JOIN author_types ON people_publications.author_type_id = author_types.id' +
                    ' LEFT JOIN publications ON people_publications.publication_id = publications.id' +
                    ' LEFT JOIN journals ON publications.journal_id = journals.id' +
                    ' LEFT JOIN labs_publications ON labs_publications.publication_id = publications.id' +
                    ' LEFT JOIN labs ON labs.id = labs_publications.lab_id' +
                    ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                    ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                    ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                    ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                    ' LEFT JOIN units_publications ON units_publications.publication_id = publications.id' +
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
                    else if (resQuery[ind].selected === 0) {resQuery[ind].selected = false;}
                    else if (resQuery[ind].selected !== null) {resQuery[ind].selected = true;}
                }
                var publications = processPublications(resQuery, 'single-person');
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": resQuery.length,
                     "result" : publications});
                return;
            }
        );
    });
};
module.exports.getGroupsList = function (req, res, next) {
    var places = []
    var unitID = null;
    if (req.query.hasOwnProperty('unit')) {
        unitID = req.query.unit;
    }
    var querySQL = 'SELECT groups.id AS group_id, groups.name, groups.short_name AS group_short_name, ' +
                ' groups.started, groups.finished, ' +
                ' units.id AS unit_id, units.short_name AS unit, units.name AS unit_full_name' +
                ' FROM groups' +
                ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                ' LEFT JOIN units ON groups_units.unit_id = units.id';
    if (unitID !== null) {
        querySQL = querySQL + ' WHERE units.id = ?';
        places.push(unitID);
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(querySQL, places,
            function (err, rowsQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": 1,
                      "result" : rowsQuery});
                return;
            }
        );
    });
};
module.exports.getGroupInfo = function (req, res, next) {
    var groupID = req.params.groupID;
    var querySQL = 'SELECT groups.id AS group_id, groups.name, groups.short_name AS group_short_name, ' +
                   ' groups.started, groups.finished,' +
                   ' units.id AS unit_id, units.short_name AS unit, units.name AS unit_full_name' +
                   ' FROM groups' +
                   ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                   ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                   ' WHERE groups.id = ?;';
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
                if (resQuery.length > 0) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 1,
                         "result" : resQuery});
                    return;
                } else {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                         "result" : []});
                    return;
                }
            }
        );
    });
};
module.exports.getGroupLabs = function (req, res, next) {
    var groupID = req.params.groupID;
    var querySQL = 'SELECT labs.id AS lab_id, labs.name AS lab, labs.short_name AS lab_short_name,' +
                   ' labs.started AS lab_opened, labs.finished AS lab_closed, ' +
                   ' labs_groups.valid_from AS labs_groups_valid_from, labs_groups.valid_until AS labs_groups_valid_until' +
                   ' FROM labs_groups' +
                   ' LEFT JOIN labs ON labs.id = labs_groups.lab_id' +
                   ' WHERE labs_groups.group_id = ?;';
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
                if (resQuery.length > 0) {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": resQuery.length,
                         "result" : resQuery});
                    return;
                } else {
                    sendJSONResponse(res, 200,
                        {"status": "success", "statusCode": 200, "count": 0,
                         "result" : []});
                    return;
                }
            }
        );
    });
};
module.exports.getGroupMembers = function (req, res, next) {
    var now = momentToDate(moment());
    var group = req.params.groupID;
    var querySQL = 'SELECT people.id, people.name AS full_name, people.colloquial_name AS name,' +
                   ' people.active_from, people.active_until,' +
                   ' emails.email, phones.phone, phones.extension AS phone_extension,' +
                   ' people_labs.valid_from AS lab_start, people_labs.valid_until AS lab_end,' +
                   ' labs.id AS lab_id, labs.name AS lab_name,' +
                   ' labs_groups.valid_from AS labs_groups_valid_from, labs_groups.valid_until AS labs_groups_valid_until,' +
                   ' groups.id AS group_id, groups.name AS group_name,' +
                   ' units.id AS unit_id, units.name AS unit_name,' +
                   ' people_labs.sort_order,' +
                   ' lab_positions.id AS lab_position_id,' +
                   ' lab_positions.name_en AS lab_position_name_en,' +
                   ' lab_positions.name_pt  AS lab_position_name_pt,' +
                   ' lab_positions.sort_order AS lab_position_sort_order,' +
                   ' personal_photo.photo_type_id, personal_photo_type.name_en AS photo_type_name_en, personal_photo.url AS image_path' +
                  ' FROM people' +
                  ' LEFT JOIN emails ON people.id = emails.person_id' +
                  ' LEFT JOIN phones ON people.id = phones.person_id' +
                  ' LEFT JOIN people_labs ON people.id = people_labs.person_id' +
                  ' LEFT JOIN labs ON labs.id = people_labs.lab_id' +
                  ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                  ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                  ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                  ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                  ' LEFT JOIN lab_positions ON lab_positions.id = people_labs.lab_position_id' +
                  ' LEFT JOIN personal_photo ON people.id = personal_photo.person_id' +
                  ' LEFT JOIN personal_photo_type ON personal_photo_type.id = personal_photo.photo_type_id' +
                  ' WHERE groups.id = ?' +
                  ' AND people.visible_public = 1'
                  ' AND (people.active_until > ? OR (people.active_from < ? AND people.active_until IS NULL) OR (people.active_from IS NULL AND people.active_until IS NULL))' +
                  ';';
    var places = [group,now,now];
    // sort_order is a user defined sort weight that might be used to override
    // sort orders defined in lab_positions
    var mergeRules = [
                      ['photo_data', 'photo_type_id', 'photo_type_name_en', 'image_path'],
                      ['lab_data', 'lab_start', 'lab_end', 'lab_position_id',
                      'lab_position_name_en','lab_position_name_pt','lab_position_sort_order',
                      'sort_order',
                       'lab_id','lab_name','labs_groups_valid_from','labs_groups_valid_until','group_id','group_name','unit_id', 'unit_name']
                    ];
    escapedQueryPersonSearch(querySQL, places, mergeRules, req, res, next);
};
module.exports.getGroupPublications = function (req, res, next) {
    var groupID = req.params.groupID;
    var querySQL = 'SELECT publications.*,' +
                    ' journals.name AS journal_name, journals.short_name AS journal_short_name, ' +
                    ' journals.publisher, journals.publisher_city, journals.issn, journals.eissn ' +
                    'FROM labs_publications' +
                    ' LEFT JOIN publications ON labs_publications.publication_id = publications.id' +
                    ' LEFT JOIN journals ON publications.journal_id = journals.id' +
                    ' WHERE labs_publications.group_id = ?' +
                    ' AND labs_publications.public = 1;';
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
                    if (resQuery[ind].selected === null) { resQuery[ind].selected = false; }
                    else if (resQuery[ind].selected === 0) { resQuery[ind].selected = false; }
                    else if (resQuery[ind].selected !== null) { resQuery[ind].selected = true; }
                }
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": resQuery.length,
                     "result" : resQuery});
                return;
            }
        );
    });
};
module.exports.getLabsList = function (req, res, next) {
    var places = []
    var unitID = null;
    if (req.query.hasOwnProperty('unit')) {
        unitID = req.query.unit;
    }
    var querySQL = 'SELECT labs.id AS lab_id, labs.name AS lab, labs.short_name AS lab_short_name,' +
                ' labs.started AS lab_opened, labs.finished AS lab_closed, ' +
                ' labs_groups.valid_from AS labs_groups_valid_from, labs_groups.valid_until AS labs_groups_valid_until,' +
                ' groups.id AS group_id, groups.name AS group_name, groups.short_name AS group_short_name,' +
                ' units.id AS unit_id, units.short_name AS unit, units.name AS unit_full_name' +
                ' FROM labs' +
                ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                ' LEFT JOIN units ON groups_units.unit_id = units.id';
    if (unitID !== null) {
        querySQL = querySQL + ' WHERE units.id = ?';
        places.push(unitID);
    }
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(querySQL, places,
            function (err, rowsQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                rowsQuery = joinLabs(rowsQuery);
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": rowsQuery.length,
                      "result" : rowsQuery});
                return;
            }
        );
    });
};
module.exports.getLabInfo = function (req, res, next) {
    var labID = req.params.labID;
    var querySQL = 'SELECT labs.id AS lab_id, labs.name AS lab, labs.short_name AS lab_short_name,' +
                   ' labs.started AS lab_opened, labs.finished AS lab_closed, ' +
                   ' labs_groups.valid_from AS labs_groups_valid_from, labs_groups.valid_until AS labs_groups_valid_until,' +
                   ' groups.id AS group_id, groups.name AS group_name, groups.short_name AS group_short_name,' +
                   ' units.id AS unit_id, units.short_name AS unit, units.name AS unit_full_name' +
                   ' FROM labs' +
                   ' LEFT JOIN labs_groups ON labs_groups.lab_id = labs.id' +
                   ' LEFT JOIN groups ON labs_groups.group_id = groups.id' +
                   ' LEFT JOIN groups_units ON groups_units.group_id = groups.id' +
                   ' LEFT JOIN units ON groups_units.unit_id = units.id' +
                   ' WHERE labs.id = ?;';
    var places = [labID];
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(querySQL, places,
            function (err, rowsQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                rowsQuery = joinLabs(rowsQuery);
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": 1,
                      "result" : rowsQuery});
                return;
            }
        );
    });
};
module.exports.getGroupLabsPublications = function (req, res, next) {
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
                    else if (resQuery[ind].selected === 0) {resQuery[ind].selected = false;}
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

module.exports.getFacilitiesList = function (req, res, next) {
    var places = []
    var querySQL = 'SELECT * FROM technician_offices;';
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(querySQL, places,
            function (err, rowsQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": 1,
                      "result" : rowsQuery});
                return;
            }
        );
    });
};
module.exports.getScienceManagementOfficesList = function (req, res, next) {
    var places = []
    var querySQL = 'SELECT * FROM science_manager_offices;';
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(querySQL, places,
            function (err, rowsQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": 1,
                      "result" : rowsQuery});
                return;
            }
        );
    });
};
module.exports.getAdministrativeOfficesList = function (req, res, next) {
    var places = []
    var querySQL = 'SELECT * FROM administrative_offices;';
    pool.getConnection(function(err, connection) {
        if (err) {
            sendJSONResponse(res, 500, {"status": "error", "statusCode": 500, "error" : err.stack});
            return;
        }
        connection.query(querySQL, places,
            function (err, rowsQuery) {
                // And done with the connection.
                connection.release();
                if (err) {
                    sendJSONResponse(res, 400, {"status": "error", "statusCode": 400, "error" : err.stack});
                    return;
                }
                sendJSONResponse(res, 200,
                    {"status": "success", "statusCode": 200, "count": 1,
                      "result" : rowsQuery});
                return;
            }
        );
    });
};
module.exports.getFacilityMembers = function (req, res, next) {
    var now = momentToDate(moment());
    var officeID = req.params.officeID;
    var places = [];
    var unitID = null;
    if (req.query.hasOwnProperty('unit')) {
        unitID = req.query.unit;
    }
    var querySQL = 'SELECT people.id, people.name AS full_name, people.colloquial_name AS name,' +
                ' people.active_from, people.active_until,' +
                ' emails.email, phones.phone, phones.extension AS phone_extension,' +
                ' technicians.id AS technician_id, technicians.technician_office_id, technician_offices.name_en AS technician_office_name,' +
                ' technicians.valid_from AS technician_start, technicians.valid_until AS technician_end,' +
                ' technicians_units.unit_id AS technician_unit_id, technician_units.name AS technician_unit_name,' +
                ' technicians.technician_position_id, technician_positions.name_en AS technician_position_name_en, technician_positions.name_pt AS technician_position_name_pt,' +
                ' personal_photo.photo_type_id, personal_photo_type.name_en AS photo_type_name_en, personal_photo.url AS image_path' +
                ' FROM people' +
                ' LEFT JOIN emails ON people.id = emails.person_id' +
                ' LEFT JOIN phones ON people.id = phones.person_id' +

                ' LEFT JOIN technicians ON technicians.person_id = people.id' +
                ' LEFT JOIN technician_offices ON technician_offices.id = technicians.technician_office_id' +
                ' LEFT JOIN technicians_units ON technicians_units.technician_id = technicians.id' +
                ' LEFT JOIN units AS technician_units ON technician_units.id = technicians_units.unit_id' +
                ' LEFT JOIN technician_positions ON technician_positions.id = technicians.technician_position_id' +

                ' LEFT JOIN personal_photo ON people.id = personal_photo.person_id' +
                ' LEFT JOIN personal_photo_type ON personal_photo_type.id = personal_photo.photo_type_id' +
                ' WHERE technician_offices.id = ? AND people.visible_public = 1' +
                ' AND (people.active_until > ? OR (people.active_from < ? AND people.active_until IS NULL) OR (people.active_from IS NULL AND people.active_until IS NULL))';
    places = [officeID,now,now];
    if (unitID !== null) {
        querySQL = querySQL + ' AND technician_units.id = ?';
        places.push(unitID);
    }
    var mergeRules = [
            ['photo_data', 'photo_type_id', 'photo_type_name_en', 'image_path'],
            ['technician_data', 'technician_start', 'technician_end', 'technician_position_id','technician_position_name_en','technician_position_name_pt',
             'technician_id','technician_office_id','technician_office_name','technician_unit_id','technician_unit_name']
      ];
    escapedQueryPersonSearch(querySQL, places, mergeRules, req, res, next,'non-researcher');
};
module.exports.getScienceManagementOfficeMembers = function (req, res, next) {
    var now = momentToDate(moment());
    var officeID = req.params.officeID;
    var places = [];
    var unitID = null;
    if (req.query.hasOwnProperty('unit')) {
        unitID = req.query.unit;
    }
    var querySQL = 'SELECT people.id, people.name AS full_name, people.colloquial_name AS name,' +
                ' people.active_from, people.active_until,' +
                ' emails.email, phones.phone, phones.extension AS phone_extension,' +
                ' science_managers.id AS science_manager_id, science_managers.science_manager_office_id, science_manager_offices.name_en AS science_manager_office_name,' +
                ' science_managers.valid_from AS science_manager_start, science_managers.valid_until AS science_manager_end,' +
                ' science_managers_units.unit_id AS science_manager_unit_id, science_manager_units.name AS science_manager_unit_name,' +
                ' science_managers.science_manager_position_id, science_manager_positions.name_en AS science_manager_position_name_en, science_manager_positions.name_pt AS science_manager_position_name_pt,' +
                ' personal_photo.photo_type_id, personal_photo_type.name_en AS photo_type_name_en, personal_photo.url AS image_path' +
                ' FROM people' +
                ' LEFT JOIN emails ON people.id = emails.person_id' +
                ' LEFT JOIN phones ON people.id = phones.person_id' +

                ' LEFT JOIN science_managers ON science_managers.person_id = people.id' +
                ' LEFT JOIN science_manager_offices ON science_manager_offices.id = science_managers.science_manager_office_id' +
                ' LEFT JOIN science_managers_units ON science_managers_units.science_manager_id = science_managers.id' +
                ' LEFT JOIN units AS science_manager_units ON science_manager_units.id = science_managers_units.unit_id' +
                ' LEFT JOIN science_manager_positions ON science_manager_positions.id = science_managers.science_manager_position_id' +

                ' LEFT JOIN personal_photo ON people.id = personal_photo.person_id' +
                ' LEFT JOIN personal_photo_type ON personal_photo_type.id = personal_photo.photo_type_id' +
                ' WHERE science_manager_offices.id = ? AND people.visible_public = 1' +
                ' AND (people.active_until > ? OR (people.active_from < ? AND people.active_until IS NULL) OR (people.active_from IS NULL AND people.active_until IS NULL))';
    places = [officeID,now,now];
    if (unitID !== null) {
        querySQL = querySQL + ' AND science_manager_units.id = ?';
        places.push(unitID);
    }
    var mergeRules = [
            ['photo_data', 'photo_type_id', 'photo_type_name_en', 'image_path'],
            ['science_management_data', 'science_manager_start', 'science_manager_end', 'science_manager_position_id','science_manager_position_name_en','science_manager_position_name_pt',
            'science_manager_id','science_manager_office_id','science_manager_office_name','science_manager_unit_id','science_manager_unit_name']
        ];
    escapedQueryPersonSearch(querySQL, places, mergeRules, req, res, next,'non-researcher');
};
module.exports.getAdministrativeOfficeMembers = function (req, res, next) {
    var now = momentToDate(moment());
    var officeID = req.params.officeID;
    var places = [];
    var unitID = null;
    if (req.query.hasOwnProperty('unit')) {
        unitID = req.query.unit;
    }
    var querySQL = 'SELECT people.id, people.name AS full_name, people.colloquial_name AS name,' +
                ' people.active_from, people.active_until,' +
                ' emails.email, phones.phone, phones.extension AS phone_extension,' +
                ' people_administrative_offices.id AS administrative_id, people_administrative_offices.administrative_office_id, administrative_offices.name_en AS administrative_office_name,' +
                ' people_administrative_offices.valid_from AS administrative_start, people_administrative_offices.valid_until AS administrative_end,' +
                ' people_administrative_units.unit_id AS administrative_unit_id, administrative_units.name AS administrative_unit_name,' +
                ' people_administrative_offices.administrative_position_id, administrative_positions.name_en AS administrative_position_name_en, administrative_positions.name_pt AS administrative_position_name_pt,' +
                ' personal_photo.photo_type_id, personal_photo_type.name_en AS photo_type_name_en, personal_photo.url AS image_path' +
                ' FROM people' +
                ' LEFT JOIN emails ON people.id = emails.person_id' +
                ' LEFT JOIN phones ON people.id = phones.person_id' +

                ' LEFT JOIN people_administrative_offices ON people_administrative_offices.person_id = people.id' +
                ' LEFT JOIN administrative_offices ON administrative_offices.id = people_administrative_offices.administrative_office_id' +
                ' LEFT JOIN people_administrative_units ON people_administrative_units.administrative_id = people_administrative_offices.id' +
                ' LEFT JOIN units AS administrative_units ON administrative_units.id = people_administrative_units.unit_id' +
                ' LEFT JOIN administrative_positions ON administrative_positions.id = people_administrative_offices.administrative_position_id' +

                ' LEFT JOIN personal_photo ON people.id = personal_photo.person_id' +
                ' LEFT JOIN personal_photo_type ON personal_photo_type.id = personal_photo.photo_type_id' +
                ' WHERE administrative_offices.id = ? AND people.visible_public = 1' +
                ' AND (people.active_until > ? OR (people.active_from < ? AND people.active_until IS NULL) OR (people.active_from IS NULL AND people.active_until IS NULL))';
    places = [officeID,now,now];
    if (unitID !== null) {
        querySQL = querySQL + ' AND administrative_units.id = ?';
        places.push(unitID);
    }
    var mergeRules = [
        ['photo_data', 'photo_type_id', 'photo_type_name_en', 'image_path'],
        ['administrative_data', 'administrative_start', 'administrative_end', 'administrative_position_id','administrative_position_name_en','administrative_position_name_pt',
         'administrative_id','administrative_office_id','administrative_office_name','administrative_unit_id','administrative_unit_name']
    ];
    escapedQueryPersonSearch(querySQL, places, mergeRules, req, res, next,'non-researcher');
};
