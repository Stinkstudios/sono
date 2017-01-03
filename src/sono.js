import browser from './lib/utils/browser';
import file from './lib/utils/file';
import Group from './lib/group';
import Loader from './lib/utils/loader';
import Sound from './lib/sound';
import SoundGroup from './lib/utils/sound-group';
import utils from './lib/utils/utils';

function Sono() {
    const VERSION = '0.1.85';
    const context = utils.getContext();
    const destination = (context ? context.destination : null);
    const group = new Group(context, destination);

    let api = null;
    let isTouchLocked = false;

    /*
     * Get Sound by id
     */

    function getSound(id) {
        return group.find(id);
    }

    /*
     * Create group
     */

    function createGroup(sounds) {
        const soundGroup = new SoundGroup(context, group.gain);
        if (sounds) {
            sounds.forEach((sound) => soundGroup.add(sound));
        }
        return soundGroup;
    }

    /*
     * Loading
     */

    function add(config) {
        const soundContext = config && config.webAudio === false ? null : context;
        // const sound = new Sound(soundContext, group.gain);
        const src = file.getSupportedFile(config.src || config.url || config.data || config);
        const sound = new Sound(Object.assign({}, config || {}, {
            src,
            context: soundContext,
            destination: group.gain
        }));
        sound.isTouchLocked = isTouchLocked;
        if (config) {
            sound.id = config.id || config.name || '';
            sound.loop = !!config.loop;
            sound.volume = config.volume;
        }
        group.add(sound);
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
            loader.once('complete', function() {
                loader.off('progress');
                config.onComplete(sound);
            });
        }
        loader.once('error', function(err) {
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
     * ScriptProcessor config object (e.g. { bufferSize: 1024, channels: 1, callback: fn })
     */

    function createSound(config) {
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

    function destroySound(soundOrId) {
        group.find(soundOrId, (sound) => sound.destroy());
        return api;
    }

    function destroyAll() {
        group.destroy();
        return api;
    }

    /*
     * Controls
     */

    function mute() {
        group.mute();
        return api;
    }

    function unMute() {
        group.unMute();
        return api;
    }

    function fade(volume, duration) {
        group.fade(volume, duration);
        return api;
    }

    function pauseAll() {
        group.pause();
        return api;
    }

    function resumeAll() {
        group.resume();
        return api;
    }

    function stopAll() {
        group.stop();
        return api;
    }

    function play(id, delay, offset) {
        group.find(id, (sound) => sound.play(delay, offset));
        return api;
    }

    function pause(id) {
        group.find(id, (sound) => sound.pause());
        return api;
    }

    function stop(id) {
        group.find(id, (sound) => sound.stop());
        return api;
    }

    /*
     * Mobile touch lock
     */

    isTouchLocked = browser.handleTouchLock(context, function() {
        isTouchLocked = false;
        group.sounds.forEach((sound) => (sound.isTouchLocked = false));
    });

    /*
     * Page visibility events
     */

    (function() {
        const pageHiddenPaused = [];

        // pause currently playing sounds and store refs
        function onHidden() {
            group.sounds.forEach(function(sound) {
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

    /*
     * Log version & device support info
     */

    function log() {
        const title = 'sono ' + VERSION,
            info = 'Supported:' + api.isSupported +
            ' WebAudioAPI:' + api.hasWebAudio +
            ' TouchLocked:' + isTouchLocked +
            ' State:' + (context && context.state) +
            ' Extensions:' + file.extensions;

        if (navigator.userAgent.indexOf('Chrome') > -1) {
            const args = [
                '%c ♫ ' + title +
                ' ♫ %c ' + info + ' ',
                'color: #FFFFFF; background: #379F7A',
                'color: #1F1C0D; background: #E0FBAC'
            ];
            console.log.apply(console, args);
        } else if (window.console && window.console.log.call) {
            console.log.call(console, title + ' ' + info);
        }
    }

    api = {
        createSound,
        create: createSound,
        destroySound,
        destroyAll,
        getSound,
        createGroup,
        file,
        load,
        mute,
        unMute,
        fade,
        pauseAll,
        resumeAll,
        stopAll,
        play,
        pause,
        stop,
        log,

        canPlay: file.canPlay,
        context,
        getOfflineContext: utils.getOfflineContext,
        effect: group.effect,
        extensions: file.extensions,
        hasWebAudio: !!context,
        isSupported: file.extensions.length > 0,
        gain: group.gain,
        utils,
        VERSION,

        Sound,
        Group
    };

    /*
     * Getters & Setters
     */

    Object.defineProperties(api, {
        isTouchLocked: {
            get: function() {
                return isTouchLocked;
            }
        },
        sounds: {
            get: function() {
                return group.sounds.slice(0);
            }
        },
        volume: {
            get: function() {
                return group.volume;
            },
            set: function(value) {
                group.volume = value;
            }
        }
    });

    return Object.freeze(api);
}

export default new Sono();
