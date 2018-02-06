(function(){
    var navigationColumn = function () {
        return {
            restrict: 'E',
            templateUrl: 'common/directives/navigation/navigation.template.html',
            controller: 'navigationCtrl',
            controllerAs: 'nav'
        };
    };
    var navigationHighlights = function () {
        return {
            restrict: 'E',
            templateUrl: 'common/directives/navigation/navigation.highlights.html'
        };
    };

    angular.module('managementApp')
        .directive('navigationColumn', navigationColumn)
        .directive('navigationHighlights', navigationHighlights)
        ;
})();