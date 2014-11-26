'use strict';

function MediaSource(el, context) {
    this.id = '';
    this._context = context;
    this._el = el; // HTMLMediaElement
    this._ended = false;
    this._endedCallback = null;
    // this._endedHandlerBound = this._endedHandler.bind(this);
    this._loop = false;
    this._paused = false;
    this._playbackRate = 1;
    this._playing = false;
    this._sourceNode = null; // MediaElementSourceNode
}

/*
 * Controls
 */

MediaSource.prototype.play = function(delay, offset) {
    clearTimeout(this._delayTimeout);

    this.playbackRate = this._playbackRate;

    if(offset) {
        this._el.currentTime = offset;
    }

    if(delay) {
        this._delayTimeout = setTimeout(this.play.bind(this), delay);
    }
    else {
        this._el.play();
    }

    this._ended = false;
    this._paused = false;
    this._playing = true;

    this._el.removeEventListener('ended', this._endedHandlerBound);
    this._el.addEventListener('ended', this._endedHandlerBound, false);
};

MediaSource.prototype.pause = function() {
    clearTimeout(this._delayTimeout);

    if(!this._el) { return; }

    this._el.pause();
    this._playing = false;
    this._paused = true;
};

MediaSource.prototype.stop = function() {
    clearTimeout(this._delayTimeout);

    if(!this._el) { return; }

    this._el.pause();

    try {
        this._el.currentTime = 0;
        // fixes bug where server doesn't support seek:
        if(this._el.currentTime > 0) { this._el.load(); }
    } catch(e) {}

    this._playing = false;
    this._paused = false;
};

/*
 * Fade for no webaudio
 */

MediaSource.prototype.fade = function(volume, duration) {
    if(!this._el) { return this; }
    if(this._context) { return this; }

    var ramp = function(value, step, self) {
        var el = self._el;
        self.fadeTimeout = setTimeout(function() {
            el.volume = el.volume + ( value - el.volume ) * 0.2;
            if(Math.abs(el.volume - value) > 0.05) {
                return ramp(value, step, self);
            }
            el.volume = value;
        }, step * 1000);
    };

    window.clearTimeout(this.fadeTimeout);
    ramp(volume, duration / 10, this);

    return this;
};

/*
 * Ended handler
 */

// MediaSource.prototype.onEnded = function(fn, context) {
//     this._endedCallback = fn ? fn.bind(context || this) : null;
// };

MediaSource.prototype._endedHandler = function() {
    this._ended = true;
    this._paused = false;
    this._playing = false;

    if(this._loop) {
        this._el.currentTime = 0;
        // fixes bug where server doesn't support seek:
        if(this._el.currentTime > 0) { this._el.load(); }
        this.play();
    } else if(typeof this._endedCallback === 'function') {
        this._endedCallback(this);
    }
};

/*
 * Destroy
 */

MediaSource.prototype.destroy = function() {
    this.stop();
    this._el = null;
    this._context = null;
    this._endedCallback = null;
    // this._endedHandlerBound = null;
    this._sourceNode = null;
};

/*
 * Getters & Setters
 */

Object.defineProperties(MediaSource.prototype, {
    'currentTime': {
        get: function() {
            return this._el ? this._el.currentTime : 0;
        }
    },
    'duration': {
        get: function() {
            return this._el ? this._el.duration : 0;
        }
    },
    'ended': {
        get: function() {
            return this._ended;
        }
    },
    'loop': {
        get: function() {
            return this._loop;
        },
        set: function(value) {
            this._loop = !!value;
        }
    },
    'paused': {
        get: function() {
            return this._paused;
        }
    },
    'playbackRate': {
        get: function() {
            return this._playbackRate;
        },
        set: function(value) {
            this._playbackRate = value;
            if(this._el) {
                this._el.playbackRate = this._playbackRate;
            }
        }
    },
    'playing': {
        get: function() {
            return this._playing;
        }
    },
    'progress': {
        get: function() {
            return this.duration ? this.currentTime / this.duration : 0;
        }
    },
    'sourceNode': {
        get: function() {
            if(!this._sourceNode && this._context) {
                this._sourceNode = this._context.createMediaElementSource(this._el);
            }
            return this._sourceNode;
        }
    }
});

module.exports = MediaSource;
