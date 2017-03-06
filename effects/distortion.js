import AbstractEffect from './AbstractEffect';
import isSafeNumber from '../core/utils/isSafeNumber';
import sono from '../core/sono';

const n = 22050;

// Float32Array defining curve (values are interpolated)
// up-sample before applying curve for better resolution result 'none', '2x' or '4x'
// node.oversample = '2x';

class Distortion extends AbstractEffect {
    constructor({level = 1} = {}) {
        super(sono.context.createWaveShaper());

        this._curve = new Float32Array(n);

        this._level = 0;

        this.update({level});
    }

    update({level}) {
        if (level === this._level || !isSafeNumber(level)) {
            return;
        }

        if (level <= 0) {
            this._node.curve = null;
            return;
        }

        const k = level * 100;
        const deg = Math.PI / 180;

        let x;
        for (let i = 0; i < n; i++) {
            x = i * 2 / n - 1;
            this._curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }

        this._level = level;
        this._node.curve = this._curve;
    }

    get level() {
        return this._level;
    }

    set level(level) {
        this._update({level});
    }
}

export default sono.register('distortion', opts => new Distortion(opts));
