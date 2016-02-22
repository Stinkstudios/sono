'use strict';

module.exports = function(self) {
    self.addEventListener('message', function(e) {
        var data = e.data;
        var f = new Float32Array(data.b);
        for (var i = 0; i < f.length; i++) {
            data.sum += f[i]
        }
        data.sum /= f.length;
        //seems to be inversed
        postMessage(1.0 - (data.sum / data.numSamples * -1.0));

    }, false);
};