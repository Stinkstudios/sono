'use strict';

//var Sono = require('../src/sono.js');
var Support = require('../src/lib/support.js');

describe('Support', function() {

    var support = new Support();

    it('should get file extension', function() {
        expect(support.getFileExtension).to.be.a('function');
        expect(support.getFileExtension('audio/foo.ogg')).to.eql('ogg');
        expect(support.getFileExtension('audio/foo.ogg?foo=bar')).to.eql('ogg');
        expect(support.getFileExtension('./audio/foo.ogg')).to.eql('ogg');
        expect(support.getFileExtension('../audio/foo.ogg')).to.eql('ogg');
        expect(support.getFileExtension('../../audio/foo')).to.eql('');
        expect(support.getFileExtension('../../audio/foo.ogg')).to.eql('ogg');
        expect(support.getFileExtension('http://www.example.com/audio/foo.ogg')).to.eql('ogg');
        expect(support.getFileExtension('http://www.example.com/audio/foo.ogg?foo=bar')).to.eql('ogg');
    });

    it('should get supported file', function() {
        expect(support.extensions).to.be.an('array');
        expect(support.extensions.length).to.be.at.least(1);
        expect(support.getSupportedFile).to.be.a('function');
        expect(support.getSupportedFile(['audio/foo.ogg', 'audio/foo.mp3'])).to.be.a('string');
        expect(support.getSupportedFile({foo:'audio/foo.ogg', bar:'audio/foo.mp3'})).to.be.a('string');
        expect(support.getSupportedFile('audio/foo.ogg')).to.be.a('string');
    });

    it('should have canPlay hash', function() {
        expect(support.canPlay).to.be.an('object');
        expect(support.canPlay.ogg).to.be.a('boolean');
        expect(support.canPlay.mp3).to.be.a('boolean');
        expect(support.canPlay.opus).to.be.a('boolean');
        expect(support.canPlay.wav).to.be.a('boolean');
        expect(support.canPlay.m4a).to.be.a('boolean');
    });
});
