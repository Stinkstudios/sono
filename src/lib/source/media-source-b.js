'use strict';

var Source = require('./source.js');

function MediaSource(el, context) {
    Source.call(this, el, context);
    this._el = el;
}

MediaSource.prototype = Object.create(Source.prototype);
MediaSource.prototype.constructor = MediaSource;

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

    // Source.prototype.play.call(this, delay, offset);
};

MediaSource.prototype.pause = function() {
    // Source.prototype.pause.call(this);
    clearTimeout(this._delayTimeout);

    if(!this._el) { return; }

    this._el.pause();
    this._playing = false;
    this._paused = true;
};

// MediaSource.prototype.stop = function() {
//     Source.prototype.stop.call(this);
// };

/*
 * Ended handler
 */

// MediaSource.prototype.onEnded = function(fn, context) {
//     Source.prototype.onEnded.call(this, fn, context);
// };

// MediaSource.prototype._endedHandler = function() {
//     Source.prototype._endedHandler.call(this);
// };

/*
 * Destroy
 */

// MediaSource.prototype.destroy = function() {
//     Source.prototype.foo.call(this);
// };

/*
 * Getters & Setters
 */

Object.defineProperties(MediaSource.prototype, {
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
