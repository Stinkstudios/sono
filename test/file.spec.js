'use strict';

var File = require('../src/lib/utils/file.js');

describe('File', function() {

    var el = document.createElement('audio');

    it('should get audio type', function() {
        expect(File.isAudioBuffer(el)).to.be.false;
        expect(File.isMediaElement(el)).to.be.true;
    });

    it('should get file extension', function() {
        expect(File.getFileExtension).to.be.a('function');
        expect(File.getFileExtension('audio/foo.ogg')).to.eql('ogg');
        expect(File.getFileExtension('audio/foo.ogg?foo=bar')).to.eql('ogg');
        expect(File.getFileExtension('./audio/foo.ogg')).to.eql('ogg');
        expect(File.getFileExtension('../audio/foo.ogg')).to.eql('ogg');
        expect(File.getFileExtension('../../audio/foo')).to.eql('');
        expect(File.getFileExtension('../../audio/foo.ogg')).to.eql('ogg');
        expect(File.getFileExtension('http://www.example.com/audio/foo.ogg')).to.eql('ogg');
        expect(File.getFileExtension('http://www.example.com/audio/foo.ogg?foo=bar')).to.eql('ogg');
    });

    it('should get file', function() {
        expect(File.extensions).to.be.an('array');
        expect(File.extensions.length).to.be.at.least(1);
        expect(File.getSupportedFile).to.be.a('function');
        expect(File.getSupportedFile(['audio/foo.ogg', 'audio/foo.mp3'])).to.be.a('string');
        expect(File.getSupportedFile({foo:'audio/foo.ogg', bar:'audio/foo.mp3'})).to.be.a('string');
        expect(File.getSupportedFile('audio/foo.ogg')).to.be.a('string');
    });

    it('should have canPlay hash', function() {
        expect(File.canPlay).to.be.an('object');
        expect(File.canPlay.ogg).to.be.a('boolean');
        expect(File.canPlay.mp3).to.be.a('boolean');
        expect(File.canPlay.opus).to.be.a('boolean');
        expect(File.canPlay.wav).to.be.a('boolean');
        expect(File.canPlay.m4a).to.be.a('boolean');
    });

});
