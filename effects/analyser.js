import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';

function noteFromPitch(frequency) {
    const noteNum = 12 * (Math.log(frequency / 440) * Math.LOG2E);
    return Math.round(noteNum) + 69;
}

function frequencyFromNoteNumber(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

function centsOffFromPitch(frequency, note) {
    return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note)) * Math.LOG2E);
}

class Analyser extends AbstractEffect {
    constructor({fftSize = 512, float = false, minDecibels = 0, maxDecibels = 0, smoothing = 0.9} = {}) {
        super(sono.context.createAnalyser());

        this._freqFloat = !!float;
        this._waveFloat = !!float;
        this._waveform = null;
        this._frequencies = null;

        this._node.fftSize = fftSize; // frequencyBinCount will be half this value
        this._node.smoothingTimeConstant = smoothing || this._node.smoothingTimeConstant;
        this._node.minDecibels = minDecibels || this._node.minDecibels;
        this._node.maxDecibels = maxDecibels || this._node.maxDecibels;
    }

    update() {

    }

    getWaveform(useFloat) {
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
    }

    getFrequencies(useFloat) {
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
    }

    getAmplitude(callback) {
        if (!this._amplitudeWorker) {
            this._createAmplitudeAnalyser();
        }
        this._amplitudeCallback = callback || this._amplitudeCallback;
        const f = new Float32Array(this._node.fftSize);
        f.set(this.getFrequencies(true));
        this._amplitudeWorker.postMessage({
            sum: 0,
            length: f.byteLength,
            numSamples: this._node.fftSize / 2,
            b: f.buffer
        }, [f.buffer]);
    }

    getPitch(callback) {
        if (!this._pitchWorker) {
            this._createPitchAnalyser();
        }
        this._pitchCallback = callback || this._pitchCallback;
        const f = new Float32Array(this._node.fftSize);
        f.set(this.getWaveform(true));
        this._pitchWorker.postMessage({
            sampleRate: sono.context.sampleRate,
            b: f.buffer
        }, [f.buffer]);
    }

    get smoothing() {
        return this._node.smoothingTimeConstant;
    }

    set smoothing(value) {
        this._node.smoothingTimeConstant = value;
    }

    _needsUpdate(arr, useFloat) {
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
    }

    _createArray(useFloat, length) {
        return useFloat ? new Float32Array(length) : new Uint8Array(length);
    }

    _createAmplitudeAnalyser() {
        //the worker returns a normalized value
        //first a sum of all magnitudes devided by the byteLength, then devide  by half the fft (1channel)
        const amplitudeBlob = new Blob([
            `onmessage = function(e) {
                var data = e.data;
                var f = new Float32Array(data.b);
                for (var i = 0; i < f.length; i++) {
                    data.sum += f[i];
                }
                data.sum /= f.length;
                postMessage(Math.max(1.0 - (data.sum / data.numSamples * -1.0), 0));
            };`
        ]);
        const amplitudeBlobURL = URL.createObjectURL(amplitudeBlob);
        this._amplitudeWorker = new Worker(amplitudeBlobURL);
        this._amplitudeWorker.onmessage = event => {
            if (!this._amplitudeCallback) {
                return;
            }
            this._amplitudeCallback(event.data);
        };
    }

    _createPitchAnalyser() {
        const pitchBlob = new Blob([
            `onmessage = function(e) {
                var data = e.data;
                var sampleRate = data.sampleRate;
                var buf = new Float32Array(data.b);
                var SIZE = buf.length;
                var MAX_SAMPLES = Math.floor(SIZE / 2);
                var bestOffset = -1;
                var bestCorrel = 0;
                var rms = 0;
                var foundGoodCorrelation = false;
                var correls = new Array(MAX_SAMPLES);
                for (var i = 0; i < SIZE; i++) {
                    var val = buf[i];
                    rms += val * val;
                }
                rms = Math.sqrt(rms / SIZE);
                if (rms < 0.01) {
                    postMessage(-1);
                } else {
                    var lastCorrelation = 1;
                    for (var offset = 0; offset < MAX_SAMPLES; offset++) {
                        var correl = 0;
                        for (var i = 0; i < MAX_SAMPLES; i++) {
                            correl += Math.abs(buf[i] - buf[i + offset]);
                        }
                        correl = 1 - correl / MAX_SAMPLES;
                        correls[offset] = correl;
                        if (correl > 0.9 && correl > lastCorrelation) {
                            foundGoodCorrelation = true;
                            if (correl > bestCorrel) {
                                bestCorrel = correl;
                                bestOffset = offset;
                            }
                        } else if (foundGoodCorrelation) {
                            var shift = (correls[bestOffset + 1] - correls[bestOffset - 1]) / correls[bestOffset];
                            postMessage(sampleRate / (bestOffset + 8 * shift));
                        }
                        lastCorrelation = correl;
                    }
                    if (bestCorrel > 0.01) {
                        postMessage(sampleRate / bestOffset);
                    } else {
                        postMessage(-1);
                    }
                }
            };`
        ]);

        const pitchBlobURL = URL.createObjectURL(pitchBlob);
        this._pitchWorker = new Worker(pitchBlobURL);

        const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const pitchCallbackObject = {
            hertz: 0,
            note: '',
            noteIndex: 0,
            detuneCents: 0,
            detune: ''
        };

        this._pitchWorker.onmessage = event => {
            if (!this._pitchCallback) {
                return;
            }
            const hz = event.data;
            if (hz !== -1) {
                const note = noteFromPitch(hz);
                const detune = centsOffFromPitch(hz, note);
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
            this._pitchCallback(pitchCallbackObject);
        };
    }
}

export default sono.register('analyser', opts => new Analyser(opts));
