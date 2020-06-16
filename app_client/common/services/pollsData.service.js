(function(){
    var pollsData = function ($http, authentication) {

        var getActivePolls = function (personID) {
            // returns only the polls that the user has access to
            return $http.get('api/people/' + personID + '/polls',
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };
        var getPollData = function (personID, pollID) {
            // returns only the polls that the user has access to
            return $http.get('api/people/' + personID + '/polls/' + pollID,
                {
                    headers: {Authorization: 'Bearer ' + authentication.getToken()}
                }
            );
        };

        var votePoll = function (personID, pollID, data) {
            return $http.post('api/people/' + personID + '/polls/' + pollID, data,
                {
                    headers: { Authorization: 'Bearer ' + authentication.getToken() }
                }
            );
        };


        return {
            getActivePolls: getActivePolls,
            getPollData: getPollData,
            votePoll: votePoll,
        };
    };

    angular.module('managementApp')
        .service('pollsData', pollsData);
    })();