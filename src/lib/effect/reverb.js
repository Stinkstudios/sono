'use strict';

function Reverb(context, config) {
    config = config || {};

    var time = config.time || 1,
        decay = config.decay || 5,
        reverse = !!config.reverse,
        node = context.createConvolver(),
        numChannels = 2,
        rate = context.sampleRate,
        length,
        impulseResponse;

    node.update = function(config) {
        if(config.time !== undefined) {
            time = config.time;
            length = rate * time;
            impulseResponse = context.createBuffer(numChannels, length, rate);
        }
        if(config.decay !== undefined) {
            decay = config.decay;
        }
        if(config.reverse !== undefined) {
            reverse = !!config.reverse;
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

        this.buffer = impulseResponse;
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
                time = value;
                this.update({time: time});
            }
        },
        decay: {
            get: function() { return decay; },
            set: function(value) {
                if(value === decay) { return; }
                decay = value;
                this.update({decay: decay});
            }
        },
        reverse: {
            get: function() { return reverse; },
            set: function(value) {
                reverse = value;
                this.update({reverse: reverse});
            }
        }
    });

    return node;
}

module.exports = Reverb;
