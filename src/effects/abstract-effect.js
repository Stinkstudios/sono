import isSafeNumber from '../core/utils/isSafeNumber';
import sono from '../core/sono';

export default class AbstractEffect {
    constructor(node = null, nodeOut = null, enabled = true) {
        this._node = node;
        this._nodeOut = nodeOut || node;
        this._enabled;

        const context = sono.getContext();

        this._in = context.createGain();
        this._out = context.createGain();
        this._wet = context.createGain();
        this._dry = context.createGain();

        this._in.connect(this._dry);
        this._wet.connect(this._out);
        this._dry.connect(this._out);

        this.enable(enabled);
    }

    enable(b) {
        if (b === this._enabled) {
            return;
        }

        this._enabled = b;

        this._in.disconnect();

        if (b) {
            this._in.connect(this._dry);
            this._in.connect(this._node);
            this._nodeOut.connect(this._wet);
        } else {
            this._nodeOut.disconnect();
            this._in.connect(this._out);
        }
    }

    get wet() {
        return this._wet.gain.value;
    }

    set wet(value) {
        this.setSafeParamValue(this._wet.gain, value);
    }

    get dry() {
        return this._dry.gain.value;
    }

    set dry(value) {
        this.setSafeParamValue(this._dry.gain, value);
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
