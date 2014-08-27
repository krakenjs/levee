'use strict';

var test = require('tape');
var http = require('http');
var levee = require('../');


function execute(value, callback) {
    callback(null, value);
}

test('levee', function (t) {
    var breaker;

    breaker = levee(execute);

    // API
    t.ok(breaker);
    t.ok(breaker.stats);
    t.ok(breaker.run);
    t.ok(breaker.isOpen);
    t.ok(breaker.isHalfOpen);
    t.ok(breaker.isClosed);
    t.ok(breaker.open);
    t.ok(breaker.halfOpen);
    t.ok(breaker.close);

    // Settings
    t.equal(breaker.fallback, undefined);
    t.equal(breaker.maxFailures, 5);
    t.equal(breaker.timeout, 10000);
    t.equal(breaker.resetTimeout, 60000);

    // State
    t.ok(breaker.isClosed());
    t.notOk(breaker.isOpen());
    t.notOk(breaker.isHalfOpen());

    t.end();
});


test('states', function (t) {
    var breaker;

    breaker = levee(execute, { resetTimeout: 50 });

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

    // Break the levee
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

    }, breaker.resetTimeout * 2);

});


test('levee_run', function (t) {

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