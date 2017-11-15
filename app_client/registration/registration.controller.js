(function(){
/******************************* Controllers **********************************/
    var registrationCtrl = function ($scope, $timeout, personData, registrationData, authentication) {
        var GLOBAL_MANAGER_PERMISSION = 5;
        var vm = this;
        vm.toolbarData = {title: 'Add a new member to institution'};
        vm.selectedTab = 0;
        vm.isLoggedIn = authentication.isLoggedIn();
        vm.currentUser = authentication.currentUser();


        // initialize variables
        initializeDetails();
        initializeVariables();

        vm.addRows = function (current,type) {
            var obj = {};
            if (type === 'affiliationsLab') {
                obj = {lab_id: null, lab: null, dedication: null, lab_position_id: null,
                       group_id: null, group_name: null, start: null, end: null,
                       unit_id: null, unit: null};
                current.push(obj);
            } else if (type === 'scienceManager') {
                obj = {office_id: null, dedication: null, office_position_id: null,
                        start: null, end: null};
                current.push(obj);
            } else if (type === 'technician') {
                obj = {office_id: null, dedication: null, office_position_id: null,
                        start: null, end: null};
                current.push(obj);
            } else if (type === 'administrative') {
                obj = {office_id: null, dedication: null, office_position_id: null,
                        start: null, end: null};
                current.push(obj);
            } else if (type === 'department') {
                obj = {department_id: null, start: null, end: null};
                current.push(obj);
            } else if (type === 'jobs') {
                obj = {situation: null, category_id: null,
                       funding_agency_id: null,
                       management_entity_id: null, unit: null,
                       dedication: null, organization: null,
                       start: null, end: null, maximum_end: null};
                current.push(obj);
            } else if (type === 'responsibles') {
                obj = {responsible_id: null,
                       valid_from: null, valid_until: null};
                current.push(obj);
            } else if (type === 'fellowship') {
                obj = {fellowship_type_id: null, funding_agency_id: null,
                       management_entity_id: null, reference: null,
                      start: null, end: null, maximum_end: null};
                current.push(obj);
            } else if (type === 'contract') {
                obj = {contract_type_id: null, funding_agency_id: null,
                       management_entity_id: null, reference: null,
                      start: null, end: null, maximum_end: null};
                current.push(obj);
            } else if (type === 'volunteer') {
                obj = {start: null, end: null};
                current.push(obj);
            }
        };
        vm.nothingToShow = function (arrObj) {
            if (arrObj !== null && arrObj !== undefined) {
                if (arrObj.length === 0) return true;
                return false;
            }
            return true;
        };
        vm.removeRows = function (current, ind) {
            current.splice(ind,1);
        };
        vm.rolePresent = function (roleList, role) {
            for (var ind in roleList) {
                if (roleList[ind].name_en === role) return true;
            }
            return false;
        };
        vm.contractPresent = function (contractTypes, contract) {
            for (var ind in contractTypes) {
                if (contractTypes[ind].type === contract) return true;
            }
            return false;
        };
        vm.submitRegistration = function (ind) {
            vm.updateStatus[ind] = "Creating...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            var data = vm.thisPerson;

            var submitAffiliations = [];
            for (var el in vm.thisPerson.researcher_data.affiliation_lab) {
                // find the lab data to which this affiliation refers to
                for (var elLab in vm.labs) {
                    if (vm.labs[elLab].lab_id === vm.thisPerson.researcher_data.affiliation_lab[el].lab_id) {
                        var indLab = elLab;
                        break;
                    }
                }
                for (var elHist in vm.labs[indLab].lab_history) {
                    var overlap = timeOverlap(vm.thisPerson.researcher_data.affiliation_lab[el].start,
                                              vm.thisPerson.researcher_data.affiliation_lab[el].end,
                                              vm.labs[indLab].lab_history[elHist].labs_groups_valid_from,
                                              vm.labs[indLab].lab_history[elHist].labs_groups_valid_until);
                    if (overlap) {
                        var thisData = Object.assign({},vm.thisPerson.researcher_data.affiliation_lab[el]);
                        thisData.start = processDate(overlap[0]);
                        thisData.end = processDate(overlap[1]);
                        thisData.people_lab_id = 'new';
                        submitAffiliations.push(thisData);
                    }
                }
            }
            vm.thisPerson.researcher_data.affiliation_lab = submitAffiliations;
            data['changed_by'] = vm.currentUser.userID;
            data['earliest_date'] = findEarliestDate();
            console.log(data);
            registrationData.addNewPersonData(data)
                .then(function () {
                    if (ind > -1) {
                        vm.updateStatus[ind] = "Created!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () {
                            vm.hideMessage[ind] = true;
                            initializeDetails();
                            initializeVariables();
                        }, 1500);
                    }
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                    /* For handling errors on registration
                    registrationData.deletePersonErrorData(data.username)
                        .then(function () {
                            vm.updateStatus[ind] = "Error! Check data and try again.";
                            vm.messageType[ind] = 'message-error';
                            $timeout(function () {
                                    vm.hideMessage[ind] = true;
                            }, 1500);
                        },
                        function () {
                            vm.updateStatus[ind] = "Critical error! Defective data could not be deleted!";
                            vm.messageType[ind] = 'message-error';
                        },
                        function () {}
                        );
                    */
                },
                function () {}
                );

        };
        vm.switchValue = function (val) {
            if (val === 1 || val === true || val === 'Yes') return 'Yes';
            return 'No';
        };
        vm.updateOnSelect = function (arrObj, source, num, keyID, keyUpd){
            for (var el in source) {
                if(source[el][keyID] === arrObj[num][keyID]) {
                    for (var indKey in keyUpd) {
                        arrObj[num][keyUpd[indKey]] = source[el][keyUpd[indKey]];
                    }
                }
            }
        };

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
        function processDate (date) {
            if (date !== null) {
                date = new Date(date);
            }
            return date;
        }
        function findEarliestDate(){
            var dates = [];
            var minDate;
            var datesLab = [];
            var datesTech = [];
            var datesScMan = [];
            var datesAdm = [];
            var datesDep = [];
            for (var ind in vm.thisPerson.researcher_data.affiliation_lab) {
                if (vm.thisPerson.researcher_data.affiliation_lab[ind].lab_id !== null) {
                    if (vm.thisPerson.researcher_data.affiliation_lab[ind].start !== null) {
                        datesLab.push(moment(vm.thisPerson.researcher_data.affiliation_lab[ind].start));
                    }
                }
            }
            for (var ind in vm.thisPerson.technician_data.office) {
                if (vm.thisPerson.technician_data.office[ind].office_id !== null) {
                    if (vm.thisPerson.technician_data.office[ind].start !== null) {
                        datesTech.push(moment(vm.thisPerson.technician_data.office[ind].start));
                    }
                }
            }
            for (var ind in vm.thisPerson.science_manager_data.office) {
                if (vm.thisPerson.science_manager_data.office[ind].office_id !== null) {
                    if (vm.thisPerson.science_manager_data.office[ind].start !== null) {
                        datesScMan.push(moment(vm.thisPerson.science_manager_data.office[ind].start));
                    }
                }
            }
            for (var ind in vm.thisPerson.administrative_data.office) {
                if (vm.thisPerson.administrative_data.office[ind].office_id !== null) {
                    if (vm.thisPerson.administrative_data.office[ind].start !== null) {
                        datesScMan.push(moment(vm.thisPerson.administrative_data.office[ind].start));
                    }
                }
            }
            for (var ind in vm.thisPerson.affiliationsDepartment) {
                if (vm.thisPerson.affiliationsDepartment[ind].department_id !== null) {
                    if (vm.thisPerson.affiliationsDepartment[ind].start !== null) {
                        datesDep.push(moment(vm.thisPerson.affiliationsDepartment[ind].start));
                    }
                }
            }
            dates = dates.concat(datesLab,datesTech,datesScMan,datesAdm,datesDep);
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
        function initializeDetails() {
            vm.thisPerson = {
                    birth_date: null,
                    nationalities: [],
                    affiliationsDepartment: [],
                    roles: [],
                    personal_phone: [],
                    personal_email: [],
                    work_phone: [],
                    work_email: [],
                    researcher_data: {affiliation_lab: []},
                    science_manager_data: {office: []},
                    technician_data: {office: []},
                    administrative_data: {office: []},
                    jobs: [],
                    responsibles: [],
                    permissions: {'permissions_id': 40}
                };
        }
        function initializeVariables() {
            vm.forms = {
                'registrationEssential':            0,
                'registrationAdditional':           1
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
            vm.accessPermission = authentication.access('registration');
            vm.currentUser = authentication.currentUser();

            getDataLists();
        }
        function getDataLists() {
            personData.usernames()
                .then(function (response) {
                    vm.usernames = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.permissions()
                .then(function (response) {
                    var data = response.data.result;
                    var newData = [];
                    if (vm.currentUser.stat > GLOBAL_MANAGER_PERMISSION) {
                        for (var ind in data) {
                            if (data[ind].permissions_id >= vm.currentUser.stat) {
                                newData.push(data[ind]);
                            }
                        }
                        vm.permissions = newData;
                    } else {
                        vm.permissions = data;
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.fundingAgencies()
                .then(function (response) {
                    vm.fundingAgencies = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.managementEntities()
                .then(function (response) {
                    vm.managementEntities = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.professionalSituations()
                .then(function (response) {
                    vm.professionalSituations = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.professionalCategories()
                .then(function (response) {
                    vm.professionalCategories = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.fellowshipTypes()
                .then(function (response) {
                    vm.fellowshipTypes = response.data.result;
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
            personData.departments()
                .then(function (response) {
                    vm.departments = response.data.result;
                })
                .catch(function (err) {
                    console.log(err);
                });

        }
    };

/******************************** Directives **********************************/
    var registrationAdministrativeInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'registration/essential/registration.administrativeInfo.html'
        };
    };
    var registrationContactInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'registration/essential/registration.contactInfo.html'
        };
    };
    var registrationProfessionalSituation = function () {
        return {
            restrict: 'E',
            templateUrl: 'registration/essential/registration.professionalSituation.html'
        };
    };
    var registrationResponsibles = function () {
        return {
            restrict: 'E',
            templateUrl: 'registration/essential/registration.responsibles.html'
        };
    };
    var registrationInstitutionalContactsInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'registration/essential/registration.institutionalContacts.html'
        };
    };
    var registrationPersonNuclearInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'registration/essential/registration.personNuclearInfo.html'
        };
    };
    var registrationPersonRoles = function () {
        return {
            restrict: 'E',
            templateUrl: 'registration/essential/registration.roles.html'
        };
    };
    var registrationResearcherInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'registration/essential/registration.researcherInfo.html'
        };
    };
    var registrationScienceManagerInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'registration/essential/registration.scienceManagerInfo.html'
        };
    };
    var registrationTechnicianInfo = function () {
        return {
            restrict: 'E',
            templateUrl: 'registration/essential/registration.technicianInfo.html'
        };
    };
    var registrationDepartment = function () {
        return {
            restrict: 'E',
            templateUrl: 'registration/essential/registration.departmentAffiliation.html'
        };
    };
    var registrationUserCreation = function () {
        return {
            restrict: 'E',
            templateUrl: 'registration/essential/registration.userCreation.html'
        };
    };
    var usernameValidate = function () {
        return {
            require: 'ngModel',
            scope: {
                usernamesList: "=usernameValidate"
            },
            link: function (scope, elm, attrs, ctrl) {
                ctrl.$validators.usernameValidate = function(modelValue, viewValue) {
                    if (viewValue == null) {
                        ctrl.$setValidity('username', true);
                        return true;
                    } else {
                        for (var ind in scope.usernamesList) {
                            if (viewValue === scope.usernamesList[ind]['username']) {
                                ctrl.$setValidity('username', false);
                                return false;
                            }
                        }
                        ctrl.$setValidity('username', true);
                        return true;
                    }
                };
            }
        };
    };

/**************************** Register components *****************************/
    angular.module('managementApp')
        .directive('registrationPersonNuclearInfo', registrationPersonNuclearInfo)
        .directive('registrationContactInfo', registrationContactInfo)
        .directive('registrationUserCreation', registrationUserCreation)
        .directive('registrationInstitutionalContactsInfo', registrationInstitutionalContactsInfo)
        .directive('registrationPersonRoles', registrationPersonRoles)
        .directive('registrationResearcherInfo', registrationResearcherInfo)
        .directive('registrationAdministrativeInfo', registrationAdministrativeInfo)
        .directive('registrationScienceManagerInfo', registrationScienceManagerInfo)
        .directive('registrationTechnicianInfo', registrationTechnicianInfo)
        .directive('registrationDepartment', registrationDepartment)
        .directive('registrationProfessionalSituation', registrationProfessionalSituation)
        .directive('registrationResponsibles', registrationResponsibles)


        .directive('usernameValidate', usernameValidate)

        .controller('registrationCtrl', registrationCtrl)
        ;
})();