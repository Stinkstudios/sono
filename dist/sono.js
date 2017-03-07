(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.sono = factory());
}(this, (function () { 'use strict';

function FakeContext() {

    var startTime = Date.now();

    function fn() {}

    function param() {
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
    }

    function fakeNode() {
        return {
            connect: fn,
            disconnect: fn,
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
            type: 0,
            frequency: param(),
            Q: param(),
            detune: param(),
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
            getChannelData: function getChannelData() {
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
    }

    // ie9
    if (!window.Uint8Array) {
        window.Uint8Array = window.Float32Array = Array;
    }

    return {
        isFake: true,
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
        destination: fakeNode,
        listener: fakeNode(),
        state: '',
        get currentTime() {
            return (Date.now() - startTime) / 1000;
        }
    };
}

function getContext() {
    var desiredSampleRate = 44100;

    var Ctx = window.AudioContext || window.webkitAudioContext || FakeContext;

    var ctx = new Ctx();

    // Check if hack is necessary. Only occurs in iOS6+ devices
    // and only when you first boot the iPhone, or play a audio/video
    // with a different sample rate
    // https://github.com/Jam3/ios-safe-audio-context/blob/master/index.js
    if (/(iPhone|iPad)/i.test(navigator.userAgent) && ctx.sampleRate !== desiredSampleRate) {
        var buffer = ctx.createBuffer(1, 1, desiredSampleRate);
        var dummy = ctx.createBufferSource();
        dummy.buffer = buffer;
        dummy.connect(ctx.destination);
        dummy.start(0);
        dummy.disconnect();

        ctx.close(); // dispose old context
        ctx = new Ctx();
    }

    // Handles bug in Safari 9 OSX where AudioContext instance starts in 'suspended' state

    var isSuspended = ctx.state === 'suspended';

    if (isSuspended && typeof ctx.resume === 'function') {
        window.setTimeout(function () {
            ctx.resume();
        }, 1000);
    }

    return ctx;
}

var context = getContext();

var browser = {};

browser.handlePageVisibility = function (onHidden, onShown) {
    var hidden = void 0,
        visibilityChange = void 0;

    if (typeof document.hidden !== 'undefined') {
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

    function onChange() {
        if (document[hidden]) {
            onHidden();
        } else {
            onShown();
        }
    }

    if (typeof visibilityChange !== 'undefined') {
        document.addEventListener(visibilityChange, onChange, false);
    }
};

browser.handleTouchLock = function (context, onUnlock) {
    var ua = navigator.userAgent,
        locked = !!ua.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|SymbianOS/i);

    function unlock() {
        if (context && context.state === 'suspended') {
            context.resume().then(function () {
                var buffer = context.createBuffer(1, 1, 44100);
                var source = context.createBufferSource();
                source.buffer = buffer;
                source.connect(context.destination);
                source.start(0);
                source.stop(0);
                source.disconnect();

                document.body.removeEventListener('touchend', unlock);
                onUnlock();
            });
        } else {
            document.body.removeEventListener('touchend', unlock);
            onUnlock();
        }
    }

    if (locked) {
        document.body.addEventListener('touchend', unlock, false);
    }

    return locked;
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
};





var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var defineEnumerableProperties = function (obj, descs) {
  for (var key in descs) {
    var desc = descs[key];
    desc.configurable = desc.enumerable = true;
    if ("value" in desc) desc.writable = true;
    Object.defineProperty(obj, key, desc);
  }

  return obj;
};





var get$1 = function get$1(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get$1(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};







var objectDestructuringEmpty = function (obj) {
  if (obj == null) throw new TypeError("Cannot destructure undefined");
};



var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};



var set$1 = function set$1(object, property, value, receiver) {
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent !== null) {
      set$1(parent, property, value, receiver);
    }
  } else if ("value" in desc && desc.writable) {
    desc.value = value;
  } else {
    var setter = desc.set;

    if (setter !== undefined) {
      setter.call(receiver, value);
    }
  }

  return value;
};

var extensions = [];
var canPlay = {};

/*
 * Initial tests
 */

var tests = [{
    ext: 'ogg',
    type: 'audio/ogg; codecs="vorbis"'
}, {
    ext: 'mp3',
    type: 'audio/mpeg;'
}, {
    ext: 'opus',
    type: 'audio/ogg; codecs="opus"'
}, {
    ext: 'wav',
    type: 'audio/wav; codecs="1"'
}, {
    ext: 'm4a',
    type: 'audio/x-m4a;'
}, {
    ext: 'm4a',
    type: 'audio/aac;'
}];

var el = document.createElement('audio');
if (el) {
    tests.forEach(function (test) {
        var canPlayType = !!el.canPlayType(test.type);
        if (canPlayType && extensions.indexOf(test.ext) === -1) {
            extensions.push(test.ext);
        }
        canPlay[test.ext] = canPlayType;
    });
    el = null;
}

/*
 * find a supported file
 */

function getFileExtension(url) {
    if (typeof url !== 'string') {
        return '';
    }
    // from DataURL
    if (url.slice(0, 5) === 'data:') {
        var match = url.match(/data:audio\/(ogg|mp3|opus|wav|m4a)/i);
        if (match && match.length > 1) {
            return match[1].toLowerCase();
        }
    }
    // from Standard URL
    url = url.split('?')[0];
    url = url.slice(url.lastIndexOf('/') + 1);

    var a = url.split('.');
    if (a.length === 1 || a[0] === '' && a.length === 2) {
        return '';
    }
    return a.pop().toLowerCase();
}

function getSupportedFile(fileNames) {
    var name = void 0;

    if (Array.isArray(fileNames)) {
        // if array get the first one that works
        for (var i = 0; i < fileNames.length; i++) {
            name = fileNames[i];
            var ext = getFileExtension(name);
            if (extensions.indexOf(ext) > -1) {
                break;
            }
        }
    } else if ((typeof fileNames === 'undefined' ? 'undefined' : _typeof(fileNames)) === 'object') {
        // if not array and is object
        Object.keys(fileNames).some(function (key) {
            name = fileNames[key];
            var ext = getFileExtension(name);
            return extensions.indexOf(ext) > -1;
        });
    }
    // if string just return
    return name || fileNames;
}

/*
 * infer file types
 */

function isAudioBuffer(data) {
    return !!(data && window.AudioBuffer && data instanceof window.AudioBuffer);
}

function isArrayBuffer(data) {
    return !!(data && window.ArrayBuffer && data instanceof window.ArrayBuffer);
}

function isMediaElement(data) {
    return !!(data && window.HTMLMediaElement && data instanceof window.HTMLMediaElement);
}

function isMediaStream(data) {
    return !!(data && typeof data.getAudioTracks === 'function' && data.getAudioTracks().length && window.MediaStreamTrack && data.getAudioTracks()[0] instanceof window.MediaStreamTrack);
}

function isOscillatorType(data) {
    return !!(data && typeof data === 'string' && (data === 'sine' || data === 'square' || data === 'sawtooth' || data === 'triangle'));
}

function isScriptConfig(data) {
    return !!(data && (typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object' && data.bufferSize && data.channels && data.callback);
}

function isURL(data) {
    return !!(data && typeof data === 'string' && (data.indexOf('.') > -1 || data.slice(0, 5) === 'data:'));
}

function containsURL(config) {
    if (!config || isMediaElement(config)) {
        return false;
    }
    // string, array or object with src/url/data property that is string, array or arraybuffer
    var src = config.src || config.url || config.data || config;
    return isURL(src) || isArrayBuffer(src) || Array.isArray(src) && isURL(src[0]);
}

var file = {
    canPlay: canPlay,
    containsURL: containsURL,
    extensions: extensions,
    getFileExtension: getFileExtension,
    getSupportedFile: getSupportedFile,
    isAudioBuffer: isAudioBuffer,
    isMediaElement: isMediaElement,
    isMediaStream: isMediaStream,
    isOscillatorType: isOscillatorType,
    isScriptConfig: isScriptConfig,
    isURL: isURL
};

var Effects = function () {
    function Effects(context) {
        var _this = this;

        classCallCheck(this, Effects);

        this.context = context;
        this._destination = null;
        this._source = null;
        // this.panning = new Panner(this.context);

        this._nodes = [];
        this._nodes.has = function (node) {
            return _this.has(node);
        };
        this._nodes.add = function (node) {
            return _this.add(node);
        };
        this._nodes.remove = function (node) {
            return _this.remove(node);
        };
        this._nodes.toggle = function (node, force) {
            return _this.toggle(node, force);
        };
        this._nodes.removeAll = function () {
            return _this.removeAll();
        };

        Object.keys(Effects.prototype).forEach(function (key) {
            if (!_this._nodes.hasOwnProperty(key) && typeof Effects.prototype[key] === 'function') {
                // console.log('-->', key, this[key]);
                // this._nodes[key] = Effects.prototype[key].bind(this);
                // this._nodes[key] = (opts) => this[key](opts);
                _this._nodes[key] = _this[key].bind(_this);
            }
        });
    }

    Effects.prototype.setSource = function setSource(node) {
        this._source = node;
        this._updateConnections();
        return node;
    };

    Effects.prototype.setDestination = function setDestination(node) {
        this._connectToDestination(node);
        return node;
    };

    Effects.prototype.has = function has(node) {
        if (!node) {
            return false;
        }
        return this._nodes.indexOf(node) > -1;
    };

    Effects.prototype.add = function add(node) {
        if (!node) {
            return null;
        }
        if (this.has(node)) {
            return node;
        }
        if (Array.isArray(node)) {
            var n = void 0;
            for (var i = 0; i < node.length; i++) {
                n = this.add(node[i]);
            }
            return n;
        }
        this._nodes.push(node);
        this._updateConnections();
        return node;
    };

    Effects.prototype.remove = function remove(node) {
        if (!node) {
            return null;
        }
        if (!this.has(node)) {
            return node;
        }
        var l = this._nodes.length;
        for (var i = 0; i < l; i++) {
            if (node === this._nodes[i]) {
                this._nodes.splice(i, 1);
                break;
            }
        }
        node.disconnect();
        this._updateConnections();
        return node;
    };

    Effects.prototype.toggle = function toggle(node, force) {
        force = !!force;
        var hasNode = this.has(node);
        if (arguments.length > 1 && hasNode === force) {
            return this;
        }
        if (hasNode) {
            this.remove(node);
        } else {
            this.add(node);
        }
        return this;
    };

    Effects.prototype.removeAll = function removeAll() {
        while (this._nodes.length) {
            var node = this._nodes.pop();
            node.disconnect();
        }
        this._updateConnections();
        return this;
    };

    Effects.prototype.destroy = function destroy() {
        this.removeAll();
        this.context = null;
        this._destination = null;
        if (this._source) {
            this._source.disconnect();
        }
        this._source = null;
    };

    Effects.prototype._connect = function _connect(a, b) {
        a.disconnect();
        // console.log('> connect output', (a.name || a.constructor.name), 'to input', (b.name || b.constructor.name));
        a.connect(b._in || b);
    };

    Effects.prototype._connectToDestination = function _connectToDestination(node) {
        var lastNode = this._nodes[this._nodes.length - 1] || this._source;

        if (lastNode) {
            this._connect(lastNode, node);
        }

        this._destination = node;
    };

    Effects.prototype._updateConnections = function _updateConnections() {
        if (!this._source) {
            return;
        }

        // console.log('updateConnections');

        var node = void 0,
            prev = void 0;

        for (var i = 0; i < this._nodes.length; i++) {
            node = this._nodes[i];
            prev = i === 0 ? this._source : this._nodes[i - 1];
            this._connect(prev, node);
        }

        if (this._destination) {
            this._connectToDestination(this._destination);
        }
    };

    return Effects;
}();

function Group(context, destination) {
    var sounds = [];
    var effects = new Effects(context);
    var gain = context.createGain();
    var preMuteVolume = 1;
    var group = null;

    if (context) {
        effects.setSource(gain);
        effects.setDestination(destination || context.destination);
    }

    /*
     * Add / remove
     */

    function find(soundOrId, callback) {
        var found = void 0;

        if (!soundOrId && soundOrId !== 0) {
            return found;
        }

        sounds.some(function (sound) {
            if (sound === soundOrId || sound.id === soundOrId) {
                found = sound;
                return true;
            }
            return false;
        });

        if (found && callback) {
            return callback(found);
        }

        return found;
    }

    function remove(soundOrId) {
        find(soundOrId, function (sound) {
            return sounds.splice(sounds.indexOf(sound), 1);
        });
        return group;
    }

    function add(sound) {
        sound.gain.disconnect();
        sound.gain.connect(gain);

        sounds.push(sound);

        sound.once('destroy', remove);

        return group;
    }

    /*
     * Controls
     */

    function play(delay, offset) {
        sounds.forEach(function (sound) {
            return sound.play(delay, offset);
        });
        return group;
    }

    function pause() {
        sounds.forEach(function (sound) {
            if (sound.playing) {
                sound.pause();
            }
        });
        return group;
    }

    function resume() {
        sounds.forEach(function (sound) {
            if (sound.paused) {
                sound.play();
            }
        });
        return group;
    }

    function stop() {
        sounds.forEach(function (sound) {
            return sound.stop();
        });
        return group;
    }

    function seek(percent) {
        sounds.forEach(function (sound) {
            return sound.seek(percent);
        });
        return group;
    }

    function mute() {
        preMuteVolume = group.volume;
        group.volume = 0;
        return group;
    }

    function unMute() {
        group.volume = preMuteVolume || 1;
        return group;
    }

    function setVolume(value) {
        group.volume = value;
        return group;
    }

    function fade(volume, duration) {
        if (context) {
            var param = gain.gain;
            var time = context.currentTime;

            param.cancelScheduledValues(time);
            param.setValueAtTime(param.value, time);
            // param.setValueAtTime(volume, time + duration);
            param.linearRampToValueAtTime(volume, time + duration);
            // param.setTargetAtTime(volume, time, duration);
            // param.exponentialRampToValueAtTime(Math.max(volume, 0.0001), time + duration);
        } else {
            sounds.forEach(function (sound) {
                return sound.fade(volume, duration);
            });
        }

        return group;
    }

    /*
     * Load
     */

    function load() {
        sounds.forEach(function (sound) {
            return sound.load(null, true);
        });
    }

    /*
     * Unload
     */

    function unload() {
        sounds.forEach(function (sound) {
            return sound.unload();
        });
    }

    /*
     * Destroy
     */

    function destroy() {
        while (sounds.length) {
            sounds.pop().destroy();
        }
    }

    /*
     * Api
     */

    group = {
        add: add,
        find: find,
        remove: remove,
        play: play,
        pause: pause,
        resume: resume,
        stop: stop,
        seek: seek,
        setVolume: setVolume,
        mute: mute,
        unMute: unMute,
        fade: fade,
        load: load,
        unload: unload,
        destroy: destroy,
        gain: gain,
        get effects() {
            return effects._nodes;
        },
        set effects(value) {
            effects.removeAll().add(value);
        },
        get fx() {
            return this.effects;
        },
        set fx(value) {
            this.effects = value;
        },
        get sounds() {
            return sounds;
        },
        get volume() {
            return gain.gain.value;
        },
        set volume(value) {
            if (isNaN(value)) {
                return;
            }

            value = Math.min(Math.max(value, 0), 1);

            if (context) {
                gain.gain.cancelScheduledValues(context.currentTime);
                gain.gain.value = value;
                gain.gain.setValueAtTime(value, context.currentTime);
            } else {
                gain.gain.value = value;
            }
            sounds.forEach(function (sound) {
                if (!sound.context) {
                    sound.groupVolume = value;
                }
            });
        }
    };

    return group;
}

Group.Effects = Effects;

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

function EventEmitter$1() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
var events = EventEmitter$1;

// Backwards-compat with node 0.10.x
EventEmitter$1.EventEmitter = EventEmitter$1;

EventEmitter$1.prototype._events = undefined;
EventEmitter$1.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter$1.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter$1.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter$1.prototype.emit = function(type) {
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
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
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
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter$1.prototype.addListener = function(type, listener) {
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
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter$1.defaultMaxListeners;
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

EventEmitter$1.prototype.on = EventEmitter$1.prototype.addListener;

EventEmitter$1.prototype.once = function(type, listener) {
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
EventEmitter$1.prototype.removeListener = function(type, listener) {
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

EventEmitter$1.prototype.removeAllListeners = function(type) {
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
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter$1.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter$1.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter$1.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
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

var EventEmitter = events.EventEmitter;

var Emitter = function (_EventEmitter) {
    inherits(Emitter, _EventEmitter);

    function Emitter() {
        classCallCheck(this, Emitter);
        return possibleConstructorReturn(this, _EventEmitter.call(this));
    }

    Emitter.prototype.off = function off(type, listener) {
        if (listener) {
            return this.removeListener(type, listener);
        }
        if (type) {
            return this.removeAllListeners(type);
        }
        return this.removeAllListeners();
    };

    return Emitter;
}(EventEmitter);

function Loader(url, deferLoad) {
    var ERROR_STATE = ['', 'ABORTED', 'NETWORK', 'DECODE', 'SRC_NOT_SUPPORTED'];
    var emitter = new Emitter();
    var progress = 0,
        audioContext = void 0,
        isTouchLocked = void 0,
        request = void 0,
        timeout = void 0,
        data = void 0;

    // clean up

    function removeListeners() {
        emitter.off('error');
        emitter.off('progress');
        emitter.off('complete');
        emitter.off('loaded');

        if (data && typeof data.removeEventListener === 'function') {
            data.removeEventListener('canplaythrough', readyHandler);
            data.removeEventListener('error', errorHandler);
        }

        if (request) {
            request.removeEventListener('progress', progressHandler);
            request.removeEventListener('load', loadHandler);
            request.removeEventListener('error', errorHandler);
        }
    }

    function dispatchComplete(buffer) {
        emitter.emit('progress', 1);
        emitter.emit('loaded', buffer);
        emitter.emit('complete', buffer);

        removeListeners();
    }

    function progressHandler(event) {
        if (event.lengthComputable) {
            progress = event.loaded / event.total;
            emitter.emit('progress', progress);
        }
    }

    // error

    function errorHandler(event) {
        window.clearTimeout(timeout);

        var message = event;

        if (data && data.error) {
            message = 'Media Error: ' + ERROR_STATE[data.error.code] + ' ' + url;
        }

        if (request) {
            message = 'XHR Error: ' + request.status + ' ' + request.statusText + ' ' + url;
        }

        emitter.emit('error', message);

        removeListeners();
    }

    function decodeArrayBuffer(arraybuffer) {
        audioContext.decodeAudioData(arraybuffer, function (buffer) {
            data = buffer;
            request = null;
            progress = 1;
            dispatchComplete(buffer);
        }, errorHandler);
    }

    function loadHandler() {
        decodeArrayBuffer(request.response);
    }

    function readyHandler() {
        window.clearTimeout(timeout);
        if (!data) {
            return;
        }
        progress = 1;
        dispatchComplete(data);
    }

    function cancel() {
        removeListeners();

        if (request && request.readyState !== 4) {
            request.abort();
        }
        request = null;

        window.clearTimeout(timeout);
    }

    function destroy() {
        cancel();
        request = null;
        data = null;
        audioContext = null;
    }

    // audio buffer

    function loadArrayBuffer() {
        if (url instanceof window.ArrayBuffer) {
            decodeArrayBuffer(url);
            return;
        }
        request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.addEventListener('progress', progressHandler);
        request.addEventListener('load', loadHandler);
        request.addEventListener('error', errorHandler);
        request.send();
    }

    // audio element

    function loadAudioElement() {
        if (!data || !data.tagName) {
            data = document.createElement('audio');
        }

        if (!isTouchLocked) {
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
    }

    function start() {
        var force = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

        if (deferLoad && !force) {
            return;
        }
        if (audioContext) {
            loadArrayBuffer();
        } else {
            loadAudioElement();
        }
    }

    // reload

    function load(newUrl) {
        url = newUrl;
        start();
    }

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
            get: function get() {
                return data;
            }
        },
        progress: {
            get: function get() {
                return progress;
            }
        },
        audioContext: {
            set: function set(value) {
                audioContext = value;
            }
        },
        isTouchLocked: {
            set: function set(value) {
                isTouchLocked = value;
            }
        }
    });

    return Object.freeze(api);
}

Loader.Group = function () {
    var emitter = new Emitter();
    var queue = [];
    var numLoaded = 0,
        numTotal = 0,
        currentLoader = void 0;

    function progressHandler(progress) {
        var loaded = numLoaded + progress;
        emitter.emit('progress', loaded / numTotal);
    }

    function completeHandler() {
        numLoaded++;
        removeListeners();
        emitter.emit('progress', numLoaded / numTotal);
        next();
    }

    function errorHandler(e) {
        console.error(e);
        removeListeners();
        emitter.emit('error', e);
        next();
    }

    function next() {
        if (queue.length === 0) {
            currentLoader = null;
            emitter.emit('complete');
            return;
        }

        currentLoader = queue.pop();
        currentLoader.on('progress', progressHandler);
        currentLoader.once('loaded', completeHandler);
        currentLoader.once('error', errorHandler);
        currentLoader.start();
    }

    function removeListeners() {
        currentLoader.off('progress', progressHandler);
        currentLoader.off('loaded', completeHandler);
        currentLoader.off('error', errorHandler);
    }

    function add(loader) {
        queue.push(loader);
        numTotal++;
        return loader;
    }

    function start() {
        numTotal = queue.length;
        next();
    }

    return Object.freeze({
        on: emitter.on.bind(emitter),
        once: emitter.once.bind(emitter),
        off: emitter.off.bind(emitter),
        add: add,
        start: start
    });
};

function BufferSource(buffer, context, onEnded) {
    var api = {};
    var ended = false,
        endedCallback = onEnded,
        loop = false,
        paused = false,
        pausedAt = 0,
        playbackRate = 1,
        playing = false,
        sourceNode = null,
        startedAt = 0;

    function createSourceNode() {
        if (!sourceNode && context) {
            sourceNode = context.createBufferSource();
            sourceNode.buffer = buffer;
        }
        return sourceNode;
    }

    /*
     * Controls
     */

    function stop() {
        if (sourceNode) {
            sourceNode.onended = null;
            try {
                sourceNode.disconnect();
                sourceNode.stop(0);
            } catch (e) {}
            sourceNode = null;
        }

        paused = false;
        pausedAt = 0;
        playing = false;
        startedAt = 0;
    }

    function pause() {
        var elapsed = context.currentTime - startedAt;
        stop();
        pausedAt = elapsed;
        playing = false;
        paused = true;
    }

    function endedHandler() {
        stop();
        ended = true;
        if (typeof endedCallback === 'function') {
            endedCallback(api);
        }
    }

    function play(delay) {
        var offset = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

        if (playing) {
            return;
        }

        delay = delay ? context.currentTime + delay : 0;
        if (offset) {
            pausedAt = 0;
        }
        if (pausedAt) {
            offset = pausedAt;
        }
        while (offset > api.duration) {
            offset = offset % api.duration;
        }

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
    }

    /*
     * Destroy
     */

    function destroy() {
        stop();
        buffer = null;
        context = null;
        endedCallback = null;
        sourceNode = null;
    }

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
            get: function get() {
                if (pausedAt) {
                    return pausedAt;
                }
                if (startedAt) {
                    var time = context.currentTime - startedAt;
                    if (time > api.duration) {
                        time = time % api.duration;
                    }
                    return time;
                }
                return 0;
            }
        },
        duration: {
            get: function get() {
                return buffer ? buffer.duration : 0;
            }
        },
        ended: {
            get: function get() {
                return ended;
            }
        },
        loop: {
            get: function get() {
                return loop;
            },
            set: function set(value) {
                loop = !!value;
                if (sourceNode) {
                    sourceNode.loop = loop;
                }
            }
        },
        paused: {
            get: function get() {
                return paused;
            }
        },
        playbackRate: {
            get: function get() {
                return playbackRate;
            },
            set: function set(value) {
                playbackRate = value;
                if (sourceNode) {
                    sourceNode.playbackRate.value = playbackRate;
                }
            }
        },
        playing: {
            get: function get() {
                return playing;
            }
        },
        progress: {
            get: function get() {
                return api.duration ? api.currentTime / api.duration : 0;
            }
        },
        sourceNode: {
            get: function get() {
                return createSourceNode();
            }
        }
    });

    return Object.freeze(api);
}

var offlineCtx = void 0;
/*
In contrast with a standard AudioContext, an OfflineAudioContext doesn't render
the audio to the device hardware;
instead, it generates it, as fast as it can, and outputs the result to an AudioBuffer.
*/
function getOfflineContext(numOfChannels, length, sampleRate) {
    if (offlineCtx) {
        return offlineCtx;
    }
    numOfChannels = numOfChannels || 2;
    sampleRate = sampleRate || 44100;
    length = sampleRate || numOfChannels;

    var OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;

    offlineCtx = OfflineCtx ? new OfflineCtx(numOfChannels, length, sampleRate) : null;

    return offlineCtx;
}

/*
 * clone audio buffer
 */

function cloneBuffer(buffer) {
    if (!context) {
        return buffer;
    }

    var numChannels = buffer.numberOfChannels,
        cloned = context.createBuffer(numChannels, buffer.length, buffer.sampleRate);
    for (var i = 0; i < numChannels; i++) {
        cloned.getChannelData(i).set(buffer.getChannelData(i));
    }
    return cloned;
}

/*
 * reverse audio buffer
 */

function reverseBuffer(buffer) {
    var numChannels = buffer.numberOfChannels;
    for (var i = 0; i < numChannels; i++) {
        Array.prototype.reverse.call(buffer.getChannelData(i));
    }
    return buffer;
}

/*
 * ramp audio param
 */

function ramp(param, fromValue, toValue, duration, linear) {
    if (context.isFake) {
        return;
    }

    param.setValueAtTime(fromValue, context.currentTime);

    if (linear) {
        param.linearRampToValueAtTime(toValue, context.currentTime + duration);
    } else {
        param.exponentialRampToValueAtTime(toValue, context.currentTime + duration);
    }
}

/*
 * get frequency from min to max by passing 0 to 1
 */

function getFrequency(value) {
    if (context.isFake) {
        return 0;
    }
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
}

/*
 * Format seconds as timecode string
 */

function timeCode(seconds) {
    var delim = arguments.length <= 1 || arguments[1] === undefined ? ':' : arguments[1];

    // const h = Math.floor(seconds / 3600);
    // const m = Math.floor((seconds % 3600) / 60);
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 3600 % 60);
    // const hr = (h < 10 ? '0' + h + delim : h + delim);
    var mn = (m < 10 ? '0' + m : m) + delim;
    var sc = s < 10 ? '0' + s : s;
    // return hr + mn + sc;
    return mn + sc;
}

var utils = {
    getOfflineContext: getOfflineContext,
    cloneBuffer: cloneBuffer,
    reverseBuffer: reverseBuffer,
    ramp: ramp,
    getFrequency: getFrequency,
    timeCode: timeCode
};

function AudioSource(Type, data, context, onEnded) {
    var sourceNode = context ? context.createGain() : null;
    var api = {};
    var pool = [];
    var sources = [];
    var numCreated = 0;
    var multiPlay = false;

    function createSourceNode() {
        return sourceNode;
    }

    function disposeSource(src) {
        src.stop();
        if (multiPlay) {
            pool.push(src);
        }
    }

    function onSourceEnded(src) {
        if (sources.length > 1) {
            var index = sources.indexOf(src);
            sources.splice(index, 1);
        }
        disposeSource(src);
        onEnded();
    }

    function getSource() {
        if (!multiPlay && sources.length) {
            return sources[0];
        }
        if (pool.length > 0) {
            return pool.pop();
        } else {
            numCreated++;
            if (data.tagName) {
                return new Type(data.cloneNode(), context, onSourceEnded);
            }
            return new Type(data, context, onSourceEnded);
        }
    }

    function play() {
        var src = getSource();
        if (sourceNode) {
            src.sourceNode.connect(sourceNode);
        }
        if (src !== sources[0]) {
            sources.push(src);
        }
        src.play();
    }

    function stop() {
        while (sources.length > 1) {
            disposeSource(sources.pop());
        }
    }

    function pause() {
        sources.forEach(function (src) {
            return src.pause();
        });
    }

    function load(url) {
        stop();
        pool.length = 0;
        if (sources.length) {
            sources[0].load(url);
        }
    }

    function fade(volume, duration) {
        sources.forEach(function (src) {
            return src.fade(volume, duration);
        });
    }

    function destroy() {
        while (sources.length) {
            sources.pop().destroy();
        }
        while (pool.length) {
            pool.pop().destroy();
        }
        sourceNode.disconnect();
    }

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
            get: function get() {
                return sources[0] && sources[0].currentTime || 0;
            }
        },
        duration: {
            get: function get() {
                return sources[0] && sources[0].duration || 0;
            }
        },
        ended: {
            get: function get() {
                return sources.every(function (src) {
                    return src.ended;
                });
            }
        },
        multiPlay: {
            get: function get() {
                return multiPlay;
            },
            set: function set(value) {
                multiPlay = value;
            }
        },
        loop: {
            get: function get() {
                return sources[0] && sources[0].loop;
            },
            set: function set(value) {
                sources.forEach(function (src) {
                    return src.loop = !!value;
                });
            }
        },
        paused: {
            get: function get() {
                return sources[0] && sources[0].paused;
            }
        },
        playbackRate: {
            get: function get() {
                return sources[0] && sources[0].playbackRate;
            },
            set: function set(value) {
                sources.forEach(function (src) {
                    return src.playbackRate = value;
                });
            }
        },
        playing: {
            get: function get() {
                return sources[0] && sources[0].playing;
            }
        },
        info: {
            get: function get() {
                return {
                    pooled: pool.length,
                    active: sources.length,
                    created: numCreated
                };
            }
        },
        progress: {
            get: function get() {
                return sources[0] && sources[0].progress;
            }
        },
        sourceNode: {
            get: function get() {
                return createSourceNode();
            }
        },
        volume: {
            get: function get() {
                return sources[0] && sources[0].volume;
            },
            set: function set(value) {
                sources.forEach(function (src) {
                    return src.volume = value;
                });
            }
        },
        groupVolume: {
            get: function get() {
                return sources[0] && sources[0].groupVolume;
            },
            set: function set(value) {
                if (sources[0] && !sources[0].hasOwnProperty('groupVolume')) {
                    return;
                }
                sources.forEach(function (src) {
                    return src.groupVolume = value;
                });
            }
        }
    });

    return Object.freeze(api);
}

function MediaSource(el, context, onEnded) {
    var api = {};
    var ended = false,
        endedCallback = onEnded,
        delayTimeout = void 0,
        fadeTimeout = void 0,
        loop = false,
        paused = false,
        playbackRate = 1,
        playing = false,
        sourceNode = null,
        groupVolume = 1,
        volume = 1;

    function createSourceNode() {
        if (!sourceNode && context) {
            sourceNode = context.createMediaElementSource(el);
        }
        return sourceNode;
    }

    /*
     * Load
     */

    function load(url) {
        el.src = url;
        el.load();
        ended = false;
        paused = false;
        playing = false;
    }

    /*
     * Controls
     */

    function readyHandler() {
        el.removeEventListener('canplaythrough', readyHandler);
        if (playing) {
            el.play();
        }
    }

    /*
     * Ended handler
     */

    function endedHandler() {

        if (loop) {
            el.currentTime = 0;
            // fixes bug where server doesn't support seek:
            if (el.currentTime > 0) {
                el.load();
            }
            el.play();

            return;
        }

        ended = true;
        paused = false;
        playing = false;

        if (typeof endedCallback === 'function') {
            endedCallback(api);
        }
    }

    function play(delay, offset) {
        clearTimeout(delayTimeout);

        el.volume = volume * groupVolume;
        el.playbackRate = playbackRate;

        if (offset) {
            el.currentTime = offset;
        }

        if (delay) {
            delayTimeout = setTimeout(play, delay);
        } else {
            // el.load();
            el.play();
        }

        ended = false;
        paused = false;
        playing = true;

        el.removeEventListener('ended', endedHandler);
        el.addEventListener('ended', endedHandler, false);

        if (el.readyState < 1) {
            el.removeEventListener('canplaythrough', readyHandler);
            el.addEventListener('canplaythrough', readyHandler, false);
            el.load();
            el.play();
        }
    }

    function pause() {
        clearTimeout(delayTimeout);

        if (!el) {
            return;
        }

        el.pause();
        playing = false;
        paused = true;
    }

    function stop() {
        clearTimeout(delayTimeout);

        if (!el) {
            return;
        }

        el.pause();

        try {
            el.currentTime = 0;
            // fixes bug where server doesn't support seek:
            if (el.currentTime > 0) {
                el.load();
            }
        } catch (e) {}

        playing = false;
        paused = false;
    }

    /*
     * Fade for no webaudio
     */

    function fade(toVolume, duration) {
        if (context) {
            return api;
        }

        function ramp(value, step) {
            fadeTimeout = window.setTimeout(function () {
                api.volume = api.volume + (value - api.volume) * 0.2;
                if (Math.abs(api.volume - value) > 0.05) {
                    ramp(value, step);
                    return;
                }
                api.volume = value;
            }, step * 1000);
        }

        window.clearTimeout(fadeTimeout);
        ramp(toVolume, duration / 10);

        return api;
    }

    /*
     * Destroy
     */

    function destroy() {
        el.removeEventListener('ended', endedHandler);
        el.removeEventListener('canplaythrough', readyHandler);
        stop();
        el = null;
        context = null;
        endedCallback = null;
        sourceNode = null;
    }

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
            get: function get() {
                return el ? el.currentTime : 0;
            }
        },
        duration: {
            get: function get() {
                return el ? el.duration : 0;
            }
        },
        ended: {
            get: function get() {
                return ended;
            }
        },
        loop: {
            get: function get() {
                return loop;
            },
            set: function set(value) {
                loop = !!value;
            }
        },
        paused: {
            get: function get() {
                return paused;
            }
        },
        playbackRate: {
            get: function get() {
                return playbackRate;
            },
            set: function set(value) {
                playbackRate = value;
                if (el) {
                    el.playbackRate = playbackRate;
                }
            }
        },
        playing: {
            get: function get() {
                return playing;
            }
        },
        progress: {
            get: function get() {
                return el && el.duration ? el.currentTime / el.duration : 0;
            }
        },
        sourceNode: {
            get: function get() {
                return createSourceNode();
            }
        },
        volume: {
            get: function get() {
                return volume;
            },
            set: function set(value) {
                window.clearTimeout(fadeTimeout);
                volume = value;
                if (el) {
                    el.volume = volume * groupVolume;
                }
            }
        },
        groupVolume: {
            get: function get() {
                return groupVolume;
            },
            set: function set(value) {
                groupVolume = value;
                if (el) {
                    el.volume = volume * groupVolume;
                }
            }
        }
    });

    return Object.freeze(api);
}

