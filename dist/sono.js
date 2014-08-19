!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.Sono=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/*jslint onevar:true, undef:true, newcap:true, regexp:true, bitwise:true, maxerr:50, indent:4, white:false, nomen:false, plusplus:false */
/*global define:false, require:false, exports:false, module:false, signals:false */

/** @license
 * JS Signals <http://millermedeiros.github.com/js-signals/>
 * Released under the MIT license
 * Author: Miller Medeiros
 * Version: 1.0.0 - Build: 268 (2012/11/29 05:48 PM)
 */

(function(global){

    // SignalBinding -------------------------------------------------
    //================================================================

    /**
     * Object that represents a binding between a Signal and a listener function.
     * <br />- <strong>This is an internal constructor and shouldn't be called by regular users.</strong>
     * <br />- inspired by Joa Ebert AS3 SignalBinding and Robert Penner's Slot classes.
     * @author Miller Medeiros
     * @constructor
     * @internal
     * @name SignalBinding
     * @param {Signal} signal Reference to Signal object that listener is currently bound to.
     * @param {Function} listener Handler function bound to the signal.
     * @param {boolean} isOnce If binding should be executed just once.
     * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
     * @param {Number} [priority] The priority level of the event listener. (default = 0).
     */
    function SignalBinding(signal, listener, isOnce, listenerContext, priority) {

        /**
         * Handler function bound to the signal.
         * @type Function
         * @private
         */
        this._listener = listener;

        /**
         * If binding should be executed just once.
         * @type boolean
         * @private
         */
        this._isOnce = isOnce;

        /**
         * Context on which listener will be executed (object that should represent the `this` variable inside listener function).
         * @memberOf SignalBinding.prototype
         * @name context
         * @type Object|undefined|null
         */
        this.context = listenerContext;

        /**
         * Reference to Signal object that listener is currently bound to.
         * @type Signal
         * @private
         */
        this._signal = signal;

        /**
         * Listener priority
         * @type Number
         * @private
         */
        this._priority = priority || 0;
    }

    SignalBinding.prototype = {

        /**
         * If binding is active and should be executed.
         * @type boolean
         */
        active : true,

        /**
         * Default parameters passed to listener during `Signal.dispatch` and `SignalBinding.execute`. (curried parameters)
         * @type Array|null
         */
        params : null,

        /**
         * Call listener passing arbitrary parameters.
         * <p>If binding was added using `Signal.addOnce()` it will be automatically removed from signal dispatch queue, this method is used internally for the signal dispatch.</p>
         * @param {Array} [paramsArr] Array of parameters that should be passed to the listener
         * @return {*} Value returned by the listener.
         */
        execute : function (paramsArr) {
            var handlerReturn, params;
            if (this.active && !!this._listener) {
                params = this.params? this.params.concat(paramsArr) : paramsArr;
                handlerReturn = this._listener.apply(this.context, params);
                if (this._isOnce) {
                    this.detach();
                }
            }
            return handlerReturn;
        },

        /**
         * Detach binding from signal.
         * - alias to: mySignal.remove(myBinding.getListener());
         * @return {Function|null} Handler function bound to the signal or `null` if binding was previously detached.
         */
        detach : function () {
            return this.isBound()? this._signal.remove(this._listener, this.context) : null;
        },

        /**
         * @return {Boolean} `true` if binding is still bound to the signal and have a listener.
         */
        isBound : function () {
            return (!!this._signal && !!this._listener);
        },

        /**
         * @return {boolean} If SignalBinding will only be executed once.
         */
        isOnce : function () {
            return this._isOnce;
        },

        /**
         * @return {Function} Handler function bound to the signal.
         */
        getListener : function () {
            return this._listener;
        },

        /**
         * @return {Signal} Signal that listener is currently bound to.
         */
        getSignal : function () {
            return this._signal;
        },

        /**
         * Delete instance properties
         * @private
         */
        _destroy : function () {
            delete this._signal;
            delete this._listener;
            delete this.context;
        },

        /**
         * @return {string} String representation of the object.
         */
        toString : function () {
            return '[SignalBinding isOnce:' + this._isOnce +', isBound:'+ this.isBound() +', active:' + this.active + ']';
        }

    };


/*global SignalBinding:false*/

    // Signal --------------------------------------------------------
    //================================================================

    function validateListener(listener, fnName) {
        if (typeof listener !== 'function') {
            throw new Error( 'listener is a required param of {fn}() and should be a Function.'.replace('{fn}', fnName) );
        }
    }

    /**
     * Custom event broadcaster
     * <br />- inspired by Robert Penner's AS3 Signals.
     * @name Signal
     * @author Miller Medeiros
     * @constructor
     */
    function Signal() {
        /**
         * @type Array.<SignalBinding>
         * @private
         */
        this._bindings = [];
        this._prevParams = null;

        // enforce dispatch to aways work on same context (#47)
        var self = this;
        this.dispatch = function(){
            Signal.prototype.dispatch.apply(self, arguments);
        };
    }

    Signal.prototype = {

        /**
         * Signals Version Number
         * @type String
         * @const
         */
        VERSION : '1.0.0',

        /**
         * If Signal should keep record of previously dispatched parameters and
         * automatically execute listener during `add()`/`addOnce()` if Signal was
         * already dispatched before.
         * @type boolean
         */
        memorize : false,

        /**
         * @type boolean
         * @private
         */
        _shouldPropagate : true,

        /**
         * If Signal is active and should broadcast events.
         * <p><strong>IMPORTANT:</strong> Setting this property during a dispatch will only affect the next dispatch, if you want to stop the propagation of a signal use `halt()` instead.</p>
         * @type boolean
         */
        active : true,

        /**
         * @param {Function} listener
         * @param {boolean} isOnce
         * @param {Object} [listenerContext]
         * @param {Number} [priority]
         * @return {SignalBinding}
         * @private
         */
        _registerListener : function (listener, isOnce, listenerContext, priority) {

            var prevIndex = this._indexOfListener(listener, listenerContext),
                binding;

            if (prevIndex !== -1) {
                binding = this._bindings[prevIndex];
                if (binding.isOnce() !== isOnce) {
                    throw new Error('You cannot add'+ (isOnce? '' : 'Once') +'() then add'+ (!isOnce? '' : 'Once') +'() the same listener without removing the relationship first.');
                }
            } else {
                binding = new SignalBinding(this, listener, isOnce, listenerContext, priority);
                this._addBinding(binding);
            }

            if(this.memorize && this._prevParams){
                binding.execute(this._prevParams);
            }

            return binding;
        },

        /**
         * @param {SignalBinding} binding
         * @private
         */
        _addBinding : function (binding) {
            //simplified insertion sort
            var n = this._bindings.length;
            do { --n; } while (this._bindings[n] && binding._priority <= this._bindings[n]._priority);
            this._bindings.splice(n + 1, 0, binding);
        },

        /**
         * @param {Function} listener
         * @return {number}
         * @private
         */
        _indexOfListener : function (listener, context) {
            var n = this._bindings.length,
                cur;
            while (n--) {
                cur = this._bindings[n];
                if (cur._listener === listener && cur.context === context) {
                    return n;
                }
            }
            return -1;
        },

        /**
         * Check if listener was attached to Signal.
         * @param {Function} listener
         * @param {Object} [context]
         * @return {boolean} if Signal has the specified listener.
         */
        has : function (listener, context) {
            return this._indexOfListener(listener, context) !== -1;
        },

        /**
         * Add a listener to the signal.
         * @param {Function} listener Signal handler function.
         * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
         * @param {Number} [priority] The priority level of the event listener. Listeners with higher priority will be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added. (default = 0)
         * @return {SignalBinding} An Object representing the binding between the Signal and listener.
         */
        add : function (listener, listenerContext, priority) {
            validateListener(listener, 'add');
            return this._registerListener(listener, false, listenerContext, priority);
        },

        /**
         * Add listener to the signal that should be removed after first execution (will be executed only once).
         * @param {Function} listener Signal handler function.
         * @param {Object} [listenerContext] Context on which listener will be executed (object that should represent the `this` variable inside listener function).
         * @param {Number} [priority] The priority level of the event listener. Listeners with higher priority will be executed before listeners with lower priority. Listeners with same priority level will be executed at the same order as they were added. (default = 0)
         * @return {SignalBinding} An Object representing the binding between the Signal and listener.
         */
        addOnce : function (listener, listenerContext, priority) {
            validateListener(listener, 'addOnce');
            return this._registerListener(listener, true, listenerContext, priority);
        },

        /**
         * Remove a single listener from the dispatch queue.
         * @param {Function} listener Handler function that should be removed.
         * @param {Object} [context] Execution context (since you can add the same handler multiple times if executing in a different context).
         * @return {Function} Listener handler function.
         */
        remove : function (listener, context) {
            validateListener(listener, 'remove');

            var i = this._indexOfListener(listener, context);
            if (i !== -1) {
                this._bindings[i]._destroy(); //no reason to a SignalBinding exist if it isn't attached to a signal
                this._bindings.splice(i, 1);
            }
            return listener;
        },

        /**
         * Remove all listeners from the Signal.
         */
        removeAll : function () {
            var n = this._bindings.length;
            while (n--) {
                this._bindings[n]._destroy();
            }
            this._bindings.length = 0;
        },

        /**
         * @return {number} Number of listeners attached to the Signal.
         */
        getNumListeners : function () {
            return this._bindings.length;
        },

        /**
         * Stop propagation of the event, blocking the dispatch to next listeners on the queue.
         * <p><strong>IMPORTANT:</strong> should be called only during signal dispatch, calling it before/after dispatch won't affect signal broadcast.</p>
         * @see Signal.prototype.disable
         */
        halt : function () {
            this._shouldPropagate = false;
        },

        /**
         * Dispatch/Broadcast Signal to all listeners added to the queue.
         * @param {...*} [params] Parameters that should be passed to each handler.
         */
        dispatch : function (params) {
            if (! this.active) {
                return;
            }

            var paramsArr = Array.prototype.slice.call(arguments),
                n = this._bindings.length,
                bindings;

            if (this.memorize) {
                this._prevParams = paramsArr;
            }

            if (! n) {
                //should come after memorize
                return;
            }

            bindings = this._bindings.slice(); //clone array in case add/remove items during dispatch
            this._shouldPropagate = true; //in case `halt` was called before dispatch or during the previous dispatch.

            //execute all callbacks until end of the list or until a callback returns `false` or stops propagation
            //reverse loop since listeners with higher priority will be added at the end of the list
            do { n--; } while (bindings[n] && this._shouldPropagate && bindings[n].execute(paramsArr) !== false);
        },

        /**
         * Forget memorized arguments.
         * @see Signal.memorize
         */
        forget : function(){
            this._prevParams = null;
        },

        /**
         * Remove all bindings from signal and destroy any reference to external objects (destroy Signal object).
         * <p><strong>IMPORTANT:</strong> calling any method on the signal instance after calling dispose will throw errors.</p>
         */
        dispose : function () {
            this.removeAll();
            delete this._bindings;
            delete this._prevParams;
        },

        /**
         * @return {string} String representation of the object.
         */
        toString : function () {
            return '[Signal active:'+ this.active +' numListeners:'+ this.getNumListeners() +']';
        }

    };


    // Namespace -----------------------------------------------------
    //================================================================

    /**
     * Signals namespace
     * @namespace
     * @name signals
     */
    var signals = Signal;

    /**
     * Custom event broadcaster
     * @see Signal
     */
    // alias for backwards compatibility (see #gh-44)
    signals.Signal = Signal;



    //exports to multiple environments
    if(typeof define === 'function' && define.amd){ //AMD
        define(function () { return signals; });
    } else if (typeof module !== 'undefined' && module.exports){ //node
        module.exports = signals;
    } else { //browser
        //use string because of Google closure compiler ADVANCED_MODE
        /*jslint sub:true */
        global['signals'] = signals;
    }

}(this));

},{}],2:[function(_dereq_,module,exports){
'use strict';

function BufferSource(buffer, context) {
    this.add(buffer);
    this.id = '';
    this._context = context;
    this._endedCallback = null;
    this._loop = false;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = false;
    this._sourceNode = null; // BufferSourceNode
    this._startedAt = 0;
}

BufferSource.prototype.add = function(buffer) {
    this._buffer = buffer; // ArrayBuffer
    return this._buffer;
};

/*
 * Controls
 */

BufferSource.prototype.play = function(delay, offset) {
    if(delay === undefined) { delay = 0; }
    if(delay > 0) { delay = this._context.currentTime + delay; }

    if(offset === undefined) { offset = 0; }
    if(this._pausedAt > 0) { offset = offset + this._pausedAt; }

    this.sourceNode.loop = this._loop;
    this.sourceNode.onended = this._endedHandler.bind(this);
    this.sourceNode.start(delay, offset);

    if(this._pausedAt) {
        this._startedAt = this._context.currentTime - this._pausedAt;
    }
    else {
        this._startedAt = this._context.currentTime - offset;
    }

    this._pausedAt = 0;

    this._playing = true;
    this._paused = false;
};

BufferSource.prototype.pause = function() {
    var elapsed = this._context.currentTime - this._startedAt;
    this.stop();
    this._pausedAt = elapsed;
    this._playing = false;
    this._paused = true;
};

BufferSource.prototype.stop = function() {
    if(this._sourceNode) {
        this._sourceNode.onended = null;
        try {
            this._sourceNode.stop(0);
        } catch(e) {}
        this._sourceNode = null;
    }
    this._startedAt = 0;
    this._pausedAt = 0;
    this._playing = false;
    this._paused = false;
};

/*
 * Ended handler
 */

BufferSource.prototype.onEnded = function(fn, context) {
    this._endedCallback = fn ? fn.bind(context || this) : null;
};

BufferSource.prototype._endedHandler = function() {
    this.stop();
    if(typeof this._endedCallback === 'function') {
        this._endedCallback(this);
    }
};

/*
 * Getters & Setters
 */

Object.defineProperty(BufferSource.prototype, 'currentTime', {
    get: function() {
        if(this._pausedAt) {
            return this._pausedAt;
        }
        if(this._startedAt) {
            return this._context.currentTime - this._startedAt;
        }
        return 0;
    }
});

Object.defineProperty(BufferSource.prototype, 'duration', {
    get: function() {
        return this._buffer ? this._buffer.duration : 0;
    }
});

Object.defineProperty(BufferSource.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = !!value;
    }
});

