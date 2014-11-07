'use strict';

var Source = require('./source.js');

function OscillatorSource(type, context) {
    Source.call(this, type, context);
    this._type = type;
    this._frequency = 200;
}

OscillatorSource.prototype = Object.create(Source.prototype);
OscillatorSource.prototype.constructor = OscillatorSource;

/*
 * Controls
 */

OscillatorSource.prototype.play = function(delay) {
    if(delay === undefined) { delay = 0; }
    if(delay > 0) { delay = this._context.currentTime + delay; }

    this.sourceNode.start(delay);

    if(this._pausedAt) {
        this._startedAt = this._context.currentTime - this._pausedAt;
    }
    else {
        this._startedAt = this._context.currentTime;
    }

    this._ended = false;
    this._playing = true;
    this._paused = false;
    this._pausedAt = 0;
};

OscillatorSource.prototype.pause = function() {
    Source.prototype.pause.call(this);
};

OscillatorSource.prototype.stop = function() {
    if(this._sourceNode) {
        try {
            this._sourceNode.stop(0);
        } catch(e) {}
        this._sourceNode = null;
    }
    this._ended = true;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = false;
    this._startedAt = 0;
};

/*
 * Destroy
 */

OscillatorSource.prototype.destroy = function() {
    this.stop();
    this._context = null;
    this._sourceNode = null;
};

/*
 * Getters & Setters
 */

Object.defineProperties(OscillatorSource.prototype, {
    'currentTime': {
        get: function() {
            if(this._pausedAt) {
                return this._pausedAt;
            }
            if(this._startedAt) {
                return this._context.currentTime - this._startedAt;
            }
            return 0;
        }
    },
    'duration': {
        get: function() {
            return 0;
        }
    },
    'frequency': {
        get: function() {
            return this._frequency;
        },
        set: function(value) {
            this._frequency = value;
            if(this._sourceNode) {
                this._sourceNode.frequency.value = value;
            }
        }
    },
    'progress': {
        get: function() {
            return 0;
        }
    },
    'sourceNode': {
        get: function() {
            if(!this._sourceNode && this._context) {
                this._sourceNode = this._context.createOscillator();
                this._sourceNode.type = this._type;
                this._sourceNode.frequency.value = this._frequency;
            }
            return this._sourceNode;
        }
    }
});

module.exports = OscillatorSource;
