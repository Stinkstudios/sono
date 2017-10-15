export default function MediaSource(el, context, onEnded) {
    const api = {};
    let ended = false;
    let endedCallback = onEnded;
    let delayTimeout = null;
    let loop = false;
    let paused = false;
    let playbackRate = 1;
    let playing = false;
    let sourceNode = null;
    let groupVolume = 1;
    let volume = 1;

    function createSourceNode() {
        if (!sourceNode && context) {
            sourceNode = context.createMediaElementSource(el);
        }
        return sourceNode;
    }

    /*
     * Load
     */

    function load(url) {
        el.src = url;
        el.load();
        ended = false;
        paused = false;
        playing = false;
    }

    /*
     * Controls
     */

    function readyHandler() {
        el.removeEventListener('canplaythrough', readyHandler);
        if (playing) {
            el.play();
        }
    }

    /*
     * Ended handler
     */

    function endedHandler() {

        if (loop) {
            el.currentTime = 0;
            // fixes bug where server doesn't support seek:
            if (el.currentTime > 0) {
                el.load();
            }
            el.play();

            return;
        }

        ended = true;
        paused = false;
        playing = false;

        if (typeof endedCallback === 'function') {
            endedCallback(api);
        }
    }

    function play(delay, offset) {
        clearTimeout(delayTimeout);

        el.volume = volume * groupVolume;
        el.playbackRate = playbackRate;

        if (offset) {
            el.currentTime = offset;
        }

        if (delay) {
            delayTimeout = setTimeout(play, delay);
        } else {
            // el.load();
            el.play();
        }

        ended = false;
        paused = false;
        playing = true;

        el.removeEventListener('ended', endedHandler);
        el.addEventListener('ended', endedHandler, false);

        if (el.readyState < 1) {
            el.removeEventListener('canplaythrough', readyHandler);
            el.addEventListener('canplaythrough', readyHandler, false);
            // el.load();
            el.play();
        }
    }

    function pause() {
        clearTimeout(delayTimeout);

        if (!el) {
            return;
        }

        el.pause();
        playing = false;
        paused = true;
    }

    function stop() {
        clearTimeout(delayTimeout);

        if (!el) {
            return;
        }

        el.pause();

        try {
            el.currentTime = 0;
            // fixes bug where server doesn't support seek:
            if (el.currentTime > 0) {
                el.load();
            }
        } catch (e) {}

        playing = false;
        paused = false;
    }

    /*
     * Destroy
     */

    function destroy() {
        el.removeEventListener('ended', endedHandler);
        el.removeEventListener('canplaythrough', readyHandler);
        stop();
        el = null;
        context = null;
        endedCallback = null;
        sourceNode = null;
    }

    /*
     * Getters & Setters
     */

    Object.defineProperties(api, {
        play: {
            value: play
        },
        pause: {
            value: pause
        },
        stop: {
            value: stop
        },
        load: {
            value: load
        },
        destroy: {
            value: destroy
        },
        currentTime: {
            get: function() {
                return el ? el.currentTime : 0;
            },
            set: function(value) {
                if (el) {
                    el.currentTime = value;
                }
            }
        },
        duration: {
            get: function() {
                return el ? el.duration : 0;
            }
        },
        ended: {
            get: function() {
                return ended;
            }
        },
        loop: {
            get: function() {
                return loop;
            },
            set: function(value) {
                loop = !!value;
            }
        },
        paused: {
            get: function() {
                return paused;
            }
        },
        playbackRate: {
            get: function() {
                return playbackRate;
            },
            set: function(value) {
                playbackRate = value;
                if (el) {
                    el.playbackRate = playbackRate;
                }
            }
        },
        playing: {
            get: function() {
                return playing;
            }
        },
        progress: {
            get: function() {
                return el && el.duration ? el.currentTime / el.duration : 0;
            }
        },
        sourceNode: {
            get: function() {
                return createSourceNode();
            }
        },
        volume: {
            get: function() {
                return volume;
            },
            set: function(value) {
                volume = value;
                if (el) {
                    el.volume = volume * groupVolume;
                }
            }
        },
        groupVolume: {
            get: function() {
                return groupVolume;
            },
            set: function(value) {
                groupVolume = value;
                if (el) {
                    el.volume = volume * groupVolume;
                }
            }
        }
    });

    return Object.freeze(api);
}
