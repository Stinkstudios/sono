import sono from '../core/sono';

function waveform() {
    let buffer,
        wave;

    return function(audioBuffer, length) {
        if (!window.Float32Array || !window.AudioBuffer) {
            return [];
        }

        const sameBuffer = buffer === audioBuffer;
        const sameLength = wave && wave.length === length;
        if (sameBuffer && sameLength) {
            return wave;
        }

        if (!wave || wave.length !== length) {
            wave = new Float32Array(length);
        }

        if (!audioBuffer) {
            return wave;
        }

        // cache for repeated calls
        buffer = audioBuffer;

        const chunk = Math.floor(buffer.length / length),
            resolution = 5, // 10
            incr = Math.max(Math.floor(chunk / resolution), 1);
        let greatest = 0;

        for (let i = 0; i < buffer.numberOfChannels; i++) {
            // check each channel
            const channel = buffer.getChannelData(i);
            for (let j = 0; j < length; j++) {
                // get highest value within the chunk
                for (let k = j * chunk, l = k + chunk; k < l; k += incr) {
                    // select highest value from channels
                    let a = channel[k];
                    if (a < 0) {
                        a = -a;
                    }
                    if (a > wave[j]) {
                        wave[j] = a;
                    }
                    // update highest overall for scaling
                    if (a > greatest) {
                        greatest = a;
                    }
                }
            }
        }
        // scale up
        const scale = 1 / greatest;
        for (let i = 0; i < wave.length; i++) {
            wave[i] *= scale;
        }

        return wave;
    };
}

export default sono.register('waveform', waveform, sono.utils);
