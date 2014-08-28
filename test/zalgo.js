'use strict';

var test = require('tape');
var Zalgo = require('../lib/zalgo');


function sync(value, callback) {
    callback(null, value);
}

function async(value, callback) {
    setTimeout(callback, 0, null, value);
}

function syncContext(value, callback) {
    callback(null, this);
}


test('zalgo', function (t) {

    t.test('sync', function (t) {
        var fn, called;

        fn = Zalgo.contain(sync);
        t.equal(typeof fn, 'function');

        called = true;
        fn('ok', function (err, data) {
            t.error(err);
            t.equal(data, 'ok');
            t.notOk(called);
            t.end();
        });
        called = false;
    });


    t.test('async', function (t) {
        var fn, called;

        fn = Zalgo.contain(async);
        t.equal(typeof fn, 'function');

        called = true;
        fn('ok', function (err, data) {
            t.error(err);
            t.equal(data, 'ok');
            t.notOk(called);
            t.end();
        });
        called = false;
    });


    t.test('context', function (t) {
        var context, fn, called;

        context = {};
        fn = Zalgo.contain(syncContext, context);
        t.equal(typeof fn, 'function');

        called = true;
        fn('ok', function (err, data) {
            t.error(err);
            t.equal(data, context);
            t.notOk(called);
            t.end();
        });
        called = false;
    });


    t.test('nested wrappers', function (t) {
        var context, fn, called;

        context = {};
        fn = Zalgo.contain(syncContext, context);
        fn = Zalgo.contain(fn, context);
        t.equal(typeof fn, 'function');

        called = true;
        fn('ok', function (err, data) {
            t.error(err);
            t.equal(data, context);
            t.notOk(called);
            t.end();
        });
        called = false;
    });

});