(function() {

    const {baseURL, sono, ui} = window;

    sono.log();

    const info = document.querySelector('[data-info]');
    info.innerHTML = '<li>Audio support: ' + sono.isSupported + '</li>' +
        '<li>Web Audio support: ' + sono.hasWebAudio + '</li>' +
        '<li>Touch locked (mobile): ' + sono.isTouchLocked + '</li>' +
        '<li>Supported extensions: ' + sono.extensions.join(', ') + '</li>';

    const sound = sono.create({
        src: [
            baseURL + 'dnb-loop.ogg',
            baseURL + 'dnb-loop.mp3'
        ],
        loop: true
    });

    const panner = sono.effects.add(sono.panner());

    const distortion = sono.effects.add(sono.distortion({
        level: 0
    }));

    const echo = sono.effects.add(sono.echo({
        delay: 0,
        feedback: 0.2
    }));

    const flanger = sono.effects.add(sono.flanger({
        stereo: true
    }));
    sono.effects.remove(flanger);

    const highpass = sono.effects.add(sono.highpass({
        frequency: 20
    }));

    const lowshelf = sono.effects.add(sono.lowshelf({
        frequency: 80, gain: 0}));

    const reverb = sono.effects.add(sono.reverb({
        time: 0.1,
        decay: 2
    }));

    createWaveformsExample();

    /*
     * players
     */

    const playerTop = ui.createPlayer({
        el: document.querySelector('[data-player-top]'),
        sound: sound,
        analyser: sono.effects.add(sono.analyser({
            fftSize: 256,
            smoothing: 0.7,
            float: false
        }))
    });

    const player = ui.createPlayer({
        el: document.querySelector('[data-player]'),
        sound: sound,
        analyser: sono.effects.add(sono.analyser({
            fftSize: 2048,
            smoothing: 0.7,
            float: true
        }))
    });

    /*
     * show minimized player
     */

    window.addEventListener('scroll', () => {
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop || window.pageYOffset || 0;
        const threshold = Math.max(400, Math.min(600, window.innerWidth));
        const isScrolledDown = scrollTop > threshold;
        playerTop.el.classList.toggle('is-active', isScrolledDown);
        player.el.classList.toggle('is-active', !isScrolledDown);
    });

    /*
     * controls
     */

    const controls = document.querySelector('[data-controls]');

    ui.createControl({
        el: controls,
        name: 'Master Volume',
        min: 0,
        max: 1,
        value: 1
    }, value => {
        sono.volume = value;
    });

    ui.createControl({
        el: controls,
        name: 'Volume',
        min: 0,
        max: 1,
        value: 1
    }, value => {
        sound.volume = value;
    });

    ui.createControl({
        el: controls,
        name: 'Pan',
        min: -1,
        max: 1,
        value: 0
    }, value => {
        panner.set(value);
    });

    ui.createControl({
        el: controls,
        name: 'Rate',
        min: 0,
        max: 4,
        value: 1
    }, value => {
        sound.playbackRate = value;
    });

    ui.createToggle({
        el: controls,
        name: 'Loop',
        value: sound.loop
    }, value => {
        console.log('toggle loop:', value);
        sound.loop = value;
    });

    ui.createToggle({
        el: controls,
        name: 'Reverse',
        value: false
    }, () => {
        sono.utils.reverseBuffer(sound.data);
    });

    /*
     * echo
     */

    ui.createControl({
        el: document.querySelector('[data-echo]'),
        name: 'Delay',
        min: 0,
        max: 1,
        value: 0
    }, value => {
        echo.delay = value;
    });

    ui.createControl({
        el: document.querySelector('[data-echo]'),
        name: 'Feedback',
        min: 0.1,
        max: 10,
        value: 0.1
    }, value => {
        echo.feedback = value;
    });

    /*
     * distortion
     */

    ui.createToggle({
        el: document.querySelector('[data-distortion]'),
        name: 'Active',
        value: true
    }, value => {
        sono.effects.toggle(distortion, value);
    });

    ui.createControl({
        el: document.querySelector('[data-distortion]'),
        name: 'Level',
        min: 0,
        max: 2,
        value: 0
    }, value => {
        distortion.level = value;
    });

    /*
     * waveforms
     */

    function createWaveformsExample() {
        const el = document.querySelector('[data-waveforms]');
        sound.once('ready', function() {
            ui.createWaveform({
                el: el,
                sound: sound
            });
            ui.createVisualizer({
                el: el,
                sound: sound
            });
        });
    }

    /*
     * reverb
     */

    ui.createToggle({
        el: document.querySelector('[data-reverb]'),
        name: 'Active',
        value: true
    }, value => {
        sono.effects.toggle(reverb, value);
    });

    ui.createControl({
        el: document.querySelector('[data-reverb]'),
        name: 'Time',
        min: 0,
        max: 5,
        value: reverb.time
    }, value => {
        reverb.time = value;
    });

    ui.createControl({
        el: document.querySelector('[data-reverb]'),
        name: 'Decay',
        min: 0,
        max: 10,
        value: reverb.decay
    }, value => {
        reverb.decay = value;
    });

    ui.createToggle({
        el: document.querySelector('[data-reverb]'),
        name: 'reverse',
        value: false
    }, value => {
        reverb.reverse = value;
    });

    /*
     * flanger
     */

    ui.createToggle({
        el: document.querySelector('[data-flanger]'),
        name: 'Active',
        value: false
    }, value => {
        sono.effects.toggle(flanger, value);
    });

    ui.createControl({
        el: document.querySelector('[data-flanger]'),
        name: 'Delay',
        min: 0.005,
        max: 0.05,
        value: flanger.delay
    }, value => {
        flanger.delay = value;
    });

    ui.createControl({
        el: document.querySelector('[data-flanger]'),
        name: 'LFO Gain',
        min: 0.0005,
        max: 0.005,
        value: flanger.gain
    }, value => {
        flanger.gain = value;
    });

    ui.createControl({
        el: document.querySelector('[data-flanger]'),
        name: 'LFO Frequency',
        min: 0.05,
        max: 5.0,
        value: flanger.frequency
    }, value => {
        flanger.frequency = value;
    });

    ui.createControl({
        el: document.querySelector('[data-flanger]'),
        name: 'Feedback',
        min: 0.0,
        max: 0.9,
        value: flanger.feedback
    }, value => {
        flanger.feedback = value;
    });

    /*
     * fade
     */

    let fadeTime = 1;

    ui.createToggle({
        el: document.querySelector('[data-fade]'),
        name: 'Toggle',
        value: false
    }, value => {
        sono.fade(value ? 0 : 1, fadeTime);
    });

    ui.createControl({
        el: document.querySelector('[data-fade]'),
        name: 'Time',
        min: 0,
        max: 10,
        value: fadeTime
    }, value => {
        fadeTime = value;
    });

    /*
     * highpass filter
     */

    const maxFreq = (sono.context && sono.context.sampleRate / 2) || 0;

    ui.createControl({
        el: document.querySelector('[data-highpass]'),
        name: 'Frequency',
        min: 20,
        max: maxFreq,
        value: 20,
        places: 0
    }, value => {
        highpass.frequency = value;
    });

    ui.createControl({
        el: document.querySelector('[data-highpass]'),
        name: 'Peak',
        min: 0.0001,
        max: 40,
        value: highpass.Q
    }, value => {
        highpass.Q = value;
    });

    ui.createControl({
        el: document.querySelector('[data-highpass]'),
        name: 'Detune',
        min: -1000,
        max: 1000,
        places: 2,
        value: highpass.detune
    }, value => {
        highpass.detune = value;
    });

    /*
     * lowshelf filter
     */

    ui.createControl({
        el: document.querySelector('[data-lowshelf]'),
        name: 'Frequency',
        min: 20,
        max: maxFreq,
        value: 80,
        places: 0
    }, value => {
        lowshelf.frequency = value;
    });

    ui.createControl({
        el: document.querySelector('[data-lowshelf]'),
        name: 'Peak',
        min: -40,
        max: 40,
        value: lowshelf.gain
    }, value => {
        lowshelf.gain = value;
    });

    ui.createControl({
        el: document.querySelector('[data-lowshelf]'),
        name: 'Detune',
        min: -1000,
        max: 1000,
        value: lowshelf.detune
    }, value => {
        lowshelf.detune = value;
    });

    /*
     * upload
     */

    ui.createUpload({
        el: document.querySelector('[data-upload]'),
        name: '',
        sound: sound
    });

    /*
     * update
     */

    function update() {
        window.requestAnimationFrame(update);
        if (sound.playing) {
            player();
            playerTop();
        }
    }
    update();

}());
