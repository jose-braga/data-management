(function(){
/******************************* Controllers **********************************/
    var unitAreaCtrl = function ($scope, $routeParams, $route, $q, $location, 
                                $timeout, $mdMedia, $mdPanel,
                                personData, docsData, authentication) {
        var vm = this;
        vm.isLoggedIn = authentication.isLoggedIn();
        vm.currentUser = authentication.currentUser();
        var currentUnitShortName = $routeParams.unit;
        var currentCityName = $routeParams.city;
        var writingPermissions = [0, 5, 10, 15, 16, 20];
        vm.cityID = undefined;
        vm.cityName = undefined;

        initialize();

        vm.submitDocs = function (ind) {
            vm.updateStatus[ind] = "Adding...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;

            var fd = new FormData();
            var keys = Object.keys(vm.doc);
            for (let indKey in keys) {
                if (keys[indKey] !== 'file') {
                    fd.append(keys[indKey], vm.doc[keys[indKey]]);
                }
            }
            if (vm.doc.file !== undefined && vm.doc.file !== null) {
                fd.append('file', vm.doc.file.file);
                fd.append('file_name', vm.doc.file.file_name);
            }

            docsData.createUnitDoc(vm.unitID, fd, vm.cityID)
                .then( function () {
                    vm.updateStatus[ind] = "Added!";
                    vm.messageType[ind] = 'message-success';
                    vm.hideMessage[ind] = false;
                    getDocLists();
                    $timeout(function () {
                        vm.hideMessage[ind] = true;
                        if (vm.doc.file !== null && vm.doc.file !== undefined) {
                            angular.element(document.querySelector("#document-file-add")).val(null);
                            vm.doc.file.file = null;
                        }
                        vm.doc = {};
                    }, 1500);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };
        vm.deleteDocument = function (ind, doc) {
            var answer = confirm('Are you sure?');
            if (answer) {
                vm.updateStatus[ind] = "Deleting...";
                vm.messageType[ind] = 'message-updating';
                vm.hideMessage[ind] = false;

                docsData.deleteUnitDoc(vm.unitID, doc.id, vm.cityID)
                    .then( function () {
                        vm.updateStatus[ind] = "Deleted!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        getDocLists();
                        $timeout(function () {
                            vm.hideMessage[ind] = true;
                        }, 1500);
                    },
                    function () {
                        vm.updateStatus[ind] = "Error!";
                        vm.messageType[ind] = 'message-error';
                    },
                    function () {
                    });
            }
        };
        vm.showDetails = function (doc) {
            console.log(doc)
            var position = $mdPanel.newPanelPosition()
                                .absolute()
                                .center();
            var docDetailsCtrl = function(mdPanelRef) {
                var ctrl = this;
                this._mdPanelRef = mdPanelRef;

                ctrl.closePanel = function () {
                    mdPanelRef.close();
                };
                ctrl.submitDocUpdate = function (ind, doc) {
                    ctrl.updateStatus[ind] = "Updating...";
                    ctrl.messageType[ind] = 'message-updating';
                    ctrl.hideMessage[ind] = false;

                    var fd = new FormData();
                    var keys = Object.keys(doc);
                    for (let indKey in keys) {
                        if (keys[indKey] !== 'file'
                                && doc[keys[indKey]] !== null
                                && doc[keys[indKey]] !== undefined) {
                            //console.log(keys[indKey], doc[keys[indKey]])
                            fd.append(keys[indKey], doc[keys[indKey]]);
                        }
                    }
                    if (doc.file !== undefined && doc.file !== null) {
                        //console.log('file', doc.file.file)
                        //console.log('file_name', doc.file.file_name)
                        fd.append('file', doc.file.file);
                        fd.append('file_name', doc.file.file_name);
                    }

                    docsData.updateUnitDoc(doc.unit_id, doc.id, fd, doc.city_id)
                        .then( function () {
                            getDocLists();
                            ctrl.updateStatus[ind] = "Updated!";
                            ctrl.messageType[ind] = 'message-success';
                            ctrl.hideMessage[ind] = false;
                            $timeout(function () { ctrl.hideMessage[ind] = true; }, 1500);
                            //ctrl.closePanel();
                        },
                        function () {
                            ctrl.updateStatus[ind] = "Error!";
                            ctrl.messageType[ind] = 'message-error';
                        },
                        function (value) {}
                        );
                    return false;
                };

                ctrl.selectElements1 = function (val, index, array) {
                    return  index >= 0 && index <= 2;
                };
                ctrl.selectElements2 = function (val, index, array) {
                    return  index >= 3 && index <= 6;
                };

                ctrl.doc.changeAttachment = 'No';
            };
            var config = {
                //attachTo: angular.element(document.body),
                controller: docDetailsCtrl,
                controllerAs: 'ctrl',
                templateUrl: 'unit-areas/docs/doc.details.html',
                locals: {
                    forms: vm.forms,
                    updateStatus: vm.updateStatus,
                    hideMessage: vm.hideMessage,
                    messageType: vm.messageType,
                    doc: doc,
                    docTypes: vm.docTypes,
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
            vm.documentPanel = $mdPanel.open(config);
        };
        vm.nothingToShow = function(data) {
            if (data.length === 0 || data[0].length === 0) {
                return true;
            }
            return false;
        };

        vm.newPassClick = function () {
            vm.showPasswordChange = !vm.showPasswordChange;
            if (vm.showPasswordChange) {
                vm.initialPassword = 'Old password';
                vm.changeButtonTxt = 'No change';
                vm.submitButtonTxt = 'Submit';
            } else {
                vm.initialPassword = 'Password';
                vm.changeButtonTxt = 'Change Password';
                vm.submitButtonTxt = 'Login';
            }
        };
        vm.doLogin = function () {
            authentication
                .login(vm.credentials)
                .then(function () {
                    $route.reload();
                })
                .catch(function (err) {
                    alert('Error on authentication.');
                    console.log(err);
                });
        };
        vm.changePassword = function () {
            authentication
                .login(vm.credentials)
                .then(function () {
                    authentication
                        .changePassword(vm.credentials)
                        .then(function () {
                            $location.search('page', null);
                            $location.path(vm.returnPage);
                        })
                        .catch(function (err) {
                            alert('Error on changing password.');
                            console.log(err);
                        });
                })
                .catch(function (err) {
                    alert('Error on authentication.');
                    console.log(err);
                })
                ;
        };
        vm.onSubmit = function () {
            if (!vm.showPasswordChange) {
                if (!vm.credentials.username || !vm.credentials.password) {
                    alert('All fields required, please try again');
                    return false;
                } else {
                    vm.doLogin();
                }
            } else {
                if (!vm.credentials.username || !vm.credentials.password
                    || !vm.credentials.newPassword1 || !vm.credentials.newPassword2) {
                    alert('All fields required, please try again');
                    return false;
                } else {
                    vm.changePassword();
                }

            }
        };


        function getDocLists() {
            if (vm.publishPermission) {
                docsData.getUnitDocs(vm.unitID, vm.cityID)
                    .then(function (response) {
                        vm.docUnitQueue = response.data.result;
                        for (let el in vm.docUnitQueue) {
                            vm.docUnitQueue[el].show_link = false;
                            if (vm.docUnitQueue[el].attachment_url !== null) {
                                vm.docUnitQueue[el].show_link = true;
                            }
                        }
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            }
            docsData.getUnitActiveDocs(vm.unitID, vm.cityID)
                .then(function (response) {
                    vm.docUnitActive = response.data.result;
                    for (let el in vm.docUnitActive) {
                        vm.docUnitActive[el].show_link = false;
                        if (vm.docUnitActive[el].attachment_url !== null) {
                            vm.docUnitActive[el].show_link = true;
                        }
                    }
                    var showData = [];
                    for (let indType in vm.docTypes) {
                        var typeObj = {};
                        typeObj.type = vm.docTypes[indType].name;
                        typeObj.documents = [];
                        //typeObj[vm.docTypes[indType].name] = [];
                        for (let el in vm.docUnitActive) {
                            if (vm.docUnitActive[el].doc_type_id === vm.docTypes[indType].id) {
                                typeObj.documents.push(vm.docUnitActive[el]);
                            }
                        }
                        showData.push(typeObj);
                    }
                    vm.showData = [];
                    var count = -1;
                    var thisLine = [];
                    for (let el in showData) {
                        if (showData[el].documents.length > 0) {
                            thisLine.push(showData[el]);
                            count++;
                        }
                        if (count % 3 === 2 || parseInt(el,10) === showData.length - 1) {
                            var newobj = Object.assign([],thisLine);
                            vm.showData.push(newobj);
                            thisLine = [];
                        }
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });

        }
        function initialize () {
            personData.units()
                .then(function (response) {
                    var units_temp = response.data.result;
                    var units = [];
                    var usedIDs = [];
                    for (var el in units_temp) {
                        if (usedIDs.indexOf(units_temp[el].id) === -1) {
                            usedIDs.push(units_temp[el].id);
                            units.push(units_temp[el]);
                        }
                    }
                    personData.institutionCities()
                        .then(function (response) {
                            var cities = response.data.result;
                            initializeInterface(currentUnitShortName, units,
                                                currentCityName, cities);
                        });
                })
                .catch(function (err) {
                    console.log(err);
                });
            personData.docTypes()
                .then(function (response) {
                    vm.docTypes = response.data.result;
                    vm.docTypes = vm.docTypes.sort(function(a,b) {
                        return a.sort_order - b.sort_order;
                    });
                })
                .catch(function (err) {
                    console.log(err);
                });
        }
        function initializeInterface(currentUnitShortName, units, currentCityName, cities) {
            if (currentCityName === undefined || currentCityName === null) {
                vm.credentials = {
                    username: '',
                    password: '',
                    newPassword1: '',
                    newPassword2: ''
                };
                vm.showPasswordChange = false;
                vm.initialPassword = 'Password';
                vm.changeButtonTxt = 'Change Password';
                vm.submitButtonTxt = 'Login';
    
                vm.progressSubmit = 0;
                vm.showData = [];
                vm.doc = {};
                vm.doc.hasAttachment = 'None';
                for (let el in units) {
                    if (units[el].short_name === currentUnitShortName) {
                        vm.unitName = units[el].name;
                        vm.unitID = units[el].id;
                    }
                }
                if (vm.currentUser.unitID.indexOf(vm.unitID) !== -1) {
                    vm.accessPermission = true;
                    if (writingPermissions.indexOf(vm.currentUser.stat) !== -1) {
                        vm.publishPermission = true;
                    } else {
                        vm.publishPermission = false;
                    }
                } else {
                    vm.accessPermission = false;
                    vm.publishPermission = false;
                }
                vm.toolbarData = {title: currentUnitShortName + ': Documents and general information'};
                vm.forms = {
                    'docAdd':            0,
                    'docUpdate':         1,
                    'docDelete':         2,
                };
                var numberCards = Object.keys(vm.forms).length; // the number of cards with "Update" in each tab
                vm.updateStatus = [];
                vm.messageType = [];
                vm.hideMessage = [];
                for (var i=0; i<numberCards; i++) {
                    vm.updateStatus.push('');
                    vm.messageType.push('message-updating');
                    vm.hideMessage.push(true);
                }
                getDocLists();                
            } else {
                vm.credentials = {
                    username: '',
                    password: '',
                    newPassword1: '',
                    newPassword2: ''
                };
                vm.showPasswordChange = false;
                vm.initialPassword = 'Password';
                vm.changeButtonTxt = 'Change Password';
                vm.submitButtonTxt = 'Login';
    
                vm.progressSubmit = 0;
                vm.showData = [];
                vm.doc = {};
                vm.doc.hasAttachment = 'None';
                for (let el in units) {
                    if (units[el].short_name === currentUnitShortName) {
                        vm.unitName = units[el].name;
                        vm.unitID = units[el].id;
                    }
                }
                for (let el in cities) {
                    if (cities[el].city === currentCityName) {
                        vm.cityName = cities[el].city;
                        vm.cityID = cities[el].id;
                    }
                }
                if (vm.currentUser.unitID.indexOf(vm.unitID) !== -1 
                    && vm.currentUser.cityID === vm.cityID) {
                    vm.accessPermission = true;
                    if (writingPermissions.indexOf(vm.currentUser.stat) !== -1) {
                        vm.publishPermission = true;
                    } else {
                        vm.publishPermission = false;
                    }
                } else {
                    vm.accessPermission = false;
                    vm.publishPermission = false;
                }
                vm.toolbarData = {title: currentUnitShortName + '@' + currentCityName + ': Documents and general information'};
                vm.forms = {
                    'docAdd':            0,
                    'docUpdate':         1,
                    'docDelete':         2,
                };
                var numberCards = Object.keys(vm.forms).length; // the number of cards with "Update" in each tab
                vm.updateStatus = [];
                vm.messageType = [];
                vm.hideMessage = [];
                for (var i=0; i<numberCards; i++) {
                    vm.updateStatus.push('');
                    vm.messageType.push('message-updating');
                    vm.hideMessage.push(true);
                }
                getDocLists();
            }
        }
    };

/******************************** Directives **********************************/

    var docsQueueList = function () {
        return {
            restrict: 'E',
            templateUrl: 'unit-areas/docs/docs.queueList.html'
        };
    };

    var docsActiveList = function () {
        return {
            restrict: 'E',
            templateUrl: 'unit-areas/docs/docs.activeList.html'
        };
    };

    var docAdd = function () {
        return {
            restrict: 'E',
            templateUrl: 'unit-areas/docs/doc.add.html'
        };
    };


    var readfile = function () {
        return {
            scope: {
                readfile: "="
            },
            link: function (scope, element, attributes) {
                element.bind("change", function (changeEvent) {
                    scope.$apply(function () {
                        scope.readfile = {
                            file: changeEvent.target.files[0],
                            file_name: changeEvent.target.files[0].name,
                            lastModified: changeEvent.target.files[0].lastModified,
                            size: changeEvent.target.files[0].size,
                            type: changeEvent.target.files[0].type,
                        };
                    });
                });
            }
        };
    };

/**************************** Register components *****************************/
    angular.module('managementApp')
        .directive('docsQueueList', docsQueueList)
        .directive('docsActiveList', docsActiveList)
        .directive('docAdd', docAdd)

        .directive('readfile', readfile)

        .controller('unitAreaCtrl', unitAreaCtrl)
        ;
})();