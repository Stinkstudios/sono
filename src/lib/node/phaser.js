'use strict';

function Phaser(context, delayTime, gainValue) {
    var stages = 4,
        filter,
        filters = [];

    for (var i = 0; i < stages; i++) {
        filter = context.createBiquadFilter();
        filter.type = 'allpass';
        filters.push(filter);
        
    }

    var lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 8;
    var lfoGain = context.createGain();
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain);
    filters.forEach(function(filter) {
        lfoGain.connect(filter.frequency);
    });
    lfo.start();


    var node = filters[0];

    node._connected = function() {
        console.log.apply(console, ['phaser connected'])
        for (var i = 1; i < stages; i++) {
            filters[i].disconnect();
            filters[i].connect(filters[i-1]);
        }
    };

    node._input = node;
    node._output = filters[3];

    return node;
}

/*function LFO(context) {
    var node = context.createScriptProcessor(256, 2, 2);
    var offset = 0.85;
    var oscillation = 0.3;
    var frequency = 8;
    var phase = 0;
    var phaseInc = 2 * Math.PI * frequency * node.bufferSize / node.sampleRate;

    node.onaudioprocess = function (event) {
        phase += phaseInc;
        if(phase > 2 * Math.PI) {
            phase = 0;
        }
        var freq = offset + oscillation * Math.sin(phase);

        for(var stage = 0; stage < 4; stage++) {
            filters[stage].frequency.value = freq;
        }
    };
}*/

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Phaser;
}
