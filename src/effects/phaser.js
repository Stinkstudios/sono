import AbstractEffect from './abstract-effect';
import sono from '../core/sono';

class Phaser extends AbstractEffect {
    constructor({stages = 8, feedback = 0.5, frequency = 0.5, gain = 300, wet = 0.8, dry = 0.8} = {}) {
        const context = sono.getContext();

        stages = stages || 8;

        const filters = [];
        for (let i = 0; i < stages; i++) {
            filters.push(context.createBiquadFilter());
        }

        const first = filters[0];
        const last = filters[filters.length - 1];

        super(first, last);

        this._stages = stages;
        this._feedback = context.createGain();
        this._lfo = context.createOscillator();
        this._lfoGain = context.createGain();
        this._lfo.type = 'sine';

        for (let i = 0; i < filters.length; i++) {
            const filter = filters[i];
            filter.type = 'allpass';
            filter.frequency.value = 1000 * i;
            this._lfoGain.connect(filter.frequency);
            // filter.Q.value = 10;

            if (i > 0) {
                filters[i - 1].connect(filter);
            }
        }

        this._lfo.connect(this._lfoGain);
        this._lfo.start(0);

        this._nodeOut.connect(this._feedback);
        this._feedback.connect(this._node);

        this.wet = wet;
        this.dry = dry;
        this.update({frequency, gain, feedback});
    }

    enable(value) {
        super.enable(value);

        if (this._feedback) {
            this._feedback.disconnect();
        }

        if (value && this._feedback) {
            this._nodeOut.connect(this._feedback);
            this._feedback.connect(this._node);
        }
    }

    update(options) {
        this.frequency = options.frequency;
        this.gain = options.gain;
        this.feedback = options.feedback;
    }

    get stages() {
        return this._stages;
    }

    get frequency() {
        return this._lfo.frequency.value;
    }

    set frequency(value) {
        this.setSafeParamValue(this._lfo.frequency, value);
    }

    get gain() {
        return this._lfoGain.gain.value;
    }

    set gain(value) {
        this.setSafeParamValue(this._lfoGain.gain, value);
    }

    get feedback() {
        return this._feedback.gain.value;
    }

    set feedback(value) {
        this.setSafeParamValue(this._feedback.gain, value);
    }
}

export default sono.register('phaser', opts => new Phaser(opts));
