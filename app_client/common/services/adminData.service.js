(function(){
var adminData = function ($http, authentication) {

    var sendAdminMessageAllServer = function (msg) {
        return $http.post('message/all', msg,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var sendAdminMessageClear = function (option) {
        return $http.get('message/clear/' + option,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var getServerMessages = function () {
        return $http.get('message/all',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    return {
        sendAdminMessageAllServer: sendAdminMessageAllServer,
        sendAdminMessageClear: sendAdminMessageClear,
        getServerMessages: getServerMessages,
    };
};

angular.module('managementApp')
    .service('adminData', adminData);
})();