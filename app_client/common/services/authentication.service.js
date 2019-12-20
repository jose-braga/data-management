(function () {
    angular
        .module('managementApp')
        .service('authentication', authentication);

    authentication.$inject = ['$http','$window'];

    function authentication ($http, $window) {
        var saveToken = function (token) {
            $window.localStorage.setItem('managementApp-token', token);
        };

        var savePreRegToken = function (token) {
            $window.localStorage.setItem('managementApp-pre-reg-token', token);
        };

        var getToken = function () {
            return $window.localStorage.getItem('managementApp-token');
        };

        var getPreRegToken = function () {
            return $window.localStorage.getItem('managementApp-pre-reg-token');
        };

        var login = function(user) {
            return $http.post('/api/login', user)
                .then(function(response) {
                    saveToken(response.data.token);
                });
        };

        var preRegister = function(user) {
            return $http.post('/api/pre-registration', user)
                .then(function(response){
                    savePreRegToken(response.data.token);
                });
        };

        var changePassword = function(user) {
            // reminder: this is the token before password change!
            var token = getToken();
            if(token){
                var payload = JSON.parse($window.atob(token.split('.')[1]));
                var userID = payload.userID;
            } else {
                return false;
            }
            return $http.put('/api/change-password/' + userID, user,
                {
                    headers: {Authorization: 'Bearer ' + token}
                })
                .then(function(response) {
                    // delete previous
                    logout();
                    // save new token
                    saveToken(response.data.token);
                });
        };

        var logout = function() {
            $window.localStorage.removeItem('managementApp-token');
        };

        var finishPreRegistration = function() {
            $window.localStorage.removeItem('managementApp-pre-reg-token');
        };

        var isLoggedIn = function() {
            var token = getToken();
            if(token){
                var payload = JSON.parse($window.atob(token.split('.')[1]));
                return payload.exp > Date.now() / 1000;
            } else {
                return false;
            }
        };

        var isPreRegistering = function() {
            var token = getPreRegToken();
            if(token){
                var payload = JSON.parse($window.atob(token.split('.')[1]));
                return payload.exp > Date.now() / 1000;
            } else {
                return false;
            }
        };

        var currentUser = function() {
            if(isLoggedIn()){
                var token = getToken();
                var payload = JSON.parse($window.atob(token.split('.')[1]));
                return {
                    userID: payload.userID,
                    personID: payload.personID,
                    stat: payload.stat,
                    username: payload.username,
                    labID: payload.labID,
                    unitID: payload.unitID,
                    cityID: payload.cityID,
                    base_url: payload.base_url,
                };
            } else {
                return null;
            }
        };

        var currentPreRegUser = function() {
            if(isPreRegistering()){
                var token = getPreRegToken();
                var payload = JSON.parse($window.atob(token.split('.')[1]));
                return {
                    userID: payload.userID,
                    personID: payload.personID,
                    stat: payload.stat,
                    username : payload.username
                };
            } else {
                return null;
            }
        };


        var access = function(page) {
            if(isLoggedIn()){
                var stat = currentUser().stat;
                var permit;
                if (page === 'team') {
                    permit = [0, 5, 10, 15, 16, 20, 30];
                } else if (page === 'unit') {
                    permit = [0, 5, 10, 15, 16, 20];
                } else if (page === 'manager') {
                    permit = [0, 5, 10, 15, 16];
                } else if (page === 'registration') {
                    permit = [0, 5, 10, 15, 16];
                } else if (page === 'admin') {
                    permit = [0];
                }
                if (permit.indexOf(stat) === -1) {
                    return false;
                } else {
                    return true;
                }
            } else {
                return false;
            }
        };

        return {
            saveToken : saveToken,
            getToken : getToken,
            login: login,
            logout: logout,
            changePassword: changePassword,
            currentUser: currentUser,
            access: access,
            preRegister: preRegister,
            savePreRegToken: savePreRegToken,
            getPreRegToken: getPreRegToken,
            finishPreRegistration: finishPreRegistration,
            isLoggedIn: isLoggedIn,
            isPreRegistering: isPreRegistering,
            currentPreRegUser: currentPreRegUser
        };
    }
})();