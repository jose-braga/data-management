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

        var getInventory = function (currentUser) {
            return $http.get('api/users/' + currentUser + '/inventory',
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
        var deliveredManagersOrder = function (currentUser, orderID, data) {
            // for a manager to make changes in an order
            return $http.put('api/stock-managers/' + currentUser
                + '/orders/' + orderID + '/delivered',
                data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var getUserOrders = function (currentUser) {
            return $http.get('api/users/' + currentUser + '/orders',
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var getUserAccountInfo = function (currentUser) {
            return $http.get('api/users/' + currentUser + '/accounts-orders',
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };

        var createOrder = function (currentUser, data) {
            return $http.post('api/users/' + currentUser + '/orders', data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };
        

        return {
            getInventory: getInventory,
            getManagementPermissions: getManagementPermissions,
            getManagersInventory: getManagersInventory,
            getManagersOrders: getManagersOrders,
            updateManagersInventory: updateManagersInventory,
            updateManagersOrder: updateManagersOrder,
            approveManagersOrder: approveManagersOrder,
            rejectManagersOrder: rejectManagersOrder,
            deliveredManagersOrder: deliveredManagersOrder,
            getUserOrders: getUserOrders,
            createOrder: createOrder,
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