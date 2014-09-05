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

var failure = {
    execute: function execute(value, callback) {
        callback(new Error(value));
    }
};

var timeout = {
    execute: function execute(value, callback) {
        setTimeout(callback, 20, 'ok');
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
    var options, breaker, map;

    options = { resetTimeout: 50 };
    breaker = new Breaker(command, options);
    map = {
        open: { name: 'open', assertion: 'isOpen' },
        halfOpen: { name: 'half_open', assertion: 'isHalfOpen' },
        close: { name: 'close', assertion: 'isClosed' }
    };

    function transition(cb) {
        var previousState = 'close';
        var states = ['open', 'halfOpen', 'close', 'open'];
        var reverseMap = {};
        Object.keys(map).forEach(function (key) {
            var entry = map[key];
            reverseMap[entry.name] = key;
        });

        function _transition() {
            var state;
            if ((state = states.shift())) {
                breaker.once('state', function (newState, fromState) {
                    t.equal(newState, map[state].name);
                    t.equal(fromState, map[previousState].name);
                    Object.keys(map).forEach(function (key) {
                        var _test = breaker[map[key].assertion].bind(breaker);
                        if (key === state) {
                            t.ok(_test());
                        } else {
                            t.notOk(_test());
                        }
                    });
                    previousState = reverseMap[newState];
                    _transition();
                });
                breaker[state]();
            } else {
                cb();
            }
        };
        _transition();
    }

    // Default state
    t.ok(breaker.isClosed());

    transition(function () {
        setTimeout(function () {

            // Reset timeout expired, so should be half-open.
            t.ok(breaker.isHalfOpen());

            breaker.run('ok', function (err, data) {
                // Succeeded, so half-open should transition to closed.
                t.error(err);
                t.ok(data);
                t.ok(breaker.isClosed());
                t.end();
            });

        }, options.resetTimeout * 2);
    });

});


test('failure', function (t) {
    var breaker;

    breaker = new Breaker(failure, { maxFailures: 1 });

    t.ok(breaker.isClosed());

    breaker.run('not ok', function (err, data) {
        t.ok(err);
        t.equal(err.message, 'not ok');
        t.notOk(data);
        t.ok(breaker.isOpen());

        breaker.run('not ok', function (err, data) {
            t.ok(err);
            t.equal(err.message, 'Command not available.');
            t.notOk(data);
            t.ok(breaker.isOpen());
            t.end();
        });
    });
});


test('fallback', function (t) {
    var breaker, fallback;

    breaker = new Breaker(failure, { maxFailures: 2 });
    breaker.fallback = fallback = new Breaker(command);

    t.plan(13);
    t.ok(breaker.isClosed());
    t.ok(fallback.isClosed());

    breaker.on('failure', function () {
        t.ok('failed');
    });

    fallback.on('success', function () {
        t.ok('succeeded');
    });

    breaker.run('not ok', function (err, data) {
        t.ok(err);
        t.notOk(data);
        t.ok(breaker.isClosed());
        t.ok(fallback.isClosed());

        breaker.run('ok', function (err, data) {
            t.notOk(err);
            t.ok(data);
            t.ok(breaker.isOpen());
            t.ok(fallback.isClosed());
            t.end();
        });
    });
});


test('success with fallback', function (t) {
    var breaker, fallback;

    breaker = new Breaker(command);
    breaker.fallback = fallback = new Breaker(command);

    t.ok(breaker.isClosed());

    breaker.run('ok', function (err, data) {
        t.error(err);
        t.equal(data, 'ok');
        t.ok(breaker.isClosed());
        t.end();
    });
});


test('timeout', function (t) {
    var breaker;

    breaker = new Breaker(timeout, { timeout: 10, maxFailures: 1 });

    t.ok(breaker.isClosed());

    breaker.run('ok', function (err, data) {
        t.ok(err);
        t.equal(err.message, 'Command timeout.');
        t.notOk(data);
        t.ok(breaker.isOpen());
        t.end();
    });
});


test('multiple failures', function (t) {
    var breaker;

    breaker = new Breaker(failure);

    t.ok(breaker.isClosed());

    breaker.run('not ok', function (err, data) {
        t.ok(err);
        t.equal(err.message, 'not ok');
        t.notOk(data);
        t.ok(breaker.isClosed());

        breaker.run('not ok', function (err, data) {
            t.ok(err);
            t.equal(err.message, 'not ok');
            t.notOk(data);
            t.ok(breaker.isClosed());
            t.end();
        });
    });
});

test('recovery', function (t) {
    var called, impl, breaker;

    called = 0;

    impl = {
        execute: function failThenSucceed(value, callback) {
            called += 1;
            if (called <= 2) {
                callback(new Error(value));
                return;
            }
            callback(null, value);
        }
    };

    breaker = new Breaker(impl, { resetTimeout: 5, maxFailures: 1 });

    t.ok(breaker.isClosed());

    // Fail first time, so open
    breaker.run('not ok', function (err, data) {
        t.ok(err);
        t.equal(err.message, 'not ok');
        t.notOk(data);
        t.ok(breaker.isOpen());

        // Wait for reset
        setTimeout(function () {

            t.ok(breaker.isHalfOpen());

            // Fail second time, so re-open
            breaker.run('not ok', function (err, data) {
                t.ok(err);
                t.equal(err.message, 'not ok');
                t.notOk(data);
                t.ok(breaker.isOpen());

                // Wait for reset
                setTimeout(function () {

                    t.ok(breaker.isHalfOpen());

                    // Succeed 3..n times
                    breaker.run('ok', function (err, data) {
                        t.error(err);
                        t.equal(data, 'ok');
                        t.ok(breaker.isClosed());
                        t.end();
                    });

                }, 50);

            });

        }, 50);

    });
});
