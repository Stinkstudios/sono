!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.Sono=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Loader = require('./lib/loader.js'),
    NodeManager = require('./lib/node-manager.js'),
    Sound = require('./lib/sound.js'),
    Support = require('./lib/support.js'),
    Utils = require('./lib/utils.js');

function Sono() {
    this.VERSION = '0.0.0';

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this._context = window.AudioContext ? new window.AudioContext() : null;
    Utils.setContext(this._context);

    this._node = new NodeManager(this._context);
    this._masterGain = this._node.gain();
    if(this._context) {
        this._node.setSource(this._masterGain);
        this._node.setDestination(this._context.destination);
    }

    this._sounds = [];

    this._handleTouchlock();
    this._handleVisibility();
}

/*
 * Create
 *
 * Accepted values for param config:
 *
 * ArrayBuffer
 * HTMLMediaElement
 * Array (of files e.g. ['foo.ogg', 'foo.mp3'])
 * String (filename e.g. 'foo.ogg')
 * Object config e.g. { id:'foo', url:['foo.ogg', 'foo.mp3'] }
 * String (Oscillator type i.e. 'sine', 'square', 'sawtooth', 'triangle')
 * Object (ScriptProcessor config: { bufferSize: 1024, channels: 1, callback: fn, thisArg: self })
 */

Sono.prototype.createSound = function(config) {
    // try to load if config contains URLs
    if(Support.containsURL(config)) {
        return this.load(config);
    }
    // otherwise just return a new sound object
    var sound = new Sound(this._context, this._masterGain);
    if(config) {
        sound.setData(config.data || config);
        sound.id = config.id || '';
        sound.loop = !!config.loop;
        sound.volume = config.volume;
    }
    this._sounds.push(sound);

    return sound;
};

/*
 * Destroy
 */

Sono.prototype.destroy = function(soundOrId) {
    if(!soundOrId) { return; }
    this._sounds.some(function(sound, index, sounds) {
        if(sound === soundOrId || sound.id === soundOrId) {
            sounds.splice(index, 1);
            if(sound.loader) {
                sound.loader.cancel();
            }
            try {
                sound.stop();
            } catch(e) {}
            return true;
        }
    });
};

/*
 * Get Sound by id
 */

Sono.prototype.getById = function(id) {
    var sound = null;
    this._sounds.some(function(item) {
        sound = item;
        return sound.id === id;
    });
    return sound;
};

/*
 * Loading
 */

//Sono.prototype.load = function(config, onComplete, onProgress, thisArg, asMediaElement) {
Sono.prototype.load = function(config, options) {
    options = options || {};

    var asMediaElement = !!options.asMediaElement,
        onProgress = options.onProgress,
        onComplete = options.onComplete,
        thisArg = options.thisArg || options.context || this;

    var sound,
        loader;

    if(Array.isArray(config) && config[0].hasOwnProperty('url')) {
        sound = [];
        loader = new Loader.Group();

        config.forEach(function(file) {
            sound.push(this._queue(file, asMediaElement, loader));
        }, this);
    }
    else {
        sound = this._queue(config, asMediaElement);
        loader = sound.loader;
    }

    if(onProgress) {
        loader.onProgress.add(onProgress, thisArg);
    }
    if(onComplete) {
        loader.onComplete.addOnce(function() {
            onComplete.call(thisArg, sound);
        });
    }
    loader.start();

    return sound;
};

Sono.prototype._queue = function(config, asMediaElement, group) {
    var url = Support.getSupportedFile(config.url || config);
    var sound = this.createSound();
    sound.id = config.id || '';
    sound.loop = !!config.loop;
    sound.volume = config.volume;

    var loader = new Loader(url);
    loader.audioContext = asMediaElement ? null : this._context;
    loader.isTouchLocked = this._isTouchLocked;
    loader.onBeforeComplete.addOnce(function(data) {
        sound.setData(data);
    });
    // keep a ref so can call sound.loader.cancel()
    sound.loader = loader;
    if(group) { group.add(loader); }

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
            this._sounds.forEach(function(sound) {
                sound.volume = value;
            });
        }
    }
});

Sono.prototype.pauseAll = function() {
    this._sounds.forEach(function(sound) {
        if(sound.playing) {
            sound.pause();
        }
    });
};

Sono.prototype.resumeAll = function() {
    this._sounds.forEach(function(sound) {
        if(sound.paused) {
            sound.play();
        }
    });
};

Sono.prototype.stopAll = function() {
    this._sounds.forEach(function(sound) {
        sound.stop();
    });
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

Sono.prototype._handleTouchlock = function() {
    var ua = navigator.userAgent,
        locked = !!ua.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i),
        self = this;

    var unlock = function() {
        document.body.removeEventListener('touchstart', unlock);
        self._isTouchLocked = false;
        self._sounds.forEach(function(sound) {
            if(sound.loader) {
                sound.loader.touchLocked = false;
            }
        });

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

Sono.prototype._handleVisibility = function() {
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
        sounds.forEach(function(sound) {
            if(sound.playing) {
                sound.pause();
                pageHiddenPaused.push(sound);
            }
        });
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

Sono.prototype.log = function() {
    var title = 'Sono ' + this.VERSION,
        info = 'Supported:' + this.isSupported +
               ' WebAudioAPI:' + this.hasWebAudio +
               ' TouchLocked:' + this._isTouchLocked +
               ' Extensions:' + Support.extensions;

    if(navigator.userAgent.indexOf('Chrome') > -1) {
        var args = [
                '%c ♫ ' + title +
                ' ♫ %c ' + info + ' ',
                'color: #FFFFFF; background: #379F7A',
                'color: #1F1C0D; background: #E0FBAC'
            ];
        console.log.apply(console, args);
    }
    else if (window.console && window.console.log.call) {
        console.log.call(console, title + ' ' + info);
    }
};

/*
 * Getters & Setters
 */

Object.defineProperty(Sono.prototype, 'canPlay', {
    get: function() {
        return Support.canPlay;
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
        return Support.extensions.length > 0;
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
        return Utils;
    }
});

/*
 * Exports
 */

module.exports = new Sono();

},{"./lib/loader.js":3,"./lib/node-manager.js":4,"./lib/sound.js":13,"./lib/support.js":19,"./lib/utils.js":20}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
'use strict';

var signals = require('signals');

function Loader(url) {
    var onProgress = new signals.Signal(),
        onBeforeComplete = new signals.Signal(),
        onComplete = new signals.Signal(),
        onError = new signals.Signal(),
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

    var loadArrayBuffer = function() {
        request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onprogress = function(event) {
            if (event.lengthComputable) {
                progress = event.loaded / event.total;
                onProgress.dispatch(progress);
            }
        };
        request.onload = function() {
            audioContext.decodeAudioData(
                request.response,
                function(buffer) {
                    data = buffer;
                    progress = 1;
                    onProgress.dispatch(1);
                    onBeforeComplete.dispatch(buffer);
                    onComplete.dispatch(buffer);
                },
                function(e) {
                    onError.dispatch(e);
                }
            );
        };
        request.onerror = function(e) {
            onError.dispatch(e);
        };
        request.send();
    };

    var loadAudioElement = function() {
        data = new Audio();
        data.name = url;
        data.preload = 'auto';
        data.src = url;

        if (!!isTouchLocked) {
            onProgress.dispatch(1);
            onBeforeComplete.dispatch(data);
            onComplete.dispatch(data);
        }
        else {
            var timeout;
            var readyHandler = function() {
                data.removeEventListener('canplaythrough', readyHandler);
                window.clearTimeout(timeout);
                progress = 1;
                onProgress.dispatch(1);
                onBeforeComplete.dispatch(data);
                onComplete.dispatch(data);
            };
            // timeout because sometimes canplaythrough doesn't fire
            timeout = window.setTimeout(readyHandler, 4000);
            data.addEventListener('canplaythrough', readyHandler, false);
            data.onerror = function(e) {
                window.clearTimeout(timeout);
                onError.dispatch(e);
            };
            data.load();
        }
    };

    var cancel = function() {
      if(request && request.readyState !== 4) {
          request.abort();
      }
    };

    var api = {
        start: start,
        cancel: cancel,
        onProgress: onProgress,
        onComplete: onComplete,
        onBeforeComplete: onBeforeComplete,
        onError: onError
    };

    Object.defineProperty(api, 'data', {
        get: function() {
            return data;
        }
    });

    Object.defineProperty(api, 'progress', {
        get: function() {
            return progress;
        }
    });

    Object.defineProperty(api, 'audioContext', {
        set: function(value) {
            audioContext = value;
        }
    });

    Object.defineProperty(api, 'isTouchLocked', {
        set: function(value) {
            isTouchLocked = value;
        }
    });

    return Object.freeze(api);
}

Loader.Group = function() {
    var queue = [],
        numLoaded = 0,
        numTotal = 0,
        onComplete = new signals.Signal(),
        onProgress = new signals.Signal(),
        onError = new signals.Signal();

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
            onComplete.dispatch();
            return;
        }

        var loader = queue.pop();
        loader.onProgress.add(progressHandler);
        loader.onBeforeComplete.addOnce(completeHandler);
        loader.onError.addOnce(errorHandler);
        loader.start();
    };

    var progressHandler = function(progress) {
        var numLoaded = numLoaded + progress;
        if(onProgress.getNumListeners() > 0) {
            onProgress.dispatch(numLoaded / numTotal);
        }
    };

    var completeHandler = function() {
        numLoaded++;
        if(onProgress.getNumListeners() > 0) {
            onProgress.dispatch(numLoaded / numTotal);
        }
        next();
    };

    var errorHandler = function(e) {
        onError.dispatch(e);
        next();
    };

    return Object.freeze({
        add: add,
        start: start,
        onProgress: onProgress,
        onComplete: onComplete,
        onError: onError
    });
};

module.exports = Loader;

},{"signals":2}],4:[function(require,module,exports){
'use strict';

var Analyser = require('./node/analyser.js'),
    Distortion = require('./node/distortion.js'),
    Echo = require('./node/echo.js'),
    Filter = require('./node/filter.js'),
    Panner = require('./node/panner.js'),
    Phaser = require('./node/phaser.js'),
    Recorder = require('./node/recorder.js'),
    Reverb = require('./node/reverb.js');

function NodeManager(context) {
    this._context = context || this.createFakeContext();
    this._destination = null;
    this._nodeList = [];
    this._sourceNode = null;
}

NodeManager.prototype.add = function(node) {
    //console.log('NodeManager.add:', node);
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
    var out = node._out || node;
    out.disconnect();
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

NodeManager.prototype._connect = function(a, b) {
    var out = a._out || a;
    out.disconnect();
    out.connect(b._in || b);
    if(typeof a._connected === 'function') {
        a._connected.call(a);
    }
};

NodeManager.prototype._connectTo = function(destination) {
    var l = this._nodeList.length,
        lastNode = l ? this._nodeList[l - 1] : this._sourceNode;
    if(lastNode) {
        this._connect(lastNode, destination);
    }
    this._destination = destination;
};

NodeManager.prototype._updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    //console.log('_updateConnections');
    var l = this._nodeList.length,
        n;
    for (var i = 0; i < l; i++) {
        n = this._nodeList[i];
        if(i === 0) {
            //console.log(' - connect source to node:', n);
            this._connect(this._sourceNode, n);
        }
        else {
            //console.log('connect:', prev, 'to', n);
            var prev = this._nodeList[i-1];
            this._connect(prev, n);
        }
    }
    if(this._destination) {
        this._connectTo(this._destination);
    }
};

Object.defineProperty(NodeManager.prototype, 'panning', {
    get: function() {
        if(!this._panning) {
            this._panning = new Panner(this._context);
        }
        return this._panning;
    }
});

// or setter for destination?
/*NodeManager.prototype._connectTo = function(node) {
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
    this._connectTo(this._context.destination);
};*/

NodeManager.prototype.analyser = function(fftSize, smoothing, minDecibels, maxDecibels) {
    var analyser = new Analyser(this._context, fftSize, smoothing, minDecibels, maxDecibels);
    return this.add(analyser);
};

NodeManager.prototype.compressor = function(threshold, knee, ratio, reduction, attack, release) {
    // lowers the volume of the loudest parts of the signal and raises the volume of the softest parts
    var node = this._context.createDynamicsCompressor();
    // min decibels to start compressing at from -100 to 0
    node.threshold.value = threshold !== undefined ? threshold : -24;
    // decibel value to start curve to compressed value from 0 to 40
    node.knee.value = knee !== undefined ? knee : 30;
    // amount of change per decibel from 1 to 20
    node.ratio.value = ratio !== undefined ? ratio : 12;
    // gain reduction currently applied by compressor from -20 to 0
    node.reduction.value = reduction !== undefined ? reduction : -10;
    // seconds to reduce gain by 10db from 0 to 1 - how quickly signal adapted when volume increased
    node.attack.value = attack !== undefined ? attack : 0.0003;
    // seconds to increase gain by 10db from 0 to 1 - how quickly signal adapted when volume redcuced
    node.release.value = release !== undefined ? release : 0.25;
    return this.add(node);
};

NodeManager.prototype.convolver = function(impulseResponse) {
    // impulseResponse is an audio file buffer
    var node = this._context.createConvolver();
    node.buffer = impulseResponse;
    return this.add(node);
};

NodeManager.prototype.delay = function(time) {
    var node = this._context.createDelay();
    if(time !== undefined) { node.delayTime.value = time; }
    return this.add(node);
};

NodeManager.prototype.echo = function(time, gain) {
    var echo = new Echo(this._context, time, gain);
    this.add(echo);
    return echo;
};

NodeManager.prototype.distortion = function(amount) {
    var node = new Distortion(this._context, amount);
    // Float32Array defining curve (values are interpolated)
    //node.curve
    // up-sample before applying curve for better resolution result 'none', '2x' or '4x'
    //node.oversample = '2x';
    return this.add(node);
};

NodeManager.prototype.filter = function(type, frequency, quality, gain) {
    var filter = new Filter(this._context, type, frequency, quality, gain);
    return this.add(filter);
};

NodeManager.prototype.lowpass = function(frequency, quality, gain) {
    return this.filter('lowpass', frequency, quality, gain);
};

NodeManager.prototype.highpass = function(frequency, quality, gain) {
    return this.filter('highpass', frequency, quality, gain);
};

NodeManager.prototype.bandpass = function(frequency, quality, gain) {
    return this.filter('bandpass', frequency, quality, gain);
};

NodeManager.prototype.lowshelf = function(frequency, quality, gain) {
    return this.filter('lowshelf', frequency, quality, gain);
};

NodeManager.prototype.highshelf = function(frequency, quality, gain) {
    return this.filter('highshelf', frequency, quality, gain);
};

NodeManager.prototype.peaking = function(frequency, quality, gain) {
    return this.filter('peaking', frequency, quality, gain);
};

NodeManager.prototype.notch = function(frequency, quality, gain) {
    return this.filter('notch', frequency, quality, gain);
};

NodeManager.prototype.allpass = function(frequency, quality, gain) {
    return this.filter('allpass', frequency, quality, gain);
};

NodeManager.prototype.gain = function(value) {
    var node = this._context.createGain();
    if(value !== undefined) {
        node.gain.value = value;
    }
    return node;
};

NodeManager.prototype.panner = function() {
    var panner = new Panner(this._context);
    this.add(panner);
    return panner;
};

NodeManager.prototype.phaser = function() {
    var phaser = new Phaser(this._context);
    this.add(phaser);
    return phaser;
};

NodeManager.prototype.recorder = function(passThrough) {
    var recorder = new Recorder(this._context, passThrough);
    this.add(recorder);
    return recorder;
};

NodeManager.prototype.reverb = function(seconds, decay, reverse) {
    var reverb = new Reverb(this._context, seconds, decay, reverse);
    this.add(reverb);
    return reverb;
};

NodeManager.prototype.scriptProcessor = function(bufferSize, inputChannels, outputChannels, callback, thisArg) {
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
        callback.call(thisArg || this, event);
    };
    return this.add(node);
};

NodeManager.prototype.createFakeContext = function() {
    var fn = function(){};
    var param = {
        value: 1,
        defaultValue: 1,
        linearRampToValueAtTime: fn,
        setValueAtTime: fn,
        exponentialRampToValueAtTime: fn,
        setTargetAtTime: fn,
        setValueCurveAtTime: fn,
        cancelScheduledValues: fn
    };
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
        curve: 0,
        // buffer
        sampleRate: 1,
        length: 0,
        duration: 0,
        numberOfChannels: 0,
        getChannelData: function() { return []; },
        copyFromChannel: fn,
        copyToChannel: fn
    };
    var returnFakeNode = function(){ return fakeNode; };
    return {
        createAnalyser: returnFakeNode,
        createBuffer: returnFakeNode,
        createBiquadFilter: returnFakeNode,
        createDynamicsCompressor: returnFakeNode,
        createConvolver: returnFakeNode,
        createDelay: returnFakeNode,
        createGain: function() {
            return {
                gain: {
                    value: 1,
                    defaultValue: 1,
                    linearRampToValueAtTime: fn,
                    setValueAtTime: fn,
                    exponentialRampToValueAtTime: fn,
                    setTargetAtTime: fn,
                    setValueCurveAtTime: fn,
                    cancelScheduledValues: fn
                },
                connect:fn,
                disconnect:fn
            };
        },
        createPanner: returnFakeNode,
        createScriptProcessor: returnFakeNode,
        createWaveShaper: returnFakeNode
    };
};

NodeManager.prototype.setSource = function(node) {
    this._sourceNode = node;
    this._updateConnections();
    return node;
};

NodeManager.prototype.setDestination = function(node) {
    this._connectTo(node);
    return node;
};


/*
function EchoNode(context, delayTime, feedbackVolume){
  this.delayTime.value = delayTime;
  this.gainNode = context.createGainNode();
  this.gainNode.gain.value = feedbackVolume;
  this.connect(this.gainNode);
  this.gainNode.connect(this);
}

function createEcho(context, delayTime, feedback){
  var delay = context.createDelayNode(delayTime + 1);
  FeedbackDelayNode.call(delay, context, delayTime, feedback);
  return delay;
}
*/

