# Effects

[View source code](../src/core/effects.js)

## Add effects

Use the `add` function to return the reference:
```javascript
import {echo, reverb} from 'sono/effects';

const sound = sono.create('boom.mp3');
const echo = sound.effects.add(echo({feedback: 0.8}));
const reverb = sound.effects.add(reverb({time: 1, decay: 5}));
sound.play();
```

Set an array of effects:
```javascript
import flanger from 'sono/effects/flanger';

const sound = sono.create('boom.mp3');
sound.effects = [flanger()];
sound.play();
```

Set within sound config:
```javascript
import {distortion, filter} from 'sono/effects';

const sound = sono.create({
	url: 'boom.mp3',
	effects: [
		distortion({level: 0.2}),
		filter({type: 'lowpass', frequency: 400}),
	]
});
sound.play();
```

## Once imported effects are registered

Import one by one:

```javascript
import 'sono/effects/analyser';

const sound = sono.create('boom.mp3');
sound.effects.add(sono.analyser());
sound.play();
```

Import everything:

```javascript
import 'sono/effects';

const sound = sono.create('boom.mp3');
sound.effects = [sono.phaser(), sono.reverb()];
sound.play();
```


## Update effects

Access by reference:
```javascript
import {echo, reverb} from 'sono/effects';

const sound = sono.create('boom.mp3');
const distortion = sound.effects.add(distortion({level: 0.8}));
const echo = sound.effects.add(echo());
sound.play();

distortion.level = 0.3;
echo.delay = 0.8;
```

Access by index:
```javascript
import {distortion, echo} from 'sono/effects';

const sound = sono.create('boom.mp3');
sound.effects = [distortion(), echo()];
sound.play();

sound.effects[0].level = 0.3;
sound.effects[1].delay = 0.8;
```

## Add effects to groups

Add to sono output:
```javascript
import analyser from 'sono/effects/analyser';

const analyse = sono.effects.add(analyser({fftSize: 1024}));

function update() {
	window.requestAnimationFrame(update);

	const frequencies = analyse.getFrequencies();
	// do something cool
}
update();
```

Add to a sound group:

```javascript
import distortion from 'sono/effects/distortion';

const effectsBus = sono.group([
	sono.create({id: 'boom', url: 'boom.mp3'}),
	sono.create({id: 'bang', url: 'bang.mp3'})
]);

effectsBus.effects.add(distortion());

sono.play('boom');
sono.play('bang');
```


## Add vanilla AudioNodes:

```javascript
import sono from 'sono';

const sound = sono.create('boom.mp3');

const filter = sono.context.createBiquadFilter();
filter.type = 'lowpass';
filter.frequency.value = 1100;

const gain = sono.context.createGain();
gain.gain.value = 1000;
gain.connect(filter.frequency);

const lfo = sono.context.createOscillator();
lfo.type = 'sine';
lfo.frequency.value = 8;
lfo.connect(gain);
lfo.start(0);

sound.effects.add(filter);
```

## Remove/Toggle

```javascript
import distortion from 'sono/effects/distortion';

const sound = sono.create('boom.mp3');
const distort = distortion({level: 0.8});

sound.effects.add(distort);
sound.effects.remove(distort);
sound.effects.toggle(distort, true);
sound.effects.toggle(distort, false);
```

## Docs for individual effects

[analyser](./effects/analyser.md)

[compressor](./effects/compressor.md)

[convolver](./effects/convolver.md)

[distortion](./effects/distortion.md)

[echo](./effects/echo.md)

[filter](./effects/filter.md)

[flanger](./effects/flanger.md)

[panner](./effects/panner.md)

[phaser](./effects/phaser.md)

[reverb](./effects/reverb.md)
