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

    this.queue = [];
    this.index = 0;
    this.loaders = {};

    this.loaded = false;
    this.loading = false;
    this.webAudioContext = null;
    this.crossOrigin = false;
    this.touchLocked = false;
    this.numTotal = 0;
    this.numLoaded = 0;
}

Loader.prototype = {
    add: function(url) {
        var loader = new Loader.File(url);
        loader.webAudioContext = this.webAudioContext;
        loader.crossOrigin = this.crossOrigin;
        loader.touchLocked = this.touchLocked;
        this.queue.push(loader);
        this.loaders[loader.url] = loader;
        this.numTotal++;
        return loader;
    },
    start: function() {
        this.numTotal = this.queue.length;
        if(!this.loading) {
            this.loading = true;
            this.next();
        }
    },
    next: function() {
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
    },
    addMultiple: function(array) {
        for (var i = 0; i < array.length; i++) {
            this.add(array[i]);
        }
    },
    get: function(url) {
        return this.loaders[url];
    }
};

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

Loader.File.prototype = {
    start: function() {
        if(this.webAudioContext) {
            this.loadArrayBuffer(this.webAudioContext);
        } else {
            this.loadAudioElement(this.touchLocked);
        }
    },
    loadArrayBuffer: function(webAudioContext) {
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
    },
    loadAudioElement: function(touchLocked) {
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
    },
    cancel: function() {
      if(this.request && this.request.readyState !== 4) {
          this.request.abort();
      }
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
    this._sourceNode = null; // MediaMediaSourceNode
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
            this._sourceNode = this._context.createMediaMediaSource(this._el);
        }
        return this._sourceNode;
    }
});

