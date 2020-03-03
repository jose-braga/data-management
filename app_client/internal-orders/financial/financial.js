(function () {

    var orderFinancialStructure =
        ['ordersData', 'authentication', '$timeout', '$mdPanel',
            function (ordersData, authentication, $timeout, $mdPanel) {
                return {
                    restrict: 'E',
                    scope: {
                        user: '@',
                    },
                    templateUrl: 'internal-orders/financial/cost-centers.html',
                    link:
                        function (scope, element, attrs) {
                            scope.newCenter = {};
                            scope.costCenterChanges = {
                                create: [],
                                update: [],
                                delete: [],
                            };
                            scope.accountChanges = {
                                create: [],
                                update: [],
                                delete: [],
                            };
                            scope.currentPage = 1;
                            scope.pageSize = 10;
                            scope.sortType = 'name_en';
                            scope.sortReverse = false;
                            scope.searchString = '';
                            scope.forms = {
                                'finances': 0,
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

                            scope.renderData = function (str) {
                                if (str === 'new') {
                                    scope.currentPage = 1;
                                }
                                scope.searchResults = [];
                                for (let indCenter in scope.costCentersList) {
                                    if (scope.searchString !== '') {
                                        if (nameMatching(scope.costCentersList[indCenter]['name_en'], scope.searchString) !== null) {
                                            scope.costCentersList[indCenter].accountsMatching = scope.costCentersList[indCenter].accounts;
                                            scope.searchResults.push(scope.costCentersList[indCenter]);
                                        } else {
                                            let accountsMatching = [];
                                            for (let indAccount in scope.costCentersList[indCenter].accounts) {
                                                if (nameMatching(scope.costCentersList[indCenter].accounts[indAccount]['name_en'], scope.searchString) !== null) {
                                                    accountsMatching.push(scope.costCentersList[indCenter].accounts[indAccount]);
                                                }
                                            }
                                            if (accountsMatching.length > 0) {
                                                scope.costCentersList[indCenter].accountsMatching = accountsMatching;
                                                scope.searchResults.push(scope.costCentersList[indCenter]);
                                            }

                                        }


                                    } else {
                                        // include all
                                        scope.costCentersList[indCenter].accountsMatching = scope.costCentersList[indCenter].accounts;
                                        scope.searchResults.push(scope.costCentersList[indCenter]);
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
                                scope.searchResults = scope.searchResults.sort(sorterData);
                                scope.shownData = [];
                                for (let item = (scope.currentPage - 1) * scope.pageSize;
                                    item < scope.currentPage * scope.pageSize && item < scope.totalFromSearch;
                                    item++) {
                                    scope.shownData.push(scope.searchResults[item]);
                                }

                            };

                            scope.removeCenter = function (items, thisItem) {
                                let result = confirm('Are you sure you want to remove this Cost Center?\n\n'
                                    + 'Note 1: This will only be effetive after selecting "Submit Changes".\n'
                                    + 'Note 2: This won\'t affect orders already dependent on this cost center.\n');
                                if (result) {
                                    thisItem.active = 0;
                                    let isNew = false;
                                    for (let el in items) {
                                        if (items[el].id === 'new') {
                                            isNew = true;
                                            items.splice(el, 1);
                                            break;
                                        }
                                    }
                                    if(!isNew) {
                                        scope.costCenterChanges.delete.push(thisItem);
                                    }
                                    scope.renderData('new');
                                }
                            };
                            scope.removeAccount = function (items, thisItem) {
                                let result = confirm('Are you sure you want to remove this account?\n\n'
                                    + 'Note 1: This will only be effetive after selecting "Submit Changes".\n'
                                    + 'Note 2: This won\'t affect orders already dependent on this account.\n');
                                if (result) {
                                    thisItem.active = 0;
                                    let isNew = false;
                                    for (let el in items) {
                                        if (items[el].id === 'new') {
                                            isNew = true;
                                            items.splice(el, 1);
                                            break;
                                        }
                                    }
                                    if (!isNew) {
                                        scope.accountChanges.delete.push(thisItem);
                                    }
                                    scope.renderData('new');
                                }

                            };
                            scope.addCenter = function (item) {
                                if (item.name_en !== null && item.name_en !== undefined) {
                                    item.id = 'new';
                                    item.name_pt = item.name_en;
                                    item.active = 1;
                                    item.accounts = [];
                                    item.accountsMatching = [];
                                    scope.costCentersList.push(item);
                                    scope.renderData('new');
                                    scope.newCenter = {};
                                }
                            };
                            scope.addAccount = function (center) {
                                if (center.newAccount !== null && center.newAccount !== undefined) {
                                    item = {
                                        id: 'new',
                                        name_en: center.newAccount,
                                        name_pt: center.newAccount,
                                        cost_center_id: center.id,
                                        cost_center_name_en: center.name_en, //important for newly created centers
                                        cost_center_name_pt: center.name_pt,
                                        active: 1
                                    };
                                    center.accounts.push(item);
                                    scope.searchString = '';
                                    scope.renderData('new');
                                    center.newAccount = '';
                                }
                            };
                            scope.processChange = function (item, field) {
                                if (item.id !== 'new') {
                                    let found = false;
                                    let indFound = null;
                                    if (field === 'cost_center') {
                                        for (let el in scope.costCenterChanges.update) {
                                            if (scope.costCenterChanges.update[el].id === item.id) {
                                                found = true;
                                                indFound = el;
                                                break;
                                            }
                                        }
                                        if (found) {
                                            scope.costCenterChanges.update[indFound] = item;
                                        } else {
                                            scope.costCenterChanges.update.push(item);
                                        }
                                    } else if (field === 'account') {
                                        for (let el in scope.accountChanges.update) {
                                            if (scope.accountChanges.update[el].id === item.id) {
                                                found = true;
                                                indFound = el;
                                                break;
                                            }
                                        }
                                        if (found) {
                                            scope.accountChanges.update[indFound] = item;
                                        } else {
                                            scope.accountChanges.update.push(item);
                                        }
                                    }
                                }


                                /*
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
                                */
                            };
                            scope.submitDataChanges = function (ind) {
                                scope.updateStatus[ind] = "Updating...";
                                scope.messageType[ind] = 'message-updating';
                                scope.hideMessage[ind] = false;
                                // first, check if there is new data
                                // this is done here in case user changes new data after adding
                                for (let indCenter in scope.costCentersList) {
                                    if (scope.costCentersList[indCenter].id === 'new') {
                                        scope.costCenterChanges.create.push(scope.costCentersList[indCenter]);
                                    }
                                    for (let indAccount in scope.costCentersList[indCenter].accounts) {
                                        if (scope.costCentersList[indCenter].accounts[indAccount].id === 'new') {
                                            scope.accountChanges.create.push(scope.costCentersList[indCenter].accounts[indAccount]);
                                        }
                                    }
                                }
                                let data = {
                                    costCenters: scope.costCenterChanges,
                                    accounts: scope.accountChanges,
                                }

                                ordersData.updateManagersFinancialStructure(scope.user, data)
                                    .then(function () {
                                        scope.costCenterChanges = {
                                            create: [],
                                            update: [],
                                            delete: [],
                                        };
                                        scope.accountChanges = {
                                            create: [],
                                            update: [],
                                            delete: [],
                                        };
                                        getDataLists();
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

                            // to initialize data
                            getDataLists();

                            function getDataLists() {
                                ordersData.orderCostCenters()
                                    .then(function (response) {
                                        if (response !== null && response !== undefined) {
                                            scope.costCentersList = response.data.result;
                                            ordersData.orderAccounts()
                                                .then(function (response) {
                                                    if (response !== null && response !== undefined) {
                                                        scope.accountsList = response.data.result;
                                                        for (let indCenter in scope.costCentersList) {
                                                            scope.costCentersList[indCenter].accounts = [];
                                                            for (let indAccount in scope.accountsList) {
                                                                if (scope.accountsList[indAccount].cost_center_id
                                                                    === scope.costCentersList[indCenter].id) {
                                                                    scope.costCentersList[indCenter].accounts.push(scope.accountsList[indAccount]);
                                                                }
                                                            }
                                                        }
                                                        scope.renderData('new');
                                                    }
                                                })
                                        }
                                    })
                            }
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
                            function sorterData(a, b) {
                                if (scope.sortType === 'name_en') {
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


    var orderFinancialMonitoring =
        ['ordersData', 'authentication', '$timeout', '$mdPanel',
            function (ordersData, authentication, $timeout, $mdPanel) {
                return {
                    restrict: 'E',
                    scope: {
                        user: '@',
                    },
                    templateUrl: 'internal-orders/financial/finances-monitoring.html',
                    link:
                        function (scope, element, attrs) {
                            scope.currentYear = parseInt(moment().format('YYYY'), 10);
                            scope.accountSelected = false;
                            scope.financesToShow = {}
                            scope.currentPage = 1;
                            scope.pageSize = 10;
                            scope.sortType = 'name_en';
                            scope.sortReverse = false;
                            scope.searchString = '';
                            scope.forms = {
                                'finances': 0,
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

                            scope.renderData = function (str) {
                                if (str === 'new') {
                                    scope.currentPage = 1;
                                }
                                scope.searchResults = [];
                                for (let indCenter in scope.costCentersList) {
                                    if (scope.searchString !== '') {
                                        if (nameMatching(scope.costCentersList[indCenter]['name_en'], scope.searchString) !== null) {
                                            scope.costCentersList[indCenter].accountsMatching = scope.costCentersList[indCenter].accounts;
                                            scope.searchResults.push(scope.costCentersList[indCenter]);
                                        } else {
                                            let accountsMatching = [];
                                            for (let indAccount in scope.costCentersList[indCenter].accounts) {
                                                if (nameMatching(scope.costCentersList[indCenter].accounts[indAccount]['name_en'], scope.searchString) !== null) {
                                                    accountsMatching.push(scope.costCentersList[indCenter].accounts[indAccount]);
                                                }
                                            }
                                            if (accountsMatching.length > 0) {
                                                scope.costCentersList[indCenter].accountsMatching = accountsMatching;
                                                scope.searchResults.push(scope.costCentersList[indCenter]);
                                            }

                                        }


                                    } else {
                                        // include all
                                        scope.costCentersList[indCenter].accountsMatching = scope.costCentersList[indCenter].accounts;
                                        scope.searchResults.push(scope.costCentersList[indCenter]);
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
                                scope.searchResults = scope.searchResults.sort(sorterData);
                                scope.shownData = [];
                                for (let item = (scope.currentPage - 1) * scope.pageSize;
                                    item < scope.currentPage * scope.pageSize && item < scope.totalFromSearch;
                                    item++) {
                                    scope.shownData.push(scope.searchResults[item]);
                                }

                            };
                            scope.getDataLists = function () {
                                ordersData.getAllUsersInfo(scope.user)
                                    .then(function (response) {
                                        if (response !== null && response !== undefined) {
                                            var users = response.data.result;
                                            scope.users = users;
                                            ordersData.orderCostCenters()
                                                .then(function (response) {
                                                    if (response !== null && response !== undefined) {
                                                        scope.costCentersList = response.data.result;
                                                        ordersData.orderAccounts()
                                                            .then(function (response) {
                                                                if (response !== null && response !== undefined) {
                                                                    scope.accountsList = response.data.result;
                                                                    for (let indCenter in scope.costCentersList) {
                                                                        scope.costCentersList[indCenter].accounts = [];
                                                                        for (let indAccount in scope.accountsList) {
                                                                            if (scope.accountsList[indAccount].cost_center_id
                                                                                === scope.costCentersList[indCenter].id) {
                                                                                for (let indUser in users) {
                                                                                    if (users[indUser].account_id === scope.accountsList[indAccount].id
                                                                                            && users[indUser].role_id === 1) {
                                                                                        scope.accountsList[indAccount].responsible_name = users[indUser].colloquial_name;
                                                                                        scope.accountsList[indAccount].responsible_email = users[indUser].email;
                                                                                    }
                                                                                }
                                                                                scope.costCentersList[indCenter].accounts.push(scope.accountsList[indAccount]);

                                                                            }
                                                                        }
                                                                    }
                                                                    scope.renderData('new');
                                                                }
                                                            })
                                                    }
                                                })
                                        }
                                    })
                                    .catch(function (err) {
                                        console.log(err);
                                    });

                            };

                            scope.previousYearFinances = function (account) {
                                for (let ind in scope.accountFinances) {
                                    if (scope.accountFinances[ind].year === scope.financesToShow.year - 1) {
                                        scope.financesToShow = scope.accountFinances[ind];
                                        break;
                                    }
                                }
                            };

                            scope.nextYearFinances = function (account) {
                                // we can only move forward until current year + 1
                                for (let ind in scope.accountFinances) {
                                    if (scope.accountFinances[ind].year === scope.financesToShow.year + 1
                                            && scope.accountFinances[ind].year <= scope.currentYear + 1) {
                                        scope.financesToShow = scope.accountFinances[ind];
                                        break;
                                    }
                                }
                            };

                            scope.showDetailsAccount = function (center, account) {
                                ordersData.getManagersAccountFinances(scope.user, account.id)
                                    .then(function (response) {
                                        if (response !== null && response !== undefined) {
                                            scope.accountFinances = response.data.result;
                                            scope.thisAccount = account;
                                            scope.thisAccount.cost_center_name_en = center.name_en;
                                            scope.accountSelected = true;
                                            if (scope.accountFinances.length === 0) {
                                                // no finances were defined,
                                                // most probably this is a new current account (financing defined for current year)
                                                // or a future account (no financing defined for current year)
                                                scope.accountSelected = true;
                                                scope.financesToShow = {
                                                    id: 'new',
                                                    account_id: account.id,
                                                    initial_amount: null,
                                                    current_amount_tax: null,
                                                    amount_requests_tax: null,
                                                    year: scope.currentYear,
                                                };
                                                scope.accountFinances = [
                                                    scope.financesToShow,
                                                    {
                                                        id: 'new',
                                                        account_id: account.id,
                                                        initial_amount: null,
                                                        year: scope.currentYear + 1,
                                                    }
                                                ];
                                            } else {
                                                // other possibilities:
                                                // 1. A 'normal account'
                                                // 2. Future account which has financing already defined
                                                // 3. An account that is now inactive (financing defined for past years, n-2)
                                                // 4. An account that is defined until past year n-1, but current year is yet to be defined
                                                let foundCurrentYear = false;
                                                let highestYear = 0;
                                                let indHighestYear;
                                                let indNextYear = -1;
                                                for (let ind in scope.accountFinances) {
                                                    if (scope.accountFinances[ind].year === scope.currentYear + 1) {
                                                        indNextYear = ind;
                                                    }
                                                    if (scope.accountFinances[ind].year > highestYear) {
                                                        highestYear = scope.accountFinances[ind].year;
                                                        indHighestYear = ind;
                                                    }
                                                    if (scope.accountFinances[ind].year === scope.currentYear) {
                                                        //by default we show the current year
                                                        foundCurrentYear = true;
                                                        scope.financesToShow = scope.accountFinances[ind];
                                                    }
                                                }
                                                if (!foundCurrentYear) {
                                                    if (highestYear === scope.currentYear - 1) {
                                                        scope.financesToShow = {
                                                            id: 'new',
                                                            account_id: account.id,
                                                            initial_amount: null,
                                                            current_amount_tax: null,
                                                            amount_requests_tax: null,
                                                            year: scope.currentYear,
                                                        }
                                                        scope.accountFinances.push(scope.financesToShow);
                                                        scope.accountFinances.push({
                                                            id: 'new',
                                                            account_id: account.id,
                                                            initial_amount: null,
                                                            current_amount_tax: null,
                                                            amount_requests_tax: null,
                                                            year: scope.currentYear + 1,
                                                        });
                                                    } else if (highestYear < scope.currentYear - 1) {
                                                        scope.financesToShow = scope.accountFinances[indHighestYear];
                                                    } else if (indNextYear !== -1) {
                                                        scope.financesToShow = scope.accountFinances[indNextYear];
                                                        let addCurrentYear = {
                                                            id: 'new',
                                                            account_id: account.id,
                                                            initial_amount: null,
                                                            current_amount_tax: null,
                                                            amount_requests_tax: null,
                                                            year: scope.currentYear,
                                                        }
                                                        scope.accountFinances.push(addCurrentYear);
                                                    }
                                                } else {
                                                    // Adds next year if not defined
                                                    if (indNextYear === -1) {
                                                        scope.accountFinances.push(
                                                            {
                                                                id: 'new',
                                                                account_id: account.id,
                                                                initial_amount: null,
                                                                year: scope.currentYear + 1,
                                                            });
                                                    }
                                                }
                                            }
                                        } else {
                                            scope.accountSelected = false;
                                        }
                                    });
                            };

                            scope.processChange = function (finance, oldAmount) {
                                if (oldAmount === '') {
                                    oldAmount = 0;
                                }
                                oldAmount = parseFloat(oldAmount);
                                let newAmount = parseFloat(finance.initial_amount);
                                let difference = newAmount - oldAmount;
                                if (finance.current_amount === null) {
                                    finance.current_amount = 0;
                                }
                                if (finance.current_amount_tax === null) {
                                    finance.current_amount_tax = 0;
                                }
                                finance.current_amount = finance.current_amount + difference;
                                finance.current_amount_tax = finance.current_amount_tax + difference;
                            };

                            scope.submitDataChanges = function (ind, finances, account) {
                                var position = $mdPanel.newPanelPosition()
                                    .absolute()
                                    .center();
                                var emailDetailsCtrl = function (mdPanelRef) {
                                    var ctrl = this;
                                    ctrl.updateStatus = '';
                                    ctrl.messageType = 'message-updating';
                                    ctrl.hideMessage = true;

                                    this._mdPanelRef = mdPanelRef;

                                    ctrl.closePanel = function () {
                                        mdPanelRef.close();
                                    };
                                    ctrl.submitEmail = function (finances, account, emailData) {
                                        ctrl.updateStatus = "Updating...";
                                        ctrl.messageType = 'message-updating';
                                        ctrl.hideMessage = false;
                                        let data = {
                                            email: emailData,
                                            finances: finances,
                                        };
                                        ordersData.updateManagersAccountFinances(ctrl.user, finances.account_id, data)
                                            .then(function () {
                                                scope.getDataLists();
                                                ctrl.updateStatus = "Updated!";
                                                ctrl.messageType = 'message-success';
                                                ctrl.hideMessage = false;
                                                $timeout(function () {
                                                    scope.hideMessage[ind] = true;
                                                    ctrl.closePanel();
                                                }, 1500);
                                            },
                                            function (error) {
                                                scope.getDataLists();
                                                ctrl.updateStatus = "Error!";
                                                ctrl.messageType = 'message-error';
                                                console.log(error);
                                                $timeout(function () {
                                                    ctrl.hideMessage = true;
                                                }, 6000);
                                            },
                                            function () {
                                            });
                                    };

                                };
                                let subject = 'UCIBIO Internal Warehouse - Allocation of funds for the year ' + finances.year;
                                let body = 'Dear ' + account.responsible_name + ',\n\n';
                                body = body + 'For the year ' + finances.year
                                            + ' your internal warehouse account was allocated with the following funds: '
                                            + parseFloat(finances.initial_amount).toFixed(2) + ' €.\n\n'
                                            + 'Best regards,\n'
                                            + 'Cecília Bonifácio';

                                var email = {
                                    subject: subject,
                                    body: body,
                                    recipients: account.responsible_email,
                                };

                                var config = {
                                    //attachTo: angular.element(document.body),
                                    controller: emailDetailsCtrl,
                                    controllerAs: 'ctrl',
                                    templateUrl: 'internal-orders/financial/email.details.html',
                                    locals: {
                                        user: scope.user,
                                        finances: finances,
                                        account: account,
                                        email: email,
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
                                    //onCloseSuccess:
                                };
                                scope.emailDetailsPanel = $mdPanel.open(config);



                                /*
                                // there's no delete, just create or update
                                scope.updateStatus[ind] = "Updating...";
                                scope.messageType[ind] = 'message-updating';
                                scope.hideMessage[ind] = false;
                                let accountID = scope.thisAccount.id;
                                ordersData.updateManagersAccountFinances(scope.user, accountID, scope.accountFinances)
                                    .then(function () {
                                        scope.getDataLists();
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
                                */

                            };

                            // initialize
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
                            function sorterData(a, b) {
                                if (scope.sortType === 'name_en') {
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
        .directive('orderFinancialStructure', orderFinancialStructure)
        .directive('orderFinancialMonitoring', orderFinancialMonitoring);

})();