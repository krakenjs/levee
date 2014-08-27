'use strict';

var Util = require('util');
var Events = require('events');
var Zalgo = require('./zalgo');

function Levee(command, options) {
    Levee.super_.call(this);

    options = options || {};

    this.command = command;
    this.fallback = undefined;
    this.failures = 0;
    this.maxFailures = options.maxFailures || 5;
    this.timeout = options.timeout || 10000;
    this.resetTimeout = options.resetTimeout || 60000;
    this.pendingClose = false;
    this.state = undefined;
    this._init();
}


Levee.State = Object.freeze({
    OPEN: 'OPEN',
    HALF_OPEN: 'HALF_OPEN',
    CLOSE: 'CLOSE'
});


Util.inherits(Levee, Events.EventEmitter);


Levee.prototype.run = function run(context, callback) {
    var self, start, timer, execute;

    this.emit('execute');
    callback = this._wrapFallback(context, callback);

    if (this.isOpen() || this.pendingClose) {
        this.emit('reject');
        callback(new Error('Command not available.'));
        return;
    }


    if (this.isHalfOpen()) {
        this.pendingClose = true;
    }

    self = this;
    start = Date.now();

    timer = setTimeout(function ontimeout() {

        timer = undefined;
        self.emit('timeout');
        self._onFailure();
        callback(new Error('Command timeout'));

    }, this.timeout);

    timer.unref();

    execute = Zalgo.contain(this.command.execute).bind(this.command);
    execute(context, function onresponse(err, data) {
        if (!timer) {
            return;
        }

        clearTimeout(timer);
        timer = undefined;

        self.emit('duration', Date.now() - start);

        if (err) {
            self.emit('failure', err);
            self._onFailure();
        } else {
            self.emit('success');
            self.close()
        }

        callback(err, data);
    });
};


Levee.prototype.isOpen = function isOpen() {
    return this.state === Levee.State.OPEN;
};


Levee.prototype.isHalfOpen = function isHalfOpen() {
    return this.state === Levee.State.HALF_OPEN;
};


Levee.prototype.isClosed = function isClosed() {
    return this.state === Levee.State.CLOSE;
};


Levee.prototype.open = function open() {
    this.pendingClose = false;
    this._state(Levee.State.OPEN);
};


Levee.prototype.halfOpen = function halfOpen() {
    this._state(Levee.State.HALF_OPEN);
};


Levee.prototype.close = function close() {
    this.failures = 0;
    this._state(Levee.State.CLOSE);
};


Levee.prototype._init = function _init() {
    var self, timer;

    self = this;
    self.on('close', function () {
        clearTimeout(timer);

        self.pendingClose = false;
        self.once('open', function () {
            timer = setTimeout(self.halfOpen.bind(self), self.resetTimeout);
            timer.unref();
        });
    });

    // Start out in closed state.
    self.close();
};


Levee.prototype._wrapFallback = function _wrapFallback(context, callback) {
    var fallback;

    fallback = this.fallback;

    if (fallback instanceof Levee) {
        return function wrapper(err, data) {
            if (err) {
                fallback.run(context, callback);
                return;
            }
            callback(err, data);
        };
    }

    return callback;
};


Levee.prototype._state = function _state(state) {
    if (state in Levee.State && state !== this.state) {
        this.state = state;
        this.emit(state.toLowerCase());
    }
};


Levee.prototype._onFailure = function _onFailure() {
    this.failures += 1;
    if (this.isHalfOpen() || this.failures >= this.maxFailures) {
        this.open();
    }
};


module.exports = Levee;


