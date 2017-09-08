(function(){
    var navigationCtrl = function ($scope, $location, authentication) {
        var nav = this;

        nav.currentPath = $location.path();

        nav.currentUser = authentication.currentUser();
        nav.isLoggedIn = authentication.isLoggedIn();

        nav.selected = function(page) {
            if(nav.currentPath === page) {
                return 'md-raised';
            } else {
                return 'md-primary';
            }

        };

        if ($location.path() === '/' && nav.isLoggedIn) {
            $location.path('/person');
        }

        if (nav.currentUser !== null) {
            var permissionsManagerPage = [0, 5, 10, 15];
            if (permissionsManagerPage.indexOf(nav.currentUser.stat) !== -1) {
                nav.showManager = true;
            } else {
                nav.showManager = false;
            }

            if (nav.currentUser.stat === 0) {
                nav.showAdmin = true;
            } else {
                nav.showAdmin = false;
            }
        }
        nav.logout = function() {
            $location.path('/');
            authentication.logout();
        };

    };

    navigationCtrl.$inject = ['$scope', '$location', 'authentication'];

    angular
        .module('managementApp')
        .controller('navigationCtrl', navigationCtrl);
})();