Object.defineProperty(BufferSource.prototype, 'paused', {
    get: function() {
        return this._paused;
    }
});

Object.defineProperty(BufferSource.prototype, 'playing', {
    get: function() {
        return this._playing;
    }
});

Object.defineProperty(BufferSource.prototype, 'progress', {
  get: function() {
    return Math.min(this.currentTime / this.duration, 1);
  }
});

Object.defineProperty(BufferSource.prototype, 'sourceNode', {
    get: function() {
        if(!this._sourceNode) {
            this._sourceNode = this._context.createBufferSource();
            this._sourceNode.buffer = this._buffer;
        }
        return this._sourceNode;
    }
});


/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = BufferSource;
}

},{}],3:[function(_dereq_,module,exports){
'use strict';

var signals = _dereq_('signals');

function Loader() {
    this.onChildComplete = new signals.Signal();
    this.onComplete = new signals.Signal();
    this.onProgress = new signals.Signal();
    this.onError = new signals.Signal();

    this.crossOrigin = false;
    this.loaded = false;
    this.loaders = {};
    this.loading = false;
    this.numLoaded = 0;
    this.numTotal = 0;
    this.queue = [];
    this.touchLocked = false;
    this.webAudioContext = null;
}

Loader.prototype.add = function(url) {
    var loader = new Loader.File(url);
    loader.webAudioContext = this.webAudioContext;
    loader.crossOrigin = this.crossOrigin;
    loader.touchLocked = this.touchLocked;
    this.queue.push(loader);
    this.loaders[loader.url] = loader;
    this.numTotal++;
    return loader;
};

Loader.prototype.start = function() {
    this.numTotal = this.queue.length;
    if(!this.loading) {
        this.loading = true;
        this.next();
    }
};

Loader.prototype.next = function() {
    if(this.queue.length === 0) {
        this.loaded = true;
        this.loading = false;
        this.onComplete.dispatch(this.loaders);
        return;
    }
    var loader = this.queue.pop();
    var self = this;
    var progressHandler = function(progress) {
        var numLoaded = self.numLoaded + progress;
        if(self.onProgress.getNumListeners() > 0) {
            self.onProgress.dispatch(numLoaded/self.numTotal);
        }
    };
    loader.onProgress.add(progressHandler);
    var completeHandler = function(){
        loader.onProgress.remove(progressHandler);
        self.numLoaded++;
        if(self.onProgress.getNumListeners() > 0) {
            self.onProgress.dispatch(self.numLoaded/self.numTotal);
        }
        self.onChildComplete.dispatch(loader);
        self.next();
    };
    loader.onBeforeComplete.addOnce(completeHandler);
    var errorHandler = function(){
        self.onError.dispatch(loader);
        self.next();
    };
    loader.onError.addOnce(errorHandler);
    loader.start();
};

/*Loader.prototype.addMultiple = function(array) {
    for (var i = 0; i < array.length; i++) {
        this.add(array[i]);
    }
};

Loader.prototype.get = function(url) {
    return this.loaders[url];
};*/

Loader.File = function(url) {
    this.url = url;

    this.onProgress = new signals.Signal();
    this.onBeforeComplete = new signals.Signal();
    this.onComplete = new signals.Signal();
    this.onError = new signals.Signal();

    this.webAudioContext = null;
    this.crossOrigin = false;
    this.touchLocked = false;
    this.progress = 0;
};

Loader.File.prototype.start = function() {
    if(this.webAudioContext) {
        this.loadArrayBuffer(this.webAudioContext);
    } else {
        this.loadAudioElement(this.touchLocked);
    }
};

Loader.File.prototype.loadArrayBuffer = function(webAudioContext) {
    var request = new XMLHttpRequest();
    request.open('GET', this.url, true);
    request.responseType = 'arraybuffer';
    var self = this;
    request.onprogress = function(event) {
        if (event.lengthComputable) {
            self.progress = event.loaded / event.total;
            self.onProgress.dispatch(self.progress);
        }
    };
    request.onload = function() {
        webAudioContext.decodeAudioData(request.response, function(buffer) {
            self.data = buffer;
            self.progress = 1;
            self.onProgress.dispatch(1);
            self.onBeforeComplete.dispatch(buffer);
            self.onComplete.dispatch(buffer);
        }, function() {
            self.onError.dispatch();
        });
    };
    request.onerror = function(e) {
        self.onError.dispatch(e);
    };
    request.send();
    this.request = request;
};

Loader.File.prototype.loadAudioElement = function(touchLocked) {
    var request = new Audio();
    this.data = request;
    request.name = this.url;
    request.preload = 'auto';
    var self = this;
    request.src = this.url;
    if (!!touchLocked) {
        this.onProgress.dispatch(1);
        this.onComplete.dispatch(this.data);
    }
    else {
        var ready = function(){
            request.removeEventListener('canplaythrough', ready);
            clearTimeout(timeout);
            self.progress = 1;
            self.onProgress.dispatch(1);
            self.onBeforeComplete.dispatch(self.data);
            self.onComplete.dispatch(self.data);
        };
        // timeout because sometimes canplaythrough doesn't fire
        var timeout = setTimeout(ready, 2000);
        request.addEventListener('canplaythrough', ready, false);
        request.onerror = function() {
            clearTimeout(timeout);
            self.onError.dispatch();
        };
        request.load();
    }
};

Loader.File.prototype.cancel = function() {
  if(this.request && this.request.readyState !== 4) {
      this.request.abort();
  }
};

module.exports = Loader;

},{"signals":1}],4:[function(_dereq_,module,exports){
'use strict';

function MediaSource(el, context) {
    this.add(el);
    this.id = '';
    this._context = context;
    this._endedCallback = null;
    this._endedHandlerBound = this._endedHandler.bind(this);
    this._loop = false;
    this._paused = false;
    this._playing = false;
    this._sourceNode = null; // MediaElementSourceNode
}

MediaSource.prototype.add = function(el) {
    this._el = el; // HTMLMediaElement
    return this._el;
};

/*
 * Controls
 */

MediaSource.prototype.play = function(delay, offset) {
    clearTimeout(this._delayTimeout);

    this.volume = this._volume;

    if(offset) {
        this._el.currentTime = offset;
    }

    if(delay) {
        this._delayTimeout = setTimeout(this.play.bind(this), delay);
    }
    else {
        this._el.play();
    }

    this._playing = true;
    this._paused = false;

    this._el.removeEventListener('ended', this._endedHandlerBound);
    this._el.addEventListener('ended', this._endedHandlerBound, false);
};

MediaSource.prototype.pause = function() {
    clearTimeout(this._delayTimeout);

    if(!this._el) { return; }

    this._el.pause();
    this._playing = false;
    this._paused = true;
};

MediaSource.prototype.stop = function() {
    clearTimeout(this._delayTimeout);

    if(!this._el) { return; }

    this._el.pause();

    try {
        this._el.currentTime = 0;
        // fixes bug where server doesn't support seek:
        if(this._el.currentTime > 0) { this._el.load(); }    
    } catch(e) {}

    this._playing = false;
    this._paused = false;
};

/*
 * Ended handler
 */

MediaSource.prototype.onEnded = function(fn, context) {
    this._endedCallback = fn ? fn.bind(context || this) : null;
};

MediaSource.prototype._endedHandler = function() {
    this._playing = false;
    this._paused = false;

    if(this._loop) {
        this._el.currentTime = 0;
        // fixes bug where server doesn't support seek:
        if(this._el.currentTime > 0) { this._el.load(); }
        this.play();
    } else if(typeof this._endedCallback === 'function') {
        this._endedCallback(this);
    }
};

/*
 * Getters & Setters
 */

Object.defineProperty(MediaSource.prototype, 'currentTime', {
    get: function() {
        return this._el ? this._el.currentTime : 0;
    }
});

Object.defineProperty(MediaSource.prototype, 'duration', {
    get: function() {
        return this._el ? this._el.duration : 0;
    }
});

Object.defineProperty(MediaSource.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = value;
    }
});

