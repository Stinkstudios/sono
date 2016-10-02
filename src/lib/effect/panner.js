import {number} from '../utils/validify.js';

export default function Panner(context) {
    const node = context.createPanner();

    // Default for stereo is 'HRTF' can also be 'equalpower'
    node.panningModel = Panner.defaults.panningModel;

    // Distance model and attributes
    // Can be 'linear' 'inverse' 'exponential'
    node.distanceModel = Panner.defaults.distanceModel;
    node.refDistance = Panner.defaults.refDistance;
    node.maxDistance = Panner.defaults.maxDistance;
    node.rolloffFactor = Panner.defaults.rolloffFactor;
    node.coneInnerAngle = Panner.defaults.coneInnerAngle;
    node.coneOuterAngle = Panner.defaults.coneOuterAngle;
    node.coneOuterGain = Panner.defaults.coneOuterGain;
    // set to defaults (needed in Firefox)
    node.setPosition(0, 0, 1);
    node.setOrientation(0, 0, 0);

    // simple vec3 object pool
    const vecPool = {
        pool: [],
        get: function(x, y, z) {
            const v = this.pool.length ? this.pool.pop() : {
                x: 0,
                y: 0,
                z: 0
            };
            // check if a vector has been passed in
            if (typeof x !== 'undefined' && isNaN(x) && 'x' in x && 'y' in x && 'z' in x) {
                v.x = number(x.x);
                v.y = number(x.y);
                v.z = number(x.z);
            } else {
                v.x = number(x);
                v.y = number(y);
                v.z = number(z);
            }
            return v;
        },
        dispose: function(instance) {
            this.pool.push(instance);
        }
    };

    const globalUp = vecPool.get(0, 1, 0),
        angle45 = Math.PI / 4,
        angle90 = Math.PI / 2;

    // cross product of 2 vectors
    function cross(a, b) {
        const ax = a.x,
            ay = a.y,
            az = a.z;
        const bx = b.x,
            by = b.y,
            bz = b.z;
        a.x = ay * bz - az * by;
        a.y = az * bx - ax * bz;
        a.z = ax * by - ay * bx;
    }

    // normalise to unit vector
    function normalize(vec3) {
        if (vec3.x === 0 && vec3.y === 0 && vec3.z === 0) {
            return vec3;
        }
        const length = Math.sqrt(vec3.x * vec3.x + vec3.y * vec3.y + vec3.z * vec3.z);
        const invScalar = 1 / length;
        vec3.x *= invScalar;
        vec3.y *= invScalar;
        vec3.z *= invScalar;
        return vec3;
    }

    // set the orientation of the source (where the audio is coming from)
    function setOrientation(pannerNode, fw) {
        // calculate up vec ( up = (forward cross (0, 1, 0)) cross forward )
        const up = vecPool.get(fw.x, fw.y, fw.z);
        cross(up, globalUp);
        cross(up, fw);
        normalize(up);
        normalize(fw);
        // set the audio context's listener position to match the camera position
        pannerNode.setOrientation(fw.x, fw.y, fw.z, up.x, up.y, up.z);
        // return the vecs to the pool
        vecPool.dispose(fw);
        vecPool.dispose(up);
    }

    function setPosition(nodeOrListener, vec) {
        nodeOrListener.setPosition(vec.x, vec.y, vec.z);
        vecPool.dispose(vec);
    }


    node.set = function(x, y, z) {
        const v = vecPool.get(x, y, z);

        if (arguments.length === 1 && v.x) {
            // pan left to right with value from -1 to 1
            x = v.x;

            if (x > 1) {
                x = 1;
            }
            if (x < -1) {
                x = -1;
            }

            // creates a nice curve with z
            x = x * angle45;
            z = x + angle90;

            if (z > angle90) {
                z = Math.PI - z;
            }

            v.x = Math.sin(x);
            v.z = Math.sin(z);
        }
        setPosition(node, v);
    };

    // set the position the audio is coming from)
    node.setSourcePosition = function(x, y, z) {
        setPosition(node, vecPool.get(x, y, z));
    };

    // set the direction the audio is coming from)
    node.setSourceOrientation = function(x, y, z) {
        setOrientation(node, vecPool.get(x, y, z));
    };

    // set the position of who or what is hearing the audio (could be camera or some character)
    node.setListenerPosition = function(x, y, z) {
        setPosition(context.listener, vecPool.get(x, y, z));
    };

    // set the position of who or what is hearing the audio (could be camera or some character)
    node.setListenerOrientation = function(x, y, z) {
        setOrientation(context.listener, vecPool.get(x, y, z));
    };

    node.getDefaults = function() {
        return Panner.defaults;
    };

    node.setDefaults = function(defaults) {
        Object.keys(defaults)
            .forEach(function(key) {
                Panner.defaults[key] = defaults[key];
            });
    };

    return node;
}

Panner.defaults = {
    panningModel: 'HRTF',
    distanceModel: 'linear',
    refDistance: 1,
    maxDistance: 1000,
    rolloffFactor: 1,
    coneInnerAngle: 360,
    coneOuterAngle: 0,
    coneOuterGain: 0
};
