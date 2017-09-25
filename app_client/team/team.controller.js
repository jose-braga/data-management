(function(){
/******************************* Controllers **********************************/
    var teamCtrl = function ($scope, $timeout, personData, teamData, authentication) {
        var vm = this;
        vm.toolbarData = {title: 'Please update your team'};
        vm.isLoggedIn = authentication.isLoggedIn();
        vm.currentUser = authentication.currentUser();
        vm.personLab = [];
        vm.newPerson = {};
        vm.newPerson.affiliations = [{people_lab_id: null, start:null, end: null}];
        vm.affiliationsList = [];

        initializeVariables();

        vm.addRows = function (current,type) {
            if (type === 'newAffiliation') {
                var obj = {people_lab_id: null, start: null, end: null};
                current.push(obj);
            }
        };
        vm.show = function(type) {
            if (type === 'labs') {
                if (vm.personLab.length === 0) {
                    return false;
                }
                if (vm.personLab.length === 1 && vm.personLab[0].lab_id === null) {
                    return false;
                }
                return true;
            } else if (type === 'techOffices') {
                if (vm.personTech.length === 0) {
                    return false;
                }
                if (vm.personTech.length === 1 && vm.personTech[0].tech_id === null) {
                    return false;
                }
                return true;
            } else if (type === 'scManOffices') {
                if (vm.personScMan.length === 0) {
                    return false;
                }
                if (vm.personScMan.length === 1 && vm.personScMan[0].sc_man_id === null) {
                    return false;
                }
                return true;
            } else if (type === 'admOffices') {
                if (vm.personAdm.length === 0) {
                    return false;
                }
                if (vm.personAdm.length === 1 && vm.personAdm[0].adm_id === null) {
                    return false;
                }
                return true;
            }
        };
        vm.removeRows = function (current, ind) {
            current.splice(ind,1);
        };
        vm.submitRegistration = function(ind) {
            vm.updateStatus[ind] = "Creating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = vm.newPerson;
            data['changed_by'] = vm.currentUser.userID;
            data['earliest_date'] = findEarliestDate();
            teamData.preRegisterMember(data)
                .then(function () {
                    if (ind > -1) {
                        vm.updateStatus[ind] = "Pre-registration started. To continue ask new user to check his/her personal email.";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () {
                            vm.hideMessage[ind] = true;
                        }, 5000);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
        };
        function findEarliestDate(){
            var dates = [];
            var minDate;
            for (var ind in vm.newPerson.affiliations) {
                if (vm.newPerson.affiliations[ind].start !== null) {
                    dates.push(moment(vm.newPerson.affiliations[ind].start));
                }
            }

            if (dates.length === 0) {
                return null;
            } else {
                minDate = dates[0];
                for (var ind in dates) {
                    if (dates[ind].isBefore(minDate)) {
                        minDate = dates[ind];
                    }
                }
                return minDate;
            }
        }
        function getPersonAffiliations(personID, ind) {
            personData.thisPersonData(personID)
                .then(function (response) {
                    vm.personLab = response.data.result.lab_data;
                    vm.personTech = response.data.result.technician_offices;
                    vm.personScMan = response.data.result.science_manager_offices;
                    vm.personAdm = response.data.result.administrative_offices;
                    var officeData;
                    for (var ind in vm.personLab) {
                        officeData = {};
                        if (vm.personLab[ind].people_lab_id !== null) {
                            officeData['id'] = vm.personLab[ind]['lab_id'];
                            officeData['name'] = vm.personLab[ind]['lab'];
                            officeData['type'] = 'lab';
                            vm.affiliationsList.push(officeData);
                        }
                    }
                    for (var ind in vm.personTech) {
                        officeData = {};
                        if (vm.personTech[ind].tech_id !== null) {
                            officeData['id'] = vm.personTech[ind]['tech_office_id'];
                            officeData['name'] = vm.personTech[ind]['tech_office_name_en'];
                            officeData['type'] = 'technician';
                            vm.affiliationsList.push(officeData);
                        }
                    }
                    for (var ind in vm.personScMan) {
                        officeData = {};
                        if (vm.personScMan[ind].sc_man_id !== null) {
                            officeData['id'] = vm.personScMan[ind]['sc_man_office_id'];
                            officeData['name'] = vm.personScMan[ind]['sc_man_office_name_en'];
                            officeData['type'] = 'scienceManager';
                            vm.affiliationsList.push(officeData);
                        }
                    }
                    for (var ind in vm.personAdm) {
                        officeData = {};
                        if (vm.personAdm[ind].adm_id !== null) {
                            officeData['id'] = vm.personAdm[ind]['adm_office_id'];
                            officeData['name'] = vm.personAdm[ind]['adm_office_name_en'];
                            officeData['type'] = 'administrative';
                            vm.affiliationsList.push(officeData);
                        }
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
        }
        function getDataLists() {
             personData.usernames()
                .then(function (response) {
                    vm.usernames = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });

            personData.institutionCities()
                .then(function (response) {
                    vm.institutionCities = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.roles()
                .then(function (response) {
                    vm.roles = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.labPositions()
                .then(function (response) {
                    vm.labPositions = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.labs()
                .then(function (response) {
                    vm.labs = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.units()
                .then(function (response) {
                    vm.units = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.administrativeOffices()
                .then(function (response) {
                    vm.administrativeOffices = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.administrativePositions()
                .then(function (response) {
                    vm.administrativePositions = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.scienceManagementOffices()
                .then(function (response) {
                    vm.scienceManagementOffices = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.scienceManagementPositions()
                .then(function (response) {
                    vm.scienceManagementPositions = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.facilities()
                .then(function (response) {
                    vm.facilities = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.technicianPositions()
                .then(function (response) {
                    vm.technicianPositions = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
        }
        function initializeVariables() {
            vm.forms = {
                'teamPreRegistration': 0
            };
            var numberCards = Object.keys(vm.forms).length;
            vm.updateStatus = [];
            vm.messageType = [];
            vm.hideMessage = [];
            for (var i=0; i<numberCards; i++) {
                vm.updateStatus.push('');
                vm.messageType.push('message-updating');
                vm.hideMessage.push(true);
            }
            vm.currentUser = authentication.currentUser();
            vm.accessPermission = authentication.access('team');
            if (vm.accessPermission) {
                getPersonAffiliations(vm.currentUser.personID);
                getDataLists();

            }
            getDataLists();
        }
    };

    /******************************** Directives **********************************/

    var teamPreRegisterMember = function () {
        return {
            restrict: 'E',
            templateUrl: 'team/pre-register/team.pre-register.member.html'
        };
    };

    var teamPreRegistrationUser = function () {
        return {
            restrict: 'E',
            templateUrl: 'team/pre-register/team.pre-register.userCreation.html'
        };
    };

    var teamAffiliationsMember = function () {
        return {
            restrict: 'E',
            templateUrl: 'team/pre-register/team.pre-register.affiliations.html'
        };
    };

    var teamPeopleLabPresentation =
    ['personData','teamData','authentication', '$timeout',
    function (personData,teamData,authentication,$timeout) {
        return {
            restrict: 'E',
            scope: {
                lab: '@'
            },
            templateUrl: 'team/members/team.peopleLab.html',
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
                    'peopleLab': 0,
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

                scope.updateLabPerson = [];
                scope.deleteNeverMember = [];

                getPersonLabs(-1);
                personData.labPositions()
                    .then(function (response) {
                        scope.labPositions = response.data.result;
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
                personData.labs()
                    .then(function (response) {
                        scope.labs = response.data.result;
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
                scope.submitLabPeople = function () {
                    var ind = scope.forms['peopleLab'];
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;

                    var data = {
                        updateLabPerson: scope.updateLabPerson,
                        deleteLabPerson: scope.deleteNeverMember
                    };
                    data['changed_by'] = scope.currentUser.userID;
                    teamData.updateLabPeopleTeamByID(scope.lab,data)
                        .then( function () {
                            getPersonLabs(ind);
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
                    var result = window.confirm('Are you sure this person was never a member of your lab?' +
                    '\n\nThis will come into force only if, afterwards, you press the "Update" button.');
                    if (result) {
                        scope.deleteNeverMember.push(
                            {
                                id: member.id,
                                lab_id: member.lab_id,
                                lab_position_id: member.lab_position_id,
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
                    //TODO:  correct for rid = 3 and 4
                    if (type === 'position_id') {
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
                            for (var p in scope.technicianPositions) {
                                if (scope.technicianPositions[p]['id'] === id) {
                                    return scope.technicianPositions[p]['name_en'];
                                }
                            }
                        } else if (rID === 4) {
                            for (var p in scope.technicianPositions) {
                                if (scope.technicianPositions[p]['id'] === id) {
                                    return scope.technicianPositions[p]['name_en'];
                                }
                            }
                        }
                    }
                }
                function getPersonLabs(ind) {
                    teamData.thisLabPeopleData(scope.lab)
                        .then(function (response) {
                            scope.team = response.data.result;
                            scope.currentTeamMembers = [];
                            scope.incompletionCounter = 0;
                            for (var member in scope.team) {
                                if (scope.team[member]['lab_position_id'] === null) scope.incompletionCounter++;
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
                            return (moment(a[scope.sortType]).isValid() ? moment(a[scope.sortType]) : moment(0))
                                    .isBefore(moment(b[scope.sortType]).isValid() ? moment(b[scope.sortType]) : moment(0));
                        } else {
                            return (moment(a[scope.sortType]).isValid() ? moment(a[scope.sortType]) : moment())
                                    .isAfter(moment(b[scope.sortType]).isValid() ? moment(b[scope.sortType]) : moment());
                        }
                    } else if (scope.sortType === 'dedication') {
                        if (scope.sortReverse) {
                            return (a[scope.sortType] ? a[scope.sortType] : 101) > (b[scope.sortType] ? b[scope.sortType] : 101);
                        } else {
                            return (a[scope.sortType] ? a[scope.sortType] : 0) < (b[scope.sortType] ? b[scope.sortType] : 0);
                        }
                    }  else if (scope.sortType === 'lab_position_id') {
                        if (scope.sortReverse) {
                            return -(a[scope.sortType] ? getNameFromID(a[scope.sortType],scope.sortType, 1) : 'aa')
                                .localeCompare(b[scope.sortType] ? getNameFromID(b[scope.sortType],scope.sortType, 1) : 'aa');
                        } else {
                            return (a[scope.sortType] ? getNameFromID(a[scope.sortType],scope.sortType, 1) : 'ZZ')
                                .localeCompare(b[scope.sortType] ? getNameFromID(b[scope.sortType],scope.sortType, 1) : 'ZZ');
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
                    var fname = 'team_lab_' + scope.lab + '_' + dateTime + '.' + type;
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
                        for (var ind in scope.labs) {
                            if (id === scope.labs[ind].lab_id) {
                                return scope.labs[ind].name;
                            }
                        }
                    }
                    return null;
                }
                function getPosition(id) {
                    if (id !== undefined) {
                        for (var ind in scope.labPositions) {
                            if (id === scope.labPositions[ind].lab_position_id) {
                                return scope.labPositions[ind].name_en;
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
                                "Position": getPosition(arrObj[el]['lab_position_id']),
                                "Dedication": arrObj[el]['dedication'],
                                "Office": getOffice(arrObj[el]['lab_id']),
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

    var teamPeopleTechOfficePresentation =
    ['personData','teamData','authentication','$timeout',
    function (personData,teamData,authentication,$timeout) {
        return {
            restrict: 'E',
            scope: {
                office: '@'
            },
            templateUrl: 'team/members/team.peopleTechOffice.html',
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
                    'peopleTech': 0
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
                personData.technicianPositions()
                    .then(function (response) {
                        scope.technicianPositions = response.data.result;
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
                personData.facilities()
                    .then(function (response) {
                        scope.technicianOffices = response.data.result;
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
                    var ind = scope.forms['peopleTech'];
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;

                    var data = {
                        updateOfficePerson: scope.updateOfficePerson,
                        deleteOfficePerson: scope.deleteNeverMember
                    };
                    data['changed_by'] = scope.currentUser.userID;
                    teamData.updateTechPeopleTeamByID(scope.office,data)
                        .then( function () {
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
                    var result = window.confirm('Are you sure this person was never a member of this facility?' +
                    '\n\nThis will come into force only if, afterwards, you press the "Update" button.');
                    if (result) {
                        scope.deleteNeverMember.push(
                            {
                                id: member.id,
                                technician_office_id: member.technician_office_id,
                                technician_position_id: member.technician_position_id,
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
                    //TODO:  correct for rid = 3 and 4
                    if (type === 'technician_position_id') {
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
                            for (var p in scope.technicianPositions) {
                                if (scope.technicianPositions[p]['id'] === id) {
                                    return scope.technicianPositions[p]['name_en'];
                                }
                            }
                        } else if (rID === 4) {
                            for (var p in scope.technicianPositions) {
                                if (scope.technicianPositions[p]['id'] === id) {
                                    return scope.technicianPositions[p]['name_en'];
                                }
                            }
                        }
                    }
                }
                function getPersonOfficeTeam(ind) {
                    teamData.thisTechPeopleData(scope.office)
                        .then(function (response) {
                            scope.team = response.data.result;
                            scope.currentTeamMembers = [];
                            scope.incompletionCounter = 0;
                            for (var member in scope.team) {
                                if (scope.team[member]['technician_position_id'] === null) scope.incompletionCounter++;
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
                            return (moment(a[scope.sortType]).isValid() ? moment(a[scope.sortType]) : moment(0))
                                    .isBefore(moment(b[scope.sortType]).isValid() ? moment(b[scope.sortType]) : moment(0));
                        } else {
                            return (moment(a[scope.sortType]).isValid() ? moment(a[scope.sortType]) : moment())
                                    .isAfter(moment(b[scope.sortType]).isValid() ? moment(b[scope.sortType]) : moment());
                        }
                    } else if (scope.sortType === 'dedication') {
                        if (scope.sortReverse) {
                            return (a[scope.sortType] ? a[scope.sortType] : 101) > (b[scope.sortType] ? b[scope.sortType] : 101);
                        } else {
                            return (a[scope.sortType] ? a[scope.sortType] : 0) < (b[scope.sortType] ? b[scope.sortType] : 0);
                        }
                    }  else if (scope.sortType === 'technician_position_id') {
                        if (scope.sortReverse) {
                            return -(a[scope.sortType] ? getNameFromID(a[scope.sortType],scope.sortType, 2) : 'aa')
                                .localeCompare(b[scope.sortType] ? getNameFromID(b[scope.sortType],scope.sortType, 2) : 'aa');
                        } else {
                            return (a[scope.sortType] ? getNameFromID(a[scope.sortType],scope.sortType, 2) : 'ZZ')
                                .localeCompare(b[scope.sortType] ? getNameFromID(b[scope.sortType],scope.sortType, 2) : 'ZZ');
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
                    var fname = 'team_facility_' + scope.office + '_' + dateTime + '.' + type;
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
                        for (var ind in scope.technicianOffices) {
                            if (id === scope.technicianOffices[ind].id) {
                                return scope.technicianOffices[ind].name_en;
                            }
                        }
                    }
                    return null;
                }
                function getPosition(id) {
                    if (id !== undefined) {
                        for (var ind in scope.technicianPositions) {
                            if (id === scope.technicianPositions[ind].id) {
                                return scope.technicianPositions[ind].name_en;
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
                                "Position": getPosition(arrObj[el]['technician_position_id']),
                                "Dedication": arrObj[el]['dedication'],
                                "Office": getOffice(arrObj[el]['technician_office_id']),
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

    var teamPeopleScManOfficePresentation =
    ['personData','teamData','authentication','$timeout',
    function (personData,teamData,authentication,$timeout) {
        return {
            restrict: 'E',
            scope: {
                office: '@'
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
                    teamData.updateScManPeopleTeamByID(scope.office,data)
                        .then( function () {
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
                    //TODO:  correct for rid = 3 and 4
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
                    teamData.thisScManPeopleData(scope.office)
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
                            return (moment(a[scope.sortType]).isValid() ? moment(a[scope.sortType]) : moment(0))
                                    .isBefore(moment(b[scope.sortType]).isValid() ? moment(b[scope.sortType]) : moment(0));
                        } else {
                            return (moment(a[scope.sortType]).isValid() ? moment(a[scope.sortType]) : moment())
                                    .isAfter(moment(b[scope.sortType]).isValid() ? moment(b[scope.sortType]) : moment());
                        }
                    } else if (scope.sortType === 'dedication') {
                        if (scope.sortReverse) {
                            return (a[scope.sortType] ? a[scope.sortType] : 101) > (b[scope.sortType] ? b[scope.sortType] : 101);
                        } else {
                            return (a[scope.sortType] ? a[scope.sortType] : 0) < (b[scope.sortType] ? b[scope.sortType] : 0);
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
                                "Position": getPosition(arrObj[el]['science_manager_position_id']),
                                "Dedication": arrObj[el]['dedication'],
                                "Office": getOffice(arrObj[el]['science_manager_office_id']),
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

    var teamPeopleAdmOfficePresentation =
    ['personData','teamData','authentication','$timeout',
    function (personData,teamData,authentication,$timeout) {
        return {
            restrict: 'E',
            scope: {
                office: '@'
            },
            templateUrl: 'team/members/team.peopleAdmOffice.html',
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
                    'peopleAdm': 0
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
                personData.administrativePositions()
                    .then(function (response) {
                        scope.administrativePositions = response.data.result;
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
                personData.administrativeOffices()
                    .then(function (response) {
                        scope.administrativeOffices = response.data.result;
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
                    var ind = scope.forms['peopleAdm'];
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;
                    var data = {
                        updateOfficePerson: scope.updateOfficePerson,
                        deleteOfficePerson: scope.deleteNeverMember
                    };
                    data['changed_by'] = scope.currentUser.userID;
                    teamData.updateAdmPeopleTeamByID(scope.office,data)
                        .then( function () {
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
                                administrative_office_id: member.administrative_office_id,
                                administrative_position_id: member.administrative_position_id,
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
                    //TODO:  correct for rid = 3 and 4
                    if (type === 'administrative_position_id') {
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
                    teamData.thisAdmPeopleData(scope.office)
                        .then(function (response) {
                            scope.team = response.data.result;
                            scope.currentTeamMembers = [];
                            scope.incompletionCounter = 0;
                            for (var member in scope.team) {
                                if (scope.team[member]['administrative_position_id'] === null) scope.incompletionCounter++;
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
                            return (moment(a[scope.sortType]).isValid() ? moment(a[scope.sortType]) : moment(0))
                                    .isBefore(moment(b[scope.sortType]).isValid() ? moment(b[scope.sortType]) : moment(0));
                        } else {
                            return (moment(a[scope.sortType]).isValid() ? moment(a[scope.sortType]) : moment())
                                    .isAfter(moment(b[scope.sortType]).isValid() ? moment(b[scope.sortType]) : moment());
                        }
                    } else if (scope.sortType === 'dedication') {
                        if (scope.sortReverse) {
                            return (a[scope.sortType] ? a[scope.sortType] : 101) > (b[scope.sortType] ? b[scope.sortType] : 101);
                        } else {
                            return (a[scope.sortType] ? a[scope.sortType] : 0) < (b[scope.sortType] ? b[scope.sortType] : 0);
                        }
                    }  else if (scope.sortType === 'administrative_position_id') {
                        if (scope.sortReverse) {
                            return -(a[scope.sortType] ? getNameFromID(a[scope.sortType],scope.sortType, 4) : 'aa')
                                .localeCompare(b[scope.sortType] ? getNameFromID(b[scope.sortType],scope.sortType, 4) : 'aa');
                        } else {
                            return (a[scope.sortType] ? getNameFromID(a[scope.sortType],scope.sortType, 4) : 'ZZ')
                                .localeCompare(b[scope.sortType] ? getNameFromID(b[scope.sortType],scope.sortType, 4) : 'ZZ');
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
                    var fname = 'team_administrative_' + scope.office + '_' + dateTime + '.' + type;
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
                        for (var ind in scope.administrativeOffices) {
                            if (id === scope.administrativeOffices[ind].id) {
                                return scope.administrativeOffices[ind].name_en;
                            }
                        }
                    }
                    return null;
                }
                function getPosition(id) {
                    if (id !== undefined) {
                        for (var ind in scope.administrativePositions) {
                            if (id === scope.administrativePositions[ind].id) {
                                return scope.administrativePositions[ind].name_en;
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
                                "Position": getPosition(arrObj[el]['administrative_position_id']),
                                "Dedication": arrObj[el]['dedication'],
                                "Office": getOffice(arrObj[el]['administrative_office_id']),
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


    /**************************** Register components *****************************/
    angular.module('managementApp')
        .directive('teamPeopleLabPresentation', teamPeopleLabPresentation)
        .directive('teamPeopleTechOfficePresentation', teamPeopleTechOfficePresentation)
        .directive('teamPeopleScManOfficePresentation', teamPeopleScManOfficePresentation)
        .directive('teamPeopleAdmOfficePresentation', teamPeopleAdmOfficePresentation)
        .directive('teamPreRegisterMember', teamPreRegisterMember)
        .directive('teamPreRegistrationUser', teamPreRegistrationUser)
        .directive('teamAffiliationsMember', teamAffiliationsMember)

        .controller('teamCtrl', teamCtrl)
        ;
})();