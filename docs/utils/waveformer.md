# Waveformer

[View source code](../../src/utils/waveformer.js)

## Get a sound's waveform and draw it to a canvas element:

```javascript
const wave = sono.utils.waveformer({
    sound: sound,
    width: 200,
    height: 100,
    color: '#333333',
    bgColor: '#DDDDDD'
});
document.body.appendChild(wave.canvas);
```

## Supply your own canvas el

```javascript
const canvasEl = document.querySelector('canvas');
const wave = sono.utils.waveformer({
    waveform: sound.waveform(canvasEl.width),
    canvas: canvasEl,
    color: 'green'
});
```

## Color can be a function

```javascript
const waveformer = sono.utils.waveformer({
    waveform: sound.waveform(canvasEl.width),
    canvas: canvasEl,
	color: (position, length) => {
		return position / length < sound.progress ? 'red' : 'yellow';
	}
});
```

## Shape can be circular

```javascript
const waveformer = sono.utils.waveformer({
	shape: 'circular',
    sound: sound,
    canvas: canvasEl,
	color: 'black'
});
```

## Draw the output of an AnalyserNode to a canvas

```javascript
const sound = sono.create('foo.ogg');
const analyser = sound.effects.add(sono.analyser({
	fftSize: 512,
	smoothing: 0.7
}));

const waveformer = sono.utils.waveformer({
    waveform: analyser.getFrequencies(),
    canvas: document.querySelector('canvas'),
	color: (position, length) => {
		const hue = (position / length) * 360;
		return `hsl(${hue}, 100%, 40%)`;
	},
    // normalise the value from the analyser
	transform: value => value / 256
});

// update the waveform
function update() {
	window.requestAnimationFrame(update);
	// request frequencies from the analyser
	analyser.getFrequencies();
	// update the waveformer display
	waveformer();
}
update();
```
