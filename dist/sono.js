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

var signals = _dereq_('signals');

function AssetLoader() {
    this.onChildComplete = new signals.Signal();
    this.onComplete = new signals.Signal();
    this.onProgress = new signals.Signal();
    this.onError = new signals.Signal();

    this.queue = [];
    this.index = 0;
    this.loaders = {};

    this.loaded = false;
    this.webAudioContext = null;
    this.crossOrigin = false;
    this.touchLocked = false;
    this.numTotal = 0;
    this.numLoaded = 0;
}

function createXHR() {
    var xhr, i, progId,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];

    if (typeof XMLHttpRequest !== 'undefined') {
        return new XMLHttpRequest();
    } else if (typeof window.ActiveXObject !== 'undefined') {
        for (i = 0; i < 3; i += 1) {
            progId = progIds[i];
            try {
                xhr = new window.ActiveXObject(progId);
            } catch (e) {}
        }
    }
    return xhr;
}

AssetLoader.prototype = {
    add: function(url, type) {
        var loader = new AssetLoader.Loader(url, type);
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
        this.next();
    },
    next: function() {
        if(this.queue.length === 0) {
            this.loaded = true;
            this.onComplete.dispatch(this.loaders);
            return;
        }
        var loader = this.queue.pop();
        var self = this;
        loader.onComplete.addOnce(function(){
            self.numLoaded++;
            if(self.onProgress.getNumListeners() > 0) {
                self.onProgress.dispatch(self.numLoaded/self.numTotal);
            }
            //self.loaders[loader.url] = loader;
            self.onChildComplete.dispatch(loader);
            self.next();
        });
        loader.onError.addOnce(function(){
            self.onError.dispatch(loader);
            self.next();
        });
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

AssetLoader.Loader = function(url, type) {
    this.url = url;
    this.type = type || this.url.split('?')[0].toLowerCase().split('.').pop();

    this.onProgress = new signals.Signal();
    this.onComplete = new signals.Signal();
    this.onError = new signals.Signal();

    this.webAudioContext = null;
    this.crossOrigin = false;
    this.touchLocked = false;
};

AssetLoader.Loader.prototype = {
    start: function() {
        switch(this.type) {
            case 'mp3':
            case 'ogg':
                this.loadAudio(this.webAudioContext, this.touchLocked);
                break;
            case 'jpg':
            case 'png':
            case 'gif':
                this.loadImage(this.crossOrigin);
                break;
            case 'json':
                this.loadJSON();
                break;
            default:
                throw 'ERROR: Unknown type for file with URL: ' + this.url;
        }
    },
    loadAudio: function(webAudioContext, touchLocked) {
        if(webAudioContext) {
            this.loadWebAudio(webAudioContext);
        } else {
            this.loadHTML5Audio(touchLocked);
        }
    },
    loadWebAudio: function(webAudioContext) {
        var request = new XMLHttpRequest();
        request.open('GET', this.url, true);
        request.responseType = 'arraybuffer';
        var self = this;
        request.onprogress = function(event) {
            if (event.lengthComputable) {
                var percentComplete = event.loaded / event.total;
                self.onProgress.dispatch(percentComplete);
            } else {
                //console.log('Unable to compute progress information since the total size is unknown');
            }
        };
        request.onload = function() {
            webAudioContext.decodeAudioData(request.response, function(buffer) {
                self.data = buffer;
                self.onProgress.dispatch(1);
                self.onComplete.dispatch(buffer);
            }, function() {
                self.onError.dispatch();
            });
        };
        request.onerror = function(e) {
            self.onError.dispatch(e);
        };
        request.send();
    },
    loadHTML5Audio: function(touchLocked) {
        var request = new Audio();
        this.data = request;
        request.name = this.url;
        request.preload = 'auto';
        var self = this;
        request.onerror = function() {
            self.onError.dispatch();
        };
        request.src = this.url;
        if (!!touchLocked) {
            this.onProgress.dispatch(1);
            this.onComplete.dispatch(this.data);
        }
        else {
            var ready = function(){
                request.removeEventListener('canplaythrough', ready);
                clearTimeout(timeout);
                console.log('audio canplaythrough');
                self.onProgress.dispatch(1);
                self.onComplete.dispatch(self.data);
            };
            // timeout because sometimes canplaythrough doesn't fire
            var timeout = setTimeout(ready, 2000);
            request.addEventListener('canplaythrough', ready, false);
            request.load();
        }
    },
    loadImage: function(crossOrigin) {
        var request = new Image();
        this.data = request;
        request.name = this.url;
        var self = this;
        request.onload = function () {
            self.onComplete.dispatch(self.data);
        };
        request.onerror = function () {
            self.onError.dispatch();
        };
        if(crossOrigin) {
            request.crossOrigin = 'anonymous';
        }
        request.src = this.url;
    },
    loadJSON: function() {

        var request = createXHR();
        request.open('GET', this.url, true);
        request.responseType = 'text';
        var self = this;

        function handleLoaded() {
            if (request.status >= 400) {
                self.onError.dispatch();
                return;
            }
            self.json = self.data = JSON.parse(request.responseText);

            self.onComplete.dispatch(self.data);
        }

        function handleError() {
            self.onError.dispatch();
        }

        if ('onload' in request && 'onerror' in request) {
            request.onload = handleLoaded;
            request.onerror = handleError;
        } else {
            request.onreadystatechange = function () {
                try {
                    if (this.done !== undefined) { return; }

                    if (this.status >= 200 && this.status < 300) {
                        this.done = true;
                        handleLoaded();
                    }
                    if (this.status >= 400) {
                        this.done = true;
                        handleError();
                    }
                } catch(e) {}
            };
        }

        request.send();
    },
    cancel: function() {
      // if loaded return
      // if this.request and it's xhr
      // if(request && request.readystate != 4){
      //    request.abort();
      //}
      // if request is img
      // if request is audio
      //
      // dispatch complete or error
    }
};

module.exports = AssetLoader;

/*if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetLoader;
}*/

/*var root = this;
if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = AssetLoader;
    }
    exports.AssetLoader = AssetLoader;
} else if (typeof define !== 'undefined' && define.amd) {
    define('PIXI', (function() { return root.AssetLoader = AssetLoader; })() );
} else {
    root.PIXI = PIXI;
}*/

},{"signals":1}],3:[function(_dereq_,module,exports){
'use strict';

function HTMLSound(el, volume) {
    this.name = '';
    this._loop = false;
    this._volume = volume === undefined ? 1 : volume;
    this._playing = false;
    this._paused = false;
    this._onEnded = null;
    this._endedListener = this.onEnded.bind(this);
    this._playWhenReady = false;
    this.add(el);
}

HTMLSound.prototype.add = function(el) {
    this._el = el;
    // should this take account of delay and offset?
    if(this._playWhenReady) {
        this.play();
    }
};

HTMLSound.prototype.play = function(delay, offset) {
    if(!this._el) {
        this._playWhenReady = true;
        return this;
    }
    this.volume = this._volume;
    if(offset !== undefined && offset > 0) {
        this._el.currentTime = offset;
    }
    if(delay !== undefined && delay > 0) {
        this._delayTimeout = setTimeout(this.play.bind(this), delay);
    }
    else {
        this._el.play();
    }
    this._playing = true;
    this._paused = false;
    this._el.removeEventListener('ended', this._endedListener);
    this._el.addEventListener('ended', this._endedListener, false);
};

HTMLSound.prototype.pause = function() {
    clearTimeout(this._delayTimeout);
    this._el.pause();
    this._playing = false;
    this._paused = true;
};

HTMLSound.prototype.stop = function() {
    this._el.pause();
    this._el.currentTime = 0;
    this._playing = false;
    this._paused = false;
};

HTMLSound.prototype.onEnded = function() {
    console.log('onended');
    this._playing = false;
    this._paused = false;
    if(this._loop) {
        this._el.currentTime = 0;
        this.play();
    } else if(typeof this._onEnded === 'function') {
        this._onEnded();
    }
};

HTMLSound.prototype.addEndedListener = function(fn, context) {
    this._onEnded = fn.bind(context || this);
};

HTMLSound.prototype.removeEndedListener = function() {
    this._onEnded = null;
};

/*
 * Getters & Setters
 */

Object.defineProperty(HTMLSound.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = value;
    }
});

