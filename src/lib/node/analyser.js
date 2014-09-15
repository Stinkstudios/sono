'use strict';

function Analyser(context, fftSize, smoothing, minDecibels, maxDecibels) {
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
        'minDecibels': {
            // 0 to 1
            get: function() { return node.minDecibels; },
            set: function(value) { node.minDecibels = value; }
        },
        'maxDecibels': {
            // 0 to 1 (makes the transition between values over time smoother)
            get: function() { return node.maxDecibels; },
            set: function(value) { node.maxDecibels = value; }
        },
        'frequencyBinCount': {
            get: function() { return node.frequencyBinCount; }
        }
    });

    return Object.freeze(exports);
}

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Analyser;
}

