'use strict';

function Phaser(context, gain) {
    var stages = 4,
        lfoFrequency = 8,
        lfoGainValue = gain || 20,
        feedback = 0.5,
        filter,
        filters = [];

    var lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = lfoFrequency;
    var lfoGain = context.createGain();
    lfoGain.gain.value = lfoGainValue;
    lfo.connect(lfoGain);
    lfo.start();

    var feedbackGain = context.createGain();
    feedbackGain.gain.value = feedback;

    for (var i = 0; i < stages; i++) {
        filter = context.createBiquadFilter();
        filter.type = 'allpass';
        filters.push(filter);
        //filter.Q.value = 100;
        if(i > 0) {
            filters[i-1].connect(filters[i]);
        }
        lfoGain.connect(filters[i].frequency);
    }

    var node = filters[0];
    node._out = filters[filters.length - 1];

    node._connected = function() {
        console.log.apply(console, ['phaser connected']);
        this._out.connect(feedbackGain);
        feedbackGain.connect(node);
    };

    return node;
}

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Phaser;
}
