# node

[src/lib/node-manager.js](../src/node-manager.js)

## add

Add an AudioNode

>`Sono.add(node)` returns AudioNode  
`Sound.add(node)` returns AudioNode  

#### Examples

```javascript

```


## remove

Remove an AudioNode

>`Sono.node.remove(node)` returns AudioNode  
`Sound.node.remove(node)` returns AudioNode

#### Examples

```javascript

```


## removeAll

Remove all AudioNodes

>`Sono.node.removeAll()`  
`Sound.node.removeAll()`

#### Examples

```javascript

```


## analyser

Create an AnalyserNode and add to chain

>`Sono.node.analyser(fftSize)`  
`Sound.node.analyser(fftSize)`

#### Examples

```javascript
var video = document.querySelector('video');
var sound = Sono.createSound(video);
var analyser = sound.node.analyser(2048);

function draw() {
    window.requestAnimationFrame(draw);

    var frequencyBinCount = analyserNode.frequencyBinCount;
    var freqByteData = new Uint8Array(frequencyBinCount);

    analyser.getByteFrequencyData(freqByteData);

    for (var i = 0; i < frequencyBinCount; i++) {
        var magnitude = freqByteData[i];
        var percent = magnitude / 256;
        // draw some visualisation
    }
}
draw();

```



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

Sono.node.reverb(seconds, decay, reverse)

Sono.node.scriptProcessor(bufferSize, inputChannels, outputChannels, callback, thisArg)

Sono.node.setSource(node)

Sono.node.setDestination(node)
