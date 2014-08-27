levee
========

A [circuit breaker](http://doc.akka.io/docs/akka/snapshot/common/circuitbreaker.html) implementation based heavily on
ryanfitz's [node-circuitbreaker](https://github.com/ryanfitz/node-circuitbreaker).


#### Basic Usage
```javascript
'use strict';

var http = require('http');
var levee = require('levee');


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

circuit = levee(service, options);
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

circuit = levee(service, fallback, options);
// or: `circuit.fallback = levee(fallback, options);`

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

// Print stats every 5 seconds.
setInterval(function () {
    console.log(circuit.stats);
    console.log(circuit.fallback.stats);
}, 5000);
```