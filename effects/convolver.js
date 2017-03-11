import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';
import file from '../core/utils/file';
import Loader from '../core/utils/loader';
import Sound from '../core/sound';

class Convolver extends AbstractEffect {
    constructor({impulse} = {}) {
        super();

        this._node = sono.context.createConvolver();
        this._in.connect(this._out);

        this._loader = null;

        this.update({impulse});
    }

    _load(src) {
        if (sono.context.isFake) {
            return;
        }
        if (this._loader) {
            this._loader.destroy();
        }
        this._loader = new Loader(src);
        this._loader.audioContext = sono.context;
        this._loader.once('complete', impulse => this.update({impulse}));
        this._loader.once('error', error => console.error(error));
        this._loader.start();
    }

    update({impulse}) {
        if (!impulse) {
            return this;
        }

        if (file.isAudioBuffer(impulse)) {
            this._node.buffer = impulse;
            this._in.disconnect();
            this._in.connect(this._node);
            this._node.connect(this._out);
            return this;
        }

        if (impulse instanceof Sound) {
            if (impulse.data) {
                this.update({impulse: impulse.data});
            } else {
                impulse.once('ready', sound => this.update({
                    impulse: sound.data
                }));
            }
            return this;
        }

        if (file.isURL(impulse) || file.isArrayBuffer(impulse)) {
            this._load(impulse);
        }

        return this;
    }

    get impulse() {
        return this._node.buffer;
    }

    set impulse(impulse) {
        this.update({impulse});
    }
}

export default sono.register('convolver', opts => new Convolver(opts));
