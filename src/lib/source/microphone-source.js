export default function MicrophoneSource(stream, context) {
    let ended = false,
        paused = false,
        pausedAt = 0,
        playing = false,
        sourceNode = null, // MicrophoneSourceNode
        startedAt = 0;

    function createSourceNode() {
        if (!sourceNode && context) {
            sourceNode = context.createMediaStreamSource(stream);
            // HACK: stops moz garbage collection killing the stream
            // see https://support.mozilla.org/en-US/questions/984179
            if (navigator.mozGetUserMedia) {
                window.mozHack = sourceNode;
            }
        }
        return sourceNode;
    }

    /*
     * Controls
     */

    function play(delay) {
        delay = delay ? context.currentTime + delay : 0;

        createSourceNode();
        sourceNode.start(delay);

        startedAt = context.currentTime - pausedAt;
        ended = false;
        playing = true;
        paused = false;
        pausedAt = 0;
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
        pausedAt = 0;
        playing = false;
        startedAt = 0;
    }

    function pause() {
        const elapsed = context.currentTime - startedAt;
        stop();
        pausedAt = elapsed;
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
        stream = null;
        window.mozHack = null;
    }

    /*
     * Api
     */

    const api = {
        play,
        pause,
        stop,
        destroy,

        duration: 0,
        progress: 0
    };

    /*
     * Getters & Setters
     */

    Object.defineProperties(api, {
        currentTime: {
            get: function() {
                if (pausedAt) {
                    return pausedAt;
                }
                if (startedAt) {
                    return context.currentTime - startedAt;
                }
                return 0;
            }
        },
        ended: {
            get: function() {
                return ended;
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
        sourceNode: {
            get: function() {
                return createSourceNode();
            }
        }
    });

    return Object.freeze(api);
}
