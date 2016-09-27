import {number} from '../utils/validify.js';

const n = 22050;

export default function Distortion(context, amount) {

    amount = number(amount, 1);

    const node = context.createWaveShaper();
    const curve = new Float32Array(n);

    // create waveShaper distortion curve from 0 to 1
    node.update = function(value) {
        amount = value;
        if (amount <= 0) {
            amount = 0;
            this.curve = null;
            return;
        }
        const k = value * 100;
        const deg = Math.PI / 180;
        let x;

        for (let i = 0; i < n; i++) {
            x = i * 2 / n - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }

        this.curve = curve;
    };

    Object.defineProperties(node, {
        amount: {
            get: function() {
                return amount;
            },
            set: function(value) {
                this.update(value);
            }
        }
    });

    if (typeof amount !== 'undefined') {
        node.update(amount);
    }

    return node;
}
