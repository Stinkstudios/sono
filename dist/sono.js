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
    this._support = new Support();

    this._handleTouchlock();
    this._handleVisibility();
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
    if(Utils.isFile(data)) {
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
    // multiple
    if(url instanceof Array && url.length && typeof url[0] === 'object') {
        this._loadMultiple(url, complete, progress, thisArg, asMediaElement);
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

Sono.prototype._loadMultiple = function(config, complete, progress, thisArg, asMediaElement) {
    var sounds = [];
    for (var i = 0, l = config.length; i < l; i++) {
        var file = config[i];
        var sound = this._queue(file.url, asMediaElement);
        if(file.id) { sound.id = file.id; }
        sound.loop = !!file.loop;
        sound.volume = file.volume;
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

Sono.prototype._handleTouchlock = function() {
    var ua = navigator.userAgent,
        locked = !!ua.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i),
        self = this;

    var unlock = function() {
        document.body.removeEventListener('touchstart', unlock);
        self._isTouchLocked = false;
        if(self._loader) {
            self._loader.touchLocked = false;
        }
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

Sono.prototype.log = function() {
    var title = 'Sono ' + this.VERSION,
        info = 'Supported:' + this.isSupported +
               ' WebAudioAPI:' + this.hasWebAudio +
               ' TouchLocked:' + this._isTouchLocked +
               ' Extensions:' + this._support.extensions;

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

if (typeof module === 'object' && module.exports) {
    module.exports = new Sono();
}

},{"./lib/loader.js":4,"./lib/node-manager.js":7,"./lib/sound.js":11,"./lib/support.js":12,"./lib/utils.js":13}],2:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
'use strict';

var signals = require('signals');

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

},{"signals":2}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
'use strict';

var Panner = require('./panner.js');

function NodeManager(context) {
    this._context = context || this.createFakeContext();
    this._destination = null;
    this._nodeList = [];
    this._sourceNode = null;
}

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

NodeManager.prototype._connectTo = function(node) {
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
        this._connectTo(this._destination);
    }
    /*else {
        this._connectTo(this._gain);
    }*/
};

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
    var panner = new Panner(this._context);
    this.add(panner.node);
    return panner;
};
/*NodeManager.prototype.panner = function() {
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
};*/

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

},{"./panner.js":9}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
'use strict';

function Panner(context) {
    var node = context.createPanner();
    // Default for stereo is HRTF
    node.panningModel = 'HRTF'; // 'equalpower'

    // Distance model and attributes
    node.distanceModel = 'linear'; // 'linear' 'inverse' 'exponential'
    node.refDistance = 1;
    node.maxDistance = 1000;
    node.rolloffFactor = 1;
    
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
        // map native methods to PannerNode
        setPosition: node.setPosition,
        setOrientation: node.setOrientation,
        coneOuterGain: node.coneOuterGain,
        // map native methods to AudioNode
        connect: node.connect,
        disconnect: node.disconnect
    };

    // map native properties to PannerNode
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

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Panner;
}


},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
'use strict';

var BufferSource = require('./buffer-source.js'),
    MediaSource = require('./media-source.js'),
    NodeManager = require('./node-manager.js'),
    MicrophoneSource = require('./microphone-source.js'),
    OscillatorSource = require('./oscillator-source.js'),
    ScriptSource = require('./script-source.js'),
    Utils = require('./utils.js');

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

    this.setData(data);
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

},{"./buffer-source.js":3,"./media-source.js":5,"./microphone-source.js":6,"./node-manager.js":7,"./oscillator-source.js":8,"./script-source.js":10,"./utils.js":13}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
'use strict';

var Utils = {};

Utils.setContext = function(context) {
    this._context = context;
};

Utils.crossFade = function(fromSound, toSound, duration) {
    fromSound.gain.gain.linearRampToValueAtTime(0, this._context.currentTime + duration);
    toSound.gain.gain.linearRampToValueAtTime(1, this._context.currentTime + duration);
};

