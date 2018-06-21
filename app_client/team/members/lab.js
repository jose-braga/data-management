(function(){

    var teamPeopleLabPresentation =
    ['personData','teamData','authentication', '$timeout',
    function (personData,teamData,authentication,$timeout) {
        return {
            restrict: 'E',
            scope: {
                lab: '@',
                group: '@'
            },
            templateUrl: 'team/members/team.peopleLab.html',
            link:
            function (scope,element,attrs) {
                scope.currentUser = authentication.currentUser();
                scope.sortType = 'person_name';
                scope.sortTypePast = 'person_name';
                scope.sortReverse = false;
                scope.sortReversePast = false;
                scope.pageSize = 10;
                scope.pageSizePast = 10;
                scope.totalFromSearch = 10;
                scope.totalFromSearchPast = 10;
                scope.currentPage = 1;
                scope.currentPagePast = 1;
                scope.searchName = '';
                scope.searchNamePast = '';
                scope.allPeople = [];
                scope.forms = {
                    'peopleLab': 0,
                    'peopleLabPast': 1
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
                       scope.currentPagePast = 1;
                    }
                    var curr = [];
                    var past = [];
                    for (var ind in scope.team) {
                        scope.team[ind]['valid_from'] = processDate(scope.team[ind]['valid_from']);
                        scope.team[ind]['valid_until'] = processDate(scope.team[ind]['valid_until']);
                        if (moment(scope.team[ind]['valid_until']).isAfter(moment())
                                || scope.team[ind]['valid_until'] === null) {
                            curr.push(Object.assign({}, scope.team[ind]));
                        } else {
                            past.push(Object.assign({}, scope.team[ind]));
                        }
                    }
                    scope.totalPeople = curr.length;
                    // now we filter based on search terms
                    scope.selectedPeople = [];
                    for (var member in curr) {
                        var toInclude = 0;
                        var toIncludeDueName = 0;
                        if (scope.searchName !== '') {
                            if (nameMatching(curr[member]['person_name'],scope.searchName) !== null) {
                               toIncludeDueName = 1;
                            }
                        } else {
                            toIncludeDueName = 1;
                        }
                        toInclude = toIncludeDueName;
                        if (toInclude === 1) {
                            scope.selectedPeople.push(curr[member]);
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

                    scope.totalPeoplePast = past.length;
                    // now we filter based on search terms
                    scope.selectedPeoplePast = [];
                    for (var member in past) {
                        var toIncludePast = 0;
                        var toIncludeDueNamePast = 0;
                        if (scope.searchNamePast !== '') {
                            if (nameMatching(past[member]['person_name'],scope.searchNamePast) !== null) {
                               toIncludeDueNamePast = 1;
                            }
                        } else {
                            toIncludeDueNamePast = 1;
                        }
                        toIncludePast = toIncludeDueNamePast;
                        if (toIncludePast === 1) {
                            scope.selectedPeoplePast.push(past[member]);
                        }
                    }
                    scope.totalFromSearchPast = scope.selectedPeoplePast.length;
                    scope.totalPagesPast = Math.ceil(scope.totalFromSearchPast / scope.pageSizePast);
                    scope.pagesPast = [];
                    for (var num=1; num<=scope.totalPagesPast; num++) {
                        scope.pagesPast.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedPeoplePast = scope.selectedPeoplePast.sort(sorterPast);
                    scope.pastPeople = [];
                    for (var member = (scope.currentPagePast - 1) * scope.pageSizePast;
                            member < scope.currentPagePast * scope.pageSizePast && member < scope.totalFromSearchPast;
                            member++) {
                        scope.selectedPeoplePast[member]['valid_from'] = processDate(scope.selectedPeoplePast[member]['valid_from']);
                        scope.selectedPeoplePast[member]['valid_until'] = processDate(scope.selectedPeoplePast[member]['valid_until']);
                        scope.pastPeople.push(Object.assign({}, scope.selectedPeoplePast[member]));
                    }

                };
                scope.sortColumn = function(colName,screen) {
                    if (screen === undefined) {
                        if (colName === scope.sortType) {
                            scope.sortReverse = !scope.sortReverse;
                        } else {
                            scope.sortType = colName;
                            scope.sortReverse = false;
                        }
                    } else {
                        scope.sortType = colName;
                        if (scope.sortReverse === 'true') {scope.sortReverse = true;}
                        else {scope.sortReverse = false;}
                    }
                    scope.renderPeople('new');
                };
                scope.sortColumnPast = function(colName,screen) {
                    if (screen === undefined) {
                        if (colName === scope.sortTypePast) {
                            scope.sortReversePast = !scope.sortReversePast;
                        } else {
                            scope.sortTypePast = colName;
                            scope.sortReversePast = false;
                        }
                    } else {
                        scope.sortTypePast = colName;
                        if (scope.sortReversePast === 'true') {scope.sortReversePast = true;}
                        else {scope.sortReversePast = false;}
                    }
                    scope.renderPeople('new');
                };
                scope.submitLabPeople = function (ind) {
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;

                    var data = {
                        updateLabPerson: scope.updateLabPerson,
                        deleteLabPerson: scope.deleteNeverMember
                    };
                    data['changed_by'] = scope.currentUser.userID;
                    teamData.updateLabPeopleTeamByID(scope.group,scope.lab,data)
                        .then( function () {
                            scope.updateLabPerson = [];
                            scope.deleteNeverMember = [];
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
                    if (type === 'lab_position_id') {
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
                    teamData.thisLabPeopleData(scope.group, scope.lab)
                        .then(function (response) {
                            scope.team = response.data.result; // includes people when lab was in other group

                            scope.currentTeamMembers = [];
                            scope.incompletionCounter = 0;
                            for (var member in scope.team) {
                                if (scope.team[member]['lab_position_id'] === null) scope.incompletionCounter++;
                                if (scope.team[member]['dedication'] === null) scope.incompletionCounter++;
                                if (scope.team[member]['valid_from'] === null) scope.incompletionCounter++;
                                scope.team[member]['valid_from'] = processDate(scope.team[member]['valid_from']);
                                scope.team[member]['valid_until'] = processDate(scope.team[member]['valid_until']);
                                scope.team[member]['labs_groups_valid_from'] = processDate(scope.team[member]['labs_groups_valid_from']);
                                scope.team[member]['labs_groups_valid_until'] = processDate(scope.team[member]['labs_groups_valid_until']);
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
                    } else if (scope.sortType === 'sort_order') {
                        if (scope.sortReverse) {
                            if ((a[scope.sortType] ? a[scope.sortType] : 0) < (b[scope.sortType] ? b[scope.sortType] : 0)) {
                                return 1;
                            } else if ((a[scope.sortType] ? a[scope.sortType] : 0) > (b[scope.sortType] ? b[scope.sortType] : 0)) {
                                return -1;
                            }
                        } else {
                            if ((a[scope.sortType] ? a[scope.sortType] : 1e6) > (b[scope.sortType] ? b[scope.sortType] : 1e6)) {
                                return 1;
                            } else if ((a[scope.sortType] ? a[scope.sortType] : 1e6) < (b[scope.sortType] ? b[scope.sortType] : 1e6)) {
                                return -1;
                            }
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
                    return 0;
                }
                function sorterPast(a,b) {
                    if (scope.sortTypePast === 'valid_from' || scope.sortTypePast === 'valid_until') {
                        if (scope.sortReversePast) {
                            if ((moment(a[scope.sortTypePast]).isValid() ? moment(a[scope.sortTypePast]) : moment(0))
                                    .isBefore(moment(b[scope.sortTypePast]).isValid() ? moment(b[scope.sortTypePast]) : moment(0))) {
                                return 1;
                            } else if ((moment(a[scope.sortTypePast]).isValid() ? moment(a[scope.sortTypePast]) : moment(0))
                                    .isAfter(moment(b[scope.sortTypePast]).isValid() ? moment(b[scope.sortTypePast]) : moment(0))) {
                                return -1;
                            }
                        } else {
                            if ((moment(a[scope.sortTypePast]).isValid() ? moment(a[scope.sortTypePast]) : moment().add(100, 'years'))
                                    .isAfter(moment(b[scope.sortTypePast]).isValid() ? moment(b[scope.sortTypePast]) : moment().add(100, 'years'))) {
                                return 1;
                            } else if ((moment(a[scope.sortTypePast]).isValid() ? moment(a[scope.sortTypePast]) : moment().add(100, 'years'))
                                    .isBefore(moment(b[scope.sortTypePast]).isValid() ? moment(b[scope.sortTypePast]) : moment().add(100, 'years'))) {
                                return -1;
                            }
                        }
                    } else if (scope.sortTypePast === 'dedication') {
                        if (scope.sortReversePast) {
                            if ((a[scope.sortTypePast] ? a[scope.sortTypePast] : 0) < (b[scope.sortTypePast] ? b[scope.sortTypePast] : 0)) {
                                return 1;
                            } else if ((a[scope.sortTypePast] ? a[scope.sortTypePast] : 0) > (b[scope.sortTypePast] ? b[scope.sortTypePast] : 0)) {
                                return -1;
                            }
                        } else {
                            if ((a[scope.sortTypePast] ? a[scope.sortTypePast] : 101) > (b[scope.sortTypePast] ? b[scope.sortTypePast] : 101)) {
                                return 1;
                            } else if ((a[scope.sortTypePast] ? a[scope.sortTypePast] : 101) < (b[scope.sortTypePast] ? b[scope.sortTypePast] : 101)) {
                                return -1;
                            }
                        }
                    } else if (scope.sortTypePast === 'sort_order') {
                        if (scope.sortReversePast) {
                            if ((a[scope.sortTypePast] ? a[scope.sortTypePast] : 0) < (b[scope.sortTypePast] ? b[scope.sortTypePast] : 0)) {
                                return 1;
                            } else if ((a[scope.sortTypePast] ? a[scope.sortTypePast] : 0) > (b[scope.sortTypePast] ? b[scope.sortTypePast] : 0)) {
                                return -1;
                            }
                        } else {
                            if ((a[scope.sortTypePast] ? a[scope.sortTypePast] : 1e6) > (b[scope.sortTypePast] ? b[scope.sortTypePast] : 1e6)) {
                                return 1;
                            } else if ((a[scope.sortTypePast] ? a[scope.sortTypePast] : 1e6) < (b[scope.sortTypePast] ? b[scope.sortTypePast] : 1e6)) {
                                return -1;
                            }
                        }
                    }  else if (scope.sortTypePast === 'lab_position_id') {
                        if (scope.sortReversePast) {
                            return -(a[scope.sortTypePast] ? getNameFromID(a[scope.sortTypePast],scope.sortTypePast, 1) : 'aa')
                                .localeCompare(b[scope.sortTypePast] ? getNameFromID(b[scope.sortTypePast],scope.sortTypePast, 1) : 'aa');
                        } else {
                            return (a[scope.sortTypePast] ? getNameFromID(a[scope.sortTypePast],scope.sortTypePast, 1) : 'ZZ')
                                .localeCompare(b[scope.sortTypePast] ? getNameFromID(b[scope.sortTypePast],scope.sortTypePast, 1) : 'ZZ');
                        }
                    } else {
                        if (scope.sortReversePast) {
                            return -(a[scope.sortTypePast] ? a[scope.sortTypePast] : '')
                                .localeCompare(b[scope.sortTypePast] ? b[scope.sortTypePast] : '');
                        } else {
                            return (a[scope.sortTypePast] ? a[scope.sortTypePast] : '')
                                .localeCompare(b[scope.sortTypePast] ? b[scope.sortTypePast] : '');
                        }
                    }
                    return 0;
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
                                "Assoc. Key": arrObj[el]['association_key'],
                                "Position": getPosition(arrObj[el]['lab_position_id']),
                                "Dedication": arrObj[el]['dedication'],
                                "Office": getOffice(arrObj[el]['lab_id']),
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
        .directive('teamPeopleLabPresentation', teamPeopleLabPresentation);

})();