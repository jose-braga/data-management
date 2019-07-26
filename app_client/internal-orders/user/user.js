(function () {

    var internalOrderInventory =
        ['ordersData', 'authentication', '$timeout', '$mdPanel',
            function (ordersData, authentication, $timeout, $mdPanel) {
                return {
                    restrict: 'E',
                    scope: {
                        user: '@',
                        account: '@',
                        inventory: '=',
                        orders: '=',
                        finaccount: '=',
                    },
                    templateUrl: 'internal-orders/user/inventory.html',
                    link:
                    function (scope, element, attrs) {
                        scope.currentPage = 1;
                        scope.pageSize = 10;
                        scope.sortType = 'renderCategories';
                        scope.sortReverse = false;
                        scope.currentPageOrders = 1;
                        scope.pageSizeOrders = 10;
                        scope.sortTypeOrders = 'order_id';
                        scope.sortReverseOrders = false;
                        scope.searchString = '';
                        scope.foundFinances = false;
                        scope.currentFinancesNoTax = {};
                        scope.currentFinances = {};
                        scope.shoppingCart = [];
                        scope.shoppingCartTotal = 0;
                        scope.shoppingCartTotalNoTax = 0;
                        scope.forms = {
                            'orderCart': 0,
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
                        
                        scope.reloadInventory = function () {
                            ordersData.getInventory(scope.user)
                                .then(function (response) {
                                    if (response !== null && response !== undefined) {
                                        if (response.data.result.account_info.accountID !== undefined
                                            && response.data.result.account_info.accountID !== null) {
                                            scope.inventory = response.data.result.inventory;
                                            scope.renderProducts('new');
                                        }
                                    }
                                })
                                .catch(function (err) {
                                    scope.updateStatus[ind] = "Error! Order might have been submited but couldn't retrieve inventory.";
                                    console.log(err);
                                });

                        };
                        scope.reloadOrders = function () {
                            ordersData.getUserOrders(scope.user)
                                .then(function (response) {
                                    if (response !== null && response !== undefined) {
                                        scope.orders = response.data.result;
                                        scope.renderOrders('new');
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            ordersData.getUserAccountInfo(scope.user)
                                .then(function (response) {
                                    if (response !== null && response !== undefined) {
                                        // for now we are assuming that there is only 1 account per user
                                        if (response.data.result.length === 1) {
                                            scope.finaccount = response.data.result;
                                        }
                                        scope.renderFinances();
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });

                        };

                        scope.renderProducts = function (str) {
                            if (str === 'new') {
                                scope.currentPage = 1;
                            }
                            scope.searchResults = [];
                            for (let item in scope.inventory) {
                                var toInclude = 0;
                                var toIncludeDueName = 0;
                                var toIncludeDueBrand = 0;
                                var toIncludeDueReference = 0;
                                var toIncludeDueType = 0;
                                if (scope.searchString !== '') {
                                    if (nameMatching(scope.inventory[item]['name_en'], scope.searchString) !== null) {
                                        toIncludeDueName = 1;
                                    }
                                    if (nameMatching(scope.inventory[item]['brand'], scope.searchString) !== null) {
                                        toIncludeDueBrand = 1;
                                    }
                                    if (nameMatching(scope.inventory[item]['reference'], scope.searchString) !== null) {
                                        toIncludeDueReference = 1;
                                    }
                                    for (let el in scope.inventory[item].item_categories) {
                                        if (nameMatching(scope.inventory[item].item_categories[el].name_en,
                                            scope.searchString) !== null) {
                                            toIncludeDueType = 1;
                                            break;
                                        }
                                    }
                                    
                                } else {
                                    toIncludeDueName = 1;
                                    toIncludeDueBrand = 1;
                                    toIncludeDueReference = 1;
                                    toIncludeDueType = 1;
                                }
                                if (toIncludeDueName === 1 || toIncludeDueBrand === 1 
                                    || toIncludeDueReference === 1 || toIncludeDueType === 1) {
                                    toInclude = 1;
                                }
                                if (toInclude === 1 
                                        && scope.inventory[item].stock_id !== null
                                        && scope.inventory[item].stock_id !== undefined){
                                    scope.inventory[item].renderQuantity = scope.renderQuantities(scope.inventory[item]);
                                    scope.inventory[item].renderCategories = scope.renderCategories(scope.inventory[item].item_categories);
                                    scope.searchResults.push(scope.inventory[item]);
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
                            scope.searchResults = scope.searchResults.sort(sorterInventory);
                            scope.shownProducts = [];
                            for (let item = (scope.currentPage - 1) * scope.pageSize;
                                    item < scope.currentPage * scope.pageSize && item < scope.totalFromSearch;
                                    item++) {
                                scope.shownProducts.push(scope.searchResults[item]);
                            }

                        };
                        scope.renderOrders = function (str) {
                            if (str === 'new') {
                                scope.currentPageOrders = 1;
                            }
                            scope.totalFromSearchOrders = scope.orders.length;
                            scope.totalPagesOrders = Math.ceil(scope.totalFromSearchOrders / scope.pageSizeOrders);
                            scope.pagesOrders = [];
                            for (var num = 1; num <= scope.totalPagesOrders; num++) {
                                scope.pagesOrders.push(num);
                            }
                            // Sort searchResults according to defined order, before
                            // defining page contents
                            scope.orders = scope.orders.sort(sorterOrders);
                            scope.shownOrders = [];
                            for (let item = (scope.currentPageOrders - 1) * scope.pageSizeOrders;
                                    item < scope.currentPageOrders * scope.pageSizeOrders && item < scope.totalFromSearchOrders;
                                    item++) {
                                scope.shownOrders.push(scope.orders[item]);
                            }

                        };
                        scope.renderFinances = function () {
                            // assuming only 1 account per user
                            if (scope.finaccount !== undefined 
                                    && scope.finaccount !== null
                                    && scope.finaccount.length === 1) {
                                let finances = scope.finaccount[0].account_finances;
                                for (let el in finances) {
                                    if (finances[el].year === moment().year()) {
                                        scope.foundFinances = true;
                                        scope.currentFinances = finances[el];
                                    }
                                }
                            }
                        };
                        scope.sortColumn = function (colName, table) {
                            if (table === 'inventory') {
                                if (colName === scope.sortType) {
                                    scope.sortReverse = !scope.sortReverse;
                                } else {
                                    scope.sortType = colName;
                                    scope.sortReverse = false;
                                }
                                scope.renderProducts('new')
                            } else if (table === 'orders') {
                                if (colName === scope.sortTypeOrders) {
                                    scope.sortReverseOrders = !scope.sortReverseOrders;
                                } else {
                                    scope.sortTypeOrders = colName;
                                    scope.sortReverseOrders = false;
                                }
                                scope.renderOrders('new')
                            }                            
                        };
                        scope.renderCost = function (item, unit_price, tax, quantity) {
                            let cost = unit_price * (1.0 + tax/100.0) * quantity;
                            let cost_no_tax = unit_price * quantity;
                            let cost_truncated = cost.toFixed(2);
                            let cost_truncated_no_tax = cost_no_tax.toFixed(2);
                            item.cost_truncated = cost_truncated;
                            item.cost_truncated_no_tax = cost_truncated_no_tax;
                            return cost_truncated;
                        };
                        scope.renderTotalCost = function (cart) {
                            let total = 0;
                            let total_no_tax = 0;
                            for (let el in cart) {
                                if (cart[el].cost_truncated !== undefined
                                        && cart[el].cost_truncated !== null
                                        && !isNaN(cart[el].cost_truncated)) {
                                    total = total + Number(cart[el].cost_truncated);
                                }
                                if (cart[el].cost_truncated_no_tax !== undefined
                                    && cart[el].cost_truncated_no_tax !== null
                                    && !isNaN(cart[el].cost_truncated_no_tax)) {
                                    total_no_tax = total_no_tax + Number(cart[el].cost_truncated_no_tax);
                                }
                            }
                            scope.shoppingCartTotal = total.toFixed(2);
                            scope.shoppingCartTotalNoTax = total_no_tax.toFixed(2);
                            return scope.shoppingCartTotal;
                        };
                        scope.renderCategories = function (cat) {
                            let catString ='';
                            for (let el in cat) {
                                if (el < cat.length - 1) {
                                    catString = catString + cat[el].name_en + ', ';
                                } else {
                                    catString = catString + cat[el].name_en;
                                }
                            }
                            return catString;
                        };
                        scope.renderQuantities = function (item) {
                            let quantString = '';
                            let itemsAvailable;
                            if (item.decimal === 0) {
                                if (item.quantity_in_requests === null 
                                    || item.quantity_in_requests === undefined ) {
                                    item.quantity_in_requests = 0;
                                }
                                itemsAvailable = item.quantity_in_stock - item.quantity_in_requests;
                                item.itemsAvailable = itemsAvailable;
                                if (itemsAvailable > 1) {
                                    quantString = quantString 
                                            +  itemsAvailable
                                            + ' ' + item.unit_plural_en;
                                } else {
                                    quantString = quantString
                                        + itemsAvailable
                                        + ' ' + item.unit_singular_en;
                                }
                            } else {
                                if (item.quantity_in_requests_decimal === null
                                    || item.quantity_in_requests_decimal === undefined) {
                                    item.quantity_in_requests_decimal = 0;
                                }
                                itemsAvailable = item.quantity_in_stock_decimal - item.quantity_in_requests_decimal;
                                item.itemsAvailable_decimal = itemsAvailable;
                                if (itemsAvailable != 1) {
                                    quantString = quantString
                                        + itemsAvailable.toFixed(3)
                                        + ' ' + item.unit_plural_en;
                                } else {
                                    quantString = quantString
                                        + itemsAvailable.toFixed(3)
                                        + ' ' + item.unit_singular_en;
                                }
                            }                            
                            return quantString;
                        };
                        scope.removeFromCart = function (cart, num) {
                            cart.splice(num, 1);
                        };
                        scope.addToCart = function (item) {
                            let found = false;
                            for (let el in scope.shoppingCart) {
                                if (item.id === scope.shoppingCart[el].id) {
                                    found = true;
                                }
                            }
                            if (!found) {
                                item.amount_to_order = 0;
                                scope.shoppingCart.push(item);
                            }


                        };
                        scope.showDetailsOrder = function (order) {
                            var position = $mdPanel.newPanelPosition()
                                .absolute()
                                .center();
                            var orderDetailsCtrl = function (mdPanelRef) {
                                var ctrl = this;
                                this._mdPanelRef = mdPanelRef;

                                ctrl.closePanel = function () {
                                    mdPanelRef.close();
                                };
                            };
                            var config = {
                                //attachTo: angular.element(document.body),
                                controller: orderDetailsCtrl,
                                controllerAs: 'ctrl',
                                templateUrl: 'internal-orders/user/orderDetails.html',
                                locals: {
                                    order: order,
                                },
                                hasBackdrop: true,
                                //panelClass: 'publication-details',
                                position: position,
                                disableParentScroll: true,
                                trapFocus: true,
                                zIndex: 150,
                                clickOutsideToClose: true,
                                escapeToClose: true,
                                focusOnOpen: true
                            };
                            scope.orderPanel = $mdPanel.open(config);
                        };

                        // TODO: CHECK IF ITEM IS DELETED FROM STOCK!!!!!!!!
                        scope.submitOrder = function (ind) {
                            function checkInventoryLevels () {
                                let inventoryLevels = true;
                                for (let elCart in scope.shoppingCart) {
                                    for (let elInv in scope.inventory) {
                                        if (scope.shoppingCart[elCart].id ===
                                            scope.inventory[elInv].id) {
                                            if (scope.shoppingCart[elCart].decimal === 0) {
                                                if (Number(scope.shoppingCart[elCart].amount_to_order) >
                                                    scope.inventory[elInv].quantity_in_stock
                                                    - scope.inventory[elInv].quantity_in_requests) {
                                                    inventoryLevels = false;
                                                    scope.shoppingCart[elCart].itemsAvailable =
                                                        scope.inventory[elInv].quantity_in_stock
                                                        - scope.inventory[elInv].quantity_in_requests;
                                                    scope.shoppingCart[elCart].renderQuantity = scope.renderQuantities(scope.inventory[elInv]);
                                                    break;
                                                }
                                            } else {
                                                if (Number(scope.shoppingCart[elCart].amount_to_order) >
                                                    scope.inventory[elInv].quantity_in_stock_decimal
                                                    - scope.inventory[elInv].quantity_in_requests_decimal) {
                                                    inventoryLevels = false;
                                                    scope.shoppingCart[elCart].itemsAvailable_decimal =
                                                        scope.inventory[elInv].quantity_in_stock_decimal
                                                        - scope.inventory[elInv].quantity_in_requests_decimal;
                                                    scope.shoppingCart[elCart].renderQuantity = scope.renderQuantities(scope.inventory[elInv]);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                return inventoryLevels;                                
                            }
                            function redrawScreen() {
                                ordersData.getInventory(scope.user)
                                    .then(function (response) {
                                        if (response !== null && response !== undefined) {
                                            if (response.data.result.account_info.accountID !== undefined
                                                && response.data.result.account_info.accountID !== null) {
                                                scope.inventory = response.data.result.inventory;
                                                scope.renderProducts('new');
                                            }
                                        }
                                        ordersData.getUserOrders(scope.user)
                                            .then(function (response) {
                                                if (response !== null && response !== undefined) {
                                                    scope.orders = response.data.result;
                                                    scope.renderOrders('new');
                                                }
                                            })
                                            .catch(function (err) {
                                                console.log(err);
                                            });
                                        ordersData.getUserAccountInfo(scope.user)
                                            .then(function (response) {
                                                if (response !== null && response !== undefined) {
                                                    // for now we are assuming that there is only 1 account per user
                                                    if (response.data.result.length === 1) {
                                                        scope.finaccount = response.data.result;
                                                    }
                                                    scope.renderFinances();
                                                }
                                            })
                                            .catch(function (err) {
                                                console.log(err);
                                            });
                                        if (ind > -1) {
                                            scope.updateStatus[ind] = "Order made succesfully! Please wait for confirmation email.";
                                            scope.messageType[ind] = 'message-success';
                                            scope.hideMessage[ind] = false;
                                            $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                        }
                                    })
                                    .catch(function (err) {
                                        scope.updateStatus[ind] = "Error! Order might have been submited but couldn't retrieve inventory.";
                                        console.log(err);
                                    });

                            }
                            function performOrder (data) {
                                ordersData.createOrder(scope.user, data)
                                    .then(function () {
                                        scope.shoppingCart = [];
                                        scope.shoppingCartTotal = 0;
                                        redrawScreen();
                                        
                                    },
                                        function () {
                                            scope.updateStatus[ind] = "Error!";
                                            scope.messageType[ind] = 'message-error';
                                        },
                                        function () { }
                                    );

                            }
                            if (scope.shoppingCart.length > 0 
                                    && scope.foundFinances) {
                                scope.updateStatus[ind] = "Checking current inventory levels.";
                                scope.messageType[ind] = 'message-updating';
                                scope.hideMessage[ind] = false;
                                
                                ordersData.getInventory(scope.user)
                                    .then(function (response) {
                                        if (response !== null && response !== undefined) {
                                            if (response.data.result.account_info.accountID !== undefined
                                                && response.data.result.account_info.accountID !== null) {
                                                scope.inventory = response.data.result.inventory;
                                                scope.renderProducts('new');
                                                // is there an alternative to this nested for?
                                                let inventoryLevels = checkInventoryLevels();
                                                
                                                if (inventoryLevels) {
                                                    scope.updateStatus[ind] = "Inventory levels OK! Proceeding with order...";
                                                    scope.messageType[ind] = 'message-updating';
                                                    scope.hideMessage[ind] = false;
                                                    let data = {
                                                        totalCost: scope.shoppingCartTotal,
                                                        totalCostNoTax: scope.shoppingCartTotalNoTax,
                                                        cart: scope.shoppingCart,
                                                        currentFinances: scope.currentFinances,
                                                    };
                                                    performOrder(data);
                                                }
                                                else {
                                                    scope.updateStatus[ind] = "Error! Requesting more than current inventory levels. Check updated inventory levels.";
                                                    scope.messageType[ind] = 'message-error';
                                                    scope.hideMessage[ind] = false;
                                                    $timeout(function () { scope.hideMessage[ind] = true; }, 10000);
                                                }                                                    
                                            }
                                        }
                                    })
                                    .catch(function (err) {
                                        scope.updateStatus[ind] = "Error! Couldn't retrieve inventory.";
                                        scope.messageType[ind] = 'message-error';
                                        scope.hideMessage[ind] = false;
                                        $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                        console.log(err);
                                    });
                            } else if (!scope.foundFinances) {
                                scope.updateStatus[ind] = "Error! Solve 'financial information not found' problem.";
                                scope.messageType[ind] = 'message-error';
                                scope.hideMessage[ind] = false;
                                $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                            }
                        };

                        // to initialize inventory 
                        scope.renderProducts('new');
                        scope.renderOrders('new');
                        scope.renderFinances();


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
                        function sorterInventory(a, b) {
                            if (scope.sortType === 'renderCategories' 
                                || scope.sortType === 'name_en'
                                || scope.sortType === 'brand'){
                                if (scope.sortReverse) {
                                    return -(a[scope.sortType] ? a[scope.sortType] : '')
                                        .localeCompare(b[scope.sortType] ? b[scope.sortType] : '');
                                } else {
                                    return (a[scope.sortType] ? a[scope.sortType] : '')
                                        .localeCompare(b[scope.sortType] ? b[scope.sortType] : '');
                                }
                            } else if (scope.sortType === 'current_unit_price'
                                    || scope.sortType === 'tax') {
                                if (scope.sortReverse) {
                                    return -(a[scope.sortType] - b[scope.sortType]);
                                } else {
                                    return a[scope.sortType] - b[scope.sortType];
                                }
                            }
                            return 0;
                        }
                        function sorterOrders(a, b) {
                            if (scope.sortTypeOrders === 'order_id'
                                    || scope.sortTypeOrders === 'total_cost'
                                    || scope.sortTypeOrders === 'total_cost_tax') {
                                if (scope.sortReverseOrders) {
                                    return -(a[scope.sortTypeOrders] - b[scope.sortTypeOrders]);
                                } else {
                                    return a[scope.sortTypeOrders] - b[scope.sortTypeOrders];
                                }
                            } else if (scope.sortTypeOrders === 'user_ordered_name'
                                    || scope.sortTypeOrders === 'datetime') {
                                if (scope.sortReverseOrders) {
                                    return -(a[scope.sortTypeOrders] ? a[scope.sortTypeOrders] : '')
                                        .localeCompare(b[scope.sortTypeOrders] ? b[scope.sortTypeOrders] : '');
                                } else {
                                    return (a[scope.sortTypeOrders] ? a[scope.sortTypeOrders] : '')
                                        .localeCompare(b[scope.sortTypeOrders] ? b[scope.sortTypeOrders] : '');
                                }
                            } else if (scope.sortTypeOrders === 'last_status') {
                                if (scope.sortReverseOrders) {
                                    return -(a[scope.sortTypeOrders].name_en ? a[scope.sortTypeOrders].name_en : '')
                                        .localeCompare(b[scope.sortTypeOrders].name_en ? b[scope.sortTypeOrders].name_en : '');
                                } else {
                                    return (a[scope.sortTypeOrders].name_en ? a[scope.sortTypeOrders].name_en : '')
                                        .localeCompare(b[scope.sortTypeOrders].name_en ? b[scope.sortTypeOrders].name_en : '');
                                }
                            }
                            return 0;
                        }
                    }
                };
            }];


    angular.module('managementApp')
        .directive('internalOrderInventory', internalOrderInventory);

})();