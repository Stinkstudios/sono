describe('sono loader', () => {
    describe('single', () => {
        let sound = null;
        let progress = 0;
        let error = null;

        beforeEach((done) => {
            sono.load({
                url: [
                    '/base/test/audio/blip.ogg',
                    '/base/test/audio/blip.mp3'
                ],
                onComplete: loadedSound => {
                    sound = loadedSound;
                    sound.id = 'single';
                    done();
                },
                onProgress: p => {
                    progress = p;
                },
                onError: err => {
                    error = err;
                }
            });
        });

        afterEach(() => {
            sono.destroy(sound);
        });

        it('should have loaded sound', () => {
            expect(sound).to.exist;
            expect(progress).to.eql(1);
            expect(error).to.be.a('null');
            expect(sono.getSound(sound.id)).to.exist;
            expect(sound.loader).to.exist;
            expect(sound.loader.data).to.exist;
            expect(sound.play).to.be.a('function');
        });
    });

    describe('multiple', () => {
        let sounds = null;
        let progress = 0;
        let error = null;

        const multiple = [{
            id: 'blip',
            url: [
                '/base/test/audio/blip.ogg',
                '/base/test/audio/blip.mp3'
            ]
        }, {
            id: 'bloop',
            url: [
                '/base/test/audio/bloop.ogg',
                '/base/test/audio/bloop.mp3'
            ]
        }];

        beforeEach((done) => {
            sono.load({
                url: multiple,
                onComplete: loadedSounds => {
                    sounds = loadedSounds;
                    done();
                },
                onProgress: p => {
                    progress = p;
                },
                onError: err => {
                    error = err;
                }
            });
        });

        afterEach(() => {
            sono.destroy(sounds[0]);
            sono.destroy(sounds[1]);
        });

        it('should have loaded sound', () => {
            expect(sounds).to.exist;
            expect(progress).to.eql(1);
            expect(error).to.be.a('null');
            expect(sounds.length).to.eql(2);
            expect(sono.getSound(multiple[0].id).id).to.eql(multiple[0].id);
            expect(sono.getSound(multiple[1].id).id).to.eql(multiple[1].id);
            expect(sounds[0].play).to.be.a('function');
        });
    });

    describe('audio element', () => {
        let sound = null;
        let progress = 0;
        let error = null;

        const el = [
            '/base/test/audio/blip.ogg',
            '/base/test/audio/blip.mp3'
        ];

        beforeEach((done) => {
            sono.load({
                url: el,
                onComplete: loadedSound => {
                    sound = loadedSound;
                    sound.id = 'audioEl';
                    done();
                },
                onProgress: p => {
                    progress = p;
                },
                onError: err => {
                    error = err;
                },
                asMediaElement: true
            });
        });

        afterEach(() => {
            sono.destroy(sound);
        });

        it('should have loaded sound', () => {
            expect(sound).to.exist;
            expect(progress).to.eql(1);
            expect(error).to.be.a('null');
            expect(sono.get(sound.id)).to.exist;
            expect(sound.loader).to.exist;
            expect(sound.loader.data).to.exist;
            expect(sound.play).to.be.a('function');
            expect(sound.data).to.be.an.instanceof(window.HTMLMediaElement);
        });
    });

    describe('audio config', () => {
        let sound = null;
        let progress = 0;
        let error = null;

        beforeEach((done) => {
            sono.load({
                id: 'blip',
                url: [
                    '/base/test/audio/blip.ogg',
                    '/base/test/audio/blip.mp3'
                ],
                loop: true,
                volume: 0.5,
                onComplete: loadedSound => {
                    sound = loadedSound;
                    done();
                },
                onProgress: p => {
                    progress = p;
                },
                onError: err => {
                    error = err;
                }
            });
        });

        afterEach(() => {
            sono.destroy(sound);
        });

        it('should have loaded sound', () => {
            expect(sound).to.exist;
            expect(error).to.be.a('null');
            expect(progress).to.eql(1);
            expect(sono.get(sound.id)).to.exist;
            expect(sound.loader).to.exist;
            expect(sound.loader.data).to.exist;
            expect(sound.play).to.be.a('function');
        });

        it('should have set properties', () => {
            expect(sound.id).to.eql('blip');
            expect(sound.loop).to.be.true;
            expect(sound.volume).to.eql(0.5);
        });
    });

    describe('error with single', () => {
        let sound = null;
        let progress = 0;
        let error = null;

        beforeEach((done) => {
            sono.load({
                url: [
                    '/base/test/audio/bad.ogg',
                    '/base/test/audio/bad.mp3'
                ],
                onComplete: loadedSound => {
                    sound = loadedSound;
                    done();
                },
                onProgress: p => {
                    progress = p;
                },
                onError: err => {
                    error = err;
                    done();
                }
            });
        });

        it('should have caught error', () => {
            expect(error).to.exist;
            expect(progress).to.eql(0);
            expect(sound).to.be.a('null');
        });
    });

    describe('error with multiple', () => {
        let sounds = null;
        let progress = 0;
        let error = null;

        const multiple = [{
            id: 'bad1',
            url: [
                '/base/test/audio/bad_mul_1.ogg',
                '/base/test/audio/bad_mul_1.mp3'
            ]
        }, {
            id: 'bad2',
            url: [
                '/base/test/audio/bad_mul_2.ogg',
                '/base/test/audio/bad_mul_2.mp3'
            ]
        }];

        beforeEach((done) => {
            sono.load({
                url: multiple,
                onComplete: loadedSounds => {
                    sounds = loadedSounds;
                },
                onProgress: p => {
                    progress = p;
                },
                onError: err => {
                    error = err;
                    done();
                }
            });
        });

        it('should have caught error', () => {
            expect(error).to.exist;
            expect(progress).to.eql(0);
            expect(sounds).to.be.a('null');
        });
    });

    describe('error with audio element', () => {
        let sound = null;
        let progress = 0;
        let error = null;

        beforeEach((done) => {
            sono.load({
                url: [
                    '/base/test/audio/bad_el.ogg',
                    '/base/test/audio/bad_el.mp3'
                ],
                onComplete: loadedSound => {
                    sound = loadedSound;
                },
                onProgress: p => {
                    progress = p;
                },
                onError: err => {
                    error = err;
                    done();
                },
                asMediaElement: true
            });
        });

        it('should have caught error', () => {
            expect(error).to.exist;
            expect(progress).to.eql(0);
            expect(sound).to.be.a('null');
        });
    });
});
