# Filter

[View source code](../../src/effects/filter.js)

## Let only low frequencies pass

```javascript
import filter from 'sono/effects/filter';

const sound = sono.create('boom.mp3');

const lowpass = sound.effects.add(filter({
    type: 'lowpass',
    frequency: 400,
    peak: 10 // peak at cutoff frequency (400hz)
}));
```

## Import lowpass from named export

```javascript
import {lowpass} from 'sono/effects/filter';

const sound = sono.create('boom.mp3');

sound.effects.add(lowpass({
    frequency: 600,
    peak: 20
}));
```

## Let only high frequencies pass

```javascript
import filter from 'sono/effects/filter';

const sound = sono.create('boom.mp3');

const lowpass = sound.effects.add(filter({
    type: 'highpass',
    frequency: 800,
    peak: 20 // peak at cutoff frequency (800hz)
}));
```

## Other types

```javascript
import 'sono/effects/filter';

const sound = sono.create('boom.mp3');

// 20db boost on frequencies below 800hz
const lowshelf = sound.effects.add(sono.lowshelf({
    frequency: 800,
    boost: 20
}));

// 20db boost on frequencies above 800hz
const highshelf = sound.effects.add(sono.highshelf({
    frequency: 800,
    boost: 20
}));

// 20db boost on frequencies around 800hz
const peaking = sound.effects.add(sono.peaking({
    frequency: 800,
    width: 200,
    boost: 20
}));

// let frequencies around 800hz pass
const bandpass = sound.effects.add(sono.bandpass({
    frequency: 800,
    width: 20
}));

// let frequencies outside 800hz pass
const notch = sound.effects.add(sono.notch({
    frequency: 800,
    width: 200
}));

// Shift phase
const allpass = sound.effects.add(sono.allpass({
    frequency: 800,
    sharpness: 200
}));
```

For a detailed explanation of what each filter type does, see <https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode>
