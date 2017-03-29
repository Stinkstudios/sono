describe('Sound', () => {
    const sound = new sono.__test.Sound({
        context: sono.context
    });

    it('should have id property', () => {
        expect(sound).to.have.property('id');
        sound.id = 'foo';
        expect(sound.id).to.eql('foo');
    });

    it('should have data property', () => {
        expect(sound).to.have.property('data');
    });

    it('should have expected members (controls)', () => {
        expect(sound.play).to.be.a('function');
        expect(sound.pause).to.be.a('function');
        expect(sound.stop).to.be.a('function');
        expect(sound.volume).to.be.a('number');
        expect(sound.playbackRate).to.be.a('number');
        expect(sono.fade).to.be.a('function');
    });

    it('should have expected members (state)', () => {
        expect(sound.loop).to.be.a('boolean');
        expect(sound.duration).to.be.a('number');
        expect(sound.currentTime).to.be.a('number');
        expect(sound.progress).to.be.a('number');
        expect(sound.playing).to.be.a('boolean');
        expect(sound.paused).to.be.a('boolean');
    });

    it('should have expected members (effects)', () => {
        expect(sound.effects).to.exist;
        expect(sound.effects.add).to.be.a('function');
        expect(sound.effects.remove).to.be.a('function');
        expect(sound.effects.toggle).to.be.a('function');
        expect(sound.effects.removeAll).to.be.a('function');
    });

    it('should have chainable methods', () => {
        const a = sound.play()
            .pause()
            .load({})
            .stop()
            .fade(1)
            .play();

        expect(a).to.be.an('object');
        expect(a.currentTime).to.be.a('number');
    });

    it('should have event emitter', () => {
        expect(sound.on).to.be.a('function');
        expect(sound.off).to.be.a('function');
        expect(sound.once).to.be.a('function');
    });

});
