# Distortion

[View source code](../effects/distortion.js)


```javascript
import distortion from 'sono/effects/distortion';

const sound = sono.create('boom.mp3');
const distort = sound.effects.add(distortion({level: 0.5}));

// update the amount of distortion:
distort.level = 0.8; // [0,1]

// or
distort.update({
	level: 0.8
});
```
