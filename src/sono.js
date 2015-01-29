'use strict';

var Browser = require('./lib/utils/browser.js'),
    File = require('./lib/utils/file.js'),
    Group = require('./lib/group.js'),
    Loader = require('./lib/utils/loader.js'),
    Sound = require('./lib/sound.js'),
    SoundGroup = require('./lib/utils/sound-group.js'),
    Utils = require('./lib/utils/utils.js');

function Sono() {
    this.VERSION = '0.0.6';

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    var context = window.AudioContext ? new window.AudioContext() : null;
    var destination = context ? context.destination : null;

    this._group = new Group(context, destination);
    this._gain = this._group.gain;
    this._sounds = this._group.sounds;
    this._context = context;

    Utils.setContext(context);
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
 * Filename string (e.g. 'foo.ogg')
 * Oscillator type string (i.e. 'sine', 'square', 'sawtooth', 'triangle')
 * ScriptProcessor config object (e.g. { bufferSize: 1024, channels: 1, callback: fn, thisArg: self })
 */

Sono.prototype.createSound = function(config) {
    // try to load if config contains URLs
    if(File.containsURL(config)) {
        return this.load(config);
    }
    // option to use simple audio el
    var context = (config && config.noWebAudio) ? null : this._context;
    // otherwise just return a new sound object
    var sound = new Sound(context, this._gain);
    sound.isTouchLocked = this._isTouchLocked;
    if(config) {
        sound.data = config.data || config;
        sound.id = config.id !== undefined ? config.id : '';
        sound.loop = !!config.loop;
        sound.volume = config.volume;
    }
    this._group.add(sound);

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
            sound.destroy();
            return true;
        }
    });
    return this;
};

Sono.prototype.destroyAll = function() {
    this._group.destroy();
    return this;
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
 * Create group
 */

Sono.prototype.createGroup = function(sounds) {
    var group = new SoundGroup(this._context, this._gain);
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

Sono.prototype.load = function(config) {
    if(!config) {
        throw new Error('ArgumentException: Sono.load: param config is undefined');
    }

    var onProgress = config.onProgress,
        onComplete = config.onComplete,
        thisArg = config.thisArg || config.context || this,
        url = config.url || config,
        sound,
        loader;

    if(File.containsURL(url)) {
        sound = this._queue(config);
        loader = sound.loader;
    }
    else if(Array.isArray(url) && File.containsURL(url[0].url) ) {
        sound = [];
        loader = new Loader.Group();

        url.forEach(function(file) {
            sound.push(this._queue(file, loader));
        }, this);
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
    loader.start();

    return sound;
};

Sono.prototype._queue = function(config, group) {
    var context = (config && config.noWebAudio) ? null : this._context;
    var sound = new Sound(context, this._gain);
    sound.isTouchLocked = this._isTouchLocked;
    this._group.add(sound);

    sound.id = config.id !== undefined ? config.id : '';
    sound.loop = !!config.loop;
    sound.volume = config.volume;
    sound.load(config);

    if(group) { group.add(sound.loader); }

    return sound;
};

/*
 * Controls
 */

Sono.prototype.mute = function() {
    this._group.mute();
    return this;
};

Sono.prototype.unMute = function() {
    this._group.unMute();
    return this;
};

Object.defineProperty(Sono.prototype, 'volume', {
    get: function() {
        return this._group.volume;
    },
    set: function(value) {
        this._group.volume = value;
    }
});

Sono.prototype.fade = function(volume, duration) {
    this._group.fade(volume, duration);
    return this;
};

Sono.prototype.pauseAll = function() {
    this._group.pause();
    return this;
};

Sono.prototype.resumeAll = function() {
    this._group.resume();
    return this;
};

Sono.prototype.stopAll = function() {
    this._group.stop();
    return this;
};

Sono.prototype.play = function(id, delay, offset) {
    this.getSound(id).play(delay, offset);
    return this;
};

Sono.prototype.pause = function(id) {
    this.getSound(id).pause();
    return this;
};

Sono.prototype.stop = function(id) {
    this.getSound(id).stop();
    return this;
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
            return this._group.effect;
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
    'gain': {
        get: function() {
            return this._gain;
        }
    },
    'sounds': {
        get: function() {
            return this._group.sounds.slice(0);
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
