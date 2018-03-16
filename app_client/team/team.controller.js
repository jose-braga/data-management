// TODO: solved "undefined" in lab affiliations groups

(function(){
/******************************* Controllers **********************************/
    var teamCtrl = function ($scope, $timeout, $mdMedia, $mdPanel,
                            personData, teamData, publications, authentication) {
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
            var submitAffiliations = [];
            for (var el in vm.newPerson.affiliations) {
                if (vm.newPerson.affiliations[el].data.type === 'lab') {
                    // find the lab data to which this affiliation refers to
                    for (var elLab in vm.labs) {
                        if (vm.labs[elLab].lab_id === vm.newPerson.affiliations[el].data.id) {
                            var indLab = elLab;
                            break;
                        }
                    }
                    for (var elHist in vm.labs[indLab].lab_history) {
                        var overlap = timeOverlap(vm.newPerson.affiliations[el].start,
                                                  vm.newPerson.affiliations[el].end,
                                                  vm.labs[indLab].lab_history[elHist].labs_groups_valid_from,
                                                  vm.labs[indLab].lab_history[elHist].labs_groups_valid_until);
                        if (overlap) {
                            var thisData = Object.assign({},vm.newPerson.affiliations[el]);

                            thisData.start = processDate(overlap[0]);
                            thisData.end = processDate(overlap[1]);
                            submitAffiliations.push(thisData);
                        }
                    }
                } else {
                    submitAffiliations = vm.newPerson.affiliations;
                }
            }
            vm.newPerson.affiliations = submitAffiliations;
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
        vm.labNames = function(office) {
            if (office !== undefined) {
                if (office.people_labs_id !== null) {
                    return office.name + '@' + office.group_name;
                }
                return office.name;
            }
            return '';
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
                            officeData['group_id'] = vm.personLab[ind]['group_id'];
                            officeData['group_name'] = vm.personLab[ind]['group_name'];
                            officeData['type'] = 'lab';
                            officeData['labs_groups_valid_from'] = processDate(vm.personLab[ind]['labs_groups_valid_from']);
                            officeData['labs_groups_valid_until'] = processDate(vm.personLab[ind]['labs_groups_valid_until']);
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
        function processDate (date) {
            if (date !== null) {
                date = new Date(date);
            }
            return date;
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
                                "Assoc. Key": arrObj[el]['association_key'],
                                "Position": getPosition(arrObj[el]['technician_position_id']),
                                "Dedication": arrObj[el]['dedication'],
                                "Office": getOffice(arrObj[el]['technician_office_id']),
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
                                "Assoc. Key": arrObj[el]['association_key'],
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

    var teamMembersPublications =
    ['personData','teamData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
    function (personData,teamData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
        return {
            restrict: 'E',
            scope: {
                lab: '@',
                group: '@'
            },
            templateUrl: 'team/publications/team.membersPublications.html',
            link:
            function (scope,element,attrs) {
                //this._mdPanel = $mdPanel;

                scope.teamPublications = [];
                scope.membersPublications = [];

                scope.forms = {
                    'membersPub': 0,
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

                $rootScope.$on('removedLabPublicationsMessage', function (event,data) {
                    getPublications();
                    initializeDetails();
                });

                getPublications();
                initializeDetails();

                scope.showDetailsPublication = function (pub) {
                    var authors = pub.authors_raw.split('; ');
                    var authors_str = '';
                    for (var ind in authors) {
                        if (ind > 0) {
                            authors_str = authors_str + '; ' + authors[ind];
                        } else {
                            authors_str = authors_str + authors[ind];
                        }
                    }
                    pub['authors'] = authors_str;
                    for (var ind in pub.publication_type) {
                        if (ind > 0) {
                            pub['doc_type'] = pub['doc_type'] + '; ' + pub.publication_type[ind].name_en;
                        } else {
                            pub['doc_type'] = pub.publication_type[ind].name_en;
                        }
                    }
                    var if_last_year;
                    for (var ind in pub.impact_factors) {
                        if (ind > 0) {
                            if (if_last_year.year < pub.impact_factors[ind].year) {
                                if_last_year = pub.impact_factors[ind];
                            }
                        } else {
                            if_last_year = pub.impact_factors[ind];
                        }
                    }
                    pub['if_last_year'] = if_last_year;

                    var position = $mdPanel.newPanelPosition()
                                        .absolute()
                                        .center();
                    var config = {
                        //attachTo: angular.element(document.body),
                        controller: pubDetailsCtrl,
                        controllerAs: 'ctrl',
                        templateUrl: 'team/publications/team.membersPublicationDetail.html',
                        locals: {pub: pub},
                        hasBackdrop: true,
                        panelClass: 'publication-details',
                        position: position,
                        disableParentScroll: true,
                        trapFocus: true,
                        zIndex: 150,
                        clickOutsideToClose: true,
                        escapeToClose: true,
                        focusOnOpen: true
                    };
                    $mdPanel.open(config);
                };
                scope.showTable = function () {
                    return $mdMedia('min-width: 1440px');
                };
                scope.sortColumn = function(colName) {
                    if (colName === scope.sortType) {
                        scope.sortReverse = !scope.sortReverse;
                    } else {
                        scope.sortType = colName;
                        scope.sortReverse = false;
                    }
                    scope.renderPublications('new');
                };
                scope.renderPublications = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalPublications = scope.membersPublications.length;
                    scope.selectedPublications = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearPub = parseInt(scope.fromYearPub,10);
                    scope.toYearPub = parseInt(scope.toYearPub,10);
                    for (var ind in scope.membersPublications) {
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearPub)) {
                            if (scope.fromYearPub <= scope.membersPublications[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearPub)) {
                            if (scope.toYearPub >= scope.membersPublications[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedPublications.push(scope.membersPublications[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedPublications.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedPublications = scope.selectedPublications.sort(sorter);
                    scope.currPublications = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currPublications.push(Object.assign({}, scope.selectedPublications[member]));
                    }
                };
                scope.submitMembersPublications = function (ind) {
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;
                    var data = {addPublications: scope.newLabPublications};
                    publications.addMembersPublications(scope.group,scope.lab,data)
                        .then( function () {
                            getPublications();
                            $rootScope.$broadcast('updateLabPublicationsMessage', data);
                            if (ind > -1) {
                                scope.updateStatus[ind] = "Updated!";
                                scope.messageType[ind] = 'message-success';
                                scope.hideMessage[ind] = false;
                                $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                            }
                        },
                        function () {
                            scope.updateStatus[ind] = "Error!";
                            scope.messageType[ind] = 'message-error';
                        },
                        function () {}
                        );
                    return false;
                };
                scope.addPublication = function (pub) {
                    var alreadyAdded = scope.newLabPublications.filter(
                            function(el) {
                                return el.id === pub.id;
                            });
                    if (alreadyAdded.length === 0) {
                        scope.newLabPublications.push(pub);
                    }
                };
                scope.removeRow = function (current, ind) {
                    current.splice(ind,1);
                };

                function getPublications() {
                    publications.thisTeamPublications(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamPublications = response.data.result;
                            getMembersPublications();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function getMembersPublications() {
                    publications.thisMembersPublications(scope.group, scope.lab)
                        .then(function (response) {
                            scope.membersPublicationsAll = response.data.result;
                            var labPubIDs = scope.teamPublications.map(function(obj){return obj.id;});
                            scope.membersPublications = scope.membersPublicationsAll.filter(
                                    function (obj) { return labPubIDs.indexOf(obj.id) === -1;});
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }

                function initializeVariables() {
                    scope.sortReverse = false;
                    scope.sortType = 'year';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    scope.newLabPublications = [];

                    // computes the number of pages
                    scope.totalPublications = scope.membersPublications.length;
                    scope.totalPages = Math.ceil(scope.totalPublications / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderPublications();
                }
                function initializeDetails() {
                    scope.pubTitles = [];
                    scope.thisPublication = [];
                }
                function sorter(a,b) {
                    if (scope.sortType === 'year') {
                        if (scope.sortReverse) {
                            return (a[scope.sortType] ? String(a[scope.sortType]) : String(9999))
                                .localeCompare(b[scope.sortType] ? String(b[scope.sortType]) : String(9999));
                        } else {
                            return -(a[scope.sortType] ? String(a[scope.sortType]) : String(2000))
                                .localeCompare(b[scope.sortType] ? String(b[scope.sortType]) : String(2000));
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
                scope.exportPublicationsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedPublications = convertData(scope.selectedPublications);
                    var ws = XLSX.utils.json_to_sheet(selectedPublications);
                    wb.SheetNames = [wsName];
                    wb.Sheets = {};
                    wb.Sheets[wsName] = ws;
                    var wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
                    var dateTime = momentToDate(moment(),undefined,'YYYYMMDD_HHmmss')
                    var from;
                    var to;
                    if (scope.fromYearPub === undefined || isNaN(scope.fromYearPub)) {
                        from = 'all';
                    } else {
                        from = scope.fromYearPub;
                    }
                    if (scope.toYearPub === undefined || isNaN(scope.toYearPub)) {
                        to = 'all';
                    } else {
                        to = scope.toYearPub;
                    }
                    var fname = 'team_members_publications_' + from + '_' + to
                                + '_' + dateTime + '.' + type;
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
                function convertData(arrObj) {
                    // selects data for exporting
                    var data = [];
                    if (arrObj.length > 0) {
                        for (var el in arrObj) {
                            for (var ind in arrObj[el].publication_type) {
                                if (ind > 0) {
                                    arrObj[el]['doc_type'] = arrObj[el]['doc_type'] + '; ' + arrObj[el].publication_type[ind].name_en;
                                } else {
                                    arrObj[el]['doc_type'] = arrObj[el].publication_type[ind].name_en;
                                }
                            }
                            var if_last_year;
                            for (var ind in arrObj[el].impact_factors) {
                                if (ind > 0) {
                                    if (if_last_year.year < arrObj[el].impact_factors[ind].year) {
                                        if_last_year = arrObj[el].impact_factors[ind];
                                    }
                                } else {
                                    if_last_year = arrObj[el].impact_factors[ind];
                                }
                            }
                            var citations_last_year;
                            for (var ind in arrObj[el].citations) {
                                if (ind > 0) {
                                    if (citations_last_year.year < arrObj[el].citations[ind].year) {
                                        citations_last_year = arrObj[el].citations[ind];
                                    }
                                } else {
                                    citations_last_year = arrObj[el].citations[ind];
                                }
                            }
                            data.push({
                                "Authors": arrObj[el]['authors_raw'],
                                "Tite": arrObj[el]['title'],
                                "Year": arrObj[el]['year'],
                                "Publication Date": arrObj[el]['publication_date'],
                                "Journal Name": arrObj[el]['journal_name'],
                                "Journal Short Name": arrObj[el]['journal_short_name'],
                                "Publisher": arrObj[el]['publisher'],
                                "Publisher City": arrObj[el]['publisher_city'],
                                "ISSN": arrObj[el]['issn'],
                                "EISSN": arrObj[el]['eissn'],
                                "Volume": arrObj[el]['volume'],
                                "Page Start": arrObj[el]['page_start'],
                                "Page End": arrObj[el]['page_end'],
                                "DOI": arrObj[el]['doi'],
                                "WOS": arrObj[el]['wos'],
                                "PubMed ID": arrObj[el]['pubmed_id'],
                                "DOI": arrObj[el]['doi'],
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

    var teamLabPublications =
    ['personData','teamData','publications','authentication',
     '$timeout', '$mdMedia','$mdPanel','$rootScope',
    function (personData,teamData,publications,authentication,
              $timeout, $mdMedia, $mdPanel,$rootScope) {
        return {
            restrict: 'E',
            scope: {
                lab: '@',
                group: '@'
            },
            templateUrl: 'team/publications/team.labPublications.html',
            link:
            function (scope,element,attrs) {
                //this._mdPanel = $mdPanel;

                scope.teamPublications = [];

                scope.forms = {
                    'teamSelectedPub': 0,
                    'teamPubRemove': 1,
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

                $rootScope.$on('updateLabPublicationsMessage', function (event,data) {
                    getPublications();
                    initializeDetails();
                });

                getPublications();
                initializeDetails();

                scope.changeSelectedStatus = function (pub) {
                    for (var ind in scope.teamPublications) {
                        if (pub.labs_publications_id === scope.teamPublications[ind].labs_publications_id) {
                            scope.teamPublications[ind].selected = pub.selected;
                            break;
                        }
                    }
                };
                scope.changePublicStatus = function (pub) {
                    for (var ind in scope.teamPublications) {
                        if (pub.labs_publications_id === scope.teamPublications[ind].labs_publications_id) {
                            scope.teamPublications[ind].public = pub.public;
                            break;
                        }
                    }
                };
                scope.removePublication = function (pub) {
                    for (var ind in scope.teamPublications) {
                        if (pub.labs_publications_id === scope.teamPublications[ind].labs_publications_id) {
                            scope.teamPublications.splice(ind,1);
                            scope.deletePublications.push(pub);
                            break;
                        }
                    }
                    scope.renderPublications('');
                };
                scope.submitSelectedTeamPublications = function (ind) {
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;
                    var data = processSelectedPub(scope.teamPublications,scope.originalTeamPublications);
                    publications.updateTeamSelectedPublications(scope.group,scope.lab,data)
                        .then( function () {
                            getPublications();
                            if (ind > -1) {
                                scope.updateStatus[ind] = "Updated!";
                                scope.messageType[ind] = 'message-success';
                                scope.hideMessage[ind] = false;
                                $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                            }
                        },
                        function () {
                            scope.updateStatus[ind] = "Error!";
                            scope.messageType[ind] = 'message-error';
                        },
                        function () {}
                        );
                    return false;
                };
                scope.submitPublicationRemoval = function(ind) {
                    if (scope.deletePublications.length > 0) {
                        alert("This won't remove the publications from the database." +
                          "\nIt will simply remove the connection of this lab with these publications.");
                        scope.updateStatus[ind] = "Updating...";
                        scope.messageType[ind] = 'message-updating';
                        scope.hideMessage[ind] = false;
                        var data = {deletePublications: scope.deletePublications};
                        publications.removePublicationsTeam(scope.group,scope.lab,data)
                            .then( function () {
                                initializeDetails();
                                getPublications(ind);
                                $rootScope.$broadcast('removedLabPublicationsMessage', data);
                                if (ind > -1) {
                                    scope.updateStatus[ind] = "Updated!";
                                    scope.messageType[ind] = 'message-success';
                                    scope.hideMessage[ind] = false;
                                    $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                }
                            },
                            function () {
                                scope.updateStatus[ind] = "Error!";
                                scope.messageType[ind] = 'message-error';
                            },
                            function () {}
                            );
                    }
                    return false;

                };

                scope.showDetailsPublication = function (pub) {
                    var authors = pub.authors_raw.split('; ');
                    var authors_str = '';
                    for (var ind in authors) {
                        if (ind > 0) {
                            authors_str = authors_str + '; ' + authors[ind];
                        } else {
                            authors_str = authors_str + authors[ind];
                        }
                    }
                    pub['authors'] = authors_str;
                    for (var ind in pub.publication_type) {
                        if (ind > 0) {
                            pub['doc_type'] = pub['doc_type'] + '; ' + pub.publication_type[ind].name_en;
                        } else {
                            pub['doc_type'] = pub.publication_type[ind].name_en;
                        }
                    }
                    var if_last_year;
                    for (var ind in pub.impact_factors) {
                        if (ind > 0) {
                            if (if_last_year.year < pub.impact_factors[ind].year) {
                                if_last_year = pub.impact_factors[ind];
                            }
                        } else {
                            if_last_year = pub.impact_factors[ind];
                        }
                    }
                    pub['if_last_year'] = if_last_year;

                    var position = $mdPanel.newPanelPosition()
                                        .absolute()
                                        .center();
                    var config = {
                        //attachTo: angular.element(document.body),
                        controller: pubDetailsCtrl,
                        controllerAs: 'ctrl',
                        templateUrl: 'team/publications/team.labPublicationDetail.html',
                        locals: {pub: pub},
                        hasBackdrop: true,
                        panelClass: 'publication-details',
                        position: position,
                        disableParentScroll: true,
                        trapFocus: true,
                        zIndex: 150,
                        clickOutsideToClose: true,
                        escapeToClose: true,
                        focusOnOpen: true
                    };

                    $mdPanel.open(config);


                };
                scope.showTable = function () {
                    return $mdMedia('min-width: 1440px');
                };
                scope.sortColumn = function(colName) {
                    if (colName === scope.sortType) {
                        scope.sortReverse = !scope.sortReverse;
                    } else {
                        scope.sortType = colName;
                        scope.sortReverse = false;
                    }
                    scope.renderPublications('new');
                };
                scope.changeSelectedStatus = function (pub) {
                    for (var ind in scope.teamPublications) {
                        if (pub.id === scope.teamPublications[ind].id) {
                            scope.teamPublications[ind].selected = pub.selected;
                            break;
                        }
                    }
                };
                scope.renderPublications = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalPublications = scope.teamPublications.length;
                    scope.selectedPublications = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearPub = parseInt(scope.fromYearPub,10);
                    scope.toYearPub = parseInt(scope.toYearPub,10);
                    for (var ind in scope.teamPublications) {
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearPub)) {
                            if (scope.fromYearPub <= scope.teamPublications[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearPub)) {
                            if (scope.toYearPub >= scope.teamPublications[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedPublications.push(scope.teamPublications[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedPublications.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedPublications = scope.selectedPublications.sort(sorter);
                    scope.currPublications = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currPublications.push(Object.assign({}, scope.selectedPublications[member]));
                    }
                };

                function getPublications() {
                    publications.thisTeamPublications(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamPublications = response.data.result;
                            for (var ind in scope.teamPublications) {
                                if (scope.teamPublications[ind].selected === 1) {
                                    scope.teamPublications[ind].selected = true;
                                } else {
                                    scope.teamPublications[ind].selected = false;
                                }
                                if (scope.teamPublications[ind].public === 1) {
                                    scope.teamPublications[ind].public = true;
                                } else {
                                    scope.teamPublications[ind].public = false;
                                }
                            }
                            scope.originalTeamPublications = JSON.parse(JSON.stringify(scope.teamPublications));
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function initializeVariables() {
                    scope.deletePublications = [];
                    scope.sortReverse = false;
                    scope.sortType = 'year';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    // computes the number of pages
                    scope.totalPublications = scope.teamPublications.length;
                    scope.totalPages = Math.ceil(scope.totalPublications / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderPublications();
                }
                function initializeDetails() {
                    scope.pubTitles = [];
                    scope.thisPublication = [];
                }
                function sorter(a,b) {
                    if (scope.sortType === 'year') {
                        if (scope.sortReverse) {
                            return (a[scope.sortType] ? String(a[scope.sortType]) : String(9999))
                                .localeCompare(b[scope.sortType] ? String(b[scope.sortType]) : String(9999));
                        } else {
                            return -(a[scope.sortType] ? String(a[scope.sortType]) : String(2000))
                                .localeCompare(b[scope.sortType] ? String(b[scope.sortType]) : String(2000));
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
                scope.exportPublicationsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedPublications = convertData(scope.selectedPublications);
                    var ws = XLSX.utils.json_to_sheet(selectedPublications);
                    wb.SheetNames = [wsName];
                    wb.Sheets = {};
                    wb.Sheets[wsName] = ws;
                    var wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
                    var dateTime = momentToDate(moment(),undefined,'YYYYMMDD_HHmmss')
                    var from;
                    var to;
                    if (scope.fromYearPub === undefined || isNaN(scope.fromYearPub)) {
                        from = 'all';
                    } else {
                        from = scope.fromYearPub;
                    }
                    if (scope.toYearPub === undefined || isNaN(scope.toYearPub)) {
                        to = 'all';
                    } else {
                        to = scope.toYearPub;
                    }
                    var fname = 'my_publications_' + from + '_' + to
                                + '_' + dateTime + '.' + type;
                    try {
                    	saveAs(new Blob([s2ab(wbout)],{type:"application/octet-stream"}), fname);
                    } catch(e) { if(typeof console != 'undefined') console.log(e, wbout); }
                };

                function processSelectedPub(current, original) {
                    var add = [];
                    var del = [];
                    var addPublic = [];
                    var delPublic = [];
                    for (var curr in current) {
                        for (var ori in original) {
                            if (current[curr].labs_publications_id === original[ori].labs_publications_id) {
                                if (current[curr].selected === true && original[ori].selected === false) {
                                    add.push(current[curr]);
                                } else if (current[curr].selected === false && original[ori].selected === true) {
                                    del.push(current[curr]);
                                }
                                if (current[curr].public === true && original[ori].public === false) {
                                    addPublic.push(current[curr]);
                                } else if (current[curr].public === false && original[ori].public === true) {
                                    delPublic.push(current[curr]);
                                }
                                break;
                            }
                        }
                    }
                    var objReturn = {};
                    objReturn['addSelectedPub'] = add;
                    objReturn['delSelectedPub'] = del;
                    objReturn['addPublicPub'] = addPublic;
                    objReturn['delPublicPub'] = delPublic;
                    return objReturn;
                }
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
                function convertData(arrObj) {
                    // selects data for exporting
                    var data = [];
                    if (arrObj.length > 0) {
                        for (var el in arrObj) {
                            for (var ind in arrObj[el].publication_type) {
                                if (ind > 0) {
                                    arrObj[el]['doc_type'] = arrObj[el]['doc_type'] + '; ' + arrObj[el].publication_type[ind].name_en;
                                } else {
                                    arrObj[el]['doc_type'] = arrObj[el].publication_type[ind].name_en;
                                }
                            }
                            var if_last_year;
                            for (var ind in arrObj[el].impact_factors) {
                                if (ind > 0) {
                                    if (if_last_year.year < arrObj[el].impact_factors[ind].year) {
                                        if_last_year = arrObj[el].impact_factors[ind];
                                    }
                                } else {
                                    if_last_year = arrObj[el].impact_factors[ind];
                                }
                            }
                            var citations_last_year;
                            for (var ind in arrObj[el].citations) {
                                if (ind > 0) {
                                    if (citations_last_year.year < arrObj[el].citations[ind].year) {
                                        citations_last_year = arrObj[el].citations[ind];
                                    }
                                } else {
                                    citations_last_year = arrObj[el].citations[ind];
                                }
                            }
                            data.push({
                                "Authors": arrObj[el]['authors_raw'],
                                "Tite": arrObj[el]['title'],
                                "Year": arrObj[el]['year'],
                                "Publication Date": arrObj[el]['publication_date'],
                                "Journal Name": arrObj[el]['journal_name'],
                                "Journal Short Name": arrObj[el]['journal_short_name'],
                                "Publisher": arrObj[el]['publisher'],
                                "Publisher City": arrObj[el]['publisher_city'],
                                "ISSN": arrObj[el]['issn'],
                                "EISSN": arrObj[el]['eissn'],
                                "Volume": arrObj[el]['volume'],
                                "Page Start": arrObj[el]['page_start'],
                                "Page End": arrObj[el]['page_end'],
                                "DOI": arrObj[el]['doi'],
                                "WOS": arrObj[el]['wos'],
                                "PubMed ID": arrObj[el]['pubmed_id'],
                                "DOI": arrObj[el]['doi'],
                                "Citations": citations_last_year.citations,
                                "Impact Factors": if_last_year.impact_factor
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

    var pubDetailsCtrl = function(mdPanelRef) {
        this._mdPanelRef = mdPanelRef;
    };


    /**************************** Register components *****************************/
    angular.module('managementApp')
        .directive('teamPeopleLabPresentation', teamPeopleLabPresentation)
        .directive('teamPeopleTechOfficePresentation', teamPeopleTechOfficePresentation)
        .directive('teamPeopleScManOfficePresentation', teamPeopleScManOfficePresentation)
        .directive('teamPeopleAdmOfficePresentation', teamPeopleAdmOfficePresentation)
        .directive('teamPreRegisterMember', teamPreRegisterMember)
        .directive('teamPreRegistrationUser', teamPreRegistrationUser)
        .directive('teamAffiliationsMember', teamAffiliationsMember)

        .directive('teamMembersPublications', teamMembersPublications)
        .directive('teamLabPublications', teamLabPublications)

        .controller('teamCtrl', teamCtrl)
        .controller('pubDetailsCtrl', pubDetailsCtrl)
        ;
})();