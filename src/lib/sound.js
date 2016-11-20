import BufferSource from './source/buffer-source';
import Effect from './effect';
import Emitter from './utils/emitter';
import file from './utils/file';
import Loader from './utils/loader';
import AudioSource from './source/audio-source';
import MediaSource from './source/media-source';
import MicrophoneSource from './source/microphone-source';
import OscillatorSource from './source/oscillator-source';
import ScriptSource from './source/script-source';
import waveform from './utils/waveform.js';

export default function Sound(context, destination) {
    let id,
        data,
        effect = new Effect(context),
        gain = effect.gain(),
        wave = waveform(),
        isTouchLocked = false,
        loader,
        loop = false,
        playbackRate = 1,
        playWhenReady,
        source;

    let sound = null;

    if (context) {
        effect.setDestination(gain);
        gain.connect(destination || context.destination);
    }

    /*
     * Create source
     */

    function createSource(value) {
        data = value;

        const isAudioBuffer = file.isAudioBuffer(data);
        if (isAudioBuffer || file.isMediaElement(data)) {
            const Fn = isAudioBuffer ? BufferSource : MediaSource;
            source = new AudioSource(Fn, data, context, () => sound.emit('ended', sound));
        } else if (file.isMediaStream(data)) {
            source = new MicrophoneSource(data, context);
        } else if (file.isOscillatorType((data && data.type) || data)) {
            source = new OscillatorSource(data.type || data, context);
        } else if (file.isScriptConfig(data)) {
            source = new ScriptSource(data, context);
        } else {
            throw new Error('Cannot detect data type: ' + data);
        }

        effect.setSource(source.sourceNode);

        sound.emit('ready', sound);

        if (playWhenReady) {
            playWhenReady();
        }
    }

    /*
     * Load
     */

    function load(config) {
        const src = file.getSupportedFile(config.src || config.url || config.data || config);

        if (source && data && data.tagName) {
            source.load(src);
        } else {
            loader = loader || new Loader(src);
            loader.audioContext = !!config.asMediaElement ? null : context;
            loader.isTouchLocked = isTouchLocked;
            loader.once('loaded', function(fileData) {
                createSource(fileData);
                sound.emit('loaded', sound);
            });
        }
        return sound;
    }

    /*
     * Controls
     */

    function play(delay, offset) {
        if (!source || isTouchLocked) {
            playWhenReady = function() {
                if (source) {
                    play(delay, offset);
                }
            };
            return sound;
        }
        playWhenReady = null;
        effect.setSource(source.sourceNode);

        // update volume needed for no webaudio
        if (!context) {
            sound.volume = gain.gain.value;
        }

        source.play(delay, offset);

        if (source.hasOwnProperty('loop')) {
            source.loop = loop;
        }

        sound.emit('play', sound);

        return sound;
    }

    function pause() {
        source && source.pause();
        sound.emit('pause', sound);
        return sound;
    }

    function stop(delay) {
        source && source.stop(delay || 0);
        sound.emit('stop', sound);
        return sound;
    }

    function seek(percent) {
        if (source) {
            source.stop();
            play(0, source.duration * percent);
        }
        return sound;
    }

    function fade(volume, duration) {
        if (!source) {
            return sound;
        }

        const param = gain.gain;

        if (context) {
            const time = context.currentTime;
            param.cancelScheduledValues(time);
            param.setValueAtTime(param.value, time);
            param.linearRampToValueAtTime(volume, time + duration);
        } else if (typeof source.fade === 'function') {
            source.fade(volume, duration);
            param.value = volume;
        }

        return sound;
    }

    /*
     * Destroy
     */

    function destroy() {
        source && source.destroy();
        effect && effect.destroy();
        gain && gain.disconnect();
        loader && loader.destroy();
        sound.off('loaded');
        sound.off('ended');
        gain = null;
        context = null;
        data = null;
        playWhenReady = null;
        source = null;
        effect = null;
        loader = null;
        wave = null;
        sound.emit('destroy', sound);
        sound.off('destroy');
    }

    sound = Object.create(Emitter.prototype, {
        _events: {
            value: {}
        },
        constructor: {
            value: Sound
        },
        play: {
            value: play
        },
        pause: {
            value: pause
        },
        load: {
            value: load
        },
        seek: {
            value: seek
        },
        stop: {
            value: stop
        },
        fade: {
            value: fade
        },
        destroy: {
            value: destroy
        },
        context: {
            value: context
        },
        currentTime: {
            get: function() {
                return source ? source.currentTime : 0;
            },
            set: function(value) {
                // const silent = sound.playing;
                source && source.stop();
                // play(0, value, silent);
                play(0, value);
            }
        },
        data: {
            get: function() {
                return data;
            },
            set: function(value) {
                if (!value) {
                    return;
                }
                createSource(value);
            }
        },
        duration: {
            get: function() {
                return source ? source.duration : 0;
            }
        },
        effect: {
            value: effect
        },
        ended: {
            get: function() {
                return !!source && source.ended;
            }
        },
        frequency: {
            get: function() {
                return source ? source.frequency : 0;
            },
            set: function(value) {
                if (source && source.hasOwnProperty('frequency')) {
                    source.frequency = value;
                }
            }
        },
        gain: {
            value: gain
        },
        id: {
            get: function() {
                return id;
            },
            set: function(value) {
                id = value;
            }
        },
        isTouchLocked: {
            set: function(value) {
                isTouchLocked = value;
                if (loader) {
                    loader.isTouchLocked = value;
                }
                if (!value && playWhenReady) {
                    playWhenReady();
                }
            }
        },
        loader: {
            get: function() {
                return loader;
            }
        },
        loop: {
            get: function() {
                return loop;
            },
            set: function(value) {
                loop = !!value;

                if (source && source.hasOwnProperty('loop') && source.loop !== loop) {
                    source.loop = loop;
                }
            }
        },
        paused: {
            get: function() {
                return !!source && source.paused;
            }
        },
        playing: {
            get: function() {
                return !!source && source.playing;
            }
        },
        playbackRate: {
            get: function() {
                return playbackRate;
            },
            set: function(value) {
                playbackRate = value;
                if (source) {
                    source.playbackRate = playbackRate;
                }
            }
        },
        progress: {
            get: function() {
                return source ? source.progress : 0;
            }
        },
        sourceNode: {
            get: function() {
                return source ? source.sourceNode : null;
            }
        },
        volume: {
            get: function() {
                if (context) {
                    return gain.gain.value;
                }
                if (source && source.hasOwnProperty('volume')) {
                    return source.volume;
                }
                return 1;
            },
            set: function(value) {
                if (isNaN(value)) {
                    return;
                }

                value = Math.min(Math.max(value, 0), 1);

                const param = gain.gain;

                if (context) {
                    const time = context.currentTime;
                    param.cancelScheduledValues(time);
                    param.value = value;
                    param.setValueAtTime(value, time);
                } else {
                    param.value = value;

                    if (source && source.hasOwnProperty('volume')) {
                        source.volume = value;
                    }
                }
            }
        },
        // for media element source
        groupVolume: {
            get: function() {
                return source.groupVolume;
            },
            set: function(value) {
                if (source && source.hasOwnProperty('groupVolume')) {
                    source.groupVolume = value;
                }
            }
        },
        waveform: {
            value: function(length) {
                if (!data) {
                    sound.once('ready', () => wave(data, length));
                }
                return wave(data, length);
            }
        },
        userData: {
            value: {}
        }
    });

    return Object.freeze(sound);
}

// expose for unit tests
Sound.__source = {
    BufferSource,
    MediaSource,
    MicrophoneSource,
    OscillatorSource,
    ScriptSource
};
