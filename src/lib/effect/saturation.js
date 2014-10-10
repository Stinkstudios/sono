'use strict';

var Distortion = require('./distortion.js');

function Saturation(context) {
    var input = context.createGain();
    var drive = context.createGain();
    var lowpass = context.createBiquadFilter();
    var highpass = context.createBiquadFilter();
    //var waveShaper = context.createWaveShaper();
    var waveShaper = new Distortion(context, 0.5);
    var output = context.createGain();

    /*var curve = function(value) {
        var k = value * 100,
            n = 22050, // 
            curve = new Float32Array(n),
            deg = Math.PI / 180,
            x;

        for (var i = 0; i < n; i++) {
            x = i * 2 / n - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }

        return curve;
    };
    waveShaper.curve = curve(0.5);
    */

    highpass.type = 'highpass';
    highpass.frequency.value = 100;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 10000;
    drive.gain.value = 0.4;

    input.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(waveShaper);
    waveShaper.connect(drive);
    drive.connect(output);

    var node = input;
    node.name = 'Saturation';
    node._output = output;

    Object.defineProperties(node, {
        distortion: {
            get: function() { return waveShaper.amount; },
            set: function(value) { waveShaper.amount = value; }
        },
        gain: {
            get: function() { return drive.gain.value; },
            set: function(value) { drive.gain.value = value; }
        },
        highpass: {
            get: function() { return highpass.frequency.value; },
            set: function(value) { highpass.frequency.value = value; }
        },
        lowpass: {
            get: function() { return lowpass.frequency.value; },
            set: function(value) { lowpass.frequency.value = value; }
        }
    });

    return node;
}

module.exports = Saturation;
