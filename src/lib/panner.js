'use strict';

function Panner(context) {
    var node = context.createPanner();
    // Default for stereo is HRTF
    node.panningModel = 'HRTF'; // 'equalpower'

    // Distance model and attributes
    node.distanceModel = 'linear'; // 'linear' 'inverse' 'exponential'
    node.refDistance = 1;
    node.maxDistance = 1000;
    node.rolloffFactor = 1;

    // Uses a 3D cartesian coordinate system
    // node.setPosition(0, 0, 0);
    // node.setOrientation(1, 0, 0);
    // node.setVelocity(0, 0, 0);

    // Directional sound cone - The cone angles are in degrees and run from 0 to 360
    // node.coneInnerAngle = 360;
    // node.coneOuterAngle = 360;
    // node.coneOuterGain = 0;

    // normalised vec
    // node.setOrientation(vec.x, vec.y, vec.z);

    // helpers for 3d audio

    var globalUp = { x: 0, y: 1, z: 0 };
    //,
      //  fw = { x: 0, y: 0, z: 0 },
      //  up = { x: 0, y: 0, z: 0 };

    var cross = function ( a, b ) {
        var ax = a.x, ay = a.y, az = a.z;
        var bx = b.x, by = b.y, bz = b.z;
        a.x = ay * bz - az * by;
        a.y = az * bx - ax * bz;
        a.z = ax * by - ay * bx;
    };

    var normalize = function (vec3) {
        if(vec3.x === 0 && vec3.y === 0 && vec3.z === 0) {
            return vec3;
        }
        var length = Math.sqrt( vec3.x * vec3.x + vec3.y * vec3.y + vec3.z * vec3.z );
        var invScalar = 1 / length;
        vec3.x *= invScalar;
        vec3.y *= invScalar;
        vec3.z *= invScalar;
        return vec3;
    };

    return {
        //
        node: node,
        // pan left to right with value from -1 to 1
        setX: function(value) {
            // x from -Math.PI/4 to Math.PI/4 (-45 to 45 deg)
            var x = parseFloat(value, 10) * Math.PI / 4;
            var z = x + Math.PI / 2;
            if (z > Math.PI / 2) {
                z = Math.PI - z;
            }
            x = Math.sin(x);
            z = Math.sin(z);
            node.setPosition(x, 0, z);
        },
        setXYZ: function(x, y, z) {
            x = x || 0;
            y = y || 0;
            z = z || 0;
            node.setPosition(x, y, z);
        },
        setSourcePosition: function(positionVec) {
            // set the position of the source (where the audio is coming from)
            node.setPosition(positionVec.x, positionVec.y, positionVec.z);
        },
        setSourceOrientation: function(forwardVec) { // forwardVec = THREE.Vector3
            // set the audio source orientation
            this.setOrientation(node, forwardVec);
        },
        setListenerPosition: function(positionVec) {
            // set the position of the listener (who is hearing the audio)
            context.listener.setPosition(positionVec.x, positionVec.y, positionVec.z);
        },
        setListenerOrientation: function(forwardVec) { // forwardVec = THREE.Vector3
            // set the audio context's listener position to match the camera position
            this.setOrientation(context.listener, forwardVec);
        },
        doppler: function(x, y, z, deltaX, deltaY, deltaZ, deltaTime) {
            // Tracking the velocity can be done by getting the object's previous position, subtracting
            // it from the current position and dividing the result by the time elapsed since last frame
            node.setPosition(x, y, z);
            node.setVelocity(deltaX/deltaTime, deltaY/deltaTime, deltaZ/deltaTime);
        },
        setOrientation: function(node, forwardVec) {
            // set the orientation of the source (where the audio is coming from)
            //var fw = forwardVec.clone().normalize(); =>
            var fw = { x: forwardVec.x, y: forwardVec.y, z: forwardVec.z };
            //fw.x = forwardVec.x;
            //fw.y = forwardVec.y
            //fw.z = forwardVec.z
            normalize(fw);
            
            // var up = forwardVec.clone().cross(globalUp).cross(forwardVec).normalize();
            // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
            var up = { x: forwardVec.x, y: forwardVec.y, z: forwardVec.z };
            cross(up, globalUp);
            cross(up, forwardVec);
            normalize(up);
            // set the audio context's listener position to match the camera position
            node.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
        }
    };
};

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Panner;
}

