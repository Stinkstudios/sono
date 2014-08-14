## add

Create a Sound object

>`Sono.sound(data, id)` returns Sound

#### Examples

```javascript
var click = Sono.sound(clickSoundData);
var click = Sono.sound(clickSoundData, 'click'); // with id
var click = Sono.sound(['audio/click.ogg', 'audio/click.mp3']); // load

var osc = Sono.oscillator('sine');

click.play();
```


## load

Load a sound and add to Sono

>`Sono.load(url, callback, thisArg, asBuffer)` returns Sound

#### Examples

```javascript
// array
var click = Sono.load(['audio/click.ogg', 'audio/click.mp3']); // load first file compatible with browser

// hashmap
var click = Sono.load({foo: 'audio/click.ogg', bar: 'audio/click.mp3'}); // load first file compatible with browser

// specific file
var click = Sono.load('audio/click.ogg'); // load this file

// check support manually
if(Sono.canPlay.mp3) {
	var click = Sono.load('audio/click.mp3');
}

// add extension manually
var click = Sono.load('audio/click' + Sono.getSupportedExtensions[0]);

// load and play
var click = Sono.load(['audio/click.ogg', 'audio/click.mp3']).play(); // load and play immediately

// callbacks
var click = Sono.load(['audio/click.ogg', 'audio/click.mp3'], onLoadComplete, this);
click.loader.onProgress.add(onLoadProgress, this);
var onLoadProgress = function(progress) {
    //console.log('onLoadProgress', progress);
};
var onLoadComplete = function(sound) {
    //console.log('onLoadComplete', sound);
};


```
