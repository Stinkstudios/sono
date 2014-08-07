'use strict';

var Sono = require('../src/sono.js');
var Sound = require('../src/lib/sound.js');

describe('Sound', function() {
    var sound = new Sound(Sono.context);

    it('should have expected API', function() {
        expect(sound).to.have.property('id');
        expect(sound.add).to.be.a('function');

        expect(sound.play).to.be.a('function');
        expect(sound.pause).to.be.a('function');
        expect(sound.stop).to.be.a('function');

        expect(sound.onEnded).to.be.a('function');
        expect(sound.addEndedListener).to.be.a('function');
        expect(sound.removeEndedListener).to.be.a('function');

        expect(sound.loop).to.be.a('boolean');
        expect(sound.duration).to.be.a('number');
        expect(sound.currentTime).to.be.a('number');
        expect(sound.progress).to.be.a('number');
        expect(sound.volume).to.be.a('number');
        expect(sound.playing).to.be.a('boolean');
        expect(sound.paused).to.be.a('boolean');

        expect(sound.createSourceNode).to.be.a('function');
        expect(sound.addNode).to.be.a('function');
        expect(sound.removeNode).to.be.a('function');
        expect(sound.updateConnections).to.be.a('function');
        expect(sound.connectTo).to.be.a('function');
    });
});
