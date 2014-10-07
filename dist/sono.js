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

},{"./lib/loader.js":3,"./lib/node-manager.js":4,"./lib/sound.js":14,"./lib/support.js":20,"./lib/utils.js":21}],2:[function(require,module,exports){
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

var Analyser = require('./node/analyser.js'),
    Distortion = require('./node/distortion.js'),
    Echo = require('./node/echo.js'),
    Filter = require('./node/filter.js'),
    Flanger = require('./node/flanger.js'),
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
    output.disconnect();
    console.log('> disconnected output: ', (a.name || a.constructor.name));
    output.connect(b._input || b);
    console.log('> connected output: ', (a.name || a.constructor.name), 'to input:', (b.name || b.constructor.name));

    if(typeof a._connected === 'function') {
        a._connected.call(a, b);
    }
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

    console.log('updateConnections:');

    var node,
        prev;

    for (var i = 0; i < this._nodeList.length; i++) {
        node = this._nodeList[i];
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

// or setter for destination?
/*NodeManager.prototype._connectToDestination = function(node) {
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
    this._connectToDestination(this._context.destination);
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
    this._connectToDestination(node);
    return node;
};

module.exports = NodeManager;

},{"./node/analyser.js":5,"./node/distortion.js":6,"./node/echo.js":7,"./node/filter.js":8,"./node/flanger.js":9,"./node/panner.js":10,"./node/phaser.js":11,"./node/recorder.js":12,"./node/reverb.js":13}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
'use strict';

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

module.exports = Distortion;

},{}],7:[function(require,module,exports){
'use strict';

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

module.exports = Echo;

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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
    lfo.start();
    
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
    lfo.start();

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

    node._connected = function(to) {
        console.log.apply(console, ['flanger connected to', (to.name || to.constructor.name)]);
    };

    return node;
}

function Flanger(context, config) {
    config = config || {};
    return config.stereo ? new StereoFlanger(context, config) : new MonoFlanger(context, config);
}

module.exports = Flanger;

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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
    lfo.start();

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

    node._connected = function(to) {
        console.log.apply(console, ['phaser connected to', (to.name || to.constructor.name)]);
    };

    return node;
}

module.exports = Phaser;

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

module.exports = Sound;

},{"./node-manager.js":4,"./source/buffer-source.js":15,"./source/media-source.js":16,"./source/microphone-source.js":17,"./source/oscillator-source.js":18,"./source/script-source.js":19,"./utils.js":21}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc29uby5qcyIsIm5vZGVfbW9kdWxlcy9zaWduYWxzL2Rpc3Qvc2lnbmFscy5qcyIsInNyYy9saWIvbG9hZGVyLmpzIiwic3JjL2xpYi9ub2RlLW1hbmFnZXIuanMiLCJzcmMvbGliL25vZGUvYW5hbHlzZXIuanMiLCJzcmMvbGliL25vZGUvZGlzdG9ydGlvbi5qcyIsInNyYy9saWIvbm9kZS9lY2hvLmpzIiwic3JjL2xpYi9ub2RlL2ZpbHRlci5qcyIsInNyYy9saWIvbm9kZS9mbGFuZ2VyLmpzIiwic3JjL2xpYi9ub2RlL3Bhbm5lci5qcyIsInNyYy9saWIvbm9kZS9waGFzZXIuanMiLCJzcmMvbGliL25vZGUvcmVjb3JkZXIuanMiLCJzcmMvbGliL25vZGUvcmV2ZXJiLmpzIiwic3JjL2xpYi9zb3VuZC5qcyIsInNyYy9saWIvc291cmNlL2J1ZmZlci1zb3VyY2UuanMiLCJzcmMvbGliL3NvdXJjZS9tZWRpYS1zb3VyY2UuanMiLCJzcmMvbGliL3NvdXJjZS9taWNyb3Bob25lLXNvdXJjZS5qcyIsInNyYy9saWIvc291cmNlL29zY2lsbGF0b3Itc291cmNlLmpzIiwic3JjL2xpYi9zb3VyY2Uvc2NyaXB0LXNvdXJjZS5qcyIsInNyYy9saWIvc3VwcG9ydC5qcyIsInNyYy9saWIvdXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25aQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTG9hZGVyID0gcmVxdWlyZSgnLi9saWIvbG9hZGVyLmpzJyksXG4gICAgTm9kZU1hbmFnZXIgPSByZXF1aXJlKCcuL2xpYi9ub2RlLW1hbmFnZXIuanMnKSxcbiAgICBTb3VuZCA9IHJlcXVpcmUoJy4vbGliL3NvdW5kLmpzJyksXG4gICAgU3VwcG9ydCA9IHJlcXVpcmUoJy4vbGliL3N1cHBvcnQuanMnKSxcbiAgICBVdGlscyA9IHJlcXVpcmUoJy4vbGliL3V0aWxzLmpzJyk7XG5cbmZ1bmN0aW9uIFNvbm8oKSB7XG4gICAgdGhpcy5WRVJTSU9OID0gJzAuMC4wJztcblxuICAgIHdpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG4gICAgdGhpcy5fY29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgPyBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpIDogbnVsbDtcbiAgICBVdGlscy5zZXRDb250ZXh0KHRoaXMuX2NvbnRleHQpO1xuXG4gICAgdGhpcy5fbm9kZSA9IG5ldyBOb2RlTWFuYWdlcih0aGlzLl9jb250ZXh0KTtcbiAgICB0aGlzLl9tYXN0ZXJHYWluID0gdGhpcy5fbm9kZS5nYWluKCk7XG4gICAgaWYodGhpcy5fY29udGV4dCkge1xuICAgICAgICB0aGlzLl9ub2RlLnNldFNvdXJjZSh0aGlzLl9tYXN0ZXJHYWluKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZXREZXN0aW5hdGlvbih0aGlzLl9jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zb3VuZHMgPSBbXTtcblxuICAgIHRoaXMuX2hhbmRsZVRvdWNobG9jaygpO1xuICAgIHRoaXMuX2hhbmRsZVZpc2liaWxpdHkoKTtcbn1cblxuLypcbiAqIENyZWF0ZVxuICpcbiAqIEFjY2VwdGVkIHZhbHVlcyBmb3IgcGFyYW0gY29uZmlnOlxuICpcbiAqIEFycmF5QnVmZmVyXG4gKiBIVE1MTWVkaWFFbGVtZW50XG4gKiBBcnJheSAob2YgZmlsZXMgZS5nLiBbJ2Zvby5vZ2cnLCAnZm9vLm1wMyddKVxuICogU3RyaW5nIChmaWxlbmFtZSBlLmcuICdmb28ub2dnJylcbiAqIE9iamVjdCBjb25maWcgZS5nLiB7IGlkOidmb28nLCB1cmw6Wydmb28ub2dnJywgJ2Zvby5tcDMnXSB9XG4gKiBTdHJpbmcgKE9zY2lsbGF0b3IgdHlwZSBpLmUuICdzaW5lJywgJ3NxdWFyZScsICdzYXd0b290aCcsICd0cmlhbmdsZScpXG4gKiBPYmplY3QgKFNjcmlwdFByb2Nlc3NvciBjb25maWc6IHsgYnVmZmVyU2l6ZTogMTAyNCwgY2hhbm5lbHM6IDEsIGNhbGxiYWNrOiBmbiwgdGhpc0FyZzogc2VsZiB9KVxuICovXG5cblNvbm8ucHJvdG90eXBlLmNyZWF0ZVNvdW5kID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgLy8gdHJ5IHRvIGxvYWQgaWYgY29uZmlnIGNvbnRhaW5zIFVSTHNcbiAgICBpZihTdXBwb3J0LmNvbnRhaW5zVVJMKGNvbmZpZykpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9hZChjb25maWcpO1xuICAgIH1cbiAgICAvLyBvdGhlcndpc2UganVzdCByZXR1cm4gYSBuZXcgc291bmQgb2JqZWN0XG4gICAgdmFyIHNvdW5kID0gbmV3IFNvdW5kKHRoaXMuX2NvbnRleHQsIHRoaXMuX21hc3RlckdhaW4pO1xuICAgIGlmKGNvbmZpZykge1xuICAgICAgICBzb3VuZC5zZXREYXRhKGNvbmZpZy5kYXRhIHx8IGNvbmZpZyk7XG4gICAgICAgIHNvdW5kLmlkID0gY29uZmlnLmlkIHx8ICcnO1xuICAgICAgICBzb3VuZC5sb29wID0gISFjb25maWcubG9vcDtcbiAgICAgICAgc291bmQudm9sdW1lID0gY29uZmlnLnZvbHVtZTtcbiAgICB9XG4gICAgdGhpcy5fc291bmRzLnB1c2goc291bmQpO1xuXG4gICAgcmV0dXJuIHNvdW5kO1xufTtcblxuLypcbiAqIERlc3Ryb3lcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5kZXN0cm95U291bmQgPSBmdW5jdGlvbihzb3VuZE9ySWQpIHtcbiAgICBpZighc291bmRPcklkKSB7IHJldHVybjsgfVxuICAgIHRoaXMuX3NvdW5kcy5zb21lKGZ1bmN0aW9uKHNvdW5kLCBpbmRleCwgc291bmRzKSB7XG4gICAgICAgIGlmKHNvdW5kID09PSBzb3VuZE9ySWQgfHwgc291bmQuaWQgPT09IHNvdW5kT3JJZCkge1xuICAgICAgICAgICAgc291bmRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICBpZihzb3VuZC5sb2FkZXIpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5sb2FkZXIuY2FuY2VsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHNvdW5kLnN0b3AoKTtcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKlxuICogR2V0IFNvdW5kIGJ5IGlkXG4gKi9cblxuU29uby5wcm90b3R5cGUuZ2V0U291bmQgPSBmdW5jdGlvbihpZCkge1xuICAgIHZhciBzb3VuZCA9IG51bGw7XG4gICAgdGhpcy5fc291bmRzLnNvbWUoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBpZihpdGVtLmlkID09PSBpZCkge1xuICAgICAgICAgICAgc291bmQgPSBpdGVtO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc291bmQ7XG59O1xuXG4vKlxuICogTG9hZGluZ1xuICovXG5cblNvbm8ucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICBpZighY29uZmlnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnRFeGNlcHRpb246IFNvbm8ubG9hZDogcGFyYW0gY29uZmlnIGlzIHVuZGVmaW5lZCcpO1xuICAgIH1cblxuICAgIHZhciBhc01lZGlhRWxlbWVudCA9ICEhY29uZmlnLmFzTWVkaWFFbGVtZW50LFxuICAgICAgICBvblByb2dyZXNzID0gY29uZmlnLm9uUHJvZ3Jlc3MsXG4gICAgICAgIG9uQ29tcGxldGUgPSBjb25maWcub25Db21wbGV0ZSxcbiAgICAgICAgdGhpc0FyZyA9IGNvbmZpZy50aGlzQXJnIHx8IGNvbmZpZy5jb250ZXh0IHx8IHRoaXMsXG4gICAgICAgIHVybCA9IGNvbmZpZy51cmwgfHwgY29uZmlnO1xuXG4gICAgdmFyIHNvdW5kLFxuICAgICAgICBsb2FkZXI7XG5cbiAgICBpZihTdXBwb3J0LmNvbnRhaW5zVVJMKHVybCkpIHtcbiAgICAgICAgc291bmQgPSB0aGlzLl9xdWV1ZShjb25maWcsIGFzTWVkaWFFbGVtZW50KTtcbiAgICAgICAgbG9hZGVyID0gc291bmQubG9hZGVyO1xuICAgIH1cbiAgICBlbHNlIGlmKEFycmF5LmlzQXJyYXkodXJsKSAmJiBTdXBwb3J0LmNvbnRhaW5zVVJMKHVybFswXS51cmwpICkge1xuICAgICAgICBzb3VuZCA9IFtdO1xuICAgICAgICBsb2FkZXIgPSBuZXcgTG9hZGVyLkdyb3VwKCk7XG5cbiAgICAgICAgdXJsLmZvckVhY2goZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgICAgc291bmQucHVzaCh0aGlzLl9xdWV1ZShmaWxlLCBhc01lZGlhRWxlbWVudCwgbG9hZGVyKSk7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH1cblxuICAgIGlmKG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgbG9hZGVyLm9uUHJvZ3Jlc3MuYWRkKG9uUHJvZ3Jlc3MsIHRoaXNBcmcpO1xuICAgIH1cbiAgICBpZihvbkNvbXBsZXRlKSB7XG4gICAgICAgIGxvYWRlci5vbkNvbXBsZXRlLmFkZE9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBvbkNvbXBsZXRlLmNhbGwodGhpc0FyZywgc291bmQpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgbG9hZGVyLnN0YXJ0KCk7XG5cbiAgICByZXR1cm4gc291bmQ7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5fcXVldWUgPSBmdW5jdGlvbihjb25maWcsIGFzTWVkaWFFbGVtZW50LCBncm91cCkge1xuICAgIHZhciB1cmwgPSBTdXBwb3J0LmdldFN1cHBvcnRlZEZpbGUoY29uZmlnLnVybCB8fCBjb25maWcpO1xuICAgIHZhciBzb3VuZCA9IHRoaXMuY3JlYXRlU291bmQoKTtcbiAgICBzb3VuZC5pZCA9IGNvbmZpZy5pZCB8fCAnJztcbiAgICBzb3VuZC5sb29wID0gISFjb25maWcubG9vcDtcbiAgICBzb3VuZC52b2x1bWUgPSBjb25maWcudm9sdW1lO1xuXG4gICAgdmFyIGxvYWRlciA9IG5ldyBMb2FkZXIodXJsKTtcbiAgICBsb2FkZXIuYXVkaW9Db250ZXh0ID0gYXNNZWRpYUVsZW1lbnQgPyBudWxsIDogdGhpcy5fY29udGV4dDtcbiAgICBsb2FkZXIuaXNUb3VjaExvY2tlZCA9IHRoaXMuX2lzVG91Y2hMb2NrZWQ7XG4gICAgbG9hZGVyLm9uQmVmb3JlQ29tcGxldGUuYWRkT25jZShmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHNvdW5kLnNldERhdGEoZGF0YSk7XG4gICAgfSk7XG4gICAgLy8ga2VlcCBhIHJlZiBzbyBjYW4gY2FsbCBzb3VuZC5sb2FkZXIuY2FuY2VsKClcbiAgICBzb3VuZC5sb2FkZXIgPSBsb2FkZXI7XG4gICAgaWYoZ3JvdXApIHsgZ3JvdXAuYWRkKGxvYWRlcik7IH1cblxuICAgIHJldHVybiBzb3VuZDtcbn07XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cblNvbm8ucHJvdG90eXBlLm11dGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9wcmVNdXRlVm9sdW1lID0gdGhpcy52b2x1bWU7XG4gICAgdGhpcy52b2x1bWUgPSAwO1xufTtcblxuU29uby5wcm90b3R5cGUudW5NdXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy52b2x1bWUgPSB0aGlzLl9wcmVNdXRlVm9sdW1lIHx8IDE7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICd2b2x1bWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX21hc3RlckdhaW4uZ2Fpbi52YWx1ZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYoaXNOYU4odmFsdWUpKSB7IHJldHVybjsgfVxuXG4gICAgICAgIHRoaXMuX21hc3RlckdhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuXG4gICAgICAgIGlmKCF0aGlzLmhhc1dlYkF1ZGlvKSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICAgICAgICAgIHNvdW5kLnZvbHVtZSA9IHZhbHVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuU29uby5wcm90b3R5cGUucGF1c2VBbGwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICBpZihzb3VuZC5wbGF5aW5nKSB7XG4gICAgICAgICAgICBzb3VuZC5wYXVzZSgpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5yZXN1bWVBbGwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICBpZihzb3VuZC5wYXVzZWQpIHtcbiAgICAgICAgICAgIHNvdW5kLnBsYXkoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuU29uby5wcm90b3R5cGUuc3RvcEFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgIHNvdW5kLnN0b3AoKTtcbiAgICB9KTtcbn07XG5cblNvbm8ucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihpZCwgZGVsYXksIG9mZnNldCkge1xuICAgIHRoaXMuZ2V0U291bmQoaWQpLnBsYXkoZGVsYXksIG9mZnNldCk7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy5nZXRTb3VuZChpZCkucGF1c2UoKTtcbn07XG5cblNvbm8ucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuZ2V0U291bmQoaWQpLnN0b3AoKTtcbn07XG5cbi8qXG4gKiBNb2JpbGUgdG91Y2ggbG9ja1xuICovXG5cblNvbm8ucHJvdG90eXBlLl9oYW5kbGVUb3VjaGxvY2sgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50LFxuICAgICAgICBsb2NrZWQgPSAhIXVhLm1hdGNoKC9BbmRyb2lkfHdlYk9TfGlQaG9uZXxpUGFkfGlQb2R8QmxhY2tCZXJyeXxJRU1vYmlsZXxPcGVyYSBNaW5pL2kpLFxuICAgICAgICBzZWxmID0gdGhpcztcblxuICAgIHZhciB1bmxvY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdW5sb2NrKTtcbiAgICAgICAgc2VsZi5faXNUb3VjaExvY2tlZCA9IGZhbHNlO1xuICAgICAgICBzZWxmLl9zb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICAgICAgaWYoc291bmQubG9hZGVyKSB7XG4gICAgICAgICAgICAgICAgc291bmQubG9hZGVyLnRvdWNoTG9ja2VkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmKHNlbGYuY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGJ1ZmZlciA9IHNlbGYuY29udGV4dC5jcmVhdGVCdWZmZXIoMSwgMSwgMjIwNTApO1xuICAgICAgICAgICAgdmFyIHVubG9ja1NvdXJjZSA9IHNlbGYuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICAgICAgICAgIHVubG9ja1NvdXJjZS5idWZmZXIgPSBidWZmZXI7XG4gICAgICAgICAgICB1bmxvY2tTb3VyY2UuY29ubmVjdChzZWxmLmNvbnRleHQuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgdW5sb2NrU291cmNlLnN0YXJ0KDApO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpZihsb2NrZWQpIHtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdW5sb2NrLCBmYWxzZSk7XG4gICAgfVxuICAgIHRoaXMuX2lzVG91Y2hMb2NrZWQgPSBsb2NrZWQ7XG59O1xuXG4vKlxuICogUGFnZSB2aXNpYmlsaXR5IGV2ZW50c1xuICovXG5cblNvbm8ucHJvdG90eXBlLl9oYW5kbGVWaXNpYmlsaXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhZ2VIaWRkZW5QYXVzZWQgPSBbXSxcbiAgICAgICAgc291bmRzID0gdGhpcy5fc291bmRzLFxuICAgICAgICBoaWRkZW4sXG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2U7XG5cbiAgICBpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ2hpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAndmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tb3pIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhpZGRlbiA9ICdtb3pIaWRkZW4nO1xuICAgICAgICB2aXNpYmlsaXR5Q2hhbmdlID0gJ21venZpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQubXNIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhpZGRlbiA9ICdtc0hpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnbXN2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50LndlYmtpdEhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ3dlYmtpdEhpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnd2Via2l0dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuXG4gICAgLy8gcGF1c2UgY3VycmVudGx5IHBsYXlpbmcgc291bmRzIGFuZCBzdG9yZSByZWZzXG4gICAgZnVuY3Rpb24gb25IaWRkZW4oKSB7XG4gICAgICAgIHNvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgICAgICBpZihzb3VuZC5wbGF5aW5nKSB7XG4gICAgICAgICAgICAgICAgc291bmQucGF1c2UoKTtcbiAgICAgICAgICAgICAgICBwYWdlSGlkZGVuUGF1c2VkLnB1c2goc291bmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBwbGF5IHNvdW5kcyB0aGF0IGdvdCBwYXVzZWQgd2hlbiBwYWdlIHdhcyBoaWRkZW5cbiAgICBmdW5jdGlvbiBvblNob3duKCkge1xuICAgICAgICB3aGlsZShwYWdlSGlkZGVuUGF1c2VkLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFnZUhpZGRlblBhdXNlZC5wb3AoKS5wbGF5KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkNoYW5nZSgpIHtcbiAgICAgICAgaWYgKGRvY3VtZW50W2hpZGRlbl0pIHtcbiAgICAgICAgICAgIG9uSGlkZGVuKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvblNob3duKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZih2aXNpYmlsaXR5Q2hhbmdlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih2aXNpYmlsaXR5Q2hhbmdlLCBvbkNoYW5nZSwgZmFsc2UpO1xuICAgIH1cbn07XG5cbi8qXG4gKiBMb2cgdmVyc2lvbiAmIGRldmljZSBzdXBwb3J0IGluZm9cbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5sb2cgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGl0bGUgPSAnU29ubyAnICsgdGhpcy5WRVJTSU9OLFxuICAgICAgICBpbmZvID0gJ1N1cHBvcnRlZDonICsgdGhpcy5pc1N1cHBvcnRlZCArXG4gICAgICAgICAgICAgICAnIFdlYkF1ZGlvQVBJOicgKyB0aGlzLmhhc1dlYkF1ZGlvICtcbiAgICAgICAgICAgICAgICcgVG91Y2hMb2NrZWQ6JyArIHRoaXMuX2lzVG91Y2hMb2NrZWQgK1xuICAgICAgICAgICAgICAgJyBFeHRlbnNpb25zOicgKyBTdXBwb3J0LmV4dGVuc2lvbnM7XG5cbiAgICBpZihuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ0Nocm9tZScpID4gLTEpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXG4gICAgICAgICAgICAgICAgJyVjIOKZqyAnICsgdGl0bGUgK1xuICAgICAgICAgICAgICAgICcg4pmrICVjICcgKyBpbmZvICsgJyAnLFxuICAgICAgICAgICAgICAgICdjb2xvcjogI0ZGRkZGRjsgYmFja2dyb3VuZDogIzM3OUY3QScsXG4gICAgICAgICAgICAgICAgJ2NvbG9yOiAjMUYxQzBEOyBiYWNrZ3JvdW5kOiAjRTBGQkFDJ1xuICAgICAgICAgICAgXTtcbiAgICAgICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJncyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHdpbmRvdy5jb25zb2xlICYmIHdpbmRvdy5jb25zb2xlLmxvZy5jYWxsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nLmNhbGwoY29uc29sZSwgdGl0bGUgKyAnICcgKyBpbmZvKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdjYW5QbGF5Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBTdXBwb3J0LmNhblBsYXk7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2V4dGVuc2lvbnMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFN1cHBvcnQuZXh0ZW5zaW9ucztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnY29udGV4dCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnaGFzV2ViQXVkaW8nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fY29udGV4dDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnaXNTdXBwb3J0ZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFN1cHBvcnQuZXh0ZW5zaW9ucy5sZW5ndGggPiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdtYXN0ZXJHYWluJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXN0ZXJHYWluO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdub2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdzb3VuZHMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdW5kcztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAndXRpbHMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFV0aWxzO1xuICAgIH1cbn0pO1xuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFNvbm8oKTtcbiIsIi8qanNsaW50IG9uZXZhcjp0cnVlLCB1bmRlZjp0cnVlLCBuZXdjYXA6dHJ1ZSwgcmVnZXhwOnRydWUsIGJpdHdpc2U6dHJ1ZSwgbWF4ZXJyOjUwLCBpbmRlbnQ6NCwgd2hpdGU6ZmFsc2UsIG5vbWVuOmZhbHNlLCBwbHVzcGx1czpmYWxzZSAqL1xuLypnbG9iYWwgZGVmaW5lOmZhbHNlLCByZXF1aXJlOmZhbHNlLCBleHBvcnRzOmZhbHNlLCBtb2R1bGU6ZmFsc2UsIHNpZ25hbHM6ZmFsc2UgKi9cblxuLyoqIEBsaWNlbnNlXG4gKiBKUyBTaWduYWxzIDxodHRwOi8vbWlsbGVybWVkZWlyb3MuZ2l0aHViLmNvbS9qcy1zaWduYWxzLz5cbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICogQXV0aG9yOiBNaWxsZXIgTWVkZWlyb3NcbiAqIFZlcnNpb246IDEuMC4wIC0gQnVpbGQ6IDI2OCAoMjAxMi8xMS8yOSAwNTo0OCBQTSlcbiAqL1xuXG4oZnVuY3Rpb24oZ2xvYmFsKXtcblxuICAgIC8vIFNpZ25hbEJpbmRpbmcgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogT2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIGJpbmRpbmcgYmV0d2VlbiBhIFNpZ25hbCBhbmQgYSBsaXN0ZW5lciBmdW5jdGlvbi5cbiAgICAgKiA8YnIgLz4tIDxzdHJvbmc+VGhpcyBpcyBhbiBpbnRlcm5hbCBjb25zdHJ1Y3RvciBhbmQgc2hvdWxkbid0IGJlIGNhbGxlZCBieSByZWd1bGFyIHVzZXJzLjwvc3Ryb25nPlxuICAgICAqIDxiciAvPi0gaW5zcGlyZWQgYnkgSm9hIEViZXJ0IEFTMyBTaWduYWxCaW5kaW5nIGFuZCBSb2JlcnQgUGVubmVyJ3MgU2xvdCBjbGFzc2VzLlxuICAgICAqIEBhdXRob3IgTWlsbGVyIE1lZGVpcm9zXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQGludGVybmFsXG4gICAgICogQG5hbWUgU2lnbmFsQmluZGluZ1xuICAgICAqIEBwYXJhbSB7U2lnbmFsfSBzaWduYWwgUmVmZXJlbmNlIHRvIFNpZ25hbCBvYmplY3QgdGhhdCBsaXN0ZW5lciBpcyBjdXJyZW50bHkgYm91bmQgdG8uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgSGFuZGxlciBmdW5jdGlvbiBib3VuZCB0byB0aGUgc2lnbmFsLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNPbmNlIElmIGJpbmRpbmcgc2hvdWxkIGJlIGV4ZWN1dGVkIGp1c3Qgb25jZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2xpc3RlbmVyQ29udGV4dF0gQ29udGV4dCBvbiB3aGljaCBsaXN0ZW5lciB3aWxsIGJlIGV4ZWN1dGVkIChvYmplY3QgdGhhdCBzaG91bGQgcmVwcmVzZW50IHRoZSBgdGhpc2AgdmFyaWFibGUgaW5zaWRlIGxpc3RlbmVyIGZ1bmN0aW9uKS5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ByaW9yaXR5XSBUaGUgcHJpb3JpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50IGxpc3RlbmVyLiAoZGVmYXVsdCA9IDApLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFNpZ25hbEJpbmRpbmcoc2lnbmFsLCBsaXN0ZW5lciwgaXNPbmNlLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhhbmRsZXIgZnVuY3Rpb24gYm91bmQgdG8gdGhlIHNpZ25hbC5cbiAgICAgICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX2xpc3RlbmVyID0gbGlzdGVuZXI7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIGJpbmRpbmcgc2hvdWxkIGJlIGV4ZWN1dGVkIGp1c3Qgb25jZS5cbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5faXNPbmNlID0gaXNPbmNlO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb250ZXh0IG9uIHdoaWNoIGxpc3RlbmVyIHdpbGwgYmUgZXhlY3V0ZWQgKG9iamVjdCB0aGF0IHNob3VsZCByZXByZXNlbnQgdGhlIGB0aGlzYCB2YXJpYWJsZSBpbnNpZGUgbGlzdGVuZXIgZnVuY3Rpb24pLlxuICAgICAgICAgKiBAbWVtYmVyT2YgU2lnbmFsQmluZGluZy5wcm90b3R5cGVcbiAgICAgICAgICogQG5hbWUgY29udGV4dFxuICAgICAgICAgKiBAdHlwZSBPYmplY3R8dW5kZWZpbmVkfG51bGxcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29udGV4dCA9IGxpc3RlbmVyQ29udGV4dDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVmZXJlbmNlIHRvIFNpZ25hbCBvYmplY3QgdGhhdCBsaXN0ZW5lciBpcyBjdXJyZW50bHkgYm91bmQgdG8uXG4gICAgICAgICAqIEB0eXBlIFNpZ25hbFxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fc2lnbmFsID0gc2lnbmFsO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMaXN0ZW5lciBwcmlvcml0eVxuICAgICAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX3ByaW9yaXR5ID0gcHJpb3JpdHkgfHwgMDtcbiAgICB9XG5cbiAgICBTaWduYWxCaW5kaW5nLnByb3RvdHlwZSA9IHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgYmluZGluZyBpcyBhY3RpdmUgYW5kIHNob3VsZCBiZSBleGVjdXRlZC5cbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKi9cbiAgICAgICAgYWN0aXZlIDogdHJ1ZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVmYXVsdCBwYXJhbWV0ZXJzIHBhc3NlZCB0byBsaXN0ZW5lciBkdXJpbmcgYFNpZ25hbC5kaXNwYXRjaGAgYW5kIGBTaWduYWxCaW5kaW5nLmV4ZWN1dGVgLiAoY3VycmllZCBwYXJhbWV0ZXJzKVxuICAgICAgICAgKiBAdHlwZSBBcnJheXxudWxsXG4gICAgICAgICAqL1xuICAgICAgICBwYXJhbXMgOiBudWxsLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDYWxsIGxpc3RlbmVyIHBhc3NpbmcgYXJiaXRyYXJ5IHBhcmFtZXRlcnMuXG4gICAgICAgICAqIDxwPklmIGJpbmRpbmcgd2FzIGFkZGVkIHVzaW5nIGBTaWduYWwuYWRkT25jZSgpYCBpdCB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZCBmcm9tIHNpZ25hbCBkaXNwYXRjaCBxdWV1ZSwgdGhpcyBtZXRob2QgaXMgdXNlZCBpbnRlcm5hbGx5IGZvciB0aGUgc2lnbmFsIGRpc3BhdGNoLjwvcD5cbiAgICAgICAgICogQHBhcmFtIHtBcnJheX0gW3BhcmFtc0Fycl0gQXJyYXkgb2YgcGFyYW1ldGVycyB0aGF0IHNob3VsZCBiZSBwYXNzZWQgdG8gdGhlIGxpc3RlbmVyXG4gICAgICAgICAqIEByZXR1cm4geyp9IFZhbHVlIHJldHVybmVkIGJ5IHRoZSBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGV4ZWN1dGUgOiBmdW5jdGlvbiAocGFyYW1zQXJyKSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlclJldHVybiwgcGFyYW1zO1xuICAgICAgICAgICAgaWYgKHRoaXMuYWN0aXZlICYmICEhdGhpcy5fbGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMgPSB0aGlzLnBhcmFtcz8gdGhpcy5wYXJhbXMuY29uY2F0KHBhcmFtc0FycikgOiBwYXJhbXNBcnI7XG4gICAgICAgICAgICAgICAgaGFuZGxlclJldHVybiA9IHRoaXMuX2xpc3RlbmVyLmFwcGx5KHRoaXMuY29udGV4dCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5faXNPbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXJSZXR1cm47XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERldGFjaCBiaW5kaW5nIGZyb20gc2lnbmFsLlxuICAgICAgICAgKiAtIGFsaWFzIHRvOiBteVNpZ25hbC5yZW1vdmUobXlCaW5kaW5nLmdldExpc3RlbmVyKCkpO1xuICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbnxudWxsfSBIYW5kbGVyIGZ1bmN0aW9uIGJvdW5kIHRvIHRoZSBzaWduYWwgb3IgYG51bGxgIGlmIGJpbmRpbmcgd2FzIHByZXZpb3VzbHkgZGV0YWNoZWQuXG4gICAgICAgICAqL1xuICAgICAgICBkZXRhY2ggOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc0JvdW5kKCk/IHRoaXMuX3NpZ25hbC5yZW1vdmUodGhpcy5fbGlzdGVuZXIsIHRoaXMuY29udGV4dCkgOiBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBgdHJ1ZWAgaWYgYmluZGluZyBpcyBzdGlsbCBib3VuZCB0byB0aGUgc2lnbmFsIGFuZCBoYXZlIGEgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBpc0JvdW5kIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICghIXRoaXMuX3NpZ25hbCAmJiAhIXRoaXMuX2xpc3RlbmVyKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7Ym9vbGVhbn0gSWYgU2lnbmFsQmluZGluZyB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgb25jZS5cbiAgICAgICAgICovXG4gICAgICAgIGlzT25jZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc09uY2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBIYW5kbGVyIGZ1bmN0aW9uIGJvdW5kIHRvIHRoZSBzaWduYWwuXG4gICAgICAgICAqL1xuICAgICAgICBnZXRMaXN0ZW5lciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9saXN0ZW5lcjtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7U2lnbmFsfSBTaWduYWwgdGhhdCBsaXN0ZW5lciBpcyBjdXJyZW50bHkgYm91bmQgdG8uXG4gICAgICAgICAqL1xuICAgICAgICBnZXRTaWduYWwgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2lnbmFsO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWxldGUgaW5zdGFuY2UgcHJvcGVydGllc1xuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX2Rlc3Ryb3kgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fc2lnbmFsO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2xpc3RlbmVyO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuY29udGV4dDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7c3RyaW5nfSBTdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgIHRvU3RyaW5nIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICdbU2lnbmFsQmluZGluZyBpc09uY2U6JyArIHRoaXMuX2lzT25jZSArJywgaXNCb3VuZDonKyB0aGlzLmlzQm91bmQoKSArJywgYWN0aXZlOicgKyB0aGlzLmFjdGl2ZSArICddJztcbiAgICAgICAgfVxuXG4gICAgfTtcblxuXG4vKmdsb2JhbCBTaWduYWxCaW5kaW5nOmZhbHNlKi9cblxuICAgIC8vIFNpZ25hbCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgZnVuY3Rpb24gdmFsaWRhdGVMaXN0ZW5lcihsaXN0ZW5lciwgZm5OYW1lKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ2xpc3RlbmVyIGlzIGEgcmVxdWlyZWQgcGFyYW0gb2Yge2ZufSgpIGFuZCBzaG91bGQgYmUgYSBGdW5jdGlvbi4nLnJlcGxhY2UoJ3tmbn0nLCBmbk5hbWUpICk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gZXZlbnQgYnJvYWRjYXN0ZXJcbiAgICAgKiA8YnIgLz4tIGluc3BpcmVkIGJ5IFJvYmVydCBQZW5uZXIncyBBUzMgU2lnbmFscy5cbiAgICAgKiBAbmFtZSBTaWduYWxcbiAgICAgKiBAYXV0aG9yIE1pbGxlciBNZWRlaXJvc1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFNpZ25hbCgpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEB0eXBlIEFycmF5LjxTaWduYWxCaW5kaW5nPlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fYmluZGluZ3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcHJldlBhcmFtcyA9IG51bGw7XG5cbiAgICAgICAgLy8gZW5mb3JjZSBkaXNwYXRjaCB0byBhd2F5cyB3b3JrIG9uIHNhbWUgY29udGV4dCAoIzQ3KVxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2ggPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgU2lnbmFsLnByb3RvdHlwZS5kaXNwYXRjaC5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIFNpZ25hbC5wcm90b3R5cGUgPSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNpZ25hbHMgVmVyc2lvbiBOdW1iZXJcbiAgICAgICAgICogQHR5cGUgU3RyaW5nXG4gICAgICAgICAqIEBjb25zdFxuICAgICAgICAgKi9cbiAgICAgICAgVkVSU0lPTiA6ICcxLjAuMCcsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIFNpZ25hbCBzaG91bGQga2VlcCByZWNvcmQgb2YgcHJldmlvdXNseSBkaXNwYXRjaGVkIHBhcmFtZXRlcnMgYW5kXG4gICAgICAgICAqIGF1dG9tYXRpY2FsbHkgZXhlY3V0ZSBsaXN0ZW5lciBkdXJpbmcgYGFkZCgpYC9gYWRkT25jZSgpYCBpZiBTaWduYWwgd2FzXG4gICAgICAgICAqIGFscmVhZHkgZGlzcGF0Y2hlZCBiZWZvcmUuXG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICovXG4gICAgICAgIG1lbW9yaXplIDogZmFsc2UsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9zaG91bGRQcm9wYWdhdGUgOiB0cnVlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiBTaWduYWwgaXMgYWN0aXZlIGFuZCBzaG91bGQgYnJvYWRjYXN0IGV2ZW50cy5cbiAgICAgICAgICogPHA+PHN0cm9uZz5JTVBPUlRBTlQ6PC9zdHJvbmc+IFNldHRpbmcgdGhpcyBwcm9wZXJ0eSBkdXJpbmcgYSBkaXNwYXRjaCB3aWxsIG9ubHkgYWZmZWN0IHRoZSBuZXh0IGRpc3BhdGNoLCBpZiB5b3Ugd2FudCB0byBzdG9wIHRoZSBwcm9wYWdhdGlvbiBvZiBhIHNpZ25hbCB1c2UgYGhhbHQoKWAgaW5zdGVhZC48L3A+XG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICovXG4gICAgICAgIGFjdGl2ZSA6IHRydWUsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNPbmNlXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbbGlzdGVuZXJDb250ZXh0XVxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ByaW9yaXR5XVxuICAgICAgICAgKiBAcmV0dXJuIHtTaWduYWxCaW5kaW5nfVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX3JlZ2lzdGVyTGlzdGVuZXIgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGlzT25jZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSkge1xuXG4gICAgICAgICAgICB2YXIgcHJldkluZGV4ID0gdGhpcy5faW5kZXhPZkxpc3RlbmVyKGxpc3RlbmVyLCBsaXN0ZW5lckNvbnRleHQpLFxuICAgICAgICAgICAgICAgIGJpbmRpbmc7XG5cbiAgICAgICAgICAgIGlmIChwcmV2SW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgYmluZGluZyA9IHRoaXMuX2JpbmRpbmdzW3ByZXZJbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKGJpbmRpbmcuaXNPbmNlKCkgIT09IGlzT25jZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBjYW5ub3QgYWRkJysgKGlzT25jZT8gJycgOiAnT25jZScpICsnKCkgdGhlbiBhZGQnKyAoIWlzT25jZT8gJycgOiAnT25jZScpICsnKCkgdGhlIHNhbWUgbGlzdGVuZXIgd2l0aG91dCByZW1vdmluZyB0aGUgcmVsYXRpb25zaGlwIGZpcnN0LicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYmluZGluZyA9IG5ldyBTaWduYWxCaW5kaW5nKHRoaXMsIGxpc3RlbmVyLCBpc09uY2UsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2FkZEJpbmRpbmcoYmluZGluZyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHRoaXMubWVtb3JpemUgJiYgdGhpcy5fcHJldlBhcmFtcyl7XG4gICAgICAgICAgICAgICAgYmluZGluZy5leGVjdXRlKHRoaXMuX3ByZXZQYXJhbXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gYmluZGluZztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtTaWduYWxCaW5kaW5nfSBiaW5kaW5nXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfYWRkQmluZGluZyA6IGZ1bmN0aW9uIChiaW5kaW5nKSB7XG4gICAgICAgICAgICAvL3NpbXBsaWZpZWQgaW5zZXJ0aW9uIHNvcnRcbiAgICAgICAgICAgIHZhciBuID0gdGhpcy5fYmluZGluZ3MubGVuZ3RoO1xuICAgICAgICAgICAgZG8geyAtLW47IH0gd2hpbGUgKHRoaXMuX2JpbmRpbmdzW25dICYmIGJpbmRpbmcuX3ByaW9yaXR5IDw9IHRoaXMuX2JpbmRpbmdzW25dLl9wcmlvcml0eSk7XG4gICAgICAgICAgICB0aGlzLl9iaW5kaW5ncy5zcGxpY2UobiArIDEsIDAsIGJpbmRpbmcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgICAgICAgKiBAcmV0dXJuIHtudW1iZXJ9XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfaW5kZXhPZkxpc3RlbmVyIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgbiA9IHRoaXMuX2JpbmRpbmdzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBjdXI7XG4gICAgICAgICAgICB3aGlsZSAobi0tKSB7XG4gICAgICAgICAgICAgICAgY3VyID0gdGhpcy5fYmluZGluZ3Nbbl07XG4gICAgICAgICAgICAgICAgaWYgKGN1ci5fbGlzdGVuZXIgPT09IGxpc3RlbmVyICYmIGN1ci5jb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2hlY2sgaWYgbGlzdGVuZXIgd2FzIGF0dGFjaGVkIHRvIFNpZ25hbC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXJcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtjb250ZXh0XVxuICAgICAgICAgKiBAcmV0dXJuIHtib29sZWFufSBpZiBTaWduYWwgaGFzIHRoZSBzcGVjaWZpZWQgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBoYXMgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pbmRleE9mTGlzdGVuZXIobGlzdGVuZXIsIGNvbnRleHQpICE9PSAtMTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkIGEgbGlzdGVuZXIgdG8gdGhlIHNpZ25hbC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgU2lnbmFsIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbbGlzdGVuZXJDb250ZXh0XSBDb250ZXh0IG9uIHdoaWNoIGxpc3RlbmVyIHdpbGwgYmUgZXhlY3V0ZWQgKG9iamVjdCB0aGF0IHNob3VsZCByZXByZXNlbnQgdGhlIGB0aGlzYCB2YXJpYWJsZSBpbnNpZGUgbGlzdGVuZXIgZnVuY3Rpb24pLlxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ByaW9yaXR5XSBUaGUgcHJpb3JpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50IGxpc3RlbmVyLiBMaXN0ZW5lcnMgd2l0aCBoaWdoZXIgcHJpb3JpdHkgd2lsbCBiZSBleGVjdXRlZCBiZWZvcmUgbGlzdGVuZXJzIHdpdGggbG93ZXIgcHJpb3JpdHkuIExpc3RlbmVycyB3aXRoIHNhbWUgcHJpb3JpdHkgbGV2ZWwgd2lsbCBiZSBleGVjdXRlZCBhdCB0aGUgc2FtZSBvcmRlciBhcyB0aGV5IHdlcmUgYWRkZWQuIChkZWZhdWx0ID0gMClcbiAgICAgICAgICogQHJldHVybiB7U2lnbmFsQmluZGluZ30gQW4gT2JqZWN0IHJlcHJlc2VudGluZyB0aGUgYmluZGluZyBiZXR3ZWVuIHRoZSBTaWduYWwgYW5kIGxpc3RlbmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgYWRkIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KSB7XG4gICAgICAgICAgICB2YWxpZGF0ZUxpc3RlbmVyKGxpc3RlbmVyLCAnYWRkJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcmVnaXN0ZXJMaXN0ZW5lcihsaXN0ZW5lciwgZmFsc2UsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGQgbGlzdGVuZXIgdG8gdGhlIHNpZ25hbCB0aGF0IHNob3VsZCBiZSByZW1vdmVkIGFmdGVyIGZpcnN0IGV4ZWN1dGlvbiAod2lsbCBiZSBleGVjdXRlZCBvbmx5IG9uY2UpLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBTaWduYWwgaGFuZGxlciBmdW5jdGlvbi5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtsaXN0ZW5lckNvbnRleHRdIENvbnRleHQgb24gd2hpY2ggbGlzdGVuZXIgd2lsbCBiZSBleGVjdXRlZCAob2JqZWN0IHRoYXQgc2hvdWxkIHJlcHJlc2VudCB0aGUgYHRoaXNgIHZhcmlhYmxlIGluc2lkZSBsaXN0ZW5lciBmdW5jdGlvbikuXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbcHJpb3JpdHldIFRoZSBwcmlvcml0eSBsZXZlbCBvZiB0aGUgZXZlbnQgbGlzdGVuZXIuIExpc3RlbmVycyB3aXRoIGhpZ2hlciBwcmlvcml0eSB3aWxsIGJlIGV4ZWN1dGVkIGJlZm9yZSBsaXN0ZW5lcnMgd2l0aCBsb3dlciBwcmlvcml0eS4gTGlzdGVuZXJzIHdpdGggc2FtZSBwcmlvcml0eSBsZXZlbCB3aWxsIGJlIGV4ZWN1dGVkIGF0IHRoZSBzYW1lIG9yZGVyIGFzIHRoZXkgd2VyZSBhZGRlZC4gKGRlZmF1bHQgPSAwKVxuICAgICAgICAgKiBAcmV0dXJuIHtTaWduYWxCaW5kaW5nfSBBbiBPYmplY3QgcmVwcmVzZW50aW5nIHRoZSBiaW5kaW5nIGJldHdlZW4gdGhlIFNpZ25hbCBhbmQgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBhZGRPbmNlIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KSB7XG4gICAgICAgICAgICB2YWxpZGF0ZUxpc3RlbmVyKGxpc3RlbmVyLCAnYWRkT25jZScpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlZ2lzdGVyTGlzdGVuZXIobGlzdGVuZXIsIHRydWUsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmUgYSBzaW5nbGUgbGlzdGVuZXIgZnJvbSB0aGUgZGlzcGF0Y2ggcXVldWUuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIEhhbmRsZXIgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgcmVtb3ZlZC5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtjb250ZXh0XSBFeGVjdXRpb24gY29udGV4dCAoc2luY2UgeW91IGNhbiBhZGQgdGhlIHNhbWUgaGFuZGxlciBtdWx0aXBsZSB0aW1lcyBpZiBleGVjdXRpbmcgaW4gYSBkaWZmZXJlbnQgY29udGV4dCkuXG4gICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBMaXN0ZW5lciBoYW5kbGVyIGZ1bmN0aW9uLlxuICAgICAgICAgKi9cbiAgICAgICAgcmVtb3ZlIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICB2YWxpZGF0ZUxpc3RlbmVyKGxpc3RlbmVyLCAncmVtb3ZlJyk7XG5cbiAgICAgICAgICAgIHZhciBpID0gdGhpcy5faW5kZXhPZkxpc3RlbmVyKGxpc3RlbmVyLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmIChpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzW2ldLl9kZXN0cm95KCk7IC8vbm8gcmVhc29uIHRvIGEgU2lnbmFsQmluZGluZyBleGlzdCBpZiBpdCBpc24ndCBhdHRhY2hlZCB0byBhIHNpZ25hbFxuICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBsaXN0ZW5lcjtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZnJvbSB0aGUgU2lnbmFsLlxuICAgICAgICAgKi9cbiAgICAgICAgcmVtb3ZlQWxsIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG4gPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAobi0tKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZGluZ3Nbbl0uX2Rlc3Ryb3koKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzLmxlbmd0aCA9IDA7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge251bWJlcn0gTnVtYmVyIG9mIGxpc3RlbmVycyBhdHRhY2hlZCB0byB0aGUgU2lnbmFsLlxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0TnVtTGlzdGVuZXJzIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2JpbmRpbmdzLmxlbmd0aDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcCBwcm9wYWdhdGlvbiBvZiB0aGUgZXZlbnQsIGJsb2NraW5nIHRoZSBkaXNwYXRjaCB0byBuZXh0IGxpc3RlbmVycyBvbiB0aGUgcXVldWUuXG4gICAgICAgICAqIDxwPjxzdHJvbmc+SU1QT1JUQU5UOjwvc3Ryb25nPiBzaG91bGQgYmUgY2FsbGVkIG9ubHkgZHVyaW5nIHNpZ25hbCBkaXNwYXRjaCwgY2FsbGluZyBpdCBiZWZvcmUvYWZ0ZXIgZGlzcGF0Y2ggd29uJ3QgYWZmZWN0IHNpZ25hbCBicm9hZGNhc3QuPC9wPlxuICAgICAgICAgKiBAc2VlIFNpZ25hbC5wcm90b3R5cGUuZGlzYWJsZVxuICAgICAgICAgKi9cbiAgICAgICAgaGFsdCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3VsZFByb3BhZ2F0ZSA9IGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEaXNwYXRjaC9Ccm9hZGNhc3QgU2lnbmFsIHRvIGFsbCBsaXN0ZW5lcnMgYWRkZWQgdG8gdGhlIHF1ZXVlLlxuICAgICAgICAgKiBAcGFyYW0gey4uLip9IFtwYXJhbXNdIFBhcmFtZXRlcnMgdGhhdCBzaG91bGQgYmUgcGFzc2VkIHRvIGVhY2ggaGFuZGxlci5cbiAgICAgICAgICovXG4gICAgICAgIGRpc3BhdGNoIDogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgaWYgKCEgdGhpcy5hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwYXJhbXNBcnIgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLFxuICAgICAgICAgICAgICAgIG4gPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgYmluZGluZ3M7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLm1lbW9yaXplKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJldlBhcmFtcyA9IHBhcmFtc0FycjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCEgbikge1xuICAgICAgICAgICAgICAgIC8vc2hvdWxkIGNvbWUgYWZ0ZXIgbWVtb3JpemVcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJpbmRpbmdzID0gdGhpcy5fYmluZGluZ3Muc2xpY2UoKTsgLy9jbG9uZSBhcnJheSBpbiBjYXNlIGFkZC9yZW1vdmUgaXRlbXMgZHVyaW5nIGRpc3BhdGNoXG4gICAgICAgICAgICB0aGlzLl9zaG91bGRQcm9wYWdhdGUgPSB0cnVlOyAvL2luIGNhc2UgYGhhbHRgIHdhcyBjYWxsZWQgYmVmb3JlIGRpc3BhdGNoIG9yIGR1cmluZyB0aGUgcHJldmlvdXMgZGlzcGF0Y2guXG5cbiAgICAgICAgICAgIC8vZXhlY3V0ZSBhbGwgY2FsbGJhY2tzIHVudGlsIGVuZCBvZiB0aGUgbGlzdCBvciB1bnRpbCBhIGNhbGxiYWNrIHJldHVybnMgYGZhbHNlYCBvciBzdG9wcyBwcm9wYWdhdGlvblxuICAgICAgICAgICAgLy9yZXZlcnNlIGxvb3Agc2luY2UgbGlzdGVuZXJzIHdpdGggaGlnaGVyIHByaW9yaXR5IHdpbGwgYmUgYWRkZWQgYXQgdGhlIGVuZCBvZiB0aGUgbGlzdFxuICAgICAgICAgICAgZG8geyBuLS07IH0gd2hpbGUgKGJpbmRpbmdzW25dICYmIHRoaXMuX3Nob3VsZFByb3BhZ2F0ZSAmJiBiaW5kaW5nc1tuXS5leGVjdXRlKHBhcmFtc0FycikgIT09IGZhbHNlKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRm9yZ2V0IG1lbW9yaXplZCBhcmd1bWVudHMuXG4gICAgICAgICAqIEBzZWUgU2lnbmFsLm1lbW9yaXplXG4gICAgICAgICAqL1xuICAgICAgICBmb3JnZXQgOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5fcHJldlBhcmFtcyA9IG51bGw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZSBhbGwgYmluZGluZ3MgZnJvbSBzaWduYWwgYW5kIGRlc3Ryb3kgYW55IHJlZmVyZW5jZSB0byBleHRlcm5hbCBvYmplY3RzIChkZXN0cm95IFNpZ25hbCBvYmplY3QpLlxuICAgICAgICAgKiA8cD48c3Ryb25nPklNUE9SVEFOVDo8L3N0cm9uZz4gY2FsbGluZyBhbnkgbWV0aG9kIG9uIHRoZSBzaWduYWwgaW5zdGFuY2UgYWZ0ZXIgY2FsbGluZyBkaXNwb3NlIHdpbGwgdGhyb3cgZXJyb3JzLjwvcD5cbiAgICAgICAgICovXG4gICAgICAgIGRpc3Bvc2UgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUFsbCgpO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JpbmRpbmdzO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3ByZXZQYXJhbXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gU3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICB0b1N0cmluZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAnW1NpZ25hbCBhY3RpdmU6JysgdGhpcy5hY3RpdmUgKycgbnVtTGlzdGVuZXJzOicrIHRoaXMuZ2V0TnVtTGlzdGVuZXJzKCkgKyddJztcbiAgICAgICAgfVxuXG4gICAgfTtcblxuXG4gICAgLy8gTmFtZXNwYWNlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBTaWduYWxzIG5hbWVzcGFjZVxuICAgICAqIEBuYW1lc3BhY2VcbiAgICAgKiBAbmFtZSBzaWduYWxzXG4gICAgICovXG4gICAgdmFyIHNpZ25hbHMgPSBTaWduYWw7XG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gZXZlbnQgYnJvYWRjYXN0ZXJcbiAgICAgKiBAc2VlIFNpZ25hbFxuICAgICAqL1xuICAgIC8vIGFsaWFzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSAoc2VlICNnaC00NClcbiAgICBzaWduYWxzLlNpZ25hbCA9IFNpZ25hbDtcblxuXG5cbiAgICAvL2V4cG9ydHMgdG8gbXVsdGlwbGUgZW52aXJvbm1lbnRzXG4gICAgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKXsgLy9BTURcbiAgICAgICAgZGVmaW5lKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHNpZ25hbHM7IH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpeyAvL25vZGVcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBzaWduYWxzO1xuICAgIH0gZWxzZSB7IC8vYnJvd3NlclxuICAgICAgICAvL3VzZSBzdHJpbmcgYmVjYXVzZSBvZiBHb29nbGUgY2xvc3VyZSBjb21waWxlciBBRFZBTkNFRF9NT0RFXG4gICAgICAgIC8qanNsaW50IHN1Yjp0cnVlICovXG4gICAgICAgIGdsb2JhbFsnc2lnbmFscyddID0gc2lnbmFscztcbiAgICB9XG5cbn0odGhpcykpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc2lnbmFscyA9IHJlcXVpcmUoJ3NpZ25hbHMnKTtcblxuZnVuY3Rpb24gTG9hZGVyKHVybCkge1xuICAgIHZhciBvblByb2dyZXNzID0gbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgICAgIG9uQmVmb3JlQ29tcGxldGUgPSBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICAgICAgb25Db21wbGV0ZSA9IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgICAgICBvbkVycm9yID0gbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgICAgIHByb2dyZXNzID0gMCxcbiAgICAgICAgYXVkaW9Db250ZXh0LFxuICAgICAgICBpc1RvdWNoTG9ja2VkLFxuICAgICAgICByZXF1ZXN0LFxuICAgICAgICBkYXRhO1xuXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKGF1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgbG9hZEFycmF5QnVmZmVyKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2FkQXVkaW9FbGVtZW50KCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGxvYWRBcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHJlcXVlc3Qub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICByZXF1ZXN0Lm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgaWYgKGV2ZW50Lmxlbmd0aENvbXB1dGFibGUpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IGV2ZW50LmxvYWRlZCAvIGV2ZW50LnRvdGFsO1xuICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3MuZGlzcGF0Y2gocHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgYXVkaW9Db250ZXh0LmRlY29kZUF1ZGlvRGF0YShcbiAgICAgICAgICAgICAgICByZXF1ZXN0LnJlc3BvbnNlLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gYnVmZmVyO1xuICAgICAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IDE7XG4gICAgICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3MuZGlzcGF0Y2goMSk7XG4gICAgICAgICAgICAgICAgICAgIG9uQmVmb3JlQ29tcGxldGUuZGlzcGF0Y2goYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgb25Db21wbGV0ZS5kaXNwYXRjaChidWZmZXIpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yLmRpc3BhdGNoKGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIG9uRXJyb3IuZGlzcGF0Y2goZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH07XG5cbiAgICB2YXIgbG9hZEF1ZGlvRWxlbWVudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBkYXRhID0gbmV3IEF1ZGlvKCk7XG4gICAgICAgIGRhdGEubmFtZSA9IHVybDtcbiAgICAgICAgZGF0YS5wcmVsb2FkID0gJ2F1dG8nO1xuICAgICAgICBkYXRhLnNyYyA9IHVybDtcblxuICAgICAgICBpZiAoISFpc1RvdWNoTG9ja2VkKSB7XG4gICAgICAgICAgICBvblByb2dyZXNzLmRpc3BhdGNoKDEpO1xuICAgICAgICAgICAgb25CZWZvcmVDb21wbGV0ZS5kaXNwYXRjaChkYXRhKTtcbiAgICAgICAgICAgIG9uQ29tcGxldGUuZGlzcGF0Y2goZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdGltZW91dDtcbiAgICAgICAgICAgIHZhciByZWFkeUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgcmVhZHlIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHByb2dyZXNzID0gMTtcbiAgICAgICAgICAgICAgICBvblByb2dyZXNzLmRpc3BhdGNoKDEpO1xuICAgICAgICAgICAgICAgIG9uQmVmb3JlQ29tcGxldGUuZGlzcGF0Y2goZGF0YSk7XG4gICAgICAgICAgICAgICAgb25Db21wbGV0ZS5kaXNwYXRjaChkYXRhKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyB0aW1lb3V0IGJlY2F1c2Ugc29tZXRpbWVzIGNhbnBsYXl0aHJvdWdoIGRvZXNuJ3QgZmlyZVxuICAgICAgICAgICAgdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KHJlYWR5SGFuZGxlciwgNDAwMCk7XG4gICAgICAgICAgICBkYXRhLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgcmVhZHlIYW5kbGVyLCBmYWxzZSk7XG4gICAgICAgICAgICBkYXRhLm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICBvbkVycm9yLmRpc3BhdGNoKGUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRhdGEubG9hZCgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBjYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmKHJlcXVlc3QgJiYgcmVxdWVzdC5yZWFkeVN0YXRlICE9PSA0KSB7XG4gICAgICAgICAgcmVxdWVzdC5hYm9ydCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgYXBpID0ge1xuICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgIGNhbmNlbDogY2FuY2VsLFxuICAgICAgICBvblByb2dyZXNzOiBvblByb2dyZXNzLFxuICAgICAgICBvbkNvbXBsZXRlOiBvbkNvbXBsZXRlLFxuICAgICAgICBvbkJlZm9yZUNvbXBsZXRlOiBvbkJlZm9yZUNvbXBsZXRlLFxuICAgICAgICBvbkVycm9yOiBvbkVycm9yXG4gICAgfTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhcGksICdkYXRhJywge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhcGksICdwcm9ncmVzcycsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9ncmVzcztcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGFwaSwgJ2F1ZGlvQ29udGV4dCcsIHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgYXVkaW9Db250ZXh0ID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhcGksICdpc1RvdWNoTG9ja2VkJywge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBpc1RvdWNoTG9ja2VkID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKGFwaSk7XG59XG5cbkxvYWRlci5Hcm91cCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBxdWV1ZSA9IFtdLFxuICAgICAgICBudW1Mb2FkZWQgPSAwLFxuICAgICAgICBudW1Ub3RhbCA9IDAsXG4gICAgICAgIG9uQ29tcGxldGUgPSBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICAgICAgb25Qcm9ncmVzcyA9IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgICAgICBvbkVycm9yID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG5cbiAgICB2YXIgYWRkID0gZnVuY3Rpb24obG9hZGVyKSB7XG4gICAgICAgIHF1ZXVlLnB1c2gobG9hZGVyKTtcbiAgICAgICAgbnVtVG90YWwrKztcbiAgICAgICAgcmV0dXJuIGxvYWRlcjtcbiAgICB9O1xuXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIG51bVRvdGFsID0gcXVldWUubGVuZ3RoO1xuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIHZhciBuZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgb25Db21wbGV0ZS5kaXNwYXRjaCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxvYWRlciA9IHF1ZXVlLnBvcCgpO1xuICAgICAgICBsb2FkZXIub25Qcm9ncmVzcy5hZGQocHJvZ3Jlc3NIYW5kbGVyKTtcbiAgICAgICAgbG9hZGVyLm9uQmVmb3JlQ29tcGxldGUuYWRkT25jZShjb21wbGV0ZUhhbmRsZXIpO1xuICAgICAgICBsb2FkZXIub25FcnJvci5hZGRPbmNlKGVycm9ySGFuZGxlcik7XG4gICAgICAgIGxvYWRlci5zdGFydCgpO1xuICAgIH07XG5cbiAgICB2YXIgcHJvZ3Jlc3NIYW5kbGVyID0gZnVuY3Rpb24ocHJvZ3Jlc3MpIHtcbiAgICAgICAgdmFyIGxvYWRlZCA9IG51bUxvYWRlZCArIHByb2dyZXNzO1xuICAgICAgICBvblByb2dyZXNzLmRpc3BhdGNoKGxvYWRlZCAvIG51bVRvdGFsKTtcbiAgICB9O1xuXG4gICAgdmFyIGNvbXBsZXRlSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBudW1Mb2FkZWQrKztcbiAgICAgICAgb25Qcm9ncmVzcy5kaXNwYXRjaChudW1Mb2FkZWQgLyBudW1Ub3RhbCk7XG4gICAgICAgIG5leHQoKTtcbiAgICB9O1xuXG4gICAgdmFyIGVycm9ySGFuZGxlciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgb25FcnJvci5kaXNwYXRjaChlKTtcbiAgICAgICAgbmV4dCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgIGFkZDogYWRkLFxuICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgIG9uUHJvZ3Jlc3M6IG9uUHJvZ3Jlc3MsXG4gICAgICAgIG9uQ29tcGxldGU6IG9uQ29tcGxldGUsXG4gICAgICAgIG9uRXJyb3I6IG9uRXJyb3JcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTG9hZGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQW5hbHlzZXIgPSByZXF1aXJlKCcuL25vZGUvYW5hbHlzZXIuanMnKSxcbiAgICBEaXN0b3J0aW9uID0gcmVxdWlyZSgnLi9ub2RlL2Rpc3RvcnRpb24uanMnKSxcbiAgICBFY2hvID0gcmVxdWlyZSgnLi9ub2RlL2VjaG8uanMnKSxcbiAgICBGaWx0ZXIgPSByZXF1aXJlKCcuL25vZGUvZmlsdGVyLmpzJyksXG4gICAgRmxhbmdlciA9IHJlcXVpcmUoJy4vbm9kZS9mbGFuZ2VyLmpzJyksXG4gICAgUGFubmVyID0gcmVxdWlyZSgnLi9ub2RlL3Bhbm5lci5qcycpLFxuICAgIFBoYXNlciA9IHJlcXVpcmUoJy4vbm9kZS9waGFzZXIuanMnKSxcbiAgICBSZWNvcmRlciA9IHJlcXVpcmUoJy4vbm9kZS9yZWNvcmRlci5qcycpLFxuICAgIFJldmVyYiA9IHJlcXVpcmUoJy4vbm9kZS9yZXZlcmIuanMnKTtcblxuZnVuY3Rpb24gTm9kZU1hbmFnZXIoY29udGV4dCkge1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0IHx8IHRoaXMuY3JlYXRlRmFrZUNvbnRleHQoKTtcbiAgICB0aGlzLl9kZXN0aW5hdGlvbiA9IG51bGw7XG4gICAgdGhpcy5fbm9kZUxpc3QgPSBbXTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbn1cblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdOb2RlTWFuYWdlci5hZGQ6Jywgbm9kZSk7XG4gICAgdGhpcy5fbm9kZUxpc3QucHVzaChub2RlKTtcbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihub2RlID09PSB0aGlzLl9ub2RlTGlzdFtpXSkge1xuICAgICAgICAgICAgdGhpcy5fbm9kZUxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciBvdXRwdXQgPSBub2RlLl9vdXRwdXQgfHwgbm9kZTtcbiAgICBvdXRwdXQuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuX3VwZGF0ZUNvbm5lY3Rpb25zKCk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUucmVtb3ZlQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgd2hpbGUodGhpcy5fbm9kZUxpc3QubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX25vZGVMaXN0LnBvcCgpLmRpc2Nvbm5lY3QoKTtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlQ29ubmVjdGlvbnMoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5fY29ubmVjdCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAvL2NvbnNvbGUubG9nKCc+IGNvbm5lY3QnLCAoYS5uYW1lIHx8IGEuY29uc3RydWN0b3IubmFtZSksICd0bycsIChiLm5hbWUgfHwgYi5jb25zdHJ1Y3Rvci5uYW1lKSk7XG5cbiAgICB2YXIgb3V0cHV0ID0gYS5fb3V0cHV0IHx8IGE7XG4gICAgb3V0cHV0LmRpc2Nvbm5lY3QoKTtcbiAgICBjb25zb2xlLmxvZygnPiBkaXNjb25uZWN0ZWQgb3V0cHV0OiAnLCAoYS5uYW1lIHx8IGEuY29uc3RydWN0b3IubmFtZSkpO1xuICAgIG91dHB1dC5jb25uZWN0KGIuX2lucHV0IHx8IGIpO1xuICAgIGNvbnNvbGUubG9nKCc+IGNvbm5lY3RlZCBvdXRwdXQ6ICcsIChhLm5hbWUgfHwgYS5jb25zdHJ1Y3Rvci5uYW1lKSwgJ3RvIGlucHV0OicsIChiLm5hbWUgfHwgYi5jb25zdHJ1Y3Rvci5uYW1lKSk7XG5cbiAgICBpZih0eXBlb2YgYS5fY29ubmVjdGVkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGEuX2Nvbm5lY3RlZC5jYWxsKGEsIGIpO1xuICAgIH1cbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5fY29ubmVjdFRvRGVzdGluYXRpb24gPSBmdW5jdGlvbihkZXN0aW5hdGlvbikge1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoLFxuICAgICAgICBsYXN0Tm9kZSA9IGwgPyB0aGlzLl9ub2RlTGlzdFtsIC0gMV0gOiB0aGlzLl9zb3VyY2VOb2RlO1xuXG4gICAgaWYobGFzdE5vZGUpIHtcbiAgICAgICAgdGhpcy5fY29ubmVjdChsYXN0Tm9kZSwgZGVzdGluYXRpb24pO1xuICAgIH1cblxuICAgIHRoaXMuX2Rlc3RpbmF0aW9uID0gZGVzdGluYXRpb247XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuX3VwZGF0ZUNvbm5lY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHsgcmV0dXJuOyB9XG5cbiAgICBjb25zb2xlLmxvZygndXBkYXRlQ29ubmVjdGlvbnM6Jyk7XG5cbiAgICB2YXIgbm9kZSxcbiAgICAgICAgcHJldjtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fbm9kZUxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbm9kZSA9IHRoaXMuX25vZGVMaXN0W2ldO1xuICAgICAgICBwcmV2ID0gaSA9PT0gMCA/IHRoaXMuX3NvdXJjZU5vZGUgOiB0aGlzLl9ub2RlTGlzdFtpIC0gMV07XG4gICAgICAgIHRoaXMuX2Nvbm5lY3QocHJldiwgbm9kZSk7XG4gICAgfVxuXG4gICAgaWYodGhpcy5fZGVzdGluYXRpb24pIHtcbiAgICAgICAgdGhpcy5fY29ubmVjdFRvRGVzdGluYXRpb24odGhpcy5fZGVzdGluYXRpb24pO1xuICAgIH1cbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShOb2RlTWFuYWdlci5wcm90b3R5cGUsICdwYW5uaW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9wYW5uaW5nKSB7XG4gICAgICAgICAgICB0aGlzLl9wYW5uaW5nID0gbmV3IFBhbm5lcih0aGlzLl9jb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcGFubmluZztcbiAgICB9XG59KTtcblxuLy8gb3Igc2V0dGVyIGZvciBkZXN0aW5hdGlvbj9cbi8qTm9kZU1hbmFnZXIucHJvdG90eXBlLl9jb25uZWN0VG9EZXN0aW5hdGlvbiA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBpZihsID4gMCkge1xuICAgICAgY29uc29sZS5sb2coJ2Nvbm5lY3Q6JywgdGhpcy5fbm9kZUxpc3RbbCAtIDFdLCAndG8nLCBub2RlKTtcbiAgICAgICAgdGhpcy5fbm9kZUxpc3RbbCAtIDFdLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgdGhpcy5fbm9kZUxpc3RbbCAtIDFdLmNvbm5lY3Qobm9kZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZygnIHggY29ubmVjdCBzb3VyY2UgdG8gbm9kZTonLCBub2RlKTtcbiAgICAgICAgdGhpcy5fZ2Fpbi5kaXNjb25uZWN0KCk7XG4gICAgICAgIHRoaXMuX2dhaW4uY29ubmVjdChub2RlKTtcbiAgICB9XG4gICAgdGhpcy5fZGVzdGluYXRpb24gPSBub2RlO1xufTsqL1xuXG4vLyBzaG91bGQgc291cmNlIGJlIGl0ZW0gMCBpbiBub2RlbGlzdCBhbmQgZGVzaW5hdGlvbiBsYXN0XG4vLyBwcm9iIGlzIGFkZE5vZGUgbmVlZHMgdG8gYWRkIGJlZm9yZSBkZXN0aW5hdGlvblxuLy8gKyBzaG91bGQgaXQgYmUgY2FsbGVkIGNoYWluIG9yIHNvbWV0aGluZyBuaWNlcj9cbi8vIGZlZWxzIGxpa2Ugbm9kZSBsaXN0IGNvdWxkIGJlIGEgbGlua2VkIGxpc3Q/P1xuLy8gaWYgbGlzdC5sYXN0IGlzIGRlc3RpbmF0aW9uIGFkZGJlZm9yZVxuXG4vKk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5fdXBkYXRlQ29ubmVjdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbDsgaSsrKSB7XG4gICAgICB0aGlzLl9ub2RlTGlzdFtpLTFdLmNvbm5lY3QodGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgIH1cbn07Ki9cbi8qTm9kZU1hbmFnZXIucHJvdG90eXBlLl91cGRhdGVDb25uZWN0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc29sZS5sb2coJ191cGRhdGVDb25uZWN0aW9ucycpO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUuY29ubmVjdCh0aGlzLl9nYWluKTtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKGkgPT09IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCcgLSBjb25uZWN0IHNvdXJjZSB0byBub2RlOicsIHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgICAgIHRoaXMuX2dhaW4uZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgdGhpcy5fZ2Fpbi5jb25uZWN0KHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0OicsIHRoaXMuX25vZGVMaXN0W2ktMV0sICd0bycsIHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgICAgIHRoaXMuX25vZGVMaXN0W2ktMV0uZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgdGhpcy5fbm9kZUxpc3RbaS0xXS5jb25uZWN0KHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9jb25uZWN0VG9EZXN0aW5hdGlvbih0aGlzLl9jb250ZXh0LmRlc3RpbmF0aW9uKTtcbn07Ki9cblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmFuYWx5c2VyID0gZnVuY3Rpb24oZmZ0U2l6ZSwgc21vb3RoaW5nLCBtaW5EZWNpYmVscywgbWF4RGVjaWJlbHMpIHtcbiAgICB2YXIgYW5hbHlzZXIgPSBuZXcgQW5hbHlzZXIodGhpcy5fY29udGV4dCwgZmZ0U2l6ZSwgc21vb3RoaW5nLCBtaW5EZWNpYmVscywgbWF4RGVjaWJlbHMpO1xuICAgIHJldHVybiB0aGlzLmFkZChhbmFseXNlcik7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuY29tcHJlc3NvciA9IGZ1bmN0aW9uKHRocmVzaG9sZCwga25lZSwgcmF0aW8sIHJlZHVjdGlvbiwgYXR0YWNrLCByZWxlYXNlKSB7XG4gICAgLy8gbG93ZXJzIHRoZSB2b2x1bWUgb2YgdGhlIGxvdWRlc3QgcGFydHMgb2YgdGhlIHNpZ25hbCBhbmQgcmFpc2VzIHRoZSB2b2x1bWUgb2YgdGhlIHNvZnRlc3QgcGFydHNcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlRHluYW1pY3NDb21wcmVzc29yKCk7XG4gICAgLy8gbWluIGRlY2liZWxzIHRvIHN0YXJ0IGNvbXByZXNzaW5nIGF0IGZyb20gLTEwMCB0byAwXG4gICAgbm9kZS50aHJlc2hvbGQudmFsdWUgPSB0aHJlc2hvbGQgIT09IHVuZGVmaW5lZCA/IHRocmVzaG9sZCA6IC0yNDtcbiAgICAvLyBkZWNpYmVsIHZhbHVlIHRvIHN0YXJ0IGN1cnZlIHRvIGNvbXByZXNzZWQgdmFsdWUgZnJvbSAwIHRvIDQwXG4gICAgbm9kZS5rbmVlLnZhbHVlID0ga25lZSAhPT0gdW5kZWZpbmVkID8ga25lZSA6IDMwO1xuICAgIC8vIGFtb3VudCBvZiBjaGFuZ2UgcGVyIGRlY2liZWwgZnJvbSAxIHRvIDIwXG4gICAgbm9kZS5yYXRpby52YWx1ZSA9IHJhdGlvICE9PSB1bmRlZmluZWQgPyByYXRpbyA6IDEyO1xuICAgIC8vIGdhaW4gcmVkdWN0aW9uIGN1cnJlbnRseSBhcHBsaWVkIGJ5IGNvbXByZXNzb3IgZnJvbSAtMjAgdG8gMFxuICAgIG5vZGUucmVkdWN0aW9uLnZhbHVlID0gcmVkdWN0aW9uICE9PSB1bmRlZmluZWQgPyByZWR1Y3Rpb24gOiAtMTA7XG4gICAgLy8gc2Vjb25kcyB0byByZWR1Y2UgZ2FpbiBieSAxMGRiIGZyb20gMCB0byAxIC0gaG93IHF1aWNrbHkgc2lnbmFsIGFkYXB0ZWQgd2hlbiB2b2x1bWUgaW5jcmVhc2VkXG4gICAgbm9kZS5hdHRhY2sudmFsdWUgPSBhdHRhY2sgIT09IHVuZGVmaW5lZCA/IGF0dGFjayA6IDAuMDAwMztcbiAgICAvLyBzZWNvbmRzIHRvIGluY3JlYXNlIGdhaW4gYnkgMTBkYiBmcm9tIDAgdG8gMSAtIGhvdyBxdWlja2x5IHNpZ25hbCBhZGFwdGVkIHdoZW4gdm9sdW1lIHJlZGN1Y2VkXG4gICAgbm9kZS5yZWxlYXNlLnZhbHVlID0gcmVsZWFzZSAhPT0gdW5kZWZpbmVkID8gcmVsZWFzZSA6IDAuMjU7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmNvbnZvbHZlciA9IGZ1bmN0aW9uKGltcHVsc2VSZXNwb25zZSkge1xuICAgIC8vIGltcHVsc2VSZXNwb25zZSBpcyBhbiBhdWRpbyBmaWxlIGJ1ZmZlclxuICAgIHZhciBub2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVDb252b2x2ZXIoKTtcbiAgICBub2RlLmJ1ZmZlciA9IGltcHVsc2VSZXNwb25zZTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbih0aW1lKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZURlbGF5KCk7XG4gICAgaWYodGltZSAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuZGVsYXlUaW1lLnZhbHVlID0gdGltZTsgfVxuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5lY2hvID0gZnVuY3Rpb24odGltZSwgZ2Fpbikge1xuICAgIHZhciBub2RlID0gbmV3IEVjaG8odGhpcy5fY29udGV4dCwgdGltZSwgZ2Fpbik7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmRpc3RvcnRpb24gPSBmdW5jdGlvbihhbW91bnQpIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBEaXN0b3J0aW9uKHRoaXMuX2NvbnRleHQsIGFtb3VudCk7XG4gICAgLy8gRmxvYXQzMkFycmF5IGRlZmluaW5nIGN1cnZlICh2YWx1ZXMgYXJlIGludGVycG9sYXRlZClcbiAgICAvL25vZGUuY3VydmVcbiAgICAvLyB1cC1zYW1wbGUgYmVmb3JlIGFwcGx5aW5nIGN1cnZlIGZvciBiZXR0ZXIgcmVzb2x1dGlvbiByZXN1bHQgJ25vbmUnLCAnMngnIG9yICc0eCdcbiAgICAvL25vZGUub3ZlcnNhbXBsZSA9ICcyeCc7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uKHR5cGUsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHZhciBmaWx0ZXIgPSBuZXcgRmlsdGVyKHRoaXMuX2NvbnRleHQsIHR5cGUsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG4gICAgcmV0dXJuIHRoaXMuYWRkKGZpbHRlcik7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUubG93cGFzcyA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignbG93cGFzcycsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuaGlnaHBhc3MgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2hpZ2hwYXNzJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5iYW5kcGFzcyA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignYmFuZHBhc3MnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmxvd3NoZWxmID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdsb3dzaGVsZicsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuaGlnaHNoZWxmID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdoaWdoc2hlbGYnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnBlYWtpbmcgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ3BlYWtpbmcnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLm5vdGNoID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdub3RjaCcsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuYWxscGFzcyA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignYWxscGFzcycsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuZmxhbmdlciA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBub2RlID0gbmV3IEZsYW5nZXIodGhpcy5fY29udGV4dCwgY29uZmlnKTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuZ2FpbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICBpZih2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG5vZGUuZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5wYW5uZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBQYW5uZXIodGhpcy5fY29udGV4dCk7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnBoYXNlciA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBub2RlID0gbmV3IFBoYXNlcih0aGlzLl9jb250ZXh0LCBjb25maWcpO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5yZWNvcmRlciA9IGZ1bmN0aW9uKHBhc3NUaHJvdWdoKSB7XG4gICAgdmFyIG5vZGUgPSBuZXcgUmVjb3JkZXIodGhpcy5fY29udGV4dCwgcGFzc1Rocm91Z2gpO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5yZXZlcmIgPSBmdW5jdGlvbihzZWNvbmRzLCBkZWNheSwgcmV2ZXJzZSkge1xuICAgIHZhciBub2RlID0gbmV3IFJldmVyYih0aGlzLl9jb250ZXh0LCBzZWNvbmRzLCBkZWNheSwgcmV2ZXJzZSk7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnNjcmlwdFByb2Nlc3NvciA9IGZ1bmN0aW9uKGJ1ZmZlclNpemUsIGlucHV0Q2hhbm5lbHMsIG91dHB1dENoYW5uZWxzLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIC8vIGJ1ZmZlclNpemUgMjU2IC0gMTYzODQgKHBvdyAyKVxuICAgIGJ1ZmZlclNpemUgPSBidWZmZXJTaXplIHx8IDEwMjQ7XG4gICAgaW5wdXRDaGFubmVscyA9IGlucHV0Q2hhbm5lbHMgPT09IHVuZGVmaW5lZCA/IDAgOiBpbnB1dENoYW5uZWxzO1xuICAgIG91dHB1dENoYW5uZWxzID0gb3V0cHV0Q2hhbm5lbHMgPT09IHVuZGVmaW5lZCA/IDEgOiBvdXRwdXRDaGFubmVscztcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKGJ1ZmZlclNpemUsIGlucHV0Q2hhbm5lbHMsIG91dHB1dENoYW5uZWxzKTtcbiAgICAvL25vZGUub25hdWRpb3Byb2Nlc3MgPSBjYWxsYmFjay5iaW5kKGNhbGxiYWNrQ29udGV4dHx8IG5vZGUpO1xuICAgIG5vZGUub25hdWRpb3Byb2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgLy8gYXZhaWxhYmxlIHByb3BzOlxuICAgICAgICAvKlxuICAgICAgICBldmVudC5pbnB1dEJ1ZmZlclxuICAgICAgICBldmVudC5vdXRwdXRCdWZmZXJcbiAgICAgICAgZXZlbnQucGxheWJhY2tUaW1lXG4gICAgICAgICovXG4gICAgICAgIC8vIEV4YW1wbGU6IGdlbmVyYXRlIG5vaXNlXG4gICAgICAgIC8qXG4gICAgICAgIHZhciBvdXRwdXQgPSBldmVudC5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgIHZhciBsID0gb3V0cHV0Lmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIG91dHB1dFtpXSA9IE1hdGgucmFuZG9tKCk7XG4gICAgICAgIH1cbiAgICAgICAgKi9cbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIGV2ZW50KTtcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5jcmVhdGVGYWtlQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmbiA9IGZ1bmN0aW9uKCl7fTtcbiAgICB2YXIgcGFyYW0gPSB7XG4gICAgICAgIHZhbHVlOiAxLFxuICAgICAgICBkZWZhdWx0VmFsdWU6IDEsXG4gICAgICAgIGxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgc2V0VmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICBleHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgc2V0VGFyZ2V0QXRUaW1lOiBmbixcbiAgICAgICAgc2V0VmFsdWVDdXJ2ZUF0VGltZTogZm4sXG4gICAgICAgIGNhbmNlbFNjaGVkdWxlZFZhbHVlczogZm5cbiAgICB9O1xuICAgIHZhciBmYWtlTm9kZSA9IHtcbiAgICAgICAgY29ubmVjdDpmbixcbiAgICAgICAgZGlzY29ubmVjdDpmbixcbiAgICAgICAgLy8gZ2FpblxuICAgICAgICBnYWluOnt2YWx1ZTogMX0sXG4gICAgICAgIC8vIHBhbm5lclxuICAgICAgICBwYW5uaW5nTW9kZWw6IDAsXG4gICAgICAgIHNldFBvc2l0aW9uOiBmbixcbiAgICAgICAgc2V0T3JpZW50YXRpb246IGZuLFxuICAgICAgICBzZXRWZWxvY2l0eTogZm4sXG4gICAgICAgIGRpc3RhbmNlTW9kZWw6IDAsXG4gICAgICAgIHJlZkRpc3RhbmNlOiAwLFxuICAgICAgICBtYXhEaXN0YW5jZTogMCxcbiAgICAgICAgcm9sbG9mZkZhY3RvcjogMCxcbiAgICAgICAgY29uZUlubmVyQW5nbGU6IDM2MCxcbiAgICAgICAgY29uZU91dGVyQW5nbGU6IDM2MCxcbiAgICAgICAgY29uZU91dGVyR2FpbjogMCxcbiAgICAgICAgLy8gZmlsdGVyOlxuICAgICAgICB0eXBlOjAsXG4gICAgICAgIGZyZXF1ZW5jeTogcGFyYW0sXG4gICAgICAgIC8vIGRlbGF5XG4gICAgICAgIGRlbGF5VGltZTogcGFyYW0sXG4gICAgICAgIC8vIGNvbnZvbHZlclxuICAgICAgICBidWZmZXI6IDAsXG4gICAgICAgIC8vIGFuYWx5c2VyXG4gICAgICAgIHNtb290aGluZ1RpbWVDb25zdGFudDogMCxcbiAgICAgICAgZmZ0U2l6ZTogMCxcbiAgICAgICAgbWluRGVjaWJlbHM6IDAsXG4gICAgICAgIG1heERlY2liZWxzOiAwLFxuICAgICAgICAvLyBjb21wcmVzc29yXG4gICAgICAgIHRocmVzaG9sZDogcGFyYW0sXG4gICAgICAgIGtuZWU6IHBhcmFtLFxuICAgICAgICByYXRpbzogcGFyYW0sXG4gICAgICAgIGF0dGFjazogcGFyYW0sXG4gICAgICAgIHJlbGVhc2U6IHBhcmFtLFxuICAgICAgICAvLyBkaXN0b3J0aW9uXG4gICAgICAgIG92ZXJzYW1wbGU6IDAsXG4gICAgICAgIGN1cnZlOiAwLFxuICAgICAgICAvLyBidWZmZXJcbiAgICAgICAgc2FtcGxlUmF0ZTogMSxcbiAgICAgICAgbGVuZ3RoOiAwLFxuICAgICAgICBkdXJhdGlvbjogMCxcbiAgICAgICAgbnVtYmVyT2ZDaGFubmVsczogMCxcbiAgICAgICAgZ2V0Q2hhbm5lbERhdGE6IGZ1bmN0aW9uKCkgeyByZXR1cm4gW107IH0sXG4gICAgICAgIGNvcHlGcm9tQ2hhbm5lbDogZm4sXG4gICAgICAgIGNvcHlUb0NoYW5uZWw6IGZuXG4gICAgfTtcbiAgICB2YXIgcmV0dXJuRmFrZU5vZGUgPSBmdW5jdGlvbigpeyByZXR1cm4gZmFrZU5vZGU7IH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY3JlYXRlQW5hbHlzZXI6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVCdWZmZXI6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVCaXF1YWRGaWx0ZXI6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVEeW5hbWljc0NvbXByZXNzb3I6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVDb252b2x2ZXI6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVEZWxheTogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUdhaW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBnYWluOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAxLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0VmFsdWU6IDEsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgICAgICAgICAgICAgc2V0VmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICAgICAgICAgICAgICBleHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgICAgICAgICAgICAgc2V0VGFyZ2V0QXRUaW1lOiBmbixcbiAgICAgICAgICAgICAgICAgICAgc2V0VmFsdWVDdXJ2ZUF0VGltZTogZm4sXG4gICAgICAgICAgICAgICAgICAgIGNhbmNlbFNjaGVkdWxlZFZhbHVlczogZm5cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNvbm5lY3Q6Zm4sXG4gICAgICAgICAgICAgICAgZGlzY29ubmVjdDpmblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgY3JlYXRlUGFubmVyOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlU2NyaXB0UHJvY2Vzc29yOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlV2F2ZVNoYXBlcjogcmV0dXJuRmFrZU5vZGVcbiAgICB9O1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnNldFNvdXJjZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbm9kZTtcbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnNldERlc3RpbmF0aW9uID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHRoaXMuX2Nvbm5lY3RUb0Rlc3RpbmF0aW9uKG5vZGUpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb2RlTWFuYWdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQW5hbHlzZXIoY29udGV4dCwgZmZ0U2l6ZSwgc21vb3RoaW5nLCBtaW5EZWNpYmVscywgbWF4RGVjaWJlbHMpIHtcbiAgICBmZnRTaXplID0gZmZ0U2l6ZSB8fCAzMjtcbiAgICB2YXIgd2F2ZWZvcm1EYXRhLCBmcmVxdWVuY3lEYXRhO1xuXG4gICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XG4gICAgbm9kZS5mZnRTaXplID0gZmZ0U2l6ZTsgLy8gZnJlcXVlbmN5QmluQ291bnQgd2lsbCBiZSBoYWxmIHRoaXMgdmFsdWVcblxuICAgIGlmKHNtb290aGluZyAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gc21vb3RoaW5nOyB9XG4gICAgaWYobWluRGVjaWJlbHMgIT09IHVuZGVmaW5lZCkgeyBub2RlLm1pbkRlY2liZWxzID0gbWluRGVjaWJlbHM7IH1cbiAgICBpZihtYXhEZWNpYmVscyAhPT0gdW5kZWZpbmVkKSB7IG5vZGUubWF4RGVjaWJlbHMgPSBtYXhEZWNpYmVsczsgfVxuXG4gICAgdmFyIHVwZGF0ZUZGVFNpemUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoZmZ0U2l6ZSAhPT0gbm9kZS5mZnRTaXplIHx8IHdhdmVmb3JtRGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB3YXZlZm9ybURhdGEgPSBuZXcgVWludDhBcnJheShub2RlLmZmdFNpemUpO1xuICAgICAgICAgICAgZnJlcXVlbmN5RGF0YSA9IG5ldyBVaW50OEFycmF5KG5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xuICAgICAgICAgICAgZmZ0U2l6ZSA9IG5vZGUuZmZ0U2l6ZTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdXBkYXRlRkZUU2l6ZSgpO1xuXG4gICAgbm9kZS5nZXRXYXZlZm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB1cGRhdGVGRlRTaXplKCk7XG4gICAgICAgIHRoaXMuZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKHdhdmVmb3JtRGF0YSk7XG4gICAgICAgIHJldHVybiB3YXZlZm9ybURhdGE7XG4gICAgfTtcblxuICAgIG5vZGUuZ2V0RnJlcXVlbmNpZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdXBkYXRlRkZUU2l6ZSgpO1xuICAgICAgICB0aGlzLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXF1ZW5jeURhdGEpO1xuICAgICAgICByZXR1cm4gZnJlcXVlbmN5RGF0YTtcbiAgICB9O1xuXG4gICAgLy8gbWFwIG5hdGl2ZSBwcm9wZXJ0aWVzIG9mIEFuYWx5c2VyTm9kZVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgJ3Ntb290aGluZyc6IHtcbiAgICAgICAgICAgIC8vIDAgdG8gMVxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG5vZGUuc21vb3RoaW5nVGltZUNvbnN0YW50OyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLnNtb290aGluZ1RpbWVDb25zdGFudCA9IHZhbHVlOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFuYWx5c2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBEaXN0b3J0aW9uKGNvbnRleHQsIGFtb3VudCkge1xuICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVXYXZlU2hhcGVyKCk7XG5cbiAgICAvLyBjcmVhdGUgd2F2ZVNoYXBlciBkaXN0b3J0aW9uIGN1cnZlIGZyb20gMCB0byAxXG4gICAgbm9kZS51cGRhdGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBhbW91bnQgPSB2YWx1ZTtcbiAgICAgICAgdmFyIGsgPSB2YWx1ZSAqIDEwMCxcbiAgICAgICAgICAgIG4gPSAyMjA1MCxcbiAgICAgICAgICAgIGN1cnZlID0gbmV3IEZsb2F0MzJBcnJheShuKSxcbiAgICAgICAgICAgIGRlZyA9IE1hdGguUEkgLyAxODA7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciB4ID0gaSAqIDIgLyBuIC0gMTtcbiAgICAgICAgICAgIGN1cnZlW2ldID0gKDMgKyBrKSAqIHggKiAyMCAqIGRlZyAvIChNYXRoLlBJICsgayAqIE1hdGguYWJzKHgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY3VydmUgPSBjdXJ2ZTtcbiAgICB9O1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICAnYW1vdW50Jzoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGFtb3VudDsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgdGhpcy51cGRhdGUodmFsdWUpOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmKGFtb3VudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG5vZGUudXBkYXRlKGFtb3VudCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGlzdG9ydGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRWNobyhjb250ZXh0LCBkZWxheVRpbWUsIGdhaW5WYWx1ZSkge1xuICAgIHZhciBkZWxheSA9IGNvbnRleHQuY3JlYXRlRGVsYXkoKTtcbiAgICB2YXIgZ2FpbiA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgZ2Fpbi5nYWluLnZhbHVlID0gZ2FpblZhbHVlIHx8IDAuNTtcbiAgICBpZihkZWxheVRpbWUgIT09IHVuZGVmaW5lZCkgeyBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBkZWxheVRpbWU7IH1cblxuICAgIGRlbGF5Ll9jb25uZWN0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZGVsYXkuY29ubmVjdChnYWluKTtcbiAgICAgICAgZ2Fpbi5jb25uZWN0KGRlbGF5KTtcbiAgICB9O1xuXG4gICAgZGVsYXkudXBkYXRlID0gZnVuY3Rpb24oZGVsYXlUaW1lLCBnYWluVmFsdWUpIHtcbiAgICAgICAgaWYoZGVsYXlUaW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZGVsYXlUaW1lLnZhbHVlID0gZGVsYXlUaW1lO1xuICAgICAgICB9XG4gICAgICAgIGlmKGdhaW5WYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBnYWluLmdhaW4udmFsdWUgPSBnYWluVmFsdWU7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGRlbGF5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVjaG87XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEZpbHRlcihjb250ZXh0LCB0eXBlLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICAvLyBGcmVxdWVuY3kgYmV0d2VlbiA0MEh6IGFuZCBoYWxmIG9mIHRoZSBzYW1wbGluZyByYXRlXG4gICAgdmFyIG1pbkZyZXF1ZW5jeSA9IDQwO1xuICAgIHZhciBtYXhGcmVxdWVuY3kgPSBjb250ZXh0LnNhbXBsZVJhdGUgLyAyO1xuXG4gICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgIG5vZGUudHlwZSA9IHR5cGU7XG5cbiAgICBpZihmcmVxdWVuY3kgIT09IHVuZGVmaW5lZCkgeyBub2RlLmZyZXF1ZW5jeS52YWx1ZSA9IGZyZXF1ZW5jeTsgfVxuICAgIGlmKHF1YWxpdHkgIT09IHVuZGVmaW5lZCkgeyBub2RlLlEudmFsdWUgPSBxdWFsaXR5OyB9XG4gICAgaWYoZ2FpbiAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuZ2Fpbi52YWx1ZSA9IGdhaW47IH1cblxuXG4gICAgdmFyIGdldEZyZXF1ZW5jeSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIExvZ2FyaXRobSAoYmFzZSAyKSB0byBjb21wdXRlIGhvdyBtYW55IG9jdGF2ZXMgZmFsbCBpbiB0aGUgcmFuZ2UuXG4gICAgICAgIHZhciBudW1iZXJPZk9jdGF2ZXMgPSBNYXRoLmxvZyhtYXhGcmVxdWVuY3kgLyBtaW5GcmVxdWVuY3kpIC8gTWF0aC5MTjI7XG4gICAgICAgIC8vIENvbXB1dGUgYSBtdWx0aXBsaWVyIGZyb20gMCB0byAxIGJhc2VkIG9uIGFuIGV4cG9uZW50aWFsIHNjYWxlLlxuICAgICAgICB2YXIgbXVsdGlwbGllciA9IE1hdGgucG93KDIsIG51bWJlck9mT2N0YXZlcyAqICh2YWx1ZSAtIDEuMCkpO1xuICAgICAgICAvLyBHZXQgYmFjayB0byB0aGUgZnJlcXVlbmN5IHZhbHVlIGJldHdlZW4gbWluIGFuZCBtYXguXG4gICAgICAgIHJldHVybiBtYXhGcmVxdWVuY3kgKiBtdWx0aXBsaWVyO1xuICAgIH07XG5cbiAgICBub2RlLnVwZGF0ZSA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgZ2Fpbikge1xuICAgICAgICBpZihmcmVxdWVuY3kgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5mcmVxdWVuY3kudmFsdWUgPSBmcmVxdWVuY3k7XG4gICAgICAgIH1cbiAgICAgICAgaWYoZ2FpbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLmdhaW4udmFsdWUgPSBnYWluO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIG5vZGUuc2V0QnlQZXJjZW50ID0gZnVuY3Rpb24ocGVyY2VudCwgcXVhbGl0eSwgZ2Fpbikge1xuICAgICAgICAvLyBzZXQgZmlsdGVyIGZyZXF1ZW5jeSBiYXNlZCBvbiB2YWx1ZSBmcm9tIDAgdG8gMVxuICAgICAgICBub2RlLmZyZXF1ZW5jeS52YWx1ZSA9IGdldEZyZXF1ZW5jeShwZXJjZW50KTtcbiAgICAgICAgaWYocXVhbGl0eSAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuUS52YWx1ZSA9IHF1YWxpdHk7IH1cbiAgICAgICAgaWYoZ2FpbiAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuZ2Fpbi52YWx1ZSA9IGdhaW47IH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsdGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBNb25vRmxhbmdlcihjb250ZXh0LCBjb25maWcpIHtcbiAgICB2YXIgZmVlZGJhY2tHYWluID0gY29uZmlnLmZlZWRiYWNrIHx8IDAuNSxcbiAgICAgICAgZGVsYXlUaW1lID0gY29uZmlnLmRlbGF5IHx8IDAuMDA1LFxuICAgICAgICBsZm9HYWluID0gY29uZmlnLmdhaW4gfHwgMC4wMDIsXG4gICAgICAgIGxmb0ZyZXEgPSBjb25maWcuZnJlcXVlbmN5IHx8IDAuMjU7XG5cbiAgICB2YXIgaW5wdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgZGVsYXkgPSBjb250ZXh0LmNyZWF0ZURlbGF5KCk7XG4gICAgdmFyIGZlZWRiYWNrID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGxmbyA9IGNvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgIHZhciBnYWluID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgZGVsYXkuZGVsYXlUaW1lLnZhbHVlID0gZGVsYXlUaW1lOyAvLyA1LTI1bXMgZGVsYXkgKDAuMDA1ID4gMC4wMjUpXG4gICAgZmVlZGJhY2suZ2Fpbi52YWx1ZSA9IGZlZWRiYWNrR2FpbjsgLy8gMCA+IDFcblxuICAgIGxmby50eXBlID0gJ3NpbmUnO1xuICAgIGxmby5mcmVxdWVuY3kudmFsdWUgPSBsZm9GcmVxOyAvLyAwLjA1ID4gNVxuICAgIGdhaW4uZ2Fpbi52YWx1ZSA9IGxmb0dhaW47IC8vIDAuMDAwNSA+IDAuMDA1XG5cbiAgICBpbnB1dC5jb25uZWN0KG91dHB1dCk7XG4gICAgaW5wdXQuY29ubmVjdChkZWxheSk7XG4gICAgZGVsYXkuY29ubmVjdChvdXRwdXQpO1xuICAgIGRlbGF5LmNvbm5lY3QoZmVlZGJhY2spO1xuICAgIGZlZWRiYWNrLmNvbm5lY3QoaW5wdXQpO1xuXG4gICAgbGZvLmNvbm5lY3QoZ2Fpbik7XG4gICAgZ2Fpbi5jb25uZWN0KGRlbGF5LmRlbGF5VGltZSk7XG4gICAgbGZvLnN0YXJ0KCk7XG4gICAgXG4gICAgdmFyIG5vZGUgPSBpbnB1dDtcbiAgICBub2RlLm5hbWUgPSAnRmxhbmdlcic7XG4gICAgbm9kZS5fb3V0cHV0ID0gb3V0cHV0O1xuICAgIFxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBkZWxheS5kZWxheVRpbWUudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGxmb0ZyZXF1ZW5jeToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGxmby5mcmVxdWVuY3kudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGxmby5mcmVxdWVuY3kudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBsZm9HYWluOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZ2Fpbi5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBnYWluLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBmZWVkYmFjazoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGZlZWRiYWNrLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGZlZWRiYWNrLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gU3RlcmVvRmxhbmdlcihjb250ZXh0LCBjb25maWcpIHtcbiAgICB2YXIgZmVlZGJhY2tHYWluID0gY29uZmlnLmZlZWRiYWNrIHx8IDAuNSxcbiAgICAgICAgZGVsYXlUaW1lID0gY29uZmlnLmRlbGF5IHx8IDAuMDAzLFxuICAgICAgICBsZm9HYWluID0gY29uZmlnLmdhaW4gfHwgMC4wMDUsXG4gICAgICAgIGxmb0ZyZXEgPSBjb25maWcuZnJlcXVlbmN5IHx8IDAuNTtcblxuICAgIHZhciBpbnB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBzcGxpdHRlciA9IGNvbnRleHQuY3JlYXRlQ2hhbm5lbFNwbGl0dGVyKDIpO1xuICAgIHZhciBtZXJnZXIgPSBjb250ZXh0LmNyZWF0ZUNoYW5uZWxNZXJnZXIoMik7XG4gICAgdmFyIGZlZWRiYWNrTCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBmZWVkYmFja1IgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgbGZvID0gY29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgdmFyIGxmb0dhaW5MID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGxmb0dhaW5SID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGRlbGF5TCA9IGNvbnRleHQuY3JlYXRlRGVsYXkoKTtcbiAgICB2YXIgZGVsYXlSID0gY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIHZhciBvdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgIGZlZWRiYWNrTC5nYWluLnZhbHVlID0gZmVlZGJhY2tSLmdhaW4udmFsdWUgPSBmZWVkYmFja0dhaW47XG4gICAgZGVsYXlMLmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5Ui5kZWxheVRpbWUudmFsdWUgPSBkZWxheVRpbWU7XG5cbiAgICBsZm8udHlwZSA9ICdzaW5lJztcbiAgICBsZm8uZnJlcXVlbmN5LnZhbHVlID0gbGZvRnJlcTtcbiAgICBsZm9HYWluTC5nYWluLnZhbHVlID0gbGZvR2FpbjtcbiAgICBsZm9HYWluUi5nYWluLnZhbHVlID0gMCAtIGxmb0dhaW47XG5cbiAgICBpbnB1dC5jb25uZWN0KHNwbGl0dGVyKTtcbiAgICBcbiAgICBzcGxpdHRlci5jb25uZWN0KGRlbGF5TCwgMCk7XG4gICAgc3BsaXR0ZXIuY29ubmVjdChkZWxheVIsIDEpO1xuICAgIFxuICAgIGRlbGF5TC5jb25uZWN0KGZlZWRiYWNrTCk7XG4gICAgZGVsYXlSLmNvbm5lY3QoZmVlZGJhY2tSKTtcblxuICAgIGZlZWRiYWNrTC5jb25uZWN0KGRlbGF5Uik7XG4gICAgZmVlZGJhY2tSLmNvbm5lY3QoZGVsYXlMKTtcblxuICAgIGRlbGF5TC5jb25uZWN0KG1lcmdlciwgMCwgMCk7XG4gICAgZGVsYXlSLmNvbm5lY3QobWVyZ2VyLCAwLCAxKTtcblxuICAgIG1lcmdlci5jb25uZWN0KG91dHB1dCk7XG4gICAgaW5wdXQuY29ubmVjdChvdXRwdXQpO1xuXG4gICAgbGZvLmNvbm5lY3QobGZvR2FpbkwpO1xuICAgIGxmby5jb25uZWN0KGxmb0dhaW5SKTtcbiAgICBsZm9HYWluTC5jb25uZWN0KGRlbGF5TC5kZWxheVRpbWUpO1xuICAgIGxmb0dhaW5SLmNvbm5lY3QoZGVsYXlSLmRlbGF5VGltZSk7XG4gICAgbGZvLnN0YXJ0KCk7XG5cbiAgICB2YXIgbm9kZSA9IGlucHV0O1xuICAgIG5vZGUubmFtZSA9ICdTdGVyZW9GbGFuZ2VyJztcbiAgICBub2RlLl9vdXRwdXQgPSBvdXRwdXQ7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZGVsYXlMLmRlbGF5VGltZS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZGVsYXlMLmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5Ui5kZWxheVRpbWUudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBsZm9GcmVxdWVuY3k6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBsZm8uZnJlcXVlbmN5LnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBsZm8uZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgbGZvR2Fpbjoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGxmb0dhaW5MLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGxmb0dhaW5MLmdhaW4udmFsdWUgPSBsZm9HYWluUi5nYWluLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgZmVlZGJhY2s6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBmZWVkYmFja0wuZ2Fpbi52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZmVlZGJhY2tMLmdhaW4udmFsdWUgPSBmZWVkYmFja1IuZ2Fpbi52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIG5vZGUuX2Nvbm5lY3RlZCA9IGZ1bmN0aW9uKHRvKSB7XG4gICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIFsnZmxhbmdlciBjb25uZWN0ZWQgdG8nLCAodG8ubmFtZSB8fCB0by5jb25zdHJ1Y3Rvci5uYW1lKV0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gRmxhbmdlcihjb250ZXh0LCBjb25maWcpIHtcbiAgICBjb25maWcgPSBjb25maWcgfHwge307XG4gICAgcmV0dXJuIGNvbmZpZy5zdGVyZW8gPyBuZXcgU3RlcmVvRmxhbmdlcihjb250ZXh0LCBjb25maWcpIDogbmV3IE1vbm9GbGFuZ2VyKGNvbnRleHQsIGNvbmZpZyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmxhbmdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUGFubmVyKGNvbnRleHQpIHtcbiAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlUGFubmVyKCk7XG4gICAgLy8gRGVmYXVsdCBmb3Igc3RlcmVvIGlzICdIUlRGJyBjYW4gYWxzbyBiZSAnZXF1YWxwb3dlcidcbiAgICBub2RlLnBhbm5pbmdNb2RlbCA9IFBhbm5lci5kZWZhdWx0cy5wYW5uaW5nTW9kZWw7XG5cbiAgICAvLyBEaXN0YW5jZSBtb2RlbCBhbmQgYXR0cmlidXRlc1xuICAgIC8vIENhbiBiZSAnbGluZWFyJyAnaW52ZXJzZScgJ2V4cG9uZW50aWFsJ1xuICAgIG5vZGUuZGlzdGFuY2VNb2RlbCA9IFBhbm5lci5kZWZhdWx0cy5kaXN0YW5jZU1vZGVsO1xuICAgIG5vZGUucmVmRGlzdGFuY2UgPSBQYW5uZXIuZGVmYXVsdHMucmVmRGlzdGFuY2U7XG4gICAgbm9kZS5tYXhEaXN0YW5jZSA9IFBhbm5lci5kZWZhdWx0cy5tYXhEaXN0YW5jZTtcbiAgICBub2RlLnJvbGxvZmZGYWN0b3IgPSBQYW5uZXIuZGVmYXVsdHMucm9sbG9mZkZhY3RvcjtcbiAgICBub2RlLmNvbmVJbm5lckFuZ2xlID0gUGFubmVyLmRlZmF1bHRzLmNvbmVJbm5lckFuZ2xlO1xuICAgIG5vZGUuY29uZU91dGVyQW5nbGUgPSBQYW5uZXIuZGVmYXVsdHMuY29uZU91dGVyQW5nbGU7XG4gICAgbm9kZS5jb25lT3V0ZXJHYWluID0gUGFubmVyLmRlZmF1bHRzLmNvbmVPdXRlckdhaW47XG4gICAgXG4gICAgLy8gc2ltcGxlIHZlYzMgb2JqZWN0IHBvb2xcbiAgICB2YXIgVmVjUG9vbCA9IHtcbiAgICAgICAgcG9vbDogW10sXG4gICAgICAgIGdldDogZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICAgICAgdmFyIHYgPSB0aGlzLnBvb2wubGVuZ3RoID8gdGhpcy5wb29sLnBvcCgpIDogeyB4OiAwLCB5OiAwLCB6OiAwIH07XG4gICAgICAgICAgICAvLyBjaGVjayBpZiBhIHZlY3RvciBoYXMgYmVlbiBwYXNzZWQgaW5cbiAgICAgICAgICAgIGlmKHggIT09IHVuZGVmaW5lZCAmJiBpc05hTih4KSAmJiAneCcgaW4geCAmJiAneScgaW4geCAmJiAneicgaW4geCkge1xuICAgICAgICAgICAgICAgIHYueCA9IHgueCB8fCAwO1xuICAgICAgICAgICAgICAgIHYueSA9IHgueSB8fCAwO1xuICAgICAgICAgICAgICAgIHYueiA9IHgueiB8fCAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdi54ID0geCB8fCAwO1xuICAgICAgICAgICAgICAgIHYueSA9IHkgfHwgMDtcbiAgICAgICAgICAgICAgICB2LnogPSB6IHx8IDA7ICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH0sXG4gICAgICAgIGRpc3Bvc2U6IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLnBvb2wucHVzaChpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGdsb2JhbFVwID0gVmVjUG9vbC5nZXQoMCwgMSwgMCk7XG5cbiAgICB2YXIgc2V0T3JpZW50YXRpb24gPSBmdW5jdGlvbihub2RlLCBmdykge1xuICAgICAgICAvLyBzZXQgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBzb3VyY2UgKHdoZXJlIHRoZSBhdWRpbyBpcyBjb21pbmcgZnJvbSlcblxuICAgICAgICAvLyBjYWxjdWxhdGUgdXAgdmVjICggdXAgPSAoZm9yd2FyZCBjcm9zcyAoMCwgMSwgMCkpIGNyb3NzIGZvcndhcmQgKVxuICAgICAgICB2YXIgdXAgPSBWZWNQb29sLmdldChmdy54LCBmdy55LCBmdy56KTtcbiAgICAgICAgY3Jvc3ModXAsIGdsb2JhbFVwKTtcbiAgICAgICAgY3Jvc3ModXAsIGZ3KTtcbiAgICAgICAgbm9ybWFsaXplKHVwKTtcbiAgICAgICAgbm9ybWFsaXplKGZ3KTtcblxuICAgICAgICAvLyBzZXQgdGhlIGF1ZGlvIGNvbnRleHQncyBsaXN0ZW5lciBwb3NpdGlvbiB0byBtYXRjaCB0aGUgY2FtZXJhIHBvc2l0aW9uXG4gICAgICAgIG5vZGUuc2V0T3JpZW50YXRpb24oZncueCwgZncueSwgZncueiwgdXAueCwgdXAueSwgdXAueik7XG5cbiAgICAgICAgLy8gcmV0dXJuIHRoZSB2ZWNzIHRvIHRoZSBwb29sXG4gICAgICAgIFZlY1Bvb2wuZGlzcG9zZShmdyk7XG4gICAgICAgIFZlY1Bvb2wuZGlzcG9zZSh1cCk7XG4gICAgfTtcblxuICAgIHZhciBzZXRQb3NpdGlvbiA9IGZ1bmN0aW9uKG5vZGUsIHZlYykge1xuICAgICAgICBub2RlLnNldFBvc2l0aW9uKHZlYy54LCB2ZWMueSwgdmVjLnopO1xuICAgICAgICBWZWNQb29sLmRpc3Bvc2UodmVjKTtcbiAgICB9O1xuXG4gICAgdmFyIHNldFZlbG9jaXR5ID0gZnVuY3Rpb24obm9kZSwgdmVjKSB7XG4gICAgICAgIG5vZGUuc2V0VmVsb2NpdHkodmVjLngsIHZlYy55LCB2ZWMueik7XG4gICAgICAgIFZlY1Bvb2wuZGlzcG9zZSh2ZWMpO1xuICAgIH07XG5cbiAgICAvLyBjcm9zcyBwcm9kdWN0IG9mIDIgdmVjdG9yc1xuICAgIHZhciBjcm9zcyA9IGZ1bmN0aW9uICggYSwgYiApIHtcbiAgICAgICAgdmFyIGF4ID0gYS54LCBheSA9IGEueSwgYXogPSBhLno7XG4gICAgICAgIHZhciBieCA9IGIueCwgYnkgPSBiLnksIGJ6ID0gYi56O1xuICAgICAgICBhLnggPSBheSAqIGJ6IC0gYXogKiBieTtcbiAgICAgICAgYS55ID0gYXogKiBieCAtIGF4ICogYno7XG4gICAgICAgIGEueiA9IGF4ICogYnkgLSBheSAqIGJ4O1xuICAgIH07XG5cbiAgICAvLyBub3JtYWxpc2UgdG8gdW5pdCB2ZWN0b3JcbiAgICB2YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKHZlYzMpIHtcbiAgICAgICAgaWYodmVjMy54ID09PSAwICYmIHZlYzMueSA9PT0gMCAmJiB2ZWMzLnogPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB2ZWMzO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsZW5ndGggPSBNYXRoLnNxcnQoIHZlYzMueCAqIHZlYzMueCArIHZlYzMueSAqIHZlYzMueSArIHZlYzMueiAqIHZlYzMueiApO1xuICAgICAgICB2YXIgaW52U2NhbGFyID0gMSAvIGxlbmd0aDtcbiAgICAgICAgdmVjMy54ICo9IGludlNjYWxhcjtcbiAgICAgICAgdmVjMy55ICo9IGludlNjYWxhcjtcbiAgICAgICAgdmVjMy56ICo9IGludlNjYWxhcjtcbiAgICAgICAgcmV0dXJuIHZlYzM7XG4gICAgfTtcblxuICAgIC8vIHBhbiBsZWZ0IHRvIHJpZ2h0IHdpdGggdmFsdWUgZnJvbSAtMSB0byAxXG4gICAgLy8gY3JlYXRlcyBhIG5pY2UgY3VydmUgd2l0aCB6XG4gICAgbm9kZS5zZXRYID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdmFyIGRlZzQ1ID0gTWF0aC5QSSAvIDQsXG4gICAgICAgICAgICBkZWc5MCA9IGRlZzQ1ICogMixcbiAgICAgICAgICAgIHggPSB2YWx1ZSAqIGRlZzQ1LFxuICAgICAgICAgICAgeiA9IHggKyBkZWc5MDtcblxuICAgICAgICBpZiAoeiA+IGRlZzkwKSB7XG4gICAgICAgICAgICB6ID0gTWF0aC5QSSAtIHo7XG4gICAgICAgIH1cblxuICAgICAgICB4ID0gTWF0aC5zaW4oeCk7XG4gICAgICAgIHogPSBNYXRoLnNpbih6KTtcblxuICAgICAgICBub2RlLnNldFBvc2l0aW9uKHgsIDAsIHopO1xuICAgIH07XG5cbiAgICAvKnZhciB4ID0gMCxcbiAgICAgICAgeSA9IDAsXG4gICAgICAgIHogPSAwO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICAneCc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB4OyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHggPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBub2RlLnNldFBvc2l0aW9uKHgsIHksIHopO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7Ki9cblxuICAgIC8vIHNldCB0aGUgcG9zaXRpb24gdGhlIGF1ZGlvIGlzIGNvbWluZyBmcm9tKVxuICAgIG5vZGUuc2V0U291cmNlUG9zaXRpb24gPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldFBvc2l0aW9uKG5vZGUsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSBkaXJlY3Rpb24gdGhlIGF1ZGlvIGlzIGNvbWluZyBmcm9tKVxuICAgIG5vZGUuc2V0U291cmNlT3JpZW50YXRpb24gPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldE9yaWVudGF0aW9uKG5vZGUsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSB2ZWxvaWN0eSBvZiB0aGUgYXVkaW8gc291cmNlIChpZiBtb3ZpbmcpXG4gICAgbm9kZS5zZXRTb3VyY2VWZWxvY2l0eSA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0VmVsb2NpdHkobm9kZSwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHBvc2l0aW9uIG9mIHdobyBvciB3aGF0IGlzIGhlYXJpbmcgdGhlIGF1ZGlvIChjb3VsZCBiZSBjYW1lcmEgb3Igc29tZSBjaGFyYWN0ZXIpXG4gICAgbm9kZS5zZXRMaXN0ZW5lclBvc2l0aW9uID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRQb3NpdGlvbihjb250ZXh0Lmxpc3RlbmVyLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIHNldCB0aGUgcG9zaXRpb24gb2Ygd2hvIG9yIHdoYXQgaXMgaGVhcmluZyB0aGUgYXVkaW8gKGNvdWxkIGJlIGNhbWVyYSBvciBzb21lIGNoYXJhY3RlcilcbiAgICBub2RlLnNldExpc3RlbmVyT3JpZW50YXRpb24gPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldE9yaWVudGF0aW9uKGNvbnRleHQubGlzdGVuZXIsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSB2ZWxvY2l0eSAoaWYgbW92aW5nKSBvZiB3aG8gb3Igd2hhdCBpcyBoZWFyaW5nIHRoZSBhdWRpbyAoY291bGQgYmUgY2FtZXJhIG9yIHNvbWUgY2hhcmFjdGVyKVxuICAgIG5vZGUuc2V0TGlzdGVuZXJWZWxvY2l0eSA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0VmVsb2NpdHkoY29udGV4dC5saXN0ZW5lciwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBoZWxwZXIgdG8gY2FsY3VsYXRlIHZlbG9jaXR5XG4gICAgbm9kZS5jYWxjdWxhdGVWZWxvY2l0eSA9IGZ1bmN0aW9uKGN1cnJlbnRQb3NpdGlvbiwgbGFzdFBvc2l0aW9uLCBkZWx0YVRpbWUpIHtcbiAgICAgICAgdmFyIGR4ID0gY3VycmVudFBvc2l0aW9uLnggLSBsYXN0UG9zaXRpb24ueDtcbiAgICAgICAgdmFyIGR5ID0gY3VycmVudFBvc2l0aW9uLnkgLSBsYXN0UG9zaXRpb24ueTtcbiAgICAgICAgdmFyIGR6ID0gY3VycmVudFBvc2l0aW9uLnogLSBsYXN0UG9zaXRpb24uejtcbiAgICAgICAgcmV0dXJuIFZlY1Bvb2wuZ2V0KGR4IC8gZGVsdGFUaW1lLCBkeSAvIGRlbHRhVGltZSwgZHogLyBkZWx0YVRpbWUpO1xuICAgIH07XG5cbiAgICBub2RlLnNldERlZmF1bHRzID0gZnVuY3Rpb24oZGVmYXVsdHMpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoZGVmYXVsdHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICBQYW5uZXIuZGVmYXVsdHNba2V5XSA9IGRlZmF1bHRzW2tleV07XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxuUGFubmVyLmRlZmF1bHRzID0ge1xuICAgIHBhbm5pbmdNb2RlbDogJ0hSVEYnLFxuICAgIGRpc3RhbmNlTW9kZWw6ICdsaW5lYXInLFxuICAgIHJlZkRpc3RhbmNlOiAxLFxuICAgIG1heERpc3RhbmNlOiAxMDAwLFxuICAgIHJvbGxvZmZGYWN0b3I6IDEsXG4gICAgY29uZUlubmVyQW5nbGU6IDM2MCxcbiAgICBjb25lT3V0ZXJBbmdsZTogMCxcbiAgICBjb25lT3V0ZXJHYWluOiAwXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhbm5lcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUGhhc2VyKGNvbnRleHQsIGNvbmZpZykge1xuICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgICB2YXIgc3RhZ2VzID0gY29uZmlnLnN0YWdlcyB8fCA4LFxuICAgICAgICBsZm9GcmVxdWVuY3kgPSBjb25maWcuZnJlcXVlbmN5IHx8IDAuNSxcbiAgICAgICAgbGZvR2FpblZhbHVlID0gY29uZmlnLmdhaW4gfHwgMzAwLFxuICAgICAgICBmZWVkYmFja0dhaW4gPSBjb25maWcuZmVlZGJhY2sgfHwgMC41LFxuICAgICAgICBmaWx0ZXJzID0gW10sXG4gICAgICAgIGZpbHRlcjtcblxuICAgIHZhciBpbnB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBmZWVkYmFjayA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBsZm8gPSBjb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICB2YXIgbGZvR2FpbiA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBvdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgIGZlZWRiYWNrLmdhaW4udmFsdWUgPSBmZWVkYmFja0dhaW47XG5cbiAgICBsZm8udHlwZSA9ICdzaW5lJztcbiAgICBsZm8uZnJlcXVlbmN5LnZhbHVlID0gbGZvRnJlcXVlbmN5O1xuICAgIGxmb0dhaW4uZ2Fpbi52YWx1ZSA9IGxmb0dhaW5WYWx1ZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhZ2VzOyBpKyspIHtcbiAgICAgICAgZmlsdGVyID0gY29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICAgICAgZmlsdGVyLnR5cGUgPSAnYWxscGFzcyc7XG4gICAgICAgIGZpbHRlci5mcmVxdWVuY3kudmFsdWUgPSAxMDAwICogaTtcbiAgICAgICAgLy9maWx0ZXIuUS52YWx1ZSA9IDEwO1xuICAgICAgICBpZihpID4gMCkge1xuICAgICAgICAgICAgZmlsdGVyc1tpLTFdLmNvbm5lY3QoZmlsdGVyKTtcbiAgICAgICAgfVxuICAgICAgICBsZm9HYWluLmNvbm5lY3QoZmlsdGVyLmZyZXF1ZW5jeSk7XG5cbiAgICAgICAgZmlsdGVycy5wdXNoKGZpbHRlcik7XG4gICAgfVxuXG4gICAgdmFyIGZpcnN0ID0gZmlsdGVyc1swXTtcbiAgICB2YXIgbGFzdCA9IGZpbHRlcnNbZmlsdGVycy5sZW5ndGggLSAxXTtcblxuICAgIGlucHV0LmNvbm5lY3QoZmlyc3QpO1xuICAgIGlucHV0LmNvbm5lY3Qob3V0cHV0KTtcbiAgICBsYXN0LmNvbm5lY3Qob3V0cHV0KTtcbiAgICBsYXN0LmNvbm5lY3QoZmVlZGJhY2spO1xuICAgIGZlZWRiYWNrLmNvbm5lY3QoZmlyc3QpO1xuICAgIGxmby5jb25uZWN0KGxmb0dhaW4pO1xuICAgIGxmby5zdGFydCgpO1xuXG4gICAgdmFyIG5vZGUgPSBpbnB1dDtcbiAgICBub2RlLm5hbWUgPSAnUGhhc2VyJztcbiAgICBub2RlLl9vdXRwdXQgPSBvdXRwdXQ7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgIGxmb0ZyZXF1ZW5jeToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGxmby5mcmVxdWVuY3kudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGxmby5mcmVxdWVuY3kudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBsZm9HYWluOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbGZvR2Fpbi5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBsZm9HYWluLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBmZWVkYmFjazoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGZlZWRiYWNrLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGZlZWRiYWNrLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBub2RlLl9jb25uZWN0ZWQgPSBmdW5jdGlvbih0bykge1xuICAgICAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBbJ3BoYXNlciBjb25uZWN0ZWQgdG8nLCAodG8ubmFtZSB8fCB0by5jb25zdHJ1Y3Rvci5uYW1lKV0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQaGFzZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFJlY29yZGVyKGNvbnRleHQsIHBhc3NUaHJvdWdoKSB7XG4gICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3Nvcig0MDk2LCAyLCAyKSxcbiAgICAgICAgYnVmZmVyc0wgPSBbXSxcbiAgICAgICAgYnVmZmVyc1IgPSBbXSxcbiAgICAgICAgc3RhcnRlZEF0ID0gMCxcbiAgICAgICAgc3RvcHBlZEF0ID0gMDtcblxuICAgIGlmKHBhc3NUaHJvdWdoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcGFzc1Rocm91Z2ggPSB0cnVlO1xuICAgIH1cblxuICAgIG5vZGUuaXNSZWNvcmRpbmcgPSBmYWxzZTtcblxuICAgIHZhciBnZXRCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGJ1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGJ1ZmZlcnNMLmxlbmd0aCwgY29udGV4dC5zYW1wbGVSYXRlKTtcbiAgICAgICAgYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChidWZmZXJzTCk7XG4gICAgICAgIGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyc1IpO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH07XG5cbiAgICBub2RlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGJ1ZmZlcnNMLmxlbmd0aCA9IDA7XG4gICAgICAgIGJ1ZmZlcnNSLmxlbmd0aCA9IDA7XG4gICAgICAgIHN0YXJ0ZWRBdCA9IGNvbnRleHQuY3VycmVudFRpbWU7XG4gICAgICAgIHN0b3BwZWRBdCA9IDA7XG4gICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSB0cnVlO1xuICAgIH07XG5cbiAgICBub2RlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RvcHBlZEF0ID0gY29udGV4dC5jdXJyZW50VGltZTtcbiAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gZ2V0QnVmZmVyKCk7XG4gICAgfTtcblxuICAgIG5vZGUuZ2V0RHVyYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuaXNSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBzdG9wcGVkQXQgLSBzdGFydGVkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnRleHQuY3VycmVudFRpbWUgLSBzdGFydGVkQXQ7XG4gICAgfTtcblxuICAgIG5vZGUub25hdWRpb3Byb2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIGlucHV0TCA9IGV2ZW50LmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApLFxuICAgICAgICAgICAgaW5wdXRSID0gZXZlbnQuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCksXG4gICAgICAgICAgICBvdXRwdXRMID0gZXZlbnQub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApLFxuICAgICAgICAgICAgb3V0cHV0UiA9IGV2ZW50Lm91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcblxuICAgICAgICBpZihwYXNzVGhyb3VnaCkge1xuICAgICAgICAgICAgb3V0cHV0TC5zZXQoaW5wdXRMKTtcbiAgICAgICAgICAgIG91dHB1dFIuc2V0KGlucHV0Uik7XG4gICAgICAgIH1cblxuICAgICAgICBpZih0aGlzLmlzUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlucHV0TC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnNMLnB1c2goaW5wdXRMW2ldKTtcbiAgICAgICAgICAgICAgICBidWZmZXJzUi5wdXNoKGlucHV0UltpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbm9kZS5fY29ubmVjdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmVjb3JkZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFJldmVyYihjb250ZXh0LCB0aW1lLCBkZWNheSwgcmV2ZXJzZSkge1xuICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVDb252b2x2ZXIoKTtcblxuICAgIG5vZGUudXBkYXRlID0gZnVuY3Rpb24odGltZSwgZGVjYXksIHJldmVyc2UpIHtcbiAgICAgICAgdGltZSA9IHRpbWUgfHwgMTtcbiAgICAgICAgZGVjYXkgPSBkZWNheSB8fCA1O1xuICAgICAgICByZXZlcnNlID0gISFyZXZlcnNlO1xuXG4gICAgICAgIHZhciBudW1DaGFubmVscyA9IDIsXG4gICAgICAgICAgICByYXRlID0gY29udGV4dC5zYW1wbGVSYXRlLFxuICAgICAgICAgICAgbGVuZ3RoID0gcmF0ZSAqIHRpbWUsXG4gICAgICAgICAgICBpbXB1bHNlUmVzcG9uc2UgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcihudW1DaGFubmVscywgbGVuZ3RoLCByYXRlKSxcbiAgICAgICAgICAgIGxlZnQgPSBpbXB1bHNlUmVzcG9uc2UuZ2V0Q2hhbm5lbERhdGEoMCksXG4gICAgICAgICAgICByaWdodCA9IGltcHVsc2VSZXNwb25zZS5nZXRDaGFubmVsRGF0YSgxKSxcbiAgICAgICAgICAgIG4sIGU7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbiA9IHJldmVyc2UgPyBsZW5ndGggLSAxIDogaTtcbiAgICAgICAgICAgIGUgPSBNYXRoLnBvdygxIC0gbiAvIGxlbmd0aCwgZGVjYXkpO1xuICAgICAgICAgICAgbGVmdFtpXSA9IChNYXRoLnJhbmRvbSgpICogMiAtIDEpICogZTtcbiAgICAgICAgICAgIHJpZ2h0W2ldID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5idWZmZXIgPSBpbXB1bHNlUmVzcG9uc2U7XG4gICAgfTtcblxuICAgIG5vZGUudXBkYXRlKHRpbWUsIGRlY2F5LCByZXZlcnNlKTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJldmVyYjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEJ1ZmZlclNvdXJjZSA9IHJlcXVpcmUoJy4vc291cmNlL2J1ZmZlci1zb3VyY2UuanMnKSxcbiAgICBNZWRpYVNvdXJjZSA9IHJlcXVpcmUoJy4vc291cmNlL21lZGlhLXNvdXJjZS5qcycpLFxuICAgIE1pY3JvcGhvbmVTb3VyY2UgPSByZXF1aXJlKCcuL3NvdXJjZS9taWNyb3Bob25lLXNvdXJjZS5qcycpLFxuICAgIE5vZGVNYW5hZ2VyID0gcmVxdWlyZSgnLi9ub2RlLW1hbmFnZXIuanMnKSxcbiAgICBPc2NpbGxhdG9yU291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2Uvb3NjaWxsYXRvci1zb3VyY2UuanMnKSxcbiAgICBTY3JpcHRTb3VyY2UgPSByZXF1aXJlKCcuL3NvdXJjZS9zY3JpcHQtc291cmNlLmpzJyksXG4gICAgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbmZ1bmN0aW9uIFNvdW5kKGNvbnRleHQsIGRlc3RpbmF0aW9uKSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2RhdGEgPSBudWxsO1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX2xvb3AgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheVdoZW5SZWFkeSA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcblxuICAgIHRoaXMuX25vZGUgPSBuZXcgTm9kZU1hbmFnZXIodGhpcy5fY29udGV4dCk7XG4gICAgdGhpcy5fZ2FpbiA9IHRoaXMuX25vZGUuZ2FpbigpO1xuICAgIGlmKHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fbm9kZS5zZXREZXN0aW5hdGlvbih0aGlzLl9nYWluKTtcbiAgICAgICAgdGhpcy5fZ2Fpbi5jb25uZWN0KGRlc3RpbmF0aW9uIHx8IHRoaXMuX2NvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIH1cbn1cblxuU291bmQucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgaWYoIWRhdGEpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB0aGlzLl9kYXRhID0gZGF0YTsgLy8gQXVkaW9CdWZmZXIsIE1lZGlhRWxlbWVudCwgZXRjXG5cbiAgICBpZihVdGlscy5pc0F1ZGlvQnVmZmVyKGRhdGEpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBCdWZmZXJTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2UgaWYoVXRpbHMuaXNNZWRpYUVsZW1lbnQoZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IE1lZGlhU291cmNlKGRhdGEsIHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbiAgICBlbHNlIGlmKFV0aWxzLmlzTWVkaWFTdHJlYW0oZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IE1pY3JvcGhvbmVTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2UgaWYoVXRpbHMuaXNPc2NpbGxhdG9yVHlwZShkYXRhKSkge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgT3NjaWxsYXRvclNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZihVdGlscy5pc1NjcmlwdENvbmZpZyhkYXRhKSkge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgU2NyaXB0U291cmNlKGRhdGEsIHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZGV0ZWN0IGRhdGEgdHlwZTogJyArIGRhdGEpO1xuICAgIH1cblxuICAgIHRoaXMuX25vZGUuc2V0U291cmNlKHRoaXMuX3NvdXJjZS5zb3VyY2VOb2RlKTtcblxuICAgIGlmKHR5cGVvZiB0aGlzLl9zb3VyY2Uub25FbmRlZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9zb3VyY2Uub25FbmRlZCh0aGlzLl9lbmRlZEhhbmRsZXIsIHRoaXMpO1xuICAgIH1cblxuICAgIC8vIHNob3VsZCB0aGlzIHRha2UgYWNjb3VudCBvZiBkZWxheSBhbmQgb2Zmc2V0P1xuICAgIGlmKHRoaXMuX3BsYXlXaGVuUmVhZHkpIHtcbiAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuU291bmQucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSwgb2Zmc2V0KSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkge1xuICAgICAgICB0aGlzLl9wbGF5V2hlblJlYWR5ID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHRoaXMuX25vZGUuc2V0U291cmNlKHRoaXMuX3NvdXJjZS5zb3VyY2VOb2RlKTtcbiAgICB0aGlzLl9zb3VyY2UubG9vcCA9IHRoaXMuX2xvb3A7XG5cbiAgICAvLyB1cGRhdGUgdm9sdW1lIG5lZWRlZCBmb3Igbm8gd2ViYXVkaW9cbiAgICBpZighdGhpcy5fY29udGV4dCkgeyB0aGlzLnZvbHVtZSA9IHRoaXMudm9sdW1lOyB9XG5cbiAgICB0aGlzLl9zb3VyY2UucGxheShkZWxheSwgb2Zmc2V0KTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuU291bmQucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuX3NvdXJjZS5wYXVzZSgpO1xuICAgIHJldHVybiB0aGlzOyAgXG59O1xuXG5Tb3VuZC5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2UpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB0aGlzLl9zb3VyY2Uuc3RvcCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuU291bmQucHJvdG90eXBlLnNlZWsgPSBmdW5jdGlvbihwZXJjZW50KSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMucGxheSgwLCB0aGlzLl9zb3VyY2UuZHVyYXRpb24gKiBwZXJjZW50KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gKiBFbmRlZCBoYW5kbGVyXG4gKi9cblxuU291bmQucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUuX2VuZGVkSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHR5cGVvZiB0aGlzLl9lbmRlZENhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sodGhpcyk7XG4gICAgfVxufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2NvbnRleHQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdjdXJyZW50VGltZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmN1cnJlbnRUaW1lIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2RhdGEnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RhdGE7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmR1cmF0aW9uIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2VuZGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuZW5kZWQgOiBmYWxzZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2dhaW4nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dhaW47XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdsb29wJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9sb29wID0gISF2YWx1ZTtcbiAgICAgICAgaWYodGhpcy5fc291cmNlKSB7XG4gICAgICAgICAgdGhpcy5fc291cmNlLmxvb3AgPSB0aGlzLl9sb29wO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdub2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAncGF1c2VkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UucGF1c2VkIDogZmFsc2U7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UucGxheWluZyA6IGZhbHNlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wcm9ncmVzcyA6IDA7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAndm9sdW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9nYWluLmdhaW4udmFsdWU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmKGlzTmFOKHZhbHVlKSkgeyByZXR1cm47IH1cblxuICAgICAgICB0aGlzLl9nYWluLmdhaW4udmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICBpZih0aGlzLl9kYXRhICYmIHRoaXMuX2RhdGEudm9sdW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEudm9sdW1lID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuLy8gZm9yIG9zY2lsbGF0b3JcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2ZyZXF1ZW5jeScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmZyZXF1ZW5jeSA6IDA7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmKHRoaXMuX3NvdXJjZSkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlLmZyZXF1ZW5jeSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gU291bmQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEJ1ZmZlclNvdXJjZShidWZmZXIsIGNvbnRleHQpIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fYnVmZmVyID0gYnVmZmVyOyAvLyBBcnJheUJ1ZmZlclxuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5fbG9vcCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIEJ1ZmZlclNvdXJjZU5vZGVcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufVxuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSwgb2Zmc2V0KSB7XG4gICAgaWYodGhpcy5fcGxheWluZykgeyByZXR1cm47IH1cbiAgICBpZihkZWxheSA9PT0gdW5kZWZpbmVkKSB7IGRlbGF5ID0gMDsgfVxuICAgIGlmKGRlbGF5ID4gMCkgeyBkZWxheSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkZWxheTsgfVxuXG4gICAgaWYob2Zmc2V0ID09PSB1bmRlZmluZWQpIHsgb2Zmc2V0ID0gMDsgfVxuICAgIGlmKG9mZnNldCA+IDApIHsgdGhpcy5fcGF1c2VkQXQgPSAwOyB9XG4gICAgaWYodGhpcy5fcGF1c2VkQXQgPiAwKSB7IG9mZnNldCA9IHRoaXMuX3BhdXNlZEF0OyB9XG4gICAgXG4gICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgWycxIG9mZnNldDonLCBvZmZzZXRdKTtcbiAgICB3aGlsZShvZmZzZXQgPiB0aGlzLmR1cmF0aW9uKSB7IG9mZnNldCA9IG9mZnNldCAlIHRoaXMuZHVyYXRpb247IH1cbiAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBbJzIgb2Zmc2V0OicsIG9mZnNldF0pO1xuXG4gICAgdGhpcy5zb3VyY2VOb2RlLmxvb3AgPSB0aGlzLl9sb29wO1xuICAgIHRoaXMuc291cmNlTm9kZS5vbmVuZGVkID0gdGhpcy5fZW5kZWRIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgdGhpcy5zb3VyY2VOb2RlLnN0YXJ0KGRlbGF5LCBvZmZzZXQpO1xuXG4gICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3BhdXNlZEF0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIG9mZnNldDtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcbn07XG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxhcHNlZCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSBlbGFwc2VkO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSB0cnVlO1xufTtcblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLm9uZW5kZWQgPSBudWxsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLnN0b3AoMCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG59O1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLl9lbmRlZEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgaWYodHlwZW9mIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayh0aGlzKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYodGhpcy5fc3RhcnRlZEF0KSB7XG4gICAgICAgICAgICB2YXIgdGltZSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgICAgICAgICBpZih0aW1lID4gdGhpcy5kdXJhdGlvbikge1xuICAgICAgICAgICAgICAgIHRpbWUgPSB0aW1lICUgdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aW1lO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9idWZmZXIgPyB0aGlzLl9idWZmZXIuZHVyYXRpb24gOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2VuZGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmRlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdsb29wJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9sb29wID0gISF2YWx1ZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3Byb2dyZXNzJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLm1pbih0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbiwgMSk7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3NvdXJjZU5vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5idWZmZXIgPSB0aGlzLl9idWZmZXI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQnVmZmVyU291cmNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBNZWRpYVNvdXJjZShlbCwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbCA9IGVsOyAvLyBIVE1MTWVkaWFFbGVtZW50XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9lbmRlZEhhbmRsZXJCb3VuZCA9IHRoaXMuX2VuZGVkSGFuZGxlci5iaW5kKHRoaXMpO1xuICAgIHRoaXMuX2xvb3AgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIE1lZGlhRWxlbWVudFNvdXJjZU5vZGVcbn1cblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuTWVkaWFTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSwgb2Zmc2V0KSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2RlbGF5VGltZW91dCk7XG5cbiAgICB0aGlzLnZvbHVtZSA9IHRoaXMuX3ZvbHVtZTtcblxuICAgIGlmKG9mZnNldCkge1xuICAgICAgICB0aGlzLl9lbC5jdXJyZW50VGltZSA9IG9mZnNldDtcbiAgICB9XG5cbiAgICBpZihkZWxheSkge1xuICAgICAgICB0aGlzLl9kZWxheVRpbWVvdXQgPSBzZXRUaW1lb3V0KHRoaXMucGxheS5iaW5kKHRoaXMpLCBkZWxheSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9lbC5wbGF5KCk7XG4gICAgfVxuXG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcblxuICAgIHRoaXMuX2VsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQpO1xuICAgIHRoaXMuX2VsLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQsIGZhbHNlKTtcbn07XG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9kZWxheVRpbWVvdXQpO1xuXG4gICAgaWYoIXRoaXMuX2VsKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5fZWwucGF1c2UoKTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2RlbGF5VGltZW91dCk7XG5cbiAgICBpZighdGhpcy5fZWwpIHsgcmV0dXJuOyB9XG5cbiAgICB0aGlzLl9lbC5wYXVzZSgpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgdGhpcy5fZWwuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICAvLyBmaXhlcyBidWcgd2hlcmUgc2VydmVyIGRvZXNuJ3Qgc3VwcG9ydCBzZWVrOlxuICAgICAgICBpZih0aGlzLl9lbC5jdXJyZW50VGltZSA+IDApIHsgdGhpcy5fZWwubG9hZCgpOyB9ICAgIFxuICAgIH0gY2F0Y2goZSkge31cblxuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbn07XG5cbi8qXG4gKiBFbmRlZCBoYW5kbGVyXG4gKi9cblxuTWVkaWFTb3VyY2UucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG59O1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUuX2VuZGVkSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG5cbiAgICBpZih0aGlzLl9sb29wKSB7XG4gICAgICAgIHRoaXMuX2VsLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgLy8gZml4ZXMgYnVnIHdoZXJlIHNlcnZlciBkb2Vzbid0IHN1cHBvcnQgc2VlazpcbiAgICAgICAgaWYodGhpcy5fZWwuY3VycmVudFRpbWUgPiAwKSB7IHRoaXMuX2VsLmxvYWQoKTsgfVxuICAgICAgICB0aGlzLnBsYXkoKTtcbiAgICB9IGVsc2UgaWYodHlwZW9mIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayh0aGlzKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsID8gdGhpcy5fZWwuY3VycmVudFRpbWUgOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAnZHVyYXRpb24nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VsID8gdGhpcy5fZWwuZHVyYXRpb24gOiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAnZW5kZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAnbG9vcCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbG9vcDtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy5fbG9vcCA9IHZhbHVlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAncGF1c2VkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAnc291cmNlTm9kZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fc291cmNlTm9kZSAmJiB0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UodGhpcy5fZWwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1lZGlhU291cmNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBNaWNyb3Bob25lU291cmNlKHN0cmVhbSwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIE1pY3JvcGhvbmVTb3VyY2VOb2RlXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbiAgICB0aGlzLl9zdHJlYW0gPSBzdHJlYW07XG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbk1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSkge1xuICAgIGlmKGRlbGF5ID09PSB1bmRlZmluZWQpIHsgZGVsYXkgPSAwOyB9XG4gICAgaWYoZGVsYXkgPiAwKSB7IGRlbGF5ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGRlbGF5OyB9XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUuc3RhcnQoZGVsYXkpO1xuXG4gICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3BhdXNlZEF0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZTtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbn07XG5cbk1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gZWxhcHNlZDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbk1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLnN0b3AoMCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdjdXJyZW50VGltZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZEF0O1xuICAgICAgICB9XG4gICAgICAgIGlmKHRoaXMuX3N0YXJ0ZWRBdCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNaWNyb3Bob25lU291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdlbmRlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW5kZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNaWNyb3Bob25lU291cmNlLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdwcm9ncmVzcycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gMDtcbiAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNaWNyb3Bob25lU291cmNlLnByb3RvdHlwZSwgJ3NvdXJjZU5vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKHRoaXMuX3N0cmVhbSk7XG4gICAgICAgICAgICAvLyBIQUNLOiBzdG9wcyBtb3ogZ2FyYmFnZSBjb2xsZWN0aW9uIGtpbGxpbmcgdGhlIHN0cmVhbVxuICAgICAgICAgICAgLy8gc2VlIGh0dHBzOi8vc3VwcG9ydC5tb3ppbGxhLm9yZy9lbi1VUy9xdWVzdGlvbnMvOTg0MTc5XG4gICAgICAgICAgICBpZihuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhKSB7XG4gICAgICAgICAgICAgICAgd2luZG93Lm1vekhhY2sgPSB0aGlzLl9zb3VyY2VOb2RlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1pY3JvcGhvbmVTb3VyY2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE9zY2lsbGF0b3JTb3VyY2UodHlwZSwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIE9zY2lsbGF0b3JTb3VyY2VOb2RlXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbiAgICB0aGlzLl90eXBlID0gdHlwZTtcbiAgICB0aGlzLl9mcmVxdWVuY3kgPSAyMDA7XG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSkge1xuICAgIGlmKGRlbGF5ID09PSB1bmRlZmluZWQpIHsgZGVsYXkgPSAwOyB9XG4gICAgaWYoZGVsYXkgPiAwKSB7IGRlbGF5ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGRlbGF5OyB9XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUuc3RhcnQoZGVsYXkpO1xuXG4gICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3BhdXNlZEF0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZTtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbn07XG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gZWxhcHNlZDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLnN0b3AoMCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdmcmVxdWVuY3knLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZyZXF1ZW5jeTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy5fZnJlcXVlbmN5ID0gdmFsdWU7XG4gICAgICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCAnZW5kZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCAncGxheWluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGxheWluZztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdzb3VyY2VOb2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlICYmIHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUudHlwZSA9IHRoaXMuX3R5cGU7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLmZyZXF1ZW5jeS52YWx1ZSA9IHRoaXMuX2ZyZXF1ZW5jeTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBPc2NpbGxhdG9yU291cmNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTY3JpcHRTb3VyY2UoZGF0YSwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9idWZmZXJTaXplID0gZGF0YS5idWZmZXJTaXplIHx8IDEwMjQ7XG4gICAgdGhpcy5fY2hhbm5lbHMgPSBkYXRhLmNoYW5uZWxzIHx8IDE7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9vblByb2Nlc3MgPSBkYXRhLmNhbGxiYWNrLmJpbmQoZGF0YS50aGlzQXJnIHx8IHRoaXMpO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIFNjcmlwdFNvdXJjZU5vZGVcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufVxuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5TY3JpcHRTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSkge1xuICAgIGlmKGRlbGF5ID09PSB1bmRlZmluZWQpIHsgZGVsYXkgPSAwOyB9XG4gICAgaWYoZGVsYXkgPiAwKSB7IGRlbGF5ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGRlbGF5OyB9XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUub25hdWRpb3Byb2Nlc3MgPSB0aGlzLl9vblByb2Nlc3M7XG5cbiAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fcGF1c2VkQXQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xufTtcblxuU2NyaXB0U291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IGVsYXBzZWQ7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5TY3JpcHRTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUub25hdWRpb3Byb2Nlc3MgPSB0aGlzLl9vblBhdXNlZDtcbiAgICB9XG4gICAgdGhpcy5fZW5kZWQgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn07XG5cblNjcmlwdFNvdXJjZS5wcm90b3R5cGUuX29uUGF1c2VkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB2YXIgYnVmZmVyID0gZXZlbnQub3V0cHV0QnVmZmVyO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSk7XG4gICAgICAgIGZvciAodmFyIGogPSAwLCBsZW4gPSBjaGFubmVsLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgICBjaGFubmVsW2pdID0gMDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTY3JpcHRTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ2VuZGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmRlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ3Byb2dyZXNzJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAwO1xuICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdzb3VyY2VOb2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IodGhpcy5fYnVmZmVyU2l6ZSwgMCwgdGhpcy5fY2hhbm5lbHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjcmlwdFNvdXJjZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU3VwcG9ydCgpIHtcbiAgICB2YXIgZXh0ZW5zaW9ucyA9IFtdLFxuICAgICAgICBjYW5QbGF5ID0ge30sXG4gICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcblxuICAgIGlmKCFlbCkgeyByZXR1cm47IH1cblxuICAgIHZhciB0ZXN0cyA9IFtcbiAgICAgICAgeyBleHQ6ICdvZ2cnLCB0eXBlOiAnYXVkaW8vb2dnOyBjb2RlY3M9XCJ2b3JiaXNcIicgfSxcbiAgICAgICAgeyBleHQ6ICdtcDMnLCB0eXBlOiAnYXVkaW8vbXBlZzsnIH0sXG4gICAgICAgIHsgZXh0OiAnb3B1cycsIHR5cGU6ICdhdWRpby9vZ2c7IGNvZGVjcz1cIm9wdXNcIicgfSxcbiAgICAgICAgeyBleHQ6ICd3YXYnLCB0eXBlOiAnYXVkaW8vd2F2OyBjb2RlY3M9XCIxXCInIH0sXG4gICAgICAgIHsgZXh0OiAnbTRhJywgdHlwZTogJ2F1ZGlvL3gtbTRhOycgfSxcbiAgICAgICAgeyBleHQ6ICdtNGEnLCB0eXBlOiAnYXVkaW8vYWFjOycgfVxuICAgIF07XG5cbiAgICB0ZXN0cy5mb3JFYWNoKGZ1bmN0aW9uKHRlc3QpIHtcbiAgICAgICAgdmFyIGNhblBsYXlUeXBlID0gISFlbC5jYW5QbGF5VHlwZSh0ZXN0LnR5cGUpO1xuICAgICAgICBpZihjYW5QbGF5VHlwZSkge1xuICAgICAgICAgICAgZXh0ZW5zaW9ucy5wdXNoKHRlc3QuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBjYW5QbGF5W3Rlc3QuZXh0XSA9IGNhblBsYXlUeXBlO1xuICAgIH0pO1xuXG4gICAgdmFyIGdldEZpbGVFeHRlbnNpb24gPSBmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgdXJsID0gdXJsLnNwbGl0KCc/JylbMF07XG4gICAgICAgIHVybCA9IHVybC5zdWJzdHIodXJsLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcblxuICAgICAgICB2YXIgYSA9IHVybC5zcGxpdCgnLicpO1xuICAgICAgICBpZihhLmxlbmd0aCA9PT0gMSB8fCAoYVswXSA9PT0gJycgJiYgYS5sZW5ndGggPT09IDIpKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGEucG9wKCkudG9Mb3dlckNhc2UoKTtcbiAgICB9O1xuXG4gICAgdmFyIGdldFN1cHBvcnRlZEZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZXMpIHtcbiAgICAgICAgdmFyIG5hbWU7XG5cbiAgICAgICAgaWYoQXJyYXkuaXNBcnJheShmaWxlTmFtZXMpKSB7XG4gICAgICAgICAgICAvLyBpZiBhcnJheSBnZXQgdGhlIGZpcnN0IG9uZSB0aGF0IHdvcmtzXG4gICAgICAgICAgICBmaWxlTmFtZXMuc29tZShmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgdmFyIGV4dCA9IGdldEZpbGVFeHRlbnNpb24oaXRlbSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dGVuc2lvbnMuaW5kZXhPZihleHQpID4gLTE7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHR5cGVvZiBmaWxlTmFtZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBpZiBub3QgYXJyYXkgYW5kIGlzIG9iamVjdFxuICAgICAgICAgICAgT2JqZWN0LmtleXMoZmlsZU5hbWVzKS5zb21lKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBmaWxlTmFtZXNba2V5XTtcbiAgICAgICAgICAgICAgICB2YXIgZXh0ID0gZ2V0RmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0ZW5zaW9ucy5pbmRleE9mKGV4dCkgPiAtMTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIHN0cmluZyBqdXN0IHJldHVyblxuICAgICAgICByZXR1cm4gbmFtZSB8fCBmaWxlTmFtZXM7XG4gICAgfTtcblxuICAgIHZhciBjb250YWluc1VSTCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICBpZighY29uZmlnKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAvLyBzdHJpbmcsIGFycmF5IG9yIG9iamVjdCB3aXRoIHVybCBwcm9wZXJ0eSB0aGF0IGlzIHN0cmluZyBvciBhcnJheVxuICAgICAgICB2YXIgdXJsID0gY29uZmlnLnVybCB8fCBjb25maWc7XG4gICAgICAgIHJldHVybiBpc1VSTCh1cmwpIHx8IChBcnJheS5pc0FycmF5KHVybCkgJiYgaXNVUkwodXJsWzBdKSk7XG4gICAgfTtcblxuICAgIHZhciBpc1VSTCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICEhKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICYmIGRhdGEuaW5kZXhPZignLicpID4gLTEpO1xuICAgIH07XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgIGV4dGVuc2lvbnM6IGV4dGVuc2lvbnMsXG4gICAgICAgIGNhblBsYXk6IGNhblBsYXksXG4gICAgICAgIGdldEZpbGVFeHRlbnNpb246IGdldEZpbGVFeHRlbnNpb24sXG4gICAgICAgIGdldFN1cHBvcnRlZEZpbGU6IGdldFN1cHBvcnRlZEZpbGUsXG4gICAgICAgIGNvbnRhaW5zVVJMOiBjb250YWluc1VSTFxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTdXBwb3J0KCk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBVdGlscyA9IHt9O1xuXG5VdGlscy5zZXRDb250ZXh0ID0gZnVuY3Rpb24oY29udGV4dCkge1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufTtcblxuLypcbiAqIGF1ZGlvIGJ1ZmZlclxuICovXG5cblV0aWxzLmNsb25lQnVmZmVyID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgdmFyIG51bUNoYW5uZWxzID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHMsXG4gICAgICAgIGNsb25lZCA9IHRoaXMuX2NvbnRleHQuY3JlYXRlQnVmZmVyKG51bUNoYW5uZWxzLCBidWZmZXIubGVuZ3RoLCBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1DaGFubmVsczsgaSsrKSB7XG4gICAgICAgIGNsb25lZC5nZXRDaGFubmVsRGF0YShpKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKGkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNsb25lZDtcbn07XG5cblV0aWxzLnJldmVyc2VCdWZmZXIgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgICB2YXIgbnVtQ2hhbm5lbHMgPSBidWZmZXIubnVtYmVyT2ZDaGFubmVscztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUNoYW5uZWxzOyBpKyspIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnJldmVyc2UuY2FsbChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSkpO1xuICAgIH1cbiAgICByZXR1cm4gYnVmZmVyO1xufTtcblxuLypcbiAqIGZhZGUgZ2FpblxuICovXG5cblV0aWxzLmNyb3NzRmFkZSA9IGZ1bmN0aW9uKGZyb21Tb3VuZCwgdG9Tb3VuZCwgZHVyYXRpb24pIHtcbiAgICB2YXIgZnJvbSA9IHRoaXMuaXNBdWRpb1BhcmFtKGZyb21Tb3VuZCkgPyBmcm9tU291bmQgOiBmcm9tU291bmQuZ2Fpbi5nYWluO1xuICAgIHZhciB0byA9IHRoaXMuaXNBdWRpb1BhcmFtKHRvU291bmQpID8gdG9Tb3VuZCA6IHRvU291bmQuZ2Fpbi5nYWluO1xuXG4gICAgZnJvbS5zZXRWYWx1ZUF0VGltZShmcm9tLnZhbHVlLCAwKTtcbiAgICBmcm9tLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKDAsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG4gICAgdG8uc2V0VmFsdWVBdFRpbWUodG8udmFsdWUsIDApO1xuICAgIHRvLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKDEsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG59O1xuXG5VdGlscy5mYWRlRnJvbSA9IGZ1bmN0aW9uKHNvdW5kLCB2YWx1ZSwgZHVyYXRpb24pIHtcbiAgICB2YXIgcGFyYW0gPSB0aGlzLmlzQXVkaW9QYXJhbShzb3VuZCkgPyBzb3VuZCA6IHNvdW5kLmdhaW4uZ2FpbjtcbiAgICB2YXIgdG9WYWx1ZSA9IHBhcmFtLnZhbHVlO1xuXG4gICAgcGFyYW0uc2V0VmFsdWVBdFRpbWUodmFsdWUsIDApO1xuICAgIHBhcmFtLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKHRvVmFsdWUsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG59O1xuXG5VdGlscy5mYWRlVG8gPSBmdW5jdGlvbihzb3VuZCwgdmFsdWUsIGR1cmF0aW9uKSB7XG4gICAgdmFyIHBhcmFtID0gdGhpcy5pc0F1ZGlvUGFyYW0oc291bmQpID8gc291bmQgOiBzb3VuZC5nYWluLmdhaW47XG5cbiAgICBwYXJhbS5zZXRWYWx1ZUF0VGltZShwYXJhbS52YWx1ZSwgMCk7XG4gICAgcGFyYW0ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUodmFsdWUsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG59O1xuXG4vKlxuICogZ2V0IGZyZXF1ZW5jeSBmcm9tIG1pbiB0byBtYXggYnkgcGFzc2luZyAwIHRvIDFcbiAqL1xuXG5VdGlscy5nZXRGcmVxdWVuY3kgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIC8vIGdldCBmcmVxdWVuY3kgYnkgcGFzc2luZyBudW1iZXIgZnJvbSAwIHRvIDFcbiAgICAvLyBDbGFtcCB0aGUgZnJlcXVlbmN5IGJldHdlZW4gdGhlIG1pbmltdW0gdmFsdWUgKDQwIEh6KSBhbmQgaGFsZiBvZiB0aGVcbiAgICAvLyBzYW1wbGluZyByYXRlLlxuICAgIHZhciBtaW5WYWx1ZSA9IDQwO1xuICAgIHZhciBtYXhWYWx1ZSA9IHRoaXMuX2NvbnRleHQuc2FtcGxlUmF0ZSAvIDI7XG4gICAgLy8gTG9nYXJpdGhtIChiYXNlIDIpIHRvIGNvbXB1dGUgaG93IG1hbnkgb2N0YXZlcyBmYWxsIGluIHRoZSByYW5nZS5cbiAgICB2YXIgbnVtYmVyT2ZPY3RhdmVzID0gTWF0aC5sb2cobWF4VmFsdWUgLyBtaW5WYWx1ZSkgLyBNYXRoLkxOMjtcbiAgICAvLyBDb21wdXRlIGEgbXVsdGlwbGllciBmcm9tIDAgdG8gMSBiYXNlZCBvbiBhbiBleHBvbmVudGlhbCBzY2FsZS5cbiAgICB2YXIgbXVsdGlwbGllciA9IE1hdGgucG93KDIsIG51bWJlck9mT2N0YXZlcyAqICh2YWx1ZSAtIDEuMCkpO1xuICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICByZXR1cm4gbWF4VmFsdWUgKiBtdWx0aXBsaWVyO1xufTtcblxuLypcbiAqIGRldGVjdCBmaWxlIHR5cGVzXG4gKi9cblxuVXRpbHMuaXNBdWRpb0J1ZmZlciA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB3aW5kb3cuQXVkaW9CdWZmZXIgJiZcbiAgICAgICAgICAgICAgZGF0YSBpbnN0YW5jZW9mIHdpbmRvdy5BdWRpb0J1ZmZlcik7XG59O1xuXG5VdGlscy5pc01lZGlhRWxlbWVudCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB3aW5kb3cuSFRNTE1lZGlhRWxlbWVudCAmJlxuICAgICAgICAgICAgICBkYXRhIGluc3RhbmNlb2Ygd2luZG93LkhUTUxNZWRpYUVsZW1lbnQpO1xufTtcblxuVXRpbHMuaXNNZWRpYVN0cmVhbSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB0eXBlb2YgZGF0YS5nZXRBdWRpb1RyYWNrcyA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAgICAgICBkYXRhLmdldEF1ZGlvVHJhY2tzKCkubGVuZ3RoICYmXG4gICAgICAgICAgICAgIHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrICYmXG4gICAgICAgICAgICAgIGRhdGEuZ2V0QXVkaW9UcmFja3MoKVswXSBpbnN0YW5jZW9mIHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrKTtcbn07XG5cblV0aWxzLmlzT3NjaWxsYXRvclR5cGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgcmV0dXJuICEhKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICAgKGRhdGEgPT09ICdzaW5lJyB8fCBkYXRhID09PSAnc3F1YXJlJyB8fFxuICAgICAgICAgICAgICBkYXRhID09PSAnc2F3dG9vdGgnIHx8IGRhdGEgPT09ICd0cmlhbmdsZScpKTtcbn07XG5cblV0aWxzLmlzU2NyaXB0Q29uZmlnID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHJldHVybiAhIShkYXRhICYmIHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgICBkYXRhLmJ1ZmZlclNpemUgJiYgZGF0YS5jaGFubmVscyAmJiBkYXRhLmNhbGxiYWNrKTtcbn07XG5cblV0aWxzLmlzQXVkaW9QYXJhbSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJiB3aW5kb3cuQXVkaW9QYXJhbSAmJiBkYXRhIGluc3RhbmNlb2Ygd2luZG93LkF1ZGlvUGFyYW0pO1xufTtcblxuLypcbiAqIG1pY3JvcGhvbmUgdXRpbFxuICovXG5cblV0aWxzLm1pY3JvcGhvbmUgPSBmdW5jdGlvbihjb25uZWN0ZWQsIGRlbmllZCwgZXJyb3IsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gbmV3IFV0aWxzLk1pY3JvcGhvbmUoY29ubmVjdGVkLCBkZW5pZWQsIGVycm9yLCB0aGlzQXJnKTtcbn07XG5cbi8qVXRpbHMucGFuID0gZnVuY3Rpb24ocGFubmVyKSB7XG4gICAgY29uc29sZS5sb2coJ3BhbicsIHRoaXMuX2NvbnRleHQpO1xuICAgIHJldHVybiBuZXcgVXRpbHMuUGFuKHRoaXMuX2NvbnRleHQsIHBhbm5lcik7XG59OyovXG5cblV0aWxzLnRpbWVDb2RlID0gZnVuY3Rpb24oc2Vjb25kcywgZGVsaW0pIHtcbiAgICBpZihkZWxpbSA9PT0gdW5kZWZpbmVkKSB7IGRlbGltID0gJzonOyB9XG4gICAgdmFyIGggPSBNYXRoLmZsb29yKHNlY29uZHMgLyAzNjAwKTtcbiAgICB2YXIgbSA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAvIDYwKTtcbiAgICB2YXIgcyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAlIDYwKTtcbiAgICB2YXIgaHIgPSAoaCA9PT0gMCA/ICcnIDogKGggPCAxMCA/ICcwJyArIGggKyBkZWxpbSA6IGggKyBkZWxpbSkpO1xuICAgIHZhciBtbiA9IChtIDwgMTAgPyAnMCcgKyBtIDogbSkgKyBkZWxpbTtcbiAgICB2YXIgc2MgPSAocyA8IDEwID8gJzAnICsgcyA6IHMpO1xuICAgIHJldHVybiBociArIG1uICsgc2M7XG59O1xuXG5VdGlscy53YXZlZm9ybSA9IGZ1bmN0aW9uKGJ1ZmZlciwgbGVuZ3RoKSB7XG4gICAgcmV0dXJuIG5ldyBVdGlscy5XYXZlZm9ybShidWZmZXIsIGxlbmd0aCk7XG59O1xuXG4vKlxuICogV2F2ZWZvcm1cbiAqL1xuXG5VdGlscy5XYXZlZm9ybSA9IGZ1bmN0aW9uKGJ1ZmZlciwgbGVuZ3RoKSB7XG4gICAgdGhpcy5kYXRhID0gdGhpcy5nZXREYXRhKGJ1ZmZlciwgbGVuZ3RoKTtcbn07XG5cblV0aWxzLldhdmVmb3JtLnByb3RvdHlwZSA9IHtcbiAgICBnZXREYXRhOiBmdW5jdGlvbihidWZmZXIsIGxlbmd0aCkge1xuICAgICAgICBpZighd2luZG93LkZsb2F0MzJBcnJheSB8fCAhVXRpbHMuaXNBdWRpb0J1ZmZlcihidWZmZXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgLy9jb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0tLS0tLScpO1xuICAgICAgICAvL2NvbnNvbGUudGltZSgnd2F2ZWZvcm1EYXRhJyk7XG4gICAgICAgIHZhciB3YXZlZm9ybSA9IG5ldyBGbG9hdDMyQXJyYXkobGVuZ3RoKSxcbiAgICAgICAgICAgIGNodW5rID0gTWF0aC5mbG9vcihidWZmZXIubGVuZ3RoIC8gbGVuZ3RoKSxcbiAgICAgICAgICAgIC8vY2h1bmsgPSBidWZmZXIubGVuZ3RoIC8gbGVuZ3RoLFxuICAgICAgICAgICAgcmVzb2x1dGlvbiA9IDUsIC8vIDEwXG4gICAgICAgICAgICBpbmNyID0gTWF0aC5mbG9vcihjaHVuayAvIHJlc29sdXRpb24pLFxuICAgICAgICAgICAgZ3JlYXRlc3QgPSAwO1xuXG4gICAgICAgIGlmKGluY3IgPCAxKSB7IGluY3IgPSAxOyB9XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGNobmxzID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7IGkgPCBjaG5sczsgaSsrKSB7XG4gICAgICAgICAgICAvLyBjaGVjayBlYWNoIGNoYW5uZWxcbiAgICAgICAgICAgIHZhciBjaGFubmVsID0gYnVmZmVyLmdldENoYW5uZWxEYXRhKGkpO1xuICAgICAgICAgICAgLy9mb3IgKHZhciBqID0gbGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAvLyBnZXQgaGlnaGVzdCB2YWx1ZSB3aXRoaW4gdGhlIGNodW5rXG4gICAgICAgICAgICAgICAgLy92YXIgY2ggPSBqICogY2h1bms7XG4gICAgICAgICAgICAgICAgLy9mb3IgKHZhciBrID0gY2ggKyBjaHVuayAtIDE7IGsgPj0gY2g7IGsgLT0gaW5jcikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGsgPSBqICogY2h1bmssIGwgPSBrICsgY2h1bms7IGsgPCBsOyBrICs9IGluY3IpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2VsZWN0IGhpZ2hlc3QgdmFsdWUgZnJvbSBjaGFubmVsc1xuICAgICAgICAgICAgICAgICAgICB2YXIgYSA9IGNoYW5uZWxba107XG4gICAgICAgICAgICAgICAgICAgIGlmKGEgPCAwKSB7IGEgPSAtYTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoYSA+IHdhdmVmb3JtW2pdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3YXZlZm9ybVtqXSA9IGE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlIGhpZ2hlc3Qgb3ZlcmFsbCBmb3Igc2NhbGluZ1xuICAgICAgICAgICAgICAgICAgICBpZihhID4gZ3JlYXRlc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyZWF0ZXN0ID0gYTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBzY2FsZSB1cD9cbiAgICAgICAgdmFyIHNjYWxlID0gMSAvIGdyZWF0ZXN0LFxuICAgICAgICAgICAgbGVuID0gd2F2ZWZvcm0ubGVuZ3RoO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHdhdmVmb3JtW2ldICo9IHNjYWxlO1xuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS50aW1lRW5kKCd3YXZlZm9ybURhdGEnKTtcbiAgICAgICAgcmV0dXJuIHdhdmVmb3JtO1xuICAgIH0sXG4gICAgZ2V0Q2FudmFzOiBmdW5jdGlvbihoZWlnaHQsIGNvbG9yLCBiZ0NvbG9yLCBjYW52YXNFbCkge1xuICAgIC8vd2F2ZWZvcm06IGZ1bmN0aW9uKGFyciwgd2lkdGgsIGhlaWdodCwgY29sb3IsIGJnQ29sb3IsIGNhbnZhc0VsKSB7XG4gICAgICAgIC8vdmFyIGFyciA9IHRoaXMud2F2ZWZvcm1EYXRhKGJ1ZmZlciwgd2lkdGgpO1xuICAgICAgICB2YXIgY2FudmFzID0gY2FudmFzRWwgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aCA9IHRoaXMuZGF0YS5sZW5ndGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBiZ0NvbG9yO1xuICAgICAgICBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB2YXIgeCwgeTtcbiAgICAgICAgLy9jb25zb2xlLnRpbWUoJ3dhdmVmb3JtQ2FudmFzJyk7XG4gICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKyAwLjU7XG4gICAgICAgICAgICB5ID0gaGVpZ2h0IC0gTWF0aC5yb3VuZChoZWlnaHQgKiB0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgY29udGV4dC5tb3ZlVG8oeCwgeSk7XG4gICAgICAgICAgICBjb250ZXh0LmxpbmVUbyh4LCBoZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XG4gICAgICAgIC8vY29uc29sZS50aW1lRW5kKCd3YXZlZm9ybUNhbnZhcycpO1xuICAgICAgICByZXR1cm4gY2FudmFzO1xuICAgIH1cbn07XG5cblxuLypcbiAqIE1pY3JvcGhvbmVcbiAqL1xuXG5VdGlscy5NaWNyb3Bob25lID0gZnVuY3Rpb24oY29ubmVjdGVkLCBkZW5pZWQsIGVycm9yLCB0aGlzQXJnKSB7XG4gICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYV8gPSAobmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhKTtcbiAgICB0aGlzLl9pc1N1cHBvcnRlZCA9ICEhbmF2aWdhdG9yLmdldFVzZXJNZWRpYV87XG4gICAgdGhpcy5fc3RyZWFtID0gbnVsbDtcblxuICAgIHRoaXMuX29uQ29ubmVjdGVkID0gY29ubmVjdGVkLmJpbmQodGhpc0FyZyB8fCB0aGlzKTtcbiAgICB0aGlzLl9vbkRlbmllZCA9IGRlbmllZCA/IGRlbmllZC5iaW5kKHRoaXNBcmcgfHwgdGhpcykgOiBmdW5jdGlvbigpIHt9O1xuICAgIHRoaXMuX29uRXJyb3IgPSBlcnJvciA/IGVycm9yLmJpbmQodGhpc0FyZyB8fCB0aGlzKSA6IGZ1bmN0aW9uKCkge307XG59O1xuXG5VdGlscy5NaWNyb3Bob25lLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX2lzU3VwcG9ydGVkKSB7IHJldHVybjsgfVxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhXygge2F1ZGlvOnRydWV9LCBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgc2VsZi5fc3RyZWFtID0gc3RyZWFtO1xuICAgICAgICBzZWxmLl9vbkNvbm5lY3RlZChzdHJlYW0pO1xuICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYoZS5uYW1lID09PSAnUGVybWlzc2lvbkRlbmllZEVycm9yJyB8fCBlID09PSAnUEVSTUlTU0lPTl9ERU5JRUQnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUGVybWlzc2lvbiBkZW5pZWQuIFlvdSBjYW4gdW5kbyB0aGlzIGJ5IGNsaWNraW5nIHRoZSBjYW1lcmEgaWNvbiB3aXRoIHRoZSByZWQgY3Jvc3MgaW4gdGhlIGFkZHJlc3MgYmFyJyk7XG4gICAgICAgICAgICBzZWxmLl9vbkRlbmllZCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5fb25FcnJvcihlLm1lc3NhZ2UgfHwgZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblV0aWxzLk1pY3JvcGhvbmUucHJvdG90eXBlLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zdHJlYW0pIHtcbiAgICAgICAgdGhpcy5fc3RyZWFtLnN0b3AoKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoVXRpbHMuTWljcm9waG9uZS5wcm90b3R5cGUsICdzdHJlYW0nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0cmVhbTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFV0aWxzLk1pY3JvcGhvbmUucHJvdG90eXBlLCAnaXNTdXBwb3J0ZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzU3VwcG9ydGVkO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWxzO1xuIl19
