(function(){
    var personData = function ($http, authentication) {
        var currentUser = authentication.currentUser();
        var allPeople = function () {
            return $http.get('api/people/all');
        };
        var allCountries = function () {
            return $http.get('api/lists/countries');
        };
        var usernames = function () {
            return $http.get('api/lists/usernames');
        };
        var cardTypes = function () {
            return $http.get('api/lists/card-types');
        };
        var degreeTypes = function () {
            return $http.get('api/lists/degree-types');
        };

        var professionalCategories = function () {
            return $http.get('api/lists/professional-categories');
        };
        var professionalSituations = function () {
            return $http.get('api/lists/professional-situations');
        };

        var fellowshipTypes = function () {
            return $http.get('api/lists/fellowship-types');
        };
        var managementEntities = function () {
            return $http.get('api/lists/management-entities');
        };
        var fundingAgencies = function () {
            return $http.get('api/lists/funding-agencies');
        };

        var institutionCities = function () {
            return $http.get('api/lists/institution-cities');
        };
        var units = function () {
            return $http.get('api/lists/units');
        };

        var labs = function () {
            return $http.get('api/lists/labs');
        };
        var labPositions = function () {
            return $http.get('api/lists/lab-positions');
        };

        var administrativeOffices = function () {
            return $http.get('api/lists/administrative-offices');
        };
        var administrativePositions = function () {
            return $http.get('api/lists/administrative-positions');
        };
        var scienceManagementOffices = function () {
            return $http.get('api/lists/science-management-offices');
        };
        var scienceManagementPositions = function () {
            return $http.get('api/lists/science-management-positions');
        };
        var facilities = function () {
            return $http.get('api/lists/facilities');
        };
        var technicianPositions = function () {
            return $http.get('api/lists/technician-positions');
        };

        var groups = function () {
            return $http.get('api/lists/groups');
        };
        var groupPositions = function () {
            return $http.get('api/lists/group-positions');
        };
        var universities = function () {
            return $http.get('api/lists/universities');
        };
        var schools = function () {
            return $http.get('api/lists/schools');
        };
        var departments = function () {
            return $http.get('api/lists/departments');
        };
        var supervisorTypes = function () {
            return $http.get('api/lists/supervisor-types');
        };
        var roles = function () {
            return $http.get('api/lists/roles');
        };

        var permissions = function () {
            return $http.get('api/lists/permissions');
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

        var updateAffiliationsDepartmentPersonByID = function (personID, data) {
            return $http.put('api/people/department-affiliations/' + personID, data,
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

        return {
            thisPersonData: thisPersonData,
            allPeople: allPeople,
            usernames: usernames,
            allCountries: allCountries,
            cardTypes: cardTypes,
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
            administrativeOffices: administrativeOffices,
            administrativePositions: administrativePositions,
            scienceManagementOffices: scienceManagementOffices,
            scienceManagementPositions: scienceManagementPositions,
            facilities: facilities,
            technicianPositions: technicianPositions,
            groupPositions: groupPositions,
            supervisorTypes: supervisorTypes,
            roles: roles,
            permissions: permissions,
            updateInstitutionCityPersonByID: updateInstitutionCityPersonByID,
            updateJobsPersonByID: updateJobsPersonByID,
            updateAffiliationsDepartmentPersonByID: updateAffiliationsDepartmentPersonByID,
            updateAffiliationsLabPersonByID: updateAffiliationsLabPersonByID,
            updateTechnicianAffiliationsPersonByID: updateTechnicianAffiliationsPersonByID,
            updateScienceManagerAffiliationsPersonByID: updateScienceManagerAffiliationsPersonByID,
            updateAdministrativeAffiliationsPersonByID: updateAdministrativeAffiliationsPersonByID,
            updateNuclearInfoPersonByID: updateNuclearInfoPersonByID,
            updateContactInfoPersonByID: updateContactInfoPersonByID,
            updateIdentificationsPersonByID: updateIdentificationsPersonByID,
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
            deletePersonErrorData: deletePersonErrorData
        };
    };

    angular.module('managementApp')
        .service('personData', personData);
})();