import AbstractEffect from './AbstractEffect';
import sono from '../core/sono';
import isSafeNumber from '../core/utils/isSafeNumber';
import isDefined from '../core/utils/isDefined';

const pannerDefaults = {
    panningModel: 'HRTF',
    distanceModel: 'linear',
    refDistance: 1,
    maxDistance: 1000,
    rolloffFactor: 1,
    coneInnerAngle: 360,
    coneOuterAngle: 0,
    coneOuterGain: 0
};

function safeNumber(x, y = 0) {
    if (isSafeNumber(x)) {
        return x;
    }
    return y;
}

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
            v.x = safeNumber(x.x);
            v.y = safeNumber(x.y);
            v.z = safeNumber(x.z);
        } else {
            v.x = safeNumber(x);
            v.y = safeNumber(y);
            v.z = safeNumber(z);
        }
        return v;
    },
    dispose: function(instance) {
        this.pool.push(instance);
    }
};

const globalUp = vecPool.get(0, 1, 0);
const angle45 = Math.PI / 4;
const angle90 = Math.PI / 2;

function setNodeOrientation(pannerNode, fw) {
    // set the orientation of the source (where the audio is coming from)
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

function setNodePosition(nodeOrListener, vec) {
    nodeOrListener.setPosition(vec.x, vec.y, vec.z);
    vecPool.dispose(vec);
}

class Panner extends AbstractEffect {
    constructor({panningModel, distanceModel, refDistance, maxDistance, rolloffFactor, coneInnerAngle, coneOuterAngle, coneOuterGain} = {}) {
        super(sono.context.createPanner());

        // Default for stereo is 'HRTF' can also be 'equalpower'
        this._node.panningModel = panningModel || pannerDefaults.panningModel;

        // Distance model and attributes
        // Can be 'linear' 'inverse' 'exponential'
        this._node.distanceModel = distanceModel || pannerDefaults.distanceModel;
        this._node.refDistance = isDefined(refDistance) ? refDistance : pannerDefaults.refDistance;
        this._node.maxDistance = isDefined(maxDistance) ? maxDistance : pannerDefaults.maxDistance;
        this._node.rolloffFactor = isDefined(rolloffFactor) ? rolloffFactor : pannerDefaults.rolloffFactor;
        this._node.coneInnerAngle = isDefined(coneInnerAngle) ? coneInnerAngle : pannerDefaults.coneInnerAngle;
        this._node.coneOuterAngle = isDefined(coneOuterAngle) ? coneOuterAngle : pannerDefaults.coneOuterAngle;
        this._node.coneOuterGain = isDefined(coneOuterGain) ? coneOuterGain : pannerDefaults.coneOuterGain;
        // set to defaults (needed in Firefox)
        this._node.setPosition(0, 0, 0);
        this._node.setOrientation(1, 0, 0);

        this.set(0);
    }

    update({x, y, z}) {
        const v = vecPool.get(x, y, z);

        if (isSafeNumber(x) && !isSafeNumber(y) && !isSafeNumber(z)) {
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
            v.y = 0;
            v.z = Math.sin(z);
        }
        setNodePosition(this._node, v);
    }

    // set the position the audio is coming from)
    setPosition(x, y, z) {
        setNodePosition(this._node, vecPool.get(x, y, z));
    }

    // set the direction the audio is coming from)
    setOrientation(x, y, z) {
        setNodeOrientation(this._node, vecPool.get(x, y, z));
    }

    // set the position of who or what is hearing the audio (could be camera or some character)
    setListenerPosition(x, y, z) {
        setNodePosition(sono.context.listener, vecPool.get(x, y, z));
    }

    // set the position of who or what is hearing the audio (could be camera or some character)
    setListenerOrientation(x, y, z) {
        setNodeOrientation(sono.context.listener, vecPool.get(x, y, z));
    }

    get defaults() {
        return pannerDefaults;
    }

    set defaults(value) {
        Object.assign(pannerDefaults, value);
    }

    set(x, y, z) {
        return this.update({x, y, z});
    }
}

const panner = sono.register('panner', opts => new Panner(opts));

Object.defineProperties(panner, {
    defaults: {
        get: () => pannerDefaults,
        set: (value) => Object.assign(pannerDefaults, value)
    },
    setListenerPosition: {
        value: (x, y, z) => setNodePosition(sono.context.listener, vecPool.get(x, y, z))
    },
    setListenerOrientation: {
        value: (x, y, z) => setNodeOrientation(sono.context.listener, vecPool.get(x, y, z))
    }
});

export default panner;