Object.defineProperty(HTMLSound.prototype, 'volume', {
    get: function() {
        return this._volume;
    },
    set: function(value) {
        if(isNaN(value)) { return; }
        this._volume = value;
        if(this._el && this._el.volume !== undefined) {
            this._el.volume = this._volume;
        }
    }
});

Object.defineProperty(HTMLSound.prototype, 'playing', {
    get: function() {
        return this._playing;
    }
});

Object.defineProperty(HTMLSound.prototype, 'paused', {
    get: function() {
        return this._paused;
    }
});

Object.defineProperty(HTMLSound.prototype, 'sound', {
    get: function() {
        return this._el;
    }
});

Object.defineProperty(HTMLSound.prototype, 'duration', {
    get: function() {
        return this._el.duration;
    }
});

Object.defineProperty(HTMLSound.prototype, 'currentTime', {
    get: function() {
        return this._el.currentTime;
    }
});

Object.defineProperty(HTMLSound.prototype, 'progress', {
    get: function() {
        return this.currentTime / this.duration;
    }
});

if (typeof module === 'object' && module.exports) {
    module.exports = HTMLSound;
}

},{}],4:[function(_dereq_,module,exports){
'use strict';

var signals = _dereq_('signals');

var onPageHidden = new signals.Signal(),
    onPageShown = new signals.Signal(),
    hidden, visibilityChange;

function onVisibilityChange() {
    if (document[hidden]) {
        onPageHidden.dispatch();
    } else {
        onPageShown.dispatch();
    }
}

if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support 
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

if(visibilityChange !== undefined) {
    document.addEventListener(visibilityChange, onVisibilityChange, false);
}

module.exports = {
    onPageShown: onPageShown,
    onPageHidden: onPageHidden
};
},{"signals":1}],5:[function(_dereq_,module,exports){
'use strict';

 function WebAudioHelpers(context) {
    function parseNum(x) {
        return isNaN(x) ? 0 : parseFloat(x, 10);
    }

    return {
        fade: function(gainNode, value, duration) {
            gainNode.gain.linearRampToValueAtTime(value, context.currentTime + duration);
        },
        panX: function(panner, value) {
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
        createMicrophoneSource: function(stream, connectTo) {
            var mediaStreamSource = context.createMediaStreamSource( stream );
            if(connectTo) {
                mediaStreamSource.connect(connectTo);
            }
            // HACK: stops moz garbage collection killing the stream
            // see https://support.mozilla.org/en-US/questions/984179
            if(navigator.mozGetUserMedia) {
                window.horrible_hack_for_mozilla = mediaStreamSource;
            }
            return mediaStreamSource;
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
        }
    };
}

if (typeof module === 'object' && module.exports) {
    module.exports = WebAudioHelpers;
}

},{}],6:[function(_dereq_,module,exports){
'use strict';

function WebAudioNodeFactory(context) {

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
            node.panningModel = 'HRTF';
            //node.panningModel = 'equalpower';

            /*

            // Uses a 3D cartesian coordinate system
            node.setPosition(object.position.x/290, object.position.y/290, object.position.z/290);
            // node.setPosition(0, 0, 0);
            // node.setOrientation(1, 0, 0);
            // node.setVelocity(0, 0, 0);

            // Distance model and attributes
            node.distanceModel = 'inverse'; // 'linear' 'inverse' 'exponential'
            node.refDistance = 1;
            node.maxDistance = 10000;
            node.rolloffFactor = 1;

            // Directional sound cone - The cone angles are in degrees and run from 0 to 360
            // node.coneInnerAngle = 360;
            // node.coneOuterAngle = 360;
            // node.coneOuterGain = 0;

            */
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
            input.connect(delayNode);
            gainNode.connect(input);
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
           return this.convolver(this.createImpulseResponse(seconds, decay, reverse));
        },
        createImpulseResponse: function(seconds, decay, reverse) {
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
            //node.onaudioprocess = callback.bind(callbackContext);
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
        }
    };

    var fake = {
        gain: function() {
            return {gain:{value: 0}};
        },
        pan: function() {
            var fn = function(){};
            return {
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
              coneOuterGain: 0
            };
        },
        filter: {
            lowpass: function() {
                return { type:0, frequency: { value: 0 } };
            },
            highpass: function() {
                return { type:0, frequency: { value: 0 } };
            },
            bandpass: function() {
                return { type:0, frequency: { value: 0 } };
            },
            lowshelf: function() {
                return { type:0, frequency: { value: 0 } };
            },
            highshelf: function() {
                return { type:0, frequency: { value: 0 } };
            },
            peaking: function() {
                return { type:0, frequency: { value: 0 } };
            },
            notch: function() {
                return { type:0, frequency: { value: 0 } };
            },
            allpass: function() {
                return { type:0, frequency: { value: 0 } };
            }
        },
        delay: function() {
          return { delayTime: { value: 0 } };
        },
        convolver: function() {
            return { buffer: 0 };
        },
        reverb: function() {
           return this.convolver();
        },
        createImpulseResponse: function() {
            return [];
        },
        analyser: function() {
            return {
              smoothingTimeConstant: 0,
              fftSize: 0,
              minDecibels: 0,
              maxDecibels: 0
            };
        },
        compressor: function() {
            return {
              threshold:{value: 0},
              knee:{value: 0},
              ratio:{value: 0},
              attack:{value: 0},
              release:{value: 0}
            };
        },
        distortion: function() {
            return {
              oversample: 0,
              curve: 0
            };
        },
        scriptProcessor: function() {
            return {

            };
        }
    };

    return context ? create : fake;
}

if (typeof module === 'object' && module.exports) {
    module.exports = WebAudioNodeFactory;
}

},{}],7:[function(_dereq_,module,exports){
'use strict';

var WebAudioSound = _dereq_('./webaudio-sound.js'),
    HTMLSound = _dereq_('./html-sound.js');

function WebAudioPlayer(context, buffer, destination) {
    this.name = '';
    this._context = context;
    this._source = null; // AudioBufferSourceNode
    this._nodeList = [];
    this._gain = this._context.createGain();
    this._gain.connect(destination || this._context.destination);
    this._loop = false;
    this._startedAt = 0;
    this._pausedAt = 0;
    this._playWhenReady = false;
    this._onEnded = null;

    this.add(buffer);
}

WebAudioPlayer.prototype.add = function(buffer) {
    if(!buffer) { return; }
    this._buffer = buffer; // AudioBuffer or Media Element

    if(this._buffer.tagName) {
      this._sound = new HTMLSound(buffer);
      this.getSource();
    }
    else {
      this._sound = new WebAudioSound(buffer, this._context);
      this.getSource();
    }
    this._sound.addEndedListener(this.onEnded, this);

    // should this take account of delay and offset?
    if(this._playWhenReady) {
        this.play();
    }
};

WebAudioPlayer.prototype.play = function(delay, offset) {
    if(!this._sound) {
        this._playWhenReady = true;
        return this;
    }
    this.getSource();
    this._sound.loop = this._loop;

    // volume update?
    this._sound.play(delay, offset);
};

WebAudioPlayer.prototype.pause = function() {
    this._sound.pause();
};

WebAudioPlayer.prototype.stop = function() {
  this._sound.stop();
};

WebAudioPlayer.prototype.addNode = function(node) {
    this._nodeList.push(node);
    this.updateConnections();
    return node;
};

WebAudioPlayer.prototype.removeNode = function(node) {
    var l = this._nodeList.length;
    for (var i = 0; i < l; i++) {
        if(node === this._nodeList[i]) {
            this._nodeList.splice(i, 1);
        }
    }
    node.disconnect(0);
    this.updateConnections();
};

// should source be item 0 in nodelist and desination last
// prob is addNode needs to add before destination
// + should it be called chain or something nicer?
// feels like node list could be a linked list??
// if list.last is destination addbefore

/*WebAudioPlayer.prototype.updateConnections = function() {
    if(!this._source) {
        return;
    }
    var l = this._nodeList.length;
    for (var i = 1; i < l; i++) {
      this._nodeList[i-1].connect(this._nodeList[i]);
    }
};*/
/*WebAudioPlayer.prototype.updateConnections = function() {
    if(!this._source) {
        return;
    }
    console.log('updateConnections');
    this._source.disconnect(0);
    this._source.connect(this._gain);
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
WebAudioPlayer.prototype.updateConnections = function() {
    if(!this._source) {
        return;
    }
    //console.log('updateConnections');
    var l = this._nodeList.length;
    for (var i = 0; i < l; i++) {
        if(i === 0) {
            //console.log(' - connect source to node:', this._nodeList[i]);
            //this._source.disconnect(0);
            this._source.connect(this._nodeList[i]);
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
/*WebAudioPlayer.prototype.connectTo = function(node) {
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
WebAudioPlayer.prototype.connectTo = function(node) {
    var l = this._nodeList.length;
    if(l > 0) {
        //console.log('connect:', this._nodeList[l - 1], 'to', node);
        //this._nodeList[l - 1].disconnect(0);
        this._nodeList[l - 1].connect(node);
    }
    else {
        //console.log(' x connect source to node:', node);
        //this._source.disconnect(0);
        this._source.connect(node);
    }
    this.destination = node;
};

WebAudioPlayer.prototype.onEnded = function() {
    //console.log('p onended');
    //this.stop();
    if(typeof this._onEnded === 'function') {

        this._onEnded();
    }
};

WebAudioPlayer.prototype.addEndedListener = function(fn, context) {
    this._onEnded = fn.bind(context || this);
};

WebAudioPlayer.prototype.removeEndedListener = function() {
    this._onEnded = null;
};

WebAudioPlayer.prototype.getSource = function() {
    //console.log('get source', this._source);
    if(this._buffer.tagName) {
        // audio or video tag
        if(!this._source) {
            this._source = this._context.createMediaElementSource(this._buffer);
            this.updateConnections();
        }
    }
    else {
        // array buffer
        this._source = this._sound.source;
        this.updateConnections();
    }
    return this._source;
};

/*
 * Getters & Setters
 */

/*
 * TODO: set up so source can be stream, oscillator, etc
 */


Object.defineProperty(WebAudioPlayer.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = !!value;
        if(this._sound) {
          this._sound.loop = this._loop;
        }
    }
});

