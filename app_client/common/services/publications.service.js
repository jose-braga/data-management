(function(){
    var publications = function ($http, authentication) {
        var orcid_base_url = 'https://pub.orcid.org';
        var orcid_version = 'v2.0';
        var orcid_headers = {"Accept": "application/json"};

        var allPublications = function () {
            return $http.get('api/publications/all/',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var thisPersonPublications = function (personID) {
            return $http.get('api/publications/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var thisPersonCommunications = function (personID) {
            return $http.get('api/communications/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var thisTeamPublications = function (groupID, teamID) {
            return $http.get('api/publications/team/' + groupID + '/' + teamID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisMembersPublications = function (groupID, teamID) {
            return $http.get('api/publications/team/' + groupID + '/' + teamID + '/members',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var addMembersPublications = function (groupID, teamID, data) {
            return $http.put('api/publications/team/' + groupID + '/' + teamID, data,
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

        var updateTeamSelectedPublications = function (groupID, teamID, data) {
            return $http.put('api/publications/team/' + groupID + '/' + teamID + '/selected', data,
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

        var removePublicationsPerson = function (personID, data) {
            return $http.put('api/publications/person/' + personID + '/delete', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var removePublicationsTeam = function (groupID, teamID, data) {
            return $http.put('api/publications/team/' + groupID + '/' + teamID + '/delete', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var addPublicationsPerson = function (personID, data) {
            return $http.put('api/publications/person/' + personID + '/add', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var getORCIDPublicationsPerson = function (orcid) {
            // despite its name in this function we get all Works (from ORCID) by the person, not only publications
            return $http.get(orcid_base_url + '/' + orcid_version + '/' + orcid + '/works',
                {
                    headers: orcid_headers
                });
        };

        var getORCIDDetailsPublication = function (path) {
            return $http.get(orcid_base_url + '/' + orcid_version + path,
                {
                    headers: orcid_headers
                });
        };

        var addORCIDPublicationsPerson = function (personID, data) {
            return $http.put('api/publications/person/' + personID + '/add-orcid', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var addORCIDCommunicationsPerson = function (personID, data) {
            return $http.put('api/communications/person/' + personID + '/add-orcid', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var addCommunicationsPerson = function (personID, data) {
            return $http.put('api/communications/person/' + personID + '/add', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateCommunicationsPerson = function (personID, data) {
            return $http.put('api/communications/person/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        return {
            addMembersPublications: addMembersPublications,
            allPublications: allPublications,
            thisPersonPublications: thisPersonPublications,
            thisPersonCommunications: thisPersonCommunications,
            thisTeamPublications: thisTeamPublications,
            thisMembersPublications: thisMembersPublications,
            updateSelectedPublications: updateSelectedPublications,
            updateTeamSelectedPublications: updateTeamSelectedPublications,
            updateAuthorNamesPerson: updateAuthorNamesPerson,
            removePublicationsPerson: removePublicationsPerson,
            addPublicationsPerson: addPublicationsPerson,
            getORCIDPublicationsPerson: getORCIDPublicationsPerson,
            getORCIDDetailsPublication: getORCIDDetailsPublication,
            addORCIDPublicationsPerson: addORCIDPublicationsPerson,
            addORCIDCommunicationsPerson: addORCIDCommunicationsPerson,
            addCommunicationsPerson: addCommunicationsPerson,
            updateCommunicationsPerson: updateCommunicationsPerson,
            removePublicationsTeam: removePublicationsTeam
        };
    };

    angular.module('managementApp')
        .service('publications', publications);
})();