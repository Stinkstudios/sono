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
            console.time('waveform');
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
            console.timeEnd('waveform');
            return waveform;
        },
        waveform: function(arr, height, color, bgColor, canvasEl) {
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
            console.time('drawWaveform');
            context.beginPath();
            for (var i = 0, l = arr.length; i < l; i++) {
                x = i + 0.5;
                y = height - Math.round(height * arr[i]);
                context.moveTo(x, y);
                context.lineTo(x, height);
            }
            context.stroke();
            console.timeEnd('drawWaveform');
            return canvas;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9ub2RlX21vZHVsZXMvc2lnbmFscy9kaXN0L3NpZ25hbHMuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL2J1ZmZlci1zb3VyY2UuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL2VsZW1lbnQtc291cmNlLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL2xpYi9sb2FkZXIuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL25vZGUtZmFjdG9yeS5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvc291bmQuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL3N1cHBvcnQuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL3V0aWxzLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL3Nvbm8uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypqc2xpbnQgb25ldmFyOnRydWUsIHVuZGVmOnRydWUsIG5ld2NhcDp0cnVlLCByZWdleHA6dHJ1ZSwgYml0d2lzZTp0cnVlLCBtYXhlcnI6NTAsIGluZGVudDo0LCB3aGl0ZTpmYWxzZSwgbm9tZW46ZmFsc2UsIHBsdXNwbHVzOmZhbHNlICovXG4vKmdsb2JhbCBkZWZpbmU6ZmFsc2UsIHJlcXVpcmU6ZmFsc2UsIGV4cG9ydHM6ZmFsc2UsIG1vZHVsZTpmYWxzZSwgc2lnbmFsczpmYWxzZSAqL1xuXG4vKiogQGxpY2Vuc2VcbiAqIEpTIFNpZ25hbHMgPGh0dHA6Ly9taWxsZXJtZWRlaXJvcy5naXRodWIuY29tL2pzLXNpZ25hbHMvPlxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlXG4gKiBBdXRob3I6IE1pbGxlciBNZWRlaXJvc1xuICogVmVyc2lvbjogMS4wLjAgLSBCdWlsZDogMjY4ICgyMDEyLzExLzI5IDA1OjQ4IFBNKVxuICovXG5cbihmdW5jdGlvbihnbG9iYWwpe1xuXG4gICAgLy8gU2lnbmFsQmluZGluZyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBPYmplY3QgdGhhdCByZXByZXNlbnRzIGEgYmluZGluZyBiZXR3ZWVuIGEgU2lnbmFsIGFuZCBhIGxpc3RlbmVyIGZ1bmN0aW9uLlxuICAgICAqIDxiciAvPi0gPHN0cm9uZz5UaGlzIGlzIGFuIGludGVybmFsIGNvbnN0cnVjdG9yIGFuZCBzaG91bGRuJ3QgYmUgY2FsbGVkIGJ5IHJlZ3VsYXIgdXNlcnMuPC9zdHJvbmc+XG4gICAgICogPGJyIC8+LSBpbnNwaXJlZCBieSBKb2EgRWJlcnQgQVMzIFNpZ25hbEJpbmRpbmcgYW5kIFJvYmVydCBQZW5uZXIncyBTbG90IGNsYXNzZXMuXG4gICAgICogQGF1dGhvciBNaWxsZXIgTWVkZWlyb3NcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAbmFtZSBTaWduYWxCaW5kaW5nXG4gICAgICogQHBhcmFtIHtTaWduYWx9IHNpZ25hbCBSZWZlcmVuY2UgdG8gU2lnbmFsIG9iamVjdCB0aGF0IGxpc3RlbmVyIGlzIGN1cnJlbnRseSBib3VuZCB0by5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBIYW5kbGVyIGZ1bmN0aW9uIGJvdW5kIHRvIHRoZSBzaWduYWwuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc09uY2UgSWYgYmluZGluZyBzaG91bGQgYmUgZXhlY3V0ZWQganVzdCBvbmNlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbbGlzdGVuZXJDb250ZXh0XSBDb250ZXh0IG9uIHdoaWNoIGxpc3RlbmVyIHdpbGwgYmUgZXhlY3V0ZWQgKG9iamVjdCB0aGF0IHNob3VsZCByZXByZXNlbnQgdGhlIGB0aGlzYCB2YXJpYWJsZSBpbnNpZGUgbGlzdGVuZXIgZnVuY3Rpb24pLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbcHJpb3JpdHldIFRoZSBwcmlvcml0eSBsZXZlbCBvZiB0aGUgZXZlbnQgbGlzdGVuZXIuIChkZWZhdWx0ID0gMCkuXG4gICAgICovXG4gICAgZnVuY3Rpb24gU2lnbmFsQmluZGluZyhzaWduYWwsIGxpc3RlbmVyLCBpc09uY2UsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSGFuZGxlciBmdW5jdGlvbiBib3VuZCB0byB0aGUgc2lnbmFsLlxuICAgICAgICAgKiBAdHlwZSBGdW5jdGlvblxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fbGlzdGVuZXIgPSBsaXN0ZW5lcjtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgYmluZGluZyBzaG91bGQgYmUgZXhlY3V0ZWQganVzdCBvbmNlLlxuICAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9pc09uY2UgPSBpc09uY2U7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnRleHQgb24gd2hpY2ggbGlzdGVuZXIgd2lsbCBiZSBleGVjdXRlZCAob2JqZWN0IHRoYXQgc2hvdWxkIHJlcHJlc2VudCB0aGUgYHRoaXNgIHZhcmlhYmxlIGluc2lkZSBsaXN0ZW5lciBmdW5jdGlvbikuXG4gICAgICAgICAqIEBtZW1iZXJPZiBTaWduYWxCaW5kaW5nLnByb3RvdHlwZVxuICAgICAgICAgKiBAbmFtZSBjb250ZXh0XG4gICAgICAgICAqIEB0eXBlIE9iamVjdHx1bmRlZmluZWR8bnVsbFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jb250ZXh0ID0gbGlzdGVuZXJDb250ZXh0O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZWZlcmVuY2UgdG8gU2lnbmFsIG9iamVjdCB0aGF0IGxpc3RlbmVyIGlzIGN1cnJlbnRseSBib3VuZCB0by5cbiAgICAgICAgICogQHR5cGUgU2lnbmFsXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9zaWduYWwgPSBzaWduYWw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIExpc3RlbmVyIHByaW9yaXR5XG4gICAgICAgICAqIEB0eXBlIE51bWJlclxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fcHJpb3JpdHkgPSBwcmlvcml0eSB8fCAwO1xuICAgIH1cblxuICAgIFNpZ25hbEJpbmRpbmcucHJvdG90eXBlID0ge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiBiaW5kaW5nIGlzIGFjdGl2ZSBhbmQgc2hvdWxkIGJlIGV4ZWN1dGVkLlxuICAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICAqL1xuICAgICAgICBhY3RpdmUgOiB0cnVlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWZhdWx0IHBhcmFtZXRlcnMgcGFzc2VkIHRvIGxpc3RlbmVyIGR1cmluZyBgU2lnbmFsLmRpc3BhdGNoYCBhbmQgYFNpZ25hbEJpbmRpbmcuZXhlY3V0ZWAuIChjdXJyaWVkIHBhcmFtZXRlcnMpXG4gICAgICAgICAqIEB0eXBlIEFycmF5fG51bGxcbiAgICAgICAgICovXG4gICAgICAgIHBhcmFtcyA6IG51bGwsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhbGwgbGlzdGVuZXIgcGFzc2luZyBhcmJpdHJhcnkgcGFyYW1ldGVycy5cbiAgICAgICAgICogPHA+SWYgYmluZGluZyB3YXMgYWRkZWQgdXNpbmcgYFNpZ25hbC5hZGRPbmNlKClgIGl0IHdpbGwgYmUgYXV0b21hdGljYWxseSByZW1vdmVkIGZyb20gc2lnbmFsIGRpc3BhdGNoIHF1ZXVlLCB0aGlzIG1ldGhvZCBpcyB1c2VkIGludGVybmFsbHkgZm9yIHRoZSBzaWduYWwgZGlzcGF0Y2guPC9wPlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBbcGFyYW1zQXJyXSBBcnJheSBvZiBwYXJhbWV0ZXJzIHRoYXQgc2hvdWxkIGJlIHBhc3NlZCB0byB0aGUgbGlzdGVuZXJcbiAgICAgICAgICogQHJldHVybiB7Kn0gVmFsdWUgcmV0dXJuZWQgYnkgdGhlIGxpc3RlbmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgZXhlY3V0ZSA6IGZ1bmN0aW9uIChwYXJhbXNBcnIpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGVyUmV0dXJuLCBwYXJhbXM7XG4gICAgICAgICAgICBpZiAodGhpcy5hY3RpdmUgJiYgISF0aGlzLl9saXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIHBhcmFtcyA9IHRoaXMucGFyYW1zPyB0aGlzLnBhcmFtcy5jb25jYXQocGFyYW1zQXJyKSA6IHBhcmFtc0FycjtcbiAgICAgICAgICAgICAgICBoYW5kbGVyUmV0dXJuID0gdGhpcy5fbGlzdGVuZXIuYXBwbHkodGhpcy5jb250ZXh0LCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9pc09uY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlclJldHVybjtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGV0YWNoIGJpbmRpbmcgZnJvbSBzaWduYWwuXG4gICAgICAgICAqIC0gYWxpYXMgdG86IG15U2lnbmFsLnJlbW92ZShteUJpbmRpbmcuZ2V0TGlzdGVuZXIoKSk7XG4gICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufG51bGx9IEhhbmRsZXIgZnVuY3Rpb24gYm91bmQgdG8gdGhlIHNpZ25hbCBvciBgbnVsbGAgaWYgYmluZGluZyB3YXMgcHJldmlvdXNseSBkZXRhY2hlZC5cbiAgICAgICAgICovXG4gICAgICAgIGRldGFjaCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzQm91bmQoKT8gdGhpcy5fc2lnbmFsLnJlbW92ZSh0aGlzLl9saXN0ZW5lciwgdGhpcy5jb250ZXh0KSA6IG51bGw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IGB0cnVlYCBpZiBiaW5kaW5nIGlzIHN0aWxsIGJvdW5kIHRvIHRoZSBzaWduYWwgYW5kIGhhdmUgYSBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGlzQm91bmQgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKCEhdGhpcy5fc2lnbmFsICYmICEhdGhpcy5fbGlzdGVuZXIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtib29sZWFufSBJZiBTaWduYWxCaW5kaW5nIHdpbGwgb25seSBiZSBleGVjdXRlZCBvbmNlLlxuICAgICAgICAgKi9cbiAgICAgICAgaXNPbmNlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzT25jZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IEhhbmRsZXIgZnVuY3Rpb24gYm91bmQgdG8gdGhlIHNpZ25hbC5cbiAgICAgICAgICovXG4gICAgICAgIGdldExpc3RlbmVyIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xpc3RlbmVyO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtTaWduYWx9IFNpZ25hbCB0aGF0IGxpc3RlbmVyIGlzIGN1cnJlbnRseSBib3VuZCB0by5cbiAgICAgICAgICovXG4gICAgICAgIGdldFNpZ25hbCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zaWduYWw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlbGV0ZSBpbnN0YW5jZSBwcm9wZXJ0aWVzXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfZGVzdHJveSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9zaWduYWw7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fbGlzdGVuZXI7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5jb250ZXh0O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgdG9TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1tTaWduYWxCaW5kaW5nIGlzT25jZTonICsgdGhpcy5faXNPbmNlICsnLCBpc0JvdW5kOicrIHRoaXMuaXNCb3VuZCgpICsnLCBhY3RpdmU6JyArIHRoaXMuYWN0aXZlICsgJ10nO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG5cbi8qZ2xvYmFsIFNpZ25hbEJpbmRpbmc6ZmFsc2UqL1xuXG4gICAgLy8gU2lnbmFsIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZUxpc3RlbmVyKGxpc3RlbmVyLCBmbk5hbWUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnbGlzdGVuZXIgaXMgYSByZXF1aXJlZCBwYXJhbSBvZiB7Zm59KCkgYW5kIHNob3VsZCBiZSBhIEZ1bmN0aW9uLicucmVwbGFjZSgne2ZufScsIGZuTmFtZSkgKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBldmVudCBicm9hZGNhc3RlclxuICAgICAqIDxiciAvPi0gaW5zcGlyZWQgYnkgUm9iZXJ0IFBlbm5lcidzIEFTMyBTaWduYWxzLlxuICAgICAqIEBuYW1lIFNpZ25hbFxuICAgICAqIEBhdXRob3IgTWlsbGVyIE1lZGVpcm9zXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gU2lnbmFsKCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQHR5cGUgQXJyYXkuPFNpZ25hbEJpbmRpbmc+XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9iaW5kaW5ncyA9IFtdO1xuICAgICAgICB0aGlzLl9wcmV2UGFyYW1zID0gbnVsbDtcblxuICAgICAgICAvLyBlbmZvcmNlIGRpc3BhdGNoIHRvIGF3YXlzIHdvcmsgb24gc2FtZSBjb250ZXh0ICgjNDcpXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5kaXNwYXRjaCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBTaWduYWwucHJvdG90eXBlLmRpc3BhdGNoLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgU2lnbmFsLnByb3RvdHlwZSA9IHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2lnbmFscyBWZXJzaW9uIE51bWJlclxuICAgICAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgICAgICogQGNvbnN0XG4gICAgICAgICAqL1xuICAgICAgICBWRVJTSU9OIDogJzEuMC4wJyxcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgU2lnbmFsIHNob3VsZCBrZWVwIHJlY29yZCBvZiBwcmV2aW91c2x5IGRpc3BhdGNoZWQgcGFyYW1ldGVycyBhbmRcbiAgICAgICAgICogYXV0b21hdGljYWxseSBleGVjdXRlIGxpc3RlbmVyIGR1cmluZyBgYWRkKClgL2BhZGRPbmNlKClgIGlmIFNpZ25hbCB3YXNcbiAgICAgICAgICogYWxyZWFkeSBkaXNwYXRjaGVkIGJlZm9yZS5cbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKi9cbiAgICAgICAgbWVtb3JpemUgOiBmYWxzZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX3Nob3VsZFByb3BhZ2F0ZSA6IHRydWUsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIFNpZ25hbCBpcyBhY3RpdmUgYW5kIHNob3VsZCBicm9hZGNhc3QgZXZlbnRzLlxuICAgICAgICAgKiA8cD48c3Ryb25nPklNUE9SVEFOVDo8L3N0cm9uZz4gU2V0dGluZyB0aGlzIHByb3BlcnR5IGR1cmluZyBhIGRpc3BhdGNoIHdpbGwgb25seSBhZmZlY3QgdGhlIG5leHQgZGlzcGF0Y2gsIGlmIHlvdSB3YW50IHRvIHN0b3AgdGhlIHByb3BhZ2F0aW9uIG9mIGEgc2lnbmFsIHVzZSBgaGFsdCgpYCBpbnN0ZWFkLjwvcD5cbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKi9cbiAgICAgICAgYWN0aXZlIDogdHJ1ZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXJcbiAgICAgICAgICogQHBhcmFtIHtib29sZWFufSBpc09uY2VcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtsaXN0ZW5lckNvbnRleHRdXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbcHJpb3JpdHldXG4gICAgICAgICAqIEByZXR1cm4ge1NpZ25hbEJpbmRpbmd9XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfcmVnaXN0ZXJMaXN0ZW5lciA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgaXNPbmNlLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KSB7XG5cbiAgICAgICAgICAgIHZhciBwcmV2SW5kZXggPSB0aGlzLl9pbmRleE9mTGlzdGVuZXIobGlzdGVuZXIsIGxpc3RlbmVyQ29udGV4dCksXG4gICAgICAgICAgICAgICAgYmluZGluZztcblxuICAgICAgICAgICAgaWYgKHByZXZJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBiaW5kaW5nID0gdGhpcy5fYmluZGluZ3NbcHJldkluZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoYmluZGluZy5pc09uY2UoKSAhPT0gaXNPbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignWW91IGNhbm5vdCBhZGQnKyAoaXNPbmNlPyAnJyA6ICdPbmNlJykgKycoKSB0aGVuIGFkZCcrICghaXNPbmNlPyAnJyA6ICdPbmNlJykgKycoKSB0aGUgc2FtZSBsaXN0ZW5lciB3aXRob3V0IHJlbW92aW5nIHRoZSByZWxhdGlvbnNoaXAgZmlyc3QuJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBiaW5kaW5nID0gbmV3IFNpZ25hbEJpbmRpbmcodGhpcywgbGlzdGVuZXIsIGlzT25jZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkQmluZGluZyhiaW5kaW5nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYodGhpcy5tZW1vcml6ZSAmJiB0aGlzLl9wcmV2UGFyYW1zKXtcbiAgICAgICAgICAgICAgICBiaW5kaW5nLmV4ZWN1dGUodGhpcy5fcHJldlBhcmFtcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBiaW5kaW5nO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge1NpZ25hbEJpbmRpbmd9IGJpbmRpbmdcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9hZGRCaW5kaW5nIDogZnVuY3Rpb24gKGJpbmRpbmcpIHtcbiAgICAgICAgICAgIC8vc2ltcGxpZmllZCBpbnNlcnRpb24gc29ydFxuICAgICAgICAgICAgdmFyIG4gPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGg7XG4gICAgICAgICAgICBkbyB7IC0tbjsgfSB3aGlsZSAodGhpcy5fYmluZGluZ3Nbbl0gJiYgYmluZGluZy5fcHJpb3JpdHkgPD0gdGhpcy5fYmluZGluZ3Nbbl0uX3ByaW9yaXR5KTtcbiAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzLnNwbGljZShuICsgMSwgMCwgYmluZGluZyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEByZXR1cm4ge251bWJlcn1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9pbmRleE9mTGlzdGVuZXIgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBuID0gdGhpcy5fYmluZGluZ3MubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGN1cjtcbiAgICAgICAgICAgIHdoaWxlIChuLS0pIHtcbiAgICAgICAgICAgICAgICBjdXIgPSB0aGlzLl9iaW5kaW5nc1tuXTtcbiAgICAgICAgICAgICAgICBpZiAoY3VyLl9saXN0ZW5lciA9PT0gbGlzdGVuZXIgJiYgY3VyLmNvbnRleHQgPT09IGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGVjayBpZiBsaXN0ZW5lciB3YXMgYXR0YWNoZWQgdG8gU2lnbmFsLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbnRleHRdXG4gICAgICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IGlmIFNpZ25hbCBoYXMgdGhlIHNwZWNpZmllZCBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGhhcyA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4T2ZMaXN0ZW5lcihsaXN0ZW5lciwgY29udGV4dCkgIT09IC0xO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGQgYSBsaXN0ZW5lciB0byB0aGUgc2lnbmFsLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBTaWduYWwgaGFuZGxlciBmdW5jdGlvbi5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtsaXN0ZW5lckNvbnRleHRdIENvbnRleHQgb24gd2hpY2ggbGlzdGVuZXIgd2lsbCBiZSBleGVjdXRlZCAob2JqZWN0IHRoYXQgc2hvdWxkIHJlcHJlc2VudCB0aGUgYHRoaXNgIHZhcmlhYmxlIGluc2lkZSBsaXN0ZW5lciBmdW5jdGlvbikuXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbcHJpb3JpdHldIFRoZSBwcmlvcml0eSBsZXZlbCBvZiB0aGUgZXZlbnQgbGlzdGVuZXIuIExpc3RlbmVycyB3aXRoIGhpZ2hlciBwcmlvcml0eSB3aWxsIGJlIGV4ZWN1dGVkIGJlZm9yZSBsaXN0ZW5lcnMgd2l0aCBsb3dlciBwcmlvcml0eS4gTGlzdGVuZXJzIHdpdGggc2FtZSBwcmlvcml0eSBsZXZlbCB3aWxsIGJlIGV4ZWN1dGVkIGF0IHRoZSBzYW1lIG9yZGVyIGFzIHRoZXkgd2VyZSBhZGRlZC4gKGRlZmF1bHQgPSAwKVxuICAgICAgICAgKiBAcmV0dXJuIHtTaWduYWxCaW5kaW5nfSBBbiBPYmplY3QgcmVwcmVzZW50aW5nIHRoZSBiaW5kaW5nIGJldHdlZW4gdGhlIFNpZ25hbCBhbmQgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBhZGQgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpIHtcbiAgICAgICAgICAgIHZhbGlkYXRlTGlzdGVuZXIobGlzdGVuZXIsICdhZGQnKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWdpc3Rlckxpc3RlbmVyKGxpc3RlbmVyLCBmYWxzZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZCBsaXN0ZW5lciB0byB0aGUgc2lnbmFsIHRoYXQgc2hvdWxkIGJlIHJlbW92ZWQgYWZ0ZXIgZmlyc3QgZXhlY3V0aW9uICh3aWxsIGJlIGV4ZWN1dGVkIG9ubHkgb25jZSkuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIFNpZ25hbCBoYW5kbGVyIGZ1bmN0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2xpc3RlbmVyQ29udGV4dF0gQ29udGV4dCBvbiB3aGljaCBsaXN0ZW5lciB3aWxsIGJlIGV4ZWN1dGVkIChvYmplY3QgdGhhdCBzaG91bGQgcmVwcmVzZW50IHRoZSBgdGhpc2AgdmFyaWFibGUgaW5zaWRlIGxpc3RlbmVyIGZ1bmN0aW9uKS5cbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IFtwcmlvcml0eV0gVGhlIHByaW9yaXR5IGxldmVsIG9mIHRoZSBldmVudCBsaXN0ZW5lci4gTGlzdGVuZXJzIHdpdGggaGlnaGVyIHByaW9yaXR5IHdpbGwgYmUgZXhlY3V0ZWQgYmVmb3JlIGxpc3RlbmVycyB3aXRoIGxvd2VyIHByaW9yaXR5LiBMaXN0ZW5lcnMgd2l0aCBzYW1lIHByaW9yaXR5IGxldmVsIHdpbGwgYmUgZXhlY3V0ZWQgYXQgdGhlIHNhbWUgb3JkZXIgYXMgdGhleSB3ZXJlIGFkZGVkLiAoZGVmYXVsdCA9IDApXG4gICAgICAgICAqIEByZXR1cm4ge1NpZ25hbEJpbmRpbmd9IEFuIE9iamVjdCByZXByZXNlbnRpbmcgdGhlIGJpbmRpbmcgYmV0d2VlbiB0aGUgU2lnbmFsIGFuZCBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGFkZE9uY2UgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpIHtcbiAgICAgICAgICAgIHZhbGlkYXRlTGlzdGVuZXIobGlzdGVuZXIsICdhZGRPbmNlJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcmVnaXN0ZXJMaXN0ZW5lcihsaXN0ZW5lciwgdHJ1ZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZSBhIHNpbmdsZSBsaXN0ZW5lciBmcm9tIHRoZSBkaXNwYXRjaCBxdWV1ZS5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgSGFuZGxlciBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSByZW1vdmVkLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbnRleHRdIEV4ZWN1dGlvbiBjb250ZXh0IChzaW5jZSB5b3UgY2FuIGFkZCB0aGUgc2FtZSBoYW5kbGVyIG11bHRpcGxlIHRpbWVzIGlmIGV4ZWN1dGluZyBpbiBhIGRpZmZlcmVudCBjb250ZXh0KS5cbiAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IExpc3RlbmVyIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmUgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHZhbGlkYXRlTGlzdGVuZXIobGlzdGVuZXIsICdyZW1vdmUnKTtcblxuICAgICAgICAgICAgdmFyIGkgPSB0aGlzLl9pbmRleE9mTGlzdGVuZXIobGlzdGVuZXIsIGNvbnRleHQpO1xuICAgICAgICAgICAgaWYgKGkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZGluZ3NbaV0uX2Rlc3Ryb3koKTsgLy9ubyByZWFzb24gdG8gYSBTaWduYWxCaW5kaW5nIGV4aXN0IGlmIGl0IGlzbid0IGF0dGFjaGVkIHRvIGEgc2lnbmFsXG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZGluZ3Muc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGxpc3RlbmVyO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmUgYWxsIGxpc3RlbmVycyBmcm9tIHRoZSBTaWduYWwuXG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmVBbGwgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbiA9IHRoaXMuX2JpbmRpbmdzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChuLS0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9iaW5kaW5nc1tuXS5fZGVzdHJveSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fYmluZGluZ3MubGVuZ3RoID0gMDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7bnVtYmVyfSBOdW1iZXIgb2YgbGlzdGVuZXJzIGF0dGFjaGVkIHRvIHRoZSBTaWduYWwuXG4gICAgICAgICAqL1xuICAgICAgICBnZXROdW1MaXN0ZW5lcnMgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYmluZGluZ3MubGVuZ3RoO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9wIHByb3BhZ2F0aW9uIG9mIHRoZSBldmVudCwgYmxvY2tpbmcgdGhlIGRpc3BhdGNoIHRvIG5leHQgbGlzdGVuZXJzIG9uIHRoZSBxdWV1ZS5cbiAgICAgICAgICogPHA+PHN0cm9uZz5JTVBPUlRBTlQ6PC9zdHJvbmc+IHNob3VsZCBiZSBjYWxsZWQgb25seSBkdXJpbmcgc2lnbmFsIGRpc3BhdGNoLCBjYWxsaW5nIGl0IGJlZm9yZS9hZnRlciBkaXNwYXRjaCB3b24ndCBhZmZlY3Qgc2lnbmFsIGJyb2FkY2FzdC48L3A+XG4gICAgICAgICAqIEBzZWUgU2lnbmFsLnByb3RvdHlwZS5kaXNhYmxlXG4gICAgICAgICAqL1xuICAgICAgICBoYWx0IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fc2hvdWxkUHJvcGFnYXRlID0gZmFsc2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERpc3BhdGNoL0Jyb2FkY2FzdCBTaWduYWwgdG8gYWxsIGxpc3RlbmVycyBhZGRlZCB0byB0aGUgcXVldWUuXG4gICAgICAgICAqIEBwYXJhbSB7Li4uKn0gW3BhcmFtc10gUGFyYW1ldGVycyB0aGF0IHNob3VsZCBiZSBwYXNzZWQgdG8gZWFjaCBoYW5kbGVyLlxuICAgICAgICAgKi9cbiAgICAgICAgZGlzcGF0Y2ggOiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICBpZiAoISB0aGlzLmFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHBhcmFtc0FyciA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICAgICAgICAgICAgbiA9IHRoaXMuX2JpbmRpbmdzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBiaW5kaW5ncztcblxuICAgICAgICAgICAgaWYgKHRoaXMubWVtb3JpemUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2UGFyYW1zID0gcGFyYW1zQXJyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoISBuKSB7XG4gICAgICAgICAgICAgICAgLy9zaG91bGQgY29tZSBhZnRlciBtZW1vcml6ZVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYmluZGluZ3MgPSB0aGlzLl9iaW5kaW5ncy5zbGljZSgpOyAvL2Nsb25lIGFycmF5IGluIGNhc2UgYWRkL3JlbW92ZSBpdGVtcyBkdXJpbmcgZGlzcGF0Y2hcbiAgICAgICAgICAgIHRoaXMuX3Nob3VsZFByb3BhZ2F0ZSA9IHRydWU7IC8vaW4gY2FzZSBgaGFsdGAgd2FzIGNhbGxlZCBiZWZvcmUgZGlzcGF0Y2ggb3IgZHVyaW5nIHRoZSBwcmV2aW91cyBkaXNwYXRjaC5cblxuICAgICAgICAgICAgLy9leGVjdXRlIGFsbCBjYWxsYmFja3MgdW50aWwgZW5kIG9mIHRoZSBsaXN0IG9yIHVudGlsIGEgY2FsbGJhY2sgcmV0dXJucyBgZmFsc2VgIG9yIHN0b3BzIHByb3BhZ2F0aW9uXG4gICAgICAgICAgICAvL3JldmVyc2UgbG9vcCBzaW5jZSBsaXN0ZW5lcnMgd2l0aCBoaWdoZXIgcHJpb3JpdHkgd2lsbCBiZSBhZGRlZCBhdCB0aGUgZW5kIG9mIHRoZSBsaXN0XG4gICAgICAgICAgICBkbyB7IG4tLTsgfSB3aGlsZSAoYmluZGluZ3Nbbl0gJiYgdGhpcy5fc2hvdWxkUHJvcGFnYXRlICYmIGJpbmRpbmdzW25dLmV4ZWN1dGUocGFyYW1zQXJyKSAhPT0gZmFsc2UpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGb3JnZXQgbWVtb3JpemVkIGFyZ3VtZW50cy5cbiAgICAgICAgICogQHNlZSBTaWduYWwubWVtb3JpemVcbiAgICAgICAgICovXG4gICAgICAgIGZvcmdldCA6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLl9wcmV2UGFyYW1zID0gbnVsbDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIGFsbCBiaW5kaW5ncyBmcm9tIHNpZ25hbCBhbmQgZGVzdHJveSBhbnkgcmVmZXJlbmNlIHRvIGV4dGVybmFsIG9iamVjdHMgKGRlc3Ryb3kgU2lnbmFsIG9iamVjdCkuXG4gICAgICAgICAqIDxwPjxzdHJvbmc+SU1QT1JUQU5UOjwvc3Ryb25nPiBjYWxsaW5nIGFueSBtZXRob2Qgb24gdGhlIHNpZ25hbCBpbnN0YW5jZSBhZnRlciBjYWxsaW5nIGRpc3Bvc2Ugd2lsbCB0aHJvdyBlcnJvcnMuPC9wPlxuICAgICAgICAgKi9cbiAgICAgICAgZGlzcG9zZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQWxsKCk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYmluZGluZ3M7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fcHJldlBhcmFtcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7c3RyaW5nfSBTdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgIHRvU3RyaW5nIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICdbU2lnbmFsIGFjdGl2ZTonKyB0aGlzLmFjdGl2ZSArJyBudW1MaXN0ZW5lcnM6JysgdGhpcy5nZXROdW1MaXN0ZW5lcnMoKSArJ10nO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG5cbiAgICAvLyBOYW1lc3BhY2UgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIFNpZ25hbHMgbmFtZXNwYWNlXG4gICAgICogQG5hbWVzcGFjZVxuICAgICAqIEBuYW1lIHNpZ25hbHNcbiAgICAgKi9cbiAgICB2YXIgc2lnbmFscyA9IFNpZ25hbDtcblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBldmVudCBicm9hZGNhc3RlclxuICAgICAqIEBzZWUgU2lnbmFsXG4gICAgICovXG4gICAgLy8gYWxpYXMgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IChzZWUgI2doLTQ0KVxuICAgIHNpZ25hbHMuU2lnbmFsID0gU2lnbmFsO1xuXG5cblxuICAgIC8vZXhwb3J0cyB0byBtdWx0aXBsZSBlbnZpcm9ubWVudHNcbiAgICBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpeyAvL0FNRFxuICAgICAgICBkZWZpbmUoZnVuY3Rpb24gKCkgeyByZXR1cm4gc2lnbmFsczsgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cyl7IC8vbm9kZVxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IHNpZ25hbHM7XG4gICAgfSBlbHNlIHsgLy9icm93c2VyXG4gICAgICAgIC8vdXNlIHN0cmluZyBiZWNhdXNlIG9mIEdvb2dsZSBjbG9zdXJlIGNvbXBpbGVyIEFEVkFOQ0VEX01PREVcbiAgICAgICAgLypqc2xpbnQgc3ViOnRydWUgKi9cbiAgICAgICAgZ2xvYmFsWydzaWduYWxzJ10gPSBzaWduYWxzO1xuICAgIH1cblxufSh0aGlzKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEJ1ZmZlclNvdXJjZShidWZmZXIsIGNvbnRleHQpIHtcbiAgICB0aGlzLmFkZChidWZmZXIpO1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9sb29wID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDsgLy8gQnVmZmVyU291cmNlTm9kZVxuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59XG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgdGhpcy5fYnVmZmVyID0gYnVmZmVyOyAvLyBBcnJheUJ1ZmZlclxuICAgIHJldHVybiB0aGlzLl9idWZmZXI7XG59O1xuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSwgb2Zmc2V0KSB7XG4gICAgaWYoZGVsYXkgPT09IHVuZGVmaW5lZCkgeyBkZWxheSA9IDA7IH1cbiAgICBpZihkZWxheSA+IDApIHsgZGVsYXkgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZGVsYXk7IH1cblxuICAgIGlmKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7IG9mZnNldCA9IDA7IH1cbiAgICBpZih0aGlzLl9wYXVzZWRBdCA+IDApIHsgb2Zmc2V0ID0gb2Zmc2V0ICsgdGhpcy5fcGF1c2VkQXQ7IH1cblxuICAgIC8vdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5zb3VyY2VOb2RlLmxvb3AgPSB0aGlzLl9sb29wO1xuICAgIHRoaXMuc291cmNlTm9kZS5vbmVuZGVkID0gdGhpcy5fZW5kZWRIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgdGhpcy5zb3VyY2VOb2RlLnN0YXJ0KGRlbGF5LCBvZmZzZXQpO1xuXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3BhdXNlZEF0O1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcblxuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xufTtcblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IGVsYXBzZWQ7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUub25lbmRlZCA9IG51bGw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLnN0b3AoMCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbn07XG5cbi8qXG4gKiBFbmRlZCBoYW5kbGVyXG4gKi9cblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5vbkVuZGVkID0gZnVuY3Rpb24oZm4sIGNvbnRleHQpIHtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gZm4gPyBmbi5iaW5kKGNvbnRleHQgfHwgdGhpcykgOiBudWxsO1xufTtcblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5fZW5kZWRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgaWYodHlwZW9mIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayh0aGlzKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYodGhpcy5fc3RhcnRlZEF0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYnVmZmVyID8gdGhpcy5fYnVmZmVyLmR1cmF0aW9uIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdsb29wJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9sb29wID0gISF2YWx1ZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3Byb2dyZXNzJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLm1pbih0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbiwgMSk7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3NvdXJjZU5vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5idWZmZXIgPSB0aGlzLl9idWZmZXI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgfVxufSk7XG5cblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEJ1ZmZlclNvdXJjZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRWxlbWVudFNvdXJjZShlbCwgY29udGV4dCkge1xuICAgIHRoaXMuYWRkKGVsKTtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQgPSB0aGlzLl9lbmRlZEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICB0aGlzLl9sb29wID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBNZWRpYUVsZW1lbnRTb3VyY2VOb2RlXG59XG5cbkVsZW1lbnRTb3VyY2UucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgdGhpcy5fZWwgPSBlbDsgLy8gSFRNTE1lZGlhRWxlbWVudFxuICAgIHJldHVybiB0aGlzLl9lbDtcbn07XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbkVsZW1lbnRTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSwgb2Zmc2V0KSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2RlbGF5VGltZW91dCk7XG5cbiAgICB0aGlzLnZvbHVtZSA9IHRoaXMuX3ZvbHVtZTtcblxuICAgIGlmKG9mZnNldCkge1xuICAgICAgICB0aGlzLl9lbC5jdXJyZW50VGltZSA9IG9mZnNldDtcbiAgICB9XG5cbiAgICBpZihkZWxheSkge1xuICAgICAgICB0aGlzLl9kZWxheVRpbWVvdXQgPSBzZXRUaW1lb3V0KHRoaXMucGxheS5iaW5kKHRoaXMpLCBkZWxheSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9lbC5wbGF5KCk7XG4gICAgfVxuXG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG5cbiAgICB0aGlzLl9lbC5yZW1vdmVFdmVudExpc3RlbmVyKCdlbmRlZCcsIHRoaXMuX2VuZGVkSGFuZGxlckJvdW5kKTtcbiAgICB0aGlzLl9lbC5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIHRoaXMuX2VuZGVkSGFuZGxlckJvdW5kLCBmYWxzZSk7XG59O1xuXG5FbGVtZW50U291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9kZWxheVRpbWVvdXQpO1xuXG4gICAgaWYoIXRoaXMuX2VsKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5fZWwucGF1c2UoKTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbkVsZW1lbnRTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5fZGVsYXlUaW1lb3V0KTtcblxuICAgIGlmKCF0aGlzLl9lbCkgeyByZXR1cm47IH1cblxuICAgIHRoaXMuX2VsLnBhdXNlKCk7XG5cbiAgICB0cnkge1xuICAgICAgICB0aGlzLl9lbC5jdXJyZW50VGltZSA9IDA7XG4gICAgICAgIC8vIGZpeGVzIGJ1ZyB3aGVyZSBzZXJ2ZXIgZG9lc24ndCBzdXBwb3J0IHNlZWs6XG4gICAgICAgIGlmKHRoaXMuX2VsLmN1cnJlbnRUaW1lID4gMCkgeyB0aGlzLl9lbC5sb2FkKCk7IH0gICAgXG4gICAgfSBjYXRjaChlKSB7fVxuXG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5FbGVtZW50U291cmNlLnByb3RvdHlwZS5vbkVuZGVkID0gZnVuY3Rpb24oZm4sIGNvbnRleHQpIHtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gZm4gPyBmbi5iaW5kKGNvbnRleHQgfHwgdGhpcykgOiBudWxsO1xufTtcblxuRWxlbWVudFNvdXJjZS5wcm90b3R5cGUuX2VuZGVkSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcblxuICAgIGlmKHRoaXMuX2xvb3ApIHtcbiAgICAgICAgdGhpcy5fZWwuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICAvLyBmaXhlcyBidWcgd2hlcmUgc2VydmVyIGRvZXNuJ3Qgc3VwcG9ydCBzZWVrOlxuICAgICAgICBpZih0aGlzLl9lbC5jdXJyZW50VGltZSA+IDApIHsgdGhpcy5fZWwubG9hZCgpOyB9XG4gICAgICAgIHRoaXMucGxheSgpO1xuICAgIH0gZWxzZSBpZih0eXBlb2YgdGhpcy5fZW5kZWRDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9lbmRlZENhbGxiYWNrKHRoaXMpO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFbGVtZW50U291cmNlLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbCA/IHRoaXMuX2VsLmN1cnJlbnRUaW1lIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEVsZW1lbnRTb3VyY2UucHJvdG90eXBlLCAnZHVyYXRpb24nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsID8gdGhpcy5fZWwuZHVyYXRpb24gOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRWxlbWVudFNvdXJjZS5wcm90b3R5cGUsICdsb29wJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9sb29wID0gdmFsdWU7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFbGVtZW50U291cmNlLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRWxlbWVudFNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRWxlbWVudFNvdXJjZS5wcm90b3R5cGUsICdwcm9ncmVzcycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50VGltZSAvIHRoaXMuZHVyYXRpb247XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFbGVtZW50U291cmNlLnByb3RvdHlwZSwgJ3NvdXJjZU5vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUgJiYgdGhpcy5fY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlTWVkaWFFbGVtZW50U291cmNlKHRoaXMuX2VsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICB9XG59KTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFbGVtZW50U291cmNlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc2lnbmFscyA9IHJlcXVpcmUoJ3NpZ25hbHMnKTtcblxuZnVuY3Rpb24gTG9hZGVyKCkge1xuICAgIHRoaXMub25DaGlsZENvbXBsZXRlID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG4gICAgdGhpcy5vbkNvbXBsZXRlID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG4gICAgdGhpcy5vblByb2dyZXNzID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG4gICAgdGhpcy5vbkVycm9yID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG5cbiAgICB0aGlzLnF1ZXVlID0gW107XG4gICAgdGhpcy5pbmRleCA9IDA7XG4gICAgdGhpcy5sb2FkZXJzID0ge307XG5cbiAgICB0aGlzLmxvYWRlZCA9IGZhbHNlO1xuICAgIHRoaXMubG9hZGluZyA9IGZhbHNlO1xuICAgIHRoaXMud2ViQXVkaW9Db250ZXh0ID0gbnVsbDtcbiAgICB0aGlzLmNyb3NzT3JpZ2luID0gZmFsc2U7XG4gICAgdGhpcy50b3VjaExvY2tlZCA9IGZhbHNlO1xuICAgIHRoaXMubnVtVG90YWwgPSAwO1xuICAgIHRoaXMubnVtTG9hZGVkID0gMDtcbn1cblxuTG9hZGVyLnByb3RvdHlwZSA9IHtcbiAgICBhZGQ6IGZ1bmN0aW9uKHVybCkge1xuICAgICAgICB2YXIgbG9hZGVyID0gbmV3IExvYWRlci5GaWxlKHVybCk7XG4gICAgICAgIGxvYWRlci53ZWJBdWRpb0NvbnRleHQgPSB0aGlzLndlYkF1ZGlvQ29udGV4dDtcbiAgICAgICAgbG9hZGVyLmNyb3NzT3JpZ2luID0gdGhpcy5jcm9zc09yaWdpbjtcbiAgICAgICAgbG9hZGVyLnRvdWNoTG9ja2VkID0gdGhpcy50b3VjaExvY2tlZDtcbiAgICAgICAgdGhpcy5xdWV1ZS5wdXNoKGxvYWRlcik7XG4gICAgICAgIHRoaXMubG9hZGVyc1tsb2FkZXIudXJsXSA9IGxvYWRlcjtcbiAgICAgICAgdGhpcy5udW1Ub3RhbCsrO1xuICAgICAgICByZXR1cm4gbG9hZGVyO1xuICAgIH0sXG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLm51bVRvdGFsID0gdGhpcy5xdWV1ZS5sZW5ndGg7XG4gICAgICAgIGlmKCF0aGlzLmxvYWRpbmcpIHtcbiAgICAgICAgICAgIHRoaXMubG9hZGluZyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLm5leHQoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHRoaXMucXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmxvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMub25Db21wbGV0ZS5kaXNwYXRjaCh0aGlzLmxvYWRlcnMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsb2FkZXIgPSB0aGlzLnF1ZXVlLnBvcCgpO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBwcm9ncmVzc0hhbmRsZXIgPSBmdW5jdGlvbihwcm9ncmVzcykge1xuICAgICAgICAgICAgdmFyIG51bUxvYWRlZCA9IHNlbGYubnVtTG9hZGVkICsgcHJvZ3Jlc3M7XG4gICAgICAgICAgICBpZihzZWxmLm9uUHJvZ3Jlc3MuZ2V0TnVtTGlzdGVuZXJzKCkgPiAwKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5vblByb2dyZXNzLmRpc3BhdGNoKG51bUxvYWRlZC9zZWxmLm51bVRvdGFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgbG9hZGVyLm9uUHJvZ3Jlc3MuYWRkKHByb2dyZXNzSGFuZGxlcik7XG4gICAgICAgIHZhciBjb21wbGV0ZUhhbmRsZXIgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgbG9hZGVyLm9uUHJvZ3Jlc3MucmVtb3ZlKHByb2dyZXNzSGFuZGxlcik7XG4gICAgICAgICAgICBzZWxmLm51bUxvYWRlZCsrO1xuICAgICAgICAgICAgaWYoc2VsZi5vblByb2dyZXNzLmdldE51bUxpc3RlbmVycygpID4gMCkge1xuICAgICAgICAgICAgICAgIHNlbGYub25Qcm9ncmVzcy5kaXNwYXRjaChzZWxmLm51bUxvYWRlZC9zZWxmLm51bVRvdGFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNlbGYub25DaGlsZENvbXBsZXRlLmRpc3BhdGNoKGxvYWRlcik7XG4gICAgICAgICAgICBzZWxmLm5leHQoKTtcbiAgICAgICAgfTtcbiAgICAgICAgbG9hZGVyLm9uQmVmb3JlQ29tcGxldGUuYWRkT25jZShjb21wbGV0ZUhhbmRsZXIpO1xuICAgICAgICB2YXIgZXJyb3JIYW5kbGVyID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNlbGYub25FcnJvci5kaXNwYXRjaChsb2FkZXIpO1xuICAgICAgICAgICAgc2VsZi5uZXh0KCk7XG4gICAgICAgIH07XG4gICAgICAgIGxvYWRlci5vbkVycm9yLmFkZE9uY2UoZXJyb3JIYW5kbGVyKTtcbiAgICAgICAgbG9hZGVyLnN0YXJ0KCk7XG4gICAgfSxcbiAgICBhZGRNdWx0aXBsZTogZnVuY3Rpb24oYXJyYXkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5hZGQoYXJyYXlbaV0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBnZXQ6IGZ1bmN0aW9uKHVybCkge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2FkZXJzW3VybF07XG4gICAgfVxufTtcblxuTG9hZGVyLkZpbGUgPSBmdW5jdGlvbih1cmwpIHtcbiAgICB0aGlzLnVybCA9IHVybDtcblxuICAgIHRoaXMub25Qcm9ncmVzcyA9IG5ldyBzaWduYWxzLlNpZ25hbCgpO1xuICAgIHRoaXMub25CZWZvcmVDb21wbGV0ZSA9IG5ldyBzaWduYWxzLlNpZ25hbCgpO1xuICAgIHRoaXMub25Db21wbGV0ZSA9IG5ldyBzaWduYWxzLlNpZ25hbCgpO1xuICAgIHRoaXMub25FcnJvciA9IG5ldyBzaWduYWxzLlNpZ25hbCgpO1xuXG4gICAgdGhpcy53ZWJBdWRpb0NvbnRleHQgPSBudWxsO1xuICAgIHRoaXMuY3Jvc3NPcmlnaW4gPSBmYWxzZTtcbiAgICB0aGlzLnRvdWNoTG9ja2VkID0gZmFsc2U7XG4gICAgdGhpcy5wcm9ncmVzcyA9IDA7XG59O1xuXG5Mb2FkZXIuRmlsZS5wcm90b3R5cGUgPSB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZih0aGlzLndlYkF1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5sb2FkQXJyYXlCdWZmZXIodGhpcy53ZWJBdWRpb0NvbnRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2FkQXVkaW9FbGVtZW50KHRoaXMudG91Y2hMb2NrZWQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBsb2FkQXJyYXlCdWZmZXI6IGZ1bmN0aW9uKHdlYkF1ZGlvQ29udGV4dCkge1xuICAgICAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByZXF1ZXN0Lm9wZW4oJ0dFVCcsIHRoaXMudXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJlcXVlc3Qub25wcm9ncmVzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuICAgICAgICAgICAgICAgIHNlbGYucHJvZ3Jlc3MgPSBldmVudC5sb2FkZWQgLyBldmVudC50b3RhbDtcbiAgICAgICAgICAgICAgICBzZWxmLm9uUHJvZ3Jlc3MuZGlzcGF0Y2goc2VsZi5wcm9ncmVzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB3ZWJBdWRpb0NvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcXVlc3QucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgIHNlbGYuZGF0YSA9IGJ1ZmZlcjtcbiAgICAgICAgICAgICAgICBzZWxmLnByb2dyZXNzID0gMTtcbiAgICAgICAgICAgICAgICBzZWxmLm9uUHJvZ3Jlc3MuZGlzcGF0Y2goMSk7XG4gICAgICAgICAgICAgICAgc2VsZi5vbkJlZm9yZUNvbXBsZXRlLmRpc3BhdGNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgc2VsZi5vbkNvbXBsZXRlLmRpc3BhdGNoKGJ1ZmZlcik7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzZWxmLm9uRXJyb3IuZGlzcGF0Y2goKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBzZWxmLm9uRXJyb3IuZGlzcGF0Y2goZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgICAgICB0aGlzLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIH0sXG4gICAgbG9hZEF1ZGlvRWxlbWVudDogZnVuY3Rpb24odG91Y2hMb2NrZWQpIHtcbiAgICAgICAgdmFyIHJlcXVlc3QgPSBuZXcgQXVkaW8oKTtcbiAgICAgICAgdGhpcy5kYXRhID0gcmVxdWVzdDtcbiAgICAgICAgcmVxdWVzdC5uYW1lID0gdGhpcy51cmw7XG4gICAgICAgIHJlcXVlc3QucHJlbG9hZCA9ICdhdXRvJztcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICByZXF1ZXN0LnNyYyA9IHRoaXMudXJsO1xuICAgICAgICBpZiAoISF0b3VjaExvY2tlZCkge1xuICAgICAgICAgICAgdGhpcy5vblByb2dyZXNzLmRpc3BhdGNoKDEpO1xuICAgICAgICAgICAgdGhpcy5vbkNvbXBsZXRlLmRpc3BhdGNoKHRoaXMuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcmVhZHkgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHJlcXVlc3QucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCByZWFkeSk7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHNlbGYucHJvZ3Jlc3MgPSAxO1xuICAgICAgICAgICAgICAgIHNlbGYub25Qcm9ncmVzcy5kaXNwYXRjaCgxKTtcbiAgICAgICAgICAgICAgICBzZWxmLm9uQmVmb3JlQ29tcGxldGUuZGlzcGF0Y2goc2VsZi5kYXRhKTtcbiAgICAgICAgICAgICAgICBzZWxmLm9uQ29tcGxldGUuZGlzcGF0Y2goc2VsZi5kYXRhKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyB0aW1lb3V0IGJlY2F1c2Ugc29tZXRpbWVzIGNhbnBsYXl0aHJvdWdoIGRvZXNuJ3QgZmlyZVxuICAgICAgICAgICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KHJlYWR5LCAyMDAwKTtcbiAgICAgICAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCByZWFkeSwgZmFsc2UpO1xuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHNlbGYub25FcnJvci5kaXNwYXRjaCgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJlcXVlc3QubG9hZCgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBjYW5jZWw6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYodGhpcy5yZXF1ZXN0ICYmIHRoaXMucmVxdWVzdC5yZWFkeVN0YXRlICE9PSA0KSB7XG4gICAgICAgICAgdGhpcy5yZXF1ZXN0LmFib3J0KCk7XG4gICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2FkZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjb250ZXh0O1xuXG5mdW5jdGlvbiBjcmVhdGVGaWx0ZXIodHlwZSwgZnJlcXVlbmN5KSB7XG4gICAgdmFyIGZpbHRlck5vZGUgPSBjb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgIGZpbHRlck5vZGUudHlwZSA9IHR5cGU7XG4gICAgaWYoZnJlcXVlbmN5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZmlsdGVyTm9kZS5mcmVxdWVuY3kudmFsdWUgPSBmcmVxdWVuY3k7XG4gICAgfVxuICAgIHJldHVybiBmaWx0ZXJOb2RlO1xufVxuXG52YXIgY3JlYXRlID0ge1xuICAgIGdhaW46IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIGlmKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIG5vZGUuZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG4gICAgcGFuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZVBhbm5lcigpO1xuICAgICAgICAvLyBEZWZhdWx0IGZvciBzdGVyZW8gaXMgSFJURlxuICAgICAgICBub2RlLnBhbm5pbmdNb2RlbCA9ICdIUlRGJzsgLy8gJ2VxdWFscG93ZXInXG5cbiAgICAgICAgLy8gRGlzdGFuY2UgbW9kZWwgYW5kIGF0dHJpYnV0ZXNcbiAgICAgICAgbm9kZS5kaXN0YW5jZU1vZGVsID0gJ2xpbmVhcic7IC8vICdsaW5lYXInICdpbnZlcnNlJyAnZXhwb25lbnRpYWwnXG4gICAgICAgIG5vZGUucmVmRGlzdGFuY2UgPSAxO1xuICAgICAgICBub2RlLm1heERpc3RhbmNlID0gMTAwMDtcbiAgICAgICAgbm9kZS5yb2xsb2ZmRmFjdG9yID0gMTtcblxuICAgICAgICAvLyBVc2VzIGEgM0QgY2FydGVzaWFuIGNvb3JkaW5hdGUgc3lzdGVtXG4gICAgICAgIC8vIG5vZGUuc2V0UG9zaXRpb24oMCwgMCwgMCk7XG4gICAgICAgIC8vIG5vZGUuc2V0T3JpZW50YXRpb24oMSwgMCwgMCk7XG4gICAgICAgIC8vIG5vZGUuc2V0VmVsb2NpdHkoMCwgMCwgMCk7XG5cbiAgICAgICAgLy8gRGlyZWN0aW9uYWwgc291bmQgY29uZSAtIFRoZSBjb25lIGFuZ2xlcyBhcmUgaW4gZGVncmVlcyBhbmQgcnVuIGZyb20gMCB0byAzNjBcbiAgICAgICAgLy8gbm9kZS5jb25lSW5uZXJBbmdsZSA9IDM2MDtcbiAgICAgICAgLy8gbm9kZS5jb25lT3V0ZXJBbmdsZSA9IDM2MDtcbiAgICAgICAgLy8gbm9kZS5jb25lT3V0ZXJHYWluID0gMDtcblxuICAgICAgICAvLyBub3JtYWxpc2VkIHZlY1xuICAgICAgICAvLyBub2RlLnNldE9yaWVudGF0aW9uKHZlYy54LCB2ZWMueSwgdmVjLnopO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuICAgIGZpbHRlcjoge1xuICAgICAgICBsb3dwYXNzOiBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVGaWx0ZXIoJ2xvd3Bhc3MnLCBmcmVxdWVuY3kpO1xuICAgICAgICB9LFxuICAgICAgICBoaWdocGFzczogZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRmlsdGVyKCdoaWdocGFzcycsIGZyZXF1ZW5jeSk7XG4gICAgICAgIH0sXG4gICAgICAgIGJhbmRwYXNzOiBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVGaWx0ZXIoJ2JhbmRwYXNzJywgZnJlcXVlbmN5KTtcbiAgICAgICAgfSxcbiAgICAgICAgbG93c2hlbGY6IGZ1bmN0aW9uKGZyZXF1ZW5jeSkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUZpbHRlcignbG93c2hlbGYnLCBmcmVxdWVuY3kpO1xuICAgICAgICB9LFxuICAgICAgICBoaWdoc2hlbGY6IGZ1bmN0aW9uKGZyZXF1ZW5jeSkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUZpbHRlcignaGlnaHNoZWxmJywgZnJlcXVlbmN5KTtcbiAgICAgICAgfSxcbiAgICAgICAgcGVha2luZzogZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRmlsdGVyKCdwZWFraW5nJywgZnJlcXVlbmN5KTtcbiAgICAgICAgfSxcbiAgICAgICAgbm90Y2g6IGZ1bmN0aW9uKGZyZXF1ZW5jeSkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUZpbHRlcignbm90Y2gnLCBmcmVxdWVuY3kpO1xuICAgICAgICB9LFxuICAgICAgICBhbGxwYXNzOiBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVGaWx0ZXIoJ2FsbHBhc3MnLCBmcmVxdWVuY3kpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBkZWxheTogZnVuY3Rpb24oaW5wdXQsIHRpbWUsIGdhaW4pIHtcbiAgICAgICAgdmFyIGRlbGF5Tm9kZSA9IGNvbnRleHQuY3JlYXRlRGVsYXkoKTtcbiAgICAgICAgdmFyIGdhaW5Ob2RlID0gdGhpcy5nYWluKGdhaW4gfHwgMC41KTtcbiAgICAgICAgaWYodGltZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWxheU5vZGUuZGVsYXlUaW1lLnZhbHVlID0gdGltZTtcbiAgICAgICAgfVxuICAgICAgICBkZWxheU5vZGUuY29ubmVjdChnYWluTm9kZSk7XG4gICAgICAgIGlmKGlucHV0KSB7XG4gICAgICAgICAgICBpbnB1dC5jb25uZWN0KGRlbGF5Tm9kZSk7XG4gICAgICAgICAgICBnYWluTm9kZS5jb25uZWN0KGlucHV0KTsgICAgXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRlbGF5Tm9kZTtcbiAgICAgICAgLy8gP1xuICAgICAgICAvKnJldHVybiB7XG4gICAgICAgICAgZGVsYXlOb2RlOiBkZWxheU5vZGUsXG4gICAgICAgICAgZ2Fpbk5vZGU6IGdhaW5Ob2RlXG4gICAgICAgIH07Ki9cbiAgICB9LFxuICAgIGNvbnZvbHZlcjogZnVuY3Rpb24oaW1wdWxzZVJlc3BvbnNlKSB7XG4gICAgICAgIC8vIGltcHVsc2VSZXNwb25zZSBpcyBhbiBhdWRpbyBmaWxlIGJ1ZmZlclxuICAgICAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlQ29udm9sdmVyKCk7XG4gICAgICAgIG5vZGUuYnVmZmVyID0gaW1wdWxzZVJlc3BvbnNlO1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9LFxuICAgIHJldmVyYjogZnVuY3Rpb24oc2Vjb25kcywgZGVjYXksIHJldmVyc2UpIHtcbiAgICAgICByZXR1cm4gdGhpcy5jb252b2x2ZXIodGhpcy5pbXB1bHNlUmVzcG9uc2Uoc2Vjb25kcywgZGVjYXksIHJldmVyc2UpKTtcbiAgICB9LFxuICAgIC8vIFRPRE86IHNob3VsZCBwcm9iIGJlIG1vdmVkIHRvIHV0aWxzOlxuICAgIGltcHVsc2VSZXNwb25zZTogZnVuY3Rpb24oc2Vjb25kcywgZGVjYXksIHJldmVyc2UpIHtcbiAgICAgICAgLy8gZ2VuZXJhdGUgYSByZXZlcmIgZWZmZWN0XG4gICAgICAgIHNlY29uZHMgPSBzZWNvbmRzIHx8IDE7XG4gICAgICAgIGRlY2F5ID0gZGVjYXkgfHwgNTtcbiAgICAgICAgcmV2ZXJzZSA9ICEhcmV2ZXJzZTtcblxuICAgICAgICB2YXIgbnVtQ2hhbm5lbHMgPSAyLFxuICAgICAgICAgICAgcmF0ZSA9IGNvbnRleHQuc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgIGxlbmd0aCA9IHJhdGUgKiBzZWNvbmRzLFxuICAgICAgICAgICAgaW1wdWxzZVJlc3BvbnNlID0gY29udGV4dC5jcmVhdGVCdWZmZXIobnVtQ2hhbm5lbHMsIGxlbmd0aCwgcmF0ZSksXG4gICAgICAgICAgICBsZWZ0ID0gaW1wdWxzZVJlc3BvbnNlLmdldENoYW5uZWxEYXRhKDApLFxuICAgICAgICAgICAgcmlnaHQgPSBpbXB1bHNlUmVzcG9uc2UuZ2V0Q2hhbm5lbERhdGEoMSksXG4gICAgICAgICAgICBuO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG4gPSByZXZlcnNlID8gbGVuZ3RoIC0gMSA6IGk7XG4gICAgICAgICAgICBsZWZ0W2ldID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBNYXRoLnBvdygxIC0gbiAvIGxlbmd0aCwgZGVjYXkpO1xuICAgICAgICAgICAgcmlnaHRbaV0gPSAoTWF0aC5yYW5kb20oKSAqIDIgLSAxKSAqIE1hdGgucG93KDEgLSBuIC8gbGVuZ3RoLCBkZWNheSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW1wdWxzZVJlc3BvbnNlO1xuICAgIH0sXG4gICAgYW5hbHlzZXI6IGZ1bmN0aW9uKGZmdFNpemUpIHtcbiAgICAgICAgZmZ0U2l6ZSA9IGZmdFNpemUgfHwgMTAyNDtcbiAgICAgICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XG4gICAgICAgIG5vZGUuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gMC44NTtcbiAgICAgICAgLy8gcmVzb2x1dGlvbiBmZnRTaXplOiAzMiAtIDIwNDggKHBvdyAyKVxuICAgICAgICAvLyBmcmVxdWVuY3lCaW5Db3VudCB3aWxsIGJlIGhhbGYgdGhpcyB2YWx1ZVxuICAgICAgICBub2RlLmZmdFNpemUgPSBmZnRTaXplO1xuICAgICAgICAvL25vZGUubWluRGVjaWJlbHMgPSAtMTAwO1xuICAgICAgICAvL25vZGUubWF4RGVjaWJlbHMgPSAtMzA7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG4gICAgY29tcHJlc3NvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIGxvd2VycyB0aGUgdm9sdW1lIG9mIHRoZSBsb3VkZXN0IHBhcnRzIG9mIHRoZSBzaWduYWwgYW5kIHJhaXNlcyB0aGUgdm9sdW1lIG9mIHRoZSBzb2Z0ZXN0IHBhcnRzXG4gICAgICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVEeW5hbWljc0NvbXByZXNzb3IoKTtcbiAgICAgICAgLy8gbWluIGRlY2liZWxzIHRvIHN0YXJ0IGNvbXByZXNzaW5nIGF0IGZyb20gLTEwMCB0byAwXG4gICAgICAgIG5vZGUudGhyZXNob2xkLnZhbHVlID0gLTI0O1xuICAgICAgICAvLyBkZWNpYmVsIHZhbHVlIHRvIHN0YXJ0IGN1cnZlIHRvIGNvbXByZXNzZWQgdmFsdWUgZnJvbSAwIHRvIDQwXG4gICAgICAgIG5vZGUua25lZS52YWx1ZSA9IDMwO1xuICAgICAgICAvLyBhbW91bnQgb2YgY2hhbmdlIHBlciBkZWNpYmVsIGZyb20gMSB0byAyMFxuICAgICAgICBub2RlLnJhdGlvLnZhbHVlID0gMTI7XG4gICAgICAgIC8vIGdhaW4gcmVkdWN0aW9uIGN1cnJlbnRseSBhcHBsaWVkIGJ5IGNvbXByZXNzb3IgZnJvbSAtMjAgdG8gMFxuICAgICAgICAvLyBub2RlLnJlZHVjdGlvbi52YWx1ZVxuICAgICAgICAvLyBzZWNvbmRzIHRvIHJlZHVjZSBnYWluIGJ5IDEwZGIgZnJvbSAwIHRvIDEgLSBob3cgcXVpY2tseSBzaWduYWwgYWRhcHRlZCB3aGVuIHZvbHVtZSBpbmNyZWFzZWRcbiAgICAgICAgbm9kZS5hdHRhY2sudmFsdWUgPSAwLjAwMDM7XG4gICAgICAgIC8vIHNlY29uZHMgdG8gaW5jcmVhc2UgZ2FpbiBieSAxMGRiIGZyb20gMCB0byAxIC0gaG93IHF1aWNrbHkgc2lnbmFsIGFkYXB0ZWQgd2hlbiB2b2x1bWUgcmVkY3VjZWRcbiAgICAgICAgbm9kZS5yZWxlYXNlLnZhbHVlID0gMC4yNTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcbiAgICBkaXN0b3J0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZVdhdmVTaGFwZXIoKTtcbiAgICAgICAgLy8gRmxvYXQzMkFycmF5IGRlZmluaW5nIGN1cnZlICh2YWx1ZXMgYXJlIGludGVycG9sYXRlZClcbiAgICAgICAgLy9ub2RlLmN1cnZlXG4gICAgICAgIC8vIHVwLXNhbXBsZSBiZWZvcmUgYXBwbHlpbmcgY3VydmUgZm9yIGJldHRlciByZXNvbHV0aW9uIHJlc3VsdCAnbm9uZScsICcyeCcgb3IgJzR4J1xuICAgICAgICAvL25vZGUub3ZlcnNhbXBsZSA9ICcyeCc7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH0sXG4gICAgc2NyaXB0UHJvY2Vzc29yOiBmdW5jdGlvbihidWZmZXJTaXplLCBpbnB1dENoYW5uZWxzLCBvdXRwdXRDaGFubmVscywgY2FsbGJhY2ssIGNhbGxiYWNrQ29udGV4dCkge1xuICAgICAgICAvLyBidWZmZXJTaXplIDI1NiAtIDE2Mzg0IChwb3cgMilcbiAgICAgICAgYnVmZmVyU2l6ZSA9IGJ1ZmZlclNpemUgfHwgMTAyNDtcbiAgICAgICAgaW5wdXRDaGFubmVscyA9IGlucHV0Q2hhbm5lbHMgPT09IHVuZGVmaW5lZCA/IDAgOiBpbnB1dENoYW5uZWxzO1xuICAgICAgICBvdXRwdXRDaGFubmVscyA9IG91dHB1dENoYW5uZWxzID09PSB1bmRlZmluZWQgPyAxIDogb3V0cHV0Q2hhbm5lbHM7XG4gICAgICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgaW5wdXRDaGFubmVscywgb3V0cHV0Q2hhbm5lbHMpO1xuICAgICAgICAvL25vZGUub25hdWRpb3Byb2Nlc3MgPSBjYWxsYmFjay5iaW5kKGNhbGxiYWNrQ29udGV4dHx8IG5vZGUpO1xuICAgICAgICBub2RlLm9uYXVkaW9wcm9jZXNzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAvLyBhdmFpbGFibGUgcHJvcHM6XG4gICAgICAgICAgICAvKlxuICAgICAgICAgICAgZXZlbnQuaW5wdXRCdWZmZXJcbiAgICAgICAgICAgIGV2ZW50Lm91dHB1dEJ1ZmZlclxuICAgICAgICAgICAgZXZlbnQucGxheWJhY2tUaW1lXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgLy8gRXhhbXBsZTogZ2VuZXJhdGUgbm9pc2VcbiAgICAgICAgICAgIC8qXG4gICAgICAgICAgICB2YXIgb3V0cHV0ID0gZXZlbnQub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICAgICAgdmFyIGwgPSBvdXRwdXQubGVuZ3RoO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgICAgICBvdXRwdXRbaV0gPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwoY2FsbGJhY2tDb250ZXh0IHx8IHRoaXMsIGV2ZW50KTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfSxcbiAgICAvLyBjcmVhdGVzIE1lZGlhU3RyZWFtQXVkaW9Tb3VyY2VOb2RlXG4gICAgbWljcm9waG9uZVNvdXJjZTogZnVuY3Rpb24oc3RyZWFtLCBjb25uZWN0VG8pIHtcbiAgICAgICAgdmFyIG1lZGlhU3RyZWFtU291cmNlID0gY29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZSggc3RyZWFtICk7XG4gICAgICAgIGlmKGNvbm5lY3RUbykge1xuICAgICAgICAgICAgbWVkaWFTdHJlYW1Tb3VyY2UuY29ubmVjdChjb25uZWN0VG8pO1xuICAgICAgICB9XG4gICAgICAgIC8vIEhBQ0s6IHN0b3BzIG1veiBnYXJiYWdlIGNvbGxlY3Rpb24ga2lsbGluZyB0aGUgc3RyZWFtXG4gICAgICAgIC8vIHNlZSBodHRwczovL3N1cHBvcnQubW96aWxsYS5vcmcvZW4tVVMvcXVlc3Rpb25zLzk4NDE3OVxuICAgICAgICBpZihuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhKSB7XG4gICAgICAgICAgICB3aW5kb3cubW96SGFjayA9IG1lZGlhU3RyZWFtU291cmNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtZWRpYVN0cmVhbVNvdXJjZTtcbiAgICB9XG59O1xuXG4vKlxuICogRmFrZSBub2RlcyAtIG5vdCBzdXJlIGlmIHRoaXMgaXMgYSBnb29kIGlkZWE/XG4gKiBUaGUgdXNhZ2UgaXMgdGhhdCBjb2RlIGNhbiBmYWlsIHNpbGVudGx5IChyZW1vdmluZyBuZWVkIGZvciBjb25kaXRpb25hbHMpXG4gKi9cblxudmFyIGZuID0gZnVuY3Rpb24oKXt9O1xudmFyIHBhcmFtID0geyB2YWx1ZTogMSB9O1xudmFyIGZha2VOb2RlID0ge1xuICAgIGNvbm5lY3Q6Zm4sXG4gICAgZGlzY29ubmVjdDpmbixcbiAgICAvLyBnYWluXG4gICAgZ2Fpbjp7dmFsdWU6IDF9LFxuICAgIC8vIHBhbm5lclxuICAgIHBhbm5pbmdNb2RlbDogMCxcbiAgICBzZXRQb3NpdGlvbjogZm4sXG4gICAgc2V0T3JpZW50YXRpb246IGZuLFxuICAgIHNldFZlbG9jaXR5OiBmbixcbiAgICBkaXN0YW5jZU1vZGVsOiAwLFxuICAgIHJlZkRpc3RhbmNlOiAwLFxuICAgIG1heERpc3RhbmNlOiAwLFxuICAgIHJvbGxvZmZGYWN0b3I6IDAsXG4gICAgY29uZUlubmVyQW5nbGU6IDM2MCxcbiAgICBjb25lT3V0ZXJBbmdsZTogMzYwLFxuICAgIGNvbmVPdXRlckdhaW46IDAsXG4gICAgLy8gZmlsdGVyOlxuICAgIHR5cGU6MCxcbiAgICBmcmVxdWVuY3k6IHBhcmFtLFxuICAgIC8vIGRlbGF5XG4gICAgZGVsYXlUaW1lOiBwYXJhbSxcbiAgICAvLyBjb252b2x2ZXJcbiAgICBidWZmZXI6IDAsXG4gICAgLy8gYW5hbHlzZXJcbiAgICBzbW9vdGhpbmdUaW1lQ29uc3RhbnQ6IDAsXG4gICAgZmZ0U2l6ZTogMCxcbiAgICBtaW5EZWNpYmVsczogMCxcbiAgICBtYXhEZWNpYmVsczogMCxcbiAgICAvLyBjb21wcmVzc29yXG4gICAgdGhyZXNob2xkOiBwYXJhbSxcbiAgICBrbmVlOiBwYXJhbSxcbiAgICByYXRpbzogcGFyYW0sXG4gICAgYXR0YWNrOiBwYXJhbSxcbiAgICByZWxlYXNlOiBwYXJhbSxcbiAgICAvLyBkaXN0b3J0aW9uXG4gICAgb3ZlcnNhbXBsZTogMCxcbiAgICBjdXJ2ZTogMFxufTtcbnZhciByZXR1cm5GYWtlTm9kZSA9IGZ1bmN0aW9uKCl7IHJldHVybiBmYWtlTm9kZTsgfTtcbnZhciBmYWtlID0ge1xuICAgIGdhaW46IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ge2dhaW46e3ZhbHVlOiAxfSwgY29ubmVjdDpmbiwgZGlzY29ubmVjdDpmbn07XG4gICAgfSxcbiAgICBwYW46IHJldHVybkZha2VOb2RlLFxuICAgIGZpbHRlcjoge1xuICAgICAgICBsb3dwYXNzOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgaGlnaHBhc3M6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBiYW5kcGFzczogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGxvd3NoZWxmOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgaGlnaHNoZWxmOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgcGVha2luZzogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIG5vdGNoOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgYWxscGFzczogcmV0dXJuRmFrZU5vZGVcbiAgICB9LFxuICAgIGRlbGF5OiByZXR1cm5GYWtlTm9kZSxcbiAgICBjb252b2x2ZXI6IHJldHVybkZha2VOb2RlLFxuICAgIHJldmVyYjogcmV0dXJuRmFrZU5vZGUsXG4gICAgaW1wdWxzZVJlc3BvbnNlOiBmdW5jdGlvbigpIHsgcmV0dXJuIFtdOyB9LFxuICAgIGFuYWx5c2VyOiByZXR1cm5GYWtlTm9kZSxcbiAgICBjb21wcmVzc29yOiByZXR1cm5GYWtlTm9kZSxcbiAgICBkaXN0b3J0aW9uOiByZXR1cm5GYWtlTm9kZSxcbiAgICBzY3JpcHRQcm9jZXNzb3I6IHJldHVybkZha2VOb2RlLFxuICAgIG1pY3JvcGhvbmVTb3VyY2U6IHJldHVybkZha2VOb2RlXG59O1xuXG5mdW5jdGlvbiBOb2RlRmFjdG9yeSh3ZWJBdWRpb0NvbnRleHQpIHtcbiAgICBjb250ZXh0ID0gd2ViQXVkaW9Db250ZXh0O1xuICAgIHJldHVybiBjb250ZXh0ID8gY3JlYXRlIDogZmFrZTtcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBOb2RlRmFjdG9yeTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEJ1ZmZlclNvdXJjZSA9IHJlcXVpcmUoJy4vYnVmZmVyLXNvdXJjZS5qcycpLFxuICAgIEVsZW1lbnRTb3VyY2UgPSByZXF1aXJlKCcuL2VsZW1lbnQtc291cmNlLmpzJyksXG4gICAgbm9kZUZhY3RvcnkgPSByZXF1aXJlKCcuL25vZGUtZmFjdG9yeS5qcycpO1xuXG5mdW5jdGlvbiBTb3VuZChjb250ZXh0LCBkYXRhLCBkZXN0aW5hdGlvbikge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9kYXRhID0gbnVsbDtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9sb29wID0gZmFsc2U7XG4gICAgdGhpcy5fbm9kZUxpc3QgPSBbXTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheVdoZW5SZWFkeSA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcblxuICAgIHRoaXMuX2dhaW4gPSBub2RlRmFjdG9yeSh0aGlzLl9jb250ZXh0KS5nYWluKCk7XG4gICAgdGhpcy5fZ2Fpbi5jb25uZWN0KGRlc3RpbmF0aW9uIHx8IHRoaXMuX2NvbnRleHQuZGVzdGluYXRpb24pO1xuXG4gICAgdGhpcy5hZGQoZGF0YSk7XG59XG5cblNvdW5kLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgaWYoIWRhdGEpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB0aGlzLl9kYXRhID0gZGF0YTsgLy8gQXVkaW9CdWZmZXIgb3IgTWVkaWEgRWxlbWVudFxuICAgIC8vY29uc29sZS5sb2coJ2RhdGE6JywgdGhpcy5fZGF0YSk7XG4gICAgaWYodGhpcy5fZGF0YS50YWdOYW1lKSB7XG4gICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgRWxlbWVudFNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgQnVmZmVyU291cmNlKGRhdGEsIHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbiAgICB0aGlzLl9jcmVhdGVTb3VyY2VOb2RlKCk7XG4gICAgdGhpcy5fc291cmNlLm9uRW5kZWQodGhpcy5fZW5kZWRIYW5kbGVyLCB0aGlzKTtcblxuICAgIC8vIHNob3VsZCB0aGlzIHRha2UgYWNjb3VudCBvZiBkZWxheSBhbmQgb2Zmc2V0P1xuICAgIGlmKHRoaXMuX3BsYXlXaGVuUmVhZHkpIHtcbiAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuU291bmQucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSwgb2Zmc2V0KSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkge1xuICAgICAgICB0aGlzLl9wbGF5V2hlblJlYWR5ID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHRoaXMuX2NyZWF0ZVNvdXJjZU5vZGUoKTtcbiAgICB0aGlzLl9zb3VyY2UubG9vcCA9IHRoaXMuX2xvb3A7XG5cbiAgICAvLyB1cGRhdGUgdm9sdW1lIG5lZWRlZCBmb3Igbm8gd2ViYXVkaW9cbiAgICBpZighdGhpcy5fY29udGV4dCkgeyB0aGlzLnZvbHVtZSA9IHRoaXMudm9sdW1lOyB9XG5cbiAgICB0aGlzLl9zb3VyY2UucGxheShkZWxheSwgb2Zmc2V0KTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuU291bmQucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuX3NvdXJjZS5wYXVzZSgpO1xuICAgIHJldHVybiB0aGlzOyAgXG59O1xuXG5Tb3VuZC5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2UpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB0aGlzLl9zb3VyY2Uuc3RvcCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAqIE5vZGVzXG4gKi9cblxuU291bmQucHJvdG90eXBlLmFkZE5vZGUgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdGhpcy5fbm9kZUxpc3QucHVzaChub2RlKTtcbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuU291bmQucHJvdG90eXBlLnJlbW92ZU5vZGUgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIGwgPSB0aGlzLl9ub2RlTGlzdC5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYobm9kZSA9PT0gdGhpcy5fbm9kZUxpc3RbaV0pIHtcbiAgICAgICAgICAgIHRoaXMuX25vZGVMaXN0LnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBub2RlLmRpc2Nvbm5lY3QoMCk7XG4gICAgdGhpcy5fdXBkYXRlQ29ubmVjdGlvbnMoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8vIHNob3VsZCBzb3VyY2UgYmUgaXRlbSAwIGluIG5vZGVsaXN0IGFuZCBkZXNpbmF0aW9uIGxhc3Rcbi8vIHByb2IgaXMgYWRkTm9kZSBuZWVkcyB0byBhZGQgYmVmb3JlIGRlc3RpbmF0aW9uXG4vLyArIHNob3VsZCBpdCBiZSBjYWxsZWQgY2hhaW4gb3Igc29tZXRoaW5nIG5pY2VyP1xuLy8gZmVlbHMgbGlrZSBub2RlIGxpc3QgY291bGQgYmUgYSBsaW5rZWQgbGlzdD8/XG4vLyBpZiBsaXN0Lmxhc3QgaXMgZGVzdGluYXRpb24gYWRkYmVmb3JlXG5cbi8qU291bmQucHJvdG90eXBlLl91cGRhdGVDb25uZWN0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGwgPSB0aGlzLl9ub2RlTGlzdC5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRoaXMuX25vZGVMaXN0W2ktMV0uY29ubmVjdCh0aGlzLl9ub2RlTGlzdFtpXSk7XG4gICAgfVxufTsqL1xuLypTb3VuZC5wcm90b3R5cGUuX3VwZGF0ZUNvbm5lY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygnX3VwZGF0ZUNvbm5lY3Rpb25zJyk7XG4gICAgdGhpcy5fc291cmNlTm9kZS5kaXNjb25uZWN0KDApO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUuY29ubmVjdCh0aGlzLl9nYWluKTtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKGkgPT09IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCcgLSBjb25uZWN0IHNvdXJjZSB0byBub2RlOicsIHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgICAgIHRoaXMuX2dhaW4uZGlzY29ubmVjdCgwKTtcbiAgICAgICAgICAgIHRoaXMuX2dhaW4uY29ubmVjdCh0aGlzLl9ub2RlTGlzdFtpXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdDonLCB0aGlzLl9ub2RlTGlzdFtpLTFdLCAndG8nLCB0aGlzLl9ub2RlTGlzdFtpXSk7XG4gICAgICAgICAgICB0aGlzLl9ub2RlTGlzdFtpLTFdLmRpc2Nvbm5lY3QoMCk7XG4gICAgICAgICAgICB0aGlzLl9ub2RlTGlzdFtpLTFdLmNvbm5lY3QodGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuY29ubmVjdFRvKHRoaXMuX2NvbnRleHQuZGVzdGluYXRpb24pO1xufTsqL1xuU291bmQucHJvdG90eXBlLl91cGRhdGVDb25uZWN0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy9jb25zb2xlLmxvZygnX3VwZGF0ZUNvbm5lY3Rpb25zJyk7XG4gICAgdmFyIGwgPSB0aGlzLl9ub2RlTGlzdC5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYoaSA9PT0gMCkge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnIC0gY29ubmVjdCBzb3VyY2UgdG8gbm9kZTonLCB0aGlzLl9ub2RlTGlzdFtpXSk7XG4gICAgICAgICAgICAvL3RoaXMuX3NvdXJjZU5vZGUuZGlzY29ubmVjdCgwKTtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuY29ubmVjdCh0aGlzLl9ub2RlTGlzdFtpXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdjb25uZWN0OicsIHRoaXMuX25vZGVMaXN0W2ktMV0sICd0bycsIHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgICAgIC8vdGhpcy5fbm9kZUxpc3RbaS0xXS5kaXNjb25uZWN0KDApO1xuICAgICAgICAgICAgdGhpcy5fbm9kZUxpc3RbaS0xXS5jb25uZWN0KHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKHRoaXMuZGVzdGluYXRpb24pXG4gICAgaWYodGhpcy5kZXN0aW5hdGlvbikge1xuICAgICAgICB0aGlzLmNvbm5lY3RUbyh0aGlzLmRlc3RpbmF0aW9uKTtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy5fZ2Fpbikge1xuICAgICAgICB0aGlzLmNvbm5lY3RUbyh0aGlzLl9nYWluKTtcbiAgICB9XG59O1xuXG4vLyBvciBzZXR0ZXIgZm9yIGRlc3RpbmF0aW9uP1xuLypTb3VuZC5wcm90b3R5cGUuY29ubmVjdFRvID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoO1xuICAgIGlmKGwgPiAwKSB7XG4gICAgICBjb25zb2xlLmxvZygnY29ubmVjdDonLCB0aGlzLl9ub2RlTGlzdFtsIC0gMV0sICd0bycsIG5vZGUpO1xuICAgICAgICB0aGlzLl9ub2RlTGlzdFtsIC0gMV0uZGlzY29ubmVjdCgwKTtcbiAgICAgICAgdGhpcy5fbm9kZUxpc3RbbCAtIDFdLmNvbm5lY3Qobm9kZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZygnIHggY29ubmVjdCBzb3VyY2UgdG8gbm9kZTonLCBub2RlKTtcbiAgICAgICAgdGhpcy5fZ2Fpbi5kaXNjb25uZWN0KDApO1xuICAgICAgICB0aGlzLl9nYWluLmNvbm5lY3Qobm9kZSk7XG4gICAgfVxuICAgIHRoaXMuZGVzdGluYXRpb24gPSBub2RlO1xufTsqL1xuU291bmQucHJvdG90eXBlLmNvbm5lY3RUbyA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBpZihsID4gMCkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKCdjb25uZWN0OicsIHRoaXMuX25vZGVMaXN0W2wgLSAxXSwgJ3RvJywgbm9kZSk7XG4gICAgICAgIC8vdGhpcy5fbm9kZUxpc3RbbCAtIDFdLmRpc2Nvbm5lY3QoMCk7XG4gICAgICAgIHRoaXMuX25vZGVMaXN0W2wgLSAxXS5jb25uZWN0KG5vZGUpO1xuICAgIH1cbiAgICBlbHNlIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgLy9jb25zb2xlLmxvZygnIHggY29ubmVjdCBzb3VyY2UgdG8gbm9kZTonLCBub2RlKTtcbiAgICAgICAgLy90aGlzLl9zb3VyY2VOb2RlLmRpc2Nvbm5lY3QoMCk7XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuY29ubmVjdChub2RlKTtcbiAgICB9XG4gICAgdGhpcy5kZXN0aW5hdGlvbiA9IG5vZGU7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvdW5kLnByb3RvdHlwZS5fY3JlYXRlU291cmNlTm9kZSA9IGZ1bmN0aW9uKCkge1xuICAgIC8vY29uc29sZS5sb2coJ2dldCBzb3VyY2UnLCB0aGlzLl9zb3VyY2VOb2RlKTtcbiAgICBpZighdGhpcy5fY29udGV4dCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX3NvdXJjZS5zb3VyY2VOb2RlO1xuICAgIHRoaXMuX3VwZGF0ZUNvbm5lY3Rpb25zKCk7XG5cbiAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbn07XG5cbi8qXG4gKiBFbmRlZCBoYW5kbGVyXG4gKi9cblxuU291bmQucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUuX2VuZGVkSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHR5cGVvZiB0aGlzLl9lbmRlZENhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sodGhpcyk7XG4gICAgfVxufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuLypcbiAqIFRPRE86IHNldCB1cCBzbyBzb3VyY2UgY2FuIGJlIHN0cmVhbSwgb3NjaWxsYXRvciwgZXRjXG4gKi9cblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnbG9vcCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbG9vcDtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy5fbG9vcCA9ICEhdmFsdWU7XG4gICAgICAgIGlmKHRoaXMuX3NvdXJjZSkge1xuICAgICAgICAgIHRoaXMuX3NvdXJjZS5sb29wID0gdGhpcy5fbG9vcDtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnZHVyYXRpb24nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5kdXJhdGlvbiA6IDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdjdXJyZW50VGltZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmN1cnJlbnRUaW1lIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ3Byb2dyZXNzJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UucHJvZ3Jlc3MgOiAwO1xuICB9XG59KTtcblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAndm9sdW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9nYWluLmdhaW4udmFsdWU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmKGlzTmFOKHZhbHVlKSkgeyByZXR1cm47IH1cblxuICAgICAgICB0aGlzLl9nYWluLmdhaW4udmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICBpZih0aGlzLl9kYXRhICYmIHRoaXMuX2RhdGEudm9sdW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEudm9sdW1lID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ3BsYXlpbmcnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wbGF5aW5nIDogZmFsc2U7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wYXVzZWQgOiBmYWxzZTtcbiAgICB9XG59KTtcblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFNvdW5kO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTdXBwb3J0KCkge1xuICAgIHRoaXMuX2luaXQoKTtcbn1cblxuU3VwcG9ydC5wcm90b3R5cGUuX2luaXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdWRpbycpO1xuICAgIGlmKCFlbCkgeyByZXR1cm4gW107IH1cblxuICAgIHZhciB0ZXN0cyA9IFtcbiAgICAgICAgeyBleHQ6ICdvZ2cnLCB0eXBlOiAnYXVkaW8vb2dnOyBjb2RlY3M9XCJ2b3JiaXNcIicgfSxcbiAgICAgICAgeyBleHQ6ICdtcDMnLCB0eXBlOiAnYXVkaW8vbXBlZzsnIH0sXG4gICAgICAgIHsgZXh0OiAnb3B1cycsIHR5cGU6ICdhdWRpby9vZ2c7IGNvZGVjcz1cIm9wdXNcIicgfSxcbiAgICAgICAgeyBleHQ6ICd3YXYnLCB0eXBlOiAnYXVkaW8vd2F2OyBjb2RlY3M9XCIxXCInIH0sXG4gICAgICAgIHsgZXh0OiAnbTRhJywgdHlwZTogJ2F1ZGlvL3gtbTRhOycgfSxcbiAgICAgICAgeyBleHQ6ICdtNGEnLCB0eXBlOiAnYXVkaW8vYWFjOycgfVxuICAgIF07XG5cbiAgICB0aGlzLl9leHRlbnNpb25zID0gW107XG4gICAgdGhpcy5fY2FuUGxheSA9IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0ZXN0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgdGVzdCA9IHRlc3RzW2ldO1xuICAgICAgICB2YXIgY2FuUGxheVR5cGUgPSAhIWVsLmNhblBsYXlUeXBlKHRlc3QudHlwZSk7XG4gICAgICAgIGlmKGNhblBsYXlUeXBlKSB7XG4gICAgICAgICAgICB0aGlzLl9leHRlbnNpb25zLnB1c2godGVzdC5leHQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2NhblBsYXlbdGVzdC5leHRdID0gY2FuUGxheVR5cGU7XG4gICAgfVxufTtcblxuU3VwcG9ydC5wcm90b3R5cGUuZ2V0RmlsZUV4dGVuc2lvbiA9IGZ1bmN0aW9uKHVybCkge1xuICAgIHVybCA9IHVybC5zcGxpdCgnPycpWzBdO1xuICAgIHVybCA9IHVybC5zdWJzdHIodXJsLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcblxuICAgIHZhciBhID0gdXJsLnNwbGl0KCcuJyk7XG4gICAgaWYoYS5sZW5ndGggPT09IDEgfHwgKGFbMF0gPT09ICcnICYmIGEubGVuZ3RoID09PSAyKSkge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHJldHVybiBhLnBvcCgpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG5TdXBwb3J0LnByb3RvdHlwZS5nZXRTdXBwb3J0ZWRGaWxlID0gZnVuY3Rpb24oZmlsZU5hbWVzKSB7XG4gICAgLy8gaWYgYXJyYXkgZ2V0IHRoZSBmaXJzdCBvbmUgdGhhdCB3b3Jrc1xuICAgIGlmKGZpbGVOYW1lcyBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmlsZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZXh0ID0gdGhpcy5nZXRGaWxlRXh0ZW5zaW9uKGZpbGVOYW1lc1tpXSk7XG4gICAgICAgICAgICB2YXIgaW5kID0gdGhpcy5fZXh0ZW5zaW9ucy5pbmRleE9mKGV4dCk7XG4gICAgICAgICAgICBpZihpbmQgPiAtMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWxlTmFtZXNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gaWYgbm90IGFycmF5IGFuZCBpcyBvYmplY3RcbiAgICBlbHNlIGlmKGZpbGVOYW1lcyBpbnN0YW5jZW9mIE9iamVjdCkge1xuICAgICAgICBmb3IodmFyIGtleSBpbiBmaWxlTmFtZXMpIHtcbiAgICAgICAgICAgIHZhciBleHRlbnNpb24gPSB0aGlzLmdldEZpbGVFeHRlbnNpb24oZmlsZU5hbWVzW2tleV0pO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5fZXh0ZW5zaW9ucy5pbmRleE9mKGV4dGVuc2lvbik7XG4gICAgICAgICAgICBpZihpbmRleCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbGVOYW1lc1trZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIGlmIHN0cmluZyBqdXN0IHJldHVyblxuICAgIHJldHVybiBmaWxlTmFtZXM7XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU3VwcG9ydC5wcm90b3R5cGUsICdleHRlbnNpb25zJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9leHRlbnNpb25zO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU3VwcG9ydC5wcm90b3R5cGUsICdjYW5QbGF5Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jYW5QbGF5O1xuICAgIH1cbn0pO1xuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gbmV3IFN1cHBvcnQoKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuIGZ1bmN0aW9uIFV0aWxzKGNvbnRleHQpIHtcbiAgICBmdW5jdGlvbiBwYXJzZU51bSh4KSB7XG4gICAgICAgIHJldHVybiBpc05hTih4KSA/IDAgOiBwYXJzZUZsb2F0KHgsIDEwKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBmYWRlOiBmdW5jdGlvbihnYWluTm9kZSwgdmFsdWUsIGR1cmF0aW9uKSB7XG4gICAgICAgICAgICBnYWluTm9kZS5nYWluLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKHZhbHVlLCBjb250ZXh0LmN1cnJlbnRUaW1lICsgZHVyYXRpb24pO1xuICAgICAgICB9LFxuICAgICAgICBwYW5IYW5kbGVyOiBmdW5jdGlvbihwYW5uZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgLy8gcGFuIGxlZnQgdG8gcmlnaHQgd2l0aCB2YWx1ZSBmcm9tIC0xIHRvIDFcbiAgICAgICAgICAgICAgICB4OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyB4IGZyb20gLU1hdGguUEkvNCB0byBNYXRoLlBJLzQgKC00NSB0byA0NSBkZWcpXG4gICAgICAgICAgICAgICAgICAgIHZhciB4ID0gcGFyc2VGbG9hdCh2YWx1ZSwgMTApICogTWF0aC5QSSAvIDQ7XG4gICAgICAgICAgICAgICAgICAgIHZhciB6ID0geCArIE1hdGguUEkgLyAyO1xuICAgICAgICAgICAgICAgICAgICBpZiAoeiA+IE1hdGguUEkgLyAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB6ID0gTWF0aC5QSSAtIHo7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgeCA9IE1hdGguc2luKHgpO1xuICAgICAgICAgICAgICAgICAgICB6ID0gTWF0aC5zaW4oeik7XG4gICAgICAgICAgICAgICAgICAgIHBhbm5lci5zZXRQb3NpdGlvbih4LCAwLCB6KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHh5ejogZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICAgICAgICAgICAgICB4ID0gcGFyc2VOdW0oeCk7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBwYXJzZU51bSh5KTtcbiAgICAgICAgICAgICAgICAgICAgeiA9IHBhcnNlTnVtKHopO1xuICAgICAgICAgICAgICAgICAgICBwYW5uZXIuc2V0UG9zaXRpb24oeCwgeSwgeik7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXRTb3VyY2VQb3NpdGlvbjogZnVuY3Rpb24ocG9zaXRpb25WZWMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBwb3NpdGlvbiBvZiB0aGUgc291cmNlICh3aGVyZSB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG4gICAgICAgICAgICAgICAgICAgIHBhbm5lci5zZXRQb3NpdGlvbihwb3NpdGlvblZlYy54LCBwb3NpdGlvblZlYy55LCBwb3NpdGlvblZlYy56KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldFNvdXJjZU9yaWVudGF0aW9uOiBmdW5jdGlvbihmb3J3YXJkVmVjKSB7IC8vIGZvcndhcmRWZWMgPSBUSFJFRS5WZWN0b3IzXG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCB0aGUgYXVkaW8gc291cmNlIG9yaWVudGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0T3JpZW50YXRpb24ocGFubmVyLCBmb3J3YXJkVmVjKTtcbiAgICAgICAgICAgICAgICAgICAgLyovLyBzZXQgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBzb3VyY2UgKHdoZXJlIHRoZSBhdWRpbyBpcyBjb21pbmcgZnJvbSlcbiAgICAgICAgICAgICAgICAgICAgLy92YXIgZncgPSBmb3J3YXJkVmVjLmNsb25lKCkubm9ybWFsaXplKCk7ID0+XG4gICAgICAgICAgICAgICAgICAgIHZhciBmdyA9IHsgeDogZm9yd2FyZFZlYy54LCB5OiBmb3J3YXJkVmVjLnksIHo6IGZvcndhcmRWZWMueiB9O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm5vcm1hbGl6ZShmdyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSB1cCB2ZWMgKCB1cCA9IChmb3J3YXJkIGNyb3NzICgwLCAxLCAwKSkgY3Jvc3MgZm9yd2FyZCApXG4gICAgICAgICAgICAgICAgICAgIHZhciBnbG9iYWxVcCA9IHsgeDogMCwgeTogMSwgejogMCB9O1xuICAgICAgICAgICAgICAgICAgICAvLyB2YXIgdXAgPSBmb3J3YXJkVmVjLmNsb25lKCkuY3Jvc3MoZ2xvYmFsVXApLmNyb3NzKGZvcndhcmRWZWMpLm5vcm1hbGl6ZSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdXAgPSB7IHg6IGZvcndhcmRWZWMueCwgeTogZm9yd2FyZFZlYy55LCB6OiBmb3J3YXJkVmVjLnogfTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jcm9zcyh1cCwgZ2xvYmFsVXApO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNyb3NzKHVwLCBmb3J3YXJkVmVjKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3JtYWxpemUodXApO1xuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIGF1ZGlvIGNvbnRleHQncyBsaXN0ZW5lciBwb3NpdGlvbiB0byBtYXRjaCB0aGUgY2FtZXJhIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIHBhbm5lci5zZXRPcmllbnRhdGlvbihmdy54LCBmdy55LCBmdy56LCB1cC54LCB1cC55LCB1cC56KTsqL1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0TGlzdGVuZXJQb3NpdGlvbjogZnVuY3Rpb24ocG9zaXRpb25WZWMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBwb3NpdGlvbiBvZiB0aGUgbGlzdGVuZXIgKHdobyBpcyBoZWFyaW5nIHRoZSBhdWRpbylcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5saXN0ZW5lci5zZXRQb3NpdGlvbihwb3NpdGlvblZlYy54LCBwb3NpdGlvblZlYy55LCBwb3NpdGlvblZlYy56KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldExpc3RlbmVyT3JpZW50YXRpb246IGZ1bmN0aW9uKGZvcndhcmRWZWMpIHsgLy8gZm9yd2FyZFZlYyA9IFRIUkVFLlZlY3RvcjNcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBhdWRpbyBjb250ZXh0J3MgbGlzdGVuZXIgcG9zaXRpb24gdG8gbWF0Y2ggdGhlIGNhbWVyYSBwb3NpdGlvblxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldE9yaWVudGF0aW9uKGNvbnRleHQubGlzdGVuZXIsIGZvcndhcmRWZWMpO1xuICAgICAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBsaXN0ZW5lciAod2hvIGlzIGhlYXJpbmcgdGhlIGF1ZGlvKVxuICAgICAgICAgICAgICAgICAgICB2YXIgZncgPSBmb3J3YXJkVmVjLmNsb25lKCkubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSB1cCB2ZWMgKCB1cCA9IChmb3J3YXJkIGNyb3NzICgwLCAxLCAwKSkgY3Jvc3MgZm9yd2FyZCApXG4gICAgICAgICAgICAgICAgICAgIHZhciBnbG9iYWxVcCA9IHsgeDogMCwgeTogMSwgejogMCB9O1xuICAgICAgICAgICAgICAgICAgICB2YXIgdXAgPSBmb3J3YXJkVmVjLmNsb25lKCkuY3Jvc3MoZ2xvYmFsVXApLmNyb3NzKGZvcndhcmRWZWMpLm5vcm1hbGl6ZSgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBzZXQgdGhlIGF1ZGlvIGNvbnRleHQncyBsaXN0ZW5lciBwb3NpdGlvbiB0byBtYXRjaCB0aGUgY2FtZXJhIHBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQubGlzdGVuZXIuc2V0T3JpZW50YXRpb24oZncueCwgZncueSwgZncueiwgdXAueCwgdXAueSwgdXAueik7XG4gICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkb3BwbGVyOiBmdW5jdGlvbih4LCB5LCB6LCBkZWx0YVgsIGRlbHRhWSwgZGVsdGFaLCBkZWx0YVRpbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJhY2tpbmcgdGhlIHZlbG9jaXR5IGNhbiBiZSBkb25lIGJ5IGdldHRpbmcgdGhlIG9iamVjdCdzIHByZXZpb3VzIHBvc2l0aW9uLCBzdWJ0cmFjdGluZ1xuICAgICAgICAgICAgICAgICAgICAvLyBpdCBmcm9tIHRoZSBjdXJyZW50IHBvc2l0aW9uIGFuZCBkaXZpZGluZyB0aGUgcmVzdWx0IGJ5IHRoZSB0aW1lIGVsYXBzZWQgc2luY2UgbGFzdCBmcmFtZVxuICAgICAgICAgICAgICAgICAgICBwYW5uZXIuc2V0UG9zaXRpb24oeCwgeSwgeik7XG4gICAgICAgICAgICAgICAgICAgIHBhbm5lci5zZXRWZWxvY2l0eShkZWx0YVgvZGVsdGFUaW1lLCBkZWx0YVkvZGVsdGFUaW1lLCBkZWx0YVovZGVsdGFUaW1lKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldE9yaWVudGF0aW9uOiBmdW5jdGlvbihub2RlLCBmb3J3YXJkVmVjKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNldCB0aGUgb3JpZW50YXRpb24gb2YgdGhlIHNvdXJjZSAod2hlcmUgdGhlIGF1ZGlvIGlzIGNvbWluZyBmcm9tKVxuICAgICAgICAgICAgICAgICAgICAvL3ZhciBmdyA9IGZvcndhcmRWZWMuY2xvbmUoKS5ub3JtYWxpemUoKTsgPT5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGZ3ID0geyB4OiBmb3J3YXJkVmVjLngsIHk6IGZvcndhcmRWZWMueSwgejogZm9yd2FyZFZlYy56IH07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9ybWFsaXplKGZ3KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIHVwIHZlYyAoIHVwID0gKGZvcndhcmQgY3Jvc3MgKDAsIDEsIDApKSBjcm9zcyBmb3J3YXJkIClcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdsb2JhbFVwID0geyB4OiAwLCB5OiAxLCB6OiAwIH07XG4gICAgICAgICAgICAgICAgICAgIC8vIHZhciB1cCA9IGZvcndhcmRWZWMuY2xvbmUoKS5jcm9zcyhnbG9iYWxVcCkuY3Jvc3MoZm9yd2FyZFZlYykubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB1cCA9IHsgeDogZm9yd2FyZFZlYy54LCB5OiBmb3J3YXJkVmVjLnksIHo6IGZvcndhcmRWZWMueiB9O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNyb3NzUHJvZHVjdCh1cCwgZ2xvYmFsVXApO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNyb3NzUHJvZHVjdCh1cCwgZm9yd2FyZFZlYyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9ybWFsaXplKHVwKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2V0IHRoZSBhdWRpbyBjb250ZXh0J3MgbGlzdGVuZXIgcG9zaXRpb24gdG8gbWF0Y2ggdGhlIGNhbWVyYSBwb3NpdGlvblxuICAgICAgICAgICAgICAgICAgICBub2RlLnNldE9yaWVudGF0aW9uKGZ3LngsIGZ3LnksIGZ3LnosIHVwLngsIHVwLnksIHVwLnopO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY3Jvc3NQcm9kdWN0OiBmdW5jdGlvbiAoIGEsIGIgKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGF4ID0gYS54LCBheSA9IGEueSwgYXogPSBhLno7XG4gICAgICAgICAgICAgICAgICAgIHZhciBieCA9IGIueCwgYnkgPSBiLnksIGJ6ID0gYi56O1xuXG4gICAgICAgICAgICAgICAgICAgIGEueCA9IGF5ICogYnogLSBheiAqIGJ5O1xuICAgICAgICAgICAgICAgICAgICBhLnkgPSBheiAqIGJ4IC0gYXggKiBiejtcbiAgICAgICAgICAgICAgICAgICAgYS56ID0gYXggKiBieSAtIGF5ICogYng7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZTogZnVuY3Rpb24gKHZlYzMpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZih2ZWMzLnggPT09IDAgJiYgdmVjMy55ID09PSAwICYmIHZlYzMueiA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZlYzM7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KCB2ZWMzLnggKiB2ZWMzLnggKyB2ZWMzLnkgKiB2ZWMzLnkgKyB2ZWMzLnogKiB2ZWMzLnogKTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgaW52U2NhbGFyID0gMSAvIGxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgdmVjMy54ICo9IGludlNjYWxhcjtcbiAgICAgICAgICAgICAgICAgICAgdmVjMy55ICo9IGludlNjYWxhcjtcbiAgICAgICAgICAgICAgICAgICAgdmVjMy56ICo9IGludlNjYWxhcjtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmVjMztcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG4gICAgICAgIGZpbHRlcjogZnVuY3Rpb24oZmlsdGVyTm9kZSwgdmFsdWUsIHF1YWxpdHksIGdhaW4pIHtcbiAgICAgICAgICAgIC8vIHNldCBmaWx0ZXIgZnJlcXVlbmN5IGJhc2VkIG9uIHZhbHVlIGZyb20gMCB0byAxXG4gICAgICAgICAgICB2YWx1ZSA9IHBhcnNlRmxvYXQodmFsdWUsIDEwKTtcbiAgICAgICAgICAgIHF1YWxpdHkgPSBwYXJzZUZsb2F0KHF1YWxpdHksIDEwKTtcbiAgICAgICAgICAgIGdhaW4gPSBwYXJzZUZsb2F0KGdhaW4sIDEwKTtcbiAgICAgICAgICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICAgICAgICAgIGZpbHRlck5vZGUuZnJlcXVlbmN5LnZhbHVlID0gdGhpcy5nZXRGcmVxdWVuY3kodmFsdWUpO1xuXG4gICAgICAgICAgICAvL2ZpbHRlck5vZGUuUS52YWx1ZSA9IHF1YWxpdHk7XG4gICAgICAgICAgICAvL2ZpbHRlck5vZGUuZ2Fpbi52YWx1ZSA9IGdhaW47XG4gICAgICAgIH0sXG4gICAgICAgIGdldEZyZXF1ZW5jeTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIC8vIGdldCBmcmVxdWVuY3kgYnkgcGFzc2luZyBudW1iZXIgZnJvbSAwIHRvIDFcbiAgICAgICAgICAgIC8vIENsYW1wIHRoZSBmcmVxdWVuY3kgYmV0d2VlbiB0aGUgbWluaW11bSB2YWx1ZSAoNDAgSHopIGFuZCBoYWxmIG9mIHRoZVxuICAgICAgICAgICAgLy8gc2FtcGxpbmcgcmF0ZS5cbiAgICAgICAgICAgIHZhciBtaW5WYWx1ZSA9IDQwO1xuICAgICAgICAgICAgdmFyIG1heFZhbHVlID0gY29udGV4dC5zYW1wbGVSYXRlIC8gMjtcbiAgICAgICAgICAgIC8vIExvZ2FyaXRobSAoYmFzZSAyKSB0byBjb21wdXRlIGhvdyBtYW55IG9jdGF2ZXMgZmFsbCBpbiB0aGUgcmFuZ2UuXG4gICAgICAgICAgICB2YXIgbnVtYmVyT2ZPY3RhdmVzID0gTWF0aC5sb2cobWF4VmFsdWUgLyBtaW5WYWx1ZSkgLyBNYXRoLkxOMjtcbiAgICAgICAgICAgIC8vIENvbXB1dGUgYSBtdWx0aXBsaWVyIGZyb20gMCB0byAxIGJhc2VkIG9uIGFuIGV4cG9uZW50aWFsIHNjYWxlLlxuICAgICAgICAgICAgdmFyIG11bHRpcGxpZXIgPSBNYXRoLnBvdygyLCBudW1iZXJPZk9jdGF2ZXMgKiAodmFsdWUgLSAxLjApKTtcbiAgICAgICAgICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICAgICAgICAgIHJldHVybiBtYXhWYWx1ZSAqIG11bHRpcGxpZXI7XG4gICAgICAgIH0sXG4gICAgICAgIGRpc3RvcnQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAvLyBjcmVhdGUgd2F2ZVNoYXBlciBkaXN0b3J0aW9uIGN1cnZlIGZyb20gMCB0byAxXG4gICAgICAgICAgICB2YXIgayA9IHZhbHVlICogMTAwLFxuICAgICAgICAgICAgICAgIG4gPSAyMjA1MCxcbiAgICAgICAgICAgICAgICBjdXJ2ZSA9IG5ldyBGbG9hdDMyQXJyYXkobiksXG4gICAgICAgICAgICAgICAgZGVnID0gTWF0aC5QSSAvIDE4MDtcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgeCA9IGkgKiAyIC8gbiAtIDE7XG4gICAgICAgICAgICAgICAgY3VydmVbaV0gPSAoMyArIGspICogeCAqIDIwICogZGVnIC8gKE1hdGguUEkgKyBrICogTWF0aC5hYnMoeCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGN1cnZlO1xuICAgICAgICB9LFxuICAgICAgICB3YXZlZm9ybURhdGE6IGZ1bmN0aW9uKGJ1ZmZlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0tLS0tLScpO1xuICAgICAgICAgICAgY29uc29sZS50aW1lKCd3YXZlZm9ybScpO1xuICAgICAgICAgICAgdmFyIHdhdmVmb3JtID0gbmV3IEZsb2F0MzJBcnJheShsZW5ndGgpLFxuICAgICAgICAgICAgICAgIGNodW5rID0gTWF0aC5mbG9vcihidWZmZXIubGVuZ3RoIC8gbGVuZ3RoKSxcbiAgICAgICAgICAgICAgICAvL2NodW5rID0gYnVmZmVyLmxlbmd0aCAvIGxlbmd0aCxcbiAgICAgICAgICAgICAgICByZXNvbHV0aW9uID0gNSwgLy8gMTBcbiAgICAgICAgICAgICAgICBpbmNyID0gTWF0aC5mbG9vcihjaHVuayAvIHJlc29sdXRpb24pLFxuICAgICAgICAgICAgICAgIGdyZWF0ZXN0ID0gMDtcblxuICAgICAgICAgICAgaWYoaW5jciA8IDEpIHsgaW5jciA9IDE7IH1cblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGNobmxzID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7IGkgPCBjaG5sczsgaSsrKSB7XG4gICAgICAgICAgICAgICAgLy8gY2hlY2sgZWFjaCBjaGFubmVsXG4gICAgICAgICAgICAgICAgdmFyIGNoYW5uZWwgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSk7XG4gICAgICAgICAgICAgICAgLy9mb3IgKHZhciBqID0gbGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGdldCBoaWdoZXN0IHZhbHVlIHdpdGhpbiB0aGUgY2h1bmtcbiAgICAgICAgICAgICAgICAgICAgLy92YXIgY2ggPSBqICogY2h1bms7XG4gICAgICAgICAgICAgICAgICAgIC8vZm9yICh2YXIgayA9IGNoICsgY2h1bmsgLSAxOyBrID49IGNoOyBrIC09IGluY3IpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IGogKiBjaHVuaywgbCA9IGsgKyBjaHVuazsgayA8IGw7IGsgKz0gaW5jcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2VsZWN0IGhpZ2hlc3QgdmFsdWUgZnJvbSBjaGFubmVsc1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSBjaGFubmVsW2tdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYSA8IDApIHsgYSA9IC1hOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYSA+IHdhdmVmb3JtW2pdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2F2ZWZvcm1bal0gPSBhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIGhpZ2hlc3Qgb3ZlcmFsbCBmb3Igc2NhbGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYSA+IGdyZWF0ZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlc3QgPSBhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gc2NhbGUgdXA/XG4gICAgICAgICAgICB2YXIgc2NhbGUgPSAxIC8gZ3JlYXRlc3QsXG4gICAgICAgICAgICAgICAgbGVuID0gd2F2ZWZvcm0ubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgd2F2ZWZvcm1baV0gKj0gc2NhbGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ3dhdmVmb3JtJyk7XG4gICAgICAgICAgICByZXR1cm4gd2F2ZWZvcm07XG4gICAgICAgIH0sXG4gICAgICAgIHdhdmVmb3JtOiBmdW5jdGlvbihhcnIsIGhlaWdodCwgY29sb3IsIGJnQ29sb3IsIGNhbnZhc0VsKSB7XG4gICAgICAgIC8vd2F2ZWZvcm06IGZ1bmN0aW9uKGFyciwgd2lkdGgsIGhlaWdodCwgY29sb3IsIGJnQ29sb3IsIGNhbnZhc0VsKSB7XG4gICAgICAgICAgICAvL3ZhciBhcnIgPSB0aGlzLndhdmVmb3JtRGF0YShidWZmZXIsIHdpZHRoKTtcbiAgICAgICAgICAgIHZhciBjYW52YXMgPSBjYW52YXNFbCB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgICAgIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aCA9IGFyci5sZW5ndGg7XG4gICAgICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgdmFyIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICAgICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gYmdDb2xvcjtcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgICAgICB2YXIgeCwgeTtcbiAgICAgICAgICAgIGNvbnNvbGUudGltZSgnZHJhd1dhdmVmb3JtJyk7XG4gICAgICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBhcnIubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgeCA9IGkgKyAwLjU7XG4gICAgICAgICAgICAgICAgeSA9IGhlaWdodCAtIE1hdGgucm91bmQoaGVpZ2h0ICogYXJyW2ldKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0Lm1vdmVUbyh4LCB5KTtcbiAgICAgICAgICAgICAgICBjb250ZXh0LmxpbmVUbyh4LCBoZWlnaHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29udGV4dC5zdHJva2UoKTtcbiAgICAgICAgICAgIGNvbnNvbGUudGltZUVuZCgnZHJhd1dhdmVmb3JtJyk7XG4gICAgICAgICAgICByZXR1cm4gY2FudmFzO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBVdGlscztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIExvYWRlciA9IHJlcXVpcmUoJy4vbGliL2xvYWRlci5qcycpLFxuICAgIG5vZGVGYWN0b3J5ID0gcmVxdWlyZSgnLi9saWIvbm9kZS1mYWN0b3J5LmpzJyksXG4gICAgU291bmQgPSByZXF1aXJlKCcuL2xpYi9zb3VuZC5qcycpLFxuICAgIHN1cHBvcnQgPSByZXF1aXJlKCcuL2xpYi9zdXBwb3J0LmpzJyksXG4gICAgVXRpbHMgPSByZXF1aXJlKCcuL2xpYi91dGlscy5qcycpO1xuXG5mdW5jdGlvbiBTb25vKCkge1xuICAgIHRoaXMuVkVSU0lPTiA9ICcwLjAuMCc7XG5cbiAgICB0aGlzLmNvbnRleHQgPSB0aGlzLmNyZWF0ZUF1ZGlvQ29udGV4dCgpO1xuXG4gICAgdGhpcy5fbWFzdGVyR2FpbiA9IHRoaXMuY3JlYXRlLmdhaW4oKTtcblxuICAgIGlmKHRoaXMuY29udGV4dCkge1xuICAgICAgICB0aGlzLl9tYXN0ZXJHYWluLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zb3VuZHMgPSBbXTtcbiAgICB0aGlzLl9zdXBwb3J0ID0gc3VwcG9ydDtcblxuICAgIHRoaXMuaGFuZGxlVG91Y2hsb2NrKCk7XG4gICAgdGhpcy5oYW5kbGVWaXNpYmlsaXR5KCk7XG4gICAgLy90aGlzLmxvZygpO1xufVxuXG4vKlxuICogYWRkIC0gZGF0YSBjYW4gYmUgZWxlbWVudCwgYXJyYXlidWZmZXIgb3IgYXMgeWV0IG51bGwvdW5kZWZpbmVkXG4gKi9cblxuU29uby5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oZGF0YSwgaWQpIHtcblxuICAgIC8vIHRyeSB0byBsb2FkIGlmIHVybCBpcyBwdXQgaW50byBhZGQ/XG4gICAgdmFyIGlzQXVkaW9CdWZmZXIgPSBkYXRhICYmIHdpbmRvdy5BdWRpb0J1ZmZlciAmJiBkYXRhIGluc3RhbmNlb2Ygd2luZG93LkF1ZGlvQnVmZmVyO1xuICAgIHZhciBpc01lZGlhRWxlbWVudCA9IGRhdGEgJiYgZGF0YSBpbnN0YW5jZW9mIHdpbmRvdy5IVE1MTWVkaWFFbGVtZW50O1xuICAgIGlmKGRhdGEgJiYgIWlzQXVkaW9CdWZmZXIgJiYgIWlzTWVkaWFFbGVtZW50KSB7XG4gICAgICAgIHZhciBzID0gdGhpcy5sb2FkKGRhdGEpO1xuICAgICAgICBpZihpZCkgeyBzLmlkID0gaWQ7IH1cbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfVxuXG4gICAgaWYoaWQgJiYgdGhpcy5nZXQoaWQpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldChpZCk7XG4gICAgfVxuXG4gICAgdmFyIHNvdW5kID0gbmV3IFNvdW5kKHRoaXMuY29udGV4dCwgZGF0YSwgdGhpcy5fbWFzdGVyR2Fpbik7XG4gICAgc291bmQuaWQgPSBpZCB8fCB0aGlzLmNyZWF0ZUlkKCk7XG4gICAgLy9zb3VuZC5sb29wID0gISFsb29wO1xuICAgIHNvdW5kLmFkZChkYXRhKTtcbiAgICB0aGlzLl9zb3VuZHMucHVzaChzb3VuZCk7XG4gICAgcmV0dXJuIHNvdW5kO1xufTtcblxuU29uby5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2ssIHRoaXNBcmcsIGFzTWVkaWFFbGVtZW50KSB7XG4gICAgaWYoIXRoaXMuX2xvYWRlcikge1xuICAgICAgICB0aGlzLl9pbml0TG9hZGVyKCk7XG4gICAgfVxuXG4gICAgLy8gbXVsdGlwbGVcbiAgICBpZih1cmwgaW5zdGFuY2VvZiBBcnJheSAmJiB1cmwubGVuZ3RoICYmIHR5cGVvZiB1cmxbMF0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHRoaXMubG9hZE11bHRpcGxlKHVybCwgY2FsbGJhY2ssIHRoaXNBcmcsIGFzTWVkaWFFbGVtZW50KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBzb3VuZCA9IHRoaXMucXVldWUodXJsLCBhc01lZGlhRWxlbWVudCk7XG5cbiAgICBpZihjYWxsYmFjaykge1xuICAgICAgICBzb3VuZC5sb2FkZXIub25Db21wbGV0ZS5hZGRPbmNlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHNvdW5kKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc291bmQubG9hZGVyLnN0YXJ0KCk7XG5cbiAgICByZXR1cm4gc291bmQ7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5xdWV1ZSA9IGZ1bmN0aW9uKHVybCwgYXNNZWRpYUVsZW1lbnQpIHtcbiAgICBpZighdGhpcy5fbG9hZGVyKSB7XG4gICAgICAgIHRoaXMuX2luaXRMb2FkZXIoKTtcbiAgICB9XG5cbiAgICB1cmwgPSBzdXBwb3J0LmdldFN1cHBvcnRlZEZpbGUodXJsKTtcblxuICAgIHZhciBzb3VuZCA9IHRoaXMuYWRkKCk7XG5cbiAgICBzb3VuZC5sb2FkZXIgPSB0aGlzLl9sb2FkZXIuYWRkKHVybCk7XG4gICAgc291bmQubG9hZGVyLm9uQmVmb3JlQ29tcGxldGUuYWRkT25jZShmdW5jdGlvbihidWZmZXIpIHtcbiAgICAgICAgc291bmQuYWRkKGJ1ZmZlcik7XG4gICAgfSk7XG5cbiAgICBpZihhc01lZGlhRWxlbWVudCkge1xuICAgICAgICBzb3VuZC5sb2FkZXIud2ViQXVkaW9Db250ZXh0ID0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gc291bmQ7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5sb2FkTXVsdGlwbGUgPSBmdW5jdGlvbihjb25maWcsIGNvbXBsZXRlLCBwcm9ncmVzcywgdGhpc0FyZywgYXNNZWRpYUVsZW1lbnQpIHtcbiAgICB2YXIgc291bmRzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjb25maWcubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBmaWxlID0gY29uZmlnW2ldO1xuXG4gICAgICAgIHZhciBzb3VuZCA9IHRoaXMucXVldWUoZmlsZS51cmwsIGFzTWVkaWFFbGVtZW50KTtcbiAgICAgICAgc291bmQuaWQgPSBmaWxlLmlkO1xuICAgICAgICBzb3VuZHMucHVzaChzb3VuZCk7XG4gICAgfVxuICAgIGlmKHByb2dyZXNzKSB7XG4gICAgICAgIHRoaXMuX2xvYWRlci5vblByb2dyZXNzLmFkZChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgICBwcm9ncmVzcy5jYWxsKHRoaXNBcmcgfHwgdGhpcywgcCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpZihjb21wbGV0ZSkge1xuICAgICAgICB0aGlzLl9sb2FkZXIub25Db21wbGV0ZS5hZGRPbmNlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29tcGxldGUuY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHNvdW5kcyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLl9sb2FkZXIuc3RhcnQoKTtcbn07XG5cblNvbm8ucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHNvdW5kT3JJZCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5fc291bmRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZih0aGlzLl9zb3VuZHNbaV0gPT09IHNvdW5kT3JJZCB8fCB0aGlzLl9zb3VuZHNbaV0uaWQgPT09IHNvdW5kT3JJZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NvdW5kc1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn07XG5cblNvbm8ucHJvdG90eXBlLmNyZWF0ZUlkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5faWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9pZCA9IDA7XG4gICAgfVxuICAgIHRoaXMuX2lkKys7XG4gICAgcmV0dXJuIHRoaXMuX2lkLnRvU3RyaW5nKDEwKTtcbn07XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cblNvbm8ucHJvdG90eXBlLm11dGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9wcmVNdXRlVm9sdW1lID0gdGhpcy52b2x1bWU7XG4gICAgdGhpcy52b2x1bWUgPSAwO1xufTtcblxuU29uby5wcm90b3R5cGUudW5NdXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy52b2x1bWUgPSB0aGlzLl9wcmVNdXRlVm9sdW1lIHx8IDE7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5wYXVzZUFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5fc291bmRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZih0aGlzLl9zb3VuZHNbaV0ucGxheWluZykge1xuICAgICAgICAgICAgdGhpcy5fc291bmRzW2ldLnBhdXNlKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5Tb25vLnByb3RvdHlwZS5yZXN1bWVBbGwgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuX3NvdW5kcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYodGhpcy5fc291bmRzW2ldLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5fc291bmRzW2ldLnBsYXkoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblNvbm8ucHJvdG90eXBlLnN0b3BBbGwgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuX3NvdW5kcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdGhpcy5fc291bmRzW2ldLnN0b3AoKTtcbiAgICB9XG59O1xuXG5Tb25vLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oaWQsIGRlbGF5LCBvZmZzZXQpIHtcbiAgICB0aGlzLmdldChpZCkucGxheShkZWxheSwgb2Zmc2V0KTtcbn07XG5cblNvbm8ucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oaWQpIHtcbiAgICB0aGlzLmdldChpZCkucGF1c2UoKTtcbn07XG5cblNvbm8ucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuZ2V0KGlkKS5zdG9wKCk7XG59O1xuXG4vKlxuICogTG9hZGluZ1xuICovXG5cblNvbm8ucHJvdG90eXBlLl9pbml0TG9hZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbG9hZGVyID0gbmV3IExvYWRlcigpO1xuICAgIHRoaXMuX2xvYWRlci50b3VjaExvY2tlZCA9IHRoaXMuX2lzVG91Y2hMb2NrZWQ7XG4gICAgdGhpcy5fbG9hZGVyLndlYkF1ZGlvQ29udGV4dCA9IHRoaXMuY29udGV4dDtcbiAgICB0aGlzLl9sb2FkZXIuY3Jvc3NPcmlnaW4gPSB0cnVlO1xufTtcblxuU29uby5wcm90b3R5cGUubG9hZEFycmF5QnVmZmVyID0gZnVuY3Rpb24odXJsLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIHJldHVybiB0aGlzLmxvYWQodXJsLCBjYWxsYmFjaywgdGhpc0FyZywgZmFsc2UpO1xufTtcblxuU29uby5wcm90b3R5cGUubG9hZEF1ZGlvRWxlbWVudCA9IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gdGhpcy5sb2FkKHVybCwgY2FsbGJhY2ssIHRoaXNBcmcsIHRydWUpO1xufTtcblxuU29uby5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKHNvdW5kT3JJZCkge1xuICAgIHZhciBzb3VuZDtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuX3NvdW5kcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgc291bmQgPSB0aGlzLl9zb3VuZHNbaV07XG4gICAgICAgIGlmKHNvdW5kID09PSBzb3VuZE9ySWQgfHwgc291bmQuaWQgPT09IHNvdW5kT3JJZCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYoc291bmQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9zb3VuZHMuc3BsaWNlKGksIDEpO1xuXG4gICAgICAgIGlmKHNvdW5kLmxvYWRlcikge1xuICAgICAgICAgICAgc291bmQubG9hZGVyLmNhbmNlbCgpO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzb3VuZC5zdG9wKCk7ICAgIFxuICAgICAgICB9IGNhdGNoKGUpIHt9XG4gICAgfVxufTtcblxuLypcbiAqIEF1ZGlvIGNvbnRleHRcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5jcmVhdGVBdWRpb0NvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY29udGV4dCA9IG51bGw7XG4gICAgd2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbiAgICBpZih3aW5kb3cuQXVkaW9Db250ZXh0KSB7XG4gICAgICAgIGNvbnRleHQgPSBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpO1xuICAgIH1cbiAgICByZXR1cm4gY29udGV4dDtcbn07XG5cbi8qXG4gKiBNb2JpbGUgdG91Y2ggbG9ja1xuICovXG5cblNvbm8ucHJvdG90eXBlLmhhbmRsZVRvdWNobG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQsXG4gICAgICAgIGxvY2tlZCA9ICEhdWEubWF0Y2goL0FuZHJvaWR8d2ViT1N8aVBob25lfGlQYWR8aVBvZHxCbGFja0JlcnJ5fElFTW9iaWxlfE9wZXJhIE1pbmkvaSksXG4gICAgICAgIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHVubG9jayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB1bmxvY2spO1xuICAgICAgICBzZWxmLl9pc1RvdWNoTG9ja2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2xvYWRlci50b3VjaExvY2tlZCA9IGZhbHNlO1xuXG4gICAgICAgIGlmKHNlbGYuY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGJ1ZmZlciA9IHNlbGYuY29udGV4dC5jcmVhdGVCdWZmZXIoMSwgMSwgMjIwNTApO1xuICAgICAgICAgICAgdmFyIHVubG9ja1NvdXJjZSA9IHNlbGYuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICAgICAgICAgIHVubG9ja1NvdXJjZS5idWZmZXIgPSBidWZmZXI7XG4gICAgICAgICAgICB1bmxvY2tTb3VyY2UuY29ubmVjdChzZWxmLmNvbnRleHQuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgdW5sb2NrU291cmNlLnN0YXJ0KDApO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpZihsb2NrZWQpIHtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdW5sb2NrLCBmYWxzZSk7XG4gICAgfVxuICAgIHRoaXMuX2lzVG91Y2hMb2NrZWQgPSBsb2NrZWQ7XG59O1xuXG4vKlxuICogUGFnZSB2aXNpYmlsaXR5IGV2ZW50c1xuICovXG5cblNvbm8ucHJvdG90eXBlLmhhbmRsZVZpc2liaWxpdHkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFnZUhpZGRlblBhdXNlZCA9IFtdLFxuICAgICAgICBzb3VuZHMgPSB0aGlzLl9zb3VuZHMsXG4gICAgICAgIGhpZGRlbixcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZTtcblxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQuaGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBoaWRkZW4gPSAnaGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICd2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tb3pIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhpZGRlbiA9ICdtb3pIaWRkZW4nO1xuICAgICAgICB2aXNpYmlsaXR5Q2hhbmdlID0gJ21venZpc2liaWxpdHljaGFuZ2UnO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50Lm1zSGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBoaWRkZW4gPSAnbXNIaWRkZW4nO1xuICAgICAgICB2aXNpYmlsaXR5Q2hhbmdlID0gJ21zdmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQud2Via2l0SGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBoaWRkZW4gPSAnd2Via2l0SGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICd3ZWJraXR2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG5cbiAgICAvLyBwYXVzZSBjdXJyZW50bHkgcGxheWluZyBzb3VuZHMgYW5kIHN0b3JlIHJlZnNcbiAgICBmdW5jdGlvbiBvbkhpZGRlbigpIHtcbiAgICAgICAgdmFyIGwgPSBzb3VuZHMubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgdmFyIHNvdW5kID0gc291bmRzW2ldO1xuICAgICAgICAgICAgaWYoc291bmQucGxheWluZykge1xuICAgICAgICAgICAgICAgIHNvdW5kLnBhdXNlKCk7XG4gICAgICAgICAgICAgICAgcGFnZUhpZGRlblBhdXNlZC5wdXNoKHNvdW5kKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHBsYXkgc291bmRzIHRoYXQgZ290IHBhdXNlZCB3aGVuIHBhZ2Ugd2FzIGhpZGRlblxuICAgIGZ1bmN0aW9uIG9uU2hvd24oKSB7XG4gICAgICAgIHdoaWxlKHBhZ2VIaWRkZW5QYXVzZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYWdlSGlkZGVuUGF1c2VkLnBvcCgpLnBsYXkoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uQ2hhbmdlKCkge1xuICAgICAgICBpZiAoZG9jdW1lbnRbaGlkZGVuXSkge1xuICAgICAgICAgICAgb25IaWRkZW4oKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG9uU2hvd24oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmKHZpc2liaWxpdHlDaGFuZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKHZpc2liaWxpdHlDaGFuZ2UsIG9uQ2hhbmdlLCBmYWxzZSk7XG4gICAgfVxufTtcblxuLypcbiAqIExvZyBkZXZpY2Ugc3VwcG9ydCBpbmZvXG4gKi9cblxuU29uby5wcm90b3R5cGUubG9nID0gZnVuY3Rpb24oY29sb3JGdWxsKSB7XG4gICAgdmFyIHRpdGxlID0gJ1Nvbm8gJyArIHRoaXMuVkVSU0lPTixcbiAgICAgICAgaW5mbyA9ICdTdXBwb3J0ZWQ6JyArIHRoaXMuaXNTdXBwb3J0ZWQgK1xuICAgICAgICAgICAgICAgJyBXZWJBdWRpb0FQSTonICsgdGhpcy5oYXNXZWJBdWRpbyArXG4gICAgICAgICAgICAgICAnIFRvdWNoTG9ja2VkOicgKyB0aGlzLl9pc1RvdWNoTG9ja2VkICtcbiAgICAgICAgICAgICAgICcgRXh0ZW5zaW9uczonICsgdGhpcy5fc3VwcG9ydC5leHRlbnNpb25zO1xuXG4gICAgaWYoY29sb3JGdWxsICYmIG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignQ2hyb21lJykgPiAtMSkge1xuICAgICAgICB2YXIgYXJncyA9IFtcbiAgICAgICAgICAgICclYyAlYyAnICsgdGl0bGUgK1xuICAgICAgICAgICAgJyAlYyAlYyAnICtcbiAgICAgICAgICAgIGluZm8gK1xuICAgICAgICAgICAgJyAlYyAnLFxuICAgICAgICAgICAgJ2JhY2tncm91bmQ6ICMxN2QxODYnLFxuICAgICAgICAgICAgJ2NvbG9yOiAjMDAwMDAwOyBiYWNrZ3JvdW5kOiAjZDBmNzM2OyBmb250LXdlaWdodDogYm9sZCcsXG4gICAgICAgICAgICAnYmFja2dyb3VuZDogIzE3ZDE4NicsXG4gICAgICAgICAgICAnYmFja2dyb3VuZDogI2Y3Zjk0ZicsXG4gICAgICAgICAgICAnYmFja2dyb3VuZDogIzE3ZDE4NidcbiAgICAgICAgXTtcbiAgICAgICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJncyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHdpbmRvdy5jb25zb2xlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHRpdGxlICsgJyAnICsgaW5mbyk7XG4gICAgfVxufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnaXNTdXBwb3J0ZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N1cHBvcnQuZXh0ZW5zaW9ucy5sZW5ndGggPiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdjYW5QbGF5Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdXBwb3J0LmNhblBsYXk7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2hhc1dlYkF1ZGlvJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuY29udGV4dDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAndm9sdW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXN0ZXJHYWluLmdhaW4udmFsdWU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmKGlzTmFOKHZhbHVlKSkgeyByZXR1cm47IH1cblxuICAgICAgICB0aGlzLl9tYXN0ZXJHYWluLmdhaW4udmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICBpZighdGhpcy5oYXNXZWJBdWRpbykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9zb3VuZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc291bmRzW2ldLnZvbHVtZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ3NvdW5kcycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291bmRzO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdjcmVhdGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX25vZGVGYWN0b3J5KSB7XG4gICAgICAgICAgICB0aGlzLl9ub2RlRmFjdG9yeSA9IG5vZGVGYWN0b3J5KHRoaXMuY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX25vZGVGYWN0b3J5O1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICd1dGlscycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fdXRpbHMpIHtcbiAgICAgICAgICAgIHRoaXMuX3V0aWxzID0gbmV3IFV0aWxzKHRoaXMuY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3V0aWxzO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdsb2FkZXInLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvYWRlcjtcbiAgICB9XG59KTtcblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IG5ldyBTb25vKCk7XG59XG4iXX0=
(9)
});