function MicrophoneSource(stream, context) {
    var ended = false,
        paused = false,
        pausedAt = 0,
        playing = false,
        sourceNode = null,
        // MicrophoneSourceNode
    startedAt = 0;

    function createSourceNode() {
        if (!sourceNode && context) {
            sourceNode = context.createMediaStreamSource(stream);
            // HACK: stops moz garbage collection killing the stream
            // see https://support.mozilla.org/en-US/questions/984179
            if (navigator.mozGetUserMedia) {
                window.mozHack = sourceNode;
            }
        }
        return sourceNode;
    }

    /*
     * Controls
     */

    function play(delay) {
        delay = delay ? context.currentTime + delay : 0;

        createSourceNode();
        sourceNode.start(delay);

        startedAt = context.currentTime - pausedAt;
        ended = false;
        playing = true;
        paused = false;
        pausedAt = 0;
    }

    function stop() {
        if (sourceNode) {
            try {
                sourceNode.stop(0);
            } catch (e) {}
            sourceNode = null;
        }
        ended = true;
        paused = false;
        pausedAt = 0;
        playing = false;
        startedAt = 0;
    }

    function pause() {
        var elapsed = context.currentTime - startedAt;
        stop();
        pausedAt = elapsed;
        playing = false;
        paused = true;
    }

    /*
     * Destroy
     */

    function destroy() {
        stop();
        context = null;
        sourceNode = null;
        stream = null;
        window.mozHack = null;
    }

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
            get: function get() {
                if (pausedAt) {
                    return pausedAt;
                }
                if (startedAt) {
                    return context.currentTime - startedAt;
                }
                return 0;
            }
        },
        ended: {
            get: function get() {
                return ended;
            }
        },
        paused: {
            get: function get() {
                return paused;
            }
        },
        playing: {
            get: function get() {
                return playing;
            }
        },
        sourceNode: {
            get: function get() {
                return createSourceNode();
            }
        }
    });

    return Object.freeze(api);
}