Object.defineProperty(MediaSource.prototype, 'paused', {
    get: function() {
        return this._paused;
    }
});

Object.defineProperty(MediaSource.prototype, 'playing', {
    get: function() {
        return this._playing;
    }
});

Object.defineProperty(MediaSource.prototype, 'progress', {
    get: function() {
        return this.currentTime / this.duration;
    }
});

Object.defineProperty(MediaSource.prototype, 'sourceNode', {
    get: function() {
        if(!this._sourceNode && this._context) {
            this._sourceNode = this._context.createMediaElementSource(this._el);
        }
        return this._sourceNode;
    }
});

if (typeof module === 'object' && module.exports) {
    module.exports = MediaSource;
}

},{}],5:[function(_dereq_,module,exports){
'use strict';

function MicrophoneSource(stream, context) {
    this.id = '';
    this._context = context;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = false;
    this._sourceNode = null; // MicrophoneSourceNode
    this._startedAt = 0;
    this._stream = stream;
}

/*
 * Controls
 */

MicrophoneSource.prototype.play = function(delay) {
    if(delay === undefined) { delay = 0; }
    if(delay > 0) { delay = this._context.currentTime + delay; }

    this.sourceNode.start(delay);

    if(this._pausedAt) {
        this._startedAt = this._context.currentTime - this._pausedAt;
    }
    else {
        this._startedAt = this._context.currentTime;
    }

    this._pausedAt = 0;

    this._playing = true;
    this._paused = false;
};

MicrophoneSource.prototype.pause = function() {
    var elapsed = this._context.currentTime - this._startedAt;
    this.stop();
    this._pausedAt = elapsed;
    this._playing = false;
    this._paused = true;
};

MicrophoneSource.prototype.stop = function() {
    if(this._sourceNode) {
        try {
            this._sourceNode.stop(0);
        } catch(e) {}
        this._sourceNode = null;
    }
    this._startedAt = 0;
    this._pausedAt = 0;
    this._playing = false;
    this._paused = false;
};

/*
 * Getters & Setters
 */

Object.defineProperty(MicrophoneSource.prototype, 'type', {
    get: function() {
        return this._type;
    },
    set: function(value) {
        this._type = value;
        if(this._sourceNode) {
            this._sourceNode.type = value;
        }
    }
});

Object.defineProperty(MicrophoneSource.prototype, 'frequency', {
    get: function() {
        return this._frequency;
    },
    set: function(value) {
        this._frequency = value;
        if(this._sourceNode) {
            this._sourceNode.frequency.value = value;
        }
    }
});

Object.defineProperty(MicrophoneSource.prototype, 'currentTime', {
    get: function() {
        if(this._pausedAt) {
            return this._pausedAt;
        }
        if(this._startedAt) {
            return this._context.currentTime - this._startedAt;
        }
        return 0;
    }
});

Object.defineProperty(MicrophoneSource.prototype, 'duration', {
    get: function() {
        return 0;
    }
});

Object.defineProperty(MicrophoneSource.prototype, 'paused', {
    get: function() {
        return this._paused;
    }
});

Object.defineProperty(MicrophoneSource.prototype, 'playing', {
    get: function() {
        return this._playing;
    }
});

Object.defineProperty(MicrophoneSource.prototype, 'progress', {
  get: function() {
    return 0;
  }
});

Object.defineProperty(MicrophoneSource.prototype, 'sourceNode', {
    get: function() {
        if(!this._sourceNode) {
            this._sourceNode = this._context.createMediaStreamSource(this._stream);
            // HACK: stops moz garbage collection killing the stream
            // see https://support.mozilla.org/en-US/questions/984179
            if(navigator.mozGetUserMedia) {
                window.mozHack = this._sourceNode;
            }
        }
        return this._sourceNode;
    }
});


/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = MicrophoneSource;
}

},{}],6:[function(_dereq_,module,exports){
'use strict';

function NodeManager(context) {
    this._context = context || this.createFakeContext();
    this._destination = null;
    this._nodeList = [];
    this._sourceNode = null;
}

NodeManager.prototype.setSource = function(node) {
    this._sourceNode = node;
    this._updateConnections();
    return node;
};

NodeManager.prototype.setDestination = function(node) {
    this.connectTo(node);
    return node;
};

NodeManager.prototype.add = function(node) {
    this._nodeList.push(node);
    this._updateConnections();
    return node;
};

NodeManager.prototype.remove = function(node) {
    var l = this._nodeList.length;
    for (var i = 0; i < l; i++) {
        if(node === this._nodeList[i]) {
            this._nodeList.splice(i, 1);
        }
    }
    node.disconnect();
    this._updateConnections();
    return node;
};

NodeManager.prototype.removeAll = function() {
    while(this._nodeList.length) {
        this._nodeList.pop().disconnect();
    }
    this._updateConnections();
    return this;
};

NodeManager.prototype.connectTo = function(node) {
    var l = this._nodeList.length;
    if(l > 0) {
        //console.log('connect:', this._nodeList[l - 1], 'to', node);
        this._nodeList[l - 1].disconnect();
        this._nodeList[l - 1].connect(node);
    }
    else if(this._sourceNode) {
        //console.log(' x connect source to node:', node);
        this._sourceNode.disconnect();
        this._sourceNode.connect(node);
    }
    this._destination = node;
};

NodeManager.prototype._updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    //console.log('_updateConnections');
    var l = this._nodeList.length;
    for (var i = 0; i < l; i++) {
        if(i === 0) {
            //console.log(' - connect source to node:', this._nodeList[i]);
            this._sourceNode.disconnect();
            this._sourceNode.connect(this._nodeList[i]);
        }
        else {
            //console.log('connect:', this._nodeList[i-1], 'to', this._nodeList[i]);
            this._nodeList[i-1].disconnect();
            this._nodeList[i-1].connect(this._nodeList[i]);
        }
    }
    //console.log(this._destination)
    if(this._destination) {
        this.connectTo(this._destination);
    }
    /*else {
        this.connectTo(this._gain);
    }*/
};

// or setter for destination?
/*NodeManager.prototype.connectTo = function(node) {
    var l = this._nodeList.length;
    if(l > 0) {
      console.log('connect:', this._nodeList[l - 1], 'to', node);
        this._nodeList[l - 1].disconnect();
        this._nodeList[l - 1].connect(node);
    }
    else {
        console.log(' x connect source to node:', node);
        this._gain.disconnect();
        this._gain.connect(node);
    }
    this._destination = node;
};*/

// should source be item 0 in nodelist and desination last
// prob is addNode needs to add before destination
// + should it be called chain or something nicer?
// feels like node list could be a linked list??
// if list.last is destination addbefore

/*NodeManager.prototype._updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    var l = this._nodeList.length;
    for (var i = 1; i < l; i++) {
      this._nodeList[i-1].connect(this._nodeList[i]);
    }
};*/
/*NodeManager.prototype._updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    console.log('_updateConnections');
    this._sourceNode.disconnect();
    this._sourceNode.connect(this._gain);
    var l = this._nodeList.length;

    for (var i = 0; i < l; i++) {
        if(i === 0) {
            console.log(' - connect source to node:', this._nodeList[i]);
            this._gain.disconnect();
            this._gain.connect(this._nodeList[i]);
        }
        else {
            console.log('connect:', this._nodeList[i-1], 'to', this._nodeList[i]);
            this._nodeList[i-1].disconnect();
            this._nodeList[i-1].connect(this._nodeList[i]);
        }
    }
    this.connectTo(this._context.destination);
};*/

NodeManager.prototype.analyser = function(fftSize) {
    fftSize = fftSize || 1024;
    var node = this._context.createAnalyser();
    node.smoothingTimeConstant = 0.85;
    // resolution fftSize: 32 - 2048 (pow 2)
    // frequencyBinCount will be half this value
    node.fftSize = fftSize;
    //node.minDecibels = -100;
    //node.maxDecibels = -30;
    return this.add(node);
};

NodeManager.prototype.compressor = function() {
    // lowers the volume of the loudest parts of the signal and raises the volume of the softest parts
    var node = this._context.createDynamicsCompressor();
    // min decibels to start compressing at from -100 to 0
    node.threshold.value = -24;
    // decibel value to start curve to compressed value from 0 to 40
    node.knee.value = 30;
    // amount of change per decibel from 1 to 20
    node.ratio.value = 12;
    // gain reduction currently applied by compressor from -20 to 0
    // node.reduction.value
    // seconds to reduce gain by 10db from 0 to 1 - how quickly signal adapted when volume increased
    node.attack.value = 0.0003;
    // seconds to increase gain by 10db from 0 to 1 - how quickly signal adapted when volume redcuced
    node.release.value = 0.25;
    return this.add(node);
};

NodeManager.prototype.convolver = function(impulseResponse) {
    // impulseResponse is an audio file buffer
    var node = this._context.createConvolver();
    node.buffer = impulseResponse;
    return this.add(node);
};

NodeManager.prototype.delay = function(input, time, gain) {
    var delayNode = this._context.createDelay();
    var gainNode = this._context.createGain();
    gainNode.gain.value = gain || 0.5;
    if(time !== undefined) {
        delayNode.delayTime.value = time;
    }
    delayNode.connect(gainNode);
    if(input) {
        input.connect(delayNode);
        gainNode.connect(input);
    }
    return delayNode;
    // ?
    /*return {
      delayNode: delayNode,
      gainNode: gainNode
    };*/
};

NodeManager.prototype.distortion = function() {
    var node = this._context.createWaveShaper();
    // Float32Array defining curve (values are interpolated)
    //node.curve
    // up-sample before applying curve for better resolution result 'none', '2x' or '4x'
    //node.oversample = '2x';
    return this.add(node);
};

NodeManager.prototype.filter = function(type, frequency) {
    var node = this._context.createBiquadFilter();
    node.type = type;
    if(frequency !== undefined) {
        node.frequency.value = frequency;
    }
    return this.add(node);
};

NodeManager.prototype.lowpass = function(frequency) {
    return this.filter('lowpass', frequency);
};
NodeManager.prototype.highpass = function(frequency) {
    return this.filter('highpass', frequency);
};
NodeManager.prototype.bandpass = function(frequency) {
    return this.filter('bandpass', frequency);
};
NodeManager.prototype.lowshelf = function(frequency) {
    return this.filter('lowshelf', frequency);
};
NodeManager.prototype.highshelf = function(frequency) {
    return this.filter('highshelf', frequency);
};
NodeManager.prototype.peaking = function(frequency) {
    return this.filter('peaking', frequency);
};
NodeManager.prototype.notch = function(frequency) {
    return this.filter('notch', frequency);
};
NodeManager.prototype.allpass = function(frequency) {
    return this.filter('allpass', frequency);
};

NodeManager.prototype.gain = function(value) {
    var node = this._context.createGain();
    if(value !== undefined) {
        node.gain.value = value;
    }
    return node;
};

NodeManager.prototype.panner = function() {
    var node = this._context.createPanner();
    // Default for stereo is HRTF
    node.panningModel = 'HRTF'; // 'equalpower'

    // Distance model and attributes
    node.distanceModel = 'linear'; // 'linear' 'inverse' 'exponential'
    node.refDistance = 1;
    node.maxDistance = 1000;
    node.rolloffFactor = 1;

    // Uses a 3D cartesian coordinate system
    // node.setPosition(0, 0, 0);
    // node.setOrientation(1, 0, 0);
    // node.setVelocity(0, 0, 0);

    // Directional sound cone - The cone angles are in degrees and run from 0 to 360
    // node.coneInnerAngle = 360;
    // node.coneOuterAngle = 360;
    // node.coneOuterGain = 0;

    // normalised vec
    // node.setOrientation(vec.x, vec.y, vec.z);
    return this.add(node);
};

NodeManager.prototype.reverb = function(seconds, decay, reverse, node) {
    // TODO: should prob be moved to utils:
    seconds = seconds || 1;
    decay = decay || 5;
    reverse = !!reverse;

    var numChannels = 2,
        rate = this._context.sampleRate,
        length = rate * seconds,
        impulseResponse = this._context.createBuffer(numChannels, length, rate),
        left = impulseResponse.getChannelData(0),
        right = impulseResponse.getChannelData(1),
        n;

    for (var i = 0; i < length; i++) {
        n = reverse ? length - 1 : i;
        left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    }
    if(node) {
        node.buffer = impulseResponse;
    }
    else {
        return this.convolver(impulseResponse);
    }
    return node;
};

NodeManager.prototype.scriptProcessor = function(bufferSize, inputChannels, outputChannels, callback, callbackContext) {
    // bufferSize 256 - 16384 (pow 2)
    bufferSize = bufferSize || 1024;
    inputChannels = inputChannels === undefined ? 0 : inputChannels;
    outputChannels = outputChannels === undefined ? 1 : outputChannels;
    var node = this._context.createScriptProcessor(bufferSize, inputChannels, outputChannels);
    //node.onaudioprocess = callback.bind(callbackContext|| node);
    node.onaudioprocess = function (event) {
        // available props:
        /*
        event.inputBuffer
        event.outputBuffer
        event.playbackTime
        */
        // Example: generate noise
        /*
        var output = event.outputBuffer.getChannelData(0);
        var l = output.length;
        for (var i = 0; i < l; i++) {
            output[i] = Math.random();
        }
        */
        callback.call(callbackContext || this, event);
    };
    return this.add(node);
};

NodeManager.prototype.createFakeContext = function() {
    var fn = function(){};
    var param = { value: 1 };
    var fakeNode = {
        connect:fn,
        disconnect:fn,
        // gain
        gain:{value: 1},
        // panner
        panningModel: 0,
        setPosition: fn,
        setOrientation: fn,
        setVelocity: fn,
        distanceModel: 0,
        refDistance: 0,
        maxDistance: 0,
        rolloffFactor: 0,
        coneInnerAngle: 360,
        coneOuterAngle: 360,
        coneOuterGain: 0,
        // filter:
        type:0,
        frequency: param,
        // delay
        delayTime: param,
        // convolver
        buffer: 0,
        // analyser
        smoothingTimeConstant: 0,
        fftSize: 0,
        minDecibels: 0,
        maxDecibels: 0,
        // compressor
        threshold: param,
        knee: param,
        ratio: param,
        attack: param,
        release: param,
        // distortion
        oversample: 0,
        curve: 0
    };
    var returnFakeNode = function(){ return fakeNode; };
    return {
        createAnalyser: returnFakeNode,
        createBiquadFilter: returnFakeNode,
        createDynamicsCompressor: returnFakeNode,
        createConvolver: returnFakeNode,
        createDelay: returnFakeNode,
        createGain: function() {
            return {gain:{value: 1}, connect:fn, disconnect:fn};
        },
        createPanner: returnFakeNode,
        createScriptProcessor: returnFakeNode,
        createWaveShaper: returnFakeNode
    };
};

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = NodeManager;
}

},{}],7:[function(_dereq_,module,exports){
'use strict';

function OscillatorSource(type, context) {
    this.id = '';
    this._context = context;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = false;
    this._sourceNode = null; // OscillatorSourceNode
    this._startedAt = 0;
    this._type = type;
    this._frequency = 200;
}

/*
 * Controls
 */

OscillatorSource.prototype.play = function(delay) {
    if(delay === undefined) { delay = 0; }
    if(delay > 0) { delay = this._context.currentTime + delay; }

    this.sourceNode.start(delay);

    if(this._pausedAt) {
        this._startedAt = this._context.currentTime - this._pausedAt;
    }
    else {
        this._startedAt = this._context.currentTime;
    }

    this._pausedAt = 0;

    this._playing = true;
    this._paused = false;
};

OscillatorSource.prototype.pause = function() {
    var elapsed = this._context.currentTime - this._startedAt;
    this.stop();
    this._pausedAt = elapsed;
    this._playing = false;
    this._paused = true;
};

OscillatorSource.prototype.stop = function() {
    if(this._sourceNode) {
        try {
            this._sourceNode.stop(0);
        } catch(e) {}
        this._sourceNode = null;
    }
    this._startedAt = 0;
    this._pausedAt = 0;
    this._playing = false;
    this._paused = false;
};

/*
 * Getters & Setters
 */

Object.defineProperty(OscillatorSource.prototype, 'type', {
    get: function() {
        return this._type;
    },
    set: function(value) {
        this._type = value;
        if(this._sourceNode) {
            this._sourceNode.type = value;
        }
    }
});

Object.defineProperty(OscillatorSource.prototype, 'frequency', {
    get: function() {
        return this._frequency;
    },
    set: function(value) {
        this._frequency = value;
        if(this._sourceNode) {
            this._sourceNode.frequency.value = value;
        }
    }
});

Object.defineProperty(OscillatorSource.prototype, 'currentTime', {
    get: function() {
        if(this._pausedAt) {
            return this._pausedAt;
        }
        if(this._startedAt) {
            return this._context.currentTime - this._startedAt;
        }
        return 0;
    }
});

Object.defineProperty(OscillatorSource.prototype, 'duration', {
    get: function() {
        return 0;
    }
});

Object.defineProperty(OscillatorSource.prototype, 'paused', {
    get: function() {
        return this._paused;
    }
});

Object.defineProperty(OscillatorSource.prototype, 'playing', {
    get: function() {
        return this._playing;
    }
});

Object.defineProperty(OscillatorSource.prototype, 'progress', {
  get: function() {
    return 0;
  }
});

Object.defineProperty(OscillatorSource.prototype, 'sourceNode', {
    get: function() {
        if(!this._sourceNode) {
            this._sourceNode = this._context.createOscillator();
            this._sourceNode.type = this._type;
            this._sourceNode.frequency.value = this._frequency;
        }
        return this._sourceNode;
    }
});


/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = OscillatorSource;
}

},{}],8:[function(_dereq_,module,exports){
'use strict';

function ScriptSource(data, context) {
    this.id = '';
    this._context = context;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = false;
    this._sourceNode = null; // ScriptSourceNode
    this._startedAt = 0;

    this._bufferSize = data.bufferSize || 1024;
    this._channels = data.channels || 1;
    this._onProcess = data.callback.bind(data.thisArg || this);
}

/*
 * Controls
 */

ScriptSource.prototype.play = function(delay) {
    if(delay === undefined) { delay = 0; }
    if(delay > 0) { delay = this._context.currentTime + delay; }

    this.sourceNode.onaudioprocess = this._onProcess;
    //this.sourceNode.start(delay);

    if(this._pausedAt) {
        this._startedAt = this._context.currentTime - this._pausedAt;
    }
    else {
        this._startedAt = this._context.currentTime;
    }

    this._pausedAt = 0;

    this._playing = true;
    this._paused = false;
};

ScriptSource.prototype.pause = function() {
    var elapsed = this._context.currentTime - this._startedAt;
    this.stop();
    this._pausedAt = elapsed;
    this._playing = false;
    this._paused = true;
};

ScriptSource.prototype.stop = function() {
    if(this._sourceNode) {
        this._sourceNode.onaudioprocess = this._onPaused;
        /*try {
            this._sourceNode.stop(0);
        } catch(e) {
            console.log(e);
        }
        this._sourceNode = null;*/
    }
    this._startedAt = 0;
    this._pausedAt = 0;
    this._playing = false;
    this._paused = false;
};

ScriptSource.prototype._onPaused = function(event) {
    var buffer = event.outputBuffer;
    for (var i = 0, l = buffer.numberOfChannels; i < l; i++) {
        var channel = buffer.getChannelData(i);
        for (var j = 0, len = channel.length; j < len; j++) {
            channel[j] = 0;
        }
    }
};

/*
 * Getters & Setters
 */

Object.defineProperty(ScriptSource.prototype, 'type', {
    get: function() {
        return this._type;
    },
    set: function(value) {
        this._type = value;
        if(this._sourceNode) {
            this._sourceNode.type = value;
        }
    }
});

Object.defineProperty(ScriptSource.prototype, 'frequency', {
    get: function() {
        return this._frequency;
    },
    set: function(value) {
        this._frequency = value;
        if(this._sourceNode) {
            this._sourceNode.frequency.value = value;
        }
    }
});

Object.defineProperty(ScriptSource.prototype, 'currentTime', {
    get: function() {
        if(this._pausedAt) {
            return this._pausedAt;
        }
        if(this._startedAt) {
            return this._context.currentTime - this._startedAt;
        }
        return 0;
    }
});

Object.defineProperty(ScriptSource.prototype, 'duration', {
    get: function() {
        return 0;
    }
});

Object.defineProperty(ScriptSource.prototype, 'paused', {
    get: function() {
        return this._paused;
    }
});

Object.defineProperty(ScriptSource.prototype, 'playing', {
    get: function() {
        return this._playing;
    }
});

Object.defineProperty(ScriptSource.prototype, 'progress', {
  get: function() {
    return 0;
  }
});

Object.defineProperty(ScriptSource.prototype, 'sourceNode', {
    get: function() {
        if(!this._sourceNode) {
            this._sourceNode = this._context.createScriptProcessor(this._bufferSize, 0, this._channels);
        }
        return this._sourceNode;
    }
});


/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = ScriptSource;
}

},{}],9:[function(_dereq_,module,exports){
'use strict';

var BufferSource = _dereq_('./buffer-source.js'),
    MediaSource = _dereq_('./media-source.js'),
    NodeManager = _dereq_('./node-manager.js'),
    MicrophoneSource = _dereq_('./microphone-source.js'),
    OscillatorSource = _dereq_('./oscillator-source.js'),
    ScriptSource = _dereq_('./script-source.js'),
    Utils = _dereq_('./utils.js');

function Sound(context, data, destination) {
    this.id = '';
    this._context = context;
    this._data = null;
    this._endedCallback = null;
    this._loop = false;
    this._pausedAt = 0;
    this._playWhenReady = false;
    this._source = null;
    this._startedAt = 0;

    this._node = new NodeManager(this._context);
    this._gain = this._node.gain();
    if(this._context) {
        this._node.setDestination(this._gain);
        this._gain.connect(destination || this._context.destination);
    }

    this._utils = new Utils(this._context);

    this.setData(data);
}

Sound.prototype.setData = function(data) {
    if(!data) { return this; }
    this._data = data; // AudioBuffer, MediaElement, etc

    if(this._utils.isAudioBuffer(data)) {
        this._source = new BufferSource(data, this._context);
    }
    else if(this._utils.isMediaElement(data)) {
        this._source = new MediaSource(data, this._context);
    }
    else if(this._utils.isMediaStream(data)) {
        this._source = new MicrophoneSource(data, this._context);
    }
    else if(this._utils.isOscillatorType(data)) {
        this._source = new OscillatorSource(data, this._context);
    }
    else if(this._utils.isScriptConfig(data)) {
        this._source = new ScriptSource(data, this._context);
    }
    else {
        throw new Error('Cannot detect data type: ' + data);
    }

    this._node.setSource(this._source.sourceNode);

    if(typeof this._source.onEnded === 'function') {
        this._source.onEnded(this._endedHandler, this);
    }

    // should this take account of delay and offset?
    if(this._playWhenReady) {
        this.play();
    }
    return this;
};

/*
 * Controls
 */

Sound.prototype.play = function(delay, offset) {
    if(!this._source) {
        this._playWhenReady = true;
        return this;
    }
    this._node.setSource(this._source.sourceNode);
    this._source.loop = this._loop;

    // update volume needed for no webaudio
    if(!this._context) { this.volume = this.volume; }

    this._source.play(delay, offset);

    return this;
};

Sound.prototype.pause = function() {
    if(!this._source) { return this; }
    this._source.pause();
    return this;  
};

Sound.prototype.stop = function() {
    if(!this._source) { return this; }
    this._source.stop();
    return this;
};

Sound.prototype.seek = function(percent) {
    if(!this._source) { return this; }
    this.stop();
    this.play(0, this._source.duration * percent);
    return this;
};

/*
 * Ended handler
 */

Sound.prototype.onEnded = function(fn, context) {
    this._endedCallback = fn ? fn.bind(context || this) : null;
    return this;
};

Sound.prototype._endedHandler = function() {
    if(typeof this._endedCallback === 'function') {
        this._endedCallback(this);
    }
};

/*
 * Getters & Setters
 */

Object.defineProperty(Sound.prototype, 'context', {
    get: function() {
        return this._context;
    }
});

Object.defineProperty(Sound.prototype, 'currentTime', {
    get: function() {
        return this._source ? this._source.currentTime : 0;
    }
});

Object.defineProperty(Sound.prototype, 'data', {
    get: function() {
        return this._data;
    }
});

Object.defineProperty(Sound.prototype, 'duration', {
    get: function() {
        return this._source ? this._source.duration : 0;
    }
});

Object.defineProperty(Sound.prototype, 'gain', {
    get: function() {
        return this._gain;
    }
});

Object.defineProperty(Sound.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = !!value;
        if(this._source) {
          this._source.loop = this._loop;
        }
    }
});

