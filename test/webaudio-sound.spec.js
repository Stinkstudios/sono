'use strict';

var Sono = require('../src/sono.js');
var WebAudioSound = require('../src/lib/webaudio-sound.js');

describe('WebAudio Sound', function() {
    var sound = new WebAudioSound();

    it('should have expected API', function() {
        expect(sound).to.have.property('name');
        expect(sound.add).to.be.a('function');

        expect(sound.play).to.be.a('function');
        expect(sound.pause).to.be.a('function');
        expect(sound.stop).to.be.a('function');

        expect(sound.onEnded).to.be.a('function');
        expect(sound.addEndedListener).to.be.a('function');
        expect(sound.removeEndedListener).to.be.a('function');

        //expect(sound.source).to.be.an('object');
        
        expect(sound.loop).to.be.a('boolean');
        expect(sound.duration).to.be.a('number');
        expect(sound.currentTime).to.be.a('number');
        expect(sound.progress).to.be.a('number');
        // DOESN'T HAVE VOLUME expect(sound.volume).to.be.a('number');
        expect(sound.playing).to.be.a('boolean');
        expect(sound.paused).to.be.a('boolean');
    });
});