function OscillatorSource(type, context) {
    var ended = false,
        paused = false,
        pausedAt = 0,
        playing = false,
        sourceNode = null,
        // OscillatorSourceNode
    startedAt = 0,
        frequency = 200,
        api = null;

    function createSourceNode() {
        if (!sourceNode && context) {
            sourceNode = context.createOscillator();
            sourceNode.type = type;
            sourceNode.frequency.value = frequency;
        }
        return sourceNode;
    }

    /*
     * Controls
     */

    function play(delay) {
        delay = delay || 0;
        if (delay) {
            delay = context.currentTime + delay;
        }

        createSourceNode();
        sourceNode.start(delay);

        if (pausedAt) {
            startedAt = context.currentTime - pausedAt;
        } else {
            startedAt = context.currentTime;
        }

        ended = false;
        playing = true;
        paused = false;
        pausedAt = 0;
    }

    function stop() {
        if (sourceNode) {
            try {
                sourceNode.stop(0);
            } catch (e) {}
            sourceNode = null;
        }
        ended = true;
        paused = false;
        pausedAt = 0;
        playing = false;
        startedAt = 0;
    }

    function pause() {
        var elapsed = context.currentTime - startedAt;
        stop();
        pausedAt = elapsed;
        playing = false;
        paused = true;
    }

    /*
     * Destroy
     */

    function destroy() {
        stop();
        context = null;
        sourceNode = null;
    }

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
            get: function get() {
                if (pausedAt) {
                    return pausedAt;
                }
                if (startedAt) {
                    return context.currentTime - startedAt;
                }
                return 0;
            }
        },
        duration: {
            value: 0
        },
        ended: {
            get: function get() {
                return ended;
            }
        },
        frequency: {
            get: function get() {
                return frequency;
            },
            set: function set(value) {
                frequency = value;
                if (sourceNode) {
                    sourceNode.frequency.value = value;
                }
            }
        },
        paused: {
            get: function get() {
                return paused;
            }
        },
        playing: {
            get: function get() {
                return playing;
            }
        },
        progress: {
            value: 0
        },
        sourceNode: {
            get: function get() {
                return createSourceNode();
            }
        }
    });

    return Object.freeze(api);
}

function ScriptSource(data, context) {
    var bufferSize = data.bufferSize || 1024;
    var channels = data.channels || 1;
    var ended = false,
        onProcess = data.callback.bind(data.thisArg || this),
        paused = false,
        pausedAt = 0,
        playing = false,
        sourceNode = null,
        // ScriptSourceNode
    startedAt = 0,
        api = null;

    function createSourceNode() {
        if (!sourceNode && context) {
            sourceNode = context.createScriptProcessor(bufferSize, 0, channels);
        }
        return sourceNode;
    }

    /*
     * Controls
     */

    function play() {
        createSourceNode();
        sourceNode.onaudioprocess = onProcess;

        startedAt = context.currentTime - pausedAt;
        ended = false;
        paused = false;
        pausedAt = 0;
        playing = true;
    }

    function onPaused(event) {
        var buffer = event.outputBuffer;
        for (var i = 0; i < buffer.numberOfChannels; i++) {
            var channel = buffer.getChannelData(i);
            for (var j = 0; j < channel.length; j++) {
                channel[j] = 0;
            }
        }
    }

    function stop() {
        if (sourceNode) {
            sourceNode.onaudioprocess = onPaused;
        }
        ended = true;
        paused = false;
        pausedAt = 0;
        playing = false;
        startedAt = 0;
    }

    function pause() {
        var elapsed = context.currentTime - startedAt;
        stop();
        pausedAt = elapsed;
        playing = false;
        paused = true;
    }

    /*
     * Destroy
     */

    function destroy() {
        stop();
        context = null;
        onProcess = null;
        sourceNode = null;
    }

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
            get: function get() {
                if (pausedAt) {
                    return pausedAt;
                }
                if (startedAt) {
                    return context.currentTime - startedAt;
                }
                return 0;
            }
        },
        ended: {
            get: function get() {
                return ended;
            }
        },
        paused: {
            get: function get() {
                return paused;
            }
        },
        playing: {
            get: function get() {
                return playing;
            }
        },
        sourceNode: {
            get: function get() {
                return createSourceNode();
            }
        }
    });

    return Object.freeze(api);
}