if (typeof module === 'object' && module.exports) {
    module.exports = MediaSource;
}

},{}],5:[function(_dereq_,module,exports){
'use strict';

var context;

function createFilter(type, frequency) {
    var filterNode = context.createBiquadFilter();
    filterNode.type = type;
    if(frequency !== undefined) {
        filterNode.frequency.value = frequency;
    }
    return filterNode;
}

var create = {
    gain: function(value) {
        var node = context.createGain();
        if(value !== undefined) {
            node.gain.value = value;
        }
        return node;
    },
    pan: function() {
        var node = context.createPanner();
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
        return node;
    },
    filter: {
        lowpass: function(frequency) {
            return createFilter('lowpass', frequency);
        },
        highpass: function(frequency) {
            return createFilter('highpass', frequency);
        },
        bandpass: function(frequency) {
            return createFilter('bandpass', frequency);
        },
        lowshelf: function(frequency) {
            return createFilter('lowshelf', frequency);
        },
        highshelf: function(frequency) {
            return createFilter('highshelf', frequency);
        },
        peaking: function(frequency) {
            return createFilter('peaking', frequency);
        },
        notch: function(frequency) {
            return createFilter('notch', frequency);
        },
        allpass: function(frequency) {
            return createFilter('allpass', frequency);
        }
    },
    delay: function(input, time, gain) {
        var delayNode = context.createDelay();
        var gainNode = this.gain(gain || 0.5);
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
    },
    convolver: function(impulseResponse) {
        // impulseResponse is an audio file buffer
        var node = context.createConvolver();
        node.buffer = impulseResponse;
        return node;
    },
    reverb: function(seconds, decay, reverse) {
       return this.convolver(this.impulseResponse(seconds, decay, reverse));
    },
    // TODO: should prob be moved to utils:
    impulseResponse: function(seconds, decay, reverse) {
        // generate a reverb effect
        seconds = seconds || 1;
        decay = decay || 5;
        reverse = !!reverse;

        var numChannels = 2,
            rate = context.sampleRate,
            length = rate * seconds,
            impulseResponse = context.createBuffer(numChannels, length, rate),
            left = impulseResponse.getChannelData(0),
            right = impulseResponse.getChannelData(1),
            n;

        for (var i = 0; i < length; i++) {
            n = reverse ? length - 1 : i;
            left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
            right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        }

        return impulseResponse;
    },
    analyser: function(fftSize) {
        fftSize = fftSize || 1024;
        var node = context.createAnalyser();
        node.smoothingTimeConstant = 0.85;
        // resolution fftSize: 32 - 2048 (pow 2)
        // frequencyBinCount will be half this value
        node.fftSize = fftSize;
        //node.minDecibels = -100;
        //node.maxDecibels = -30;
        return node;
    },
    compressor: function() {
        // lowers the volume of the loudest parts of the signal and raises the volume of the softest parts
        var node = context.createDynamicsCompressor();
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
        return node;
    },
    distortion: function() {
        var node = context.createWaveShaper();
        // Float32Array defining curve (values are interpolated)
        //node.curve
        // up-sample before applying curve for better resolution result 'none', '2x' or '4x'
        //node.oversample = '2x';
        return node;
    },
    scriptProcessor: function(bufferSize, inputChannels, outputChannels, callback, callbackContext) {
        // bufferSize 256 - 16384 (pow 2)
        bufferSize = bufferSize || 1024;
        inputChannels = inputChannels === undefined ? 0 : inputChannels;
        outputChannels = outputChannels === undefined ? 1 : outputChannels;
        var node = context.createScriptProcessor(bufferSize, inputChannels, outputChannels);
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
        return node;
    },
    // creates MediaStreamAudioSourceNode
    microphoneSource: function(stream, connectTo) {
        var mediaStreamSource = context.createMediaStreamSource( stream );
        if(connectTo) {
            mediaStreamSource.connect(connectTo);
        }
        // HACK: stops moz garbage collection killing the stream
        // see https://support.mozilla.org/en-US/questions/984179
        if(navigator.mozGetUserMedia) {
            window.mozHack = mediaStreamSource;
        }
        return mediaStreamSource;
    }
};

/*
 * Fake nodes - not sure if this is a good idea?
 * The usage is that code can fail silently (removing need for conditionals)
 */

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
var fake = {
    gain: function() {
        return {gain:{value: 1}, connect:fn, disconnect:fn};
    },
    pan: returnFakeNode,
    filter: {
        lowpass: returnFakeNode,
        highpass: returnFakeNode,
        bandpass: returnFakeNode,
        lowshelf: returnFakeNode,
        highshelf: returnFakeNode,
        peaking: returnFakeNode,
        notch: returnFakeNode,
        allpass: returnFakeNode
    },
    delay: returnFakeNode,
    convolver: returnFakeNode,
    reverb: returnFakeNode,
    impulseResponse: function() { return []; },
    analyser: returnFakeNode,
    compressor: returnFakeNode,
    distortion: returnFakeNode,
    scriptProcessor: returnFakeNode,
    microphoneSource: returnFakeNode
};

function NodeFactory(webAudioContext) {
    context = webAudioContext;
    return context ? create : fake;
}

if (typeof module === 'object' && module.exports) {
    module.exports = NodeFactory;
}

},{}],6:[function(_dereq_,module,exports){
'use strict';

var BufferSource = _dereq_('./buffer-source.js'),
    MediaSource = _dereq_('./media-source.js'),
    nodeFactory = _dereq_('./node-factory.js');

function Sound(context, data, destination) {
    this.id = '';
    this._context = context;
    this._data = null;
    this._endedCallback = null;
    this._loop = false;
    this._nodeList = [];
    this._pausedAt = 0;
    this._playWhenReady = false;
    this._source = null;
    this._sourceNode = null;
    this._startedAt = 0;

    this._gain = nodeFactory(this._context).gain();
    this._gain.connect(destination || this._context.destination);

    this.add(data);
}

Sound.prototype.add = function(data) {
    if(!data) { return this; }
    this._data = data; // AudioBuffer or Media Element
    //console.log('data:', this._data);
    if(this._data.tagName) {
      this._source = new MediaSource(data, this._context);
    }
    else {
      this._source = new BufferSource(data, this._context);
    }
    this._createSourceNode();
    this._source.onEnded(this._endedHandler, this);

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
    this._createSourceNode();
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
 * Nodes
 */

Sound.prototype.addNode = function(node) {
    this._nodeList.push(node);
    this._updateConnections();
    return node;
};

Sound.prototype.removeNode = function(node) {
    var l = this._nodeList.length;
    for (var i = 0; i < l; i++) {
        if(node === this._nodeList[i]) {
            this._nodeList.splice(i, 1);
        }
    }
    node.disconnect(0);
    this._updateConnections();
    return this;
};

// should source be item 0 in nodelist and desination last
// prob is addNode needs to add before destination
// + should it be called chain or something nicer?
// feels like node list could be a linked list??
// if list.last is destination addbefore

/*Sound.prototype._updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    var l = this._nodeList.length;
    for (var i = 1; i < l; i++) {
      this._nodeList[i-1].connect(this._nodeList[i]);
    }
};*/
/*Sound.prototype._updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    console.log('_updateConnections');
    this._sourceNode.disconnect(0);
    this._sourceNode.connect(this._gain);
    var l = this._nodeList.length;

    for (var i = 0; i < l; i++) {
        if(i === 0) {
            console.log(' - connect source to node:', this._nodeList[i]);
            this._gain.disconnect(0);
            this._gain.connect(this._nodeList[i]);
        }
        else {
            console.log('connect:', this._nodeList[i-1], 'to', this._nodeList[i]);
            this._nodeList[i-1].disconnect(0);
            this._nodeList[i-1].connect(this._nodeList[i]);
        }
    }
    this.connectTo(this._context.destination);
};*/
Sound.prototype._updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    //console.log('_updateConnections');
    var l = this._nodeList.length;
    for (var i = 0; i < l; i++) {
        if(i === 0) {
            //console.log(' - connect source to node:', this._nodeList[i]);
            //this._sourceNode.disconnect(0);
            this._sourceNode.connect(this._nodeList[i]);
        }
        else {
            //console.log('connect:', this._nodeList[i-1], 'to', this._nodeList[i]);
            //this._nodeList[i-1].disconnect(0);
            this._nodeList[i-1].connect(this._nodeList[i]);
        }
    }
    //console.log(this.destination)
    if(this.destination) {
        this.connectTo(this.destination);
    }
    else if (this._gain) {
        this.connectTo(this._gain);
    }
};

// or setter for destination?
/*Sound.prototype.connectTo = function(node) {
    var l = this._nodeList.length;
    if(l > 0) {
      console.log('connect:', this._nodeList[l - 1], 'to', node);
        this._nodeList[l - 1].disconnect(0);
        this._nodeList[l - 1].connect(node);
    }
    else {
        console.log(' x connect source to node:', node);
        this._gain.disconnect(0);
        this._gain.connect(node);
    }
    this.destination = node;
};*/
Sound.prototype.connectTo = function(node) {
    var l = this._nodeList.length;
    if(l > 0) {
        //console.log('connect:', this._nodeList[l - 1], 'to', node);
        //this._nodeList[l - 1].disconnect(0);
        this._nodeList[l - 1].connect(node);
    }
    else if(this._sourceNode) {
        //console.log(' x connect source to node:', node);
        //this._sourceNode.disconnect(0);
        this._sourceNode.connect(node);
    }
    this.destination = node;

    return this;
};

Sound.prototype._createSourceNode = function() {
    //console.log('get source', this._sourceNode);
    if(!this._context) {
        return;
    }

    this._sourceNode = this._source.sourceNode;
    this._updateConnections();

    return this._sourceNode;
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

/*
 * TODO: set up so source can be stream, oscillator, etc
 */


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

Object.defineProperty(Sound.prototype, 'duration', {
    get: function() {
        return this._source ? this._source.duration : 0;
    }
});

Object.defineProperty(Sound.prototype, 'currentTime', {
    get: function() {
        return this._source ? this._source.currentTime : 0;
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

Object.defineProperty(Sound.prototype, 'playing', {
    get: function() {
        return this._source ? this._source.playing : false;
    }
});

Object.defineProperty(Sound.prototype, 'paused', {
    get: function() {
        return this._source ? this._source.paused : false;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Sound;
}

},{"./buffer-source.js":2,"./media-source.js":4,"./node-factory.js":5}],7:[function(_dereq_,module,exports){
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
    module.exports = new Support();
}

},{}],8:[function(_dereq_,module,exports){
'use strict';

 function Utils(context) {
    function parseNum(x) {
        return isNaN(x) ? 0 : parseFloat(x, 10);
    }

    return {
        fade: function(gainNode, value, duration) {
            gainNode.gain.linearRampToValueAtTime(value, context.currentTime + duration);
        },
        panHandler: function(panner) {
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
                    x = parseNum(x);
                    y = parseNum(y);
                    z = parseNum(z);
                    panner.setPosition(x, y, z);
                },
                setSourcePosition: function(positionVec) {
                    // set the position of the source (where the audio is coming from)
                    panner.setPosition(positionVec.x, positionVec.y, positionVec.z);
                },
                setSourceOrientation: function(forwardVec) { // forwardVec = THREE.Vector3
                    // set the audio source orientation
                    this.setOrientation(panner, forwardVec);
                    /*// set the orientation of the source (where the audio is coming from)
                    //var fw = forwardVec.clone().normalize(); =>
                    var fw = { x: forwardVec.x, y: forwardVec.y, z: forwardVec.z };
                    this.normalize(fw);
                    // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
                    var globalUp = { x: 0, y: 1, z: 0 };
                    // var up = forwardVec.clone().cross(globalUp).cross(forwardVec).normalize();
                    var up = { x: forwardVec.x, y: forwardVec.y, z: forwardVec.z };
                    this.cross(up, globalUp);
                    this.cross(up, forwardVec);
                    this.normalize(up);
                    // set the audio context's listener position to match the camera position
                    panner.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);*/
                },
                setListenerPosition: function(positionVec) {
                    // set the position of the listener (who is hearing the audio)
                    context.listener.setPosition(positionVec.x, positionVec.y, positionVec.z);
                },
                setListenerOrientation: function(forwardVec) { // forwardVec = THREE.Vector3
                    // set the audio context's listener position to match the camera position
                    this.setOrientation(context.listener, forwardVec);
                    /*
                    // set the orientation of the listener (who is hearing the audio)
                    var fw = forwardVec.clone().normalize();
                    // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
                    var globalUp = { x: 0, y: 1, z: 0 };
                    var up = forwardVec.clone().cross(globalUp).cross(forwardVec).normalize();
                    // set the audio context's listener position to match the camera position
                    context.listener.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
                    */
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
        }
    };
}

if (typeof module === 'object' && module.exports) {
    module.exports = Utils;
}

},{}],9:[function(_dereq_,module,exports){
'use strict';

var Loader = _dereq_('./lib/loader.js'),
    nodeFactory = _dereq_('./lib/node-factory.js'),
    Sound = _dereq_('./lib/sound.js'),
    support = _dereq_('./lib/support.js'),
    Utils = _dereq_('./lib/utils.js');

function Sono() {
    this.VERSION = '0.0.0';

    this.context = this.createAudioContext();

    this._masterGain = this.create.gain();

    if(this.context) {
        this._masterGain.connect(this.context.destination);
    }

    this._sounds = [];
    this._support = support;

    this.handleTouchlock();
    this.handleVisibility();
    //this.log();
}

/*
 * add - data can be element, arraybuffer or as yet null/undefined
 */

Sono.prototype.add = function(data, id) {

    // try to load if url is put into add?
    var isAudioBuffer = data && window.AudioBuffer && data instanceof window.AudioBuffer;
    var isMediaElement = data && data instanceof window.HTMLMediaElement;
    if(data && !isAudioBuffer && !isMediaElement) {
        var s = this.load(data);
        if(id) { s.id = id; }
        return s;
    }

    if(id && this.get(id)) {
        return this.get(id);
    }

    var sound = new Sound(this.context, data, this._masterGain);
    sound.id = id || this.createId();
    //sound.loop = !!loop;
    sound.add(data);
    this._sounds.push(sound);
    return sound;
};

Sono.prototype.load = function(url, callback, thisArg, asMediaElement) {
    if(!this._loader) {
        this._initLoader();
    }

    // multiple
    if(url instanceof Array && url.length && typeof url[0] === 'object') {
        this.loadMultiple(url, callback, thisArg, asMediaElement);
        return;
    }

    var sound = this.queue(url, asMediaElement);

    if(callback) {
        sound.loader.onComplete.addOnce(function() {
            callback.call(thisArg || this, sound);
        });
    }

    sound.loader.start();

    return sound;
};

Sono.prototype.queue = function(url, asMediaElement) {
    if(!this._loader) {
        this._initLoader();
    }

    url = support.getSupportedFile(url);

    var sound = this.add();

    sound.loader = this._loader.add(url);
    sound.loader.onBeforeComplete.addOnce(function(buffer) {
        sound.add(buffer);
    });

    if(asMediaElement) {
        sound.loader.webAudioContext = null;
    }

    return sound;
};

Sono.prototype.loadMultiple = function(config, complete, progress, thisArg, asMediaElement) {
    var sounds = [];
    for (var i = 0, l = config.length; i < l; i++) {
        var file = config[i];

        var sound = this.queue(file.url, asMediaElement);
        sound.id = file.id;
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

Sono.prototype.get = function(soundOrId) {
    for (var i = 0, l = this._sounds.length; i < l; i++) {
        if(this._sounds[i] === soundOrId || this._sounds[i].id === soundOrId) {
            return this._sounds[i];
        }
    }
    return null;
};

Sono.prototype.createId = function() {
    if(this._id === undefined) {
        this._id = 0;
    }
    this._id++;
    return this._id.toString(10);
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
    this.get(id).play(delay, offset);
};

Sono.prototype.pause = function(id) {
    this.get(id).pause();
};

Sono.prototype.stop = function(id) {
    this.get(id).stop();
};

/*
 * Loading
 */

Sono.prototype._initLoader = function() {
    this._loader = new Loader();
    this._loader.touchLocked = this._isTouchLocked;
    this._loader.webAudioContext = this.context;
    this._loader.crossOrigin = true;
};

Sono.prototype.loadArrayBuffer = function(url, callback, thisArg) {
    return this.load(url, callback, thisArg, false);
};

Sono.prototype.loadAudioElement = function(url, callback, thisArg) {
    return this.load(url, callback, thisArg, true);
};

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
 * Audio context
 */

Sono.prototype.createAudioContext = function() {
    var context = null;
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if(window.AudioContext) {
        context = new window.AudioContext();
    }
    return context;
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
    } else if (typeof document.mozHidden !== 'undefined') {
        hidden = 'mozHidden';
        visibilityChange = 'mozvisibilitychange';
    } else if (typeof document.msHidden !== 'undefined') {
        hidden = 'msHidden';
        visibilityChange = 'msvisibilitychange';
    } else if (typeof document.webkitHidden !== 'undefined') {
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
 * Log device support info
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

Object.defineProperty(Sono.prototype, 'isSupported', {
    get: function() {
        return this._support.extensions.length > 0;
    }
});

Object.defineProperty(Sono.prototype, 'canPlay', {
    get: function() {
        return this._support.canPlay;
    }
});

Object.defineProperty(Sono.prototype, 'hasWebAudio', {
    get: function() {
        return !!this.context;
    }
});

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

Object.defineProperty(Sono.prototype, 'sounds', {
    get: function() {
        return this._sounds;
    }
});

Object.defineProperty(Sono.prototype, 'create', {
    get: function() {
        if(!this._nodeFactory) {
            this._nodeFactory = nodeFactory(this.context);
        }
        return this._nodeFactory;
    }
});

Object.defineProperty(Sono.prototype, 'utils', {
    get: function() {
        if(!this._utils) {
            this._utils = new Utils(this.context);
        }
        return this._utils;
    }
});

Object.defineProperty(Sono.prototype, 'loader', {
    get: function() {
        return this._loader;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = new Sono();
}

},{"./lib/loader.js":3,"./lib/node-factory.js":5,"./lib/sound.js":6,"./lib/support.js":7,"./lib/utils.js":8}]},{},[9])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9ub2RlX21vZHVsZXMvc2lnbmFscy9kaXN0L3NpZ25hbHMuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL2J1ZmZlci1zb3VyY2UuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL2xvYWRlci5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvbWVkaWEtc291cmNlLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL2xpYi9ub2RlLWZhY3RvcnkuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL3NvdW5kLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL2xpYi9zdXBwb3J0LmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL2xpYi91dGlscy5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9zb25vLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9PQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypqc2xpbnQgb25ldmFyOnRydWUsIHVuZGVmOnRydWUsIG5ld2NhcDp0cnVlLCByZWdleHA6dHJ1ZSwgYml0d2lzZTp0cnVlLCBtYXhlcnI6NTAsIGluZGVudDo0LCB3aGl0ZTpmYWxzZSwgbm9tZW46ZmFsc2UsIHBsdXNwbHVzOmZhbHNlICovXG4vKmdsb2JhbCBkZWZpbmU6ZmFsc2UsIHJlcXVpcmU6ZmFsc2UsIGV4cG9ydHM6ZmFsc2UsIG1vZHVsZTpmYWxzZSwgc2lnbmFsczpmYWxzZSAqL1xuXG4vKiogQGxpY2Vuc2VcbiAqIEpTIFNpZ25hbHMgPGh0dHA6Ly9taWxsZXJtZWRlaXJvcy5naXRodWIuY29tL2pzLXNpZ25hbHMvPlxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlXG4gKiBBdXRob3I6IE1pbGxlciBNZWRlaXJvc1xuICogVmVyc2lvbjogMS4wLjAgLSBCdWlsZDogMjY4ICgyMDEyLzExLzI5IDA1OjQ4IFBNKVxuICovXG5cbihmdW5jdGlvbihnbG9iYWwpe1xuXG4gICAgLy8gU2lnbmFsQmluZGluZyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBPYmplY3QgdGhhdCByZXByZXNlbnRzIGEgYmluZGluZyBiZXR3ZWVuIGEgU2lnbmFsIGFuZCBhIGxpc3RlbmVyIGZ1bmN0aW9uLlxuICAgICAqIDxiciAvPi0gPHN0cm9uZz5UaGlzIGlzIGFuIGludGVybmFsIGNvbnN0cnVjdG9yIGFuZCBzaG91bGRuJ3QgYmUgY2FsbGVkIGJ5IHJlZ3VsYXIgdXNlcnMuPC9zdHJvbmc+XG4gICAgICogPGJyIC8+LSBpbnNwaXJlZCBieSBKb2EgRWJlcnQgQVMzIFNpZ25hbEJpbmRpbmcgYW5kIFJvYmVydCBQZW5uZXIncyBTbG90IGNsYXNzZXMuXG4gICAgICogQGF1dGhvciBNaWxsZXIgTWVkZWlyb3NcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAbmFtZSBTaWduYWxCaW5kaW5nXG4gICAgICogQHBhcmFtIHtTaWduYWx9IHNpZ25hbCBSZWZlcmVuY2UgdG8gU2lnbmFsIG9iamVjdCB0aGF0IGxpc3RlbmVyIGlzIGN1cnJlbnRseSBib3VuZCB0by5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBIYW5kbGVyIGZ1bmN0aW9uIGJvdW5kIHRvIHRoZSBzaWduYWwuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc09uY2UgSWYgYmluZGluZyBzaG91bGQgYmUgZXhlY3V0ZWQganVzdCBvbmNlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbbGlzdGVuZXJDb250ZXh0XSBDb250ZXh0IG9uIHdoaWNoIGxpc3RlbmVyIHdpbGwgYmUgZXhlY3V0ZWQgKG9iamVjdCB0aGF0IHNob3VsZCByZXByZXNlbnQgdGhlIGB0aGlzYCB2YXJpYWJsZSBpbnNpZGUgbGlzdGVuZXIgZnVuY3Rpb24pLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbcHJpb3JpdHldIFRoZSBwcmlvcml0eSBsZXZlbCBvZiB0aGUgZXZlbnQgbGlzdGVuZXIuIChkZWZhdWx0ID0gMCkuXG4gICAgICovXG4gICAgZnVuY3Rpb24gU2lnbmFsQmluZGluZyhzaWduYWwsIGxpc3RlbmVyLCBpc09uY2UsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSGFuZGxlciBmdW5jdGlvbiBib3VuZCB0byB0aGUgc2lnbmFsLlxuICAgICAgICAgKiBAdHlwZSBGdW5jdGlvblxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fbGlzdGVuZXIgPSBsaXN0ZW5lcjtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgYmluZGluZyBzaG91bGQgYmUgZXhlY3V0ZWQganVzdCBvbmNlLlxuICAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9pc09uY2UgPSBpc09uY2U7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnRleHQgb24gd2hpY2ggbGlzdGVuZXIgd2lsbCBiZSBleGVjdXRlZCAob2JqZWN0IHRoYXQgc2hvdWxkIHJlcHJlc2VudCB0aGUgYHRoaXNgIHZhcmlhYmxlIGluc2lkZSBsaXN0ZW5lciBmdW5jdGlvbikuXG4gICAgICAgICAqIEBtZW1iZXJPZiBTaWduYWxCaW5kaW5nLnByb3RvdHlwZVxuICAgICAgICAgKiBAbmFtZSBjb250ZXh0XG4gICAgICAgICAqIEB0eXBlIE9iamVjdHx1bmRlZmluZWR8bnVsbFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jb250ZXh0ID0gbGlzdGVuZXJDb250ZXh0O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZWZlcmVuY2UgdG8gU2lnbmFsIG9iamVjdCB0aGF0IGxpc3RlbmVyIGlzIGN1cnJlbnRseSBib3VuZCB0by5cbiAgICAgICAgICogQHR5cGUgU2lnbmFsXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9zaWduYWwgPSBzaWduYWw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIExpc3RlbmVyIHByaW9yaXR5XG4gICAgICAgICAqIEB0eXBlIE51bWJlclxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fcHJpb3JpdHkgPSBwcmlvcml0eSB8fCAwO1xuICAgIH1cblxuICAgIFNpZ25hbEJpbmRpbmcucHJvdG90eXBlID0ge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiBiaW5kaW5nIGlzIGFjdGl2ZSBhbmQgc2hvdWxkIGJlIGV4ZWN1dGVkLlxuICAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICAqL1xuICAgICAgICBhY3RpdmUgOiB0cnVlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWZhdWx0IHBhcmFtZXRlcnMgcGFzc2VkIHRvIGxpc3RlbmVyIGR1cmluZyBgU2lnbmFsLmRpc3BhdGNoYCBhbmQgYFNpZ25hbEJpbmRpbmcuZXhlY3V0ZWAuIChjdXJyaWVkIHBhcmFtZXRlcnMpXG4gICAgICAgICAqIEB0eXBlIEFycmF5fG51bGxcbiAgICAgICAgICovXG4gICAgICAgIHBhcmFtcyA6IG51bGwsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhbGwgbGlzdGVuZXIgcGFzc2luZyBhcmJpdHJhcnkgcGFyYW1ldGVycy5cbiAgICAgICAgICogPHA+SWYgYmluZGluZyB3YXMgYWRkZWQgdXNpbmcgYFNpZ25hbC5hZGRPbmNlKClgIGl0IHdpbGwgYmUgYXV0b21hdGljYWxseSByZW1vdmVkIGZyb20gc2lnbmFsIGRpc3BhdGNoIHF1ZXVlLCB0aGlzIG1ldGhvZCBpcyB1c2VkIGludGVybmFsbHkgZm9yIHRoZSBzaWduYWwgZGlzcGF0Y2guPC9wPlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBbcGFyYW1zQXJyXSBBcnJheSBvZiBwYXJhbWV0ZXJzIHRoYXQgc2hvdWxkIGJlIHBhc3NlZCB0byB0aGUgbGlzdGVuZXJcbiAgICAgICAgICogQHJldHVybiB7Kn0gVmFsdWUgcmV0dXJuZWQgYnkgdGhlIGxpc3RlbmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgZXhlY3V0ZSA6IGZ1bmN0aW9uIChwYXJhbXNBcnIpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGVyUmV0dXJuLCBwYXJhbXM7XG4gICAgICAgICAgICBpZiAodGhpcy5hY3RpdmUgJiYgISF0aGlzLl9saXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIHBhcmFtcyA9IHRoaXMucGFyYW1zPyB0aGlzLnBhcmFtcy5jb25jYXQocGFyYW1zQXJyKSA6IHBhcmFtc0FycjtcbiAgICAgICAgICAgICAgICBoYW5kbGVyUmV0dXJuID0gdGhpcy5fbGlzdGVuZXIuYXBwbHkodGhpcy5jb250ZXh0LCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9pc09uY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlclJldHVybjtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGV0YWNoIGJpbmRpbmcgZnJvbSBzaWduYWwuXG4gICAgICAgICAqIC0gYWxpYXMgdG86IG15U2lnbmFsLnJlbW92ZShteUJpbmRpbmcuZ2V0TGlzdGVuZXIoKSk7XG4gICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufG51bGx9IEhhbmRsZXIgZnVuY3Rpb24gYm91bmQgdG8gdGhlIHNpZ25hbCBvciBgbnVsbGAgaWYgYmluZGluZyB3YXMgcHJldmlvdXNseSBkZXRhY2hlZC5cbiAgICAgICAgICovXG4gICAgICAgIGRldGFjaCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzQm91bmQoKT8gdGhpcy5fc2lnbmFsLnJlbW92ZSh0aGlzLl9saXN0ZW5lciwgdGhpcy5jb250ZXh0KSA6IG51bGw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IGB0cnVlYCBpZiBiaW5kaW5nIGlzIHN0aWxsIGJvdW5kIHRvIHRoZSBzaWduYWwgYW5kIGhhdmUgYSBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGlzQm91bmQgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKCEhdGhpcy5fc2lnbmFsICYmICEhdGhpcy5fbGlzdGVuZXIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtib29sZWFufSBJZiBTaWduYWxCaW5kaW5nIHdpbGwgb25seSBiZSBleGVjdXRlZCBvbmNlLlxuICAgICAgICAgKi9cbiAgICAgICAgaXNPbmNlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzT25jZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IEhhbmRsZXIgZnVuY3Rpb24gYm91bmQgdG8gdGhlIHNpZ25hbC5cbiAgICAgICAgICovXG4gICAgICAgIGdldExpc3RlbmVyIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xpc3RlbmVyO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtTaWduYWx9IFNpZ25hbCB0aGF0IGxpc3RlbmVyIGlzIGN1cnJlbnRseSBib3VuZCB0by5cbiAgICAgICAgICovXG4gICAgICAgIGdldFNpZ25hbCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zaWduYWw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlbGV0ZSBpbnN0YW5jZSBwcm9wZXJ0aWVzXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfZGVzdHJveSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9zaWduYWw7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fbGlzdGVuZXI7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5jb250ZXh0O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgdG9TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1tTaWduYWxCaW5kaW5nIGlzT25jZTonICsgdGhpcy5faXNPbmNlICsnLCBpc0JvdW5kOicrIHRoaXMuaXNCb3VuZCgpICsnLCBhY3RpdmU6JyArIHRoaXMuYWN0aXZlICsgJ10nO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG5cbi8qZ2xvYmFsIFNpZ25hbEJpbmRpbmc6ZmFsc2UqL1xuXG4gICAgLy8gU2lnbmFsIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZUxpc3RlbmVyKGxpc3RlbmVyLCBmbk5hbWUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnbGlzdGVuZXIgaXMgYSByZXF1aXJlZCBwYXJhbSBvZiB7Zm59KCkgYW5kIHNob3VsZCBiZSBhIEZ1bmN0aW9uLicucmVwbGFjZSgne2ZufScsIGZuTmFtZSkgKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBldmVudCBicm9hZGNhc3RlclxuICAgICAqIDxiciAvPi0gaW5zcGlyZWQgYnkgUm9iZXJ0IFBlbm5lcidzIEFTMyBTaWduYWxzLlxuICAgICAqIEBuYW1lIFNpZ25hbFxuICAgICAqIEBhdXRob3IgTWlsbGVyIE1lZGVpcm9zXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gU2lnbmFsKCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQHR5cGUgQXJyYXkuPFNpZ25hbEJpbmRpbmc+XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9iaW5kaW5ncyA9IFtdO1xuICAgICAgICB0aGlzLl9wcmV2UGFyYW1zID0gbnVsbDtcblxuICAgICAgICAvLyBlbmZvcmNlIGRpc3BhdGNoIHRvIGF3YXlzIHdvcmsgb24gc2FtZSBjb250ZXh0ICgjNDcpXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5kaXNwYXRjaCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBTaWduYWwucHJvdG90eXBlLmRpc3BhdGNoLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgU2lnbmFsLnByb3RvdHlwZSA9IHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2lnbmFscyBWZXJzaW9uIE51bWJlclxuICAgICAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgICAgICogQGNvbnN0XG4gICAgICAgICAqL1xuICAgICAgICBWRVJTSU9OIDogJzEuMC4wJyxcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgU2lnbmFsIHNob3VsZCBrZWVwIHJlY29yZCBvZiBwcmV2aW91c2x5IGRpc3BhdGNoZWQgcGFyYW1ldGVycyBhbmRcbiAgICAgICAgICogYXV0b21hdGljYWxseSBleGVjdXRlIGxpc3RlbmVyIGR1cmluZyBgYWRkKClgL2BhZGRPbmNlKClgIGlmIFNpZ25hbCB3YXNcbiAgICAgICAgICogYWxyZWFkeSBkaXNwYXRjaGVkIGJlZm9yZS5cbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKi9cbiAgICAgICAgbWVtb3JpemUgOiBmYWxzZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX3Nob3VsZFByb3BhZ2F0ZSA6IHRydWUsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIFNpZ25hbCBpcyBhY3RpdmUgYW5kIHNob3VsZCBicm9hZGNhc3QgZXZlbnRzLlxuICAgICAgICAgKiA8cD48c3Ryb25nPklNUE9SVEFOVDo8L3N0cm9uZz4gU2V0dGluZyB0aGlzIHByb3BlcnR5IGR1cmluZyBhIGRpc3BhdGNoIHdpbGwgb25seSBhZmZlY3QgdGhlIG5leHQgZGlzcGF0Y2gsIGlmIHlvdSB3YW50IHRvIHN0b3AgdGhlIHByb3BhZ2F0aW9uIG9mIGEgc2lnbmFsIHVzZSBgaGFsdCgpYCBpbnN0ZWFkLjwvcD5cbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKi9cbiAgICAgICAgYWN0aXZlIDogdHJ1ZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXJcbiAgICAgICAgICogQHBhcmFtIHtib29sZWFufSBpc09uY2VcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtsaXN0ZW5lckNvbnRleHRdXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbcHJpb3JpdHldXG4gICAgICAgICAqIEByZXR1cm4ge1NpZ25hbEJpbmRpbmd9XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfcmVnaXN0ZXJMaXN0ZW5lciA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgaXNPbmNlLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KSB7XG5cbiAgICAgICAgICAgIHZhciBwcmV2SW5kZXggPSB0aGlzLl9pbmRleE9mTGlzdGVuZXIobGlzdGVuZXIsIGxpc3RlbmVyQ29udGV4dCksXG4gICAgICAgICAgICAgICAgYmluZGluZztcblxuICAgICAgICAgICAgaWYgKHByZXZJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBiaW5kaW5nID0gdGhpcy5fYmluZGluZ3NbcHJldkluZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoYmluZGluZy5pc09uY2UoKSAhPT0gaXNPbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignWW91IGNhbm5vdCBhZGQnKyAoaXNPbmNlPyAnJyA6ICdPbmNlJykgKycoKSB0aGVuIGFkZCcrICghaXNPbmNlPyAnJyA6ICdPbmNlJykgKycoKSB0aGUgc2FtZSBsaXN0ZW5lciB3aXRob3V0IHJlbW92aW5nIHRoZSByZWxhdGlvbnNoaXAgZmlyc3QuJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBiaW5kaW5nID0gbmV3IFNpZ25hbEJpbmRpbmcodGhpcywgbGlzdGVuZXIsIGlzT25jZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkQmluZGluZyhiaW5kaW5nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYodGhpcy5tZW1vcml6ZSAmJiB0aGlzLl9wcmV2UGFyYW1zKXtcbiAgICAgICAgICAgICAgICBiaW5kaW5nLmV4ZWN1dGUodGhpcy5fcHJldlBhcmFtcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBiaW5kaW5nO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge1NpZ25hbEJpbmRpbmd9IGJpbmRpbmdcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9hZGRCaW5kaW5nIDogZnVuY3Rpb24gKGJpbmRpbmcpIHtcbiAgICAgICAgICAgIC8vc2ltcGxpZmllZCBpbnNlcnRpb24gc29ydFxuICAgICAgICAgICAgdmFyIG4gPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGg7XG4gICAgICAgICAgICBkbyB7IC0tbjsgfSB3aGlsZSAodGhpcy5fYmluZGluZ3Nbbl0gJiYgYmluZGluZy5fcHJpb3JpdHkgPD0gdGhpcy5fYmluZGluZ3Nbbl0uX3ByaW9yaXR5KTtcbiAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzLnNwbGljZShuICsgMSwgMCwgYmluZGluZyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEByZXR1cm4ge251bWJlcn1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9pbmRleE9mTGlzdGVuZXIgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBuID0gdGhpcy5fYmluZGluZ3MubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGN1cjtcbiAgICAgICAgICAgIHdoaWxlIChuLS0pIHtcbiAgICAgICAgICAgICAgICBjdXIgPSB0aGlzLl9iaW5kaW5nc1tuXTtcbiAgICAgICAgICAgICAgICBpZiAoY3VyLl9saXN0ZW5lciA9PT0gbGlzdGVuZXIgJiYgY3VyLmNvbnRleHQgPT09IGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGVjayBpZiBsaXN0ZW5lciB3YXMgYXR0YWNoZWQgdG8gU2lnbmFsLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbnRleHRdXG4gICAgICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IGlmIFNpZ25hbCBoYXMgdGhlIHNwZWNpZmllZCBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGhhcyA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4T2ZMaXN0ZW5lcihsaXN0ZW5lciwgY29udGV4dCkgIT09IC0xO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGQgYSBsaXN0ZW5lciB0byB0aGUgc2lnbmFsLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBTaWduYWwgaGFuZGxlciBmdW5jdGlvbi5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtsaXN0ZW5lckNvbnRleHRdIENvbnRleHQgb24gd2hpY2ggbGlzdGVuZXIgd2lsbCBiZSBleGVjdXRlZCAob2JqZWN0IHRoYXQgc2hvdWxkIHJlcHJlc2VudCB0aGUgYHRoaXNgIHZhcmlhYmxlIGluc2lkZSBsaXN0ZW5lciBmdW5jdGlvbikuXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbcHJpb3JpdHldIFRoZSBwcmlvcml0eSBsZXZlbCBvZiB0aGUgZXZlbnQgbGlzdGVuZXIuIExpc3RlbmVycyB3aXRoIGhpZ2hlciBwcmlvcml0eSB3aWxsIGJlIGV4ZWN1dGVkIGJlZm9yZSBsaXN0ZW5lcnMgd2l0aCBsb3dlciBwcmlvcml0eS4gTGlzdGVuZXJzIHdpdGggc2FtZSBwcmlvcml0eSBsZXZlbCB3aWxsIGJlIGV4ZWN1dGVkIGF0IHRoZSBzYW1lIG9yZGVyIGFzIHRoZXkgd2VyZSBhZGRlZC4gKGRlZmF1bHQgPSAwKVxuICAgICAgICAgKiBAcmV0dXJuIHtTaWduYWxCaW5kaW5nfSBBbiBPYmplY3QgcmVwcmVzZW50aW5nIHRoZSBiaW5kaW5nIGJldHdlZW4gdGhlIFNpZ25hbCBhbmQgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBhZGQgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpIHtcbiAgICAgICAgICAgIHZhbGlkYXRlTGlzdGVuZXIobGlzdGVuZXIsICdhZGQnKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWdpc3Rlckxpc3RlbmVyKGxpc3RlbmVyLCBmYWxzZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZCBsaXN0ZW5lciB0byB0aGUgc2lnbmFsIHRoYXQgc2hvdWxkIGJlIHJlbW92ZWQgYWZ0ZXIgZmlyc3QgZXhlY3V0aW9uICh3aWxsIGJlIGV4ZWN1dGVkIG9ubHkgb25jZSkuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIFNpZ25hbCBoYW5kbGVyIGZ1bmN0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2xpc3RlbmVyQ29udGV4dF0gQ29udGV4dCBvbiB3aGljaCBsaXN0ZW5lciB3aWxsIGJlIGV4ZWN1dGVkIChvYmplY3QgdGhhdCBzaG91bGQgcmVwcmVzZW50IHRoZSBgdGhpc2AgdmFyaWFibGUgaW5zaWRlIGxpc3RlbmVyIGZ1bmN0aW9uKS5cbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IFtwcmlvcml0eV0gVGhlIHByaW9yaXR5IGxldmVsIG9mIHRoZSBldmVudCBsaXN0ZW5lci4gTGlzdGVuZXJzIHdpdGggaGlnaGVyIHByaW9yaXR5IHdpbGwgYmUgZXhlY3V0ZWQgYmVmb3JlIGxpc3RlbmVycyB3aXRoIGxvd2VyIHByaW9yaXR5LiBMaXN0ZW5lcnMgd2l0aCBzYW1lIHByaW9yaXR5IGxldmVsIHdpbGwgYmUgZXhlY3V0ZWQgYXQgdGhlIHNhbWUgb3JkZXIgYXMgdGhleSB3ZXJlIGFkZGVkLiAoZGVmYXVsdCA9IDApXG4gICAgICAgICAqIEByZXR1cm4ge1NpZ25hbEJpbmRpbmd9IEFuIE9iamVjdCByZXByZXNlbnRpbmcgdGhlIGJpbmRpbmcgYmV0d2VlbiB0aGUgU2lnbmFsIGFuZCBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGFkZE9uY2UgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpIHtcbiAgICAgICAgICAgIHZhbGlkYXRlTGlzdGVuZXIobGlzdGVuZXIsICdhZGRPbmNlJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcmVnaXN0ZXJMaXN0ZW5lcihsaXN0ZW5lciwgdHJ1ZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZSBhIHNpbmdsZSBsaXN0ZW5lciBmcm9tIHRoZSBkaXNwYXRjaCBxdWV1ZS5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgSGFuZGxlciBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSByZW1vdmVkLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbnRleHRdIEV4ZWN1dGlvbiBjb250ZXh0IChzaW5jZSB5b3UgY2FuIGFkZCB0aGUgc2FtZSBoYW5kbGVyIG11bHRpcGxlIHRpbWVzIGlmIGV4ZWN1dGluZyBpbiBhIGRpZmZlcmVudCBjb250ZXh0KS5cbiAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IExpc3RlbmVyIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmUgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHZhbGlkYXRlTGlzdGVuZXIobGlzdGVuZXIsICdyZW1vdmUnKTtcblxuICAgICAgICAgICAgdmFyIGkgPSB0aGlzLl9pbmRleE9mTGlzdGVuZXIobGlzdGVuZXIsIGNvbnRleHQpO1xuICAgICAgICAgICAgaWYgKGkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZGluZ3NbaV0uX2Rlc3Ryb3koKTsgLy9ubyByZWFzb24gdG8gYSBTaWduYWxCaW5kaW5nIGV4aXN0IGlmIGl0IGlzbid0IGF0dGFjaGVkIHRvIGEgc2lnbmFsXG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZGluZ3Muc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGxpc3RlbmVyO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmUgYWxsIGxpc3RlbmVycyBmcm9tIHRoZSBTaWduYWwuXG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmVBbGwgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbiA9IHRoaXMuX2JpbmRpbmdzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChuLS0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9iaW5kaW5nc1tuXS5fZGVzdHJveSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fYmluZGluZ3MubGVuZ3RoID0gMDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7bnVtYmVyfSBOdW1iZXIgb2YgbGlzdGVuZXJzIGF0dGFjaGVkIHRvIHRoZSBTaWduYWwuXG4gICAgICAgICAqL1xuICAgICAgICBnZXROdW1MaXN0ZW5lcnMgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYmluZGluZ3MubGVuZ3RoO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9wIHByb3BhZ2F0aW9uIG9mIHRoZSBldmVudCwgYmxvY2tpbmcgdGhlIGRpc3BhdGNoIHRvIG5leHQgbGlzdGVuZXJzIG9uIHRoZSBxdWV1ZS5cbiAgICAgICAgICogPHA+PHN0cm9uZz5JTVBPUlRBTlQ6PC9zdHJvbmc+IHNob3VsZCBiZSBjYWxsZWQgb25seSBkdXJpbmcgc2lnbmFsIGRpc3BhdGNoLCBjYWxsaW5nIGl0IGJlZm9yZS9hZnRlciBkaXNwYXRjaCB3b24ndCBhZmZlY3Qgc2lnbmFsIGJyb2FkY2FzdC48L3A+XG4gICAgICAgICAqIEBzZWUgU2lnbmFsLnByb3RvdHlwZS5kaXNhYmxlXG4gICAgICAgICAqL1xuICAgICAgICBoYWx0IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fc2hvdWxkUHJvcGFnYXRlID0gZmFsc2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERpc3BhdGNoL0Jyb2FkY2FzdCBTaWduYWwgdG8gYWxsIGxpc3RlbmVycyBhZGRlZCB0byB0aGUgcXVldWUuXG4gICAgICAgICAqIEBwYXJhbSB7Li4uKn0gW3BhcmFtc10gUGFyYW1ldGVycyB0aGF0IHNob3VsZCBiZSBwYXNzZWQgdG8gZWFjaCBoYW5kbGVyLlxuICAgICAgICAgKi9cbiAgICAgICAgZGlzcGF0Y2ggOiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICBpZiAoISB0aGlzLmFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHBhcmFtc0FyciA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICAgICAgICAgICAgbiA9IHRoaXMuX2JpbmRpbmdzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBiaW5kaW5ncztcblxuICAgICAgICAgICAgaWYgKHRoaXMubWVtb3JpemUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2UGFyYW1zID0gcGFyYW1zQXJyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoISBuKSB7XG4gICAgICAgICAgICAgICAgLy9zaG91bGQgY29tZSBhZnRlciBtZW1vcml6ZVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYmluZGluZ3MgPSB0aGlzLl9iaW5kaW5ncy5zbGljZSgpOyAvL2Nsb25lIGFycmF5IGluIGNhc2UgYWRkL3JlbW92ZSBpdGVtcyBkdXJpbmcgZGlzcGF0Y2hcbiAgICAgICAgICAgIHRoaXMuX3Nob3VsZFByb3BhZ2F0ZSA9IHRydWU7IC8vaW4gY2FzZSBgaGFsdGAgd2FzIGNhbGxlZCBiZWZvcmUgZGlzcGF0Y2ggb3IgZHVyaW5nIHRoZSBwcmV2aW91cyBkaXNwYXRjaC5cblxuICAgICAgICAgICAgLy9leGVjdXRlIGFsbCBjYWxsYmFja3MgdW50aWwgZW5kIG9mIHRoZSBsaXN0IG9yIHVudGlsIGEgY2FsbGJhY2sgcmV0dXJucyBgZmFsc2VgIG9yIHN0b3BzIHByb3BhZ2F0aW9uXG4gICAgICAgICAgICAvL3JldmVyc2UgbG9vcCBzaW5jZSBsaXN0ZW5lcnMgd2l0aCBoaWdoZXIgcHJpb3JpdHkgd2lsbCBiZSBhZGRlZCBhdCB0aGUgZW5kIG9mIHRoZSBsaXN0XG4gICAgICAgICAgICBkbyB7IG4tLTsgfSB3aGlsZSAoYmluZGluZ3Nbbl0gJiYgdGhpcy5fc2hvdWxkUHJvcGFnYXRlICYmIGJpbmRpbmdzW25dLmV4ZWN1dGUocGFyYW1zQXJyKSAhPT0gZmFsc2UpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGb3JnZXQgbWVtb3JpemVkIGFyZ3VtZW50cy5cbiAgICAgICAgICogQHNlZSBTaWduYWwubWVtb3JpemVcbiAgICAgICAgICovXG4gICAgICAgIGZvcmdldCA6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLl9wcmV2UGFyYW1zID0gbnVsbDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIGFsbCBiaW5kaW5ncyBmcm9tIHNpZ25hbCBhbmQgZGVzdHJveSBhbnkgcmVmZXJlbmNlIHRvIGV4dGVybmFsIG9iamVjdHMgKGRlc3Ryb3kgU2lnbmFsIG9iamVjdCkuXG4gICAgICAgICAqIDxwPjxzdHJvbmc+SU1QT1JUQU5UOjwvc3Ryb25nPiBjYWxsaW5nIGFueSBtZXRob2Qgb24gdGhlIHNpZ25hbCBpbnN0YW5jZSBhZnRlciBjYWxsaW5nIGRpc3Bvc2Ugd2lsbCB0aHJvdyBlcnJvcnMuPC9wPlxuICAgICAgICAgKi9cbiAgICAgICAgZGlzcG9zZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQWxsKCk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYmluZGluZ3M7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fcHJldlBhcmFtcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7c3RyaW5nfSBTdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgIHRvU3RyaW5nIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICdbU2lnbmFsIGFjdGl2ZTonKyB0aGlzLmFjdGl2ZSArJyBudW1MaXN0ZW5lcnM6JysgdGhpcy5nZXROdW1MaXN0ZW5lcnMoKSArJ10nO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG5cbiAgICAvLyBOYW1lc3BhY2UgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIFNpZ25hbHMgbmFtZXNwYWNlXG4gICAgICogQG5hbWVzcGFjZVxuICAgICAqIEBuYW1lIHNpZ25hbHNcbiAgICAgKi9cbiAgICB2YXIgc2lnbmFscyA9IFNpZ25hbDtcblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBldmVudCBicm9hZGNhc3RlclxuICAgICAqIEBzZWUgU2lnbmFsXG4gICAgICovXG4gICAgLy8gYWxpYXMgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IChzZWUgI2doLTQ0KVxuICAgIHNpZ25hbHMuU2lnbmFsID0gU2lnbmFsO1xuXG5cblxuICAgIC8vZXhwb3J0cyB0byBtdWx0aXBsZSBlbnZpcm9ubWVudHNcbiAgICBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpeyAvL0FNRFxuICAgICAgICBkZWZpbmUoZnVuY3Rpb24gKCkgeyByZXR1cm4gc2lnbmFsczsgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cyl7IC8vbm9kZVxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IHNpZ25hbHM7XG4gICAgfSBlbHNlIHsgLy9icm93c2VyXG4gICAgICAgIC8vdXNlIHN0cmluZyBiZWNhdXNlIG9mIEdvb2dsZSBjbG9zdXJlIGNvbXBpbGVyIEFEVkFOQ0VEX01PREVcbiAgICAgICAgLypqc2xpbnQgc3ViOnRydWUgKi9cbiAgICAgICAgZ2xvYmFsWydzaWduYWxzJ10gPSBzaWduYWxzO1xuICAgIH1cblxufSh0aGlzKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEJ1ZmZlclNvdXJjZShidWZmZXIsIGNvbnRleHQpIHtcbiAgICB0aGlzLmFkZChidWZmZXIpO1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9sb29wID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDsgLy8gQnVmZmVyU291cmNlTm9kZVxuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59XG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgdGhpcy5fYnVmZmVyID0gYnVmZmVyOyAvLyBBcnJheUJ1ZmZlclxuICAgIHJldHVybiB0aGlzLl9idWZmZXI7XG59O1xuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSwgb2Zmc2V0KSB7XG4gICAgaWYoZGVsYXkgPT09IHVuZGVmaW5lZCkgeyBkZWxheSA9IDA7IH1cbiAgICBpZihkZWxheSA+IDApIHsgZGVsYXkgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZGVsYXk7IH1cblxuICAgIGlmKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7IG9mZnNldCA9IDA7IH1cbiAgICBpZih0aGlzLl9wYXVzZWRBdCA+IDApIHsgb2Zmc2V0ID0gb2Zmc2V0ICsgdGhpcy5fcGF1c2VkQXQ7IH1cblxuICAgIHRoaXMuc291cmNlTm9kZS5sb29wID0gdGhpcy5fbG9vcDtcbiAgICB0aGlzLnNvdXJjZU5vZGUub25lbmRlZCA9IHRoaXMuX2VuZGVkSGFuZGxlci5iaW5kKHRoaXMpO1xuICAgIHRoaXMuc291cmNlTm9kZS5zdGFydChkZWxheSwgb2Zmc2V0KTtcblxuICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9wYXVzZWRBdDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSBvZmZzZXQ7XG4gICAgfVxuXG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuXG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG59O1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gZWxhcHNlZDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgdGhpcy5fc291cmNlTm9kZS5vbmVuZGVkID0gbnVsbDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuc3RvcCgwKTtcbiAgICAgICAgfSBjYXRjaChlKSB7fVxuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG59O1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLl9lbmRlZEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICBpZih0eXBlb2YgdGhpcy5fZW5kZWRDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9lbmRlZENhbGxiYWNrKHRoaXMpO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9idWZmZXIgPyB0aGlzLl9idWZmZXIuZHVyYXRpb24gOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2xvb3AnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvb3A7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2xvb3AgPSAhIXZhbHVlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3BsYXlpbmcnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BsYXlpbmc7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgubWluKHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uLCAxKTtcbiAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAnc291cmNlTm9kZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLmJ1ZmZlciA9IHRoaXMuX2J1ZmZlcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICB9XG59KTtcblxuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gQnVmZmVyU291cmNlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc2lnbmFscyA9IHJlcXVpcmUoJ3NpZ25hbHMnKTtcblxuZnVuY3Rpb24gTG9hZGVyKCkge1xuICAgIHRoaXMub25DaGlsZENvbXBsZXRlID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG4gICAgdGhpcy5vbkNvbXBsZXRlID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG4gICAgdGhpcy5vblByb2dyZXNzID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG4gICAgdGhpcy5vbkVycm9yID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG5cbiAgICB0aGlzLnF1ZXVlID0gW107XG4gICAgdGhpcy5pbmRleCA9IDA7XG4gICAgdGhpcy5sb2FkZXJzID0ge307XG5cbiAgICB0aGlzLmxvYWRlZCA9IGZhbHNlO1xuICAgIHRoaXMubG9hZGluZyA9IGZhbHNlO1xuICAgIHRoaXMud2ViQXVkaW9Db250ZXh0ID0gbnVsbDtcbiAgICB0aGlzLmNyb3NzT3JpZ2luID0gZmFsc2U7XG4gICAgdGhpcy50b3VjaExvY2tlZCA9IGZhbHNlO1xuICAgIHRoaXMubnVtVG90YWwgPSAwO1xuICAgIHRoaXMubnVtTG9hZGVkID0gMDtcbn1cblxuTG9hZGVyLnByb3RvdHlwZSA9IHtcbiAgICBhZGQ6IGZ1bmN0aW9uKHVybCkge1xuICAgICAgICB2YXIgbG9hZGVyID0gbmV3IExvYWRlci5GaWxlKHVybCk7XG4gICAgICAgIGxvYWRlci53ZWJBdWRpb0NvbnRleHQgPSB0aGlzLndlYkF1ZGlvQ29udGV4dDtcbiAgICAgICAgbG9hZGVyLmNyb3NzT3JpZ2luID0gdGhpcy5jcm9zc09yaWdpbjtcbiAgICAgICAgbG9hZGVyLnRvdWNoTG9ja2VkID0gdGhpcy50b3VjaExvY2tlZDtcbiAgICAgICAgdGhpcy5xdWV1ZS5wdXNoKGxvYWRlcik7XG4gICAgICAgIHRoaXMubG9hZGVyc1tsb2FkZXIudXJsXSA9IGxvYWRlcjtcbiAgICAgICAgdGhpcy5udW1Ub3RhbCsrO1xuICAgICAgICByZXR1cm4gbG9hZGVyO1xuICAgIH0sXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLm51bVRvdGFsID0gdGhpcy5xdWV1ZS5sZW5ndGg7XG4gICAgICAgIGlmKCF0aGlzLmxvYWRpbmcpIHtcbiAgICAgICAgICAgIHRoaXMubG9hZGluZyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHRoaXMucXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMub25Db21wbGV0ZS5kaXNwYXRjaCh0aGlzLmxvYWRlcnMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsb2FkZXIgPSB0aGlzLnF1ZXVlLnBvcCgpO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBwcm9ncmVzc0hhbmRsZXIgPSBmdW5jdGlvbihwcm9ncmVzcykge1xuICAgICAgICAgICAgdmFyIG51bUxvYWRlZCA9IHNlbGYubnVtTG9hZGVkICsgcHJvZ3Jlc3M7XG4gICAgICAgICAgICBpZihzZWxmLm9uUHJvZ3Jlc3MuZ2V0TnVtTGlzdGVuZXJzKCkgPiAwKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vblByb2dyZXNzLmRpc3BhdGNoKG51bUxvYWRlZC9zZWxmLm51bVRvdGFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgbG9hZGVyLm9uUHJvZ3Jlc3MuYWRkKHByb2dyZXNzSGFuZGxlcik7XG4gICAgICAgIHZhciBjb21wbGV0ZUhhbmRsZXIgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgbG9hZGVyLm9uUHJvZ3Jlc3MucmVtb3ZlKHByb2dyZXNzSGFuZGxlcik7XG4gICAgICAgICAgICBzZWxmLm51bUxvYWRlZCsrO1xuICAgICAgICAgICAgaWYoc2VsZi5vblByb2dyZXNzLmdldE51bUxpc3RlbmVycygpID4gMCkge1xuICAgICAgICAgICAgICAgIHNlbGYub25Qcm9ncmVzcy5kaXNwYXRjaChzZWxmLm51bUxvYWRlZC9zZWxmLm51bVRvdGFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlbGYub25DaGlsZENvbXBsZXRlLmRpc3BhdGNoKGxvYWRlcik7XG4gICAgICAgICAgICBzZWxmLm5leHQoKTtcbiAgICAgICAgfTtcbiAgICAgICAgbG9hZGVyLm9uQmVmb3JlQ29tcGxldGUuYWRkT25jZShjb21wbGV0ZUhhbmRsZXIpO1xuICAgICAgICB2YXIgZXJyb3JIYW5kbGVyID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYub25FcnJvci5kaXNwYXRjaChsb2FkZXIpO1xuICAgICAgICAgICAgc2VsZi5uZXh0KCk7XG4gICAgICAgIH07XG4gICAgICAgIGxvYWRlci5vbkVycm9yLmFkZE9uY2UoZXJyb3JIYW5kbGVyKTtcbiAgICAgICAgbG9hZGVyLnN0YXJ0KCk7XG4gICAgfSxcbiAgICBhZGRNdWx0aXBsZTogZnVuY3Rpb24oYXJyYXkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5hZGQoYXJyYXlbaV0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBnZXQ6IGZ1bmN0aW9uKHVybCkge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2FkZXJzW3VybF07XG4gICAgfVxufTtcblxuTG9hZGVyLkZpbGUgPSBmdW5jdGlvbih1cmwpIHtcbiAgICB0aGlzLnVybCA9IHVybDtcblxuICAgIHRoaXMub25Qcm9ncmVzcyA9IG5ldyBzaWduYWxzLlNpZ25hbCgpO1xuICAgIHRoaXMub25CZWZvcmVDb21wbGV0ZSA9IG5ldyBzaWduYWxzLlNpZ25hbCgpO1xuICAgIHRoaXMub25Db21wbGV0ZSA9IG5ldyBzaWduYWxzLlNpZ25hbCgpO1xuICAgIHRoaXMub25FcnJvciA9IG5ldyBzaWduYWxzLlNpZ25hbCgpO1xuXG4gICAgdGhpcy53ZWJBdWRpb0NvbnRleHQgPSBudWxsO1xuICAgIHRoaXMuY3Jvc3NPcmlnaW4gPSBmYWxzZTtcbiAgICB0aGlzLnRvdWNoTG9ja2VkID0gZmFsc2U7XG4gICAgdGhpcy5wcm9ncmVzcyA9IDA7XG59O1xuXG5Mb2FkZXIuRmlsZS5wcm90b3R5cGUgPSB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZih0aGlzLndlYkF1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5sb2FkQXJyYXlCdWZmZXIodGhpcy53ZWJBdWRpb0NvbnRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2FkQXVkaW9FbGVtZW50KHRoaXMudG91Y2hMb2NrZWQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBsb2FkQXJyYXlCdWZmZXI6IGZ1bmN0aW9uKHdlYkF1ZGlvQ29udGV4dCkge1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByZXF1ZXN0Lm9wZW4oJ0dFVCcsIHRoaXMudXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJlcXVlc3Qub25wcm9ncmVzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuICAgICAgICAgICAgICAgIHNlbGYucHJvZ3Jlc3MgPSBldmVudC5sb2FkZWQgLyBldmVudC50b3RhbDtcbiAgICAgICAgICAgICAgICBzZWxmLm9uUHJvZ3Jlc3MuZGlzcGF0Y2goc2VsZi5wcm9ncmVzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB3ZWJBdWRpb0NvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcXVlc3QucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgIHNlbGYuZGF0YSA9IGJ1ZmZlcjtcbiAgICAgICAgICAgICAgICBzZWxmLnByb2dyZXNzID0gMTtcbiAgICAgICAgICAgICAgICBzZWxmLm9uUHJvZ3Jlc3MuZGlzcGF0Y2goMSk7XG4gICAgICAgICAgICAgICAgc2VsZi5vbkJlZm9yZUNvbXBsZXRlLmRpc3BhdGNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgc2VsZi5vbkNvbXBsZXRlLmRpc3BhdGNoKGJ1ZmZlcik7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzZWxmLm9uRXJyb3IuZGlzcGF0Y2goKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBzZWxmLm9uRXJyb3IuZGlzcGF0Y2goZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgICAgICB0aGlzLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIH0sXG4gICAgbG9hZEF1ZGlvRWxlbWVudDogZnVuY3Rpb24odG91Y2hMb2NrZWQpIHtcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgQXVkaW8oKTtcbiAgICAgICAgdGhpcy5kYXRhID0gcmVxdWVzdDtcbiAgICAgICAgcmVxdWVzdC5uYW1lID0gdGhpcy51cmw7XG4gICAgICAgIHJlcXVlc3QucHJlbG9hZCA9ICdhdXRvJztcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXF1ZXN0LnNyYyA9IHRoaXMudXJsO1xuICAgICAgICBpZiAoISF0b3VjaExvY2tlZCkge1xuICAgICAgICAgICAgdGhpcy5vblByb2dyZXNzLmRpc3BhdGNoKDEpO1xuICAgICAgICAgICAgdGhpcy5vbkNvbXBsZXRlLmRpc3BhdGNoKHRoaXMuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcmVhZHkgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHJlcXVlc3QucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCByZWFkeSk7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHNlbGYucHJvZ3Jlc3MgPSAxO1xuICAgICAgICAgICAgICAgIHNlbGYub25Qcm9ncmVzcy5kaXNwYXRjaCgxKTtcbiAgICAgICAgICAgICAgICBzZWxmLm9uQmVmb3JlQ29tcGxldGUuZGlzcGF0Y2goc2VsZi5kYXRhKTtcbiAgICAgICAgICAgICAgICBzZWxmLm9uQ29tcGxldGUuZGlzcGF0Y2goc2VsZi5kYXRhKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyB0aW1lb3V0IGJlY2F1c2Ugc29tZXRpbWVzIGNhbnBsYXl0aHJvdWdoIGRvZXNuJ3QgZmlyZVxuICAgICAgICAgICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KHJlYWR5LCAyMDAwKTtcbiAgICAgICAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCByZWFkeSwgZmFsc2UpO1xuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHNlbGYub25FcnJvci5kaXNwYXRjaCgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJlcXVlc3QubG9hZCgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBjYW5jZWw6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYodGhpcy5yZXF1ZXN0ICYmIHRoaXMucmVxdWVzdC5yZWFkeVN0YXRlICE9PSA0KSB7XG4gICAgICAgICAgdGhpcy5yZXF1ZXN0LmFib3J0KCk7XG4gICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2FkZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1lZGlhU291cmNlKGVsLCBjb250ZXh0KSB7XG4gICAgdGhpcy5hZGQoZWwpO1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9lbmRlZEhhbmRsZXJCb3VuZCA9IHRoaXMuX2VuZGVkSGFuZGxlci5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX2xvb3AgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIE1lZGlhTWVkaWFTb3VyY2VOb2RlXG59XG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihlbCkge1xuICAgIHRoaXMuX2VsID0gZWw7IC8vIEhUTUxNZWRpYUVsZW1lbnRcbiAgICByZXR1cm4gdGhpcy5fZWw7XG59O1xuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5LCBvZmZzZXQpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5fZGVsYXlUaW1lb3V0KTtcblxuICAgIHRoaXMudm9sdW1lID0gdGhpcy5fdm9sdW1lO1xuXG4gICAgaWYob2Zmc2V0KSB7XG4gICAgICAgIHRoaXMuX2VsLmN1cnJlbnRUaW1lID0gb2Zmc2V0O1xuICAgIH1cblxuICAgIGlmKGRlbGF5KSB7XG4gICAgICAgIHRoaXMuX2RlbGF5VGltZW91dCA9IHNldFRpbWVvdXQodGhpcy5wbGF5LmJpbmQodGhpcyksIGRlbGF5KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX2VsLnBsYXkoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcblxuICAgIHRoaXMuX2VsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQpO1xuICAgIHRoaXMuX2VsLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQsIGZhbHNlKTtcbn07XG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9kZWxheVRpbWVvdXQpO1xuXG4gICAgaWYoIXRoaXMuX2VsKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5fZWwucGF1c2UoKTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2RlbGF5VGltZW91dCk7XG5cbiAgICBpZighdGhpcy5fZWwpIHsgcmV0dXJuOyB9XG5cbiAgICB0aGlzLl9lbC5wYXVzZSgpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgdGhpcy5fZWwuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICAvLyBmaXhlcyBidWcgd2hlcmUgc2VydmVyIGRvZXNuJ3Qgc3VwcG9ydCBzZWVrOlxuICAgICAgICBpZih0aGlzLl9lbC5jdXJyZW50VGltZSA+IDApIHsgdGhpcy5fZWwubG9hZCgpOyB9ICAgIFxuICAgIH0gY2F0Y2goZSkge31cblxuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbn07XG5cbi8qXG4gKiBFbmRlZCBoYW5kbGVyXG4gKi9cblxuTWVkaWFTb3VyY2UucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG59O1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUuX2VuZGVkSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcblxuICAgIGlmKHRoaXMuX2xvb3ApIHtcbiAgICAgICAgdGhpcy5fZWwuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICAvLyBmaXhlcyBidWcgd2hlcmUgc2VydmVyIGRvZXNuJ3Qgc3VwcG9ydCBzZWVrOlxuICAgICAgICBpZih0aGlzLl9lbC5jdXJyZW50VGltZSA+IDApIHsgdGhpcy5fZWwubG9hZCgpOyB9XG4gICAgICAgIHRoaXMucGxheSgpO1xuICAgIH0gZWxzZSBpZih0eXBlb2YgdGhpcy5fZW5kZWRDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9lbmRlZENhbGxiYWNrKHRoaXMpO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdjdXJyZW50VGltZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWwgPyB0aGlzLl9lbC5jdXJyZW50VGltZSA6IDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWwgPyB0aGlzLl9lbC5kdXJhdGlvbiA6IDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdsb29wJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9sb29wID0gdmFsdWU7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ3BsYXlpbmcnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BsYXlpbmc7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdwcm9ncmVzcycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50VGltZSAvIHRoaXMuZHVyYXRpb247XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdzb3VyY2VOb2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlICYmIHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZU1lZGlhTWVkaWFTb3VyY2UodGhpcy5fZWwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgIH1cbn0pO1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IE1lZGlhU291cmNlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29udGV4dDtcblxuZnVuY3Rpb24gY3JlYXRlRmlsdGVyKHR5cGUsIGZyZXF1ZW5jeSkge1xuICAgIHZhciBmaWx0ZXJOb2RlID0gY29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICBmaWx0ZXJOb2RlLnR5cGUgPSB0eXBlO1xuICAgIGlmKGZyZXF1ZW5jeSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGZpbHRlck5vZGUuZnJlcXVlbmN5LnZhbHVlID0gZnJlcXVlbmN5O1xuICAgIH1cbiAgICByZXR1cm4gZmlsdGVyTm9kZTtcbn1cblxudmFyIGNyZWF0ZSA9IHtcbiAgICBnYWluOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICBpZih2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBub2RlLmdhaW4udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuICAgIHBhbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVQYW5uZXIoKTtcbiAgICAgICAgLy8gRGVmYXVsdCBmb3Igc3RlcmVvIGlzIEhSVEZcbiAgICAgICAgbm9kZS5wYW5uaW5nTW9kZWwgPSAnSFJURic7IC8vICdlcXVhbHBvd2VyJ1xuXG4gICAgICAgIC8vIERpc3RhbmNlIG1vZGVsIGFuZCBhdHRyaWJ1dGVzXG4gICAgICAgIG5vZGUuZGlzdGFuY2VNb2RlbCA9ICdsaW5lYXInOyAvLyAnbGluZWFyJyAnaW52ZXJzZScgJ2V4cG9uZW50aWFsJ1xuICAgICAgICBub2RlLnJlZkRpc3RhbmNlID0gMTtcbiAgICAgICAgbm9kZS5tYXhEaXN0YW5jZSA9IDEwMDA7XG4gICAgICAgIG5vZGUucm9sbG9mZkZhY3RvciA9IDE7XG5cbiAgICAgICAgLy8gVXNlcyBhIDNEIGNhcnRlc2lhbiBjb29yZGluYXRlIHN5c3RlbVxuICAgICAgICAvLyBub2RlLnNldFBvc2l0aW9uKDAsIDAsIDApO1xuICAgICAgICAvLyBub2RlLnNldE9yaWVudGF0aW9uKDEsIDAsIDApO1xuICAgICAgICAvLyBub2RlLnNldFZlbG9jaXR5KDAsIDAsIDApO1xuXG4gICAgICAgIC8vIERpcmVjdGlvbmFsIHNvdW5kIGNvbmUgLSBUaGUgY29uZSBhbmdsZXMgYXJlIGluIGRlZ3JlZXMgYW5kIHJ1biBmcm9tIDAgdG8gMzYwXG4gICAgICAgIC8vIG5vZGUuY29uZUlubmVyQW5nbGUgPSAzNjA7XG4gICAgICAgIC8vIG5vZGUuY29uZU91dGVyQW5nbGUgPSAzNjA7XG4gICAgICAgIC8vIG5vZGUuY29uZU91dGVyR2FpbiA9IDA7XG5cbiAgICAgICAgLy8gbm9ybWFsaXNlZCB2ZWNcbiAgICAgICAgLy8gbm9kZS5zZXRPcmllbnRhdGlvbih2ZWMueCwgdmVjLnksIHZlYy56KTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcbiAgICBmaWx0ZXI6IHtcbiAgICAgICAgbG93cGFzczogZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRmlsdGVyKCdsb3dwYXNzJywgZnJlcXVlbmN5KTtcbiAgICAgICAgfSxcbiAgICAgICAgaGlnaHBhc3M6IGZ1bmN0aW9uKGZyZXF1ZW5jeSkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUZpbHRlcignaGlnaHBhc3MnLCBmcmVxdWVuY3kpO1xuICAgICAgICB9LFxuICAgICAgICBiYW5kcGFzczogZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRmlsdGVyKCdiYW5kcGFzcycsIGZyZXF1ZW5jeSk7XG4gICAgICAgIH0sXG4gICAgICAgIGxvd3NoZWxmOiBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVGaWx0ZXIoJ2xvd3NoZWxmJywgZnJlcXVlbmN5KTtcbiAgICAgICAgfSxcbiAgICAgICAgaGlnaHNoZWxmOiBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVGaWx0ZXIoJ2hpZ2hzaGVsZicsIGZyZXF1ZW5jeSk7XG4gICAgICAgIH0sXG4gICAgICAgIHBlYWtpbmc6IGZ1bmN0aW9uKGZyZXF1ZW5jeSkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUZpbHRlcigncGVha2luZycsIGZyZXF1ZW5jeSk7XG4gICAgICAgIH0sXG4gICAgICAgIG5vdGNoOiBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVGaWx0ZXIoJ25vdGNoJywgZnJlcXVlbmN5KTtcbiAgICAgICAgfSxcbiAgICAgICAgYWxscGFzczogZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRmlsdGVyKCdhbGxwYXNzJywgZnJlcXVlbmN5KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZGVsYXk6IGZ1bmN0aW9uKGlucHV0LCB0aW1lLCBnYWluKSB7XG4gICAgICAgIHZhciBkZWxheU5vZGUgPSBjb250ZXh0LmNyZWF0ZURlbGF5KCk7XG4gICAgICAgIHZhciBnYWluTm9kZSA9IHRoaXMuZ2FpbihnYWluIHx8IDAuNSk7XG4gICAgICAgIGlmKHRpbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVsYXlOb2RlLmRlbGF5VGltZS52YWx1ZSA9IHRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgZGVsYXlOb2RlLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgICAgICBpZihpbnB1dCkge1xuICAgICAgICAgICAgaW5wdXQuY29ubmVjdChkZWxheU5vZGUpO1xuICAgICAgICAgICAgZ2Fpbk5vZGUuY29ubmVjdChpbnB1dCk7ICAgIFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkZWxheU5vZGU7XG4gICAgICAgIC8vID9cbiAgICAgICAgLypyZXR1cm4ge1xuICAgICAgICAgIGRlbGF5Tm9kZTogZGVsYXlOb2RlLFxuICAgICAgICAgIGdhaW5Ob2RlOiBnYWluTm9kZVxuICAgICAgICB9OyovXG4gICAgfSxcbiAgICBjb252b2x2ZXI6IGZ1bmN0aW9uKGltcHVsc2VSZXNwb25zZSkge1xuICAgICAgICAvLyBpbXB1bHNlUmVzcG9uc2UgaXMgYW4gYXVkaW8gZmlsZSBidWZmZXJcbiAgICAgICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZUNvbnZvbHZlcigpO1xuICAgICAgICBub2RlLmJ1ZmZlciA9IGltcHVsc2VSZXNwb25zZTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcbiAgICByZXZlcmI6IGZ1bmN0aW9uKHNlY29uZHMsIGRlY2F5LCByZXZlcnNlKSB7XG4gICAgICAgcmV0dXJuIHRoaXMuY29udm9sdmVyKHRoaXMuaW1wdWxzZVJlc3BvbnNlKHNlY29uZHMsIGRlY2F5LCByZXZlcnNlKSk7XG4gICAgfSxcbiAgICAvLyBUT0RPOiBzaG91bGQgcHJvYiBiZSBtb3ZlZCB0byB1dGlsczpcbiAgICBpbXB1bHNlUmVzcG9uc2U6IGZ1bmN0aW9uKHNlY29uZHMsIGRlY2F5LCByZXZlcnNlKSB7XG4gICAgICAgIC8vIGdlbmVyYXRlIGEgcmV2ZXJiIGVmZmVjdFxuICAgICAgICBzZWNvbmRzID0gc2Vjb25kcyB8fCAxO1xuICAgICAgICBkZWNheSA9IGRlY2F5IHx8IDU7XG4gICAgICAgIHJldmVyc2UgPSAhIXJldmVyc2U7XG5cbiAgICAgICAgdmFyIG51bUNoYW5uZWxzID0gMixcbiAgICAgICAgICAgIHJhdGUgPSBjb250ZXh0LnNhbXBsZVJhdGUsXG4gICAgICAgICAgICBsZW5ndGggPSByYXRlICogc2Vjb25kcyxcbiAgICAgICAgICAgIGltcHVsc2VSZXNwb25zZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKG51bUNoYW5uZWxzLCBsZW5ndGgsIHJhdGUpLFxuICAgICAgICAgICAgbGVmdCA9IGltcHVsc2VSZXNwb25zZS5nZXRDaGFubmVsRGF0YSgwKSxcbiAgICAgICAgICAgIHJpZ2h0ID0gaW1wdWxzZVJlc3BvbnNlLmdldENoYW5uZWxEYXRhKDEpLFxuICAgICAgICAgICAgbjtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBuID0gcmV2ZXJzZSA/IGxlbmd0aCAtIDEgOiBpO1xuICAgICAgICAgICAgbGVmdFtpXSA9IChNYXRoLnJhbmRvbSgpICogMiAtIDEpICogTWF0aC5wb3coMSAtIG4gLyBsZW5ndGgsIGRlY2F5KTtcbiAgICAgICAgICAgIHJpZ2h0W2ldID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBNYXRoLnBvdygxIC0gbiAvIGxlbmd0aCwgZGVjYXkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGltcHVsc2VSZXNwb25zZTtcbiAgICB9LFxuICAgIGFuYWx5c2VyOiBmdW5jdGlvbihmZnRTaXplKSB7XG4gICAgICAgIGZmdFNpemUgPSBmZnRTaXplIHx8IDEwMjQ7XG4gICAgICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICAgICAgICBub2RlLnNtb290aGluZ1RpbWVDb25zdGFudCA9IDAuODU7XG4gICAgICAgIC8vIHJlc29sdXRpb24gZmZ0U2l6ZTogMzIgLSAyMDQ4IChwb3cgMilcbiAgICAgICAgLy8gZnJlcXVlbmN5QmluQ291bnQgd2lsbCBiZSBoYWxmIHRoaXMgdmFsdWVcbiAgICAgICAgbm9kZS5mZnRTaXplID0gZmZ0U2l6ZTtcbiAgICAgICAgLy9ub2RlLm1pbkRlY2liZWxzID0gLTEwMDtcbiAgICAgICAgLy9ub2RlLm1heERlY2liZWxzID0gLTMwO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuICAgIGNvbXByZXNzb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBsb3dlcnMgdGhlIHZvbHVtZSBvZiB0aGUgbG91ZGVzdCBwYXJ0cyBvZiB0aGUgc2lnbmFsIGFuZCByYWlzZXMgdGhlIHZvbHVtZSBvZiB0aGUgc29mdGVzdCBwYXJ0c1xuICAgICAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlRHluYW1pY3NDb21wcmVzc29yKCk7XG4gICAgICAgIC8vIG1pbiBkZWNpYmVscyB0byBzdGFydCBjb21wcmVzc2luZyBhdCBmcm9tIC0xMDAgdG8gMFxuICAgICAgICBub2RlLnRocmVzaG9sZC52YWx1ZSA9IC0yNDtcbiAgICAgICAgLy8gZGVjaWJlbCB2YWx1ZSB0byBzdGFydCBjdXJ2ZSB0byBjb21wcmVzc2VkIHZhbHVlIGZyb20gMCB0byA0MFxuICAgICAgICBub2RlLmtuZWUudmFsdWUgPSAzMDtcbiAgICAgICAgLy8gYW1vdW50IG9mIGNoYW5nZSBwZXIgZGVjaWJlbCBmcm9tIDEgdG8gMjBcbiAgICAgICAgbm9kZS5yYXRpby52YWx1ZSA9IDEyO1xuICAgICAgICAvLyBnYWluIHJlZHVjdGlvbiBjdXJyZW50bHkgYXBwbGllZCBieSBjb21wcmVzc29yIGZyb20gLTIwIHRvIDBcbiAgICAgICAgLy8gbm9kZS5yZWR1Y3Rpb24udmFsdWVcbiAgICAgICAgLy8gc2Vjb25kcyB0byByZWR1Y2UgZ2FpbiBieSAxMGRiIGZyb20gMCB0byAxIC0gaG93IHF1aWNrbHkgc2lnbmFsIGFkYXB0ZWQgd2hlbiB2b2x1bWUgaW5jcmVhc2VkXG4gICAgICAgIG5vZGUuYXR0YWNrLnZhbHVlID0gMC4wMDAzO1xuICAgICAgICAvLyBzZWNvbmRzIHRvIGluY3JlYXNlIGdhaW4gYnkgMTBkYiBmcm9tIDAgdG8gMSAtIGhvdyBxdWlja2x5IHNpZ25hbCBhZGFwdGVkIHdoZW4gdm9sdW1lIHJlZGN1Y2VkXG4gICAgICAgIG5vZGUucmVsZWFzZS52YWx1ZSA9IDAuMjU7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG4gICAgZGlzdG9ydGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVXYXZlU2hhcGVyKCk7XG4gICAgICAgIC8vIEZsb2F0MzJBcnJheSBkZWZpbmluZyBjdXJ2ZSAodmFsdWVzIGFyZSBpbnRlcnBvbGF0ZWQpXG4gICAgICAgIC8vbm9kZS5jdXJ2ZVxuICAgICAgICAvLyB1cC1zYW1wbGUgYmVmb3JlIGFwcGx5aW5nIGN1cnZlIGZvciBiZXR0ZXIgcmVzb2x1dGlvbiByZXN1bHQgJ25vbmUnLCAnMngnIG9yICc0eCdcbiAgICAgICAgLy9ub2RlLm92ZXJzYW1wbGUgPSAnMngnO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuICAgIHNjcmlwdFByb2Nlc3NvcjogZnVuY3Rpb24oYnVmZmVyU2l6ZSwgaW5wdXRDaGFubmVscywgb3V0cHV0Q2hhbm5lbHMsIGNhbGxiYWNrLCBjYWxsYmFja0NvbnRleHQpIHtcbiAgICAgICAgLy8gYnVmZmVyU2l6ZSAyNTYgLSAxNjM4NCAocG93IDIpXG4gICAgICAgIGJ1ZmZlclNpemUgPSBidWZmZXJTaXplIHx8IDEwMjQ7XG4gICAgICAgIGlucHV0Q2hhbm5lbHMgPSBpbnB1dENoYW5uZWxzID09PSB1bmRlZmluZWQgPyAwIDogaW5wdXRDaGFubmVscztcbiAgICAgICAgb3V0cHV0Q2hhbm5lbHMgPSBvdXRwdXRDaGFubmVscyA9PT0gdW5kZWZpbmVkID8gMSA6IG91dHB1dENoYW5uZWxzO1xuICAgICAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKGJ1ZmZlclNpemUsIGlucHV0Q2hhbm5lbHMsIG91dHB1dENoYW5uZWxzKTtcbiAgICAgICAgLy9ub2RlLm9uYXVkaW9wcm9jZXNzID0gY2FsbGJhY2suYmluZChjYWxsYmFja0NvbnRleHR8fCBub2RlKTtcbiAgICAgICAgbm9kZS5vbmF1ZGlvcHJvY2VzcyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgLy8gYXZhaWxhYmxlIHByb3BzOlxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIGV2ZW50LmlucHV0QnVmZmVyXG4gICAgICAgICAgICBldmVudC5vdXRwdXRCdWZmZXJcbiAgICAgICAgICAgIGV2ZW50LnBsYXliYWNrVGltZVxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIC8vIEV4YW1wbGU6IGdlbmVyYXRlIG5vaXNlXG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgdmFyIG91dHB1dCA9IGV2ZW50Lm91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgICAgIHZhciBsID0gb3V0cHV0Lmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0W2ldID0gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICovXG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKGNhbGxiYWNrQ29udGV4dCB8fCB0aGlzLCBldmVudCk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG4gICAgLy8gY3JlYXRlcyBNZWRpYVN0cmVhbUF1ZGlvU291cmNlTm9kZVxuICAgIG1pY3JvcGhvbmVTb3VyY2U6IGZ1bmN0aW9uKHN0cmVhbSwgY29ubmVjdFRvKSB7XG4gICAgICAgIHZhciBtZWRpYVN0cmVhbVNvdXJjZSA9IGNvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2UoIHN0cmVhbSApO1xuICAgICAgICBpZihjb25uZWN0VG8pIHtcbiAgICAgICAgICAgIG1lZGlhU3RyZWFtU291cmNlLmNvbm5lY3QoY29ubmVjdFRvKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBIQUNLOiBzdG9wcyBtb3ogZ2FyYmFnZSBjb2xsZWN0aW9uIGtpbGxpbmcgdGhlIHN0cmVhbVxuICAgICAgICAvLyBzZWUgaHR0cHM6Ly9zdXBwb3J0Lm1vemlsbGEub3JnL2VuLVVTL3F1ZXN0aW9ucy85ODQxNzlcbiAgICAgICAgaWYobmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSkge1xuICAgICAgICAgICAgd2luZG93Lm1vekhhY2sgPSBtZWRpYVN0cmVhbVNvdXJjZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWVkaWFTdHJlYW1Tb3VyY2U7XG4gICAgfVxufTtcblxuLypcbiAqIEZha2Ugbm9kZXMgLSBub3Qgc3VyZSBpZiB0aGlzIGlzIGEgZ29vZCBpZGVhP1xuICogVGhlIHVzYWdlIGlzIHRoYXQgY29kZSBjYW4gZmFpbCBzaWxlbnRseSAocmVtb3ZpbmcgbmVlZCBmb3IgY29uZGl0aW9uYWxzKVxuICovXG5cbnZhciBmbiA9IGZ1bmN0aW9uKCl7fTtcbnZhciBwYXJhbSA9IHsgdmFsdWU6IDEgfTtcbnZhciBmYWtlTm9kZSA9IHtcbiAgICBjb25uZWN0OmZuLFxuICAgIGRpc2Nvbm5lY3Q6Zm4sXG4gICAgLy8gZ2FpblxuICAgIGdhaW46e3ZhbHVlOiAxfSxcbiAgICAvLyBwYW5uZXJcbiAgICBwYW5uaW5nTW9kZWw6IDAsXG4gICAgc2V0UG9zaXRpb246IGZuLFxuICAgIHNldE9yaWVudGF0aW9uOiBmbixcbiAgICBzZXRWZWxvY2l0eTogZm4sXG4gICAgZGlzdGFuY2VNb2RlbDogMCxcbiAgICByZWZEaXN0YW5jZTogMCxcbiAgICBtYXhEaXN0YW5jZTogMCxcbiAgICByb2xsb2ZmRmFjdG9yOiAwLFxuICAgIGNvbmVJbm5lckFuZ2xlOiAzNjAsXG4gICAgY29uZU91dGVyQW5nbGU6IDM2MCxcbiAgICBjb25lT3V0ZXJHYWluOiAwLFxuICAgIC8vIGZpbHRlcjpcbiAgICB0eXBlOjAsXG4gICAgZnJlcXVlbmN5OiBwYXJhbSxcbiAgICAvLyBkZWxheVxuICAgIGRlbGF5VGltZTogcGFyYW0sXG4gICAgLy8gY29udm9sdmVyXG4gICAgYnVmZmVyOiAwLFxuICAgIC8vIGFuYWx5c2VyXG4gICAgc21vb3RoaW5nVGltZUNvbnN0YW50OiAwLFxuICAgIGZmdFNpemU6IDAsXG4gICAgbWluRGVjaWJlbHM6IDAsXG4gICAgbWF4RGVjaWJlbHM6IDAsXG4gICAgLy8gY29tcHJlc3NvclxuICAgIHRocmVzaG9sZDogcGFyYW0sXG4gICAga25lZTogcGFyYW0sXG4gICAgcmF0aW86IHBhcmFtLFxuICAgIGF0dGFjazogcGFyYW0sXG4gICAgcmVsZWFzZTogcGFyYW0sXG4gICAgLy8gZGlzdG9ydGlvblxuICAgIG92ZXJzYW1wbGU6IDAsXG4gICAgY3VydmU6IDBcbn07XG52YXIgcmV0dXJuRmFrZU5vZGUgPSBmdW5jdGlvbigpeyByZXR1cm4gZmFrZU5vZGU7IH07XG52YXIgZmFrZSA9IHtcbiAgICBnYWluOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHtnYWluOnt2YWx1ZTogMX0sIGNvbm5lY3Q6Zm4sIGRpc2Nvbm5lY3Q6Zm59O1xuICAgIH0sXG4gICAgcGFuOiByZXR1cm5GYWtlTm9kZSxcbiAgICBmaWx0ZXI6IHtcbiAgICAgICAgbG93cGFzczogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGhpZ2hwYXNzOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgYmFuZHBhc3M6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBsb3dzaGVsZjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGhpZ2hzaGVsZjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIHBlYWtpbmc6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBub3RjaDogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGFsbHBhc3M6IHJldHVybkZha2VOb2RlXG4gICAgfSxcbiAgICBkZWxheTogcmV0dXJuRmFrZU5vZGUsXG4gICAgY29udm9sdmVyOiByZXR1cm5GYWtlTm9kZSxcbiAgICByZXZlcmI6IHJldHVybkZha2VOb2RlLFxuICAgIGltcHVsc2VSZXNwb25zZTogZnVuY3Rpb24oKSB7IHJldHVybiBbXTsgfSxcbiAgICBhbmFseXNlcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgY29tcHJlc3NvcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgZGlzdG9ydGlvbjogcmV0dXJuRmFrZU5vZGUsXG4gICAgc2NyaXB0UHJvY2Vzc29yOiByZXR1cm5GYWtlTm9kZSxcbiAgICBtaWNyb3Bob25lU291cmNlOiByZXR1cm5GYWtlTm9kZVxufTtcblxuZnVuY3Rpb24gTm9kZUZhY3Rvcnkod2ViQXVkaW9Db250ZXh0KSB7XG4gICAgY29udGV4dCA9IHdlYkF1ZGlvQ29udGV4dDtcbiAgICByZXR1cm4gY29udGV4dCA/IGNyZWF0ZSA6IGZha2U7XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gTm9kZUZhY3Rvcnk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBCdWZmZXJTb3VyY2UgPSByZXF1aXJlKCcuL2J1ZmZlci1zb3VyY2UuanMnKSxcbiAgICBNZWRpYVNvdXJjZSA9IHJlcXVpcmUoJy4vbWVkaWEtc291cmNlLmpzJyksXG4gICAgbm9kZUZhY3RvcnkgPSByZXF1aXJlKCcuL25vZGUtZmFjdG9yeS5qcycpO1xuXG5mdW5jdGlvbiBTb3VuZChjb250ZXh0LCBkYXRhLCBkZXN0aW5hdGlvbikge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9kYXRhID0gbnVsbDtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9sb29wID0gZmFsc2U7XG4gICAgdGhpcy5fbm9kZUxpc3QgPSBbXTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheVdoZW5SZWFkeSA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcblxuICAgIHRoaXMuX2dhaW4gPSBub2RlRmFjdG9yeSh0aGlzLl9jb250ZXh0KS5nYWluKCk7XG4gICAgdGhpcy5fZ2Fpbi5jb25uZWN0KGRlc3RpbmF0aW9uIHx8IHRoaXMuX2NvbnRleHQuZGVzdGluYXRpb24pO1xuXG4gICAgdGhpcy5hZGQoZGF0YSk7XG59XG5cblNvdW5kLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgaWYoIWRhdGEpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB0aGlzLl9kYXRhID0gZGF0YTsgLy8gQXVkaW9CdWZmZXIgb3IgTWVkaWEgRWxlbWVudFxuICAgIC8vY29uc29sZS5sb2coJ2RhdGE6JywgdGhpcy5fZGF0YSk7XG4gICAgaWYodGhpcy5fZGF0YS50YWdOYW1lKSB7XG4gICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgTWVkaWFTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fc291cmNlID0gbmV3IEJ1ZmZlclNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgdGhpcy5fY3JlYXRlU291cmNlTm9kZSgpO1xuICAgIHRoaXMuX3NvdXJjZS5vbkVuZGVkKHRoaXMuX2VuZGVkSGFuZGxlciwgdGhpcyk7XG5cbiAgICAvLyBzaG91bGQgdGhpcyB0YWtlIGFjY291bnQgb2YgZGVsYXkgYW5kIG9mZnNldD9cbiAgICBpZih0aGlzLl9wbGF5V2hlblJlYWR5KSB7XG4gICAgICAgIHRoaXMucGxheSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cblNvdW5kLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXksIG9mZnNldCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2UpIHtcbiAgICAgICAgdGhpcy5fcGxheVdoZW5SZWFkeSA9IHRydWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB0aGlzLl9jcmVhdGVTb3VyY2VOb2RlKCk7XG4gICAgdGhpcy5fc291cmNlLmxvb3AgPSB0aGlzLl9sb29wO1xuXG4gICAgLy8gdXBkYXRlIHZvbHVtZSBuZWVkZWQgZm9yIG5vIHdlYmF1ZGlvXG4gICAgaWYoIXRoaXMuX2NvbnRleHQpIHsgdGhpcy52b2x1bWUgPSB0aGlzLnZvbHVtZTsgfVxuXG4gICAgdGhpcy5fc291cmNlLnBsYXkoZGVsYXksIG9mZnNldCk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvdW5kLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2UpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB0aGlzLl9zb3VyY2UucGF1c2UoKTtcbiAgICByZXR1cm4gdGhpczsgIFxufTtcblxuU291bmQucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7IHJldHVybiB0aGlzOyB9XG4gICAgdGhpcy5fc291cmNlLnN0b3AoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvdW5kLnByb3RvdHlwZS5zZWVrID0gZnVuY3Rpb24ocGVyY2VudCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2UpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLnBsYXkoMCwgdGhpcy5fc291cmNlLmR1cmF0aW9uICogcGVyY2VudCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICogTm9kZXNcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUuYWRkTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB0aGlzLl9ub2RlTGlzdC5wdXNoKG5vZGUpO1xuICAgIHRoaXMuX3VwZGF0ZUNvbm5lY3Rpb25zKCk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUucmVtb3ZlTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihub2RlID09PSB0aGlzLl9ub2RlTGlzdFtpXSkge1xuICAgICAgICAgICAgdGhpcy5fbm9kZUxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIG5vZGUuZGlzY29ubmVjdCgwKTtcbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLy8gc2hvdWxkIHNvdXJjZSBiZSBpdGVtIDAgaW4gbm9kZWxpc3QgYW5kIGRlc2luYXRpb24gbGFzdFxuLy8gcHJvYiBpcyBhZGROb2RlIG5lZWRzIHRvIGFkZCBiZWZvcmUgZGVzdGluYXRpb25cbi8vICsgc2hvdWxkIGl0IGJlIGNhbGxlZCBjaGFpbiBvciBzb21ldGhpbmcgbmljZXI/XG4vLyBmZWVscyBsaWtlIG5vZGUgbGlzdCBjb3VsZCBiZSBhIGxpbmtlZCBsaXN0Pz9cbi8vIGlmIGxpc3QubGFzdCBpcyBkZXN0aW5hdGlvbiBhZGRiZWZvcmVcblxuLypTb3VuZC5wcm90b3R5cGUuX3VwZGF0ZUNvbm5lY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy5fbm9kZUxpc3RbaS0xXS5jb25uZWN0KHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICB9XG59OyovXG4vKlNvdW5kLnByb3RvdHlwZS5fdXBkYXRlQ29ubmVjdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdfdXBkYXRlQ29ubmVjdGlvbnMnKTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlLmRpc2Nvbm5lY3QoMCk7XG4gICAgdGhpcy5fc291cmNlTm9kZS5jb25uZWN0KHRoaXMuX2dhaW4pO1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYoaSA9PT0gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJyAtIGNvbm5lY3Qgc291cmNlIHRvIG5vZGU6JywgdGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICAgICAgdGhpcy5fZ2Fpbi5kaXNjb25uZWN0KDApO1xuICAgICAgICAgICAgdGhpcy5fZ2Fpbi5jb25uZWN0KHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0OicsIHRoaXMuX25vZGVMaXN0W2ktMV0sICd0bycsIHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgICAgIHRoaXMuX25vZGVMaXN0W2ktMV0uZGlzY29ubmVjdCgwKTtcbiAgICAgICAgICAgIHRoaXMuX25vZGVMaXN0W2ktMV0uY29ubmVjdCh0aGlzLl9ub2RlTGlzdFtpXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jb25uZWN0VG8odGhpcy5fY29udGV4dC5kZXN0aW5hdGlvbik7XG59OyovXG5Tb3VuZC5wcm90b3R5cGUuX3VwZGF0ZUNvbm5lY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKCdfdXBkYXRlQ29ubmVjdGlvbnMnKTtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihpID09PSAwKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCcgLSBjb25uZWN0IHNvdXJjZSB0byBub2RlOicsIHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgICAgIC8vdGhpcy5fc291cmNlTm9kZS5kaXNjb25uZWN0KDApO1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5jb25uZWN0KHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2Nvbm5lY3Q6JywgdGhpcy5fbm9kZUxpc3RbaS0xXSwgJ3RvJywgdGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICAgICAgLy90aGlzLl9ub2RlTGlzdFtpLTFdLmRpc2Nvbm5lY3QoMCk7XG4gICAgICAgICAgICB0aGlzLl9ub2RlTGlzdFtpLTFdLmNvbm5lY3QodGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2codGhpcy5kZXN0aW5hdGlvbilcbiAgICBpZih0aGlzLmRlc3RpbmF0aW9uKSB7XG4gICAgICAgIHRoaXMuY29ubmVjdFRvKHRoaXMuZGVzdGluYXRpb24pO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLl9nYWluKSB7XG4gICAgICAgIHRoaXMuY29ubmVjdFRvKHRoaXMuX2dhaW4pO1xuICAgIH1cbn07XG5cbi8vIG9yIHNldHRlciBmb3IgZGVzdGluYXRpb24/XG4vKlNvdW5kLnByb3RvdHlwZS5jb25uZWN0VG8gPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIGwgPSB0aGlzLl9ub2RlTGlzdC5sZW5ndGg7XG4gICAgaWYobCA+IDApIHtcbiAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0OicsIHRoaXMuX25vZGVMaXN0W2wgLSAxXSwgJ3RvJywgbm9kZSk7XG4gICAgICAgIHRoaXMuX25vZGVMaXN0W2wgLSAxXS5kaXNjb25uZWN0KDApO1xuICAgICAgICB0aGlzLl9ub2RlTGlzdFtsIC0gMV0uY29ubmVjdChub2RlKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCcgeCBjb25uZWN0IHNvdXJjZSB0byBub2RlOicsIG5vZGUpO1xuICAgICAgICB0aGlzLl9nYWluLmRpc2Nvbm5lY3QoMCk7XG4gICAgICAgIHRoaXMuX2dhaW4uY29ubmVjdChub2RlKTtcbiAgICB9XG4gICAgdGhpcy5kZXN0aW5hdGlvbiA9IG5vZGU7XG59OyovXG5Tb3VuZC5wcm90b3R5cGUuY29ubmVjdFRvID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoO1xuICAgIGlmKGwgPiAwKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coJ2Nvbm5lY3Q6JywgdGhpcy5fbm9kZUxpc3RbbCAtIDFdLCAndG8nLCBub2RlKTtcbiAgICAgICAgLy90aGlzLl9ub2RlTGlzdFtsIC0gMV0uZGlzY29ubmVjdCgwKTtcbiAgICAgICAgdGhpcy5fbm9kZUxpc3RbbCAtIDFdLmNvbm5lY3Qobm9kZSk7XG4gICAgfVxuICAgIGVsc2UgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKCcgeCBjb25uZWN0IHNvdXJjZSB0byBub2RlOicsIG5vZGUpO1xuICAgICAgICAvL3RoaXMuX3NvdXJjZU5vZGUuZGlzY29ubmVjdCgwKTtcbiAgICAgICAgdGhpcy5fc291cmNlTm9kZS5jb25uZWN0KG5vZGUpO1xuICAgIH1cbiAgICB0aGlzLmRlc3RpbmF0aW9uID0gbm9kZTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuU291bmQucHJvdG90eXBlLl9jcmVhdGVTb3VyY2VOb2RlID0gZnVuY3Rpb24oKSB7XG4gICAgLy9jb25zb2xlLmxvZygnZ2V0IHNvdXJjZScsIHRoaXMuX3NvdXJjZU5vZGUpO1xuICAgIGlmKCF0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fc291cmNlLnNvdXJjZU5vZGU7XG4gICAgdGhpcy5fdXBkYXRlQ29ubmVjdGlvbnMoKTtcblxuICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUub25FbmRlZCA9IGZ1bmN0aW9uKGZuLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IGZuID8gZm4uYmluZChjb250ZXh0IHx8IHRoaXMpIDogbnVsbDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvdW5kLnByb3RvdHlwZS5fZW5kZWRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodHlwZW9mIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayh0aGlzKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG4vKlxuICogVE9ETzogc2V0IHVwIHNvIHNvdXJjZSBjYW4gYmUgc3RyZWFtLCBvc2NpbGxhdG9yLCBldGNcbiAqL1xuXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdsb29wJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9sb29wID0gISF2YWx1ZTtcbiAgICAgICAgaWYodGhpcy5fc291cmNlKSB7XG4gICAgICAgICAgdGhpcy5fc291cmNlLmxvb3AgPSB0aGlzLl9sb29wO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmR1cmF0aW9uIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuY3VycmVudFRpbWUgOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wcm9ncmVzcyA6IDA7XG4gIH1cbn0pO1xuXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICd2b2x1bWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dhaW4uZ2Fpbi52YWx1ZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYoaXNOYU4odmFsdWUpKSB7IHJldHVybjsgfVxuXG4gICAgICAgIHRoaXMuX2dhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuXG4gICAgICAgIGlmKHRoaXMuX2RhdGEgJiYgdGhpcy5fZGF0YS52b2x1bWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5fZGF0YS52b2x1bWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAncGxheWluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLnBsYXlpbmcgOiBmYWxzZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLnBhdXNlZCA6IGZhbHNlO1xuICAgIH1cbn0pO1xuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gU291bmQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFN1cHBvcnQoKSB7XG4gICAgdGhpcy5faW5pdCgpO1xufVxuXG5TdXBwb3J0LnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F1ZGlvJyk7XG4gICAgaWYoIWVsKSB7IHJldHVybiBbXTsgfVxuXG4gICAgdmFyIHRlc3RzID0gW1xuICAgICAgICB7IGV4dDogJ29nZycsIHR5cGU6ICdhdWRpby9vZ2c7IGNvZGVjcz1cInZvcmJpc1wiJyB9LFxuICAgICAgICB7IGV4dDogJ21wMycsIHR5cGU6ICdhdWRpby9tcGVnOycgfSxcbiAgICAgICAgeyBleHQ6ICdvcHVzJywgdHlwZTogJ2F1ZGlvL29nZzsgY29kZWNzPVwib3B1c1wiJyB9LFxuICAgICAgICB7IGV4dDogJ3dhdicsIHR5cGU6ICdhdWRpby93YXY7IGNvZGVjcz1cIjFcIicgfSxcbiAgICAgICAgeyBleHQ6ICdtNGEnLCB0eXBlOiAnYXVkaW8veC1tNGE7JyB9LFxuICAgICAgICB7IGV4dDogJ200YScsIHR5cGU6ICdhdWRpby9hYWM7JyB9XG4gICAgXTtcblxuICAgIHRoaXMuX2V4dGVuc2lvbnMgPSBbXTtcbiAgICB0aGlzLl9jYW5QbGF5ID0ge307XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRlc3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB0ZXN0ID0gdGVzdHNbaV07XG4gICAgICAgIHZhciBjYW5QbGF5VHlwZSA9ICEhZWwuY2FuUGxheVR5cGUodGVzdC50eXBlKTtcbiAgICAgICAgaWYoY2FuUGxheVR5cGUpIHtcbiAgICAgICAgICAgIHRoaXMuX2V4dGVuc2lvbnMucHVzaCh0ZXN0LmV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2FuUGxheVt0ZXN0LmV4dF0gPSBjYW5QbGF5VHlwZTtcbiAgICB9XG59O1xuXG5TdXBwb3J0LnByb3RvdHlwZS5nZXRGaWxlRXh0ZW5zaW9uID0gZnVuY3Rpb24odXJsKSB7XG4gICAgdXJsID0gdXJsLnNwbGl0KCc/JylbMF07XG4gICAgdXJsID0gdXJsLnN1YnN0cih1cmwubGFzdEluZGV4T2YoJy8nKSArIDEpO1xuXG4gICAgdmFyIGEgPSB1cmwuc3BsaXQoJy4nKTtcbiAgICBpZihhLmxlbmd0aCA9PT0gMSB8fCAoYVswXSA9PT0gJycgJiYgYS5sZW5ndGggPT09IDIpKSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgcmV0dXJuIGEucG9wKCkudG9Mb3dlckNhc2UoKTtcbn07XG5cblN1cHBvcnQucHJvdG90eXBlLmdldFN1cHBvcnRlZEZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZXMpIHtcbiAgICAvLyBpZiBhcnJheSBnZXQgdGhlIGZpcnN0IG9uZSB0aGF0IHdvcmtzXG4gICAgaWYoZmlsZU5hbWVzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWxlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBleHQgPSB0aGlzLmdldEZpbGVFeHRlbnNpb24oZmlsZU5hbWVzW2ldKTtcbiAgICAgICAgICAgIHZhciBpbmQgPSB0aGlzLl9leHRlbnNpb25zLmluZGV4T2YoZXh0KTtcbiAgICAgICAgICAgIGlmKGluZCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVOYW1lc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBpZiBub3QgYXJyYXkgYW5kIGlzIG9iamVjdFxuICAgIGVsc2UgaWYoZmlsZU5hbWVzIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgIGZvcih2YXIga2V5IGluIGZpbGVOYW1lcykge1xuICAgICAgICAgICAgdmFyIGV4dGVuc2lvbiA9IHRoaXMuZ2V0RmlsZUV4dGVuc2lvbihmaWxlTmFtZXNba2V5XSk7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSB0aGlzLl9leHRlbnNpb25zLmluZGV4T2YoZXh0ZW5zaW9uKTtcbiAgICAgICAgICAgIGlmKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmlsZU5hbWVzW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gaWYgc3RyaW5nIGp1c3QgcmV0dXJuXG4gICAgcmV0dXJuIGZpbGVOYW1lcztcbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTdXBwb3J0LnByb3RvdHlwZSwgJ2V4dGVuc2lvbnMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4dGVuc2lvbnM7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTdXBwb3J0LnByb3RvdHlwZSwgJ2NhblBsYXknLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhblBsYXk7XG4gICAgfVxufSk7XG5cbi8qXG4gKiBFeHBvcnRzXG4gKi9cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBuZXcgU3VwcG9ydCgpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4gZnVuY3Rpb24gVXRpbHMoY29udGV4dCkge1xuICAgIGZ1bmN0aW9uIHBhcnNlTnVtKHgpIHtcbiAgICAgICAgcmV0dXJuIGlzTmFOKHgpID8gMCA6IHBhcnNlRmxvYXQoeCwgMTApO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGZhZGU6IGZ1bmN0aW9uKGdhaW5Ob2RlLCB2YWx1ZSwgZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmdhaW4ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUodmFsdWUsIGNvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgICAgIH0sXG4gICAgICAgIHBhbkhhbmRsZXI6IGZ1bmN0aW9uKHBhbm5lcikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAvLyBwYW4gbGVmdCB0byByaWdodCB3aXRoIHZhbHVlIGZyb20gLTEgdG8gMVxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHggZnJvbSAtTWF0aC5QSS80IHRvIE1hdGguUEkvNCAoLTQ1IHRvIDQ1IGRlZylcbiAgICAgICAgICAgICAgICAgICAgdmFyIHggPSBwYXJzZUZsb2F0KHZhbHVlLCAxMCkgKiBNYXRoLlBJIC8gNDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHogPSB4ICsgTWF0aC5QSSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIGlmICh6ID4gTWF0aC5QSSAvIDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHogPSBNYXRoLlBJIC0gejtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB4ID0gTWF0aC5zaW4oeCk7XG4gICAgICAgICAgICAgICAgICAgIHogPSBNYXRoLnNpbih6KTtcbiAgICAgICAgICAgICAgICAgICAgcGFubmVyLnNldFBvc2l0aW9uKHgsIDAsIHopO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeHl6OiBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgICAgICAgICAgICAgIHggPSBwYXJzZU51bSh4KTtcbiAgICAgICAgICAgICAgICAgICAgeSA9IHBhcnNlTnVtKHkpO1xuICAgICAgICAgICAgICAgICAgICB6ID0gcGFyc2VOdW0oeik7XG4gICAgICAgICAgICAgICAgICAgIHBhbm5lci5zZXRQb3NpdGlvbih4LCB5LCB6KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldFNvdXJjZVBvc2l0aW9uOiBmdW5jdGlvbihwb3NpdGlvblZlYykge1xuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIHBvc2l0aW9uIG9mIHRoZSBzb3VyY2UgKHdoZXJlIHRoZSBhdWRpbyBpcyBjb21pbmcgZnJvbSlcbiAgICAgICAgICAgICAgICAgICAgcGFubmVyLnNldFBvc2l0aW9uKHBvc2l0aW9uVmVjLngsIHBvc2l0aW9uVmVjLnksIHBvc2l0aW9uVmVjLnopO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0U291cmNlT3JpZW50YXRpb246IGZ1bmN0aW9uKGZvcndhcmRWZWMpIHsgLy8gZm9yd2FyZFZlYyA9IFRIUkVFLlZlY3RvcjNcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBhdWRpbyBzb3VyY2Ugb3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRPcmllbnRhdGlvbihwYW5uZXIsIGZvcndhcmRWZWMpO1xuICAgICAgICAgICAgICAgICAgICAvKi8vIHNldCB0aGUgb3JpZW50YXRpb24gb2YgdGhlIHNvdXJjZSAod2hlcmUgdGhlIGF1ZGlvIGlzIGNvbWluZyBmcm9tKVxuICAgICAgICAgICAgICAgICAgICAvL3ZhciBmdyA9IGZvcndhcmRWZWMuY2xvbmUoKS5ub3JtYWxpemUoKTsgPT5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGZ3ID0geyB4OiBmb3J3YXJkVmVjLngsIHk6IGZvcndhcmRWZWMueSwgejogZm9yd2FyZFZlYy56IH07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9ybWFsaXplKGZ3KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHVwIHZlYyAoIHVwID0gKGZvcndhcmQgY3Jvc3MgKDAsIDEsIDApKSBjcm9zcyBmb3J3YXJkIClcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdsb2JhbFVwID0geyB4OiAwLCB5OiAxLCB6OiAwIH07XG4gICAgICAgICAgICAgICAgICAgIC8vIHZhciB1cCA9IGZvcndhcmRWZWMuY2xvbmUoKS5jcm9zcyhnbG9iYWxVcCkuY3Jvc3MoZm9yd2FyZFZlYykubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cCA9IHsgeDogZm9yd2FyZFZlYy54LCB5OiBmb3J3YXJkVmVjLnksIHo6IGZvcndhcmRWZWMueiB9O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNyb3NzKHVwLCBnbG9iYWxVcCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3Jvc3ModXAsIGZvcndhcmRWZWMpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vcm1hbGl6ZSh1cCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCB0aGUgYXVkaW8gY29udGV4dCdzIGxpc3RlbmVyIHBvc2l0aW9uIHRvIG1hdGNoIHRoZSBjYW1lcmEgcG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgcGFubmVyLnNldE9yaWVudGF0aW9uKGZ3LngsIGZ3LnksIGZ3LnosIHVwLngsIHVwLnksIHVwLnopOyovXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXRMaXN0ZW5lclBvc2l0aW9uOiBmdW5jdGlvbihwb3NpdGlvblZlYykge1xuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIHBvc2l0aW9uIG9mIHRoZSBsaXN0ZW5lciAod2hvIGlzIGhlYXJpbmcgdGhlIGF1ZGlvKVxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0Lmxpc3RlbmVyLnNldFBvc2l0aW9uKHBvc2l0aW9uVmVjLngsIHBvc2l0aW9uVmVjLnksIHBvc2l0aW9uVmVjLnopO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0TGlzdGVuZXJPcmllbnRhdGlvbjogZnVuY3Rpb24oZm9yd2FyZFZlYykgeyAvLyBmb3J3YXJkVmVjID0gVEhSRUUuVmVjdG9yM1xuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIGF1ZGlvIGNvbnRleHQncyBsaXN0ZW5lciBwb3NpdGlvbiB0byBtYXRjaCB0aGUgY2FtZXJhIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0T3JpZW50YXRpb24oY29udGV4dC5saXN0ZW5lciwgZm9yd2FyZFZlYyk7XG4gICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCB0aGUgb3JpZW50YXRpb24gb2YgdGhlIGxpc3RlbmVyICh3aG8gaXMgaGVhcmluZyB0aGUgYXVkaW8pXG4gICAgICAgICAgICAgICAgICAgIHZhciBmdyA9IGZvcndhcmRWZWMuY2xvbmUoKS5ub3JtYWxpemUoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHVwIHZlYyAoIHVwID0gKGZvcndhcmQgY3Jvc3MgKDAsIDEsIDApKSBjcm9zcyBmb3J3YXJkIClcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdsb2JhbFVwID0geyB4OiAwLCB5OiAxLCB6OiAwIH07XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cCA9IGZvcndhcmRWZWMuY2xvbmUoKS5jcm9zcyhnbG9iYWxVcCkuY3Jvc3MoZm9yd2FyZFZlYykubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCB0aGUgYXVkaW8gY29udGV4dCdzIGxpc3RlbmVyIHBvc2l0aW9uIHRvIG1hdGNoIHRoZSBjYW1lcmEgcG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5saXN0ZW5lci5zZXRPcmllbnRhdGlvbihmdy54LCBmdy55LCBmdy56LCB1cC54LCB1cC55LCB1cC56KTtcbiAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRvcHBsZXI6IGZ1bmN0aW9uKHgsIHksIHosIGRlbHRhWCwgZGVsdGFZLCBkZWx0YVosIGRlbHRhVGltZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcmFja2luZyB0aGUgdmVsb2NpdHkgY2FuIGJlIGRvbmUgYnkgZ2V0dGluZyB0aGUgb2JqZWN0J3MgcHJldmlvdXMgcG9zaXRpb24sIHN1YnRyYWN0aW5nXG4gICAgICAgICAgICAgICAgICAgIC8vIGl0IGZyb20gdGhlIGN1cnJlbnQgcG9zaXRpb24gYW5kIGRpdmlkaW5nIHRoZSByZXN1bHQgYnkgdGhlIHRpbWUgZWxhcHNlZCBzaW5jZSBsYXN0IGZyYW1lXG4gICAgICAgICAgICAgICAgICAgIHBhbm5lci5zZXRQb3NpdGlvbih4LCB5LCB6KTtcbiAgICAgICAgICAgICAgICAgICAgcGFubmVyLnNldFZlbG9jaXR5KGRlbHRhWC9kZWx0YVRpbWUsIGRlbHRhWS9kZWx0YVRpbWUsIGRlbHRhWi9kZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0T3JpZW50YXRpb246IGZ1bmN0aW9uKG5vZGUsIGZvcndhcmRWZWMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBvcmllbnRhdGlvbiBvZiB0aGUgc291cmNlICh3aGVyZSB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG4gICAgICAgICAgICAgICAgICAgIC8vdmFyIGZ3ID0gZm9yd2FyZFZlYy5jbG9uZSgpLm5vcm1hbGl6ZSgpOyA9PlxuICAgICAgICAgICAgICAgICAgICB2YXIgZncgPSB7IHg6IGZvcndhcmRWZWMueCwgeTogZm9yd2FyZFZlYy55LCB6OiBmb3J3YXJkVmVjLnogfTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3JtYWxpemUoZncpO1xuICAgICAgICAgICAgICAgICAgICAvLyBjYWxjdWxhdGUgdXAgdmVjICggdXAgPSAoZm9yd2FyZCBjcm9zcyAoMCwgMSwgMCkpIGNyb3NzIGZvcndhcmQgKVxuICAgICAgICAgICAgICAgICAgICB2YXIgZ2xvYmFsVXAgPSB7IHg6IDAsIHk6IDEsIHo6IDAgfTtcbiAgICAgICAgICAgICAgICAgICAgLy8gdmFyIHVwID0gZm9yd2FyZFZlYy5jbG9uZSgpLmNyb3NzKGdsb2JhbFVwKS5jcm9zcyhmb3J3YXJkVmVjKS5ub3JtYWxpemUoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVwID0geyB4OiBmb3J3YXJkVmVjLngsIHk6IGZvcndhcmRWZWMueSwgejogZm9yd2FyZFZlYy56IH07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3Jvc3NQcm9kdWN0KHVwLCBnbG9iYWxVcCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3Jvc3NQcm9kdWN0KHVwLCBmb3J3YXJkVmVjKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3JtYWxpemUodXApO1xuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIGF1ZGlvIGNvbnRleHQncyBsaXN0ZW5lciBwb3NpdGlvbiB0byBtYXRjaCB0aGUgY2FtZXJhIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuc2V0T3JpZW50YXRpb24oZncueCwgZncueSwgZncueiwgdXAueCwgdXAueSwgdXAueik7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjcm9zc1Byb2R1Y3Q6IGZ1bmN0aW9uICggYSwgYiApIHtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgYXggPSBhLngsIGF5ID0gYS55LCBheiA9IGEuejtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJ4ID0gYi54LCBieSA9IGIueSwgYnogPSBiLno7XG5cbiAgICAgICAgICAgICAgICAgICAgYS54ID0gYXkgKiBieiAtIGF6ICogYnk7XG4gICAgICAgICAgICAgICAgICAgIGEueSA9IGF6ICogYnggLSBheCAqIGJ6O1xuICAgICAgICAgICAgICAgICAgICBhLnogPSBheCAqIGJ5IC0gYXkgKiBieDtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbm9ybWFsaXplOiBmdW5jdGlvbiAodmVjMykge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHZlYzMueCA9PT0gMCAmJiB2ZWMzLnkgPT09IDAgJiYgdmVjMy56ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmVjMztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBsZW5ndGggPSBNYXRoLnNxcnQoIHZlYzMueCAqIHZlYzMueCArIHZlYzMueSAqIHZlYzMueSArIHZlYzMueiAqIHZlYzMueiApO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpbnZTY2FsYXIgPSAxIC8gbGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB2ZWMzLnggKj0gaW52U2NhbGFyO1xuICAgICAgICAgICAgICAgICAgICB2ZWMzLnkgKj0gaW52U2NhbGFyO1xuICAgICAgICAgICAgICAgICAgICB2ZWMzLnogKj0gaW52U2NhbGFyO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2ZWMzO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgZmlsdGVyOiBmdW5jdGlvbihmaWx0ZXJOb2RlLCB2YWx1ZSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgICAgICAgICAgLy8gc2V0IGZpbHRlciBmcmVxdWVuY3kgYmFzZWQgb24gdmFsdWUgZnJvbSAwIHRvIDFcbiAgICAgICAgICAgIHZhbHVlID0gcGFyc2VGbG9hdCh2YWx1ZSwgMTApO1xuICAgICAgICAgICAgcXVhbGl0eSA9IHBhcnNlRmxvYXQocXVhbGl0eSwgMTApO1xuICAgICAgICAgICAgZ2FpbiA9IHBhcnNlRmxvYXQoZ2FpbiwgMTApO1xuICAgICAgICAgICAgLy8gR2V0IGJhY2sgdG8gdGhlIGZyZXF1ZW5jeSB2YWx1ZSBiZXR3ZWVuIG1pbiBhbmQgbWF4LlxuICAgICAgICAgICAgZmlsdGVyTm9kZS5mcmVxdWVuY3kudmFsdWUgPSB0aGlzLmdldEZyZXF1ZW5jeSh2YWx1ZSk7XG5cbiAgICAgICAgICAgIC8vZmlsdGVyTm9kZS5RLnZhbHVlID0gcXVhbGl0eTtcbiAgICAgICAgICAgIC8vZmlsdGVyTm9kZS5nYWluLnZhbHVlID0gZ2FpbjtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0RnJlcXVlbmN5OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgLy8gZ2V0IGZyZXF1ZW5jeSBieSBwYXNzaW5nIG51bWJlciBmcm9tIDAgdG8gMVxuICAgICAgICAgICAgLy8gQ2xhbXAgdGhlIGZyZXF1ZW5jeSBiZXR3ZWVuIHRoZSBtaW5pbXVtIHZhbHVlICg0MCBIeikgYW5kIGhhbGYgb2YgdGhlXG4gICAgICAgICAgICAvLyBzYW1wbGluZyByYXRlLlxuICAgICAgICAgICAgdmFyIG1pblZhbHVlID0gNDA7XG4gICAgICAgICAgICB2YXIgbWF4VmFsdWUgPSBjb250ZXh0LnNhbXBsZVJhdGUgLyAyO1xuICAgICAgICAgICAgLy8gTG9nYXJpdGhtIChiYXNlIDIpIHRvIGNvbXB1dGUgaG93IG1hbnkgb2N0YXZlcyBmYWxsIGluIHRoZSByYW5nZS5cbiAgICAgICAgICAgIHZhciBudW1iZXJPZk9jdGF2ZXMgPSBNYXRoLmxvZyhtYXhWYWx1ZSAvIG1pblZhbHVlKSAvIE1hdGguTE4yO1xuICAgICAgICAgICAgLy8gQ29tcHV0ZSBhIG11bHRpcGxpZXIgZnJvbSAwIHRvIDEgYmFzZWQgb24gYW4gZXhwb25lbnRpYWwgc2NhbGUuXG4gICAgICAgICAgICB2YXIgbXVsdGlwbGllciA9IE1hdGgucG93KDIsIG51bWJlck9mT2N0YXZlcyAqICh2YWx1ZSAtIDEuMCkpO1xuICAgICAgICAgICAgLy8gR2V0IGJhY2sgdG8gdGhlIGZyZXF1ZW5jeSB2YWx1ZSBiZXR3ZWVuIG1pbiBhbmQgbWF4LlxuICAgICAgICAgICAgcmV0dXJuIG1heFZhbHVlICogbXVsdGlwbGllcjtcbiAgICAgICAgfSxcbiAgICAgICAgZGlzdG9ydDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGNyZWF0ZSB3YXZlU2hhcGVyIGRpc3RvcnRpb24gY3VydmUgZnJvbSAwIHRvIDFcbiAgICAgICAgICAgIHZhciBrID0gdmFsdWUgKiAxMDAsXG4gICAgICAgICAgICAgICAgbiA9IDIyMDUwLFxuICAgICAgICAgICAgICAgIGN1cnZlID0gbmV3IEZsb2F0MzJBcnJheShuKSxcbiAgICAgICAgICAgICAgICBkZWcgPSBNYXRoLlBJIC8gMTgwO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciB4ID0gaSAqIDIgLyBuIC0gMTtcbiAgICAgICAgICAgICAgICBjdXJ2ZVtpXSA9ICgzICsgaykgKiB4ICogMjAgKiBkZWcgLyAoTWF0aC5QSSArIGsgKiBNYXRoLmFicyh4KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY3VydmU7XG4gICAgICAgIH0sXG4gICAgICAgIHdhdmVmb3JtRGF0YTogZnVuY3Rpb24oYnVmZmVyLCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLS0tLS0tLS0tJyk7XG4gICAgICAgICAgICBjb25zb2xlLnRpbWUoJ3dhdmVmb3JtRGF0YScpO1xuICAgICAgICAgICAgdmFyIHdhdmVmb3JtID0gbmV3IEZsb2F0MzJBcnJheShsZW5ndGgpLFxuICAgICAgICAgICAgICAgIGNodW5rID0gTWF0aC5mbG9vcihidWZmZXIubGVuZ3RoIC8gbGVuZ3RoKSxcbiAgICAgICAgICAgICAgICAvL2NodW5rID0gYnVmZmVyLmxlbmd0aCAvIGxlbmd0aCxcbiAgICAgICAgICAgICAgICByZXNvbHV0aW9uID0gNSwgLy8gMTBcbiAgICAgICAgICAgICAgICBpbmNyID0gTWF0aC5mbG9vcihjaHVuayAvIHJlc29sdXRpb24pLFxuICAgICAgICAgICAgICAgIGdyZWF0ZXN0ID0gMDtcblxuICAgICAgICAgICAgaWYoaW5jciA8IDEpIHsgaW5jciA9IDE7IH1cblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGNobmxzID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7IGkgPCBjaG5sczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgZWFjaCBjaGFubmVsXG4gICAgICAgICAgICAgICAgdmFyIGNoYW5uZWwgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSk7XG4gICAgICAgICAgICAgICAgLy9mb3IgKHZhciBqID0gbGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGdldCBoaWdoZXN0IHZhbHVlIHdpdGhpbiB0aGUgY2h1bmtcbiAgICAgICAgICAgICAgICAgICAgLy92YXIgY2ggPSBqICogY2h1bms7XG4gICAgICAgICAgICAgICAgICAgIC8vZm9yICh2YXIgayA9IGNoICsgY2h1bmsgLSAxOyBrID49IGNoOyBrIC09IGluY3IpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IGogKiBjaHVuaywgbCA9IGsgKyBjaHVuazsgayA8IGw7IGsgKz0gaW5jcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2VsZWN0IGhpZ2hlc3QgdmFsdWUgZnJvbSBjaGFubmVsc1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSBjaGFubmVsW2tdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYSA8IDApIHsgYSA9IC1hOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYSA+IHdhdmVmb3JtW2pdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2F2ZWZvcm1bal0gPSBhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIGhpZ2hlc3Qgb3ZlcmFsbCBmb3Igc2NhbGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYSA+IGdyZWF0ZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlc3QgPSBhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gc2NhbGUgdXA/XG4gICAgICAgICAgICB2YXIgc2NhbGUgPSAxIC8gZ3JlYXRlc3QsXG4gICAgICAgICAgICAgICAgbGVuID0gd2F2ZWZvcm0ubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgd2F2ZWZvcm1baV0gKj0gc2NhbGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ3dhdmVmb3JtRGF0YScpO1xuICAgICAgICAgICAgcmV0dXJuIHdhdmVmb3JtO1xuICAgICAgICB9LFxuICAgICAgICB3YXZlZm9ybUNhbnZhczogZnVuY3Rpb24oYXJyLCBoZWlnaHQsIGNvbG9yLCBiZ0NvbG9yLCBjYW52YXNFbCkge1xuICAgICAgICAvL3dhdmVmb3JtOiBmdW5jdGlvbihhcnIsIHdpZHRoLCBoZWlnaHQsIGNvbG9yLCBiZ0NvbG9yLCBjYW52YXNFbCkge1xuICAgICAgICAgICAgLy92YXIgYXJyID0gdGhpcy53YXZlZm9ybURhdGEoYnVmZmVyLCB3aWR0aCk7XG4gICAgICAgICAgICB2YXIgY2FudmFzID0gY2FudmFzRWwgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSBjYW52YXMud2lkdGggPSBhcnIubGVuZ3RoO1xuICAgICAgICAgICAgY2FudmFzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgICAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gY29sb3I7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9IGJnQ29sb3I7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAgICAgdmFyIHgsIHk7XG4gICAgICAgICAgICBjb25zb2xlLnRpbWUoJ3dhdmVmb3JtQ2FudmFzJyk7XG4gICAgICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcnIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgeCA9IGkgKyAwLjU7XG4gICAgICAgICAgICAgICAgeSA9IGhlaWdodCAtIE1hdGgucm91bmQoaGVpZ2h0ICogYXJyW2ldKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0Lm1vdmVUbyh4LCB5KTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmxpbmVUbyh4LCBoZWlnaHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGV4dC5zdHJva2UoKTtcbiAgICAgICAgICAgIGNvbnNvbGUudGltZUVuZCgnd2F2ZWZvcm1DYW52YXMnKTtcbiAgICAgICAgICAgIHJldHVybiBjYW52YXM7XG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVDb2RlOiBmdW5jdGlvbihzZWNvbmRzLCBkZWxpbSkge1xuICAgICAgICAgICAgaWYoZGVsaW0gPT09IHVuZGVmaW5lZCkgeyBkZWxpbSA9ICc6JzsgfVxuICAgICAgICAgICAgdmFyIGggPSBNYXRoLmZsb29yKHNlY29uZHMgLyAzNjAwKTtcbiAgICAgICAgICAgIHZhciBtID0gTWF0aC5mbG9vcigoc2Vjb25kcyAlIDM2MDApIC8gNjApO1xuICAgICAgICAgICAgdmFyIHMgPSBNYXRoLmZsb29yKChzZWNvbmRzICUgMzYwMCkgJSA2MCk7XG4gICAgICAgICAgICB2YXIgaHIgPSAoaCA9PT0gMCA/ICcnIDogKGggPCAxMCA/ICcwJyArIGggKyBkZWxpbSA6IGggKyBkZWxpbSkpO1xuICAgICAgICAgICAgdmFyIG1uID0gKG0gPCAxMCA/ICcwJyArIG0gOiBtKSArIGRlbGltO1xuICAgICAgICAgICAgdmFyIHNjID0gKHMgPCAxMCA/ICcwJyArIHMgOiBzKTtcbiAgICAgICAgICAgIHJldHVybiBociArIG1uICsgc2M7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFV0aWxzO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTG9hZGVyID0gcmVxdWlyZSgnLi9saWIvbG9hZGVyLmpzJyksXG4gICAgbm9kZUZhY3RvcnkgPSByZXF1aXJlKCcuL2xpYi9ub2RlLWZhY3RvcnkuanMnKSxcbiAgICBTb3VuZCA9IHJlcXVpcmUoJy4vbGliL3NvdW5kLmpzJyksXG4gICAgc3VwcG9ydCA9IHJlcXVpcmUoJy4vbGliL3N1cHBvcnQuanMnKSxcbiAgICBVdGlscyA9IHJlcXVpcmUoJy4vbGliL3V0aWxzLmpzJyk7XG5cbmZ1bmN0aW9uIFNvbm8oKSB7XG4gICAgdGhpcy5WRVJTSU9OID0gJzAuMC4wJztcblxuICAgIHRoaXMuY29udGV4dCA9IHRoaXMuY3JlYXRlQXVkaW9Db250ZXh0KCk7XG5cbiAgICB0aGlzLl9tYXN0ZXJHYWluID0gdGhpcy5jcmVhdGUuZ2FpbigpO1xuXG4gICAgaWYodGhpcy5jb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX21hc3RlckdhaW4uY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIH1cblxuICAgIHRoaXMuX3NvdW5kcyA9IFtdO1xuICAgIHRoaXMuX3N1cHBvcnQgPSBzdXBwb3J0O1xuXG4gICAgdGhpcy5oYW5kbGVUb3VjaGxvY2soKTtcbiAgICB0aGlzLmhhbmRsZVZpc2liaWxpdHkoKTtcbiAgICAvL3RoaXMubG9nKCk7XG59XG5cbi8qXG4gKiBhZGQgLSBkYXRhIGNhbiBiZSBlbGVtZW50LCBhcnJheWJ1ZmZlciBvciBhcyB5ZXQgbnVsbC91bmRlZmluZWRcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihkYXRhLCBpZCkge1xuXG4gICAgLy8gdHJ5IHRvIGxvYWQgaWYgdXJsIGlzIHB1dCBpbnRvIGFkZD9cbiAgICB2YXIgaXNBdWRpb0J1ZmZlciA9IGRhdGEgJiYgd2luZG93LkF1ZGlvQnVmZmVyICYmIGRhdGEgaW5zdGFuY2VvZiB3aW5kb3cuQXVkaW9CdWZmZXI7XG4gICAgdmFyIGlzTWVkaWFFbGVtZW50ID0gZGF0YSAmJiBkYXRhIGluc3RhbmNlb2Ygd2luZG93LkhUTUxNZWRpYUVsZW1lbnQ7XG4gICAgaWYoZGF0YSAmJiAhaXNBdWRpb0J1ZmZlciAmJiAhaXNNZWRpYUVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHMgPSB0aGlzLmxvYWQoZGF0YSk7XG4gICAgICAgIGlmKGlkKSB7IHMuaWQgPSBpZDsgfVxuICAgICAgICByZXR1cm4gcztcbiAgICB9XG5cbiAgICBpZihpZCAmJiB0aGlzLmdldChpZCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KGlkKTtcbiAgICB9XG5cbiAgICB2YXIgc291bmQgPSBuZXcgU291bmQodGhpcy5jb250ZXh0LCBkYXRhLCB0aGlzLl9tYXN0ZXJHYWluKTtcbiAgICBzb3VuZC5pZCA9IGlkIHx8IHRoaXMuY3JlYXRlSWQoKTtcbiAgICAvL3NvdW5kLmxvb3AgPSAhIWxvb3A7XG4gICAgc291bmQuYWRkKGRhdGEpO1xuICAgIHRoaXMuX3NvdW5kcy5wdXNoKHNvdW5kKTtcbiAgICByZXR1cm4gc291bmQ7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24odXJsLCBjYWxsYmFjaywgdGhpc0FyZywgYXNNZWRpYUVsZW1lbnQpIHtcbiAgICBpZighdGhpcy5fbG9hZGVyKSB7XG4gICAgICAgIHRoaXMuX2luaXRMb2FkZXIoKTtcbiAgICB9XG5cbiAgICAvLyBtdWx0aXBsZVxuICAgIGlmKHVybCBpbnN0YW5jZW9mIEFycmF5ICYmIHVybC5sZW5ndGggJiYgdHlwZW9mIHVybFswXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhpcy5sb2FkTXVsdGlwbGUodXJsLCBjYWxsYmFjaywgdGhpc0FyZywgYXNNZWRpYUVsZW1lbnQpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHNvdW5kID0gdGhpcy5xdWV1ZSh1cmwsIGFzTWVkaWFFbGVtZW50KTtcblxuICAgIGlmKGNhbGxiYWNrKSB7XG4gICAgICAgIHNvdW5kLmxvYWRlci5vbkNvbXBsZXRlLmFkZE9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgc291bmQpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzb3VuZC5sb2FkZXIuc3RhcnQoKTtcblxuICAgIHJldHVybiBzb3VuZDtcbn07XG5cblNvbm8ucHJvdG90eXBlLnF1ZXVlID0gZnVuY3Rpb24odXJsLCBhc01lZGlhRWxlbWVudCkge1xuICAgIGlmKCF0aGlzLl9sb2FkZXIpIHtcbiAgICAgICAgdGhpcy5faW5pdExvYWRlcigpO1xuICAgIH1cblxuICAgIHVybCA9IHN1cHBvcnQuZ2V0U3VwcG9ydGVkRmlsZSh1cmwpO1xuXG4gICAgdmFyIHNvdW5kID0gdGhpcy5hZGQoKTtcblxuICAgIHNvdW5kLmxvYWRlciA9IHRoaXMuX2xvYWRlci5hZGQodXJsKTtcbiAgICBzb3VuZC5sb2FkZXIub25CZWZvcmVDb21wbGV0ZS5hZGRPbmNlKGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICBzb3VuZC5hZGQoYnVmZmVyKTtcbiAgICB9KTtcblxuICAgIGlmKGFzTWVkaWFFbGVtZW50KSB7XG4gICAgICAgIHNvdW5kLmxvYWRlci53ZWJBdWRpb0NvbnRleHQgPSBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiBzb3VuZDtcbn07XG5cblNvbm8ucHJvdG90eXBlLmxvYWRNdWx0aXBsZSA9IGZ1bmN0aW9uKGNvbmZpZywgY29tcGxldGUsIHByb2dyZXNzLCB0aGlzQXJnLCBhc01lZGlhRWxlbWVudCkge1xuICAgIHZhciBzb3VuZHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNvbmZpZy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdmFyIGZpbGUgPSBjb25maWdbaV07XG5cbiAgICAgICAgdmFyIHNvdW5kID0gdGhpcy5xdWV1ZShmaWxlLnVybCwgYXNNZWRpYUVsZW1lbnQpO1xuICAgICAgICBzb3VuZC5pZCA9IGZpbGUuaWQ7XG4gICAgICAgIHNvdW5kcy5wdXNoKHNvdW5kKTtcbiAgICB9XG4gICAgaWYocHJvZ3Jlc3MpIHtcbiAgICAgICAgdGhpcy5fbG9hZGVyLm9uUHJvZ3Jlc3MuYWRkKGZ1bmN0aW9uKHApIHtcbiAgICAgICAgICAgIHByb2dyZXNzLmNhbGwodGhpc0FyZyB8fCB0aGlzLCBwKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmKGNvbXBsZXRlKSB7XG4gICAgICAgIHRoaXMuX2xvYWRlci5vbkNvbXBsZXRlLmFkZE9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb21wbGV0ZS5jYWxsKHRoaXNBcmcgfHwgdGhpcywgc291bmRzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHRoaXMuX2xvYWRlci5zdGFydCgpO1xufTtcblxuU29uby5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oc291bmRPcklkKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9zb3VuZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKHRoaXMuX3NvdW5kc1tpXSA9PT0gc291bmRPcklkIHx8IHRoaXMuX3NvdW5kc1tpXS5pZCA9PT0gc291bmRPcklkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc291bmRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufTtcblxuU29uby5wcm90b3R5cGUuY3JlYXRlSWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9pZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX2lkID0gMDtcbiAgICB9XG4gICAgdGhpcy5faWQrKztcbiAgICByZXR1cm4gdGhpcy5faWQudG9TdHJpbmcoMTApO1xufTtcblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuU29uby5wcm90b3R5cGUubXV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3ByZU11dGVWb2x1bWUgPSB0aGlzLnZvbHVtZTtcbiAgICB0aGlzLnZvbHVtZSA9IDA7XG59O1xuXG5Tb25vLnByb3RvdHlwZS51bk11dGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnZvbHVtZSA9IHRoaXMuX3ByZU11dGVWb2x1bWUgfHwgMTtcbn07XG5cblNvbm8ucHJvdG90eXBlLnBhdXNlQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9zb3VuZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKHRoaXMuX3NvdW5kc1tpXS5wbGF5aW5nKSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VuZHNbaV0ucGF1c2UoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblNvbm8ucHJvdG90eXBlLnJlc3VtZUFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5fc291bmRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZih0aGlzLl9zb3VuZHNbaV0ucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VuZHNbaV0ucGxheSgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuU29uby5wcm90b3R5cGUuc3RvcEFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5fc291bmRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLl9zb3VuZHNbaV0uc3RvcCgpO1xuICAgIH1cbn07XG5cblNvbm8ucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihpZCwgZGVsYXksIG9mZnNldCkge1xuICAgIHRoaXMuZ2V0KGlkKS5wbGF5KGRlbGF5LCBvZmZzZXQpO1xufTtcblxuU29uby5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuZ2V0KGlkKS5wYXVzZSgpO1xufTtcblxuU29uby5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy5nZXQoaWQpLnN0b3AoKTtcbn07XG5cbi8qXG4gKiBMb2FkaW5nXG4gKi9cblxuU29uby5wcm90b3R5cGUuX2luaXRMb2FkZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9sb2FkZXIgPSBuZXcgTG9hZGVyKCk7XG4gICAgdGhpcy5fbG9hZGVyLnRvdWNoTG9ja2VkID0gdGhpcy5faXNUb3VjaExvY2tlZDtcbiAgICB0aGlzLl9sb2FkZXIud2ViQXVkaW9Db250ZXh0ID0gdGhpcy5jb250ZXh0O1xuICAgIHRoaXMuX2xvYWRlci5jcm9zc09yaWdpbiA9IHRydWU7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5sb2FkQXJyYXlCdWZmZXIgPSBmdW5jdGlvbih1cmwsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgcmV0dXJuIHRoaXMubG9hZCh1cmwsIGNhbGxiYWNrLCB0aGlzQXJnLCBmYWxzZSk7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5sb2FkQXVkaW9FbGVtZW50ID0gZnVuY3Rpb24odXJsLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIHJldHVybiB0aGlzLmxvYWQodXJsLCBjYWxsYmFjaywgdGhpc0FyZywgdHJ1ZSk7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oc291bmRPcklkKSB7XG4gICAgdmFyIHNvdW5kO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5fc291bmRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBzb3VuZCA9IHRoaXMuX3NvdW5kc1tpXTtcbiAgICAgICAgaWYoc291bmQgPT09IHNvdW5kT3JJZCB8fCBzb3VuZC5pZCA9PT0gc291bmRPcklkKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZihzb3VuZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuX3NvdW5kcy5zcGxpY2UoaSwgMSk7XG5cbiAgICAgICAgaWYoc291bmQubG9hZGVyKSB7XG4gICAgICAgICAgICBzb3VuZC5sb2FkZXIuY2FuY2VsKCk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHNvdW5kLnN0b3AoKTsgICAgXG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICB9XG59O1xuXG4vKlxuICogQXVkaW8gY29udGV4dFxuICovXG5cblNvbm8ucHJvdG90eXBlLmNyZWF0ZUF1ZGlvQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb250ZXh0ID0gbnVsbDtcbiAgICB3aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuICAgIGlmKHdpbmRvdy5BdWRpb0NvbnRleHQpIHtcbiAgICAgICAgY29udGV4dCA9IG5ldyB3aW5kb3cuQXVkaW9Db250ZXh0KCk7XG4gICAgfVxuICAgIHJldHVybiBjb250ZXh0O1xufTtcblxuLypcbiAqIE1vYmlsZSB0b3VjaCBsb2NrXG4gKi9cblxuU29uby5wcm90b3R5cGUuaGFuZGxlVG91Y2hsb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudCxcbiAgICAgICAgbG9ja2VkID0gISF1YS5tYXRjaCgvQW5kcm9pZHx3ZWJPU3xpUGhvbmV8aVBhZHxpUG9kfEJsYWNrQmVycnl8SUVNb2JpbGV8T3BlcmEgTWluaS9pKSxcbiAgICAgICAgc2VsZiA9IHRoaXM7XG5cbiAgICB2YXIgdW5sb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHVubG9jayk7XG4gICAgICAgIHNlbGYuX2lzVG91Y2hMb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fbG9hZGVyLnRvdWNoTG9ja2VkID0gZmFsc2U7XG5cbiAgICAgICAgaWYoc2VsZi5jb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgYnVmZmVyID0gc2VsZi5jb250ZXh0LmNyZWF0ZUJ1ZmZlcigxLCAxLCAyMjA1MCk7XG4gICAgICAgICAgICB2YXIgdW5sb2NrU291cmNlID0gc2VsZi5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgICAgICAgICAgdW5sb2NrU291cmNlLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgICAgIHVubG9ja1NvdXJjZS5jb25uZWN0KHNlbGYuY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgICAgICAgICB1bmxvY2tTb3VyY2Uuc3RhcnQoMCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGlmKGxvY2tlZCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB1bmxvY2ssIGZhbHNlKTtcbiAgICB9XG4gICAgdGhpcy5faXNUb3VjaExvY2tlZCA9IGxvY2tlZDtcbn07XG5cbi8qXG4gKiBQYWdlIHZpc2liaWxpdHkgZXZlbnRzXG4gKi9cblxuU29uby5wcm90b3R5cGUuaGFuZGxlVmlzaWJpbGl0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYWdlSGlkZGVuUGF1c2VkID0gW10sXG4gICAgICAgIHNvdW5kcyA9IHRoaXMuX3NvdW5kcyxcbiAgICAgICAgaGlkZGVuLFxuICAgICAgICB2aXNpYmlsaXR5Q2hhbmdlO1xuXG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudC5oaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhpZGRlbiA9ICdoaWRkZW4nO1xuICAgICAgICB2aXNpYmlsaXR5Q2hhbmdlID0gJ3Zpc2liaWxpdHljaGFuZ2UnO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50Lm1vekhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ21vekhpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnbW96dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQubXNIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhpZGRlbiA9ICdtc0hpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnbXN2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC53ZWJraXRIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhpZGRlbiA9ICd3ZWJraXRIaWRkZW4nO1xuICAgICAgICB2aXNpYmlsaXR5Q2hhbmdlID0gJ3dlYmtpdHZpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cblxuICAgIC8vIHBhdXNlIGN1cnJlbnRseSBwbGF5aW5nIHNvdW5kcyBhbmQgc3RvcmUgcmVmc1xuICAgIGZ1bmN0aW9uIG9uSGlkZGVuKCkge1xuICAgICAgICB2YXIgbCA9IHNvdW5kcy5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc291bmQgPSBzb3VuZHNbaV07XG4gICAgICAgICAgICBpZihzb3VuZC5wbGF5aW5nKSB7XG4gICAgICAgICAgICAgICAgc291bmQucGF1c2UoKTtcbiAgICAgICAgICAgICAgICBwYWdlSGlkZGVuUGF1c2VkLnB1c2goc291bmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gcGxheSBzb3VuZHMgdGhhdCBnb3QgcGF1c2VkIHdoZW4gcGFnZSB3YXMgaGlkZGVuXG4gICAgZnVuY3Rpb24gb25TaG93bigpIHtcbiAgICAgICAgd2hpbGUocGFnZUhpZGRlblBhdXNlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhZ2VIaWRkZW5QYXVzZWQucG9wKCkucGxheSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25DaGFuZ2UoKSB7XG4gICAgICAgIGlmIChkb2N1bWVudFtoaWRkZW5dKSB7XG4gICAgICAgICAgICBvbkhpZGRlbigpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb25TaG93bigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYodmlzaWJpbGl0eUNoYW5nZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIodmlzaWJpbGl0eUNoYW5nZSwgb25DaGFuZ2UsIGZhbHNlKTtcbiAgICB9XG59O1xuXG4vKlxuICogTG9nIGRldmljZSBzdXBwb3J0IGluZm9cbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5sb2cgPSBmdW5jdGlvbihjb2xvckZ1bGwpIHtcbiAgICB2YXIgdGl0bGUgPSAnU29ubyAnICsgdGhpcy5WRVJTSU9OLFxuICAgICAgICBpbmZvID0gJ1N1cHBvcnRlZDonICsgdGhpcy5pc1N1cHBvcnRlZCArXG4gICAgICAgICAgICAgICAnIFdlYkF1ZGlvQVBJOicgKyB0aGlzLmhhc1dlYkF1ZGlvICtcbiAgICAgICAgICAgICAgICcgVG91Y2hMb2NrZWQ6JyArIHRoaXMuX2lzVG91Y2hMb2NrZWQgK1xuICAgICAgICAgICAgICAgJyBFeHRlbnNpb25zOicgKyB0aGlzLl9zdXBwb3J0LmV4dGVuc2lvbnM7XG5cbiAgICBpZihjb2xvckZ1bGwgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdDaHJvbWUnKSA+IC0xKSB7XG4gICAgICAgIHZhciBhcmdzID0gW1xuICAgICAgICAgICAgJyVjICVjICcgKyB0aXRsZSArXG4gICAgICAgICAgICAnICVjICVjICcgK1xuICAgICAgICAgICAgaW5mbyArXG4gICAgICAgICAgICAnICVjICcsXG4gICAgICAgICAgICAnYmFja2dyb3VuZDogIzE3ZDE4NicsXG4gICAgICAgICAgICAnY29sb3I6ICMwMDAwMDA7IGJhY2tncm91bmQ6ICNkMGY3MzY7IGZvbnQtd2VpZ2h0OiBib2xkJyxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kOiAjMTdkMTg2JyxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kOiAjZjdmOTRmJyxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kOiAjMTdkMTg2J1xuICAgICAgICBdO1xuICAgICAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmdzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAod2luZG93LmNvbnNvbGUpIHtcbiAgICAgICAgY29uc29sZS5sb2codGl0bGUgKyAnICcgKyBpbmZvKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdpc1N1cHBvcnRlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3VwcG9ydC5leHRlbnNpb25zLmxlbmd0aCA+IDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2NhblBsYXknLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N1cHBvcnQuY2FuUGxheTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnaGFzV2ViQXVkaW8nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5jb250ZXh0O1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICd2b2x1bWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21hc3RlckdhaW4uZ2Fpbi52YWx1ZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYoaXNOYU4odmFsdWUpKSB7IHJldHVybjsgfVxuXG4gICAgICAgIHRoaXMuX21hc3RlckdhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuXG4gICAgICAgIGlmKCF0aGlzLmhhc1dlYkF1ZGlvKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuX3NvdW5kcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zb3VuZHNbaV0udm9sdW1lID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnc291bmRzJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VuZHM7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2NyZWF0ZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fbm9kZUZhY3RvcnkpIHtcbiAgICAgICAgICAgIHRoaXMuX25vZGVGYWN0b3J5ID0gbm9kZUZhY3RvcnkodGhpcy5jb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fbm9kZUZhY3Rvcnk7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ3V0aWxzJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl91dGlscykge1xuICAgICAgICAgICAgdGhpcy5fdXRpbHMgPSBuZXcgVXRpbHModGhpcy5jb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fdXRpbHM7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2xvYWRlcicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbG9hZGVyO1xuICAgIH1cbn0pO1xuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gbmV3IFNvbm8oKTtcbn1cbiJdfQ==
(9)
});
