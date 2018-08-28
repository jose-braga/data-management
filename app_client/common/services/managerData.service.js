(function(){
var managerData = function ($http, authentication) {
    var currentUser = authentication.currentUser();

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

    var sendAdditionEmail = function (personID, data) {
        return $http.put('api/manager/people/fct-mctes-status/' + personID, data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var sendRemovalEmail = function (personID, data) {
        return $http.put('api/manager/people/fct-mctes-status/' + personID + '/remove', data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var updateStatusFCT = function (personID, data) {
        return $http.put('api/manager/people/fct-mctes-status/' + personID + '/update', data,
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

    var changeUserPermissions = function (personID, data) {
        return $http.put('api/manager/people/user-permissions/' + personID, data,
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

    return {
        allPeopleWithRolesData: allPeopleWithRolesData,
        allPeopleNoRolesData: allPeopleNoRolesData,
        allPeopleToValidate: allPeopleToValidate,
        validatePerson: validatePerson,
        updatePeopleData: updatePeopleData,
        sendAdditionEmail: sendAdditionEmail,
        sendRemovalEmail: sendRemovalEmail,
        updateStatusFCT: updateStatusFCT,
        passwordResetByID: passwordResetByID,
        changeUserPermissions: changeUserPermissions
    };
};

angular.module('managementApp')
    .service('managerData', managerData);
})();