(function(){
var statData = function ($http, authentication) {

    var getGenderDistribution = function (unitID) {
        return $http.get('api/stats/gender-distribution/' + unitID,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };
    var getPositionsDistribution = function (unitID) {
        return $http.get('api/stats/positions-distribution/' + unitID,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };
    var getPoleDistribution = function (unitID) {
        return $http.get('api/stats/pole-distribution/' + unitID,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var getPublicationsByYear = function (unitID) {
        return $http.get('api/stats/publications-by-year/' + unitID,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };



    return {
        getGenderDistribution: getGenderDistribution,
        getPositionsDistribution: getPositionsDistribution,
        getPoleDistribution: getPoleDistribution,
        getPublicationsByYear: getPublicationsByYear,
    };
};

angular.module('managementApp')
    .service('statData', statData);
})();