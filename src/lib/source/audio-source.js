export default function AudioSource(Type, data, context, onEnded, multiPlay) {
    const sourceNode = context ? context.createGain() : null;
    const api = {};
    const pool = [];
    const sources = [];
    let numCreated = 0;

    function createSourceNode() {
        return sourceNode;
    }

    function source() {
        return sources[0];
    }

    function disposeSource(src) {
        src.stop();
        if (multiPlay) {
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
        if (!multiPlay && sources.length) {
            return source();
        }
        if ( pool.length > 0 ) {
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
        sources.forEach((s) => console.log(pool.indexOf(s)));
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
                return source() && source().currentTime || 0;
            }
        },
        duration: {
            get: function() {
                return source() && source().duration || 0;
            }
        },
        ended: {
            get: function() {
                return sources.every((src) => src.ended);
            }
        },
        loop: {
            get: function() {
                return source() && source().loop;
            },
            set: function(value) {
                sources.forEach((src) => (src.loop = !!value));
            }
        },
        paused: {
            get: function() {
                return source() && source().paused;
            }
        },
        playbackRate: {
            get: function() {
                return source() && source().playbackRate;
            },
            set: function(value) {
                sources.forEach((src) => (src.playbackRate = value));
            }
        },
        playing: {
            get: function() {
                return source() && source().playing;
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
        progress: {
            get: function() {
                return source() && source().progress;
            }
        },
        sourceNode: {
            get: function() {
                return createSourceNode();
            }
        },
        volume: {
            get: function() {
                return source() && source().volume;
            },
            set: function(value) {
                sources.forEach((src) => (src.volume = value));
            }
        },
        groupVolume: {
            get: function() {
                return source() && source().groupVolume;
            },
            set: function(value) {
                if (source() && !source().hasOwnProperty('groupVolume')) {
                    return;
                }
                sources.forEach((src) => (src.groupVolume = value));
            }
        }
    });

    return Object.freeze(api);
}
