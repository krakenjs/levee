'use strict';

var test = require('tape');
var Levee = require('../');

var command = {
    execute: function execute(context, callback) {
        callback(null, context);
    }
};


test('breaker factory', function (t) {
    var breaker;

    breaker = Levee.createBreaker(command);
    t.ok(breaker instanceof Levee.Breaker);

    breaker = Levee.createBreaker(command.execute);
    t.ok(breaker instanceof Levee.Breaker);

    t.end();
});


test('stats factory', function (t) {
    var stats, breaker;

    t.throws(function () {
        stats = Levee.createStats();
    });

    breaker = Levee.createBreaker(command);
    t.ok(breaker);

    stats = Levee.createStats(breaker);
    t.ok(stats instanceof Levee.Stats);

    t.end();
});