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

    var managerPersonDatasets = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/datasets/manager.person.datasets.large.html';
        } else if (view === 'small') {
            // for now this view does not need adjustments for smaller screens
            url = 'manager/person_details/productivity/datasets/manager.person.datasets.large.html';
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
                        getDatasets();

                        function getDatasets(ind) {
                            publications.getAllDatasets()
                                .then(function (response) {
                                    scope.allDatasets = response.data.result;
                                    for (var el in scope.allDatasets) {
                                        var p_id = [];
                                        for (var el2 in scope.allDatasets[el].person_id) {
                                            if (scope.allDatasets[el].person_id[el2] !== null) {
                                                p_id.push(scope.allDatasets[el].person_id[el2]);
                                            }
                                        }
                                        scope.allDatasets[el].person_id = p_id;
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            publications.thisPersonDatasets(personID)
                                .then(function (response) {
                                    scope.originalPersonDatasets = response.data.result;
                                    scope.originalPersonDatasets = scope.originalPersonDatasets.sort(sorter);
                                    scope.currentDatasets = [];
                                    for (var id in scope.originalPersonDatasets) {
                                        scope.currentDatasets.push(Object.assign({}, scope.originalPersonDatasets[id]));
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
                        scope.submitDatasets = function (ind) {
                            scope.updateStatus[ind] = "Updating...";
                            scope.messageType[ind] = 'message-updating';
                            scope.hideMessage[ind] = false;

                            var data = processDataRows(scope.currentDatasets,scope.originalPersonDatasets,
                                                  'id', 'newDataset','updateDataset','deleteDataset');
                            for (var el in data.updateDataset) {
                                if (data.updateDataset[el].person_id.indexOf(personID) === -1) {
                                    data.updateDataset[el].person_id.push(personID);
                                }
                            }
                            for (var el in data.newDataset) {
                                if (data.newDataset[el].person_id.indexOf(personID) === -1) {
                                    data.newDataset[el].person_id.push(personID);
                                }
                            }
                            publications.updateDatasetsPerson(personID,data)
                                .then( function () {
                                    getDatasets(ind);
                                },
                                function () {
                                    scope.updateStatus[ind] = "Error!";
                                    scope.messageType[ind] = 'message-error';
                                },
                                function () {}
                                );
                            return false;
                        };
                        scope.renderDatasets = function () {
                            scope.datasetsToShow = [];
                            if (scope.searchDataset.length >2) {
                                for (var el in scope.allDatasets) {
                                    if (nameMatching(scope.allDatasets[el].database_name,scope.searchDataset) !== null
                                        || nameMatching(scope.allDatasets[el].short_description,scope.searchDataset) !== null) {
                                        scope.datasetsToShow.push(scope.allDatasets[el]);
                                    }
                                }
                            }
                        };
                        scope.addDatasetSearch = function (dataset) {
                            var alreadyExists = false;
                            for (var el in scope.currentDatasets) {
                                if (scope.currentDatasets[el].short_description == dataset.short_description
                                    && scope.currentDatasets[el].database_name == dataset.database_name
                                    && scope.currentDatasets[el].year == dataset.year) {
                                    alreadyExists = true;
                                }
                            }
                            if (!alreadyExists) {
                                dataset.id = 'new association';
                                scope.originalPersonDatasets.push(Object.assign({}, dataset));
                                scope.currentDatasets.push(Object.assign({}, dataset));
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
                            personData.datasetTypes()
                                .then(function (response) {
                                    scope.datasetTypes = response.data.result;
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
                            if (type === 'datasets') {
                                if (current.length == 1 && current[0]['id'] === null) {
                                    current[0]['id'] = 'new';
                                } else {
                                    obj = {
                                        id: 'new',
                                        person_id: [],
                                        data_set_id: null,
                                        data_set_type_id: null,
                                        short_description: null,
                                        number_sets: null,
                                        database_name: null,
                                        url: null,
                                        year: null
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

    var managerPersonDatasetsLarge = managerPersonDatasets('large');

    angular.module('managementApp')
        .directive('managerPersonDatasetsLarge', managerPersonDatasetsLarge)
        ;
})();