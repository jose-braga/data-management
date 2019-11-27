(function () {
    var ordersData = function ($http, authentication) {
        //var currentUser = authentication.currentUser();

        // to get data for select elements
        var itemCategories = function () {
            return $http.get('api/list/item-categories');
        };
        var unitTypes = function () {
            return $http.get('api/list/item-unit-types');
        };
        var orderStatuses = function () {
            return $http.get('api/list/order-statuses');
        };
        var stockStatuses = function () {
            return $http.get('api/list/stock-statuses');
        };
        var orderCostCenters = function () {
            return $http.get('api/list/order-cost-centers');
        };
        var orderAccounts = function () {
            return $http.get('api/list/order-accounts');
        };
        var orderAccountRoles = function () {
            return $http.get('api/list/order-account-roles');
        };

        var getManagementPermissions = function (currentUser) {
            return $http.get('api/users/' + currentUser + '/management-permissions',
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var searchUsersSimple = function (currentUser, name) {
            return $http.get('api/stock-managers/' + currentUser + '/users-search?name=' + name,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };
        var getAllUsersInfo = function (currentUser) {
            return $http.get('api/stock-managers/' + currentUser + '/users-info',
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };
        var updateManagersUsers = function (currentUser, data) {
            return $http.put('api/stock-managers/' + currentUser + '/users-info', data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var updateManagersFinancialStructure = function (currentUser, data) {
            return $http.put('api/financial-managers/' + currentUser + '/financial-structure', data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var getManagersAccountFinances = function (currentUser, accountID) {
            return $http.get('api/financial-managers/' + currentUser + '/account-info/' + accountID,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var updateManagersAccountFinances = function (currentUser, accountID, data) {
            return $http.put('api/financial-managers/' + currentUser + '/account-info/' + accountID,
                data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var getInventory = function (currentUser, accountID) {
            return $http.get('api/users/' + currentUser + '/inventory/' + accountID,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var getManagersInventory = function (currentUser) {
            return $http.get('api/stock-managers/' + currentUser + '/inventory',
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var getManagersOrders = function (currentUser) {
            return $http.get('api/stock-managers/' + currentUser + '/orders',
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var updateManagersInventory = function (currentUser, data) {
            return $http.put('api/stock-managers/' + currentUser + '/inventory', data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var updateManagersOrder = function (currentUser, orderID, data) {
            // for a manager to make changes in an order
            return $http.put('api/stock-managers/' + currentUser + '/orders/' + orderID, data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };
        var approveManagersOrder = function (currentUser, orderID, data) {
            // for a manager to make changes in an order
            return $http.put('api/stock-managers/' + currentUser
                            + '/orders/' + orderID + '/approve',
                data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };
        var rejectManagersOrder = function (currentUser, orderID, data) {
            // for a manager to make changes in an order
            return $http.put('api/stock-managers/' + currentUser
                + '/orders/' + orderID + '/reject',
                data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };
        var closeManagersOrder = function (currentUser, orderID, data) {
            // for a manager to make changes in an order
            return $http.put('api/stock-managers/' + currentUser
                + '/orders/' + orderID + '/close',
                data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var partialDeliveryManagersOrder = function (currentUser, orderID, data) {
            // for a manager to make changes in an order
            return $http.put('api/stock-managers/' + currentUser
                + '/orders/' + orderID + '/deliver-part',
                data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var getUserOrders = function (currentUser, accountID) {
            return $http.get('api/users/' + currentUser + '/orders/' + accountID,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var getUserAccountInfo = function (currentUser, accountID) {
            return $http.get('api/users/' + currentUser + '/accounts-orders/' + accountID,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var getUserMultipleAccounts = function (currentUser) {
            return $http.get('api/users/' + currentUser + '/multiple-accounts',
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var createOrder = function (currentUser, accountID, data) {
            return $http.post('api/users/' + currentUser + '/orders/' + accountID, data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };


        return {
            searchUsersSimple: searchUsersSimple,
            getAllUsersInfo: getAllUsersInfo,
            updateManagersUsers: updateManagersUsers,
            updateManagersFinancialStructure: updateManagersFinancialStructure,
            getManagersAccountFinances: getManagersAccountFinances,
            updateManagersAccountFinances: updateManagersAccountFinances,
            getInventory: getInventory,
            getManagementPermissions: getManagementPermissions,
            getManagersInventory: getManagersInventory,
            getManagersOrders: getManagersOrders,
            updateManagersInventory: updateManagersInventory,
            updateManagersOrder: updateManagersOrder,
            approveManagersOrder: approveManagersOrder,
            rejectManagersOrder: rejectManagersOrder,
            partialDeliveryManagersOrder: partialDeliveryManagersOrder,
            closeManagersOrder: closeManagersOrder,
            getUserOrders: getUserOrders,
            createOrder: createOrder,
            getUserMultipleAccounts: getUserMultipleAccounts,
            getUserAccountInfo: getUserAccountInfo,
            itemCategories: itemCategories,
            unitTypes: unitTypes,
            orderStatuses: orderStatuses,
            stockStatuses: stockStatuses,
            orderCostCenters: orderCostCenters,
            orderAccounts: orderAccounts,
            orderAccountRoles: orderAccountRoles,
        };
    };

    angular.module('managementApp')
        .service('ordersData', ordersData);
})();