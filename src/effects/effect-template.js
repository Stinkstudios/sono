import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';
import isSafeNumber from '../core/utils/isSafeNumber';

class EffectTemplate extends AbstractEffect {
    constructor() {
        super();
    }

    update(options) {
        if (isSafeNumber(options.value)) {
            // do update
        }
    }

    get value() {
        return this._value;
    }

    set value(value) {
        this.update({value});
    }
}

export default sono.register('effectTemplate', opts => new EffectTemplate(opts));
