describe('sono loader', function() {
    this.timeout(5000);

    describe('single', function() {
        var sound,
            progress = 0;

        beforeEach(function(done) {
            sono.load({
                url: [
                    window.baseURL + 'hit.ogg',
                    window.baseURL + 'hit.mp3'
                ],
                onComplete: function(loadedSound) {
                    sound = loadedSound;
                    sound.id = 'single';
                    done();
                },
                onProgress: function(p) {
                    progress = p;
                }
            });
        });

        it('should have loaded sound', function() {
            expect(sound)
                .to.exist;
            expect(progress)
                .to.eql(1);
            expect(sono.getSound(sound.id))
                .to.exist;
            expect(sound.loader)
                .to.exist;
            expect(sound.loader.data)
                .to.exist;
            expect(sound.play)
                .to.be.a('function');
            sono.destroySound(sound);
            expect(sono.getSound(sound.id))
                .to.not.exist;
        });
    });

    describe('multiple', function() {
        var sounds,
            progress = 0,
            multiple = [{
                id: 'bullet',
                url: [
                    window.baseURL + 'bullet.ogg',
                    window.baseURL + 'bullet.mp3'
                ]
            }, {
                id: 'collect',
                url: [
                    window.baseURL + 'collect.ogg',
                    window.baseURL + 'collect.mp3'
                ]
            }];

        beforeEach(function(done) {
            sono.load({
                url: multiple,
                onComplete: function(loadedSounds) {
                    sounds = loadedSounds;
                    done();
                },
                onProgress: function(p) {
                    progress = p;
                }
            });
        });

        it('should have loaded sound', function() {
            expect(sounds)
                .to.exist;
            expect(progress)
                .to.eql(1);
            expect(sounds.length)
                .to.eql(2);
            expect(sono.getSound(multiple[0].id)
                    .id)
                .to.eql(multiple[0].id);
            expect(sono.getSound(multiple[1].id)
                    .id)
                .to.eql(multiple[1].id);
            expect(sounds[0].play)
                .to.be.a('function');
            sono.destroySound(sounds[0]);
            sono.destroySound(sounds[1]);
        });
    });

    describe('audio element', function() {
        var sound,
            progress = 0,
            el = [
                window.baseURL + 'select.ogg',
                window.baseURL + 'select.mp3'
            ];

        beforeEach(function(done) {
            sono.load({
                url: el,
                onComplete: function(loadedSound) {
                    sound = loadedSound;
                    sound.id = 'audioEl';
                    done();
                },
                onProgress: function(p) {
                    progress = p;
                },
                asMediaElement: true
            });
        });

        it('should have loaded sound', function() {
            expect(sound)
                .to.exist;
            expect(progress)
                .to.eql(1);
            expect(sono.getSound(sound.id))
                .to.exist;
            expect(sound.loader)
                .to.exist;
            expect(sound.loader.data)
                .to.exist;
            expect(sound.play)
                .to.be.a('function');
            expect(sound.data)
                .to.be.an.instanceof(window.HTMLMediaElement);
            sono.destroySound(sound);
            expect(sono.getSound(sound.id))
                .to.not.exist;
        });
    });

    describe('audio config', function() {
        var sound,
            progress = 0;

        beforeEach(function(done) {
            sono.load({
                id: 'hit',
                url: [
                    window.baseURL + 'hit.ogg',
                    window.baseURL + 'hit.mp3'
                ],
                loop: true,
                volume: 0.5,
                onComplete: function(loadedSound) {
                    sound = loadedSound;
                    done();
                },
                onProgress: function(p) {
                    progress = p;
                }
            });
        });

        it('should have loaded sound', function() {
            expect(sound)
                .to.exist;
            expect(progress)
                .to.eql(1);
            expect(sono.getSound(sound.id))
                .to.exist;
            expect(sound.id)
                .to.eql('hit');
            expect(sound.loop)
                .to.be.true;
            expect(sound.volume)
                .to.eql(0.5);
            expect(sound.loader)
                .to.exist;
            expect(sound.loader.data)
                .to.exist;
            expect(sound.play)
                .to.be.a('function');
            sono.destroySound(sound);
            expect(sono.getSound(sound.id))
                .to.not.exist;
        });
    });

});
