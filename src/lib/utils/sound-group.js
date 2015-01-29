'use strict';

/*
 * TODO: Ended handler
 */

var Group = require('../group.js');

function SoundGroup(context, destination) {
    Group.call(this, context, destination);
    this._src = null;
}

SoundGroup.prototype = Object.create(Group.prototype);
SoundGroup.prototype.constructor = SoundGroup;

/*
 * Add / remove
 */

SoundGroup.prototype.add = function(sound) {
    Group.prototype.add.call(this, sound);
    this._getSource();
};

SoundGroup.prototype.remove = function(soundOrId) {
    Group.prototype.remove.call(this, soundOrId);
    this._getSource();
};

SoundGroup.prototype._getSource = function() {
    if(!this._sounds.length) { return; }

    this._sounds.sort(function(a, b) {
        return b.duration - a.duration;
    });

    this._src = this._sounds[0];
};

/*
 * Getters & Setters
 */

Object.defineProperties(SoundGroup.prototype, {
    'currentTime': {
        get: function() {
            return this._src ? this._src.currentTime : 0;
        },
        set: function(value) {
            this.stop();
            this.play(0, value);
        }
    },
    'duration': {
        get: function() {
            return this._src ? this._src.duration : 0;
        }
    },
    // 'ended': {
    //     get: function() {
    //         return this._src ? this._src.ended : false;
    //     }
    // },
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
            return this._src ? this._src.paused : false;
        }
    },
    'progress': {
        get: function() {
            return this._src ? this._src.progress : 0;
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
    'playing': {
        get: function() {
            return this._src ? this._src.playing : false;
        }
    }
});

module.exports = SoundGroup;
