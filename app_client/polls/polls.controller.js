(function(){
    /******************************* Controllers **********************************/
        var pollsCtrl = function ($scope, $routeParams, $route, $q, $location,
                                    $timeout, $mdMedia, $mdPanel,
                                    personData, pollsData, authentication) {
            var vm = this;
            vm.isLoggedIn = authentication.isLoggedIn();
            vm.currentUser = authentication.currentUser();
            vm.toolbarData = {title: 'LAQV/UCIBIO polls'};

            initialize();
            initializeInterface();

            vm.newPassClick = function () {
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
            vm.doLogin = function () {
                authentication
                    .login(vm.credentials)
                    .then(function () {
                        $route.reload();
                    })
                    .catch(function (err) {
                        alert('Error on authentication.');
                        console.log(err);
                    });
            };
            vm.changePassword = function () {
                authentication
                    .login(vm.credentials)
                    .then(function () {
                        authentication
                            .changePassword(vm.credentials)
                            .then(function () {
                                $location.search('page', null);
                                $location.path(vm.returnPage);
                            })
                            .catch(function (err) {
                                alert('Error on changing password.');
                                console.log(err);
                            });
                    })
                    .catch(function (err) {
                        alert('Error on authentication.');
                        console.log(err);
                    })
                    ;
            };
            vm.onSubmit = function () {
                if (!vm.showPasswordChange) {
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

            function initialize () {
                if (vm.currentUser) {
                    pollsData.getActivePolls(vm.currentUser.personID)
                    .then(function (response) {
                        vm.activePolls = response.data.result;
                        for (let ind in vm.activePolls) {
                            let date_split
                            if (vm.activePolls[ind].valid_from !== null) {
                                date_split = vm.activePolls[ind].valid_from.split('T')
                                vm.activePolls[ind].date_from = date_split[0];
                                vm.activePolls[ind].time_from = '@ ' + date_split[1].replace('.000Z','');
                            } else {
                                vm.activePolls[ind].date_from = '-∞';
                                vm.activePolls[ind].time_from = '';
                            }
                            if (vm.activePolls[ind].valid_until !== null) {
                                date_split = vm.activePolls[ind].valid_until.split('T')
                                vm.activePolls[ind].date_until = date_split[0];
                                vm.activePolls[ind].time_until = '@ ' + date_split[1].replace('.000Z','');
                            } else {
                                vm.activePolls[ind].date_until = '+∞';
                                vm.activePolls[ind].time_until = '';
                            }
                        }
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
                }

            }
            function initializeInterface() {
                vm.credentials = {
                    username: '',
                    password: '',
                    newPassword1: '',
                    newPassword2: ''
                };
                vm.showPasswordChange = false;
                vm.initialPassword = 'Password';
                vm.changeButtonTxt = 'Change Password';
                vm.submitButtonTxt = 'Login';
            }
        };

    /******************************** Directives **********************************/

        var pollsList = function () {
            return {
                restrict: 'E',
                templateUrl: 'polls/pollsList.html'
            };
        };


    /**************************** Register components *****************************/
        angular.module('managementApp')
            .directive('pollsList', pollsList)

            .controller('pollsCtrl', pollsCtrl)
            ;
    })();