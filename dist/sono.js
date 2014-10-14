!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.Sono=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Effect = require('./lib/effect.js'),
    Loader = require('./lib/utils/loader.js'),
    Sound = require('./lib/sound.js'),
    Support = require('./lib/utils/support.js'),
    Utils = require('./lib/utils/utils.js');

function Sono() {
    this.VERSION = '0.0.0';

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    this._context = window.AudioContext ? new window.AudioContext() : null;
    Utils.setContext(this._context);

    this._effect = new Effect(this._context);
    this._masterGain = this._effect.gain();

    if(this._context) {
        this._effect.setSource(this._masterGain);
        this._effect.setDestination(this._context.destination);
    }

    this._sounds = [];

    this._handleTouchlock();
    this._handlePageVisibility();
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
    sound.isTouchLocked = this._isTouchLocked;
    if(config) {
        sound.data = config.data || config;
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
        sound.data = data;
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

        if(this._context) {
            this._masterGain.gain.cancelScheduledValues(this._context.currentTime);
            this._masterGain.gain.setValueAtTime(value, this._context.currentTime);
        }

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
    var onUnlock = function() {
        this._isTouchLocked = false;
        this._sounds.forEach(function(sound) {
            sound.isTouchLocked = false;
            if(sound.loader) {
                sound.loader.isTouchLocked = false;
            }
        });
    };
    this._isTouchLocked = Utils.handleTouchlock(onUnlock, this);
};

/*
 * Page visibility events
 */

Sono.prototype._handlePageVisibility = function() {
    var pageHiddenPaused = [],
        sounds = this._sounds;

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

    Utils.handlePageVisibility(onHidden, onShown, this);
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

Object.defineProperty(Sono.prototype, 'effect', {
    get: function() {
        return this._effect;
    }
});

Object.defineProperty(Sono.prototype, 'extensions', {
    get: function() {
        return Support.extensions;
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

},{"./lib/effect.js":3,"./lib/sound.js":14,"./lib/utils/loader.js":20,"./lib/utils/support.js":22,"./lib/utils/utils.js":23}],2:[function(require,module,exports){
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

var Analyser = require('./effect/analyser.js'),
    Distortion = require('./effect/distortion.js'),
    Echo = require('./effect/echo.js'),
    FakeContext = require('./effect/fake-context.js'),
    Filter = require('./effect/filter.js'),
    Flanger = require('./effect/flanger.js'),
    Panner = require('./effect/panner.js'),
    Phaser = require('./effect/phaser.js'),
    Recorder = require('./effect/recorder.js'),
    Reverb = require('./effect/reverb.js');

function Effect(context) {
    this._context = context || new FakeContext();
    this._destination = null;
    this._nodeList = [];
    this._sourceNode = null;
}

Effect.prototype.add = function(node) {
    if(!node) { return; }
    //console.log('Effect.add:', node);
    this._nodeList.push(node);
    this._updateConnections();
    return node;
};

Effect.prototype.remove = function(node) {
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

Effect.prototype.removeAll = function() {
    while(this._nodeList.length) {
        this._nodeList.pop().disconnect();
    }
    this._updateConnections();
    return this;
};

Effect.prototype._connect = function(a, b) {
    //console.log('> connect', (a.name || a.constructor.name), 'to', (b.name || b.constructor.name));

    var output = a._output || a;
    //console.log('> disconnect output: ', (a.name || a.constructor.name));
    output.disconnect();
    //console.log('> connect output: ', (a.name || a.constructor.name), 'to input:', (b.name || b.constructor.name));
    output.connect(b);
};

Effect.prototype._connectToDestination = function(destination) {
    var l = this._nodeList.length,
        lastNode = l ? this._nodeList[l - 1] : this._sourceNode;

    if(lastNode) {
        this._connect(lastNode, destination);
    }

    this._destination = destination;
};

Effect.prototype._updateConnections = function() {
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

Object.defineProperty(Effect.prototype, 'panning', {
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

Effect.prototype.analyser = function(fftSize, smoothing, minDecibels, maxDecibels) {
    var analyser = new Analyser(this._context, fftSize, smoothing, minDecibels, maxDecibels);
    return this.add(analyser);
};

Effect.prototype.compressor = function(config) {
    config = config || {};
    // lowers the volume of the loudest parts of the signal and raises the volume of the softest parts
    var node = this._context.createDynamicsCompressor();
    // min decibels to start compressing at from -100 to 0
    node.threshold.value = config.threshold !== undefined ? config.threshold : -24;
    // decibel value to start curve to compressed value from 0 to 40
    node.knee.value = config.knee !== undefined ? config.knee : 30;
    // amount of change per decibel from 1 to 20
    node.ratio.value = config.ratio !== undefined ? config.ratio : 12;
    // gain reduction currently applied by compressor from -20 to 0
    node.reduction.value = config.reduction !== undefined ? config.reduction : -10;
    // seconds to reduce gain by 10db from 0 to 1 - how quickly signal adapted when volume increased
    node.attack.value = config.attack !== undefined ? config.attack : 0.0003;
    // seconds to increase gain by 10db from 0 to 1 - how quickly signal adapted when volume redcuced
    node.release.value = config.release !== undefined ? config.release : 0.25;

    /*Object.defineProperties(node, {
        threshold: {
            get: function() { return node.threshold.value; },
            set: function(value) { node.threshold.value = value; }
        },
        knee: {
            get: function() { return node.knee.value; },
            set: function(value) { node.knee.value = value; }
        },
        ratio: {
            get: function() { return node.ratio.value; },
            set: function(value) { node.ratio.value = value; }
        },
        reduction: {
            get: function() { return node.reduction.value; },
            set: function(value) { node.reduction.value = value; }
        },
        attack: {
            get: function() { return node.attack.value; },
            set: function(value) { node.attack.value = value; }
        },
        release: {
            get: function() { return node.release.value; },
            set: function(value) { node.release.value = value; }
        }
    });*/

    return this.add(node);
};

Effect.prototype.convolver = function(impulseResponse) {
    // impulseResponse is an audio file buffer
    var node = this._context.createConvolver();
    node.buffer = impulseResponse;
    return this.add(node);
};

Effect.prototype.delay = function(time) {
    var node = this._context.createDelay();
    if(time !== undefined) { node.delayTime.value = time; }
    return this.add(node);
};

Effect.prototype.echo = function(time, gain) {
    var node = new Echo(this._context, time, gain);
    return this.add(node);
};

Effect.prototype.distortion = function(amount) {
    var node = new Distortion(this._context, amount);
    // Float32Array defining curve (values are interpolated)
    //node.curve
    // up-sample before applying curve for better resolution result 'none', '2x' or '4x'
    //node.oversample = '2x';
    return this.add(node);
};

Effect.prototype.filter = function(type, frequency, quality, gain) {
    var filter = new Filter(this._context, type, frequency, quality, gain);
    return this.add(filter);
};

Effect.prototype.lowpass = function(frequency, quality, gain) {
    return this.filter('lowpass', frequency, quality, gain);
};

Effect.prototype.highpass = function(frequency, quality, gain) {
    return this.filter('highpass', frequency, quality, gain);
};

Effect.prototype.bandpass = function(frequency, quality, gain) {
    return this.filter('bandpass', frequency, quality, gain);
};

Effect.prototype.lowshelf = function(frequency, quality, gain) {
    return this.filter('lowshelf', frequency, quality, gain);
};

Effect.prototype.highshelf = function(frequency, quality, gain) {
    return this.filter('highshelf', frequency, quality, gain);
};

Effect.prototype.peaking = function(frequency, quality, gain) {
    return this.filter('peaking', frequency, quality, gain);
};

Effect.prototype.notch = function(frequency, quality, gain) {
    return this.filter('notch', frequency, quality, gain);
};

Effect.prototype.allpass = function(frequency, quality, gain) {
    return this.filter('allpass', frequency, quality, gain);
};

Effect.prototype.flanger = function(config) {
    var node = new Flanger(this._context, config);
    return this.add(node);
};

Effect.prototype.gain = function(value) {
    var node = this._context.createGain();
    if(value !== undefined) {
        node.gain.value = value;
    }
    return node;
};

Effect.prototype.panner = function() {
    var node = new Panner(this._context);
    return this.add(node);
};

Effect.prototype.phaser = function(config) {
    var node = new Phaser(this._context, config);
    return this.add(node);
};

Effect.prototype.recorder = function(passThrough) {
    var node = new Recorder(this._context, passThrough);
    return this.add(node);
};

Effect.prototype.reverb = function(seconds, decay, reverse) {
    var node = new Reverb(this._context, seconds, decay, reverse);
    return this.add(node);
};

Effect.prototype.script = function(config) {
    config = config || {};
    // bufferSize 256 - 16384 (pow 2)
    var bufferSize = config.bufferSize || 1024;
    var inputChannels = config.inputChannels === undefined ? 0 : inputChannels;
    var outputChannels = config.outputChannels === undefined ? 1 : outputChannels;
    
    var node = this._context.createScriptProcessor(bufferSize, inputChannels, outputChannels);
    
    var thisArg = config.thisArg || config.context || node;
    var callback = config.callback || function() {};

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
    node.onaudioprocess = callback.bind(thisArg);

    return this.add(node);
};

Effect.prototype.setSource = function(node) {
    this._sourceNode = node;
    this._updateConnections();
    return node;
};

Effect.prototype.setDestination = function(node) {
    this._connectToDestination(node);
    return node;
};

module.exports = Effect;

},{"./effect/analyser.js":4,"./effect/distortion.js":5,"./effect/echo.js":6,"./effect/fake-context.js":7,"./effect/filter.js":8,"./effect/flanger.js":9,"./effect/panner.js":10,"./effect/phaser.js":11,"./effect/recorder.js":12,"./effect/reverb.js":13}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
'use strict';

function Distortion(context, amount) {

    amount = amount || 1;
    
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
'use strict';

function FakeContext() {
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
        // analyser
        frequencyBinCount: 0,
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
        reduction: param,
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

    // ie9
    if(!window.Uint8Array) {
        window.Int8Array = 
        window.Uint8Array = 
        window.Uint8ClampedArray = 
        window.Int16Array = 
        window.Uint16Array = 
        window.Int32Array = 
        window.Uint32Array = 
        window.Float32Array = 
        window.Float64Array = Array;
    }

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
}

module.exports = FakeContext;

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

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
'use strict';

function Reverb(context, config) {
    config = config || {};

    var time = config.time || 1,
        decay = config.decay || 5,
        reverse = !!config.reverse,
        rate = context.sampleRate,
        length,
        impulseResponse;

    var input = context.createGain();
    var reverb = context.createConvolver();
    var output = context.createGain();

    input.connect(reverb);
    input.connect(output);
    reverb.connect(output);

    var node = input;
    node.name = 'Reverb';
    node._output = output;

    node.update = function(config) {
        if(config.time !== undefined) {
            time = config.time;
            length = rate * time;
            impulseResponse = context.createBuffer(2, length, rate);
        }
        if(config.decay !== undefined) {
            decay = config.decay;
        }
        if(config.reverse !== undefined) {
            reverse = config.reverse;
        }

        var left = impulseResponse.getChannelData(0),
            right = impulseResponse.getChannelData(1),
            n, e;

        for (var i = 0; i < length; i++) {
            n = reverse ? length - i : i;
            e = Math.pow(1 - n / length, decay);
            left[i] = (Math.random() * 2 - 1) * e;
            right[i] = (Math.random() * 2 - 1) * e;
        }

        reverb.buffer = impulseResponse;
    };

    node.update({
        time: time,
        decay: decay,
        reverse: reverse
    });

    Object.defineProperties(node, {
        time: {
            get: function() { return time; },
            set: function(value) {
                console.log('set time:', value);
                if(value === time) { return; }
                this.update({time: time});
            }
        },
        decay: {
            get: function() { return decay; },
            set: function(value) {
                if(value === decay) { return; }
                this.update({decay: decay});
            }
        },
        reverse: {
            get: function() { return reverse; },
            set: function(value) {
                if(value === reverse) { return; }
                this.update({reverse: !!value});
            }
        }
    });

    return node;
}

module.exports = Reverb;

},{}],14:[function(require,module,exports){
'use strict';

var BufferSource = require('./source/buffer-source.js'),
    Effect = require('./effect.js'),
    MediaSource = require('./source/media-source.js'),
    MicrophoneSource = require('./source/microphone-source.js'),
    OscillatorSource = require('./source/oscillator-source.js'),
    ScriptSource = require('./source/script-source.js'),
    Utils = require('./utils/utils.js');

function Sound(context, destination) {
    this.id = '';
    this._context = context;
    this._data = null;
    this._endedCallback = null;
    this._isTouchLocked = false;
    this._loop = false;
    this._pausedAt = 0;
    this._playWhenReady = null;
    this._source = null;
    this._startedAt = 0;

    this._effect = new Effect(this._context);
    this._gain = this._effect.gain();
    if(this._context) {
        this._effect.setDestination(this._gain);
        this._gain.connect(destination || this._context.destination);
    }
}

/*
 * Controls
 */

Sound.prototype.play = function(delay, offset) {
    if(!this._source || this._isTouchLocked) {
        this._playWhenReady = function() {
            this.play(delay, offset);
        }.bind(this);
        return this;
    }
    this._playWhenReady = null;
    this._effect.setSource(this._source.sourceNode);
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
 * Create source
 */

Sound.prototype._createSource = function(data) {
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

    this._effect.setSource(this._source.sourceNode);

    if(typeof this._source.onEnded === 'function') {
        this._source.onEnded(this._endedHandler, this);
    }

    if(this._playWhenReady) {
        this._playWhenReady();
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
    },
    set : function(value) {
        if(!value) { return; }
        this._data = value;
        this._createSource(this._data);
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

Object.defineProperty(Sound.prototype, 'isTouchLocked', {
    set: function(value) {
        this._isTouchLocked = value;
        if(!value && this._playWhenReady) {
            this._playWhenReady();
        }
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

Object.defineProperty(Sound.prototype, 'effect', {
    get: function() {
        return this._effect;
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

        if(this._context) {
            this._gain.gain.cancelScheduledValues(this._context.currentTime);
            this._gain.gain.setValueAtTime(value, this._context.currentTime);
        }

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

},{"./effect.js":3,"./source/buffer-source.js":15,"./source/media-source.js":16,"./source/microphone-source.js":17,"./source/oscillator-source.js":18,"./source/script-source.js":19,"./utils/utils.js":23}],15:[function(require,module,exports){
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
    
    //console.log.apply(console, ['1 offset:', offset]);
    while(offset > this.duration) { offset = offset % this.duration; }
    //console.log.apply(console, ['2 offset:', offset]);

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

},{"signals":2}],21:[function(require,module,exports){
'use strict';

function Microphone(connected, denied, error, thisArg) {
    navigator.getUserMedia_ = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
    this._isSupported = !!navigator.getUserMedia_;
    this._stream = null;

    this._onConnected = connected.bind(thisArg || this);
    this._onDenied = denied ? denied.bind(thisArg || this) : function() {};
    this._onError = error ? error.bind(thisArg || this) : function() {};
}

Microphone.prototype.connect = function() {
    if(!this._isSupported) { return; }
    var self = this;
    navigator.getUserMedia_({audio:true}, function(stream) {
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

Microphone.prototype.disconnect = function() {
    if(this._stream) {
        this._stream.stop();
        this._stream = null;
    }
    return this;
};

Object.defineProperty(Microphone.prototype, 'stream', {
    get: function() {
        return this._stream;
    }
});

Object.defineProperty(Microphone.prototype, 'isSupported', {
    get: function() {
        return this._isSupported;
    }
});

module.exports = Microphone;

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

var Microphone = require('./microphone.js'),
    Waveform = require('./waveform.js'),
    Utils = {};

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

    this.ramp(from, from.value, 0, duration);
    this.ramp(to, to.value, 1, duration);
};

Utils.fadeFrom = function(sound, value, duration) {
    var param = this.isAudioParam(sound) ? sound : sound.gain.gain;
    this.ramp(param, value, param.value, duration);
};

Utils.fadeTo = function(sound, value, duration) {
    var param = this.isAudioParam(sound) ? sound : sound.gain.gain;
    this.ramp(param, param.value, value, duration);
};

Utils.ramp = function(param, fromValue, toValue, duration) {
    if(!this._context) { return; }

    param.setValueAtTime(fromValue, this._context.currentTime);
    param.linearRampToValueAtTime(toValue, this._context.currentTime + duration);
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
    return new Microphone(connected, denied, error, thisArg);
};

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
    return new Waveform(buffer, length);
};

/*
 * Page visibility
 */

Utils.handlePageVisibility = function(onHidden, onShown, thisArg) {
    var hidden,
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

    function onChange() {
        if (document[hidden]) {
            onHidden.call(thisArg);
        }
        else {
            onShown.call(thisArg);
        }
    }

    if(visibilityChange !== undefined) {
        document.addEventListener(visibilityChange, onChange, false);
    }
};

/*
 * Touch lock
 */

Utils.handleTouchlock = function(onUnlock, thisArg) {
    var ua = navigator.userAgent,
        locked = !!ua.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i);

    var unlock = function() {
        document.body.removeEventListener('touchstart', unlock);

        if(this._context) {
            var buffer = this._context.createBuffer(1, 1, 22050);
            var unlockSource = this._context.createBufferSource();
            unlockSource.buffer = buffer;
            unlockSource.connect(this._context.destination);
            unlockSource.start(0);
        }

        onUnlock.call(thisArg);

    }.bind(this);

    if(locked) {
        document.body.addEventListener('touchstart', unlock, false);
    }
    return locked;
};

module.exports = Utils;

},{"./microphone.js":21,"./waveform.js":24}],24:[function(require,module,exports){
'use strict';

function Waveform() {

    var audioBuffer,
        waveformData;

    var compute = function(buffer, length) {
        if(!window.Float32Array || !window.AudioBuffer) { return []; }

        var sameBuffer = buffer === audioBuffer;
        var sameLength = waveformData && waveformData.length === length;
        if(sameBuffer && sameLength) { return waveformData; }
        
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

        // cache for repeated calls
        audioBuffer = buffer;
        waveformData = waveform;

        return waveform;
    };

    var draw = function(config) {
        var x, y;
        var canvas = config.canvas || document.createElement('canvas');
        var width = config.width || canvas.width;
        var height = config.height || canvas.height;
        var color = config.color || '#333333';
        var bgColor = config.bgColor || '#dddddd';
        var buffer = config.sound ? config.sound.data : config.buffer || audioBuffer;
        var data = this.compute(buffer, width);

        var context = canvas.getContext('2d');
        context.strokeStyle = color;
        context.fillStyle = bgColor;
        context.fillRect(0, 0, width, height);
        context.beginPath();
        for (var i = 0; i < data.length; i++) {
            x = i + 0.5;
            y = height - Math.round(height * data[i]);
            context.moveTo(x, y);
            context.lineTo(x, height);
        }
        context.stroke();

        return canvas;
    };
    
    return Object.freeze({
        compute: compute,
        draw: draw
    });
}

module.exports = Waveform;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc29uby5qcyIsIm5vZGVfbW9kdWxlcy9zaWduYWxzL2Rpc3Qvc2lnbmFscy5qcyIsInNyYy9saWIvZWZmZWN0LmpzIiwic3JjL2xpYi9lZmZlY3QvYW5hbHlzZXIuanMiLCJzcmMvbGliL2VmZmVjdC9kaXN0b3J0aW9uLmpzIiwic3JjL2xpYi9lZmZlY3QvZWNoby5qcyIsInNyYy9saWIvZWZmZWN0L2Zha2UtY29udGV4dC5qcyIsInNyYy9saWIvZWZmZWN0L2ZpbHRlci5qcyIsInNyYy9saWIvZWZmZWN0L2ZsYW5nZXIuanMiLCJzcmMvbGliL2VmZmVjdC9wYW5uZXIuanMiLCJzcmMvbGliL2VmZmVjdC9waGFzZXIuanMiLCJzcmMvbGliL2VmZmVjdC9yZWNvcmRlci5qcyIsInNyYy9saWIvZWZmZWN0L3JldmVyYi5qcyIsInNyYy9saWIvc291bmQuanMiLCJzcmMvbGliL3NvdXJjZS9idWZmZXItc291cmNlLmpzIiwic3JjL2xpYi9zb3VyY2UvbWVkaWEtc291cmNlLmpzIiwic3JjL2xpYi9zb3VyY2UvbWljcm9waG9uZS1zb3VyY2UuanMiLCJzcmMvbGliL3NvdXJjZS9vc2NpbGxhdG9yLXNvdXJjZS5qcyIsInNyYy9saWIvc291cmNlL3NjcmlwdC1zb3VyY2UuanMiLCJzcmMvbGliL3V0aWxzL2xvYWRlci5qcyIsInNyYy9saWIvdXRpbHMvbWljcm9waG9uZS5qcyIsInNyYy9saWIvdXRpbHMvc3VwcG9ydC5qcyIsInNyYy9saWIvdXRpbHMvdXRpbHMuanMiLCJzcmMvbGliL3V0aWxzL3dhdmVmb3JtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM1dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBFZmZlY3QgPSByZXF1aXJlKCcuL2xpYi9lZmZlY3QuanMnKSxcbiAgICBMb2FkZXIgPSByZXF1aXJlKCcuL2xpYi91dGlscy9sb2FkZXIuanMnKSxcbiAgICBTb3VuZCA9IHJlcXVpcmUoJy4vbGliL3NvdW5kLmpzJyksXG4gICAgU3VwcG9ydCA9IHJlcXVpcmUoJy4vbGliL3V0aWxzL3N1cHBvcnQuanMnKSxcbiAgICBVdGlscyA9IHJlcXVpcmUoJy4vbGliL3V0aWxzL3V0aWxzLmpzJyk7XG5cbmZ1bmN0aW9uIFNvbm8oKSB7XG4gICAgdGhpcy5WRVJTSU9OID0gJzAuMC4wJztcblxuICAgIHdpbmRvdy5BdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG4gICAgdGhpcy5fY29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgPyBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpIDogbnVsbDtcbiAgICBVdGlscy5zZXRDb250ZXh0KHRoaXMuX2NvbnRleHQpO1xuXG4gICAgdGhpcy5fZWZmZWN0ID0gbmV3IEVmZmVjdCh0aGlzLl9jb250ZXh0KTtcbiAgICB0aGlzLl9tYXN0ZXJHYWluID0gdGhpcy5fZWZmZWN0LmdhaW4oKTtcblxuICAgIGlmKHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fZWZmZWN0LnNldFNvdXJjZSh0aGlzLl9tYXN0ZXJHYWluKTtcbiAgICAgICAgdGhpcy5fZWZmZWN0LnNldERlc3RpbmF0aW9uKHRoaXMuX2NvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIH1cblxuICAgIHRoaXMuX3NvdW5kcyA9IFtdO1xuXG4gICAgdGhpcy5faGFuZGxlVG91Y2hsb2NrKCk7XG4gICAgdGhpcy5faGFuZGxlUGFnZVZpc2liaWxpdHkoKTtcbn1cblxuLypcbiAqIENyZWF0ZVxuICpcbiAqIEFjY2VwdGVkIHZhbHVlcyBmb3IgcGFyYW0gY29uZmlnOlxuICpcbiAqIEFycmF5QnVmZmVyXG4gKiBIVE1MTWVkaWFFbGVtZW50XG4gKiBBcnJheSAob2YgZmlsZXMgZS5nLiBbJ2Zvby5vZ2cnLCAnZm9vLm1wMyddKVxuICogU3RyaW5nIChmaWxlbmFtZSBlLmcuICdmb28ub2dnJylcbiAqIE9iamVjdCBjb25maWcgZS5nLiB7IGlkOidmb28nLCB1cmw6Wydmb28ub2dnJywgJ2Zvby5tcDMnXSB9XG4gKiBTdHJpbmcgKE9zY2lsbGF0b3IgdHlwZSBpLmUuICdzaW5lJywgJ3NxdWFyZScsICdzYXd0b290aCcsICd0cmlhbmdsZScpXG4gKiBPYmplY3QgKFNjcmlwdFByb2Nlc3NvciBjb25maWc6IHsgYnVmZmVyU2l6ZTogMTAyNCwgY2hhbm5lbHM6IDEsIGNhbGxiYWNrOiBmbiwgdGhpc0FyZzogc2VsZiB9KVxuICovXG5cblNvbm8ucHJvdG90eXBlLmNyZWF0ZVNvdW5kID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgLy8gdHJ5IHRvIGxvYWQgaWYgY29uZmlnIGNvbnRhaW5zIFVSTHNcbiAgICBpZihTdXBwb3J0LmNvbnRhaW5zVVJMKGNvbmZpZykpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9hZChjb25maWcpO1xuICAgIH1cbiAgICAvLyBvdGhlcndpc2UganVzdCByZXR1cm4gYSBuZXcgc291bmQgb2JqZWN0XG4gICAgdmFyIHNvdW5kID0gbmV3IFNvdW5kKHRoaXMuX2NvbnRleHQsIHRoaXMuX21hc3RlckdhaW4pO1xuICAgIHNvdW5kLmlzVG91Y2hMb2NrZWQgPSB0aGlzLl9pc1RvdWNoTG9ja2VkO1xuICAgIGlmKGNvbmZpZykge1xuICAgICAgICBzb3VuZC5kYXRhID0gY29uZmlnLmRhdGEgfHwgY29uZmlnO1xuICAgICAgICBzb3VuZC5pZCA9IGNvbmZpZy5pZCB8fCAnJztcbiAgICAgICAgc291bmQubG9vcCA9ICEhY29uZmlnLmxvb3A7XG4gICAgICAgIHNvdW5kLnZvbHVtZSA9IGNvbmZpZy52b2x1bWU7XG4gICAgfVxuICAgIHRoaXMuX3NvdW5kcy5wdXNoKHNvdW5kKTtcblxuICAgIHJldHVybiBzb3VuZDtcbn07XG5cbi8qXG4gKiBEZXN0cm95XG4gKi9cblxuU29uby5wcm90b3R5cGUuZGVzdHJveVNvdW5kID0gZnVuY3Rpb24oc291bmRPcklkKSB7XG4gICAgaWYoIXNvdW5kT3JJZCkgeyByZXR1cm47IH1cbiAgICB0aGlzLl9zb3VuZHMuc29tZShmdW5jdGlvbihzb3VuZCwgaW5kZXgsIHNvdW5kcykge1xuICAgICAgICBpZihzb3VuZCA9PT0gc291bmRPcklkIHx8IHNvdW5kLmlkID09PSBzb3VuZE9ySWQpIHtcbiAgICAgICAgICAgIHNvdW5kcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgaWYoc291bmQubG9hZGVyKSB7XG4gICAgICAgICAgICAgICAgc291bmQubG9hZGVyLmNhbmNlbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzb3VuZC5zdG9wKCk7XG4gICAgICAgICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLypcbiAqIEdldCBTb3VuZCBieSBpZFxuICovXG5cblNvbm8ucHJvdG90eXBlLmdldFNvdW5kID0gZnVuY3Rpb24oaWQpIHtcbiAgICB2YXIgc291bmQgPSBudWxsO1xuICAgIHRoaXMuX3NvdW5kcy5zb21lKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgaWYoaXRlbS5pZCA9PT0gaWQpIHtcbiAgICAgICAgICAgIHNvdW5kID0gaXRlbTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHNvdW5kO1xufTtcblxuLypcbiAqIExvYWRpbmdcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgaWYoIWNvbmZpZykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FyZ3VtZW50RXhjZXB0aW9uOiBTb25vLmxvYWQ6IHBhcmFtIGNvbmZpZyBpcyB1bmRlZmluZWQnKTtcbiAgICB9XG5cbiAgICB2YXIgYXNNZWRpYUVsZW1lbnQgPSAhIWNvbmZpZy5hc01lZGlhRWxlbWVudCxcbiAgICAgICAgb25Qcm9ncmVzcyA9IGNvbmZpZy5vblByb2dyZXNzLFxuICAgICAgICBvbkNvbXBsZXRlID0gY29uZmlnLm9uQ29tcGxldGUsXG4gICAgICAgIHRoaXNBcmcgPSBjb25maWcudGhpc0FyZyB8fCBjb25maWcuY29udGV4dCB8fCB0aGlzLFxuICAgICAgICB1cmwgPSBjb25maWcudXJsIHx8IGNvbmZpZztcblxuICAgIHZhciBzb3VuZCxcbiAgICAgICAgbG9hZGVyO1xuXG4gICAgaWYoU3VwcG9ydC5jb250YWluc1VSTCh1cmwpKSB7XG4gICAgICAgIHNvdW5kID0gdGhpcy5fcXVldWUoY29uZmlnLCBhc01lZGlhRWxlbWVudCk7XG4gICAgICAgIGxvYWRlciA9IHNvdW5kLmxvYWRlcjtcbiAgICB9XG4gICAgZWxzZSBpZihBcnJheS5pc0FycmF5KHVybCkgJiYgU3VwcG9ydC5jb250YWluc1VSTCh1cmxbMF0udXJsKSApIHtcbiAgICAgICAgc291bmQgPSBbXTtcbiAgICAgICAgbG9hZGVyID0gbmV3IExvYWRlci5Hcm91cCgpO1xuXG4gICAgICAgIHVybC5mb3JFYWNoKGZ1bmN0aW9uKGZpbGUpIHtcbiAgICAgICAgICAgIHNvdW5kLnB1c2godGhpcy5fcXVldWUoZmlsZSwgYXNNZWRpYUVsZW1lbnQsIGxvYWRlcikpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9XG5cbiAgICBpZihvblByb2dyZXNzKSB7XG4gICAgICAgIGxvYWRlci5vblByb2dyZXNzLmFkZChvblByb2dyZXNzLCB0aGlzQXJnKTtcbiAgICB9XG4gICAgaWYob25Db21wbGV0ZSkge1xuICAgICAgICBsb2FkZXIub25Db21wbGV0ZS5hZGRPbmNlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgb25Db21wbGV0ZS5jYWxsKHRoaXNBcmcsIHNvdW5kKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGxvYWRlci5zdGFydCgpO1xuXG4gICAgcmV0dXJuIHNvdW5kO1xufTtcblxuU29uby5wcm90b3R5cGUuX3F1ZXVlID0gZnVuY3Rpb24oY29uZmlnLCBhc01lZGlhRWxlbWVudCwgZ3JvdXApIHtcbiAgICB2YXIgdXJsID0gU3VwcG9ydC5nZXRTdXBwb3J0ZWRGaWxlKGNvbmZpZy51cmwgfHwgY29uZmlnKTtcbiAgICB2YXIgc291bmQgPSB0aGlzLmNyZWF0ZVNvdW5kKCk7XG4gICAgc291bmQuaWQgPSBjb25maWcuaWQgfHwgJyc7XG4gICAgc291bmQubG9vcCA9ICEhY29uZmlnLmxvb3A7XG4gICAgc291bmQudm9sdW1lID0gY29uZmlnLnZvbHVtZTtcblxuICAgIHZhciBsb2FkZXIgPSBuZXcgTG9hZGVyKHVybCk7XG4gICAgbG9hZGVyLmF1ZGlvQ29udGV4dCA9IGFzTWVkaWFFbGVtZW50ID8gbnVsbCA6IHRoaXMuX2NvbnRleHQ7XG4gICAgbG9hZGVyLmlzVG91Y2hMb2NrZWQgPSB0aGlzLl9pc1RvdWNoTG9ja2VkO1xuICAgIGxvYWRlci5vbkJlZm9yZUNvbXBsZXRlLmFkZE9uY2UoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBzb3VuZC5kYXRhID0gZGF0YTtcbiAgICB9KTtcbiAgICAvLyBrZWVwIGEgcmVmIHNvIGNhbiBjYWxsIHNvdW5kLmxvYWRlci5jYW5jZWwoKVxuICAgIHNvdW5kLmxvYWRlciA9IGxvYWRlcjtcbiAgICBpZihncm91cCkgeyBncm91cC5hZGQobG9hZGVyKTsgfVxuXG4gICAgcmV0dXJuIHNvdW5kO1xufTtcblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuU29uby5wcm90b3R5cGUubXV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3ByZU11dGVWb2x1bWUgPSB0aGlzLnZvbHVtZTtcbiAgICB0aGlzLnZvbHVtZSA9IDA7XG59O1xuXG5Tb25vLnByb3RvdHlwZS51bk11dGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnZvbHVtZSA9IHRoaXMuX3ByZU11dGVWb2x1bWUgfHwgMTtcbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ3ZvbHVtZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWFzdGVyR2Fpbi5nYWluLnZhbHVlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZihpc05hTih2YWx1ZSkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgdGhpcy5fbWFzdGVyR2Fpbi5nYWluLnZhbHVlID0gdmFsdWU7XG5cbiAgICAgICAgaWYodGhpcy5fY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5fbWFzdGVyR2Fpbi5nYWluLmNhbmNlbFNjaGVkdWxlZFZhbHVlcyh0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lKTtcbiAgICAgICAgICAgIHRoaXMuX21hc3RlckdhaW4uZ2Fpbi5zZXRWYWx1ZUF0VGltZSh2YWx1ZSwgdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZighdGhpcy5oYXNXZWJBdWRpbykge1xuICAgICAgICAgICAgdGhpcy5fc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC52b2x1bWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cblNvbm8ucHJvdG90eXBlLnBhdXNlQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgaWYoc291bmQucGxheWluZykge1xuICAgICAgICAgICAgc291bmQucGF1c2UoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuU29uby5wcm90b3R5cGUucmVzdW1lQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgaWYoc291bmQucGF1c2VkKSB7XG4gICAgICAgICAgICBzb3VuZC5wbGF5KCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cblNvbm8ucHJvdG90eXBlLnN0b3BBbGwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICBzb3VuZC5zdG9wKCk7XG4gICAgfSk7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oaWQsIGRlbGF5LCBvZmZzZXQpIHtcbiAgICB0aGlzLmdldFNvdW5kKGlkKS5wbGF5KGRlbGF5LCBvZmZzZXQpO1xufTtcblxuU29uby5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuZ2V0U291bmQoaWQpLnBhdXNlKCk7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oaWQpIHtcbiAgICB0aGlzLmdldFNvdW5kKGlkKS5zdG9wKCk7XG59O1xuXG4vKlxuICogTW9iaWxlIHRvdWNoIGxvY2tcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5faGFuZGxlVG91Y2hsb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9uVW5sb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuX2lzVG91Y2hMb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgICAgIHNvdW5kLmlzVG91Y2hMb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIGlmKHNvdW5kLmxvYWRlcikge1xuICAgICAgICAgICAgICAgIHNvdW5kLmxvYWRlci5pc1RvdWNoTG9ja2VkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgdGhpcy5faXNUb3VjaExvY2tlZCA9IFV0aWxzLmhhbmRsZVRvdWNobG9jayhvblVubG9jaywgdGhpcyk7XG59O1xuXG4vKlxuICogUGFnZSB2aXNpYmlsaXR5IGV2ZW50c1xuICovXG5cblNvbm8ucHJvdG90eXBlLl9oYW5kbGVQYWdlVmlzaWJpbGl0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYWdlSGlkZGVuUGF1c2VkID0gW10sXG4gICAgICAgIHNvdW5kcyA9IHRoaXMuX3NvdW5kcztcblxuICAgIC8vIHBhdXNlIGN1cnJlbnRseSBwbGF5aW5nIHNvdW5kcyBhbmQgc3RvcmUgcmVmc1xuICAgIGZ1bmN0aW9uIG9uSGlkZGVuKCkge1xuICAgICAgICBzb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICAgICAgaWYoc291bmQucGxheWluZykge1xuICAgICAgICAgICAgICAgIHNvdW5kLnBhdXNlKCk7XG4gICAgICAgICAgICAgICAgcGFnZUhpZGRlblBhdXNlZC5wdXNoKHNvdW5kKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gcGxheSBzb3VuZHMgdGhhdCBnb3QgcGF1c2VkIHdoZW4gcGFnZSB3YXMgaGlkZGVuXG4gICAgZnVuY3Rpb24gb25TaG93bigpIHtcbiAgICAgICAgd2hpbGUocGFnZUhpZGRlblBhdXNlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhZ2VIaWRkZW5QYXVzZWQucG9wKCkucGxheSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgVXRpbHMuaGFuZGxlUGFnZVZpc2liaWxpdHkob25IaWRkZW4sIG9uU2hvd24sIHRoaXMpO1xufTtcblxuLypcbiAqIExvZyB2ZXJzaW9uICYgZGV2aWNlIHN1cHBvcnQgaW5mb1xuICovXG5cblNvbm8ucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aXRsZSA9ICdTb25vICcgKyB0aGlzLlZFUlNJT04sXG4gICAgICAgIGluZm8gPSAnU3VwcG9ydGVkOicgKyB0aGlzLmlzU3VwcG9ydGVkICtcbiAgICAgICAgICAgICAgICcgV2ViQXVkaW9BUEk6JyArIHRoaXMuaGFzV2ViQXVkaW8gK1xuICAgICAgICAgICAgICAgJyBUb3VjaExvY2tlZDonICsgdGhpcy5faXNUb3VjaExvY2tlZCArXG4gICAgICAgICAgICAgICAnIEV4dGVuc2lvbnM6JyArIFN1cHBvcnQuZXh0ZW5zaW9ucztcblxuICAgIGlmKG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignQ2hyb21lJykgPiAtMSkge1xuICAgICAgICB2YXIgYXJncyA9IFtcbiAgICAgICAgICAgICAgICAnJWMg4pmrICcgKyB0aXRsZSArXG4gICAgICAgICAgICAgICAgJyDimasgJWMgJyArIGluZm8gKyAnICcsXG4gICAgICAgICAgICAgICAgJ2NvbG9yOiAjRkZGRkZGOyBiYWNrZ3JvdW5kOiAjMzc5RjdBJyxcbiAgICAgICAgICAgICAgICAnY29sb3I6ICMxRjFDMEQ7IGJhY2tncm91bmQ6ICNFMEZCQUMnXG4gICAgICAgICAgICBdO1xuICAgICAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmdzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAod2luZG93LmNvbnNvbGUgJiYgd2luZG93LmNvbnNvbGUubG9nLmNhbGwpIHtcbiAgICAgICAgY29uc29sZS5sb2cuY2FsbChjb25zb2xlLCB0aXRsZSArICcgJyArIGluZm8pO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2NhblBsYXknLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFN1cHBvcnQuY2FuUGxheTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnY29udGV4dCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnZWZmZWN0Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lZmZlY3Q7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2V4dGVuc2lvbnMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFN1cHBvcnQuZXh0ZW5zaW9ucztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnaGFzV2ViQXVkaW8nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuICEhdGhpcy5fY29udGV4dDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnaXNTdXBwb3J0ZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFN1cHBvcnQuZXh0ZW5zaW9ucy5sZW5ndGggPiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdtYXN0ZXJHYWluJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXN0ZXJHYWluO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdzb3VuZHMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdW5kcztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAndXRpbHMnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFV0aWxzO1xuICAgIH1cbn0pO1xuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFNvbm8oKTtcbiIsIi8qanNsaW50IG9uZXZhcjp0cnVlLCB1bmRlZjp0cnVlLCBuZXdjYXA6dHJ1ZSwgcmVnZXhwOnRydWUsIGJpdHdpc2U6dHJ1ZSwgbWF4ZXJyOjUwLCBpbmRlbnQ6NCwgd2hpdGU6ZmFsc2UsIG5vbWVuOmZhbHNlLCBwbHVzcGx1czpmYWxzZSAqL1xuLypnbG9iYWwgZGVmaW5lOmZhbHNlLCByZXF1aXJlOmZhbHNlLCBleHBvcnRzOmZhbHNlLCBtb2R1bGU6ZmFsc2UsIHNpZ25hbHM6ZmFsc2UgKi9cblxuLyoqIEBsaWNlbnNlXG4gKiBKUyBTaWduYWxzIDxodHRwOi8vbWlsbGVybWVkZWlyb3MuZ2l0aHViLmNvbS9qcy1zaWduYWxzLz5cbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICogQXV0aG9yOiBNaWxsZXIgTWVkZWlyb3NcbiAqIFZlcnNpb246IDEuMC4wIC0gQnVpbGQ6IDI2OCAoMjAxMi8xMS8yOSAwNTo0OCBQTSlcbiAqL1xuXG4oZnVuY3Rpb24oZ2xvYmFsKXtcblxuICAgIC8vIFNpZ25hbEJpbmRpbmcgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogT2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIGJpbmRpbmcgYmV0d2VlbiBhIFNpZ25hbCBhbmQgYSBsaXN0ZW5lciBmdW5jdGlvbi5cbiAgICAgKiA8YnIgLz4tIDxzdHJvbmc+VGhpcyBpcyBhbiBpbnRlcm5hbCBjb25zdHJ1Y3RvciBhbmQgc2hvdWxkbid0IGJlIGNhbGxlZCBieSByZWd1bGFyIHVzZXJzLjwvc3Ryb25nPlxuICAgICAqIDxiciAvPi0gaW5zcGlyZWQgYnkgSm9hIEViZXJ0IEFTMyBTaWduYWxCaW5kaW5nIGFuZCBSb2JlcnQgUGVubmVyJ3MgU2xvdCBjbGFzc2VzLlxuICAgICAqIEBhdXRob3IgTWlsbGVyIE1lZGVpcm9zXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICogQGludGVybmFsXG4gICAgICogQG5hbWUgU2lnbmFsQmluZGluZ1xuICAgICAqIEBwYXJhbSB7U2lnbmFsfSBzaWduYWwgUmVmZXJlbmNlIHRvIFNpZ25hbCBvYmplY3QgdGhhdCBsaXN0ZW5lciBpcyBjdXJyZW50bHkgYm91bmQgdG8uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgSGFuZGxlciBmdW5jdGlvbiBib3VuZCB0byB0aGUgc2lnbmFsLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNPbmNlIElmIGJpbmRpbmcgc2hvdWxkIGJlIGV4ZWN1dGVkIGp1c3Qgb25jZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2xpc3RlbmVyQ29udGV4dF0gQ29udGV4dCBvbiB3aGljaCBsaXN0ZW5lciB3aWxsIGJlIGV4ZWN1dGVkIChvYmplY3QgdGhhdCBzaG91bGQgcmVwcmVzZW50IHRoZSBgdGhpc2AgdmFyaWFibGUgaW5zaWRlIGxpc3RlbmVyIGZ1bmN0aW9uKS5cbiAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ByaW9yaXR5XSBUaGUgcHJpb3JpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50IGxpc3RlbmVyLiAoZGVmYXVsdCA9IDApLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFNpZ25hbEJpbmRpbmcoc2lnbmFsLCBsaXN0ZW5lciwgaXNPbmNlLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhhbmRsZXIgZnVuY3Rpb24gYm91bmQgdG8gdGhlIHNpZ25hbC5cbiAgICAgICAgICogQHR5cGUgRnVuY3Rpb25cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX2xpc3RlbmVyID0gbGlzdGVuZXI7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIGJpbmRpbmcgc2hvdWxkIGJlIGV4ZWN1dGVkIGp1c3Qgb25jZS5cbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5faXNPbmNlID0gaXNPbmNlO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb250ZXh0IG9uIHdoaWNoIGxpc3RlbmVyIHdpbGwgYmUgZXhlY3V0ZWQgKG9iamVjdCB0aGF0IHNob3VsZCByZXByZXNlbnQgdGhlIGB0aGlzYCB2YXJpYWJsZSBpbnNpZGUgbGlzdGVuZXIgZnVuY3Rpb24pLlxuICAgICAgICAgKiBAbWVtYmVyT2YgU2lnbmFsQmluZGluZy5wcm90b3R5cGVcbiAgICAgICAgICogQG5hbWUgY29udGV4dFxuICAgICAgICAgKiBAdHlwZSBPYmplY3R8dW5kZWZpbmVkfG51bGxcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29udGV4dCA9IGxpc3RlbmVyQ29udGV4dDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVmZXJlbmNlIHRvIFNpZ25hbCBvYmplY3QgdGhhdCBsaXN0ZW5lciBpcyBjdXJyZW50bHkgYm91bmQgdG8uXG4gICAgICAgICAqIEB0eXBlIFNpZ25hbFxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fc2lnbmFsID0gc2lnbmFsO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBMaXN0ZW5lciBwcmlvcml0eVxuICAgICAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX3ByaW9yaXR5ID0gcHJpb3JpdHkgfHwgMDtcbiAgICB9XG5cbiAgICBTaWduYWxCaW5kaW5nLnByb3RvdHlwZSA9IHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgYmluZGluZyBpcyBhY3RpdmUgYW5kIHNob3VsZCBiZSBleGVjdXRlZC5cbiAgICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAgKi9cbiAgICAgICAgYWN0aXZlIDogdHJ1ZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVmYXVsdCBwYXJhbWV0ZXJzIHBhc3NlZCB0byBsaXN0ZW5lciBkdXJpbmcgYFNpZ25hbC5kaXNwYXRjaGAgYW5kIGBTaWduYWxCaW5kaW5nLmV4ZWN1dGVgLiAoY3VycmllZCBwYXJhbWV0ZXJzKVxuICAgICAgICAgKiBAdHlwZSBBcnJheXxudWxsXG4gICAgICAgICAqL1xuICAgICAgICBwYXJhbXMgOiBudWxsLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDYWxsIGxpc3RlbmVyIHBhc3NpbmcgYXJiaXRyYXJ5IHBhcmFtZXRlcnMuXG4gICAgICAgICAqIDxwPklmIGJpbmRpbmcgd2FzIGFkZGVkIHVzaW5nIGBTaWduYWwuYWRkT25jZSgpYCBpdCB3aWxsIGJlIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZCBmcm9tIHNpZ25hbCBkaXNwYXRjaCBxdWV1ZSwgdGhpcyBtZXRob2QgaXMgdXNlZCBpbnRlcm5hbGx5IGZvciB0aGUgc2lnbmFsIGRpc3BhdGNoLjwvcD5cbiAgICAgICAgICogQHBhcmFtIHtBcnJheX0gW3BhcmFtc0Fycl0gQXJyYXkgb2YgcGFyYW1ldGVycyB0aGF0IHNob3VsZCBiZSBwYXNzZWQgdG8gdGhlIGxpc3RlbmVyXG4gICAgICAgICAqIEByZXR1cm4geyp9IFZhbHVlIHJldHVybmVkIGJ5IHRoZSBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGV4ZWN1dGUgOiBmdW5jdGlvbiAocGFyYW1zQXJyKSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlclJldHVybiwgcGFyYW1zO1xuICAgICAgICAgICAgaWYgKHRoaXMuYWN0aXZlICYmICEhdGhpcy5fbGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMgPSB0aGlzLnBhcmFtcz8gdGhpcy5wYXJhbXMuY29uY2F0KHBhcmFtc0FycikgOiBwYXJhbXNBcnI7XG4gICAgICAgICAgICAgICAgaGFuZGxlclJldHVybiA9IHRoaXMuX2xpc3RlbmVyLmFwcGx5KHRoaXMuY29udGV4dCwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5faXNPbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGV0YWNoKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXJSZXR1cm47XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERldGFjaCBiaW5kaW5nIGZyb20gc2lnbmFsLlxuICAgICAgICAgKiAtIGFsaWFzIHRvOiBteVNpZ25hbC5yZW1vdmUobXlCaW5kaW5nLmdldExpc3RlbmVyKCkpO1xuICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbnxudWxsfSBIYW5kbGVyIGZ1bmN0aW9uIGJvdW5kIHRvIHRoZSBzaWduYWwgb3IgYG51bGxgIGlmIGJpbmRpbmcgd2FzIHByZXZpb3VzbHkgZGV0YWNoZWQuXG4gICAgICAgICAqL1xuICAgICAgICBkZXRhY2ggOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pc0JvdW5kKCk/IHRoaXMuX3NpZ25hbC5yZW1vdmUodGhpcy5fbGlzdGVuZXIsIHRoaXMuY29udGV4dCkgOiBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufSBgdHJ1ZWAgaWYgYmluZGluZyBpcyBzdGlsbCBib3VuZCB0byB0aGUgc2lnbmFsIGFuZCBoYXZlIGEgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBpc0JvdW5kIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICghIXRoaXMuX3NpZ25hbCAmJiAhIXRoaXMuX2xpc3RlbmVyKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7Ym9vbGVhbn0gSWYgU2lnbmFsQmluZGluZyB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgb25jZS5cbiAgICAgICAgICovXG4gICAgICAgIGlzT25jZSA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pc09uY2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBIYW5kbGVyIGZ1bmN0aW9uIGJvdW5kIHRvIHRoZSBzaWduYWwuXG4gICAgICAgICAqL1xuICAgICAgICBnZXRMaXN0ZW5lciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9saXN0ZW5lcjtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7U2lnbmFsfSBTaWduYWwgdGhhdCBsaXN0ZW5lciBpcyBjdXJyZW50bHkgYm91bmQgdG8uXG4gICAgICAgICAqL1xuICAgICAgICBnZXRTaWduYWwgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc2lnbmFsO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWxldGUgaW5zdGFuY2UgcHJvcGVydGllc1xuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX2Rlc3Ryb3kgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fc2lnbmFsO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2xpc3RlbmVyO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuY29udGV4dDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7c3RyaW5nfSBTdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgIHRvU3RyaW5nIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICdbU2lnbmFsQmluZGluZyBpc09uY2U6JyArIHRoaXMuX2lzT25jZSArJywgaXNCb3VuZDonKyB0aGlzLmlzQm91bmQoKSArJywgYWN0aXZlOicgKyB0aGlzLmFjdGl2ZSArICddJztcbiAgICAgICAgfVxuXG4gICAgfTtcblxuXG4vKmdsb2JhbCBTaWduYWxCaW5kaW5nOmZhbHNlKi9cblxuICAgIC8vIFNpZ25hbCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgZnVuY3Rpb24gdmFsaWRhdGVMaXN0ZW5lcihsaXN0ZW5lciwgZm5OYW1lKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ2xpc3RlbmVyIGlzIGEgcmVxdWlyZWQgcGFyYW0gb2Yge2ZufSgpIGFuZCBzaG91bGQgYmUgYSBGdW5jdGlvbi4nLnJlcGxhY2UoJ3tmbn0nLCBmbk5hbWUpICk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gZXZlbnQgYnJvYWRjYXN0ZXJcbiAgICAgKiA8YnIgLz4tIGluc3BpcmVkIGJ5IFJvYmVydCBQZW5uZXIncyBBUzMgU2lnbmFscy5cbiAgICAgKiBAbmFtZSBTaWduYWxcbiAgICAgKiBAYXV0aG9yIE1pbGxlciBNZWRlaXJvc1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIGZ1bmN0aW9uIFNpZ25hbCgpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEB0eXBlIEFycmF5LjxTaWduYWxCaW5kaW5nPlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fYmluZGluZ3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcHJldlBhcmFtcyA9IG51bGw7XG5cbiAgICAgICAgLy8gZW5mb3JjZSBkaXNwYXRjaCB0byBhd2F5cyB3b3JrIG9uIHNhbWUgY29udGV4dCAoIzQ3KVxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2ggPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgU2lnbmFsLnByb3RvdHlwZS5kaXNwYXRjaC5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIFNpZ25hbC5wcm90b3R5cGUgPSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNpZ25hbHMgVmVyc2lvbiBOdW1iZXJcbiAgICAgICAgICogQHR5cGUgU3RyaW5nXG4gICAgICAgICAqIEBjb25zdFxuICAgICAgICAgKi9cbiAgICAgICAgVkVSU0lPTiA6ICcxLjAuMCcsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIFNpZ25hbCBzaG91bGQga2VlcCByZWNvcmQgb2YgcHJldmlvdXNseSBkaXNwYXRjaGVkIHBhcmFtZXRlcnMgYW5kXG4gICAgICAgICAqIGF1dG9tYXRpY2FsbHkgZXhlY3V0ZSBsaXN0ZW5lciBkdXJpbmcgYGFkZCgpYC9gYWRkT25jZSgpYCBpZiBTaWduYWwgd2FzXG4gICAgICAgICAqIGFscmVhZHkgZGlzcGF0Y2hlZCBiZWZvcmUuXG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICovXG4gICAgICAgIG1lbW9yaXplIDogZmFsc2UsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9zaG91bGRQcm9wYWdhdGUgOiB0cnVlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiBTaWduYWwgaXMgYWN0aXZlIGFuZCBzaG91bGQgYnJvYWRjYXN0IGV2ZW50cy5cbiAgICAgICAgICogPHA+PHN0cm9uZz5JTVBPUlRBTlQ6PC9zdHJvbmc+IFNldHRpbmcgdGhpcyBwcm9wZXJ0eSBkdXJpbmcgYSBkaXNwYXRjaCB3aWxsIG9ubHkgYWZmZWN0IHRoZSBuZXh0IGRpc3BhdGNoLCBpZiB5b3Ugd2FudCB0byBzdG9wIHRoZSBwcm9wYWdhdGlvbiBvZiBhIHNpZ25hbCB1c2UgYGhhbHQoKWAgaW5zdGVhZC48L3A+XG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICovXG4gICAgICAgIGFjdGl2ZSA6IHRydWUsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNPbmNlXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbbGlzdGVuZXJDb250ZXh0XVxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ByaW9yaXR5XVxuICAgICAgICAgKiBAcmV0dXJuIHtTaWduYWxCaW5kaW5nfVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX3JlZ2lzdGVyTGlzdGVuZXIgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGlzT25jZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSkge1xuXG4gICAgICAgICAgICB2YXIgcHJldkluZGV4ID0gdGhpcy5faW5kZXhPZkxpc3RlbmVyKGxpc3RlbmVyLCBsaXN0ZW5lckNvbnRleHQpLFxuICAgICAgICAgICAgICAgIGJpbmRpbmc7XG5cbiAgICAgICAgICAgIGlmIChwcmV2SW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgYmluZGluZyA9IHRoaXMuX2JpbmRpbmdzW3ByZXZJbmRleF07XG4gICAgICAgICAgICAgICAgaWYgKGJpbmRpbmcuaXNPbmNlKCkgIT09IGlzT25jZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBjYW5ub3QgYWRkJysgKGlzT25jZT8gJycgOiAnT25jZScpICsnKCkgdGhlbiBhZGQnKyAoIWlzT25jZT8gJycgOiAnT25jZScpICsnKCkgdGhlIHNhbWUgbGlzdGVuZXIgd2l0aG91dCByZW1vdmluZyB0aGUgcmVsYXRpb25zaGlwIGZpcnN0LicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYmluZGluZyA9IG5ldyBTaWduYWxCaW5kaW5nKHRoaXMsIGxpc3RlbmVyLCBpc09uY2UsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2FkZEJpbmRpbmcoYmluZGluZyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKHRoaXMubWVtb3JpemUgJiYgdGhpcy5fcHJldlBhcmFtcyl7XG4gICAgICAgICAgICAgICAgYmluZGluZy5leGVjdXRlKHRoaXMuX3ByZXZQYXJhbXMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gYmluZGluZztcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtTaWduYWxCaW5kaW5nfSBiaW5kaW5nXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfYWRkQmluZGluZyA6IGZ1bmN0aW9uIChiaW5kaW5nKSB7XG4gICAgICAgICAgICAvL3NpbXBsaWZpZWQgaW5zZXJ0aW9uIHNvcnRcbiAgICAgICAgICAgIHZhciBuID0gdGhpcy5fYmluZGluZ3MubGVuZ3RoO1xuICAgICAgICAgICAgZG8geyAtLW47IH0gd2hpbGUgKHRoaXMuX2JpbmRpbmdzW25dICYmIGJpbmRpbmcuX3ByaW9yaXR5IDw9IHRoaXMuX2JpbmRpbmdzW25dLl9wcmlvcml0eSk7XG4gICAgICAgICAgICB0aGlzLl9iaW5kaW5ncy5zcGxpY2UobiArIDEsIDAsIGJpbmRpbmcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgICAgICAgKiBAcmV0dXJuIHtudW1iZXJ9XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfaW5kZXhPZkxpc3RlbmVyIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgbiA9IHRoaXMuX2JpbmRpbmdzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBjdXI7XG4gICAgICAgICAgICB3aGlsZSAobi0tKSB7XG4gICAgICAgICAgICAgICAgY3VyID0gdGhpcy5fYmluZGluZ3Nbbl07XG4gICAgICAgICAgICAgICAgaWYgKGN1ci5fbGlzdGVuZXIgPT09IGxpc3RlbmVyICYmIGN1ci5jb250ZXh0ID09PSBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2hlY2sgaWYgbGlzdGVuZXIgd2FzIGF0dGFjaGVkIHRvIFNpZ25hbC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXJcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtjb250ZXh0XVxuICAgICAgICAgKiBAcmV0dXJuIHtib29sZWFufSBpZiBTaWduYWwgaGFzIHRoZSBzcGVjaWZpZWQgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBoYXMgOiBmdW5jdGlvbiAobGlzdGVuZXIsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pbmRleE9mTGlzdGVuZXIobGlzdGVuZXIsIGNvbnRleHQpICE9PSAtMTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkIGEgbGlzdGVuZXIgdG8gdGhlIHNpZ25hbC5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgU2lnbmFsIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbbGlzdGVuZXJDb250ZXh0XSBDb250ZXh0IG9uIHdoaWNoIGxpc3RlbmVyIHdpbGwgYmUgZXhlY3V0ZWQgKG9iamVjdCB0aGF0IHNob3VsZCByZXByZXNlbnQgdGhlIGB0aGlzYCB2YXJpYWJsZSBpbnNpZGUgbGlzdGVuZXIgZnVuY3Rpb24pLlxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ByaW9yaXR5XSBUaGUgcHJpb3JpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50IGxpc3RlbmVyLiBMaXN0ZW5lcnMgd2l0aCBoaWdoZXIgcHJpb3JpdHkgd2lsbCBiZSBleGVjdXRlZCBiZWZvcmUgbGlzdGVuZXJzIHdpdGggbG93ZXIgcHJpb3JpdHkuIExpc3RlbmVycyB3aXRoIHNhbWUgcHJpb3JpdHkgbGV2ZWwgd2lsbCBiZSBleGVjdXRlZCBhdCB0aGUgc2FtZSBvcmRlciBhcyB0aGV5IHdlcmUgYWRkZWQuIChkZWZhdWx0ID0gMClcbiAgICAgICAgICogQHJldHVybiB7U2lnbmFsQmluZGluZ30gQW4gT2JqZWN0IHJlcHJlc2VudGluZyB0aGUgYmluZGluZyBiZXR3ZWVuIHRoZSBTaWduYWwgYW5kIGxpc3RlbmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgYWRkIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KSB7XG4gICAgICAgICAgICB2YWxpZGF0ZUxpc3RlbmVyKGxpc3RlbmVyLCAnYWRkJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcmVnaXN0ZXJMaXN0ZW5lcihsaXN0ZW5lciwgZmFsc2UsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBZGQgbGlzdGVuZXIgdG8gdGhlIHNpZ25hbCB0aGF0IHNob3VsZCBiZSByZW1vdmVkIGFmdGVyIGZpcnN0IGV4ZWN1dGlvbiAod2lsbCBiZSBleGVjdXRlZCBvbmx5IG9uY2UpLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBTaWduYWwgaGFuZGxlciBmdW5jdGlvbi5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtsaXN0ZW5lckNvbnRleHRdIENvbnRleHQgb24gd2hpY2ggbGlzdGVuZXIgd2lsbCBiZSBleGVjdXRlZCAob2JqZWN0IHRoYXQgc2hvdWxkIHJlcHJlc2VudCB0aGUgYHRoaXNgIHZhcmlhYmxlIGluc2lkZSBsaXN0ZW5lciBmdW5jdGlvbikuXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBbcHJpb3JpdHldIFRoZSBwcmlvcml0eSBsZXZlbCBvZiB0aGUgZXZlbnQgbGlzdGVuZXIuIExpc3RlbmVycyB3aXRoIGhpZ2hlciBwcmlvcml0eSB3aWxsIGJlIGV4ZWN1dGVkIGJlZm9yZSBsaXN0ZW5lcnMgd2l0aCBsb3dlciBwcmlvcml0eS4gTGlzdGVuZXJzIHdpdGggc2FtZSBwcmlvcml0eSBsZXZlbCB3aWxsIGJlIGV4ZWN1dGVkIGF0IHRoZSBzYW1lIG9yZGVyIGFzIHRoZXkgd2VyZSBhZGRlZC4gKGRlZmF1bHQgPSAwKVxuICAgICAgICAgKiBAcmV0dXJuIHtTaWduYWxCaW5kaW5nfSBBbiBPYmplY3QgcmVwcmVzZW50aW5nIHRoZSBiaW5kaW5nIGJldHdlZW4gdGhlIFNpZ25hbCBhbmQgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBhZGRPbmNlIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KSB7XG4gICAgICAgICAgICB2YWxpZGF0ZUxpc3RlbmVyKGxpc3RlbmVyLCAnYWRkT25jZScpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlZ2lzdGVyTGlzdGVuZXIobGlzdGVuZXIsIHRydWUsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmUgYSBzaW5nbGUgbGlzdGVuZXIgZnJvbSB0aGUgZGlzcGF0Y2ggcXVldWUuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIEhhbmRsZXIgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgcmVtb3ZlZC5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IFtjb250ZXh0XSBFeGVjdXRpb24gY29udGV4dCAoc2luY2UgeW91IGNhbiBhZGQgdGhlIHNhbWUgaGFuZGxlciBtdWx0aXBsZSB0aW1lcyBpZiBleGVjdXRpbmcgaW4gYSBkaWZmZXJlbnQgY29udGV4dCkuXG4gICAgICAgICAqIEByZXR1cm4ge0Z1bmN0aW9ufSBMaXN0ZW5lciBoYW5kbGVyIGZ1bmN0aW9uLlxuICAgICAgICAgKi9cbiAgICAgICAgcmVtb3ZlIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICB2YWxpZGF0ZUxpc3RlbmVyKGxpc3RlbmVyLCAncmVtb3ZlJyk7XG5cbiAgICAgICAgICAgIHZhciBpID0gdGhpcy5faW5kZXhPZkxpc3RlbmVyKGxpc3RlbmVyLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmIChpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzW2ldLl9kZXN0cm95KCk7IC8vbm8gcmVhc29uIHRvIGEgU2lnbmFsQmluZGluZyBleGlzdCBpZiBpdCBpc24ndCBhdHRhY2hlZCB0byBhIHNpZ25hbFxuICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBsaXN0ZW5lcjtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIGFsbCBsaXN0ZW5lcnMgZnJvbSB0aGUgU2lnbmFsLlxuICAgICAgICAgKi9cbiAgICAgICAgcmVtb3ZlQWxsIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG4gPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGg7XG4gICAgICAgICAgICB3aGlsZSAobi0tKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYmluZGluZ3Nbbl0uX2Rlc3Ryb3koKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzLmxlbmd0aCA9IDA7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge251bWJlcn0gTnVtYmVyIG9mIGxpc3RlbmVycyBhdHRhY2hlZCB0byB0aGUgU2lnbmFsLlxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0TnVtTGlzdGVuZXJzIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2JpbmRpbmdzLmxlbmd0aDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogU3RvcCBwcm9wYWdhdGlvbiBvZiB0aGUgZXZlbnQsIGJsb2NraW5nIHRoZSBkaXNwYXRjaCB0byBuZXh0IGxpc3RlbmVycyBvbiB0aGUgcXVldWUuXG4gICAgICAgICAqIDxwPjxzdHJvbmc+SU1QT1JUQU5UOjwvc3Ryb25nPiBzaG91bGQgYmUgY2FsbGVkIG9ubHkgZHVyaW5nIHNpZ25hbCBkaXNwYXRjaCwgY2FsbGluZyBpdCBiZWZvcmUvYWZ0ZXIgZGlzcGF0Y2ggd29uJ3QgYWZmZWN0IHNpZ25hbCBicm9hZGNhc3QuPC9wPlxuICAgICAgICAgKiBAc2VlIFNpZ25hbC5wcm90b3R5cGUuZGlzYWJsZVxuICAgICAgICAgKi9cbiAgICAgICAgaGFsdCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuX3Nob3VsZFByb3BhZ2F0ZSA9IGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEaXNwYXRjaC9Ccm9hZGNhc3QgU2lnbmFsIHRvIGFsbCBsaXN0ZW5lcnMgYWRkZWQgdG8gdGhlIHF1ZXVlLlxuICAgICAgICAgKiBAcGFyYW0gey4uLip9IFtwYXJhbXNdIFBhcmFtZXRlcnMgdGhhdCBzaG91bGQgYmUgcGFzc2VkIHRvIGVhY2ggaGFuZGxlci5cbiAgICAgICAgICovXG4gICAgICAgIGRpc3BhdGNoIDogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgaWYgKCEgdGhpcy5hY3RpdmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwYXJhbXNBcnIgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLFxuICAgICAgICAgICAgICAgIG4gPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgYmluZGluZ3M7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLm1lbW9yaXplKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcHJldlBhcmFtcyA9IHBhcmFtc0FycjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCEgbikge1xuICAgICAgICAgICAgICAgIC8vc2hvdWxkIGNvbWUgYWZ0ZXIgbWVtb3JpemVcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJpbmRpbmdzID0gdGhpcy5fYmluZGluZ3Muc2xpY2UoKTsgLy9jbG9uZSBhcnJheSBpbiBjYXNlIGFkZC9yZW1vdmUgaXRlbXMgZHVyaW5nIGRpc3BhdGNoXG4gICAgICAgICAgICB0aGlzLl9zaG91bGRQcm9wYWdhdGUgPSB0cnVlOyAvL2luIGNhc2UgYGhhbHRgIHdhcyBjYWxsZWQgYmVmb3JlIGRpc3BhdGNoIG9yIGR1cmluZyB0aGUgcHJldmlvdXMgZGlzcGF0Y2guXG5cbiAgICAgICAgICAgIC8vZXhlY3V0ZSBhbGwgY2FsbGJhY2tzIHVudGlsIGVuZCBvZiB0aGUgbGlzdCBvciB1bnRpbCBhIGNhbGxiYWNrIHJldHVybnMgYGZhbHNlYCBvciBzdG9wcyBwcm9wYWdhdGlvblxuICAgICAgICAgICAgLy9yZXZlcnNlIGxvb3Agc2luY2UgbGlzdGVuZXJzIHdpdGggaGlnaGVyIHByaW9yaXR5IHdpbGwgYmUgYWRkZWQgYXQgdGhlIGVuZCBvZiB0aGUgbGlzdFxuICAgICAgICAgICAgZG8geyBuLS07IH0gd2hpbGUgKGJpbmRpbmdzW25dICYmIHRoaXMuX3Nob3VsZFByb3BhZ2F0ZSAmJiBiaW5kaW5nc1tuXS5leGVjdXRlKHBhcmFtc0FycikgIT09IGZhbHNlKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRm9yZ2V0IG1lbW9yaXplZCBhcmd1bWVudHMuXG4gICAgICAgICAqIEBzZWUgU2lnbmFsLm1lbW9yaXplXG4gICAgICAgICAqL1xuICAgICAgICBmb3JnZXQgOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdGhpcy5fcHJldlBhcmFtcyA9IG51bGw7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZSBhbGwgYmluZGluZ3MgZnJvbSBzaWduYWwgYW5kIGRlc3Ryb3kgYW55IHJlZmVyZW5jZSB0byBleHRlcm5hbCBvYmplY3RzIChkZXN0cm95IFNpZ25hbCBvYmplY3QpLlxuICAgICAgICAgKiA8cD48c3Ryb25nPklNUE9SVEFOVDo8L3N0cm9uZz4gY2FsbGluZyBhbnkgbWV0aG9kIG9uIHRoZSBzaWduYWwgaW5zdGFuY2UgYWZ0ZXIgY2FsbGluZyBkaXNwb3NlIHdpbGwgdGhyb3cgZXJyb3JzLjwvcD5cbiAgICAgICAgICovXG4gICAgICAgIGRpc3Bvc2UgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUFsbCgpO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2JpbmRpbmdzO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3ByZXZQYXJhbXM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gU3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICB0b1N0cmluZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAnW1NpZ25hbCBhY3RpdmU6JysgdGhpcy5hY3RpdmUgKycgbnVtTGlzdGVuZXJzOicrIHRoaXMuZ2V0TnVtTGlzdGVuZXJzKCkgKyddJztcbiAgICAgICAgfVxuXG4gICAgfTtcblxuXG4gICAgLy8gTmFtZXNwYWNlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAvKipcbiAgICAgKiBTaWduYWxzIG5hbWVzcGFjZVxuICAgICAqIEBuYW1lc3BhY2VcbiAgICAgKiBAbmFtZSBzaWduYWxzXG4gICAgICovXG4gICAgdmFyIHNpZ25hbHMgPSBTaWduYWw7XG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gZXZlbnQgYnJvYWRjYXN0ZXJcbiAgICAgKiBAc2VlIFNpZ25hbFxuICAgICAqL1xuICAgIC8vIGFsaWFzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSAoc2VlICNnaC00NClcbiAgICBzaWduYWxzLlNpZ25hbCA9IFNpZ25hbDtcblxuXG5cbiAgICAvL2V4cG9ydHMgdG8gbXVsdGlwbGUgZW52aXJvbm1lbnRzXG4gICAgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKXsgLy9BTURcbiAgICAgICAgZGVmaW5lKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHNpZ25hbHM7IH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpeyAvL25vZGVcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBzaWduYWxzO1xuICAgIH0gZWxzZSB7IC8vYnJvd3NlclxuICAgICAgICAvL3VzZSBzdHJpbmcgYmVjYXVzZSBvZiBHb29nbGUgY2xvc3VyZSBjb21waWxlciBBRFZBTkNFRF9NT0RFXG4gICAgICAgIC8qanNsaW50IHN1Yjp0cnVlICovXG4gICAgICAgIGdsb2JhbFsnc2lnbmFscyddID0gc2lnbmFscztcbiAgICB9XG5cbn0odGhpcykpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQW5hbHlzZXIgPSByZXF1aXJlKCcuL2VmZmVjdC9hbmFseXNlci5qcycpLFxuICAgIERpc3RvcnRpb24gPSByZXF1aXJlKCcuL2VmZmVjdC9kaXN0b3J0aW9uLmpzJyksXG4gICAgRWNobyA9IHJlcXVpcmUoJy4vZWZmZWN0L2VjaG8uanMnKSxcbiAgICBGYWtlQ29udGV4dCA9IHJlcXVpcmUoJy4vZWZmZWN0L2Zha2UtY29udGV4dC5qcycpLFxuICAgIEZpbHRlciA9IHJlcXVpcmUoJy4vZWZmZWN0L2ZpbHRlci5qcycpLFxuICAgIEZsYW5nZXIgPSByZXF1aXJlKCcuL2VmZmVjdC9mbGFuZ2VyLmpzJyksXG4gICAgUGFubmVyID0gcmVxdWlyZSgnLi9lZmZlY3QvcGFubmVyLmpzJyksXG4gICAgUGhhc2VyID0gcmVxdWlyZSgnLi9lZmZlY3QvcGhhc2VyLmpzJyksXG4gICAgUmVjb3JkZXIgPSByZXF1aXJlKCcuL2VmZmVjdC9yZWNvcmRlci5qcycpLFxuICAgIFJldmVyYiA9IHJlcXVpcmUoJy4vZWZmZWN0L3JldmVyYi5qcycpO1xuXG5mdW5jdGlvbiBFZmZlY3QoY29udGV4dCkge1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0IHx8IG5ldyBGYWtlQ29udGV4dCgpO1xuICAgIHRoaXMuX2Rlc3RpbmF0aW9uID0gbnVsbDtcbiAgICB0aGlzLl9ub2RlTGlzdCA9IFtdO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsO1xufVxuXG5FZmZlY3QucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICBpZighbm9kZSkgeyByZXR1cm47IH1cbiAgICAvL2NvbnNvbGUubG9nKCdFZmZlY3QuYWRkOicsIG5vZGUpO1xuICAgIHRoaXMuX25vZGVMaXN0LnB1c2gobm9kZSk7XG4gICAgdGhpcy5fdXBkYXRlQ29ubmVjdGlvbnMoKTtcbiAgICByZXR1cm4gbm9kZTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKG5vZGUgPT09IHRoaXMuX25vZGVMaXN0W2ldKSB7XG4gICAgICAgICAgICB0aGlzLl9ub2RlTGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgb3V0cHV0ID0gbm9kZS5fb3V0cHV0IHx8IG5vZGU7XG4gICAgb3V0cHV0LmRpc2Nvbm5lY3QoKTtcbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5yZW1vdmVBbGwgPSBmdW5jdGlvbigpIHtcbiAgICB3aGlsZSh0aGlzLl9ub2RlTGlzdC5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fbm9kZUxpc3QucG9wKCkuZGlzY29ubmVjdCgpO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5fY29ubmVjdCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAvL2NvbnNvbGUubG9nKCc+IGNvbm5lY3QnLCAoYS5uYW1lIHx8IGEuY29uc3RydWN0b3IubmFtZSksICd0bycsIChiLm5hbWUgfHwgYi5jb25zdHJ1Y3Rvci5uYW1lKSk7XG5cbiAgICB2YXIgb3V0cHV0ID0gYS5fb3V0cHV0IHx8IGE7XG4gICAgLy9jb25zb2xlLmxvZygnPiBkaXNjb25uZWN0IG91dHB1dDogJywgKGEubmFtZSB8fCBhLmNvbnN0cnVjdG9yLm5hbWUpKTtcbiAgICBvdXRwdXQuZGlzY29ubmVjdCgpO1xuICAgIC8vY29uc29sZS5sb2coJz4gY29ubmVjdCBvdXRwdXQ6ICcsIChhLm5hbWUgfHwgYS5jb25zdHJ1Y3Rvci5uYW1lKSwgJ3RvIGlucHV0OicsIChiLm5hbWUgfHwgYi5jb25zdHJ1Y3Rvci5uYW1lKSk7XG4gICAgb3V0cHV0LmNvbm5lY3QoYik7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLl9jb25uZWN0VG9EZXN0aW5hdGlvbiA9IGZ1bmN0aW9uKGRlc3RpbmF0aW9uKSB7XG4gICAgdmFyIGwgPSB0aGlzLl9ub2RlTGlzdC5sZW5ndGgsXG4gICAgICAgIGxhc3ROb2RlID0gbCA/IHRoaXMuX25vZGVMaXN0W2wgLSAxXSA6IHRoaXMuX3NvdXJjZU5vZGU7XG5cbiAgICBpZihsYXN0Tm9kZSkge1xuICAgICAgICB0aGlzLl9jb25uZWN0KGxhc3ROb2RlLCBkZXN0aW5hdGlvbik7XG4gICAgfVxuXG4gICAgdGhpcy5fZGVzdGluYXRpb24gPSBkZXN0aW5hdGlvbjtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuX3VwZGF0ZUNvbm5lY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHsgcmV0dXJuOyB9XG5cbiAgICAvL2NvbnNvbGUubG9nKCd1cGRhdGVDb25uZWN0aW9uczonLCB0aGlzLl9ub2RlTGlzdC5sZW5ndGgpO1xuXG4gICAgdmFyIG5vZGUsXG4gICAgICAgIHByZXY7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5vZGUgPSB0aGlzLl9ub2RlTGlzdFtpXTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhpLCBub2RlKTtcbiAgICAgICAgcHJldiA9IGkgPT09IDAgPyB0aGlzLl9zb3VyY2VOb2RlIDogdGhpcy5fbm9kZUxpc3RbaSAtIDFdO1xuICAgICAgICB0aGlzLl9jb25uZWN0KHByZXYsIG5vZGUpO1xuICAgIH1cblxuICAgIGlmKHRoaXMuX2Rlc3RpbmF0aW9uKSB7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3RUb0Rlc3RpbmF0aW9uKHRoaXMuX2Rlc3RpbmF0aW9uKTtcbiAgICB9XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRWZmZWN0LnByb3RvdHlwZSwgJ3Bhbm5pbmcnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3Bhbm5pbmcpIHtcbiAgICAgICAgICAgIHRoaXMuX3Bhbm5pbmcgPSBuZXcgUGFubmVyKHRoaXMuX2NvbnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9wYW5uaW5nO1xuICAgIH1cbn0pO1xuXG4vKlxuICogRWZmZWN0c1xuICovXG5cbkVmZmVjdC5wcm90b3R5cGUuYW5hbHlzZXIgPSBmdW5jdGlvbihmZnRTaXplLCBzbW9vdGhpbmcsIG1pbkRlY2liZWxzLCBtYXhEZWNpYmVscykge1xuICAgIHZhciBhbmFseXNlciA9IG5ldyBBbmFseXNlcih0aGlzLl9jb250ZXh0LCBmZnRTaXplLCBzbW9vdGhpbmcsIG1pbkRlY2liZWxzLCBtYXhEZWNpYmVscyk7XG4gICAgcmV0dXJuIHRoaXMuYWRkKGFuYWx5c2VyKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuY29tcHJlc3NvciA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgICAvLyBsb3dlcnMgdGhlIHZvbHVtZSBvZiB0aGUgbG91ZGVzdCBwYXJ0cyBvZiB0aGUgc2lnbmFsIGFuZCByYWlzZXMgdGhlIHZvbHVtZSBvZiB0aGUgc29mdGVzdCBwYXJ0c1xuICAgIHZhciBub2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVEeW5hbWljc0NvbXByZXNzb3IoKTtcbiAgICAvLyBtaW4gZGVjaWJlbHMgdG8gc3RhcnQgY29tcHJlc3NpbmcgYXQgZnJvbSAtMTAwIHRvIDBcbiAgICBub2RlLnRocmVzaG9sZC52YWx1ZSA9IGNvbmZpZy50aHJlc2hvbGQgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy50aHJlc2hvbGQgOiAtMjQ7XG4gICAgLy8gZGVjaWJlbCB2YWx1ZSB0byBzdGFydCBjdXJ2ZSB0byBjb21wcmVzc2VkIHZhbHVlIGZyb20gMCB0byA0MFxuICAgIG5vZGUua25lZS52YWx1ZSA9IGNvbmZpZy5rbmVlICE9PSB1bmRlZmluZWQgPyBjb25maWcua25lZSA6IDMwO1xuICAgIC8vIGFtb3VudCBvZiBjaGFuZ2UgcGVyIGRlY2liZWwgZnJvbSAxIHRvIDIwXG4gICAgbm9kZS5yYXRpby52YWx1ZSA9IGNvbmZpZy5yYXRpbyAhPT0gdW5kZWZpbmVkID8gY29uZmlnLnJhdGlvIDogMTI7XG4gICAgLy8gZ2FpbiByZWR1Y3Rpb24gY3VycmVudGx5IGFwcGxpZWQgYnkgY29tcHJlc3NvciBmcm9tIC0yMCB0byAwXG4gICAgbm9kZS5yZWR1Y3Rpb24udmFsdWUgPSBjb25maWcucmVkdWN0aW9uICE9PSB1bmRlZmluZWQgPyBjb25maWcucmVkdWN0aW9uIDogLTEwO1xuICAgIC8vIHNlY29uZHMgdG8gcmVkdWNlIGdhaW4gYnkgMTBkYiBmcm9tIDAgdG8gMSAtIGhvdyBxdWlja2x5IHNpZ25hbCBhZGFwdGVkIHdoZW4gdm9sdW1lIGluY3JlYXNlZFxuICAgIG5vZGUuYXR0YWNrLnZhbHVlID0gY29uZmlnLmF0dGFjayAhPT0gdW5kZWZpbmVkID8gY29uZmlnLmF0dGFjayA6IDAuMDAwMztcbiAgICAvLyBzZWNvbmRzIHRvIGluY3JlYXNlIGdhaW4gYnkgMTBkYiBmcm9tIDAgdG8gMSAtIGhvdyBxdWlja2x5IHNpZ25hbCBhZGFwdGVkIHdoZW4gdm9sdW1lIHJlZGN1Y2VkXG4gICAgbm9kZS5yZWxlYXNlLnZhbHVlID0gY29uZmlnLnJlbGVhc2UgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5yZWxlYXNlIDogMC4yNTtcblxuICAgIC8qT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICB0aHJlc2hvbGQ6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLnRocmVzaG9sZC52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbm9kZS50aHJlc2hvbGQudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBrbmVlOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5rbmVlLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLmtuZWUudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICByYXRpbzoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG5vZGUucmF0aW8udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IG5vZGUucmF0aW8udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICByZWR1Y3Rpb246IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLnJlZHVjdGlvbi52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbm9kZS5yZWR1Y3Rpb24udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBhdHRhY2s6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLmF0dGFjay52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbm9kZS5hdHRhY2sudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICByZWxlYXNlOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5yZWxlYXNlLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLnJlbGVhc2UudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7Ki9cblxuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuY29udm9sdmVyID0gZnVuY3Rpb24oaW1wdWxzZVJlc3BvbnNlKSB7XG4gICAgLy8gaW1wdWxzZVJlc3BvbnNlIGlzIGFuIGF1ZGlvIGZpbGUgYnVmZmVyXG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUNvbnZvbHZlcigpO1xuICAgIG5vZGUuYnVmZmVyID0gaW1wdWxzZVJlc3BvbnNlO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbih0aW1lKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZURlbGF5KCk7XG4gICAgaWYodGltZSAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuZGVsYXlUaW1lLnZhbHVlID0gdGltZTsgfVxuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuZWNobyA9IGZ1bmN0aW9uKHRpbWUsIGdhaW4pIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBFY2hvKHRoaXMuX2NvbnRleHQsIHRpbWUsIGdhaW4pO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuZGlzdG9ydGlvbiA9IGZ1bmN0aW9uKGFtb3VudCkge1xuICAgIHZhciBub2RlID0gbmV3IERpc3RvcnRpb24odGhpcy5fY29udGV4dCwgYW1vdW50KTtcbiAgICAvLyBGbG9hdDMyQXJyYXkgZGVmaW5pbmcgY3VydmUgKHZhbHVlcyBhcmUgaW50ZXJwb2xhdGVkKVxuICAgIC8vbm9kZS5jdXJ2ZVxuICAgIC8vIHVwLXNhbXBsZSBiZWZvcmUgYXBwbHlpbmcgY3VydmUgZm9yIGJldHRlciByZXNvbHV0aW9uIHJlc3VsdCAnbm9uZScsICcyeCcgb3IgJzR4J1xuICAgIC8vbm9kZS5vdmVyc2FtcGxlID0gJzJ4JztcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uKHR5cGUsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHZhciBmaWx0ZXIgPSBuZXcgRmlsdGVyKHRoaXMuX2NvbnRleHQsIHR5cGUsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG4gICAgcmV0dXJuIHRoaXMuYWRkKGZpbHRlcik7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLmxvd3Bhc3MgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2xvd3Bhc3MnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5oaWdocGFzcyA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignaGlnaHBhc3MnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5iYW5kcGFzcyA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignYmFuZHBhc3MnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5sb3dzaGVsZiA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignbG93c2hlbGYnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5oaWdoc2hlbGYgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2hpZ2hzaGVsZicsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnBlYWtpbmcgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ3BlYWtpbmcnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5ub3RjaCA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignbm90Y2gnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5hbGxwYXNzID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdhbGxwYXNzJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuZmxhbmdlciA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBub2RlID0gbmV3IEZsYW5nZXIodGhpcy5fY29udGV4dCwgY29uZmlnKTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLmdhaW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBub2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgaWYodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBub2RlLmdhaW4udmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnBhbm5lciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub2RlID0gbmV3IFBhbm5lcih0aGlzLl9jb250ZXh0KTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnBoYXNlciA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBub2RlID0gbmV3IFBoYXNlcih0aGlzLl9jb250ZXh0LCBjb25maWcpO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUucmVjb3JkZXIgPSBmdW5jdGlvbihwYXNzVGhyb3VnaCkge1xuICAgIHZhciBub2RlID0gbmV3IFJlY29yZGVyKHRoaXMuX2NvbnRleHQsIHBhc3NUaHJvdWdoKTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnJldmVyYiA9IGZ1bmN0aW9uKHNlY29uZHMsIGRlY2F5LCByZXZlcnNlKSB7XG4gICAgdmFyIG5vZGUgPSBuZXcgUmV2ZXJiKHRoaXMuX2NvbnRleHQsIHNlY29uZHMsIGRlY2F5LCByZXZlcnNlKTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnNjcmlwdCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgICAvLyBidWZmZXJTaXplIDI1NiAtIDE2Mzg0IChwb3cgMilcbiAgICB2YXIgYnVmZmVyU2l6ZSA9IGNvbmZpZy5idWZmZXJTaXplIHx8IDEwMjQ7XG4gICAgdmFyIGlucHV0Q2hhbm5lbHMgPSBjb25maWcuaW5wdXRDaGFubmVscyA9PT0gdW5kZWZpbmVkID8gMCA6IGlucHV0Q2hhbm5lbHM7XG4gICAgdmFyIG91dHB1dENoYW5uZWxzID0gY29uZmlnLm91dHB1dENoYW5uZWxzID09PSB1bmRlZmluZWQgPyAxIDogb3V0cHV0Q2hhbm5lbHM7XG4gICAgXG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCBpbnB1dENoYW5uZWxzLCBvdXRwdXRDaGFubmVscyk7XG4gICAgXG4gICAgdmFyIHRoaXNBcmcgPSBjb25maWcudGhpc0FyZyB8fCBjb25maWcuY29udGV4dCB8fCBub2RlO1xuICAgIHZhciBjYWxsYmFjayA9IGNvbmZpZy5jYWxsYmFjayB8fCBmdW5jdGlvbigpIHt9O1xuXG4gICAgLy8gYXZhaWxhYmxlIHByb3BzOlxuICAgIC8qXG4gICAgZXZlbnQuaW5wdXRCdWZmZXJcbiAgICBldmVudC5vdXRwdXRCdWZmZXJcbiAgICBldmVudC5wbGF5YmFja1RpbWVcbiAgICAqL1xuICAgIC8vIEV4YW1wbGU6IGdlbmVyYXRlIG5vaXNlXG4gICAgLypcbiAgICB2YXIgb3V0cHV0ID0gZXZlbnQub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgIHZhciBsID0gb3V0cHV0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBvdXRwdXRbaV0gPSBNYXRoLnJhbmRvbSgpO1xuICAgIH1cbiAgICAqL1xuICAgIG5vZGUub25hdWRpb3Byb2Nlc3MgPSBjYWxsYmFjay5iaW5kKHRoaXNBcmcpO1xuXG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5zZXRTb3VyY2UgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG5vZGU7XG4gICAgdGhpcy5fdXBkYXRlQ29ubmVjdGlvbnMoKTtcbiAgICByZXR1cm4gbm9kZTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuc2V0RGVzdGluYXRpb24gPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdGhpcy5fY29ubmVjdFRvRGVzdGluYXRpb24obm9kZSk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVmZmVjdDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQW5hbHlzZXIoY29udGV4dCwgZmZ0U2l6ZSwgc21vb3RoaW5nLCBtaW5EZWNpYmVscywgbWF4RGVjaWJlbHMpIHtcbiAgICBmZnRTaXplID0gZmZ0U2l6ZSB8fCAzMjtcbiAgICB2YXIgd2F2ZWZvcm1EYXRhLCBmcmVxdWVuY3lEYXRhO1xuXG4gICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XG4gICAgbm9kZS5mZnRTaXplID0gZmZ0U2l6ZTsgLy8gZnJlcXVlbmN5QmluQ291bnQgd2lsbCBiZSBoYWxmIHRoaXMgdmFsdWVcblxuICAgIGlmKHNtb290aGluZyAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gc21vb3RoaW5nOyB9XG4gICAgaWYobWluRGVjaWJlbHMgIT09IHVuZGVmaW5lZCkgeyBub2RlLm1pbkRlY2liZWxzID0gbWluRGVjaWJlbHM7IH1cbiAgICBpZihtYXhEZWNpYmVscyAhPT0gdW5kZWZpbmVkKSB7IG5vZGUubWF4RGVjaWJlbHMgPSBtYXhEZWNpYmVsczsgfVxuXG4gICAgdmFyIHVwZGF0ZUZGVFNpemUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoZmZ0U2l6ZSAhPT0gbm9kZS5mZnRTaXplIHx8IHdhdmVmb3JtRGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB3YXZlZm9ybURhdGEgPSBuZXcgVWludDhBcnJheShub2RlLmZmdFNpemUpO1xuICAgICAgICAgICAgZnJlcXVlbmN5RGF0YSA9IG5ldyBVaW50OEFycmF5KG5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xuICAgICAgICAgICAgZmZ0U2l6ZSA9IG5vZGUuZmZ0U2l6ZTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdXBkYXRlRkZUU2l6ZSgpO1xuXG4gICAgbm9kZS5nZXRXYXZlZm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB1cGRhdGVGRlRTaXplKCk7XG4gICAgICAgIHRoaXMuZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKHdhdmVmb3JtRGF0YSk7XG4gICAgICAgIHJldHVybiB3YXZlZm9ybURhdGE7XG4gICAgfTtcblxuICAgIG5vZGUuZ2V0RnJlcXVlbmNpZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdXBkYXRlRkZUU2l6ZSgpO1xuICAgICAgICB0aGlzLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXF1ZW5jeURhdGEpO1xuICAgICAgICByZXR1cm4gZnJlcXVlbmN5RGF0YTtcbiAgICB9O1xuXG4gICAgLy8gbWFwIG5hdGl2ZSBwcm9wZXJ0aWVzIG9mIEFuYWx5c2VyTm9kZVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgJ3Ntb290aGluZyc6IHtcbiAgICAgICAgICAgIC8vIDAgdG8gMVxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG5vZGUuc21vb3RoaW5nVGltZUNvbnN0YW50OyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLnNtb290aGluZ1RpbWVDb25zdGFudCA9IHZhbHVlOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFuYWx5c2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBEaXN0b3J0aW9uKGNvbnRleHQsIGFtb3VudCkge1xuXG4gICAgYW1vdW50ID0gYW1vdW50IHx8IDE7XG4gICAgXG4gICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZVdhdmVTaGFwZXIoKTtcblxuICAgIC8vIGNyZWF0ZSB3YXZlU2hhcGVyIGRpc3RvcnRpb24gY3VydmUgZnJvbSAwIHRvIDFcbiAgICBub2RlLnVwZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGFtb3VudCA9IHZhbHVlO1xuICAgICAgICB2YXIgayA9IHZhbHVlICogMTAwLFxuICAgICAgICAgICAgbiA9IDIyMDUwLFxuICAgICAgICAgICAgY3VydmUgPSBuZXcgRmxvYXQzMkFycmF5KG4pLFxuICAgICAgICAgICAgZGVnID0gTWF0aC5QSSAvIDE4MCxcbiAgICAgICAgICAgIHg7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIHggPSBpICogMiAvIG4gLSAxO1xuICAgICAgICAgICAgY3VydmVbaV0gPSAoMyArIGspICogeCAqIDIwICogZGVnIC8gKE1hdGguUEkgKyBrICogTWF0aC5hYnMoeCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jdXJ2ZSA9IGN1cnZlO1xuICAgIH07XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgICdhbW91bnQnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gYW1vdW50OyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB0aGlzLnVwZGF0ZSh2YWx1ZSk7IH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYoYW1vdW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbm9kZS51cGRhdGUoYW1vdW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEaXN0b3J0aW9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBFY2hvKGNvbnRleHQsIGRlbGF5VGltZSwgZ2FpblZhbHVlKSB7XG4gICAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGRlbGF5ID0gY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIHZhciBnYWluID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgZ2Fpbi5nYWluLnZhbHVlID0gZ2FpblZhbHVlIHx8IDAuNTtcbiAgICBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBkZWxheVRpbWUgfHwgMC41O1xuXG4gICAgaW5wdXQuY29ubmVjdChkZWxheSk7XG4gICAgaW5wdXQuY29ubmVjdChvdXRwdXQpO1xuICAgIGRlbGF5LmNvbm5lY3QoZ2Fpbik7XG4gICAgZ2Fpbi5jb25uZWN0KGRlbGF5KTtcbiAgICBnYWluLmNvbm5lY3Qob3V0cHV0KTtcblxuICAgIHZhciBub2RlID0gaW5wdXQ7XG4gICAgbm9kZS5uYW1lID0gJ0VjaG8nO1xuICAgIG5vZGUuX291dHB1dCA9IG91dHB1dDtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBkZWxheS5kZWxheVRpbWUudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGZlZWRiYWNrOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZ2Fpbi5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBnYWluLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFY2hvO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGYWtlQ29udGV4dCgpIHtcbiAgICB2YXIgZm4gPSBmdW5jdGlvbigpe307XG4gICAgdmFyIHBhcmFtID0ge1xuICAgICAgICB2YWx1ZTogMSxcbiAgICAgICAgZGVmYXVsdFZhbHVlOiAxLFxuICAgICAgICBsaW5lYXJSYW1wVG9WYWx1ZUF0VGltZTogZm4sXG4gICAgICAgIHNldFZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZTogZm4sXG4gICAgICAgIHNldFRhcmdldEF0VGltZTogZm4sXG4gICAgICAgIHNldFZhbHVlQ3VydmVBdFRpbWU6IGZuLFxuICAgICAgICBjYW5jZWxTY2hlZHVsZWRWYWx1ZXM6IGZuXG4gICAgfTtcbiAgICB2YXIgZmFrZU5vZGUgPSB7XG4gICAgICAgIGNvbm5lY3Q6Zm4sXG4gICAgICAgIGRpc2Nvbm5lY3Q6Zm4sXG4gICAgICAgIC8vIGFuYWx5c2VyXG4gICAgICAgIGZyZXF1ZW5jeUJpbkNvdW50OiAwLFxuICAgICAgICAvLyBnYWluXG4gICAgICAgIGdhaW46e3ZhbHVlOiAxfSxcbiAgICAgICAgLy8gcGFubmVyXG4gICAgICAgIHBhbm5pbmdNb2RlbDogMCxcbiAgICAgICAgc2V0UG9zaXRpb246IGZuLFxuICAgICAgICBzZXRPcmllbnRhdGlvbjogZm4sXG4gICAgICAgIHNldFZlbG9jaXR5OiBmbixcbiAgICAgICAgZGlzdGFuY2VNb2RlbDogMCxcbiAgICAgICAgcmVmRGlzdGFuY2U6IDAsXG4gICAgICAgIG1heERpc3RhbmNlOiAwLFxuICAgICAgICByb2xsb2ZmRmFjdG9yOiAwLFxuICAgICAgICBjb25lSW5uZXJBbmdsZTogMzYwLFxuICAgICAgICBjb25lT3V0ZXJBbmdsZTogMzYwLFxuICAgICAgICBjb25lT3V0ZXJHYWluOiAwLFxuICAgICAgICAvLyBmaWx0ZXI6XG4gICAgICAgIHR5cGU6MCxcbiAgICAgICAgZnJlcXVlbmN5OiBwYXJhbSxcbiAgICAgICAgLy8gZGVsYXlcbiAgICAgICAgZGVsYXlUaW1lOiBwYXJhbSxcbiAgICAgICAgLy8gY29udm9sdmVyXG4gICAgICAgIGJ1ZmZlcjogMCxcbiAgICAgICAgLy8gYW5hbHlzZXJcbiAgICAgICAgc21vb3RoaW5nVGltZUNvbnN0YW50OiAwLFxuICAgICAgICBmZnRTaXplOiAwLFxuICAgICAgICBtaW5EZWNpYmVsczogMCxcbiAgICAgICAgbWF4RGVjaWJlbHM6IDAsXG4gICAgICAgIC8vIGNvbXByZXNzb3JcbiAgICAgICAgdGhyZXNob2xkOiBwYXJhbSxcbiAgICAgICAga25lZTogcGFyYW0sXG4gICAgICAgIHJhdGlvOiBwYXJhbSxcbiAgICAgICAgYXR0YWNrOiBwYXJhbSxcbiAgICAgICAgcmVsZWFzZTogcGFyYW0sXG4gICAgICAgIHJlZHVjdGlvbjogcGFyYW0sXG4gICAgICAgIC8vIGRpc3RvcnRpb25cbiAgICAgICAgb3ZlcnNhbXBsZTogMCxcbiAgICAgICAgY3VydmU6IDAsXG4gICAgICAgIC8vIGJ1ZmZlclxuICAgICAgICBzYW1wbGVSYXRlOiAxLFxuICAgICAgICBsZW5ndGg6IDAsXG4gICAgICAgIGR1cmF0aW9uOiAwLFxuICAgICAgICBudW1iZXJPZkNoYW5uZWxzOiAwLFxuICAgICAgICBnZXRDaGFubmVsRGF0YTogZnVuY3Rpb24oKSB7IHJldHVybiBbXTsgfSxcbiAgICAgICAgY29weUZyb21DaGFubmVsOiBmbixcbiAgICAgICAgY29weVRvQ2hhbm5lbDogZm5cbiAgICB9O1xuICAgIHZhciByZXR1cm5GYWtlTm9kZSA9IGZ1bmN0aW9uKCl7IHJldHVybiBmYWtlTm9kZTsgfTtcblxuICAgIC8vIGllOVxuICAgIGlmKCF3aW5kb3cuVWludDhBcnJheSkge1xuICAgICAgICB3aW5kb3cuSW50OEFycmF5ID0gXG4gICAgICAgIHdpbmRvdy5VaW50OEFycmF5ID0gXG4gICAgICAgIHdpbmRvdy5VaW50OENsYW1wZWRBcnJheSA9IFxuICAgICAgICB3aW5kb3cuSW50MTZBcnJheSA9IFxuICAgICAgICB3aW5kb3cuVWludDE2QXJyYXkgPSBcbiAgICAgICAgd2luZG93LkludDMyQXJyYXkgPSBcbiAgICAgICAgd2luZG93LlVpbnQzMkFycmF5ID0gXG4gICAgICAgIHdpbmRvdy5GbG9hdDMyQXJyYXkgPSBcbiAgICAgICAgd2luZG93LkZsb2F0NjRBcnJheSA9IEFycmF5O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGNyZWF0ZUFuYWx5c2VyOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlQnVmZmVyOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlQmlxdWFkRmlsdGVyOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlRHluYW1pY3NDb21wcmVzc29yOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlQ29udm9sdmVyOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlRGVsYXk6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVHYWluOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZ2Fpbjoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMSxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiAxLFxuICAgICAgICAgICAgICAgICAgICBsaW5lYXJSYW1wVG9WYWx1ZUF0VGltZTogZm4sXG4gICAgICAgICAgICAgICAgICAgIHNldFZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgICAgICAgICAgICAgZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZTogZm4sXG4gICAgICAgICAgICAgICAgICAgIHNldFRhcmdldEF0VGltZTogZm4sXG4gICAgICAgICAgICAgICAgICAgIHNldFZhbHVlQ3VydmVBdFRpbWU6IGZuLFxuICAgICAgICAgICAgICAgICAgICBjYW5jZWxTY2hlZHVsZWRWYWx1ZXM6IGZuXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBjb25uZWN0OmZuLFxuICAgICAgICAgICAgICAgIGRpc2Nvbm5lY3Q6Zm5cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG4gICAgICAgIGNyZWF0ZVBhbm5lcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZVNjcmlwdFByb2Nlc3NvcjogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZVdhdmVTaGFwZXI6IHJldHVybkZha2VOb2RlXG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGYWtlQ29udGV4dDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRmlsdGVyKGNvbnRleHQsIHR5cGUsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIC8vIEZyZXF1ZW5jeSBiZXR3ZWVuIDQwSHogYW5kIGhhbGYgb2YgdGhlIHNhbXBsaW5nIHJhdGVcbiAgICB2YXIgbWluRnJlcXVlbmN5ID0gNDA7XG4gICAgdmFyIG1heEZyZXF1ZW5jeSA9IGNvbnRleHQuc2FtcGxlUmF0ZSAvIDI7XG5cbiAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gICAgbm9kZS50eXBlID0gdHlwZTtcblxuICAgIGlmKGZyZXF1ZW5jeSAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuZnJlcXVlbmN5LnZhbHVlID0gZnJlcXVlbmN5OyB9XG4gICAgaWYocXVhbGl0eSAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuUS52YWx1ZSA9IHF1YWxpdHk7IH1cbiAgICBpZihnYWluICE9PSB1bmRlZmluZWQpIHsgbm9kZS5nYWluLnZhbHVlID0gZ2FpbjsgfVxuXG5cbiAgICB2YXIgZ2V0RnJlcXVlbmN5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gTG9nYXJpdGhtIChiYXNlIDIpIHRvIGNvbXB1dGUgaG93IG1hbnkgb2N0YXZlcyBmYWxsIGluIHRoZSByYW5nZS5cbiAgICAgICAgdmFyIG51bWJlck9mT2N0YXZlcyA9IE1hdGgubG9nKG1heEZyZXF1ZW5jeSAvIG1pbkZyZXF1ZW5jeSkgLyBNYXRoLkxOMjtcbiAgICAgICAgLy8gQ29tcHV0ZSBhIG11bHRpcGxpZXIgZnJvbSAwIHRvIDEgYmFzZWQgb24gYW4gZXhwb25lbnRpYWwgc2NhbGUuXG4gICAgICAgIHZhciBtdWx0aXBsaWVyID0gTWF0aC5wb3coMiwgbnVtYmVyT2ZPY3RhdmVzICogKHZhbHVlIC0gMS4wKSk7XG4gICAgICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICAgICAgcmV0dXJuIG1heEZyZXF1ZW5jeSAqIG11bHRpcGxpZXI7XG4gICAgfTtcblxuICAgIG5vZGUudXBkYXRlID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBnYWluKSB7XG4gICAgICAgIGlmKGZyZXF1ZW5jeSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLmZyZXF1ZW5jeS52YWx1ZSA9IGZyZXF1ZW5jeTtcbiAgICAgICAgfVxuICAgICAgICBpZihnYWluICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZ2Fpbi52YWx1ZSA9IGdhaW47XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbm9kZS5zZXRCeVBlcmNlbnQgPSBmdW5jdGlvbihwZXJjZW50LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgICAgIC8vIHNldCBmaWx0ZXIgZnJlcXVlbmN5IGJhc2VkIG9uIHZhbHVlIGZyb20gMCB0byAxXG4gICAgICAgIG5vZGUuZnJlcXVlbmN5LnZhbHVlID0gZ2V0RnJlcXVlbmN5KHBlcmNlbnQpO1xuICAgICAgICBpZihxdWFsaXR5ICE9PSB1bmRlZmluZWQpIHsgbm9kZS5RLnZhbHVlID0gcXVhbGl0eTsgfVxuICAgICAgICBpZihnYWluICE9PSB1bmRlZmluZWQpIHsgbm9kZS5nYWluLnZhbHVlID0gZ2FpbjsgfVxuICAgIH07XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWx0ZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1vbm9GbGFuZ2VyKGNvbnRleHQsIGNvbmZpZykge1xuICAgIHZhciBmZWVkYmFja0dhaW4gPSBjb25maWcuZmVlZGJhY2sgfHwgMC41LFxuICAgICAgICBkZWxheVRpbWUgPSBjb25maWcuZGVsYXkgfHwgMC4wMDUsXG4gICAgICAgIGxmb0dhaW4gPSBjb25maWcuZ2FpbiB8fCAwLjAwMixcbiAgICAgICAgbGZvRnJlcSA9IGNvbmZpZy5mcmVxdWVuY3kgfHwgMC4yNTtcblxuICAgIHZhciBpbnB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBkZWxheSA9IGNvbnRleHQuY3JlYXRlRGVsYXkoKTtcbiAgICB2YXIgZmVlZGJhY2sgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgbGZvID0gY29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgdmFyIGdhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgb3V0cHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG5cbiAgICBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBkZWxheVRpbWU7IC8vIDUtMjVtcyBkZWxheSAoMC4wMDUgPiAwLjAyNSlcbiAgICBmZWVkYmFjay5nYWluLnZhbHVlID0gZmVlZGJhY2tHYWluOyAvLyAwID4gMVxuXG4gICAgbGZvLnR5cGUgPSAnc2luZSc7XG4gICAgbGZvLmZyZXF1ZW5jeS52YWx1ZSA9IGxmb0ZyZXE7IC8vIDAuMDUgPiA1XG4gICAgZ2Fpbi5nYWluLnZhbHVlID0gbGZvR2FpbjsgLy8gMC4wMDA1ID4gMC4wMDVcblxuICAgIGlucHV0LmNvbm5lY3Qob3V0cHV0KTtcbiAgICBpbnB1dC5jb25uZWN0KGRlbGF5KTtcbiAgICBkZWxheS5jb25uZWN0KG91dHB1dCk7XG4gICAgZGVsYXkuY29ubmVjdChmZWVkYmFjayk7XG4gICAgZmVlZGJhY2suY29ubmVjdChpbnB1dCk7XG5cbiAgICBsZm8uY29ubmVjdChnYWluKTtcbiAgICBnYWluLmNvbm5lY3QoZGVsYXkuZGVsYXlUaW1lKTtcbiAgICBsZm8uc3RhcnQoMCk7XG4gICAgXG4gICAgdmFyIG5vZGUgPSBpbnB1dDtcbiAgICBub2RlLm5hbWUgPSAnRmxhbmdlcic7XG4gICAgbm9kZS5fb3V0cHV0ID0gb3V0cHV0O1xuICAgIFxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBkZWxheS5kZWxheVRpbWUudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGxmb0ZyZXF1ZW5jeToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGxmby5mcmVxdWVuY3kudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGxmby5mcmVxdWVuY3kudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBsZm9HYWluOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZ2Fpbi5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBnYWluLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBmZWVkYmFjazoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGZlZWRiYWNrLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGZlZWRiYWNrLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gU3RlcmVvRmxhbmdlcihjb250ZXh0LCBjb25maWcpIHtcbiAgICB2YXIgZmVlZGJhY2tHYWluID0gY29uZmlnLmZlZWRiYWNrIHx8IDAuNSxcbiAgICAgICAgZGVsYXlUaW1lID0gY29uZmlnLmRlbGF5IHx8IDAuMDAzLFxuICAgICAgICBsZm9HYWluID0gY29uZmlnLmdhaW4gfHwgMC4wMDUsXG4gICAgICAgIGxmb0ZyZXEgPSBjb25maWcuZnJlcXVlbmN5IHx8IDAuNTtcblxuICAgIHZhciBpbnB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBzcGxpdHRlciA9IGNvbnRleHQuY3JlYXRlQ2hhbm5lbFNwbGl0dGVyKDIpO1xuICAgIHZhciBtZXJnZXIgPSBjb250ZXh0LmNyZWF0ZUNoYW5uZWxNZXJnZXIoMik7XG4gICAgdmFyIGZlZWRiYWNrTCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBmZWVkYmFja1IgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgbGZvID0gY29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgdmFyIGxmb0dhaW5MID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGxmb0dhaW5SID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGRlbGF5TCA9IGNvbnRleHQuY3JlYXRlRGVsYXkoKTtcbiAgICB2YXIgZGVsYXlSID0gY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIHZhciBvdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgIGZlZWRiYWNrTC5nYWluLnZhbHVlID0gZmVlZGJhY2tSLmdhaW4udmFsdWUgPSBmZWVkYmFja0dhaW47XG4gICAgZGVsYXlMLmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5Ui5kZWxheVRpbWUudmFsdWUgPSBkZWxheVRpbWU7XG5cbiAgICBsZm8udHlwZSA9ICdzaW5lJztcbiAgICBsZm8uZnJlcXVlbmN5LnZhbHVlID0gbGZvRnJlcTtcbiAgICBsZm9HYWluTC5nYWluLnZhbHVlID0gbGZvR2FpbjtcbiAgICBsZm9HYWluUi5nYWluLnZhbHVlID0gMCAtIGxmb0dhaW47XG5cbiAgICBpbnB1dC5jb25uZWN0KHNwbGl0dGVyKTtcbiAgICBcbiAgICBzcGxpdHRlci5jb25uZWN0KGRlbGF5TCwgMCk7XG4gICAgc3BsaXR0ZXIuY29ubmVjdChkZWxheVIsIDEpO1xuICAgIFxuICAgIGRlbGF5TC5jb25uZWN0KGZlZWRiYWNrTCk7XG4gICAgZGVsYXlSLmNvbm5lY3QoZmVlZGJhY2tSKTtcblxuICAgIGZlZWRiYWNrTC5jb25uZWN0KGRlbGF5Uik7XG4gICAgZmVlZGJhY2tSLmNvbm5lY3QoZGVsYXlMKTtcblxuICAgIGRlbGF5TC5jb25uZWN0KG1lcmdlciwgMCwgMCk7XG4gICAgZGVsYXlSLmNvbm5lY3QobWVyZ2VyLCAwLCAxKTtcblxuICAgIG1lcmdlci5jb25uZWN0KG91dHB1dCk7XG4gICAgaW5wdXQuY29ubmVjdChvdXRwdXQpO1xuXG4gICAgbGZvLmNvbm5lY3QobGZvR2FpbkwpO1xuICAgIGxmby5jb25uZWN0KGxmb0dhaW5SKTtcbiAgICBsZm9HYWluTC5jb25uZWN0KGRlbGF5TC5kZWxheVRpbWUpO1xuICAgIGxmb0dhaW5SLmNvbm5lY3QoZGVsYXlSLmRlbGF5VGltZSk7XG4gICAgbGZvLnN0YXJ0KDApO1xuXG4gICAgdmFyIG5vZGUgPSBpbnB1dDtcbiAgICBub2RlLm5hbWUgPSAnU3RlcmVvRmxhbmdlcic7XG4gICAgbm9kZS5fb3V0cHV0ID0gb3V0cHV0O1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGRlbGF5TC5kZWxheVRpbWUudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGRlbGF5TC5kZWxheVRpbWUudmFsdWUgPSBkZWxheVIuZGVsYXlUaW1lLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgbGZvRnJlcXVlbmN5OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbGZvLmZyZXF1ZW5jeS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbGZvLmZyZXF1ZW5jeS52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGxmb0dhaW46IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBsZm9HYWluTC5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBsZm9HYWluTC5nYWluLnZhbHVlID0gbGZvR2FpblIuZ2Fpbi52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGZlZWRiYWNrOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmVlZGJhY2tMLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGZlZWRiYWNrTC5nYWluLnZhbHVlID0gZmVlZGJhY2tSLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gRmxhbmdlcihjb250ZXh0LCBjb25maWcpIHtcbiAgICBjb25maWcgPSBjb25maWcgfHwge307XG4gICAgcmV0dXJuIGNvbmZpZy5zdGVyZW8gPyBuZXcgU3RlcmVvRmxhbmdlcihjb250ZXh0LCBjb25maWcpIDogbmV3IE1vbm9GbGFuZ2VyKGNvbnRleHQsIGNvbmZpZyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmxhbmdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUGFubmVyKGNvbnRleHQpIHtcbiAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlUGFubmVyKCk7XG4gICAgLy8gRGVmYXVsdCBmb3Igc3RlcmVvIGlzICdIUlRGJyBjYW4gYWxzbyBiZSAnZXF1YWxwb3dlcidcbiAgICBub2RlLnBhbm5pbmdNb2RlbCA9IFBhbm5lci5kZWZhdWx0cy5wYW5uaW5nTW9kZWw7XG5cbiAgICAvLyBEaXN0YW5jZSBtb2RlbCBhbmQgYXR0cmlidXRlc1xuICAgIC8vIENhbiBiZSAnbGluZWFyJyAnaW52ZXJzZScgJ2V4cG9uZW50aWFsJ1xuICAgIG5vZGUuZGlzdGFuY2VNb2RlbCA9IFBhbm5lci5kZWZhdWx0cy5kaXN0YW5jZU1vZGVsO1xuICAgIG5vZGUucmVmRGlzdGFuY2UgPSBQYW5uZXIuZGVmYXVsdHMucmVmRGlzdGFuY2U7XG4gICAgbm9kZS5tYXhEaXN0YW5jZSA9IFBhbm5lci5kZWZhdWx0cy5tYXhEaXN0YW5jZTtcbiAgICBub2RlLnJvbGxvZmZGYWN0b3IgPSBQYW5uZXIuZGVmYXVsdHMucm9sbG9mZkZhY3RvcjtcbiAgICBub2RlLmNvbmVJbm5lckFuZ2xlID0gUGFubmVyLmRlZmF1bHRzLmNvbmVJbm5lckFuZ2xlO1xuICAgIG5vZGUuY29uZU91dGVyQW5nbGUgPSBQYW5uZXIuZGVmYXVsdHMuY29uZU91dGVyQW5nbGU7XG4gICAgbm9kZS5jb25lT3V0ZXJHYWluID0gUGFubmVyLmRlZmF1bHRzLmNvbmVPdXRlckdhaW47XG4gICAgXG4gICAgLy8gc2ltcGxlIHZlYzMgb2JqZWN0IHBvb2xcbiAgICB2YXIgVmVjUG9vbCA9IHtcbiAgICAgICAgcG9vbDogW10sXG4gICAgICAgIGdldDogZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICAgICAgdmFyIHYgPSB0aGlzLnBvb2wubGVuZ3RoID8gdGhpcy5wb29sLnBvcCgpIDogeyB4OiAwLCB5OiAwLCB6OiAwIH07XG4gICAgICAgICAgICAvLyBjaGVjayBpZiBhIHZlY3RvciBoYXMgYmVlbiBwYXNzZWQgaW5cbiAgICAgICAgICAgIGlmKHggIT09IHVuZGVmaW5lZCAmJiBpc05hTih4KSAmJiAneCcgaW4geCAmJiAneScgaW4geCAmJiAneicgaW4geCkge1xuICAgICAgICAgICAgICAgIHYueCA9IHgueCB8fCAwO1xuICAgICAgICAgICAgICAgIHYueSA9IHgueSB8fCAwO1xuICAgICAgICAgICAgICAgIHYueiA9IHgueiB8fCAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdi54ID0geCB8fCAwO1xuICAgICAgICAgICAgICAgIHYueSA9IHkgfHwgMDtcbiAgICAgICAgICAgICAgICB2LnogPSB6IHx8IDA7ICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH0sXG4gICAgICAgIGRpc3Bvc2U6IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLnBvb2wucHVzaChpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGdsb2JhbFVwID0gVmVjUG9vbC5nZXQoMCwgMSwgMCk7XG5cbiAgICB2YXIgc2V0T3JpZW50YXRpb24gPSBmdW5jdGlvbihub2RlLCBmdykge1xuICAgICAgICAvLyBzZXQgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBzb3VyY2UgKHdoZXJlIHRoZSBhdWRpbyBpcyBjb21pbmcgZnJvbSlcblxuICAgICAgICAvLyBjYWxjdWxhdGUgdXAgdmVjICggdXAgPSAoZm9yd2FyZCBjcm9zcyAoMCwgMSwgMCkpIGNyb3NzIGZvcndhcmQgKVxuICAgICAgICB2YXIgdXAgPSBWZWNQb29sLmdldChmdy54LCBmdy55LCBmdy56KTtcbiAgICAgICAgY3Jvc3ModXAsIGdsb2JhbFVwKTtcbiAgICAgICAgY3Jvc3ModXAsIGZ3KTtcbiAgICAgICAgbm9ybWFsaXplKHVwKTtcbiAgICAgICAgbm9ybWFsaXplKGZ3KTtcblxuICAgICAgICAvLyBzZXQgdGhlIGF1ZGlvIGNvbnRleHQncyBsaXN0ZW5lciBwb3NpdGlvbiB0byBtYXRjaCB0aGUgY2FtZXJhIHBvc2l0aW9uXG4gICAgICAgIG5vZGUuc2V0T3JpZW50YXRpb24oZncueCwgZncueSwgZncueiwgdXAueCwgdXAueSwgdXAueik7XG5cbiAgICAgICAgLy8gcmV0dXJuIHRoZSB2ZWNzIHRvIHRoZSBwb29sXG4gICAgICAgIFZlY1Bvb2wuZGlzcG9zZShmdyk7XG4gICAgICAgIFZlY1Bvb2wuZGlzcG9zZSh1cCk7XG4gICAgfTtcblxuICAgIHZhciBzZXRQb3NpdGlvbiA9IGZ1bmN0aW9uKG5vZGUsIHZlYykge1xuICAgICAgICBub2RlLnNldFBvc2l0aW9uKHZlYy54LCB2ZWMueSwgdmVjLnopO1xuICAgICAgICBWZWNQb29sLmRpc3Bvc2UodmVjKTtcbiAgICB9O1xuXG4gICAgdmFyIHNldFZlbG9jaXR5ID0gZnVuY3Rpb24obm9kZSwgdmVjKSB7XG4gICAgICAgIG5vZGUuc2V0VmVsb2NpdHkodmVjLngsIHZlYy55LCB2ZWMueik7XG4gICAgICAgIFZlY1Bvb2wuZGlzcG9zZSh2ZWMpO1xuICAgIH07XG5cbiAgICAvLyBjcm9zcyBwcm9kdWN0IG9mIDIgdmVjdG9yc1xuICAgIHZhciBjcm9zcyA9IGZ1bmN0aW9uICggYSwgYiApIHtcbiAgICAgICAgdmFyIGF4ID0gYS54LCBheSA9IGEueSwgYXogPSBhLno7XG4gICAgICAgIHZhciBieCA9IGIueCwgYnkgPSBiLnksIGJ6ID0gYi56O1xuICAgICAgICBhLnggPSBheSAqIGJ6IC0gYXogKiBieTtcbiAgICAgICAgYS55ID0gYXogKiBieCAtIGF4ICogYno7XG4gICAgICAgIGEueiA9IGF4ICogYnkgLSBheSAqIGJ4O1xuICAgIH07XG5cbiAgICAvLyBub3JtYWxpc2UgdG8gdW5pdCB2ZWN0b3JcbiAgICB2YXIgbm9ybWFsaXplID0gZnVuY3Rpb24gKHZlYzMpIHtcbiAgICAgICAgaWYodmVjMy54ID09PSAwICYmIHZlYzMueSA9PT0gMCAmJiB2ZWMzLnogPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB2ZWMzO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsZW5ndGggPSBNYXRoLnNxcnQoIHZlYzMueCAqIHZlYzMueCArIHZlYzMueSAqIHZlYzMueSArIHZlYzMueiAqIHZlYzMueiApO1xuICAgICAgICB2YXIgaW52U2NhbGFyID0gMSAvIGxlbmd0aDtcbiAgICAgICAgdmVjMy54ICo9IGludlNjYWxhcjtcbiAgICAgICAgdmVjMy55ICo9IGludlNjYWxhcjtcbiAgICAgICAgdmVjMy56ICo9IGludlNjYWxhcjtcbiAgICAgICAgcmV0dXJuIHZlYzM7XG4gICAgfTtcblxuICAgIC8vIHBhbiBsZWZ0IHRvIHJpZ2h0IHdpdGggdmFsdWUgZnJvbSAtMSB0byAxXG4gICAgLy8gY3JlYXRlcyBhIG5pY2UgY3VydmUgd2l0aCB6XG4gICAgbm9kZS5zZXRYID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdmFyIGRlZzQ1ID0gTWF0aC5QSSAvIDQsXG4gICAgICAgICAgICBkZWc5MCA9IGRlZzQ1ICogMixcbiAgICAgICAgICAgIHggPSB2YWx1ZSAqIGRlZzQ1LFxuICAgICAgICAgICAgeiA9IHggKyBkZWc5MDtcblxuICAgICAgICBpZiAoeiA+IGRlZzkwKSB7XG4gICAgICAgICAgICB6ID0gTWF0aC5QSSAtIHo7XG4gICAgICAgIH1cblxuICAgICAgICB4ID0gTWF0aC5zaW4oeCk7XG4gICAgICAgIHogPSBNYXRoLnNpbih6KTtcblxuICAgICAgICBub2RlLnNldFBvc2l0aW9uKHgsIDAsIHopO1xuICAgIH07XG5cbiAgICAvKnZhciB4ID0gMCxcbiAgICAgICAgeSA9IDAsXG4gICAgICAgIHogPSAwO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICAneCc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB4OyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHggPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBub2RlLnNldFBvc2l0aW9uKHgsIHksIHopO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7Ki9cblxuICAgIC8vIHNldCB0aGUgcG9zaXRpb24gdGhlIGF1ZGlvIGlzIGNvbWluZyBmcm9tKVxuICAgIG5vZGUuc2V0U291cmNlUG9zaXRpb24gPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldFBvc2l0aW9uKG5vZGUsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSBkaXJlY3Rpb24gdGhlIGF1ZGlvIGlzIGNvbWluZyBmcm9tKVxuICAgIG5vZGUuc2V0U291cmNlT3JpZW50YXRpb24gPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldE9yaWVudGF0aW9uKG5vZGUsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSB2ZWxvaWN0eSBvZiB0aGUgYXVkaW8gc291cmNlIChpZiBtb3ZpbmcpXG4gICAgbm9kZS5zZXRTb3VyY2VWZWxvY2l0eSA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0VmVsb2NpdHkobm9kZSwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHBvc2l0aW9uIG9mIHdobyBvciB3aGF0IGlzIGhlYXJpbmcgdGhlIGF1ZGlvIChjb3VsZCBiZSBjYW1lcmEgb3Igc29tZSBjaGFyYWN0ZXIpXG4gICAgbm9kZS5zZXRMaXN0ZW5lclBvc2l0aW9uID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRQb3NpdGlvbihjb250ZXh0Lmxpc3RlbmVyLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIHNldCB0aGUgcG9zaXRpb24gb2Ygd2hvIG9yIHdoYXQgaXMgaGVhcmluZyB0aGUgYXVkaW8gKGNvdWxkIGJlIGNhbWVyYSBvciBzb21lIGNoYXJhY3RlcilcbiAgICBub2RlLnNldExpc3RlbmVyT3JpZW50YXRpb24gPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldE9yaWVudGF0aW9uKGNvbnRleHQubGlzdGVuZXIsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSB2ZWxvY2l0eSAoaWYgbW92aW5nKSBvZiB3aG8gb3Igd2hhdCBpcyBoZWFyaW5nIHRoZSBhdWRpbyAoY291bGQgYmUgY2FtZXJhIG9yIHNvbWUgY2hhcmFjdGVyKVxuICAgIG5vZGUuc2V0TGlzdGVuZXJWZWxvY2l0eSA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0VmVsb2NpdHkoY29udGV4dC5saXN0ZW5lciwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBoZWxwZXIgdG8gY2FsY3VsYXRlIHZlbG9jaXR5XG4gICAgbm9kZS5jYWxjdWxhdGVWZWxvY2l0eSA9IGZ1bmN0aW9uKGN1cnJlbnRQb3NpdGlvbiwgbGFzdFBvc2l0aW9uLCBkZWx0YVRpbWUpIHtcbiAgICAgICAgdmFyIGR4ID0gY3VycmVudFBvc2l0aW9uLnggLSBsYXN0UG9zaXRpb24ueDtcbiAgICAgICAgdmFyIGR5ID0gY3VycmVudFBvc2l0aW9uLnkgLSBsYXN0UG9zaXRpb24ueTtcbiAgICAgICAgdmFyIGR6ID0gY3VycmVudFBvc2l0aW9uLnogLSBsYXN0UG9zaXRpb24uejtcbiAgICAgICAgcmV0dXJuIFZlY1Bvb2wuZ2V0KGR4IC8gZGVsdGFUaW1lLCBkeSAvIGRlbHRhVGltZSwgZHogLyBkZWx0YVRpbWUpO1xuICAgIH07XG5cbiAgICBub2RlLnNldERlZmF1bHRzID0gZnVuY3Rpb24oZGVmYXVsdHMpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoZGVmYXVsdHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICBQYW5uZXIuZGVmYXVsdHNba2V5XSA9IGRlZmF1bHRzW2tleV07XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxuUGFubmVyLmRlZmF1bHRzID0ge1xuICAgIHBhbm5pbmdNb2RlbDogJ0hSVEYnLFxuICAgIGRpc3RhbmNlTW9kZWw6ICdsaW5lYXInLFxuICAgIHJlZkRpc3RhbmNlOiAxLFxuICAgIG1heERpc3RhbmNlOiAxMDAwLFxuICAgIHJvbGxvZmZGYWN0b3I6IDEsXG4gICAgY29uZUlubmVyQW5nbGU6IDM2MCxcbiAgICBjb25lT3V0ZXJBbmdsZTogMCxcbiAgICBjb25lT3V0ZXJHYWluOiAwXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhbm5lcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUGhhc2VyKGNvbnRleHQsIGNvbmZpZykge1xuICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgICB2YXIgc3RhZ2VzID0gY29uZmlnLnN0YWdlcyB8fCA4LFxuICAgICAgICBsZm9GcmVxdWVuY3kgPSBjb25maWcuZnJlcXVlbmN5IHx8IDAuNSxcbiAgICAgICAgbGZvR2FpblZhbHVlID0gY29uZmlnLmdhaW4gfHwgMzAwLFxuICAgICAgICBmZWVkYmFja0dhaW4gPSBjb25maWcuZmVlZGJhY2sgfHwgMC41LFxuICAgICAgICBmaWx0ZXJzID0gW10sXG4gICAgICAgIGZpbHRlcjtcblxuICAgIHZhciBpbnB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBmZWVkYmFjayA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBsZm8gPSBjb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICB2YXIgbGZvR2FpbiA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBvdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgIGZlZWRiYWNrLmdhaW4udmFsdWUgPSBmZWVkYmFja0dhaW47XG5cbiAgICBsZm8udHlwZSA9ICdzaW5lJztcbiAgICBsZm8uZnJlcXVlbmN5LnZhbHVlID0gbGZvRnJlcXVlbmN5O1xuICAgIGxmb0dhaW4uZ2Fpbi52YWx1ZSA9IGxmb0dhaW5WYWx1ZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhZ2VzOyBpKyspIHtcbiAgICAgICAgZmlsdGVyID0gY29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICAgICAgZmlsdGVyLnR5cGUgPSAnYWxscGFzcyc7XG4gICAgICAgIGZpbHRlci5mcmVxdWVuY3kudmFsdWUgPSAxMDAwICogaTtcbiAgICAgICAgLy9maWx0ZXIuUS52YWx1ZSA9IDEwO1xuICAgICAgICBpZihpID4gMCkge1xuICAgICAgICAgICAgZmlsdGVyc1tpLTFdLmNvbm5lY3QoZmlsdGVyKTtcbiAgICAgICAgfVxuICAgICAgICBsZm9HYWluLmNvbm5lY3QoZmlsdGVyLmZyZXF1ZW5jeSk7XG5cbiAgICAgICAgZmlsdGVycy5wdXNoKGZpbHRlcik7XG4gICAgfVxuXG4gICAgdmFyIGZpcnN0ID0gZmlsdGVyc1swXTtcbiAgICB2YXIgbGFzdCA9IGZpbHRlcnNbZmlsdGVycy5sZW5ndGggLSAxXTtcblxuICAgIGlucHV0LmNvbm5lY3QoZmlyc3QpO1xuICAgIGlucHV0LmNvbm5lY3Qob3V0cHV0KTtcbiAgICBsYXN0LmNvbm5lY3Qob3V0cHV0KTtcbiAgICBsYXN0LmNvbm5lY3QoZmVlZGJhY2spO1xuICAgIGZlZWRiYWNrLmNvbm5lY3QoZmlyc3QpO1xuICAgIGxmby5jb25uZWN0KGxmb0dhaW4pO1xuICAgIGxmby5zdGFydCgwKTtcblxuICAgIHZhciBub2RlID0gaW5wdXQ7XG4gICAgbm9kZS5uYW1lID0gJ1BoYXNlcic7XG4gICAgbm9kZS5fb3V0cHV0ID0gb3V0cHV0O1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICBsZm9GcmVxdWVuY3k6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBsZm8uZnJlcXVlbmN5LnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBsZm8uZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgbGZvR2Fpbjoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGxmb0dhaW4uZ2Fpbi52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbGZvR2Fpbi5nYWluLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgZmVlZGJhY2s6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBmZWVkYmFjay5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBmZWVkYmFjay5nYWluLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUGhhc2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBSZWNvcmRlcihjb250ZXh0LCBwYXNzVGhyb3VnaCkge1xuICAgIHZhciBidWZmZXJzTCA9IFtdLFxuICAgICAgICBidWZmZXJzUiA9IFtdLFxuICAgICAgICBzdGFydGVkQXQgPSAwLFxuICAgICAgICBzdG9wcGVkQXQgPSAwO1xuXG4gICAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBzY3JpcHQgPSBjb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3Nvcig0MDk2LCAyLCAyKTtcbiAgICBcbiAgICBpbnB1dC5jb25uZWN0KHNjcmlwdCk7XG4gICAgc2NyaXB0LmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgc2NyaXB0LmNvbm5lY3Qob3V0cHV0KTtcblxuICAgIHZhciBub2RlID0gaW5wdXQ7XG4gICAgbm9kZS5uYW1lID0gJ1JlY29yZGVyJztcbiAgICBub2RlLl9vdXRwdXQgPSBvdXRwdXQ7XG5cbiAgICBub2RlLmlzUmVjb3JkaW5nID0gZmFsc2U7XG5cbiAgICB2YXIgZ2V0QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCFidWZmZXJzTC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigyLCA0MDk2LCBjb250ZXh0LnNhbXBsZVJhdGUpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBidWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigyLCBidWZmZXJzTC5sZW5ndGgsIGNvbnRleHQuc2FtcGxlUmF0ZSk7XG4gICAgICAgIGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoYnVmZmVyc0wpO1xuICAgICAgICBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KGJ1ZmZlcnNSKTtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9O1xuXG4gICAgbm9kZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBidWZmZXJzTC5sZW5ndGggPSAwO1xuICAgICAgICBidWZmZXJzUi5sZW5ndGggPSAwO1xuICAgICAgICBzdGFydGVkQXQgPSBjb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgICAgICBzdG9wcGVkQXQgPSAwO1xuICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gdHJ1ZTtcbiAgICB9O1xuXG4gICAgbm9kZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0b3BwZWRBdCA9IGNvbnRleHQuY3VycmVudFRpbWU7XG4gICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSBmYWxzZTtcbiAgICAgICAgcmV0dXJuIGdldEJ1ZmZlcigpO1xuICAgIH07XG5cbiAgICBub2RlLmdldER1cmF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLmlzUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RvcHBlZEF0IC0gc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb250ZXh0LmN1cnJlbnRUaW1lIC0gc3RhcnRlZEF0O1xuICAgIH07XG5cbiAgICBzY3JpcHQub25hdWRpb3Byb2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgdmFyIGlucHV0TCA9IGV2ZW50LmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApLFxuICAgICAgICAgICAgaW5wdXRSID0gZXZlbnQuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCksXG4gICAgICAgICAgICBvdXRwdXRMID0gZXZlbnQub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApLFxuICAgICAgICAgICAgb3V0cHV0UiA9IGV2ZW50Lm91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcblxuICAgICAgICBpZihwYXNzVGhyb3VnaCkge1xuICAgICAgICAgICAgb3V0cHV0TC5zZXQoaW5wdXRMKTtcbiAgICAgICAgICAgIG91dHB1dFIuc2V0KGlucHV0Uik7XG4gICAgICAgIH1cblxuICAgICAgICBpZihub2RlLmlzUmVjb3JkaW5nKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlucHV0TC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnNMLnB1c2goaW5wdXRMW2ldKTtcbiAgICAgICAgICAgICAgICBidWZmZXJzUi5wdXNoKGlucHV0UltpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmVjb3JkZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFJldmVyYihjb250ZXh0LCBjb25maWcpIHtcbiAgICBjb25maWcgPSBjb25maWcgfHwge307XG5cbiAgICB2YXIgdGltZSA9IGNvbmZpZy50aW1lIHx8IDEsXG4gICAgICAgIGRlY2F5ID0gY29uZmlnLmRlY2F5IHx8IDUsXG4gICAgICAgIHJldmVyc2UgPSAhIWNvbmZpZy5yZXZlcnNlLFxuICAgICAgICByYXRlID0gY29udGV4dC5zYW1wbGVSYXRlLFxuICAgICAgICBsZW5ndGgsXG4gICAgICAgIGltcHVsc2VSZXNwb25zZTtcblxuICAgIHZhciBpbnB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciByZXZlcmIgPSBjb250ZXh0LmNyZWF0ZUNvbnZvbHZlcigpO1xuICAgIHZhciBvdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgIGlucHV0LmNvbm5lY3QocmV2ZXJiKTtcbiAgICBpbnB1dC5jb25uZWN0KG91dHB1dCk7XG4gICAgcmV2ZXJiLmNvbm5lY3Qob3V0cHV0KTtcblxuICAgIHZhciBub2RlID0gaW5wdXQ7XG4gICAgbm9kZS5uYW1lID0gJ1JldmVyYic7XG4gICAgbm9kZS5fb3V0cHV0ID0gb3V0cHV0O1xuXG4gICAgbm9kZS51cGRhdGUgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgICAgaWYoY29uZmlnLnRpbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGltZSA9IGNvbmZpZy50aW1lO1xuICAgICAgICAgICAgbGVuZ3RoID0gcmF0ZSAqIHRpbWU7XG4gICAgICAgICAgICBpbXB1bHNlUmVzcG9uc2UgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigyLCBsZW5ndGgsIHJhdGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGNvbmZpZy5kZWNheSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWNheSA9IGNvbmZpZy5kZWNheTtcbiAgICAgICAgfVxuICAgICAgICBpZihjb25maWcucmV2ZXJzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXZlcnNlID0gY29uZmlnLnJldmVyc2U7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGVmdCA9IGltcHVsc2VSZXNwb25zZS5nZXRDaGFubmVsRGF0YSgwKSxcbiAgICAgICAgICAgIHJpZ2h0ID0gaW1wdWxzZVJlc3BvbnNlLmdldENoYW5uZWxEYXRhKDEpLFxuICAgICAgICAgICAgbiwgZTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBuID0gcmV2ZXJzZSA/IGxlbmd0aCAtIGkgOiBpO1xuICAgICAgICAgICAgZSA9IE1hdGgucG93KDEgLSBuIC8gbGVuZ3RoLCBkZWNheSk7XG4gICAgICAgICAgICBsZWZ0W2ldID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBlO1xuICAgICAgICAgICAgcmlnaHRbaV0gPSAoTWF0aC5yYW5kb20oKSAqIDIgLSAxKSAqIGU7XG4gICAgICAgIH1cblxuICAgICAgICByZXZlcmIuYnVmZmVyID0gaW1wdWxzZVJlc3BvbnNlO1xuICAgIH07XG5cbiAgICBub2RlLnVwZGF0ZSh7XG4gICAgICAgIHRpbWU6IHRpbWUsXG4gICAgICAgIGRlY2F5OiBkZWNheSxcbiAgICAgICAgcmV2ZXJzZTogcmV2ZXJzZVxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICB0aW1lOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGltZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2V0IHRpbWU6JywgdmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmKHZhbHVlID09PSB0aW1lKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKHt0aW1lOiB0aW1lfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGRlY2F5OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZGVjYXk7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYodmFsdWUgPT09IGRlY2F5KSB7IHJldHVybjsgfVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKHtkZWNheTogZGVjYXl9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgcmV2ZXJzZToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHJldmVyc2U7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYodmFsdWUgPT09IHJldmVyc2UpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoe3JldmVyc2U6ICEhdmFsdWV9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmV2ZXJiO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQnVmZmVyU291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2UvYnVmZmVyLXNvdXJjZS5qcycpLFxuICAgIEVmZmVjdCA9IHJlcXVpcmUoJy4vZWZmZWN0LmpzJyksXG4gICAgTWVkaWFTb3VyY2UgPSByZXF1aXJlKCcuL3NvdXJjZS9tZWRpYS1zb3VyY2UuanMnKSxcbiAgICBNaWNyb3Bob25lU291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2UvbWljcm9waG9uZS1zb3VyY2UuanMnKSxcbiAgICBPc2NpbGxhdG9yU291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2Uvb3NjaWxsYXRvci1zb3VyY2UuanMnKSxcbiAgICBTY3JpcHRTb3VyY2UgPSByZXF1aXJlKCcuL3NvdXJjZS9zY3JpcHQtc291cmNlLmpzJyksXG4gICAgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzL3V0aWxzLmpzJyk7XG5cbmZ1bmN0aW9uIFNvdW5kKGNvbnRleHQsIGRlc3RpbmF0aW9uKSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2RhdGEgPSBudWxsO1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX2lzVG91Y2hMb2NrZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9sb29wID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlXaGVuUmVhZHkgPSBudWxsO1xuICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcblxuICAgIHRoaXMuX2VmZmVjdCA9IG5ldyBFZmZlY3QodGhpcy5fY29udGV4dCk7XG4gICAgdGhpcy5fZ2FpbiA9IHRoaXMuX2VmZmVjdC5nYWluKCk7XG4gICAgaWYodGhpcy5fY29udGV4dCkge1xuICAgICAgICB0aGlzLl9lZmZlY3Quc2V0RGVzdGluYXRpb24odGhpcy5fZ2Fpbik7XG4gICAgICAgIHRoaXMuX2dhaW4uY29ubmVjdChkZXN0aW5hdGlvbiB8fCB0aGlzLl9jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB9XG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cblNvdW5kLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXksIG9mZnNldCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2UgfHwgdGhpcy5faXNUb3VjaExvY2tlZCkge1xuICAgICAgICB0aGlzLl9wbGF5V2hlblJlYWR5ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnBsYXkoZGVsYXksIG9mZnNldCk7XG4gICAgICAgIH0uYmluZCh0aGlzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHRoaXMuX3BsYXlXaGVuUmVhZHkgPSBudWxsO1xuICAgIHRoaXMuX2VmZmVjdC5zZXRTb3VyY2UodGhpcy5fc291cmNlLnNvdXJjZU5vZGUpO1xuICAgIHRoaXMuX3NvdXJjZS5sb29wID0gdGhpcy5fbG9vcDtcblxuICAgIC8vIHVwZGF0ZSB2b2x1bWUgbmVlZGVkIGZvciBubyB3ZWJhdWRpb1xuICAgIGlmKCF0aGlzLl9jb250ZXh0KSB7IHRoaXMudm9sdW1lID0gdGhpcy52b2x1bWU7IH1cblxuICAgIHRoaXMuX3NvdXJjZS5wbGF5KGRlbGF5LCBvZmZzZXQpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7IHJldHVybiB0aGlzOyB9XG4gICAgdGhpcy5fc291cmNlLnBhdXNlKCk7XG4gICAgcmV0dXJuIHRoaXM7ICBcbn07XG5cblNvdW5kLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuX3NvdXJjZS5zdG9wKCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUuc2VlayA9IGZ1bmN0aW9uKHBlcmNlbnQpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7IHJldHVybiB0aGlzOyB9XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5wbGF5KDAsIHRoaXMuX3NvdXJjZS5kdXJhdGlvbiAqIHBlcmNlbnQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUub25FbmRlZCA9IGZ1bmN0aW9uKGZuLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IGZuID8gZm4uYmluZChjb250ZXh0IHx8IHRoaXMpIDogbnVsbDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvdW5kLnByb3RvdHlwZS5fZW5kZWRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodHlwZW9mIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayh0aGlzKTtcbiAgICB9XG59O1xuXG4vKlxuICogQ3JlYXRlIHNvdXJjZVxuICovXG5cblNvdW5kLnByb3RvdHlwZS5fY3JlYXRlU291cmNlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIGlmKFV0aWxzLmlzQXVkaW9CdWZmZXIoZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IEJ1ZmZlclNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZihVdGlscy5pc01lZGlhRWxlbWVudChkYXRhKSkge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgTWVkaWFTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2UgaWYoVXRpbHMuaXNNZWRpYVN0cmVhbShkYXRhKSkge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgTWljcm9waG9uZVNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZihVdGlscy5pc09zY2lsbGF0b3JUeXBlKGRhdGEpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBPc2NpbGxhdG9yU291cmNlKGRhdGEsIHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbiAgICBlbHNlIGlmKFV0aWxzLmlzU2NyaXB0Q29uZmlnKGRhdGEpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBTY3JpcHRTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBkZXRlY3QgZGF0YSB0eXBlOiAnICsgZGF0YSk7XG4gICAgfVxuXG4gICAgdGhpcy5fZWZmZWN0LnNldFNvdXJjZSh0aGlzLl9zb3VyY2Uuc291cmNlTm9kZSk7XG5cbiAgICBpZih0eXBlb2YgdGhpcy5fc291cmNlLm9uRW5kZWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fc291cmNlLm9uRW5kZWQodGhpcy5fZW5kZWRIYW5kbGVyLCB0aGlzKTtcbiAgICB9XG5cbiAgICBpZih0aGlzLl9wbGF5V2hlblJlYWR5KSB7XG4gICAgICAgIHRoaXMuX3BsYXlXaGVuUmVhZHkoKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnY29udGV4dCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuY3VycmVudFRpbWUgOiAwO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLnN0b3AoKTtcbiAgICAgICAgdGhpcy5wbGF5KDAsIHZhbHVlKTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2RhdGEnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RhdGE7XG4gICAgfSxcbiAgICBzZXQgOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZighdmFsdWUpIHsgcmV0dXJuOyB9XG4gICAgICAgIHRoaXMuX2RhdGEgPSB2YWx1ZTtcbiAgICAgICAgdGhpcy5fY3JlYXRlU291cmNlKHRoaXMuX2RhdGEpO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnZHVyYXRpb24nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5kdXJhdGlvbiA6IDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdlbmRlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmVuZGVkIDogZmFsc2U7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdnYWluJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9nYWluO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnaXNUb3VjaExvY2tlZCcsIHtcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2lzVG91Y2hMb2NrZWQgPSB2YWx1ZTtcbiAgICAgICAgaWYoIXZhbHVlICYmIHRoaXMuX3BsYXlXaGVuUmVhZHkpIHtcbiAgICAgICAgICAgIHRoaXMuX3BsYXlXaGVuUmVhZHkoKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnbG9vcCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbG9vcDtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy5fbG9vcCA9ICEhdmFsdWU7XG4gICAgICAgIGlmKHRoaXMuX3NvdXJjZSkge1xuICAgICAgICAgIHRoaXMuX3NvdXJjZS5sb29wID0gdGhpcy5fbG9vcDtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAnZWZmZWN0Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lZmZlY3Q7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wYXVzZWQgOiBmYWxzZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ3BsYXlpbmcnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wbGF5aW5nIDogZmFsc2U7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdwcm9ncmVzcycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLnByb2dyZXNzIDogMDtcbiAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICd2b2x1bWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dhaW4uZ2Fpbi52YWx1ZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgaWYoaXNOYU4odmFsdWUpKSB7IHJldHVybjsgfVxuXG4gICAgICAgIHRoaXMuX2dhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuXG4gICAgICAgIGlmKHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuX2dhaW4uZ2Fpbi5jYW5jZWxTY2hlZHVsZWRWYWx1ZXModGhpcy5fY29udGV4dC5jdXJyZW50VGltZSk7XG4gICAgICAgICAgICB0aGlzLl9nYWluLmdhaW4uc2V0VmFsdWVBdFRpbWUodmFsdWUsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYodGhpcy5fZGF0YSAmJiB0aGlzLl9kYXRhLnZvbHVtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLl9kYXRhLnZvbHVtZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbi8vIGZvciBvc2NpbGxhdG9yXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdmcmVxdWVuY3knLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5mcmVxdWVuY3kgOiAwO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZih0aGlzLl9zb3VyY2UpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZS5mcmVxdWVuY3kgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNvdW5kO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBCdWZmZXJTb3VyY2UoYnVmZmVyLCBjb250ZXh0KSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2J1ZmZlciA9IGJ1ZmZlcjsgLy8gQXJyYXlCdWZmZXJcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX2xvb3AgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBCdWZmZXJTb3VyY2VOb2RlXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn1cblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXksIG9mZnNldCkge1xuICAgIGlmKHRoaXMuX3BsYXlpbmcpIHsgcmV0dXJuOyB9XG4gICAgaWYoZGVsYXkgPT09IHVuZGVmaW5lZCkgeyBkZWxheSA9IDA7IH1cbiAgICBpZihkZWxheSA+IDApIHsgZGVsYXkgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZGVsYXk7IH1cblxuICAgIGlmKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7IG9mZnNldCA9IDA7IH1cbiAgICBpZihvZmZzZXQgPiAwKSB7IHRoaXMuX3BhdXNlZEF0ID0gMDsgfVxuICAgIGlmKHRoaXMuX3BhdXNlZEF0ID4gMCkgeyBvZmZzZXQgPSB0aGlzLl9wYXVzZWRBdDsgfVxuICAgIFxuICAgIC8vY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgWycxIG9mZnNldDonLCBvZmZzZXRdKTtcbiAgICB3aGlsZShvZmZzZXQgPiB0aGlzLmR1cmF0aW9uKSB7IG9mZnNldCA9IG9mZnNldCAlIHRoaXMuZHVyYXRpb247IH1cbiAgICAvL2NvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIFsnMiBvZmZzZXQ6Jywgb2Zmc2V0XSk7XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUubG9vcCA9IHRoaXMuX2xvb3A7XG4gICAgdGhpcy5zb3VyY2VOb2RlLm9uZW5kZWQgPSB0aGlzLl9lbmRlZEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICB0aGlzLnNvdXJjZU5vZGUuc3RhcnQoZGVsYXksIG9mZnNldCk7XG5cbiAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fcGF1c2VkQXQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gb2Zmc2V0O1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xufTtcblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IGVsYXBzZWQ7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUub25lbmRlZCA9IG51bGw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuc3RvcCgwKTtcbiAgICAgICAgfSBjYXRjaChlKSB7fVxuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59O1xuXG4vKlxuICogRW5kZWQgaGFuZGxlclxuICovXG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUub25FbmRlZCA9IGZ1bmN0aW9uKGZuLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IGZuID8gZm4uYmluZChjb250ZXh0IHx8IHRoaXMpIDogbnVsbDtcbn07XG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUuX2VuZGVkSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICBpZih0eXBlb2YgdGhpcy5fZW5kZWRDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9lbmRlZENhbGxiYWNrKHRoaXMpO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgIHZhciB0aW1lID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICAgICAgICAgIGlmKHRpbWUgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgdGltZSA9IHRpbWUgJSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAnZHVyYXRpb24nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2J1ZmZlciA/IHRoaXMuX2J1ZmZlci5kdXJhdGlvbiA6IDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAnZW5kZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2xvb3AnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvb3A7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2xvb3AgPSAhIXZhbHVlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ3BsYXlpbmcnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BsYXlpbmc7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgubWluKHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uLCAxKTtcbiAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAnc291cmNlTm9kZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLmJ1ZmZlciA9IHRoaXMuX2J1ZmZlcjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBCdWZmZXJTb3VyY2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1lZGlhU291cmNlKGVsLCBjb250ZXh0KSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VsID0gZWw7IC8vIEhUTUxNZWRpYUVsZW1lbnRcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX2VuZGVkSGFuZGxlckJvdW5kID0gdGhpcy5fZW5kZWRIYW5kbGVyLmJpbmQodGhpcyk7XG4gICAgdGhpcy5fbG9vcCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDsgLy8gTWVkaWFFbGVtZW50U291cmNlTm9kZVxufVxuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5LCBvZmZzZXQpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5fZGVsYXlUaW1lb3V0KTtcblxuICAgIHRoaXMudm9sdW1lID0gdGhpcy5fdm9sdW1lO1xuXG4gICAgaWYob2Zmc2V0KSB7XG4gICAgICAgIHRoaXMuX2VsLmN1cnJlbnRUaW1lID0gb2Zmc2V0O1xuICAgIH1cblxuICAgIGlmKGRlbGF5KSB7XG4gICAgICAgIHRoaXMuX2RlbGF5VGltZW91dCA9IHNldFRpbWVvdXQodGhpcy5wbGF5LmJpbmQodGhpcyksIGRlbGF5KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX2VsLnBsYXkoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xuXG4gICAgdGhpcy5fZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignZW5kZWQnLCB0aGlzLl9lbmRlZEhhbmRsZXJCb3VuZCk7XG4gICAgdGhpcy5fZWwuYWRkRXZlbnRMaXN0ZW5lcignZW5kZWQnLCB0aGlzLl9lbmRlZEhhbmRsZXJCb3VuZCwgZmFsc2UpO1xufTtcblxuTWVkaWFTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2RlbGF5VGltZW91dCk7XG5cbiAgICBpZighdGhpcy5fZWwpIHsgcmV0dXJuOyB9XG5cbiAgICB0aGlzLl9lbC5wYXVzZSgpO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSB0cnVlO1xufTtcblxuTWVkaWFTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5fZGVsYXlUaW1lb3V0KTtcblxuICAgIGlmKCF0aGlzLl9lbCkgeyByZXR1cm47IH1cblxuICAgIHRoaXMuX2VsLnBhdXNlKCk7XG5cbiAgICB0cnkge1xuICAgICAgICB0aGlzLl9lbC5jdXJyZW50VGltZSA9IDA7XG4gICAgICAgIC8vIGZpeGVzIGJ1ZyB3aGVyZSBzZXJ2ZXIgZG9lc24ndCBzdXBwb3J0IHNlZWs6XG4gICAgICAgIGlmKHRoaXMuX2VsLmN1cnJlbnRUaW1lID4gMCkgeyB0aGlzLl9lbC5sb2FkKCk7IH0gICAgXG4gICAgfSBjYXRjaChlKSB7fVxuXG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUub25FbmRlZCA9IGZ1bmN0aW9uKGZuLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IGZuID8gZm4uYmluZChjb250ZXh0IHx8IHRoaXMpIDogbnVsbDtcbn07XG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5fZW5kZWRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZW5kZWQgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcblxuICAgIGlmKHRoaXMuX2xvb3ApIHtcbiAgICAgICAgdGhpcy5fZWwuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICAvLyBmaXhlcyBidWcgd2hlcmUgc2VydmVyIGRvZXNuJ3Qgc3VwcG9ydCBzZWVrOlxuICAgICAgICBpZih0aGlzLl9lbC5jdXJyZW50VGltZSA+IDApIHsgdGhpcy5fZWwubG9hZCgpOyB9XG4gICAgICAgIHRoaXMucGxheSgpO1xuICAgIH0gZWxzZSBpZih0eXBlb2YgdGhpcy5fZW5kZWRDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9lbmRlZENhbGxiYWNrKHRoaXMpO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdjdXJyZW50VGltZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWwgPyB0aGlzLl9lbC5jdXJyZW50VGltZSA6IDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZWwgPyB0aGlzLl9lbC5kdXJhdGlvbiA6IDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdlbmRlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW5kZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdsb29wJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9sb29wID0gdmFsdWU7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ3BsYXlpbmcnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BsYXlpbmc7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdwcm9ncmVzcycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5jdXJyZW50VGltZSAvIHRoaXMuZHVyYXRpb247XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNZWRpYVNvdXJjZS5wcm90b3R5cGUsICdzb3VyY2VOb2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlICYmIHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZU1lZGlhRWxlbWVudFNvdXJjZSh0aGlzLl9lbCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWVkaWFTb3VyY2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1pY3JvcGhvbmVTb3VyY2Uoc3RyZWFtLCBjb250ZXh0KSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDsgLy8gTWljcm9waG9uZVNvdXJjZU5vZGVcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xuICAgIHRoaXMuX3N0cmVhbSA9IHN0cmVhbTtcbn1cblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5KSB7XG4gICAgaWYoZGVsYXkgPT09IHVuZGVmaW5lZCkgeyBkZWxheSA9IDA7IH1cbiAgICBpZihkZWxheSA+IDApIHsgZGVsYXkgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZGVsYXk7IH1cblxuICAgIHRoaXMuc291cmNlTm9kZS5zdGFydChkZWxheSk7XG5cbiAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fcGF1c2VkQXQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xufTtcblxuTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxhcHNlZCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSBlbGFwc2VkO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSB0cnVlO1xufTtcblxuTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuc3RvcCgwKTtcbiAgICAgICAgfSBjYXRjaChlKSB7fVxuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5fZW5kZWQgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNaWNyb3Bob25lU291cmNlLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYodGhpcy5fc3RhcnRlZEF0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLCAnZHVyYXRpb24nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNaWNyb3Bob25lU291cmNlLnByb3RvdHlwZSwgJ2VuZGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmRlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLCAncGF1c2VkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNaWNyb3Bob25lU291cmNlLnByb3RvdHlwZSwgJ3BsYXlpbmcnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BsYXlpbmc7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNaWNyb3Bob25lU291cmNlLnByb3RvdHlwZSwgJ3Byb2dyZXNzJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAwO1xuICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLCAnc291cmNlTm9kZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlTWVkaWFTdHJlYW1Tb3VyY2UodGhpcy5fc3RyZWFtKTtcbiAgICAgICAgICAgIC8vIEhBQ0s6IHN0b3BzIG1veiBnYXJiYWdlIGNvbGxlY3Rpb24ga2lsbGluZyB0aGUgc3RyZWFtXG4gICAgICAgICAgICAvLyBzZWUgaHR0cHM6Ly9zdXBwb3J0Lm1vemlsbGEub3JnL2VuLVVTL3F1ZXN0aW9ucy85ODQxNzlcbiAgICAgICAgICAgIGlmKG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubW96SGFjayA9IHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWljcm9waG9uZVNvdXJjZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gT3NjaWxsYXRvclNvdXJjZSh0eXBlLCBjb250ZXh0KSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDsgLy8gT3NjaWxsYXRvclNvdXJjZU5vZGVcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xuICAgIHRoaXMuX3R5cGUgPSB0eXBlO1xuICAgIHRoaXMuX2ZyZXF1ZW5jeSA9IDIwMDtcbn1cblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5KSB7XG4gICAgaWYoZGVsYXkgPT09IHVuZGVmaW5lZCkgeyBkZWxheSA9IDA7IH1cbiAgICBpZihkZWxheSA+IDApIHsgZGVsYXkgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZGVsYXk7IH1cblxuICAgIHRoaXMuc291cmNlTm9kZS5zdGFydChkZWxheSk7XG5cbiAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fcGF1c2VkQXQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xufTtcblxuT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxhcHNlZCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSBlbGFwc2VkO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSB0cnVlO1xufTtcblxuT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuc3RvcCgwKTtcbiAgICAgICAgfSBjYXRjaChlKSB7fVxuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5fZW5kZWQgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShPc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZSwgJ2ZyZXF1ZW5jeScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZnJlcXVlbmN5O1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9mcmVxdWVuY3kgPSB2YWx1ZTtcbiAgICAgICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5mcmVxdWVuY3kudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdjdXJyZW50VGltZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZEF0O1xuICAgICAgICB9XG4gICAgICAgIGlmKHRoaXMuX3N0YXJ0ZWRBdCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShPc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdlbmRlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW5kZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShPc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdwcm9ncmVzcycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gMDtcbiAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShPc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZSwgJ3NvdXJjZU5vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUgJiYgdGhpcy5fY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS50eXBlID0gdGhpcy5fdHlwZTtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuZnJlcXVlbmN5LnZhbHVlID0gdGhpcy5fZnJlcXVlbmN5O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9zY2lsbGF0b3JTb3VyY2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFNjcmlwdFNvdXJjZShkYXRhLCBjb250ZXh0KSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2J1ZmZlclNpemUgPSBkYXRhLmJ1ZmZlclNpemUgfHwgMTAyNDtcbiAgICB0aGlzLl9jaGFubmVscyA9IGRhdGEuY2hhbm5lbHMgfHwgMTtcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX29uUHJvY2VzcyA9IGRhdGEuY2FsbGJhY2suYmluZChkYXRhLnRoaXNBcmcgfHwgdGhpcyk7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDsgLy8gU2NyaXB0U291cmNlTm9kZVxuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cblNjcmlwdFNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5KSB7XG4gICAgaWYoZGVsYXkgPT09IHVuZGVmaW5lZCkgeyBkZWxheSA9IDA7IH1cbiAgICBpZihkZWxheSA+IDApIHsgZGVsYXkgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZGVsYXk7IH1cblxuICAgIHRoaXMuc291cmNlTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IHRoaXMuX29uUHJvY2VzcztcblxuICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9wYXVzZWRBdDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWU7XG4gICAgfVxuXG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG59O1xuXG5TY3JpcHRTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gZWxhcHNlZDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cblNjcmlwdFNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgdGhpcy5fc291cmNlTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IHRoaXMuX29uUGF1c2VkO1xuICAgIH1cbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufTtcblxuU2NyaXB0U291cmNlLnByb3RvdHlwZS5fb25QYXVzZWQgPSBmdW5jdGlvbihldmVudCkge1xuICAgIHZhciBidWZmZXIgPSBldmVudC5vdXRwdXRCdWZmZXI7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBidWZmZXIubnVtYmVyT2ZDaGFubmVsczsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIgY2hhbm5lbCA9IGJ1ZmZlci5nZXRDaGFubmVsRGF0YShpKTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDAsIGxlbiA9IGNoYW5uZWwubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgICAgICAgIGNoYW5uZWxbal0gPSAwO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdjdXJyZW50VGltZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZEF0O1xuICAgICAgICB9XG4gICAgICAgIGlmKHRoaXMuX3N0YXJ0ZWRBdCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTY3JpcHRTb3VyY2UucHJvdG90eXBlLCAnZHVyYXRpb24nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTY3JpcHRTb3VyY2UucHJvdG90eXBlLCAnZW5kZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ3BsYXlpbmcnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BsYXlpbmc7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTY3JpcHRTb3VyY2UucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ3NvdXJjZU5vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3Nvcih0aGlzLl9idWZmZXJTaXplLCAwLCB0aGlzLl9jaGFubmVscyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gU2NyaXB0U291cmNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgc2lnbmFscyA9IHJlcXVpcmUoJ3NpZ25hbHMnKTtcblxuZnVuY3Rpb24gTG9hZGVyKHVybCkge1xuICAgIHZhciBvblByb2dyZXNzID0gbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgICAgIG9uQmVmb3JlQ29tcGxldGUgPSBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICAgICAgb25Db21wbGV0ZSA9IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgICAgICBvbkVycm9yID0gbmV3IHNpZ25hbHMuU2lnbmFsKCksXG4gICAgICAgIHByb2dyZXNzID0gMCxcbiAgICAgICAgYXVkaW9Db250ZXh0LFxuICAgICAgICBpc1RvdWNoTG9ja2VkLFxuICAgICAgICByZXF1ZXN0LFxuICAgICAgICBkYXRhO1xuXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKGF1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgbG9hZEFycmF5QnVmZmVyKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2FkQXVkaW9FbGVtZW50KCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGxvYWRBcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHJlcXVlc3Qub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICByZXF1ZXN0Lm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgaWYgKGV2ZW50Lmxlbmd0aENvbXB1dGFibGUpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IGV2ZW50LmxvYWRlZCAvIGV2ZW50LnRvdGFsO1xuICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3MuZGlzcGF0Y2gocHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgYXVkaW9Db250ZXh0LmRlY29kZUF1ZGlvRGF0YShcbiAgICAgICAgICAgICAgICByZXF1ZXN0LnJlc3BvbnNlLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gYnVmZmVyO1xuICAgICAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IDE7XG4gICAgICAgICAgICAgICAgICAgIG9uUHJvZ3Jlc3MuZGlzcGF0Y2goMSk7XG4gICAgICAgICAgICAgICAgICAgIG9uQmVmb3JlQ29tcGxldGUuZGlzcGF0Y2goYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgb25Db21wbGV0ZS5kaXNwYXRjaChidWZmZXIpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBvbkVycm9yLmRpc3BhdGNoKGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIG9uRXJyb3IuZGlzcGF0Y2goZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Quc2VuZCgpO1xuICAgIH07XG5cbiAgICB2YXIgbG9hZEF1ZGlvRWxlbWVudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBkYXRhID0gbmV3IEF1ZGlvKCk7XG4gICAgICAgIGRhdGEubmFtZSA9IHVybDtcbiAgICAgICAgZGF0YS5wcmVsb2FkID0gJ2F1dG8nO1xuICAgICAgICBkYXRhLnNyYyA9IHVybDtcblxuICAgICAgICBpZiAoISFpc1RvdWNoTG9ja2VkKSB7XG4gICAgICAgICAgICBvblByb2dyZXNzLmRpc3BhdGNoKDEpO1xuICAgICAgICAgICAgb25CZWZvcmVDb21wbGV0ZS5kaXNwYXRjaChkYXRhKTtcbiAgICAgICAgICAgIG9uQ29tcGxldGUuZGlzcGF0Y2goZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgdGltZW91dDtcbiAgICAgICAgICAgIHZhciByZWFkeUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBkYXRhLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgcmVhZHlIYW5kbGVyKTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIHByb2dyZXNzID0gMTtcbiAgICAgICAgICAgICAgICBvblByb2dyZXNzLmRpc3BhdGNoKDEpO1xuICAgICAgICAgICAgICAgIG9uQmVmb3JlQ29tcGxldGUuZGlzcGF0Y2goZGF0YSk7XG4gICAgICAgICAgICAgICAgb25Db21wbGV0ZS5kaXNwYXRjaChkYXRhKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyB0aW1lb3V0IGJlY2F1c2Ugc29tZXRpbWVzIGNhbnBsYXl0aHJvdWdoIGRvZXNuJ3QgZmlyZVxuICAgICAgICAgICAgdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KHJlYWR5SGFuZGxlciwgNDAwMCk7XG4gICAgICAgICAgICBkYXRhLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgcmVhZHlIYW5kbGVyLCBmYWxzZSk7XG4gICAgICAgICAgICBkYXRhLm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgICAgICBvbkVycm9yLmRpc3BhdGNoKGUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRhdGEubG9hZCgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBjYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmKHJlcXVlc3QgJiYgcmVxdWVzdC5yZWFkeVN0YXRlICE9PSA0KSB7XG4gICAgICAgICAgcmVxdWVzdC5hYm9ydCgpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgYXBpID0ge1xuICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgIGNhbmNlbDogY2FuY2VsLFxuICAgICAgICBvblByb2dyZXNzOiBvblByb2dyZXNzLFxuICAgICAgICBvbkNvbXBsZXRlOiBvbkNvbXBsZXRlLFxuICAgICAgICBvbkJlZm9yZUNvbXBsZXRlOiBvbkJlZm9yZUNvbXBsZXRlLFxuICAgICAgICBvbkVycm9yOiBvbkVycm9yXG4gICAgfTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhcGksICdkYXRhJywge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhcGksICdwcm9ncmVzcycsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBwcm9ncmVzcztcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGFwaSwgJ2F1ZGlvQ29udGV4dCcsIHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgYXVkaW9Db250ZXh0ID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShhcGksICdpc1RvdWNoTG9ja2VkJywge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBpc1RvdWNoTG9ja2VkID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKGFwaSk7XG59XG5cbkxvYWRlci5Hcm91cCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBxdWV1ZSA9IFtdLFxuICAgICAgICBudW1Mb2FkZWQgPSAwLFxuICAgICAgICBudW1Ub3RhbCA9IDAsXG4gICAgICAgIG9uQ29tcGxldGUgPSBuZXcgc2lnbmFscy5TaWduYWwoKSxcbiAgICAgICAgb25Qcm9ncmVzcyA9IG5ldyBzaWduYWxzLlNpZ25hbCgpLFxuICAgICAgICBvbkVycm9yID0gbmV3IHNpZ25hbHMuU2lnbmFsKCk7XG5cbiAgICB2YXIgYWRkID0gZnVuY3Rpb24obG9hZGVyKSB7XG4gICAgICAgIHF1ZXVlLnB1c2gobG9hZGVyKTtcbiAgICAgICAgbnVtVG90YWwrKztcbiAgICAgICAgcmV0dXJuIGxvYWRlcjtcbiAgICB9O1xuXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIG51bVRvdGFsID0gcXVldWUubGVuZ3RoO1xuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIHZhciBuZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgb25Db21wbGV0ZS5kaXNwYXRjaCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxvYWRlciA9IHF1ZXVlLnBvcCgpO1xuICAgICAgICBsb2FkZXIub25Qcm9ncmVzcy5hZGQocHJvZ3Jlc3NIYW5kbGVyKTtcbiAgICAgICAgbG9hZGVyLm9uQmVmb3JlQ29tcGxldGUuYWRkT25jZShjb21wbGV0ZUhhbmRsZXIpO1xuICAgICAgICBsb2FkZXIub25FcnJvci5hZGRPbmNlKGVycm9ySGFuZGxlcik7XG4gICAgICAgIGxvYWRlci5zdGFydCgpO1xuICAgIH07XG5cbiAgICB2YXIgcHJvZ3Jlc3NIYW5kbGVyID0gZnVuY3Rpb24ocHJvZ3Jlc3MpIHtcbiAgICAgICAgdmFyIGxvYWRlZCA9IG51bUxvYWRlZCArIHByb2dyZXNzO1xuICAgICAgICBvblByb2dyZXNzLmRpc3BhdGNoKGxvYWRlZCAvIG51bVRvdGFsKTtcbiAgICB9O1xuXG4gICAgdmFyIGNvbXBsZXRlSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBudW1Mb2FkZWQrKztcbiAgICAgICAgb25Qcm9ncmVzcy5kaXNwYXRjaChudW1Mb2FkZWQgLyBudW1Ub3RhbCk7XG4gICAgICAgIG5leHQoKTtcbiAgICB9O1xuXG4gICAgdmFyIGVycm9ySGFuZGxlciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgb25FcnJvci5kaXNwYXRjaChlKTtcbiAgICAgICAgbmV4dCgpO1xuICAgIH07XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgIGFkZDogYWRkLFxuICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgIG9uUHJvZ3Jlc3M6IG9uUHJvZ3Jlc3MsXG4gICAgICAgIG9uQ29tcGxldGU6IG9uQ29tcGxldGUsXG4gICAgICAgIG9uRXJyb3I6IG9uRXJyb3JcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTG9hZGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBNaWNyb3Bob25lKGNvbm5lY3RlZCwgZGVuaWVkLCBlcnJvciwgdGhpc0FyZykge1xuICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWFfID0gKG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci5tc0dldFVzZXJNZWRpYSk7XG4gICAgdGhpcy5faXNTdXBwb3J0ZWQgPSAhIW5hdmlnYXRvci5nZXRVc2VyTWVkaWFfO1xuICAgIHRoaXMuX3N0cmVhbSA9IG51bGw7XG5cbiAgICB0aGlzLl9vbkNvbm5lY3RlZCA9IGNvbm5lY3RlZC5iaW5kKHRoaXNBcmcgfHwgdGhpcyk7XG4gICAgdGhpcy5fb25EZW5pZWQgPSBkZW5pZWQgPyBkZW5pZWQuYmluZCh0aGlzQXJnIHx8IHRoaXMpIDogZnVuY3Rpb24oKSB7fTtcbiAgICB0aGlzLl9vbkVycm9yID0gZXJyb3IgPyBlcnJvci5iaW5kKHRoaXNBcmcgfHwgdGhpcykgOiBmdW5jdGlvbigpIHt9O1xufVxuXG5NaWNyb3Bob25lLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX2lzU3VwcG9ydGVkKSB7IHJldHVybjsgfVxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhXyh7YXVkaW86dHJ1ZX0sIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgICAgICBzZWxmLl9zdHJlYW0gPSBzdHJlYW07XG4gICAgICAgIHNlbGYuX29uQ29ubmVjdGVkKHN0cmVhbSk7XG4gICAgfSwgZnVuY3Rpb24oZSkge1xuICAgICAgICBpZihlLm5hbWUgPT09ICdQZXJtaXNzaW9uRGVuaWVkRXJyb3InIHx8IGUgPT09ICdQRVJNSVNTSU9OX0RFTklFRCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdQZXJtaXNzaW9uIGRlbmllZC4gWW91IGNhbiB1bmRvIHRoaXMgYnkgY2xpY2tpbmcgdGhlIGNhbWVyYSBpY29uIHdpdGggdGhlIHJlZCBjcm9zcyBpbiB0aGUgYWRkcmVzcyBiYXInKTtcbiAgICAgICAgICAgIHNlbGYuX29uRGVuaWVkKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzZWxmLl9vbkVycm9yKGUubWVzc2FnZSB8fCBlKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuTWljcm9waG9uZS5wcm90b3R5cGUuZGlzY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3N0cmVhbSkge1xuICAgICAgICB0aGlzLl9zdHJlYW0uc3RvcCgpO1xuICAgICAgICB0aGlzLl9zdHJlYW0gPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShNaWNyb3Bob25lLnByb3RvdHlwZSwgJ3N0cmVhbScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RyZWFtO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZS5wcm90b3R5cGUsICdpc1N1cHBvcnRlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faXNTdXBwb3J0ZWQ7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWljcm9waG9uZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU3VwcG9ydCgpIHtcbiAgICB2YXIgZXh0ZW5zaW9ucyA9IFtdLFxuICAgICAgICBjYW5QbGF5ID0ge30sXG4gICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcblxuICAgIGlmKCFlbCkgeyByZXR1cm47IH1cblxuICAgIHZhciB0ZXN0cyA9IFtcbiAgICAgICAgeyBleHQ6ICdvZ2cnLCB0eXBlOiAnYXVkaW8vb2dnOyBjb2RlY3M9XCJ2b3JiaXNcIicgfSxcbiAgICAgICAgeyBleHQ6ICdtcDMnLCB0eXBlOiAnYXVkaW8vbXBlZzsnIH0sXG4gICAgICAgIHsgZXh0OiAnb3B1cycsIHR5cGU6ICdhdWRpby9vZ2c7IGNvZGVjcz1cIm9wdXNcIicgfSxcbiAgICAgICAgeyBleHQ6ICd3YXYnLCB0eXBlOiAnYXVkaW8vd2F2OyBjb2RlY3M9XCIxXCInIH0sXG4gICAgICAgIHsgZXh0OiAnbTRhJywgdHlwZTogJ2F1ZGlvL3gtbTRhOycgfSxcbiAgICAgICAgeyBleHQ6ICdtNGEnLCB0eXBlOiAnYXVkaW8vYWFjOycgfVxuICAgIF07XG5cbiAgICB0ZXN0cy5mb3JFYWNoKGZ1bmN0aW9uKHRlc3QpIHtcbiAgICAgICAgdmFyIGNhblBsYXlUeXBlID0gISFlbC5jYW5QbGF5VHlwZSh0ZXN0LnR5cGUpO1xuICAgICAgICBpZihjYW5QbGF5VHlwZSkge1xuICAgICAgICAgICAgZXh0ZW5zaW9ucy5wdXNoKHRlc3QuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBjYW5QbGF5W3Rlc3QuZXh0XSA9IGNhblBsYXlUeXBlO1xuICAgIH0pO1xuXG4gICAgdmFyIGdldEZpbGVFeHRlbnNpb24gPSBmdW5jdGlvbih1cmwpIHtcbiAgICAgICAgdXJsID0gdXJsLnNwbGl0KCc/JylbMF07XG4gICAgICAgIHVybCA9IHVybC5zdWJzdHIodXJsLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcblxuICAgICAgICB2YXIgYSA9IHVybC5zcGxpdCgnLicpO1xuICAgICAgICBpZihhLmxlbmd0aCA9PT0gMSB8fCAoYVswXSA9PT0gJycgJiYgYS5sZW5ndGggPT09IDIpKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGEucG9wKCkudG9Mb3dlckNhc2UoKTtcbiAgICB9O1xuXG4gICAgdmFyIGdldFN1cHBvcnRlZEZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZXMpIHtcbiAgICAgICAgdmFyIG5hbWU7XG5cbiAgICAgICAgaWYoQXJyYXkuaXNBcnJheShmaWxlTmFtZXMpKSB7XG4gICAgICAgICAgICAvLyBpZiBhcnJheSBnZXQgdGhlIGZpcnN0IG9uZSB0aGF0IHdvcmtzXG4gICAgICAgICAgICBmaWxlTmFtZXMuc29tZShmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgdmFyIGV4dCA9IGdldEZpbGVFeHRlbnNpb24oaXRlbSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dGVuc2lvbnMuaW5kZXhPZihleHQpID4gLTE7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmKHR5cGVvZiBmaWxlTmFtZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBpZiBub3QgYXJyYXkgYW5kIGlzIG9iamVjdFxuICAgICAgICAgICAgT2JqZWN0LmtleXMoZmlsZU5hbWVzKS5zb21lKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBmaWxlTmFtZXNba2V5XTtcbiAgICAgICAgICAgICAgICB2YXIgZXh0ID0gZ2V0RmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0ZW5zaW9ucy5pbmRleE9mKGV4dCkgPiAtMTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIHN0cmluZyBqdXN0IHJldHVyblxuICAgICAgICByZXR1cm4gbmFtZSB8fCBmaWxlTmFtZXM7XG4gICAgfTtcblxuICAgIHZhciBjb250YWluc1VSTCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICBpZighY29uZmlnKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgICAvLyBzdHJpbmcsIGFycmF5IG9yIG9iamVjdCB3aXRoIHVybCBwcm9wZXJ0eSB0aGF0IGlzIHN0cmluZyBvciBhcnJheVxuICAgICAgICB2YXIgdXJsID0gY29uZmlnLnVybCB8fCBjb25maWc7XG4gICAgICAgIHJldHVybiBpc1VSTCh1cmwpIHx8IChBcnJheS5pc0FycmF5KHVybCkgJiYgaXNVUkwodXJsWzBdKSk7XG4gICAgfTtcblxuICAgIHZhciBpc1VSTCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuICEhKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICYmIGRhdGEuaW5kZXhPZignLicpID4gLTEpO1xuICAgIH07XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgIGV4dGVuc2lvbnM6IGV4dGVuc2lvbnMsXG4gICAgICAgIGNhblBsYXk6IGNhblBsYXksXG4gICAgICAgIGdldEZpbGVFeHRlbnNpb246IGdldEZpbGVFeHRlbnNpb24sXG4gICAgICAgIGdldFN1cHBvcnRlZEZpbGU6IGdldFN1cHBvcnRlZEZpbGUsXG4gICAgICAgIGNvbnRhaW5zVVJMOiBjb250YWluc1VSTFxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTdXBwb3J0KCk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNaWNyb3Bob25lID0gcmVxdWlyZSgnLi9taWNyb3Bob25lLmpzJyksXG4gICAgV2F2ZWZvcm0gPSByZXF1aXJlKCcuL3dhdmVmb3JtLmpzJyksXG4gICAgVXRpbHMgPSB7fTtcblxuVXRpbHMuc2V0Q29udGV4dCA9IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbn07XG5cbi8qXG4gKiBhdWRpbyBidWZmZXJcbiAqL1xuXG5VdGlscy5jbG9uZUJ1ZmZlciA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgIHZhciBudW1DaGFubmVscyA9IGJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzLFxuICAgICAgICBjbG9uZWQgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUJ1ZmZlcihudW1DaGFubmVscywgYnVmZmVyLmxlbmd0aCwgYnVmZmVyLnNhbXBsZVJhdGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQ2hhbm5lbHM7IGkrKykge1xuICAgICAgICBjbG9uZWQuZ2V0Q2hhbm5lbERhdGEoaSkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YShpKSk7XG4gICAgfVxuICAgIHJldHVybiBjbG9uZWQ7XG59O1xuXG5VdGlscy5yZXZlcnNlQnVmZmVyID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgdmFyIG51bUNoYW5uZWxzID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1DaGFubmVsczsgaSsrKSB7XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5yZXZlcnNlLmNhbGwoYnVmZmVyLmdldENoYW5uZWxEYXRhKGkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGJ1ZmZlcjtcbn07XG5cbi8qXG4gKiBmYWRlIGdhaW5cbiAqL1xuXG5VdGlscy5jcm9zc0ZhZGUgPSBmdW5jdGlvbihmcm9tU291bmQsIHRvU291bmQsIGR1cmF0aW9uKSB7XG4gICAgdmFyIGZyb20gPSB0aGlzLmlzQXVkaW9QYXJhbShmcm9tU291bmQpID8gZnJvbVNvdW5kIDogZnJvbVNvdW5kLmdhaW4uZ2FpbjtcbiAgICB2YXIgdG8gPSB0aGlzLmlzQXVkaW9QYXJhbSh0b1NvdW5kKSA/IHRvU291bmQgOiB0b1NvdW5kLmdhaW4uZ2FpbjtcblxuICAgIHRoaXMucmFtcChmcm9tLCBmcm9tLnZhbHVlLCAwLCBkdXJhdGlvbik7XG4gICAgdGhpcy5yYW1wKHRvLCB0by52YWx1ZSwgMSwgZHVyYXRpb24pO1xufTtcblxuVXRpbHMuZmFkZUZyb20gPSBmdW5jdGlvbihzb3VuZCwgdmFsdWUsIGR1cmF0aW9uKSB7XG4gICAgdmFyIHBhcmFtID0gdGhpcy5pc0F1ZGlvUGFyYW0oc291bmQpID8gc291bmQgOiBzb3VuZC5nYWluLmdhaW47XG4gICAgdGhpcy5yYW1wKHBhcmFtLCB2YWx1ZSwgcGFyYW0udmFsdWUsIGR1cmF0aW9uKTtcbn07XG5cblV0aWxzLmZhZGVUbyA9IGZ1bmN0aW9uKHNvdW5kLCB2YWx1ZSwgZHVyYXRpb24pIHtcbiAgICB2YXIgcGFyYW0gPSB0aGlzLmlzQXVkaW9QYXJhbShzb3VuZCkgPyBzb3VuZCA6IHNvdW5kLmdhaW4uZ2FpbjtcbiAgICB0aGlzLnJhbXAocGFyYW0sIHBhcmFtLnZhbHVlLCB2YWx1ZSwgZHVyYXRpb24pO1xufTtcblxuVXRpbHMucmFtcCA9IGZ1bmN0aW9uKHBhcmFtLCBmcm9tVmFsdWUsIHRvVmFsdWUsIGR1cmF0aW9uKSB7XG4gICAgaWYoIXRoaXMuX2NvbnRleHQpIHsgcmV0dXJuOyB9XG5cbiAgICBwYXJhbS5zZXRWYWx1ZUF0VGltZShmcm9tVmFsdWUsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgIHBhcmFtLmxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lKHRvVmFsdWUsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkdXJhdGlvbik7XG59O1xuXG4vKlxuICogZ2V0IGZyZXF1ZW5jeSBmcm9tIG1pbiB0byBtYXggYnkgcGFzc2luZyAwIHRvIDFcbiAqL1xuXG5VdGlscy5nZXRGcmVxdWVuY3kgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIC8vIGdldCBmcmVxdWVuY3kgYnkgcGFzc2luZyBudW1iZXIgZnJvbSAwIHRvIDFcbiAgICAvLyBDbGFtcCB0aGUgZnJlcXVlbmN5IGJldHdlZW4gdGhlIG1pbmltdW0gdmFsdWUgKDQwIEh6KSBhbmQgaGFsZiBvZiB0aGVcbiAgICAvLyBzYW1wbGluZyByYXRlLlxuICAgIHZhciBtaW5WYWx1ZSA9IDQwO1xuICAgIHZhciBtYXhWYWx1ZSA9IHRoaXMuX2NvbnRleHQuc2FtcGxlUmF0ZSAvIDI7XG4gICAgLy8gTG9nYXJpdGhtIChiYXNlIDIpIHRvIGNvbXB1dGUgaG93IG1hbnkgb2N0YXZlcyBmYWxsIGluIHRoZSByYW5nZS5cbiAgICB2YXIgbnVtYmVyT2ZPY3RhdmVzID0gTWF0aC5sb2cobWF4VmFsdWUgLyBtaW5WYWx1ZSkgLyBNYXRoLkxOMjtcbiAgICAvLyBDb21wdXRlIGEgbXVsdGlwbGllciBmcm9tIDAgdG8gMSBiYXNlZCBvbiBhbiBleHBvbmVudGlhbCBzY2FsZS5cbiAgICB2YXIgbXVsdGlwbGllciA9IE1hdGgucG93KDIsIG51bWJlck9mT2N0YXZlcyAqICh2YWx1ZSAtIDEuMCkpO1xuICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICByZXR1cm4gbWF4VmFsdWUgKiBtdWx0aXBsaWVyO1xufTtcblxuLypcbiAqIGRldGVjdCBmaWxlIHR5cGVzXG4gKi9cblxuVXRpbHMuaXNBdWRpb0J1ZmZlciA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB3aW5kb3cuQXVkaW9CdWZmZXIgJiZcbiAgICAgICAgICAgICAgZGF0YSBpbnN0YW5jZW9mIHdpbmRvdy5BdWRpb0J1ZmZlcik7XG59O1xuXG5VdGlscy5pc01lZGlhRWxlbWVudCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB3aW5kb3cuSFRNTE1lZGlhRWxlbWVudCAmJlxuICAgICAgICAgICAgICBkYXRhIGluc3RhbmNlb2Ygd2luZG93LkhUTUxNZWRpYUVsZW1lbnQpO1xufTtcblxuVXRpbHMuaXNNZWRpYVN0cmVhbSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB0eXBlb2YgZGF0YS5nZXRBdWRpb1RyYWNrcyA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAgICAgICBkYXRhLmdldEF1ZGlvVHJhY2tzKCkubGVuZ3RoICYmXG4gICAgICAgICAgICAgIHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrICYmXG4gICAgICAgICAgICAgIGRhdGEuZ2V0QXVkaW9UcmFja3MoKVswXSBpbnN0YW5jZW9mIHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrKTtcbn07XG5cblV0aWxzLmlzT3NjaWxsYXRvclR5cGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgcmV0dXJuICEhKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICAgKGRhdGEgPT09ICdzaW5lJyB8fCBkYXRhID09PSAnc3F1YXJlJyB8fFxuICAgICAgICAgICAgICBkYXRhID09PSAnc2F3dG9vdGgnIHx8IGRhdGEgPT09ICd0cmlhbmdsZScpKTtcbn07XG5cblV0aWxzLmlzU2NyaXB0Q29uZmlnID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHJldHVybiAhIShkYXRhICYmIHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgICBkYXRhLmJ1ZmZlclNpemUgJiYgZGF0YS5jaGFubmVscyAmJiBkYXRhLmNhbGxiYWNrKTtcbn07XG5cblV0aWxzLmlzQXVkaW9QYXJhbSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJiB3aW5kb3cuQXVkaW9QYXJhbSAmJiBkYXRhIGluc3RhbmNlb2Ygd2luZG93LkF1ZGlvUGFyYW0pO1xufTtcblxuLypcbiAqIG1pY3JvcGhvbmUgdXRpbFxuICovXG5cblV0aWxzLm1pY3JvcGhvbmUgPSBmdW5jdGlvbihjb25uZWN0ZWQsIGRlbmllZCwgZXJyb3IsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gbmV3IE1pY3JvcGhvbmUoY29ubmVjdGVkLCBkZW5pZWQsIGVycm9yLCB0aGlzQXJnKTtcbn07XG5cblV0aWxzLnRpbWVDb2RlID0gZnVuY3Rpb24oc2Vjb25kcywgZGVsaW0pIHtcbiAgICBpZihkZWxpbSA9PT0gdW5kZWZpbmVkKSB7IGRlbGltID0gJzonOyB9XG4gICAgdmFyIGggPSBNYXRoLmZsb29yKHNlY29uZHMgLyAzNjAwKTtcbiAgICB2YXIgbSA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAvIDYwKTtcbiAgICB2YXIgcyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAlIDYwKTtcbiAgICB2YXIgaHIgPSAoaCA9PT0gMCA/ICcnIDogKGggPCAxMCA/ICcwJyArIGggKyBkZWxpbSA6IGggKyBkZWxpbSkpO1xuICAgIHZhciBtbiA9IChtIDwgMTAgPyAnMCcgKyBtIDogbSkgKyBkZWxpbTtcbiAgICB2YXIgc2MgPSAocyA8IDEwID8gJzAnICsgcyA6IHMpO1xuICAgIHJldHVybiBociArIG1uICsgc2M7XG59O1xuXG5VdGlscy53YXZlZm9ybSA9IGZ1bmN0aW9uKGJ1ZmZlciwgbGVuZ3RoKSB7XG4gICAgcmV0dXJuIG5ldyBXYXZlZm9ybShidWZmZXIsIGxlbmd0aCk7XG59O1xuXG4vKlxuICogUGFnZSB2aXNpYmlsaXR5XG4gKi9cblxuVXRpbHMuaGFuZGxlUGFnZVZpc2liaWxpdHkgPSBmdW5jdGlvbihvbkhpZGRlbiwgb25TaG93biwgdGhpc0FyZykge1xuICAgIHZhciBoaWRkZW4sXG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2U7XG5cbiAgICBpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ2hpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAndmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tb3pIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhpZGRlbiA9ICdtb3pIaWRkZW4nO1xuICAgICAgICB2aXNpYmlsaXR5Q2hhbmdlID0gJ21venZpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQubXNIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhpZGRlbiA9ICdtc0hpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnbXN2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50LndlYmtpdEhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ3dlYmtpdEhpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnd2Via2l0dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25DaGFuZ2UoKSB7XG4gICAgICAgIGlmIChkb2N1bWVudFtoaWRkZW5dKSB7XG4gICAgICAgICAgICBvbkhpZGRlbi5jYWxsKHRoaXNBcmcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb25TaG93bi5jYWxsKHRoaXNBcmcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYodmlzaWJpbGl0eUNoYW5nZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIodmlzaWJpbGl0eUNoYW5nZSwgb25DaGFuZ2UsIGZhbHNlKTtcbiAgICB9XG59O1xuXG4vKlxuICogVG91Y2ggbG9ja1xuICovXG5cblV0aWxzLmhhbmRsZVRvdWNobG9jayA9IGZ1bmN0aW9uKG9uVW5sb2NrLCB0aGlzQXJnKSB7XG4gICAgdmFyIHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudCxcbiAgICAgICAgbG9ja2VkID0gISF1YS5tYXRjaCgvQW5kcm9pZHx3ZWJPU3xpUGhvbmV8aVBhZHxpUG9kfEJsYWNrQmVycnl8SUVNb2JpbGV8T3BlcmEgTWluaS9pKTtcblxuICAgIHZhciB1bmxvY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdW5sb2NrKTtcblxuICAgICAgICBpZih0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgICAgICB2YXIgYnVmZmVyID0gdGhpcy5fY29udGV4dC5jcmVhdGVCdWZmZXIoMSwgMSwgMjIwNTApO1xuICAgICAgICAgICAgdmFyIHVubG9ja1NvdXJjZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgICAgICAgICB1bmxvY2tTb3VyY2UuYnVmZmVyID0gYnVmZmVyO1xuICAgICAgICAgICAgdW5sb2NrU291cmNlLmNvbm5lY3QodGhpcy5fY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgICAgICAgICB1bmxvY2tTb3VyY2Uuc3RhcnQoMCk7XG4gICAgICAgIH1cblxuICAgICAgICBvblVubG9jay5jYWxsKHRoaXNBcmcpO1xuXG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgaWYobG9ja2VkKSB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHVubG9jaywgZmFsc2UpO1xuICAgIH1cbiAgICByZXR1cm4gbG9ja2VkO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlscztcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gV2F2ZWZvcm0oKSB7XG5cbiAgICB2YXIgYXVkaW9CdWZmZXIsXG4gICAgICAgIHdhdmVmb3JtRGF0YTtcblxuICAgIHZhciBjb21wdXRlID0gZnVuY3Rpb24oYnVmZmVyLCBsZW5ndGgpIHtcbiAgICAgICAgaWYoIXdpbmRvdy5GbG9hdDMyQXJyYXkgfHwgIXdpbmRvdy5BdWRpb0J1ZmZlcikgeyByZXR1cm4gW107IH1cblxuICAgICAgICB2YXIgc2FtZUJ1ZmZlciA9IGJ1ZmZlciA9PT0gYXVkaW9CdWZmZXI7XG4gICAgICAgIHZhciBzYW1lTGVuZ3RoID0gd2F2ZWZvcm1EYXRhICYmIHdhdmVmb3JtRGF0YS5sZW5ndGggPT09IGxlbmd0aDtcbiAgICAgICAgaWYoc2FtZUJ1ZmZlciAmJiBzYW1lTGVuZ3RoKSB7IHJldHVybiB3YXZlZm9ybURhdGE7IH1cbiAgICAgICAgXG4gICAgICAgIC8vY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tLS0nKTtcbiAgICAgICAgLy9jb25zb2xlLnRpbWUoJ3dhdmVmb3JtRGF0YScpO1xuICAgICAgICB2YXIgd2F2ZWZvcm0gPSBuZXcgRmxvYXQzMkFycmF5KGxlbmd0aCksXG4gICAgICAgICAgICBjaHVuayA9IE1hdGguZmxvb3IoYnVmZmVyLmxlbmd0aCAvIGxlbmd0aCksXG4gICAgICAgICAgICAvL2NodW5rID0gYnVmZmVyLmxlbmd0aCAvIGxlbmd0aCxcbiAgICAgICAgICAgIHJlc29sdXRpb24gPSA1LCAvLyAxMFxuICAgICAgICAgICAgaW5jciA9IE1hdGguZmxvb3IoY2h1bmsgLyByZXNvbHV0aW9uKSxcbiAgICAgICAgICAgIGdyZWF0ZXN0ID0gMDtcblxuICAgICAgICBpZihpbmNyIDwgMSkgeyBpbmNyID0gMTsgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBjaG5scyA9IGJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzOyBpIDwgY2hubHM7IGkrKykge1xuICAgICAgICAgICAgLy8gY2hlY2sgZWFjaCBjaGFubmVsXG4gICAgICAgICAgICB2YXIgY2hhbm5lbCA9IGJ1ZmZlci5nZXRDaGFubmVsRGF0YShpKTtcbiAgICAgICAgICAgIC8vZm9yICh2YXIgaiA9IGxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IGhpZ2hlc3QgdmFsdWUgd2l0aGluIHRoZSBjaHVua1xuICAgICAgICAgICAgICAgIC8vdmFyIGNoID0gaiAqIGNodW5rO1xuICAgICAgICAgICAgICAgIC8vZm9yICh2YXIgayA9IGNoICsgY2h1bmsgLSAxOyBrID49IGNoOyBrIC09IGluY3IpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrID0gaiAqIGNodW5rLCBsID0gayArIGNodW5rOyBrIDwgbDsgayArPSBpbmNyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNlbGVjdCBoaWdoZXN0IHZhbHVlIGZyb20gY2hhbm5lbHNcbiAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSBjaGFubmVsW2tdO1xuICAgICAgICAgICAgICAgICAgICBpZihhIDwgMCkgeyBhID0gLWE7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGEgPiB3YXZlZm9ybVtqXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2F2ZWZvcm1bal0gPSBhO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBoaWdoZXN0IG92ZXJhbGwgZm9yIHNjYWxpbmdcbiAgICAgICAgICAgICAgICAgICAgaWYoYSA+IGdyZWF0ZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBncmVhdGVzdCA9IGE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2NhbGUgdXA/XG4gICAgICAgIHZhciBzY2FsZSA9IDEgLyBncmVhdGVzdCxcbiAgICAgICAgICAgIGxlbiA9IHdhdmVmb3JtLmxlbmd0aDtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB3YXZlZm9ybVtpXSAqPSBzY2FsZTtcbiAgICAgICAgfVxuICAgICAgICAvL2NvbnNvbGUudGltZUVuZCgnd2F2ZWZvcm1EYXRhJyk7XG5cbiAgICAgICAgLy8gY2FjaGUgZm9yIHJlcGVhdGVkIGNhbGxzXG4gICAgICAgIGF1ZGlvQnVmZmVyID0gYnVmZmVyO1xuICAgICAgICB3YXZlZm9ybURhdGEgPSB3YXZlZm9ybTtcblxuICAgICAgICByZXR1cm4gd2F2ZWZvcm07XG4gICAgfTtcblxuICAgIHZhciBkcmF3ID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICAgIHZhciB4LCB5O1xuICAgICAgICB2YXIgY2FudmFzID0gY29uZmlnLmNhbnZhcyB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgdmFyIHdpZHRoID0gY29uZmlnLndpZHRoIHx8IGNhbnZhcy53aWR0aDtcbiAgICAgICAgdmFyIGhlaWdodCA9IGNvbmZpZy5oZWlnaHQgfHwgY2FudmFzLmhlaWdodDtcbiAgICAgICAgdmFyIGNvbG9yID0gY29uZmlnLmNvbG9yIHx8ICcjMzMzMzMzJztcbiAgICAgICAgdmFyIGJnQ29sb3IgPSBjb25maWcuYmdDb2xvciB8fCAnI2RkZGRkZCc7XG4gICAgICAgIHZhciBidWZmZXIgPSBjb25maWcuc291bmQgPyBjb25maWcuc291bmQuZGF0YSA6IGNvbmZpZy5idWZmZXIgfHwgYXVkaW9CdWZmZXI7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5jb21wdXRlKGJ1ZmZlciwgd2lkdGgpO1xuXG4gICAgICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBiZ0NvbG9yO1xuICAgICAgICBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHggPSBpICsgMC41O1xuICAgICAgICAgICAgeSA9IGhlaWdodCAtIE1hdGgucm91bmQoaGVpZ2h0ICogZGF0YVtpXSk7XG4gICAgICAgICAgICBjb250ZXh0Lm1vdmVUbyh4LCB5KTtcbiAgICAgICAgICAgIGNvbnRleHQubGluZVRvKHgsIGhlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5zdHJva2UoKTtcblxuICAgICAgICByZXR1cm4gY2FudmFzO1xuICAgIH07XG4gICAgXG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoe1xuICAgICAgICBjb21wdXRlOiBjb21wdXRlLFxuICAgICAgICBkcmF3OiBkcmF3XG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2F2ZWZvcm07XG4iXX0=
