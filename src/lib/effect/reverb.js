'use strict';

function Reverb(context, config) {
    config = config || {};

    var time = config.time || 1,
        decay = config.decay || 5,
        reverse = !!config.reverse,
        rate = context.sampleRate,
        length,
        impulseResponse;

    var input = context.createGain();
    var reverb = context.createConvolver();
    var output = context.createGain();

    input.connect(reverb);
    input.connect(output);
    reverb.connect(output);

    var node = input;
    node.name = 'Reverb';
    node._output = output;

    node.update = function(config) {
        if(config.time !== undefined) {
            time = config.time;
            length = rate * time;
            impulseResponse = context.createBuffer(2, length, rate);
        }
        if(config.decay !== undefined) {
            decay = config.decay;
        }
        if(config.reverse !== undefined) {
            reverse = config.reverse;
        }

        var left = impulseResponse.getChannelData(0),
            right = impulseResponse.getChannelData(1),
            n, e;

        for (var i = 0; i < length; i++) {
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
            get: function() { return time; },
            set: function(value) {
                console.log('set time:', value);
                if(value === time) { return; }
                this.update({time: time});
            }
        },
        decay: {
            get: function() { return decay; },
            set: function(value) {
                if(value === decay) { return; }
                this.update({decay: decay});
            }
        },
        reverse: {
            get: function() { return reverse; },
            set: function(value) {
                if(value === reverse) { return; }
                this.update({reverse: !!value});
            }
        }
    });

    return node;
}

module.exports = Reverb;
