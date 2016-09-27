import {number} from '../utils/validify.js';

function MonoFlanger(context, config) {
    const input = context.createGain();
    const delay = context.createDelay();
    const feedback = context.createGain();
    const lfo = context.createOscillator();
    const gain = context.createGain();
    const output = context.createGain();

    delay.delayTime.value = number(config.delay, 0.005); // 5-25ms delay (0.005 > 0.025)
    feedback.gain.value = number(config.feedback, 0.5); // 0 > 1

    lfo.type = 'sine';
    lfo.frequency.value = number(config.frequency, 0.002); // 0.05 > 5
    gain.gain.value = number(config.gain, 0.25); // 0.0005 > 0.005

    input.connect(output);
    input.connect(delay);
    delay.connect(output);
    delay.connect(feedback);
    feedback.connect(input);

    lfo.connect(gain);
    gain.connect(delay.delayTime);
    lfo.start(0);

    const node = input;
    node.name = 'Flanger';
    node._output = output;

    Object.defineProperties(node, {
        delay: {
            get: function() {
                return delay.delayTime.value;
            },
            set: function(value) {
                delay.delayTime.value = value;
            }
        },
        lfoFrequency: {
            get: function() {
                return lfo.frequency.value;
            },
            set: function(value) {
                lfo.frequency.value = value;
            }
        },
        lfoGain: {
            get: function() {
                return gain.gain.value;
            },
            set: function(value) {
                gain.gain.value = value;
            }
        },
        feedback: {
            get: function() {
                return feedback.gain.value;
            },
            set: function(value) {
                feedback.gain.value = value;
            }
        }
    });

    return node;
}

function StereoFlanger(context, config) {
    const input = context.createGain();
    const splitter = context.createChannelSplitter(2);
    const merger = context.createChannelMerger(2);
    const feedbackL = context.createGain();
    const feedbackR = context.createGain();
    const lfo = context.createOscillator();
    const lfoGainL = context.createGain();
    const lfoGainR = context.createGain();
    const delayL = context.createDelay();
    const delayR = context.createDelay();
    const output = context.createGain();

    feedbackL.gain.value = feedbackR.gain.value = number(config.feedback, 0.5);
    delayL.delayTime.value = delayR.delayTime.value = number(config.delay, 0.003);

    lfo.type = 'sine';
    lfo.frequency.value = number(config.frequency, 0.5);
    lfoGainL.gain.value = number(config.gain, 0.005);
    lfoGainR.gain.value = 0 - lfoGainL.gain.value;

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
    lfo.start(0);

    const node = input;
    node.name = 'StereoFlanger';
    node._output = output;

    Object.defineProperties(node, {
        delay: {
            get: function() {
                return delayL.delayTime.value;
            },
            set: function(value) {
                delayL.delayTime.value = delayR.delayTime.value = value;
            }
        },
        lfoFrequency: {
            get: function() {
                return lfo.frequency.value;
            },
            set: function(value) {
                lfo.frequency.value = value;
            }
        },
        lfoGain: {
            get: function() {
                return lfoGainL.gain.value;
            },
            set: function(value) {
                lfoGainL.gain.value = lfoGainR.gain.value = value;
            }
        },
        feedback: {
            get: function() {
                return feedbackL.gain.value;
            },
            set: function(value) {
                feedbackL.gain.value = feedbackR.gain.value = value;
            }
        }
    });

    return node;
}

export default function Flanger(context, config) {
    config = config || {};
    return config.stereo ? new StereoFlanger(context, config) : new MonoFlanger(context, config);
}
