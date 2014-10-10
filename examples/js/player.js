function Player(sound, el) {

    el.innerHTML = '<div class="Player">' +
        '<div class="Player-waveform">' +
            '<canvas class="Player-waveform-inner js-waveform-back" width="400", height="80"></canvas>' +
            '<div class="Player-waveform-inner Player-waveform-clip js-waveform-progress">' +
                '<canvas class="js-waveform-front" width="400", height="80"></canvas>' +
            '</div>' +
        '</div>' +
        '<div class="Player-controls">' +
            '<button class="Player-button">PLAY</button>' +
            '<div class="Player-slider Player-slider--margin">' +
                '<span>0</span><input class="Player-slider-input js-volume" type="range" min="0" max="100" value="100" /><span>1</span>' +
            '</div>' +
            '<div class="Player-slider Player-slider--margin">' +
                '<span>L</span><input class="Player-slider-input js-pan" type="range" min="-100" max="100" value="0" /><span>R</span>' +
            '</div>' +
            '<div class="Player-info"></div>' +
        '</div>' +
    '</div>';

    var waveform = el.querySelector('.Player-waveform'),
        waveformBack = el.querySelector('.js-waveform-back'),
        waveformFront = el.querySelector('.js-waveform-front'),
        waveformProgress = el.querySelector('.js-waveform-progress'),
        button = el.querySelector('.Player-button'),
        volumeSlider = el.querySelector('.js-volume'),
        panSlider = el.querySelector('.js-pan'),
        info = el.querySelector('.Player-info');

    // update time and waveform
    function update() {
        if(sound.playing) {
            window.requestAnimationFrame(update);
        }

        info.innerHTML = Sono.utils.timeCode(sound.currentTime) + ' / ' +
                         Sono.utils.timeCode(sound.duration);

        waveformProgress.style.width = (sound.progress * 100).toFixed(1) + '%';
    }
    update();

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
    sound.onEnded(function() {
        button.innerHTML = 'PLAY';
    });

    // volume slider
    volumeSlider.addEventListener('change', function() {
        sound.volume = this.value / 100;
    });

    var panner = sound.effect.panner();

    // pan slider
    panSlider.addEventListener('change', function() {
        panner.setX(this.value / 100);
    });

    function displayWaveform() {
        var wave = Sono.utils.waveform(sound.data, waveformBack.width);
        var height = waveformBack.height;
        wave.getCanvas(height, '#333333', '#dddddd', waveformBack);
        //Sono.utils.waveformCanvas(waveformData, height, '#00ffff', '#444444', waveformFront);
        wave.getCanvas(height, '#dddddd', '#333333', waveformFront);

        // click waveform to seek
        waveform.addEventListener('click', function(event) {
            var rect = waveform.getBoundingClientRect();
            //console.log('click waveform', event.clientX - rect.left, rect.width);
            var percent = (event.clientX - rect.left) / rect.width;
            sound.seek(percent);

            button.innerHTML = 'PAUSE';
            update();
        });
    }

    if(sound.data) {
        displayWaveform();
    }
    else if(sound.loader) {
        sound.loader.onComplete.add(displayWaveform);
    }
    
}