/* eslint no-var: 0 */
/* eslint strict: 0 */

(function() {
    'use strict';

    var sono = window.sono;
    var ui = window.ui;

    sono.log();

    var info = document.querySelector('[data-js="info"]');
    info.innerHTML = '<li>Audio support: ' + sono.isSupported + '</li>' +
        '<li>Web Audio support: ' + sono.hasWebAudio + '</li>' +
        '<li>Touch locked (mobile): ' + sono.isTouchLocked + '</li>' +
        '<li>Supported extensions: ' + sono.extensions.join(', ') + '</li>';

    var local = /^(?:https?:\/\/)?(?:localhost|192\.168)/.test(window.location.href);
    var baseURL = local ? 'examples/audio/' : 'https://ianmcgregor.co/prototypes/audio/';

    var sound,
        panner,
        analyser,
        distortion,
        echo,
        flanger,
        highpass,
        lowshelf,
        reverb,
        waveformsExample,
        player,
        playerTop;

    sound = sono.create({
        src: [
            baseURL + 'dnb-loop.ogg',
            baseURL + 'dnb-loop.mp3'
        ],
        loop: true
    });

    panner = sono.effects.add(sono.panner());

    distortion = sono.effects.add(sono.distortion({level: 0}));

    echo = sono.effects.add(sono.echo({
        delay: 0,
        feedback: 0.2
    }));

    flanger = sono.effects.add(sono.flanger({
        stereo: true
    }));
    sono.effects.remove(flanger);

    highpass = sono.effects.add(sono.highpass({frequency: 20}));

    lowshelf = sono.effects.add(sono.lowshelf({frequency: 80, gain: 0}));

    reverb = sono.effects.add(sono.reverb({
        time: 0.1,
        decay: 2
    }));

    analyser = sono.effects.add(sono.analyser({
        fftSize: 1024,
        smoothing: 0.7,
        float: true
    }));

    waveformsExample = createWaveformsExample();

    /*
     * players
     */

    playerTop = ui.createPlayer({
        el: document.querySelector('[data-js="playerTop"]'),
        sound: sound,
        analyser: analyser
    });

    player = ui.createPlayer({
        el: document.querySelector('[data-js="player"]'),
        sound: sound,
        analyser: analyser
    });

    /*
     * show minimized player
     */

    window.addEventListener('scroll', function() {
        var scrollTop = document.documentElement.scrollTop || document.body.scrollTop || window.pageYOffset || 0;
        var threshold = Math.max(400, Math.min(600, window.innerWidth));
        var isScrolledDown = scrollTop > threshold;
        playerTop.el.classList.toggle('is-active', isScrolledDown);
        player.el.classList.toggle('is-active', !isScrolledDown);
    });

    /*
     * controls
     */

    ui.createControl({
        el: document.querySelector('[data-js="master-volume"]'),
        name: 'Master Volume',
        min: 0,
        max: 1,
        value: 1
    }, function(value) {
        sono.volume = value;
    });

    ui.createControl({
        el: document.querySelector('[data-js="volume"]'),
        name: 'Volume',
        min: 0,
        max: 1,
        value: 1
    }, function(value) {
        sound.volume = value;
    });

    ui.createControl({
        el: document.querySelector('[data-js="pan"]'),
        name: 'Pan',
        min: -1,
        max: 1,
        value: 0
    }, function(value) {
        panner.set(value);
    });

    ui.createControl({
        el: document.querySelector('[data-js="rate"]'),
        name: 'Rate',
        min: 0,
        max: 4,
        value: 1
    }, function(value) {
        sound.playbackRate = value;
    });

    ui.createToggle({
        el: document.querySelector('[data-js="loop"]'),
        name: 'Loop',
        value: sound.loop
    }, function(value) {
        console.log('toggle loop:', value);
        sound.loop = value;
    });

    ui.createToggle({
        el: document.querySelector('[data-js="reverse"]'),
        name: 'Reverse',
        value: false
    }, function() {
        sono.utils.reverseBuffer(sound.data);
    });

    /*
     * echo
     */

    ui.createControl({
        el: document.querySelector('[data-js="echoDelay"]'),
        name: 'Delay',
        min: 0,
        max: 10,
        value: 0
    }, function(value) {
        echo.delay = value;
    });

    ui.createControl({
        el: document.querySelector('[data-js="echoFeedback"]'),
        name: 'Feedback',
        min: 0.1,
        max: 10,
        value: 0.1
    }, function(value) {
        echo.feedback = value;
    });

    /*
     * distortion
     */

    ui.createToggle({
        el: document.querySelector('[data-js="distortionToggle"]'),
        name: 'Active',
        value: true
    }, function(value) {
        sono.effects.toggle(distortion, value);
    });

    ui.createControl({
        el: document.querySelector('[data-js="distortion"]'),
        name: 'Level',
        min: 0,
        max: 2,
        value: 0
    }, function(value) {
        distortion.level = value;
    });

    /*
     * waveforms
     */

    function createWaveformsExample() {

        var analyse = sono.effects.add(sono.analyser({
            fftSize: 256,
            smoothing: 0.7
        }));

        var waveformers = [],
            el = document.querySelector('[data-js="waveforms"]'),
            canvas = el.querySelector('canvas'),
            context = canvas.getContext('2d'),
            examples = [{
                x: 0,
                y: 0,
                width: 250,
                height: 250,
                shape: 'circular',
                style: 'fill',
                lineWidth: 1.5,
                waveform: analyse.getFrequencies(false),
                color: function(position, length) {
                    var hue = (position / length) * 360;
                    return 'hsl(' + hue + ', 100%, 40%)';
                },
                transform: function(value) {
                    return 0.4 + value / 256 * 0.4;
                }
            }, {
                x: 250,
                y: 0,
                width: 250,
                height: 250,
                style: 'line',
                lineWidth: 1,
                waveform: analyse.getWaveform(false),
                color: function(position, length) {
                    var hue = (position / length) * 360;
                    return 'hsl(' + hue + ', 100%, 40%)';
                },
                transform: function(value) {
                    return value / 256;
                }
            }, {
                x: 0,
                y: 250,
                width: 250,
                height: 250,
                shape: 'circular',
                style: 'line',
                lineWidth: 1.5,
                sound: sound,
                color: 'black'
            }, {
                x: 250,
                y: 350,
                width: 250,
                height: 100,
                style: 'line',
                lineWidth: 4,
                sound: sound,
                color: function(position, length) {
                    var hue = (position / length) * 360;
                    return 'hsl(' + hue + ', 100%, 40%)';
                },
                transform: function(value) {
                    return value;
                }
            }];

        examples.forEach(function(example) {
            example.context = context;
            waveformers.push(sono.utils.waveformer(example));
        });

        return function() {
            analyse.getFrequencies();
            analyse.getWaveform();
            waveformers.forEach(function(waveformer) {
                waveformer();
            });
        };
    }

    /*
     * reverb
     */

    ui.createToggle({
        el: document.querySelector('[data-js="reverbToggle"]'),
        name: 'Active',
        value: true
    }, function(value) {
        sono.effects.toggle(reverb, value);
    });

    ui.createControl({
        el: document.querySelector('[data-js="reverbTime"]'),
        name: 'Time',
        min: 0,
        max: 5,
        value: reverb.time
    }, function(value) {
        reverb.time = value;
    });

    ui.createControl({
        el: document.querySelector('[data-js="reverbDecay"]'),
        name: 'Decay',
        min: 0,
        max: 10,
        value: reverb.decay
    }, function(value) {
        reverb.decay = value;
    });

    ui.createToggle({
        el: document.querySelector('[data-js="reverbReverse"]'),
        name: 'reverse',
        value: false
    }, function(value) {
        reverb.reverse = value;
    });

    /*
     * flanger
     */

    ui.createToggle({
        el: document.querySelector('[data-js="flangerToggle"]'),
        name: 'Active',
        value: false
    }, function(value) {
        sono.effects.toggle(flanger, value);
    });

    ui.createControl({
        el: document.querySelector('[data-js="flangerDelay"]'),
        name: 'Delay',
        min: 0.005,
        max: 0.05,
        value: flanger.delay
    }, function(value) {
        flanger.delay = value;
    });

    ui.createControl({
        el: document.querySelector('[data-js="flangerLFOGain"]'),
        name: 'LFO Gain',
        min: 0.0005,
        max: 0.005,
        value: flanger.gain
    }, function(value) {
        flanger.gain = value;
    });

    ui.createControl({
        el: document.querySelector('[data-js="flangerLFOFrequency"]'),
        name: 'LFO Frequency',
        min: 0.05,
        max: 5.0,
        value: flanger.frequency
    }, function(value) {
        flanger.frequency = value;
    });

    ui.createControl({
        el: document.querySelector('[data-js="flangerFeedback"]'),
        name: 'Feedback',
        min: 0.0,
        max: 0.9,
        value: flanger.feedback
    }, function(value) {
        flanger.feedback = value;
    });

    /*
     * fade
     */

    var fadeTime = 1;

    ui.createToggle({
        el: document.querySelector('[data-js="fadeToggle"]'),
        name: 'Toggle',
        value: false
    }, function(value) {
        sono.fade(value ? 0 : 1, fadeTime);
    });

    ui.createControl({
        el: document.querySelector('[data-js="fadeTime"]'),
        name: 'Time',
        min: 0,
        max: 10,
        value: fadeTime
    }, function(value) {
        fadeTime = value;
    });

    /*
     * highpass filter
     */

    var maxFreq = (sono.context && sono.context.sampleRate / 2) || 0;

    ui.createControl({
        el: document.querySelector('[data-js="highpassFrequency"]'),
        name: 'Frequency',
        min: 20,
        max: maxFreq,
        value: 20,
        places: 0
    }, function(value) {
        highpass.frequency = value;
    });

    ui.createControl({
        el: document.querySelector('[data-js="highpassQ"]'),
        name: 'Peak',
        min: 0.0001,
        max: 40,
        value: highpass.Q
    }, function(value) {
        highpass.Q = value;
    });

    ui.createControl({
        el: document.querySelector('[data-js="highpassDetune"]'),
        name: 'Detune',
        min: -1000,
        max: 1000,
        places: 2,
        value: highpass.detune
    }, function(value) {
        highpass.detune = value;
    });

    /*
     * lowshelf filter
     */

    ui.createControl({
        el: document.querySelector('[data-js="lowshelfFrequency"]'),
        name: 'Frequency',
        min: 20,
        max: maxFreq,
        value: 80,
        places: 0
    }, function(value) {
        lowshelf.frequency = value;
    });

    ui.createControl({
        el: document.querySelector('[data-js="lowshelfGain"]'),
        name: 'Peak',
        min: -40,
        max: 40,
        value: lowshelf.gain
    }, function(value) {
        lowshelf.gain = value;
    });

    ui.createControl({
        el: document.querySelector('[data-js="lowshelfDetune"]'),
        name: 'Detune',
        min: -1000,
        max: 1000,
        value: lowshelf.detune
    }, function(value) {
        lowshelf.detune = value;
    });

    /*
     * upload
     */

    var upload = document.querySelector('[data-js="upload"]');
    var uploadText = document.querySelector('[data-js="upload-text"]');
    upload.addEventListener('change', function(event) {
        var playing = sound.playing;
        sound.stop();
        uploadText.innerHTML = 'loading...';

        var file = event.currentTarget.files[0];
        var reader = new FileReader();
        reader.onload = function(e) {
            //console.log(event.target.result);
            sono.context.decodeAudioData(
                e.target.result,
                function(buffer) {
                    sound.data = buffer;
                    if (playing) {
                        sound.play();
                    }
                    uploadText.innerHTML = 'upload file';
                },
                function(err) {
                    console.error('ERROR: context.decodeAudioData:', err);
                    uploadText.innerHTML = 'error';
                }
            );
        };
        reader.readAsArrayBuffer(file);
    });

    /*
     * update
     */

    function update() {
        window.requestAnimationFrame(update);
        if (sound.playing) {
            player();
            playerTop();
            waveformsExample();
        }
    }
    update();

}());
