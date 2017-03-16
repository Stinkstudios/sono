import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';

class Phaser extends AbstractEffect {
    constructor({stages = 8, feedback = 0.5, frequency = 0.5, gain = 300} = {}) {
        super();

        this._stages = stages || 8;

        this._feedback = sono.context.createGain();
        this._lfo = sono.context.createOscillator();
        this._lfoGain = sono.context.createGain();
        this._lfo.type = 'sine';

        const filters = [];
        for (let i = 0; i < this._stages; i++) {
            const filter = sono.context.createBiquadFilter();
            filter.type = 'allpass';
            filter.frequency.value = 1000 * i;
            //filter.Q.value = 10;
            if (i > 0) {
                filters[i - 1].connect(filter);
            }
            this._lfoGain.connect(filter.frequency);
            filters.push(filter);
        }

        const first = filters[0];
        const last = filters[filters.length - 1];

        this._in.connect(first);
        this._in.connect(this._out);
        last.connect(this._out);
        last.connect(this._feedback);
        this._feedback.connect(first);
        this._lfo.connect(this._lfoGain);
        this._lfo.start(0);

        this.update({frequency, gain, feedback});
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
