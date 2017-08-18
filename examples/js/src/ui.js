(function() {
    const sono = window.sono;

    const math = {
        DEG: 180 / Math.PI,
        angle: function(x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            return Math.atan2(dy, dx);
        },
        clamp: function(val, mn, mx) {
            if (mn > mx) {
                const a = mn;
                mn = mx;
                mx = a;
            }
            if (val < mn) {
                return mn;
            }
            if (val > mx) {
                return mx;
            }
            return val;
        },
        degrees: function(radians) {
            return radians * this.DEG;
        },
        distance: function(x1, y1, x2, y2) {
            const sq = math.distanceSQ(x1, y1, x2, y2);
            return Math.sqrt(sq);
        },
        distanceSQ: function(x1, y1, x2, y2) {
            const dx = x1 - x2;
            const dy = y1 - y2;
            return dx * dx + dy * dy;
        },
        normalize(value, min, max) {
            return (value - min) / (max - min);
        }
    };

    function createPlayer(options) {
        const sound = options.sound;
        const el = options.el;
        const analyser = options.analyser;
        const inner = el.querySelector('[data-inner]');
        const elProgressBarA = el.querySelector('[data-progress-a]');
        const elProgressBarB = el.querySelector('[data-progress-b]');
        const canvas = el.querySelector('canvas');
        let waveformer;

        function togglePlay(event) {
            if (event.type === 'touchstart') {
                inner.removeEventListener('mousedown', togglePlay);
            }
            if (sound.playing) {
                sound.pause();
            } else {
                sound.play();
            }
        }

        function updateState() {
            el.classList.toggle('is-playing', sound.playing);
            if (sound.playing) {
                update();
            }
        }

        function setRotation(elem, deg) {
            const transform = 'rotate(' + deg + 'deg)';
            elem.style.webkitTransform = transform;
            elem.style.transform = transform;
        }

        function draw(progress) {
            if (elProgressBarA) {
                const rotation = progress * 360;
                setRotation(elProgressBarA, Math.min(rotation, 180));
                setRotation(elProgressBarB, Math.max(rotation - 180, 0));
                waveformer();
            } else if (analyser) {
                waveformer(analyser.getFrequencies(false));
            } else {
                waveformer();
            }
        }

        function update() {
            if (!el.classList.contains('is-active')) {
                return;
            }

            if (sound.data) {
                draw(sound.progress);
            }
        }

        function init() {
            if (elProgressBarA) {
                waveformer = sono.utils.waveformer({
                    shape: 'circular',
                    style: 'fill',
                    sound: sound,
                    canvas: canvas,
                    innerRadius: 180,
                    lineWidth: 1.5,
                    color: (position, length) => {
                        return position / length < sound.progress ? '#bbcccc' : '#dddddd';
                    }
                });
            } else if (analyser) {
                waveformer = sono.utils.waveformer({
                    shape: 'linear',
                    style: 'fill',
                    width: 2048,
                    lineWidth: 10,
                    canvas: canvas,
                    color: '#bbcccc',
                    bgColor: '#ffffff',
                    transform: value => value / 256
                });
            } else {
                waveformer = sono.utils.waveformer({
                    sound: sound,
                    shape: 'linear',
                    style: 'fill',
                    lineWidth: 2,
                    canvas: canvas,
                    color: (position, length) => {
                        return position / length < sound.progress ? '#bbcccc' : '#dddddd';
                    }
                });
            }

            draw(0);

            inner.addEventListener('touchstart', togglePlay);
            inner.addEventListener('mousedown', togglePlay);
        }

        sound.on('ready', init).on('ended', updateState).on('play', updateState).on('pause', updateState);

        update.el = el;

        update.destroy = function(destroySound) {
            if (destroySound) {
                sound.destroy();
            }
            sound.off();
            inner.removeEventListener('touchstart', togglePlay);
            inner.removeEventListener('mousedown', togglePlay);
            el.classList.remove('is-active');
        };

        if (sound.data) {
            init();
        }

        return update;
    }

    /*
     * Toggle control
     */

    function createToggle(options, fn) {
        const name = options.name || '';
        const labelOn = options.labelOn || 'on';
        const labelOff = options.labelOff || 'off';
        let value = !!options.value;

        const el = document.createElement('div');
        el.innerHTML = `
        <div class="Control" data-toggle>
          <h3 class="Control-name" data-name>${name}</h3>
          <div class="Control-inner">
            <div class="Control-circle">
              <div class="Control-mark Control-mark--cross" data-icon></div>
            </div>
          </div>
          <output class="Control-output" data-output></output>
        </div>
        `;
        options.el.appendChild(el);
        const iconEl = el.querySelector('[data-icon]');
        const outputEl = el.querySelector('[data-output]');

        function updateState(val) {
            if (val) {
                iconEl.classList.remove('Control-mark--cross');
                iconEl.classList.add('Control-mark--tick');
            } else {
                iconEl.classList.remove('Control-mark--tick');
                iconEl.classList.add('Control-mark--cross');
            }
            setLabel(val ? labelOn : labelOff);
        }

        function onDown(event) {
            if (event.type === 'touchstart') {
                el.removeEventListener('mousedown', onDown);
            }

            value = !value;

            updateState(value);

            if (fn) {
                fn(value);
            }
        }

        function setLabel(v) {
            outputEl.value = v;
        }

        function toggle(val) {
            value = val;
            updateState(val);
        }

        function destroy() {
            el.removeEventListener('mousedown', onDown);
            el.removeEventListener('touchstart', onDown);
        }

        el.addEventListener('mousedown', onDown);
        el.addEventListener('touchstart', onDown);
        updateState(value);

        return {setLabel, toggle, destroy};
    }

    /*
     * Trigger control
     */

    function createTrigger(options, fn) {
        const name = options.name || '';

        const el = document.createElement('div');
        el.innerHTML = `
        <div class="Control" data-trigger>
            <h3 class="Control-name" data-name>${name}</h3>
            <div class="Control-inner">
                <div class="Control-circle">
                    <div class="Control-mark Control-mark--play" data-icon></div>
                </div>
            </div>
            <output class="Control-output" data-output>&nbsp;</output>
        </div>
        `;
        options.el.appendChild(el);

        function onDown(event) {
            if (event.type === 'touchstart') {
                el.removeEventListener('mousedown', onDown);
            }

            if (fn) {
                fn();
            }
        }

        function destroy() {
            el.removeEventListener('mousedown', onDown);
            el.removeEventListener('touchstart', onDown);
        }

        el.addEventListener('mousedown', onDown);
        el.addEventListener('touchstart', onDown);

        return {destroy};
    }

    /*
     * Radial control
     */

    function createControl(options, fn) {
        const name = options.name || '';
        const places = typeof options.places === 'number' ? options.places : 4;
        let min = options.min || 0;
        let max = options.max || 0;

        let value = options.value || 0;
        let lastDeg = 0;
        let delta = 0;

        const el = document.createElement('div');
        el.innerHTML = `
        <div class="Control" data-control>
            <h3 class="Control-name" data-name>${name}</h3>
            <div class="Control-inner">
                <div class="Control-circle" data-wheel>
                    <div class="Control-mark Control-mark--line"></div>
                </div>
            </div>
            <div class="Control-inner">
                <div class="Control-bound" data-min>${min.toFixed(places)}</div>
                <output class="Control-output" data-output>${value.toFixed(places)}</output>
                <div class="Control-bound" data-max>${max.toFixed(places)}</div>
            </div>
        </div>
        `;
        options.el.appendChild(el);
        const nameEl = el.querySelector('[data-name]');
        const wheelEl = el.querySelector('[data-wheel]');
        const outputEl = el.querySelector('[data-output]');
        const minEl = el.querySelector('[data-min]');
        const maxEl = el.querySelector('[data-max]');

        function onDown(event) {
            event.preventDefault();
            if (event.type === 'touchstart') {
                el.removeEventListener('mousedown', onDown);
                document.body.addEventListener('touchmove', onMove);
                document.body.addEventListener('touchend', onUp);
            } else {
                document.body.addEventListener('mousemove', onMove);
                document.body.addEventListener('mouseup', onUp);
            }
            onMove(event);
        }

        function onUp(event) {
            event.preventDefault();
            document.body.removeEventListener('mousemove', onMove);
            document.body.removeEventListener('touchmove', onMove);
            document.body.removeEventListener('mouseup', onUp);
            document.body.removeEventListener('touchend', onUp);
        }

        function update(val) {
            value = math.clamp(val, min, max);

            const transform = 'rotate(' + lastDeg.toFixed(1) + 'deg)';
            wheelEl.style.webkitTransform = transform;
            wheelEl.style.transform = transform;

            if (outputEl) {
                outputEl.value = value.toFixed(places);
            }
        }

        function onMove(event) {
            event.preventDefault();
            if (event.touches) {
                event = event.touches[0];
            }
            const rect = el.getBoundingClientRect();
            const cX = rect.left + rect.width / 2;
            const cY = rect.top + rect.height / 2;
            const mX = event.clientX;
            const mY = event.clientY;
            const distance = math.distance(cX, cY, mX, mY);

            if (distance < 100) {
                const angle = math.angle(cX, cY, mX, mY);
                let degrees = math.degrees(angle) + 90;

                while (degrees < 0) {
                    degrees = degrees + 360;
                }
                while (degrees > 360) {
                    degrees = degrees - 360;
                }

                delta = degrees - lastDeg;

                // moving across 359 to 0
                if (lastDeg > 270 && degrees < 90) {
                    delta = delta + 360;
                }
                // moving from 0 to 359
                if (lastDeg < 90 && degrees > 270) {
                    delta = delta - 360;
                }

                delta /= 360;
                delta *= Math.min(max - min, 1000);
                value += delta;
                lastDeg = degrees;

                update(value);

                if (fn) {
                    fn(value, delta);
                }
            }
        }

        function destroy() {
            document.body.removeEventListener('mousemove', onMove);
            document.body.removeEventListener('touchmove', onMove);
            document.body.removeEventListener('mouseup', onUp);
            document.body.removeEventListener('touchend', onUp);
            el.removeEventListener('mousedown', onDown);
            el.removeEventListener('touchstart', onDown);
        }

        function enable(val) {
            el.classList.toggle('is-disabled', !val);
        }

        function setLabel(val) {
            nameEl.innerText = val;
        }

        function setValue(val) {
            lastDeg = 0;
            delta = 0;
            update(val);
        }

        function setRange(mn, mx) {
            min = mn;
            max = mx;
            minEl.innerText = min.toFixed(places);
            maxEl.innerText = max.toFixed(places);
            update(value);
        }

        el.addEventListener('mousedown', onDown);
        el.addEventListener('touchstart', onDown);

        return {enable, setLabel, setValue, setRange, destroy};
    }

    /*
     * Fader
     */

    function mouseLeftWindow(fn) {
        function handler(event) {
            const from = event.relatedTarget || event.toElement;
            if (!from || from.nodeName === 'HTML') {
                fn(event);
            }
        }

        document.addEventListener('mouseout', handler, false);

        return {
            destroy () {
                document.removeEventListener('mouseout', handler);
            }
        };
    }


    function createFader(options, fn) {
        const name = options.name || '';
        const places = typeof options.places === 'number' ? options.places : 4;
        const min = options.min || 0;
        const max = options.max || 0;
        const range = max - min;
        const delta = 0;
        const h = 100;

        let value = options.value || 0;

        const el = document.createElement('div');
        el.innerHTML = `
        <div class="Fader Control" data-control>
            <h3 class="Control-name" data-name>${name}</h3>
            <div class="Fader-inner" data-inner>
                <div class="Fader-handle" data-handle></div>
            </div>
            <div class="Control-inner">
                <div class="Control-bound" data-min>${min.toFixed(places)}</div>
                <output class="Control-output" data-output>${value.toFixed(places)}</output>
                <div class="Control-bound" data-max>${max.toFixed(places)}</div>
            </div>
        </div>
        `;
        options.el.appendChild(el);

        const innerEl = el.querySelector('[data-inner]');
        const handleEl = el.querySelector('[data-handle]');
        const outputEl = el.querySelector('[data-output]');

        setValue(value);

        function onDown(event) {
            event.preventDefault();
            if (event.type === 'touchstart') {
                el.removeEventListener('mousedown', onDown);
                document.body.addEventListener('touchmove', onMove);
                document.body.addEventListener('touchend', onUp);
            } else {
                document.body.addEventListener('mousemove', onMove);
                document.body.addEventListener('mouseup', onUp);
            }
            onMove(event);
        }

        function onUp(event) {
            event.preventDefault();
            document.body.removeEventListener('mousemove', onMove);
            document.body.removeEventListener('touchmove', onMove);
            document.body.removeEventListener('mouseup', onUp);
            document.body.removeEventListener('touchend', onUp);
        }

        function setValue(val) {
            const norm = math.normalize(val, min, max);
            const transform = 'translateY(' + ((1 - norm) * h).toFixed(1) + 'px)';
            handleEl.style.webkitTransform = transform;
            handleEl.style.transform = transform;

            if (outputEl) {
                outputEl.value = val.toFixed(places);
            }
        }

        function onMove(event) {
            event.preventDefault();
            if (event.touches) {
                event = event.touches[0];
            }
            const rect = innerEl.getBoundingClientRect();

            const moveY = event.clientY - rect.top - 13;

            const pY = math.clamp(moveY, 0, h);

            value = min + range * (1 - pY / h);

            value = math.clamp(value, min, max);

            setValue(value);

            if (fn) {
                fn(value, delta);
            }
        }

        function destroy() {
            document.body.removeEventListener('mousemove', onMove);
            document.body.removeEventListener('touchmove', onMove);
            document.body.removeEventListener('mouseup', onUp);
            document.body.removeEventListener('touchend', onUp);
            el.removeEventListener('mousedown', onDown);
            el.removeEventListener('touchstart', onDown);
        }

        el.addEventListener('mousedown', onDown);
        el.addEventListener('touchstart', onDown);
        mouseLeftWindow(onUp);

        return {setValue, destroy};
    }

    function createPlayButton(options) {
        const el = document.createElement('div');
        el.innerHTML = `
        <h3 class="Control-name">Play/pause</h3>
        <button class="Button" data-btn>play</button>
        `;
        options.el.appendChild(el);

        const btn = el.querySelector('[data-btn]');

        function toggle() {
            if (options.sound.playing) {
                btn.innerText = 'pause';
            } else {
                btn.innerText = 'play';
            }
        }

        options.sound
            .on('play', toggle)
            .on('pause', toggle)
            .on('stop', toggle)
            .on('ended', toggle);

        btn.addEventListener('click', function() {
            if (options.sound.playing) {
                options.sound.pause();
            } else {
                options.sound.play();
            }
        });
    }

    function createSelect(options, fn) {
        const el = document.createElement('div');
        el.innerHTML = `
        <h3 class="Control-name">${options.name}</h3>
        <select class="Select" data-select>
            ${options.options.map(item => `
                <option value="${item.value}">${item.text}</option>
            `)}
        </select>
        `;
        options.el.appendChild(el);

        const select = el.querySelector('[data-select]');

        select.addEventListener('change', () => fn(select.value));
    }

    function createUpload(options, fn) {
        const el = document.createElement('div');
        el.innerHTML = `
        <h3 class="Control-name Upload-title">${options.name || ''}</h3>
        <div class="Upload">
            <span data-upload-text>upload file</span>
            <input type="file" accept="audio/*" data-upload>
        </div>
        `;
        options.el.appendChild(el);
        const upload = el.querySelector('[data-upload]');
        const uploadText = el.querySelector('[data-upload-text]');
        upload.addEventListener('change', event => {
            let playing = false;
            if (options.sound) {
                playing = options.sound.playing;
                options.sound.stop();
            }
            uploadText.innerHTML = 'loading...';

            const file = event.currentTarget.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                //console.log(event.target.result);
                sono.context.decodeAudioData(
                    e.target.result,
                    buffer => {
                        if (options.sound) {
                            options.sound.data = buffer;
                            if (playing) {
                                options.sound.play();
                            }
                        }
                        if (typeof fn === 'function') {
                            fn(buffer);
                        }
                        uploadText.innerHTML = 'upload file';
                    },
                    err => {
                        console.error('ERROR: context.decodeAudioData:', err);
                        uploadText.innerHTML = 'error';
                    }
                );
            };
            reader.readAsArrayBuffer(file);
        });
    }

    function createVisualizer(options) {
        const analyser = options.sound.effects.add(sono.analyser({
            fftSize: 512,
            smoothing: 0.7,
            maxDecibels: -10
        }));
        const el = document.createElement('div');
        el.className = 'Visualizer';
        options.el.appendChild(el);
        const waveform = sono.utils.waveformer({
            waveform: analyser.getWaveform(),
            shape: 'linear',
            style: 'line',
            lineWidth: 2,
            width: 320,
            height: 200,
            bgColor: '#2b2b2b',
            color: (position, length) => {
                const hue = (position / length) * 360;
                return 'hsl(' + hue + ', 100%, 50%)';
            },
            transform: value => value / 256
        });
        waveform.canvas.style.top = '-50px';
        el.appendChild(waveform.canvas);

        const frequency = sono.utils.waveformer({
            waveform: analyser.getFrequencies(),
            shape: 'linear',
            style: 'fill',
            lineWidth: 1,
            width: 320,
            height: 100,
            color: (position, length) => {
                const hue = (position / length) * 360;
                return 'hsl(' + hue + ', 80%, 40%)';
            },
            transform: value => value / 256
        });
        el.appendChild(frequency.canvas);

        function update() {
            window.requestAnimationFrame(update);
            analyser.getWaveform();
            waveform();
            analyser.getFrequencies();
            frequency();
        }
        update();
    }

    function createWaveform(options) {
        const l = 320;
        const el = document.createElement('div');
        el.className = 'Visualizer';
        options.el.appendChild(el);
        const waveformer = sono.utils.waveformer({
            waveform: options.sound.waveform(l),
            style: 'line',
            lineWidth: 1,
            width: l,
            height: 100,
            bgColor: '#2b2b2b',
            color: (position, length) => {
                const hue = (position / length) * 360;
                const sat = position / length < options.sound.progress ? 100 : 50;
                const lum = position / length < options.sound.progress ? 50 : 30;
                return `hsl(${hue}, ${sat}%, ${lum}%)`;
            }
        });
        el.appendChild(waveformer.canvas);
        function update() {
            window.requestAnimationFrame(update);
            waveformer(options.sound.waveform(l));
        }
        update();
    }

    window.ui = {
        createPlayer,
        createControl,
        createToggle,
        createTrigger,
        createFader,
        createPlayButton,
        createSelect,
        createUpload,
        createVisualizer,
        createWaveform
    };
}());
