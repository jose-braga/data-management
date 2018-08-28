(function(){
    var preRegistration = function ($http, authentication) {

        var emailFormImageNonStudent = function () {
            return $http({
                method: 'GET',
                url: 'images/formulario_email_non_student_1.png',
                responseType: 'arraybuffer'
            });
        };
        var emailFormImageMemberRU = function () {
            return $http({
                method: 'GET',
                url: 'images/formulario_email_member_1.png',
                responseType: 'arraybuffer'
            });
        };

        var thisPersonData = function (personID) {
            return $http.get('api/pre-registration/people/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getPreRegToken()}
                }
            );
        };

        var addNewPersonData = function (data) {
            return $http.post('api/pre-registration/data', data,
                    {
                        headers: {
                            Authorization: 'Bearer ' + authentication.getPreRegToken()
                        }
                    }
                );
        };

        var updatePersonPhoto = function (personID, imageType, data) {
            var fd = new FormData();
            fd.append('file', data.file);
            return $http.post('api/pre-registration/photo/'+ personID + '/'  + imageType, fd,
                {
                    transformRequest: angular.identity,
                    headers: {
                        'Content-Type': undefined,
                        Authorization: 'Bearer ' + authentication.getPreRegToken()

                    }
                }
            );
        };

        return {
            emailFormImageNonStudent: emailFormImageNonStudent,
            emailFormImageMemberRU: emailFormImageMemberRU,
            thisPersonData: thisPersonData,
            addNewPersonData: addNewPersonData,
            updatePersonPhoto: updatePersonPhoto

        };
    };

    angular.module('managementApp')
        .service('preRegistration', preRegistration);
})();