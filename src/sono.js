'use strict';

var Loader = require('./lib/loader.js'),
    NodeManager = require('./lib/node-manager.js'),
    Sound = require('./lib/sound.js'),
    Support = require('./lib/support.js'),
    Utils = require('./lib/utils.js');

function Sono() {
    this.VERSION = '0.0.0';

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this._context = window.AudioContext ? new window.AudioContext() : null;
    Utils.setContext(this._context);

    this._node = new NodeManager(this._context);
    this._masterGain = this._node.gain();
    if(this._context) {
        this._node.setSource(this._masterGain);
        this._node.setDestination(this._context.destination);
    }

    this._sounds = [];
    this._support = new Support();

    this._handleTouchlock();
    this._handleVisibility();
}

/*
 * Create
 *
 * Accepted values for param data:
 *
 * ArrayBuffer
 * HTMLMediaElement
 * Array (of files e.g. ['foo.ogg', 'foo.mp3'])
 * String (filename e.g. 'foo.ogg')
 * String (Oscillator type i.e. 'sine', 'square', 'sawtooth', 'triangle')
 * Object (ScriptProcessor config: { bufferSize: 1024, channels: 1, callback: fn, thisArg: self })
 */

Sono.prototype.createSound = function(config) {
    // try to load if data is Array or file string
    if(Utils.isFile(config)) {
        return this.load(config);
    }
    var isConfigObject = typeof config === 'object' && config.data;
    var data = isConfigObject ? config.data : config;
    // otherwise just return a new sound object
    var sound = new Sound(this._context, data, this._masterGain);
    if(isConfigObject) {
        sound.id = config.id || '';
        sound.loop = !!config.loop;
        sound.volume = config.volume;
    }
    this._sounds.push(sound);

    return sound;
};

/*
 * Destroy
 */

Sono.prototype.destroy = function(soundOrId) {
    this._sounds.some(function(sound, index, sounds) {
        if(sound === soundOrId || sound.id === soundOrId) {
            console.log.apply(console, ['destroy:'+sound]);
            sounds.splice(index, 1);
            if(sound.loader) {
                sound.loader.cancel();
            }
            try {
                sound.stop();
            } catch(e) {}
            return true;
        }
    });
};

/*
 * Get Sound by id
 */

Sono.prototype.getById = function(id) {
    var sound = null;
    this._sounds.some(function(item) {
        sound = item;
        return sound.id === id;
    });
    return sound;
};

/*
 * Loading
 */

Sono.prototype.load = function(url, complete, progress, thisArg, asMediaElement) {
    if(!url) { return; }

    if(url instanceof Array && url.length && typeof url[0] === 'object') {
        return this._loadMultiple(url, complete, progress, thisArg, asMediaElement);
    }
    else if(typeof url === 'object' && url.url) {
        return this._loadMultiple([url], complete, progress, thisArg, asMediaElement);   
    }

    var sound = this._queue(url, asMediaElement);

    if(progress) {
        sound.loader.onProgress.add(progress, thisArg || this);
    }
    if(complete) {
        sound.loader.onComplete.addOnce(function() {
            complete.call(thisArg || this, sound);
        });
    }
    sound.loader.start();

    return sound;
};

Sono.prototype._loadMultiple = function(config, complete, progress, thisArg, asMediaElement) {
    var sounds = [];
    var group = new Loader();
    group.touchLocked = this._isTouchLocked;
    group.webAudioContext = this._context;

    config.forEach(function(file) {
        var sound = this._queue(file.url, asMediaElement, group);
        sound.id = file.id || '';
        sound.loop = !!file.loop;
        sound.volume = file.volume;
        sounds.push(sound);
    }, this);
    if(progress) {
        group.onProgress.add(function(value) {
            progress.call(thisArg || this, value);
        }, this);
    }
    if(complete) {
        group.onComplete.addOnce(function() {
            complete.call(thisArg || this, sounds);
        }, this);
    }
    group.start();

    return sounds;
};

Sono.prototype._initLoader = function() {
    this._loader = new Loader();
    this._loader.touchLocked = this._isTouchLocked;
    this._loader.webAudioContext = this._context;
};