//http://stackoverflow.com/questions/13702733/creating-a-custom-echo-node-with-web-audio
//http://stackoverflow.com/questions/19895442/implementing-a-javascript-audionode

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = NodeManager;
}

},{"./node/analyser.js":5,"./node/distortion.js":6,"./node/echo.js":7,"./node/filter.js":8,"./node/panner.js":9,"./node/phaser.js":10,"./node/recorder.js":11,"./node/reverb.js":12}],5:[function(require,module,exports){
'use strict';

/*function Analyser(context, fftSize, smoothing, minDecibels, maxDecibels) {
    var node = context.createAnalyser();
    node.fftSize = fftSize; // frequencyBinCount will be half this value

    if(smoothing !== undefined) { node.smoothingTimeConstant = smoothing; }
    if(minDecibels !== undefined) { node.minDecibels = minDecibels; }
    if(maxDecibels !== undefined) { node.maxDecibels = maxDecibels; }

    var method = function() {
        
    };

    // public methods
    var exports = {
        node: node,
        method: method,
        // map native methods of AnalyserNode
        getByteFrequencyData: node.getByteFrequencyData.bind(node),
        getByteTimeDomainData: node.getByteTimeDomainData.bind(node),
        // map native methods of AudioNode
        connect: node.connect.bind(node),
        disconnect: node.disconnect.bind(node)
    };

    // map native properties of AnalyserNode
    Object.defineProperties(exports, {
        'fftSize': {
            // 32 to 2048 (must be pow 2)
            get: function() { return node.fftSize; },
            set: function(value) { node.fftSize = value; }
        },
        'smoothing': {
            // 0 to 1
            get: function() { return node.smoothingTimeConstant; },
            set: function(value) { node.smoothingTimeConstant = value; }
        },
        'smoothingTimeConstant': {
            // 0 to 1
            get: function() { return node.smoothingTimeConstant; },
            set: function(value) { node.smoothingTimeConstant = value; }
        },
        'minDecibels': {
            // 0 to 1
            get: function() { return node.minDecibels; },
            set: function(value) {
                if(value > -30) { value = -30; }
                node.minDecibels = value;
            }
        },
        'maxDecibels': {
            // 0 to 1 (makes the transition between values over time smoother)
            get: function() { return node.maxDecibels; },
            set: function(value) {
                if(value > -99) { value = -99; }
                node.maxDecibels = value;
            }
        },
        'frequencyBinCount': {
            get: function() { return node.frequencyBinCount; }
        }
    });

    return Object.freeze(exports);
}*/

function Analyser(context, fftSize, smoothing, minDecibels, maxDecibels) {
    fftSize = fftSize || 32;
    var waveformData, frequencyData;

    var node = context.createAnalyser();
    node.fftSize = fftSize; // frequencyBinCount will be half this value

    if(smoothing !== undefined) { node.smoothingTimeConstant = smoothing; }
    if(minDecibels !== undefined) { node.minDecibels = minDecibels; }
    if(maxDecibels !== undefined) { node.maxDecibels = maxDecibels; }

    var updateFFTSize = function() {
        if(fftSize !== node.fftSize || waveformData === undefined) {
            waveformData = new Uint8Array(node.fftSize);
            frequencyData = new Uint8Array(node.frequencyBinCount);
            fftSize = node.fftSize;
        }
    };
    updateFFTSize();

    node.getWaveform = function() {
        updateFFTSize();
        this.getByteTimeDomainData(waveformData);
        return waveformData;
    };

    node.getFrequencies = function() {
        updateFFTSize();
        this.getByteFrequencyData(frequencyData);
        return frequencyData;
    };

    // map native properties of AnalyserNode
    Object.defineProperties(node, {
        'smoothing': {
            // 0 to 1
            get: function() { return node.smoothingTimeConstant; },
            set: function(value) { node.smoothingTimeConstant = value; }
        }
    });

    return node;
}

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Analyser;
}


},{}],6:[function(require,module,exports){
'use strict';

/*function Distortion(context, delayTime, gainValue) {
    var delay = context.createDelay();
    var gain = context.createGain();

    gain.gain.value = gainValue || 0.5;
    if(delayTime !== undefined) { delay.delayTime.value = delayTime; }


    var connect = function(node) {
        disconnect();
        delay.connect(gain);
        gain.connect(delay);
        delay.connect(node);
    };

    var disconnect = function() {
        delay.disconnect();
        gain.disconnect();
    };

    // public methods
    var exports = {
        node: delay,
        // map native methods of DistortionNode
        
        // map native methods of AudioNode
        connect: connect,
        disconnect: disconnect
    };

    // map native properties of DistortionNode
    Object.defineProperties(exports, {
        'delayTime': {
            get: function() { return delay.delayTime.value; },
            set: function(value) { delay.delayTime.value = value; }
        },
        'gainValue': {
            get: function() { return gain.gain.value; },
            set: function(value) { gain.gain.value = value; }
        }
    });

    return Object.freeze(exports);
}*/

function Distortion(context, amount) {
    var node = context.createWaveShaper();

    // create waveShaper distortion curve from 0 to 1
    node.update = function(value) {
        amount = value;
        var k = value * 100,
            n = 22050,
            curve = new Float32Array(n),
            deg = Math.PI / 180;

        for (var i = 0; i < n; i++) {
            var x = i * 2 / n - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }

        this.curve = curve;
    };

    Object.defineProperties(node, {
        'amount': {
            get: function() { return amount; },
            set: function(value) { this.update(value); }
        }
    });

    if(amount !== undefined) {
        node.update(amount);
    }

    return node;
}

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Distortion;
}


},{}],7:[function(require,module,exports){
'use strict';

/*function Echo(context, delayTime, gainValue) {
    var delay = context.createDelay();
    var gain = context.createGain();

    gain.gain.value = gainValue || 0.5;
    if(delayTime !== undefined) { delay.delayTime.value = delayTime; }


    var connect = function(node) {
        disconnect();
        delay.connect(gain);
        gain.connect(delay);
        delay.connect(node);
    };

    var disconnect = function() {
        delay.disconnect();
        gain.disconnect();
    };

    // public methods
    var exports = {
        node: delay,
        // map native methods of EchoNode

        // map native methods of AudioNode
        connect: connect,
        disconnect: disconnect
    };

    // map native properties of EchoNode
    Object.defineProperties(exports, {
        'delayTime': {
            get: function() { return delay.delayTime.value; },
            set: function(value) { delay.delayTime.value = value; }
        },
        'gainValue': {
            get: function() { return gain.gain.value; },
            set: function(value) { gain.gain.value = value; }
        }
    });

    return Object.freeze(exports);
}*/

/*
 * This way is more concise but requires 'connected' to be called in node manager
 */

function Echo(context, delayTime, gainValue) {
    var delay = context.createDelay();
    var gain = context.createGain();

    gain.gain.value = gainValue || 0.5;
    if(delayTime !== undefined) { delay.delayTime.value = delayTime; }

    delay._connected = function() {
        delay.connect(gain);
        gain.connect(delay);
    };

    delay.update = function(delayTime, gainValue) {
        if(delayTime !== undefined) {
            this.delayTime.value = delayTime;
        }
        if(gainValue !== undefined) {
            gain.gain.value = gainValue;
        }
    };

    return delay;
}

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Echo;
}

},{}],8:[function(require,module,exports){
'use strict';
/*
function Filter(context, type, frequency, quality, gain) {
    // Frequency between 40Hz and half of the sampling rate
    var minFrequency = 40;
    var maxFrequency = context.sampleRate / 2;

    console.log('maxFrequency:', maxFrequency);

    var node = context.createBiquadFilter();
    node.type = type;

    if(frequency !== undefined) { node.frequency.value = frequency; }
    if(quality !== undefined) { node.Q.value = quality; }
    if(gain !== undefined) { node.gain.value = gain; }


    var getFrequency = function(value) {
        // Logarithm (base 2) to compute how many octaves fall in the range.
        var numberOfOctaves = Math.log(maxFrequency / minFrequency) / Math.LN2;
        // Compute a multiplier from 0 to 1 based on an exponential scale.
        var multiplier = Math.pow(2, numberOfOctaves * (value - 1.0));
        // Get back to the frequency value between min and max.
        return maxFrequency * multiplier;
    };

    var setByPercent = function(percent, quality, gain) {
        // set filter frequency based on value from 0 to 1
        node.frequency.value = getFrequency(percent);
        if(quality !== undefined) { node.Q.value = quality; }
        if(gain !== undefined) { node.gain.value = gain; }
    };

    // public methods
    var exports = {
        node: node,
        setByPercent: setByPercent,
        // map native methods of BiquadFilterNode
        getFrequencyResponse: node.getFrequencyResponse.bind(node),
        // map native methods of AudioNode
        connect: node.connect.bind(node),
        disconnect: node.disconnect.bind(node)
    };

    // map native properties of BiquadFilterNode
    Object.defineProperties(exports, {
        'type': {
            get: function() { return node.type; },
            set: function(value) { node.type = value; }
        },
        'frequency': {
            get: function() { return node.frequency.value; },
            set: function(value) { node.frequency.value = value; }
        },
        'detune': {
            get: function() { return node.detune.value; },
            set: function(value) { node.detune.value = value; }
        },
        'quality': {
            // 0.0001 to 1000
            get: function() { return node.Q.value; },
            set: function(value) { node.Q.value = value; }
        },
        'gain': {
            // -40 to 40
            get: function() { return node.gain.value; },
            set: function(value) { node.gain.value = value; }
        }
    });

    return Object.freeze(exports);
}*/

function Filter(context, type, frequency, quality, gain) {
    // Frequency between 40Hz and half of the sampling rate
    var minFrequency = 40;
    var maxFrequency = context.sampleRate / 2;

    var node = context.createBiquadFilter();
    node.type = type;

    if(frequency !== undefined) { node.frequency.value = frequency; }
    if(quality !== undefined) { node.Q.value = quality; }
    if(gain !== undefined) { node.gain.value = gain; }


    var getFrequency = function(value) {
        // Logarithm (base 2) to compute how many octaves fall in the range.
        var numberOfOctaves = Math.log(maxFrequency / minFrequency) / Math.LN2;
        // Compute a multiplier from 0 to 1 based on an exponential scale.
        var multiplier = Math.pow(2, numberOfOctaves * (value - 1.0));
        // Get back to the frequency value between min and max.
        return maxFrequency * multiplier;
    };

    node.update = function(frequency, gain) {
        if(frequency !== undefined) {
            this.frequency.value = frequency;
        }
        if(gain !== undefined) {
            this.gain.value = gain;
        }
    };

    node.setByPercent = function(percent, quality, gain) {
        // set filter frequency based on value from 0 to 1
        node.frequency.value = getFrequency(percent);
        if(quality !== undefined) { node.Q.value = quality; }
        if(gain !== undefined) { node.gain.value = gain; }
    };

    return node;
}

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Filter;
}

},{}],9:[function(require,module,exports){
'use strict';
/*
function Panner(context) {
    var node = context.createPanner();
    // Default for stereo is HRTF
    node.panningModel = 'HRTF'; // 'equalpower'

    // Distance model and attributes
    node.distanceModel = 'linear'; // 'linear' 'inverse' 'exponential'
    node.refDistance = 1;
    node.maxDistance = 1000;
    node.rolloffFactor = 1;
    node.coneInnerAngle = 360;
    node.coneOuterAngle = 0;
    node.coneOuterGain = 0;
    
    // simple vec3 object pool
    var VecPool = {
        pool: [],
        get: function(x, y, z) {
            var v = this.pool.length ? this.pool.pop() : { x: 0, y: 0, z: 0 };
            // check if a vector has been passed in
            if(x !== undefined && isNaN(x) && 'x' in x && 'y' in x && 'z' in x) {
                v.x = x.x || 0;
                v.y = x.y || 0;
                v.z = x.z || 0;
            }
            else {
                v.x = x || 0;
                v.y = y || 0;
                v.z = z || 0;    
            }
            return v;
        },
        dispose: function(instance) {
            this.pool.push(instance);
        }
    };

    var globalUp = VecPool.get(0, 1, 0);

    var setOrientation = function(node, fw) {
        // set the orientation of the source (where the audio is coming from)

        // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
        var up = VecPool.get(fw.x, fw.y, fw.z);
        cross(up, globalUp);
        cross(up, fw);
        normalize(up);
        normalize(fw);

        // set the audio context's listener position to match the camera position
        node.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);

        // return the vecs to the pool
        VecPool.dispose(fw);
        VecPool.dispose(up);
    };

    var setPosition = function(node, vec) {
        node.setPosition(vec.x, vec.y, vec.z);
        VecPool.dispose(vec);
    };

    var setVelocity = function(node, vec) {
        node.setVelocity(vec.x, vec.y, vec.z);
        VecPool.dispose(vec);
    };

    var calculateVelocity = function(currentPosition, lastPosition, deltaTime) {
        var dx = currentPosition.x - lastPosition.x;
        var dy = currentPosition.y - lastPosition.y;
        var dz = currentPosition.z - lastPosition.z;
        return VecPool.get(dx / deltaTime, dy / deltaTime, dz / deltaTime);
    };

    // cross product of 2 vectors
    var cross = function ( a, b ) {
        var ax = a.x, ay = a.y, az = a.z;
        var bx = b.x, by = b.y, bz = b.z;
        a.x = ay * bz - az * by;
        a.y = az * bx - ax * bz;
        a.z = ax * by - ay * bx;
    };

    // normalise to unit vector
    var normalize = function (vec3) {
        if(vec3.x === 0 && vec3.y === 0 && vec3.z === 0) {
            return vec3;
        }
        var length = Math.sqrt( vec3.x * vec3.x + vec3.y * vec3.y + vec3.z * vec3.z );
        var invScalar = 1 / length;
        vec3.x *= invScalar;
        vec3.y *= invScalar;
        vec3.z *= invScalar;
        return vec3;
    };

    // pan left to right with value from -1 to 1
    // creates a nice curve with z
    var setX = function(value) {
        var deg45 = Math.PI / 4,
            deg90 = deg45 * 2,
            x = value * deg45,
            z = x + deg90;

        if (z > deg90) {
            z = Math.PI - z;
        }

        x = Math.sin(x);
        z = Math.sin(z);

        node.setPosition(x, 0, z);
    };

    // set the position the audio is coming from)
    var setSourcePosition = function(x, y, z) {
        setPosition(node, VecPool.get(x, y, z));
    };

    // set the direction the audio is coming from)
    var setSourceOrientation = function(x, y, z) {
        setOrientation(node, VecPool.get(x, y, z));
    };

    // set the veloicty of the audio source (if moving)
    var setSourceVelocity = function(x, y, z) {
        setVelocity(node, VecPool.get(x, y, z));
    };

    // set the position of who or what is hearing the audio (could be camera or some character)
    var setListenerPosition = function(x, y, z) {
        setPosition(context.listener, VecPool.get(x, y, z));
    };

    // set the position of who or what is hearing the audio (could be camera or some character)
    var setListenerOrientation = function(x, y, z) {
        setOrientation(context.listener, VecPool.get(x, y, z));
    };

    // set the velocity (if moving) of who or what is hearing the audio (could be camera or some character)
    var setListenerVelocity = function(x, y, z) {
        setVelocity(context.listener, VecPool.get(x, y, z));
    };

    // public methods
    var exports = {
        node: node,
        setX: setX,
        setSourcePosition: setSourcePosition,
        setSourceOrientation: setSourceOrientation,
        setSourceVelocity: setSourceVelocity,
        setListenerPosition: setListenerPosition,
        setListenerOrientation: setListenerOrientation,
        setListenerVelocity: setListenerVelocity,
        calculateVelocity: calculateVelocity,
        // map native methods of PannerNode
        setPosition: node.setPosition.bind(node),
        setOrientation: node.setOrientation.bind(node),
        setVelocity: node.setVelocity.bind(node),
        // map native methods of AudioNode
        connect: node.connect.bind(node),
        disconnect: node.disconnect.bind(node)
    };

    // map native properties of PannerNode
    Object.defineProperties(exports, {
        'panningModel': {
            get: function() { return node.panningModel; },
            set: function(value) { node.panningModel = value; }
        },
        'distanceModel': {
            get: function() { return node.distanceModel; },
            set: function(value) { node.distanceModel = value; }
        },
        'refDistance': {
            get: function() { return node.refDistance; },
            set: function(value) { node.refDistance = value; }
        },
        'maxDistance': {
            get: function() { return node.maxDistance; },
            set: function(value) { node.maxDistance = value; }
        },
        'rolloffFactor': {
            get: function() { return node.rolloffFactor; },
            set: function(value) { node.rolloffFactor = value; }
        },
        'coneInnerAngle': {
            get: function() { return node.coneInnerAngle; },
            set: function(value) { node.coneInnerAngle = value; }
        },
        'coneOuterAngle': {
            get: function() { return node.coneOuterAngle; },
            set: function(value) { node.coneOuterAngle = value; }
        },
        'coneOuterGain': {
            get: function() { return node.coneOuterGain; },
            set: function(value) { node.coneOuterGain = value; }
        }
    });

    return Object.freeze(exports);
}
*/
function Panner(context) {
    var node = context.createPanner();
    // Default for stereo is 'HRTF' can also be 'equalpower'
    node.panningModel = Panner.defaults.panningModel;

    // Distance model and attributes
    // Can be 'linear' 'inverse' 'exponential'
    node.distanceModel = Panner.defaults.distanceModel;
    node.refDistance = Panner.defaults.refDistance;
    node.maxDistance = Panner.defaults.maxDistance;
    node.rolloffFactor = Panner.defaults.rolloffFactor;
    node.coneInnerAngle = Panner.defaults.coneInnerAngle;
    node.coneOuterAngle = Panner.defaults.coneOuterAngle;
    node.coneOuterGain = Panner.defaults.coneOuterGain;
    
    // simple vec3 object pool
    var VecPool = {
        pool: [],
        get: function(x, y, z) {
            var v = this.pool.length ? this.pool.pop() : { x: 0, y: 0, z: 0 };
            // check if a vector has been passed in
            if(x !== undefined && isNaN(x) && 'x' in x && 'y' in x && 'z' in x) {
                v.x = x.x || 0;
                v.y = x.y || 0;
                v.z = x.z || 0;
            }
            else {
                v.x = x || 0;
                v.y = y || 0;
                v.z = z || 0;    
            }
            return v;
        },
        dispose: function(instance) {
            this.pool.push(instance);
        }
    };

    var globalUp = VecPool.get(0, 1, 0);

    var setOrientation = function(node, fw) {
        // set the orientation of the source (where the audio is coming from)

        // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
        var up = VecPool.get(fw.x, fw.y, fw.z);
        cross(up, globalUp);
        cross(up, fw);
        normalize(up);
        normalize(fw);

        // set the audio context's listener position to match the camera position
        node.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);

        // return the vecs to the pool
        VecPool.dispose(fw);
        VecPool.dispose(up);
    };

    var setPosition = function(node, vec) {
        node.setPosition(vec.x, vec.y, vec.z);
        VecPool.dispose(vec);
    };

    var setVelocity = function(node, vec) {
        node.setVelocity(vec.x, vec.y, vec.z);
        VecPool.dispose(vec);
    };

    // cross product of 2 vectors
    var cross = function ( a, b ) {
        var ax = a.x, ay = a.y, az = a.z;
        var bx = b.x, by = b.y, bz = b.z;
        a.x = ay * bz - az * by;
        a.y = az * bx - ax * bz;
        a.z = ax * by - ay * bx;
    };

    // normalise to unit vector
    var normalize = function (vec3) {
        if(vec3.x === 0 && vec3.y === 0 && vec3.z === 0) {
            return vec3;
        }
        var length = Math.sqrt( vec3.x * vec3.x + vec3.y * vec3.y + vec3.z * vec3.z );
        var invScalar = 1 / length;
        vec3.x *= invScalar;
        vec3.y *= invScalar;
        vec3.z *= invScalar;
        return vec3;
    };

    // pan left to right with value from -1 to 1
    // creates a nice curve with z
    node.setX = function(value) {
        var deg45 = Math.PI / 4,
            deg90 = deg45 * 2,
            x = value * deg45,
            z = x + deg90;

        if (z > deg90) {
            z = Math.PI - z;
        }

        x = Math.sin(x);
        z = Math.sin(z);

        node.setPosition(x, 0, z);
    };

    // set the position the audio is coming from)
    node.setSourcePosition = function(x, y, z) {
        setPosition(node, VecPool.get(x, y, z));
    };

    // set the direction the audio is coming from)
    node.setSourceOrientation = function(x, y, z) {
        setOrientation(node, VecPool.get(x, y, z));
    };

    // set the veloicty of the audio source (if moving)
    node.setSourceVelocity = function(x, y, z) {
        setVelocity(node, VecPool.get(x, y, z));
    };

    // set the position of who or what is hearing the audio (could be camera or some character)
    node.setListenerPosition = function(x, y, z) {
        setPosition(context.listener, VecPool.get(x, y, z));
    };

    // set the position of who or what is hearing the audio (could be camera or some character)
    node.setListenerOrientation = function(x, y, z) {
        setOrientation(context.listener, VecPool.get(x, y, z));
    };

    // set the velocity (if moving) of who or what is hearing the audio (could be camera or some character)
    node.setListenerVelocity = function(x, y, z) {
        setVelocity(context.listener, VecPool.get(x, y, z));
    };

    // helper to calculate velocity
    node.calculateVelocity = function(currentPosition, lastPosition, deltaTime) {
        var dx = currentPosition.x - lastPosition.x;
        var dy = currentPosition.y - lastPosition.y;
        var dz = currentPosition.z - lastPosition.z;
        return VecPool.get(dx / deltaTime, dy / deltaTime, dz / deltaTime);
    };

    node.setDefaults = function(defaults) {
        Object.keys(defaults).forEach(function(key) {
            Panner.defaults[key] = defaults[key];
        });
    };

    return node;
}

Panner.defaults = {
    panningModel: 'HRTF',
    distanceModel: 'linear',
    refDistance: 1,
    maxDistance: 1000,
    rolloffFactor: 1,
    coneInnerAngle: 360,
    coneOuterAngle: 0,
    coneOuterGain: 0
};

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Panner;
}


},{}],10:[function(require,module,exports){
'use strict';

function Phaser(context, gain) {
    var stages = 4,
        lfoFrequency = 8,
        lfoGainValue = gain || 20,
        feedback = 0.5,
        filter,
        filters = [];

    var lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = lfoFrequency;
    var lfoGain = context.createGain();
    lfoGain.gain.value = lfoGainValue;
    lfo.connect(lfoGain);
    lfo.start();

    var feedbackGain = context.createGain();
    feedbackGain.gain.value = feedback;

    for (var i = 0; i < stages; i++) {
        filter = context.createBiquadFilter();
        filter.type = 'allpass';
        filters.push(filter);
        //filter.Q.value = 100;
        if(i > 0) {
            filters[i-1].connect(filters[i]);
        }
        lfoGain.connect(filters[i].frequency);
    }

    var node = filters[0];
    node._out = filters[filters.length - 1];

    node._connected = function() {
        console.log.apply(console, ['phaser connected']);
        this._out.connect(feedbackGain);
        feedbackGain.connect(node);
    };

    return node;
}

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Phaser;
}

},{}],11:[function(require,module,exports){
'use strict';

function Recorder(context, passThrough) {
    var node = context.createScriptProcessor(4096, 2, 2),
        buffersL = [],
        buffersR = [],
        startedAt = 0,
        stoppedAt = 0;

    if(passThrough === undefined) {
        passThrough = true;
    }

    node.isRecording = false;

    var getBuffer = function() {
        var buffer = context.createBuffer(2, buffersL.length, context.sampleRate);
        buffer.getChannelData(0).set(buffersL);
        buffer.getChannelData(1).set(buffersR);
        return buffer;
    };

    node.start = function() {
        buffersL.length = 0;
        buffersR.length = 0;
        startedAt = context.currentTime;
        stoppedAt = 0;
        this.isRecording = true;
    };

    node.stop = function() {
        stoppedAt = context.currentTime;
        this.isRecording = false;
        return getBuffer();
    };

    node.getDuration = function() {
        if(!this.isRecording) {
            return stoppedAt - startedAt;
        }
        return context.currentTime - startedAt;
    };

    node.onaudioprocess = function (event) {
        var inputL = event.inputBuffer.getChannelData(0),
            inputR = event.inputBuffer.getChannelData(0),
            outputL = event.outputBuffer.getChannelData(0),
            outputR = event.outputBuffer.getChannelData(0);

        if(passThrough) {
            outputL.set(inputL);
            outputR.set(inputR);
        }

        if(this.isRecording) {
            for (var i = 0; i < inputL.length; i++) {
                buffersL.push(inputL[i]);
                buffersR.push(inputR[i]);
            }
        }
    };

    node._connected = function() {
        this.connect(context.destination);
    };

    return node;
}

module.exports = Recorder;

},{}],12:[function(require,module,exports){
'use strict';

/*function Reverb(context, seconds, decay, reverse) {
    var node = context.createConvolver();

    var update = function(seconds, decay, reverse) {
        seconds = seconds || 1;
        decay = decay || 5;
        reverse = !!reverse;

        var numChannels = 2,
            rate = context.sampleRate,
            length = rate * seconds,
            impulseResponse = context.createBuffer(numChannels, length, rate),
            left = impulseResponse.getChannelData(0),
            right = impulseResponse.getChannelData(1),
            n, e;

        for (var i = 0; i < length; i++) {
            n = reverse ? length - 1 : i;
            e = Math.pow(1 - n / length, decay);
            left[i] = (Math.random() * 2 - 1) * e;
            right[i] = (Math.random() * 2 - 1) * e;
        }

        node.buffer = impulseResponse;
    };

    update(seconds, decay, reverse);

    // public methods
    var exports = {
        node: node,
        update: update,
        // map native methods of ConvolverNode
        connect: node.connect.bind(node),
        disconnect: node.disconnect.bind(node)
    };

    // map native properties of ReverbNode
    Object.defineProperties(exports, {
        'buffer': {
            // true or false
            get: function() { return node.buffer; },
            set: function(value) { node.buffer = value; }
        },
        'normalize': {
            // true or false
            get: function() { return node.normalize; },
            set: function(value) { node.normalize = value; }
        }
    });

    return Object.freeze(exports);
}*/

function Reverb(context, time, decay, reverse) {
    var node = context.createConvolver();

    node.update = function(time, decay, reverse) {
        time = time || 1;
        decay = decay || 5;
        reverse = !!reverse;

        var numChannels = 2,
            rate = context.sampleRate,
            length = rate * time,
            impulseResponse = context.createBuffer(numChannels, length, rate),
            left = impulseResponse.getChannelData(0),
            right = impulseResponse.getChannelData(1),
            n, e;

        for (var i = 0; i < length; i++) {
            n = reverse ? length - 1 : i;
            e = Math.pow(1 - n / length, decay);
            left[i] = (Math.random() * 2 - 1) * e;
            right[i] = (Math.random() * 2 - 1) * e;
        }

        this.buffer = impulseResponse;
    };

    node.update(time, decay, reverse);

    return node;
}

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Reverb;
}


},{}],13:[function(require,module,exports){
'use strict';

var BufferSource = require('./source/buffer-source.js'),
    MediaSource = require('./source/media-source.js'),
    MicrophoneSource = require('./source/microphone-source.js'),
    NodeManager = require('./node-manager.js'),
    OscillatorSource = require('./source/oscillator-source.js'),
    ScriptSource = require('./source/script-source.js'),
    Utils = require('./utils.js');

function Sound(context, destination) {
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
}

Sound.prototype.setData = function(data) {
    if(!data) { return this; }
    this._data = data; // AudioBuffer, MediaElement, etc

    if(Utils.isAudioBuffer(data)) {
        this._source = new BufferSource(data, this._context);
    }
    else if(Utils.isMediaElement(data)) {
        this._source = new MediaSource(data, this._context);
    }
    else if(Utils.isMediaStream(data)) {
        this._source = new MicrophoneSource(data, this._context);
    }
    else if(Utils.isOscillatorType(data)) {
        this._source = new OscillatorSource(data, this._context);
    }
    else if(Utils.isScriptConfig(data)) {
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

Object.defineProperty(Sound.prototype, 'ended', {
    get: function() {
        return this._source ? this._source.ended : false;
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

// for oscillator

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

},{"./node-manager.js":4,"./source/buffer-source.js":14,"./source/media-source.js":15,"./source/microphone-source.js":16,"./source/oscillator-source.js":17,"./source/script-source.js":18,"./utils.js":20}],14:[function(require,module,exports){
'use strict';

function BufferSource(buffer, context) {
    this.id = '';
    this._buffer = buffer; // ArrayBuffer
    this._context = context;
    this._ended = false;
    this._endedCallback = null;
    this._loop = false;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = false;
    this._sourceNode = null; // BufferSourceNode
    this._startedAt = 0;
}

/*
 * Controls
 */

BufferSource.prototype.play = function(delay, offset) {
    if(this._playing) { return; }
    if(delay === undefined) { delay = 0; }
    if(delay > 0) { delay = this._context.currentTime + delay; }

    if(offset === undefined) { offset = 0; }
    if(this._pausedAt > 0) { offset = offset + this._pausedAt; }
    console.log.apply(console, ['1 offset:', offset]);
    while(offset > this.duration) { offset = offset % this.duration; }
    console.log.apply(console, ['2 offset:', offset]);

    this.sourceNode.loop = this._loop;
    this.sourceNode.onended = this._endedHandler.bind(this);
    this.sourceNode.start(delay, offset);

    if(this._pausedAt) {
        this._startedAt = this._context.currentTime - this._pausedAt;
    }
    else {
        this._startedAt = this._context.currentTime - offset;
    }

    this._ended = false;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = true;
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
            this._sourceNode.disconnect();
            this._sourceNode.stop(0);
        } catch(e) {}
        this._sourceNode = null;
    }

    this._paused = false;
    this._pausedAt = 0;
    this._playing = false;
    this._startedAt = 0;
};

/*
 * Ended handler
 */

BufferSource.prototype.onEnded = function(fn, context) {
    this._endedCallback = fn ? fn.bind(context || this) : null;
};

BufferSource.prototype._endedHandler = function() {
    this.stop();
    this._ended = true;
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

Object.defineProperty(BufferSource.prototype, 'ended', {
    get: function() {
        return this._ended;
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

},{}],15:[function(require,module,exports){
'use strict';

function MediaSource(el, context) {
    this.id = '';
    this._context = context;
    this._el = el; // HTMLMediaElement
    this._ended = false;
    this._endedCallback = null;
    this._endedHandlerBound = this._endedHandler.bind(this);
    this._loop = false;
    this._paused = false;
    this._playing = false;
    this._sourceNode = null; // MediaElementSourceNode
}

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

    this._ended = false;
    this._paused = false;
    this._playing = true;

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
    this._ended = true;
    this._paused = false;
    this._playing = false;

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

Object.defineProperty(MediaSource.prototype, 'ended', {
    get: function() {
        return this._ended;
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

},{}],16:[function(require,module,exports){
'use strict';

function MicrophoneSource(stream, context) {
    this.id = '';
    this._context = context;
    this._ended = false;
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

    this._ended = false;
    this._playing = true;
    this._paused = false;
    this._pausedAt = 0;
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
    this._ended = true;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = false;
    this._startedAt = 0;
};

/*
 * Getters & Setters
 */

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

Object.defineProperty(MicrophoneSource.prototype, 'ended', {
    get: function() {
        return this._ended;
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

},{}],17:[function(require,module,exports){
'use strict';

function OscillatorSource(type, context) {
    this.id = '';
    this._context = context;
    this._ended = false;
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

    this._ended = false;
    this._playing = true;
    this._paused = false;
    this._pausedAt = 0;
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
    this._ended = true;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = false;
    this._startedAt = 0;
};

/*
 * Getters & Setters
 */

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

Object.defineProperty(OscillatorSource.prototype, 'ended', {
    get: function() {
        return this._ended;
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
        if(!this._sourceNode && this._context) {
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

},{}],18:[function(require,module,exports){
'use strict';

function ScriptSource(data, context) {
    this.id = '';
    this._bufferSize = data.bufferSize || 1024;
    this._channels = data.channels || 1;
    this._context = context;
    this._ended = false;
    this._onProcess = data.callback.bind(data.thisArg || this);
    this._paused = false;
    this._pausedAt = 0;
    this._playing = false;
    this._sourceNode = null; // ScriptSourceNode
    this._startedAt = 0;
}

/*
 * Controls
 */

ScriptSource.prototype.play = function(delay) {
    if(delay === undefined) { delay = 0; }
    if(delay > 0) { delay = this._context.currentTime + delay; }

    this.sourceNode.onaudioprocess = this._onProcess;

    if(this._pausedAt) {
        this._startedAt = this._context.currentTime - this._pausedAt;
    }
    else {
        this._startedAt = this._context.currentTime;
    }

    this._ended = false;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = true;
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
    }
    this._ended = true;
    this._paused = false;
    this._pausedAt = 0;
    this._playing = false;
    this._startedAt = 0;
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

Object.defineProperty(ScriptSource.prototype, 'ended', {
    get: function() {
        return this._ended;
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

},{}],19:[function(require,module,exports){
'use strict';

function Support() {
    var extensions = [],
        canPlay = {},
        el = document.createElement('audio');

    if(!el) { return; }

    var tests = [
        { ext: 'ogg', type: 'audio/ogg; codecs="vorbis"' },
        { ext: 'mp3', type: 'audio/mpeg;' },
        { ext: 'opus', type: 'audio/ogg; codecs="opus"' },
        { ext: 'wav', type: 'audio/wav; codecs="1"' },
        { ext: 'm4a', type: 'audio/x-m4a;' },
        { ext: 'm4a', type: 'audio/aac;' }
    ];

    tests.forEach(function(test) {
        var canPlayType = !!el.canPlayType(test.type);
        if(canPlayType) {
            extensions.push(test.ext);
        }
        canPlay[test.ext] = canPlayType;
    });

    var getFileExtension = function(url) {
        url = url.split('?')[0];
        url = url.substr(url.lastIndexOf('/') + 1);

        var a = url.split('.');
        if(a.length === 1 || (a[0] === '' && a.length === 2)) {
            return '';
        }
        return a.pop().toLowerCase();
    };

    var getSupportedFile = function(fileNames) {
        var name;

        if(Array.isArray(fileNames)) {
            // if array get the first one that works
            fileNames.some(function(item) {
                name = item;
                var ext = getFileExtension(item);
                return extensions.indexOf(ext) > -1;
            }, this);
        }
        else if(typeof fileNames === 'object') {
            // if not array and is object
            Object.keys(fileNames).some(function(key) {
                name = fileNames[key];
                var ext = getFileExtension(name);
                return extensions.indexOf(ext) > -1;
            }, this);
        }
        // if string just return
        return name || fileNames;
    };

    var containsURL = function(config) {
        if(!config) { return false; }
        // string, array or object with url property that is string or array
        var url = config.url || config;
        return isURL(url) || (Array.isArray(url) && isURL(url[0]));
    };

    var isURL = function(data) {
        return !!(data && typeof data === 'string' && data.indexOf('.') > -1);
    };

    return Object.freeze({
        extensions: extensions,
        canPlay: canPlay,
        getFileExtension: getFileExtension,
        getSupportedFile: getSupportedFile,
        containsURL: containsURL
    });
}

module.exports = new Support();

},{}],20:[function(require,module,exports){
'use strict';

var Utils = {};

Utils.setContext = function(context) {
    this._context = context;
};

/*
 * audio buffer
 */

Utils.cloneBuffer = function(buffer) {
    var numChannels = buffer.numberOfChannels,
        cloned = this._context.createBuffer(numChannels, buffer.length, buffer.sampleRate);
    for (var i = 0; i < numChannels; i++) {
        cloned.getChannelData(i).set(buffer.getChannelData(i));
    }
    return cloned;
};

Utils.reverseBuffer = function(buffer) {
    var numChannels = buffer.numberOfChannels;
    for (var i = 0; i < numChannels; i++) {
        Array.prototype.reverse.call(buffer.getChannelData(i));
    }
    return buffer;
};

/*
 * fade gain
 */

Utils.crossFade = function(fromSound, toSound, duration) {
    var from = this.isAudioParam(fromSound) ? fromSound : fromSound.gain.gain;
    var to = this.isAudioParam(toSound) ? toSound : toSound.gain.gain;

    from.setValueAtTime(from.value, 0);
    from.linearRampToValueAtTime(0, this._context.currentTime + duration);
    to.setValueAtTime(to.value, 0);
    to.linearRampToValueAtTime(1, this._context.currentTime + duration);
};

Utils.fadeFrom = function(sound, value, duration) {
    var param = this.isAudioParam(sound) ? sound : sound.gain.gain;
    var toValue = param.value;

    param.setValueAtTime(value, 0);
    param.linearRampToValueAtTime(toValue, this._context.currentTime + duration);
};

Utils.fadeTo = function(sound, value, duration) {
    var param = this.isAudioParam(sound) ? sound : sound.gain.gain;

    param.setValueAtTime(param.value, 0);
    param.linearRampToValueAtTime(value, this._context.currentTime + duration);
};

/*
 * get frequency from min to max by passing 0 to 1
 */

Utils.getFrequency = function(value) {
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

/*
 * detect file types
 */

Utils.isAudioBuffer = function(data) {
    return !!(data &&
              window.AudioBuffer &&
              data instanceof window.AudioBuffer);
};

Utils.isMediaElement = function(data) {
    return !!(data &&
              window.HTMLMediaElement &&
              data instanceof window.HTMLMediaElement);
};

Utils.isMediaStream = function(data) {
    return !!(data &&
              typeof data.getAudioTracks === 'function' &&
              data.getAudioTracks().length &&
              window.MediaStreamTrack &&
              data.getAudioTracks()[0] instanceof window.MediaStreamTrack);
};

Utils.isOscillatorType = function(data) {
    return !!(data && typeof data === 'string' &&
             (data === 'sine' || data === 'square' ||
              data === 'sawtooth' || data === 'triangle'));
};

Utils.isScriptConfig = function(data) {
    return !!(data && typeof data === 'object' &&
              data.bufferSize && data.channels && data.callback);
};

Utils.isAudioParam = function(data) {
    return !!(data && window.AudioParam && data instanceof window.AudioParam);
};

/*
 * microphone util
 */

Utils.microphone = function(connected, denied, error, thisArg) {
    return new Utils.Microphone(connected, denied, error, thisArg);
};

/*Utils.pan = function(panner) {
    console.log('pan', this._context);
    return new Utils.Pan(this._context, panner);
};*/

Utils.timeCode = function(seconds, delim) {
    if(delim === undefined) { delim = ':'; }
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor((seconds % 3600) % 60);
    var hr = (h === 0 ? '' : (h < 10 ? '0' + h + delim : h + delim));
    var mn = (m < 10 ? '0' + m : m) + delim;
    var sc = (s < 10 ? '0' + s : s);
    return hr + mn + sc;
};

Utils.waveform = function(buffer, length) {
    return new Utils.Waveform(buffer, length);
};

/*
 * Waveform
 */

Utils.Waveform = function(buffer, length) {
    this.data = this.getData(buffer, length);
};

Utils.Waveform.prototype = {
    getData: function(buffer, length) {
        if(!window.Float32Array || !Utils.isAudioBuffer(buffer)) {
            return [];
        }
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
        //console.time('waveformCanvas');
        context.beginPath();
        for (var i = 0, l = this.data.length; i < l; i++) {
            x = i + 0.5;
            y = height - Math.round(height * this.data[i]);
            context.moveTo(x, y);
            context.lineTo(x, height);
        }
        context.stroke();
        //console.timeEnd('waveformCanvas');
        return canvas;
    }
};


/*
 * Microphone
 */

Utils.Microphone = function(connected, denied, error, thisArg) {
    navigator.getUserMedia_ = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
    this._isSupported = !!navigator.getUserMedia_;
    this._stream = null;

    this._onConnected = connected.bind(thisArg || this);
    this._onDenied = denied ? denied.bind(thisArg || this) : function() {};
    this._onError = error ? error.bind(thisArg || this) : function() {};
};

Utils.Microphone.prototype.connect = function() {
    if(!this._isSupported) { return; }
    var self = this;
    navigator.getUserMedia_( {audio:true}, function(stream) {
        self._stream = stream;
        self._onConnected(stream);
    }, function(e) {
        if(e.name === 'PermissionDeniedError' || e === 'PERMISSION_DENIED') {
            console.log('Permission denied. You can undo this by clicking the camera icon with the red cross in the address bar');
            self._onDenied();
        }
        else {
            self._onError(e.message || e);
        }
    });
    return this;
};

Utils.Microphone.prototype.disconnect = function() {
    if(this._stream) {
        this._stream.stop();
        this._stream = null;
    }
    return this;
};

Object.defineProperty(Utils.Microphone.prototype, 'stream', {
    get: function() {
        return this._stream;
    }
});

Object.defineProperty(Utils.Microphone.prototype, 'isSupported', {
    get: function() {
        return this._isSupported;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Utils;
}

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9zb25vLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vbm9kZV9tb2R1bGVzL3NpZ25hbHMvZGlzdC9zaWduYWxzLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL2xpYi9sb2FkZXIuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL25vZGUtbWFuYWdlci5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvbm9kZS9hbmFseXNlci5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvbm9kZS9kaXN0b3J0aW9uLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL2xpYi9ub2RlL2VjaG8uanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL25vZGUvZmlsdGVyLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL2xpYi9ub2RlL3Bhbm5lci5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvbm9kZS9waGFzZXIuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL25vZGUvcmVjb3JkZXIuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL25vZGUvcmV2ZXJiLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL2xpYi9zb3VuZC5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvc291cmNlL2J1ZmZlci1zb3VyY2UuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL3NvdXJjZS9tZWRpYS1zb3VyY2UuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL3NvdXJjZS9taWNyb3Bob25lLXNvdXJjZS5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvc291cmNlL29zY2lsbGF0b3Itc291cmNlLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL2xpYi9zb3VyY2Uvc2NyaXB0LXNvdXJjZS5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvc3VwcG9ydC5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxYUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTG9hZGVyID0gcmVxdWlyZSgnLi9saWIvbG9hZGVyLmpzJyksXG4gICAgTm9kZU1hbmFnZXIgPSByZXF1aXJlKCcuL2xpYi9ub2RlLW1hbmFnZXIuanMnKSxcbiAgICBTb3VuZCA9IHJlcXVpcmUoJy4vbGliL3NvdW5kLmpzJyksXG4gICAgU3VwcG9ydCA9IHJlcXVpcmUoJy4vbGliL3N1cHBvcnQuanMnKSxcbiAgICBVdGlscyA9IHJlcXVpcmUoJy4vbGliL3V0aWxzLmpzJyk7XG5cbmZ1bmN0aW9uIFNvbm8oKSB7XG4gICAgdGhpcy5WRVJTSU9OID0gJzAuMC4wJztcblxuICAgIHdpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG4gICAgdGhpcy5fY29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgPyBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpIDogbnVsbDtcbiAgICBVdGlscy5zZXRDb250ZXh0KHRoaXMuX2NvbnRleHQpO1xuXG4gICAgdGhpcy5fbm9kZSA9IG5ldyBOb2RlTWFuYWdlcih0aGlzLl9jb250ZXh0KTtcbiAgICB0aGlzLl9tYXN0ZXJHYWluID0gdGhpcy5fbm9kZS5nYWluKCk7XG4gICAgaWYodGhpcy5fY29udGV4dCkge1xuICAgICAgICB0aGlzLl9ub2RlLnNldFNvdXJjZSh0aGlzLl9tYXN0ZXJHYWluKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZXREZXN0aW5hdGlvbih0aGlzLl9jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zb3VuZHMgPSBbXTtcblxuICAgIHRoaXMuX2hhbmRsZVRvdWNobG9jaygpO1xuICAgIHRoaXMuX2hhbmRsZVZpc2liaWxpdHkoKTtcbn1cblxuLypcbiAqIENyZWF0ZVxuICpcbiAqIEFjY2VwdGVkIHZhbHVlcyBmb3IgcGFyYW0gY29uZmlnOlxuICpcbiAqIEFycmF5QnVmZmVyXG4gKiBIVE1MTWVkaWFFbGVtZW50XG4gKiBBcnJheSAob2YgZmlsZXMgZS5nLiBbJ2Zvby5vZ2cnLCAnZm9vLm1wMyddKVxuICogU3RyaW5nIChmaWxlbmFtZSBlLmcuICdmb28ub2dnJylcbiAqIE9iamVjdCBjb25maWcgZS5nLiB7IGlkOidmb28nLCB1cmw6Wydmb28ub2dnJywgJ2Zvby5tcDMnXSB9XG4gKiBTdHJpbmcgKE9zY2lsbGF0b3IgdHlwZSBpLmUuICdzaW5lJywgJ3NxdWFyZScsICdzYXd0b290aCcsICd0cmlhbmdsZScpXG4gKiBPYmplY3QgKFNjcmlwdFByb2Nlc3NvciBjb25maWc6IHsgYnVmZmVyU2l6ZTogMTAyNCwgY2hhbm5lbHM6IDEsIGNhbGxiYWNrOiBmbiwgdGhpc0FyZzogc2VsZiB9KVxuICovXG5cblNvbm8ucHJvdG90eXBlLmNyZWF0ZVNvdW5kID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgLy8gdHJ5IHRvIGxvYWQgaWYgY29uZmlnIGNvbnRhaW5zIFVSTHNcbiAgICBpZihTdXBwb3J0LmNvbnRhaW5zVVJMKGNvbmZpZykpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9hZChjb25maWcpO1xuICAgIH1cbiAgICAvLyBvdGhlcndpc2UganVzdCByZXR1cm4gYSBuZXcgc291bmQgb2JqZWN0XG4gICAgdmFyIHNvdW5kID0gbmV3IFNvdW5kKHRoaXMuX2NvbnRleHQsIHRoaXMuX21hc3RlckdhaW4pO1xuICAgIGlmKGNvbmZpZykge1xuICAgICAgICBzb3VuZC5zZXREYXRhKGNvbmZpZy5kYXRhIHx8IGNvbmZpZyk7XG4gICAgICAgIHNvdW5kLmlkID0gY29uZmlnLmlkIHx8ICcnO1xuICAgICAgICBzb3VuZC5sb29wID0gISFjb25maWcubG9vcDtcbiAgICAgICAgc291bmQudm9sdW1lID0gY29uZmlnLnZvbHVtZTtcbiAgICB9XG4gICAgdGhpcy5fc291bmRzLnB1c2goc291bmQpO1xuXG4gICAgcmV0dXJuIHNvdW5kO1xufTtcblxuLypcbiAqIERlc3Ryb3lcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oc291bmRPcklkKSB7XG4gICAgaWYoIXNvdW5kT3JJZCkgeyByZXR1cm47IH1cbiAgICB0aGlzLl9zb3VuZHMuc29tZShmdW5jdGlvbihzb3VuZCwgaW5kZXgsIHNvdW5kcykge1xuICAgICAgICBpZihzb3VuZCA9PT0gc291bmRPcklkIHx8IHNvdW5kLmlkID09PSBzb3VuZE9ySWQpIHtcbiAgICAgICAgICAgIHNvdW5kcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgaWYoc291bmQubG9hZGVyKSB7XG4gICAgICAgICAgICAgICAgc291bmQubG9hZGVyLmNhbmNlbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzb3VuZC5zdG9wKCk7XG4gICAgICAgICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLypcbiAqIEdldCBTb3VuZCBieSBpZFxuICovXG5cblNvbm8ucHJvdG90eXBlLmdldEJ5SWQgPSBmdW5jdGlvbihpZCkge1xuICAgIHZhciBzb3VuZCA9IG51bGw7XG4gICAgdGhpcy5fc291bmRzLnNvbWUoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBzb3VuZCA9IGl0ZW07XG4gICAgICAgIHJldHVybiBzb3VuZC5pZCA9PT0gaWQ7XG4gICAgfSk7XG4gICAgcmV0dXJuIHNvdW5kO1xufTtcblxuLypcbiAqIExvYWRpbmdcbiAqL1xuXG4vL1Nvbm8ucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihjb25maWcsIG9uQ29tcGxldGUsIG9uUHJvZ3Jlc3MsIHRoaXNBcmcsIGFzTWVkaWFFbGVtZW50KSB7XG5Tb25vLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24oY29uZmlnLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICB2YXIgYXNNZWRpYUVsZW1lbnQgPSAhIW9wdGlvbnMuYXNNZWRpYUVsZW1lbnQsXG4gICAgICAgIG9uUHJvZ3Jlc3MgPSBvcHRpb25zLm9uUHJvZ3Jlc3MsXG4gICAgICAgIG9uQ29tcGxldGUgPSBvcHRpb25zLm9uQ29tcGxldGUsXG4gICAgICAgIHRoaXNBcmcgPSBvcHRpb25zLnRoaXNBcmcgfHwgb3B0aW9ucy5jb250ZXh0IHx8IHRoaXM7XG5cbiAgICB2YXIgc291bmQsXG4gICAgICAgIGxvYWRlcjtcblxuICAgIGlmKEFycmF5LmlzQXJyYXkoY29uZmlnKSAmJiBjb25maWdbMF0uaGFzT3duUHJvcGVydHkoJ3VybCcpKSB7XG4gICAgICAgIHNvdW5kID0gW107XG4gICAgICAgIGxvYWRlciA9IG5ldyBMb2FkZXIuR3JvdXAoKTtcblxuICAgICAgICBjb25maWcuZm9yRWFjaChmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgICBzb3VuZC5wdXNoKHRoaXMuX3F1ZXVlKGZpbGUsIGFzTWVkaWFFbGVtZW50LCBsb2FkZXIpKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzb3VuZCA9IHRoaXMuX3F1ZXVlKGNvbmZpZywgYXNNZWRpYUVsZW1lbnQpO1xuICAgICAgICBsb2FkZXIgPSBzb3VuZC5sb2FkZXI7XG4gICAgfVxuXG4gICAgaWYob25Qcm9ncmVzcykge1xuICAgICAgICBsb2FkZXIub25Qcm9ncmVzcy5hZGQob25Qcm9ncmVzcywgdGhpc0FyZyk7XG4gICAgfVxuICAgIGlmKG9uQ29tcGxldGUpIHtcbiAgICAgICAgbG9hZGVyLm9uQ29tcGxldGUuYWRkT25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIG9uQ29tcGxldGUuY2FsbCh0aGlzQXJnLCBzb3VuZCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBsb2FkZXIuc3RhcnQoKTtcblxuICAgIHJldHVybiBzb3VuZDtcbn07XG5cblNvbm8ucHJvdG90eXBlLl9xdWV1ZSA9IGZ1bmN0aW9uKGNvbmZpZywgYXNNZWRpYUVsZW1lbnQsIGdyb3VwKSB7XG4gICAgdmFyIHVybCA9IFN1cHBvcnQuZ2V0U3VwcG9ydGVkRmlsZShjb25maWcudXJsIHx8IGNvbmZpZyk7XG4gICAgdmFyIHNvdW5kID0gdGhpcy5jcmVhdGVTb3VuZCgpO1xuICAgIHNvdW5kLmlkID0gY29uZmlnLmlkIHx8ICcnO1xuICAgIHNvdW5kLmxvb3AgPSAhIWNvbmZpZy5sb29wO1xuICAgIHNvdW5kLnZvbHVtZSA9IGNvbmZpZy52b2x1bWU7XG5cbiAgICB2YXIgbG9hZGVyID0gbmV3IExvYWRlcih1cmwpO1xuICAgIGxvYWRlci5hdWRpb0NvbnRleHQgPSBhc01lZGlhRWxlbWVudCA/IG51bGwgOiB0aGlzLl9jb250ZXh0O1xuICAgIGxvYWRlci5pc1RvdWNoTG9ja2VkID0gdGhpcy5faXNUb3VjaExvY2tlZDtcbiAgICBsb2FkZXIub25CZWZvcmVDb21wbGV0ZS5hZGRPbmNlKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgc291bmQuc2V0RGF0YShkYXRhKTtcbiAgICB9KTtcbiAgICAvLyBrZWVwIGEgcmVmIHNvIGNhbiBjYWxsIHNvdW5kLmxvYWRlci5jYW5jZWwoKVxuICAgIHNvdW5kLmxvYWRlciA9IGxvYWRlcjtcbiAgICBpZihncm91cCkgeyBncm91cC5hZGQobG9hZGVyKTsgfVxuXG4gICAgcmV0dXJuIHNvdW5kO1xufTtcblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuU29uby5wcm90b3R5cGUubXV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3ByZU11dGVWb2x1bWUgPSB0aGlzLnZvbHVtZTtcbiAgICB0aGlzLnZvbHVtZSA9IDA7XG59O1xuXG5Tb25vLnByb3RvdHlwZS51bk11dGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnZvbHVtZSA9IHRoaXMuX3ByZU11dGVWb2x1bWUgfHwgMTtcbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ3ZvbHVtZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWFzdGVyR2Fpbi5nYWluLnZhbHVlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZihpc05hTih2YWx1ZSkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgdGhpcy5fbWFzdGVyR2Fpbi5nYWluLnZhbHVlID0gdmFsdWU7XG5cbiAgICAgICAgaWYoIXRoaXMuaGFzV2ViQXVkaW8pIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgICAgICAgICAgc291bmQudm9sdW1lID0gdmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5Tb25vLnByb3RvdHlwZS5wYXVzZUFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgIGlmKHNvdW5kLnBsYXlpbmcpIHtcbiAgICAgICAgICAgIHNvdW5kLnBhdXNlKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cblNvbm8ucHJvdG90eXBlLnJlc3VtZUFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgIGlmKHNvdW5kLnBhdXNlZCkge1xuICAgICAgICAgICAgc291bmQucGxheSgpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5zdG9wQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgc291bmQuc3RvcCgpO1xuICAgIH0pO1xufTtcblxuU29uby5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGlkLCBkZWxheSwgb2Zmc2V0KSB7XG4gICAgdGhpcy5nZXRCeUlkKGlkKS5wbGF5KGRlbGF5LCBvZmZzZXQpO1xufTtcblxuU29uby5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuZ2V0QnlJZChpZCkucGF1c2UoKTtcbn07XG5cblNvbm8ucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuZ2V0QnlJZChpZCkuc3RvcCgpO1xufTtcblxuLypcbiAqIE1vYmlsZSB0b3VjaCBsb2NrXG4gKi9cblxuU29uby5wcm90b3R5cGUuX2hhbmRsZVRvdWNobG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQsXG4gICAgICAgIGxvY2tlZCA9ICEhdWEubWF0Y2goL0FuZHJvaWR8d2ViT1N8aVBob25lfGlQYWR8aVBvZHxCbGFja0JlcnJ5fElFTW9iaWxlfE9wZXJhIE1pbmkvaSksXG4gICAgICAgIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHVubG9jayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB1bmxvY2spO1xuICAgICAgICBzZWxmLl9pc1RvdWNoTG9ja2VkID0gZmFsc2U7XG4gICAgICAgIHNlbGYuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgICAgICBpZihzb3VuZC5sb2FkZXIpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5sb2FkZXIudG91Y2hMb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYoc2VsZi5jb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgYnVmZmVyID0gc2VsZi5jb250ZXh0LmNyZWF0ZUJ1ZmZlcigxLCAxLCAyMjA1MCk7XG4gICAgICAgICAgICB2YXIgdW5sb2NrU291cmNlID0gc2VsZi5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgICAgICAgICAgdW5sb2NrU291cmNlLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgICAgIHVubG9ja1NvdXJjZS5jb25uZWN0KHNlbGYuY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgICAgICAgICB1bmxvY2tTb3VyY2Uuc3RhcnQoMCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGlmKGxvY2tlZCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB1bmxvY2ssIGZhbHNlKTtcbiAgICB9XG4gICAgdGhpcy5faXNUb3VjaExvY2tlZCA9IGxvY2tlZDtcbn07XG5cbi8qXG4gKiBQYWdlIHZpc2liaWxpdHkgZXZlbnRzXG4gKi9cblxuU29uby5wcm90b3R5cGUuX2hhbmRsZVZpc2liaWxpdHkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFnZUhpZGRlblBhdXNlZCA9IFtdLFxuICAgICAgICBzb3VuZHMgPSB0aGlzLl9zb3VuZHMsXG4gICAgICAgIGhpZGRlbixcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZTtcblxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQuaGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBoaWRkZW4gPSAnaGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICd2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50Lm1vekhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ21vekhpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnbW96dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tc0hpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ21zSGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICdtc3Zpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQud2Via2l0SGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBoaWRkZW4gPSAnd2Via2l0SGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICd3ZWJraXR2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG5cbiAgICAvLyBwYXVzZSBjdXJyZW50bHkgcGxheWluZyBzb3VuZHMgYW5kIHN0b3JlIHJlZnNcbiAgICBmdW5jdGlvbiBvbkhpZGRlbigpIHtcbiAgICAgICAgc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgICAgIGlmKHNvdW5kLnBsYXlpbmcpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIHBhZ2VIaWRkZW5QYXVzZWQucHVzaChzb3VuZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHBsYXkgc291bmRzIHRoYXQgZ290IHBhdXNlZCB3aGVuIHBhZ2Ugd2FzIGhpZGRlblxuICAgIGZ1bmN0aW9uIG9uU2hvd24oKSB7XG4gICAgICAgIHdoaWxlKHBhZ2VIaWRkZW5QYXVzZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYWdlSGlkZGVuUGF1c2VkLnBvcCgpLnBsYXkoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uQ2hhbmdlKCkge1xuICAgICAgICBpZiAoZG9jdW1lbnRbaGlkZGVuXSkge1xuICAgICAgICAgICAgb25IaWRkZW4oKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG9uU2hvd24oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmKHZpc2liaWxpdHlDaGFuZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKHZpc2liaWxpdHlDaGFuZ2UsIG9uQ2hhbmdlLCBmYWxzZSk7XG4gICAgfVxufTtcblxuLypcbiAqIExvZyB2ZXJzaW9uICYgZGV2aWNlIHN1cHBvcnQgaW5mb1xuICovXG5cblNvbm8ucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aXRsZSA9ICdTb25vICcgKyB0aGlzLlZFUlNJT04sXG4gICAgICAgIGluZm8gPSAnU3VwcG9ydGVkOicgKyB0aGlzLmlzU3VwcG9ydGVkICtcbiAgICAgICAgICAgICAgICcgV2ViQXVkaW9BUEk6JyArIHRoaXMuaGFzV2ViQXVkaW8gK1xuICAgICAgICAgICAgICAgJyBUb3VjaExvY2tlZDonICsgdGhpcy5faXNUb3VjaExvY2tlZCArXG4gICAgICAgICAgICAgICAnIEV4dGVuc2lvbnM6JyArIFN1cHBvcnQuZXh0ZW5zaW9ucztcblxuICAgIGlmKG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignQ2hyb21lJykgPiAtMSkge1xuICAgICAgICB2YXIgYXJncyA9IFtcbiAgICAgICAgICAgICAgICAnJWMg4pmrICcgKyB0aXRsZSArXG4gICAgICAgICAgICAgICAgJyDimasgJWMgJyArIGluZm8gKyAnICcsXG4gICAgICAgICAgICAgICAgJ2NvbG9yOiAjRkZGRkZGOyBiYWNrZ3JvdW5kOiAjMzc5RjdBJyxcbiAgICAgICAgICAgICAgICAnY29sb3I6ICMxRjFDMEQ7IGJhY2tncm91bmQ6ICNFMEZCQUMnXG4gICAgICAgICAgICBdO1xuICAgICAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmdzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAod2luZG93LmNvbnNvbGUgJiYgd2luZG93LmNvbnNvbGUubG9nLmNhbGwpIHtcbiAgICAgICAgY29uc29sZS5sb2cuY2FsbChjb25zb2xlLCB0aXRsZSArICcgJyArIGluZm8pO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2NhblBsYXknLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFN1cHBvcnQuY2FuUGxheTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnY29udGV4dCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnaGFzV2ViQXVkaW8nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fY29udGV4dDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnaXNTdXBwb3J0ZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFN1cHBvcnQuZXh0ZW5zaW9ucy5sZW5ndGggPiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdtYXN0ZXJHYWluJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXN0ZXJHYWluO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdub2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdzb3VuZHMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdW5kcztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAndXRpbHMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFV0aWxzO1xuICAgIH1cbn0pO1xuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFNvbm8oKTtcbiIsIi8qanNsaW50IG9uZXZhcjp0cnVlLCB1bmRlZjp0cnVlLCBuZXdjYXA6dHJ1ZSwgcmVnZXhwOnRydWUsIGJpdHdpc2U6dHJ1ZSwgbWF4ZXJyOjUwLCBpbmRlbnQ6NCwgd2hpdGU6ZmFsc2UsIG5vbWVuOmZhbHNlLCBwbHVzcGx1czpmYWxzZSAqL1xuLypnbG9iYWwgZGVmaW5lOmZhbHNlLCByZXF1aXJlOmZhbHNlLCBleHBvcnRzOmZhbHNlLCBtb2R1bGU6ZmFsc2UsIHNpZ25hbHM6ZmFsc2UgKi9cblxuLyoqIEBsaWNlbnNlXG4gKiBKUyBTaWduYWxzIDxodHRwOi8vbWlsbGVybWVkZWlyb3MuZ2l0aHViLmNvbS9qcy1zaWduYWxzLz5cbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICogQXV0aG9yOiBNaWxsZXIgTWVkZWlyb3NcbiAqIFZlcnNpb246IDEuMC4wIC0gQnVpbGQ6IDI2OCAoMjAxMi8xMS8yOSAwNTo0OCBQTSlcbiAqL1xuXG4oZnVuY3Rpb24oZ2xvYmFsKXtcblxuICAgIC8vIFNpZ25hbEJpbmRpbmcgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogT2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIGJpbmRpbmcgYmV0d2VlbiBhIFNpZ25hbCBhbmQgYSBsaXN0ZW5lciBmdW5jdGlvbi5cbiAgICAgKiA8YnIgLz4tIDxzdHJvbmc+VGhpcyBpcyBhbiBpbnRlcm5hbCBjb25zdHJ1Y3RvciBhbmQgc2hvdWxkbid0IGJlIGNhbGxlZCBieSByZWd1bGFyIHVzZXJzLjwvc3Ryb25nPlxuICAgICAqIDxiciAvPi0gaW5zcGlyZWQgYnkgSm9hIEViZXJ0IEFTMyBTaWduYWxCaW5kaW5nIGFuZCBSb2JlcnQgUGVubmVyJ3MgU2xvdCBjbGFzc2VzLlxuICAgICAqIEBhdXRob3IgTWlsbGVyIE1lZGVpcm9zXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQGludGVybmFsXG4gICAgICogQG5hbWUgU2lnbmFsQmluZGluZ1xuICAgICAqIEBwYXJhbSB7U2lnbmFsfSBzaWduYWwgUmVmZXJlbmNlIHRvIFNpZ25hbCBvYmplY3QgdGhhdCBsaXN0ZW5lciBpcyBjdXJyZW50bHkgYm91bmQgdG8uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgSGFuZGxlciBmdW5jdGlvbiBib3VuZCB0byB0aGUgc2lnbmFsLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNPbmNlIElmIGJpbmRpbmcgc2hvdWxkIGJlIGV4ZWN1dGVkIGp1c3Qgb25jZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2xpc3RlbmVyQ29udGV4dF0gQ29udGV4dCBvbiB3aGljaCBsaXN0ZW5lciB3aWxsIGJlIGV4ZWN1dGVkIChvYmplY3QgdGhhdCBzaG91bGQgcmVwcmVzZW50IHRoZSBgdGhpc2AgdmFyaWFibGUgaW5zaWRlIGxpc3RlbmVyIGZ1bmN0aW9uKS5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ByaW9yaXR5XSBUaGUgcHJpb3JpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50IGxpc3RlbmVyLiAoZGVmYXVsdCA9IDApLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFNpZ25hbEJpbmRpbmcoc2lnbmFsLCBsaXN0ZW5lciwgaXNPbmNlLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhhbmRsZXIgZnVuY3Rpb24gYm91bmQgdG8gdGhlIHNpZ25hbC5cbiAgICAgICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX2xpc3RlbmVyID0gbGlzdGVuZXI7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIGJpbmRpbmcgc2hvdWxkIGJlIGV4ZWN1dGVkIGp1c3Qgb25jZS5cbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5faXNPbmNlID0gaXNPbmNlO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb250ZXh0IG9uIHdoaWNoIGxpc3RlbmVyIHdpbGwgYmUgZXhlY3V0ZWQgKG9iamVjdCB0aGF0IHNob3VsZCByZXByZXNlbnQgdGhlIGB0aGlzYCB2YXJpYWJsZSBpbnNpZGUgbGlzdGVuZXIgZnVuY3Rpb24pLlxuICAgICAgICAgKiBAbWVtYmVyT2YgU2lnbmFsQmluZGluZy5wcm90b3R5cGVcbiAgICAgICAgICogQG5hbWUgY29udGV4dFxuICAgICAgICAgKiBAdHlwZSBPYmplY3R8dW5kZWZpbmVkfG51bGxcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29udGV4dCA9IGxpc3RlbmVyQ29udGV4dDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVmZXJlbmNlIHRvIFNpZ25hbCBvYmplY3QgdGhhdCBsaXN0ZW5lciBpcyBjdXJyZW50bHkgYm91bmQgdG8uXG4gICAgICAgICAqIEB0eXBlIFNpZ25hbFxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fc2lnbmFsID0gc2lnbmFsO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMaXN0ZW5lciBwcmlvcml0eVxuICAgICAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX3ByaW9yaXR5ID0gcHJpb3JpdHkgfHwgMDtcbiAgICB9XG5cbiAgICBTaWduYWxCaW5kaW5nLnByb3RvdHlwZSA9IHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgYmluZGluZyBpcyBhY3RpdmUgYW5kIHNob3VsZCBiZSBleGVjdXRlZC5cbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKi9cbiAgICAgICAgYWN0aXZlIDogdHJ1ZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVmYXVsdCBwYXJhbWV0ZXJzIHBhc3NlZCB0byBsaXN0ZW5lciBkdXJpbmcgYFNpZ25hbC5kaXNwYXRjaGAgYW5kIGBTaWduYWxCaW5kaW5nLmV4ZWN1dGVgLiAoY3VycmllZCBwYXJhbWV0ZXJzKVxuICAgICAgICAgKiBAdHlwZSBBcnJheXxudWxsXG4gICAgICAgICAqL1xuICAgICAgICBwYXJhbXMgOiBudWxsLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDYWxsIGxpc3RlbmVyIHBhc3NpbmcgYXJiaXRyYXJ5IHBhcmFtZXRlcnMuXG4gICAgICAgICAqIDxwPklmIGJpbmRpbmcgd2FzIGFkZGVkIHVzaW5nIGBTaWduYWwuYWRkT25jZSgpYCBpdCB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZCBmcm9tIHNpZ25hbCBkaXNwYXRjaCBxdWV1ZSwgdGhpcyBtZXRob2QgaXMgdXNlZCBpbnRlcm5hbGx5IGZvciB0aGUgc2lnbmFsIGRpc3BhdGNoLjwvcD5cbiAgICAgICAgICogQHBhcmFtIHtBcnJheX0gW3BhcmFtc0Fycl0gQXJyYXkgb2YgcGFyYW1ldGVycyB0aGF0IHNob3VsZCBiZSBwYXNzZWQgdG8gdGhlIGxpc3RlbmVyXG4gICAgICAgICAqIEByZXR1cm4geyp9IFZhbHVlIHJldHVybmVkIGJ5IHRoZSBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGV4ZWN1dGUgOiBmdW5jdGlvbiAocGFyYW1zQXJyKSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlclJldHVybiwgcGFyYW1zO1xuICAgICAgICAgICAgaWYgKHRoaXMuYWN0aXZlICYmICEhdGhpcy5fbGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMgPSB0aGlzLnBhcmFtcz8gdGhpcy5wYXJhbXMuY29uY2F0KHBhcmFtc0FycikgOiBwYXJhbXNBcnI7XG4gICAgICAgICAgICAgICAgaGFuZGxlclJldHVybiA9IHRoaXMuX2xpc3RlbmVyLmFwcGx5KHRoaXMuY29udGV4dCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5faXNPbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXJSZXR1cm47XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERldGFjaCBiaW5kaW5nIGZyb20gc2lnbmFsLlxuICAgICAgICAgKiAtIGFsaWFzIHRvOiBteVNpZ25hbC5yZW1vdmUobXlCaW5kaW5nLmdldExpc3RlbmVyKCkpO1xuICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbnxudWxsfSBIYW5kbGVyIGZ1bmN0aW9uIGJvdW5kIHRvIHRoZSBzaWduYWwgb3IgYG51bGxgIGlmIGJpbmRpbmcgd2FzIHByZXZpb3VzbHkgZGV0YWNoZWQuXG4gICAgICAgICAqL1xuICAgICAgICBkZXRhY2ggOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc0JvdW5kKCk/IHRoaXMuX3NpZ25hbC5yZW1vdmUodGhpcy5fbGlzdGVuZXIsIHRoaXMuY29udGV4dCkgOiBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBgdHJ1ZWAgaWYgYmluZGluZyBpcyBzdGlsbCBib3VuZCB0byB0aGUgc2lnbmFsIGFuZCBoYXZlIGEgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBpc0JvdW5kIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICghIXRoaXMuX3NpZ25hbCAmJiAhIXRoaXMuX2xpc3RlbmVyKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7Ym9vbGVhbn0gSWYgU2lnbmFsQmluZGluZyB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgb25jZS5cbiAgICAgICAgICovXG4gICAgICAgIGlzT25jZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc09uY2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBIYW5kbGVyIGZ1bmN0aW9uIGJvdW5kIHRvIHRoZSBzaWduYWwuXG4gICAgICAgICAqL1xuICAgICAgICBnZXRMaXN0ZW5lciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9saXN0ZW5lcjtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7U2lnbmFsfSBTaWduYWwgdGhhdCBsaXN0ZW5lciBpcyBjdXJyZW50bHkgYm91bmQgdG8uXG4gICAgICAgICAqL1xuICAgICAgICBnZXRTaWduYWwgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2lnbmFsO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWxldGUgaW5zdGFuY2UgcHJvcGVydGllc1xuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX2Rlc3Ryb3kgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fc2lnbmFsO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2xpc3RlbmVyO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuY29udGV4dDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7c3RyaW5nfSBTdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgIHRvU3RyaW5nIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICdbU2lnbmFsQmluZGluZyBpc09uY2U6JyArIHRoaXMuX2lzT25jZSArJywgaXNCb3VuZDonKyB0aGlzLmlzQm91bmQoKSArJywgYWN0aXZlOicgKyB0aGlzLmFjdGl2ZSArICddJztcbiAgICAgICAgfVxuXG4gICAgfTtcblxuXG4vKmdsb2JhbCBTaWduYWxCaW5kaW5nOmZhbHNlKi9cblxuICAgIC8vIFNpZ25hbCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgZnVuY3Rpb24gdmFsaWRhdGVMaXN0ZW5lcihsaXN0ZW5lciwgZm5OYW1lKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ2xpc3RlbmVyIGlzIGEgcmVxdWlyZWQgcGFyYW0gb2Yge2ZufSgpIGFuZCBzaG91bGQgYmUgYSBGdW5jdGlvbi4nLnJlcGxhY2UoJ3tmbn0nLCBmbk5hbWUpICk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gZXZlbnQgYnJvYWRjYXN0ZXJcbiAgICAgKiA8YnIgLz4tIGluc3BpcmVkIGJ5IFJvYmVydCBQZW5uZXIncyBBUzMgU2lnbmFscy5cbiAgICAgKiBAbmFtZSBTaWduYWxcbiAgICAgKiBAYXV0aG9yIE1pbGxlciBNZWRlaXJvc1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFNpZ25hbCgpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEB0eXBlIEFycmF5LjxTaWduYWxCaW5kaW5nPlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fYmluZGluZ3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcHJldlBhcmFtcyA9IG51bGw7XG5cbiAgICAgICAgLy8gZW5mb3JjZSBkaXNwYXRjaCB0byBhd2F5cyB3b3JrIG9uIHNhbWUgY29udGV4dCAoIzQ3KVxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2ggPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgU2lnbmFsLnByb3RvdHlwZS5kaXNwYXRjaC5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIFNpZ25hbC5wcm90b3R5cGUgPSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNpZ25hbHMgVmVyc2lvbiBOdW1iZXJcbiAgICAgICAgICogQHR5cGUgU3RyaW5nXG4gICAgICAgICAqIEBjb25zdFxuICAgICAgICAgKi9cbiAgICAgICAgVkVSU0lPTiA6ICcxLjAuMCcsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIFNpZ25hbCBzaG91bGQga2VlcCByZWNvcmQgb2YgcHJldmlvdXNseSBkaXNwYXRjaGVkIHBhcmFtZXRlcnMgYW5kXG4gICAgICAgICAqIGF1dG9tYXRpY2FsbHkgZXhlY3V0ZSBsaXN0ZW5lciBkdXJpbmcgYGFkZCgpYC9gYWRkT25jZSgpYCBpZiBTaWduYWwgd2FzXG4gICAgICAgICAqIGFscmVhZHkgZGlzcGF0Y2hlZCBiZWZvcmUuXG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICovXG4gICAgICAgIG1lbW9yaXplIDogZmFsc2UsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9zaG91bGRQcm9wYWdhdGUgOiB0cnVlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiBTaWduYWwgaXMgYWN0aXZlIGFuZCBzaG91bGQgYnJvYWRjYXN0IGV2ZW50cy5cbiAgICAgICAgICogPHA+PHN0cm9uZz5JTVBPUlRBTlQ6PC9zdHJvbmc+IFNldHRpbmcgdGhpcyBwcm9wZXJ0eSBkdXJpbmcgYSBkaXNwYXRjaCB3aWxsIG9ubHkgYWZmZWN0IHRoZSBuZXh0IGRpc3BhdGNoLCBpZiB5b3Ugd2FudCB0byBzdG9wIHRoZSBwcm9wYWdhdGlvbiBvZiBhIHNpZ25hbCB1c2UgYGhhbHQoKWAgaW5zdGVhZC48L3A+XG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICovXG4gICAgICAgIGFjdGl2ZSA6IHRydWUsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNPbmNlXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbbGlzdGVuZXJDb250ZXh0XVxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ByaW9yaXR5XVxuICAgICAgICAgKiBAcmV0dXJuIHtTaWduYWxCaW5kaW5nfVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX3JlZ2lzdGVyTGlzdGVuZXIgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGlzT25jZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSkge1xuXG4gICAgICAgICAgICB2YXIgcHJldkluZGV4ID0gdGhpcy5faW5kZXhPZkxpc3RlbmVyKGxpc3RlbmVyLCBsaXN0ZW5lckNvbnRleHQpLFxuICAgICAgICAgICAgICAgIGJpbmRpbmc7XG5cbiAgICAgICAgICAgIGlmIChwcmV2SW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgYmluZGluZyA9IHRoaXMuX2JpbmRpbmdzW3ByZXZJbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKGJpbmRpbmcuaXNPbmNlKCkgIT09IGlzT25jZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBjYW5ub3QgYWRkJysgKGlzT25jZT8gJycgOiAnT25jZScpICsnKCkgdGhlbiBhZGQnKyAoIWlzT25jZT8gJycgOiAnT25jZScpICsnKCkgdGhlIHNhbWUgbGlzdGVuZXIgd2l0aG91dCByZW1vdmluZyB0aGUgcmVsYXRpb25zaGlwIGZpcnN0LicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYmluZGluZyA9IG5ldyBTaWduYWxCaW5kaW5nKHRoaXMsIGxpc3RlbmVyLCBpc09uY2UsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2FkZEJpbmRpbmcoYmluZGluZyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHRoaXMubWVtb3JpemUgJiYgdGhpcy5fcHJldlBhcmFtcyl7XG4gICAgICAgICAgICAgICAgYmluZGluZy5leGVjdXRlKHRoaXMuX3ByZXZQYXJhbXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gYmluZGluZztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtTaWduYWxCaW5kaW5nfSBiaW5kaW5nXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfYWRkQmluZGluZyA6IGZ1bmN0aW9uIChiaW5kaW5nKSB7XG4gICAgICAgICAgICAvL3NpbXBsaWZpZWQgaW5zZXJ0aW9uIHNvcnRcbiAgICAgICAgICAgIHZhciBuID0gdGhpcy5fYmluZGluZ3MubGVuZ3RoO1xuICAgICAgICAgICAgZG8geyAtLW47IH0gd2hpbGUgKHRoaXMuX2JpbmRpbmdzW25dICYmIGJpbmRpbmcuX3ByaW9yaXR5IDw9IHRoaXMuX2JpbmRpbmdzW25dLl9wcmlvcml0eSk7XG4gICAgICAgICAgICB0aGlzLl9iaW5kaW5ncy5zcGxpY2UobiArIDEsIDAsIGJpbmRpbmcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgICAgICAgKiBAcmV0dXJuIHtudW1iZXJ9XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfaW5kZXhPZkxpc3RlbmVyIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgbiA9IHRoaXMuX2JpbmRpbmdzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBjdXI7XG4gICAgICAgICAgICB3aGlsZSAobi0tKSB7XG4gICAgICAgICAgICAgICAgY3VyID0gdGhpcy5fYmluZGluZ3Nbbl07XG4gICAgICAgICAgICAgICAgaWYgKGN1ci5fbGlzdGVuZXIgPT09IGxpc3RlbmVyICYmIGN1ci5jb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2hlY2sgaWYgbGlzdGVuZXIgd2FzIGF0dGFjaGVkIHRvIFNpZ25hbC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXJcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtjb250ZXh0XVxuICAgICAgICAgKiBAcmV0dXJuIHtib29sZWFufSBpZiBTaWduYWwgaGFzIHRoZSBzcGVjaWZpZWQgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBoYXMgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pbmRleE9mTGlzdGVuZXIobGlzdGVuZXIsIGNvbnRleHQpICE9PSAtMTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkIGEgbGlzdGVuZXIgdG8gdGhlIHNpZ25hbC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgU2lnbmFsIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbbGlzdGVuZXJDb250ZXh0XSBDb250ZXh0IG9uIHdoaWNoIGxpc3RlbmVyIHdpbGwgYmUgZXhlY3V0ZWQgKG9iamVjdCB0aGF0IHNob3VsZCByZXByZXNlbnQgdGhlIGB0aGlzYCB2YXJpYWJsZSBpbnNpZGUgbGlzdGVuZXIgZnVuY3Rpb24pLlxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ByaW9yaXR5XSBUaGUgcHJpb3JpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50IGxpc3RlbmVyLiBMaXN0ZW5lcnMgd2l0aCBoaWdoZXIgcHJpb3JpdHkgd2lsbCBiZSBleGVjdXRlZCBiZWZvcmUgbGlzdGVuZXJzIHdpdGggbG93ZXIgcHJpb3JpdHkuIExpc3RlbmVycyB3aXRoIHNhbWUgcHJpb3JpdHkgbGV2ZWwgd2lsbCBiZSBleGVjdXRlZCBhdCB0aGUgc2FtZSBvcmRlciBhcyB0aGV5IHdlcmUgYWRkZWQuIChkZWZhdWx0ID0gMClcbiAgICAgICAgICogQHJldHVybiB7U2lnbmFsQmluZGluZ30gQW4gT2JqZWN0IHJlcHJlc2VudGluZyB0aGUgYmluZGluZyBiZXR3ZWVuIHRoZSBTaWduYWwgYW5kIGxpc3RlbmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgYWRkIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KSB7XG4gICAgICAgICAgICB2YWxpZGF0ZUxpc3RlbmVyKGxpc3RlbmVyLCAnYWRkJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcmVnaXN0ZXJMaXN0ZW5lcihsaXN0ZW5lciwgZmFsc2UsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGQgbGlzdGVuZXIgdG8gdGhlIHNpZ25hbCB0aGF0IHNob3VsZCBiZSByZW1vdmVkIGFmdGVyIGZpcnN0IGV4ZWN1dGlvbiAod2lsbCBiZSBleGVjdXRlZCBvbmx5IG9uY2UpLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBTaWduYWwgaGFuZGxlciBmdW5jdGlvbi5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtsaXN0ZW5lckNvbnRleHRdIENvbnRleHQgb24gd2hpY2ggbGlzdGVuZXIgd2lsbCBiZSBleGVjdXRlZCAob2JqZWN0IHRoYXQgc2hvdWxkIHJlcHJlc2VudCB0aGUgYHRoaXNgIHZhcmlhYmxlIGluc2lkZSBsaXN0ZW5lciBmdW5jdGlvbikuXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbcHJpb3JpdHldIFRoZSBwcmlvcml0eSBsZXZlbCBvZiB0aGUgZXZlbnQgbGlzdGVuZXIuIExpc3RlbmVycyB3aXRoIGhpZ2hlciBwcmlvcml0eSB3aWxsIGJlIGV4ZWN1dGVkIGJlZm9yZSBsaXN0ZW5lcnMgd2l0aCBsb3dlciBwcmlvcml0eS4gTGlzdGVuZXJzIHdpdGggc2FtZSBwcmlvcml0eSBsZXZlbCB3aWxsIGJlIGV4ZWN1dGVkIGF0IHRoZSBzYW1lIG9yZGVyIGFzIHRoZXkgd2VyZSBhZGRlZC4gKGRlZmF1bHQgPSAwKVxuICAgICAgICAgKiBAcmV0dXJuIHtTaWduYWxCaW5kaW5nfSBBbiBPYmplY3QgcmVwcmVzZW50aW5nIHRoZSBiaW5kaW5nIGJldHdlZW4gdGhlIFNpZ25hbCBhbmQgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBhZGRPbmNlIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KSB7XG4gICAgICAgICAgICB2YWxpZGF0ZUxpc3RlbmVyKGxpc3RlbmVyLCAnYWRkT25jZScpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlZ2lzdGVyTGlzdGVuZXIobGlzdGVuZXIsIHRydWUsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmUgYSBzaW5nbGUgbGlzdGVuZXIgZnJvbSB0aGUgZGlzcGF0Y2ggcXVldWUuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIEhhbmRsZXIgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgcmVtb3ZlZC5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtjb250ZXh0XSBFeGVjdXRpb24gY29udGV4dCAoc2luY2UgeW91IGNhbiBhZGQgdGhlIHNhbWUgaGFuZGxlciBtdWx0aXBsZSB0aW1lcyBpZiBleGVjdXRpbmcgaW4gYSBkaWZmZXJlbnQgY29udGV4dCkuXG4gICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBMaXN0ZW5lciBoYW5kbGVyIGZ1bmN0aW9uLlxuICAgICAgICAgKi9cbiAgICAgICAgcmVtb3ZlIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICB2YWxpZGF0ZUxpc3RlbmVyKGxpc3RlbmVyLCAncmVtb3ZlJyk7XG5cbiAgICAgICAgICAgIHZhciBpID0gdGhpcy5faW5kZXhPZkxpc3RlbmVyKGxpc3RlbmVyLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmIChpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzW2ldLl9kZXN0cm95KCk7IC8vbm8gcmVhc29uIHRvIGEgU2lnbmFsQmluZGluZyBleGlzdCBpZiBpdCBpc24ndCBhdHRhY2hlZCB0byBhIHNpZ25hbFxuICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBsaXN0ZW5lcjtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZnJvbSB0aGUgU2lnbmFsLlxuICAgICAgICAgKi9cbiAgICAgICAgcmVtb3ZlQWxsIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG4gPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAobi0tKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZGluZ3Nbbl0uX2Rlc3Ryb3koKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzLmxlbmd0aCA9IDA7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge251bWJlcn0gTnVtYmVyIG9mIGxpc3RlbmVycyBhdHRhY2hlZCB0byB0aGUgU2lnbmFsLlxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0TnVtTGlzdGVuZXJzIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2JpbmRpbmdzLmxlbmd0aDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcCBwcm9wYWdhdGlvbiBvZiB0aGUgZXZlbnQsIGJsb2NraW5nIHRoZSBkaXNwYXRjaCB0byBuZXh0IGxpc3RlbmVycyBvbiB0aGUgcXVldWUuXG4gICAgICAgICAqIDxwPjxzdHJvbmc+SU1QT1JUQU5UOjwvc3Ryb25nPiBzaG91bGQgYmUgY2FsbGVkIG9ubHkgZHVyaW5nIHNpZ25hbCBkaXNwYXRjaCwgY2FsbGluZyBpdCBiZWZvcmUvYWZ0ZXIgZGlzcGF0Y2ggd29uJ3QgYWZmZWN0IHNpZ25hbCBicm9hZGNhc3QuPC9wPlxuICAgICAgICAgKiBAc2VlIFNpZ25hbC5wcm90b3R5cGUuZGlzYWJsZVxuICAgICAgICAgKi9cbiAgICAgICAgaGFsdCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3VsZFByb3BhZ2F0ZSA9IGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEaXNwYXRjaC9Ccm9hZGNhc3QgU2lnbmFsIHRvIGFsbCBsaXN0ZW5lcnMgYWRkZWQgdG8gdGhlIHF1ZXVlLlxuICAgICAgICAgKiBAcGFyYW0gey4uLip9IFtwYXJhbXNdIFBhcmFtZXRlcnMgdGhhdCBzaG91bGQgYmUgcGFzc2VkIHRvIGVhY2ggaGFuZGxlci5cbiAgICAgICAgICovXG4gICAgICAgIGRpc3BhdGNoIDogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgaWYgKCEgdGhpcy5hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwYXJhbXNBcnIgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLFxuICAgICAgICAgICAgICAgIG4gPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgYmluZGluZ3M7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLm1lbW9yaXplKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJldlBhcmFtcyA9IHBhcmFtc0FycjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCEgbikge1xuICAgICAgICAgICAgICAgIC8vc2hvdWxkIGNvbWUgYWZ0ZXIgbWVtb3JpemVcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJpbmRpbmdzID0gdGhpcy5fYmluZGluZ3Muc2xpY2UoKTsgLy9jbG9uZSBhcnJheSBpbiBjYXNlIGFkZC9yZW1vdmUgaXRlbXMgZHVyaW5nIGRpc3BhdGNoXG4gICAgICAgICAgICB0aGlzLl9zaG91bGRQcm9wYWdhdGUgPSB0cnVlOyAvL2luIGNhc2UgYGhhbHRgIHdhcyBjYWxsZWQgYmVmb3JlIGRpc3BhdGNoIG9yIGR1cmluZyB0aGUgcHJldmlvdXMgZGlzcGF0Y2guXG5cbiAgICAgICAgICAgIC8vZXhlY3V0ZSBhbGwgY2FsbGJhY2tzIHVudGlsIGVuZCBvZiB0aGUgbGlzdCBvciB1bnRpbCBhIGNhbGxiYWNrIHJldHVybnMgYGZhbHNlYCBvciBzdG9wcyBwcm9wYWdhdGlvblxuICAgICAgICAgICAgLy9yZXZlcnNlIGxvb3Agc2luY2UgbGlzdGVuZXJzIHdpdGggaGlnaGVyIHByaW9yaXR5IHdpbGwgYmUgYWRkZWQgYXQgdGhlIGVuZCBvZiB0aGUgbGlzdFxuICAgICAgICAgICAgZG8geyBuLS07IH0gd2hpbGUgKGJpbmRpbmdzW25dICYmIHRoaXMuX3Nob3VsZFByb3BhZ2F0ZSAmJiBiaW5kaW5nc1tuXS5leGVjdXRlKHBhcmFtc0FycikgIT09IGZhbHNlKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRm9yZ2V0IG1lbW9yaXplZCBhcmd1bWVudHMuXG4gICAgICAgICAqIEBzZWUgU2lnbmFsLm1lbW9yaXplXG4gICAgICAgICAqL1xuICAgICAgICBmb3JnZXQgOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5fcHJldlBhcmFtcyA9IG51bGw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZSBhbGwgYmluZGluZ3MgZnJvbSBzaWduYWwgYW5kIGRlc3Ryb3kgYW55IHJlZmVyZW5jZSB0byBleHRlcm5hbCBvYmplY3RzIChkZXN0cm95IFNpZ25hbCBvYmplY3QpLlxuICAgICAgICAgKiA8cD48c3Ryb25nPklNUE9SVEFOVDo8L3N0cm9uZz4gY2FsbGluZyBhbnkgbWV0aG9kIG9uIHRoZSBzaWduYWwgaW5zdGFuY2UgYWZ0ZXIgY2FsbGluZyBkaXNwb3NlIHdpbGwgdGhyb3cgZXJyb3JzLjwvcD5cbiAgICAgICAgICovXG4gICAgICAgIGRpc3Bvc2UgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUFsbCgpO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JpbmRpbmdzO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3ByZXZQYXJhbXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gU3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICB0b1N0cmluZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAnW1NpZ25hbCBhY3RpdmU6JysgdGhpcy5hY3RpdmUgKycgbnVtTGlzdGVuZXJzOicrIHRoaXMuZ2V0TnVtTGlzdGVuZXJzKCkgKyddJztcbiAgICAgICAgfVxuXG4gICAgfTtcblxuXG4gICAgLy8gTmFtZXNwYWNlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBTaWduYWxzIG5hbWVzcGFjZVxuICAgICAqIEBuYW1lc3BhY2VcbiAgICAgKiBAbmFtZSBzaWduYWxzXG4gICAgICovXG4gICAgdmFyIHNpZ25hbHMgPSBTaWduYWw7XG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gZXZlbnQgYnJvYWRjYXN0ZXJcbiAgICAgKiBAc2VlIFNpZ25hbFxuICAgICAqL1xuICAgIC8vIGFsaWFzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSAoc2VlICNnaC00NClcbiAgICBzaWduYWxzLlNpZ25hbCA9IFNpZ25hbDtcblxuXG5cbiAgICAvL2V4cG9ydHMgdG8gbXVsdGlwbGUgZW52aXJvbm1lbnRzXG4gICAgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKXsgLy9BTURcbiAgICAgICAgZGVmaW5lKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHNpZ25hbHM7IH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpeyAvL25vZGVcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBzaWduYWxzO1xuICAgIH0gZWxzZSB7IC8vYnJvd3NlclxuICAgICAgICAvL3VzZSBzdHJpbmcgYmVjYXVzZSBvZiBHb29nbGUgY2xvc3VyZSBjb21waWxlciBBRFZBTkNFRF9NT0RFXG4gICAgICAgIC8qanNsaW50IHN1Yjp0cnVlICovXG4gICAgICAgIGdsb2JhbFsnc2lnbmFscyddID0gc2lnbmFscztcbiAgICB9XG5cbn0odGhpcykpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc2lnbmFscyA9IHJlcXVpcmUoJ3NpZ25hbHMnKTtcblxuZnVuY3Rpb24gTG9hZGVyKHVybCkge1xuICAgIHZhciBvblByb2dyZXNzID0gbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgICAgIG9uQmVmb3JlQ29tcGxldGUgPSBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICAgICAgb25Db21wbGV0ZSA9IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgICAgICBvbkVycm9yID0gbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgICAgIHByb2dyZXNzID0gMCxcbiAgICAgICAgYXVkaW9Db250ZXh0LFxuICAgICAgICBpc1RvdWNoTG9ja2VkLFxuICAgICAgICByZXF1ZXN0LFxuICAgICAgICBkYXRhO1xuXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKGF1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgbG9hZEFycmF5QnVmZmVyKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2FkQXVkaW9FbGVtZW50KCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGxvYWRBcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHJlcXVlc3Qub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICByZXF1ZXN0Lm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgaWYgKGV2ZW50Lmxlbmd0aENvbXB1dGFibGUpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IGV2ZW50LmxvYWRlZCAvIGV2ZW50LnRvdGFsO1xuICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3MuZGlzcGF0Y2gocHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgYXVkaW9Db250ZXh0LmRlY29kZUF1ZGlvRGF0YShcbiAgICAgICAgICAgICAgICByZXF1ZXN0LnJlc3BvbnNlLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gYnVmZmVyO1xuICAgICAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IDE7XG4gICAgICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3MuZGlzcGF0Y2goMSk7XG4gICAgICAgICAgICAgICAgICAgIG9uQmVmb3JlQ29tcGxldGUuZGlzcGF0Y2goYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgb25Db21wbGV0ZS5kaXNwYXRjaChidWZmZXIpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yLmRpc3BhdGNoKGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIG9uRXJyb3IuZGlzcGF0Y2goZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH07XG5cbiAgICB2YXIgbG9hZEF1ZGlvRWxlbWVudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBkYXRhID0gbmV3IEF1ZGlvKCk7XG4gICAgICAgIGRhdGEubmFtZSA9IHVybDtcbiAgICAgICAgZGF0YS5wcmVsb2FkID0gJ2F1dG8nO1xuICAgICAgICBkYXRhLnNyYyA9IHVybDtcblxuICAgICAgICBpZiAoISFpc1RvdWNoTG9ja2VkKSB7XG4gICAgICAgICAgICBvblByb2dyZXNzLmRpc3BhdGNoKDEpO1xuICAgICAgICAgICAgb25CZWZvcmVDb21wbGV0ZS5kaXNwYXRjaChkYXRhKTtcbiAgICAgICAgICAgIG9uQ29tcGxldGUuZGlzcGF0Y2goZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdGltZW91dDtcbiAgICAgICAgICAgIHZhciByZWFkeUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgcmVhZHlIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHByb2dyZXNzID0gMTtcbiAgICAgICAgICAgICAgICBvblByb2dyZXNzLmRpc3BhdGNoKDEpO1xuICAgICAgICAgICAgICAgIG9uQmVmb3JlQ29tcGxldGUuZGlzcGF0Y2goZGF0YSk7XG4gICAgICAgICAgICAgICAgb25Db21wbGV0ZS5kaXNwYXRjaChkYXRhKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyB0aW1lb3V0IGJlY2F1c2Ugc29tZXRpbWVzIGNhbnBsYXl0aHJvdWdoIGRvZXNuJ3QgZmlyZVxuICAgICAgICAgICAgdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KHJlYWR5SGFuZGxlciwgNDAwMCk7XG4gICAgICAgICAgICBkYXRhLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgcmVhZHlIYW5kbGVyLCBmYWxzZSk7XG4gICAgICAgICAgICBkYXRhLm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICBvbkVycm9yLmRpc3BhdGNoKGUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRhdGEubG9hZCgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBjYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmKHJlcXVlc3QgJiYgcmVxdWVzdC5yZWFkeVN0YXRlICE9PSA0KSB7XG4gICAgICAgICAgcmVxdWVzdC5hYm9ydCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgYXBpID0ge1xuICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgIGNhbmNlbDogY2FuY2VsLFxuICAgICAgICBvblByb2dyZXNzOiBvblByb2dyZXNzLFxuICAgICAgICBvbkNvbXBsZXRlOiBvbkNvbXBsZXRlLFxuICAgICAgICBvbkJlZm9yZUNvbXBsZXRlOiBvbkJlZm9yZUNvbXBsZXRlLFxuICAgICAgICBvbkVycm9yOiBvbkVycm9yXG4gICAgfTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhcGksICdkYXRhJywge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhcGksICdwcm9ncmVzcycsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9ncmVzcztcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGFwaSwgJ2F1ZGlvQ29udGV4dCcsIHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgYXVkaW9Db250ZXh0ID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhcGksICdpc1RvdWNoTG9ja2VkJywge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBpc1RvdWNoTG9ja2VkID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKGFwaSk7XG59XG5cbkxvYWRlci5Hcm91cCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBxdWV1ZSA9IFtdLFxuICAgICAgICBudW1Mb2FkZWQgPSAwLFxuICAgICAgICBudW1Ub3RhbCA9IDAsXG4gICAgICAgIG9uQ29tcGxldGUgPSBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICAgICAgb25Qcm9ncmVzcyA9IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgICAgICBvbkVycm9yID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG5cbiAgICB2YXIgYWRkID0gZnVuY3Rpb24obG9hZGVyKSB7XG4gICAgICAgIHF1ZXVlLnB1c2gobG9hZGVyKTtcbiAgICAgICAgbnVtVG90YWwrKztcbiAgICAgICAgcmV0dXJuIGxvYWRlcjtcbiAgICB9O1xuXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIG51bVRvdGFsID0gcXVldWUubGVuZ3RoO1xuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIHZhciBuZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgb25Db21wbGV0ZS5kaXNwYXRjaCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxvYWRlciA9IHF1ZXVlLnBvcCgpO1xuICAgICAgICBsb2FkZXIub25Qcm9ncmVzcy5hZGQocHJvZ3Jlc3NIYW5kbGVyKTtcbiAgICAgICAgbG9hZGVyLm9uQmVmb3JlQ29tcGxldGUuYWRkT25jZShjb21wbGV0ZUhhbmRsZXIpO1xuICAgICAgICBsb2FkZXIub25FcnJvci5hZGRPbmNlKGVycm9ySGFuZGxlcik7XG4gICAgICAgIGxvYWRlci5zdGFydCgpO1xuICAgIH07XG5cbiAgICB2YXIgcHJvZ3Jlc3NIYW5kbGVyID0gZnVuY3Rpb24ocHJvZ3Jlc3MpIHtcbiAgICAgICAgdmFyIG51bUxvYWRlZCA9IG51bUxvYWRlZCArIHByb2dyZXNzO1xuICAgICAgICBpZihvblByb2dyZXNzLmdldE51bUxpc3RlbmVycygpID4gMCkge1xuICAgICAgICAgICAgb25Qcm9ncmVzcy5kaXNwYXRjaChudW1Mb2FkZWQgLyBudW1Ub3RhbCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNvbXBsZXRlSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBudW1Mb2FkZWQrKztcbiAgICAgICAgaWYob25Qcm9ncmVzcy5nZXROdW1MaXN0ZW5lcnMoKSA+IDApIHtcbiAgICAgICAgICAgIG9uUHJvZ3Jlc3MuZGlzcGF0Y2gobnVtTG9hZGVkIC8gbnVtVG90YWwpO1xuICAgICAgICB9XG4gICAgICAgIG5leHQoKTtcbiAgICB9O1xuXG4gICAgdmFyIGVycm9ySGFuZGxlciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgb25FcnJvci5kaXNwYXRjaChlKTtcbiAgICAgICAgbmV4dCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgIGFkZDogYWRkLFxuICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgIG9uUHJvZ3Jlc3M6IG9uUHJvZ3Jlc3MsXG4gICAgICAgIG9uQ29tcGxldGU6IG9uQ29tcGxldGUsXG4gICAgICAgIG9uRXJyb3I6IG9uRXJyb3JcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTG9hZGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQW5hbHlzZXIgPSByZXF1aXJlKCcuL25vZGUvYW5hbHlzZXIuanMnKSxcbiAgICBEaXN0b3J0aW9uID0gcmVxdWlyZSgnLi9ub2RlL2Rpc3RvcnRpb24uanMnKSxcbiAgICBFY2hvID0gcmVxdWlyZSgnLi9ub2RlL2VjaG8uanMnKSxcbiAgICBGaWx0ZXIgPSByZXF1aXJlKCcuL25vZGUvZmlsdGVyLmpzJyksXG4gICAgUGFubmVyID0gcmVxdWlyZSgnLi9ub2RlL3Bhbm5lci5qcycpLFxuICAgIFBoYXNlciA9IHJlcXVpcmUoJy4vbm9kZS9waGFzZXIuanMnKSxcbiAgICBSZWNvcmRlciA9IHJlcXVpcmUoJy4vbm9kZS9yZWNvcmRlci5qcycpLFxuICAgIFJldmVyYiA9IHJlcXVpcmUoJy4vbm9kZS9yZXZlcmIuanMnKTtcblxuZnVuY3Rpb24gTm9kZU1hbmFnZXIoY29udGV4dCkge1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0IHx8IHRoaXMuY3JlYXRlRmFrZUNvbnRleHQoKTtcbiAgICB0aGlzLl9kZXN0aW5hdGlvbiA9IG51bGw7XG4gICAgdGhpcy5fbm9kZUxpc3QgPSBbXTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbn1cblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdOb2RlTWFuYWdlci5hZGQ6Jywgbm9kZSk7XG4gICAgdGhpcy5fbm9kZUxpc3QucHVzaChub2RlKTtcbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihub2RlID09PSB0aGlzLl9ub2RlTGlzdFtpXSkge1xuICAgICAgICAgICAgdGhpcy5fbm9kZUxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciBvdXQgPSBub2RlLl9vdXQgfHwgbm9kZTtcbiAgICBvdXQuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuX3VwZGF0ZUNvbm5lY3Rpb25zKCk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUucmVtb3ZlQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgd2hpbGUodGhpcy5fbm9kZUxpc3QubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX25vZGVMaXN0LnBvcCgpLmRpc2Nvbm5lY3QoKTtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlQ29ubmVjdGlvbnMoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5fY29ubmVjdCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICB2YXIgb3V0ID0gYS5fb3V0IHx8IGE7XG4gICAgb3V0LmRpc2Nvbm5lY3QoKTtcbiAgICBvdXQuY29ubmVjdChiLl9pbiB8fCBiKTtcbiAgICBpZih0eXBlb2YgYS5fY29ubmVjdGVkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGEuX2Nvbm5lY3RlZC5jYWxsKGEpO1xuICAgIH1cbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5fY29ubmVjdFRvID0gZnVuY3Rpb24oZGVzdGluYXRpb24pIHtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aCxcbiAgICAgICAgbGFzdE5vZGUgPSBsID8gdGhpcy5fbm9kZUxpc3RbbCAtIDFdIDogdGhpcy5fc291cmNlTm9kZTtcbiAgICBpZihsYXN0Tm9kZSkge1xuICAgICAgICB0aGlzLl9jb25uZWN0KGxhc3ROb2RlLCBkZXN0aW5hdGlvbik7XG4gICAgfVxuICAgIHRoaXMuX2Rlc3RpbmF0aW9uID0gZGVzdGluYXRpb247XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuX3VwZGF0ZUNvbm5lY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKCdfdXBkYXRlQ29ubmVjdGlvbnMnKTtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aCxcbiAgICAgICAgbjtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBuID0gdGhpcy5fbm9kZUxpc3RbaV07XG4gICAgICAgIGlmKGkgPT09IDApIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJyAtIGNvbm5lY3Qgc291cmNlIHRvIG5vZGU6Jywgbik7XG4gICAgICAgICAgICB0aGlzLl9jb25uZWN0KHRoaXMuX3NvdXJjZU5vZGUsIG4pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnY29ubmVjdDonLCBwcmV2LCAndG8nLCBuKTtcbiAgICAgICAgICAgIHZhciBwcmV2ID0gdGhpcy5fbm9kZUxpc3RbaS0xXTtcbiAgICAgICAgICAgIHRoaXMuX2Nvbm5lY3QocHJldiwgbik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYodGhpcy5fZGVzdGluYXRpb24pIHtcbiAgICAgICAgdGhpcy5fY29ubmVjdFRvKHRoaXMuX2Rlc3RpbmF0aW9uKTtcbiAgICB9XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTm9kZU1hbmFnZXIucHJvdG90eXBlLCAncGFubmluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fcGFubmluZykge1xuICAgICAgICAgICAgdGhpcy5fcGFubmluZyA9IG5ldyBQYW5uZXIodGhpcy5fY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Bhbm5pbmc7XG4gICAgfVxufSk7XG5cbi8vIG9yIHNldHRlciBmb3IgZGVzdGluYXRpb24/XG4vKk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5fY29ubmVjdFRvID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoO1xuICAgIGlmKGwgPiAwKSB7XG4gICAgICBjb25zb2xlLmxvZygnY29ubmVjdDonLCB0aGlzLl9ub2RlTGlzdFtsIC0gMV0sICd0bycsIG5vZGUpO1xuICAgICAgICB0aGlzLl9ub2RlTGlzdFtsIC0gMV0uZGlzY29ubmVjdCgpO1xuICAgICAgICB0aGlzLl9ub2RlTGlzdFtsIC0gMV0uY29ubmVjdChub2RlKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCcgeCBjb25uZWN0IHNvdXJjZSB0byBub2RlOicsIG5vZGUpO1xuICAgICAgICB0aGlzLl9nYWluLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgdGhpcy5fZ2Fpbi5jb25uZWN0KG5vZGUpO1xuICAgIH1cbiAgICB0aGlzLl9kZXN0aW5hdGlvbiA9IG5vZGU7XG59OyovXG5cbi8vIHNob3VsZCBzb3VyY2UgYmUgaXRlbSAwIGluIG5vZGVsaXN0IGFuZCBkZXNpbmF0aW9uIGxhc3Rcbi8vIHByb2IgaXMgYWRkTm9kZSBuZWVkcyB0byBhZGQgYmVmb3JlIGRlc3RpbmF0aW9uXG4vLyArIHNob3VsZCBpdCBiZSBjYWxsZWQgY2hhaW4gb3Igc29tZXRoaW5nIG5pY2VyP1xuLy8gZmVlbHMgbGlrZSBub2RlIGxpc3QgY291bGQgYmUgYSBsaW5rZWQgbGlzdD8/XG4vLyBpZiBsaXN0Lmxhc3QgaXMgZGVzdGluYXRpb24gYWRkYmVmb3JlXG5cbi8qTm9kZU1hbmFnZXIucHJvdG90eXBlLl91cGRhdGVDb25uZWN0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGwgPSB0aGlzLl9ub2RlTGlzdC5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRoaXMuX25vZGVMaXN0W2ktMV0uY29ubmVjdCh0aGlzLl9ub2RlTGlzdFtpXSk7XG4gICAgfVxufTsqL1xuLypOb2RlTWFuYWdlci5wcm90b3R5cGUuX3VwZGF0ZUNvbm5lY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygnX3VwZGF0ZUNvbm5lY3Rpb25zJyk7XG4gICAgdGhpcy5fc291cmNlTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5fc291cmNlTm9kZS5jb25uZWN0KHRoaXMuX2dhaW4pO1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYoaSA9PT0gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJyAtIGNvbm5lY3Qgc291cmNlIHRvIG5vZGU6JywgdGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICAgICAgdGhpcy5fZ2Fpbi5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICB0aGlzLl9nYWluLmNvbm5lY3QodGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3Q6JywgdGhpcy5fbm9kZUxpc3RbaS0xXSwgJ3RvJywgdGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICAgICAgdGhpcy5fbm9kZUxpc3RbaS0xXS5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICB0aGlzLl9ub2RlTGlzdFtpLTFdLmNvbm5lY3QodGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMuX2Nvbm5lY3RUbyh0aGlzLl9jb250ZXh0LmRlc3RpbmF0aW9uKTtcbn07Ki9cblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmFuYWx5c2VyID0gZnVuY3Rpb24oZmZ0U2l6ZSwgc21vb3RoaW5nLCBtaW5EZWNpYmVscywgbWF4RGVjaWJlbHMpIHtcbiAgICB2YXIgYW5hbHlzZXIgPSBuZXcgQW5hbHlzZXIodGhpcy5fY29udGV4dCwgZmZ0U2l6ZSwgc21vb3RoaW5nLCBtaW5EZWNpYmVscywgbWF4RGVjaWJlbHMpO1xuICAgIHJldHVybiB0aGlzLmFkZChhbmFseXNlcik7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuY29tcHJlc3NvciA9IGZ1bmN0aW9uKHRocmVzaG9sZCwga25lZSwgcmF0aW8sIHJlZHVjdGlvbiwgYXR0YWNrLCByZWxlYXNlKSB7XG4gICAgLy8gbG93ZXJzIHRoZSB2b2x1bWUgb2YgdGhlIGxvdWRlc3QgcGFydHMgb2YgdGhlIHNpZ25hbCBhbmQgcmFpc2VzIHRoZSB2b2x1bWUgb2YgdGhlIHNvZnRlc3QgcGFydHNcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlRHluYW1pY3NDb21wcmVzc29yKCk7XG4gICAgLy8gbWluIGRlY2liZWxzIHRvIHN0YXJ0IGNvbXByZXNzaW5nIGF0IGZyb20gLTEwMCB0byAwXG4gICAgbm9kZS50aHJlc2hvbGQudmFsdWUgPSB0aHJlc2hvbGQgIT09IHVuZGVmaW5lZCA/IHRocmVzaG9sZCA6IC0yNDtcbiAgICAvLyBkZWNpYmVsIHZhbHVlIHRvIHN0YXJ0IGN1cnZlIHRvIGNvbXByZXNzZWQgdmFsdWUgZnJvbSAwIHRvIDQwXG4gICAgbm9kZS5rbmVlLnZhbHVlID0ga25lZSAhPT0gdW5kZWZpbmVkID8ga25lZSA6IDMwO1xuICAgIC8vIGFtb3VudCBvZiBjaGFuZ2UgcGVyIGRlY2liZWwgZnJvbSAxIHRvIDIwXG4gICAgbm9kZS5yYXRpby52YWx1ZSA9IHJhdGlvICE9PSB1bmRlZmluZWQgPyByYXRpbyA6IDEyO1xuICAgIC8vIGdhaW4gcmVkdWN0aW9uIGN1cnJlbnRseSBhcHBsaWVkIGJ5IGNvbXByZXNzb3IgZnJvbSAtMjAgdG8gMFxuICAgIG5vZGUucmVkdWN0aW9uLnZhbHVlID0gcmVkdWN0aW9uICE9PSB1bmRlZmluZWQgPyByZWR1Y3Rpb24gOiAtMTA7XG4gICAgLy8gc2Vjb25kcyB0byByZWR1Y2UgZ2FpbiBieSAxMGRiIGZyb20gMCB0byAxIC0gaG93IHF1aWNrbHkgc2lnbmFsIGFkYXB0ZWQgd2hlbiB2b2x1bWUgaW5jcmVhc2VkXG4gICAgbm9kZS5hdHRhY2sudmFsdWUgPSBhdHRhY2sgIT09IHVuZGVmaW5lZCA/IGF0dGFjayA6IDAuMDAwMztcbiAgICAvLyBzZWNvbmRzIHRvIGluY3JlYXNlIGdhaW4gYnkgMTBkYiBmcm9tIDAgdG8gMSAtIGhvdyBxdWlja2x5IHNpZ25hbCBhZGFwdGVkIHdoZW4gdm9sdW1lIHJlZGN1Y2VkXG4gICAgbm9kZS5yZWxlYXNlLnZhbHVlID0gcmVsZWFzZSAhPT0gdW5kZWZpbmVkID8gcmVsZWFzZSA6IDAuMjU7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmNvbnZvbHZlciA9IGZ1bmN0aW9uKGltcHVsc2VSZXNwb25zZSkge1xuICAgIC8vIGltcHVsc2VSZXNwb25zZSBpcyBhbiBhdWRpbyBmaWxlIGJ1ZmZlclxuICAgIHZhciBub2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVDb252b2x2ZXIoKTtcbiAgICBub2RlLmJ1ZmZlciA9IGltcHVsc2VSZXNwb25zZTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbih0aW1lKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZURlbGF5KCk7XG4gICAgaWYodGltZSAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuZGVsYXlUaW1lLnZhbHVlID0gdGltZTsgfVxuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5lY2hvID0gZnVuY3Rpb24odGltZSwgZ2Fpbikge1xuICAgIHZhciBlY2hvID0gbmV3IEVjaG8odGhpcy5fY29udGV4dCwgdGltZSwgZ2Fpbik7XG4gICAgdGhpcy5hZGQoZWNobyk7XG4gICAgcmV0dXJuIGVjaG87XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuZGlzdG9ydGlvbiA9IGZ1bmN0aW9uKGFtb3VudCkge1xuICAgIHZhciBub2RlID0gbmV3IERpc3RvcnRpb24odGhpcy5fY29udGV4dCwgYW1vdW50KTtcbiAgICAvLyBGbG9hdDMyQXJyYXkgZGVmaW5pbmcgY3VydmUgKHZhbHVlcyBhcmUgaW50ZXJwb2xhdGVkKVxuICAgIC8vbm9kZS5jdXJ2ZVxuICAgIC8vIHVwLXNhbXBsZSBiZWZvcmUgYXBwbHlpbmcgY3VydmUgZm9yIGJldHRlciByZXNvbHV0aW9uIHJlc3VsdCAnbm9uZScsICcyeCcgb3IgJzR4J1xuICAgIC8vbm9kZS5vdmVyc2FtcGxlID0gJzJ4JztcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24odHlwZSwgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgdmFyIGZpbHRlciA9IG5ldyBGaWx0ZXIodGhpcy5fY29udGV4dCwgdHlwZSwgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbiAgICByZXR1cm4gdGhpcy5hZGQoZmlsdGVyKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5sb3dwYXNzID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdsb3dwYXNzJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5oaWdocGFzcyA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignaGlnaHBhc3MnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmJhbmRwYXNzID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdiYW5kcGFzcycsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUubG93c2hlbGYgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2xvd3NoZWxmJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5oaWdoc2hlbGYgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2hpZ2hzaGVsZicsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUucGVha2luZyA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcigncGVha2luZycsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUubm90Y2ggPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ25vdGNoJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5hbGxwYXNzID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdhbGxwYXNzJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5nYWluID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIGlmKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbm9kZS5nYWluLnZhbHVlID0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnBhbm5lciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYW5uZXIgPSBuZXcgUGFubmVyKHRoaXMuX2NvbnRleHQpO1xuICAgIHRoaXMuYWRkKHBhbm5lcik7XG4gICAgcmV0dXJuIHBhbm5lcjtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5waGFzZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGhhc2VyID0gbmV3IFBoYXNlcih0aGlzLl9jb250ZXh0KTtcbiAgICB0aGlzLmFkZChwaGFzZXIpO1xuICAgIHJldHVybiBwaGFzZXI7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUucmVjb3JkZXIgPSBmdW5jdGlvbihwYXNzVGhyb3VnaCkge1xuICAgIHZhciByZWNvcmRlciA9IG5ldyBSZWNvcmRlcih0aGlzLl9jb250ZXh0LCBwYXNzVGhyb3VnaCk7XG4gICAgdGhpcy5hZGQocmVjb3JkZXIpO1xuICAgIHJldHVybiByZWNvcmRlcjtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5yZXZlcmIgPSBmdW5jdGlvbihzZWNvbmRzLCBkZWNheSwgcmV2ZXJzZSkge1xuICAgIHZhciByZXZlcmIgPSBuZXcgUmV2ZXJiKHRoaXMuX2NvbnRleHQsIHNlY29uZHMsIGRlY2F5LCByZXZlcnNlKTtcbiAgICB0aGlzLmFkZChyZXZlcmIpO1xuICAgIHJldHVybiByZXZlcmI7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuc2NyaXB0UHJvY2Vzc29yID0gZnVuY3Rpb24oYnVmZmVyU2l6ZSwgaW5wdXRDaGFubmVscywgb3V0cHV0Q2hhbm5lbHMsIGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgLy8gYnVmZmVyU2l6ZSAyNTYgLSAxNjM4NCAocG93IDIpXG4gICAgYnVmZmVyU2l6ZSA9IGJ1ZmZlclNpemUgfHwgMTAyNDtcbiAgICBpbnB1dENoYW5uZWxzID0gaW5wdXRDaGFubmVscyA9PT0gdW5kZWZpbmVkID8gMCA6IGlucHV0Q2hhbm5lbHM7XG4gICAgb3V0cHV0Q2hhbm5lbHMgPSBvdXRwdXRDaGFubmVscyA9PT0gdW5kZWZpbmVkID8gMSA6IG91dHB1dENoYW5uZWxzO1xuICAgIHZhciBub2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgaW5wdXRDaGFubmVscywgb3V0cHV0Q2hhbm5lbHMpO1xuICAgIC8vbm9kZS5vbmF1ZGlvcHJvY2VzcyA9IGNhbGxiYWNrLmJpbmQoY2FsbGJhY2tDb250ZXh0fHwgbm9kZSk7XG4gICAgbm9kZS5vbmF1ZGlvcHJvY2VzcyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAvLyBhdmFpbGFibGUgcHJvcHM6XG4gICAgICAgIC8qXG4gICAgICAgIGV2ZW50LmlucHV0QnVmZmVyXG4gICAgICAgIGV2ZW50Lm91dHB1dEJ1ZmZlclxuICAgICAgICBldmVudC5wbGF5YmFja1RpbWVcbiAgICAgICAgKi9cbiAgICAgICAgLy8gRXhhbXBsZTogZ2VuZXJhdGUgbm9pc2VcbiAgICAgICAgLypcbiAgICAgICAgdmFyIG91dHB1dCA9IGV2ZW50Lm91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICAgICAgdmFyIGwgPSBvdXRwdXQubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgb3V0cHV0W2ldID0gTWF0aC5yYW5kb20oKTtcbiAgICAgICAgfVxuICAgICAgICAqL1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcgfHwgdGhpcywgZXZlbnQpO1xuICAgIH07XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmNyZWF0ZUZha2VDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZuID0gZnVuY3Rpb24oKXt9O1xuICAgIHZhciBwYXJhbSA9IHtcbiAgICAgICAgdmFsdWU6IDEsXG4gICAgICAgIGRlZmF1bHRWYWx1ZTogMSxcbiAgICAgICAgbGluZWFyUmFtcFRvVmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICBzZXRWYWx1ZUF0VGltZTogZm4sXG4gICAgICAgIGV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICBzZXRUYXJnZXRBdFRpbWU6IGZuLFxuICAgICAgICBzZXRWYWx1ZUN1cnZlQXRUaW1lOiBmbixcbiAgICAgICAgY2FuY2VsU2NoZWR1bGVkVmFsdWVzOiBmblxuICAgIH07XG4gICAgdmFyIGZha2VOb2RlID0ge1xuICAgICAgICBjb25uZWN0OmZuLFxuICAgICAgICBkaXNjb25uZWN0OmZuLFxuICAgICAgICAvLyBnYWluXG4gICAgICAgIGdhaW46e3ZhbHVlOiAxfSxcbiAgICAgICAgLy8gcGFubmVyXG4gICAgICAgIHBhbm5pbmdNb2RlbDogMCxcbiAgICAgICAgc2V0UG9zaXRpb246IGZuLFxuICAgICAgICBzZXRPcmllbnRhdGlvbjogZm4sXG4gICAgICAgIHNldFZlbG9jaXR5OiBmbixcbiAgICAgICAgZGlzdGFuY2VNb2RlbDogMCxcbiAgICAgICAgcmVmRGlzdGFuY2U6IDAsXG4gICAgICAgIG1heERpc3RhbmNlOiAwLFxuICAgICAgICByb2xsb2ZmRmFjdG9yOiAwLFxuICAgICAgICBjb25lSW5uZXJBbmdsZTogMzYwLFxuICAgICAgICBjb25lT3V0ZXJBbmdsZTogMzYwLFxuICAgICAgICBjb25lT3V0ZXJHYWluOiAwLFxuICAgICAgICAvLyBmaWx0ZXI6XG4gICAgICAgIHR5cGU6MCxcbiAgICAgICAgZnJlcXVlbmN5OiBwYXJhbSxcbiAgICAgICAgLy8gZGVsYXlcbiAgICAgICAgZGVsYXlUaW1lOiBwYXJhbSxcbiAgICAgICAgLy8gY29udm9sdmVyXG4gICAgICAgIGJ1ZmZlcjogMCxcbiAgICAgICAgLy8gYW5hbHlzZXJcbiAgICAgICAgc21vb3RoaW5nVGltZUNvbnN0YW50OiAwLFxuICAgICAgICBmZnRTaXplOiAwLFxuICAgICAgICBtaW5EZWNpYmVsczogMCxcbiAgICAgICAgbWF4RGVjaWJlbHM6IDAsXG4gICAgICAgIC8vIGNvbXByZXNzb3JcbiAgICAgICAgdGhyZXNob2xkOiBwYXJhbSxcbiAgICAgICAga25lZTogcGFyYW0sXG4gICAgICAgIHJhdGlvOiBwYXJhbSxcbiAgICAgICAgYXR0YWNrOiBwYXJhbSxcbiAgICAgICAgcmVsZWFzZTogcGFyYW0sXG4gICAgICAgIC8vIGRpc3RvcnRpb25cbiAgICAgICAgb3ZlcnNhbXBsZTogMCxcbiAgICAgICAgY3VydmU6IDAsXG4gICAgICAgIC8vIGJ1ZmZlclxuICAgICAgICBzYW1wbGVSYXRlOiAxLFxuICAgICAgICBsZW5ndGg6IDAsXG4gICAgICAgIGR1cmF0aW9uOiAwLFxuICAgICAgICBudW1iZXJPZkNoYW5uZWxzOiAwLFxuICAgICAgICBnZXRDaGFubmVsRGF0YTogZnVuY3Rpb24oKSB7IHJldHVybiBbXTsgfSxcbiAgICAgICAgY29weUZyb21DaGFubmVsOiBmbixcbiAgICAgICAgY29weVRvQ2hhbm5lbDogZm5cbiAgICB9O1xuICAgIHZhciByZXR1cm5GYWtlTm9kZSA9IGZ1bmN0aW9uKCl7IHJldHVybiBmYWtlTm9kZTsgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBjcmVhdGVBbmFseXNlcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUJ1ZmZlcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUJpcXVhZEZpbHRlcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUNvbnZvbHZlcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZURlbGF5OiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlR2FpbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGdhaW46IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDEsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRWYWx1ZTogMSxcbiAgICAgICAgICAgICAgICAgICAgbGluZWFyUmFtcFRvVmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICAgICAgICAgICAgICBzZXRWYWx1ZUF0VGltZTogZm4sXG4gICAgICAgICAgICAgICAgICAgIGV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICAgICAgICAgICAgICBzZXRUYXJnZXRBdFRpbWU6IGZuLFxuICAgICAgICAgICAgICAgICAgICBzZXRWYWx1ZUN1cnZlQXRUaW1lOiBmbixcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsU2NoZWR1bGVkVmFsdWVzOiBmblxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY29ubmVjdDpmbixcbiAgICAgICAgICAgICAgICBkaXNjb25uZWN0OmZuXG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICBjcmVhdGVQYW5uZXI6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVTY3JpcHRQcm9jZXNzb3I6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVXYXZlU2hhcGVyOiByZXR1cm5GYWtlTm9kZVxuICAgIH07XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuc2V0U291cmNlID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBub2RlO1xuICAgIHRoaXMuX3VwZGF0ZUNvbm5lY3Rpb25zKCk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuc2V0RGVzdGluYXRpb24gPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdGhpcy5fY29ubmVjdFRvKG5vZGUpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuXG4vKlxuZnVuY3Rpb24gRWNob05vZGUoY29udGV4dCwgZGVsYXlUaW1lLCBmZWVkYmFja1ZvbHVtZSl7XG4gIHRoaXMuZGVsYXlUaW1lLnZhbHVlID0gZGVsYXlUaW1lO1xuICB0aGlzLmdhaW5Ob2RlID0gY29udGV4dC5jcmVhdGVHYWluTm9kZSgpO1xuICB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWUgPSBmZWVkYmFja1ZvbHVtZTtcbiAgdGhpcy5jb25uZWN0KHRoaXMuZ2Fpbk5vZGUpO1xuICB0aGlzLmdhaW5Ob2RlLmNvbm5lY3QodGhpcyk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVjaG8oY29udGV4dCwgZGVsYXlUaW1lLCBmZWVkYmFjayl7XG4gIHZhciBkZWxheSA9IGNvbnRleHQuY3JlYXRlRGVsYXlOb2RlKGRlbGF5VGltZSArIDEpO1xuICBGZWVkYmFja0RlbGF5Tm9kZS5jYWxsKGRlbGF5LCBjb250ZXh0LCBkZWxheVRpbWUsIGZlZWRiYWNrKTtcbiAgcmV0dXJuIGRlbGF5O1xufVxuKi9cblxuLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEzNzAyNzMzL2NyZWF0aW5nLWEtY3VzdG9tLWVjaG8tbm9kZS13aXRoLXdlYi1hdWRpb1xuLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE5ODk1NDQyL2ltcGxlbWVudGluZy1hLWphdmFzY3JpcHQtYXVkaW9ub2RlXG5cbi8qXG4gKiBFeHBvcnRzXG4gKi9cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBOb2RlTWFuYWdlcjtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLypmdW5jdGlvbiBBbmFseXNlcihjb250ZXh0LCBmZnRTaXplLCBzbW9vdGhpbmcsIG1pbkRlY2liZWxzLCBtYXhEZWNpYmVscykge1xuICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICAgIG5vZGUuZmZ0U2l6ZSA9IGZmdFNpemU7IC8vIGZyZXF1ZW5jeUJpbkNvdW50IHdpbGwgYmUgaGFsZiB0aGlzIHZhbHVlXG5cbiAgICBpZihzbW9vdGhpbmcgIT09IHVuZGVmaW5lZCkgeyBub2RlLnNtb290aGluZ1RpbWVDb25zdGFudCA9IHNtb290aGluZzsgfVxuICAgIGlmKG1pbkRlY2liZWxzICE9PSB1bmRlZmluZWQpIHsgbm9kZS5taW5EZWNpYmVscyA9IG1pbkRlY2liZWxzOyB9XG4gICAgaWYobWF4RGVjaWJlbHMgIT09IHVuZGVmaW5lZCkgeyBub2RlLm1heERlY2liZWxzID0gbWF4RGVjaWJlbHM7IH1cblxuICAgIHZhciBtZXRob2QgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgXG4gICAgfTtcblxuICAgIC8vIHB1YmxpYyBtZXRob2RzXG4gICAgdmFyIGV4cG9ydHMgPSB7XG4gICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgICAvLyBtYXAgbmF0aXZlIG1ldGhvZHMgb2YgQW5hbHlzZXJOb2RlXG4gICAgICAgIGdldEJ5dGVGcmVxdWVuY3lEYXRhOiBub2RlLmdldEJ5dGVGcmVxdWVuY3lEYXRhLmJpbmQobm9kZSksXG4gICAgICAgIGdldEJ5dGVUaW1lRG9tYWluRGF0YTogbm9kZS5nZXRCeXRlVGltZURvbWFpbkRhdGEuYmluZChub2RlKSxcbiAgICAgICAgLy8gbWFwIG5hdGl2ZSBtZXRob2RzIG9mIEF1ZGlvTm9kZVxuICAgICAgICBjb25uZWN0OiBub2RlLmNvbm5lY3QuYmluZChub2RlKSxcbiAgICAgICAgZGlzY29ubmVjdDogbm9kZS5kaXNjb25uZWN0LmJpbmQobm9kZSlcbiAgICB9O1xuXG4gICAgLy8gbWFwIG5hdGl2ZSBwcm9wZXJ0aWVzIG9mIEFuYWx5c2VyTm9kZVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGV4cG9ydHMsIHtcbiAgICAgICAgJ2ZmdFNpemUnOiB7XG4gICAgICAgICAgICAvLyAzMiB0byAyMDQ4IChtdXN0IGJlIHBvdyAyKVxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG5vZGUuZmZ0U2l6ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbm9kZS5mZnRTaXplID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgJ3Ntb290aGluZyc6IHtcbiAgICAgICAgICAgIC8vIDAgdG8gMVxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG5vZGUuc21vb3RoaW5nVGltZUNvbnN0YW50OyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLnNtb290aGluZ1RpbWVDb25zdGFudCA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgICdzbW9vdGhpbmdUaW1lQ29uc3RhbnQnOiB7XG4gICAgICAgICAgICAvLyAwIHRvIDFcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLnNtb290aGluZ1RpbWVDb25zdGFudDsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbm9kZS5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICAnbWluRGVjaWJlbHMnOiB7XG4gICAgICAgICAgICAvLyAwIHRvIDFcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLm1pbkRlY2liZWxzOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmKHZhbHVlID4gLTMwKSB7IHZhbHVlID0gLTMwOyB9XG4gICAgICAgICAgICAgICAgbm9kZS5taW5EZWNpYmVscyA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAnbWF4RGVjaWJlbHMnOiB7XG4gICAgICAgICAgICAvLyAwIHRvIDEgKG1ha2VzIHRoZSB0cmFuc2l0aW9uIGJldHdlZW4gdmFsdWVzIG92ZXIgdGltZSBzbW9vdGhlcilcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLm1heERlY2liZWxzOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmKHZhbHVlID4gLTk5KSB7IHZhbHVlID0gLTk5OyB9XG4gICAgICAgICAgICAgICAgbm9kZS5tYXhEZWNpYmVscyA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAnZnJlcXVlbmN5QmluQ291bnQnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5mcmVxdWVuY3lCaW5Db3VudDsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZShleHBvcnRzKTtcbn0qL1xuXG5mdW5jdGlvbiBBbmFseXNlcihjb250ZXh0LCBmZnRTaXplLCBzbW9vdGhpbmcsIG1pbkRlY2liZWxzLCBtYXhEZWNpYmVscykge1xuICAgIGZmdFNpemUgPSBmZnRTaXplIHx8IDMyO1xuICAgIHZhciB3YXZlZm9ybURhdGEsIGZyZXF1ZW5jeURhdGE7XG5cbiAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICBub2RlLmZmdFNpemUgPSBmZnRTaXplOyAvLyBmcmVxdWVuY3lCaW5Db3VudCB3aWxsIGJlIGhhbGYgdGhpcyB2YWx1ZVxuXG4gICAgaWYoc21vb3RoaW5nICE9PSB1bmRlZmluZWQpIHsgbm9kZS5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSBzbW9vdGhpbmc7IH1cbiAgICBpZihtaW5EZWNpYmVscyAhPT0gdW5kZWZpbmVkKSB7IG5vZGUubWluRGVjaWJlbHMgPSBtaW5EZWNpYmVsczsgfVxuICAgIGlmKG1heERlY2liZWxzICE9PSB1bmRlZmluZWQpIHsgbm9kZS5tYXhEZWNpYmVscyA9IG1heERlY2liZWxzOyB9XG5cbiAgICB2YXIgdXBkYXRlRkZUU2l6ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZihmZnRTaXplICE9PSBub2RlLmZmdFNpemUgfHwgd2F2ZWZvcm1EYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHdhdmVmb3JtRGF0YSA9IG5ldyBVaW50OEFycmF5KG5vZGUuZmZ0U2l6ZSk7XG4gICAgICAgICAgICBmcmVxdWVuY3lEYXRhID0gbmV3IFVpbnQ4QXJyYXkobm9kZS5mcmVxdWVuY3lCaW5Db3VudCk7XG4gICAgICAgICAgICBmZnRTaXplID0gbm9kZS5mZnRTaXplO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB1cGRhdGVGRlRTaXplKCk7XG5cbiAgICBub2RlLmdldFdhdmVmb3JtID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHVwZGF0ZUZGVFNpemUoKTtcbiAgICAgICAgdGhpcy5nZXRCeXRlVGltZURvbWFpbkRhdGEod2F2ZWZvcm1EYXRhKTtcbiAgICAgICAgcmV0dXJuIHdhdmVmb3JtRGF0YTtcbiAgICB9O1xuXG4gICAgbm9kZS5nZXRGcmVxdWVuY2llcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB1cGRhdGVGRlRTaXplKCk7XG4gICAgICAgIHRoaXMuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcXVlbmN5RGF0YSk7XG4gICAgICAgIHJldHVybiBmcmVxdWVuY3lEYXRhO1xuICAgIH07XG5cbiAgICAvLyBtYXAgbmF0aXZlIHByb3BlcnRpZXMgb2YgQW5hbHlzZXJOb2RlXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICAnc21vb3RoaW5nJzoge1xuICAgICAgICAgICAgLy8gMCB0byAxXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5zbW9vdGhpbmdUaW1lQ29uc3RhbnQ7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IG5vZGUuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gdmFsdWU7IH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cbi8qXG4gKiBFeHBvcnRzXG4gKi9cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBBbmFseXNlcjtcbn1cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKmZ1bmN0aW9uIERpc3RvcnRpb24oY29udGV4dCwgZGVsYXlUaW1lLCBnYWluVmFsdWUpIHtcbiAgICB2YXIgZGVsYXkgPSBjb250ZXh0LmNyZWF0ZURlbGF5KCk7XG4gICAgdmFyIGdhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgIGdhaW4uZ2Fpbi52YWx1ZSA9IGdhaW5WYWx1ZSB8fCAwLjU7XG4gICAgaWYoZGVsYXlUaW1lICE9PSB1bmRlZmluZWQpIHsgZGVsYXkuZGVsYXlUaW1lLnZhbHVlID0gZGVsYXlUaW1lOyB9XG5cblxuICAgIHZhciBjb25uZWN0ID0gZnVuY3Rpb24obm9kZSkge1xuICAgICAgICBkaXNjb25uZWN0KCk7XG4gICAgICAgIGRlbGF5LmNvbm5lY3QoZ2Fpbik7XG4gICAgICAgIGdhaW4uY29ubmVjdChkZWxheSk7XG4gICAgICAgIGRlbGF5LmNvbm5lY3Qobm9kZSk7XG4gICAgfTtcblxuICAgIHZhciBkaXNjb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGRlbGF5LmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgZ2Fpbi5kaXNjb25uZWN0KCk7XG4gICAgfTtcblxuICAgIC8vIHB1YmxpYyBtZXRob2RzXG4gICAgdmFyIGV4cG9ydHMgPSB7XG4gICAgICAgIG5vZGU6IGRlbGF5LFxuICAgICAgICAvLyBtYXAgbmF0aXZlIG1ldGhvZHMgb2YgRGlzdG9ydGlvbk5vZGVcbiAgICAgICAgXG4gICAgICAgIC8vIG1hcCBuYXRpdmUgbWV0aG9kcyBvZiBBdWRpb05vZGVcbiAgICAgICAgY29ubmVjdDogY29ubmVjdCxcbiAgICAgICAgZGlzY29ubmVjdDogZGlzY29ubmVjdFxuICAgIH07XG5cbiAgICAvLyBtYXAgbmF0aXZlIHByb3BlcnRpZXMgb2YgRGlzdG9ydGlvbk5vZGVcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhleHBvcnRzLCB7XG4gICAgICAgICdkZWxheVRpbWUnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZGVsYXkuZGVsYXlUaW1lLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBkZWxheS5kZWxheVRpbWUudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICAnZ2FpblZhbHVlJzoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGdhaW4uZ2Fpbi52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZ2Fpbi5nYWluLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoZXhwb3J0cyk7XG59Ki9cblxuZnVuY3Rpb24gRGlzdG9ydGlvbihjb250ZXh0LCBhbW91bnQpIHtcbiAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlV2F2ZVNoYXBlcigpO1xuXG4gICAgLy8gY3JlYXRlIHdhdmVTaGFwZXIgZGlzdG9ydGlvbiBjdXJ2ZSBmcm9tIDAgdG8gMVxuICAgIG5vZGUudXBkYXRlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgYW1vdW50ID0gdmFsdWU7XG4gICAgICAgIHZhciBrID0gdmFsdWUgKiAxMDAsXG4gICAgICAgICAgICBuID0gMjIwNTAsXG4gICAgICAgICAgICBjdXJ2ZSA9IG5ldyBGbG9hdDMyQXJyYXkobiksXG4gICAgICAgICAgICBkZWcgPSBNYXRoLlBJIC8gMTgwO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgeCA9IGkgKiAyIC8gbiAtIDE7XG4gICAgICAgICAgICBjdXJ2ZVtpXSA9ICgzICsgaykgKiB4ICogMjAgKiBkZWcgLyAoTWF0aC5QSSArIGsgKiBNYXRoLmFicyh4KSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmN1cnZlID0gY3VydmU7XG4gICAgfTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgJ2Ftb3VudCc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBhbW91bnQ7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHRoaXMudXBkYXRlKHZhbHVlKTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBpZihhbW91bnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBub2RlLnVwZGF0ZShhbW91bnQpO1xuICAgIH1cblxuICAgIHJldHVybiBub2RlO1xufVxuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRGlzdG9ydGlvbjtcbn1cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKmZ1bmN0aW9uIEVjaG8oY29udGV4dCwgZGVsYXlUaW1lLCBnYWluVmFsdWUpIHtcbiAgICB2YXIgZGVsYXkgPSBjb250ZXh0LmNyZWF0ZURlbGF5KCk7XG4gICAgdmFyIGdhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgIGdhaW4uZ2Fpbi52YWx1ZSA9IGdhaW5WYWx1ZSB8fCAwLjU7XG4gICAgaWYoZGVsYXlUaW1lICE9PSB1bmRlZmluZWQpIHsgZGVsYXkuZGVsYXlUaW1lLnZhbHVlID0gZGVsYXlUaW1lOyB9XG5cblxuICAgIHZhciBjb25uZWN0ID0gZnVuY3Rpb24obm9kZSkge1xuICAgICAgICBkaXNjb25uZWN0KCk7XG4gICAgICAgIGRlbGF5LmNvbm5lY3QoZ2Fpbik7XG4gICAgICAgIGdhaW4uY29ubmVjdChkZWxheSk7XG4gICAgICAgIGRlbGF5LmNvbm5lY3Qobm9kZSk7XG4gICAgfTtcblxuICAgIHZhciBkaXNjb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGRlbGF5LmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgZ2Fpbi5kaXNjb25uZWN0KCk7XG4gICAgfTtcblxuICAgIC8vIHB1YmxpYyBtZXRob2RzXG4gICAgdmFyIGV4cG9ydHMgPSB7XG4gICAgICAgIG5vZGU6IGRlbGF5LFxuICAgICAgICAvLyBtYXAgbmF0aXZlIG1ldGhvZHMgb2YgRWNob05vZGVcblxuICAgICAgICAvLyBtYXAgbmF0aXZlIG1ldGhvZHMgb2YgQXVkaW9Ob2RlXG4gICAgICAgIGNvbm5lY3Q6IGNvbm5lY3QsXG4gICAgICAgIGRpc2Nvbm5lY3Q6IGRpc2Nvbm5lY3RcbiAgICB9O1xuXG4gICAgLy8gbWFwIG5hdGl2ZSBwcm9wZXJ0aWVzIG9mIEVjaG9Ob2RlXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoZXhwb3J0cywge1xuICAgICAgICAnZGVsYXlUaW1lJzoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGRlbGF5LmRlbGF5VGltZS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZGVsYXkuZGVsYXlUaW1lLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgJ2dhaW5WYWx1ZSc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBnYWluLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGdhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKGV4cG9ydHMpO1xufSovXG5cbi8qXG4gKiBUaGlzIHdheSBpcyBtb3JlIGNvbmNpc2UgYnV0IHJlcXVpcmVzICdjb25uZWN0ZWQnIHRvIGJlIGNhbGxlZCBpbiBub2RlIG1hbmFnZXJcbiAqL1xuXG5mdW5jdGlvbiBFY2hvKGNvbnRleHQsIGRlbGF5VGltZSwgZ2FpblZhbHVlKSB7XG4gICAgdmFyIGRlbGF5ID0gY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIHZhciBnYWluID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG5cbiAgICBnYWluLmdhaW4udmFsdWUgPSBnYWluVmFsdWUgfHwgMC41O1xuICAgIGlmKGRlbGF5VGltZSAhPT0gdW5kZWZpbmVkKSB7IGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5VGltZTsgfVxuXG4gICAgZGVsYXkuX2Nvbm5lY3RlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBkZWxheS5jb25uZWN0KGdhaW4pO1xuICAgICAgICBnYWluLmNvbm5lY3QoZGVsYXkpO1xuICAgIH07XG5cbiAgICBkZWxheS51cGRhdGUgPSBmdW5jdGlvbihkZWxheVRpbWUsIGdhaW5WYWx1ZSkge1xuICAgICAgICBpZihkZWxheVRpbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5kZWxheVRpbWUudmFsdWUgPSBkZWxheVRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYoZ2FpblZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGdhaW4uZ2Fpbi52YWx1ZSA9IGdhaW5WYWx1ZTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZGVsYXk7XG59XG5cbi8qXG4gKiBFeHBvcnRzXG4gKi9cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFY2hvO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuLypcbmZ1bmN0aW9uIEZpbHRlcihjb250ZXh0LCB0eXBlLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICAvLyBGcmVxdWVuY3kgYmV0d2VlbiA0MEh6IGFuZCBoYWxmIG9mIHRoZSBzYW1wbGluZyByYXRlXG4gICAgdmFyIG1pbkZyZXF1ZW5jeSA9IDQwO1xuICAgIHZhciBtYXhGcmVxdWVuY3kgPSBjb250ZXh0LnNhbXBsZVJhdGUgLyAyO1xuXG4gICAgY29uc29sZS5sb2coJ21heEZyZXF1ZW5jeTonLCBtYXhGcmVxdWVuY3kpO1xuXG4gICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgIG5vZGUudHlwZSA9IHR5cGU7XG5cbiAgICBpZihmcmVxdWVuY3kgIT09IHVuZGVmaW5lZCkgeyBub2RlLmZyZXF1ZW5jeS52YWx1ZSA9IGZyZXF1ZW5jeTsgfVxuICAgIGlmKHF1YWxpdHkgIT09IHVuZGVmaW5lZCkgeyBub2RlLlEudmFsdWUgPSBxdWFsaXR5OyB9XG4gICAgaWYoZ2FpbiAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuZ2Fpbi52YWx1ZSA9IGdhaW47IH1cblxuXG4gICAgdmFyIGdldEZyZXF1ZW5jeSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIExvZ2FyaXRobSAoYmFzZSAyKSB0byBjb21wdXRlIGhvdyBtYW55IG9jdGF2ZXMgZmFsbCBpbiB0aGUgcmFuZ2UuXG4gICAgICAgIHZhciBudW1iZXJPZk9jdGF2ZXMgPSBNYXRoLmxvZyhtYXhGcmVxdWVuY3kgLyBtaW5GcmVxdWVuY3kpIC8gTWF0aC5MTjI7XG4gICAgICAgIC8vIENvbXB1dGUgYSBtdWx0aXBsaWVyIGZyb20gMCB0byAxIGJhc2VkIG9uIGFuIGV4cG9uZW50aWFsIHNjYWxlLlxuICAgICAgICB2YXIgbXVsdGlwbGllciA9IE1hdGgucG93KDIsIG51bWJlck9mT2N0YXZlcyAqICh2YWx1ZSAtIDEuMCkpO1xuICAgICAgICAvLyBHZXQgYmFjayB0byB0aGUgZnJlcXVlbmN5IHZhbHVlIGJldHdlZW4gbWluIGFuZCBtYXguXG4gICAgICAgIHJldHVybiBtYXhGcmVxdWVuY3kgKiBtdWx0aXBsaWVyO1xuICAgIH07XG5cbiAgICB2YXIgc2V0QnlQZXJjZW50ID0gZnVuY3Rpb24ocGVyY2VudCwgcXVhbGl0eSwgZ2Fpbikge1xuICAgICAgICAvLyBzZXQgZmlsdGVyIGZyZXF1ZW5jeSBiYXNlZCBvbiB2YWx1ZSBmcm9tIDAgdG8gMVxuICAgICAgICBub2RlLmZyZXF1ZW5jeS52YWx1ZSA9IGdldEZyZXF1ZW5jeShwZXJjZW50KTtcbiAgICAgICAgaWYocXVhbGl0eSAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuUS52YWx1ZSA9IHF1YWxpdHk7IH1cbiAgICAgICAgaWYoZ2FpbiAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuZ2Fpbi52YWx1ZSA9IGdhaW47IH1cbiAgICB9O1xuXG4gICAgLy8gcHVibGljIG1ldGhvZHNcbiAgICB2YXIgZXhwb3J0cyA9IHtcbiAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgc2V0QnlQZXJjZW50OiBzZXRCeVBlcmNlbnQsXG4gICAgICAgIC8vIG1hcCBuYXRpdmUgbWV0aG9kcyBvZiBCaXF1YWRGaWx0ZXJOb2RlXG4gICAgICAgIGdldEZyZXF1ZW5jeVJlc3BvbnNlOiBub2RlLmdldEZyZXF1ZW5jeVJlc3BvbnNlLmJpbmQobm9kZSksXG4gICAgICAgIC8vIG1hcCBuYXRpdmUgbWV0aG9kcyBvZiBBdWRpb05vZGVcbiAgICAgICAgY29ubmVjdDogbm9kZS5jb25uZWN0LmJpbmQobm9kZSksXG4gICAgICAgIGRpc2Nvbm5lY3Q6IG5vZGUuZGlzY29ubmVjdC5iaW5kKG5vZGUpXG4gICAgfTtcblxuICAgIC8vIG1hcCBuYXRpdmUgcHJvcGVydGllcyBvZiBCaXF1YWRGaWx0ZXJOb2RlXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoZXhwb3J0cywge1xuICAgICAgICAndHlwZSc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLnR5cGU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IG5vZGUudHlwZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgICdmcmVxdWVuY3knOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5mcmVxdWVuY3kudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IG5vZGUuZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgJ2RldHVuZSc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLmRldHVuZS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbm9kZS5kZXR1bmUudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICAncXVhbGl0eSc6IHtcbiAgICAgICAgICAgIC8vIDAuMDAwMSB0byAxMDAwXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5RLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLlEudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICAnZ2Fpbic6IHtcbiAgICAgICAgICAgIC8vIC00MCB0byA0MFxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG5vZGUuZ2Fpbi52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbm9kZS5nYWluLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoZXhwb3J0cyk7XG59Ki9cblxuZnVuY3Rpb24gRmlsdGVyKGNvbnRleHQsIHR5cGUsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIC8vIEZyZXF1ZW5jeSBiZXR3ZWVuIDQwSHogYW5kIGhhbGYgb2YgdGhlIHNhbXBsaW5nIHJhdGVcbiAgICB2YXIgbWluRnJlcXVlbmN5ID0gNDA7XG4gICAgdmFyIG1heEZyZXF1ZW5jeSA9IGNvbnRleHQuc2FtcGxlUmF0ZSAvIDI7XG5cbiAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gICAgbm9kZS50eXBlID0gdHlwZTtcblxuICAgIGlmKGZyZXF1ZW5jeSAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuZnJlcXVlbmN5LnZhbHVlID0gZnJlcXVlbmN5OyB9XG4gICAgaWYocXVhbGl0eSAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuUS52YWx1ZSA9IHF1YWxpdHk7IH1cbiAgICBpZihnYWluICE9PSB1bmRlZmluZWQpIHsgbm9kZS5nYWluLnZhbHVlID0gZ2FpbjsgfVxuXG5cbiAgICB2YXIgZ2V0RnJlcXVlbmN5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gTG9nYXJpdGhtIChiYXNlIDIpIHRvIGNvbXB1dGUgaG93IG1hbnkgb2N0YXZlcyBmYWxsIGluIHRoZSByYW5nZS5cbiAgICAgICAgdmFyIG51bWJlck9mT2N0YXZlcyA9IE1hdGgubG9nKG1heEZyZXF1ZW5jeSAvIG1pbkZyZXF1ZW5jeSkgLyBNYXRoLkxOMjtcbiAgICAgICAgLy8gQ29tcHV0ZSBhIG11bHRpcGxpZXIgZnJvbSAwIHRvIDEgYmFzZWQgb24gYW4gZXhwb25lbnRpYWwgc2NhbGUuXG4gICAgICAgIHZhciBtdWx0aXBsaWVyID0gTWF0aC5wb3coMiwgbnVtYmVyT2ZPY3RhdmVzICogKHZhbHVlIC0gMS4wKSk7XG4gICAgICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICAgICAgcmV0dXJuIG1heEZyZXF1ZW5jeSAqIG11bHRpcGxpZXI7XG4gICAgfTtcblxuICAgIG5vZGUudXBkYXRlID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBnYWluKSB7XG4gICAgICAgIGlmKGZyZXF1ZW5jeSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLmZyZXF1ZW5jeS52YWx1ZSA9IGZyZXF1ZW5jeTtcbiAgICAgICAgfVxuICAgICAgICBpZihnYWluICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZ2Fpbi52YWx1ZSA9IGdhaW47XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbm9kZS5zZXRCeVBlcmNlbnQgPSBmdW5jdGlvbihwZXJjZW50LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgICAgIC8vIHNldCBmaWx0ZXIgZnJlcXVlbmN5IGJhc2VkIG9uIHZhbHVlIGZyb20gMCB0byAxXG4gICAgICAgIG5vZGUuZnJlcXVlbmN5LnZhbHVlID0gZ2V0RnJlcXVlbmN5KHBlcmNlbnQpO1xuICAgICAgICBpZihxdWFsaXR5ICE9PSB1bmRlZmluZWQpIHsgbm9kZS5RLnZhbHVlID0gcXVhbGl0eTsgfVxuICAgICAgICBpZihnYWluICE9PSB1bmRlZmluZWQpIHsgbm9kZS5nYWluLnZhbHVlID0gZ2FpbjsgfVxuICAgIH07XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEZpbHRlcjtcbn1cbiIsIid1c2Ugc3RyaWN0Jztcbi8qXG5mdW5jdGlvbiBQYW5uZXIoY29udGV4dCkge1xuICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVQYW5uZXIoKTtcbiAgICAvLyBEZWZhdWx0IGZvciBzdGVyZW8gaXMgSFJURlxuICAgIG5vZGUucGFubmluZ01vZGVsID0gJ0hSVEYnOyAvLyAnZXF1YWxwb3dlcidcblxuICAgIC8vIERpc3RhbmNlIG1vZGVsIGFuZCBhdHRyaWJ1dGVzXG4gICAgbm9kZS5kaXN0YW5jZU1vZGVsID0gJ2xpbmVhcic7IC8vICdsaW5lYXInICdpbnZlcnNlJyAnZXhwb25lbnRpYWwnXG4gICAgbm9kZS5yZWZEaXN0YW5jZSA9IDE7XG4gICAgbm9kZS5tYXhEaXN0YW5jZSA9IDEwMDA7XG4gICAgbm9kZS5yb2xsb2ZmRmFjdG9yID0gMTtcbiAgICBub2RlLmNvbmVJbm5lckFuZ2xlID0gMzYwO1xuICAgIG5vZGUuY29uZU91dGVyQW5nbGUgPSAwO1xuICAgIG5vZGUuY29uZU91dGVyR2FpbiA9IDA7XG4gICAgXG4gICAgLy8gc2ltcGxlIHZlYzMgb2JqZWN0IHBvb2xcbiAgICB2YXIgVmVjUG9vbCA9IHtcbiAgICAgICAgcG9vbDogW10sXG4gICAgICAgIGdldDogZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICAgICAgdmFyIHYgPSB0aGlzLnBvb2wubGVuZ3RoID8gdGhpcy5wb29sLnBvcCgpIDogeyB4OiAwLCB5OiAwLCB6OiAwIH07XG4gICAgICAgICAgICAvLyBjaGVjayBpZiBhIHZlY3RvciBoYXMgYmVlbiBwYXNzZWQgaW5cbiAgICAgICAgICAgIGlmKHggIT09IHVuZGVmaW5lZCAmJiBpc05hTih4KSAmJiAneCcgaW4geCAmJiAneScgaW4geCAmJiAneicgaW4geCkge1xuICAgICAgICAgICAgICAgIHYueCA9IHgueCB8fCAwO1xuICAgICAgICAgICAgICAgIHYueSA9IHgueSB8fCAwO1xuICAgICAgICAgICAgICAgIHYueiA9IHgueiB8fCAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdi54ID0geCB8fCAwO1xuICAgICAgICAgICAgICAgIHYueSA9IHkgfHwgMDtcbiAgICAgICAgICAgICAgICB2LnogPSB6IHx8IDA7ICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH0sXG4gICAgICAgIGRpc3Bvc2U6IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLnBvb2wucHVzaChpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGdsb2JhbFVwID0gVmVjUG9vbC5nZXQoMCwgMSwgMCk7XG5cbiAgICB2YXIgc2V0T3JpZW50YXRpb24gPSBmdW5jdGlvbihub2RlLCBmdykge1xuICAgICAgICAvLyBzZXQgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBzb3VyY2UgKHdoZXJlIHRoZSBhdWRpbyBpcyBjb21pbmcgZnJvbSlcblxuICAgICAgICAvLyBjYWxjdWxhdGUgdXAgdmVjICggdXAgPSAoZm9yd2FyZCBjcm9zcyAoMCwgMSwgMCkpIGNyb3NzIGZvcndhcmQgKVxuICAgICAgICB2YXIgdXAgPSBWZWNQb29sLmdldChmdy54LCBmdy55LCBmdy56KTtcbiAgICAgICAgY3Jvc3ModXAsIGdsb2JhbFVwKTtcbiAgICAgICAgY3Jvc3ModXAsIGZ3KTtcbiAgICAgICAgbm9ybWFsaXplKHVwKTtcbiAgICAgICAgbm9ybWFsaXplKGZ3KTtcblxuICAgICAgICAvLyBzZXQgdGhlIGF1ZGlvIGNvbnRleHQncyBsaXN0ZW5lciBwb3NpdGlvbiB0byBtYXRjaCB0aGUgY2FtZXJhIHBvc2l0aW9uXG4gICAgICAgIG5vZGUuc2V0T3JpZW50YXRpb24oZncueCwgZncueSwgZncueiwgdXAueCwgdXAueSwgdXAueik7XG5cbiAgICAgICAgLy8gcmV0dXJuIHRoZSB2ZWNzIHRvIHRoZSBwb29sXG4gICAgICAgIFZlY1Bvb2wuZGlzcG9zZShmdyk7XG4gICAgICAgIFZlY1Bvb2wuZGlzcG9zZSh1cCk7XG4gICAgfTtcblxuICAgIHZhciBzZXRQb3NpdGlvbiA9IGZ1bmN0aW9uKG5vZGUsIHZlYykge1xuICAgICAgICBub2RlLnNldFBvc2l0aW9uKHZlYy54LCB2ZWMueSwgdmVjLnopO1xuICAgICAgICBWZWNQb29sLmRpc3Bvc2UodmVjKTtcbiAgICB9O1xuXG4gICAgdmFyIHNldFZlbG9jaXR5ID0gZnVuY3Rpb24obm9kZSwgdmVjKSB7XG4gICAgICAgIG5vZGUuc2V0VmVsb2NpdHkodmVjLngsIHZlYy55LCB2ZWMueik7XG4gICAgICAgIFZlY1Bvb2wuZGlzcG9zZSh2ZWMpO1xuICAgIH07XG5cbiAgICB2YXIgY2FsY3VsYXRlVmVsb2NpdHkgPSBmdW5jdGlvbihjdXJyZW50UG9zaXRpb24sIGxhc3RQb3NpdGlvbiwgZGVsdGFUaW1lKSB7XG4gICAgICAgIHZhciBkeCA9IGN1cnJlbnRQb3NpdGlvbi54IC0gbGFzdFBvc2l0aW9uLng7XG4gICAgICAgIHZhciBkeSA9IGN1cnJlbnRQb3NpdGlvbi55IC0gbGFzdFBvc2l0aW9uLnk7XG4gICAgICAgIHZhciBkeiA9IGN1cnJlbnRQb3NpdGlvbi56IC0gbGFzdFBvc2l0aW9uLno7XG4gICAgICAgIHJldHVybiBWZWNQb29sLmdldChkeCAvIGRlbHRhVGltZSwgZHkgLyBkZWx0YVRpbWUsIGR6IC8gZGVsdGFUaW1lKTtcbiAgICB9O1xuXG4gICAgLy8gY3Jvc3MgcHJvZHVjdCBvZiAyIHZlY3RvcnNcbiAgICB2YXIgY3Jvc3MgPSBmdW5jdGlvbiAoIGEsIGIgKSB7XG4gICAgICAgIHZhciBheCA9IGEueCwgYXkgPSBhLnksIGF6ID0gYS56O1xuICAgICAgICB2YXIgYnggPSBiLngsIGJ5ID0gYi55LCBieiA9IGIuejtcbiAgICAgICAgYS54ID0gYXkgKiBieiAtIGF6ICogYnk7XG4gICAgICAgIGEueSA9IGF6ICogYnggLSBheCAqIGJ6O1xuICAgICAgICBhLnogPSBheCAqIGJ5IC0gYXkgKiBieDtcbiAgICB9O1xuXG4gICAgLy8gbm9ybWFsaXNlIHRvIHVuaXQgdmVjdG9yXG4gICAgdmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uICh2ZWMzKSB7XG4gICAgICAgIGlmKHZlYzMueCA9PT0gMCAmJiB2ZWMzLnkgPT09IDAgJiYgdmVjMy56ID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdmVjMztcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KCB2ZWMzLnggKiB2ZWMzLnggKyB2ZWMzLnkgKiB2ZWMzLnkgKyB2ZWMzLnogKiB2ZWMzLnogKTtcbiAgICAgICAgdmFyIGludlNjYWxhciA9IDEgLyBsZW5ndGg7XG4gICAgICAgIHZlYzMueCAqPSBpbnZTY2FsYXI7XG4gICAgICAgIHZlYzMueSAqPSBpbnZTY2FsYXI7XG4gICAgICAgIHZlYzMueiAqPSBpbnZTY2FsYXI7XG4gICAgICAgIHJldHVybiB2ZWMzO1xuICAgIH07XG5cbiAgICAvLyBwYW4gbGVmdCB0byByaWdodCB3aXRoIHZhbHVlIGZyb20gLTEgdG8gMVxuICAgIC8vIGNyZWF0ZXMgYSBuaWNlIGN1cnZlIHdpdGggelxuICAgIHZhciBzZXRYID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdmFyIGRlZzQ1ID0gTWF0aC5QSSAvIDQsXG4gICAgICAgICAgICBkZWc5MCA9IGRlZzQ1ICogMixcbiAgICAgICAgICAgIHggPSB2YWx1ZSAqIGRlZzQ1LFxuICAgICAgICAgICAgeiA9IHggKyBkZWc5MDtcblxuICAgICAgICBpZiAoeiA+IGRlZzkwKSB7XG4gICAgICAgICAgICB6ID0gTWF0aC5QSSAtIHo7XG4gICAgICAgIH1cblxuICAgICAgICB4ID0gTWF0aC5zaW4oeCk7XG4gICAgICAgIHogPSBNYXRoLnNpbih6KTtcblxuICAgICAgICBub2RlLnNldFBvc2l0aW9uKHgsIDAsIHopO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHBvc2l0aW9uIHRoZSBhdWRpbyBpcyBjb21pbmcgZnJvbSlcbiAgICB2YXIgc2V0U291cmNlUG9zaXRpb24gPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldFBvc2l0aW9uKG5vZGUsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSBkaXJlY3Rpb24gdGhlIGF1ZGlvIGlzIGNvbWluZyBmcm9tKVxuICAgIHZhciBzZXRTb3VyY2VPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0T3JpZW50YXRpb24obm9kZSwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHZlbG9pY3R5IG9mIHRoZSBhdWRpbyBzb3VyY2UgKGlmIG1vdmluZylcbiAgICB2YXIgc2V0U291cmNlVmVsb2NpdHkgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldFZlbG9jaXR5KG5vZGUsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSBwb3NpdGlvbiBvZiB3aG8gb3Igd2hhdCBpcyBoZWFyaW5nIHRoZSBhdWRpbyAoY291bGQgYmUgY2FtZXJhIG9yIHNvbWUgY2hhcmFjdGVyKVxuICAgIHZhciBzZXRMaXN0ZW5lclBvc2l0aW9uID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRQb3NpdGlvbihjb250ZXh0Lmxpc3RlbmVyLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIHNldCB0aGUgcG9zaXRpb24gb2Ygd2hvIG9yIHdoYXQgaXMgaGVhcmluZyB0aGUgYXVkaW8gKGNvdWxkIGJlIGNhbWVyYSBvciBzb21lIGNoYXJhY3RlcilcbiAgICB2YXIgc2V0TGlzdGVuZXJPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0T3JpZW50YXRpb24oY29udGV4dC5saXN0ZW5lciwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHZlbG9jaXR5IChpZiBtb3ZpbmcpIG9mIHdobyBvciB3aGF0IGlzIGhlYXJpbmcgdGhlIGF1ZGlvIChjb3VsZCBiZSBjYW1lcmEgb3Igc29tZSBjaGFyYWN0ZXIpXG4gICAgdmFyIHNldExpc3RlbmVyVmVsb2NpdHkgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldFZlbG9jaXR5KGNvbnRleHQubGlzdGVuZXIsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gcHVibGljIG1ldGhvZHNcbiAgICB2YXIgZXhwb3J0cyA9IHtcbiAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgc2V0WDogc2V0WCxcbiAgICAgICAgc2V0U291cmNlUG9zaXRpb246IHNldFNvdXJjZVBvc2l0aW9uLFxuICAgICAgICBzZXRTb3VyY2VPcmllbnRhdGlvbjogc2V0U291cmNlT3JpZW50YXRpb24sXG4gICAgICAgIHNldFNvdXJjZVZlbG9jaXR5OiBzZXRTb3VyY2VWZWxvY2l0eSxcbiAgICAgICAgc2V0TGlzdGVuZXJQb3NpdGlvbjogc2V0TGlzdGVuZXJQb3NpdGlvbixcbiAgICAgICAgc2V0TGlzdGVuZXJPcmllbnRhdGlvbjogc2V0TGlzdGVuZXJPcmllbnRhdGlvbixcbiAgICAgICAgc2V0TGlzdGVuZXJWZWxvY2l0eTogc2V0TGlzdGVuZXJWZWxvY2l0eSxcbiAgICAgICAgY2FsY3VsYXRlVmVsb2NpdHk6IGNhbGN1bGF0ZVZlbG9jaXR5LFxuICAgICAgICAvLyBtYXAgbmF0aXZlIG1ldGhvZHMgb2YgUGFubmVyTm9kZVxuICAgICAgICBzZXRQb3NpdGlvbjogbm9kZS5zZXRQb3NpdGlvbi5iaW5kKG5vZGUpLFxuICAgICAgICBzZXRPcmllbnRhdGlvbjogbm9kZS5zZXRPcmllbnRhdGlvbi5iaW5kKG5vZGUpLFxuICAgICAgICBzZXRWZWxvY2l0eTogbm9kZS5zZXRWZWxvY2l0eS5iaW5kKG5vZGUpLFxuICAgICAgICAvLyBtYXAgbmF0aXZlIG1ldGhvZHMgb2YgQXVkaW9Ob2RlXG4gICAgICAgIGNvbm5lY3Q6IG5vZGUuY29ubmVjdC5iaW5kKG5vZGUpLFxuICAgICAgICBkaXNjb25uZWN0OiBub2RlLmRpc2Nvbm5lY3QuYmluZChub2RlKVxuICAgIH07XG5cbiAgICAvLyBtYXAgbmF0aXZlIHByb3BlcnRpZXMgb2YgUGFubmVyTm9kZVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKGV4cG9ydHMsIHtcbiAgICAgICAgJ3Bhbm5pbmdNb2RlbCc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLnBhbm5pbmdNb2RlbDsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbm9kZS5wYW5uaW5nTW9kZWwgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICAnZGlzdGFuY2VNb2RlbCc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLmRpc3RhbmNlTW9kZWw7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IG5vZGUuZGlzdGFuY2VNb2RlbCA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgICdyZWZEaXN0YW5jZSc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLnJlZkRpc3RhbmNlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLnJlZkRpc3RhbmNlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgJ21heERpc3RhbmNlJzoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG5vZGUubWF4RGlzdGFuY2U7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IG5vZGUubWF4RGlzdGFuY2UgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICAncm9sbG9mZkZhY3Rvcic6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLnJvbGxvZmZGYWN0b3I7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IG5vZGUucm9sbG9mZkZhY3RvciA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgICdjb25lSW5uZXJBbmdsZSc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLmNvbmVJbm5lckFuZ2xlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLmNvbmVJbm5lckFuZ2xlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgJ2NvbmVPdXRlckFuZ2xlJzoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG5vZGUuY29uZU91dGVyQW5nbGU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IG5vZGUuY29uZU91dGVyQW5nbGUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICAnY29uZU91dGVyR2Fpbic6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLmNvbmVPdXRlckdhaW47IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IG5vZGUuY29uZU91dGVyR2FpbiA9IHZhbHVlOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKGV4cG9ydHMpO1xufVxuKi9cbmZ1bmN0aW9uIFBhbm5lcihjb250ZXh0KSB7XG4gICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZVBhbm5lcigpO1xuICAgIC8vIERlZmF1bHQgZm9yIHN0ZXJlbyBpcyAnSFJURicgY2FuIGFsc28gYmUgJ2VxdWFscG93ZXInXG4gICAgbm9kZS5wYW5uaW5nTW9kZWwgPSBQYW5uZXIuZGVmYXVsdHMucGFubmluZ01vZGVsO1xuXG4gICAgLy8gRGlzdGFuY2UgbW9kZWwgYW5kIGF0dHJpYnV0ZXNcbiAgICAvLyBDYW4gYmUgJ2xpbmVhcicgJ2ludmVyc2UnICdleHBvbmVudGlhbCdcbiAgICBub2RlLmRpc3RhbmNlTW9kZWwgPSBQYW5uZXIuZGVmYXVsdHMuZGlzdGFuY2VNb2RlbDtcbiAgICBub2RlLnJlZkRpc3RhbmNlID0gUGFubmVyLmRlZmF1bHRzLnJlZkRpc3RhbmNlO1xuICAgIG5vZGUubWF4RGlzdGFuY2UgPSBQYW5uZXIuZGVmYXVsdHMubWF4RGlzdGFuY2U7XG4gICAgbm9kZS5yb2xsb2ZmRmFjdG9yID0gUGFubmVyLmRlZmF1bHRzLnJvbGxvZmZGYWN0b3I7XG4gICAgbm9kZS5jb25lSW5uZXJBbmdsZSA9IFBhbm5lci5kZWZhdWx0cy5jb25lSW5uZXJBbmdsZTtcbiAgICBub2RlLmNvbmVPdXRlckFuZ2xlID0gUGFubmVyLmRlZmF1bHRzLmNvbmVPdXRlckFuZ2xlO1xuICAgIG5vZGUuY29uZU91dGVyR2FpbiA9IFBhbm5lci5kZWZhdWx0cy5jb25lT3V0ZXJHYWluO1xuICAgIFxuICAgIC8vIHNpbXBsZSB2ZWMzIG9iamVjdCBwb29sXG4gICAgdmFyIFZlY1Bvb2wgPSB7XG4gICAgICAgIHBvb2w6IFtdLFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgICAgIHZhciB2ID0gdGhpcy5wb29sLmxlbmd0aCA/IHRoaXMucG9vbC5wb3AoKSA6IHsgeDogMCwgeTogMCwgejogMCB9O1xuICAgICAgICAgICAgLy8gY2hlY2sgaWYgYSB2ZWN0b3IgaGFzIGJlZW4gcGFzc2VkIGluXG4gICAgICAgICAgICBpZih4ICE9PSB1bmRlZmluZWQgJiYgaXNOYU4oeCkgJiYgJ3gnIGluIHggJiYgJ3knIGluIHggJiYgJ3onIGluIHgpIHtcbiAgICAgICAgICAgICAgICB2LnggPSB4LnggfHwgMDtcbiAgICAgICAgICAgICAgICB2LnkgPSB4LnkgfHwgMDtcbiAgICAgICAgICAgICAgICB2LnogPSB4LnogfHwgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHYueCA9IHggfHwgMDtcbiAgICAgICAgICAgICAgICB2LnkgPSB5IHx8IDA7XG4gICAgICAgICAgICAgICAgdi56ID0geiB8fCAwOyAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9LFxuICAgICAgICBkaXNwb3NlOiBmdW5jdGlvbihpbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5wb29sLnB1c2goaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBnbG9iYWxVcCA9IFZlY1Bvb2wuZ2V0KDAsIDEsIDApO1xuXG4gICAgdmFyIHNldE9yaWVudGF0aW9uID0gZnVuY3Rpb24obm9kZSwgZncpIHtcbiAgICAgICAgLy8gc2V0IHRoZSBvcmllbnRhdGlvbiBvZiB0aGUgc291cmNlICh3aGVyZSB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG5cbiAgICAgICAgLy8gY2FsY3VsYXRlIHVwIHZlYyAoIHVwID0gKGZvcndhcmQgY3Jvc3MgKDAsIDEsIDApKSBjcm9zcyBmb3J3YXJkIClcbiAgICAgICAgdmFyIHVwID0gVmVjUG9vbC5nZXQoZncueCwgZncueSwgZncueik7XG4gICAgICAgIGNyb3NzKHVwLCBnbG9iYWxVcCk7XG4gICAgICAgIGNyb3NzKHVwLCBmdyk7XG4gICAgICAgIG5vcm1hbGl6ZSh1cCk7XG4gICAgICAgIG5vcm1hbGl6ZShmdyk7XG5cbiAgICAgICAgLy8gc2V0IHRoZSBhdWRpbyBjb250ZXh0J3MgbGlzdGVuZXIgcG9zaXRpb24gdG8gbWF0Y2ggdGhlIGNhbWVyYSBwb3NpdGlvblxuICAgICAgICBub2RlLnNldE9yaWVudGF0aW9uKGZ3LngsIGZ3LnksIGZ3LnosIHVwLngsIHVwLnksIHVwLnopO1xuXG4gICAgICAgIC8vIHJldHVybiB0aGUgdmVjcyB0byB0aGUgcG9vbFxuICAgICAgICBWZWNQb29sLmRpc3Bvc2UoZncpO1xuICAgICAgICBWZWNQb29sLmRpc3Bvc2UodXApO1xuICAgIH07XG5cbiAgICB2YXIgc2V0UG9zaXRpb24gPSBmdW5jdGlvbihub2RlLCB2ZWMpIHtcbiAgICAgICAgbm9kZS5zZXRQb3NpdGlvbih2ZWMueCwgdmVjLnksIHZlYy56KTtcbiAgICAgICAgVmVjUG9vbC5kaXNwb3NlKHZlYyk7XG4gICAgfTtcblxuICAgIHZhciBzZXRWZWxvY2l0eSA9IGZ1bmN0aW9uKG5vZGUsIHZlYykge1xuICAgICAgICBub2RlLnNldFZlbG9jaXR5KHZlYy54LCB2ZWMueSwgdmVjLnopO1xuICAgICAgICBWZWNQb29sLmRpc3Bvc2UodmVjKTtcbiAgICB9O1xuXG4gICAgLy8gY3Jvc3MgcHJvZHVjdCBvZiAyIHZlY3RvcnNcbiAgICB2YXIgY3Jvc3MgPSBmdW5jdGlvbiAoIGEsIGIgKSB7XG4gICAgICAgIHZhciBheCA9IGEueCwgYXkgPSBhLnksIGF6ID0gYS56O1xuICAgICAgICB2YXIgYnggPSBiLngsIGJ5ID0gYi55LCBieiA9IGIuejtcbiAgICAgICAgYS54ID0gYXkgKiBieiAtIGF6ICogYnk7XG4gICAgICAgIGEueSA9IGF6ICogYnggLSBheCAqIGJ6O1xuICAgICAgICBhLnogPSBheCAqIGJ5IC0gYXkgKiBieDtcbiAgICB9O1xuXG4gICAgLy8gbm9ybWFsaXNlIHRvIHVuaXQgdmVjdG9yXG4gICAgdmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uICh2ZWMzKSB7XG4gICAgICAgIGlmKHZlYzMueCA9PT0gMCAmJiB2ZWMzLnkgPT09IDAgJiYgdmVjMy56ID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdmVjMztcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KCB2ZWMzLnggKiB2ZWMzLnggKyB2ZWMzLnkgKiB2ZWMzLnkgKyB2ZWMzLnogKiB2ZWMzLnogKTtcbiAgICAgICAgdmFyIGludlNjYWxhciA9IDEgLyBsZW5ndGg7XG4gICAgICAgIHZlYzMueCAqPSBpbnZTY2FsYXI7XG4gICAgICAgIHZlYzMueSAqPSBpbnZTY2FsYXI7XG4gICAgICAgIHZlYzMueiAqPSBpbnZTY2FsYXI7XG4gICAgICAgIHJldHVybiB2ZWMzO1xuICAgIH07XG5cbiAgICAvLyBwYW4gbGVmdCB0byByaWdodCB3aXRoIHZhbHVlIGZyb20gLTEgdG8gMVxuICAgIC8vIGNyZWF0ZXMgYSBuaWNlIGN1cnZlIHdpdGggelxuICAgIG5vZGUuc2V0WCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHZhciBkZWc0NSA9IE1hdGguUEkgLyA0LFxuICAgICAgICAgICAgZGVnOTAgPSBkZWc0NSAqIDIsXG4gICAgICAgICAgICB4ID0gdmFsdWUgKiBkZWc0NSxcbiAgICAgICAgICAgIHogPSB4ICsgZGVnOTA7XG5cbiAgICAgICAgaWYgKHogPiBkZWc5MCkge1xuICAgICAgICAgICAgeiA9IE1hdGguUEkgLSB6O1xuICAgICAgICB9XG5cbiAgICAgICAgeCA9IE1hdGguc2luKHgpO1xuICAgICAgICB6ID0gTWF0aC5zaW4oeik7XG5cbiAgICAgICAgbm9kZS5zZXRQb3NpdGlvbih4LCAwLCB6KTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSBwb3NpdGlvbiB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG4gICAgbm9kZS5zZXRTb3VyY2VQb3NpdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0UG9zaXRpb24obm9kZSwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIGRpcmVjdGlvbiB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG4gICAgbm9kZS5zZXRTb3VyY2VPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0T3JpZW50YXRpb24obm9kZSwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHZlbG9pY3R5IG9mIHRoZSBhdWRpbyBzb3VyY2UgKGlmIG1vdmluZylcbiAgICBub2RlLnNldFNvdXJjZVZlbG9jaXR5ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRWZWxvY2l0eShub2RlLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIHNldCB0aGUgcG9zaXRpb24gb2Ygd2hvIG9yIHdoYXQgaXMgaGVhcmluZyB0aGUgYXVkaW8gKGNvdWxkIGJlIGNhbWVyYSBvciBzb21lIGNoYXJhY3RlcilcbiAgICBub2RlLnNldExpc3RlbmVyUG9zaXRpb24gPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldFBvc2l0aW9uKGNvbnRleHQubGlzdGVuZXIsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSBwb3NpdGlvbiBvZiB3aG8gb3Igd2hhdCBpcyBoZWFyaW5nIHRoZSBhdWRpbyAoY291bGQgYmUgY2FtZXJhIG9yIHNvbWUgY2hhcmFjdGVyKVxuICAgIG5vZGUuc2V0TGlzdGVuZXJPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0T3JpZW50YXRpb24oY29udGV4dC5saXN0ZW5lciwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHZlbG9jaXR5IChpZiBtb3ZpbmcpIG9mIHdobyBvciB3aGF0IGlzIGhlYXJpbmcgdGhlIGF1ZGlvIChjb3VsZCBiZSBjYW1lcmEgb3Igc29tZSBjaGFyYWN0ZXIpXG4gICAgbm9kZS5zZXRMaXN0ZW5lclZlbG9jaXR5ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRWZWxvY2l0eShjb250ZXh0Lmxpc3RlbmVyLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIGhlbHBlciB0byBjYWxjdWxhdGUgdmVsb2NpdHlcbiAgICBub2RlLmNhbGN1bGF0ZVZlbG9jaXR5ID0gZnVuY3Rpb24oY3VycmVudFBvc2l0aW9uLCBsYXN0UG9zaXRpb24sIGRlbHRhVGltZSkge1xuICAgICAgICB2YXIgZHggPSBjdXJyZW50UG9zaXRpb24ueCAtIGxhc3RQb3NpdGlvbi54O1xuICAgICAgICB2YXIgZHkgPSBjdXJyZW50UG9zaXRpb24ueSAtIGxhc3RQb3NpdGlvbi55O1xuICAgICAgICB2YXIgZHogPSBjdXJyZW50UG9zaXRpb24ueiAtIGxhc3RQb3NpdGlvbi56O1xuICAgICAgICByZXR1cm4gVmVjUG9vbC5nZXQoZHggLyBkZWx0YVRpbWUsIGR5IC8gZGVsdGFUaW1lLCBkeiAvIGRlbHRhVGltZSk7XG4gICAgfTtcblxuICAgIG5vZGUuc2V0RGVmYXVsdHMgPSBmdW5jdGlvbihkZWZhdWx0cykge1xuICAgICAgICBPYmplY3Qua2V5cyhkZWZhdWx0cykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIFBhbm5lci5kZWZhdWx0c1trZXldID0gZGVmYXVsdHNba2V5XTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5QYW5uZXIuZGVmYXVsdHMgPSB7XG4gICAgcGFubmluZ01vZGVsOiAnSFJURicsXG4gICAgZGlzdGFuY2VNb2RlbDogJ2xpbmVhcicsXG4gICAgcmVmRGlzdGFuY2U6IDEsXG4gICAgbWF4RGlzdGFuY2U6IDEwMDAsXG4gICAgcm9sbG9mZkZhY3RvcjogMSxcbiAgICBjb25lSW5uZXJBbmdsZTogMzYwLFxuICAgIGNvbmVPdXRlckFuZ2xlOiAwLFxuICAgIGNvbmVPdXRlckdhaW46IDBcbn07XG5cbi8qXG4gKiBFeHBvcnRzXG4gKi9cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBQYW5uZXI7XG59XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUGhhc2VyKGNvbnRleHQsIGdhaW4pIHtcbiAgICB2YXIgc3RhZ2VzID0gNCxcbiAgICAgICAgbGZvRnJlcXVlbmN5ID0gOCxcbiAgICAgICAgbGZvR2FpblZhbHVlID0gZ2FpbiB8fCAyMCxcbiAgICAgICAgZmVlZGJhY2sgPSAwLjUsXG4gICAgICAgIGZpbHRlcixcbiAgICAgICAgZmlsdGVycyA9IFtdO1xuXG4gICAgdmFyIGxmbyA9IGNvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgIGxmby50eXBlID0gJ3NpbmUnO1xuICAgIGxmby5mcmVxdWVuY3kudmFsdWUgPSBsZm9GcmVxdWVuY3k7XG4gICAgdmFyIGxmb0dhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICBsZm9HYWluLmdhaW4udmFsdWUgPSBsZm9HYWluVmFsdWU7XG4gICAgbGZvLmNvbm5lY3QobGZvR2Fpbik7XG4gICAgbGZvLnN0YXJ0KCk7XG5cbiAgICB2YXIgZmVlZGJhY2tHYWluID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgZmVlZGJhY2tHYWluLmdhaW4udmFsdWUgPSBmZWVkYmFjaztcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhZ2VzOyBpKyspIHtcbiAgICAgICAgZmlsdGVyID0gY29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICAgICAgZmlsdGVyLnR5cGUgPSAnYWxscGFzcyc7XG4gICAgICAgIGZpbHRlcnMucHVzaChmaWx0ZXIpO1xuICAgICAgICAvL2ZpbHRlci5RLnZhbHVlID0gMTAwO1xuICAgICAgICBpZihpID4gMCkge1xuICAgICAgICAgICAgZmlsdGVyc1tpLTFdLmNvbm5lY3QoZmlsdGVyc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgbGZvR2Fpbi5jb25uZWN0KGZpbHRlcnNbaV0uZnJlcXVlbmN5KTtcbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9IGZpbHRlcnNbMF07XG4gICAgbm9kZS5fb3V0ID0gZmlsdGVyc1tmaWx0ZXJzLmxlbmd0aCAtIDFdO1xuXG4gICAgbm9kZS5fY29ubmVjdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIFsncGhhc2VyIGNvbm5lY3RlZCddKTtcbiAgICAgICAgdGhpcy5fb3V0LmNvbm5lY3QoZmVlZGJhY2tHYWluKTtcbiAgICAgICAgZmVlZGJhY2tHYWluLmNvbm5lY3Qobm9kZSk7XG4gICAgfTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gUGhhc2VyO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBSZWNvcmRlcihjb250ZXh0LCBwYXNzVGhyb3VnaCkge1xuICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoNDA5NiwgMiwgMiksXG4gICAgICAgIGJ1ZmZlcnNMID0gW10sXG4gICAgICAgIGJ1ZmZlcnNSID0gW10sXG4gICAgICAgIHN0YXJ0ZWRBdCA9IDAsXG4gICAgICAgIHN0b3BwZWRBdCA9IDA7XG5cbiAgICBpZihwYXNzVGhyb3VnaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBhc3NUaHJvdWdoID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBub2RlLmlzUmVjb3JkaW5nID0gZmFsc2U7XG5cbiAgICB2YXIgZ2V0QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBidWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigyLCBidWZmZXJzTC5sZW5ndGgsIGNvbnRleHQuc2FtcGxlUmF0ZSk7XG4gICAgICAgIGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoYnVmZmVyc0wpO1xuICAgICAgICBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KGJ1ZmZlcnNSKTtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9O1xuXG4gICAgbm9kZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBidWZmZXJzTC5sZW5ndGggPSAwO1xuICAgICAgICBidWZmZXJzUi5sZW5ndGggPSAwO1xuICAgICAgICBzdGFydGVkQXQgPSBjb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgICAgICBzdG9wcGVkQXQgPSAwO1xuICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgbm9kZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0b3BwZWRBdCA9IGNvbnRleHQuY3VycmVudFRpbWU7XG4gICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGdldEJ1ZmZlcigpO1xuICAgIH07XG5cbiAgICBub2RlLmdldER1cmF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLmlzUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RvcHBlZEF0IC0gc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb250ZXh0LmN1cnJlbnRUaW1lIC0gc3RhcnRlZEF0O1xuICAgIH07XG5cbiAgICBub2RlLm9uYXVkaW9wcm9jZXNzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHZhciBpbnB1dEwgPSBldmVudC5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKSxcbiAgICAgICAgICAgIGlucHV0UiA9IGV2ZW50LmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApLFxuICAgICAgICAgICAgb3V0cHV0TCA9IGV2ZW50Lm91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKSxcbiAgICAgICAgICAgIG91dHB1dFIgPSBldmVudC5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG5cbiAgICAgICAgaWYocGFzc1Rocm91Z2gpIHtcbiAgICAgICAgICAgIG91dHB1dEwuc2V0KGlucHV0TCk7XG4gICAgICAgICAgICBvdXRwdXRSLnNldChpbnB1dFIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodGhpcy5pc1JlY29yZGluZykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbnB1dEwubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBidWZmZXJzTC5wdXNoKGlucHV0TFtpXSk7XG4gICAgICAgICAgICAgICAgYnVmZmVyc1IucHVzaChpbnB1dFJbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIG5vZGUuX2Nvbm5lY3RlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY29yZGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKmZ1bmN0aW9uIFJldmVyYihjb250ZXh0LCBzZWNvbmRzLCBkZWNheSwgcmV2ZXJzZSkge1xuICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVDb252b2x2ZXIoKTtcblxuICAgIHZhciB1cGRhdGUgPSBmdW5jdGlvbihzZWNvbmRzLCBkZWNheSwgcmV2ZXJzZSkge1xuICAgICAgICBzZWNvbmRzID0gc2Vjb25kcyB8fCAxO1xuICAgICAgICBkZWNheSA9IGRlY2F5IHx8IDU7XG4gICAgICAgIHJldmVyc2UgPSAhIXJldmVyc2U7XG5cbiAgICAgICAgdmFyIG51bUNoYW5uZWxzID0gMixcbiAgICAgICAgICAgIHJhdGUgPSBjb250ZXh0LnNhbXBsZVJhdGUsXG4gICAgICAgICAgICBsZW5ndGggPSByYXRlICogc2Vjb25kcyxcbiAgICAgICAgICAgIGltcHVsc2VSZXNwb25zZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKG51bUNoYW5uZWxzLCBsZW5ndGgsIHJhdGUpLFxuICAgICAgICAgICAgbGVmdCA9IGltcHVsc2VSZXNwb25zZS5nZXRDaGFubmVsRGF0YSgwKSxcbiAgICAgICAgICAgIHJpZ2h0ID0gaW1wdWxzZVJlc3BvbnNlLmdldENoYW5uZWxEYXRhKDEpLFxuICAgICAgICAgICAgbiwgZTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBuID0gcmV2ZXJzZSA/IGxlbmd0aCAtIDEgOiBpO1xuICAgICAgICAgICAgZSA9IE1hdGgucG93KDEgLSBuIC8gbGVuZ3RoLCBkZWNheSk7XG4gICAgICAgICAgICBsZWZ0W2ldID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBlO1xuICAgICAgICAgICAgcmlnaHRbaV0gPSAoTWF0aC5yYW5kb20oKSAqIDIgLSAxKSAqIGU7XG4gICAgICAgIH1cblxuICAgICAgICBub2RlLmJ1ZmZlciA9IGltcHVsc2VSZXNwb25zZTtcbiAgICB9O1xuXG4gICAgdXBkYXRlKHNlY29uZHMsIGRlY2F5LCByZXZlcnNlKTtcblxuICAgIC8vIHB1YmxpYyBtZXRob2RzXG4gICAgdmFyIGV4cG9ydHMgPSB7XG4gICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgIHVwZGF0ZTogdXBkYXRlLFxuICAgICAgICAvLyBtYXAgbmF0aXZlIG1ldGhvZHMgb2YgQ29udm9sdmVyTm9kZVxuICAgICAgICBjb25uZWN0OiBub2RlLmNvbm5lY3QuYmluZChub2RlKSxcbiAgICAgICAgZGlzY29ubmVjdDogbm9kZS5kaXNjb25uZWN0LmJpbmQobm9kZSlcbiAgICB9O1xuXG4gICAgLy8gbWFwIG5hdGl2ZSBwcm9wZXJ0aWVzIG9mIFJldmVyYk5vZGVcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhleHBvcnRzLCB7XG4gICAgICAgICdidWZmZXInOiB7XG4gICAgICAgICAgICAvLyB0cnVlIG9yIGZhbHNlXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5idWZmZXI7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IG5vZGUuYnVmZmVyID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgJ25vcm1hbGl6ZSc6IHtcbiAgICAgICAgICAgIC8vIHRydWUgb3IgZmFsc2VcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLm5vcm1hbGl6ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbm9kZS5ub3JtYWxpemUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZShleHBvcnRzKTtcbn0qL1xuXG5mdW5jdGlvbiBSZXZlcmIoY29udGV4dCwgdGltZSwgZGVjYXksIHJldmVyc2UpIHtcbiAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlQ29udm9sdmVyKCk7XG5cbiAgICBub2RlLnVwZGF0ZSA9IGZ1bmN0aW9uKHRpbWUsIGRlY2F5LCByZXZlcnNlKSB7XG4gICAgICAgIHRpbWUgPSB0aW1lIHx8IDE7XG4gICAgICAgIGRlY2F5ID0gZGVjYXkgfHwgNTtcbiAgICAgICAgcmV2ZXJzZSA9ICEhcmV2ZXJzZTtcblxuICAgICAgICB2YXIgbnVtQ2hhbm5lbHMgPSAyLFxuICAgICAgICAgICAgcmF0ZSA9IGNvbnRleHQuc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgIGxlbmd0aCA9IHJhdGUgKiB0aW1lLFxuICAgICAgICAgICAgaW1wdWxzZVJlc3BvbnNlID0gY29udGV4dC5jcmVhdGVCdWZmZXIobnVtQ2hhbm5lbHMsIGxlbmd0aCwgcmF0ZSksXG4gICAgICAgICAgICBsZWZ0ID0gaW1wdWxzZVJlc3BvbnNlLmdldENoYW5uZWxEYXRhKDApLFxuICAgICAgICAgICAgcmlnaHQgPSBpbXB1bHNlUmVzcG9uc2UuZ2V0Q2hhbm5lbERhdGEoMSksXG4gICAgICAgICAgICBuLCBlO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG4gPSByZXZlcnNlID8gbGVuZ3RoIC0gMSA6IGk7XG4gICAgICAgICAgICBlID0gTWF0aC5wb3coMSAtIG4gLyBsZW5ndGgsIGRlY2F5KTtcbiAgICAgICAgICAgIGxlZnRbaV0gPSAoTWF0aC5yYW5kb20oKSAqIDIgLSAxKSAqIGU7XG4gICAgICAgICAgICByaWdodFtpXSA9IChNYXRoLnJhbmRvbSgpICogMiAtIDEpICogZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYnVmZmVyID0gaW1wdWxzZVJlc3BvbnNlO1xuICAgIH07XG5cbiAgICBub2RlLnVwZGF0ZSh0aW1lLCBkZWNheSwgcmV2ZXJzZSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFJldmVyYjtcbn1cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQnVmZmVyU291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2UvYnVmZmVyLXNvdXJjZS5qcycpLFxuICAgIE1lZGlhU291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2UvbWVkaWEtc291cmNlLmpzJyksXG4gICAgTWljcm9waG9uZVNvdXJjZSA9IHJlcXVpcmUoJy4vc291cmNlL21pY3JvcGhvbmUtc291cmNlLmpzJyksXG4gICAgTm9kZU1hbmFnZXIgPSByZXF1aXJlKCcuL25vZGUtbWFuYWdlci5qcycpLFxuICAgIE9zY2lsbGF0b3JTb3VyY2UgPSByZXF1aXJlKCcuL3NvdXJjZS9vc2NpbGxhdG9yLXNvdXJjZS5qcycpLFxuICAgIFNjcmlwdFNvdXJjZSA9IHJlcXVpcmUoJy4vc291cmNlL3NjcmlwdC1zb3VyY2UuanMnKSxcbiAgICBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuZnVuY3Rpb24gU291bmQoY29udGV4dCwgZGVzdGluYXRpb24pIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZGF0YSA9IG51bGw7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5fbG9vcCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5V2hlblJlYWR5ID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlID0gbnVsbDtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xuXG4gICAgdGhpcy5fbm9kZSA9IG5ldyBOb2RlTWFuYWdlcih0aGlzLl9jb250ZXh0KTtcbiAgICB0aGlzLl9nYWluID0gdGhpcy5fbm9kZS5nYWluKCk7XG4gICAgaWYodGhpcy5fY29udGV4dCkge1xuICAgICAgICB0aGlzLl9ub2RlLnNldERlc3RpbmF0aW9uKHRoaXMuX2dhaW4pO1xuICAgICAgICB0aGlzLl9nYWluLmNvbm5lY3QoZGVzdGluYXRpb24gfHwgdGhpcy5fY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfVxufVxuXG5Tb3VuZC5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBpZighZGF0YSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuX2RhdGEgPSBkYXRhOyAvLyBBdWRpb0J1ZmZlciwgTWVkaWFFbGVtZW50LCBldGNcblxuICAgIGlmKFV0aWxzLmlzQXVkaW9CdWZmZXIoZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IEJ1ZmZlclNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZihVdGlscy5pc01lZGlhRWxlbWVudChkYXRhKSkge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgTWVkaWFTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2UgaWYoVXRpbHMuaXNNZWRpYVN0cmVhbShkYXRhKSkge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgTWljcm9waG9uZVNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZihVdGlscy5pc09zY2lsbGF0b3JUeXBlKGRhdGEpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBPc2NpbGxhdG9yU291cmNlKGRhdGEsIHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbiAgICBlbHNlIGlmKFV0aWxzLmlzU2NyaXB0Q29uZmlnKGRhdGEpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBTY3JpcHRTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBkZXRlY3QgZGF0YSB0eXBlOiAnICsgZGF0YSk7XG4gICAgfVxuXG4gICAgdGhpcy5fbm9kZS5zZXRTb3VyY2UodGhpcy5fc291cmNlLnNvdXJjZU5vZGUpO1xuXG4gICAgaWYodHlwZW9mIHRoaXMuX3NvdXJjZS5vbkVuZGVkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZS5vbkVuZGVkKHRoaXMuX2VuZGVkSGFuZGxlciwgdGhpcyk7XG4gICAgfVxuXG4gICAgLy8gc2hvdWxkIHRoaXMgdGFrZSBhY2NvdW50IG9mIGRlbGF5IGFuZCBvZmZzZXQ/XG4gICAgaWYodGhpcy5fcGxheVdoZW5SZWFkeSkge1xuICAgICAgICB0aGlzLnBsYXkoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5LCBvZmZzZXQpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7XG4gICAgICAgIHRoaXMuX3BsYXlXaGVuUmVhZHkgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdGhpcy5fbm9kZS5zZXRTb3VyY2UodGhpcy5fc291cmNlLnNvdXJjZU5vZGUpO1xuICAgIHRoaXMuX3NvdXJjZS5sb29wID0gdGhpcy5fbG9vcDtcblxuICAgIC8vIHVwZGF0ZSB2b2x1bWUgbmVlZGVkIGZvciBubyB3ZWJhdWRpb1xuICAgIGlmKCF0aGlzLl9jb250ZXh0KSB7IHRoaXMudm9sdW1lID0gdGhpcy52b2x1bWU7IH1cblxuICAgIHRoaXMuX3NvdXJjZS5wbGF5KGRlbGF5LCBvZmZzZXQpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7IHJldHVybiB0aGlzOyB9XG4gICAgdGhpcy5fc291cmNlLnBhdXNlKCk7XG4gICAgcmV0dXJuIHRoaXM7ICBcbn07XG5cblNvdW5kLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuX3NvdXJjZS5zdG9wKCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUuc2VlayA9IGZ1bmN0aW9uKHBlcmNlbnQpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7IHJldHVybiB0aGlzOyB9XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5wbGF5KDAsIHRoaXMuX3NvdXJjZS5kdXJhdGlvbiAqIHBlcmNlbnQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUub25FbmRlZCA9IGZ1bmN0aW9uKGZuLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IGZuID8gZm4uYmluZChjb250ZXh0IHx8IHRoaXMpIDogbnVsbDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvdW5kLnByb3RvdHlwZS5fZW5kZWRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodHlwZW9mIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayh0aGlzKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnY29udGV4dCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuY3VycmVudFRpbWUgOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnZGF0YScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGF0YTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuZHVyYXRpb24gOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnZW5kZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5lbmRlZCA6IGZhbHNlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnZ2FpbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2FpbjtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2xvb3AnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvb3A7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2xvb3AgPSAhIXZhbHVlO1xuICAgICAgICBpZih0aGlzLl9zb3VyY2UpIHtcbiAgICAgICAgICB0aGlzLl9zb3VyY2UubG9vcCA9IHRoaXMuX2xvb3A7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ25vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX25vZGU7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wYXVzZWQgOiBmYWxzZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ3BsYXlpbmcnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wbGF5aW5nIDogZmFsc2U7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdwcm9ncmVzcycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLnByb2dyZXNzIDogMDtcbiAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICd2b2x1bWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dhaW4uZ2Fpbi52YWx1ZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYoaXNOYU4odmFsdWUpKSB7IHJldHVybjsgfVxuXG4gICAgICAgIHRoaXMuX2dhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuXG4gICAgICAgIGlmKHRoaXMuX2RhdGEgJiYgdGhpcy5fZGF0YS52b2x1bWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5fZGF0YS52b2x1bWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG4vLyBmb3Igb3NjaWxsYXRvclxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnZnJlcXVlbmN5Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuZnJlcXVlbmN5IDogMDtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYodGhpcy5fc291cmNlKSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2UuZnJlcXVlbmN5ID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFNvdW5kO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBCdWZmZXJTb3VyY2UoYnVmZmVyLCBjb250ZXh0KSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2J1ZmZlciA9IGJ1ZmZlcjsgLy8gQXJyYXlCdWZmZXJcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX2xvb3AgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBCdWZmZXJTb3VyY2VOb2RlXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn1cblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXksIG9mZnNldCkge1xuICAgIGlmKHRoaXMuX3BsYXlpbmcpIHsgcmV0dXJuOyB9XG4gICAgaWYoZGVsYXkgPT09IHVuZGVmaW5lZCkgeyBkZWxheSA9IDA7IH1cbiAgICBpZihkZWxheSA+IDApIHsgZGVsYXkgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZGVsYXk7IH1cblxuICAgIGlmKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7IG9mZnNldCA9IDA7IH1cbiAgICBpZih0aGlzLl9wYXVzZWRBdCA+IDApIHsgb2Zmc2V0ID0gb2Zmc2V0ICsgdGhpcy5fcGF1c2VkQXQ7IH1cbiAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBbJzEgb2Zmc2V0OicsIG9mZnNldF0pO1xuICAgIHdoaWxlKG9mZnNldCA+IHRoaXMuZHVyYXRpb24pIHsgb2Zmc2V0ID0gb2Zmc2V0ICUgdGhpcy5kdXJhdGlvbjsgfVxuICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIFsnMiBvZmZzZXQ6Jywgb2Zmc2V0XSk7XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUubG9vcCA9IHRoaXMuX2xvb3A7XG4gICAgdGhpcy5zb3VyY2VOb2RlLm9uZW5kZWQgPSB0aGlzLl9lbmRlZEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICB0aGlzLnNvdXJjZU5vZGUuc3RhcnQoZGVsYXksIG9mZnNldCk7XG5cbiAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fcGF1c2VkQXQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gb2Zmc2V0O1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xufTtcblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IGVsYXBzZWQ7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUub25lbmRlZCA9IG51bGw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuc3RvcCgwKTtcbiAgICAgICAgfSBjYXRjaChlKSB7fVxuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59O1xuXG4vKlxuICogRW5kZWQgaGFuZGxlclxuICovXG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUub25FbmRlZCA9IGZ1bmN0aW9uKGZuLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IGZuID8gZm4uYmluZChjb250ZXh0IHx8IHRoaXMpIDogbnVsbDtcbn07XG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUuX2VuZGVkSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICBpZih0eXBlb2YgdGhpcy5fZW5kZWRDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9lbmRlZENhbGxiYWNrKHRoaXMpO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9idWZmZXIgPyB0aGlzLl9idWZmZXIuZHVyYXRpb24gOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2VuZGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmRlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdsb29wJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9sb29wID0gISF2YWx1ZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3Byb2dyZXNzJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLm1pbih0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbiwgMSk7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3NvdXJjZU5vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5idWZmZXIgPSB0aGlzLl9idWZmZXI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgfVxufSk7XG5cblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEJ1ZmZlclNvdXJjZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWVkaWFTb3VyY2UoZWwsIGNvbnRleHQpIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZWwgPSBlbDsgLy8gSFRNTE1lZGlhRWxlbWVudFxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQgPSB0aGlzLl9lbmRlZEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICB0aGlzLl9sb29wID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBNZWRpYUVsZW1lbnRTb3VyY2VOb2RlXG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXksIG9mZnNldCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9kZWxheVRpbWVvdXQpO1xuXG4gICAgdGhpcy52b2x1bWUgPSB0aGlzLl92b2x1bWU7XG5cbiAgICBpZihvZmZzZXQpIHtcbiAgICAgICAgdGhpcy5fZWwuY3VycmVudFRpbWUgPSBvZmZzZXQ7XG4gICAgfVxuXG4gICAgaWYoZGVsYXkpIHtcbiAgICAgICAgdGhpcy5fZGVsYXlUaW1lb3V0ID0gc2V0VGltZW91dCh0aGlzLnBsYXkuYmluZCh0aGlzKSwgZGVsYXkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fZWwucGxheSgpO1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG5cbiAgICB0aGlzLl9lbC5yZW1vdmVFdmVudExpc3RlbmVyKCdlbmRlZCcsIHRoaXMuX2VuZGVkSGFuZGxlckJvdW5kKTtcbiAgICB0aGlzLl9lbC5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIHRoaXMuX2VuZGVkSGFuZGxlckJvdW5kLCBmYWxzZSk7XG59O1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5fZGVsYXlUaW1lb3V0KTtcblxuICAgIGlmKCF0aGlzLl9lbCkgeyByZXR1cm47IH1cblxuICAgIHRoaXMuX2VsLnBhdXNlKCk7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9kZWxheVRpbWVvdXQpO1xuXG4gICAgaWYoIXRoaXMuX2VsKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5fZWwucGF1c2UoKTtcblxuICAgIHRyeSB7XG4gICAgICAgIHRoaXMuX2VsLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgLy8gZml4ZXMgYnVnIHdoZXJlIHNlcnZlciBkb2Vzbid0IHN1cHBvcnQgc2VlazpcbiAgICAgICAgaWYodGhpcy5fZWwuY3VycmVudFRpbWUgPiAwKSB7IHRoaXMuX2VsLmxvYWQoKTsgfSAgICBcbiAgICB9IGNhdGNoKGUpIHt9XG5cbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG59O1xuXG4vKlxuICogRW5kZWQgaGFuZGxlclxuICovXG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5vbkVuZGVkID0gZnVuY3Rpb24oZm4sIGNvbnRleHQpIHtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gZm4gPyBmbi5iaW5kKGNvbnRleHQgfHwgdGhpcykgOiBudWxsO1xufTtcblxuTWVkaWFTb3VyY2UucHJvdG90eXBlLl9lbmRlZEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuXG4gICAgaWYodGhpcy5fbG9vcCkge1xuICAgICAgICB0aGlzLl9lbC5jdXJyZW50VGltZSA9IDA7XG4gICAgICAgIC8vIGZpeGVzIGJ1ZyB3aGVyZSBzZXJ2ZXIgZG9lc24ndCBzdXBwb3J0IHNlZWs6XG4gICAgICAgIGlmKHRoaXMuX2VsLmN1cnJlbnRUaW1lID4gMCkgeyB0aGlzLl9lbC5sb2FkKCk7IH1cbiAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgfSBlbHNlIGlmKHR5cGVvZiB0aGlzLl9lbmRlZENhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sodGhpcyk7XG4gICAgfVxufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbCA/IHRoaXMuX2VsLmN1cnJlbnRUaW1lIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbCA/IHRoaXMuX2VsLmR1cmF0aW9uIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ2VuZGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmRlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ2xvb3AnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvb3A7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2xvb3AgPSB2YWx1ZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAncGxheWluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGxheWluZztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ3Byb2dyZXNzJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbjtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ3NvdXJjZU5vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUgJiYgdGhpcy5fY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlTWVkaWFFbGVtZW50U291cmNlKHRoaXMuX2VsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICB9XG59KTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBNZWRpYVNvdXJjZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWljcm9waG9uZVNvdXJjZShzdHJlYW0sIGNvbnRleHQpIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBNaWNyb3Bob25lU291cmNlTm9kZVxuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG4gICAgdGhpcy5fc3RyZWFtID0gc3RyZWFtO1xufVxuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5NaWNyb3Bob25lU291cmNlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXkpIHtcbiAgICBpZihkZWxheSA9PT0gdW5kZWZpbmVkKSB7IGRlbGF5ID0gMDsgfVxuICAgIGlmKGRlbGF5ID4gMCkgeyBkZWxheSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkZWxheTsgfVxuXG4gICAgdGhpcy5zb3VyY2VOb2RlLnN0YXJ0KGRlbGF5KTtcblxuICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9wYXVzZWRBdDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWU7XG4gICAgfVxuXG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG59O1xuXG5NaWNyb3Bob25lU291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IGVsYXBzZWQ7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5NaWNyb3Bob25lU291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5zdG9wKDApO1xuICAgICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLCAnZW5kZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLCAncGxheWluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGxheWluZztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdzb3VyY2VOb2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZSh0aGlzLl9zdHJlYW0pO1xuICAgICAgICAgICAgLy8gSEFDSzogc3RvcHMgbW96IGdhcmJhZ2UgY29sbGVjdGlvbiBraWxsaW5nIHRoZSBzdHJlYW1cbiAgICAgICAgICAgIC8vIHNlZSBodHRwczovL3N1cHBvcnQubW96aWxsYS5vcmcvZW4tVVMvcXVlc3Rpb25zLzk4NDE3OVxuICAgICAgICAgICAgaWYobmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5tb3pIYWNrID0gdGhpcy5fc291cmNlTm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICB9XG59KTtcblxuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gTWljcm9waG9uZVNvdXJjZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gT3NjaWxsYXRvclNvdXJjZSh0eXBlLCBjb250ZXh0KSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDsgLy8gT3NjaWxsYXRvclNvdXJjZU5vZGVcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xuICAgIHRoaXMuX3R5cGUgPSB0eXBlO1xuICAgIHRoaXMuX2ZyZXF1ZW5jeSA9IDIwMDtcbn1cblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5KSB7XG4gICAgaWYoZGVsYXkgPT09IHVuZGVmaW5lZCkgeyBkZWxheSA9IDA7IH1cbiAgICBpZihkZWxheSA+IDApIHsgZGVsYXkgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZGVsYXk7IH1cblxuICAgIHRoaXMuc291cmNlTm9kZS5zdGFydChkZWxheSk7XG5cbiAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fcGF1c2VkQXQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xufTtcblxuT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxhcHNlZCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSBlbGFwc2VkO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSB0cnVlO1xufTtcblxuT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuc3RvcCgwKTtcbiAgICAgICAgfSBjYXRjaChlKSB7fVxuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5fZW5kZWQgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShPc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZSwgJ2ZyZXF1ZW5jeScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZnJlcXVlbmN5O1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9mcmVxdWVuY3kgPSB2YWx1ZTtcbiAgICAgICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5mcmVxdWVuY3kudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdjdXJyZW50VGltZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZEF0O1xuICAgICAgICB9XG4gICAgICAgIGlmKHRoaXMuX3N0YXJ0ZWRBdCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShPc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdlbmRlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW5kZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShPc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdwcm9ncmVzcycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gMDtcbiAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShPc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZSwgJ3NvdXJjZU5vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUgJiYgdGhpcy5fY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS50eXBlID0gdGhpcy5fdHlwZTtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuZnJlcXVlbmN5LnZhbHVlID0gdGhpcy5fZnJlcXVlbmN5O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgIH1cbn0pO1xuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gT3NjaWxsYXRvclNvdXJjZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU2NyaXB0U291cmNlKGRhdGEsIGNvbnRleHQpIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fYnVmZmVyU2l6ZSA9IGRhdGEuYnVmZmVyU2l6ZSB8fCAxMDI0O1xuICAgIHRoaXMuX2NoYW5uZWxzID0gZGF0YS5jaGFubmVscyB8fCAxO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fb25Qcm9jZXNzID0gZGF0YS5jYWxsYmFjay5iaW5kKGRhdGEudGhpc0FyZyB8fCB0aGlzKTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBTY3JpcHRTb3VyY2VOb2RlXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn1cblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuU2NyaXB0U291cmNlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXkpIHtcbiAgICBpZihkZWxheSA9PT0gdW5kZWZpbmVkKSB7IGRlbGF5ID0gMDsgfVxuICAgIGlmKGRlbGF5ID4gMCkgeyBkZWxheSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkZWxheTsgfVxuXG4gICAgdGhpcy5zb3VyY2VOb2RlLm9uYXVkaW9wcm9jZXNzID0gdGhpcy5fb25Qcm9jZXNzO1xuXG4gICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3BhdXNlZEF0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZTtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcbn07XG5cblNjcmlwdFNvdXJjZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxhcHNlZCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSBlbGFwc2VkO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSB0cnVlO1xufTtcblxuU2NyaXB0U291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLm9uYXVkaW9wcm9jZXNzID0gdGhpcy5fb25QYXVzZWQ7XG4gICAgfVxuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59O1xuXG5TY3JpcHRTb3VyY2UucHJvdG90eXBlLl9vblBhdXNlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgdmFyIGJ1ZmZlciA9IGV2ZW50Lm91dHB1dEJ1ZmZlcjtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGFubmVsID0gYnVmZmVyLmdldENoYW5uZWxEYXRhKGkpO1xuICAgICAgICBmb3IgKHZhciBqID0gMCwgbGVuID0gY2hhbm5lbC5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgICAgICAgY2hhbm5lbFtqXSA9IDA7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYodGhpcy5fc3RhcnRlZEF0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdlbmRlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW5kZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTY3JpcHRTb3VyY2UucHJvdG90eXBlLCAncGF1c2VkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTY3JpcHRTb3VyY2UucHJvdG90eXBlLCAncGxheWluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGxheWluZztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdwcm9ncmVzcycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gMDtcbiAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTY3JpcHRTb3VyY2UucHJvdG90eXBlLCAnc291cmNlTm9kZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKHRoaXMuX2J1ZmZlclNpemUsIDAsIHRoaXMuX2NoYW5uZWxzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICB9XG59KTtcblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFNjcmlwdFNvdXJjZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU3VwcG9ydCgpIHtcbiAgICB2YXIgZXh0ZW5zaW9ucyA9IFtdLFxuICAgICAgICBjYW5QbGF5ID0ge30sXG4gICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcblxuICAgIGlmKCFlbCkgeyByZXR1cm47IH1cblxuICAgIHZhciB0ZXN0cyA9IFtcbiAgICAgICAgeyBleHQ6ICdvZ2cnLCB0eXBlOiAnYXVkaW8vb2dnOyBjb2RlY3M9XCJ2b3JiaXNcIicgfSxcbiAgICAgICAgeyBleHQ6ICdtcDMnLCB0eXBlOiAnYXVkaW8vbXBlZzsnIH0sXG4gICAgICAgIHsgZXh0OiAnb3B1cycsIHR5cGU6ICdhdWRpby9vZ2c7IGNvZGVjcz1cIm9wdXNcIicgfSxcbiAgICAgICAgeyBleHQ6ICd3YXYnLCB0eXBlOiAnYXVkaW8vd2F2OyBjb2RlY3M9XCIxXCInIH0sXG4gICAgICAgIHsgZXh0OiAnbTRhJywgdHlwZTogJ2F1ZGlvL3gtbTRhOycgfSxcbiAgICAgICAgeyBleHQ6ICdtNGEnLCB0eXBlOiAnYXVkaW8vYWFjOycgfVxuICAgIF07XG5cbiAgICB0ZXN0cy5mb3JFYWNoKGZ1bmN0aW9uKHRlc3QpIHtcbiAgICAgICAgdmFyIGNhblBsYXlUeXBlID0gISFlbC5jYW5QbGF5VHlwZSh0ZXN0LnR5cGUpO1xuICAgICAgICBpZihjYW5QbGF5VHlwZSkge1xuICAgICAgICAgICAgZXh0ZW5zaW9ucy5wdXNoKHRlc3QuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBjYW5QbGF5W3Rlc3QuZXh0XSA9IGNhblBsYXlUeXBlO1xuICAgIH0pO1xuXG4gICAgdmFyIGdldEZpbGVFeHRlbnNpb24gPSBmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgdXJsID0gdXJsLnNwbGl0KCc/JylbMF07XG4gICAgICAgIHVybCA9IHVybC5zdWJzdHIodXJsLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcblxuICAgICAgICB2YXIgYSA9IHVybC5zcGxpdCgnLicpO1xuICAgICAgICBpZihhLmxlbmd0aCA9PT0gMSB8fCAoYVswXSA9PT0gJycgJiYgYS5sZW5ndGggPT09IDIpKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGEucG9wKCkudG9Mb3dlckNhc2UoKTtcbiAgICB9O1xuXG4gICAgdmFyIGdldFN1cHBvcnRlZEZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZXMpIHtcbiAgICAgICAgdmFyIG5hbWU7XG5cbiAgICAgICAgaWYoQXJyYXkuaXNBcnJheShmaWxlTmFtZXMpKSB7XG4gICAgICAgICAgICAvLyBpZiBhcnJheSBnZXQgdGhlIGZpcnN0IG9uZSB0aGF0IHdvcmtzXG4gICAgICAgICAgICBmaWxlTmFtZXMuc29tZShmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgdmFyIGV4dCA9IGdldEZpbGVFeHRlbnNpb24oaXRlbSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dGVuc2lvbnMuaW5kZXhPZihleHQpID4gLTE7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHR5cGVvZiBmaWxlTmFtZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBpZiBub3QgYXJyYXkgYW5kIGlzIG9iamVjdFxuICAgICAgICAgICAgT2JqZWN0LmtleXMoZmlsZU5hbWVzKS5zb21lKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBmaWxlTmFtZXNba2V5XTtcbiAgICAgICAgICAgICAgICB2YXIgZXh0ID0gZ2V0RmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0ZW5zaW9ucy5pbmRleE9mKGV4dCkgPiAtMTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIHN0cmluZyBqdXN0IHJldHVyblxuICAgICAgICByZXR1cm4gbmFtZSB8fCBmaWxlTmFtZXM7XG4gICAgfTtcblxuICAgIHZhciBjb250YWluc1VSTCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICBpZighY29uZmlnKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAvLyBzdHJpbmcsIGFycmF5IG9yIG9iamVjdCB3aXRoIHVybCBwcm9wZXJ0eSB0aGF0IGlzIHN0cmluZyBvciBhcnJheVxuICAgICAgICB2YXIgdXJsID0gY29uZmlnLnVybCB8fCBjb25maWc7XG4gICAgICAgIHJldHVybiBpc1VSTCh1cmwpIHx8IChBcnJheS5pc0FycmF5KHVybCkgJiYgaXNVUkwodXJsWzBdKSk7XG4gICAgfTtcblxuICAgIHZhciBpc1VSTCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICEhKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICYmIGRhdGEuaW5kZXhPZignLicpID4gLTEpO1xuICAgIH07XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgIGV4dGVuc2lvbnM6IGV4dGVuc2lvbnMsXG4gICAgICAgIGNhblBsYXk6IGNhblBsYXksXG4gICAgICAgIGdldEZpbGVFeHRlbnNpb246IGdldEZpbGVFeHRlbnNpb24sXG4gICAgICAgIGdldFN1cHBvcnRlZEZpbGU6IGdldFN1cHBvcnRlZEZpbGUsXG4gICAgICAgIGNvbnRhaW5zVVJMOiBjb250YWluc1VSTFxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTdXBwb3J0KCk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBVdGlscyA9IHt9O1xuXG5VdGlscy5zZXRDb250ZXh0ID0gZnVuY3Rpb24oY29udGV4dCkge1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufTtcblxuLypcbiAqIGF1ZGlvIGJ1ZmZlclxuICovXG5cblV0aWxzLmNsb25lQnVmZmVyID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgdmFyIG51bUNoYW5uZWxzID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHMsXG4gICAgICAgIGNsb25lZCA9IHRoaXMuX2NvbnRleHQuY3JlYXRlQnVmZmVyKG51bUNoYW5uZWxzLCBidWZmZXIubGVuZ3RoLCBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1DaGFubmVsczsgaSsrKSB7XG4gICAgICAgIGNsb25lZC5nZXRDaGFubmVsRGF0YShpKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKGkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNsb25lZDtcbn07XG5cblV0aWxzLnJldmVyc2VCdWZmZXIgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgICB2YXIgbnVtQ2hhbm5lbHMgPSBidWZmZXIubnVtYmVyT2ZDaGFubmVscztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUNoYW5uZWxzOyBpKyspIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnJldmVyc2UuY2FsbChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSkpO1xuICAgIH1cbiAgICByZXR1cm4gYnVmZmVyO1xufTtcblxuLypcbiAqIGZhZGUgZ2FpblxuICovXG5cblV0aWxzLmNyb3NzRmFkZSA9IGZ1bmN0aW9uKGZyb21Tb3VuZCwgdG9Tb3VuZCwgZHVyYXRpb24pIHtcbiAgICB2YXIgZnJvbSA9IHRoaXMuaXNBdWRpb1BhcmFtKGZyb21Tb3VuZCkgPyBmcm9tU291bmQgOiBmcm9tU291bmQuZ2Fpbi5nYWluO1xuICAgIHZhciB0byA9IHRoaXMuaXNBdWRpb1BhcmFtKHRvU291bmQpID8gdG9Tb3VuZCA6IHRvU291bmQuZ2Fpbi5nYWluO1xuXG4gICAgZnJvbS5zZXRWYWx1ZUF0VGltZShmcm9tLnZhbHVlLCAwKTtcbiAgICBmcm9tLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKDAsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgdG8uc2V0VmFsdWVBdFRpbWUodG8udmFsdWUsIDApO1xuICAgIHRvLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKDEsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG59O1xuXG5VdGlscy5mYWRlRnJvbSA9IGZ1bmN0aW9uKHNvdW5kLCB2YWx1ZSwgZHVyYXRpb24pIHtcbiAgICB2YXIgcGFyYW0gPSB0aGlzLmlzQXVkaW9QYXJhbShzb3VuZCkgPyBzb3VuZCA6IHNvdW5kLmdhaW4uZ2FpbjtcbiAgICB2YXIgdG9WYWx1ZSA9IHBhcmFtLnZhbHVlO1xuXG4gICAgcGFyYW0uc2V0VmFsdWVBdFRpbWUodmFsdWUsIDApO1xuICAgIHBhcmFtLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKHRvVmFsdWUsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG59O1xuXG5VdGlscy5mYWRlVG8gPSBmdW5jdGlvbihzb3VuZCwgdmFsdWUsIGR1cmF0aW9uKSB7XG4gICAgdmFyIHBhcmFtID0gdGhpcy5pc0F1ZGlvUGFyYW0oc291bmQpID8gc291bmQgOiBzb3VuZC5nYWluLmdhaW47XG5cbiAgICBwYXJhbS5zZXRWYWx1ZUF0VGltZShwYXJhbS52YWx1ZSwgMCk7XG4gICAgcGFyYW0ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUodmFsdWUsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG59O1xuXG4vKlxuICogZ2V0IGZyZXF1ZW5jeSBmcm9tIG1pbiB0byBtYXggYnkgcGFzc2luZyAwIHRvIDFcbiAqL1xuXG5VdGlscy5nZXRGcmVxdWVuY3kgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIC8vIGdldCBmcmVxdWVuY3kgYnkgcGFzc2luZyBudW1iZXIgZnJvbSAwIHRvIDFcbiAgICAvLyBDbGFtcCB0aGUgZnJlcXVlbmN5IGJldHdlZW4gdGhlIG1pbmltdW0gdmFsdWUgKDQwIEh6KSBhbmQgaGFsZiBvZiB0aGVcbiAgICAvLyBzYW1wbGluZyByYXRlLlxuICAgIHZhciBtaW5WYWx1ZSA9IDQwO1xuICAgIHZhciBtYXhWYWx1ZSA9IHRoaXMuX2NvbnRleHQuc2FtcGxlUmF0ZSAvIDI7XG4gICAgLy8gTG9nYXJpdGhtIChiYXNlIDIpIHRvIGNvbXB1dGUgaG93IG1hbnkgb2N0YXZlcyBmYWxsIGluIHRoZSByYW5nZS5cbiAgICB2YXIgbnVtYmVyT2ZPY3RhdmVzID0gTWF0aC5sb2cobWF4VmFsdWUgLyBtaW5WYWx1ZSkgLyBNYXRoLkxOMjtcbiAgICAvLyBDb21wdXRlIGEgbXVsdGlwbGllciBmcm9tIDAgdG8gMSBiYXNlZCBvbiBhbiBleHBvbmVudGlhbCBzY2FsZS5cbiAgICB2YXIgbXVsdGlwbGllciA9IE1hdGgucG93KDIsIG51bWJlck9mT2N0YXZlcyAqICh2YWx1ZSAtIDEuMCkpO1xuICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICByZXR1cm4gbWF4VmFsdWUgKiBtdWx0aXBsaWVyO1xufTtcblxuLypcbiAqIGRldGVjdCBmaWxlIHR5cGVzXG4gKi9cblxuVXRpbHMuaXNBdWRpb0J1ZmZlciA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB3aW5kb3cuQXVkaW9CdWZmZXIgJiZcbiAgICAgICAgICAgICAgZGF0YSBpbnN0YW5jZW9mIHdpbmRvdy5BdWRpb0J1ZmZlcik7XG59O1xuXG5VdGlscy5pc01lZGlhRWxlbWVudCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB3aW5kb3cuSFRNTE1lZGlhRWxlbWVudCAmJlxuICAgICAgICAgICAgICBkYXRhIGluc3RhbmNlb2Ygd2luZG93LkhUTUxNZWRpYUVsZW1lbnQpO1xufTtcblxuVXRpbHMuaXNNZWRpYVN0cmVhbSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB0eXBlb2YgZGF0YS5nZXRBdWRpb1RyYWNrcyA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAgICAgICBkYXRhLmdldEF1ZGlvVHJhY2tzKCkubGVuZ3RoICYmXG4gICAgICAgICAgICAgIHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrICYmXG4gICAgICAgICAgICAgIGRhdGEuZ2V0QXVkaW9UcmFja3MoKVswXSBpbnN0YW5jZW9mIHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrKTtcbn07XG5cblV0aWxzLmlzT3NjaWxsYXRvclR5cGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgcmV0dXJuICEhKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICAgKGRhdGEgPT09ICdzaW5lJyB8fCBkYXRhID09PSAnc3F1YXJlJyB8fFxuICAgICAgICAgICAgICBkYXRhID09PSAnc2F3dG9vdGgnIHx8IGRhdGEgPT09ICd0cmlhbmdsZScpKTtcbn07XG5cblV0aWxzLmlzU2NyaXB0Q29uZmlnID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHJldHVybiAhIShkYXRhICYmIHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgICBkYXRhLmJ1ZmZlclNpemUgJiYgZGF0YS5jaGFubmVscyAmJiBkYXRhLmNhbGxiYWNrKTtcbn07XG5cblV0aWxzLmlzQXVkaW9QYXJhbSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJiB3aW5kb3cuQXVkaW9QYXJhbSAmJiBkYXRhIGluc3RhbmNlb2Ygd2luZG93LkF1ZGlvUGFyYW0pO1xufTtcblxuLypcbiAqIG1pY3JvcGhvbmUgdXRpbFxuICovXG5cblV0aWxzLm1pY3JvcGhvbmUgPSBmdW5jdGlvbihjb25uZWN0ZWQsIGRlbmllZCwgZXJyb3IsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gbmV3IFV0aWxzLk1pY3JvcGhvbmUoY29ubmVjdGVkLCBkZW5pZWQsIGVycm9yLCB0aGlzQXJnKTtcbn07XG5cbi8qVXRpbHMucGFuID0gZnVuY3Rpb24ocGFubmVyKSB7XG4gICAgY29uc29sZS5sb2coJ3BhbicsIHRoaXMuX2NvbnRleHQpO1xuICAgIHJldHVybiBuZXcgVXRpbHMuUGFuKHRoaXMuX2NvbnRleHQsIHBhbm5lcik7XG59OyovXG5cblV0aWxzLnRpbWVDb2RlID0gZnVuY3Rpb24oc2Vjb25kcywgZGVsaW0pIHtcbiAgICBpZihkZWxpbSA9PT0gdW5kZWZpbmVkKSB7IGRlbGltID0gJzonOyB9XG4gICAgdmFyIGggPSBNYXRoLmZsb29yKHNlY29uZHMgLyAzNjAwKTtcbiAgICB2YXIgbSA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAvIDYwKTtcbiAgICB2YXIgcyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAlIDYwKTtcbiAgICB2YXIgaHIgPSAoaCA9PT0gMCA/ICcnIDogKGggPCAxMCA/ICcwJyArIGggKyBkZWxpbSA6IGggKyBkZWxpbSkpO1xuICAgIHZhciBtbiA9IChtIDwgMTAgPyAnMCcgKyBtIDogbSkgKyBkZWxpbTtcbiAgICB2YXIgc2MgPSAocyA8IDEwID8gJzAnICsgcyA6IHMpO1xuICAgIHJldHVybiBociArIG1uICsgc2M7XG59O1xuXG5VdGlscy53YXZlZm9ybSA9IGZ1bmN0aW9uKGJ1ZmZlciwgbGVuZ3RoKSB7XG4gICAgcmV0dXJuIG5ldyBVdGlscy5XYXZlZm9ybShidWZmZXIsIGxlbmd0aCk7XG59O1xuXG4vKlxuICogV2F2ZWZvcm1cbiAqL1xuXG5VdGlscy5XYXZlZm9ybSA9IGZ1bmN0aW9uKGJ1ZmZlciwgbGVuZ3RoKSB7XG4gICAgdGhpcy5kYXRhID0gdGhpcy5nZXREYXRhKGJ1ZmZlciwgbGVuZ3RoKTtcbn07XG5cblV0aWxzLldhdmVmb3JtLnByb3RvdHlwZSA9IHtcbiAgICBnZXREYXRhOiBmdW5jdGlvbihidWZmZXIsIGxlbmd0aCkge1xuICAgICAgICBpZighd2luZG93LkZsb2F0MzJBcnJheSB8fCAhVXRpbHMuaXNBdWRpb0J1ZmZlcihidWZmZXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tLS0nKTtcbiAgICAgICAgY29uc29sZS50aW1lKCd3YXZlZm9ybURhdGEnKTtcbiAgICAgICAgdmFyIHdhdmVmb3JtID0gbmV3IEZsb2F0MzJBcnJheShsZW5ndGgpLFxuICAgICAgICAgICAgY2h1bmsgPSBNYXRoLmZsb29yKGJ1ZmZlci5sZW5ndGggLyBsZW5ndGgpLFxuICAgICAgICAgICAgLy9jaHVuayA9IGJ1ZmZlci5sZW5ndGggLyBsZW5ndGgsXG4gICAgICAgICAgICByZXNvbHV0aW9uID0gNSwgLy8gMTBcbiAgICAgICAgICAgIGluY3IgPSBNYXRoLmZsb29yKGNodW5rIC8gcmVzb2x1dGlvbiksXG4gICAgICAgICAgICBncmVhdGVzdCA9IDA7XG5cbiAgICAgICAgaWYoaW5jciA8IDEpIHsgaW5jciA9IDE7IH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgY2hubHMgPSBidWZmZXIubnVtYmVyT2ZDaGFubmVsczsgaSA8IGNobmxzOyBpKyspIHtcbiAgICAgICAgICAgIC8vIGNoZWNrIGVhY2ggY2hhbm5lbFxuICAgICAgICAgICAgdmFyIGNoYW5uZWwgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSk7XG4gICAgICAgICAgICAvL2ZvciAodmFyIGogPSBsZW5ndGggLSAxOyBqID49IDA7IGotLSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBsZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIC8vIGdldCBoaWdoZXN0IHZhbHVlIHdpdGhpbiB0aGUgY2h1bmtcbiAgICAgICAgICAgICAgICAvL3ZhciBjaCA9IGogKiBjaHVuaztcbiAgICAgICAgICAgICAgICAvL2ZvciAodmFyIGsgPSBjaCArIGNodW5rIC0gMTsgayA+PSBjaDsgayAtPSBpbmNyKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IGogKiBjaHVuaywgbCA9IGsgKyBjaHVuazsgayA8IGw7IGsgKz0gaW5jcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBzZWxlY3QgaGlnaGVzdCB2YWx1ZSBmcm9tIGNoYW5uZWxzXG4gICAgICAgICAgICAgICAgICAgIHZhciBhID0gY2hhbm5lbFtrXTtcbiAgICAgICAgICAgICAgICAgICAgaWYoYSA8IDApIHsgYSA9IC1hOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChhID4gd2F2ZWZvcm1bal0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhdmVmb3JtW2pdID0gYTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgaGlnaGVzdCBvdmVyYWxsIGZvciBzY2FsaW5nXG4gICAgICAgICAgICAgICAgICAgIGlmKGEgPiBncmVhdGVzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlc3QgPSBhO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIHNjYWxlIHVwP1xuICAgICAgICB2YXIgc2NhbGUgPSAxIC8gZ3JlYXRlc3QsXG4gICAgICAgICAgICBsZW4gPSB3YXZlZm9ybS5sZW5ndGg7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgd2F2ZWZvcm1baV0gKj0gc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS50aW1lRW5kKCd3YXZlZm9ybURhdGEnKTtcbiAgICAgICAgcmV0dXJuIHdhdmVmb3JtO1xuICAgIH0sXG4gICAgZ2V0Q2FudmFzOiBmdW5jdGlvbihoZWlnaHQsIGNvbG9yLCBiZ0NvbG9yLCBjYW52YXNFbCkge1xuICAgIC8vd2F2ZWZvcm06IGZ1bmN0aW9uKGFyciwgd2lkdGgsIGhlaWdodCwgY29sb3IsIGJnQ29sb3IsIGNhbnZhc0VsKSB7XG4gICAgICAgIC8vdmFyIGFyciA9IHRoaXMud2F2ZWZvcm1EYXRhKGJ1ZmZlciwgd2lkdGgpO1xuICAgICAgICB2YXIgY2FudmFzID0gY2FudmFzRWwgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aCA9IHRoaXMuZGF0YS5sZW5ndGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBiZ0NvbG9yO1xuICAgICAgICBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB2YXIgeCwgeTtcbiAgICAgICAgLy9jb25zb2xlLnRpbWUoJ3dhdmVmb3JtQ2FudmFzJyk7XG4gICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKyAwLjU7XG4gICAgICAgICAgICB5ID0gaGVpZ2h0IC0gTWF0aC5yb3VuZChoZWlnaHQgKiB0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgY29udGV4dC5tb3ZlVG8oeCwgeSk7XG4gICAgICAgICAgICBjb250ZXh0LmxpbmVUbyh4LCBoZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XG4gICAgICAgIC8vY29uc29sZS50aW1lRW5kKCd3YXZlZm9ybUNhbnZhcycpO1xuICAgICAgICByZXR1cm4gY2FudmFzO1xuICAgIH1cbn07XG5cblxuLypcbiAqIE1pY3JvcGhvbmVcbiAqL1xuXG5VdGlscy5NaWNyb3Bob25lID0gZnVuY3Rpb24oY29ubmVjdGVkLCBkZW5pZWQsIGVycm9yLCB0aGlzQXJnKSB7XG4gICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYV8gPSAobmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhKTtcbiAgICB0aGlzLl9pc1N1cHBvcnRlZCA9ICEhbmF2aWdhdG9yLmdldFVzZXJNZWRpYV87XG4gICAgdGhpcy5fc3RyZWFtID0gbnVsbDtcblxuICAgIHRoaXMuX29uQ29ubmVjdGVkID0gY29ubmVjdGVkLmJpbmQodGhpc0FyZyB8fCB0aGlzKTtcbiAgICB0aGlzLl9vbkRlbmllZCA9IGRlbmllZCA/IGRlbmllZC5iaW5kKHRoaXNBcmcgfHwgdGhpcykgOiBmdW5jdGlvbigpIHt9O1xuICAgIHRoaXMuX29uRXJyb3IgPSBlcnJvciA/IGVycm9yLmJpbmQodGhpc0FyZyB8fCB0aGlzKSA6IGZ1bmN0aW9uKCkge307XG59O1xuXG5VdGlscy5NaWNyb3Bob25lLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX2lzU3VwcG9ydGVkKSB7IHJldHVybjsgfVxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhXygge2F1ZGlvOnRydWV9LCBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgc2VsZi5fc3RyZWFtID0gc3RyZWFtO1xuICAgICAgICBzZWxmLl9vbkNvbm5lY3RlZChzdHJlYW0pO1xuICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYoZS5uYW1lID09PSAnUGVybWlzc2lvbkRlbmllZEVycm9yJyB8fCBlID09PSAnUEVSTUlTU0lPTl9ERU5JRUQnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUGVybWlzc2lvbiBkZW5pZWQuIFlvdSBjYW4gdW5kbyB0aGlzIGJ5IGNsaWNraW5nIHRoZSBjYW1lcmEgaWNvbiB3aXRoIHRoZSByZWQgY3Jvc3MgaW4gdGhlIGFkZHJlc3MgYmFyJyk7XG4gICAgICAgICAgICBzZWxmLl9vbkRlbmllZCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5fb25FcnJvcihlLm1lc3NhZ2UgfHwgZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblV0aWxzLk1pY3JvcGhvbmUucHJvdG90eXBlLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zdHJlYW0pIHtcbiAgICAgICAgdGhpcy5fc3RyZWFtLnN0b3AoKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoVXRpbHMuTWljcm9waG9uZS5wcm90b3R5cGUsICdzdHJlYW0nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0cmVhbTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFV0aWxzLk1pY3JvcGhvbmUucHJvdG90eXBlLCAnaXNTdXBwb3J0ZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzU3VwcG9ydGVkO1xuICAgIH1cbn0pO1xuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gVXRpbHM7XG59XG4iXX0=
