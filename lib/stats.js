'use strict';


function avg(arr) {
    var i, len, total;

    for (i = 0, len = arr.length, total = 0; i < len; i++) {
        total += arr[i];
    }

    // No 'divide by zero' check. I'm cool with 'Infinity'
    return total / arr.length;
}


function Stats() {
    this.counts = Object.create(null);
    this.samples = Object.create(null);
}


Stats.prototype = {


    increment: function increment(name) {
        if (!(name in this.counts)) {
            this.resetCounts(name);
        }
        this.counts[name] += 1;
    },


    decrement: function decrement(name) {
        if (name in this.counts) {
            this.counts[name] -= 1;
        }
    },


    sample: function sample(name, data) {
        if (!(name in this.samples)) {
            this.resetSamples(name);
        }
        this.samples[name].push(data);
    },


    reset: function reset() {
        this.resetCounts();
        this.resetSamples();
    },


    resetCounts: function resetCounts(name) {
        if (!name) {
            Object.keys(this.counts).forEach(resetCounts);
            return;
        }
        this.counts[name] = 0;
    },


    resetSamples: function resetSamples(name) {
        if (!name) {
            Object.keys(this.samples).forEach(resetSamples);
            return;
        }
        this.samples[name] = [];
    },


    snapshot: function snapshot() {
        var counts, samples;

        counts = this.counts;
        samples = this.samples;

        return {
            counts: counts,
            samples: Object.keys(samples).reduce(function (obj, prop) {
                var data;

                data = samples[prop];

                obj[prop] = {
                    average: avg(data),
                    samples: data.length
                };

                return obj;
            }, {})
        };
    }

};

module.exports = Stats;