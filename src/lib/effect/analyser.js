'use strict';

function Analyser(context, config) {
    config = config || {};

    var fftSize = config.fftSize || 512,
        floatDefault = !!config.float,
        waveform,
        frequencies,
        node = context.createAnalyser();

    node.fftSize = fftSize; // frequencyBinCount will be half this value
    node.smoothingTimeConstant = config.smoothing || config.smoothingTimeConstant || node.smoothingTimeConstant;
    node.minDecibels = config.minDecibels || node.minDecibels;
    node.maxDecibels = config.maxDecibels || node.maxDecibels;

    var needsUpdate = function(arr, float) {
      if(!arr) { return true; }
      if(node.fftSize !== fftSize) { return true; }
      if(float && arr instanceof Uint8Array) { return true; }
      return !(float && arr instanceof Float32Array);
    };

    var createArray = function(float, length) {
      return float ? new Float32Array(length) : new Uint8Array(length);
    };

    node.getWaveform = function(float) {
        if(!arguments.length) { float = floatDefault; }

        if(needsUpdate(waveform, float)) {
            fftSize = node.fftSize;
            waveform = createArray(float, fftSize);
        }

        if(float) {
          this.getFloatTimeDomainData(waveform);
        } else {
          this.getByteTimeDomainData(waveform);
        }

        return waveform;
    };

    node.getFrequencies = function(float) {
        if(!arguments.length) { float = floatDefault; }

        if(needsUpdate(frequencies, float)) {
            fftSize = node.fftSize;
            frequencies = createArray(float, node.frequencyBinCount);
        }

        if(float) {
          this.getFloatFrequencyData(frequencies);
        } else {
          this.getByteFrequencyData(frequencies);
        }

        return frequencies;
    };

    Object.defineProperties(node, {
        smoothing: {
            get: function() { return node.smoothingTimeConstant; },
            set: function(value) { node.smoothingTimeConstant = value; }
        }
    });

    return node;
}

module.exports = Analyser;
