(function(){
var registrationData = function ($http, authentication) {
    var currentUser = authentication.currentUser();

    var addNewPersonData = function (data) {
        return $http.post('api/registration', data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    return {
        addNewPersonData: addNewPersonData
    };
};

angular.module('managementApp')
    .service('registrationData', registrationData);
})();