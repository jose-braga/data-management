(function(){
var d3Factory = function () {


    return d3;
};

angular.module('managementApp')
    .factory('d3', d3Factory);
})();