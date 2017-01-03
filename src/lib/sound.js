import BufferSource from './source/buffer-source';
import Effect from './effect';
import Emitter from './utils/emitter';
import file from './utils/file';
import Loader from './utils/loader';
import MediaSource from './source/media-source';
import MicrophoneSource from './source/microphone-source';
import OscillatorSource from './source/oscillator-source';
import ScriptSource from './source/script-source';
import waveform from './utils/waveform.js';

export default function Sound(config) {
    let context = config.context;
    let destination = config.destination;
    let effect = new Effect(context);
    let gain = effect.gain();
    let wave = waveform();

    let id = null;
    let data = null;
    let isTouchLocked = false;
    let loader = null;
    let loop = false;
    let playbackRate = 1;
    let playWhenReady = null;
    let source = null;
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

        if (file.isAudioBuffer(data)) {
            source = new BufferSource(data, context, () => sound.emit('ended', sound));
        } else if (file.isMediaElement(data)) {
            source = new MediaSource(data, context, () => sound.emit('ended', sound));
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

    function onLoad(fileData) {
        createSource(fileData);
        sound.emit('loaded', sound);
    }

    function onLoadError(err) {
        sound.emit('error', sound, err);
    }

    function load(newConfig = null, force = false) {
        const skipLoad = !force && !source && !!config.deferLoad;

        if (newConfig) {
            const src = file.getSupportedFile(config.src || config.url || config.data || config) || config.src;
            config = Object.assign(config, newConfig, {src});
        }

        if (source && data && data.tagName) {
            source.load(config.src);
        } else {
            loader = loader || new Loader(config.src, skipLoad);
            loader.audioContext = !!config.asMediaElement ? null : context;
            loader.isTouchLocked = isTouchLocked;
            loader.off('loaded', onLoad);
            loader.once('loaded', onLoad);
            loader.off('error', onLoadError);
            loader.on('error', onLoadError);
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
            if (!!config.deferLoad) {
                if (!loader) {
                    load(null, true);
                }
                loader.start(true);
            }
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

        sound.emit('fade', sound, volume);

        return sound;
    }

    function unload() {
        source && source.destroy();
        loader && loader.destroy();
        data = null;
        playWhenReady = null;
        source = null;
        loader = null;
        config.deferLoad = true;
        sound.emit('unload', sound);
    }

    function reload() {
        load(null, true);
    }

    /*
     * Destroy
     */

    function destroy() {
        source && source.destroy();
        effect && effect.destroy();
        gain && gain.disconnect();
        loader && loader.off('loaded');
        loader && loader.off('error');
        loader && loader.destroy();
        sound.off('loaded');
        sound.off('ended');
        sound.off('error');
        gain = null;
        context = null;
        destination = null;
        data = null;
        playWhenReady = null;
        source = null;
        effect = null;
        loader = null;
        wave = null;
        config = null;
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
        unload: {
            value: unload
        },
        reload: {
            value: reload
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
        config: {
            get: function() {
                return config;
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

    return sound;
}

// expose for unit tests
Sound.__source = {
    BufferSource,
    MediaSource,
    MicrophoneSource,
    OscillatorSource,
    ScriptSource
};
