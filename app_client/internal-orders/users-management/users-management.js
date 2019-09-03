(function () {

    var orderUsersManagement =
        ['ordersData', 'authentication', '$timeout', '$mdPanel',
            function (ordersData, authentication, $timeout, $mdPanel) {
                return {
                    restrict: 'E',
                    scope: {
                        user: '@',
                        usersorders: '=',                        
                    },
                    templateUrl: 'internal-orders/users-management/users-list.html',
                    link:
                        function (scope, element, attrs) {
                            scope.newUser = {};
                            scope.userChanges = {
                                create: [],
                                update: [],
                                delete: [],
                            };
                            scope.currentPage = 1;
                            scope.pageSize = 10;
                            scope.sortType = 'colloquial_name';
                            scope.sortReverse = false;
                            scope.searchString = '';
                            scope.forms = {
                                'userList': 0,
                            };
                            var numberCards = Object.keys(scope.forms).length; // the number of cards with "Update" in each tab
                            scope.updateStatus = [];
                            scope.messageType = [];
                            scope.hideMessage = [];
                            for (var i = 0; i < numberCards; i++) {
                                scope.updateStatus.push('');
                                scope.messageType.push('message-updating');
                                scope.hideMessage.push(true);
                            }

                            scope.renderUsers = function (str) {
                                if (str === 'new') {
                                    scope.currentPage = 1;
                                }
                                scope.searchResults = [];
                                for (let item in scope.usersorders) {
                                    var toInclude = 0;
                                    var toIncludeDueName = 0;
                                    var toIncludeDueRole = 0;
                                    var toIncludeDueAccount = 0;
                                    var toIncludeDueCostCenter = 0;
                                    
                                    if (scope.searchString !== '') {
                                        if (nameMatching(scope.usersorders[item]['colloquial_name'], scope.searchString) !== null) {
                                            toIncludeDueName = 1;
                                        }
                                        if (nameMatching(scope.usersorders[item]['role_name_en'], scope.searchString) !== null) {
                                            toIncludeDueRole = 1;
                                        }
                                        if (nameMatching(scope.usersorders[item]['account_name_en'], scope.searchString) !== null) {
                                            toIncludeDueAccount = 1;
                                        }
                                        if (nameMatching(scope.usersorders[item]['cost_center_name_en'], scope.searchString) !== null) {
                                            toIncludeDueCostCenter = 1;
                                        }
                                    } else {
                                        toIncludeDueName = 1;
                                        toIncludeDueRole = 1;
                                        toIncludeDueAccount = 1;
                                        toIncludeDueCostCenter = 1;
                                    }
                                    if (toIncludeDueName === 1 || toIncludeDueAccount === 1
                                        || toIncludeDueRole === 1 || toIncludeDueCostCenter === 1) {
                                        toInclude = 1;
                                    }
                                    if (toInclude === 1) {
                                        scope.searchResults.push(scope.usersorders[item]);
                                    }
                                }
                                scope.totalFromSearch = scope.searchResults.length;
                                scope.totalPages = Math.ceil(scope.totalFromSearch / scope.pageSize);
                                scope.pages = [];
                                for (var num = 1; num <= scope.totalPages; num++) {
                                    scope.pages.push(num);
                                }
                                // Sort searchResults according to defined order, before
                                // defining page contents
                                scope.searchResults = scope.searchResults.sort(sorterUsers);
                                scope.shownUsers = [];
                                for (let item = (scope.currentPage - 1) * scope.pageSize;
                                    item < scope.currentPage * scope.pageSize && item < scope.totalFromSearch;
                                    item++) {
                                    scope.shownUsers.push(scope.searchResults[item]);
                                }

                            };
                            scope.sortColumn = function (colName, table) {
                                if (table === 'orders') {
                                    if (colName === scope.sortType) {
                                        scope.sortReverse = !scope.sortReverse;
                                    } else {
                                        scope.sortType = colName;
                                        scope.sortReverse = false;
                                    }
                                    scope.renderUsers('new')
                                }
                            };

                            scope.removeUser = function (items, thisItem) {
                                let result = confirm('Are you sure you want to remove this user?\n\n'
                                                    +'Note 1: This will only be effetive after selecting "Submit Changes".\n'
                                                    + 'Note 2: This won\'t affect previous orders.\n');
                                if (result) {
                                    for (let el in items) {
                                        if (items[el].accounts_people_id !== 'new') {
                                            if (items[el].accounts_people_id === thisItem.accounts_people_id) {
                                                scope.userChanges.delete.push(items[el]);
                                                items.splice(el, 1);
                                                break;
                                            }
                                        } else {    
                                            items.splice(el, 1);
                                            break;
                                        }
                                    }
                                    scope.renderUsers('new');
                                }                                
                            };
                            scope.addToUsers = function (item) {
                                if (item.userSelected !== null) {
                                    if (item.userSelected.colloquial_name !== null && item.userSelected.colloquial_name !== undefined) {
                                        item.accounts_people_id = 'new';
                                        item.user_id = item.userSelected.user_id;
                                        item.colloquial_name = item.userSelected.colloquial_name;
                                        item.email = item.userSelected.email;
                                        for (let el in scope.accountsInCostCenters[item.cost_center_id]) {
                                            if (scope.accountsInCostCenters[item.cost_center_id][el].id
                                                === item.account_id) {
                                                item.account_active = scope.accountsInCostCenters[item.cost_center_id][el].active;
                                            }
                                        }
                                        let newItem = Object.assign({}, item);
                                        scope.usersorders.push(newItem);
                                        scope.renderUsers('new');
                                        scope.newUser = {};
                                    }
                                }                                
                            };
                            
                            scope.processChange = function (item, field) {
                                if (item.accounts_people_id !== 'new') {
                                    let found = false;
                                    let indFound = null;
                                    for (let el in scope.userChanges.update) {
                                        if (scope.userChanges.update[el].accounts_people_id === item.accounts_people_id) {
                                            found = true;
                                            indFound = el;
                                            break;
                                        }
                                    }
                                    if (field === 'cost_center') {
                                        item.account_id = null;
                                    } else if (field === 'account') {
                                        for (let el in scope.accountsInCostCenters[item.cost_center_id]) {
                                            if (scope.accountsInCostCenters[item.cost_center_id][el].id 
                                                        === item.account_id) {
                                                item.account_active = scope.accountsInCostCenters[item.cost_center_id][el].active;
                                            }
                                        }
                                    }
                                    if (found) {
                                        scope.userChanges.update[indFound] = item;
                                    } else {
                                        scope.userChanges.update.push(item);
                                    }
                                }
                            };
                            scope.processChangeNewUser = function (item, field) {
                                item.account_id = null;
                            };
                            scope.searchUser = function (name) {
                                return ordersData.searchUsersSimple(scope.user, name)
                                    .then(function (response) {
                                        if (response !== null && response !== undefined) {
                                            return response.data.result;
                                        } else {
                                            return null;
                                        }
                                    });
                            };
                            scope.submitUserChanges = function (ind) {
                                scope.updateStatus[ind] = "Updating...";
                                scope.messageType[ind] = 'message-updating';
                                scope.hideMessage[ind] = false;
                                // first, check if there is new data
                                // this is done here in case user changes new data after adding
                                for (let el in scope.usersorders) {
                                    if (scope.usersorders[el].accounts_people_id === 'new') {
                                        scope.userChanges.create.push(scope.usersorders[el]);
                                    } 
                                }                           
                                ordersData.updateManagersUsers(scope.user, scope.userChanges)
                                    .then(function () {
                                        ordersData.getAllUsersInfo(scope.user)
                                            .then(function (response) {
                                                if (response !== null && response !== undefined) {
                                                    scope.usersorders = response.data.result;
                                                    scope.userChanges = {
                                                        create: [],
                                                        update: [],
                                                        delete: [],
                                                    };
                                                    scope.renderUsers('new');
                                                    scope.getDataLists();
                                                }
                                            })
                                            .catch(function (err) {
                                                console.log(err);
                                            });

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
                                        function () { }
                                    );
                            };

                            scope.getDataLists = function () {
                                ordersData.orderAccountRoles()
                                    .then(function (response) {
                                        if (response !== null && response !== undefined) {
                                            scope.accountRoles = response.data.result;
                                        }
                                    })
                                scope.accountsInCostCenters = {};
                                ordersData.orderCostCenters()
                                    .then(function (response) {
                                        if (response !== null && response !== undefined) {
                                            scope.costCentersList = response.data.result;
                                            ordersData.orderAccounts()
                                                .then(function (response) {
                                                    if (response !== null && response !== undefined) {
                                                        scope.accountsList = response.data.result;
                                                        for (let indCenter in scope.costCentersList) {
                                                            scope.accountsInCostCenters[scope.costCentersList[indCenter].id] = [];
                                                            for (let indAccount in scope.accountsList) {
                                                                if (scope.accountsList[indAccount].cost_center_id
                                                                    === scope.costCentersList[indCenter].id) {
                                                                    scope.accountsInCostCenters[scope.costCentersList[indCenter].id].push(scope.accountsList[indAccount]);
                                                                }
                                                            }
                                                        }
                                                    }
                                                })
                                        }
                                    })

                            }

                            // to initialize inventory 
                            scope.renderUsers('new');
                            scope.getDataLists();
                            
                            
                            function nameMatching(name1, str) {
                                var name1Final = prepareString(name1);
                                var strFinal = prepareString(str);
                                var strSplit = strFinal.split(' ');
                                for (var el in strSplit) {
                                    if (name1Final.match(strSplit[el]) === null) {
                                        return null;
                                    }

                                }
                                return true;
                            }
                            function prepareString(str) {
                                if (str !== null && str !== undefined) {
                                    return str.toLowerCase()
                                        .replace(/[áàãâä]/g, 'a')
                                        .replace(/[éèêë]/g, 'e')
                                        .replace(/[íìîï]/g, 'i')
                                        .replace(/[óòõôö]/g, 'o')
                                        .replace(/[úùûü]/g, 'u')
                                        .replace(/[ç]/g, 'c')
                                        .replace(/[ñ]/g, 'n');
                                } else {
                                    return '';
                                }
                            }
                            function sorterUsers(a, b) {
                                if (scope.sortType === 'colloquial_name'
                                    || scope.sortType === 'role_name_en'
                                    || scope.sortType === 'account_name_en'
                                    || scope.sortType === 'cost_center_name_en') {
                                    if (scope.sortReverse) {
                                        return -(a[scope.sortType] ? a[scope.sortType] : '')
                                            .localeCompare(b[scope.sortType] ? b[scope.sortType] : '');
                                    } else {
                                        return (a[scope.sortType] ? a[scope.sortType] : '')
                                            .localeCompare(b[scope.sortType] ? b[scope.sortType] : '');
                                    }
                                
                                }
                                return 0;
                            }
                        }
                };
            }];
    
    angular.module('managementApp')
        .directive('orderUsersManagement', orderUsersManagement);

})();