Object.defineProperty(WebAudioPlayer.prototype, 'duration', {
    get: function() {
        return this._sound.duration;
    }
});

Object.defineProperty(WebAudioPlayer.prototype, 'currentTime', {
    get: function() {
        return this._sound.currentTime;
    }
});

Object.defineProperty(WebAudioPlayer.prototype, 'progress', {
  get: function() {
    return this._sound.progress;
  }
});

Object.defineProperty(WebAudioPlayer.prototype, 'volume', {
    get: function() {
        return this._gain.gain.value;
    },
    set: function(value) {
        if(isNaN(value)) { return; }
        this._gain.gain.value = value;
    }
});

Object.defineProperty(WebAudioPlayer.prototype, 'playing', {
    get: function() {
        return this._sound.playing;
    }
});

Object.defineProperty(WebAudioPlayer.prototype, 'paused', {
    get: function() {
        return this._sound.paused;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = WebAudioPlayer;
}

},{"./html-sound.js":3,"./webaudio-sound.js":8}],8:[function(_dereq_,module,exports){
'use strict';

function WebAudioSound(buffer, context) {
    this.name = '';
    this._buffer = buffer; // AudioBuffer
    this._context = context;
    this._source = null; // AudioBufferSourceNode
    this._loop = false;
    this._startedAt = 0;
    this._pausedAt = 0;
    this._onEnded = null;
}

WebAudioSound.prototype.add = function(buffer) {
    this._buffer = buffer;
    return this._buffer;
};

WebAudioSound.prototype.play = function(delay, offset) {
    if(delay === undefined) { delay = 0; }
    if(delay > 0) { delay = this._context.currentTime + delay; }

    if(offset === undefined) { offset = 0; }
    if(this._pausedAt > 0) { offset = offset + this._pausedAt / 1000; }

    //this.stop();
    this.source.loop = this._loop;
    this.source.start(delay, offset);

    this._startedAt = Date.now() - this._pausedAt;

    this._playing = true;
    this._paused = false;
};

WebAudioSound.prototype.pause = function() {
    var elapsed = Date.now() - this._startedAt;
    this.stop();
    this._pausedAt = elapsed;
    this._playing = false;
    this._paused = true;
};

WebAudioSound.prototype.stop = function() {
    if(this._source) {
        this._source.stop(0);
        this._source = null;
    }
    this._startedAt = 0;
    this._pausedAt = 0;
    this._playing = false;
    this._paused = false;
};

WebAudioSound.prototype.onEnded = function() {
    console.log('onended');
    this.stop();
    if(typeof this._onEnded === 'function') {

        this._onEnded();
    }
};

WebAudioSound.prototype.addEndedListener = function(fn, context) {
    this._onEnded = fn.bind(context || this);
};

WebAudioSound.prototype.removeEndedListener = function() {
    this._onEnded = null;
};

/*
 * Getters & Setters
 */

/*
 * TODO: set up so source can be stream, oscillator, etc
 */

Object.defineProperty(WebAudioSound.prototype, 'source', {
    get: function() {
        if(!this._source) {
            this._source = this._context.createBufferSource();
            this._source.buffer = this._buffer;
            this._source.onended = this.onEnded.bind(this);
        }
        return this._source;
    }
});

Object.defineProperty(WebAudioSound.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = !!value;
    }
});

