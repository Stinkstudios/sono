import dummy from './utils/dummy';
import FakeContext from './utils/fake-context';
import iOS from './utils/iOS';

const desiredSampleRate = 44100;

const Ctx = window.AudioContext || window.webkitAudioContext || FakeContext;

let context = new Ctx();

if (!context) {
    context = new FakeContext();
}

// Check if hack is necessary. Only occurs in iOS6+ devices
// and only when you first boot the iPhone, or play a audio/video
// with a different sample rate
// https://github.com/Jam3/ios-safe-audio-context/blob/master/index.js
if (iOS && context.sampleRate !== desiredSampleRate) {
    dummy(context);
    context.close(); // dispose old context
    context = new Ctx();
}

// Handles bug in Safari 9 OSX where AudioContext instance starts in 'suspended' state
if (context.state === 'suspended' && typeof context.resume === 'function') {
    window.setTimeout(() => context.resume(), 1000);
}

export default context;
