'use strict';

var AssetLoader = require('./lib/asset-loader.js'),
    HTMLSound = require('./lib/html-sound.js'),
    PageVisibility = require('./lib/page-visibility.js'),
    WebAudioNodeFactory = require('./lib/webaudio-nodefactory.js'),
    WebAudioPlayer = require('./lib/webaudio-player.js'),
    WebAudioUtils = require('./lib/webaudio-utils.js');

function Sono() {
    this.VERSION = '0.0.0';

    this._sounds = {};
    this.context = this.createAudioContext();

    if(this.hasWebAudio) {
        this._masterGain = this.context.createGain();
        this._masterGain.connect(this.context.destination);
    }
    else {
        this._masterGain = 1;
    }

    this.getSupportedExtensions();
    this.handleTouchlock();
    this.handlePageVisibility();
    this.initLoader();

    this.log(false);
}

/*
 * add - data can be element, arraybuffer or as yet null/undefined
 */

Sono.prototype.add = function(data, id) {

    // try to load if url is put into add?
    if(data && !(data instanceof HTMLMediaElement) && !(data instanceof AudioBuffer)) {
        var s = this.load(data);
        if(id) { s.id = id; }
        return s;
    }

    if(!id) { id = this.createId(); }

    if(this._sounds[id]) {
        return this._sounds[id];
    }

    var sound;
    if(this.hasWebAudio) {
        sound = new WebAudioPlayer(this.context, data, this._masterGain);
    }
    else {
        sound = new HTMLSound(data, this._masterGain);
    }
    sound.id = id;
    //sound.loop = !!loop;
    sound.add(data);
    this._sounds[id] = sound;
    return sound;
};

Sono.prototype.load = function(url, callback, callbackContext, asBuffer) {
    var sound = this.add();

    url = this.getSupportedFile(url);

    sound.loader = this._loader.add(url);
    //sound.loader = new AssetLoader.Loader(url);
    //sound.loader.touchLocked = this._isTouchLocked;
    if(asBuffer === undefined) {
        asBuffer = this.hasWebAudio;
    }
    if(asBuffer) {
        sound.loader.webAudioContext = this.context;
    }
    else {
        sound.loader.webAudioContext = null;
    }
    //sound.loader.crossOrigin = true;
    sound.loader.onComplete.add(function(buffer) {
        sound.add(buffer);
        //console.log('sound loaded:', url, buffer);
        if(callback) {
            callback.call(callbackContext || this, sound);
        }
    }, this);
    sound.loader.start();
    return sound;
};

Sono.prototype.get = function(id) {
    return this._sounds[id];
};

