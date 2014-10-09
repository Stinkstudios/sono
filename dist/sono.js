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

Sono.prototype.destroySound = function(soundOrId) {
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

Sono.prototype.getSound = function(id) {
    var sound = null;
    this._sounds.some(function(item) {
        if(item.id === id) {
            sound = item;
            return true;
        }
    });
    return sound;
};

/*
 * Loading
 */

Sono.prototype.load = function(config) {
    if(!config) {
        throw new Error('ArgumentException: Sono.load: param config is undefined');
    }

    var asMediaElement = !!config.asMediaElement,
        onProgress = config.onProgress,
        onComplete = config.onComplete,
        thisArg = config.thisArg || config.context || this,
        url = config.url || config;

    var sound,
        loader;

    if(Support.containsURL(url)) {
        sound = this._queue(config, asMediaElement);
        loader = sound.loader;
    }
    else if(Array.isArray(url) && Support.containsURL(url[0].url) ) {
        sound = [];
        loader = new Loader.Group();

        url.forEach(function(file) {
            sound.push(this._queue(file, asMediaElement, loader));
        }, this);
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
    this.getSound(id).play(delay, offset);
};

Sono.prototype.pause = function(id) {
    this.getSound(id).pause();
};

Sono.prototype.stop = function(id) {
    this.getSound(id).stop();
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

Object.defineProperty(Sono.prototype, 'extensions', {
    get: function() {
        return Support.extensions;
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

},{"./lib/loader.js":3,"./lib/node-manager.js":4,"./lib/sound.js":16,"./lib/support.js":22,"./lib/utils.js":23}],2:[function(require,module,exports){
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
        var loaded = numLoaded + progress;
        onProgress.dispatch(loaded / numTotal);
    };

    var completeHandler = function() {
        numLoaded++;
        onProgress.dispatch(numLoaded / numTotal);
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

var ADT = require('./node/adt.js'),
    Analyser = require('./node/analyser.js'),
    Distortion = require('./node/distortion.js'),
    Echo = require('./node/echo.js'),
    Filter = require('./node/filter.js'),
    Flanger = require('./node/flanger.js'),
    Panner = require('./node/panner.js'),
    Phaser = require('./node/phaser.js'),
    Recorder = require('./node/recorder.js'),
    Reverb = require('./node/reverb.js'),
    Saturation = require('./node/saturation.js');

function NodeManager(context) {
    this._context = context || this.createFakeContext();
    this._destination = null;
    this._nodeList = [];
    this._sourceNode = null;
}

NodeManager.prototype.add = function(node) {
    if(!node) { return; }
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
            break;
        }
    }
    var output = node._output || node;
    output.disconnect();
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
    //console.log('> connect', (a.name || a.constructor.name), 'to', (b.name || b.constructor.name));

    var output = a._output || a;
    //console.log('> disconnect output: ', (a.name || a.constructor.name));
    output.disconnect();
    //console.log('> connect output: ', (a.name || a.constructor.name), 'to input:', (b.name || b.constructor.name));
    output.connect(b);
};

NodeManager.prototype._connectToDestination = function(destination) {
    var l = this._nodeList.length,
        lastNode = l ? this._nodeList[l - 1] : this._sourceNode;

    if(lastNode) {
        this._connect(lastNode, destination);
    }

    this._destination = destination;
};

NodeManager.prototype._updateConnections = function() {
    if(!this._sourceNode) { return; }

    //console.log('updateConnections:', this._nodeList.length);

    var node,
        prev;

    for (var i = 0; i < this._nodeList.length; i++) {
        node = this._nodeList[i];
        //console.log(i, node);
        prev = i === 0 ? this._sourceNode : this._nodeList[i - 1];
        this._connect(prev, node);
    }

    if(this._destination) {
        this._connectToDestination(this._destination);
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

/*
 * Effects
 */

NodeManager.prototype.adt = function(config) {
    var node = new ADT(this._context, config);
    return this.add(node);
};

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
    var node = new Echo(this._context, time, gain);
    return this.add(node);
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

NodeManager.prototype.flanger = function(config) {
    var node = new Flanger(this._context, config);
    return this.add(node);
};

NodeManager.prototype.gain = function(value) {
    var node = this._context.createGain();
    if(value !== undefined) {
        node.gain.value = value;
    }
    return node;
};

NodeManager.prototype.panner = function() {
    var node = new Panner(this._context);
    return this.add(node);
};

NodeManager.prototype.phaser = function(config) {
    var node = new Phaser(this._context, config);
    return this.add(node);
};

NodeManager.prototype.recorder = function(passThrough) {
    var node = new Recorder(this._context, passThrough);
    return this.add(node);
};

NodeManager.prototype.reverb = function(seconds, decay, reverse) {
    var node = new Reverb(this._context, seconds, decay, reverse);
    return this.add(node);
};

NodeManager.prototype.saturation = function() {
    var node = new Saturation(this._context);
    return this.add(node);
};

NodeManager.prototype.scriptProcessor = function(config) {
    config = config || {};
    // bufferSize 256 - 16384 (pow 2)
    var bufferSize = config.bufferSize || 1024;
    var inputChannels = config.inputChannels === undefined ? 0 : inputChannels;
    var outputChannels = config.outputChannels === undefined ? 1 : outputChannels;
    
    var node = this._context.createScriptProcessor(bufferSize, inputChannels, outputChannels);
    
    var callback = config.callback || function() {};
    var thisArg = config.thisArg || config.context || node;

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
        callback.call(thisArg, event);
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
    this._connectToDestination(node);
    return node;
};

module.exports = NodeManager;

},{"./node/adt.js":5,"./node/analyser.js":6,"./node/distortion.js":7,"./node/echo.js":8,"./node/filter.js":9,"./node/flanger.js":10,"./node/panner.js":11,"./node/phaser.js":12,"./node/recorder.js":13,"./node/reverb.js":14,"./node/saturation.js":15}],5:[function(require,module,exports){
'use strict';

function ADT(context, config) {
    config = config || {};
    var delayTime = config.delay || 0.020,
        lfoGain = config.gain || 0.002,
        lfoFreq = config.frequency || 0.25;

    var input = context.createGain();
    var delay = context.createDelay();
    var lfo = context.createOscillator();
    var gain = context.createGain();
    var output = context.createGain();

    delay.delayTime.value = delayTime; // 5-25ms delay (0.005 > 0.025)

    lfo.type = 'sine';
    lfo.frequency.value = lfoFreq; // 0.05 > 5
    gain.gain.value = lfoGain; // 0.0005 > 0.005

    input.connect(output);
    input.connect(delay);
    delay.connect(output);

    lfo.connect(gain);
    gain.connect(delay.delayTime);
    lfo.start(0);

    var node = input;
    node.name = 'ADT';
    node._output = output;

    Object.defineProperties(node, {
        delay: {
            get: function() { return delay.delayTime.value; },
            set: function(value) { delay.delayTime.value = value; }
        },
        lfoFrequency: {
            get: function() { return lfo.frequency.value; },
            set: function(value) { lfo.frequency.value = value; }
        },
        lfoGain: {
            get: function() { return gain.gain.value; },
            set: function(value) { gain.gain.value = value; }
        }
    });

    return node;
}

module.exports = ADT;

},{}],6:[function(require,module,exports){
'use strict';

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

module.exports = Analyser;

},{}],7:[function(require,module,exports){
'use strict';

function Distortion(context, amount) {
    var node = context.createWaveShaper();

    // create waveShaper distortion curve from 0 to 1
    node.update = function(value) {
        amount = value;
        var k = value * 100,
            n = 22050,
            curve = new Float32Array(n),
            deg = Math.PI / 180,
            x;

        for (var i = 0; i < n; i++) {
            x = i * 2 / n - 1;
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

module.exports = Distortion;

},{}],8:[function(require,module,exports){
'use strict';

function Echo(context, delayTime, gainValue) {
    var input = context.createGain();
    var delay = context.createDelay();
    var gain = context.createGain();
    var output = context.createGain();

    gain.gain.value = gainValue || 0.5;
    delay.delayTime.value = delayTime || 0.5;

    input.connect(delay);
    input.connect(output);
    delay.connect(gain);
    gain.connect(delay);
    gain.connect(output);

    var node = input;
    node.name = 'Echo';
    node._output = output;

    Object.defineProperties(node, {
        delay: {
            get: function() { return delay.delayTime.value; },
            set: function(value) { delay.delayTime.value = value; }
        },
        feedback: {
            get: function() { return gain.gain.value; },
            set: function(value) { gain.gain.value = value; }
        }
    });

    return node;
}

module.exports = Echo;

},{}],9:[function(require,module,exports){
'use strict';

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

module.exports = Filter;

},{}],10:[function(require,module,exports){
'use strict';

function MonoFlanger(context, config) {
    var feedbackGain = config.feedback || 0.5,
        delayTime = config.delay || 0.005,
        lfoGain = config.gain || 0.002,
        lfoFreq = config.frequency || 0.25;

    var input = context.createGain();
    var delay = context.createDelay();
    var feedback = context.createGain();
    var lfo = context.createOscillator();
    var gain = context.createGain();
    var output = context.createGain();

    delay.delayTime.value = delayTime; // 5-25ms delay (0.005 > 0.025)
    feedback.gain.value = feedbackGain; // 0 > 1

    lfo.type = 'sine';
    lfo.frequency.value = lfoFreq; // 0.05 > 5
    gain.gain.value = lfoGain; // 0.0005 > 0.005

    input.connect(output);
    input.connect(delay);
    delay.connect(output);
    delay.connect(feedback);
    feedback.connect(input);

    lfo.connect(gain);
    gain.connect(delay.delayTime);
    lfo.start(0);
    
    var node = input;
    node.name = 'Flanger';
    node._output = output;
    
    Object.defineProperties(node, {
        delay: {
            get: function() { return delay.delayTime.value; },
            set: function(value) { delay.delayTime.value = value; }
        },
        lfoFrequency: {
            get: function() { return lfo.frequency.value; },
            set: function(value) { lfo.frequency.value = value; }
        },
        lfoGain: {
            get: function() { return gain.gain.value; },
            set: function(value) { gain.gain.value = value; }
        },
        feedback: {
            get: function() { return feedback.gain.value; },
            set: function(value) { feedback.gain.value = value; }
        }
    });

    return node;
}

function StereoFlanger(context, config) {
    var feedbackGain = config.feedback || 0.5,
        delayTime = config.delay || 0.003,
        lfoGain = config.gain || 0.005,
        lfoFreq = config.frequency || 0.5;

    var input = context.createGain();
    var splitter = context.createChannelSplitter(2);
    var merger = context.createChannelMerger(2);
    var feedbackL = context.createGain();
    var feedbackR = context.createGain();
    var lfo = context.createOscillator();
    var lfoGainL = context.createGain();
    var lfoGainR = context.createGain();
    var delayL = context.createDelay();
    var delayR = context.createDelay();
    var output = context.createGain();

    feedbackL.gain.value = feedbackR.gain.value = feedbackGain;
    delayL.delayTime.value = delayR.delayTime.value = delayTime;

    lfo.type = 'sine';
    lfo.frequency.value = lfoFreq;
    lfoGainL.gain.value = lfoGain;
    lfoGainR.gain.value = 0 - lfoGain;

    input.connect(splitter);
    
    splitter.connect(delayL, 0);
    splitter.connect(delayR, 1);
    
    delayL.connect(feedbackL);
    delayR.connect(feedbackR);

    feedbackL.connect(delayR);
    feedbackR.connect(delayL);

    delayL.connect(merger, 0, 0);
    delayR.connect(merger, 0, 1);

    merger.connect(output);
    input.connect(output);

    lfo.connect(lfoGainL);
    lfo.connect(lfoGainR);
    lfoGainL.connect(delayL.delayTime);
    lfoGainR.connect(delayR.delayTime);
    lfo.start(0);

    var node = input;
    node.name = 'StereoFlanger';
    node._output = output;

    Object.defineProperties(node, {
        delay: {
            get: function() { return delayL.delayTime.value; },
            set: function(value) { delayL.delayTime.value = delayR.delayTime.value = value; }
        },
        lfoFrequency: {
            get: function() { return lfo.frequency.value; },
            set: function(value) { lfo.frequency.value = value; }
        },
        lfoGain: {
            get: function() { return lfoGainL.gain.value; },
            set: function(value) { lfoGainL.gain.value = lfoGainR.gain.value = value; }
        },
        feedback: {
            get: function() { return feedbackL.gain.value; },
            set: function(value) { feedbackL.gain.value = feedbackR.gain.value = value; }
        }
    });

    return node;
}

function Flanger(context, config) {
    config = config || {};
    return config.stereo ? new StereoFlanger(context, config) : new MonoFlanger(context, config);
}

module.exports = Flanger;

},{}],11:[function(require,module,exports){
'use strict';

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

    /*var x = 0,
        y = 0,
        z = 0;

    Object.defineProperties(node, {
        'x': {
            get: function() { return x; },
            set: function(value) {
                x = value;
                node.setPosition(x, y, z);
            }
        }
    });*/

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

module.exports = Panner;

},{}],12:[function(require,module,exports){
'use strict';

function Phaser(context, config) {
    config = config || {};
    var stages = config.stages || 8,
        lfoFrequency = config.frequency || 0.5,
        lfoGainValue = config.gain || 300,
        feedbackGain = config.feedback || 0.5,
        filters = [],
        filter;

    var input = context.createGain();
    var feedback = context.createGain();
    var lfo = context.createOscillator();
    var lfoGain = context.createGain();
    var output = context.createGain();

    feedback.gain.value = feedbackGain;

    lfo.type = 'sine';
    lfo.frequency.value = lfoFrequency;
    lfoGain.gain.value = lfoGainValue;

    for (var i = 0; i < stages; i++) {
        filter = context.createBiquadFilter();
        filter.type = 'allpass';
        filter.frequency.value = 1000 * i;
        //filter.Q.value = 10;
        if(i > 0) {
            filters[i-1].connect(filter);
        }
        lfoGain.connect(filter.frequency);

        filters.push(filter);
    }

    var first = filters[0];
    var last = filters[filters.length - 1];

    input.connect(first);
    input.connect(output);
    last.connect(output);
    last.connect(feedback);
    feedback.connect(first);
    lfo.connect(lfoGain);
    lfo.start(0);

    var node = input;
    node.name = 'Phaser';
    node._output = output;

    Object.defineProperties(node, {
        lfoFrequency: {
            get: function() { return lfo.frequency.value; },
            set: function(value) { lfo.frequency.value = value; }
        },
        lfoGain: {
            get: function() { return lfoGain.gain.value; },
            set: function(value) { lfoGain.gain.value = value; }
        },
        feedback: {
            get: function() { return feedback.gain.value; },
            set: function(value) { feedback.gain.value = value; }
        }
    });

    return node;
}

module.exports = Phaser;

},{}],13:[function(require,module,exports){
'use strict';

function Recorder(context, passThrough) {
    var buffersL = [],
        buffersR = [],
        startedAt = 0,
        stoppedAt = 0;

    var input = context.createGain();
    var output = context.createGain();
    var script = context.createScriptProcessor(4096, 2, 2);
    
    input.connect(script);
    script.connect(context.destination);
    script.connect(output);

    var node = input;
    node.name = 'Recorder';
    node._output = output;

    node.isRecording = false;

    var getBuffer = function() {
        if(!buffersL.length) {
            return context.createBuffer(2, 4096, context.sampleRate);
        }
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

    script.onaudioprocess = function (event) {
        var inputL = event.inputBuffer.getChannelData(0),
            inputR = event.inputBuffer.getChannelData(0),
            outputL = event.outputBuffer.getChannelData(0),
            outputR = event.outputBuffer.getChannelData(0);

        if(passThrough) {
            outputL.set(inputL);
            outputR.set(inputR);
        }

        if(node.isRecording) {
            for (var i = 0; i < inputL.length; i++) {
                buffersL.push(inputL[i]);
                buffersR.push(inputR[i]);
            }
        }
    };

    return node;
}

module.exports = Recorder;

},{}],14:[function(require,module,exports){
'use strict';

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

module.exports = Reverb;

},{}],15:[function(require,module,exports){
'use strict';

var Distortion = require('./distortion.js');

function Saturation(context) {
    var input = context.createGain();
    var drive = context.createGain();
    var lowpass = context.createBiquadFilter();
    var highpass = context.createBiquadFilter();
    //var waveShaper = context.createWaveShaper();
    var waveShaper = new Distortion(context, 0.5);
    var output = context.createGain();

    /*var curve = function(value) {
        var k = value * 100,
            n = 22050, // 
            curve = new Float32Array(n),
            deg = Math.PI / 180,
            x;

        for (var i = 0; i < n; i++) {
            x = i * 2 / n - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }

        return curve;
    };
    waveShaper.curve = curve(0.5);
    */

    function update(value) {
        saturation = value;

        waveShaper.amount = value;

        drive.gain.value = 1 - value * 0.8;
    }

    highpass.type = 'highpass';
    highpass.frequency.value = 100;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 10000;
    drive.gain.value = 0.4;

    input.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(waveShaper);
    waveShaper.connect(drive);
    drive.connect(output);

    var node = input;
    node.name = 'Saturation';
    node._output = output;

    Object.defineProperties(node, {
        distortion: {
            get: function() { return waveShaper.amount; },
            set: function(value) { waveShaper.amount = value; }
        },
        gain: {
            get: function() { return drive.gain.value; },
            set: function(value) { drive.gain.value = value; }
        },
        highpass: {
            get: function() { return highpass.frequency.value; },
            set: function(value) { highpass.frequency.value = value; }
        },
        lowpass: {
            get: function() { return lowpass.frequency.value; },
            set: function(value) { lowpass.frequency.value = value; }
        }
    });

    return node;
}

module.exports = Saturation;

},{"./distortion.js":7}],16:[function(require,module,exports){
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
    },
    set: function(value) {
        this.stop();
        this.play(0, value);
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

module.exports = Sound;

},{"./node-manager.js":4,"./source/buffer-source.js":17,"./source/media-source.js":18,"./source/microphone-source.js":19,"./source/oscillator-source.js":20,"./source/script-source.js":21,"./utils.js":23}],17:[function(require,module,exports){
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
    if(offset > 0) { this._pausedAt = 0; }
    if(this._pausedAt > 0) { offset = this._pausedAt; }
    
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
            var time = this._context.currentTime - this._startedAt;
            if(time > this.duration) {
                time = time % this.duration;
            }
            return time;
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

module.exports = BufferSource;

},{}],18:[function(require,module,exports){
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

module.exports = MediaSource;

},{}],19:[function(require,module,exports){
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

module.exports = MicrophoneSource;

},{}],20:[function(require,module,exports){
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

module.exports = OscillatorSource;

},{}],21:[function(require,module,exports){
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

module.exports = ScriptSource;

},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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
        //console.log('-------------------');
        //console.time('waveformData');
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
        //console.timeEnd('waveformData');
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

module.exports = Utils;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc29uby5qcyIsIm5vZGVfbW9kdWxlcy9zaWduYWxzL2Rpc3Qvc2lnbmFscy5qcyIsInNyYy9saWIvbG9hZGVyLmpzIiwic3JjL2xpYi9ub2RlLW1hbmFnZXIuanMiLCJzcmMvbGliL25vZGUvYWR0LmpzIiwic3JjL2xpYi9ub2RlL2FuYWx5c2VyLmpzIiwic3JjL2xpYi9ub2RlL2Rpc3RvcnRpb24uanMiLCJzcmMvbGliL25vZGUvZWNoby5qcyIsInNyYy9saWIvbm9kZS9maWx0ZXIuanMiLCJzcmMvbGliL25vZGUvZmxhbmdlci5qcyIsInNyYy9saWIvbm9kZS9wYW5uZXIuanMiLCJzcmMvbGliL25vZGUvcGhhc2VyLmpzIiwic3JjL2xpYi9ub2RlL3JlY29yZGVyLmpzIiwic3JjL2xpYi9ub2RlL3JldmVyYi5qcyIsInNyYy9saWIvbm9kZS9zYXR1cmF0aW9uLmpzIiwic3JjL2xpYi9zb3VuZC5qcyIsInNyYy9saWIvc291cmNlL2J1ZmZlci1zb3VyY2UuanMiLCJzcmMvbGliL3NvdXJjZS9tZWRpYS1zb3VyY2UuanMiLCJzcmMvbGliL3NvdXJjZS9taWNyb3Bob25lLXNvdXJjZS5qcyIsInNyYy9saWIvc291cmNlL29zY2lsbGF0b3Itc291cmNlLmpzIiwic3JjL2xpYi9zb3VyY2Uvc2NyaXB0LXNvdXJjZS5qcyIsInNyYy9saWIvc3VwcG9ydC5qcyIsInNyYy9saWIvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBMb2FkZXIgPSByZXF1aXJlKCcuL2xpYi9sb2FkZXIuanMnKSxcbiAgICBOb2RlTWFuYWdlciA9IHJlcXVpcmUoJy4vbGliL25vZGUtbWFuYWdlci5qcycpLFxuICAgIFNvdW5kID0gcmVxdWlyZSgnLi9saWIvc291bmQuanMnKSxcbiAgICBTdXBwb3J0ID0gcmVxdWlyZSgnLi9saWIvc3VwcG9ydC5qcycpLFxuICAgIFV0aWxzID0gcmVxdWlyZSgnLi9saWIvdXRpbHMuanMnKTtcblxuZnVuY3Rpb24gU29ubygpIHtcbiAgICB0aGlzLlZFUlNJT04gPSAnMC4wLjAnO1xuXG4gICAgd2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbiAgICB0aGlzLl9jb250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCA/IG5ldyB3aW5kb3cuQXVkaW9Db250ZXh0KCkgOiBudWxsO1xuICAgIFV0aWxzLnNldENvbnRleHQodGhpcy5fY29udGV4dCk7XG5cbiAgICB0aGlzLl9ub2RlID0gbmV3IE5vZGVNYW5hZ2VyKHRoaXMuX2NvbnRleHQpO1xuICAgIHRoaXMuX21hc3RlckdhaW4gPSB0aGlzLl9ub2RlLmdhaW4oKTtcbiAgICBpZih0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX25vZGUuc2V0U291cmNlKHRoaXMuX21hc3RlckdhaW4pO1xuICAgICAgICB0aGlzLl9ub2RlLnNldERlc3RpbmF0aW9uKHRoaXMuX2NvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIH1cblxuICAgIHRoaXMuX3NvdW5kcyA9IFtdO1xuXG4gICAgdGhpcy5faGFuZGxlVG91Y2hsb2NrKCk7XG4gICAgdGhpcy5faGFuZGxlVmlzaWJpbGl0eSgpO1xufVxuXG4vKlxuICogQ3JlYXRlXG4gKlxuICogQWNjZXB0ZWQgdmFsdWVzIGZvciBwYXJhbSBjb25maWc6XG4gKlxuICogQXJyYXlCdWZmZXJcbiAqIEhUTUxNZWRpYUVsZW1lbnRcbiAqIEFycmF5IChvZiBmaWxlcyBlLmcuIFsnZm9vLm9nZycsICdmb28ubXAzJ10pXG4gKiBTdHJpbmcgKGZpbGVuYW1lIGUuZy4gJ2Zvby5vZ2cnKVxuICogT2JqZWN0IGNvbmZpZyBlLmcuIHsgaWQ6J2ZvbycsIHVybDpbJ2Zvby5vZ2cnLCAnZm9vLm1wMyddIH1cbiAqIFN0cmluZyAoT3NjaWxsYXRvciB0eXBlIGkuZS4gJ3NpbmUnLCAnc3F1YXJlJywgJ3Nhd3Rvb3RoJywgJ3RyaWFuZ2xlJylcbiAqIE9iamVjdCAoU2NyaXB0UHJvY2Vzc29yIGNvbmZpZzogeyBidWZmZXJTaXplOiAxMDI0LCBjaGFubmVsczogMSwgY2FsbGJhY2s6IGZuLCB0aGlzQXJnOiBzZWxmIH0pXG4gKi9cblxuU29uby5wcm90b3R5cGUuY3JlYXRlU291bmQgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICAvLyB0cnkgdG8gbG9hZCBpZiBjb25maWcgY29udGFpbnMgVVJMc1xuICAgIGlmKFN1cHBvcnQuY29udGFpbnNVUkwoY29uZmlnKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2FkKGNvbmZpZyk7XG4gICAgfVxuICAgIC8vIG90aGVyd2lzZSBqdXN0IHJldHVybiBhIG5ldyBzb3VuZCBvYmplY3RcbiAgICB2YXIgc291bmQgPSBuZXcgU291bmQodGhpcy5fY29udGV4dCwgdGhpcy5fbWFzdGVyR2Fpbik7XG4gICAgaWYoY29uZmlnKSB7XG4gICAgICAgIHNvdW5kLnNldERhdGEoY29uZmlnLmRhdGEgfHwgY29uZmlnKTtcbiAgICAgICAgc291bmQuaWQgPSBjb25maWcuaWQgfHwgJyc7XG4gICAgICAgIHNvdW5kLmxvb3AgPSAhIWNvbmZpZy5sb29wO1xuICAgICAgICBzb3VuZC52b2x1bWUgPSBjb25maWcudm9sdW1lO1xuICAgIH1cbiAgICB0aGlzLl9zb3VuZHMucHVzaChzb3VuZCk7XG5cbiAgICByZXR1cm4gc291bmQ7XG59O1xuXG4vKlxuICogRGVzdHJveVxuICovXG5cblNvbm8ucHJvdG90eXBlLmRlc3Ryb3lTb3VuZCA9IGZ1bmN0aW9uKHNvdW5kT3JJZCkge1xuICAgIGlmKCFzb3VuZE9ySWQpIHsgcmV0dXJuOyB9XG4gICAgdGhpcy5fc291bmRzLnNvbWUoZnVuY3Rpb24oc291bmQsIGluZGV4LCBzb3VuZHMpIHtcbiAgICAgICAgaWYoc291bmQgPT09IHNvdW5kT3JJZCB8fCBzb3VuZC5pZCA9PT0gc291bmRPcklkKSB7XG4gICAgICAgICAgICBzb3VuZHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIGlmKHNvdW5kLmxvYWRlcikge1xuICAgICAgICAgICAgICAgIHNvdW5kLmxvYWRlci5jYW5jZWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc291bmQuc3RvcCgpO1xuICAgICAgICAgICAgfSBjYXRjaChlKSB7fVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qXG4gKiBHZXQgU291bmQgYnkgaWRcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5nZXRTb3VuZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdmFyIHNvdW5kID0gbnVsbDtcbiAgICB0aGlzLl9zb3VuZHMuc29tZShmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGlmKGl0ZW0uaWQgPT09IGlkKSB7XG4gICAgICAgICAgICBzb3VuZCA9IGl0ZW07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzb3VuZDtcbn07XG5cbi8qXG4gKiBMb2FkaW5nXG4gKi9cblxuU29uby5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIGlmKCFjb25maWcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudEV4Y2VwdGlvbjogU29uby5sb2FkOiBwYXJhbSBjb25maWcgaXMgdW5kZWZpbmVkJyk7XG4gICAgfVxuXG4gICAgdmFyIGFzTWVkaWFFbGVtZW50ID0gISFjb25maWcuYXNNZWRpYUVsZW1lbnQsXG4gICAgICAgIG9uUHJvZ3Jlc3MgPSBjb25maWcub25Qcm9ncmVzcyxcbiAgICAgICAgb25Db21wbGV0ZSA9IGNvbmZpZy5vbkNvbXBsZXRlLFxuICAgICAgICB0aGlzQXJnID0gY29uZmlnLnRoaXNBcmcgfHwgY29uZmlnLmNvbnRleHQgfHwgdGhpcyxcbiAgICAgICAgdXJsID0gY29uZmlnLnVybCB8fCBjb25maWc7XG5cbiAgICB2YXIgc291bmQsXG4gICAgICAgIGxvYWRlcjtcblxuICAgIGlmKFN1cHBvcnQuY29udGFpbnNVUkwodXJsKSkge1xuICAgICAgICBzb3VuZCA9IHRoaXMuX3F1ZXVlKGNvbmZpZywgYXNNZWRpYUVsZW1lbnQpO1xuICAgICAgICBsb2FkZXIgPSBzb3VuZC5sb2FkZXI7XG4gICAgfVxuICAgIGVsc2UgaWYoQXJyYXkuaXNBcnJheSh1cmwpICYmIFN1cHBvcnQuY29udGFpbnNVUkwodXJsWzBdLnVybCkgKSB7XG4gICAgICAgIHNvdW5kID0gW107XG4gICAgICAgIGxvYWRlciA9IG5ldyBMb2FkZXIuR3JvdXAoKTtcblxuICAgICAgICB1cmwuZm9yRWFjaChmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgICBzb3VuZC5wdXNoKHRoaXMuX3F1ZXVlKGZpbGUsIGFzTWVkaWFFbGVtZW50LCBsb2FkZXIpKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG4gICAgaWYob25Qcm9ncmVzcykge1xuICAgICAgICBsb2FkZXIub25Qcm9ncmVzcy5hZGQob25Qcm9ncmVzcywgdGhpc0FyZyk7XG4gICAgfVxuICAgIGlmKG9uQ29tcGxldGUpIHtcbiAgICAgICAgbG9hZGVyLm9uQ29tcGxldGUuYWRkT25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIG9uQ29tcGxldGUuY2FsbCh0aGlzQXJnLCBzb3VuZCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBsb2FkZXIuc3RhcnQoKTtcblxuICAgIHJldHVybiBzb3VuZDtcbn07XG5cblNvbm8ucHJvdG90eXBlLl9xdWV1ZSA9IGZ1bmN0aW9uKGNvbmZpZywgYXNNZWRpYUVsZW1lbnQsIGdyb3VwKSB7XG4gICAgdmFyIHVybCA9IFN1cHBvcnQuZ2V0U3VwcG9ydGVkRmlsZShjb25maWcudXJsIHx8IGNvbmZpZyk7XG4gICAgdmFyIHNvdW5kID0gdGhpcy5jcmVhdGVTb3VuZCgpO1xuICAgIHNvdW5kLmlkID0gY29uZmlnLmlkIHx8ICcnO1xuICAgIHNvdW5kLmxvb3AgPSAhIWNvbmZpZy5sb29wO1xuICAgIHNvdW5kLnZvbHVtZSA9IGNvbmZpZy52b2x1bWU7XG5cbiAgICB2YXIgbG9hZGVyID0gbmV3IExvYWRlcih1cmwpO1xuICAgIGxvYWRlci5hdWRpb0NvbnRleHQgPSBhc01lZGlhRWxlbWVudCA/IG51bGwgOiB0aGlzLl9jb250ZXh0O1xuICAgIGxvYWRlci5pc1RvdWNoTG9ja2VkID0gdGhpcy5faXNUb3VjaExvY2tlZDtcbiAgICBsb2FkZXIub25CZWZvcmVDb21wbGV0ZS5hZGRPbmNlKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgc291bmQuc2V0RGF0YShkYXRhKTtcbiAgICB9KTtcbiAgICAvLyBrZWVwIGEgcmVmIHNvIGNhbiBjYWxsIHNvdW5kLmxvYWRlci5jYW5jZWwoKVxuICAgIHNvdW5kLmxvYWRlciA9IGxvYWRlcjtcbiAgICBpZihncm91cCkgeyBncm91cC5hZGQobG9hZGVyKTsgfVxuXG4gICAgcmV0dXJuIHNvdW5kO1xufTtcblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuU29uby5wcm90b3R5cGUubXV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3ByZU11dGVWb2x1bWUgPSB0aGlzLnZvbHVtZTtcbiAgICB0aGlzLnZvbHVtZSA9IDA7XG59O1xuXG5Tb25vLnByb3RvdHlwZS51bk11dGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnZvbHVtZSA9IHRoaXMuX3ByZU11dGVWb2x1bWUgfHwgMTtcbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ3ZvbHVtZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWFzdGVyR2Fpbi5nYWluLnZhbHVlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZihpc05hTih2YWx1ZSkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgdGhpcy5fbWFzdGVyR2Fpbi5nYWluLnZhbHVlID0gdmFsdWU7XG5cbiAgICAgICAgaWYoIXRoaXMuaGFzV2ViQXVkaW8pIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgICAgICAgICAgc291bmQudm9sdW1lID0gdmFsdWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5Tb25vLnByb3RvdHlwZS5wYXVzZUFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgIGlmKHNvdW5kLnBsYXlpbmcpIHtcbiAgICAgICAgICAgIHNvdW5kLnBhdXNlKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cblNvbm8ucHJvdG90eXBlLnJlc3VtZUFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgIGlmKHNvdW5kLnBhdXNlZCkge1xuICAgICAgICAgICAgc291bmQucGxheSgpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5zdG9wQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgc291bmQuc3RvcCgpO1xuICAgIH0pO1xufTtcblxuU29uby5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGlkLCBkZWxheSwgb2Zmc2V0KSB7XG4gICAgdGhpcy5nZXRTb3VuZChpZCkucGxheShkZWxheSwgb2Zmc2V0KTtcbn07XG5cblNvbm8ucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oaWQpIHtcbiAgICB0aGlzLmdldFNvdW5kKGlkKS5wYXVzZSgpO1xufTtcblxuU29uby5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy5nZXRTb3VuZChpZCkuc3RvcCgpO1xufTtcblxuLypcbiAqIE1vYmlsZSB0b3VjaCBsb2NrXG4gKi9cblxuU29uby5wcm90b3R5cGUuX2hhbmRsZVRvdWNobG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQsXG4gICAgICAgIGxvY2tlZCA9ICEhdWEubWF0Y2goL0FuZHJvaWR8d2ViT1N8aVBob25lfGlQYWR8aVBvZHxCbGFja0JlcnJ5fElFTW9iaWxlfE9wZXJhIE1pbmkvaSksXG4gICAgICAgIHNlbGYgPSB0aGlzO1xuXG4gICAgdmFyIHVubG9jayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB1bmxvY2spO1xuICAgICAgICBzZWxmLl9pc1RvdWNoTG9ja2VkID0gZmFsc2U7XG4gICAgICAgIHNlbGYuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgICAgICBpZihzb3VuZC5sb2FkZXIpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5sb2FkZXIudG91Y2hMb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYoc2VsZi5jb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgYnVmZmVyID0gc2VsZi5jb250ZXh0LmNyZWF0ZUJ1ZmZlcigxLCAxLCAyMjA1MCk7XG4gICAgICAgICAgICB2YXIgdW5sb2NrU291cmNlID0gc2VsZi5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgICAgICAgICAgdW5sb2NrU291cmNlLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgICAgIHVubG9ja1NvdXJjZS5jb25uZWN0KHNlbGYuY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgICAgICAgICB1bmxvY2tTb3VyY2Uuc3RhcnQoMCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGlmKGxvY2tlZCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB1bmxvY2ssIGZhbHNlKTtcbiAgICB9XG4gICAgdGhpcy5faXNUb3VjaExvY2tlZCA9IGxvY2tlZDtcbn07XG5cbi8qXG4gKiBQYWdlIHZpc2liaWxpdHkgZXZlbnRzXG4gKi9cblxuU29uby5wcm90b3R5cGUuX2hhbmRsZVZpc2liaWxpdHkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFnZUhpZGRlblBhdXNlZCA9IFtdLFxuICAgICAgICBzb3VuZHMgPSB0aGlzLl9zb3VuZHMsXG4gICAgICAgIGhpZGRlbixcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZTtcblxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQuaGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBoaWRkZW4gPSAnaGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICd2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50Lm1vekhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ21vekhpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnbW96dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tc0hpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ21zSGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICdtc3Zpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQud2Via2l0SGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBoaWRkZW4gPSAnd2Via2l0SGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICd3ZWJraXR2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG5cbiAgICAvLyBwYXVzZSBjdXJyZW50bHkgcGxheWluZyBzb3VuZHMgYW5kIHN0b3JlIHJlZnNcbiAgICBmdW5jdGlvbiBvbkhpZGRlbigpIHtcbiAgICAgICAgc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgICAgIGlmKHNvdW5kLnBsYXlpbmcpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIHBhZ2VIaWRkZW5QYXVzZWQucHVzaChzb3VuZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHBsYXkgc291bmRzIHRoYXQgZ290IHBhdXNlZCB3aGVuIHBhZ2Ugd2FzIGhpZGRlblxuICAgIGZ1bmN0aW9uIG9uU2hvd24oKSB7XG4gICAgICAgIHdoaWxlKHBhZ2VIaWRkZW5QYXVzZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYWdlSGlkZGVuUGF1c2VkLnBvcCgpLnBsYXkoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uQ2hhbmdlKCkge1xuICAgICAgICBpZiAoZG9jdW1lbnRbaGlkZGVuXSkge1xuICAgICAgICAgICAgb25IaWRkZW4oKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIG9uU2hvd24oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmKHZpc2liaWxpdHlDaGFuZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKHZpc2liaWxpdHlDaGFuZ2UsIG9uQ2hhbmdlLCBmYWxzZSk7XG4gICAgfVxufTtcblxuLypcbiAqIExvZyB2ZXJzaW9uICYgZGV2aWNlIHN1cHBvcnQgaW5mb1xuICovXG5cblNvbm8ucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aXRsZSA9ICdTb25vICcgKyB0aGlzLlZFUlNJT04sXG4gICAgICAgIGluZm8gPSAnU3VwcG9ydGVkOicgKyB0aGlzLmlzU3VwcG9ydGVkICtcbiAgICAgICAgICAgICAgICcgV2ViQXVkaW9BUEk6JyArIHRoaXMuaGFzV2ViQXVkaW8gK1xuICAgICAgICAgICAgICAgJyBUb3VjaExvY2tlZDonICsgdGhpcy5faXNUb3VjaExvY2tlZCArXG4gICAgICAgICAgICAgICAnIEV4dGVuc2lvbnM6JyArIFN1cHBvcnQuZXh0ZW5zaW9ucztcblxuICAgIGlmKG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignQ2hyb21lJykgPiAtMSkge1xuICAgICAgICB2YXIgYXJncyA9IFtcbiAgICAgICAgICAgICAgICAnJWMg4pmrICcgKyB0aXRsZSArXG4gICAgICAgICAgICAgICAgJyDimasgJWMgJyArIGluZm8gKyAnICcsXG4gICAgICAgICAgICAgICAgJ2NvbG9yOiAjRkZGRkZGOyBiYWNrZ3JvdW5kOiAjMzc5RjdBJyxcbiAgICAgICAgICAgICAgICAnY29sb3I6ICMxRjFDMEQ7IGJhY2tncm91bmQ6ICNFMEZCQUMnXG4gICAgICAgICAgICBdO1xuICAgICAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmdzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAod2luZG93LmNvbnNvbGUgJiYgd2luZG93LmNvbnNvbGUubG9nLmNhbGwpIHtcbiAgICAgICAgY29uc29sZS5sb2cuY2FsbChjb25zb2xlLCB0aXRsZSArICcgJyArIGluZm8pO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2NhblBsYXknLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFN1cHBvcnQuY2FuUGxheTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnZXh0ZW5zaW9ucycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gU3VwcG9ydC5leHRlbnNpb25zO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdjb250ZXh0Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0O1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdoYXNXZWJBdWRpbycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gISF0aGlzLl9jb250ZXh0O1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdpc1N1cHBvcnRlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gU3VwcG9ydC5leHRlbnNpb25zLmxlbmd0aCA+IDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ21hc3RlckdhaW4nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21hc3RlckdhaW47XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ25vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX25vZGU7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ3NvdW5kcycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291bmRzO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICd1dGlscycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gVXRpbHM7XG4gICAgfVxufSk7XG5cbi8qXG4gKiBFeHBvcnRzXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgU29ubygpO1xuIiwiLypqc2xpbnQgb25ldmFyOnRydWUsIHVuZGVmOnRydWUsIG5ld2NhcDp0cnVlLCByZWdleHA6dHJ1ZSwgYml0d2lzZTp0cnVlLCBtYXhlcnI6NTAsIGluZGVudDo0LCB3aGl0ZTpmYWxzZSwgbm9tZW46ZmFsc2UsIHBsdXNwbHVzOmZhbHNlICovXG4vKmdsb2JhbCBkZWZpbmU6ZmFsc2UsIHJlcXVpcmU6ZmFsc2UsIGV4cG9ydHM6ZmFsc2UsIG1vZHVsZTpmYWxzZSwgc2lnbmFsczpmYWxzZSAqL1xuXG4vKiogQGxpY2Vuc2VcbiAqIEpTIFNpZ25hbHMgPGh0dHA6Ly9taWxsZXJtZWRlaXJvcy5naXRodWIuY29tL2pzLXNpZ25hbHMvPlxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlXG4gKiBBdXRob3I6IE1pbGxlciBNZWRlaXJvc1xuICogVmVyc2lvbjogMS4wLjAgLSBCdWlsZDogMjY4ICgyMDEyLzExLzI5IDA1OjQ4IFBNKVxuICovXG5cbihmdW5jdGlvbihnbG9iYWwpe1xuXG4gICAgLy8gU2lnbmFsQmluZGluZyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBPYmplY3QgdGhhdCByZXByZXNlbnRzIGEgYmluZGluZyBiZXR3ZWVuIGEgU2lnbmFsIGFuZCBhIGxpc3RlbmVyIGZ1bmN0aW9uLlxuICAgICAqIDxiciAvPi0gPHN0cm9uZz5UaGlzIGlzIGFuIGludGVybmFsIGNvbnN0cnVjdG9yIGFuZCBzaG91bGRuJ3QgYmUgY2FsbGVkIGJ5IHJlZ3VsYXIgdXNlcnMuPC9zdHJvbmc+XG4gICAgICogPGJyIC8+LSBpbnNwaXJlZCBieSBKb2EgRWJlcnQgQVMzIFNpZ25hbEJpbmRpbmcgYW5kIFJvYmVydCBQZW5uZXIncyBTbG90IGNsYXNzZXMuXG4gICAgICogQGF1dGhvciBNaWxsZXIgTWVkZWlyb3NcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKiBAaW50ZXJuYWxcbiAgICAgKiBAbmFtZSBTaWduYWxCaW5kaW5nXG4gICAgICogQHBhcmFtIHtTaWduYWx9IHNpZ25hbCBSZWZlcmVuY2UgdG8gU2lnbmFsIG9iamVjdCB0aGF0IGxpc3RlbmVyIGlzIGN1cnJlbnRseSBib3VuZCB0by5cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBIYW5kbGVyIGZ1bmN0aW9uIGJvdW5kIHRvIHRoZSBzaWduYWwuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc09uY2UgSWYgYmluZGluZyBzaG91bGQgYmUgZXhlY3V0ZWQganVzdCBvbmNlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbbGlzdGVuZXJDb250ZXh0XSBDb250ZXh0IG9uIHdoaWNoIGxpc3RlbmVyIHdpbGwgYmUgZXhlY3V0ZWQgKG9iamVjdCB0aGF0IHNob3VsZCByZXByZXNlbnQgdGhlIGB0aGlzYCB2YXJpYWJsZSBpbnNpZGUgbGlzdGVuZXIgZnVuY3Rpb24pLlxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbcHJpb3JpdHldIFRoZSBwcmlvcml0eSBsZXZlbCBvZiB0aGUgZXZlbnQgbGlzdGVuZXIuIChkZWZhdWx0ID0gMCkuXG4gICAgICovXG4gICAgZnVuY3Rpb24gU2lnbmFsQmluZGluZyhzaWduYWwsIGxpc3RlbmVyLCBpc09uY2UsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSGFuZGxlciBmdW5jdGlvbiBib3VuZCB0byB0aGUgc2lnbmFsLlxuICAgICAgICAgKiBAdHlwZSBGdW5jdGlvblxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fbGlzdGVuZXIgPSBsaXN0ZW5lcjtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgYmluZGluZyBzaG91bGQgYmUgZXhlY3V0ZWQganVzdCBvbmNlLlxuICAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9pc09uY2UgPSBpc09uY2U7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnRleHQgb24gd2hpY2ggbGlzdGVuZXIgd2lsbCBiZSBleGVjdXRlZCAob2JqZWN0IHRoYXQgc2hvdWxkIHJlcHJlc2VudCB0aGUgYHRoaXNgIHZhcmlhYmxlIGluc2lkZSBsaXN0ZW5lciBmdW5jdGlvbikuXG4gICAgICAgICAqIEBtZW1iZXJPZiBTaWduYWxCaW5kaW5nLnByb3RvdHlwZVxuICAgICAgICAgKiBAbmFtZSBjb250ZXh0XG4gICAgICAgICAqIEB0eXBlIE9iamVjdHx1bmRlZmluZWR8bnVsbFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jb250ZXh0ID0gbGlzdGVuZXJDb250ZXh0O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZWZlcmVuY2UgdG8gU2lnbmFsIG9iamVjdCB0aGF0IGxpc3RlbmVyIGlzIGN1cnJlbnRseSBib3VuZCB0by5cbiAgICAgICAgICogQHR5cGUgU2lnbmFsXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9zaWduYWwgPSBzaWduYWw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIExpc3RlbmVyIHByaW9yaXR5XG4gICAgICAgICAqIEB0eXBlIE51bWJlclxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fcHJpb3JpdHkgPSBwcmlvcml0eSB8fCAwO1xuICAgIH1cblxuICAgIFNpZ25hbEJpbmRpbmcucHJvdG90eXBlID0ge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiBiaW5kaW5nIGlzIGFjdGl2ZSBhbmQgc2hvdWxkIGJlIGV4ZWN1dGVkLlxuICAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICAqL1xuICAgICAgICBhY3RpdmUgOiB0cnVlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWZhdWx0IHBhcmFtZXRlcnMgcGFzc2VkIHRvIGxpc3RlbmVyIGR1cmluZyBgU2lnbmFsLmRpc3BhdGNoYCBhbmQgYFNpZ25hbEJpbmRpbmcuZXhlY3V0ZWAuIChjdXJyaWVkIHBhcmFtZXRlcnMpXG4gICAgICAgICAqIEB0eXBlIEFycmF5fG51bGxcbiAgICAgICAgICovXG4gICAgICAgIHBhcmFtcyA6IG51bGwsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhbGwgbGlzdGVuZXIgcGFzc2luZyBhcmJpdHJhcnkgcGFyYW1ldGVycy5cbiAgICAgICAgICogPHA+SWYgYmluZGluZyB3YXMgYWRkZWQgdXNpbmcgYFNpZ25hbC5hZGRPbmNlKClgIGl0IHdpbGwgYmUgYXV0b21hdGljYWxseSByZW1vdmVkIGZyb20gc2lnbmFsIGRpc3BhdGNoIHF1ZXVlLCB0aGlzIG1ldGhvZCBpcyB1c2VkIGludGVybmFsbHkgZm9yIHRoZSBzaWduYWwgZGlzcGF0Y2guPC9wPlxuICAgICAgICAgKiBAcGFyYW0ge0FycmF5fSBbcGFyYW1zQXJyXSBBcnJheSBvZiBwYXJhbWV0ZXJzIHRoYXQgc2hvdWxkIGJlIHBhc3NlZCB0byB0aGUgbGlzdGVuZXJcbiAgICAgICAgICogQHJldHVybiB7Kn0gVmFsdWUgcmV0dXJuZWQgYnkgdGhlIGxpc3RlbmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgZXhlY3V0ZSA6IGZ1bmN0aW9uIChwYXJhbXNBcnIpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGVyUmV0dXJuLCBwYXJhbXM7XG4gICAgICAgICAgICBpZiAodGhpcy5hY3RpdmUgJiYgISF0aGlzLl9saXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIHBhcmFtcyA9IHRoaXMucGFyYW1zPyB0aGlzLnBhcmFtcy5jb25jYXQocGFyYW1zQXJyKSA6IHBhcmFtc0FycjtcbiAgICAgICAgICAgICAgICBoYW5kbGVyUmV0dXJuID0gdGhpcy5fbGlzdGVuZXIuYXBwbHkodGhpcy5jb250ZXh0LCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9pc09uY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXRhY2goKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlclJldHVybjtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGV0YWNoIGJpbmRpbmcgZnJvbSBzaWduYWwuXG4gICAgICAgICAqIC0gYWxpYXMgdG86IG15U2lnbmFsLnJlbW92ZShteUJpbmRpbmcuZ2V0TGlzdGVuZXIoKSk7XG4gICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufG51bGx9IEhhbmRsZXIgZnVuY3Rpb24gYm91bmQgdG8gdGhlIHNpZ25hbCBvciBgbnVsbGAgaWYgYmluZGluZyB3YXMgcHJldmlvdXNseSBkZXRhY2hlZC5cbiAgICAgICAgICovXG4gICAgICAgIGRldGFjaCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmlzQm91bmQoKT8gdGhpcy5fc2lnbmFsLnJlbW92ZSh0aGlzLl9saXN0ZW5lciwgdGhpcy5jb250ZXh0KSA6IG51bGw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IGB0cnVlYCBpZiBiaW5kaW5nIGlzIHN0aWxsIGJvdW5kIHRvIHRoZSBzaWduYWwgYW5kIGhhdmUgYSBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGlzQm91bmQgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gKCEhdGhpcy5fc2lnbmFsICYmICEhdGhpcy5fbGlzdGVuZXIpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtib29sZWFufSBJZiBTaWduYWxCaW5kaW5nIHdpbGwgb25seSBiZSBleGVjdXRlZCBvbmNlLlxuICAgICAgICAgKi9cbiAgICAgICAgaXNPbmNlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzT25jZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IEhhbmRsZXIgZnVuY3Rpb24gYm91bmQgdG8gdGhlIHNpZ25hbC5cbiAgICAgICAgICovXG4gICAgICAgIGdldExpc3RlbmVyIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xpc3RlbmVyO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtTaWduYWx9IFNpZ25hbCB0aGF0IGxpc3RlbmVyIGlzIGN1cnJlbnRseSBib3VuZCB0by5cbiAgICAgICAgICovXG4gICAgICAgIGdldFNpZ25hbCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zaWduYWw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlbGV0ZSBpbnN0YW5jZSBwcm9wZXJ0aWVzXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfZGVzdHJveSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9zaWduYWw7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fbGlzdGVuZXI7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5jb250ZXh0O1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgdG9TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1tTaWduYWxCaW5kaW5nIGlzT25jZTonICsgdGhpcy5faXNPbmNlICsnLCBpc0JvdW5kOicrIHRoaXMuaXNCb3VuZCgpICsnLCBhY3RpdmU6JyArIHRoaXMuYWN0aXZlICsgJ10nO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG5cbi8qZ2xvYmFsIFNpZ25hbEJpbmRpbmc6ZmFsc2UqL1xuXG4gICAgLy8gU2lnbmFsIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZUxpc3RlbmVyKGxpc3RlbmVyLCBmbk5hbWUpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnbGlzdGVuZXIgaXMgYSByZXF1aXJlZCBwYXJhbSBvZiB7Zm59KCkgYW5kIHNob3VsZCBiZSBhIEZ1bmN0aW9uLicucmVwbGFjZSgne2ZufScsIGZuTmFtZSkgKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBldmVudCBicm9hZGNhc3RlclxuICAgICAqIDxiciAvPi0gaW5zcGlyZWQgYnkgUm9iZXJ0IFBlbm5lcidzIEFTMyBTaWduYWxzLlxuICAgICAqIEBuYW1lIFNpZ25hbFxuICAgICAqIEBhdXRob3IgTWlsbGVyIE1lZGVpcm9zXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgZnVuY3Rpb24gU2lnbmFsKCkge1xuICAgICAgICAvKipcbiAgICAgICAgICogQHR5cGUgQXJyYXkuPFNpZ25hbEJpbmRpbmc+XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9iaW5kaW5ncyA9IFtdO1xuICAgICAgICB0aGlzLl9wcmV2UGFyYW1zID0gbnVsbDtcblxuICAgICAgICAvLyBlbmZvcmNlIGRpc3BhdGNoIHRvIGF3YXlzIHdvcmsgb24gc2FtZSBjb250ZXh0ICgjNDcpXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5kaXNwYXRjaCA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBTaWduYWwucHJvdG90eXBlLmRpc3BhdGNoLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgU2lnbmFsLnByb3RvdHlwZSA9IHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogU2lnbmFscyBWZXJzaW9uIE51bWJlclxuICAgICAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgICAgICogQGNvbnN0XG4gICAgICAgICAqL1xuICAgICAgICBWRVJTSU9OIDogJzEuMC4wJyxcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgU2lnbmFsIHNob3VsZCBrZWVwIHJlY29yZCBvZiBwcmV2aW91c2x5IGRpc3BhdGNoZWQgcGFyYW1ldGVycyBhbmRcbiAgICAgICAgICogYXV0b21hdGljYWxseSBleGVjdXRlIGxpc3RlbmVyIGR1cmluZyBgYWRkKClgL2BhZGRPbmNlKClgIGlmIFNpZ25hbCB3YXNcbiAgICAgICAgICogYWxyZWFkeSBkaXNwYXRjaGVkIGJlZm9yZS5cbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKi9cbiAgICAgICAgbWVtb3JpemUgOiBmYWxzZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX3Nob3VsZFByb3BhZ2F0ZSA6IHRydWUsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIFNpZ25hbCBpcyBhY3RpdmUgYW5kIHNob3VsZCBicm9hZGNhc3QgZXZlbnRzLlxuICAgICAgICAgKiA8cD48c3Ryb25nPklNUE9SVEFOVDo8L3N0cm9uZz4gU2V0dGluZyB0aGlzIHByb3BlcnR5IGR1cmluZyBhIGRpc3BhdGNoIHdpbGwgb25seSBhZmZlY3QgdGhlIG5leHQgZGlzcGF0Y2gsIGlmIHlvdSB3YW50IHRvIHN0b3AgdGhlIHByb3BhZ2F0aW9uIG9mIGEgc2lnbmFsIHVzZSBgaGFsdCgpYCBpbnN0ZWFkLjwvcD5cbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKi9cbiAgICAgICAgYWN0aXZlIDogdHJ1ZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXJcbiAgICAgICAgICogQHBhcmFtIHtib29sZWFufSBpc09uY2VcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtsaXN0ZW5lckNvbnRleHRdXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbcHJpb3JpdHldXG4gICAgICAgICAqIEByZXR1cm4ge1NpZ25hbEJpbmRpbmd9XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfcmVnaXN0ZXJMaXN0ZW5lciA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgaXNPbmNlLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KSB7XG5cbiAgICAgICAgICAgIHZhciBwcmV2SW5kZXggPSB0aGlzLl9pbmRleE9mTGlzdGVuZXIobGlzdGVuZXIsIGxpc3RlbmVyQ29udGV4dCksXG4gICAgICAgICAgICAgICAgYmluZGluZztcblxuICAgICAgICAgICAgaWYgKHByZXZJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICBiaW5kaW5nID0gdGhpcy5fYmluZGluZ3NbcHJldkluZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoYmluZGluZy5pc09uY2UoKSAhPT0gaXNPbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignWW91IGNhbm5vdCBhZGQnKyAoaXNPbmNlPyAnJyA6ICdPbmNlJykgKycoKSB0aGVuIGFkZCcrICghaXNPbmNlPyAnJyA6ICdPbmNlJykgKycoKSB0aGUgc2FtZSBsaXN0ZW5lciB3aXRob3V0IHJlbW92aW5nIHRoZSByZWxhdGlvbnNoaXAgZmlyc3QuJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBiaW5kaW5nID0gbmV3IFNpZ25hbEJpbmRpbmcodGhpcywgbGlzdGVuZXIsIGlzT25jZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkQmluZGluZyhiaW5kaW5nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYodGhpcy5tZW1vcml6ZSAmJiB0aGlzLl9wcmV2UGFyYW1zKXtcbiAgICAgICAgICAgICAgICBiaW5kaW5nLmV4ZWN1dGUodGhpcy5fcHJldlBhcmFtcyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBiaW5kaW5nO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge1NpZ25hbEJpbmRpbmd9IGJpbmRpbmdcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9hZGRCaW5kaW5nIDogZnVuY3Rpb24gKGJpbmRpbmcpIHtcbiAgICAgICAgICAgIC8vc2ltcGxpZmllZCBpbnNlcnRpb24gc29ydFxuICAgICAgICAgICAgdmFyIG4gPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGg7XG4gICAgICAgICAgICBkbyB7IC0tbjsgfSB3aGlsZSAodGhpcy5fYmluZGluZ3Nbbl0gJiYgYmluZGluZy5fcHJpb3JpdHkgPD0gdGhpcy5fYmluZGluZ3Nbbl0uX3ByaW9yaXR5KTtcbiAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzLnNwbGljZShuICsgMSwgMCwgYmluZGluZyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEByZXR1cm4ge251bWJlcn1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9pbmRleE9mTGlzdGVuZXIgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBuID0gdGhpcy5fYmluZGluZ3MubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGN1cjtcbiAgICAgICAgICAgIHdoaWxlIChuLS0pIHtcbiAgICAgICAgICAgICAgICBjdXIgPSB0aGlzLl9iaW5kaW5nc1tuXTtcbiAgICAgICAgICAgICAgICBpZiAoY3VyLl9saXN0ZW5lciA9PT0gbGlzdGVuZXIgJiYgY3VyLmNvbnRleHQgPT09IGNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDaGVjayBpZiBsaXN0ZW5lciB3YXMgYXR0YWNoZWQgdG8gU2lnbmFsLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbnRleHRdXG4gICAgICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IGlmIFNpZ25hbCBoYXMgdGhlIHNwZWNpZmllZCBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGhhcyA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2luZGV4T2ZMaXN0ZW5lcihsaXN0ZW5lciwgY29udGV4dCkgIT09IC0xO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGQgYSBsaXN0ZW5lciB0byB0aGUgc2lnbmFsLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBTaWduYWwgaGFuZGxlciBmdW5jdGlvbi5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtsaXN0ZW5lckNvbnRleHRdIENvbnRleHQgb24gd2hpY2ggbGlzdGVuZXIgd2lsbCBiZSBleGVjdXRlZCAob2JqZWN0IHRoYXQgc2hvdWxkIHJlcHJlc2VudCB0aGUgYHRoaXNgIHZhcmlhYmxlIGluc2lkZSBsaXN0ZW5lciBmdW5jdGlvbikuXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbcHJpb3JpdHldIFRoZSBwcmlvcml0eSBsZXZlbCBvZiB0aGUgZXZlbnQgbGlzdGVuZXIuIExpc3RlbmVycyB3aXRoIGhpZ2hlciBwcmlvcml0eSB3aWxsIGJlIGV4ZWN1dGVkIGJlZm9yZSBsaXN0ZW5lcnMgd2l0aCBsb3dlciBwcmlvcml0eS4gTGlzdGVuZXJzIHdpdGggc2FtZSBwcmlvcml0eSBsZXZlbCB3aWxsIGJlIGV4ZWN1dGVkIGF0IHRoZSBzYW1lIG9yZGVyIGFzIHRoZXkgd2VyZSBhZGRlZC4gKGRlZmF1bHQgPSAwKVxuICAgICAgICAgKiBAcmV0dXJuIHtTaWduYWxCaW5kaW5nfSBBbiBPYmplY3QgcmVwcmVzZW50aW5nIHRoZSBiaW5kaW5nIGJldHdlZW4gdGhlIFNpZ25hbCBhbmQgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBhZGQgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpIHtcbiAgICAgICAgICAgIHZhbGlkYXRlTGlzdGVuZXIobGlzdGVuZXIsICdhZGQnKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWdpc3Rlckxpc3RlbmVyKGxpc3RlbmVyLCBmYWxzZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZCBsaXN0ZW5lciB0byB0aGUgc2lnbmFsIHRoYXQgc2hvdWxkIGJlIHJlbW92ZWQgYWZ0ZXIgZmlyc3QgZXhlY3V0aW9uICh3aWxsIGJlIGV4ZWN1dGVkIG9ubHkgb25jZSkuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIFNpZ25hbCBoYW5kbGVyIGZ1bmN0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2xpc3RlbmVyQ29udGV4dF0gQ29udGV4dCBvbiB3aGljaCBsaXN0ZW5lciB3aWxsIGJlIGV4ZWN1dGVkIChvYmplY3QgdGhhdCBzaG91bGQgcmVwcmVzZW50IHRoZSBgdGhpc2AgdmFyaWFibGUgaW5zaWRlIGxpc3RlbmVyIGZ1bmN0aW9uKS5cbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IFtwcmlvcml0eV0gVGhlIHByaW9yaXR5IGxldmVsIG9mIHRoZSBldmVudCBsaXN0ZW5lci4gTGlzdGVuZXJzIHdpdGggaGlnaGVyIHByaW9yaXR5IHdpbGwgYmUgZXhlY3V0ZWQgYmVmb3JlIGxpc3RlbmVycyB3aXRoIGxvd2VyIHByaW9yaXR5LiBMaXN0ZW5lcnMgd2l0aCBzYW1lIHByaW9yaXR5IGxldmVsIHdpbGwgYmUgZXhlY3V0ZWQgYXQgdGhlIHNhbWUgb3JkZXIgYXMgdGhleSB3ZXJlIGFkZGVkLiAoZGVmYXVsdCA9IDApXG4gICAgICAgICAqIEByZXR1cm4ge1NpZ25hbEJpbmRpbmd9IEFuIE9iamVjdCByZXByZXNlbnRpbmcgdGhlIGJpbmRpbmcgYmV0d2VlbiB0aGUgU2lnbmFsIGFuZCBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGFkZE9uY2UgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpIHtcbiAgICAgICAgICAgIHZhbGlkYXRlTGlzdGVuZXIobGlzdGVuZXIsICdhZGRPbmNlJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcmVnaXN0ZXJMaXN0ZW5lcihsaXN0ZW5lciwgdHJ1ZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZSBhIHNpbmdsZSBsaXN0ZW5lciBmcm9tIHRoZSBkaXNwYXRjaCBxdWV1ZS5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgSGFuZGxlciBmdW5jdGlvbiB0aGF0IHNob3VsZCBiZSByZW1vdmVkLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbnRleHRdIEV4ZWN1dGlvbiBjb250ZXh0IChzaW5jZSB5b3UgY2FuIGFkZCB0aGUgc2FtZSBoYW5kbGVyIG11bHRpcGxlIHRpbWVzIGlmIGV4ZWN1dGluZyBpbiBhIGRpZmZlcmVudCBjb250ZXh0KS5cbiAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb259IExpc3RlbmVyIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmUgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHZhbGlkYXRlTGlzdGVuZXIobGlzdGVuZXIsICdyZW1vdmUnKTtcblxuICAgICAgICAgICAgdmFyIGkgPSB0aGlzLl9pbmRleE9mTGlzdGVuZXIobGlzdGVuZXIsIGNvbnRleHQpO1xuICAgICAgICAgICAgaWYgKGkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZGluZ3NbaV0uX2Rlc3Ryb3koKTsgLy9ubyByZWFzb24gdG8gYSBTaWduYWxCaW5kaW5nIGV4aXN0IGlmIGl0IGlzbid0IGF0dGFjaGVkIHRvIGEgc2lnbmFsXG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZGluZ3Muc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGxpc3RlbmVyO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmUgYWxsIGxpc3RlbmVycyBmcm9tIHRoZSBTaWduYWwuXG4gICAgICAgICAqL1xuICAgICAgICByZW1vdmVBbGwgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbiA9IHRoaXMuX2JpbmRpbmdzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChuLS0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9iaW5kaW5nc1tuXS5fZGVzdHJveSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fYmluZGluZ3MubGVuZ3RoID0gMDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7bnVtYmVyfSBOdW1iZXIgb2YgbGlzdGVuZXJzIGF0dGFjaGVkIHRvIHRoZSBTaWduYWwuXG4gICAgICAgICAqL1xuICAgICAgICBnZXROdW1MaXN0ZW5lcnMgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYmluZGluZ3MubGVuZ3RoO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdG9wIHByb3BhZ2F0aW9uIG9mIHRoZSBldmVudCwgYmxvY2tpbmcgdGhlIGRpc3BhdGNoIHRvIG5leHQgbGlzdGVuZXJzIG9uIHRoZSBxdWV1ZS5cbiAgICAgICAgICogPHA+PHN0cm9uZz5JTVBPUlRBTlQ6PC9zdHJvbmc+IHNob3VsZCBiZSBjYWxsZWQgb25seSBkdXJpbmcgc2lnbmFsIGRpc3BhdGNoLCBjYWxsaW5nIGl0IGJlZm9yZS9hZnRlciBkaXNwYXRjaCB3b24ndCBhZmZlY3Qgc2lnbmFsIGJyb2FkY2FzdC48L3A+XG4gICAgICAgICAqIEBzZWUgU2lnbmFsLnByb3RvdHlwZS5kaXNhYmxlXG4gICAgICAgICAqL1xuICAgICAgICBoYWx0IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5fc2hvdWxkUHJvcGFnYXRlID0gZmFsc2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERpc3BhdGNoL0Jyb2FkY2FzdCBTaWduYWwgdG8gYWxsIGxpc3RlbmVycyBhZGRlZCB0byB0aGUgcXVldWUuXG4gICAgICAgICAqIEBwYXJhbSB7Li4uKn0gW3BhcmFtc10gUGFyYW1ldGVycyB0aGF0IHNob3VsZCBiZSBwYXNzZWQgdG8gZWFjaCBoYW5kbGVyLlxuICAgICAgICAgKi9cbiAgICAgICAgZGlzcGF0Y2ggOiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICBpZiAoISB0aGlzLmFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdmFyIHBhcmFtc0FyciA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICAgICAgICAgICAgbiA9IHRoaXMuX2JpbmRpbmdzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBiaW5kaW5ncztcblxuICAgICAgICAgICAgaWYgKHRoaXMubWVtb3JpemUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wcmV2UGFyYW1zID0gcGFyYW1zQXJyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoISBuKSB7XG4gICAgICAgICAgICAgICAgLy9zaG91bGQgY29tZSBhZnRlciBtZW1vcml6ZVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYmluZGluZ3MgPSB0aGlzLl9iaW5kaW5ncy5zbGljZSgpOyAvL2Nsb25lIGFycmF5IGluIGNhc2UgYWRkL3JlbW92ZSBpdGVtcyBkdXJpbmcgZGlzcGF0Y2hcbiAgICAgICAgICAgIHRoaXMuX3Nob3VsZFByb3BhZ2F0ZSA9IHRydWU7IC8vaW4gY2FzZSBgaGFsdGAgd2FzIGNhbGxlZCBiZWZvcmUgZGlzcGF0Y2ggb3IgZHVyaW5nIHRoZSBwcmV2aW91cyBkaXNwYXRjaC5cblxuICAgICAgICAgICAgLy9leGVjdXRlIGFsbCBjYWxsYmFja3MgdW50aWwgZW5kIG9mIHRoZSBsaXN0IG9yIHVudGlsIGEgY2FsbGJhY2sgcmV0dXJucyBgZmFsc2VgIG9yIHN0b3BzIHByb3BhZ2F0aW9uXG4gICAgICAgICAgICAvL3JldmVyc2UgbG9vcCBzaW5jZSBsaXN0ZW5lcnMgd2l0aCBoaWdoZXIgcHJpb3JpdHkgd2lsbCBiZSBhZGRlZCBhdCB0aGUgZW5kIG9mIHRoZSBsaXN0XG4gICAgICAgICAgICBkbyB7IG4tLTsgfSB3aGlsZSAoYmluZGluZ3Nbbl0gJiYgdGhpcy5fc2hvdWxkUHJvcGFnYXRlICYmIGJpbmRpbmdzW25dLmV4ZWN1dGUocGFyYW1zQXJyKSAhPT0gZmFsc2UpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGb3JnZXQgbWVtb3JpemVkIGFyZ3VtZW50cy5cbiAgICAgICAgICogQHNlZSBTaWduYWwubWVtb3JpemVcbiAgICAgICAgICovXG4gICAgICAgIGZvcmdldCA6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB0aGlzLl9wcmV2UGFyYW1zID0gbnVsbDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIGFsbCBiaW5kaW5ncyBmcm9tIHNpZ25hbCBhbmQgZGVzdHJveSBhbnkgcmVmZXJlbmNlIHRvIGV4dGVybmFsIG9iamVjdHMgKGRlc3Ryb3kgU2lnbmFsIG9iamVjdCkuXG4gICAgICAgICAqIDxwPjxzdHJvbmc+SU1QT1JUQU5UOjwvc3Ryb25nPiBjYWxsaW5nIGFueSBtZXRob2Qgb24gdGhlIHNpZ25hbCBpbnN0YW5jZSBhZnRlciBjYWxsaW5nIGRpc3Bvc2Ugd2lsbCB0aHJvdyBlcnJvcnMuPC9wPlxuICAgICAgICAgKi9cbiAgICAgICAgZGlzcG9zZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlQWxsKCk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fYmluZGluZ3M7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fcHJldlBhcmFtcztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7c3RyaW5nfSBTdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgIHRvU3RyaW5nIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICdbU2lnbmFsIGFjdGl2ZTonKyB0aGlzLmFjdGl2ZSArJyBudW1MaXN0ZW5lcnM6JysgdGhpcy5nZXROdW1MaXN0ZW5lcnMoKSArJ10nO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG5cbiAgICAvLyBOYW1lc3BhY2UgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIFNpZ25hbHMgbmFtZXNwYWNlXG4gICAgICogQG5hbWVzcGFjZVxuICAgICAqIEBuYW1lIHNpZ25hbHNcbiAgICAgKi9cbiAgICB2YXIgc2lnbmFscyA9IFNpZ25hbDtcblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBldmVudCBicm9hZGNhc3RlclxuICAgICAqIEBzZWUgU2lnbmFsXG4gICAgICovXG4gICAgLy8gYWxpYXMgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IChzZWUgI2doLTQ0KVxuICAgIHNpZ25hbHMuU2lnbmFsID0gU2lnbmFsO1xuXG5cblxuICAgIC8vZXhwb3J0cyB0byBtdWx0aXBsZSBlbnZpcm9ubWVudHNcbiAgICBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpeyAvL0FNRFxuICAgICAgICBkZWZpbmUoZnVuY3Rpb24gKCkgeyByZXR1cm4gc2lnbmFsczsgfSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cyl7IC8vbm9kZVxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IHNpZ25hbHM7XG4gICAgfSBlbHNlIHsgLy9icm93c2VyXG4gICAgICAgIC8vdXNlIHN0cmluZyBiZWNhdXNlIG9mIEdvb2dsZSBjbG9zdXJlIGNvbXBpbGVyIEFEVkFOQ0VEX01PREVcbiAgICAgICAgLypqc2xpbnQgc3ViOnRydWUgKi9cbiAgICAgICAgZ2xvYmFsWydzaWduYWxzJ10gPSBzaWduYWxzO1xuICAgIH1cblxufSh0aGlzKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzaWduYWxzID0gcmVxdWlyZSgnc2lnbmFscycpO1xuXG5mdW5jdGlvbiBMb2FkZXIodXJsKSB7XG4gICAgdmFyIG9uUHJvZ3Jlc3MgPSBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICAgICAgb25CZWZvcmVDb21wbGV0ZSA9IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgICAgICBvbkNvbXBsZXRlID0gbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgICAgIG9uRXJyb3IgPSBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICAgICAgcHJvZ3Jlc3MgPSAwLFxuICAgICAgICBhdWRpb0NvbnRleHQsXG4gICAgICAgIGlzVG91Y2hMb2NrZWQsXG4gICAgICAgIHJlcXVlc3QsXG4gICAgICAgIGRhdGE7XG5cbiAgICB2YXIgc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoYXVkaW9Db250ZXh0KSB7XG4gICAgICAgICAgICBsb2FkQXJyYXlCdWZmZXIoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvYWRBdWRpb0VsZW1lbnQoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgbG9hZEFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgcmVxdWVzdC5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgICAgIHJlcXVlc3Qub25wcm9ncmVzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQubGVuZ3RoQ29tcHV0YWJsZSkge1xuICAgICAgICAgICAgICAgIHByb2dyZXNzID0gZXZlbnQubG9hZGVkIC8gZXZlbnQudG90YWw7XG4gICAgICAgICAgICAgICAgb25Qcm9ncmVzcy5kaXNwYXRjaChwcm9ncmVzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhdWRpb0NvbnRleHQuZGVjb2RlQXVkaW9EYXRhKFxuICAgICAgICAgICAgICAgIHJlcXVlc3QucmVzcG9uc2UsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSBidWZmZXI7XG4gICAgICAgICAgICAgICAgICAgIHByb2dyZXNzID0gMTtcbiAgICAgICAgICAgICAgICAgICAgb25Qcm9ncmVzcy5kaXNwYXRjaCgxKTtcbiAgICAgICAgICAgICAgICAgICAgb25CZWZvcmVDb21wbGV0ZS5kaXNwYXRjaChidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICBvbkNvbXBsZXRlLmRpc3BhdGNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIG9uRXJyb3IuZGlzcGF0Y2goZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgb25FcnJvci5kaXNwYXRjaChlKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgfTtcblxuICAgIHZhciBsb2FkQXVkaW9FbGVtZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGRhdGEgPSBuZXcgQXVkaW8oKTtcbiAgICAgICAgZGF0YS5uYW1lID0gdXJsO1xuICAgICAgICBkYXRhLnByZWxvYWQgPSAnYXV0byc7XG4gICAgICAgIGRhdGEuc3JjID0gdXJsO1xuXG4gICAgICAgIGlmICghIWlzVG91Y2hMb2NrZWQpIHtcbiAgICAgICAgICAgIG9uUHJvZ3Jlc3MuZGlzcGF0Y2goMSk7XG4gICAgICAgICAgICBvbkJlZm9yZUNvbXBsZXRlLmRpc3BhdGNoKGRhdGEpO1xuICAgICAgICAgICAgb25Db21wbGV0ZS5kaXNwYXRjaChkYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciB0aW1lb3V0O1xuICAgICAgICAgICAgdmFyIHJlYWR5SGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGRhdGEucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCByZWFkeUhhbmRsZXIpO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3MgPSAxO1xuICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3MuZGlzcGF0Y2goMSk7XG4gICAgICAgICAgICAgICAgb25CZWZvcmVDb21wbGV0ZS5kaXNwYXRjaChkYXRhKTtcbiAgICAgICAgICAgICAgICBvbkNvbXBsZXRlLmRpc3BhdGNoKGRhdGEpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIHRpbWVvdXQgYmVjYXVzZSBzb21ldGltZXMgY2FucGxheXRocm91Z2ggZG9lc24ndCBmaXJlXG4gICAgICAgICAgICB0aW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQocmVhZHlIYW5kbGVyLCA0MDAwKTtcbiAgICAgICAgICAgIGRhdGEuYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCByZWFkeUhhbmRsZXIsIGZhbHNlKTtcbiAgICAgICAgICAgIGRhdGEub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIG9uRXJyb3IuZGlzcGF0Y2goZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZGF0YS5sb2FkKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYocmVxdWVzdCAmJiByZXF1ZXN0LnJlYWR5U3RhdGUgIT09IDQpIHtcbiAgICAgICAgICByZXF1ZXN0LmFib3J0KCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHZhciBhcGkgPSB7XG4gICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgY2FuY2VsOiBjYW5jZWwsXG4gICAgICAgIG9uUHJvZ3Jlc3M6IG9uUHJvZ3Jlc3MsXG4gICAgICAgIG9uQ29tcGxldGU6IG9uQ29tcGxldGUsXG4gICAgICAgIG9uQmVmb3JlQ29tcGxldGU6IG9uQmVmb3JlQ29tcGxldGUsXG4gICAgICAgIG9uRXJyb3I6IG9uRXJyb3JcbiAgICB9O1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGFwaSwgJ2RhdGEnLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGFwaSwgJ3Byb2dyZXNzJywge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHByb2dyZXNzO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoYXBpLCAnYXVkaW9Db250ZXh0Jywge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBhdWRpb0NvbnRleHQgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGFwaSwgJ2lzVG91Y2hMb2NrZWQnLCB7XG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIGlzVG91Y2hMb2NrZWQgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoYXBpKTtcbn1cblxuTG9hZGVyLkdyb3VwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHF1ZXVlID0gW10sXG4gICAgICAgIG51bUxvYWRlZCA9IDAsXG4gICAgICAgIG51bVRvdGFsID0gMCxcbiAgICAgICAgb25Db21wbGV0ZSA9IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgICAgICBvblByb2dyZXNzID0gbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgICAgIG9uRXJyb3IgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcblxuICAgIHZhciBhZGQgPSBmdW5jdGlvbihsb2FkZXIpIHtcbiAgICAgICAgcXVldWUucHVzaChsb2FkZXIpO1xuICAgICAgICBudW1Ub3RhbCsrO1xuICAgICAgICByZXR1cm4gbG9hZGVyO1xuICAgIH07XG5cbiAgICB2YXIgc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgbnVtVG90YWwgPSBxdWV1ZS5sZW5ndGg7XG4gICAgICAgIG5leHQoKTtcbiAgICB9O1xuXG4gICAgdmFyIG5leHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYocXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBvbkNvbXBsZXRlLmRpc3BhdGNoKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbG9hZGVyID0gcXVldWUucG9wKCk7XG4gICAgICAgIGxvYWRlci5vblByb2dyZXNzLmFkZChwcm9ncmVzc0hhbmRsZXIpO1xuICAgICAgICBsb2FkZXIub25CZWZvcmVDb21wbGV0ZS5hZGRPbmNlKGNvbXBsZXRlSGFuZGxlcik7XG4gICAgICAgIGxvYWRlci5vbkVycm9yLmFkZE9uY2UoZXJyb3JIYW5kbGVyKTtcbiAgICAgICAgbG9hZGVyLnN0YXJ0KCk7XG4gICAgfTtcblxuICAgIHZhciBwcm9ncmVzc0hhbmRsZXIgPSBmdW5jdGlvbihwcm9ncmVzcykge1xuICAgICAgICB2YXIgbG9hZGVkID0gbnVtTG9hZGVkICsgcHJvZ3Jlc3M7XG4gICAgICAgIG9uUHJvZ3Jlc3MuZGlzcGF0Y2gobG9hZGVkIC8gbnVtVG90YWwpO1xuICAgIH07XG5cbiAgICB2YXIgY29tcGxldGVIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIG51bUxvYWRlZCsrO1xuICAgICAgICBvblByb2dyZXNzLmRpc3BhdGNoKG51bUxvYWRlZCAvIG51bVRvdGFsKTtcbiAgICAgICAgbmV4dCgpO1xuICAgIH07XG5cbiAgICB2YXIgZXJyb3JIYW5kbGVyID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBvbkVycm9yLmRpc3BhdGNoKGUpO1xuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgYWRkOiBhZGQsXG4gICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgb25Qcm9ncmVzczogb25Qcm9ncmVzcyxcbiAgICAgICAgb25Db21wbGV0ZTogb25Db21wbGV0ZSxcbiAgICAgICAgb25FcnJvcjogb25FcnJvclxuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2FkZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBBRFQgPSByZXF1aXJlKCcuL25vZGUvYWR0LmpzJyksXG4gICAgQW5hbHlzZXIgPSByZXF1aXJlKCcuL25vZGUvYW5hbHlzZXIuanMnKSxcbiAgICBEaXN0b3J0aW9uID0gcmVxdWlyZSgnLi9ub2RlL2Rpc3RvcnRpb24uanMnKSxcbiAgICBFY2hvID0gcmVxdWlyZSgnLi9ub2RlL2VjaG8uanMnKSxcbiAgICBGaWx0ZXIgPSByZXF1aXJlKCcuL25vZGUvZmlsdGVyLmpzJyksXG4gICAgRmxhbmdlciA9IHJlcXVpcmUoJy4vbm9kZS9mbGFuZ2VyLmpzJyksXG4gICAgUGFubmVyID0gcmVxdWlyZSgnLi9ub2RlL3Bhbm5lci5qcycpLFxuICAgIFBoYXNlciA9IHJlcXVpcmUoJy4vbm9kZS9waGFzZXIuanMnKSxcbiAgICBSZWNvcmRlciA9IHJlcXVpcmUoJy4vbm9kZS9yZWNvcmRlci5qcycpLFxuICAgIFJldmVyYiA9IHJlcXVpcmUoJy4vbm9kZS9yZXZlcmIuanMnKSxcbiAgICBTYXR1cmF0aW9uID0gcmVxdWlyZSgnLi9ub2RlL3NhdHVyYXRpb24uanMnKTtcblxuZnVuY3Rpb24gTm9kZU1hbmFnZXIoY29udGV4dCkge1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0IHx8IHRoaXMuY3JlYXRlRmFrZUNvbnRleHQoKTtcbiAgICB0aGlzLl9kZXN0aW5hdGlvbiA9IG51bGw7XG4gICAgdGhpcy5fbm9kZUxpc3QgPSBbXTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbn1cblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpZighbm9kZSkgeyByZXR1cm47IH1cbiAgICAvL2NvbnNvbGUubG9nKCdOb2RlTWFuYWdlci5hZGQ6Jywgbm9kZSk7XG4gICAgdGhpcy5fbm9kZUxpc3QucHVzaChub2RlKTtcbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihub2RlID09PSB0aGlzLl9ub2RlTGlzdFtpXSkge1xuICAgICAgICAgICAgdGhpcy5fbm9kZUxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIG91dHB1dCA9IG5vZGUuX291dHB1dCB8fCBub2RlO1xuICAgIG91dHB1dC5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5fdXBkYXRlQ29ubmVjdGlvbnMoKTtcbiAgICByZXR1cm4gbm9kZTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5yZW1vdmVBbGwgPSBmdW5jdGlvbigpIHtcbiAgICB3aGlsZSh0aGlzLl9ub2RlTGlzdC5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fbm9kZUxpc3QucG9wKCkuZGlzY29ubmVjdCgpO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLl9jb25uZWN0ID0gZnVuY3Rpb24oYSwgYikge1xuICAgIC8vY29uc29sZS5sb2coJz4gY29ubmVjdCcsIChhLm5hbWUgfHwgYS5jb25zdHJ1Y3Rvci5uYW1lKSwgJ3RvJywgKGIubmFtZSB8fCBiLmNvbnN0cnVjdG9yLm5hbWUpKTtcblxuICAgIHZhciBvdXRwdXQgPSBhLl9vdXRwdXQgfHwgYTtcbiAgICAvL2NvbnNvbGUubG9nKCc+IGRpc2Nvbm5lY3Qgb3V0cHV0OiAnLCAoYS5uYW1lIHx8IGEuY29uc3RydWN0b3IubmFtZSkpO1xuICAgIG91dHB1dC5kaXNjb25uZWN0KCk7XG4gICAgLy9jb25zb2xlLmxvZygnPiBjb25uZWN0IG91dHB1dDogJywgKGEubmFtZSB8fCBhLmNvbnN0cnVjdG9yLm5hbWUpLCAndG8gaW5wdXQ6JywgKGIubmFtZSB8fCBiLmNvbnN0cnVjdG9yLm5hbWUpKTtcbiAgICBvdXRwdXQuY29ubmVjdChiKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5fY29ubmVjdFRvRGVzdGluYXRpb24gPSBmdW5jdGlvbihkZXN0aW5hdGlvbikge1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoLFxuICAgICAgICBsYXN0Tm9kZSA9IGwgPyB0aGlzLl9ub2RlTGlzdFtsIC0gMV0gOiB0aGlzLl9zb3VyY2VOb2RlO1xuXG4gICAgaWYobGFzdE5vZGUpIHtcbiAgICAgICAgdGhpcy5fY29ubmVjdChsYXN0Tm9kZSwgZGVzdGluYXRpb24pO1xuICAgIH1cblxuICAgIHRoaXMuX2Rlc3RpbmF0aW9uID0gZGVzdGluYXRpb247XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuX3VwZGF0ZUNvbm5lY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHsgcmV0dXJuOyB9XG5cbiAgICAvL2NvbnNvbGUubG9nKCd1cGRhdGVDb25uZWN0aW9uczonLCB0aGlzLl9ub2RlTGlzdC5sZW5ndGgpO1xuXG4gICAgdmFyIG5vZGUsXG4gICAgICAgIHByZXY7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5vZGUgPSB0aGlzLl9ub2RlTGlzdFtpXTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhpLCBub2RlKTtcbiAgICAgICAgcHJldiA9IGkgPT09IDAgPyB0aGlzLl9zb3VyY2VOb2RlIDogdGhpcy5fbm9kZUxpc3RbaSAtIDFdO1xuICAgICAgICB0aGlzLl9jb25uZWN0KHByZXYsIG5vZGUpO1xuICAgIH1cblxuICAgIGlmKHRoaXMuX2Rlc3RpbmF0aW9uKSB7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3RUb0Rlc3RpbmF0aW9uKHRoaXMuX2Rlc3RpbmF0aW9uKTtcbiAgICB9XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTm9kZU1hbmFnZXIucHJvdG90eXBlLCAncGFubmluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fcGFubmluZykge1xuICAgICAgICAgICAgdGhpcy5fcGFubmluZyA9IG5ldyBQYW5uZXIodGhpcy5fY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Bhbm5pbmc7XG4gICAgfVxufSk7XG5cbi8qXG4gKiBFZmZlY3RzXG4gKi9cblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmFkdCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBub2RlID0gbmV3IEFEVCh0aGlzLl9jb250ZXh0LCBjb25maWcpO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5hbmFseXNlciA9IGZ1bmN0aW9uKGZmdFNpemUsIHNtb290aGluZywgbWluRGVjaWJlbHMsIG1heERlY2liZWxzKSB7XG4gICAgdmFyIGFuYWx5c2VyID0gbmV3IEFuYWx5c2VyKHRoaXMuX2NvbnRleHQsIGZmdFNpemUsIHNtb290aGluZywgbWluRGVjaWJlbHMsIG1heERlY2liZWxzKTtcbiAgICByZXR1cm4gdGhpcy5hZGQoYW5hbHlzZXIpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmNvbXByZXNzb3IgPSBmdW5jdGlvbih0aHJlc2hvbGQsIGtuZWUsIHJhdGlvLCByZWR1Y3Rpb24sIGF0dGFjaywgcmVsZWFzZSkge1xuICAgIC8vIGxvd2VycyB0aGUgdm9sdW1lIG9mIHRoZSBsb3VkZXN0IHBhcnRzIG9mIHRoZSBzaWduYWwgYW5kIHJhaXNlcyB0aGUgdm9sdW1lIG9mIHRoZSBzb2Z0ZXN0IHBhcnRzXG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcigpO1xuICAgIC8vIG1pbiBkZWNpYmVscyB0byBzdGFydCBjb21wcmVzc2luZyBhdCBmcm9tIC0xMDAgdG8gMFxuICAgIG5vZGUudGhyZXNob2xkLnZhbHVlID0gdGhyZXNob2xkICE9PSB1bmRlZmluZWQgPyB0aHJlc2hvbGQgOiAtMjQ7XG4gICAgLy8gZGVjaWJlbCB2YWx1ZSB0byBzdGFydCBjdXJ2ZSB0byBjb21wcmVzc2VkIHZhbHVlIGZyb20gMCB0byA0MFxuICAgIG5vZGUua25lZS52YWx1ZSA9IGtuZWUgIT09IHVuZGVmaW5lZCA/IGtuZWUgOiAzMDtcbiAgICAvLyBhbW91bnQgb2YgY2hhbmdlIHBlciBkZWNpYmVsIGZyb20gMSB0byAyMFxuICAgIG5vZGUucmF0aW8udmFsdWUgPSByYXRpbyAhPT0gdW5kZWZpbmVkID8gcmF0aW8gOiAxMjtcbiAgICAvLyBnYWluIHJlZHVjdGlvbiBjdXJyZW50bHkgYXBwbGllZCBieSBjb21wcmVzc29yIGZyb20gLTIwIHRvIDBcbiAgICBub2RlLnJlZHVjdGlvbi52YWx1ZSA9IHJlZHVjdGlvbiAhPT0gdW5kZWZpbmVkID8gcmVkdWN0aW9uIDogLTEwO1xuICAgIC8vIHNlY29uZHMgdG8gcmVkdWNlIGdhaW4gYnkgMTBkYiBmcm9tIDAgdG8gMSAtIGhvdyBxdWlja2x5IHNpZ25hbCBhZGFwdGVkIHdoZW4gdm9sdW1lIGluY3JlYXNlZFxuICAgIG5vZGUuYXR0YWNrLnZhbHVlID0gYXR0YWNrICE9PSB1bmRlZmluZWQgPyBhdHRhY2sgOiAwLjAwMDM7XG4gICAgLy8gc2Vjb25kcyB0byBpbmNyZWFzZSBnYWluIGJ5IDEwZGIgZnJvbSAwIHRvIDEgLSBob3cgcXVpY2tseSBzaWduYWwgYWRhcHRlZCB3aGVuIHZvbHVtZSByZWRjdWNlZFxuICAgIG5vZGUucmVsZWFzZS52YWx1ZSA9IHJlbGVhc2UgIT09IHVuZGVmaW5lZCA/IHJlbGVhc2UgOiAwLjI1O1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5jb252b2x2ZXIgPSBmdW5jdGlvbihpbXB1bHNlUmVzcG9uc2UpIHtcbiAgICAvLyBpbXB1bHNlUmVzcG9uc2UgaXMgYW4gYXVkaW8gZmlsZSBidWZmZXJcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlQ29udm9sdmVyKCk7XG4gICAgbm9kZS5idWZmZXIgPSBpbXB1bHNlUmVzcG9uc2U7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24odGltZSkge1xuICAgIHZhciBub2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIGlmKHRpbWUgIT09IHVuZGVmaW5lZCkgeyBub2RlLmRlbGF5VGltZS52YWx1ZSA9IHRpbWU7IH1cbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuZWNobyA9IGZ1bmN0aW9uKHRpbWUsIGdhaW4pIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBFY2hvKHRoaXMuX2NvbnRleHQsIHRpbWUsIGdhaW4pO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5kaXN0b3J0aW9uID0gZnVuY3Rpb24oYW1vdW50KSB7XG4gICAgdmFyIG5vZGUgPSBuZXcgRGlzdG9ydGlvbih0aGlzLl9jb250ZXh0LCBhbW91bnQpO1xuICAgIC8vIEZsb2F0MzJBcnJheSBkZWZpbmluZyBjdXJ2ZSAodmFsdWVzIGFyZSBpbnRlcnBvbGF0ZWQpXG4gICAgLy9ub2RlLmN1cnZlXG4gICAgLy8gdXAtc2FtcGxlIGJlZm9yZSBhcHBseWluZyBjdXJ2ZSBmb3IgYmV0dGVyIHJlc29sdXRpb24gcmVzdWx0ICdub25lJywgJzJ4JyBvciAnNHgnXG4gICAgLy9ub2RlLm92ZXJzYW1wbGUgPSAnMngnO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5maWx0ZXIgPSBmdW5jdGlvbih0eXBlLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICB2YXIgZmlsdGVyID0gbmV3IEZpbHRlcih0aGlzLl9jb250ZXh0LCB0eXBlLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xuICAgIHJldHVybiB0aGlzLmFkZChmaWx0ZXIpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmxvd3Bhc3MgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2xvd3Bhc3MnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmhpZ2hwYXNzID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdoaWdocGFzcycsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuYmFuZHBhc3MgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2JhbmRwYXNzJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5sb3dzaGVsZiA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignbG93c2hlbGYnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmhpZ2hzaGVsZiA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignaGlnaHNoZWxmJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5wZWFraW5nID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdwZWFraW5nJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5ub3RjaCA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignbm90Y2gnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmFsbHBhc3MgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2FsbHBhc3MnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmZsYW5nZXIgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBGbGFuZ2VyKHRoaXMuX2NvbnRleHQsIGNvbmZpZyk7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmdhaW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBub2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgaWYodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBub2RlLmdhaW4udmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUucGFubmVyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vZGUgPSBuZXcgUGFubmVyKHRoaXMuX2NvbnRleHQpO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5waGFzZXIgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBQaGFzZXIodGhpcy5fY29udGV4dCwgY29uZmlnKTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUucmVjb3JkZXIgPSBmdW5jdGlvbihwYXNzVGhyb3VnaCkge1xuICAgIHZhciBub2RlID0gbmV3IFJlY29yZGVyKHRoaXMuX2NvbnRleHQsIHBhc3NUaHJvdWdoKTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUucmV2ZXJiID0gZnVuY3Rpb24oc2Vjb25kcywgZGVjYXksIHJldmVyc2UpIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBSZXZlcmIodGhpcy5fY29udGV4dCwgc2Vjb25kcywgZGVjYXksIHJldmVyc2UpO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5zYXR1cmF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vZGUgPSBuZXcgU2F0dXJhdGlvbih0aGlzLl9jb250ZXh0KTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuc2NyaXB0UHJvY2Vzc29yID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuICAgIC8vIGJ1ZmZlclNpemUgMjU2IC0gMTYzODQgKHBvdyAyKVxuICAgIHZhciBidWZmZXJTaXplID0gY29uZmlnLmJ1ZmZlclNpemUgfHwgMTAyNDtcbiAgICB2YXIgaW5wdXRDaGFubmVscyA9IGNvbmZpZy5pbnB1dENoYW5uZWxzID09PSB1bmRlZmluZWQgPyAwIDogaW5wdXRDaGFubmVscztcbiAgICB2YXIgb3V0cHV0Q2hhbm5lbHMgPSBjb25maWcub3V0cHV0Q2hhbm5lbHMgPT09IHVuZGVmaW5lZCA/IDEgOiBvdXRwdXRDaGFubmVscztcbiAgICBcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKGJ1ZmZlclNpemUsIGlucHV0Q2hhbm5lbHMsIG91dHB1dENoYW5uZWxzKTtcbiAgICBcbiAgICB2YXIgY2FsbGJhY2sgPSBjb25maWcuY2FsbGJhY2sgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICB2YXIgdGhpc0FyZyA9IGNvbmZpZy50aGlzQXJnIHx8IGNvbmZpZy5jb250ZXh0IHx8IG5vZGU7XG5cbiAgICBub2RlLm9uYXVkaW9wcm9jZXNzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIC8vIGF2YWlsYWJsZSBwcm9wczpcbiAgICAgICAgLypcbiAgICAgICAgZXZlbnQuaW5wdXRCdWZmZXJcbiAgICAgICAgZXZlbnQub3V0cHV0QnVmZmVyXG4gICAgICAgIGV2ZW50LnBsYXliYWNrVGltZVxuICAgICAgICAqL1xuICAgICAgICAvLyBFeGFtcGxlOiBnZW5lcmF0ZSBub2lzZVxuICAgICAgICAvKlxuICAgICAgICB2YXIgb3V0cHV0ID0gZXZlbnQub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICB2YXIgbCA9IG91dHB1dC5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBvdXRwdXRbaV0gPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgICB9XG4gICAgICAgICovXG4gICAgICAgIGNhbGxiYWNrLmNhbGwodGhpc0FyZywgZXZlbnQpO1xuICAgIH07XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmNyZWF0ZUZha2VDb250ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZuID0gZnVuY3Rpb24oKXt9O1xuICAgIHZhciBwYXJhbSA9IHtcbiAgICAgICAgdmFsdWU6IDEsXG4gICAgICAgIGRlZmF1bHRWYWx1ZTogMSxcbiAgICAgICAgbGluZWFyUmFtcFRvVmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICBzZXRWYWx1ZUF0VGltZTogZm4sXG4gICAgICAgIGV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICBzZXRUYXJnZXRBdFRpbWU6IGZuLFxuICAgICAgICBzZXRWYWx1ZUN1cnZlQXRUaW1lOiBmbixcbiAgICAgICAgY2FuY2VsU2NoZWR1bGVkVmFsdWVzOiBmblxuICAgIH07XG4gICAgdmFyIGZha2VOb2RlID0ge1xuICAgICAgICBjb25uZWN0OmZuLFxuICAgICAgICBkaXNjb25uZWN0OmZuLFxuICAgICAgICAvLyBnYWluXG4gICAgICAgIGdhaW46e3ZhbHVlOiAxfSxcbiAgICAgICAgLy8gcGFubmVyXG4gICAgICAgIHBhbm5pbmdNb2RlbDogMCxcbiAgICAgICAgc2V0UG9zaXRpb246IGZuLFxuICAgICAgICBzZXRPcmllbnRhdGlvbjogZm4sXG4gICAgICAgIHNldFZlbG9jaXR5OiBmbixcbiAgICAgICAgZGlzdGFuY2VNb2RlbDogMCxcbiAgICAgICAgcmVmRGlzdGFuY2U6IDAsXG4gICAgICAgIG1heERpc3RhbmNlOiAwLFxuICAgICAgICByb2xsb2ZmRmFjdG9yOiAwLFxuICAgICAgICBjb25lSW5uZXJBbmdsZTogMzYwLFxuICAgICAgICBjb25lT3V0ZXJBbmdsZTogMzYwLFxuICAgICAgICBjb25lT3V0ZXJHYWluOiAwLFxuICAgICAgICAvLyBmaWx0ZXI6XG4gICAgICAgIHR5cGU6MCxcbiAgICAgICAgZnJlcXVlbmN5OiBwYXJhbSxcbiAgICAgICAgLy8gZGVsYXlcbiAgICAgICAgZGVsYXlUaW1lOiBwYXJhbSxcbiAgICAgICAgLy8gY29udm9sdmVyXG4gICAgICAgIGJ1ZmZlcjogMCxcbiAgICAgICAgLy8gYW5hbHlzZXJcbiAgICAgICAgc21vb3RoaW5nVGltZUNvbnN0YW50OiAwLFxuICAgICAgICBmZnRTaXplOiAwLFxuICAgICAgICBtaW5EZWNpYmVsczogMCxcbiAgICAgICAgbWF4RGVjaWJlbHM6IDAsXG4gICAgICAgIC8vIGNvbXByZXNzb3JcbiAgICAgICAgdGhyZXNob2xkOiBwYXJhbSxcbiAgICAgICAga25lZTogcGFyYW0sXG4gICAgICAgIHJhdGlvOiBwYXJhbSxcbiAgICAgICAgYXR0YWNrOiBwYXJhbSxcbiAgICAgICAgcmVsZWFzZTogcGFyYW0sXG4gICAgICAgIC8vIGRpc3RvcnRpb25cbiAgICAgICAgb3ZlcnNhbXBsZTogMCxcbiAgICAgICAgY3VydmU6IDAsXG4gICAgICAgIC8vIGJ1ZmZlclxuICAgICAgICBzYW1wbGVSYXRlOiAxLFxuICAgICAgICBsZW5ndGg6IDAsXG4gICAgICAgIGR1cmF0aW9uOiAwLFxuICAgICAgICBudW1iZXJPZkNoYW5uZWxzOiAwLFxuICAgICAgICBnZXRDaGFubmVsRGF0YTogZnVuY3Rpb24oKSB7IHJldHVybiBbXTsgfSxcbiAgICAgICAgY29weUZyb21DaGFubmVsOiBmbixcbiAgICAgICAgY29weVRvQ2hhbm5lbDogZm5cbiAgICB9O1xuICAgIHZhciByZXR1cm5GYWtlTm9kZSA9IGZ1bmN0aW9uKCl7IHJldHVybiBmYWtlTm9kZTsgfTtcbiAgICByZXR1cm4ge1xuICAgICAgICBjcmVhdGVBbmFseXNlcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUJ1ZmZlcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUJpcXVhZEZpbHRlcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUNvbnZvbHZlcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZURlbGF5OiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlR2FpbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGdhaW46IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDEsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRWYWx1ZTogMSxcbiAgICAgICAgICAgICAgICAgICAgbGluZWFyUmFtcFRvVmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICAgICAgICAgICAgICBzZXRWYWx1ZUF0VGltZTogZm4sXG4gICAgICAgICAgICAgICAgICAgIGV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICAgICAgICAgICAgICBzZXRUYXJnZXRBdFRpbWU6IGZuLFxuICAgICAgICAgICAgICAgICAgICBzZXRWYWx1ZUN1cnZlQXRUaW1lOiBmbixcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsU2NoZWR1bGVkVmFsdWVzOiBmblxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY29ubmVjdDpmbixcbiAgICAgICAgICAgICAgICBkaXNjb25uZWN0OmZuXG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICBjcmVhdGVQYW5uZXI6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVTY3JpcHRQcm9jZXNzb3I6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVXYXZlU2hhcGVyOiByZXR1cm5GYWtlTm9kZVxuICAgIH07XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuc2V0U291cmNlID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBub2RlO1xuICAgIHRoaXMuX3VwZGF0ZUNvbm5lY3Rpb25zKCk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuc2V0RGVzdGluYXRpb24gPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdGhpcy5fY29ubmVjdFRvRGVzdGluYXRpb24obm9kZSk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGVNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBBRFQoY29udGV4dCwgY29uZmlnKSB7XG4gICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuICAgIHZhciBkZWxheVRpbWUgPSBjb25maWcuZGVsYXkgfHwgMC4wMjAsXG4gICAgICAgIGxmb0dhaW4gPSBjb25maWcuZ2FpbiB8fCAwLjAwMixcbiAgICAgICAgbGZvRnJlcSA9IGNvbmZpZy5mcmVxdWVuY3kgfHwgMC4yNTtcblxuICAgIHZhciBpbnB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBkZWxheSA9IGNvbnRleHQuY3JlYXRlRGVsYXkoKTtcbiAgICB2YXIgbGZvID0gY29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgdmFyIGdhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgb3V0cHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG5cbiAgICBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBkZWxheVRpbWU7IC8vIDUtMjVtcyBkZWxheSAoMC4wMDUgPiAwLjAyNSlcblxuICAgIGxmby50eXBlID0gJ3NpbmUnO1xuICAgIGxmby5mcmVxdWVuY3kudmFsdWUgPSBsZm9GcmVxOyAvLyAwLjA1ID4gNVxuICAgIGdhaW4uZ2Fpbi52YWx1ZSA9IGxmb0dhaW47IC8vIDAuMDAwNSA+IDAuMDA1XG5cbiAgICBpbnB1dC5jb25uZWN0KG91dHB1dCk7XG4gICAgaW5wdXQuY29ubmVjdChkZWxheSk7XG4gICAgZGVsYXkuY29ubmVjdChvdXRwdXQpO1xuXG4gICAgbGZvLmNvbm5lY3QoZ2Fpbik7XG4gICAgZ2Fpbi5jb25uZWN0KGRlbGF5LmRlbGF5VGltZSk7XG4gICAgbGZvLnN0YXJ0KDApO1xuXG4gICAgdmFyIG5vZGUgPSBpbnB1dDtcbiAgICBub2RlLm5hbWUgPSAnQURUJztcbiAgICBub2RlLl9vdXRwdXQgPSBvdXRwdXQ7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZGVsYXkuZGVsYXlUaW1lLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBkZWxheS5kZWxheVRpbWUudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBsZm9GcmVxdWVuY3k6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBsZm8uZnJlcXVlbmN5LnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBsZm8uZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgbGZvR2Fpbjoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGdhaW4uZ2Fpbi52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZ2Fpbi5nYWluLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQURUO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBBbmFseXNlcihjb250ZXh0LCBmZnRTaXplLCBzbW9vdGhpbmcsIG1pbkRlY2liZWxzLCBtYXhEZWNpYmVscykge1xuICAgIGZmdFNpemUgPSBmZnRTaXplIHx8IDMyO1xuICAgIHZhciB3YXZlZm9ybURhdGEsIGZyZXF1ZW5jeURhdGE7XG5cbiAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICBub2RlLmZmdFNpemUgPSBmZnRTaXplOyAvLyBmcmVxdWVuY3lCaW5Db3VudCB3aWxsIGJlIGhhbGYgdGhpcyB2YWx1ZVxuXG4gICAgaWYoc21vb3RoaW5nICE9PSB1bmRlZmluZWQpIHsgbm9kZS5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSBzbW9vdGhpbmc7IH1cbiAgICBpZihtaW5EZWNpYmVscyAhPT0gdW5kZWZpbmVkKSB7IG5vZGUubWluRGVjaWJlbHMgPSBtaW5EZWNpYmVsczsgfVxuICAgIGlmKG1heERlY2liZWxzICE9PSB1bmRlZmluZWQpIHsgbm9kZS5tYXhEZWNpYmVscyA9IG1heERlY2liZWxzOyB9XG5cbiAgICB2YXIgdXBkYXRlRkZUU2l6ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZihmZnRTaXplICE9PSBub2RlLmZmdFNpemUgfHwgd2F2ZWZvcm1EYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHdhdmVmb3JtRGF0YSA9IG5ldyBVaW50OEFycmF5KG5vZGUuZmZ0U2l6ZSk7XG4gICAgICAgICAgICBmcmVxdWVuY3lEYXRhID0gbmV3IFVpbnQ4QXJyYXkobm9kZS5mcmVxdWVuY3lCaW5Db3VudCk7XG4gICAgICAgICAgICBmZnRTaXplID0gbm9kZS5mZnRTaXplO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB1cGRhdGVGRlRTaXplKCk7XG5cbiAgICBub2RlLmdldFdhdmVmb3JtID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHVwZGF0ZUZGVFNpemUoKTtcbiAgICAgICAgdGhpcy5nZXRCeXRlVGltZURvbWFpbkRhdGEod2F2ZWZvcm1EYXRhKTtcbiAgICAgICAgcmV0dXJuIHdhdmVmb3JtRGF0YTtcbiAgICB9O1xuXG4gICAgbm9kZS5nZXRGcmVxdWVuY2llcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB1cGRhdGVGRlRTaXplKCk7XG4gICAgICAgIHRoaXMuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZnJlcXVlbmN5RGF0YSk7XG4gICAgICAgIHJldHVybiBmcmVxdWVuY3lEYXRhO1xuICAgIH07XG5cbiAgICAvLyBtYXAgbmF0aXZlIHByb3BlcnRpZXMgb2YgQW5hbHlzZXJOb2RlXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICAnc21vb3RoaW5nJzoge1xuICAgICAgICAgICAgLy8gMCB0byAxXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5zbW9vdGhpbmdUaW1lQ29uc3RhbnQ7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IG5vZGUuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gdmFsdWU7IH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQW5hbHlzZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIERpc3RvcnRpb24oY29udGV4dCwgYW1vdW50KSB7XG4gICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZVdhdmVTaGFwZXIoKTtcblxuICAgIC8vIGNyZWF0ZSB3YXZlU2hhcGVyIGRpc3RvcnRpb24gY3VydmUgZnJvbSAwIHRvIDFcbiAgICBub2RlLnVwZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGFtb3VudCA9IHZhbHVlO1xuICAgICAgICB2YXIgayA9IHZhbHVlICogMTAwLFxuICAgICAgICAgICAgbiA9IDIyMDUwLFxuICAgICAgICAgICAgY3VydmUgPSBuZXcgRmxvYXQzMkFycmF5KG4pLFxuICAgICAgICAgICAgZGVnID0gTWF0aC5QSSAvIDE4MCxcbiAgICAgICAgICAgIHg7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIHggPSBpICogMiAvIG4gLSAxO1xuICAgICAgICAgICAgY3VydmVbaV0gPSAoMyArIGspICogeCAqIDIwICogZGVnIC8gKE1hdGguUEkgKyBrICogTWF0aC5hYnMoeCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jdXJ2ZSA9IGN1cnZlO1xuICAgIH07XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgICdhbW91bnQnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gYW1vdW50OyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB0aGlzLnVwZGF0ZSh2YWx1ZSk7IH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYoYW1vdW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbm9kZS51cGRhdGUoYW1vdW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEaXN0b3J0aW9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBFY2hvKGNvbnRleHQsIGRlbGF5VGltZSwgZ2FpblZhbHVlKSB7XG4gICAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGRlbGF5ID0gY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIHZhciBnYWluID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgZ2Fpbi5nYWluLnZhbHVlID0gZ2FpblZhbHVlIHx8IDAuNTtcbiAgICBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBkZWxheVRpbWUgfHwgMC41O1xuXG4gICAgaW5wdXQuY29ubmVjdChkZWxheSk7XG4gICAgaW5wdXQuY29ubmVjdChvdXRwdXQpO1xuICAgIGRlbGF5LmNvbm5lY3QoZ2Fpbik7XG4gICAgZ2Fpbi5jb25uZWN0KGRlbGF5KTtcbiAgICBnYWluLmNvbm5lY3Qob3V0cHV0KTtcblxuICAgIHZhciBub2RlID0gaW5wdXQ7XG4gICAgbm9kZS5uYW1lID0gJ0VjaG8nO1xuICAgIG5vZGUuX291dHB1dCA9IG91dHB1dDtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBkZWxheS5kZWxheVRpbWUudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGZlZWRiYWNrOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZ2Fpbi5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBnYWluLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFY2hvO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGaWx0ZXIoY29udGV4dCwgdHlwZSwgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgLy8gRnJlcXVlbmN5IGJldHdlZW4gNDBIeiBhbmQgaGFsZiBvZiB0aGUgc2FtcGxpbmcgcmF0ZVxuICAgIHZhciBtaW5GcmVxdWVuY3kgPSA0MDtcbiAgICB2YXIgbWF4RnJlcXVlbmN5ID0gY29udGV4dC5zYW1wbGVSYXRlIC8gMjtcblxuICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICBub2RlLnR5cGUgPSB0eXBlO1xuXG4gICAgaWYoZnJlcXVlbmN5ICE9PSB1bmRlZmluZWQpIHsgbm9kZS5mcmVxdWVuY3kudmFsdWUgPSBmcmVxdWVuY3k7IH1cbiAgICBpZihxdWFsaXR5ICE9PSB1bmRlZmluZWQpIHsgbm9kZS5RLnZhbHVlID0gcXVhbGl0eTsgfVxuICAgIGlmKGdhaW4gIT09IHVuZGVmaW5lZCkgeyBub2RlLmdhaW4udmFsdWUgPSBnYWluOyB9XG5cblxuICAgIHZhciBnZXRGcmVxdWVuY3kgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBMb2dhcml0aG0gKGJhc2UgMikgdG8gY29tcHV0ZSBob3cgbWFueSBvY3RhdmVzIGZhbGwgaW4gdGhlIHJhbmdlLlxuICAgICAgICB2YXIgbnVtYmVyT2ZPY3RhdmVzID0gTWF0aC5sb2cobWF4RnJlcXVlbmN5IC8gbWluRnJlcXVlbmN5KSAvIE1hdGguTE4yO1xuICAgICAgICAvLyBDb21wdXRlIGEgbXVsdGlwbGllciBmcm9tIDAgdG8gMSBiYXNlZCBvbiBhbiBleHBvbmVudGlhbCBzY2FsZS5cbiAgICAgICAgdmFyIG11bHRpcGxpZXIgPSBNYXRoLnBvdygyLCBudW1iZXJPZk9jdGF2ZXMgKiAodmFsdWUgLSAxLjApKTtcbiAgICAgICAgLy8gR2V0IGJhY2sgdG8gdGhlIGZyZXF1ZW5jeSB2YWx1ZSBiZXR3ZWVuIG1pbiBhbmQgbWF4LlxuICAgICAgICByZXR1cm4gbWF4RnJlcXVlbmN5ICogbXVsdGlwbGllcjtcbiAgICB9O1xuXG4gICAgbm9kZS51cGRhdGUgPSBmdW5jdGlvbihmcmVxdWVuY3ksIGdhaW4pIHtcbiAgICAgICAgaWYoZnJlcXVlbmN5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZnJlcXVlbmN5LnZhbHVlID0gZnJlcXVlbmN5O1xuICAgICAgICB9XG4gICAgICAgIGlmKGdhaW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5nYWluLnZhbHVlID0gZ2FpbjtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBub2RlLnNldEJ5UGVyY2VudCA9IGZ1bmN0aW9uKHBlcmNlbnQsIHF1YWxpdHksIGdhaW4pIHtcbiAgICAgICAgLy8gc2V0IGZpbHRlciBmcmVxdWVuY3kgYmFzZWQgb24gdmFsdWUgZnJvbSAwIHRvIDFcbiAgICAgICAgbm9kZS5mcmVxdWVuY3kudmFsdWUgPSBnZXRGcmVxdWVuY3kocGVyY2VudCk7XG4gICAgICAgIGlmKHF1YWxpdHkgIT09IHVuZGVmaW5lZCkgeyBub2RlLlEudmFsdWUgPSBxdWFsaXR5OyB9XG4gICAgICAgIGlmKGdhaW4gIT09IHVuZGVmaW5lZCkgeyBub2RlLmdhaW4udmFsdWUgPSBnYWluOyB9XG4gICAgfTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbHRlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTW9ub0ZsYW5nZXIoY29udGV4dCwgY29uZmlnKSB7XG4gICAgdmFyIGZlZWRiYWNrR2FpbiA9IGNvbmZpZy5mZWVkYmFjayB8fCAwLjUsXG4gICAgICAgIGRlbGF5VGltZSA9IGNvbmZpZy5kZWxheSB8fCAwLjAwNSxcbiAgICAgICAgbGZvR2FpbiA9IGNvbmZpZy5nYWluIHx8IDAuMDAyLFxuICAgICAgICBsZm9GcmVxID0gY29uZmlnLmZyZXF1ZW5jeSB8fCAwLjI1O1xuXG4gICAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGRlbGF5ID0gY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIHZhciBmZWVkYmFjayA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBsZm8gPSBjb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICB2YXIgZ2FpbiA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBvdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgIGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5VGltZTsgLy8gNS0yNW1zIGRlbGF5ICgwLjAwNSA+IDAuMDI1KVxuICAgIGZlZWRiYWNrLmdhaW4udmFsdWUgPSBmZWVkYmFja0dhaW47IC8vIDAgPiAxXG5cbiAgICBsZm8udHlwZSA9ICdzaW5lJztcbiAgICBsZm8uZnJlcXVlbmN5LnZhbHVlID0gbGZvRnJlcTsgLy8gMC4wNSA+IDVcbiAgICBnYWluLmdhaW4udmFsdWUgPSBsZm9HYWluOyAvLyAwLjAwMDUgPiAwLjAwNVxuXG4gICAgaW5wdXQuY29ubmVjdChvdXRwdXQpO1xuICAgIGlucHV0LmNvbm5lY3QoZGVsYXkpO1xuICAgIGRlbGF5LmNvbm5lY3Qob3V0cHV0KTtcbiAgICBkZWxheS5jb25uZWN0KGZlZWRiYWNrKTtcbiAgICBmZWVkYmFjay5jb25uZWN0KGlucHV0KTtcblxuICAgIGxmby5jb25uZWN0KGdhaW4pO1xuICAgIGdhaW4uY29ubmVjdChkZWxheS5kZWxheVRpbWUpO1xuICAgIGxmby5zdGFydCgwKTtcbiAgICBcbiAgICB2YXIgbm9kZSA9IGlucHV0O1xuICAgIG5vZGUubmFtZSA9ICdGbGFuZ2VyJztcbiAgICBub2RlLl9vdXRwdXQgPSBvdXRwdXQ7XG4gICAgXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGRlbGF5LmRlbGF5VGltZS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZGVsYXkuZGVsYXlUaW1lLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgbGZvRnJlcXVlbmN5OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbGZvLmZyZXF1ZW5jeS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbGZvLmZyZXF1ZW5jeS52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGxmb0dhaW46IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBnYWluLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGdhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGZlZWRiYWNrOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmVlZGJhY2suZ2Fpbi52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZmVlZGJhY2suZ2Fpbi52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBTdGVyZW9GbGFuZ2VyKGNvbnRleHQsIGNvbmZpZykge1xuICAgIHZhciBmZWVkYmFja0dhaW4gPSBjb25maWcuZmVlZGJhY2sgfHwgMC41LFxuICAgICAgICBkZWxheVRpbWUgPSBjb25maWcuZGVsYXkgfHwgMC4wMDMsXG4gICAgICAgIGxmb0dhaW4gPSBjb25maWcuZ2FpbiB8fCAwLjAwNSxcbiAgICAgICAgbGZvRnJlcSA9IGNvbmZpZy5mcmVxdWVuY3kgfHwgMC41O1xuXG4gICAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIHNwbGl0dGVyID0gY29udGV4dC5jcmVhdGVDaGFubmVsU3BsaXR0ZXIoMik7XG4gICAgdmFyIG1lcmdlciA9IGNvbnRleHQuY3JlYXRlQ2hhbm5lbE1lcmdlcigyKTtcbiAgICB2YXIgZmVlZGJhY2tMID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGZlZWRiYWNrUiA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBsZm8gPSBjb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICB2YXIgbGZvR2FpbkwgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgbGZvR2FpblIgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgZGVsYXlMID0gY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIHZhciBkZWxheVIgPSBjb250ZXh0LmNyZWF0ZURlbGF5KCk7XG4gICAgdmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgZmVlZGJhY2tMLmdhaW4udmFsdWUgPSBmZWVkYmFja1IuZ2Fpbi52YWx1ZSA9IGZlZWRiYWNrR2FpbjtcbiAgICBkZWxheUwuZGVsYXlUaW1lLnZhbHVlID0gZGVsYXlSLmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5VGltZTtcblxuICAgIGxmby50eXBlID0gJ3NpbmUnO1xuICAgIGxmby5mcmVxdWVuY3kudmFsdWUgPSBsZm9GcmVxO1xuICAgIGxmb0dhaW5MLmdhaW4udmFsdWUgPSBsZm9HYWluO1xuICAgIGxmb0dhaW5SLmdhaW4udmFsdWUgPSAwIC0gbGZvR2FpbjtcblxuICAgIGlucHV0LmNvbm5lY3Qoc3BsaXR0ZXIpO1xuICAgIFxuICAgIHNwbGl0dGVyLmNvbm5lY3QoZGVsYXlMLCAwKTtcbiAgICBzcGxpdHRlci5jb25uZWN0KGRlbGF5UiwgMSk7XG4gICAgXG4gICAgZGVsYXlMLmNvbm5lY3QoZmVlZGJhY2tMKTtcbiAgICBkZWxheVIuY29ubmVjdChmZWVkYmFja1IpO1xuXG4gICAgZmVlZGJhY2tMLmNvbm5lY3QoZGVsYXlSKTtcbiAgICBmZWVkYmFja1IuY29ubmVjdChkZWxheUwpO1xuXG4gICAgZGVsYXlMLmNvbm5lY3QobWVyZ2VyLCAwLCAwKTtcbiAgICBkZWxheVIuY29ubmVjdChtZXJnZXIsIDAsIDEpO1xuXG4gICAgbWVyZ2VyLmNvbm5lY3Qob3V0cHV0KTtcbiAgICBpbnB1dC5jb25uZWN0KG91dHB1dCk7XG5cbiAgICBsZm8uY29ubmVjdChsZm9HYWluTCk7XG4gICAgbGZvLmNvbm5lY3QobGZvR2FpblIpO1xuICAgIGxmb0dhaW5MLmNvbm5lY3QoZGVsYXlMLmRlbGF5VGltZSk7XG4gICAgbGZvR2FpblIuY29ubmVjdChkZWxheVIuZGVsYXlUaW1lKTtcbiAgICBsZm8uc3RhcnQoMCk7XG5cbiAgICB2YXIgbm9kZSA9IGlucHV0O1xuICAgIG5vZGUubmFtZSA9ICdTdGVyZW9GbGFuZ2VyJztcbiAgICBub2RlLl9vdXRwdXQgPSBvdXRwdXQ7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZGVsYXlMLmRlbGF5VGltZS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZGVsYXlMLmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5Ui5kZWxheVRpbWUudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBsZm9GcmVxdWVuY3k6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBsZm8uZnJlcXVlbmN5LnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBsZm8uZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgbGZvR2Fpbjoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGxmb0dhaW5MLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGxmb0dhaW5MLmdhaW4udmFsdWUgPSBsZm9HYWluUi5nYWluLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgZmVlZGJhY2s6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBmZWVkYmFja0wuZ2Fpbi52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZmVlZGJhY2tMLmdhaW4udmFsdWUgPSBmZWVkYmFja1IuZ2Fpbi52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBGbGFuZ2VyKGNvbnRleHQsIGNvbmZpZykge1xuICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgICByZXR1cm4gY29uZmlnLnN0ZXJlbyA/IG5ldyBTdGVyZW9GbGFuZ2VyKGNvbnRleHQsIGNvbmZpZykgOiBuZXcgTW9ub0ZsYW5nZXIoY29udGV4dCwgY29uZmlnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGbGFuZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBQYW5uZXIoY29udGV4dCkge1xuICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVQYW5uZXIoKTtcbiAgICAvLyBEZWZhdWx0IGZvciBzdGVyZW8gaXMgJ0hSVEYnIGNhbiBhbHNvIGJlICdlcXVhbHBvd2VyJ1xuICAgIG5vZGUucGFubmluZ01vZGVsID0gUGFubmVyLmRlZmF1bHRzLnBhbm5pbmdNb2RlbDtcblxuICAgIC8vIERpc3RhbmNlIG1vZGVsIGFuZCBhdHRyaWJ1dGVzXG4gICAgLy8gQ2FuIGJlICdsaW5lYXInICdpbnZlcnNlJyAnZXhwb25lbnRpYWwnXG4gICAgbm9kZS5kaXN0YW5jZU1vZGVsID0gUGFubmVyLmRlZmF1bHRzLmRpc3RhbmNlTW9kZWw7XG4gICAgbm9kZS5yZWZEaXN0YW5jZSA9IFBhbm5lci5kZWZhdWx0cy5yZWZEaXN0YW5jZTtcbiAgICBub2RlLm1heERpc3RhbmNlID0gUGFubmVyLmRlZmF1bHRzLm1heERpc3RhbmNlO1xuICAgIG5vZGUucm9sbG9mZkZhY3RvciA9IFBhbm5lci5kZWZhdWx0cy5yb2xsb2ZmRmFjdG9yO1xuICAgIG5vZGUuY29uZUlubmVyQW5nbGUgPSBQYW5uZXIuZGVmYXVsdHMuY29uZUlubmVyQW5nbGU7XG4gICAgbm9kZS5jb25lT3V0ZXJBbmdsZSA9IFBhbm5lci5kZWZhdWx0cy5jb25lT3V0ZXJBbmdsZTtcbiAgICBub2RlLmNvbmVPdXRlckdhaW4gPSBQYW5uZXIuZGVmYXVsdHMuY29uZU91dGVyR2FpbjtcbiAgICBcbiAgICAvLyBzaW1wbGUgdmVjMyBvYmplY3QgcG9vbFxuICAgIHZhciBWZWNQb29sID0ge1xuICAgICAgICBwb29sOiBbXSxcbiAgICAgICAgZ2V0OiBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgICAgICB2YXIgdiA9IHRoaXMucG9vbC5sZW5ndGggPyB0aGlzLnBvb2wucG9wKCkgOiB7IHg6IDAsIHk6IDAsIHo6IDAgfTtcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIGEgdmVjdG9yIGhhcyBiZWVuIHBhc3NlZCBpblxuICAgICAgICAgICAgaWYoeCAhPT0gdW5kZWZpbmVkICYmIGlzTmFOKHgpICYmICd4JyBpbiB4ICYmICd5JyBpbiB4ICYmICd6JyBpbiB4KSB7XG4gICAgICAgICAgICAgICAgdi54ID0geC54IHx8IDA7XG4gICAgICAgICAgICAgICAgdi55ID0geC55IHx8IDA7XG4gICAgICAgICAgICAgICAgdi56ID0geC56IHx8IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2LnggPSB4IHx8IDA7XG4gICAgICAgICAgICAgICAgdi55ID0geSB8fCAwO1xuICAgICAgICAgICAgICAgIHYueiA9IHogfHwgMDsgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgfSxcbiAgICAgICAgZGlzcG9zZTogZnVuY3Rpb24oaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHRoaXMucG9vbC5wdXNoKGluc3RhbmNlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZ2xvYmFsVXAgPSBWZWNQb29sLmdldCgwLCAxLCAwKTtcblxuICAgIHZhciBzZXRPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKG5vZGUsIGZ3KSB7XG4gICAgICAgIC8vIHNldCB0aGUgb3JpZW50YXRpb24gb2YgdGhlIHNvdXJjZSAod2hlcmUgdGhlIGF1ZGlvIGlzIGNvbWluZyBmcm9tKVxuXG4gICAgICAgIC8vIGNhbGN1bGF0ZSB1cCB2ZWMgKCB1cCA9IChmb3J3YXJkIGNyb3NzICgwLCAxLCAwKSkgY3Jvc3MgZm9yd2FyZCApXG4gICAgICAgIHZhciB1cCA9IFZlY1Bvb2wuZ2V0KGZ3LngsIGZ3LnksIGZ3LnopO1xuICAgICAgICBjcm9zcyh1cCwgZ2xvYmFsVXApO1xuICAgICAgICBjcm9zcyh1cCwgZncpO1xuICAgICAgICBub3JtYWxpemUodXApO1xuICAgICAgICBub3JtYWxpemUoZncpO1xuXG4gICAgICAgIC8vIHNldCB0aGUgYXVkaW8gY29udGV4dCdzIGxpc3RlbmVyIHBvc2l0aW9uIHRvIG1hdGNoIHRoZSBjYW1lcmEgcG9zaXRpb25cbiAgICAgICAgbm9kZS5zZXRPcmllbnRhdGlvbihmdy54LCBmdy55LCBmdy56LCB1cC54LCB1cC55LCB1cC56KTtcblxuICAgICAgICAvLyByZXR1cm4gdGhlIHZlY3MgdG8gdGhlIHBvb2xcbiAgICAgICAgVmVjUG9vbC5kaXNwb3NlKGZ3KTtcbiAgICAgICAgVmVjUG9vbC5kaXNwb3NlKHVwKTtcbiAgICB9O1xuXG4gICAgdmFyIHNldFBvc2l0aW9uID0gZnVuY3Rpb24obm9kZSwgdmVjKSB7XG4gICAgICAgIG5vZGUuc2V0UG9zaXRpb24odmVjLngsIHZlYy55LCB2ZWMueik7XG4gICAgICAgIFZlY1Bvb2wuZGlzcG9zZSh2ZWMpO1xuICAgIH07XG5cbiAgICB2YXIgc2V0VmVsb2NpdHkgPSBmdW5jdGlvbihub2RlLCB2ZWMpIHtcbiAgICAgICAgbm9kZS5zZXRWZWxvY2l0eSh2ZWMueCwgdmVjLnksIHZlYy56KTtcbiAgICAgICAgVmVjUG9vbC5kaXNwb3NlKHZlYyk7XG4gICAgfTtcblxuICAgIC8vIGNyb3NzIHByb2R1Y3Qgb2YgMiB2ZWN0b3JzXG4gICAgdmFyIGNyb3NzID0gZnVuY3Rpb24gKCBhLCBiICkge1xuICAgICAgICB2YXIgYXggPSBhLngsIGF5ID0gYS55LCBheiA9IGEuejtcbiAgICAgICAgdmFyIGJ4ID0gYi54LCBieSA9IGIueSwgYnogPSBiLno7XG4gICAgICAgIGEueCA9IGF5ICogYnogLSBheiAqIGJ5O1xuICAgICAgICBhLnkgPSBheiAqIGJ4IC0gYXggKiBiejtcbiAgICAgICAgYS56ID0gYXggKiBieSAtIGF5ICogYng7XG4gICAgfTtcblxuICAgIC8vIG5vcm1hbGlzZSB0byB1bml0IHZlY3RvclxuICAgIHZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAodmVjMykge1xuICAgICAgICBpZih2ZWMzLnggPT09IDAgJiYgdmVjMy55ID09PSAwICYmIHZlYzMueiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHZlYzM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxlbmd0aCA9IE1hdGguc3FydCggdmVjMy54ICogdmVjMy54ICsgdmVjMy55ICogdmVjMy55ICsgdmVjMy56ICogdmVjMy56ICk7XG4gICAgICAgIHZhciBpbnZTY2FsYXIgPSAxIC8gbGVuZ3RoO1xuICAgICAgICB2ZWMzLnggKj0gaW52U2NhbGFyO1xuICAgICAgICB2ZWMzLnkgKj0gaW52U2NhbGFyO1xuICAgICAgICB2ZWMzLnogKj0gaW52U2NhbGFyO1xuICAgICAgICByZXR1cm4gdmVjMztcbiAgICB9O1xuXG4gICAgLy8gcGFuIGxlZnQgdG8gcmlnaHQgd2l0aCB2YWx1ZSBmcm9tIC0xIHRvIDFcbiAgICAvLyBjcmVhdGVzIGEgbmljZSBjdXJ2ZSB3aXRoIHpcbiAgICBub2RlLnNldFggPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB2YXIgZGVnNDUgPSBNYXRoLlBJIC8gNCxcbiAgICAgICAgICAgIGRlZzkwID0gZGVnNDUgKiAyLFxuICAgICAgICAgICAgeCA9IHZhbHVlICogZGVnNDUsXG4gICAgICAgICAgICB6ID0geCArIGRlZzkwO1xuXG4gICAgICAgIGlmICh6ID4gZGVnOTApIHtcbiAgICAgICAgICAgIHogPSBNYXRoLlBJIC0gejtcbiAgICAgICAgfVxuXG4gICAgICAgIHggPSBNYXRoLnNpbih4KTtcbiAgICAgICAgeiA9IE1hdGguc2luKHopO1xuXG4gICAgICAgIG5vZGUuc2V0UG9zaXRpb24oeCwgMCwgeik7XG4gICAgfTtcblxuICAgIC8qdmFyIHggPSAwLFxuICAgICAgICB5ID0gMCxcbiAgICAgICAgeiA9IDA7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgICd4Jzoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHg7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgeCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0UG9zaXRpb24oeCwgeSwgeik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTsqL1xuXG4gICAgLy8gc2V0IHRoZSBwb3NpdGlvbiB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG4gICAgbm9kZS5zZXRTb3VyY2VQb3NpdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0UG9zaXRpb24obm9kZSwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIGRpcmVjdGlvbiB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG4gICAgbm9kZS5zZXRTb3VyY2VPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0T3JpZW50YXRpb24obm9kZSwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHZlbG9pY3R5IG9mIHRoZSBhdWRpbyBzb3VyY2UgKGlmIG1vdmluZylcbiAgICBub2RlLnNldFNvdXJjZVZlbG9jaXR5ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRWZWxvY2l0eShub2RlLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIHNldCB0aGUgcG9zaXRpb24gb2Ygd2hvIG9yIHdoYXQgaXMgaGVhcmluZyB0aGUgYXVkaW8gKGNvdWxkIGJlIGNhbWVyYSBvciBzb21lIGNoYXJhY3RlcilcbiAgICBub2RlLnNldExpc3RlbmVyUG9zaXRpb24gPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldFBvc2l0aW9uKGNvbnRleHQubGlzdGVuZXIsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSBwb3NpdGlvbiBvZiB3aG8gb3Igd2hhdCBpcyBoZWFyaW5nIHRoZSBhdWRpbyAoY291bGQgYmUgY2FtZXJhIG9yIHNvbWUgY2hhcmFjdGVyKVxuICAgIG5vZGUuc2V0TGlzdGVuZXJPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0T3JpZW50YXRpb24oY29udGV4dC5saXN0ZW5lciwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHZlbG9jaXR5IChpZiBtb3ZpbmcpIG9mIHdobyBvciB3aGF0IGlzIGhlYXJpbmcgdGhlIGF1ZGlvIChjb3VsZCBiZSBjYW1lcmEgb3Igc29tZSBjaGFyYWN0ZXIpXG4gICAgbm9kZS5zZXRMaXN0ZW5lclZlbG9jaXR5ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRWZWxvY2l0eShjb250ZXh0Lmxpc3RlbmVyLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIGhlbHBlciB0byBjYWxjdWxhdGUgdmVsb2NpdHlcbiAgICBub2RlLmNhbGN1bGF0ZVZlbG9jaXR5ID0gZnVuY3Rpb24oY3VycmVudFBvc2l0aW9uLCBsYXN0UG9zaXRpb24sIGRlbHRhVGltZSkge1xuICAgICAgICB2YXIgZHggPSBjdXJyZW50UG9zaXRpb24ueCAtIGxhc3RQb3NpdGlvbi54O1xuICAgICAgICB2YXIgZHkgPSBjdXJyZW50UG9zaXRpb24ueSAtIGxhc3RQb3NpdGlvbi55O1xuICAgICAgICB2YXIgZHogPSBjdXJyZW50UG9zaXRpb24ueiAtIGxhc3RQb3NpdGlvbi56O1xuICAgICAgICByZXR1cm4gVmVjUG9vbC5nZXQoZHggLyBkZWx0YVRpbWUsIGR5IC8gZGVsdGFUaW1lLCBkeiAvIGRlbHRhVGltZSk7XG4gICAgfTtcblxuICAgIG5vZGUuc2V0RGVmYXVsdHMgPSBmdW5jdGlvbihkZWZhdWx0cykge1xuICAgICAgICBPYmplY3Qua2V5cyhkZWZhdWx0cykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIFBhbm5lci5kZWZhdWx0c1trZXldID0gZGVmYXVsdHNba2V5XTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5QYW5uZXIuZGVmYXVsdHMgPSB7XG4gICAgcGFubmluZ01vZGVsOiAnSFJURicsXG4gICAgZGlzdGFuY2VNb2RlbDogJ2xpbmVhcicsXG4gICAgcmVmRGlzdGFuY2U6IDEsXG4gICAgbWF4RGlzdGFuY2U6IDEwMDAsXG4gICAgcm9sbG9mZkZhY3RvcjogMSxcbiAgICBjb25lSW5uZXJBbmdsZTogMzYwLFxuICAgIGNvbmVPdXRlckFuZ2xlOiAwLFxuICAgIGNvbmVPdXRlckdhaW46IDBcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFubmVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBQaGFzZXIoY29udGV4dCwgY29uZmlnKSB7XG4gICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuICAgIHZhciBzdGFnZXMgPSBjb25maWcuc3RhZ2VzIHx8IDgsXG4gICAgICAgIGxmb0ZyZXF1ZW5jeSA9IGNvbmZpZy5mcmVxdWVuY3kgfHwgMC41LFxuICAgICAgICBsZm9HYWluVmFsdWUgPSBjb25maWcuZ2FpbiB8fCAzMDAsXG4gICAgICAgIGZlZWRiYWNrR2FpbiA9IGNvbmZpZy5mZWVkYmFjayB8fCAwLjUsXG4gICAgICAgIGZpbHRlcnMgPSBbXSxcbiAgICAgICAgZmlsdGVyO1xuXG4gICAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGZlZWRiYWNrID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGxmbyA9IGNvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgIHZhciBsZm9HYWluID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgZmVlZGJhY2suZ2Fpbi52YWx1ZSA9IGZlZWRiYWNrR2FpbjtcblxuICAgIGxmby50eXBlID0gJ3NpbmUnO1xuICAgIGxmby5mcmVxdWVuY3kudmFsdWUgPSBsZm9GcmVxdWVuY3k7XG4gICAgbGZvR2Fpbi5nYWluLnZhbHVlID0gbGZvR2FpblZhbHVlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGFnZXM7IGkrKykge1xuICAgICAgICBmaWx0ZXIgPSBjb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICBmaWx0ZXIudHlwZSA9ICdhbGxwYXNzJztcbiAgICAgICAgZmlsdGVyLmZyZXF1ZW5jeS52YWx1ZSA9IDEwMDAgKiBpO1xuICAgICAgICAvL2ZpbHRlci5RLnZhbHVlID0gMTA7XG4gICAgICAgIGlmKGkgPiAwKSB7XG4gICAgICAgICAgICBmaWx0ZXJzW2ktMV0uY29ubmVjdChmaWx0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGxmb0dhaW4uY29ubmVjdChmaWx0ZXIuZnJlcXVlbmN5KTtcblxuICAgICAgICBmaWx0ZXJzLnB1c2goZmlsdGVyKTtcbiAgICB9XG5cbiAgICB2YXIgZmlyc3QgPSBmaWx0ZXJzWzBdO1xuICAgIHZhciBsYXN0ID0gZmlsdGVyc1tmaWx0ZXJzLmxlbmd0aCAtIDFdO1xuXG4gICAgaW5wdXQuY29ubmVjdChmaXJzdCk7XG4gICAgaW5wdXQuY29ubmVjdChvdXRwdXQpO1xuICAgIGxhc3QuY29ubmVjdChvdXRwdXQpO1xuICAgIGxhc3QuY29ubmVjdChmZWVkYmFjayk7XG4gICAgZmVlZGJhY2suY29ubmVjdChmaXJzdCk7XG4gICAgbGZvLmNvbm5lY3QobGZvR2Fpbik7XG4gICAgbGZvLnN0YXJ0KDApO1xuXG4gICAgdmFyIG5vZGUgPSBpbnB1dDtcbiAgICBub2RlLm5hbWUgPSAnUGhhc2VyJztcbiAgICBub2RlLl9vdXRwdXQgPSBvdXRwdXQ7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgIGxmb0ZyZXF1ZW5jeToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGxmby5mcmVxdWVuY3kudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGxmby5mcmVxdWVuY3kudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBsZm9HYWluOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbGZvR2Fpbi5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBsZm9HYWluLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBmZWVkYmFjazoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGZlZWRiYWNrLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGZlZWRiYWNrLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQaGFzZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFJlY29yZGVyKGNvbnRleHQsIHBhc3NUaHJvdWdoKSB7XG4gICAgdmFyIGJ1ZmZlcnNMID0gW10sXG4gICAgICAgIGJ1ZmZlcnNSID0gW10sXG4gICAgICAgIHN0YXJ0ZWRBdCA9IDAsXG4gICAgICAgIHN0b3BwZWRBdCA9IDA7XG5cbiAgICB2YXIgaW5wdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgb3V0cHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIHNjcmlwdCA9IGNvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKDQwOTYsIDIsIDIpO1xuICAgIFxuICAgIGlucHV0LmNvbm5lY3Qoc2NyaXB0KTtcbiAgICBzY3JpcHQuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICBzY3JpcHQuY29ubmVjdChvdXRwdXQpO1xuXG4gICAgdmFyIG5vZGUgPSBpbnB1dDtcbiAgICBub2RlLm5hbWUgPSAnUmVjb3JkZXInO1xuICAgIG5vZGUuX291dHB1dCA9IG91dHB1dDtcblxuICAgIG5vZGUuaXNSZWNvcmRpbmcgPSBmYWxzZTtcblxuICAgIHZhciBnZXRCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIWJ1ZmZlcnNMLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIDQwOTYsIGNvbnRleHQuc2FtcGxlUmF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJ1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGJ1ZmZlcnNMLmxlbmd0aCwgY29udGV4dC5zYW1wbGVSYXRlKTtcbiAgICAgICAgYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChidWZmZXJzTCk7XG4gICAgICAgIGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyc1IpO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH07XG5cbiAgICBub2RlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGJ1ZmZlcnNMLmxlbmd0aCA9IDA7XG4gICAgICAgIGJ1ZmZlcnNSLmxlbmd0aCA9IDA7XG4gICAgICAgIHN0YXJ0ZWRBdCA9IGNvbnRleHQuY3VycmVudFRpbWU7XG4gICAgICAgIHN0b3BwZWRBdCA9IDA7XG4gICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSB0cnVlO1xuICAgIH07XG5cbiAgICBub2RlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RvcHBlZEF0ID0gY29udGV4dC5jdXJyZW50VGltZTtcbiAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gZ2V0QnVmZmVyKCk7XG4gICAgfTtcblxuICAgIG5vZGUuZ2V0RHVyYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuaXNSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBzdG9wcGVkQXQgLSBzdGFydGVkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnRleHQuY3VycmVudFRpbWUgLSBzdGFydGVkQXQ7XG4gICAgfTtcblxuICAgIHNjcmlwdC5vbmF1ZGlvcHJvY2VzcyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB2YXIgaW5wdXRMID0gZXZlbnQuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCksXG4gICAgICAgICAgICBpbnB1dFIgPSBldmVudC5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKSxcbiAgICAgICAgICAgIG91dHB1dEwgPSBldmVudC5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCksXG4gICAgICAgICAgICBvdXRwdXRSID0gZXZlbnQub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuXG4gICAgICAgIGlmKHBhc3NUaHJvdWdoKSB7XG4gICAgICAgICAgICBvdXRwdXRMLnNldChpbnB1dEwpO1xuICAgICAgICAgICAgb3V0cHV0Ui5zZXQoaW5wdXRSKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKG5vZGUuaXNSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5wdXRMLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyc0wucHVzaChpbnB1dExbaV0pO1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnNSLnB1c2goaW5wdXRSW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSZWNvcmRlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUmV2ZXJiKGNvbnRleHQsIHRpbWUsIGRlY2F5LCByZXZlcnNlKSB7XG4gICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZUNvbnZvbHZlcigpO1xuXG4gICAgbm9kZS51cGRhdGUgPSBmdW5jdGlvbih0aW1lLCBkZWNheSwgcmV2ZXJzZSkge1xuICAgICAgICB0aW1lID0gdGltZSB8fCAxO1xuICAgICAgICBkZWNheSA9IGRlY2F5IHx8IDU7XG4gICAgICAgIHJldmVyc2UgPSAhIXJldmVyc2U7XG5cbiAgICAgICAgdmFyIG51bUNoYW5uZWxzID0gMixcbiAgICAgICAgICAgIHJhdGUgPSBjb250ZXh0LnNhbXBsZVJhdGUsXG4gICAgICAgICAgICBsZW5ndGggPSByYXRlICogdGltZSxcbiAgICAgICAgICAgIGltcHVsc2VSZXNwb25zZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKG51bUNoYW5uZWxzLCBsZW5ndGgsIHJhdGUpLFxuICAgICAgICAgICAgbGVmdCA9IGltcHVsc2VSZXNwb25zZS5nZXRDaGFubmVsRGF0YSgwKSxcbiAgICAgICAgICAgIHJpZ2h0ID0gaW1wdWxzZVJlc3BvbnNlLmdldENoYW5uZWxEYXRhKDEpLFxuICAgICAgICAgICAgbiwgZTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBuID0gcmV2ZXJzZSA/IGxlbmd0aCAtIDEgOiBpO1xuICAgICAgICAgICAgZSA9IE1hdGgucG93KDEgLSBuIC8gbGVuZ3RoLCBkZWNheSk7XG4gICAgICAgICAgICBsZWZ0W2ldID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBlO1xuICAgICAgICAgICAgcmlnaHRbaV0gPSAoTWF0aC5yYW5kb20oKSAqIDIgLSAxKSAqIGU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmJ1ZmZlciA9IGltcHVsc2VSZXNwb25zZTtcbiAgICB9O1xuXG4gICAgbm9kZS51cGRhdGUodGltZSwgZGVjYXksIHJldmVyc2UpO1xuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmV2ZXJiO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRGlzdG9ydGlvbiA9IHJlcXVpcmUoJy4vZGlzdG9ydGlvbi5qcycpO1xuXG5mdW5jdGlvbiBTYXR1cmF0aW9uKGNvbnRleHQpIHtcbiAgICB2YXIgaW5wdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgZHJpdmUgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgbG93cGFzcyA9IGNvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gICAgdmFyIGhpZ2hwYXNzID0gY29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICAvL3ZhciB3YXZlU2hhcGVyID0gY29udGV4dC5jcmVhdGVXYXZlU2hhcGVyKCk7XG4gICAgdmFyIHdhdmVTaGFwZXIgPSBuZXcgRGlzdG9ydGlvbihjb250ZXh0LCAwLjUpO1xuICAgIHZhciBvdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgIC8qdmFyIGN1cnZlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdmFyIGsgPSB2YWx1ZSAqIDEwMCxcbiAgICAgICAgICAgIG4gPSAyMjA1MCwgLy8gXG4gICAgICAgICAgICBjdXJ2ZSA9IG5ldyBGbG9hdDMyQXJyYXkobiksXG4gICAgICAgICAgICBkZWcgPSBNYXRoLlBJIC8gMTgwLFxuICAgICAgICAgICAgeDtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKiAyIC8gbiAtIDE7XG4gICAgICAgICAgICBjdXJ2ZVtpXSA9ICgzICsgaykgKiB4ICogMjAgKiBkZWcgLyAoTWF0aC5QSSArIGsgKiBNYXRoLmFicyh4KSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY3VydmU7XG4gICAgfTtcbiAgICB3YXZlU2hhcGVyLmN1cnZlID0gY3VydmUoMC41KTtcbiAgICAqL1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlKHZhbHVlKSB7XG4gICAgICAgIHNhdHVyYXRpb24gPSB2YWx1ZTtcblxuICAgICAgICB3YXZlU2hhcGVyLmFtb3VudCA9IHZhbHVlO1xuXG4gICAgICAgIGRyaXZlLmdhaW4udmFsdWUgPSAxIC0gdmFsdWUgKiAwLjg7XG4gICAgfVxuXG4gICAgaGlnaHBhc3MudHlwZSA9ICdoaWdocGFzcyc7XG4gICAgaGlnaHBhc3MuZnJlcXVlbmN5LnZhbHVlID0gMTAwO1xuICAgIGxvd3Bhc3MudHlwZSA9ICdsb3dwYXNzJztcbiAgICBsb3dwYXNzLmZyZXF1ZW5jeS52YWx1ZSA9IDEwMDAwO1xuICAgIGRyaXZlLmdhaW4udmFsdWUgPSAwLjQ7XG5cbiAgICBpbnB1dC5jb25uZWN0KGxvd3Bhc3MpO1xuICAgIGxvd3Bhc3MuY29ubmVjdChoaWdocGFzcyk7XG4gICAgaGlnaHBhc3MuY29ubmVjdCh3YXZlU2hhcGVyKTtcbiAgICB3YXZlU2hhcGVyLmNvbm5lY3QoZHJpdmUpO1xuICAgIGRyaXZlLmNvbm5lY3Qob3V0cHV0KTtcblxuICAgIHZhciBub2RlID0gaW5wdXQ7XG4gICAgbm9kZS5uYW1lID0gJ1NhdHVyYXRpb24nO1xuICAgIG5vZGUuX291dHB1dCA9IG91dHB1dDtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgZGlzdG9ydGlvbjoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHdhdmVTaGFwZXIuYW1vdW50OyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB3YXZlU2hhcGVyLmFtb3VudCA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGdhaW46IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBkcml2ZS5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBkcml2ZS5nYWluLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgaGlnaHBhc3M6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBoaWdocGFzcy5mcmVxdWVuY3kudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGhpZ2hwYXNzLmZyZXF1ZW5jeS52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGxvd3Bhc3M6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBsb3dwYXNzLmZyZXF1ZW5jeS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbG93cGFzcy5mcmVxdWVuY3kudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTYXR1cmF0aW9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQnVmZmVyU291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2UvYnVmZmVyLXNvdXJjZS5qcycpLFxuICAgIE1lZGlhU291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2UvbWVkaWEtc291cmNlLmpzJyksXG4gICAgTWljcm9waG9uZVNvdXJjZSA9IHJlcXVpcmUoJy4vc291cmNlL21pY3JvcGhvbmUtc291cmNlLmpzJyksXG4gICAgTm9kZU1hbmFnZXIgPSByZXF1aXJlKCcuL25vZGUtbWFuYWdlci5qcycpLFxuICAgIE9zY2lsbGF0b3JTb3VyY2UgPSByZXF1aXJlKCcuL3NvdXJjZS9vc2NpbGxhdG9yLXNvdXJjZS5qcycpLFxuICAgIFNjcmlwdFNvdXJjZSA9IHJlcXVpcmUoJy4vc291cmNlL3NjcmlwdC1zb3VyY2UuanMnKSxcbiAgICBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMuanMnKTtcblxuZnVuY3Rpb24gU291bmQoY29udGV4dCwgZGVzdGluYXRpb24pIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZGF0YSA9IG51bGw7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5fbG9vcCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5V2hlblJlYWR5ID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlID0gbnVsbDtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xuXG4gICAgdGhpcy5fbm9kZSA9IG5ldyBOb2RlTWFuYWdlcih0aGlzLl9jb250ZXh0KTtcbiAgICB0aGlzLl9nYWluID0gdGhpcy5fbm9kZS5nYWluKCk7XG4gICAgaWYodGhpcy5fY29udGV4dCkge1xuICAgICAgICB0aGlzLl9ub2RlLnNldERlc3RpbmF0aW9uKHRoaXMuX2dhaW4pO1xuICAgICAgICB0aGlzLl9nYWluLmNvbm5lY3QoZGVzdGluYXRpb24gfHwgdGhpcy5fY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfVxufVxuXG5Tb3VuZC5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBpZighZGF0YSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuX2RhdGEgPSBkYXRhOyAvLyBBdWRpb0J1ZmZlciwgTWVkaWFFbGVtZW50LCBldGNcblxuICAgIGlmKFV0aWxzLmlzQXVkaW9CdWZmZXIoZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IEJ1ZmZlclNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZihVdGlscy5pc01lZGlhRWxlbWVudChkYXRhKSkge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgTWVkaWFTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2UgaWYoVXRpbHMuaXNNZWRpYVN0cmVhbShkYXRhKSkge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgTWljcm9waG9uZVNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZihVdGlscy5pc09zY2lsbGF0b3JUeXBlKGRhdGEpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBPc2NpbGxhdG9yU291cmNlKGRhdGEsIHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbiAgICBlbHNlIGlmKFV0aWxzLmlzU2NyaXB0Q29uZmlnKGRhdGEpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBTY3JpcHRTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBkZXRlY3QgZGF0YSB0eXBlOiAnICsgZGF0YSk7XG4gICAgfVxuXG4gICAgdGhpcy5fbm9kZS5zZXRTb3VyY2UodGhpcy5fc291cmNlLnNvdXJjZU5vZGUpO1xuXG4gICAgaWYodHlwZW9mIHRoaXMuX3NvdXJjZS5vbkVuZGVkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZS5vbkVuZGVkKHRoaXMuX2VuZGVkSGFuZGxlciwgdGhpcyk7XG4gICAgfVxuXG4gICAgLy8gc2hvdWxkIHRoaXMgdGFrZSBhY2NvdW50IG9mIGRlbGF5IGFuZCBvZmZzZXQ/XG4gICAgaWYodGhpcy5fcGxheVdoZW5SZWFkeSkge1xuICAgICAgICB0aGlzLnBsYXkoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5LCBvZmZzZXQpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7XG4gICAgICAgIHRoaXMuX3BsYXlXaGVuUmVhZHkgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdGhpcy5fbm9kZS5zZXRTb3VyY2UodGhpcy5fc291cmNlLnNvdXJjZU5vZGUpO1xuICAgIHRoaXMuX3NvdXJjZS5sb29wID0gdGhpcy5fbG9vcDtcblxuICAgIC8vIHVwZGF0ZSB2b2x1bWUgbmVlZGVkIGZvciBubyB3ZWJhdWRpb1xuICAgIGlmKCF0aGlzLl9jb250ZXh0KSB7IHRoaXMudm9sdW1lID0gdGhpcy52b2x1bWU7IH1cblxuICAgIHRoaXMuX3NvdXJjZS5wbGF5KGRlbGF5LCBvZmZzZXQpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7IHJldHVybiB0aGlzOyB9XG4gICAgdGhpcy5fc291cmNlLnBhdXNlKCk7XG4gICAgcmV0dXJuIHRoaXM7ICBcbn07XG5cblNvdW5kLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuX3NvdXJjZS5zdG9wKCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUuc2VlayA9IGZ1bmN0aW9uKHBlcmNlbnQpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7IHJldHVybiB0aGlzOyB9XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5wbGF5KDAsIHRoaXMuX3NvdXJjZS5kdXJhdGlvbiAqIHBlcmNlbnQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUub25FbmRlZCA9IGZ1bmN0aW9uKGZuLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IGZuID8gZm4uYmluZChjb250ZXh0IHx8IHRoaXMpIDogbnVsbDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvdW5kLnByb3RvdHlwZS5fZW5kZWRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodHlwZW9mIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayh0aGlzKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnY29udGV4dCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuY3VycmVudFRpbWUgOiAwO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLnN0b3AoKTtcbiAgICAgICAgdGhpcy5wbGF5KDAsIHZhbHVlKTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2RhdGEnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RhdGE7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmR1cmF0aW9uIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2VuZGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuZW5kZWQgOiBmYWxzZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2dhaW4nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dhaW47XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdsb29wJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9sb29wID0gISF2YWx1ZTtcbiAgICAgICAgaWYodGhpcy5fc291cmNlKSB7XG4gICAgICAgICAgdGhpcy5fc291cmNlLmxvb3AgPSB0aGlzLl9sb29wO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdub2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAncGF1c2VkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UucGF1c2VkIDogZmFsc2U7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UucGxheWluZyA6IGZhbHNlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wcm9ncmVzcyA6IDA7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAndm9sdW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9nYWluLmdhaW4udmFsdWU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmKGlzTmFOKHZhbHVlKSkgeyByZXR1cm47IH1cblxuICAgICAgICB0aGlzLl9nYWluLmdhaW4udmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICBpZih0aGlzLl9kYXRhICYmIHRoaXMuX2RhdGEudm9sdW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEudm9sdW1lID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuLy8gZm9yIG9zY2lsbGF0b3JcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2ZyZXF1ZW5jeScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmZyZXF1ZW5jeSA6IDA7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmKHRoaXMuX3NvdXJjZSkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlLmZyZXF1ZW5jeSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gU291bmQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEJ1ZmZlclNvdXJjZShidWZmZXIsIGNvbnRleHQpIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fYnVmZmVyID0gYnVmZmVyOyAvLyBBcnJheUJ1ZmZlclxuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5fbG9vcCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIEJ1ZmZlclNvdXJjZU5vZGVcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufVxuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSwgb2Zmc2V0KSB7XG4gICAgaWYodGhpcy5fcGxheWluZykgeyByZXR1cm47IH1cbiAgICBpZihkZWxheSA9PT0gdW5kZWZpbmVkKSB7IGRlbGF5ID0gMDsgfVxuICAgIGlmKGRlbGF5ID4gMCkgeyBkZWxheSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkZWxheTsgfVxuXG4gICAgaWYob2Zmc2V0ID09PSB1bmRlZmluZWQpIHsgb2Zmc2V0ID0gMDsgfVxuICAgIGlmKG9mZnNldCA+IDApIHsgdGhpcy5fcGF1c2VkQXQgPSAwOyB9XG4gICAgaWYodGhpcy5fcGF1c2VkQXQgPiAwKSB7IG9mZnNldCA9IHRoaXMuX3BhdXNlZEF0OyB9XG4gICAgXG4gICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgWycxIG9mZnNldDonLCBvZmZzZXRdKTtcbiAgICB3aGlsZShvZmZzZXQgPiB0aGlzLmR1cmF0aW9uKSB7IG9mZnNldCA9IG9mZnNldCAlIHRoaXMuZHVyYXRpb247IH1cbiAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBbJzIgb2Zmc2V0OicsIG9mZnNldF0pO1xuXG4gICAgdGhpcy5zb3VyY2VOb2RlLmxvb3AgPSB0aGlzLl9sb29wO1xuICAgIHRoaXMuc291cmNlTm9kZS5vbmVuZGVkID0gdGhpcy5fZW5kZWRIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgdGhpcy5zb3VyY2VOb2RlLnN0YXJ0KGRlbGF5LCBvZmZzZXQpO1xuXG4gICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3BhdXNlZEF0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIG9mZnNldDtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcbn07XG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxhcHNlZCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSBlbGFwc2VkO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSB0cnVlO1xufTtcblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLm9uZW5kZWQgPSBudWxsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLnN0b3AoMCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG59O1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLl9lbmRlZEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgaWYodHlwZW9mIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayh0aGlzKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYodGhpcy5fc3RhcnRlZEF0KSB7XG4gICAgICAgICAgICB2YXIgdGltZSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgICAgICAgICBpZih0aW1lID4gdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgICAgIHRpbWUgPSB0aW1lICUgdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aW1lO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9idWZmZXIgPyB0aGlzLl9idWZmZXIuZHVyYXRpb24gOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2VuZGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmRlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdsb29wJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9sb29wID0gISF2YWx1ZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3Byb2dyZXNzJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLm1pbih0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbiwgMSk7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3NvdXJjZU5vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5idWZmZXIgPSB0aGlzLl9idWZmZXI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQnVmZmVyU291cmNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBNZWRpYVNvdXJjZShlbCwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbCA9IGVsOyAvLyBIVE1MTWVkaWFFbGVtZW50XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9lbmRlZEhhbmRsZXJCb3VuZCA9IHRoaXMuX2VuZGVkSGFuZGxlci5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX2xvb3AgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIE1lZGlhRWxlbWVudFNvdXJjZU5vZGVcbn1cblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuTWVkaWFTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSwgb2Zmc2V0KSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2RlbGF5VGltZW91dCk7XG5cbiAgICB0aGlzLnZvbHVtZSA9IHRoaXMuX3ZvbHVtZTtcblxuICAgIGlmKG9mZnNldCkge1xuICAgICAgICB0aGlzLl9lbC5jdXJyZW50VGltZSA9IG9mZnNldDtcbiAgICB9XG5cbiAgICBpZihkZWxheSkge1xuICAgICAgICB0aGlzLl9kZWxheVRpbWVvdXQgPSBzZXRUaW1lb3V0KHRoaXMucGxheS5iaW5kKHRoaXMpLCBkZWxheSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9lbC5wbGF5KCk7XG4gICAgfVxuXG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcblxuICAgIHRoaXMuX2VsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQpO1xuICAgIHRoaXMuX2VsLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQsIGZhbHNlKTtcbn07XG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9kZWxheVRpbWVvdXQpO1xuXG4gICAgaWYoIXRoaXMuX2VsKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5fZWwucGF1c2UoKTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2RlbGF5VGltZW91dCk7XG5cbiAgICBpZighdGhpcy5fZWwpIHsgcmV0dXJuOyB9XG5cbiAgICB0aGlzLl9lbC5wYXVzZSgpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgdGhpcy5fZWwuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICAvLyBmaXhlcyBidWcgd2hlcmUgc2VydmVyIGRvZXNuJ3Qgc3VwcG9ydCBzZWVrOlxuICAgICAgICBpZih0aGlzLl9lbC5jdXJyZW50VGltZSA+IDApIHsgdGhpcy5fZWwubG9hZCgpOyB9ICAgIFxuICAgIH0gY2F0Y2goZSkge31cblxuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbn07XG5cbi8qXG4gKiBFbmRlZCBoYW5kbGVyXG4gKi9cblxuTWVkaWFTb3VyY2UucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG59O1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUuX2VuZGVkSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG5cbiAgICBpZih0aGlzLl9sb29wKSB7XG4gICAgICAgIHRoaXMuX2VsLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgLy8gZml4ZXMgYnVnIHdoZXJlIHNlcnZlciBkb2Vzbid0IHN1cHBvcnQgc2VlazpcbiAgICAgICAgaWYodGhpcy5fZWwuY3VycmVudFRpbWUgPiAwKSB7IHRoaXMuX2VsLmxvYWQoKTsgfVxuICAgICAgICB0aGlzLnBsYXkoKTtcbiAgICB9IGVsc2UgaWYodHlwZW9mIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayh0aGlzKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsID8gdGhpcy5fZWwuY3VycmVudFRpbWUgOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAnZHVyYXRpb24nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsID8gdGhpcy5fZWwuZHVyYXRpb24gOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAnZW5kZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAnbG9vcCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbG9vcDtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy5fbG9vcCA9IHZhbHVlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAncGF1c2VkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAnc291cmNlTm9kZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fc291cmNlTm9kZSAmJiB0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UodGhpcy5fZWwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lZGlhU291cmNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBNaWNyb3Bob25lU291cmNlKHN0cmVhbSwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIE1pY3JvcGhvbmVTb3VyY2VOb2RlXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbiAgICB0aGlzLl9zdHJlYW0gPSBzdHJlYW07XG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbk1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSkge1xuICAgIGlmKGRlbGF5ID09PSB1bmRlZmluZWQpIHsgZGVsYXkgPSAwOyB9XG4gICAgaWYoZGVsYXkgPiAwKSB7IGRlbGF5ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGRlbGF5OyB9XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUuc3RhcnQoZGVsYXkpO1xuXG4gICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3BhdXNlZEF0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZTtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbn07XG5cbk1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gZWxhcHNlZDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbk1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLnN0b3AoMCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdjdXJyZW50VGltZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZEF0O1xuICAgICAgICB9XG4gICAgICAgIGlmKHRoaXMuX3N0YXJ0ZWRBdCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNaWNyb3Bob25lU291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdlbmRlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW5kZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNaWNyb3Bob25lU291cmNlLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdwcm9ncmVzcycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gMDtcbiAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNaWNyb3Bob25lU291cmNlLnByb3RvdHlwZSwgJ3NvdXJjZU5vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKHRoaXMuX3N0cmVhbSk7XG4gICAgICAgICAgICAvLyBIQUNLOiBzdG9wcyBtb3ogZ2FyYmFnZSBjb2xsZWN0aW9uIGtpbGxpbmcgdGhlIHN0cmVhbVxuICAgICAgICAgICAgLy8gc2VlIGh0dHBzOi8vc3VwcG9ydC5tb3ppbGxhLm9yZy9lbi1VUy9xdWVzdGlvbnMvOTg0MTc5XG4gICAgICAgICAgICBpZihuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhKSB7XG4gICAgICAgICAgICAgICAgd2luZG93Lm1vekhhY2sgPSB0aGlzLl9zb3VyY2VOb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1pY3JvcGhvbmVTb3VyY2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE9zY2lsbGF0b3JTb3VyY2UodHlwZSwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIE9zY2lsbGF0b3JTb3VyY2VOb2RlXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbiAgICB0aGlzLl90eXBlID0gdHlwZTtcbiAgICB0aGlzLl9mcmVxdWVuY3kgPSAyMDA7XG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSkge1xuICAgIGlmKGRlbGF5ID09PSB1bmRlZmluZWQpIHsgZGVsYXkgPSAwOyB9XG4gICAgaWYoZGVsYXkgPiAwKSB7IGRlbGF5ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGRlbGF5OyB9XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUuc3RhcnQoZGVsYXkpO1xuXG4gICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3BhdXNlZEF0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZTtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbn07XG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gZWxhcHNlZDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLnN0b3AoMCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdmcmVxdWVuY3knLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZyZXF1ZW5jeTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy5fZnJlcXVlbmN5ID0gdmFsdWU7XG4gICAgICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCAnZW5kZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCAncGxheWluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGxheWluZztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdzb3VyY2VOb2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlICYmIHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUudHlwZSA9IHRoaXMuX3R5cGU7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLmZyZXF1ZW5jeS52YWx1ZSA9IHRoaXMuX2ZyZXF1ZW5jeTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBPc2NpbGxhdG9yU291cmNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTY3JpcHRTb3VyY2UoZGF0YSwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9idWZmZXJTaXplID0gZGF0YS5idWZmZXJTaXplIHx8IDEwMjQ7XG4gICAgdGhpcy5fY2hhbm5lbHMgPSBkYXRhLmNoYW5uZWxzIHx8IDE7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9vblByb2Nlc3MgPSBkYXRhLmNhbGxiYWNrLmJpbmQoZGF0YS50aGlzQXJnIHx8IHRoaXMpO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIFNjcmlwdFNvdXJjZU5vZGVcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufVxuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5TY3JpcHRTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSkge1xuICAgIGlmKGRlbGF5ID09PSB1bmRlZmluZWQpIHsgZGVsYXkgPSAwOyB9XG4gICAgaWYoZGVsYXkgPiAwKSB7IGRlbGF5ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGRlbGF5OyB9XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUub25hdWRpb3Byb2Nlc3MgPSB0aGlzLl9vblByb2Nlc3M7XG5cbiAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fcGF1c2VkQXQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xufTtcblxuU2NyaXB0U291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IGVsYXBzZWQ7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5TY3JpcHRTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUub25hdWRpb3Byb2Nlc3MgPSB0aGlzLl9vblBhdXNlZDtcbiAgICB9XG4gICAgdGhpcy5fZW5kZWQgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn07XG5cblNjcmlwdFNvdXJjZS5wcm90b3R5cGUuX29uUGF1c2VkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB2YXIgYnVmZmVyID0gZXZlbnQub3V0cHV0QnVmZmVyO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSk7XG4gICAgICAgIGZvciAodmFyIGogPSAwLCBsZW4gPSBjaGFubmVsLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgICBjaGFubmVsW2pdID0gMDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTY3JpcHRTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ2VuZGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmRlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ3Byb2dyZXNzJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAwO1xuICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdzb3VyY2VOb2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IodGhpcy5fYnVmZmVyU2l6ZSwgMCwgdGhpcy5fY2hhbm5lbHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjcmlwdFNvdXJjZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU3VwcG9ydCgpIHtcbiAgICB2YXIgZXh0ZW5zaW9ucyA9IFtdLFxuICAgICAgICBjYW5QbGF5ID0ge30sXG4gICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcblxuICAgIGlmKCFlbCkgeyByZXR1cm47IH1cblxuICAgIHZhciB0ZXN0cyA9IFtcbiAgICAgICAgeyBleHQ6ICdvZ2cnLCB0eXBlOiAnYXVkaW8vb2dnOyBjb2RlY3M9XCJ2b3JiaXNcIicgfSxcbiAgICAgICAgeyBleHQ6ICdtcDMnLCB0eXBlOiAnYXVkaW8vbXBlZzsnIH0sXG4gICAgICAgIHsgZXh0OiAnb3B1cycsIHR5cGU6ICdhdWRpby9vZ2c7IGNvZGVjcz1cIm9wdXNcIicgfSxcbiAgICAgICAgeyBleHQ6ICd3YXYnLCB0eXBlOiAnYXVkaW8vd2F2OyBjb2RlY3M9XCIxXCInIH0sXG4gICAgICAgIHsgZXh0OiAnbTRhJywgdHlwZTogJ2F1ZGlvL3gtbTRhOycgfSxcbiAgICAgICAgeyBleHQ6ICdtNGEnLCB0eXBlOiAnYXVkaW8vYWFjOycgfVxuICAgIF07XG5cbiAgICB0ZXN0cy5mb3JFYWNoKGZ1bmN0aW9uKHRlc3QpIHtcbiAgICAgICAgdmFyIGNhblBsYXlUeXBlID0gISFlbC5jYW5QbGF5VHlwZSh0ZXN0LnR5cGUpO1xuICAgICAgICBpZihjYW5QbGF5VHlwZSkge1xuICAgICAgICAgICAgZXh0ZW5zaW9ucy5wdXNoKHRlc3QuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBjYW5QbGF5W3Rlc3QuZXh0XSA9IGNhblBsYXlUeXBlO1xuICAgIH0pO1xuXG4gICAgdmFyIGdldEZpbGVFeHRlbnNpb24gPSBmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgdXJsID0gdXJsLnNwbGl0KCc/JylbMF07XG4gICAgICAgIHVybCA9IHVybC5zdWJzdHIodXJsLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcblxuICAgICAgICB2YXIgYSA9IHVybC5zcGxpdCgnLicpO1xuICAgICAgICBpZihhLmxlbmd0aCA9PT0gMSB8fCAoYVswXSA9PT0gJycgJiYgYS5sZW5ndGggPT09IDIpKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGEucG9wKCkudG9Mb3dlckNhc2UoKTtcbiAgICB9O1xuXG4gICAgdmFyIGdldFN1cHBvcnRlZEZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZXMpIHtcbiAgICAgICAgdmFyIG5hbWU7XG5cbiAgICAgICAgaWYoQXJyYXkuaXNBcnJheShmaWxlTmFtZXMpKSB7XG4gICAgICAgICAgICAvLyBpZiBhcnJheSBnZXQgdGhlIGZpcnN0IG9uZSB0aGF0IHdvcmtzXG4gICAgICAgICAgICBmaWxlTmFtZXMuc29tZShmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgdmFyIGV4dCA9IGdldEZpbGVFeHRlbnNpb24oaXRlbSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dGVuc2lvbnMuaW5kZXhPZihleHQpID4gLTE7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHR5cGVvZiBmaWxlTmFtZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBpZiBub3QgYXJyYXkgYW5kIGlzIG9iamVjdFxuICAgICAgICAgICAgT2JqZWN0LmtleXMoZmlsZU5hbWVzKS5zb21lKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBmaWxlTmFtZXNba2V5XTtcbiAgICAgICAgICAgICAgICB2YXIgZXh0ID0gZ2V0RmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0ZW5zaW9ucy5pbmRleE9mKGV4dCkgPiAtMTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIHN0cmluZyBqdXN0IHJldHVyblxuICAgICAgICByZXR1cm4gbmFtZSB8fCBmaWxlTmFtZXM7XG4gICAgfTtcblxuICAgIHZhciBjb250YWluc1VSTCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICBpZighY29uZmlnKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAvLyBzdHJpbmcsIGFycmF5IG9yIG9iamVjdCB3aXRoIHVybCBwcm9wZXJ0eSB0aGF0IGlzIHN0cmluZyBvciBhcnJheVxuICAgICAgICB2YXIgdXJsID0gY29uZmlnLnVybCB8fCBjb25maWc7XG4gICAgICAgIHJldHVybiBpc1VSTCh1cmwpIHx8IChBcnJheS5pc0FycmF5KHVybCkgJiYgaXNVUkwodXJsWzBdKSk7XG4gICAgfTtcblxuICAgIHZhciBpc1VSTCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICEhKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICYmIGRhdGEuaW5kZXhPZignLicpID4gLTEpO1xuICAgIH07XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgIGV4dGVuc2lvbnM6IGV4dGVuc2lvbnMsXG4gICAgICAgIGNhblBsYXk6IGNhblBsYXksXG4gICAgICAgIGdldEZpbGVFeHRlbnNpb246IGdldEZpbGVFeHRlbnNpb24sXG4gICAgICAgIGdldFN1cHBvcnRlZEZpbGU6IGdldFN1cHBvcnRlZEZpbGUsXG4gICAgICAgIGNvbnRhaW5zVVJMOiBjb250YWluc1VSTFxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTdXBwb3J0KCk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBVdGlscyA9IHt9O1xuXG5VdGlscy5zZXRDb250ZXh0ID0gZnVuY3Rpb24oY29udGV4dCkge1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufTtcblxuLypcbiAqIGF1ZGlvIGJ1ZmZlclxuICovXG5cblV0aWxzLmNsb25lQnVmZmVyID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgdmFyIG51bUNoYW5uZWxzID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHMsXG4gICAgICAgIGNsb25lZCA9IHRoaXMuX2NvbnRleHQuY3JlYXRlQnVmZmVyKG51bUNoYW5uZWxzLCBidWZmZXIubGVuZ3RoLCBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1DaGFubmVsczsgaSsrKSB7XG4gICAgICAgIGNsb25lZC5nZXRDaGFubmVsRGF0YShpKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKGkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNsb25lZDtcbn07XG5cblV0aWxzLnJldmVyc2VCdWZmZXIgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgICB2YXIgbnVtQ2hhbm5lbHMgPSBidWZmZXIubnVtYmVyT2ZDaGFubmVscztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUNoYW5uZWxzOyBpKyspIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnJldmVyc2UuY2FsbChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSkpO1xuICAgIH1cbiAgICByZXR1cm4gYnVmZmVyO1xufTtcblxuLypcbiAqIGZhZGUgZ2FpblxuICovXG5cblV0aWxzLmNyb3NzRmFkZSA9IGZ1bmN0aW9uKGZyb21Tb3VuZCwgdG9Tb3VuZCwgZHVyYXRpb24pIHtcbiAgICB2YXIgZnJvbSA9IHRoaXMuaXNBdWRpb1BhcmFtKGZyb21Tb3VuZCkgPyBmcm9tU291bmQgOiBmcm9tU291bmQuZ2Fpbi5nYWluO1xuICAgIHZhciB0byA9IHRoaXMuaXNBdWRpb1BhcmFtKHRvU291bmQpID8gdG9Tb3VuZCA6IHRvU291bmQuZ2Fpbi5nYWluO1xuXG4gICAgZnJvbS5zZXRWYWx1ZUF0VGltZShmcm9tLnZhbHVlLCAwKTtcbiAgICBmcm9tLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKDAsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgdG8uc2V0VmFsdWVBdFRpbWUodG8udmFsdWUsIDApO1xuICAgIHRvLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKDEsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG59O1xuXG5VdGlscy5mYWRlRnJvbSA9IGZ1bmN0aW9uKHNvdW5kLCB2YWx1ZSwgZHVyYXRpb24pIHtcbiAgICB2YXIgcGFyYW0gPSB0aGlzLmlzQXVkaW9QYXJhbShzb3VuZCkgPyBzb3VuZCA6IHNvdW5kLmdhaW4uZ2FpbjtcbiAgICB2YXIgdG9WYWx1ZSA9IHBhcmFtLnZhbHVlO1xuXG4gICAgcGFyYW0uc2V0VmFsdWVBdFRpbWUodmFsdWUsIDApO1xuICAgIHBhcmFtLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKHRvVmFsdWUsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG59O1xuXG5VdGlscy5mYWRlVG8gPSBmdW5jdGlvbihzb3VuZCwgdmFsdWUsIGR1cmF0aW9uKSB7XG4gICAgdmFyIHBhcmFtID0gdGhpcy5pc0F1ZGlvUGFyYW0oc291bmQpID8gc291bmQgOiBzb3VuZC5nYWluLmdhaW47XG5cbiAgICBwYXJhbS5zZXRWYWx1ZUF0VGltZShwYXJhbS52YWx1ZSwgMCk7XG4gICAgcGFyYW0ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUodmFsdWUsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG59O1xuXG4vKlxuICogZ2V0IGZyZXF1ZW5jeSBmcm9tIG1pbiB0byBtYXggYnkgcGFzc2luZyAwIHRvIDFcbiAqL1xuXG5VdGlscy5nZXRGcmVxdWVuY3kgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIC8vIGdldCBmcmVxdWVuY3kgYnkgcGFzc2luZyBudW1iZXIgZnJvbSAwIHRvIDFcbiAgICAvLyBDbGFtcCB0aGUgZnJlcXVlbmN5IGJldHdlZW4gdGhlIG1pbmltdW0gdmFsdWUgKDQwIEh6KSBhbmQgaGFsZiBvZiB0aGVcbiAgICAvLyBzYW1wbGluZyByYXRlLlxuICAgIHZhciBtaW5WYWx1ZSA9IDQwO1xuICAgIHZhciBtYXhWYWx1ZSA9IHRoaXMuX2NvbnRleHQuc2FtcGxlUmF0ZSAvIDI7XG4gICAgLy8gTG9nYXJpdGhtIChiYXNlIDIpIHRvIGNvbXB1dGUgaG93IG1hbnkgb2N0YXZlcyBmYWxsIGluIHRoZSByYW5nZS5cbiAgICB2YXIgbnVtYmVyT2ZPY3RhdmVzID0gTWF0aC5sb2cobWF4VmFsdWUgLyBtaW5WYWx1ZSkgLyBNYXRoLkxOMjtcbiAgICAvLyBDb21wdXRlIGEgbXVsdGlwbGllciBmcm9tIDAgdG8gMSBiYXNlZCBvbiBhbiBleHBvbmVudGlhbCBzY2FsZS5cbiAgICB2YXIgbXVsdGlwbGllciA9IE1hdGgucG93KDIsIG51bWJlck9mT2N0YXZlcyAqICh2YWx1ZSAtIDEuMCkpO1xuICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICByZXR1cm4gbWF4VmFsdWUgKiBtdWx0aXBsaWVyO1xufTtcblxuLypcbiAqIGRldGVjdCBmaWxlIHR5cGVzXG4gKi9cblxuVXRpbHMuaXNBdWRpb0J1ZmZlciA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB3aW5kb3cuQXVkaW9CdWZmZXIgJiZcbiAgICAgICAgICAgICAgZGF0YSBpbnN0YW5jZW9mIHdpbmRvdy5BdWRpb0J1ZmZlcik7XG59O1xuXG5VdGlscy5pc01lZGlhRWxlbWVudCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB3aW5kb3cuSFRNTE1lZGlhRWxlbWVudCAmJlxuICAgICAgICAgICAgICBkYXRhIGluc3RhbmNlb2Ygd2luZG93LkhUTUxNZWRpYUVsZW1lbnQpO1xufTtcblxuVXRpbHMuaXNNZWRpYVN0cmVhbSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB0eXBlb2YgZGF0YS5nZXRBdWRpb1RyYWNrcyA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAgICAgICBkYXRhLmdldEF1ZGlvVHJhY2tzKCkubGVuZ3RoICYmXG4gICAgICAgICAgICAgIHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrICYmXG4gICAgICAgICAgICAgIGRhdGEuZ2V0QXVkaW9UcmFja3MoKVswXSBpbnN0YW5jZW9mIHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrKTtcbn07XG5cblV0aWxzLmlzT3NjaWxsYXRvclR5cGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgcmV0dXJuICEhKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICAgKGRhdGEgPT09ICdzaW5lJyB8fCBkYXRhID09PSAnc3F1YXJlJyB8fFxuICAgICAgICAgICAgICBkYXRhID09PSAnc2F3dG9vdGgnIHx8IGRhdGEgPT09ICd0cmlhbmdsZScpKTtcbn07XG5cblV0aWxzLmlzU2NyaXB0Q29uZmlnID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHJldHVybiAhIShkYXRhICYmIHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgICBkYXRhLmJ1ZmZlclNpemUgJiYgZGF0YS5jaGFubmVscyAmJiBkYXRhLmNhbGxiYWNrKTtcbn07XG5cblV0aWxzLmlzQXVkaW9QYXJhbSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJiB3aW5kb3cuQXVkaW9QYXJhbSAmJiBkYXRhIGluc3RhbmNlb2Ygd2luZG93LkF1ZGlvUGFyYW0pO1xufTtcblxuLypcbiAqIG1pY3JvcGhvbmUgdXRpbFxuICovXG5cblV0aWxzLm1pY3JvcGhvbmUgPSBmdW5jdGlvbihjb25uZWN0ZWQsIGRlbmllZCwgZXJyb3IsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gbmV3IFV0aWxzLk1pY3JvcGhvbmUoY29ubmVjdGVkLCBkZW5pZWQsIGVycm9yLCB0aGlzQXJnKTtcbn07XG5cbi8qVXRpbHMucGFuID0gZnVuY3Rpb24ocGFubmVyKSB7XG4gICAgY29uc29sZS5sb2coJ3BhbicsIHRoaXMuX2NvbnRleHQpO1xuICAgIHJldHVybiBuZXcgVXRpbHMuUGFuKHRoaXMuX2NvbnRleHQsIHBhbm5lcik7XG59OyovXG5cblV0aWxzLnRpbWVDb2RlID0gZnVuY3Rpb24oc2Vjb25kcywgZGVsaW0pIHtcbiAgICBpZihkZWxpbSA9PT0gdW5kZWZpbmVkKSB7IGRlbGltID0gJzonOyB9XG4gICAgdmFyIGggPSBNYXRoLmZsb29yKHNlY29uZHMgLyAzNjAwKTtcbiAgICB2YXIgbSA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAvIDYwKTtcbiAgICB2YXIgcyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAlIDYwKTtcbiAgICB2YXIgaHIgPSAoaCA9PT0gMCA/ICcnIDogKGggPCAxMCA/ICcwJyArIGggKyBkZWxpbSA6IGggKyBkZWxpbSkpO1xuICAgIHZhciBtbiA9IChtIDwgMTAgPyAnMCcgKyBtIDogbSkgKyBkZWxpbTtcbiAgICB2YXIgc2MgPSAocyA8IDEwID8gJzAnICsgcyA6IHMpO1xuICAgIHJldHVybiBociArIG1uICsgc2M7XG59O1xuXG5VdGlscy53YXZlZm9ybSA9IGZ1bmN0aW9uKGJ1ZmZlciwgbGVuZ3RoKSB7XG4gICAgcmV0dXJuIG5ldyBVdGlscy5XYXZlZm9ybShidWZmZXIsIGxlbmd0aCk7XG59O1xuXG4vKlxuICogV2F2ZWZvcm1cbiAqL1xuXG5VdGlscy5XYXZlZm9ybSA9IGZ1bmN0aW9uKGJ1ZmZlciwgbGVuZ3RoKSB7XG4gICAgdGhpcy5kYXRhID0gdGhpcy5nZXREYXRhKGJ1ZmZlciwgbGVuZ3RoKTtcbn07XG5cblV0aWxzLldhdmVmb3JtLnByb3RvdHlwZSA9IHtcbiAgICBnZXREYXRhOiBmdW5jdGlvbihidWZmZXIsIGxlbmd0aCkge1xuICAgICAgICBpZighd2luZG93LkZsb2F0MzJBcnJheSB8fCAhVXRpbHMuaXNBdWRpb0J1ZmZlcihidWZmZXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgLy9jb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0tLS0tLScpO1xuICAgICAgICAvL2NvbnNvbGUudGltZSgnd2F2ZWZvcm1EYXRhJyk7XG4gICAgICAgIHZhciB3YXZlZm9ybSA9IG5ldyBGbG9hdDMyQXJyYXkobGVuZ3RoKSxcbiAgICAgICAgICAgIGNodW5rID0gTWF0aC5mbG9vcihidWZmZXIubGVuZ3RoIC8gbGVuZ3RoKSxcbiAgICAgICAgICAgIC8vY2h1bmsgPSBidWZmZXIubGVuZ3RoIC8gbGVuZ3RoLFxuICAgICAgICAgICAgcmVzb2x1dGlvbiA9IDUsIC8vIDEwXG4gICAgICAgICAgICBpbmNyID0gTWF0aC5mbG9vcihjaHVuayAvIHJlc29sdXRpb24pLFxuICAgICAgICAgICAgZ3JlYXRlc3QgPSAwO1xuXG4gICAgICAgIGlmKGluY3IgPCAxKSB7IGluY3IgPSAxOyB9XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGNobmxzID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7IGkgPCBjaG5sczsgaSsrKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBlYWNoIGNoYW5uZWxcbiAgICAgICAgICAgIHZhciBjaGFubmVsID0gYnVmZmVyLmdldENoYW5uZWxEYXRhKGkpO1xuICAgICAgICAgICAgLy9mb3IgKHZhciBqID0gbGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgaGlnaGVzdCB2YWx1ZSB3aXRoaW4gdGhlIGNodW5rXG4gICAgICAgICAgICAgICAgLy92YXIgY2ggPSBqICogY2h1bms7XG4gICAgICAgICAgICAgICAgLy9mb3IgKHZhciBrID0gY2ggKyBjaHVuayAtIDE7IGsgPj0gY2g7IGsgLT0gaW5jcikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGsgPSBqICogY2h1bmssIGwgPSBrICsgY2h1bms7IGsgPCBsOyBrICs9IGluY3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2VsZWN0IGhpZ2hlc3QgdmFsdWUgZnJvbSBjaGFubmVsc1xuICAgICAgICAgICAgICAgICAgICB2YXIgYSA9IGNoYW5uZWxba107XG4gICAgICAgICAgICAgICAgICAgIGlmKGEgPCAwKSB7IGEgPSAtYTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoYSA+IHdhdmVmb3JtW2pdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3YXZlZm9ybVtqXSA9IGE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIGhpZ2hlc3Qgb3ZlcmFsbCBmb3Igc2NhbGluZ1xuICAgICAgICAgICAgICAgICAgICBpZihhID4gZ3JlYXRlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyZWF0ZXN0ID0gYTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBzY2FsZSB1cD9cbiAgICAgICAgdmFyIHNjYWxlID0gMSAvIGdyZWF0ZXN0LFxuICAgICAgICAgICAgbGVuID0gd2F2ZWZvcm0ubGVuZ3RoO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHdhdmVmb3JtW2ldICo9IHNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS50aW1lRW5kKCd3YXZlZm9ybURhdGEnKTtcbiAgICAgICAgcmV0dXJuIHdhdmVmb3JtO1xuICAgIH0sXG4gICAgZ2V0Q2FudmFzOiBmdW5jdGlvbihoZWlnaHQsIGNvbG9yLCBiZ0NvbG9yLCBjYW52YXNFbCkge1xuICAgIC8vd2F2ZWZvcm06IGZ1bmN0aW9uKGFyciwgd2lkdGgsIGhlaWdodCwgY29sb3IsIGJnQ29sb3IsIGNhbnZhc0VsKSB7XG4gICAgICAgIC8vdmFyIGFyciA9IHRoaXMud2F2ZWZvcm1EYXRhKGJ1ZmZlciwgd2lkdGgpO1xuICAgICAgICB2YXIgY2FudmFzID0gY2FudmFzRWwgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aCA9IHRoaXMuZGF0YS5sZW5ndGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBiZ0NvbG9yO1xuICAgICAgICBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB2YXIgeCwgeTtcbiAgICAgICAgLy9jb25zb2xlLnRpbWUoJ3dhdmVmb3JtQ2FudmFzJyk7XG4gICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKyAwLjU7XG4gICAgICAgICAgICB5ID0gaGVpZ2h0IC0gTWF0aC5yb3VuZChoZWlnaHQgKiB0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgY29udGV4dC5tb3ZlVG8oeCwgeSk7XG4gICAgICAgICAgICBjb250ZXh0LmxpbmVUbyh4LCBoZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XG4gICAgICAgIC8vY29uc29sZS50aW1lRW5kKCd3YXZlZm9ybUNhbnZhcycpO1xuICAgICAgICByZXR1cm4gY2FudmFzO1xuICAgIH1cbn07XG5cblxuLypcbiAqIE1pY3JvcGhvbmVcbiAqL1xuXG5VdGlscy5NaWNyb3Bob25lID0gZnVuY3Rpb24oY29ubmVjdGVkLCBkZW5pZWQsIGVycm9yLCB0aGlzQXJnKSB7XG4gICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYV8gPSAobmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhKTtcbiAgICB0aGlzLl9pc1N1cHBvcnRlZCA9ICEhbmF2aWdhdG9yLmdldFVzZXJNZWRpYV87XG4gICAgdGhpcy5fc3RyZWFtID0gbnVsbDtcblxuICAgIHRoaXMuX29uQ29ubmVjdGVkID0gY29ubmVjdGVkLmJpbmQodGhpc0FyZyB8fCB0aGlzKTtcbiAgICB0aGlzLl9vbkRlbmllZCA9IGRlbmllZCA/IGRlbmllZC5iaW5kKHRoaXNBcmcgfHwgdGhpcykgOiBmdW5jdGlvbigpIHt9O1xuICAgIHRoaXMuX29uRXJyb3IgPSBlcnJvciA/IGVycm9yLmJpbmQodGhpc0FyZyB8fCB0aGlzKSA6IGZ1bmN0aW9uKCkge307XG59O1xuXG5VdGlscy5NaWNyb3Bob25lLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX2lzU3VwcG9ydGVkKSB7IHJldHVybjsgfVxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhXygge2F1ZGlvOnRydWV9LCBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgc2VsZi5fc3RyZWFtID0gc3RyZWFtO1xuICAgICAgICBzZWxmLl9vbkNvbm5lY3RlZChzdHJlYW0pO1xuICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYoZS5uYW1lID09PSAnUGVybWlzc2lvbkRlbmllZEVycm9yJyB8fCBlID09PSAnUEVSTUlTU0lPTl9ERU5JRUQnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUGVybWlzc2lvbiBkZW5pZWQuIFlvdSBjYW4gdW5kbyB0aGlzIGJ5IGNsaWNraW5nIHRoZSBjYW1lcmEgaWNvbiB3aXRoIHRoZSByZWQgY3Jvc3MgaW4gdGhlIGFkZHJlc3MgYmFyJyk7XG4gICAgICAgICAgICBzZWxmLl9vbkRlbmllZCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5fb25FcnJvcihlLm1lc3NhZ2UgfHwgZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblV0aWxzLk1pY3JvcGhvbmUucHJvdG90eXBlLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zdHJlYW0pIHtcbiAgICAgICAgdGhpcy5fc3RyZWFtLnN0b3AoKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoVXRpbHMuTWljcm9waG9uZS5wcm90b3R5cGUsICdzdHJlYW0nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0cmVhbTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFV0aWxzLk1pY3JvcGhvbmUucHJvdG90eXBlLCAnaXNTdXBwb3J0ZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzU3VwcG9ydGVkO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWxzO1xuIl19