Object.defineProperty(WebAudioSound.prototype, 'duration', {
    get: function() {
        return this._buffer ? this._buffer.duration : 0;
    }
});

Object.defineProperty(WebAudioSound.prototype, 'currentTime', {
    get: function() {
        return this._startedAt ? (Date.now() - this._startedAt) * 0.001 : 0;
    }
});

Object.defineProperty(WebAudioSound.prototype, 'progress', {
  get: function() {
    return Math.min(this.currentTime / this.duration, 1);
  }
});

Object.defineProperty(WebAudioSound.prototype, 'playing', {
    get: function() {
        return this._playing;
    }
});

Object.defineProperty(WebAudioSound.prototype, 'paused', {
    get: function() {
        return this._paused;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = WebAudioSound;
}

},{}],9:[function(_dereq_,module,exports){
'use strict';

var AssetLoader = _dereq_('./lib/asset-loader.js'),
    HTMLSound = _dereq_('./lib/html-sound.js'),
    PageVisibility = _dereq_('./lib/page-visibility.js'),
    WebAudioHelpers = _dereq_('./lib/webaudio-helpers.js'),
    WebAudioNodeFactory = _dereq_('./lib/webaudio-nodefactory.js'),
    WebAudioPlayer = _dereq_('./lib/webaudio-player.js');

function Sono() {
    this._sounds = {};
    this.context = this.createAudioContext();

    if(this.hasWebAudio) {
        this._masterGain = this.context.createGain();
        this._masterGain.connect(this.context.destination);
    }
    else {
        this._masterGain = 1;
    }

    this.getSupportedExtensions();
    this.handleTouchlock();
    this.handlePageVisibility();
    this.initLoader();

    this.log();
}

Sono.VERSION = '0.0.0';

/*
 * add - data can be element, arraybuffer or null/undefined
 */

Sono.prototype.add = function(key, data, loop) {
    // TODO: handle dupe key
    var sound;
    if(this.hasWebAudio) {
        sound = new WebAudioPlayer(this.context, data, this._masterGain);
    }
    else {
        sound = new HTMLSound(data, this._masterGain);
    }
    sound.name = key;
    sound.loop = !!loop;
    sound.add(data);
    this._sounds[key] = sound;
    return sound;
};

Sono.prototype.get = function(key) {
    return this._sounds[key];
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
    for(var i in this._sounds) {
        if(this._sounds[i].playing) {
            this._sounds[i].pause();
        }
    }
};

Sono.prototype.resumeAll = function() {
    for(var i in this._sounds) {
        if(this._sounds[i].paused) {
            this._sounds[i].play();
        }
    }
};

Sono.prototype.stopAll = function() {
    for(var key in this._sounds) {
        this._sounds[key].stop();
    }
};

Sono.prototype.play = function(key) {
    this._sounds[key].play();
};

Sono.prototype.pause = function(key) {
    this._sounds[key].pause();
};

Sono.prototype.stop = function(key) {
    this._sounds[key].stop();
};

/*
 * Loading
 */

Sono.prototype.initLoader = function() {
    this._loader = new AssetLoader();
    this._loader.touchLocked = this._isTouchLocked;
    this._loader.webAudioContext = this.context;
    this._loader.crossOrigin = true;
};

Sono.prototype.load = function(key, url, loop, callback, callbackContext, asBuffer) {
  // TODO: handle dupe key
    var sound = this.add(key, null, loop);
    url = this.getSupportedFile(url);
    //console.log('url:', url);
    sound.loader = this._loader.add(url);
    //sound.loader = new AssetLoader.Loader(url);
    //sound.loader.touchLocked = this._isTouchLocked;
    if(asBuffer) {
        sound.loader.webAudioContext = this.context;
    }
    else {
        sound.loader.webAudioContext = null;
    }
    //sound.loader.crossOrigin = true;
    sound.loader.onComplete.add(function(buffer) {
        sound.add(buffer);
        //console.log('sound loaded:', url, buffer);
        if(callback) {
            callback.call(callbackContext || this, sound);
        }
    }, this);
    sound.loader.start();
    return sound;
};

Sono.prototype.loadBuffer = function(key, url, loop, callback, callbackContext) {
    return this.load(key, url, loop, callback, callbackContext, true);
};

Sono.prototype.loadAudioTag = function(key, url, loop, callback, callbackContext) {
    return this.load(key, url, loop, callback, callbackContext, false);
};

/*
 * Support
 */

Sono.prototype.createAudioContext = function() {
    var context = null;
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if(window.AudioContext) {
        context = new window.AudioContext();
    }
    return context;
};

Sono.prototype.getSupportedFile = function(fileNames) {
    var supportedExtensions = this.getSupportedExtensions();
    // if array get the first one that works
    if(fileNames instanceof Array) {
        for (var i = 0; i < fileNames.length; i++) {
            var ext = this.getExtension(fileNames[i]);
            var ind = supportedExtensions.indexOf(ext);
            if(ind > -1) {
                return fileNames[i];
            }
        }
    }
    // if not array and is object
    else if(fileNames instanceof Object) {
        for(var key in fileNames) {
            var extension = this.getExtension(fileNames[key]);
            var index = supportedExtensions.indexOf(extension);
            if(index > -1) {
                return fileNames[key];
            }
        }
    }
    // if no extension add the fits good one
    else if(typeof fileNames === 'string' && !this.getExtension(fileNames)) {
        if(fileNames.lastIndexOf('.') !== fileNames.length - 1) {
            fileNames = fileNames + '.';
        }
        return fileNames + supportedExtensions[0];
    }
    // if has extension already just return
    return fileNames;
};

Sono.prototype.getExtension = function(fileName) {
    fileName = fileName.split('?')[0];
    var extension = fileName.split('.').pop();
    if(extension === fileName) { extension = ''; }
    return extension.toLowerCase();
};

Sono.prototype.getSupportedExtensions = function() {
    if(this._supportedExtensions) {
        return this._supportedExtensions;
    }
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
    var extensions = [];
    for (var i = 0; i < tests.length; i++) {
        var test = tests[i];
        if(!!el.canPlayType(test.type)) {
            extensions.push(test.ext);
        }
    }
    this._supportedExtensions = extensions;
    return this._supportedExtensions;
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

Sono.prototype.handlePageVisibility = function() {
    PageVisibility.onPageHidden.add(this.pauseAll, this);
    PageVisibility.onPageShown.add(this.resumeAll, this);
};

/*
 * Log device support info
 */

Sono.prototype.log = function() {
    var title = 'Sono ' + Sono.VERSION,
        support = 'Supported:' + this.isSupported +
                  ' WebAudioAPI:' + this.hasWebAudio +
                  ' TouchLocked:' + this._isTouchLocked +
                  ' Extensions:' + this.getSupportedExtensions();

    if(navigator.userAgent.indexOf('Chrome') > -1) {
        var args = [
            '%c %c ' + title +
            ' %c %c ' +
            support +
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
        console.log(title + support);
    }
};

/*
 * Getters & Setters
 */

Object.defineProperty(Sono.prototype, 'isSupported', {
    get: function() {
        return this.getSupportedExtensions().length > 0;
    }
});

Object.defineProperty(Sono.prototype, 'hasWebAudio', {
    get: function() {
        return !!this.context;
    }
});

Object.defineProperty(Sono.prototype, 'volume', {
    get: function() {
        return this.hasWebAudio ? this._masterGain.gain.value : this._masterGain;
    },
    set: function(value) {
        if(isNaN(value)) { return; }

        if(this.hasWebAudio) {
            this._masterGain.gain.value = value;
        }
        else {
            this._masterGain = value;
            for(var i in this._sounds) {
                this._sounds[i].volume = this._masterGain;
            }
        }
    }
});

Object.defineProperty(Sono.prototype, 'create', {
    get: function() {
        if(!this._webAudioNodeFactory) {
            this._webAudioNodeFactory = new WebAudioNodeFactory(this.context);
        }
        return this._webAudioNodeFactory;
    }
});

Object.defineProperty(Sono.prototype, 'utils', {
    get: function() {
        if(!this._webAudioHelpers) {
            this._webAudioHelpers = new WebAudioHelpers(this.context);
        }
        return this._webAudioHelpers;
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

},{"./lib/asset-loader.js":2,"./lib/html-sound.js":3,"./lib/page-visibility.js":4,"./lib/webaudio-helpers.js":5,"./lib/webaudio-nodefactory.js":6,"./lib/webaudio-player.js":7}]},{},[9])
(9)
});