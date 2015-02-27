/*jshint unused: false*/
/*global sono:false */

'use strict';

function Player(sound, el) {

    var tpl = '<div class="Player">' +
        '<div class="Player-waveform" data-js="waveform">' +
            '<canvas class="Player-waveform-inner" data-js="waveform-back" width="400", height="80"></canvas>' +
            '<div class="Player-waveform-inner Player-waveform-clip" data-js="waveform-progress">' +
                '<canvas data-js="waveform-front" width="400", height="80"></canvas>' +
            '</div>' +
        '</div>' +
        '<div class="Player-controls">' +
            '<button class="Player-button" data-js="button">PLAY</button>' +
            '<div class="Player-slider Player-slider--margin">' +
                '<span>0</span><input class="Player-slider-input" data-js="volume" type="range" min="0" max="100" value="100" /><span>1</span>' +
            '</div>' +
            '<div class="Player-slider Player-slider--margin">' +
                '<span>L</span><input class="Player-slider-input" data-js="pan" type="range" min="-100" max="100" value="0" /><span>R</span>' +
            '</div>' +
            '<div class="Player-info" data-js="info"></div>' +
        '</div>' +
    '</div>';

    el.insertAdjacentHTML('beforeend', tpl);

    var waveform = el.querySelector('[data-js="waveform"]'),
        waveformBack = el.querySelector('[data-js="waveform-back"]'),
        waveformFront = el.querySelector('[data-js="waveform-front"]'),
        waveformProgress = el.querySelector('[data-js="waveform-progress"]'),
        button = el.querySelector('[data-js="button"]'),
        volumeSlider = el.querySelector('[data-js="volume"]'),
        panSlider = el.querySelector('[data-js="pan"]'),
        info = el.querySelector('[data-js="info"]');

    // play/pause button
    button.addEventListener('click', function() {
        if(sound.playing) {
            sound.pause();
            button.innerHTML = 'PLAY';
        }
        else {
            sound.play();
            button.innerHTML = 'PAUSE';
            update();
        }
    });

    // reset button when sound ended
    sound.on('ended', function() {
        button.innerHTML = 'PLAY';
    });

    // volume slider
    volumeSlider.addEventListener('change', function() {
        sound.volume = this.value / 100;
    });

    // pan slider
    var panner = sound.effect.panner();
    panSlider.addEventListener('change', function() {
        panner.setX(this.value / 100);
    });

    // update time and waveform
    function update() {
        if(sound.playing) {
            window.requestAnimationFrame(update);
        }

        info.innerHTML = sono.utils.timeCode(sound.currentTime) + ' / ' +
                         sono.utils.timeCode(sound.duration);

        waveformProgress.style.width = (sound.progress * 100).toFixed(1) + '%';
    }
    update();

    // display waveform
    function displayWaveform() {
        sono.utils.drawWaveform({
            canvas: waveformBack,
            // sound: sound,
            waveform: sound.waveform(waveformBack.width),
            color: '#333333',
            bgColor: '#dddddd'
        });

        sono.utils.drawWaveform({
            canvas: waveformFront,
            // sound: sound,
            waveform: sound.waveform(waveformFront.width),
            color: '#dddddd',
            bgColor: '#333333'
        });

        // var arr = wave.compute(sound.data, 360);
        // console.log(Array.prototype.join.call(arr));

        // click waveform to seek
        waveform.addEventListener('click', function(event) {
            var rect = waveform.getBoundingClientRect();
            var percent = (event.clientX - rect.left) / rect.width;
            sound.seek(percent);

            button.innerHTML = 'PAUSE';
            update();
        });
    }

    // wait for sound to be loaded to get waveform data
    if(sound.data) {
        displayWaveform();
    }
    else {
        // sound.loader.onComplete.add(displayWaveform);
        sound.on('loaded', displayWaveform);
    }

}
