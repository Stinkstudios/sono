(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.sono = factory());
}(this, (function () { 'use strict';

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var _global = createCommonjsModule(function (module) {
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef
});

var _core = createCommonjsModule(function (module) {
var core = module.exports = {version: '2.4.0'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef
});

var _isObject = function(it){
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

var _anObject = function(it){
  if(!_isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};

var _fails = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};

// Thank's IE8 for his funny defineProperty
var _descriptors = !_fails(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});

var document$1 = _global.document;
var is = _isObject(document$1) && _isObject(document$1.createElement);
var _domCreate = function(it){
  return is ? document$1.createElement(it) : {};
};

var _ie8DomDefine = !_descriptors && !_fails(function(){
  return Object.defineProperty(_domCreate('div'), 'a', {get: function(){ return 7; }}).a != 7;
});

// 7.1.1 ToPrimitive(input [, PreferredType])

// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
var _toPrimitive = function(it, S){
  if(!_isObject(it))return it;
  var fn, val;
  if(S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it)))return val;
  if(typeof (fn = it.valueOf) == 'function' && !_isObject(val = fn.call(it)))return val;
  if(!S && typeof (fn = it.toString) == 'function' && !_isObject(val = fn.call(it)))return val;
  throw TypeError("Can't convert object to primitive value");
};

var dP             = Object.defineProperty;

var f = _descriptors ? Object.defineProperty : function defineProperty(O, P, Attributes){
  _anObject(O);
  P = _toPrimitive(P, true);
  _anObject(Attributes);
  if(_ie8DomDefine)try {
    return dP(O, P, Attributes);
  } catch(e){ /* empty */ }
  if('get' in Attributes || 'set' in Attributes)throw TypeError('Accessors not supported!');
  if('value' in Attributes)O[P] = Attributes.value;
  return O;
};

var _objectDp = {
	f: f
};

var _propertyDesc = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};

var _hide = _descriptors ? function(object, key, value){
  return _objectDp.f(object, key, _propertyDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};

var hasOwnProperty = {}.hasOwnProperty;
var _has = function(it, key){
  return hasOwnProperty.call(it, key);
};

var id = 0;
var px = Math.random();
var _uid = function(key){
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};

var _redefine = createCommonjsModule(function (module) {
var SRC       = _uid('src')
  , TO_STRING = 'toString'
  , $toString = Function[TO_STRING]
  , TPL       = ('' + $toString).split(TO_STRING);

_core.inspectSource = function(it){
  return $toString.call(it);
};

(module.exports = function(O, key, val, safe){
  var isFunction = typeof val == 'function';
  if(isFunction)_has(val, 'name') || _hide(val, 'name', key);
  if(O[key] === val)return;
  if(isFunction)_has(val, SRC) || _hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));
  if(O === _global){
    O[key] = val;
  } else {
    if(!safe){
      delete O[key];
      _hide(O, key, val);
    } else {
      if(O[key])O[key] = val;
      else _hide(O, key, val);
    }
  }
// add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
})(Function.prototype, TO_STRING, function toString(){
  return typeof this == 'function' && this[SRC] || $toString.call(this);
});
});

var _aFunction = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};

// optional / simple context binding

var _ctx = function(fn, that, length){
  _aFunction(fn);
  if(that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    };
    case 2: return function(a, b){
      return fn.call(that, a, b);
    };
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    };
  }
  return function(/* ...args */){
    return fn.apply(that, arguments);
  };
};

var PROTOTYPE = 'prototype';

