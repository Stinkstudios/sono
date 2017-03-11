import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';

class Compressor extends AbstractEffect {
    constructor({attack = 0.003, knee = 30, ratio = 12, release = 0.25, threshold = -24} = {}) {
        super(sono.context.createDynamicsCompressor());

        this.update({threshold, knee, ratio, attack, release});
    }

    update(options) {
        // min decibels to start compressing at from -100 to 0
        this.setSafeParamValue(this._node.threshold, options.threshold);
        // decibel value to start curve to compressed value from 0 to 40
        this.setSafeParamValue(this._node.knee, options.knee);
        // amount of change per decibel from 1 to 20
        this.setSafeParamValue(this._node.ratio, options.ratio);
        // seconds to reduce gain by 10db from 0 to 1 - how quickly signal adapted when volume increased
        this.setSafeParamValue(this._node.attack, options.attack);
        // seconds to increase gain by 10db from 0 to 1 - how quickly signal adapted when volume redcuced
        this.setSafeParamValue(this._node.release, options.release);
    }

    get threshold() {
        return this._node.threshold.value;
    }

    set threshold(value) {
        this.setSafeParamValue(this._node.threshold, value);
    }

    get knee() {
        return this._node.knee.value;
    }

    set knee(value) {
        this.setSafeParamValue(this._node.knee, value);
    }

    get ratio() {
        return this._node.ratio.value;
    }

    set ratio(value) {
        this.setSafeParamValue(this._node.ratio, value);
    }

    get attack() {
        return this._node.attack.value;
    }

    set attack(value) {
        this.setSafeParamValue(this._node.attack, value);
    }

    get release() {
        return this._node.release.value;
    }

    set release(value) {
        this.setSafeParamValue(this._node.release, value);
    }
}

export default sono.register('compressor', opts => new Compressor(opts));
