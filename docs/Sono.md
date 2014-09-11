# Sono

[src/sono.js](../src/sono.js)

## createSound

Create a Sound object

>`Sono.createSound(data)` returns Sound

#### Examples

Create and load:

```javascript
var sound = Sono.createSound(['audio/foo.ogg', 'audio/foo.mp3']);
var sound = Sono.createSound('audio/foo.ogg');
```

From existing HTMLMediaElement:

```javascript
var el = document.querySelector('video');
var sound = Sono.createSound(el);
```

Create an oscillator:

```javascript
var sineWave = Sono.createSound('sine');
```

User microphone stream:

```javascript
navigator.getUserMedia({audio:true}, function(stream) {
	var mic = Sono.createSound(stream);
});
// or
var mic = Sono.utils.microphone(function(stream) {
	var mic = Sono.createSound(stream);
});
mic.connect();
```

Script processor:

```javascript
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
`Sono.load(config, complete, progress, thisArg, asMediaElement)`

#### Examples

Array - load first file compatible with browser

```javascript
var sound = Sono.load(['audio/foo.ogg', 'audio/foo.mp3']);
```

Multiple sounds

```javascript
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
```

Specific file:

```javascript
var sound = Sono.load('audio/foo.ogg');
```

Hashmap - load first file compatible with browser:

```javascript
var sound = Sono.load({foo: 'audio/foo.ogg', bar: 'audio/foo.mp3'});

```

Check file support manually:


```javascript
var extension = Sono.canPlay.ogg ? 'ogg' : 'mp3';
var sound = Sono.load('audio/foo.' + extension);

if(Sono.canPlay.mp3) {
	var sound = Sono.load('audio/foo.mp3');
}

```

Load and play immediately:

```javascript
var sound = Sono.load(['audio/foo.ogg', 'audio/foo.mp3']).play();

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
// play sound by id after a 1 second delay
Sono.play('foo', 1);
// pause sound by id
Sono.pause('foo');
// stop sound by id
Sono.stop('foo');
```

## log

>`Sono.log()`

#### Examples

Log version number and browser audio support info to the console:

```javascript
Sono.log(); // Sono 0.0.0 Supported:true WebAudioAPI:true TouchLocked:false Extensions:ogg,mp3,opus,wav,m4a
```

## canPlay

#### Examples

```javascript
Sono.canPlay.ogg; // boolean
Sono.canPlay.mp3; // boolean
Sono.canPlay.opus; // boolean
Sono.canPlay.wav; // boolean
Sono.canPlay.m4a; // boolean
```

## context

#### Examples

```javascript
Sono.context; // WebAudioContext
```

## hasWebAudio

#### Examples

```javascript
Sono.hasWebAudio; // boolean
```

## isSupported

#### Examples

```javascript
Sono.isSupported; // boolean
```

## masterGain

#### Examples

```javascript
Sono.masterGain; // GainNode
```

## node

#### Examples

```javascript
Sono.node.analyser();
```

## sounds

#### Examples

```javascript
Sono.sounds; // array
```

## utils

#### Examples

Crossfade two sounds

```javascript
Sono.utils.crossFade(soundA, SoundB, 1);
```

Get user microphone

```javascript
var mic = Sono.utils.microphone(function(stream) {
    // user allowed mic - got stream
	var micSound = Sono.createSound(stream);
}, function() {
	// user denied mic
}, function(e) {
	// error
});
mic.connect();
```

Convert currentTime seconds into time code string

```javascript
var timeCode = Sono.utils.timeCode(217.8); // '03:37'
```

Get a sound's waveform and draw it to a canvas element

```javascript
var canvasEl = document.querySelector('canvas');
var wave = Sono.utils.waveform(sound._data, canvasEl.width);
var canvas = wave.getCanvas(canvasEl.height, '#333333', '#DDDDDD', canvasEl);

```
