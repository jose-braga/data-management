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

    var managerPersonStartups = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/startups/manager.person.startups.large.html';
        } else if (view === 'small') {
            // for now this view does not need adjustments for smaller screens
            url = 'manager/person_details/productivity/startups/manager.person.startups.large.html';
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
                        getStartups();

                        function getStartups(ind) {
                            publications.getAllStartups()
                                .then(function (response) {
                                    scope.allStartups = response.data.result;
                                    for (var id in scope.allStartups) {
                                        scope.allStartups[id]['start'] = processDate(scope.allStartups[id]['start']);
                                        scope.allStartups[id]['end'] = processDate(scope.allStartups[id]['end']);
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            publications.thisPersonStartups(personID)
                                .then(function (response) {
                                    scope.originalPersonStartups = response.data.result;
                                    scope.originalPersonStartups = scope.originalPersonStartups.sort(sorter);
                                    scope.currentStartups = [];
                                    for (var id in scope.originalPersonStartups) {
                                        scope.originalPersonStartups[id]['start'] = processDate(scope.originalPersonStartups[id]['start']);
                                        scope.originalPersonStartups[id]['end'] = processDate(scope.originalPersonStartups[id]['end']);
                                    }
                                    for (var id in scope.originalPersonStartups) {
                                        scope.currentStartups.push(Object.assign({}, scope.originalPersonStartups[id]));
                                    }
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
                        scope.submitStartups = function (ind) {
                            scope.updateStatus[ind] = "Updating...";
                            scope.messageType[ind] = 'message-updating';
                            scope.hideMessage[ind] = false;
                            var data = processDataRows(scope.currentStartups,scope.originalPersonStartups,
                                                  'id', 'newStartup','updateStartup','deleteStartup');
                            publications.updateStartupsPerson(personID,data)
                                .then( function () {
                                    getStartups(ind);
                                },
                                function () {
                                    scope.updateStatus[ind] = "Error!";
                                    scope.messageType[ind] = 'message-error';
                                },
                                function () {}
                                );
                            return false;
                        };
                        scope.renderStartups = function () {
                            scope.startupsToShow = [];
                            if (scope.searchStartup.length >2) {
                                for (var el in scope.allStartups) {
                                    if (nameMatching(scope.allStartups[el].name,scope.searchStartup) !== null
                                        || nameMatching(scope.allStartups[el].short_description,scope.searchStartup) !== null) {
                                        scope.allStartups[el].year_start = momentToDate(scope.allStartups[el].start,undefined,'YYYY');
                                        scope.allStartups[el].year_end = momentToDate(scope.allStartups[el].end,undefined,'YYYY');
                                        scope.startupsToShow.push(scope.allStartups[el]);
                                    }
                                }
                            }
                        };
                        scope.addStartupSearch = function (startup) {
                            var alreadyExists = false;
                            for (var el in scope.currentStartups) {
                                if (scope.currentStartups[el].short_description == startup.short_description
                                    && scope.currentStartups[el].name == startup.name) {
                                    alreadyExists = true;
                                }
                            }
                            if (!alreadyExists) {
                                startup.id = 'new association';
                                scope.originalPersonStartups.push(Object.assign({}, startup));
                                scope.currentStartups.push(Object.assign({}, startup));
                            }
                        };

                        function initializeInterface() {
                            scope.sortType='start';
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
                            if (type === 'startups') {
                                if (current.length == 1 && current[0]['id'] === null) {
                                    current[0]['id'] = 'new';
                                } else {
                                    obj = {
                                        id: 'new',
                                        person_id: [{person_id: personID, position_name: null}],
                                        startup_id: null,
                                        short_description: null,
                                        name: null,
                                        start: null,
                                        end: null
                                    };
                                    current.push(obj);
                                }
                            } else if (type === 'startup_people') {
                                if (current.length == 1 && current[0]['id'] === null) {
                                    current[0]['id'] = 'new';
                                } else {
                                    obj = {person_id: null, position_name: null};
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
                                    return -(b[scope.sortType] - a[scope.sortType]);
                                } else {
                                    return (b[scope.sortType] - a[scope.sortType]);
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

    var managerPersonStartupsLarge = managerPersonStartups('large');

    angular.module('managementApp')
        .directive('managerPersonStartupsLarge', managerPersonStartupsLarge)
        ;
})();