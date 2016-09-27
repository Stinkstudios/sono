import Analyser from './effect/analyser';
import Distortion from './effect/distortion';
import Echo from './effect/echo';
import FakeContext from './effect/fake-context';
import Filter from './effect/filter';
import Flanger from './effect/flanger';
import Panner from './effect/panner';
import Phaser from './effect/phaser';
import Recorder from './effect/recorder';
import Reverb from './effect/reverb';

export default function Effect(context) {
    context = context || new FakeContext();
    const panning = new Panner(context);

    let api = null,
        destination,
        nodeList = [],
        sourceNode;

    function connect(a, b) {
        //console.log('> connect', (a.name || a.constructor.name), 'to', (b.name || b.constructor.name));

        const output = a._output || a;
        //console.log('> disconnect output: ', (a.name || a.constructor.name));
        output.disconnect();
        //console.log('> connect output: ',(a.name || a.constructor.name), 'to input:', (b.name || b.constructor.name));
        output.connect(b);
    }

    function connectToDestination(node) {
        const l = nodeList.length;
        const lastNode = l ? nodeList[l - 1] : sourceNode;

        if (lastNode) {
            connect(lastNode, node);
        }

        destination = node;
    }

    function updateConnections() {
        if (!sourceNode) {
            return;
        }

        //console.log('updateConnections:', nodeList.length);

        let node,
            prev;

        for (let i = 0; i < nodeList.length; i++) {
            node = nodeList[i];
            //console.log(i, node);
            prev = i === 0 ? sourceNode : nodeList[i - 1];
            connect(prev, node);
        }

        if (destination) {
            connectToDestination(destination);
        }
    }

    function has(node) {
        if (!node) {
            return false;
        }
        return nodeList.indexOf(node) > -1;
    }

    function add(node) {
        if (!node) {
            return null;
        }
        if (has(node)) {
            return node;
        }
        nodeList.push(node);
        updateConnections();
        return node;
    }

    function remove(node) {
        if (!node) {
            return null;
        }
        if (!has(node)) {
            return node;
        }
        const l = nodeList.length;
        for (let i = 0; i < l; i++) {
            if (node === nodeList[i]) {
                nodeList.splice(i, 1);
                break;
            }
        }
        const output = node._output || node;
        output.disconnect();
        updateConnections();
        return node;
    }

    function toggle(node, force) {
        force = !!force;
        const hasNode = has(node);
        if (arguments.length > 1 && hasNode === force) {
            return api;
        }
        if (hasNode) {
            remove(node);
        } else {
            add(node);
        }
        return api;
    }

    function removeAll() {
        while (nodeList.length) {
            nodeList.pop()
                .disconnect();
        }
        updateConnections();
        return api;
    }

    function destroy() {
        removeAll();
        context = null;
        destination = null;
        nodeList = [];
        if (sourceNode) {
            sourceNode.disconnect();
        }
        sourceNode = null;
    }

    /*
     * Effects
     */

    function analyser(config) {
        return add(new Analyser(context, config));
    }

    // lowers the volume of the loudest parts of the signal and raises the volume of the softest parts
    function compressor(options) {
        const node = context.createDynamicsCompressor();

        node.update = function(config) {
            // min decibels to start compressing at from -100 to 0
            node.threshold.value = typeof config.threshold !== 'undefined' ? config.threshold : -24;
            // decibel value to start curve to compressed value from 0 to 40
            node.knee.value = typeof config.knee !== 'undefined' ? config.knee : 30;
            // amount of change per decibel from 1 to 20
            node.ratio.value = typeof config.ratio !== 'undefined' ? config.ratio : 12;
            // gain reduction currently applied by compressor from -20 to 0
            // node.reduction.value = typeof config.reduction !== 'undefined' ? config.reduction : -10;)
            // seconds to reduce gain by 10db from 0 to 1 - how quickly signal adapted when volume increased
            node.attack.value = typeof config.attack !== 'undefined' ? config.attack : 0.0003;
            // seconds to increase gain by 10db from 0 to 1 - how quickly signal adapted when volume redcuced
            node.release.value = typeof config.release !== 'undefined' ? config.release : 0.25;
        };

        node.update(options || {});

        return add(node);
    }

    function convolver(impulseResponse) {
        // impulseResponse is an audio file buffer
        const node = context.createConvolver();
        node.buffer = impulseResponse;
        return add(node);
    }

    function delay(time) {
        const node = context.createDelay();
        if (typeof time !== 'undefined') {
            node.delayTime.value = time;
        }
        return add(node);
    }

    function echo(config) {
        return add(new Echo(context, config));
    }

    function distortion(amount) {
        // Float32Array defining curve (values are interpolated)
        //node.curve
        // up-sample before applying curve for better resolution result 'none', '2x' or '4x'
        //node.oversample = '2x';
        return add(new Distortion(context, amount));
    }

    function filter(type, frequency, q, gain) {
        return add(new Filter(context, {type, frequency, q, gain}));
    }

    function lowpass(frequency, peak) {
        return filter('lowpass', {frequency, q: peak});
    }

    function highpass(frequency, peak) {
        return filter('highpass', {frequency, q: peak});
    }

    function bandpass(frequency, width) {
        return filter('bandpass', {frequency, q: width});
    }

    function lowshelf(frequency, gain) {
        return filter('lowshelf', {frequency, q: 0, gain});
    }

    function highshelf(frequency, gain) {
        return filter('highshelf', {frequency, q: 0, gain});
    }

    function peaking(frequency, width, gain) {
        return filter('peaking', {frequency, q: width, gain});
    }

    function notch(frequency, width, gain) {
        return filter('notch', {frequency, q: width, gain});
    }

    function allpass(frequency, sharpness) {
        return filter('allpass', {frequency, q: sharpness});
    }

    function flanger(config) {
        return add(new Flanger(context, config));
    }

    function gainNode(value) {
        const node = context.createGain();
        if (typeof value !== 'undefined') {
            node.gain.value = value;
        }
        return node;
    }

    function panner() {
        return add(new Panner(context));
    }

    function phaser(config) {
        return add(new Phaser(context, config));
    }

    function recorder(passThrough) {
        return add(new Recorder(context, passThrough));
    }

    function reverb(seconds, decay, reverse) {
        return add(new Reverb(context, seconds, decay, reverse));
    }

    function script(config = {}) {
        // bufferSize 256 - 16384 (pow 2)
        const bufferSize = config.bufferSize || 1024;
        const inputChannels = typeof config.inputChannels === 'undefined' ? 0 : config.inputChannels;
        const outputChannels = typeof config.outputChannels === 'undefined' ? 1 : config.outputChannels;

        const node = context.createScriptProcessor(bufferSize, inputChannels, outputChannels);

        const thisArg = config.thisArg || config.context || node;
        const callback = config.callback || function() {};

        // available props:
        /*
        event.inputBuffer
        event.outputBuffer
        event.playbackTime
        */
        // Example: generate noise
        /*
        const output = event.outputBuffer.getChannelData(0);
        const l = output.length;
        for (let i = 0; i < l; i++) {
            output[i] = Math.random();
        }
        */
        node.onaudioprocess = callback.bind(thisArg);

        return add(node);
    }

    function setSource(node) {
        sourceNode = node;
        updateConnections();
        return node;
    }

    function setDestination(node) {
        connectToDestination(node);
        return node;
    }

    //

    api = {
        context,
        nodeList,
        panning,

        has,
        add,
        remove,
        toggle,
        removeAll,
        destroy,
        setSource,
        setDestination,

        analyser,
        compressor,
        convolver,
        delay,
        echo,
        distortion,
        filter,
        lowpass,
        highpass,
        bandpass,
        lowshelf,
        highshelf,
        peaking,
        notch,
        allpass,
        flanger,
        gain: gainNode,
        panner,
        phaser,
        recorder,
        reverb,
        script
    };

    return Object.freeze(api);
}
