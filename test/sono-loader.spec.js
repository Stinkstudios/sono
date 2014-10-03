'use strict';

var Sono = require('../src/sono.js');

describe('Sono loader', function() {

    describe('single', function() {
        var sound,
            progress = 0;

        beforeEach(function(done) {
            Sono.load({
                url: [
                    'http://ianmcgregor.me/prototypes/assets/audio/hit.ogg',
                    'http://ianmcgregor.me/prototypes/assets/audio/hit.mp3'
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

        it('should have loaded sound', function(){
            expect(sound).to.exist;
            expect(progress).to.eql(1);
            expect(Sono.getSound(sound.id)).to.exist;
            expect(sound.loader).to.exist;
            expect(sound.loader.data).to.exist;
            expect(sound.play).to.be.a('function');
            Sono.destroySound(sound);
            expect(Sono.getSound(sound.id)).to.not.exist;
        });
    });

    describe('multiple', function() {
        var sounds,
            progress = 0,
            multiple = [
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
            Sono.load({
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

        it('should have loaded sound', function(){
            expect(sounds).to.exist;
            expect(progress).to.eql(1);
            expect(sounds.length).to.eql(2);
            expect(Sono.getSound(multiple[0].id).id).to.eql(multiple[0].id);
            expect(Sono.getSound(multiple[1].id).id).to.eql(multiple[1].id);
            expect(sounds[0].play).to.be.a('function');
            Sono.destroySound(sounds[0]);
            Sono.destroySound(sounds[1]);
        });
    });

    describe('audio element', function() {
        var sound,
            progress = 0,
            el = [
                'http://ianmcgregor.me/prototypes/assets/audio/select.ogg',
                'http://ianmcgregor.me/prototypes/assets/audio/select.mp3'
            ];

        beforeEach(function(done) {
            var self = this;
            Sono.load({
                url: el,
                onComplete: function(loadedSound) {
                    sound = loadedSound;
                    sound.id = 'audioEl';
                    done();
                },
                onProgress: function(p) {
                    progress = p;
                },
                context: self,
                asMediaElement: true
            });
        });

        it('should have loaded sound', function(){
            expect(sound).to.exist;
            expect(progress).to.eql(1);
            expect(Sono.getSound(sound.id)).to.exist;
            expect(sound.loader).to.exist;
            expect(sound.loader.data).to.exist;
            expect(sound.play).to.be.a('function');
            expect(sound.data).to.be.an.instanceof(window.HTMLMediaElement);
            Sono.destroySound(sound);
            expect(Sono.getSound(sound.id)).to.not.exist;
        });
    });

    describe('audio config', function() {
        var sound,
            progress = 0;

        beforeEach(function(done) {
            Sono.load({
                id: 'hit',
                url: [
                    'http://ianmcgregor.me/prototypes/assets/audio/hit.ogg',
                    'http://ianmcgregor.me/prototypes/assets/audio/hit.mp3'
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

        it('should have loaded sound', function(){
            expect(sound).to.exist;
            expect(progress).to.eql(1);
            expect(Sono.getSound(sound.id)).to.exist;
            expect(sound.id).to.eql('hit');
            expect(sound.loop).to.be.true;
            expect(sound.volume).to.eql(0.5);
            expect(sound.loader).to.exist;
            expect(sound.loader.data).to.exist;
            expect(sound.play).to.be.a('function');
            Sono.destroySound(sound);
            expect(Sono.getSound(sound.id)).to.not.exist;
        });
    });

});
