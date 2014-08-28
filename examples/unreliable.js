'use strict';

var http = require('http');
var port;


function cycle(server, done) {
    server.once('listening', function () {
        port = server.address().port;
        setTimeout(server.close.bind(server), 10000);
        done();
    });

    server.once('close', function () {
        setTimeout(cycle, 250, server, function () {
            console.log('Server listening on port %d', port);
        });
    });

    server.listen();
}


function start(next) {
    var server;

    server = http.createServer(function (req, res) {
        setTimeout(function () {
            res.end('ok');
        }, 7);
    });

    cycle(server, next);
}


module.exports = {

    start: start,

    get port () {
        return port;
    }

};

