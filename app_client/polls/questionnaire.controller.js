(function(){
    /******************************* Controllers **********************************/
        var questCtrl = function ($scope, $routeParams, $route, $q, $location,
                                    $timeout, $mdMedia, $mdPanel,
                                    personData, pollsData, authentication) {
            var vm = this;
            vm.isLoggedIn = authentication.isLoggedIn();
            vm.currentUser = authentication.currentUser();
            vm.toolbarData = {title: 'LAQV/UCIBIO polls'};
            vm.hasAccess = false;
            vm.pollData = [];
            let thisPollID = parseInt($routeParams.pollID, 10);

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

            vm.resetForm = function(form) {
                if (form) {
                    pollsData.getPollData(vm.currentUser.personID, thisPollID)
                        .then(function (response) {
                            vm.pollData = response.data.result;
                        });
                    form.$setPristine();
                    form.$setUntouched();
                }
            }

            vm.submitPoll = function (ind) {
                vm.updateStatus[ind] = "Sending data...";
                vm.messageType[ind] = 'message-updating';
                vm.hideMessage[ind] = false;
                let valid = true;
                for (let ind in vm.pollData.questions) {
                    if (vm.pollData.questions[ind].required
                            && vm.pollData.questions[ind].answer === undefined) {
                        valid = false;
                        break;
                    }
                }
                if (!valid) {
                    vm.updateStatus[ind] = "Please answer all required questions!";
                    vm.messageType[ind] = 'message-error';
                } else {
                    pollsData.votePoll(vm.currentUser.personID, thisPollID, vm.pollData)
                    .then(function (response) {
                        vm.updateStatus[ind] = "Voting successful!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () {
                            vm.hideMessage[ind] = true;
                            $location.path('/polls');
                        }, 1500);
                    })
                    .catch(function (err) {
                        vm.updateStatus[ind] = "An error occured!";
                        vm.messageType[ind] = 'message-error';
                        console.log(err);
                    });

                }

            };


            function initialize () {
                // first check if the person has access to this poll
                pollsData.getActivePolls(vm.currentUser.personID)
                .then(function (response) {
                    let activePolls = response.data.result;
                    for (let ind in activePolls) {
                        if (activePolls[ind].poll_id === thisPollID) {
                            vm.hasAccess = true;
                            break;
                        }
                    }
                    if (vm.hasAccess) {
                        pollsData.getPollData(vm.currentUser.personID, thisPollID)
                        .then(function (response) {
                            vm.pollData = response.data.result;
                        });
                    }
                })
                .catch(function (err) {
                    console.log(err);
                });
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
                var numberCards = 1;
                vm.updateStatus = [];
                vm.messageType = [];
                vm.hideMessage = [];
                for (var i=0; i<numberCards; i++) {
                    vm.updateStatus.push('');
                    vm.messageType.push('message-updating');
                    vm.hideMessage.push(true);
                }
            }
        };


    /**************************** Register components *****************************/
        angular.module('managementApp')

            .controller('questCtrl', questCtrl)
            ;
    })();