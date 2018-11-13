(function(){

    var managerCommunications = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/communications/manager.person.communications.large.html';
        } else if (view === 'small') {
            // for now this view does not need adjustments for smaller screens
            url = 'manager/person_details/productivity/communications/manager.person.communications.large.html';
        }
        return ['personData','managerData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
            function (personData,managerData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
                return {
                    restrict: 'E',
                    //transclude: true,
                    scope: {
                        person:"@",
                        name: "@",
                    },
                    templateUrl: url,
                    link:
                    function (scope,element,attrs) {
                        var personID = scope.person;
                        var colloquial_name = scope.name;
                        scope.personPublications = [];

                        initializeInterface();
                        getCommunications();

                        $rootScope.$on('updateManagerPersonCommunicationsMessage', function (event,data) {
                            getCommunications();
                        });
                        $rootScope.$on('updateManagerPersonORCIDCommunicationsMessage', function (event,data) {
                            getCommunications();
                        });


                        scope.showDetailsCommunication = function (work) {
                            var authors = work.authors_raw.split(';');
                            authors = authors.map(function (el) { return el.trim(); });

                            var position = $mdPanel.newPanelPosition()
                                                .absolute()
                                                .center();
                            var workDetailsCtrl = function(mdPanelRef) {
                                var ctrl = this;
                                this._mdPanelRef = mdPanelRef;

                                ctrl.closePanel = function () {
                                    mdPanelRef.close();
                                };
                                ctrl.submitCommunicationCorrection = function (ind, work) {
                                        ctrl.updateStatus[ind] = "Updating...";
                                        ctrl.messageType[ind] = 'message-updating';
                                        ctrl.hideMessage[ind] = false;
                                        publications.updateCommunicationData(work.id, work)
                                            .then( function () {
                                                getCommunications();
                                                ctrl.updateStatus[ind] = "Updated!";
                                                ctrl.messageType[ind] = 'message-success';
                                                ctrl.hideMessage[ind] = false;
                                                $timeout(function () {
                                                    ctrl.hideMessage[ind] = true;
                                                    ctrl.closePanel();
                                                }, 1500);
                                            },
                                            function () {
                                                scope.updateStatus[ind] = "Error!";
                                                scope.messageType[ind] = 'message-error';
                                            },
                                            function () {}
                                            );
                                        return false;
                                    };
                                ctrl.communicationAuthorsList = function (str, num) {
                                    var authors = str.split(';');
                                    authors = authors.map(function (el) { return el.trim(); });
                                    ctrl.presenters = [];
                                    for (var ind in authors) {
                                        ctrl.presenters.push(authors[ind].trim());
                                    }
                                };
                            };
                            var config = {
                                //attachTo: angular.element(document.body),
                                controller: workDetailsCtrl,
                                controllerAs: 'ctrl',
                                templateUrl: 'manager/person_details/productivity/communications/manager.person.communicationDetail.html',
                                locals: {
                                    forms: scope.forms,
                                    updateStatus: scope.updateStatus,
                                    hideMessage: scope.hideMessage,
                                    messageType: scope.messageType,
                                    work: work,
                                    communicationTypes: scope.communicationTypes,
                                    conferenceTypes: scope.conferenceTypes,
                                    presenters: authors,
                                    isThisWorkType: function(work, type) {
                                        if (type.id == work.communication_type_id) { return true;}
                                        return false;
                                    },
                                },
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
                            scope.publicationPanel = $mdPanel.open(config);
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

                        scope.submitPersonCommunications = function (ind) {
                            scope.updateStatus[ind] = "Updating...";
                            scope.messageType[ind] = 'message-updating';
                            scope.hideMessage[ind] = false;
                            var data = processSelectedWork(scope.personCommunications,scope.originalPersonCommunications);
                            publications.updateSelectedCommunications(personID,data)
                                .then( function () {
                                    getCommunications();
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
                        scope.submitCommunicationRemoval = function (ind) {
                            if (scope.deleteCommunications.length > 0) {
                                scope.updateStatus[ind] = "Updating...";
                                scope.messageType[ind] = 'message-updating';
                                scope.hideMessage[ind] = false;
                                var data = {deleteWorks: scope.deleteCommunications};
                                publications.removeCommunicationsPerson(personID,data)
                                    .then( function () {
                                        initializeInterface();
                                        getCommunications(ind);
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
                            scope.totalCommunications = scope.personCommunications.length;
                            scope.selectedCommunications = [];
                            var toInclude = 0;
                            var toIncludeDueFrom = 0;
                            var toIncludeDueTo = 0;
                            scope.fromYearComm = parseInt(scope.fromYearComm,10);
                            scope.toYearComm = parseInt(scope.toYearComm,10);
                            for (var ind in scope.personCommunications) {
                                toInclude = 0;
                                toIncludeDueFrom = 0;
                                toIncludeDueTo = 0;
                                if (Number.isInteger(scope.fromYearComm)) {
                                    if (scope.fromYearComm <= scope.personCommunications[ind].year) {
                                       toIncludeDueFrom = 1;
                                    }
                                } else {
                                    toIncludeDueFrom = 1;
                                }
                                if (Number.isInteger(scope.toYearComm)) {
                                    if (scope.toYearComm >= scope.personCommunications[ind].year) {
                                       toIncludeDueTo = 1;
                                    }
                                } else {
                                    toIncludeDueTo = 1;
                                }
                                toInclude = toIncludeDueFrom * toIncludeDueTo;
                                if (toInclude === 1) {
                                    scope.selectedCommunications.push(scope.personCommunications[ind]);
                                }
                            }
                            scope.totalFromSearch = scope.selectedCommunications.length;

                            scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                            scope.pages = [];
                            for (var num=1; num<=scope.totalPages; num++) {
                                scope.pages.push(num);
                            }
                            // Sort selectedCommunications according to defined order, before
                            // defining page contents
                            scope.selectedCommunications = scope.selectedCommunications.sort(sorter);
                            scope.currCommunications = [];
                            for (var member = (scope.currentPage - 1) * scope.pageSize;
                                    member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                                    member++) {
                                scope.currCommunications.push(Object.assign({}, scope.selectedCommunications[member]));
                            }
                        };

                        scope.changePublicStatus = function (work) {
                            for (var ind in scope.personCommunications) {
                                if (work.id === scope.personCommunications[ind].id) {
                                    scope.personCommunications[ind].public = work.public;
                                    break;
                                }
                            }
                        };
                        scope.removeCommunication = function(work) {
                            for(var ind in scope.personCommunications){
                                if (scope.personCommunications[ind].id === work.id) {
                                    scope.personCommunications.splice(ind,1);
                                    scope.deleteCommunications.push(work);
                                    break;
                                }
                            }
                            scope.renderCommunications('');
                        };

                        function getCommunications() {
                            publications.thisPersonCommunications(personID)
                                .then(function (response) {
                                    scope.personCommunications = response.data.result;
                                    // remove below
                                    for (var el in scope.personCommunications) {
                                        scope.personCommunications[el].year = null;
                                        if (scope.personCommunications[el].date !== null) {
                                            scope.personCommunications[el].year =
                                                moment(scope.personCommunications[el].date).year();
                                        }
                                        if (scope.personCommunications[el].international === 1) {
                                            scope.personCommunications[el].international = true;
                                        } else {
                                            scope.personCommunications[el].international = false;
                                        }
                                        if (scope.personCommunications[el].public === 1) {
                                            scope.personCommunications[el].public = true;
                                        } else {
                                            scope.personCommunications[el].public = false;
                                        }
                                    }
                                    scope.originalPersonCommunications = JSON.parse(JSON.stringify(scope.personCommunications));
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

                            // computes the number of pages
                            scope.totalCommunications = scope.personCommunications.length;
                            scope.totalPages = Math.ceil(scope.totalCommunications / scope.pageSize);
                            scope.pages = [];
                            for (var num=1; num<=scope.totalPages; num++) {
                                scope.pages.push(num);
                            }
                            scope.renderCommunications();
                        }
                        function initializeInterface() {
                            scope.deleteCommunications = [];
                            scope.forms = {
                                'managerUpdateComm': 0,
                                'managerCommRemove': 1,
                                'managerCommDetails': 2,
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
                            personData.communicationTypes()
                                .then(function (response) {
                                    scope.communicationTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.conferenceTypes()
                                .then(function (response) {
                                    scope.conferenceTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        }
                        function processSelectedWork(current, original) {
                            var addPublic = [];
                            var delPublic = [];
                            for (var curr in current) {
                                for (var ori in original) {
                                    if (current[curr].id === original[ori].id) {
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
                            objReturn['addPublicWork'] = addPublic;
                            objReturn['delPublicWork'] = delPublic;
                            return objReturn;
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
                            var fname = colloquial_name + '_' + personID + '_communications_' + from + '_' + to
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
                                        "Conference type": arrObj[el]['conference_type_name'],
                                        "International": arrObj[el]['international'],
                                        "Communication type": arrObj[el]['communication_type_name'],
                                        "Authors": arrObj[el]['authors_raw'],
                                        "Presenter": arrObj[el]['presenter'],
                                        "Title": arrObj[el]['title'],
                                        "Conf. Title": arrObj[el]['conference_title'],
                                        "Year": momentToDate(arrObj[el]['date'],undefined,'YYYY'),
                                        "Comm. Date": momentToDate(arrObj[el]['date']),
                                        "City": arrObj[el]['city'],
                                        "Country": arrObj[el]['country_name'],
                                        "DOI": arrObj[el]['doi']
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
    };

    var managerAddCommunications = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/communications/manager.person.addCommunications.large.html';
        } else if (view === 'small') {
            url = 'manager/person_details/productivity/communications/manager.person.addCommunications.small.html';
        }
        return ['personData','managerData','publications','authentication','$timeout', '$mdMedia','$mdPanel','$rootScope',
            function (personData,managerData,publications,authentication, $timeout, $mdMedia, $mdPanel,$rootScope) {
                return {
                    restrict: 'E',
                    //transclude: true,
                    scope: {
                        person:"@"
                    },
                    templateUrl: url,
                    link:
                    function (scope,element,attrs) {
                        var personID = scope.person;

                        initializeInterface();

                        scope.submitAddCommunications = function(ind) {
                            scope.updateStatus[ind] = "Updating...";
                            scope.messageType[ind] = 'message-updating';
                            scope.hideMessage[ind] = false;
                            if (!scope.communicationDetails.international) {
                                scope.communicationDetails.country_id={};
                                scope.communicationDetails.country_id.country_id = 184;
                                scope.communicationDetails.international = false;
                            }
                            var data = {add: [scope.communicationDetails]};
                            publications.addCommunicationsPerson(personID,data)
                                .then( function () {
                                    scope.communicationsDetails = {};
                                    scope.updateStatus[ind] = "Updated!";
                                    scope.messageType[ind] = 'message-success';
                                    scope.hideMessage[ind] = false;
                                    $timeout(function () {
                                        scope.hideMessage[ind] = true;
                                        scope.communicationDetails = {};
                                    }, 1500);
                                    $rootScope.$broadcast('updateManagerPersonCommunicationsMessage', data);
                                },
                                function () {
                                    scope.updateStatus[ind] = "Error!";
                                    scope.messageType[ind] = 'message-error';
                                },
                                function () {}
                                );
                            return false;
                        };

                        scope.communicationAuthorsList = function (str) {
                            var authors = str.split(';');
                            authors = authors.map(function (el) { return el.trim(); });
                            scope.presenters = [];
                            for (var ind in authors) {
                                scope.presenters.push(authors[ind].trim());
                            }
                        };

                        function initializeInterface() {
                            scope.deleteCommunications = [];
                            scope.forms = {
                                'managerCommAdd': 0,
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
                            personData.communicationTypes()
                                .then(function (response) {
                                    scope.communicationTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.conferenceTypes()
                                .then(function (response) {
                                    scope.conferenceTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        }
                    }
                };
            }];
    };

    var managerAddCommunicationsORCID = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/communications/manager.person.addCommunicationsORCID.large.html';
        } else if (view === 'small') {
            url = 'manager/person_details/productivity/communications/manager.person.addCommunicationsORCID.large.html';
        }
        return ['personData','managerData','publications','authentication','$q','$timeout', '$mdMedia','$mdPanel','$rootScope',
            function (personData,managerData,publications,authentication, $q, $timeout, $mdMedia, $mdPanel,$rootScope) {
                return {
                    restrict: 'E',
                    //transclude: true,
                    scope: {
                        person:"@",
                        orcidres:"@",
                        orcidtech:"@",
                        orcidscman:"@",
                    },
                    templateUrl: url,
                    link:
                    function (scope,element,attrs) {
                        var personID = scope.person;
                        var researcher_orcid = scope.orcidres;
                        var technician_orcid = scope.orcidtech;
                        var sc_man_orcid = scope.orcidscman;

                        initializeInterface();
                        initializeVariables();
                        getCommunications();

                        scope.connectCommORCID = function() {
                            scope.progressORCID = true;
                            var orcid;
                            if (researcher_orcid !== null) {
                                orcid = researcher_orcid;
                            } else if (technician_orcid !== null) {
                                orcid = technician_orcid;
                            } else if (sc_man_orcid !== null) {
                                orcid = sc_man_orcid;
                            } else {
                                orcid = null;
                            }
                            // this will get all your works on ORCID
                            publications.getORCIDPublicationsPerson(orcid)
                            .then(function (response) {
                                var data = response.data.group;
                                scope.allORCIDWorksPrior = readORCIDData(data);
                                // filtering for all non-article works (talks, posters,...)
                                var commORCID = scope.allORCIDWorksPrior.filter(function (el){
                                        if (el.type === null) return true; //because we don't know if it is a communication or not
                                        if (el.type === 'LECTURE_SPEECH') return true;
                                        if (el.type === 'CONFERENCE_POSTER') return true;
                                        // as per ORCID, a CONFERENCE_PAPER is not published in scholarly journals
                                        if (el.type === 'CONFERENCE_PAPER') return true;
                                        return false;
                                    });
                                scope.allORCIDCommunications = removeExistingComm(commORCID,scope.personCommunications);
                                var requests = [];
                                for (var el in scope.allORCIDCommunications) {
                                    if (scope.allORCIDCommunications[el].path !== undefined) {
                                        requests.push(publications.getORCIDDetailsPublication(scope.allORCIDCommunications[el].path));
                                    }
                                }
                                $q.all(requests)
                                    .then(function (results) {
                                        var ind = 0;
                                        for (var el in scope.allORCIDCommunications) {
                                            if (scope.allORCIDCommunications[el].path !== undefined) {
                                                processCommDetailsORCID(scope.allORCIDCommunications[el],results[ind].data);
                                                ind++;
                                            } else {
                                                processCommDetailsORCID(scope.allORCIDCommunications[el],{});
                                            }
                                        }
                                        scope.progressORCID = false;
                                    });
                            })
                            .catch(function (err) {
                                console.log(err);
                            });
                        };
                        function readORCIDData(data) {
                            var publications = [];
                            for (var ind in data) {
                                var info = data[ind]['work-summary'][0];
                                var pub = {};
                                var title = null;
                                if (info.hasOwnProperty('title')) {
                                    if (info['title'] !== null && info.title.hasOwnProperty('title')) {
                                        if (info.title.title.hasOwnProperty('value')) {
                                            title = info.title.title.value;
                                        }
                                    }
                                }
                                pub.title = title.trim();
                                var doi = null;
                                if (info.hasOwnProperty('external-ids')) {
                                    if (info['external-ids'] !== null) {
                                        if (info['external-ids'].hasOwnProperty('external-id')) {
                                            for (var indExt in info['external-ids']['external-id']) {
                                                if (info['external-ids']['external-id'][indExt]['external-id-type'] === 'doi') {
                                                    doi = info['external-ids']['external-id'][indExt]['external-id-value'];
                                                }
                                            }
                                        }
                                    }
                                }
                                pub.doi = doi;
                                var year = null;
                                var month = null;
                                var day = null;
                                if (info.hasOwnProperty('publication-date')) {
                                    if (info['publication-date'] !== null) {
                                        if (info['publication-date'].hasOwnProperty('year')) {
                                            if (info['publication-date']['year'] !== null) {
                                                if (info['publication-date']['year'].hasOwnProperty('value')) {
                                                    year = info['publication-date']['year']['value'];
                                                }
                                            }
                                        }
                                        if (info['publication-date'].hasOwnProperty('month')) {
                                            if (info['publication-date']['month'] !== null) {
                                                if (info['publication-date']['month'].hasOwnProperty('value')) {
                                                    month = info['publication-date']['month']['value'];
                                                }
                                            }
                                        }
                                        if (info['publication-date'].hasOwnProperty('day')) {
                                            if (info['publication-date']['day'] !== null) {
                                                if (info['publication-date']['day'].hasOwnProperty('value')) {
                                                    day = info['publication-date']['day']['value'];
                                                }
                                            }
                                        }
                                    }
                                }
                                pub.year = year;
                                pub.month = month;
                                pub.day = day;
                                var path = null; // variable that holds the link to the publication details
                                if (info.hasOwnProperty('path')) {
                                    path = info.path;
                                }
                                pub.path = path;
                                var type = null;
                                if (info.hasOwnProperty('type')) {
                                    type = info.type;
                                }
                                pub.type = type;
                                pub.detailProgress = false;
                                publications.push(pub);
                            }
                            return publications;
                        }
                        function processCommDetailsORCID(pub, data) {
                            if (pub.year !== null && pub.month !== null && pub.day !== null) {
                                pub.date = pub.year + '-' + pub.month + '-' + pub.day;
                            }
                            if (data.hasOwnProperty('citation')) {
                                //from this we can get authors, volume, pages
                                if (data.citation !== null && data.citation.hasOwnProperty('citation-value')) {
                                    if (data.citation['citation-value'] !== null) {
                                        var citation = data.citation['citation-value'];
                                        pub.authors_raw = citation;
                                        pub.conference = citation;
                                        pub.presenters = [citation];
                                    }
                                }
                            }
                            for (var ind in scope.communicationTypes) {
                                var typeName = scope.communicationTypes[ind].name.toUpperCase().replace(' ','_');
                                if (typeName == pub.type) {
                                    pub.communication_type_id = scope.communicationTypes[ind].id;
                                }
                            }
                            scope.communicationDetailsORCID.push(pub);
                        }
                        function removeExistingComm(dataORCID, dataDB) {
                            var communications  = [];
                            var titleORCID, titleDB, commTypeDB;
                            for (var ind in dataORCID) {
                                var found = false;
                                for (var indDB in dataDB) {
                                    // first DOI is compared, if there is no DOI then compares titles and types
                                    if (dataORCID[ind].doi !== null) {
                                        if (dataDB[indDB].doi !== null) {
                                            dataORCID[ind].doi = dataORCID[ind].doi.toLowerCase()
                                                                    .replace('https://doi.org/','')
                                                                    .replace('http://dx.doi.org/','')
                                                                    .replace('doi: ','')
                                                                    .replace('doi:','')
                                                                    .replace('doi ','');
                                            dataDB[indDB].doi = dataDB[indDB].doi.toLowerCase()
                                                                    .replace('https://doi.org/','')
                                                                    .replace('http://dx.doi.org/','')
                                                                    .replace('doi: ','')
                                                                    .replace('doi:','')
                                                                    .replace('doi ','');
                                            if (dataORCID[ind].doi == dataDB[indDB].doi) {
                                                // already in database => skip
                                                found = true;
                                                break;
                                            }
                                        } else {
                                            titleORCID = dataORCID[ind].title
                                                    .toLowerCase()
                                                    .replace(/[\s\-;,:\+]/g,'');
                                            titleDB = dataDB[indDB].title
                                                    .toLowerCase()
                                                    .replace(/[\s\-;,:\+]/g,'');
                                            // compare titles
                                            if (titleORCID == titleDB) {
                                                // already in database => skip
                                                found = true;
                                                break;
                                            }
                                        }
                                    } else {
                                        // compare titles and types
                                        titleORCID = dataORCID[ind].title
                                                .toLowerCase()
                                                .replace(/[\s\-;,:\+]/g,'');
                                        titleDB = dataDB[indDB].title
                                                .toLowerCase()
                                                .replace(/[\s\-;,:\+]/g,'');
                                        commTypeDB = dataDB[indDB].communication_type_name
                                                    .toUpperCase()
                                                    .replace(' ','_');
                                        // compare titles
                                        if (titleORCID == titleDB  && dataORCID[ind].type == commTypeDB) {
                                            // already in database => skip
                                            found = true;
                                            break;
                                        }
                                    }
                                }
                                if (!found) {
                                    communications.push(dataORCID[ind]);
                                }
                            }
                            return communications;
                        }

                        scope.submitAddORCIDCommunications = function (ind) {
                            if (scope.communicationDetailsORCID.length > 0) {
                                var addCommunicationsORCID = [];
                                var incomplete = false;
                                for (var indPub in scope.communicationDetailsORCID) {
                                    if (!scope.communicationDetailsORCID[indPub].international) {
                                        scope.communicationDetailsORCID[indPub].country_id={};
                                        scope.communicationDetailsORCID[indPub].country_id.country_id = 184;
                                        scope.communicationDetailsORCID[indPub].international = false;
                                    }
                                    if ((scope.communicationDetailsORCID[indPub].authors_raw === null
                                        || scope.communicationDetailsORCID[indPub].authors_raw === undefined
                                        || scope.communicationDetailsORCID[indPub].authors_raw === '')
                                        && scope.communicationDetailsORCID[indPub].chosen) {
                                        incomplete = true;
                                        break;
                                    } else if (scope.communicationDetailsORCID[indPub].chosen) {
                                        addCommunicationsORCID.push(scope.communicationDetailsORCID[indPub]);
                                    }
                                }
                                if (incomplete) {
                                    alert('You must define authors for all chosen communications before submitting.');
                                } else {
                                    if (addCommunicationsORCID.length > 0) {
                                        scope.updateStatus[ind] = "Updating...";
                                        scope.messageType[ind] = 'message-updating';
                                        scope.hideMessage[ind] = false;
                                        var data = {add: addCommunicationsORCID};
                                        publications.addORCIDCommunicationsPerson(personID,data)
                                            .then( function () {
                                                scope.updateStatus[ind] = "Updated!";
                                                scope.messageType[ind] = 'message-success';
                                                scope.hideMessage[ind] = false;
                                                $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                                scope.gettingAllCommunications = true;
                                                $rootScope.$broadcast('updateManagerPersonORCIDCommunicationsMessage', data);
                                                initializeInterface();
                                                initializeVariables();
                                                getCommunications();
                                            },
                                            function () {
                                                scope.updateStatus[ind] = "Error!";
                                                scope.messageType[ind] = 'message-error';
                                            },
                                            function () {}
                                            );
                                    }
                                }
                            } else {
                                alert('There are no publications in the list of publications to be added to database.');
                            }
                            return false;
                        };

                        scope.removeRow = function (current, ind) {
                            current.splice(ind,1);
                        };
                        scope.changeAllCommunications = function(selectAll, pubs) {
                            if (pubs.length > 0) {
                                if (selectAll) {
                                    for (var el in pubs) {
                                        pubs[el].chosen = true;
                                    }
                                } else {
                                    for (var el in pubs) {
                                        pubs[el].chosen = false;
                                    }
                                }
                            }
                        };
                        scope.communicationAuthorsList = function (work, str, num) {
                            if (str !== undefined && str !== null && str !== '') {
                                var authors = str.split(';');
                                work.presenters = [];
                                for (var ind in authors) {
                                    work.presenters.push(authors[ind].trim());
                                }
                            }
                        };

                        function initializeVariables() {
                            scope.sortReverse = true;
                            scope.sortType = 'year';

                            scope.communicationDetailsORCID = [];
                            personData.communicationTypes()
                                .then(function (response) {
                                    scope.communicationTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.conferenceTypes()
                                .then(function (response) {
                                    scope.conferenceTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        }
                        function initializeInterface() {
                            scope.forms = {
                                'managerCommunicationORCIDAdd': 0,
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
                            scope.sortType = 'year';
                            scope.progressORCID = false;
                            scope.addCommunications = [];
                            scope.gettingAllCommunications = true;
                        }
                        function getCommunications() {
                            publications.thisPersonCommunications(personID)
                                .then(function (response) {
                                    scope.personCommunications = response.data.result;
                                    // remove below
                                    for (var el in scope.personCommunications) {
                                        scope.personCommunications[el].year = null;
                                        if (scope.personCommunications[el].date !== null) {
                                            scope.personCommunications[el].year =
                                                moment(scope.personCommunications[el].date).year();
                                        }
                                        if (scope.personCommunications[el].international === 1) {
                                            scope.personCommunications[el].international = true;
                                        } else {
                                            scope.personCommunications[el].international = false;
                                        }
                                        if (scope.personCommunications[el].public === 1) {
                                            scope.personCommunications[el].public = true;
                                        } else {
                                            scope.personCommunications[el].public = false;
                                        }
                                    }
                                    scope.originalPersonCommunications = JSON.parse(JSON.stringify(scope.personCommunications));
                                    initializeVariables();
                                    scope.gettingAllCommunications = false;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        }

                        function sorter(a,b) {
                            if (scope.sortType === 'year') {
                                if (scope.sortReverse) {
                                    return -(a[scope.sortType] - b[scope.sortType]);
                                } else {
                                    return (a[scope.sortType] - b[scope.sortType]);
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
                    }
                };
            }];
    };

    var managerPersonCommunicationsLarge = managerCommunications('large');
    var managerPersonCommunicationsSmall = managerCommunications('small');

    var managerAddPersonCommunicationsLarge = managerAddCommunications('large');
    var managerAddPersonCommunicationsSmall = managerAddCommunications('small');

    var managerAddPersonCommunicationsOrcidLarge = managerAddCommunicationsORCID('large');
    var managerAddPersonCommunicationsOrcidSmall = managerAddCommunicationsORCID('small');

    angular.module('managementApp')
        .directive('managerPersonCommunicationsLarge', managerPersonCommunicationsLarge)
        .directive('managerPersonCommunicationsSmall', managerPersonCommunicationsSmall)
        .directive('managerAddPersonCommunicationsLarge', managerAddPersonCommunicationsLarge)
        .directive('managerAddPersonCommunicationsSmall', managerAddPersonCommunicationsSmall)
        .directive('managerAddPersonCommunicationsOrcidLarge', managerAddPersonCommunicationsOrcidLarge)
        .directive('managerAddPersonCommunicationsOrcidSmall', managerAddPersonCommunicationsOrcidSmall)
        ;
})();