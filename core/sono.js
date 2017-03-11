import context from './context';
import browser from './utils/browser';
import file from './utils/file';
import Group from './group';
import Loader from './utils/loader';
import Effects from './effects';
import Sound from './sound';
import SoundGroup from './utils/sound-group';
import utils from './utils/utils';
import log from './utils/log';

function Sono() {
    const VERSION = '0.1.9';
    const bus = new Group(context, context.destination);

    let api = null;
    let isTouchLocked = false;

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
        const sound = add(config).load();

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
        return api;
    }

    function destroyAll() {
        bus.destroy();
        return api;
    }

    /*
     * Controls
     */

    function mute() {
        bus.mute();
        return api;
    }

    function unMute() {
        bus.unMute();
        return api;
    }

    function fade(volume, duration) {
        bus.fade(volume, duration);
        return api;
    }

    function pauseAll() {
        bus.pause();
        return api;
    }

    function resumeAll() {
        bus.resume();
        return api;
    }

    function stopAll() {
        bus.stop();
        return api;
    }

    function play(id, delay, offset) {
        bus.find(id, (sound) => sound.play(delay, offset));
        return api;
    }

    function pause(id) {
        bus.find(id, (sound) => sound.pause());
        return api;
    }

    function stop(id) {
        bus.find(id, (sound) => sound.stop());
        return api;
    }

    /*
     * Mobile touch lock
     */

    isTouchLocked = browser.handleTouchLock(context, function() {
        isTouchLocked = false;
        bus.sounds.forEach((sound) => (sound.isTouchLocked = false));
    });

    /*
     * Page visibility events
     */

    (function() {
        const pageHiddenPaused = [];

        // pause currently playing sounds and store refs
        function onHidden() {
            bus.sounds.forEach(function(sound) {
                if (sound.playing) {
                    sound.pause();
                    pageHiddenPaused.push(sound);
                }
            });
        }

        // play sounds that got paused when page was hidden
        function onShown() {
            while (pageHiddenPaused.length) {
                pageHiddenPaused.pop()
                    .play();
            }
        }

        browser.handlePageVisibility(onHidden, onShown);
    }());

    function register(name, fn, attachTo = Effects.prototype) {
        attachTo[name] = fn;
        api[name] = fn;

        return fn;
    }

    api = {
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
        log: () => log(api),
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
    return api;
}

export default new Sono();