(function(){
    var teamMembersDatasets =
    ['personData','teamData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
    function (personData,teamData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
        return {
            restrict: 'E',
            scope: {
                lab: '@',
                group: '@'
            },
            templateUrl: 'team/productivity/datasets/team.membersDatasets.html',
            link:
            function (scope,element,attrs) {
                //this._mdPanel = $mdPanel;

                scope.teamDatasets = [];
                scope.membersDatasets = [];

                scope.forms = {
                    'membersWork': 0,
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

                $rootScope.$on('removedLabDatasetsMessage', function (event,data) {
                    getDatasets();
                });

                getDatasets();

                scope.renderDatasets = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalDatasets = scope.membersDatasets.length;
                    scope.selectedDatasets = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearWork = parseInt(scope.fromYearWork,10);
                    scope.toYearWork = parseInt(scope.toYearWork,10);
                    for (var ind in scope.membersDatasets) {
                        //scope.membersDatasets[ind]['year'] = momentToDate(scope.membersDatasets[ind]['status_date'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearWork)) {
                            if (scope.fromYearWork <= scope.membersDatasets[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearWork)) {
                            if (scope.toYearWork >= scope.membersDatasets[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedDatasets.push(scope.membersDatasets[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedDatasets.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedDatasets = scope.selectedDatasets.sort(sorter);
                    scope.currDatasets = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currDatasets.push(Object.assign({}, scope.selectedDatasets[member]));
                    }
                };
                scope.submitMembersDatasets = function (ind) {
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;
                    var data = {addDatasets: scope.newLabDatasets};
                    publications.addMembersDatasets(scope.group,scope.lab,data)
                        .then( function () {
                            getDatasets();
                            $rootScope.$broadcast('updateLabDatasetsMessage', data);
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
                scope.addDataset = function (pub) {
                    var alreadyAdded = scope.newLabDatasets.filter(
                            function(el) {
                                return el.id === pub.id;
                            });
                    if (alreadyAdded.length === 0) {
                        scope.newLabDatasets.push(pub);
                    }
                };
                scope.removeRow = function (current, ind) {
                    current.splice(ind,1);
                };

                function getDatasets() {
                    publications.thisTeamDatasets(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamDatasets = response.data.result;
                            getMembersDatasets();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function getMembersDatasets() {
                    publications.thisMembersDatasets(scope.group, scope.lab)
                        .then(function (response) {
                            scope.membersDatasetsAll = response.data.result;
                            var labPubIDs = scope.teamDatasets.map(function(obj){return obj.id;});
                            scope.membersDatasets = scope.membersDatasetsAll.filter(
                                    function (obj) { return labPubIDs.indexOf(obj.id) === -1;});
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }

                function initializeVariables() {
                    scope.sortReverse = true;
                    scope.sortType = 'year';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    scope.newLabDatasets = [];

                    // computes the number of pages
                    scope.totalDatasets = scope.membersDatasets.length;
                    scope.totalPages = Math.ceil(scope.totalDatasets / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderDatasets();
                }
                function sorter(a,b) {
                    if (scope.sortType === 'year') {
                        if (scope.sortReverse) {
                            return a-b;
                        } else {
                            return b-a;
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
                scope.exportDatasetsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedDatasets = convertData(scope.selectedDatasets);
                    var ws = XLSX.utils.json_to_sheet(selectedDatasets);
                    wb.SheetNames = [wsName];
                    wb.Sheets = {};
                    wb.Sheets[wsName] = ws;
                    var wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
                    var dateTime = momentToDate(moment(),undefined,'YYYYMMDD_HHmmss')
                    var from;
                    var to;
                    if (scope.fromYearWork === undefined || isNaN(scope.fromYearWork)) {
                        from = 'all';
                    } else {
                        from = scope.fromYearWork;
                    }
                    if (scope.toYearWork === undefined || isNaN(scope.toYearWork)) {
                        to = 'all';
                    } else {
                        to = scope.toYearWork;
                    }
                    var fname = 'team_members_datasets_' + from + '_' + to
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
                            data.push({
                                "Data type": arrObj[el]['data_set_type_name'],
                                "Database": arrObj[el]['database_name'],
                                "URL": arrObj[el]['url'],
                                "Num. sets": arrObj[el]['number_sets'],
                                "Description": arrObj[el]['short_description'],
                                "Year": arrObj[el]['year']
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

    var teamLabDatasets =
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
            templateUrl: 'team/productivity/datasets/team.labDatasets.html',
            link:
            function (scope,element,attrs) {

                scope.teamDatasets = [];

                scope.forms = {
                    'teamWorkRemove': 0,
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

                $rootScope.$on('updateLabDatasetsMessage', function (event,data) {
                    getDatasets();
                    initializeDetails();
                });

                getDatasets();
                initializeDetails();

                scope.removeDataset = function (pub) {
                    for (var ind in scope.teamDatasets) {
                        if (pub.labs_datasets_id === scope.teamDatasets[ind].labs_datasets_id) {
                            scope.teamDatasets.splice(ind,1);
                            scope.deleteDatasets.push(pub);
                            break;
                        }
                    }
                    scope.renderDatasets('');
                };
                scope.submitDatasetRemoval = function(ind) {
                    if (scope.deleteDatasets.length > 0) {
                        alert("This won't remove the datasets from the database." +
                          "\nIt will simply remove the connection of this lab with these datasets.");
                        scope.updateStatus[ind] = "Updating...";
                        scope.messageType[ind] = 'message-updating';
                        scope.hideMessage[ind] = false;
                        var data = {deleteDatasets: scope.deleteDatasets};
                        publications.removeDatasetsTeam(scope.group,scope.lab,data)
                            .then( function () {
                                initializeDetails();
                                getDatasets(ind);
                                $rootScope.$broadcast('removedLabDatasetsMessage', data);
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

                scope.renderDatasets = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }

                    scope.totalDatasets = scope.teamDatasets.length;
                    scope.selectedDatasets = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearWork = parseInt(scope.fromYearWork,10);
                    scope.toYearWork = parseInt(scope.toYearWork,10);
                    for (var ind in scope.teamDatasets) {
                        //scope.teamDatasets[ind]['year'] = momentToDate(scope.teamDatasets[ind]['status_date'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearWork)) {
                            if (scope.fromYearWork <= scope.teamDatasets[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearWork)) {
                            if (scope.toYearWork >= scope.teamDatasets[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedDatasets.push(scope.teamDatasets[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedDatasets.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedDatasets = scope.selectedDatasets.sort(sorter);

                    scope.currDatasets = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currDatasets.push(Object.assign({}, scope.selectedDatasets[member]));
                    }
                };

                function getDatasets() {
                    publications.thisTeamDatasets(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamDatasets = response.data.result;
                            scope.originalTeamDatasets = JSON.parse(JSON.stringify(scope.teamDatasets));
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function initializeVariables() {
                    scope.deleteDatasets = [];
                    scope.sortReverse = true;
                    scope.sortType = 'year';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    // computes the number of pages
                    scope.totalDatasets = scope.teamDatasets.length;
                    scope.totalPages = Math.ceil(scope.totalDatasets / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderDatasets();
                }
                function initializeDetails() {
                    /*scope.pubTitles = [];
                    scope.thisdataset = [];*/
                }
                function sorter(a,b) {
                    if (scope.sortType === 'year') {
                        if (scope.sortReverse) {
                            return b[scope.sortType]-a[scope.sortType];
                        } else {
                            return a[scope.sortType]-b[scope.sortType];
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
                scope.exportDatasetsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedDatasets = convertData(scope.selectedDatasets);
                    var ws = XLSX.utils.json_to_sheet(selectedDatasets);
                    wb.SheetNames = [wsName];
                    wb.Sheets = {};
                    wb.Sheets[wsName] = ws;
                    var wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
                    var dateTime = momentToDate(moment(),undefined,'YYYYMMDD_HHmmss')
                    var from;
                    var to;
                    if (scope.fromYearWork === undefined || isNaN(scope.fromYearWork)) {
                        from = 'all';
                    } else {
                        from = scope.fromYearWork;
                    }
                    if (scope.toYearWork === undefined || isNaN(scope.toYearWork)) {
                        to = 'all';
                    } else {
                        to = scope.toYearWork;
                    }
                    var fname = 'lab_datasets_' + from + '_' + to
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
                            data.push({
                                "Data type": arrObj[el]['data_set_type_name'],
                                "Database": arrObj[el]['database_name'],
                                "URL": arrObj[el]['url'],
                                "Num. sets": arrObj[el]['number_sets'],
                                "Description": arrObj[el]['short_description'],
                                "Year": arrObj[el]['year']
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
        .directive('teamMembersDatasets', teamMembersDatasets)
        .directive('teamLabDatasets', teamLabDatasets);
})();