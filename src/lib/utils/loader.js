'use strict';

// var signals = require('signals');
var EventEmitter = require('events').EventEmitter;

function Loader(url) {
    var emitter = new EventEmitter(),
        // onProgress = new signals.Signal(),
        // onBeforeComplete = new signals.Signal(),
        // onComplete = new signals.Signal(),
        // onError = new signals.Signal(),
        progress = 0,
        audioContext,
        isTouchLocked,
        request,
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
                    progress = 1;
                    dispatch(buffer);
                    // onProgress.dispatch(1);
                    // onBeforeComplete.dispatch(buffer);
                    // onComplete.dispatch(buffer);
                },
                function(e) {
                    //onError.dispatch(e);
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
        data = new Audio();
        data.name = url;
        data.preload = 'auto';
        data.src = url;

        if (!!isTouchLocked) {
            // onProgress.dispatch(1);
            // onBeforeComplete.dispatch(data);
            // onComplete.dispatch(data);
            dispatch(data);
        }
        else {
            var timeout;
            var readyHandler = function() {
                data.removeEventListener('canplaythrough', readyHandler);
                window.clearTimeout(timeout);
                progress = 1;
                // onProgress.dispatch(1);
                // onBeforeComplete.dispatch(data);
                // onComplete.dispatch(data);
                dispatch(data);
            };
            // timeout because sometimes canplaythrough doesn't fire
            timeout = window.setTimeout(readyHandler, 4000);
            data.addEventListener('canplaythrough', readyHandler, false);
            data.onerror = function(e) {
                window.clearTimeout(timeout);
                // onError.dispatch(e);
                emitter.emit('error', e);
            };
            data.load();
        }
    };

    var cancel = function() {
        if(request && request.readyState !== 4) {
          request.abort();
        }
    };

    var destroy = function() {
        cancel();
        // onProgress.removeAll();
        // onComplete.removeAll();
        // onBeforeComplete.removeAll();
        // onError.removeAll();
        emitter.removeAllListeners('progress');
        emitter.removeAllListeners('complete');
        emitter.removeAllListeners('loaded');
        emitter.removeAllListeners('error');
        request = null;
        data = null;
        audioContext = null;
    };

    var api = {
        on: emitter.on.bind(emitter),
        once: emitter.once.bind(emitter),
        off: emitter.removeListener.bind(emitter),
        start: start,
        cancel: cancel,
        destroy: destroy
        // ,
        // onProgress: onProgress,
        // onComplete: onComplete,
        // onBeforeComplete: onBeforeComplete,
        // onError: onError
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
    var emitter = new EventEmitter(),
        queue = [],
        numLoaded = 0,
        numTotal = 0;//,
        // onComplete = new signals.Signal(),
        // onProgress = new signals.Signal(),
        // onError = new signals.Signal();

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
            // onComplete.dispatch();
            emitter.emit('complete');
            return;
        }

        var loader = queue.pop();
        // loader.onProgress.add(progressHandler);
        // loader.onBeforeComplete.addOnce(completeHandler);
        // loader.onError.addOnce(errorHandler);
        loader.on('progress', progressHandler);
        loader.on('loaded', completeHandler);
        loader.on('error', errorHandler);
        loader.start();
    };

    var progressHandler = function(progress) {
        var loaded = numLoaded + progress;
        // onProgress.dispatch(loaded / numTotal);
        emitter.emit('progress', loaded / numTotal);
    };

    var completeHandler = function() {
        numLoaded++;
        // onProgress.dispatch(numLoaded / numTotal);
        emitter.emit('progress', numLoaded / numTotal);
        next();
    };

    var errorHandler = function(e) {
        // onError.dispatch(e);
        emitter.emit('error', e);
        next();
    };

    return Object.freeze({
        on: emitter.on.bind(emitter),
        once: emitter.once.bind(emitter),
        off: emitter.removeListener.bind(emitter),
        add: add,
        start: start//,
        // onProgress: onProgress,
        // onComplete: onComplete,
        // onError: onError
    });
};

module.exports = Loader;
