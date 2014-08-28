'use strict';

var Hoek = require('hoek');


function avg(arr) {
    var i, len, total;

    for (i = 0, len = arr.length, total = 0; i < len; i++) {
        total += arr[i];
    }

    // No 'divide by zero' check. I'm cool with 'Infinity'
    return total / arr.length;
}


function Stats() {
    this._counts = Object.create(null);
    this._samples = Object.create(null);
}


Stats.prototype = {


    increment: function increment(name) {
        if (!(name in this._counts)) {
            this.resetCounts(name);
        }
        this._counts[name] += 1;
    },


    decrement: function decrement(name) {
        if (name in this._counts) {
            this._counts[name] -= 1;
        }
    },


    sample: function sample(name, data) {
        if (!(name in this._samples)) {
            this.resetSamples(name);
        }
        this._samples[name].push(data);
    },


    reset: function reset() {
        this.resetCounts();
        this.resetSamples();
    },


    resetCounts: function resetCounts(name) {
        if (!name) {
            Object.keys(this._counts).forEach(resetCounts, this);
            return;
        }
        this._counts[name] = 0;
    },


    resetSamples: function resetSamples(name) {
        if (!name) {
            Object.keys(this._samples).forEach(resetSamples, this);
            return;
        }
        this._samples[name] = [];
    },


    snapshot: function snapshot() {
        var counts, samples;

        counts = Hoek.clone(this._counts);
        samples = this._samples;

        return {
            counts: counts,
            samples: Object.keys(samples).reduce(function (obj, prop) {
                var data;

                data = samples[prop];

                obj[prop] = {
                    average: avg(data),
                    count: data.length
                };

                return obj;
            }, {})
        };
    }

};

module.exports = Stats;
