'use strict';

var Sono = require('../src/sono.js');
var Sound = require('../src/lib/sound.js');

describe('Sound', function() {
    var sound = new Sound(Sono.context);

    it('should have expected members (id, setdata)', function() {
        expect(sound).to.have.property('id');
        expect(sound.setData).to.be.a('function');
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
        expect(sound.node).to.be.an('object');
        expect(sound.node.setSource).to.be.a('function');
        expect(sound.node.setDestination).to.be.a('function');
        expect(sound.node.add).to.be.a('function');
        expect(sound.node.remove).to.be.a('function');
    });

    it('should have chainable methods', function() {
        expect(sound.setData()).to.be.an.instanceof(Sound);
        expect(sound.play()).to.be.an.instanceof(Sound);
        expect(sound.pause()).to.be.an.instanceof(Sound);
        expect(sound.stop()).to.be.an.instanceof(Sound);
        expect(sound.onEnded()).to.be.an.instanceof(Sound);
        expect(sound.setData().onEnded(function(){}).play()).to.be.an.instanceof(Sound);
    });

});
