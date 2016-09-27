describe('sono playback', function() {
    this.timeout(5000);

    describe('create', function() {
        const config = {
            id: 'foo',
            url: [
                window.baseURL + 'bullet.ogg',
                window.baseURL + 'bullet.mp3'
            ]
        };

        var sound;

        beforeEach(function(done) {
            sound = sono.createSound(config);
            sound.on('ended', function() {
                done();
            });
            sound.play();
        });

        afterEach(function() {
            sono.destroySound(sound.id);
        });

        it('should get ended callback', function() {
            expect(sound)
                .to.exist;
        });
    });

    describe('play and end', function() {
        var sound,
            ended = false;

        beforeEach(function(done) {
            function onComplete(loadedSound) {
                sound = loadedSound;
                sound.on('ended', function() {
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
                onComplete: onComplete
            });
        });

        afterEach(function() {
            sono.destroySound(sound.id);
        });

        it('should get ended callback', function() {
            expect(sound)
                .to.exist;
            expect(ended)
                .to.be.true;
        });
    });

    describe('play when ready', function() {
        var sound,
            ended = false;

        beforeEach(function(done) {
            sound = sono.createSound({
                url: [
                    window.baseURL + 'select.ogg',
                    window.baseURL + 'select.mp3'
                ]
            })
            .on('ended', function() {
                ended = true;
                done();
            })
            .play(0.1, 0.1);
        });

        afterEach(function() {
            sono.destroySound(sound);
        });

        it('should have played', function() {
            expect(sound)
                .to.exist;
            expect(ended)
                .to.be.true;
        });
    });

    // Firefox 35 and less has a bug where audio param ramping does not change the readable value in the param itself
    // Fading still audibly affects the sound, but the value is untouched
    // if (navigator.userAgent.toLowerCase()
    //     .indexOf('firefox') > -1) {
    //     return;
    // }

    // describe('fade master', function() {
    //     beforeEach(function(done) {
    //         setTimeout(function() {
    //             console.log('sono.volume 2:', sono.volume);
    //             done();
    //         }, 600);
    //     });
    //     afterEach(function() {
    //         sono.volume = 1;
    //     });
    //
    //     sono.volume = 1;
    //     sono.fade(0, 0.2);
    //
    //     it('should have faded to zero volume', function() {
    //         console.log('sono.volume:', sono.volume);
    //         expect(sono.volume)
    //             .to.eql(0);
    //     });
    //
    // });

    // describe('fade sound', function() {
    //
    //     var sound;
    //
    //     beforeEach(function(done) {
    //         sound = sono.createSound({
    //                 type: 'sine'
    //             })
    //             .play()
    //             .fade(0, 0.2);
    //         setTimeout(function() {
    //             done();
    //         }, 500);
    //     });
    //
    //     it('should have faded to zero volume', function() {
    //         expect(sound.volume)
    //             .to.eql(0);
    //     });
    //
    // });

});
