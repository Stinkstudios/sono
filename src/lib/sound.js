'use strict';

var BufferSource = require('./source/buffer-source.js'),
    Effect = require('./effect.js'),
    File = require('./utils/file.js'),
    MediaSource = require('./source/media-source.js'),
    MicrophoneSource = require('./source/microphone-source.js'),
    OscillatorSource = require('./source/oscillator-source.js'),
    ScriptSource = require('./source/script-source.js');

function Sound(context, destination) {
    this.id = '';
    this._context = context;
    this._data = null;
    this._endedCallback = null;
    this._isTouchLocked = false;
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
    if(!this._context) { this.volume = this.volume; }

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

/*
 * Ended handler
 */

Sound.prototype.onEnded = function(fn, context) {
    this._endedCallback = fn ? fn.bind(context || this) : null;
    return this;
};

Sound.prototype._endedHandler = function() {
    if(typeof this._endedCallback === 'function') {
        this._endedCallback(this);
    }
};

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
    this._endedCallback = null;
    this._playWhenReady = null;
    this._source = null;
    this._effect = null;
};

/*
 * Create source
 */

Sound.prototype._createSource = function(data) {
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

    if(typeof this._source.onEnded === 'function') {
        this._source.onEnded(this._endedHandler, this);
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
            console.log('sound set playbackRate:', value);
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
            return this._gain.gain.value;
        },
        set: function(value) {
            if(isNaN(value)) { return; }

            this._gain.gain.value = value;

            if(this._context) {
                this._gain.gain.cancelScheduledValues(this._context.currentTime);
                this._gain.gain.setValueAtTime(value, this._context.currentTime);
            }

            if(this._data && this._data.volume !== undefined) {
                this._data.volume = value;
            }
        }
    }
});

module.exports = Sound;
