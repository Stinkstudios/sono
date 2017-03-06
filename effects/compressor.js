import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';

class Compressor extends AbstractEffect {
    constructor({threshold = -24, knee = 30, ratio = 12, attack = 0.0003, release = 0.25} = {}) {
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
        // gain reduction currently applied by compressor from -20 to 0
        // node.reduction.value = typeof config.reduction !== 'undefined' ? config.reduction : -10;)
        // seconds to reduce gain by 10db from 0 to 1 - how quickly signal adapted when volume increased
        this.setSafeParamValue(this._node.attack, options.attack);
        // seconds to increase gain by 10db from 0 to 1 - how quickly signal adapted when volume redcuced
        this.setSafeParamValue(this._node.release, options.release);
    }
}

export default sono.register('compressor', opts => new Compressor(opts));
