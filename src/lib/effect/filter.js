// https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
// For lowpass and highpass Q indicates how peaked the frequency is around the cutoff.
// The greater the value is, the greater is the peak

export default function Filter(context, config = {}) {
    // Frequency between 40Hz and half of the sampling rate
    const minFrequency = 40;
    const maxFrequency = context.sampleRate / 2;

    const node = context.createBiquadFilter();
    node.type = config.type;

    function getFrequency(value) {
        // Logarithm (base 2) to compute how many octaves fall in the range.
        const numberOfOctaves = Math.log(maxFrequency / minFrequency) / Math.LN2;
        // Compute a multiplier from 0 to 1 based on an exponential scale.
        const multiplier = Math.pow(2, numberOfOctaves * (value - 1.0));
        // Get back to the frequency value between min and max.
        return maxFrequency * multiplier;
    }

    node.set = function(frequency, q, gain) {
        if (typeof frequency !== 'undefined' && typeof frequency === 'number') {
            node.frequency.value = frequency;
        }
        if (typeof q !== 'undefined' && typeof q === 'number') {
            node.Q.value = q;
        }
        if (typeof gain !== 'undefined' && typeof gain === 'number') {
            node.gain.value = gain;
        }
        return node;
    };

    // set filter frequency based on value from 0 to 1
    node.setByPercent = function(percent, q, gain) {
        return node.set(getFrequency(percent), q, gain);
    };

    return node.set(config.frequency, config.q, config.gain);
}
