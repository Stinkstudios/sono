export default function OscillatorSource(type, context) {
    let ended = false,
        paused = false,
        cuedAt = 0,
        playing = false,
        sourceNode = null, // OscillatorSourceNode
        startedAt = 0,
        frequency = 200,
        api = null;

    function createSourceNode() {
        if (!sourceNode && context) {
            sourceNode = context.createOscillator();
            sourceNode.type = type;
            sourceNode.frequency.value = frequency;
        }
        return sourceNode;
    }

    /*
     * Controls
     */

    function play(delay) {
        delay = delay || 0;
        if (delay) {
            delay = context.currentTime + delay;
        }

        createSourceNode();
        sourceNode.start(delay);

        if (cuedAt) {
            startedAt = context.currentTime - cuedAt;
        } else {
            startedAt = context.currentTime;
        }

        ended = false;
        playing = true;
        paused = false;
        cuedAt = 0;
    }

    function stop() {
        if (sourceNode) {
            try {
                sourceNode.stop(0);
            } catch (e) {}
            sourceNode = null;
        }
        ended = true;
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

    /*
     * Destroy
     */

    function destroy() {
        stop();
        context = null;
        sourceNode = null;
    }

    /*
     * Api
     */

    api = {
        play: play,
        pause: pause,
        stop: stop,
        destroy: destroy
    };

    /*
     * Getters & Setters
     */

    Object.defineProperties(api, {
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
            value: 0
        },
        ended: {
            get: function() {
                return ended;
            }
        },
        frequency: {
            get: function() {
                return frequency;
            },
            set: function(value) {
                frequency = value;
                if (sourceNode) {
                    sourceNode.frequency.value = value;
                }
            }
        },
        paused: {
            get: function() {
                return paused;
            }
        },
        playing: {
            get: function() {
                return playing;
            }
        },
        progress: {
            value: 0
        },
        sourceNode: {
            get: function() {
                return createSourceNode();
            }
        }
    });

    return Object.freeze(api);
}
