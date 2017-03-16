import FakeContext from './utils/fake-context';

function getContext() {
    const desiredSampleRate = 44100;

    const Ctx = window.AudioContext || window.webkitAudioContext || FakeContext;

    let ctx = new Ctx();

	// Check if hack is necessary. Only occurs in iOS6+ devices
	// and only when you first boot the iPhone, or play a audio/video
	// with a different sample rate
	// https://github.com/Jam3/ios-safe-audio-context/blob/master/index.js
    if (/(iPhone|iPad)/i.test(navigator.userAgent) && ctx.sampleRate !== desiredSampleRate) {
        const buffer = ctx.createBuffer(1, 1, desiredSampleRate);
        const dummy = ctx.createBufferSource();
        dummy.buffer = buffer;
        dummy.connect(ctx.destination);
        dummy.start(0);
        dummy.disconnect();

        ctx.close(); // dispose old context
        ctx = new Ctx();
    }

	// Handles bug in Safari 9 OSX where AudioContext instance starts in 'suspended' state

    const isSuspended = ctx.state === 'suspended';

    if (isSuspended && typeof ctx.resume === 'function') {
        window.setTimeout(function() {
            ctx.resume();
        }, 1000);
    }

    return ctx;
}

export default getContext();
