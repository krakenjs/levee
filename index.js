'use strict';

var Levee = require('./lib/levee');
var Stats = require('./lib/stats');


module.exports = function (command, options) {
    var stats, circuit;

    if (typeof command === 'function') {
        command = {
            execute: command
        };
    }

    stats = new Stats();

    circuit = new Levee(command, options);
    circuit.__defineGetter__('stats', (function (stats) {
        return stats.snapshot.bind(stats);
    })(stats));

    circuit.on('execute', stats.increment.bind(stats, 'executions'));
    circuit.on('reject',  stats.increment.bind(stats, 'rejections'));
    circuit.on('success', stats.increment.bind(stats, 'successes'));
    circuit.on('failure', stats.increment.bind(stats, 'failures'));
    circuit.on('timeout', stats.increment.bind(stats, 'timeouts'));
    circuit.on('duration', stats.sample.bind(stats, 'duration'));

    return circuit;
};

