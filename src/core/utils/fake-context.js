export default function FakeContext() {

    const startTime = Date.now();

    function fn() {}

    function param() {
        return {
            value: 1,
            defaultValue: 1,
            linearRampToValueAtTime: fn,
            setValueAtTime: fn,
            exponentialRampToValueAtTime: fn,
            setTargetAtTime: fn,
            setValueCurveAtTime: fn,
            cancelScheduledValues: fn
        };
    }

    function fakeNode() {
        return {
            connect: fn,
            disconnect: fn,
            // analyser
            frequencyBinCount: 0,
            smoothingTimeConstant: 0,
            fftSize: 0,
            minDecibels: 0,
            maxDecibels: 0,
            getByteTimeDomainData: fn,
            getByteFrequencyData: fn,
            getFloatTimeDomainData: fn,
            getFloatFrequencyData: fn,
            // gain
            gain: param(),
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
            type: 0,
            frequency: param(),
            Q: param(),
            detune: param(),
            // delay
            delayTime: param(),
            // convolver
            buffer: 0,
            // compressor
            threshold: param(),
            knee: param(),
            ratio: param(),
            attack: param(),
            release: param(),
            reduction: param(),
            // distortion
            oversample: 0,
            curve: 0,
            // buffer
            sampleRate: 1,
            length: 0,
            duration: 0,
            numberOfChannels: 0,
            getChannelData: function() {
                return [];
            },
            copyFromChannel: fn,
            copyToChannel: fn,
            // listener
            dopplerFactor: 0,
            speedOfSound: 0,
            // osc
            start: fn
        };
    }

    // ie9
    if (!window.Uint8Array) {
        window.Uint8Array = window.Float32Array = Array;
    }

    return {
        isFake: true,
        activeSourceCount: 0,
        createAnalyser: fakeNode,
        createBuffer: fakeNode,
        createBufferSource: fakeNode,
        createMediaElementSource: fakeNode,
        createMediaStreamSource: fakeNode,
        createBiquadFilter: fakeNode,
        createChannelMerger: fakeNode,
        createChannelSplitter: fakeNode,
        createDynamicsCompressor: fakeNode,
        createConvolver: fakeNode,
        createDelay: fakeNode,
        createGain: fakeNode,
        createOscillator: fakeNode,
        createPanner: fakeNode,
        createScriptProcessor: fakeNode,
        createWaveShaper: fakeNode,
        decodeAudioData: fn,
        destination: fakeNode,
        listener: fakeNode(),
        sampleRate: 44100,
        state: '',
        get currentTime() {
            return (Date.now() - startTime) / 1000;
        }
    };
}
