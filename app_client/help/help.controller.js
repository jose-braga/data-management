(function(){
/******************************* Controllers **********************************/
    var helpCtrl = function ($scope, $timeout, $mdMedia) {

        var vm = this;
        vm.toolbarData = {title: 'Select the section where help is needed:'};

    };




/******************************** Directives **********************************/

    var helpGeneral = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/general/help.general.html'
        };
    };

    var helpLogin = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/login/help.login.html'
        };
    };
    var helpMyselfPersonal = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/myself/help.myselfPersonal.html'
        };
    };
    var helpMyselfAcademic = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/myself/help.myselfAcademic.html'
        };
    };
    var helpMyselfInstitutional = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/myself/help.myselfInstitutional.html'
        };
    };
    var helpMyselfRoles = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/myself/help.myselfRoles.html'
        };
    };
    var helpMyselfProfessional = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/myself/help.myselfProfessional.html'
        };
    };
    var helpMyselfPublications = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/myself/help.myselfPublications.html'
        };
    };
    var helpTeamMembers = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/team/help.teamMembers.html'
        };
    };
    var helpTeamPublications = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/team/help.teamPublications.html'
        };
    };
    var helpTeamPreRegistration = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/team/help.teamPreRegistration.html'
        };
    };
    var helpManagerMembers = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/manager/help.managerMembers.html'
        };
    };
    var helpManagerValidate = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/manager/help.managerValidate.html'
        };
    };
    var helpManagerAddMember = function () {
        return {
            restrict: 'E',
            templateUrl: 'help/manager/help.managerAddMember.html'
        };
    };


/**************************** Register components *****************************/
    angular.module('managementApp')
        .directive('helpGeneral', helpGeneral)
        .directive('helpLogin', helpLogin)
        .directive('helpMyselfPersonal', helpMyselfPersonal)
        .directive('helpMyselfAcademic', helpMyselfAcademic)
        .directive('helpMyselfInstitutional', helpMyselfInstitutional)
        .directive('helpMyselfRoles', helpMyselfRoles)
        .directive('helpMyselfProfessional', helpMyselfProfessional)
        .directive('helpMyselfPublications', helpMyselfPublications)
        .directive('helpTeamMembers', helpTeamMembers)
        .directive('helpTeamPublications', helpTeamPublications)
        .directive('helpTeamPreRegistration', helpTeamPreRegistration)
        .directive('helpManagerMembers', helpManagerMembers)
        .directive('helpManagerValidate', helpManagerValidate)
        .directive('helpManagerAddMember', helpManagerAddMember)

        .controller('helpCtrl',  helpCtrl)

        ;
})();
