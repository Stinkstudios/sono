import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';

class Script extends AbstractEffect {
    constructor({inputChannels = 1, outputChannels = 1, bufferSize = 1024, callback = null} = {}) {
        super(sono.context.createScriptProcessor(bufferSize, inputChannels, outputChannels));

        this._callback = callback || function(event) {
            const input = event.inputBuffer.getChannelData(0);
            const output = event.outputBuffer.getChannelData(0);
            const l = output.length;
            for (let i = 0; i < l; i++) {
                output[i] = input[i];
            }
        };

        this._node.onaudioprocess = this._callback;
    }

    update() {}
}

export default sono.register('script', opts => new Script(opts));
