import AbstractEffect from './abstract-effect';
import sono from '../core/sono';

class MonoFlanger extends AbstractEffect {
    constructor({delay = 0.005, feedback = 0.5, frequency = 0.002, gain = 0.25, wet = 1, dry = 1} = {}) {
        super(sono.getContext().createDelay());

        const context = sono.getContext();

        this._delay = this._node;
        this._feedback = context.createGain();
        this._lfo = context.createOscillator();
        this._gain = context.createGain();
        this._lfo.type = 'sine';

        this._delay.connect(this._feedback);
        this._feedback.connect(this._in);

        this._lfo.connect(this._gain);
        this._gain.connect(this._delay.delayTime);
        this._lfo.start(0);

        this.wet = wet;
        this.dry = dry;
        this.update({delay, feedback, frequency, gain});
    }

    update(options) {
        this.delay = options.delay;
        this.frequency = options.frequency;
        this.gain = options.gain;
        this.feedback = options.feedback;
    }

    get delay() {
        return this._delay.delayTime.value;
    }

    set delay(value) {
        this.setSafeParamValue(this._delay.delayTime, value);
    }

    get frequency() {
        return this._lfo.frequency.value;
    }

    set frequency(value) {
        this.setSafeParamValue(this._lfo.frequency, value);
    }

    get gain() {
        return this._gain.gain.value;
    }

    set gain(value) {
        this.setSafeParamValue(this._gain.gain, value);
    }

    get feedback() {
        return this._feedback.gain.value;
    }

    set feedback(value) {
        this.setSafeParamValue(this._feedback.gain, value);
    }
}

sono.register('monoFlanger', opts => new MonoFlanger(opts));

class StereoFlanger extends AbstractEffect {
    constructor({delay = 0.003, feedback = 0.5, frequency = 0.5, gain = 0.005, wet = 1, dry = 1} = {}) {
        super(sono.getContext().createChannelSplitter(2), sono.getContext().createChannelMerger(2));

        const context = sono.getContext();

        this._splitter = this._node;
        this._merger = this._nodeOut;
        this._feedbackL = context.createGain();
        this._feedbackR = context.createGain();
        this._lfo = context.createOscillator();
        this._lfoGainL = context.createGain();
        this._lfoGainR = context.createGain();
        this._delayL = context.createDelay();
        this._delayR = context.createDelay();

        this._lfo.type = 'sine';

        this._splitter.connect(this._delayL, 0);
        this._splitter.connect(this._delayR, 1);

        this._delayL.connect(this._feedbackL);
        this._delayR.connect(this._feedbackR);

        this._feedbackL.connect(this._delayR);
        this._feedbackR.connect(this._delayL);

        this._delayL.connect(this._merger, 0, 0);
        this._delayR.connect(this._merger, 0, 1);

        this._lfo.connect(this._lfoGainL);
        this._lfo.connect(this._lfoGainR);
        this._lfoGainL.connect(this._delayL.delayTime);
        this._lfoGainR.connect(this._delayR.delayTime);
        this._lfo.start(0);

        this.wet = wet;
        this.dry = dry;
        this.update({delay, feedback, frequency, gain});
    }

    update(options) {
        this.delay = options.delay;
        this.frequency = options.frequency;
        this.gain = options.gain;
        this.feedback = options.feedback;
    }

    get delay() {
        return this._delayL.delayTime.value;
    }

    set delay(value) {
        this.setSafeParamValue(this._delayL.delayTime, value);
        this._delayR.delayTime.value = this._delayL.delayTime.value;
    }

    get frequency() {
        return this._lfo.frequency.value;
    }

    set frequency(value) {
        this.setSafeParamValue(this._lfo.frequency, value);
    }

    get gain() {
        return this._lfoGainL.gain.value;
    }

    set gain(value) {
        this.setSafeParamValue(this._lfoGainL.gain, value);
        this._lfoGainR.gain.value = 0 - this._lfoGainL.gain.value;
    }

    get feedback() {
        return this._feedbackL.gain.value;
    }

    set feedback(value) {
        this.setSafeParamValue(this._feedbackL.gain, value);
        this._feedbackR.gain.value = this._feedbackL.gain.value;
    }
}

sono.register('stereoFlanger', opts => new StereoFlanger(opts));

export default sono.register('flanger', (opts = {}) => {
    return opts.stereo ? new StereoFlanger(opts) : new MonoFlanger(opts);
});
