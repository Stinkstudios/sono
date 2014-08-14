'use strict';

var Sono = require('../src/sono.js');

describe('Sono API', function() {

	it('should exist', function() {
		expect(Sono).to.be.an('object');
	});

    it('should have context property', function() {
        expect(Sono).to.have.property('context');
    });

    it('should have hasWebAudio bool', function() {
        expect(Sono.hasWebAudio).to.be.a('boolean');
    });

    it('should have isSupported bool', function() {
        expect(Sono.isSupported).to.be.a('boolean');
    });

    it('should have VERSION string', function() {
        expect(Sono.VERSION).to.be.a('string');
    });

    it('should have expected members (add, get)', function() {
        expect(Sono.sound).to.be.a('function');
        expect(Sono.sound.length).to.eql(1);
        expect(Sono.oscillator).to.be.a('function');
        expect(Sono.microphone).to.be.a('function');
        expect(Sono.script).to.be.a('function');
        expect(Sono.get).to.be.a('function');
        expect(Sono.get.length).to.eql(1);
    });

    it('should have expected members (controls)', function() {
        expect(Sono.mute).to.be.a('function');
        expect(Sono.unMute).to.be.a('function');
        expect(Sono.pauseAll).to.be.a('function');
        expect(Sono.resumeAll).to.be.a('function');
        expect(Sono.stopAll).to.be.a('function');
        expect(Sono.play).to.be.a('function');
        expect(Sono.pause).to.be.a('function');
        expect(Sono.stop).to.be.a('function');
        expect(Sono.volume).to.be.a('number');
    });

    it('should have expected members (loading)', function() {
        expect(Sono._initLoader).to.be.a('function');
        expect(Sono.load).to.be.a('function');
        expect(Sono.load.length).to.eql(4);
        expect(Sono.loadArrayBuffer).to.be.a('function');
        expect(Sono.loadAudioElement).to.be.a('function');
        var desc = Object.getOwnPropertyDescriptor(Sono.constructor.prototype, 'loader');
        expect(desc.get).to.be.a('function');
        expect(desc.set).to.not.exist;
        expect(Sono.destroy).to.be.a('function');
    });

    it('should have expected members (support, setup)', function() {
        expect(Sono.createAudioContext).to.be.a('function');

        expect(Sono.canPlay).to.be.an('object');
        expect(Sono.canPlay.ogg).to.be.a('boolean');
        expect(Sono.canPlay.mp3).to.be.a('boolean');
        expect(Sono.canPlay.opus).to.be.a('boolean');
        expect(Sono.canPlay.wav).to.be.a('boolean');
        expect(Sono.canPlay.m4a).to.be.a('boolean');

        expect(Sono.handleTouchlock).to.be.a('function');
        expect(Sono.handleVisibility).to.be.a('function');
        expect(Sono.log).to.be.a('function');
        expect(Sono.create).to.be.an('object');
        expect(Sono.utils).to.be.an('object');
    });

    it('should have get/set volume', function() {
        var desc = Object.getOwnPropertyDescriptor(Sono.constructor.prototype, 'volume');
        expect(desc.get).to.be.a('function');
        expect(desc.set).to.be.a('function');
    });

    it('should have get create', function() {
        var desc = Object.getOwnPropertyDescriptor(Sono.constructor.prototype, 'create');
        expect(desc.get).to.be.a('function');
        expect(desc.set).to.not.exist;
    });

});