var Sound = function (_Emitter) {
    inherits(Sound, _Emitter);

    function Sound(config) {
        classCallCheck(this, Sound);

        var _this = possibleConstructorReturn(this, _Emitter.call(this));

        _this.id = config.id || null;

        _this._context = config.context || context;
        _this._destination = config.destination || _this._context.destination;
        _this._effects = new Effects(_this._context);
        _this._gain = _this._context.createGain();
        _this._config = config;

        _this._data = null;
        _this._isTouchLocked = false;
        _this._loader = null;
        _this._loop = false;
        _this._playbackRate = 1;
        _this._playWhenReady = null;
        _this._source = null;
        _this._wave = null;

        _this._effects.setDestination(_this._gain);
        _this._gain.connect(_this._destination);

        _this._onEnded = _this._onEnded.bind(_this);
        _this._onLoad = _this._onLoad.bind(_this);
        _this._onLoadError = _this._onLoadError.bind(_this);
        return _this;
    }

    Sound.prototype.load = function load() {
        var newConfig = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
        var force = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

        var skipLoad = !force && !this._source && !!this._config.deferLoad;

        if (newConfig) {
            var configSrc = newConfig.src || newConfig.url || newConfig.data || newConfig;
            var src = file.getSupportedFile(configSrc) || this._config.src;
            this._config = Object.assign(this._config, newConfig, { src: src });
        }

        if (this._source && this._data && this._data.tagName) {
            this._source.load(this._config.src);
        } else {
            this._loader = this._loader || new Loader(this._config.src, skipLoad);
            this._loader.audioContext = !!this._config.asMediaElement || this._context.isFake ? null : this._context;
            this._loader.isTouchLocked = this._isTouchLocked;
            this._loader.off('loaded', this._onLoad);
            this._loader.once('loaded', this._onLoad);
            this._loader.off('error', this._onLoadError);
            this._loader.on('error', this._onLoadError);
        }
        return this;
    };

    Sound.prototype.play = function play(delay, offset) {
        var _this2 = this;

        if (!this._source || this._isTouchLocked) {
            this._playWhenReady = function () {
                if (_this2._source) {
                    _this2.play(delay, offset);
                }
            };
            if (!!this._config.deferLoad) {
                if (!this._loader) {
                    this._load(null, true);
                }
                this._loader.start(true);
            }
            return this;
        }
        this._playWhenReady = null;
        this._effects.setSource(this._source.sourceNode);

        // update volume needed for no webaudio
        if (this._context.isFake) {
            this.volume = this._gain.gain.value;
        }

        this._source.play(delay, offset);

        if (this._source.hasOwnProperty('loop')) {
            this._source.loop = this._loop;
        }

        this.emit('play', this);

        return this;
    };

    Sound.prototype.pause = function pause() {
        this._source && this._source.pause();
        this.emit('pause', this);
        return this;
    };

    Sound.prototype.stop = function stop(delay) {
        this._source && this._source.stop(delay || 0);
        this.emit('stop', this);
        return this;
    };

    Sound.prototype.seek = function seek(percent) {
        if (this._source) {
            this._source.stop();
            this.play(0, this._source.duration * percent);
        }
        return this;
    };

    Sound.prototype.fade = function fade(volume) {
        var duration = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];

        if (!this._source) {
            return this;
        }

        var param = this._gain.gain;

        if (this._context && !this._context.isFake) {
            var time = this._context.currentTime;
            param.cancelScheduledValues(time);
            param.setValueAtTime(param.value, time);
            param.linearRampToValueAtTime(volume, time + duration);
        } else if (typeof this._source.fade === 'function') {
            this._source.fade(volume, duration);
            param.value = volume;
        }

        this.emit('fade', this, volume);

        return this;
    };

    Sound.prototype.unload = function unload() {
        this._source && this._source.destroy();
        this._loader && this._loader.destroy();
        this._data = null;
        this._playWhenReady = null;
        this._source = null;
        this._loader = null;
        this._config.deferLoad = true;
        this.emit('unload', this);
    };

    Sound.prototype.reload = function reload() {
        return this.load(null, true);
    };

    Sound.prototype.destroy = function destroy() {
        this._source && this._source.destroy();
        this._effects && this._effects.destroy();
        this._gain && this._gain.disconnect();
        if (this._loader) {
            this._loader.off('loaded');
            this._loader.off('error');
            this._loader.destroy();
        }
        this._gain = null;
        this._context = null;
        this._destination = null;
        this._data = null;
        this._playWhenReady = null;
        this._source = null;
        this._effects = null;
        this._loader = null;
        this._config = null;
        this.emit('destroy', this);
        this.off();
    };

    Sound.prototype.has = function has(node) {
        return this._effects.has(node);
    };

    Sound.prototype.add = function add(node) {
        return this._effects.add(node);
    };

    Sound.prototype.remove = function remove(node) {
        return this._effects.remove(node);
    };

    Sound.prototype.toggle = function toggle(node, force) {
        this._effects.toggle(node, force);
        return this;
    };

    Sound.prototype.removeAll = function removeAll() {
        this._effects.removeAll();
        return this;
    };

    Sound.prototype.waveform = function waveform(length) {
        var _this3 = this;

        if (!this._wave) {
            this._wave = utils.waveform();
        }
        if (!this._data) {
            this.once('ready', function () {
                return _this3._wave(_this3._data, length);
            });
        }
        return this._wave(this._data, length);
    };

    Sound.prototype._createSource = function _createSource(data) {
        this._data = data;

        var isAudioBuffer = file.isAudioBuffer(data);
        if (isAudioBuffer || file.isMediaElement(data)) {
            var Fn = isAudioBuffer ? BufferSource : MediaSource;
            this._source = new AudioSource(Fn, data, this._context, this._onEnded);
            this._source.multiPlay = !!this._config.multiPlay;
        } else if (file.isMediaStream(data)) {
            this._source = new MicrophoneSource(data, this._context);
        } else if (file.isOscillatorType(data && data.type || data)) {
            this._source = new OscillatorSource(data.type || data, this._context);
        } else if (file.isScriptConfig(data)) {
            this._source = new ScriptSource(data, this._context);
        } else {
            throw new Error('Cannot detect data type: ' + data);
        }

        this._effects.setSource(this._source.sourceNode);

        this.emit('ready', this);

        if (this._playWhenReady) {
            this._playWhenReady();
        }
    };

    Sound.prototype._onEnded = function _onEnded() {
        this.emit('ended', this);
    };

    Sound.prototype._onLoad = function _onLoad(fileData) {
        this._createSource(fileData);
        this.emit('loaded', this);
    };

    Sound.prototype._onLoadError = function _onLoadError(err) {
        this.emit('error', this, err);
    };

    createClass(Sound, [{
        key: 'currentTime',
        get: function get() {
            return this._source ? this._source.currentTime : 0;
        },
        set: function set(value) {
            this._source && this._source.stop();
            this.play(0, value);
        }
    }, {
        key: 'context',
        get: function get() {
            return this._context;
        }
    }, {
        key: 'data',
        get: function get() {
            return this._data;
        },
        set: function set(value) {
            if (!value) {
                return;
            }
            this._createSource(value);
        }
    }, {
        key: 'duration',
        get: function get() {
            return this._source ? this._source.duration : 0;
        }
    }, {
        key: 'effects',
        get: function get() {
            return this._effects._nodes;
        },
        set: function set(value) {
            this._effects.removeAll().add(value);
        }
    }, {
        key: 'fx',
        get: function get() {
            return this.effects;
        },
        set: function set(value) {
            this.effects = value;
        }
    }, {
        key: 'ended',
        get: function get() {
            return !!this._source && this._source.ended;
        }
    }, {
        key: 'frequency',
        get: function get() {
            return this._source ? this._source.frequency : 0;
        },
        set: function set(value) {
            if (this._source && this._source.hasOwnProperty('frequency')) {
                this._source.frequency = value;
            }
        }
    }, {
        key: 'gain',
        get: function get() {
            return this._gain;
        }

        // for media element source

    }, {
        key: 'groupVolume',
        get: function get() {
            return this._source.groupVolume;
        },
        set: function set(value) {
            if (this._source && this._source.hasOwnProperty('groupVolume')) {
                this._source.groupVolume = value;
            }
        }
    }, {
        key: 'isTouchLocked',
        set: function set(value) {
            this._isTouchLocked = value;
            if (this._loader) {
                this._loader.isTouchLocked = value;
            }
            if (!value && this._playWhenReady) {
                this._playWhenReady();
            }
        }
    }, {
        key: 'loader',
        get: function get() {
            return this._loader;
        }
    }, {
        key: 'loop',
        get: function get() {
            return this._loop;
        },
        set: function set(value) {
            this._loop = !!value;

            if (this._source && this._source.hasOwnProperty('loop') && this._source.loop !== this._loop) {
                this._source.loop = this._loop;
            }
        }
    }, {
        key: 'multiPlay',
        get: function get() {
            return this._config.multiPlay;
        },
        set: function set(value) {
            this._config.multiPlay = value;
            this._source.multiPlay = value;
        }
    }, {
        key: 'config',
        get: function get() {
            return this._config;
        }
    }, {
        key: 'paused',
        get: function get() {
            return !!this._source && this._source.paused;
        }
    }, {
        key: 'playing',
        get: function get() {
            return !!this._source && this._source.playing;
        }
    }, {
        key: 'playbackRate',
        get: function get() {
            return this._playbackRate;
        },
        set: function set(value) {
            this._playbackRate = value;
            if (this._source) {
                this._source.playbackRate = value;
            }
        }
    }, {
        key: 'progress',
        get: function get() {
            return this._source ? this._source.progress || 0 : 0;
        }
    }, {
        key: 'sourceInfo',
        get: function get() {
            return this._source && this._source.info ? this._source.info : {};
        }
    }, {
        key: 'sourceNode',
        get: function get() {
            return this._source ? this._source.sourceNode : null;
        }
    }, {
        key: 'volume',
        get: function get() {
            if (this._context && !this._context.isFake) {
                return this._gain.gain.value;
            }
            if (this._source && this._source.hasOwnProperty('volume')) {
                return this._source.volume;
            }
            return 1;
        },
        set: function set(value) {
            if (isNaN(value)) {
                return;
            }

            value = Math.min(Math.max(value, 0), 1);

            var param = this._gain.gain;

            if (this._context && !this._context.isFake) {
                var time = this._context.currentTime;
                param.cancelScheduledValues(time);
                param.value = value;
                param.setValueAtTime(value, time);
            } else {
                param.value = value;

                if (this._source && this._source.hasOwnProperty('volume')) {
                    this._source.volume = value;
                }
            }
        }
    }, {
        key: 'userData',
        get: function get() {
            return {};
        }
    }]);
    return Sound;
}(Emitter);

Sound.__source = {
    BufferSource: BufferSource,
    MediaSource: MediaSource,
    MicrophoneSource: MicrophoneSource,
    OscillatorSource: OscillatorSource,
    ScriptSource: ScriptSource
};

function SoundGroup(context, destination) {
    var group = new Group(context, destination);
    var sounds = group.sounds;
    var playbackRate = 1,
        loop = false,
        src = void 0;

    function getSource() {
        if (!sounds.length) {
            return;
        }

        src = sounds.slice(0).sort(function (a, b) {
            return b.duration - a.duration;
        })[0];
    }

    var add = group.add;
    group.add = function (sound) {
        add(sound);
        getSource();
        return group;
    };

    var remove = group.rmeove;
    group.remove = function (soundOrId) {
        remove(soundOrId);
        getSource();
        return group;
    };

    Object.defineProperties(group, {
        currentTime: {
            get: function get() {
                return src ? src.currentTime : 0;
            },
            set: function set(value) {
                this.stop();
                this.play(0, value);
            }
        },
        duration: {
            get: function get() {
                return src ? src.duration : 0;
            }
        },
        // ended: {
        //     get: function() {
        //         return src ? src.ended : false;
        //     }
        // },
        loop: {
            get: function get() {
                return loop;
            },
            set: function set(value) {
                loop = !!value;
                sounds.forEach(function (sound) {
                    sound.loop = loop;
                });
            }
        },
        paused: {
            get: function get() {
                // return src ? src.paused : false;
                return !!src && src.paused;
            }
        },
        progress: {
            get: function get() {
                return src ? src.progress : 0;
            }
        },
        playbackRate: {
            get: function get() {
                return playbackRate;
            },
            set: function set(value) {
                playbackRate = value;
                sounds.forEach(function (sound) {
                    sound.playbackRate = playbackRate;
                });
            }
        },
        playing: {
            get: function get() {
                // return src ? src.playing : false;
                return !!src && src.playing;
            }
        }
    });

    return group;
}

