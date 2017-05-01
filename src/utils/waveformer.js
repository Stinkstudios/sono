import sono from '../core/sono';

const halfPI = Math.PI / 2;
const twoPI = Math.PI * 2;

function waveformer(config) {

    const style = config.style || 'fill', // 'fill' or 'line'
        shape = config.shape || 'linear', // 'circular' or 'linear'
        color = config.color || 0,
        bgColor = config.bgColor,
        lineWidth = config.lineWidth || 1,
        percent = config.percent || 1,
        originX = config.x || 0,
        originY = config.y || 0,
        transform = config.transform;

    let canvas = config.canvas,
        width = config.width || (canvas && canvas.width),
        height = config.height || (canvas && canvas.height);

    let ctx = null, currentColor, i, x, y,
        radius, innerRadius, centerX, centerY;

    if (!canvas && !config.context) {
        canvas = document.createElement('canvas');
        width = width || canvas.width;
        height = height || canvas.height;
        canvas.width = width;
        canvas.height = height;
    }

    if (shape === 'circular') {
        radius = config.radius || Math.min(height / 2, width / 2);
        innerRadius = config.innerRadius || radius / 2;
        centerX = originX + width / 2;
        centerY = originY + height / 2;
    }

    ctx = config.context || canvas.getContext('2d');

    function clear() {
        if (bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(originX, originY, width, height);
        } else {
            ctx.clearRect(originX, originY, width, height);
        }

        ctx.lineWidth = lineWidth;

        currentColor = null;

        if (typeof color !== 'function') {
            ctx.strokeStyle = color;
            ctx.beginPath();
        }
    }

    function updateColor(position, length, value) {
        if (typeof color === 'function') {
            const newColor = color(position, length, value);
            if (newColor !== currentColor) {
                currentColor = newColor;
                ctx.stroke();
                ctx.strokeStyle = currentColor;
                ctx.beginPath();
            }
        }
    }

    function getValue(value, position, length) {
        if (typeof transform === 'function') {
            return transform(value, position, length);
        }
        return value;
    }

    function getWaveform(value, length) {
        if (value && typeof value.waveform === 'function') {
            return value.waveform(length);
        }
        if (value) {
            return value;
        }
        if (config.waveform) {
            return config.waveform;
        }
        if (config.sound) {
            return config.sound.waveform(length);
        }
        return null;
    }

    function update(wave) {

        clear();

        if (shape === 'circular') {
            const waveform = getWaveform(wave, 360);
            const length = Math.floor(waveform.length * percent);

            const step = twoPI / length;
            let angle, magnitude, sine, cosine;

            for (i = 0; i < length; i++) {
                const value = getValue(waveform[i], i, length);
                updateColor(i, length, value);

                angle = i * step - halfPI;
                cosine = Math.cos(angle);
                sine = Math.sin(angle);

                if (style === 'fill') {
                    x = centerX + innerRadius * cosine;
                    y = centerY + innerRadius * sine;
                    ctx.moveTo(x, y);
                }

                magnitude = innerRadius + (radius - innerRadius) * value;
                x = centerX + magnitude * cosine;
                y = centerY + magnitude * sine;

                if (style === 'line' && i === 0) {
                    ctx.moveTo(x, y);
                }

                ctx.lineTo(x, y);
            }

            if (style === 'line') {
                ctx.closePath();
            }
        } else {

            const waveform = getWaveform(wave, width);
            let length = Math.min(waveform.length, width - lineWidth / 2);
            length = Math.floor(length * percent);

            for (i = 0; i < length; i++) {
                const value = getValue(waveform[i], i, length);
                updateColor(i, length, value);

                if (style === 'line' && i > 0) {
                    ctx.lineTo(x, y);
                }

                x = originX + i;
                y = originY + height - Math.round(height * value);
                y = Math.floor(Math.min(y, originY + height - lineWidth / 2));

                if (style === 'fill') {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, originY + height);
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();
    }

    update.canvas = canvas;

    if (config.waveform || config.sound) {
        update();
    }

    return update;
}

export default sono.register('waveformer', waveformer, sono.utils);
