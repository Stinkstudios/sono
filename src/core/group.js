import Effects from './effects';

export default function Group(context, destination) {
    const sounds = [];
    const effects = new Effects(context);
    const gain = context.createGain();
    let preMuteVolume = 1;
    let group = null;

    if (context) {
        effects.setSource(gain);
        effects.setDestination(destination || context.destination);
    }

    /*
     * Add / remove
     */

    function find(soundOrId, callback) {
        let found;

        if (!soundOrId && soundOrId !== 0) {
            return found;
        }

        sounds.some(function(sound) {
            if (sound === soundOrId || sound.id === soundOrId) {
                found = sound;
                return true;
            }
            return false;
        });

        if (found && callback) {
            return callback(found);
        }

        return found;
    }

    function remove(soundOrId) {
        find(soundOrId, (sound) => sounds.splice(sounds.indexOf(sound), 1));
        return group;
    }

    function add(sound) {
        sound.gain.disconnect();
        sound.gain.connect(gain);

        sounds.push(sound);

        sound.once('destroy', remove);

        return group;
    }

    /*
     * Controls
     */

    function play(delay, offset) {
        sounds.forEach((sound) => sound.play(delay, offset));
        return group;
    }

    function pause() {
        sounds.forEach((sound) => {
            if (sound.playing) {
                sound.pause();
            }
        });
        return group;
    }

    function resume() {
        sounds.forEach((sound) => {
            if (sound.paused) {
                sound.play();
            }
        });
        return group;
    }

    function stop() {
        sounds.forEach((sound) => sound.stop());
        return group;
    }

    function seek(percent) {
        sounds.forEach((sound) => sound.seek(percent));
        return group;
    }

    function mute() {
        preMuteVolume = group.volume;
        group.volume = 0;
        return group;
    }

    function unMute() {
        group.volume = preMuteVolume || 1;
        return group;
    }

    function setVolume(value) {
        group.volume = value;
        return group;
    }

    function fade(volume, duration) {
        if (context) {
            const param = gain.gain;
            const time = context.currentTime;

            param.cancelScheduledValues(time);
            param.setValueAtTime(param.value, time);
            // param.setValueAtTime(volume, time + duration);
            param.linearRampToValueAtTime(volume, time + duration);
            // param.setTargetAtTime(volume, time, duration);
            // param.exponentialRampToValueAtTime(Math.max(volume, 0.0001), time + duration);
        } else {
            sounds.forEach((sound) => sound.fade(volume, duration));
        }

        return group;
    }

    /*
     * Load
     */

    function load() {
        sounds.forEach((sound) => sound.load());
    }

    /*
     * Unload
     */

    function unload() {
        sounds.forEach((sound) => sound.unload());
    }

    /*
     * Destroy
     */

    function destroy() {
        while (sounds.length) {
            sounds.pop()
                .destroy();
        }
    }

    /*
     * Api
     */

    group = {
        add,
        find,
        remove,
        play,
        pause,
        resume,
        stop,
        seek,
        setVolume,
        mute,
        unMute,
        fade,
        load,
        unload,
        destroy,
        gain,
        get effects() {
            return effects._nodes;
        },
        set effects(value) {
            effects.removeAll().add(value);
        },
        get fx() {
            return this.effects;
        },
        set fx(value) {
            this.effects = value;
        },
        get sounds() {
            return sounds;
        },
        get volume() {
            return gain.gain.value;
        },
        set volume(value) {
            if (isNaN(value)) {
                return;
            }

            value = Math.min(Math.max(value, 0), 1);

            if (context) {
                gain.gain.cancelScheduledValues(context.currentTime);
                gain.gain.value = value;
                gain.gain.setValueAtTime(value, context.currentTime);
            } else {
                gain.gain.value = value;
            }
            sounds.forEach((sound) => {
                if (!sound.context) {
                    sound.groupVolume = value;
                }
            });
        }
    };

    return group;
}

Group.Effects = Effects;
