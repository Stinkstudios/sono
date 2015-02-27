'use strict';

var Microphone = require('./microphone.js'),
    Waveform = require('./waveform.js');

var Utils = {};

/*
 * audio context
 */

Utils.setContext = function(context) {
    this._context = context;
};

/*
 * audio buffer
 */

Utils.cloneBuffer = function(buffer) {
    if(!this._context) { return buffer; }

    var numChannels = buffer.numberOfChannels,
        cloned = this._context.createBuffer(numChannels, buffer.length, buffer.sampleRate);
    for (var i = 0; i < numChannels; i++) {
        cloned.getChannelData(i).set(buffer.getChannelData(i));
    }
    return cloned;
};

Utils.reverseBuffer = function(buffer) {
    var numChannels = buffer.numberOfChannels;
    for (var i = 0; i < numChannels; i++) {
        Array.prototype.reverse.call(buffer.getChannelData(i));
    }
    return buffer;
};

/*
 * ramp audio param
 */

Utils.ramp = function(param, fromValue, toValue, duration) {
    if(!this._context) { return; }

    param.setValueAtTime(fromValue, this._context.currentTime);
    param.linearRampToValueAtTime(toValue, this._context.currentTime + duration);
};

/*
 * get frequency from min to max by passing 0 to 1
 */

Utils.getFrequency = function(value) {
    if(!this._context) { return 0; }
    // get frequency by passing number from 0 to 1
    // Clamp the frequency between the minimum value (40 Hz) and half of the
    // sampling rate.
    var minValue = 40;
    var maxValue = this._context.sampleRate / 2;
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

Utils.microphone = function(connected, denied, error) {
    return new Microphone(connected, denied, error);
};

/*
 * Format seconds as timecode string
 */

Utils.timeCode = function(seconds, delim) {
    if(delim === undefined) { delim = ':'; }
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = Math.floor((seconds % 3600) % 60);
    var hr = (h === 0 ? '' : (h < 10 ? '0' + h + delim : h + delim));
    var mn = (m < 10 ? '0' + m : m) + delim;
    var sc = (s < 10 ? '0' + s : s);
    return hr + mn + sc;
};

/*
 * waveform
 */

Utils.drawWaveform = function(config) {
    var x, y;
    var canvas = config.canvas || document.createElement('canvas');
    var context = config.context || canvas.getContext('2d');
    var width = config.width || canvas.width;
    var height = config.height || canvas.height;
    var color = config.color || '#000000';
    var bgColor = config.bgColor;
    var data = config.waveform || (config.sound && config.sound.waveform(width));

    if(bgColor) {
        context.fillStyle = bgColor;
        context.fillRect(0, 0, width, height);
    } else {
        context.clearRect(0, 0, height, height);
    }

    context.strokeStyle = color;
    context.beginPath();

    for(var i = 0; i < data.length; i++) {
        x = i + 0.5;
        y = height - Math.round(height * data[i]);
        context.moveTo(x, y);
        context.lineTo(x, height);
    }
    context.stroke();

    return canvas;
};

// var drawCircular = function(ctx, waveform, radius, origin, color, percent) {
//     var step = (Math.PI * 2) / waveform.length,
//         angle, x, y, magnitude;

//     ctx.lineWidth = 1.5;
//     ctx.strokeStyle = color;
//     ctx.clearRect(0, 0, width, height);
//     ctx.beginPath();

//     for(var i = 0; i < waveform.length * percent; i++) {
//         angle = i * step - Math.PI / 2;
//         x = origin + radius * Math.cos(angle);
//         y = origin + radius * Math.sin(angle);
//         ctx.moveTo(x, y);

//         magnitude = radius + radius * waveform[i];
//         x = origin + magnitude * Math.cos(angle);
//         y = origin + magnitude * Math.sin(angle);
//         ctx.lineTo(x, y);
//     }
//     ctx.stroke();
// };

module.exports = Utils;
