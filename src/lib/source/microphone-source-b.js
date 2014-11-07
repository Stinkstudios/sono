'use strict';

var Source = require('./source.js');

function MicrophoneSource(stream, context) {
    Source.call(this, stream, context);
    this._stream = stream;
}

MicrophoneSource.prototype = Object.create(Source.prototype);
MicrophoneSource.prototype.constructor = MicrophoneSource;

/*
 * Controls
 */

MicrophoneSource.prototype.play = function(delay) {
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

// MicrophoneSource.prototype.pause = function() {
//     Source.prototype.pause.call(this);
// };

// MicrophoneSource.prototype.stop = function() {
//     Source.prototype.stop.call(this);
// };

/*
 * Destroy
 */

MicrophoneSource.prototype.destroy = function() {
    this.stop();
    this._context = null;
    this._sourceNode = null;
    this._stream = null;
    window.mozHack = null;
};

/*
 * Getters & Setters
 */

Object.defineProperties(MicrophoneSource.prototype, {
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
            if(!this._sourceNode) {
                this._sourceNode = this._context.createMediaStreamSource(this._stream);
                // HACK: stops moz garbage collection killing the stream
                // see https://support.mozilla.org/en-US/questions/984179
                if(navigator.mozGetUserMedia) {
                    window.mozHack = this._sourceNode;
                }
            }
            return this._sourceNode;
        }
    }
});

module.exports = MicrophoneSource;
