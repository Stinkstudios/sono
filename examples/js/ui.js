/* eslint no-var: 0 */
/* eslint strict: 0 */

window.ui = (function() {
    'use strict';

    var sono = window.sono;

    /*
     * Player
     */

    function createPlayer(options) {
        var sound = options.sound,
            el = options.el,
            analyser = options.analyser,
            inner = el.querySelector('[data-js="inner"]'),
            elProgressBarA = el.querySelector('[data-js="progressA"]'),
            elProgressBarB = el.querySelector('[data-js="progressB"]'),
            canvas = el.querySelector('canvas'),
            waveformer;

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
            } else {
                // draw(0);
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
                    color: function(position, length) {
                        return position / length < sound.progress ? '#bbcccc' : '#dddddd';
                    }
                });
                // waveformer = sono.utils.waveformer({
                //   shape: 'circular',
                //   style: 'line',
                //   canvas: canvas,
                //   innerRadius: 180,
                //   lineWidth: 2.5,
                //   color: 0,
                //   transform: function(value) {
                //     // return value / 256;
                //     return Math.abs(value / 200);
                //   }
                // });
            } else if (analyser) {
                waveformer = sono.utils.waveformer({
                    shape: 'linear',
                    style: 'fill',
                    lineWidth: 2,
                    canvas: canvas,
                    color: function(position, length) {
                        var hue = (position / length) * 360;
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

        sound.on('ready', init)
            .on('ended', updateState)
            .on('play', updateState)
            .on('pause', updateState);

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
        var el = options.el,
            nameEl = el.querySelector('[data-js="name"]'),
            iconEl = el.querySelector('[data-js="icon"]'),
            outputEl = el.querySelector('[data-js="output"]'),
            name = options.name || '',
            value = !!options.value,
            labelOn = options.labelOn || 'on',
            labelOff = options.labelOff || 'off',
            callback = fn;

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

            if (callback) {
                callback(value);
            }
        }

        function setName(value) {
            nameEl.innerHTML = value;
        }

        function setLabel(value) {
            outputEl.value = value;
        }

        function destroy() {
            el.removeEventListener('mousedown', onDown);
            el.removeEventListener('touchstart', onDown);
        }

        el.addEventListener('mousedown', onDown);
        el.addEventListener('touchstart', onDown);
        setName(name);
        updateState(value);

        return {
            setName: setName,
            setLabel: setLabel,
            destroy: destroy
        };
    }

	/*
     * Trigger control
     */

    function createTrigger(options, fn) {
        var el = options.el,
            nameEl = el.querySelector('[data-js="name"]'),
            iconEl = el.querySelector('[data-js="icon"]'),
            outputEl = el.querySelector('[data-js="output"]'),
            name = options.name || '',
            callback = fn;

        function onDown(event) {
            if (event.type === 'touchstart') {
                el.removeEventListener('mousedown', onDown);
            }

            if (callback) {
                callback();
            }
        }

        function setName(value) {
            nameEl.innerHTML = value;
        }

        function destroy() {
            el.removeEventListener('mousedown', onDown);
            el.removeEventListener('touchstart', onDown);
        }

        el.addEventListener('mousedown', onDown);
        el.addEventListener('touchstart', onDown);
        setName(name);

        return {
            setName: setName,
            destroy: destroy
        };
    }

    /*
     * Radial control
     */

    function createControl(options, fn) {
        var el = options.el,
            nameEl = el.querySelector('[data-js="name"]'),
            wheelEl = el.querySelector('[data-js="wheel"]'),
            minEl = el.querySelector('[data-js="min"]'),
            maxEl = el.querySelector('[data-js="max"]'),
            outputEl = el.querySelector('[data-js="output"]'),
            name = options.name || '',
            value = options.value || 0,
            places = typeof options.places === 'number' ? options.places : 4,
            min = options.min || 0,
            max = options.max || 0,
            range = max - min,
            callback = fn,
            lastDeg = 0,
            delta = 0;

        var math = {
            DEG: 180 / Math.PI,
            angle: function(x1, y1, x2, y2) {
                var dx = x2 - x1;
                var dy = y2 - y1;
                return Math.atan2(dy, dx);
            },
            clamp: function(value, min, max) {
                if (min > max) {
                    var a = min;
                    min = max;
                    max = a;
                }
                if (value < min) {
                    return min;
                }
                if (value > max) {
                    return max;
                }
                return value;
            },
            degrees: function(radians) {
                return radians * this.DEG;
            },
            distance: function(x1, y1, x2, y2) {
                var sq = math.distanceSQ(x1, y1, x2, y2);
                return Math.sqrt(sq);
            },
            distanceSQ: function(x1, y1, x2, y2) {
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

                if (callback) {
                    callback(value, delta);
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
        nameEl.innerHTML = name;
        minEl.innerHTML = min.toFixed(places);
        maxEl.innerHTML = max.toFixed(places);
        outputEl.value = value.toFixed(places);

        return {
            destroy: destroy
        };
    }

    return {
        createPlayer: createPlayer,
        createControl: createControl,
        createToggle: createToggle,
        createTrigger: createTrigger
    };

}());
