'use strict';

var BufferSource = require('./source/buffer-source.js'),
    Effect = require('./effect.js'),
    // var inherits = require('inherits');
    EventEmitter = require('events').EventEmitter,
    File = require('./utils/file.js'),
    Loader = require('./utils/loader.js'),
    MediaSource = require('./source/media-source.js'),
    MicrophoneSource = require('./source/microphone-source.js'),
    OscillatorSource = require('./source/oscillator-source.js'),
    ScriptSource = require('./source/script-source.js');

function Sound(context, destination) {
    this.id = '';
    this._context = context;
    this._data = null;
    // this._endedCallback = null;
    this._isTouchLocked = false;
    this._loader = null;
    this._loop = false;
    this._pausedAt = 0;
    this._playbackRate = 1;
    this._playWhenReady = null;
    this._source = null;
    this._startedAt = 0;

    this._effect = new Effect(this._context);
    this._gain = this._effect.gain();
    if(this._context) {
        this._effect.setDestination(this._gain);
        this._gain.connect(destination || this._context.destination);
    }
}

Sound.prototype = Object.create(EventEmitter.prototype);
Sound.prototype.constructor = Sound;
Sound.prototype.off = EventEmitter.prototype.removeListener;
// Sound.prototype = Object.create(EventEmitter.prototype, {
//   constructor: {
//     value: Sound,
//     enumerable: false,
//     writable: true,
//     configurable: true
//   }
// });

/*
 * Load
 */

Sound.prototype.load = function(config) {
    var url = File.getSupportedFile(config.url || config);

    if(this._source && this._source._el) {
        this._source.load(url);
    }
    else {
        this._loader = this._loader || new Loader(url);
        this._loader.audioContext = !!config.asMediaElement ? null : this._context;
        this._loader.isTouchLocked = this._isTouchLocked;
        this._loader.once('loaded', function(data) {
            console.log.call(console, 'SOUND LOADED');
            this.data = data;
        }, this);
    }
    return this;
};

/*
 * Controls
 */

Sound.prototype.play = function(delay, offset) {
    if(!this._source || this._isTouchLocked) {
        this._playWhenReady = function() {
            this.play(delay, offset);
        }.bind(this);
        return this;
    }
    this._playWhenReady = null;
    this._effect.setSource(this._source.sourceNode);
    this._source.loop = this._loop;

    // update volume needed for no webaudio
    if(!this._context) { this.volume = this._gain.gain.value; }

    this._source.play(delay, offset);

    return this;
};

Sound.prototype.pause = function() {
    if(!this._source) { return this; }
    this._source.pause();
    return this;
};

Sound.prototype.stop = function() {
    if(!this._source) { return this; }
    this._source.stop();
    return this;
};

Sound.prototype.seek = function(percent) {
    if(!this._source) { return this; }
    this.stop();
    this.play(0, this._source.duration * percent);
    return this;
};

Sound.prototype.fade = function(volume, duration) {
    if(!this._source) { return this; }

    if(this._context) {
        var  param = this._gain.gain;
        var time = this._context.currentTime;
        param.cancelScheduledValues(time);
        param.setValueAtTime(param.value, time);
        param.linearRampToValueAtTime(volume, time + duration);
    }
    else if(typeof this._source.fade === 'function') {
        this._source.fade(volume, duration);
    }

    return this;
};

/*
 * Ended handler
 */

// Sound.prototype.onEnded = function(fn, context) {
//     this._endedCallback = fn ? fn.bind(context || this) : null;
//     return this;
// };

// Sound.prototype._endedHandler = function() {
//     this.emit('ended');

//     // if(typeof this._endedCallback === 'function') {
//     //     this._endedCallback(this);
//     // }
// };

/*
 * Destroy
 */

Sound.prototype.destroy = function() {
    if(this._source) { this._source.destroy(); }
    if(this._effect) { this._effect.destroy(); }
    if(this._gain) { this._gain.disconnect(); }
    this._gain = null;
    this._context = null;
    this._data = null;
    // this._endedCallback = null;
    this.removeAllListeners('ended');
    this._playWhenReady = null;
    this._source = null;
    this._effect = null;
    if(this._loader) {
        this._loader.destroy();
        this._loader = null;
    }
};

