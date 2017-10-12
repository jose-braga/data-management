(function(){
    var preRegistration = function ($http, authentication) {

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
            thisPersonData: thisPersonData,
            addNewPersonData: addNewPersonData,
            updatePersonPhoto: updatePersonPhoto

        };
    };

    angular.module('managementApp')
        .service('preRegistration', preRegistration);
})();