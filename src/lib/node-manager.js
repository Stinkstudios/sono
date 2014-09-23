'use strict';

var Analyser = require('./node/analyser.js'),
    Distortion = require('./node/distortion.js'),
    Echo = require('./node/echo.js'),
    Filter = require('./node/filter.js'),
    Panner = require('./node/panner.js'),
    Phaser = require('./node/phaser.js'),
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
    var out = node._out || node;
    out.disconnect();
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
    var out = a._out || a;
    out.disconnect();
    out.connect(b._in || b);
    if(typeof a._connected === 'function') {
        a._connected.call(a);
    }
};

NodeManager.prototype._connectTo = function(destination) {
    var l = this._nodeList.length,
        lastNode = l ? this._nodeList[l - 1] : this._sourceNode;
    if(lastNode) {
        this._connect(lastNode, destination);
    }
    this._destination = destination;
};

NodeManager.prototype._updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    //console.log('_updateConnections');
    var l = this._nodeList.length,
        n;
    for (var i = 0; i < l; i++) {
        n = this._nodeList[i];
        if(i === 0) {
            //console.log(' - connect source to node:', n);
            this._connect(this._sourceNode, n);
        }
        else {
            //console.log('connect:', prev, 'to', n);
            var prev = this._nodeList[i-1];
            this._connect(prev, n);
        }
    }
    if(this._destination) {
        this._connectTo(this._destination);
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
    var echo = new Echo(this._context, time, gain);
    this.add(echo);
    return echo;
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

NodeManager.prototype.gain = function(value) {
    var node = this._context.createGain();
    if(value !== undefined) {
        node.gain.value = value;
    }
    return node;
};

NodeManager.prototype.panner = function() {
    var panner = new Panner(this._context);
    this.add(panner);
    return panner;
};

NodeManager.prototype.phaser = function() {
    var phaser = new Phaser(this._context);
    this.add(phaser);
    return phaser;
};

NodeManager.prototype.reverb = function(seconds, decay, reverse) {
    var reverb = new Reverb(this._context, seconds, decay, reverse);
    this.add(reverb);
    return reverb;
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
