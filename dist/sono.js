!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.Sono=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Browser = require('./lib/utils/browser.js'),
    File = require('./lib/utils/file.js'),
    Group = require('./lib/group.js'),
    Loader = require('./lib/utils/loader.js'),
    Sound = require('./lib/sound.js'),
    SoundGroup = require('./lib/utils/sound-group.js'),
    Utils = require('./lib/utils/utils.js');

function Sono() {
    this.VERSION = '0.0.6';

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    var context = window.AudioContext ? new window.AudioContext() : null;
    var destination = context ? context.destination : null;

    this._group = new Group(context, destination);
    this._gain = this._group.gain;
    this._sounds = this._group.sounds;
    this._context = context;

    Utils.setContext(context);
    this._handleTouchlock();
    this._handlePageVisibility();
}

/*
 * Create
 *
 * Accepted values for param config:
 * Object config e.g. { id:'foo', url:['foo.ogg', 'foo.mp3'] }
 * Array (of files e.g. ['foo.ogg', 'foo.mp3'])
 * ArrayBuffer
 * HTMLMediaElement
 * Filename string (e.g. 'foo.ogg')
 * Oscillator type string (i.e. 'sine', 'square', 'sawtooth', 'triangle')
 * ScriptProcessor config object (e.g. { bufferSize: 1024, channels: 1, callback: fn, thisArg: self })
 */

Sono.prototype.createSound = function(config) {
    // try to load if config contains URLs
    if(File.containsURL(config)) {
        return this.load(config);
    }
    // option to use simple audio el
    var context = (config && config.noWebAudio) ? null : this._context;
    // otherwise just return a new sound object
    var sound = new Sound(context, this._gain);
    sound.isTouchLocked = this._isTouchLocked;
    if(config) {
        sound.data = config.data || config;
        sound.id = config.id !== undefined ? config.id : '';
        sound.loop = !!config.loop;
        sound.volume = config.volume;
    }
    this._group.add(sound);

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
            sound.destroy();
            return true;
        }
    });
    return this;
};

