//'use strict';
//
//var levee = require('../');
//
//var options, fallback1, fallback2, impl, command;
//
//options = {
//    timeout: 10000,
//    resetTimeout: 30000,
//    maxFailures: 5
//};
//
//
//fallback2 = {
//
//    execute: function fallback2(context, callback) {
//        callback(null, { message: 'Service 2 not available.' });
//    }
//};
//
//
//fallback1 = {
//
//    execute: function fallback1(context, callback) {
//        callback(new Error('borked again')/*, { message: 'Service 1 not available.' }*/);
//    }
//
//};
//
//impl = {
//
//    execute: function impl(context, callback) {
//        callback(new Error('borked')/*, { message: 'A OK!'}*/);
//    }
//
//};
//
//fallback2 = levee(fallback2, options);
//
//fallback1 = levee(fallback1, options);
//fallback1.fallback = fallback2;
//
//command = levee(impl, options);
//command.fallback = fallback1;
//
//command.run({}, function (err, data) {
//    console.log(err || data);
//});