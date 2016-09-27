import Group from '../group';

export default function SoundGroup(context, destination) {
    const group = new Group(context, destination);
    const sounds = group.sounds;
    let playbackRate = 1,
        loop = false,
        src;

    function getSource() {
        if (!sounds.length) {
            return;
        }

        src = sounds.slice(0)
            .sort((a, b) => b.duration - a.duration)[0];
    }

    const add = group.add;
    group.add = function(sound) {
        add(sound);
        getSource();
        return group;
    };

    const remove = group.rmeove;
    group.remove = function(soundOrId) {
        remove(soundOrId);
        getSource();
        return group;
    };

    Object.defineProperties(group, {
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

    return group;
}
