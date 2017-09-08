(function(){
var teamData = function ($http, authentication) {
    var currentUser = authentication.currentUser();
    var thisLabPeopleData = function (teamID) {
        return $http.get('api/labs/' + teamID + '/people/',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };
    var thisTechPeopleData = function (teamID) {
        return $http.get('api/facilities/' + teamID + '/people/',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };
    var thisScManPeopleData = function (teamID) {
        return $http.get('api/science-management-offices/' + teamID + '/people/',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };
    var thisAdmPeopleData = function (teamID) {
        return $http.get('api/administrative-offices/' + teamID + '/people/',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var updateLabPeopleTeamByID = function (teamID, data) {
        return $http.put('api/team/people-lab/' + teamID, data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var updateTechPeopleTeamByID = function (teamID, data) {
        return $http.put('api/team/people-technician/' + teamID, data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var updateScManPeopleTeamByID = function (teamID, data) {
        return $http.put('api/team/people-science-manager/' + teamID, data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var updateAdmPeopleTeamByID = function (teamID, data) {
        return $http.put('api/team/people-administrative/' + teamID, data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var preRegisterMember = function (data) {
        return $http.post('api/team/pre-register', data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    return {
        thisLabPeopleData: thisLabPeopleData,
        thisTechPeopleData: thisTechPeopleData,
        thisScManPeopleData: thisScManPeopleData,
        thisAdmPeopleData: thisAdmPeopleData,
        updateLabPeopleTeamByID: updateLabPeopleTeamByID,
        updateTechPeopleTeamByID: updateTechPeopleTeamByID,
        updateScManPeopleTeamByID: updateScManPeopleTeamByID,
        updateAdmPeopleTeamByID: updateAdmPeopleTeamByID,
        preRegisterMember: preRegisterMember
    };
};

angular.module('managementApp')
    .service('teamData', teamData);
})();