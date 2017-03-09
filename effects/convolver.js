import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';
import file from '../core/utils/file';
import Loader from '../core/utils/loader';
import Sound from '../core/sound';

class Convolver extends AbstractEffect {
    constructor({impulse = null} = {}) {
        super(sono.context.createConvolver());

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
        this._loader.once('loaded', impulse => this.update({impulse}));
        this._loader.on('error', error => console.error(error));
    }

    update({impulse}) {
        if (impulse instanceof Sound) {
            if (impulse.data) {
                this._node.buffer = impulse.data;
            } else {
                impulse.once('ready', sound => this.update({
                    impulse: sound.data
                }));
            }
            return this;
        }

        if (file.isAudioBuffer(impulse)) {
            this._node.buffer = impulse;
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
