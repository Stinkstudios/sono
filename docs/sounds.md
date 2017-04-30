# Sound

[View source code](../src/core/sound.js)

## Create

```javascript
const sound = sono.create('boom.mp3');
```

## Create and configure

```javascript
const sound = sono.create({
	id: 'boom',
	url: ['boom.ogg', 'boom.mp3'],
	loop: true,
	volume: 0.5,
	effects: [
		sono.echo()
	]
});
```

## Create an oscillator

```javascript
const squareWave = sono.create('square');
squareWave.frequency = 200;
```

## Create from HTMLMediaElement

```javascript
const video = document.querySelector('video');
const videoSound = sono.create(videoEl);
```

## Control and update

```javascript
const sound = sono.create('boom.mp3');
// playback
sound.play();
sound.pause();
sound.stop();
// play with 200ms delay
sound.play(0.2);
// set volume
sound.volume = 0.5;
// fade out volume to 0 over 2 seconds
sound.fade(0, 2);
// seek to 0.5 seconds
sound.seek(0.5);
// play sound at double speed
sound.playbackRate = 2;
// play sound at half speed
sound.playbackRate = 0.5;
// loop
sound.loop = true;
// play at 3s
sound.currentTime = 3;
```

## Get properties

```javascript
const sound = sono.create('boom.mp3');
console.log(sound.context);
console.log(sound.currentTime);
console.log(sound.duration);
console.log(sound.effects);
console.log(sound.ended);
console.log(sound.loop);
console.log(sound.paused);
console.log(sound.playing);
console.log(sound.progress);
console.log(sound.volume);
console.log(sound.playbackRate);
```

## Special properties

```javascript
// raw sound data (AudioBuffer, MediaElement, MediaStream, Oscillator type)
console.log(sound.data);
// frequency for Oscillator source type
console.log(sound.frequency);
// output node (GainNode)
console.log(sound.gain);
```

## Methods can be chained

```javascript
const sound = sono.create({
	id: 'boom',
	url: 'boom.ogg',
	volume: 0
})
.on('ended', sound => dispatch('ended', sound.id))
.play()
.fade(1, 2)
```

## Add and remove event listeners

```javascript
sono.create('boom.ogg')
	.on('pause', sound => dispatch('pause', sound))
	.on('play', sound => dispatch('play', sound))
	.once('ended', sound => {
		sound.off('pause');
		sound.off('play');
		dispatch('ended', sound);
	})
	.play();
```

## Methods

```javascript
sound.play(delay, offset)
sound.pause()
sound.stop()
sound.seek(time)
sound.fade(volume, duration)
sound.unload()
sound.reload()
sound.destroy()
sound.waveform(length)
```

## Properties

```javascript
sound.context
sound.currentTime
sound.data
sound.duration
sound.effects
sound.ended
sound.frequency
sound.gain
sound.loop
sound.paused
sound.playbackRate
sound.playing
sound.progress
sound.volume
```

## Events

```javascript
sound
	.on('loaded', (sound) => console.log('loaded'))
	.on('ready', (sound) => console.log('ready'))
	.on('play', (sound) => console.log('play'))
	.on('pause', (sound) => console.log('pause'))
	.on('stop', (sound) => console.log('stop'))
	.on('fade', (sound, volume) => console.log('fade'))
	.on('ended', (sound) => console.log('ended'))
	.on('unload', (sound) => console.log('unload'))
	.on('error', (sound, err) => console.error('error'))
	.on('destroy', (sound) => console.log('destroy'));
```
