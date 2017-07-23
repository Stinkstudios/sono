# Analyser

[View source code](../../src/effects/analyser.js)

[View example](http://stinkstudios.github.io/sono/examples/analyser.html)

Get real-time frequency and waveform information.

```javascript
import analyser from 'sono/effects/analyser';

const analyse = sono.effects.add(analyser({
    useFloats: false,
    fftSize: 2048,
    smoothing: 0.9,
    maxDecibels: 0,
    minDecibels: 0
}));

function draw() {
	window.requestAnimationFrame(draw);

	const frequencies = analyse.getFrequencies();

	for (let i = 0; i < frequencies.length; i++) {
		const magnitude = frequencies[i];
		const normalised = magnitude / 256;
		// do something
	}

	const waveform = analyse.getWaveform();

	for (let i = 0; i < waveform.length; i++) {
		const magnitude = waveform[i];
		const normalised = magnitude / 256;
		// do something
	}

    analyse.getAmplitude(amplitude => {
        // returns normalised amplitude
    });

    analyse.getPitch(pitch => {
        const note = pitch.note; // e.g. C#
        const hertz = pitch.hertz; // e.g. C#
        // do something
    });
}
draw();

```
