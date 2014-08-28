'use strict';


exports.contain = function contain(fn, context) {
    return function zalgo() {
        var callback, sync;

        function __container__() {
            var args;

            if (sync) {
                args = arguments;
                process.nextTick(function () {
                    callback.apply(null, args);
                });
            } else {
                callback.apply(null, arguments);
            }
        }

        // Defend against re-wrapping callbacks
        callback = arguments[arguments.length - 1];
        if (callback.name !== __container__.name) {
            arguments[arguments.length - 1] = __container__;
        }

        sync = true;
        fn.apply(context || this, arguments);
        sync = false;
    };
};
