'use strict';

var test = require('tape');
var http = require('http');
var levee = require('../');

test('levee', function (t) {

    var port, request, fallback1, fallback2;

    function before(done) {
        var server;

        server = http.createServer(function (req, res) {
            setTimeout(function () {
                res.end('ok');
            }, 7);
        });

        server.on('listening', function () {
            port = server.address().port;
            setTimeout(function () {
                console.log('Stopping Server');
                server.close();
            }, 10000);
            done();
        });

        server.on('close', function () {
            console.log('Server stopped.');
            setTimeout(before, 250, function () {
                console.log('Server started on port', port);
            });
        });

        server.listen();
    }


    fallback2 = {
        execute: function (context, callback) {
            callback(null, { message: 'DOUBLE FALLBACK!' });
        }
    };

    fallback1 = {

        calls: 0,

        execute: function (context, callback) {
            if (this.calls < 5 || this.calls > 1000) {
                callback(new Error('ENOENT'));
            } else {
                callback(null, { message: 'SINGLE FALLBACK!'});
            }
            this.calls += 1;
        }

    };


    request = {

        execute: function fetch(context, callback) {
            var req;

            req = http.get(context, function (res) {
                var body;

                body = [];

                res.on('readable', function () {
                    var chunk;
                    while ((chunk = res.read()) !== null) {
                        body.push(chunk);
                    }
                });

                res.on('end', function () {
                    callback(null, Buffer.concat(body));
                });
            });

            req.on('error', callback);
        }

    };


    before(function () {
        var calls = 10000;
        var failures = 5;

        var fb2 = levee(fallback2, { resetTimeout: 1000 });

        var fb1 = levee(fallback1, {resetTimeout: 500 });
        fb1.fallback = fb2;

        var breaker = levee(request, { resetTimeout: 5000 });
        breaker.fallback = fb1;

        breaker.on('open', function () {
            console.log('open');
        });

        breaker.on('half_open', function () {
            console.log('half_open');
        });

        breaker.on('close', function () {
            console.log('close');
        });

        (function run() {

            breaker.run('http://localhost:' + port, function (err, data) {
                if (!calls) {
                    t.end();
                }

                console.log(arguments);
//                console.log(breaker.stats);
//                console.log(fb1.stats);
//                console.log(fb2.stats);

                calls -= 1;

                if (calls) {
                    setTimeout(run, 5);
                    return;
                }

                t.end();
            });

        })();
    });







});