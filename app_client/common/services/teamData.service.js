(function(){
var teamData = function ($http, authentication) {
    var currentUser = authentication.currentUser();

    var allPeopleData = function () {
        return $http.get('api/people/all-for-team',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var thisLabPeopleData = function (groupID, teamID) {
        return $http.get('api/labs/' + groupID + '/' + teamID + '/people/',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };
    var thisTechPeopleData = function (unitID, teamID) {
        return $http.get('api/facilities/' + unitID + '/' + teamID + '/people/',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };
    var thisScManPeopleData = function (unitID, teamID) {
        return $http.get('api/science-management-offices/' + unitID + '/' + teamID + '/people/',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };
    var thisAdmPeopleData = function (unitID, teamID) {
        return $http.get('api/administrative-offices/' + unitID + '/' + teamID + '/people/',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var updateLabPeopleTeamByID = function (groupID, teamID, data) {
        return $http.put('api/team/people-lab/' + groupID + '/' + teamID, data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var updateTechPeopleTeamByID = function (unitID, teamID, data) {
        return $http.put('api/team/people-technician/' + unitID + '/'  + teamID, data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var updateScManPeopleTeamByID = function (unitID, teamID, data) {
        return $http.put('api/team/people-science-manager/' + unitID + '/'  + teamID, data,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var updateAdmPeopleTeamByID = function (unitID, teamID, data) {
        return $http.put('api/team/people-administrative/' + unitID + '/'  + teamID, data,
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
        allPeopleData: allPeopleData,
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