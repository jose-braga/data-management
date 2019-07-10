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
        

        var getInventory = function (currentUser) {
            return $http.get('api/users/' + currentUser + '/inventory',
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

        var createOrder = function (currentUser, data) {
            return $http.post('api/users/' + currentUser + '/orders', data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };
        /*
        var updateAuthorizationInfoPersonByID = function (personID, data) {
            return $http.put('api/people/authorization-info/' + personID, data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };
        */

        return {
            getInventory: getInventory,
            getUserOrders: getUserOrders,
            createOrder: createOrder,
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