Sono.prototype._queue = function(url, asMediaElement, group) {
    url = this._support.getSupportedFile(url);

    var sound = this.createSound();
    var loader = group ? group.add(url) : new Loader.File(url);
    loader.webAudioContext = asMediaElement ? null : this._context;
    loader.touchLocked = this._isTouchLocked;
    loader.webAudioContext = this._context;
    loader.onBeforeComplete.addOnce(function(data) {
        sound.setData(data);
    });
    sound.loader = loader;

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

        if(!this.hasWebAudio) {
            this._sounds.forEach(function(sound) {
                sound.volume = value;
            });
        }
    }
});

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
    this.getById(id).play(delay, offset);
};

Sono.prototype.pause = function(id) {
    this.getById(id).pause();
};

Sono.prototype.stop = function(id) {
    this.getById(id).stop();
};

/*
 * Mobile touch lock
 */

Sono.prototype._handleTouchlock = function() {
    var ua = navigator.userAgent,
        locked = !!ua.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i),
        self = this;

    var unlock = function() {
        document.body.removeEventListener('touchstart', unlock);
        self._isTouchLocked = false;
        self._sounds.forEach(function(sound) {
            if(sound.loader) {
                sound.loader.touchLocked = false;
            }
        });

        if(self.context) {
            var buffer = self.context.createBuffer(1, 1, 22050);
            var unlockSource = self.context.createBufferSource();
            unlockSource.buffer = buffer;
            unlockSource.connect(self.context.destination);
            unlockSource.start(0);
        }
    };
    if(locked) {
        document.body.addEventListener('touchstart', unlock, false);
    }
    this._isTouchLocked = locked;
};

/*
 * Page visibility events
 */

Sono.prototype._handleVisibility = function() {
    var pageHiddenPaused = [],
        sounds = this._sounds,
        hidden,
        visibilityChange;

    if (typeof document.hidden !== 'undefined') {
        hidden = 'hidden';
        visibilityChange = 'visibilitychange';
    }
    else if (typeof document.mozHidden !== 'undefined') {
        hidden = 'mozHidden';
        visibilityChange = 'mozvisibilitychange';
    }
    else if (typeof document.msHidden !== 'undefined') {
        hidden = 'msHidden';
        visibilityChange = 'msvisibilitychange';
    }
    else if (typeof document.webkitHidden !== 'undefined') {
        hidden = 'webkitHidden';
        visibilityChange = 'webkitvisibilitychange';
    }

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

    function onChange() {
        if (document[hidden]) {
            onHidden();
        }
        else {
            onShown();
        }
    }

    if(visibilityChange !== undefined) {
        document.addEventListener(visibilityChange, onChange, false);
    }
};

/*
 * Log version & device support info
 */

Sono.prototype.log = function() {
    var title = 'Sono ' + this.VERSION,
        info = 'Supported:' + this.isSupported +
               ' WebAudioAPI:' + this.hasWebAudio +
               ' TouchLocked:' + this._isTouchLocked +
               ' Extensions:' + this._support.extensions;

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

Object.defineProperty(Sono.prototype, 'canPlay', {
    get: function() {
        return this._support.canPlay;
    }
});

Object.defineProperty(Sono.prototype, 'context', {
    get: function() {
        return this._context;
    }
});

Object.defineProperty(Sono.prototype, 'hasWebAudio', {
    get: function() {
        return !!this._context;
    }
});

Object.defineProperty(Sono.prototype, 'isSupported', {
    get: function() {
        return this._support.extensions.length > 0;
    }
});

Object.defineProperty(Sono.prototype, 'masterGain', {
    get: function() {
        return this._masterGain;
    }
});

Object.defineProperty(Sono.prototype, 'node', {
    get: function() {
        return this._node;
    }
});

Object.defineProperty(Sono.prototype, 'sounds', {
    get: function() {
        return this._sounds;
    }
});

Object.defineProperty(Sono.prototype, 'utils', {
    get: function() {
        return Utils;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = new Sono();
}
