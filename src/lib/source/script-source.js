export default function ScriptSource(data, context) {
    const bufferSize = data.bufferSize || 1024;
    const channels = data.channels || 1;
    let ended = false,
        onProcess = data.callback.bind(data.thisArg || this),
        paused = false,
        pausedAt = 0,
        playing = false,
        sourceNode = null, // ScriptSourceNode
        startedAt = 0,
        api = null;

    function createSourceNode() {
        if (!sourceNode && context) {
            sourceNode = context.createScriptProcessor(bufferSize, 0, channels);
        }
        return sourceNode;
    }

    /*
     * Controls
     */

    function play() {
        createSourceNode();
        sourceNode.onaudioprocess = onProcess;

        startedAt = context.currentTime - pausedAt;
        ended = false;
        paused = false;
        pausedAt = 0;
        playing = true;
    }

    function onPaused(event) {
        const buffer = event.outputBuffer;
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            const channel = buffer.getChannelData(i);
            for (let j = 0; j < channel.length; j++) {
                channel[j] = 0;
            }
        }
    }

    function stop() {
        if (sourceNode) {
            sourceNode.onaudioprocess = onPaused;
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
        onProcess = null;
        sourceNode = null;
    }

    /*
     * Api
     */

    api = {
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
