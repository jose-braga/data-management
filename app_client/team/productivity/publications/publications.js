(function(){
    var teamMembersPublications =
    ['personData','teamData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
    function (personData,teamData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
        return {
            restrict: 'E',
            scope: {
                lab: '@',
                group: '@'
            },
            templateUrl: 'team/productivity/publications/team.membersPublications.html',
            link:
            function (scope,element,attrs) {
                //this._mdPanel = $mdPanel;

                scope.teamPublications = [];
                scope.membersPublications = [];

                scope.forms = {
                    'membersPub': 0,
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

                $rootScope.$on('removedLabPublicationsMessage', function (event,data) {
                    getPublications();
                    initializeDetails();
                });

                getPublications();
                initializeDetails();

                scope.showDetailsPublication = function (pub) {
                    var authors = pub.authors_raw.split('; ');
                    var authors_str = '';
                    for (var ind in authors) {
                        if (ind > 0) {
                            authors_str = authors_str + '; ' + authors[ind];
                        } else {
                            authors_str = authors_str + authors[ind];
                        }
                    }
                    pub['authors'] = authors_str;
                    for (var ind in pub.publication_type) {
                        if (ind > 0) {
                            pub['doc_type'] = pub['doc_type'] + '; ' + pub.publication_type[ind].name_en;
                        } else {
                            pub['doc_type'] = pub.publication_type[ind].name_en;
                        }
                    }
                    var if_last_year;
                    for (var ind in pub.impact_factors) {
                        if (ind > 0) {
                            if (if_last_year.year < pub.impact_factors[ind].year) {
                                if_last_year = pub.impact_factors[ind];
                            }
                        } else {
                            if_last_year = pub.impact_factors[ind];
                        }
                    }
                    pub['if_last_year'] = if_last_year;

                    var position = $mdPanel.newPanelPosition()
                                        .absolute()
                                        .center();
                    var pubDetailsCtrl = function(mdPanelRef) {
                        this._mdPanelRef = mdPanelRef;
                    };
                    var config = {
                        //attachTo: angular.element(document.body),
                        controller: pubDetailsCtrl,
                        controllerAs: 'ctrl',
                        templateUrl: 'team/productivity/publications/team.membersPublicationDetails.html',
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
                scope.showTable = function () {
                    return $mdMedia('min-width: 1440px');
                };
                scope.sortColumn = function(colName) {
                    if (colName === scope.sortType) {
                        scope.sortReverse = !scope.sortReverse;
                    } else {
                        scope.sortType = colName;
                        scope.sortReverse = false;
                    }
                    scope.renderPublications('new');
                };
                scope.renderPublications = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalPublications = scope.membersPublications.length;
                    scope.selectedPublications = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearPub = parseInt(scope.fromYearPub,10);
                    scope.toYearPub = parseInt(scope.toYearPub,10);
                    for (var ind in scope.membersPublications) {
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearPub)) {
                            if (scope.fromYearPub <= scope.membersPublications[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearPub)) {
                            if (scope.toYearPub >= scope.membersPublications[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedPublications.push(scope.membersPublications[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedPublications.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedPublications = scope.selectedPublications.sort(sorter);
                    scope.currPublications = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currPublications.push(Object.assign({}, scope.selectedPublications[member]));
                    }
                };
                scope.submitMembersPublications = function (ind) {
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;
                    var data = {addPublications: scope.newLabPublications};
                    publications.addMembersPublications(scope.group,scope.lab,data)
                        .then( function () {
                            getPublications();
                            $rootScope.$broadcast('updateLabPublicationsMessage', data);
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
                scope.addPublication = function (pub) {
                    var alreadyAdded = scope.newLabPublications.filter(
                            function(el) {
                                return el.id === pub.id;
                            });
                    if (alreadyAdded.length === 0) {
                        scope.newLabPublications.push(pub);
                    }
                };
                scope.removeRow = function (current, ind) {
                    current.splice(ind,1);
                };

                function getPublications() {
                    publications.thisTeamPublications(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamPublications = response.data.result;
                            getMembersPublications();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function getMembersPublications() {
                    publications.thisMembersPublications(scope.group, scope.lab)
                        .then(function (response) {
                            scope.membersPublicationsAll = response.data.result;
                            var labPubIDs = scope.teamPublications.map(function(obj){return obj.id;});
                            scope.membersPublications = scope.membersPublicationsAll.filter(
                                    function (obj) { return labPubIDs.indexOf(obj.id) === -1;});
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }

                function initializeVariables() {
                    scope.sortReverse = false;
                    scope.sortType = 'year';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    scope.newLabPublications = [];

                    // computes the number of pages
                    scope.totalPublications = scope.membersPublications.length;
                    scope.totalPages = Math.ceil(scope.totalPublications / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderPublications();
                }
                function initializeDetails() {
                    scope.pubTitles = [];
                    scope.thisPublication = [];
                }
                function sorter(a,b) {
                    if (scope.sortType === 'year') {
                        if (scope.sortReverse) {
                            return (a[scope.sortType] ? String(a[scope.sortType]) : String(9999))
                                .localeCompare(b[scope.sortType] ? String(b[scope.sortType]) : String(9999));
                        } else {
                            return -(a[scope.sortType] ? String(a[scope.sortType]) : String(2000))
                                .localeCompare(b[scope.sortType] ? String(b[scope.sortType]) : String(2000));
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
                scope.exportPublicationsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedPublications = convertData(scope.selectedPublications);
                    var ws = XLSX.utils.json_to_sheet(selectedPublications);
                    wb.SheetNames = [wsName];
                    wb.Sheets = {};
                    wb.Sheets[wsName] = ws;
                    var wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
                    var dateTime = momentToDate(moment(),undefined,'YYYYMMDD_HHmmss')
                    var from;
                    var to;
                    if (scope.fromYearPub === undefined || isNaN(scope.fromYearPub)) {
                        from = 'all';
                    } else {
                        from = scope.fromYearPub;
                    }
                    if (scope.toYearPub === undefined || isNaN(scope.toYearPub)) {
                        to = 'all';
                    } else {
                        to = scope.toYearPub;
                    }
                    var fname = 'team_members_publications_' + from + '_' + to
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
                            for (var ind in arrObj[el].publication_type) {
                                if (ind > 0) {
                                    arrObj[el]['doc_type'] = arrObj[el]['doc_type'] + '; ' + arrObj[el].publication_type[ind].name_en;
                                } else {
                                    arrObj[el]['doc_type'] = arrObj[el].publication_type[ind].name_en;
                                }
                            }
                            var if_last_year;
                            for (var ind in arrObj[el].impact_factors) {
                                if (ind > 0) {
                                    if (if_last_year.year < arrObj[el].impact_factors[ind].year) {
                                        if_last_year = arrObj[el].impact_factors[ind];
                                    }
                                } else {
                                    if_last_year = arrObj[el].impact_factors[ind];
                                }
                            }
                            var citations_last_year;
                            for (var ind in arrObj[el].citations) {
                                if (ind > 0) {
                                    if (citations_last_year.year < arrObj[el].citations[ind].year) {
                                        citations_last_year = arrObj[el].citations[ind];
                                    }
                                } else {
                                    citations_last_year = arrObj[el].citations[ind];
                                }
                            }
                            data.push({
                                "Authors": arrObj[el]['authors_raw'],
                                "Title": arrObj[el]['title'],
                                "Year": arrObj[el]['year'],
                                "Publication Date": arrObj[el]['publication_date'],
                                "Journal Name": arrObj[el]['journal_name'],
                                "Journal Short Name": arrObj[el]['journal_short_name'],
                                "Publisher": arrObj[el]['publisher'],
                                "Publisher City": arrObj[el]['publisher_city'],
                                "ISSN": arrObj[el]['issn'],
                                "EISSN": arrObj[el]['eissn'],
                                "Volume": arrObj[el]['volume'],
                                "Page Start": arrObj[el]['page_start'],
                                "Page End": arrObj[el]['page_end'],
                                "DOI": arrObj[el]['doi'],
                                "WOS": arrObj[el]['wos'],
                                "PubMed ID": arrObj[el]['pubmed_id'],
                                "DOI": arrObj[el]['doi'],
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

    var teamLabPublications =
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
            templateUrl: 'team/productivity/publications/team.labPublications.html',
            link:
            function (scope,element,attrs) {
                //this._mdPanel = $mdPanel;

                scope.teamPublications = [];

                scope.forms = {
                    'teamSelectedPub': 0,
                    'teamPubRemove': 1,
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

                $rootScope.$on('updateLabPublicationsMessage', function (event,data) {
                    getPublications();
                    initializeDetails();
                });

                getPublications();
                initializeDetails();

                scope.changeSelectedStatus = function (pub) {
                    for (var ind in scope.teamPublications) {
                        if (pub.labs_publications_id === scope.teamPublications[ind].labs_publications_id) {
                            scope.teamPublications[ind].selected = pub.selected;
                            break;
                        }
                    }
                };
                scope.changePublicStatus = function (pub) {
                    for (var ind in scope.teamPublications) {
                        if (pub.labs_publications_id === scope.teamPublications[ind].labs_publications_id) {
                            scope.teamPublications[ind].public = pub.public;
                            break;
                        }
                    }
                };
                scope.removePublication = function (pub) {
                    for (var ind in scope.teamPublications) {
                        if (pub.labs_publications_id === scope.teamPublications[ind].labs_publications_id) {
                            scope.teamPublications.splice(ind,1);
                            scope.deletePublications.push(pub);
                            break;
                        }
                    }
                    scope.renderPublications('');
                };
                scope.submitSelectedTeamPublications = function (ind) {
                    scope.updateStatus[ind] = "Updating...";
                    scope.messageType[ind] = 'message-updating';
                    scope.hideMessage[ind] = false;
                    var data = processSelectedPub(scope.teamPublications,scope.originalTeamPublications);
                    publications.updateTeamSelectedPublications(scope.group,scope.lab,data)
                        .then( function () {
                            getPublications();
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
                scope.submitPublicationRemoval = function(ind) {
                    if (scope.deletePublications.length > 0) {
                        alert("This won't remove the publications from the database." +
                          "\nIt will simply remove the connection of this lab with these publications.");
                        scope.updateStatus[ind] = "Updating...";
                        scope.messageType[ind] = 'message-updating';
                        scope.hideMessage[ind] = false;
                        var data = {deletePublications: scope.deletePublications};
                        publications.removePublicationsTeam(scope.group,scope.lab,data)
                            .then( function () {
                                initializeDetails();
                                getPublications(ind);
                                $rootScope.$broadcast('removedLabPublicationsMessage', data);
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

                scope.showDetailsPublication = function (pub) {
                    var authors = pub.authors_raw.split('; ');
                    var authors_str = '';
                    for (var ind in authors) {
                        if (ind > 0) {
                            authors_str = authors_str + '; ' + authors[ind];
                        } else {
                            authors_str = authors_str + authors[ind];
                        }
                    }
                    pub['authors'] = authors_str;
                    for (var ind in pub.publication_type) {
                        if (ind > 0) {
                            pub['doc_type'] = pub['doc_type'] + '; ' + pub.publication_type[ind].name_en;
                        } else {
                            pub['doc_type'] = pub.publication_type[ind].name_en;
                        }
                    }
                    var if_last_year;
                    for (var ind in pub.impact_factors) {
                        if (ind > 0) {
                            if (if_last_year.year < pub.impact_factors[ind].year) {
                                if_last_year = pub.impact_factors[ind];
                            }
                        } else {
                            if_last_year = pub.impact_factors[ind];
                        }
                    }
                    pub['if_last_year'] = if_last_year;

                    var position = $mdPanel.newPanelPosition()
                                        .absolute()
                                        .center();
                    var pubDetailsCtrl = function(mdPanelRef) {
                        this._mdPanelRef = mdPanelRef;
                    };
                    var config = {
                        //attachTo: angular.element(document.body),
                        controller: pubDetailsCtrl,
                        controllerAs: 'ctrl',
                        templateUrl: 'team/productivity/publications/team.labPublicationDetail.html',
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
                scope.showTable = function () {
                    return $mdMedia('min-width: 1440px');
                };
                scope.sortColumn = function(colName) {
                    if (colName === scope.sortType) {
                        scope.sortReverse = !scope.sortReverse;
                    } else {
                        scope.sortType = colName;
                        scope.sortReverse = false;
                    }
                    scope.renderPublications('new');
                };
                scope.changeSelectedStatus = function (pub) {
                    for (var ind in scope.teamPublications) {
                        if (pub.id === scope.teamPublications[ind].id) {
                            scope.teamPublications[ind].selected = pub.selected;
                            break;
                        }
                    }
                };
                scope.renderPublications = function (str, ind) {
                    if (str === 'new') {
                        scope.currentPage = 1;
                    }
                    scope.totalPublications = scope.teamPublications.length;
                    scope.selectedPublications = [];
                    var toInclude = 0;
                    var toIncludeDueFrom = 0;
                    var toIncludeDueTo = 0;
                    scope.fromYearPub = parseInt(scope.fromYearPub,10);
                    scope.toYearPub = parseInt(scope.toYearPub,10);
                    for (var ind in scope.teamPublications) {
                        toInclude = 0;
                        toIncludeDueFrom = 0;
                        toIncludeDueTo = 0;
                        if (Number.isInteger(scope.fromYearPub)) {
                            if (scope.fromYearPub <= scope.teamPublications[ind].year) {
                               toIncludeDueFrom = 1;
                            }
                        } else {
                            toIncludeDueFrom = 1;
                        }
                        if (Number.isInteger(scope.toYearPub)) {
                            if (scope.toYearPub >= scope.teamPublications[ind].year) {
                               toIncludeDueTo = 1;
                            }
                        } else {
                            toIncludeDueTo = 1;
                        }
                        toInclude = toIncludeDueFrom * toIncludeDueTo;
                        if (toInclude === 1) {
                            scope.selectedPublications.push(scope.teamPublications[ind]);
                        }
                    }
                    scope.totalFromSearch = scope.selectedPublications.length;

                    scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    // Sort selectedPeople according to defined order, before
                    // defining page contents
                    scope.selectedPublications = scope.selectedPublications.sort(sorter);
                    scope.currPublications = [];
                    for (var member = (scope.currentPage - 1) * scope.pageSize;
                            member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                            member++) {
                        scope.currPublications.push(Object.assign({}, scope.selectedPublications[member]));
                    }
                };

                function getPublications() {
                    publications.thisTeamPublications(scope.group, scope.lab)
                        .then(function (response) {
                            scope.teamPublications = response.data.result;
                            for (var ind in scope.teamPublications) {
                                if (scope.teamPublications[ind].selected === 1) {
                                    scope.teamPublications[ind].selected = true;
                                } else {
                                    scope.teamPublications[ind].selected = false;
                                }
                                if (scope.teamPublications[ind].public === 1) {
                                    scope.teamPublications[ind].public = true;
                                } else {
                                    scope.teamPublications[ind].public = false;
                                }
                            }
                            scope.originalTeamPublications = JSON.parse(JSON.stringify(scope.teamPublications));
                            initializeVariables();
                        })
                        .catch(function (err) {
                            console.log(err);
                        });
                }
                function initializeVariables() {
                    scope.deletePublications = [];
                    scope.sortReverse = false;
                    scope.sortType = 'year';
                    scope.currentPage = 1;
                    scope.pageSize = 10;

                    // computes the number of pages
                    scope.totalPublications = scope.teamPublications.length;
                    scope.totalPages = Math.ceil(scope.totalPublications / scope.pageSize);
                    scope.pages = [];
                    for (var num=1; num<=scope.totalPages; num++) {
                        scope.pages.push(num);
                    }
                    scope.renderPublications();
                }
                function initializeDetails() {
                    scope.pubTitles = [];
                    scope.thisPublication = [];
                }
                function sorter(a,b) {
                    if (scope.sortType === 'year') {
                        if (scope.sortReverse) {
                            return (a[scope.sortType] ? String(a[scope.sortType]) : String(9999))
                                .localeCompare(b[scope.sortType] ? String(b[scope.sortType]) : String(9999));
                        } else {
                            return -(a[scope.sortType] ? String(a[scope.sortType]) : String(2000))
                                .localeCompare(b[scope.sortType] ? String(b[scope.sortType]) : String(2000));
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
                scope.exportPublicationsSpreadsheet = function() {
                    var type = 'xlsx';
                    var wsName = 'Data';
                    var wb = {};
                    var selectedPublications = convertData(scope.selectedPublications);
                    var ws = XLSX.utils.json_to_sheet(selectedPublications);
                    wb.SheetNames = [wsName];
                    wb.Sheets = {};
                    wb.Sheets[wsName] = ws;
                    var wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
                    var dateTime = momentToDate(moment(),undefined,'YYYYMMDD_HHmmss')
                    var from;
                    var to;
                    if (scope.fromYearPub === undefined || isNaN(scope.fromYearPub)) {
                        from = 'all';
                    } else {
                        from = scope.fromYearPub;
                    }
                    if (scope.toYearPub === undefined || isNaN(scope.toYearPub)) {
                        to = 'all';
                    } else {
                        to = scope.toYearPub;
                    }
                    var fname = 'lab_publications_' + from + '_' + to
                                + '_' + dateTime + '.' + type;
                    try {
                    	saveAs(new Blob([s2ab(wbout)],{type:"application/octet-stream"}), fname);
                    } catch(e) { if(typeof console != 'undefined') console.log(e, wbout); }
                };

                function processSelectedPub(current, original) {
                    var add = [];
                    var del = [];
                    var addPublic = [];
                    var delPublic = [];
                    for (var curr in current) {
                        for (var ori in original) {
                            if (current[curr].labs_publications_id === original[ori].labs_publications_id) {
                                if (current[curr].selected === true && original[ori].selected === false) {
                                    add.push(current[curr]);
                                } else if (current[curr].selected === false && original[ori].selected === true) {
                                    del.push(current[curr]);
                                }
                                if (current[curr].public === true && original[ori].public === false) {
                                    addPublic.push(current[curr]);
                                } else if (current[curr].public === false && original[ori].public === true) {
                                    delPublic.push(current[curr]);
                                }
                                break;
                            }
                        }
                    }
                    var objReturn = {};
                    objReturn['addSelectedPub'] = add;
                    objReturn['delSelectedPub'] = del;
                    objReturn['addPublicPub'] = addPublic;
                    objReturn['delPublicPub'] = delPublic;
                    return objReturn;
                }
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
                            for (var ind in arrObj[el].publication_type) {
                                if (ind > 0) {
                                    arrObj[el]['doc_type'] = arrObj[el]['doc_type'] + '; ' + arrObj[el].publication_type[ind].name_en;
                                } else {
                                    arrObj[el]['doc_type'] = arrObj[el].publication_type[ind].name_en;
                                }
                            }
                            var if_last_year;
                            for (var ind in arrObj[el].impact_factors) {
                                if (ind > 0) {
                                    if (if_last_year.year < arrObj[el].impact_factors[ind].year) {
                                        if_last_year = arrObj[el].impact_factors[ind];
                                    }
                                } else {
                                    if_last_year = arrObj[el].impact_factors[ind];
                                }
                            }
                            var citations_last_year = {citations: '-'};
                            for (var ind in arrObj[el].citations) {
                                if (ind > 0) {
                                    if (citations_last_year.year < arrObj[el].citations[ind].year) {
                                        citations_last_year = arrObj[el].citations[ind];
                                    }
                                } else {
                                    citations_last_year = arrObj[el].citations[ind];
                                }
                            }
                            data.push({
                                "Authors": arrObj[el]['authors_raw'],
                                "Title": arrObj[el]['title'],
                                "Year": arrObj[el]['year'],
                                "Publication Date": arrObj[el]['publication_date'],
                                "Journal Name": arrObj[el]['journal_name'],
                                "Journal Short Name": arrObj[el]['journal_short_name'],
                                "Publisher": arrObj[el]['publisher'],
                                "Publisher City": arrObj[el]['publisher_city'],
                                "ISSN": arrObj[el]['issn'],
                                "EISSN": arrObj[el]['eissn'],
                                "Volume": arrObj[el]['volume'],
                                "Page Start": arrObj[el]['page_start'],
                                "Page End": arrObj[el]['page_end'],
                                "DOI": arrObj[el]['doi'],
                                "WOS": arrObj[el]['wos'],
                                "PubMed ID": arrObj[el]['pubmed_id'],
                                "Citations": citations_last_year.citations,
                                "Impact Factors": if_last_year.impact_factor
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
        .directive('teamMembersPublications', teamMembersPublications)
        .directive('teamLabPublications', teamLabPublications);

})();