function Sono() {
    var _effects, _effects2, _fx, _fx2, _isTouchLocked, _sounds, _volume, _volume2, _api, _mutatorMap;

    var VERSION = '0.1.9';
    var group = new Group(context, context.destination);

    var api = null;
    var isTouchLocked = false;

    /*
     * Get Sound by id
     */

    function getSound(id) {
        return group.find(id);
    }

    /*
     * Create group
     */

    function createGroup(sounds) {
        var soundGroup = new SoundGroup(context, group.gain);
        if (sounds) {
            sounds.forEach(function (sound) {
                return soundGroup.add(sound);
            });
        }
        return soundGroup;
    }

    /*
     * Loading
     */

    function add(config) {
        var soundContext = config && config.webAudio === false ? null : context;
        // const sound = new Sound(soundContext, group.gain);
        var src = file.getSupportedFile(config.src || config.url || config.data || config);
        var sound = new Sound(Object.assign({}, config || {}, {
            src: src,
            context: soundContext,
            destination: group.gain
        }));
        sound.isTouchLocked = isTouchLocked;
        if (config) {
            sound.id = config.id || config.name || '';
            sound.loop = !!config.loop;
            sound.volume = config.volume;
        }
        group.add(sound);
        return sound;
    }

    function queue(config, loaderGroup) {
        var sound = add(config).load();

        if (loaderGroup) {
            loaderGroup.add(sound.loader);
        }
        return sound;
    }

    function load(config) {
        var src = config.src || config.url || config.data || config;
        var sound = void 0,
            loader = void 0;

        if (file.containsURL(src)) {
            sound = queue(config);
            loader = sound.loader;
        } else if (Array.isArray(src) && file.containsURL(src[0].src || src[0].url)) {
            sound = [];
            loader = new Loader.Group();
            src.forEach(function (url) {
                return sound.push(queue(url, loader));
            });
        } else {
            var errorMessage = 'sono.load: No audio file URLs found in config.';
            if (config.onError) {
                config.onError('[ERROR] ' + errorMessage);
            } else {
                throw new Error(errorMessage);
            }
            return null;
        }
        if (config.onProgress) {
            loader.on('progress', function (progress) {
                return config.onProgress(progress);
            });
        }
        if (config.onComplete) {
            loader.once('complete', function () {
                loader.off('progress');
                config.onComplete(sound);
            });
        }
        loader.once('error', function (err) {
            loader.off('error');
            if (config.onError) {
                config.onError(err);
            } else {
                console.error('[ERROR] sono.load: ' + err);
            }
        });
        loader.start();

        return sound;
    }

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

    function createSound(config) {
        // try to load if config contains URLs
        if (file.containsURL(config)) {
            return load(config);
        }

        var sound = add(config);
        sound.data = config.data || config;

        return sound;
    }

    /*
     * Destroy
     */

    function destroySound(soundOrId) {
        group.find(soundOrId, function (sound) {
            return sound.destroy();
        });
        return api;
    }

    function destroyAll() {
        group.destroy();
        return api;
    }

    /*
     * Controls
     */

    function mute() {
        group.mute();
        return api;
    }

    function unMute() {
        group.unMute();
        return api;
    }

    function fade(volume, duration) {
        group.fade(volume, duration);
        return api;
    }

    function pauseAll() {
        group.pause();
        return api;
    }

    function resumeAll() {
        group.resume();
        return api;
    }

    function stopAll() {
        group.stop();
        return api;
    }

    function play(id, delay, offset) {
        group.find(id, function (sound) {
            return sound.play(delay, offset);
        });
        return api;
    }

    function pause(id) {
        group.find(id, function (sound) {
            return sound.pause();
        });
        return api;
    }

    function stop(id) {
        group.find(id, function (sound) {
            return sound.stop();
        });
        return api;
    }

    /*
     * Mobile touch lock
     */

    isTouchLocked = browser.handleTouchLock(context, function () {
        isTouchLocked = false;
        group.sounds.forEach(function (sound) {
            return sound.isTouchLocked = false;
        });
    });

    /*
     * Page visibility events
     */

    (function () {
        var pageHiddenPaused = [];

        // pause currently playing sounds and store refs
        function onHidden() {
            group.sounds.forEach(function (sound) {
                if (sound.playing) {
                    sound.pause();
                    pageHiddenPaused.push(sound);
                }
            });
        }

        // play sounds that got paused when page was hidden
        function onShown() {
            while (pageHiddenPaused.length) {
                pageHiddenPaused.pop().play();
            }
        }

        browser.handlePageVisibility(onHidden, onShown);
    })();

    /*
     * Log version & device support info
     */

    function log() {
        var title = 'sono ' + VERSION,
            info = 'Supported:' + api.isSupported + ' WebAudioAPI:' + api.hasWebAudio + ' TouchLocked:' + isTouchLocked + ' State:' + (context && context.state) + ' Extensions:' + file.extensions;

        if (navigator.userAgent.indexOf('Chrome') > -1) {
            var args = ['%c ♫ ' + title + ' ♫ %c ' + info + ' ', 'color: #FFFFFF; background: #379F7A', 'color: #1F1C0D; background: #E0FBAC'];
            console.log.apply(console, args);
        } else if (window.console && window.console.log.call) {
            console.log.call(console, title + ' ' + info);
        }
    }

    function register(name, fn) {
        var attachTo = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];


        if (attachTo.length) {
            attachTo.forEach(function (ob) {
                ob[name] = fn;
            });
        } else {
            Effects.prototype[name] = function (opts) {
                return this.add(fn(opts));
            };
        }

        api[name] = fn;

        return fn;
    }

    api = (_api = {
        canPlay: file.canPlay,
        context: context,
        create: createSound,
        createGroup: createGroup,
        createSound: createSound,
        destroyAll: destroyAll,
        destroySound: destroySound,
        Effects: Effects,
        effects: group.effects,
        extensions: file.extensions,
        fade: fade,
        file: file,
        gain: group.gain,
        getOfflineContext: utils.getOfflineContext,
        getSound: getSound,
        Group: Group,
        hasWebAudio: !context.isFake,
        isSupported: file.extensions.length > 0,
        load: load,
        log: log,
        mute: mute,
        pause: pause,
        pauseAll: pauseAll,
        play: play,
        register: register,
        resumeAll: resumeAll,
        Sound: Sound,
        stop: stop,
        stopAll: stopAll,
        unMute: unMute,
        utils: utils,
        VERSION: VERSION
    }, _effects = 'effects', _mutatorMap = {}, _mutatorMap[_effects] = _mutatorMap[_effects] || {}, _mutatorMap[_effects].get = function () {
        return group.effects;
    }, _effects2 = 'effects', _mutatorMap[_effects2] = _mutatorMap[_effects2] || {}, _mutatorMap[_effects2].set = function (value) {
        group.effects.removeAll().add(value);
    }, _fx = 'fx', _mutatorMap[_fx] = _mutatorMap[_fx] || {}, _mutatorMap[_fx].get = function () {
        return this.effects;
    }, _fx2 = 'fx', _mutatorMap[_fx2] = _mutatorMap[_fx2] || {}, _mutatorMap[_fx2].set = function (value) {
        this.effects = value;
    }, _isTouchLocked = 'isTouchLocked', _mutatorMap[_isTouchLocked] = _mutatorMap[_isTouchLocked] || {}, _mutatorMap[_isTouchLocked].get = function () {
        return isTouchLocked;
    }, _sounds = 'sounds', _mutatorMap[_sounds] = _mutatorMap[_sounds] || {}, _mutatorMap[_sounds].get = function () {
        return group.sounds.slice(0);
    }, _volume = 'volume', _mutatorMap[_volume] = _mutatorMap[_volume] || {}, _mutatorMap[_volume].get = function () {
        return group.volume;
    }, _volume2 = 'volume', _mutatorMap[_volume2] = _mutatorMap[_volume2] || {}, _mutatorMap[_volume2].set = function (value) {
        group.volume = value;
    }, defineEnumerableProperties(_api, _mutatorMap), _api);
    return api;
}

var sono$1 = new Sono();

function isSafeNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

var AbstractEffect = function () {
    function AbstractEffect() {
        var node = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
        classCallCheck(this, AbstractEffect);

        this._in = node || this.context.createGain();
        this._out = node || this.context.createGain();
        if (node) {
            this._node = node;
        }
    }

    AbstractEffect.prototype.connect = function connect(node) {
        this._out.connect(node._in || node);
    };

    AbstractEffect.prototype.disconnect = function disconnect() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        this._out.disconnect(args);
    };

    AbstractEffect.prototype.setSafeParamValue = function setSafeParamValue(param, value) {
        if (!isSafeNumber(value)) {
            console.warn('Attempt to set invalid value ' + value + ' on AudioParam');
            return;
        }
        param.value = value;
    };

    AbstractEffect.prototype.update = function update() {
        throw new Error('update must be overridden');
    };

    createClass(AbstractEffect, [{
        key: 'context',
        get: function get() {
            return context;
        }
    }, {
        key: 'numberOfInputs',
        get: function get() {
            return 1;
        }
    }, {
        key: 'numberOfOutputs',
        get: function get() {
            return 1;
        }
    }, {
        key: 'channelCount',
        get: function get() {
            return 1;
        }
    }, {
        key: 'channelCountMode',
        get: function get() {
            return 'max';
        }
    }, {
        key: 'channelInterpretation',
        get: function get() {
            return 'speakers';
        }
    }]);
    return AbstractEffect;
}();

function noteFromPitch(frequency) {
    var noteNum = 12 * (Math.log(frequency / 440) * Math.LOG2E);
    return Math.round(noteNum) + 69;
}

function frequencyFromNoteNumber(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

function centsOffFromPitch(frequency, note) {
    return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note)) * Math.LOG2E);
}

var Analyser = function (_AbstractEffect) {
    inherits(Analyser, _AbstractEffect);

    function Analyser() {
        var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var _ref$fftSize = _ref.fftSize;
        var fftSize = _ref$fftSize === undefined ? 512 : _ref$fftSize;
        var _ref$float = _ref.float;
        var float = _ref$float === undefined ? false : _ref$float;
        var _ref$minDecibels = _ref.minDecibels;
        var minDecibels = _ref$minDecibels === undefined ? 0 : _ref$minDecibels;
        var _ref$maxDecibels = _ref.maxDecibels;
        var maxDecibels = _ref$maxDecibels === undefined ? 0 : _ref$maxDecibels;
        var _ref$smoothing = _ref.smoothing;
        var smoothing = _ref$smoothing === undefined ? 0.9 : _ref$smoothing;
        classCallCheck(this, Analyser);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this, sono$1.context.createAnalyser()));

        _this._freqFloat = !!float;
        _this._waveFloat = !!float;
        _this._waveform = null;
        _this._frequencies = null;

        _this._node.fftSize = fftSize; // frequencyBinCount will be half this value
        _this._node.smoothingTimeConstant = smoothing || _this._node.smoothingTimeConstant;
        _this._node.minDecibels = minDecibels || _this._node.minDecibels;
        _this._node.maxDecibels = maxDecibels || _this._node.maxDecibels;
        return _this;
    }

    Analyser.prototype.update = function update() {};

    Analyser.prototype.getWaveform = function getWaveform(useFloat) {
        if (!arguments.length) {
            useFloat = this._waveFloat;
        }

        if (this._needsUpdate(this._waveform, useFloat)) {
            this._fftSize = this._node.fftSize;
            this._waveFloat = useFloat;
            this._waveform = this._createArray(useFloat, this._fftSize);
        }
        if (useFloat && this._node.getFloatTimeDomainData) {
            this._node.getFloatTimeDomainData(this._waveform);
        } else {
            this._node.getByteTimeDomainData(this._waveform);
        }

        return this._waveform;
    };

    Analyser.prototype.getFrequencies = function getFrequencies(useFloat) {
        if (!arguments.length) {
            useFloat = this._freqFloat;
        }

        if (this._needsUpdate(this._frequencies, useFloat)) {
            this._fftSize = this._node.fftSize;
            this._freqFloat = useFloat;
            this._frequencies = this._createArray(useFloat, this._node.frequencyBinCount);
        }

        if (useFloat) {
            this._node.getFloatFrequencyData(this._frequencies);
        } else {
            this._node.getByteFrequencyData(this._frequencies);
        }

        return this._frequencies;
    };

    Analyser.prototype.getAmplitude = function getAmplitude(callback) {
        if (!this._amplitudeWorker) {
            this._createAmplitudeAnalyser();
        }
        this._amplitudeCallback = callback || this._amplitudeCallback;
        var f = new Float32Array(this._node.fftSize);
        f.set(this.getFrequencies(true));
        this._amplitudeWorker.postMessage({
            sum: 0,
            length: f.byteLength,
            numSamples: this._node.fftSize / 2,
            b: f.buffer
        }, [f.buffer]);
    };

    Analyser.prototype.getPitch = function getPitch(callback) {
        if (!this._pitchWorker) {
            this._createPitchAnalyser();
        }
        this._pitchCallback = callback || this._pitchCallback;
        var f = new Float32Array(this._node.fftSize);
        f.set(this.getWaveform(true));
        this._pitchWorker.postMessage({
            sampleRate: sono$1.context.sampleRate,
            b: f.buffer
        }, [f.buffer]);
    };

    Analyser.prototype._needsUpdate = function _needsUpdate(arr, useFloat) {
        if (!arr) {
            return true;
        }
        if (this._node.fftSize !== this._fftSize) {
            return true;
        }
        if (useFloat && arr instanceof Uint8Array) {
            return true;
        }
        return !useFloat && arr instanceof Float32Array;
    };

    Analyser.prototype._createArray = function _createArray(useFloat, length) {
        return useFloat ? new Float32Array(length) : new Uint8Array(length);
    };

    Analyser.prototype._createAmplitudeAnalyser = function _createAmplitudeAnalyser() {
        var _this2 = this;

        //the worker returns a normalized value
        //first a sum of all magnitudes devided by the byteLength, then devide  by half the fft (1channel)
        var amplitudeBlob = new Blob(['onmessage = function(e) {\n                var data = e.data;\n                var f = new Float32Array(data.b);\n                for (var i = 0; i < f.length; i++) {\n                    data.sum += f[i];\n                }\n                data.sum /= f.length;\n                postMessage(Math.max(1.0 - (data.sum / data.numSamples * -1.0), 0));\n            };']);
        var amplitudeBlobURL = URL.createObjectURL(amplitudeBlob);
        this._amplitudeWorker = new Worker(amplitudeBlobURL);
        this._amplitudeWorker.onmessage = function (event) {
            if (!_this2._amplitudeCallback) {
                return;
            }
            _this2._amplitudeCallback(event.data);
        };
    };

    Analyser.prototype._createPitchAnalyser = function _createPitchAnalyser() {
        var _this3 = this;

        var pitchBlob = new Blob(['onmessage = function(e) {\n                var data = e.data;\n                var sampleRate = data.sampleRate;\n                var buf = new Float32Array(data.b);\n                var SIZE = buf.length;\n                var MAX_SAMPLES = Math.floor(SIZE / 2);\n                var bestOffset = -1;\n                var bestCorrel = 0;\n                var rms = 0;\n                var foundGoodCorrelation = false;\n                var correls = new Array(MAX_SAMPLES);\n                for (var i = 0; i < SIZE; i++) {\n                    var val = buf[i];\n                    rms += val * val;\n                }\n                rms = Math.sqrt(rms / SIZE);\n                if (rms < 0.01) {\n                    postMessage(-1);\n                } else {\n                    var lastCorrelation = 1;\n                    for (var offset = 0; offset < MAX_SAMPLES; offset++) {\n                        var correl = 0;\n                        for (var i = 0; i < MAX_SAMPLES; i++) {\n                            correl += Math.abs(buf[i] - buf[i + offset]);\n                        }\n                        correl = 1 - correl / MAX_SAMPLES;\n                        correls[offset] = correl;\n                        if (correl > 0.9 && correl > lastCorrelation) {\n                            foundGoodCorrelation = true;\n                            if (correl > bestCorrel) {\n                                bestCorrel = correl;\n                                bestOffset = offset;\n                            }\n                        } else if (foundGoodCorrelation) {\n                            var shift = (correls[bestOffset + 1] - correls[bestOffset - 1]) / correls[bestOffset];\n                            postMessage(sampleRate / (bestOffset + 8 * shift));\n                        }\n                        lastCorrelation = correl;\n                    }\n                    if (bestCorrel > 0.01) {\n                        postMessage(sampleRate / bestOffset);\n                    } else {\n                        postMessage(-1);\n                    }\n                }\n            };']);

        var pitchBlobURL = URL.createObjectURL(pitchBlob);
        this._pitchWorker = new Worker(pitchBlobURL);

        var noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        var pitchCallbackObject = {
            hertz: 0,
            note: '',
            noteIndex: 0,
            detuneCents: 0,
            detune: ''
        };

        this._pitchWorker.onmessage = function (event) {
            if (!_this3._pitchCallback) {
                return;
            }
            var hz = event.data;
            if (hz !== -1) {
                var note = noteFromPitch(hz);
                var detune = centsOffFromPitch(hz, note);
                pitchCallbackObject.hertz = hz;
                pitchCallbackObject.noteIndex = note % 12;
                pitchCallbackObject.note = noteStrings[note % 12];
                pitchCallbackObject.detuneCents = detune;
                if (detune === 0) {
                    pitchCallbackObject.detune = '';
                } else if (detune < 0) {
                    pitchCallbackObject.detune = 'flat';
                } else {
                    pitchCallbackObject.detune = 'sharp';
                }
            }
            _this3._pitchCallback(pitchCallbackObject);
        };
    };

    createClass(Analyser, [{
        key: 'smoothing',
        get: function get() {
            return this._node.smoothingTimeConstant;
        },
        set: function set(value) {
            this._node.smoothingTimeConstant = value;
        }
    }]);
    return Analyser;
}(AbstractEffect);

