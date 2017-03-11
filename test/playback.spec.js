describe('sono playback', function() {
    this.timeout(10000);

    describe('create', () => {
        const config = {
            id: 'foo',
            url: [
                window.baseURL + 'bullet.ogg',
                window.baseURL + 'bullet.mp3'
            ]
        };

        let sound;

        beforeEach((done) => {
            sound = sono.create(config);
            sound.on('ended', () => {
                done();
            });
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
            }
            sono.load({
                url: [
                    window.baseURL + 'hit.ogg',
                    window.baseURL + 'hit.mp3'
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
                    window.baseURL + 'select.ogg',
                    window.baseURL + 'select.mp3'
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

});
