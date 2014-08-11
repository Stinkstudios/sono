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

    //this.stop();
    this.sourceNode.loop = this._loop;
    this.sourceNode.onended = this._endedHandler.bind(this);
    this.sourceNode.start(delay, offset);

    this._startedAt = this._context.currentTime - this._pausedAt;
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

function ElementSource(el, context) {
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

ElementSource.prototype.add = function(el) {
    this._el = el; // HTMLMediaElement
    return this._el;
};

/*
 * Controls
 */

ElementSource.prototype.play = function(delay, offset) {
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

ElementSource.prototype.pause = function() {
    clearTimeout(this._delayTimeout);

    if(!this._el) { return; }

    this._el.pause();
    this._playing = false;
    this._paused = true;
};

ElementSource.prototype.stop = function() {
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

ElementSource.prototype.onEnded = function(fn, context) {
    this._endedCallback = fn ? fn.bind(context || this) : null;
};

ElementSource.prototype._endedHandler = function() {
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

Object.defineProperty(ElementSource.prototype, 'currentTime', {
    get: function() {
        return this._el ? this._el.currentTime : 0;
    }
});

Object.defineProperty(ElementSource.prototype, 'duration', {
    get: function() {
        return this._el ? this._el.duration : 0;
    }
});

Object.defineProperty(ElementSource.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = value;
    }
});

Object.defineProperty(ElementSource.prototype, 'paused', {
    get: function() {
        return this._paused;
    }
});

Object.defineProperty(ElementSource.prototype, 'playing', {
    get: function() {
        return this._playing;
    }
});

Object.defineProperty(ElementSource.prototype, 'progress', {
    get: function() {
        return this.currentTime / this.duration;
    }
});

Object.defineProperty(ElementSource.prototype, 'sourceNode', {
    get: function() {
        if(!this._sourceNode && this._context) {
            this._sourceNode = this._context.createMediaElementSource(this._el);
        }
        return this._sourceNode;
    }
});

if (typeof module === 'object' && module.exports) {
    module.exports = ElementSource;
}

},{}],4:[function(_dereq_,module,exports){
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

},{"signals":1}],5:[function(_dereq_,module,exports){
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
    ElementSource = _dereq_('./element-source.js'),
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
      this._source = new ElementSource(data, this._context);
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

},{"./buffer-source.js":2,"./element-source.js":3,"./node-factory.js":5}],7:[function(_dereq_,module,exports){
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
        /*panX: function(panner, value) {
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
        pan: function(panner, x, y, z) {
            x = parseNum(x);
            y = parseNum(y);
            z = parseNum(z);
            panner.setPosition(x, y, z);
        },
        setSourcePosition: function(panner, positionVec) {
            // set the position of the source (where the audio is coming from)
            panner.setPosition(positionVec.x, positionVec.y, positionVec.z);
        },
        setSourceOrientation: function(panner, forwardVec) { // forwardVec = THREE.Vector3
            // set the orientation of the source (where the audio is coming from)
            var fw = forwardVec.clone().normalize();
            // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
            var globalUp = { x: 0, y: 1, z: 0 };
            var up = forwardVec.clone().cross(globalUp).cross(forwardVec).normalize();
            // set the audio context's listener position to match the camera position
            panner.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
        },
        setListenerPosition: function(positionVec) {
            // set the position of the listener (who is hearing the audio)
            context.listener.setPosition(positionVec.x, positionVec.y, positionVec.z);
        },
        setListenerOrientation: function(forwardVec) { // forwardVec = THREE.Vector3
            // set the orientation of the listener (who is hearing the audio)
            var fw = forwardVec.clone().normalize();
            // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
            var globalUp = { x: 0, y: 1, z: 0 };
            var up = forwardVec.clone().cross(globalUp).cross(forwardVec).normalize();
            // set the audio context's listener position to match the camera position
            context.listener.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
        },
        doppler: function(panner, x, y, z, deltaX, deltaY, deltaZ, deltaTime) {
            // Tracking the velocity can be done by getting the object's previous position, subtracting
            // it from the current position and dividing the result by the time elapsed since last frame
            panner.setPosition(x, y, z);
            panner.setVelocity(deltaX/deltaTime, deltaY/deltaTime, deltaZ/deltaTime);
        },*/
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
        waveform: function(buffer, length) {
            var waveform = new Float32Array(length),
                chunk = Math.floor(buffer.length / length),
                //chunk = buffer.length / length,
                resolution = 10,
                incr = Math.floor(chunk / resolution),
                greatest = 0;

            if(incr < 1) { incr = 1; }

            for (var i = 0; i < buffer.numberOfChannels; i++) {
                // check each channel
                var channel = buffer.getChannelData(i);
                for (var j = 0; j < length; j++) {
                    // get highest value within the chunk
                    for (var k = j * chunk, l = k + chunk; k < l; k += incr) {
                        // select highest value from channels
                        var a = Math.abs(channel[k]);
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
            return waveform;
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

},{"./lib/loader.js":4,"./lib/node-factory.js":5,"./lib/sound.js":6,"./lib/support.js":7,"./lib/utils.js":8}]},{},[9])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9ub2RlX21vZHVsZXMvc2lnbmFscy9kaXN0L3NpZ25hbHMuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL2J1ZmZlci1zb3VyY2UuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL2VsZW1lbnQtc291cmNlLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL2xpYi9sb2FkZXIuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL25vZGUtZmFjdG9yeS5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvc291bmQuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL3N1cHBvcnQuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL3V0aWxzLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL3Nvbm8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKmpzbGludCBvbmV2YXI6dHJ1ZSwgdW5kZWY6dHJ1ZSwgbmV3Y2FwOnRydWUsIHJlZ2V4cDp0cnVlLCBiaXR3aXNlOnRydWUsIG1heGVycjo1MCwgaW5kZW50OjQsIHdoaXRlOmZhbHNlLCBub21lbjpmYWxzZSwgcGx1c3BsdXM6ZmFsc2UgKi9cbi8qZ2xvYmFsIGRlZmluZTpmYWxzZSwgcmVxdWlyZTpmYWxzZSwgZXhwb3J0czpmYWxzZSwgbW9kdWxlOmZhbHNlLCBzaWduYWxzOmZhbHNlICovXG5cbi8qKiBAbGljZW5zZVxuICogSlMgU2lnbmFscyA8aHR0cDovL21pbGxlcm1lZGVpcm9zLmdpdGh1Yi5jb20vanMtc2lnbmFscy8+XG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2VcbiAqIEF1dGhvcjogTWlsbGVyIE1lZGVpcm9zXG4gKiBWZXJzaW9uOiAxLjAuMCAtIEJ1aWxkOiAyNjggKDIwMTIvMTEvMjkgMDU6NDggUE0pXG4gKi9cblxuKGZ1bmN0aW9uKGdsb2JhbCl7XG5cbiAgICAvLyBTaWduYWxCaW5kaW5nIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIE9iamVjdCB0aGF0IHJlcHJlc2VudHMgYSBiaW5kaW5nIGJldHdlZW4gYSBTaWduYWwgYW5kIGEgbGlzdGVuZXIgZnVuY3Rpb24uXG4gICAgICogPGJyIC8+LSA8c3Ryb25nPlRoaXMgaXMgYW4gaW50ZXJuYWwgY29uc3RydWN0b3IgYW5kIHNob3VsZG4ndCBiZSBjYWxsZWQgYnkgcmVndWxhciB1c2Vycy48L3N0cm9uZz5cbiAgICAgKiA8YnIgLz4tIGluc3BpcmVkIGJ5IEpvYSBFYmVydCBBUzMgU2lnbmFsQmluZGluZyBhbmQgUm9iZXJ0IFBlbm5lcidzIFNsb3QgY2xhc3Nlcy5cbiAgICAgKiBAYXV0aG9yIE1pbGxlciBNZWRlaXJvc1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBuYW1lIFNpZ25hbEJpbmRpbmdcbiAgICAgKiBAcGFyYW0ge1NpZ25hbH0gc2lnbmFsIFJlZmVyZW5jZSB0byBTaWduYWwgb2JqZWN0IHRoYXQgbGlzdGVuZXIgaXMgY3VycmVudGx5IGJvdW5kIHRvLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIEhhbmRsZXIgZnVuY3Rpb24gYm91bmQgdG8gdGhlIHNpZ25hbC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzT25jZSBJZiBiaW5kaW5nIHNob3VsZCBiZSBleGVjdXRlZCBqdXN0IG9uY2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtsaXN0ZW5lckNvbnRleHRdIENvbnRleHQgb24gd2hpY2ggbGlzdGVuZXIgd2lsbCBiZSBleGVjdXRlZCAob2JqZWN0IHRoYXQgc2hvdWxkIHJlcHJlc2VudCB0aGUgYHRoaXNgIHZhcmlhYmxlIGluc2lkZSBsaXN0ZW5lciBmdW5jdGlvbikuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtwcmlvcml0eV0gVGhlIHByaW9yaXR5IGxldmVsIG9mIHRoZSBldmVudCBsaXN0ZW5lci4gKGRlZmF1bHQgPSAwKS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBTaWduYWxCaW5kaW5nKHNpZ25hbCwgbGlzdGVuZXIsIGlzT25jZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIYW5kbGVyIGZ1bmN0aW9uIGJvdW5kIHRvIHRoZSBzaWduYWwuXG4gICAgICAgICAqIEB0eXBlIEZ1bmN0aW9uXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9saXN0ZW5lciA9IGxpc3RlbmVyO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiBiaW5kaW5nIHNob3VsZCBiZSBleGVjdXRlZCBqdXN0IG9uY2UuXG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX2lzT25jZSA9IGlzT25jZTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udGV4dCBvbiB3aGljaCBsaXN0ZW5lciB3aWxsIGJlIGV4ZWN1dGVkIChvYmplY3QgdGhhdCBzaG91bGQgcmVwcmVzZW50IHRoZSBgdGhpc2AgdmFyaWFibGUgaW5zaWRlIGxpc3RlbmVyIGZ1bmN0aW9uKS5cbiAgICAgICAgICogQG1lbWJlck9mIFNpZ25hbEJpbmRpbmcucHJvdG90eXBlXG4gICAgICAgICAqIEBuYW1lIGNvbnRleHRcbiAgICAgICAgICogQHR5cGUgT2JqZWN0fHVuZGVmaW5lZHxudWxsXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBsaXN0ZW5lckNvbnRleHQ7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlZmVyZW5jZSB0byBTaWduYWwgb2JqZWN0IHRoYXQgbGlzdGVuZXIgaXMgY3VycmVudGx5IGJvdW5kIHRvLlxuICAgICAgICAgKiBAdHlwZSBTaWduYWxcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX3NpZ25hbCA9IHNpZ25hbDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogTGlzdGVuZXIgcHJpb3JpdHlcbiAgICAgICAgICogQHR5cGUgTnVtYmVyXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9wcmlvcml0eSA9IHByaW9yaXR5IHx8IDA7XG4gICAgfVxuXG4gICAgU2lnbmFsQmluZGluZy5wcm90b3R5cGUgPSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIGJpbmRpbmcgaXMgYWN0aXZlIGFuZCBzaG91bGQgYmUgZXhlY3V0ZWQuXG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICovXG4gICAgICAgIGFjdGl2ZSA6IHRydWUsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZmF1bHQgcGFyYW1ldGVycyBwYXNzZWQgdG8gbGlzdGVuZXIgZHVyaW5nIGBTaWduYWwuZGlzcGF0Y2hgIGFuZCBgU2lnbmFsQmluZGluZy5leGVjdXRlYC4gKGN1cnJpZWQgcGFyYW1ldGVycylcbiAgICAgICAgICogQHR5cGUgQXJyYXl8bnVsbFxuICAgICAgICAgKi9cbiAgICAgICAgcGFyYW1zIDogbnVsbCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsbCBsaXN0ZW5lciBwYXNzaW5nIGFyYml0cmFyeSBwYXJhbWV0ZXJzLlxuICAgICAgICAgKiA8cD5JZiBiaW5kaW5nIHdhcyBhZGRlZCB1c2luZyBgU2lnbmFsLmFkZE9uY2UoKWAgaXQgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHJlbW92ZWQgZnJvbSBzaWduYWwgZGlzcGF0Y2ggcXVldWUsIHRoaXMgbWV0aG9kIGlzIHVzZWQgaW50ZXJuYWxseSBmb3IgdGhlIHNpZ25hbCBkaXNwYXRjaC48L3A+XG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IFtwYXJhbXNBcnJdIEFycmF5IG9mIHBhcmFtZXRlcnMgdGhhdCBzaG91bGQgYmUgcGFzc2VkIHRvIHRoZSBsaXN0ZW5lclxuICAgICAgICAgKiBAcmV0dXJuIHsqfSBWYWx1ZSByZXR1cm5lZCBieSB0aGUgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBleGVjdXRlIDogZnVuY3Rpb24gKHBhcmFtc0Fycikge1xuICAgICAgICAgICAgdmFyIGhhbmRsZXJSZXR1cm4sIHBhcmFtcztcbiAgICAgICAgICAgIGlmICh0aGlzLmFjdGl2ZSAmJiAhIXRoaXMuX2xpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zID0gdGhpcy5wYXJhbXM/IHRoaXMucGFyYW1zLmNvbmNhdChwYXJhbXNBcnIpIDogcGFyYW1zQXJyO1xuICAgICAgICAgICAgICAgIGhhbmRsZXJSZXR1cm4gPSB0aGlzLl9saXN0ZW5lci5hcHBseSh0aGlzLmNvbnRleHQsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2lzT25jZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVyUmV0dXJuO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZXRhY2ggYmluZGluZyBmcm9tIHNpZ25hbC5cbiAgICAgICAgICogLSBhbGlhcyB0bzogbXlTaWduYWwucmVtb3ZlKG15QmluZGluZy5nZXRMaXN0ZW5lcigpKTtcbiAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb258bnVsbH0gSGFuZGxlciBmdW5jdGlvbiBib3VuZCB0byB0aGUgc2lnbmFsIG9yIGBudWxsYCBpZiBiaW5kaW5nIHdhcyBwcmV2aW91c2x5IGRldGFjaGVkLlxuICAgICAgICAgKi9cbiAgICAgICAgZGV0YWNoIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNCb3VuZCgpPyB0aGlzLl9zaWduYWwucmVtb3ZlKHRoaXMuX2xpc3RlbmVyLCB0aGlzLmNvbnRleHQpIDogbnVsbDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gYHRydWVgIGlmIGJpbmRpbmcgaXMgc3RpbGwgYm91bmQgdG8gdGhlIHNpZ25hbCBhbmQgaGF2ZSBhIGxpc3RlbmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgaXNCb3VuZCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAoISF0aGlzLl9zaWduYWwgJiYgISF0aGlzLl9saXN0ZW5lcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IElmIFNpZ25hbEJpbmRpbmcgd2lsbCBvbmx5IGJlIGV4ZWN1dGVkIG9uY2UuXG4gICAgICAgICAqL1xuICAgICAgICBpc09uY2UgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faXNPbmNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gSGFuZGxlciBmdW5jdGlvbiBib3VuZCB0byB0aGUgc2lnbmFsLlxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0TGlzdGVuZXIgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbGlzdGVuZXI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge1NpZ25hbH0gU2lnbmFsIHRoYXQgbGlzdGVuZXIgaXMgY3VycmVudGx5IGJvdW5kIHRvLlxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0U2lnbmFsIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NpZ25hbDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVsZXRlIGluc3RhbmNlIHByb3BlcnRpZXNcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9kZXN0cm95IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3NpZ25hbDtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9saXN0ZW5lcjtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNvbnRleHQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gU3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICB0b1N0cmluZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAnW1NpZ25hbEJpbmRpbmcgaXNPbmNlOicgKyB0aGlzLl9pc09uY2UgKycsIGlzQm91bmQ6JysgdGhpcy5pc0JvdW5kKCkgKycsIGFjdGl2ZTonICsgdGhpcy5hY3RpdmUgKyAnXSc7XG4gICAgICAgIH1cblxuICAgIH07XG5cblxuLypnbG9iYWwgU2lnbmFsQmluZGluZzpmYWxzZSovXG5cbiAgICAvLyBTaWduYWwgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlTGlzdGVuZXIobGlzdGVuZXIsIGZuTmFtZSkge1xuICAgICAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdsaXN0ZW5lciBpcyBhIHJlcXVpcmVkIHBhcmFtIG9mIHtmbn0oKSBhbmQgc2hvdWxkIGJlIGEgRnVuY3Rpb24uJy5yZXBsYWNlKCd7Zm59JywgZm5OYW1lKSApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGV2ZW50IGJyb2FkY2FzdGVyXG4gICAgICogPGJyIC8+LSBpbnNwaXJlZCBieSBSb2JlcnQgUGVubmVyJ3MgQVMzIFNpZ25hbHMuXG4gICAgICogQG5hbWUgU2lnbmFsXG4gICAgICogQGF1dGhvciBNaWxsZXIgTWVkZWlyb3NcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBTaWduYWwoKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAdHlwZSBBcnJheS48U2lnbmFsQmluZGluZz5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX2JpbmRpbmdzID0gW107XG4gICAgICAgIHRoaXMuX3ByZXZQYXJhbXMgPSBudWxsO1xuXG4gICAgICAgIC8vIGVuZm9yY2UgZGlzcGF0Y2ggdG8gYXdheXMgd29yayBvbiBzYW1lIGNvbnRleHQgKCM0NylcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB0aGlzLmRpc3BhdGNoID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIFNpZ25hbC5wcm90b3R5cGUuZGlzcGF0Y2guYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBTaWduYWwucHJvdG90eXBlID0ge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTaWduYWxzIFZlcnNpb24gTnVtYmVyXG4gICAgICAgICAqIEB0eXBlIFN0cmluZ1xuICAgICAgICAgKiBAY29uc3RcbiAgICAgICAgICovXG4gICAgICAgIFZFUlNJT04gOiAnMS4wLjAnLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiBTaWduYWwgc2hvdWxkIGtlZXAgcmVjb3JkIG9mIHByZXZpb3VzbHkgZGlzcGF0Y2hlZCBwYXJhbWV0ZXJzIGFuZFxuICAgICAgICAgKiBhdXRvbWF0aWNhbGx5IGV4ZWN1dGUgbGlzdGVuZXIgZHVyaW5nIGBhZGQoKWAvYGFkZE9uY2UoKWAgaWYgU2lnbmFsIHdhc1xuICAgICAgICAgKiBhbHJlYWR5IGRpc3BhdGNoZWQgYmVmb3JlLlxuICAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICAqL1xuICAgICAgICBtZW1vcml6ZSA6IGZhbHNlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfc2hvdWxkUHJvcGFnYXRlIDogdHJ1ZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgU2lnbmFsIGlzIGFjdGl2ZSBhbmQgc2hvdWxkIGJyb2FkY2FzdCBldmVudHMuXG4gICAgICAgICAqIDxwPjxzdHJvbmc+SU1QT1JUQU5UOjwvc3Ryb25nPiBTZXR0aW5nIHRoaXMgcHJvcGVydHkgZHVyaW5nIGEgZGlzcGF0Y2ggd2lsbCBvbmx5IGFmZmVjdCB0aGUgbmV4dCBkaXNwYXRjaCwgaWYgeW91IHdhbnQgdG8gc3RvcCB0aGUgcHJvcGFnYXRpb24gb2YgYSBzaWduYWwgdXNlIGBoYWx0KClgIGluc3RlYWQuPC9wPlxuICAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICAqL1xuICAgICAgICBhY3RpdmUgOiB0cnVlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgICAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzT25jZVxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2xpc3RlbmVyQ29udGV4dF1cbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IFtwcmlvcml0eV1cbiAgICAgICAgICogQHJldHVybiB7U2lnbmFsQmluZGluZ31cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9yZWdpc3Rlckxpc3RlbmVyIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBpc09uY2UsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpIHtcblxuICAgICAgICAgICAgdmFyIHByZXZJbmRleCA9IHRoaXMuX2luZGV4T2ZMaXN0ZW5lcihsaXN0ZW5lciwgbGlzdGVuZXJDb250ZXh0KSxcbiAgICAgICAgICAgICAgICBiaW5kaW5nO1xuXG4gICAgICAgICAgICBpZiAocHJldkluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGJpbmRpbmcgPSB0aGlzLl9iaW5kaW5nc1twcmV2SW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmIChiaW5kaW5nLmlzT25jZSgpICE9PSBpc09uY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgY2Fubm90IGFkZCcrIChpc09uY2U/ICcnIDogJ09uY2UnKSArJygpIHRoZW4gYWRkJysgKCFpc09uY2U/ICcnIDogJ09uY2UnKSArJygpIHRoZSBzYW1lIGxpc3RlbmVyIHdpdGhvdXQgcmVtb3ZpbmcgdGhlIHJlbGF0aW9uc2hpcCBmaXJzdC4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJpbmRpbmcgPSBuZXcgU2lnbmFsQmluZGluZyh0aGlzLCBsaXN0ZW5lciwgaXNPbmNlLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRCaW5kaW5nKGJpbmRpbmcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZih0aGlzLm1lbW9yaXplICYmIHRoaXMuX3ByZXZQYXJhbXMpe1xuICAgICAgICAgICAgICAgIGJpbmRpbmcuZXhlY3V0ZSh0aGlzLl9wcmV2UGFyYW1zKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGJpbmRpbmc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7U2lnbmFsQmluZGluZ30gYmluZGluZ1xuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX2FkZEJpbmRpbmcgOiBmdW5jdGlvbiAoYmluZGluZykge1xuICAgICAgICAgICAgLy9zaW1wbGlmaWVkIGluc2VydGlvbiBzb3J0XG4gICAgICAgICAgICB2YXIgbiA9IHRoaXMuX2JpbmRpbmdzLmxlbmd0aDtcbiAgICAgICAgICAgIGRvIHsgLS1uOyB9IHdoaWxlICh0aGlzLl9iaW5kaW5nc1tuXSAmJiBiaW5kaW5nLl9wcmlvcml0eSA8PSB0aGlzLl9iaW5kaW5nc1tuXS5fcHJpb3JpdHkpO1xuICAgICAgICAgICAgdGhpcy5fYmluZGluZ3Muc3BsaWNlKG4gKyAxLCAwLCBiaW5kaW5nKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXJcbiAgICAgICAgICogQHJldHVybiB7bnVtYmVyfVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX2luZGV4T2ZMaXN0ZW5lciA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIG4gPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgY3VyO1xuICAgICAgICAgICAgd2hpbGUgKG4tLSkge1xuICAgICAgICAgICAgICAgIGN1ciA9IHRoaXMuX2JpbmRpbmdzW25dO1xuICAgICAgICAgICAgICAgIGlmIChjdXIuX2xpc3RlbmVyID09PSBsaXN0ZW5lciAmJiBjdXIuY29udGV4dCA9PT0gY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENoZWNrIGlmIGxpc3RlbmVyIHdhcyBhdHRhY2hlZCB0byBTaWduYWwuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dF1cbiAgICAgICAgICogQHJldHVybiB7Ym9vbGVhbn0gaWYgU2lnbmFsIGhhcyB0aGUgc3BlY2lmaWVkIGxpc3RlbmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgaGFzIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faW5kZXhPZkxpc3RlbmVyKGxpc3RlbmVyLCBjb250ZXh0KSAhPT0gLTE7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZCBhIGxpc3RlbmVyIHRvIHRoZSBzaWduYWwuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIFNpZ25hbCBoYW5kbGVyIGZ1bmN0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2xpc3RlbmVyQ29udGV4dF0gQ29udGV4dCBvbiB3aGljaCBsaXN0ZW5lciB3aWxsIGJlIGV4ZWN1dGVkIChvYmplY3QgdGhhdCBzaG91bGQgcmVwcmVzZW50IHRoZSBgdGhpc2AgdmFyaWFibGUgaW5zaWRlIGxpc3RlbmVyIGZ1bmN0aW9uKS5cbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IFtwcmlvcml0eV0gVGhlIHByaW9yaXR5IGxldmVsIG9mIHRoZSBldmVudCBsaXN0ZW5lci4gTGlzdGVuZXJzIHdpdGggaGlnaGVyIHByaW9yaXR5IHdpbGwgYmUgZXhlY3V0ZWQgYmVmb3JlIGxpc3RlbmVycyB3aXRoIGxvd2VyIHByaW9yaXR5LiBMaXN0ZW5lcnMgd2l0aCBzYW1lIHByaW9yaXR5IGxldmVsIHdpbGwgYmUgZXhlY3V0ZWQgYXQgdGhlIHNhbWUgb3JkZXIgYXMgdGhleSB3ZXJlIGFkZGVkLiAoZGVmYXVsdCA9IDApXG4gICAgICAgICAqIEByZXR1cm4ge1NpZ25hbEJpbmRpbmd9IEFuIE9iamVjdCByZXByZXNlbnRpbmcgdGhlIGJpbmRpbmcgYmV0d2VlbiB0aGUgU2lnbmFsIGFuZCBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGFkZCA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSkge1xuICAgICAgICAgICAgdmFsaWRhdGVMaXN0ZW5lcihsaXN0ZW5lciwgJ2FkZCcpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlZ2lzdGVyTGlzdGVuZXIobGlzdGVuZXIsIGZhbHNlLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkIGxpc3RlbmVyIHRvIHRoZSBzaWduYWwgdGhhdCBzaG91bGQgYmUgcmVtb3ZlZCBhZnRlciBmaXJzdCBleGVjdXRpb24gKHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlKS5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgU2lnbmFsIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbbGlzdGVuZXJDb250ZXh0XSBDb250ZXh0IG9uIHdoaWNoIGxpc3RlbmVyIHdpbGwgYmUgZXhlY3V0ZWQgKG9iamVjdCB0aGF0IHNob3VsZCByZXByZXNlbnQgdGhlIGB0aGlzYCB2YXJpYWJsZSBpbnNpZGUgbGlzdGVuZXIgZnVuY3Rpb24pLlxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ByaW9yaXR5XSBUaGUgcHJpb3JpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50IGxpc3RlbmVyLiBMaXN0ZW5lcnMgd2l0aCBoaWdoZXIgcHJpb3JpdHkgd2lsbCBiZSBleGVjdXRlZCBiZWZvcmUgbGlzdGVuZXJzIHdpdGggbG93ZXIgcHJpb3JpdHkuIExpc3RlbmVycyB3aXRoIHNhbWUgcHJpb3JpdHkgbGV2ZWwgd2lsbCBiZSBleGVjdXRlZCBhdCB0aGUgc2FtZSBvcmRlciBhcyB0aGV5IHdlcmUgYWRkZWQuIChkZWZhdWx0ID0gMClcbiAgICAgICAgICogQHJldHVybiB7U2lnbmFsQmluZGluZ30gQW4gT2JqZWN0IHJlcHJlc2VudGluZyB0aGUgYmluZGluZyBiZXR3ZWVuIHRoZSBTaWduYWwgYW5kIGxpc3RlbmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgYWRkT25jZSA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSkge1xuICAgICAgICAgICAgdmFsaWRhdGVMaXN0ZW5lcihsaXN0ZW5lciwgJ2FkZE9uY2UnKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWdpc3Rlckxpc3RlbmVyKGxpc3RlbmVyLCB0cnVlLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIGEgc2luZ2xlIGxpc3RlbmVyIGZyb20gdGhlIGRpc3BhdGNoIHF1ZXVlLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBIYW5kbGVyIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIHJlbW92ZWQuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dF0gRXhlY3V0aW9uIGNvbnRleHQgKHNpbmNlIHlvdSBjYW4gYWRkIHRoZSBzYW1lIGhhbmRsZXIgbXVsdGlwbGUgdGltZXMgaWYgZXhlY3V0aW5nIGluIGEgZGlmZmVyZW50IGNvbnRleHQpLlxuICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gTGlzdGVuZXIgaGFuZGxlciBmdW5jdGlvbi5cbiAgICAgICAgICovXG4gICAgICAgIHJlbW92ZSA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgdmFsaWRhdGVMaXN0ZW5lcihsaXN0ZW5lciwgJ3JlbW92ZScpO1xuXG4gICAgICAgICAgICB2YXIgaSA9IHRoaXMuX2luZGV4T2ZMaXN0ZW5lcihsaXN0ZW5lciwgY29udGV4dCk7XG4gICAgICAgICAgICBpZiAoaSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9iaW5kaW5nc1tpXS5fZGVzdHJveSgpOyAvL25vIHJlYXNvbiB0byBhIFNpZ25hbEJpbmRpbmcgZXhpc3QgaWYgaXQgaXNuJ3QgYXR0YWNoZWQgdG8gYSBzaWduYWxcbiAgICAgICAgICAgICAgICB0aGlzLl9iaW5kaW5ncy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbGlzdGVuZXI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZSBhbGwgbGlzdGVuZXJzIGZyb20gdGhlIFNpZ25hbC5cbiAgICAgICAgICovXG4gICAgICAgIHJlbW92ZUFsbCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBuID0gdGhpcy5fYmluZGluZ3MubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKG4tLSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzW25dLl9kZXN0cm95KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9iaW5kaW5ncy5sZW5ndGggPSAwO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IE51bWJlciBvZiBsaXN0ZW5lcnMgYXR0YWNoZWQgdG8gdGhlIFNpZ25hbC5cbiAgICAgICAgICovXG4gICAgICAgIGdldE51bUxpc3RlbmVycyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9iaW5kaW5ncy5sZW5ndGg7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3AgcHJvcGFnYXRpb24gb2YgdGhlIGV2ZW50LCBibG9ja2luZyB0aGUgZGlzcGF0Y2ggdG8gbmV4dCBsaXN0ZW5lcnMgb24gdGhlIHF1ZXVlLlxuICAgICAgICAgKiA8cD48c3Ryb25nPklNUE9SVEFOVDo8L3N0cm9uZz4gc2hvdWxkIGJlIGNhbGxlZCBvbmx5IGR1cmluZyBzaWduYWwgZGlzcGF0Y2gsIGNhbGxpbmcgaXQgYmVmb3JlL2FmdGVyIGRpc3BhdGNoIHdvbid0IGFmZmVjdCBzaWduYWwgYnJvYWRjYXN0LjwvcD5cbiAgICAgICAgICogQHNlZSBTaWduYWwucHJvdG90eXBlLmRpc2FibGVcbiAgICAgICAgICovXG4gICAgICAgIGhhbHQgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9zaG91bGRQcm9wYWdhdGUgPSBmYWxzZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGlzcGF0Y2gvQnJvYWRjYXN0IFNpZ25hbCB0byBhbGwgbGlzdGVuZXJzIGFkZGVkIHRvIHRoZSBxdWV1ZS5cbiAgICAgICAgICogQHBhcmFtIHsuLi4qfSBbcGFyYW1zXSBQYXJhbWV0ZXJzIHRoYXQgc2hvdWxkIGJlIHBhc3NlZCB0byBlYWNoIGhhbmRsZXIuXG4gICAgICAgICAqL1xuICAgICAgICBkaXNwYXRjaCA6IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgIGlmICghIHRoaXMuYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgcGFyYW1zQXJyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxcbiAgICAgICAgICAgICAgICBuID0gdGhpcy5fYmluZGluZ3MubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGJpbmRpbmdzO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5tZW1vcml6ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3ByZXZQYXJhbXMgPSBwYXJhbXNBcnI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghIG4pIHtcbiAgICAgICAgICAgICAgICAvL3Nob3VsZCBjb21lIGFmdGVyIG1lbW9yaXplXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBiaW5kaW5ncyA9IHRoaXMuX2JpbmRpbmdzLnNsaWNlKCk7IC8vY2xvbmUgYXJyYXkgaW4gY2FzZSBhZGQvcmVtb3ZlIGl0ZW1zIGR1cmluZyBkaXNwYXRjaFxuICAgICAgICAgICAgdGhpcy5fc2hvdWxkUHJvcGFnYXRlID0gdHJ1ZTsgLy9pbiBjYXNlIGBoYWx0YCB3YXMgY2FsbGVkIGJlZm9yZSBkaXNwYXRjaCBvciBkdXJpbmcgdGhlIHByZXZpb3VzIGRpc3BhdGNoLlxuXG4gICAgICAgICAgICAvL2V4ZWN1dGUgYWxsIGNhbGxiYWNrcyB1bnRpbCBlbmQgb2YgdGhlIGxpc3Qgb3IgdW50aWwgYSBjYWxsYmFjayByZXR1cm5zIGBmYWxzZWAgb3Igc3RvcHMgcHJvcGFnYXRpb25cbiAgICAgICAgICAgIC8vcmV2ZXJzZSBsb29wIHNpbmNlIGxpc3RlbmVycyB3aXRoIGhpZ2hlciBwcmlvcml0eSB3aWxsIGJlIGFkZGVkIGF0IHRoZSBlbmQgb2YgdGhlIGxpc3RcbiAgICAgICAgICAgIGRvIHsgbi0tOyB9IHdoaWxlIChiaW5kaW5nc1tuXSAmJiB0aGlzLl9zaG91bGRQcm9wYWdhdGUgJiYgYmluZGluZ3Nbbl0uZXhlY3V0ZShwYXJhbXNBcnIpICE9PSBmYWxzZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZvcmdldCBtZW1vcml6ZWQgYXJndW1lbnRzLlxuICAgICAgICAgKiBAc2VlIFNpZ25hbC5tZW1vcml6ZVxuICAgICAgICAgKi9cbiAgICAgICAgZm9yZ2V0IDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMuX3ByZXZQYXJhbXMgPSBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmUgYWxsIGJpbmRpbmdzIGZyb20gc2lnbmFsIGFuZCBkZXN0cm95IGFueSByZWZlcmVuY2UgdG8gZXh0ZXJuYWwgb2JqZWN0cyAoZGVzdHJveSBTaWduYWwgb2JqZWN0KS5cbiAgICAgICAgICogPHA+PHN0cm9uZz5JTVBPUlRBTlQ6PC9zdHJvbmc+IGNhbGxpbmcgYW55IG1ldGhvZCBvbiB0aGUgc2lnbmFsIGluc3RhbmNlIGFmdGVyIGNhbGxpbmcgZGlzcG9zZSB3aWxsIHRocm93IGVycm9ycy48L3A+XG4gICAgICAgICAqL1xuICAgICAgICBkaXNwb3NlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVBbGwoKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iaW5kaW5ncztcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9wcmV2UGFyYW1zO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgdG9TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1tTaWduYWwgYWN0aXZlOicrIHRoaXMuYWN0aXZlICsnIG51bUxpc3RlbmVyczonKyB0aGlzLmdldE51bUxpc3RlbmVycygpICsnXSc7XG4gICAgICAgIH1cblxuICAgIH07XG5cblxuICAgIC8vIE5hbWVzcGFjZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogU2lnbmFscyBuYW1lc3BhY2VcbiAgICAgKiBAbmFtZXNwYWNlXG4gICAgICogQG5hbWUgc2lnbmFsc1xuICAgICAqL1xuICAgIHZhciBzaWduYWxzID0gU2lnbmFsO1xuXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGV2ZW50IGJyb2FkY2FzdGVyXG4gICAgICogQHNlZSBTaWduYWxcbiAgICAgKi9cbiAgICAvLyBhbGlhcyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgKHNlZSAjZ2gtNDQpXG4gICAgc2lnbmFscy5TaWduYWwgPSBTaWduYWw7XG5cblxuXG4gICAgLy9leHBvcnRzIHRvIG11bHRpcGxlIGVudmlyb25tZW50c1xuICAgIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCl7IC8vQU1EXG4gICAgICAgIGRlZmluZShmdW5jdGlvbiAoKSB7IHJldHVybiBzaWduYWxzOyB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKXsgLy9ub2RlXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gc2lnbmFscztcbiAgICB9IGVsc2UgeyAvL2Jyb3dzZXJcbiAgICAgICAgLy91c2Ugc3RyaW5nIGJlY2F1c2Ugb2YgR29vZ2xlIGNsb3N1cmUgY29tcGlsZXIgQURWQU5DRURfTU9ERVxuICAgICAgICAvKmpzbGludCBzdWI6dHJ1ZSAqL1xuICAgICAgICBnbG9iYWxbJ3NpZ25hbHMnXSA9IHNpZ25hbHM7XG4gICAgfVxuXG59KHRoaXMpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQnVmZmVyU291cmNlKGJ1ZmZlciwgY29udGV4dCkge1xuICAgIHRoaXMuYWRkKGJ1ZmZlcik7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX2xvb3AgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBCdWZmZXJTb3VyY2VOb2RlXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn1cblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgICB0aGlzLl9idWZmZXIgPSBidWZmZXI7IC8vIEFycmF5QnVmZmVyXG4gICAgcmV0dXJuIHRoaXMuX2J1ZmZlcjtcbn07XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5LCBvZmZzZXQpIHtcbiAgICBpZihkZWxheSA9PT0gdW5kZWZpbmVkKSB7IGRlbGF5ID0gMDsgfVxuICAgIGlmKGRlbGF5ID4gMCkgeyBkZWxheSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkZWxheTsgfVxuXG4gICAgaWYob2Zmc2V0ID09PSB1bmRlZmluZWQpIHsgb2Zmc2V0ID0gMDsgfVxuICAgIGlmKHRoaXMuX3BhdXNlZEF0ID4gMCkgeyBvZmZzZXQgPSBvZmZzZXQgKyB0aGlzLl9wYXVzZWRBdDsgfVxuXG4gICAgLy90aGlzLnN0b3AoKTtcbiAgICB0aGlzLnNvdXJjZU5vZGUubG9vcCA9IHRoaXMuX2xvb3A7XG4gICAgdGhpcy5zb3VyY2VOb2RlLm9uZW5kZWQgPSB0aGlzLl9lbmRlZEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICB0aGlzLnNvdXJjZU5vZGUuc3RhcnQoZGVsYXksIG9mZnNldCk7XG5cbiAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fcGF1c2VkQXQ7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuXG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG59O1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gZWxhcHNlZDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgdGhpcy5fc291cmNlTm9kZS5vbmVuZGVkID0gbnVsbDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuc3RvcCgwKTtcbiAgICAgICAgfSBjYXRjaChlKSB7fVxuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG59O1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLl9lbmRlZEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICBpZih0eXBlb2YgdGhpcy5fZW5kZWRDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9lbmRlZENhbGxiYWNrKHRoaXMpO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9idWZmZXIgPyB0aGlzLl9idWZmZXIuZHVyYXRpb24gOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2xvb3AnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvb3A7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2xvb3AgPSAhIXZhbHVlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3BsYXlpbmcnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BsYXlpbmc7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgubWluKHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uLCAxKTtcbiAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAnc291cmNlTm9kZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLmJ1ZmZlciA9IHRoaXMuX2J1ZmZlcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICB9XG59KTtcblxuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gQnVmZmVyU291cmNlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBFbGVtZW50U291cmNlKGVsLCBjb250ZXh0KSB7XG4gICAgdGhpcy5hZGQoZWwpO1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9lbmRlZEhhbmRsZXJCb3VuZCA9IHRoaXMuX2VuZGVkSGFuZGxlci5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX2xvb3AgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIE1lZGlhRWxlbWVudFNvdXJjZU5vZGVcbn1cblxuRWxlbWVudFNvdXJjZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oZWwpIHtcbiAgICB0aGlzLl9lbCA9IGVsOyAvLyBIVE1MTWVkaWFFbGVtZW50XG4gICAgcmV0dXJuIHRoaXMuX2VsO1xufTtcblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuRWxlbWVudFNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5LCBvZmZzZXQpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5fZGVsYXlUaW1lb3V0KTtcblxuICAgIHRoaXMudm9sdW1lID0gdGhpcy5fdm9sdW1lO1xuXG4gICAgaWYob2Zmc2V0KSB7XG4gICAgICAgIHRoaXMuX2VsLmN1cnJlbnRUaW1lID0gb2Zmc2V0O1xuICAgIH1cblxuICAgIGlmKGRlbGF5KSB7XG4gICAgICAgIHRoaXMuX2RlbGF5VGltZW91dCA9IHNldFRpbWVvdXQodGhpcy5wbGF5LmJpbmQodGhpcyksIGRlbGF5KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX2VsLnBsYXkoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcblxuICAgIHRoaXMuX2VsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQpO1xuICAgIHRoaXMuX2VsLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQsIGZhbHNlKTtcbn07XG5cbkVsZW1lbnRTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2RlbGF5VGltZW91dCk7XG5cbiAgICBpZighdGhpcy5fZWwpIHsgcmV0dXJuOyB9XG5cbiAgICB0aGlzLl9lbC5wYXVzZSgpO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSB0cnVlO1xufTtcblxuRWxlbWVudFNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9kZWxheVRpbWVvdXQpO1xuXG4gICAgaWYoIXRoaXMuX2VsKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5fZWwucGF1c2UoKTtcblxuICAgIHRyeSB7XG4gICAgICAgIHRoaXMuX2VsLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgLy8gZml4ZXMgYnVnIHdoZXJlIHNlcnZlciBkb2Vzbid0IHN1cHBvcnQgc2VlazpcbiAgICAgICAgaWYodGhpcy5fZWwuY3VycmVudFRpbWUgPiAwKSB7IHRoaXMuX2VsLmxvYWQoKTsgfSAgICBcbiAgICB9IGNhdGNoKGUpIHt9XG5cbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG59O1xuXG4vKlxuICogRW5kZWQgaGFuZGxlclxuICovXG5cbkVsZW1lbnRTb3VyY2UucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG59O1xuXG5FbGVtZW50U291cmNlLnByb3RvdHlwZS5fZW5kZWRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuXG4gICAgaWYodGhpcy5fbG9vcCkge1xuICAgICAgICB0aGlzLl9lbC5jdXJyZW50VGltZSA9IDA7XG4gICAgICAgIC8vIGZpeGVzIGJ1ZyB3aGVyZSBzZXJ2ZXIgZG9lc24ndCBzdXBwb3J0IHNlZWs6XG4gICAgICAgIGlmKHRoaXMuX2VsLmN1cnJlbnRUaW1lID4gMCkgeyB0aGlzLl9lbC5sb2FkKCk7IH1cbiAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgfSBlbHNlIGlmKHR5cGVvZiB0aGlzLl9lbmRlZENhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sodGhpcyk7XG4gICAgfVxufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEVsZW1lbnRTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsID8gdGhpcy5fZWwuY3VycmVudFRpbWUgOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRWxlbWVudFNvdXJjZS5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWwgPyB0aGlzLl9lbC5kdXJhdGlvbiA6IDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFbGVtZW50U291cmNlLnByb3RvdHlwZSwgJ2xvb3AnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvb3A7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2xvb3AgPSB2YWx1ZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEVsZW1lbnRTb3VyY2UucHJvdG90eXBlLCAncGF1c2VkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFbGVtZW50U291cmNlLnByb3RvdHlwZSwgJ3BsYXlpbmcnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BsYXlpbmc7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFbGVtZW50U291cmNlLnByb3RvdHlwZSwgJ3Byb2dyZXNzJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbjtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEVsZW1lbnRTb3VyY2UucHJvdG90eXBlLCAnc291cmNlTm9kZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fc291cmNlTm9kZSAmJiB0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UodGhpcy5fZWwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgIH1cbn0pO1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEVsZW1lbnRTb3VyY2U7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzaWduYWxzID0gcmVxdWlyZSgnc2lnbmFscycpO1xuXG5mdW5jdGlvbiBMb2FkZXIoKSB7XG4gICAgdGhpcy5vbkNoaWxkQ29tcGxldGUgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcbiAgICB0aGlzLm9uQ29tcGxldGUgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcbiAgICB0aGlzLm9uUHJvZ3Jlc3MgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcbiAgICB0aGlzLm9uRXJyb3IgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcblxuICAgIHRoaXMucXVldWUgPSBbXTtcbiAgICB0aGlzLmluZGV4ID0gMDtcbiAgICB0aGlzLmxvYWRlcnMgPSB7fTtcblxuICAgIHRoaXMubG9hZGVkID0gZmFsc2U7XG4gICAgdGhpcy5sb2FkaW5nID0gZmFsc2U7XG4gICAgdGhpcy53ZWJBdWRpb0NvbnRleHQgPSBudWxsO1xuICAgIHRoaXMuY3Jvc3NPcmlnaW4gPSBmYWxzZTtcbiAgICB0aGlzLnRvdWNoTG9ja2VkID0gZmFsc2U7XG4gICAgdGhpcy5udW1Ub3RhbCA9IDA7XG4gICAgdGhpcy5udW1Mb2FkZWQgPSAwO1xufVxuXG5Mb2FkZXIucHJvdG90eXBlID0ge1xuICAgIGFkZDogZnVuY3Rpb24odXJsKSB7XG4gICAgICAgIHZhciBsb2FkZXIgPSBuZXcgTG9hZGVyLkZpbGUodXJsKTtcbiAgICAgICAgbG9hZGVyLndlYkF1ZGlvQ29udGV4dCA9IHRoaXMud2ViQXVkaW9Db250ZXh0O1xuICAgICAgICBsb2FkZXIuY3Jvc3NPcmlnaW4gPSB0aGlzLmNyb3NzT3JpZ2luO1xuICAgICAgICBsb2FkZXIudG91Y2hMb2NrZWQgPSB0aGlzLnRvdWNoTG9ja2VkO1xuICAgICAgICB0aGlzLnF1ZXVlLnB1c2gobG9hZGVyKTtcbiAgICAgICAgdGhpcy5sb2FkZXJzW2xvYWRlci51cmxdID0gbG9hZGVyO1xuICAgICAgICB0aGlzLm51bVRvdGFsKys7XG4gICAgICAgIHJldHVybiBsb2FkZXI7XG4gICAgfSxcbiAgICBzdGFydDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMubnVtVG90YWwgPSB0aGlzLnF1ZXVlLmxlbmd0aDtcbiAgICAgICAgaWYoIXRoaXMubG9hZGluZykge1xuICAgICAgICAgICAgdGhpcy5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5xdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMubG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5vbkNvbXBsZXRlLmRpc3BhdGNoKHRoaXMubG9hZGVycyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxvYWRlciA9IHRoaXMucXVldWUucG9wKCk7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIHByb2dyZXNzSGFuZGxlciA9IGZ1bmN0aW9uKHByb2dyZXNzKSB7XG4gICAgICAgICAgICB2YXIgbnVtTG9hZGVkID0gc2VsZi5udW1Mb2FkZWQgKyBwcm9ncmVzcztcbiAgICAgICAgICAgIGlmKHNlbGYub25Qcm9ncmVzcy5nZXROdW1MaXN0ZW5lcnMoKSA+IDApIHtcbiAgICAgICAgICAgICAgICBzZWxmLm9uUHJvZ3Jlc3MuZGlzcGF0Y2gobnVtTG9hZGVkL3NlbGYubnVtVG90YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBsb2FkZXIub25Qcm9ncmVzcy5hZGQocHJvZ3Jlc3NIYW5kbGVyKTtcbiAgICAgICAgdmFyIGNvbXBsZXRlSGFuZGxlciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBsb2FkZXIub25Qcm9ncmVzcy5yZW1vdmUocHJvZ3Jlc3NIYW5kbGVyKTtcbiAgICAgICAgICAgIHNlbGYubnVtTG9hZGVkKys7XG4gICAgICAgICAgICBpZihzZWxmLm9uUHJvZ3Jlc3MuZ2V0TnVtTGlzdGVuZXJzKCkgPiAwKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vblByb2dyZXNzLmRpc3BhdGNoKHNlbGYubnVtTG9hZGVkL3NlbGYubnVtVG90YWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2VsZi5vbkNoaWxkQ29tcGxldGUuZGlzcGF0Y2gobG9hZGVyKTtcbiAgICAgICAgICAgIHNlbGYubmV4dCgpO1xuICAgICAgICB9O1xuICAgICAgICBsb2FkZXIub25CZWZvcmVDb21wbGV0ZS5hZGRPbmNlKGNvbXBsZXRlSGFuZGxlcik7XG4gICAgICAgIHZhciBlcnJvckhhbmRsZXIgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgc2VsZi5vbkVycm9yLmRpc3BhdGNoKGxvYWRlcik7XG4gICAgICAgICAgICBzZWxmLm5leHQoKTtcbiAgICAgICAgfTtcbiAgICAgICAgbG9hZGVyLm9uRXJyb3IuYWRkT25jZShlcnJvckhhbmRsZXIpO1xuICAgICAgICBsb2FkZXIuc3RhcnQoKTtcbiAgICB9LFxuICAgIGFkZE11bHRpcGxlOiBmdW5jdGlvbihhcnJheSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmFkZChhcnJheVtpXSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGdldDogZnVuY3Rpb24odXJsKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxvYWRlcnNbdXJsXTtcbiAgICB9XG59O1xuXG5Mb2FkZXIuRmlsZSA9IGZ1bmN0aW9uKHVybCkge1xuICAgIHRoaXMudXJsID0gdXJsO1xuXG4gICAgdGhpcy5vblByb2dyZXNzID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG4gICAgdGhpcy5vbkJlZm9yZUNvbXBsZXRlID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG4gICAgdGhpcy5vbkNvbXBsZXRlID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG4gICAgdGhpcy5vbkVycm9yID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG5cbiAgICB0aGlzLndlYkF1ZGlvQ29udGV4dCA9IG51bGw7XG4gICAgdGhpcy5jcm9zc09yaWdpbiA9IGZhbHNlO1xuICAgIHRoaXMudG91Y2hMb2NrZWQgPSBmYWxzZTtcbiAgICB0aGlzLnByb2dyZXNzID0gMDtcbn07XG5cbkxvYWRlci5GaWxlLnByb3RvdHlwZSA9IHtcbiAgICBzdGFydDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHRoaXMud2ViQXVkaW9Db250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRBcnJheUJ1ZmZlcih0aGlzLndlYkF1ZGlvQ29udGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRBdWRpb0VsZW1lbnQodGhpcy50b3VjaExvY2tlZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGxvYWRBcnJheUJ1ZmZlcjogZnVuY3Rpb24od2ViQXVkaW9Db250ZXh0KSB7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHJlcXVlc3Qub3BlbignR0VUJywgdGhpcy51cmwsIHRydWUpO1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmVxdWVzdC5vbnByb2dyZXNzID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5sZW5ndGhDb21wdXRhYmxlKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5wcm9ncmVzcyA9IGV2ZW50LmxvYWRlZCAvIGV2ZW50LnRvdGFsO1xuICAgICAgICAgICAgICAgIHNlbGYub25Qcm9ncmVzcy5kaXNwYXRjaChzZWxmLnByb2dyZXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHdlYkF1ZGlvQ29udGV4dC5kZWNvZGVBdWRpb0RhdGEocmVxdWVzdC5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5kYXRhID0gYnVmZmVyO1xuICAgICAgICAgICAgICAgIHNlbGYucHJvZ3Jlc3MgPSAxO1xuICAgICAgICAgICAgICAgIHNlbGYub25Qcm9ncmVzcy5kaXNwYXRjaCgxKTtcbiAgICAgICAgICAgICAgICBzZWxmLm9uQmVmb3JlQ29tcGxldGUuZGlzcGF0Y2goYnVmZmVyKTtcbiAgICAgICAgICAgICAgICBzZWxmLm9uQ29tcGxldGUuZGlzcGF0Y2goYnVmZmVyKTtcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNlbGYub25FcnJvci5kaXNwYXRjaCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIHNlbGYub25FcnJvci5kaXNwYXRjaChlKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgICAgIHRoaXMucmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgfSxcbiAgICBsb2FkQXVkaW9FbGVtZW50OiBmdW5jdGlvbih0b3VjaExvY2tlZCkge1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBBdWRpbygpO1xuICAgICAgICB0aGlzLmRhdGEgPSByZXF1ZXN0O1xuICAgICAgICByZXF1ZXN0Lm5hbWUgPSB0aGlzLnVybDtcbiAgICAgICAgcmVxdWVzdC5wcmVsb2FkID0gJ2F1dG8nO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJlcXVlc3Quc3JjID0gdGhpcy51cmw7XG4gICAgICAgIGlmICghIXRvdWNoTG9ja2VkKSB7XG4gICAgICAgICAgICB0aGlzLm9uUHJvZ3Jlc3MuZGlzcGF0Y2goMSk7XG4gICAgICAgICAgICB0aGlzLm9uQ29tcGxldGUuZGlzcGF0Y2godGhpcy5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciByZWFkeSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHJlYWR5KTtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICAgICAgc2VsZi5wcm9ncmVzcyA9IDE7XG4gICAgICAgICAgICAgICAgc2VsZi5vblByb2dyZXNzLmRpc3BhdGNoKDEpO1xuICAgICAgICAgICAgICAgIHNlbGYub25CZWZvcmVDb21wbGV0ZS5kaXNwYXRjaChzZWxmLmRhdGEpO1xuICAgICAgICAgICAgICAgIHNlbGYub25Db21wbGV0ZS5kaXNwYXRjaChzZWxmLmRhdGEpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIHRpbWVvdXQgYmVjYXVzZSBzb21ldGltZXMgY2FucGxheXRocm91Z2ggZG9lc24ndCBmaXJlXG4gICAgICAgICAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQocmVhZHksIDIwMDApO1xuICAgICAgICAgICAgcmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHJlYWR5LCBmYWxzZSk7XG4gICAgICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICAgICAgc2VsZi5vbkVycm9yLmRpc3BhdGNoKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmVxdWVzdC5sb2FkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGNhbmNlbDogZnVuY3Rpb24oKSB7XG4gICAgICBpZih0aGlzLnJlcXVlc3QgJiYgdGhpcy5yZXF1ZXN0LnJlYWR5U3RhdGUgIT09IDQpIHtcbiAgICAgICAgICB0aGlzLnJlcXVlc3QuYWJvcnQoKTtcbiAgICAgIH1cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvYWRlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNvbnRleHQ7XG5cbmZ1bmN0aW9uIGNyZWF0ZUZpbHRlcih0eXBlLCBmcmVxdWVuY3kpIHtcbiAgICB2YXIgZmlsdGVyTm9kZSA9IGNvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gICAgZmlsdGVyTm9kZS50eXBlID0gdHlwZTtcbiAgICBpZihmcmVxdWVuY3kgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBmaWx0ZXJOb2RlLmZyZXF1ZW5jeS52YWx1ZSA9IGZyZXF1ZW5jeTtcbiAgICB9XG4gICAgcmV0dXJuIGZpbHRlck5vZGU7XG59XG5cbnZhciBjcmVhdGUgPSB7XG4gICAgZ2FpbjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgaWYodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbm9kZS5nYWluLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcbiAgICBwYW46IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlUGFubmVyKCk7XG4gICAgICAgIC8vIERlZmF1bHQgZm9yIHN0ZXJlbyBpcyBIUlRGXG4gICAgICAgIG5vZGUucGFubmluZ01vZGVsID0gJ0hSVEYnOyAvLyAnZXF1YWxwb3dlcidcblxuICAgICAgICAvLyBEaXN0YW5jZSBtb2RlbCBhbmQgYXR0cmlidXRlc1xuICAgICAgICBub2RlLmRpc3RhbmNlTW9kZWwgPSAnbGluZWFyJzsgLy8gJ2xpbmVhcicgJ2ludmVyc2UnICdleHBvbmVudGlhbCdcbiAgICAgICAgbm9kZS5yZWZEaXN0YW5jZSA9IDE7XG4gICAgICAgIG5vZGUubWF4RGlzdGFuY2UgPSAxMDAwO1xuICAgICAgICBub2RlLnJvbGxvZmZGYWN0b3IgPSAxO1xuXG4gICAgICAgIC8vIFVzZXMgYSAzRCBjYXJ0ZXNpYW4gY29vcmRpbmF0ZSBzeXN0ZW1cbiAgICAgICAgLy8gbm9kZS5zZXRQb3NpdGlvbigwLCAwLCAwKTtcbiAgICAgICAgLy8gbm9kZS5zZXRPcmllbnRhdGlvbigxLCAwLCAwKTtcbiAgICAgICAgLy8gbm9kZS5zZXRWZWxvY2l0eSgwLCAwLCAwKTtcblxuICAgICAgICAvLyBEaXJlY3Rpb25hbCBzb3VuZCBjb25lIC0gVGhlIGNvbmUgYW5nbGVzIGFyZSBpbiBkZWdyZWVzIGFuZCBydW4gZnJvbSAwIHRvIDM2MFxuICAgICAgICAvLyBub2RlLmNvbmVJbm5lckFuZ2xlID0gMzYwO1xuICAgICAgICAvLyBub2RlLmNvbmVPdXRlckFuZ2xlID0gMzYwO1xuICAgICAgICAvLyBub2RlLmNvbmVPdXRlckdhaW4gPSAwO1xuXG4gICAgICAgIC8vIG5vcm1hbGlzZWQgdmVjXG4gICAgICAgIC8vIG5vZGUuc2V0T3JpZW50YXRpb24odmVjLngsIHZlYy55LCB2ZWMueik7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG4gICAgZmlsdGVyOiB7XG4gICAgICAgIGxvd3Bhc3M6IGZ1bmN0aW9uKGZyZXF1ZW5jeSkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUZpbHRlcignbG93cGFzcycsIGZyZXF1ZW5jeSk7XG4gICAgICAgIH0sXG4gICAgICAgIGhpZ2hwYXNzOiBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVGaWx0ZXIoJ2hpZ2hwYXNzJywgZnJlcXVlbmN5KTtcbiAgICAgICAgfSxcbiAgICAgICAgYmFuZHBhc3M6IGZ1bmN0aW9uKGZyZXF1ZW5jeSkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUZpbHRlcignYmFuZHBhc3MnLCBmcmVxdWVuY3kpO1xuICAgICAgICB9LFxuICAgICAgICBsb3dzaGVsZjogZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRmlsdGVyKCdsb3dzaGVsZicsIGZyZXF1ZW5jeSk7XG4gICAgICAgIH0sXG4gICAgICAgIGhpZ2hzaGVsZjogZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRmlsdGVyKCdoaWdoc2hlbGYnLCBmcmVxdWVuY3kpO1xuICAgICAgICB9LFxuICAgICAgICBwZWFraW5nOiBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVGaWx0ZXIoJ3BlYWtpbmcnLCBmcmVxdWVuY3kpO1xuICAgICAgICB9LFxuICAgICAgICBub3RjaDogZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRmlsdGVyKCdub3RjaCcsIGZyZXF1ZW5jeSk7XG4gICAgICAgIH0sXG4gICAgICAgIGFsbHBhc3M6IGZ1bmN0aW9uKGZyZXF1ZW5jeSkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUZpbHRlcignYWxscGFzcycsIGZyZXF1ZW5jeSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGRlbGF5OiBmdW5jdGlvbihpbnB1dCwgdGltZSwgZ2Fpbikge1xuICAgICAgICB2YXIgZGVsYXlOb2RlID0gY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgICAgICB2YXIgZ2Fpbk5vZGUgPSB0aGlzLmdhaW4oZ2FpbiB8fCAwLjUpO1xuICAgICAgICBpZih0aW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGF5Tm9kZS5kZWxheVRpbWUudmFsdWUgPSB0aW1lO1xuICAgICAgICB9XG4gICAgICAgIGRlbGF5Tm9kZS5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICAgICAgaWYoaW5wdXQpIHtcbiAgICAgICAgICAgIGlucHV0LmNvbm5lY3QoZGVsYXlOb2RlKTtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmNvbm5lY3QoaW5wdXQpOyAgICBcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGVsYXlOb2RlO1xuICAgICAgICAvLyA/XG4gICAgICAgIC8qcmV0dXJuIHtcbiAgICAgICAgICBkZWxheU5vZGU6IGRlbGF5Tm9kZSxcbiAgICAgICAgICBnYWluTm9kZTogZ2Fpbk5vZGVcbiAgICAgICAgfTsqL1xuICAgIH0sXG4gICAgY29udm9sdmVyOiBmdW5jdGlvbihpbXB1bHNlUmVzcG9uc2UpIHtcbiAgICAgICAgLy8gaW1wdWxzZVJlc3BvbnNlIGlzIGFuIGF1ZGlvIGZpbGUgYnVmZmVyXG4gICAgICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVDb252b2x2ZXIoKTtcbiAgICAgICAgbm9kZS5idWZmZXIgPSBpbXB1bHNlUmVzcG9uc2U7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG4gICAgcmV2ZXJiOiBmdW5jdGlvbihzZWNvbmRzLCBkZWNheSwgcmV2ZXJzZSkge1xuICAgICAgIHJldHVybiB0aGlzLmNvbnZvbHZlcih0aGlzLmltcHVsc2VSZXNwb25zZShzZWNvbmRzLCBkZWNheSwgcmV2ZXJzZSkpO1xuICAgIH0sXG4gICAgLy8gVE9ETzogc2hvdWxkIHByb2IgYmUgbW92ZWQgdG8gdXRpbHM6XG4gICAgaW1wdWxzZVJlc3BvbnNlOiBmdW5jdGlvbihzZWNvbmRzLCBkZWNheSwgcmV2ZXJzZSkge1xuICAgICAgICAvLyBnZW5lcmF0ZSBhIHJldmVyYiBlZmZlY3RcbiAgICAgICAgc2Vjb25kcyA9IHNlY29uZHMgfHwgMTtcbiAgICAgICAgZGVjYXkgPSBkZWNheSB8fCA1O1xuICAgICAgICByZXZlcnNlID0gISFyZXZlcnNlO1xuXG4gICAgICAgIHZhciBudW1DaGFubmVscyA9IDIsXG4gICAgICAgICAgICByYXRlID0gY29udGV4dC5zYW1wbGVSYXRlLFxuICAgICAgICAgICAgbGVuZ3RoID0gcmF0ZSAqIHNlY29uZHMsXG4gICAgICAgICAgICBpbXB1bHNlUmVzcG9uc2UgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcihudW1DaGFubmVscywgbGVuZ3RoLCByYXRlKSxcbiAgICAgICAgICAgIGxlZnQgPSBpbXB1bHNlUmVzcG9uc2UuZ2V0Q2hhbm5lbERhdGEoMCksXG4gICAgICAgICAgICByaWdodCA9IGltcHVsc2VSZXNwb25zZS5nZXRDaGFubmVsRGF0YSgxKSxcbiAgICAgICAgICAgIG47XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbiA9IHJldmVyc2UgPyBsZW5ndGggLSAxIDogaTtcbiAgICAgICAgICAgIGxlZnRbaV0gPSAoTWF0aC5yYW5kb20oKSAqIDIgLSAxKSAqIE1hdGgucG93KDEgLSBuIC8gbGVuZ3RoLCBkZWNheSk7XG4gICAgICAgICAgICByaWdodFtpXSA9IChNYXRoLnJhbmRvbSgpICogMiAtIDEpICogTWF0aC5wb3coMSAtIG4gLyBsZW5ndGgsIGRlY2F5KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbXB1bHNlUmVzcG9uc2U7XG4gICAgfSxcbiAgICBhbmFseXNlcjogZnVuY3Rpb24oZmZ0U2l6ZSkge1xuICAgICAgICBmZnRTaXplID0gZmZ0U2l6ZSB8fCAxMDI0O1xuICAgICAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICAgICAgbm9kZS5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSAwLjg1O1xuICAgICAgICAvLyByZXNvbHV0aW9uIGZmdFNpemU6IDMyIC0gMjA0OCAocG93IDIpXG4gICAgICAgIC8vIGZyZXF1ZW5jeUJpbkNvdW50IHdpbGwgYmUgaGFsZiB0aGlzIHZhbHVlXG4gICAgICAgIG5vZGUuZmZ0U2l6ZSA9IGZmdFNpemU7XG4gICAgICAgIC8vbm9kZS5taW5EZWNpYmVscyA9IC0xMDA7XG4gICAgICAgIC8vbm9kZS5tYXhEZWNpYmVscyA9IC0zMDtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcbiAgICBjb21wcmVzc29yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gbG93ZXJzIHRoZSB2b2x1bWUgb2YgdGhlIGxvdWRlc3QgcGFydHMgb2YgdGhlIHNpZ25hbCBhbmQgcmFpc2VzIHRoZSB2b2x1bWUgb2YgdGhlIHNvZnRlc3QgcGFydHNcbiAgICAgICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcigpO1xuICAgICAgICAvLyBtaW4gZGVjaWJlbHMgdG8gc3RhcnQgY29tcHJlc3NpbmcgYXQgZnJvbSAtMTAwIHRvIDBcbiAgICAgICAgbm9kZS50aHJlc2hvbGQudmFsdWUgPSAtMjQ7XG4gICAgICAgIC8vIGRlY2liZWwgdmFsdWUgdG8gc3RhcnQgY3VydmUgdG8gY29tcHJlc3NlZCB2YWx1ZSBmcm9tIDAgdG8gNDBcbiAgICAgICAgbm9kZS5rbmVlLnZhbHVlID0gMzA7XG4gICAgICAgIC8vIGFtb3VudCBvZiBjaGFuZ2UgcGVyIGRlY2liZWwgZnJvbSAxIHRvIDIwXG4gICAgICAgIG5vZGUucmF0aW8udmFsdWUgPSAxMjtcbiAgICAgICAgLy8gZ2FpbiByZWR1Y3Rpb24gY3VycmVudGx5IGFwcGxpZWQgYnkgY29tcHJlc3NvciBmcm9tIC0yMCB0byAwXG4gICAgICAgIC8vIG5vZGUucmVkdWN0aW9uLnZhbHVlXG4gICAgICAgIC8vIHNlY29uZHMgdG8gcmVkdWNlIGdhaW4gYnkgMTBkYiBmcm9tIDAgdG8gMSAtIGhvdyBxdWlja2x5IHNpZ25hbCBhZGFwdGVkIHdoZW4gdm9sdW1lIGluY3JlYXNlZFxuICAgICAgICBub2RlLmF0dGFjay52YWx1ZSA9IDAuMDAwMztcbiAgICAgICAgLy8gc2Vjb25kcyB0byBpbmNyZWFzZSBnYWluIGJ5IDEwZGIgZnJvbSAwIHRvIDEgLSBob3cgcXVpY2tseSBzaWduYWwgYWRhcHRlZCB3aGVuIHZvbHVtZSByZWRjdWNlZFxuICAgICAgICBub2RlLnJlbGVhc2UudmFsdWUgPSAwLjI1O1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuICAgIGRpc3RvcnRpb246IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlV2F2ZVNoYXBlcigpO1xuICAgICAgICAvLyBGbG9hdDMyQXJyYXkgZGVmaW5pbmcgY3VydmUgKHZhbHVlcyBhcmUgaW50ZXJwb2xhdGVkKVxuICAgICAgICAvL25vZGUuY3VydmVcbiAgICAgICAgLy8gdXAtc2FtcGxlIGJlZm9yZSBhcHBseWluZyBjdXJ2ZSBmb3IgYmV0dGVyIHJlc29sdXRpb24gcmVzdWx0ICdub25lJywgJzJ4JyBvciAnNHgnXG4gICAgICAgIC8vbm9kZS5vdmVyc2FtcGxlID0gJzJ4JztcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcbiAgICBzY3JpcHRQcm9jZXNzb3I6IGZ1bmN0aW9uKGJ1ZmZlclNpemUsIGlucHV0Q2hhbm5lbHMsIG91dHB1dENoYW5uZWxzLCBjYWxsYmFjaywgY2FsbGJhY2tDb250ZXh0KSB7XG4gICAgICAgIC8vIGJ1ZmZlclNpemUgMjU2IC0gMTYzODQgKHBvdyAyKVxuICAgICAgICBidWZmZXJTaXplID0gYnVmZmVyU2l6ZSB8fCAxMDI0O1xuICAgICAgICBpbnB1dENoYW5uZWxzID0gaW5wdXRDaGFubmVscyA9PT0gdW5kZWZpbmVkID8gMCA6IGlucHV0Q2hhbm5lbHM7XG4gICAgICAgIG91dHB1dENoYW5uZWxzID0gb3V0cHV0Q2hhbm5lbHMgPT09IHVuZGVmaW5lZCA/IDEgOiBvdXRwdXRDaGFubmVscztcbiAgICAgICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCBpbnB1dENoYW5uZWxzLCBvdXRwdXRDaGFubmVscyk7XG4gICAgICAgIC8vbm9kZS5vbmF1ZGlvcHJvY2VzcyA9IGNhbGxiYWNrLmJpbmQoY2FsbGJhY2tDb250ZXh0fHwgbm9kZSk7XG4gICAgICAgIG5vZGUub25hdWRpb3Byb2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgIC8vIGF2YWlsYWJsZSBwcm9wczpcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICBldmVudC5pbnB1dEJ1ZmZlclxuICAgICAgICAgICAgZXZlbnQub3V0cHV0QnVmZmVyXG4gICAgICAgICAgICBldmVudC5wbGF5YmFja1RpbWVcbiAgICAgICAgICAgICovXG4gICAgICAgICAgICAvLyBFeGFtcGxlOiBnZW5lcmF0ZSBub2lzZVxuICAgICAgICAgICAgLypcbiAgICAgICAgICAgIHZhciBvdXRwdXQgPSBldmVudC5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgICAgICB2YXIgbCA9IG91dHB1dC5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIG91dHB1dFtpXSA9IE1hdGgucmFuZG9tKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbChjYWxsYmFja0NvbnRleHQgfHwgdGhpcywgZXZlbnQpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuICAgIC8vIGNyZWF0ZXMgTWVkaWFTdHJlYW1BdWRpb1NvdXJjZU5vZGVcbiAgICBtaWNyb3Bob25lU291cmNlOiBmdW5jdGlvbihzdHJlYW0sIGNvbm5lY3RUbykge1xuICAgICAgICB2YXIgbWVkaWFTdHJlYW1Tb3VyY2UgPSBjb250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKCBzdHJlYW0gKTtcbiAgICAgICAgaWYoY29ubmVjdFRvKSB7XG4gICAgICAgICAgICBtZWRpYVN0cmVhbVNvdXJjZS5jb25uZWN0KGNvbm5lY3RUbyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSEFDSzogc3RvcHMgbW96IGdhcmJhZ2UgY29sbGVjdGlvbiBraWxsaW5nIHRoZSBzdHJlYW1cbiAgICAgICAgLy8gc2VlIGh0dHBzOi8vc3VwcG9ydC5tb3ppbGxhLm9yZy9lbi1VUy9xdWVzdGlvbnMvOTg0MTc5XG4gICAgICAgIGlmKG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEpIHtcbiAgICAgICAgICAgIHdpbmRvdy5tb3pIYWNrID0gbWVkaWFTdHJlYW1Tb3VyY2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1lZGlhU3RyZWFtU291cmNlO1xuICAgIH1cbn07XG5cbi8qXG4gKiBGYWtlIG5vZGVzIC0gbm90IHN1cmUgaWYgdGhpcyBpcyBhIGdvb2QgaWRlYT9cbiAqIFRoZSB1c2FnZSBpcyB0aGF0IGNvZGUgY2FuIGZhaWwgc2lsZW50bHkgKHJlbW92aW5nIG5lZWQgZm9yIGNvbmRpdGlvbmFscylcbiAqL1xuXG52YXIgZm4gPSBmdW5jdGlvbigpe307XG52YXIgcGFyYW0gPSB7IHZhbHVlOiAxIH07XG52YXIgZmFrZU5vZGUgPSB7XG4gICAgY29ubmVjdDpmbixcbiAgICBkaXNjb25uZWN0OmZuLFxuICAgIC8vIGdhaW5cbiAgICBnYWluOnt2YWx1ZTogMX0sXG4gICAgLy8gcGFubmVyXG4gICAgcGFubmluZ01vZGVsOiAwLFxuICAgIHNldFBvc2l0aW9uOiBmbixcbiAgICBzZXRPcmllbnRhdGlvbjogZm4sXG4gICAgc2V0VmVsb2NpdHk6IGZuLFxuICAgIGRpc3RhbmNlTW9kZWw6IDAsXG4gICAgcmVmRGlzdGFuY2U6IDAsXG4gICAgbWF4RGlzdGFuY2U6IDAsXG4gICAgcm9sbG9mZkZhY3RvcjogMCxcbiAgICBjb25lSW5uZXJBbmdsZTogMzYwLFxuICAgIGNvbmVPdXRlckFuZ2xlOiAzNjAsXG4gICAgY29uZU91dGVyR2FpbjogMCxcbiAgICAvLyBmaWx0ZXI6XG4gICAgdHlwZTowLFxuICAgIGZyZXF1ZW5jeTogcGFyYW0sXG4gICAgLy8gZGVsYXlcbiAgICBkZWxheVRpbWU6IHBhcmFtLFxuICAgIC8vIGNvbnZvbHZlclxuICAgIGJ1ZmZlcjogMCxcbiAgICAvLyBhbmFseXNlclxuICAgIHNtb290aGluZ1RpbWVDb25zdGFudDogMCxcbiAgICBmZnRTaXplOiAwLFxuICAgIG1pbkRlY2liZWxzOiAwLFxuICAgIG1heERlY2liZWxzOiAwLFxuICAgIC8vIGNvbXByZXNzb3JcbiAgICB0aHJlc2hvbGQ6IHBhcmFtLFxuICAgIGtuZWU6IHBhcmFtLFxuICAgIHJhdGlvOiBwYXJhbSxcbiAgICBhdHRhY2s6IHBhcmFtLFxuICAgIHJlbGVhc2U6IHBhcmFtLFxuICAgIC8vIGRpc3RvcnRpb25cbiAgICBvdmVyc2FtcGxlOiAwLFxuICAgIGN1cnZlOiAwXG59O1xudmFyIHJldHVybkZha2VOb2RlID0gZnVuY3Rpb24oKXsgcmV0dXJuIGZha2VOb2RlOyB9O1xudmFyIGZha2UgPSB7XG4gICAgZ2FpbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7Z2Fpbjp7dmFsdWU6IDF9LCBjb25uZWN0OmZuLCBkaXNjb25uZWN0OmZufTtcbiAgICB9LFxuICAgIHBhbjogcmV0dXJuRmFrZU5vZGUsXG4gICAgZmlsdGVyOiB7XG4gICAgICAgIGxvd3Bhc3M6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBoaWdocGFzczogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGJhbmRwYXNzOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgbG93c2hlbGY6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBoaWdoc2hlbGY6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBwZWFraW5nOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgbm90Y2g6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBhbGxwYXNzOiByZXR1cm5GYWtlTm9kZVxuICAgIH0sXG4gICAgZGVsYXk6IHJldHVybkZha2VOb2RlLFxuICAgIGNvbnZvbHZlcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgcmV2ZXJiOiByZXR1cm5GYWtlTm9kZSxcbiAgICBpbXB1bHNlUmVzcG9uc2U6IGZ1bmN0aW9uKCkgeyByZXR1cm4gW107IH0sXG4gICAgYW5hbHlzZXI6IHJldHVybkZha2VOb2RlLFxuICAgIGNvbXByZXNzb3I6IHJldHVybkZha2VOb2RlLFxuICAgIGRpc3RvcnRpb246IHJldHVybkZha2VOb2RlLFxuICAgIHNjcmlwdFByb2Nlc3NvcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgbWljcm9waG9uZVNvdXJjZTogcmV0dXJuRmFrZU5vZGVcbn07XG5cbmZ1bmN0aW9uIE5vZGVGYWN0b3J5KHdlYkF1ZGlvQ29udGV4dCkge1xuICAgIGNvbnRleHQgPSB3ZWJBdWRpb0NvbnRleHQ7XG4gICAgcmV0dXJuIGNvbnRleHQgPyBjcmVhdGUgOiBmYWtlO1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IE5vZGVGYWN0b3J5O1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQnVmZmVyU291cmNlID0gcmVxdWlyZSgnLi9idWZmZXItc291cmNlLmpzJyksXG4gICAgRWxlbWVudFNvdXJjZSA9IHJlcXVpcmUoJy4vZWxlbWVudC1zb3VyY2UuanMnKSxcbiAgICBub2RlRmFjdG9yeSA9IHJlcXVpcmUoJy4vbm9kZS1mYWN0b3J5LmpzJyk7XG5cbmZ1bmN0aW9uIFNvdW5kKGNvbnRleHQsIGRhdGEsIGRlc3RpbmF0aW9uKSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2RhdGEgPSBudWxsO1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX2xvb3AgPSBmYWxzZTtcbiAgICB0aGlzLl9ub2RlTGlzdCA9IFtdO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5V2hlblJlYWR5ID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlID0gbnVsbDtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xuXG4gICAgdGhpcy5fZ2FpbiA9IG5vZGVGYWN0b3J5KHRoaXMuX2NvbnRleHQpLmdhaW4oKTtcbiAgICB0aGlzLl9nYWluLmNvbm5lY3QoZGVzdGluYXRpb24gfHwgdGhpcy5fY29udGV4dC5kZXN0aW5hdGlvbik7XG5cbiAgICB0aGlzLmFkZChkYXRhKTtcbn1cblxuU291bmQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBpZighZGF0YSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuX2RhdGEgPSBkYXRhOyAvLyBBdWRpb0J1ZmZlciBvciBNZWRpYSBFbGVtZW50XG4gICAgLy9jb25zb2xlLmxvZygnZGF0YTonLCB0aGlzLl9kYXRhKTtcbiAgICBpZih0aGlzLl9kYXRhLnRhZ05hbWUpIHtcbiAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBFbGVtZW50U291cmNlKGRhdGEsIHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBCdWZmZXJTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIHRoaXMuX2NyZWF0ZVNvdXJjZU5vZGUoKTtcbiAgICB0aGlzLl9zb3VyY2Uub25FbmRlZCh0aGlzLl9lbmRlZEhhbmRsZXIsIHRoaXMpO1xuXG4gICAgLy8gc2hvdWxkIHRoaXMgdGFrZSBhY2NvdW50IG9mIGRlbGF5IGFuZCBvZmZzZXQ/XG4gICAgaWYodGhpcy5fcGxheVdoZW5SZWFkeSkge1xuICAgICAgICB0aGlzLnBsYXkoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5LCBvZmZzZXQpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7XG4gICAgICAgIHRoaXMuX3BsYXlXaGVuUmVhZHkgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdGhpcy5fY3JlYXRlU291cmNlTm9kZSgpO1xuICAgIHRoaXMuX3NvdXJjZS5sb29wID0gdGhpcy5fbG9vcDtcblxuICAgIC8vIHVwZGF0ZSB2b2x1bWUgbmVlZGVkIGZvciBubyB3ZWJhdWRpb1xuICAgIGlmKCF0aGlzLl9jb250ZXh0KSB7IHRoaXMudm9sdW1lID0gdGhpcy52b2x1bWU7IH1cblxuICAgIHRoaXMuX3NvdXJjZS5wbGF5KGRlbGF5LCBvZmZzZXQpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7IHJldHVybiB0aGlzOyB9XG4gICAgdGhpcy5fc291cmNlLnBhdXNlKCk7XG4gICAgcmV0dXJuIHRoaXM7ICBcbn07XG5cblNvdW5kLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuX3NvdXJjZS5zdG9wKCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICogTm9kZXNcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUuYWRkTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB0aGlzLl9ub2RlTGlzdC5wdXNoKG5vZGUpO1xuICAgIHRoaXMuX3VwZGF0ZUNvbm5lY3Rpb25zKCk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUucmVtb3ZlTm9kZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihub2RlID09PSB0aGlzLl9ub2RlTGlzdFtpXSkge1xuICAgICAgICAgICAgdGhpcy5fbm9kZUxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIG5vZGUuZGlzY29ubmVjdCgwKTtcbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLy8gc2hvdWxkIHNvdXJjZSBiZSBpdGVtIDAgaW4gbm9kZWxpc3QgYW5kIGRlc2luYXRpb24gbGFzdFxuLy8gcHJvYiBpcyBhZGROb2RlIG5lZWRzIHRvIGFkZCBiZWZvcmUgZGVzdGluYXRpb25cbi8vICsgc2hvdWxkIGl0IGJlIGNhbGxlZCBjaGFpbiBvciBzb21ldGhpbmcgbmljZXI/XG4vLyBmZWVscyBsaWtlIG5vZGUgbGlzdCBjb3VsZCBiZSBhIGxpbmtlZCBsaXN0Pz9cbi8vIGlmIGxpc3QubGFzdCBpcyBkZXN0aW5hdGlvbiBhZGRiZWZvcmVcblxuLypTb3VuZC5wcm90b3R5cGUuX3VwZGF0ZUNvbm5lY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy5fbm9kZUxpc3RbaS0xXS5jb25uZWN0KHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICB9XG59OyovXG4vKlNvdW5kLnByb3RvdHlwZS5fdXBkYXRlQ29ubmVjdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdfdXBkYXRlQ29ubmVjdGlvbnMnKTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlLmRpc2Nvbm5lY3QoMCk7XG4gICAgdGhpcy5fc291cmNlTm9kZS5jb25uZWN0KHRoaXMuX2dhaW4pO1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYoaSA9PT0gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJyAtIGNvbm5lY3Qgc291cmNlIHRvIG5vZGU6JywgdGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICAgICAgdGhpcy5fZ2Fpbi5kaXNjb25uZWN0KDApO1xuICAgICAgICAgICAgdGhpcy5fZ2Fpbi5jb25uZWN0KHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0OicsIHRoaXMuX25vZGVMaXN0W2ktMV0sICd0bycsIHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgICAgIHRoaXMuX25vZGVMaXN0W2ktMV0uZGlzY29ubmVjdCgwKTtcbiAgICAgICAgICAgIHRoaXMuX25vZGVMaXN0W2ktMV0uY29ubmVjdCh0aGlzLl9ub2RlTGlzdFtpXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5jb25uZWN0VG8odGhpcy5fY29udGV4dC5kZXN0aW5hdGlvbik7XG59OyovXG5Tb3VuZC5wcm90b3R5cGUuX3VwZGF0ZUNvbm5lY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKCdfdXBkYXRlQ29ubmVjdGlvbnMnKTtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihpID09PSAwKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCcgLSBjb25uZWN0IHNvdXJjZSB0byBub2RlOicsIHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgICAgIC8vdGhpcy5fc291cmNlTm9kZS5kaXNjb25uZWN0KDApO1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5jb25uZWN0KHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2Nvbm5lY3Q6JywgdGhpcy5fbm9kZUxpc3RbaS0xXSwgJ3RvJywgdGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICAgICAgLy90aGlzLl9ub2RlTGlzdFtpLTFdLmRpc2Nvbm5lY3QoMCk7XG4gICAgICAgICAgICB0aGlzLl9ub2RlTGlzdFtpLTFdLmNvbm5lY3QodGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2codGhpcy5kZXN0aW5hdGlvbilcbiAgICBpZih0aGlzLmRlc3RpbmF0aW9uKSB7XG4gICAgICAgIHRoaXMuY29ubmVjdFRvKHRoaXMuZGVzdGluYXRpb24pO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLl9nYWluKSB7XG4gICAgICAgIHRoaXMuY29ubmVjdFRvKHRoaXMuX2dhaW4pO1xuICAgIH1cbn07XG5cbi8vIG9yIHNldHRlciBmb3IgZGVzdGluYXRpb24/XG4vKlNvdW5kLnByb3RvdHlwZS5jb25uZWN0VG8gPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIGwgPSB0aGlzLl9ub2RlTGlzdC5sZW5ndGg7XG4gICAgaWYobCA+IDApIHtcbiAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0OicsIHRoaXMuX25vZGVMaXN0W2wgLSAxXSwgJ3RvJywgbm9kZSk7XG4gICAgICAgIHRoaXMuX25vZGVMaXN0W2wgLSAxXS5kaXNjb25uZWN0KDApO1xuICAgICAgICB0aGlzLl9ub2RlTGlzdFtsIC0gMV0uY29ubmVjdChub2RlKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCcgeCBjb25uZWN0IHNvdXJjZSB0byBub2RlOicsIG5vZGUpO1xuICAgICAgICB0aGlzLl9nYWluLmRpc2Nvbm5lY3QoMCk7XG4gICAgICAgIHRoaXMuX2dhaW4uY29ubmVjdChub2RlKTtcbiAgICB9XG4gICAgdGhpcy5kZXN0aW5hdGlvbiA9IG5vZGU7XG59OyovXG5Tb3VuZC5wcm90b3R5cGUuY29ubmVjdFRvID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoO1xuICAgIGlmKGwgPiAwKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coJ2Nvbm5lY3Q6JywgdGhpcy5fbm9kZUxpc3RbbCAtIDFdLCAndG8nLCBub2RlKTtcbiAgICAgICAgLy90aGlzLl9ub2RlTGlzdFtsIC0gMV0uZGlzY29ubmVjdCgwKTtcbiAgICAgICAgdGhpcy5fbm9kZUxpc3RbbCAtIDFdLmNvbm5lY3Qobm9kZSk7XG4gICAgfVxuICAgIGVsc2UgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKCcgeCBjb25uZWN0IHNvdXJjZSB0byBub2RlOicsIG5vZGUpO1xuICAgICAgICAvL3RoaXMuX3NvdXJjZU5vZGUuZGlzY29ubmVjdCgwKTtcbiAgICAgICAgdGhpcy5fc291cmNlTm9kZS5jb25uZWN0KG5vZGUpO1xuICAgIH1cbiAgICB0aGlzLmRlc3RpbmF0aW9uID0gbm9kZTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuU291bmQucHJvdG90eXBlLl9jcmVhdGVTb3VyY2VOb2RlID0gZnVuY3Rpb24oKSB7XG4gICAgLy9jb25zb2xlLmxvZygnZ2V0IHNvdXJjZScsIHRoaXMuX3NvdXJjZU5vZGUpO1xuICAgIGlmKCF0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fc291cmNlLnNvdXJjZU5vZGU7XG4gICAgdGhpcy5fdXBkYXRlQ29ubmVjdGlvbnMoKTtcblxuICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUub25FbmRlZCA9IGZ1bmN0aW9uKGZuLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IGZuID8gZm4uYmluZChjb250ZXh0IHx8IHRoaXMpIDogbnVsbDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvdW5kLnByb3RvdHlwZS5fZW5kZWRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodHlwZW9mIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayh0aGlzKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG4vKlxuICogVE9ETzogc2V0IHVwIHNvIHNvdXJjZSBjYW4gYmUgc3RyZWFtLCBvc2NpbGxhdG9yLCBldGNcbiAqL1xuXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdsb29wJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9sb29wID0gISF2YWx1ZTtcbiAgICAgICAgaWYodGhpcy5fc291cmNlKSB7XG4gICAgICAgICAgdGhpcy5fc291cmNlLmxvb3AgPSB0aGlzLl9sb29wO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmR1cmF0aW9uIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuY3VycmVudFRpbWUgOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wcm9ncmVzcyA6IDA7XG4gIH1cbn0pO1xuXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICd2b2x1bWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dhaW4uZ2Fpbi52YWx1ZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYoaXNOYU4odmFsdWUpKSB7IHJldHVybjsgfVxuXG4gICAgICAgIHRoaXMuX2dhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuXG4gICAgICAgIGlmKHRoaXMuX2RhdGEgJiYgdGhpcy5fZGF0YS52b2x1bWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5fZGF0YS52b2x1bWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAncGxheWluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLnBsYXlpbmcgOiBmYWxzZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLnBhdXNlZCA6IGZhbHNlO1xuICAgIH1cbn0pO1xuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gU291bmQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFN1cHBvcnQoKSB7XG4gICAgdGhpcy5faW5pdCgpO1xufVxuXG5TdXBwb3J0LnByb3RvdHlwZS5faW5pdCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F1ZGlvJyk7XG4gICAgaWYoIWVsKSB7IHJldHVybiBbXTsgfVxuXG4gICAgdmFyIHRlc3RzID0gW1xuICAgICAgICB7IGV4dDogJ29nZycsIHR5cGU6ICdhdWRpby9vZ2c7IGNvZGVjcz1cInZvcmJpc1wiJyB9LFxuICAgICAgICB7IGV4dDogJ21wMycsIHR5cGU6ICdhdWRpby9tcGVnOycgfSxcbiAgICAgICAgeyBleHQ6ICdvcHVzJywgdHlwZTogJ2F1ZGlvL29nZzsgY29kZWNzPVwib3B1c1wiJyB9LFxuICAgICAgICB7IGV4dDogJ3dhdicsIHR5cGU6ICdhdWRpby93YXY7IGNvZGVjcz1cIjFcIicgfSxcbiAgICAgICAgeyBleHQ6ICdtNGEnLCB0eXBlOiAnYXVkaW8veC1tNGE7JyB9LFxuICAgICAgICB7IGV4dDogJ200YScsIHR5cGU6ICdhdWRpby9hYWM7JyB9XG4gICAgXTtcblxuICAgIHRoaXMuX2V4dGVuc2lvbnMgPSBbXTtcbiAgICB0aGlzLl9jYW5QbGF5ID0ge307XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRlc3RzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB0ZXN0ID0gdGVzdHNbaV07XG4gICAgICAgIHZhciBjYW5QbGF5VHlwZSA9ICEhZWwuY2FuUGxheVR5cGUodGVzdC50eXBlKTtcbiAgICAgICAgaWYoY2FuUGxheVR5cGUpIHtcbiAgICAgICAgICAgIHRoaXMuX2V4dGVuc2lvbnMucHVzaCh0ZXN0LmV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2FuUGxheVt0ZXN0LmV4dF0gPSBjYW5QbGF5VHlwZTtcbiAgICB9XG59O1xuXG5TdXBwb3J0LnByb3RvdHlwZS5nZXRGaWxlRXh0ZW5zaW9uID0gZnVuY3Rpb24odXJsKSB7XG4gICAgdXJsID0gdXJsLnNwbGl0KCc/JylbMF07XG4gICAgdXJsID0gdXJsLnN1YnN0cih1cmwubGFzdEluZGV4T2YoJy8nKSArIDEpO1xuXG4gICAgdmFyIGEgPSB1cmwuc3BsaXQoJy4nKTtcbiAgICBpZihhLmxlbmd0aCA9PT0gMSB8fCAoYVswXSA9PT0gJycgJiYgYS5sZW5ndGggPT09IDIpKSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgcmV0dXJuIGEucG9wKCkudG9Mb3dlckNhc2UoKTtcbn07XG5cblN1cHBvcnQucHJvdG90eXBlLmdldFN1cHBvcnRlZEZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZXMpIHtcbiAgICAvLyBpZiBhcnJheSBnZXQgdGhlIGZpcnN0IG9uZSB0aGF0IHdvcmtzXG4gICAgaWYoZmlsZU5hbWVzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWxlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBleHQgPSB0aGlzLmdldEZpbGVFeHRlbnNpb24oZmlsZU5hbWVzW2ldKTtcbiAgICAgICAgICAgIHZhciBpbmQgPSB0aGlzLl9leHRlbnNpb25zLmluZGV4T2YoZXh0KTtcbiAgICAgICAgICAgIGlmKGluZCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVOYW1lc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBpZiBub3QgYXJyYXkgYW5kIGlzIG9iamVjdFxuICAgIGVsc2UgaWYoZmlsZU5hbWVzIGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICAgIGZvcih2YXIga2V5IGluIGZpbGVOYW1lcykge1xuICAgICAgICAgICAgdmFyIGV4dGVuc2lvbiA9IHRoaXMuZ2V0RmlsZUV4dGVuc2lvbihmaWxlTmFtZXNba2V5XSk7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSB0aGlzLl9leHRlbnNpb25zLmluZGV4T2YoZXh0ZW5zaW9uKTtcbiAgICAgICAgICAgIGlmKGluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmlsZU5hbWVzW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gaWYgc3RyaW5nIGp1c3QgcmV0dXJuXG4gICAgcmV0dXJuIGZpbGVOYW1lcztcbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTdXBwb3J0LnByb3RvdHlwZSwgJ2V4dGVuc2lvbnMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2V4dGVuc2lvbnM7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTdXBwb3J0LnByb3RvdHlwZSwgJ2NhblBsYXknLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NhblBsYXk7XG4gICAgfVxufSk7XG5cbi8qXG4gKiBFeHBvcnRzXG4gKi9cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBuZXcgU3VwcG9ydCgpO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4gZnVuY3Rpb24gVXRpbHMoY29udGV4dCkge1xuICAgIGZ1bmN0aW9uIHBhcnNlTnVtKHgpIHtcbiAgICAgICAgcmV0dXJuIGlzTmFOKHgpID8gMCA6IHBhcnNlRmxvYXQoeCwgMTApO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGZhZGU6IGZ1bmN0aW9uKGdhaW5Ob2RlLCB2YWx1ZSwgZHVyYXRpb24pIHtcbiAgICAgICAgICAgIGdhaW5Ob2RlLmdhaW4ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUodmFsdWUsIGNvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgICAgIH0sXG4gICAgICAgIHBhbkhhbmRsZXI6IGZ1bmN0aW9uKHBhbm5lcikge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAvLyBwYW4gbGVmdCB0byByaWdodCB3aXRoIHZhbHVlIGZyb20gLTEgdG8gMVxuICAgICAgICAgICAgICAgIHg6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHggZnJvbSAtTWF0aC5QSS80IHRvIE1hdGguUEkvNCAoLTQ1IHRvIDQ1IGRlZylcbiAgICAgICAgICAgICAgICAgICAgdmFyIHggPSBwYXJzZUZsb2F0KHZhbHVlLCAxMCkgKiBNYXRoLlBJIC8gNDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHogPSB4ICsgTWF0aC5QSSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIGlmICh6ID4gTWF0aC5QSSAvIDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHogPSBNYXRoLlBJIC0gejtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB4ID0gTWF0aC5zaW4oeCk7XG4gICAgICAgICAgICAgICAgICAgIHogPSBNYXRoLnNpbih6KTtcbiAgICAgICAgICAgICAgICAgICAgcGFubmVyLnNldFBvc2l0aW9uKHgsIDAsIHopO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgeHl6OiBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgICAgICAgICAgICAgIHggPSBwYXJzZU51bSh4KTtcbiAgICAgICAgICAgICAgICAgICAgeSA9IHBhcnNlTnVtKHkpO1xuICAgICAgICAgICAgICAgICAgICB6ID0gcGFyc2VOdW0oeik7XG4gICAgICAgICAgICAgICAgICAgIHBhbm5lci5zZXRQb3NpdGlvbih4LCB5LCB6KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldFNvdXJjZVBvc2l0aW9uOiBmdW5jdGlvbihwb3NpdGlvblZlYykge1xuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIHBvc2l0aW9uIG9mIHRoZSBzb3VyY2UgKHdoZXJlIHRoZSBhdWRpbyBpcyBjb21pbmcgZnJvbSlcbiAgICAgICAgICAgICAgICAgICAgcGFubmVyLnNldFBvc2l0aW9uKHBvc2l0aW9uVmVjLngsIHBvc2l0aW9uVmVjLnksIHBvc2l0aW9uVmVjLnopO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0U291cmNlT3JpZW50YXRpb246IGZ1bmN0aW9uKGZvcndhcmRWZWMpIHsgLy8gZm9yd2FyZFZlYyA9IFRIUkVFLlZlY3RvcjNcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBhdWRpbyBzb3VyY2Ugb3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRPcmllbnRhdGlvbihwYW5uZXIsIGZvcndhcmRWZWMpO1xuICAgICAgICAgICAgICAgICAgICAvKi8vIHNldCB0aGUgb3JpZW50YXRpb24gb2YgdGhlIHNvdXJjZSAod2hlcmUgdGhlIGF1ZGlvIGlzIGNvbWluZyBmcm9tKVxuICAgICAgICAgICAgICAgICAgICAvL3ZhciBmdyA9IGZvcndhcmRWZWMuY2xvbmUoKS5ub3JtYWxpemUoKTsgPT5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGZ3ID0geyB4OiBmb3J3YXJkVmVjLngsIHk6IGZvcndhcmRWZWMueSwgejogZm9yd2FyZFZlYy56IH07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9ybWFsaXplKGZ3KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHVwIHZlYyAoIHVwID0gKGZvcndhcmQgY3Jvc3MgKDAsIDEsIDApKSBjcm9zcyBmb3J3YXJkIClcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdsb2JhbFVwID0geyB4OiAwLCB5OiAxLCB6OiAwIH07XG4gICAgICAgICAgICAgICAgICAgIC8vIHZhciB1cCA9IGZvcndhcmRWZWMuY2xvbmUoKS5jcm9zcyhnbG9iYWxVcCkuY3Jvc3MoZm9yd2FyZFZlYykubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cCA9IHsgeDogZm9yd2FyZFZlYy54LCB5OiBmb3J3YXJkVmVjLnksIHo6IGZvcndhcmRWZWMueiB9O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNyb3NzKHVwLCBnbG9iYWxVcCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3Jvc3ModXAsIGZvcndhcmRWZWMpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vcm1hbGl6ZSh1cCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCB0aGUgYXVkaW8gY29udGV4dCdzIGxpc3RlbmVyIHBvc2l0aW9uIHRvIG1hdGNoIHRoZSBjYW1lcmEgcG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgcGFubmVyLnNldE9yaWVudGF0aW9uKGZ3LngsIGZ3LnksIGZ3LnosIHVwLngsIHVwLnksIHVwLnopOyovXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXRMaXN0ZW5lclBvc2l0aW9uOiBmdW5jdGlvbihwb3NpdGlvblZlYykge1xuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIHBvc2l0aW9uIG9mIHRoZSBsaXN0ZW5lciAod2hvIGlzIGhlYXJpbmcgdGhlIGF1ZGlvKVxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0Lmxpc3RlbmVyLnNldFBvc2l0aW9uKHBvc2l0aW9uVmVjLngsIHBvc2l0aW9uVmVjLnksIHBvc2l0aW9uVmVjLnopO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0TGlzdGVuZXJPcmllbnRhdGlvbjogZnVuY3Rpb24oZm9yd2FyZFZlYykgeyAvLyBmb3J3YXJkVmVjID0gVEhSRUUuVmVjdG9yM1xuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIGF1ZGlvIGNvbnRleHQncyBsaXN0ZW5lciBwb3NpdGlvbiB0byBtYXRjaCB0aGUgY2FtZXJhIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0T3JpZW50YXRpb24oY29udGV4dC5saXN0ZW5lciwgZm9yd2FyZFZlYyk7XG4gICAgICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCB0aGUgb3JpZW50YXRpb24gb2YgdGhlIGxpc3RlbmVyICh3aG8gaXMgaGVhcmluZyB0aGUgYXVkaW8pXG4gICAgICAgICAgICAgICAgICAgIHZhciBmdyA9IGZvcndhcmRWZWMuY2xvbmUoKS5ub3JtYWxpemUoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHVwIHZlYyAoIHVwID0gKGZvcndhcmQgY3Jvc3MgKDAsIDEsIDApKSBjcm9zcyBmb3J3YXJkIClcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdsb2JhbFVwID0geyB4OiAwLCB5OiAxLCB6OiAwIH07XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cCA9IGZvcndhcmRWZWMuY2xvbmUoKS5jcm9zcyhnbG9iYWxVcCkuY3Jvc3MoZm9yd2FyZFZlYykubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCB0aGUgYXVkaW8gY29udGV4dCdzIGxpc3RlbmVyIHBvc2l0aW9uIHRvIG1hdGNoIHRoZSBjYW1lcmEgcG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5saXN0ZW5lci5zZXRPcmllbnRhdGlvbihmdy54LCBmdy55LCBmdy56LCB1cC54LCB1cC55LCB1cC56KTtcbiAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRvcHBsZXI6IGZ1bmN0aW9uKHgsIHksIHosIGRlbHRhWCwgZGVsdGFZLCBkZWx0YVosIGRlbHRhVGltZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcmFja2luZyB0aGUgdmVsb2NpdHkgY2FuIGJlIGRvbmUgYnkgZ2V0dGluZyB0aGUgb2JqZWN0J3MgcHJldmlvdXMgcG9zaXRpb24sIHN1YnRyYWN0aW5nXG4gICAgICAgICAgICAgICAgICAgIC8vIGl0IGZyb20gdGhlIGN1cnJlbnQgcG9zaXRpb24gYW5kIGRpdmlkaW5nIHRoZSByZXN1bHQgYnkgdGhlIHRpbWUgZWxhcHNlZCBzaW5jZSBsYXN0IGZyYW1lXG4gICAgICAgICAgICAgICAgICAgIHBhbm5lci5zZXRQb3NpdGlvbih4LCB5LCB6KTtcbiAgICAgICAgICAgICAgICAgICAgcGFubmVyLnNldFZlbG9jaXR5KGRlbHRhWC9kZWx0YVRpbWUsIGRlbHRhWS9kZWx0YVRpbWUsIGRlbHRhWi9kZWx0YVRpbWUpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0T3JpZW50YXRpb246IGZ1bmN0aW9uKG5vZGUsIGZvcndhcmRWZWMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBvcmllbnRhdGlvbiBvZiB0aGUgc291cmNlICh3aGVyZSB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG4gICAgICAgICAgICAgICAgICAgIC8vdmFyIGZ3ID0gZm9yd2FyZFZlYy5jbG9uZSgpLm5vcm1hbGl6ZSgpOyA9PlxuICAgICAgICAgICAgICAgICAgICB2YXIgZncgPSB7IHg6IGZvcndhcmRWZWMueCwgeTogZm9yd2FyZFZlYy55LCB6OiBmb3J3YXJkVmVjLnogfTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3JtYWxpemUoZncpO1xuICAgICAgICAgICAgICAgICAgICAvLyBjYWxjdWxhdGUgdXAgdmVjICggdXAgPSAoZm9yd2FyZCBjcm9zcyAoMCwgMSwgMCkpIGNyb3NzIGZvcndhcmQgKVxuICAgICAgICAgICAgICAgICAgICB2YXIgZ2xvYmFsVXAgPSB7IHg6IDAsIHk6IDEsIHo6IDAgfTtcbiAgICAgICAgICAgICAgICAgICAgLy8gdmFyIHVwID0gZm9yd2FyZFZlYy5jbG9uZSgpLmNyb3NzKGdsb2JhbFVwKS5jcm9zcyhmb3J3YXJkVmVjKS5ub3JtYWxpemUoKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVwID0geyB4OiBmb3J3YXJkVmVjLngsIHk6IGZvcndhcmRWZWMueSwgejogZm9yd2FyZFZlYy56IH07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3Jvc3NQcm9kdWN0KHVwLCBnbG9iYWxVcCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3Jvc3NQcm9kdWN0KHVwLCBmb3J3YXJkVmVjKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3JtYWxpemUodXApO1xuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIGF1ZGlvIGNvbnRleHQncyBsaXN0ZW5lciBwb3NpdGlvbiB0byBtYXRjaCB0aGUgY2FtZXJhIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuc2V0T3JpZW50YXRpb24oZncueCwgZncueSwgZncueiwgdXAueCwgdXAueSwgdXAueik7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjcm9zc1Byb2R1Y3Q6IGZ1bmN0aW9uICggYSwgYiApIHtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgYXggPSBhLngsIGF5ID0gYS55LCBheiA9IGEuejtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJ4ID0gYi54LCBieSA9IGIueSwgYnogPSBiLno7XG5cbiAgICAgICAgICAgICAgICAgICAgYS54ID0gYXkgKiBieiAtIGF6ICogYnk7XG4gICAgICAgICAgICAgICAgICAgIGEueSA9IGF6ICogYnggLSBheCAqIGJ6O1xuICAgICAgICAgICAgICAgICAgICBhLnogPSBheCAqIGJ5IC0gYXkgKiBieDtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcblxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbm9ybWFsaXplOiBmdW5jdGlvbiAodmVjMykge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHZlYzMueCA9PT0gMCAmJiB2ZWMzLnkgPT09IDAgJiYgdmVjMy56ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmVjMztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBsZW5ndGggPSBNYXRoLnNxcnQoIHZlYzMueCAqIHZlYzMueCArIHZlYzMueSAqIHZlYzMueSArIHZlYzMueiAqIHZlYzMueiApO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpbnZTY2FsYXIgPSAxIC8gbGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB2ZWMzLnggKj0gaW52U2NhbGFyO1xuICAgICAgICAgICAgICAgICAgICB2ZWMzLnkgKj0gaW52U2NhbGFyO1xuICAgICAgICAgICAgICAgICAgICB2ZWMzLnogKj0gaW52U2NhbGFyO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2ZWMzO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgLypwYW5YOiBmdW5jdGlvbihwYW5uZXIsIHZhbHVlKSB7XG4gICAgICAgICAgICAvLyB4IGZyb20gLU1hdGguUEkvNCB0byBNYXRoLlBJLzQgKC00NSB0byA0NSBkZWcpXG4gICAgICAgICAgICB2YXIgeCA9IHBhcnNlRmxvYXQodmFsdWUsIDEwKSAqIE1hdGguUEkgLyA0O1xuICAgICAgICAgICAgdmFyIHogPSB4ICsgTWF0aC5QSSAvIDI7XG4gICAgICAgICAgICBpZiAoeiA+IE1hdGguUEkgLyAyKSB7XG4gICAgICAgICAgICAgICAgeiA9IE1hdGguUEkgLSB6O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgeCA9IE1hdGguc2luKHgpO1xuICAgICAgICAgICAgeiA9IE1hdGguc2luKHopO1xuICAgICAgICAgICAgcGFubmVyLnNldFBvc2l0aW9uKHgsIDAsIHopO1xuICAgICAgICB9LFxuICAgICAgICBwYW46IGZ1bmN0aW9uKHBhbm5lciwgeCwgeSwgeikge1xuICAgICAgICAgICAgeCA9IHBhcnNlTnVtKHgpO1xuICAgICAgICAgICAgeSA9IHBhcnNlTnVtKHkpO1xuICAgICAgICAgICAgeiA9IHBhcnNlTnVtKHopO1xuICAgICAgICAgICAgcGFubmVyLnNldFBvc2l0aW9uKHgsIHksIHopO1xuICAgICAgICB9LFxuICAgICAgICBzZXRTb3VyY2VQb3NpdGlvbjogZnVuY3Rpb24ocGFubmVyLCBwb3NpdGlvblZlYykge1xuICAgICAgICAgICAgLy8gc2V0IHRoZSBwb3NpdGlvbiBvZiB0aGUgc291cmNlICh3aGVyZSB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG4gICAgICAgICAgICBwYW5uZXIuc2V0UG9zaXRpb24ocG9zaXRpb25WZWMueCwgcG9zaXRpb25WZWMueSwgcG9zaXRpb25WZWMueik7XG4gICAgICAgIH0sXG4gICAgICAgIHNldFNvdXJjZU9yaWVudGF0aW9uOiBmdW5jdGlvbihwYW5uZXIsIGZvcndhcmRWZWMpIHsgLy8gZm9yd2FyZFZlYyA9IFRIUkVFLlZlY3RvcjNcbiAgICAgICAgICAgIC8vIHNldCB0aGUgb3JpZW50YXRpb24gb2YgdGhlIHNvdXJjZSAod2hlcmUgdGhlIGF1ZGlvIGlzIGNvbWluZyBmcm9tKVxuICAgICAgICAgICAgdmFyIGZ3ID0gZm9yd2FyZFZlYy5jbG9uZSgpLm5vcm1hbGl6ZSgpO1xuICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHVwIHZlYyAoIHVwID0gKGZvcndhcmQgY3Jvc3MgKDAsIDEsIDApKSBjcm9zcyBmb3J3YXJkIClcbiAgICAgICAgICAgIHZhciBnbG9iYWxVcCA9IHsgeDogMCwgeTogMSwgejogMCB9O1xuICAgICAgICAgICAgdmFyIHVwID0gZm9yd2FyZFZlYy5jbG9uZSgpLmNyb3NzKGdsb2JhbFVwKS5jcm9zcyhmb3J3YXJkVmVjKS5ub3JtYWxpemUoKTtcbiAgICAgICAgICAgIC8vIHNldCB0aGUgYXVkaW8gY29udGV4dCdzIGxpc3RlbmVyIHBvc2l0aW9uIHRvIG1hdGNoIHRoZSBjYW1lcmEgcG9zaXRpb25cbiAgICAgICAgICAgIHBhbm5lci5zZXRPcmllbnRhdGlvbihmdy54LCBmdy55LCBmdy56LCB1cC54LCB1cC55LCB1cC56KTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0TGlzdGVuZXJQb3NpdGlvbjogZnVuY3Rpb24ocG9zaXRpb25WZWMpIHtcbiAgICAgICAgICAgIC8vIHNldCB0aGUgcG9zaXRpb24gb2YgdGhlIGxpc3RlbmVyICh3aG8gaXMgaGVhcmluZyB0aGUgYXVkaW8pXG4gICAgICAgICAgICBjb250ZXh0Lmxpc3RlbmVyLnNldFBvc2l0aW9uKHBvc2l0aW9uVmVjLngsIHBvc2l0aW9uVmVjLnksIHBvc2l0aW9uVmVjLnopO1xuICAgICAgICB9LFxuICAgICAgICBzZXRMaXN0ZW5lck9yaWVudGF0aW9uOiBmdW5jdGlvbihmb3J3YXJkVmVjKSB7IC8vIGZvcndhcmRWZWMgPSBUSFJFRS5WZWN0b3IzXG4gICAgICAgICAgICAvLyBzZXQgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBsaXN0ZW5lciAod2hvIGlzIGhlYXJpbmcgdGhlIGF1ZGlvKVxuICAgICAgICAgICAgdmFyIGZ3ID0gZm9yd2FyZFZlYy5jbG9uZSgpLm5vcm1hbGl6ZSgpO1xuICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHVwIHZlYyAoIHVwID0gKGZvcndhcmQgY3Jvc3MgKDAsIDEsIDApKSBjcm9zcyBmb3J3YXJkIClcbiAgICAgICAgICAgIHZhciBnbG9iYWxVcCA9IHsgeDogMCwgeTogMSwgejogMCB9O1xuICAgICAgICAgICAgdmFyIHVwID0gZm9yd2FyZFZlYy5jbG9uZSgpLmNyb3NzKGdsb2JhbFVwKS5jcm9zcyhmb3J3YXJkVmVjKS5ub3JtYWxpemUoKTtcbiAgICAgICAgICAgIC8vIHNldCB0aGUgYXVkaW8gY29udGV4dCdzIGxpc3RlbmVyIHBvc2l0aW9uIHRvIG1hdGNoIHRoZSBjYW1lcmEgcG9zaXRpb25cbiAgICAgICAgICAgIGNvbnRleHQubGlzdGVuZXIuc2V0T3JpZW50YXRpb24oZncueCwgZncueSwgZncueiwgdXAueCwgdXAueSwgdXAueik7XG4gICAgICAgIH0sXG4gICAgICAgIGRvcHBsZXI6IGZ1bmN0aW9uKHBhbm5lciwgeCwgeSwgeiwgZGVsdGFYLCBkZWx0YVksIGRlbHRhWiwgZGVsdGFUaW1lKSB7XG4gICAgICAgICAgICAvLyBUcmFja2luZyB0aGUgdmVsb2NpdHkgY2FuIGJlIGRvbmUgYnkgZ2V0dGluZyB0aGUgb2JqZWN0J3MgcHJldmlvdXMgcG9zaXRpb24sIHN1YnRyYWN0aW5nXG4gICAgICAgICAgICAvLyBpdCBmcm9tIHRoZSBjdXJyZW50IHBvc2l0aW9uIGFuZCBkaXZpZGluZyB0aGUgcmVzdWx0IGJ5IHRoZSB0aW1lIGVsYXBzZWQgc2luY2UgbGFzdCBmcmFtZVxuICAgICAgICAgICAgcGFubmVyLnNldFBvc2l0aW9uKHgsIHksIHopO1xuICAgICAgICAgICAgcGFubmVyLnNldFZlbG9jaXR5KGRlbHRhWC9kZWx0YVRpbWUsIGRlbHRhWS9kZWx0YVRpbWUsIGRlbHRhWi9kZWx0YVRpbWUpO1xuICAgICAgICB9LCovXG4gICAgICAgIGZpbHRlcjogZnVuY3Rpb24oZmlsdGVyTm9kZSwgdmFsdWUsIHF1YWxpdHksIGdhaW4pIHtcbiAgICAgICAgICAgIC8vIHNldCBmaWx0ZXIgZnJlcXVlbmN5IGJhc2VkIG9uIHZhbHVlIGZyb20gMCB0byAxXG4gICAgICAgICAgICB2YWx1ZSA9IHBhcnNlRmxvYXQodmFsdWUsIDEwKTtcbiAgICAgICAgICAgIHF1YWxpdHkgPSBwYXJzZUZsb2F0KHF1YWxpdHksIDEwKTtcbiAgICAgICAgICAgIGdhaW4gPSBwYXJzZUZsb2F0KGdhaW4sIDEwKTtcbiAgICAgICAgICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICAgICAgICAgIGZpbHRlck5vZGUuZnJlcXVlbmN5LnZhbHVlID0gdGhpcy5nZXRGcmVxdWVuY3kodmFsdWUpO1xuXG4gICAgICAgICAgICAvL2ZpbHRlck5vZGUuUS52YWx1ZSA9IHF1YWxpdHk7XG4gICAgICAgICAgICAvL2ZpbHRlck5vZGUuZ2Fpbi52YWx1ZSA9IGdhaW47XG4gICAgICAgIH0sXG4gICAgICAgIGdldEZyZXF1ZW5jeTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldCBmcmVxdWVuY3kgYnkgcGFzc2luZyBudW1iZXIgZnJvbSAwIHRvIDFcbiAgICAgICAgICAgIC8vIENsYW1wIHRoZSBmcmVxdWVuY3kgYmV0d2VlbiB0aGUgbWluaW11bSB2YWx1ZSAoNDAgSHopIGFuZCBoYWxmIG9mIHRoZVxuICAgICAgICAgICAgLy8gc2FtcGxpbmcgcmF0ZS5cbiAgICAgICAgICAgIHZhciBtaW5WYWx1ZSA9IDQwO1xuICAgICAgICAgICAgdmFyIG1heFZhbHVlID0gY29udGV4dC5zYW1wbGVSYXRlIC8gMjtcbiAgICAgICAgICAgIC8vIExvZ2FyaXRobSAoYmFzZSAyKSB0byBjb21wdXRlIGhvdyBtYW55IG9jdGF2ZXMgZmFsbCBpbiB0aGUgcmFuZ2UuXG4gICAgICAgICAgICB2YXIgbnVtYmVyT2ZPY3RhdmVzID0gTWF0aC5sb2cobWF4VmFsdWUgLyBtaW5WYWx1ZSkgLyBNYXRoLkxOMjtcbiAgICAgICAgICAgIC8vIENvbXB1dGUgYSBtdWx0aXBsaWVyIGZyb20gMCB0byAxIGJhc2VkIG9uIGFuIGV4cG9uZW50aWFsIHNjYWxlLlxuICAgICAgICAgICAgdmFyIG11bHRpcGxpZXIgPSBNYXRoLnBvdygyLCBudW1iZXJPZk9jdGF2ZXMgKiAodmFsdWUgLSAxLjApKTtcbiAgICAgICAgICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICAgICAgICAgIHJldHVybiBtYXhWYWx1ZSAqIG11bHRpcGxpZXI7XG4gICAgICAgIH0sXG4gICAgICAgIGRpc3RvcnQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBjcmVhdGUgd2F2ZVNoYXBlciBkaXN0b3J0aW9uIGN1cnZlIGZyb20gMCB0byAxXG4gICAgICAgICAgICB2YXIgayA9IHZhbHVlICogMTAwLFxuICAgICAgICAgICAgICAgIG4gPSAyMjA1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZSA9IG5ldyBGbG9hdDMyQXJyYXkobiksXG4gICAgICAgICAgICAgICAgZGVnID0gTWF0aC5QSSAvIDE4MDtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgeCA9IGkgKiAyIC8gbiAtIDE7XG4gICAgICAgICAgICAgICAgY3VydmVbaV0gPSAoMyArIGspICogeCAqIDIwICogZGVnIC8gKE1hdGguUEkgKyBrICogTWF0aC5hYnMoeCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGN1cnZlO1xuICAgICAgICB9LFxuICAgICAgICB3YXZlZm9ybTogZnVuY3Rpb24oYnVmZmVyLCBsZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciB3YXZlZm9ybSA9IG5ldyBGbG9hdDMyQXJyYXkobGVuZ3RoKSxcbiAgICAgICAgICAgICAgICBjaHVuayA9IE1hdGguZmxvb3IoYnVmZmVyLmxlbmd0aCAvIGxlbmd0aCksXG4gICAgICAgICAgICAgICAgLy9jaHVuayA9IGJ1ZmZlci5sZW5ndGggLyBsZW5ndGgsXG4gICAgICAgICAgICAgICAgcmVzb2x1dGlvbiA9IDEwLFxuICAgICAgICAgICAgICAgIGluY3IgPSBNYXRoLmZsb29yKGNodW5rIC8gcmVzb2x1dGlvbiksXG4gICAgICAgICAgICAgICAgZ3JlYXRlc3QgPSAwO1xuXG4gICAgICAgICAgICBpZihpbmNyIDwgMSkgeyBpbmNyID0gMTsgfVxuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzOyBpKyspIHtcbiAgICAgICAgICAgICAgICAvLyBjaGVjayBlYWNoIGNoYW5uZWxcbiAgICAgICAgICAgICAgICB2YXIgY2hhbm5lbCA9IGJ1ZmZlci5nZXRDaGFubmVsRGF0YShpKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGdldCBoaWdoZXN0IHZhbHVlIHdpdGhpbiB0aGUgY2h1bmtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IGogKiBjaHVuaywgbCA9IGsgKyBjaHVuazsgayA8IGw7IGsgKz0gaW5jcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2VsZWN0IGhpZ2hlc3QgdmFsdWUgZnJvbSBjaGFubmVsc1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSBNYXRoLmFicyhjaGFubmVsW2tdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhID4gd2F2ZWZvcm1bal0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3YXZlZm9ybVtqXSA9IGE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgaGlnaGVzdCBvdmVyYWxsIGZvciBzY2FsaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihhID4gZ3JlYXRlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBncmVhdGVzdCA9IGE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBzY2FsZSB1cD9cbiAgICAgICAgICAgIHZhciBzY2FsZSA9IDEgLyBncmVhdGVzdCxcbiAgICAgICAgICAgICAgICBsZW4gPSB3YXZlZm9ybS5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB3YXZlZm9ybVtpXSAqPSBzY2FsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB3YXZlZm9ybTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gVXRpbHM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBMb2FkZXIgPSByZXF1aXJlKCcuL2xpYi9sb2FkZXIuanMnKSxcbiAgICBub2RlRmFjdG9yeSA9IHJlcXVpcmUoJy4vbGliL25vZGUtZmFjdG9yeS5qcycpLFxuICAgIFNvdW5kID0gcmVxdWlyZSgnLi9saWIvc291bmQuanMnKSxcbiAgICBzdXBwb3J0ID0gcmVxdWlyZSgnLi9saWIvc3VwcG9ydC5qcycpLFxuICAgIFV0aWxzID0gcmVxdWlyZSgnLi9saWIvdXRpbHMuanMnKTtcblxuZnVuY3Rpb24gU29ubygpIHtcbiAgICB0aGlzLlZFUlNJT04gPSAnMC4wLjAnO1xuXG4gICAgdGhpcy5jb250ZXh0ID0gdGhpcy5jcmVhdGVBdWRpb0NvbnRleHQoKTtcblxuICAgIHRoaXMuX21hc3RlckdhaW4gPSB0aGlzLmNyZWF0ZS5nYWluKCk7XG5cbiAgICBpZih0aGlzLmNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fbWFzdGVyR2Fpbi5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfVxuXG4gICAgdGhpcy5fc291bmRzID0gW107XG4gICAgdGhpcy5fc3VwcG9ydCA9IHN1cHBvcnQ7XG5cbiAgICB0aGlzLmhhbmRsZVRvdWNobG9jaygpO1xuICAgIHRoaXMuaGFuZGxlVmlzaWJpbGl0eSgpO1xuICAgIC8vdGhpcy5sb2coKTtcbn1cblxuLypcbiAqIGFkZCAtIGRhdGEgY2FuIGJlIGVsZW1lbnQsIGFycmF5YnVmZmVyIG9yIGFzIHlldCBudWxsL3VuZGVmaW5lZFxuICovXG5cblNvbm8ucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKGRhdGEsIGlkKSB7XG5cbiAgICAvLyB0cnkgdG8gbG9hZCBpZiB1cmwgaXMgcHV0IGludG8gYWRkP1xuICAgIHZhciBpc0F1ZGlvQnVmZmVyID0gZGF0YSAmJiB3aW5kb3cuQXVkaW9CdWZmZXIgJiYgZGF0YSBpbnN0YW5jZW9mIHdpbmRvdy5BdWRpb0J1ZmZlcjtcbiAgICB2YXIgaXNNZWRpYUVsZW1lbnQgPSBkYXRhICYmIGRhdGEgaW5zdGFuY2VvZiB3aW5kb3cuSFRNTE1lZGlhRWxlbWVudDtcbiAgICBpZihkYXRhICYmICFpc0F1ZGlvQnVmZmVyICYmICFpc01lZGlhRWxlbWVudCkge1xuICAgICAgICB2YXIgcyA9IHRoaXMubG9hZChkYXRhKTtcbiAgICAgICAgaWYoaWQpIHsgcy5pZCA9IGlkOyB9XG4gICAgICAgIHJldHVybiBzO1xuICAgIH1cblxuICAgIGlmKGlkICYmIHRoaXMuZ2V0KGlkKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXQoaWQpO1xuICAgIH1cblxuICAgIHZhciBzb3VuZCA9IG5ldyBTb3VuZCh0aGlzLmNvbnRleHQsIGRhdGEsIHRoaXMuX21hc3RlckdhaW4pO1xuICAgIHNvdW5kLmlkID0gaWQgfHwgdGhpcy5jcmVhdGVJZCgpO1xuICAgIC8vc291bmQubG9vcCA9ICEhbG9vcDtcbiAgICBzb3VuZC5hZGQoZGF0YSk7XG4gICAgdGhpcy5fc291bmRzLnB1c2goc291bmQpO1xuICAgIHJldHVybiBzb3VuZDtcbn07XG5cblNvbm8ucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbih1cmwsIGNhbGxiYWNrLCB0aGlzQXJnLCBhc01lZGlhRWxlbWVudCkge1xuICAgIGlmKCF0aGlzLl9sb2FkZXIpIHtcbiAgICAgICAgdGhpcy5faW5pdExvYWRlcigpO1xuICAgIH1cblxuICAgIC8vIG11bHRpcGxlXG4gICAgaWYodXJsIGluc3RhbmNlb2YgQXJyYXkgJiYgdXJsLmxlbmd0aCAmJiB0eXBlb2YgdXJsWzBdID09PSAnb2JqZWN0Jykge1xuICAgICAgICB0aGlzLmxvYWRNdWx0aXBsZSh1cmwsIGNhbGxiYWNrLCB0aGlzQXJnLCBhc01lZGlhRWxlbWVudCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc291bmQgPSB0aGlzLnF1ZXVlKHVybCwgYXNNZWRpYUVsZW1lbnQpO1xuXG4gICAgaWYoY2FsbGJhY2spIHtcbiAgICAgICAgc291bmQubG9hZGVyLm9uQ29tcGxldGUuYWRkT25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZyB8fCB0aGlzLCBzb3VuZCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHNvdW5kLmxvYWRlci5zdGFydCgpO1xuXG4gICAgcmV0dXJuIHNvdW5kO1xufTtcblxuU29uby5wcm90b3R5cGUucXVldWUgPSBmdW5jdGlvbih1cmwsIGFzTWVkaWFFbGVtZW50KSB7XG4gICAgaWYoIXRoaXMuX2xvYWRlcikge1xuICAgICAgICB0aGlzLl9pbml0TG9hZGVyKCk7XG4gICAgfVxuXG4gICAgdXJsID0gc3VwcG9ydC5nZXRTdXBwb3J0ZWRGaWxlKHVybCk7XG5cbiAgICB2YXIgc291bmQgPSB0aGlzLmFkZCgpO1xuXG4gICAgc291bmQubG9hZGVyID0gdGhpcy5fbG9hZGVyLmFkZCh1cmwpO1xuICAgIHNvdW5kLmxvYWRlci5vbkJlZm9yZUNvbXBsZXRlLmFkZE9uY2UoZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgIHNvdW5kLmFkZChidWZmZXIpO1xuICAgIH0pO1xuXG4gICAgaWYoYXNNZWRpYUVsZW1lbnQpIHtcbiAgICAgICAgc291bmQubG9hZGVyLndlYkF1ZGlvQ29udGV4dCA9IG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNvdW5kO1xufTtcblxuU29uby5wcm90b3R5cGUubG9hZE11bHRpcGxlID0gZnVuY3Rpb24oY29uZmlnLCBjb21wbGV0ZSwgcHJvZ3Jlc3MsIHRoaXNBcmcsIGFzTWVkaWFFbGVtZW50KSB7XG4gICAgdmFyIHNvdW5kcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gY29uZmlnLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIgZmlsZSA9IGNvbmZpZ1tpXTtcblxuICAgICAgICB2YXIgc291bmQgPSB0aGlzLnF1ZXVlKGZpbGUudXJsLCBhc01lZGlhRWxlbWVudCk7XG4gICAgICAgIHNvdW5kLmlkID0gZmlsZS5pZDtcbiAgICAgICAgc291bmRzLnB1c2goc291bmQpO1xuICAgIH1cbiAgICBpZihwcm9ncmVzcykge1xuICAgICAgICB0aGlzLl9sb2FkZXIub25Qcm9ncmVzcy5hZGQoZnVuY3Rpb24ocCkge1xuICAgICAgICAgICAgcHJvZ3Jlc3MuY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgaWYoY29tcGxldGUpIHtcbiAgICAgICAgdGhpcy5fbG9hZGVyLm9uQ29tcGxldGUuYWRkT25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbXBsZXRlLmNhbGwodGhpc0FyZyB8fCB0aGlzLCBzb3VuZHMpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5fbG9hZGVyLnN0YXJ0KCk7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihzb3VuZE9ySWQpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuX3NvdW5kcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYodGhpcy5fc291bmRzW2ldID09PSBzb3VuZE9ySWQgfHwgdGhpcy5fc291bmRzW2ldLmlkID09PSBzb3VuZE9ySWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zb3VuZHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5jcmVhdGVJZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX2lkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5faWQgPSAwO1xuICAgIH1cbiAgICB0aGlzLl9pZCsrO1xuICAgIHJldHVybiB0aGlzLl9pZC50b1N0cmluZygxMCk7XG59O1xuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5tdXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcHJlTXV0ZVZvbHVtZSA9IHRoaXMudm9sdW1lO1xuICAgIHRoaXMudm9sdW1lID0gMDtcbn07XG5cblNvbm8ucHJvdG90eXBlLnVuTXV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudm9sdW1lID0gdGhpcy5fcHJlTXV0ZVZvbHVtZSB8fCAxO1xufTtcblxuU29uby5wcm90b3R5cGUucGF1c2VBbGwgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuX3NvdW5kcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYodGhpcy5fc291bmRzW2ldLnBsYXlpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdW5kc1tpXS5wYXVzZSgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuU29uby5wcm90b3R5cGUucmVzdW1lQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9zb3VuZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKHRoaXMuX3NvdW5kc1tpXS5wYXVzZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdW5kc1tpXS5wbGF5KCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Tb25vLnByb3RvdHlwZS5zdG9wQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9zb3VuZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHRoaXMuX3NvdW5kc1tpXS5zdG9wKCk7XG4gICAgfVxufTtcblxuU29uby5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGlkLCBkZWxheSwgb2Zmc2V0KSB7XG4gICAgdGhpcy5nZXQoaWQpLnBsYXkoZGVsYXksIG9mZnNldCk7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy5nZXQoaWQpLnBhdXNlKCk7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oaWQpIHtcbiAgICB0aGlzLmdldChpZCkuc3RvcCgpO1xufTtcblxuLypcbiAqIExvYWRpbmdcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5faW5pdExvYWRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xvYWRlciA9IG5ldyBMb2FkZXIoKTtcbiAgICB0aGlzLl9sb2FkZXIudG91Y2hMb2NrZWQgPSB0aGlzLl9pc1RvdWNoTG9ja2VkO1xuICAgIHRoaXMuX2xvYWRlci53ZWJBdWRpb0NvbnRleHQgPSB0aGlzLmNvbnRleHQ7XG4gICAgdGhpcy5fbG9hZGVyLmNyb3NzT3JpZ2luID0gdHJ1ZTtcbn07XG5cblNvbm8ucHJvdG90eXBlLmxvYWRBcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gdGhpcy5sb2FkKHVybCwgY2FsbGJhY2ssIHRoaXNBcmcsIGZhbHNlKTtcbn07XG5cblNvbm8ucHJvdG90eXBlLmxvYWRBdWRpb0VsZW1lbnQgPSBmdW5jdGlvbih1cmwsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgcmV0dXJuIHRoaXMubG9hZCh1cmwsIGNhbGxiYWNrLCB0aGlzQXJnLCB0cnVlKTtcbn07XG5cblNvbm8ucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbihzb3VuZE9ySWQpIHtcbiAgICB2YXIgc291bmQ7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9zb3VuZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHNvdW5kID0gdGhpcy5fc291bmRzW2ldO1xuICAgICAgICBpZihzb3VuZCA9PT0gc291bmRPcklkIHx8IHNvdW5kLmlkID09PSBzb3VuZE9ySWQpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmKHNvdW5kICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fc291bmRzLnNwbGljZShpLCAxKTtcblxuICAgICAgICBpZihzb3VuZC5sb2FkZXIpIHtcbiAgICAgICAgICAgIHNvdW5kLmxvYWRlci5jYW5jZWwoKTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc291bmQuc3RvcCgpOyAgICBcbiAgICAgICAgfSBjYXRjaChlKSB7fVxuICAgIH1cbn07XG5cbi8qXG4gKiBBdWRpbyBjb250ZXh0XG4gKi9cblxuU29uby5wcm90b3R5cGUuY3JlYXRlQXVkaW9Db250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNvbnRleHQgPSBudWxsO1xuICAgIHdpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG4gICAgaWYod2luZG93LkF1ZGlvQ29udGV4dCkge1xuICAgICAgICBjb250ZXh0ID0gbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRleHQ7XG59O1xuXG4vKlxuICogTW9iaWxlIHRvdWNoIGxvY2tcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5oYW5kbGVUb3VjaGxvY2sgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50LFxuICAgICAgICBsb2NrZWQgPSAhIXVhLm1hdGNoKC9BbmRyb2lkfHdlYk9TfGlQaG9uZXxpUGFkfGlQb2R8QmxhY2tCZXJyeXxJRU1vYmlsZXxPcGVyYSBNaW5pL2kpLFxuICAgICAgICBzZWxmID0gdGhpcztcblxuICAgIHZhciB1bmxvY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdW5sb2NrKTtcbiAgICAgICAgc2VsZi5faXNUb3VjaExvY2tlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9sb2FkZXIudG91Y2hMb2NrZWQgPSBmYWxzZTtcblxuICAgICAgICBpZihzZWxmLmNvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBidWZmZXIgPSBzZWxmLmNvbnRleHQuY3JlYXRlQnVmZmVyKDEsIDEsIDIyMDUwKTtcbiAgICAgICAgICAgIHZhciB1bmxvY2tTb3VyY2UgPSBzZWxmLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgICAgICAgICB1bmxvY2tTb3VyY2UuYnVmZmVyID0gYnVmZmVyO1xuICAgICAgICAgICAgdW5sb2NrU291cmNlLmNvbm5lY3Qoc2VsZi5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIHVubG9ja1NvdXJjZS5zdGFydCgwKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgaWYobG9ja2VkKSB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHVubG9jaywgZmFsc2UpO1xuICAgIH1cbiAgICB0aGlzLl9pc1RvdWNoTG9ja2VkID0gbG9ja2VkO1xufTtcblxuLypcbiAqIFBhZ2UgdmlzaWJpbGl0eSBldmVudHNcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5oYW5kbGVWaXNpYmlsaXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhZ2VIaWRkZW5QYXVzZWQgPSBbXSxcbiAgICAgICAgc291bmRzID0gdGhpcy5fc291bmRzLFxuICAgICAgICBoaWRkZW4sXG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2U7XG5cbiAgICBpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ2hpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAndmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQubW96SGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBoaWRkZW4gPSAnbW96SGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICdtb3p2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tc0hpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ21zSGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICdtc3Zpc2liaWxpdHljaGFuZ2UnO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50LndlYmtpdEhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ3dlYmtpdEhpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnd2Via2l0dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuXG4gICAgLy8gcGF1c2UgY3VycmVudGx5IHBsYXlpbmcgc291bmRzIGFuZCBzdG9yZSByZWZzXG4gICAgZnVuY3Rpb24gb25IaWRkZW4oKSB7XG4gICAgICAgIHZhciBsID0gc291bmRzLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzb3VuZCA9IHNvdW5kc1tpXTtcbiAgICAgICAgICAgIGlmKHNvdW5kLnBsYXlpbmcpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIHBhZ2VIaWRkZW5QYXVzZWQucHVzaChzb3VuZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBwbGF5IHNvdW5kcyB0aGF0IGdvdCBwYXVzZWQgd2hlbiBwYWdlIHdhcyBoaWRkZW5cbiAgICBmdW5jdGlvbiBvblNob3duKCkge1xuICAgICAgICB3aGlsZShwYWdlSGlkZGVuUGF1c2VkLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFnZUhpZGRlblBhdXNlZC5wb3AoKS5wbGF5KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkNoYW5nZSgpIHtcbiAgICAgICAgaWYgKGRvY3VtZW50W2hpZGRlbl0pIHtcbiAgICAgICAgICAgIG9uSGlkZGVuKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvblNob3duKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZih2aXNpYmlsaXR5Q2hhbmdlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih2aXNpYmlsaXR5Q2hhbmdlLCBvbkNoYW5nZSwgZmFsc2UpO1xuICAgIH1cbn07XG5cbi8qXG4gKiBMb2cgZGV2aWNlIHN1cHBvcnQgaW5mb1xuICovXG5cblNvbm8ucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uKGNvbG9yRnVsbCkge1xuICAgIHZhciB0aXRsZSA9ICdTb25vICcgKyB0aGlzLlZFUlNJT04sXG4gICAgICAgIGluZm8gPSAnU3VwcG9ydGVkOicgKyB0aGlzLmlzU3VwcG9ydGVkICtcbiAgICAgICAgICAgICAgICcgV2ViQXVkaW9BUEk6JyArIHRoaXMuaGFzV2ViQXVkaW8gK1xuICAgICAgICAgICAgICAgJyBUb3VjaExvY2tlZDonICsgdGhpcy5faXNUb3VjaExvY2tlZCArXG4gICAgICAgICAgICAgICAnIEV4dGVuc2lvbnM6JyArIHRoaXMuX3N1cHBvcnQuZXh0ZW5zaW9ucztcblxuICAgIGlmKGNvbG9yRnVsbCAmJiBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ0Nocm9tZScpID4gLTEpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXG4gICAgICAgICAgICAnJWMgJWMgJyArIHRpdGxlICtcbiAgICAgICAgICAgICcgJWMgJWMgJyArXG4gICAgICAgICAgICBpbmZvICtcbiAgICAgICAgICAgICcgJWMgJyxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kOiAjMTdkMTg2JyxcbiAgICAgICAgICAgICdjb2xvcjogIzAwMDAwMDsgYmFja2dyb3VuZDogI2QwZjczNjsgZm9udC13ZWlnaHQ6IGJvbGQnLFxuICAgICAgICAgICAgJ2JhY2tncm91bmQ6ICMxN2QxODYnLFxuICAgICAgICAgICAgJ2JhY2tncm91bmQ6ICNmN2Y5NGYnLFxuICAgICAgICAgICAgJ2JhY2tncm91bmQ6ICMxN2QxODYnXG4gICAgICAgIF07XG4gICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICAgIH1cbiAgICBlbHNlIGlmICh3aW5kb3cuY29uc29sZSkge1xuICAgICAgICBjb25zb2xlLmxvZyh0aXRsZSArICcgJyArIGluZm8pO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2lzU3VwcG9ydGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdXBwb3J0LmV4dGVuc2lvbnMubGVuZ3RoID4gMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnY2FuUGxheScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3VwcG9ydC5jYW5QbGF5O1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdoYXNXZWJBdWRpbycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLmNvbnRleHQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ3ZvbHVtZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWFzdGVyR2Fpbi5nYWluLnZhbHVlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZihpc05hTih2YWx1ZSkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgdGhpcy5fbWFzdGVyR2Fpbi5nYWluLnZhbHVlID0gdmFsdWU7XG5cbiAgICAgICAgaWYoIXRoaXMuaGFzV2ViQXVkaW8pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5fc291bmRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NvdW5kc1tpXS52b2x1bWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdzb3VuZHMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdW5kcztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnY3JlYXRlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9ub2RlRmFjdG9yeSkge1xuICAgICAgICAgICAgdGhpcy5fbm9kZUZhY3RvcnkgPSBub2RlRmFjdG9yeSh0aGlzLmNvbnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlRmFjdG9yeTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAndXRpbHMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3V0aWxzKSB7XG4gICAgICAgICAgICB0aGlzLl91dGlscyA9IG5ldyBVdGlscyh0aGlzLmNvbnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl91dGlscztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnbG9hZGVyJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb2FkZXI7XG4gICAgfVxufSk7XG5cbi8qXG4gKiBFeHBvcnRzXG4gKi9cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBuZXcgU29ubygpO1xufVxuIl19
(9)
});
