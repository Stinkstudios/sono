'use strict';

var Effect = require('./effect.js');

function Group(context, destination) {
    var sounds = [],
        effect = new Effect(context),
        gain = effect.gain(),
        preMuteVolume = 1,
        api;

    if(context) {
        effect.setSource(gain);
        effect.setDestination(destination || context.destination);
    }

    /*
     * Add / remove
     */

    var add = function(sound) {
        sound.gain.disconnect();
        sound.gain.connect(gain);

        sounds.push(sound);

        sound.once('destroyed', remove);
    };

    var remove = function(soundOrId) {
        sounds.some(function(sound, index, sounds) {
            if(sound === soundOrId || sound.id === soundOrId) {
                sounds.splice(index, 1);
                return true;
            }
        });
    };

    /*
     * Controls
     */

    var play = function(delay, offset) {
        sounds.forEach(function(sound) {
            sound.play(delay, offset);
        });
    };

    var pause = function() {
        sounds.forEach(function(sound) {
            if(sound.playing) {
                sound.pause();
            }
        });
    };

    var resume = function() {
        sounds.forEach(function(sound) {
            if(sound.paused) {
                sound.play();
            }
        });
    };

    var stop = function() {
        sounds.forEach(function(sound) {
            sound.stop();
        });
    };

    var seek = function(percent) {
        sounds.forEach(function(sound) {
            sound.seek(percent);
        });
    };

    var mute = function() {
        preMuteVolume = api.volume;
        api.volume = 0;
    };

    var unMute = function() {
        api.volume = preMuteVolume || 1;
    };

    var fade = function(volume, duration) {
        if(context) {
            var param = gain.gain;
            var time = context.currentTime;

            param.cancelScheduledValues(time);
            param.setValueAtTime(param.value, time);
            // param.setValueAtTime(volume, time + duration);
            param.linearRampToValueAtTime(volume, time + duration);
            // param.setTargetAtTime(volume, time, duration);
            // param.exponentialRampToValueAtTime(Math.max(volume, 0.0001), time + duration);
        }
        else {
            sounds.forEach(function(sound) {
                sound.fade(volume, duration);
            });
        }

        return this;
    };

    /*
     * Destroy
     */

    var destroy = function() {
        // while(sounds.length) {
        //     sounds.pop().destroy();
        // }
        sounds.forEach(function(sound) {
            sound.destroy();
        });
    };

    /*
     * Api
     */

    api = {
        add: add,
        remove: remove,
        play: play,
        pause: pause,
        resume: resume,
        stop: stop,
        seek: seek,
        mute: mute,
        unMute: unMute,
        fade: fade,
        destroy: destroy
    };

    /*
     * Getters & Setters
     */

    Object.defineProperties(api, {
        effect: {
            value: effect
        },
        gain: {
            value: gain
        },
        sounds: {
            value: sounds
        },
        volume: {
            get: function() {
                return gain.gain.value;
            },
            set: function(value) {
                if(isNaN(value)) { return; }

                if(context) {
                    gain.gain.cancelScheduledValues(context.currentTime);
                    gain.gain.value = value;
                    gain.gain.setValueAtTime(value, context.currentTime);
                }
                else {
                    gain.gain.value = value;
                }
                sounds.forEach(function(sound) {
                    if (!sound.context) {
                        sound.volume = value;
                    }
                });
            }
        }
    });

    return api;
    // return Object.freeze(api);
}

module.exports = Group;
