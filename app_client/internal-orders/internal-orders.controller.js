(function () {
    var ordersCtrl = function ($scope, $rootScope, $timeout, $mdMedia, $mdPanel, $location, $anchorScroll,
        ordersData, authentication) {
        var vm = this;
        vm.multipleAccounts = false;
        vm.accountSelected = false;
        vm.showUserOrders = false;
        vm.showStock = false;
        vm.showFinancial = false;

        vm.toolbarData = { title: 'Make and manage orders from internal warehouse' };
        vm.isLoggedIn = authentication.isLoggedIn();
        vm.currentUser = authentication.currentUser();
        vm.inventory = [];
        vm.orders = [];
        vm.managersInventory = [];

        vm.socketConnected = false;


        // this controller is just to initialize interface
        if (vm.currentUser) {
            checkAdminMessages();
            ordersData.getUserMultipleAccounts(vm.currentUser.userID)
                .then(function (response) {
                    if (response !== null && response !== undefined) {
                        // for now we are assuming that there is only 1 account per user
                        vm.thisUserAccounts = response.data.result;
                        if (vm.thisUserAccounts.length === 1) {
                            vm.showUserOrders = true;
                            ordersData.getUserAccountInfo(
                                vm.currentUser.userID,
                                vm.thisUserAccounts[0].account_id)
                                .then(function (response) {
                                    if (response !== null && response !== undefined) {
                                        // for now we are assuming that there is only 1 account per user
                                        if (response.data.result.length === 1) {
                                            vm.accountSelected = true;
                                            vm.account = response.data.result;
                                        }
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                            ordersData.getInventory(vm.currentUser.userID, vm.thisUserAccounts[0].account_id)
                                .then(function (response) {
                                    if (response !== null && response !== undefined) {
                                        if (response.data.result.account_info !== undefined) {
                                            if (response.data.result.account_info.accountID !== undefined
                                                && response.data.result.account_info.accountID !== null) {
                                                vm.currentUser.accountID = response.data.result.account_info.accountID;
                                                vm.inventory = response.data.result.inventory;
                                            }
                                        }
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });

                            ordersData.getUserOrders(vm.currentUser.userID, vm.thisUserAccounts[0].account_id)
                                .then(function (response) {
                                    if (response !== null && response !== undefined) {
                                        vm.showUserOrders = true;
                                        vm.orders = response.data.result;
                                    }
                                })
                                .catch(function (err) {
                                    console.log(err);
                                });
                        } else if (vm.thisUserAccounts.length > 1) {
                            vm.showUserOrders = true; // show the order tab
                            vm.multipleAccounts = true;
                        }
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
            ordersData.getManagementPermissions(vm.currentUser.userID)
                .then(function (response) {
                    if (response !== null && response !== undefined) {
                        // for now we are assuming that there is only 1 account per user
                        if (response.data.result !== undefined) {
                            vm.showStock = response.data.result.stockAuthorization;
                            vm.showFinancial = response.data.result.financialAuthorization;
                            if (vm.showStock) {
                                getManagersData();
                            }
                            if (vm.showFinancial) {

                            }
                        }
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });

            function getManagersData() {
                ordersData.getManagersInventory(vm.currentUser.userID)
                    .then(function (response) {
                        if (response !== null && response !== undefined) {
                            vm.managersInventory = response.data.result.inventory;
                        }
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
                ordersData.getManagersOrders(vm.currentUser.userID)
                    .then(function (response) {
                        if (response !== null && response !== undefined) {
                            vm.managersOrders = response.data.result;
                        }
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
                ordersData.getAllUsersInfo(vm.currentUser.userID)
                    .then(function (response) {
                        if (response !== null && response !== undefined) {
                            vm.managersUsersOrders = response.data.result;
                        }
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            }
        }
        vm.makeAccountSelection = function() {
            ordersData.getUserAccountInfo(
                vm.currentUser.userID,
                vm.currentUser.accountID)
                .then(function (response) {
                    if (response !== null && response !== undefined) {
                        // for now we are assuming that there is only 1 account per user
                        if (response.data.result.length === 1) {
                            vm.account = response.data.result;
                        }
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
            ordersData.getInventory(vm.currentUser.userID, vm.currentUser.accountID)
                .then(function (response) {
                    if (response !== null && response !== undefined) {
                        if (response.data.result.account_info !== undefined) {
                            if (response.data.result.account_info.accountID !== undefined
                                && response.data.result.account_info.accountID !== null) {
                                vm.showUserOrders = true;
                                vm.currentUser.accountID = response.data.result.account_info.accountID;
                                vm.inventory = response.data.result.inventory;
                                vm.accountSelected = true;
                            }
                        }
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });

            ordersData.getUserOrders(vm.currentUser.userID, vm.currentUser.accountID)
                .then(function (response) {
                    if (response !== null && response !== undefined) {
                        vm.orders = response.data.result;
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
        }

        /* Admin messages */
        vm.deleteAdminMessages = function () {
            vm.adminMessage = false;
            vm.listAdminMessages = [];
        };
        function checkAdminMessages() {
            if (!vm.socketConnected) {
                var socket = io.connect(vm.currentUser.base_url);
                socket.on('message_all', function (history) {
                    if (history.length > 0) {
                        $rootScope.$apply(function () {
                            vm.adminMessage = true;
                            vm.listAdminMessages = history;
                        });
                    } else {
                        $rootScope.$apply(function () {
                            vm.adminMessage = false;
                            vm.listAdminMessages = history;
                        });
                    }
                });
                vm.socketConnected = true;
            }
        }
    };

    angular.module('managementApp')
        .controller('ordersCtrl', ordersCtrl);

})();