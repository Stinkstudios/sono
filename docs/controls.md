# Controls

[View source code](../src/core/sono.js)

## Play in background

By default sono will pause and resume all audio when the page is hidden. This feature can be turned off by setting the `playInBackground` property:

```javascript
sono.playInBackground = true;
```

## Master volume

```javascript
// mute master volume
sono.mute();

// un-mute master volume
sono.unMute();

// set master volume to 50%
sono.volume = 0.5;

// get master volume
console.log(sono.volume); // 0.5

// fade out master volume to 0 over 2 seconds
sono.fade(0, 2);
```

## Update individual sounds

```javascript
// return instance of a sound by id
sono.get('foo');

// play sound by id after a 1 second delay
sono.play('foo', 1);

// pause sound by id
sono.pause('foo');

// stop sound by id
sono.stop('foo');

// destroy a sound (by instance or id)
sono.destroy(sound);
sono.destroy('bar');
```

## Update all sounds

```javascript
// pause all currently playing
sono.pauseAll();

// resume all currently paused
sono.resumeAll();

// stop all currently playing or paused
sono.stopAll();

// destroy all sounds
sono.destroyAll()
```

## Master effects

```javascript
import analyser from 'sono/effects/analyser';

const analyse = sono.effects.add(analyser());
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
