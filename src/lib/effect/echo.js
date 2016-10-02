import {number} from '../utils/validify.js';

export default function Echo(context, config) {
    config = config || {};

    const input = context.createGain();
    const delay = context.createDelay();
    const gain = context.createGain();
    const output = context.createGain();

    delay.delayTime.value = number(config.delayTime, 0.5);
    gain.gain.value = number(config.feedback, 0.5);

    input.connect(delay);
    input.connect(output);
    delay.connect(gain);
    gain.connect(delay);
    gain.connect(output);

    const node = input;
    node.name = 'Echo';
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
        feedback: {
            get: function() {
                return gain.gain.value;
            },
            set: function(value) {
                gain.gain.value = value;
            }
        }
    });

    return node;
}
