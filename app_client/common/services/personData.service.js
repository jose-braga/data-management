(function(){
    var personData = function ($http, authentication) {
        var currentUser = authentication.currentUser();
        var allPeople = function () {
            return $http.get('api/people/all');
        };
        var allCountries = function () {
            return $http.get('api/list/countries');
        };
        var usernames = function () {
            return $http.get('api/list/usernames');
        };
        var cardTypes = function () {
            return $http.get('api/list/card-types');
        };
        var urlTypes = function () {
            return $http.get('api/list/url-types');
        };

        var degreeTypes = function () {
            return $http.get('api/list/degree-types');
        };

        var professionalCategories = function () {
            return $http.get('api/list/professional-categories');
        };
        var professionalSituations = function () {
            return $http.get('api/list/professional-situations');
        };

        var fellowshipTypes = function () {
            return $http.get('api/list/fellowship-types');
        };
        var managementEntities = function () {
            return $http.get('api/list/management-entities');
        };
        var fundingAgencies = function () {
            return $http.get('api/list/funding-agencies');
        };

        var institutionCities = function () {
            return $http.get('api/list/institution-cities');
        };
        var units = function () {
            return $http.get('api/list/units');
        };

        var labs = function () {
            return $http.get('api/list/labs');
        };
        var labPositions = function () {
            return $http.get('api/list/lab-positions');
        };

        var costCenters = function () {
            return $http.get('api/list/cost-centers');
        };

        var administrativeOffices = function () {
            return $http.get('api/list/administrative-offices');
        };
        var administrativePositions = function () {
            return $http.get('api/list/administrative-positions');
        };
        var scienceManagementOffices = function () {
            return $http.get('api/list/science-management-offices');
        };
        var scienceManagementPositions = function () {
            return $http.get('api/list/science-management-positions');
        };
        var facilities = function () {
            return $http.get('api/list/facilities');
        };
        var technicianPositions = function () {
            return $http.get('api/list/technician-positions');
        };

        var groups = function () {
            return $http.get('api/list/groups');
        };
        var groupPositions = function () {
            return $http.get('api/list/group-positions');
        };
        var universities = function () {
            return $http.get('api/list/universities');
        };
        var schools = function () {
            return $http.get('api/list/schools');
        };
        var departments = function () {
            return $http.get('api/list/departments');
        };
        var supervisorTypes = function () {
            return $http.get('api/list/supervisor-types');
        };
        var roles = function () {
            return $http.get('api/list/roles');
        };
        var authorTypes = function () {
            return $http.get('api/list/author-types');
        };

        var publicationTypes = function () {
            return $http.get('api/list/publication-types');
        };
        var communicationTypes = function () {
            return $http.get('api/list/communication-types');
        };
        var projectTypes = function () {
            return $http.get('api/list/project-types');
        };
        var callTypes = function () {
            return $http.get('api/list/call-types');
        };
        var projectPositions = function () {
            return $http.get('api/list/project-positions');
        };
        var conferenceTypes = function () {
            return $http.get('api/list/conference-types');
        };
        var patentTypes = function () {
            return $http.get('api/list/patent-types');
        };
        var patentStatus = function () {
            return $http.get('api/list/patent-status');
        };
        var datasetTypes = function () {
            return $http.get('api/list/dataset-types');
        };
        var boardTypes = function () {
            return $http.get('api/list/board-types');
        };

        var permissions = function () {
            return $http.get('api/list/permissions');
        };

        var thisPersonData = function (personID) {
            return $http.get('api/people/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var updateNuclearInfoPersonByID = function (personID, data) {
            return $http.put('api/people/nuclear-info/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateContactInfoPersonByID = function (personID, data) {
            return $http.put('api/people/contact-info/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateIdentificationsPersonByID = function (personID, data) {
            return $http.put('api/people/identifications/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateCarsPersonByID = function (personID, data) {
            return $http.put('api/people/cars/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateInstitutionalContactsPersonByID = function (personID, data) {
            return $http.put('api/people/institutional-contacts/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateEmergencyContactsPersonByID = function (personID, data) {
            return $http.put('api/people/emergency-contacts/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateFinishedDegreesPersonByID = function (personID, data) {
            return $http.put('api/people/finished-degrees/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateOngoingDegreesPersonByID = function (personID, data) {
            return $http.put('api/people/ongoing-degrees/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateInstitutionCityPersonByID = function (personID, data) {
            return $http.put('api/people/institution-city/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateJobsPersonByID = function (personID, data) {
            return $http.put('api/people/jobs/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateCostCentersPersonByID = function (personID, data) {
            return $http.put('api/people/cost-centers/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateAffiliationsDepartmentPersonByID = function (personID, data) {
            return $http.put('api/people/department-affiliations/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateURLsPersonByID = function (personID, data) {
            return $http.put('api/people/personal-urls/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateResearchInterestsPersonByID = function (personID, data) {
            return $http.put('api/people/research-interests/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateAffiliationsLabPersonByID = function (personID, data) {
            return $http.put('api/people/lab-affiliations/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateTechnicianAffiliationsPersonByID = function (personID, data) {
            return $http.put('api/people/technician-affiliations/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateScienceManagerAffiliationsPersonByID = function (personID, data) {
            return $http.put('api/people/science-manager-affiliations/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateAdministrativeAffiliationsPersonByID = function (personID, data) {
            return $http.put('api/people/administrative-affiliations/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateResearcherInfoPersonByID = function (personID, data) {
            return $http.put('api/people/researcher-info/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateResponsiblesPersonByID = function (personID, data) {
            return $http.put('api/people/responsibles/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateTechnicianInfoPersonByID = function (personID, data) {
            return $http.put('api/people/technician-info/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateScienceManagerInfoPersonByID = function (personID, data) {
            return $http.put('api/people/science-manager-info/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updateAdministrativeInfoPersonByID = function (personID, data) {
            return $http.put('api/people/administrative-info/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var updatePersonLeftByID = function (personID, data) {
            return $http.put('api/people/left/' + personID, data,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var deleteRolePersonByID = function (role, personID) {
            return $http.delete('api/people/role/'+ role + '/'  + personID,
                {
                    headers: {
                        Authorization: 'Bearer ' + authentication.getToken()

                    }
                }
            );
        };
        var deletePersonErrorData = function (username) {
            return $http.delete('api/people/' + username,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var updatePersonPhoto = function (personID, imageType, data) {
            var fd = new FormData();
            fd.append('file', data.file);
            return $http.post('api/people/photo/'+ personID + '/'  + imageType, fd,
                {
                    transformRequest: angular.identity,
                    headers: {
                        'Content-Type': undefined,
                        Authorization: 'Bearer ' + authentication.getToken()

                    }
                }
            );
        };

        return {
            thisPersonData: thisPersonData,
            allPeople: allPeople,
            usernames: usernames,
            allCountries: allCountries,
            cardTypes: cardTypes,
            urlTypes: urlTypes,
            degreeTypes: degreeTypes,
            managementEntities: managementEntities,
            professionalSituations: professionalSituations,
            professionalCategories: professionalCategories,
            fellowshipTypes: fellowshipTypes,
            fundingAgencies: fundingAgencies,
            institutionCities: institutionCities,
            units: units,
            groups: groups,
            labs: labs,
            departments: departments,
            schools: schools,
            universities: universities,
            labPositions: labPositions,
            costCenters: costCenters,
            administrativeOffices: administrativeOffices,
            administrativePositions: administrativePositions,
            scienceManagementOffices: scienceManagementOffices,
            scienceManagementPositions: scienceManagementPositions,
            facilities: facilities,
            technicianPositions: technicianPositions,
            groupPositions: groupPositions,
            supervisorTypes: supervisorTypes,
            roles: roles,
            authorTypes: authorTypes,
            publicationTypes: publicationTypes,
            communicationTypes: communicationTypes,
            conferenceTypes: conferenceTypes,
            projectTypes: projectTypes,
            callTypes: callTypes,
            projectPositions: projectPositions,
            patentTypes: patentTypes,
            patentStatus: patentStatus,
            datasetTypes: datasetTypes,
            boardTypes: boardTypes,
            permissions: permissions,
            updateInstitutionCityPersonByID: updateInstitutionCityPersonByID,
            updateJobsPersonByID: updateJobsPersonByID,
            updateURLsPersonByID: updateURLsPersonByID,
            updateAffiliationsDepartmentPersonByID: updateAffiliationsDepartmentPersonByID,
            updateResearchInterestsPersonByID: updateResearchInterestsPersonByID,
            updateAffiliationsLabPersonByID: updateAffiliationsLabPersonByID,
            updateCostCentersPersonByID: updateCostCentersPersonByID,
            updateTechnicianAffiliationsPersonByID: updateTechnicianAffiliationsPersonByID,
            updateScienceManagerAffiliationsPersonByID: updateScienceManagerAffiliationsPersonByID,
            updateAdministrativeAffiliationsPersonByID: updateAdministrativeAffiliationsPersonByID,
            updateNuclearInfoPersonByID: updateNuclearInfoPersonByID,
            updateContactInfoPersonByID: updateContactInfoPersonByID,
            updateIdentificationsPersonByID: updateIdentificationsPersonByID,
            updateCarsPersonByID: updateCarsPersonByID,
            updateInstitutionalContactsPersonByID: updateInstitutionalContactsPersonByID,
            updateEmergencyContactsPersonByID: updateEmergencyContactsPersonByID,
            updateFinishedDegreesPersonByID: updateFinishedDegreesPersonByID,
            updateOngoingDegreesPersonByID: updateOngoingDegreesPersonByID,
            updateResearcherInfoPersonByID: updateResearcherInfoPersonByID,
            updateTechnicianInfoPersonByID: updateTechnicianInfoPersonByID,
            updateScienceManagerInfoPersonByID: updateScienceManagerInfoPersonByID,
            updateAdministrativeInfoPersonByID: updateAdministrativeInfoPersonByID,
            updatePersonLeftByID: updatePersonLeftByID,
            updateResponsiblesPersonByID: updateResponsiblesPersonByID,
            deleteRolePersonByID: deleteRolePersonByID,
            deletePersonErrorData: deletePersonErrorData,
            updatePersonPhoto: updatePersonPhoto
        };
    };

    angular.module('managementApp')
        .service('personData', personData);
})();