var $export = function(type, name, source){
  var IS_FORCED = type & $export.F
    , IS_GLOBAL = type & $export.G
    , IS_STATIC = type & $export.S
    , IS_PROTO  = type & $export.P
    , IS_BIND   = type & $export.B
    , target    = IS_GLOBAL ? _global : IS_STATIC ? _global[name] || (_global[name] = {}) : (_global[name] || {})[PROTOTYPE]
    , exports   = IS_GLOBAL ? _core : _core[name] || (_core[name] = {})
    , expProto  = exports[PROTOTYPE] || (exports[PROTOTYPE] = {})
    , key, own, out, exp;
  if(IS_GLOBAL)source = name;
  for(key in source){
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    // export native or passed
    out = (own ? target : source)[key];
    // bind timers to global for call from export context
    exp = IS_BIND && own ? _ctx(out, _global) : IS_PROTO && typeof out == 'function' ? _ctx(Function.call, out) : out;
    // extend global
    if(target)_redefine(target, key, out, type & $export.U);
    // export
    if(exports[key] != out)_hide(exports, key, exp);
    if(IS_PROTO && expProto[key] != out)expProto[key] = out;
  }
};
_global.core = _core;
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library` 
var _export = $export;

var toString = {}.toString;

var _cof = function(it){
  return toString.call(it).slice(8, -1);
};

// fallback for non-array-like ES3 and non-enumerable old V8 strings

var _iobject = Object('z').propertyIsEnumerable(0) ? Object : function(it){
  return _cof(it) == 'String' ? it.split('') : Object(it);
};

// 7.2.1 RequireObjectCoercible(argument)
var _defined = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};

// to indexed object, toObject with fallback for non-array-like ES3 strings

var _toIobject = function(it){
  return _iobject(_defined(it));
};

// 7.1.4 ToInteger
var ceil  = Math.ceil;
var floor = Math.floor;
var _toInteger = function(it){
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};

// 7.1.15 ToLength
var min       = Math.min;
var _toLength = function(it){
  return it > 0 ? min(_toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};

var max       = Math.max;
var min$1       = Math.min;
var _toIndex = function(index, length){
  index = _toInteger(index);
  return index < 0 ? max(index + length, 0) : min$1(index, length);
};

// false -> Array#indexOf
// true  -> Array#includes

var _arrayIncludes = function(IS_INCLUDES){
  return function($this, el, fromIndex){
    var O      = _toIobject($this)
      , length = _toLength(O.length)
      , index  = _toIndex(fromIndex, length)
      , value;
    // Array#includes uses SameValueZero equality algorithm
    if(IS_INCLUDES && el != el)while(length > index){
      value = O[index++];
      if(value != value)return true;
    // Array#toIndex ignores holes, Array#includes - not
    } else for(;length > index; index++)if(IS_INCLUDES || index in O){
      if(O[index] === el)return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

var SHARED = '__core-js_shared__';
var store  = _global[SHARED] || (_global[SHARED] = {});
var _shared = function(key){
  return store[key] || (store[key] = {});
};

var shared = _shared('keys');
var _sharedKey = function(key){
  return shared[key] || (shared[key] = _uid(key));
};

var arrayIndexOf = _arrayIncludes(false);
var IE_PROTO     = _sharedKey('IE_PROTO');

var _objectKeysInternal = function(object, names){
  var O      = _toIobject(object)
    , i      = 0
    , result = []
    , key;
  for(key in O)if(key != IE_PROTO)_has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while(names.length > i)if(_has(O, key = names[i++])){
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};

// IE 8- don't enum bug keys
var _enumBugKeys = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');

// 19.1.2.14 / 15.2.3.14 Object.keys(O)


var _objectKeys = Object.keys || function keys(O){
  return _objectKeysInternal(O, _enumBugKeys);
};

var f$1 = Object.getOwnPropertySymbols;

var _objectGops = {
	f: f$1
};

var f$2 = {}.propertyIsEnumerable;

var _objectPie = {
	f: f$2
};

// 7.1.13 ToObject(argument)

var _toObject = function(it){
  return Object(_defined(it));
};

// 19.1.2.1 Object.assign(target, source, ...)
var $assign  = Object.assign;

// should work with symbols and should have deterministic property order (V8 bug)
var _objectAssign = !$assign || _fails(function(){
  var A = {}
    , B = {}
    , S = Symbol()
    , K = 'abcdefghijklmnopqrst';
  A[S] = 7;
  K.split('').forEach(function(k){ B[k] = k; });
  return $assign({}, A)[S] != 7 || Object.keys($assign({}, B)).join('') != K;
}) ? function assign(target, source){ // eslint-disable-line no-unused-vars
  var T     = _toObject(target)
    , aLen  = arguments.length
    , index = 1
    , getSymbols = _objectGops.f
    , isEnum     = _objectPie.f;
  while(aLen > index){
    var S      = _iobject(arguments[index++])
      , keys   = getSymbols ? _objectKeys(S).concat(getSymbols(S)) : _objectKeys(S)
      , length = keys.length
      , j      = 0
      , key;
    while(length > j)if(isEnum.call(S, key = keys[j++]))T[key] = S[key];
  } return T;
} : $assign;

// 19.1.3.1 Object.assign(target, source)


_export(_export.S + _export.F, 'Object', {assign: _objectAssign});

function dummy(context) {
    var buffer = context.createBuffer(1, 1, context.sampleRate);
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);
    source.stop(0);
    source.disconnect();
}

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
        activeSourceCount: 0,
        createAnalyser: fakeNode,
        createBuffer: fakeNode,
        createBufferSource: fakeNode,
        createMediaElementSource: fakeNode,
        createMediaStreamSource: fakeNode,
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
        decodeAudioData: fn,
        destination: fakeNode,
        listener: fakeNode(),
        sampleRate: 44100,
        state: '',
        get currentTime() {
            return (Date.now() - startTime) / 1000;
        }
    };
}

var iOS = navigator && /(iPhone|iPad|iPod)/i.test(navigator.userAgent);

var desiredSampleRate = 44100;

var Ctx = window.AudioContext || window.webkitAudioContext || FakeContext;

var context = new Ctx();

if (!context) {
    context = new FakeContext();
}

// Check if hack is necessary. Only occurs in iOS6+ devices
// and only when you first boot the iPhone, or play a audio/video
// with a different sample rate
// https://github.com/Jam3/ios-safe-audio-context/blob/master/index.js
if (iOS && context.sampleRate !== desiredSampleRate) {
    dummy(context);
    context.close(); // dispose old context
    context = new Ctx();
}

// Handles bug in Safari 9 OSX where AudioContext instance starts in 'suspended' state
if (context.state === 'suspended' && typeof context.resume === 'function') {
    window.setTimeout(function () {
        return context.resume();
    }, 1000);
}

var context$1 = context;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
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











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var Effects = function () {
    function Effects(context) {
        var _this = this;

        classCallCheck(this, Effects);

        this.context = context;
        this._destination = null;
        this._source = null;

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

function isURL(data) {
    return !!(data && typeof data === 'string' && (data.indexOf('.') > -1 || data.slice(0, 5) === 'data:'));
}

function containsURL(config) {
    if (!config || isMediaElement(config)) {
        return false;
    }
    // string, array or object with src/url/data property that is string, array or arraybuffer
    var src = getSrc(config);
    return isURL(src) || isArrayBuffer(src) || Array.isArray(src) && isURL(src[0]);
}

function getSrc(config) {
    return config.src || config.url || config.data || config;
}

var file = {
    canPlay: canPlay,
    containsURL: containsURL,
    extensions: extensions,
    getFileExtension: getFileExtension,
    getSrc: getSrc,
    getSupportedFile: getSupportedFile,
    isAudioBuffer: isAudioBuffer,
    isArrayBuffer: isArrayBuffer,
    isMediaElement: isMediaElement,
    isMediaStream: isMediaStream,
    isOscillatorType: isOscillatorType,
    isURL: isURL
};

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
            return sound.load();
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
        (isObject$1(this._events.error) && !this._events.error.length)) {
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
  } else if (isObject$1(handler)) {
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
  else if (isObject$1(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject$1(this._events[type]) && !this._events[type].warned) {
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

  } else if (isObject$1(list)) {
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

function isObject$1(arg) {
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
        var force = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

        if (!url || deferLoad && !force) {
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
        },
        url: {
            get: function get() {
                return url;
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

function log(api) {
    var title = 'sono ' + api.VERSION,
        info = 'Supported:' + api.isSupported + ' WebAudioAPI:' + api.hasWebAudio + ' TouchLocked:' + api.isTouchLocked + ' State:' + (api.context && api.context.state) + ' Extensions:' + api.file.extensions;

    if (navigator.userAgent.indexOf('Chrome') > -1) {
        var args = ['%c ♫ ' + title + ' ♫ %c ' + info + ' ', 'color: #FFFFFF; background: #379F7A', 'color: #1F1C0D; background: #E0FBAC'];
        console.log.apply(console, args);
    } else if (window.console && window.console.log.call) {
        console.log.call(console, title + ' ' + info);
    }
}

function pageVisibility(onHidden, onShown) {
    var hidden = null;
    var visibilityChange = null;

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
}

function BufferSource(buffer, context, endedCallback) {
    var api = {};
    var ended = false;
    var loop = false;
    var paused = false;
    var cuedAt = 0;
    var playbackRate = 1;
    var playing = false;
    var sourceNode = null;
    var startedAt = 0;

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
        cuedAt = 0;
        playing = false;
        startedAt = 0;
    }

    function pause() {
        var elapsed = context.currentTime - startedAt;
        stop();
        cuedAt = elapsed;
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

    function play() {
        var delay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

        if (playing) {
            return;
        }

        delay = delay ? context.currentTime + delay : 0;

        if (offset) {
            cuedAt = 0;
        }

        if (cuedAt) {
            offset = cuedAt;
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
        cuedAt = 0;
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
                if (cuedAt) {
                    return cuedAt;
                }
                if (startedAt) {
                    return context.currentTime - startedAt;
                }
                return 0;
            },
            set: function set(value) {
                cuedAt = value;
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
    var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var length = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : buffer.length;

    if (!context$1 || context$1.isFake) {
        return buffer;
    }
    var numChannels = buffer.numberOfChannels;
    var cloned = context$1.createBuffer(numChannels, length, buffer.sampleRate);
    for (var i = 0; i < numChannels; i++) {
        cloned.getChannelData(i).set(buffer.getChannelData(i).slice(offset, offset + length));
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
    if (context$1.isFake) {
        return;
    }

    param.setValueAtTime(fromValue, context$1.currentTime);

    if (linear) {
        param.linearRampToValueAtTime(toValue, context$1.currentTime + duration);
    } else {
        param.exponentialRampToValueAtTime(toValue, context$1.currentTime + duration);
    }
}

/*
 * get frequency from min to max by passing 0 to 1
 */

function getFrequency(value) {
    if (context$1.isFake) {
        return 0;
    }
    // get frequency by passing number from 0 to 1
    // Clamp the frequency between the minimum value (40 Hz) and half of the
    // sampling rate.
    var minValue = 40;
    var maxValue = context$1.sampleRate / 2;
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
    var delim = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ':';

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

function isSafeNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

function AudioSource(Type, data, context, onEnded) {
    var sourceNode = context.createGain();
    var source = create(data);
    var api = {};
    var pool = [];
    var clones = [];
    var numCreated = 0;
    var singlePlay = false;

    function createSourceNode() {
        return sourceNode;
    }

    function disposeSource(src) {
        src.stop();
        if (!singlePlay) {
            pool.push(src);
        }
    }

    function onSourceEnded(src) {
        if (clones.length) {
            var index = clones.indexOf(src);
            clones.splice(index, 1);
            disposeSource(src);
        }
        onEnded();
    }

    function create(buffer) {
        return new Type(buffer, context, onSourceEnded);
    }

    function getSource() {
        if (singlePlay || !source.playing) {
            return source;
        }

        if (pool.length > 0) {
            return pool.pop();
        }

        numCreated++;
        if (data.tagName) {
            return create(data.cloneNode());
        }
        return create(data);
    }

    function play(delay, offset) {
        var src = getSource();
        if (sourceNode) {
            src.sourceNode.connect(sourceNode);
        }
        if (src !== source) {
            clones.push(src);
        }
        src.play(delay, offset);
    }

    function stop() {
        source.stop();
        while (clones.length) {
            disposeSource(clones.pop());
        }
    }

    function pause() {
        source.pause();
        clones.forEach(function (src) {
            return src.pause();
        });
    }

    function load(url) {
        stop();
        pool.length = 0;
        source.load(url);
    }

    function fade(volume, duration) {
        if (typeof source.fade === 'function') {
            source.fade(volume, duration);
            clones.forEach(function (src) {
                return src.fade(volume, duration);
            });
        }
    }

    function destroy() {
        source.destroy();
        while (clones.length) {
            clones.pop().destroy();
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
                return source.currentTime || 0;
            },
            set: function set(value) {
                source.currentTime = value;
                clones.forEach(function (src) {
                    return src.currentTime = value;
                });
            }
        },
        duration: {
            get: function get() {
                return source.duration || 0;
            }
        },
        ended: {
            get: function get() {
                return source.ended && clones.every(function (src) {
                    return src.ended;
                });
            }
        },
        info: {
            get: function get() {
                return {
                    pooled: pool.length,
                    active: clones.length + 1,
                    created: numCreated + 1
                };
            }
        },
        loop: {
            get: function get() {
                return source.loop;
            },
            set: function set(value) {
                source.loop = !!value;
                clones.forEach(function (src) {
                    return src.loop = !!value;
                });
            }
        },
        paused: {
            get: function get() {
                return source.paused;
            }
        },
        playbackRate: {
            get: function get() {
                return source.playbackRate;
            },
            set: function set(value) {
                source.playbackRate = value;
                clones.forEach(function (src) {
                    return src.playbackRate = value;
                });
            }
        },
        playing: {
            get: function get() {
                return source.playing;
            }
        },
        progress: {
            get: function get() {
                return source.progress;
            }
        },
        singlePlay: {
            get: function get() {
                return singlePlay;
            },
            set: function set(value) {
                singlePlay = value;
            }
        },
        sourceNode: {
            get: function get() {
                return createSourceNode();
            }
        },
        volume: {
            get: function get() {
                return source.volume;
            },
            set: function set(value) {
                if (source.hasOwnProperty('volume')) {
                    source.volume = value;
                    clones.forEach(function (src) {
                        return src.volume = value;
                    });
                }
            }
        },
        groupVolume: {
            get: function get() {
                return source.groupVolume;
            },
            set: function set(value) {
                if (!source.hasOwnProperty('groupVolume')) {
                    return;
                }
                source.groupVolume = value;
                clones.forEach(function (src) {
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
            // el.load();
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
        if (context && !context.isFake) {
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
            },
            set: function set(value) {
                if (el) {
                    el.currentTime = value;
                }
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
        cuedAt = 0,
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

        startedAt = context.currentTime - cuedAt;
        ended = false;
        playing = true;
        paused = false;
        cuedAt = 0;
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
        cuedAt = 0;
        playing = false;
        startedAt = 0;
    }

    function pause() {
        var elapsed = context.currentTime - startedAt;
        stop();
        cuedAt = elapsed;
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
                if (cuedAt) {
                    return cuedAt;
                }
                if (startedAt) {
                    return context.currentTime - startedAt;
                }
                return 0;
            },
            set: function set(value) {
                cuedAt = value;
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
        cuedAt = 0,
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

        if (cuedAt) {
            startedAt = context.currentTime - cuedAt;
        } else {
            startedAt = context.currentTime;
        }

        ended = false;
        playing = true;
        paused = false;
        cuedAt = 0;
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
        cuedAt = 0;
        playing = false;
        startedAt = 0;
    }

    function pause() {
        var elapsed = context.currentTime - startedAt;
        stop();
        cuedAt = elapsed;
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
                if (cuedAt) {
                    return cuedAt;
                }
                if (startedAt) {
                    return context.currentTime - startedAt;
                }
                return 0;
            },
            set: function set(value) {
                cuedAt = value;
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

var Sound = function (_Emitter) {
    inherits(Sound, _Emitter);

    function Sound(config) {
        classCallCheck(this, Sound);

        var _this = possibleConstructorReturn(this, _Emitter.call(this));

        _this.id = config.id || null;

        _this._context = config.context || context$1;
        _this._destination = config.destination || _this._context.destination;
        _this._effects = new Effects(_this._context);
        _this._gain = _this._context.createGain();
        _this._config = config;

        _this._data = null;
        _this._isTouchLocked = false;
        _this._loader = null;
        _this._loop = false;
        _this._offset = 0;
        _this._playbackRate = 1;
        _this._playWhenReady = null;
        _this._source = null;
        _this._wave = null;
        _this._userData = {};

        _this._effects.setDestination(_this._gain);
        _this._gain.connect(_this._destination);

        _this._onEnded = _this._onEnded.bind(_this);
        _this._onLoad = _this._onLoad.bind(_this);
        _this._onLoadError = _this._onLoadError.bind(_this);
        return _this;
    }

    Sound.prototype.prepare = function prepare() {
        var newConfig = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var force = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

        var skipLoad = !force && !this._source && !!this._config.deferLoad;

        if (newConfig) {
            var configSrc = file.getSrc(newConfig);
            var src = file.getSupportedFile(configSrc) || this._config.src;
            this._config = Object.assign(this._config, newConfig, { src: src });
        }

        if (this._source && this._data && this._data.tagName) {
            this._source.load(this._config.src);
        } else {
            this._loader = new Loader(this._config.src, skipLoad);
            this._loader.audioContext = !!this._config.asMediaElement || this._context.isFake ? null : this._context;
            this._loader.isTouchLocked = this._isTouchLocked;
            this._loader.once('loaded', this._onLoad);
            this._loader.on('error', this._onLoadError);
        }
        return this;
    };

    Sound.prototype.load = function load() {
        var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

        this.stop();
        this._source = null;

        if (!config || file.containsURL(config)) {
            if (this._loader) {
                this._loader.destroy();
            }
            this.prepare(config, true);
            this._loader.start();
        } else {
            this.data = config.data || config;
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
                    this.prepare(null, true);
                }
                this._loader.start(true);
            }
            return this;
        }
        this._playWhenReady = null;
        this._effects.setSource(this._source.sourceNode);

        if (this._offset && typeof offset === 'undefined') {
            offset = this._offset;
            this._offset = 0;
        }

        this._source.play(delay, offset);

        if (this._source.hasOwnProperty('volume')) {
            this._source.volume = this._gain.gain.value;
        }

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

    Sound.prototype.seek = function seek(value) {
        this.currentTime = value;
        return this;
    };

    Sound.prototype.fade = function fade(volume) {
        var duration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

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
        var isAudioBuffer = file.isAudioBuffer(data);
        if (isAudioBuffer || file.isMediaElement(data)) {
            var Fn = isAudioBuffer ? BufferSource : MediaSource;
            this._source = new AudioSource(Fn, data, this._context, this._onEnded);
            this._source.singlePlay = !!this._config.singlePlay;
            this._source.playbackRate = this._playbackRate;
            this._source.currentTime = this._offset;
        } else if (file.isMediaStream(data)) {
            this._source = new MicrophoneSource(data, this._context);
        } else if (file.isOscillatorType(data && data.type || data)) {
            this._source = new OscillatorSource(data.type || data, this._context);
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

    Sound.prototype._onLoad = function _onLoad(data) {
        this._data = data;
        this.emit('loaded', this);
        this._createSource(data);
    };

    Sound.prototype._onLoadError = function _onLoadError(err) {
        if (!this.listenerCount('error')) {
            console.error('Sound load error', this.id, this._loader.url);
        }
        this.emit('error', this, err);
    };

    createClass(Sound, [{
        key: 'context',
        get: function get$$1() {
            return this._context;
        }
    }, {
        key: 'currentTime',
        get: function get$$1() {
            return this._source ? this._source.currentTime : this._offset;
        },
        set: function set$$1(value) {
            if (this._source) {
                var playing = this._source.playing;
                this._source.stop();
                this._source.currentTime = value;
                if (playing) {
                    this.play(0, value);
                }
            } else {
                this._offset = value;
            }
        }
    }, {
        key: 'data',
        get: function get$$1() {
            return this._data;
        },
        set: function set$$1(value) {
            if (!value) {
                return;
            }
            this._data = value;
            this._createSource(value);
        }
    }, {
        key: 'duration',
        get: function get$$1() {
            return this._source ? this._source.duration : 0;
        }
    }, {
        key: 'effects',
        get: function get$$1() {
            return this._effects._nodes;
        },
        set: function set$$1(value) {
            this._effects.removeAll().add(value);
        }
    }, {
        key: 'fx',
        get: function get$$1() {
            return this.effects;
        },
        set: function set$$1(value) {
            this.effects = value;
        }
    }, {
        key: 'ended',
        get: function get$$1() {
            return !!this._source && this._source.ended;
        }
    }, {
        key: 'frequency',
        get: function get$$1() {
            return this._source ? this._source.frequency : 0;
        },
        set: function set$$1(value) {
            if (this._source && this._source.hasOwnProperty('frequency')) {
                this._source.frequency = value;
            }
        }
    }, {
        key: 'gain',
        get: function get$$1() {
            return this._gain;
        }

        // for media element source

    }, {
        key: 'groupVolume',
        get: function get$$1() {
            return this._source.groupVolume;
        },
        set: function set$$1(value) {
            if (this._source && this._source.hasOwnProperty('groupVolume')) {
                this._source.groupVolume = value;
            }
        }
    }, {
        key: 'isTouchLocked',
        set: function set$$1(value) {
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
        get: function get$$1() {
            return this._loader;
        }
    }, {
        key: 'loop',
        get: function get$$1() {
            return this._loop;
        },
        set: function set$$1(value) {
            this._loop = !!value;

            if (this._source && this._source.hasOwnProperty('loop') && this._source.loop !== this._loop) {
                this._source.loop = this._loop;
            }
        }
    }, {
        key: 'singlePlay',
        get: function get$$1() {
            return this._config.singlePlay;
        },
        set: function set$$1(value) {
            this._config.singlePlay = value;
            this._source.singlePlay = value;
        }
    }, {
        key: 'config',
        get: function get$$1() {
            return this._config;
        }
    }, {
        key: 'paused',
        get: function get$$1() {
            return !!this._source && this._source.paused;
        }
    }, {
        key: 'playing',
        get: function get$$1() {
            return !!this._source && this._source.playing;
        }
    }, {
        key: 'playbackRate',
        get: function get$$1() {
            return this._playbackRate;
        },
        set: function set$$1(value) {
            this._playbackRate = value;
            if (this._source) {
                this._source.playbackRate = value;
            }
        }
    }, {
        key: 'progress',
        get: function get$$1() {
            return this._source ? this._source.progress || 0 : 0;
        }
    }, {
        key: 'sourceInfo',
        get: function get$$1() {
            return this._source && this._source.info ? this._source.info : {};
        }
    }, {
        key: 'sourceNode',
        get: function get$$1() {
            return this._source ? this._source.sourceNode : null;
        }
    }, {
        key: 'volume',
        get: function get$$1() {
            return this._gain.gain.value;
        },
        set: function set$$1(value) {
            if (!isSafeNumber(value)) {
                return;
            }

            value = Math.min(Math.max(value, 0), 1);

            var param = this._gain.gain;
            var time = this._context.currentTime;
            param.cancelScheduledValues(time);
            param.value = value;
            param.setValueAtTime(value, time);

            if (this._source && this._source.hasOwnProperty('volume')) {
                this._source.volume = value;
            }
        }
    }, {
        key: 'userData',
        get: function get$$1() {
            return this._userData;
        }
    }]);
    return Sound;
}(Emitter);

Sound.__source = {
    BufferSource: BufferSource,
    MediaSource: MediaSource,
    MicrophoneSource: MicrophoneSource,
    OscillatorSource: OscillatorSource
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

function touchLock(context, callback) {
    var locked = iOS;

    function unlock() {
        if (context && context.state === 'suspended') {
            context.resume().then(function () {
                dummy(context);
                unlocked();
            });
        } else {
            unlocked();
        }
    }

    function unlocked() {
        document.body.removeEventListener('touchstart', unlock);
        document.body.removeEventListener('touchend', unlock);
        callback();
    }

    if (locked) {
        document.body.addEventListener('touchstart', unlock, false);
        document.body.addEventListener('touchend', unlock, false);
    }

    return locked;
}

var _effects;
var _effects2;
var _fx;
var _fx2;
var _isTouchLocked;
var _sounds;
var _volume;
var _volume2;
var _sono;
var _mutatorMap;

var VERSION = '2.0.7';
var bus = new Group(context$1, context$1.destination);

/*
* Get Sound by id
*/

function get$$1(id) {
    return bus.find(id);
}

/*
* Create group
*/

function group(sounds) {
    var soundGroup = new SoundGroup(context$1, bus.gain);
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
    var src = file.getSupportedFile(config.src || config.url || config.data || config);
    var sound = new Sound(Object.assign({}, config || {}, {
        src: src,
        context: context$1,
        destination: bus.gain
    }));
    sound.isTouchLocked = isTouchLocked;
    if (config) {
        sound.id = config.id || config.name || '';
        sound.loop = !!config.loop;
        sound.volume = config.volume;
        sound.effects = config.effects || [];
    }
    bus.add(sound);
    return sound;
}

function queue(config, loaderGroup) {
    var sound = add(config).prepare();

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
*/

function create(config) {
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

function destroy(soundOrId) {
    bus.find(soundOrId, function (sound) {
        return sound.destroy();
    });
    return sono$1;
}

function destroyAll() {
    bus.destroy();
    return sono$1;
}

/*
* Controls
*/

function mute() {
    bus.mute();
    return sono$1;
}

function unMute() {
    bus.unMute();
    return sono$1;
}

function fade(volume, duration) {
    bus.fade(volume, duration);
    return sono$1;
}

function pauseAll() {
    bus.pause();
    return sono$1;
}

function resumeAll() {
    bus.resume();
    return sono$1;
}

function stopAll() {
    bus.stop();
    return sono$1;
}

function play(id, delay, offset) {
    bus.find(id, function (sound) {
        return sound.play(delay, offset);
    });
    return sono$1;
}

function pause(id) {
    bus.find(id, function (sound) {
        return sound.pause();
    });
    return sono$1;
}

function stop(id) {
    bus.find(id, function (sound) {
        return sound.stop();
    });
    return sono$1;
}

/*
* Mobile touch lock
*/

var isTouchLocked = touchLock(context$1, function () {
    isTouchLocked = false;
    bus.sounds.forEach(function (sound) {
        return sound.isTouchLocked = false;
    });
});

/*
* Page visibility events
*/

var pageHiddenPaused = [];

// pause currently playing sounds and store refs
function onHidden() {
    bus.sounds.forEach(function (sound) {
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

pageVisibility(onHidden, onShown);

function register(name, fn) {
    var attachTo = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Effects.prototype;

    attachTo[name] = fn;
    sono$1[name] = fn;

    return fn;
}

var sono$1 = (_sono = {
    canPlay: file.canPlay,
    context: context$1,
    create: create,
    createGroup: group,
    createSound: create,
    destroyAll: destroyAll,
    destroy: destroy,
    effects: bus.effects,
    extensions: file.extensions,
    fade: fade,
    file: file,
    gain: bus.gain,
    getOfflineContext: utils.getOfflineContext,
    get: get$$1,
    getSound: get$$1,
    group: group,
    hasWebAudio: !context$1.isFake,
    isSupported: file.extensions.length > 0,
    load: load,
    log: function log$$1() {
        return log(sono$1);
    },
    mute: mute,
    pause: pause,
    pauseAll: pauseAll,
    play: play,
    register: register,
    resumeAll: resumeAll,
    stop: stop,
    stopAll: stopAll,
    unMute: unMute,
    utils: utils,
    VERSION: VERSION
}, _effects = 'effects', _mutatorMap = {}, _mutatorMap[_effects] = _mutatorMap[_effects] || {}, _mutatorMap[_effects].get = function () {
    return bus.effects;
}, _effects2 = 'effects', _mutatorMap[_effects2] = _mutatorMap[_effects2] || {}, _mutatorMap[_effects2].set = function (value) {
    bus.effects.removeAll().add(value);
}, _fx = 'fx', _mutatorMap[_fx] = _mutatorMap[_fx] || {}, _mutatorMap[_fx].get = function () {
    return this.effects;
}, _fx2 = 'fx', _mutatorMap[_fx2] = _mutatorMap[_fx2] || {}, _mutatorMap[_fx2].set = function (value) {
    this.effects = value;
}, _isTouchLocked = 'isTouchLocked', _mutatorMap[_isTouchLocked] = _mutatorMap[_isTouchLocked] || {}, _mutatorMap[_isTouchLocked].get = function () {
    return isTouchLocked;
}, _sounds = 'sounds', _mutatorMap[_sounds] = _mutatorMap[_sounds] || {}, _mutatorMap[_sounds].get = function () {
    return bus.sounds.slice(0);
}, _volume = 'volume', _mutatorMap[_volume] = _mutatorMap[_volume] || {}, _mutatorMap[_volume].get = function () {
    return bus.volume;
}, _volume2 = 'volume', _mutatorMap[_volume2] = _mutatorMap[_volume2] || {}, _mutatorMap[_volume2].set = function (value) {
    bus.volume = value;
}, _sono.__test = {
    Effects: Effects,
    Group: Group,
    Sound: Sound
}, defineEnumerableProperties(_sono, _mutatorMap), _sono);

var AbstractEffect = function () {
    function AbstractEffect() {
        var node = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
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
            console.warn(this, 'Attempt to set invalid value ' + value + ' on AudioParam');
            return;
        }
        param.value = value;
    };

    AbstractEffect.prototype.update = function update() {
        throw new Error('update must be overridden');
    };

    createClass(AbstractEffect, [{
        key: 'context',
        get: function get$$1() {
            return context$1;
        }
    }, {
        key: 'numberOfInputs',
        get: function get$$1() {
            return 1;
        }
    }, {
        key: 'numberOfOutputs',
        get: function get$$1() {
            return 1;
        }
    }, {
        key: 'channelCount',
        get: function get$$1() {
            return 1;
        }
    }, {
        key: 'channelCountMode',
        get: function get$$1() {
            return 'max';
        }
    }, {
        key: 'channelInterpretation',
        get: function get$$1() {
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
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$fftSize = _ref.fftSize,
            fftSize = _ref$fftSize === undefined ? 2048 : _ref$fftSize,
            _ref$minDecibels = _ref.minDecibels,
            minDecibels = _ref$minDecibels === undefined ? -100 : _ref$minDecibels,
            _ref$maxDecibels = _ref.maxDecibels,
            maxDecibels = _ref$maxDecibels === undefined ? -30 : _ref$maxDecibels,
            _ref$smoothing = _ref.smoothing,
            smoothing = _ref$smoothing === undefined ? 0.9 : _ref$smoothing,
            _ref$useFloats = _ref.useFloats,
            useFloats = _ref$useFloats === undefined ? false : _ref$useFloats;

        classCallCheck(this, Analyser);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this, sono$1.context.createAnalyser()));

        _this._useFloats = !!useFloats;
        _this._waveform = null;
        _this._frequencies = null;

        _this._node.fftSize = fftSize;

        _this.update({ minDecibels: minDecibels, maxDecibels: maxDecibels, smoothing: smoothing });
        return _this;
    }

    Analyser.prototype.update = function update(_ref2) {
        var minDecibels = _ref2.minDecibels,
            maxDecibels = _ref2.maxDecibels,
            smoothing = _ref2.smoothing;

        if (isSafeNumber(smoothing)) {
            this._node.smoothingTimeConstant = smoothing;
        }
        if (isSafeNumber(minDecibels)) {
            this._node.minDecibels = minDecibels;
        }
        if (isSafeNumber(maxDecibels)) {
            this._node.maxDecibels = maxDecibels;
        }
    };

    Analyser.prototype.getWaveform = function getWaveform() {
        var useFloats = this._useFloats && this._node.getFloatTimeDomainData;

        if (!this._waveform) {
            this._waveform = this._createArray(useFloats, this._node.fftSize);
        }

        if (useFloats) {
            this._node.getFloatTimeDomainData(this._waveform);
        } else {
            this._node.getByteTimeDomainData(this._waveform);
        }

        return this._waveform;
    };

    Analyser.prototype.getFrequencies = function getFrequencies() {
        var useFloats = this._useFloats && this._node.getFloatFrequencyData;

        if (!this._frequencies) {
            this._frequencies = this._createArray(useFloats, this._node.frequencyBinCount);
        }

        if (useFloats) {
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

    Analyser.prototype._createArray = function _createArray(useFloats, length) {
        return useFloats ? new Float32Array(length) : new Uint8Array(length);
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
        key: 'frequencyBinCount',
        get: function get$$1() {
            return this._node.frequencyBinCount;
        }
    }, {
        key: 'maxDecibels',
        get: function get$$1() {
            return this._node.maxDecibels;
        },
        set: function set$$1(value) {
            if (isSafeNumber(value)) {
                this._node.maxDecibels = value;
            }
        }
    }, {
        key: 'minDecibels',
        get: function get$$1() {
            return this._node.minDecibels;
        },
        set: function set$$1(value) {
            if (isSafeNumber(value)) {
                this._node.minDecibels = value;
            }
        }
    }, {
        key: 'smoothing',
        get: function get$$1() {
            return this._node.smoothingTimeConstant;
        },
        set: function set$$1(value) {
            if (isSafeNumber(value)) {
                this._node.smoothingTimeConstant = value;
            }
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
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$attack = _ref.attack,
            attack = _ref$attack === undefined ? 0.003 : _ref$attack,
            _ref$knee = _ref.knee,
            knee = _ref$knee === undefined ? 30 : _ref$knee,
            _ref$ratio = _ref.ratio,
            ratio = _ref$ratio === undefined ? 12 : _ref$ratio,
            _ref$release = _ref.release,
            release = _ref$release === undefined ? 0.25 : _ref$release,
            _ref$threshold = _ref.threshold,
            threshold = _ref$threshold === undefined ? -24 : _ref$threshold;

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
        // seconds to reduce gain by 10db from 0 to 1 - how quickly signal adapted when volume increased
        this.setSafeParamValue(this._node.attack, options.attack);
        // seconds to increase gain by 10db from 0 to 1 - how quickly signal adapted when volume redcuced
        this.setSafeParamValue(this._node.release, options.release);
    };

    createClass(Compressor, [{
        key: 'threshold',
        get: function get$$1() {
            return this._node.threshold.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._node.threshold, value);
        }
    }, {
        key: 'knee',
        get: function get$$1() {
            return this._node.knee.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._node.knee, value);
        }
    }, {
        key: 'ratio',
        get: function get$$1() {
            return this._node.ratio.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._node.ratio, value);
        }
    }, {
        key: 'attack',
        get: function get$$1() {
            return this._node.attack.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._node.attack, value);
        }
    }, {
        key: 'release',
        get: function get$$1() {
            return this._node.release.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._node.release, value);
        }
    }]);
    return Compressor;
}(AbstractEffect);

sono$1.register('compressor', function (opts) {
    return new Compressor(opts);
});

var Convolver = function (_AbstractEffect) {
    inherits(Convolver, _AbstractEffect);

    function Convolver() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            impulse = _ref.impulse;

        classCallCheck(this, Convolver);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this));

        _this._node = sono$1.context.createConvolver();
        _this._in.connect(_this._out);

        _this._loader = null;

        _this.update({ impulse: impulse });
        return _this;
    }

    Convolver.prototype._load = function _load(src) {
        var _this2 = this;

        if (sono$1.context.isFake) {
            return;
        }
        if (this._loader) {
            this._loader.destroy();
        }
        this._loader = new Loader(src);
        this._loader.audioContext = sono$1.context;
        this._loader.once('complete', function (impulse) {
            return _this2.update({ impulse: impulse });
        });
        this._loader.once('error', function (error) {
            return console.error(error);
        });
        this._loader.start();
    };

    Convolver.prototype.update = function update(_ref2) {
        var _this3 = this;

        var impulse = _ref2.impulse;

        if (!impulse) {
            return this;
        }

        if (file.isAudioBuffer(impulse)) {
            this._node.buffer = impulse;
            this._in.disconnect();
            this._in.connect(this._node);
            this._node.connect(this._out);
            return this;
        }

        if (impulse instanceof Sound) {
            if (impulse.data) {
                this.update({ impulse: impulse.data });
            } else {
                impulse.once('ready', function (sound) {
                    return _this3.update({
                        impulse: sound.data
                    });
                });
            }
            return this;
        }

        if (file.isURL(impulse) || file.isArrayBuffer(impulse)) {
            this._load(impulse);
        }

        return this;
    };

    createClass(Convolver, [{
        key: 'impulse',
        get: function get$$1() {
            return this._node.buffer;
        },
        set: function set$$1(impulse) {
            this.update({ impulse: impulse });
        }
    }]);
    return Convolver;
}(AbstractEffect);

sono$1.register('convolver', function (opts) {
    return new Convolver(opts);
});

// up-sample before applying curve for better resolution result 'none', '2x' or '4x'
// oversample: '2x'
// oversample: '4x'

var Distortion = function (_AbstractEffect) {
    inherits(Distortion, _AbstractEffect);

    function Distortion() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$level = _ref.level,
            level = _ref$level === undefined ? 1 : _ref$level,
            _ref$samples = _ref.samples,
            samples = _ref$samples === undefined ? 22050 : _ref$samples,
            _ref$oversample = _ref.oversample,
            oversample = _ref$oversample === undefined ? 'none' : _ref$oversample;

        classCallCheck(this, Distortion);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this, sono$1.context.createWaveShaper()));

        _this._node.oversample = oversample || 'none';

        _this._samples = samples || 22050;

        _this._curve = new Float32Array(_this._samples);

        _this._level;

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
        var y = 2 / this._samples;

        var x = void 0;
        for (var i = 0; i < this._samples; ++i) {
            x = i * y - 1;
            this._curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }

        this._level = level;
        this._node.curve = this._curve;
    };

    createClass(Distortion, [{
        key: 'level',
        get: function get$$1() {
            return this._level;
        },
        set: function set$$1(level) {
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
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$delay = _ref.delay,
            delay = _ref$delay === undefined ? 0.5 : _ref$delay,
            _ref$feedback = _ref.feedback,
            feedback = _ref$feedback === undefined ? 0.5 : _ref$feedback;

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
        get: function get$$1() {
            return this._delay.delayTime.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._delay.delayTime, value);
        }
    }, {
        key: 'feedback',
        get: function get$$1() {
            return this._feedback.gain.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._feedback.gain, value);
        }
    }]);
    return Echo;
}(AbstractEffect);

sono$1.register('echo', function (opts) {
    return new Echo(opts);
});

function safeOption() {
    var value = null;

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
    }

    for (var i = 0; i < args.length; i++) {
        if (isSafeNumber(args[i])) {
            value = args[i];
            break;
        }
    }
    return value;
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
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$type = _ref.type,
            type = _ref$type === undefined ? 'lowpass' : _ref$type,
            _ref$frequency = _ref.frequency,
            frequency = _ref$frequency === undefined ? 1000 : _ref$frequency,
            _ref$detune = _ref.detune,
            detune = _ref$detune === undefined ? 0 : _ref$detune,
            _ref$q = _ref.q,
            q = _ref$q === undefined ? 0 : _ref$q,
            _ref$gain = _ref.gain,
            gain = _ref$gain === undefined ? 1 : _ref$gain,
            _ref$peak = _ref.peak,
            peak = _ref$peak === undefined ? 0 : _ref$peak,
            _ref$boost = _ref.boost,
            boost = _ref$boost === undefined ? 0 : _ref$boost,
            _ref$width = _ref.width,
            width = _ref$width === undefined ? 100 : _ref$width,
            _ref$sharpness = _ref.sharpness,
            sharpness = _ref$sharpness === undefined ? 0 : _ref$sharpness;

        classCallCheck(this, Filter);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this, sono$1.context.createBiquadFilter()));

        _this._node.type = type;

        _this.update({ frequency: frequency, gain: gain, detune: detune, q: q, peak: peak, boost: boost, width: width, sharpness: sharpness });
        return _this;
    }

    Filter.prototype.update = function update(options) {
        this.setSafeParamValue(this._node.frequency, options.frequency);
        this.setSafeParamValue(this._node.gain, safeOption(options.boost, options.gain));
        this.setSafeParamValue(this._node.detune, options.detune);

        var q = safeOption(options.peak, options.width, options.sharpness, options.q);
        this.setSafeParamValue(this._node.Q, q);
    };

    Filter.prototype.setByPercent = function setByPercent(_ref2) {
        var _ref2$percent = _ref2.percent,
            percent = _ref2$percent === undefined ? 0.5 : _ref2$percent;

        this.update({
            frequency: getFrequency$1(percent)
        });
    };

    createClass(Filter, [{
        key: 'type',
        get: function get$$1() {
            return this._node.type;
        }
    }, {
        key: 'frequency',
        get: function get$$1() {
            return this._node.frequency.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._node.frequency, value);
        }
    }, {
        key: 'q',
        get: function get$$1() {
            return this._node.Q.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._node.Q, value);
        }
    }, {
        key: 'Q',
        get: function get$$1() {
            return this.q;
        },
        set: function set$$1(value) {
            this.q = value;
        }
    }, {
        key: 'peak',
        get: function get$$1() {
            return this.q;
        },
        set: function set$$1(value) {
            this.q = value;
        }
    }, {
        key: 'boost',
        get: function get$$1() {
            return this.q;
        },
        set: function set$$1(value) {
            this.q = value;
        }
    }, {
        key: 'width',
        get: function get$$1() {
            return this.q;
        },
        set: function set$$1(value) {
            this.q = value;
        }
    }, {
        key: 'sharpness',
        get: function get$$1() {
            return this.q;
        },
        set: function set$$1(value) {
            this.q = value;
        }
    }, {
        key: 'gain',
        get: function get$$1() {
            return this._node.gain.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._node.gain, value);
        }
    }, {
        key: 'detune',
        get: function get$$1() {
            return this._node.detune.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._node.detune, value);
        }
    }]);
    return Filter;
}(AbstractEffect);

var lowpass = sono$1.register('lowpass', function () {
    var _ref3 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        frequency = _ref3.frequency,
        peak = _ref3.peak,
        q = _ref3.q;

    return new Filter({ type: 'lowpass', frequency: frequency, peak: peak, q: q });
});

var highpass = sono$1.register('highpass', function () {
    var _ref4 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        frequency = _ref4.frequency,
        peak = _ref4.peak,
        q = _ref4.q;

    return new Filter({ type: 'highpass', frequency: frequency, peak: peak, q: q });
});

var lowshelf = sono$1.register('lowshelf', function () {
    var _ref5 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        frequency = _ref5.frequency,
        boost = _ref5.boost,
        gain = _ref5.gain;

    return new Filter({ type: 'lowshelf', frequency: frequency, boost: boost, gain: gain, q: 0 });
});

var highshelf = sono$1.register('highshelf', function () {
    var _ref6 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        frequency = _ref6.frequency,
        boost = _ref6.boost,
        gain = _ref6.gain;

    return new Filter({ type: 'highshelf', frequency: frequency, boost: boost, gain: gain, q: 0 });
});

var peaking = sono$1.register('peaking', function () {
    var _ref7 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        frequency = _ref7.frequency,
        width = _ref7.width,
        boost = _ref7.boost,
        gain = _ref7.gain,
        q = _ref7.q;

    return new Filter({ type: 'peaking', frequency: frequency, width: width, boost: boost, gain: gain, q: q });
});

var bandpass = sono$1.register('bandpass', function () {
    var _ref8 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        frequency = _ref8.frequency,
        width = _ref8.width,
        q = _ref8.q;

    return new Filter({ type: 'bandpass', frequency: frequency, width: width, q: q });
});

var notch = sono$1.register('notch', function () {
    var _ref9 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        frequency = _ref9.frequency,
        width = _ref9.width,
        gain = _ref9.gain,
        q = _ref9.q;

    return new Filter({ type: 'notch', frequency: frequency, width: width, gain: gain, q: q });
});

var allpass = sono$1.register('allpass', function () {
    var _ref10 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        frequency = _ref10.frequency,
        sharpness = _ref10.sharpness,
        q = _ref10.q;

    return new Filter({ type: 'allpass', frequency: frequency, sharpness: sharpness, q: q });
});

sono$1.register('filter', function (opts) {
    return new Filter(opts);
});

var MonoFlanger = function (_AbstractEffect) {
    inherits(MonoFlanger, _AbstractEffect);

    function MonoFlanger() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$delay = _ref.delay,
            delay = _ref$delay === undefined ? 0.005 : _ref$delay,
            _ref$feedback = _ref.feedback,
            feedback = _ref$feedback === undefined ? 0.5 : _ref$feedback,
            _ref$frequency = _ref.frequency,
            frequency = _ref$frequency === undefined ? 0.002 : _ref$frequency,
            _ref$gain = _ref.gain,
            gain = _ref$gain === undefined ? 0.25 : _ref$gain;

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
        this.frequency = options.frequency;
        this.gain = options.gain;
        this.feedback = options.feedback;
    };

    createClass(MonoFlanger, [{
        key: 'delay',
        get: function get$$1() {
            return this._delay.delayTime.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._delay.delayTime, value);
        }
    }, {
        key: 'frequency',
        get: function get$$1() {
            return this._lfo.frequency.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._lfo.frequency, value);
        }
    }, {
        key: 'gain',
        get: function get$$1() {
            return this._gain.gain.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._gain.gain, value);
        }
    }, {
        key: 'feedback',
        get: function get$$1() {
            return this._feedback.gain.value;
        },
        set: function set$$1(value) {
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
        var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref2$delay = _ref2.delay,
            delay = _ref2$delay === undefined ? 0.003 : _ref2$delay,
            _ref2$feedback = _ref2.feedback,
            feedback = _ref2$feedback === undefined ? 0.5 : _ref2$feedback,
            _ref2$frequency = _ref2.frequency,
            frequency = _ref2$frequency === undefined ? 0.5 : _ref2$frequency,
            _ref2$gain = _ref2.gain,
            gain = _ref2$gain === undefined ? 0.005 : _ref2$gain;

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
        this.frequency = options.frequency;
        this.gain = options.gain;
        this.feedback = options.feedback;
    };

    createClass(StereoFlanger, [{
        key: 'delay',
        get: function get$$1() {
            return this._delayL.delayTime.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._delayL.delayTime, value);
            this._delayR.delayTime.value = this._delayL.delayTime.value;
        }
    }, {
        key: 'frequency',
        get: function get$$1() {
            return this._lfo.frequency.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._lfo.frequency, value);
        }
    }, {
        key: 'gain',
        get: function get$$1() {
            return this._lfoGainL.gain.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._lfoGainL.gain, value);
            this._lfoGainR.gain.value = 0 - this._lfoGainL.gain.value;
        }
    }, {
        key: 'feedback',
        get: function get$$1() {
            return this._feedbackL.gain.value;
        },
        set: function set$$1(value) {
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
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    return opts.stereo ? new StereoFlanger(opts) : new MonoFlanger(opts);
});

function isDefined(value) {
    return typeof value !== 'undefined';
}

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

function safeNumber(x) {
    var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

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
    get: function get$$1(x, y, z) {
        var v = this.pool.length ? this.pool.pop() : {
            x: 0,
            y: 0,
            z: 0
        };
        // check if a vector has been passed in
        if (typeof x !== 'undefined' && isNaN(x) && 'x' in x && 'y' in x && 'z' in x) {
            v.x = safeNumber(x.x);
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

function setNodeOrientation(pannerNode, fw) {
    // set the orientation of the source (where the audio is coming from)
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
}

function setNodePosition(nodeOrListener, vec) {
    nodeOrListener.setPosition(vec.x, vec.y, vec.z);
    vecPool.dispose(vec);
}

var Panner = function (_AbstractEffect) {
    inherits(Panner, _AbstractEffect);

    function Panner() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            panningModel = _ref.panningModel,
            distanceModel = _ref.distanceModel,
            refDistance = _ref.refDistance,
            maxDistance = _ref.maxDistance,
            rolloffFactor = _ref.rolloffFactor,
            coneInnerAngle = _ref.coneInnerAngle,
            coneOuterAngle = _ref.coneOuterAngle,
            coneOuterGain = _ref.coneOuterGain;

        classCallCheck(this, Panner);

        // Default for stereo is 'HRTF' can also be 'equalpower'
        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this, sono$1.context.createPanner()));

        _this._node.panningModel = panningModel || pannerDefaults.panningModel;

        // Distance model and attributes
        // Can be 'linear' 'inverse' 'exponential'
        _this._node.distanceModel = distanceModel || pannerDefaults.distanceModel;
        _this._node.refDistance = isDefined(refDistance) ? refDistance : pannerDefaults.refDistance;
        _this._node.maxDistance = isDefined(maxDistance) ? maxDistance : pannerDefaults.maxDistance;
        _this._node.rolloffFactor = isDefined(rolloffFactor) ? rolloffFactor : pannerDefaults.rolloffFactor;
        _this._node.coneInnerAngle = isDefined(coneInnerAngle) ? coneInnerAngle : pannerDefaults.coneInnerAngle;
        _this._node.coneOuterAngle = isDefined(coneOuterAngle) ? coneOuterAngle : pannerDefaults.coneOuterAngle;
        _this._node.coneOuterGain = isDefined(coneOuterGain) ? coneOuterGain : pannerDefaults.coneOuterGain;
        // set to defaults (needed in Firefox)
        _this._node.setPosition(0, 0, 0);
        _this._node.setOrientation(1, 0, 0);

        _this.set(0);
        return _this;
    }

    Panner.prototype.update = function update(_ref2) {
        var x = _ref2.x,
            y = _ref2.y,
            z = _ref2.z;

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
        setNodePosition(this._node, v);
    };

    // set the position the audio is coming from)


    Panner.prototype.setPosition = function setPosition(x, y, z) {
        setNodePosition(this._node, vecPool.get(x, y, z));
    };

    // set the direction the audio is coming from)


    Panner.prototype.setOrientation = function setOrientation(x, y, z) {
        setNodeOrientation(this._node, vecPool.get(x, y, z));
    };

    // set the position of who or what is hearing the audio (could be camera or some character)


    Panner.prototype.setListenerPosition = function setListenerPosition(x, y, z) {
        setNodePosition(sono$1.context.listener, vecPool.get(x, y, z));
    };

    // set the position of who or what is hearing the audio (could be camera or some character)


    Panner.prototype.setListenerOrientation = function setListenerOrientation(x, y, z) {
        setNodeOrientation(sono$1.context.listener, vecPool.get(x, y, z));
    };

    Panner.prototype.set = function set$$1(x, y, z) {
        return this.update({ x: x, y: y, z: z });
    };

    createClass(Panner, [{
        key: 'defaults',
        get: function get$$1() {
            return pannerDefaults;
        },
        set: function set$$1(value) {
            Object.assign(pannerDefaults, value);
        }
    }]);
    return Panner;
}(AbstractEffect);

var panner = sono$1.register('panner', function (opts) {
    return new Panner(opts);
});

Object.defineProperties(panner, {
    defaults: {
        get: function get$$1() {
            return pannerDefaults;
        },
        set: function set$$1(value) {
            return Object.assign(pannerDefaults, value);
        }
    },
    setListenerPosition: {
        value: function value(x, y, z) {
            return setNodePosition(sono$1.context.listener, vecPool.get(x, y, z));
        }
    },
    setListenerOrientation: {
        value: function value(x, y, z) {
            return setNodeOrientation(sono$1.context.listener, vecPool.get(x, y, z));
        }
    }
});

var Phaser = function (_AbstractEffect) {
    inherits(Phaser, _AbstractEffect);

    function Phaser() {
        var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref$stages = _ref.stages,
            stages = _ref$stages === undefined ? 8 : _ref$stages,
            _ref$feedback = _ref.feedback,
            feedback = _ref$feedback === undefined ? 0.5 : _ref$feedback,
            _ref$frequency = _ref.frequency,
            frequency = _ref$frequency === undefined ? 0.5 : _ref$frequency,
            _ref$gain = _ref.gain,
            gain = _ref$gain === undefined ? 300 : _ref$gain;

        classCallCheck(this, Phaser);

        var _this = possibleConstructorReturn(this, _AbstractEffect.call(this));

        _this._stages = stages || 8;

        _this._feedback = sono$1.context.createGain();
        _this._lfo = sono$1.context.createOscillator();
        _this._lfoGain = sono$1.context.createGain();
        _this._lfo.type = 'sine';

        var filters = [];
        for (var i = 0; i < _this._stages; i++) {
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
        key: 'stages',
        get: function get$$1() {
            return this._stages;
        }
    }, {
        key: 'frequency',
        get: function get$$1() {
            return this._lfo.frequency.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._lfo.frequency, value);
        }
    }, {
        key: 'gain',
        get: function get$$1() {
            return this._lfoGain.gain.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._lfoGain.gain, value);
        }
    }, {
        key: 'feedback',
        get: function get$$1() {
            return this._feedback.gain.value;
        },
        set: function set$$1(value) {
            this.setSafeParamValue(this._feedback.gain, value);
        }
    }]);
    return Phaser;
}(AbstractEffect);

sono$1.register('phaser', function (opts) {
    return new Phaser(opts);
});

function createImpulseResponse(_ref) {
    var time = _ref.time,
        decay = _ref.decay,
        reverse = _ref.reverse,
        buffer = _ref.buffer;

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
        var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
            _ref2$time = _ref2.time,
            time = _ref2$time === undefined ? 1 : _ref2$time,
            _ref2$decay = _ref2.decay,
            decay = _ref2$decay === undefined ? 5 : _ref2$decay,
            _ref2$reverse = _ref2.reverse,
            reverse = _ref2$reverse === undefined ? false : _ref2$reverse;

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
        var time = _ref3.time,
            decay = _ref3.decay,
            reverse = _ref3.reverse;

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

        this._opts.buffer = time <= 0 ? null : createImpulseResponse(this._opts);
        this._convolver.buffer = this._opts.buffer;
    };

    createClass(Reverb, [{
        key: 'time',
        get: function get$$1() {
            return this._opts.time;
        },
        set: function set$$1(value) {
            this.update({ time: value });
        }
    }, {
        key: 'decay',
        get: function get$$1() {
            return this._opts.decay;
        },
        set: function set$$1(value) {
            this.update({ decay: value });
        }
    }, {
        key: 'reverse',
        get: function get$$1() {
            return this._opts.reverse;
        },
        set: function set$$1(value) {
            this.update({ reverse: value });
        }
    }]);
    return Reverb;
}(AbstractEffect);

sono$1.register('reverb', function (opts) {
    return new Reverb(opts);
});

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

sono$1.register('microphone', microphone, sono$1.utils);

function recorder() {
    var passThrough = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

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
        _in: input,
        _out: output,
        connect: function connect(n) {
            output.connect(n._in || n);
        },
        disconnect: function disconnect() {
            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            output.disconnect(args);
        }
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
            sound.effects.add(node);
            isRecording = true;
        },
        stop: function stop() {
            soundOb.effects.remove(node);
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

sono$1.register('recorder', recorder, sono$1.utils);

function waveform() {
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

        return wave;
    };
}

sono$1.register('waveform', waveform, sono$1.utils);

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
        canvas.width = width;
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

sono$1.register('waveformer', waveformer, sono$1.utils);

return sono$1;

})));
//# sourceMappingURL=sono.js.map
