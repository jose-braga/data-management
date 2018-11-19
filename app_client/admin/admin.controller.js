(function(){
/******************************* Controllers **********************************/
    var adminCtrl = function ($scope, $timeout, personData, adminData, authentication) {
        var vm = this;
        vm.toolbarData = {title: 'Admin tools'};
        vm.isLoggedIn = authentication.isLoggedIn();
        vm.messagesHistoryClients = [];
        vm.messagesHistoryServer = [];

        initializeInterface();

        vm.submitMessageAll = function(ind, msg) {
            if (msg !== '' && msg !== null && msg !== undefined) {
                vm.updateStatus[ind] = "Sending...";
                vm.messageType[ind] = 'message-updating';
                vm.hideMessage[ind] = false;
                var message_all = {'message_all': msg};
                // this time will be a few seconds different from the one that is saved in the server
                var time = momentToDate(moment(),undefined,'YYYY-MM-DD HH:mm:ss');
                adminData.sendAdminMessageAllServer(message_all)
                    .then( function () {
                        vm.updateStatus[ind] = "Sent!";
                        vm.messageType[ind] = 'message-success';
                        vm.hideMessage[ind] = false;
                        $timeout(function () {
                            vm.hideMessage[ind] = true;
                            vm.messageAll = '';
                            vm.messagesHistoryClients.push({msg: msg, time: time});
                            vm.messagesHistoryServer.push({msg: msg, time: time});
                        }, 1500);
                    },
                    function () {
                        vm.updateStatus[ind] = "Error!";
                        vm.messageType[ind] = 'message-error';
                    },
                    function () {}
                    );
            }
            return false;
        };

        vm.submitMessagesClear = function(ind, option) {
            vm.updateStatus[ind] = "Clearing...";
            vm.messageType[ind] = 'message-updating';
            vm.hideMessage[ind] = false;
            adminData.sendAdminMessageClear(option)
                .then( function () {
                    if (option === 'all') {
                        vm.updateStatus[ind] = "Cleared all clients!";
                        vm.messagesHistoryClients = [];
                        vm.messagesHistoryServer = [];
                    } else {
                        vm.updateStatus[ind] = "Cleared server history!";
                        vm.messagesHistoryServer = [];
                    }
                    vm.messageType[ind] = 'message-success';
                    vm.hideMessage[ind] = false;
                    $timeout(function () {
                        vm.hideMessage[ind] = true;
                        vm.messageAll = '';
                    }, 1500);
                },
                function () {
                    vm.updateStatus[ind] = "Error!";
                    vm.messageType[ind] = 'message-error';
                },
                function () {}
                );
            return false;
        };

        function initializeInterface() {
            var formsArray = ['messageAll','clearMessageClients','clearMessageServer'];
            vm.updateStatus = [];
            vm.messageType = [];
            vm.hideMessage = [];
            vm.forms = {};
            for (var el in formsArray) {
                vm.forms[formsArray[el]] = el;
                vm.updateStatus.push('');
                vm.messageType.push('message-updating');
                vm.hideMessage.push(true);
            }
            adminData.getServerMessages()
                    .then( function (response) {
                        vm.messagesHistoryServer = response.data.result;
                        vm.messagesHistoryClients  = Object.assign([], vm.messagesHistoryServer);
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
        }
        function momentToDate(timedate, timezone, timeformat) {
            if (timezone === undefined) {
                timezone = 'Europe/Lisbon';
            }
            if (timeformat === undefined) {
                timeformat = 'YYYY-MM-DD';
            }
            return timedate !== null ? moment.tz(timedate,timezone).format(timeformat) : null;
        }
    };

/******************************** Directives **********************************/
    var adminMessage = function () {
        return {
            restrict: 'E',
            templateUrl: 'admin/message/admin.message.html'
        };
    };

/**************************** Register components *****************************/
    angular.module('managementApp')
        .directive('adminMessage', adminMessage)


        .controller('adminCtrl',  adminCtrl)
        ;

})();