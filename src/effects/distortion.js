import AbstractEffect from './AbstractEffect';
import isSafeNumber from '../core/utils/isSafeNumber';
import sono from '../core/sono';

// up-sample before applying curve for better resolution result 'none', '2x' or '4x'
// oversample: '2x'
// oversample: '4x'

class Distortion extends AbstractEffect {
    constructor({level = 1, samples = 22050, oversample = 'none'} = {}) {
        super();

        this._node = sono.context.createWaveShaper();
        this._in.connect(this._out);

        this._node.oversample = oversample || 'none';

        this._samples = samples || 22050;

        this._curve = new Float32Array(this._samples);

        this._level;

        this._enabled = false;

        this.update({level});
    }

    enable(b) {
        if (b === this._enabled) {
            return;
        }

        this._enabled = b;

        if (b) {
            this._in.disconnect();
            this._in.connect(this._node);
            this._node.connect(this._out);
        } else {
            this._node.disconnect();
            this._in.disconnect();
            this._in.connect(this._out);
        }
    }

    update({level}) {
        if (level === this._level || !isSafeNumber(level)) {
            return;
        }

        this.enable(level > 0);

        if (!this._enabled) {
            return;
        }

        const k = level * 100;
        const deg = Math.PI / 180;
        const y = 2 / this._samples;

        let x;
        for (let i = 0; i < this._samples; ++i) {
            x = i * y - 1;
            this._curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }

        this._level = level;
        this._node.curve = this._curve;
    }

    get level() {
        return this._level;
    }

    set level(level) {
        this.update({level});
    }
}

export default sono.register('distortion', opts => new Distortion(opts));
