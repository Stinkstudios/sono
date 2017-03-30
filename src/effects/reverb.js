import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';
import isSafeNumber from '../core/utils/isSafeNumber';
import isDefined from '../core/utils/isDefined';

function createImpulseResponse({time, decay, reverse, buffer}) {
    const rate = sono.context.sampleRate;
    const length = Math.floor(rate * time);

    let impulseResponse;

    if (buffer && buffer.length === length) {
        impulseResponse = buffer;
    } else {
        impulseResponse = sono.context.createBuffer(2, length, rate);
    }

    const left = impulseResponse.getChannelData(0);
    const right = impulseResponse.getChannelData(1);

    let n, e;
    for (let i = 0; i < length; i++) {
        n = reverse ? length - i : i;
        e = Math.pow(1 - n / length, decay);
        left[i] = (Math.random() * 2 - 1) * e;
        right[i] = (Math.random() * 2 - 1) * e;
    }

    return impulseResponse;
}

class Reverb extends AbstractEffect {
    constructor({time = 1, decay = 5, reverse = false} = {}) {
        super();

        this._length = 0;
        this._impulseResponse = null;

        this._convolver = this.context.createConvolver();

        this._in.connect(this._convolver);
        this._in.connect(this._out);
        this._convolver.connect(this._out);

        this._opts = {};

        this.update({time, decay, reverse});
    }

    update({time, decay, reverse}) {
        let changed = false;
        if (time !== this._opts.time && isSafeNumber(time)) {
            this._opts.time = time;
            changed = true;
        }
        if (decay !== this._opts.decay && isSafeNumber(decay)) {
            this._opts.decay = decay;
            changed = true;
        }
        if (isDefined(reverse) && reverse !== this._reverse) {
            this._opts.reverse = reverse;
            changed = true;
        }
        if (!changed) {
            return;
        }

        this._opts.buffer = time <= 0 ? null : createImpulseResponse(this._opts);
        this._convolver.buffer = this._opts.buffer;
    }

    get time() {
        return this._opts.time;
    }

    set time(value) {
        this.update({time: value});
    }

    get decay() {
        return this._opts.decay;
    }

    set decay(value) {
        this.update({decay: value});
    }

    get reverse() {
        return this._opts.reverse;
    }

    set reverse(value) {
        this.update({reverse: value});
    }
}

export default sono.register('reverb', opts => new Reverb(opts));
