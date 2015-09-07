'use strict';


exports.Breaker = {
    maxFailures: 5,
    timeout: 10000,
    resetTimeout: 60000,
    isFailure: function () {
      return true;
    }
};
