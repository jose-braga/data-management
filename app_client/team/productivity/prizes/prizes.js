(function(){
    var teamMembersPrizes =
    ['personData','teamData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
    function (personData,teamData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
        return {
            restrict: 'E',
            scope: {
                lab: '@',
                group: '@'
            },
            templateUrl: 'team/productivity/prizes/team.membersPrizes.html',
            link:
            function (scope,element,attrs) {
                //this._mdPanel = $mdPanel;

                scope.teamPrizes = [];
                scope.membersPrizes = [];

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

                $rootScope.$on('removedLabPrizesMessage', function (event,data) {
                    getPrizes();
                });

                getPrizes();

                scope.renderPrizes = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalPrizes = scope.membersPrizes.length;
                    scope.selectedPrizes = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearWork = parseInt(scope.fromYearWork,10);
                    scope.toYearWork = parseInt(scope.toYearWork,10);
                    for (var ind in scope.membersPrizes) {
                        //scope.membersPrizes[ind]['year'] = momentToDate(scope.membersPrizes[ind]['status_date'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearWork)) {
                            if (scope.fromYearWork <= scope.membersPrizes[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearWork)) {
                            if (scope.toYearWork >= scope.membersPrizes[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedPrizes.push(scope.membersPrizes[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedPrizes.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedPrizes = scope.selectedPrizes.sort(sorter);
                    scope.currPrizes = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currPrizes.push(Object.assign({}, scope.selectedPrizes[member]));
                    }
                };
                scope.submitMembersPrizes = function (ind) {
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;
                    var data = {addPrizes: scope.newLabPrizes};
                    publications.addMembersPrizes(scope.group,scope.lab,data)
                        .then( function () {
                            getPrizes();
                            $rootScope.$broadcast('updateLabPrizesMessage', data);
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
                scope.addPrize = function (pub) {
                    var alreadyAdded = scope.newLabPrizes.filter(
                            function(el) {
                                return el.id === pub.id;
                            });
                    if (alreadyAdded.length === 0) {
                        scope.newLabPrizes.push(pub);
                    }
                };
                scope.removeRow = function (current, ind) {
                    current.splice(ind,1);
                };

                function getPrizes() {
                    publications.thisTeamPrizes(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamPrizes = response.data.result;
                            getMembersPrizes();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function getMembersPrizes() {
                    publications.thisMembersPrizes(scope.group, scope.lab)
                        .then(function (response) {
                            scope.membersPrizesAll = response.data.result;
                            var labPubIDs = scope.teamPrizes.map(function(obj){return obj.id;});
                            scope.membersPrizes = scope.membersPrizesAll.filter(
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

                    scope.newLabPrizes = [];

                    // computes the number of pages
                    scope.totalPrizes = scope.membersPrizes.length;
                    scope.totalPages = Math.ceil(scope.totalPrizes / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderPrizes();
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
                scope.exportPrizesSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedPrizes = convertData(scope.selectedPrizes);
                    var ws = XLSX.utils.json_to_sheet(selectedPrizes);
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
                    var fname = 'team_members_prizes_' + from + '_' + to
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
                                "Prize": arrObj[el]['name'],
                                "Year": arrObj[el]['year'],
                                "Recipients": arrObj[el]['recipients'],
                                "Organization": arrObj[el]['organization'],
                                "Amount (€)": arrObj[el]['amount_euro'],
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

    var teamLabPrizes =
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
            templateUrl: 'team/productivity/prizes/team.labPrizes.html',
            link:
            function (scope,element,attrs) {

                scope.teamPrizes = [];

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

                $rootScope.$on('updateLabPrizesMessage', function (event,data) {
                    getPrizes();
                    initializeDetails();
                });

                getPrizes();
                initializeDetails();

                scope.removePrize = function (pub) {
                    for (var ind in scope.teamPrizes) {
                        if (pub.labs_prizes_id === scope.teamPrizes[ind].labs_prizes_id) {
                            scope.teamPrizes.splice(ind,1);
                            scope.deletePrizes.push(pub);
                            break;
                        }
                    }
                    scope.renderPrizes('');
                };
                scope.submitPrizeRemoval = function(ind) {
                    if (scope.deletePrizes.length > 0) {
                        alert("This won't remove the prizes from the database." +
                          "\nIt will simply remove the connection of this lab with these prizes.");
                        scope.updateStatus[ind] = "Updating...";
                        scope.messageType[ind] = 'message-updating';
                        scope.hideMessage[ind] = false;
                        var data = {deletePrizes: scope.deletePrizes};
                        publications.removePrizesTeam(scope.group,scope.lab,data)
                            .then( function () {
                                initializeDetails();
                                getPrizes(ind);
                                $rootScope.$broadcast('removedLabPrizesMessage', data);
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

                scope.renderPrizes = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalPrizes = scope.teamPrizes.length;
                    scope.selectedPrizes = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearWork = parseInt(scope.fromYearWork,10);
                    scope.toYearWork = parseInt(scope.toYearWork,10);
                    for (var ind in scope.teamPrizes) {
                        //scope.teamPrizes[ind]['year'] = momentToDate(scope.teamPrizes[ind]['status_date'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearWork)) {
                            if (scope.fromYearWork <= scope.teamPrizes[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearWork)) {
                            if (scope.toYearWork >= scope.teamPrizes[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedPrizes.push(scope.teamPrizes[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedPrizes.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedPrizes = scope.selectedPrizes.sort(sorter);
                    scope.currPrizes = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currPrizes.push(Object.assign({}, scope.selectedPrizes[member]));
                    }
                };

                function getPrizes() {
                    publications.thisTeamPrizes(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamPrizes = response.data.result;
                            scope.originalTeamPrizes = JSON.parse(JSON.stringify(scope.teamPrizes));
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function initializeVariables() {
                    scope.deletePrizes = [];
                    scope.sortReverse = true;
                    scope.sortType = 'year';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    // computes the number of pages
                    scope.totalPrizes = scope.teamPrizes.length;
                    scope.totalPages = Math.ceil(scope.totalPrizes / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderPrizes();
                }
                function initializeDetails() {
                    /*scope.pubTitles = [];
                    scope.thisprize = [];*/
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
                scope.exportPrizesSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedPrizes = convertData(scope.selectedPrizes);
                    var ws = XLSX.utils.json_to_sheet(selectedPrizes);
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
                    var fname = 'lab_prizes_' + from + '_' + to
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
                                "Prize": arrObj[el]['name'],
                                "Year": arrObj[el]['year'],
                                "Recipients": arrObj[el]['recipients'],
                                "Organization": arrObj[el]['organization'],
                                "Amount (€)": arrObj[el]['amount_euro'],
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
        .directive('teamMembersPrizes', teamMembersPrizes)
        .directive('teamLabPrizes', teamLabPrizes)
})();