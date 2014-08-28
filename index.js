'use strict';

var Assert = require('assert');
var Breaker = require('./lib/breaker');
var Stats = require('./lib/stats');


exports.Breaker = Breaker;
exports.Stats = Stats;


exports.createBreaker = function createBreaker(impl, options) {
    if (typeof impl === 'function') {
        impl = { execute: impl };
    }

    return new Breaker(impl, options);
};


exports.createStats = function createStats(command) {
    var stats;

    Assert.ok(command instanceof Breaker, 'Stats can only be created for Breaker instances.');

    stats = new Stats();

    command.on('execute', stats.increment.bind(stats, 'executions'));
    command.on('reject',  stats.increment.bind(stats, 'rejections'));
    command.on('success', stats.increment.bind(stats, 'successes'));
    command.on('failure', stats.increment.bind(stats, 'failures'));
    command.on('timeout', stats.increment.bind(stats, 'timeouts'));
    command.on('duration', stats.sample.bind(stats, 'duration'));

    return stats;
};
