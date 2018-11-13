(function(){
    var publications = function ($http, authentication) {
        var orcid_base_url = 'https://pub.orcid.org';
        var orcid_version = 'v2.1';
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

        var updateSelectedCommunications = function (personID, data) {
            return $http.put('api/communications/person/' + personID + '/selected', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var updatePublicationData = function (pubID, data) {
            return $http.put('api/publications/publication/' + pubID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateCommunicationData = function (workID, data) {
            return $http.put('api/communications/communication/' + workID, data,
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

        var removeCommunicationsPerson = function (personID, data) {
            return $http.put('api/communications/person/' + personID + '/delete', data,
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

        var getAllPatents = function () {
            return $http.get('api/patents/all',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisPersonPatents = function (personID) {
            return $http.get('api/patents/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updatePatentsPerson = function (personID, data) {
            return $http.put('api/patents/person/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var getAllPrizes = function () {
            return $http.get('api/prizes/all',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisPersonPrizes = function (personID) {
            return $http.get('api/prizes/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updatePrizesPerson = function (personID, data) {
            return $http.put('api/prizes/person/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var getAllDatasets = function () {
            return $http.get('api/datasets/all',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisPersonDatasets = function (personID) {
            return $http.get('api/datasets/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateDatasetsPerson = function (personID, data) {
            return $http.put('api/datasets/person/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var getAllStartups = function () {
            return $http.get('api/startups/all',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisPersonStartups = function (personID) {
            return $http.get('api/startups/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateStartupsPerson = function (personID, data) {
            return $http.put('api/startups/person/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var getAllBoards = function () {
            return $http.get('api/boards/all',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisPersonBoards = function (personID) {
            return $http.get('api/boards/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateBoardsPerson = function (personID, data) {
            return $http.put('api/boards/person/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var thisPersonOutreaches = function (personID) {
            return $http.get('api/outreaches/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateOutreachesPerson = function (personID, data) {
            return $http.put('api/outreaches/person/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var thisTeamCommunications = function (groupID, teamID) {
            return $http.get('api/communications/team/' + groupID + '/' + teamID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisMembersCommunications = function (groupID, teamID) {
            return $http.get('api/communications/team/' + groupID + '/' + teamID + '/members',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var addMembersCommunications = function (groupID, teamID, data) {
            return $http.put('api/communications/team/' + groupID + '/' + teamID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var removeCommunicationsTeam = function (groupID, teamID, data) {
            return $http.put('api/communications/team/' + groupID + '/' + teamID + '/delete', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var getAllProjects = function () {
            return $http.get('api/projects/all',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisPersonProjects = function (personID) {
            return $http.get('api/projects/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateProjectsPerson = function (personID, data) {
            return $http.put('api/projects/person/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisTeamProjects = function (groupID, teamID) {
            return $http.get('api/projects/team/' + groupID + '/' + teamID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisMembersProjects = function (groupID, teamID) {
            return $http.get('api/projects/team/' + groupID + '/' + teamID + '/members',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var addMembersProjects = function (groupID, teamID, data) {
            return $http.put('api/projects/team/' + groupID + '/' + teamID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var removeProjectsTeam = function (groupID, teamID, data) {
            return $http.put('api/projects/team/' + groupID + '/' + teamID + '/delete', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var getAllAgreements = function () {
            return $http.get('api/agreements/all',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisPersonAgreements = function (personID) {
            return $http.get('api/agreements/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateAgreementsPerson = function (personID, data) {
            return $http.put('api/agreements/person/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisTeamAgreements = function (groupID, teamID) {
            return $http.get('api/agreements/team/' + groupID + '/' + teamID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisMembersAgreements = function (groupID, teamID) {
            return $http.get('api/agreements/team/' + groupID + '/' + teamID + '/members',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var addMembersAgreements = function (groupID, teamID, data) {
            return $http.put('api/agreements/team/' + groupID + '/' + teamID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var removeAgreementsTeam = function (groupID, teamID, data) {
            return $http.put('api/agreements/team/' + groupID + '/' + teamID + '/delete', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };


        var getAllTrainings = function () {
            return $http.get('api/trainings/all',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisPersonTrainings = function (personID) {
            return $http.get('api/trainings/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateTrainingsPerson = function (personID, data) {
            return $http.put('api/trainings/person/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisTeamTrainings = function (groupID, teamID) {
            return $http.get('api/trainings/team/' + groupID + '/' + teamID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisMembersTrainings = function (groupID, teamID) {
            return $http.get('api/trainings/team/' + groupID + '/' + teamID + '/members',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var addMembersTrainings = function (groupID, teamID, data) {
            return $http.put('api/trainings/team/' + groupID + '/' + teamID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var removeTrainingsTeam = function (groupID, teamID, data) {
            return $http.put('api/trainings/team/' + groupID + '/' + teamID + '/delete', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var thisTeamPatents = function (groupID, teamID) {
            return $http.get('api/patents/team/' + groupID + '/' + teamID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisMembersPatents = function (groupID, teamID) {
            return $http.get('api/patents/team/' + groupID + '/' + teamID + '/members',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var addMembersPatents = function (groupID, teamID, data) {
            return $http.put('api/patents/team/' + groupID + '/' + teamID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var removePatentsTeam = function (groupID, teamID, data) {
            return $http.put('api/patents/team/' + groupID + '/' + teamID + '/delete', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var thisTeamPrizes = function (groupID, teamID) {
            return $http.get('api/prizes/team/' + groupID + '/' + teamID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisMembersPrizes = function (groupID, teamID) {
            return $http.get('api/prizes/team/' + groupID + '/' + teamID + '/members',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var addMembersPrizes = function (groupID, teamID, data) {
            return $http.put('api/prizes/team/' + groupID + '/' + teamID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var removePrizesTeam = function (groupID, teamID, data) {
            return $http.put('api/prizes/team/' + groupID + '/' + teamID + '/delete', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var thisTeamDatasets = function (groupID, teamID) {
            return $http.get('api/datasets/team/' + groupID + '/' + teamID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisMembersDatasets = function (groupID, teamID) {
            return $http.get('api/datasets/team/' + groupID + '/' + teamID + '/members',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var addMembersDatasets = function (groupID, teamID, data) {
            return $http.put('api/datasets/team/' + groupID + '/' + teamID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var removeDatasetsTeam = function (groupID, teamID, data) {
            return $http.put('api/datasets/team/' + groupID + '/' + teamID + '/delete', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var thisTeamStartups = function (groupID, teamID) {
            return $http.get('api/startups/team/' + groupID + '/' + teamID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisMembersStartups = function (groupID, teamID) {
            return $http.get('api/startups/team/' + groupID + '/' + teamID + '/members',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var addMembersStartups = function (groupID, teamID, data) {
            return $http.put('api/startups/team/' + groupID + '/' + teamID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var removeStartupsTeam = function (groupID, teamID, data) {
            return $http.put('api/startups/team/' + groupID + '/' + teamID + '/delete', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var thisTeamBoards = function (groupID, teamID) {
            return $http.get('api/boards/team/' + groupID + '/' + teamID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisMembersBoards = function (groupID, teamID) {
            return $http.get('api/boards/team/' + groupID + '/' + teamID + '/members',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var addMembersBoards = function (groupID, teamID, data) {
            return $http.put('api/boards/team/' + groupID + '/' + teamID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var removeBoardsTeam = function (groupID, teamID, data) {
            return $http.put('api/boards/team/' + groupID + '/' + teamID + '/delete', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var thisTeamOutreaches = function (groupID, teamID) {
            return $http.get('api/outreaches/team/' + groupID + '/' + teamID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var thisMembersOutreaches = function (groupID, teamID) {
            return $http.get('api/outreaches/team/' + groupID + '/' + teamID + '/members',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var addMembersOutreaches = function (groupID, teamID, data) {
            return $http.put('api/outreaches/team/' + groupID + '/' + teamID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var removeOutreachesTeam = function (groupID, teamID, data) {
            return $http.put('api/outreaches/team/' + groupID + '/' + teamID + '/delete', data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        return {
            addMembersPublications: addMembersPublications,
            allPublications: allPublications,
            updatePublicationData: updatePublicationData,
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
            removeCommunicationsPerson: removeCommunicationsPerson,

            removePublicationsTeam: removePublicationsTeam,
            getAllPatents: getAllPatents,
            thisPersonPatents: thisPersonPatents,
            updatePatentsPerson: updatePatentsPerson,
            getAllPrizes: getAllPrizes,
            thisPersonPrizes: thisPersonPrizes,
            updatePrizesPerson: updatePrizesPerson,
            getAllDatasets: getAllDatasets,
            thisPersonDatasets: thisPersonDatasets,
            updateDatasetsPerson: updateDatasetsPerson,
            getAllStartups: getAllStartups,
            thisPersonStartups: thisPersonStartups,
            updateStartupsPerson: updateStartupsPerson,
            getAllBoards: getAllBoards,
            thisPersonBoards: thisPersonBoards,
            updateBoardsPerson: updateBoardsPerson,
            thisPersonOutreaches: thisPersonOutreaches,
            updateOutreachesPerson: updateOutreachesPerson,

            thisTeamCommunications: thisTeamCommunications,
            thisMembersCommunications: thisMembersCommunications,
            addMembersCommunications: addMembersCommunications,
            removeCommunicationsTeam: removeCommunicationsTeam,
            updateCommunicationData: updateCommunicationData,
            updateSelectedCommunications: updateSelectedCommunications,

            thisTeamPatents: thisTeamPatents,
            thisMembersPatents: thisMembersPatents,
            addMembersPatents: addMembersPatents,
            removePatentsTeam: removePatentsTeam,

            thisTeamPrizes: thisTeamPrizes,
            thisMembersPrizes: thisMembersPrizes,
            addMembersPrizes: addMembersPrizes,
            removePrizesTeam: removePrizesTeam,

            thisTeamDatasets: thisTeamDatasets,
            thisMembersDatasets: thisMembersDatasets,
            addMembersDatasets: addMembersDatasets,
            removeDatasetsTeam: removeDatasetsTeam,

            thisTeamStartups: thisTeamStartups,
            thisMembersStartups: thisMembersStartups,
            addMembersStartups: addMembersStartups,
            removeStartupsTeam: removeStartupsTeam,

            thisTeamBoards: thisTeamBoards,
            thisMembersBoards: thisMembersBoards,
            addMembersBoards: addMembersBoards,
            removeBoardsTeam: removeBoardsTeam,

            thisTeamOutreaches: thisTeamOutreaches,
            thisMembersOutreaches: thisMembersOutreaches,
            addMembersOutreaches: addMembersOutreaches,
            removeOutreachesTeam: removeOutreachesTeam,

            getAllProjects: getAllProjects,
            thisPersonProjects: thisPersonProjects,
            updateProjectsPerson: updateProjectsPerson,
            thisTeamProjects: thisTeamProjects,
            thisMembersProjects: thisMembersProjects,
            addMembersProjects: addMembersProjects,
            removeProjectsTeam: removeProjectsTeam,

            getAllAgreements: getAllAgreements,
            thisPersonAgreements: thisPersonAgreements,
            updateAgreementsPerson: updateAgreementsPerson,
            thisTeamAgreements: thisTeamAgreements,
            thisMembersAgreements: thisMembersAgreements,
            addMembersAgreements: addMembersAgreements,
            removeAgreementsTeam: removeAgreementsTeam,

            getAllTrainings: getAllTrainings,
            thisPersonTrainings: thisPersonTrainings,
            updateTrainingsPerson: updateTrainingsPerson,
            thisTeamTrainings: thisTeamTrainings,
            thisMembersTrainings: thisMembersTrainings,
            addMembersTrainings: addMembersTrainings,
            removeTrainingsTeam: removeTrainingsTeam
        };
    };

    angular.module('managementApp')
        .service('publications', publications);
})();