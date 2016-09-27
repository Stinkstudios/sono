export default function Analyser(context, config) {
    config = config || {};

    const node = context.createAnalyser();

    let fftSize = config.fftSize || 512,
        freqFloat = !!config.float,
        waveFloat = !!config.float,
        waveform,
        frequencies;

    node.fftSize = fftSize; // frequencyBinCount will be half this value
    node.smoothingTimeConstant = config.smoothing || config.smoothingTimeConstant || node.smoothingTimeConstant;
    node.minDecibels = config.minDecibels || node.minDecibels;
    node.maxDecibels = config.maxDecibels || node.maxDecibels;

    //the worker returns a normalized value
    //first a sum of all magnitudes devided by the byteLength, then devide  by half the fft (1channel)
    const amplitudeBlob = new Blob([
        'onmessage=function(e){var data=e.data;var f=new Float32Array(data.b);for(var i=0;i<f.length;i++){data.sum+=f[i]}data.sum/=f.length;postMessage(Math.max(1.0-(data.sum/data.numSamples*-1.0),0))};'
    ]);
    const pitchBlob = new Blob([
        'onmessage=function(e){var data=e.data;var sampleRate=data.sampleRate;var buf=new Float32Array(data.b);var SIZE=buf.length;var MAX_SAMPLES=Math.floor(SIZE/2);var best_offset=-1;var best_correlation=0;var rms=0;var foundGoodCorrelation=false;var correlations=new Array(MAX_SAMPLES);for(var i=0;i<SIZE;i++){var val=buf[i];rms+=val*val}rms=Math.sqrt(rms/SIZE);if (rms<0.01){postMessage(-1)}else{var lastCorrelation=1;for(var offset=0;offset<MAX_SAMPLES;offset++){var correlation=0;for(var i=0;i<MAX_SAMPLES;i++){correlation+=Math.abs((buf[i])-(buf[i+offset]))}correlation=1-(correlation/MAX_SAMPLES);correlations[offset]=correlation;if ((correlation>0.9)&&(correlation>lastCorrelation)){foundGoodCorrelation=true;if (correlation>best_correlation){best_correlation=correlation;best_offset=offset}}else if (foundGoodCorrelation){var shift=(correlations[best_offset+1]-correlations[best_offset-1])/correlations[best_offset];postMessage(sampleRate/(best_offset+(8*shift)))}lastCorrelation=correlation}if (best_correlation>0.01){postMessage(sampleRate/best_offset)}else{postMessage(-1)}}};'
    ]);
    const amplitudeBlobURL = URL.createObjectURL(amplitudeBlob);
    const amplitudeWorker = new Worker(amplitudeBlobURL);
    const pitchBlobURL = URL.createObjectURL(pitchBlob);
    const pitchWorker = new Worker(pitchBlobURL);

    let amplitudeCallback = null;
    const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let pitchCallback = null;
    const pitchCallbackObject = {
        hertz: null, //number
        note: null, //string
        noteIndex: null, //int
        detuneCents: null, //number
        detune: null //string
    };

    function noteFromPitch(frequency) {
        const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
        return Math.round(noteNum) + 69;
    }

    function frequencyFromNoteNumber(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    function centsOffFromPitch(frequency, note) {
        return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note)) / Math.log(2));
    }

    amplitudeWorker.onmessage = function(e) {
        if (amplitudeCallback) {
            amplitudeCallback(e.data);
        }
    };

    pitchWorker.onmessage = function(e) {
        if (pitchCallback) {
            const Hz = e.data;
            if (Hz !== -1) {
                const note = noteFromPitch(Hz);
                const detune = centsOffFromPitch(Hz, note);
                pitchCallbackObject.hertz = Hz;
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
            pitchCallback(pitchCallbackObject);
        }
    };

    function needsUpdate(arr, float) {
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
    }

    function createArray(float, length) {
        return float ? new Float32Array(length) : new Uint8Array(length);
    }

    node.getWaveform = function(float) {
        if (!arguments.length) {
            float = waveFloat;
        }

        if (needsUpdate(waveform, float)) {
            fftSize = node.fftSize;
            waveFloat = float;
            waveform = createArray(float, fftSize);
        }
        if (float && this.getFloatTimeDomainData) {
            this.getFloatTimeDomainData(waveform);
        } else {
            this.getByteTimeDomainData(waveform);
        }

        return waveform;
    };

    node.getPitch = function(callback) {
        pitchCallback = pitchCallback || callback;
        const f = new Float32Array(node.fftSize);
        f.set(node.getWaveform(true));
        pitchWorker.postMessage({
            sampleRate: context.sampleRate,
            b: f.buffer
        }, [f.buffer]);
    };

    node.getFrequencies = function(float) {
        if (!arguments.length) {
            float = freqFloat;
        }

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
        const f = new Float32Array(node.fftSize);
        f.set(node.getFrequencies(true));
        amplitudeWorker.postMessage({
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
            set: function(value) {
                node.smoothingTimeConstant = value;
            }
        }
    });

    return node;
}