Sono.prototype.destroyAll = function() {
    this._group.destroy();
    return this;
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
 * Create group
 */

Sono.prototype.createGroup = function(sounds) {
    var group = new SoundGroup(this._context, this._gain);
    if(sounds) {
        sounds.forEach(function(sound) {
            group.add(sound);
        });
    }
    return group;
};

/*
 * Loading
 */

Sono.prototype.load = function(config) {
    if(!config) {
        throw new Error('ArgumentException: Sono.load: param config is undefined');
    }

    var onProgress = config.onProgress,
        onComplete = config.onComplete,
        thisArg = config.thisArg || config.context || this,
        url = config.url || config,
        sound,
        loader;

    if(File.containsURL(url)) {
        sound = this._queue(config);
        loader = sound.loader;
    }
    else if(Array.isArray(url) && File.containsURL(url[0].url) ) {
        sound = [];
        loader = new Loader.Group();

        url.forEach(function(file) {
            sound.push(this._queue(file, loader));
        }, this);
    }
    else {
        return null;
    }

    if(onProgress) {
        loader.on('progress', function(progress) {
            onProgress.call(thisArg, progress);
        });
    }
    if(onComplete) {
        loader.once('complete', function() {
            loader.off('progress');
            onComplete.call(thisArg, sound);
        });
    }
    loader.start();

    return sound;
};

Sono.prototype._queue = function(config, group) {
    var context = (config && config.noWebAudio) ? null : this._context;
    var sound = new Sound(context, this._gain);
    sound.isTouchLocked = this._isTouchLocked;
    this._group.add(sound);

    sound.id = config.id !== undefined ? config.id : '';
    sound.loop = !!config.loop;
    sound.volume = config.volume;
    sound.load(config);

    if(group) { group.add(sound.loader); }

    return sound;
};

/*
 * Controls
 */

Sono.prototype.mute = function() {
    this._group.mute();
    return this;
};

Sono.prototype.unMute = function() {
    this._group.unMute();
    return this;
};

Object.defineProperty(Sono.prototype, 'volume', {
    get: function() {
        return this._group.volume;
    },
    set: function(value) {
        this._group.volume = value;
    }
});

Sono.prototype.fade = function(volume, duration) {
    this._group.fade(volume, duration);
    return this;
};

Sono.prototype.pauseAll = function() {
    this._group.pause();
    return this;
};

Sono.prototype.resumeAll = function() {
    this._group.resume();
    return this;
};

Sono.prototype.stopAll = function() {
    this._group.stop();
    return this;
};

Sono.prototype.play = function(id, delay, offset) {
    this.getSound(id).play(delay, offset);
    return this;
};

Sono.prototype.pause = function(id) {
    this.getSound(id).pause();
    return this;
};

Sono.prototype.stop = function(id) {
    this.getSound(id).stop();
    return this;
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
    this._isTouchLocked = Browser.handleTouchLock(onUnlock, this);
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

    Browser.handlePageVisibility(onHidden, onShown, this);
};

/*
 * Log version & device support info
 */

Sono.prototype.log = function() {
    var title = 'Sono ' + this.VERSION,
        info = 'Supported:' + this.isSupported +
               ' WebAudioAPI:' + this.hasWebAudio +
               ' TouchLocked:' + this._isTouchLocked +
               ' Extensions:' + File.extensions;

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

Object.defineProperties(Sono.prototype, {
    'canPlay': {
        get: function() {
            return File.canPlay;
        }
    },
    'context': {
        get: function() {
            return this._context;
        }
    },
    'effect': {
        get: function() {
            return this._group.effect;
        }
    },
    'extensions': {
        get: function() {
            return File.extensions;
        }
    },
    'hasWebAudio': {
        get: function() {
            return !!this._context;
        }
    },
    'isSupported': {
        get: function() {
            return File.extensions.length > 0;
        }
    },
    'gain': {
        get: function() {
            return this._gain;
        }
    },
    'sounds': {
        get: function() {
            return this._group.sounds.slice(0);
        }
    },
    'utils': {
        get: function() {
            return Utils;
        }
    }
});

/*
 * Exports
 */

module.exports = new Sono();

},{"./lib/group.js":14,"./lib/sound.js":15,"./lib/utils/browser.js":21,"./lib/utils/file.js":23,"./lib/utils/loader.js":24,"./lib/utils/sound-group.js":26,"./lib/utils/utils.js":27}],2:[function(require,module,exports){
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

Effect.prototype.destroy = function() {
    this._context = null;
    this._destination = null;
    this._nodeList = [];
    this._sourceNode = null;
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

// lowers the volume of the loudest parts of the signal and raises the volume of the softest parts
Effect.prototype.compressor = function(config) {
    config = config || {};

    var node = this._context.createDynamicsCompressor();

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
    // set to defaults (needed in Firefox)
    node.setPosition(0, 0, 0);
    node.setOrientation(0, 0, 0);

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
                void 0;
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

var Effect = require('./effect.js');

function Group(context, destination) {
    this._sounds = [];
    this._context = context;
    this._effect = new Effect(this._context);
    this._gain = this._effect.gain();
    if(this._context) {
        this._effect.setSource(this._gain);
        this._effect.setDestination(destination || this._context.destination);
    }
}

/*
 * Add / remove
 */

Group.prototype.add = function(sound) {
    sound.gain.disconnect();
    sound.gain.connect(this._gain);

    this._sounds.push(sound);
};

Group.prototype.remove = function(soundOrId) {
    this._sounds.some(function(sound, index, sounds) {
        if(sound === soundOrId || sound.id === soundOrId) {
            sounds.splice(index, 1);
            return true;
        }
    });
};

/*
 * Controls
 */

Group.prototype.play = function(delay, offset) {
    this._sounds.forEach(function(sound) {
        sound.play(delay, offset);
    });
};

Group.prototype.pause = function() {
    this._sounds.forEach(function(sound) {
        if(sound.playing) {
            sound.pause();
        }
    });
};

Group.prototype.resume = function() {
    this._sounds.forEach(function(sound) {
        if(sound.paused) {
            sound.play();
        }
    });
};

Group.prototype.stop = function() {
    this._sounds.forEach(function(sound) {
        sound.stop();
    });
};

Group.prototype.seek = function(percent) {
    this._sounds.forEach(function(sound) {
        sound.seek(percent);
    });
};

Group.prototype.mute = function() {
    this._preMuteVolume = this.volume;
    this.volume = 0;
};

Group.prototype.unMute = function() {
    this.volume = this._preMuteVolume || 1;
};

Object.defineProperty(Group.prototype, 'volume', {
    get: function() {
        return this._gain.gain.value;
    },
    set: function(value) {
        if(isNaN(value)) { return; }

        if(this._context) {
            this._gain.gain.cancelScheduledValues(this._context.currentTime);
            this._gain.gain.value = value;
            this._gain.gain.setValueAtTime(value, this._context.currentTime);
        }
        else {
            this._gain.gain.value = value;
        }
        this._sounds.forEach(function(sound) {
            if (!sound.context) {
                sound.volume = value;
            }
        });
    }
});

Group.prototype.fade = function(volume, duration) {
    if(this._context) {
        var param = this._gain.gain;
        var time = this._context.currentTime;

        param.cancelScheduledValues(time);
        param.setValueAtTime(param.value, time);
        // param.setValueAtTime(volume, time + duration);
        param.linearRampToValueAtTime(volume, time + duration);
        // param.setTargetAtTime(volume, time, duration);
        // param.exponentialRampToValueAtTime(Math.max(volume, 0.0001), time + duration);
    }
    else {
        this._sounds.forEach(function(sound) {
            sound.fade(volume, duration);
        });
    }

    return this;
};

/*
 * Destroy
 */

Group.prototype.destroy = function() {
    while(this._sounds.length) {
        this._sounds.pop().destroy();
    }
};


/*
 * Getters & Setters
 */

Object.defineProperties(Group.prototype, {
    'effect': {
        get: function() {
            return this._effect;
        }
    },
    'gain': {
        get: function() {
            return this._gain;
        }
    },
    'sounds': {
        get: function() {
            return this._sounds;
        }
    }
});

module.exports = Group;

},{"./effect.js":3}],15:[function(require,module,exports){
'use strict';

var BufferSource = require('./source/buffer-source.js'),
    Effect = require('./effect.js'),
    Emitter = require('./utils/emitter.js'),
    File = require('./utils/file.js'),
    Loader = require('./utils/loader.js'),
    MediaSource = require('./source/media-source.js'),
    MicrophoneSource = require('./source/microphone-source.js'),
    OscillatorSource = require('./source/oscillator-source.js'),
    ScriptSource = require('./source/script-source.js');

function Sound(context, destination) {
    this.id = '';
    this._context = context;
    this._data = null;
    // this._endedCallback = null;
    this._isTouchLocked = false;
    this._loader = null;
    this._loop = false;
    this._pausedAt = 0;
    this._playbackRate = 1;
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

Sound.prototype = Object.create(Emitter.prototype);
Sound.prototype.constructor = Sound;

/*
 * Load
 */

Sound.prototype.load = function(config) {
    var url = File.getSupportedFile(config.url || config);

    if(this._source && this._source._el) {
        this._source.load(url);
    }
    else {
        this._loader = this._loader || new Loader(url);
        this._loader.audioContext = !!config.asMediaElement ? null : this._context;
        this._loader.isTouchLocked = this._isTouchLocked;
        var self = this;
        this._loader.once('loaded', function(data) {
            self.data = data;
            self = null;
        });
    }
    return this;
};

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
    if(!this._context) { this.volume = this._gain.gain.value; }

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

Sound.prototype.fade = function(volume, duration) {
    if(!this._source) { return this; }

    if(this._context) {
        var  param = this._gain.gain;
        var time = this._context.currentTime;
        param.cancelScheduledValues(time);
        param.setValueAtTime(param.value, time);
        param.linearRampToValueAtTime(volume, time + duration);
    }
    else if(typeof this._source.fade === 'function') {
        this._source.fade(volume, duration);
    }

    return this;
};

/*
 * Destroy
 */

Sound.prototype.destroy = function() {
    if(this._source) { this._source.destroy(); }
    if(this._effect) { this._effect.destroy(); }
    if(this._gain) { this._gain.disconnect(); }
    this._gain = null;
    this._context = null;
    this._data = null;
    // this._endedCallback = null;
    this.removeAllListeners('ended');
    this._playWhenReady = null;
    this._source = null;
    this._effect = null;
    if(this._loader) {
        this._loader.destroy();
        this._loader = null;
    }
};

/*
 * Create source
 */

Sound.prototype._createSource = function(data) {
    // if (this._source && File.type(data) === this._source.type) {
    //     this._source.data = data;
    // } else
    if(File.isAudioBuffer(data)) {
        this._source = new BufferSource(data, this._context);
    }
    else if(File.isMediaElement(data)) {
        this._source = new MediaSource(data, this._context);
    }
    else if(File.isMediaStream(data)) {
        this._source = new MicrophoneSource(data, this._context);
    }
    else if(File.isOscillatorType(data)) {
        this._source = new OscillatorSource(data, this._context);
    }
    else if(File.isScriptConfig(data)) {
        this._source = new ScriptSource(data, this._context);
    }
    else {
        throw new Error('Cannot detect data type: ' + data);
    }

    this._effect.setSource(this._source.sourceNode);

    if(this._source.hasOwnProperty('_endedCallback')) {
        this._source._endedCallback = function() {
            this.emit('ended');
        }.bind(this);
    }

    if(this._playWhenReady) {
        this._playWhenReady();
    }
};

/*
 * Getters & Setters
 */

Object.defineProperties(Sound.prototype, {
    'context': {
        get: function() {
            return this._context;
        }
    },
    'currentTime': {
        get: function() {
            return this._source ? this._source.currentTime : 0;
        },
        set: function(value) {
            this.stop();
            this.play(0, value);
        }
    },
    'data': {
        get: function() {
            return this._data;
        },
        set : function(value) {
            if(!value) { return; }
            this._data = value;
            this._createSource(this._data);
        }
    },
    'duration': {
        get: function() {
            return this._source ? this._source.duration : 0;
        }
    },
    'effect': {
        get: function() {
            return this._effect;
        }
    },
    'ended': {
        get: function() {
            return this._source ? this._source.ended : false;
        }
    },
    'frequency': {
        get: function() {
            return this._source ? this._source.frequency : 0;
        },
        set: function(value) {
            if(this._source) {
                this._source.frequency = value;
            }
        }
    },
    'gain': {
        get: function() {
            return this._gain;
        }
    },
    'isTouchLocked': {
        set: function(value) {
            this._isTouchLocked = value;
            if(!value && this._playWhenReady) {
                this._playWhenReady();
            }
        }
    },
    'loader': {
        get: function() {
            return this._loader;
        }
    },
    'loop': {
        get: function() {
            return this._loop;
        },
        set: function(value) {
            this._loop = !!value;
            if(this._source) {
              this._source.loop = this._loop;
            }
        }
    },
    'paused': {
        get: function() {
            return this._source ? this._source.paused : false;
        }
    },
    'playing': {
        get: function() {
            return this._source ? this._source.playing : false;
        }
    },
    'playbackRate': {
        get: function() {
            return this._playbackRate;
        },
        set: function(value) {
            this._playbackRate = value;
            if(this._source) {
              this._source.playbackRate = this._playbackRate;
            }
        }
    },
    'progress': {
        get: function() {
            return this._source ? this._source.progress : 0;
        }
    },
    'volume': {
        get: function() {
            if(this._context) {
                return this._gain.gain.value;
            }
            else if(this._data && this._data.volume !== undefined) {
                return this._data.volume;
            }
            return 1;
        },
        set: function(value) {
            if(isNaN(value)) { return; }

            var param = this._gain.gain;

            if(this._context) {
                var time = this._context.currentTime;
                param.cancelScheduledValues(time);
                param.value = value;
                param.setValueAtTime(value, time);
            }
            else {
                param.value = value;
                if(this._source) {
                    window.clearTimeout(this._source.fadeTimeout);
                }
                if(this._data && this._data.volume !== undefined) {
                    this._data.volume = value;
                }
            }
        }
    }
});

module.exports = Sound;

},{"./effect.js":3,"./source/buffer-source.js":16,"./source/media-source.js":17,"./source/microphone-source.js":18,"./source/oscillator-source.js":19,"./source/script-source.js":20,"./utils/emitter.js":22,"./utils/file.js":23,"./utils/loader.js":24}],16:[function(require,module,exports){
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
    this._playbackRate = 1;
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
    this.sourceNode.playbackRate.value = this._playbackRate;

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

BufferSource.prototype._endedHandler = function() {
    this.stop();
    this._ended = true;
    if(typeof this._endedCallback === 'function') {
        this._endedCallback(this);
    }
};

/*
 * Destroy
 */

BufferSource.prototype.destroy = function() {
    this.stop();
    this._buffer = null;
    this._context = null;
    this._endedCallback = null;
    this._sourceNode = null;
};

/*
 * Getters & Setters
 */

Object.defineProperties(BufferSource.prototype, {
    'currentTime': {
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
    },
    'data': {
        set: function(value) {
            this._buffer = value;
        }
    },
    'duration': {
        get: function() {
            return this._buffer ? this._buffer.duration : 0;
        }
    },
    'ended': {
        get: function() {
            return this._ended;
        }
    },
    'loop': {
        get: function() {
            return this._loop;
        },
        set: function(value) {
            this._loop = !!value;
        }
    },
    'paused': {
        get: function() {
            return this._paused;
        }
    },
    'playbackRate': {
        get: function() {
            return this._playbackRate;
        },
        set: function(value) {
            this._playbackRate = value;
            if(this._sourceNode) {
                this._sourceNode.playbackRate.value = this._playbackRate;
            }
        }
    },
    'playing': {
        get: function() {
            return this._playing;
        }
    },
    'progress': {
        get: function() {
            return this.duration ? this.currentTime / this.duration : 0;
        }
    },
    'sourceNode': {
        get: function() {
            if(!this._sourceNode) {
                this._sourceNode = this._context.createBufferSource();
                this._sourceNode.buffer = this._buffer;
            }
            return this._sourceNode;
        }
    }
});

module.exports = BufferSource;

},{}],17:[function(require,module,exports){
'use strict';

function MediaSource(el, context) {
    this.id = '';
    this._context = context;
    this._el = el; // HTMLMediaElement
    this._ended = false;
    this._endedCallback = null;
    this._loop = false;
    this._paused = false;
    this._playbackRate = 1;
    this._playing = false;
    this._sourceNode = null; // MediaElementSourceNode
}

/*
 * Load
 */

MediaSource.prototype.load = function(url) {
    this._el.src = url;
    this._el.load();
    this._ended = false;
    this._paused = false;
    this._playing = false;
};

/*
 * Controls
 */

MediaSource.prototype.play = function(delay, offset) {
    clearTimeout(this._delayTimeout);

    this.playbackRate = this._playbackRate;

    if(offset) {
        this._el.currentTime = offset;
    }

    if(delay) {
        this._delayTimeout = setTimeout(this.play.bind(this), delay);
    }
    else {
        // this._el.load();
        this._el.play();
    }

    this._ended = false;
    this._paused = false;
    this._playing = true;

    this._el.removeEventListener('ended', this._endedHandlerBound);
    this._el.addEventListener('ended', this._endedHandlerBound, false);

    if(this._el.readyState < 4) {
        this._el.removeEventListener('canplaythrough', this._readyHandlerBound);
        this._el.addEventListener('canplaythrough', this._readyHandlerBound, false);
        this._el.load();
        this._el.play();
    }
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
 * Fade for no webaudio
 */

MediaSource.prototype.fade = function(volume, duration) {
    if(!this._el) { return this; }
    if(this._context) { return this; }

    var ramp = function(value, step, self) {
        var el = self._el;
        self.fadeTimeout = setTimeout(function() {
            el.volume = el.volume + ( value - el.volume ) * 0.2;
            if(Math.abs(el.volume - value) > 0.05) {
                return ramp(value, step, self);
            }
            el.volume = value;
        }, step * 1000);
    };

    window.clearTimeout(this.fadeTimeout);
    ramp(volume, duration / 10, this);

    return this;
};

/*
 * Ended handler
 */

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

MediaSource.prototype._readyHandler = function() {
    this._el.removeEventListener('canplaythrough', this._readyHandlerBound);
    if(this._playing) {
        this._el.play();
    }
};

/*
 * Destroy
 */

MediaSource.prototype.destroy = function() {
    this._el.removeEventListener('ended', this._endedHandlerBound);
    this._el.removeEventListener('canplaythrough', this._readyHandlerBound);
    this.stop();
    this._el = null;
    this._context = null;
    this._endedCallback = null;
    this._sourceNode = null;
};

/*
 * Getters & Setters
 */

Object.defineProperties(MediaSource.prototype, {
    'currentTime': {
        get: function() {
            return this._el ? this._el.currentTime : 0;
        }
    },
    'data': {
        set: function(value) {
            this._el = value;
        }
    },
    'duration': {
        get: function() {
            return this._el ? this._el.duration : 0;
        }
    },
    'ended': {
        get: function() {
            return this._ended;
        }
    },
    'loop': {
        get: function() {
            return this._loop;
        },
        set: function(value) {
            this._loop = !!value;
        }
    },
    'paused': {
        get: function() {
            return this._paused;
        }
    },
    'playbackRate': {
        get: function() {
            return this._playbackRate;
        },
        set: function(value) {
            this._playbackRate = value;
            if(this._el) {
                this._el.playbackRate = this._playbackRate;
            }
        }
    },
    'playing': {
        get: function() {
            return this._playing;
        }
    },
    'progress': {
        get: function() {
            return this.duration ? this.currentTime / this.duration : 0;
        }
    },
    'sourceNode': {
        get: function() {
            if(!this._sourceNode && this._context) {
                this._sourceNode = this._context.createMediaElementSource(this._el);
            }
            return this._sourceNode;
        }
    }
});

module.exports = MediaSource;

},{}],18:[function(require,module,exports){
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
 * Destroy
 */

MicrophoneSource.prototype.destroy = function() {
    this.stop();
    this._context = null;
    this._sourceNode = null;
    this._stream = null;
    window.mozHack = null;
};

/*
 * Getters & Setters
 */

Object.defineProperties(MicrophoneSource.prototype, {
    'currentTime': {
        get: function() {
            if(this._pausedAt) {
                return this._pausedAt;
            }
            if(this._startedAt) {
                return this._context.currentTime - this._startedAt;
            }
            return 0;
        }
    },
    'duration': {
        get: function() {
            return 0;
        }
    },
    'ended': {
        get: function() {
            return this._ended;
        }
    },
    'frequency': {
        get: function() {
            return this._frequency;
        },
        set: function(value) {
            this._frequency = value;
            if(this._sourceNode) {
                this._sourceNode.frequency.value = value;
            }
        }
    },
    'paused': {
        get: function() {
            return this._paused;
        }
    },
    'playing': {
        get: function() {
            return this._playing;
        }
    },
    'progress': {
        get: function() {
            return 0;
        }
    },
    'sourceNode': {
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
    }
});

module.exports = MicrophoneSource;

},{}],19:[function(require,module,exports){
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
 * Destroy
 */

OscillatorSource.prototype.destroy = function() {
    this.stop();
    this._context = null;
    this._sourceNode = null;
};

/*
 * Getters & Setters
 */

Object.defineProperties(OscillatorSource.prototype, {
    'currentTime': {
        get: function() {
            if(this._pausedAt) {
                return this._pausedAt;
            }
            if(this._startedAt) {
                return this._context.currentTime - this._startedAt;
            }
            return 0;
        }
    },
    'duration': {
        get: function() {
            return 0;
        }
    },
    'ended': {
        get: function() {
            return this._ended;
        }
    },
    'frequency': {
        get: function() {
            return this._frequency;
        },
        set: function(value) {
            this._frequency = value;
            if(this._sourceNode) {
                this._sourceNode.frequency.value = value;
            }
        }
    },
    'paused': {
        get: function() {
            return this._paused;
        }
    },
    'playing': {
        get: function() {
            return this._playing;
        }
    },
    'progress': {
        get: function() {
            return 0;
        }
    },
    'sourceNode': {
        get: function() {
            if(!this._sourceNode && this._context) {
                this._sourceNode = this._context.createOscillator();
                this._sourceNode.type = this._type;
                this._sourceNode.frequency.value = this._frequency;
            }
            return this._sourceNode;
        }
    }
});

module.exports = OscillatorSource;

},{}],20:[function(require,module,exports){
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
 * Destroy
 */

ScriptSource.prototype.destroy = function() {
    this.stop();
    this._context = null;
    this._onProcess = null;
    this._sourceNode = null;
};

/*
 * Getters & Setters
 */

Object.defineProperties(ScriptSource.prototype, {
    'currentTime': {
        get: function() {
            if(this._pausedAt) {
                return this._pausedAt;
            }
            if(this._startedAt) {
                return this._context.currentTime - this._startedAt;
            }
            return 0;
        }
    },
    'duration': {
        get: function() {
            return 0;
        }
    },
    'ended': {
        get: function() {
            return this._ended;
        }
    },
    'paused': {
        get: function() {
            return this._paused;
        }
    },
    'playing': {
        get: function() {
            return this._playing;
        }
    },
    'progress': {
        get: function() {
            return 0;
        }
    },
    'sourceNode': {
        get: function() {
            if(!this._sourceNode && this._context) {
                this._sourceNode = this._context.createScriptProcessor(this._bufferSize, 0, this._channels);
            }
            return this._sourceNode;
        }
    }
});

module.exports = ScriptSource;

},{}],21:[function(require,module,exports){
'use strict';

var Browser = {};

Browser.handlePageVisibility = function(onHidden, onShown, thisArg) {
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

Browser.handleTouchLock = function(onUnlock, thisArg) {
    var ua = navigator.userAgent,
        locked = !!ua.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|SymbianOS/i);


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

module.exports = Browser;

},{}],22:[function(require,module,exports){
'use strict';

var EventEmitter = require('events').EventEmitter;

function Emitter() {}

Emitter.prototype = Object.create(EventEmitter.prototype);
Emitter.prototype.constructor = Emitter;

Emitter.prototype.off = function(type, listener) {
    if (listener) {
        return this.removeListener(type, listener);
    }
    return this.removeAllListeners(type);
};

module.exports = Emitter;

},{"events":2}],23:[function(require,module,exports){
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
}

/*
 * find a supported file
 */

File.getFileExtension = function(url) {
    // from DataURL
    if(url.substr(0, 5) === 'data:') {
        var match = url.match(/data:audio\/(ogg|mp3|opus|wav|m4a)/i);
        if(match && match.length > 1) {
            return match[1].toLowerCase();
        }
    }
    // from Standard URL
    url = url.split('?')[0];
    url = url.substr(url.lastIndexOf('/') + 1);

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
             (data.indexOf('.') > -1 || data.substr(0, 5) === 'data:'));
};

File.containsURL = function(config) {
    if(!config) { return false; }
    // string, array or object with url property that is string or array
    var url = config.url || config;
    return this.isURL(url) || (Array.isArray(url) && this.isURL(url[0]));
};

module.exports = File;

},{}],24:[function(require,module,exports){
'use strict';

var Emitter = require('./emitter.js');

function Loader(url) {
    var emitter = new Emitter(),
        progress = 0,
        audioContext,
        isTouchLocked,
        request,
        timeout,
        data;

    var start = function() {
        if(audioContext) {
            loadArrayBuffer();
        } else {
            loadAudioElement();
        }
    };

    var dispatch = function(buffer) {
        emitter.emit('progress', 1);
        emitter.emit('loaded', buffer);
        emitter.emit('complete', buffer);
    };

    var loadArrayBuffer = function() {
        request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onprogress = function(event) {
            if (event.lengthComputable) {
                progress = event.loaded / event.total;
                // onProgress.dispatch(progress);
                emitter.emit('progress', progress);
            }
        };
        request.onload = function() {
            audioContext.decodeAudioData(
                request.response,
                function(buffer) {
                    data = buffer;
                    request = null;
                    progress = 1;
                    dispatch(buffer);
                },
                function(e) {
                    emitter.emit('error', e);
                }
            );
        };
        request.onerror = function(e) {
            // onError.dispatch(e);
            emitter.emit('error', e);
        };
        request.send();
    };

    var loadAudioElement = function() {
        if(!data || !data.tagName) {
            data = new Audio();
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
            dispatch(data);
        }
    };

    var errorHandler = function(e) {
        window.clearTimeout(timeout);
        emitter.emit('error', e);
    };

    var readyHandler = function() {
        window.clearTimeout(timeout);
        if(!data) { return; }
        data.removeEventListener('canplaythrough', readyHandler);
        progress = 1;
        dispatch(data);
    };

    var cancel = function() {
        if(request && request.readyState !== 4) {
          request.abort();
        }
        if(data && typeof data.removeEventListener === 'function') {
            data.removeEventListener('canplaythrough', readyHandler);
        }
        window.clearTimeout(timeout);

        emitter.removeAllListeners('progress');
        emitter.removeAllListeners('complete');
        emitter.removeAllListeners('loaded');
        emitter.removeAllListeners('error');
    };

    var destroy = function() {
        cancel();
        request = null;
        data = null;
        audioContext = null;
    };

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
        'data': {
            get: function() {
                return data;
            }
        },
        'progress': {
            get: function() {
                return progress;
            }
        },
        'audioContext': {
            set: function(value) {
                audioContext = value;
            }
        },
        'isTouchLocked': {
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
        numTotal = 0;

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
            emitter.emit('complete');
            return;
        }

        var loader = queue.pop();
        loader.on('progress', progressHandler);
        loader.on('loaded', completeHandler);
        loader.on('error', errorHandler);
        loader.start();
    };

    var progressHandler = function(progress) {
        var loaded = numLoaded + progress;
        emitter.emit('progress', loaded / numTotal);
    };

    var completeHandler = function() {
        numLoaded++;
        emitter.emit('progress', numLoaded / numTotal);
        next();
    };

    var errorHandler = function(e) {
        emitter.emit('error', e);
        next();
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

},{"./emitter.js":22}],25:[function(require,module,exports){
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
            void 0;
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

Object.defineProperties(Microphone.prototype, {
    'stream': {
        get: function() {
            return this._stream;
        }
    },
    'isSupported': {
        get: function() {
            return this._isSupported;
        }
    }
});

module.exports = Microphone;

},{}],26:[function(require,module,exports){
'use strict';

/*
 * TODO: Ended handler
 */

var Group = require('../group.js');

function SoundGroup(context, destination) {
    Group.call(this, context, destination);
    this._src = null;
}

SoundGroup.prototype = Object.create(Group.prototype);
SoundGroup.prototype.constructor = SoundGroup;

/*
 * Add / remove
 */

SoundGroup.prototype.add = function(sound) {
    Group.prototype.add.call(this, sound);
    this._getSource();
};

SoundGroup.prototype.remove = function(soundOrId) {
    Group.prototype.remove.call(this, soundOrId);
    this._getSource();
};

SoundGroup.prototype._getSource = function() {
    if(!this._sounds.length) { return; }

    this._sounds.sort(function(a, b) {
        return b.duration - a.duration;
    });

    this._src = this._sounds[0];
};

/*
 * Getters & Setters
 */

Object.defineProperties(SoundGroup.prototype, {
    'currentTime': {
        get: function() {
            return this._src ? this._src.currentTime : 0;
        },
        set: function(value) {
            this.stop();
            this.play(0, value);
        }
    },
    'duration': {
        get: function() {
            return this._src ? this._src.duration : 0;
        }
    },
    // 'ended': {
    //     get: function() {
    //         return this._src ? this._src.ended : false;
    //     }
    // },
    'loop': {
        get: function() {
            return this._loop;
        },
        set: function(value) {
            this._loop = !!value;
            this._sounds.forEach(function(sound) {
                sound.loop = this._loop;
            });
        }
    },
    'paused': {
        get: function() {
            return this._src ? this._src.paused : false;
        }
    },
    'progress': {
        get: function() {
            return this._src ? this._src.progress : 0;
        }
    },
    'playbackRate': {
        get: function() {
            return this._playbackRate;
        },
        set: function(value) {
            this._playbackRate = value;
            this._sounds.forEach(function(sound) {
                sound.playbackRate = this._playbackRate;
            });
        }
    },
    'playing': {
        get: function() {
            return this._src ? this._src.playing : false;
        }
    }
});

module.exports = SoundGroup;

},{"../group.js":14}],27:[function(require,module,exports){
'use strict';

var Microphone = require('./microphone.js'),
    Waveform = require('./waveform.js');

var Utils = {};

/*
 * audio context
 */

Utils.setContext = function(context) {
    this._context = context;
};

/*
 * audio buffer
 */

Utils.cloneBuffer = function(buffer) {
    if(!this._context) { return buffer; }

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
 * ramp audio param
 */

Utils.ramp = function(param, fromValue, toValue, duration) {
    if(!this._context) { return; }

    param.setValueAtTime(fromValue, this._context.currentTime);
    param.linearRampToValueAtTime(toValue, this._context.currentTime + duration);
};

/*
 * get frequency from min to max by passing 0 to 1
 */

Utils.getFrequency = function(value) {
    if(!this._context) { return 0; }
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
 * microphone util
 */

Utils.microphone = function(connected, denied, error, thisArg) {
    return new Microphone(connected, denied, error, thisArg);
};

/*
 * Format seconds as timecode string
 */

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

/*
 * waveform
 */

Utils.waveform = function(buffer, length) {
    return new Waveform(buffer, length);
};

module.exports = Utils;

},{"./microphone.js":25,"./waveform.js":28}],28:[function(require,module,exports){
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