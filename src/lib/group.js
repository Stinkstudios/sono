'use strict';

var Effect = require('./effect.js');

function Group(context, destination) {
    this._sounds = [];
    this._context = context;
    this._effect = new Effect(this._context);
    this._gain = this._effect.gain();
    if(this._context) {
        this._effect.setSource(this._gain);
        this._effect.setDestination(destination || this._context.destination);
    }
}

/*
 * Add / remove
 */

Group.prototype.add = function(sound) {
    sound.gain.disconnect();
    sound.gain.connect(this._gain);

    this._sounds.push(sound);
};

Group.prototype.remove = function(soundOrId) {
    this._sounds.some(function(sound, index, sounds) {
        if(sound === soundOrId || sound.id === soundOrId) {
            sounds.splice(index, 1);
            return true;
        }
    });
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

Group.prototype.resume = function() {
    this._sounds.forEach(function(sound) {
        if(sound.paused) {
            sound.play();
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

        if(this._context) {
            this._gain.gain.cancelScheduledValues(this._context.currentTime);
            this._gain.gain.value = value;
            this._gain.gain.setValueAtTime(value, this._context.currentTime);
        }
        else {
            this._gain.gain.value = value;
            this._sounds.forEach(function(sound) {
                sound.volume = value;
            });
        }
    }
});

Group.prototype.fade = function(volume, duration) {
    if(this._context) {
        var param = this._gain.gain;
        var time = this._context.currentTime;

        param.cancelScheduledValues(time);
        param.setValueAtTime(param.value, time);
        // param.setValueAtTime(volume, time + duration);
        param.linearRampToValueAtTime(volume, time + duration);
        // param.setTargetAtTime(volume, time, duration);
        // param.exponentialRampToValueAtTime(Math.max(volume, 0.0001), time + duration);
    }
    else {
        this._sounds.forEach(function(sound) {
            sound.fade(volume, duration);
        });
    }

    return this;
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
    'effect': {
        get: function() {
            return this._effect;
        }
    },
    'gain': {
        get: function() {
            return this._gain;
        }
    },
    'sounds': {
        get: function() {
            return this._sounds;
        }
    }
});

module.exports = Group;
