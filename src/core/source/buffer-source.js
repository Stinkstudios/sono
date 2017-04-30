export default function BufferSource(buffer, context, endedCallback) {
    const api = {};
    let ended = false;
    let loop = false;
    let paused = false;
    let cuedAt = 0;
    let playbackRate = 1;
    let playing = false;
    let sourceNode = null;
    let startedAt = 0;

    function createSourceNode() {
        if (!sourceNode && context) {
            sourceNode = context.createBufferSource();
            sourceNode.buffer = buffer;
        }
        return sourceNode;
    }

    /*
     * Controls
     */

    function stop() {
        if (sourceNode) {
            sourceNode.onended = null;
            try {
                sourceNode.disconnect();
                sourceNode.stop(0);
            } catch (e) {}
            sourceNode = null;
        }

        paused = false;
        cuedAt = 0;
        playing = false;
        startedAt = 0;
    }

    function pause() {
        const elapsed = context.currentTime - startedAt;
        stop();
        cuedAt = elapsed;
        playing = false;
        paused = true;
    }

    function endedHandler() {
        stop();
        ended = true;
        if (typeof endedCallback === 'function') {
            endedCallback(api);
        }
    }

    function play(delay = 0, offset = 0) {
        if (playing) {
            return;
        }

        delay = delay ? context.currentTime + delay : 0;

        if (offset) {
            cuedAt = 0;
        }

        if (cuedAt) {
            offset = cuedAt;
        }

        while (offset > api.duration) {
            offset = offset % api.duration;
        }

        createSourceNode();
        sourceNode.onended = endedHandler;
        sourceNode.start(delay, offset);

        sourceNode.loop = loop;
        sourceNode.playbackRate.value = playbackRate;

        startedAt = context.currentTime - offset;
        ended = false;
        paused = false;
        cuedAt = 0;
        playing = true;
    }


    /*
     * Destroy
     */

    function destroy() {
        stop();
        buffer = null;
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
        destroy: {
            value: destroy
        },
        currentTime: {
            get: function() {
                if (cuedAt) {
                    return cuedAt;
                }
                if (startedAt) {
                    return context.currentTime - startedAt;
                }
                return 0;
            },
            set: function(value) {
                cuedAt = value;
            }
        },
        duration: {
            get: function() {
                return buffer ? buffer.duration : 0;
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
                if (sourceNode) {
                    sourceNode.loop = loop;
                }
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
                if (sourceNode) {
                    sourceNode.playbackRate.value = playbackRate;
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
                return api.duration ? api.currentTime / api.duration : 0;
            }
        },
        sourceNode: {
            get: function() {
                return createSourceNode();
            }
        }
    });

    return Object.freeze(api);
}
