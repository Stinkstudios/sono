# Script

[View source code](../effects/script.js)

## White noise

```javascript
import script from 'sono/effects/script';

sound.effects.add(script({
	bufferSize: 1024,
	channels: 1,
	callback: function(event) {
		var output = event.outputBuffer.getChannelData(0);
		for (var i = 0; i < output.length; i++) {
			output[i] = Math.random() * 2 - 1;
		}
	}
}));
```
