'use strict';

var Browser = require('./lib/utils/browser.js'),
    Effect = require('./lib/effect.js'),
    File = require('./lib/utils/file.js'),
    Loader = require('./lib/utils/loader.js'),
    Sound = require('./lib/sound.js'),
    Utils = require('./lib/utils/utils.js');

function Sono() {
    this.VERSION = '0.0.6';

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this._context = window.AudioContext ? new window.AudioContext() : null;
    Utils.setContext(this._context);

    this._effect = new Effect(this._context);
    this._masterGain = this._effect.gain();

    if(this._context) {
        this._effect.setSource(this._masterGain);
        this._effect.setDestination(this._context.destination);
    }

    this._sounds = [];

    this._handleTouchlock();
    this._handlePageVisibility();
}

/*
 * Create
 *
 * Accepted values for param config:
 * Object config e.g. { id:'foo', url:['foo.ogg', 'foo.mp3'] }
 * Array (of files e.g. ['foo.ogg', 'foo.mp3'])
 * ArrayBuffer
 * HTMLMediaElement
 * String (filename e.g. 'foo.ogg')
 * String (Oscillator type i.e. 'sine', 'square', 'sawtooth', 'triangle')
 * Object (ScriptProcessor config: { bufferSize: 1024, channels: 1, callback: fn, thisArg: self })
 */

Sono.prototype.createSound = function(config) {
    // try to load if config contains URLs
    if(File.containsURL(config)) {
        return this.load(config);
    }
    // otherwise just return a new sound object
    var sound = new Sound(this._context, this._masterGain);
    sound.isTouchLocked = this._isTouchLocked;
    if(config) {
        sound.data = config.data || config;
        sound.id = config.id !== undefined ? config.id : '';
        sound.loop = !!config.loop;
        sound.volume = config.volume;
    }
    this._sounds.push(sound);

    return sound;
};

/*
 * Destroy
 */

Sono.prototype.destroySound = function(soundOrId) {
    if(!soundOrId) { return; }

    this._sounds.some(function(sound, index, sounds) {
        if(sound === soundOrId || sound.id === soundOrId) {
            sounds.splice(index, 1);
            if(sound.loader) {
                sound.loader.destroy();
                sound.loader = null;
            }
            sound.destroy();
            return true;
        }
    });
};

/*
 * Get Sound by id
 */

Sono.prototype.getSound = function(id) {
    var sound = null;
    this._sounds.some(function(item) {
        if(item.id === id) {
            sound = item;
            return true;
        }
    });
    return sound;
};

/*
 * Loading
 */

Sono.prototype.load = function(config) {
    if(!config) {
        throw new Error('ArgumentException: Sono.load: param config is undefined');
    }

    var asMediaElement = !!config.asMediaElement,
        onProgress = config.onProgress,
        onComplete = config.onComplete,
        thisArg = config.thisArg || config.context || this,
        url = config.url || config;

    var sound,
        loader;

    if(File.containsURL(url)) {
        sound = this._queue(config, asMediaElement);
        loader = sound.loader;
    }
    else if(Array.isArray(url) && File.containsURL(url[0].url) ) {
        sound = [];
        loader = new Loader.Group();

        url.forEach(function(file) {
            sound.push(this._queue(file, asMediaElement, loader));
        }, this);
    }
    else {
        return null;
    }

    if(onProgress) {
        loader.onProgress.add(onProgress, thisArg);
    }
    if(onComplete) {
        loader.onComplete.addOnce(function() {
            onComplete.call(thisArg, sound);
        });
    }
    loader.start();

    return sound;
};

Sono.prototype._queue = function(config, asMediaElement, group) {
    var url = File.getSupportedFile(config.url || config);
    var sound = this.createSound();
    sound.id = config.id !== undefined ? config.id : '';
    sound.loop = !!config.loop;
    sound.volume = config.volume;

    var loader = new Loader(url);
    loader.audioContext = asMediaElement ? null : this._context;
    loader.isTouchLocked = this._isTouchLocked;
    loader.onBeforeComplete.addOnce(function(data) {
        sound.data = data;
    });
    // keep a ref so can call sound.loader.cancel()
    sound.loader = loader;
    if(group) { group.add(loader); }

    return sound;
};

