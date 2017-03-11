import context from '../core/context';
import isSafeNumber from '../core/utils/isSafeNumber';

export default class AbstractEffect {
    constructor(node = null) {
        this._in = node || this.context.createGain();
        this._out = node || this.context.createGain();
        if (node) {
            this._node = node;
        }
    }

    connect(node) {
        this._out.connect(node._in || node);
    }

    disconnect(...args) {
        this._out.disconnect(args);
    }

    setSafeParamValue(param, value) {
        if (!isSafeNumber(value)) {
            console.warn(this, 'Attempt to set invalid value ' + value + ' on AudioParam');
            return;
        }
        param.value = value;
    }

    update() {
        throw new Error('update must be overridden');
    }

    get context() {
        return context;
    }

    get numberOfInputs() {
        return 1;
    }

    get numberOfOutputs() {
        return 1;
    }

    get channelCount() {
        return 1;
    }

    get channelCountMode() {
        return 'max';
    }

    get channelInterpretation() {
        return 'speakers';
    }
}
