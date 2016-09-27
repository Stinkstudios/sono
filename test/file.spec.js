describe('file', function() {

    const el = document.createElement('audio');
    const file = sono.file;

    it('should get audio type', function() {
        expect(file.isAudioBuffer(el)).to.be.false;
        expect(file.isMediaElement(el)).to.be.true;
    });

    it('should get file extension', function() {
        expect(file.getFileExtension).to.be.a('function');
        expect(file.getFileExtension('audio/foo.ogg')).to.eql('ogg');
        expect(file.getFileExtension('audio/foo.ogg?foo=bar')).to.eql('ogg');
        expect(file.getFileExtension('./audio/foo.ogg')).to.eql('ogg');
        expect(file.getFileExtension('../audio/foo.ogg')).to.eql('ogg');
        expect(file.getFileExtension('../../audio/foo')).to.eql('');
        expect(file.getFileExtension('../../audio/foo.ogg')).to.eql('ogg');
        expect(file.getFileExtension('http://www.example.com/audio/foo.ogg')).to.eql('ogg');
        expect(file.getFileExtension('http://www.example.com/audio/foo.ogg?foo=bar')).to.eql('ogg');
        expect(file.getFileExtension('data:audio/ogg;base64,T2dnUwAC')).to.eql('ogg');
        expect(file.getFileExtension('data:audio/mp3;base64,T2dnUwAC')).to.eql('mp3');
    });

    it('should get file', function() {
        expect(file.extensions).to.be.an('array');
        expect(file.extensions.length).to.be.at.least(1);
        expect(file.getSupportedFile).to.be.a('function');
        expect(file.getSupportedFile(['audio/foo.ogg', 'audio/foo.mp3'])).to.be.a('string');
        expect(file.getSupportedFile({foo: 'audio/foo.ogg', bar: 'audio/foo.mp3'})).to.be.a('string');
        expect(file.getSupportedFile('audio/foo.ogg')).to.be.a('string');
        expect(file.getSupportedFile('data:audio/ogg;base64,T2dnUwAC')).to.be.a('string');
    });

    it('should have canPlay hash', function() {
        expect(file.canPlay).to.be.an('object');
        expect(file.canPlay.ogg).to.be.a('boolean');
        expect(file.canPlay.mp3).to.be.a('boolean');
        expect(file.canPlay.opus).to.be.a('boolean');
        expect(file.canPlay.wav).to.be.a('boolean');
        expect(file.canPlay.m4a).to.be.a('boolean');
    });

});
