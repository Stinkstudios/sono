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
        expect(Sono.add).to.be.a('function');
        expect(Sono.get).to.be.a('function');
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
        expect(Sono.initLoader).to.be.a('function');
        expect(Sono.load).to.be.a('function');
        expect(Sono.loadArrayBuffer).to.be.a('function');
        expect(Sono.loadAudioElement).to.be.a('function');
        expect(Sono.loader).to.be.an('object');
        expect(Sono.destroy).to.be.a('function');
    });

    it('should have expected members (support, setup)', function() {
        expect(Sono.createAudioContext).to.be.a('function');
        expect(Sono.getSupportedFile).to.be.a('function');
        expect(Sono.getExtension).to.be.a('function');
        expect(Sono.getSupportedExtensions).to.be.a('function');
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
