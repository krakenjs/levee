'use strict';

var test = require('tape');
var Stats = require('../lib/stats');


test('api', function (t) {
    var stats;

    stats = new Stats();
    t.ok(stats instanceof Stats);

    t.ok(stats.increment);
    t.ok(stats.decrement);
    t.ok(stats.sample);
    t.ok(stats.reset);
    t.ok(stats.resetCounts);
    t.ok(stats.resetSamples);
    t.ok(stats.snapshot);

    t.end();
});

test('counters', function (t) {
    var stats;

    stats = new Stats();
    t.equal(Object.keys(stats._counts).length, 0);

    stats.increment('foo');
    t.ok('foo' in stats._counts);
    t.equal(stats._counts.foo, 1);

    stats.decrement('foo');
    t.ok('foo' in stats._counts);
    t.equal(stats._counts.foo, 0);

    t.end();
});