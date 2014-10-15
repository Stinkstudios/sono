'use strict';

var Sono = require('../src/sono.js');

describe('Sono API', function() {

	describe('misc', function() {
        it('should exist', function() {
    		expect(Sono).to.be.an('object');
    	});
        it('should have context property', function() {
            expect(Sono).to.have.property('context');
        });
        it('should have get context', function() {
            var desc = Object.getOwnPropertyDescriptor(Sono.constructor.prototype, 'context');
            expect(desc.get).to.be.a('function');
            expect(desc.set).to.not.exist;
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
        it('should have log func', function() {
            expect(Sono.log).to.be.a('function');
        });
    });

    describe('createSound', function() {
        it('should have expected api', function() {
            expect(Sono.createSound).to.be.a('function');
            expect(Sono.createSound.length).to.eql(1);
        });
        it('should return new Sound', function() {
            var sound = Sono.createSound({ id: 'newsoundA', data: new Audio() });
            expect(sound).to.exist;
            expect(sound.id).to.eql('newsoundA');
        });
    });

    describe('destroySound', function() {
        it('should have expected api', function() {
            expect(Sono.destroySound).to.be.a('function');
            expect(Sono.destroySound.length).to.eql(1);
        });
        it('should destroy existing sound by id', function() {
            Sono.createSound({ id: 'killme', data: new Audio() });
            expect(Sono.getSound('killme')).to.exist;
            Sono.destroySound('killme');
            expect(Sono.getSound('killme')).to.not.exist;
        });
        it('should destroy existing sound by instance', function() {
            var sound = Sono.createSound({ id: 'killmeagain', data: new Audio() });
            expect(sound).to.exist;
            Sono.destroySound(sound);
            expect(Sono.getSound('killmeagain')).to.not.exist;
        });
    });

    describe('getSound', function() {
        it('should have expected api', function() {
            expect(Sono.getSound).to.be.a('function');
            expect(Sono.getSound.length).to.eql(1);
        });
        it('should return existing sound', function() {
            Sono.createSound({ id: 'yep', data: new Audio() });
            expect(Sono.getSound('yep')).to.exist;
            expect(Sono.getSound('yep').id).to.eql('yep');
        });
        it('should return null for non-existant sound', function() {
            expect(Sono.getSound('nope')).to.not.exist;
        });
    });

    describe('controls', function() {
        it('should have expected members', function() {
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
        it('should have get/set volume', function() {
            var desc = Object.getOwnPropertyDescriptor(Sono.constructor.prototype, 'volume');
            expect(desc.get).to.be.a('function');
            expect(desc.set).to.be.a('function');
        });
    });

    describe('load', function() {
        it('should have expected api', function() {
            expect(Sono.load).to.be.a('function');
            expect(Sono.load.length).to.eql(1);
        });
    });

    describe('canPlay', function() {
        it('should have expected members', function() {
            expect(Sono.canPlay).to.be.an('object');
            expect(Sono.canPlay.ogg).to.be.a('boolean');
            expect(Sono.canPlay.mp3).to.be.a('boolean');
            expect(Sono.canPlay.opus).to.be.a('boolean');
            expect(Sono.canPlay.wav).to.be.a('boolean');
            expect(Sono.canPlay.m4a).to.be.a('boolean');
        });
    });

    describe('node', function() {
        it('should have effect module', function() {
            expect(Sono.effect).to.be.an('object');
        });
        it('should have get effect', function() {
            var desc = Object.getOwnPropertyDescriptor(Sono.constructor.prototype, 'effect');
            expect(desc.get).to.be.a('function');
            expect(desc.set).to.not.exist;
        });
    });

    describe('utils', function() {
        it('should have utils module', function() {
            expect(Sono.utils).to.be.an('object');
        });
        it('should have get utils', function() {
            var desc = Object.getOwnPropertyDescriptor(Sono.constructor.prototype, 'utils');
            expect(desc.get).to.be.a('function');
            expect(desc.set).to.not.exist;
        });
    });

});