Utils.distort = function(value) {
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

Utils.fadeFrom = function(sound, value, duration) {
    var toValue = sound.gain.gain.value;
    sound.gain.gain.value = value;
    sound.gain.gain.linearRampToValueAtTime(toValue, this._context.currentTime + duration);
};

Utils.fadeTo = function(sound, value, duration) {
    sound.gain.gain.linearRampToValueAtTime(value, this._context.currentTime + duration);
};

Utils.filter = function(filterNode, freqPercent, quality, gain) {
    // set filter frequency based on value from 0 to 1
    if(isNaN(freqPercent)) { freqPercent = 0.5; }
    if(isNaN(quality)) { quality = 0; }
    if(isNaN(gain)) { gain = 0; }
    // Get back to the frequency value between min and max.
    filterNode.frequency.value = this.getFrequency(freqPercent);
    filterNode.Q.value = quality; // range of 0.0001 to 1000
    filterNode.gain.value = gain; // -40 to 40
};

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

Utils.isFile = function(data) {
    return !!(data && (data instanceof Array ||
              (typeof data === 'string' && data.indexOf('.') > -1)));
};

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuL3NyYy9zb25vLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vbm9kZV9tb2R1bGVzL3NpZ25hbHMvZGlzdC9zaWduYWxzLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL2xpYi9idWZmZXItc291cmNlLmpzIiwiL1VzZXJzL2lhbm1jZ3JlZ29yL0Ryb3Bib3gvd29ya3NwYWNlL3Nvbm8vc3JjL2xpYi9sb2FkZXIuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL21lZGlhLXNvdXJjZS5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvbWljcm9waG9uZS1zb3VyY2UuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL25vZGUtbWFuYWdlci5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvb3NjaWxsYXRvci1zb3VyY2UuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL3Bhbm5lci5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvc2NyaXB0LXNvdXJjZS5qcyIsIi9Vc2Vycy9pYW5tY2dyZWdvci9Ecm9wYm94L3dvcmtzcGFjZS9zb25vL3NyYy9saWIvc291bmQuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL3N1cHBvcnQuanMiLCIvVXNlcnMvaWFubWNncmVnb3IvRHJvcGJveC93b3Jrc3BhY2Uvc29uby9zcmMvbGliL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIExvYWRlciA9IHJlcXVpcmUoJy4vbGliL2xvYWRlci5qcycpLFxuICAgIE5vZGVNYW5hZ2VyID0gcmVxdWlyZSgnLi9saWIvbm9kZS1tYW5hZ2VyLmpzJyksXG4gICAgU291bmQgPSByZXF1aXJlKCcuL2xpYi9zb3VuZC5qcycpLFxuICAgIFN1cHBvcnQgPSByZXF1aXJlKCcuL2xpYi9zdXBwb3J0LmpzJyksXG4gICAgVXRpbHMgPSByZXF1aXJlKCcuL2xpYi91dGlscy5qcycpO1xuXG5mdW5jdGlvbiBTb25vKCkge1xuICAgIHRoaXMuVkVSU0lPTiA9ICcwLjAuMCc7XG5cbiAgICB3aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuICAgIHRoaXMuX2NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0ID8gbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKSA6IG51bGw7XG4gICAgVXRpbHMuc2V0Q29udGV4dCh0aGlzLl9jb250ZXh0KTtcblxuICAgIHRoaXMuX25vZGUgPSBuZXcgTm9kZU1hbmFnZXIodGhpcy5fY29udGV4dCk7XG4gICAgdGhpcy5fbWFzdGVyR2FpbiA9IHRoaXMuX25vZGUuZ2FpbigpO1xuICAgIGlmKHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fbm9kZS5zZXRTb3VyY2UodGhpcy5fbWFzdGVyR2Fpbik7XG4gICAgICAgIHRoaXMuX25vZGUuc2V0RGVzdGluYXRpb24odGhpcy5fY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfVxuXG4gICAgdGhpcy5fc291bmRzID0gW107XG4gICAgdGhpcy5fc3VwcG9ydCA9IG5ldyBTdXBwb3J0KCk7XG5cbiAgICB0aGlzLl9oYW5kbGVUb3VjaGxvY2soKTtcbiAgICB0aGlzLl9oYW5kbGVWaXNpYmlsaXR5KCk7XG4gICAgLy90aGlzLmxvZygpO1xufVxuXG4vKlxuICogQ3JlYXRlXG4gKlxuICogQWNjZXB0ZWQgdmFsdWVzIGZvciBwYXJhbSBkYXRhOlxuICpcbiAqIEFycmF5QnVmZmVyXG4gKiBIVE1MTWVkaWFFbGVtZW50XG4gKiBBcnJheSAob2YgZmlsZXMgZS5nLiBbJ2Zvby5vZ2cnLCAnZm9vLm1wMyddKVxuICogU3RyaW5nIChmaWxlbmFtZSBlLmcuICdmb28ub2dnJylcbiAqIFN0cmluZyAoT3NjaWxsYXRvciB0eXBlIGkuZS4gJ3NpbmUnLCAnc3F1YXJlJywgJ3Nhd3Rvb3RoJywgJ3RyaWFuZ2xlJylcbiAqIE9iamVjdCAoU2NyaXB0UHJvY2Vzc29yIGNvbmZpZzogeyBidWZmZXJTaXplOiAxMDI0LCBjaGFubmVsczogMSwgY2FsbGJhY2s6IGZuLCB0aGlzQXJnOiBzZWxmIH0pXG4gKi9cblxuU29uby5wcm90b3R5cGUuY3JlYXRlU291bmQgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgLy8gdHJ5IHRvIGxvYWQgaWYgZGF0YSBpcyBBcnJheSBvciBmaWxlIHN0cmluZ1xuICAgIGlmKFV0aWxzLmlzRmlsZShkYXRhKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2FkKGRhdGEpO1xuICAgIH1cbiAgICAvLyBvdGhlcndpc2UganVzdCByZXR1cm4gYSBuZXcgc291bmQgb2JqZWN0XG4gICAgdmFyIHNvdW5kID0gbmV3IFNvdW5kKHRoaXMuX2NvbnRleHQsIGRhdGEsIHRoaXMuX21hc3RlckdhaW4pO1xuICAgIHRoaXMuX3NvdW5kcy5wdXNoKHNvdW5kKTtcblxuICAgIHJldHVybiBzb3VuZDtcbn07XG5cbi8qXG4gKiBEZXN0cm95XG4gKi9cblxuU29uby5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKHNvdW5kT3JJZCkge1xuICAgIHZhciBzb3VuZDtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IHRoaXMuX3NvdW5kcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgc291bmQgPSB0aGlzLl9zb3VuZHNbaV07XG4gICAgICAgIGlmKHNvdW5kID09PSBzb3VuZE9ySWQgfHwgc291bmQuaWQgPT09IHNvdW5kT3JJZCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYoc291bmQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLl9zb3VuZHMuc3BsaWNlKGksIDEpO1xuXG4gICAgICAgIGlmKHNvdW5kLmxvYWRlcikge1xuICAgICAgICAgICAgc291bmQubG9hZGVyLmNhbmNlbCgpO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzb3VuZC5zdG9wKCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICB9XG59O1xuXG4vKlxuICogR2V0IFNvdW5kIGJ5IGlkXG4gKi9cblxuU29uby5wcm90b3R5cGUuZ2V0QnlJZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9zb3VuZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKHRoaXMuX3NvdW5kc1tpXS5pZCA9PT0gaWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zb3VuZHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59O1xuXG4vKlxuICogTG9hZGluZ1xuICovXG5cblNvbm8ucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbih1cmwsIGNvbXBsZXRlLCBwcm9ncmVzcywgdGhpc0FyZywgYXNNZWRpYUVsZW1lbnQpIHtcbiAgICAvLyBtdWx0aXBsZVxuICAgIGlmKHVybCBpbnN0YW5jZW9mIEFycmF5ICYmIHVybC5sZW5ndGggJiYgdHlwZW9mIHVybFswXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdGhpcy5fbG9hZE11bHRpcGxlKHVybCwgY29tcGxldGUsIHByb2dyZXNzLCB0aGlzQXJnLCBhc01lZGlhRWxlbWVudCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc291bmQgPSB0aGlzLl9xdWV1ZSh1cmwsIGFzTWVkaWFFbGVtZW50KTtcblxuICAgIGlmKHByb2dyZXNzKSB7XG4gICAgICAgIHNvdW5kLmxvYWRlci5vblByb2dyZXNzLmFkZChwcm9ncmVzcywgdGhpc0FyZyB8fCB0aGlzKTtcbiAgICB9XG4gICAgaWYoY29tcGxldGUpIHtcbiAgICAgICAgc291bmQubG9hZGVyLm9uQ29tcGxldGUuYWRkT25jZShmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbXBsZXRlLmNhbGwodGhpc0FyZyB8fCB0aGlzLCBzb3VuZCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBzb3VuZC5sb2FkZXIuc3RhcnQoKTtcblxuICAgIHJldHVybiBzb3VuZDtcbn07XG5cblNvbm8ucHJvdG90eXBlLl9sb2FkTXVsdGlwbGUgPSBmdW5jdGlvbihjb25maWcsIGNvbXBsZXRlLCBwcm9ncmVzcywgdGhpc0FyZywgYXNNZWRpYUVsZW1lbnQpIHtcbiAgICB2YXIgc291bmRzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjb25maWcubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBmaWxlID0gY29uZmlnW2ldO1xuICAgICAgICB2YXIgc291bmQgPSB0aGlzLl9xdWV1ZShmaWxlLnVybCwgYXNNZWRpYUVsZW1lbnQpO1xuICAgICAgICBpZihmaWxlLmlkKSB7IHNvdW5kLmlkID0gZmlsZS5pZDsgfVxuICAgICAgICBzb3VuZC5sb29wID0gISFmaWxlLmxvb3A7XG4gICAgICAgIHNvdW5kLnZvbHVtZSA9IGZpbGUudm9sdW1lO1xuICAgICAgICBzb3VuZHMucHVzaChzb3VuZCk7XG4gICAgfVxuICAgIGlmKHByb2dyZXNzKSB7XG4gICAgICAgIHRoaXMuX2xvYWRlci5vblByb2dyZXNzLmFkZChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgICBwcm9ncmVzcy5jYWxsKHRoaXNBcmcgfHwgdGhpcywgcCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpZihjb21wbGV0ZSkge1xuICAgICAgICB0aGlzLl9sb2FkZXIub25Db21wbGV0ZS5hZGRPbmNlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29tcGxldGUuY2FsbCh0aGlzQXJnIHx8IHRoaXMsIHNvdW5kcyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLl9sb2FkZXIuc3RhcnQoKTtcbn07XG5cblNvbm8ucHJvdG90eXBlLl9pbml0TG9hZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbG9hZGVyID0gbmV3IExvYWRlcigpO1xuICAgIHRoaXMuX2xvYWRlci50b3VjaExvY2tlZCA9IHRoaXMuX2lzVG91Y2hMb2NrZWQ7XG4gICAgdGhpcy5fbG9hZGVyLndlYkF1ZGlvQ29udGV4dCA9IHRoaXMuX2NvbnRleHQ7XG4gICAgdGhpcy5fbG9hZGVyLmNyb3NzT3JpZ2luID0gdHJ1ZTtcbn07XG5cblNvbm8ucHJvdG90eXBlLl9xdWV1ZSA9IGZ1bmN0aW9uKHVybCwgYXNNZWRpYUVsZW1lbnQpIHtcbiAgICBpZighdGhpcy5fbG9hZGVyKSB7XG4gICAgICAgIHRoaXMuX2luaXRMb2FkZXIoKTtcbiAgICB9XG5cbiAgICB1cmwgPSB0aGlzLl9zdXBwb3J0LmdldFN1cHBvcnRlZEZpbGUodXJsKTtcblxuICAgIHZhciBzb3VuZCA9IHRoaXMuY3JlYXRlU291bmQoKTtcblxuICAgIHNvdW5kLmxvYWRlciA9IHRoaXMuX2xvYWRlci5hZGQodXJsKTtcbiAgICBzb3VuZC5sb2FkZXIub25CZWZvcmVDb21wbGV0ZS5hZGRPbmNlKGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICBzb3VuZC5zZXREYXRhKGJ1ZmZlcik7XG4gICAgfSk7XG5cbiAgICBpZihhc01lZGlhRWxlbWVudCkge1xuICAgICAgICBzb3VuZC5sb2FkZXIud2ViQXVkaW9Db250ZXh0ID0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gc291bmQ7XG59O1xuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5tdXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcHJlTXV0ZVZvbHVtZSA9IHRoaXMudm9sdW1lO1xuICAgIHRoaXMudm9sdW1lID0gMDtcbn07XG5cblNvbm8ucHJvdG90eXBlLnVuTXV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudm9sdW1lID0gdGhpcy5fcHJlTXV0ZVZvbHVtZSB8fCAxO1xufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAndm9sdW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXN0ZXJHYWluLmdhaW4udmFsdWU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmKGlzTmFOKHZhbHVlKSkgeyByZXR1cm47IH1cblxuICAgICAgICB0aGlzLl9tYXN0ZXJHYWluLmdhaW4udmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICBpZighdGhpcy5oYXNXZWJBdWRpbykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9zb3VuZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc291bmRzW2ldLnZvbHVtZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cblNvbm8ucHJvdG90eXBlLnBhdXNlQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSB0aGlzLl9zb3VuZHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKHRoaXMuX3NvdW5kc1tpXS5wbGF5aW5nKSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VuZHNbaV0ucGF1c2UoKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblNvbm8ucHJvdG90eXBlLnJlc3VtZUFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5fc291bmRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZih0aGlzLl9zb3VuZHNbaV0ucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VuZHNbaV0ucGxheSgpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuU29uby5wcm90b3R5cGUuc3RvcEFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5fc291bmRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0aGlzLl9zb3VuZHNbaV0uc3RvcCgpO1xuICAgIH1cbn07XG5cblNvbm8ucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihpZCwgZGVsYXksIG9mZnNldCkge1xuICAgIHRoaXMuZ2V0QnlJZChpZCkucGxheShkZWxheSwgb2Zmc2V0KTtcbn07XG5cblNvbm8ucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oaWQpIHtcbiAgICB0aGlzLmdldEJ5SWQoaWQpLnBhdXNlKCk7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oaWQpIHtcbiAgICB0aGlzLmdldEJ5SWQoaWQpLnN0b3AoKTtcbn07XG5cbi8qXG4gKiBNb2JpbGUgdG91Y2ggbG9ja1xuICovXG5cblNvbm8ucHJvdG90eXBlLl9oYW5kbGVUb3VjaGxvY2sgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50LFxuICAgICAgICBsb2NrZWQgPSAhIXVhLm1hdGNoKC9BbmRyb2lkfHdlYk9TfGlQaG9uZXxpUGFkfGlQb2R8QmxhY2tCZXJyeXxJRU1vYmlsZXxPcGVyYSBNaW5pL2kpLFxuICAgICAgICBzZWxmID0gdGhpcztcblxuICAgIHZhciB1bmxvY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdW5sb2NrKTtcbiAgICAgICAgc2VsZi5faXNUb3VjaExvY2tlZCA9IGZhbHNlO1xuICAgICAgICBpZihzZWxmLl9sb2FkZXIpIHtcbiAgICAgICAgICAgIHNlbGYuX2xvYWRlci50b3VjaExvY2tlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmKHNlbGYuY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGJ1ZmZlciA9IHNlbGYuY29udGV4dC5jcmVhdGVCdWZmZXIoMSwgMSwgMjIwNTApO1xuICAgICAgICAgICAgdmFyIHVubG9ja1NvdXJjZSA9IHNlbGYuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICAgICAgICAgIHVubG9ja1NvdXJjZS5idWZmZXIgPSBidWZmZXI7XG4gICAgICAgICAgICB1bmxvY2tTb3VyY2UuY29ubmVjdChzZWxmLmNvbnRleHQuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgdW5sb2NrU291cmNlLnN0YXJ0KDApO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBpZihsb2NrZWQpIHtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdW5sb2NrLCBmYWxzZSk7XG4gICAgfVxuICAgIHRoaXMuX2lzVG91Y2hMb2NrZWQgPSBsb2NrZWQ7XG59O1xuXG4vKlxuICogUGFnZSB2aXNpYmlsaXR5IGV2ZW50c1xuICovXG5cblNvbm8ucHJvdG90eXBlLl9oYW5kbGVWaXNpYmlsaXR5ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhZ2VIaWRkZW5QYXVzZWQgPSBbXSxcbiAgICAgICAgc291bmRzID0gdGhpcy5fc291bmRzLFxuICAgICAgICBoaWRkZW4sXG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2U7XG5cbiAgICBpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ2hpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAndmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tb3pIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhpZGRlbiA9ICdtb3pIaWRkZW4nO1xuICAgICAgICB2aXNpYmlsaXR5Q2hhbmdlID0gJ21venZpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQubXNIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhpZGRlbiA9ICdtc0hpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnbXN2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50LndlYmtpdEhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ3dlYmtpdEhpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnd2Via2l0dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuXG4gICAgLy8gcGF1c2UgY3VycmVudGx5IHBsYXlpbmcgc291bmRzIGFuZCBzdG9yZSByZWZzXG4gICAgZnVuY3Rpb24gb25IaWRkZW4oKSB7XG4gICAgICAgIHZhciBsID0gc291bmRzLmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBzb3VuZCA9IHNvdW5kc1tpXTtcbiAgICAgICAgICAgIGlmKHNvdW5kLnBsYXlpbmcpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIHBhZ2VIaWRkZW5QYXVzZWQucHVzaChzb3VuZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBwbGF5IHNvdW5kcyB0aGF0IGdvdCBwYXVzZWQgd2hlbiBwYWdlIHdhcyBoaWRkZW5cbiAgICBmdW5jdGlvbiBvblNob3duKCkge1xuICAgICAgICB3aGlsZShwYWdlSGlkZGVuUGF1c2VkLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFnZUhpZGRlblBhdXNlZC5wb3AoKS5wbGF5KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkNoYW5nZSgpIHtcbiAgICAgICAgaWYgKGRvY3VtZW50W2hpZGRlbl0pIHtcbiAgICAgICAgICAgIG9uSGlkZGVuKCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvblNob3duKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZih2aXNpYmlsaXR5Q2hhbmdlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih2aXNpYmlsaXR5Q2hhbmdlLCBvbkNoYW5nZSwgZmFsc2UpO1xuICAgIH1cbn07XG5cbi8qXG4gKiBMb2cgdmVyc2lvbiAmIGRldmljZSBzdXBwb3J0IGluZm9cbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5sb2cgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGl0bGUgPSAnU29ubyAnICsgdGhpcy5WRVJTSU9OLFxuICAgICAgICBpbmZvID0gJ1N1cHBvcnRlZDonICsgdGhpcy5pc1N1cHBvcnRlZCArXG4gICAgICAgICAgICAgICAnIFdlYkF1ZGlvQVBJOicgKyB0aGlzLmhhc1dlYkF1ZGlvICtcbiAgICAgICAgICAgICAgICcgVG91Y2hMb2NrZWQ6JyArIHRoaXMuX2lzVG91Y2hMb2NrZWQgK1xuICAgICAgICAgICAgICAgJyBFeHRlbnNpb25zOicgKyB0aGlzLl9zdXBwb3J0LmV4dGVuc2lvbnM7XG5cbiAgICBpZihuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ0Nocm9tZScpID4gLTEpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXG4gICAgICAgICAgICAgICAgJyVjIOKZqyAnICsgdGl0bGUgK1xuICAgICAgICAgICAgICAgICcg4pmrICVjICcgKyBpbmZvICsgJyAnLFxuICAgICAgICAgICAgICAgICdjb2xvcjogI0ZGRkZGRjsgYmFja2dyb3VuZDogIzM3OUY3QScsXG4gICAgICAgICAgICAgICAgJ2NvbG9yOiAjMUYxQzBEOyBiYWNrZ3JvdW5kOiAjRTBGQkFDJ1xuICAgICAgICAgICAgXTtcbiAgICAgICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJncyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHdpbmRvdy5jb25zb2xlICYmIHdpbmRvdy5jb25zb2xlLmxvZy5jYWxsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nLmNhbGwoY29uc29sZSwgdGl0bGUgKyAnICcgKyBpbmZvKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICdjYW5QbGF5Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdXBwb3J0LmNhblBsYXk7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2NvbnRleHQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2hhc1dlYkF1ZGlvJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAhIXRoaXMuX2NvbnRleHQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ2lzU3VwcG9ydGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zdXBwb3J0LmV4dGVuc2lvbnMubGVuZ3RoID4gMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnbWFzdGVyR2FpbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWFzdGVyR2FpbjtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnbm9kZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbm9kZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvbm8ucHJvdG90eXBlLCAnc291bmRzJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VuZHM7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ3V0aWxzJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBVdGlscztcbiAgICB9XG59KTtcblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IG5ldyBTb25vKCk7XG59XG4iLCIvKmpzbGludCBvbmV2YXI6dHJ1ZSwgdW5kZWY6dHJ1ZSwgbmV3Y2FwOnRydWUsIHJlZ2V4cDp0cnVlLCBiaXR3aXNlOnRydWUsIG1heGVycjo1MCwgaW5kZW50OjQsIHdoaXRlOmZhbHNlLCBub21lbjpmYWxzZSwgcGx1c3BsdXM6ZmFsc2UgKi9cbi8qZ2xvYmFsIGRlZmluZTpmYWxzZSwgcmVxdWlyZTpmYWxzZSwgZXhwb3J0czpmYWxzZSwgbW9kdWxlOmZhbHNlLCBzaWduYWxzOmZhbHNlICovXG5cbi8qKiBAbGljZW5zZVxuICogSlMgU2lnbmFscyA8aHR0cDovL21pbGxlcm1lZGVpcm9zLmdpdGh1Yi5jb20vanMtc2lnbmFscy8+XG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2VcbiAqIEF1dGhvcjogTWlsbGVyIE1lZGVpcm9zXG4gKiBWZXJzaW9uOiAxLjAuMCAtIEJ1aWxkOiAyNjggKDIwMTIvMTEvMjkgMDU6NDggUE0pXG4gKi9cblxuKGZ1bmN0aW9uKGdsb2JhbCl7XG5cbiAgICAvLyBTaWduYWxCaW5kaW5nIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8qKlxuICAgICAqIE9iamVjdCB0aGF0IHJlcHJlc2VudHMgYSBiaW5kaW5nIGJldHdlZW4gYSBTaWduYWwgYW5kIGEgbGlzdGVuZXIgZnVuY3Rpb24uXG4gICAgICogPGJyIC8+LSA8c3Ryb25nPlRoaXMgaXMgYW4gaW50ZXJuYWwgY29uc3RydWN0b3IgYW5kIHNob3VsZG4ndCBiZSBjYWxsZWQgYnkgcmVndWxhciB1c2Vycy48L3N0cm9uZz5cbiAgICAgKiA8YnIgLz4tIGluc3BpcmVkIGJ5IEpvYSBFYmVydCBBUzMgU2lnbmFsQmluZGluZyBhbmQgUm9iZXJ0IFBlbm5lcidzIFNsb3QgY2xhc3Nlcy5cbiAgICAgKiBAYXV0aG9yIE1pbGxlciBNZWRlaXJvc1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqIEBuYW1lIFNpZ25hbEJpbmRpbmdcbiAgICAgKiBAcGFyYW0ge1NpZ25hbH0gc2lnbmFsIFJlZmVyZW5jZSB0byBTaWduYWwgb2JqZWN0IHRoYXQgbGlzdGVuZXIgaXMgY3VycmVudGx5IGJvdW5kIHRvLlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIEhhbmRsZXIgZnVuY3Rpb24gYm91bmQgdG8gdGhlIHNpZ25hbC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzT25jZSBJZiBiaW5kaW5nIHNob3VsZCBiZSBleGVjdXRlZCBqdXN0IG9uY2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtsaXN0ZW5lckNvbnRleHRdIENvbnRleHQgb24gd2hpY2ggbGlzdGVuZXIgd2lsbCBiZSBleGVjdXRlZCAob2JqZWN0IHRoYXQgc2hvdWxkIHJlcHJlc2VudCB0aGUgYHRoaXNgIHZhcmlhYmxlIGluc2lkZSBsaXN0ZW5lciBmdW5jdGlvbikuXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IFtwcmlvcml0eV0gVGhlIHByaW9yaXR5IGxldmVsIG9mIHRoZSBldmVudCBsaXN0ZW5lci4gKGRlZmF1bHQgPSAwKS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBTaWduYWxCaW5kaW5nKHNpZ25hbCwgbGlzdGVuZXIsIGlzT25jZSwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIYW5kbGVyIGZ1bmN0aW9uIGJvdW5kIHRvIHRoZSBzaWduYWwuXG4gICAgICAgICAqIEB0eXBlIEZ1bmN0aW9uXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9saXN0ZW5lciA9IGxpc3RlbmVyO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiBiaW5kaW5nIHNob3VsZCBiZSBleGVjdXRlZCBqdXN0IG9uY2UuXG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX2lzT25jZSA9IGlzT25jZTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udGV4dCBvbiB3aGljaCBsaXN0ZW5lciB3aWxsIGJlIGV4ZWN1dGVkIChvYmplY3QgdGhhdCBzaG91bGQgcmVwcmVzZW50IHRoZSBgdGhpc2AgdmFyaWFibGUgaW5zaWRlIGxpc3RlbmVyIGZ1bmN0aW9uKS5cbiAgICAgICAgICogQG1lbWJlck9mIFNpZ25hbEJpbmRpbmcucHJvdG90eXBlXG4gICAgICAgICAqIEBuYW1lIGNvbnRleHRcbiAgICAgICAgICogQHR5cGUgT2JqZWN0fHVuZGVmaW5lZHxudWxsXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBsaXN0ZW5lckNvbnRleHQ7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlZmVyZW5jZSB0byBTaWduYWwgb2JqZWN0IHRoYXQgbGlzdGVuZXIgaXMgY3VycmVudGx5IGJvdW5kIHRvLlxuICAgICAgICAgKiBAdHlwZSBTaWduYWxcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX3NpZ25hbCA9IHNpZ25hbDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogTGlzdGVuZXIgcHJpb3JpdHlcbiAgICAgICAgICogQHR5cGUgTnVtYmVyXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9wcmlvcml0eSA9IHByaW9yaXR5IHx8IDA7XG4gICAgfVxuXG4gICAgU2lnbmFsQmluZGluZy5wcm90b3R5cGUgPSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIGJpbmRpbmcgaXMgYWN0aXZlIGFuZCBzaG91bGQgYmUgZXhlY3V0ZWQuXG4gICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgICovXG4gICAgICAgIGFjdGl2ZSA6IHRydWUsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlZmF1bHQgcGFyYW1ldGVycyBwYXNzZWQgdG8gbGlzdGVuZXIgZHVyaW5nIGBTaWduYWwuZGlzcGF0Y2hgIGFuZCBgU2lnbmFsQmluZGluZy5leGVjdXRlYC4gKGN1cnJpZWQgcGFyYW1ldGVycylcbiAgICAgICAgICogQHR5cGUgQXJyYXl8bnVsbFxuICAgICAgICAgKi9cbiAgICAgICAgcGFyYW1zIDogbnVsbCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsbCBsaXN0ZW5lciBwYXNzaW5nIGFyYml0cmFyeSBwYXJhbWV0ZXJzLlxuICAgICAgICAgKiA8cD5JZiBiaW5kaW5nIHdhcyBhZGRlZCB1c2luZyBgU2lnbmFsLmFkZE9uY2UoKWAgaXQgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHJlbW92ZWQgZnJvbSBzaWduYWwgZGlzcGF0Y2ggcXVldWUsIHRoaXMgbWV0aG9kIGlzIHVzZWQgaW50ZXJuYWxseSBmb3IgdGhlIHNpZ25hbCBkaXNwYXRjaC48L3A+XG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXl9IFtwYXJhbXNBcnJdIEFycmF5IG9mIHBhcmFtZXRlcnMgdGhhdCBzaG91bGQgYmUgcGFzc2VkIHRvIHRoZSBsaXN0ZW5lclxuICAgICAgICAgKiBAcmV0dXJuIHsqfSBWYWx1ZSByZXR1cm5lZCBieSB0aGUgbGlzdGVuZXIuXG4gICAgICAgICAqL1xuICAgICAgICBleGVjdXRlIDogZnVuY3Rpb24gKHBhcmFtc0Fycikge1xuICAgICAgICAgICAgdmFyIGhhbmRsZXJSZXR1cm4sIHBhcmFtcztcbiAgICAgICAgICAgIGlmICh0aGlzLmFjdGl2ZSAmJiAhIXRoaXMuX2xpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zID0gdGhpcy5wYXJhbXM/IHRoaXMucGFyYW1zLmNvbmNhdChwYXJhbXNBcnIpIDogcGFyYW1zQXJyO1xuICAgICAgICAgICAgICAgIGhhbmRsZXJSZXR1cm4gPSB0aGlzLl9saXN0ZW5lci5hcHBseSh0aGlzLmNvbnRleHQsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2lzT25jZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRldGFjaCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVyUmV0dXJuO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZXRhY2ggYmluZGluZyBmcm9tIHNpZ25hbC5cbiAgICAgICAgICogLSBhbGlhcyB0bzogbXlTaWduYWwucmVtb3ZlKG15QmluZGluZy5nZXRMaXN0ZW5lcigpKTtcbiAgICAgICAgICogQHJldHVybiB7RnVuY3Rpb258bnVsbH0gSGFuZGxlciBmdW5jdGlvbiBib3VuZCB0byB0aGUgc2lnbmFsIG9yIGBudWxsYCBpZiBiaW5kaW5nIHdhcyBwcmV2aW91c2x5IGRldGFjaGVkLlxuICAgICAgICAgKi9cbiAgICAgICAgZGV0YWNoIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNCb3VuZCgpPyB0aGlzLl9zaWduYWwucmVtb3ZlKHRoaXMuX2xpc3RlbmVyLCB0aGlzLmNvbnRleHQpIDogbnVsbDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn0gYHRydWVgIGlmIGJpbmRpbmcgaXMgc3RpbGwgYm91bmQgdG8gdGhlIHNpZ25hbCBhbmQgaGF2ZSBhIGxpc3RlbmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgaXNCb3VuZCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAoISF0aGlzLl9zaWduYWwgJiYgISF0aGlzLl9saXN0ZW5lcik7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IElmIFNpZ25hbEJpbmRpbmcgd2lsbCBvbmx5IGJlIGV4ZWN1dGVkIG9uY2UuXG4gICAgICAgICAqL1xuICAgICAgICBpc09uY2UgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faXNPbmNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gSGFuZGxlciBmdW5jdGlvbiBib3VuZCB0byB0aGUgc2lnbmFsLlxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0TGlzdGVuZXIgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbGlzdGVuZXI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge1NpZ25hbH0gU2lnbmFsIHRoYXQgbGlzdGVuZXIgaXMgY3VycmVudGx5IGJvdW5kIHRvLlxuICAgICAgICAgKi9cbiAgICAgICAgZ2V0U2lnbmFsIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NpZ25hbDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVsZXRlIGluc3RhbmNlIHByb3BlcnRpZXNcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9kZXN0cm95IDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3NpZ25hbDtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9saXN0ZW5lcjtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNvbnRleHQ7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEByZXR1cm4ge3N0cmluZ30gU3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICB0b1N0cmluZyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAnW1NpZ25hbEJpbmRpbmcgaXNPbmNlOicgKyB0aGlzLl9pc09uY2UgKycsIGlzQm91bmQ6JysgdGhpcy5pc0JvdW5kKCkgKycsIGFjdGl2ZTonICsgdGhpcy5hY3RpdmUgKyAnXSc7XG4gICAgICAgIH1cblxuICAgIH07XG5cblxuLypnbG9iYWwgU2lnbmFsQmluZGluZzpmYWxzZSovXG5cbiAgICAvLyBTaWduYWwgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlTGlzdGVuZXIobGlzdGVuZXIsIGZuTmFtZSkge1xuICAgICAgICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdsaXN0ZW5lciBpcyBhIHJlcXVpcmVkIHBhcmFtIG9mIHtmbn0oKSBhbmQgc2hvdWxkIGJlIGEgRnVuY3Rpb24uJy5yZXBsYWNlKCd7Zm59JywgZm5OYW1lKSApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGV2ZW50IGJyb2FkY2FzdGVyXG4gICAgICogPGJyIC8+LSBpbnNwaXJlZCBieSBSb2JlcnQgUGVubmVyJ3MgQVMzIFNpZ25hbHMuXG4gICAgICogQG5hbWUgU2lnbmFsXG4gICAgICogQGF1dGhvciBNaWxsZXIgTWVkZWlyb3NcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBTaWduYWwoKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAdHlwZSBBcnJheS48U2lnbmFsQmluZGluZz5cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX2JpbmRpbmdzID0gW107XG4gICAgICAgIHRoaXMuX3ByZXZQYXJhbXMgPSBudWxsO1xuXG4gICAgICAgIC8vIGVuZm9yY2UgZGlzcGF0Y2ggdG8gYXdheXMgd29yayBvbiBzYW1lIGNvbnRleHQgKCM0NylcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB0aGlzLmRpc3BhdGNoID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIFNpZ25hbC5wcm90b3R5cGUuZGlzcGF0Y2guYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBTaWduYWwucHJvdG90eXBlID0ge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTaWduYWxzIFZlcnNpb24gTnVtYmVyXG4gICAgICAgICAqIEB0eXBlIFN0cmluZ1xuICAgICAgICAgKiBAY29uc3RcbiAgICAgICAgICovXG4gICAgICAgIFZFUlNJT04gOiAnMS4wLjAnLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiBTaWduYWwgc2hvdWxkIGtlZXAgcmVjb3JkIG9mIHByZXZpb3VzbHkgZGlzcGF0Y2hlZCBwYXJhbWV0ZXJzIGFuZFxuICAgICAgICAgKiBhdXRvbWF0aWNhbGx5IGV4ZWN1dGUgbGlzdGVuZXIgZHVyaW5nIGBhZGQoKWAvYGFkZE9uY2UoKWAgaWYgU2lnbmFsIHdhc1xuICAgICAgICAgKiBhbHJlYWR5IGRpc3BhdGNoZWQgYmVmb3JlLlxuICAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICAqL1xuICAgICAgICBtZW1vcml6ZSA6IGZhbHNlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICBfc2hvdWxkUHJvcGFnYXRlIDogdHJ1ZSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogSWYgU2lnbmFsIGlzIGFjdGl2ZSBhbmQgc2hvdWxkIGJyb2FkY2FzdCBldmVudHMuXG4gICAgICAgICAqIDxwPjxzdHJvbmc+SU1QT1JUQU5UOjwvc3Ryb25nPiBTZXR0aW5nIHRoaXMgcHJvcGVydHkgZHVyaW5nIGEgZGlzcGF0Y2ggd2lsbCBvbmx5IGFmZmVjdCB0aGUgbmV4dCBkaXNwYXRjaCwgaWYgeW91IHdhbnQgdG8gc3RvcCB0aGUgcHJvcGFnYXRpb24gb2YgYSBzaWduYWwgdXNlIGBoYWx0KClgIGluc3RlYWQuPC9wPlxuICAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICAqL1xuICAgICAgICBhY3RpdmUgOiB0cnVlLFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lclxuICAgICAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzT25jZVxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2xpc3RlbmVyQ29udGV4dF1cbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IFtwcmlvcml0eV1cbiAgICAgICAgICogQHJldHVybiB7U2lnbmFsQmluZGluZ31cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIF9yZWdpc3Rlckxpc3RlbmVyIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBpc09uY2UsIGxpc3RlbmVyQ29udGV4dCwgcHJpb3JpdHkpIHtcblxuICAgICAgICAgICAgdmFyIHByZXZJbmRleCA9IHRoaXMuX2luZGV4T2ZMaXN0ZW5lcihsaXN0ZW5lciwgbGlzdGVuZXJDb250ZXh0KSxcbiAgICAgICAgICAgICAgICBiaW5kaW5nO1xuXG4gICAgICAgICAgICBpZiAocHJldkluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGJpbmRpbmcgPSB0aGlzLl9iaW5kaW5nc1twcmV2SW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmIChiaW5kaW5nLmlzT25jZSgpICE9PSBpc09uY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgY2Fubm90IGFkZCcrIChpc09uY2U/ICcnIDogJ09uY2UnKSArJygpIHRoZW4gYWRkJysgKCFpc09uY2U/ICcnIDogJ09uY2UnKSArJygpIHRoZSBzYW1lIGxpc3RlbmVyIHdpdGhvdXQgcmVtb3ZpbmcgdGhlIHJlbGF0aW9uc2hpcCBmaXJzdC4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGJpbmRpbmcgPSBuZXcgU2lnbmFsQmluZGluZyh0aGlzLCBsaXN0ZW5lciwgaXNPbmNlLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KTtcbiAgICAgICAgICAgICAgICB0aGlzLl9hZGRCaW5kaW5nKGJpbmRpbmcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZih0aGlzLm1lbW9yaXplICYmIHRoaXMuX3ByZXZQYXJhbXMpe1xuICAgICAgICAgICAgICAgIGJpbmRpbmcuZXhlY3V0ZSh0aGlzLl9wcmV2UGFyYW1zKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGJpbmRpbmc7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBwYXJhbSB7U2lnbmFsQmluZGluZ30gYmluZGluZ1xuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX2FkZEJpbmRpbmcgOiBmdW5jdGlvbiAoYmluZGluZykge1xuICAgICAgICAgICAgLy9zaW1wbGlmaWVkIGluc2VydGlvbiBzb3J0XG4gICAgICAgICAgICB2YXIgbiA9IHRoaXMuX2JpbmRpbmdzLmxlbmd0aDtcbiAgICAgICAgICAgIGRvIHsgLS1uOyB9IHdoaWxlICh0aGlzLl9iaW5kaW5nc1tuXSAmJiBiaW5kaW5nLl9wcmlvcml0eSA8PSB0aGlzLl9iaW5kaW5nc1tuXS5fcHJpb3JpdHkpO1xuICAgICAgICAgICAgdGhpcy5fYmluZGluZ3Muc3BsaWNlKG4gKyAxLCAwLCBiaW5kaW5nKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXJcbiAgICAgICAgICogQHJldHVybiB7bnVtYmVyfVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgX2luZGV4T2ZMaXN0ZW5lciA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIG4gPSB0aGlzLl9iaW5kaW5ncy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgY3VyO1xuICAgICAgICAgICAgd2hpbGUgKG4tLSkge1xuICAgICAgICAgICAgICAgIGN1ciA9IHRoaXMuX2JpbmRpbmdzW25dO1xuICAgICAgICAgICAgICAgIGlmIChjdXIuX2xpc3RlbmVyID09PSBsaXN0ZW5lciAmJiBjdXIuY29udGV4dCA9PT0gY29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENoZWNrIGlmIGxpc3RlbmVyIHdhcyBhdHRhY2hlZCB0byBTaWduYWwuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dF1cbiAgICAgICAgICogQHJldHVybiB7Ym9vbGVhbn0gaWYgU2lnbmFsIGhhcyB0aGUgc3BlY2lmaWVkIGxpc3RlbmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgaGFzIDogZnVuY3Rpb24gKGxpc3RlbmVyLCBjb250ZXh0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faW5kZXhPZkxpc3RlbmVyKGxpc3RlbmVyLCBjb250ZXh0KSAhPT0gLTE7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEFkZCBhIGxpc3RlbmVyIHRvIHRoZSBzaWduYWwuXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIFNpZ25hbCBoYW5kbGVyIGZ1bmN0aW9uLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gW2xpc3RlbmVyQ29udGV4dF0gQ29udGV4dCBvbiB3aGljaCBsaXN0ZW5lciB3aWxsIGJlIGV4ZWN1dGVkIChvYmplY3QgdGhhdCBzaG91bGQgcmVwcmVzZW50IHRoZSBgdGhpc2AgdmFyaWFibGUgaW5zaWRlIGxpc3RlbmVyIGZ1bmN0aW9uKS5cbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IFtwcmlvcml0eV0gVGhlIHByaW9yaXR5IGxldmVsIG9mIHRoZSBldmVudCBsaXN0ZW5lci4gTGlzdGVuZXJzIHdpdGggaGlnaGVyIHByaW9yaXR5IHdpbGwgYmUgZXhlY3V0ZWQgYmVmb3JlIGxpc3RlbmVycyB3aXRoIGxvd2VyIHByaW9yaXR5LiBMaXN0ZW5lcnMgd2l0aCBzYW1lIHByaW9yaXR5IGxldmVsIHdpbGwgYmUgZXhlY3V0ZWQgYXQgdGhlIHNhbWUgb3JkZXIgYXMgdGhleSB3ZXJlIGFkZGVkLiAoZGVmYXVsdCA9IDApXG4gICAgICAgICAqIEByZXR1cm4ge1NpZ25hbEJpbmRpbmd9IEFuIE9iamVjdCByZXByZXNlbnRpbmcgdGhlIGJpbmRpbmcgYmV0d2VlbiB0aGUgU2lnbmFsIGFuZCBsaXN0ZW5lci5cbiAgICAgICAgICovXG4gICAgICAgIGFkZCA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSkge1xuICAgICAgICAgICAgdmFsaWRhdGVMaXN0ZW5lcihsaXN0ZW5lciwgJ2FkZCcpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlZ2lzdGVyTGlzdGVuZXIobGlzdGVuZXIsIGZhbHNlLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkIGxpc3RlbmVyIHRvIHRoZSBzaWduYWwgdGhhdCBzaG91bGQgYmUgcmVtb3ZlZCBhZnRlciBmaXJzdCBleGVjdXRpb24gKHdpbGwgYmUgZXhlY3V0ZWQgb25seSBvbmNlKS5cbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgU2lnbmFsIGhhbmRsZXIgZnVuY3Rpb24uXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbbGlzdGVuZXJDb250ZXh0XSBDb250ZXh0IG9uIHdoaWNoIGxpc3RlbmVyIHdpbGwgYmUgZXhlY3V0ZWQgKG9iamVjdCB0aGF0IHNob3VsZCByZXByZXNlbnQgdGhlIGB0aGlzYCB2YXJpYWJsZSBpbnNpZGUgbGlzdGVuZXIgZnVuY3Rpb24pLlxuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gW3ByaW9yaXR5XSBUaGUgcHJpb3JpdHkgbGV2ZWwgb2YgdGhlIGV2ZW50IGxpc3RlbmVyLiBMaXN0ZW5lcnMgd2l0aCBoaWdoZXIgcHJpb3JpdHkgd2lsbCBiZSBleGVjdXRlZCBiZWZvcmUgbGlzdGVuZXJzIHdpdGggbG93ZXIgcHJpb3JpdHkuIExpc3RlbmVycyB3aXRoIHNhbWUgcHJpb3JpdHkgbGV2ZWwgd2lsbCBiZSBleGVjdXRlZCBhdCB0aGUgc2FtZSBvcmRlciBhcyB0aGV5IHdlcmUgYWRkZWQuIChkZWZhdWx0ID0gMClcbiAgICAgICAgICogQHJldHVybiB7U2lnbmFsQmluZGluZ30gQW4gT2JqZWN0IHJlcHJlc2VudGluZyB0aGUgYmluZGluZyBiZXR3ZWVuIHRoZSBTaWduYWwgYW5kIGxpc3RlbmVyLlxuICAgICAgICAgKi9cbiAgICAgICAgYWRkT25jZSA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgbGlzdGVuZXJDb250ZXh0LCBwcmlvcml0eSkge1xuICAgICAgICAgICAgdmFsaWRhdGVMaXN0ZW5lcihsaXN0ZW5lciwgJ2FkZE9uY2UnKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWdpc3Rlckxpc3RlbmVyKGxpc3RlbmVyLCB0cnVlLCBsaXN0ZW5lckNvbnRleHQsIHByaW9yaXR5KTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVtb3ZlIGEgc2luZ2xlIGxpc3RlbmVyIGZyb20gdGhlIGRpc3BhdGNoIHF1ZXVlLlxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBIYW5kbGVyIGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIHJlbW92ZWQuXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29udGV4dF0gRXhlY3V0aW9uIGNvbnRleHQgKHNpbmNlIHlvdSBjYW4gYWRkIHRoZSBzYW1lIGhhbmRsZXIgbXVsdGlwbGUgdGltZXMgaWYgZXhlY3V0aW5nIGluIGEgZGlmZmVyZW50IGNvbnRleHQpLlxuICAgICAgICAgKiBAcmV0dXJuIHtGdW5jdGlvbn0gTGlzdGVuZXIgaGFuZGxlciBmdW5jdGlvbi5cbiAgICAgICAgICovXG4gICAgICAgIHJlbW92ZSA6IGZ1bmN0aW9uIChsaXN0ZW5lciwgY29udGV4dCkge1xuICAgICAgICAgICAgdmFsaWRhdGVMaXN0ZW5lcihsaXN0ZW5lciwgJ3JlbW92ZScpO1xuXG4gICAgICAgICAgICB2YXIgaSA9IHRoaXMuX2luZGV4T2ZMaXN0ZW5lcihsaXN0ZW5lciwgY29udGV4dCk7XG4gICAgICAgICAgICBpZiAoaSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9iaW5kaW5nc1tpXS5fZGVzdHJveSgpOyAvL25vIHJlYXNvbiB0byBhIFNpZ25hbEJpbmRpbmcgZXhpc3QgaWYgaXQgaXNuJ3QgYXR0YWNoZWQgdG8gYSBzaWduYWxcbiAgICAgICAgICAgICAgICB0aGlzLl9iaW5kaW5ncy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbGlzdGVuZXI7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbW92ZSBhbGwgbGlzdGVuZXJzIGZyb20gdGhlIFNpZ25hbC5cbiAgICAgICAgICovXG4gICAgICAgIHJlbW92ZUFsbCA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBuID0gdGhpcy5fYmluZGluZ3MubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKG4tLSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2JpbmRpbmdzW25dLl9kZXN0cm95KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9iaW5kaW5ncy5sZW5ndGggPSAwO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IE51bWJlciBvZiBsaXN0ZW5lcnMgYXR0YWNoZWQgdG8gdGhlIFNpZ25hbC5cbiAgICAgICAgICovXG4gICAgICAgIGdldE51bUxpc3RlbmVycyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9iaW5kaW5ncy5sZW5ndGg7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0b3AgcHJvcGFnYXRpb24gb2YgdGhlIGV2ZW50LCBibG9ja2luZyB0aGUgZGlzcGF0Y2ggdG8gbmV4dCBsaXN0ZW5lcnMgb24gdGhlIHF1ZXVlLlxuICAgICAgICAgKiA8cD48c3Ryb25nPklNUE9SVEFOVDo8L3N0cm9uZz4gc2hvdWxkIGJlIGNhbGxlZCBvbmx5IGR1cmluZyBzaWduYWwgZGlzcGF0Y2gsIGNhbGxpbmcgaXQgYmVmb3JlL2FmdGVyIGRpc3BhdGNoIHdvbid0IGFmZmVjdCBzaWduYWwgYnJvYWRjYXN0LjwvcD5cbiAgICAgICAgICogQHNlZSBTaWduYWwucHJvdG90eXBlLmRpc2FibGVcbiAgICAgICAgICovXG4gICAgICAgIGhhbHQgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLl9zaG91bGRQcm9wYWdhdGUgPSBmYWxzZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGlzcGF0Y2gvQnJvYWRjYXN0IFNpZ25hbCB0byBhbGwgbGlzdGVuZXJzIGFkZGVkIHRvIHRoZSBxdWV1ZS5cbiAgICAgICAgICogQHBhcmFtIHsuLi4qfSBbcGFyYW1zXSBQYXJhbWV0ZXJzIHRoYXQgc2hvdWxkIGJlIHBhc3NlZCB0byBlYWNoIGhhbmRsZXIuXG4gICAgICAgICAqL1xuICAgICAgICBkaXNwYXRjaCA6IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgICAgIGlmICghIHRoaXMuYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgcGFyYW1zQXJyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxcbiAgICAgICAgICAgICAgICBuID0gdGhpcy5fYmluZGluZ3MubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGJpbmRpbmdzO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5tZW1vcml6ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3ByZXZQYXJhbXMgPSBwYXJhbXNBcnI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghIG4pIHtcbiAgICAgICAgICAgICAgICAvL3Nob3VsZCBjb21lIGFmdGVyIG1lbW9yaXplXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBiaW5kaW5ncyA9IHRoaXMuX2JpbmRpbmdzLnNsaWNlKCk7IC8vY2xvbmUgYXJyYXkgaW4gY2FzZSBhZGQvcmVtb3ZlIGl0ZW1zIGR1cmluZyBkaXNwYXRjaFxuICAgICAgICAgICAgdGhpcy5fc2hvdWxkUHJvcGFnYXRlID0gdHJ1ZTsgLy9pbiBjYXNlIGBoYWx0YCB3YXMgY2FsbGVkIGJlZm9yZSBkaXNwYXRjaCBvciBkdXJpbmcgdGhlIHByZXZpb3VzIGRpc3BhdGNoLlxuXG4gICAgICAgICAgICAvL2V4ZWN1dGUgYWxsIGNhbGxiYWNrcyB1bnRpbCBlbmQgb2YgdGhlIGxpc3Qgb3IgdW50aWwgYSBjYWxsYmFjayByZXR1cm5zIGBmYWxzZWAgb3Igc3RvcHMgcHJvcGFnYXRpb25cbiAgICAgICAgICAgIC8vcmV2ZXJzZSBsb29wIHNpbmNlIGxpc3RlbmVycyB3aXRoIGhpZ2hlciBwcmlvcml0eSB3aWxsIGJlIGFkZGVkIGF0IHRoZSBlbmQgb2YgdGhlIGxpc3RcbiAgICAgICAgICAgIGRvIHsgbi0tOyB9IHdoaWxlIChiaW5kaW5nc1tuXSAmJiB0aGlzLl9zaG91bGRQcm9wYWdhdGUgJiYgYmluZGluZ3Nbbl0uZXhlY3V0ZShwYXJhbXNBcnIpICE9PSBmYWxzZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZvcmdldCBtZW1vcml6ZWQgYXJndW1lbnRzLlxuICAgICAgICAgKiBAc2VlIFNpZ25hbC5tZW1vcml6ZVxuICAgICAgICAgKi9cbiAgICAgICAgZm9yZ2V0IDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHRoaXMuX3ByZXZQYXJhbXMgPSBudWxsO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZW1vdmUgYWxsIGJpbmRpbmdzIGZyb20gc2lnbmFsIGFuZCBkZXN0cm95IGFueSByZWZlcmVuY2UgdG8gZXh0ZXJuYWwgb2JqZWN0cyAoZGVzdHJveSBTaWduYWwgb2JqZWN0KS5cbiAgICAgICAgICogPHA+PHN0cm9uZz5JTVBPUlRBTlQ6PC9zdHJvbmc+IGNhbGxpbmcgYW55IG1ldGhvZCBvbiB0aGUgc2lnbmFsIGluc3RhbmNlIGFmdGVyIGNhbGxpbmcgZGlzcG9zZSB3aWxsIHRocm93IGVycm9ycy48L3A+XG4gICAgICAgICAqL1xuICAgICAgICBkaXNwb3NlIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVBbGwoKTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9iaW5kaW5ncztcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9wcmV2UGFyYW1zO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgdG9TdHJpbmcgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1tTaWduYWwgYWN0aXZlOicrIHRoaXMuYWN0aXZlICsnIG51bUxpc3RlbmVyczonKyB0aGlzLmdldE51bUxpc3RlbmVycygpICsnXSc7XG4gICAgICAgIH1cblxuICAgIH07XG5cblxuICAgIC8vIE5hbWVzcGFjZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogU2lnbmFscyBuYW1lc3BhY2VcbiAgICAgKiBAbmFtZXNwYWNlXG4gICAgICogQG5hbWUgc2lnbmFsc1xuICAgICAqL1xuICAgIHZhciBzaWduYWxzID0gU2lnbmFsO1xuXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGV2ZW50IGJyb2FkY2FzdGVyXG4gICAgICogQHNlZSBTaWduYWxcbiAgICAgKi9cbiAgICAvLyBhbGlhcyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgKHNlZSAjZ2gtNDQpXG4gICAgc2lnbmFscy5TaWduYWwgPSBTaWduYWw7XG5cblxuXG4gICAgLy9leHBvcnRzIHRvIG11bHRpcGxlIGVudmlyb25tZW50c1xuICAgIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCl7IC8vQU1EXG4gICAgICAgIGRlZmluZShmdW5jdGlvbiAoKSB7IHJldHVybiBzaWduYWxzOyB9KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKXsgLy9ub2RlXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gc2lnbmFscztcbiAgICB9IGVsc2UgeyAvL2Jyb3dzZXJcbiAgICAgICAgLy91c2Ugc3RyaW5nIGJlY2F1c2Ugb2YgR29vZ2xlIGNsb3N1cmUgY29tcGlsZXIgQURWQU5DRURfTU9ERVxuICAgICAgICAvKmpzbGludCBzdWI6dHJ1ZSAqL1xuICAgICAgICBnbG9iYWxbJ3NpZ25hbHMnXSA9IHNpZ25hbHM7XG4gICAgfVxuXG59KHRoaXMpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQnVmZmVyU291cmNlKGJ1ZmZlciwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9idWZmZXIgPSBidWZmZXI7IC8vIEFycmF5QnVmZmVyXG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9sb29wID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDsgLy8gQnVmZmVyU291cmNlTm9kZVxuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5LCBvZmZzZXQpIHtcbiAgICBpZih0aGlzLl9wbGF5aW5nKSB7IHJldHVybjsgfVxuICAgIGlmKGRlbGF5ID09PSB1bmRlZmluZWQpIHsgZGVsYXkgPSAwOyB9XG4gICAgaWYoZGVsYXkgPiAwKSB7IGRlbGF5ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGRlbGF5OyB9XG5cbiAgICBpZihvZmZzZXQgPT09IHVuZGVmaW5lZCkgeyBvZmZzZXQgPSAwOyB9XG4gICAgaWYodGhpcy5fcGF1c2VkQXQgPiAwKSB7IG9mZnNldCA9IG9mZnNldCArIHRoaXMuX3BhdXNlZEF0OyB9XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUubG9vcCA9IHRoaXMuX2xvb3A7XG4gICAgdGhpcy5zb3VyY2VOb2RlLm9uZW5kZWQgPSB0aGlzLl9lbmRlZEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICB0aGlzLnNvdXJjZU5vZGUuc3RhcnQoZGVsYXksIG9mZnNldCk7XG5cbiAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fcGF1c2VkQXQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gb2Zmc2V0O1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xufTtcblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IGVsYXBzZWQ7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUub25lbmRlZCA9IG51bGw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLnN0b3AoMCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG59O1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLl9lbmRlZEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgaWYodHlwZW9mIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayh0aGlzKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyU291cmNlLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYodGhpcy5fc3RhcnRlZEF0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYnVmZmVyID8gdGhpcy5fYnVmZmVyLmR1cmF0aW9uIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdlbmRlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW5kZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAnbG9vcCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbG9vcDtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy5fbG9vcCA9ICEhdmFsdWU7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAncGF1c2VkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXJTb3VyY2UucHJvdG90eXBlLCAncGxheWluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGxheWluZztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdwcm9ncmVzcycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gTWF0aC5taW4odGhpcy5jdXJyZW50VGltZSAvIHRoaXMuZHVyYXRpb24sIDEpO1xuICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlclNvdXJjZS5wcm90b3R5cGUsICdzb3VyY2VOb2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuYnVmZmVyID0gdGhpcy5fYnVmZmVyO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgIH1cbn0pO1xuXG5cbi8qXG4gKiBFeHBvcnRzXG4gKi9cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBCdWZmZXJTb3VyY2U7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzaWduYWxzID0gcmVxdWlyZSgnc2lnbmFscycpO1xuXG5mdW5jdGlvbiBMb2FkZXIoKSB7XG4gICAgdGhpcy5vbkNoaWxkQ29tcGxldGUgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcbiAgICB0aGlzLm9uQ29tcGxldGUgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcbiAgICB0aGlzLm9uUHJvZ3Jlc3MgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcbiAgICB0aGlzLm9uRXJyb3IgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcblxuICAgIHRoaXMuY3Jvc3NPcmlnaW4gPSBmYWxzZTtcbiAgICB0aGlzLmxvYWRlZCA9IGZhbHNlO1xuICAgIHRoaXMubG9hZGVycyA9IHt9O1xuICAgIHRoaXMubG9hZGluZyA9IGZhbHNlO1xuICAgIHRoaXMubnVtTG9hZGVkID0gMDtcbiAgICB0aGlzLm51bVRvdGFsID0gMDtcbiAgICB0aGlzLnF1ZXVlID0gW107XG4gICAgdGhpcy50b3VjaExvY2tlZCA9IGZhbHNlO1xuICAgIHRoaXMud2ViQXVkaW9Db250ZXh0ID0gbnVsbDtcbn1cblxuTG9hZGVyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbih1cmwpIHtcbiAgICB2YXIgbG9hZGVyID0gbmV3IExvYWRlci5GaWxlKHVybCk7XG4gICAgbG9hZGVyLndlYkF1ZGlvQ29udGV4dCA9IHRoaXMud2ViQXVkaW9Db250ZXh0O1xuICAgIGxvYWRlci5jcm9zc09yaWdpbiA9IHRoaXMuY3Jvc3NPcmlnaW47XG4gICAgbG9hZGVyLnRvdWNoTG9ja2VkID0gdGhpcy50b3VjaExvY2tlZDtcbiAgICB0aGlzLnF1ZXVlLnB1c2gobG9hZGVyKTtcbiAgICB0aGlzLmxvYWRlcnNbbG9hZGVyLnVybF0gPSBsb2FkZXI7XG4gICAgdGhpcy5udW1Ub3RhbCsrO1xuICAgIHJldHVybiBsb2FkZXI7XG59O1xuXG5Mb2FkZXIucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5udW1Ub3RhbCA9IHRoaXMucXVldWUubGVuZ3RoO1xuICAgIGlmKCF0aGlzLmxvYWRpbmcpIHtcbiAgICAgICAgdGhpcy5sb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgfVxufTtcblxuTG9hZGVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5xdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhpcy5sb2FkZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5vbkNvbXBsZXRlLmRpc3BhdGNoKHRoaXMubG9hZGVycyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGxvYWRlciA9IHRoaXMucXVldWUucG9wKCk7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBwcm9ncmVzc0hhbmRsZXIgPSBmdW5jdGlvbihwcm9ncmVzcykge1xuICAgICAgICB2YXIgbnVtTG9hZGVkID0gc2VsZi5udW1Mb2FkZWQgKyBwcm9ncmVzcztcbiAgICAgICAgaWYoc2VsZi5vblByb2dyZXNzLmdldE51bUxpc3RlbmVycygpID4gMCkge1xuICAgICAgICAgICAgc2VsZi5vblByb2dyZXNzLmRpc3BhdGNoKG51bUxvYWRlZC9zZWxmLm51bVRvdGFsKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgbG9hZGVyLm9uUHJvZ3Jlc3MuYWRkKHByb2dyZXNzSGFuZGxlcik7XG4gICAgdmFyIGNvbXBsZXRlSGFuZGxlciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGxvYWRlci5vblByb2dyZXNzLnJlbW92ZShwcm9ncmVzc0hhbmRsZXIpO1xuICAgICAgICBzZWxmLm51bUxvYWRlZCsrO1xuICAgICAgICBpZihzZWxmLm9uUHJvZ3Jlc3MuZ2V0TnVtTGlzdGVuZXJzKCkgPiAwKSB7XG4gICAgICAgICAgICBzZWxmLm9uUHJvZ3Jlc3MuZGlzcGF0Y2goc2VsZi5udW1Mb2FkZWQvc2VsZi5udW1Ub3RhbCk7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5vbkNoaWxkQ29tcGxldGUuZGlzcGF0Y2gobG9hZGVyKTtcbiAgICAgICAgc2VsZi5uZXh0KCk7XG4gICAgfTtcbiAgICBsb2FkZXIub25CZWZvcmVDb21wbGV0ZS5hZGRPbmNlKGNvbXBsZXRlSGFuZGxlcik7XG4gICAgdmFyIGVycm9ySGFuZGxlciA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHNlbGYub25FcnJvci5kaXNwYXRjaChsb2FkZXIpO1xuICAgICAgICBzZWxmLm5leHQoKTtcbiAgICB9O1xuICAgIGxvYWRlci5vbkVycm9yLmFkZE9uY2UoZXJyb3JIYW5kbGVyKTtcbiAgICBsb2FkZXIuc3RhcnQoKTtcbn07XG5cbi8qTG9hZGVyLnByb3RvdHlwZS5hZGRNdWx0aXBsZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmFkZChhcnJheVtpXSk7XG4gICAgfVxufTtcblxuTG9hZGVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbih1cmwpIHtcbiAgICByZXR1cm4gdGhpcy5sb2FkZXJzW3VybF07XG59OyovXG5cbkxvYWRlci5GaWxlID0gZnVuY3Rpb24odXJsKSB7XG4gICAgdGhpcy51cmwgPSB1cmw7XG5cbiAgICB0aGlzLm9uUHJvZ3Jlc3MgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcbiAgICB0aGlzLm9uQmVmb3JlQ29tcGxldGUgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcbiAgICB0aGlzLm9uQ29tcGxldGUgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcbiAgICB0aGlzLm9uRXJyb3IgPSBuZXcgc2lnbmFscy5TaWduYWwoKTtcblxuICAgIHRoaXMud2ViQXVkaW9Db250ZXh0ID0gbnVsbDtcbiAgICB0aGlzLmNyb3NzT3JpZ2luID0gZmFsc2U7XG4gICAgdGhpcy50b3VjaExvY2tlZCA9IGZhbHNlO1xuICAgIHRoaXMucHJvZ3Jlc3MgPSAwO1xufTtcblxuTG9hZGVyLkZpbGUucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy53ZWJBdWRpb0NvbnRleHQpIHtcbiAgICAgICAgdGhpcy5sb2FkQXJyYXlCdWZmZXIodGhpcy53ZWJBdWRpb0NvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9hZEF1ZGlvRWxlbWVudCh0aGlzLnRvdWNoTG9ja2VkKTtcbiAgICB9XG59O1xuXG5Mb2FkZXIuRmlsZS5wcm90b3R5cGUubG9hZEFycmF5QnVmZmVyID0gZnVuY3Rpb24od2ViQXVkaW9Db250ZXh0KSB7XG4gICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICByZXF1ZXN0Lm9wZW4oJ0dFVCcsIHRoaXMudXJsLCB0cnVlKTtcbiAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJlcXVlc3Qub25wcm9ncmVzcyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC5sZW5ndGhDb21wdXRhYmxlKSB7XG4gICAgICAgICAgICBzZWxmLnByb2dyZXNzID0gZXZlbnQubG9hZGVkIC8gZXZlbnQudG90YWw7XG4gICAgICAgICAgICBzZWxmLm9uUHJvZ3Jlc3MuZGlzcGF0Y2goc2VsZi5wcm9ncmVzcyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHdlYkF1ZGlvQ29udGV4dC5kZWNvZGVBdWRpb0RhdGEocmVxdWVzdC5yZXNwb25zZSwgZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgICAgICBzZWxmLmRhdGEgPSBidWZmZXI7XG4gICAgICAgICAgICBzZWxmLnByb2dyZXNzID0gMTtcbiAgICAgICAgICAgIHNlbGYub25Qcm9ncmVzcy5kaXNwYXRjaCgxKTtcbiAgICAgICAgICAgIHNlbGYub25CZWZvcmVDb21wbGV0ZS5kaXNwYXRjaChidWZmZXIpO1xuICAgICAgICAgICAgc2VsZi5vbkNvbXBsZXRlLmRpc3BhdGNoKGJ1ZmZlcik7XG4gICAgICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc2VsZi5vbkVycm9yLmRpc3BhdGNoKCk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBzZWxmLm9uRXJyb3IuZGlzcGF0Y2goZSk7XG4gICAgfTtcbiAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB0aGlzLnJlcXVlc3QgPSByZXF1ZXN0O1xufTtcblxuTG9hZGVyLkZpbGUucHJvdG90eXBlLmxvYWRBdWRpb0VsZW1lbnQgPSBmdW5jdGlvbih0b3VjaExvY2tlZCkge1xuICAgIHZhciByZXF1ZXN0ID0gbmV3IEF1ZGlvKCk7XG4gICAgdGhpcy5kYXRhID0gcmVxdWVzdDtcbiAgICByZXF1ZXN0Lm5hbWUgPSB0aGlzLnVybDtcbiAgICByZXF1ZXN0LnByZWxvYWQgPSAnYXV0byc7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJlcXVlc3Quc3JjID0gdGhpcy51cmw7XG4gICAgaWYgKCEhdG91Y2hMb2NrZWQpIHtcbiAgICAgICAgdGhpcy5vblByb2dyZXNzLmRpc3BhdGNoKDEpO1xuICAgICAgICB0aGlzLm9uQ29tcGxldGUuZGlzcGF0Y2godGhpcy5kYXRhKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciByZWFkeSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICByZXF1ZXN0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgcmVhZHkpO1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgc2VsZi5wcm9ncmVzcyA9IDE7XG4gICAgICAgICAgICBzZWxmLm9uUHJvZ3Jlc3MuZGlzcGF0Y2goMSk7XG4gICAgICAgICAgICBzZWxmLm9uQmVmb3JlQ29tcGxldGUuZGlzcGF0Y2goc2VsZi5kYXRhKTtcbiAgICAgICAgICAgIHNlbGYub25Db21wbGV0ZS5kaXNwYXRjaChzZWxmLmRhdGEpO1xuICAgICAgICB9O1xuICAgICAgICAvLyB0aW1lb3V0IGJlY2F1c2Ugc29tZXRpbWVzIGNhbnBsYXl0aHJvdWdoIGRvZXNuJ3QgZmlyZVxuICAgICAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQocmVhZHksIDIwMDApO1xuICAgICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgcmVhZHksIGZhbHNlKTtcbiAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICBzZWxmLm9uRXJyb3IuZGlzcGF0Y2goKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5sb2FkKCk7XG4gICAgfVxufTtcblxuTG9hZGVyLkZpbGUucHJvdG90eXBlLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICBpZih0aGlzLnJlcXVlc3QgJiYgdGhpcy5yZXF1ZXN0LnJlYWR5U3RhdGUgIT09IDQpIHtcbiAgICAgIHRoaXMucmVxdWVzdC5hYm9ydCgpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvYWRlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWVkaWFTb3VyY2UoZWwsIGNvbnRleHQpIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZWwgPSBlbDsgLy8gSFRNTE1lZGlhRWxlbWVudFxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQgPSB0aGlzLl9lbmRlZEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICB0aGlzLl9sb29wID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBNZWRpYUVsZW1lbnRTb3VyY2VOb2RlXG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXksIG9mZnNldCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9kZWxheVRpbWVvdXQpO1xuXG4gICAgdGhpcy52b2x1bWUgPSB0aGlzLl92b2x1bWU7XG5cbiAgICBpZihvZmZzZXQpIHtcbiAgICAgICAgdGhpcy5fZWwuY3VycmVudFRpbWUgPSBvZmZzZXQ7XG4gICAgfVxuXG4gICAgaWYoZGVsYXkpIHtcbiAgICAgICAgdGhpcy5fZGVsYXlUaW1lb3V0ID0gc2V0VGltZW91dCh0aGlzLnBsYXkuYmluZCh0aGlzKSwgZGVsYXkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fZWwucGxheSgpO1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG5cbiAgICB0aGlzLl9lbC5yZW1vdmVFdmVudExpc3RlbmVyKCdlbmRlZCcsIHRoaXMuX2VuZGVkSGFuZGxlckJvdW5kKTtcbiAgICB0aGlzLl9lbC5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIHRoaXMuX2VuZGVkSGFuZGxlckJvdW5kLCBmYWxzZSk7XG59O1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5fZGVsYXlUaW1lb3V0KTtcblxuICAgIGlmKCF0aGlzLl9lbCkgeyByZXR1cm47IH1cblxuICAgIHRoaXMuX2VsLnBhdXNlKCk7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9kZWxheVRpbWVvdXQpO1xuXG4gICAgaWYoIXRoaXMuX2VsKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5fZWwucGF1c2UoKTtcblxuICAgIHRyeSB7XG4gICAgICAgIHRoaXMuX2VsLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgLy8gZml4ZXMgYnVnIHdoZXJlIHNlcnZlciBkb2Vzbid0IHN1cHBvcnQgc2VlazpcbiAgICAgICAgaWYodGhpcy5fZWwuY3VycmVudFRpbWUgPiAwKSB7IHRoaXMuX2VsLmxvYWQoKTsgfSAgICBcbiAgICB9IGNhdGNoKGUpIHt9XG5cbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG59O1xuXG4vKlxuICogRW5kZWQgaGFuZGxlclxuICovXG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5vbkVuZGVkID0gZnVuY3Rpb24oZm4sIGNvbnRleHQpIHtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gZm4gPyBmbi5iaW5kKGNvbnRleHQgfHwgdGhpcykgOiBudWxsO1xufTtcblxuTWVkaWFTb3VyY2UucHJvdG90eXBlLl9lbmRlZEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuXG4gICAgaWYodGhpcy5fbG9vcCkge1xuICAgICAgICB0aGlzLl9lbC5jdXJyZW50VGltZSA9IDA7XG4gICAgICAgIC8vIGZpeGVzIGJ1ZyB3aGVyZSBzZXJ2ZXIgZG9lc24ndCBzdXBwb3J0IHNlZWs6XG4gICAgICAgIGlmKHRoaXMuX2VsLmN1cnJlbnRUaW1lID4gMCkgeyB0aGlzLl9lbC5sb2FkKCk7IH1cbiAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgfSBlbHNlIGlmKHR5cGVvZiB0aGlzLl9lbmRlZENhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sodGhpcyk7XG4gICAgfVxufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ2N1cnJlbnRUaW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbCA/IHRoaXMuX2VsLmN1cnJlbnRUaW1lIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbCA/IHRoaXMuX2VsLmR1cmF0aW9uIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ2VuZGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmRlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ2xvb3AnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2xvb3A7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2xvb3AgPSB2YWx1ZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ3BhdXNlZCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWVkaWFTb3VyY2UucHJvdG90eXBlLCAncGxheWluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGxheWluZztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ3Byb2dyZXNzJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbjtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1lZGlhU291cmNlLnByb3RvdHlwZSwgJ3NvdXJjZU5vZGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUgJiYgdGhpcy5fY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlTWVkaWFFbGVtZW50U291cmNlKHRoaXMuX2VsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICB9XG59KTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBNZWRpYVNvdXJjZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWljcm9waG9uZVNvdXJjZShzdHJlYW0sIGNvbnRleHQpIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBNaWNyb3Bob25lU291cmNlTm9kZVxuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG4gICAgdGhpcy5fc3RyZWFtID0gc3RyZWFtO1xufVxuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5NaWNyb3Bob25lU291cmNlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXkpIHtcbiAgICBpZihkZWxheSA9PT0gdW5kZWZpbmVkKSB7IGRlbGF5ID0gMDsgfVxuICAgIGlmKGRlbGF5ID4gMCkgeyBkZWxheSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkZWxheTsgfVxuXG4gICAgdGhpcy5zb3VyY2VOb2RlLnN0YXJ0KGRlbGF5KTtcblxuICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9wYXVzZWRBdDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWU7XG4gICAgfVxuXG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG59O1xuXG5NaWNyb3Bob25lU291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IGVsYXBzZWQ7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5NaWNyb3Bob25lU291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5zdG9wKDApO1xuICAgICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLCAnZW5kZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLCAncGxheWluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGxheWluZztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE1pY3JvcGhvbmVTb3VyY2UucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsICdzb3VyY2VOb2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZSh0aGlzLl9zdHJlYW0pO1xuICAgICAgICAgICAgLy8gSEFDSzogc3RvcHMgbW96IGdhcmJhZ2UgY29sbGVjdGlvbiBraWxsaW5nIHRoZSBzdHJlYW1cbiAgICAgICAgICAgIC8vIHNlZSBodHRwczovL3N1cHBvcnQubW96aWxsYS5vcmcvZW4tVVMvcXVlc3Rpb25zLzk4NDE3OVxuICAgICAgICAgICAgaWYobmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5tb3pIYWNrID0gdGhpcy5fc291cmNlTm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICB9XG59KTtcblxuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gTWljcm9waG9uZVNvdXJjZTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFBhbm5lciA9IHJlcXVpcmUoJy4vcGFubmVyLmpzJyk7XG5cbmZ1bmN0aW9uIE5vZGVNYW5hZ2VyKGNvbnRleHQpIHtcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dCB8fCB0aGlzLmNyZWF0ZUZha2VDb250ZXh0KCk7XG4gICAgdGhpcy5fZGVzdGluYXRpb24gPSBudWxsO1xuICAgIHRoaXMuX25vZGVMaXN0ID0gW107XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG59XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdGhpcy5fbm9kZUxpc3QucHVzaChub2RlKTtcbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihub2RlID09PSB0aGlzLl9ub2RlTGlzdFtpXSkge1xuICAgICAgICAgICAgdGhpcy5fbm9kZUxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIG5vZGUuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuX3VwZGF0ZUNvbm5lY3Rpb25zKCk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUucmVtb3ZlQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgd2hpbGUodGhpcy5fbm9kZUxpc3QubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMuX25vZGVMaXN0LnBvcCgpLmRpc2Nvbm5lY3QoKTtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlQ29ubmVjdGlvbnMoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5fY29ubmVjdFRvID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoO1xuICAgIGlmKGwgPiAwKSB7XG4gICAgICAgIC8vY29uc29sZS5sb2coJ2Nvbm5lY3Q6JywgdGhpcy5fbm9kZUxpc3RbbCAtIDFdLCAndG8nLCBub2RlKTtcbiAgICAgICAgdGhpcy5fbm9kZUxpc3RbbCAtIDFdLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgdGhpcy5fbm9kZUxpc3RbbCAtIDFdLmNvbm5lY3Qobm9kZSk7XG4gICAgfVxuICAgIGVsc2UgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAvL2NvbnNvbGUubG9nKCcgeCBjb25uZWN0IHNvdXJjZSB0byBub2RlOicsIG5vZGUpO1xuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgdGhpcy5fc291cmNlTm9kZS5jb25uZWN0KG5vZGUpO1xuICAgIH1cbiAgICB0aGlzLl9kZXN0aW5hdGlvbiA9IG5vZGU7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuX3VwZGF0ZUNvbm5lY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKCdfdXBkYXRlQ29ubmVjdGlvbnMnKTtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihpID09PSAwKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCcgLSBjb25uZWN0IHNvdXJjZSB0byBub2RlOicsIHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5jb25uZWN0KHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ2Nvbm5lY3Q6JywgdGhpcy5fbm9kZUxpc3RbaS0xXSwgJ3RvJywgdGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICAgICAgdGhpcy5fbm9kZUxpc3RbaS0xXS5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICB0aGlzLl9ub2RlTGlzdFtpLTFdLmNvbm5lY3QodGhpcy5fbm9kZUxpc3RbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2codGhpcy5fZGVzdGluYXRpb24pXG4gICAgaWYodGhpcy5fZGVzdGluYXRpb24pIHtcbiAgICAgICAgdGhpcy5fY29ubmVjdFRvKHRoaXMuX2Rlc3RpbmF0aW9uKTtcbiAgICB9XG4gICAgLyplbHNlIHtcbiAgICAgICAgdGhpcy5fY29ubmVjdFRvKHRoaXMuX2dhaW4pO1xuICAgIH0qL1xufTtcblxuLy8gb3Igc2V0dGVyIGZvciBkZXN0aW5hdGlvbj9cbi8qTm9kZU1hbmFnZXIucHJvdG90eXBlLl9jb25uZWN0VG8gPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIGwgPSB0aGlzLl9ub2RlTGlzdC5sZW5ndGg7XG4gICAgaWYobCA+IDApIHtcbiAgICAgIGNvbnNvbGUubG9nKCdjb25uZWN0OicsIHRoaXMuX25vZGVMaXN0W2wgLSAxXSwgJ3RvJywgbm9kZSk7XG4gICAgICAgIHRoaXMuX25vZGVMaXN0W2wgLSAxXS5kaXNjb25uZWN0KCk7XG4gICAgICAgIHRoaXMuX25vZGVMaXN0W2wgLSAxXS5jb25uZWN0KG5vZGUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coJyB4IGNvbm5lY3Qgc291cmNlIHRvIG5vZGU6Jywgbm9kZSk7XG4gICAgICAgIHRoaXMuX2dhaW4uZGlzY29ubmVjdCgpO1xuICAgICAgICB0aGlzLl9nYWluLmNvbm5lY3Qobm9kZSk7XG4gICAgfVxuICAgIHRoaXMuX2Rlc3RpbmF0aW9uID0gbm9kZTtcbn07Ki9cblxuLy8gc2hvdWxkIHNvdXJjZSBiZSBpdGVtIDAgaW4gbm9kZWxpc3QgYW5kIGRlc2luYXRpb24gbGFzdFxuLy8gcHJvYiBpcyBhZGROb2RlIG5lZWRzIHRvIGFkZCBiZWZvcmUgZGVzdGluYXRpb25cbi8vICsgc2hvdWxkIGl0IGJlIGNhbGxlZCBjaGFpbiBvciBzb21ldGhpbmcgbmljZXI/XG4vLyBmZWVscyBsaWtlIG5vZGUgbGlzdCBjb3VsZCBiZSBhIGxpbmtlZCBsaXN0Pz9cbi8vIGlmIGxpc3QubGFzdCBpcyBkZXN0aW5hdGlvbiBhZGRiZWZvcmVcblxuLypOb2RlTWFuYWdlci5wcm90b3R5cGUuX3VwZGF0ZUNvbm5lY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy5fbm9kZUxpc3RbaS0xXS5jb25uZWN0KHRoaXMuX25vZGVMaXN0W2ldKTtcbiAgICB9XG59OyovXG4vKk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5fdXBkYXRlQ29ubmVjdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKCdfdXBkYXRlQ29ubmVjdGlvbnMnKTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlLmRpc2Nvbm5lY3QoKTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlLmNvbm5lY3QodGhpcy5fZ2Fpbik7XG4gICAgdmFyIGwgPSB0aGlzLl9ub2RlTGlzdC5sZW5ndGg7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBpZihpID09PSAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnIC0gY29ubmVjdCBzb3VyY2UgdG8gbm9kZTonLCB0aGlzLl9ub2RlTGlzdFtpXSk7XG4gICAgICAgICAgICB0aGlzLl9nYWluLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgIHRoaXMuX2dhaW4uY29ubmVjdCh0aGlzLl9ub2RlTGlzdFtpXSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnY29ubmVjdDonLCB0aGlzLl9ub2RlTGlzdFtpLTFdLCAndG8nLCB0aGlzLl9ub2RlTGlzdFtpXSk7XG4gICAgICAgICAgICB0aGlzLl9ub2RlTGlzdFtpLTFdLmRpc2Nvbm5lY3QoKTtcbiAgICAgICAgICAgIHRoaXMuX25vZGVMaXN0W2ktMV0uY29ubmVjdCh0aGlzLl9ub2RlTGlzdFtpXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5fY29ubmVjdFRvKHRoaXMuX2NvbnRleHQuZGVzdGluYXRpb24pO1xufTsqL1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuYW5hbHlzZXIgPSBmdW5jdGlvbihmZnRTaXplKSB7XG4gICAgZmZ0U2l6ZSA9IGZmdFNpemUgfHwgMTAyNDtcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlQW5hbHlzZXIoKTtcbiAgICBub2RlLnNtb290aGluZ1RpbWVDb25zdGFudCA9IDAuODU7XG4gICAgLy8gcmVzb2x1dGlvbiBmZnRTaXplOiAzMiAtIDIwNDggKHBvdyAyKVxuICAgIC8vIGZyZXF1ZW5jeUJpbkNvdW50IHdpbGwgYmUgaGFsZiB0aGlzIHZhbHVlXG4gICAgbm9kZS5mZnRTaXplID0gZmZ0U2l6ZTtcbiAgICAvL25vZGUubWluRGVjaWJlbHMgPSAtMTAwO1xuICAgIC8vbm9kZS5tYXhEZWNpYmVscyA9IC0zMDtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuY29tcHJlc3NvciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIGxvd2VycyB0aGUgdm9sdW1lIG9mIHRoZSBsb3VkZXN0IHBhcnRzIG9mIHRoZSBzaWduYWwgYW5kIHJhaXNlcyB0aGUgdm9sdW1lIG9mIHRoZSBzb2Z0ZXN0IHBhcnRzXG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcigpO1xuICAgIC8vIG1pbiBkZWNpYmVscyB0byBzdGFydCBjb21wcmVzc2luZyBhdCBmcm9tIC0xMDAgdG8gMFxuICAgIG5vZGUudGhyZXNob2xkLnZhbHVlID0gLTI0O1xuICAgIC8vIGRlY2liZWwgdmFsdWUgdG8gc3RhcnQgY3VydmUgdG8gY29tcHJlc3NlZCB2YWx1ZSBmcm9tIDAgdG8gNDBcbiAgICBub2RlLmtuZWUudmFsdWUgPSAzMDtcbiAgICAvLyBhbW91bnQgb2YgY2hhbmdlIHBlciBkZWNpYmVsIGZyb20gMSB0byAyMFxuICAgIG5vZGUucmF0aW8udmFsdWUgPSAxMjtcbiAgICAvLyBnYWluIHJlZHVjdGlvbiBjdXJyZW50bHkgYXBwbGllZCBieSBjb21wcmVzc29yIGZyb20gLTIwIHRvIDBcbiAgICAvLyBub2RlLnJlZHVjdGlvbi52YWx1ZVxuICAgIC8vIHNlY29uZHMgdG8gcmVkdWNlIGdhaW4gYnkgMTBkYiBmcm9tIDAgdG8gMSAtIGhvdyBxdWlja2x5IHNpZ25hbCBhZGFwdGVkIHdoZW4gdm9sdW1lIGluY3JlYXNlZFxuICAgIG5vZGUuYXR0YWNrLnZhbHVlID0gMC4wMDAzO1xuICAgIC8vIHNlY29uZHMgdG8gaW5jcmVhc2UgZ2FpbiBieSAxMGRiIGZyb20gMCB0byAxIC0gaG93IHF1aWNrbHkgc2lnbmFsIGFkYXB0ZWQgd2hlbiB2b2x1bWUgcmVkY3VjZWRcbiAgICBub2RlLnJlbGVhc2UudmFsdWUgPSAwLjI1O1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5jb252b2x2ZXIgPSBmdW5jdGlvbihpbXB1bHNlUmVzcG9uc2UpIHtcbiAgICAvLyBpbXB1bHNlUmVzcG9uc2UgaXMgYW4gYXVkaW8gZmlsZSBidWZmZXJcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlQ29udm9sdmVyKCk7XG4gICAgbm9kZS5idWZmZXIgPSBpbXB1bHNlUmVzcG9uc2U7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24oaW5wdXQsIHRpbWUsIGdhaW4pIHtcbiAgICB2YXIgZGVsYXlOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIHZhciBnYWluTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIGdhaW5Ob2RlLmdhaW4udmFsdWUgPSBnYWluIHx8IDAuNTtcbiAgICBpZih0aW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGVsYXlOb2RlLmRlbGF5VGltZS52YWx1ZSA9IHRpbWU7XG4gICAgfVxuICAgIGRlbGF5Tm9kZS5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICBpZihpbnB1dCkge1xuICAgICAgICBpbnB1dC5jb25uZWN0KGRlbGF5Tm9kZSk7XG4gICAgICAgIGdhaW5Ob2RlLmNvbm5lY3QoaW5wdXQpO1xuICAgIH1cbiAgICByZXR1cm4gZGVsYXlOb2RlO1xuICAgIC8vID9cbiAgICAvKnJldHVybiB7XG4gICAgICBkZWxheU5vZGU6IGRlbGF5Tm9kZSxcbiAgICAgIGdhaW5Ob2RlOiBnYWluTm9kZVxuICAgIH07Ki9cbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5kaXN0b3J0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZVdhdmVTaGFwZXIoKTtcbiAgICAvLyBGbG9hdDMyQXJyYXkgZGVmaW5pbmcgY3VydmUgKHZhbHVlcyBhcmUgaW50ZXJwb2xhdGVkKVxuICAgIC8vbm9kZS5jdXJ2ZVxuICAgIC8vIHVwLXNhbXBsZSBiZWZvcmUgYXBwbHlpbmcgY3VydmUgZm9yIGJldHRlciByZXNvbHV0aW9uIHJlc3VsdCAnbm9uZScsICcyeCcgb3IgJzR4J1xuICAgIC8vbm9kZS5vdmVyc2FtcGxlID0gJzJ4JztcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuZmlsdGVyID0gZnVuY3Rpb24odHlwZSwgZnJlcXVlbmN5KSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgIG5vZGUudHlwZSA9IHR5cGU7XG4gICAgaWYoZnJlcXVlbmN5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbm9kZS5mcmVxdWVuY3kudmFsdWUgPSBmcmVxdWVuY3k7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5sb3dwYXNzID0gZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdsb3dwYXNzJywgZnJlcXVlbmN5KTtcbn07XG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuaGlnaHBhc3MgPSBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2hpZ2hwYXNzJywgZnJlcXVlbmN5KTtcbn07XG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuYmFuZHBhc3MgPSBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2JhbmRwYXNzJywgZnJlcXVlbmN5KTtcbn07XG5Ob2RlTWFuYWdlci5wcm90b3R5cGUubG93c2hlbGYgPSBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2xvd3NoZWxmJywgZnJlcXVlbmN5KTtcbn07XG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuaGlnaHNoZWxmID0gZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdoaWdoc2hlbGYnLCBmcmVxdWVuY3kpO1xufTtcbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5wZWFraW5nID0gZnVuY3Rpb24oZnJlcXVlbmN5KSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdwZWFraW5nJywgZnJlcXVlbmN5KTtcbn07XG5Ob2RlTWFuYWdlci5wcm90b3R5cGUubm90Y2ggPSBmdW5jdGlvbihmcmVxdWVuY3kpIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ25vdGNoJywgZnJlcXVlbmN5KTtcbn07XG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuYWxscGFzcyA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSkge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignYWxscGFzcycsIGZyZXF1ZW5jeSk7XG59O1xuXG5Ob2RlTWFuYWdlci5wcm90b3R5cGUuZ2FpbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICBpZih2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG5vZGUuZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5wYW5uZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFubmVyID0gbmV3IFBhbm5lcih0aGlzLl9jb250ZXh0KTtcbiAgICB0aGlzLmFkZChwYW5uZXIubm9kZSk7XG4gICAgcmV0dXJuIHBhbm5lcjtcbn07XG4vKk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5wYW5uZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlUGFubmVyKCk7XG4gICAgLy8gRGVmYXVsdCBmb3Igc3RlcmVvIGlzIEhSVEZcbiAgICBub2RlLnBhbm5pbmdNb2RlbCA9ICdIUlRGJzsgLy8gJ2VxdWFscG93ZXInXG5cbiAgICAvLyBEaXN0YW5jZSBtb2RlbCBhbmQgYXR0cmlidXRlc1xuICAgIG5vZGUuZGlzdGFuY2VNb2RlbCA9ICdsaW5lYXInOyAvLyAnbGluZWFyJyAnaW52ZXJzZScgJ2V4cG9uZW50aWFsJ1xuICAgIG5vZGUucmVmRGlzdGFuY2UgPSAxO1xuICAgIG5vZGUubWF4RGlzdGFuY2UgPSAxMDAwO1xuICAgIG5vZGUucm9sbG9mZkZhY3RvciA9IDE7XG5cbiAgICAvLyBVc2VzIGEgM0QgY2FydGVzaWFuIGNvb3JkaW5hdGUgc3lzdGVtXG4gICAgLy8gbm9kZS5zZXRQb3NpdGlvbigwLCAwLCAwKTtcbiAgICAvLyBub2RlLnNldE9yaWVudGF0aW9uKDEsIDAsIDApO1xuICAgIC8vIG5vZGUuc2V0VmVsb2NpdHkoMCwgMCwgMCk7XG5cbiAgICAvLyBEaXJlY3Rpb25hbCBzb3VuZCBjb25lIC0gVGhlIGNvbmUgYW5nbGVzIGFyZSBpbiBkZWdyZWVzIGFuZCBydW4gZnJvbSAwIHRvIDM2MFxuICAgIC8vIG5vZGUuY29uZUlubmVyQW5nbGUgPSAzNjA7XG4gICAgLy8gbm9kZS5jb25lT3V0ZXJBbmdsZSA9IDM2MDtcbiAgICAvLyBub2RlLmNvbmVPdXRlckdhaW4gPSAwO1xuXG4gICAgLy8gbm9ybWFsaXNlZCB2ZWNcbiAgICAvLyBub2RlLnNldE9yaWVudGF0aW9uKHZlYy54LCB2ZWMueSwgdmVjLnopO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07Ki9cblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnJldmVyYiA9IGZ1bmN0aW9uKHNlY29uZHMsIGRlY2F5LCByZXZlcnNlLCBub2RlKSB7XG4gICAgLy8gVE9ETzogc2hvdWxkIHByb2IgYmUgbW92ZWQgdG8gdXRpbHM6XG4gICAgc2Vjb25kcyA9IHNlY29uZHMgfHwgMTtcbiAgICBkZWNheSA9IGRlY2F5IHx8IDU7XG4gICAgcmV2ZXJzZSA9ICEhcmV2ZXJzZTtcblxuICAgIHZhciBudW1DaGFubmVscyA9IDIsXG4gICAgICAgIHJhdGUgPSB0aGlzLl9jb250ZXh0LnNhbXBsZVJhdGUsXG4gICAgICAgIGxlbmd0aCA9IHJhdGUgKiBzZWNvbmRzLFxuICAgICAgICBpbXB1bHNlUmVzcG9uc2UgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUJ1ZmZlcihudW1DaGFubmVscywgbGVuZ3RoLCByYXRlKSxcbiAgICAgICAgbGVmdCA9IGltcHVsc2VSZXNwb25zZS5nZXRDaGFubmVsRGF0YSgwKSxcbiAgICAgICAgcmlnaHQgPSBpbXB1bHNlUmVzcG9uc2UuZ2V0Q2hhbm5lbERhdGEoMSksXG4gICAgICAgIG47XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG4gPSByZXZlcnNlID8gbGVuZ3RoIC0gMSA6IGk7XG4gICAgICAgIGxlZnRbaV0gPSAoTWF0aC5yYW5kb20oKSAqIDIgLSAxKSAqIE1hdGgucG93KDEgLSBuIC8gbGVuZ3RoLCBkZWNheSk7XG4gICAgICAgIHJpZ2h0W2ldID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBNYXRoLnBvdygxIC0gbiAvIGxlbmd0aCwgZGVjYXkpO1xuICAgIH1cbiAgICBpZihub2RlKSB7XG4gICAgICAgIG5vZGUuYnVmZmVyID0gaW1wdWxzZVJlc3BvbnNlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29udm9sdmVyKGltcHVsc2VSZXNwb25zZSk7XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnNjcmlwdFByb2Nlc3NvciA9IGZ1bmN0aW9uKGJ1ZmZlclNpemUsIGlucHV0Q2hhbm5lbHMsIG91dHB1dENoYW5uZWxzLCBjYWxsYmFjaywgdGhpc0FyZykge1xuICAgIC8vIGJ1ZmZlclNpemUgMjU2IC0gMTYzODQgKHBvdyAyKVxuICAgIGJ1ZmZlclNpemUgPSBidWZmZXJTaXplIHx8IDEwMjQ7XG4gICAgaW5wdXRDaGFubmVscyA9IGlucHV0Q2hhbm5lbHMgPT09IHVuZGVmaW5lZCA/IDAgOiBpbnB1dENoYW5uZWxzO1xuICAgIG91dHB1dENoYW5uZWxzID0gb3V0cHV0Q2hhbm5lbHMgPT09IHVuZGVmaW5lZCA/IDEgOiBvdXRwdXRDaGFubmVscztcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKGJ1ZmZlclNpemUsIGlucHV0Q2hhbm5lbHMsIG91dHB1dENoYW5uZWxzKTtcbiAgICAvL25vZGUub25hdWRpb3Byb2Nlc3MgPSBjYWxsYmFjay5iaW5kKGNhbGxiYWNrQ29udGV4dHx8IG5vZGUpO1xuICAgIG5vZGUub25hdWRpb3Byb2Nlc3MgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgLy8gYXZhaWxhYmxlIHByb3BzOlxuICAgICAgICAvKlxuICAgICAgICBldmVudC5pbnB1dEJ1ZmZlclxuICAgICAgICBldmVudC5vdXRwdXRCdWZmZXJcbiAgICAgICAgZXZlbnQucGxheWJhY2tUaW1lXG4gICAgICAgICovXG4gICAgICAgIC8vIEV4YW1wbGU6IGdlbmVyYXRlIG5vaXNlXG4gICAgICAgIC8qXG4gICAgICAgIHZhciBvdXRwdXQgPSBldmVudC5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG4gICAgICAgIHZhciBsID0gb3V0cHV0Lmxlbmd0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIG91dHB1dFtpXSA9IE1hdGgucmFuZG9tKCk7XG4gICAgICAgIH1cbiAgICAgICAgKi9cbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnIHx8IHRoaXMsIGV2ZW50KTtcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbk5vZGVNYW5hZ2VyLnByb3RvdHlwZS5jcmVhdGVGYWtlQ29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmbiA9IGZ1bmN0aW9uKCl7fTtcbiAgICB2YXIgcGFyYW0gPSB7XG4gICAgICAgIHZhbHVlOiAxLFxuICAgICAgICBkZWZhdWx0VmFsdWU6IDEsXG4gICAgICAgIGxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgc2V0VmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICBleHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgc2V0VGFyZ2V0QXRUaW1lOiBmbixcbiAgICAgICAgc2V0VmFsdWVDdXJ2ZUF0VGltZTogZm4sXG4gICAgICAgIGNhbmNlbFNjaGVkdWxlZFZhbHVlczogZm5cbiAgICB9O1xuICAgIHZhciBmYWtlTm9kZSA9IHtcbiAgICAgICAgY29ubmVjdDpmbixcbiAgICAgICAgZGlzY29ubmVjdDpmbixcbiAgICAgICAgLy8gZ2FpblxuICAgICAgICBnYWluOnt2YWx1ZTogMX0sXG4gICAgICAgIC8vIHBhbm5lclxuICAgICAgICBwYW5uaW5nTW9kZWw6IDAsXG4gICAgICAgIHNldFBvc2l0aW9uOiBmbixcbiAgICAgICAgc2V0T3JpZW50YXRpb246IGZuLFxuICAgICAgICBzZXRWZWxvY2l0eTogZm4sXG4gICAgICAgIGRpc3RhbmNlTW9kZWw6IDAsXG4gICAgICAgIHJlZkRpc3RhbmNlOiAwLFxuICAgICAgICBtYXhEaXN0YW5jZTogMCxcbiAgICAgICAgcm9sbG9mZkZhY3RvcjogMCxcbiAgICAgICAgY29uZUlubmVyQW5nbGU6IDM2MCxcbiAgICAgICAgY29uZU91dGVyQW5nbGU6IDM2MCxcbiAgICAgICAgY29uZU91dGVyR2FpbjogMCxcbiAgICAgICAgLy8gZmlsdGVyOlxuICAgICAgICB0eXBlOjAsXG4gICAgICAgIGZyZXF1ZW5jeTogcGFyYW0sXG4gICAgICAgIC8vIGRlbGF5XG4gICAgICAgIGRlbGF5VGltZTogcGFyYW0sXG4gICAgICAgIC8vIGNvbnZvbHZlclxuICAgICAgICBidWZmZXI6IDAsXG4gICAgICAgIC8vIGFuYWx5c2VyXG4gICAgICAgIHNtb290aGluZ1RpbWVDb25zdGFudDogMCxcbiAgICAgICAgZmZ0U2l6ZTogMCxcbiAgICAgICAgbWluRGVjaWJlbHM6IDAsXG4gICAgICAgIG1heERlY2liZWxzOiAwLFxuICAgICAgICAvLyBjb21wcmVzc29yXG4gICAgICAgIHRocmVzaG9sZDogcGFyYW0sXG4gICAgICAgIGtuZWU6IHBhcmFtLFxuICAgICAgICByYXRpbzogcGFyYW0sXG4gICAgICAgIGF0dGFjazogcGFyYW0sXG4gICAgICAgIHJlbGVhc2U6IHBhcmFtLFxuICAgICAgICAvLyBkaXN0b3J0aW9uXG4gICAgICAgIG92ZXJzYW1wbGU6IDAsXG4gICAgICAgIGN1cnZlOiAwLFxuICAgICAgICAvLyBidWZmZXJcbiAgICAgICAgc2FtcGxlUmF0ZTogMSxcbiAgICAgICAgbGVuZ3RoOiAwLFxuICAgICAgICBkdXJhdGlvbjogMCxcbiAgICAgICAgbnVtYmVyT2ZDaGFubmVsczogMCxcbiAgICAgICAgZ2V0Q2hhbm5lbERhdGE6IGZ1bmN0aW9uKCkgeyByZXR1cm4gW107IH0sXG4gICAgICAgIGNvcHlGcm9tQ2hhbm5lbDogZm4sXG4gICAgICAgIGNvcHlUb0NoYW5uZWw6IGZuXG4gICAgfTtcbiAgICB2YXIgcmV0dXJuRmFrZU5vZGUgPSBmdW5jdGlvbigpeyByZXR1cm4gZmFrZU5vZGU7IH07XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY3JlYXRlQW5hbHlzZXI6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVCdWZmZXI6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVCaXF1YWRGaWx0ZXI6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVEeW5hbWljc0NvbXByZXNzb3I6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVDb252b2x2ZXI6IHJldHVybkZha2VOb2RlLFxuICAgICAgICBjcmVhdGVEZWxheTogcmV0dXJuRmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUdhaW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBnYWluOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAxLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0VmFsdWU6IDEsXG4gICAgICAgICAgICAgICAgICAgIGxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgICAgICAgICAgICAgc2V0VmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICAgICAgICAgICAgICBleHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgICAgICAgICAgICAgc2V0VGFyZ2V0QXRUaW1lOiBmbixcbiAgICAgICAgICAgICAgICAgICAgc2V0VmFsdWVDdXJ2ZUF0VGltZTogZm4sXG4gICAgICAgICAgICAgICAgICAgIGNhbmNlbFNjaGVkdWxlZFZhbHVlczogZm5cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNvbm5lY3Q6Zm4sXG4gICAgICAgICAgICAgICAgZGlzY29ubmVjdDpmblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgY3JlYXRlUGFubmVyOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlU2NyaXB0UHJvY2Vzc29yOiByZXR1cm5GYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlV2F2ZVNoYXBlcjogcmV0dXJuRmFrZU5vZGVcbiAgICB9O1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnNldFNvdXJjZSA9IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbm9kZTtcbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuTm9kZU1hbmFnZXIucHJvdG90eXBlLnNldERlc3RpbmF0aW9uID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHRoaXMuX2Nvbm5lY3RUbyhub2RlKTtcbiAgICByZXR1cm4gbm9kZTtcbn07XG5cblxuLypcbmZ1bmN0aW9uIEVjaG9Ob2RlKGNvbnRleHQsIGRlbGF5VGltZSwgZmVlZGJhY2tWb2x1bWUpe1xuICB0aGlzLmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5VGltZTtcbiAgdGhpcy5nYWluTm9kZSA9IGNvbnRleHQuY3JlYXRlR2Fpbk5vZGUoKTtcbiAgdGhpcy5nYWluTm9kZS5nYWluLnZhbHVlID0gZmVlZGJhY2tWb2x1bWU7XG4gIHRoaXMuY29ubmVjdCh0aGlzLmdhaW5Ob2RlKTtcbiAgdGhpcy5nYWluTm9kZS5jb25uZWN0KHRoaXMpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVFY2hvKGNvbnRleHQsIGRlbGF5VGltZSwgZmVlZGJhY2spe1xuICB2YXIgZGVsYXkgPSBjb250ZXh0LmNyZWF0ZURlbGF5Tm9kZShkZWxheVRpbWUgKyAxKTtcbiAgRmVlZGJhY2tEZWxheU5vZGUuY2FsbChkZWxheSwgY29udGV4dCwgZGVsYXlUaW1lLCBmZWVkYmFjayk7XG4gIHJldHVybiBkZWxheTtcbn1cbiovXG5cbi8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMzcwMjczMy9jcmVhdGluZy1hLWN1c3RvbS1lY2hvLW5vZGUtd2l0aC13ZWItYXVkaW9cbi8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xOTg5NTQ0Mi9pbXBsZW1lbnRpbmctYS1qYXZhc2NyaXB0LWF1ZGlvbm9kZVxuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gTm9kZU1hbmFnZXI7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE9zY2lsbGF0b3JTb3VyY2UodHlwZSwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIE9zY2lsbGF0b3JTb3VyY2VOb2RlXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbiAgICB0aGlzLl90eXBlID0gdHlwZTtcbiAgICB0aGlzLl9mcmVxdWVuY3kgPSAyMDA7XG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSkge1xuICAgIGlmKGRlbGF5ID09PSB1bmRlZmluZWQpIHsgZGVsYXkgPSAwOyB9XG4gICAgaWYoZGVsYXkgPiAwKSB7IGRlbGF5ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGRlbGF5OyB9XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUuc3RhcnQoZGVsYXkpO1xuXG4gICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3BhdXNlZEF0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZTtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbn07XG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gZWxhcHNlZDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLnN0b3AoMCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdmcmVxdWVuY3knLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZyZXF1ZW5jeTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy5fZnJlcXVlbmN5ID0gdmFsdWU7XG4gICAgICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCAnZW5kZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCAncGxheWluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fcGxheWluZztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoT3NjaWxsYXRvclNvdXJjZS5wcm90b3R5cGUsICdzb3VyY2VOb2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlICYmIHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUudHlwZSA9IHRoaXMuX3R5cGU7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLmZyZXF1ZW5jeS52YWx1ZSA9IHRoaXMuX2ZyZXF1ZW5jeTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICB9XG59KTtcblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IE9zY2lsbGF0b3JTb3VyY2U7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFBhbm5lcihjb250ZXh0KSB7XG4gICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZVBhbm5lcigpO1xuICAgIC8vIERlZmF1bHQgZm9yIHN0ZXJlbyBpcyBIUlRGXG4gICAgbm9kZS5wYW5uaW5nTW9kZWwgPSAnSFJURic7IC8vICdlcXVhbHBvd2VyJ1xuXG4gICAgLy8gRGlzdGFuY2UgbW9kZWwgYW5kIGF0dHJpYnV0ZXNcbiAgICBub2RlLmRpc3RhbmNlTW9kZWwgPSAnbGluZWFyJzsgLy8gJ2xpbmVhcicgJ2ludmVyc2UnICdleHBvbmVudGlhbCdcbiAgICBub2RlLnJlZkRpc3RhbmNlID0gMTtcbiAgICBub2RlLm1heERpc3RhbmNlID0gMTAwMDtcbiAgICBub2RlLnJvbGxvZmZGYWN0b3IgPSAxO1xuICAgIFxuICAgIC8vIHNpbXBsZSB2ZWMzIG9iamVjdCBwb29sXG4gICAgdmFyIFZlY1Bvb2wgPSB7XG4gICAgICAgIHBvb2w6IFtdLFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgICAgIHZhciB2ID0gdGhpcy5wb29sLmxlbmd0aCA/IHRoaXMucG9vbC5wb3AoKSA6IHsgeDogMCwgeTogMCwgejogMCB9O1xuICAgICAgICAgICAgLy8gY2hlY2sgaWYgYSB2ZWN0b3IgaGFzIGJlZW4gcGFzc2VkIGluXG4gICAgICAgICAgICBpZih4ICE9PSB1bmRlZmluZWQgJiYgaXNOYU4oeCkgJiYgJ3gnIGluIHggJiYgJ3knIGluIHggJiYgJ3onIGluIHgpIHtcbiAgICAgICAgICAgICAgICB2LnggPSB4LnggfHwgMDtcbiAgICAgICAgICAgICAgICB2LnkgPSB4LnkgfHwgMDtcbiAgICAgICAgICAgICAgICB2LnogPSB4LnogfHwgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHYueCA9IHggfHwgMDtcbiAgICAgICAgICAgICAgICB2LnkgPSB5IHx8IDA7XG4gICAgICAgICAgICAgICAgdi56ID0geiB8fCAwOyAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9LFxuICAgICAgICBkaXNwb3NlOiBmdW5jdGlvbihpbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5wb29sLnB1c2goaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBnbG9iYWxVcCA9IFZlY1Bvb2wuZ2V0KDAsIDEsIDApO1xuXG4gICAgdmFyIHNldE9yaWVudGF0aW9uID0gZnVuY3Rpb24obm9kZSwgZncpIHtcbiAgICAgICAgLy8gc2V0IHRoZSBvcmllbnRhdGlvbiBvZiB0aGUgc291cmNlICh3aGVyZSB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG5cbiAgICAgICAgLy8gY2FsY3VsYXRlIHVwIHZlYyAoIHVwID0gKGZvcndhcmQgY3Jvc3MgKDAsIDEsIDApKSBjcm9zcyBmb3J3YXJkIClcbiAgICAgICAgdmFyIHVwID0gVmVjUG9vbC5nZXQoZncueCwgZncueSwgZncueik7XG4gICAgICAgIGNyb3NzKHVwLCBnbG9iYWxVcCk7XG4gICAgICAgIGNyb3NzKHVwLCBmdyk7XG4gICAgICAgIG5vcm1hbGl6ZSh1cCk7XG4gICAgICAgIG5vcm1hbGl6ZShmdyk7XG5cbiAgICAgICAgLy8gc2V0IHRoZSBhdWRpbyBjb250ZXh0J3MgbGlzdGVuZXIgcG9zaXRpb24gdG8gbWF0Y2ggdGhlIGNhbWVyYSBwb3NpdGlvblxuICAgICAgICBub2RlLnNldE9yaWVudGF0aW9uKGZ3LngsIGZ3LnksIGZ3LnosIHVwLngsIHVwLnksIHVwLnopO1xuXG4gICAgICAgIC8vIHJldHVybiB0aGUgdmVjcyB0byB0aGUgcG9vbFxuICAgICAgICBWZWNQb29sLmRpc3Bvc2UoZncpO1xuICAgICAgICBWZWNQb29sLmRpc3Bvc2UodXApO1xuICAgIH07XG5cbiAgICB2YXIgc2V0UG9zaXRpb24gPSBmdW5jdGlvbihub2RlLCB2ZWMpIHtcbiAgICAgICAgbm9kZS5zZXRQb3NpdGlvbih2ZWMueCwgdmVjLnksIHZlYy56KTtcbiAgICAgICAgVmVjUG9vbC5kaXNwb3NlKHZlYyk7XG4gICAgfTtcblxuICAgIHZhciBzZXRWZWxvY2l0eSA9IGZ1bmN0aW9uKG5vZGUsIHZlYykge1xuICAgICAgICBub2RlLnNldFZlbG9jaXR5KHZlYy54LCB2ZWMueSwgdmVjLnopO1xuICAgICAgICBWZWNQb29sLmRpc3Bvc2UodmVjKTtcbiAgICB9O1xuXG4gICAgdmFyIGNhbGN1bGF0ZVZlbG9jaXR5ID0gZnVuY3Rpb24oY3VycmVudFBvc2l0aW9uLCBsYXN0UG9zaXRpb24sIGRlbHRhVGltZSkge1xuICAgICAgICB2YXIgZHggPSBjdXJyZW50UG9zaXRpb24ueCAtIGxhc3RQb3NpdGlvbi54O1xuICAgICAgICB2YXIgZHkgPSBjdXJyZW50UG9zaXRpb24ueSAtIGxhc3RQb3NpdGlvbi55O1xuICAgICAgICB2YXIgZHogPSBjdXJyZW50UG9zaXRpb24ueiAtIGxhc3RQb3NpdGlvbi56O1xuICAgICAgICByZXR1cm4gVmVjUG9vbC5nZXQoZHggLyBkZWx0YVRpbWUsIGR5IC8gZGVsdGFUaW1lLCBkeiAvIGRlbHRhVGltZSk7XG4gICAgfTtcblxuICAgIC8vIGNyb3NzIHByb2R1Y3Qgb2YgMiB2ZWN0b3JzXG4gICAgdmFyIGNyb3NzID0gZnVuY3Rpb24gKCBhLCBiICkge1xuICAgICAgICB2YXIgYXggPSBhLngsIGF5ID0gYS55LCBheiA9IGEuejtcbiAgICAgICAgdmFyIGJ4ID0gYi54LCBieSA9IGIueSwgYnogPSBiLno7XG4gICAgICAgIGEueCA9IGF5ICogYnogLSBheiAqIGJ5O1xuICAgICAgICBhLnkgPSBheiAqIGJ4IC0gYXggKiBiejtcbiAgICAgICAgYS56ID0gYXggKiBieSAtIGF5ICogYng7XG4gICAgfTtcblxuICAgIC8vIG5vcm1hbGlzZSB0byB1bml0IHZlY3RvclxuICAgIHZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAodmVjMykge1xuICAgICAgICBpZih2ZWMzLnggPT09IDAgJiYgdmVjMy55ID09PSAwICYmIHZlYzMueiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHZlYzM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxlbmd0aCA9IE1hdGguc3FydCggdmVjMy54ICogdmVjMy54ICsgdmVjMy55ICogdmVjMy55ICsgdmVjMy56ICogdmVjMy56ICk7XG4gICAgICAgIHZhciBpbnZTY2FsYXIgPSAxIC8gbGVuZ3RoO1xuICAgICAgICB2ZWMzLnggKj0gaW52U2NhbGFyO1xuICAgICAgICB2ZWMzLnkgKj0gaW52U2NhbGFyO1xuICAgICAgICB2ZWMzLnogKj0gaW52U2NhbGFyO1xuICAgICAgICByZXR1cm4gdmVjMztcbiAgICB9O1xuXG4gICAgLy8gcGFuIGxlZnQgdG8gcmlnaHQgd2l0aCB2YWx1ZSBmcm9tIC0xIHRvIDFcbiAgICAvLyBjcmVhdGVzIGEgbmljZSBjdXJ2ZSB3aXRoIHpcbiAgICB2YXIgc2V0WCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHZhciBkZWc0NSA9IE1hdGguUEkgLyA0LFxuICAgICAgICAgICAgZGVnOTAgPSBkZWc0NSAqIDIsXG4gICAgICAgICAgICB4ID0gdmFsdWUgKiBkZWc0NSxcbiAgICAgICAgICAgIHogPSB4ICsgZGVnOTA7XG5cbiAgICAgICAgaWYgKHogPiBkZWc5MCkge1xuICAgICAgICAgICAgeiA9IE1hdGguUEkgLSB6O1xuICAgICAgICB9XG5cbiAgICAgICAgeCA9IE1hdGguc2luKHgpO1xuICAgICAgICB6ID0gTWF0aC5zaW4oeik7XG5cbiAgICAgICAgbm9kZS5zZXRQb3NpdGlvbih4LCAwLCB6KTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSBwb3NpdGlvbiB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG4gICAgdmFyIHNldFNvdXJjZVBvc2l0aW9uID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRQb3NpdGlvbihub2RlLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIHNldCB0aGUgZGlyZWN0aW9uIHRoZSBhdWRpbyBpcyBjb21pbmcgZnJvbSlcbiAgICB2YXIgc2V0U291cmNlT3JpZW50YXRpb24gPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldE9yaWVudGF0aW9uKG5vZGUsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSB2ZWxvaWN0eSBvZiB0aGUgYXVkaW8gc291cmNlIChpZiBtb3ZpbmcpXG4gICAgdmFyIHNldFNvdXJjZVZlbG9jaXR5ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRWZWxvY2l0eShub2RlLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIHNldCB0aGUgcG9zaXRpb24gb2Ygd2hvIG9yIHdoYXQgaXMgaGVhcmluZyB0aGUgYXVkaW8gKGNvdWxkIGJlIGNhbWVyYSBvciBzb21lIGNoYXJhY3RlcilcbiAgICB2YXIgc2V0TGlzdGVuZXJQb3NpdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0UG9zaXRpb24oY29udGV4dC5saXN0ZW5lciwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHBvc2l0aW9uIG9mIHdobyBvciB3aGF0IGlzIGhlYXJpbmcgdGhlIGF1ZGlvIChjb3VsZCBiZSBjYW1lcmEgb3Igc29tZSBjaGFyYWN0ZXIpXG4gICAgdmFyIHNldExpc3RlbmVyT3JpZW50YXRpb24gPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldE9yaWVudGF0aW9uKGNvbnRleHQubGlzdGVuZXIsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSB2ZWxvY2l0eSAoaWYgbW92aW5nKSBvZiB3aG8gb3Igd2hhdCBpcyBoZWFyaW5nIHRoZSBhdWRpbyAoY291bGQgYmUgY2FtZXJhIG9yIHNvbWUgY2hhcmFjdGVyKVxuICAgIHZhciBzZXRMaXN0ZW5lclZlbG9jaXR5ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRWZWxvY2l0eShjb250ZXh0Lmxpc3RlbmVyLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIHB1YmxpYyBtZXRob2RzXG4gICAgdmFyIGV4cG9ydHMgPSB7XG4gICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgIHNldFg6IHNldFgsXG4gICAgICAgIHNldFNvdXJjZVBvc2l0aW9uOiBzZXRTb3VyY2VQb3NpdGlvbixcbiAgICAgICAgc2V0U291cmNlT3JpZW50YXRpb246IHNldFNvdXJjZU9yaWVudGF0aW9uLFxuICAgICAgICBzZXRTb3VyY2VWZWxvY2l0eTogc2V0U291cmNlVmVsb2NpdHksXG4gICAgICAgIHNldExpc3RlbmVyUG9zaXRpb246IHNldExpc3RlbmVyUG9zaXRpb24sXG4gICAgICAgIHNldExpc3RlbmVyT3JpZW50YXRpb246IHNldExpc3RlbmVyT3JpZW50YXRpb24sXG4gICAgICAgIHNldExpc3RlbmVyVmVsb2NpdHk6IHNldExpc3RlbmVyVmVsb2NpdHksXG4gICAgICAgIGNhbGN1bGF0ZVZlbG9jaXR5OiBjYWxjdWxhdGVWZWxvY2l0eSxcbiAgICAgICAgLy8gbWFwIG5hdGl2ZSBtZXRob2RzIHRvIFBhbm5lck5vZGVcbiAgICAgICAgc2V0UG9zaXRpb246IG5vZGUuc2V0UG9zaXRpb24sXG4gICAgICAgIHNldE9yaWVudGF0aW9uOiBub2RlLnNldE9yaWVudGF0aW9uLFxuICAgICAgICBjb25lT3V0ZXJHYWluOiBub2RlLmNvbmVPdXRlckdhaW4sXG4gICAgICAgIC8vIG1hcCBuYXRpdmUgbWV0aG9kcyB0byBBdWRpb05vZGVcbiAgICAgICAgY29ubmVjdDogbm9kZS5jb25uZWN0LFxuICAgICAgICBkaXNjb25uZWN0OiBub2RlLmRpc2Nvbm5lY3RcbiAgICB9O1xuXG4gICAgLy8gbWFwIG5hdGl2ZSBwcm9wZXJ0aWVzIHRvIFBhbm5lck5vZGVcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhleHBvcnRzLCB7XG4gICAgICAgICdwYW5uaW5nTW9kZWwnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5wYW5uaW5nTW9kZWw7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IG5vZGUucGFubmluZ01vZGVsID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgJ2Rpc3RhbmNlTW9kZWwnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5kaXN0YW5jZU1vZGVsOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLmRpc3RhbmNlTW9kZWwgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICAncmVmRGlzdGFuY2UnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5yZWZEaXN0YW5jZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbm9kZS5yZWZEaXN0YW5jZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgICdtYXhEaXN0YW5jZSc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLm1heERpc3RhbmNlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLm1heERpc3RhbmNlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgJ3JvbGxvZmZGYWN0b3InOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5yb2xsb2ZmRmFjdG9yOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLnJvbGxvZmZGYWN0b3IgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICAnY29uZUlubmVyQW5nbGUnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5jb25lSW5uZXJBbmdsZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbm9kZS5jb25lSW5uZXJBbmdsZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgICdjb25lT3V0ZXJBbmdsZSc6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLmNvbmVPdXRlckFuZ2xlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLmNvbmVPdXRlckFuZ2xlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgJ2NvbmVPdXRlckdhaW4nOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbm9kZS5jb25lT3V0ZXJHYWluOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLmNvbmVPdXRlckdhaW4gPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZShleHBvcnRzKTtcbn1cblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFBhbm5lcjtcbn1cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBTY3JpcHRTb3VyY2UoZGF0YSwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9idWZmZXJTaXplID0gZGF0YS5idWZmZXJTaXplIHx8IDEwMjQ7XG4gICAgdGhpcy5fY2hhbm5lbHMgPSBkYXRhLmNoYW5uZWxzIHx8IDE7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9vblByb2Nlc3MgPSBkYXRhLmNhbGxiYWNrLmJpbmQoZGF0YS50aGlzQXJnIHx8IHRoaXMpO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIFNjcmlwdFNvdXJjZU5vZGVcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufVxuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5TY3JpcHRTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSkge1xuICAgIGlmKGRlbGF5ID09PSB1bmRlZmluZWQpIHsgZGVsYXkgPSAwOyB9XG4gICAgaWYoZGVsYXkgPiAwKSB7IGRlbGF5ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGRlbGF5OyB9XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUub25hdWRpb3Byb2Nlc3MgPSB0aGlzLl9vblByb2Nlc3M7XG5cbiAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fcGF1c2VkQXQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xufTtcblxuU2NyaXB0U291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IGVsYXBzZWQ7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5TY3JpcHRTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUub25hdWRpb3Byb2Nlc3MgPSB0aGlzLl9vblBhdXNlZDtcbiAgICB9XG4gICAgdGhpcy5fZW5kZWQgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn07XG5cblNjcmlwdFNvdXJjZS5wcm90b3R5cGUuX29uUGF1c2VkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB2YXIgYnVmZmVyID0gZXZlbnQub3V0cHV0QnVmZmVyO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSk7XG4gICAgICAgIGZvciAodmFyIGogPSAwLCBsZW4gPSBjaGFubmVsLmxlbmd0aDsgaiA8IGxlbjsgaisrKSB7XG4gICAgICAgICAgICBjaGFubmVsW2pdID0gMDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTY3JpcHRTb3VyY2UucHJvdG90eXBlLCAnY3VycmVudFRpbWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgfVxuICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ2R1cmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ2VuZGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmRlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdwYXVzZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU2NyaXB0U291cmNlLnByb3RvdHlwZSwgJ3Byb2dyZXNzJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAwO1xuICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNjcmlwdFNvdXJjZS5wcm90b3R5cGUsICdzb3VyY2VOb2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IodGhpcy5fYnVmZmVyU2l6ZSwgMCwgdGhpcy5fY2hhbm5lbHMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgIH1cbn0pO1xuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gU2NyaXB0U291cmNlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQnVmZmVyU291cmNlID0gcmVxdWlyZSgnLi9idWZmZXItc291cmNlLmpzJyksXG4gICAgTWVkaWFTb3VyY2UgPSByZXF1aXJlKCcuL21lZGlhLXNvdXJjZS5qcycpLFxuICAgIE5vZGVNYW5hZ2VyID0gcmVxdWlyZSgnLi9ub2RlLW1hbmFnZXIuanMnKSxcbiAgICBNaWNyb3Bob25lU291cmNlID0gcmVxdWlyZSgnLi9taWNyb3Bob25lLXNvdXJjZS5qcycpLFxuICAgIE9zY2lsbGF0b3JTb3VyY2UgPSByZXF1aXJlKCcuL29zY2lsbGF0b3Itc291cmNlLmpzJyksXG4gICAgU2NyaXB0U291cmNlID0gcmVxdWlyZSgnLi9zY3JpcHQtc291cmNlLmpzJyksXG4gICAgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzLmpzJyk7XG5cbmZ1bmN0aW9uIFNvdW5kKGNvbnRleHQsIGRhdGEsIGRlc3RpbmF0aW9uKSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2RhdGEgPSBudWxsO1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX2xvb3AgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheVdoZW5SZWFkeSA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZSA9IG51bGw7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcblxuICAgIHRoaXMuX25vZGUgPSBuZXcgTm9kZU1hbmFnZXIodGhpcy5fY29udGV4dCk7XG4gICAgdGhpcy5fZ2FpbiA9IHRoaXMuX25vZGUuZ2FpbigpO1xuICAgIGlmKHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fbm9kZS5zZXREZXN0aW5hdGlvbih0aGlzLl9nYWluKTtcbiAgICAgICAgdGhpcy5fZ2Fpbi5jb25uZWN0KGRlc3RpbmF0aW9uIHx8IHRoaXMuX2NvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIH1cblxuICAgIHRoaXMuc2V0RGF0YShkYXRhKTtcbn1cblxuU291bmQucHJvdG90eXBlLnNldERhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgaWYoIWRhdGEpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB0aGlzLl9kYXRhID0gZGF0YTsgLy8gQXVkaW9CdWZmZXIsIE1lZGlhRWxlbWVudCwgZXRjXG5cbiAgICBpZihVdGlscy5pc0F1ZGlvQnVmZmVyKGRhdGEpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBCdWZmZXJTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2UgaWYoVXRpbHMuaXNNZWRpYUVsZW1lbnQoZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IE1lZGlhU291cmNlKGRhdGEsIHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbiAgICBlbHNlIGlmKFV0aWxzLmlzTWVkaWFTdHJlYW0oZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IE1pY3JvcGhvbmVTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2UgaWYoVXRpbHMuaXNPc2NpbGxhdG9yVHlwZShkYXRhKSkge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgT3NjaWxsYXRvclNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZihVdGlscy5pc1NjcmlwdENvbmZpZyhkYXRhKSkge1xuICAgICAgICB0aGlzLl9zb3VyY2UgPSBuZXcgU2NyaXB0U291cmNlKGRhdGEsIHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZGV0ZWN0IGRhdGEgdHlwZTogJyArIGRhdGEpO1xuICAgIH1cblxuICAgIHRoaXMuX25vZGUuc2V0U291cmNlKHRoaXMuX3NvdXJjZS5zb3VyY2VOb2RlKTtcblxuICAgIGlmKHR5cGVvZiB0aGlzLl9zb3VyY2Uub25FbmRlZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9zb3VyY2Uub25FbmRlZCh0aGlzLl9lbmRlZEhhbmRsZXIsIHRoaXMpO1xuICAgIH1cblxuICAgIC8vIHNob3VsZCB0aGlzIHRha2UgYWNjb3VudCBvZiBkZWxheSBhbmQgb2Zmc2V0P1xuICAgIGlmKHRoaXMuX3BsYXlXaGVuUmVhZHkpIHtcbiAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuU291bmQucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSwgb2Zmc2V0KSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkge1xuICAgICAgICB0aGlzLl9wbGF5V2hlblJlYWR5ID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHRoaXMuX25vZGUuc2V0U291cmNlKHRoaXMuX3NvdXJjZS5zb3VyY2VOb2RlKTtcbiAgICB0aGlzLl9zb3VyY2UubG9vcCA9IHRoaXMuX2xvb3A7XG5cbiAgICAvLyB1cGRhdGUgdm9sdW1lIG5lZWRlZCBmb3Igbm8gd2ViYXVkaW9cbiAgICBpZighdGhpcy5fY29udGV4dCkgeyB0aGlzLnZvbHVtZSA9IHRoaXMudm9sdW1lOyB9XG5cbiAgICB0aGlzLl9zb3VyY2UucGxheShkZWxheSwgb2Zmc2V0KTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuU291bmQucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuX3NvdXJjZS5wYXVzZSgpO1xuICAgIHJldHVybiB0aGlzOyAgXG59O1xuXG5Tb3VuZC5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2UpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB0aGlzLl9zb3VyY2Uuc3RvcCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuU291bmQucHJvdG90eXBlLnNlZWsgPSBmdW5jdGlvbihwZXJjZW50KSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMucGxheSgwLCB0aGlzLl9zb3VyY2UuZHVyYXRpb24gKiBwZXJjZW50KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gKiBFbmRlZCBoYW5kbGVyXG4gKi9cblxuU291bmQucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUuX2VuZGVkSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHR5cGVvZiB0aGlzLl9lbmRlZENhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sodGhpcyk7XG4gICAgfVxufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2NvbnRleHQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQ7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdjdXJyZW50VGltZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmN1cnJlbnRUaW1lIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2RhdGEnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RhdGE7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdkdXJhdGlvbicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmR1cmF0aW9uIDogMDtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2VuZGVkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuZW5kZWQgOiBmYWxzZTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2dhaW4nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dhaW47XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdsb29wJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9sb29wID0gISF2YWx1ZTtcbiAgICAgICAgaWYodGhpcy5fc291cmNlKSB7XG4gICAgICAgICAgdGhpcy5fc291cmNlLmxvb3AgPSB0aGlzLl9sb29wO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdub2RlJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9ub2RlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAncGF1c2VkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UucGF1c2VkIDogZmFsc2U7XG4gICAgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb3VuZC5wcm90b3R5cGUsICdwbGF5aW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UucGxheWluZyA6IGZhbHNlO1xuICAgIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAncHJvZ3Jlc3MnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wcm9ncmVzcyA6IDA7XG4gIH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU291bmQucHJvdG90eXBlLCAndm9sdW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9nYWluLmdhaW4udmFsdWU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmKGlzTmFOKHZhbHVlKSkgeyByZXR1cm47IH1cblxuICAgICAgICB0aGlzLl9nYWluLmdhaW4udmFsdWUgPSB2YWx1ZTtcblxuICAgICAgICBpZih0aGlzLl9kYXRhICYmIHRoaXMuX2RhdGEudm9sdW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEudm9sdW1lID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuLy8gZm9yIG9zY2lsbGF0b3JcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFNvdW5kLnByb3RvdHlwZSwgJ2ZyZXF1ZW5jeScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmZyZXF1ZW5jeSA6IDA7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmKHRoaXMuX3NvdXJjZSkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlLmZyZXF1ZW5jeSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbi8qXG4gKiBFeHBvcnRzXG4gKi9cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTb3VuZDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU3VwcG9ydCgpIHtcbiAgICB0aGlzLl9pbml0KCk7XG59XG5cblN1cHBvcnQucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcbiAgICBpZighZWwpIHsgcmV0dXJuIFtdOyB9XG5cbiAgICB2YXIgdGVzdHMgPSBbXG4gICAgICAgIHsgZXh0OiAnb2dnJywgdHlwZTogJ2F1ZGlvL29nZzsgY29kZWNzPVwidm9yYmlzXCInIH0sXG4gICAgICAgIHsgZXh0OiAnbXAzJywgdHlwZTogJ2F1ZGlvL21wZWc7JyB9LFxuICAgICAgICB7IGV4dDogJ29wdXMnLCB0eXBlOiAnYXVkaW8vb2dnOyBjb2RlY3M9XCJvcHVzXCInIH0sXG4gICAgICAgIHsgZXh0OiAnd2F2JywgdHlwZTogJ2F1ZGlvL3dhdjsgY29kZWNzPVwiMVwiJyB9LFxuICAgICAgICB7IGV4dDogJ200YScsIHR5cGU6ICdhdWRpby94LW00YTsnIH0sXG4gICAgICAgIHsgZXh0OiAnbTRhJywgdHlwZTogJ2F1ZGlvL2FhYzsnIH1cbiAgICBdO1xuXG4gICAgdGhpcy5fZXh0ZW5zaW9ucyA9IFtdO1xuICAgIHRoaXMuX2NhblBsYXkgPSB7fTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGVzdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHRlc3QgPSB0ZXN0c1tpXTtcbiAgICAgICAgdmFyIGNhblBsYXlUeXBlID0gISFlbC5jYW5QbGF5VHlwZSh0ZXN0LnR5cGUpO1xuICAgICAgICBpZihjYW5QbGF5VHlwZSkge1xuICAgICAgICAgICAgdGhpcy5fZXh0ZW5zaW9ucy5wdXNoKHRlc3QuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9jYW5QbGF5W3Rlc3QuZXh0XSA9IGNhblBsYXlUeXBlO1xuICAgIH1cbn07XG5cblN1cHBvcnQucHJvdG90eXBlLmdldEZpbGVFeHRlbnNpb24gPSBmdW5jdGlvbih1cmwpIHtcbiAgICB1cmwgPSB1cmwuc3BsaXQoJz8nKVswXTtcbiAgICB1cmwgPSB1cmwuc3Vic3RyKHVybC5sYXN0SW5kZXhPZignLycpICsgMSk7XG5cbiAgICB2YXIgYSA9IHVybC5zcGxpdCgnLicpO1xuICAgIGlmKGEubGVuZ3RoID09PSAxIHx8IChhWzBdID09PSAnJyAmJiBhLmxlbmd0aCA9PT0gMikpIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICByZXR1cm4gYS5wb3AoKS50b0xvd2VyQ2FzZSgpO1xufTtcblxuU3VwcG9ydC5wcm90b3R5cGUuZ2V0U3VwcG9ydGVkRmlsZSA9IGZ1bmN0aW9uKGZpbGVOYW1lcykge1xuICAgIC8vIGlmIGFycmF5IGdldCB0aGUgZmlyc3Qgb25lIHRoYXQgd29ya3NcbiAgICBpZihmaWxlTmFtZXMgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpbGVOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGV4dCA9IHRoaXMuZ2V0RmlsZUV4dGVuc2lvbihmaWxlTmFtZXNbaV0pO1xuICAgICAgICAgICAgdmFyIGluZCA9IHRoaXMuX2V4dGVuc2lvbnMuaW5kZXhPZihleHQpO1xuICAgICAgICAgICAgaWYoaW5kID4gLTEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmlsZU5hbWVzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIGlmIG5vdCBhcnJheSBhbmQgaXMgb2JqZWN0XG4gICAgZWxzZSBpZihmaWxlTmFtZXMgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgICAgZm9yKHZhciBrZXkgaW4gZmlsZU5hbWVzKSB7XG4gICAgICAgICAgICB2YXIgZXh0ZW5zaW9uID0gdGhpcy5nZXRGaWxlRXh0ZW5zaW9uKGZpbGVOYW1lc1trZXldKTtcbiAgICAgICAgICAgIHZhciBpbmRleCA9IHRoaXMuX2V4dGVuc2lvbnMuaW5kZXhPZihleHRlbnNpb24pO1xuICAgICAgICAgICAgaWYoaW5kZXggPiAtMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmaWxlTmFtZXNba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBpZiBzdHJpbmcganVzdCByZXR1cm5cbiAgICByZXR1cm4gZmlsZU5hbWVzO1xufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFN1cHBvcnQucHJvdG90eXBlLCAnZXh0ZW5zaW9ucycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZXh0ZW5zaW9ucztcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFN1cHBvcnQucHJvdG90eXBlLCAnY2FuUGxheScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2FuUGxheTtcbiAgICB9XG59KTtcblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFN1cHBvcnQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBVdGlscyA9IHt9O1xuXG5VdGlscy5zZXRDb250ZXh0ID0gZnVuY3Rpb24oY29udGV4dCkge1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufTtcblxuVXRpbHMuY3Jvc3NGYWRlID0gZnVuY3Rpb24oZnJvbVNvdW5kLCB0b1NvdW5kLCBkdXJhdGlvbikge1xuICAgIGZyb21Tb3VuZC5nYWluLmdhaW4ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUoMCwgdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGR1cmF0aW9uKTtcbiAgICB0b1NvdW5kLmdhaW4uZ2Fpbi5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZSgxLCB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZHVyYXRpb24pO1xufTtcblxuVXRpbHMuZGlzdG9ydCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgLy8gY3JlYXRlIHdhdmVTaGFwZXIgZGlzdG9ydGlvbiBjdXJ2ZSBmcm9tIDAgdG8gMVxuICAgIHZhciBrID0gdmFsdWUgKiAxMDAsXG4gICAgICAgIG4gPSAyMjA1MCxcbiAgICAgICAgY3VydmUgPSBuZXcgRmxvYXQzMkFycmF5KG4pLFxuICAgICAgICBkZWcgPSBNYXRoLlBJIC8gMTgwO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgdmFyIHggPSBpICogMiAvIG4gLSAxO1xuICAgICAgICBjdXJ2ZVtpXSA9ICgzICsgaykgKiB4ICogMjAgKiBkZWcgLyAoTWF0aC5QSSArIGsgKiBNYXRoLmFicyh4KSk7XG4gICAgfVxuICAgIHJldHVybiBjdXJ2ZTtcbn07XG5cblV0aWxzLmZhZGVGcm9tID0gZnVuY3Rpb24oc291bmQsIHZhbHVlLCBkdXJhdGlvbikge1xuICAgIHZhciB0b1ZhbHVlID0gc291bmQuZ2Fpbi5nYWluLnZhbHVlO1xuICAgIHNvdW5kLmdhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuICAgIHNvdW5kLmdhaW4uZ2Fpbi5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZSh0b1ZhbHVlLCB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZHVyYXRpb24pO1xufTtcblxuVXRpbHMuZmFkZVRvID0gZnVuY3Rpb24oc291bmQsIHZhbHVlLCBkdXJhdGlvbikge1xuICAgIHNvdW5kLmdhaW4uZ2Fpbi5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZSh2YWx1ZSwgdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGR1cmF0aW9uKTtcbn07XG5cblV0aWxzLmZpbHRlciA9IGZ1bmN0aW9uKGZpbHRlck5vZGUsIGZyZXFQZXJjZW50LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgLy8gc2V0IGZpbHRlciBmcmVxdWVuY3kgYmFzZWQgb24gdmFsdWUgZnJvbSAwIHRvIDFcbiAgICBpZihpc05hTihmcmVxUGVyY2VudCkpIHsgZnJlcVBlcmNlbnQgPSAwLjU7IH1cbiAgICBpZihpc05hTihxdWFsaXR5KSkgeyBxdWFsaXR5ID0gMDsgfVxuICAgIGlmKGlzTmFOKGdhaW4pKSB7IGdhaW4gPSAwOyB9XG4gICAgLy8gR2V0IGJhY2sgdG8gdGhlIGZyZXF1ZW5jeSB2YWx1ZSBiZXR3ZWVuIG1pbiBhbmQgbWF4LlxuICAgIGZpbHRlck5vZGUuZnJlcXVlbmN5LnZhbHVlID0gdGhpcy5nZXRGcmVxdWVuY3koZnJlcVBlcmNlbnQpO1xuICAgIGZpbHRlck5vZGUuUS52YWx1ZSA9IHF1YWxpdHk7IC8vIHJhbmdlIG9mIDAuMDAwMSB0byAxMDAwXG4gICAgZmlsdGVyTm9kZS5nYWluLnZhbHVlID0gZ2FpbjsgLy8gLTQwIHRvIDQwXG59O1xuXG5VdGlscy5nZXRGcmVxdWVuY3kgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIC8vIGdldCBmcmVxdWVuY3kgYnkgcGFzc2luZyBudW1iZXIgZnJvbSAwIHRvIDFcbiAgICAvLyBDbGFtcCB0aGUgZnJlcXVlbmN5IGJldHdlZW4gdGhlIG1pbmltdW0gdmFsdWUgKDQwIEh6KSBhbmQgaGFsZiBvZiB0aGVcbiAgICAvLyBzYW1wbGluZyByYXRlLlxuICAgIHZhciBtaW5WYWx1ZSA9IDQwO1xuICAgIHZhciBtYXhWYWx1ZSA9IHRoaXMuX2NvbnRleHQuc2FtcGxlUmF0ZSAvIDI7XG4gICAgLy8gTG9nYXJpdGhtIChiYXNlIDIpIHRvIGNvbXB1dGUgaG93IG1hbnkgb2N0YXZlcyBmYWxsIGluIHRoZSByYW5nZS5cbiAgICB2YXIgbnVtYmVyT2ZPY3RhdmVzID0gTWF0aC5sb2cobWF4VmFsdWUgLyBtaW5WYWx1ZSkgLyBNYXRoLkxOMjtcbiAgICAvLyBDb21wdXRlIGEgbXVsdGlwbGllciBmcm9tIDAgdG8gMSBiYXNlZCBvbiBhbiBleHBvbmVudGlhbCBzY2FsZS5cbiAgICB2YXIgbXVsdGlwbGllciA9IE1hdGgucG93KDIsIG51bWJlck9mT2N0YXZlcyAqICh2YWx1ZSAtIDEuMCkpO1xuICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICByZXR1cm4gbWF4VmFsdWUgKiBtdWx0aXBsaWVyO1xufTtcblxuVXRpbHMuaXNBdWRpb0J1ZmZlciA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB3aW5kb3cuQXVkaW9CdWZmZXIgJiZcbiAgICAgICAgICAgICAgZGF0YSBpbnN0YW5jZW9mIHdpbmRvdy5BdWRpb0J1ZmZlcik7XG59O1xuXG5VdGlscy5pc01lZGlhRWxlbWVudCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB3aW5kb3cuSFRNTE1lZGlhRWxlbWVudCAmJlxuICAgICAgICAgICAgICBkYXRhIGluc3RhbmNlb2Ygd2luZG93LkhUTUxNZWRpYUVsZW1lbnQpO1xufTtcblxuVXRpbHMuaXNNZWRpYVN0cmVhbSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB0eXBlb2YgZGF0YS5nZXRBdWRpb1RyYWNrcyA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAgICAgICBkYXRhLmdldEF1ZGlvVHJhY2tzKCkubGVuZ3RoICYmXG4gICAgICAgICAgICAgIHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrICYmXG4gICAgICAgICAgICAgIGRhdGEuZ2V0QXVkaW9UcmFja3MoKVswXSBpbnN0YW5jZW9mIHdpbmRvdy5NZWRpYVN0cmVhbVRyYWNrKTtcbn07XG5cblV0aWxzLmlzT3NjaWxsYXRvclR5cGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgcmV0dXJuICEhKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICAgKGRhdGEgPT09ICdzaW5lJyB8fCBkYXRhID09PSAnc3F1YXJlJyB8fFxuICAgICAgICAgICAgICBkYXRhID09PSAnc2F3dG9vdGgnIHx8IGRhdGEgPT09ICd0cmlhbmdsZScpKTtcbn07XG5cblV0aWxzLmlzU2NyaXB0Q29uZmlnID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHJldHVybiAhIShkYXRhICYmIHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgICBkYXRhLmJ1ZmZlclNpemUgJiYgZGF0YS5jaGFubmVscyAmJiBkYXRhLmNhbGxiYWNrKTtcbn07XG5cblV0aWxzLmlzRmlsZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5IHx8XG4gICAgICAgICAgICAgICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycgJiYgZGF0YS5pbmRleE9mKCcuJykgPiAtMSkpKTtcbn07XG5cblV0aWxzLm1pY3JvcGhvbmUgPSBmdW5jdGlvbihjb25uZWN0ZWQsIGRlbmllZCwgZXJyb3IsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gbmV3IFV0aWxzLk1pY3JvcGhvbmUoY29ubmVjdGVkLCBkZW5pZWQsIGVycm9yLCB0aGlzQXJnKTtcbn07XG5cbi8qVXRpbHMucGFuID0gZnVuY3Rpb24ocGFubmVyKSB7XG4gICAgY29uc29sZS5sb2coJ3BhbicsIHRoaXMuX2NvbnRleHQpO1xuICAgIHJldHVybiBuZXcgVXRpbHMuUGFuKHRoaXMuX2NvbnRleHQsIHBhbm5lcik7XG59OyovXG5cblV0aWxzLnRpbWVDb2RlID0gZnVuY3Rpb24oc2Vjb25kcywgZGVsaW0pIHtcbiAgICBpZihkZWxpbSA9PT0gdW5kZWZpbmVkKSB7IGRlbGltID0gJzonOyB9XG4gICAgdmFyIGggPSBNYXRoLmZsb29yKHNlY29uZHMgLyAzNjAwKTtcbiAgICB2YXIgbSA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAvIDYwKTtcbiAgICB2YXIgcyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAlIDYwKTtcbiAgICB2YXIgaHIgPSAoaCA9PT0gMCA/ICcnIDogKGggPCAxMCA/ICcwJyArIGggKyBkZWxpbSA6IGggKyBkZWxpbSkpO1xuICAgIHZhciBtbiA9IChtIDwgMTAgPyAnMCcgKyBtIDogbSkgKyBkZWxpbTtcbiAgICB2YXIgc2MgPSAocyA8IDEwID8gJzAnICsgcyA6IHMpO1xuICAgIHJldHVybiBociArIG1uICsgc2M7XG59O1xuXG5VdGlscy53YXZlZm9ybSA9IGZ1bmN0aW9uKGJ1ZmZlciwgbGVuZ3RoKSB7XG4gICAgcmV0dXJuIG5ldyBVdGlscy5XYXZlZm9ybShidWZmZXIsIGxlbmd0aCk7XG59O1xuXG4vKlxuICogV2F2ZWZvcm1cbiAqL1xuXG5VdGlscy5XYXZlZm9ybSA9IGZ1bmN0aW9uKGJ1ZmZlciwgbGVuZ3RoKSB7XG4gICAgdGhpcy5kYXRhID0gdGhpcy5nZXREYXRhKGJ1ZmZlciwgbGVuZ3RoKTtcbn07XG5cblV0aWxzLldhdmVmb3JtLnByb3RvdHlwZSA9IHtcbiAgICBnZXREYXRhOiBmdW5jdGlvbihidWZmZXIsIGxlbmd0aCkge1xuICAgICAgICBpZighd2luZG93LkZsb2F0MzJBcnJheSB8fCAhVXRpbHMuaXNBdWRpb0J1ZmZlcihidWZmZXIpKSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tLS0nKTtcbiAgICAgICAgY29uc29sZS50aW1lKCd3YXZlZm9ybURhdGEnKTtcbiAgICAgICAgdmFyIHdhdmVmb3JtID0gbmV3IEZsb2F0MzJBcnJheShsZW5ndGgpLFxuICAgICAgICAgICAgY2h1bmsgPSBNYXRoLmZsb29yKGJ1ZmZlci5sZW5ndGggLyBsZW5ndGgpLFxuICAgICAgICAgICAgLy9jaHVuayA9IGJ1ZmZlci5sZW5ndGggLyBsZW5ndGgsXG4gICAgICAgICAgICByZXNvbHV0aW9uID0gNSwgLy8gMTBcbiAgICAgICAgICAgIGluY3IgPSBNYXRoLmZsb29yKGNodW5rIC8gcmVzb2x1dGlvbiksXG4gICAgICAgICAgICBncmVhdGVzdCA9IDA7XG5cbiAgICAgICAgaWYoaW5jciA8IDEpIHsgaW5jciA9IDE7IH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgY2hubHMgPSBidWZmZXIubnVtYmVyT2ZDaGFubmVsczsgaSA8IGNobmxzOyBpKyspIHtcbiAgICAgICAgICAgIC8vIGNoZWNrIGVhY2ggY2hhbm5lbFxuICAgICAgICAgICAgdmFyIGNoYW5uZWwgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSk7XG4gICAgICAgICAgICAvL2ZvciAodmFyIGogPSBsZW5ndGggLSAxOyBqID49IDA7IGotLSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBsZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIC8vIGdldCBoaWdoZXN0IHZhbHVlIHdpdGhpbiB0aGUgY2h1bmtcbiAgICAgICAgICAgICAgICAvL3ZhciBjaCA9IGogKiBjaHVuaztcbiAgICAgICAgICAgICAgICAvL2ZvciAodmFyIGsgPSBjaCArIGNodW5rIC0gMTsgayA+PSBjaDsgayAtPSBpbmNyKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IGogKiBjaHVuaywgbCA9IGsgKyBjaHVuazsgayA8IGw7IGsgKz0gaW5jcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBzZWxlY3QgaGlnaGVzdCB2YWx1ZSBmcm9tIGNoYW5uZWxzXG4gICAgICAgICAgICAgICAgICAgIHZhciBhID0gY2hhbm5lbFtrXTtcbiAgICAgICAgICAgICAgICAgICAgaWYoYSA8IDApIHsgYSA9IC1hOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChhID4gd2F2ZWZvcm1bal0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhdmVmb3JtW2pdID0gYTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgaGlnaGVzdCBvdmVyYWxsIGZvciBzY2FsaW5nXG4gICAgICAgICAgICAgICAgICAgIGlmKGEgPiBncmVhdGVzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlc3QgPSBhO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIHNjYWxlIHVwP1xuICAgICAgICB2YXIgc2NhbGUgPSAxIC8gZ3JlYXRlc3QsXG4gICAgICAgICAgICBsZW4gPSB3YXZlZm9ybS5sZW5ndGg7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgd2F2ZWZvcm1baV0gKj0gc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS50aW1lRW5kKCd3YXZlZm9ybURhdGEnKTtcbiAgICAgICAgcmV0dXJuIHdhdmVmb3JtO1xuICAgIH0sXG4gICAgZ2V0Q2FudmFzOiBmdW5jdGlvbihoZWlnaHQsIGNvbG9yLCBiZ0NvbG9yLCBjYW52YXNFbCkge1xuICAgIC8vd2F2ZWZvcm06IGZ1bmN0aW9uKGFyciwgd2lkdGgsIGhlaWdodCwgY29sb3IsIGJnQ29sb3IsIGNhbnZhc0VsKSB7XG4gICAgICAgIC8vdmFyIGFyciA9IHRoaXMud2F2ZWZvcm1EYXRhKGJ1ZmZlciwgd2lkdGgpO1xuICAgICAgICB2YXIgY2FudmFzID0gY2FudmFzRWwgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aCA9IHRoaXMuZGF0YS5sZW5ndGg7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBiZ0NvbG9yO1xuICAgICAgICBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB2YXIgeCwgeTtcbiAgICAgICAgLy9jb25zb2xlLnRpbWUoJ3dhdmVmb3JtQ2FudmFzJyk7XG4gICAgICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gdGhpcy5kYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgeCA9IGkgKyAwLjU7XG4gICAgICAgICAgICB5ID0gaGVpZ2h0IC0gTWF0aC5yb3VuZChoZWlnaHQgKiB0aGlzLmRhdGFbaV0pO1xuICAgICAgICAgICAgY29udGV4dC5tb3ZlVG8oeCwgeSk7XG4gICAgICAgICAgICBjb250ZXh0LmxpbmVUbyh4LCBoZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XG4gICAgICAgIC8vY29uc29sZS50aW1lRW5kKCd3YXZlZm9ybUNhbnZhcycpO1xuICAgICAgICByZXR1cm4gY2FudmFzO1xuICAgIH1cbn07XG5cblxuLypcbiAqIE1pY3JvcGhvbmVcbiAqL1xuXG5VdGlscy5NaWNyb3Bob25lID0gZnVuY3Rpb24oY29ubmVjdGVkLCBkZW5pZWQsIGVycm9yLCB0aGlzQXJnKSB7XG4gICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYV8gPSAobmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhKTtcbiAgICB0aGlzLl9pc1N1cHBvcnRlZCA9ICEhbmF2aWdhdG9yLmdldFVzZXJNZWRpYV87XG4gICAgdGhpcy5fc3RyZWFtID0gbnVsbDtcblxuICAgIHRoaXMuX29uQ29ubmVjdGVkID0gY29ubmVjdGVkLmJpbmQodGhpc0FyZyB8fCB0aGlzKTtcbiAgICB0aGlzLl9vbkRlbmllZCA9IGRlbmllZCA/IGRlbmllZC5iaW5kKHRoaXNBcmcgfHwgdGhpcykgOiBmdW5jdGlvbigpIHt9O1xuICAgIHRoaXMuX29uRXJyb3IgPSBlcnJvciA/IGVycm9yLmJpbmQodGhpc0FyZyB8fCB0aGlzKSA6IGZ1bmN0aW9uKCkge307XG59O1xuXG5VdGlscy5NaWNyb3Bob25lLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX2lzU3VwcG9ydGVkKSB7IHJldHVybjsgfVxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhXygge2F1ZGlvOnRydWV9LCBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgc2VsZi5fc3RyZWFtID0gc3RyZWFtO1xuICAgICAgICBzZWxmLl9vbkNvbm5lY3RlZChzdHJlYW0pO1xuICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYoZS5uYW1lID09PSAnUGVybWlzc2lvbkRlbmllZEVycm9yJyB8fCBlID09PSAnUEVSTUlTU0lPTl9ERU5JRUQnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUGVybWlzc2lvbiBkZW5pZWQuIFlvdSBjYW4gdW5kbyB0aGlzIGJ5IGNsaWNraW5nIHRoZSBjYW1lcmEgaWNvbiB3aXRoIHRoZSByZWQgY3Jvc3MgaW4gdGhlIGFkZHJlc3MgYmFyJyk7XG4gICAgICAgICAgICBzZWxmLl9vbkRlbmllZCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5fb25FcnJvcihlLm1lc3NhZ2UgfHwgZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblV0aWxzLk1pY3JvcGhvbmUucHJvdG90eXBlLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zdHJlYW0pIHtcbiAgICAgICAgdGhpcy5fc3RyZWFtLnN0b3AoKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoVXRpbHMuTWljcm9waG9uZS5wcm90b3R5cGUsICdzdHJlYW0nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0cmVhbTtcbiAgICB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFV0aWxzLk1pY3JvcGhvbmUucHJvdG90eXBlLCAnaXNTdXBwb3J0ZWQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2lzU3VwcG9ydGVkO1xuICAgIH1cbn0pO1xuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gVXRpbHM7XG59XG4iXX0=
