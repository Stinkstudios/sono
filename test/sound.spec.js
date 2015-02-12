'use strict';

var Sono = require('../src/sono.js');
var Sound = require('../src/lib/sound.js');

describe('Sound', function() {
    var sound = new Sound(Sono.context);

    it('should have expected members (id, setdata)', function() {
        // expect(sound).to.have.property('id');
        var id = Object.getOwnPropertyDescriptor(sound, 'id');
        expect(id.get).to.be.a('function');
        expect(id.set).to.be.a('function');
        var data = Object.getOwnPropertyDescriptor(sound, 'data');
        expect(data.get).to.be.a('function');
        expect(data.set).to.be.a('function');
    });

    it('should have expected members (controls)', function() {
        expect(sound.play).to.be.a('function');
        expect(sound.pause).to.be.a('function');
        expect(sound.stop).to.be.a('function');
        expect(sound.volume).to.be.a('number');
        expect(sound.playbackRate).to.be.a('number');
        expect(Sono.fade).to.be.a('function');
    });

    it('should have expected members (state)', function() {
        expect(sound.loop).to.be.a('boolean');
        expect(sound.duration).to.be.a('number');
        expect(sound.currentTime).to.be.a('number');
        expect(sound.progress).to.be.a('number');
        expect(sound.playing).to.be.a('boolean');
        expect(sound.paused).to.be.a('boolean');
    });

    it('should have expected members (effects)', function() {
        expect(sound.effect).to.be.an('object');
        expect(sound.effect.setSource).to.be.a('function');
        expect(sound.effect.setDestination).to.be.a('function');
        expect(sound.effect.add).to.be.a('function');
        expect(sound.effect.remove).to.be.a('function');
    });

    it('should have chainable methods', function() {
        var a = sound.play().pause().load({}).stop().fade().play();
        expect(a).to.be.an('object');
        expect(a.currentTime).to.be.a('number');
    });

    it('should have event emitter', function() {
        expect(sound.on).to.be.a('function');
        expect(sound.off).to.be.a('function');
        expect(sound.once).to.be.a('function');
    });

});
