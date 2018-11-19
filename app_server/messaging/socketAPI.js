var socket_io = require('socket.io');
var moment = require('moment-timezone');

var io = socket_io();
var socketApi = {};

var history = [];
//var clients = [];

socketApi.io = io;

io.on('connection', function (socket){
    //console.log('A user connected');
    //console.log(socket.client.id);
    socket.emit('message_all', history);
});

function momentToDate(timedate, timezone, timeformat) {
    if (timezone === undefined) {
        timezone = 'Europe/Lisbon';
    }
    if (timeformat === undefined) {
        timeformat = 'YYYY-MM-DD';
    }
    return timedate !== null ? moment.tz(timedate,timezone).format(timeformat) : null;
}

socketApi.adminMessageAll = function (message) {
    history.push({msg: message, time: momentToDate(moment(),undefined,'YYYY-MM-DD HH:mm:ss')});
    io.sockets.emit('message_all', history);
};

socketApi.adminMessagesClear = function (option) {
    history = [];
    if (option === 'all') {
        io.sockets.emit('message_all', history);
    }
};

socketApi.getServerMessages = function () {
    return history;
};

module.exports = socketApi;