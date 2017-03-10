# Compressor

[View source code](../effects/compressor.js)

Compression lowers the volume of the loudest parts of the signal and raises the volume of the softest parts.

```javascript
const compress = sono.effects.add(compressor());
// min decibels to start compressing at from -100 to 0
compress.threshold = -24;
// decibel value to start curve to compressed value from 0 to 40
compress.knee = 30;
// amount of change per decibel from 1 to 20
compress.ratio = 12;
// gain reduction currently applied from -20 to 0
compress.reduction = -10;
// seconds to reduce gain by 10db from 0 to 1 - how quickly signal adapted when volume increased
compress.attack = 0.0003;
// seconds to increase gain by 10db from 0 to 1 - how quickly signal adapted when volume redcuced
compress.release = 0.25;

// update multiple properties:
compress.update({
    threshold = -24,
    knee: 30,
    ratio: 12,
    reduction: -10,
    attack: 0.0003,
    release: 0.25
});
```
