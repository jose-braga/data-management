(function(){
var docsData = function ($http, authentication) {

    var getUnitActiveDocs = function (unitID) {
        return $http.get('api/docs/unit/' + unitID + '/active',
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var getUnitDocs = function (unitID) {
        return $http.get('api/docs/unit/' + unitID,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var createUnitDoc = function (unitID, data) {
        return $http.post('api/docs/unit/' + unitID, data,
            {
                transformRequest: angular.identity,
                headers: {
                    'Content-Type': undefined,
                    Authorization: 'Bearer ' + authentication.getToken()

                }
            }
        );
    };

    var deleteUnitDoc = function (unitID, docID) {
        return $http.delete('api/docs/unit/' + unitID + '/' + docID,
            {
                headers: {Authorization: 'Bearer ' + authentication.getToken()}
            }
        );
    };

    var updateUnitDoc = function (unitID, docID, data) {
        return $http.put('api/docs/unit/' + unitID + '/' + docID, data,
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
        getUnitActiveDocs: getUnitActiveDocs,
        getUnitDocs: getUnitDocs,
        createUnitDoc: createUnitDoc,
        updateUnitDoc: updateUnitDoc,
        deleteUnitDoc: deleteUnitDoc,
    };
};

angular.module('managementApp')
    .service('docsData', docsData);
})();