'use strict';

var Microphone = require('./microphone.js');
var waveformer = require('./waveformer.js');

/*
 * audio ctx
 */
var ctx;

var getContext = function() {
    if (ctx) { return ctx; }

    var Ctx = window.AudioContext || window.webkitAudioContext;

    ctx = (Ctx ? new Ctx() : null);

    // Handles bug in Safari 9 OSX where AudioContext instance starts in 'suspended' state

    var isSuspended = ctx && ctx.state === 'suspended';

    if (isSuspended && typeof ctx.resume === 'function') {
        window.setTimeout(function() {
            ctx.resume();
        }, 1000);
    }

    return ctx;
};

/*
 * clone audio buffer
 */

var cloneBuffer = function(buffer) {
    if (!ctx) { return buffer; }

    var numChannels = buffer.numberOfChannels,
        cloned = ctx.createBuffer(numChannels, buffer.length, buffer.sampleRate);
    for (var i = 0; i < numChannels; i++) {
        cloned.getChannelData(i).set(buffer.getChannelData(i));
    }
    return cloned;
};

/*
 * reverse audio buffer
 */

var reverseBuffer = function(buffer) {
    var numChannels = buffer.numberOfChannels;
    for (var i = 0; i < numChannels; i++) {
        Array.prototype.reverse.call(buffer.getChannelData(i));
    }
    return buffer;
};

/*
 * ramp audio param
 */

var ramp = function(param, fromValue, toValue, duration, linear) {
    if (!ctx) { return; }

    param.setValueAtTime(fromValue, ctx.currentTime);

    if (linear) {
        param.linearRampToValueAtTime(toValue, ctx.currentTime + duration);
    } else {
        param.exponentialRampToValueAtTime(toValue, ctx.currentTime + duration);
    }
};

/*
 * get frequency from min to max by passing 0 to 1
 */

var getFrequency = function(value) {
    if (!ctx) { return 0; }
    // get frequency by passing number from 0 to 1
    // Clamp the frequency between the minimum value (40 Hz) and half of the
    // sampling rate.
    var minValue = 40;
    var maxValue = ctx.sampleRate / 2;
    // Logarithm (base 2) to compute how many octaves fall in the range.
    var numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
    // Compute a multiplier from 0 to 1 based on an exponential scale.
    var multiplier = Math.pow(2, numberOfOctaves * (value - 1.0));
    // Get back to the frequency value between min and max.
    return maxValue * multiplier;
};

/*
 * microphone util
 */

var microphone = function(connected, denied, error) {
    return new Microphone(connected, denied, error);
};

/*
 * Format seconds as timecode string
 */

var timeCode = function(seconds, delim) {
    if (delim === undefined) { delim = ':'; }
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor((seconds % 3600) % 60);
    var hr = (h === 0 ? '' : (h < 10 ? '0' + h + delim : h + delim));
    var mn = (m < 10 ? '0' + m : m) + delim;
    var sc = (s < 10 ? '0' + s : s);
    return hr + mn + sc;
};

module.exports = Object.freeze({
    getContext: getContext,
    cloneBuffer: cloneBuffer,
    reverseBuffer: reverseBuffer,
    ramp: ramp,
    getFrequency: getFrequency,
    microphone: microphone,
    timeCode: timeCode,
    waveformer: waveformer
});
