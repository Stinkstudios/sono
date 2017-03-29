export default function AudioSource(Type, data, context, onEnded) {
    const sourceNode = context ? context.createGain() : null;
    const api = {};
    const pool = [];
    const sources = [];
    let numCreated = 0;
    let singlePlay = false;

    function createSourceNode() {
        return sourceNode;
    }

    function disposeSource(src) {
        src.stop();
        if (!singlePlay) {
            pool.push(src);
        }
    }

    function onSourceEnded(src) {
        if (sources.length > 1) {
            const index = sources.indexOf(src);
            sources.splice(index, 1);
        }
        disposeSource(src);
        onEnded();
    }

    function getSource() {
        if (sources.length && (singlePlay || sources[0].paused)) {
            return sources[0];
        }
        if (pool.length > 0) {
            return pool.pop();
        } else {
            numCreated++;
            if (data.tagName) {
                return new Type(data.cloneNode(), context, onSourceEnded);
            }
            return new Type(data, context, onSourceEnded);
        }
    }

    function play() {
        const src = getSource();
        if (sourceNode) {
            src.sourceNode.connect(sourceNode);
        }
        if (src !== sources[0]) {
            sources.push(src);
        }
        src.play();
    }

    function stop() {
        while (sources.length > 1) {
            disposeSource(sources.pop());
        }
    }

    function pause() {
        sources.forEach((src) => src.pause());
    }

    function load(url) {
        stop();
        pool.length = 0;
        if (sources.length) {
            sources[0].load(url);
        }
    }

    function fade(volume, duration) {
        sources.forEach((src) => src.fade(volume, duration));
    }

    function destroy() {
        while (sources.length) {
            sources.pop().destroy();
        }
        while (pool.length) {
            pool.pop().destroy();
        }
        sourceNode.disconnect();
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
        fade: {
            value: fade
        },
        destroy: {
            value: destroy
        },
        currentTime: {
            get: function() {
                return (sources[0] && sources[0].currentTime) || 0;
            }
        },
        duration: {
            get: function() {
                return (sources[0] && sources[0].duration) || 0;
            }
        },
        ended: {
            get: function() {
                return sources.every((src) => src.ended);
            }
        },
        info: {
            get: function() {
                return {
                    pooled: pool.length,
                    active: sources.length,
                    created: numCreated
                };
            }
        },
        loop: {
            get: function() {
                return sources[0] && sources[0].loop;
            },
            set: function(value) {
                sources.forEach((src) => (src.loop = !!value));
            }
        },
        paused: {
            get: function() {
                return sources[0] && sources[0].paused;
            }
        },
        playbackRate: {
            get: function() {
                return sources[0] && sources[0].playbackRate;
            },
            set: function(value) {
                sources.forEach((src) => (src.playbackRate = value));
            }
        },
        playing: {
            get: function() {
                return sources[0] && sources[0].playing;
            }
        },
        progress: {
            get: function() {
                return sources[0] && sources[0].progress;
            }
        },
        singlePlay: {
            get: function() {
                return singlePlay;
            },
            set: function(value) {
                singlePlay = value;
            }
        },
        sourceNode: {
            get: function() {
                return createSourceNode();
            }
        },
        volume: {
            get: function() {
                return sources[0] && sources[0].volume;
            },
            set: function(value) {
                sources.forEach((src) => (src.volume = value));
            }
        },
        groupVolume: {
            get: function() {
                return sources[0] && sources[0].groupVolume;
            },
            set: function(value) {
                if (sources[0] && !sources[0].hasOwnProperty('groupVolume')) {
                    return;
                }
                sources.forEach((src) => (src.groupVolume = value));
            }
        }
    });

    return Object.freeze(api);
}
