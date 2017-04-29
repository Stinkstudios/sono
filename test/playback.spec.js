describe('sono playback', () => {

    describe('create', () => {
        const config = {
            id: 'foo',
            url: [
                '/base/test/audio/blip.ogg',
                '/base/test/audio/blip.mp3'
            ]
        };

        let sound;

        beforeEach((done) => {
            sound = sono.create(config);
            sound
                .on('error', (s, err) => console.error('error', err, s))
                .on('loaded', () => console.log('loaded'))
                .on('ready', () => console.log('ready'))
                .on('play', () => console.log('play'))
                .on('ended', () => {
                    done();
                });
            sound.play();

            if (window.isTravis) {
                done();
            }
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
                sound = loadedSound;
                sound
                    .on('error', (s, err) => console.error('error', err, s))
                    .on('loaded', () => console.log('loaded'))
                    .on('ready', () => console.log('ready'))
                    .on('play', () => console.log('play'))
                    .on('ended', () => {
                        ended = true;
                        done();
                    });
                sound.play();

                if (window.isTravis) {
                    ended = true;
                    done();
                }
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

            if (window.isTravis) {
                ended = true;
                done();
            }
        });

        afterEach(() => {
            sono.destroy(sound);
        });

        it('should have played', () => {
            expect(sound).to.exist;
            expect(ended).to.be.true;
        });
    });

});
