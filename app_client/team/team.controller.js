(function(){
/******************************* Controllers **********************************/
    var teamCtrl = function ($scope, $timeout, $mdMedia, $mdPanel, $location, $anchorScroll,
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

        vm.getSearchResults = function(name) {
            if (name === undefined) name = '';
            name = name.toLowerCase();
            vm.searchResults = [];
            if (name.length > 3) {
                for (var ind in vm.allPeople) {
                    if (nameMatching(vm.allPeople[ind].name,vm.searchName) !== null) {
                       vm.searchResults.push(vm.allPeople[ind]);
                    }
                }
            }
        };

        vm.showLabName = function (person) {
            if (person.lab_id !== null) {
                return person.lab_name + '@' + person.group_name;
            }
            if (person.technician_office_id !== null) {
                return person.technician_office_name;
            }
            if (person.science_manager_office_id !== null) {
                return person.science_manager_office_name;
            }
            if (person.administrative_office_id !== null) {
                return person.administrative_office_name;
            }
        };
        vm.showUnitName = function (person) {
            if (person.lab_id !== null) {
                return person.unit_name;
            }
            if (person.technician_office_id !== null) {
                return person.technician_unit_name;
            }
            if (person.science_manager_office_id !== null) {
                return person.science_manager_unit_name;
            }
            if (person.administrative_office_id !== null) {
                return person.administrative_unit_name;
            }
        };

        vm.gotoSection = function (place) {
            $anchorScroll(place);
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
        function getAllPeopleData() {
            teamData.allPeopleData()
                .then(function (response) {
                    vm.allPeople = response.data.result;
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
                getAllPeopleData();
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
        function nameMatching(name1, str) {
            var name1Final = prepareString(name1);
            var strFinal = prepareString(str);
            var strSplit = strFinal.split(' ');
            for (var el in strSplit) {
                if (name1Final.match(strSplit[el]) === null) {
                    return null;
                }
            }
            return true;
        }
        function prepareString(str) {
            return str.toLowerCase()
                      .replace(/[áàãâä]/g,'a')
                      .replace(/[éèêë]/g,'e')
                      .replace(/[íìîï]/g,'i')
                      .replace(/[óòõôö]/g,'o')
                      .replace(/[úùûü]/g,'u')
                      .replace(/[ç]/g,'c')
                      .replace(/[ñ]/g,'n')
        }
    };

    /******************************** Directives **********************************/

    var teamPreRegistrationSearch = function () {
        return {
            restrict: 'E',
            templateUrl: 'team/pre-register/team.pre-register.search.html'
        };
    };

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

    var pubDetailsCtrl = function(mdPanelRef) {
        this._mdPanelRef = mdPanelRef;
    };


    /**************************** Register components *****************************/
    angular.module('managementApp')
        .directive('teamPreRegisterMember', teamPreRegisterMember)
        .directive('teamPreRegistrationUser', teamPreRegistrationUser)
        .directive('teamAffiliationsMember', teamAffiliationsMember)
        .directive('teamPreRegistrationSearch', teamPreRegistrationSearch)

        .controller('teamCtrl', teamCtrl)
        .controller('pubDetailsCtrl', pubDetailsCtrl)
        ;
})();