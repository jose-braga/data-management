(function(){

    function processDate (date) {
        if (date !== null) {
            date = new Date(date);
        }
        return date;
    }
    function processDataRows(current, original, keyComparison, newName, updateName, deleteName) {
            var add = [];
            var del = [];
            var upd = [];
            var exist = 0;
            for (var curr in current) {
                exist = 0;
                for (var ori in original) {
                    if (current[curr][keyComparison] === original[ori][keyComparison]
                        && (current[curr][keyComparison] !== null && current[curr][keyComparison] !== 'new')) {
                        exist = 1;
                        upd.push(current[curr]);
                        break;
                    }
                }
                if (exist === 0 && (current[curr][keyComparison] !== null)) {
                    add.push(current[curr]);
                }
            }
            for (var ori in original) {
                exist = 0;
                for (var curr in current) {
                    if (current[curr][keyComparison] === original[ori][keyComparison]
                        && original[ori][keyComparison] !== null) {
                        exist = 1;
                        break;
                    }
                }
                if (exist === 0 && original[ori][keyComparison] !== null) {
                    del.push(original[ori]);
                }
            }
            var objReturn = {};
            objReturn[newName] = add;
            objReturn[updateName] = upd;
            objReturn[deleteName] = del;
            return objReturn;
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
                  .replace(/[ñ]/g,'n');
    }

    var managerPersonProjects = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/funding/manager.person.projects.large.html';
        } else if (view === 'small') {
            // for now this view does not need adjustments for smaller screens
            url = 'manager/person_details/productivity/funding/manager.person.projects.large.html';
        }
        return ['personData','managerData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
            function (personData,managerData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
                return {
                    restrict: 'E',
                    //transclude: true,
                    scope: {
                        person:"@",
                    },
                    templateUrl: url,
                    link:
                    function (scope,element,attrs) {
                        var personID = scope.person;
                        scope.currentProjects = [];

                        initializeInterface();
                        getProjects();

                        function getProjects(ind) {
                            publications.getAllProjects()
                                .then(function (response) {
                                    scope.allProjects = response.data.result;
                                    for (var id in scope.allProjects) {
                                        scope.allProjects[id]['start'] = processDate(scope.allProjects[id]['start']);
                                        scope.allProjects[id]['end'] = processDate(scope.allProjects[id]['end']);
                                    }
                                    for (var el in scope.allProjects) {
                                        var p_id = [];
                                        for (var el2 in scope.allProjects[el].person_id) {
                                            if (scope.allProjects[el].person_id[el2] !== null) {
                                                p_id.push(scope.allProjects[el].person_id[el2]);
                                            }
                                        }
                                        scope.allProjects[el].person_id = p_id;
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            publications.thisPersonProjects(personID)
                                .then(function (response) {
                                    scope.originalPersonProjects = response.data.result;
                                    scope.currentProjects = [];
                                    for (var id in scope.originalPersonProjects) {
                                        scope.originalPersonProjects[id]['start'] = processDate(scope.originalPersonProjects[id]['start']);
                                        scope.originalPersonProjects[id]['end'] = processDate(scope.originalPersonProjects[id]['end']);
                                        if (scope.originalPersonProjects[id].funding_entity_id === null
                                                && scope.originalPersonProjects[id].other_funding_entity !== null) {
                                            scope.originalPersonProjects[id].funding_entity_id = 'other';
                                        }
                                        scope.currentProjects.push(Object.assign({}, scope.originalPersonProjects[id]));
                                    }

                                    scope.originalPersonProjects = scope.originalPersonProjects.sort(sorter);
                                    scope.currentProjects = scope.currentProjects.sort(sorter);

                                    if (ind > -1) {
                                        scope.updateStatus[ind] = "Updated!";
                                        scope.messageType[ind] = 'message-success';
                                        scope.hideMessage[ind] = false;
                                        $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        }
                        scope.submitProjects = function (ind) {
                            scope.updateStatus[ind] = "Updating...";
                            scope.messageType[ind] = 'message-updating';
                            scope.hideMessage[ind] = false;

                            // Add yourself to the list of new/update patents

                            var data = processDataRows(scope.currentProjects,scope.originalPersonProjects,
                                                  'id', 'newProject','updateProject','deleteProject');
                            publications.updateProjectsPerson(personID,data)
                                .then( function () {
                                    getProjects(ind);
                                    scope.updateStatus[ind] = "Updated!";
                                    scope.messageType[ind] = 'message-success';
                                    scope.hideMessage[ind] = false;
                                    $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                },
                                function () {
                                    scope.updateStatus[ind] = "Error!";
                                    scope.messageType[ind] = 'message-error';
                                },
                                function () {}
                                );
                            return false;
                        };
                        scope.renderProjects = function () {
                            scope.projectsToShow = [];
                            var projectsID = [];
                            if (scope.searchProject.length >2) {
                                for (var el in scope.allProjects) {
                                    if (nameMatching(scope.allProjects[el].title,scope.searchProject) !== null
                                        || nameMatching(scope.allProjects[el].acronym,scope.searchProject) !== null
                                        || nameMatching(scope.allProjects[el].reference,scope.searchProject) !== null) {
                                        if (projectsID.indexOf(scope.allProjects[el].project_id) === -1) {
                                            scope.projectsToShow.push(scope.allProjects[el]);
                                            projectsID.push(scope.allProjects[el].project_id);
                                        }
                                    }
                                }
                            }
                        };
                        scope.addProjectSearch = function (project) {
                            var alreadyExists = false;
                            for (var el in scope.currentProjects) {
                                if (scope.currentProjects[el].title == project.title
                                    && scope.currentProjects[el].reference == project.reference) {
                                    alreadyExists = true;
                                }
                            }
                            if (!alreadyExists) {
                                project.id = 'new association';
                                if (project.funding_entity_id === null
                                        && project.other_funding_entity !== null) {
                                    project.funding_entity_id = 'other';
                                }
                                if (project.call_type_id === null
                                        && project.other_call_type !== null) {
                                    project.call_type_id = 'other';
                                }
                                project.person_id.push({
                                            person_id: personID,
                                            position_id: null,
                                            position_name: null});
                                scope.originalPersonProjects.push(Object.assign({}, project));
                                scope.currentProjects.push(Object.assign({}, project));
                            }
                        };

                        function initializeInterface() {
                            scope.sortType='start';
                            scope.sortReverse=true;
                            scope.deleteCommunications = [];
                            scope.forms = {
                                'managerUpdateWorks': 0,
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
                            personData.projectPositions()
                                .then(function (response) {
                                    scope.projectPositions = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.projectTypes()
                                .then(function (response) {
                                    scope.projectTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.callTypes()
                                .then(function (response) {
                                    scope.callTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.fundingAgencies()
                                .then(function (response) {
                                    scope.fundingAgencies = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.managementEntities()
                                .then(function (response) {
                                    scope.managementEntities = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });

                        }

                        scope.nothingToShow = function (arrObj, key) {
                            if (arrObj !== null && arrObj !== undefined) {
                                if (arrObj.length === 0) return true;
                                if (arrObj.length === 1 && arrObj[0][key] === null) return true;
                                return false;
                            }
                            return true;
                        };
                        scope.removeRows = function (current, ind) {
                            current.splice(ind,1);
                        };
                        scope.addRows = function (current,type) {
                            var obj = {};
                            if (type === 'projects') {
                                if (current.length == 1 && current[0]['id'] === null) {
                                    current[0]['id'] = 'new';
                                } else {
                                    obj = {
                                        id: 'new',
                                        person_id: [{
                                            person_id: personID,
                                            position_id: null,
                                            position_name: null}],
                                        title: null,
                                        acronym: null,
                                        reference: null,
                                        project_id: null,
                                        project_type_id: null,
                                        project_type: null,
                                        call_type_id: null,
                                        call_type: null,
                                        project_areas: [{area:null}],
                                        project_funding_entity_id: null,
                                        funding_entity_id: null,
                                        funding_entity_official_name: null,
                                        funding_entity_short_name: null,
                                        other_funding_entity_id: null,
                                        project_other_funding_entity_id: null,
                                        project_management_entity_id: null,
                                        management_entity_id: null,
                                        management_entity_official_name: null,
                                        management_entity_short_name: null,
                                        entity_amount: null,
                                        other_funding_entity: null,
                                        global_amount: null,
                                        website: null,
                                        start: null,
                                        end: null,
                                        notes: null
                                    };
                                    current.push(obj);
                                }
                            } else if (type === 'project_people') {
                                obj = {person_id: null, position_id: null, position_name: null};
                                current.push(obj);
                            } else if (type === 'project_areas') {
                                obj = {area: null};
                                current.push(obj);
                            }
                        };
                        function sorter(a,b) {
                            if (scope.sortType === 'date'
                                || scope.sortType === 'status_date'
                                || scope.sortType === 'start'
                                || scope.sortType === 'start_date'
                                || scope.sortType === 'event_date') {
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
    };

    var managerPersonAgreements = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/funding/manager.person.agreements.large.html';
        } else if (view === 'small') {
            // for now this view does not need adjustments for smaller screens
            url = 'manager/person_details/productivity/funding/manager.person.agreements.large.html';
        }
        return ['personData','managerData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
            function (personData,managerData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
                return {
                    restrict: 'E',
                    //transclude: true,
                    scope: {
                        person:"@",
                    },
                    templateUrl: url,
                    link:
                    function (scope,element,attrs) {
                        var personID = scope.person;
                        scope.currentProjects = [];

                        initializeInterface();
                        getAgreements();

                        function getAgreements(ind) {
                            publications.getAllAgreements()
                                .then(function (response) {
                                    scope.allAgreements = response.data.result;
                                    for (var id in scope.allAgreements) {
                                        scope.allAgreements[id]['start'] = processDate(scope.allAgreements[id]['start']);
                                        scope.allAgreements[id]['end'] = processDate(scope.allAgreements[id]['end']);
                                    }
                                    for (var el in scope.allAgreements) {
                                        var p_id = [];
                                        for (var el2 in scope.allAgreements[el].person_id) {
                                            if (scope.allAgreements[el].person_id[el2] !== null) {
                                                p_id.push(scope.allAgreements[el].person_id[el2]);
                                            }
                                        }
                                        scope.allAgreements[el].person_id = p_id;
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            publications.thisPersonAgreements(personID)
                                .then(function (response) {
                                    scope.originalPersonAgreements = response.data.result;
                                    scope.currentAgreements = [];
                                    for (var id in scope.originalPersonAgreements) {
                                        scope.originalPersonAgreements[id]['start'] = processDate(scope.originalPersonAgreements[id]['start']);
                                        scope.originalPersonAgreements[id]['end'] = processDate(scope.originalPersonAgreements[id]['end']);
                                        if (scope.originalPersonAgreements[id].funding_entity_id === null
                                                && scope.originalPersonAgreements[id].other_funding_entity !== null) {
                                            scope.originalPersonAgreements[id].funding_entity_id = 'other';
                                        }
                                        scope.currentAgreements.push(Object.assign({}, scope.originalPersonAgreements[id]));
                                    }

                                    scope.originalPersonAgreements = scope.originalPersonAgreements.sort(sorter);
                                    scope.currentAgreements = scope.currentAgreements.sort(sorter);

                                    if (ind > -1) {
                                        scope.updateStatus[ind] = "Updated!";
                                        scope.messageType[ind] = 'message-success';
                                        scope.hideMessage[ind] = false;
                                        $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        }
                        scope.submitAgreements = function (ind) {
                            scope.updateStatus[ind] = "Updating...";
                            scope.messageType[ind] = 'message-updating';
                            scope.hideMessage[ind] = false;

                            // Add yourself to the list of new/update patents

                            var data = processDataRows(scope.currentAgreements,scope.originalPersonAgreements,
                                                  'id', 'newAgreement','updateAgreement','deleteAgreement');
                            publications.updateAgreementsPerson(personID,data)
                                .then( function () {
                                    getAgreements(ind);
                                },
                                function () {
                                    scope.updateStatus[ind] = "Error!";
                                    scope.messageType[ind] = 'message-error';
                                },
                                function () {}
                                );
                            return false;
                        };
                        scope.renderAgreements = function () {
                            scope.agreementsToShow = [];
                            var agreementsID = [];
                            if (scope.searchAgreement.length >2) {
                                for (var el in scope.allAgreements) {
                                    if (nameMatching(scope.allAgreements[el].title,scope.searchAgreement) !== null
                                        || nameMatching(scope.allAgreements[el].acronym,scope.searchAgreement) !== null
                                        || nameMatching(scope.allAgreements[el].reference,scope.searchAgreement) !== null) {
                                        if (agreementsID.indexOf(scope.allAgreements[el].agreement_id) === -1) {
                                            scope.agreementsToShow.push(scope.allAgreements[el]);
                                            agreementsID.push(scope.allAgreements[el].agreement_id);
                                        }
                                    }
                                }
                            }
                        };
                        scope.addAgreementSearch = function (agreement) {
                            var alreadyExists = false;
                            for (var el in scope.currentAgreements) {
                                if (scope.currentAgreements[el].title == agreement.title
                                    && scope.currentAgreements[el].reference == agreement.reference) {
                                    alreadyExists = true;
                                }
                            }
                            if (!alreadyExists) {
                                agreement.id = 'new association';
                                agreement.person_id.push({
                                            person_id: personID});
                                scope.originalPersonAgreements.push(Object.assign({}, agreement));
                                scope.currentAgreements.push(Object.assign({}, agreement));
                            }
                        };

                        function initializeInterface() {
                            scope.sortType='start';
                            scope.sortReverse=true;
                            scope.deleteCommunications = [];
                            scope.forms = {
                                'managerUpdateWorks': 0,
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
                            personData.agreementTypes()
                            .then(function (response) {
                                scope.agreementTypes = response.data.result;
                            })
                            .catch(function (err) {
                                console.log(err);
                            });
                            personData.fundingAgencies()
                                .then(function (response) {
                                    scope.fundingAgencies = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.managementEntities()
                                .then(function (response) {
                                    scope.managementEntities = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });

                        }

                        scope.nothingToShow = function (arrObj, key) {
                            if (arrObj !== null && arrObj !== undefined) {
                                if (arrObj.length === 0) return true;
                                if (arrObj.length === 1 && arrObj[0][key] === null) return true;
                                return false;
                            }
                            return true;
                        };
                        scope.removeRows = function (current, ind) {
                            current.splice(ind,1);
                        };
                        scope.addRows = function (current,type) {
                            var obj = {};
                            if (type === 'agreements') {
                                if (current.length == 1 && current[0]['id'] === null) {
                                    current[0]['id'] = 'new';
                                } else {
                                    obj = {
                                        id: 'new',
                                        person_id: [{
                                            person_id: personID
                                            }],
                                        confidential: null,
                                        title: null,
                                        acronym: null,
                                        reference: null,
                                        agreement_id: null,
                                        agreement_type_id: null,
                                        agreement_type: null,
                                        agreement_areas: [{area:null}],
                                        agreement_partners: [{
                                            partner_id: null,
                                            name: null,
                                            country_id: null
                                            }],
                                        agreement_management_entity_id: null,
                                        management_entity_id: null,
                                        management_entity_official_name: null,
                                        management_entity_short_name: null,
                                        entity_amount: null,
                                        global_amount: null,
                                        website: null,
                                        start: null,
                                        end: null,
                                        notes: null
                                    };
                                    current.push(obj);
                                }
                            } else if (type === 'agreement_people') {
                                obj = {person_id: null, position_id: null, position_name: null};
                                current.push(obj);
                            } else if (type === 'agreement_areas') {
                                obj = {area: null};
                                current.push(obj);
                            } else if (type === 'agreement_partners') {
                                obj = {partner_id: null, name: null, country_id: null};
                                current.push(obj);
                            }
                        };
                        function sorter(a,b) {
                            if (scope.sortType === 'date'
                                || scope.sortType === 'status_date'
                                || scope.sortType === 'start'
                                || scope.sortType === 'start_date'
                                || scope.sortType === 'event_date') {
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
    };

    var managerPersonTrainings = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/funding/manager.person.trainings.large.html';
        } else if (view === 'small') {
            // for now this view does not need adjustments for smaller screens
            url = 'manager/person_details/productivity/funding/manager.person.trainings.large.html';
        }
        return ['personData','managerData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
            function (personData,managerData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
                return {
                    restrict: 'E',
                    //transclude: true,
                    scope: {
                        person:"@",
                    },
                    templateUrl: url,
                    link:
                    function (scope,element,attrs) {
                        var personID = parseInt(scope.person, 10);
                        scope.currentProjects = [];

                        initializeInterface();
                        getTrainings();

                        function getTrainings(ind) {
                            publications.getAllTrainings()
                                .then(function (response) {
                                    scope.allTrainings = response.data.result;
                                    for (var id in scope.allTrainings) {
                                        scope.allTrainings[id]['start'] = processDate(scope.allTrainings[id]['start']);
                                        scope.allTrainings[id]['end'] = processDate(scope.allTrainings[id]['end']);
                                    }
                                    for (var el in scope.allTrainings) {
                                        var p_id = [];
                                        for (var el2 in scope.allTrainings[el].person_id) {
                                            if (scope.allTrainings[el].person_id[el2] !== null) {
                                                p_id.push(scope.allTrainings[el].person_id[el2]);
                                            }
                                        }
                                        scope.allTrainings[el].person_id = p_id;
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            publications.thisPersonTrainings(personID)
                                .then(function (response) {
                                    scope.originalPersonTrainings = response.data.result;
                                    scope.currentTrainings = [];
                                    for (var id in scope.originalPersonTrainings) {
                                        scope.originalPersonTrainings[id]['start'] = processDate(scope.originalPersonTrainings[id]['start']);
                                        scope.originalPersonTrainings[id]['end'] = processDate(scope.originalPersonTrainings[id]['end']);
                                        if (scope.originalPersonTrainings[id].funding_entity_id === null
                                                && scope.originalPersonTrainings[id].other_funding_entity !== null) {
                                            scope.originalPersonTrainings[id].funding_entity_id = 'other';
                                        }
                                        scope.currentTrainings.push(Object.assign({}, scope.originalPersonTrainings[id]));
                                    }

                                    scope.originalPersonTrainings = scope.originalPersonTrainings.sort(sorter);
                                    scope.currentTrainings = scope.currentTrainings.sort(sorter);

                                    if (ind > -1) {
                                        scope.updateStatus[ind] = "Updated!";
                                        scope.messageType[ind] = 'message-success';
                                        scope.hideMessage[ind] = false;
                                        $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        }
                        scope.submitTrainings = function (ind) {
                            scope.updateStatus[ind] = "Updating...";
                            scope.messageType[ind] = 'message-updating';
                            scope.hideMessage[ind] = false;

                            // Add yourself to the list of new/update patents

                            var data = processDataRows(scope.currentTrainings,scope.originalPersonTrainings,
                                                  'id', 'newTraining','updateTraining','deleteTraining');
                            publications.updateTrainingsPerson(personID,data)
                                .then( function () {
                                    getTrainings(ind);
                                },
                                function () {
                                    scope.updateStatus[ind] = "Error!";
                                    scope.messageType[ind] = 'message-error';
                                },
                                function () {}
                                );
                            return false;
                        };
                        scope.renderTrainings = function () {
                            scope.trainingsToShow = [];
                            var trainingsID = [];
                            if (scope.searchTraining.length >2) {
                                for (var el in scope.allTrainings) {
                                    if (nameMatching(scope.allTrainings[el].title,scope.searchTraining) !== null
                                        || nameMatching(scope.allTrainings[el].network_name,scope.searchTraining) !== null
                                        || nameMatching(scope.allTrainings[el].acronym,scope.searchTraining) !== null
                                        || nameMatching(scope.allTrainings[el].reference,scope.searchTraining) !== null) {
                                        if (trainingsID.indexOf(scope.allTrainings[el].training_id) === -1) {
                                            scope.trainingsToShow.push(scope.allTrainings[el]);
                                            trainingsID.push(scope.allTrainings[el].training_id);
                                        }
                                    }
                                }
                            }
                        };
                        scope.addTrainingSearch = function (training) {
                            var alreadyExists = false;
                            for (var el in scope.currentTrainings) {
                                if (scope.currentTrainings[el].title == training.title
                                    && scope.currentTrainings[el].reference == training.reference) {
                                    alreadyExists = true;
                                }
                            }
                            if (!alreadyExists) {
                                training.id = 'new association';
                                training.person_id.push({
                                            person_id: personID});
                                scope.originalPersonTrainings.push(Object.assign({}, training));
                                scope.currentTrainings.push(Object.assign({}, training));
                            }
                        };

                        function initializeInterface() {
                            scope.sortType='start';
                            scope.sortReverse=true;
                            scope.deleteCommunications = [];
                            scope.forms = {
                                'managerUpdateWorks': 0,
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
                            personData.trainingRoles()
                                .then(function (response) {
                                    scope.trainingRoles = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.fundingAgencies()
                                .then(function (response) {
                                    scope.fundingAgencies = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.managementEntities()
                                .then(function (response) {
                                    scope.managementEntities = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });

                        }

                        scope.nothingToShow = function (arrObj, key) {
                            if (arrObj !== null && arrObj !== undefined) {
                                if (arrObj.length === 0) return true;
                                if (arrObj.length === 1 && arrObj[0][key] === null) return true;
                                return false;
                            }
                            return true;
                        };
                        scope.removeRows = function (current, ind) {
                            current.splice(ind,1);
                        };
                        scope.addRows = function (current,type) {
                            var obj = {};
                            if (type === 'trainings') {
                                if (current.length == 1 && current[0]['id'] === null) {
                                    current[0]['id'] = 'new';
                                } else {
                                    obj = {
                                        id: 'new',
                                        person_id: [{
                                            person_id: personID,
                                            role_id: null,
                                            role_name: null
                                            }],
                                        network_name: null,
                                        coordinating_entity: null,
                                        country_id: null,
                                        title: null,
                                        acronym: null,
                                        reference: null,
                                        training_id: null,
                                        training_management_entity_id: null,
                                        management_entity_id: null,
                                        management_entity_official_name: null,
                                        management_entity_short_name: null,
                                        entity_amount: null,
                                        global_amount: null,
                                        website: null,
                                        start: null,
                                        end: null,
                                        notes: null
                                    };
                                    current.push(obj);
                                }
                            } else if (type === 'training_people') {
                                obj = {person_id: null, role_id: null, role_name: null};
                                current.push(obj);
                            }
                        };
                        function sorter(a,b) {
                            if (scope.sortType === 'date'
                                || scope.sortType === 'status_date'
                                || scope.sortType === 'start'
                                || scope.sortType === 'start_date'
                                || scope.sortType === 'event_date') {
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
    };

    var managerPersonProjectsLarge = managerPersonProjects('large');
    var managerPersonAgreementsLarge = managerPersonAgreements('large');
    var managerPersonTrainingsLarge = managerPersonTrainings('large');


    angular.module('managementApp')
        .directive('managerPersonProjectsLarge', managerPersonProjectsLarge)
        .directive('managerPersonAgreementsLarge', managerPersonAgreementsLarge)
        .directive('managerPersonTrainingsLarge', managerPersonTrainingsLarge)
        ;
})();