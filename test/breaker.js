'use strict';

var test = require('tape');
var http = require('http');
var Breaker = require('../lib/breaker');
var Defaults = require('../lib/defaults');


var command = {
    execute: function execute(value, callback) {
        callback(null, value);
    }
};


test('api', function (t) {
    var levee;

    levee = new Breaker(command);

    // API
    t.ok(levee);
    t.ok(levee.run);
    t.ok(levee.isOpen);
    t.ok(levee.isHalfOpen);
    t.ok(levee.isClosed);
    t.ok(levee.open);
    t.ok(levee.halfOpen);
    t.ok(levee.close);

    // No fallback by default
    t.notOk(levee.fallback);

    // Settings
    t.ok(levee.settings);
    t.equal(levee.settings.maxFailures,  Defaults.Breaker.maxFailures);
    t.equal(levee.settings.timeout,      Defaults.Breaker.timeout);
    t.equal(levee.settings.resetTimeout, Defaults.Breaker.resetTimeout);

    // State
    t.ok(levee.isClosed());
    t.notOk(levee.isOpen());
    t.notOk(levee.isHalfOpen());

    t.end();
});


test('states', function (t) {
    var options, breaker;

    options = { resetTimeout: 50 };
    breaker = new Breaker(command, options);

    // Default state
    t.ok(breaker.isClosed());

    breaker.open();
    t.ok(breaker.isOpen());
    t.notOk(breaker.isClosed());
    t.notOk(breaker.isHalfOpen());

    breaker.halfOpen();
    t.notOk(breaker.isOpen());
    t.notOk(breaker.isClosed());
    t.ok(breaker.isHalfOpen());

    breaker.close();
    t.notOk(breaker.isOpen());
    t.ok(breaker.isClosed());
    t.notOk(breaker.isHalfOpen());

    // Break the Breaker
    breaker.open();
    t.ok(breaker.isOpen());

    setTimeout(function () {

        // Reset timeout expired, so should be half-open.
        t.ok(breaker.isHalfOpen());

        breaker.run('ok', function (err, data) {
            // Succeeded, so half-open should transition to closed.
            t.error(err);
            t.ok(data, 'ok');
            t.ok(breaker.isClosed());
            t.end();
        });

    }, options.resetTimeout * 2);

});


//test('levee_run', function (t) {
//
//    var port, request, fallback1, fallback2;
//
//    function before(done) {
//        var server;
//
//        server = http.createServer(function (req, res) {
//            setTimeout(function () {
//                res.end('ok');
//            }, 7);
//        });
//
//        server.on('listening', function () {
//            port = server.address().port;
//            setTimeout(function () {
//                console.log('Stopping Server');
//                server.close();
//            }, 10000);
//            done();
//        });
//
//        server.on('close', function () {
//            console.log('Server stopped.');
//            setTimeout(before, 250, function () {
//                console.log('Server started on port', port);
//            });
//        });
//
//        server.listen();
//    }
//
//
//    fallback2 = {
//        execute: function (context, callback) {
//            callback(null, { message: 'DOUBLE FALLBACK!' });
//        }
//    };
//
//    fallback1 = {
//
//        calls: 0,
//
//        execute: function (context, callback) {
//            if (this.calls < 5 || this.calls > 1000) {
//                callback(new Error('ENOENT'));
//            } else {
//                callback(null, { message: 'SINGLE FALLBACK!'});
//            }
//            this.calls += 1;
//        }
//
//    };
//
//
//    request = {
//
//        execute: function fetch(context, callback) {
//            var req;
//
//            req = http.get(context, function (res) {
//                var body;
//
//                body = [];
//
//                res.on('readable', function () {
//                    var chunk;
//                    while ((chunk = res.read()) !== null) {
//                        body.push(chunk);
//                    }
//                });
//
//                res.on('end', function () {
//                    callback(null, Buffer.concat(body));
//                });
//            });
//
//            req.on('error', callback);
//        }
//
//    };
//
//
//    before(function () {
//        var calls = 10000;
//        var failures = 5;
//
//        var fb2 = Breaker.createCommand(fallback2, { resetTimeout: 1000 });
//
//        var fb1 = Breaker.createCommand(fallback1, {resetTimeout: 500 });
//        fb1.fallback = fb2;
//
//        var breaker = Breaker.createCommand(request, { resetTimeout: 5000 });
//        breaker.fallback = fb1;
//
////        breaker.on('open', function () {
////            console.log('open');
////        });
////
////        breaker.on('half_open', function () {
////            console.log('half_open');
////        });
////
////        breaker.on('close', function () {
////            console.log('close');
////        });
//
//        (function run() {
//
//            breaker.run('http://localhost:' + port, function (err, data) {
//                if (!calls) {
//                    t.end();
//                }
//
//                console.log(arguments);
////                console.log(breaker.stats);
////                console.log(fb1.stats);
////                console.log(fb2.stats);
//
//                calls -= 1;
//
//                if (calls) {
//                    setTimeout(run, 5);
//                    return;
//                }
//
//                t.end();
//            });
//
//        })();
//    });
//
//
//});