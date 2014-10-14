'use strict';

var Microphone = require('./microphone.js'),
    Waveform = require('./waveform.js'),
    Utils = {};

Utils.setContext = function(context) {
    this._context = context;
};

/*
 * audio buffer
 */

Utils.cloneBuffer = function(buffer) {
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
 * fade gain
 */

Utils.crossFade = function(fromSound, toSound, duration) {
    var from = this.isAudioParam(fromSound) ? fromSound : fromSound.gain.gain;
    var to = this.isAudioParam(toSound) ? toSound : toSound.gain.gain;

    this.ramp(from, from.value, 0, duration);
    this.ramp(to, to.value, 1, duration);
};

Utils.fadeFrom = function(sound, value, duration) {
    var param = this.isAudioParam(sound) ? sound : sound.gain.gain;
    this.ramp(param, value, param.value, duration);
};

Utils.fadeTo = function(sound, value, duration) {
    var param = this.isAudioParam(sound) ? sound : sound.gain.gain;
    this.ramp(param, param.value, value, duration);
};

Utils.ramp = function(param, fromValue, toValue, duration) {
    if(!this._context) { return; }

    param.setValueAtTime(fromValue, this._context.currentTime);
    param.linearRampToValueAtTime(toValue, this._context.currentTime + duration);
};

/*
 * get frequency from min to max by passing 0 to 1
 */

Utils.getFrequency = function(value) {
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
 * detect file types
 */

Utils.isAudioBuffer = function(data) {
    return !!(data &&
              window.AudioBuffer &&
              data instanceof window.AudioBuffer);
};

Utils.isMediaElement = function(data) {
    return !!(data &&
              window.HTMLMediaElement &&
              data instanceof window.HTMLMediaElement);
};

Utils.isMediaStream = function(data) {
    return !!(data &&
              typeof data.getAudioTracks === 'function' &&
              data.getAudioTracks().length &&
              window.MediaStreamTrack &&
              data.getAudioTracks()[0] instanceof window.MediaStreamTrack);
};

Utils.isOscillatorType = function(data) {
    return !!(data && typeof data === 'string' &&
             (data === 'sine' || data === 'square' ||
              data === 'sawtooth' || data === 'triangle'));
};

Utils.isScriptConfig = function(data) {
    return !!(data && typeof data === 'object' &&
              data.bufferSize && data.channels && data.callback);
};

Utils.isAudioParam = function(data) {
    return !!(data && window.AudioParam && data instanceof window.AudioParam);
};

/*
 * microphone util
 */

Utils.microphone = function(connected, denied, error, thisArg) {
    return new Microphone(connected, denied, error, thisArg);
};

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

Utils.waveform = function(buffer, length) {
    return new Waveform(buffer, length);
};

/*
 * Page visibility
 */

Utils.handlePageVisibility = function(onHidden, onShown, thisArg) {
    var hidden,
        visibilityChange;

    if (typeof document.hidden !== 'undefined') {
        hidden = 'hidden';
        visibilityChange = 'visibilitychange';
    }
    else if (typeof document.mozHidden !== 'undefined') {
        hidden = 'mozHidden';
        visibilityChange = 'mozvisibilitychange';
    }
    else if (typeof document.msHidden !== 'undefined') {
        hidden = 'msHidden';
        visibilityChange = 'msvisibilitychange';
    }
    else if (typeof document.webkitHidden !== 'undefined') {
        hidden = 'webkitHidden';
        visibilityChange = 'webkitvisibilitychange';
    }

    function onChange() {
        if (document[hidden]) {
            onHidden.call(thisArg);
        }
        else {
            onShown.call(thisArg);
        }
    }

    if(visibilityChange !== undefined) {
        document.addEventListener(visibilityChange, onChange, false);
    }
};

/*
 * Touch lock
 */

Utils.handleTouchlock = function(onUnlock, thisArg) {
    var ua = navigator.userAgent,
        locked = !!ua.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i);

    var unlock = function() {
        document.body.removeEventListener('touchstart', unlock);

        if(this._context) {
            var buffer = this._context.createBuffer(1, 1, 22050);
            var unlockSource = this._context.createBufferSource();
            unlockSource.buffer = buffer;
            unlockSource.connect(this._context.destination);
            unlockSource.start(0);
        }

        onUnlock.call(thisArg);

    }.bind(this);

    if(locked) {
        document.body.addEventListener('touchstart', unlock, false);
    }
    return locked;
};

module.exports = Utils;
