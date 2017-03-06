'use strict';

var Util = require('util');
var Hoek = require('hoek');
var Events = require('events');
var Assert = require('assert');
var Zalgo = require('./zalgo');
var Defaults = require('./defaults');


function Breaker(impl, options) {
    Events.EventEmitter.call(this);

    Assert.equal(typeof impl, 'object', 'The command implementation must be an object.');
    Assert.equal(typeof impl.execute, 'function', 'The command implementation must have a method named `execute`.');

    this.settings = Hoek.applyToDefaults(Defaults.Breaker, options || {});
    this.fallback = undefined;

    this._impl = impl;
    this._state = Breaker.State.CLOSE;
    this._numFailures = 0;
    this._pendingClose = false;
    this._resetTimer = undefined;

    this.on('open', this._startTimer);
}

Util.inherits(Breaker, Events.EventEmitter);

Breaker.State = Object.freeze({
    OPEN: 'OPEN',
    HALF_OPEN: 'HALF_OPEN',
    CLOSE: 'CLOSE'
});


Breaker.prototype.run = function run(/*args...n, callback*/) {
    var args, self, fallback, orig;

    args = Array.prototype.slice.call(arguments);
    self = this;
    fallback = this.fallback;

    if (fallback instanceof Breaker) {
        orig = args.slice();
        args[args.length - 1] = function wrapper(err/*, ...data*/) {
            var callback;

            if (err && self.isOpen()) {
                fallback.run.apply(fallback, orig);
                return;
            }

            callback = orig.pop();
            callback.apply(null, arguments);
        };
    }

    this._run.apply(this, args);
};


Breaker.prototype._run = function _run(/*args...n, callback*/) {
    var args, callback, self, start, timer, execute;

    this.emit('execute');

    args = Array.prototype.slice.call(arguments);
    callback = args.pop();

    if (this.isOpen() || this._pendingClose) {
        this.emit('reject');
        callback(new Error(this.settings.openErrMsg || 'Command not available.'));
        return;
    }

    if (this.isHalfOpen()) {
        // Flip the flag to disallow additional calls at this time.
        // It doesn't matter if any in-flight calls come back before
        // this call completes because if the in-flight ones timeout
        // or fail, the command still isn't healthy so we flip back
        // to `open`. If they succeed we optimistically flip back to
        // `closed` and this call can continue as normal.
        this._pendingClose = true;
    }

    self = this;
    start = Date.now();

    timer = setTimeout(function ontimeout() {
        var error = new Error(self.settings.timeoutErrMsg || 'Command timeout.');
        error.name = 'commandTimeout';
        error.code = 'ETIMEDOUT';
        timer = undefined;
        self._pendingClose = false;
        self.emit('timeout');
        self._onFailure();
        callback(error);
    }, this.settings.timeout);

    timer.unref();

    args[args.length] = function onreponse(err/*, ...data*/) {
        if (!timer) { return; }

        clearTimeout(timer);
        timer = undefined;

        self._pendingClose = false;
        self.emit('duration', Date.now() - start);

        if (err && self.settings.isFailure(err)) {
            self.emit('failure', err);
            self._onFailure();
        } else {
            self.emit('success');
            self.close();
        }

        callback.apply(null, arguments);
    };


    execute = Zalgo.contain(this._impl.execute, this._impl);
    execute.apply(null, args);
};


Breaker.prototype.isOpen = function isOpen() {
    return this._state === Breaker.State.OPEN;
};


Breaker.prototype.isHalfOpen = function isHalfOpen() {
    return this._state === Breaker.State.HALF_OPEN;
};


Breaker.prototype.isClosed = function isClosed() {
    return this._state === Breaker.State.CLOSE;
};


Breaker.prototype.open = function open() {
    this._setState(Breaker.State.OPEN);
};


Breaker.prototype.halfOpen = function halfOpen() {
    this._setState(Breaker.State.HALF_OPEN);
};


Breaker.prototype.close = function close() {
    this._numFailures = 0;
    this._setState(Breaker.State.CLOSE);
};


Breaker.prototype._setState = function _setState(state) {
    if (state in Breaker.State && this._state !== state) {
        this._state = state;
        this.emit(state.toLowerCase());
    }
};


Breaker.prototype._onFailure = function _onFailure() {
    this._numFailures += 1;
    if (this.isHalfOpen() || this._numFailures >= this.settings.maxFailures) {
        this.open();
    }
};


Breaker.prototype._startTimer = function _startTimer() {
    this._resetTimer = setTimeout(this.halfOpen.bind(this), this.settings.resetTimeout);
    this._resetTimer.unref();
};


module.exports = Breaker;
