'use strict';

var Browser = require('./lib/utils/browser.js'),
    file = require('./lib/utils/file.js'),
    Group = require('./lib/group.js'),
    Loader = require('./lib/utils/loader.js'),
    Sound = require('./lib/sound.js'),
    SoundGroup = require('./lib/utils/sound-group.js'),
    utils = require('./lib/utils/utils.js');

function Sono() {
    var VERSION = '0.0.8',
        Ctx = (window.AudioContext || window.webkitAudioContext),
        context = (Ctx ? new Ctx() : null),
        destination = (context ? context.destination : null),
        group = new Group(context, destination),
        gain = group.gain,
        sounds = group.sounds,
        api;

    utils.setContext(context);

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
     * ScriptProcessor config object (e.g. { bufferSize: 1024, channels: 1, callback: fn, thisArg: self })
     */

    var createSound = function(config) {
        // try to load if config contains URLs
        if(file.containsURL(config)) {
            return load(config);
        }

        var sound = add(config);
        sound.data = config.data || config;

        return sound;
    };

    /*
     * Destroy
     */

    var destroySound = function(soundOrId) {
        if(!soundOrId) { return; }

        sounds.some(function(sound) {
            if(sound === soundOrId || sound.id === soundOrId) {
                sound.destroy();
                return true;
            }
        });
        return api;
    };

    var destroyAll = function() {
        group.destroy();
        return api;
    };

    /*
     * Get Sound by id
     */

    var getSound = function(id) {
        var sound;
        sounds.some(function(item) {
            if(item.id === id) {
                sound = item;
                return true;
            }
        });
        return sound;
    };

    /*
     * Create group
     */

    var createGroup = function(sounds) {
        var group = new SoundGroup(context, gain);
        if(sounds) {
            sounds.forEach(function(sound) {
                group.add(sound);
            });
        }
        return group;
    };

    /*
     * Loading
     */

    var load = function(config) {
        if(!config) {
            throw {
                name: 'ArgumentException',
                message: 'Sono.load: param config is undefined'
            };
        }

        var onProgress = config.onProgress,
            onComplete = config.onComplete,
            onError = config.onError,
            thisArg = config.thisArg || config.context || api,
            url = config.url || config,
            sound,
            loader;

        if(file.containsURL(url)) {
            sound = queue(config);
            loader = sound.loader;
        }
        else if(Array.isArray(url) && file.containsURL(url[0].url) ) {
            sound = [];
            loader = new Loader.Group();

            url.forEach(function(file) {
                sound.push(queue(file, loader));
            });
        }
        else {
            return null;
        }

        if(onProgress) {
            loader.on('progress', function(progress) {
                onProgress.call(thisArg, progress);
            });
        }
        if(onComplete) {
            loader.once('complete', function() {
                loader.off('progress');
                onComplete.call(thisArg, sound);
            });
        }
        loader.once('error', function(err) {
            loader.off('error');
            if(onError) {
                onError.call(thisArg, err);
            } else {
                console.warn.call(console, err);
            }
        });
        loader.start();

        return sound;
    };

    var queue = function(config, loaderGroup) {
        var sound = add(config).load(config);

        if(loaderGroup) {
            loaderGroup.add(sound.loader);
        }

        return sound;
    };

    var add = function(config) {
        var soundContext = config && config.webAudio === false ? null : context;
        var sound = new Sound(soundContext, gain);
        sound.isTouchLocked = isTouchLocked;
        if(config) {
            sound.id = config.id || '';
            sound.loop = !!config.loop;
            sound.volume = config.volume;
        }
        group.add(sound);
        return sound;
    };

    /*
     * Controls
     */

    var mute = function() {
        group.mute();
        return api;
    };

    var unMute = function() {
        group.unMute();
        return api;
    };

    var fade = function(volume, duration) {
        group.fade(volume, duration);
        return api;
    };

    var pauseAll = function() {
        group.pause();
        return api;
    };

    var resumeAll = function() {
        group.resume();
        return api;
    };

    var stopAll = function() {
        group.stop();
        return api;
    };

    var play = function(id, delay, offset) {
        getSound(id).play(delay, offset);
        return api;
    };

    var pause = function(id) {
        getSound(id).pause();
        return api;
    };

    var stop = function(id) {
        getSound(id).stop();
        return api;
    };

    /*
     * Mobile touch lock
     */

    var isTouchLocked = Browser.handleTouchLock(context, function() {
        isTouchLocked = false;
        sounds.forEach(function(sound) {
            sound.isTouchLocked = false;
        });
    });

    /*
     * Page visibility events
     */

    (function() {
        var pageHiddenPaused = [];

        // pause currently playing sounds and store refs
        function onHidden() {
            sounds.forEach(function(sound) {
                if(sound.playing) {
                    sound.pause();
                    pageHiddenPaused.push(sound);
                }
            });
        }

        // play sounds that got paused when page was hidden
        function onShown() {
            while(pageHiddenPaused.length) {
                pageHiddenPaused.pop().play();
            }
        }

        Browser.handlePageVisibility(onHidden, onShown);
    }());

    /*
     * Log version & device support info
     */

    var log = function() {
        var title = 'Sono ' + VERSION,
            info = 'Supported:' + api.isSupported +
                   ' WebAudioAPI:' + api.hasWebAudio +
                   ' TouchLocked:' + isTouchLocked +
                   ' Extensions:' + file.extensions;

        if(navigator.userAgent.indexOf('Chrome') > -1) {
            var args = [
                    '%c ♫ ' + title +
                    ' ♫ %c ' + info + ' ',
                    'color: #FFFFFF; background: #379F7A',
                    'color: #1F1C0D; background: #E0FBAC'
                ];
            console.log.apply(console, args);
        }
        else if (window.console && window.console.log.call) {
            console.log.call(console, title + ' ' + info);
        }
    };

    api = {
        createSound: createSound,
        destroySound: destroySound,
        destroyAll: destroyAll,
        getSound: getSound,
        createGroup: createGroup,
        load: load,
        mute: mute,
        unMute: unMute,
        fade: fade,
        pauseAll: pauseAll,
        resumeAll: resumeAll,
        stopAll: stopAll,
        play: play,
        pause: pause,
        stop: stop,
        log: log,

        canPlay: file.canPlay,
        context: context,
        effect: group.effect,
        extensions: file.extensions,
        hasWebAudio: !!context,
        isSupported: file.extensions.length > 0,
        gain: gain,
        utils: utils,
        VERSION: VERSION
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

module.exports = new Sono();
