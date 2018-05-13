import AbstractEffect from './abstract-effect';
import sono from '../core/sono';

class Echo extends AbstractEffect {
    constructor({delay = 0.5, feedback = 0.5, wet = 1, dry = 1} = {}) {
        super(sono.getContext().createDelay(), sono.getContext().createGain());

        this._delay = this._node;
        this._feedback = this._nodeOut;

        this._delay.connect(this._feedback);
        this._feedback.connect(this._delay);

        this.wet = wet;
        this.dry = dry;
        this.update({delay, feedback});
    }

    enable(value) {
        super.enable(value);

        if (this._feedback && value) {
            this._feedback.connect(this._delay);
        }
    }

    update(options) {
        this.delay = options.delay;
        this.feedback = options.feedback;
    }

    get delay() {
        return this._delay.delayTime.value;
    }

    set delay(value) {
        this.setSafeParamValue(this._delay.delayTime, value);
    }

    get feedback() {
        return this._feedback.gain.value;
    }

    set feedback(value) {
        this.setSafeParamValue(this._feedback.gain, value);
    }
}

export default sono.register('echo', opts => new Echo(opts));
