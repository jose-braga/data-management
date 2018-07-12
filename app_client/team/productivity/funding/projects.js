(function(){
    var teamMembersProjects =
    ['personData','teamData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
    function (personData,teamData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
        return {
            restrict: 'E',
            scope: {
                lab: '@',
                group: '@'
            },
            templateUrl: 'team/productivity/funding/team.membersProjects.html',
            link:
            function (scope,element,attrs) {
                //this._mdPanel = $mdPanel;

                scope.teamProjects = [];
                scope.membersProjects = [];

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

                $rootScope.$on('removedLabProjectsMessage', function (event,data) {
                    getProjects();
                });

                getProjects();

                scope.renderProjects = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalProjects = scope.membersProjects.length;
                    scope.selectedProjects = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearWork = parseInt(scope.fromYearWork,10);
                    scope.toYearWork = parseInt(scope.toYearWork,10);
                    for (var ind in scope.membersProjects) {
                        scope.membersProjects[ind]['year'] = momentToDate(scope.membersProjects[ind]['start'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearWork)) {
                            if (scope.fromYearWork <= scope.membersProjects[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearWork)) {
                            if (scope.toYearWork >= scope.membersProjects[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedProjects.push(scope.membersProjects[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedProjects.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedProjects = scope.selectedProjects.sort(sorter);
                    scope.currProjects = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currProjects.push(Object.assign({}, scope.selectedProjects[member]));
                    }
                };
                scope.submitMembersProjects = function (ind) {
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;
                    var data = {addProjects: scope.newLabProjects};
                    publications.addMembersProjects(scope.group,scope.lab,data)
                        .then( function () {
                            getProjects();
                            $rootScope.$broadcast('updateLabProjectsMessage', data);
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
                scope.addProject = function (pub) {
                    var alreadyAdded = scope.newLabProjects.filter(
                            function(el) {
                                return el.id === pub.id;
                            });
                    if (alreadyAdded.length === 0) {
                        scope.newLabProjects.push(pub);
                    }
                };
                scope.removeRow = function (current, ind) {
                    current.splice(ind,1);
                };

                function getProjects() {
                    publications.thisTeamProjects(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamProjects = response.data.result;
                            getMembersProjects();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function getMembersProjects() {
                    publications.thisMembersProjects(scope.group, scope.lab)
                        .then(function (response) {
                            scope.membersProjectsAll = response.data.result;
                            var labPubIDs = scope.teamProjects.map(function(obj){return obj.project_id;});
                            scope.membersProjects = scope.membersProjectsAll.filter(
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

                    scope.newLabProjects = [];

                    // computes the number of pages
                    scope.totalProjects = scope.membersProjects.length;
                    scope.totalPages = Math.ceil(scope.totalProjects / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderProjects();
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
                scope.exportProjectsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedProjects = convertData(scope.selectedProjects);
                    var ws = XLSX.utils.json_to_sheet(selectedProjects);
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
                    var fname = 'team_members_projects_' + from + '_' + to
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
                                "Project title": arrObj[el]['title'],
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

    var teamLabProjects =
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
            templateUrl: 'team/productivity/funding/team.labProjects.html',
            link:
            function (scope,element,attrs) {

                scope.teamProjects = [];

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

                $rootScope.$on('updateLabProjectsMessage', function (event,data) {
                    getProjects();
                    initializeDetails();
                });

                getProjects();
                initializeDetails();

                scope.showDetailsProject = function (pub) {
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
                        templateUrl: 'team/productivity/funding/team.labProjectDetails.html',
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
                scope.removeProject = function (pub) {
                    for (var ind in scope.teamProjects) {
                        if (pub.labs_projects_id === scope.teamProjects[ind].labs_projects_id) {
                            scope.teamProjects.splice(ind,1);
                            scope.deleteProjects.push(pub);
                            break;
                        }
                    }
                    scope.renderProjects('');
                };
                scope.submitProjectRemoval = function(ind) {
                    if (scope.deleteProjects.length > 0) {
                        alert("This won't remove the projects from the database." +
                          "\nIt will simply remove the connection of this lab with these projects.");
                        scope.updateStatus[ind] = "Updating...";
                        scope.messageType[ind] = 'message-updating';
                        scope.hideMessage[ind] = false;
                        var data = {deleteProjects: scope.deleteProjects};
                        publications.removeProjectsTeam(scope.group,scope.lab,data)
                            .then( function () {
                                initializeDetails();
                                getProjects(ind);
                                $rootScope.$broadcast('removedLabProjectsMessage', data);
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

                scope.renderProjects = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }

                    scope.totalProjects = scope.teamProjects.length;
                    scope.selectedProjects = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearWork = parseInt(scope.fromYearWork,10);
                    scope.toYearWork = parseInt(scope.toYearWork,10);
                    for (var ind in scope.teamProjects) {
                        scope.teamProjects[ind]['year'] = momentToDate(scope.teamProjects[ind]['start'],undefined,'YYYY');
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearWork)) {
                            if (scope.fromYearWork <= scope.teamProjects[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearWork)) {
                            if (scope.toYearWork >= scope.teamProjects[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedProjects.push(scope.teamProjects[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedProjects.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedProjects = scope.selectedProjects.sort(sorter);

                    scope.currProjects = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currProjects.push(Object.assign({}, scope.selectedProjects[member]));
                    }
                };

                function getProjects() {
                    publications.thisTeamProjects(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamProjects = response.data.result;
                            scope.originalTeamProjects = JSON.parse(JSON.stringify(scope.teamProjects));
                            for (var id in scope.teamProjects) {
                                if (scope.teamProjects[id].funding_entity_id === null
                                        && scope.teamProjects[id].other_funding_entity !== null) {
                                    scope.teamProjects[id].funding_entity_id = 'other';
                                }
                                if (scope.teamProjects[id].call_type_id === null
                                        && scope.teamProjects.other_call_type !== null) {
                                    scope.teamProjects.call_type_id = 'other';
                                }
                            }
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function initializeVariables() {
                    scope.deleteProjects = [];
                    scope.sortReverse = true;
                    scope.sortType = 'start';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    // computes the number of pages
                    scope.totalProjects = scope.teamProjects.length;
                    scope.totalPages = Math.ceil(scope.totalProjects / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderProjects();
                }
                function initializeDetails() {
                    /*scope.pubTitles = [];
                    scope.thisproject = [];*/
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
                scope.exportProjectsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedProjects = convertData(scope.selectedProjects);
                    var ws = XLSX.utils.json_to_sheet(selectedProjects);
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
                    var fname = 'lab_projects_' + from + '_' + to
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
                                people = people + arrObj[el]['person_id'][per]['colloquial_name'] + ';';
                            }
                            var areas = '';
                            for (var per in arrObj[el]['project_areas']) {
                                areas = areas + arrObj[el]['project_areas'][per]['area'] + ';';
                            }
                            data.push({
                                "Project title": arrObj[el]['title'],
                                "Acronym": arrObj[el]['acronym'],
                                "Reference": arrObj[el]['reference'],
                                "Project type": arrObj[el]['project_type'],
                                "Call type": arrObj[el]['call_type_id'] != 'other' ? arrObj[el]['call_type'] : arrObj[el]['other_call_type'],
                                "People": people,
                                "Areas": areas,
                                "Global amount": arrObj[el]['global_amount'],
                                "Amount": arrObj[el]['amount'],
                                "% Hire Postdocs": arrObj[el]['percentage_hire_postdoc'],
                                "% Hire Students": arrObj[el]['percentage_hire_student'],
                                "Funding Agency": arrObj[el]['funding_entity_id'] != 'other' ? arrObj[el]['funding_agency_official_name'] : arrObj[el]['other_funding_entity'],
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
        .directive('teamMembersProjects', teamMembersProjects)
        .directive('teamLabProjects', teamLabProjects);
})();