Sono.prototype.createId = function() {
    if(this._id === undefined) {
        this._id = 0;
    }
    this._id++;
    return this._id.toString(10);
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

Sono.prototype.pauseAll = function() {
    for(var i in this._sounds) {
        if(this._sounds[i].playing) {
            this._sounds[i].pause();
        }
    }
};

Sono.prototype.resumeAll = function() {
    for(var i in this._sounds) {
        if(this._sounds[i].paused) {
            this._sounds[i].play();
        }
    }
};

Sono.prototype.stopAll = function() {
    for(var id in this._sounds) {
        this._sounds[id].stop();
    }
};

Sono.prototype.play = function(id) {
    this._sounds[id].play();
};

Sono.prototype.pause = function(id) {
    this._sounds[id].pause();
};

Sono.prototype.stop = function(id) {
    this._sounds[id].stop();
};

/*
 * Loading
 */

Sono.prototype.initLoader = function() {
    this._loader = new AssetLoader();
    this._loader.touchLocked = this._isTouchLocked;
    this._loader.webAudioContext = this.context;
    this._loader.crossOrigin = true;
};

Sono.prototype.loadArrayBuffer = function(url, callback, callbackContext) {
    return this.load(url, callback, callbackContext, true);
};

Sono.prototype.loadAudioElement = function(url, callback, callbackContext) {
    return this.load(url, callback, callbackContext, false);
};

Sono.prototype.destroy = function(soundOrId) {
    var id = (typeof soundOrId === 'string') ? soundOrId : soundOrId.id;
    var sound = this._sounds[id];
    delete this._sounds[id];
    if(sound) {
        if(sound.loader) {
            sound.loader.cancel();
        }
        try {
            sound.stop();    
        } catch(e) {}
    }
};

/*
 * Support
 */

Sono.prototype.createAudioContext = function() {
    var context = null;
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if(window.AudioContext) {
        context = new window.AudioContext();
    }
    return context;
};

Sono.prototype.getSupportedFile = function(fileNames) {
    var supportedExtensions = this.getSupportedExtensions();
    // if array get the first one that works
    if(fileNames instanceof Array) {
        for (var i = 0; i < fileNames.length; i++) {
            var ext = this.getExtension(fileNames[i]);
            var ind = supportedExtensions.indexOf(ext);
            if(ind > -1) {
                return fileNames[i];
            }
        }
    }
    // if not array and is object
    else if(fileNames instanceof Object) {
        for(var key in fileNames) {
            var extension = this.getExtension(fileNames[key]);
            var index = supportedExtensions.indexOf(extension);
            if(index > -1) {
                return fileNames[key];
            }
        }
    }
    // if no extension add the fits good one
    // FIXME this currently fails with urls like: './audio/foo.mp3'
    // Think this could be a bit unstable - too many cases where could fail
    // e.g. some endpoint that returns a sound...
    /*else if(typeof fileNames === 'string' && !this.getExtension(fileNames)) {
        if(fileNames.lastIndexOf('.') !== fileNames.length - 1) {
            fileNames = fileNames + '.';
        }
        return fileNames + supportedExtensions[0];
    }*/
    // if has extension already just return
    return fileNames;
};

Sono.prototype.getExtension = function(fileName) {
    fileName = fileName.split('?')[0];
    var extension = fileName.split('.').pop();
    if(extension === fileName) { extension = ''; }
    return extension.toLowerCase();
};

Sono.prototype.getSupportedExtensions = function() {
    if(this._supportedExtensions) {
        return this._supportedExtensions;
    }
    var el = document.createElement('audio');
    if(!el) { return []; }

    var tests = [
        { ext: 'ogg', type: 'audio/ogg; codecs="vorbis"' },
        { ext: 'mp3', type: 'audio/mpeg;' },
        { ext: 'opus', type: 'audio/ogg; codecs="opus"' },
        { ext: 'wav', type: 'audio/wav; codecs="1"' },
        { ext: 'm4a', type: 'audio/x-m4a;' },
        { ext: 'm4a', type: 'audio/aac;' }
    ];
    var extensions = [];
    for (var i = 0; i < tests.length; i++) {
        var test = tests[i];
        if(!!el.canPlayType(test.type)) {
            extensions.push(test.ext);
        }
    }
    this._supportedExtensions = extensions;
    return this._supportedExtensions;
};

/*
 * Mobile touch lock
 */

Sono.prototype.handleTouchlock = function() {
    var ua = navigator.userAgent,
        locked = !!ua.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i),
        self = this;

    var unlock = function() {
        document.body.removeEventListener('touchstart', unlock);
        self._isTouchLocked = false;
        this._loader.touchLocked = false;

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

Sono.prototype.handlePageVisibility = function() {
    PageVisibility.onPageHidden.add(this.pauseAll, this);
    PageVisibility.onPageShown.add(this.resumeAll, this);
};

/*
 * Log device support info
 */

Sono.prototype.log = function(colorFull) {
    var title = 'Sono ' + this.VERSION,
        support = 'Supported:' + this.isSupported +
                  ' WebAudioAPI:' + this.hasWebAudio +
                  ' TouchLocked:' + this._isTouchLocked +
                  ' Extensions:' + this.getSupportedExtensions();

    if(colorFull && navigator.userAgent.indexOf('Chrome') > -1) {
        var args = [
            '%c %c ' + title +
            ' %c %c ' +
            support +
            ' %c ',
            'background: #17d186',
            'color: #000000; background: #d0f736; font-weight: bold',
            'background: #17d186',
            'background: #f7f94f',
            'background: #17d186'
        ];
        console.log.apply(console, args);
    }
    else if (window.console) {
        console.log(title + ' ' + support);
    }
};

/*
 * Getters & Setters
 */

Object.defineProperty(Sono.prototype, 'isSupported', {
    get: function() {
        return this.getSupportedExtensions().length > 0;
    }
});

Object.defineProperty(Sono.prototype, 'hasWebAudio', {
    get: function() {
        return !!this.context;
    }
});

Object.defineProperty(Sono.prototype, 'volume', {
    get: function() {
        return this.hasWebAudio ? this._masterGain.gain.value : this._masterGain;
    },
    set: function(value) {
        if(isNaN(value)) { return; }

        if(this.hasWebAudio) {
            this._masterGain.gain.value = value;
        }
        else {
            this._masterGain = value;
            for(var i in this._sounds) {
                this._sounds[i].volume = this._masterGain;
            }
        }
    }
});

Object.defineProperty(Sono.prototype, 'sounds', {
    get: function() {
        return this._sounds;
    }
});

Object.defineProperty(Sono.prototype, 'create', {
    get: function() {
        if(!this._webAudioNodeFactory) {
            this._webAudioNodeFactory = new WebAudioNodeFactory(this.context);
        }
        return this._webAudioNodeFactory;
    }
});

Object.defineProperty(Sono.prototype, 'utils', {
    get: function() {
        if(!this._utils) {
            this._utils = new WebAudioUtils(this.context);
        }
        return this._utils;
    }
});

Object.defineProperty(Sono.prototype, 'loader', {
    get: function() {
        return this._loader;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = new Sono();
}
