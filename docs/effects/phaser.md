# Phaser

[View source code](../effects/phaser.js)

Creates a sweeping filter effect

```javascript
import phaser from 'sono/effects/phaser';

const sound = sono.create('boom.mp3');

const phaser = sound.effects.add(phaser({
    stages: 8,
	frequency: 0.5,
	gain: 300,
	feedback: 0.5
}));
```