sono$1.register('analyser', function (opts) {
    return new Analyser(opts);
});

var Compressor = function (_AbstractEffect) {
    inherits(Compressor, _AbstractEffect);

    function Compressor() {
        var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var _ref$threshold = _ref.threshold;
        var threshold = _ref$threshold === undefined ? -24 : _ref$threshold;
        var _ref$knee = _ref.knee;
        var knee = _ref$knee === undefined ? 30 : _ref$knee;
        var _ref$ratio = _ref.ratio;
        var ratio = _ref$ratio === undefined ? 12 : _ref$ratio;
        var _ref$attack = _ref.attack;
        var attack = _ref$attack === undefined ? 0.0003 : _ref$attack;
        var _ref$release = _ref.release;
        var release = _ref$release === undefined ? 0.25 : _ref$release;
        classCallCheck(this, Compressor);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this, sono$1.context.createDynamicsCompressor()));

        _this.update({ threshold: threshold, knee: knee, ratio: ratio, attack: attack, release: release });
        return _this;
    }

    Compressor.prototype.update = function update(options) {
        // min decibels to start compressing at from -100 to 0
        this.setSafeParamValue(this._node.threshold, options.threshold);
        // decibel value to start curve to compressed value from 0 to 40
        this.setSafeParamValue(this._node.knee, options.knee);
        // amount of change per decibel from 1 to 20
        this.setSafeParamValue(this._node.ratio, options.ratio);
        // gain reduction currently applied by compressor from -20 to 0
        // node.reduction.value = typeof config.reduction !== 'undefined' ? config.reduction : -10;)
        // seconds to reduce gain by 10db from 0 to 1 - how quickly signal adapted when volume increased
        this.setSafeParamValue(this._node.attack, options.attack);
        // seconds to increase gain by 10db from 0 to 1 - how quickly signal adapted when volume redcuced
        this.setSafeParamValue(this._node.release, options.release);
    };

    return Compressor;
}(AbstractEffect);

sono$1.register('compressor', function (opts) {
    return new Compressor(opts);
});

var n = 22050;

// Float32Array defining curve (values are interpolated)
// up-sample before applying curve for better resolution result 'none', '2x' or '4x'
// node.oversample = '2x';

var Distortion = function (_AbstractEffect) {
    inherits(Distortion, _AbstractEffect);

    function Distortion() {
        var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var _ref$level = _ref.level;
        var level = _ref$level === undefined ? 1 : _ref$level;
        classCallCheck(this, Distortion);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this, sono$1.context.createWaveShaper()));

        _this._curve = new Float32Array(n);

        _this._level = 0;

        _this.update({ level: level });
        return _this;
    }

    Distortion.prototype.update = function update(_ref2) {
        var level = _ref2.level;

        if (level === this._level || !isSafeNumber(level)) {
            return;
        }

        if (level <= 0) {
            this._node.curve = null;
            return;
        }

        var k = level * 100;
        var deg = Math.PI / 180;

        var x = void 0;
        for (var i = 0; i < n; i++) {
            x = i * 2 / n - 1;
            this._curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }

        this._level = level;
        this._node.curve = this._curve;
    };

    createClass(Distortion, [{
        key: 'level',
        get: function get() {
            return this._level;
        },
        set: function set(level) {
            this.update({ level: level });
        }
    }]);
    return Distortion;
}(AbstractEffect);

sono$1.register('distortion', function (opts) {
    return new Distortion(opts);
});

var Echo = function (_AbstractEffect) {
    inherits(Echo, _AbstractEffect);

    function Echo() {
        var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var _ref$delay = _ref.delay;
        var delay = _ref$delay === undefined ? 0.5 : _ref$delay;
        var _ref$feedback = _ref.feedback;
        var feedback = _ref$feedback === undefined ? 0.5 : _ref$feedback;
        classCallCheck(this, Echo);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this));

        _this._delay = _this.context.createDelay();
        _this._feedback = _this.context.createGain();

        _this._in.connect(_this._delay);
        _this._in.connect(_this._out);
        _this._delay.connect(_this._feedback);
        _this._feedback.connect(_this._delay);
        _this._feedback.connect(_this._out);

        _this.delay = delay;
        _this.feedback = feedback;
        return _this;
    }

    Echo.prototype.update = function update(options) {
        this.delay = options.delay;
        this.feedback = options.feedback;
    };

    createClass(Echo, [{
        key: 'delay',
        get: function get() {
            return this._delay.delayTime.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._delay.delayTime, value);
        }
    }, {
        key: 'feedback',
        get: function get() {
            return this._feedback.gain.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._feedback.gain, value);
        }
    }]);
    return Echo;
}(AbstractEffect);

sono$1.register('echo', function (opts) {
    return new Echo(opts);
});

function safeOption(a, b) {
    if (isSafeNumber(a)) {
        return a;
    }
    return b;
}

// https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
// For lowpass and highpass Q indicates how peaked the frequency is around the cutoff.
// The greater the value is, the greater is the peak
var minFrequency = 40;
var maxFrequency = sono$1.context.sampleRate / 2;

function getFrequency$1(value) {
    // Logarithm (base 2) to compute how many octaves fall in the range.
    var numberOfOctaves = Math.log(maxFrequency / minFrequency) / Math.LN2;
    // Compute a multiplier from 0 to 1 based on an exponential scale.
    var multiplier = Math.pow(2, numberOfOctaves * (value - 1.0));
    // Get back to the frequency value between min and max.
    return maxFrequency * multiplier;
}

var Filter = function (_AbstractEffect) {
    inherits(Filter, _AbstractEffect);

    function Filter() {
        var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var _ref$type = _ref.type;
        var type = _ref$type === undefined ? 'lowpass' : _ref$type;
        var _ref$frequency = _ref.frequency;
        var frequency = _ref$frequency === undefined ? 1000 : _ref$frequency;
        var _ref$q = _ref.q;
        var q = _ref$q === undefined ? 0 : _ref$q;
        var _ref$gain = _ref.gain;
        var gain = _ref$gain === undefined ? 1 : _ref$gain;
        classCallCheck(this, Filter);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this, sono$1.context.createBiquadFilter()));

        _this._node.type = type;

        _this.update({ frequency: frequency, q: q, gain: gain });
        return _this;
    }

    Filter.prototype.update = function update(options) {
        this.setSafeParamValue(this._node.frequency, options.frequency);
        this.setSafeParamValue(this._node.Q, options.q);
        this.setSafeParamValue(this._node.gain, options.gain);
    };

    Filter.prototype.setByPercent = function setByPercent(_ref2) {
        var _ref2$percent = _ref2.percent;
        var percent = _ref2$percent === undefined ? 0.5 : _ref2$percent;

        this.update({
            frequency: getFrequency$1(percent)
        });
    };

    createClass(Filter, [{
        key: 'frequency',
        get: function get() {
            return this._node.frequency.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._node.frequency, value);
        }
    }, {
        key: 'q',
        get: function get() {
            return this._node.Q.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._node.Q, value);
        }
    }, {
        key: 'Q',
        get: function get() {
            return this._node.Q.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._node.Q, value);
        }
    }, {
        key: 'gain',
        get: function get() {
            return this._node.gain.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._node.gain, value);
        }
    }, {
        key: 'detune',
        get: function get() {
            return this._node.detune.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._node.detune, value);
        }
    }]);
    return Filter;
}(AbstractEffect);

sono$1.register('lowpass', function () {
    var _ref3 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var frequency = _ref3.frequency;
    var peak = _ref3.peak;
    var q = _ref3.q;

    return new Filter({ type: 'lowpass', frequency: frequency, q: safeOption(peak, q) });
});

sono$1.register('highpass', function () {
    var _ref4 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var frequency = _ref4.frequency;
    var peak = _ref4.peak;
    var q = _ref4.q;

    return new Filter({ type: 'highpass', frequency: frequency, q: safeOption(peak, q) });
});

sono$1.register('bandpass', function () {
    var _ref5 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var frequency = _ref5.frequency;
    var width = _ref5.width;
    var q = _ref5.q;

    return new Filter({ type: 'bandpass', frequency: frequency, q: safeOption(width, q) });
});

sono$1.register('lowshelf', function () {
    var _ref6 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var frequency = _ref6.frequency;
    var gain = _ref6.gain;

    return new Filter({ type: 'lowshelf', frequency: frequency, q: 0, gain: gain });
});

sono$1.register('highshelf', function () {
    var _ref7 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var frequency = _ref7.frequency;
    var gain = _ref7.gain;

    return new Filter({ type: 'highshelf', frequency: frequency, q: 0, gain: gain });
});

sono$1.register('peaking', function () {
    var _ref8 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var frequency = _ref8.frequency;
    var width = _ref8.width;
    var gain = _ref8.gain;

    return new Filter({ type: 'peaking', frequency: frequency, q: width, gain: gain });
});

sono$1.register('notch', function () {
    var _ref9 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var frequency = _ref9.frequency;
    var width = _ref9.width;
    var gain = _ref9.gain;
    var q = _ref9.q;

    return new Filter({ type: 'notch', frequency: frequency, q: safeOption(width, q), gain: gain });
});

sono$1.register('allpass', function () {
    var _ref10 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var frequency = _ref10.frequency;
    var sharpness = _ref10.sharpness;
    var q = _ref10.q;

    return new Filter({ type: 'allpass', frequency: frequency, q: safeOption(sharpness, q) });
});

sono$1.register('filter', function (opts) {
    return new Filter(opts);
});

var MonoFlanger = function (_AbstractEffect) {
    inherits(MonoFlanger, _AbstractEffect);

    function MonoFlanger() {
        var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var _ref$delay = _ref.delay;
        var delay = _ref$delay === undefined ? 0.005 : _ref$delay;
        var _ref$feedback = _ref.feedback;
        var feedback = _ref$feedback === undefined ? 0.5 : _ref$feedback;
        var _ref$frequency = _ref.frequency;
        var frequency = _ref$frequency === undefined ? 0.002 : _ref$frequency;
        var _ref$gain = _ref.gain;
        var gain = _ref$gain === undefined ? 0.25 : _ref$gain;
        classCallCheck(this, MonoFlanger);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this));

        _this._delay = sono$1.context.createDelay();
        _this._feedback = sono$1.context.createGain();
        _this._lfo = sono$1.context.createOscillator();
        _this._gain = sono$1.context.createGain();
        _this._lfo.type = 'sine';

        _this._in.connect(_this._out);
        _this._in.connect(_this._delay);
        _this._delay.connect(_this._out);
        _this._delay.connect(_this._feedback);
        _this._feedback.connect(_this._in);

        _this._lfo.connect(_this._gain);
        _this._gain.connect(_this._delay.delayTime);
        _this._lfo.start(0);

        _this.update({ delay: delay, feedback: feedback, frequency: frequency, gain: gain });
        return _this;
    }

    MonoFlanger.prototype.update = function update(options) {
        this.delay = options.delay;
        this.lfoFrequency = options.lfoFrequency;
        this.lfoGain = options.lfoGain;
        this.feedback = options.feedback;
    };

    createClass(MonoFlanger, [{
        key: 'delay',
        get: function get() {
            return this._delay.delayTime.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._delay.delayTime, value);
        }
    }, {
        key: 'lfoFrequency',
        get: function get() {
            return this._lfo.frequency.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._lfo.frequency, value);
        }
    }, {
        key: 'lfoGain',
        get: function get() {
            return this._gain.gain.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._gain.gain, value);
        }
    }, {
        key: 'feedback',
        get: function get() {
            return this._feedback.gain.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._feedback.gain, value);
        }
    }]);
    return MonoFlanger;
}(AbstractEffect);

