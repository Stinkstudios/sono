export default class AbstractDirectEffect {
    constructor(node) {
        this._node = this._in = this._out = node;
    }

    connect(node) {
        this._node.connect(node._in || node);
    }

    disconnect(...args) {
        this._node.disconnect(args);
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
