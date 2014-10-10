'use strict';

function Waveform() {

    var audioBuffer,
        waveformData;

    var compute = function(buffer, length) {
        if(!window.Float32Array || !window.AudioBuffer) { return []; }

        var sameBuffer = buffer === audioBuffer;
        var sameLength = waveformData && waveformData.length === length;
        if(sameBuffer && sameLength) { return waveformData; }
        
        //console.log('-------------------');
        //console.time('waveformData');
        var waveform = new Float32Array(length),
            chunk = Math.floor(buffer.length / length),
            //chunk = buffer.length / length,
            resolution = 5, // 10
            incr = Math.floor(chunk / resolution),
            greatest = 0;

        if(incr < 1) { incr = 1; }

        for (var i = 0, chnls = buffer.numberOfChannels; i < chnls; i++) {
            // check each channel
            var channel = buffer.getChannelData(i);
            //for (var j = length - 1; j >= 0; j--) {
            for (var j = 0; j < length; j++) {
                // get highest value within the chunk
                //var ch = j * chunk;
                //for (var k = ch + chunk - 1; k >= ch; k -= incr) {
                for (var k = j * chunk, l = k + chunk; k < l; k += incr) {
                    // select highest value from channels
                    var a = channel[k];
                    if(a < 0) { a = -a; }
                    if (a > waveform[j]) {
                        waveform[j] = a;
                    }
                    // update highest overall for scaling
                    if(a > greatest) {
                        greatest = a;
                    }
                }
            }
        }
        // scale up?
        var scale = 1 / greatest,
            len = waveform.length;
        for (i = 0; i < len; i++) {
            waveform[i] *= scale;
        }
        //console.timeEnd('waveformData');

        // cache for repeated calls
        audioBuffer = buffer;
        waveformData = waveform;

        return waveform;
    };

    var draw = function(config) {
        var x, y;
        var canvas = config.canvas || document.createElement('canvas');
        var width = config.width || canvas.width;
        var height = config.height || canvas.height;
        var color = config.color || '#333333';
        var bgColor = config.bgColor || '#dddddd';
        var buffer = config.sound ? config.sound.data : config.buffer || audioBuffer;
        var data = this.compute(buffer, width);

        var context = canvas.getContext('2d');
        context.strokeStyle = color;
        context.fillStyle = bgColor;
        context.fillRect(0, 0, width, height);
        context.beginPath();
        for (var i = 0; i < data.length; i++) {
            x = i + 0.5;
            y = height - Math.round(height * data[i]);
            context.moveTo(x, y);
            context.lineTo(x, height);
        }
        context.stroke();

        return canvas;
    };
    
    return Object.freeze({
        compute: compute,
        draw: draw
    });
}

module.exports = Waveform;
