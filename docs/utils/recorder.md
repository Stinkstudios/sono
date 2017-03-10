# Recorder

[View source code](../utils/recorder.js)

## Record audio from the mix or microphone to a new audio buffer

```javascript
import recorder from 'sono/utils/recorder';

const record = recorder()

record.start(sound)

record.getDuration();

const buffer = record.stop();
```

## Record a  microphone stream

```javascript
import 'sono/utils/recorder';
import 'sono/utils/microphone';

let micSound;
let recorder;

function onMicConnected(stream) {
	micSound = sono.create(stream);
	// add recorder, setting passThrough to false
	// to avoid feedback loop between mic and speakers
	recorder = sono.utils.recorder(false);
	recorder.start(micSound);
};

stopButton.addEventListener('click', function() {
	const buffer = recorder.stop();
	const recordedSound = sono.create(buffer);
	recordedSound.play();
});

const mic = sono.utils.microphone(onMicConnected);
mic.connect();
```
