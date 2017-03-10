# Microphone

[View source code](../utils/microphone.js)

```javascript
import microphone from 'sono/utils';
import analyser from 'sono/effects';

const mic = microphone(stream => {
    // user allowed mic
	const sound = sono.create(stream);
    const analyse = sound.effects.add(analyser());
}, err => {
	// user denied mic
}, err => {
	// error
});
mic.connect();
```
