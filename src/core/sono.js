import 'core-js/fn/object/assign';
import createContext from './utils/createContext';
import Effects from './effects';
import file from './utils/file';
import Group from './group';
import Loader from './utils/loader';
import log from './utils/log';
import pageVisibility from './utils/pageVisibility';
import Sound from './sound';
import SoundGroup from './utils/sound-group';
import touchLock from './utils/touchLock';
import utils from './utils/utils';

const VERSION = '2.1.5';

/*
* Initialize the context
*/

function initContext() {
    sono.context = createContext();
    sono.hasWebAudio = !sono.context.isFake;
    sono.bus = new Group(sono.context, sono.context.destination);
    sono.effects = sono.bus.effects;
    sono.gain = sono.bus.gain;

    // Mobile touch lock
    isTouchLocked = touchLock(sono.context, () => {
        isTouchLocked = false;
        sono.bus.sounds.forEach(sound => (sound.isTouchLocked = false));
    });

    // Page visibility events
    sono.pageVis = pageVisibility(onHidden, onShown);

    return sono.context;
}

/*
* Get Sound by id
*/

function get(id) {
    return sono.bus.find(id);
}

/*
* Create group
*/

function group(sounds) {
    const soundGroup = new SoundGroup(sono.context || initContext(), sono.bus.gain);
    if (sounds) {
        sounds.forEach((sound) => soundGroup.add(sound));
    }
    return soundGroup;
}

/*
* Loading
*/

function add(config) {
    const src = file.getSupportedFile(config.src || config.url || config.data || config);
    const sound = new Sound(Object.assign({}, config || {}, {
        src,
        context: sono.context || initContext(),
        destination: sono.bus.gain
    }));
    sound.isTouchLocked = isTouchLocked;
    if (config) {
        sound.id = config.id || config.name || '';
        sound.loop = !!config.loop;
        sound.volume = config.volume;
        sound.effects = config.effects || [];
    }
    sono.bus.add(sound);
    return sound;
}

function queue(config, loaderGroup) {
    const sound = add(config).prepare();

    if (loaderGroup) {
        loaderGroup.add(sound.loader);
    }
    return sound;
}

function load(config) {
    const src = config.src || config.url || config.data || config;
    let sound, loader;

    if (file.containsURL(src)) {
        sound = queue(config);
        loader = sound.loader;
    } else if (Array.isArray(src) && file.containsURL(src[0].src || src[0].url)) {
        sound = [];
        loader = new Loader.Group();
        src.forEach((url) => sound.push(queue(url, loader)));
    } else {
        const errorMessage = 'sono.load: No audio file URLs found in config.';
        if (config.onError) {
            config.onError('[ERROR] ' + errorMessage);
        } else {
            throw new Error(errorMessage);
        }
        return null;
    }
    if (config.onProgress) {
        loader.on('progress', (progress) => config.onProgress(progress));
    }
    if (config.onComplete) {
        loader.once('complete', () => {
            loader.off('progress');
            config.onComplete(sound);
        });
    }
    loader.once('error', err => {
        loader.off('error');
        if (config.onError) {
            config.onError(err);
        } else {
            console.error(err);
        }
    });
    loader.start();

    return sound;
}

/*
* Create Sound
*
* Accepted values for param config:
* Object config e.g. { id:'foo', url:['foo.ogg', 'foo.mp3'] }
* Array (of files e.g. ['foo.ogg', 'foo.mp3'])
* ArrayBuffer
* HTMLMediaElement
* Filename string (e.g. 'foo.ogg')
* Oscillator type string (i.e. 'sine', 'square', 'sawtooth', 'triangle')
*/

function create(config) {
    // try to load if config contains URLs
    if (file.containsURL(config)) {
        return load(config);
    }

    const sound = add(config);
    sound.data = config.data || config;

    return sound;
}

/*
* Destroy
*/

function destroy(soundOrId) {
    sono.bus.find(soundOrId, (sound) => sound.destroy());
    return sono;
}

function destroyAll() {
    sono.bus.destroy();
    return sono;
}

/*
* Controls
*/

function mute() {
    sono.bus.mute();
    return sono;
}

function unMute() {
    sono.bus.unMute();
    return sono;
}

function fade(volume, duration) {
    sono.bus.fade(volume, duration);
    return sono;
}

function playAll(delay, offset) {
    sono.bus.play(delay, offset);
    return sono;
}

function pauseAll() {
    sono.bus.pause();
    return sono;
}

function resumeAll() {
    sono.bus.resume();
    return sono;
}

function stopAll() {
    sono.bus.stop();
    return sono;
}

function play(id, delay, offset) {
    sono.bus.find(id, (sound) => sound.play(delay, offset));
    return sono;
}

function pause(id) {
    sono.bus.find(id, (sound) => sound.pause());
    return sono;
}

function stop(id) {
    sono.bus.find(id, (sound) => sound.stop());
    return sono;
}

/*
* Mobile touch lock
*/

let isTouchLocked = () => {
    return false;
};

/*
* Page visibility events
*/

const pageHiddenPaused = [];

// pause currently playing sounds and store refs
function onHidden() {
    sono.bus.sounds.forEach(sound => {
        if (sound.playing) {
            sound.pause();
            pageHiddenPaused.push(sound);
        }
    });
}

// play sounds that got paused when page was hidden
function onShown() {
    while (pageHiddenPaused.length) {
        pageHiddenPaused.pop().play();
    }
}

function register(name, fn, attachTo = Effects.prototype) {
    attachTo[name] = fn;
    sono[name] = fn;

    return fn;
}

const sono = {
    canPlay: file.canPlay,
    context: null,
    create,
    createGroup: group,
    createSound: create,
    destroyAll,
    destroy,
    extensions: file.extensions,
    fade,
    file,
    getOfflineContext: utils.getOfflineContext,
    get,
    getSound: get,
    group,
    init: initContext,
    initAudioContext: initContext,
    initContext,
    isSupported: file.extensions.length > 0,
    load,
    log: () => log(sono),
    mute,
    pause,
    pauseAll,
    play,
    playAll,
    register,
    resumeAll,
    stop,
    stopAll,
    unMute,
    utils,
    VERSION,
    get effects() {
        return sono.bus.effects;
    },
    set effects(value) {
        sono.bus.effects.removeAll().add(value);
    },
    get fx() {
        return this.effects;
    },
    set fx(value) {
        this.effects = value;
    },
    get isTouchLocked() {
        return isTouchLocked;
    },
    get playInBackground() {
        return !sono.pageVis.enabled;
    },
    set playInBackground(value) {
        sono.pageVis.enabled = !value;

        if (!value) {
            onShown();
        }
    },
    get sounds() {
        return sono.bus.sounds.slice(0);
    },
    get volume() {
        return sono.bus.volume;
    },
    set volume(value) {
        sono.bus.volume = value;
    },
    // expose for unit testing
    __test: {
        Effects,
        Group,
        Sound
    }
};

export default sono;
