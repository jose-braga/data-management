(function(){
    var preRegistration = function ($http, authentication) {

        var thisPersonData = function (personID) {
            return $http.get('api/pre-registration/people/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getPreRegToken()}
                }
            );
        };

        var addNewPersonData = function (data) {
            return $http.post('api/pre-registration/data', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getPreRegToken()}
                }
            );
        };

        return {
            thisPersonData: thisPersonData,
            addNewPersonData: addNewPersonData
        };
    };

    angular.module('managementApp')
        .service('preRegistration', preRegistration);
})();