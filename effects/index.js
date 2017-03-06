import sono from '../core/sono';
import analyser from './analyser';
import compressor from './compressor';
import distortion from './distortion';
import echo from './echo';
import filter from './filter';
import flanger from './flanger';
import panner from './panner';
import phaser from './phaser';
import reverb from './reverb';
import script from './script';

// sono.register('convolver', function(impulseResponse) {
//     // impulseResponse is an audio file buffer
//     const node = sono.context.createConvolver();
//     node.buffer = impulseResponse;
//     return node;
// });

// sono.register('delay', function(time) {
//     const node = sono.context.createDelay();
//     if (typeof time !== 'undefined') {
//         node.delayTime.value = time;
//     }
//     return node;
// });

export default {
    analyser,
    compressor,
    distortion,
    echo,
    filter,
    flanger,
    panner,
    phaser,
    reverb,
    script
};
