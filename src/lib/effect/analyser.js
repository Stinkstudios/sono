'use strict';


function Analyser(context, config) {
  config = config || {};

  var fftSize = config.fftSize || 512,
    freqFloat = !!config.float,
    waveFloat = !!config.float,
    waveform,
    frequencies,
    node = context.createAnalyser();

  node.fftSize = fftSize; // frequencyBinCount will be half this value
  node.smoothingTimeConstant = config.smoothing || config.smoothingTimeConstant || node.smoothingTimeConstant;
  node.minDecibels = config.minDecibels || node.minDecibels;
  node.maxDecibels = config.maxDecibels || node.maxDecibels;

  //the worker returns a normalized value 
  //first a sum of all magnitudes devided by the byteLength, then devide  by half the fft (1channel)
  var workerBlob = new Blob(["onmessage=function(e){var data=e.data;var f=new Float32Array(data.b);for(var i=0;i<f.length;i++){data.sum+=f[i]}data.sum/=f.length;postMessage(Math.max(1.0-(data.sum/data.numSamples*-1.0),0))};"]);
  var blobURL = URL.createObjectURL(workerBlob);
  var worker = new Worker(blobURL);

  var amplitudeCallback;

  worker.onmessage = function(e) {
    if (amplitudeCallback) {
      amplitudeCallback(e.data);
    }
  };

  var needsUpdate = function(arr, float) {
    if (!arr) {
      return true;
    }
    if (node.fftSize !== fftSize) {
      return true;
    }
    if (float && arr instanceof Uint8Array) {
      return true;
    }
    return !float && arr instanceof Float32Array;
  };

  var createArray = function(float, length) {
    return float ? new Float32Array(length) : new Uint8Array(length);
  };

  node.getWaveform = function(float) {
    if (!arguments.length) { float = waveFloat; }

    if (needsUpdate(waveform, float)) {
      fftSize = node.fftSize;
      waveFloat = float;
      waveform = createArray(float, fftSize);
    }

    if (float) {
      this.getFloatTimeDomainData(waveform);
    } else {
      this.getByteTimeDomainData(waveform);
    }

    return waveform;
  };

  node.getFrequencies = function(float) {
    if (!arguments.length) { float = freqFloat; }

    if (needsUpdate(frequencies, float)) {
      fftSize = node.fftSize;
      freqFloat = float;
      frequencies = createArray(float, node.frequencyBinCount);
    }

    if (float) {
      this.getFloatFrequencyData(frequencies);
    } else {
      this.getByteFrequencyData(frequencies);
    }

    return frequencies;
  };

  node.getAmplitude = function(callback) {
    amplitudeCallback = amplitudeCallback || callback;
    var f = new Float32Array(node.frequencyBinCount);
    node.getFloatFrequencyData(f);
    worker.postMessage({
      sum: 0,
      length: f.byteLength,
      numSamples: node.fftSize / 2,
      b: f.buffer
    }, [f.buffer]);
  };

  node.update = function() {
    node.getWaveform();
    node.getFrequencies();
  };

  Object.defineProperties(node, {
    smoothing: {
      get: function() {
        return node.smoothingTimeConstant;
      },
      set: function(value) { node.smoothingTimeConstant = value; }
    }
  });

  return node;
}

module.exports = Analyser;