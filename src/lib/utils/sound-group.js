'use strict';

var Group = require('../group.js');

function SoundGroup(context, destination) {
    var api = new Group(context, destination),
        sounds = api.sounds,
        playbackRate = 1,
        loop = false,
        src;

    var getSource = function() {
        if(!sounds.length) { return; }

        sounds.sort(function(a, b) {
            return b.duration - a.duration;
        });

        src = sounds[0];
    };

    var add = api.add;
    api.add = function(sound) {
        add(sound);
        getSource();
        return api;
    };

    var remove = api.rmeove;
    api.remove = function(soundOrId) {
        remove(soundOrId);
        getSource();
        return api;
    };

    Object.defineProperties(api, {
        currentTime: {
            get: function() {
                return src ? src.currentTime : 0;
            },
            set: function(value) {
                this.stop();
                this.play(0, value);
            }
        },
        duration: {
            get: function() {
                return src ? src.duration : 0;
            }
        },
        // ended: {
        //     get: function() {
        //         return src ? src.ended : false;
        //     }
        // },
        loop: {
            get: function() {
                return loop;
            },
            set: function(value) {
                loop = !!value;
                sounds.forEach(function(sound) {
                    sound.loop = loop;
                });
            }
        },
        paused: {
            get: function() {
                // return src ? src.paused : false;
                return !!src && src.paused;
            }
        },
        progress: {
            get: function() {
                return src ? src.progress : 0;
            }
        },
        playbackRate: {
            get: function() {
                return playbackRate;
            },
            set: function(value) {
                playbackRate = value;
                sounds.forEach(function(sound) {
                    sound.playbackRate = playbackRate;
                });
            }
        },
        playing: {
            get: function() {
                // return src ? src.playing : false;
                return !!src && src.playing;
            }
        }
    });

    return api;

}

module.exports = SoundGroup;
