(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.sono = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

var browser = _dereq_('./lib/utils/browser.js'),
    file = _dereq_('./lib/utils/file.js'),
    Group = _dereq_('./lib/group.js'),
    Loader = _dereq_('./lib/utils/loader.js'),
    Sound = _dereq_('./lib/sound.js'),
    SoundGroup = _dereq_('./lib/utils/sound-group.js'),
    utils = _dereq_('./lib/utils/utils.js');

function Sono() {
    var VERSION = '0.0.9',
        Ctx = (window.AudioContext || window.webkitAudioContext),
        context = (Ctx ? new Ctx() : null),
        destination = (context ? context.destination : null),
        group = new Group(context, destination),
        api;

    utils.setContext(context);

    /*
     * Create Sound
     *
     * Accepted values for param config:
     * Object config e.g. { id:'foo', url:['foo.ogg', 'foo.mp3'] }
     * Array (of files e.g. ['foo.ogg', 'foo.mp3'])
     * ArrayBuffer
     * HTMLMediaElement
     * Filename string (e.g. 'foo.ogg')
     * Oscillator type string (i.e. 'sine', 'square', 'sawtooth', 'triangle')
     * ScriptProcessor config object (e.g. { bufferSize: 1024, channels: 1, callback: fn })
     */

    var createSound = function(config) {
        // try to load if config contains URLs
        if(file.containsURL(config)) {
            return load(config);
        }

        var sound = add(config);
        sound.data = config.data || config;

        return sound;
    };

    /*
     * Destroy
     */

    var destroySound = function(soundOrId) {
        group.find(soundOrId, function(sound) {
            sound.destroy();
        });
        return api;
    };

    var destroyAll = function() {
        group.destroy();
        return api;
    };

    /*
     * Get Sound by id
     */

    var getSound = function(id) {
        return group.find(id);
    };

    /*
     * Create group
     */

    var createGroup = function(sounds) {
        var soundGroup = new SoundGroup(context, group.gain);
        if(sounds) {
            sounds.forEach(function(sound) {
                soundGroup.add(sound);
            });
        }
        return soundGroup;
    };

    /*
     * Loading
     */

    var load = function(config) {
        var src = config.src || config.url || config,
            sound,
            loader;

        if(file.containsURL(src)) {
            sound = queue(config);
            loader = sound.loader;
        }
        else if(Array.isArray(src) && file.containsURL(src[0].src || src[0].url)) {
            sound = [];
            loader = new Loader.Group();

            src.forEach(function(file) {
                sound.push(queue(file, loader));
            });
        }
        else {
            return null;
        }

        if (config.onProgress) {
            loader.on('progress', function(progress) {
                config.onProgress(progress);
            });
        }
        if (config.onComplete) {
            loader.once('complete', function() {
                loader.off('progress');
                config.onComplete(sound);
            });
        }
        loader.once('error', function(err) {
            loader.off('error');
            if (config.onError) {
                config.onError(err);
            } else {
                console.warn.call(console, err);
            }
        });
        loader.start();

        return sound;
    };

    var queue = function(config, loaderGroup) {
        var sound = add(config).load(config);

        if(loaderGroup) {
            loaderGroup.add(sound.loader);
        }

        return sound;
    };

    var add = function(config) {
        var soundContext = config && config.webAudio === false ? null : context;
        var sound = new Sound(soundContext, group.gain);
        sound.isTouchLocked = isTouchLocked;
        if(config) {
            sound.id = config.id || '';
            sound.loop = !!config.loop;
            sound.volume = config.volume;
        }
        group.add(sound);
        return sound;
    };

    /*
     * Controls
     */

    var mute = function() {
        group.mute();
        return api;
    };

    var unMute = function() {
        group.unMute();
        return api;
    };

    var fade = function(volume, duration) {
        group.fade(volume, duration);
        return api;
    };

    var pauseAll = function() {
        group.pause();
        return api;
    };

    var resumeAll = function() {
        group.resume();
        return api;
    };

    var stopAll = function() {
        group.stop();
        return api;
    };

    var play = function(id, delay, offset) {
        group.find(id, function(sound) {
            sound.play(delay, offset);
        });
        return api;
    };

    var pause = function(id) {
        group.find(id, function(sound) {
            sound.pause();
        });
        return api;
    };

    var stop = function(id) {
        group.find(id, function(sound) {
            sound.stop();
        });
        return api;
    };

    /*
     * Mobile touch lock
     */

    var isTouchLocked = browser.handleTouchLock(context, function() {
        isTouchLocked = false;
        group.sounds.forEach(function(sound) {
            sound.isTouchLocked = false;
        });
    });

    /*
     * Page visibility events
     */

    (function() {
        var pageHiddenPaused = [];

        // pause currently playing sounds and store refs
        function onHidden() {
            group.sounds.forEach(function(sound) {
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

        browser.handlePageVisibility(onHidden, onShown);
    }());

    /*
     * Log version & device support info
     */

    var log = function() {
        var title = 'sono ' + VERSION,
            info = 'Supported:' + api.isSupported +
                   ' WebAudioAPI:' + api.hasWebAudio +
                   ' TouchLocked:' + isTouchLocked +
                   ' Extensions:' + file.extensions;

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

    api = {
        createSound: createSound,
        destroySound: destroySound,
        destroyAll: destroyAll,
        getSound: getSound,
        createGroup: createGroup,
        load: load,
        mute: mute,
        unMute: unMute,
        fade: fade,
        pauseAll: pauseAll,
        resumeAll: resumeAll,
        stopAll: stopAll,
        play: play,
        pause: pause,
        stop: stop,
        log: log,

        canPlay: file.canPlay,
        context: context,
        effect: group.effect,
        extensions: file.extensions,
        hasWebAudio: !!context,
        isSupported: file.extensions.length > 0,
        gain: group.gain,
        utils: utils,
        VERSION: VERSION
    };

    /*
     * Getters & Setters
     */

    Object.defineProperties(api, {
        isTouchLocked: {
            get: function() {
                return isTouchLocked;
            }
        },
        sounds: {
            get: function() {
                return group.sounds.slice(0);
            }
        },
        volume: {
            get: function() {
                return group.volume;
            },
            set: function(value) {
                group.volume = value;
            }
        }
    });

    return Object.freeze(api);
}

module.exports = new Sono();

},{"./lib/group.js":14,"./lib/sound.js":15,"./lib/utils/browser.js":21,"./lib/utils/file.js":23,"./lib/utils/loader.js":24,"./lib/utils/sound-group.js":26,"./lib/utils/utils.js":27}],2:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      void 0;
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        void 0;
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(_dereq_,module,exports){
'use strict';

var Analyser = _dereq_('./effect/analyser.js'),
    Distortion = _dereq_('./effect/distortion.js'),
    Echo = _dereq_('./effect/echo.js'),
    FakeContext = _dereq_('./effect/fake-context.js'),
    Filter = _dereq_('./effect/filter.js'),
    Flanger = _dereq_('./effect/flanger.js'),
    Panner = _dereq_('./effect/panner.js'),
    Phaser = _dereq_('./effect/phaser.js'),
    Recorder = _dereq_('./effect/recorder.js'),
    Reverb = _dereq_('./effect/reverb.js');

function Effect(context) {
    context = context || new FakeContext();

    var api,
        destination,
        nodeList = [],
        panning = new Panner(context),
        sourceNode;

    var has = function(node) {
        if(!node) { return false; }
        return nodeList.indexOf(node) > -1;
    };

    var add = function(node) {
        if(!node) { return; }
        if(has(node)) { return node; }
        nodeList.push(node);
        updateConnections();
        return node;
    };

    var remove = function(node) {
        if(!node) { return; }
        if(!has(node)) { return node; }
        var l = nodeList.length;
        for (var i = 0; i < l; i++) {
            if(node === nodeList[i]) {
                nodeList.splice(i, 1);
                break;
            }
        }
        var output = node._output || node;
        output.disconnect();
        updateConnections();
        return node;
    };

    var toggle = function(node, force) {
      force = !!force;
      var hasNode = has(node);
      if(arguments.length > 1 && hasNode === force) {
        return api;
      }
      if(hasNode) {
        remove(node);
      } else {
        add(node);
      }
      return api;
    };

    var removeAll = function() {
        while(nodeList.length) {
            nodeList.pop().disconnect();
        }
        updateConnections();
        return api;
    };

    var destroy = function() {
        removeAll();
        context = null;
        destination = null;
        nodeList = [];
        if(sourceNode) { sourceNode.disconnect(); }
        sourceNode = null;
    };

    var connect = function(a, b) {
        //console.log('> connect', (a.name || a.constructor.name), 'to', (b.name || b.constructor.name));

        var output = a._output || a;
        //console.log('> disconnect output: ', (a.name || a.constructor.name));
        output.disconnect();
        //console.log('> connect output: ', (a.name || a.constructor.name), 'to input:', (b.name || b.constructor.name));
        output.connect(b);
    };

    var connectToDestination = function(node) {
        var l = nodeList.length,
            lastNode = l ? nodeList[l - 1] : sourceNode;

        if(lastNode) {
            connect(lastNode, node);
        }

        destination = node;
    };

    var updateConnections = function() {
        if(!sourceNode) { return; }

        //console.log('updateConnections:', nodeList.length);

        var node,
            prev;

        for (var i = 0; i < nodeList.length; i++) {
            node = nodeList[i];
            //console.log(i, node);
            prev = i === 0 ? sourceNode : nodeList[i - 1];
            connect(prev, node);
        }

        if(destination) {
            connectToDestination(destination);
        }
    };

    /*
     * Effects
     */

    var analyser = function(config) {
        return add(new Analyser(context, config));
    };

    // lowers the volume of the loudest parts of the signal and raises the volume of the softest parts
    var compressor = function(config) {
        config = config || {};

        var node = context.createDynamicsCompressor();

        node.update = function(config) {
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
        };

        node.update(config);

        return add(node);
    };

    var convolver = function(impulseResponse) {
        // impulseResponse is an audio file buffer
        var node = context.createConvolver();
        node.buffer = impulseResponse;
        return add(node);
    };

    var delay = function(time) {
        var node = context.createDelay();
        if(time !== undefined) { node.delayTime.value = time; }
        return add(node);
    };

    var echo = function(config) {
        return add(new Echo(context, config));
    };

    var distortion = function(amount) {
        // Float32Array defining curve (values are interpolated)
        //node.curve
        // up-sample before applying curve for better resolution result 'none', '2x' or '4x'
        //node.oversample = '2x';
        return add(new Distortion(context, amount));
    };

    var filter = function(type, frequency, q, gain) {
        return add(new Filter(context, type, frequency, q, gain));
    };

    var lowpass = function(frequency, peak) {
        return filter('lowpass', frequency, peak);
    };

    var highpass = function(frequency, peak) {
        return filter('highpass', frequency, peak);
    };

    var bandpass = function(frequency, width) {
        return filter('bandpass', frequency, width);
    };

    var lowshelf = function(frequency, gain) {
        return filter('lowshelf', frequency, 0, gain);
    };

    var highshelf = function(frequency, gain) {
        return filter('highshelf', frequency, 0, gain);
    };

    var peaking = function(frequency, width, gain) {
        return filter('peaking', frequency, width, gain);
    };

    var notch = function(frequency, width, gain) {
        return filter('notch', frequency, width, gain);
    };

    var allpass = function(frequency, sharpness) {
        return filter('allpass', frequency, sharpness);
    };

    var flanger = function(config) {
        return add(new Flanger(context, config));
    };

    var gain = function(value) {
        var node = context.createGain();
        if(value !== undefined) {
            node.gain.value = value;
        }
        return node;
    };

    var panner = function() {
        return add(new Panner(context));
    };

    var phaser = function(config) {
        return add(new Phaser(context, config));
    };

    var recorder = function(passThrough) {
        return add(new Recorder(context, passThrough));
    };

    var reverb = function(seconds, decay, reverse) {
        return add(new Reverb(context, seconds, decay, reverse));
    };

    var script = function(config) {
        config = config || {};
        // bufferSize 256 - 16384 (pow 2)
        var bufferSize = config.bufferSize || 1024;
        var inputChannels = config.inputChannels === undefined ? 0 : inputChannels;
        var outputChannels = config.outputChannels === undefined ? 1 : outputChannels;

        var node = context.createScriptProcessor(bufferSize, inputChannels, outputChannels);

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

        return add(node);
    };

    var setSource = function(node) {
        sourceNode = node;
        updateConnections();
        return node;
    };

    var setDestination = function(node) {
        connectToDestination(node);
        return node;
    };

    //

    api = {
        context: context,
        nodeList: nodeList,
        panning: panning,

        has: has,
        add: add,
        remove: remove,
        toggle: toggle,
        removeAll: removeAll,
        destroy: destroy,
        setSource: setSource,
        setDestination: setDestination,

        analyser: analyser,
        compressor: compressor,
        convolver: convolver,
        delay: delay,
        echo: echo,
        distortion: distortion,
        filter: filter,
        lowpass: lowpass,
        highpass: highpass,
        bandpass: bandpass,
        lowshelf: lowshelf,
        highshelf: highshelf,
        peaking: peaking,
        notch: notch,
        allpass: allpass,
        flanger: flanger,
        gain: gain,
        panner: panner,
        phaser: phaser,
        recorder: recorder,
        reverb: reverb,
        script: script
    };

    return Object.freeze(api);
}

module.exports = Effect;

},{"./effect/analyser.js":4,"./effect/distortion.js":5,"./effect/echo.js":6,"./effect/fake-context.js":7,"./effect/filter.js":8,"./effect/flanger.js":9,"./effect/panner.js":10,"./effect/phaser.js":11,"./effect/recorder.js":12,"./effect/reverb.js":13}],4:[function(_dereq_,module,exports){
'use strict';

function Analyser(context, config) {
    config = config || {};

    var fftSize = config.fftSize || 512,
        freqFloat = !!config.float,
        waveFloat = !!config.float,
        waveform,
        frequencies,
        node = context.createAnalyser();

    node.fftSize = fftSize; // frequencyBinCount will be half this value
    node.smoothingTimeConstant = config.smoothing || config.smoothingTimeConstant || node.smoothingTimeConstant;
    node.minDecibels = config.minDecibels || node.minDecibels;
    node.maxDecibels = config.maxDecibels || node.maxDecibels;

    var needsUpdate = function(arr, float) {
      if(!arr) { return true; }
      if(node.fftSize !== fftSize) { return true; }
      if(float && arr instanceof Uint8Array) { return true; }
      return !float && arr instanceof Float32Array;
    };

    var createArray = function(float, length) {
      return float ? new Float32Array(length) : new Uint8Array(length);
    };

    node.getWaveform = function(float) {
        if(!arguments.length) { float = waveFloat; }

        if(needsUpdate(waveform, float)) {
            fftSize = node.fftSize;
            waveFloat = float;
            waveform = createArray(float, fftSize);
        }

        if(float) {
            this.getFloatTimeDomainData(waveform);
        } else {
            this.getByteTimeDomainData(waveform);
        }

        return waveform;
    };

    node.getFrequencies = function(float) {
        if(!arguments.length) { float = freqFloat; }

        if(needsUpdate(frequencies, float)) {
            fftSize = node.fftSize;
            freqFloat = float;
            frequencies = createArray(float, node.frequencyBinCount);
        }

        if(float) {
            this.getFloatFrequencyData(frequencies);
        } else {
            this.getByteFrequencyData(frequencies);
        }

        return frequencies;
    };

    node.update = function() {
      node.getWaveform();
      node.getFrequencies();
    };

    Object.defineProperties(node, {
        smoothing: {
            get: function() { return node.smoothingTimeConstant; },
            set: function(value) { node.smoothingTimeConstant = value; }
        }
    });

    return node;
}

module.exports = Analyser;

},{}],5:[function(_dereq_,module,exports){
'use strict';

var validify = _dereq_('../utils/validify.js').number;
var n = 22050;

function Distortion(context, amount) {

    amount = validify(amount, 1);

    var node = context.createWaveShaper();
    var curve = new Float32Array(n);

    // create waveShaper distortion curve from 0 to 1
    node.update = function(value) {
        amount = value;
        if(amount <= 0) {
          amount = 0;
          this.curve = null;
          return;
        }
        var k = value * 100,
            // n = 22050,
            // curve = new Float32Array(n),
            deg = Math.PI / 180,
            x;

        for (var i = 0; i < n; i++) {
            x = i * 2 / n - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }

        this.curve = curve;
    };

    Object.defineProperties(node, {
        amount: {
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

},{"../utils/validify.js":28}],6:[function(_dereq_,module,exports){
'use strict';

var validify = _dereq_('../utils/validify.js').number;

function Echo(context, config) {
    config = config || {};

    var input = context.createGain();
    var delay = context.createDelay();
    var gain = context.createGain();
    var output = context.createGain();

    delay.delayTime.value = validify(config.delayTime, 0.5);
    gain.gain.value = validify(config.feedback, 0.5);

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

},{"../utils/validify.js":28}],7:[function(_dereq_,module,exports){
'use strict';

function FakeContext() {

    var startTime = Date.now();

    var fn = function(){};

    var param = function() {
        return {
            value: 1,
            defaultValue: 1,
            linearRampToValueAtTime: fn,
            setValueAtTime: fn,
            exponentialRampToValueAtTime: fn,
            setTargetAtTime: fn,
            setValueCurveAtTime: fn,
            cancelScheduledValues: fn
        };
    };

    var fakeNode = function() {
        return {
            connect:fn,
            disconnect:fn,
            // analyser
            frequencyBinCount: 0,
            smoothingTimeConstant: 0,
            fftSize: 0,
            minDecibels: 0,
            maxDecibels: 0,
            getByteTimeDomainData: fn,
            getByteFrequencyData: fn,
            getFloatTimeDomainData: fn,
            getFloatFrequencyData: fn,
            // gain
            gain: param(),
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
            frequency: param(),
            Q: param(),
            // delay
            delayTime: param(),
            // convolver
            buffer: 0,
            // compressor
            threshold: param(),
            knee: param(),
            ratio: param(),
            attack: param(),
            release: param(),
            reduction: param(),
            // distortion
            oversample: 0,
            curve: 0,
            // buffer
            sampleRate: 1,
            length: 0,
            duration: 0,
            numberOfChannels: 0,
            getChannelData: function() {
                return [];
            },
            copyFromChannel: fn,
            copyToChannel: fn,
            // listener
            dopplerFactor: 0,
            speedOfSound: 0,
            // osc
            start: fn
        };
    };

    // ie9
    if(!window.Uint8Array) {
        window.Uint8Array = window.Float32Array = Array;
    }

    return {
        createAnalyser: fakeNode,
        createBuffer: fakeNode,
        createBiquadFilter: fakeNode,
        createChannelMerger: fakeNode,
        createChannelSplitter: fakeNode,
        createDynamicsCompressor: fakeNode,
        createConvolver: fakeNode,
        createDelay: fakeNode,
        createGain: fakeNode,
        createOscillator: fakeNode,
        createPanner: fakeNode,
        createScriptProcessor: fakeNode,
        createWaveShaper: fakeNode,
        listener: fakeNode(),
        get currentTime() {
            return (Date.now() - startTime) / 1000;
        }
    };
}

module.exports = FakeContext;

},{}],8:[function(_dereq_,module,exports){
'use strict';

// https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
// For lowpass and highpass Q indicates how peaked the frequency is around the cutoff.
// The greater the value is, the greater is the peak

function Filter(context, type, frequency, q, gain) {
    // Frequency between 40Hz and half of the sampling rate
    var minFrequency = 40;
    var maxFrequency = context.sampleRate / 2;

    var node = context.createBiquadFilter();
    node.type = type;

    var getFrequency = function(value) {
        // Logarithm (base 2) to compute how many octaves fall in the range.
        var numberOfOctaves = Math.log(maxFrequency / minFrequency) / Math.LN2;
        // Compute a multiplier from 0 to 1 based on an exponential scale.
        var multiplier = Math.pow(2, numberOfOctaves * (value - 1.0));
        // Get back to the frequency value between min and max.
        return maxFrequency * multiplier;
    };

    node.set = function(frequency, q, gain) {
      if (frequency !== undefined) { node.frequency.value = frequency; }
      if (q !== undefined) { node.Q.value = q; }
      if (gain !== undefined) { node.gain.value = gain; }
      return node;
    };

    // set filter frequency based on value from 0 to 1
    node.setByPercent = function(percent, q, gain) {
        return node.set(getFrequency(percent), q, gain);
    };

    return node.set(frequency, q, gain);
}

module.exports = Filter;

},{}],9:[function(_dereq_,module,exports){
'use strict';

var validify = _dereq_('../utils/validify.js').number;

function MonoFlanger(context, config) {
    var input = context.createGain();
    var delay = context.createDelay();
    var feedback = context.createGain();
    var lfo = context.createOscillator();
    var gain = context.createGain();
    var output = context.createGain();

    delay.delayTime.value = validify(config.delay, 0.005); // 5-25ms delay (0.005 > 0.025)
    feedback.gain.value = validify(config.feedback, 0.5); // 0 > 1

    lfo.type = 'sine';
    lfo.frequency.value = validify(config.gain, 0.002); // 0.05 > 5
    gain.gain.value = validify(config.frequency, 0.25); // 0.0005 > 0.005

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

    feedbackL.gain.value = feedbackR.gain.value = validify(config.feedback, 0.5);
    delayL.delayTime.value = delayR.delayTime.value = validify(config.delay, 0.003);

    lfo.type = 'sine';
    lfo.frequency.value = validify(config.frequency, 0.5);
    lfoGainL.gain.value = validify(config.gain, 0.005);
    lfoGainR.gain.value = 0 - lfoGainL.gain.value;

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

},{"../utils/validify.js":28}],10:[function(_dereq_,module,exports){
'use strict';

var validify = _dereq_('../utils/validify.js').number;

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
    // set to defaults (needed in Firefox)
    node.setPosition(0, 0, 0);
    node.setOrientation(0, 0, 0);

    // simple vec3 object pool
    var vecPool = {
        pool: [],
        get: function(x, y, z) {
            var v = this.pool.length ? this.pool.pop() : { x: 0, y: 0, z: 0 };
            // check if a vector has been passed in
            if(x !== undefined && isNaN(x) && 'x' in x && 'y' in x && 'z' in x) {
                v.x = validify(x.x);
                v.y = validify(x.y);
                v.z = validify(x.z);
            }
            else {
                v.x = validify(x);
                v.y = validify(y);
                v.z = validify(z);
            }
            return v;
        },
        dispose: function(instance) {
            this.pool.push(instance);
        }
    };

    var globalUp = vecPool.get(0, 1, 0),
        angle45 = Math.PI / 4,
        angle90 = Math.PI / 2;

    // set the orientation of the source (where the audio is coming from)
    var setOrientation = function(node, fw) {
        // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
        var up = vecPool.get(fw.x, fw.y, fw.z);
        cross(up, globalUp);
        cross(up, fw);
        normalize(up);
        normalize(fw);
        // set the audio context's listener position to match the camera position
        node.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
        // return the vecs to the pool
        vecPool.dispose(fw);
        vecPool.dispose(up);
    };

    var setPosition = function(nodeOrListener, vec) {
        nodeOrListener.setPosition(vec.x, vec.y, vec.z);
        vecPool.dispose(vec);
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

    node.set = function(x, y, z) {
        var v = vecPool.get(x, y, z);

        if(arguments.length === 1 && v.x) {
          // pan left to right with value from -1 to 1
          x = v.x;

          if(x > 1) { x = 1; }
          if(x < -1) { x = -1; }

          // creates a nice curve with z
          x = x * angle45;
          z = x + angle90;

          if (z > angle90) {
              z = Math.PI - z;
          }

          v.x = Math.sin(x);
          v.z = Math.sin(z);
        }
        setPosition(node, v);
    };

    // set the position the audio is coming from)
    node.setSourcePosition = function(x, y, z) {
        setPosition(node, vecPool.get(x, y, z));
    };

    // set the direction the audio is coming from)
    node.setSourceOrientation = function(x, y, z) {
        setOrientation(node, vecPool.get(x, y, z));
    };

    // set the position of who or what is hearing the audio (could be camera or some character)
    node.setListenerPosition = function(x, y, z) {
        setPosition(context.listener, vecPool.get(x, y, z));
    };

    // set the position of who or what is hearing the audio (could be camera or some character)
    node.setListenerOrientation = function(x, y, z) {
        setOrientation(context.listener, vecPool.get(x, y, z));
    };

    node.getDefaults = function() {
        return Panner.defaults;
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

},{"../utils/validify.js":28}],11:[function(_dereq_,module,exports){
'use strict';

var validify = _dereq_('../utils/validify.js').number;

function Phaser(context, config) {
    config = config || {};
    var stages = validify(config.stages, 8),
        filters = [],
        filter;

    var input = context.createGain();
    var feedback = context.createGain();
    var lfo = context.createOscillator();
    var lfoGain = context.createGain();
    var output = context.createGain();

    feedback.gain.value = validify(config.feedback, 0.5);

    lfo.type = 'sine';
    lfo.frequency.value = validify(config.frequency, 0.5);
    lfoGain.gain.value = validify(config.gain, 300);

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

},{"../utils/validify.js":28}],12:[function(_dereq_,module,exports){
'use strict';

function Recorder(context, passThrough) {
    var bufferLength = 4096,
        buffersL = [],
        buffersR = [],
        startedAt = 0,
        stoppedAt = 0;

    var input = context.createGain();
    var output = context.createGain();
    var script;

    var node = input;
    node.name = 'Recorder';
    node._output = output;

    node.isRecording = false;

    var getBuffer = function() {
        if(!buffersL.length) {
            return context.createBuffer(2, bufferLength, context.sampleRate);
        }
        var recordingLength = buffersL.length * bufferLength;
        var buffer = context.createBuffer(2, recordingLength, context.sampleRate);
        buffer.getChannelData(0).set(mergeBuffers(buffersL, recordingLength));
        buffer.getChannelData(1).set(mergeBuffers(buffersR, recordingLength));
        return buffer;
    };

    var mergeBuffers = function(buffers, length) {
        var buffer = new Float32Array(length);
        var offset = 0;
        for (var i = 0; i < buffers.length; i++) {
          buffer.set(buffers[i], offset);
          offset += buffers[i].length;
        }
        return buffer;
    };

    var createScriptProcessor = function() {
      destroyScriptProcessor();

      script = context.createScriptProcessor(bufferLength, 2, 2);
      input.connect(script);
      script.connect(context.destination);
      script.connect(output);

      script.onaudioprocess = function (event) {
          var inputL = event.inputBuffer.getChannelData(0),
              inputR = event.inputBuffer.getChannelData(1);

          if(passThrough) {
              var outputL = event.outputBuffer.getChannelData(0),
                  outputR = event.outputBuffer.getChannelData(1);
              outputL.set(inputL);
              outputR.set(inputR);
          }

          if(node.isRecording) {
              buffersL.push(new Float32Array(inputL));
              buffersR.push(new Float32Array(inputR));
          }
      };
    };

    var destroyScriptProcessor = function() {
      if (script) {
        script.onaudioprocess = null;
        input.disconnect();
        script.disconnect();
      }
    };

    node.start = function() {
        createScriptProcessor();
        buffersL.length = 0;
        buffersR.length = 0;
        startedAt = context.currentTime;
        stoppedAt = 0;
        this.isRecording = true;
    };

    node.stop = function() {
        stoppedAt = context.currentTime;
        this.isRecording = false;
        destroyScriptProcessor();
        return getBuffer();
    };

    node.getDuration = function() {
        if(!this.isRecording) {
            return stoppedAt - startedAt;
        }
        return context.currentTime - startedAt;
    };

    return node;
}

module.exports = Recorder;

},{}],13:[function(_dereq_,module,exports){
'use strict';

var validify = _dereq_('../utils/validify.js').number;

function Reverb(context, config) {
    config = config || {};

    var time = validify(config.time, 1),
        decay = validify(config.decay, 5),
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

    node.update = function(opt) {
        if(opt.time !== undefined) {
            time = opt.time;
            length = Math.floor(rate * time);
            impulseResponse = length ? context.createBuffer(2, length, rate) : null;
        }
        if(opt.decay !== undefined) {
            decay = opt.decay;
        }
        if(opt.reverse !== undefined) {
            reverse = opt.reverse;
        }

        if(!impulseResponse) {
          reverb.buffer = null;
          return;
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
                console.log.call(console, '1 set time:', value);
                if(value === time) { return; }
                this.update({time: value});
            }
        },
        decay: {
            get: function() { return decay; },
            set: function(value) {
                if(value === decay) { return; }
                this.update({decay: value});
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

},{"../utils/validify.js":28}],14:[function(_dereq_,module,exports){
'use strict';

var Effect = _dereq_('./effect.js');

function Group(context, destination) {
    var sounds = [],
        effect = new Effect(context),
        gain = effect.gain(),
        preMuteVolume = 1,
        api;

    if(context) {
        effect.setSource(gain);
        effect.setDestination(destination || context.destination);
    }

    /*
     * Add / remove
     */

    var add = function(sound) {
        sound.gain.disconnect();
        sound.gain.connect(gain);

        sounds.push(sound);

        sound.once('destroy', remove);
    };

    var find = function(soundOrId, callback) {
        var found;

        if(!soundOrId && soundOrId !== 0) {
            return found;
        }

        sounds.some(function(sound) {
            if(sound === soundOrId || sound.id === soundOrId) {
                found = sound;
                return true;
            }
        });

        if(found && callback) {
            callback(found);
        }

        return found;
    };

    var remove = function(soundOrId) {
        find(soundOrId, function(sound) {
            sounds.splice(sounds.indexOf(sound), 1);
        });
    };

    /*
     * Controls
     */

    var play = function(delay, offset) {
        sounds.forEach(function(sound) {
            sound.play(delay, offset);
        });
    };

    var pause = function() {
        sounds.forEach(function(sound) {
            if(sound.playing) {
                sound.pause();
            }
        });
    };

    var resume = function() {
        sounds.forEach(function(sound) {
            if(sound.paused) {
                sound.play();
            }
        });
    };

    var stop = function() {
        sounds.forEach(function(sound) {
            sound.stop();
        });
    };

    var seek = function(percent) {
        sounds.forEach(function(sound) {
            sound.seek(percent);
        });
    };

    var mute = function() {
        preMuteVolume = api.volume;
        api.volume = 0;
    };

    var unMute = function() {
        api.volume = preMuteVolume || 1;
    };

    var fade = function(volume, duration) {
        if(context) {
            var param = gain.gain;
            var time = context.currentTime;

            param.cancelScheduledValues(time);
            param.setValueAtTime(param.value, time);
            // param.setValueAtTime(volume, time + duration);
            param.linearRampToValueAtTime(volume, time + duration);
            // param.setTargetAtTime(volume, time, duration);
            // param.exponentialRampToValueAtTime(Math.max(volume, 0.0001), time + duration);
        }
        else {
            sounds.forEach(function(sound) {
                sound.fade(volume, duration);
            });
        }

        return this;
    };

    /*
     * Destroy
     */

    var destroy = function() {
        while(sounds.length) {
            sounds.pop().destroy();
        }
    };

    /*
     * Api
     */

    api = {
        add: add,
        find: find,
        remove: remove,
        play: play,
        pause: pause,
        resume: resume,
        stop: stop,
        seek: seek,
        mute: mute,
        unMute: unMute,
        fade: fade,
        destroy: destroy
    };

    /*
     * Getters & Setters
     */

    Object.defineProperties(api, {
        effect: {
            value: effect
        },
        gain: {
            value: gain
        },
        sounds: {
            value: sounds
        },
        volume: {
            get: function() {
                return gain.gain.value;
            },
            set: function(value) {
                if(isNaN(value)) { return; }

                if(context) {
                    gain.gain.cancelScheduledValues(context.currentTime);
                    gain.gain.value = value;
                    gain.gain.setValueAtTime(value, context.currentTime);
                }
                else {
                    gain.gain.value = value;
                }
                sounds.forEach(function(sound) {
                    if (!sound.context) {
                        sound.volume = value;
                    }
                });
            }
        }
    });

    return api;
    // return Object.freeze(api);
}

module.exports = Group;

},{"./effect.js":3}],15:[function(_dereq_,module,exports){
'use strict';

var BufferSource = _dereq_('./source/buffer-source.js'),
    Effect = _dereq_('./effect.js'),
    Emitter = _dereq_('./utils/emitter.js'),
    file = _dereq_('./utils/file.js'),
    Loader = _dereq_('./utils/loader.js'),
    MediaSource = _dereq_('./source/media-source.js'),
    MicrophoneSource = _dereq_('./source/microphone-source.js'),
    OscillatorSource = _dereq_('./source/oscillator-source.js'),
    ScriptSource = _dereq_('./source/script-source.js'),
    waveform = _dereq_('./utils/waveform.js')();

function Sound(context, destination) {
    var id,
        data,
        effect = new Effect(context),
        gain = effect.gain(),
        isTouchLocked = false,
        loader,
        loop = false,
        playbackRate = 1,
        playWhenReady,
        source,
        sound;

    if(context) {
        effect.setDestination(gain);
        gain.connect(destination || context.destination);
    }

    /*
     * Load
     */

    var load = function(config) {
        var src = file.getSupportedFile(config.src || config.url || config);

        if(source && data && data.tagName) {
            source.load(src);
        }
        else {
            loader = loader || new Loader(src);
            loader.audioContext = !!config.asMediaElement ? null : context;
            loader.isTouchLocked = isTouchLocked;
            loader.once('loaded', function(file) {
                createSource(file);
                sound.emit('loaded', sound);
            });
        }
        return sound;
    };

    /*
     * Controls
     */

    var play = function(delay, offset) {
        if(!source || isTouchLocked) {
            playWhenReady = function() {
                if (source) {
                    play(delay, offset);
                }
            };
            return sound;
        }
        playWhenReady = null;
        effect.setSource(source.sourceNode);

        // update volume needed for no webaudio
        if(!context) { sound.volume = gain.gain.value; }

        source.play(delay, offset);

        if(source.hasOwnProperty('loop')) {
            source.loop = loop;
        }

        sound.emit('play', sound);

        return sound;
    };

    var pause = function() {
        source && source.pause();
        sound.emit('pause', sound);
        return sound;
    };

    var stop = function() {
        source && source.stop();
        sound.emit('stop', sound);
        return sound;
    };

    var seek = function(percent) {
        if(source) {
            source.stop();
            play(0, source.duration * percent);
        }
        return sound;
    };

    var fade = function(volume, duration) {
        if(!source) { return sound; }

        if(context) {
            var  param = gain.gain;
            var time = context.currentTime;
            param.cancelScheduledValues(time);
            param.setValueAtTime(param.value, time);
            param.linearRampToValueAtTime(volume, time + duration);
        }
        else if(typeof source.fade === 'function') {
            source.fade(volume, duration);
        }

        return sound;
    };

    /*
     * Destroy
     */

    var destroy = function() {
        source && source.destroy();
        effect && effect.destroy();
        gain && gain.disconnect();
        loader && loader.destroy();
        sound.off('loaded');
        sound.off('ended');
        gain = null;
        context = null;
        data = null;
        playWhenReady = null;
        source = null;
        effect = null;
        loader = null;
        sound.emit('destroy', sound);
        sound.off('destroy');
    };

    /*
     * Create source
     */

    var createSource = function(value) {
        data = value;

        if(file.isAudioBuffer(data)) {
            source = new BufferSource(data, context, function() {
                sound.emit('ended');
            });
        }
        else if(file.isMediaElement(data)) {
            source = new MediaSource(data, context, function() {
                sound.emit('ended');
            });
        }
        else if(file.isMediaStream(data)) {
            source = new MicrophoneSource(data, context);
        }
        else if(file.isOscillatorType((data && data.type) || data)) {
            source = new OscillatorSource(data.type || data, context);
        }
        else if(file.isScriptConfig(data)) {
            source = new ScriptSource(data, context);
        }
        else {
            throw new Error('Cannot detect data type: ' + data);
        }

        effect.setSource(source.sourceNode);

        sound.emit('ready', sound);

        if(playWhenReady) {
            playWhenReady();
        }
    };

    sound = Object.create(Emitter.prototype, {
        _events: {
            value: {}
        },
        constructor: {
            value: Sound
        },
        play: {
            value: play
        },
        pause: {
            value: pause
        },
        load: {
            value: load
        },
        seek: {
            value: seek
        },
        stop: {
            value: stop
        },
        fade: {
            value: fade
        },
        destroy: {
            value: destroy
        },
        context: {
            value: context
        },
        currentTime: {
            get: function() {
                return source ? source.currentTime : 0;
            },
            set: function(value) {
                // var silent = sound.playing;
                source && source.stop();
                // play(0, value, silent);
                play(0, value);
            }
        },
        data: {
            get: function() {
                return data;
            },
            set : function(value) {
                if(!value) { return; }
                createSource(value);
            }
        },
        duration: {
            get: function() {
                return source ? source.duration : 0;
            }
        },
        effect: {
            value: effect
        },
        ended: {
            get: function() {
                return !!source && source.ended;
            }
        },
        frequency: {
            get: function() {
                return source ? source.frequency : 0;
            },
            set: function(value) {
                if(source && source.hasOwnProperty('frequency')) {
                    source.frequency = value;
                }
            }
        },
        gain: {
            value: gain
        },
        id: {
            get: function() {
                return id;
            },
            set: function(value) {
                id = value;
            }
        },
        isTouchLocked: {
            set: function(value) {
                isTouchLocked = value;
                if(loader) {
                    loader.isTouchLocked = value;
                }
                if(!value && playWhenReady) {
                    playWhenReady();
                }
            }
        },
        loader: {
            get: function() {
                return loader;
            }
        },
        loop: {
            get: function() {
                return loop;
            },
            set: function(value) {
                loop = !!value;

                if(source && source.hasOwnProperty('loop') && source.loop !== loop) {
                  source.loop = loop;
                }
            }
        },
        paused: {
            get: function() {
                return !!source && source.paused;
            }
        },
        playing: {
            get: function() {
                return !!source && source.playing;
            }
        },
        playbackRate: {
            get: function() {
                return playbackRate;
            },
            set: function(value) {
                playbackRate = value;
                if(source) {
                  source.playbackRate = playbackRate;
                }
            }
        },
        progress: {
            get: function() {
                return source ? source.progress : 0;
            }
        },
        volume: {
            get: function() {
                if(context) {
                    return gain.gain.value;
                }
                if(source && source.hasOwnProperty('volume')) {
                    return source.volume;
                }
                return 1;
            },
            set: function(value) {
                if(isNaN(value)) { return; }

                var param = gain.gain;

                if(context) {
                    var time = context.currentTime;
                    param.cancelScheduledValues(time);
                    param.value = value;
                    param.setValueAtTime(value, time);
                }
                else {
                    param.value = value;

                    if(source && source.hasOwnProperty('volume')) {
                        source.volume = value;
                    }
                }
            }
        },
        waveform: {
            value: function(length) {
                if(!data) {
                    sound.once('ready', function() {
                        waveform(data, length);
                    });
                }
                return waveform(data, length);
            }
        }
    });

    return Object.freeze(sound);
}

module.exports = Sound;

},{"./effect.js":3,"./source/buffer-source.js":16,"./source/media-source.js":17,"./source/microphone-source.js":18,"./source/oscillator-source.js":19,"./source/script-source.js":20,"./utils/emitter.js":22,"./utils/file.js":23,"./utils/loader.js":24,"./utils/waveform.js":29}],16:[function(_dereq_,module,exports){
'use strict';

function BufferSource(buffer, context, onEnded) {
    var ended = false,
        endedCallback = onEnded,
        loop = false,
        paused = false,
        pausedAt = 0,
        playbackRate = 1,
        playing = false,
        sourceNode = null,
        startedAt = 0,
        api = {};

    var createSourceNode = function() {
        if(!sourceNode && context) {
            sourceNode = context.createBufferSource();
            sourceNode.buffer = buffer;
        }
        return sourceNode;
    };

    /*
     * Controls
     */

    var play = function(delay, offset) {
        if(playing) { return; }

        delay = delay ? context.currentTime + delay : 0;
        offset = offset || 0;
        if(offset) { pausedAt = 0; }
        if(pausedAt) { offset = pausedAt; }
        while(offset > api.duration) { offset = offset % api.duration; }

        createSourceNode();
        sourceNode.onended = endedHandler;
        sourceNode.start(delay, offset);

        sourceNode.loop = loop;
        sourceNode.playbackRate.value = playbackRate;

        startedAt = context.currentTime - offset;
        ended = false;
        paused = false;
        pausedAt = 0;
        playing = true;
    };

    var pause = function() {
        var elapsed = context.currentTime - startedAt;
        stop();
        pausedAt = elapsed;
        playing = false;
        paused = true;
    };

    var stop = function() {
        if(sourceNode) {
            sourceNode.onended = null;
            try {
                sourceNode.disconnect();
                sourceNode.stop(0);
            } catch(e) {}
            sourceNode = null;
        }

        paused = false;
        pausedAt = 0;
        playing = false;
        startedAt = 0;
    };

    /*
     * Ended handler
     */

    var endedHandler = function() {
        stop();
        ended = true;
        if(typeof endedCallback === 'function') {
            endedCallback(api);
        }
    };

    /*
     * Destroy
     */

    var destroy = function() {
        stop();
        buffer = null;
        context = null;
        endedCallback = null;
        sourceNode = null;
    };

    /*
     * Getters & Setters
     */

    Object.defineProperties(api, {
        play: {
            value: play
        },
        pause: {
            value: pause
        },
        stop: {
            value: stop
        },
        destroy: {
            value: destroy
        },
        currentTime: {
            get: function() {
                if(pausedAt) {
                    return pausedAt;
                }
                if(startedAt) {
                    var time = context.currentTime - startedAt;
                    if(time > api.duration) {
                        time = time % api.duration;
                    }
                    return time;
                }
                return 0;
            }
        },
        duration: {
            get: function() {
                return buffer ? buffer.duration : 0;
            }
        },
        ended: {
            get: function() {
                return ended;
            }
        },
        loop: {
            get: function() {
                return loop;
            },
            set: function(value) {
                loop = !!value;
                if(sourceNode) {
                    sourceNode.loop = loop;
                }
            }
        },
        paused: {
            get: function() {
                return paused;
            }
        },
        playbackRate: {
            get: function() {
                return playbackRate;
            },
            set: function(value) {
                playbackRate = value;
                if(sourceNode) {
                    sourceNode.playbackRate.value = playbackRate;
                }
            }
        },
        playing: {
            get: function() {
                return playing;
            }
        },
        progress: {
            get: function() {
                return api.duration ? api.currentTime / api.duration : 0;
            }
        },
        sourceNode: {
            get: function() {
                return createSourceNode();
            }
        }
    });

    return Object.freeze(api);
}

module.exports = BufferSource;

},{}],17:[function(_dereq_,module,exports){
'use strict';

function MediaSource(el, context, onEnded) {
    var ended = false,
        endedCallback = onEnded,
        delayTimeout,
        fadeTimeout,
        loop = false,
        paused = false,
        playbackRate = 1,
        playing = false,
        sourceNode = null,
        api = {};

    var createSourceNode = function() {
        if(!sourceNode && context) {
            sourceNode = context.createMediaElementSource(el);
        }
        return sourceNode;
    };

    /*
     * Load
     */

    var load = function(url) {
        el.src = url;
        el.load();
        ended = false;
        paused = false;
        playing = false;
    };

    /*
     * Controls
     */

    var play = function(delay, offset) {
        clearTimeout(delayTimeout);

        el.playbackRate = playbackRate;

        if(offset) {
            el.currentTime = offset;
        }

        if(delay) {
            delayTimeout = setTimeout(play, delay);
        }
        else {
            // el.load();
            el.play();
        }

        ended = false;
        paused = false;
        playing = true;

        el.removeEventListener('ended', endedHandler);
        el.addEventListener('ended', endedHandler, false);

        if(el.readyState < 4) {
            el.removeEventListener('canplaythrough', readyHandler);
            el.addEventListener('canplaythrough', readyHandler, false);
            el.load();
            el.play();
        }
    };

    var readyHandler = function() {
        el.removeEventListener('canplaythrough', readyHandler);
        if(playing) {
            el.play();
        }
    };

    var pause = function() {
        clearTimeout(delayTimeout);

        if(!el) { return; }

        el.pause();
        playing = false;
        paused = true;
    };

    var stop = function() {
        clearTimeout(delayTimeout);

        if(!el) { return; }

        el.pause();

        try {
            el.currentTime = 0;
            // fixes bug where server doesn't support seek:
            if(el.currentTime > 0) { el.load(); }
        } catch(e) {}

        playing = false;
        paused = false;
    };

    /*
     * Fade for no webaudio
     */

    var fade = function(volume, duration) {
        if(!el) { return api; }
        if(context) { return api; }

        function ramp(value, step) {
            fadeTimeout = setTimeout(function() {
                el.volume = el.volume + ( value - el.volume ) * 0.2;
                if(Math.abs(el.volume - value) > 0.05) {
                    return ramp(value, step);
                }
                el.volume = value;
            }, step * 1000);
        }

        window.clearTimeout(fadeTimeout);
        ramp(volume, duration / 10);

        return api;
    };

    /*
     * Ended handler
     */

    var endedHandler = function() {
        ended = true;
        paused = false;
        playing = false;

        if(loop) {
            el.currentTime = 0;
            // fixes bug where server doesn't support seek:
            if(el.currentTime > 0) { el.load(); }
            play();
        } else if(typeof endedCallback === 'function') {
            endedCallback(api);
        }
    };

    /*
     * Destroy
     */

    var destroy = function() {
        el.removeEventListener('ended', endedHandler);
        el.removeEventListener('canplaythrough', readyHandler);
        stop();
        el = null;
        context = null;
        endedCallback = null;
        sourceNode = null;
    };

    /*
     * Getters & Setters
     */

    Object.defineProperties(api, {
        play: {
            value: play
        },
        pause: {
            value: pause
        },
        stop: {
            value: stop
        },
        load: {
            value: load
        },
        fade: {
            value: fade
        },
        destroy: {
            value: destroy
        },
        currentTime: {
            get: function() {
                return el ? el.currentTime : 0;
            }
        },
        duration: {
            get: function() {
                return el ? el.duration : 0;
            }
        },
        ended: {
            get: function() {
                return ended;
            }
        },
        loop: {
            get: function() {
                return loop;
            },
            set: function(value) {
                loop = !!value;
            }
        },
        paused: {
            get: function() {
                return paused;
            }
        },
        playbackRate: {
            get: function() {
                return playbackRate;
            },
            set: function(value) {
                playbackRate = value;
                if(el) {
                    el.playbackRate = playbackRate;
                }
            }
        },
        playing: {
            get: function() {
                return playing;
            }
        },
        progress: {
            get: function() {
                return el && el.duration ? el.currentTime / el.duration : 0;
            }
        },
        sourceNode: {
            get: function() {
                return createSourceNode();
            }
        },
        volume: {
            get: function() {
                return el ? el.volume : 1;
            },
            set: function(value) {
                window.clearTimeout(fadeTimeout);
                if(el) {
                    el.volume = value;
                }
            }
        }
    });

    return Object.freeze(api);
}

module.exports = MediaSource;

},{}],18:[function(_dereq_,module,exports){
'use strict';

function MicrophoneSource(stream, context) {
    var ended = false,
        paused = false,
        pausedAt = 0,
        playing = false,
        sourceNode = null, // MicrophoneSourceNode
        startedAt = 0;

    var createSourceNode = function() {
        if(!sourceNode && context) {
            sourceNode = context.createMediaStreamSource(stream);
            // HACK: stops moz garbage collection killing the stream
            // see https://support.mozilla.org/en-US/questions/984179
            if(navigator.mozGetUserMedia) {
                window.mozHack = sourceNode;
            }
        }
        return sourceNode;
    };

    /*
     * Controls
     */

    var play = function(delay) {
        delay = delay ? context.currentTime + delay : 0;

        createSourceNode();
        sourceNode.start(delay);

        startedAt = context.currentTime - pausedAt;
        ended = false;
        playing = true;
        paused = false;
        pausedAt = 0;
    };

    var pause = function() {
        var elapsed = context.currentTime - startedAt;
        stop();
        pausedAt = elapsed;
        playing = false;
        paused = true;
    };

    var stop = function() {
        if(sourceNode) {
            try {
                sourceNode.stop(0);
            } catch(e) {}
            sourceNode = null;
        }
        ended = true;
        paused = false;
        pausedAt = 0;
        playing = false;
        startedAt = 0;
    };

    /*
     * Destroy
     */

    var destroy = function() {
        stop();
        context = null;
        sourceNode = null;
        stream = null;
        window.mozHack = null;
    };

    /*
     * Api
     */

    var api = {
        play: play,
        pause: pause,
        stop: stop,
        destroy: destroy,

        duration: 0,
        progress: 0
    };

    /*
     * Getters & Setters
     */

    Object.defineProperties(api, {
        currentTime: {
            get: function() {
                if(pausedAt) {
                    return pausedAt;
                }
                if(startedAt) {
                    return context.currentTime - startedAt;
                }
                return 0;
            }
        },
        ended: {
            get: function() {
                return ended;
            }
        },
        paused: {
            get: function() {
                return paused;
            }
        },
        playing: {
            get: function() {
                return playing;
            }
        },
        sourceNode: {
            get: function() {
                return createSourceNode();
            }
        }
    });

    return Object.freeze(api);
}

module.exports = MicrophoneSource;

},{}],19:[function(_dereq_,module,exports){
'use strict';

function OscillatorSource(type, context) {
    var ended = false,
        paused = false,
        pausedAt = 0,
        playing = false,
        sourceNode = null, // OscillatorSourceNode
        startedAt = 0,
        frequency = 200,
        api;

    var createSourceNode = function() {
        if(!sourceNode && context) {
            sourceNode = context.createOscillator();
            sourceNode.type = type;
            sourceNode.frequency.value = frequency;
        }
        return sourceNode;
    };

    /*
     * Controls
     */

    var play = function(delay) {
        delay = delay || 0;
        if(delay) { delay = context.currentTime + delay; }

        createSourceNode();
        sourceNode.start(delay);

        if(pausedAt) {
            startedAt = context.currentTime - pausedAt;
        }
        else {
            startedAt = context.currentTime;
        }

        ended = false;
        playing = true;
        paused = false;
        pausedAt = 0;
    };

    var pause = function() {
        var elapsed = context.currentTime - startedAt;
        this.stop();
        pausedAt = elapsed;
        playing = false;
        paused = true;
    };

    var stop = function() {
        if(sourceNode) {
            try {
                sourceNode.stop(0);
            } catch(e) {}
            sourceNode = null;
        }
        ended = true;
        paused = false;
        pausedAt = 0;
        playing = false;
        startedAt = 0;
    };

    /*
     * Destroy
     */

    var destroy = function() {
        this.stop();
        context = null;
        sourceNode = null;
    };

    /*
     * Api
     */

    api = {
        play: play,
        pause: pause,
        stop: stop,
        destroy: destroy
    };

    /*
     * Getters & Setters
     */

    Object.defineProperties(api, {
        currentTime: {
            get: function() {
                if(pausedAt) {
                    return pausedAt;
                }
                if(startedAt) {
                    return context.currentTime - startedAt;
                }
                return 0;
            }
        },
        duration: {
            value: 0
        },
        ended: {
            get: function() {
                return ended;
            }
        },
        frequency: {
            get: function() {
                return frequency;
            },
            set: function(value) {
                frequency = value;
                if(sourceNode) {
                    sourceNode.frequency.value = value;
                }
            }
        },
        paused: {
            get: function() {
                return paused;
            }
        },
        playing: {
            get: function() {
                return playing;
            }
        },
        progress: {
            value: 0
        },
        sourceNode: {
            get: function() {
                return createSourceNode();
            }
        }
    });

    return Object.freeze(api);
}

module.exports = OscillatorSource;

},{}],20:[function(_dereq_,module,exports){
'use strict';

function ScriptSource(data, context) {
    var bufferSize = data.bufferSize || 1024,
        channels = data.channels || 1,
        ended = false,
        onProcess = data.callback.bind(data.thisArg || this),
        paused = false,
        pausedAt = 0,
        playing = false,
        sourceNode = null, // ScriptSourceNode
        startedAt = 0,
        api;

    var createSourceNode = function() {
        if(!sourceNode && context) {
            sourceNode = context.createScriptProcessor(bufferSize, 0, channels);
        }
        return sourceNode;
    };

    /*
     * Controls
     */

    var play = function(delay) {
        delay = delay ? context.currentTime + delay : 0;

        createSourceNode();
        sourceNode.onaudioprocess = onProcess;

        startedAt = context.currentTime - pausedAt;
        ended = false;
        paused = false;
        pausedAt = 0;
        playing = true;
    };

    var pause = function() {
        var elapsed = context.currentTime - startedAt;
        this.stop();
        pausedAt = elapsed;
        playing = false;
        paused = true;
    };

    var stop = function() {
        if(sourceNode) {
            sourceNode.onaudioprocess = onPaused;
        }
        ended = true;
        paused = false;
        pausedAt = 0;
        playing = false;
        startedAt = 0;
    };

    var onPaused = function(event) {
        var buffer = event.outputBuffer;
        for (var i = 0; i < buffer.numberOfChannels; i++) {
            var channel = buffer.getChannelData(i);
            for (var j = 0; j < channel.length; j++) {
                channel[j] = 0;
            }
        }
    };

    /*
     * Destroy
     */

    var destroy = function() {
        this.stop();
        context = null;
        onProcess = null;
        sourceNode = null;
    };

    /*
     * Api
     */

    api = {
        play: play,
        pause: pause,
        stop: stop,
        destroy: destroy,

        duration: 0,
        progress: 0
    };

    /*
     * Getters & Setters
     */

    Object.defineProperties(api, {
        currentTime: {
            get: function() {
                if(pausedAt) {
                    return pausedAt;
                }
                if(startedAt) {
                    return context.currentTime - startedAt;
                }
                return 0;
            }
        },
        ended: {
            get: function() {
                return ended;
            }
        },
        paused: {
            get: function() {
                return paused;
            }
        },
        playing: {
            get: function() {
                return playing;
            }
        },
        sourceNode: {
            get: function() {
                return createSourceNode();
            }
        }
    });

    return Object.freeze(api);
}

module.exports = ScriptSource;

},{}],21:[function(_dereq_,module,exports){
'use strict';

var browser = {};

browser.handlePageVisibility = function(onHidden, onShown) {
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

browser.handleTouchLock = function(context, onUnlock) {
    var ua = navigator.userAgent,
        locked = !!ua.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|SymbianOS/i);

    var unlock = function() {
        document.body.removeEventListener('touchstart', unlock);

        if(context) {
            var buffer = context.createBuffer(1, 1, 22050);
            var source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            source.start(0);
            source.disconnect();
        }

        onUnlock();
    };

    if(locked) {
        document.body.addEventListener('touchstart', unlock, false);
    }
    return locked;
};

module.exports = browser;

},{}],22:[function(_dereq_,module,exports){
'use strict';

var EventEmitter = _dereq_('events').EventEmitter;

function Emitter() {
    EventEmitter.call(this);
    this.setMaxListeners(20);
}

Emitter.prototype = Object.create(EventEmitter.prototype);
Emitter.prototype.constructor = Emitter;

Emitter.prototype.off = function(type, listener) {
    if (listener) {
        return this.removeListener(type, listener);
    }
    if (type) {
        return this.removeAllListeners(type);
    }
    return this.removeAllListeners();
};

module.exports = Emitter;

},{"events":2}],23:[function(_dereq_,module,exports){
'use strict';

var File = {
    extensions: [],
    canPlay: {}
};

/*
 * Initial tests
 */

var tests = [
    { ext: 'ogg', type: 'audio/ogg; codecs="vorbis"' },
    { ext: 'mp3', type: 'audio/mpeg;' },
    { ext: 'opus', type: 'audio/ogg; codecs="opus"' },
    { ext: 'wav', type: 'audio/wav; codecs="1"' },
    { ext: 'm4a', type: 'audio/x-m4a;' },
    { ext: 'm4a', type: 'audio/aac;' }
];

var el = document.createElement('audio');
if(el) {
    tests.forEach(function(test) {
        var canPlayType = !!el.canPlayType(test.type);
        if(canPlayType) {
            File.extensions.push(test.ext);
        }
        File.canPlay[test.ext] = canPlayType;
    });
    el = null;
}

/*
 * find a supported file
 */

File.getFileExtension = function(url) {
    // from DataURL
    if(url.slice(0, 5) === 'data:') {
        var match = url.match(/data:audio\/(ogg|mp3|opus|wav|m4a)/i);
        if(match && match.length > 1) {
            return match[1].toLowerCase();
        }
    }
    // from Standard URL
    url = url.split('?')[0];
    url = url.slice(url.lastIndexOf('/') + 1);

    var a = url.split('.');
    if(a.length === 1 || (a[0] === '' && a.length === 2)) {
        return '';
    }
    return a.pop().toLowerCase();
};

File.getSupportedFile = function(fileNames) {
    var name;

    if(Array.isArray(fileNames)) {
        // if array get the first one that works
        fileNames.some(function(item) {
            name = item;
            var ext = this.getFileExtension(item);
            return this.extensions.indexOf(ext) > -1;
        }, this);
    }
    else if(typeof fileNames === 'object') {
        // if not array and is object
        Object.keys(fileNames).some(function(key) {
            name = fileNames[key];
            var ext = this.getFileExtension(name);
            return this.extensions.indexOf(ext) > -1;
        }, this);
    }
    // if string just return
    return name || fileNames;
};

/*
 * infer file types
 */

File.isAudioBuffer = function(data) {
    return !!(data &&
              window.AudioBuffer &&
              data instanceof window.AudioBuffer);
};

File.isMediaElement = function(data) {
    return !!(data &&
              window.HTMLMediaElement &&
              data instanceof window.HTMLMediaElement);
};

File.isMediaStream = function(data) {
    return !!(data &&
              typeof data.getAudioTracks === 'function' &&
              data.getAudioTracks().length &&
              window.MediaStreamTrack &&
              data.getAudioTracks()[0] instanceof window.MediaStreamTrack);
};

File.isOscillatorType = function(data) {
    return !!(data && typeof data === 'string' &&
             (data === 'sine' || data === 'square' ||
              data === 'sawtooth' || data === 'triangle'));
};

File.isScriptConfig = function(data) {
    return !!(data && typeof data === 'object' &&
              data.bufferSize && data.channels && data.callback);
};

File.isURL = function(data) {
    return !!(data && typeof data === 'string' &&
             (data.indexOf('.') > -1 || data.slice(0, 5) === 'data:'));
};

File.containsURL = function(config) {
    if(!config || this.isMediaElement(config)) { return false; }
    // string, array or object with src property that is string or array
    var src = config.src || config.url || config;
    return this.isURL(src) || (Array.isArray(src) && this.isURL(src[0]));
};

module.exports = File;

},{}],24:[function(_dereq_,module,exports){
'use strict';

var Emitter = _dereq_('./emitter.js');

function Loader(url) {
    var emitter = new Emitter(),
        progress = 0,
        audioContext,
        isTouchLocked,
        request,
        timeout,
        data,
        ERROR_STATE = ['', 'ABORTED', 'NETWORK', 'DECODE', 'SRC_NOT_SUPPORTED'];

    var start = function() {
        if(audioContext) {
            loadArrayBuffer();
        } else {
            loadAudioElement();
        }
    };

    var dispatchComplete = function(buffer) {
        emitter.emit('progress', 1);
        emitter.emit('loaded', buffer);
        emitter.emit('complete', buffer);

        removeListeners();
    };

    // audio buffer

    var loadArrayBuffer = function() {
        request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.addEventListener('progress', progressHandler);
        request.addEventListener('load', loadHandler);
        request.addEventListener('error', errorHandler);
        request.send();
    };

    var progressHandler = function(event) {
        if (event.lengthComputable) {
            progress = event.loaded / event.total;
            emitter.emit('progress', progress);
        }
    };

    var loadHandler = function() {
        audioContext.decodeAudioData(
            request.response,
            function(buffer) {
                data = buffer;
                request = null;
                progress = 1;
                dispatchComplete(buffer);
            },
            function(e) {
                emitter.emit('error', e);
            }
        );
    };

    // audio element

    var loadAudioElement = function() {
        if(!data || !data.tagName) {
            data = document.createElement('audio');
        }

        if(!isTouchLocked) {
            // timeout because sometimes canplaythrough doesn't fire
            window.clearTimeout(timeout);
            timeout = window.setTimeout(readyHandler, 2000);
            data.addEventListener('canplaythrough', readyHandler, false);
        }

        data.addEventListener('error', errorHandler, false);
        data.preload = 'auto';
        data.src = url;
        data.load();

        if (isTouchLocked) {
            dispatchComplete(data);
        }
    };

    var readyHandler = function() {
        window.clearTimeout(timeout);
        if(!data) { return; }
        progress = 1;
        dispatchComplete(data);
    };

    // error

    var errorHandler = function(event) {
        window.clearTimeout(timeout);
        // emitter.emit('error', (data && data.error));

        var message = event;

        if(data && data.error) {
            message = 'Media Error: ' + ERROR_STATE[data.error.code] + ' ' + url;
        }

        if(request) {
            message = 'XHR Error: code ' + (request.statusText || request.status) + ' ' + url;
        }

        emitter.emit('error', message);

        removeListeners();
    };

    // clean up

    var removeListeners = function() {
        emitter.off('error');
        emitter.off('progress');
        emitter.off('complete');
        emitter.off('loaded');

        if(data && typeof data.removeEventListener === 'function') {
            data.removeEventListener('canplaythrough', readyHandler);
            data.removeEventListener('error', errorHandler);
        }

        if(request) {
            request.removeEventListener('progress', progressHandler);
            request.removeEventListener('load', loadHandler);
            request.removeEventListener('error', errorHandler);
        }
    };

    var cancel = function() {
        removeListeners();

        if(request && request.readyState !== 4) {
          request.abort();
        }
        request = null;

        window.clearTimeout(timeout);
    };

    var destroy = function() {
        cancel();
        request = null;
        data = null;
        audioContext = null;
    };

    // reload

    var load = function(newUrl) {
        url = newUrl;
        start();
    };

    var api = {
        on: emitter.on.bind(emitter),
        once: emitter.once.bind(emitter),
        off: emitter.off.bind(emitter),
        load: load,
        start: start,
        cancel: cancel,
        destroy: destroy
    };

    Object.defineProperties(api, {
        data: {
            get: function() {
                return data;
            }
        },
        progress: {
            get: function() {
                return progress;
            }
        },
        audioContext: {
            set: function(value) {
                audioContext = value;
            }
        },
        isTouchLocked: {
            set: function(value) {
                isTouchLocked = value;
            }
        }
    });

    return Object.freeze(api);
}

Loader.Group = function() {
    var emitter = new Emitter(),
        queue = [],
        numLoaded = 0,
        numTotal = 0,
        loader;

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
            loader = null;
            emitter.emit('complete');
            return;
        }

        loader = queue.pop();
        loader.on('progress', progressHandler);
        loader.once('loaded', completeHandler);
        loader.once('error', errorHandler);
        loader.start();
    };

    var progressHandler = function(progress) {
        var loaded = numLoaded + progress;
        emitter.emit('progress', loaded / numTotal);
    };

    var completeHandler = function() {
        numLoaded++;
        removeListeners();
        emitter.emit('progress', numLoaded / numTotal);
        next();
    };

    var errorHandler = function(e) {
        console.error.call(console, e);
        removeListeners();
        emitter.emit('error', e);
        next();
    };

    var removeListeners = function() {
        loader.off('progress', progressHandler);
        loader.off('loaded', completeHandler);
        loader.off('error', errorHandler);
    };

    return Object.freeze({
        on: emitter.on.bind(emitter),
        once: emitter.once.bind(emitter),
        off: emitter.off.bind(emitter),
        add: add,
        start: start
    });
};

module.exports = Loader;

},{"./emitter.js":22}],25:[function(_dereq_,module,exports){
'use strict';

function Microphone(connected, denied, error) {
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    error = error || function() {};

    var isSupported = !!navigator.getUserMedia,
        stream = null,
        api = {};

    var connect = function() {
        if(!isSupported) { return; }

        navigator.getUserMedia({audio:true}, function(micStream) {
            stream = micStream;
            connected(stream);
        }, function(e) {
            if(denied && e.name === 'PermissionDeniedError' || e === 'PERMISSION_DENIED') {
                // console.log('Permission denied. Reset by clicking the camera icon with the red cross in the address bar');
                denied();
            }
            else {
                error(e.message || e);
            }
        });
        return api;
    };

    var disconnect = function() {
        if(stream) {
            stream.stop();
            stream = null;
        }
        return api;
    };

    Object.defineProperties(api, {
        connect: {
            value: connect
        },
        disconnect: {
            value: disconnect
        },
        isSupported: {
            value: isSupported
        },
        stream: {
            get: function() {
                return stream;
            }
        }
    });

    return Object.freeze(api);
}


module.exports = Microphone;

},{}],26:[function(_dereq_,module,exports){
'use strict';

var Group = _dereq_('../group.js');

function SoundGroup(context, destination) {
    var api = new Group(context, destination),
        sounds = api.sounds,
        playbackRate = 1,
        loop = false,
        src;

    var getSource = function() {
        if(!sounds.length) { return; }

        sounds.sort(function(a, b) {
            return b.duration - a.duration;
        });

        src = sounds[0];
    };

    var add = api.add;
    api.add = function(sound) {
        add(sound);
        getSource();
        return api;
    };

    var remove = api.rmeove;
    api.remove = function(soundOrId) {
        remove(soundOrId);
        getSource();
        return api;
    };

    Object.defineProperties(api, {
        currentTime: {
            get: function() {
                return src ? src.currentTime : 0;
            },
            set: function(value) {
                this.stop();
                this.play(0, value);
            }
        },
        duration: {
            get: function() {
                return src ? src.duration : 0;
            }
        },
        // ended: {
        //     get: function() {
        //         return src ? src.ended : false;
        //     }
        // },
        loop: {
            get: function() {
                return loop;
            },
            set: function(value) {
                loop = !!value;
                sounds.forEach(function(sound) {
                    sound.loop = loop;
                });
            }
        },
        paused: {
            get: function() {
                // return src ? src.paused : false;
                return !!src && src.paused;
            }
        },
        progress: {
            get: function() {
                return src ? src.progress : 0;
            }
        },
        playbackRate: {
            get: function() {
                return playbackRate;
            },
            set: function(value) {
                playbackRate = value;
                sounds.forEach(function(sound) {
                    sound.playbackRate = playbackRate;
                });
            }
        },
        playing: {
            get: function() {
                // return src ? src.playing : false;
                return !!src && src.playing;
            }
        }
    });

    return api;

}

module.exports = SoundGroup;

},{"../group.js":14}],27:[function(_dereq_,module,exports){
'use strict';

var Microphone = _dereq_('./microphone.js');
var waveformer = _dereq_('./waveformer.js');

/*
 * audio audioContext
 */
var audioContext;

var setContext = function(value) {
    audioContext = value;
};

/*
 * clone audio buffer
 */

var cloneBuffer = function(buffer) {
    if(!audioContext) { return buffer; }

    var numChannels = buffer.numberOfChannels,
        cloned = audioContext.createBuffer(numChannels, buffer.length, buffer.sampleRate);
    for (var i = 0; i < numChannels; i++) {
        cloned.getChannelData(i).set(buffer.getChannelData(i));
    }
    return cloned;
};

/*
 * reverse audio buffer
 */

var reverseBuffer = function(buffer) {
    var numChannels = buffer.numberOfChannels;
    for (var i = 0; i < numChannels; i++) {
        Array.prototype.reverse.call(buffer.getChannelData(i));
    }
    return buffer;
};

/*
 * ramp audio param
 */

var ramp = function(param, fromValue, toValue, duration) {
    if(!audioContext) { return; }

    param.setValueAtTime(fromValue, audioContext.currentTime);
    param.linearRampToValueAtTime(toValue, audioContext.currentTime + duration);
};

/*
 * get frequency from min to max by passing 0 to 1
 */

var getFrequency = function(value) {
    if(!audioContext) { return 0; }
    // get frequency by passing number from 0 to 1
    // Clamp the frequency between the minimum value (40 Hz) and half of the
    // sampling rate.
    var minValue = 40;
    var maxValue = audioContext.sampleRate / 2;
    // Logarithm (base 2) to compute how many octaves fall in the range.
    var numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
    // Compute a multiplier from 0 to 1 based on an exponential scale.
    var multiplier = Math.pow(2, numberOfOctaves * (value - 1.0));
    // Get back to the frequency value between min and max.
    return maxValue * multiplier;
};

/*
 * microphone util
 */

var microphone = function(connected, denied, error) {
    return new Microphone(connected, denied, error);
};

/*
 * Format seconds as timecode string
 */

var timeCode = function(seconds, delim) {
    if(delim === undefined) { delim = ':'; }
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor((seconds % 3600) % 60);
    var hr = (h === 0 ? '' : (h < 10 ? '0' + h + delim : h + delim));
    var mn = (m < 10 ? '0' + m : m) + delim;
    var sc = (s < 10 ? '0' + s : s);
    return hr + mn + sc;
};

module.exports = Object.freeze({
    setContext: setContext,
    cloneBuffer: cloneBuffer,
    reverseBuffer: reverseBuffer,
    ramp: ramp,
    getFrequency: getFrequency,
    microphone: microphone,
    timeCode: timeCode,
    waveformer: waveformer
});

},{"./microphone.js":25,"./waveformer.js":30}],28:[function(_dereq_,module,exports){
'use strict';

module.exports = Object.freeze({
  number: function(value, defaultValue) {
    if(arguments.length < 2) { defaultValue = 0; }
    if(typeof value !== 'number' || isNaN(value)) { return defaultValue; }
    return value;
  }
});

},{}],29:[function(_dereq_,module,exports){
'use strict';

function waveform() {

    var buffer,
        wave;

    return function(audioBuffer, length) {
        if(!window.Float32Array || !window.AudioBuffer) { return []; }

        var sameBuffer = buffer === audioBuffer;
        var sameLength = wave && wave.length === length;
        if(sameBuffer && sameLength) { return wave; }

        //console.time('waveData');
        if(!wave || wave.length !== length) {
            wave = new Float32Array(length);
        }

        if(!audioBuffer) { return wave; }

        // cache for repeated calls
        buffer = audioBuffer;

        var chunk = Math.floor(buffer.length / length),
            resolution = 5, // 10
            incr = Math.max(Math.floor(chunk / resolution), 1),
            greatest = 0;

        for(var i = 0; i < buffer.numberOfChannels; i++) {
            // check each channel
            var channel = buffer.getChannelData(i);
            for(var j = 0; j < length; j++) {
                // get highest value within the chunk
                for(var k = j * chunk, l = k + chunk; k < l; k += incr) {
                    // select highest value from channels
                    var a = channel[k];
                    if(a < 0) { a = -a; }
                    if(a > wave[j]) {
                        wave[j] = a;
                    }
                    // update highest overall for scaling
                    if(a > greatest) {
                        greatest = a;
                    }
                }
            }
        }
        // scale up
        var scale = 1 / greatest;
        for(i = 0; i < wave.length; i++) {
            wave[i] *= scale;
        }
        //console.timeEnd('waveData');

        return wave;
    };
}

module.exports = waveform;

},{}],30:[function(_dereq_,module,exports){
'use strict';

var halfPI = Math.PI / 2;
var twoPI = Math.PI * 2;

module.exports = function waveformer(config) {

    var style = config.style || 'fill', // 'fill' or 'line'
        shape = config.shape || 'linear', // 'circular' or 'linear'
        color = config.color || 0,
        bgColor = config.bgColor,
        lineWidth = config.lineWidth || 1,
        percent = config.percent || 1,
        originX = config.x || 0,
        originY = config.y || 0,
        transform = config.transform,
        canvas = config.canvas,
        width = config.width || (canvas && canvas.width),
        height = config.height || (canvas && canvas.height),
        ctx, currentColor, waveform, length, i, value, x, y,
        radius, innerRadius, centerX, centerY;

    if(!canvas && !config.context) {
      canvas = document.createElement('canvas');
      width = width || canvas.width;
      height = height || canvas.height;
      canvas.width = height;
      canvas.height = height;
    }

    if(shape === 'circular') {
      radius = config.radius || Math.min(height / 2, width / 2),
      innerRadius = config.innerRadius || radius / 2;
      centerX = originX + width / 2;
      centerY = originY + height / 2;
    }

    ctx = config.context || canvas.getContext('2d');

    var clear = function() {
      if(bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(originX, originY, width, height);
      } else {
          ctx.clearRect(originX, originY, width, height);
      }

      ctx.lineWidth = lineWidth;

      currentColor = null;

      if(typeof color !== 'function') {
        ctx.strokeStyle = color;
        ctx.beginPath();
      }
    };

    var updateColor = function(position, length, value) {
      if(typeof color === 'function') {
        var newColor = color(position, length, value);
        if(newColor !== currentColor) {
          currentColor = newColor;
          ctx.stroke();
          ctx.strokeStyle = currentColor;
          ctx.beginPath();
        }
      }
    };

    var getValue = function(value) {
      if(typeof transform === 'function') {
        return transform(value);
      }
      return value;
    };

    var getWaveform = function(value, length) {
      if(value && typeof value.waveform === 'function') {
        return value.waveform(length);
      }
      if(value) {
        return value;
      }
      if(config.waveform) {
        return config.waveform;
      }
      if(config.sound) {
        return config.sound.waveform(length);
      }
      return null;
    };

    var update = function(wave) {

      clear();

      if(shape === 'circular') {

        waveform = getWaveform(wave, 360);
        length = Math.floor(waveform.length * percent);

        var step = twoPI / length,
            angle, magnitude, sine, cosine;

        for (i = 0; i < length; i++) {
          value = getValue(waveform[i]);
          updateColor(i, length, value);

          angle = i * step - halfPI;
          cosine = Math.cos(angle);
          sine = Math.sin(angle);

          if(style === 'fill') {
            x = centerX + innerRadius * cosine;
            y = centerY + innerRadius * sine;
            ctx.moveTo(x, y);
          }

          magnitude = innerRadius + (radius - innerRadius) * value;
          x = centerX + magnitude * cosine;
          y = centerY + magnitude * sine;

          if(style === 'line' && i === 0) {
            ctx.moveTo(x, y);
          }

          ctx.lineTo(x, y);
        }

        if(style === 'line') {
          ctx.closePath();
        }
      }
      else {

        waveform = getWaveform(wave, width);
        length = Math.min(waveform.length, width - lineWidth / 2);
        length = Math.floor(length * percent);

        for(i = 0; i < length; i++) {
          value = getValue(waveform[i]);
          updateColor(i, length, value);

          if(style === 'line' && i > 0) {
            ctx.lineTo(x, y);
          }

          x = originX + i;
          y = originY + height - Math.round(height * value);
          y = Math.floor(Math.min(y, originY + height - lineWidth / 2));

          if(style === 'fill') {
            ctx.moveTo(x, y);
            ctx.lineTo(x, originY + height);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    };

    update.canvas = canvas;

    if(config.waveform || config.sound) {
      update();
    }

    return update;
};

},{}]},{},[1])(1)
});
//# sourceMappingURL=sono.js.map
