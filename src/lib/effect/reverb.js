import {number} from '../utils/validify.js';

export default function Reverb(context, config = {}) {
    const rate = context.sampleRate;

    let time = number(config.time, 1);
    let decay = number(config.decay, 5);
    let reverse = !!config.reverse;
    let length;
    let impulseResponse;

    const input = context.createGain();
    const reverb = context.createConvolver();
    const output = context.createGain();

    input.connect(reverb);
    input.connect(output);
    reverb.connect(output);

    const node = input;
    node.name = 'Reverb';
    node._output = output;

    node.update = function(opt) {
        if (typeof opt.time !== 'undefined') {
            time = opt.time;
            length = Math.floor(rate * time);
            impulseResponse = length ? context.createBuffer(2, length, rate) : null;
        }
        if (typeof opt.decay !== 'undefined') {
            decay = opt.decay;
        }
        if (typeof opt.reverse !== 'undefined') {
            reverse = opt.reverse;
        }

        if (!impulseResponse) {
            reverb.buffer = null;
            return;
        }

        const left = impulseResponse.getChannelData(0);
        const right = impulseResponse.getChannelData(1);
        let n, e;

        for (let i = 0; i < length; i++) {
            n = reverse ? length - i : i;
            e = Math.pow(1 - n / length, decay);
            left[i] = (Math.random() * 2 - 1) * e;
            right[i] = (Math.random() * 2 - 1) * e;
        }

        reverb.buffer = impulseResponse;
    };

    node.update({
        time: time,
        decay: decay,
        reverse: reverse
    });

    Object.defineProperties(node, {
        time: {
            get: function() {
                return time;
            },
            set: function(value) {
                if (value === time) {
                    return;
                }
                this.update({
                    time: value
                });
            }
        },
        decay: {
            get: function() {
                return decay;
            },
            set: function(value) {
                if (value === decay) {
                    return;
                }
                this.update({
                    decay: value
                });
            }
        },
        reverse: {
            get: function() {
                return reverse;
            },
            set: function(value) {
                if (value === reverse) {
                    return;
                }
                this.update({
                    reverse: !!value
                });
            }
        }
    });

    return node;
}
