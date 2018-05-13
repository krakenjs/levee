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

    stats.increment('foo');
    t.equal(stats._counts.foo, 2);

    stats.decrement('foo');
    t.ok('foo' in stats._counts);
    t.equal(stats._counts.foo, 1);

    stats.decrement('foo');
    t.equal(stats._counts.foo, 0);

    stats.decrement('bar');
    t.notOk('bar' in stats._counts);

    t.end();
});


test('sample', function (t) {
    var stats;

    stats = new Stats();
    t.equal(Object.keys(stats._samples).length, 0);

    stats.sample('foo', 10);
    t.ok('foo' in stats._samples);
    t.equal(stats._samples.foo.get(0), 10);

    stats.sample('foo', 11);
    t.ok('foo' in stats._samples);
    t.equal(stats._samples.foo.get(1), 11);

    stats.sample('bar', 12);
    t.ok('bar' in stats._samples);
    t.equal(stats._samples.bar.get(0), 12);

    t.end();
});

test('maxSamples', function (t) {
    var stats;

    stats = new Stats({ maxSamples: 2 });
    t.equal(Object.keys(stats._samples).length, 0);

    stats.sample('foo', 10);
    t.equal(stats._samples.foo.toArray().length, 1);
    t.ok('foo' in stats._samples);
    t.equal(stats._samples.foo.get(0), 10);

    stats.sample('foo', 11);
    t.equal(stats._samples.foo.toArray().length, 2);
    t.ok('foo' in stats._samples);
    t.equal(stats._samples.foo.get(1), 11);

    stats.sample('foo', 12);
    t.equal(stats._samples.foo.toArray().length, 2);

    t.end();
});

test('maxSamplesDefault', function (t) {
    var stats, i;

    stats = new Stats();

    for (i = 0; i < 1000; i++) {
        stats.sample('foo', i);
    }
    t.equal(stats._samples.foo.toArray().length, 1000);
    stats.sample('foo', 1001);
    t.equal(stats._samples.foo.toArray().length, 1000);

    t.end();
});

test('reset', function (t) {
    var stats;

    stats = new Stats();

    stats.increment('foo');
    t.ok('foo' in stats._counts);
    t.equal(stats._counts.foo, 1);

    stats.sample('foo', 10);
    t.ok('foo' in stats._samples);
    t.equal(stats._samples.foo.get(0), 10);

    stats.reset();
    t.equal(stats._counts.foo, 0);
    t.equal(stats._samples.foo[0], undefined);

    t.end();
});


test('snapshot', function (t) {
    var stats, data;

    stats = new Stats();
    stats.increment('foo');
    stats.sample('foo', 10);
    stats.sample('foo', 10);

    data = stats.snapshot();
    t.ok(data.counts);
    t.equal(data.counts.foo, 1);

    t.ok(data.samples);
    t.ok(data.samples.foo);
    t.equal(data.samples.foo.average, 10);
    t.equal(data.samples.foo.count, 2);
    t.end();
});
