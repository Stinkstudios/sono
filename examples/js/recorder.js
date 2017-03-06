(function() {


    var sono = window.sono;
    var ui = window.ui;

    sono.log();

    var player,
        sound,
        recorder,
        analyser,
        canvas = document.querySelector('[data-js="waveform"]'),
        context = canvas.getContext('2d');

    var onConnect = function(stream) {
        sound = sono.createSound(stream);
        recorder = sono.utils.recorder(false);
        analyser = sound.effect.analyser({fftSize: 1024});
        analyser.maxDecibels = -60;
        recorder.start(sound);
        update();
    };
    var mic = sono.utils.microphone(onConnect);

    if (!mic.isSupported) {
        document.querySelector('[data-js="warning"]')
            .classList.add('is-visible');
    }

    var toggle = function() {
        if (recorder && recorder.isRecording) {
            var recording = recorder.stop();
            console.log(recording);
            createPlayer(recording);
            mic.disconnect();
        } else {
            if (mic.stream) {
                //recorder.start(sound);
            } else {
                mic.connect();
            }
            if (player) {
                player.destroy();
                player.el.classList.remove('is-active');
            }
        }
    };

    var control = ui.createToggle({
        el: document.querySelector('[data-js="micToggle"]'),
        name: 'Record',
        value: false
    }, function() {
        toggle();
    });

    function createPlayer(buffer) {
        console.log('createPlayer');
        player = ui.createPlayer({
            el: document.querySelector('[data-js="playerTop"]'),
            sound: sono.createSound(buffer)
                .play()
        });
        player.el.classList.add('is-active');
    }

    function update() {
        window.requestAnimationFrame(update);

        if (player) {
            player();
        }

        control.setLabel(recorder.getDuration()
            .toFixed(1));

        var width = canvas.width,
            height = canvas.height,
            frequencyBinCount = analyser.frequencyBinCount,
            barWidth = Math.max(1, Math.round(width / frequencyBinCount)),
            magnitude,
            percent,
            hue;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);

        var waveData = analyser.getFrequencies();
        var freqData = analyser.getWaveform();

        for (var i = 0; i < frequencyBinCount; i++) {
            magnitude = freqData[i];
            percent = magnitude / 256;
            hue = i / frequencyBinCount * 360;
            context.fillStyle = 'hsl(' + hue + ', 100%, 30%)';
            context.fillRect(barWidth * i, height, barWidth, 0 - height * percent);

            magnitude = waveData[i];
            percent = magnitude / 512;
            hue = i / frequencyBinCount * 360;
            context.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
            context.fillRect(barWidth * i, height - height * percent - 1, 2, 2);
        }
    }

}());
