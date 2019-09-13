(function () {
    var ordersCtrl = function ($scope, $rootScope, $timeout, $mdMedia, $mdPanel, $location, $anchorScroll,
        ordersData, authentication) {
        var vm = this;
        vm.showUserOrders = false;
        vm.showStock = false;
        vm.showFinancial = false;

        vm.toolbarData = { title: 'Make and manage orders from internal warehouse' };
        vm.isLoggedIn = authentication.isLoggedIn();
        vm.currentUser = authentication.currentUser();
        vm.inventory = [];
        vm.managersInventory = [];
        // this controller is just to initialize interface
        if (vm.currentUser) {
            ordersData.getInventory(vm.currentUser.userID)
                .then(function (response) {
                    if (response !== null && response !== undefined) {
                        if (response.data.result.account_info !== undefined) {
                            if (response.data.result.account_info.accountID !== undefined
                                && response.data.result.account_info.accountID !== null) {
                                vm.showUserOrders = true;
                                vm.currentUser.accountID = response.data.result.account_info.accountID;
                                vm.inventory = response.data.result.inventory;
                            }
                        }
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });

            ordersData.getUserOrders(vm.currentUser.userID)
                .then(function (response) {
                    if (response !== null && response !== undefined) {
                        vm.orders = response.data.result;
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });

            ordersData.getUserAccountInfo(vm.currentUser.userID)
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
    };

    angular.module('managementApp')
        .controller('ordersCtrl', ordersCtrl);

})();