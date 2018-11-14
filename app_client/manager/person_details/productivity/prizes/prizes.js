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

    var managerPersonPrizes = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/prizes/manager.person.prizes.large.html';
        } else if (view === 'small') {
            // for now this view does not need adjustments for smaller screens
            url = 'manager/person_details/productivity/prizes/manager.person.prizes.large.html';
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
                        getPrizes();

                        function getPrizes(ind) {
                            publications.getAllPrizes()
                                .then(function (response) {
                                    scope.allPrizes = response.data.result;
                                    for (var el in scope.allPrizes) {
                                        var p_id = [];
                                        for (var el2 in scope.allPrizes[el].person_id) {
                                            if (scope.allPrizes[el].person_id[el2] !== null) {
                                                p_id.push(scope.allPrizes[el].person_id[el2]);
                                            }
                                        }
                                        scope.allPrizes[el].person_id = p_id;
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            publications.thisPersonPrizes(personID)
                                .then(function (response) {
                                    scope.originalPersonPrizes = response.data.result;
                                    scope.originalPersonPrizes = scope.originalPersonPrizes.sort(sorter);
                                    scope.currentPrizes = [];
                                    for (var id in scope.originalPersonPrizes) {
                                        scope.currentPrizes.push(Object.assign({}, scope.originalPersonPrizes[id]));
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
                        scope.submitPrizes = function (ind) {
                            scope.updateStatus[ind] = "Updating...";
                            scope.messageType[ind] = 'message-updating';
                            scope.hideMessage[ind] = false;

                            var data = processDataRows(scope.currentPrizes,scope.originalPersonPrizes,
                                                  'id', 'newPrize','updatePrize','deletePrize');
                            for (var el in data.updatePrize) {
                                if (data.updatePrize[el].person_id.indexOf(personID) === -1) {
                                    data.updatePrize[el].person_id.push(personID);
                                }
                            }
                            for (var el in data.newPrize) {
                                if (data.newPrize[el].person_id.indexOf(personID) === -1) {
                                    data.newPrize[el].person_id.push(personID);
                                }
                            }
                            publications.updatePrizesPerson(personID,data)
                                .then( function () {
                                    getPrizes(ind);
                                },
                                function () {
                                    scope.updateStatus[ind] = "Error!";
                                    scope.messageType[ind] = 'message-error';
                                },
                                function () {}
                                );
                            return false;
                        };
                        scope.renderPrizes = function () {
                            scope.prizesToShow = [];
                            if (scope.searchPrize.length >2) {
                                for (var el in scope.allPrizes) {
                                    if (nameMatching(scope.allPrizes[el].name,scope.searchPrize) !== null) {
                                        scope.prizesToShow.push(scope.allPrizes[el]);
                                    }
                                }
                            }
                        };
                        scope.addPrizeSearch = function (prize) {
                            var alreadyExists = false;
                            for (var el in scope.currentPrizes) {
                                if (scope.currentPrizes[el].name == prize.name) {
                                    alreadyExists = true;
                                }
                            }
                            if (!alreadyExists) {
                                prize.id = 'new association';
                                scope.originalPersonPrizes.push(Object.assign({}, prize));
                                scope.currentPrizes.push(Object.assign({}, prize));
                            }
                        };

                        function initializeInterface() {
                            scope.sortType='year';
                            scope.sortReverse=false;
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
                            if (type === 'prizes') {
                                if (current.length == 1 && current[0]['id'] === null) {
                                    current[0]['id'] = 'new';
                                } else {
                                    obj = {
                                        id: 'new',
                                        person_id: [],
                                        recipients: null,
                                        prize_id: null,
                                        name: null,
                                        organization: null,
                                        year: null,
                                        amount_euro: null,
                                        notes: null
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

    var managerPersonPrizesLarge = managerPersonPrizes('large');

    angular.module('managementApp')
        .directive('managerPersonPrizesLarge', managerPersonPrizesLarge)
        ;
})();