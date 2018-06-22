(function(){
    var teamMembersStartups =
    ['personData','teamData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
    function (personData,teamData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
        return {
            restrict: 'E',
            scope: {
                lab: '@',
                group: '@'
            },
            templateUrl: 'team/productivity/startups/team.membersStartups.html',
            link:
            function (scope,element,attrs) {
                //this._mdPanel = $mdPanel;

                scope.teamStartups = [];
                scope.membersStartups = [];

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

                $rootScope.$on('removedLabStartupsMessage', function (event,data) {
                    getStartups();
                });

                getStartups();

                scope.renderStartups = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalStartups = scope.membersStartups.length;
                    scope.selectedStartups = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearWork = parseInt(scope.fromYearWork,10);
                    scope.toYearWork = parseInt(scope.toYearWork,10);
                    for (var ind in scope.membersStartups) {
                        //scope.membersStartups[ind]['year'] = momentToDate(scope.membersStartups[ind]['status_date'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearWork)) {
                            if (scope.fromYearWork <= scope.membersStartups[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearWork)) {
                            if (scope.toYearWork >= scope.membersStartups[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedStartups.push(scope.membersStartups[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedStartups.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedStartups = scope.selectedStartups.sort(sorter);
                    scope.currStartups = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currStartups.push(Object.assign({}, scope.selectedStartups[member]));
                    }
                };
                scope.submitMembersStartups = function (ind) {
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;
                    var data = {addStartups: scope.newLabStartups};
                    publications.addMembersStartups(scope.group,scope.lab,data)
                        .then( function () {
                            getStartups();
                            $rootScope.$broadcast('updateLabStartupsMessage', data);
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
                scope.addStartup = function (pub) {
                    var alreadyAdded = scope.newLabStartups.filter(
                            function(el) {
                                return el.id === pub.id;
                            });
                    if (alreadyAdded.length === 0) {
                        scope.newLabStartups.push(pub);
                    }
                };
                scope.removeRow = function (current, ind) {
                    current.splice(ind,1);
                };

                function getStartups() {
                    publications.thisTeamStartups(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamStartups = response.data.result;
                            getMembersStartups();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function getMembersStartups() {
                    publications.thisMembersStartups(scope.group, scope.lab)
                        .then(function (response) {
                            scope.membersStartupsAll = response.data.result;
                            var labPubIDs = scope.teamStartups.map(function(obj){return obj.id;});
                            scope.membersStartups = scope.membersStartupsAll.filter(
                                    function (obj) { return labPubIDs.indexOf(obj.id) === -1;});
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }

                function initializeVariables() {
                    scope.sortReverse = true;
                    scope.sortType = 'start';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    scope.newLabStartups = [];

                    // computes the number of pages
                    scope.totalStartups = scope.membersStartups.length;
                    scope.totalPages = Math.ceil(scope.totalStartups / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderStartups();
                }
                function sorter(a,b) {
                    if (scope.sortType === 'start') {
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

                /* for exporting */
                scope.exportStartupsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedStartups = convertData(scope.selectedStartups);
                    var ws = XLSX.utils.json_to_sheet(selectedStartups);
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
                    var fname = 'team_members_startups_' + from + '_' + to
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
                                "Startup name": arrObj[el]['name'],
                                "Start": momentToDate(arrObj[el]['start']),
                                "End": momentToDate(arrObj[el]['end']),
                                "Description": arrObj[el]['short_description']
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

    var teamLabStartups =
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
            templateUrl: 'team/productivity/startups/team.labStartups.html',
            link:
            function (scope,element,attrs) {

                scope.teamStartups = [];

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

                $rootScope.$on('updateLabStartupsMessage', function (event,data) {
                    getStartups();
                    initializeDetails();
                });

                getStartups();
                initializeDetails();

                scope.removeStartup = function (pub) {
                    for (var ind in scope.teamStartups) {
                        if (pub.labs_startups_id === scope.teamStartups[ind].labs_startups_id) {
                            scope.teamStartups.splice(ind,1);
                            scope.deleteStartups.push(pub);
                            break;
                        }
                    }
                    scope.renderStartups('');
                };
                scope.submitStartupRemoval = function(ind) {
                    if (scope.deleteStartups.length > 0) {
                        alert("This won't remove the startups from the database." +
                          "\nIt will simply remove the connection of this lab with these startups.");
                        scope.updateStatus[ind] = "Updating...";
                        scope.messageType[ind] = 'message-updating';
                        scope.hideMessage[ind] = false;
                        var data = {deleteStartups: scope.deleteStartups};
                        publications.removeStartupsTeam(scope.group,scope.lab,data)
                            .then( function () {
                                initializeDetails();
                                getStartups(ind);
                                $rootScope.$broadcast('removedLabStartupsMessage', data);
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

                scope.renderStartups = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }

                    scope.totalStartups = scope.teamStartups.length;
                    scope.selectedStartups = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearWork = parseInt(scope.fromYearWork,10);
                    scope.toYearWork = parseInt(scope.toYearWork,10);
                    for (var ind in scope.teamStartups) {
                        //scope.teamStartups[ind]['year'] = momentToDate(scope.teamStartups[ind]['status_date'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearWork)) {
                            if (scope.fromYearWork <= scope.teamStartups[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearWork)) {
                            if (scope.toYearWork >= scope.teamStartups[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedStartups.push(scope.teamStartups[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedStartups.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedStartups = scope.selectedStartups.sort(sorter);

                    scope.currStartups = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currStartups.push(Object.assign({}, scope.selectedStartups[member]));
                    }
                };

                function getStartups() {
                    publications.thisTeamStartups(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamStartups = response.data.result;
                            scope.originalTeamStartups = JSON.parse(JSON.stringify(scope.teamStartups));
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function initializeVariables() {
                    scope.deleteStartups = [];
                    scope.sortReverse = true;
                    scope.sortType = 'start';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    // computes the number of pages
                    scope.totalStartups = scope.teamStartups.length;
                    scope.totalPages = Math.ceil(scope.totalStartups / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderStartups();
                }
                function initializeDetails() {
                    /*scope.pubTitles = [];
                    scope.thisstartup = [];*/
                }
                function sorter(a,b) {
                    if (scope.sortType === 'start') {
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

                /* for exporting */
                scope.exportStartupsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedStartups = convertData(scope.selectedStartups);
                    var ws = XLSX.utils.json_to_sheet(selectedStartups);
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
                    var fname = 'lab_startups_' + from + '_' + to
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
                                "Startup name": arrObj[el]['name'],
                                "Start": momentToDate(arrObj[el]['start']),
                                "End": momentToDate(arrObj[el]['end']),
                                "Description": arrObj[el]['short_description']
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
        .directive('teamMembersStartups', teamMembersStartups)
        .directive('teamLabStartups', teamLabStartups);
})();