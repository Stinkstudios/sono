# Convolver

[View source code](../../src/effects/convolver.js)

Creates a reverb effect by applying the characteristics of one sound to another.


Check out [www.openairlib.net](http://www.openairlib.net/) for a large collection of Impulse Response files to experiment with.

## Pass URL of an impulse response

```javascript
import sono from 'sono';
import convolver from 'sono/effects/convolver';

const sound = sono.create({
    url: 'boom.mp3',
    effects: [convolver({
        impulse: 'large_hall.mp3'
    })]
});
sound.play();
```

## Pass a sono sound, AudioBuffer or ArrayBuffer

```javascript
import sono from 'sono';
import convolver from 'sono/effects/convolver';

const sound = sono.create('boom.mp3');
const impulse = sono.create('large_hall.mp3');
const reverb = sound.effects.add(convolver({impulse}));
```
