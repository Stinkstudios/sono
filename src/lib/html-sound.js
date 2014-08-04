'use strict';

function HTMLSound(el, volume) {
    this.name = '';
    this._loop = false;
    this._volume = volume === undefined ? 1 : volume;
    this._playing = false;
    this._paused = false;
    this._onEnded = null;
    this._endedListener = this.onEnded.bind(this);
    this._playWhenReady = false;
    this.add(el);
}

HTMLSound.prototype.add = function(el) {
    this._el = el;
    // should this take account of delay and offset?
    if(this._playWhenReady) {
        this.play();
    }
};

HTMLSound.prototype.play = function(delay, offset) {
    if(!this._el) {
        this._playWhenReady = true;
        return this;
    }
    this.volume = this._volume;
    if(offset !== undefined && offset > 0) {
        this._el.currentTime = offset;
    }
    if(delay !== undefined && delay > 0) {
        this._delayTimeout = setTimeout(this.play.bind(this), delay);
    }
    else {
        this._el.play();
    }
    this._playing = true;
    this._paused = false;
    this._el.removeEventListener('ended', this._endedListener);
    this._el.addEventListener('ended', this._endedListener, false);
};

HTMLSound.prototype.pause = function() {
    clearTimeout(this._delayTimeout);
    this._el.pause();
    this._playing = false;
    this._paused = true;
};

HTMLSound.prototype.stop = function() {
    this._el.pause();
    this._el.currentTime = 0;
    // fixes bug where server doesn't support seek:
    if(this._el.currentTime > 0) { this._el.load(); }
    this._playing = false;
    this._paused = false;
};

HTMLSound.prototype.onEnded = function() {
    console.log('onended');
    this._playing = false;
    this._paused = false;
    if(this._loop) {
        this._el.currentTime = 0;
        // fixes bug where server doesn't support seek:
        if(this._el.currentTime > 0) { this._el.load(); }
        this.play();
    } else if(typeof this._onEnded === 'function') {
        this._onEnded();
    }
};

HTMLSound.prototype.addEndedListener = function(fn, context) {
    this._onEnded = fn.bind(context || this);
};

HTMLSound.prototype.removeEndedListener = function() {
    this._onEnded = null;
};

/*
 * Getters & Setters
 */

Object.defineProperty(HTMLSound.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = value;
    }
});

Object.defineProperty(HTMLSound.prototype, 'volume', {
    get: function() {
        return this._volume;
    },
    set: function(value) {
        if(isNaN(value)) { return; }
        this._volume = value;
        if(this._el && this._el.volume !== undefined) {
            this._el.volume = this._volume;
        }
    }
});

Object.defineProperty(HTMLSound.prototype, 'playing', {
    get: function() {
        return this._playing;
    }
});

Object.defineProperty(HTMLSound.prototype, 'paused', {
    get: function() {
        return this._paused;
    }
});

Object.defineProperty(HTMLSound.prototype, 'sound', {
    get: function() {
        return this._el;
    }
});

Object.defineProperty(HTMLSound.prototype, 'duration', {
    get: function() {
        return this._el.duration;
    }
});

Object.defineProperty(HTMLSound.prototype, 'currentTime', {
    get: function() {
        return this._el.currentTime;
    }
});

Object.defineProperty(HTMLSound.prototype, 'progress', {
    get: function() {
        return this.currentTime / this.duration;
    }
});

if (typeof module === 'object' && module.exports) {
    module.exports = HTMLSound;
}
