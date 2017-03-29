# Reverb

[View source code](../../src/effects/reverb.js)

```javascript
import reverb from 'sono/effects/reverb';

const sound = sono.create('boom.mp3');
const room = sound.effects.add(reverb({time: 1, decay: 5}));
sound.play();

// update multiple properties:
room.update({
    time: 0.5,
    decay: 3,
    reverse: true
});
```
