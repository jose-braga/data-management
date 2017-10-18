(function(){
/******************************* Controllers **********************************/
    var unitCtrl = function ($scope, $timeout, $mdMedia, $mdPanel,
                            personData, publications, authentication) {
        var vm = this;
        vm.toolbarData = {title: 'Unit statistics and information'};
        vm.isLoggedIn = authentication.isLoggedIn();
        vm.currentUser = authentication.currentUser();

        initializeVariables();

        function initializeVariables() {
            vm.accessPermission = authentication.access('unit');
        }


    };

    /******************************** Directives **********************************/


    /**************************** Register components *****************************/
    angular.module('managementApp')

        .controller('unitCtrl', unitCtrl)
        ;
})();