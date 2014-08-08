'use strict';

var Sono = require('../src/sono.js');
var Sound = require('../src/lib/sound.js');

describe('Sound', function() {
    var sound = new Sound(Sono.context);

    it('should have expected members (id, add)', function() {
        expect(sound).to.have.property('id');
        expect(sound.add).to.be.a('function');
    });

    it('should have expected members (controls)', function() {
        expect(sound.play).to.be.a('function');
        expect(sound.pause).to.be.a('function');
        expect(sound.stop).to.be.a('function');
        expect(sound.volume).to.be.a('number');
    });

    it('should have expected members (ended callback)', function() {
        expect(sound.onEnded).to.be.a('function');
    });

    it('should have expected members (state)', function() {
        expect(sound.loop).to.be.a('boolean');
        expect(sound.duration).to.be.a('number');
        expect(sound.currentTime).to.be.a('number');
        expect(sound.progress).to.be.a('number');
        expect(sound.playing).to.be.a('boolean');
        expect(sound.paused).to.be.a('boolean');
    });

    it('should have expected members (nodes)', function() {
        expect(sound.addNode).to.be.a('function');
        expect(sound.connectTo).to.be.a('function');
        expect(sound.removeNode).to.be.a('function');
        expect(sound._createSourceNode).to.be.a('function');
        expect(sound._updateConnections).to.be.a('function');
    });

    it('should have chainable methods', function() {
        expect(sound.add()).to.be.an.instanceof(Sound);
        expect(sound.play()).to.be.an.instanceof(Sound);
        expect(sound.pause()).to.be.an.instanceof(Sound);
        expect(sound.stop()).to.be.an.instanceof(Sound);
        expect(sound.onEnded()).to.be.an.instanceof(Sound);
        expect(sound.connectTo()).to.be.an.instanceof(Sound);
        expect(sound.add().onEnded(function(){}).play()).to.be.an.instanceof(Sound);
    });

});
