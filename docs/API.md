## Sono


### Create Sound

[Sono.createSound(data)](Sono.md#createsound) // returns Sound


### Destroy

[Sono.destroy(soundOrId)](Sono.md#destroy) // destroy sound instance or by id


### Retrieve Sound by id

[Sono.getById(id)](Sono.md#getbyid) // returns Sound or null


### Load

[Sono.load(url, complete, progress, thisArg, asMediaElement)](Sono.md#load) // returns Sound

[Sono.loadMultiple(config, complete, progress, thisArg, asMediaElement)](Sono.md#load)


### Controls

[Sono.mute()](Sono.md#controls) // mutes master volume

[Sono.unMute()](Sono.md#controls) // un-mutes master volume

[Sono.volume](Sono.md#controls) // get/set master volume

[Sono.pauseAll()](Sono.md#controls) // pause all currently playing

[Sono.resumeAll()](Sono.md#controls) // resume all currently paused

[Sono.stopAll()](Sono.md#controls) // stop all currently playing or paused

[Sono.play(id, delay, offset)](Sono.md#controls) // play sound by id

[Sono.pause(id)](Sono.md#controls) // pause sound by id

[Sono.stop(id)](Sono.md#controls) // stop sound by id


### Log

[Sono.log()](Sono.md#log) // log info to console


### Getters

[Sono.canPlay](Sono.md#canplay) // returns audio file support info

[Sono.context](Sono.md#context) // returns WebAudioContext instance

[Sono.hasWebAudio](Sono.md#haswebaudio) // returns boolean

[Sono.isSupported](Sono.md#issupported) // returns boolean

[Sono.masterGain](Sono.md#mastergain) // returns GainNode

[Sono.node](Sono.md#node) // returns node manager module

[Sono.sounds](Sono.md#sounds) // returns array

[Sono.utils](Sono.md#utils) // returns utils module



## Sono.node



Sono.node.setSource(node)

Sono.node.setDestination(node)

Sono.node.add(node)

Sono.node.remove(node)

Sono.node.removeAll()

Sono.node.analyser(fftSize)

Sono.node.compressor()

Sono.node.convolver(impulseResponse)

Sono.node.delay(input, time, gain)

Sono.node.distortion()

Sono.node.filer(type, frequency)

Sono.node.lowpass(frequency)

Sono.node.highpass(frequency)

Sono.node.bandpass(frequency)

Sono.node.lowshelf(frequency)

Sono.node.highshelf(frequency)

Sono.node.peaking(frequency)

Sono.node.notch(frequency)

Sono.node.allpass(frequency)

Sono.node.gain(value)

Sono.node.panner()

Sono.node.reverb(seconds, decay, reverse, node)

Sono.node.scriptProcessor(bufferSize, inputChannels, outputChannels, callback, thisArg)


## Sono.utils

Sono.utils.crossFade(fromSound, toSound, duration)

Sono.utils.distort(value)

Sono.utils.fadeFrom(sound, value, duration)

Sono.utils.fadeTo(sound, value, duration)

Sono.utils.filter(filterNode, value, quality, gain)

Sono.utils.getFrequency(value) // return a freq value by passing 0-1

Sono.utils.isAudioBuffer(data)

Sono.utils.isMediaElement(data)

Sono.utils.isMediaStream(data)

Sono.utils.isOscillatorType(data)

Sono.utils.isScriptConfig(data)

Sono.utils.isFile(data)

Sono.utils.microphone(connected, denied, error, thisArg)

Sono.utils.pan(panner)

Sono.utils.timeCode(seconds, delim)

Sono.utils.waveform(buffer, length)



pan.x(value)

pan.xyz(x, y, z)

pan.setSourcePosition(panner, positionVec)

pan.setSourceOrientation(forwardVec)

pan.setListenerPosition(positionVec)

pan.setListenerOrientation(forwardVec)

pan.doppler(x, y, z, deltaX, deltaY, deltaZ, deltaTime)
