'use strict';

(function () {
    var sono = window.sono;

    function createPlayer(options) {
        var sound = options.sound;
        var el = options.el;
        var analyser = options.analyser;
        var inner = el.querySelector('[data-inner]');
        var elProgressBarA = el.querySelector('[data-progressA]');
        var elProgressBarB = el.querySelector('[data-progressB]');
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
                    lineWidth: 2,
                    canvas: canvas,
                    color: function color(position, length) {
                        var hue = position / length * 360;
                        return 'hsl(' + hue + ', 100%, 50%)';
                    },
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

        function destroy() {
            el.removeEventListener('mousedown', onDown);
            el.removeEventListener('touchstart', onDown);
        }

        el.addEventListener('mousedown', onDown);
        el.addEventListener('touchstart', onDown);
        updateState(value);

        return { setLabel: setLabel, destroy: destroy };
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
        var range = max - min;

        var value = options.value || 0;
        var lastDeg = 0;
        var delta = 0;

        var el = document.createElement('div');
        el.innerHTML = '\n        <div class="Control" data-control>\n            <h3 class="Control-name" data-name>' + name + '</h3>\n            <div class="Control-inner">\n                <div class="Control-circle" data-wheel>\n                    <div class="Control-mark Control-mark--line"></div>\n                </div>\n            </div>\n            <div class="Control-inner">\n                <div class="Control-bound" data-min>' + min.toFixed(places) + '</div>\n                <output class="Control-output" data-output>' + value.toFixed(places) + '</output>\n                <div class="Control-bound" data-max>' + max.toFixed(places) + '</div>\n            </div>\n        </div>\n        ';
        options.el.appendChild(el);
        var wheelEl = el.querySelector('[data-wheel]');
        var outputEl = el.querySelector('[data-output]');

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
                    return min;
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
                delta *= Math.min(range, 1000);
                value += delta;
                lastDeg = degrees;

                value = math.clamp(value, min, max);

                var transform = 'rotate(' + lastDeg.toFixed(1) + 'deg)';
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

        return { destroy: destroy };
    }

    window.ui = {
        createPlayer: createPlayer,
        createControl: createControl,
        createToggle: createToggle,
        createTrigger: createTrigger
    };
})();