# Sono

[src/sono.js](../src/sono.js)

## createSound

Create a Sound object

>`Sono.createSound(data)` returns Sound

#### Examples

```javascript
// load
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
var sound = Sono.createSound('audio/foo.ogg');

// existing MediaElement or ArrayBuffer
var el = document.querySelector('video');
var sound = Sono.createSound(el);

// oscillator
var sineWave = Sono.createSound('sine');

// microphone stream
navigator.getUserMedia({audio:true}, function(stream) {
	var mic = Sono.createSound(stream);
});

// script processor
var script = Sono.createSound({
	bufferSize: 1024,
	channels: 1,
	callback: function(event) {
		var output = event.outputBuffer.getChannelData(0);
	    var l = output.length;
	    for (var i = 0; i < l; i++) {
	        output[i] = Math.random();
	    }
	}
});
```

## destroy

Remove a sound from Sono

>`Sono.destroy(soundOrId)`

#### Examples

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
sound.id = 'bar';

// either will work
Sono.destroy(sound);
Sono.destroy('bar');
```


## getById

>`Sono.getById(id)`

#### Examples

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
sound.id = 'bar';

// somewhere else
var sound = Sono.getById('bar');
```


## load

Load a sound and add to Sono

>`Sono.load(url, complete, progress, thisArg, asMediaElement)` returns Sound  
`Sono.loadMultiple(config, complete, progress, thisArg, asMediaElement)`

#### Examples

```javascript
// array - load first file compatible with browser
var sound = Sono.load(['audio/foo.ogg', 'audio/foo.mp3']);

// multiple sounds
Sono.load([
	{ id: 'a', url: ['audio/foo.ogg', 'audio/foo.mp3'] },
	{ id: 'b', url: ['audio/bar.ogg', 'audio/bar.mp3'] }
], function(sounds) {
	console.log('complete:', sounds);
	var soundA = Sono.getById('a');
	var soundB = Sono.getById('b');
}, function(progress) {
	console.log('progress:', progress);
});

// specific file
var sound = Sono.load('audio/foo.ogg');

// hashmap - load first file compatible with browser
var sound = Sono.load({foo: 'audio/foo.ogg', bar: 'audio/foo.mp3'});

// check support manually
if(Sono.canPlay.mp3) {
	var sound = Sono.load('audio/foo.mp3');
}

// add extension manually
var sound = Sono.load('audio/foo' + Sono.getSupportedExtensions[0]);

// load and play immediately
var sound = Sono.load(['audio/foo.ogg', 'audio/foo.mp3']).play();

```

```javascript
Sono.loadMultiple([
	{ id: 'a', url: ['audio/foo.ogg', 'audio/foo.mp3'] },
	{ id: 'b', url: ['audio/bar.ogg', 'audio/bar.mp3'] }
], function(sounds) {
	console.log('complete:', sounds);
	var soundA = Sono.getById('a');
	var soundB = Sono.getById('b');
}, function(progress) {
	console.log('progress:', progress);
});
```

## controls

>`Sono.mute()`  
`Sono.unMute()`  
`Sono.volume`  
`Sono.pauseAll()`  
`Sono.resumeAll()`  
`Sono.stopAll()`  
`Sono.play(id, delay, offset)`  
`Sono.pause(id)`  
`Sono.stop(id)`

#### Examples

```javascript
// mute master volume
Sono.mute();
// un-mute master volume
Sono.unMute();
// set master volume to 50%
Sono.volume = 0.5;
// get master volume
console.log(Sono.volume); // 0.5
// pause all currently playing
Sono.pauseAll();
// resume all currently paused
Sono.resumeAll();
// stop all currently playing or paused
Sono.stopAll();
// play sound by id
Sono.play('foo', 1000);
// pause sound by id
Sono.pause('foo');
// stop sound by id
Sono.stop('foo');
```
