'use strict';

function BufferSource(buffer, context) {
    this.id = '';
    this._buffer = buffer; // AudioBuffer
    this._context = context;
    this._source = null; // BufferSourceNode
    this._loop = false;
    this._startedAt = 0;
    this._pausedAt = 0;
    this._onEnded = null;
    this._playing = false;
    this._paused = false;
}

BufferSource.prototype.add = function(buffer) {
    this._buffer = buffer;
    return this._buffer;
};

BufferSource.prototype.play = function(delay, offset) {
    if(delay === undefined) { delay = 0; }
    if(delay > 0) { delay = this._context.currentTime + delay; }

    if(offset === undefined) { offset = 0; }
    if(this._pausedAt > 0) { offset = offset + this._pausedAt; }

    //this.stop();
    this.source.loop = this._loop;
    this.source.start(delay, offset);

    this._startedAt = this._context.currentTime - this._pausedAt;
    this._pausedAt = 0;

    this._playing = true;
    this._paused = false;
};

BufferSource.prototype.pause = function() {
    var elapsed = this.clockTime - this._startedAt;
    this.stop();
    this._pausedAt = elapsed;
    this._playing = false;
    this._paused = true;
};

BufferSource.prototype.stop = function() {
    if(this._source) {
        this._source.onended = null;
        this._source.stop(0);
        this._source = null;
    }
    this._startedAt = 0;
    this._pausedAt = 0;
    this._playing = false;
    this._paused = false;
};

BufferSource.prototype.onEnded = function() {
    this.stop();
    if(typeof this._onEnded === 'function') {
        this._onEnded();
    }
};

BufferSource.prototype.addEndedListener = function(fn, context) {
    this._onEnded = fn.bind(context || this);
};

BufferSource.prototype.removeEndedListener = function() {
    this._onEnded = null;
};

/*
 * Getters & Setters
 */

/*
 * TODO: set up so source can be stream, oscillator, etc
 */

Object.defineProperty(BufferSource.prototype, 'source', {
    get: function() {
        if(!this._source) {
            this._source = this._context.createBufferSource();
            this._source.buffer = this._buffer;
            this._source.onended = this.onEnded.bind(this);
        }
        return this._source;
    }
});

Object.defineProperty(BufferSource.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = !!value;
    }
});

Object.defineProperty(BufferSource.prototype, 'duration', {
    get: function() {
        return this._buffer ? this._buffer.duration : 0;
    }
});

Object.defineProperty(BufferSource.prototype, 'currentTime', {
    get: function() {
        if(this._pausedAt) {
          return this._pausedAt;
        }
        return this._startedAt ? (this.clockTime - this._startedAt) : 0;
    }
});

Object.defineProperty(BufferSource.prototype, 'progress', {
  get: function() {
    return Math.min(this.currentTime / this.duration, 1);
  }
});

Object.defineProperty(BufferSource.prototype, 'playing', {
    get: function() {
        return this._playing;
    }
});

Object.defineProperty(BufferSource.prototype, 'paused', {
    get: function() {
        return this._paused;
    }
});

Object.defineProperty(BufferSource.prototype, 'clockTime', {
    get: function() {
        return this._context.currentTime;
        //return Date.now() / 1000;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = BufferSource;
}
