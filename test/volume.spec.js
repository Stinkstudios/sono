describe('volume', () => {

    describe('sound', () => {
        const config = {
            id: 'volume-test',
            url: [
                '/base/test/audio/blip.ogg',
                '/base/test/audio/blip.mp3'
            ],
            volume: 0.8
        };

        let sound;

        beforeEach((done) => {
            sound = sono.create(config)
                .on('error', (s, err) => console.error('error', err, s))
                .on('loaded', () => console.log('loaded'))
                .on('ready', () => console.log('ready'))
                .on('play', () => console.log('play'))
                .on('ended', () => done());
            sound.play();
        });

        afterEach(() => {
            sono.destroy(sound.id);
        });

        it('should get initial volume', () => {
            expect(sound).to.exist;
            expect(Math.round(sound.volume * 100)).to.eql(80);
        });

        it('should change volume', () => {
            sound.volume = 0.5;
            expect(Math.round(sound.volume * 100)).to.eql(50);
        });

        it('should clamp value', () => {
            sound.volume = 2;
            expect(sound.volume).to.eql(1);
            sound.volume = -1;
            expect(sound.volume).to.eql(0);
        });
    });

});
