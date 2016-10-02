import Microphone from './microphone';
import waveformer from './waveformer';

/*
 * audio ctx
 */
let ctx;
let offlineCtx;

function getContext() {
    if (ctx) {
        return ctx;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;

    ctx = (Ctx ? new Ctx() : null);

    // Handles bug in Safari 9 OSX where AudioContext instance starts in 'suspended' state

    const isSuspended = ctx && ctx.state === 'suspended';

    if (isSuspended && typeof ctx.resume === 'function') {
        window.setTimeout(function() {
            ctx.resume();
        }, 1000);
    }

    return ctx;
}

/*
In contrast with a standard AudioContext, an OfflineAudioContext doesn't render
the audio to the device hardware;
instead, it generates it, as fast as it can, and outputs the result to an AudioBuffer.
*/
function getOfflineContext(numOfChannels, length, sampleRate) {
    if (offlineCtx) {
        return offlineCtx;
    }
    numOfChannels = numOfChannels || 2;
    sampleRate = sampleRate || 44100;
    length = sampleRate || numOfChannels;

    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;

    offlineCtx = (OfflineCtx ? new OfflineCtx(numOfChannels, length, sampleRate) : null);

    return offlineCtx;
}


/*
 * clone audio buffer
 */

function cloneBuffer(buffer) {
    if (!ctx) {
        return buffer;
    }

    const numChannels = buffer.numberOfChannels,
        cloned = ctx.createBuffer(numChannels, buffer.length, buffer.sampleRate);
    for (let i = 0; i < numChannels; i++) {
        cloned.getChannelData(i)
            .set(buffer.getChannelData(i));
    }
    return cloned;
}

/*
 * reverse audio buffer
 */

function reverseBuffer(buffer) {
    const numChannels = buffer.numberOfChannels;
    for (let i = 0; i < numChannels; i++) {
        Array.prototype.reverse.call(buffer.getChannelData(i));
    }
    return buffer;
}

/*
 * ramp audio param
 */

function ramp(param, fromValue, toValue, duration, linear) {
    if (!ctx) {
        return;
    }

    param.setValueAtTime(fromValue, ctx.currentTime);

    if (linear) {
        param.linearRampToValueAtTime(toValue, ctx.currentTime + duration);
    } else {
        param.exponentialRampToValueAtTime(toValue, ctx.currentTime + duration);
    }
}

/*
 * get frequency from min to max by passing 0 to 1
 */

function getFrequency(value) {
    if (!ctx) {
        return 0;
    }
    // get frequency by passing number from 0 to 1
    // Clamp the frequency between the minimum value (40 Hz) and half of the
    // sampling rate.
    const minValue = 40;
    const maxValue = ctx.sampleRate / 2;
    // Logarithm (base 2) to compute how many octaves fall in the range.
    const numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
    // Compute a multiplier from 0 to 1 based on an exponential scale.
    const multiplier = Math.pow(2, numberOfOctaves * (value - 1.0));
    // Get back to the frequency value between min and max.
    return maxValue * multiplier;
}

/*
 * microphone util
 */

function microphone(connected, denied, error) {
    return new Microphone(connected, denied, error);
}

/*
 * Format seconds as timecode string
 */

function timeCode(seconds, delim = ':') {
    // const h = Math.floor(seconds / 3600);
    // const m = Math.floor((seconds % 3600) / 60);
    const m = Math.floor(seconds / 60);
    const s = Math.floor((seconds % 3600) % 60);
    // const hr = (h < 10 ? '0' + h + delim : h + delim);
    const mn = (m < 10 ? '0' + m : m) + delim;
    const sc = (s < 10 ? '0' + s : s);
    // return hr + mn + sc;
    return mn + sc;
}

export default Object.freeze({
    getContext,
    getOfflineContext,
    cloneBuffer,
    reverseBuffer,
    ramp,
    getFrequency,
    microphone,
    timeCode,
    waveformer
});
