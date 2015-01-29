!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.Sono=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"./src/sono.js":[function(require,module,exports){
'use strict';

var Browser = require('./lib/utils/browser.js'),
    File = require('./lib/utils/file.js'),
    Group = require('./lib/group.js'),
    Loader = require('./lib/utils/loader.js'),
    Sound = require('./lib/sound.js'),
    SoundGroup = require('./lib/utils/sound-group.js'),
    Utils = require('./lib/utils/utils.js');

function Sono() {
    this.VERSION = '0.0.7';

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

},{"./lib/group.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/group.js","./lib/sound.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/sound.js","./lib/utils/browser.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/browser.js","./lib/utils/file.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/file.js","./lib/utils/loader.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/loader.js","./lib/utils/sound-group.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/sound-group.js","./lib/utils/utils.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/utils.js"}],"/Users/ianmcgregor/Dropbox/workspace/sono/node_modules/browserify/node_modules/events/events.js":[function(require,module,exports){
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
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect.js":[function(require,module,exports){
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

},{"./effect/analyser.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/analyser.js","./effect/distortion.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/distortion.js","./effect/echo.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/echo.js","./effect/fake-context.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/fake-context.js","./effect/filter.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/filter.js","./effect/flanger.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/flanger.js","./effect/panner.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/panner.js","./effect/phaser.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/phaser.js","./effect/recorder.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/recorder.js","./effect/reverb.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/reverb.js"}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/analyser.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/distortion.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/echo.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/fake-context.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/filter.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/flanger.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/panner.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/phaser.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/recorder.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect/reverb.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/group.js":[function(require,module,exports){
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

},{"./effect.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect.js"}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/sound.js":[function(require,module,exports){
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

},{"./effect.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/effect.js","./source/buffer-source.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/source/buffer-source.js","./source/media-source.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/source/media-source.js","./source/microphone-source.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/source/microphone-source.js","./source/oscillator-source.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/source/oscillator-source.js","./source/script-source.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/source/script-source.js","./utils/emitter.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/emitter.js","./utils/file.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/file.js","./utils/loader.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/loader.js"}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/source/buffer-source.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/source/media-source.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/source/microphone-source.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/source/oscillator-source.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/source/script-source.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/browser.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/emitter.js":[function(require,module,exports){
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

},{"events":"/Users/ianmcgregor/Dropbox/workspace/sono/node_modules/browserify/node_modules/events/events.js"}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/file.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/loader.js":[function(require,module,exports){
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

},{"./emitter.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/emitter.js"}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/microphone.js":[function(require,module,exports){
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

},{}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/sound-group.js":[function(require,module,exports){
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

},{"../group.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/group.js"}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/utils.js":[function(require,module,exports){
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

},{"./microphone.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/microphone.js","./waveform.js":"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/waveform.js"}],"/Users/ianmcgregor/Dropbox/workspace/sono/src/lib/utils/waveform.js":[function(require,module,exports){
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

},{}]},{},["./src/sono.js"])("./src/sono.js")
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc29uby5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwic3JjL2xpYi9lZmZlY3QuanMiLCJzcmMvbGliL2VmZmVjdC9hbmFseXNlci5qcyIsInNyYy9saWIvZWZmZWN0L2Rpc3RvcnRpb24uanMiLCJzcmMvbGliL2VmZmVjdC9lY2hvLmpzIiwic3JjL2xpYi9lZmZlY3QvZmFrZS1jb250ZXh0LmpzIiwic3JjL2xpYi9lZmZlY3QvZmlsdGVyLmpzIiwic3JjL2xpYi9lZmZlY3QvZmxhbmdlci5qcyIsInNyYy9saWIvZWZmZWN0L3Bhbm5lci5qcyIsInNyYy9saWIvZWZmZWN0L3BoYXNlci5qcyIsInNyYy9saWIvZWZmZWN0L3JlY29yZGVyLmpzIiwic3JjL2xpYi9lZmZlY3QvcmV2ZXJiLmpzIiwic3JjL2xpYi9ncm91cC5qcyIsInNyYy9saWIvc291bmQuanMiLCJzcmMvbGliL3NvdXJjZS9idWZmZXItc291cmNlLmpzIiwic3JjL2xpYi9zb3VyY2UvbWVkaWEtc291cmNlLmpzIiwic3JjL2xpYi9zb3VyY2UvbWljcm9waG9uZS1zb3VyY2UuanMiLCJzcmMvbGliL3NvdXJjZS9vc2NpbGxhdG9yLXNvdXJjZS5qcyIsInNyYy9saWIvc291cmNlL3NjcmlwdC1zb3VyY2UuanMiLCJzcmMvbGliL3V0aWxzL2Jyb3dzZXIuanMiLCJzcmMvbGliL3V0aWxzL2VtaXR0ZXIuanMiLCJzcmMvbGliL3V0aWxzL2ZpbGUuanMiLCJzcmMvbGliL3V0aWxzL2xvYWRlci5qcyIsInNyYy9saWIvdXRpbHMvbWljcm9waG9uZS5qcyIsInNyYy9saWIvdXRpbHMvc291bmQtZ3JvdXAuanMiLCJzcmMvbGliL3V0aWxzL3V0aWxzLmpzIiwic3JjL2xpYi91dGlscy93YXZlZm9ybS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQnJvd3NlciA9IHJlcXVpcmUoJy4vbGliL3V0aWxzL2Jyb3dzZXIuanMnKSxcbiAgICBGaWxlID0gcmVxdWlyZSgnLi9saWIvdXRpbHMvZmlsZS5qcycpLFxuICAgIEdyb3VwID0gcmVxdWlyZSgnLi9saWIvZ3JvdXAuanMnKSxcbiAgICBMb2FkZXIgPSByZXF1aXJlKCcuL2xpYi91dGlscy9sb2FkZXIuanMnKSxcbiAgICBTb3VuZCA9IHJlcXVpcmUoJy4vbGliL3NvdW5kLmpzJyksXG4gICAgU291bmRHcm91cCA9IHJlcXVpcmUoJy4vbGliL3V0aWxzL3NvdW5kLWdyb3VwLmpzJyksXG4gICAgVXRpbHMgPSByZXF1aXJlKCcuL2xpYi91dGlscy91dGlscy5qcycpO1xuXG5mdW5jdGlvbiBTb25vKCkge1xuICAgIHRoaXMuVkVSU0lPTiA9ICcwLjAuNyc7XG5cbiAgICB3aW5kb3cuQXVkaW9Db250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xuICAgIHZhciBjb250ZXh0ID0gd2luZG93LkF1ZGlvQ29udGV4dCA/IG5ldyB3aW5kb3cuQXVkaW9Db250ZXh0KCkgOiBudWxsO1xuICAgIHZhciBkZXN0aW5hdGlvbiA9IGNvbnRleHQgPyBjb250ZXh0LmRlc3RpbmF0aW9uIDogbnVsbDtcblxuICAgIHRoaXMuX2dyb3VwID0gbmV3IEdyb3VwKGNvbnRleHQsIGRlc3RpbmF0aW9uKTtcbiAgICB0aGlzLl9nYWluID0gdGhpcy5fZ3JvdXAuZ2FpbjtcbiAgICB0aGlzLl9zb3VuZHMgPSB0aGlzLl9ncm91cC5zb3VuZHM7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG5cbiAgICBVdGlscy5zZXRDb250ZXh0KGNvbnRleHQpO1xuICAgIHRoaXMuX2hhbmRsZVRvdWNobG9jaygpO1xuICAgIHRoaXMuX2hhbmRsZVBhZ2VWaXNpYmlsaXR5KCk7XG59XG5cbi8qXG4gKiBDcmVhdGVcbiAqXG4gKiBBY2NlcHRlZCB2YWx1ZXMgZm9yIHBhcmFtIGNvbmZpZzpcbiAqIE9iamVjdCBjb25maWcgZS5nLiB7IGlkOidmb28nLCB1cmw6Wydmb28ub2dnJywgJ2Zvby5tcDMnXSB9XG4gKiBBcnJheSAob2YgZmlsZXMgZS5nLiBbJ2Zvby5vZ2cnLCAnZm9vLm1wMyddKVxuICogQXJyYXlCdWZmZXJcbiAqIEhUTUxNZWRpYUVsZW1lbnRcbiAqIEZpbGVuYW1lIHN0cmluZyAoZS5nLiAnZm9vLm9nZycpXG4gKiBPc2NpbGxhdG9yIHR5cGUgc3RyaW5nIChpLmUuICdzaW5lJywgJ3NxdWFyZScsICdzYXd0b290aCcsICd0cmlhbmdsZScpXG4gKiBTY3JpcHRQcm9jZXNzb3IgY29uZmlnIG9iamVjdCAoZS5nLiB7IGJ1ZmZlclNpemU6IDEwMjQsIGNoYW5uZWxzOiAxLCBjYWxsYmFjazogZm4sIHRoaXNBcmc6IHNlbGYgfSlcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5jcmVhdGVTb3VuZCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIC8vIHRyeSB0byBsb2FkIGlmIGNvbmZpZyBjb250YWlucyBVUkxzXG4gICAgaWYoRmlsZS5jb250YWluc1VSTChjb25maWcpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxvYWQoY29uZmlnKTtcbiAgICB9XG4gICAgLy8gb3B0aW9uIHRvIHVzZSBzaW1wbGUgYXVkaW8gZWxcbiAgICB2YXIgY29udGV4dCA9IChjb25maWcgJiYgY29uZmlnLm5vV2ViQXVkaW8pID8gbnVsbCA6IHRoaXMuX2NvbnRleHQ7XG4gICAgLy8gb3RoZXJ3aXNlIGp1c3QgcmV0dXJuIGEgbmV3IHNvdW5kIG9iamVjdFxuICAgIHZhciBzb3VuZCA9IG5ldyBTb3VuZChjb250ZXh0LCB0aGlzLl9nYWluKTtcbiAgICBzb3VuZC5pc1RvdWNoTG9ja2VkID0gdGhpcy5faXNUb3VjaExvY2tlZDtcbiAgICBpZihjb25maWcpIHtcbiAgICAgICAgc291bmQuZGF0YSA9IGNvbmZpZy5kYXRhIHx8IGNvbmZpZztcbiAgICAgICAgc291bmQuaWQgPSBjb25maWcuaWQgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5pZCA6ICcnO1xuICAgICAgICBzb3VuZC5sb29wID0gISFjb25maWcubG9vcDtcbiAgICAgICAgc291bmQudm9sdW1lID0gY29uZmlnLnZvbHVtZTtcbiAgICB9XG4gICAgdGhpcy5fZ3JvdXAuYWRkKHNvdW5kKTtcblxuICAgIHJldHVybiBzb3VuZDtcbn07XG5cbi8qXG4gKiBEZXN0cm95XG4gKi9cblxuU29uby5wcm90b3R5cGUuZGVzdHJveVNvdW5kID0gZnVuY3Rpb24oc291bmRPcklkKSB7XG4gICAgaWYoIXNvdW5kT3JJZCkgeyByZXR1cm47IH1cblxuICAgIHRoaXMuX3NvdW5kcy5zb21lKGZ1bmN0aW9uKHNvdW5kLCBpbmRleCwgc291bmRzKSB7XG4gICAgICAgIGlmKHNvdW5kID09PSBzb3VuZE9ySWQgfHwgc291bmQuaWQgPT09IHNvdW5kT3JJZCkge1xuICAgICAgICAgICAgc291bmRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICBzb3VuZC5kZXN0cm95KCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuU29uby5wcm90b3R5cGUuZGVzdHJveUFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2dyb3VwLmRlc3Ryb3koKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gKiBHZXQgU291bmQgYnkgaWRcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5nZXRTb3VuZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdmFyIHNvdW5kID0gbnVsbDtcbiAgICB0aGlzLl9zb3VuZHMuc29tZShmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGlmKGl0ZW0uaWQgPT09IGlkKSB7XG4gICAgICAgICAgICBzb3VuZCA9IGl0ZW07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzb3VuZDtcbn07XG5cbi8qXG4gKiBDcmVhdGUgZ3JvdXBcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5jcmVhdGVHcm91cCA9IGZ1bmN0aW9uKHNvdW5kcykge1xuICAgIHZhciBncm91cCA9IG5ldyBTb3VuZEdyb3VwKHRoaXMuX2NvbnRleHQsIHRoaXMuX2dhaW4pO1xuICAgIGlmKHNvdW5kcykge1xuICAgICAgICBzb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICAgICAgZ3JvdXAuYWRkKHNvdW5kKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBncm91cDtcbn07XG5cbi8qXG4gKiBMb2FkaW5nXG4gKi9cblxuU29uby5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIGlmKCFjb25maWcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudEV4Y2VwdGlvbjogU29uby5sb2FkOiBwYXJhbSBjb25maWcgaXMgdW5kZWZpbmVkJyk7XG4gICAgfVxuXG4gICAgdmFyIG9uUHJvZ3Jlc3MgPSBjb25maWcub25Qcm9ncmVzcyxcbiAgICAgICAgb25Db21wbGV0ZSA9IGNvbmZpZy5vbkNvbXBsZXRlLFxuICAgICAgICB0aGlzQXJnID0gY29uZmlnLnRoaXNBcmcgfHwgY29uZmlnLmNvbnRleHQgfHwgdGhpcyxcbiAgICAgICAgdXJsID0gY29uZmlnLnVybCB8fCBjb25maWcsXG4gICAgICAgIHNvdW5kLFxuICAgICAgICBsb2FkZXI7XG5cbiAgICBpZihGaWxlLmNvbnRhaW5zVVJMKHVybCkpIHtcbiAgICAgICAgc291bmQgPSB0aGlzLl9xdWV1ZShjb25maWcpO1xuICAgICAgICBsb2FkZXIgPSBzb3VuZC5sb2FkZXI7XG4gICAgfVxuICAgIGVsc2UgaWYoQXJyYXkuaXNBcnJheSh1cmwpICYmIEZpbGUuY29udGFpbnNVUkwodXJsWzBdLnVybCkgKSB7XG4gICAgICAgIHNvdW5kID0gW107XG4gICAgICAgIGxvYWRlciA9IG5ldyBMb2FkZXIuR3JvdXAoKTtcblxuICAgICAgICB1cmwuZm9yRWFjaChmdW5jdGlvbihmaWxlKSB7XG4gICAgICAgICAgICBzb3VuZC5wdXNoKHRoaXMuX3F1ZXVlKGZpbGUsIGxvYWRlcikpO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmKG9uUHJvZ3Jlc3MpIHtcbiAgICAgICAgbG9hZGVyLm9uKCdwcm9ncmVzcycsIGZ1bmN0aW9uKHByb2dyZXNzKSB7XG4gICAgICAgICAgICBvblByb2dyZXNzLmNhbGwodGhpc0FyZywgcHJvZ3Jlc3MpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgaWYob25Db21wbGV0ZSkge1xuICAgICAgICBsb2FkZXIub25jZSgnY29tcGxldGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGxvYWRlci5vZmYoJ3Byb2dyZXNzJyk7XG4gICAgICAgICAgICBvbkNvbXBsZXRlLmNhbGwodGhpc0FyZywgc291bmQpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgbG9hZGVyLnN0YXJ0KCk7XG5cbiAgICByZXR1cm4gc291bmQ7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5fcXVldWUgPSBmdW5jdGlvbihjb25maWcsIGdyb3VwKSB7XG4gICAgdmFyIGNvbnRleHQgPSAoY29uZmlnICYmIGNvbmZpZy5ub1dlYkF1ZGlvKSA/IG51bGwgOiB0aGlzLl9jb250ZXh0O1xuICAgIHZhciBzb3VuZCA9IG5ldyBTb3VuZChjb250ZXh0LCB0aGlzLl9nYWluKTtcbiAgICBzb3VuZC5pc1RvdWNoTG9ja2VkID0gdGhpcy5faXNUb3VjaExvY2tlZDtcbiAgICB0aGlzLl9ncm91cC5hZGQoc291bmQpO1xuXG4gICAgc291bmQuaWQgPSBjb25maWcuaWQgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5pZCA6ICcnO1xuICAgIHNvdW5kLmxvb3AgPSAhIWNvbmZpZy5sb29wO1xuICAgIHNvdW5kLnZvbHVtZSA9IGNvbmZpZy52b2x1bWU7XG4gICAgc291bmQubG9hZChjb25maWcpO1xuXG4gICAgaWYoZ3JvdXApIHsgZ3JvdXAuYWRkKHNvdW5kLmxvYWRlcik7IH1cblxuICAgIHJldHVybiBzb3VuZDtcbn07XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cblNvbm8ucHJvdG90eXBlLm11dGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9ncm91cC5tdXRlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb25vLnByb3RvdHlwZS51bk11dGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9ncm91cC51bk11dGUoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShTb25vLnByb3RvdHlwZSwgJ3ZvbHVtZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ3JvdXAudm9sdW1lO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0aGlzLl9ncm91cC52b2x1bWUgPSB2YWx1ZTtcbiAgICB9XG59KTtcblxuU29uby5wcm90b3R5cGUuZmFkZSA9IGZ1bmN0aW9uKHZvbHVtZSwgZHVyYXRpb24pIHtcbiAgICB0aGlzLl9ncm91cC5mYWRlKHZvbHVtZSwgZHVyYXRpb24pO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuU29uby5wcm90b3R5cGUucGF1c2VBbGwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9ncm91cC5wYXVzZSgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuU29uby5wcm90b3R5cGUucmVzdW1lQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZ3JvdXAucmVzdW1lKCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5zdG9wQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZ3JvdXAuc3RvcCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuU29uby5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGlkLCBkZWxheSwgb2Zmc2V0KSB7XG4gICAgdGhpcy5nZXRTb3VuZChpZCkucGxheShkZWxheSwgb2Zmc2V0KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvbm8ucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oaWQpIHtcbiAgICB0aGlzLmdldFNvdW5kKGlkKS5wYXVzZSgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuU29uby5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy5nZXRTb3VuZChpZCkuc3RvcCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAqIE1vYmlsZSB0b3VjaCBsb2NrXG4gKi9cblxuU29uby5wcm90b3R5cGUuX2hhbmRsZVRvdWNobG9jayA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvblVubG9jayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLl9pc1RvdWNoTG9ja2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgICAgICBzb3VuZC5pc1RvdWNoTG9ja2VkID0gZmFsc2U7XG4gICAgICAgICAgICBpZihzb3VuZC5sb2FkZXIpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5sb2FkZXIuaXNUb3VjaExvY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHRoaXMuX2lzVG91Y2hMb2NrZWQgPSBCcm93c2VyLmhhbmRsZVRvdWNoTG9jayhvblVubG9jaywgdGhpcyk7XG59O1xuXG4vKlxuICogUGFnZSB2aXNpYmlsaXR5IGV2ZW50c1xuICovXG5cblNvbm8ucHJvdG90eXBlLl9oYW5kbGVQYWdlVmlzaWJpbGl0eSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwYWdlSGlkZGVuUGF1c2VkID0gW10sXG4gICAgICAgIHNvdW5kcyA9IHRoaXMuX3NvdW5kcztcblxuICAgIC8vIHBhdXNlIGN1cnJlbnRseSBwbGF5aW5nIHNvdW5kcyBhbmQgc3RvcmUgcmVmc1xuICAgIGZ1bmN0aW9uIG9uSGlkZGVuKCkge1xuICAgICAgICBzb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICAgICAgaWYoc291bmQucGxheWluZykge1xuICAgICAgICAgICAgICAgIHNvdW5kLnBhdXNlKCk7XG4gICAgICAgICAgICAgICAgcGFnZUhpZGRlblBhdXNlZC5wdXNoKHNvdW5kKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gcGxheSBzb3VuZHMgdGhhdCBnb3QgcGF1c2VkIHdoZW4gcGFnZSB3YXMgaGlkZGVuXG4gICAgZnVuY3Rpb24gb25TaG93bigpIHtcbiAgICAgICAgd2hpbGUocGFnZUhpZGRlblBhdXNlZC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhZ2VIaWRkZW5QYXVzZWQucG9wKCkucGxheSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgQnJvd3Nlci5oYW5kbGVQYWdlVmlzaWJpbGl0eShvbkhpZGRlbiwgb25TaG93biwgdGhpcyk7XG59O1xuXG4vKlxuICogTG9nIHZlcnNpb24gJiBkZXZpY2Ugc3VwcG9ydCBpbmZvXG4gKi9cblxuU29uby5wcm90b3R5cGUubG9nID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRpdGxlID0gJ1Nvbm8gJyArIHRoaXMuVkVSU0lPTixcbiAgICAgICAgaW5mbyA9ICdTdXBwb3J0ZWQ6JyArIHRoaXMuaXNTdXBwb3J0ZWQgK1xuICAgICAgICAgICAgICAgJyBXZWJBdWRpb0FQSTonICsgdGhpcy5oYXNXZWJBdWRpbyArXG4gICAgICAgICAgICAgICAnIFRvdWNoTG9ja2VkOicgKyB0aGlzLl9pc1RvdWNoTG9ja2VkICtcbiAgICAgICAgICAgICAgICcgRXh0ZW5zaW9uczonICsgRmlsZS5leHRlbnNpb25zO1xuXG4gICAgaWYobmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdDaHJvbWUnKSA+IC0xKSB7XG4gICAgICAgIHZhciBhcmdzID0gW1xuICAgICAgICAgICAgICAgICclYyDimasgJyArIHRpdGxlICtcbiAgICAgICAgICAgICAgICAnIOKZqyAlYyAnICsgaW5mbyArICcgJyxcbiAgICAgICAgICAgICAgICAnY29sb3I6ICNGRkZGRkY7IGJhY2tncm91bmQ6ICMzNzlGN0EnLFxuICAgICAgICAgICAgICAgICdjb2xvcjogIzFGMUMwRDsgYmFja2dyb3VuZDogI0UwRkJBQydcbiAgICAgICAgICAgIF07XG4gICAgICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICAgIH1cbiAgICBlbHNlIGlmICh3aW5kb3cuY29uc29sZSAmJiB3aW5kb3cuY29uc29sZS5sb2cuY2FsbCkge1xuICAgICAgICBjb25zb2xlLmxvZy5jYWxsKGNvbnNvbGUsIHRpdGxlICsgJyAnICsgaW5mbyk7XG4gICAgfVxufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoU29uby5wcm90b3R5cGUsIHtcbiAgICAnY2FuUGxheSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBGaWxlLmNhblBsYXk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdjb250ZXh0Jzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQ7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdlZmZlY3QnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ3JvdXAuZWZmZWN0O1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZXh0ZW5zaW9ucyc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBGaWxlLmV4dGVuc2lvbnM7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdoYXNXZWJBdWRpbyc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAhIXRoaXMuX2NvbnRleHQ7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdpc1N1cHBvcnRlZCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBGaWxlLmV4dGVuc2lvbnMubGVuZ3RoID4gMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2dhaW4nOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2FpbjtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3NvdW5kcyc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9ncm91cC5zb3VuZHMuc2xpY2UoMCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICd1dGlscyc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBVdGlscztcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG4vKlxuICogRXhwb3J0c1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFNvbm8oKTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEFuYWx5c2VyID0gcmVxdWlyZSgnLi9lZmZlY3QvYW5hbHlzZXIuanMnKSxcbiAgICBEaXN0b3J0aW9uID0gcmVxdWlyZSgnLi9lZmZlY3QvZGlzdG9ydGlvbi5qcycpLFxuICAgIEVjaG8gPSByZXF1aXJlKCcuL2VmZmVjdC9lY2hvLmpzJyksXG4gICAgRmFrZUNvbnRleHQgPSByZXF1aXJlKCcuL2VmZmVjdC9mYWtlLWNvbnRleHQuanMnKSxcbiAgICBGaWx0ZXIgPSByZXF1aXJlKCcuL2VmZmVjdC9maWx0ZXIuanMnKSxcbiAgICBGbGFuZ2VyID0gcmVxdWlyZSgnLi9lZmZlY3QvZmxhbmdlci5qcycpLFxuICAgIFBhbm5lciA9IHJlcXVpcmUoJy4vZWZmZWN0L3Bhbm5lci5qcycpLFxuICAgIFBoYXNlciA9IHJlcXVpcmUoJy4vZWZmZWN0L3BoYXNlci5qcycpLFxuICAgIFJlY29yZGVyID0gcmVxdWlyZSgnLi9lZmZlY3QvcmVjb3JkZXIuanMnKSxcbiAgICBSZXZlcmIgPSByZXF1aXJlKCcuL2VmZmVjdC9yZXZlcmIuanMnKTtcblxuZnVuY3Rpb24gRWZmZWN0KGNvbnRleHQpIHtcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dCB8fCBuZXcgRmFrZUNvbnRleHQoKTtcbiAgICB0aGlzLl9kZXN0aW5hdGlvbiA9IG51bGw7XG4gICAgdGhpcy5fbm9kZUxpc3QgPSBbXTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbn1cblxuRWZmZWN0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgaWYoIW5vZGUpIHsgcmV0dXJuOyB9XG4gICAgdGhpcy5fbm9kZUxpc3QucHVzaChub2RlKTtcbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIGwgPSB0aGlzLl9ub2RlTGlzdC5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYobm9kZSA9PT0gdGhpcy5fbm9kZUxpc3RbaV0pIHtcbiAgICAgICAgICAgIHRoaXMuX25vZGVMaXN0LnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciBvdXRwdXQgPSBub2RlLl9vdXRwdXQgfHwgbm9kZTtcbiAgICBvdXRwdXQuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuX3VwZGF0ZUNvbm5lY3Rpb25zKCk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnJlbW92ZUFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHdoaWxlKHRoaXMuX25vZGVMaXN0Lmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9ub2RlTGlzdC5wb3AoKS5kaXNjb25uZWN0KCk7XG4gICAgfVxuICAgIHRoaXMuX3VwZGF0ZUNvbm5lY3Rpb25zKCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9jb250ZXh0ID0gbnVsbDtcbiAgICB0aGlzLl9kZXN0aW5hdGlvbiA9IG51bGw7XG4gICAgdGhpcy5fbm9kZUxpc3QgPSBbXTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuX2Nvbm5lY3QgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgLy9jb25zb2xlLmxvZygnPiBjb25uZWN0JywgKGEubmFtZSB8fCBhLmNvbnN0cnVjdG9yLm5hbWUpLCAndG8nLCAoYi5uYW1lIHx8IGIuY29uc3RydWN0b3IubmFtZSkpO1xuXG4gICAgdmFyIG91dHB1dCA9IGEuX291dHB1dCB8fCBhO1xuICAgIC8vY29uc29sZS5sb2coJz4gZGlzY29ubmVjdCBvdXRwdXQ6ICcsIChhLm5hbWUgfHwgYS5jb25zdHJ1Y3Rvci5uYW1lKSk7XG4gICAgb3V0cHV0LmRpc2Nvbm5lY3QoKTtcbiAgICAvL2NvbnNvbGUubG9nKCc+IGNvbm5lY3Qgb3V0cHV0OiAnLCAoYS5uYW1lIHx8IGEuY29uc3RydWN0b3IubmFtZSksICd0byBpbnB1dDonLCAoYi5uYW1lIHx8IGIuY29uc3RydWN0b3IubmFtZSkpO1xuICAgIG91dHB1dC5jb25uZWN0KGIpO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5fY29ubmVjdFRvRGVzdGluYXRpb24gPSBmdW5jdGlvbihkZXN0aW5hdGlvbikge1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoLFxuICAgICAgICBsYXN0Tm9kZSA9IGwgPyB0aGlzLl9ub2RlTGlzdFtsIC0gMV0gOiB0aGlzLl9zb3VyY2VOb2RlO1xuXG4gICAgaWYobGFzdE5vZGUpIHtcbiAgICAgICAgdGhpcy5fY29ubmVjdChsYXN0Tm9kZSwgZGVzdGluYXRpb24pO1xuICAgIH1cblxuICAgIHRoaXMuX2Rlc3RpbmF0aW9uID0gZGVzdGluYXRpb247XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLl91cGRhdGVDb25uZWN0aW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlKSB7IHJldHVybjsgfVxuXG4gICAgLy9jb25zb2xlLmxvZygndXBkYXRlQ29ubmVjdGlvbnM6JywgdGhpcy5fbm9kZUxpc3QubGVuZ3RoKTtcblxuICAgIHZhciBub2RlLFxuICAgICAgICBwcmV2O1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9ub2RlTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICBub2RlID0gdGhpcy5fbm9kZUxpc3RbaV07XG4gICAgICAgIC8vY29uc29sZS5sb2coaSwgbm9kZSk7XG4gICAgICAgIHByZXYgPSBpID09PSAwID8gdGhpcy5fc291cmNlTm9kZSA6IHRoaXMuX25vZGVMaXN0W2kgLSAxXTtcbiAgICAgICAgdGhpcy5fY29ubmVjdChwcmV2LCBub2RlKTtcbiAgICB9XG5cbiAgICBpZih0aGlzLl9kZXN0aW5hdGlvbikge1xuICAgICAgICB0aGlzLl9jb25uZWN0VG9EZXN0aW5hdGlvbih0aGlzLl9kZXN0aW5hdGlvbik7XG4gICAgfVxufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEVmZmVjdC5wcm90b3R5cGUsICdwYW5uaW5nJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCF0aGlzLl9wYW5uaW5nKSB7XG4gICAgICAgICAgICB0aGlzLl9wYW5uaW5nID0gbmV3IFBhbm5lcih0aGlzLl9jb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fcGFubmluZztcbiAgICB9XG59KTtcblxuLypcbiAqIEVmZmVjdHNcbiAqL1xuXG5FZmZlY3QucHJvdG90eXBlLmFuYWx5c2VyID0gZnVuY3Rpb24oZmZ0U2l6ZSwgc21vb3RoaW5nLCBtaW5EZWNpYmVscywgbWF4RGVjaWJlbHMpIHtcbiAgICB2YXIgYW5hbHlzZXIgPSBuZXcgQW5hbHlzZXIodGhpcy5fY29udGV4dCwgZmZ0U2l6ZSwgc21vb3RoaW5nLCBtaW5EZWNpYmVscywgbWF4RGVjaWJlbHMpO1xuICAgIHJldHVybiB0aGlzLmFkZChhbmFseXNlcik7XG59O1xuXG4vLyBsb3dlcnMgdGhlIHZvbHVtZSBvZiB0aGUgbG91ZGVzdCBwYXJ0cyBvZiB0aGUgc2lnbmFsIGFuZCByYWlzZXMgdGhlIHZvbHVtZSBvZiB0aGUgc29mdGVzdCBwYXJ0c1xuRWZmZWN0LnByb3RvdHlwZS5jb21wcmVzc29yID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuXG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcigpO1xuXG4gICAgbm9kZS51cGRhdGUgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICAgICAgLy8gbWluIGRlY2liZWxzIHRvIHN0YXJ0IGNvbXByZXNzaW5nIGF0IGZyb20gLTEwMCB0byAwXG4gICAgICAgIG5vZGUudGhyZXNob2xkLnZhbHVlID0gY29uZmlnLnRocmVzaG9sZCAhPT0gdW5kZWZpbmVkID8gY29uZmlnLnRocmVzaG9sZCA6IC0yNDtcbiAgICAgICAgLy8gZGVjaWJlbCB2YWx1ZSB0byBzdGFydCBjdXJ2ZSB0byBjb21wcmVzc2VkIHZhbHVlIGZyb20gMCB0byA0MFxuICAgICAgICBub2RlLmtuZWUudmFsdWUgPSBjb25maWcua25lZSAhPT0gdW5kZWZpbmVkID8gY29uZmlnLmtuZWUgOiAzMDtcbiAgICAgICAgLy8gYW1vdW50IG9mIGNoYW5nZSBwZXIgZGVjaWJlbCBmcm9tIDEgdG8gMjBcbiAgICAgICAgbm9kZS5yYXRpby52YWx1ZSA9IGNvbmZpZy5yYXRpbyAhPT0gdW5kZWZpbmVkID8gY29uZmlnLnJhdGlvIDogMTI7XG4gICAgICAgIC8vIGdhaW4gcmVkdWN0aW9uIGN1cnJlbnRseSBhcHBsaWVkIGJ5IGNvbXByZXNzb3IgZnJvbSAtMjAgdG8gMFxuICAgICAgICBub2RlLnJlZHVjdGlvbi52YWx1ZSA9IGNvbmZpZy5yZWR1Y3Rpb24gIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5yZWR1Y3Rpb24gOiAtMTA7XG4gICAgICAgIC8vIHNlY29uZHMgdG8gcmVkdWNlIGdhaW4gYnkgMTBkYiBmcm9tIDAgdG8gMSAtIGhvdyBxdWlja2x5IHNpZ25hbCBhZGFwdGVkIHdoZW4gdm9sdW1lIGluY3JlYXNlZFxuICAgICAgICBub2RlLmF0dGFjay52YWx1ZSA9IGNvbmZpZy5hdHRhY2sgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5hdHRhY2sgOiAwLjAwMDM7XG4gICAgICAgIC8vIHNlY29uZHMgdG8gaW5jcmVhc2UgZ2FpbiBieSAxMGRiIGZyb20gMCB0byAxIC0gaG93IHF1aWNrbHkgc2lnbmFsIGFkYXB0ZWQgd2hlbiB2b2x1bWUgcmVkY3VjZWRcbiAgICAgICAgbm9kZS5yZWxlYXNlLnZhbHVlID0gY29uZmlnLnJlbGVhc2UgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5yZWxlYXNlIDogMC4yNTtcbiAgICB9O1xuXG4gICAgbm9kZS51cGRhdGUoY29uZmlnKTtcblxuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuY29udm9sdmVyID0gZnVuY3Rpb24oaW1wdWxzZVJlc3BvbnNlKSB7XG4gICAgLy8gaW1wdWxzZVJlc3BvbnNlIGlzIGFuIGF1ZGlvIGZpbGUgYnVmZmVyXG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUNvbnZvbHZlcigpO1xuICAgIG5vZGUuYnVmZmVyID0gaW1wdWxzZVJlc3BvbnNlO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbih0aW1lKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZURlbGF5KCk7XG4gICAgaWYodGltZSAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuZGVsYXlUaW1lLnZhbHVlID0gdGltZTsgfVxuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuZWNobyA9IGZ1bmN0aW9uKHRpbWUsIGdhaW4pIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBFY2hvKHRoaXMuX2NvbnRleHQsIHRpbWUsIGdhaW4pO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuZGlzdG9ydGlvbiA9IGZ1bmN0aW9uKGFtb3VudCkge1xuICAgIHZhciBub2RlID0gbmV3IERpc3RvcnRpb24odGhpcy5fY29udGV4dCwgYW1vdW50KTtcbiAgICAvLyBGbG9hdDMyQXJyYXkgZGVmaW5pbmcgY3VydmUgKHZhbHVlcyBhcmUgaW50ZXJwb2xhdGVkKVxuICAgIC8vbm9kZS5jdXJ2ZVxuICAgIC8vIHVwLXNhbXBsZSBiZWZvcmUgYXBwbHlpbmcgY3VydmUgZm9yIGJldHRlciByZXNvbHV0aW9uIHJlc3VsdCAnbm9uZScsICcyeCcgb3IgJzR4J1xuICAgIC8vbm9kZS5vdmVyc2FtcGxlID0gJzJ4JztcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uKHR5cGUsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHZhciBmaWx0ZXIgPSBuZXcgRmlsdGVyKHRoaXMuX2NvbnRleHQsIHR5cGUsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG4gICAgcmV0dXJuIHRoaXMuYWRkKGZpbHRlcik7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLmxvd3Bhc3MgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2xvd3Bhc3MnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5oaWdocGFzcyA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignaGlnaHBhc3MnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5iYW5kcGFzcyA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignYmFuZHBhc3MnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5sb3dzaGVsZiA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignbG93c2hlbGYnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5oaWdoc2hlbGYgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2hpZ2hzaGVsZicsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnBlYWtpbmcgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ3BlYWtpbmcnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5ub3RjaCA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignbm90Y2gnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5hbGxwYXNzID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdhbGxwYXNzJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuZmxhbmdlciA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBub2RlID0gbmV3IEZsYW5nZXIodGhpcy5fY29udGV4dCwgY29uZmlnKTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLmdhaW4gPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBub2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgaWYodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBub2RlLmdhaW4udmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnBhbm5lciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBub2RlID0gbmV3IFBhbm5lcih0aGlzLl9jb250ZXh0KTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnBoYXNlciA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciBub2RlID0gbmV3IFBoYXNlcih0aGlzLl9jb250ZXh0LCBjb25maWcpO1xuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUucmVjb3JkZXIgPSBmdW5jdGlvbihwYXNzVGhyb3VnaCkge1xuICAgIHZhciBub2RlID0gbmV3IFJlY29yZGVyKHRoaXMuX2NvbnRleHQsIHBhc3NUaHJvdWdoKTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnJldmVyYiA9IGZ1bmN0aW9uKHNlY29uZHMsIGRlY2F5LCByZXZlcnNlKSB7XG4gICAgdmFyIG5vZGUgPSBuZXcgUmV2ZXJiKHRoaXMuX2NvbnRleHQsIHNlY29uZHMsIGRlY2F5LCByZXZlcnNlKTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnNjcmlwdCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgICAvLyBidWZmZXJTaXplIDI1NiAtIDE2Mzg0IChwb3cgMilcbiAgICB2YXIgYnVmZmVyU2l6ZSA9IGNvbmZpZy5idWZmZXJTaXplIHx8IDEwMjQ7XG4gICAgdmFyIGlucHV0Q2hhbm5lbHMgPSBjb25maWcuaW5wdXRDaGFubmVscyA9PT0gdW5kZWZpbmVkID8gMCA6IGlucHV0Q2hhbm5lbHM7XG4gICAgdmFyIG91dHB1dENoYW5uZWxzID0gY29uZmlnLm91dHB1dENoYW5uZWxzID09PSB1bmRlZmluZWQgPyAxIDogb3V0cHV0Q2hhbm5lbHM7XG4gICAgXG4gICAgdmFyIG5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3NvcihidWZmZXJTaXplLCBpbnB1dENoYW5uZWxzLCBvdXRwdXRDaGFubmVscyk7XG4gICAgXG4gICAgdmFyIHRoaXNBcmcgPSBjb25maWcudGhpc0FyZyB8fCBjb25maWcuY29udGV4dCB8fCBub2RlO1xuICAgIHZhciBjYWxsYmFjayA9IGNvbmZpZy5jYWxsYmFjayB8fCBmdW5jdGlvbigpIHt9O1xuXG4gICAgLy8gYXZhaWxhYmxlIHByb3BzOlxuICAgIC8qXG4gICAgZXZlbnQuaW5wdXRCdWZmZXJcbiAgICBldmVudC5vdXRwdXRCdWZmZXJcbiAgICBldmVudC5wbGF5YmFja1RpbWVcbiAgICAqL1xuICAgIC8vIEV4YW1wbGU6IGdlbmVyYXRlIG5vaXNlXG4gICAgLypcbiAgICB2YXIgb3V0cHV0ID0gZXZlbnQub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgIHZhciBsID0gb3V0cHV0Lmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICBvdXRwdXRbaV0gPSBNYXRoLnJhbmRvbSgpO1xuICAgIH1cbiAgICAqL1xuICAgIG5vZGUub25hdWRpb3Byb2Nlc3MgPSBjYWxsYmFjay5iaW5kKHRoaXNBcmcpO1xuXG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5zZXRTb3VyY2UgPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG5vZGU7XG4gICAgdGhpcy5fdXBkYXRlQ29ubmVjdGlvbnMoKTtcbiAgICByZXR1cm4gbm9kZTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuc2V0RGVzdGluYXRpb24gPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdGhpcy5fY29ubmVjdFRvRGVzdGluYXRpb24obm9kZSk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVmZmVjdDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQW5hbHlzZXIoY29udGV4dCwgZmZ0U2l6ZSwgc21vb3RoaW5nLCBtaW5EZWNpYmVscywgbWF4RGVjaWJlbHMpIHtcbiAgICBmZnRTaXplID0gZmZ0U2l6ZSB8fCAzMjtcbiAgICB2YXIgd2F2ZWZvcm1EYXRhLCBmcmVxdWVuY3lEYXRhO1xuXG4gICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZUFuYWx5c2VyKCk7XG4gICAgbm9kZS5mZnRTaXplID0gZmZ0U2l6ZTsgLy8gZnJlcXVlbmN5QmluQ291bnQgd2lsbCBiZSBoYWxmIHRoaXMgdmFsdWVcblxuICAgIGlmKHNtb290aGluZyAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gc21vb3RoaW5nOyB9XG4gICAgaWYobWluRGVjaWJlbHMgIT09IHVuZGVmaW5lZCkgeyBub2RlLm1pbkRlY2liZWxzID0gbWluRGVjaWJlbHM7IH1cbiAgICBpZihtYXhEZWNpYmVscyAhPT0gdW5kZWZpbmVkKSB7IG5vZGUubWF4RGVjaWJlbHMgPSBtYXhEZWNpYmVsczsgfVxuXG4gICAgdmFyIHVwZGF0ZUZGVFNpemUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoZmZ0U2l6ZSAhPT0gbm9kZS5mZnRTaXplIHx8IHdhdmVmb3JtRGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB3YXZlZm9ybURhdGEgPSBuZXcgVWludDhBcnJheShub2RlLmZmdFNpemUpO1xuICAgICAgICAgICAgZnJlcXVlbmN5RGF0YSA9IG5ldyBVaW50OEFycmF5KG5vZGUuZnJlcXVlbmN5QmluQ291bnQpO1xuICAgICAgICAgICAgZmZ0U2l6ZSA9IG5vZGUuZmZ0U2l6ZTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdXBkYXRlRkZUU2l6ZSgpO1xuXG4gICAgbm9kZS5nZXRXYXZlZm9ybSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB1cGRhdGVGRlRTaXplKCk7XG4gICAgICAgIHRoaXMuZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKHdhdmVmb3JtRGF0YSk7XG4gICAgICAgIHJldHVybiB3YXZlZm9ybURhdGE7XG4gICAgfTtcblxuICAgIG5vZGUuZ2V0RnJlcXVlbmNpZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdXBkYXRlRkZUU2l6ZSgpO1xuICAgICAgICB0aGlzLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGZyZXF1ZW5jeURhdGEpO1xuICAgICAgICByZXR1cm4gZnJlcXVlbmN5RGF0YTtcbiAgICB9O1xuXG4gICAgLy8gbWFwIG5hdGl2ZSBwcm9wZXJ0aWVzIG9mIEFuYWx5c2VyTm9kZVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgJ3Ntb290aGluZyc6IHtcbiAgICAgICAgICAgIC8vIDAgdG8gMVxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG5vZGUuc21vb3RoaW5nVGltZUNvbnN0YW50OyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBub2RlLnNtb290aGluZ1RpbWVDb25zdGFudCA9IHZhbHVlOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFuYWx5c2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBEaXN0b3J0aW9uKGNvbnRleHQsIGFtb3VudCkge1xuXG4gICAgYW1vdW50ID0gYW1vdW50IHx8IDE7XG4gICAgXG4gICAgdmFyIG5vZGUgPSBjb250ZXh0LmNyZWF0ZVdhdmVTaGFwZXIoKTtcblxuICAgIC8vIGNyZWF0ZSB3YXZlU2hhcGVyIGRpc3RvcnRpb24gY3VydmUgZnJvbSAwIHRvIDFcbiAgICBub2RlLnVwZGF0ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGFtb3VudCA9IHZhbHVlO1xuICAgICAgICB2YXIgayA9IHZhbHVlICogMTAwLFxuICAgICAgICAgICAgbiA9IDIyMDUwLFxuICAgICAgICAgICAgY3VydmUgPSBuZXcgRmxvYXQzMkFycmF5KG4pLFxuICAgICAgICAgICAgZGVnID0gTWF0aC5QSSAvIDE4MCxcbiAgICAgICAgICAgIHg7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIHggPSBpICogMiAvIG4gLSAxO1xuICAgICAgICAgICAgY3VydmVbaV0gPSAoMyArIGspICogeCAqIDIwICogZGVnIC8gKE1hdGguUEkgKyBrICogTWF0aC5hYnMoeCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jdXJ2ZSA9IGN1cnZlO1xuICAgIH07XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgICdhbW91bnQnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gYW1vdW50OyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB0aGlzLnVwZGF0ZSh2YWx1ZSk7IH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYoYW1vdW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbm9kZS51cGRhdGUoYW1vdW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBEaXN0b3J0aW9uO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBFY2hvKGNvbnRleHQsIGRlbGF5VGltZSwgZ2FpblZhbHVlKSB7XG4gICAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGRlbGF5ID0gY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIHZhciBnYWluID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgZ2Fpbi5nYWluLnZhbHVlID0gZ2FpblZhbHVlIHx8IDAuNTtcbiAgICBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBkZWxheVRpbWUgfHwgMC41O1xuXG4gICAgaW5wdXQuY29ubmVjdChkZWxheSk7XG4gICAgaW5wdXQuY29ubmVjdChvdXRwdXQpO1xuICAgIGRlbGF5LmNvbm5lY3QoZ2Fpbik7XG4gICAgZ2Fpbi5jb25uZWN0KGRlbGF5KTtcbiAgICBnYWluLmNvbm5lY3Qob3V0cHV0KTtcblxuICAgIHZhciBub2RlID0gaW5wdXQ7XG4gICAgbm9kZS5uYW1lID0gJ0VjaG8nO1xuICAgIG5vZGUuX291dHB1dCA9IG91dHB1dDtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBkZWxheS5kZWxheVRpbWUudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGZlZWRiYWNrOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZ2Fpbi5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBnYWluLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFY2hvO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGYWtlQ29udGV4dCgpIHtcblxuICAgIHZhciBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgdmFyIGZuID0gZnVuY3Rpb24oKXt9O1xuXG4gICAgdmFyIHBhcmFtID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogMSxcbiAgICAgICAgICAgIGRlZmF1bHRWYWx1ZTogMSxcbiAgICAgICAgICAgIGxpbmVhclJhbXBUb1ZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgICAgIHNldFZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgICAgIGV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWU6IGZuLFxuICAgICAgICAgICAgc2V0VGFyZ2V0QXRUaW1lOiBmbixcbiAgICAgICAgICAgIHNldFZhbHVlQ3VydmVBdFRpbWU6IGZuLFxuICAgICAgICAgICAgY2FuY2VsU2NoZWR1bGVkVmFsdWVzOiBmblxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICB2YXIgZmFrZU5vZGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNvbm5lY3Q6Zm4sXG4gICAgICAgICAgICBkaXNjb25uZWN0OmZuLFxuICAgICAgICAgICAgLy8gYW5hbHlzZXJcbiAgICAgICAgICAgIGZyZXF1ZW5jeUJpbkNvdW50OiAwLFxuICAgICAgICAgICAgc21vb3RoaW5nVGltZUNvbnN0YW50OiAwLFxuICAgICAgICAgICAgZmZ0U2l6ZTogMCxcbiAgICAgICAgICAgIG1pbkRlY2liZWxzOiAwLFxuICAgICAgICAgICAgbWF4RGVjaWJlbHM6IDAsXG4gICAgICAgICAgICBnZXRCeXRlVGltZURvbWFpbkRhdGE6IGZuLFxuICAgICAgICAgICAgZ2V0Qnl0ZUZyZXF1ZW5jeURhdGE6IGZuLFxuICAgICAgICAgICAgZ2V0RmxvYXRUaW1lRG9tYWluRGF0YTogZm4sXG4gICAgICAgICAgICBnZXRGbG9hdEZyZXF1ZW5jeURhdGE6IGZuLFxuICAgICAgICAgICAgLy8gZ2FpblxuICAgICAgICAgICAgZ2FpbjogcGFyYW0oKSxcbiAgICAgICAgICAgIC8vIHBhbm5lclxuICAgICAgICAgICAgcGFubmluZ01vZGVsOiAwLFxuICAgICAgICAgICAgc2V0UG9zaXRpb246IGZuLFxuICAgICAgICAgICAgc2V0T3JpZW50YXRpb246IGZuLFxuICAgICAgICAgICAgc2V0VmVsb2NpdHk6IGZuLFxuICAgICAgICAgICAgZGlzdGFuY2VNb2RlbDogMCxcbiAgICAgICAgICAgIHJlZkRpc3RhbmNlOiAwLFxuICAgICAgICAgICAgbWF4RGlzdGFuY2U6IDAsXG4gICAgICAgICAgICByb2xsb2ZmRmFjdG9yOiAwLFxuICAgICAgICAgICAgY29uZUlubmVyQW5nbGU6IDM2MCxcbiAgICAgICAgICAgIGNvbmVPdXRlckFuZ2xlOiAzNjAsXG4gICAgICAgICAgICBjb25lT3V0ZXJHYWluOiAwLFxuICAgICAgICAgICAgLy8gZmlsdGVyOlxuICAgICAgICAgICAgdHlwZTowLFxuICAgICAgICAgICAgZnJlcXVlbmN5OiBwYXJhbSgpLFxuICAgICAgICAgICAgLy8gZGVsYXlcbiAgICAgICAgICAgIGRlbGF5VGltZTogcGFyYW0oKSxcbiAgICAgICAgICAgIC8vIGNvbnZvbHZlclxuICAgICAgICAgICAgYnVmZmVyOiAwLFxuICAgICAgICAgICAgLy8gY29tcHJlc3NvclxuICAgICAgICAgICAgdGhyZXNob2xkOiBwYXJhbSgpLFxuICAgICAgICAgICAga25lZTogcGFyYW0oKSxcbiAgICAgICAgICAgIHJhdGlvOiBwYXJhbSgpLFxuICAgICAgICAgICAgYXR0YWNrOiBwYXJhbSgpLFxuICAgICAgICAgICAgcmVsZWFzZTogcGFyYW0oKSxcbiAgICAgICAgICAgIHJlZHVjdGlvbjogcGFyYW0oKSxcbiAgICAgICAgICAgIC8vIGRpc3RvcnRpb25cbiAgICAgICAgICAgIG92ZXJzYW1wbGU6IDAsXG4gICAgICAgICAgICBjdXJ2ZTogMCxcbiAgICAgICAgICAgIC8vIGJ1ZmZlclxuICAgICAgICAgICAgc2FtcGxlUmF0ZTogMSxcbiAgICAgICAgICAgIGxlbmd0aDogMCxcbiAgICAgICAgICAgIGR1cmF0aW9uOiAwLFxuICAgICAgICAgICAgbnVtYmVyT2ZDaGFubmVsczogMCxcbiAgICAgICAgICAgIGdldENoYW5uZWxEYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29weUZyb21DaGFubmVsOiBmbixcbiAgICAgICAgICAgIGNvcHlUb0NoYW5uZWw6IGZuLFxuICAgICAgICAgICAgLy8gbGlzdGVuZXJcbiAgICAgICAgICAgIGRvcHBsZXJGYWN0b3I6IDAsXG4gICAgICAgICAgICBzcGVlZE9mU291bmQ6IDAsXG4gICAgICAgICAgICAvLyBvc2NcbiAgICAgICAgICAgIHN0YXJ0OiBmblxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICAvLyBpZTlcbiAgICBpZighd2luZG93LlVpbnQ4QXJyYXkpIHtcbiAgICAgICAgd2luZG93LkludDhBcnJheSA9XG4gICAgICAgIHdpbmRvdy5VaW50OEFycmF5ID1cbiAgICAgICAgd2luZG93LlVpbnQ4Q2xhbXBlZEFycmF5ID1cbiAgICAgICAgd2luZG93LkludDE2QXJyYXkgPVxuICAgICAgICB3aW5kb3cuVWludDE2QXJyYXkgPVxuICAgICAgICB3aW5kb3cuSW50MzJBcnJheSA9XG4gICAgICAgIHdpbmRvdy5VaW50MzJBcnJheSA9XG4gICAgICAgIHdpbmRvdy5GbG9hdDMyQXJyYXkgPVxuICAgICAgICB3aW5kb3cuRmxvYXQ2NEFycmF5ID0gQXJyYXk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgY3JlYXRlQW5hbHlzZXI6IGZha2VOb2RlLFxuICAgICAgICBjcmVhdGVCdWZmZXI6IGZha2VOb2RlLFxuICAgICAgICBjcmVhdGVCaXF1YWRGaWx0ZXI6IGZha2VOb2RlLFxuICAgICAgICBjcmVhdGVDaGFubmVsTWVyZ2VyOiBmYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlQ2hhbm5lbFNwbGl0dGVyOiBmYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlRHluYW1pY3NDb21wcmVzc29yOiBmYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlQ29udm9sdmVyOiBmYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlRGVsYXk6IGZha2VOb2RlLFxuICAgICAgICBjcmVhdGVHYWluOiBmYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlT3NjaWxsYXRvcjogZmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZVBhbm5lcjogZmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZVNjcmlwdFByb2Nlc3NvcjogZmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZVdhdmVTaGFwZXI6IGZha2VOb2RlLFxuICAgICAgICBsaXN0ZW5lcjogZmFrZU5vZGUoKSxcbiAgICAgICAgZ2V0IGN1cnJlbnRUaW1lKCkge1xuICAgICAgICAgICAgcmV0dXJuIChEYXRlLm5vdygpIC0gc3RhcnRUaW1lKSAvIDEwMDA7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZha2VDb250ZXh0O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBGaWx0ZXIoY29udGV4dCwgdHlwZSwgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgLy8gRnJlcXVlbmN5IGJldHdlZW4gNDBIeiBhbmQgaGFsZiBvZiB0aGUgc2FtcGxpbmcgcmF0ZVxuICAgIHZhciBtaW5GcmVxdWVuY3kgPSA0MDtcbiAgICB2YXIgbWF4RnJlcXVlbmN5ID0gY29udGV4dC5zYW1wbGVSYXRlIC8gMjtcblxuICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgICBub2RlLnR5cGUgPSB0eXBlO1xuXG4gICAgaWYoZnJlcXVlbmN5ICE9PSB1bmRlZmluZWQpIHsgbm9kZS5mcmVxdWVuY3kudmFsdWUgPSBmcmVxdWVuY3k7IH1cbiAgICBpZihxdWFsaXR5ICE9PSB1bmRlZmluZWQpIHsgbm9kZS5RLnZhbHVlID0gcXVhbGl0eTsgfVxuICAgIGlmKGdhaW4gIT09IHVuZGVmaW5lZCkgeyBub2RlLmdhaW4udmFsdWUgPSBnYWluOyB9XG5cblxuICAgIHZhciBnZXRGcmVxdWVuY3kgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBMb2dhcml0aG0gKGJhc2UgMikgdG8gY29tcHV0ZSBob3cgbWFueSBvY3RhdmVzIGZhbGwgaW4gdGhlIHJhbmdlLlxuICAgICAgICB2YXIgbnVtYmVyT2ZPY3RhdmVzID0gTWF0aC5sb2cobWF4RnJlcXVlbmN5IC8gbWluRnJlcXVlbmN5KSAvIE1hdGguTE4yO1xuICAgICAgICAvLyBDb21wdXRlIGEgbXVsdGlwbGllciBmcm9tIDAgdG8gMSBiYXNlZCBvbiBhbiBleHBvbmVudGlhbCBzY2FsZS5cbiAgICAgICAgdmFyIG11bHRpcGxpZXIgPSBNYXRoLnBvdygyLCBudW1iZXJPZk9jdGF2ZXMgKiAodmFsdWUgLSAxLjApKTtcbiAgICAgICAgLy8gR2V0IGJhY2sgdG8gdGhlIGZyZXF1ZW5jeSB2YWx1ZSBiZXR3ZWVuIG1pbiBhbmQgbWF4LlxuICAgICAgICByZXR1cm4gbWF4RnJlcXVlbmN5ICogbXVsdGlwbGllcjtcbiAgICB9O1xuXG4gICAgbm9kZS51cGRhdGUgPSBmdW5jdGlvbihmcmVxdWVuY3ksIGdhaW4pIHtcbiAgICAgICAgaWYoZnJlcXVlbmN5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZnJlcXVlbmN5LnZhbHVlID0gZnJlcXVlbmN5O1xuICAgICAgICB9XG4gICAgICAgIGlmKGdhaW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5nYWluLnZhbHVlID0gZ2FpbjtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBub2RlLnNldEJ5UGVyY2VudCA9IGZ1bmN0aW9uKHBlcmNlbnQsIHF1YWxpdHksIGdhaW4pIHtcbiAgICAgICAgLy8gc2V0IGZpbHRlciBmcmVxdWVuY3kgYmFzZWQgb24gdmFsdWUgZnJvbSAwIHRvIDFcbiAgICAgICAgbm9kZS5mcmVxdWVuY3kudmFsdWUgPSBnZXRGcmVxdWVuY3kocGVyY2VudCk7XG4gICAgICAgIGlmKHF1YWxpdHkgIT09IHVuZGVmaW5lZCkgeyBub2RlLlEudmFsdWUgPSBxdWFsaXR5OyB9XG4gICAgICAgIGlmKGdhaW4gIT09IHVuZGVmaW5lZCkgeyBub2RlLmdhaW4udmFsdWUgPSBnYWluOyB9XG4gICAgfTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbHRlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTW9ub0ZsYW5nZXIoY29udGV4dCwgY29uZmlnKSB7XG4gICAgdmFyIGZlZWRiYWNrR2FpbiA9IGNvbmZpZy5mZWVkYmFjayB8fCAwLjUsXG4gICAgICAgIGRlbGF5VGltZSA9IGNvbmZpZy5kZWxheSB8fCAwLjAwNSxcbiAgICAgICAgbGZvR2FpbiA9IGNvbmZpZy5nYWluIHx8IDAuMDAyLFxuICAgICAgICBsZm9GcmVxID0gY29uZmlnLmZyZXF1ZW5jeSB8fCAwLjI1O1xuXG4gICAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGRlbGF5ID0gY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIHZhciBmZWVkYmFjayA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBsZm8gPSBjb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICB2YXIgZ2FpbiA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBvdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgIGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5VGltZTsgLy8gNS0yNW1zIGRlbGF5ICgwLjAwNSA+IDAuMDI1KVxuICAgIGZlZWRiYWNrLmdhaW4udmFsdWUgPSBmZWVkYmFja0dhaW47IC8vIDAgPiAxXG5cbiAgICBsZm8udHlwZSA9ICdzaW5lJztcbiAgICBsZm8uZnJlcXVlbmN5LnZhbHVlID0gbGZvRnJlcTsgLy8gMC4wNSA+IDVcbiAgICBnYWluLmdhaW4udmFsdWUgPSBsZm9HYWluOyAvLyAwLjAwMDUgPiAwLjAwNVxuXG4gICAgaW5wdXQuY29ubmVjdChvdXRwdXQpO1xuICAgIGlucHV0LmNvbm5lY3QoZGVsYXkpO1xuICAgIGRlbGF5LmNvbm5lY3Qob3V0cHV0KTtcbiAgICBkZWxheS5jb25uZWN0KGZlZWRiYWNrKTtcbiAgICBmZWVkYmFjay5jb25uZWN0KGlucHV0KTtcblxuICAgIGxmby5jb25uZWN0KGdhaW4pO1xuICAgIGdhaW4uY29ubmVjdChkZWxheS5kZWxheVRpbWUpO1xuICAgIGxmby5zdGFydCgwKTtcbiAgICBcbiAgICB2YXIgbm9kZSA9IGlucHV0O1xuICAgIG5vZGUubmFtZSA9ICdGbGFuZ2VyJztcbiAgICBub2RlLl9vdXRwdXQgPSBvdXRwdXQ7XG4gICAgXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGRlbGF5LmRlbGF5VGltZS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZGVsYXkuZGVsYXlUaW1lLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgbGZvRnJlcXVlbmN5OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbGZvLmZyZXF1ZW5jeS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbGZvLmZyZXF1ZW5jeS52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGxmb0dhaW46IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBnYWluLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGdhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGZlZWRiYWNrOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmVlZGJhY2suZ2Fpbi52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZmVlZGJhY2suZ2Fpbi52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBTdGVyZW9GbGFuZ2VyKGNvbnRleHQsIGNvbmZpZykge1xuICAgIHZhciBmZWVkYmFja0dhaW4gPSBjb25maWcuZmVlZGJhY2sgfHwgMC41LFxuICAgICAgICBkZWxheVRpbWUgPSBjb25maWcuZGVsYXkgfHwgMC4wMDMsXG4gICAgICAgIGxmb0dhaW4gPSBjb25maWcuZ2FpbiB8fCAwLjAwNSxcbiAgICAgICAgbGZvRnJlcSA9IGNvbmZpZy5mcmVxdWVuY3kgfHwgMC41O1xuXG4gICAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIHNwbGl0dGVyID0gY29udGV4dC5jcmVhdGVDaGFubmVsU3BsaXR0ZXIoMik7XG4gICAgdmFyIG1lcmdlciA9IGNvbnRleHQuY3JlYXRlQ2hhbm5lbE1lcmdlcigyKTtcbiAgICB2YXIgZmVlZGJhY2tMID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGZlZWRiYWNrUiA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBsZm8gPSBjb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKTtcbiAgICB2YXIgbGZvR2FpbkwgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgbGZvR2FpblIgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgZGVsYXlMID0gY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIHZhciBkZWxheVIgPSBjb250ZXh0LmNyZWF0ZURlbGF5KCk7XG4gICAgdmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgZmVlZGJhY2tMLmdhaW4udmFsdWUgPSBmZWVkYmFja1IuZ2Fpbi52YWx1ZSA9IGZlZWRiYWNrR2FpbjtcbiAgICBkZWxheUwuZGVsYXlUaW1lLnZhbHVlID0gZGVsYXlSLmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5VGltZTtcblxuICAgIGxmby50eXBlID0gJ3NpbmUnO1xuICAgIGxmby5mcmVxdWVuY3kudmFsdWUgPSBsZm9GcmVxO1xuICAgIGxmb0dhaW5MLmdhaW4udmFsdWUgPSBsZm9HYWluO1xuICAgIGxmb0dhaW5SLmdhaW4udmFsdWUgPSAwIC0gbGZvR2FpbjtcblxuICAgIGlucHV0LmNvbm5lY3Qoc3BsaXR0ZXIpO1xuICAgIFxuICAgIHNwbGl0dGVyLmNvbm5lY3QoZGVsYXlMLCAwKTtcbiAgICBzcGxpdHRlci5jb25uZWN0KGRlbGF5UiwgMSk7XG4gICAgXG4gICAgZGVsYXlMLmNvbm5lY3QoZmVlZGJhY2tMKTtcbiAgICBkZWxheVIuY29ubmVjdChmZWVkYmFja1IpO1xuXG4gICAgZmVlZGJhY2tMLmNvbm5lY3QoZGVsYXlSKTtcbiAgICBmZWVkYmFja1IuY29ubmVjdChkZWxheUwpO1xuXG4gICAgZGVsYXlMLmNvbm5lY3QobWVyZ2VyLCAwLCAwKTtcbiAgICBkZWxheVIuY29ubmVjdChtZXJnZXIsIDAsIDEpO1xuXG4gICAgbWVyZ2VyLmNvbm5lY3Qob3V0cHV0KTtcbiAgICBpbnB1dC5jb25uZWN0KG91dHB1dCk7XG5cbiAgICBsZm8uY29ubmVjdChsZm9HYWluTCk7XG4gICAgbGZvLmNvbm5lY3QobGZvR2FpblIpO1xuICAgIGxmb0dhaW5MLmNvbm5lY3QoZGVsYXlMLmRlbGF5VGltZSk7XG4gICAgbGZvR2FpblIuY29ubmVjdChkZWxheVIuZGVsYXlUaW1lKTtcbiAgICBsZm8uc3RhcnQoMCk7XG5cbiAgICB2YXIgbm9kZSA9IGlucHV0O1xuICAgIG5vZGUubmFtZSA9ICdTdGVyZW9GbGFuZ2VyJztcbiAgICBub2RlLl9vdXRwdXQgPSBvdXRwdXQ7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZGVsYXlMLmRlbGF5VGltZS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZGVsYXlMLmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5Ui5kZWxheVRpbWUudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBsZm9GcmVxdWVuY3k6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBsZm8uZnJlcXVlbmN5LnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBsZm8uZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgbGZvR2Fpbjoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGxmb0dhaW5MLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGxmb0dhaW5MLmdhaW4udmFsdWUgPSBsZm9HYWluUi5nYWluLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgZmVlZGJhY2s6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBmZWVkYmFja0wuZ2Fpbi52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZmVlZGJhY2tMLmdhaW4udmFsdWUgPSBmZWVkYmFja1IuZ2Fpbi52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5mdW5jdGlvbiBGbGFuZ2VyKGNvbnRleHQsIGNvbmZpZykge1xuICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgICByZXR1cm4gY29uZmlnLnN0ZXJlbyA/IG5ldyBTdGVyZW9GbGFuZ2VyKGNvbnRleHQsIGNvbmZpZykgOiBuZXcgTW9ub0ZsYW5nZXIoY29udGV4dCwgY29uZmlnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGbGFuZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBQYW5uZXIoY29udGV4dCkge1xuICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVQYW5uZXIoKTtcbiAgICAvLyBEZWZhdWx0IGZvciBzdGVyZW8gaXMgJ0hSVEYnIGNhbiBhbHNvIGJlICdlcXVhbHBvd2VyJ1xuICAgIG5vZGUucGFubmluZ01vZGVsID0gUGFubmVyLmRlZmF1bHRzLnBhbm5pbmdNb2RlbDtcblxuICAgIC8vIERpc3RhbmNlIG1vZGVsIGFuZCBhdHRyaWJ1dGVzXG4gICAgLy8gQ2FuIGJlICdsaW5lYXInICdpbnZlcnNlJyAnZXhwb25lbnRpYWwnXG4gICAgbm9kZS5kaXN0YW5jZU1vZGVsID0gUGFubmVyLmRlZmF1bHRzLmRpc3RhbmNlTW9kZWw7XG4gICAgbm9kZS5yZWZEaXN0YW5jZSA9IFBhbm5lci5kZWZhdWx0cy5yZWZEaXN0YW5jZTtcbiAgICBub2RlLm1heERpc3RhbmNlID0gUGFubmVyLmRlZmF1bHRzLm1heERpc3RhbmNlO1xuICAgIG5vZGUucm9sbG9mZkZhY3RvciA9IFBhbm5lci5kZWZhdWx0cy5yb2xsb2ZmRmFjdG9yO1xuICAgIG5vZGUuY29uZUlubmVyQW5nbGUgPSBQYW5uZXIuZGVmYXVsdHMuY29uZUlubmVyQW5nbGU7XG4gICAgbm9kZS5jb25lT3V0ZXJBbmdsZSA9IFBhbm5lci5kZWZhdWx0cy5jb25lT3V0ZXJBbmdsZTtcbiAgICBub2RlLmNvbmVPdXRlckdhaW4gPSBQYW5uZXIuZGVmYXVsdHMuY29uZU91dGVyR2FpbjtcbiAgICAvLyBzZXQgdG8gZGVmYXVsdHMgKG5lZWRlZCBpbiBGaXJlZm94KVxuICAgIG5vZGUuc2V0UG9zaXRpb24oMCwgMCwgMCk7XG4gICAgbm9kZS5zZXRPcmllbnRhdGlvbigwLCAwLCAwKTtcblxuICAgIC8vIHNpbXBsZSB2ZWMzIG9iamVjdCBwb29sXG4gICAgdmFyIFZlY1Bvb2wgPSB7XG4gICAgICAgIHBvb2w6IFtdLFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgICAgIHZhciB2ID0gdGhpcy5wb29sLmxlbmd0aCA/IHRoaXMucG9vbC5wb3AoKSA6IHsgeDogMCwgeTogMCwgejogMCB9O1xuICAgICAgICAgICAgLy8gY2hlY2sgaWYgYSB2ZWN0b3IgaGFzIGJlZW4gcGFzc2VkIGluXG4gICAgICAgICAgICBpZih4ICE9PSB1bmRlZmluZWQgJiYgaXNOYU4oeCkgJiYgJ3gnIGluIHggJiYgJ3knIGluIHggJiYgJ3onIGluIHgpIHtcbiAgICAgICAgICAgICAgICB2LnggPSB4LnggfHwgMDtcbiAgICAgICAgICAgICAgICB2LnkgPSB4LnkgfHwgMDtcbiAgICAgICAgICAgICAgICB2LnogPSB4LnogfHwgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHYueCA9IHggfHwgMDtcbiAgICAgICAgICAgICAgICB2LnkgPSB5IHx8IDA7XG4gICAgICAgICAgICAgICAgdi56ID0geiB8fCAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHY7XG4gICAgICAgIH0sXG4gICAgICAgIGRpc3Bvc2U6IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gICAgICAgICAgICB0aGlzLnBvb2wucHVzaChpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGdsb2JhbFVwID0gVmVjUG9vbC5nZXQoMCwgMSwgMCk7XG5cbiAgICB2YXIgc2V0T3JpZW50YXRpb24gPSBmdW5jdGlvbihub2RlLCBmdykge1xuICAgICAgICAvLyBzZXQgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBzb3VyY2UgKHdoZXJlIHRoZSBhdWRpbyBpcyBjb21pbmcgZnJvbSlcblxuICAgICAgICAvLyBjYWxjdWxhdGUgdXAgdmVjICggdXAgPSAoZm9yd2FyZCBjcm9zcyAoMCwgMSwgMCkpIGNyb3NzIGZvcndhcmQgKVxuICAgICAgICB2YXIgdXAgPSBWZWNQb29sLmdldChmdy54LCBmdy55LCBmdy56KTtcbiAgICAgICAgY3Jvc3ModXAsIGdsb2JhbFVwKTtcbiAgICAgICAgY3Jvc3ModXAsIGZ3KTtcbiAgICAgICAgbm9ybWFsaXplKHVwKTtcbiAgICAgICAgbm9ybWFsaXplKGZ3KTtcbiAgICAgICAgLy8gc2V0IHRoZSBhdWRpbyBjb250ZXh0J3MgbGlzdGVuZXIgcG9zaXRpb24gdG8gbWF0Y2ggdGhlIGNhbWVyYSBwb3NpdGlvblxuICAgICAgICBub2RlLnNldE9yaWVudGF0aW9uKGZ3LngsIGZ3LnksIGZ3LnosIHVwLngsIHVwLnksIHVwLnopO1xuXG4gICAgICAgIC8vIHJldHVybiB0aGUgdmVjcyB0byB0aGUgcG9vbFxuICAgICAgICBWZWNQb29sLmRpc3Bvc2UoZncpO1xuICAgICAgICBWZWNQb29sLmRpc3Bvc2UodXApO1xuICAgIH07XG5cbiAgICB2YXIgc2V0UG9zaXRpb24gPSBmdW5jdGlvbihub2RlLCB2ZWMpIHtcbiAgICAgICAgbm9kZS5zZXRQb3NpdGlvbih2ZWMueCwgdmVjLnksIHZlYy56KTtcbiAgICAgICAgVmVjUG9vbC5kaXNwb3NlKHZlYyk7XG4gICAgfTtcblxuICAgIHZhciBzZXRWZWxvY2l0eSA9IGZ1bmN0aW9uKG5vZGUsIHZlYykge1xuICAgICAgICBub2RlLnNldFZlbG9jaXR5KHZlYy54LCB2ZWMueSwgdmVjLnopO1xuICAgICAgICBWZWNQb29sLmRpc3Bvc2UodmVjKTtcbiAgICB9O1xuXG4gICAgLy8gY3Jvc3MgcHJvZHVjdCBvZiAyIHZlY3RvcnNcbiAgICB2YXIgY3Jvc3MgPSBmdW5jdGlvbiAoIGEsIGIgKSB7XG4gICAgICAgIHZhciBheCA9IGEueCwgYXkgPSBhLnksIGF6ID0gYS56O1xuICAgICAgICB2YXIgYnggPSBiLngsIGJ5ID0gYi55LCBieiA9IGIuejtcbiAgICAgICAgYS54ID0gYXkgKiBieiAtIGF6ICogYnk7XG4gICAgICAgIGEueSA9IGF6ICogYnggLSBheCAqIGJ6O1xuICAgICAgICBhLnogPSBheCAqIGJ5IC0gYXkgKiBieDtcbiAgICB9O1xuXG4gICAgLy8gbm9ybWFsaXNlIHRvIHVuaXQgdmVjdG9yXG4gICAgdmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uICh2ZWMzKSB7XG4gICAgICAgIGlmKHZlYzMueCA9PT0gMCAmJiB2ZWMzLnkgPT09IDAgJiYgdmVjMy56ID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdmVjMztcbiAgICAgICAgfVxuICAgICAgICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KCB2ZWMzLnggKiB2ZWMzLnggKyB2ZWMzLnkgKiB2ZWMzLnkgKyB2ZWMzLnogKiB2ZWMzLnogKTtcbiAgICAgICAgdmFyIGludlNjYWxhciA9IDEgLyBsZW5ndGg7XG4gICAgICAgIHZlYzMueCAqPSBpbnZTY2FsYXI7XG4gICAgICAgIHZlYzMueSAqPSBpbnZTY2FsYXI7XG4gICAgICAgIHZlYzMueiAqPSBpbnZTY2FsYXI7XG4gICAgICAgIHJldHVybiB2ZWMzO1xuICAgIH07XG5cbiAgICAvLyBwYW4gbGVmdCB0byByaWdodCB3aXRoIHZhbHVlIGZyb20gLTEgdG8gMVxuICAgIC8vIGNyZWF0ZXMgYSBuaWNlIGN1cnZlIHdpdGggelxuICAgIG5vZGUuc2V0WCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIHZhciBkZWc0NSA9IE1hdGguUEkgLyA0LFxuICAgICAgICAgICAgZGVnOTAgPSBkZWc0NSAqIDIsXG4gICAgICAgICAgICB4ID0gdmFsdWUgKiBkZWc0NSxcbiAgICAgICAgICAgIHogPSB4ICsgZGVnOTA7XG5cbiAgICAgICAgaWYgKHogPiBkZWc5MCkge1xuICAgICAgICAgICAgeiA9IE1hdGguUEkgLSB6O1xuICAgICAgICB9XG5cbiAgICAgICAgeCA9IE1hdGguc2luKHgpO1xuICAgICAgICB6ID0gTWF0aC5zaW4oeik7XG5cbiAgICAgICAgbm9kZS5zZXRQb3NpdGlvbih4LCAwLCB6KTtcbiAgICB9O1xuXG4gICAgLyp2YXIgeCA9IDAsXG4gICAgICAgIHkgPSAwLFxuICAgICAgICB6ID0gMDtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgJ3gnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4geDsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB4ID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRQb3NpdGlvbih4LCB5LCB6KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pOyovXG5cbiAgICAvLyBzZXQgdGhlIHBvc2l0aW9uIHRoZSBhdWRpbyBpcyBjb21pbmcgZnJvbSlcbiAgICBub2RlLnNldFNvdXJjZVBvc2l0aW9uID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRQb3NpdGlvbihub2RlLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIHNldCB0aGUgZGlyZWN0aW9uIHRoZSBhdWRpbyBpcyBjb21pbmcgZnJvbSlcbiAgICBub2RlLnNldFNvdXJjZU9yaWVudGF0aW9uID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRPcmllbnRhdGlvbihub2RlLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIHNldCB0aGUgdmVsb2ljdHkgb2YgdGhlIGF1ZGlvIHNvdXJjZSAoaWYgbW92aW5nKVxuICAgIG5vZGUuc2V0U291cmNlVmVsb2NpdHkgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldFZlbG9jaXR5KG5vZGUsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSBwb3NpdGlvbiBvZiB3aG8gb3Igd2hhdCBpcyBoZWFyaW5nIHRoZSBhdWRpbyAoY291bGQgYmUgY2FtZXJhIG9yIHNvbWUgY2hhcmFjdGVyKVxuICAgIG5vZGUuc2V0TGlzdGVuZXJQb3NpdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0UG9zaXRpb24oY29udGV4dC5saXN0ZW5lciwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHBvc2l0aW9uIG9mIHdobyBvciB3aGF0IGlzIGhlYXJpbmcgdGhlIGF1ZGlvIChjb3VsZCBiZSBjYW1lcmEgb3Igc29tZSBjaGFyYWN0ZXIpXG4gICAgbm9kZS5zZXRMaXN0ZW5lck9yaWVudGF0aW9uID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRPcmllbnRhdGlvbihjb250ZXh0Lmxpc3RlbmVyLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIHNldCB0aGUgdmVsb2NpdHkgKGlmIG1vdmluZykgb2Ygd2hvIG9yIHdoYXQgaXMgaGVhcmluZyB0aGUgYXVkaW8gKGNvdWxkIGJlIGNhbWVyYSBvciBzb21lIGNoYXJhY3RlcilcbiAgICBub2RlLnNldExpc3RlbmVyVmVsb2NpdHkgPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldFZlbG9jaXR5KGNvbnRleHQubGlzdGVuZXIsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gaGVscGVyIHRvIGNhbGN1bGF0ZSB2ZWxvY2l0eVxuICAgIG5vZGUuY2FsY3VsYXRlVmVsb2NpdHkgPSBmdW5jdGlvbihjdXJyZW50UG9zaXRpb24sIGxhc3RQb3NpdGlvbiwgZGVsdGFUaW1lKSB7XG4gICAgICAgIHZhciBkeCA9IGN1cnJlbnRQb3NpdGlvbi54IC0gbGFzdFBvc2l0aW9uLng7XG4gICAgICAgIHZhciBkeSA9IGN1cnJlbnRQb3NpdGlvbi55IC0gbGFzdFBvc2l0aW9uLnk7XG4gICAgICAgIHZhciBkeiA9IGN1cnJlbnRQb3NpdGlvbi56IC0gbGFzdFBvc2l0aW9uLno7XG4gICAgICAgIHJldHVybiBWZWNQb29sLmdldChkeCAvIGRlbHRhVGltZSwgZHkgLyBkZWx0YVRpbWUsIGR6IC8gZGVsdGFUaW1lKTtcbiAgICB9O1xuXG4gICAgbm9kZS5zZXREZWZhdWx0cyA9IGZ1bmN0aW9uKGRlZmF1bHRzKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGRlZmF1bHRzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgUGFubmVyLmRlZmF1bHRzW2tleV0gPSBkZWZhdWx0c1trZXldO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cblBhbm5lci5kZWZhdWx0cyA9IHtcbiAgICBwYW5uaW5nTW9kZWw6ICdIUlRGJyxcbiAgICBkaXN0YW5jZU1vZGVsOiAnbGluZWFyJyxcbiAgICByZWZEaXN0YW5jZTogMSxcbiAgICBtYXhEaXN0YW5jZTogMTAwMCxcbiAgICByb2xsb2ZmRmFjdG9yOiAxLFxuICAgIGNvbmVJbm5lckFuZ2xlOiAzNjAsXG4gICAgY29uZU91dGVyQW5nbGU6IDAsXG4gICAgY29uZU91dGVyR2FpbjogMFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYW5uZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFBoYXNlcihjb250ZXh0LCBjb25maWcpIHtcbiAgICBjb25maWcgPSBjb25maWcgfHwge307XG4gICAgdmFyIHN0YWdlcyA9IGNvbmZpZy5zdGFnZXMgfHwgOCxcbiAgICAgICAgbGZvRnJlcXVlbmN5ID0gY29uZmlnLmZyZXF1ZW5jeSB8fCAwLjUsXG4gICAgICAgIGxmb0dhaW5WYWx1ZSA9IGNvbmZpZy5nYWluIHx8IDMwMCxcbiAgICAgICAgZmVlZGJhY2tHYWluID0gY29uZmlnLmZlZWRiYWNrIHx8IDAuNSxcbiAgICAgICAgZmlsdGVycyA9IFtdLFxuICAgICAgICBmaWx0ZXI7XG5cbiAgICB2YXIgaW5wdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgZmVlZGJhY2sgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgbGZvID0gY29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgdmFyIGxmb0dhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgb3V0cHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG5cbiAgICBmZWVkYmFjay5nYWluLnZhbHVlID0gZmVlZGJhY2tHYWluO1xuXG4gICAgbGZvLnR5cGUgPSAnc2luZSc7XG4gICAgbGZvLmZyZXF1ZW5jeS52YWx1ZSA9IGxmb0ZyZXF1ZW5jeTtcbiAgICBsZm9HYWluLmdhaW4udmFsdWUgPSBsZm9HYWluVmFsdWU7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YWdlczsgaSsrKSB7XG4gICAgICAgIGZpbHRlciA9IGNvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gICAgICAgIGZpbHRlci50eXBlID0gJ2FsbHBhc3MnO1xuICAgICAgICBmaWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gMTAwMCAqIGk7XG4gICAgICAgIC8vZmlsdGVyLlEudmFsdWUgPSAxMDtcbiAgICAgICAgaWYoaSA+IDApIHtcbiAgICAgICAgICAgIGZpbHRlcnNbaS0xXS5jb25uZWN0KGZpbHRlcik7XG4gICAgICAgIH1cbiAgICAgICAgbGZvR2Fpbi5jb25uZWN0KGZpbHRlci5mcmVxdWVuY3kpO1xuXG4gICAgICAgIGZpbHRlcnMucHVzaChmaWx0ZXIpO1xuICAgIH1cblxuICAgIHZhciBmaXJzdCA9IGZpbHRlcnNbMF07XG4gICAgdmFyIGxhc3QgPSBmaWx0ZXJzW2ZpbHRlcnMubGVuZ3RoIC0gMV07XG5cbiAgICBpbnB1dC5jb25uZWN0KGZpcnN0KTtcbiAgICBpbnB1dC5jb25uZWN0KG91dHB1dCk7XG4gICAgbGFzdC5jb25uZWN0KG91dHB1dCk7XG4gICAgbGFzdC5jb25uZWN0KGZlZWRiYWNrKTtcbiAgICBmZWVkYmFjay5jb25uZWN0KGZpcnN0KTtcbiAgICBsZm8uY29ubmVjdChsZm9HYWluKTtcbiAgICBsZm8uc3RhcnQoMCk7XG5cbiAgICB2YXIgbm9kZSA9IGlucHV0O1xuICAgIG5vZGUubmFtZSA9ICdQaGFzZXInO1xuICAgIG5vZGUuX291dHB1dCA9IG91dHB1dDtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgbGZvRnJlcXVlbmN5OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbGZvLmZyZXF1ZW5jeS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbGZvLmZyZXF1ZW5jeS52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGxmb0dhaW46IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBsZm9HYWluLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGxmb0dhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGZlZWRiYWNrOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmVlZGJhY2suZ2Fpbi52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZmVlZGJhY2suZ2Fpbi52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBoYXNlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUmVjb3JkZXIoY29udGV4dCwgcGFzc1Rocm91Z2gpIHtcbiAgICB2YXIgYnVmZmVyc0wgPSBbXSxcbiAgICAgICAgYnVmZmVyc1IgPSBbXSxcbiAgICAgICAgc3RhcnRlZEF0ID0gMCxcbiAgICAgICAgc3RvcHBlZEF0ID0gMDtcblxuICAgIHZhciBpbnB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBvdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgc2NyaXB0ID0gY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoNDA5NiwgMiwgMik7XG4gICAgXG4gICAgaW5wdXQuY29ubmVjdChzY3JpcHQpO1xuICAgIHNjcmlwdC5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIHNjcmlwdC5jb25uZWN0KG91dHB1dCk7XG5cbiAgICB2YXIgbm9kZSA9IGlucHV0O1xuICAgIG5vZGUubmFtZSA9ICdSZWNvcmRlcic7XG4gICAgbm9kZS5fb3V0cHV0ID0gb3V0cHV0O1xuXG4gICAgbm9kZS5pc1JlY29yZGluZyA9IGZhbHNlO1xuXG4gICAgdmFyIGdldEJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighYnVmZmVyc0wubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gY29udGV4dC5jcmVhdGVCdWZmZXIoMiwgNDA5NiwgY29udGV4dC5zYW1wbGVSYXRlKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYnVmZmVyID0gY29udGV4dC5jcmVhdGVCdWZmZXIoMiwgYnVmZmVyc0wubGVuZ3RoLCBjb250ZXh0LnNhbXBsZVJhdGUpO1xuICAgICAgICBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGJ1ZmZlcnNMKTtcbiAgICAgICAgYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChidWZmZXJzUik7XG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfTtcblxuICAgIG5vZGUuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgYnVmZmVyc0wubGVuZ3RoID0gMDtcbiAgICAgICAgYnVmZmVyc1IubGVuZ3RoID0gMDtcbiAgICAgICAgc3RhcnRlZEF0ID0gY29udGV4dC5jdXJyZW50VGltZTtcbiAgICAgICAgc3RvcHBlZEF0ID0gMDtcbiAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IHRydWU7XG4gICAgfTtcblxuICAgIG5vZGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBzdG9wcGVkQXQgPSBjb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgICAgICB0aGlzLmlzUmVjb3JkaW5nID0gZmFsc2U7XG4gICAgICAgIHJldHVybiBnZXRCdWZmZXIoKTtcbiAgICB9O1xuXG4gICAgbm9kZS5nZXREdXJhdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5pc1JlY29yZGluZykge1xuICAgICAgICAgICAgcmV0dXJuIHN0b3BwZWRBdCAtIHN0YXJ0ZWRBdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udGV4dC5jdXJyZW50VGltZSAtIHN0YXJ0ZWRBdDtcbiAgICB9O1xuXG4gICAgc2NyaXB0Lm9uYXVkaW9wcm9jZXNzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHZhciBpbnB1dEwgPSBldmVudC5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKSxcbiAgICAgICAgICAgIGlucHV0UiA9IGV2ZW50LmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApLFxuICAgICAgICAgICAgb3V0cHV0TCA9IGV2ZW50Lm91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKSxcbiAgICAgICAgICAgIG91dHB1dFIgPSBldmVudC5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCk7XG5cbiAgICAgICAgaWYocGFzc1Rocm91Z2gpIHtcbiAgICAgICAgICAgIG91dHB1dEwuc2V0KGlucHV0TCk7XG4gICAgICAgICAgICBvdXRwdXRSLnNldChpbnB1dFIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYobm9kZS5pc1JlY29yZGluZykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbnB1dEwubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBidWZmZXJzTC5wdXNoKGlucHV0TFtpXSk7XG4gICAgICAgICAgICAgICAgYnVmZmVyc1IucHVzaChpbnB1dFJbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY29yZGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBSZXZlcmIoY29udGV4dCwgY29uZmlnKSB7XG4gICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuXG4gICAgdmFyIHRpbWUgPSBjb25maWcudGltZSB8fCAxLFxuICAgICAgICBkZWNheSA9IGNvbmZpZy5kZWNheSB8fCA1LFxuICAgICAgICByZXZlcnNlID0gISFjb25maWcucmV2ZXJzZSxcbiAgICAgICAgcmF0ZSA9IGNvbnRleHQuc2FtcGxlUmF0ZSxcbiAgICAgICAgbGVuZ3RoLFxuICAgICAgICBpbXB1bHNlUmVzcG9uc2U7XG5cbiAgICB2YXIgaW5wdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgcmV2ZXJiID0gY29udGV4dC5jcmVhdGVDb252b2x2ZXIoKTtcbiAgICB2YXIgb3V0cHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG5cbiAgICBpbnB1dC5jb25uZWN0KHJldmVyYik7XG4gICAgaW5wdXQuY29ubmVjdChvdXRwdXQpO1xuICAgIHJldmVyYi5jb25uZWN0KG91dHB1dCk7XG5cbiAgICB2YXIgbm9kZSA9IGlucHV0O1xuICAgIG5vZGUubmFtZSA9ICdSZXZlcmInO1xuICAgIG5vZGUuX291dHB1dCA9IG91dHB1dDtcblxuICAgIG5vZGUudXBkYXRlID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICAgIGlmKGNvbmZpZy50aW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRpbWUgPSBjb25maWcudGltZTtcbiAgICAgICAgICAgIGxlbmd0aCA9IHJhdGUgKiB0aW1lO1xuICAgICAgICAgICAgaW1wdWxzZVJlc3BvbnNlID0gY29udGV4dC5jcmVhdGVCdWZmZXIoMiwgbGVuZ3RoLCByYXRlKTtcbiAgICAgICAgfVxuICAgICAgICBpZihjb25maWcuZGVjYXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVjYXkgPSBjb25maWcuZGVjYXk7XG4gICAgICAgIH1cbiAgICAgICAgaWYoY29uZmlnLnJldmVyc2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV2ZXJzZSA9IGNvbmZpZy5yZXZlcnNlO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxlZnQgPSBpbXB1bHNlUmVzcG9uc2UuZ2V0Q2hhbm5lbERhdGEoMCksXG4gICAgICAgICAgICByaWdodCA9IGltcHVsc2VSZXNwb25zZS5nZXRDaGFubmVsRGF0YSgxKSxcbiAgICAgICAgICAgIG4sIGU7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbiA9IHJldmVyc2UgPyBsZW5ndGggLSBpIDogaTtcbiAgICAgICAgICAgIGUgPSBNYXRoLnBvdygxIC0gbiAvIGxlbmd0aCwgZGVjYXkpO1xuICAgICAgICAgICAgbGVmdFtpXSA9IChNYXRoLnJhbmRvbSgpICogMiAtIDEpICogZTtcbiAgICAgICAgICAgIHJpZ2h0W2ldID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV2ZXJiLmJ1ZmZlciA9IGltcHVsc2VSZXNwb25zZTtcbiAgICB9O1xuXG4gICAgbm9kZS51cGRhdGUoe1xuICAgICAgICB0aW1lOiB0aW1lLFxuICAgICAgICBkZWNheTogZGVjYXksXG4gICAgICAgIHJldmVyc2U6IHJldmVyc2VcbiAgICB9KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgdGltZToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRpbWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NldCB0aW1lOicsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZih2YWx1ZSA9PT0gdGltZSkgeyByZXR1cm47IH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSh7dGltZTogdGltZX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBkZWNheToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGRlY2F5OyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmKHZhbHVlID09PSBkZWNheSkgeyByZXR1cm47IH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSh7ZGVjYXk6IGRlY2F5fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJldmVyc2U6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiByZXZlcnNlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmKHZhbHVlID09PSByZXZlcnNlKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKHtyZXZlcnNlOiAhIXZhbHVlfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJldmVyYjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEVmZmVjdCA9IHJlcXVpcmUoJy4vZWZmZWN0LmpzJyk7XG5cbmZ1bmN0aW9uIEdyb3VwKGNvbnRleHQsIGRlc3RpbmF0aW9uKSB7XG4gICAgdGhpcy5fc291bmRzID0gW107XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZWZmZWN0ID0gbmV3IEVmZmVjdCh0aGlzLl9jb250ZXh0KTtcbiAgICB0aGlzLl9nYWluID0gdGhpcy5fZWZmZWN0LmdhaW4oKTtcbiAgICBpZih0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX2VmZmVjdC5zZXRTb3VyY2UodGhpcy5fZ2Fpbik7XG4gICAgICAgIHRoaXMuX2VmZmVjdC5zZXREZXN0aW5hdGlvbihkZXN0aW5hdGlvbiB8fCB0aGlzLl9jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB9XG59XG5cbi8qXG4gKiBBZGQgLyByZW1vdmVcbiAqL1xuXG5Hcm91cC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oc291bmQpIHtcbiAgICBzb3VuZC5nYWluLmRpc2Nvbm5lY3QoKTtcbiAgICBzb3VuZC5nYWluLmNvbm5lY3QodGhpcy5fZ2Fpbik7XG5cbiAgICB0aGlzLl9zb3VuZHMucHVzaChzb3VuZCk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oc291bmRPcklkKSB7XG4gICAgdGhpcy5fc291bmRzLnNvbWUoZnVuY3Rpb24oc291bmQsIGluZGV4LCBzb3VuZHMpIHtcbiAgICAgICAgaWYoc291bmQgPT09IHNvdW5kT3JJZCB8fCBzb3VuZC5pZCA9PT0gc291bmRPcklkKSB7XG4gICAgICAgICAgICBzb3VuZHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5Hcm91cC5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5LCBvZmZzZXQpIHtcbiAgICB0aGlzLl9zb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICBzb3VuZC5wbGF5KGRlbGF5LCBvZmZzZXQpO1xuICAgIH0pO1xufTtcblxuR3JvdXAucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgaWYoc291bmQucGxheWluZykge1xuICAgICAgICAgICAgc291bmQucGF1c2UoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuR3JvdXAucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgIGlmKHNvdW5kLnBhdXNlZCkge1xuICAgICAgICAgICAgc291bmQucGxheSgpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgIHNvdW5kLnN0b3AoKTtcbiAgICB9KTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5zZWVrID0gZnVuY3Rpb24ocGVyY2VudCkge1xuICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgIHNvdW5kLnNlZWsocGVyY2VudCk7XG4gICAgfSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUubXV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3ByZU11dGVWb2x1bWUgPSB0aGlzLnZvbHVtZTtcbiAgICB0aGlzLnZvbHVtZSA9IDA7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUudW5NdXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy52b2x1bWUgPSB0aGlzLl9wcmVNdXRlVm9sdW1lIHx8IDE7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoR3JvdXAucHJvdG90eXBlLCAndm9sdW1lJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9nYWluLmdhaW4udmFsdWU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGlmKGlzTmFOKHZhbHVlKSkgeyByZXR1cm47IH1cblxuICAgICAgICBpZih0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgICAgICB0aGlzLl9nYWluLmdhaW4uY2FuY2VsU2NoZWR1bGVkVmFsdWVzKHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICAgICAgdGhpcy5fZ2Fpbi5nYWluLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLl9nYWluLmdhaW4uc2V0VmFsdWVBdFRpbWUodmFsdWUsIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fZ2Fpbi5nYWluLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgICAgIGlmICghc291bmQuY29udGV4dCkge1xuICAgICAgICAgICAgICAgIHNvdW5kLnZvbHVtZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59KTtcblxuR3JvdXAucHJvdG90eXBlLmZhZGUgPSBmdW5jdGlvbih2b2x1bWUsIGR1cmF0aW9uKSB7XG4gICAgaWYodGhpcy5fY29udGV4dCkge1xuICAgICAgICB2YXIgcGFyYW0gPSB0aGlzLl9nYWluLmdhaW47XG4gICAgICAgIHZhciB0aW1lID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZTtcblxuICAgICAgICBwYXJhbS5jYW5jZWxTY2hlZHVsZWRWYWx1ZXModGltZSk7XG4gICAgICAgIHBhcmFtLnNldFZhbHVlQXRUaW1lKHBhcmFtLnZhbHVlLCB0aW1lKTtcbiAgICAgICAgLy8gcGFyYW0uc2V0VmFsdWVBdFRpbWUodm9sdW1lLCB0aW1lICsgZHVyYXRpb24pO1xuICAgICAgICBwYXJhbS5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZSh2b2x1bWUsIHRpbWUgKyBkdXJhdGlvbik7XG4gICAgICAgIC8vIHBhcmFtLnNldFRhcmdldEF0VGltZSh2b2x1bWUsIHRpbWUsIGR1cmF0aW9uKTtcbiAgICAgICAgLy8gcGFyYW0uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZShNYXRoLm1heCh2b2x1bWUsIDAuMDAwMSksIHRpbWUgKyBkdXJhdGlvbik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9zb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICAgICAgc291bmQuZmFkZSh2b2x1bWUsIGR1cmF0aW9uKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICogRGVzdHJveVxuICovXG5cbkdyb3VwLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgd2hpbGUodGhpcy5fc291bmRzLmxlbmd0aCkge1xuICAgICAgICB0aGlzLl9zb3VuZHMucG9wKCkuZGVzdHJveSgpO1xuICAgIH1cbn07XG5cblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoR3JvdXAucHJvdG90eXBlLCB7XG4gICAgJ2VmZmVjdCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9lZmZlY3Q7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdnYWluJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dhaW47XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdzb3VuZHMnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc291bmRzO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gR3JvdXA7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBCdWZmZXJTb3VyY2UgPSByZXF1aXJlKCcuL3NvdXJjZS9idWZmZXItc291cmNlLmpzJyksXG4gICAgRWZmZWN0ID0gcmVxdWlyZSgnLi9lZmZlY3QuanMnKSxcbiAgICBFbWl0dGVyID0gcmVxdWlyZSgnLi91dGlscy9lbWl0dGVyLmpzJyksXG4gICAgRmlsZSA9IHJlcXVpcmUoJy4vdXRpbHMvZmlsZS5qcycpLFxuICAgIExvYWRlciA9IHJlcXVpcmUoJy4vdXRpbHMvbG9hZGVyLmpzJyksXG4gICAgTWVkaWFTb3VyY2UgPSByZXF1aXJlKCcuL3NvdXJjZS9tZWRpYS1zb3VyY2UuanMnKSxcbiAgICBNaWNyb3Bob25lU291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2UvbWljcm9waG9uZS1zb3VyY2UuanMnKSxcbiAgICBPc2NpbGxhdG9yU291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2Uvb3NjaWxsYXRvci1zb3VyY2UuanMnKSxcbiAgICBTY3JpcHRTb3VyY2UgPSByZXF1aXJlKCcuL3NvdXJjZS9zY3JpcHQtc291cmNlLmpzJyk7XG5cbmZ1bmN0aW9uIFNvdW5kKGNvbnRleHQsIGRlc3RpbmF0aW9uKSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2RhdGEgPSBudWxsO1xuICAgIC8vIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX2lzVG91Y2hMb2NrZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9sb2FkZXIgPSBudWxsO1xuICAgIHRoaXMuX2xvb3AgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWJhY2tSYXRlID0gMTtcbiAgICB0aGlzLl9wbGF5V2hlblJlYWR5ID0gbnVsbDtcbiAgICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG5cbiAgICB0aGlzLl9lZmZlY3QgPSBuZXcgRWZmZWN0KHRoaXMuX2NvbnRleHQpO1xuICAgIHRoaXMuX2dhaW4gPSB0aGlzLl9lZmZlY3QuZ2FpbigpO1xuICAgIGlmKHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fZWZmZWN0LnNldERlc3RpbmF0aW9uKHRoaXMuX2dhaW4pO1xuICAgICAgICB0aGlzLl9nYWluLmNvbm5lY3QoZGVzdGluYXRpb24gfHwgdGhpcy5fY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfVxufVxuXG5Tb3VuZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEVtaXR0ZXIucHJvdG90eXBlKTtcblNvdW5kLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNvdW5kO1xuXG4vKlxuICogTG9hZFxuICovXG5cblNvdW5kLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgdmFyIHVybCA9IEZpbGUuZ2V0U3VwcG9ydGVkRmlsZShjb25maWcudXJsIHx8IGNvbmZpZyk7XG5cbiAgICBpZih0aGlzLl9zb3VyY2UgJiYgdGhpcy5fc291cmNlLl9lbCkge1xuICAgICAgICB0aGlzLl9zb3VyY2UubG9hZCh1cmwpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fbG9hZGVyID0gdGhpcy5fbG9hZGVyIHx8IG5ldyBMb2FkZXIodXJsKTtcbiAgICAgICAgdGhpcy5fbG9hZGVyLmF1ZGlvQ29udGV4dCA9ICEhY29uZmlnLmFzTWVkaWFFbGVtZW50ID8gbnVsbCA6IHRoaXMuX2NvbnRleHQ7XG4gICAgICAgIHRoaXMuX2xvYWRlci5pc1RvdWNoTG9ja2VkID0gdGhpcy5faXNUb3VjaExvY2tlZDtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB0aGlzLl9sb2FkZXIub25jZSgnbG9hZGVkJywgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgc2VsZi5kYXRhID0gZGF0YTtcbiAgICAgICAgICAgIHNlbGYgPSBudWxsO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5LCBvZmZzZXQpIHtcbiAgICBpZighdGhpcy5fc291cmNlIHx8IHRoaXMuX2lzVG91Y2hMb2NrZWQpIHtcbiAgICAgICAgdGhpcy5fcGxheVdoZW5SZWFkeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5wbGF5KGRlbGF5LCBvZmZzZXQpO1xuICAgICAgICB9LmJpbmQodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB0aGlzLl9wbGF5V2hlblJlYWR5ID0gbnVsbDtcbiAgICB0aGlzLl9lZmZlY3Quc2V0U291cmNlKHRoaXMuX3NvdXJjZS5zb3VyY2VOb2RlKTtcbiAgICB0aGlzLl9zb3VyY2UubG9vcCA9IHRoaXMuX2xvb3A7XG5cbiAgICAvLyB1cGRhdGUgdm9sdW1lIG5lZWRlZCBmb3Igbm8gd2ViYXVkaW9cbiAgICBpZighdGhpcy5fY29udGV4dCkgeyB0aGlzLnZvbHVtZSA9IHRoaXMuX2dhaW4uZ2Fpbi52YWx1ZTsgfVxuXG4gICAgdGhpcy5fc291cmNlLnBsYXkoZGVsYXksIG9mZnNldCk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvdW5kLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2UpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB0aGlzLl9zb3VyY2UucGF1c2UoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvdW5kLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuX3NvdXJjZS5zdG9wKCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUuc2VlayA9IGZ1bmN0aW9uKHBlcmNlbnQpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7IHJldHVybiB0aGlzOyB9XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5wbGF5KDAsIHRoaXMuX3NvdXJjZS5kdXJhdGlvbiAqIHBlcmNlbnQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuU291bmQucHJvdG90eXBlLmZhZGUgPSBmdW5jdGlvbih2b2x1bWUsIGR1cmF0aW9uKSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkgeyByZXR1cm4gdGhpczsgfVxuXG4gICAgaWYodGhpcy5fY29udGV4dCkge1xuICAgICAgICB2YXIgIHBhcmFtID0gdGhpcy5fZ2Fpbi5nYWluO1xuICAgICAgICB2YXIgdGltZSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWU7XG4gICAgICAgIHBhcmFtLmNhbmNlbFNjaGVkdWxlZFZhbHVlcyh0aW1lKTtcbiAgICAgICAgcGFyYW0uc2V0VmFsdWVBdFRpbWUocGFyYW0udmFsdWUsIHRpbWUpO1xuICAgICAgICBwYXJhbS5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZSh2b2x1bWUsIHRpbWUgKyBkdXJhdGlvbik7XG4gICAgfVxuICAgIGVsc2UgaWYodHlwZW9mIHRoaXMuX3NvdXJjZS5mYWRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZS5mYWRlKHZvbHVtZSwgZHVyYXRpb24pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAqIERlc3Ryb3lcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3NvdXJjZSkgeyB0aGlzLl9zb3VyY2UuZGVzdHJveSgpOyB9XG4gICAgaWYodGhpcy5fZWZmZWN0KSB7IHRoaXMuX2VmZmVjdC5kZXN0cm95KCk7IH1cbiAgICBpZih0aGlzLl9nYWluKSB7IHRoaXMuX2dhaW4uZGlzY29ubmVjdCgpOyB9XG4gICAgdGhpcy5fZ2FpbiA9IG51bGw7XG4gICAgdGhpcy5fY29udGV4dCA9IG51bGw7XG4gICAgdGhpcy5fZGF0YSA9IG51bGw7XG4gICAgLy8gdGhpcy5fZW5kZWRDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ2VuZGVkJyk7XG4gICAgdGhpcy5fcGxheVdoZW5SZWFkeSA9IG51bGw7XG4gICAgdGhpcy5fc291cmNlID0gbnVsbDtcbiAgICB0aGlzLl9lZmZlY3QgPSBudWxsO1xuICAgIGlmKHRoaXMuX2xvYWRlcikge1xuICAgICAgICB0aGlzLl9sb2FkZXIuZGVzdHJveSgpO1xuICAgICAgICB0aGlzLl9sb2FkZXIgPSBudWxsO1xuICAgIH1cbn07XG5cbi8qXG4gKiBDcmVhdGUgc291cmNlXG4gKi9cblxuU291bmQucHJvdG90eXBlLl9jcmVhdGVTb3VyY2UgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgLy8gaWYgKHRoaXMuX3NvdXJjZSAmJiBGaWxlLnR5cGUoZGF0YSkgPT09IHRoaXMuX3NvdXJjZS50eXBlKSB7XG4gICAgLy8gICAgIHRoaXMuX3NvdXJjZS5kYXRhID0gZGF0YTtcbiAgICAvLyB9IGVsc2VcbiAgICBpZihGaWxlLmlzQXVkaW9CdWZmZXIoZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IEJ1ZmZlclNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZihGaWxlLmlzTWVkaWFFbGVtZW50KGRhdGEpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBNZWRpYVNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZihGaWxlLmlzTWVkaWFTdHJlYW0oZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IE1pY3JvcGhvbmVTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2UgaWYoRmlsZS5pc09zY2lsbGF0b3JUeXBlKGRhdGEpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBPc2NpbGxhdG9yU291cmNlKGRhdGEsIHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbiAgICBlbHNlIGlmKEZpbGUuaXNTY3JpcHRDb25maWcoZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IFNjcmlwdFNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGRldGVjdCBkYXRhIHR5cGU6ICcgKyBkYXRhKTtcbiAgICB9XG5cbiAgICB0aGlzLl9lZmZlY3Quc2V0U291cmNlKHRoaXMuX3NvdXJjZS5zb3VyY2VOb2RlKTtcblxuICAgIGlmKHRoaXMuX3NvdXJjZS5oYXNPd25Qcm9wZXJ0eSgnX2VuZGVkQ2FsbGJhY2snKSkge1xuICAgICAgICB0aGlzLl9zb3VyY2UuX2VuZGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnZW5kZWQnKTtcbiAgICAgICAgfS5iaW5kKHRoaXMpO1xuICAgIH1cblxuICAgIGlmKHRoaXMuX3BsYXlXaGVuUmVhZHkpIHtcbiAgICAgICAgdGhpcy5fcGxheVdoZW5SZWFkeSgpO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFNvdW5kLnByb3RvdHlwZSwge1xuICAgICdjb250ZXh0Jzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQ7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdjdXJyZW50VGltZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuY3VycmVudFRpbWUgOiAwO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLnN0b3AoKTtcbiAgICAgICAgICAgIHRoaXMucGxheSgwLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdkYXRhJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RhdGE7XG4gICAgICAgIH0sXG4gICAgICAgIHNldCA6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBpZighdmFsdWUpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICB0aGlzLl9kYXRhID0gdmFsdWU7XG4gICAgICAgICAgICB0aGlzLl9jcmVhdGVTb3VyY2UodGhpcy5fZGF0YSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdkdXJhdGlvbic6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuZHVyYXRpb24gOiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZWZmZWN0Jzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VmZmVjdDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2VuZGVkJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5lbmRlZCA6IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZnJlcXVlbmN5Jzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5mcmVxdWVuY3kgOiAwO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBpZih0aGlzLl9zb3VyY2UpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zb3VyY2UuZnJlcXVlbmN5ID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdnYWluJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dhaW47XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdpc1RvdWNoTG9ja2VkJzoge1xuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9pc1RvdWNoTG9ja2VkID0gdmFsdWU7XG4gICAgICAgICAgICBpZighdmFsdWUgJiYgdGhpcy5fcGxheVdoZW5SZWFkeSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BsYXlXaGVuUmVhZHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2xvYWRlcic6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9sb2FkZXI7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdsb29wJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xvb3A7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvb3AgPSAhIXZhbHVlO1xuICAgICAgICAgICAgaWYodGhpcy5fc291cmNlKSB7XG4gICAgICAgICAgICAgIHRoaXMuX3NvdXJjZS5sb29wID0gdGhpcy5fbG9vcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BhdXNlZCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UucGF1c2VkIDogZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwbGF5aW5nJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wbGF5aW5nIDogZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwbGF5YmFja1JhdGUnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGxheWJhY2tSYXRlO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9wbGF5YmFja1JhdGUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGlmKHRoaXMuX3NvdXJjZSkge1xuICAgICAgICAgICAgICB0aGlzLl9zb3VyY2UucGxheWJhY2tSYXRlID0gdGhpcy5fcGxheWJhY2tSYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICAncHJvZ3Jlc3MnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLnByb2dyZXNzIDogMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3ZvbHVtZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmKHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZ2Fpbi5nYWluLnZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZih0aGlzLl9kYXRhICYmIHRoaXMuX2RhdGEudm9sdW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fZGF0YS52b2x1bWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgaWYoaXNOYU4odmFsdWUpKSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgICB2YXIgcGFyYW0gPSB0aGlzLl9nYWluLmdhaW47XG5cbiAgICAgICAgICAgIGlmKHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGltZSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWU7XG4gICAgICAgICAgICAgICAgcGFyYW0uY2FuY2VsU2NoZWR1bGVkVmFsdWVzKHRpbWUpO1xuICAgICAgICAgICAgICAgIHBhcmFtLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcGFyYW0uc2V0VmFsdWVBdFRpbWUodmFsdWUsIHRpbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyYW0udmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBpZih0aGlzLl9zb3VyY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLl9zb3VyY2UuZmFkZVRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZih0aGlzLl9kYXRhICYmIHRoaXMuX2RhdGEudm9sdW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZGF0YS52b2x1bWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBTb3VuZDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gQnVmZmVyU291cmNlKGJ1ZmZlciwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9idWZmZXIgPSBidWZmZXI7IC8vIEFycmF5QnVmZmVyXG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9sb29wID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXliYWNrUmF0ZSA9IDE7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBCdWZmZXJTb3VyY2VOb2RlXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn1cblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXksIG9mZnNldCkge1xuICAgIGlmKHRoaXMuX3BsYXlpbmcpIHsgcmV0dXJuOyB9XG4gICAgaWYoZGVsYXkgPT09IHVuZGVmaW5lZCkgeyBkZWxheSA9IDA7IH1cbiAgICBpZihkZWxheSA+IDApIHsgZGVsYXkgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZGVsYXk7IH1cblxuICAgIGlmKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7IG9mZnNldCA9IDA7IH1cbiAgICBpZihvZmZzZXQgPiAwKSB7IHRoaXMuX3BhdXNlZEF0ID0gMDsgfVxuICAgIGlmKHRoaXMuX3BhdXNlZEF0ID4gMCkgeyBvZmZzZXQgPSB0aGlzLl9wYXVzZWRBdDsgfVxuXG4gICAgLy9jb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBbJzEgb2Zmc2V0OicsIG9mZnNldF0pO1xuICAgIHdoaWxlKG9mZnNldCA+IHRoaXMuZHVyYXRpb24pIHsgb2Zmc2V0ID0gb2Zmc2V0ICUgdGhpcy5kdXJhdGlvbjsgfVxuICAgIC8vY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgWycyIG9mZnNldDonLCBvZmZzZXRdKTtcblxuICAgIHRoaXMuc291cmNlTm9kZS5sb29wID0gdGhpcy5fbG9vcDtcbiAgICB0aGlzLnNvdXJjZU5vZGUub25lbmRlZCA9IHRoaXMuX2VuZGVkSGFuZGxlci5iaW5kKHRoaXMpO1xuICAgIHRoaXMuc291cmNlTm9kZS5zdGFydChkZWxheSwgb2Zmc2V0KTtcbiAgICB0aGlzLnNvdXJjZU5vZGUucGxheWJhY2tSYXRlLnZhbHVlID0gdGhpcy5fcGxheWJhY2tSYXRlO1xuXG4gICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3BhdXNlZEF0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIG9mZnNldDtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcbn07XG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxhcHNlZCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSBlbGFwc2VkO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSB0cnVlO1xufTtcblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLm9uZW5kZWQgPSBudWxsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLnN0b3AoMCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufTtcblxuLypcbiAqIEVuZGVkIGhhbmRsZXJcbiAqL1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLl9lbmRlZEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgaWYodHlwZW9mIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayh0aGlzKTtcbiAgICB9XG59O1xuXG4vKlxuICogRGVzdHJveVxuICovXG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX2J1ZmZlciA9IG51bGw7XG4gICAgdGhpcy5fY29udGV4dCA9IG51bGw7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhCdWZmZXJTb3VyY2UucHJvdG90eXBlLCB7XG4gICAgJ2N1cnJlbnRUaW1lJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkQXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGltZSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgICAgICAgICAgICAgaWYodGltZSA+IHRoaXMuZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgdGltZSA9IHRpbWUgJSB0aGlzLmR1cmF0aW9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGltZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZGF0YSc6IHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fYnVmZmVyID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdkdXJhdGlvbic6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9idWZmZXIgPyB0aGlzLl9idWZmZXIuZHVyYXRpb24gOiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZW5kZWQnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZW5kZWQ7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdsb29wJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xvb3A7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvb3AgPSAhIXZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncGF1c2VkJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BsYXliYWNrUmF0ZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wbGF5YmFja1JhdGU7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX3BsYXliYWNrUmF0ZSA9IHZhbHVlO1xuICAgICAgICAgICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUucGxheWJhY2tSYXRlLnZhbHVlID0gdGhpcy5fcGxheWJhY2tSYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICAncGxheWluZyc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncHJvZ3Jlc3MnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kdXJhdGlvbiA/IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uIDogMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3NvdXJjZU5vZGUnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZighdGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuYnVmZmVyID0gdGhpcy5fYnVmZmVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBCdWZmZXJTb3VyY2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1lZGlhU291cmNlKGVsLCBjb250ZXh0KSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VsID0gZWw7IC8vIEhUTUxNZWRpYUVsZW1lbnRcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX2xvb3AgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5YmFja1JhdGUgPSAxO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDsgLy8gTWVkaWFFbGVtZW50U291cmNlTm9kZVxufVxuXG4vKlxuICogTG9hZFxuICovXG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24odXJsKSB7XG4gICAgdGhpcy5fZWwuc3JjID0gdXJsO1xuICAgIHRoaXMuX2VsLmxvYWQoKTtcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbn07XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXksIG9mZnNldCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9kZWxheVRpbWVvdXQpO1xuXG4gICAgdGhpcy5wbGF5YmFja1JhdGUgPSB0aGlzLl9wbGF5YmFja1JhdGU7XG5cbiAgICBpZihvZmZzZXQpIHtcbiAgICAgICAgdGhpcy5fZWwuY3VycmVudFRpbWUgPSBvZmZzZXQ7XG4gICAgfVxuXG4gICAgaWYoZGVsYXkpIHtcbiAgICAgICAgdGhpcy5fZGVsYXlUaW1lb3V0ID0gc2V0VGltZW91dCh0aGlzLnBsYXkuYmluZCh0aGlzKSwgZGVsYXkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gdGhpcy5fZWwubG9hZCgpO1xuICAgICAgICB0aGlzLl9lbC5wbGF5KCk7XG4gICAgfVxuXG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcblxuICAgIHRoaXMuX2VsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQpO1xuICAgIHRoaXMuX2VsLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQsIGZhbHNlKTtcblxuICAgIGlmKHRoaXMuX2VsLnJlYWR5U3RhdGUgPCA0KSB7XG4gICAgICAgIHRoaXMuX2VsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgdGhpcy5fcmVhZHlIYW5kbGVyQm91bmQpO1xuICAgICAgICB0aGlzLl9lbC5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHRoaXMuX3JlYWR5SGFuZGxlckJvdW5kLCBmYWxzZSk7XG4gICAgICAgIHRoaXMuX2VsLmxvYWQoKTtcbiAgICAgICAgdGhpcy5fZWwucGxheSgpO1xuICAgIH1cbn07XG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9kZWxheVRpbWVvdXQpO1xuXG4gICAgaWYoIXRoaXMuX2VsKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5fZWwucGF1c2UoKTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX2RlbGF5VGltZW91dCk7XG5cbiAgICBpZighdGhpcy5fZWwpIHsgcmV0dXJuOyB9XG5cbiAgICB0aGlzLl9lbC5wYXVzZSgpO1xuXG4gICAgdHJ5IHtcbiAgICAgICAgdGhpcy5fZWwuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICAvLyBmaXhlcyBidWcgd2hlcmUgc2VydmVyIGRvZXNuJ3Qgc3VwcG9ydCBzZWVrOlxuICAgICAgICBpZih0aGlzLl9lbC5jdXJyZW50VGltZSA+IDApIHsgdGhpcy5fZWwubG9hZCgpOyB9XG4gICAgfSBjYXRjaChlKSB7fVxuXG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xufTtcblxuLypcbiAqIEZhZGUgZm9yIG5vIHdlYmF1ZGlvXG4gKi9cblxuTWVkaWFTb3VyY2UucHJvdG90eXBlLmZhZGUgPSBmdW5jdGlvbih2b2x1bWUsIGR1cmF0aW9uKSB7XG4gICAgaWYoIXRoaXMuX2VsKSB7IHJldHVybiB0aGlzOyB9XG4gICAgaWYodGhpcy5fY29udGV4dCkgeyByZXR1cm4gdGhpczsgfVxuXG4gICAgdmFyIHJhbXAgPSBmdW5jdGlvbih2YWx1ZSwgc3RlcCwgc2VsZikge1xuICAgICAgICB2YXIgZWwgPSBzZWxmLl9lbDtcbiAgICAgICAgc2VsZi5mYWRlVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBlbC52b2x1bWUgPSBlbC52b2x1bWUgKyAoIHZhbHVlIC0gZWwudm9sdW1lICkgKiAwLjI7XG4gICAgICAgICAgICBpZihNYXRoLmFicyhlbC52b2x1bWUgLSB2YWx1ZSkgPiAwLjA1KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJhbXAodmFsdWUsIHN0ZXAsIHNlbGYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWwudm9sdW1lID0gdmFsdWU7XG4gICAgICAgIH0sIHN0ZXAgKiAxMDAwKTtcbiAgICB9O1xuXG4gICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLmZhZGVUaW1lb3V0KTtcbiAgICByYW1wKHZvbHVtZSwgZHVyYXRpb24gLyAxMCwgdGhpcyk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gKiBFbmRlZCBoYW5kbGVyXG4gKi9cblxuTWVkaWFTb3VyY2UucHJvdG90eXBlLl9lbmRlZEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuXG4gICAgaWYodGhpcy5fbG9vcCkge1xuICAgICAgICB0aGlzLl9lbC5jdXJyZW50VGltZSA9IDA7XG4gICAgICAgIC8vIGZpeGVzIGJ1ZyB3aGVyZSBzZXJ2ZXIgZG9lc24ndCBzdXBwb3J0IHNlZWs6XG4gICAgICAgIGlmKHRoaXMuX2VsLmN1cnJlbnRUaW1lID4gMCkgeyB0aGlzLl9lbC5sb2FkKCk7IH1cbiAgICAgICAgdGhpcy5wbGF5KCk7XG4gICAgfSBlbHNlIGlmKHR5cGVvZiB0aGlzLl9lbmRlZENhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sodGhpcyk7XG4gICAgfVxufTtcblxuTWVkaWFTb3VyY2UucHJvdG90eXBlLl9yZWFkeUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9lbC5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHRoaXMuX3JlYWR5SGFuZGxlckJvdW5kKTtcbiAgICBpZih0aGlzLl9wbGF5aW5nKSB7XG4gICAgICAgIHRoaXMuX2VsLnBsYXkoKTtcbiAgICB9XG59O1xuXG4vKlxuICogRGVzdHJveVxuICovXG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignZW5kZWQnLCB0aGlzLl9lbmRlZEhhbmRsZXJCb3VuZCk7XG4gICAgdGhpcy5fZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCB0aGlzLl9yZWFkeUhhbmRsZXJCb3VuZCk7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fZWwgPSBudWxsO1xuICAgIHRoaXMuX2NvbnRleHQgPSBudWxsO1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsO1xufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoTWVkaWFTb3VyY2UucHJvdG90eXBlLCB7XG4gICAgJ2N1cnJlbnRUaW1lJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VsID8gdGhpcy5fZWwuY3VycmVudFRpbWUgOiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZGF0YSc6IHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fZWwgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2R1cmF0aW9uJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VsID8gdGhpcy5fZWwuZHVyYXRpb24gOiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZW5kZWQnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZW5kZWQ7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdsb29wJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xvb3A7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvb3AgPSAhIXZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncGF1c2VkJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BsYXliYWNrUmF0ZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wbGF5YmFja1JhdGU7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX3BsYXliYWNrUmF0ZSA9IHZhbHVlO1xuICAgICAgICAgICAgaWYodGhpcy5fZWwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9lbC5wbGF5YmFja1JhdGUgPSB0aGlzLl9wbGF5YmFja1JhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwbGF5aW5nJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BsYXlpbmc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwcm9ncmVzcyc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmR1cmF0aW9uID8gdGhpcy5jdXJyZW50VGltZSAvIHRoaXMuZHVyYXRpb24gOiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnc291cmNlTm9kZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlICYmIHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVNZWRpYUVsZW1lbnRTb3VyY2UodGhpcy5fZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBNZWRpYVNvdXJjZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWljcm9waG9uZVNvdXJjZShzdHJlYW0sIGNvbnRleHQpIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBNaWNyb3Bob25lU291cmNlTm9kZVxuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG4gICAgdGhpcy5fc3RyZWFtID0gc3RyZWFtO1xufVxuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5NaWNyb3Bob25lU291cmNlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXkpIHtcbiAgICBpZihkZWxheSA9PT0gdW5kZWZpbmVkKSB7IGRlbGF5ID0gMDsgfVxuICAgIGlmKGRlbGF5ID4gMCkgeyBkZWxheSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkZWxheTsgfVxuXG4gICAgdGhpcy5zb3VyY2VOb2RlLnN0YXJ0KGRlbGF5KTtcblxuICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9wYXVzZWRBdDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWU7XG4gICAgfVxuXG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG59O1xuXG5NaWNyb3Bob25lU291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IGVsYXBzZWQ7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5NaWNyb3Bob25lU291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5zdG9wKDApO1xuICAgICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufTtcblxuLypcbiAqIERlc3Ryb3lcbiAqL1xuXG5NaWNyb3Bob25lU291cmNlLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fY29udGV4dCA9IG51bGw7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgdGhpcy5fc3RyZWFtID0gbnVsbDtcbiAgICB3aW5kb3cubW96SGFjayA9IG51bGw7XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhNaWNyb3Bob25lU291cmNlLnByb3RvdHlwZSwge1xuICAgICdjdXJyZW50VGltZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZEF0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYodGhpcy5fc3RhcnRlZEF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2R1cmF0aW9uJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdlbmRlZCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9lbmRlZDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2ZyZXF1ZW5jeSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9mcmVxdWVuY3k7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2ZyZXF1ZW5jeSA9IHZhbHVlO1xuICAgICAgICAgICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwYXVzZWQnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncGxheWluZyc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncHJvZ3Jlc3MnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3NvdXJjZU5vZGUnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZighdGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKHRoaXMuX3N0cmVhbSk7XG4gICAgICAgICAgICAgICAgLy8gSEFDSzogc3RvcHMgbW96IGdhcmJhZ2UgY29sbGVjdGlvbiBraWxsaW5nIHRoZSBzdHJlYW1cbiAgICAgICAgICAgICAgICAvLyBzZWUgaHR0cHM6Ly9zdXBwb3J0Lm1vemlsbGEub3JnL2VuLVVTL3F1ZXN0aW9ucy85ODQxNzlcbiAgICAgICAgICAgICAgICBpZihuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5tb3pIYWNrID0gdGhpcy5fc291cmNlTm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1pY3JvcGhvbmVTb3VyY2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE9zY2lsbGF0b3JTb3VyY2UodHlwZSwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIE9zY2lsbGF0b3JTb3VyY2VOb2RlXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbiAgICB0aGlzLl90eXBlID0gdHlwZTtcbiAgICB0aGlzLl9mcmVxdWVuY3kgPSAyMDA7XG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSkge1xuICAgIGlmKGRlbGF5ID09PSB1bmRlZmluZWQpIHsgZGVsYXkgPSAwOyB9XG4gICAgaWYoZGVsYXkgPiAwKSB7IGRlbGF5ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGRlbGF5OyB9XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUuc3RhcnQoZGVsYXkpO1xuXG4gICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3BhdXNlZEF0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZTtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BsYXlpbmcgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbn07XG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gZWxhcHNlZDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLnN0b3AoMCk7XG4gICAgICAgIH0gY2F0Y2goZSkge31cbiAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59O1xuXG4vKlxuICogRGVzdHJveVxuICovXG5cbk9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9jb250ZXh0ID0gbnVsbDtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKE9zY2lsbGF0b3JTb3VyY2UucHJvdG90eXBlLCB7XG4gICAgJ2N1cnJlbnRUaW1lJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkQXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZHVyYXRpb24nOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2VuZGVkJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZnJlcXVlbmN5Jzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZyZXF1ZW5jeTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fZnJlcXVlbmN5ID0gdmFsdWU7XG4gICAgICAgICAgICBpZih0aGlzLl9zb3VyY2VOb2RlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5mcmVxdWVuY3kudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BhdXNlZCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWQ7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwbGF5aW5nJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BsYXlpbmc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwcm9ncmVzcyc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnc291cmNlTm9kZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlICYmIHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS50eXBlID0gdGhpcy5fdHlwZTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLmZyZXF1ZW5jeS52YWx1ZSA9IHRoaXMuX2ZyZXF1ZW5jeTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gT3NjaWxsYXRvclNvdXJjZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gU2NyaXB0U291cmNlKGRhdGEsIGNvbnRleHQpIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fYnVmZmVyU2l6ZSA9IGRhdGEuYnVmZmVyU2l6ZSB8fCAxMDI0O1xuICAgIHRoaXMuX2NoYW5uZWxzID0gZGF0YS5jaGFubmVscyB8fCAxO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fb25Qcm9jZXNzID0gZGF0YS5jYWxsYmFjay5iaW5kKGRhdGEudGhpc0FyZyB8fCB0aGlzKTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBTY3JpcHRTb3VyY2VOb2RlXG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn1cblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuU2NyaXB0U291cmNlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXkpIHtcbiAgICBpZihkZWxheSA9PT0gdW5kZWZpbmVkKSB7IGRlbGF5ID0gMDsgfVxuICAgIGlmKGRlbGF5ID4gMCkgeyBkZWxheSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkZWxheTsgfVxuXG4gICAgdGhpcy5zb3VyY2VOb2RlLm9uYXVkaW9wcm9jZXNzID0gdGhpcy5fb25Qcm9jZXNzO1xuXG4gICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3BhdXNlZEF0O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fc3RhcnRlZEF0ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZTtcbiAgICB9XG5cbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcbn07XG5cblNjcmlwdFNvdXJjZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxhcHNlZCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSBlbGFwc2VkO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSB0cnVlO1xufTtcblxuU2NyaXB0U291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLm9uYXVkaW9wcm9jZXNzID0gdGhpcy5fb25QYXVzZWQ7XG4gICAgfVxuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59O1xuXG5TY3JpcHRTb3VyY2UucHJvdG90eXBlLl9vblBhdXNlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgdmFyIGJ1ZmZlciA9IGV2ZW50Lm91dHB1dEJ1ZmZlcjtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGFubmVsID0gYnVmZmVyLmdldENoYW5uZWxEYXRhKGkpO1xuICAgICAgICBmb3IgKHZhciBqID0gMCwgbGVuID0gY2hhbm5lbC5sZW5ndGg7IGogPCBsZW47IGorKykge1xuICAgICAgICAgICAgY2hhbm5lbFtqXSA9IDA7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKlxuICogRGVzdHJveVxuICovXG5cblNjcmlwdFNvdXJjZS5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX2NvbnRleHQgPSBudWxsO1xuICAgIHRoaXMuX29uUHJvY2VzcyA9IG51bGw7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTY3JpcHRTb3VyY2UucHJvdG90eXBlLCB7XG4gICAgJ2N1cnJlbnRUaW1lJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYodGhpcy5fcGF1c2VkQXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkQXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih0aGlzLl9zdGFydGVkQXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZHVyYXRpb24nOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2VuZGVkJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncGF1c2VkJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BsYXlpbmcnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGxheWluZztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3Byb2dyZXNzJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdzb3VyY2VOb2RlJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUgJiYgdGhpcy5fY29udGV4dCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZVNjcmlwdFByb2Nlc3Nvcih0aGlzLl9idWZmZXJTaXplLCAwLCB0aGlzLl9jaGFubmVscyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNjcmlwdFNvdXJjZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEJyb3dzZXIgPSB7fTtcblxuQnJvd3Nlci5oYW5kbGVQYWdlVmlzaWJpbGl0eSA9IGZ1bmN0aW9uKG9uSGlkZGVuLCBvblNob3duLCB0aGlzQXJnKSB7XG4gICAgdmFyIGhpZGRlbixcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZTtcblxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQuaGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBoaWRkZW4gPSAnaGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICd2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50Lm1vekhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ21vekhpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnbW96dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tc0hpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ21zSGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICdtc3Zpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQud2Via2l0SGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBoaWRkZW4gPSAnd2Via2l0SGlkZGVuJztcbiAgICAgICAgdmlzaWJpbGl0eUNoYW5nZSA9ICd3ZWJraXR2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBvbkNoYW5nZSgpIHtcbiAgICAgICAgaWYgKGRvY3VtZW50W2hpZGRlbl0pIHtcbiAgICAgICAgICAgIG9uSGlkZGVuLmNhbGwodGhpc0FyZyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvblNob3duLmNhbGwodGhpc0FyZyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZih2aXNpYmlsaXR5Q2hhbmdlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih2aXNpYmlsaXR5Q2hhbmdlLCBvbkNoYW5nZSwgZmFsc2UpO1xuICAgIH1cbn07XG5cbkJyb3dzZXIuaGFuZGxlVG91Y2hMb2NrID0gZnVuY3Rpb24ob25VbmxvY2ssIHRoaXNBcmcpIHtcbiAgICB2YXIgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50LFxuICAgICAgICBsb2NrZWQgPSAhIXVhLm1hdGNoKC9BbmRyb2lkfHdlYk9TfGlQaG9uZXxpUGFkfGlQb2R8QmxhY2tCZXJyeXxJRU1vYmlsZXxPcGVyYSBNaW5pfFdpbmRvd3MgUGhvbmV8U3ltYmlhbk9TL2kpO1xuXG5cbiAgICB2YXIgdW5sb2NrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHVubG9jayk7XG5cbiAgICAgICAgaWYodGhpcy5fY29udGV4dCkge1xuICAgICAgICAgICAgdmFyIGJ1ZmZlciA9IHRoaXMuX2NvbnRleHQuY3JlYXRlQnVmZmVyKDEsIDEsIDIyMDUwKTtcbiAgICAgICAgICAgIHZhciB1bmxvY2tTb3VyY2UgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgICAgICAgICAgdW5sb2NrU291cmNlLmJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgICAgIHVubG9ja1NvdXJjZS5jb25uZWN0KHRoaXMuX2NvbnRleHQuZGVzdGluYXRpb24pO1xuICAgICAgICAgICAgdW5sb2NrU291cmNlLnN0YXJ0KDApO1xuICAgICAgICB9XG5cbiAgICAgICAgb25VbmxvY2suY2FsbCh0aGlzQXJnKTtcblxuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIGlmKGxvY2tlZCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB1bmxvY2ssIGZhbHNlKTtcbiAgICB9XG4gICAgcmV0dXJuIGxvY2tlZDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQnJvd3NlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxuZnVuY3Rpb24gRW1pdHRlcigpIHt9XG5cbkVtaXR0ZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudEVtaXR0ZXIucHJvdG90eXBlKTtcbkVtaXR0ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRW1pdHRlcjtcblxuRW1pdHRlci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgICBpZiAobGlzdGVuZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnModHlwZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBGaWxlID0ge1xuICAgIGV4dGVuc2lvbnM6IFtdLFxuICAgIGNhblBsYXk6IHt9XG59O1xuXG4vKlxuICogSW5pdGlhbCB0ZXN0c1xuICovXG5cbnZhciB0ZXN0cyA9IFtcbiAgICB7IGV4dDogJ29nZycsIHR5cGU6ICdhdWRpby9vZ2c7IGNvZGVjcz1cInZvcmJpc1wiJyB9LFxuICAgIHsgZXh0OiAnbXAzJywgdHlwZTogJ2F1ZGlvL21wZWc7JyB9LFxuICAgIHsgZXh0OiAnb3B1cycsIHR5cGU6ICdhdWRpby9vZ2c7IGNvZGVjcz1cIm9wdXNcIicgfSxcbiAgICB7IGV4dDogJ3dhdicsIHR5cGU6ICdhdWRpby93YXY7IGNvZGVjcz1cIjFcIicgfSxcbiAgICB7IGV4dDogJ200YScsIHR5cGU6ICdhdWRpby94LW00YTsnIH0sXG4gICAgeyBleHQ6ICdtNGEnLCB0eXBlOiAnYXVkaW8vYWFjOycgfVxuXTtcblxudmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcbmlmKGVsKSB7XG4gICAgdGVzdHMuZm9yRWFjaChmdW5jdGlvbih0ZXN0KSB7XG4gICAgICAgIHZhciBjYW5QbGF5VHlwZSA9ICEhZWwuY2FuUGxheVR5cGUodGVzdC50eXBlKTtcbiAgICAgICAgaWYoY2FuUGxheVR5cGUpIHtcbiAgICAgICAgICAgIEZpbGUuZXh0ZW5zaW9ucy5wdXNoKHRlc3QuZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBGaWxlLmNhblBsYXlbdGVzdC5leHRdID0gY2FuUGxheVR5cGU7XG4gICAgfSk7XG59XG5cbi8qXG4gKiBmaW5kIGEgc3VwcG9ydGVkIGZpbGVcbiAqL1xuXG5GaWxlLmdldEZpbGVFeHRlbnNpb24gPSBmdW5jdGlvbih1cmwpIHtcbiAgICAvLyBmcm9tIERhdGFVUkxcbiAgICBpZih1cmwuc3Vic3RyKDAsIDUpID09PSAnZGF0YTonKSB7XG4gICAgICAgIHZhciBtYXRjaCA9IHVybC5tYXRjaCgvZGF0YTphdWRpb1xcLyhvZ2d8bXAzfG9wdXN8d2F2fG00YSkvaSk7XG4gICAgICAgIGlmKG1hdGNoICYmIG1hdGNoLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIGZyb20gU3RhbmRhcmQgVVJMXG4gICAgdXJsID0gdXJsLnNwbGl0KCc/JylbMF07XG4gICAgdXJsID0gdXJsLnN1YnN0cih1cmwubGFzdEluZGV4T2YoJy8nKSArIDEpO1xuXG4gICAgdmFyIGEgPSB1cmwuc3BsaXQoJy4nKTtcbiAgICBpZihhLmxlbmd0aCA9PT0gMSB8fCAoYVswXSA9PT0gJycgJiYgYS5sZW5ndGggPT09IDIpKSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgcmV0dXJuIGEucG9wKCkudG9Mb3dlckNhc2UoKTtcbn07XG5cbkZpbGUuZ2V0U3VwcG9ydGVkRmlsZSA9IGZ1bmN0aW9uKGZpbGVOYW1lcykge1xuICAgIHZhciBuYW1lO1xuXG4gICAgaWYoQXJyYXkuaXNBcnJheShmaWxlTmFtZXMpKSB7XG4gICAgICAgIC8vIGlmIGFycmF5IGdldCB0aGUgZmlyc3Qgb25lIHRoYXQgd29ya3NcbiAgICAgICAgZmlsZU5hbWVzLnNvbWUoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgbmFtZSA9IGl0ZW07XG4gICAgICAgICAgICB2YXIgZXh0ID0gdGhpcy5nZXRGaWxlRXh0ZW5zaW9uKGl0ZW0pO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZXh0ZW5zaW9ucy5pbmRleE9mKGV4dCkgPiAtMTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICAgIGVsc2UgaWYodHlwZW9mIGZpbGVOYW1lcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgLy8gaWYgbm90IGFycmF5IGFuZCBpcyBvYmplY3RcbiAgICAgICAgT2JqZWN0LmtleXMoZmlsZU5hbWVzKS5zb21lKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgbmFtZSA9IGZpbGVOYW1lc1trZXldO1xuICAgICAgICAgICAgdmFyIGV4dCA9IHRoaXMuZ2V0RmlsZUV4dGVuc2lvbihuYW1lKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmV4dGVuc2lvbnMuaW5kZXhPZihleHQpID4gLTE7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgICAvLyBpZiBzdHJpbmcganVzdCByZXR1cm5cbiAgICByZXR1cm4gbmFtZSB8fCBmaWxlTmFtZXM7XG59O1xuXG4vKlxuICogaW5mZXIgZmlsZSB0eXBlc1xuICovXG5cbkZpbGUuaXNBdWRpb0J1ZmZlciA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB3aW5kb3cuQXVkaW9CdWZmZXIgJiZcbiAgICAgICAgICAgICAgZGF0YSBpbnN0YW5jZW9mIHdpbmRvdy5BdWRpb0J1ZmZlcik7XG59O1xuXG5GaWxlLmlzTWVkaWFFbGVtZW50ID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHJldHVybiAhIShkYXRhICYmXG4gICAgICAgICAgICAgIHdpbmRvdy5IVE1MTWVkaWFFbGVtZW50ICYmXG4gICAgICAgICAgICAgIGRhdGEgaW5zdGFuY2VvZiB3aW5kb3cuSFRNTE1lZGlhRWxlbWVudCk7XG59O1xuXG5GaWxlLmlzTWVkaWFTdHJlYW0gPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgcmV0dXJuICEhKGRhdGEgJiZcbiAgICAgICAgICAgICAgdHlwZW9mIGRhdGEuZ2V0QXVkaW9UcmFja3MgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgICAgICAgZGF0YS5nZXRBdWRpb1RyYWNrcygpLmxlbmd0aCAmJlxuICAgICAgICAgICAgICB3aW5kb3cuTWVkaWFTdHJlYW1UcmFjayAmJlxuICAgICAgICAgICAgICBkYXRhLmdldEF1ZGlvVHJhY2tzKClbMF0gaW5zdGFuY2VvZiB3aW5kb3cuTWVkaWFTdHJlYW1UcmFjayk7XG59O1xuXG5GaWxlLmlzT3NjaWxsYXRvclR5cGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgcmV0dXJuICEhKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICAgKGRhdGEgPT09ICdzaW5lJyB8fCBkYXRhID09PSAnc3F1YXJlJyB8fFxuICAgICAgICAgICAgICBkYXRhID09PSAnc2F3dG9vdGgnIHx8IGRhdGEgPT09ICd0cmlhbmdsZScpKTtcbn07XG5cbkZpbGUuaXNTY3JpcHRDb25maWcgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgcmV0dXJuICEhKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdvYmplY3QnICYmXG4gICAgICAgICAgICAgIGRhdGEuYnVmZmVyU2l6ZSAmJiBkYXRhLmNoYW5uZWxzICYmIGRhdGEuY2FsbGJhY2spO1xufTtcblxuRmlsZS5pc1VSTCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJiB0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgICAgICAoZGF0YS5pbmRleE9mKCcuJykgPiAtMSB8fCBkYXRhLnN1YnN0cigwLCA1KSA9PT0gJ2RhdGE6JykpO1xufTtcblxuRmlsZS5jb250YWluc1VSTCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIGlmKCFjb25maWcpIHsgcmV0dXJuIGZhbHNlOyB9XG4gICAgLy8gc3RyaW5nLCBhcnJheSBvciBvYmplY3Qgd2l0aCB1cmwgcHJvcGVydHkgdGhhdCBpcyBzdHJpbmcgb3IgYXJyYXlcbiAgICB2YXIgdXJsID0gY29uZmlnLnVybCB8fCBjb25maWc7XG4gICAgcmV0dXJuIHRoaXMuaXNVUkwodXJsKSB8fCAoQXJyYXkuaXNBcnJheSh1cmwpICYmIHRoaXMuaXNVUkwodXJsWzBdKSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGU7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFbWl0dGVyID0gcmVxdWlyZSgnLi9lbWl0dGVyLmpzJyk7XG5cbmZ1bmN0aW9uIExvYWRlcih1cmwpIHtcbiAgICB2YXIgZW1pdHRlciA9IG5ldyBFbWl0dGVyKCksXG4gICAgICAgIHByb2dyZXNzID0gMCxcbiAgICAgICAgYXVkaW9Db250ZXh0LFxuICAgICAgICBpc1RvdWNoTG9ja2VkLFxuICAgICAgICByZXF1ZXN0LFxuICAgICAgICB0aW1lb3V0LFxuICAgICAgICBkYXRhO1xuXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKGF1ZGlvQ29udGV4dCkge1xuICAgICAgICAgICAgbG9hZEFycmF5QnVmZmVyKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsb2FkQXVkaW9FbGVtZW50KCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGRpc3BhdGNoID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgncHJvZ3Jlc3MnLCAxKTtcbiAgICAgICAgZW1pdHRlci5lbWl0KCdsb2FkZWQnLCBidWZmZXIpO1xuICAgICAgICBlbWl0dGVyLmVtaXQoJ2NvbXBsZXRlJywgYnVmZmVyKTtcbiAgICB9O1xuXG4gICAgdmFyIGxvYWRBcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHJlcXVlc3Qub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgICAgICByZXF1ZXN0Lm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgaWYgKGV2ZW50Lmxlbmd0aENvbXB1dGFibGUpIHtcbiAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IGV2ZW50LmxvYWRlZCAvIGV2ZW50LnRvdGFsO1xuICAgICAgICAgICAgICAgIC8vIG9uUHJvZ3Jlc3MuZGlzcGF0Y2gocHJvZ3Jlc3MpO1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncHJvZ3Jlc3MnLCBwcm9ncmVzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhdWRpb0NvbnRleHQuZGVjb2RlQXVkaW9EYXRhKFxuICAgICAgICAgICAgICAgIHJlcXVlc3QucmVzcG9uc2UsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSBidWZmZXI7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IDE7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BhdGNoKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnZXJyb3InLCBlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAvLyBvbkVycm9yLmRpc3BhdGNoKGUpO1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdlcnJvcicsIGUpO1xuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LnNlbmQoKTtcbiAgICB9O1xuXG4gICAgdmFyIGxvYWRBdWRpb0VsZW1lbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIWRhdGEgfHwgIWRhdGEudGFnTmFtZSkge1xuICAgICAgICAgICAgZGF0YSA9IG5ldyBBdWRpbygpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYoIWlzVG91Y2hMb2NrZWQpIHtcbiAgICAgICAgICAgIC8vIHRpbWVvdXQgYmVjYXVzZSBzb21ldGltZXMgY2FucGxheXRocm91Z2ggZG9lc24ndCBmaXJlXG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICAgICAgdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KHJlYWR5SGFuZGxlciwgMjAwMCk7XG4gICAgICAgICAgICBkYXRhLmFkZEV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgcmVhZHlIYW5kbGVyLCBmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICBkYXRhLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZXJyb3JIYW5kbGVyLCBmYWxzZSk7XG4gICAgICAgIGRhdGEucHJlbG9hZCA9ICdhdXRvJztcbiAgICAgICAgZGF0YS5zcmMgPSB1cmw7XG4gICAgICAgIGRhdGEubG9hZCgpO1xuXG4gICAgICAgIGlmIChpc1RvdWNoTG9ja2VkKSB7XG4gICAgICAgICAgICBkaXNwYXRjaChkYXRhKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgZXJyb3JIYW5kbGVyID0gZnVuY3Rpb24oZSkge1xuICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICBlbWl0dGVyLmVtaXQoJ2Vycm9yJywgZSk7XG4gICAgfTtcblxuICAgIHZhciByZWFkeUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgaWYoIWRhdGEpIHsgcmV0dXJuOyB9XG4gICAgICAgIGRhdGEucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCByZWFkeUhhbmRsZXIpO1xuICAgICAgICBwcm9ncmVzcyA9IDE7XG4gICAgICAgIGRpc3BhdGNoKGRhdGEpO1xuICAgIH07XG5cbiAgICB2YXIgY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHJlcXVlc3QgJiYgcmVxdWVzdC5yZWFkeVN0YXRlICE9PSA0KSB7XG4gICAgICAgICAgcmVxdWVzdC5hYm9ydCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmKGRhdGEgJiYgdHlwZW9mIGRhdGEucmVtb3ZlRXZlbnRMaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgZGF0YS5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHJlYWR5SGFuZGxlcik7XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0KTtcblxuICAgICAgICBlbWl0dGVyLnJlbW92ZUFsbExpc3RlbmVycygncHJvZ3Jlc3MnKTtcbiAgICAgICAgZW1pdHRlci5yZW1vdmVBbGxMaXN0ZW5lcnMoJ2NvbXBsZXRlJyk7XG4gICAgICAgIGVtaXR0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCdsb2FkZWQnKTtcbiAgICAgICAgZW1pdHRlci5yZW1vdmVBbGxMaXN0ZW5lcnMoJ2Vycm9yJyk7XG4gICAgfTtcblxuICAgIHZhciBkZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNhbmNlbCgpO1xuICAgICAgICByZXF1ZXN0ID0gbnVsbDtcbiAgICAgICAgZGF0YSA9IG51bGw7XG4gICAgICAgIGF1ZGlvQ29udGV4dCA9IG51bGw7XG4gICAgfTtcblxuICAgIHZhciBsb2FkID0gZnVuY3Rpb24obmV3VXJsKSB7XG4gICAgICAgIHVybCA9IG5ld1VybDtcbiAgICAgICAgc3RhcnQoKTtcbiAgICB9O1xuXG4gICAgdmFyIGFwaSA9IHtcbiAgICAgICAgb246IGVtaXR0ZXIub24uYmluZChlbWl0dGVyKSxcbiAgICAgICAgb25jZTogZW1pdHRlci5vbmNlLmJpbmQoZW1pdHRlciksXG4gICAgICAgIG9mZjogZW1pdHRlci5vZmYuYmluZChlbWl0dGVyKSxcbiAgICAgICAgbG9hZDogbG9hZCxcbiAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICBjYW5jZWw6IGNhbmNlbCxcbiAgICAgICAgZGVzdHJveTogZGVzdHJveVxuICAgIH07XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhhcGksIHtcbiAgICAgICAgJ2RhdGEnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAncHJvZ3Jlc3MnOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9ncmVzcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgJ2F1ZGlvQ29udGV4dCc6IHtcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhdWRpb0NvbnRleHQgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgJ2lzVG91Y2hMb2NrZWQnOiB7XG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaXNUb3VjaExvY2tlZCA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZShhcGkpO1xufVxuXG5Mb2FkZXIuR3JvdXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZW1pdHRlciA9IG5ldyBFbWl0dGVyKCksXG4gICAgICAgIHF1ZXVlID0gW10sXG4gICAgICAgIG51bUxvYWRlZCA9IDAsXG4gICAgICAgIG51bVRvdGFsID0gMDtcblxuICAgIHZhciBhZGQgPSBmdW5jdGlvbihsb2FkZXIpIHtcbiAgICAgICAgcXVldWUucHVzaChsb2FkZXIpO1xuICAgICAgICBudW1Ub3RhbCsrO1xuICAgICAgICByZXR1cm4gbG9hZGVyO1xuICAgIH07XG5cbiAgICB2YXIgc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgbnVtVG90YWwgPSBxdWV1ZS5sZW5ndGg7XG4gICAgICAgIG5leHQoKTtcbiAgICB9O1xuXG4gICAgdmFyIG5leHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYocXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ2NvbXBsZXRlJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbG9hZGVyID0gcXVldWUucG9wKCk7XG4gICAgICAgIGxvYWRlci5vbigncHJvZ3Jlc3MnLCBwcm9ncmVzc0hhbmRsZXIpO1xuICAgICAgICBsb2FkZXIub24oJ2xvYWRlZCcsIGNvbXBsZXRlSGFuZGxlcik7XG4gICAgICAgIGxvYWRlci5vbignZXJyb3InLCBlcnJvckhhbmRsZXIpO1xuICAgICAgICBsb2FkZXIuc3RhcnQoKTtcbiAgICB9O1xuXG4gICAgdmFyIHByb2dyZXNzSGFuZGxlciA9IGZ1bmN0aW9uKHByb2dyZXNzKSB7XG4gICAgICAgIHZhciBsb2FkZWQgPSBudW1Mb2FkZWQgKyBwcm9ncmVzcztcbiAgICAgICAgZW1pdHRlci5lbWl0KCdwcm9ncmVzcycsIGxvYWRlZCAvIG51bVRvdGFsKTtcbiAgICB9O1xuXG4gICAgdmFyIGNvbXBsZXRlSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBudW1Mb2FkZWQrKztcbiAgICAgICAgZW1pdHRlci5lbWl0KCdwcm9ncmVzcycsIG51bUxvYWRlZCAvIG51bVRvdGFsKTtcbiAgICAgICAgbmV4dCgpO1xuICAgIH07XG5cbiAgICB2YXIgZXJyb3JIYW5kbGVyID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBlbWl0dGVyLmVtaXQoJ2Vycm9yJywgZSk7XG4gICAgICAgIG5leHQoKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoe1xuICAgICAgICBvbjogZW1pdHRlci5vbi5iaW5kKGVtaXR0ZXIpLFxuICAgICAgICBvbmNlOiBlbWl0dGVyLm9uY2UuYmluZChlbWl0dGVyKSxcbiAgICAgICAgb2ZmOiBlbWl0dGVyLm9mZi5iaW5kKGVtaXR0ZXIpLFxuICAgICAgICBhZGQ6IGFkZCxcbiAgICAgICAgc3RhcnQ6IHN0YXJ0XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExvYWRlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gTWljcm9waG9uZShjb25uZWN0ZWQsIGRlbmllZCwgZXJyb3IsIHRoaXNBcmcpIHtcbiAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhXyA9IChuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWEpO1xuICAgIHRoaXMuX2lzU3VwcG9ydGVkID0gISFuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhXztcbiAgICB0aGlzLl9zdHJlYW0gPSBudWxsO1xuXG4gICAgdGhpcy5fb25Db25uZWN0ZWQgPSBjb25uZWN0ZWQuYmluZCh0aGlzQXJnIHx8IHRoaXMpO1xuICAgIHRoaXMuX29uRGVuaWVkID0gZGVuaWVkID8gZGVuaWVkLmJpbmQodGhpc0FyZyB8fCB0aGlzKSA6IGZ1bmN0aW9uKCkge307XG4gICAgdGhpcy5fb25FcnJvciA9IGVycm9yID8gZXJyb3IuYmluZCh0aGlzQXJnIHx8IHRoaXMpIDogZnVuY3Rpb24oKSB7fTtcbn1cblxuTWljcm9waG9uZS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9pc1N1cHBvcnRlZCkgeyByZXR1cm47IH1cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYV8oe2F1ZGlvOnRydWV9LCBmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgICAgc2VsZi5fc3RyZWFtID0gc3RyZWFtO1xuICAgICAgICBzZWxmLl9vbkNvbm5lY3RlZChzdHJlYW0pO1xuICAgIH0sIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYoZS5uYW1lID09PSAnUGVybWlzc2lvbkRlbmllZEVycm9yJyB8fCBlID09PSAnUEVSTUlTU0lPTl9ERU5JRUQnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUGVybWlzc2lvbiBkZW5pZWQuIFlvdSBjYW4gdW5kbyB0aGlzIGJ5IGNsaWNraW5nIHRoZSBjYW1lcmEgaWNvbiB3aXRoIHRoZSByZWQgY3Jvc3MgaW4gdGhlIGFkZHJlc3MgYmFyJyk7XG4gICAgICAgICAgICBzZWxmLl9vbkRlbmllZCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5fb25FcnJvcihlLm1lc3NhZ2UgfHwgZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbk1pY3JvcGhvbmUucHJvdG90eXBlLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgICBpZih0aGlzLl9zdHJlYW0pIHtcbiAgICAgICAgdGhpcy5fc3RyZWFtLnN0b3AoKTtcbiAgICAgICAgdGhpcy5fc3RyZWFtID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhNaWNyb3Bob25lLnByb3RvdHlwZSwge1xuICAgICdzdHJlYW0nOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RyZWFtO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnaXNTdXBwb3J0ZWQnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faXNTdXBwb3J0ZWQ7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaWNyb3Bob25lO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKlxuICogVE9ETzogRW5kZWQgaGFuZGxlclxuICovXG5cbnZhciBHcm91cCA9IHJlcXVpcmUoJy4uL2dyb3VwLmpzJyk7XG5cbmZ1bmN0aW9uIFNvdW5kR3JvdXAoY29udGV4dCwgZGVzdGluYXRpb24pIHtcbiAgICBHcm91cC5jYWxsKHRoaXMsIGNvbnRleHQsIGRlc3RpbmF0aW9uKTtcbiAgICB0aGlzLl9zcmMgPSBudWxsO1xufVxuXG5Tb3VuZEdyb3VwLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoR3JvdXAucHJvdG90eXBlKTtcblNvdW5kR3JvdXAucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gU291bmRHcm91cDtcblxuLypcbiAqIEFkZCAvIHJlbW92ZVxuICovXG5cblNvdW5kR3JvdXAucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgR3JvdXAucHJvdG90eXBlLmFkZC5jYWxsKHRoaXMsIHNvdW5kKTtcbiAgICB0aGlzLl9nZXRTb3VyY2UoKTtcbn07XG5cblNvdW5kR3JvdXAucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHNvdW5kT3JJZCkge1xuICAgIEdyb3VwLnByb3RvdHlwZS5yZW1vdmUuY2FsbCh0aGlzLCBzb3VuZE9ySWQpO1xuICAgIHRoaXMuX2dldFNvdXJjZSgpO1xufTtcblxuU291bmRHcm91cC5wcm90b3R5cGUuX2dldFNvdXJjZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9zb3VuZHMubGVuZ3RoKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5fc291bmRzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICByZXR1cm4gYi5kdXJhdGlvbiAtIGEuZHVyYXRpb247XG4gICAgfSk7XG5cbiAgICB0aGlzLl9zcmMgPSB0aGlzLl9zb3VuZHNbMF07XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTb3VuZEdyb3VwLnByb3RvdHlwZSwge1xuICAgICdjdXJyZW50VGltZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zcmMgPyB0aGlzLl9zcmMuY3VycmVudFRpbWUgOiAwO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLnN0b3AoKTtcbiAgICAgICAgICAgIHRoaXMucGxheSgwLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdkdXJhdGlvbic6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zcmMgPyB0aGlzLl9zcmMuZHVyYXRpb24gOiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvLyAnZW5kZWQnOiB7XG4gICAgLy8gICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgLy8gICAgICAgICByZXR1cm4gdGhpcy5fc3JjID8gdGhpcy5fc3JjLmVuZGVkIDogZmFsc2U7XG4gICAgLy8gICAgIH1cbiAgICAvLyB9LFxuICAgICdsb29wJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2xvb3A7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2xvb3AgPSAhIXZhbHVlO1xuICAgICAgICAgICAgdGhpcy5fc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5sb29wID0gdGhpcy5fbG9vcDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncGF1c2VkJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NyYyA/IHRoaXMuX3NyYy5wYXVzZWQgOiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3Byb2dyZXNzJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NyYyA/IHRoaXMuX3NyYy5wcm9ncmVzcyA6IDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwbGF5YmFja1JhdGUnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGxheWJhY2tSYXRlO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9wbGF5YmFja1JhdGUgPSB2YWx1ZTtcbiAgICAgICAgICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgICAgICAgICAgc291bmQucGxheWJhY2tSYXRlID0gdGhpcy5fcGxheWJhY2tSYXRlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwbGF5aW5nJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NyYyA/IHRoaXMuX3NyYy5wbGF5aW5nIDogZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBTb3VuZEdyb3VwO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgTWljcm9waG9uZSA9IHJlcXVpcmUoJy4vbWljcm9waG9uZS5qcycpLFxuICAgIFdhdmVmb3JtID0gcmVxdWlyZSgnLi93YXZlZm9ybS5qcycpO1xuXG52YXIgVXRpbHMgPSB7fTtcblxuLypcbiAqIGF1ZGlvIGNvbnRleHRcbiAqL1xuXG5VdGlscy5zZXRDb250ZXh0ID0gZnVuY3Rpb24oY29udGV4dCkge1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufTtcblxuLypcbiAqIGF1ZGlvIGJ1ZmZlclxuICovXG5cblV0aWxzLmNsb25lQnVmZmVyID0gZnVuY3Rpb24oYnVmZmVyKSB7XG4gICAgaWYoIXRoaXMuX2NvbnRleHQpIHsgcmV0dXJuIGJ1ZmZlcjsgfVxuXG4gICAgdmFyIG51bUNoYW5uZWxzID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHMsXG4gICAgICAgIGNsb25lZCA9IHRoaXMuX2NvbnRleHQuY3JlYXRlQnVmZmVyKG51bUNoYW5uZWxzLCBidWZmZXIubGVuZ3RoLCBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1DaGFubmVsczsgaSsrKSB7XG4gICAgICAgIGNsb25lZC5nZXRDaGFubmVsRGF0YShpKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKGkpKTtcbiAgICB9XG4gICAgcmV0dXJuIGNsb25lZDtcbn07XG5cblV0aWxzLnJldmVyc2VCdWZmZXIgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgICB2YXIgbnVtQ2hhbm5lbHMgPSBidWZmZXIubnVtYmVyT2ZDaGFubmVscztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUNoYW5uZWxzOyBpKyspIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnJldmVyc2UuY2FsbChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSkpO1xuICAgIH1cbiAgICByZXR1cm4gYnVmZmVyO1xufTtcblxuLypcbiAqIHJhbXAgYXVkaW8gcGFyYW1cbiAqL1xuXG5VdGlscy5yYW1wID0gZnVuY3Rpb24ocGFyYW0sIGZyb21WYWx1ZSwgdG9WYWx1ZSwgZHVyYXRpb24pIHtcbiAgICBpZighdGhpcy5fY29udGV4dCkgeyByZXR1cm47IH1cblxuICAgIHBhcmFtLnNldFZhbHVlQXRUaW1lKGZyb21WYWx1ZSwgdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSk7XG4gICAgcGFyYW0ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUodG9WYWx1ZSwgdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGR1cmF0aW9uKTtcbn07XG5cbi8qXG4gKiBnZXQgZnJlcXVlbmN5IGZyb20gbWluIHRvIG1heCBieSBwYXNzaW5nIDAgdG8gMVxuICovXG5cblV0aWxzLmdldEZyZXF1ZW5jeSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYoIXRoaXMuX2NvbnRleHQpIHsgcmV0dXJuIDA7IH1cbiAgICAvLyBnZXQgZnJlcXVlbmN5IGJ5IHBhc3NpbmcgbnVtYmVyIGZyb20gMCB0byAxXG4gICAgLy8gQ2xhbXAgdGhlIGZyZXF1ZW5jeSBiZXR3ZWVuIHRoZSBtaW5pbXVtIHZhbHVlICg0MCBIeikgYW5kIGhhbGYgb2YgdGhlXG4gICAgLy8gc2FtcGxpbmcgcmF0ZS5cbiAgICB2YXIgbWluVmFsdWUgPSA0MDtcbiAgICB2YXIgbWF4VmFsdWUgPSB0aGlzLl9jb250ZXh0LnNhbXBsZVJhdGUgLyAyO1xuICAgIC8vIExvZ2FyaXRobSAoYmFzZSAyKSB0byBjb21wdXRlIGhvdyBtYW55IG9jdGF2ZXMgZmFsbCBpbiB0aGUgcmFuZ2UuXG4gICAgdmFyIG51bWJlck9mT2N0YXZlcyA9IE1hdGgubG9nKG1heFZhbHVlIC8gbWluVmFsdWUpIC8gTWF0aC5MTjI7XG4gICAgLy8gQ29tcHV0ZSBhIG11bHRpcGxpZXIgZnJvbSAwIHRvIDEgYmFzZWQgb24gYW4gZXhwb25lbnRpYWwgc2NhbGUuXG4gICAgdmFyIG11bHRpcGxpZXIgPSBNYXRoLnBvdygyLCBudW1iZXJPZk9jdGF2ZXMgKiAodmFsdWUgLSAxLjApKTtcbiAgICAvLyBHZXQgYmFjayB0byB0aGUgZnJlcXVlbmN5IHZhbHVlIGJldHdlZW4gbWluIGFuZCBtYXguXG4gICAgcmV0dXJuIG1heFZhbHVlICogbXVsdGlwbGllcjtcbn07XG5cbi8qXG4gKiBtaWNyb3Bob25lIHV0aWxcbiAqL1xuXG5VdGlscy5taWNyb3Bob25lID0gZnVuY3Rpb24oY29ubmVjdGVkLCBkZW5pZWQsIGVycm9yLCB0aGlzQXJnKSB7XG4gICAgcmV0dXJuIG5ldyBNaWNyb3Bob25lKGNvbm5lY3RlZCwgZGVuaWVkLCBlcnJvciwgdGhpc0FyZyk7XG59O1xuXG4vKlxuICogRm9ybWF0IHNlY29uZHMgYXMgdGltZWNvZGUgc3RyaW5nXG4gKi9cblxuVXRpbHMudGltZUNvZGUgPSBmdW5jdGlvbihzZWNvbmRzLCBkZWxpbSkge1xuICAgIGlmKGRlbGltID09PSB1bmRlZmluZWQpIHsgZGVsaW0gPSAnOic7IH1cbiAgICB2YXIgaCA9IE1hdGguZmxvb3Ioc2Vjb25kcyAvIDM2MDApO1xuICAgIHZhciBtID0gTWF0aC5mbG9vcigoc2Vjb25kcyAlIDM2MDApIC8gNjApO1xuICAgIHZhciBzID0gTWF0aC5mbG9vcigoc2Vjb25kcyAlIDM2MDApICUgNjApO1xuICAgIHZhciBociA9IChoID09PSAwID8gJycgOiAoaCA8IDEwID8gJzAnICsgaCArIGRlbGltIDogaCArIGRlbGltKSk7XG4gICAgdmFyIG1uID0gKG0gPCAxMCA/ICcwJyArIG0gOiBtKSArIGRlbGltO1xuICAgIHZhciBzYyA9IChzIDwgMTAgPyAnMCcgKyBzIDogcyk7XG4gICAgcmV0dXJuIGhyICsgbW4gKyBzYztcbn07XG5cbi8qXG4gKiB3YXZlZm9ybVxuICovXG5cblV0aWxzLndhdmVmb3JtID0gZnVuY3Rpb24oYnVmZmVyLCBsZW5ndGgpIHtcbiAgICByZXR1cm4gbmV3IFdhdmVmb3JtKGJ1ZmZlciwgbGVuZ3RoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbHM7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFdhdmVmb3JtKCkge1xuXG4gICAgdmFyIGF1ZGlvQnVmZmVyLFxuICAgICAgICB3YXZlZm9ybURhdGE7XG5cbiAgICB2YXIgY29tcHV0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgbGVuZ3RoKSB7XG4gICAgICAgIGlmKCF3aW5kb3cuRmxvYXQzMkFycmF5IHx8ICF3aW5kb3cuQXVkaW9CdWZmZXIpIHsgcmV0dXJuIFtdOyB9XG5cbiAgICAgICAgdmFyIHNhbWVCdWZmZXIgPSBidWZmZXIgPT09IGF1ZGlvQnVmZmVyO1xuICAgICAgICB2YXIgc2FtZUxlbmd0aCA9IHdhdmVmb3JtRGF0YSAmJiB3YXZlZm9ybURhdGEubGVuZ3RoID09PSBsZW5ndGg7XG4gICAgICAgIGlmKHNhbWVCdWZmZXIgJiYgc2FtZUxlbmd0aCkgeyByZXR1cm4gd2F2ZWZvcm1EYXRhOyB9XG4gICAgICAgIFxuICAgICAgICAvL2NvbnNvbGUubG9nKCctLS0tLS0tLS0tLS0tLS0tLS0tJyk7XG4gICAgICAgIC8vY29uc29sZS50aW1lKCd3YXZlZm9ybURhdGEnKTtcbiAgICAgICAgdmFyIHdhdmVmb3JtID0gbmV3IEZsb2F0MzJBcnJheShsZW5ndGgpLFxuICAgICAgICAgICAgY2h1bmsgPSBNYXRoLmZsb29yKGJ1ZmZlci5sZW5ndGggLyBsZW5ndGgpLFxuICAgICAgICAgICAgLy9jaHVuayA9IGJ1ZmZlci5sZW5ndGggLyBsZW5ndGgsXG4gICAgICAgICAgICByZXNvbHV0aW9uID0gNSwgLy8gMTBcbiAgICAgICAgICAgIGluY3IgPSBNYXRoLmZsb29yKGNodW5rIC8gcmVzb2x1dGlvbiksXG4gICAgICAgICAgICBncmVhdGVzdCA9IDA7XG5cbiAgICAgICAgaWYoaW5jciA8IDEpIHsgaW5jciA9IDE7IH1cblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgY2hubHMgPSBidWZmZXIubnVtYmVyT2ZDaGFubmVsczsgaSA8IGNobmxzOyBpKyspIHtcbiAgICAgICAgICAgIC8vIGNoZWNrIGVhY2ggY2hhbm5lbFxuICAgICAgICAgICAgdmFyIGNoYW5uZWwgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSk7XG4gICAgICAgICAgICAvL2ZvciAodmFyIGogPSBsZW5ndGggLSAxOyBqID49IDA7IGotLSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBsZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIC8vIGdldCBoaWdoZXN0IHZhbHVlIHdpdGhpbiB0aGUgY2h1bmtcbiAgICAgICAgICAgICAgICAvL3ZhciBjaCA9IGogKiBjaHVuaztcbiAgICAgICAgICAgICAgICAvL2ZvciAodmFyIGsgPSBjaCArIGNodW5rIC0gMTsgayA+PSBjaDsgayAtPSBpbmNyKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IGogKiBjaHVuaywgbCA9IGsgKyBjaHVuazsgayA8IGw7IGsgKz0gaW5jcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBzZWxlY3QgaGlnaGVzdCB2YWx1ZSBmcm9tIGNoYW5uZWxzXG4gICAgICAgICAgICAgICAgICAgIHZhciBhID0gY2hhbm5lbFtrXTtcbiAgICAgICAgICAgICAgICAgICAgaWYoYSA8IDApIHsgYSA9IC1hOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChhID4gd2F2ZWZvcm1bal0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhdmVmb3JtW2pdID0gYTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgaGlnaGVzdCBvdmVyYWxsIGZvciBzY2FsaW5nXG4gICAgICAgICAgICAgICAgICAgIGlmKGEgPiBncmVhdGVzdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3JlYXRlc3QgPSBhO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIHNjYWxlIHVwP1xuICAgICAgICB2YXIgc2NhbGUgPSAxIC8gZ3JlYXRlc3QsXG4gICAgICAgICAgICBsZW4gPSB3YXZlZm9ybS5sZW5ndGg7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgd2F2ZWZvcm1baV0gKj0gc2NhbGU7XG4gICAgICAgIH1cbiAgICAgICAgLy9jb25zb2xlLnRpbWVFbmQoJ3dhdmVmb3JtRGF0YScpO1xuXG4gICAgICAgIC8vIGNhY2hlIGZvciByZXBlYXRlZCBjYWxsc1xuICAgICAgICBhdWRpb0J1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgd2F2ZWZvcm1EYXRhID0gd2F2ZWZvcm07XG5cbiAgICAgICAgcmV0dXJuIHdhdmVmb3JtO1xuICAgIH07XG5cbiAgICB2YXIgZHJhdyA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICB2YXIgeCwgeTtcbiAgICAgICAgdmFyIGNhbnZhcyA9IGNvbmZpZy5jYW52YXMgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIHZhciB3aWR0aCA9IGNvbmZpZy53aWR0aCB8fCBjYW52YXMud2lkdGg7XG4gICAgICAgIHZhciBoZWlnaHQgPSBjb25maWcuaGVpZ2h0IHx8IGNhbnZhcy5oZWlnaHQ7XG4gICAgICAgIHZhciBjb2xvciA9IGNvbmZpZy5jb2xvciB8fCAnIzMzMzMzMyc7XG4gICAgICAgIHZhciBiZ0NvbG9yID0gY29uZmlnLmJnQ29sb3IgfHwgJyNkZGRkZGQnO1xuICAgICAgICB2YXIgYnVmZmVyID0gY29uZmlnLnNvdW5kID8gY29uZmlnLnNvdW5kLmRhdGEgOiBjb25maWcuYnVmZmVyIHx8IGF1ZGlvQnVmZmVyO1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuY29tcHV0ZShidWZmZXIsIHdpZHRoKTtcblxuICAgICAgICB2YXIgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gY29sb3I7XG4gICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gYmdDb2xvcjtcbiAgICAgICAgY29udGV4dC5maWxsUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgY29udGV4dC5iZWdpblBhdGgoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB4ID0gaSArIDAuNTtcbiAgICAgICAgICAgIHkgPSBoZWlnaHQgLSBNYXRoLnJvdW5kKGhlaWdodCAqIGRhdGFbaV0pO1xuICAgICAgICAgICAgY29udGV4dC5tb3ZlVG8oeCwgeSk7XG4gICAgICAgICAgICBjb250ZXh0LmxpbmVUbyh4LCBoZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnRleHQuc3Ryb2tlKCk7XG5cbiAgICAgICAgcmV0dXJuIGNhbnZhcztcbiAgICB9O1xuICAgIFxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgY29tcHV0ZTogY29tcHV0ZSxcbiAgICAgICAgZHJhdzogZHJhd1xuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdhdmVmb3JtO1xuIl19
