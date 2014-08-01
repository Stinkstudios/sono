'use strict';

function WebAudioSound(buffer, context) {
    this.name = '';
    this._buffer = buffer; // AudioBuffer
    this._context = context;
    this._source = null; // AudioBufferSourceNode
    this._loop = false;
    this._startedAt = 0;
    this._pausedAt = 0;
    this._onEnded = null;
}

WebAudioSound.prototype.add = function(buffer) {
    this._buffer = buffer;
    return this._buffer;
};

WebAudioSound.prototype.play = function(delay, offset) {
    if(delay === undefined) { delay = 0; }
    if(delay > 0) { delay = this._context.currentTime + delay; }

    if(offset === undefined) { offset = 0; }
    if(this._pausedAt > 0) { offset = offset + this._pausedAt / 1000; }

    //this.stop();
    this.source.loop = this._loop;
    this.source.start(delay, offset);

    this._startedAt = Date.now() - this._pausedAt;

    this._playing = true;
    this._paused = false;
};

WebAudioSound.prototype.pause = function() {
    var elapsed = Date.now() - this._startedAt;
    this.stop();
    this._pausedAt = elapsed;
    this._playing = false;
    this._paused = true;
};

WebAudioSound.prototype.stop = function() {
    if(this._source) {
        this._source.stop(0);
        this._source = null;
    }
    this._startedAt = 0;
    this._pausedAt = 0;
    this._playing = false;
    this._paused = false;
};

WebAudioSound.prototype.onEnded = function() {
    console.log('onended');
    this.stop();
    if(typeof this._onEnded === 'function') {

        this._onEnded();
    }
};

WebAudioSound.prototype.addEndedListener = function(fn, context) {
    this._onEnded = fn.bind(context || this);
};

WebAudioSound.prototype.removeEndedListener = function() {
    this._onEnded = null;
};

/*
 * Getters & Setters
 */

/*
 * TODO: set up so source can be stream, oscillator, etc
 */

Object.defineProperty(WebAudioSound.prototype, 'source', {
    get: function() {
        if(!this._source) {
            this._source = this._context.createBufferSource();
            this._source.buffer = this._buffer;
            this._source.onended = this.onEnded.bind(this);
        }
        return this._source;
    }
});

Object.defineProperty(WebAudioSound.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = !!value;
    }
});

Object.defineProperty(WebAudioSound.prototype, 'duration', {
    get: function() {
        return this._buffer ? this._buffer.duration : 0;
    }
});

Object.defineProperty(WebAudioSound.prototype, 'currentTime', {
    get: function() {
        return this._startedAt ? (Date.now() - this._startedAt) * 0.001 : 0;
    }
});

Object.defineProperty(WebAudioSound.prototype, 'progress', {
  get: function() {
    return Math.min(this.currentTime / this.duration, 1);
  }
});

Object.defineProperty(WebAudioSound.prototype, 'playing', {
    get: function() {
        return this._playing;
    }
});

Object.defineProperty(WebAudioSound.prototype, 'paused', {
    get: function() {
        return this._paused;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = WebAudioSound;
}
