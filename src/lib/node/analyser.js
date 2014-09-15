'use strict';

/*function Analyser(context, fftSize, smoothing, minDecibels, maxDecibels) {
    var node = context.createAnalyser();
    node.fftSize = fftSize; // frequencyBinCount will be half this value

    if(smoothing !== undefined) { node.smoothingTimeConstant = smoothing; }
    if(minDecibels !== undefined) { node.minDecibels = minDecibels; }
    if(maxDecibels !== undefined) { node.maxDecibels = maxDecibels; }

    var method = function() {
        
    };

    // public methods
    var exports = {
        node: node,
        method: method,
        // map native methods of AnalyserNode
        getByteFrequencyData: node.getByteFrequencyData.bind(node),
        getByteTimeDomainData: node.getByteTimeDomainData.bind(node),
        // map native methods of AudioNode
        connect: node.connect.bind(node),
        disconnect: node.disconnect.bind(node)
    };

    // map native properties of AnalyserNode
    Object.defineProperties(exports, {
        'fftSize': {
            // 32 to 2048 (must be pow 2)
            get: function() { return node.fftSize; },
            set: function(value) { node.fftSize = value; }
        },
        'smoothing': {
            // 0 to 1
            get: function() { return node.smoothingTimeConstant; },
            set: function(value) { node.smoothingTimeConstant = value; }
        },
        'smoothingTimeConstant': {
            // 0 to 1
            get: function() { return node.smoothingTimeConstant; },
            set: function(value) { node.smoothingTimeConstant = value; }
        },
        'minDecibels': {
            // 0 to 1
            get: function() { return node.minDecibels; },
            set: function(value) {
                if(value > -30) { value = -30; }
                node.minDecibels = value;
            }
        },
        'maxDecibels': {
            // 0 to 1 (makes the transition between values over time smoother)
            get: function() { return node.maxDecibels; },
            set: function(value) {
                if(value > -99) { value = -99; }
                node.maxDecibels = value;
            }
        },
        'frequencyBinCount': {
            get: function() { return node.frequencyBinCount; }
        }
    });

    return Object.freeze(exports);
}*/

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

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Analyser;
}

