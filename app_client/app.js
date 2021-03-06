 (function(){
    // Current version: 1.0.0
    // TODO: 0 - AVOID LOCAL STORAGE
    // TODO: 0 - Change LAQV icon
    // TODO: 1 - Correct ordering by lab/office on manager
    // TODO: 2 - Email to FCT (revise with Teresa)

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
            .when('/unit-area/:unit', {
                templateUrl: 'unit-areas/unit-area.view.html',
                controller: 'unitAreaCtrl',
                controllerAs: 'vm'
            })
            .when('/unit-area/:unit/city/:city', {
                templateUrl: 'unit-areas/unit-area.view.html',
                controller: 'unitAreaCtrl',
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
            .when('/admin', {
                templateUrl: 'admin/admin.view.html',
                controller: 'adminCtrl',
                controllerAs: 'vm'
            })
            .when('/help', {
                templateUrl: 'help/help.view.html',
                controller: 'helpCtrl',
                controllerAs: 'vm'
            })
            .when('/internal-orders', {
                templateUrl: 'internal-orders/internal-orders.view.html',
                controller: 'ordersCtrl',
                controllerAs: 'vm'
            })
            .when('/polls', {
                templateUrl: 'polls/polls.view.html',
                controller: 'pollsCtrl',
                controllerAs: 'vm'
            })
            .when('/polls/:pollID', {
                templateUrl: 'polls/pollsQuestionnaire.html',
                controller: 'questCtrl',
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
            $compileProvider.imgSrcSanitizationWhitelist(/^\s*(localhost|https?|ftp|file|blob):|data:image\//);

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
                return m.isValid() ? m.toDate() : null;
            };
        })
        .config(function($mdAriaProvider) {$mdAriaProvider.disableWarnings();})
        ;
 })();