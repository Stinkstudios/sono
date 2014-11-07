'use strict';

var Source = require('./source.js');

function ScriptSource(data, context) {
    Source.call(this, data, context);

    this._bufferSize = data.bufferSize || 1024;
    this._channels = data.channels || 1;
    this._onProcess = data.callback.bind(data.thisArg || this);
}

ScriptSource.prototype = Object.create(Source.prototype);
ScriptSource.prototype.constructor = ScriptSource;

/*
 * Controls
 */

ScriptSource.prototype.play = function(delay) {
    if(delay === undefined) { delay = 0; }
    if(delay > 0) { delay = this._context.currentTime + delay; }

    this.sourceNode.onaudioprocess = this._onProcess;

    if(this._pausedAt) {
        this._startedAt = this._context.currentTime - this._pausedAt;
    }
    else {
        this._startedAt = this._context.currentTime;
    }

    this._ended = false;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = true;
};

// ScriptSource.prototype.pause = function() {
//     Source.prototype.pause.call(this);
// };

ScriptSource.prototype.stop = function() {
    if(this._sourceNode) {
        this._sourceNode.onaudioprocess = this._onPaused;
    }
    this._ended = true;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = false;
    this._startedAt = 0;
};

ScriptSource.prototype._onPaused = function(event) {
    var buffer = event.outputBuffer;
    for (var i = 0, l = buffer.numberOfChannels; i < l; i++) {
        var channel = buffer.getChannelData(i);
        for (var j = 0, len = channel.length; j < len; j++) {
            channel[j] = 0;
        }
    }
};

/*
 * Destroy
 */

ScriptSource.prototype.destroy = function() {
    this.stop();
    this._context = null;
    this._onProcess = null;
    this._sourceNode = null;
};

/*
 * Getters & Setters
 */

Object.defineProperties(ScriptSource.prototype, {
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
    'playbackRate': {
        get: function() {
            return 1;
        },
        set: function(value) {
            this._playbackRate = value;
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
                this._sourceNode = this._context.createScriptProcessor(this._bufferSize, 0, this._channels);
            }
            return this._sourceNode;
        }
    }
});

module.exports = ScriptSource;
