import 'core-js/fn/object/assign';
import context from './context';
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

const VERSION = '2.0.7';
const bus = new Group(context, context.destination);

/*
* Get Sound by id
*/

function get(id) {
    return bus.find(id);
}

/*
* Create group
*/

function group(sounds) {
    const soundGroup = new SoundGroup(context, bus.gain);
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
        context,
        destination: bus.gain
    }));
    sound.isTouchLocked = isTouchLocked;
    if (config) {
        sound.id = config.id || config.name || '';
        sound.loop = !!config.loop;
        sound.volume = config.volume;
        sound.effects = config.effects || [];
    }
    bus.add(sound);
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
            console.error('[ERROR] sono.load: ' + err);
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
    bus.find(soundOrId, (sound) => sound.destroy());
    return sono;
}

function destroyAll() {
    bus.destroy();
    return sono;
}

/*
* Controls
*/

function mute() {
    bus.mute();
    return sono;
}

function unMute() {
    bus.unMute();
    return sono;
}

function fade(volume, duration) {
    bus.fade(volume, duration);
    return sono;
}

function pauseAll() {
    bus.pause();
    return sono;
}

function resumeAll() {
    bus.resume();
    return sono;
}

function stopAll() {
    bus.stop();
    return sono;
}

function play(id, delay, offset) {
    bus.find(id, (sound) => sound.play(delay, offset));
    return sono;
}

function pause(id) {
    bus.find(id, (sound) => sound.pause());
    return sono;
}

function stop(id) {
    bus.find(id, (sound) => sound.stop());
    return sono;
}

/*
* Mobile touch lock
*/

let isTouchLocked = touchLock(context, () => {
    isTouchLocked = false;
    bus.sounds.forEach(sound => (sound.isTouchLocked = false));
});

/*
* Page visibility events
*/

const pageHiddenPaused = [];

// pause currently playing sounds and store refs
function onHidden() {
    bus.sounds.forEach(sound => {
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

pageVisibility(onHidden, onShown);

function register(name, fn, attachTo = Effects.prototype) {
    attachTo[name] = fn;
    sono[name] = fn;

    return fn;
}

const sono = {
    canPlay: file.canPlay,
    context,
    create,
    createGroup: group,
    createSound: create,
    destroyAll,
    destroy,
    effects: bus.effects,
    extensions: file.extensions,
    fade,
    file,
    gain: bus.gain,
    getOfflineContext: utils.getOfflineContext,
    get,
    getSound: get,
    group,
    hasWebAudio: !context.isFake,
    isSupported: file.extensions.length > 0,
    load,
    log: () => log(sono),
    mute,
    pause,
    pauseAll,
    play,
    register,
    resumeAll,
    stop,
    stopAll,
    unMute,
    utils,
    VERSION,
    get effects() {
        return bus.effects;
    },
    set effects(value) {
        bus.effects.removeAll().add(value);
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
    get sounds() {
        return bus.sounds.slice(0);
    },
    get volume() {
        return bus.volume;
    },
    set volume(value) {
        bus.volume = value;
    },
    // expose for unit testing
    __test: {
        Effects,
        Group,
        Sound
    }

};

export default sono;
