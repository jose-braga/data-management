(function(){
var managerData = function ($http, authentication) {
    var currentUser = authentication.currentUser();



    //TODO: change functions below?????????

    var allPeopleWithRolesData = function () {
        return $http.get('api/manager/people/all-with-roles',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var allPeopleNoRolesData = function () {
        return $http.get('api/manager/people/all-no-roles',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var allPeopleToValidate = function () {
        return $http.get('api/manager/people/validate',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var validatePerson = function (personID, data) {
        return $http.put('api/manager/people/validate/' + personID, data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var passwordResetByID = function (personID, data) {
        return $http.put('api/manager/people/password-reset/' + personID, data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var updatePeopleData = function (data) {
        return $http.put('api/manager/people/all', data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    /*var createPeopleData = function (data) {
        return $http.post('api/manager/people/all', data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };
    */

    return {
        allPeopleWithRolesData: allPeopleWithRolesData,
        allPeopleNoRolesData: allPeopleNoRolesData,
        allPeopleToValidate: allPeopleToValidate,
        validatePerson: validatePerson,
        updatePeopleData: updatePeopleData,
        passwordResetByID: passwordResetByID
        //createPeopleData: createPeopleData
    };
};

angular.module('managementApp')
    .service('managerData', managerData);
})();