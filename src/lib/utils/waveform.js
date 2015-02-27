'use strict';

function waveform() {

    var buffer,
        waveform;

    return function(audioBuffer, length) {
        if(!window.Float32Array || !window.AudioBuffer) { return []; }

        var sameBuffer = buffer === audioBuffer;
        var sameLength = waveform && waveform.length === length;
        if(sameBuffer && sameLength) { return waveform; }

        //console.time('waveformData');
        if(!waveform || waveform.length !== length) {
            waveform = new Float32Array(length);
        }

        if(!audioBuffer) { return waveform; }

        // cache for repeated calls
        buffer = audioBuffer;

        var chunk = Math.floor(buffer.length / length),
            resolution = 5, // 10
            incr = Math.max(Math.floor(chunk / resolution), 1),
            greatest = 0;

        for(var i = 0; i < buffer.numberOfChannels; i++) {
            // check each channel
            var channel = buffer.getChannelData(i);
            for(var j = 0; j < length; j++) {
                // get highest value within the chunk
                for(var k = j * chunk, l = k + chunk; k < l; k += incr) {
                    // select highest value from channels
                    var a = channel[k];
                    if(a < 0) { a = -a; }
                    if(a > waveform[j]) {
                        waveform[j] = a;
                    }
                    // update highest overall for scaling
                    if(a > greatest) {
                        greatest = a;
                    }
                }
            }
        }
        // scale up
        var scale = 1 / greatest;
        for(i = 0; i < waveform.length; i++) {
            waveform[i] *= scale;
        }
        //console.timeEnd('waveformData');

        return waveform;
    };
}

module.exports = waveform;
