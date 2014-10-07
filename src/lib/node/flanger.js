'use strict';

function MonoFlanger(context, config) {
    var feedbackGain = config.feedback || 0.5,
        delayTime = config.delay || 0.005,
        lfoGain = config.gain || 0.002,
        lfoFreq = config.frequency || 0.25;

    var input = context.createGain();
    var delay = context.createDelay();
    var feedback = context.createGain();
    var lfo = context.createOscillator();
    var gain = context.createGain();
    var output = context.createGain();

    delay.delayTime.value = delayTime; // 5-25ms delay (0.005 > 0.025)
    feedback.gain.value = feedbackGain; // 0 > 1

    lfo.type = 'sine';
    lfo.frequency.value = lfoFreq; // 0.05 > 5
    gain.gain.value = lfoGain; // 0.0005 > 0.005

    input.connect(output);
    input.connect(delay);
    delay.connect(output);
    delay.connect(feedback);
    feedback.connect(input);

    lfo.connect(gain);
    gain.connect(delay.delayTime);
    lfo.start();
    
    var node = input;
    node.name = 'Flanger';
    node._output = output;
    
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

function StereoFlanger(context, config) {
    var feedbackGain = config.feedback || 0.5,
        delayTime = config.delay || 0.003,
        lfoGain = config.gain || 0.005,
        lfoFreq = config.frequency || 0.5;

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
    };

    return node;
}

function Flanger(context, config) {
    config = config || {};
    return config.stereo ? new StereoFlanger(context, config) : new MonoFlanger(context, config);
}

module.exports = Flanger;
