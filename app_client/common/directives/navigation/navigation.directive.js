(function(){
    var navigationColumn = function () {
        return {
            restrict: 'E',
            templateUrl: 'common/directives/navigation/navigation.template.html',
            controller: 'navigationCtrl',
            controllerAs: 'nav'
        };
    };
    
    angular.module('managementApp')
        .directive('navigationColumn', navigationColumn)
        ;
})();