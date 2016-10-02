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

        var togglePlay = function(event) {
            if (event.type === 'touchstart') {
                inner.removeEventListener('mousedown', togglePlay);
            }
            if (sound.playing) {
                sound.pause();
            } else {
                sound.play();
            }
        };

        var updateState = function() {
            el.classList.toggle('is-playing', sound.playing);
            if (sound.playing) {
                update();
            } else {
                draw(0);
            }
        };

        var setRotation = function(el, deg) {
            var transform = 'rotate(' + deg + 'deg)';
            el.style.webkitTransform = transform;
            el.style.transform = transform;
        };

        var draw = function(progress) {
            if (elProgressBarA) {
                var rotation = progress * 360;
                setRotation(elProgressBarA, Math.min(rotation, 180));
                setRotation(elProgressBarB, Math.max(rotation - 180, 0));
                // waveformer(analyser.getWaveform(false));
                // waveformer(analyser.getFrequencies(true));
                waveformer();
            } else if (analyser) {
                waveformer(analyser.getFrequencies(false));
            } else {
                waveformer();
            }
        };

        var update = function() {
            // if(sound.playing) {
            //   window.requestAnimationFrame(update);
            // }

            if (!el.classList.contains('is-active')) {
                return;
            }

            if (sound.data) {
                draw(sound.progress);
            }
        };

        var init = function() {
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
        };

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
            labelOn = options.labelOn !== undefined ? options.labelOn : 'on',
            labelOff = options.labelOff !== undefined ? options.labelOff : 'off',
            callback = fn;

        var updateState = function(value) {
            if (value) {
                iconEl.classList.remove('Control-mark--cross');
                iconEl.classList.add('Control-mark--tick');
            } else {
                iconEl.classList.remove('Control-mark--tick');
                iconEl.classList.add('Control-mark--cross');
            }
            setLabel(value ? labelOn : labelOff);
        };

        var onDown = function(event) {
            if (event.type === 'touchstart') {
                el.removeEventListener('mousedown', onDown);
            }

            value = !value;

            updateState(value);

            if (callback) {
                callback(value);
            }
        };

        var setName = function(value) {
            nameEl.innerHTML = value;
        };

        var setLabel = function(value) {
            outputEl.value = value;
        };

        var destroy = function() {
            el.removeEventListener('mousedown', onDown);
            el.removeEventListener('touchstart', onDown);
        };

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

        var onDown = function(event) {
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
        };

        var onUp = function(event) {
            event.preventDefault();
            document.body.removeEventListener('mousemove', onMove);
            document.body.removeEventListener('touchmove', onMove);
            document.body.removeEventListener('mouseup', onUp);
            document.body.removeEventListener('touchend', onUp);
        };

        var onMove = function(event) {
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
        };

        var destroy = function() {
            document.body.removeEventListener('mousemove', onMove);
            document.body.removeEventListener('touchmove', onMove);
            document.body.removeEventListener('mouseup', onUp);
            document.body.removeEventListener('touchend', onUp);
            el.removeEventListener('mousedown', onDown);
            el.removeEventListener('touchstart', onDown);
        };

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
        createToggle: createToggle
    };

}());
