(function () {

    var inventoryManagement =
        ['ordersData', 'authentication', '$timeout', '$mdPanel',
            function (ordersData, authentication, $timeout, $mdPanel) {
                return {
                    restrict: 'E',
                    scope: {
                        user: '@',
                        inventory: '=',
                    },
                    templateUrl: 'internal-orders/stock/inventory.html',
                    link:
                        function (scope, element, attrs) {
                            scope.currentPage = 1;
                            scope.pageSize = 10;
                            scope.sortType = 'renderCategories';
                            scope.sortReverse = false;
                            scope.searchString = '';
                            //scope.selectOpened = false;
                            scope.newItem = {
                                status_id: 1,
                                visible: 1,
                            };
                            scope.forms = {
                                'stock': 0,
                            };
                            scope.inventoryChanges = {
                                create: [],
                                update: [],
                                delete: [],
                            }
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
                                ordersData.getManagersInventory(scope.user)
                                    .then(function (response) {
                                        if (response !== null && response !== undefined) {
                                            scope.inventory = response.data.result.inventory;
                                            scope.inventoryChanges = {
                                                create: [],
                                                update: [],
                                                delete: [],
                                            }
                                            scope.renderProducts('new');
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
                                        && scope.inventory[item].stock_id !== undefined) {
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
                            scope.sortColumn = function (colName, table) {
                                if (table === 'inventory') {
                                    if (colName === scope.sortType) {
                                        scope.sortReverse = !scope.sortReverse;
                                    } else {
                                        scope.sortType = colName;
                                        scope.sortReverse = false;
                                    }
                                    scope.renderProducts('new')
                                }
                            };
                            scope.checkIsDecimal = function (item) {
                                if (item.quantity_type !== undefined) {
                                    item.quantity_type_id = item.quantity_type.id;
                                    if(item.quantity_type.decimal === 1) {
                                        item.decimal = 1;
                                        item.quantity_in_requests_decimal = 0;
                                    } else {
                                        item.decimal = 0;
                                        item.quantity_in_requests = 0;
                                    }
                                }
                            }
                            scope.removeInventory = function (items, itemID, brand, reference) {
                                let result = confirm('Are you sure you want to remove this item?\n\n'
                                                    +'Note 1: This will only be effetive after selecting "Submit Changes".\n'
                                                    + 'Note 2: This won\'t affect previous orders.\n');
                                if (result) {
                                    for (let el in items) {
                                        if (items[el].stock_id !== 'new') {
                                            if (items[el].id === itemID) {
                                                scope.inventoryChanges.delete.push(items[el]);
                                                items.splice(el, 1);
                                                break;
                                            }
                                        } else {
                                            if (items[el].brand === brand
                                                    && items[el].reference === reference) {
                                                items.splice(el, 1);
                                                break;
                                            }
                                        }
                                    }
                                    scope.renderProducts('new');
                                }
                            };
                            scope.addToInventory = function (item) {
                                item.stock_id = 'new';
                                let newItem = Object.assign({}, item);
                                scope.inventory.push(newItem);
                                scope.renderProducts('new');
                                scope.newItem = {
                                    status_id: 1,
                                    visible: 1,
                                };
                            };
                            scope.processChange = function (item, field) {
                                if (item.stock_id !== 'new') {
                                    let found = false;
                                    let indFound = null;
                                    for (let el in scope.inventoryChanges.update) {
                                        if (scope.inventoryChanges.update[el].stock_id === item.stock_id) {
                                            found = true;
                                            indFound = el;
                                            break;
                                        }
                                    }
                                    if (field === 'money') {
                                        // give cues for updating history of item value
                                        item.changedMoney = true;
                                    }
                                    if (found) {
                                        scope.inventoryChanges.update[indFound] = item;
                                    } else {
                                        scope.inventoryChanges.update.push(item);
                                    }
                                }
                            };
                            scope.submitStockChanges = function (ind) {
                                scope.updateStatus[ind] = "Updating...";
                                scope.messageType[ind] = 'message-updating';
                                scope.hideMessage[ind] = false;
                                // first, check if there is new data
                                // this is done here in case user changes new data after adding
                                for (let el in scope.inventory) {
                                    if (scope.inventory[el].stock_id === 'new') {
                                        scope.inventoryChanges.create.push(scope.inventory[el]);
                                    }
                                }
                                ordersData.updateManagersInventory(scope.user, scope.inventoryChanges)
                                    .then(function () {
                                        ordersData.getManagersInventory(scope.user)
                                            .then(function (response) {
                                                if (response !== null && response !== undefined) {
                                                    scope.inventory = response.data.result.inventory;
                                                    scope.inventoryChanges = {
                                                        create: [],
                                                        update: [],
                                                        delete: [],
                                                    }
                                                    scope.renderProducts('new');
                                                }
                                                if (ind > -1) {
                                                    scope.updateStatus[ind] = "Inventory updated!";
                                                    scope.messageType[ind] = 'message-success';
                                                    scope.hideMessage[ind] = false;
                                                    $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                                }
                                            })
                                            .catch(function (err) {
                                                scope.updateStatus[ind] = "Error after inventory change!";
                                                scope.messageType[ind] = 'message-error';
                                                console.log(err);
                                            });
                                    },
                                        function () {
                                            scope.updateStatus[ind] = "Error!";
                                            scope.messageType[ind] = 'message-error';
                                        },
                                        function () { }
                                    );
                            };

                            // to initialize inventory
                            scope.renderProducts('new');
                            getDataLists();

                            function getDataLists() {
                                ordersData.itemCategories()
                                    .then(function (response) {
                                        if (response !== null && response !== undefined) {
                                            scope.itemCategories = response.data.result;
                                        }
                                    })
                                ordersData.unitTypes()
                                    .then(function (response) {
                                        if (response !== null && response !== undefined) {
                                            scope.unitTypes = response.data.result;
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
                            function sorterInventory(a, b) {
                                if (scope.sortType === 'renderCategories'
                                    || scope.sortType === 'name_en'
                                    || scope.sortType === 'brand') {
                                    if (scope.sortReverse) {
                                        return -(a[scope.sortType] ? a[scope.sortType] : '')
                                            .localeCompare(b[scope.sortType] ? b[scope.sortType] : '');
                                    } else {
                                        return (a[scope.sortType] ? a[scope.sortType] : '')
                                            .localeCompare(b[scope.sortType] ? b[scope.sortType] : '');
                                    }
                                } else if (scope.sortType === 'current_unit_price') {
                                    if (scope.sortReverse) {
                                        return -(a[scope.sortType] - b[scope.sortType]);
                                    } else {
                                        return a[scope.sortType] - b[scope.sortType];
                                    }
                                }
                                return 0;
                            }
                        }
                };
            }];


    // TODO: correct table sorting!
    var ordersManagement =
        ['ordersData', 'authentication', '$timeout', '$mdPanel',
            function (ordersData, authentication, $timeout, $mdPanel) {
                return {
                    restrict: 'E',
                    scope: {
                        user: '@',
                        orders: '=',
                    },
                    templateUrl: 'internal-orders/stock/orders-list.html',
                    link:
                        function (scope, element, attrs) {
                            scope.currentPage = 1;
                            scope.pageSize = 10;
                            scope.sortType = 'datetime';
                            scope.sortReverse = false;
                            scope.searchString = '';

                            scope.reloadOrders = function () {
                                ordersData.getManagersOrders(scope.user)
                                    .then(function (response) {
                                        if (response !== null && response !== undefined) {
                                            scope.orders = response.data.result;
                                            scope.renderOrders('new');
                                        }
                                    })
                                    .catch(function (err) {
                                        console.log(err);
                                    });

                            };
                            scope.renderOrders = function (str) {
                                if (str === 'new') {
                                    scope.currentPage = 1;
                                }
                                scope.searchResults = [];
                                for (let item in scope.orders) {
                                    // item here refers to the item in the global orders list
                                    // not to the specific items in each order
                                    scope.orders[item].list_id = item;
                                    for (let i in scope.orders[item].order_items) {
                                        scope.orders[item].order_items[i].this_delivery = 0;
                                        scope.orders[item].order_items[i].this_delivery_decimal = 0;
                                        if (scope.orders[item].order_items[i].decimal === 0) {
                                            scope.orders[item].order_items[i].original_quantity =
                                                    scope.orders[item].order_items[i].quantity;
                                            scope.orders[item].order_items[i].unit_price =
                                                (scope.orders[item].order_items[i].cost * 1.0) /
                                                (scope.orders[item].order_items[i].quantity * 1.0)
                                                .toFixed(2);
                                            scope.orders[item].order_items[i].unit_price_tax =
                                                (scope.orders[item].order_items[i].cost_tax * 1.0) /
                                                (scope.orders[item].order_items[i].quantity * 1.0)
                                                .toFixed(2);
                                        } else {
                                            scope.orders[item].order_items[i].original_quantity_decimal =
                                                    scope.orders[item].order_items[i].quantity_decimal;
                                            scope.orders[item].order_items[i].unit_price =
                                                (scope.orders[item].order_items[i].cost * 1.0) /
                                                (scope.orders[item].order_items[i].quantity_decimal * 1.0)
                                                .toFixed(2);
                                            scope.orders[item].order_items[i].unit_price_tax =
                                                (scope.orders[item].order_items[i].cost_tax * 1.0) /
                                                (scope.orders[item].order_items[i].quantity_decimal * 1.0)
                                                .toFixed(2);
                                        }
                                    }

                                    if (scope.orders[item].last_status.order_status_id === 1) {
                                        scope.orders[item].orderPending = true;
                                        scope.orders[item].approved = undefined;
                                        scope.orders[item].partiallyDelivered = undefined;
                                        scope.orders[item].orderNotClosed = true;
                                    } else if (scope.orders[item].last_status.order_status_id === 2) {
                                        scope.orders[item].orderPending = false;
                                        scope.orders[item].approved = true;
                                        scope.orders[item].partiallyDelivered = undefined;
                                        scope.orders[item].orderNotClosed = true;
                                    } else if (scope.orders[item].last_status.order_status_id === 3) {
                                        scope.orders[item].orderPending = false;
                                        scope.orders[item].approved = true;
                                        scope.orders[item].partiallyDelivered = false;
                                        scope.orders[item].orderNotClosed = false;
                                    } else if (scope.orders[item].last_status.order_status_id === 5) {
                                        scope.orders[item].orderPending = false;
                                        scope.orders[item].approved = true;
                                        scope.orders[item].partiallyDelivered = true;
                                        scope.orders[item].orderNotClosed = true;
                                    } else {
                                        scope.orders[item].orderPending = false;
                                        scope.orders[item].approved = false;
                                        scope.orders[item].partiallyDelivered = undefined;
                                        scope.orders[item].orderNotClosed = undefined;
                                    }
                                    var toInclude = 0;
                                    var toIncludeDueName = 0;
                                    var toIncludeDueCostCenter = 0;
                                    var toIncludeDueAccount = 0;
                                    if (scope.searchString !== '') {
                                        if (nameMatching(scope.orders[item]['colloquial_name'], scope.searchString) !== null) {
                                            toIncludeDueName = 1;
                                        }
                                        if (nameMatching(scope.orders[item]['cost_center_name_en'], scope.searchString) !== null) {
                                            toIncludeDueCostCenter = 1;
                                        }
                                        if (nameMatching(scope.orders[item]['account_name_en'], scope.searchString) !== null) {
                                            toIncludeDueAccount = 1;
                                        }
                                    } else {
                                        toInclude = 1;
                                    }
                                    if (toIncludeDueName === 1
                                            || toIncludeDueCostCenter === 1
                                            || toIncludeDueAccount === 1) {
                                        toInclude = 1;
                                    }
                                    if (toInclude === 1) {
                                        scope.searchResults.push(scope.orders[item]);
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
                                scope.searchResults = scope.searchResults.sort(sorterOrders);
                                scope.shownOrders = [];
                                for (let item = (scope.currentPage - 1) * scope.pageSize;
                                        item < scope.currentPage * scope.pageSize && item < scope.totalFromSearch;
                                        item++) {
                                    scope.shownOrders.push(scope.searchResults[item]);
                                }
                                var numberCards = scope.orders.length;
                                scope.updateStatus = [];
                                scope.messageType = [];
                                scope.hideMessage = [];
                                for (var i = 0; i < numberCards; i++) {
                                    scope.updateStatus.push('');
                                    scope.messageType.push('message-updating');
                                    scope.hideMessage.push(true);
                                }

                            };
                            scope.showDetailsOrder = function (order) {
                                order.itemsPartialDelivery = [];
                                var position = $mdPanel.newPanelPosition()
                                    .absolute()
                                    .center();
                                var orderManagerDetailsCtrl = function (mdPanelRef) {
                                    var ctrl = this;
                                    this._mdPanelRef = mdPanelRef;
                                    ctrl.forms = {
                                        'orderChange': 0,
                                        'orderChange2': 1,
                                    };
                                    let numberCards = Object.keys(ctrl.forms).length; // the number of cards with "Update" in each tab
                                    ctrl.updateStatus = [];
                                    ctrl.messageType = [];
                                    ctrl.hideMessage = [];
                                    for (var i = 0; i < numberCards; i++) {
                                        ctrl.updateStatus.push('');
                                        ctrl.messageType.push('message-updating');
                                        ctrl.hideMessage.push(true);
                                    }

                                    ctrl.closePanel = function () {
                                        mdPanelRef.close();
                                    };

                                    ctrl.processChange = function (item, thisOrder) {
                                        item.changed_by_manager = 1;
                                        if (item.decimal === 0) {
                                            item.cost = (item.unit_price * item.quantity).toFixed(2);
                                            item.cost_tax = (item.unit_price_tax * item.quantity).toFixed(2);
                                        } else {
                                            item.cost = (item.unit_price * item.quantity_decimal).toFixed(2);
                                            item.cost_tax = (item.unit_price_tax * item.quantity_decimal).toFixed(2);
                                        }
                                        let totalCost = 0, totalCostTax = 0;
                                        for (let ind in order.order_items) {
                                            totalCost = totalCost + parseFloat(thisOrder.order_items[ind].cost);
                                            totalCostTax = totalCostTax + parseFloat(thisOrder.order_items[ind].cost_tax);
                                        }
                                        let difference, differenceTax;
                                        difference = totalCost - parseFloat(thisOrder.total_cost);
                                        differenceTax = totalCostTax - parseFloat(thisOrder.total_cost_tax);
                                        thisOrder.order_finances.amount_requests = parseFloat((thisOrder.order_finances.amount_requests + difference).toFixed(2));
                                        thisOrder.order_finances.amount_requests_tax = parseFloat((thisOrder.order_finances.amount_requests_tax + differenceTax).toFixed(2));
                                        thisOrder.total_cost = totalCost;
                                        thisOrder.total_cost_tax = totalCostTax;


                                    };

                                    ctrl.processAmountDelivered = function (item, thisOrder) {
                                        let itemFound = false;
                                        for (let ind in thisOrder.itemsPartialDelivery) {
                                            if (item.id === thisOrder.itemsPartialDelivery[ind].id) {
                                                itemFound = true;
                                                thisOrder.itemsPartialDelivery[ind] = item
                                            }
                                        }
                                        if (!itemFound) {
                                            thisOrder.itemsPartialDelivery.push(item);
                                        }
                                    };

                                    ctrl.submitOrderChanges = function (ind) {
                                        ctrl.updateStatus[ind] = "Updating order details.";
                                        ctrl.messageType[ind] = 'message-updating';
                                        ctrl.hideMessage[ind] = false;
                                        ordersData.updateManagersOrder(scope.user, ctrl.order.id, ctrl.order)
                                            .then(function () {
                                                ordersData.getManagersOrders(scope.user)
                                                    .then(function (response) {
                                                        if (response !== null && response !== undefined) {
                                                            scope.orders = response.data.result;
                                                            scope.renderOrders('new');
                                                        }
                                                    })
                                                    .catch(function (err) {
                                                        console.log(err);
                                                    });
                                                if (ind > -1) {
                                                    ctrl.updateStatus[ind] = "Changing order was successful.";
                                                    ctrl.messageType[ind] = 'message-success';
                                                    ctrl.hideMessage[ind] = false;
                                                    $timeout(function () { ctrl.hideMessage[ind] = true; }, 1500);
                                                }
                                            }, function() {

                                            })
                                            .catch(function (err) {
                                                ctrl.updateStatus[ind] = "Error!";
                                                ctrl.messageType[ind] = 'message-error';
                                                console.log(err);
                                            });
                                    };

                                    ctrl.updatePartialDelivery = function (ind) {
                                        for (let indOrder in ctrl.order.itemsPartialDelivery) {
                                            if (order.itemsPartialDelivery[indOrder].decimal === 0) {
                                                if (parseInt(ctrl.order.itemsPartialDelivery[indOrder].delivered_quantity, 10)
                                                    + parseInt(ctrl.order.itemsPartialDelivery[indOrder].this_delivery, 10)
                                                    > parseInt(ctrl.order.itemsPartialDelivery[indOrder].quantity, 10)) {
                                                    alert('Revise delivery amounts!');
                                                    return;
                                                } else {
                                                    ctrl.order.itemsPartialDelivery[indOrder].delivered_quantity = parseInt(ctrl.order.itemsPartialDelivery[indOrder].delivered_quantity, 10)
                                                            + parseInt(ctrl.order.itemsPartialDelivery[indOrder].this_delivery, 10);
                                                }

                                            } else {
                                                if (parseFloat(ctrl.order.itemsPartialDelivery[indOrder].delivered_quantity_decimal)
                                                    + parseFloat(ctrl.order.itemsPartialDelivery[indOrder].this_delivery_decimal)
                                                    > parseFloat(ctrl.order.itemsPartialDelivery[indOrder].quantity_decimal)) {
                                                    alert('Revise delivery amounts!');
                                                    return;
                                                } else {
                                                    ctrl.order.itemsPartialDelivery[indOrder].delivered_quantity_decimal = parseFloat(ctrl.order.itemsPartialDelivery[indOrder].delivered_quantity_decimal)
                                                            + parseFloat(ctrl.order.itemsPartialDelivery[indOrder].this_delivery_decimal);
                                                }
                                            }
                                        }
                                        if (ctrl.order.itemsPartialDelivery.length > 0) {
                                            ctrl.updateStatus[ind] = "Updating partial delivery information.";
                                            ctrl.messageType[ind] = 'message-updating';
                                            ctrl.hideMessage[ind] = false;
                                            ordersData.partialDeliveryManagersOrder(scope.user, ctrl.order.id, ctrl.order)
                                                .then(function () {
                                                    ordersData.getManagersOrders(scope.user)
                                                        .then(function (response) {
                                                            if (response !== null && response !== undefined) {
                                                                scope.orders = response.data.result;
                                                                scope.renderOrders('new');
                                                            }
                                                        })
                                                        .catch(function (err) {
                                                            console.log(err);
                                                        });
                                                    if (ind > -1) {
                                                        ctrl.updateStatus[ind] = "Changing partial delivery information was successful.";
                                                        ctrl.messageType[ind] = 'message-success';
                                                        ctrl.hideMessage[ind] = false;
                                                        $timeout(function () { ctrl.hideMessage[ind] = true; }, 1500);
                                                    }
                                                }, function () {

                                                })
                                                .catch(function (err) {
                                                    ctrl.updateStatus[ind] = "Error!";
                                                    ctrl.messageType[ind] = 'message-error';
                                                    console.log(err);
                                                });

                                        }

                                    };
                                };
                                var config = {
                                    //attachTo: angular.element(document.body),
                                    controller: orderManagerDetailsCtrl,
                                    controllerAs: 'ctrl',
                                    templateUrl: 'internal-orders/stock/orderDetails.html',
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
                            scope.sortColumn = function (colName, table) {
                                if (table === 'orders') {
                                    if (colName === scope.sortType) {
                                        scope.sortReverse = !scope.sortReverse;
                                    } else {
                                        scope.sortType = colName;
                                        scope.sortReverse = false;
                                    }
                                    scope.renderOrders('new')
                                }
                            };

                            scope.approveOrder = function(ordNum, order) {
                                let ind = order.list_id;
                                scope.updateStatus[ind] = "Approving order.";
                                scope.messageType[ind] = 'message-updating';
                                scope.hideMessage[ind] = false;

                                ordersData.approveManagersOrder(scope.user, order.id, order)
                                    .then(function () {
                                        ordersData.getManagersOrders(scope.user)
                                            .then(function (response) {
                                                if (response !== null && response !== undefined) {
                                                    scope.orders = response.data.result;
                                                    scope.renderOrders('new');
                                                }
                                            })
                                            .catch(function (err) {
                                                scope.updateStatus[ind] = "Error getting order list!";
                                                scope.messageType[ind] = 'message-error';
                                                scope.hideMessage[ind] = false;
                                                $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                                console.log(err);
                                            });
                                            scope.updateStatus[ind] = "Approval successful.";
                                            scope.messageType[ind] = 'message-success';
                                            scope.hideMessage[ind] = false;
                                            $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                    })
                                    .catch(function (err) {
                                        scope.updateStatus[ind] = "Error!";
                                        scope.messageType[ind] = 'message-error';
                                        scope.hideMessage[ind] = false;
                                        $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                        console.log(err);
                                    });

                            };
                            scope.rejectOrder = function (ordNum, order) {
                                let ind = order.list_id;
                                scope.updateStatus[ind] = "Rejecting...";
                                scope.messageType[ind] = 'message-updating';
                                scope.hideMessage[ind] = false;

                                ordersData.rejectManagersOrder(scope.user, order.id, order)
                                    .then(function () {
                                        ordersData.getManagersOrders(scope.user)
                                            .then(function (response) {
                                                if (response !== null && response !== undefined) {
                                                    scope.orders = response.data.result;
                                                    scope.renderOrders('new');
                                                }
                                            })
                                            .catch(function (err) {
                                                scope.updateStatus[ind] = "Error getting order list!";
                                                scope.messageType[ind] = 'message-error';
                                                scope.hideMessage[ind] = false;
                                                $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                                console.log(err);
                                            });
                                        scope.updateStatus[ind] = "Order rejection successful.";
                                        scope.messageType[ind] = 'message-success';
                                        scope.hideMessage[ind] = false;
                                        $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                    })
                                    .catch(function (err) {
                                        scope.updateStatus[ind] = "Error!";
                                        scope.messageType[ind] = 'message-error';
                                        scope.hideMessage[ind] = false;
                                        $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                        console.log(err);
                                    });

                            };
                            scope.closeOrder = function (ordNum, order) {
                                for (let indItem in order.order_items) {
                                    if (order.order_items[indItem].decimal === 0) {
                                        if (parseInt(order.order_items[indItem].delivered_quantity, 10) <
                                            parseInt(order.order_items[indItem].quantity, 10)) {
                                            alert('Cannot close order while there are items with delivery pending!');
                                            return;
                                        }

                                    } else {
                                        if (parseFloat(order.order_items[indItem].delivered_quantity_decimal) >
                                            parseFloat(order.order_items[indItem].quantity_decimal)) {
                                            alert('Cannot close order while there are items with delivery pending!');
                                            return;
                                        }
                                    }
                                }
                                let ind = order.list_id;
                                scope.updateStatus[ind] = "Updating...";
                                scope.messageType[ind] = 'message-updating';
                                scope.hideMessage[ind] = false;

                                ordersData.closeManagersOrder(scope.user, order.id, order)
                                    .then(function () {
                                        ordersData.getManagersOrders(scope.user)
                                            .then(function (response) {
                                                if (response !== null && response !== undefined) {
                                                    scope.orders = response.data.result;
                                                    scope.renderOrders('new');
                                                }
                                            })
                                            .catch(function (err) {
                                                scope.updateStatus[ind] = "Error getting order list!";
                                                scope.messageType[ind] = 'message-error';
                                                scope.hideMessage[ind] = false;
                                                $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                                console.log(err);
                                            });
                                        scope.updateStatus[ind] = "Closed order successfully.";
                                        scope.messageType[ind] = 'message-success';
                                        scope.hideMessage[ind] = false;
                                        $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                    })
                                    .catch(function (err) {
                                        scope.updateStatus[ind] = "Error!";
                                        scope.messageType[ind] = 'message-error';
                                        scope.hideMessage[ind] = false;
                                        $timeout(function () { scope.hideMessage[ind] = true; }, 1500);
                                        console.log(err);
                                    });

                            };


                            scope.renderOrders('new');

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
                            function sorterOrders(a, b) {
                                if (scope.sortType === 'id'
                                    || scope.sortType === 'total_cost'
                                    || scope.sortType === 'total_cost_tax') {
                                    if (scope.sortReverse) {
                                        return -(a[scope.sortType] - b[scope.sortType]);
                                    } else {
                                        return a[scope.sortType] - b[scope.sortType];
                                    }
                                } else if (scope.sortType === 'colloquial_name'
                                    || scope.sortType === 'account_name_en'
                                    || scope.sortType === 'cost_center_name_en'
                                    || scope.sortType === 'datetime') {
                                    if (scope.sortReverse) {
                                        return -(a[scope.sortType] ? a[scope.sortType] : '')
                                            .localeCompare(b[scope.sortType] ? b[scope.sortType] : '');
                                    } else {
                                        return (a[scope.sortType] ? a[scope.sortType] : '')
                                            .localeCompare(b[scope.sortType] ? b[scope.sortType] : '');
                                    }
                                } else if (scope.sortType === 'last_status') {
                                    if (scope.sortReverse) {
                                        return -(a[scope.sortType].name_en ? a[scope.sortType].name_en : '')
                                            .localeCompare(b[scope.sortType].name_en ? b[scope.sortType].name_en : '');
                                    } else {
                                        return (a[scope.sortType].name_en ? a[scope.sortType].name_en : '')
                                            .localeCompare(b[scope.sortType].name_en ? b[scope.sortType].name_en : '');
                                    }
                                }
                                return 0;
                            }
                        }
                };
            }];


    angular.module('managementApp')
        .directive('inventoryManagement', inventoryManagement)
        .directive('ordersManagement', ordersManagement);

})();