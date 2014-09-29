'use strict';

var Sono = require('../src/sono.js');

describe('Sono loader', function() {

    describe('single', function() {
        var sound;
        var single = [
            'http://ianmcgregor.me/prototypes/assets/audio/hit.ogg',
            'http://ianmcgregor.me/prototypes/assets/audio/hit.mp3'
        ];

        beforeEach(function(done) {
            Sono.load(single, function(loadedSound) {
                sound = loadedSound;
                done();
            });
        });

        it('should have loaded sound', function(){
            expect(sound).to.exist;
            expect(Sono.getById(sound.id)).to.exist;
            expect(sound.loader).to.exist;
            expect(sound.loader.data).to.exist;
            expect(sound.play).to.be.a('function');
            Sono.destroy(sound);
            expect(Sono.getById(sound.id)).to.not.exist;
        });
    });

    describe('multiple', function() {
        var sounds;
        var multiple = [
            {
                id: 'bullet',
                url: [
                    'http://ianmcgregor.me/prototypes/assets/audio/bullet.ogg',
                    'http://ianmcgregor.me/prototypes/assets/audio/bullet.mp3'
                ]
            },
            {
                id: 'collect',
                url: [
                    'http://ianmcgregor.me/prototypes/assets/audio/collect.ogg',
                    'http://ianmcgregor.me/prototypes/assets/audio/collect.mp3'
                ]
            }
        ];

        beforeEach(function(done) {
            Sono.load(multiple, function(loadedSounds) {
                sounds = loadedSounds;
                done();
            });
        });

        it('should have loaded sound', function(){
            expect(sounds).to.exist;
            expect(sounds.length).to.eql(2);
            expect(Sono.getById(multiple[0].id)).to.exist;
            expect(Sono.getById(multiple[1].id)).to.exist;
            expect(sounds[0].play).to.be.a('function');
        });
    });

});
