describe('sono API', function() {

    describe('misc', function() {
        it('should exist', function() {
            expect(sono)
                .to.be.an('object');
        });
        it('should have context property', function() {
            expect(sono)
                .to.have.property('context');
        });
        it('should have hasWebAudio bool', function() {
            expect(sono.hasWebAudio)
                .to.be.a('boolean');
        });
        it('should have isSupported bool', function() {
            expect(sono.isSupported)
                .to.be.a('boolean');
        });
        it('should have VERSION string', function() {
            expect(sono.VERSION)
                .to.be.a('string');
        });
        it('should have log func', function() {
            expect(sono.log)
                .to.be.a('function');
        });
    });

    describe('createSound', function() {
        it('should have expected api', function() {
            expect(sono.createSound)
                .to.be.a('function');
            expect(sono.createSound.length)
                .to.eql(1);
        });
        it('should return new Sound', function() {
            const sound = sono.createSound({
                id: 'newsoundA',
                data: new Audio()
            });
            expect(sound)
                .to.exist;
            expect(sound.id)
                .to.eql('newsoundA');
        });
    });

    describe('destroySound', function() {
        it('should have expected api', function() {
            expect(sono.destroySound)
                .to.be.a('function');
            expect(sono.destroySound.length)
                .to.eql(1);
        });
        it('should destroy existing sound by id', function() {
            sono.createSound({
                id: 'killme',
                data: new Audio()
            });
            expect(sono.getSound('killme'))
                .to.exist;
            sono.destroySound('killme');
            expect(sono.getSound('killme'))
                .to.not.exist;
        });
        it('should destroy existing sound by instance', function() {
            const sound = sono.createSound({
                id: 'killmeagain',
                data: new Audio()
            });
            expect(sound)
                .to.exist;
            sono.destroySound(sound);
            expect(sono.getSound('killmeagain'))
                .to.not.exist;
        });
    });

    describe('getSound', function() {
        it('should have expected api', function() {
            expect(sono.getSound)
                .to.be.a('function');
            expect(sono.getSound.length)
                .to.eql(1);
        });
        it('should return existing sound', function() {
            sono.createSound({
                id: 'yep',
                data: new Audio()
            });
            expect(sono.getSound('yep'))
                .to.exist;
            expect(sono.getSound('yep')
                    .id)
                .to.eql('yep');
        });
        it('should return null for non-existant sound', function() {
            expect(sono.getSound('nope'))
                .to.not.exist;
        });
    });

    describe('controls', function() {
        it('should have expected members', function() {
            expect(sono.mute)
                .to.be.a('function');
            expect(sono.unMute)
                .to.be.a('function');
            expect(sono.pauseAll)
                .to.be.a('function');
            expect(sono.resumeAll)
                .to.be.a('function');
            expect(sono.stopAll)
                .to.be.a('function');
            expect(sono.play)
                .to.be.a('function');
            expect(sono.pause)
                .to.be.a('function');
            expect(sono.stop)
                .to.be.a('function');
            expect(sono.volume)
                .to.be.a('number');
            expect(sono.fade)
                .to.be.a('function');
        });
        it('should have get/set volume', function() {
            const desc = Object.getOwnPropertyDescriptor(sono, 'volume');
            expect(desc.get)
                .to.be.a('function');
            expect(desc.set)
                .to.be.a('function');
        });
    });

    describe('load', function() {
        it('should have expected api', function() {
            expect(sono.load)
                .to.be.a('function');
            expect(sono.load.length)
                .to.eql(1);
        });
    });

    describe('canPlay', function() {
        it('should have expected members', function() {
            expect(sono.canPlay)
                .to.be.an('object');
            expect(sono.canPlay.ogg)
                .to.be.a('boolean');
            expect(sono.canPlay.mp3)
                .to.be.a('boolean');
            expect(sono.canPlay.opus)
                .to.be.a('boolean');
            expect(sono.canPlay.wav)
                .to.be.a('boolean');
            expect(sono.canPlay.m4a)
                .to.be.a('boolean');
        });
    });

    describe('effects', function() {
        it('should have effects module', function() {
            expect(sono.effects)
                .to.exist;
        });
        // it('should have get effect', function() {
        //     var desc = Object.getOwnPropertyDescriptor(sono, 'effect');
        //     expect(desc.get).to.be.a('function');
        //     expect(desc.set).to.not.exist;
        // });
    });

    describe('utils', function() {
        it('should have utils module', function() {
            expect(sono.utils)
                .to.be.an('object');
        });
        // it('should have get utils', function() {
        //     var desc = Object.getOwnPropertyDescriptor(sono.constructor.prototype, 'utils');
        //     expect(desc.get).to.be.a('function');
        //     expect(desc.set).to.not.exist;
        // });
    });

});
