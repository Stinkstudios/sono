'use strict';

function WebAudioNodeFactory(context) {

    function createFilter(type, frequency) {
        var filterNode = context.createBiquadFilter();
        filterNode.type = type;
        if(frequency !== undefined) {
            filterNode.frequency.value = frequency;
        }
        return filterNode;
    }

    var create = {
        gain: function(value) {
            var node = context.createGain();
            if(value !== undefined) {
                node.gain.value = value;
            }
            return node;
        },
        pan: function() {
            var node = context.createPanner();
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
            return node;
        },
        filter: {
            lowpass: function(frequency) {
                return createFilter('lowpass', frequency);
            },
            highpass: function(frequency) {
                return createFilter('highpass', frequency);
            },
            bandpass: function(frequency) {
                return createFilter('bandpass', frequency);
            },
            lowshelf: function(frequency) {
                return createFilter('lowshelf', frequency);
            },
            highshelf: function(frequency) {
                return createFilter('highshelf', frequency);
            },
            peaking: function(frequency) {
                return createFilter('peaking', frequency);
            },
            notch: function(frequency) {
                return createFilter('notch', frequency);
            },
            allpass: function(frequency) {
                return createFilter('allpass', frequency);
            }
        },
        delay: function(input, time, gain) {
            var delayNode = context.createDelay();
            var gainNode = this.gain(gain || 0.5);
            if(time !== undefined) {
                delayNode.delayTime.value = time;
            }
            delayNode.connect(gainNode);
            input.connect(delayNode);
            gainNode.connect(input);
            return delayNode;
            // ?
            /*return {
              delayNode: delayNode,
              gainNode: gainNode
            };*/
        },
        convolver: function(impulseResponse) {
            // impulseResponse is an audio file buffer
            var node = context.createConvolver();
            node.buffer = impulseResponse;
            return node;
        },
        reverb: function(seconds, decay, reverse) {
           return this.convolver(this.createImpulseResponse(seconds, decay, reverse));
        },
        // TODO: should prob be moved to utils:
        createImpulseResponse: function(seconds, decay, reverse) {
            // generate a reverb effect
            seconds = seconds || 1;
            decay = decay || 5;
            reverse = !!reverse;

            var numChannels = 2,
                rate = context.sampleRate,
                length = rate * seconds,
                impulseResponse = context.createBuffer(numChannels, length, rate),
                left = impulseResponse.getChannelData(0),
                right = impulseResponse.getChannelData(1),
                n;

            for (var i = 0; i < length; i++) {
                n = reverse ? length - 1 : i;
                left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
                right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
            }

            return impulseResponse;
        },
        analyser: function(fftSize) {
            fftSize = fftSize || 1024;
            var node = context.createAnalyser();
            node.smoothingTimeConstant = 0.85;
            // resolution fftSize: 32 - 2048 (pow 2)
            // frequencyBinCount will be half this value
            node.fftSize = fftSize;
            //node.minDecibels = -100;
            //node.maxDecibels = -30;
            return node;
        },
        compressor: function() {
            // lowers the volume of the loudest parts of the signal and raises the volume of the softest parts
            var node = context.createDynamicsCompressor();
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
            return node;
        },
        distortion: function() {
            var node = context.createWaveShaper();
            // Float32Array defining curve (values are interpolated)
            //node.curve
            // up-sample before applying curve for better resolution result 'none', '2x' or '4x'
            //node.oversample = '2x';
            return node;
        },
        scriptProcessor: function(bufferSize, inputChannels, outputChannels, callback, callbackContext) {
            // bufferSize 256 - 16384 (pow 2)
            bufferSize = bufferSize || 1024;
            inputChannels = inputChannels === undefined ? 0 : inputChannels;
            outputChannels = outputChannels === undefined ? 1 : outputChannels;
            var node = context.createScriptProcessor(bufferSize, inputChannels, outputChannels);
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
                callback.call(callbackContext || this, event);
            };
            return node;
        },
        // creates MediaStreamAudioSourceNode
        microphoneSource: function(stream, connectTo) {
            var mediaStreamSource = context.createMediaStreamSource( stream );
            if(connectTo) {
                mediaStreamSource.connect(connectTo);
            }
            // HACK: stops moz garbage collection killing the stream
            // see https://support.mozilla.org/en-US/questions/984179
            if(navigator.mozGetUserMedia) {
                window.mozHack = mediaStreamSource;
            }
            return mediaStreamSource;
        }
    };

    var fake = {
        gain: function() {
            return {gain:{value: 0}};
        },
        pan: function() {
            var fn = function(){};
            return {
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
              coneOuterGain: 0
            };
        },
        filter: {
            lowpass: function() {
                return { type:0, frequency: { value: 0 } };
            },
            highpass: function() {
                return { type:0, frequency: { value: 0 } };
            },
            bandpass: function() {
                return { type:0, frequency: { value: 0 } };
            },
            lowshelf: function() {
                return { type:0, frequency: { value: 0 } };
            },
            highshelf: function() {
                return { type:0, frequency: { value: 0 } };
            },
            peaking: function() {
                return { type:0, frequency: { value: 0 } };
            },
            notch: function() {
                return { type:0, frequency: { value: 0 } };
            },
            allpass: function() {
                return { type:0, frequency: { value: 0 } };
            }
        },
        delay: function() {
          return { delayTime: { value: 0 } };
        },
        convolver: function() {
            return { buffer: 0 };
        },
        reverb: function() {
           return this.convolver();
        },
        createImpulseResponse: function() {
            return [];
        },
        analyser: function() {
            return {
              smoothingTimeConstant: 0,
              fftSize: 0,
              minDecibels: 0,
              maxDecibels: 0
            };
        },
        compressor: function() {
            return {
              threshold:{value: 0},
              knee:{value: 0},
              ratio:{value: 0},
              attack:{value: 0},
              release:{value: 0}
            };
        },
        distortion: function() {
            return {
              oversample: 0,
              curve: 0
            };
        },
        scriptProcessor: function() {
            return {};
        },
        microphoneSource: function() {
            return {};
        }
    };

    return context ? create : fake;
}

if (typeof module === 'object' && module.exports) {
    module.exports = WebAudioNodeFactory;
}
