export default function AudioSource(Type, data, context, onEnded) {
    const sourceNode = context.createGain();
    const source = create(data);
    const api = {};
    const pool = [];
    const clones = [];
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
        if (clones.length) {
            const index = clones.indexOf(src);
            clones.splice(index, 1);
            disposeSource(src);
        }
        onEnded();
    }

    function create(buffer) {
        return new Type(buffer, context, onSourceEnded);
    }

    function getSource() {
        if (singlePlay || !source.playing) {
            return source;
        }

        if (pool.length > 0) {
            return pool.pop();
        }

        numCreated++;
        if (data.tagName) {
            return create(data.cloneNode());
        }
        return create(data);
    }

    function play(delay, offset) {
        const src = getSource();
        if (sourceNode) {
            src.sourceNode.connect(sourceNode);
        }
        if (src !== source) {
            clones.push(src);
        }
        src.play(delay, offset);
    }

    function stop() {
        source.stop();
        while (clones.length) {
            disposeSource(clones.pop());
        }
    }

    function pause() {
        source.pause();
        clones.forEach(src => src.pause());
    }

    function load(url) {
        stop();
        pool.length = 0;
        source.load(url);
    }

    function fade(volume, duration) {
        if (typeof source.fade === 'function') {
            source.fade(volume, duration);
            clones.forEach(src => src.fade(volume, duration));
        }
    }

    function destroy() {
        source.destroy();
        while (clones.length) {
            clones.pop().destroy();
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
                return source.currentTime || 0;
            },
            set: function(value) {
                source.currentTime = value;
                clones.forEach(src => (src.currentTime = value));
            }
        },
        duration: {
            get: function() {
                return source.duration || 0;
            }
        },
        ended: {
            get: function() {
                return source.ended && clones.every(src => src.ended);
            }
        },
        info: {
            get: function() {
                return {
                    pooled: pool.length,
                    active: clones.length + 1,
                    created: numCreated + 1
                };
            }
        },
        loop: {
            get: function() {
                return source.loop;
            },
            set: function(value) {
                source.loop = !!value;
                clones.forEach(src => (src.loop = !!value));
            }
        },
        paused: {
            get: function() {
                return source.paused;
            }
        },
        playbackRate: {
            get: function() {
                return source.playbackRate;
            },
            set: function(value) {
                source.playbackRate = value;
                clones.forEach(src => (src.playbackRate = value));
            }
        },
        playing: {
            get: function() {
                return source.playing;
            }
        },
        progress: {
            get: function() {
                return source.progress;
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
                return source.volume;
            },
            set: function(value) {
                if (source.hasOwnProperty('volume')) {
                    source.volume = value;
                    clones.forEach(src => (src.volume = value));
                }
            }
        },
        groupVolume: {
            get: function() {
                return source.groupVolume;
            },
            set: function(value) {
                if (!source.hasOwnProperty('groupVolume')) {
                    return;
                }
                source.groupVolume = value;
                clones.forEach(src => (src.groupVolume = value));
            }
        }
    });

    return Object.freeze(api);
}
