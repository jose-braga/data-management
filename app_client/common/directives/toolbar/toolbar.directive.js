(function(){
    var toolbarRow = function () {
        return {
            restrict: 'E',
            templateUrl: 'common/directives/toolbar/toolbar.template.html'
        };
    };

    var toolbarCtrl = function ($scope, $timeout, $mdSidenav) {
        $scope.toggleLeft = buildToggler('left');

        function buildToggler(componentId) {
            return function() {
                $mdSidenav(componentId).toggle();
            };
        }
    };

    angular.module('managementApp')
        .directive('toolbarRow', toolbarRow)
        .controller('toolbarCtrl', toolbarCtrl)
        ;
})();