(function(){
    var teamMembersAgreements =
    ['personData','teamData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
    function (personData,teamData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
        return {
            restrict: 'E',
            scope: {
                lab: '@',
                group: '@'
            },
            templateUrl: 'team/productivity/funding/team.membersAgreements.html',
            link:
            function (scope,element,attrs) {
                //this._mdPanel = $mdPanel;

                scope.teamAgreements = [];
                scope.membersAgreements = [];

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

                $rootScope.$on('removedLabAgreementsMessage', function (event,data) {
                    getAgreements();
                });

                getAgreements();

                scope.renderAgreements = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalAgreements = scope.membersAgreements.length;
                    scope.selectedAgreements = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearWork = parseInt(scope.fromYearWork,10);
                    scope.toYearWork = parseInt(scope.toYearWork,10);
                    for (var ind in scope.membersAgreements) {
                        scope.membersAgreements[ind]['year'] = momentToDate(scope.membersAgreements[ind]['start'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearWork)) {
                            if (scope.fromYearWork <= scope.membersAgreements[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearWork)) {
                            if (scope.toYearWork >= scope.membersAgreements[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedAgreements.push(scope.membersAgreements[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedAgreements.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedAgreements = scope.selectedAgreements.sort(sorter);
                    scope.currAgreements = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currAgreements.push(Object.assign({}, scope.selectedAgreements[member]));
                    }
                };
                scope.submitMembersAgreements = function (ind) {
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;
                    var data = {addAgreements: scope.newLabAgreements};
                    publications.addMembersAgreements(scope.group,scope.lab,data)
                        .then( function () {
                            getAgreements();
                            $rootScope.$broadcast('updateLabAgreementsMessage', data);
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
                scope.addAgreement = function (pub) {
                    var alreadyAdded = scope.newLabAgreements.filter(
                            function(el) {
                                return el.id === pub.id;
                            });
                    if (alreadyAdded.length === 0) {
                        scope.newLabAgreements.push(pub);
                    }
                };
                scope.removeRow = function (current, ind) {
                    current.splice(ind,1);
                };

                function getAgreements() {
                    publications.thisTeamAgreements(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamAgreements = response.data.result;
                            getMembersAgreements();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function getMembersAgreements() {
                    publications.thisMembersAgreements(scope.group, scope.lab)
                        .then(function (response) {
                            scope.membersAgreementsAll = response.data.result;
                            var labPubIDs = scope.teamAgreements.map(function(obj){return obj.agreement_id;});
                            scope.membersAgreements = scope.membersAgreementsAll.filter(
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

                    scope.newLabAgreements = [];

                    // computes the number of pages
                    scope.totalAgreements = scope.membersAgreements.length;
                    scope.totalPages = Math.ceil(scope.totalAgreements / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderAgreements();
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
                scope.exportAgreementsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedAgreements = convertData(scope.selectedAgreements);
                    var ws = XLSX.utils.json_to_sheet(selectedAgreements);
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
                    var fname = 'team_members_agreements_' + from + '_' + to
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
                                "Agreement title": arrObj[el]['title'],
                                "Acronym": arrObj[el]['acronym'],
                                "Reference": arrObj[el]['reference'],
                                "Confidential": arrObj[el]['confidential'],
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

    var teamLabAgreements =
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
            templateUrl: 'team/productivity/funding/team.labAgreements.html',
            link:
            function (scope,element,attrs) {

                scope.teamAgreements = [];

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

                $rootScope.$on('updateLabAgreementsMessage', function (event,data) {
                    getAgreements();
                    initializeDetails();
                });

                getAgreements();
                initializeDetails();

                scope.showDetailsAgreement = function (pub) {
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
                        templateUrl: 'team/productivity/funding/team.labAgreementDetails.html',
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
                scope.removeAgreement = function (pub) {
                    for (var ind in scope.teamAgreements) {
                        if (pub.labs_agreements_id === scope.teamAgreements[ind].labs_agreements_id) {
                            scope.teamAgreements.splice(ind,1);
                            scope.deleteAgreements.push(pub);
                            break;
                        }
                    }
                    scope.renderAgreements('');
                };
                scope.submitAgreementRemoval = function(ind) {
                    if (scope.deleteAgreements.length > 0) {
                        alert("This won't remove the agreements from the database." +
                          "\nIt will simply remove the connection of this lab with these agreements.");
                        scope.updateStatus[ind] = "Updating...";
                        scope.messageType[ind] = 'message-updating';
                        scope.hideMessage[ind] = false;
                        var data = {deleteAgreements: scope.deleteAgreements};
                        publications.removeAgreementsTeam(scope.group,scope.lab,data)
                            .then( function () {
                                initializeDetails();
                                getAgreements(ind);
                                $rootScope.$broadcast('removedLabAgreementsMessage', data);
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

                scope.renderAgreements = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }

                    scope.totalAgreements = scope.teamAgreements.length;
                    scope.selectedAgreements = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearWork = parseInt(scope.fromYearWork,10);
                    scope.toYearWork = parseInt(scope.toYearWork,10);
                    for (var ind in scope.teamAgreements) {
                        scope.teamAgreements[ind]['year'] = momentToDate(scope.teamAgreements[ind]['start'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearWork)) {
                            if (scope.fromYearWork <= scope.teamAgreements[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearWork)) {
                            if (scope.toYearWork >= scope.teamAgreements[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedAgreements.push(scope.teamAgreements[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedAgreements.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedAgreements = scope.selectedAgreements.sort(sorter);

                    scope.currAgreements = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currAgreements.push(Object.assign({}, scope.selectedAgreements[member]));
                    }
                };

                function getAgreements() {
                    publications.thisTeamAgreements(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamAgreements = response.data.result;
                            scope.originalTeamAgreements = JSON.parse(JSON.stringify(scope.teamAgreements));
                            for (var id in scope.teamAgreements) {
                                if (scope.teamAgreements[id].funding_entity_id === null
                                        && scope.teamAgreements[id].other_funding_entity !== null) {
                                    scope.teamAgreements[id].funding_entity_id = 'other';
                                }
                            }
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function initializeVariables() {
                    scope.deleteAgreements = [];
                    scope.sortReverse = true;
                    scope.sortType = 'start';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    // computes the number of pages
                    scope.totalAgreements = scope.teamAgreements.length;
                    scope.totalPages = Math.ceil(scope.totalAgreements / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderAgreements();
                }
                function initializeDetails() {
                    /*scope.pubTitles = [];
                    scope.thisagreement = [];*/
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
                scope.exportAgreementsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedAgreements = convertData(scope.selectedAgreements);
                    var ws = XLSX.utils.json_to_sheet(selectedAgreements);
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
                    var fname = 'lab_agreements_' + from + '_' + to
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
                                people = people + arrObj[el]['person_id'][per]['colloquial_name'] + '; ';
                            }
                            var areas = '';
                            for (var per in arrObj[el]['agreement_areas']) {
                                areas = areas + arrObj[el]['agreement_areas'][per]['area'] + '; ';
                            }
                            var partners = '';
                            for (var per in arrObj[el]['agreement_partners']) {
                                partners = partners + arrObj[el]['agreement_partners'][per]['name'] + '('
                                        + arrObj[el]['agreement_partners'][per]['country'] + ')' + ';';
                            }
                            data.push({
                                "Agreement title": arrObj[el]['title'],
                                "Acronym": arrObj[el]['acronym'],
                                "Reference": arrObj[el]['reference'],
                                "Agreement type": arrObj[el]['agreement_type'],
                                "Confidential": arrObj[el]['confidential'],
                                "People": people,
                                "Areas": areas,
                                "Partners": partners,
                                "Global amount": arrObj[el]['global_amount'],
                                "Management entity amount": arrObj[el]['entity_amount'],
                                "Group Amount": arrObj[el]['amount'],
                                "% Hire Postdocs": arrObj[el]['percentage_hire_postdoc'],
                                "% Hire Students": arrObj[el]['percentage_hire_student'],
                                "Management entity": arrObj[el]['management_entity_official_name'],
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
        .directive('teamMembersAgreements', teamMembersAgreements)
        .directive('teamLabAgreements', teamLabAgreements);

})();