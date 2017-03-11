import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';
import isSafeNumber from '../core/utils/isSafeNumber';

function safeOption(...args) {
    let value = null;
    for (let i = 0; i < args.length; i++) {
        if (isSafeNumber(args[i])) {
            value = args[i];
            break;
        }
    }
    return value;
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
    constructor({type = 'lowpass', frequency = 1000, detune = 0, q = 0, gain = 1, peak = 0, boost = 0, width = 100, sharpness = 0} = {}) {
        super(sono.context.createBiquadFilter());

        this._node.type = type;

        this.update({frequency, gain, detune, q, peak, boost, width, sharpness});
    }

    update(options) {
        this.setSafeParamValue(this._node.frequency, options.frequency);
        this.setSafeParamValue(this._node.gain, safeOption(options.boost, options.gain));
        this.setSafeParamValue(this._node.detune, options.detune);

        const q = safeOption(options.peak, options.width, options.sharpness, options.q);
        this.setSafeParamValue(this._node.Q, q);
    }

    setByPercent({percent = 0.5}) {
        this.update({
            frequency: getFrequency(percent)
        });
    }

    get type() {
        return this._node.type;
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
        return this.q;
    }

    set Q(value) {
        this.q = value;
    }

    get peak() {
        return this.q;
    }

    set peak(value) {
        this.q = value;
    }

    get boost() {
        return this.q;
    }

    set boost(value) {
        this.q = value;
    }

    get width() {
        return this.q;
    }

    set width(value) {
        this.q = value;
    }

    get sharpness() {
        return this.q;
    }

    set sharpness(value) {
        this.q = value;
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

const lowpass = sono.register('lowpass', ({frequency, peak, q} = {}) => {
    return new Filter({type: 'lowpass', frequency, peak, q});
});

const highpass = sono.register('highpass', ({frequency, peak, q} = {}) => {
    return new Filter({type: 'highpass', frequency, peak, q});
});

const lowshelf = sono.register('lowshelf', ({frequency, boost, gain} = {}) => {
    return new Filter({type: 'lowshelf', frequency, boost, gain, q: 0});
});

const highshelf = sono.register('highshelf', ({frequency, boost, gain} = {}) => {
    return new Filter({type: 'highshelf', frequency, boost, gain, q: 0});
});

const peaking = sono.register('peaking', ({frequency, width, boost, gain, q} = {}) => {
    return new Filter({type: 'peaking', frequency, width, boost, gain, q});
});

const bandpass = sono.register('bandpass', ({frequency, width, q} = {}) => {
    return new Filter({type: 'bandpass', frequency, width, q});
});

const notch = sono.register('notch', ({frequency, width, gain, q} = {}) => {
    return new Filter({type: 'notch', frequency, width, gain, q});
});

const allpass = sono.register('allpass', ({frequency, sharpness, q} = {}) => {
    return new Filter({type: 'allpass', frequency, sharpness, q});
});

export default sono.register('filter', opts => new Filter(opts));

export {
    lowpass,
    highpass,
    bandpass,
    lowshelf,
    highshelf,
    peaking,
    notch,
    allpass
};
