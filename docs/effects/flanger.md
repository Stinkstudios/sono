# Flanger

[View source code](../effects/flanger.js)

Creates a sweeping filter effect

```javascript
import flanger from 'sono/effects/flanger';

const sound = sono.create('boom.mp3');

const flange = sound.effects.add(flanger({
	stereo: true,
	delay: 0.005,
	feedback: 0.5,
	frequency: 0.025,
	gain: 0.002
}));
```

## Stereo flanger

```javascript
import {stereoFlanger} from 'sono/effects/flanger';

const sound = sono.create('boom.mp3');

const flange = sound.effects.add(stereoFlanger({
	delay: 0.005,
	feedback: 0.5,
	frequency: 0.025,
	gain: 0.002
}));
```

## Mono flanger

```javascript
import {monoFlanger} from 'sono/effects/flanger';

const sound = sono.create('boom.mp3');

const flange = sound.effects.add(monoFlanger({
	delay: 0.005,
	feedback: 0.5,
	frequency: 0.025,
	gain: 0.002
}));
```
