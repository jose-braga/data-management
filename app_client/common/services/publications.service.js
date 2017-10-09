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

        var updateTeamSelectedPublications = function (teamID, data) {
            return $http.put('api/publications/team/' + teamID + '/selected', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var updateAuthorNamesPerson = function (personID, data) {
            return $http.put('api/publications/person/' + personID + '/author-names', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };


        return {
            thisPersonPublications: thisPersonPublications,
            thisTeamPublications: thisTeamPublications,
            updateSelectedPublications: updateSelectedPublications,
            updateTeamSelectedPublications: updateTeamSelectedPublications,
            updateAuthorNamesPerson: updateAuthorNamesPerson
        };
    };

    angular.module('managementApp')
        .service('publications', publications);
})();