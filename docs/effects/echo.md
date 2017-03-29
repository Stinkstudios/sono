# Echo

[View source code](../../src/effects/echo.js)

```javascript
import echo from 'sono/effects/echo';

const sound = sono.create('boom.mp3');
const echo = sound.effects.add(echo({
	delay: 0.8,
	feedback: 0.5
}));
sound.play();

// update individual properties:
echo.delay = 0.5;
echo.feedback = 0.8;

// update multiple properties:
echo.update({
	delay: 0.5,
	feedback: 0.8
});
```
