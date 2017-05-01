const extensions = [];
const canPlay = {};

/*
 * Initial tests
 */

const tests = [{
    ext: 'ogg',
    type: 'audio/ogg; codecs="vorbis"'
}, {
    ext: 'mp3',
    type: 'audio/mpeg;'
}, {
    ext: 'opus',
    type: 'audio/ogg; codecs="opus"'
}, {
    ext: 'wav',
    type: 'audio/wav; codecs="1"'
}, {
    ext: 'm4a',
    type: 'audio/x-m4a;'
}, {
    ext: 'm4a',
    type: 'audio/aac;'
}];

let el = document.createElement('audio');
if (el) {
    tests.forEach(function(test) {
        const canPlayType = !!el.canPlayType(test.type);
        if (canPlayType && extensions.indexOf(test.ext) === -1) {
            extensions.push(test.ext);
        }
        canPlay[test.ext] = canPlayType;
    });
    el = null;
}

/*
 * find a supported file
 */

function getFileExtension(url) {
    if (typeof url !== 'string') {
        return '';
    }
    // from DataURL
    if (url.slice(0, 5) === 'data:') {
        const match = url.match(/data:audio\/(ogg|mp3|opus|wav|m4a)/i);
        if (match && match.length > 1) {
            return match[1].toLowerCase();
        }
    }
    // from Standard URL
    url = url.split('?')[0];
    url = url.slice(url.lastIndexOf('/') + 1);

    const a = url.split('.');
    if (a.length === 1 || (a[0] === '' && a.length === 2)) {
        return '';
    }
    return a.pop()
        .toLowerCase();
}

function getSupportedFile(fileNames) {
    let name;

    if (Array.isArray(fileNames)) {
        // if array get the first one that works
        for (let i = 0; i < fileNames.length; i++) {
            name = fileNames[i];
            const ext = getFileExtension(name);
            if (extensions.indexOf(ext) > -1) {
                break;
            }
        }
    } else if (typeof fileNames === 'object') {
        // if not array and is object
        Object.keys(fileNames)
            .some(function(key) {
                name = fileNames[key];
                const ext = getFileExtension(name);
                return extensions.indexOf(ext) > -1;
            });
    }
    // if string just return
    return name || fileNames;
}

/*
 * infer file types
 */

function isAudioBuffer(data) {
    return !!(data &&
        window.AudioBuffer &&
        data instanceof window.AudioBuffer);
}

function isArrayBuffer(data) {
    return !!(data &&
        window.ArrayBuffer &&
        data instanceof window.ArrayBuffer);
}

function isMediaElement(data) {
    return !!(data &&
        window.HTMLMediaElement &&
        data instanceof window.HTMLMediaElement);
}

function isMediaStream(data) {
    return !!(data &&
        typeof data.getAudioTracks === 'function' &&
        data.getAudioTracks()
        .length &&
        window.MediaStreamTrack &&
        data.getAudioTracks()[0] instanceof window.MediaStreamTrack);
}

function isOscillatorType(data) {
    return !!(data && typeof data === 'string' &&
        (data === 'sine' || data === 'square' ||
            data === 'sawtooth' || data === 'triangle'));
}

function isURL(data) {
    return !!(data && typeof data === 'string' &&
        (data.indexOf('.') > -1 || data.slice(0, 5) === 'data:'));
}

function containsURL(config) {
    if (!config || isMediaElement(config)) {
        return false;
    }
    // string, array or object with src/url/data property that is string, array or arraybuffer
    const src = getSrc(config);
    return isURL(src) || isArrayBuffer(src) || (Array.isArray(src) && isURL(src[0]));
}

function getSrc(config) {
    return config.src || config.url || config.data || config;
}

export default {
    canPlay,
    containsURL,
    extensions,
    getFileExtension,
    getSrc,
    getSupportedFile,
    isAudioBuffer,
    isArrayBuffer,
    isMediaElement,
    isMediaStream,
    isOscillatorType,
    isURL
};