/*
 * Create source
 */

Sound.prototype._createSource = function(data) {
    // if (this._source && File.type(data) === this._source.type) {
    //     this._source.data = data;
    // } else
    if(File.isAudioBuffer(data)) {
        this._source = new BufferSource(data, this._context);
    }
    else if(File.isMediaElement(data)) {
        this._source = new MediaSource(data, this._context);
    }
    else if(File.isMediaStream(data)) {
        this._source = new MicrophoneSource(data, this._context);
    }
    else if(File.isOscillatorType(data)) {
        this._source = new OscillatorSource(data, this._context);
    }
    else if(File.isScriptConfig(data)) {
        this._source = new ScriptSource(data, this._context);
    }
    else {
        throw new Error('Cannot detect data type: ' + data);
    }

    this._effect.setSource(this._source.sourceNode);

    // if(typeof this._source.onEnded === 'function') {
    //     this._source.onEnded(this._endedHandler, this);
    // }
    if(this._source.hasOwnProperty('_endedCallback')) {
        this._source._endedCallback = function() {
            console.log.call(console, 'ENDED CB');
            this.emit('ended');
        }.bind(this);
    }

    if(this._playWhenReady) {
        this._playWhenReady();
    }
};

/*
 * Getters & Setters
 */

Object.defineProperties(Sound.prototype, {
    'context': {
        get: function() {
            return this._context;
        }
    },
    'currentTime': {
        get: function() {
            return this._source ? this._source.currentTime : 0;
        },
        set: function(value) {
            this.stop();
            this.play(0, value);
        }
    },
    'data': {
        get: function() {
            return this._data;
        },
        set : function(value) {
            if(!value) { return; }
            this._data = value;
            this._createSource(this._data);
        }
    },
    'duration': {
        get: function() {
            return this._source ? this._source.duration : 0;
        }
    },
    'effect': {
        get: function() {
            return this._effect;
        }
    },
    'ended': {
        get: function() {
            return this._source ? this._source.ended : false;
        }
    },
    'frequency': {
        get: function() {
            return this._source ? this._source.frequency : 0;
        },
        set: function(value) {
            if(this._source) {
                this._source.frequency = value;
            }
        }
    },
    'gain': {
        get: function() {
            return this._gain;
        }
    },
    'isTouchLocked': {
        set: function(value) {
            this._isTouchLocked = value;
            if(!value && this._playWhenReady) {
                this._playWhenReady();
            }
        }
    },
    'loader': {
        get: function() {
            return this._loader;
        }
    },
    'loop': {
        get: function() {
            return this._loop;
        },
        set: function(value) {
            this._loop = !!value;
            if(this._source) {
              this._source.loop = this._loop;
            }
        }
    },
    'paused': {
        get: function() {
            return this._source ? this._source.paused : false;
        }
    },
    'playing': {
        get: function() {
            return this._source ? this._source.playing : false;
        }
    },
    'playbackRate': {
        get: function() {
            return this._playbackRate;
        },
        set: function(value) {
            this._playbackRate = value;
            if(this._source) {
              this._source.playbackRate = this._playbackRate;
            }
        }
    },
    'progress': {
        get: function() {
            return this._source ? this._source.progress : 0;
        }
    },
    'volume': {
        get: function() {
            if(this._context) {
                return this._gain.gain.value;
            }
            else if(this._data && this._data.volume !== undefined) {
                return this._data.volume;
            }
            return 1;
        },
        set: function(value) {
            if(isNaN(value)) { return; }

            var param = this._gain.gain;

            if(this._context) {
                var time = this._context.currentTime;
                param.cancelScheduledValues(time);
                param.value = value;
                param.setValueAtTime(value, time);
            }
            else {
                param.value = value;
                if(this._source) {
                    window.clearTimeout(this._source.fadeTimeout);
                }
                if(this._data && this._data.volume !== undefined) {
                    this._data.volume = value;
                }
            }
        }
    }
});

module.exports = Sound;
