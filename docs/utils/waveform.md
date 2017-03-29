# Waveform

[View source code](../../src/utils/waveform.js)

```javascript
import sono from 'sono';
import 'sono/utils/waveform';

const sound = sono.create('boom.mp3');
sound.on('ready', () => {
    // request sound waveform
    const waveform = sound.waveform(640);

    // draw waveform
    for (let i = 0; i < waveform.length; i++) {
        const value = waveform[i];
    }    
});
```
