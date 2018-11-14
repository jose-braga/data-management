(function(){

    var managerPublications = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/publications/manager.person.publications.large.html';
        } else if (view === 'small') {
            url = 'manager/person_details/productivity/publications/manager.person.publications.small.html';
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
                        getPublications();

                        $rootScope.$on('updateManagerPersonPublicationsMessage', function (event,data) {
                            getPublications();
                        });
                        $rootScope.$on('updateManagerPersonORCIDPublicationsMessage', function (event,data) {
                            getPublications();
                        });


                        scope.showDetailsPublication = function (pub) {
                            var authors = pub.authors_raw.split('; ');
                            for (var ind in pub.unit_authors) {
                                // - 1 to convert from position to array index
                                if (pub.unit_authors[ind].position !== null && pub.unit_authors[ind].position !== undefined) {
                                    authors[pub.unit_authors[ind].position - 1] = authors[pub.unit_authors[ind].position - 1] + '^';
                                    if (pub.unit_authors[ind].author_type_id === 1) {
                                        authors[pub.unit_authors[ind].position - 1] = authors[pub.unit_authors[ind].position - 1] + '(corresp.)';
                                    }
                                }
                            }
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
                                var ctrl = this;
                                this._mdPanelRef = mdPanelRef;

                                ctrl.closePanel = function () {
                                    mdPanelRef.close();
                                };
                                ctrl.submitPublicationCorrection = function (ind, pub) {
                                        ctrl.updateStatus[ind] = "Updating...";
                                        ctrl.messageType[ind] = 'message-updating';
                                        ctrl.hideMessage[ind] = false;
                                        publications.updatePublicationData(pub.id, pub)
                                            .then( function () {
                                                getPublications();
                                                ctrl.updateStatus[ind] = "Updated!";
                                                ctrl.messageType[ind] = 'message-success';
                                                ctrl.hideMessage[ind] = false;
                                                $timeout(function () { ctrl.hideMessage[ind] = true; }, 1500);
                                                //ctrl.closePanel();
                                            },
                                            function () {
                                                scope.updateStatus[ind] = "Error!";
                                                scope.messageType[ind] = 'message-error';
                                            },
                                            function () {}
                                            );
                                        return false;
                                    };
                            };
                            var config = {
                                //attachTo: angular.element(document.body),
                                controller: pubDetailsCtrl,
                                controllerAs: 'ctrl',
                                templateUrl: 'manager/person_details/productivity/publications/manager.person.publicationDetail.html',
                                locals: {
                                    forms: scope.forms,
                                    updateStatus: scope.updateStatus,
                                    hideMessage: scope.hideMessage,
                                    messageType: scope.messageType,
                                    pub: pub,
                                    publicationTypes: scope.publicationTypes,
                                    isThisPubType: function(pub, type) {
                                        for (var indType in pub.publication_type) {
                                            if (type.id == pub.publication_type[indType].id) { return true;}
                                        }
                                        return false;
                                    },
                                    addRemoveType: function(pub, type) {
                                        var exists = false;
                                        for (var indType in pub.publication_type) {
                                            if (type.id == pub.publication_type[indType].id) {
                                                exists = true;
                                                pub.publication_type.splice(indType,1);
                                            }
                                        }
                                        if (!exists) {
                                            pub.publication_type.push(type);
                                        }


                                    },
                                    isThisCorresponding: function(author) {
                                        if (author.author_type_id == 1) { return true;}
                                        return false;
                                    },
                                    addRemoveCorresponding: function(pub, author) {
                                        if (author.author_type_id == 1) {
                                            author.author_type_id = 2;
                                            pub.corresponding_authors = pub.corresponding_authors.filter(
                                                function(value, index, arr) {
                                                    return value != author.person_id;
                                                });
                                        } else {
                                            author.author_type_id = 1;
                                            pub.corresponding_authors.push(author.person_id)
                                        }
                                    }
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

                        scope.submitSelectedPersonPublications = function (ind) {
                            scope.updateStatus[ind] = "Updating...";
                            scope.messageType[ind] = 'message-updating';
                            scope.hideMessage[ind] = false;
                            var data = processSelectedPub(scope.personPublications,scope.originalPersonPublications);
                            publications.updateSelectedPublications(personID,data)
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
                        scope.submitPublicationRemoval = function (ind) {
                            if (scope.deletePublications.length > 0) {
                                scope.updateStatus[ind] = "Updating...";
                                scope.messageType[ind] = 'message-updating';
                                scope.hideMessage[ind] = false;
                                var data = {deletePublications: scope.deletePublications};
                                publications.removePublicationsPerson(personID,data)
                                    .then( function () {
                                        initializeInterface();
                                        getPublications(ind);
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

                        scope.renderPublications = function (str, ind) {
                            if (str === 'new') {
                                scope.currentPage = 1;
                            }
                            scope.totalPublications = scope.personPublications.length;
                            scope.selectedPublications = [];
                            var toInclude = 0;
                            var toIncludeDueFrom = 0;
                            var toIncludeDueTo = 0;
                            scope.fromYearPub = parseInt(scope.fromYearPub,10);
                            scope.toYearPub = parseInt(scope.toYearPub,10);
                            for (var ind in scope.personPublications) {
                                toInclude = 0;
                                toIncludeDueFrom = 0;
                                toIncludeDueTo = 0;
                                if (Number.isInteger(scope.fromYearPub)) {
                                    if (scope.fromYearPub <= scope.personPublications[ind].year) {
                                       toIncludeDueFrom = 1;
                                    }
                                } else {
                                    toIncludeDueFrom = 1;
                                }
                                if (Number.isInteger(scope.toYearPub)) {
                                    if (scope.toYearPub >= scope.personPublications[ind].year) {
                                       toIncludeDueTo = 1;
                                    }
                                } else {
                                    toIncludeDueTo = 1;
                                }
                                toInclude = toIncludeDueFrom * toIncludeDueTo;
                                if (toInclude === 1) {
                                    scope.selectedPublications.push(scope.personPublications[ind]);
                                }
                            }
                            scope.totalFromSearch = scope.selectedPublications.length;

                            scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                            scope.pages = [];
                            for (var num=1; num<=scope.totalPages; num++) {
                                scope.pages.push(num);
                            }
                            // Sort selectedPublications according to defined order, before
                            // defining page contents
                            scope.selectedPublications = scope.selectedPublications.sort(sorter);
                            scope.currPublications = [];
                            for (var member = (scope.currentPage - 1) * scope.pageSize;
                                    member < scope.currentPage * scope.pageSize && member < scope.totalFromSearch;
                                    member++) {
                                scope.currPublications.push(Object.assign({}, scope.selectedPublications[member]));
                            }
                        };
                        scope.changeSelectedStatus = function (pub) {
                            for (var ind in scope.personPublications) {
                                if (pub.people_publications_id === scope.personPublications[ind].people_publications_id) {
                                    scope.personPublications[ind].selected = pub.selected;
                                    break;
                                }
                            }
                        };
                        scope.changePublicStatus = function (pub) {
                            for (var ind in scope.personPublications) {
                                if (pub.people_publications_id === scope.personPublications[ind].people_publications_id) {
                                    scope.personPublications[ind].public = pub.public;
                                    break;
                                }
                            }
                        };
                        scope.removePublication = function(pub) {
                            for(var ind in scope.personPublications){
                                if (scope.personPublications[ind].people_publications_id === pub.people_publications_id) {
                                    scope.personPublications.splice(ind,1);
                                    scope.deletePublications.push(pub);
                                    break;
                                }
                            }
                            scope.renderPublications('');
                        };

                        scope.removeRow = function (current, ind) {
                            current.splice(ind,1);
                        };

                        function getPublications() {
                            publications.thisPersonPublications(personID)
                                .then(function (response) {
                                    scope.personPublications = response.data.result;
                                    for (var el in scope.personPublications) {
                                        if (scope.personPublications[el].selected === 1) {
                                            scope.personPublications[el].selected = true;
                                        } else {
                                            scope.personPublications[el].selected = false;
                                        }
                                        if (scope.personPublications[el].public === 1) {
                                            scope.personPublications[el].public = true;
                                        } else {
                                            scope.personPublications[el].public = false;
                                        }
                                        for (var indPub in scope.personPublications[el].publication_type) {
                                            scope.personPublications[el].publication_type[indPub].id =
                                                    scope.personPublications[el].publication_type[indPub].publication_type;
                                        }
                                        scope.personPublications[el].corresponding_authors = [];
                                        for (var indPub in scope.personPublications[el].unit_authors) {
                                            if (scope.personPublications[el].unit_authors[indPub].author_type_id == 1) {
                                                scope.personPublications[el].corresponding_authors.push(scope.personPublications[el].unit_authors[indPub].person_id);
                                            }
                                        }
                                    }
                                    scope.originalPersonPublications = JSON.parse(JSON.stringify(scope.personPublications));
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

                            //scope.personPublications = [];

                            // computes the number of pages
                            scope.totalPublications = scope.personPublications.length;
                            scope.totalPages = Math.ceil(scope.totalPublications / scope.pageSize);
                            scope.pages = [];
                            for (var num=1; num<=scope.totalPages; num++) {
                                scope.pages.push(num);
                            }
                            scope.renderPublications();
                        }
                        function initializeInterface() {
                            scope.deletePublications = [];
                            scope.forms = {
                                'managerSelectedPub': 0,
                                'managerPubRemove': 1,
                                'managerPubCorrect': 2,
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
                            personData.publicationTypes()
                                .then(function (response) {
                                    scope.publicationTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.authorTypes()
                                .then(function (response) {
                                    scope.authorTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });

                        }
                        function processSelectedPub(current, original) {
                            var add = [];
                            var del = [];
                            var addPublic = [];
                            var delPublic = [];
                            for (var curr in current) {
                                for (var ori in original) {
                                    if (current[curr].people_publications_id === original[ori].people_publications_id) {
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
                            var fname = colloquial_name + '_' + personID + '_publications_' + from + '_' + to
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
                                    var type_already_used = [];
                                    for (var ind in arrObj[el].publication_type) {
                                        if (ind > 0 && type_already_used.indexOf(arrObj[el].publication_type[ind].name_en) === -1) {
                                            type_already_used.push(arrObj[el].publication_type[ind].name_en);
                                            arrObj[el]['doc_type'] = arrObj[el]['doc_type'] + '; ' + arrObj[el].publication_type[ind].name_en;
                                        } else if (arrObj[el].publication_type[ind].name_en !== null) {
                                            type_already_used.push(arrObj[el].publication_type[ind].name_en);
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
                                        "Doc. Type": arrObj[el]['doc_type'] ? arrObj[el]['doc_type'] : null,
                                        "Citations": citations_last_year ? citations_last_year.citations : null,
                                        "Impact Factor": if_last_year ? if_last_year.impact_factor : null,
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

    var managerAddPublications = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/publications/manager.person.addPublications.large.html';
        } else if (view === 'small') {
            url = 'manager/person_details/productivity/publications/manager.person.addPublications.small.html';
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
                        scope.personPublications = [];

                        getPublications();

                        scope.sortColumn = function(colName) {
                            if (colName === scope.sortType) {
                                scope.sortReverse = !scope.sortReverse;
                            } else {
                                scope.sortType = colName;
                                scope.sortReverse = false;
                            }
                            scope.renderPublications('new');
                        };

                        scope.getSearchResults = function(originalTitle, originalAuthors) {
                            if (originalTitle === undefined) originalTitle = '';
                            if (originalAuthors === undefined) originalAuthors = '';
                            var title = '', authors = '';
                            var titleMatch = [], authorsMatch = [];
                            if (originalTitle.length >= 5 || originalAuthors.length >= 5) {
                                titleMatch = originalTitle.match(/".+?"/g);
                                authorsMatch = originalAuthors.match(/".+?"/g);
                                title = originalTitle;
                                authors = originalAuthors;
                                if (titleMatch !== null) {
                                    for (var el in titleMatch) {
                                        title = title.replace(titleMatch[el],'').trim();
                                    }
                                } else {
                                    titleMatch = [];
                                }
                                if (authorsMatch !== null) {
                                    for (var el in authorsMatch) {
                                        authors = authors.replace(authorsMatch[el],'').trim();
                                    }
                                } else {
                                    authorsMatch = [];
                                }
                            }
                            scope.filteredExactAllPublications = [];
                            var countTitle;
                            var countAuthors;
                            var pubTitle;
                            var pubAuthors;
                            var selectByTitle;
                            var selectByAuthors;
                            if (titleMatch.length >0 || authorsMatch.length >0) {
                                for (var ind in scope.allPublications) {
                                    countTitle = 0;
                                    countAuthors = 0;
                                    pubTitle = scope.allPublications[ind].title;
                                    pubAuthors = scope.allPublications[ind].authors_raw;
                                    selectByTitle = false;
                                    selectByAuthors = false;
                                    for (var indTitle in titleMatch) {
                                        var exactTitle = titleMatch[indTitle].replace(/"/g,'');
                                        if (pubTitle.indexOf(exactTitle) !== -1) countTitle++;
                                    }
                                    if (countTitle === titleMatch.length) selectByTitle = true;
                                    for (var indAuthors in authorsMatch) {
                                        var exactAuthors = authorsMatch[indAuthors].replace(/"/g,'');
                                        if (pubAuthors.indexOf(exactAuthors) !== -1) countAuthors++;
                                    }
                                    if (countAuthors === authorsMatch.length) selectByAuthors = true;
                                    if (selectByTitle && selectByAuthors) {
                                        scope.filteredExactAllPublications.push(scope.allPublications[ind]);
                                    }
                                }
                            }
                            scope.filteredAllPublications = [];
                            if (originalTitle.length >= 3 || originalAuthors.length >= 3) {
                                if (titleMatch.length === 0) {
                                    title = originalTitle;
                                }
                                if (authorsMatch.length === 0) {
                                    authors = originalAuthors;
                                }
                                if (title.length > 0 || authors.length > 0) {
                                    title = prepareStringSearch(title);
                                    authors = prepareStringSearch(authors);
                                    var titleSplit = title.split(' ');
                                    var authorsSplit = authors.split(' ');
                                    var publicationList;
                                    if (scope.filteredExactAllPublications.length === 0) {
                                        publicationList = scope.allPublications;
                                    } else {
                                        publicationList = scope.filteredExactAllPublications;
                                    }
                                    for (var ind in publicationList) {
                                        if (publicationList[ind].title !== null && publicationList[ind].title !== undefined) {
                                            pubTitle = prepareStringSearch(publicationList[ind].title);
                                        } else {
                                            pubTitle = '';
                                        }
                                        if (publicationList[ind].authors_raw !== null && publicationList[ind].authors_raw !== undefined) {
                                            pubAuthors = prepareStringSearch(publicationList[ind].authors_raw);
                                        } else {
                                            pubAuthors = '';
                                        }
                                        selectByTitle = false;
                                        selectByAuthors = false;
                                        countTitle = 0;
                                        countAuthors = 0;
                                        for (var indTitle in titleSplit) {
                                            if (pubTitle.indexOf(titleSplit[indTitle]) !== -1) countTitle++;
                                        }
                                        if (countTitle === titleSplit.length) selectByTitle = true;
                                        for (var indAut in authorsSplit) {
                                            if (pubAuthors.indexOf(authorsSplit[indAut]) !== -1) countAuthors++;
                                        }
                                        if (countAuthors === authorsSplit.length) selectByAuthors = true;
                                        if (selectByTitle && selectByAuthors) {
                                            scope.filteredAllPublications.push(publicationList[ind]);
                                        }
                                    }
                                } else {
                                    scope.filteredAllPublications = scope.filteredExactAllPublications;
                                }
                            }
                            scope.filteredAllPublications.sort(sorter);
                        };
                        scope.submitAddPublications = function (ind) {
                            var addPublications = [];
                            for (var el in scope.filteredAllPublications) {
                                if (scope.filteredAllPublications[el].chosen) {
                                    addPublications.push(scope.filteredAllPublications[el]);
                                }
                            }
                            if (addPublications.length > 0) {
                                scope.updateStatus[ind] = "Updating...";
                                scope.messageType[ind] = 'message-updating';
                                scope.hideMessage[ind] = false;
                                var data = {addPublications: addPublications};
                                publications.addPublicationsPerson(personID, data)
                                    .then( function () {
                                        scope.updateStatus[ind] = "Updated!";
                                        scope.messageType[ind] = 'message-success';
                                        scope.hideMessage[ind] = false;
                                        $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                        getPublications();
                                        $rootScope.$broadcast('updateManagerPersonPublicationsMessage', data);
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

                        scope.removeRow = function (current, ind) {
                            current.splice(ind,1);
                        };
                        scope.changeAllPublications = function(selectAll, pubs) {
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

                        function getPublications() {
                            initializeVariables();
                            initializeInterface();
                            publications.thisPersonPublications(personID)
                                .then(function (response) {
                                    scope.personPublications = response.data.result;
                                    for (var el in scope.personPublications) {
                                        if (scope.personPublications[el].selected === 1) {
                                            scope.personPublications[el].selected = true;
                                        } else {
                                            scope.personPublications[el].selected = false;
                                        }
                                        if (scope.personPublications[el].public === 1) {
                                            scope.personPublications[el].public = true;
                                        } else {
                                            scope.personPublications[el].public = false;
                                        }
                                        for (var indPub in scope.personPublications[el].publication_type) {
                                            scope.personPublications[el].publication_type[indPub].id =
                                                    scope.personPublications[el].publication_type[indPub].publication_type;
                                        }
                                        scope.personPublications[el].corresponding_authors = [];
                                        for (var indPub in scope.personPublications[el].unit_authors) {
                                            if (scope.personPublications[el].unit_authors[indPub].author_type_id == 1) {
                                                scope.personPublications[el].corresponding_authors.push(scope.personPublications[el].unit_authors[indPub].person_id);
                                            }
                                        }
                                    }
                                    scope.originalPersonPublications = JSON.parse(JSON.stringify(scope.personPublications));
                                    getAllPublications();
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        }
                        function getAllPublications() {
                            // gets all publications from DB and excludes the ones that are already attributed to you
                            publications.allPublications()
                                .then(function (response) {
                                    var allPublicationsPrior = response.data.result;
                                    scope.allPublications = [];
                                    for (var ind in allPublicationsPrior) {
                                        var found = false;
                                        for (var indMine in scope.personPublications) {
                                            if (allPublicationsPrior[ind].id === scope.personPublications[indMine].id) {
                                                found = true;
                                                break;
                                            }
                                        }
                                        if (!found) scope.allPublications.push(allPublicationsPrior[ind]);
                                    }
                                    scope.gettingAllPublications = false;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        }

                        function initializeVariables() {
                            scope.sortReverse = true;
                            scope.sortType = 'year';
                            scope.filteredAllPublications = [];
                            scope.filteredExactAllPublications = [];
                            scope.personPublications = [];
                        }
                        function initializeInterface() {
                            scope.forms = {
                                'managerPubAdd': 0,
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
                            scope.addPublications = [];
                            scope.gettingAllPublications = true;

                            scope.allPublicationsSearchTitle = '';
                            scope.allPublicationsSearchAuthors = '';

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
                        function prepareStringSearch(str) {
                            return str.toLowerCase()
                                      .replace(/[áàãâä]/g,'a')
                                      .replace(/[éèêë]/g,'e')
                                      .replace(/[íìîï]/g,'i')
                                      .replace(/[óòõôö]/g,'o')
                                      .replace(/[úùûü]/g,'u')
                                      .replace(/[ç]/g,'c')
                                      .replace(/[ñ]/g,'n')
                                      .replace(/(\.\s)/g,'')
                                      .replace(/(\.)/g,'');
                        }
                    }
                };
            }];
    };

    var managerAddPublicationsORCID = function (view) {
        var url;
        if (view === 'large') {
            url = 'manager/person_details/productivity/publications/manager.person.addPublicationsORCID.large.html';
        } else if (view === 'small') {
            url = 'manager/person_details/productivity/publications/manager.person.addPublicationsORCID.small.html';
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
                        var personID = parseInt(scope.person, 10);
                        var researcher_orcid = scope.orcidres;
                        var technician_orcid = scope.orcidtech;
                        var sc_man_orcid = scope.orcidscman;

                        initializeInterface();
                        initializeVariables();
                        getAllPublications();

                        scope.connectORCID = function() {
                            scope.progressORCID = true;
                            var orcid;
                            if (researcher_orcid !== null || researcher_orcid !== '') {
                                orcid = researcher_orcid;
                            } else if (technician_orcid !== null || technician_orcid !== '') {
                                orcid = technician_orcid;
                            } else if (sc_man_orcid !== null || sc_man_orcid !== '') {
                                orcid = sc_man_orcid;
                            } else {
                                orcid = null;
                            }
                            if (orcid === null) {
                                alert('Please insert your ORCID in your role data');
                            } else {
                                publications.getORCIDPublicationsPerson(orcid)
                                .then(function (response) {
                                    var data = response.data.group;
                                    scope.allORCIDPublicationsPrior = readORCIDData(data);
                                    // filtering for all published works (journal articles, conference papers)
                                    var printedORCID = scope.allORCIDPublicationsPrior.filter(function (el){
                                            if (el.type === null) return true; //because we don't know if it is printed or not
                                            if (el.type === 'LECTURE_SPEECH') return false;
                                            if (el.type === 'CONFERENCE_POSTER') return false;
                                            if (el.type === 'CONFERENCE_PAPER') return false;
                                            return true;
                                        });
                                    // removes all publications from ORCID that are already in DB
                                    scope.allORCIDPublications = removeExistingORCID(printedORCID,scope.allPublicationsPrior);
                                    var requests = [];
                                    for (var el in scope.allORCIDPublications) {
                                        if (scope.allORCIDPublications[el].path !== undefined) {
                                            requests.push(publications.getORCIDDetailsPublication(scope.allORCIDPublications[el].path));
                                        }
                                    }
                                    $q.all(requests)
                                        .then(function (results) {
                                            var ind = 0;
                                            for (var el in scope.allORCIDPublications) {
                                                if (scope.allORCIDPublications[el].path !== undefined) {
                                                    processDetailsORCID(scope.allORCIDPublications[el],results[ind].data);
                                                    ind++;
                                                } else {
                                                    processDetailsORCID(scope.allORCIDPublications[el],{});
                                                }
                                            }
                                            scope.progressORCID = false;
                                        });
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            }
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
                        function processDetailsORCID(pub, data) {
                            pub.edit_authors = true;
                            pub.edit_journal = true;
                            pub.edit_vol = true;
                            var journal = null;
                            if (data.hasOwnProperty('journal-title')) {
                                if (data['journal-title'] !== null && data['journal-title'].hasOwnProperty('value')) {
                                    journal = data['journal-title']['value'];
                                }
                            }
                            if (journal !== null) {
                                journal = journal.replace(/&amp;/g,'&');
                                pub.edit_journal = false;
                            }
                            pub.journal_name = journal;
                            var contributors = [];
                            if (data.hasOwnProperty('contributors')) {
                                if (data['contributors'] !== null && data['contributors'].hasOwnProperty('contributor')) {
                                    for (var ind in data.contributors.contributor) {
                                        if (data.contributors.contributor[ind].hasOwnProperty('credit-name')) {
                                            if (data.contributors.contributor[ind]['credit-name'] !== null
                                                && data.contributors.contributor[ind]['credit-name'].hasOwnProperty('value')) {
                                                if (data.contributors.contributor[ind]['credit-name'].value !== null) {
                                                    contributors.push(data.contributors.contributor[ind]['credit-name'].value);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            var volume = null;
                            var number = null; //this is used by some journals
                            var pages = null;
                            var authors = null;
                            if (data.hasOwnProperty('citation')) {
                                //from this we can get authors, volume, pages
                                if (data.citation !== null && data.citation.hasOwnProperty('citation-type')) {
                                    if (data.citation['citation-type'] === 'BIBTEX') {
                                        if (data.citation['citation-value'] !== null) {
                                            var vol = data.citation['citation-value'].match(/volume\s{0,1}=\s{0,1}{(.*?)}/);
                                            if (vol !== null) volume = vol[1];
                                            var num = data.citation['citation-value'].match(/number\s{0,1}=\s{0,1}{(.*?)}/);
                                            if (num !== null) number = num[1];
                                            var pg = data.citation['citation-value'].match(/pages\s{0,1}=\s{0,1}{(.*?)}/);
                                            if (pg !== null) pages = pg[1];
                                            var aut = data.citation['citation-value'].match(/author\s{0,1}=\s{0,1}{(.*?)}/);
                                            if (aut !== null) authors = aut[1];
                                            var j = data.citation['citation-value'].match(/journal\s{0,1}=\s{0,1}{(.*?)}/);
                                            if (journal === null) {
                                                if (j !== null) {
                                                    journal = j[1];
                                                    pub.journal_name = journal;
                                                    pub.edit_journal = false;
                                                }
                                            }
                                        }
                                    } else {
                                        alert('This data is not in an automatically parsed format (Bibtex), please add additional info below.\n\nData format found: ' + data.citation['citation-type']);
                                    }
                                }
                            }
                            if (volume === null || number === null || pages === null) {
                                pub.edit_vol = true;
                            }
                            pub.volume = volume;
                            pub.number = number;
                            pub.pages = pages;
                            if (contributors.length ===0) {
                                if (authors !== null && authors !== '') {
                                    pub.authors_raw = authors;
                                } else {
                                    pub.edit_authors = true;
                                }

                            } else {
                                var strAuthors = '';
                                for (var ind in contributors) {
                                    if (ind > 0) strAuthors = strAuthors + '; ';
                                    strAuthors = strAuthors + contributors[ind];
                                }
                                pub.authors_raw = strAuthors
                                            .replace(/\.\s/g, '')
                                            .replace(/\./g, '');
                            }
                            scope.publicationDetailsORCID.push(pub);
                        }
                        function removeExistingORCID(dataORCID, dataDB) {
                            var publications = [];
                            var titleORCID, titleDB;
                            for (var ind in dataORCID) {
                                var found = false;
                                for (var indDB in dataDB) {
                                    // first DOI is compared, if there is no DOI then compares title
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
                                                    .replace(/[\-;,:]/g,'');
                                            titleDB = dataDB[indDB].title
                                                    .toLowerCase()
                                                    .replace(/[\-;,:]/g,'');
                                            // compare titles
                                            if (titleORCID == titleDB) {
                                                // already in database => skip
                                                found = true;
                                                break;
                                            }
                                        }
                                    } else {
                                        // compare titles
                                        titleORCID = dataORCID[ind].title
                                                .toLowerCase()
                                                .replace(/[\-;,:]/g,'');
                                        titleDB = dataDB[indDB].title
                                                .toLowerCase()
                                                .replace(/[\-;,:]/g,'');
                                        // compare titles
                                        if (titleORCID == titleDB) {
                                            // already in database => skip
                                            found = true;
                                            break;
                                        }
                                    }
                                }
                                if (!found) {
                                    publications.push(dataORCID[ind]);
                                }
                            }
                            return publications;
                        }

                        scope.submitAddORCIDPublications = function (ind) {
                            if (scope.publicationDetailsORCID.length > 0) {
                                var addPublicationsORCID = [];
                                var incomplete = false;
                                for (var indPub in scope.publicationDetailsORCID) {
                                    if ((scope.publicationDetailsORCID[indPub].journal_name === null
                                        || scope.publicationDetailsORCID[indPub].journal_name === undefined
                                        || scope.publicationDetailsORCID[indPub].journal_name === ''
                                        || scope.publicationDetailsORCID[indPub].authors_raw === null
                                        || scope.publicationDetailsORCID[indPub].authors_raw === undefined
                                        || scope.publicationDetailsORCID[indPub].authors_raw === '')
                                        && scope.publicationDetailsORCID[indPub].chosen) {
                                        incomplete = true;
                                        break;
                                    } else if (scope.publicationDetailsORCID[indPub].chosen) {
                                        addPublicationsORCID.push(scope.publicationDetailsORCID[indPub]);
                                    }
                                }
                                if (incomplete) {
                                    alert('You must define authors and journal/book names for all chosen publications before submitting.');
                                } else {
                                    if (addPublicationsORCID.length > 0) {
                                        scope.updateStatus[ind] = "Updating...";
                                        scope.messageType[ind] = 'message-updating';
                                        scope.hideMessage[ind] = false;
                                        var data = {addPublications: addPublicationsORCID};
                                        publications.addORCIDPublicationsPerson(personID,data)
                                            .then( function () {
                                                scope.updateStatus[ind] = "Updated!";
                                                scope.messageType[ind] = 'message-success';
                                                scope.hideMessage[ind] = false;
                                                $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                                scope.gettingAllPublications = true;
                                                $rootScope.$broadcast('updateManagerPersonORCIDPublicationsMessage', data);
                                                initializeInterface();
                                                initializeVariables();
                                                getAllPublications();
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
                        scope.changeAllPublications = function(selectAll, pubs) {
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

                        function getAllPublications() {
                            // gets all publications from DB and excludes the ones that are already attributed to you
                            publications.allPublications()
                                .then(function (response) {
                                    scope.allPublicationsPrior = response.data.result;
                                    scope.gettingAllPublications = false;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        }

                        function initializeVariables() {
                            scope.sortReverse = true;
                            scope.sortType = 'year';

                            scope.publicationDetailsORCID = [];
                            personData.publicationTypes()
                                .then(function (response) {
                                    scope.publicationTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            personData.authorTypes()
                                .then(function (response) {
                                    scope.authorTypes = response.data.result;
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        }
                        function initializeInterface() {
                            scope.forms = {
                                'managerORCIDAdd': 0,
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
                            scope.addPublications = [];
                            scope.gettingAllPublications = true;

                            scope.allPublicationsSearchTitle = '';
                            scope.allPublicationsSearchAuthors = '';

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

    var managerPersonPublicationsLarge = managerPublications('large');
    var managerPersonPublicationsSmall = managerPublications('small');

    var managerAddPersonPublicationsLarge = managerAddPublications('large');
    var managerAddPersonPublicationsSmall = managerAddPublications('small');

    var managerAddPersonPublicationsOrcidLarge = managerAddPublicationsORCID('large');
    var managerAddPersonPublicationsOrcidSmall = managerAddPublicationsORCID('small');

    angular.module('managementApp')
        .directive('managerPersonPublicationsLarge', managerPersonPublicationsLarge)
        .directive('managerPersonPublicationsSmall', managerPersonPublicationsSmall)
        .directive('managerAddPersonPublicationsLarge', managerAddPersonPublicationsLarge)
        .directive('managerAddPersonPublicationsSmall', managerAddPersonPublicationsSmall)
        .directive('managerAddPersonPublicationsOrcidLarge', managerAddPersonPublicationsOrcidLarge)
        .directive('managerAddPersonPublicationsOrcidSmall', managerAddPersonPublicationsOrcidSmall)
        ;

})();