describe('seek', () => {

    let sound = null;

    describe('after load', () => {
        const config = {
            id: 'foo',
            url: '/base/test/audio/long.ogg'
        };
        beforeEach((done) => {
            sound = sono.create(config)
                .on('error', (snd, err) => console.error('error', err, snd))
                .on('loaded', () => console.log('loaded'))
                .on('ready', () => done());
        });

        afterEach(() => {
            sono.destroy(sound);
        });

        it('should set currentTime to 1', () => {
            sound.currentTime = 1;
            expect(sound.currentTime).to.eql(1);
        });

        it('should set seek to 1', () => {
            sound.seek(1);
            expect(sound.currentTime).to.eql(1);
        });

        it('should set currentTime to 0', () => {
            sound.currentTime = 0;
            expect(sound.currentTime).to.eql(0);
        });

        it('should not auto play after seek', (done) => {
            sound.currentTime = 1;
            setTimeout(() => {
                expect(sound.currentTime).to.eql(1);
                expect(sound.playing).to.be.false;
                done();
            }, 500);
        });

        it('should jump to 1 and continue playing', (done) => {
            expect(sound.currentTime).to.eql(0);
            sound.play();
            sound.currentTime = 1;
            setTimeout(() => {
                expect(sound.playing).to.be.true;
                expect(sound.currentTime).to.be.above(1);
                done();
            }, 500);
        });
    });

    describe('before load', () => {
        const config = {
            id: 'foo',
            url: '/base/test/audio/long.ogg',
            deferLoad: true
        };
        beforeEach((done) => {
            sound = sono.create(config)
                .on('error', (snd, err) => console.error('error', err, snd));
            done();
        });

        afterEach(() => {
            sono.destroy(sound);
        });

        it('should set currentTime to 1', () => {
            sound.currentTime = 1;
            expect(sound.currentTime).to.eql(1);
        });

        it('should set seek to 1', () => {
            sound.seek(1);
            expect(sound.currentTime).to.eql(1);
        });

        it('should set currentTime to 0', () => {
            sound.currentTime = 0;
            expect(sound.currentTime).to.eql(0);
        });

        it('should start from seeked time when loaded', (done) => {
            sound.currentTime = 1;
            sound.on('play', () => {
                expect(sound.currentTime).to.be.at.least(1);
                done();
            });
            sound.play();
        });
    });
});
