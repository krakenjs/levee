'use strict';

var Wreck = require('wreck');
var Levee = require('../');
var Unreliable = require('./unreliable');


function request(circuit, done) {
    circuit.run('http://localhost:' + Unreliable.port, function (err, response, payload) {
        console.log(err || payload);
        setTimeout(request, 5, circuit, done);
    });
}


Unreliable.start(function () {
    var circuit;

    circuit = Levee.createBreaker(Wreck.get, { resetTimeout: 500 });
    circuit.fallback = Levee.createBreaker(function (context, callback) {
        // Should always succeed.
        callback(null, null, 'The requested application is currently not available.')
    });

    request(circuit, function () {
        console.log('test complete.');
    });
});

