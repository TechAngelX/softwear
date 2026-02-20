 // src/utils/OneEuroFilter.js

class LowPassFilter {
    constructor(alpha, initval = null) {
        this.y = initval;
        this.s = initval;
        this.a = alpha;
    }

    filter(value) {
        if (this.y === null) {
            this.y = value;
            this.s = value;
            return value;
        }

        this.s = this.a * value + (1.0 - this.a) * this.s;
        this.y = value;
        return this.s;
    }

    filterWithAlpha(value, alpha) {
        this.a = alpha;
        return this.filter(value);
    }
}

export class OneEuroFilter {
    constructor(freq, mincutoff = 1.0, beta = 0.0, dcutoff = 1.0) {
        this.freq = freq;
        this.mincutoff = mincutoff;
        this.beta = beta;
        this.dcutoff = dcutoff;
        this.x = new LowPassFilter(this.alpha(mincutoff));
        this.dx = new LowPassFilter(this.alpha(dcutoff));
        this.lasttime = null;
    }

    alpha(cutoff) {
        const te = 1.0 / this.freq;
        const tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / te);
    }

    filter(value, timestamp) {
        if (this.lasttime === null) {
            this.lasttime = timestamp;
            return this.x.filter(value);
        }

        const timeDiff = timestamp - this.lasttime;
        this.lasttime = timestamp;

        // Use original frequency if timestamp is invalid, clamp to prevent spikes
        if (timeDiff > 0) {
            this.freq = Math.max(10, Math.min(120, 1000 / timeDiff));
        }

        const dvalue = this.x.y === null ? 0.0 : (value - this.x.y) * this.freq;
        const edx = this.dx.filterWithAlpha(dvalue, this.alpha(this.dcutoff));
        const cutoff = this.mincutoff + this.beta * Math.abs(edx);

        return this.x.filterWithAlpha(value, this.alpha(cutoff));
    }
}
