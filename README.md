Levee
========

A [circuit breaker](http://doc.akka.io/docs/akka/snapshot/common/circuitbreaker.html) implementation based heavily on
ryanfitz's [node-circuitbreaker](https://github.com/ryanfitz/node-circuitbreaker).

[![Build Status](https://travis-ci.org/totherik/levee.svg)](https://travis-ci.org/totherik/levee)

#### Basic Usage
```javascript
'use strict';

var http = require('http');
var Levee = require('levee');


function service(url, callback) {
    var req;

    req = http.get(url, function (res) {
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
};


var options, circuit;

options = {
    maxFailures: 5,
    timeout: 60000,
    resetTimeout: 30000
};

circuit = Levee.createBreaker(service, options);
circuit.run('http://www.google.com', function (err, data) {
    // If the service fails or timeouts occur 5 consecutive times,
    // the breaker opens, fast failing subsequent requests.
    console.log(err || data);
});

```


#### Advanced Usage
```javascript

function fallback(url, callback) {
    callback(null, new Buffer('The requested website is not responding. Please try again later.'));
}

circuit = Levee.createBreaker(service, options);
circuit.fallback = Levee.createBreaker(fallback, options);

circuit.on('timeout', function () {
    console.log('Request timed out.');
});

circuit.on('failure', function (err) {
    console.log('Request failed.', err);
});

circuit.run('http://www.google.com', function (err, data) {
    // If the service fails or timeouts occur 5 consecutive times,
    // the breaker opens, fast failing subsequent requests.
    console.log(err || data);
});

var stats, fbStats;
stats = Levee.createStats(circuit);
fbStats = Levee.createStats(circuit.fallback);

// Print stats every 5 seconds.
setInterval(function () {
    console.log(stats.snapshot());
    console.log(fbStats.snapshot());
}, 5000);
```