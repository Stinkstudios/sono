# Panner

[View source code](../effects/panner.js)

## Pan left/right

```javascript
import panner from 'sono/effects/panner';

const sound = sono.create('boom.mp3');

const pan = sound.effects.add(panner());

// pan fully right:
pan.set(1);

// pan fully left:
pan.set(-1);
```

## 3d panning

Pass vectors of the 'listener' (i.e. the camera) and the origin of the sound to play the sound in 3d audio.

The listener is global and doesn't need to be updated for every panner object.

```javascript
import panner from 'sono/effects/panner';

const sound = sono.create('boom.mp3');

const pan = sound.effects.add(panner());

function update() {
    window.requestAnimationFrame(update);

    // update the 3d position and orientation (forward vector) of the sound
    pan.setPosition(x, y, z);
    pan.setOrientation(x, y, z);

    // update listener position and orientation to 3d camera Vectors
    pan.setListenerPosition(x, y, z);
    pan.setListenerOrientation(x, y, z);
}
```

## Pass xyz or 3d vector objects

```javascript
// accepts xyz or a 3d vector object
pan.setPosition(source.position);
pan.setOrientation(source.forward);

pan.setListenerPosition(camera.position);
pan.setListenerOrientation(camera.forward);
```

## Set global listener position and orientation using static methods

```javascript
import panner from 'sono/effects/panner';

function update() {
    window.requestAnimationFrame(update);

    panner.setListenerPosition(x, y, z);
    panner.setListenerOrientation(x, y, z);
}
```

## Configure how distance and angle affect the sound

```javascript
import panner from 'sono/effects/panner';

const sound = sono.create('boom.mp3');

const pan = sound.effects.add(panner({
    panningModel: 'HRTF',
    distanceModel: 'linear',
    refDistance: 1,
    maxDistance: 1000,
    rolloffFactor: 1,
    coneInnerAngle: 360,
    coneOuterAngle: 0,
    coneOuterGain: 0
}));
```

## Set defaults for all panner nodes

```javascript
import panner from 'sono/effects/panner';

panner.defaults = {
    panningModel: 'HRTF',
    distanceModel: 'linear',
    refDistance: 1,
    maxDistance: 1000,
    rolloffFactor: 1,
    coneInnerAngle: 360,
    coneOuterAngle: 0,
    coneOuterGain: 0
};
```
