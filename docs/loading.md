# Loading

## Load multiple with config and callbacks

```javascript
sono.load({
    url: [{
		id: 'foo',
		url: 'foo.mp3'
	}, {
		id: 'bar',
		url: ['bar.ogg', 'bar.mp3'],
		loop: true,
		volume: 0.5
	}],
	onComplete: sounds => console.log(sounds),
    onProgress: progress => console.log(progress)
});

const foo = sono.getSound('foo');
sono.play('bar');
```

## Load single with config options and callbacks

```javascript
const sound = sono.load({
    id: 'foo',
    src: ['foo.ogg', 'foo.mp3'],
    loop: true,
    volume: 0.2,
	onComplete: sound => console.log(sound),
    onProgress: progress => console.log(progress)
});
```

## Load single

```javascript
sono.load({
	url: 'foo.mp3',
	onComplete: sound => console.log(sound),
    onProgress: progress => console.log(progress)
});
```

## Load multiple

```javascript
sono.load({
	url: [
		{url: 'foo.mp3'},
		{url: 'bar.mp3'}
	],
	onComplete: sounds => console.log(sounds),
    onProgress: progress => console.log(progress)
});
```

## Check support

```javascript
sono.isSupported;
sono.hasWebAudio;

sono.canPlay.ogg;
sono.canPlay.mp3;
sono.canPlay.opus
sono.canPlay.wav;
sono.canPlay.m4a;
```
