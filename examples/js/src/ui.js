(function() {
    const sono = window.sono;

    function createPlayer(options) {
        const sound = options.sound;
        const el = options.el;
        const analyser = options.analyser;
        const inner = el.querySelector('[data-inner]');
        const elProgressBarA = el.querySelector('[data-progressA]');
        const elProgressBarB = el.querySelector('[data-progressB]');
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
                    color: function(position, length) {
                        return position / length < sound.progress
                        ? '#bbcccc'
                        : '#dddddd';
                    }
                });
            } else if (analyser) {
                waveformer = sono.utils.waveformer({
                    shape: 'linear',
                    style: 'fill',
                    lineWidth: 2,
                    canvas: canvas,
                    color: function(position, length) {
                        const hue = (position / length) * 360;
                        return 'hsl(' + hue + ', 100%, 50%)';
                    },
                    transform: function(value) {
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
                    color: function(position, length) {
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

        function destroy() {
            el.removeEventListener('mousedown', onDown);
            el.removeEventListener('touchstart', onDown);
        }

        el.addEventListener('mousedown', onDown);
        el.addEventListener('touchstart', onDown);
        updateState(value);

        return {setLabel, destroy};
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
        const min = options.min || 0;
        const max = options.max || 0;
        const range = max - min;

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
        const wheelEl = el.querySelector('[data-wheel]');
        const outputEl = el.querySelector('[data-output]');

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
                    return min;
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
            }
        };

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
                delta *= Math.min(range, 1000);
                value += delta;
                lastDeg = degrees;

                value = math.clamp(value, min, max);

                const transform = 'rotate(' + lastDeg.toFixed(1) + 'deg)';
                wheelEl.style.webkitTransform = transform;
                wheelEl.style.transform = transform;

                if (outputEl) {
                    outputEl.value = value.toFixed(places);
                }

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

        el.addEventListener('mousedown', onDown);
        el.addEventListener('touchstart', onDown);

        return {destroy: destroy};
    }

    window.ui = {
        createPlayer,
        createControl,
        createToggle,
        createTrigger
    };
}());
