import {number} from '../utils/validify.js';

export default function Phaser(context, config = {}) {
    const stages = number(config.stages, 8);
    const filters = [];
    let filter;

    const input = context.createGain();
    const feedback = context.createGain();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    const output = context.createGain();

    feedback.gain.value = number(config.feedback, 0.5);

    lfo.type = 'sine';
    lfo.frequency.value = number(config.frequency, 0.5);
    lfoGain.gain.value = number(config.gain, 300);

    for (let i = 0; i < stages; i++) {
        filter = context.createBiquadFilter();
        filter.type = 'allpass';
        filter.frequency.value = 1000 * i;
        //filter.Q.value = 10;
        if (i > 0) {
            filters[i - 1].connect(filter);
        }
        lfoGain.connect(filter.frequency);

        filters.push(filter);
    }

    const first = filters[0];
    const last = filters[filters.length - 1];

    input.connect(first);
    input.connect(output);
    last.connect(output);
    last.connect(feedback);
    feedback.connect(first);
    lfo.connect(lfoGain);
    lfo.start(0);

    const node = input;
    node.name = 'Phaser';
    node._output = output;

    Object.defineProperties(node, {
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
                return lfoGain.gain.value;
            },
            set: function(value) {
                lfoGain.gain.value = value;
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