sono$1.register('monoFlanger', function (opts) {
    return new MonoFlanger(opts);
});

var StereoFlanger = function (_AbstractEffect2) {
    inherits(StereoFlanger, _AbstractEffect2);

    function StereoFlanger() {
        var _ref2 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var _ref2$delay = _ref2.delay;
        var delay = _ref2$delay === undefined ? 0.003 : _ref2$delay;
        var _ref2$feedback = _ref2.feedback;
        var feedback = _ref2$feedback === undefined ? 0.5 : _ref2$feedback;
        var _ref2$frequency = _ref2.frequency;
        var frequency = _ref2$frequency === undefined ? 0.5 : _ref2$frequency;
        var _ref2$gain = _ref2.gain;
        var gain = _ref2$gain === undefined ? 0.005 : _ref2$gain;
        classCallCheck(this, StereoFlanger);

        var _this2 = possibleConstructorReturn(this, _AbstractEffect2.call(this));

        _this2._splitter = sono$1.context.createChannelSplitter(2);
        _this2._merger = sono$1.context.createChannelMerger(2);
        _this2._feedbackL = sono$1.context.createGain();
        _this2._feedbackR = sono$1.context.createGain();
        _this2._lfo = sono$1.context.createOscillator();
        _this2._lfoGainL = sono$1.context.createGain();
        _this2._lfoGainR = sono$1.context.createGain();
        _this2._delayL = sono$1.context.createDelay();
        _this2._delayR = sono$1.context.createDelay();

        _this2._lfo.type = 'sine';

        _this2._in.connect(_this2._splitter);

        _this2._splitter.connect(_this2._delayL, 0);
        _this2._splitter.connect(_this2._delayR, 1);

        _this2._delayL.connect(_this2._feedbackL);
        _this2._delayR.connect(_this2._feedbackR);

        _this2._feedbackL.connect(_this2._delayR);
        _this2._feedbackR.connect(_this2._delayL);

        _this2._delayL.connect(_this2._merger, 0, 0);
        _this2._delayR.connect(_this2._merger, 0, 1);

        _this2._merger.connect(_this2._out);
        _this2._in.connect(_this2._out);

        _this2._lfo.connect(_this2._lfoGainL);
        _this2._lfo.connect(_this2._lfoGainR);
        _this2._lfoGainL.connect(_this2._delayL.delayTime);
        _this2._lfoGainR.connect(_this2._delayR.delayTime);
        _this2._lfo.start(0);

        _this2.update({ delay: delay, feedback: feedback, frequency: frequency, gain: gain });
        return _this2;
    }

    StereoFlanger.prototype.update = function update(options) {
        this.delay = options.delay;
        this.lfoFrequency = options.lfoFrequency;
        this.lfoGain = options.lfoGain;
        this.feedback = options.feedback;
    };

    createClass(StereoFlanger, [{
        key: 'delay',
        get: function get() {
            return this._delayL.delayTime.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._delayL.delayTime, value);
            this._delayR.delayTime.value = this._delayL.delayTime.value;
        }
    }, {
        key: 'frequency',
        get: function get() {
            return this._lfo.frequency.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._lfo.frequency, value);
        }
    }, {
        key: 'gain',
        get: function get() {
            return this._lfoGainL.gain.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._lfoGainL.gain, value);
            this._lfoGainR.gain.value = 0 - this._lfoGainL.gain.value;
        }
    }, {
        key: 'feedback',
        get: function get() {
            return this._feedbackL.gain.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._feedbackL.gain, value);
            this._feedbackR.gain.value = this._feedbackL.gain.value;
        }
    }]);
    return StereoFlanger;
}(AbstractEffect);

sono$1.register('stereoFlanger', function (opts) {
    return new StereoFlanger(opts);
});

sono$1.register('flanger', function () {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    return opts.stereo ? new StereoFlanger(opts) : new MonoFlanger(opts);
});

var pannerDefaults = {
    panningModel: 'HRTF',
    distanceModel: 'linear',
    refDistance: 1,
    maxDistance: 1000,
    rolloffFactor: 1,
    coneInnerAngle: 360,
    coneOuterAngle: 0,
    coneOuterGain: 0
};

function safeNumber(x, y) {
    if (isSafeNumber(x)) {
        return x;
    }
    return y;
}

// cross product of 2 vectors
function cross(a, b) {
    var ax = a.x,
        ay = a.y,
        az = a.z;
    var bx = b.x,
        by = b.y,
        bz = b.z;
    a.x = ay * bz - az * by;
    a.y = az * bx - ax * bz;
    a.z = ax * by - ay * bx;
}

// normalise to unit vector
function normalize(vec3) {
    if (vec3.x === 0 && vec3.y === 0 && vec3.z === 0) {
        return vec3;
    }
    var length = Math.sqrt(vec3.x * vec3.x + vec3.y * vec3.y + vec3.z * vec3.z);
    var invScalar = 1 / length;
    vec3.x *= invScalar;
    vec3.y *= invScalar;
    vec3.z *= invScalar;
    return vec3;
}

var vecPool = {
    pool: [],
    get: function get(x, y, z) {
        var v = this.pool.length ? this.pool.pop() : {
            x: 0,
            y: 0,
            z: 0
        };
        // check if a vector has been passed in
        if (typeof x !== 'undefined' && isNaN(x) && 'x' in x && 'y' in x && 'z' in x) {
            v.x = safeNumber(x.x, 0);
            v.y = safeNumber(x.y);
            v.z = safeNumber(x.z);
        } else {
            v.x = safeNumber(x);
            v.y = safeNumber(y);
            v.z = safeNumber(z);
        }
        return v;
    },
    dispose: function dispose(instance) {
        this.pool.push(instance);
    }
};

var globalUp = vecPool.get(0, 1, 0);
var angle45 = Math.PI / 4;
var angle90 = Math.PI / 2;

var Panner = function (_AbstractEffect) {
    inherits(Panner, _AbstractEffect);

    function Panner() {
        var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        objectDestructuringEmpty(_ref);
        classCallCheck(this, Panner);

        // Default for stereo is 'HRTF' can also be 'equalpower'
        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this, sono$1.context.createPanner()));

        _this._node.panningModel = pannerDefaults.panningModel;

        // Distance model and attributes
        // Can be 'linear' 'inverse' 'exponential'
        _this._node.distanceModel = pannerDefaults.distanceModel;
        _this._node.refDistance = pannerDefaults.refDistance;
        _this._node.maxDistance = pannerDefaults.maxDistance;
        _this._node.rolloffFactor = pannerDefaults.rolloffFactor;
        _this._node.coneInnerAngle = pannerDefaults.coneInnerAngle;
        _this._node.coneOuterAngle = pannerDefaults.coneOuterAngle;
        _this._node.coneOuterGain = pannerDefaults.coneOuterGain;
        // set to defaults (needed in Firefox)
        _this._node.setPosition(0, 0, 1);
        _this._node.setOrientation(0, 0, 0);
        return _this;
    }
    // set the orientation of the source (where the audio is coming from)


    Panner.prototype.setOrientation = function setOrientation(pannerNode, fw) {
        // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
        var up = vecPool.get(fw.x, fw.y, fw.z);
        cross(up, globalUp);
        cross(up, fw);
        normalize(up);
        normalize(fw);
        // set the audio context's listener position to match the camera position
        pannerNode.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
        // return the vecs to the pool
        vecPool.dispose(fw);
        vecPool.dispose(up);
    };

    Panner.prototype.setPosition = function setPosition(nodeOrListener, vec) {
        nodeOrListener.setPosition(vec.x, vec.y, vec.z);
        vecPool.dispose(vec);
    };

    Panner.prototype.update = function update(_ref2) {
        var x = _ref2.x;
        var y = _ref2.y;
        var z = _ref2.z;

        var v = vecPool.get(x, y, z);

        if (isSafeNumber(x) && !isSafeNumber(y) && !isSafeNumber(z)) {
            // pan left to right with value from -1 to 1
            x = v.x;

            if (x > 1) {
                x = 1;
            }
            if (x < -1) {
                x = -1;
            }

            // creates a nice curve with z
            x = x * angle45;
            z = x + angle90;

            if (z > angle90) {
                z = Math.PI - z;
            }

            v.x = Math.sin(x);
            v.y = 0;
            v.z = Math.sin(z);
        }
        this.setPosition(this._node, v);
    };

    // set the position the audio is coming from)


    Panner.prototype.setSourcePosition = function setSourcePosition(x, y, z) {
        this.setPosition(this._node, vecPool.get(x, y, z));
    };

    // set the direction the audio is coming from)


    Panner.prototype.setSourceOrientation = function setSourceOrientation(x, y, z) {
        this.setOrientation(this._node, vecPool.get(x, y, z));
    };

    // set the position of who or what is hearing the audio (could be camera or some character)


    Panner.prototype.setListenerPosition = function setListenerPosition(x, y, z) {
        this.setPosition(sono$1.context.listener, vecPool.get(x, y, z));
    };

    // set the position of who or what is hearing the audio (could be camera or some character)


    Panner.prototype.setListenerOrientation = function setListenerOrientation(x, y, z) {
        this.setOrientation(sono$1.context.listener, vecPool.get(x, y, z));
    };

    Panner.prototype.getDefaults = function getDefaults() {
        return pannerDefaults;
    };

    Panner.prototype.setDefaults = function setDefaults(defaults$$1) {
        Object.keys(defaults$$1).forEach(function (key) {
            pannerDefaults[key] = defaults$$1[key];
        });
    };

    Panner.prototype.set = function set(x, y, z) {
        return this.update({ x: x, y: y, z: z });
    };

    return Panner;
}(AbstractEffect);

sono$1.register('panner', function (opts) {
    return new Panner(opts);
});

var Phaser = function (_AbstractEffect) {
    inherits(Phaser, _AbstractEffect);

    function Phaser() {
        var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var _ref$stages = _ref.stages;
        var stages = _ref$stages === undefined ? 8 : _ref$stages;
        var _ref$feedback = _ref.feedback;
        var feedback = _ref$feedback === undefined ? 0.5 : _ref$feedback;
        var _ref$frequency = _ref.frequency;
        var frequency = _ref$frequency === undefined ? 0.5 : _ref$frequency;
        var _ref$gain = _ref.gain;
        var gain = _ref$gain === undefined ? 300 : _ref$gain;
        classCallCheck(this, Phaser);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this));

        stages = stages || 8;

        _this._feedback = sono$1.context.createGain();
        _this._lfo = sono$1.context.createOscillator();
        _this._lfoGain = sono$1.context.createGain();
        _this._lfo.type = 'sine';

        var filters = [];
        for (var i = 0; i < stages; i++) {
            var filter = sono$1.context.createBiquadFilter();
            filter.type = 'allpass';
            filter.frequency.value = 1000 * i;
            //filter.Q.value = 10;
            if (i > 0) {
                filters[i - 1].connect(filter);
            }
            _this._lfoGain.connect(filter.frequency);
            filters.push(filter);
        }

        var first = filters[0];
        var last = filters[filters.length - 1];

        _this._in.connect(first);
        _this._in.connect(_this._out);
        last.connect(_this._out);
        last.connect(_this._feedback);
        _this._feedback.connect(first);
        _this._lfo.connect(_this._lfoGain);
        _this._lfo.start(0);

        _this.update({ frequency: frequency, gain: gain, feedback: feedback });
        return _this;
    }

    Phaser.prototype.update = function update(options) {
        this.frequency = options.frequency;
        this.gain = options.gain;
        this.feedback = options.feedback;
    };

    createClass(Phaser, [{
        key: 'frequency',
        get: function get() {
            return this._lfo.frequency.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._lfo.frequency, value);
        }
    }, {
        key: 'gain',
        get: function get() {
            return this._lfoGain.gain.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._lfoGain.gain, value);
        }
    }, {
        key: 'feedback',
        get: function get() {
            return this._feedback.gain.value;
        },
        set: function set(value) {
            this.setSafeParamValue(this._feedback.gain, value);
        }
    }]);
    return Phaser;
}(AbstractEffect);

sono$1.register('phaser', function (opts) {
    return new Phaser(opts);
});

function isDefined(value) {
    return typeof value !== 'undefined';
}

function createImpulseResponse(_ref) {
    var time = _ref.time;
    var decay = _ref.decay;
    var reverse = _ref.reverse;
    var buffer = _ref.buffer;

    var rate = sono$1.context.sampleRate;
    var length = Math.floor(rate * time);

    var impulseResponse = void 0;

    if (buffer && buffer.length === length) {
        impulseResponse = buffer;
    } else {
        impulseResponse = sono$1.context.createBuffer(2, length, rate);
    }

    var left = impulseResponse.getChannelData(0);
    var right = impulseResponse.getChannelData(1);

    var n = void 0,
        e = void 0;
    for (var i = 0; i < length; i++) {
        n = reverse ? length - i : i;
        e = Math.pow(1 - n / length, decay);
        left[i] = (Math.random() * 2 - 1) * e;
        right[i] = (Math.random() * 2 - 1) * e;
    }

    return impulseResponse;
}

