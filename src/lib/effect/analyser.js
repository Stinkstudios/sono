'use strict';

function Analyser(context, config) {
    config = config || {};

    var fftSize = config.fftSize || 512,
        waveformData,
        frequencyData,
        node = context.createAnalyser();

    node.fftSize = fftSize; // frequencyBinCount will be half this value

    node.smoothingTimeConstant = config.smoothing || config.smoothingTimeConstant || node.smoothingTimeConstant;
    node.minDecibels = config.minDecibels || node.minDecibels;
    node.maxDecibels = config.maxDecibels || node.maxDecibels;
    // if(config.smoothing !== undefined) { node.smoothingTimeConstant = smoothing; }
    // if(config.minDecibels !== undefined) { node.minDecibels = minDecibels; }
    // if(config.maxDecibels !== undefined) { node.maxDecibels = maxDecibels; }

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
        smoothing: {
            // 0 to 1
            get: function() { return node.smoothingTimeConstant; },
            set: function(value) { node.smoothingTimeConstant = value; }
        }
    });

    return node;
}

module.exports = Analyser;
