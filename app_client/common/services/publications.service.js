(function(){
    var publications = function ($http, authentication) {

        var thisPersonPublications = function (personID) {
            return $http.get('api/publications/person/' + personID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };


        return {
            thisPersonPublications: thisPersonPublications,
        };
    };

    angular.module('managementApp')
        .service('publications', publications);
})();