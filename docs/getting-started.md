# Getting Started

## Install

```javascript
npm i -S sono
```

## Import

```javascript
import sono from 'sono';
```

## Create a sound object

Use the returned reference:
```javascript
const sound = sono.create('boom.mp3');
sound.play();
```

Or use an Id:
```javascript
sono.create({
    id: 'boom',
    url: 'boom.mp3'
});
sono.play('boom');
```

## Add some effects

Set an array of effects:
```javascript
import echo from 'sono/effects/echo';
import reverb from 'sono/effects/reverb';

const sound = sono.create('boom.mp3');
sound.effects = [echo(), reverb()];
sound.play();
```

Or use the `add` function to return the reference:
```javascript
import echo from 'sono/effects/echo';
import reverb from 'sono/effects/reverb';

const sound = sono.create('boom.mp3');
const echo = sound.effects.add(echo());
const reverb = sound.effects.add(reverb());
sound.play();
```

## Log info on browser support

```javascript
import sono from 'sono';
sono.log(); // sono 0.2.0 Supported:true WebAudioAPI:true TouchLocked:false Extensions:ogg,mp3,opus,wav,m4a
```

## Further documentation

[Sounds](./sound.md)

[Effects](./effects.md)

[Utils](./utils.md)
