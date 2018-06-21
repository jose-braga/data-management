(function(){

    var teamMembersCommunications =
    ['personData','teamData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
    function (personData,teamData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
        return {
            restrict: 'E',
            scope: {
                lab: '@',
                group: '@'
            },
            templateUrl: 'team/productivity/communications/team.membersCommunications.html',
            link:
            function (scope,element,attrs) {
                //this._mdPanel = $mdPanel;

                scope.teamCommunications = [];
                scope.membersCommunications = [];

                scope.forms = {
                    'membersComm': 0,
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

                $rootScope.$on('removedLabCommunicationsMessage', function (event,data) {
                    getCommunications();
                });

                getCommunications();

                scope.renderCommunications = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalCommunications = scope.membersCommunications.length;
                    scope.selectedCommunications = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearComm = parseInt(scope.fromYearComm,10);
                    scope.toYearComm = parseInt(scope.toYearComm,10);
                    for (var ind in scope.membersCommunications) {
                        scope.membersCommunications[ind]['year'] = momentToDate(scope.membersCommunications[ind]['date'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearComm)) {
                            if (scope.fromYearComm <= scope.membersCommunications[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearComm)) {
                            if (scope.toYearComm >= scope.membersCommunications[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedCommunications.push(scope.membersCommunications[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedCommunications.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedCommunications = scope.selectedCommunications.sort(sorter);
                    scope.currCommunications = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currCommunications.push(Object.assign({}, scope.selectedCommunications[member]));
                    }
                };
                scope.submitMembersCommunications = function (ind) {
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;
                    var data = {addCommunications: scope.newLabCommunications};
                    publications.addMembersCommunications(scope.group,scope.lab,data)
                        .then( function () {
                            getCommunications();
                            $rootScope.$broadcast('updateLabCommunicationsMessage', data);
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
                scope.addCommunication = function (pub) {
                    var alreadyAdded = scope.newLabCommunications.filter(
                            function(el) {
                                return el.id === pub.id;
                            });
                    if (alreadyAdded.length === 0) {
                        scope.newLabCommunications.push(pub);
                    }
                };
                scope.removeRow = function (current, ind) {
                    current.splice(ind,1);
                };

                function getCommunications() {
                    publications.thisTeamCommunications(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamCommunications = response.data.result;
                            getMembersCommunications();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function getMembersCommunications() {
                    publications.thisMembersCommunications(scope.group, scope.lab)
                        .then(function (response) {
                            scope.membersCommunicationsAll = response.data.result;
                            for (var el in scope.membersCommunicationsAll) {
                                scope.membersCommunicationsAll[el]['year'] = momentToDate(scope.membersCommunicationsAll[el]['date'],undefined,'YYYY');
                            }
                            var labPubIDs = scope.teamCommunications.map(function(obj){return obj.id;});
                            scope.membersCommunications = scope.membersCommunicationsAll.filter(
                                    function (obj) { return labPubIDs.indexOf(obj.id) === -1;});
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }

                function initializeVariables() {
                    scope.sortReverse = true;
                    scope.sortType = 'date';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    scope.newLabCommunications = [];

                    // computes the number of pages
                    scope.totalCommunications = scope.membersCommunications.length;
                    scope.totalPages = Math.ceil(scope.totalCommunications / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderCommunications();
                }
                function sorter(a,b) {
                    if (scope.sortType === 'date') {
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
                scope.exportCommunicationsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedCommunications = convertData(scope.selectedCommunications);
                    var ws = XLSX.utils.json_to_sheet(selectedCommunications);
                    wb.SheetNames = [wsName];
                    wb.Sheets = {};
                    wb.Sheets[wsName] = ws;
                    var wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
                    var dateTime = momentToDate(moment(),undefined,'YYYYMMDD_HHmmss')
                    var from;
                    var to;
                    if (scope.fromYearComm === undefined || isNaN(scope.fromYearComm)) {
                        from = 'all';
                    } else {
                        from = scope.fromYearComm;
                    }
                    if (scope.toYearComm === undefined || isNaN(scope.toYearComm)) {
                        to = 'all';
                    } else {
                        to = scope.toYearComm;
                    }
                    var fname = 'team_members_communications_' + from + '_' + to
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
                                "Authors": arrObj[el]['authors_raw'],
                                "Title": arrObj[el]['title'],
                                "Year": momentToDate(arrObj[el]['date'],undefined,'YYYY'),
                                "Date": momentToDate(arrObj[el]['date']),
                                "Conference": arrObj[el]['conference_title'],
                                "City": arrObj[el]['city'],
                                "Country": arrObj[el]['country_name'],
                                "Type Conference": arrObj[el]['conference_type'],
                                "Type Communication": arrObj[el]['communication_type_name']
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

    var teamLabCommunications =
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
            templateUrl: 'team/productivity/communications/team.labCommunications.html',
            link:
            function (scope,element,attrs) {
                //this._mdPanel = $mdPanel;

                scope.teamCommunications = [];

                scope.forms = {
                    'teamCommRemove': 0,
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

                $rootScope.$on('updateLabCommunicationsMessage', function (event,data) {
                    getCommunications();
                    initializeDetails();
                });

                getCommunications();
                initializeDetails();

                scope.removeCommunication = function (pub) {
                    for (var ind in scope.teamCommunications) {
                        if (pub.labs_communications_id === scope.teamCommunications[ind].labs_communications_id) {
                            scope.teamCommunications.splice(ind,1);
                            scope.deleteCommunications.push(pub);
                            break;
                        }
                    }
                    scope.renderCommunications('');
                };
                scope.submitCommunicationRemoval = function(ind) {
                    if (scope.deleteCommunications.length > 0) {
                        alert("This won't remove the communications from the database." +
                          "\nIt will simply remove the connection of this lab with these communications.");
                        scope.updateStatus[ind] = "Updating...";
                        scope.messageType[ind] = 'message-updating';
                        scope.hideMessage[ind] = false;
                        var data = {deleteCommunications: scope.deleteCommunications};
                        publications.removeCommunicationsTeam(scope.group,scope.lab,data)
                            .then( function () {
                                initializeDetails();
                                getCommunications(ind);
                                $rootScope.$broadcast('removedLabCommunicationsMessage', data);
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

                scope.renderCommunications = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalCommunications = scope.teamCommunications.length;
                    scope.selectedCommunications = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearComm = parseInt(scope.fromYearComm,10);
                    scope.toYearComm = parseInt(scope.toYearComm,10);
                    for (var ind in scope.teamCommunications) {
                        scope.teamCommunications[ind]['year'] = momentToDate(scope.teamCommunications[ind]['date'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearComm)) {
                            if (scope.fromYearComm <= scope.teamCommunications[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearComm)) {
                            if (scope.toYearComm >= scope.teamCommunications[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedCommunications.push(scope.teamCommunications[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedCommunications.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedCommunications = scope.selectedCommunications.sort(sorter);
                    scope.currCommunications = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currCommunications.push(Object.assign({}, scope.selectedCommunications[member]));
                    }
                };

                function getCommunications() {
                    publications.thisTeamCommunications(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamCommunications = response.data.result;
                            scope.originalTeamCommunications = JSON.parse(JSON.stringify(scope.teamCommunications));
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function initializeVariables() {
                    scope.deleteCommunications = [];
                    scope.sortReverse = true;
                    scope.sortType = 'date';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    // computes the number of pages
                    scope.totalCommunications = scope.teamCommunications.length;
                    scope.totalPages = Math.ceil(scope.totalCommunications / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderCommunications();
                }
                function initializeDetails() {
                    /*scope.pubTitles = [];
                    scope.thiscommunication = [];*/
                }
                function sorter(a,b) {
                    if (scope.sortType === 'date') {
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
                scope.exportCommunicationsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedCommunications = convertData(scope.selectedCommunications);
                    var ws = XLSX.utils.json_to_sheet(selectedCommunications);
                    wb.SheetNames = [wsName];
                    wb.Sheets = {};
                    wb.Sheets[wsName] = ws;
                    var wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
                    var dateTime = momentToDate(moment(),undefined,'YYYYMMDD_HHmmss')
                    var from;
                    var to;
                    if (scope.fromYearComm === undefined || isNaN(scope.fromYearComm)) {
                        from = 'all';
                    } else {
                        from = scope.fromYearComm;
                    }
                    if (scope.toYearComm === undefined || isNaN(scope.toYearComm)) {
                        to = 'all';
                    } else {
                        to = scope.toYearComm;
                    }
                    var fname = 'lab_communications_' + from + '_' + to
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
                                "Authors": arrObj[el]['authors_raw'],
                                "Title": arrObj[el]['title'],
                                "Year": momentToDate(arrObj[el]['date'],undefined,'YYYY'),
                                "Date": momentToDate(arrObj[el]['date']),
                                "Conference": arrObj[el]['conference_title'],
                                "City": arrObj[el]['city'],
                                "Country": arrObj[el]['country_name'],
                                "Type Conference": arrObj[el]['conference_type'],
                                "Type Communication": arrObj[el]['communication_type_name']
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
        .directive('teamMembersCommunications', teamMembersCommunications)
        .directive('teamLabCommunications', teamLabCommunications);

})();