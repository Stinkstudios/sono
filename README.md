# Sono

A small library for managing sound in the browser.


### Current WIP API

var Sono = require('Sono');


#### main api


Sono.add(key, data, loop)

Sono.get(key)

Sono.mute()

Sono.unMute()

Sono.pauseAll()

Sono.resumeAll()

Sono.stopAll()

Sono.play(key)

Sono.pause(key)

Sono.stop(key)

Sono.initLoader()

Sono.load(key, url, loop, callback, callbackContext, asBuffer)

Sono.loadBuffer(key, url, loop, callback, callbackContext)

Sono.loadAudioTag(key, url, loop, callback, callbackContext)

Sono.createAudioContext()

Sono.getSupportedFile(fileNames)

Sono.getExtension(fileName)

Sono.getSupportedExtensions()

Sono.handleTouchlock()

Sono.handlePageVisibility()

Sono.log()

get Sono.isSupported

get Sono.hasWebAudio

get/set Sono.volume

get Sono.create

get Sono.loader

get Sono.utils


#### Sono.create (node factory module)

Sono.create.gain(value)

Sono.create.pan()

Sono.create.filter.lowpass(frequency)

Sono.create.filter.highpass(frequency)

Sono.create.filter.bandpass(frequency)

Sono.create.filter.lowshelf(frequency)

Sono.create.filter.highshelf(frequency)

Sono.create.filter.peaking(frequency)

Sono.create.filter.notch(frequency)

Sono.create.filter.allpass(frequency)

Sono.create.delay(input, time, gain)

Sono.create.convolver(impulseResponse)

Sono.create.reverb(seconds, decay, reverse)

Sono.create.createImpulseResponse(seconds, decay, reverse)

Sono.create.analyser(fftSize)

Sono.create.compressor()

Sono.create.distortion()

Sono.create.scriptProcessor(bufferSize, inputChannels, outputChannels, callback, callbackContext)

#### Sono.utils (helper utils module)

Sono.utils.fade(gainNode, value, duration)

Sono.utils.panX(panner, value)

Sono.utils.pan(panner, x, y, z)

Sono.utils.setSourcePosition(panner, positionVec)

Sono.utils.setSourceOrientation(panner, forwardVec) // forwardVec = THREE.Vector3

Sono.utils.setListenerPosition(positionVec)

Sono.utils.setListenerOrientation(forwardVec) // forwardVec = THREE.Vector3

Sono.utils.doppler(panner, x, y, z, deltaX, deltaY, deltaZ, deltaTime)

Sono.utils.filter(filterNode, value, quality, gain)

Sono.utils.getFrequency(value)

Sono.utils.createMicrophoneSource(stream, connectTo)

Sono.utils.distort(value)

#### Sono.loader (loader module)

Sono.loader
