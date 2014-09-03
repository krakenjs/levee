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


Breaker.prototype.run = function run(context, callback) {
    var self, fallback, fn;

    self = this;
    fallback = this.fallback;
    fn = callback;

    if (fallback instanceof Breaker) {
        fn = function wrapper(err/*, ...data*/) {
            if (err && self.isOpen()) {
                fallback.run(context, callback);
                return;
            }
            callback.apply(null, arguments);
        };
    }

    this._run(context, fn);
};


Breaker.prototype._run = function _run(context, callback) {
    var self, start, timer, execute;

    this.emit('execute');

    if (this.isOpen() || this._pendingClose) {
        this.emit('reject');
        callback(new Error('Command not available.'));
        return;
    }

    if (this.isHalfOpen()) {
        this._pendingClose = true;
    }

    self = this;
    start = Date.now();

    timer = setTimeout(function ontimeout() {

        timer = undefined;
        self.emit('timeout');
        self._onFailure();
        callback(new Error('Command timeout.'));

    }, this.settings.timeout);

    timer.unref();

    execute = Zalgo.contain(this._impl.execute, this._impl);
    execute(context, function onreponse(err/*, ...data*/) {
        if (!timer) { return; }

        clearTimeout(timer);
        timer = undefined;

        self.emit('duration', Date.now() - start);

        if (err) {
            self.emit('failure', err);
            self._onFailure();
        } else {
            self.emit('success');
            self.close();
        }

        callback.apply(null, arguments);
    });
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
    this._pendingClose = false;
    this._setState(Breaker.State.OPEN);
};


Breaker.prototype.halfOpen = function halfOpen() {
    this._setState(Breaker.State.HALF_OPEN);
};


Breaker.prototype.close = function close() {
    this._numFailures = 0;
    this._pendingClose = false;
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
