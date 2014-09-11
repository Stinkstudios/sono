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
