(function(){
    var loginCtrl = function ($scope,$location, authentication) {
        var vm = this;

        vm.toolbarData = {
            title: 'Sign in page'
        };
        vm.credentials = {
            username : '',
            password : '',
            newPassword1 : '',
            newPassword2 : ''
        };
        vm.returnPage = $location.search().page || '/person';

        vm.showPasswordChange = false;
        vm.initialPassword = 'Password';
        vm.changeButtonTxt = 'Change Password';
        vm.submitButtonTxt = 'Login';

        vm.newPassClick = function() {
            vm.showPasswordChange = !vm.showPasswordChange;
            if (vm.showPasswordChange) {
                vm.initialPassword = 'Old password';
                vm.changeButtonTxt = 'No change';
                vm.submitButtonTxt = 'Submit';
            } else {
                vm.initialPassword = 'Password';
                vm.changeButtonTxt = 'Change Password';
                vm.submitButtonTxt = 'Login';
            }
        };
        vm.doLogin = function() {
            authentication
                .login(vm.credentials)
                .then(function(){
                    $location.search('page', null);
                    $location.path(vm.returnPage);
                })
                .catch(function(err){
                    alert('Error on authentication.');
                    console.log(err);
                });
        };
        vm.changePassword = function() {
            authentication
                .login(vm.credentials)
                .then(function () {
                    authentication
                        .changePassword(vm.credentials)
                        .then(function(){
                            $location.search('page', null);
                            $location.path(vm.returnPage);
                        })
                        .catch(function(err){
                            alert('Error on changing password.');
                            console.log(err);
                        });
                })
                .catch(function(err){
                    alert('Error on authentication.');
                    console.log(err);
                })
                ;
        };
        vm.onSubmit = function () {
           if (!vm.showPasswordChange){
                if (!vm.credentials.username || !vm.credentials.password) {
                    alert('All fields required, please try again');
                    return false;
                } else {
                    vm.doLogin();
                }
            } else {
                if (!vm.credentials.username || !vm.credentials.password
                    || !vm.credentials.newPassword1 || !vm.credentials.newPassword2) {
                    alert('All fields required, please try again');
                    return false;
                } else {
                    vm.changePassword();
                }

            }
        };
    };


    loginCtrl.$inject = ['$scope','$location','authentication'];

    /******************************** Directives **********************************/

    var changePasswordValidate = function () {
        return {
            require: 'ngModel',
            scope: {
                otherModelValue: "=changePasswordValidate"
            },
            link: function (scope, elm, attrs, ctrl) {
                ctrl.$validators.changePasswordValidate = function(modelValue) {
                    return modelValue == scope.otherModelValue;
                };
                scope.$watch("otherModelValue", function() {
                    ctrl.$validate();
                });
            }
        };
    };

    var loginNews = function () {
        return {
            restrict: 'E',
            templateUrl: 'login/login.news.html'
        };
    };

    var loginAuthentication = function () {
        return {
            restrict: 'E',
            templateUrl: 'login/login.authentication.html'
        };
    };

    angular
        .module('managementApp')

        .directive('loginNews',loginNews)
        .directive('loginAuthentication',loginAuthentication)

        .directive('changePasswordValidate',changePasswordValidate)

        .controller('loginCtrl', loginCtrl);
})();