var Reverb = function (_AbstractEffect) {
    inherits(Reverb, _AbstractEffect);

    function Reverb() {
        var _ref2 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var _ref2$time = _ref2.time;
        var time = _ref2$time === undefined ? 1 : _ref2$time;
        var _ref2$decay = _ref2.decay;
        var decay = _ref2$decay === undefined ? 5 : _ref2$decay;
        var _ref2$reverse = _ref2.reverse;
        var reverse = _ref2$reverse === undefined ? false : _ref2$reverse;
        classCallCheck(this, Reverb);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this));

        _this._length = 0;
        _this._impulseResponse = null;

        _this._convolver = _this.context.createConvolver();

        _this._in.connect(_this._convolver);
        _this._in.connect(_this._out);
        _this._convolver.connect(_this._out);

        _this._opts = {};

        _this.update({ time: time, decay: decay, reverse: reverse });
        return _this;
    }

    Reverb.prototype.update = function update(_ref3) {
        var time = _ref3.time;
        var decay = _ref3.decay;
        var reverse = _ref3.reverse;

        var changed = false;
        if (time !== this._opts.time && isSafeNumber(time)) {
            this._opts.time = time;
            changed = true;
        }
        if (decay !== this._opts.decay && isSafeNumber(decay)) {
            this._opts.decay = decay;
            changed = true;
        }
        if (isDefined(reverse) && reverse !== this._reverse) {
            this._opts.reverse = reverse;
            changed = true;
        }
        if (!changed) {
            return;
        }
        console.log('this._opts', this._opts);
        this._opts.buffer = createImpulseResponse(this._opts);
        this._convolver.buffer = this._opts.buffer;
    };

    createClass(Reverb, [{
        key: 'time',
        get: function get() {
            return this._opts.time;
        },
        set: function set(value) {
            this.update({ time: value });
        }
    }, {
        key: 'decay',
        get: function get() {
            return this._opts.decay;
        },
        set: function set(value) {
            this.update({ decay: value });
        }
    }, {
        key: 'reverse',
        get: function get() {
            return this._opts.reverse;
        },
        set: function set(value) {
            this.update({ reverse: value });
        }
    }]);
    return Reverb;
}(AbstractEffect);

sono$1.register('reverb', function (opts) {
    return new Reverb(opts);
});

var Script = function (_AbstractEffect) {
    inherits(Script, _AbstractEffect);

    function Script() {
        var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        var _ref$inputChannels = _ref.inputChannels;
        var inputChannels = _ref$inputChannels === undefined ? 1 : _ref$inputChannels;
        var _ref$outputChannels = _ref.outputChannels;
        var outputChannels = _ref$outputChannels === undefined ? 1 : _ref$outputChannels;
        var _ref$bufferSize = _ref.bufferSize;
        var bufferSize = _ref$bufferSize === undefined ? 1024 : _ref$bufferSize;
        var _ref$callback = _ref.callback;
        var callback = _ref$callback === undefined ? null : _ref$callback;
        classCallCheck(this, Script);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this, sono$1.context.createScriptProcessor(bufferSize, inputChannels, outputChannels)));

        _this._callback = callback || function (event) {
            var input = event.inputBuffer.getChannelData(0);
            var output = event.outputBuffer.getChannelData(0);
            var l = output.length;
            for (var i = 0; i < l; i++) {
                output[i] = input[i];
            }
        };

        _this._node.onaudioprocess = _this._callback;
        return _this;
    }

    Script.prototype.update = function update() {};

    return Script;
}(AbstractEffect);

sono$1.register('script', function (opts) {
    return new Script(opts);
});

// sono.register('convolver', function(impulseResponse) {
//     // impulseResponse is an audio file buffer
//     const node = sono.context.createConvolver();
//     node.buffer = impulseResponse;
//     return node;
// });

// sono.register('delay', function(time) {
//     const node = sono.context.createDelay();
//     if (typeof time !== 'undefined') {
//         node.delayTime.value = time;
//     }
//     return node;
// });

function microphone(connected, denied, error) {
    navigator.getUserMedia = navigator.mediaDevices.getUserMedia || navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    error = error || function (err) {
        console.error(err);
    };

    var isSupported = !!navigator.getUserMedia;
    var api = {};
    var stream = null;

    function onConnect(micStream) {
        stream = micStream;
        connected(stream);
    }

    function onError(e) {
        if (denied && e.name === 'PermissionDeniedError' || e === 'PERMISSION_DENIED') {
            denied();
        } else {
            error(e.message || e);
        }
    }

    function connect() {
        if (!isSupported) {
            return api;
        }

        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                audio: true
            }).then(onConnect).catch(onError);
        } else {
            navigator.getUserMedia({
                audio: true
            }, onConnect, onError);
        }
        return api;
    }

    function disconnect() {
        if (stream.stop) {
            stream.stop();
        } else {
            stream.getAudioTracks()[0].stop();
        }
        stream = null;
        return api;
    }

    return Object.assign(api, {
        connect: connect,
        disconnect: disconnect,
        isSupported: isSupported,
        get stream() {
            return stream;
        }
    });
}

sono$1.register('microphone', microphone, [sono$1.utils]);

function recorder() {
    var passThrough = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

    var bufferLength = 4096;
    var buffersL = [];
    var buffersR = [];
    var startedAt = 0;
    var stoppedAt = 0;
    var script = null;
    var isRecording = false;
    var soundOb = null;

    var input = sono$1.context.createGain();
    var output = sono$1.context.createGain();
    output.gain.value = passThrough ? 1 : 0;

    var node = {
        in: input,
        out: output
    };

    function mergeBuffers(buffers, length) {
        var buffer = new Float32Array(length);
        var offset = 0;
        for (var i = 0; i < buffers.length; i++) {
            buffer.set(buffers[i], offset);
            offset += buffers[i].length;
        }
        return buffer;
    }

    function getBuffer() {
        if (!buffersL.length) {
            return sono$1.context.createBuffer(2, bufferLength, sono$1.context.sampleRate);
        }
        var recordingLength = buffersL.length * bufferLength;
        var buffer = sono$1.context.createBuffer(2, recordingLength, sono$1.context.sampleRate);
        buffer.getChannelData(0).set(mergeBuffers(buffersL, recordingLength));
        buffer.getChannelData(1).set(mergeBuffers(buffersR, recordingLength));
        return buffer;
    }

    function destroyScriptProcessor() {
        if (script) {
            script.onaudioprocess = null;
            input.disconnect();
            script.disconnect();
        }
    }

    function createScriptProcessor() {
        destroyScriptProcessor();

        script = sono$1.context.createScriptProcessor(bufferLength, 2, 2);
        input.connect(script);
        script.connect(output);
        script.connect(sono$1.context.destination);
        // output.connect(sono.context.destination);


        script.onaudioprocess = function (event) {
            var inputL = event.inputBuffer.getChannelData(0);
            var inputR = event.inputBuffer.getChannelData(1);

            if (passThrough) {
                var outputL = event.outputBuffer.getChannelData(0);
                var outputR = event.outputBuffer.getChannelData(1);
                outputL.set(inputL);
                outputR.set(inputR);
            }

            if (isRecording) {
                buffersL.push(new Float32Array(inputL));
                buffersR.push(new Float32Array(inputR));
            }
        };
    }

    return {
        start: function start(sound) {
            if (!sound) {
                return;
            }
            createScriptProcessor();
            buffersL.length = 0;
            buffersR.length = 0;
            startedAt = sono$1.context.currentTime;
            stoppedAt = 0;
            soundOb = sound;
            sound.effect.add(node);
            isRecording = true;
        },
        stop: function stop() {
            soundOb.effect.remove(node);
            soundOb = null;
            stoppedAt = sono$1.context.currentTime;
            isRecording = false;
            destroyScriptProcessor();
            return getBuffer();
        },
        getDuration: function getDuration() {
            if (!isRecording) {
                return stoppedAt - startedAt;
            }
            return sono$1.context.currentTime - startedAt;
        },

        get isRecording() {
            return isRecording;
        }
    };
}

sono$1.register('recorder', recorder, [sono$1.utils]);

function waveform$1() {
    var buffer = void 0,
        wave = void 0;

    return function (audioBuffer, length) {
        if (!window.Float32Array || !window.AudioBuffer) {
            return [];
        }

        var sameBuffer = buffer === audioBuffer;
        var sameLength = wave && wave.length === length;
        if (sameBuffer && sameLength) {
            return wave;
        }

        //console.time('waveData');
        if (!wave || wave.length !== length) {
            wave = new Float32Array(length);
        }

        if (!audioBuffer) {
            return wave;
        }

        // cache for repeated calls
        buffer = audioBuffer;

        var chunk = Math.floor(buffer.length / length),
            resolution = 5,
            // 10
        incr = Math.max(Math.floor(chunk / resolution), 1);
        var greatest = 0;

        for (var i = 0; i < buffer.numberOfChannels; i++) {
            // check each channel
            var channel = buffer.getChannelData(i);
            for (var j = 0; j < length; j++) {
                // get highest value within the chunk
                for (var k = j * chunk, l = k + chunk; k < l; k += incr) {
                    // select highest value from channels
                    var a = channel[k];
                    if (a < 0) {
                        a = -a;
                    }
                    if (a > wave[j]) {
                        wave[j] = a;
                    }
                    // update highest overall for scaling
                    if (a > greatest) {
                        greatest = a;
                    }
                }
            }
        }
        // scale up
        var scale = 1 / greatest;
        for (var _i = 0; _i < wave.length; _i++) {
            wave[_i] *= scale;
        }
        //console.timeEnd('waveData');

        return wave;
    };
}

sono$1.register('waveform', waveform$1, [sono$1.utils]);

var halfPI = Math.PI / 2;
var twoPI = Math.PI * 2;

function waveformer(config) {

    var style = config.style || 'fill',
        // 'fill' or 'line'
    shape = config.shape || 'linear',
        // 'circular' or 'linear'
    color = config.color || 0,
        bgColor = config.bgColor,
        lineWidth = config.lineWidth || 1,
        percent = config.percent || 1,
        originX = config.x || 0,
        originY = config.y || 0,
        transform = config.transform;

    var canvas = config.canvas,
        width = config.width || canvas && canvas.width,
        height = config.height || canvas && canvas.height;

    var ctx = null,
        currentColor = void 0,
        i = void 0,
        x = void 0,
        y = void 0,
        radius = void 0,
        innerRadius = void 0,
        centerX = void 0,
        centerY = void 0;

    if (!canvas && !config.context) {
        canvas = document.createElement('canvas');
        width = width || canvas.width;
        height = height || canvas.height;
        canvas.width = height;
        canvas.height = height;
    }

    if (shape === 'circular') {
        radius = config.radius || Math.min(height / 2, width / 2);
        innerRadius = config.innerRadius || radius / 2;
        centerX = originX + width / 2;
        centerY = originY + height / 2;
    }

    ctx = config.context || canvas.getContext('2d');

    function clear() {
        if (bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(originX, originY, width, height);
        } else {
            ctx.clearRect(originX, originY, width, height);
        }

        ctx.lineWidth = lineWidth;

        currentColor = null;

        if (typeof color !== 'function') {
            ctx.strokeStyle = color;
            ctx.beginPath();
        }
    }

    function updateColor(position, length, value) {
        if (typeof color === 'function') {
            var newColor = color(position, length, value);
            if (newColor !== currentColor) {
                currentColor = newColor;
                ctx.stroke();
                ctx.strokeStyle = currentColor;
                ctx.beginPath();
            }
        }
    }

    function getValue(value, position, length) {
        if (typeof transform === 'function') {
            return transform(value, position, length);
        }
        return value;
    }

    function getWaveform(value, length) {
        if (value && typeof value.waveform === 'function') {
            return value.waveform(length);
        }
        if (value) {
            return value;
        }
        if (config.waveform) {
            return config.waveform;
        }
        if (config.sound) {
            return config.sound.waveform(length);
        }
        return null;
    }

    function update(wave) {

        clear();

        if (shape === 'circular') {
            var waveform = getWaveform(wave, 360);
            var length = Math.floor(waveform.length * percent);

            var step = twoPI / length;
            var angle = void 0,
                magnitude = void 0,
                sine = void 0,
                cosine = void 0;

            for (i = 0; i < length; i++) {
                var value = getValue(waveform[i], i, length);
                updateColor(i, length, value);

                angle = i * step - halfPI;
                cosine = Math.cos(angle);
                sine = Math.sin(angle);

                if (style === 'fill') {
                    x = centerX + innerRadius * cosine;
                    y = centerY + innerRadius * sine;
                    ctx.moveTo(x, y);
                }

                magnitude = innerRadius + (radius - innerRadius) * value;
                x = centerX + magnitude * cosine;
                y = centerY + magnitude * sine;

                if (style === 'line' && i === 0) {
                    ctx.moveTo(x, y);
                }

                ctx.lineTo(x, y);
            }

            if (style === 'line') {
                ctx.closePath();
            }
        } else {

            var _waveform = getWaveform(wave, width);
            var _length = Math.min(_waveform.length, width - lineWidth / 2);
            _length = Math.floor(_length * percent);

            for (i = 0; i < _length; i++) {
                var _value = getValue(_waveform[i], i, _length);
                updateColor(i, _length, _value);

                if (style === 'line' && i > 0) {
                    ctx.lineTo(x, y);
                }

                x = originX + i;
                y = originY + height - Math.round(height * _value);
                y = Math.floor(Math.min(y, originY + height - lineWidth / 2));

                if (style === 'fill') {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, originY + height);
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();
    }

    update.canvas = canvas;

    if (config.waveform || config.sound) {
        update();
    }

    return update;
}

sono$1.register('waveformer', waveformer, [sono$1.utils]);

return sono$1;

})));
//# sourceMappingURL=sono.js.map
