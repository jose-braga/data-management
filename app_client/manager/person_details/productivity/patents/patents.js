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

    var managerPersonPatents = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/patents/manager.person.patents.large.html';
        } else if (view === 'small') {
            // for now this view does not need adjustments for smaller screens
            url = 'manager/person_details/productivity/patents/manager.person.patents.large.html';
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
                        getPatents();

                        function getPatents(ind) {
                            publications.getAllPatents()
                                .then(function (response) {
                                    scope.allPatents = response.data.result;
                                    for (var id in scope.allPatents) {
                                        scope.allPatents[id]['status_date'] = processDate(scope.allPatents[id]['status_date']);
                                    }
                                    for (var el in scope.allPatents) {
                                        var p_id = [];
                                        for (var el2 in scope.allPatents[el].person_id) {
                                            if (scope.allPatents[el].person_id[el2] !== null) {
                                                p_id.push(scope.allPatents[el].person_id[el2]);
                                            }
                                        }
                                        scope.allPatents[el].person_id = p_id;
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            publications.thisPersonPatents(personID)
                                .then(function (response) {
                                    scope.originalPersonPatents = response.data.result;
                                    scope.currentPatents = [];
                                    for (var id in scope.originalPersonPatents) {
                                        scope.originalPersonPatents[id]['status_date'] = processDate(scope.originalPersonPatents[id]['status_date']);
                                        scope.currentPatents.push(Object.assign({}, scope.originalPersonPatents[id]));
                                    }

                                    scope.originalPersonPatents = scope.originalPersonPatents.sort(sorter);
                                    scope.currentPatents = scope.currentPatents.sort(sorter);

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
                        scope.submitPatents = function (ind) {
                            scope.updateStatus[ind] = "Updating...";
                            scope.messageType[ind] = 'message-updating';
                            scope.hideMessage[ind] = false;

                            // Add yourself to the list of new/update patents

                            var data = processDataRows(scope.currentPatents,scope.originalPersonPatents,
                                                  'id', 'newPatent','updatePatent','deletePatent');

                            for (var el in data.updatePatent) {
                                if (data.updatePatent[el].person_id.indexOf(personID) === -1) {
                                    data.updatePatent[el].person_id.push(personID);
                                }
                            }
                            for (var el in data.newPatent) {
                                if (data.newPatent[el].person_id.indexOf(personID) === -1) {
                                    data.newPatent[el].person_id.push(personID);
                                }
                            }
                            publications.updatePatentsPerson(personID,data)
                                .then( function () {
                                    getPatents(ind);
                                },
                                function () {
                                    scope.updateStatus[ind] = "Error!";
                                    scope.messageType[ind] = 'message-error';
                                },
                                function () {}
                                );
                            return false;
                        };
                        scope.renderPatents = function () {
                            scope.patentsToShow = [];
                            if (scope.searchPatent.length >2) {
                                for (var el in scope.allPatents) {
                                    if (nameMatching(scope.allPatents[el].title,scope.searchPatent) !== null) {
                                        scope.patentsToShow.push(scope.allPatents[el]);
                                    }
                                }
                            }
                        };
                        scope.addPatentSearch = function (patent) {
                            var alreadyExists = false;
                            for (var el in scope.currentPatents) {
                                if (scope.currentPatents[el].title == patent.title) {
                                    alreadyExists = true;
                                }
                            }
                            if (!alreadyExists) {
                                patent.id = 'new association';
                                scope.originalPersonPatents.push(Object.assign({}, patent));
                                scope.currentPatents.push(Object.assign({}, patent));
                            }
                        };

                        function initializeInterface() {
                            scope.sortType='status_date';
                            scope.sortReverse=true;
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
                            personData.patentTypes()
                                .then(function (response) {
                                    scope.patentTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.patentStatus()
                                .then(function (response) {
                                    scope.patentStatus = response.data.result;
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
                            if (type === 'patents') {
                                if (current.length == 1 && current[0]['id'] === null) {
                                    current[0]['id'] = 'new';
                                } else {
                                    obj = {
                                        id: 'new',
                                        person_id: [],
                                        patent_id: null,
                                        patent_type_id: null,
                                        patent_type_name: null,
                                        status_date: null,
                                        authors_raw: null,
                                        title: null,
                                        reference1: null,
                                        reference2: null,
                                        patent_status_id: null,
                                        patent_status_name: null,
                                        description: null
                                    };
                                    current.push(obj);
                                }
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

    var managerPersonPatentsLarge = managerPersonPatents('large');



    angular.module('managementApp')
        .directive('managerPersonPatentsLarge', managerPersonPatentsLarge)
        ;
})();