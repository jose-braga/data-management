 (function(){
    // Current version: 1.0.0

    // TODO: (future) Add automatic PDF generator
    // TODO: (future) interface improvement - "Myself" (current affiliations); "Manager" list show only current affiliations
    // TODO: (future) easier administration - Delete user from all tables

    var config = function ($routeProvider, $locationProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'login/login.view.html',
                controller: 'loginCtrl',
                controllerAs: 'vm'
            })
            .when('/person', {
                templateUrl: 'person/person.view.html',
                controller: 'personCtrl',
                controllerAs: 'vm'
            })
            .when('/team', {
                templateUrl: 'team/team.view.html',
                controller: 'teamCtrl',
                controllerAs: 'vm'
            })
            .when('/pre-register/:username/:password', {
                templateUrl: 'pre-register/pre-register.view.html',
                controller: 'preRegCtrl',
                controllerAs: 'vm'
            })
            .when('/unit', {
                templateUrl: 'unit/unit.view.html',
                controller: 'unitCtrl',
                controllerAs: 'vm'
            })
            .when('/manager', {
                templateUrl: 'manager/manager.view.html',
                controller: 'managerCtrl',
                controllerAs: 'vm'
            })
            .when('/registration', {
                templateUrl: 'registration/registration.view.html',
                controller: 'registrationCtrl',
                controllerAs: 'vm'
            })
            .otherwise({redirectTo: '/'});

        $locationProvider.html5Mode(true);
    };

     angular.module('managementApp', ['ngMaterial','ngRoute', 'ngMessages','ngMdIcons','ngFileUpload','uiCropper'])
        // comment this config when debugging
        .config(['$compileProvider', function ($compileProvider) {
            $compileProvider.debugInfoEnabled(false);
            $compileProvider.commentDirectivesEnabled(false);
            $compileProvider.cssClassDirectivesEnabled(false);
        }])
        .config(['$routeProvider', '$locationProvider', config])
        .config(function($mdDateLocaleProvider) {
            $mdDateLocaleProvider.formatDate = function(date) {
                if (date == null) return date;
                return moment.tz(date, 'Europe/Lisbon').format('YYYY-MM-DD');
            };
            $mdDateLocaleProvider.parseDate = function(dateString) {
                if (dateString == null) return dateString;
                var m = moment.tz(dateString, 'Europe/Lisbon');
                return m.isValid() ? m.format('YYYY-MM-DD') : new Date(NaN);
            };
        })
        ;
 })();