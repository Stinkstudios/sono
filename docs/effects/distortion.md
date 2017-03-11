# Distortion

[View source code](../effects/distortion.js)


```javascript
import distortion from 'sono/effects/distortion';

const sound = sono.create('boom.mp3');
const distort = sound.effects.add(distortion({level: 1, samples: 44100, oversample: '2x'}));

// update the amount of distortion:
distort.level = 0.8;

// or
distort.update({
	level: 0.8
});
```
