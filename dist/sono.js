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
 * Ended handler
 */

// Sound.prototype.onEnded = function(fn, context) {
//     this._endedCallback = fn ? fn.bind(context || this) : null;
//     return this;
// };

// Sound.prototype._endedHandler = function() {
//     this.emit('ended');

//     // if(typeof this._endedCallback === 'function') {
//     //     this._endedCallback(this);
//     // }
// };

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

    // if(typeof this._source.onEnded === 'function') {
    //     this._source.onEnded(this._endedHandler, this);
    // }
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

// BufferSource.prototype.onEnded = function(fn, context) {
//     this._endedCallback = fn ? fn.bind(context || this) : null;
// };

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

},{}],26:[function(require,module,exports){
'use strict';

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
 * TODO: Ended handler
 */

// SoundGroup.prototype.onEnded = function(fn, context) {
//     this._endedCallback = fn ? fn.bind(context || this) : null;
//     return this;
// };

// SoundGroup.prototype._endedHandler = function() {
//     if(typeof this._endedCallback === 'function') {
//         this._endedCallback(this);
//     }
// };

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvc29uby5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwic3JjL2xpYi9lZmZlY3QuanMiLCJzcmMvbGliL2VmZmVjdC9hbmFseXNlci5qcyIsInNyYy9saWIvZWZmZWN0L2Rpc3RvcnRpb24uanMiLCJzcmMvbGliL2VmZmVjdC9lY2hvLmpzIiwic3JjL2xpYi9lZmZlY3QvZmFrZS1jb250ZXh0LmpzIiwic3JjL2xpYi9lZmZlY3QvZmlsdGVyLmpzIiwic3JjL2xpYi9lZmZlY3QvZmxhbmdlci5qcyIsInNyYy9saWIvZWZmZWN0L3Bhbm5lci5qcyIsInNyYy9saWIvZWZmZWN0L3BoYXNlci5qcyIsInNyYy9saWIvZWZmZWN0L3JlY29yZGVyLmpzIiwic3JjL2xpYi9lZmZlY3QvcmV2ZXJiLmpzIiwic3JjL2xpYi9ncm91cC5qcyIsInNyYy9saWIvc291bmQuanMiLCJzcmMvbGliL3NvdXJjZS9idWZmZXItc291cmNlLmpzIiwic3JjL2xpYi9zb3VyY2UvbWVkaWEtc291cmNlLmpzIiwic3JjL2xpYi9zb3VyY2UvbWljcm9waG9uZS1zb3VyY2UuanMiLCJzcmMvbGliL3NvdXJjZS9vc2NpbGxhdG9yLXNvdXJjZS5qcyIsInNyYy9saWIvc291cmNlL3NjcmlwdC1zb3VyY2UuanMiLCJzcmMvbGliL3V0aWxzL2Jyb3dzZXIuanMiLCJzcmMvbGliL3V0aWxzL2VtaXR0ZXIuanMiLCJzcmMvbGliL3V0aWxzL2ZpbGUuanMiLCJzcmMvbGliL3V0aWxzL2xvYWRlci5qcyIsInNyYy9saWIvdXRpbHMvbWljcm9waG9uZS5qcyIsInNyYy9saWIvdXRpbHMvc291bmQtZ3JvdXAuanMiLCJzcmMvbGliL3V0aWxzL3V0aWxzLmpzIiwic3JjL2xpYi91dGlscy93YXZlZm9ybS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIEJyb3dzZXIgPSByZXF1aXJlKCcuL2xpYi91dGlscy9icm93c2VyLmpzJyksXG4gICAgRmlsZSA9IHJlcXVpcmUoJy4vbGliL3V0aWxzL2ZpbGUuanMnKSxcbiAgICBHcm91cCA9IHJlcXVpcmUoJy4vbGliL2dyb3VwLmpzJyksXG4gICAgTG9hZGVyID0gcmVxdWlyZSgnLi9saWIvdXRpbHMvbG9hZGVyLmpzJyksXG4gICAgU291bmQgPSByZXF1aXJlKCcuL2xpYi9zb3VuZC5qcycpLFxuICAgIFNvdW5kR3JvdXAgPSByZXF1aXJlKCcuL2xpYi91dGlscy9zb3VuZC1ncm91cC5qcycpLFxuICAgIFV0aWxzID0gcmVxdWlyZSgnLi9saWIvdXRpbHMvdXRpbHMuanMnKTtcblxuZnVuY3Rpb24gU29ubygpIHtcbiAgICB0aGlzLlZFUlNJT04gPSAnMC4wLjYnO1xuXG4gICAgd2luZG93LkF1ZGlvQ29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbiAgICB2YXIgY29udGV4dCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgPyBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpIDogbnVsbDtcbiAgICB2YXIgZGVzdGluYXRpb24gPSBjb250ZXh0ID8gY29udGV4dC5kZXN0aW5hdGlvbiA6IG51bGw7XG5cbiAgICB0aGlzLl9ncm91cCA9IG5ldyBHcm91cChjb250ZXh0LCBkZXN0aW5hdGlvbik7XG4gICAgdGhpcy5fZ2FpbiA9IHRoaXMuX2dyb3VwLmdhaW47XG4gICAgdGhpcy5fc291bmRzID0gdGhpcy5fZ3JvdXAuc291bmRzO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuXG4gICAgVXRpbHMuc2V0Q29udGV4dChjb250ZXh0KTtcbiAgICB0aGlzLl9oYW5kbGVUb3VjaGxvY2soKTtcbiAgICB0aGlzLl9oYW5kbGVQYWdlVmlzaWJpbGl0eSgpO1xufVxuXG4vKlxuICogQ3JlYXRlXG4gKlxuICogQWNjZXB0ZWQgdmFsdWVzIGZvciBwYXJhbSBjb25maWc6XG4gKiBPYmplY3QgY29uZmlnIGUuZy4geyBpZDonZm9vJywgdXJsOlsnZm9vLm9nZycsICdmb28ubXAzJ10gfVxuICogQXJyYXkgKG9mIGZpbGVzIGUuZy4gWydmb28ub2dnJywgJ2Zvby5tcDMnXSlcbiAqIEFycmF5QnVmZmVyXG4gKiBIVE1MTWVkaWFFbGVtZW50XG4gKiBGaWxlbmFtZSBzdHJpbmcgKGUuZy4gJ2Zvby5vZ2cnKVxuICogT3NjaWxsYXRvciB0eXBlIHN0cmluZyAoaS5lLiAnc2luZScsICdzcXVhcmUnLCAnc2F3dG9vdGgnLCAndHJpYW5nbGUnKVxuICogU2NyaXB0UHJvY2Vzc29yIGNvbmZpZyBvYmplY3QgKGUuZy4geyBidWZmZXJTaXplOiAxMDI0LCBjaGFubmVsczogMSwgY2FsbGJhY2s6IGZuLCB0aGlzQXJnOiBzZWxmIH0pXG4gKi9cblxuU29uby5wcm90b3R5cGUuY3JlYXRlU291bmQgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICAvLyB0cnkgdG8gbG9hZCBpZiBjb25maWcgY29udGFpbnMgVVJMc1xuICAgIGlmKEZpbGUuY29udGFpbnNVUkwoY29uZmlnKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2FkKGNvbmZpZyk7XG4gICAgfVxuICAgIC8vIG9wdGlvbiB0byB1c2Ugc2ltcGxlIGF1ZGlvIGVsXG4gICAgdmFyIGNvbnRleHQgPSAoY29uZmlnICYmIGNvbmZpZy5ub1dlYkF1ZGlvKSA/IG51bGwgOiB0aGlzLl9jb250ZXh0O1xuICAgIC8vIG90aGVyd2lzZSBqdXN0IHJldHVybiBhIG5ldyBzb3VuZCBvYmplY3RcbiAgICB2YXIgc291bmQgPSBuZXcgU291bmQoY29udGV4dCwgdGhpcy5fZ2Fpbik7XG4gICAgc291bmQuaXNUb3VjaExvY2tlZCA9IHRoaXMuX2lzVG91Y2hMb2NrZWQ7XG4gICAgaWYoY29uZmlnKSB7XG4gICAgICAgIHNvdW5kLmRhdGEgPSBjb25maWcuZGF0YSB8fCBjb25maWc7XG4gICAgICAgIHNvdW5kLmlkID0gY29uZmlnLmlkICE9PSB1bmRlZmluZWQgPyBjb25maWcuaWQgOiAnJztcbiAgICAgICAgc291bmQubG9vcCA9ICEhY29uZmlnLmxvb3A7XG4gICAgICAgIHNvdW5kLnZvbHVtZSA9IGNvbmZpZy52b2x1bWU7XG4gICAgfVxuICAgIHRoaXMuX2dyb3VwLmFkZChzb3VuZCk7XG5cbiAgICByZXR1cm4gc291bmQ7XG59O1xuXG4vKlxuICogRGVzdHJveVxuICovXG5cblNvbm8ucHJvdG90eXBlLmRlc3Ryb3lTb3VuZCA9IGZ1bmN0aW9uKHNvdW5kT3JJZCkge1xuICAgIGlmKCFzb3VuZE9ySWQpIHsgcmV0dXJuOyB9XG5cbiAgICB0aGlzLl9zb3VuZHMuc29tZShmdW5jdGlvbihzb3VuZCwgaW5kZXgsIHNvdW5kcykge1xuICAgICAgICBpZihzb3VuZCA9PT0gc291bmRPcklkIHx8IHNvdW5kLmlkID09PSBzb3VuZE9ySWQpIHtcbiAgICAgICAgICAgIHNvdW5kcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgc291bmQuZGVzdHJveSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvbm8ucHJvdG90eXBlLmRlc3Ryb3lBbGwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9ncm91cC5kZXN0cm95KCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICogR2V0IFNvdW5kIGJ5IGlkXG4gKi9cblxuU29uby5wcm90b3R5cGUuZ2V0U291bmQgPSBmdW5jdGlvbihpZCkge1xuICAgIHZhciBzb3VuZCA9IG51bGw7XG4gICAgdGhpcy5fc291bmRzLnNvbWUoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBpZihpdGVtLmlkID09PSBpZCkge1xuICAgICAgICAgICAgc291bmQgPSBpdGVtO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc291bmQ7XG59O1xuXG4vKlxuICogQ3JlYXRlIGdyb3VwXG4gKi9cblxuU29uby5wcm90b3R5cGUuY3JlYXRlR3JvdXAgPSBmdW5jdGlvbihzb3VuZHMpIHtcbiAgICB2YXIgZ3JvdXAgPSBuZXcgU291bmRHcm91cCh0aGlzLl9jb250ZXh0LCB0aGlzLl9nYWluKTtcbiAgICBpZihzb3VuZHMpIHtcbiAgICAgICAgc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgICAgIGdyb3VwLmFkZChzb3VuZCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZ3JvdXA7XG59O1xuXG4vKlxuICogTG9hZGluZ1xuICovXG5cblNvbm8ucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICBpZighY29uZmlnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQXJndW1lbnRFeGNlcHRpb246IFNvbm8ubG9hZDogcGFyYW0gY29uZmlnIGlzIHVuZGVmaW5lZCcpO1xuICAgIH1cblxuICAgIHZhciBvblByb2dyZXNzID0gY29uZmlnLm9uUHJvZ3Jlc3MsXG4gICAgICAgIG9uQ29tcGxldGUgPSBjb25maWcub25Db21wbGV0ZSxcbiAgICAgICAgdGhpc0FyZyA9IGNvbmZpZy50aGlzQXJnIHx8IGNvbmZpZy5jb250ZXh0IHx8IHRoaXMsXG4gICAgICAgIHVybCA9IGNvbmZpZy51cmwgfHwgY29uZmlnLFxuICAgICAgICBzb3VuZCxcbiAgICAgICAgbG9hZGVyO1xuXG4gICAgaWYoRmlsZS5jb250YWluc1VSTCh1cmwpKSB7XG4gICAgICAgIHNvdW5kID0gdGhpcy5fcXVldWUoY29uZmlnKTtcbiAgICAgICAgbG9hZGVyID0gc291bmQubG9hZGVyO1xuICAgIH1cbiAgICBlbHNlIGlmKEFycmF5LmlzQXJyYXkodXJsKSAmJiBGaWxlLmNvbnRhaW5zVVJMKHVybFswXS51cmwpICkge1xuICAgICAgICBzb3VuZCA9IFtdO1xuICAgICAgICBsb2FkZXIgPSBuZXcgTG9hZGVyLkdyb3VwKCk7XG5cbiAgICAgICAgdXJsLmZvckVhY2goZnVuY3Rpb24oZmlsZSkge1xuICAgICAgICAgICAgc291bmQucHVzaCh0aGlzLl9xdWV1ZShmaWxlLCBsb2FkZXIpKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBpZihvblByb2dyZXNzKSB7XG4gICAgICAgIGxvYWRlci5vbigncHJvZ3Jlc3MnLCBmdW5jdGlvbihwcm9ncmVzcykge1xuICAgICAgICAgICAgb25Qcm9ncmVzcy5jYWxsKHRoaXNBcmcsIHByb2dyZXNzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmKG9uQ29tcGxldGUpIHtcbiAgICAgICAgbG9hZGVyLm9uY2UoJ2NvbXBsZXRlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBsb2FkZXIub2ZmKCdwcm9ncmVzcycpO1xuICAgICAgICAgICAgb25Db21wbGV0ZS5jYWxsKHRoaXNBcmcsIHNvdW5kKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGxvYWRlci5zdGFydCgpO1xuXG4gICAgcmV0dXJuIHNvdW5kO1xufTtcblxuU29uby5wcm90b3R5cGUuX3F1ZXVlID0gZnVuY3Rpb24oY29uZmlnLCBncm91cCkge1xuICAgIHZhciBjb250ZXh0ID0gKGNvbmZpZyAmJiBjb25maWcubm9XZWJBdWRpbykgPyBudWxsIDogdGhpcy5fY29udGV4dDtcbiAgICB2YXIgc291bmQgPSBuZXcgU291bmQoY29udGV4dCwgdGhpcy5fZ2Fpbik7XG4gICAgc291bmQuaXNUb3VjaExvY2tlZCA9IHRoaXMuX2lzVG91Y2hMb2NrZWQ7XG4gICAgdGhpcy5fZ3JvdXAuYWRkKHNvdW5kKTtcblxuICAgIHNvdW5kLmlkID0gY29uZmlnLmlkICE9PSB1bmRlZmluZWQgPyBjb25maWcuaWQgOiAnJztcbiAgICBzb3VuZC5sb29wID0gISFjb25maWcubG9vcDtcbiAgICBzb3VuZC52b2x1bWUgPSBjb25maWcudm9sdW1lO1xuICAgIHNvdW5kLmxvYWQoY29uZmlnKTtcblxuICAgIGlmKGdyb3VwKSB7IGdyb3VwLmFkZChzb3VuZC5sb2FkZXIpOyB9XG5cbiAgICByZXR1cm4gc291bmQ7XG59O1xuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5tdXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZ3JvdXAubXV0ZSgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuU29uby5wcm90b3R5cGUudW5NdXRlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZ3JvdXAudW5NdXRlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoU29uby5wcm90b3R5cGUsICd2b2x1bWUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dyb3VwLnZvbHVtZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgdGhpcy5fZ3JvdXAudm9sdW1lID0gdmFsdWU7XG4gICAgfVxufSk7XG5cblNvbm8ucHJvdG90eXBlLmZhZGUgPSBmdW5jdGlvbih2b2x1bWUsIGR1cmF0aW9uKSB7XG4gICAgdGhpcy5fZ3JvdXAuZmFkZSh2b2x1bWUsIGR1cmF0aW9uKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvbm8ucHJvdG90eXBlLnBhdXNlQWxsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZ3JvdXAucGF1c2UoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvbm8ucHJvdG90eXBlLnJlc3VtZUFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2dyb3VwLnJlc3VtZSgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuU29uby5wcm90b3R5cGUuc3RvcEFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2dyb3VwLnN0b3AoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvbm8ucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihpZCwgZGVsYXksIG9mZnNldCkge1xuICAgIHRoaXMuZ2V0U291bmQoaWQpLnBsYXkoZGVsYXksIG9mZnNldCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb25vLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgdGhpcy5nZXRTb3VuZChpZCkucGF1c2UoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvbm8ucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbihpZCkge1xuICAgIHRoaXMuZ2V0U291bmQoaWQpLnN0b3AoKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gKiBNb2JpbGUgdG91Y2ggbG9ja1xuICovXG5cblNvbm8ucHJvdG90eXBlLl9oYW5kbGVUb3VjaGxvY2sgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgb25VbmxvY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5faXNUb3VjaExvY2tlZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9zb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICAgICAgc291bmQuaXNUb3VjaExvY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYoc291bmQubG9hZGVyKSB7XG4gICAgICAgICAgICAgICAgc291bmQubG9hZGVyLmlzVG91Y2hMb2NrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICB0aGlzLl9pc1RvdWNoTG9ja2VkID0gQnJvd3Nlci5oYW5kbGVUb3VjaExvY2sob25VbmxvY2ssIHRoaXMpO1xufTtcblxuLypcbiAqIFBhZ2UgdmlzaWJpbGl0eSBldmVudHNcbiAqL1xuXG5Tb25vLnByb3RvdHlwZS5faGFuZGxlUGFnZVZpc2liaWxpdHkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcGFnZUhpZGRlblBhdXNlZCA9IFtdLFxuICAgICAgICBzb3VuZHMgPSB0aGlzLl9zb3VuZHM7XG5cbiAgICAvLyBwYXVzZSBjdXJyZW50bHkgcGxheWluZyBzb3VuZHMgYW5kIHN0b3JlIHJlZnNcbiAgICBmdW5jdGlvbiBvbkhpZGRlbigpIHtcbiAgICAgICAgc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgICAgIGlmKHNvdW5kLnBsYXlpbmcpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5wYXVzZSgpO1xuICAgICAgICAgICAgICAgIHBhZ2VIaWRkZW5QYXVzZWQucHVzaChzb3VuZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHBsYXkgc291bmRzIHRoYXQgZ290IHBhdXNlZCB3aGVuIHBhZ2Ugd2FzIGhpZGRlblxuICAgIGZ1bmN0aW9uIG9uU2hvd24oKSB7XG4gICAgICAgIHdoaWxlKHBhZ2VIaWRkZW5QYXVzZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYWdlSGlkZGVuUGF1c2VkLnBvcCgpLnBsYXkoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIEJyb3dzZXIuaGFuZGxlUGFnZVZpc2liaWxpdHkob25IaWRkZW4sIG9uU2hvd24sIHRoaXMpO1xufTtcblxuLypcbiAqIExvZyB2ZXJzaW9uICYgZGV2aWNlIHN1cHBvcnQgaW5mb1xuICovXG5cblNvbm8ucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aXRsZSA9ICdTb25vICcgKyB0aGlzLlZFUlNJT04sXG4gICAgICAgIGluZm8gPSAnU3VwcG9ydGVkOicgKyB0aGlzLmlzU3VwcG9ydGVkICtcbiAgICAgICAgICAgICAgICcgV2ViQXVkaW9BUEk6JyArIHRoaXMuaGFzV2ViQXVkaW8gK1xuICAgICAgICAgICAgICAgJyBUb3VjaExvY2tlZDonICsgdGhpcy5faXNUb3VjaExvY2tlZCArXG4gICAgICAgICAgICAgICAnIEV4dGVuc2lvbnM6JyArIEZpbGUuZXh0ZW5zaW9ucztcblxuICAgIGlmKG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignQ2hyb21lJykgPiAtMSkge1xuICAgICAgICB2YXIgYXJncyA9IFtcbiAgICAgICAgICAgICAgICAnJWMg4pmrICcgKyB0aXRsZSArXG4gICAgICAgICAgICAgICAgJyDimasgJWMgJyArIGluZm8gKyAnICcsXG4gICAgICAgICAgICAgICAgJ2NvbG9yOiAjRkZGRkZGOyBiYWNrZ3JvdW5kOiAjMzc5RjdBJyxcbiAgICAgICAgICAgICAgICAnY29sb3I6ICMxRjFDMEQ7IGJhY2tncm91bmQ6ICNFMEZCQUMnXG4gICAgICAgICAgICBdO1xuICAgICAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmdzKTtcbiAgICB9XG4gICAgZWxzZSBpZiAod2luZG93LmNvbnNvbGUgJiYgd2luZG93LmNvbnNvbGUubG9nLmNhbGwpIHtcbiAgICAgICAgY29uc29sZS5sb2cuY2FsbChjb25zb2xlLCB0aXRsZSArICcgJyArIGluZm8pO1xuICAgIH1cbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFNvbm8ucHJvdG90eXBlLCB7XG4gICAgJ2NhblBsYXknOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gRmlsZS5jYW5QbGF5O1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnY29udGV4dCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0O1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZWZmZWN0Jzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dyb3VwLmVmZmVjdDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2V4dGVuc2lvbnMnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gRmlsZS5leHRlbnNpb25zO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnaGFzV2ViQXVkaW8nOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gISF0aGlzLl9jb250ZXh0O1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnaXNTdXBwb3J0ZWQnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gRmlsZS5leHRlbnNpb25zLmxlbmd0aCA+IDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdnYWluJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dhaW47XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdzb3VuZHMnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZ3JvdXAuc291bmRzLnNsaWNlKDApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAndXRpbHMnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gVXRpbHM7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuLypcbiAqIEV4cG9ydHNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTb25vKCk7XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBBbmFseXNlciA9IHJlcXVpcmUoJy4vZWZmZWN0L2FuYWx5c2VyLmpzJyksXG4gICAgRGlzdG9ydGlvbiA9IHJlcXVpcmUoJy4vZWZmZWN0L2Rpc3RvcnRpb24uanMnKSxcbiAgICBFY2hvID0gcmVxdWlyZSgnLi9lZmZlY3QvZWNoby5qcycpLFxuICAgIEZha2VDb250ZXh0ID0gcmVxdWlyZSgnLi9lZmZlY3QvZmFrZS1jb250ZXh0LmpzJyksXG4gICAgRmlsdGVyID0gcmVxdWlyZSgnLi9lZmZlY3QvZmlsdGVyLmpzJyksXG4gICAgRmxhbmdlciA9IHJlcXVpcmUoJy4vZWZmZWN0L2ZsYW5nZXIuanMnKSxcbiAgICBQYW5uZXIgPSByZXF1aXJlKCcuL2VmZmVjdC9wYW5uZXIuanMnKSxcbiAgICBQaGFzZXIgPSByZXF1aXJlKCcuL2VmZmVjdC9waGFzZXIuanMnKSxcbiAgICBSZWNvcmRlciA9IHJlcXVpcmUoJy4vZWZmZWN0L3JlY29yZGVyLmpzJyksXG4gICAgUmV2ZXJiID0gcmVxdWlyZSgnLi9lZmZlY3QvcmV2ZXJiLmpzJyk7XG5cbmZ1bmN0aW9uIEVmZmVjdChjb250ZXh0KSB7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQgfHwgbmV3IEZha2VDb250ZXh0KCk7XG4gICAgdGhpcy5fZGVzdGluYXRpb24gPSBudWxsO1xuICAgIHRoaXMuX25vZGVMaXN0ID0gW107XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG59XG5cbkVmZmVjdC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24obm9kZSkge1xuICAgIGlmKCFub2RlKSB7IHJldHVybjsgfVxuICAgIHRoaXMuX25vZGVMaXN0LnB1c2gobm9kZSk7XG4gICAgdGhpcy5fdXBkYXRlQ29ubmVjdGlvbnMoKTtcbiAgICByZXR1cm4gbm9kZTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHZhciBsID0gdGhpcy5fbm9kZUxpc3QubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGlmKG5vZGUgPT09IHRoaXMuX25vZGVMaXN0W2ldKSB7XG4gICAgICAgICAgICB0aGlzLl9ub2RlTGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgb3V0cHV0ID0gbm9kZS5fb3V0cHV0IHx8IG5vZGU7XG4gICAgb3V0cHV0LmRpc2Nvbm5lY3QoKTtcbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5yZW1vdmVBbGwgPSBmdW5jdGlvbigpIHtcbiAgICB3aGlsZSh0aGlzLl9ub2RlTGlzdC5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fbm9kZUxpc3QucG9wKCkuZGlzY29ubmVjdCgpO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGVDb25uZWN0aW9ucygpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fY29udGV4dCA9IG51bGw7XG4gICAgdGhpcy5fZGVzdGluYXRpb24gPSBudWxsO1xuICAgIHRoaXMuX25vZGVMaXN0ID0gW107XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLl9jb25uZWN0ID0gZnVuY3Rpb24oYSwgYikge1xuICAgIC8vY29uc29sZS5sb2coJz4gY29ubmVjdCcsIChhLm5hbWUgfHwgYS5jb25zdHJ1Y3Rvci5uYW1lKSwgJ3RvJywgKGIubmFtZSB8fCBiLmNvbnN0cnVjdG9yLm5hbWUpKTtcblxuICAgIHZhciBvdXRwdXQgPSBhLl9vdXRwdXQgfHwgYTtcbiAgICAvL2NvbnNvbGUubG9nKCc+IGRpc2Nvbm5lY3Qgb3V0cHV0OiAnLCAoYS5uYW1lIHx8IGEuY29uc3RydWN0b3IubmFtZSkpO1xuICAgIG91dHB1dC5kaXNjb25uZWN0KCk7XG4gICAgLy9jb25zb2xlLmxvZygnPiBjb25uZWN0IG91dHB1dDogJywgKGEubmFtZSB8fCBhLmNvbnN0cnVjdG9yLm5hbWUpLCAndG8gaW5wdXQ6JywgKGIubmFtZSB8fCBiLmNvbnN0cnVjdG9yLm5hbWUpKTtcbiAgICBvdXRwdXQuY29ubmVjdChiKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuX2Nvbm5lY3RUb0Rlc3RpbmF0aW9uID0gZnVuY3Rpb24oZGVzdGluYXRpb24pIHtcbiAgICB2YXIgbCA9IHRoaXMuX25vZGVMaXN0Lmxlbmd0aCxcbiAgICAgICAgbGFzdE5vZGUgPSBsID8gdGhpcy5fbm9kZUxpc3RbbCAtIDFdIDogdGhpcy5fc291cmNlTm9kZTtcblxuICAgIGlmKGxhc3ROb2RlKSB7XG4gICAgICAgIHRoaXMuX2Nvbm5lY3QobGFzdE5vZGUsIGRlc3RpbmF0aW9uKTtcbiAgICB9XG5cbiAgICB0aGlzLl9kZXN0aW5hdGlvbiA9IGRlc3RpbmF0aW9uO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5fdXBkYXRlQ29ubmVjdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5fc291cmNlTm9kZSkgeyByZXR1cm47IH1cblxuICAgIC8vY29uc29sZS5sb2coJ3VwZGF0ZUNvbm5lY3Rpb25zOicsIHRoaXMuX25vZGVMaXN0Lmxlbmd0aCk7XG5cbiAgICB2YXIgbm9kZSxcbiAgICAgICAgcHJldjtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fbm9kZUxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbm9kZSA9IHRoaXMuX25vZGVMaXN0W2ldO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGksIG5vZGUpO1xuICAgICAgICBwcmV2ID0gaSA9PT0gMCA/IHRoaXMuX3NvdXJjZU5vZGUgOiB0aGlzLl9ub2RlTGlzdFtpIC0gMV07XG4gICAgICAgIHRoaXMuX2Nvbm5lY3QocHJldiwgbm9kZSk7XG4gICAgfVxuXG4gICAgaWYodGhpcy5fZGVzdGluYXRpb24pIHtcbiAgICAgICAgdGhpcy5fY29ubmVjdFRvRGVzdGluYXRpb24odGhpcy5fZGVzdGluYXRpb24pO1xuICAgIH1cbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShFZmZlY3QucHJvdG90eXBlLCAncGFubmluZycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZighdGhpcy5fcGFubmluZykge1xuICAgICAgICAgICAgdGhpcy5fcGFubmluZyA9IG5ldyBQYW5uZXIodGhpcy5fY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3Bhbm5pbmc7XG4gICAgfVxufSk7XG5cbi8qXG4gKiBFZmZlY3RzXG4gKi9cblxuRWZmZWN0LnByb3RvdHlwZS5hbmFseXNlciA9IGZ1bmN0aW9uKGZmdFNpemUsIHNtb290aGluZywgbWluRGVjaWJlbHMsIG1heERlY2liZWxzKSB7XG4gICAgdmFyIGFuYWx5c2VyID0gbmV3IEFuYWx5c2VyKHRoaXMuX2NvbnRleHQsIGZmdFNpemUsIHNtb290aGluZywgbWluRGVjaWJlbHMsIG1heERlY2liZWxzKTtcbiAgICByZXR1cm4gdGhpcy5hZGQoYW5hbHlzZXIpO1xufTtcblxuLy8gbG93ZXJzIHRoZSB2b2x1bWUgb2YgdGhlIGxvdWRlc3QgcGFydHMgb2YgdGhlIHNpZ25hbCBhbmQgcmFpc2VzIHRoZSB2b2x1bWUgb2YgdGhlIHNvZnRlc3QgcGFydHNcbkVmZmVjdC5wcm90b3R5cGUuY29tcHJlc3NvciA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcblxuICAgIHZhciBub2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVEeW5hbWljc0NvbXByZXNzb3IoKTtcblxuICAgIG5vZGUudXBkYXRlID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICAgIC8vIG1pbiBkZWNpYmVscyB0byBzdGFydCBjb21wcmVzc2luZyBhdCBmcm9tIC0xMDAgdG8gMFxuICAgICAgICBub2RlLnRocmVzaG9sZC52YWx1ZSA9IGNvbmZpZy50aHJlc2hvbGQgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy50aHJlc2hvbGQgOiAtMjQ7XG4gICAgICAgIC8vIGRlY2liZWwgdmFsdWUgdG8gc3RhcnQgY3VydmUgdG8gY29tcHJlc3NlZCB2YWx1ZSBmcm9tIDAgdG8gNDBcbiAgICAgICAgbm9kZS5rbmVlLnZhbHVlID0gY29uZmlnLmtuZWUgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5rbmVlIDogMzA7XG4gICAgICAgIC8vIGFtb3VudCBvZiBjaGFuZ2UgcGVyIGRlY2liZWwgZnJvbSAxIHRvIDIwXG4gICAgICAgIG5vZGUucmF0aW8udmFsdWUgPSBjb25maWcucmF0aW8gIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5yYXRpbyA6IDEyO1xuICAgICAgICAvLyBnYWluIHJlZHVjdGlvbiBjdXJyZW50bHkgYXBwbGllZCBieSBjb21wcmVzc29yIGZyb20gLTIwIHRvIDBcbiAgICAgICAgbm9kZS5yZWR1Y3Rpb24udmFsdWUgPSBjb25maWcucmVkdWN0aW9uICE9PSB1bmRlZmluZWQgPyBjb25maWcucmVkdWN0aW9uIDogLTEwO1xuICAgICAgICAvLyBzZWNvbmRzIHRvIHJlZHVjZSBnYWluIGJ5IDEwZGIgZnJvbSAwIHRvIDEgLSBob3cgcXVpY2tseSBzaWduYWwgYWRhcHRlZCB3aGVuIHZvbHVtZSBpbmNyZWFzZWRcbiAgICAgICAgbm9kZS5hdHRhY2sudmFsdWUgPSBjb25maWcuYXR0YWNrICE9PSB1bmRlZmluZWQgPyBjb25maWcuYXR0YWNrIDogMC4wMDAzO1xuICAgICAgICAvLyBzZWNvbmRzIHRvIGluY3JlYXNlIGdhaW4gYnkgMTBkYiBmcm9tIDAgdG8gMSAtIGhvdyBxdWlja2x5IHNpZ25hbCBhZGFwdGVkIHdoZW4gdm9sdW1lIHJlZGN1Y2VkXG4gICAgICAgIG5vZGUucmVsZWFzZS52YWx1ZSA9IGNvbmZpZy5yZWxlYXNlICE9PSB1bmRlZmluZWQgPyBjb25maWcucmVsZWFzZSA6IDAuMjU7XG4gICAgfTtcblxuICAgIG5vZGUudXBkYXRlKGNvbmZpZyk7XG5cbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLmNvbnZvbHZlciA9IGZ1bmN0aW9uKGltcHVsc2VSZXNwb25zZSkge1xuICAgIC8vIGltcHVsc2VSZXNwb25zZSBpcyBhbiBhdWRpbyBmaWxlIGJ1ZmZlclxuICAgIHZhciBub2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVDb252b2x2ZXIoKTtcbiAgICBub2RlLmJ1ZmZlciA9IGltcHVsc2VSZXNwb25zZTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLmRlbGF5ID0gZnVuY3Rpb24odGltZSkge1xuICAgIHZhciBub2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIGlmKHRpbWUgIT09IHVuZGVmaW5lZCkgeyBub2RlLmRlbGF5VGltZS52YWx1ZSA9IHRpbWU7IH1cbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLmVjaG8gPSBmdW5jdGlvbih0aW1lLCBnYWluKSB7XG4gICAgdmFyIG5vZGUgPSBuZXcgRWNobyh0aGlzLl9jb250ZXh0LCB0aW1lLCBnYWluKTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLmRpc3RvcnRpb24gPSBmdW5jdGlvbihhbW91bnQpIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBEaXN0b3J0aW9uKHRoaXMuX2NvbnRleHQsIGFtb3VudCk7XG4gICAgLy8gRmxvYXQzMkFycmF5IGRlZmluaW5nIGN1cnZlICh2YWx1ZXMgYXJlIGludGVycG9sYXRlZClcbiAgICAvL25vZGUuY3VydmVcbiAgICAvLyB1cC1zYW1wbGUgYmVmb3JlIGFwcGx5aW5nIGN1cnZlIGZvciBiZXR0ZXIgcmVzb2x1dGlvbiByZXN1bHQgJ25vbmUnLCAnMngnIG9yICc0eCdcbiAgICAvL25vZGUub3ZlcnNhbXBsZSA9ICcyeCc7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5maWx0ZXIgPSBmdW5jdGlvbih0eXBlLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICB2YXIgZmlsdGVyID0gbmV3IEZpbHRlcih0aGlzLl9jb250ZXh0LCB0eXBlLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xuICAgIHJldHVybiB0aGlzLmFkZChmaWx0ZXIpO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5sb3dwYXNzID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdsb3dwYXNzJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuaGlnaHBhc3MgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2hpZ2hwYXNzJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuYmFuZHBhc3MgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2JhbmRwYXNzJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUubG93c2hlbGYgPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ2xvd3NoZWxmJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuaGlnaHNoZWxmID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdoaWdoc2hlbGYnLCBmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5wZWFraW5nID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyKCdwZWFraW5nJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUubm90Y2ggPSBmdW5jdGlvbihmcmVxdWVuY3ksIHF1YWxpdHksIGdhaW4pIHtcbiAgICByZXR1cm4gdGhpcy5maWx0ZXIoJ25vdGNoJywgZnJlcXVlbmN5LCBxdWFsaXR5LCBnYWluKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuYWxscGFzcyA9IGZ1bmN0aW9uKGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIHJldHVybiB0aGlzLmZpbHRlcignYWxscGFzcycsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbik7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLmZsYW5nZXIgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBGbGFuZ2VyKHRoaXMuX2NvbnRleHQsIGNvbmZpZyk7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5nYWluID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIGlmKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbm9kZS5nYWluLnZhbHVlID0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5wYW5uZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBQYW5uZXIodGhpcy5fY29udGV4dCk7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5waGFzZXIgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBQaGFzZXIodGhpcy5fY29udGV4dCwgY29uZmlnKTtcbiAgICByZXR1cm4gdGhpcy5hZGQobm9kZSk7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnJlY29yZGVyID0gZnVuY3Rpb24ocGFzc1Rocm91Z2gpIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBSZWNvcmRlcih0aGlzLl9jb250ZXh0LCBwYXNzVGhyb3VnaCk7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5yZXZlcmIgPSBmdW5jdGlvbihzZWNvbmRzLCBkZWNheSwgcmV2ZXJzZSkge1xuICAgIHZhciBub2RlID0gbmV3IFJldmVyYih0aGlzLl9jb250ZXh0LCBzZWNvbmRzLCBkZWNheSwgcmV2ZXJzZSk7XG4gICAgcmV0dXJuIHRoaXMuYWRkKG5vZGUpO1xufTtcblxuRWZmZWN0LnByb3RvdHlwZS5zY3JpcHQgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICBjb25maWcgPSBjb25maWcgfHwge307XG4gICAgLy8gYnVmZmVyU2l6ZSAyNTYgLSAxNjM4NCAocG93IDIpXG4gICAgdmFyIGJ1ZmZlclNpemUgPSBjb25maWcuYnVmZmVyU2l6ZSB8fCAxMDI0O1xuICAgIHZhciBpbnB1dENoYW5uZWxzID0gY29uZmlnLmlucHV0Q2hhbm5lbHMgPT09IHVuZGVmaW5lZCA/IDAgOiBpbnB1dENoYW5uZWxzO1xuICAgIHZhciBvdXRwdXRDaGFubmVscyA9IGNvbmZpZy5vdXRwdXRDaGFubmVscyA9PT0gdW5kZWZpbmVkID8gMSA6IG91dHB1dENoYW5uZWxzO1xuICAgIFxuICAgIHZhciBub2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoYnVmZmVyU2l6ZSwgaW5wdXRDaGFubmVscywgb3V0cHV0Q2hhbm5lbHMpO1xuICAgIFxuICAgIHZhciB0aGlzQXJnID0gY29uZmlnLnRoaXNBcmcgfHwgY29uZmlnLmNvbnRleHQgfHwgbm9kZTtcbiAgICB2YXIgY2FsbGJhY2sgPSBjb25maWcuY2FsbGJhY2sgfHwgZnVuY3Rpb24oKSB7fTtcblxuICAgIC8vIGF2YWlsYWJsZSBwcm9wczpcbiAgICAvKlxuICAgIGV2ZW50LmlucHV0QnVmZmVyXG4gICAgZXZlbnQub3V0cHV0QnVmZmVyXG4gICAgZXZlbnQucGxheWJhY2tUaW1lXG4gICAgKi9cbiAgICAvLyBFeGFtcGxlOiBnZW5lcmF0ZSBub2lzZVxuICAgIC8qXG4gICAgdmFyIG91dHB1dCA9IGV2ZW50Lm91dHB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKTtcbiAgICB2YXIgbCA9IG91dHB1dC5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgb3V0cHV0W2ldID0gTWF0aC5yYW5kb20oKTtcbiAgICB9XG4gICAgKi9cbiAgICBub2RlLm9uYXVkaW9wcm9jZXNzID0gY2FsbGJhY2suYmluZCh0aGlzQXJnKTtcblxuICAgIHJldHVybiB0aGlzLmFkZChub2RlKTtcbn07XG5cbkVmZmVjdC5wcm90b3R5cGUuc2V0U291cmNlID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBub2RlO1xuICAgIHRoaXMuX3VwZGF0ZUNvbm5lY3Rpb25zKCk7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5FZmZlY3QucHJvdG90eXBlLnNldERlc3RpbmF0aW9uID0gZnVuY3Rpb24obm9kZSkge1xuICAgIHRoaXMuX2Nvbm5lY3RUb0Rlc3RpbmF0aW9uKG5vZGUpO1xuICAgIHJldHVybiBub2RlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZmZlY3Q7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEFuYWx5c2VyKGNvbnRleHQsIGZmdFNpemUsIHNtb290aGluZywgbWluRGVjaWJlbHMsIG1heERlY2liZWxzKSB7XG4gICAgZmZ0U2l6ZSA9IGZmdFNpemUgfHwgMzI7XG4gICAgdmFyIHdhdmVmb3JtRGF0YSwgZnJlcXVlbmN5RGF0YTtcblxuICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVBbmFseXNlcigpO1xuICAgIG5vZGUuZmZ0U2l6ZSA9IGZmdFNpemU7IC8vIGZyZXF1ZW5jeUJpbkNvdW50IHdpbGwgYmUgaGFsZiB0aGlzIHZhbHVlXG5cbiAgICBpZihzbW9vdGhpbmcgIT09IHVuZGVmaW5lZCkgeyBub2RlLnNtb290aGluZ1RpbWVDb25zdGFudCA9IHNtb290aGluZzsgfVxuICAgIGlmKG1pbkRlY2liZWxzICE9PSB1bmRlZmluZWQpIHsgbm9kZS5taW5EZWNpYmVscyA9IG1pbkRlY2liZWxzOyB9XG4gICAgaWYobWF4RGVjaWJlbHMgIT09IHVuZGVmaW5lZCkgeyBub2RlLm1heERlY2liZWxzID0gbWF4RGVjaWJlbHM7IH1cblxuICAgIHZhciB1cGRhdGVGRlRTaXplID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKGZmdFNpemUgIT09IG5vZGUuZmZ0U2l6ZSB8fCB3YXZlZm9ybURhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgd2F2ZWZvcm1EYXRhID0gbmV3IFVpbnQ4QXJyYXkobm9kZS5mZnRTaXplKTtcbiAgICAgICAgICAgIGZyZXF1ZW5jeURhdGEgPSBuZXcgVWludDhBcnJheShub2RlLmZyZXF1ZW5jeUJpbkNvdW50KTtcbiAgICAgICAgICAgIGZmdFNpemUgPSBub2RlLmZmdFNpemU7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHVwZGF0ZUZGVFNpemUoKTtcblxuICAgIG5vZGUuZ2V0V2F2ZWZvcm0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdXBkYXRlRkZUU2l6ZSgpO1xuICAgICAgICB0aGlzLmdldEJ5dGVUaW1lRG9tYWluRGF0YSh3YXZlZm9ybURhdGEpO1xuICAgICAgICByZXR1cm4gd2F2ZWZvcm1EYXRhO1xuICAgIH07XG5cbiAgICBub2RlLmdldEZyZXF1ZW5jaWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHVwZGF0ZUZGVFNpemUoKTtcbiAgICAgICAgdGhpcy5nZXRCeXRlRnJlcXVlbmN5RGF0YShmcmVxdWVuY3lEYXRhKTtcbiAgICAgICAgcmV0dXJuIGZyZXF1ZW5jeURhdGE7XG4gICAgfTtcblxuICAgIC8vIG1hcCBuYXRpdmUgcHJvcGVydGllcyBvZiBBbmFseXNlck5vZGVcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgICdzbW9vdGhpbmcnOiB7XG4gICAgICAgICAgICAvLyAwIHRvIDFcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBub2RlLnNtb290aGluZ1RpbWVDb25zdGFudDsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbm9kZS5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBbmFseXNlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRGlzdG9ydGlvbihjb250ZXh0LCBhbW91bnQpIHtcblxuICAgIGFtb3VudCA9IGFtb3VudCB8fCAxO1xuICAgIFxuICAgIHZhciBub2RlID0gY29udGV4dC5jcmVhdGVXYXZlU2hhcGVyKCk7XG5cbiAgICAvLyBjcmVhdGUgd2F2ZVNoYXBlciBkaXN0b3J0aW9uIGN1cnZlIGZyb20gMCB0byAxXG4gICAgbm9kZS51cGRhdGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBhbW91bnQgPSB2YWx1ZTtcbiAgICAgICAgdmFyIGsgPSB2YWx1ZSAqIDEwMCxcbiAgICAgICAgICAgIG4gPSAyMjA1MCxcbiAgICAgICAgICAgIGN1cnZlID0gbmV3IEZsb2F0MzJBcnJheShuKSxcbiAgICAgICAgICAgIGRlZyA9IE1hdGguUEkgLyAxODAsXG4gICAgICAgICAgICB4O1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICB4ID0gaSAqIDIgLyBuIC0gMTtcbiAgICAgICAgICAgIGN1cnZlW2ldID0gKDMgKyBrKSAqIHggKiAyMCAqIGRlZyAvIChNYXRoLlBJICsgayAqIE1hdGguYWJzKHgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY3VydmUgPSBjdXJ2ZTtcbiAgICB9O1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICAnYW1vdW50Jzoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGFtb3VudDsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgdGhpcy51cGRhdGUodmFsdWUpOyB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmKGFtb3VudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG5vZGUudXBkYXRlKGFtb3VudCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGlzdG9ydGlvbjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRWNobyhjb250ZXh0LCBkZWxheVRpbWUsIGdhaW5WYWx1ZSkge1xuICAgIHZhciBpbnB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBkZWxheSA9IGNvbnRleHQuY3JlYXRlRGVsYXkoKTtcbiAgICB2YXIgZ2FpbiA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBvdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgIGdhaW4uZ2Fpbi52YWx1ZSA9IGdhaW5WYWx1ZSB8fCAwLjU7XG4gICAgZGVsYXkuZGVsYXlUaW1lLnZhbHVlID0gZGVsYXlUaW1lIHx8IDAuNTtcblxuICAgIGlucHV0LmNvbm5lY3QoZGVsYXkpO1xuICAgIGlucHV0LmNvbm5lY3Qob3V0cHV0KTtcbiAgICBkZWxheS5jb25uZWN0KGdhaW4pO1xuICAgIGdhaW4uY29ubmVjdChkZWxheSk7XG4gICAgZ2Fpbi5jb25uZWN0KG91dHB1dCk7XG5cbiAgICB2YXIgbm9kZSA9IGlucHV0O1xuICAgIG5vZGUubmFtZSA9ICdFY2hvJztcbiAgICBub2RlLl9vdXRwdXQgPSBvdXRwdXQ7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZGVsYXkuZGVsYXlUaW1lLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBkZWxheS5kZWxheVRpbWUudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBmZWVkYmFjazoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGdhaW4uZ2Fpbi52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgZ2Fpbi5nYWluLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5vZGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWNobztcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRmFrZUNvbnRleHQoKSB7XG5cbiAgICB2YXIgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcblxuICAgIHZhciBmbiA9IGZ1bmN0aW9uKCl7fTtcblxuICAgIHZhciBwYXJhbSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IDEsXG4gICAgICAgICAgICBkZWZhdWx0VmFsdWU6IDEsXG4gICAgICAgICAgICBsaW5lYXJSYW1wVG9WYWx1ZUF0VGltZTogZm4sXG4gICAgICAgICAgICBzZXRWYWx1ZUF0VGltZTogZm4sXG4gICAgICAgICAgICBleHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lOiBmbixcbiAgICAgICAgICAgIHNldFRhcmdldEF0VGltZTogZm4sXG4gICAgICAgICAgICBzZXRWYWx1ZUN1cnZlQXRUaW1lOiBmbixcbiAgICAgICAgICAgIGNhbmNlbFNjaGVkdWxlZFZhbHVlczogZm5cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgdmFyIGZha2VOb2RlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjb25uZWN0OmZuLFxuICAgICAgICAgICAgZGlzY29ubmVjdDpmbixcbiAgICAgICAgICAgIC8vIGFuYWx5c2VyXG4gICAgICAgICAgICBmcmVxdWVuY3lCaW5Db3VudDogMCxcbiAgICAgICAgICAgIHNtb290aGluZ1RpbWVDb25zdGFudDogMCxcbiAgICAgICAgICAgIGZmdFNpemU6IDAsXG4gICAgICAgICAgICBtaW5EZWNpYmVsczogMCxcbiAgICAgICAgICAgIG1heERlY2liZWxzOiAwLFxuICAgICAgICAgICAgZ2V0Qnl0ZVRpbWVEb21haW5EYXRhOiBmbixcbiAgICAgICAgICAgIGdldEJ5dGVGcmVxdWVuY3lEYXRhOiBmbixcbiAgICAgICAgICAgIGdldEZsb2F0VGltZURvbWFpbkRhdGE6IGZuLFxuICAgICAgICAgICAgZ2V0RmxvYXRGcmVxdWVuY3lEYXRhOiBmbixcbiAgICAgICAgICAgIC8vIGdhaW5cbiAgICAgICAgICAgIGdhaW46IHBhcmFtKCksXG4gICAgICAgICAgICAvLyBwYW5uZXJcbiAgICAgICAgICAgIHBhbm5pbmdNb2RlbDogMCxcbiAgICAgICAgICAgIHNldFBvc2l0aW9uOiBmbixcbiAgICAgICAgICAgIHNldE9yaWVudGF0aW9uOiBmbixcbiAgICAgICAgICAgIHNldFZlbG9jaXR5OiBmbixcbiAgICAgICAgICAgIGRpc3RhbmNlTW9kZWw6IDAsXG4gICAgICAgICAgICByZWZEaXN0YW5jZTogMCxcbiAgICAgICAgICAgIG1heERpc3RhbmNlOiAwLFxuICAgICAgICAgICAgcm9sbG9mZkZhY3RvcjogMCxcbiAgICAgICAgICAgIGNvbmVJbm5lckFuZ2xlOiAzNjAsXG4gICAgICAgICAgICBjb25lT3V0ZXJBbmdsZTogMzYwLFxuICAgICAgICAgICAgY29uZU91dGVyR2FpbjogMCxcbiAgICAgICAgICAgIC8vIGZpbHRlcjpcbiAgICAgICAgICAgIHR5cGU6MCxcbiAgICAgICAgICAgIGZyZXF1ZW5jeTogcGFyYW0oKSxcbiAgICAgICAgICAgIC8vIGRlbGF5XG4gICAgICAgICAgICBkZWxheVRpbWU6IHBhcmFtKCksXG4gICAgICAgICAgICAvLyBjb252b2x2ZXJcbiAgICAgICAgICAgIGJ1ZmZlcjogMCxcbiAgICAgICAgICAgIC8vIGNvbXByZXNzb3JcbiAgICAgICAgICAgIHRocmVzaG9sZDogcGFyYW0oKSxcbiAgICAgICAgICAgIGtuZWU6IHBhcmFtKCksXG4gICAgICAgICAgICByYXRpbzogcGFyYW0oKSxcbiAgICAgICAgICAgIGF0dGFjazogcGFyYW0oKSxcbiAgICAgICAgICAgIHJlbGVhc2U6IHBhcmFtKCksXG4gICAgICAgICAgICByZWR1Y3Rpb246IHBhcmFtKCksXG4gICAgICAgICAgICAvLyBkaXN0b3J0aW9uXG4gICAgICAgICAgICBvdmVyc2FtcGxlOiAwLFxuICAgICAgICAgICAgY3VydmU6IDAsXG4gICAgICAgICAgICAvLyBidWZmZXJcbiAgICAgICAgICAgIHNhbXBsZVJhdGU6IDEsXG4gICAgICAgICAgICBsZW5ndGg6IDAsXG4gICAgICAgICAgICBkdXJhdGlvbjogMCxcbiAgICAgICAgICAgIG51bWJlck9mQ2hhbm5lbHM6IDAsXG4gICAgICAgICAgICBnZXRDaGFubmVsRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvcHlGcm9tQ2hhbm5lbDogZm4sXG4gICAgICAgICAgICBjb3B5VG9DaGFubmVsOiBmbixcbiAgICAgICAgICAgIC8vIGxpc3RlbmVyXG4gICAgICAgICAgICBkb3BwbGVyRmFjdG9yOiAwLFxuICAgICAgICAgICAgc3BlZWRPZlNvdW5kOiAwLFxuICAgICAgICAgICAgLy8gb3NjXG4gICAgICAgICAgICBzdGFydDogZm5cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgLy8gaWU5XG4gICAgaWYoIXdpbmRvdy5VaW50OEFycmF5KSB7XG4gICAgICAgIHdpbmRvdy5JbnQ4QXJyYXkgPVxuICAgICAgICB3aW5kb3cuVWludDhBcnJheSA9XG4gICAgICAgIHdpbmRvdy5VaW50OENsYW1wZWRBcnJheSA9XG4gICAgICAgIHdpbmRvdy5JbnQxNkFycmF5ID1cbiAgICAgICAgd2luZG93LlVpbnQxNkFycmF5ID1cbiAgICAgICAgd2luZG93LkludDMyQXJyYXkgPVxuICAgICAgICB3aW5kb3cuVWludDMyQXJyYXkgPVxuICAgICAgICB3aW5kb3cuRmxvYXQzMkFycmF5ID1cbiAgICAgICAgd2luZG93LkZsb2F0NjRBcnJheSA9IEFycmF5O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGNyZWF0ZUFuYWx5c2VyOiBmYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlQnVmZmVyOiBmYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlQmlxdWFkRmlsdGVyOiBmYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlQ2hhbm5lbE1lcmdlcjogZmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUNoYW5uZWxTcGxpdHRlcjogZmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcjogZmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZUNvbnZvbHZlcjogZmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZURlbGF5OiBmYWtlTm9kZSxcbiAgICAgICAgY3JlYXRlR2FpbjogZmFrZU5vZGUsXG4gICAgICAgIGNyZWF0ZU9zY2lsbGF0b3I6IGZha2VOb2RlLFxuICAgICAgICBjcmVhdGVQYW5uZXI6IGZha2VOb2RlLFxuICAgICAgICBjcmVhdGVTY3JpcHRQcm9jZXNzb3I6IGZha2VOb2RlLFxuICAgICAgICBjcmVhdGVXYXZlU2hhcGVyOiBmYWtlTm9kZSxcbiAgICAgICAgbGlzdGVuZXI6IGZha2VOb2RlKCksXG4gICAgICAgIGdldCBjdXJyZW50VGltZSgpIHtcbiAgICAgICAgICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSkgLyAxMDAwO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGYWtlQ29udGV4dDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gRmlsdGVyKGNvbnRleHQsIHR5cGUsIGZyZXF1ZW5jeSwgcXVhbGl0eSwgZ2Fpbikge1xuICAgIC8vIEZyZXF1ZW5jeSBiZXR3ZWVuIDQwSHogYW5kIGhhbGYgb2YgdGhlIHNhbXBsaW5nIHJhdGVcbiAgICB2YXIgbWluRnJlcXVlbmN5ID0gNDA7XG4gICAgdmFyIG1heEZyZXF1ZW5jeSA9IGNvbnRleHQuc2FtcGxlUmF0ZSAvIDI7XG5cbiAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gICAgbm9kZS50eXBlID0gdHlwZTtcblxuICAgIGlmKGZyZXF1ZW5jeSAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuZnJlcXVlbmN5LnZhbHVlID0gZnJlcXVlbmN5OyB9XG4gICAgaWYocXVhbGl0eSAhPT0gdW5kZWZpbmVkKSB7IG5vZGUuUS52YWx1ZSA9IHF1YWxpdHk7IH1cbiAgICBpZihnYWluICE9PSB1bmRlZmluZWQpIHsgbm9kZS5nYWluLnZhbHVlID0gZ2FpbjsgfVxuXG5cbiAgICB2YXIgZ2V0RnJlcXVlbmN5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gTG9nYXJpdGhtIChiYXNlIDIpIHRvIGNvbXB1dGUgaG93IG1hbnkgb2N0YXZlcyBmYWxsIGluIHRoZSByYW5nZS5cbiAgICAgICAgdmFyIG51bWJlck9mT2N0YXZlcyA9IE1hdGgubG9nKG1heEZyZXF1ZW5jeSAvIG1pbkZyZXF1ZW5jeSkgLyBNYXRoLkxOMjtcbiAgICAgICAgLy8gQ29tcHV0ZSBhIG11bHRpcGxpZXIgZnJvbSAwIHRvIDEgYmFzZWQgb24gYW4gZXhwb25lbnRpYWwgc2NhbGUuXG4gICAgICAgIHZhciBtdWx0aXBsaWVyID0gTWF0aC5wb3coMiwgbnVtYmVyT2ZPY3RhdmVzICogKHZhbHVlIC0gMS4wKSk7XG4gICAgICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICAgICAgcmV0dXJuIG1heEZyZXF1ZW5jeSAqIG11bHRpcGxpZXI7XG4gICAgfTtcblxuICAgIG5vZGUudXBkYXRlID0gZnVuY3Rpb24oZnJlcXVlbmN5LCBnYWluKSB7XG4gICAgICAgIGlmKGZyZXF1ZW5jeSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLmZyZXF1ZW5jeS52YWx1ZSA9IGZyZXF1ZW5jeTtcbiAgICAgICAgfVxuICAgICAgICBpZihnYWluICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuZ2Fpbi52YWx1ZSA9IGdhaW47XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgbm9kZS5zZXRCeVBlcmNlbnQgPSBmdW5jdGlvbihwZXJjZW50LCBxdWFsaXR5LCBnYWluKSB7XG4gICAgICAgIC8vIHNldCBmaWx0ZXIgZnJlcXVlbmN5IGJhc2VkIG9uIHZhbHVlIGZyb20gMCB0byAxXG4gICAgICAgIG5vZGUuZnJlcXVlbmN5LnZhbHVlID0gZ2V0RnJlcXVlbmN5KHBlcmNlbnQpO1xuICAgICAgICBpZihxdWFsaXR5ICE9PSB1bmRlZmluZWQpIHsgbm9kZS5RLnZhbHVlID0gcXVhbGl0eTsgfVxuICAgICAgICBpZihnYWluICE9PSB1bmRlZmluZWQpIHsgbm9kZS5nYWluLnZhbHVlID0gZ2FpbjsgfVxuICAgIH07XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBGaWx0ZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1vbm9GbGFuZ2VyKGNvbnRleHQsIGNvbmZpZykge1xuICAgIHZhciBmZWVkYmFja0dhaW4gPSBjb25maWcuZmVlZGJhY2sgfHwgMC41LFxuICAgICAgICBkZWxheVRpbWUgPSBjb25maWcuZGVsYXkgfHwgMC4wMDUsXG4gICAgICAgIGxmb0dhaW4gPSBjb25maWcuZ2FpbiB8fCAwLjAwMixcbiAgICAgICAgbGZvRnJlcSA9IGNvbmZpZy5mcmVxdWVuY3kgfHwgMC4yNTtcblxuICAgIHZhciBpbnB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBkZWxheSA9IGNvbnRleHQuY3JlYXRlRGVsYXkoKTtcbiAgICB2YXIgZmVlZGJhY2sgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgbGZvID0gY29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgdmFyIGdhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgb3V0cHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG5cbiAgICBkZWxheS5kZWxheVRpbWUudmFsdWUgPSBkZWxheVRpbWU7IC8vIDUtMjVtcyBkZWxheSAoMC4wMDUgPiAwLjAyNSlcbiAgICBmZWVkYmFjay5nYWluLnZhbHVlID0gZmVlZGJhY2tHYWluOyAvLyAwID4gMVxuXG4gICAgbGZvLnR5cGUgPSAnc2luZSc7XG4gICAgbGZvLmZyZXF1ZW5jeS52YWx1ZSA9IGxmb0ZyZXE7IC8vIDAuMDUgPiA1XG4gICAgZ2Fpbi5nYWluLnZhbHVlID0gbGZvR2FpbjsgLy8gMC4wMDA1ID4gMC4wMDVcblxuICAgIGlucHV0LmNvbm5lY3Qob3V0cHV0KTtcbiAgICBpbnB1dC5jb25uZWN0KGRlbGF5KTtcbiAgICBkZWxheS5jb25uZWN0KG91dHB1dCk7XG4gICAgZGVsYXkuY29ubmVjdChmZWVkYmFjayk7XG4gICAgZmVlZGJhY2suY29ubmVjdChpbnB1dCk7XG5cbiAgICBsZm8uY29ubmVjdChnYWluKTtcbiAgICBnYWluLmNvbm5lY3QoZGVsYXkuZGVsYXlUaW1lKTtcbiAgICBsZm8uc3RhcnQoMCk7XG4gICAgXG4gICAgdmFyIG5vZGUgPSBpbnB1dDtcbiAgICBub2RlLm5hbWUgPSAnRmxhbmdlcic7XG4gICAgbm9kZS5fb3V0cHV0ID0gb3V0cHV0O1xuICAgIFxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG5vZGUsIHtcbiAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBkZWxheS5kZWxheVRpbWUudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGRlbGF5LmRlbGF5VGltZS52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGxmb0ZyZXF1ZW5jeToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGxmby5mcmVxdWVuY3kudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGxmby5mcmVxdWVuY3kudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBsZm9HYWluOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZ2Fpbi5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBnYWluLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBmZWVkYmFjazoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGZlZWRiYWNrLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGZlZWRiYWNrLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gU3RlcmVvRmxhbmdlcihjb250ZXh0LCBjb25maWcpIHtcbiAgICB2YXIgZmVlZGJhY2tHYWluID0gY29uZmlnLmZlZWRiYWNrIHx8IDAuNSxcbiAgICAgICAgZGVsYXlUaW1lID0gY29uZmlnLmRlbGF5IHx8IDAuMDAzLFxuICAgICAgICBsZm9HYWluID0gY29uZmlnLmdhaW4gfHwgMC4wMDUsXG4gICAgICAgIGxmb0ZyZXEgPSBjb25maWcuZnJlcXVlbmN5IHx8IDAuNTtcblxuICAgIHZhciBpbnB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBzcGxpdHRlciA9IGNvbnRleHQuY3JlYXRlQ2hhbm5lbFNwbGl0dGVyKDIpO1xuICAgIHZhciBtZXJnZXIgPSBjb250ZXh0LmNyZWF0ZUNoYW5uZWxNZXJnZXIoMik7XG4gICAgdmFyIGZlZWRiYWNrTCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHZhciBmZWVkYmFja1IgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgbGZvID0gY29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCk7XG4gICAgdmFyIGxmb0dhaW5MID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGxmb0dhaW5SID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGRlbGF5TCA9IGNvbnRleHQuY3JlYXRlRGVsYXkoKTtcbiAgICB2YXIgZGVsYXlSID0gY29udGV4dC5jcmVhdGVEZWxheSgpO1xuICAgIHZhciBvdXRwdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcblxuICAgIGZlZWRiYWNrTC5nYWluLnZhbHVlID0gZmVlZGJhY2tSLmdhaW4udmFsdWUgPSBmZWVkYmFja0dhaW47XG4gICAgZGVsYXlMLmRlbGF5VGltZS52YWx1ZSA9IGRlbGF5Ui5kZWxheVRpbWUudmFsdWUgPSBkZWxheVRpbWU7XG5cbiAgICBsZm8udHlwZSA9ICdzaW5lJztcbiAgICBsZm8uZnJlcXVlbmN5LnZhbHVlID0gbGZvRnJlcTtcbiAgICBsZm9HYWluTC5nYWluLnZhbHVlID0gbGZvR2FpbjtcbiAgICBsZm9HYWluUi5nYWluLnZhbHVlID0gMCAtIGxmb0dhaW47XG5cbiAgICBpbnB1dC5jb25uZWN0KHNwbGl0dGVyKTtcbiAgICBcbiAgICBzcGxpdHRlci5jb25uZWN0KGRlbGF5TCwgMCk7XG4gICAgc3BsaXR0ZXIuY29ubmVjdChkZWxheVIsIDEpO1xuICAgIFxuICAgIGRlbGF5TC5jb25uZWN0KGZlZWRiYWNrTCk7XG4gICAgZGVsYXlSLmNvbm5lY3QoZmVlZGJhY2tSKTtcblxuICAgIGZlZWRiYWNrTC5jb25uZWN0KGRlbGF5Uik7XG4gICAgZmVlZGJhY2tSLmNvbm5lY3QoZGVsYXlMKTtcblxuICAgIGRlbGF5TC5jb25uZWN0KG1lcmdlciwgMCwgMCk7XG4gICAgZGVsYXlSLmNvbm5lY3QobWVyZ2VyLCAwLCAxKTtcblxuICAgIG1lcmdlci5jb25uZWN0KG91dHB1dCk7XG4gICAgaW5wdXQuY29ubmVjdChvdXRwdXQpO1xuXG4gICAgbGZvLmNvbm5lY3QobGZvR2FpbkwpO1xuICAgIGxmby5jb25uZWN0KGxmb0dhaW5SKTtcbiAgICBsZm9HYWluTC5jb25uZWN0KGRlbGF5TC5kZWxheVRpbWUpO1xuICAgIGxmb0dhaW5SLmNvbm5lY3QoZGVsYXlSLmRlbGF5VGltZSk7XG4gICAgbGZvLnN0YXJ0KDApO1xuXG4gICAgdmFyIG5vZGUgPSBpbnB1dDtcbiAgICBub2RlLm5hbWUgPSAnU3RlcmVvRmxhbmdlcic7XG4gICAgbm9kZS5fb3V0cHV0ID0gb3V0cHV0O1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobm9kZSwge1xuICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGRlbGF5TC5kZWxheVRpbWUudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGRlbGF5TC5kZWxheVRpbWUudmFsdWUgPSBkZWxheVIuZGVsYXlUaW1lLnZhbHVlID0gdmFsdWU7IH1cbiAgICAgICAgfSxcbiAgICAgICAgbGZvRnJlcXVlbmN5OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbGZvLmZyZXF1ZW5jeS52YWx1ZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbGZvLmZyZXF1ZW5jeS52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGxmb0dhaW46IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBsZm9HYWluTC5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBsZm9HYWluTC5nYWluLnZhbHVlID0gbGZvR2FpblIuZ2Fpbi52YWx1ZSA9IHZhbHVlOyB9XG4gICAgICAgIH0sXG4gICAgICAgIGZlZWRiYWNrOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmVlZGJhY2tMLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGZlZWRiYWNrTC5nYWluLnZhbHVlID0gZmVlZGJhY2tSLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxuZnVuY3Rpb24gRmxhbmdlcihjb250ZXh0LCBjb25maWcpIHtcbiAgICBjb25maWcgPSBjb25maWcgfHwge307XG4gICAgcmV0dXJuIGNvbmZpZy5zdGVyZW8gPyBuZXcgU3RlcmVvRmxhbmdlcihjb250ZXh0LCBjb25maWcpIDogbmV3IE1vbm9GbGFuZ2VyKGNvbnRleHQsIGNvbmZpZyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRmxhbmdlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUGFubmVyKGNvbnRleHQpIHtcbiAgICB2YXIgbm9kZSA9IGNvbnRleHQuY3JlYXRlUGFubmVyKCk7XG4gICAgLy8gRGVmYXVsdCBmb3Igc3RlcmVvIGlzICdIUlRGJyBjYW4gYWxzbyBiZSAnZXF1YWxwb3dlcidcbiAgICBub2RlLnBhbm5pbmdNb2RlbCA9IFBhbm5lci5kZWZhdWx0cy5wYW5uaW5nTW9kZWw7XG5cbiAgICAvLyBEaXN0YW5jZSBtb2RlbCBhbmQgYXR0cmlidXRlc1xuICAgIC8vIENhbiBiZSAnbGluZWFyJyAnaW52ZXJzZScgJ2V4cG9uZW50aWFsJ1xuICAgIG5vZGUuZGlzdGFuY2VNb2RlbCA9IFBhbm5lci5kZWZhdWx0cy5kaXN0YW5jZU1vZGVsO1xuICAgIG5vZGUucmVmRGlzdGFuY2UgPSBQYW5uZXIuZGVmYXVsdHMucmVmRGlzdGFuY2U7XG4gICAgbm9kZS5tYXhEaXN0YW5jZSA9IFBhbm5lci5kZWZhdWx0cy5tYXhEaXN0YW5jZTtcbiAgICBub2RlLnJvbGxvZmZGYWN0b3IgPSBQYW5uZXIuZGVmYXVsdHMucm9sbG9mZkZhY3RvcjtcbiAgICBub2RlLmNvbmVJbm5lckFuZ2xlID0gUGFubmVyLmRlZmF1bHRzLmNvbmVJbm5lckFuZ2xlO1xuICAgIG5vZGUuY29uZU91dGVyQW5nbGUgPSBQYW5uZXIuZGVmYXVsdHMuY29uZU91dGVyQW5nbGU7XG4gICAgbm9kZS5jb25lT3V0ZXJHYWluID0gUGFubmVyLmRlZmF1bHRzLmNvbmVPdXRlckdhaW47XG4gICAgLy8gc2V0IHRvIGRlZmF1bHRzIChuZWVkZWQgaW4gRmlyZWZveClcbiAgICBub2RlLnNldFBvc2l0aW9uKDAsIDAsIDApO1xuICAgIG5vZGUuc2V0T3JpZW50YXRpb24oMCwgMCwgMCk7XG5cbiAgICAvLyBzaW1wbGUgdmVjMyBvYmplY3QgcG9vbFxuICAgIHZhciBWZWNQb29sID0ge1xuICAgICAgICBwb29sOiBbXSxcbiAgICAgICAgZ2V0OiBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgICAgICB2YXIgdiA9IHRoaXMucG9vbC5sZW5ndGggPyB0aGlzLnBvb2wucG9wKCkgOiB7IHg6IDAsIHk6IDAsIHo6IDAgfTtcbiAgICAgICAgICAgIC8vIGNoZWNrIGlmIGEgdmVjdG9yIGhhcyBiZWVuIHBhc3NlZCBpblxuICAgICAgICAgICAgaWYoeCAhPT0gdW5kZWZpbmVkICYmIGlzTmFOKHgpICYmICd4JyBpbiB4ICYmICd5JyBpbiB4ICYmICd6JyBpbiB4KSB7XG4gICAgICAgICAgICAgICAgdi54ID0geC54IHx8IDA7XG4gICAgICAgICAgICAgICAgdi55ID0geC55IHx8IDA7XG4gICAgICAgICAgICAgICAgdi56ID0geC56IHx8IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2LnggPSB4IHx8IDA7XG4gICAgICAgICAgICAgICAgdi55ID0geSB8fCAwO1xuICAgICAgICAgICAgICAgIHYueiA9IHogfHwgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9LFxuICAgICAgICBkaXNwb3NlOiBmdW5jdGlvbihpbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5wb29sLnB1c2goaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBnbG9iYWxVcCA9IFZlY1Bvb2wuZ2V0KDAsIDEsIDApO1xuXG4gICAgdmFyIHNldE9yaWVudGF0aW9uID0gZnVuY3Rpb24obm9kZSwgZncpIHtcbiAgICAgICAgLy8gc2V0IHRoZSBvcmllbnRhdGlvbiBvZiB0aGUgc291cmNlICh3aGVyZSB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG5cbiAgICAgICAgLy8gY2FsY3VsYXRlIHVwIHZlYyAoIHVwID0gKGZvcndhcmQgY3Jvc3MgKDAsIDEsIDApKSBjcm9zcyBmb3J3YXJkIClcbiAgICAgICAgdmFyIHVwID0gVmVjUG9vbC5nZXQoZncueCwgZncueSwgZncueik7XG4gICAgICAgIGNyb3NzKHVwLCBnbG9iYWxVcCk7XG4gICAgICAgIGNyb3NzKHVwLCBmdyk7XG4gICAgICAgIG5vcm1hbGl6ZSh1cCk7XG4gICAgICAgIG5vcm1hbGl6ZShmdyk7XG4gICAgICAgIC8vIHNldCB0aGUgYXVkaW8gY29udGV4dCdzIGxpc3RlbmVyIHBvc2l0aW9uIHRvIG1hdGNoIHRoZSBjYW1lcmEgcG9zaXRpb25cbiAgICAgICAgbm9kZS5zZXRPcmllbnRhdGlvbihmdy54LCBmdy55LCBmdy56LCB1cC54LCB1cC55LCB1cC56KTtcblxuICAgICAgICAvLyByZXR1cm4gdGhlIHZlY3MgdG8gdGhlIHBvb2xcbiAgICAgICAgVmVjUG9vbC5kaXNwb3NlKGZ3KTtcbiAgICAgICAgVmVjUG9vbC5kaXNwb3NlKHVwKTtcbiAgICB9O1xuXG4gICAgdmFyIHNldFBvc2l0aW9uID0gZnVuY3Rpb24obm9kZSwgdmVjKSB7XG4gICAgICAgIG5vZGUuc2V0UG9zaXRpb24odmVjLngsIHZlYy55LCB2ZWMueik7XG4gICAgICAgIFZlY1Bvb2wuZGlzcG9zZSh2ZWMpO1xuICAgIH07XG5cbiAgICB2YXIgc2V0VmVsb2NpdHkgPSBmdW5jdGlvbihub2RlLCB2ZWMpIHtcbiAgICAgICAgbm9kZS5zZXRWZWxvY2l0eSh2ZWMueCwgdmVjLnksIHZlYy56KTtcbiAgICAgICAgVmVjUG9vbC5kaXNwb3NlKHZlYyk7XG4gICAgfTtcblxuICAgIC8vIGNyb3NzIHByb2R1Y3Qgb2YgMiB2ZWN0b3JzXG4gICAgdmFyIGNyb3NzID0gZnVuY3Rpb24gKCBhLCBiICkge1xuICAgICAgICB2YXIgYXggPSBhLngsIGF5ID0gYS55LCBheiA9IGEuejtcbiAgICAgICAgdmFyIGJ4ID0gYi54LCBieSA9IGIueSwgYnogPSBiLno7XG4gICAgICAgIGEueCA9IGF5ICogYnogLSBheiAqIGJ5O1xuICAgICAgICBhLnkgPSBheiAqIGJ4IC0gYXggKiBiejtcbiAgICAgICAgYS56ID0gYXggKiBieSAtIGF5ICogYng7XG4gICAgfTtcblxuICAgIC8vIG5vcm1hbGlzZSB0byB1bml0IHZlY3RvclxuICAgIHZhciBub3JtYWxpemUgPSBmdW5jdGlvbiAodmVjMykge1xuICAgICAgICBpZih2ZWMzLnggPT09IDAgJiYgdmVjMy55ID09PSAwICYmIHZlYzMueiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHZlYzM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxlbmd0aCA9IE1hdGguc3FydCggdmVjMy54ICogdmVjMy54ICsgdmVjMy55ICogdmVjMy55ICsgdmVjMy56ICogdmVjMy56ICk7XG4gICAgICAgIHZhciBpbnZTY2FsYXIgPSAxIC8gbGVuZ3RoO1xuICAgICAgICB2ZWMzLnggKj0gaW52U2NhbGFyO1xuICAgICAgICB2ZWMzLnkgKj0gaW52U2NhbGFyO1xuICAgICAgICB2ZWMzLnogKj0gaW52U2NhbGFyO1xuICAgICAgICByZXR1cm4gdmVjMztcbiAgICB9O1xuXG4gICAgLy8gcGFuIGxlZnQgdG8gcmlnaHQgd2l0aCB2YWx1ZSBmcm9tIC0xIHRvIDFcbiAgICAvLyBjcmVhdGVzIGEgbmljZSBjdXJ2ZSB3aXRoIHpcbiAgICBub2RlLnNldFggPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB2YXIgZGVnNDUgPSBNYXRoLlBJIC8gNCxcbiAgICAgICAgICAgIGRlZzkwID0gZGVnNDUgKiAyLFxuICAgICAgICAgICAgeCA9IHZhbHVlICogZGVnNDUsXG4gICAgICAgICAgICB6ID0geCArIGRlZzkwO1xuXG4gICAgICAgIGlmICh6ID4gZGVnOTApIHtcbiAgICAgICAgICAgIHogPSBNYXRoLlBJIC0gejtcbiAgICAgICAgfVxuXG4gICAgICAgIHggPSBNYXRoLnNpbih4KTtcbiAgICAgICAgeiA9IE1hdGguc2luKHopO1xuXG4gICAgICAgIG5vZGUuc2V0UG9zaXRpb24oeCwgMCwgeik7XG4gICAgfTtcblxuICAgIC8qdmFyIHggPSAwLFxuICAgICAgICB5ID0gMCxcbiAgICAgICAgeiA9IDA7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgICd4Jzoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHg7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgeCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0UG9zaXRpb24oeCwgeSwgeik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTsqL1xuXG4gICAgLy8gc2V0IHRoZSBwb3NpdGlvbiB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG4gICAgbm9kZS5zZXRTb3VyY2VQb3NpdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0UG9zaXRpb24obm9kZSwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIGRpcmVjdGlvbiB0aGUgYXVkaW8gaXMgY29taW5nIGZyb20pXG4gICAgbm9kZS5zZXRTb3VyY2VPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0T3JpZW50YXRpb24obm9kZSwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHZlbG9pY3R5IG9mIHRoZSBhdWRpbyBzb3VyY2UgKGlmIG1vdmluZylcbiAgICBub2RlLnNldFNvdXJjZVZlbG9jaXR5ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRWZWxvY2l0eShub2RlLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIHNldCB0aGUgcG9zaXRpb24gb2Ygd2hvIG9yIHdoYXQgaXMgaGVhcmluZyB0aGUgYXVkaW8gKGNvdWxkIGJlIGNhbWVyYSBvciBzb21lIGNoYXJhY3RlcilcbiAgICBub2RlLnNldExpc3RlbmVyUG9zaXRpb24gPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gICAgICAgIHNldFBvc2l0aW9uKGNvbnRleHQubGlzdGVuZXIsIFZlY1Bvb2wuZ2V0KHgsIHksIHopKTtcbiAgICB9O1xuXG4gICAgLy8gc2V0IHRoZSBwb3NpdGlvbiBvZiB3aG8gb3Igd2hhdCBpcyBoZWFyaW5nIHRoZSBhdWRpbyAoY291bGQgYmUgY2FtZXJhIG9yIHNvbWUgY2hhcmFjdGVyKVxuICAgIG5vZGUuc2V0TGlzdGVuZXJPcmllbnRhdGlvbiA9IGZ1bmN0aW9uKHgsIHksIHopIHtcbiAgICAgICAgc2V0T3JpZW50YXRpb24oY29udGV4dC5saXN0ZW5lciwgVmVjUG9vbC5nZXQoeCwgeSwgeikpO1xuICAgIH07XG5cbiAgICAvLyBzZXQgdGhlIHZlbG9jaXR5IChpZiBtb3ZpbmcpIG9mIHdobyBvciB3aGF0IGlzIGhlYXJpbmcgdGhlIGF1ZGlvIChjb3VsZCBiZSBjYW1lcmEgb3Igc29tZSBjaGFyYWN0ZXIpXG4gICAgbm9kZS5zZXRMaXN0ZW5lclZlbG9jaXR5ID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICAgICAgICBzZXRWZWxvY2l0eShjb250ZXh0Lmxpc3RlbmVyLCBWZWNQb29sLmdldCh4LCB5LCB6KSk7XG4gICAgfTtcblxuICAgIC8vIGhlbHBlciB0byBjYWxjdWxhdGUgdmVsb2NpdHlcbiAgICBub2RlLmNhbGN1bGF0ZVZlbG9jaXR5ID0gZnVuY3Rpb24oY3VycmVudFBvc2l0aW9uLCBsYXN0UG9zaXRpb24sIGRlbHRhVGltZSkge1xuICAgICAgICB2YXIgZHggPSBjdXJyZW50UG9zaXRpb24ueCAtIGxhc3RQb3NpdGlvbi54O1xuICAgICAgICB2YXIgZHkgPSBjdXJyZW50UG9zaXRpb24ueSAtIGxhc3RQb3NpdGlvbi55O1xuICAgICAgICB2YXIgZHogPSBjdXJyZW50UG9zaXRpb24ueiAtIGxhc3RQb3NpdGlvbi56O1xuICAgICAgICByZXR1cm4gVmVjUG9vbC5nZXQoZHggLyBkZWx0YVRpbWUsIGR5IC8gZGVsdGFUaW1lLCBkeiAvIGRlbHRhVGltZSk7XG4gICAgfTtcblxuICAgIG5vZGUuc2V0RGVmYXVsdHMgPSBmdW5jdGlvbihkZWZhdWx0cykge1xuICAgICAgICBPYmplY3Qua2V5cyhkZWZhdWx0cykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIFBhbm5lci5kZWZhdWx0c1trZXldID0gZGVmYXVsdHNba2V5XTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBub2RlO1xufVxuXG5QYW5uZXIuZGVmYXVsdHMgPSB7XG4gICAgcGFubmluZ01vZGVsOiAnSFJURicsXG4gICAgZGlzdGFuY2VNb2RlbDogJ2xpbmVhcicsXG4gICAgcmVmRGlzdGFuY2U6IDEsXG4gICAgbWF4RGlzdGFuY2U6IDEwMDAsXG4gICAgcm9sbG9mZkZhY3RvcjogMSxcbiAgICBjb25lSW5uZXJBbmdsZTogMzYwLFxuICAgIGNvbmVPdXRlckFuZ2xlOiAwLFxuICAgIGNvbmVPdXRlckdhaW46IDBcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFubmVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBQaGFzZXIoY29udGV4dCwgY29uZmlnKSB7XG4gICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuICAgIHZhciBzdGFnZXMgPSBjb25maWcuc3RhZ2VzIHx8IDgsXG4gICAgICAgIGxmb0ZyZXF1ZW5jeSA9IGNvbmZpZy5mcmVxdWVuY3kgfHwgMC41LFxuICAgICAgICBsZm9HYWluVmFsdWUgPSBjb25maWcuZ2FpbiB8fCAzMDAsXG4gICAgICAgIGZlZWRiYWNrR2FpbiA9IGNvbmZpZy5mZWVkYmFjayB8fCAwLjUsXG4gICAgICAgIGZpbHRlcnMgPSBbXSxcbiAgICAgICAgZmlsdGVyO1xuXG4gICAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGZlZWRiYWNrID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIGxmbyA9IGNvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgIHZhciBsZm9HYWluID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgZmVlZGJhY2suZ2Fpbi52YWx1ZSA9IGZlZWRiYWNrR2FpbjtcblxuICAgIGxmby50eXBlID0gJ3NpbmUnO1xuICAgIGxmby5mcmVxdWVuY3kudmFsdWUgPSBsZm9GcmVxdWVuY3k7XG4gICAgbGZvR2Fpbi5nYWluLnZhbHVlID0gbGZvR2FpblZhbHVlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdGFnZXM7IGkrKykge1xuICAgICAgICBmaWx0ZXIgPSBjb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICBmaWx0ZXIudHlwZSA9ICdhbGxwYXNzJztcbiAgICAgICAgZmlsdGVyLmZyZXF1ZW5jeS52YWx1ZSA9IDEwMDAgKiBpO1xuICAgICAgICAvL2ZpbHRlci5RLnZhbHVlID0gMTA7XG4gICAgICAgIGlmKGkgPiAwKSB7XG4gICAgICAgICAgICBmaWx0ZXJzW2ktMV0uY29ubmVjdChmaWx0ZXIpO1xuICAgICAgICB9XG4gICAgICAgIGxmb0dhaW4uY29ubmVjdChmaWx0ZXIuZnJlcXVlbmN5KTtcblxuICAgICAgICBmaWx0ZXJzLnB1c2goZmlsdGVyKTtcbiAgICB9XG5cbiAgICB2YXIgZmlyc3QgPSBmaWx0ZXJzWzBdO1xuICAgIHZhciBsYXN0ID0gZmlsdGVyc1tmaWx0ZXJzLmxlbmd0aCAtIDFdO1xuXG4gICAgaW5wdXQuY29ubmVjdChmaXJzdCk7XG4gICAgaW5wdXQuY29ubmVjdChvdXRwdXQpO1xuICAgIGxhc3QuY29ubmVjdChvdXRwdXQpO1xuICAgIGxhc3QuY29ubmVjdChmZWVkYmFjayk7XG4gICAgZmVlZGJhY2suY29ubmVjdChmaXJzdCk7XG4gICAgbGZvLmNvbm5lY3QobGZvR2Fpbik7XG4gICAgbGZvLnN0YXJ0KDApO1xuXG4gICAgdmFyIG5vZGUgPSBpbnB1dDtcbiAgICBub2RlLm5hbWUgPSAnUGhhc2VyJztcbiAgICBub2RlLl9vdXRwdXQgPSBvdXRwdXQ7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgIGxmb0ZyZXF1ZW5jeToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGxmby5mcmVxdWVuY3kudmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGxmby5mcmVxdWVuY3kudmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBsZm9HYWluOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbGZvR2Fpbi5nYWluLnZhbHVlOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBsZm9HYWluLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9LFxuICAgICAgICBmZWVkYmFjazoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGZlZWRiYWNrLmdhaW4udmFsdWU7IH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGZlZWRiYWNrLmdhaW4udmFsdWUgPSB2YWx1ZTsgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQaGFzZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFJlY29yZGVyKGNvbnRleHQsIHBhc3NUaHJvdWdoKSB7XG4gICAgdmFyIGJ1ZmZlcnNMID0gW10sXG4gICAgICAgIGJ1ZmZlcnNSID0gW10sXG4gICAgICAgIHN0YXJ0ZWRBdCA9IDAsXG4gICAgICAgIHN0b3BwZWRBdCA9IDA7XG5cbiAgICB2YXIgaW5wdXQgPSBjb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB2YXIgb3V0cHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIHNjcmlwdCA9IGNvbnRleHQuY3JlYXRlU2NyaXB0UHJvY2Vzc29yKDQwOTYsIDIsIDIpO1xuICAgIFxuICAgIGlucHV0LmNvbm5lY3Qoc2NyaXB0KTtcbiAgICBzY3JpcHQuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICBzY3JpcHQuY29ubmVjdChvdXRwdXQpO1xuXG4gICAgdmFyIG5vZGUgPSBpbnB1dDtcbiAgICBub2RlLm5hbWUgPSAnUmVjb3JkZXInO1xuICAgIG5vZGUuX291dHB1dCA9IG91dHB1dDtcblxuICAgIG5vZGUuaXNSZWNvcmRpbmcgPSBmYWxzZTtcblxuICAgIHZhciBnZXRCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIWJ1ZmZlcnNMLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIDQwOTYsIGNvbnRleHQuc2FtcGxlUmF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJ1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGJ1ZmZlcnNMLmxlbmd0aCwgY29udGV4dC5zYW1wbGVSYXRlKTtcbiAgICAgICAgYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChidWZmZXJzTCk7XG4gICAgICAgIGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyc1IpO1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH07XG5cbiAgICBub2RlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGJ1ZmZlcnNMLmxlbmd0aCA9IDA7XG4gICAgICAgIGJ1ZmZlcnNSLmxlbmd0aCA9IDA7XG4gICAgICAgIHN0YXJ0ZWRBdCA9IGNvbnRleHQuY3VycmVudFRpbWU7XG4gICAgICAgIHN0b3BwZWRBdCA9IDA7XG4gICAgICAgIHRoaXMuaXNSZWNvcmRpbmcgPSB0cnVlO1xuICAgIH07XG5cbiAgICBub2RlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RvcHBlZEF0ID0gY29udGV4dC5jdXJyZW50VGltZTtcbiAgICAgICAgdGhpcy5pc1JlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gZ2V0QnVmZmVyKCk7XG4gICAgfTtcblxuICAgIG5vZGUuZ2V0RHVyYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYoIXRoaXMuaXNSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBzdG9wcGVkQXQgLSBzdGFydGVkQXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbnRleHQuY3VycmVudFRpbWUgLSBzdGFydGVkQXQ7XG4gICAgfTtcblxuICAgIHNjcmlwdC5vbmF1ZGlvcHJvY2VzcyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB2YXIgaW5wdXRMID0gZXZlbnQuaW5wdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCksXG4gICAgICAgICAgICBpbnB1dFIgPSBldmVudC5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKSxcbiAgICAgICAgICAgIG91dHB1dEwgPSBldmVudC5vdXRwdXRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCksXG4gICAgICAgICAgICBvdXRwdXRSID0gZXZlbnQub3V0cHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuXG4gICAgICAgIGlmKHBhc3NUaHJvdWdoKSB7XG4gICAgICAgICAgICBvdXRwdXRMLnNldChpbnB1dEwpO1xuICAgICAgICAgICAgb3V0cHV0Ui5zZXQoaW5wdXRSKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKG5vZGUuaXNSZWNvcmRpbmcpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5wdXRMLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyc0wucHVzaChpbnB1dExbaV0pO1xuICAgICAgICAgICAgICAgIGJ1ZmZlcnNSLnB1c2goaW5wdXRSW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSZWNvcmRlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gUmV2ZXJiKGNvbnRleHQsIGNvbmZpZykge1xuICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcblxuICAgIHZhciB0aW1lID0gY29uZmlnLnRpbWUgfHwgMSxcbiAgICAgICAgZGVjYXkgPSBjb25maWcuZGVjYXkgfHwgNSxcbiAgICAgICAgcmV2ZXJzZSA9ICEhY29uZmlnLnJldmVyc2UsXG4gICAgICAgIHJhdGUgPSBjb250ZXh0LnNhbXBsZVJhdGUsXG4gICAgICAgIGxlbmd0aCxcbiAgICAgICAgaW1wdWxzZVJlc3BvbnNlO1xuXG4gICAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdmFyIHJldmVyYiA9IGNvbnRleHQuY3JlYXRlQ29udm9sdmVyKCk7XG4gICAgdmFyIG91dHB1dCA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuXG4gICAgaW5wdXQuY29ubmVjdChyZXZlcmIpO1xuICAgIGlucHV0LmNvbm5lY3Qob3V0cHV0KTtcbiAgICByZXZlcmIuY29ubmVjdChvdXRwdXQpO1xuXG4gICAgdmFyIG5vZGUgPSBpbnB1dDtcbiAgICBub2RlLm5hbWUgPSAnUmV2ZXJiJztcbiAgICBub2RlLl9vdXRwdXQgPSBvdXRwdXQ7XG5cbiAgICBub2RlLnVwZGF0ZSA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgICAgICBpZihjb25maWcudGltZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aW1lID0gY29uZmlnLnRpbWU7XG4gICAgICAgICAgICBsZW5ndGggPSByYXRlICogdGltZTtcbiAgICAgICAgICAgIGltcHVsc2VSZXNwb25zZSA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGxlbmd0aCwgcmF0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYoY29uZmlnLmRlY2F5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlY2F5ID0gY29uZmlnLmRlY2F5O1xuICAgICAgICB9XG4gICAgICAgIGlmKGNvbmZpZy5yZXZlcnNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldmVyc2UgPSBjb25maWcucmV2ZXJzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBsZWZ0ID0gaW1wdWxzZVJlc3BvbnNlLmdldENoYW5uZWxEYXRhKDApLFxuICAgICAgICAgICAgcmlnaHQgPSBpbXB1bHNlUmVzcG9uc2UuZ2V0Q2hhbm5lbERhdGEoMSksXG4gICAgICAgICAgICBuLCBlO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG4gPSByZXZlcnNlID8gbGVuZ3RoIC0gaSA6IGk7XG4gICAgICAgICAgICBlID0gTWF0aC5wb3coMSAtIG4gLyBsZW5ndGgsIGRlY2F5KTtcbiAgICAgICAgICAgIGxlZnRbaV0gPSAoTWF0aC5yYW5kb20oKSAqIDIgLSAxKSAqIGU7XG4gICAgICAgICAgICByaWdodFtpXSA9IChNYXRoLnJhbmRvbSgpICogMiAtIDEpICogZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldmVyYi5idWZmZXIgPSBpbXB1bHNlUmVzcG9uc2U7XG4gICAgfTtcblxuICAgIG5vZGUudXBkYXRlKHtcbiAgICAgICAgdGltZTogdGltZSxcbiAgICAgICAgZGVjYXk6IGRlY2F5LFxuICAgICAgICByZXZlcnNlOiByZXZlcnNlXG4gICAgfSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhub2RlLCB7XG4gICAgICAgIHRpbWU6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aW1lOyB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzZXQgdGltZTonLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYodmFsdWUgPT09IHRpbWUpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoe3RpbWU6IHRpbWV9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZGVjYXk6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBkZWNheTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZih2YWx1ZSA9PT0gZGVjYXkpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGUoe2RlY2F5OiBkZWNheX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZXZlcnNlOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gcmV2ZXJzZTsgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZih2YWx1ZSA9PT0gcmV2ZXJzZSkgeyByZXR1cm47IH1cbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSh7cmV2ZXJzZTogISF2YWx1ZX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSZXZlcmI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFZmZlY3QgPSByZXF1aXJlKCcuL2VmZmVjdC5qcycpO1xuXG5mdW5jdGlvbiBHcm91cChjb250ZXh0LCBkZXN0aW5hdGlvbikge1xuICAgIHRoaXMuX3NvdW5kcyA9IFtdO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VmZmVjdCA9IG5ldyBFZmZlY3QodGhpcy5fY29udGV4dCk7XG4gICAgdGhpcy5fZ2FpbiA9IHRoaXMuX2VmZmVjdC5nYWluKCk7XG4gICAgaWYodGhpcy5fY29udGV4dCkge1xuICAgICAgICB0aGlzLl9lZmZlY3Quc2V0U291cmNlKHRoaXMuX2dhaW4pO1xuICAgICAgICB0aGlzLl9lZmZlY3Quc2V0RGVzdGluYXRpb24oZGVzdGluYXRpb24gfHwgdGhpcy5fY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfVxufVxuXG4vKlxuICogQWRkIC8gcmVtb3ZlXG4gKi9cblxuR3JvdXAucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgc291bmQuZ2Fpbi5kaXNjb25uZWN0KCk7XG4gICAgc291bmQuZ2Fpbi5jb25uZWN0KHRoaXMuX2dhaW4pO1xuXG4gICAgdGhpcy5fc291bmRzLnB1c2goc291bmQpO1xufTtcblxuR3JvdXAucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHNvdW5kT3JJZCkge1xuICAgIHRoaXMuX3NvdW5kcy5zb21lKGZ1bmN0aW9uKHNvdW5kLCBpbmRleCwgc291bmRzKSB7XG4gICAgICAgIGlmKHNvdW5kID09PSBzb3VuZE9ySWQgfHwgc291bmQuaWQgPT09IHNvdW5kT3JJZCkge1xuICAgICAgICAgICAgc291bmRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuR3JvdXAucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSwgb2Zmc2V0KSB7XG4gICAgdGhpcy5fc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgc291bmQucGxheShkZWxheSwgb2Zmc2V0KTtcbiAgICB9KTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgIGlmKHNvdW5kLnBsYXlpbmcpIHtcbiAgICAgICAgICAgIHNvdW5kLnBhdXNlKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbkdyb3VwLnByb3RvdHlwZS5yZXN1bWUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICBpZihzb3VuZC5wYXVzZWQpIHtcbiAgICAgICAgICAgIHNvdW5kLnBsYXkoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuR3JvdXAucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9zb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICBzb3VuZC5zdG9wKCk7XG4gICAgfSk7XG59O1xuXG5Hcm91cC5wcm90b3R5cGUuc2VlayA9IGZ1bmN0aW9uKHBlcmNlbnQpIHtcbiAgICB0aGlzLl9zb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICBzb3VuZC5zZWVrKHBlcmNlbnQpO1xuICAgIH0pO1xufTtcblxuR3JvdXAucHJvdG90eXBlLm11dGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9wcmVNdXRlVm9sdW1lID0gdGhpcy52b2x1bWU7XG4gICAgdGhpcy52b2x1bWUgPSAwO1xufTtcblxuR3JvdXAucHJvdG90eXBlLnVuTXV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudm9sdW1lID0gdGhpcy5fcHJlTXV0ZVZvbHVtZSB8fCAxO1xufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEdyb3VwLnByb3RvdHlwZSwgJ3ZvbHVtZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZ2Fpbi5nYWluLnZhbHVlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBpZihpc05hTih2YWx1ZSkpIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgaWYodGhpcy5fY29udGV4dCkge1xuICAgICAgICAgICAgdGhpcy5fZ2Fpbi5nYWluLmNhbmNlbFNjaGVkdWxlZFZhbHVlcyh0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lKTtcbiAgICAgICAgICAgIHRoaXMuX2dhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy5fZ2Fpbi5nYWluLnNldFZhbHVlQXRUaW1lKHZhbHVlLCB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2dhaW4uZ2Fpbi52YWx1ZSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3NvdW5kcy5mb3JFYWNoKGZ1bmN0aW9uKHNvdW5kKSB7XG4gICAgICAgICAgICBpZiAoIXNvdW5kLmNvbnRleHQpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC52b2x1bWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufSk7XG5cbkdyb3VwLnByb3RvdHlwZS5mYWRlID0gZnVuY3Rpb24odm9sdW1lLCBkdXJhdGlvbikge1xuICAgIGlmKHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgdmFyIHBhcmFtID0gdGhpcy5fZ2Fpbi5nYWluO1xuICAgICAgICB2YXIgdGltZSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWU7XG5cbiAgICAgICAgcGFyYW0uY2FuY2VsU2NoZWR1bGVkVmFsdWVzKHRpbWUpO1xuICAgICAgICBwYXJhbS5zZXRWYWx1ZUF0VGltZShwYXJhbS52YWx1ZSwgdGltZSk7XG4gICAgICAgIC8vIHBhcmFtLnNldFZhbHVlQXRUaW1lKHZvbHVtZSwgdGltZSArIGR1cmF0aW9uKTtcbiAgICAgICAgcGFyYW0ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUodm9sdW1lLCB0aW1lICsgZHVyYXRpb24pO1xuICAgICAgICAvLyBwYXJhbS5zZXRUYXJnZXRBdFRpbWUodm9sdW1lLCB0aW1lLCBkdXJhdGlvbik7XG4gICAgICAgIC8vIHBhcmFtLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoTWF0aC5tYXgodm9sdW1lLCAwLjAwMDEpLCB0aW1lICsgZHVyYXRpb24pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgICAgIHNvdW5kLmZhZGUodm9sdW1lLCBkdXJhdGlvbik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAqIERlc3Ryb3lcbiAqL1xuXG5Hcm91cC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIHdoaWxlKHRoaXMuX3NvdW5kcy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fc291bmRzLnBvcCgpLmRlc3Ryb3koKTtcbiAgICB9XG59O1xuXG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEdyb3VwLnByb3RvdHlwZSwge1xuICAgICdlZmZlY3QnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZWZmZWN0O1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZ2Fpbic6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYWluO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnc291bmRzJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NvdW5kcztcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQnVmZmVyU291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2UvYnVmZmVyLXNvdXJjZS5qcycpLFxuICAgIEVmZmVjdCA9IHJlcXVpcmUoJy4vZWZmZWN0LmpzJyksXG4gICAgRW1pdHRlciA9IHJlcXVpcmUoJy4vdXRpbHMvZW1pdHRlci5qcycpLFxuICAgIEZpbGUgPSByZXF1aXJlKCcuL3V0aWxzL2ZpbGUuanMnKSxcbiAgICBMb2FkZXIgPSByZXF1aXJlKCcuL3V0aWxzL2xvYWRlci5qcycpLFxuICAgIE1lZGlhU291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2UvbWVkaWEtc291cmNlLmpzJyksXG4gICAgTWljcm9waG9uZVNvdXJjZSA9IHJlcXVpcmUoJy4vc291cmNlL21pY3JvcGhvbmUtc291cmNlLmpzJyksXG4gICAgT3NjaWxsYXRvclNvdXJjZSA9IHJlcXVpcmUoJy4vc291cmNlL29zY2lsbGF0b3Itc291cmNlLmpzJyksXG4gICAgU2NyaXB0U291cmNlID0gcmVxdWlyZSgnLi9zb3VyY2Uvc2NyaXB0LXNvdXJjZS5qcycpO1xuXG5mdW5jdGlvbiBTb3VuZChjb250ZXh0LCBkZXN0aW5hdGlvbikge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9kYXRhID0gbnVsbDtcbiAgICAvLyB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9pc1RvdWNoTG9ja2VkID0gZmFsc2U7XG4gICAgdGhpcy5fbG9hZGVyID0gbnVsbDtcbiAgICB0aGlzLl9sb29wID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXliYWNrUmF0ZSA9IDE7XG4gICAgdGhpcy5fcGxheVdoZW5SZWFkeSA9IG51bGw7XG4gICAgdGhpcy5fc291cmNlID0gbnVsbDtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xuXG4gICAgdGhpcy5fZWZmZWN0ID0gbmV3IEVmZmVjdCh0aGlzLl9jb250ZXh0KTtcbiAgICB0aGlzLl9nYWluID0gdGhpcy5fZWZmZWN0LmdhaW4oKTtcbiAgICBpZih0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX2VmZmVjdC5zZXREZXN0aW5hdGlvbih0aGlzLl9nYWluKTtcbiAgICAgICAgdGhpcy5fZ2Fpbi5jb25uZWN0KGRlc3RpbmF0aW9uIHx8IHRoaXMuX2NvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIH1cbn1cblxuU291bmQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFbWl0dGVyLnByb3RvdHlwZSk7XG5Tb3VuZC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTb3VuZDtcblxuLypcbiAqIExvYWRcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHZhciB1cmwgPSBGaWxlLmdldFN1cHBvcnRlZEZpbGUoY29uZmlnLnVybCB8fCBjb25maWcpO1xuXG4gICAgaWYodGhpcy5fc291cmNlICYmIHRoaXMuX3NvdXJjZS5fZWwpIHtcbiAgICAgICAgdGhpcy5fc291cmNlLmxvYWQodXJsKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX2xvYWRlciA9IHRoaXMuX2xvYWRlciB8fCBuZXcgTG9hZGVyKHVybCk7XG4gICAgICAgIHRoaXMuX2xvYWRlci5hdWRpb0NvbnRleHQgPSAhIWNvbmZpZy5hc01lZGlhRWxlbWVudCA/IG51bGwgOiB0aGlzLl9jb250ZXh0O1xuICAgICAgICB0aGlzLl9sb2FkZXIuaXNUb3VjaExvY2tlZCA9IHRoaXMuX2lzVG91Y2hMb2NrZWQ7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5fbG9hZGVyLm9uY2UoJ2xvYWRlZCcsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHNlbGYuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgICBzZWxmID0gbnVsbDtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuU291bmQucHJvdG90eXBlLnBsYXkgPSBmdW5jdGlvbihkZWxheSwgb2Zmc2V0KSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSB8fCB0aGlzLl9pc1RvdWNoTG9ja2VkKSB7XG4gICAgICAgIHRoaXMuX3BsYXlXaGVuUmVhZHkgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMucGxheShkZWxheSwgb2Zmc2V0KTtcbiAgICAgICAgfS5iaW5kKHRoaXMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdGhpcy5fcGxheVdoZW5SZWFkeSA9IG51bGw7XG4gICAgdGhpcy5fZWZmZWN0LnNldFNvdXJjZSh0aGlzLl9zb3VyY2Uuc291cmNlTm9kZSk7XG4gICAgdGhpcy5fc291cmNlLmxvb3AgPSB0aGlzLl9sb29wO1xuXG4gICAgLy8gdXBkYXRlIHZvbHVtZSBuZWVkZWQgZm9yIG5vIHdlYmF1ZGlvXG4gICAgaWYoIXRoaXMuX2NvbnRleHQpIHsgdGhpcy52b2x1bWUgPSB0aGlzLl9nYWluLmdhaW4udmFsdWU7IH1cblxuICAgIHRoaXMuX3NvdXJjZS5wbGF5KGRlbGF5LCBvZmZzZXQpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5fc291cmNlKSB7IHJldHVybiB0aGlzOyB9XG4gICAgdGhpcy5fc291cmNlLnBhdXNlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5Tb3VuZC5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKCF0aGlzLl9zb3VyY2UpIHsgcmV0dXJuIHRoaXM7IH1cbiAgICB0aGlzLl9zb3VyY2Uuc3RvcCgpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuU291bmQucHJvdG90eXBlLnNlZWsgPSBmdW5jdGlvbihwZXJjZW50KSB7XG4gICAgaWYoIXRoaXMuX3NvdXJjZSkgeyByZXR1cm4gdGhpczsgfVxuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMucGxheSgwLCB0aGlzLl9zb3VyY2UuZHVyYXRpb24gKiBwZXJjZW50KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblNvdW5kLnByb3RvdHlwZS5mYWRlID0gZnVuY3Rpb24odm9sdW1lLCBkdXJhdGlvbikge1xuICAgIGlmKCF0aGlzLl9zb3VyY2UpIHsgcmV0dXJuIHRoaXM7IH1cblxuICAgIGlmKHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgdmFyICBwYXJhbSA9IHRoaXMuX2dhaW4uZ2FpbjtcbiAgICAgICAgdmFyIHRpbWUgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgICAgICBwYXJhbS5jYW5jZWxTY2hlZHVsZWRWYWx1ZXModGltZSk7XG4gICAgICAgIHBhcmFtLnNldFZhbHVlQXRUaW1lKHBhcmFtLnZhbHVlLCB0aW1lKTtcbiAgICAgICAgcGFyYW0ubGluZWFyUmFtcFRvVmFsdWVBdFRpbWUodm9sdW1lLCB0aW1lICsgZHVyYXRpb24pO1xuICAgIH1cbiAgICBlbHNlIGlmKHR5cGVvZiB0aGlzLl9zb3VyY2UuZmFkZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9zb3VyY2UuZmFkZSh2b2x1bWUsIGR1cmF0aW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qXG4gKiBFbmRlZCBoYW5kbGVyXG4gKi9cblxuLy8gU291bmQucHJvdG90eXBlLm9uRW5kZWQgPSBmdW5jdGlvbihmbiwgY29udGV4dCkge1xuLy8gICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBmbiA/IGZuLmJpbmQoY29udGV4dCB8fCB0aGlzKSA6IG51bGw7XG4vLyAgICAgcmV0dXJuIHRoaXM7XG4vLyB9O1xuXG4vLyBTb3VuZC5wcm90b3R5cGUuX2VuZGVkSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuLy8gICAgIHRoaXMuZW1pdCgnZW5kZWQnKTtcblxuLy8gICAgIC8vIGlmKHR5cGVvZiB0aGlzLl9lbmRlZENhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4vLyAgICAgLy8gICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sodGhpcyk7XG4vLyAgICAgLy8gfVxuLy8gfTtcblxuLypcbiAqIERlc3Ryb3lcbiAqL1xuXG5Tb3VuZC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3NvdXJjZSkgeyB0aGlzLl9zb3VyY2UuZGVzdHJveSgpOyB9XG4gICAgaWYodGhpcy5fZWZmZWN0KSB7IHRoaXMuX2VmZmVjdC5kZXN0cm95KCk7IH1cbiAgICBpZih0aGlzLl9nYWluKSB7IHRoaXMuX2dhaW4uZGlzY29ubmVjdCgpOyB9XG4gICAgdGhpcy5fZ2FpbiA9IG51bGw7XG4gICAgdGhpcy5fY29udGV4dCA9IG51bGw7XG4gICAgdGhpcy5fZGF0YSA9IG51bGw7XG4gICAgLy8gdGhpcy5fZW5kZWRDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ2VuZGVkJyk7XG4gICAgdGhpcy5fcGxheVdoZW5SZWFkeSA9IG51bGw7XG4gICAgdGhpcy5fc291cmNlID0gbnVsbDtcbiAgICB0aGlzLl9lZmZlY3QgPSBudWxsO1xuICAgIGlmKHRoaXMuX2xvYWRlcikge1xuICAgICAgICB0aGlzLl9sb2FkZXIuZGVzdHJveSgpO1xuICAgICAgICB0aGlzLl9sb2FkZXIgPSBudWxsO1xuICAgIH1cbn07XG5cbi8qXG4gKiBDcmVhdGUgc291cmNlXG4gKi9cblxuU291bmQucHJvdG90eXBlLl9jcmVhdGVTb3VyY2UgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgLy8gaWYgKHRoaXMuX3NvdXJjZSAmJiBGaWxlLnR5cGUoZGF0YSkgPT09IHRoaXMuX3NvdXJjZS50eXBlKSB7XG4gICAgLy8gICAgIHRoaXMuX3NvdXJjZS5kYXRhID0gZGF0YTtcbiAgICAvLyB9IGVsc2VcbiAgICBpZihGaWxlLmlzQXVkaW9CdWZmZXIoZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IEJ1ZmZlclNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZihGaWxlLmlzTWVkaWFFbGVtZW50KGRhdGEpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBNZWRpYVNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSBpZihGaWxlLmlzTWVkaWFTdHJlYW0oZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IE1pY3JvcGhvbmVTb3VyY2UoZGF0YSwgdGhpcy5fY29udGV4dCk7XG4gICAgfVxuICAgIGVsc2UgaWYoRmlsZS5pc09zY2lsbGF0b3JUeXBlKGRhdGEpKSB7XG4gICAgICAgIHRoaXMuX3NvdXJjZSA9IG5ldyBPc2NpbGxhdG9yU291cmNlKGRhdGEsIHRoaXMuX2NvbnRleHQpO1xuICAgIH1cbiAgICBlbHNlIGlmKEZpbGUuaXNTY3JpcHRDb25maWcoZGF0YSkpIHtcbiAgICAgICAgdGhpcy5fc291cmNlID0gbmV3IFNjcmlwdFNvdXJjZShkYXRhLCB0aGlzLl9jb250ZXh0KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGRldGVjdCBkYXRhIHR5cGU6ICcgKyBkYXRhKTtcbiAgICB9XG5cbiAgICB0aGlzLl9lZmZlY3Quc2V0U291cmNlKHRoaXMuX3NvdXJjZS5zb3VyY2VOb2RlKTtcblxuICAgIC8vIGlmKHR5cGVvZiB0aGlzLl9zb3VyY2Uub25FbmRlZCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vICAgICB0aGlzLl9zb3VyY2Uub25FbmRlZCh0aGlzLl9lbmRlZEhhbmRsZXIsIHRoaXMpO1xuICAgIC8vIH1cbiAgICBpZih0aGlzLl9zb3VyY2UuaGFzT3duUHJvcGVydHkoJ19lbmRlZENhbGxiYWNrJykpIHtcbiAgICAgICAgdGhpcy5fc291cmNlLl9lbmRlZENhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2VuZGVkJyk7XG4gICAgICAgIH0uYmluZCh0aGlzKTtcbiAgICB9XG5cbiAgICBpZih0aGlzLl9wbGF5V2hlblJlYWR5KSB7XG4gICAgICAgIHRoaXMuX3BsYXlXaGVuUmVhZHkoKTtcbiAgICB9XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTb3VuZC5wcm90b3R5cGUsIHtcbiAgICAnY29udGV4dCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0O1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnY3VycmVudFRpbWUnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmN1cnJlbnRUaW1lIDogMDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5zdG9wKCk7XG4gICAgICAgICAgICB0aGlzLnBsYXkoMCwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZGF0YSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9kYXRhO1xuICAgICAgICB9LFxuICAgICAgICBzZXQgOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgaWYoIXZhbHVlKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgdGhpcy5fZGF0YSA9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlU291cmNlKHRoaXMuX2RhdGEpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZHVyYXRpb24nOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLmR1cmF0aW9uIDogMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2VmZmVjdCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9lZmZlY3Q7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdlbmRlZCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuZW5kZWQgOiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2ZyZXF1ZW5jeSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UuZnJlcXVlbmN5IDogMDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgaWYodGhpcy5fc291cmNlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc291cmNlLmZyZXF1ZW5jeSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICAnZ2Fpbic6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9nYWluO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnaXNUb3VjaExvY2tlZCc6IHtcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5faXNUb3VjaExvY2tlZCA9IHZhbHVlO1xuICAgICAgICAgICAgaWYoIXZhbHVlICYmIHRoaXMuX3BsYXlXaGVuUmVhZHkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9wbGF5V2hlblJlYWR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdsb2FkZXInOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbG9hZGVyO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnbG9vcCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9sb29wID0gISF2YWx1ZTtcbiAgICAgICAgICAgIGlmKHRoaXMuX3NvdXJjZSkge1xuICAgICAgICAgICAgICB0aGlzLl9zb3VyY2UubG9vcCA9IHRoaXMuX2xvb3A7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwYXVzZWQnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlID8gdGhpcy5fc291cmNlLnBhdXNlZCA6IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncGxheWluZyc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2UgPyB0aGlzLl9zb3VyY2UucGxheWluZyA6IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncGxheWJhY2tSYXRlJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BsYXliYWNrUmF0ZTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fcGxheWJhY2tSYXRlID0gdmFsdWU7XG4gICAgICAgICAgICBpZih0aGlzLl9zb3VyY2UpIHtcbiAgICAgICAgICAgICAgdGhpcy5fc291cmNlLnBsYXliYWNrUmF0ZSA9IHRoaXMuX3BsYXliYWNrUmF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3Byb2dyZXNzJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZSA/IHRoaXMuX3NvdXJjZS5wcm9ncmVzcyA6IDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICd2b2x1bWUnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZih0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2dhaW4uZ2Fpbi52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYodGhpcy5fZGF0YSAmJiB0aGlzLl9kYXRhLnZvbHVtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2RhdGEudm9sdW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIGlmKGlzTmFOKHZhbHVlKSkgeyByZXR1cm47IH1cblxuICAgICAgICAgICAgdmFyIHBhcmFtID0gdGhpcy5fZ2Fpbi5nYWluO1xuXG4gICAgICAgICAgICBpZih0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWUgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgICAgICAgICAgICAgIHBhcmFtLmNhbmNlbFNjaGVkdWxlZFZhbHVlcyh0aW1lKTtcbiAgICAgICAgICAgICAgICBwYXJhbS52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHBhcmFtLnNldFZhbHVlQXRUaW1lKHZhbHVlLCB0aW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhcmFtLnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgaWYodGhpcy5fc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5fc291cmNlLmZhZGVUaW1lb3V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYodGhpcy5fZGF0YSAmJiB0aGlzLl9kYXRhLnZvbHVtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2RhdGEudm9sdW1lID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gU291bmQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIEJ1ZmZlclNvdXJjZShidWZmZXIsIGNvbnRleHQpIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fYnVmZmVyID0gYnVmZmVyOyAvLyBBcnJheUJ1ZmZlclxuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5fbG9vcCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5YmFja1JhdGUgPSAxO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDsgLy8gQnVmZmVyU291cmNlTm9kZVxuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5LCBvZmZzZXQpIHtcbiAgICBpZih0aGlzLl9wbGF5aW5nKSB7IHJldHVybjsgfVxuICAgIGlmKGRlbGF5ID09PSB1bmRlZmluZWQpIHsgZGVsYXkgPSAwOyB9XG4gICAgaWYoZGVsYXkgPiAwKSB7IGRlbGF5ID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSArIGRlbGF5OyB9XG5cbiAgICBpZihvZmZzZXQgPT09IHVuZGVmaW5lZCkgeyBvZmZzZXQgPSAwOyB9XG4gICAgaWYob2Zmc2V0ID4gMCkgeyB0aGlzLl9wYXVzZWRBdCA9IDA7IH1cbiAgICBpZih0aGlzLl9wYXVzZWRBdCA+IDApIHsgb2Zmc2V0ID0gdGhpcy5fcGF1c2VkQXQ7IH1cblxuICAgIC8vY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgWycxIG9mZnNldDonLCBvZmZzZXRdKTtcbiAgICB3aGlsZShvZmZzZXQgPiB0aGlzLmR1cmF0aW9uKSB7IG9mZnNldCA9IG9mZnNldCAlIHRoaXMuZHVyYXRpb247IH1cbiAgICAvL2NvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIFsnMiBvZmZzZXQ6Jywgb2Zmc2V0XSk7XG5cbiAgICB0aGlzLnNvdXJjZU5vZGUubG9vcCA9IHRoaXMuX2xvb3A7XG4gICAgdGhpcy5zb3VyY2VOb2RlLm9uZW5kZWQgPSB0aGlzLl9lbmRlZEhhbmRsZXIuYmluZCh0aGlzKTtcbiAgICB0aGlzLnNvdXJjZU5vZGUuc3RhcnQoZGVsYXksIG9mZnNldCk7XG4gICAgdGhpcy5zb3VyY2VOb2RlLnBsYXliYWNrUmF0ZS52YWx1ZSA9IHRoaXMuX3BsYXliYWNrUmF0ZTtcblxuICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9wYXVzZWRBdDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSBvZmZzZXQ7XG4gICAgfVxuXG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG59O1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gZWxhcHNlZDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cbkJ1ZmZlclNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgdGhpcy5fc291cmNlTm9kZS5vbmVuZGVkID0gbnVsbDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5zdG9wKDApO1xuICAgICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn07XG5cbi8qXG4gKiBFbmRlZCBoYW5kbGVyXG4gKi9cblxuLy8gQnVmZmVyU291cmNlLnByb3RvdHlwZS5vbkVuZGVkID0gZnVuY3Rpb24oZm4sIGNvbnRleHQpIHtcbi8vICAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gZm4gPyBmbi5iaW5kKGNvbnRleHQgfHwgdGhpcykgOiBudWxsO1xuLy8gfTtcblxuQnVmZmVyU291cmNlLnByb3RvdHlwZS5fZW5kZWRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fZW5kZWQgPSB0cnVlO1xuICAgIGlmKHR5cGVvZiB0aGlzLl9lbmRlZENhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sodGhpcyk7XG4gICAgfVxufTtcblxuLypcbiAqIERlc3Ryb3lcbiAqL1xuXG5CdWZmZXJTb3VyY2UucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9idWZmZXIgPSBudWxsO1xuICAgIHRoaXMuX2NvbnRleHQgPSBudWxsO1xuICAgIHRoaXMuX2VuZGVkQ2FsbGJhY2sgPSBudWxsO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsO1xufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQnVmZmVyU291cmNlLnByb3RvdHlwZSwge1xuICAgICdjdXJyZW50VGltZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZEF0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYodGhpcy5fc3RhcnRlZEF0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWUgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICAgICAgICAgIGlmKHRpbWUgPiB0aGlzLmR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWUgPSB0aW1lICUgdGhpcy5kdXJhdGlvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRpbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2RhdGEnOiB7XG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2J1ZmZlciA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZHVyYXRpb24nOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fYnVmZmVyID8gdGhpcy5fYnVmZmVyLmR1cmF0aW9uIDogMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2VuZGVkJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnbG9vcCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9sb29wID0gISF2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BhdXNlZCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWQ7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwbGF5YmFja1JhdGUnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGxheWJhY2tSYXRlO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9wbGF5YmFja1JhdGUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLnBsYXliYWNrUmF0ZS52YWx1ZSA9IHRoaXMuX3BsYXliYWNrUmF0ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BsYXlpbmcnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGxheWluZztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3Byb2dyZXNzJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZHVyYXRpb24gPyB0aGlzLmN1cnJlbnRUaW1lIC8gdGhpcy5kdXJhdGlvbiA6IDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdzb3VyY2VOb2RlJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLmJ1ZmZlciA9IHRoaXMuX2J1ZmZlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQnVmZmVyU291cmNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBNZWRpYVNvdXJjZShlbCwgY29udGV4dCkge1xuICAgIHRoaXMuaWQgPSAnJztcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbCA9IGVsOyAvLyBIVE1MTWVkaWFFbGVtZW50XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9sb29wID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWJhY2tSYXRlID0gMTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7IC8vIE1lZGlhRWxlbWVudFNvdXJjZU5vZGVcbn1cblxuLypcbiAqIExvYWRcbiAqL1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uKHVybCkge1xuICAgIHRoaXMuX2VsLnNyYyA9IHVybDtcbiAgICB0aGlzLl9lbC5sb2FkKCk7XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG59O1xuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5LCBvZmZzZXQpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5fZGVsYXlUaW1lb3V0KTtcblxuICAgIHRoaXMucGxheWJhY2tSYXRlID0gdGhpcy5fcGxheWJhY2tSYXRlO1xuXG4gICAgaWYob2Zmc2V0KSB7XG4gICAgICAgIHRoaXMuX2VsLmN1cnJlbnRUaW1lID0gb2Zmc2V0O1xuICAgIH1cblxuICAgIGlmKGRlbGF5KSB7XG4gICAgICAgIHRoaXMuX2RlbGF5VGltZW91dCA9IHNldFRpbWVvdXQodGhpcy5wbGF5LmJpbmQodGhpcyksIGRlbGF5KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8vIHRoaXMuX2VsLmxvYWQoKTtcbiAgICAgICAgdGhpcy5fZWwucGxheSgpO1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG5cbiAgICB0aGlzLl9lbC5yZW1vdmVFdmVudExpc3RlbmVyKCdlbmRlZCcsIHRoaXMuX2VuZGVkSGFuZGxlckJvdW5kKTtcbiAgICB0aGlzLl9lbC5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsIHRoaXMuX2VuZGVkSGFuZGxlckJvdW5kLCBmYWxzZSk7XG5cbiAgICBpZih0aGlzLl9lbC5yZWFkeVN0YXRlIDwgNCkge1xuICAgICAgICB0aGlzLl9lbC5yZW1vdmVFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHRoaXMuX3JlYWR5SGFuZGxlckJvdW5kKTtcbiAgICAgICAgdGhpcy5fZWwuYWRkRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCB0aGlzLl9yZWFkeUhhbmRsZXJCb3VuZCwgZmFsc2UpO1xuICAgICAgICB0aGlzLl9lbC5sb2FkKCk7XG4gICAgICAgIHRoaXMuX2VsLnBsYXkoKTtcbiAgICB9XG59O1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5fZGVsYXlUaW1lb3V0KTtcblxuICAgIGlmKCF0aGlzLl9lbCkgeyByZXR1cm47IH1cblxuICAgIHRoaXMuX2VsLnBhdXNlKCk7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9kZWxheVRpbWVvdXQpO1xuXG4gICAgaWYoIXRoaXMuX2VsKSB7IHJldHVybjsgfVxuXG4gICAgdGhpcy5fZWwucGF1c2UoKTtcblxuICAgIHRyeSB7XG4gICAgICAgIHRoaXMuX2VsLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgLy8gZml4ZXMgYnVnIHdoZXJlIHNlcnZlciBkb2Vzbid0IHN1cHBvcnQgc2VlazpcbiAgICAgICAgaWYodGhpcy5fZWwuY3VycmVudFRpbWUgPiAwKSB7IHRoaXMuX2VsLmxvYWQoKTsgfVxuICAgIH0gY2F0Y2goZSkge31cblxuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbn07XG5cbi8qXG4gKiBGYWRlIGZvciBubyB3ZWJhdWRpb1xuICovXG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5mYWRlID0gZnVuY3Rpb24odm9sdW1lLCBkdXJhdGlvbikge1xuICAgIGlmKCF0aGlzLl9lbCkgeyByZXR1cm4gdGhpczsgfVxuICAgIGlmKHRoaXMuX2NvbnRleHQpIHsgcmV0dXJuIHRoaXM7IH1cblxuICAgIHZhciByYW1wID0gZnVuY3Rpb24odmFsdWUsIHN0ZXAsIHNlbGYpIHtcbiAgICAgICAgdmFyIGVsID0gc2VsZi5fZWw7XG4gICAgICAgIHNlbGYuZmFkZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZWwudm9sdW1lID0gZWwudm9sdW1lICsgKCB2YWx1ZSAtIGVsLnZvbHVtZSApICogMC4yO1xuICAgICAgICAgICAgaWYoTWF0aC5hYnMoZWwudm9sdW1lIC0gdmFsdWUpID4gMC4wNSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByYW1wKHZhbHVlLCBzdGVwLCBzZWxmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsLnZvbHVtZSA9IHZhbHVlO1xuICAgICAgICB9LCBzdGVwICogMTAwMCk7XG4gICAgfTtcblxuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5mYWRlVGltZW91dCk7XG4gICAgcmFtcCh2b2x1bWUsIGR1cmF0aW9uIC8gMTAsIHRoaXMpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKlxuICogRW5kZWQgaGFuZGxlclxuICovXG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5fZW5kZWRIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZW5kZWQgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcblxuICAgIGlmKHRoaXMuX2xvb3ApIHtcbiAgICAgICAgdGhpcy5fZWwuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICAvLyBmaXhlcyBidWcgd2hlcmUgc2VydmVyIGRvZXNuJ3Qgc3VwcG9ydCBzZWVrOlxuICAgICAgICBpZih0aGlzLl9lbC5jdXJyZW50VGltZSA+IDApIHsgdGhpcy5fZWwubG9hZCgpOyB9XG4gICAgICAgIHRoaXMucGxheSgpO1xuICAgIH0gZWxzZSBpZih0eXBlb2YgdGhpcy5fZW5kZWRDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aGlzLl9lbmRlZENhbGxiYWNrKHRoaXMpO1xuICAgIH1cbn07XG5cbk1lZGlhU291cmNlLnByb3RvdHlwZS5fcmVhZHlIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCB0aGlzLl9yZWFkeUhhbmRsZXJCb3VuZCk7XG4gICAgaWYodGhpcy5fcGxheWluZykge1xuICAgICAgICB0aGlzLl9lbC5wbGF5KCk7XG4gICAgfVxufTtcblxuLypcbiAqIERlc3Ryb3lcbiAqL1xuXG5NZWRpYVNvdXJjZS5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2VsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgdGhpcy5fZW5kZWRIYW5kbGVyQm91bmQpO1xuICAgIHRoaXMuX2VsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgdGhpcy5fcmVhZHlIYW5kbGVyQm91bmQpO1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX2VsID0gbnVsbDtcbiAgICB0aGlzLl9jb250ZXh0ID0gbnVsbDtcbiAgICB0aGlzLl9lbmRlZENhbGxiYWNrID0gbnVsbDtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbn07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKE1lZGlhU291cmNlLnByb3RvdHlwZSwge1xuICAgICdjdXJyZW50VGltZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9lbCA/IHRoaXMuX2VsLmN1cnJlbnRUaW1lIDogMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2RhdGEnOiB7XG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2VsID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdkdXJhdGlvbic6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9lbCA/IHRoaXMuX2VsLmR1cmF0aW9uIDogMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2VuZGVkJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2VuZGVkO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnbG9vcCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9sb29wO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9sb29wID0gISF2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BhdXNlZCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWQ7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwbGF5YmFja1JhdGUnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGxheWJhY2tSYXRlO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9wbGF5YmFja1JhdGUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGlmKHRoaXMuX2VsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWwucGxheWJhY2tSYXRlID0gdGhpcy5fcGxheWJhY2tSYXRlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICAncGxheWluZyc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncHJvZ3Jlc3MnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kdXJhdGlvbiA/IHRoaXMuY3VycmVudFRpbWUgLyB0aGlzLmR1cmF0aW9uIDogMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3NvdXJjZU5vZGUnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZighdGhpcy5fc291cmNlTm9kZSAmJiB0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlTWVkaWFFbGVtZW50U291cmNlKHRoaXMuX2VsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zb3VyY2VOb2RlO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWVkaWFTb3VyY2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1pY3JvcGhvbmVTb3VyY2Uoc3RyZWFtLCBjb250ZXh0KSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDsgLy8gTWljcm9waG9uZVNvdXJjZU5vZGVcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xuICAgIHRoaXMuX3N0cmVhbSA9IHN0cmVhbTtcbn1cblxuLypcbiAqIENvbnRyb2xzXG4gKi9cblxuTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5KSB7XG4gICAgaWYoZGVsYXkgPT09IHVuZGVmaW5lZCkgeyBkZWxheSA9IDA7IH1cbiAgICBpZihkZWxheSA+IDApIHsgZGVsYXkgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZGVsYXk7IH1cblxuICAgIHRoaXMuc291cmNlTm9kZS5zdGFydChkZWxheSk7XG5cbiAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fcGF1c2VkQXQ7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9zdGFydGVkQXQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgIH1cblxuICAgIHRoaXMuX2VuZGVkID0gZmFsc2U7XG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xufTtcblxuTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUucGF1c2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWxhcHNlZCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSBlbGFwc2VkO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSB0cnVlO1xufTtcblxuTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuc3RvcCgwKTtcbiAgICAgICAgfSBjYXRjaChlKSB7fVxuICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5fZW5kZWQgPSB0cnVlO1xuICAgIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gMDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc3RhcnRlZEF0ID0gMDtcbn07XG5cbi8qXG4gKiBEZXN0cm95XG4gKi9cblxuTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX2NvbnRleHQgPSBudWxsO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsO1xuICAgIHRoaXMuX3N0cmVhbSA9IG51bGw7XG4gICAgd2luZG93Lm1vekhhY2sgPSBudWxsO1xufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoTWljcm9waG9uZVNvdXJjZS5wcm90b3R5cGUsIHtcbiAgICAnY3VycmVudFRpbWUnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZih0aGlzLl9wYXVzZWRBdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWRBdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKHRoaXMuX3N0YXJ0ZWRBdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdkdXJhdGlvbic6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnZW5kZWQnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZW5kZWQ7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdmcmVxdWVuY3knOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZnJlcXVlbmN5O1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB0aGlzLl9mcmVxdWVuY3kgPSB2YWx1ZTtcbiAgICAgICAgICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlLmZyZXF1ZW5jeS52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICAncGF1c2VkJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BsYXlpbmcnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGxheWluZztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3Byb2dyZXNzJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdzb3VyY2VOb2RlJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYoIXRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZSh0aGlzLl9zdHJlYW0pO1xuICAgICAgICAgICAgICAgIC8vIEhBQ0s6IHN0b3BzIG1veiBnYXJiYWdlIGNvbGxlY3Rpb24ga2lsbGluZyB0aGUgc3RyZWFtXG4gICAgICAgICAgICAgICAgLy8gc2VlIGh0dHBzOi8vc3VwcG9ydC5tb3ppbGxhLm9yZy9lbi1VUy9xdWVzdGlvbnMvOTg0MTc5XG4gICAgICAgICAgICAgICAgaWYobmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubW96SGFjayA9IHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaWNyb3Bob25lU291cmNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBPc2NpbGxhdG9yU291cmNlKHR5cGUsIGNvbnRleHQpIHtcbiAgICB0aGlzLmlkID0gJyc7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsOyAvLyBPc2NpbGxhdG9yU291cmNlTm9kZVxuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG4gICAgdGhpcy5fdHlwZSA9IHR5cGU7XG4gICAgdGhpcy5fZnJlcXVlbmN5ID0gMjAwO1xufVxuXG4vKlxuICogQ29udHJvbHNcbiAqL1xuXG5Pc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oZGVsYXkpIHtcbiAgICBpZihkZWxheSA9PT0gdW5kZWZpbmVkKSB7IGRlbGF5ID0gMDsgfVxuICAgIGlmKGRlbGF5ID4gMCkgeyBkZWxheSA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgKyBkZWxheTsgfVxuXG4gICAgdGhpcy5zb3VyY2VOb2RlLnN0YXJ0KGRlbGF5KTtcblxuICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9wYXVzZWRBdDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWU7XG4gICAgfVxuXG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wbGF5aW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG59O1xuXG5Pc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBlbGFwc2VkID0gdGhpcy5fY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMuX3N0YXJ0ZWRBdDtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IGVsYXBzZWQ7XG4gICAgdGhpcy5fcGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5Pc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5zdG9wKDApO1xuICAgICAgICB9IGNhdGNoKGUpIHt9XG4gICAgICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufTtcblxuLypcbiAqIERlc3Ryb3lcbiAqL1xuXG5Pc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5fY29udGV4dCA9IG51bGw7XG4gICAgdGhpcy5fc291cmNlTm9kZSA9IG51bGw7XG59O1xuXG4vKlxuICogR2V0dGVycyAmIFNldHRlcnNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhPc2NpbGxhdG9yU291cmNlLnByb3RvdHlwZSwge1xuICAgICdjdXJyZW50VGltZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZEF0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYodGhpcy5fc3RhcnRlZEF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2R1cmF0aW9uJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdlbmRlZCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9lbmRlZDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2ZyZXF1ZW5jeSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9mcmVxdWVuY3k7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX2ZyZXF1ZW5jeSA9IHZhbHVlO1xuICAgICAgICAgICAgaWYodGhpcy5fc291cmNlTm9kZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUuZnJlcXVlbmN5LnZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwYXVzZWQnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcGF1c2VkO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncGxheWluZyc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wbGF5aW5nO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncHJvZ3Jlc3MnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3NvdXJjZU5vZGUnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZighdGhpcy5fc291cmNlTm9kZSAmJiB0aGlzLl9jb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZSA9IHRoaXMuX2NvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NvdXJjZU5vZGUudHlwZSA9IHRoaXMuX3R5cGU7XG4gICAgICAgICAgICAgICAgdGhpcy5fc291cmNlTm9kZS5mcmVxdWVuY3kudmFsdWUgPSB0aGlzLl9mcmVxdWVuY3k7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc291cmNlTm9kZTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9zY2lsbGF0b3JTb3VyY2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFNjcmlwdFNvdXJjZShkYXRhLCBjb250ZXh0KSB7XG4gICAgdGhpcy5pZCA9ICcnO1xuICAgIHRoaXMuX2J1ZmZlclNpemUgPSBkYXRhLmJ1ZmZlclNpemUgfHwgMTAyNDtcbiAgICB0aGlzLl9jaGFubmVscyA9IGRhdGEuY2hhbm5lbHMgfHwgMTtcbiAgICB0aGlzLl9jb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLl9lbmRlZCA9IGZhbHNlO1xuICAgIHRoaXMuX29uUHJvY2VzcyA9IGRhdGEuY2FsbGJhY2suYmluZChkYXRhLnRoaXNBcmcgfHwgdGhpcyk7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zb3VyY2VOb2RlID0gbnVsbDsgLy8gU2NyaXB0U291cmNlTm9kZVxuICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IDA7XG59XG5cbi8qXG4gKiBDb250cm9sc1xuICovXG5cblNjcmlwdFNvdXJjZS5wcm90b3R5cGUucGxheSA9IGZ1bmN0aW9uKGRlbGF5KSB7XG4gICAgaWYoZGVsYXkgPT09IHVuZGVmaW5lZCkgeyBkZWxheSA9IDA7IH1cbiAgICBpZihkZWxheSA+IDApIHsgZGVsYXkgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZGVsYXk7IH1cblxuICAgIHRoaXMuc291cmNlTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IHRoaXMuX29uUHJvY2VzcztcblxuICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9wYXVzZWRBdDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0ZWRBdCA9IHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWU7XG4gICAgfVxuXG4gICAgdGhpcy5fZW5kZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9wYXVzZWRBdCA9IDA7XG4gICAgdGhpcy5fcGxheWluZyA9IHRydWU7XG59O1xuXG5TY3JpcHRTb3VyY2UucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsYXBzZWQgPSB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5fc3RhcnRlZEF0O1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuX3BhdXNlZEF0ID0gZWxhcHNlZDtcbiAgICB0aGlzLl9wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkID0gdHJ1ZTtcbn07XG5cblNjcmlwdFNvdXJjZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmKHRoaXMuX3NvdXJjZU5vZGUpIHtcbiAgICAgICAgdGhpcy5fc291cmNlTm9kZS5vbmF1ZGlvcHJvY2VzcyA9IHRoaXMuX29uUGF1c2VkO1xuICAgIH1cbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgdGhpcy5fcGF1c2VkID0gZmFsc2U7XG4gICAgdGhpcy5fcGF1c2VkQXQgPSAwO1xuICAgIHRoaXMuX3BsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zdGFydGVkQXQgPSAwO1xufTtcblxuU2NyaXB0U291cmNlLnByb3RvdHlwZS5fb25QYXVzZWQgPSBmdW5jdGlvbihldmVudCkge1xuICAgIHZhciBidWZmZXIgPSBldmVudC5vdXRwdXRCdWZmZXI7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBidWZmZXIubnVtYmVyT2ZDaGFubmVsczsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIgY2hhbm5lbCA9IGJ1ZmZlci5nZXRDaGFubmVsRGF0YShpKTtcbiAgICAgICAgZm9yICh2YXIgaiA9IDAsIGxlbiA9IGNoYW5uZWwubGVuZ3RoOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgICAgICAgIGNoYW5uZWxbal0gPSAwO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLypcbiAqIERlc3Ryb3lcbiAqL1xuXG5TY3JpcHRTb3VyY2UucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLl9jb250ZXh0ID0gbnVsbDtcbiAgICB0aGlzLl9vblByb2Nlc3MgPSBudWxsO1xuICAgIHRoaXMuX3NvdXJjZU5vZGUgPSBudWxsO1xufTtcblxuLypcbiAqIEdldHRlcnMgJiBTZXR0ZXJzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoU2NyaXB0U291cmNlLnByb3RvdHlwZSwge1xuICAgICdjdXJyZW50VGltZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmKHRoaXMuX3BhdXNlZEF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BhdXNlZEF0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYodGhpcy5fc3RhcnRlZEF0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLl9zdGFydGVkQXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2R1cmF0aW9uJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdlbmRlZCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9lbmRlZDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BhdXNlZCc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wYXVzZWQ7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwbGF5aW5nJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3BsYXlpbmc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwcm9ncmVzcyc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnc291cmNlTm9kZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmKCF0aGlzLl9zb3VyY2VOb2RlICYmIHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zb3VyY2VOb2RlID0gdGhpcy5fY29udGV4dC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IodGhpcy5fYnVmZmVyU2l6ZSwgMCwgdGhpcy5fY2hhbm5lbHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NvdXJjZU5vZGU7XG4gICAgICAgIH1cbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBTY3JpcHRTb3VyY2U7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBCcm93c2VyID0ge307XG5cbkJyb3dzZXIuaGFuZGxlUGFnZVZpc2liaWxpdHkgPSBmdW5jdGlvbihvbkhpZGRlbiwgb25TaG93biwgdGhpc0FyZykge1xuICAgIHZhciBoaWRkZW4sXG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2U7XG5cbiAgICBpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ2hpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAndmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tb3pIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhpZGRlbiA9ICdtb3pIaWRkZW4nO1xuICAgICAgICB2aXNpYmlsaXR5Q2hhbmdlID0gJ21venZpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQubXNIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGhpZGRlbiA9ICdtc0hpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnbXN2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50LndlYmtpdEhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaGlkZGVuID0gJ3dlYmtpdEhpZGRlbic7XG4gICAgICAgIHZpc2liaWxpdHlDaGFuZ2UgPSAnd2Via2l0dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25DaGFuZ2UoKSB7XG4gICAgICAgIGlmIChkb2N1bWVudFtoaWRkZW5dKSB7XG4gICAgICAgICAgICBvbkhpZGRlbi5jYWxsKHRoaXNBcmcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb25TaG93bi5jYWxsKHRoaXNBcmcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYodmlzaWJpbGl0eUNoYW5nZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIodmlzaWJpbGl0eUNoYW5nZSwgb25DaGFuZ2UsIGZhbHNlKTtcbiAgICB9XG59O1xuXG5Ccm93c2VyLmhhbmRsZVRvdWNoTG9jayA9IGZ1bmN0aW9uKG9uVW5sb2NrLCB0aGlzQXJnKSB7XG4gICAgdmFyIHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudCxcbiAgICAgICAgbG9ja2VkID0gISF1YS5tYXRjaCgvQW5kcm9pZHx3ZWJPU3xpUGhvbmV8aVBhZHxpUG9kfEJsYWNrQmVycnl8SUVNb2JpbGV8T3BlcmEgTWluaXxXaW5kb3dzIFBob25lfFN5bWJpYW5PUy9pKTtcblxuXG4gICAgdmFyIHVubG9jayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB1bmxvY2spO1xuXG4gICAgICAgIGlmKHRoaXMuX2NvbnRleHQpIHtcbiAgICAgICAgICAgIHZhciBidWZmZXIgPSB0aGlzLl9jb250ZXh0LmNyZWF0ZUJ1ZmZlcigxLCAxLCAyMjA1MCk7XG4gICAgICAgICAgICB2YXIgdW5sb2NrU291cmNlID0gdGhpcy5fY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICAgICAgICAgIHVubG9ja1NvdXJjZS5idWZmZXIgPSBidWZmZXI7XG4gICAgICAgICAgICB1bmxvY2tTb3VyY2UuY29ubmVjdCh0aGlzLl9jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIHVubG9ja1NvdXJjZS5zdGFydCgwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9uVW5sb2NrLmNhbGwodGhpc0FyZyk7XG5cbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICBpZihsb2NrZWQpIHtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgdW5sb2NrLCBmYWxzZSk7XG4gICAgfVxuICAgIHJldHVybiBsb2NrZWQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJyb3dzZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbmZ1bmN0aW9uIEVtaXR0ZXIoKSB7fVxuXG5FbWl0dGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyLnByb3RvdHlwZSk7XG5FbWl0dGVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEVtaXR0ZXI7XG5cbkVtaXR0ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgaWYgKGxpc3RlbmVyKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKHR5cGUpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRmlsZSA9IHtcbiAgICBleHRlbnNpb25zOiBbXSxcbiAgICBjYW5QbGF5OiB7fVxufTtcblxuLypcbiAqIEluaXRpYWwgdGVzdHNcbiAqL1xuXG52YXIgdGVzdHMgPSBbXG4gICAgeyBleHQ6ICdvZ2cnLCB0eXBlOiAnYXVkaW8vb2dnOyBjb2RlY3M9XCJ2b3JiaXNcIicgfSxcbiAgICB7IGV4dDogJ21wMycsIHR5cGU6ICdhdWRpby9tcGVnOycgfSxcbiAgICB7IGV4dDogJ29wdXMnLCB0eXBlOiAnYXVkaW8vb2dnOyBjb2RlY3M9XCJvcHVzXCInIH0sXG4gICAgeyBleHQ6ICd3YXYnLCB0eXBlOiAnYXVkaW8vd2F2OyBjb2RlY3M9XCIxXCInIH0sXG4gICAgeyBleHQ6ICdtNGEnLCB0eXBlOiAnYXVkaW8veC1tNGE7JyB9LFxuICAgIHsgZXh0OiAnbTRhJywgdHlwZTogJ2F1ZGlvL2FhYzsnIH1cbl07XG5cbnZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F1ZGlvJyk7XG5pZihlbCkge1xuICAgIHRlc3RzLmZvckVhY2goZnVuY3Rpb24odGVzdCkge1xuICAgICAgICB2YXIgY2FuUGxheVR5cGUgPSAhIWVsLmNhblBsYXlUeXBlKHRlc3QudHlwZSk7XG4gICAgICAgIGlmKGNhblBsYXlUeXBlKSB7XG4gICAgICAgICAgICBGaWxlLmV4dGVuc2lvbnMucHVzaCh0ZXN0LmV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgRmlsZS5jYW5QbGF5W3Rlc3QuZXh0XSA9IGNhblBsYXlUeXBlO1xuICAgIH0pO1xufVxuXG4vKlxuICogZmluZCBhIHN1cHBvcnRlZCBmaWxlXG4gKi9cblxuRmlsZS5nZXRGaWxlRXh0ZW5zaW9uID0gZnVuY3Rpb24odXJsKSB7XG4gICAgLy8gZnJvbSBEYXRhVVJMXG4gICAgaWYodXJsLnN1YnN0cigwLCA1KSA9PT0gJ2RhdGE6Jykge1xuICAgICAgICB2YXIgbWF0Y2ggPSB1cmwubWF0Y2goL2RhdGE6YXVkaW9cXC8ob2dnfG1wM3xvcHVzfHdhdnxtNGEpL2kpO1xuICAgICAgICBpZihtYXRjaCAmJiBtYXRjaC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hbMV0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBmcm9tIFN0YW5kYXJkIFVSTFxuICAgIHVybCA9IHVybC5zcGxpdCgnPycpWzBdO1xuICAgIHVybCA9IHVybC5zdWJzdHIodXJsLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcblxuICAgIHZhciBhID0gdXJsLnNwbGl0KCcuJyk7XG4gICAgaWYoYS5sZW5ndGggPT09IDEgfHwgKGFbMF0gPT09ICcnICYmIGEubGVuZ3RoID09PSAyKSkge1xuICAgICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHJldHVybiBhLnBvcCgpLnRvTG93ZXJDYXNlKCk7XG59O1xuXG5GaWxlLmdldFN1cHBvcnRlZEZpbGUgPSBmdW5jdGlvbihmaWxlTmFtZXMpIHtcbiAgICB2YXIgbmFtZTtcblxuICAgIGlmKEFycmF5LmlzQXJyYXkoZmlsZU5hbWVzKSkge1xuICAgICAgICAvLyBpZiBhcnJheSBnZXQgdGhlIGZpcnN0IG9uZSB0aGF0IHdvcmtzXG4gICAgICAgIGZpbGVOYW1lcy5zb21lKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgIG5hbWUgPSBpdGVtO1xuICAgICAgICAgICAgdmFyIGV4dCA9IHRoaXMuZ2V0RmlsZUV4dGVuc2lvbihpdGVtKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmV4dGVuc2lvbnMuaW5kZXhPZihleHQpID4gLTE7XG4gICAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgICBlbHNlIGlmKHR5cGVvZiBmaWxlTmFtZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIC8vIGlmIG5vdCBhcnJheSBhbmQgaXMgb2JqZWN0XG4gICAgICAgIE9iamVjdC5rZXlzKGZpbGVOYW1lcykuc29tZShmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIG5hbWUgPSBmaWxlTmFtZXNba2V5XTtcbiAgICAgICAgICAgIHZhciBleHQgPSB0aGlzLmdldEZpbGVFeHRlbnNpb24obmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5leHRlbnNpb25zLmluZGV4T2YoZXh0KSA+IC0xO1xuICAgICAgICB9LCB0aGlzKTtcbiAgICB9XG4gICAgLy8gaWYgc3RyaW5nIGp1c3QgcmV0dXJuXG4gICAgcmV0dXJuIG5hbWUgfHwgZmlsZU5hbWVzO1xufTtcblxuLypcbiAqIGluZmVyIGZpbGUgdHlwZXNcbiAqL1xuXG5GaWxlLmlzQXVkaW9CdWZmZXIgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgcmV0dXJuICEhKGRhdGEgJiZcbiAgICAgICAgICAgICAgd2luZG93LkF1ZGlvQnVmZmVyICYmXG4gICAgICAgICAgICAgIGRhdGEgaW5zdGFuY2VvZiB3aW5kb3cuQXVkaW9CdWZmZXIpO1xufTtcblxuRmlsZS5pc01lZGlhRWxlbWVudCA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICByZXR1cm4gISEoZGF0YSAmJlxuICAgICAgICAgICAgICB3aW5kb3cuSFRNTE1lZGlhRWxlbWVudCAmJlxuICAgICAgICAgICAgICBkYXRhIGluc3RhbmNlb2Ygd2luZG93LkhUTUxNZWRpYUVsZW1lbnQpO1xufTtcblxuRmlsZS5pc01lZGlhU3RyZWFtID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHJldHVybiAhIShkYXRhICYmXG4gICAgICAgICAgICAgIHR5cGVvZiBkYXRhLmdldEF1ZGlvVHJhY2tzID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgICAgICAgIGRhdGEuZ2V0QXVkaW9UcmFja3MoKS5sZW5ndGggJiZcbiAgICAgICAgICAgICAgd2luZG93Lk1lZGlhU3RyZWFtVHJhY2sgJiZcbiAgICAgICAgICAgICAgZGF0YS5nZXRBdWRpb1RyYWNrcygpWzBdIGluc3RhbmNlb2Ygd2luZG93Lk1lZGlhU3RyZWFtVHJhY2spO1xufTtcblxuRmlsZS5pc09zY2lsbGF0b3JUeXBlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHJldHVybiAhIShkYXRhICYmIHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAgICAgIChkYXRhID09PSAnc2luZScgfHwgZGF0YSA9PT0gJ3NxdWFyZScgfHxcbiAgICAgICAgICAgICAgZGF0YSA9PT0gJ3Nhd3Rvb3RoJyB8fCBkYXRhID09PSAndHJpYW5nbGUnKSk7XG59O1xuXG5GaWxlLmlzU2NyaXB0Q29uZmlnID0gZnVuY3Rpb24oZGF0YSkge1xuICAgIHJldHVybiAhIShkYXRhICYmIHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJlxuICAgICAgICAgICAgICBkYXRhLmJ1ZmZlclNpemUgJiYgZGF0YS5jaGFubmVscyAmJiBkYXRhLmNhbGxiYWNrKTtcbn07XG5cbkZpbGUuaXNVUkwgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgcmV0dXJuICEhKGRhdGEgJiYgdHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnICYmXG4gICAgICAgICAgICAgKGRhdGEuaW5kZXhPZignLicpID4gLTEgfHwgZGF0YS5zdWJzdHIoMCwgNSkgPT09ICdkYXRhOicpKTtcbn07XG5cbkZpbGUuY29udGFpbnNVUkwgPSBmdW5jdGlvbihjb25maWcpIHtcbiAgICBpZighY29uZmlnKSB7IHJldHVybiBmYWxzZTsgfVxuICAgIC8vIHN0cmluZywgYXJyYXkgb3Igb2JqZWN0IHdpdGggdXJsIHByb3BlcnR5IHRoYXQgaXMgc3RyaW5nIG9yIGFycmF5XG4gICAgdmFyIHVybCA9IGNvbmZpZy51cmwgfHwgY29uZmlnO1xuICAgIHJldHVybiB0aGlzLmlzVVJMKHVybCkgfHwgKEFycmF5LmlzQXJyYXkodXJsKSAmJiB0aGlzLmlzVVJMKHVybFswXSkpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJy4vZW1pdHRlci5qcycpO1xuXG5mdW5jdGlvbiBMb2FkZXIodXJsKSB7XG4gICAgdmFyIGVtaXR0ZXIgPSBuZXcgRW1pdHRlcigpLFxuICAgICAgICBwcm9ncmVzcyA9IDAsXG4gICAgICAgIGF1ZGlvQ29udGV4dCxcbiAgICAgICAgaXNUb3VjaExvY2tlZCxcbiAgICAgICAgcmVxdWVzdCxcbiAgICAgICAgdGltZW91dCxcbiAgICAgICAgZGF0YTtcblxuICAgIHZhciBzdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZihhdWRpb0NvbnRleHQpIHtcbiAgICAgICAgICAgIGxvYWRBcnJheUJ1ZmZlcigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbG9hZEF1ZGlvRWxlbWVudCgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBkaXNwYXRjaCA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICBlbWl0dGVyLmVtaXQoJ3Byb2dyZXNzJywgMSk7XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgnbG9hZGVkJywgYnVmZmVyKTtcbiAgICAgICAgZW1pdHRlci5lbWl0KCdjb21wbGV0ZScsIGJ1ZmZlcik7XG4gICAgfTtcblxuICAgIHZhciBsb2FkQXJyYXlCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICByZXF1ZXN0Lm9wZW4oJ0dFVCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICAgICAgcmVxdWVzdC5vbnByb2dyZXNzID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC5sZW5ndGhDb21wdXRhYmxlKSB7XG4gICAgICAgICAgICAgICAgcHJvZ3Jlc3MgPSBldmVudC5sb2FkZWQgLyBldmVudC50b3RhbDtcbiAgICAgICAgICAgICAgICAvLyBvblByb2dyZXNzLmRpc3BhdGNoKHByb2dyZXNzKTtcbiAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3Byb2dyZXNzJywgcHJvZ3Jlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgYXVkaW9Db250ZXh0LmRlY29kZUF1ZGlvRGF0YShcbiAgICAgICAgICAgICAgICByZXF1ZXN0LnJlc3BvbnNlLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gYnVmZmVyO1xuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3MgPSAxO1xuICAgICAgICAgICAgICAgICAgICBkaXNwYXRjaChidWZmZXIpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ2Vycm9yJywgZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgLy8gb25FcnJvci5kaXNwYXRjaChlKTtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnZXJyb3InLCBlKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVxdWVzdC5zZW5kKCk7XG4gICAgfTtcblxuICAgIHZhciBsb2FkQXVkaW9FbGVtZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKCFkYXRhIHx8ICFkYXRhLnRhZ05hbWUpIHtcbiAgICAgICAgICAgIGRhdGEgPSBuZXcgQXVkaW8oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKCFpc1RvdWNoTG9ja2VkKSB7XG4gICAgICAgICAgICAvLyB0aW1lb3V0IGJlY2F1c2Ugc29tZXRpbWVzIGNhbnBsYXl0aHJvdWdoIGRvZXNuJ3QgZmlyZVxuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgIHRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dChyZWFkeUhhbmRsZXIsIDIwMDApO1xuICAgICAgICAgICAgZGF0YS5hZGRFdmVudExpc3RlbmVyKCdjYW5wbGF5dGhyb3VnaCcsIHJlYWR5SGFuZGxlciwgZmFsc2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgZGF0YS5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGVycm9ySGFuZGxlciwgZmFsc2UpO1xuICAgICAgICBkYXRhLnByZWxvYWQgPSAnYXV0byc7XG4gICAgICAgIGRhdGEuc3JjID0gdXJsO1xuICAgICAgICBkYXRhLmxvYWQoKTtcblxuICAgICAgICBpZiAoaXNUb3VjaExvY2tlZCkge1xuICAgICAgICAgICAgZGlzcGF0Y2goZGF0YSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGVycm9ySGFuZGxlciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgZW1pdHRlci5lbWl0KCdlcnJvcicsIGUpO1xuICAgIH07XG5cbiAgICB2YXIgcmVhZHlIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIGlmKCFkYXRhKSB7IHJldHVybjsgfVxuICAgICAgICBkYXRhLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2NhbnBsYXl0aHJvdWdoJywgcmVhZHlIYW5kbGVyKTtcbiAgICAgICAgcHJvZ3Jlc3MgPSAxO1xuICAgICAgICBkaXNwYXRjaChkYXRhKTtcbiAgICB9O1xuXG4gICAgdmFyIGNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZihyZXF1ZXN0ICYmIHJlcXVlc3QucmVhZHlTdGF0ZSAhPT0gNCkge1xuICAgICAgICAgIHJlcXVlc3QuYWJvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICBpZihkYXRhICYmIHR5cGVvZiBkYXRhLnJlbW92ZUV2ZW50TGlzdGVuZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGRhdGEucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2FucGxheXRocm91Z2gnLCByZWFkeUhhbmRsZXIpO1xuICAgICAgICB9XG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZW91dCk7XG5cbiAgICAgICAgZW1pdHRlci5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3Byb2dyZXNzJyk7XG4gICAgICAgIGVtaXR0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCdjb21wbGV0ZScpO1xuICAgICAgICBlbWl0dGVyLnJlbW92ZUFsbExpc3RlbmVycygnbG9hZGVkJyk7XG4gICAgICAgIGVtaXR0ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCdlcnJvcicpO1xuICAgIH07XG5cbiAgICB2YXIgZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBjYW5jZWwoKTtcbiAgICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgICAgIGRhdGEgPSBudWxsO1xuICAgICAgICBhdWRpb0NvbnRleHQgPSBudWxsO1xuICAgIH07XG5cbiAgICB2YXIgbG9hZCA9IGZ1bmN0aW9uKG5ld1VybCkge1xuICAgICAgICB1cmwgPSBuZXdVcmw7XG4gICAgICAgIHN0YXJ0KCk7XG4gICAgfTtcblxuICAgIHZhciBhcGkgPSB7XG4gICAgICAgIG9uOiBlbWl0dGVyLm9uLmJpbmQoZW1pdHRlciksXG4gICAgICAgIG9uY2U6IGVtaXR0ZXIub25jZS5iaW5kKGVtaXR0ZXIpLFxuICAgICAgICBvZmY6IGVtaXR0ZXIub2ZmLmJpbmQoZW1pdHRlciksXG4gICAgICAgIGxvYWQ6IGxvYWQsXG4gICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgY2FuY2VsOiBjYW5jZWwsXG4gICAgICAgIGRlc3Ryb3k6IGRlc3Ryb3lcbiAgICB9O1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoYXBpLCB7XG4gICAgICAgICdkYXRhJzoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgJ3Byb2dyZXNzJzoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZ3Jlc3M7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICdhdWRpb0NvbnRleHQnOiB7XG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYXVkaW9Db250ZXh0ID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICdpc1RvdWNoTG9ja2VkJzoge1xuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlzVG91Y2hMb2NrZWQgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoYXBpKTtcbn1cblxuTG9hZGVyLkdyb3VwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVtaXR0ZXIgPSBuZXcgRW1pdHRlcigpLFxuICAgICAgICBxdWV1ZSA9IFtdLFxuICAgICAgICBudW1Mb2FkZWQgPSAwLFxuICAgICAgICBudW1Ub3RhbCA9IDA7XG5cbiAgICB2YXIgYWRkID0gZnVuY3Rpb24obG9hZGVyKSB7XG4gICAgICAgIHF1ZXVlLnB1c2gobG9hZGVyKTtcbiAgICAgICAgbnVtVG90YWwrKztcbiAgICAgICAgcmV0dXJuIGxvYWRlcjtcbiAgICB9O1xuXG4gICAgdmFyIHN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIG51bVRvdGFsID0gcXVldWUubGVuZ3RoO1xuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIHZhciBuZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmKHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdjb21wbGV0ZScpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxvYWRlciA9IHF1ZXVlLnBvcCgpO1xuICAgICAgICBsb2FkZXIub24oJ3Byb2dyZXNzJywgcHJvZ3Jlc3NIYW5kbGVyKTtcbiAgICAgICAgbG9hZGVyLm9uKCdsb2FkZWQnLCBjb21wbGV0ZUhhbmRsZXIpO1xuICAgICAgICBsb2FkZXIub24oJ2Vycm9yJywgZXJyb3JIYW5kbGVyKTtcbiAgICAgICAgbG9hZGVyLnN0YXJ0KCk7XG4gICAgfTtcblxuICAgIHZhciBwcm9ncmVzc0hhbmRsZXIgPSBmdW5jdGlvbihwcm9ncmVzcykge1xuICAgICAgICB2YXIgbG9hZGVkID0gbnVtTG9hZGVkICsgcHJvZ3Jlc3M7XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgncHJvZ3Jlc3MnLCBsb2FkZWQgLyBudW1Ub3RhbCk7XG4gICAgfTtcblxuICAgIHZhciBjb21wbGV0ZUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgbnVtTG9hZGVkKys7XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgncHJvZ3Jlc3MnLCBudW1Mb2FkZWQgLyBudW1Ub3RhbCk7XG4gICAgICAgIG5leHQoKTtcbiAgICB9O1xuXG4gICAgdmFyIGVycm9ySGFuZGxlciA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZW1pdHRlci5lbWl0KCdlcnJvcicsIGUpO1xuICAgICAgICBuZXh0KCk7XG4gICAgfTtcblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICAgICAgb246IGVtaXR0ZXIub24uYmluZChlbWl0dGVyKSxcbiAgICAgICAgb25jZTogZW1pdHRlci5vbmNlLmJpbmQoZW1pdHRlciksXG4gICAgICAgIG9mZjogZW1pdHRlci5vZmYuYmluZChlbWl0dGVyKSxcbiAgICAgICAgYWRkOiBhZGQsXG4gICAgICAgIHN0YXJ0OiBzdGFydFxuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMb2FkZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIE1pY3JvcGhvbmUoY29ubmVjdGVkLCBkZW5pZWQsIGVycm9yLCB0aGlzQXJnKSB7XG4gICAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYV8gPSAobmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhIHx8IG5hdmlnYXRvci5tb3pHZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLm1zR2V0VXNlck1lZGlhKTtcbiAgICB0aGlzLl9pc1N1cHBvcnRlZCA9ICEhbmF2aWdhdG9yLmdldFVzZXJNZWRpYV87XG4gICAgdGhpcy5fc3RyZWFtID0gbnVsbDtcblxuICAgIHRoaXMuX29uQ29ubmVjdGVkID0gY29ubmVjdGVkLmJpbmQodGhpc0FyZyB8fCB0aGlzKTtcbiAgICB0aGlzLl9vbkRlbmllZCA9IGRlbmllZCA/IGRlbmllZC5iaW5kKHRoaXNBcmcgfHwgdGhpcykgOiBmdW5jdGlvbigpIHt9O1xuICAgIHRoaXMuX29uRXJyb3IgPSBlcnJvciA/IGVycm9yLmJpbmQodGhpc0FyZyB8fCB0aGlzKSA6IGZ1bmN0aW9uKCkge307XG59XG5cbk1pY3JvcGhvbmUucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgICBpZighdGhpcy5faXNTdXBwb3J0ZWQpIHsgcmV0dXJuOyB9XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWFfKHthdWRpbzp0cnVlfSwgZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICAgIHNlbGYuX3N0cmVhbSA9IHN0cmVhbTtcbiAgICAgICAgc2VsZi5fb25Db25uZWN0ZWQoc3RyZWFtKTtcbiAgICB9LCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmKGUubmFtZSA9PT0gJ1Blcm1pc3Npb25EZW5pZWRFcnJvcicgfHwgZSA9PT0gJ1BFUk1JU1NJT05fREVOSUVEJykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1Blcm1pc3Npb24gZGVuaWVkLiBZb3UgY2FuIHVuZG8gdGhpcyBieSBjbGlja2luZyB0aGUgY2FtZXJhIGljb24gd2l0aCB0aGUgcmVkIGNyb3NzIGluIHRoZSBhZGRyZXNzIGJhcicpO1xuICAgICAgICAgICAgc2VsZi5fb25EZW5pZWQoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNlbGYuX29uRXJyb3IoZS5tZXNzYWdlIHx8IGUpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5NaWNyb3Bob25lLnByb3RvdHlwZS5kaXNjb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYodGhpcy5fc3RyZWFtKSB7XG4gICAgICAgIHRoaXMuX3N0cmVhbS5zdG9wKCk7XG4gICAgICAgIHRoaXMuX3N0cmVhbSA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoTWljcm9waG9uZS5wcm90b3R5cGUsIHtcbiAgICAnc3RyZWFtJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3N0cmVhbTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2lzU3VwcG9ydGVkJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lzU3VwcG9ydGVkO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWljcm9waG9uZTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEdyb3VwID0gcmVxdWlyZSgnLi4vZ3JvdXAuanMnKTtcblxuZnVuY3Rpb24gU291bmRHcm91cChjb250ZXh0LCBkZXN0aW5hdGlvbikge1xuICAgIEdyb3VwLmNhbGwodGhpcywgY29udGV4dCwgZGVzdGluYXRpb24pO1xuICAgIHRoaXMuX3NyYyA9IG51bGw7XG59XG5cblNvdW5kR3JvdXAucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShHcm91cC5wcm90b3R5cGUpO1xuU291bmRHcm91cC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBTb3VuZEdyb3VwO1xuXG4vKlxuICogQWRkIC8gcmVtb3ZlXG4gKi9cblxuU291bmRHcm91cC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oc291bmQpIHtcbiAgICBHcm91cC5wcm90b3R5cGUuYWRkLmNhbGwodGhpcywgc291bmQpO1xuICAgIHRoaXMuX2dldFNvdXJjZSgpO1xufTtcblxuU291bmRHcm91cC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oc291bmRPcklkKSB7XG4gICAgR3JvdXAucHJvdG90eXBlLnJlbW92ZS5jYWxsKHRoaXMsIHNvdW5kT3JJZCk7XG4gICAgdGhpcy5fZ2V0U291cmNlKCk7XG59O1xuXG5Tb3VuZEdyb3VwLnByb3RvdHlwZS5fZ2V0U291cmNlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYoIXRoaXMuX3NvdW5kcy5sZW5ndGgpIHsgcmV0dXJuOyB9XG5cbiAgICB0aGlzLl9zb3VuZHMuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIHJldHVybiBiLmR1cmF0aW9uIC0gYS5kdXJhdGlvbjtcbiAgICB9KTtcblxuICAgIHRoaXMuX3NyYyA9IHRoaXMuX3NvdW5kc1swXTtcbn07XG5cbi8qXG4gKiBUT0RPOiBFbmRlZCBoYW5kbGVyXG4gKi9cblxuLy8gU291bmRHcm91cC5wcm90b3R5cGUub25FbmRlZCA9IGZ1bmN0aW9uKGZuLCBjb250ZXh0KSB7XG4vLyAgICAgdGhpcy5fZW5kZWRDYWxsYmFjayA9IGZuID8gZm4uYmluZChjb250ZXh0IHx8IHRoaXMpIDogbnVsbDtcbi8vICAgICByZXR1cm4gdGhpcztcbi8vIH07XG5cbi8vIFNvdW5kR3JvdXAucHJvdG90eXBlLl9lbmRlZEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbi8vICAgICBpZih0eXBlb2YgdGhpcy5fZW5kZWRDYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuLy8gICAgICAgICB0aGlzLl9lbmRlZENhbGxiYWNrKHRoaXMpO1xuLy8gICAgIH1cbi8vIH07XG5cbi8qXG4gKiBHZXR0ZXJzICYgU2V0dGVyc1xuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFNvdW5kR3JvdXAucHJvdG90eXBlLCB7XG4gICAgJ2N1cnJlbnRUaW1lJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NyYyA/IHRoaXMuX3NyYy5jdXJyZW50VGltZSA6IDA7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcCgpO1xuICAgICAgICAgICAgdGhpcy5wbGF5KDAsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2R1cmF0aW9uJzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3NyYyA/IHRoaXMuX3NyYy5kdXJhdGlvbiA6IDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8vICdlbmRlZCc6IHtcbiAgICAvLyAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAvLyAgICAgICAgIHJldHVybiB0aGlzLl9zcmMgPyB0aGlzLl9zcmMuZW5kZWQgOiBmYWxzZTtcbiAgICAvLyAgICAgfVxuICAgIC8vIH0sXG4gICAgJ2xvb3AnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbG9vcDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5fbG9vcCA9ICEhdmFsdWU7XG4gICAgICAgICAgICB0aGlzLl9zb3VuZHMuZm9yRWFjaChmdW5jdGlvbihzb3VuZCkge1xuICAgICAgICAgICAgICAgIHNvdW5kLmxvb3AgPSB0aGlzLl9sb29wO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdwYXVzZWQnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3JjID8gdGhpcy5fc3JjLnBhdXNlZCA6IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAncHJvZ3Jlc3MnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3JjID8gdGhpcy5fc3JjLnByb2dyZXNzIDogMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BsYXliYWNrUmF0ZSc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wbGF5YmFja1JhdGU7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHRoaXMuX3BsYXliYWNrUmF0ZSA9IHZhbHVlO1xuICAgICAgICAgICAgdGhpcy5fc291bmRzLmZvckVhY2goZnVuY3Rpb24oc291bmQpIHtcbiAgICAgICAgICAgICAgICBzb3VuZC5wbGF5YmFja1JhdGUgPSB0aGlzLl9wbGF5YmFja1JhdGU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BsYXlpbmcnOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3JjID8gdGhpcy5fc3JjLnBsYXlpbmcgOiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNvdW5kR3JvdXA7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBNaWNyb3Bob25lID0gcmVxdWlyZSgnLi9taWNyb3Bob25lLmpzJyksXG4gICAgV2F2ZWZvcm0gPSByZXF1aXJlKCcuL3dhdmVmb3JtLmpzJyk7XG5cbnZhciBVdGlscyA9IHt9O1xuXG4vKlxuICogYXVkaW8gY29udGV4dFxuICovXG5cblV0aWxzLnNldENvbnRleHQgPSBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG59O1xuXG4vKlxuICogYXVkaW8gYnVmZmVyXG4gKi9cblxuVXRpbHMuY2xvbmVCdWZmZXIgPSBmdW5jdGlvbihidWZmZXIpIHtcbiAgICBpZighdGhpcy5fY29udGV4dCkgeyByZXR1cm4gYnVmZmVyOyB9XG5cbiAgICB2YXIgbnVtQ2hhbm5lbHMgPSBidWZmZXIubnVtYmVyT2ZDaGFubmVscyxcbiAgICAgICAgY2xvbmVkID0gdGhpcy5fY29udGV4dC5jcmVhdGVCdWZmZXIobnVtQ2hhbm5lbHMsIGJ1ZmZlci5sZW5ndGgsIGJ1ZmZlci5zYW1wbGVSYXRlKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUNoYW5uZWxzOyBpKyspIHtcbiAgICAgICAgY2xvbmVkLmdldENoYW5uZWxEYXRhKGkpLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSkpO1xuICAgIH1cbiAgICByZXR1cm4gY2xvbmVkO1xufTtcblxuVXRpbHMucmV2ZXJzZUJ1ZmZlciA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgIHZhciBudW1DaGFubmVscyA9IGJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtQ2hhbm5lbHM7IGkrKykge1xuICAgICAgICBBcnJheS5wcm90b3R5cGUucmV2ZXJzZS5jYWxsKGJ1ZmZlci5nZXRDaGFubmVsRGF0YShpKSk7XG4gICAgfVxuICAgIHJldHVybiBidWZmZXI7XG59O1xuXG4vKlxuICogcmFtcCBhdWRpbyBwYXJhbVxuICovXG5cblV0aWxzLnJhbXAgPSBmdW5jdGlvbihwYXJhbSwgZnJvbVZhbHVlLCB0b1ZhbHVlLCBkdXJhdGlvbikge1xuICAgIGlmKCF0aGlzLl9jb250ZXh0KSB7IHJldHVybjsgfVxuXG4gICAgcGFyYW0uc2V0VmFsdWVBdFRpbWUoZnJvbVZhbHVlLCB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lKTtcbiAgICBwYXJhbS5saW5lYXJSYW1wVG9WYWx1ZUF0VGltZSh0b1ZhbHVlLCB0aGlzLl9jb250ZXh0LmN1cnJlbnRUaW1lICsgZHVyYXRpb24pO1xufTtcblxuLypcbiAqIGdldCBmcmVxdWVuY3kgZnJvbSBtaW4gdG8gbWF4IGJ5IHBhc3NpbmcgMCB0byAxXG4gKi9cblxuVXRpbHMuZ2V0RnJlcXVlbmN5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZighdGhpcy5fY29udGV4dCkgeyByZXR1cm4gMDsgfVxuICAgIC8vIGdldCBmcmVxdWVuY3kgYnkgcGFzc2luZyBudW1iZXIgZnJvbSAwIHRvIDFcbiAgICAvLyBDbGFtcCB0aGUgZnJlcXVlbmN5IGJldHdlZW4gdGhlIG1pbmltdW0gdmFsdWUgKDQwIEh6KSBhbmQgaGFsZiBvZiB0aGVcbiAgICAvLyBzYW1wbGluZyByYXRlLlxuICAgIHZhciBtaW5WYWx1ZSA9IDQwO1xuICAgIHZhciBtYXhWYWx1ZSA9IHRoaXMuX2NvbnRleHQuc2FtcGxlUmF0ZSAvIDI7XG4gICAgLy8gTG9nYXJpdGhtIChiYXNlIDIpIHRvIGNvbXB1dGUgaG93IG1hbnkgb2N0YXZlcyBmYWxsIGluIHRoZSByYW5nZS5cbiAgICB2YXIgbnVtYmVyT2ZPY3RhdmVzID0gTWF0aC5sb2cobWF4VmFsdWUgLyBtaW5WYWx1ZSkgLyBNYXRoLkxOMjtcbiAgICAvLyBDb21wdXRlIGEgbXVsdGlwbGllciBmcm9tIDAgdG8gMSBiYXNlZCBvbiBhbiBleHBvbmVudGlhbCBzY2FsZS5cbiAgICB2YXIgbXVsdGlwbGllciA9IE1hdGgucG93KDIsIG51bWJlck9mT2N0YXZlcyAqICh2YWx1ZSAtIDEuMCkpO1xuICAgIC8vIEdldCBiYWNrIHRvIHRoZSBmcmVxdWVuY3kgdmFsdWUgYmV0d2VlbiBtaW4gYW5kIG1heC5cbiAgICByZXR1cm4gbWF4VmFsdWUgKiBtdWx0aXBsaWVyO1xufTtcblxuLypcbiAqIG1pY3JvcGhvbmUgdXRpbFxuICovXG5cblV0aWxzLm1pY3JvcGhvbmUgPSBmdW5jdGlvbihjb25uZWN0ZWQsIGRlbmllZCwgZXJyb3IsIHRoaXNBcmcpIHtcbiAgICByZXR1cm4gbmV3IE1pY3JvcGhvbmUoY29ubmVjdGVkLCBkZW5pZWQsIGVycm9yLCB0aGlzQXJnKTtcbn07XG5cbi8qXG4gKiBGb3JtYXQgc2Vjb25kcyBhcyB0aW1lY29kZSBzdHJpbmdcbiAqL1xuXG5VdGlscy50aW1lQ29kZSA9IGZ1bmN0aW9uKHNlY29uZHMsIGRlbGltKSB7XG4gICAgaWYoZGVsaW0gPT09IHVuZGVmaW5lZCkgeyBkZWxpbSA9ICc6JzsgfVxuICAgIHZhciBoID0gTWF0aC5mbG9vcihzZWNvbmRzIC8gMzYwMCk7XG4gICAgdmFyIG0gPSBNYXRoLmZsb29yKChzZWNvbmRzICUgMzYwMCkgLyA2MCk7XG4gICAgdmFyIHMgPSBNYXRoLmZsb29yKChzZWNvbmRzICUgMzYwMCkgJSA2MCk7XG4gICAgdmFyIGhyID0gKGggPT09IDAgPyAnJyA6IChoIDwgMTAgPyAnMCcgKyBoICsgZGVsaW0gOiBoICsgZGVsaW0pKTtcbiAgICB2YXIgbW4gPSAobSA8IDEwID8gJzAnICsgbSA6IG0pICsgZGVsaW07XG4gICAgdmFyIHNjID0gKHMgPCAxMCA/ICcwJyArIHMgOiBzKTtcbiAgICByZXR1cm4gaHIgKyBtbiArIHNjO1xufTtcblxuLypcbiAqIHdhdmVmb3JtXG4gKi9cblxuVXRpbHMud2F2ZWZvcm0gPSBmdW5jdGlvbihidWZmZXIsIGxlbmd0aCkge1xuICAgIHJldHVybiBuZXcgV2F2ZWZvcm0oYnVmZmVyLCBsZW5ndGgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVdGlscztcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gV2F2ZWZvcm0oKSB7XG5cbiAgICB2YXIgYXVkaW9CdWZmZXIsXG4gICAgICAgIHdhdmVmb3JtRGF0YTtcblxuICAgIHZhciBjb21wdXRlID0gZnVuY3Rpb24oYnVmZmVyLCBsZW5ndGgpIHtcbiAgICAgICAgaWYoIXdpbmRvdy5GbG9hdDMyQXJyYXkgfHwgIXdpbmRvdy5BdWRpb0J1ZmZlcikgeyByZXR1cm4gW107IH1cblxuICAgICAgICB2YXIgc2FtZUJ1ZmZlciA9IGJ1ZmZlciA9PT0gYXVkaW9CdWZmZXI7XG4gICAgICAgIHZhciBzYW1lTGVuZ3RoID0gd2F2ZWZvcm1EYXRhICYmIHdhdmVmb3JtRGF0YS5sZW5ndGggPT09IGxlbmd0aDtcbiAgICAgICAgaWYoc2FtZUJ1ZmZlciAmJiBzYW1lTGVuZ3RoKSB7IHJldHVybiB3YXZlZm9ybURhdGE7IH1cbiAgICAgICAgXG4gICAgICAgIC8vY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tLS0nKTtcbiAgICAgICAgLy9jb25zb2xlLnRpbWUoJ3dhdmVmb3JtRGF0YScpO1xuICAgICAgICB2YXIgd2F2ZWZvcm0gPSBuZXcgRmxvYXQzMkFycmF5KGxlbmd0aCksXG4gICAgICAgICAgICBjaHVuayA9IE1hdGguZmxvb3IoYnVmZmVyLmxlbmd0aCAvIGxlbmd0aCksXG4gICAgICAgICAgICAvL2NodW5rID0gYnVmZmVyLmxlbmd0aCAvIGxlbmd0aCxcbiAgICAgICAgICAgIHJlc29sdXRpb24gPSA1LCAvLyAxMFxuICAgICAgICAgICAgaW5jciA9IE1hdGguZmxvb3IoY2h1bmsgLyByZXNvbHV0aW9uKSxcbiAgICAgICAgICAgIGdyZWF0ZXN0ID0gMDtcblxuICAgICAgICBpZihpbmNyIDwgMSkgeyBpbmNyID0gMTsgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBjaG5scyA9IGJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzOyBpIDwgY2hubHM7IGkrKykge1xuICAgICAgICAgICAgLy8gY2hlY2sgZWFjaCBjaGFubmVsXG4gICAgICAgICAgICB2YXIgY2hhbm5lbCA9IGJ1ZmZlci5nZXRDaGFubmVsRGF0YShpKTtcbiAgICAgICAgICAgIC8vZm9yICh2YXIgaiA9IGxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgLy8gZ2V0IGhpZ2hlc3QgdmFsdWUgd2l0aGluIHRoZSBjaHVua1xuICAgICAgICAgICAgICAgIC8vdmFyIGNoID0gaiAqIGNodW5rO1xuICAgICAgICAgICAgICAgIC8vZm9yICh2YXIgayA9IGNoICsgY2h1bmsgLSAxOyBrID49IGNoOyBrIC09IGluY3IpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrID0gaiAqIGNodW5rLCBsID0gayArIGNodW5rOyBrIDwgbDsgayArPSBpbmNyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNlbGVjdCBoaWdoZXN0IHZhbHVlIGZyb20gY2hhbm5lbHNcbiAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSBjaGFubmVsW2tdO1xuICAgICAgICAgICAgICAgICAgICBpZihhIDwgMCkgeyBhID0gLWE7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGEgPiB3YXZlZm9ybVtqXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2F2ZWZvcm1bal0gPSBhO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBoaWdoZXN0IG92ZXJhbGwgZm9yIHNjYWxpbmdcbiAgICAgICAgICAgICAgICAgICAgaWYoYSA+IGdyZWF0ZXN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBncmVhdGVzdCA9IGE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gc2NhbGUgdXA/XG4gICAgICAgIHZhciBzY2FsZSA9IDEgLyBncmVhdGVzdCxcbiAgICAgICAgICAgIGxlbiA9IHdhdmVmb3JtLmxlbmd0aDtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB3YXZlZm9ybVtpXSAqPSBzY2FsZTtcbiAgICAgICAgfVxuICAgICAgICAvL2NvbnNvbGUudGltZUVuZCgnd2F2ZWZvcm1EYXRhJyk7XG5cbiAgICAgICAgLy8gY2FjaGUgZm9yIHJlcGVhdGVkIGNhbGxzXG4gICAgICAgIGF1ZGlvQnVmZmVyID0gYnVmZmVyO1xuICAgICAgICB3YXZlZm9ybURhdGEgPSB3YXZlZm9ybTtcblxuICAgICAgICByZXR1cm4gd2F2ZWZvcm07XG4gICAgfTtcblxuICAgIHZhciBkcmF3ID0gZnVuY3Rpb24oY29uZmlnKSB7XG4gICAgICAgIHZhciB4LCB5O1xuICAgICAgICB2YXIgY2FudmFzID0gY29uZmlnLmNhbnZhcyB8fCBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgdmFyIHdpZHRoID0gY29uZmlnLndpZHRoIHx8IGNhbnZhcy53aWR0aDtcbiAgICAgICAgdmFyIGhlaWdodCA9IGNvbmZpZy5oZWlnaHQgfHwgY2FudmFzLmhlaWdodDtcbiAgICAgICAgdmFyIGNvbG9yID0gY29uZmlnLmNvbG9yIHx8ICcjMzMzMzMzJztcbiAgICAgICAgdmFyIGJnQ29sb3IgPSBjb25maWcuYmdDb2xvciB8fCAnI2RkZGRkZCc7XG4gICAgICAgIHZhciBidWZmZXIgPSBjb25maWcuc291bmQgPyBjb25maWcuc291bmQuZGF0YSA6IGNvbmZpZy5idWZmZXIgfHwgYXVkaW9CdWZmZXI7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5jb21wdXRlKGJ1ZmZlciwgd2lkdGgpO1xuXG4gICAgICAgIHZhciBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBjb2xvcjtcbiAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBiZ0NvbG9yO1xuICAgICAgICBjb250ZXh0LmZpbGxSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHggPSBpICsgMC41O1xuICAgICAgICAgICAgeSA9IGhlaWdodCAtIE1hdGgucm91bmQoaGVpZ2h0ICogZGF0YVtpXSk7XG4gICAgICAgICAgICBjb250ZXh0Lm1vdmVUbyh4LCB5KTtcbiAgICAgICAgICAgIGNvbnRleHQubGluZVRvKHgsIGhlaWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dC5zdHJva2UoKTtcblxuICAgICAgICByZXR1cm4gY2FudmFzO1xuICAgIH07XG4gICAgXG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoe1xuICAgICAgICBjb21wdXRlOiBjb21wdXRlLFxuICAgICAgICBkcmF3OiBkcmF3XG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2F2ZWZvcm07XG4iXX0=