/*
 * Controls
 */

Sono.prototype.mute = function() {
    this._preMuteVolume = this.volume;
    this.volume = 0;
};

Sono.prototype.unMute = function() {
    this.volume = this._preMuteVolume || 1;
};

Object.defineProperty(Sono.prototype, 'volume', {
    get: function() {
        return this._masterGain.gain.value;
    },
    set: function(value) {
        if(isNaN(value)) { return; }

        this._masterGain.gain.value = value;

        if(this._context) {
            this._masterGain.gain.cancelScheduledValues(this._context.currentTime);
            this._masterGain.gain.setValueAtTime(value, this._context.currentTime);
        }
        else {
            this._sounds.forEach(function(sound) {
                sound.volume = value;
            });
        }
    }
});

Sono.prototype.fade = function(volume, duration) {
    if(this._context) {
        var  param = this._masterGain.gain;
        param.cancelScheduledValues(this._context.currentTime);
        param.setValueAtTime(param.value, this._context.currentTime);
        param.linearRampToValueAtTime(volume, this._context.currentTime + duration);
    }
    else {
        this._sounds.forEach(function(sound) {
            sound.fade(volume, duration);
        });
    }

    return this;
};

Sono.prototype.pauseAll = function() {
    this._sounds.forEach(function(sound) {
        if(sound.playing) {
            sound.pause();
        }
    });
};

Sono.prototype.resumeAll = function() {
    this._sounds.forEach(function(sound) {
        if(sound.paused) {
            sound.play();
        }
    });
};

Sono.prototype.stopAll = function() {
    this._sounds.forEach(function(sound) {
        sound.stop();
    });
};

Sono.prototype.play = function(id, delay, offset) {
    this.getSound(id).play(delay, offset);
};

Sono.prototype.pause = function(id) {
    this.getSound(id).pause();
};

Sono.prototype.stop = function(id) {
    this.getSound(id).stop();
};

/*
 * Mobile touch lock
 */

Sono.prototype._handleTouchlock = function() {
    var onUnlock = function() {
        this._isTouchLocked = false;
        this._sounds.forEach(function(sound) {
            sound.isTouchLocked = false;
            if(sound.loader) {
                sound.loader.isTouchLocked = false;
            }
        });
    };
    this._isTouchLocked = Browser.handleTouchLock(onUnlock, this);
};

/*
 * Page visibility events
 */

Sono.prototype._handlePageVisibility = function() {
    var pageHiddenPaused = [],
        sounds = this._sounds;

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

    Browser.handlePageVisibility(onHidden, onShown, this);
};

/*
 * Log version & device support info
 */

Sono.prototype.log = function() {
    var title = 'Sono ' + this.VERSION,
        info = 'Supported:' + this.isSupported +
               ' WebAudioAPI:' + this.hasWebAudio +
               ' TouchLocked:' + this._isTouchLocked +
               ' Extensions:' + File.extensions;

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

/*
 * Getters & Setters
 */

Object.defineProperties(Sono.prototype, {
    'canPlay': {
        get: function() {
            return File.canPlay;
        }
    },
    'context': {
        get: function() {
            return this._context;
        }
    },
    'effect': {
        get: function() {
            return this._effect;
        }
    },
    'extensions': {
        get: function() {
            return File.extensions;
        }
    },
    'hasWebAudio': {
        get: function() {
            return !!this._context;
        }
    },
    'isSupported': {
        get: function() {
            return File.extensions.length > 0;
        }
    },
    'masterGain': {
        get: function() {
            return this._masterGain;
        }
    },
    'sounds': {
        get: function() {
            return this._sounds.slice(0);
        }
    },
    'utils': {
        get: function() {
            return Utils;
        }
    }
});

/*
 * Exports
 */

module.exports = new Sono();
