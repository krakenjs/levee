Levee
========

A [circuit breaker](http://doc.akka.io/docs/akka/snapshot/common/circuitbreaker.html) implementation based heavily on
ryanfitz's [node-circuitbreaker](https://github.com/ryanfitz/node-circuitbreaker). More information about the circuitbreaker
pattern can be found in the [akka documentation](https://doc.akka.io/docs/akka/current/common/circuitbreaker.html).

[![Build Status](https://travis-ci.org/krakenjs/levee.svg)](https://travis-ci.org/krakenjs/levee) [![Greenkeeper badge](https://badges.greenkeeper.io/krakenjs/levee.svg)](https://greenkeeper.io/)

#### Basic Usage
```javascript
'use strict';

var Levee = require('levee');
var Wreck = require('wreck');

var options, circuit;

options = {
    maxFailures: 5,
    timeout: 60000,
    resetTimeout: 30000
};

circuit = Levee.createBreaker(Wreck.get, options);
circuit.run('http://www.google.com', function (err, req, payload) {
    // If the service fails or timeouts occur 5 consecutive times,
    // the breaker opens, fast failing subsequent requests.
    console.log(err || payload);
});

```


#### Advanced Usage
```javascript

function fallback(url, callback) {
    callback(null, null, new Buffer('The requested website is not available. Please try again later.'));
}

breaker = Levee.createBreaker(service, options);
breaker.fallback = Levee.createBreaker(fallback, options);

breaker.on('timeout', function () {
    console.log('Request timed out.');
});

breaker.on('failure', function (err) {
    console.log('Request failed.', err);
});

breaker.run('http://www.google.com', function (err, req, payload) {
    // If the service fails or timeouts occur 5 consecutive times,
    // the breaker opens, fast failing subsequent requests.
    console.log(err || payload);
});

var stats, fbStats;
stats = Levee.createStats(breaker);
fbStats = Levee.createStats(breaker.fallback);

// Print stats every 5 seconds.
setInterval(function () {
    console.log(stats.snapshot());
    console.log(fbStats.snapshot());
}, 5000);
```



## API

### new Breaker(command [, options])
Creates a new Breaker instance with the following arguments:
- `command` -  an object with a property named `execute` with value being a function using the signature:
    `function (context, callback)` where:
    - `context` - Any context needed to execute the desired behavior.
    - `callback` - A callback function with the signature `function (err, [arg1, arg2, ...])`

```javascript
var Levee = require('levee');

var breaker = new Levee.Breaker({ execute: fn }, options);
```

### createBreaker(command [, options])
An alternative method for creating Breaker instances with the following arguments:
- `command` - either function or an object with a property named `execute` with value being a function using the signature:
    `function (context, callback)` where:
    - `context` - Any context needed to execute the desired behavior.
    - `callback` - A callback function with the signature `function (err, [arg1, arg2, ...])`

```javascript
var Levee = require('levee');

function fn(context, callback) {
    callback(null, 'ok');
}

var breaker = Levee.createBreaker(fn, options);
```

### new Stats(breaker)
Create a new Stats instance with the following argument:
- `breaker` - a Breaker instance

```javascript
var Levee = require('levee');

var breaker = new Levee.Stats(breaker);
```

### createStats(breaker)
An alternative method for creating a new Stats instance with the following argument:
- `breaker` - a Breaker instance

```javascript
var Levee = require('levee');

var breaker = Levee.createStats(breaker);
```


## Breaker

`new Levee.Breaker(command, options)` or `Levee.createBreaker(command, options)`

#### Options
##### `timeout`
the amount of time to allow an operation to run before terminating with an error. In case the command execution exceeds the configured timeout, the run callback will be provided with an error with the `ETIMEDOUT` code.

##### `maxFailures`
the number of failures allowed before the Breaker enters the `open` state. Once the breaker enters this state, the run callback will be provided with an error with the `EUNAVAILABLE` code.

##### `resetTimeout`
the amount of time to wait before switch the Breaker from the `open` to `half_open` state to attempt recovery.

##### `isFailure`
function that returns true if an error should be considered a failure (receives the error object returned by your command.) This allows for non-critical errors to be ignored by the circuit breaker.

##### `timeoutErrMsg`
Custom error message to be used, for timeout error.

##### `openErrMsg`
Custom error message to be used, when circuit is open and command is not available.

#### Properties
##### `fallback`
a Breaker instance to fallback to in the case of the Breaker entering the `open` state.

#### Methods
##### `run(context, callback)`
Executes the wrapped functionality within the circuit breaker functionality with the arguments:

- `context` - any context to be provided to the implementation.
- `callback` - the callback to be fired upon completion with the signature `function (err, [param1, param2, ...])`
  - `err` - any error ocurred during the command execution or a levee error caused either by timeout or an open circuit


## Stats
`new Levee.Stats(breaker, options)` or `Levee.createStats(breaker, options)`

A simple data aggregation object.

#### Options
##### `maxSamples`
Restricts the length of duration samples. The default value is `1000`.

#### Methods

##### `increment(name)`
Increment a named counter.
- `name` - the label of the counter to increment.

##### `decrement(name)`
Decrement a named counter.
- `name` - the label of the counter to decrement.

##### `sample(name, value)`
Take a sample of a given value.
- `name` - the label of the sample being recorded.
- `value` - the sample value being recorded.

##### `snapshot()`
Get the current state of the current Stats instance. Returns an object with the following properties:
- `counts` - A map of names to current count values.
- `samples` - A map of names to current sample averages and counts, in the form of: `{ average: 0, count, 0 }`

##### `reset()`
Resets all counts and samples.

##### `resetCounts([name])`
Reset counts for the provided name. If no name is provided, resets all counts.
- `name` - the label of the count to reset.

##### `resetSamples([name])`
Reset samples for the provided name. If no name is provided, resets all samples.
- `name` - the label of the sample to reset.
