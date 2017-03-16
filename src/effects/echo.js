import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';

class Echo extends AbstractEffect {
    constructor({delay = 0.5, feedback = 0.5} = {}) {
        super();

        this._delay = this.context.createDelay();
        this._feedback = this.context.createGain();

        this._in.connect(this._delay);
        this._in.connect(this._out);
        this._delay.connect(this._feedback);
        this._feedback.connect(this._delay);
        this._feedback.connect(this._out);

        this.delay = delay;
        this.feedback = feedback;
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
