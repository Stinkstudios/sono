'use strict';

var Effect = require('../effect.js');

function Group(context, destination) {
    this._sounds = [];
    this._source = null;

    this._effect = new Effect(this._context);
    this._gain = this._effect.gain();
    if(this._context) {
        this._effect.setDestination(this._gain);
        this._gain.connect(destination || this._context.destination);
    }
}

/*
 * Add / remove
 */

Group.prototype.add = function(sound) {
    sound.gain.disconnect();
    sound.gain.connect(this._gain);

    this._sounds.push(sound);
    this._getSource();
};

Group.prototype.remove = function(soundOrId) {
    this._sounds.some(function(sound, index, sounds) {
        if(sound === soundOrId || sound.id === soundOrId) {
            sounds.splice(index, 1);
            return true;
        }
    });
    this._getSource();
};

Group.prototype._getSource = function() {
    if(!this._sounds.length) { return; }

    this._sounds.sort(function(a, b) {
        return b.duration - a.duration;
    });

    this._source = this._sounds[0];
};

/*
 * Controls
 */

Group.prototype.play = function(delay, offset) {
    this._sounds.forEach(function(sound) {
        sound.play(delay, offset);
    });
};

Group.prototype.pause = function() {
    this._sounds.forEach(function(sound) {
        if(sound.playing) {
            sound.pause();
        }
    });
};

Group.prototype.stop = function() {
    this._sounds.forEach(function(sound) {
        sound.stop();
    });
};

Group.prototype.seek = function(percent) {
    this._sounds.forEach(function(sound) {
        sound.seek(percent);
    });
};

Group.prototype.mute = function() {
    this._preMuteVolume = this.volume;
    this.volume = 0;
};

Group.prototype.unMute = function() {
    this.volume = this._preMuteVolume || 1;
};

Object.defineProperty(Group.prototype, 'volume', {
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
        else {
            this._sounds.forEach(function(sound) {
                sound.volume = value;
            });
        }
    }
});

Group.prototype.fade = function(volume, duration) {
    if(this._context) {
        var  param = this._gain.gain;
        param.cancelScheduledValues(this._context.currentTime);
        param.setValueAtTime(param.value, this._context.currentTime);
        param.linearRampToValueAtTime(volume, this._context.currentTime + duration);
    }
    else {
        this._sounds.forEach(function(sound) {
            sound.fade(volume, duration);
        });
    }

    return this;
};

/*
 * Ended handler
 */

Group.prototype.onEnded = function(fn, context) {
    this._endedCallback = fn ? fn.bind(context || this) : null;
    return this;
};

Group.prototype._endedHandler = function() {
    if(typeof this._endedCallback === 'function') {
        this._endedCallback(this);
    }
};

/*
 * Destroy
 */

Group.prototype.destroy = function() {
    while(this._sounds.length) {
        this._sounds.pop().destroy();
    }
};


/*
 * Getters & Setters
 */

Object.defineProperties(Group.prototype, {
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
            this._sounds.forEach(function(sound) {
                sound.loop = this._loop;
            });
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
            this._sounds.forEach(function(sound) {
                sound.playbackRate = this._playbackRate;
            });
        }
    },
    'progress': {
        get: function() {
            return this._source ? this._source.progress : 0;
        }
    }
});

module.exports = Group;
