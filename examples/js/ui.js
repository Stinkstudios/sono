'use strict';

(function () {
    var sono = window.sono;

    var math = {
        DEG: 180 / Math.PI,
        angle: function angle(x1, y1, x2, y2) {
            var dx = x2 - x1;
            var dy = y2 - y1;
            return Math.atan2(dy, dx);
        },
        clamp: function clamp(val, mn, mx) {
            if (mn > mx) {
                var a = mn;
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
        degrees: function degrees(radians) {
            return radians * this.DEG;
        },
        distance: function distance(x1, y1, x2, y2) {
            var sq = math.distanceSQ(x1, y1, x2, y2);
            return Math.sqrt(sq);
        },
        distanceSQ: function distanceSQ(x1, y1, x2, y2) {
            var dx = x1 - x2;
            var dy = y1 - y2;
            return dx * dx + dy * dy;
        },
        normalize: function normalize(value, min, max) {
            return (value - min) / (max - min);
        }
    };

    function createPlayer(options) {
        var sound = options.sound;
        var el = options.el;
        var analyser = options.analyser;
        var inner = el.querySelector('[data-inner]');
        var elProgressBarA = el.querySelector('[data-progress-a]');
        var elProgressBarB = el.querySelector('[data-progress-b]');
        var canvas = el.querySelector('canvas');
        var waveformer = void 0;

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
            var transform = 'rotate(' + deg + 'deg)';
            elem.style.webkitTransform = transform;
            elem.style.transform = transform;
        }

        function draw(progress) {
            if (elProgressBarA) {
                var rotation = progress * 360;
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
                    color: function color(position, length) {
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
                    transform: function transform(value) {
                        return value / 256;
                    }
                });
            } else {
                waveformer = sono.utils.waveformer({
                    sound: sound,
                    shape: 'linear',
                    style: 'fill',
                    lineWidth: 2,
                    canvas: canvas,
                    color: function color(position, length) {
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

        update.destroy = function (destroySound) {
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
        var name = options.name || '';
        var labelOn = options.labelOn || 'on';
        var labelOff = options.labelOff || 'off';
        var value = !!options.value;

        var el = document.createElement('div');
        el.innerHTML = '\n        <div class="Control" data-toggle>\n          <h3 class="Control-name" data-name>' + name + '</h3>\n          <div class="Control-inner">\n            <div class="Control-circle">\n              <div class="Control-mark Control-mark--cross" data-icon></div>\n            </div>\n          </div>\n          <output class="Control-output" data-output></output>\n        </div>\n        ';
        options.el.appendChild(el);
        var iconEl = el.querySelector('[data-icon]');
        var outputEl = el.querySelector('[data-output]');

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

        return { setLabel: setLabel, toggle: toggle, destroy: destroy };
    }

    /*
     * Trigger control
     */

    function createTrigger(options, fn) {
        var name = options.name || '';

        var el = document.createElement('div');
        el.innerHTML = '\n        <div class="Control" data-trigger>\n            <h3 class="Control-name" data-name>' + name + '</h3>\n            <div class="Control-inner">\n                <div class="Control-circle">\n                    <div class="Control-mark Control-mark--play" data-icon></div>\n                </div>\n            </div>\n            <output class="Control-output" data-output>&nbsp;</output>\n        </div>\n        ';
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

        return { destroy: destroy };
    }

    /*
     * Radial control
     */

    function createControl(options, fn) {
        var name = options.name || '';
        var places = typeof options.places === 'number' ? options.places : 4;
        var min = options.min || 0;
        var max = options.max || 0;

        var value = options.value || 0;
        var lastDeg = 0;
        var delta = 0;

        var el = document.createElement('div');
        el.innerHTML = '\n        <div class="Control" data-control>\n            <h3 class="Control-name" data-name>' + name + '</h3>\n            <div class="Control-inner">\n                <div class="Control-circle" data-wheel>\n                    <div class="Control-mark Control-mark--line"></div>\n                </div>\n            </div>\n            <div class="Control-inner">\n                <div class="Control-bound" data-min>' + min.toFixed(places) + '</div>\n                <output class="Control-output" data-output>' + value.toFixed(places) + '</output>\n                <div class="Control-bound" data-max>' + max.toFixed(places) + '</div>\n            </div>\n        </div>\n        ';
        options.el.appendChild(el);
        var nameEl = el.querySelector('[data-name]');
        var wheelEl = el.querySelector('[data-wheel]');
        var outputEl = el.querySelector('[data-output]');
        var minEl = el.querySelector('[data-min]');
        var maxEl = el.querySelector('[data-max]');

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

            var transform = 'rotate(' + lastDeg.toFixed(1) + 'deg)';
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
            var rect = el.getBoundingClientRect();
            var cX = rect.left + rect.width / 2;
            var cY = rect.top + rect.height / 2;
            var mX = event.clientX;
            var mY = event.clientY;
            var distance = math.distance(cX, cY, mX, mY);

            if (distance < 100) {
                var angle = math.angle(cX, cY, mX, mY);
                var degrees = math.degrees(angle) + 90;

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

        return { enable: enable, setLabel: setLabel, setValue: setValue, setRange: setRange, destroy: destroy };
    }

    /*
     * Fader
     */

    function mouseLeftWindow(fn) {
        function handler(event) {
            var from = event.relatedTarget || event.toElement;
            if (!from || from.nodeName === 'HTML') {
                fn(event);
            }
        }

        document.addEventListener('mouseout', handler, false);

        return {
            destroy: function destroy() {
                document.removeEventListener('mouseout', handler);
            }
        };
    }

    function createFader(options, fn) {
        var name = options.name || '';
        var places = typeof options.places === 'number' ? options.places : 4;
        var min = options.min || 0;
        var max = options.max || 0;
        var range = max - min;
        var delta = 0;
        var h = 100;

        var value = options.value || 0;

        var el = document.createElement('div');
        el.innerHTML = '\n        <div class="Fader Control" data-control>\n            <h3 class="Control-name" data-name>' + name + '</h3>\n            <div class="Fader-inner" data-inner>\n                <div class="Fader-handle" data-handle></div>\n            </div>\n            <div class="Control-inner">\n                <div class="Control-bound" data-min>' + min.toFixed(places) + '</div>\n                <output class="Control-output" data-output>' + value.toFixed(places) + '</output>\n                <div class="Control-bound" data-max>' + max.toFixed(places) + '</div>\n            </div>\n        </div>\n        ';
        options.el.appendChild(el);

        var innerEl = el.querySelector('[data-inner]');
        var handleEl = el.querySelector('[data-handle]');
        var outputEl = el.querySelector('[data-output]');

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
            var norm = math.normalize(val, min, max);
            var transform = 'translateY(' + ((1 - norm) * h).toFixed(1) + 'px)';
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
            var rect = innerEl.getBoundingClientRect();

            var moveY = event.clientY - rect.top - 13;

            var pY = math.clamp(moveY, 0, h);

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

        return { setValue: setValue, destroy: destroy };
    }

    function createPlayButton(options) {
        var el = document.createElement('div');
        el.innerHTML = '\n        <h3 class="Control-name">Play/pause</h3>\n        <button class="Button" data-btn>play</button>\n        ';
        options.el.appendChild(el);

        var btn = el.querySelector('[data-btn]');

        function toggle() {
            if (options.sound.playing) {
                btn.innerText = 'pause';
            } else {
                btn.innerText = 'play';
            }
        }

        options.sound.on('play', toggle).on('pause', toggle).on('stop', toggle).on('ended', toggle);

        btn.addEventListener('click', function () {
            if (options.sound.playing) {
                options.sound.pause();
            } else {
                options.sound.play();
            }
        });
    }

    function createSelect(options, fn) {
        var el = document.createElement('div');
        el.innerHTML = '\n        <h3 class="Control-name">' + options.name + '</h3>\n        <select class="Select" data-select>\n            ' + options.options.map(function (item) {
            return '\n                <option value="' + item.value + '">' + item.text + '</option>\n            ';
        }) + '\n        </select>\n        ';
        options.el.appendChild(el);

        var select = el.querySelector('[data-select]');

        select.addEventListener('change', function () {
            return fn(select.value);
        });
    }

    function createUpload(options, fn) {
        var el = document.createElement('div');
        el.innerHTML = '\n        <h3 class="Control-name Upload-title">' + (options.name || '') + '</h3>\n        <div class="Upload">\n            <span data-upload-text>upload file</span>\n            <input type="file" accept="audio/*" data-upload>\n        </div>\n        ';
        options.el.appendChild(el);
        var upload = el.querySelector('[data-upload]');
        var uploadText = el.querySelector('[data-upload-text]');
        upload.addEventListener('change', function (event) {
            var playing = false;
            if (options.sound) {
                playing = options.sound.playing;
                options.sound.stop();
            }
            uploadText.innerHTML = 'loading...';

            var file = event.currentTarget.files[0];
            var reader = new FileReader();
            reader.onload = function (e) {
                //console.log(event.target.result);
                sono.context.decodeAudioData(e.target.result, function (buffer) {
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
                }, function (err) {
                    console.error('ERROR: context.decodeAudioData:', err);
                    uploadText.innerHTML = 'error';
                });
            };
            reader.readAsArrayBuffer(file);
        });
    }

    function createVisualizer(options) {
        var analyser = options.sound.effects.add(sono.analyser({
            fftSize: 512,
            smoothing: 0.7,
            maxDecibels: -10
        }));
        var el = document.createElement('div');
        el.className = 'Visualizer';
        options.el.appendChild(el);
        var waveform = sono.utils.waveformer({
            waveform: analyser.getWaveform(),
            shape: 'linear',
            style: 'line',
            lineWidth: 2,
            width: 320,
            height: 200,
            bgColor: '#2b2b2b',
            color: function color(position, length) {
                var hue = position / length * 360;
                return 'hsl(' + hue + ', 100%, 50%)';
            },
            transform: function transform(value) {
                return value / 256;
            }
        });
        waveform.canvas.style.top = '-50px';
        el.appendChild(waveform.canvas);

        var frequency = sono.utils.waveformer({
            waveform: analyser.getFrequencies(),
            shape: 'linear',
            style: 'fill',
            lineWidth: 1,
            width: 320,
            height: 100,
            color: function color(position, length) {
                var hue = position / length * 360;
                return 'hsl(' + hue + ', 80%, 40%)';
            },
            transform: function transform(value) {
                return value / 256;
            }
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
        var l = 320;
        var el = document.createElement('div');
        el.className = 'Visualizer';
        options.el.appendChild(el);
        var waveformer = sono.utils.waveformer({
            waveform: options.sound.waveform(l),
            style: 'line',
            lineWidth: 1,
            width: l,
            height: 100,
            bgColor: '#2b2b2b',
            color: function color(position, length) {
                var hue = position / length * 360;
                var sat = position / length < options.sound.progress ? 100 : 50;
                var lum = position / length < options.sound.progress ? 50 : 30;
                return 'hsl(' + hue + ', ' + sat + '%, ' + lum + '%)';
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
        createPlayer: createPlayer,
        createControl: createControl,
        createToggle: createToggle,
        createTrigger: createTrigger,
        createFader: createFader,
        createPlayButton: createPlayButton,
        createSelect: createSelect,
        createUpload: createUpload,
        createVisualizer: createVisualizer,
        createWaveform: createWaveform
    };
})();