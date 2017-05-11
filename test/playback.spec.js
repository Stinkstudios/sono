describe('sono playback', () => {

    describe('create', () => {
        const config = {
            id: 'playback-create',
            url: [
                '/base/test/audio/blip.ogg',
                '/base/test/audio/blip.mp3'
            ]
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

        it('should get ended callback', () => {
            expect(sound).to.exist;
        });
    });

    describe('play and end', () => {
        let sound,
            ended = false;

        beforeEach((done) => {
            function onComplete(loadedSound) {
                sound = loadedSound
                    .on('error', (s, err) => console.error('error', err, s))
                    .on('loaded', () => console.log('loaded'))
                    .on('ready', () => console.log('ready'))
                    .on('play', () => console.log('play'))
                    .on('ended', () => {
                        ended = true;
                        done();
                    });
                sound.play();
            }
            sono.load({
                url: [
                    '/base/test/audio/blip.ogg',
                    '/base/test/audio/blip.mp3'
                ],
                onComplete: onComplete,
                onError: function(err) {
                    console.error(err);
                }
            });
        });

        afterEach(() => {
            sono.destroy(sound.id);
        });

        it('should get ended callback', () => {
            expect(sound).to.exist;
            expect(ended).to.be.true;
        });
    });

    describe('play when ready', () => {
        let sound,
            ended = false;

        beforeEach((done) => {
            sound = sono.create({
                url: [
                    '/base/test/audio/blip.ogg',
                    '/base/test/audio/blip.mp3'
                ]
            })
            .on('error', (s, err) => console.error('error', err, s))
            .on('loaded', () => console.log('loaded'))
            .on('ready', () => console.log('ready'))
            .on('play', () => console.log('play'))
            .on('ended', () => {
                ended = true;
                done();
            })
            .play(0.1, 0.1);
        });

        afterEach(() => {
            sono.destroy(sound);
        });

        it('should have played', () => {
            expect(sound).to.exist;
            expect(ended).to.be.true;
        });
    });

    describe('currentTime and duration', () => {
        let sound = null;
        let ended = false;

        beforeEach((done) => {
            sound = sono.create({
                url: [
                    '/base/test/audio/blip.ogg',
                    '/base/test/audio/blip.mp3'
                ],
                loop: true
            })
            .on('error', (s, err) => console.error('error', err, s))
            .on('loaded', () => console.log('loaded'))
            .on('ready', () => console.log('ready'))
            .on('play', () => {
                window.setTimeout(() => done(), 1000);
            })
            .on('ended', () => {
                ended = true;
            })
            .play();
        });

        afterEach(() => {
            sono.destroy(sound);
        });

        it('should get duration above 0 and currentTime below duration', () => {
            expect(sound).to.exist;
            expect(sound.playing).to.be.true;
            expect(ended).to.be.false;
            expect(sound.currentTime).to.be.a('number');
            expect(sound.duration).to.be.a('number');
            expect(sound.duration).to.be.above(0);
            expect(sound.currentTime).to.be.below(sound.duration + 0.01);
        });
    });

});
