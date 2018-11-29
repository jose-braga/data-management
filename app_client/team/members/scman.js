(function(){
    var teamPeopleScManOfficePresentation =
    ['personData','teamData','authentication','$timeout',
    function (personData,teamData,authentication,$timeout) {
        return {
            restrict: 'E',
            scope: {
                office: '@',
                unit: '@',
            },
            templateUrl: 'team/members/team.peopleScManOffice.html',
            link:
            function (scope,element,attrs) {
                scope.currentUser = authentication.currentUser();
                scope.sortType = 'person_name';
                scope.sortReverse = false;
                scope.pageSize = 10;
                scope.totalFromSearch = 10;
                scope.currentPage = 1;
                scope.searchName = '';
                scope.allPeople = [];
                scope.forms = {
                    'peopleScMan': 0
                };
                var numberCards = Object.keys(scope.forms).length; // the number of cards with "Update" in each tab
                scope.updateStatus = [];
                scope.messageType = [];
                scope.hideMessage = [];
                for (var i=0; i<numberCards; i++) {
                    scope.updateStatus.push('');
                    scope.messageType.push('message-updating');
                    scope.hideMessage.push(true);
                }

                scope.updateOfficePerson = [];
                scope.deleteNeverMember = [];

                getPersonOfficeTeam(-1);
                personData.scienceManagementPositions()
                    .then(function (response) {
                        scope.scienceManagementPositions = response.data.result;
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
                personData.scienceManagementOffices()
                    .then(function (response) {
                        scope.scienceManagementOffices = response.data.result;
                    })
                    .catch(function (err) {
                        console.log(err);
                    });

                scope.renderPeople = function (str) {
                    if (str === 'new') {
                       scope.currentPage = 1;
                    }
                    scope.totalPeople = scope.team.length;
                    // now we filter based on search terms
                    scope.selectedPeople = [];
                    for (var member in scope.team) {
                        var toInclude = 0;
                        var toIncludeDueName = 0;
                        if (scope.searchName !== '') {
                            if (nameMatching(scope.team[member]['person_name'],scope.searchName) !== null) {
                               toIncludeDueName = 1;
                            }
                        } else {
                            toIncludeDueName = 1;
                        }
                        toInclude = toIncludeDueName;
                        if (toInclude === 1) {
                            scope.selectedPeople.push(scope.team[member]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedPeople.length;
                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedPeople = scope.selectedPeople.sort(sorter);
                    scope.currPeople = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.selectedPeople[member]['valid_from'] = processDate(scope.selectedPeople[member]['valid_from']);
                        scope.selectedPeople[member]['valid_until'] = processDate(scope.selectedPeople[member]['valid_until']);
                        scope.currPeople.push(Object.assign({}, scope.selectedPeople[member]));
                    }
                };
                scope.sortColumn = function(colName) {
                    if (colName === scope.sortType) {
                        scope.sortReverse = !scope.sortReverse;
                    } else {
                        scope.sortType = colName;
                        scope.sortReverse = false;
                    }
                    scope.renderPeople('new');
                };
                scope.submitOfficePeople = function () {
                    var ind = scope.forms['peopleScMan'];
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;

                    var data = {
                        updateOfficePerson: scope.updateOfficePerson,
                        deleteOfficePerson: scope.deleteNeverMember
                    };
                    data['changed_by'] = scope.currentUser.userID;

                    teamData.updateScManPeopleTeamByID(scope.unit, scope.office,data)
                        .then( function () {
                            scope.updateOfficePerson = [];
                            scope.deleteNeverMember = [];
                            getPersonOfficeTeam(ind);
                            scope.renderPeople('new');
                        },
                        function () {
                            scope.updateStatus[ind] = "Error!";
                            scope.messageType[ind] = 'message-error';
                        },
                        function () {}
                        );
                    return false;
                };
                scope.removeRows = function (member) {
                    var result = window.confirm('Are you sure this person was never a member of this office?' +
                    '\n\nThis will come into force only if, afterwards, you press the "Update" button.');
                    if (result) {
                        scope.deleteNeverMember.push(
                            {
                                id: member.id,
                                science_manager_office_id: member.science_manager_office_id,
                                science_manager_position_id: member.science_manager_position_id,
                                dedication: member.dedication,
                                valid_from: member.valid_from,
                                valid_until: member.valid_until,
                                person_id: member.person_id
                            });
                        var newTeamList = [];
                        for (var el in scope.team) {
                            if (scope.team[el].id !== member.id) {
                                newTeamList.push(scope.team[el]);
                            }
                        }
                        scope.team = newTeamList;
                        scope.renderPeople();
                    }
                };
                scope.updateDataSubmit = function (rowID, updatedRow, updObj, delArrObj) {
                    var uRow = Object.assign({}, updatedRow);
                    var rowExists = false;
                    for (var el in scope[updObj]) {
                        if (scope[updObj][el]['id'] === rowID) {
                            rowExists = true;
                            scope[updObj][el] = uRow;
                        }
                    }
                    if (!rowExists) {
                        scope[updObj].push(uRow);
                    }
                    for (var ind in delArrObj) {
                        for (var el in scope[delArrObj[ind]]) {
                            if (scope[delArrObj[ind]][el]['id'] === rowID) {
                                scope[delArrObj[ind]].splice(el,1);
                            }
                        }
                    }

                };

                function getNameFromID(id, type, rID) {
                    if (type === 'science_manager_position_id') {
                        if (rID === 1) {
                            for (var p in scope.labPositions) {
                                if (scope.labPositions[p]['lab_position_id'] === id) {
                                    return scope.labPositions[p]['name_en'];
                                }
                            }
                        } else if (rID === 2) {
                            for (var p in scope.technicianPositions) {
                                if (scope.technicianPositions[p]['id'] === id) {
                                    return scope.technicianPositions[p]['name_en'];
                                }
                            }
                        } else if (rID === 3) {
                            for (var p in scope.scienceManagementPositions) {
                                if (scope.scienceManagementPositions[p]['id'] === id) {
                                    return scope.scienceManagementPositions[p]['name_en'];
                                }
                            }
                        } else if (rID === 4) {
                            for (var p in scope.administrativePositions) {
                                if (scope.administrativePositions[p]['id'] === id) {
                                    return scope.administrativePositions[p]['name_en'];
                                }
                            }
                        }
                    }
                }
                function getPersonOfficeTeam(ind) {
                    teamData.thisScManPeopleData(scope.unit, scope.office)
                        .then(function (response) {
                            scope.team = response.data.result;
                            scope.currentTeamMembers = [];
                            scope.incompletionCounter = 0;
                            for (var member in scope.team) {
                                if (scope.team[member]['science_manager_position_id'] === null) scope.incompletionCounter++;
                                if (scope.team[member]['dedication'] === null) scope.incompletionCounter++;
                                if (scope.team[member]['valid_from'] === null) scope.incompletionCounter++;
                                scope.team[member]['valid_from'] = processDate(scope.team[member]['valid_from']);
                                scope.team[member]['valid_until'] = processDate(scope.team[member]['valid_until']);
                                scope.currentTeamMembers.push(Object.assign({}, scope.team[member]));

                            }
                            if (ind > -1) {
                                scope.updateStatus[ind] = "Updated!";
                                scope.messageType[ind] = 'message-success';
                                scope.hideMessage[ind] = false;
                                $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                            }
                            scope.renderPeople('new');
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function nameMatching(name1, str) {
                    var name1Final = prepareString(name1);
                    var strFinal = prepareString(str);
                    return name1Final.match(strFinal);
                }
                function prepareString(str) {
                    return str.toLowerCase()
                              .replace(/[áàãâä]/g,'a')
                              .replace(/[éèêë]/g,'e')
                              .replace(/[íìîï]/g,'i')
                              .replace(/[óòõôö]/g,'o')
                              .replace(/[úùûü]/g,'u')
                              .replace(/[ç]/g,'c')
                              .replace(/[ñ]/g,'n');
                }
                function processDate (date) {
                    if (date !== null) {
                        date = new Date(date);
                    }
                    return date;
                }
                function sorter(a,b) {
                    if (scope.sortType === 'valid_from' || scope.sortType === 'valid_until') {
                        if (scope.sortReverse) {
                            if ((moment(a[scope.sortType]).isValid() ? moment(a[scope.sortType]) : moment(0))
                                    .isBefore(moment(b[scope.sortType]).isValid() ? moment(b[scope.sortType]) : moment(0))) {
                                return 1;
                            } else if ((moment(a[scope.sortType]).isValid() ? moment(a[scope.sortType]) : moment(0))
                                    .isAfter(moment(b[scope.sortType]).isValid() ? moment(b[scope.sortType]) : moment(0))) {
                                return -1;
                            }
                        } else {
                            if ((moment(a[scope.sortType]).isValid() ? moment(a[scope.sortType]) : moment().add(100, 'years'))
                                    .isAfter(moment(b[scope.sortType]).isValid() ? moment(b[scope.sortType]) : moment().add(100, 'years'))) {
                                return 1;
                            } else if ((moment(a[scope.sortType]).isValid() ? moment(a[scope.sortType]) : moment().add(100, 'years'))
                                    .isBefore(moment(b[scope.sortType]).isValid() ? moment(b[scope.sortType]) : moment().add(100, 'years'))) {
                                return -1;
                            }
                        }
                    } else if (scope.sortType === 'dedication') {
                        if (scope.sortReverse) {
                            if ((a[scope.sortType] ? a[scope.sortType] : 0) < (b[scope.sortType] ? b[scope.sortType] : 0)) {
                                return 1;
                            } else if ((a[scope.sortType] ? a[scope.sortType] : 0) > (b[scope.sortType] ? b[scope.sortType] : 0)) {
                                return -1;
                            }
                        } else {
                            if ((a[scope.sortType] ? a[scope.sortType] : 101) > (b[scope.sortType] ? b[scope.sortType] : 101)) {
                                return 1;
                            } else if ((a[scope.sortType] ? a[scope.sortType] : 101) < (b[scope.sortType] ? b[scope.sortType] : 101)) {
                                return -1;
                            }
                        }
                    }  else if (scope.sortType === 'science_manager_position_id') {
                        if (scope.sortReverse) {
                            return -(a[scope.sortType] ? getNameFromID(a[scope.sortType],scope.sortType, 3) : 'aa')
                                .localeCompare(b[scope.sortType] ? getNameFromID(b[scope.sortType],scope.sortType, 3) : 'aa');
                        } else {
                            return (a[scope.sortType] ? getNameFromID(a[scope.sortType],scope.sortType, 3) : 'ZZ')
                                .localeCompare(b[scope.sortType] ? getNameFromID(b[scope.sortType],scope.sortType, 3) : 'ZZ');
                        }
                    } else {
                        if (scope.sortReverse) {
                            return -(a[scope.sortType] ? a[scope.sortType] : '')
                                .localeCompare(b[scope.sortType] ? b[scope.sortType] : '');
                        } else {
                            return (a[scope.sortType] ? a[scope.sortType] : '')
                                .localeCompare(b[scope.sortType] ? b[scope.sortType] : '');
                        }
                    }
                    return 0;
                }

                /* for exporting */
                scope.exportSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedPeople = convertData(scope.selectedPeople);
                    var ws = XLSX.utils.json_to_sheet(selectedPeople);
                    wb.SheetNames = [wsName];
                    wb.Sheets = {};
                    wb.Sheets[wsName] = ws;
                    var wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
                    var dateTime = momentToDate(moment(),undefined,'YYYYMMDD_HHmmss')
                    var fname = 'team_science_management_' + scope.office + '_' + dateTime + '.' + type;
                    try {
                    	saveAs(new Blob([s2ab(wbout)],{type:"application/octet-stream"}), fname);
                    } catch(e) { if(typeof console != 'undefined') console.log(e, wbout); }
                };

                function s2ab(s) {
                	if(typeof ArrayBuffer !== 'undefined') {
                		var buf = new ArrayBuffer(s.length);
                		var view = new Uint8Array(buf);
                		for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
                		return buf;
                	} else {
                		var buf = new Array(s.length);
                		for (var i=0; i!=s.length; ++i) buf[i] = s.charCodeAt(i) & 0xFF;
                		return buf;
                	}
                }
                function getOffice(id) {
                    if (id !== undefined) {
                        for (var ind in scope.scienceManagementOffices) {
                            if (id === scope.scienceManagementOffices[ind].id) {
                                return scope.scienceManagementOffices[ind].name_en;
                            }
                        }
                    }
                    return null;
                }
                function getPosition(id) {
                    if (id !== undefined) {
                        for (var ind in scope.scienceManagementPositions) {
                            if (id === scope.scienceManagementPositions[ind].id) {
                                return scope.scienceManagementPositions[ind].name_en;
                            }
                        }
                    }
                    return null;
                }
                function convertData(arrObj) {
                    // selects data for exporting
                    var data = [];
                    if (arrObj.length > 0) {
                        for (var el in arrObj) {
                            data.push({
                                "Person Name": arrObj[el]['person_name'],
                                "Assoc. Key": arrObj[el]['association_key'],
                                "Position": getPosition(arrObj[el]['science_manager_position_id']),
                                "Dedication": arrObj[el]['dedication'],
                                "Office": getOffice(arrObj[el]['science_manager_office_id']),
                                "ORCID": arrObj[el]['ORCID'],
                                "Started": momentToDate(arrObj[el]['valid_from']),
                                "Ended": momentToDate(arrObj[el]['valid_until'])
                            });
                        }
                        return data;
                    }
                    return data;
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
            }
        };
    }];


    angular.module('managementApp')
        .directive('teamPeopleScManOfficePresentation', teamPeopleScManOfficePresentation);

})();