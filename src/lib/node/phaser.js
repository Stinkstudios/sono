'use strict';

function Phaser(context, gain) {
    var stages = 8,
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
        //filter.frequency.value = 100 * i;
        filters.push(filter);
        //filter.Q.value = 100;
        if(i > 0) {
            filters[i-1].connect(filters[i]);
        }
        lfoGain.connect(filters[i].frequency);
    }

    var node = context.createGain();
    node.gain.value = 0.5; // wet/dry mix

    var first = filters[0];
    var last = filters[filters.length - 1];
    //node.passThrough = true;
    //node._output = last;

    node._connected = function(to) {
        //console.log.apply(console, ['phaser connected to', (to.name || to.constructor.name)]);
        node.connect(to);
        node.connect(first);
        last.connect(to);
        last.connect(feedbackGain);
        feedbackGain.connect(first);
    };

    node.lfoFrequency = lfo.frequency;
    node.lfoGain = lfoGain.gain;
    node.feedbackGain = feedbackGain.gain;
    node.name = 'Phaser';

    return node;
}

module.exports = Phaser;


/*

  tsw.phaser = function (settings) {

        
        Phaser
        ======
        +----------+     +-----------------+               +-----------------+
        |  Input   |-->--| All-pass Filter |-->--(..n)-->--| All-pass Filter |
        | (Source) |     | (BiquadFilter)  |               |  (BiquadFilter) |
        +----------+     +-----------------+               +-----------------+
              |                |      |                           |
              v                v      Ê                           v 
        +---------------+      |      |                     +----------+
        |     Output    |---<--+      +----------<----------| Feedback |
        | (Destination) |                                   |  (Gain)  |
        +---------------+                                   +----------+

        Config
        ------
        Rate: The speed at which the filter changes
        Depth: The depth of the filter change
        Resonance: Strength of the filter effect
        

        var node = tsw.createNode(),
            allPassFilters = [],
            feedback = tsw.gain(),
            i = 0;

        node.settings = {
            rate: 8,
            depth: 0.5,
            feedback: 0.8
        };

        // Set values
        settings = settings || {};

        feedback.gain.value = settings.feedback || node.settings.feedback;
        settings.rate = settings.rate || node.settings.rate;

        for (i = 0; i < settings.rate; i++) {
            allPassFilters[i] = tsw.context().createBiquadFilter();
            allPassFilters[i].type = 7;
            allPassFilters[i].frequency.value = 100 * i;
        }

        for (i = 0; i < allPassFilters.length - 1; i++) {
            tsw.connect(allPassFilters[i], allPassFilters[i + 1]);
        }

        tsw.connect(node.input, allPassFilters[allPassFilters.length - 1], feedback, allPassFilters[0]);
        tsw.connect(allPassFilters[allPassFilters.length - 1], node.output);

        node.setCutoff = function (c) {
            for (var i = 0; i < allPassFilters.length; i++) {
                allPassFilters[i].frequency.value = c;
            }
        };

        return node;
    };
    tsw.createNode = function (options) {
        var node = {};

        options = options || {};

        node.input = tsw.context().createGain();
        node.output = tsw.context().createGain();

        node.nodeType = options.nodeType || 'default';
        node.attributes = options.attributes;

        // Keep a list of nodes this node is connected to.
        node.connectedTo = [];

        if (options.hasOwnProperty('sourceNode')) {
            updateMethods.call(node, options);
        } else {
            options.sourceNode = false;
        }

        return node;
    };
*/