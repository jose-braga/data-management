 (function(){
    // Current version: 1.0.0
    // TODO: Actualizar help
    // TODO: 1 - Projects
    // TODO: 2 - Other productivity measurements: Patents, outreach, startups, prizes, datasets, boards, theses
    // TODO: 3 - Dashboards (visualization of indicators)

    // TODO: (Check if this doesn't happen!!!) When adding from ORCID check if the publication was not already added by someone

    // TODO: (future) Add automatic PDF generator
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
            .when('/help', {
                templateUrl: 'help/help.view.html',
                controller: 'helpCtrl',
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
                if (date === null || date === undefined) return null;
                return moment.tz(date, 'Europe/Lisbon').format('YYYY-MM-DD');
            };
            $mdDateLocaleProvider.parseDate = function(dateString) {
                if (dateString === null || dateString === undefined) return null;
                var m = moment.tz(dateString, 'Europe/Lisbon');
                return m.isValid() ? m.format('YYYY-MM-DD') : null;
            };
        })
        .config(function($mdAriaProvider) {$mdAriaProvider.disableWarnings();})
        ;
 })();