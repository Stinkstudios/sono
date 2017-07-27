describe('sono API', () => {

    describe('misc', () => {
        it('should exist', () => {
            expect(sono).to.be.an('object');
        });

        it('should have context property', () => {
            expect(sono).to.have.property('context');
        });

        it('should have hasWebAudio bool', () => {
            expect(sono.hasWebAudio).to.be.a('boolean');
        });

        it('should have isSupported bool', () => {
            expect(sono.isSupported).to.be.a('boolean');
        });

        it('should have VERSION string', () => {
            expect(sono.VERSION).to.be.a('string');
        });

        it('should have log func', () => {
            expect(sono.log).to.be.a('function');
        });

        it('should have log playInBackground getter/setter', () => {
            expect(sono.playInBackground).to.be.a('boolean');
        });
    });

    describe('create', () => {
        it('should have expected api', () => {
            expect(sono.create).to.be.a('function');
            expect(sono.create.length).to.eql(1);
        });

        it('should return new Sound', () => {
            const sound = sono.createSound({
                id: 'newsoundA',
                data: new Audio()
            });
            expect(sound).to.exist;
            expect(sound.id).to.eql('newsoundA');
            expect(sono.getSound(sound.id)).to.exist;
        });
    });

    describe('destroy', () => {
        it('should have expected api', () => {
            expect(sono.destroy).to.be.a('function');
            expect(sono.destroy.length).to.eql(1);
        });

        it('should destroy existing sound by id', () => {
            sono.createSound({
                id: 'killme',
                data: new Audio()
            });
            expect(sono.getSound('killme')).to.exist;
            sono.destroy('killme');
            expect(sono.getSound('killme')).to.not.exist;
        });

        it('should destroy existing sound by instance', () => {
            const sound = sono.createSound({
                id: 'killmeagain',
                data: new Audio()
            });
            expect(sound).to.exist;
            sono.destroy(sound);
            expect(sono.getSound('killmeagain')).to.not.exist;
        });
    });

    describe('getSound', () => {
        it('should have expected api', () => {
            expect(sono.getSound).to.be.a('function');
            expect(sono.getSound.length).to.eql(1);
        });

        it('should return existing sound', () => {
            sono.createSound({
                id: 'yep',
                data: new Audio()
            });
            expect(sono.getSound('yep')).to.exist;
            expect(sono.getSound('yep').id).to.eql('yep');
        });

        it('should return null for non-existant sound', () => {
            expect(sono.getSound('nope')).to.not.exist;
        });
    });

    describe('controls', () => {
        it('should have expected members', () => {
            expect(sono.mute).to.be.a('function');
            expect(sono.unMute).to.be.a('function');
            expect(sono.pauseAll).to.be.a('function');
            expect(sono.resumeAll).to.be.a('function');
            expect(sono.stopAll).to.be.a('function');
            expect(sono.play).to.be.a('function');
            expect(sono.pause).to.be.a('function');
            expect(sono.stop).to.be.a('function');
            expect(sono.volume).to.be.a('number');
            expect(sono.fade).to.be.a('function');
        });

        it('should have get/set volume', () => {
            const desc = Object.getOwnPropertyDescriptor(sono, 'volume');
            expect(desc.get).to.be.a('function');
            expect(desc.set).to.be.a('function');
        });
    });

    describe('load', () => {
        it('should have expected api', () => {
            expect(sono.load).to.be.a('function');
            expect(sono.load.length).to.eql(1);
        });
    });

    describe('canPlay', () => {
        it('should have expected members', () => {
            expect(sono.canPlay).to.be.an('object');
            expect(sono.canPlay.ogg).to.be.a('boolean');
            expect(sono.canPlay.mp3).to.be.a('boolean');
            expect(sono.canPlay.opus).to.be.a('boolean');
            expect(sono.canPlay.wav).to.be.a('boolean');
            expect(sono.canPlay.m4a).to.be.a('boolean');
        });
    });

    describe('effects', () => {
        it('should have effects module', () => {
            expect(sono.effects).to.exist;
        });
    });

    describe('utils', () => {
        it('should have utils module', () => {
            expect(sono.utils).to.be.an('object');
        });
    });

});
