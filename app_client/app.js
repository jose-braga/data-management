 (function(){
    // Current version: 0.1.2
    // TODO: (v0.2.0) Add automatic PDF generator

    // TODO: (v1.0.0) Productivity (publications)
    // TODO: (v1.0.0) add Author names on 'MySelf'/Scientific and 'MySelf'/Technician

    // TODO: (v1.?.?) Add photos
    // TODO: (v1.?.?) ??? change getUser and similar functions to connection and connection.release???
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
            /*.when('/unit', {
                templateUrl: 'unit/unit.view.html',
                controller: 'unitCtrl',
                controllerAs: 'vm'
            })*/
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

     angular.module('managementApp', ['ngMaterial','ngRoute', 'ngMessages','ngMdIcons'])
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