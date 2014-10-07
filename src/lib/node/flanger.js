'use strict';

function MonoFlanger(context) {
    var feedbackGain = 0.5,
        delayTime = 0.005,
        lfoGain = 0.002,
        lfoFreq = 0.25;

    // 5-25ms delay (0.005 > 0.025)
    var delay = context.createDelay();
    delay.delayTime.value = 0.005;
    
    var input = context.createGain();

    var wet = context.createGain();
    wet.gain.value = 0.8;
    
    // 0 > 1
    var feedback = context.createGain();
    feedback.gain.value = 0.5;

    // 0.05 > 5
    var lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.25;

    // 0.0005 > 0.005
    var gain = context.createGain();
    gain.gain.value = 0.002;

    // 
    var output = context.createGain();

    var node = input;
    node.name = 'Flanger';
    node._input = input;
    node._output = output;

    node._connected = function(to) {
        console.log.apply(console, ['flanger connected to', (to.name || to.constructor.name)]);
        
        // TODO: should disconnect?
        lfo.disconnect();
        gain.disconnect();
        input.disconnect();
        delay.disconnect();
        feedback.disconnect();

        lfo.connect(gain);
        gain.connect(delay.delayTime);

        input.connect(output);
        input.connect(delay);
        delay.connect(output);
        delay.connect(feedback);
        feedback.connect(input);
    };

    lfo.start();
    
    Object.defineProperties(node, {
        delay: {
            get: function() { return delay.delayTime.value; },
            set: function(value) { delay.delayTime.value = value; }
        },
        lfoFrequency: {
            get: function() { return lfo.frequency.value; },
            set: function(value) { lfo.frequency.value = value; }
        },
        lfoGain: {
            get: function() { return gain.gain.value; },
            set: function(value) { gain.gain.value = value; }
        },
        feedback: {
            get: function() { return feedback.gain.value; },
            set: function(value) { feedback.gain.value = value; }
        }
    });

    return node;
}

function StereoFlanger(context) {
    var feedbackGain = 0.5,
        delayTime = 0.003,
        lfoGain = 0.005,
        lfoFreq = 0.5;

    var input = context.createGain();
    var splitter = context.createChannelSplitter(2);
    var merger = context.createChannelMerger(2);
    var feedbackL = context.createGain();
    var feedbackR = context.createGain();
    var lfo = context.createOscillator();
    var lfoGainL = context.createGain();
    var lfoGainR = context.createGain();
    var delayL = context.createDelay();
    var delayR = context.createDelay();
    var output = context.createGain();

    feedbackL.gain.value = feedbackR.gain.value = feedbackGain;
    delayL.delayTime.value = delayR.delayTime.value = delayTime;

    lfo.type = 'sine';
    lfo.frequency.value = lfoFreq;
    lfoGainL.gain.value = lfoGain;
    lfoGainR.gain.value = 0 - lfoGain;

    input.connect(splitter);
    
    splitter.connect(delayL, 0);
    splitter.connect(delayR, 1);
    
    delayL.connect(feedbackL);
    delayR.connect(feedbackR);

    feedbackL.connect(delayR);
    feedbackR.connect(delayL);

    delayL.connect(merger, 0, 0);
    delayR.connect(merger, 0, 1);

    merger.connect(output);
    input.connect(output);

    lfo.connect(lfoGainL);
    lfo.connect(lfoGainR);
    lfoGainL.connect(delayL.delayTime);
    lfoGainR.connect(delayR.delayTime);
    lfo.start();

    var node = input;
    node.name = 'StereoFlanger';
    node._output = output;

    Object.defineProperties(node, {
        delay: {
            get: function() { return delayL.delayTime.value; },
            set: function(value) { delayL.delayTime.value = delayR.delayTime.value = value; }
        },
        lfoFrequency: {
            get: function() { return lfo.frequency.value; },
            set: function(value) { lfo.frequency.value = value; }
        },
        lfoGain: {
            get: function() { return lfoGainL.gain.value; },
            set: function(value) { lfoGainL.gain.value = lfoGainR.gain.value = value; }
        },
        feedback: {
            get: function() { return feedbackL.gain.value; },
            set: function(value) { feedbackL.gain.value = feedbackR.gain.value = value; }
        }
    });

    node._connected = function(to) {
        console.log.apply(console, ['flanger connected to', (to.name || to.constructor.name)]);

        //input.connect(splitter);
        //input.connect(output);
    };

    return node;
}

function Flanger(context, isStereo) {
    return isStereo ? new StereoFlanger(context) : new MonoFlanger(context);
}

module.exports = Flanger;

/*
function createFlange() {
    var delay = context.createDelay();
    delay.delayTime.value = parseFloat(document.getElementById("fldelay").value); // 0.001 > 0.02 (0.005)

    var input = context.createGain();
    
    var feedback = context.createGain();
    feedback.gain.value = parseFloat(document.getElementById("flfb").value); // 0 > 1 (0.5)

    var lfo = context.createOscillator();
    lfo.type = lfo.SINE;
    lfo.frequency.value = parseFloat(document.getElementById("flspeed").value); // 0.05 > 5 (0.25)
    
    var lfoGain = context.createGain();
    lfoGain.gain.value = parseFloat(document.getElementById("fldepth").value); // 0.0005 > 0.005 (0.002)

    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);

    input.connect(output);
    input.connect(delay);
    delay.connect(output);
    delay.connect(feedback);
    feedback.connect(input);

    lfo.start(0);

    return input;
}
*/


/*
function StereoFlanger() {
    var feedbackGain = 0.5,
        delayTime = 0.005,
        lfoGain = 0.002,
        lfoFreq = 0.25;

    var splitter = context.createChannelSplitter(2);
    var merger = context.createChannelMerger(2);
    var input = context.createGain();
    feedbackL = context.createGain();
    feedbackR = context.createGain();
    lfo = context.createOscillator();
    lfoGainL = context.createGain();
    lfoGainR = context.createGain();
    delayL = context.createDelay();
    delayR = context.createDelay();


    feedbackL.gain.value = feedbackR.gain.value = feedbackGain;

    input.connect(splitter);
    input.connect(output);

    delayL.delayTime.value = delayTime;
    delayR.delayTime.value = delayTime;

    splitter.connect(delayL, 0);
    splitter.connect(delayR, 1);
    delayL.connect(feedbackL);
    delayR.connect(feedbackR);
    feedbackL.connect(delayR);
    feedbackR.connect(delayL);

    lfoGainL.gain.value = lfoGain; // depth of change to the delay:
    lfoGainR.gain.value = 0 - lfoGain; // depth of change to the delay:

    lfo.type = lfo.TRIANGLE;
    lfo.frequency.value = lfoFreq;

    lfo.connect(lfoGainL);
    lfo.connect(lfoGainR);

    lfoGainL.connect(delayL.delayTime);
    lfoGainR.connect(delayR.delayTime);

    delayL.connect(merger, 0, 0);
    delayR.connect(merger, 0, 1);
    merger.connect(output);

    lfo.start(0);

    return input;
}
*/