Object.defineProperty(Sound.prototype, 'node', {
    get: function() {
        return this._node;
    }
});

Object.defineProperty(Sound.prototype, 'paused', {
    get: function() {
        return this._source ? this._source.paused : false;
    }
});

Object.defineProperty(Sound.prototype, 'playing', {
    get: function() {
        return this._source ? this._source.playing : false;
    }
});

Object.defineProperty(Sound.prototype, 'progress', {
  get: function() {
    return this._source ? this._source.progress : 0;
  }
});

Object.defineProperty(Sound.prototype, 'volume', {
    get: function() {
        return this._gain.gain.value;
    },
    set: function(value) {
        if(isNaN(value)) { return; }

        this._gain.gain.value = value;

        if(this._data && this._data.volume !== undefined) {
            this._data.volume = value;
        }
    }
});

Object.defineProperty(Sound.prototype, 'frequency', {
    get: function() {
        return this._source ? this._source.frequency : 0;
    },
    set: function(value) {
        if(this._source) {
            this._source.frequency = value;
        }
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Sound;
}

},{"./buffer-source.js":2,"./media-source.js":4,"./microphone-source.js":5,"./node-manager.js":6,"./oscillator-source.js":7,"./script-source.js":8,"./utils.js":11}],10:[function(_dereq_,module,exports){
'use strict';

function Support() {
    this._init();
}

Support.prototype._init = function() {
    var el = document.createElement('audio');
    if(!el) { return []; }

    var tests = [
        { ext: 'ogg', type: 'audio/ogg; codecs="vorbis"' },
        { ext: 'mp3', type: 'audio/mpeg;' },
        { ext: 'opus', type: 'audio/ogg; codecs="opus"' },
        { ext: 'wav', type: 'audio/wav; codecs="1"' },
        { ext: 'm4a', type: 'audio/x-m4a;' },
        { ext: 'm4a', type: 'audio/aac;' }
    ];

    this._extensions = [];
    this._canPlay = {};

    for (var i = 0; i < tests.length; i++) {
        var test = tests[i];
        var canPlayType = !!el.canPlayType(test.type);
        if(canPlayType) {
            this._extensions.push(test.ext);
        }
        this._canPlay[test.ext] = canPlayType;
    }
};

Support.prototype.getFileExtension = function(url) {
    url = url.split('?')[0];
    url = url.substr(url.lastIndexOf('/') + 1);

    var a = url.split('.');
    if(a.length === 1 || (a[0] === '' && a.length === 2)) {
        return '';
    }
    return a.pop().toLowerCase();
};

Support.prototype.getSupportedFile = function(fileNames) {
    // if array get the first one that works
    if(fileNames instanceof Array) {
        for (var i = 0; i < fileNames.length; i++) {
            var ext = this.getFileExtension(fileNames[i]);
            var ind = this._extensions.indexOf(ext);
            if(ind > -1) {
                return fileNames[i];
            }
        }
    }
    // if not array and is object
    else if(fileNames instanceof Object) {
        for(var key in fileNames) {
            var extension = this.getFileExtension(fileNames[key]);
            var index = this._extensions.indexOf(extension);
            if(index > -1) {
                return fileNames[key];
            }
        }
    }
    // if string just return
    return fileNames;
};

/*
 * Getters & Setters
 */

Object.defineProperty(Support.prototype, 'extensions', {
    get: function() {
        return this._extensions;
    }
});

Object.defineProperty(Support.prototype, 'canPlay', {
    get: function() {
        return this._canPlay;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Support;
}

},{}],11:[function(_dereq_,module,exports){
'use strict';

function Utils(context) {
    this._context = context;
}

Utils.prototype.isAudioBuffer = function(data) {
    return !!(data &&
              window.AudioBuffer &&
              data instanceof window.AudioBuffer);
};

Utils.prototype.isMediaElement = function(data) {
    return !!(data &&
              window.HTMLMediaElement &&
              data instanceof window.HTMLMediaElement);
};

Utils.prototype.isMediaStream = function(data) {
    return !!(data &&
              typeof data.getAudioTracks === 'function' &&
              data.getAudioTracks().length &&
              window.MediaStreamTrack &&
              data.getAudioTracks()[0] instanceof window.MediaStreamTrack);
};

Utils.prototype.isOscillatorType = function(data) {
    return !!(data && typeof data === 'string' &&
             (data === 'sine' || data === 'square' ||
              data === 'sawtooth' || data === 'triangle'));
};

Utils.prototype.isScriptConfig = function(data) {
    return !!(data && typeof data === 'object' &&
              data.bufferSize && data.channels && data.callback);
};

Utils.prototype.isFile = function(data) {
    return !!(data && (data instanceof Array ||
              (typeof data === 'string' && data.indexOf('.') > -1)));
};

Utils.prototype.fade = function(gainNode, value, duration) {
    gainNode.gain.linearRampToValueAtTime(value, this._context.currentTime + duration);
};

Utils.prototype.filter = function(filterNode, freqPercent, quality, gain) {
    // set filter frequency based on value from 0 to 1
    if(isNaN(freqPercent)) { freqPercent = 0.5; }
    if(isNaN(quality)) { quality = 0; }
    if(isNaN(gain)) { gain = 0; }
    // Get back to the frequency value between min and max.
    filterNode.frequency.value = this.getFrequency(freqPercent);
    filterNode.Q.value = quality; // range of 0.0001 to 1000
    filterNode.gain.value = gain; // -40 to 40
};

Utils.prototype.getFrequency = function(value) {
    // get frequency by passing number from 0 to 1
    // Clamp the frequency between the minimum value (40 Hz) and half of the
    // sampling rate.
    var minValue = 40;
    var maxValue = this._context.sampleRate / 2;
    // Logarithm (base 2) to compute how many octaves fall in the range.
    var numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
    // Compute a multiplier from 0 to 1 based on an exponential scale.
    var multiplier = Math.pow(2, numberOfOctaves * (value - 1.0));
    // Get back to the frequency value between min and max.
    return maxValue * multiplier;
};

Utils.prototype.distort = function(value) {
    // create waveShaper distortion curve from 0 to 1
    var k = value * 100,
        n = 22050,
        curve = new Float32Array(n),
        deg = Math.PI / 180;

    for (var i = 0; i < n; i++) {
        var x = i * 2 / n - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
};

Utils.prototype.timeCode = function(seconds, delim) {
    if(delim === undefined) { delim = ':'; }
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor((seconds % 3600) % 60);
    var hr = (h === 0 ? '' : (h < 10 ? '0' + h + delim : h + delim));
    var mn = (m < 10 ? '0' + m : m) + delim;
    var sc = (s < 10 ? '0' + s : s);
    return hr + mn + sc;
};

Utils.prototype.pan = function(panner) {
    return new Utils.Pan(panner);
};

Utils.prototype.waveform = function(buffer, length) {
    return new Utils.Waveform(buffer, length);
};

/*
 * Pan
 */

Utils.Pan = function(panner) {
    this._panner = panner;
};

Utils.Pan.prototype = {
    // pan left to right with value from -1 to 1
    x: function(value) {
        // x from -Math.PI/4 to Math.PI/4 (-45 to 45 deg)
        var x = parseFloat(value, 10) * Math.PI / 4;
        var z = x + Math.PI / 2;
        if (z > Math.PI / 2) {
            z = Math.PI - z;
        }
        x = Math.sin(x);
        z = Math.sin(z);
        this._panner.setPosition(x, 0, z);
    },
    xyz: function(x, y, z) {
        x = x || 0;
        y = y || 0;
        z = z || 0;
        this._panner.setPosition(x, y, z);
    },
    setSourcePosition: function(positionVec) {
        // set the position of the source (where the audio is coming from)
        this._panner.setPosition(positionVec.x, positionVec.y, positionVec.z);
    },
    setSourceOrientation: function(forwardVec) { // forwardVec = THREE.Vector3
        // set the audio source orientation
        this.setOrientation(this._panner, forwardVec);
    },
    setListenerPosition: function(positionVec) {
        // set the position of the listener (who is hearing the audio)
        this._context.listener.setPosition(positionVec.x, positionVec.y, positionVec.z);
    },
    setListenerOrientation: function(forwardVec) { // forwardVec = THREE.Vector3
        // set the audio context's listener position to match the camera position
        this.setOrientation(this._context.listener, forwardVec);
    },
    doppler: function(x, y, z, deltaX, deltaY, deltaZ, deltaTime) {
        // Tracking the velocity can be done by getting the object's previous position, subtracting
        // it from the current position and dividing the result by the time elapsed since last frame
        this._panner.setPosition(x, y, z);
        this._panner.setVelocity(deltaX/deltaTime, deltaY/deltaTime, deltaZ/deltaTime);
    },
    setOrientation: function(node, forwardVec) {
        // set the orientation of the source (where the audio is coming from)
        //var fw = forwardVec.clone().normalize(); =>
        var fw = { x: forwardVec.x, y: forwardVec.y, z: forwardVec.z };
        this.normalize(fw);
        // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
        var globalUp = { x: 0, y: 1, z: 0 };
        // var up = forwardVec.clone().cross(globalUp).cross(forwardVec).normalize();
        var up = { x: forwardVec.x, y: forwardVec.y, z: forwardVec.z };
        this.crossProduct(up, globalUp);
        this.crossProduct(up, forwardVec);
        this.normalize(up);
        // set the audio context's listener position to match the camera position
        node.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
    },
    crossProduct: function ( a, b ) {
        var ax = a.x, ay = a.y, az = a.z;
        var bx = b.x, by = b.y, bz = b.z;
        a.x = ay * bz - az * by;
        a.y = az * bx - ax * bz;
        a.z = ax * by - ay * bx;
        return this;
    },
    normalize: function (vec3) {
        if(vec3.x === 0 && vec3.y === 0 && vec3.z === 0) {
            return vec3;
        }
        var length = Math.sqrt( vec3.x * vec3.x + vec3.y * vec3.y + vec3.z * vec3.z );
        var invScalar = 1 / length;
        vec3.x *= invScalar;
        vec3.y *= invScalar;
        vec3.z *= invScalar;
        return vec3;
    }
};

/*
 * Waveform
 */

Utils.Waveform = function(buffer, length) {
    this.data = this.getData(buffer, length);
};

Utils.Waveform.prototype = {
    getData: function(buffer, length) {
        console.log('-------------------');
        console.time('waveformData');
        var waveform = new Float32Array(length),
            chunk = Math.floor(buffer.length / length),
            //chunk = buffer.length / length,
            resolution = 5, // 10
            incr = Math.floor(chunk / resolution),
            greatest = 0;

        if(incr < 1) { incr = 1; }

        for (var i = 0, chnls = buffer.numberOfChannels; i < chnls; i++) {
            // check each channel
            var channel = buffer.getChannelData(i);
            //for (var j = length - 1; j >= 0; j--) {
            for (var j = 0; j < length; j++) {
                // get highest value within the chunk
                //var ch = j * chunk;
                //for (var k = ch + chunk - 1; k >= ch; k -= incr) {
                for (var k = j * chunk, l = k + chunk; k < l; k += incr) {
                    // select highest value from channels
                    var a = channel[k];
                    if(a < 0) { a = -a; }
                    if (a > waveform[j]) {
                        waveform[j] = a;
                    }
                    // update highest overall for scaling
                    if(a > greatest) {
                        greatest = a;
                    }
                }
            }
        }
        // scale up?
        var scale = 1 / greatest,
            len = waveform.length;
        for (i = 0; i < len; i++) {
            waveform[i] *= scale;
        }
        console.timeEnd('waveformData');
        return waveform;
    },
    getCanvas: function(height, color, bgColor, canvasEl) {
    //waveform: function(arr, width, height, color, bgColor, canvasEl) {
        //var arr = this.waveformData(buffer, width);
        var canvas = canvasEl || document.createElement('canvas');
        var width = canvas.width = this.data.length;
        canvas.height = height;
        var context = canvas.getContext('2d');
        context.strokeStyle = color;
        context.fillStyle = bgColor;
        context.fillRect(0, 0, width, height);
        var x, y;
        console.time('waveformCanvas');
        context.beginPath();
        for (var i = 0, l = this.data.length; i < l; i++) {
            x = i + 0.5;
            y = height - Math.round(height * this.data[i]);
            context.moveTo(x, y);
            context.lineTo(x, height);
        }
        context.stroke();
        console.timeEnd('waveformCanvas');
        return canvas;
    }
};







/*
function Utils(context) {
    return {
        isAudioBuffer: function(data) {
            return !!(data && window.AudioBuffer && data instanceof window.AudioBuffer);
        },
        isMediaElement: function(data) {
            return !!(data && window.HTMLMediaElement && data instanceof window.HTMLMediaElement);
        },
        fade: function(gainNode, value, duration) {
            gainNode.gain.linearRampToValueAtTime(value, context.currentTime + duration);
        },
        pan: function(panner) {
            return {
                // pan left to right with value from -1 to 1
                x: function(value) {
                    // x from -Math.PI/4 to Math.PI/4 (-45 to 45 deg)
                    var x = parseFloat(value, 10) * Math.PI / 4;
                    var z = x + Math.PI / 2;
                    if (z > Math.PI / 2) {
                        z = Math.PI - z;
                    }
                    x = Math.sin(x);
                    z = Math.sin(z);
                    panner.setPosition(x, 0, z);
                },
                xyz: function(x, y, z) {
                    x = x || 0;
                    y = y || 0;
                    z = z || 0;
                    panner.setPosition(x, y, z);
                },
                setSourcePosition: function(positionVec) {
                    // set the position of the source (where the audio is coming from)
                    panner.setPosition(positionVec.x, positionVec.y, positionVec.z);
                },
                setSourceOrientation: function(forwardVec) { // forwardVec = THREE.Vector3
                    // set the audio source orientation
                    this.setOrientation(panner, forwardVec);
                    // set the orientation of the source (where the audio is coming from)
                    //var fw = forwardVec.clone().normalize(); =>
                    //var fw = { x: forwardVec.x, y: forwardVec.y, z: forwardVec.z };
                    //this.normalize(fw);
                    // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
                    //var globalUp = { x: 0, y: 1, z: 0 };
                    // var up = forwardVec.clone().cross(globalUp).cross(forwardVec).normalize();
                    //var up = { x: forwardVec.x, y: forwardVec.y, z: forwardVec.z };
                    //this.cross(up, globalUp);
                    //this.cross(up, forwardVec);
                    //this.normalize(up);
                    // set the audio context's listener position to match the camera position
                    //panner.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
                },
                setListenerPosition: function(positionVec) {
                    // set the position of the listener (who is hearing the audio)
                    context.listener.setPosition(positionVec.x, positionVec.y, positionVec.z);
                },
                setListenerOrientation: function(forwardVec) { // forwardVec = THREE.Vector3
                    // set the audio context's listener position to match the camera position
                    this.setOrientation(context.listener, forwardVec);
                    // set the orientation of the listener (who is hearing the audio)
                    //var fw = forwardVec.clone().normalize();
                    // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
                    //var globalUp = { x: 0, y: 1, z: 0 };
                    //var up = forwardVec.clone().cross(globalUp).cross(forwardVec).normalize();
                    // set the audio context's listener position to match the camera position
                    //context.listener.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
                },
                doppler: function(x, y, z, deltaX, deltaY, deltaZ, deltaTime) {
                    // Tracking the velocity can be done by getting the object's previous position, subtracting
                    // it from the current position and dividing the result by the time elapsed since last frame
                    panner.setPosition(x, y, z);
                    panner.setVelocity(deltaX/deltaTime, deltaY/deltaTime, deltaZ/deltaTime);
                },
                setOrientation: function(node, forwardVec) {
                    // set the orientation of the source (where the audio is coming from)
                    //var fw = forwardVec.clone().normalize(); =>
                    var fw = { x: forwardVec.x, y: forwardVec.y, z: forwardVec.z };
                    this.normalize(fw);
                    // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
                    var globalUp = { x: 0, y: 1, z: 0 };
                    // var up = forwardVec.clone().cross(globalUp).cross(forwardVec).normalize();
                    var up = { x: forwardVec.x, y: forwardVec.y, z: forwardVec.z };
                    this.crossProduct(up, globalUp);
                    this.crossProduct(up, forwardVec);
                    this.normalize(up);
                    // set the audio context's listener position to match the camera position
                    node.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
                },
                crossProduct: function ( a, b ) {

                    var ax = a.x, ay = a.y, az = a.z;
                    var bx = b.x, by = b.y, bz = b.z;

                    a.x = ay * bz - az * by;
                    a.y = az * bx - ax * bz;
                    a.z = ax * by - ay * bx;

                    return this;

                },
                normalize: function (vec3) {

                    if(vec3.x === 0 && vec3.y === 0 && vec3.z === 0) {
                        return vec3;
                    }

                    var length = Math.sqrt( vec3.x * vec3.x + vec3.y * vec3.y + vec3.z * vec3.z );

                    var invScalar = 1 / length;
                    vec3.x *= invScalar;
                    vec3.y *= invScalar;
                    vec3.z *= invScalar;

                    return vec3;

                }
            };
        },
        filter: function(filterNode, value, quality, gain) {
            // set filter frequency based on value from 0 to 1
            value = parseFloat(value, 10);
            quality = parseFloat(quality, 10);
            gain = parseFloat(gain, 10);
            // Get back to the frequency value between min and max.
            filterNode.frequency.value = this.getFrequency(value);

            //filterNode.Q.value = quality;
            //filterNode.gain.value = gain;
        },
        getFrequency: function(value) {
            // get frequency by passing number from 0 to 1
            // Clamp the frequency between the minimum value (40 Hz) and half of the
            // sampling rate.
            var minValue = 40;
            var maxValue = context.sampleRate / 2;
            // Logarithm (base 2) to compute how many octaves fall in the range.
            var numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
            // Compute a multiplier from 0 to 1 based on an exponential scale.
            var multiplier = Math.pow(2, numberOfOctaves * (value - 1.0));
            // Get back to the frequency value between min and max.
            return maxValue * multiplier;
        },
        distort: function(value) {
            // create waveShaper distortion curve from 0 to 1
            var k = value * 100,
                n = 22050,
                curve = new Float32Array(n),
                deg = Math.PI / 180;

            for (var i = 0; i < n; i++) {
                var x = i * 2 / n - 1;
                curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
            }
            return curve;
        },
        timeCode: function(seconds, delim) {
            if(delim === undefined) { delim = ':'; }
            var h = Math.floor(seconds / 3600);
            var m = Math.floor((seconds % 3600) / 60);
            var s = Math.floor((seconds % 3600) % 60);
            var hr = (h === 0 ? '' : (h < 10 ? '0' + h + delim : h + delim));
            var mn = (m < 10 ? '0' + m : m) + delim;
            var sc = (s < 10 ? '0' + s : s);
            return hr + mn + sc;
        },
        waveformData: function(buffer, length) {
            console.log('-------------------');
            console.time('waveformData');
            var waveform = new Float32Array(length),
                chunk = Math.floor(buffer.length / length),
                //chunk = buffer.length / length,
                resolution = 5, // 10
                incr = Math.floor(chunk / resolution),
                greatest = 0;

            if(incr < 1) { incr = 1; }

            for (var i = 0, chnls = buffer.numberOfChannels; i < chnls; i++) {
                // check each channel
                var channel = buffer.getChannelData(i);
                //for (var j = length - 1; j >= 0; j--) {
                for (var j = 0; j < length; j++) {
                    // get highest value within the chunk
                    //var ch = j * chunk;
                    //for (var k = ch + chunk - 1; k >= ch; k -= incr) {
                    for (var k = j * chunk, l = k + chunk; k < l; k += incr) {
                        // select highest value from channels
                        var a = channel[k];
                        if(a < 0) { a = -a; }
                        if (a > waveform[j]) {
                            waveform[j] = a;
                        }
                        // update highest overall for scaling
                        if(a > greatest) {
                            greatest = a;
                        }
                    }
                }
            }
            // scale up?
            var scale = 1 / greatest,
                len = waveform.length;
            for (i = 0; i < len; i++) {
                waveform[i] *= scale;
            }
            console.timeEnd('waveformData');
            return waveform;
        },
        waveformCanvas: function(arr, height, color, bgColor, canvasEl) {
        //waveform: function(arr, width, height, color, bgColor, canvasEl) {
            //var arr = this.waveformData(buffer, width);
            var canvas = canvasEl || document.createElement('canvas');
            var width = canvas.width = arr.length;
            canvas.height = height;
            var context = canvas.getContext('2d');
            context.strokeStyle = color;
            context.fillStyle = bgColor;
            context.fillRect(0, 0, width, height);
            var x, y;
            console.time('waveformCanvas');
            context.beginPath();
            for (var i = 0, l = arr.length; i < l; i++) {
                x = i + 0.5;
                y = height - Math.round(height * arr[i]);
                context.moveTo(x, y);
                context.lineTo(x, height);
            }
            context.stroke();
            console.timeEnd('waveformCanvas');
            return canvas;
        }
    };
}
*/
if (typeof module === 'object' && module.exports) {
    module.exports = Utils;
}

},{}],12:[function(_dereq_,module,exports){
'use strict';

var Loader = _dereq_('./lib/loader.js'),
    NodeManager = _dereq_('./lib/node-manager.js'),
    Sound = _dereq_('./lib/sound.js'),
    Support = _dereq_('./lib/support.js'),
    Utils = _dereq_('./lib/utils.js');

function Sono() {
    this.VERSION = '0.0.0';

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this._context = window.AudioContext ? new window.AudioContext() : null;

    this._node = new NodeManager(this._context);
    this._masterGain = this._node.gain();
    if(this._context) {
        this._node.setSource(this._masterGain);
        this._node.setDestination(this._context.destination);
    }

    this._sounds = [];
    this._support = new Support();

    this.handleTouchlock();
    this.handleVisibility();
    //this.log();
}

/*
 * Create
 *
 * Accepted values for param data:
 * 
 * ArrayBuffer
 * HTMLMediaElement
 * Array (of files e.g. ['foo.ogg', 'foo.mp3'])
 * String (filename e.g. 'foo.ogg')
 * String (Oscillator type i.e. 'sine', 'square', 'sawtooth', 'triangle')
 * Object (ScriptProcessor config: { bufferSize: 1024, channels: 1, callback: fn, thisArg: self })
 */

Sono.prototype.createSound = function(data) {
    // try to load if data is Array or file string
    if(this.utils.isFile(data)) {
        return this.load(data);
    }
    // otherwise just return a new sound object
    var sound = new Sound(this._context, data, this._masterGain);
    this._sounds.push(sound);

    return sound;
};

/*
 * Destroy
 */

Sono.prototype.destroy = function(soundOrId) {
    var sound;
    for (var i = 0, l = this._sounds.length; i < l; i++) {
        sound = this._sounds[i];
        if(sound === soundOrId || sound.id === soundOrId) {
            break;
        }
    }
    if(sound !== undefined) {
        this._sounds.splice(i, 1);

        if(sound.loader) {
            sound.loader.cancel();
        }
        try {
            sound.stop();
        } catch(e) {}
    }
};

/*
 * Get Sound by id
 */

Sono.prototype.getById = function(id) {
    for (var i = 0, l = this._sounds.length; i < l; i++) {
        if(this._sounds[i].id === id) {
            return this._sounds[i];
        }
    }
    return null;
};

/*
 * Loading
 */

Sono.prototype.load = function(url, complete, progress, thisArg, asMediaElement) {
    if(!this._loader) {
        this._initLoader();
    }

    // multiple
    if(url instanceof Array && url.length && typeof url[0] === 'object') {
        this.loadMultiple(url, complete, progress, thisArg, asMediaElement);
        return;
    }

    var sound = this._queue(url, asMediaElement);

    if(progress) {
        sound.loader.onProgress.add(progress, thisArg || this);
    }
    if(complete) {
        sound.loader.onComplete.addOnce(function() {
            complete.call(thisArg || this, sound);
        });
    }
    sound.loader.start();

    return sound;
};

Sono.prototype.loadMultiple = function(config, complete, progress, thisArg, asMediaElement) {
    var sounds = [];
    for (var i = 0, l = config.length; i < l; i++) {
        var file = config[i];
        var sound = this._queue(file.url, asMediaElement);
        if(file.id) { sound.id = file.id; }
        sounds.push(sound);
    }
    if(progress) {
        this._loader.onProgress.add(function(p) {
            progress.call(thisArg || this, p);
        });
    }
    if(complete) {
        this._loader.onComplete.addOnce(function() {
            complete.call(thisArg || this, sounds);
        });
    }
    this._loader.start();
};

Sono.prototype._initLoader = function() {
    this._loader = new Loader();
    this._loader.touchLocked = this._isTouchLocked;
    this._loader.webAudioContext = this._context;
    this._loader.crossOrigin = true;
};

Sono.prototype._queue = function(url, asMediaElement) {
    if(!this._loader) {
        this._initLoader();
    }

    url = this._support.getSupportedFile(url);

    var sound = this.createSound();

    sound.loader = this._loader.add(url);
    sound.loader.onBeforeComplete.addOnce(function(buffer) {
        sound.setData(buffer);
    });

    if(asMediaElement) {
        sound.loader.webAudioContext = null;
    }

    return sound;
};

/*
 * Controls
 */

Sono.prototype.mute = function() {
    this._preMuteVolume = this.volume;
    this.volume = 0;
};

Sono.prototype.unMute = function() {
    this.volume = this._preMuteVolume || 1;
};

Object.defineProperty(Sono.prototype, 'volume', {
    get: function() {
        return this._masterGain.gain.value;
    },
    set: function(value) {
        if(isNaN(value)) { return; }

        this._masterGain.gain.value = value;

        if(!this.hasWebAudio) {
            for (var i = 0, l = this._sounds.length; i < l; i++) {
                this._sounds[i].volume = value;
            }
        }
    }
});

Sono.prototype.pauseAll = function() {
    for (var i = 0, l = this._sounds.length; i < l; i++) {
        if(this._sounds[i].playing) {
            this._sounds[i].pause();
        }
    }
};

Sono.prototype.resumeAll = function() {
    for (var i = 0, l = this._sounds.length; i < l; i++) {
        if(this._sounds[i].paused) {
            this._sounds[i].play();
        }
    }
};

Sono.prototype.stopAll = function() {
    for (var i = 0, l = this._sounds.length; i < l; i++) {
        this._sounds[i].stop();
    }
};

Sono.prototype.play = function(id, delay, offset) {
    this.getById(id).play(delay, offset);
};

Sono.prototype.pause = function(id) {
    this.getById(id).pause();
};

Sono.prototype.stop = function(id) {
    this.getById(id).stop();
};

/*
 * Mobile touch lock
 */

Sono.prototype.handleTouchlock = function() {
    var ua = navigator.userAgent,
        locked = !!ua.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i),
        self = this;

    var unlock = function() {
        document.body.removeEventListener('touchstart', unlock);
        self._isTouchLocked = false;
        this._loader.touchLocked = false;

        if(self.context) {
            var buffer = self.context.createBuffer(1, 1, 22050);
            var unlockSource = self.context.createBufferSource();
            unlockSource.buffer = buffer;
            unlockSource.connect(self.context.destination);
            unlockSource.start(0);
        }
    };
    if(locked) {
        document.body.addEventListener('touchstart', unlock, false);
    }
    this._isTouchLocked = locked;
};

/*
 * Page visibility events
 */

Sono.prototype.handleVisibility = function() {
    var pageHiddenPaused = [],
        sounds = this._sounds,
        hidden,
        visibilityChange;

    if (typeof document.hidden !== 'undefined') {
        hidden = 'hidden';
        visibilityChange = 'visibilitychange';
    }
    else if (typeof document.mozHidden !== 'undefined') {
        hidden = 'mozHidden';
        visibilityChange = 'mozvisibilitychange';
    }
    else if (typeof document.msHidden !== 'undefined') {
        hidden = 'msHidden';
        visibilityChange = 'msvisibilitychange';
    }
    else if (typeof document.webkitHidden !== 'undefined') {
        hidden = 'webkitHidden';
        visibilityChange = 'webkitvisibilitychange';
    }

    // pause currently playing sounds and store refs
    function onHidden() {
        var l = sounds.length;
        for (var i = 0; i < l; i++) {
            var sound = sounds[i];
            if(sound.playing) {
                sound.pause();
                pageHiddenPaused.push(sound);
            }
        }
    }

    // play sounds that got paused when page was hidden
    function onShown() {
        while(pageHiddenPaused.length) {
            pageHiddenPaused.pop().play();
        }
    }

    function onChange() {
        if (document[hidden]) {
            onHidden();
        }
        else {
            onShown();
        }
    }

    if(visibilityChange !== undefined) {
        document.addEventListener(visibilityChange, onChange, false);
    }
};

/*
 * Log version & device support info
 */

Sono.prototype.log = function(colorFull) {
    var title = 'Sono ' + this.VERSION,
        info = 'Supported:' + this.isSupported +
               ' WebAudioAPI:' + this.hasWebAudio +
               ' TouchLocked:' + this._isTouchLocked +
               ' Extensions:' + this._support.extensions;

    if(colorFull && navigator.userAgent.indexOf('Chrome') > -1) {
        var args = [
            '%c %c ' + title +
            ' %c %c ' +
            info +
            ' %c ',
            'background: #17d186',
            'color: #000000; background: #d0f736; font-weight: bold',
            'background: #17d186',
            'background: #f7f94f',
            'background: #17d186'
        ];
        console.log.apply(console, args);
    }
    else if (window.console) {
        console.log(title + ' ' + info);
    }
};

/*
 * Getters & Setters
 */

Object.defineProperty(Sono.prototype, 'canPlay', {
    get: function() {
        return this._support.canPlay;
    }
});

Object.defineProperty(Sono.prototype, 'context', {
    get: function() {
        return this._context;
    }
});

Object.defineProperty(Sono.prototype, 'hasWebAudio', {
    get: function() {
        return !!this._context;
    }
});

Object.defineProperty(Sono.prototype, 'isSupported', {
    get: function() {
        return this._support.extensions.length > 0;
    }
});

Object.defineProperty(Sono.prototype, 'loader', {
    get: function() {
        return this._loader;
    }
});

Object.defineProperty(Sono.prototype, 'masterGain', {
    get: function() {
        return this._masterGain;
    }
});

Object.defineProperty(Sono.prototype, 'node', {
    get: function() {
        return this._node;
    }
});

Object.defineProperty(Sono.prototype, 'sounds', {
    get: function() {
        return this._sounds;
    }
});

Object.defineProperty(Sono.prototype, 'utils', {
    get: function() {
        if(!this._utils) {
            this._utils = new Utils(this._context);
        }
        return this._utils;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = new Sono();
}

},{"./lib/loader.js":3,"./lib/node-manager.js":6,"./lib/sound.js":9,"./lib/support.js":10,"./lib/utils.js":11}]},{},[12])
(12)
});