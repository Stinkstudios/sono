'use strict';

var Emitter = require('./emitter.js');

function Loader(url) {
    var emitter = new Emitter(),
        progress = 0,
        audioContext,
        isTouchLocked,
        request,
        timeout,
        data;

    var start = function() {
        if(audioContext) {
            loadArrayBuffer();
        } else {
            loadAudioElement();
        }
    };

    var dispatch = function(buffer) {
        emitter.emit('progress', 1);
        emitter.emit('loaded', buffer);
        emitter.emit('complete', buffer);
    };

    var loadArrayBuffer = function() {
        request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onprogress = function(event) {
            if (event.lengthComputable) {
                progress = event.loaded / event.total;
                // onProgress.dispatch(progress);
                emitter.emit('progress', progress);
            }
        };
        request.onload = function() {
            audioContext.decodeAudioData(
                request.response,
                function(buffer) {
                    data = buffer;
                    request = null;
                    progress = 1;
                    dispatch(buffer);
                },
                function(e) {
                    emitter.emit('error', e);
                }
            );
        };
        request.onerror = function(e) {
            // onError.dispatch(e);
            emitter.emit('error', e);
        };
        request.send();
    };

    var loadAudioElement = function() {
        if(!data || !data.tagName) {
            data = new Audio();
        }

        if(!isTouchLocked) {
            // timeout because sometimes canplaythrough doesn't fire
            window.clearTimeout(timeout);
            timeout = window.setTimeout(readyHandler, 2000);
            data.addEventListener('canplaythrough', readyHandler, false);
        }

        data.addEventListener('error', errorHandler, false);
        data.preload = 'auto';
        data.src = url;
        data.load();

        if (isTouchLocked) {
            dispatch(data);
        }
    };

    var errorHandler = function(e) {
        window.clearTimeout(timeout);
        emitter.emit('error', e);
    };

    var readyHandler = function() {
        window.clearTimeout(timeout);
        if(!data) { return; }
        data.removeEventListener('canplaythrough', readyHandler);
        progress = 1;
        dispatch(data);
    };

    var cancel = function() {
        if(request && request.readyState !== 4) {
          request.abort();
        }
        if(data && typeof data.removeEventListener === 'function') {
            data.removeEventListener('canplaythrough', readyHandler);
        }
        window.clearTimeout(timeout);

        emitter.removeAllListeners('progress');
        emitter.removeAllListeners('complete');
        emitter.removeAllListeners('loaded');
        emitter.removeAllListeners('error');
    };

    var destroy = function() {
        cancel();
        request = null;
        data = null;
        audioContext = null;
    };

    var load = function(newUrl) {
        url = newUrl;
        start();
    };

    var api = {
        on: emitter.on.bind(emitter),
        once: emitter.once.bind(emitter),
        off: emitter.off.bind(emitter),
        load: load,
        start: start,
        cancel: cancel,
        destroy: destroy
    };

    Object.defineProperties(api, {
        'data': {
            get: function() {
                return data;
            }
        },
        'progress': {
            get: function() {
                return progress;
            }
        },
        'audioContext': {
            set: function(value) {
                audioContext = value;
            }
        },
        'isTouchLocked': {
            set: function(value) {
                isTouchLocked = value;
            }
        }
    });

    return Object.freeze(api);
}

Loader.Group = function() {
    var emitter = new Emitter(),
        queue = [],
        numLoaded = 0,
        numTotal = 0;

    var add = function(loader) {
        queue.push(loader);
        numTotal++;
        return loader;
    };

    var start = function() {
        numTotal = queue.length;
        next();
    };

    var next = function() {
        if(queue.length === 0) {
            emitter.emit('complete');
            return;
        }

        var loader = queue.pop();
        loader.on('progress', progressHandler);
        loader.on('loaded', completeHandler);
        loader.on('error', errorHandler);
        loader.start();
    };

    var progressHandler = function(progress) {
        var loaded = numLoaded + progress;
        emitter.emit('progress', loaded / numTotal);
    };

    var completeHandler = function() {
        numLoaded++;
        emitter.emit('progress', numLoaded / numTotal);
        next();
    };

    var errorHandler = function(e) {
        emitter.emit('error', e);
        next();
    };

    return Object.freeze({
        on: emitter.on.bind(emitter),
        once: emitter.once.bind(emitter),
        off: emitter.off.bind(emitter),
        add: add,
        start: start
    });
};

module.exports = Loader;
