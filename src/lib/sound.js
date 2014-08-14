'use strict';

var BufferSource = require('./buffer-source.js'),
    MediaSource = require('./media-source.js'),
    nodeFactory = require('./node-factory.js'),
    NodeManager = require('./node-manager.js'),
    MicrophoneSource = require('./microphone-source.js'),
    OscillatorSource = require('./oscillator-source.js'),
    ScriptSource = require('./script-source.js');

function Sound(context, data, destination) {
    this.id = '';
    this._context = context;
    this._data = null;
    this._endedCallback = null;
    this._loop = false;
    this._pausedAt = 0;
    this._playWhenReady = false;
    this._source = null;
    this._startedAt = 0;

    this._gain = nodeFactory(this._context).gain();
    this._gain.connect(destination || this._context.destination);
    
    this._node = new NodeManager();
    this._node.setDestination(this._gain);

    this.add(data);
}

Sound.prototype.add = function(data) {
    if(!data) { return this; }
    this._data = data; // AudioBuffer or Media Element
    //console.log('data:', this._data);
    if(this._data.tagName) {
      this._source = new MediaSource(data, this._context);
    }
    else {
      this._source = new BufferSource(data, this._context);
    }
    this._node.setSource(this._source.sourceNode);
    this._source.onEnded(this._endedHandler, this);

    // should this take account of delay and offset?
    if(this._playWhenReady) {
        this.play();
    }
    return this;
};

Sound.prototype.oscillator = function(type) {
    this._source = new OscillatorSource(type || 'sine', this._context);
    this._node.setSource(this._source.sourceNode);
    return this;
};

Sound.prototype.setOscillatorType = function(value) {
    this._source.type = value;
};

Sound.prototype.setOscillatorFrequency = function(value) {
    this._source.frequency = value;
};

Sound.prototype.microphone = function(stream) {
    this._source = new MicrophoneSource(stream, this._context);
    this._node.setSource(this._source.sourceNode);
    return this;
};

Sound.prototype.script = function(bufferSize, channels, callback, thisArg) {
    this._source = new ScriptSource(bufferSize, channels, callback, thisArg, this._context);
    this._node.setSource(this._source.sourceNode);
    return this;
};

/*
 * Controls
 */

Sound.prototype.play = function(delay, offset) {
    if(!this._source) {
        this._playWhenReady = true;
        return this;
    }
    this._node.setSource(this._source.sourceNode);
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
 * Nodes
 */

/*Sound.prototype.addNode = function(node) {
    return this._node.add(node);
};

Sound.prototype.removeNode = function(node) {
    return this._node.remove(node);
};*/

/*Sound.prototype.connectTo = function(node) {
    this._node.connectTo(node);
    return this;
};*/

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
 * Getters & Setters
 */

/*
 * TODO: set up so source can be stream, oscillator, etc
 */


Object.defineProperty(Sound.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = !!value;
        if(this._source) {
          this._source.loop = this._loop;
        }
    }
});

Object.defineProperty(Sound.prototype, 'duration', {
    get: function() {
        return this._source ? this._source.duration : 0;
    }
});

Object.defineProperty(Sound.prototype, 'currentTime', {
    get: function() {
        return this._source ? this._source.currentTime : 0;
    }
});

Object.defineProperty(Sound.prototype, 'progress', {
  get: function() {
    return this._source ? this._source.progress : 0;
  }
});


Object.defineProperty(Sound.prototype, 'volume', {
    get: function() {
        return this._gain.gain.value;
    },
    set: function(value) {
        if(isNaN(value)) { return; }

        this._gain.gain.value = value;

        if(this._data && this._data.volume !== undefined) {
            this._data.volume = value;
        }
    }
});

Object.defineProperty(Sound.prototype, 'playing', {
    get: function() {
        return this._source ? this._source.playing : false;
    }
});

Object.defineProperty(Sound.prototype, 'paused', {
    get: function() {
        return this._source ? this._source.paused : false;
    }
});

Object.defineProperty(Sound.prototype, 'node', {
    get: function() {
        return this._node;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Sound;
}
