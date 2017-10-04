(function(){
    var publications = function ($http, authentication) {

        var thisPersonPublications = function (personID) {
            return $http.get('api/publications/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var thisTeamPublications = function (teamID) {
            return $http.get('api/publications/team/' + teamID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var updateSelectedPublications = function (personID, data) {
            return $http.put('api/publications/person/' + personID + '/selected', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };


        return {
            thisPersonPublications: thisPersonPublications,
            thisTeamPublications: thisTeamPublications,
            updateSelectedPublications: updateSelectedPublications
        };
    };

    angular.module('managementApp')
        .service('publications', publications);
})();