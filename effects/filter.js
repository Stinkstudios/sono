import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';
import isSafeNumber from '../core/utils/isSafeNumber';

function safeOption(a, b) {
    if (isSafeNumber(a)) {
        return a;
    }
    return b;
}

// https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
// For lowpass and highpass Q indicates how peaked the frequency is around the cutoff.
// The greater the value is, the greater is the peak
const minFrequency = 40;
const maxFrequency = sono.context.sampleRate / 2;

function getFrequency(value) {
    // Logarithm (base 2) to compute how many octaves fall in the range.
    const numberOfOctaves = Math.log(maxFrequency / minFrequency) / Math.LN2;
    // Compute a multiplier from 0 to 1 based on an exponential scale.
    const multiplier = Math.pow(2, numberOfOctaves * (value - 1.0));
    // Get back to the frequency value between min and max.
    return maxFrequency * multiplier;
}

class Filter extends AbstractEffect {
    constructor({type = 'lowpass', frequency = 1000, q = 0, gain = 1} = {}) {
        super(sono.context.createBiquadFilter());

        this._node.type = type;

        this.update({frequency, q, gain});
    }

    update(options) {
        this.setSafeParamValue(this._node.frequency, options.frequency);
        this.setSafeParamValue(this._node.Q, options.q);
        this.setSafeParamValue(this._node.gain, options.gain);
    }

    setByPercent({percent = 0.5}) {
        this.update({
            frequency: getFrequency(percent)
        });
    }

    get frequency() {
        return this._node.frequency.value;
    }

    set frequency(value) {
        this.setSafeParamValue(this._node.frequency, value);
    }

    get q() {
        return this._node.Q.value;
    }

    set q(value) {
        this.setSafeParamValue(this._node.Q, value);
    }

    get Q() {
        return this._node.Q.value;
    }

    set Q(value) {
        this.setSafeParamValue(this._node.Q, value);
    }

    get gain() {
        return this._node.gain.value;
    }

    set gain(value) {
        this.setSafeParamValue(this._node.gain, value);
    }

    get detune() {
        return this._node.detune.value;
    }

    set detune(value) {
        this.setSafeParamValue(this._node.detune, value);
    }
}

sono.register('lowpass', ({frequency, peak, q} = {}) => {
    return new Filter({type: 'lowpass', frequency, q: safeOption(peak, q)});
});

sono.register('highpass', ({frequency, peak, q} = {}) => {
    return new Filter({type: 'highpass', frequency, q: safeOption(peak, q)});
});

sono.register('bandpass', ({frequency, width, q} = {}) => {
    return new Filter({type: 'bandpass', frequency, q: safeOption(width, q)});
});

sono.register('lowshelf', ({frequency, gain} = {}) => {
    return new Filter({type: 'lowshelf', frequency, q: 0, gain});
});

sono.register('highshelf', ({frequency, gain} = {}) => {
    return new Filter({type: 'highshelf', frequency, q: 0, gain});
});

sono.register('peaking', ({frequency, width, gain} = {}) => {
    return new Filter({type: 'peaking', frequency, q: width, gain});
});

sono.register('notch', ({frequency, width, gain, q} = {}) => {
    return new Filter({type: 'notch', frequency, q: safeOption(width, q), gain});
});

sono.register('allpass', ({frequency, sharpness, q} = {}) => {
    return new Filter({type: 'allpass', frequency, q: safeOption(sharpness, q)});
});

export default sono.register('filter', opts => new Filter(opts));
