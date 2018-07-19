(function(){
    var teamMembersTrainings =
    ['personData','teamData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
    function (personData,teamData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
        return {
            restrict: 'E',
            scope: {
                lab: '@',
                group: '@'
            },
            templateUrl: 'team/productivity/funding/team.membersTrainings.html',
            link:
            function (scope,element,attrs) {
                //this._mdPanel = $mdPanel;

                scope.teamTrainings = [];
                scope.membersTrainings = [];

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

                $rootScope.$on('removedLabTrainingsMessage', function (event,data) {
                    getTrainings();
                });

                getTrainings();

                scope.renderTrainings = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalTrainings = scope.membersTrainings.length;
                    scope.selectedTrainings = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearWork = parseInt(scope.fromYearWork,10);
                    scope.toYearWork = parseInt(scope.toYearWork,10);
                    for (var ind in scope.membersTrainings) {
                        scope.membersTrainings[ind]['year'] = momentToDate(scope.membersTrainings[ind]['start'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearWork)) {
                            if (scope.fromYearWork <= scope.membersTrainings[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearWork)) {
                            if (scope.toYearWork >= scope.membersTrainings[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedTrainings.push(scope.membersTrainings[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedTrainings.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedTrainings = scope.selectedTrainings.sort(sorter);
                    scope.currTrainings = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currTrainings.push(Object.assign({}, scope.selectedTrainings[member]));
                    }
                };
                scope.submitMembersTrainings = function (ind) {
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;
                    var data = {addTrainings: scope.newLabTrainings};
                    publications.addMembersTrainings(scope.group,scope.lab,data)
                        .then( function () {
                            getTrainings();
                            $rootScope.$broadcast('updateLabTrainingsMessage', data);
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
                scope.addTraining = function (pub) {
                    var alreadyAdded = scope.newLabTrainings.filter(
                            function(el) {
                                return el.id === pub.id;
                            });
                    if (alreadyAdded.length === 0) {
                        scope.newLabTrainings.push(pub);
                    }
                };
                scope.removeRow = function (current, ind) {
                    current.splice(ind,1);
                };

                function getTrainings() {
                    publications.thisTeamTrainings(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamTrainings = response.data.result;
                            getMembersTrainings();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function getMembersTrainings() {
                    publications.thisMembersTrainings(scope.group, scope.lab)
                        .then(function (response) {
                            scope.membersTrainingsAll = response.data.result;
                            var labPubIDs = scope.teamTrainings.map(function(obj){return obj.training_id;});
                            scope.membersTrainings = scope.membersTrainingsAll.filter(
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

                    scope.newLabTrainings = [];

                    // computes the number of pages
                    scope.totalTrainings = scope.membersTrainings.length;
                    scope.totalPages = Math.ceil(scope.totalTrainings / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderTrainings();
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
                scope.exportTrainingsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedTrainings = convertData(scope.selectedTrainings);
                    var ws = XLSX.utils.json_to_sheet(selectedTrainings);
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
                    var fname = 'team_members_trainings_' + from + '_' + to
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
                                "Network name": arrObj[el]['network_name'],
                                "Coordinating Entity": arrObj[el]['coordinating_entity'],
                                "Title": arrObj[el]['title'],
                                "Acronym": arrObj[el]['acronym'],
                                "Reference": arrObj[el]['reference'],
                                "Global amount": arrObj[el]['global_amount'],
                                "Start": momentToDate(arrObj[el]['start']),
                                "End": momentToDate(arrObj[el]['end']),
                                "Website": arrObj[el]['website'],
                                "Notes": arrObj[el]['notes']
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

    var teamLabTrainings =
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
            templateUrl: 'team/productivity/funding/team.labTrainings.html',
            link:
            function (scope,element,attrs) {

                scope.teamTrainings = [];

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

                $rootScope.$on('updateLabTrainingsMessage', function (event,data) {
                    getTrainings();
                    initializeDetails();
                });

                getTrainings();
                initializeDetails();

                scope.showDetailsTraining = function (pub) {
                    var position = $mdPanel.newPanelPosition()
                                        .absolute()
                                        .center();
                    var workDetailsCtrl = function(mdPanelRef) {
                        this._mdPanelRef = mdPanelRef;
                    };
                    var config = {
                        //attachTo: angular.element(document.body),
                        controller: workDetailsCtrl,
                        controllerAs: 'ctrl',
                        templateUrl: 'team/productivity/funding/team.labTrainingDetails.html',
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
                scope.removeTraining = function (pub) {
                    for (var ind in scope.teamTrainings) {
                        if (pub.labs_trainings_id === scope.teamTrainings[ind].labs_trainings_id) {
                            scope.teamTrainings.splice(ind,1);
                            scope.deleteTrainings.push(pub);
                            break;
                        }
                    }
                    scope.renderTrainings('');
                };
                scope.submitTrainingRemoval = function(ind) {
                    if (scope.deleteTrainings.length > 0) {
                        alert("This won't remove the trainings from the database." +
                          "\nIt will simply remove the connection of this lab with these trainings.");
                        scope.updateStatus[ind] = "Updating...";
                        scope.messageType[ind] = 'message-updating';
                        scope.hideMessage[ind] = false;
                        var data = {deleteTrainings: scope.deleteTrainings};
                        publications.removeTrainingsTeam(scope.group,scope.lab,data)
                            .then( function () {
                                initializeDetails();
                                getTrainings(ind);
                                $rootScope.$broadcast('removedLabTrainingsMessage', data);
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

                scope.renderTrainings = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }

                    scope.totalTrainings = scope.teamTrainings.length;
                    scope.selectedTrainings = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearWork = parseInt(scope.fromYearWork,10);
                    scope.toYearWork = parseInt(scope.toYearWork,10);
                    for (var ind in scope.teamTrainings) {
                        scope.teamTrainings[ind]['year'] = momentToDate(scope.teamTrainings[ind]['start'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearWork)) {
                            if (scope.fromYearWork <= scope.teamTrainings[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearWork)) {
                            if (scope.toYearWork >= scope.teamTrainings[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedTrainings.push(scope.teamTrainings[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedTrainings.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedTrainings = scope.selectedTrainings.sort(sorter);

                    scope.currTrainings = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currTrainings.push(Object.assign({}, scope.selectedTrainings[member]));
                    }
                };

                function getTrainings() {
                    publications.thisTeamTrainings(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamTrainings = response.data.result;
                            scope.originalTeamTrainings = JSON.parse(JSON.stringify(scope.teamTrainings));
                            for (var id in scope.teamTrainings) {
                                if (scope.teamTrainings[id].funding_entity_id === null
                                        && scope.teamTrainings[id].other_funding_entity !== null) {
                                    scope.teamTrainings[id].funding_entity_id = 'other';
                                }
                            }
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function initializeVariables() {
                    scope.deleteTrainings = [];
                    scope.sortReverse = true;
                    scope.sortType = 'start';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    // computes the number of pages
                    scope.totalTrainings = scope.teamTrainings.length;
                    scope.totalPages = Math.ceil(scope.totalTrainings / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderTrainings();
                }
                function initializeDetails() {
                    /*scope.pubTitles = [];
                    scope.thistraining = [];*/
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
                scope.exportTrainingsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedTrainings = convertData(scope.selectedTrainings);
                    var ws = XLSX.utils.json_to_sheet(selectedTrainings);
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
                    var fname = 'lab_trainings_' + from + '_' + to
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
                            var people = '';
                            for (var per in arrObj[el]['person_id']) {
                                people = people + arrObj[el]['person_id'][per]['colloquial_name'] +
                                                + '(' + arrObj[el]['person_id'][per]['role_name'] + ')' + '; ';
                            }
                            data.push({
                                "Network name": arrObj[el]['network_name'],
                                "Coordinating Entity": arrObj[el]['coordinating_entity'],
                                "Country": arrObj[el]['country_name'],
                                "Title": arrObj[el]['title'],
                                "Acronym": arrObj[el]['acronym'],
                                "Reference": arrObj[el]['reference'],
                                "People": people,
                                "Global amount": arrObj[el]['global_amount'],
                                "Management entity": arrObj[el]['management_entity_official_name'],
                                "Management entity amount": arrObj[el]['entity_amount'],
                                "Group Amount": arrObj[el]['amount'],
                                "Start": momentToDate(arrObj[el]['start']),
                                "End": momentToDate(arrObj[el]['end']),
                                "Website": arrObj[el]['website'],
                                "Notes": arrObj[el]['notes']
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
        .directive('teamMembersTrainings', teamMembersTrainings)
        .directive('teamLabTrainings', teamLabTrainings);

})();