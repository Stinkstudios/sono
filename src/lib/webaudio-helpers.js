'use strict';

 function WebAudioHelpers(context) {
    function parseNum(x) {
        return isNaN(x) ? 0 : parseFloat(x, 10);
    }

    return {
        fade: function(gainNode, value, duration) {
            gainNode.gain.linearRampToValueAtTime(value, context.currentTime + duration);
        },
        panX: function(panner, value) {
            // x from -Math.PI/4 to Math.PI/4 (-45 to 45 deg)
            var x = parseFloat(value, 10) * Math.PI / 4;
            var z = x + Math.PI / 2;
            if (z > Math.PI / 2) {
                z = Math.PI - z;
            }
            x = Math.sin(x);
            z = Math.sin(z);
            panner.setPosition(x, 0, z);
        },
        pan: function(panner, x, y, z) {
            x = parseNum(x);
            y = parseNum(y);
            z = parseNum(z);
            panner.setPosition(x, y, z);
        },
        setSourcePosition: function(panner, positionVec) {
            // set the position of the source (where the audio is coming from)
            panner.setPosition(positionVec.x, positionVec.y, positionVec.z);
        },
        setSourceOrientation: function(panner, forwardVec) { // forwardVec = THREE.Vector3
            // set the orientation of the source (where the audio is coming from)
            var fw = forwardVec.clone().normalize();
            // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
            var globalUp = { x: 0, y: 1, z: 0 };
            var up = forwardVec.clone().cross(globalUp).cross(forwardVec).normalize();
            // set the audio context's listener position to match the camera position
            panner.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
        },
        setListenerPosition: function(positionVec) {
            // set the position of the listener (who is hearing the audio)
            context.listener.setPosition(positionVec.x, positionVec.y, positionVec.z);
        },
        setListenerOrientation: function(forwardVec) { // forwardVec = THREE.Vector3
            // set the orientation of the listener (who is hearing the audio)
            var fw = forwardVec.clone().normalize();
            // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
            var globalUp = { x: 0, y: 1, z: 0 };
            var up = forwardVec.clone().cross(globalUp).cross(forwardVec).normalize();
            // set the audio context's listener position to match the camera position
            context.listener.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
        },
        doppler: function(panner, x, y, z, deltaX, deltaY, deltaZ, deltaTime) {
            // Tracking the velocity can be done by getting the object's previous position, subtracting
            // it from the current position and dividing the result by the time elapsed since last frame
            panner.setPosition(x, y, z);
            panner.setVelocity(deltaX/deltaTime, deltaY/deltaTime, deltaZ/deltaTime);
        },
        filter: function(filterNode, value, quality, gain) {
            // set filter frequency based on value from 0 to 1
            value = parseFloat(value, 10);
            quality = parseFloat(quality, 10);
            gain = parseFloat(gain, 10);
            // Get back to the frequency value between min and max.
            filterNode.frequency.value = this.getFrequency(value);

            //filterNode.Q.value = quality;
            //filterNode.gain.value = gain;
        },
        getFrequency: function(value) {
            // get frequency by passing number from 0 to 1
            // Clamp the frequency between the minimum value (40 Hz) and half of the
            // sampling rate.
            var minValue = 40;
            var maxValue = context.sampleRate / 2;
            // Logarithm (base 2) to compute how many octaves fall in the range.
            var numberOfOctaves = Math.log(maxValue / minValue) / Math.LN2;
            // Compute a multiplier from 0 to 1 based on an exponential scale.
            var multiplier = Math.pow(2, numberOfOctaves * (value - 1.0));
            // Get back to the frequency value between min and max.
            return maxValue * multiplier;
        },
        createMicrophoneSource: function(stream, connectTo) {
            var mediaStreamSource = context.createMediaStreamSource( stream );
            if(connectTo) {
                mediaStreamSource.connect(connectTo);
            }
            // HACK: stops moz garbage collection killing the stream
            // see https://support.mozilla.org/en-US/questions/984179
            if(navigator.mozGetUserMedia) {
                window.horrible_hack_for_mozilla = mediaStreamSource;
            }
            return mediaStreamSource;
        },
        distort: function(value) {
            // create waveShaper distortion curve from 0 to 1
            var k = value * 100,
                n = 22050,
                curve = new Float32Array(n),
                deg = Math.PI / 180;

            for (var i = 0; i < n; i++) {
                var x = i * 2 / n - 1;
                curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
            }
            return curve;
        }
    };
}

if (typeof module === 'object' && module.exports) {
    module.exports = WebAudioHelpers;
}
