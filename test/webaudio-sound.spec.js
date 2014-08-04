'use strict';

var WebAudioSound = require('../src/lib/webaudio-sound.js');

describe('WebAudio Sound', function() {
    var webAudioSound = new WebAudioSound();

    it('should have name prop', function() {
        expect(webAudioSound).to.have.property('name');
    });

    it('should have play fn', function() {
        expect(webAudioSound.play).to.be.a('function');
    });
});
