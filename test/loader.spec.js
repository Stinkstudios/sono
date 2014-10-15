'use strict';

var Sono = require('../src/sono.js');

describe('Sono loader', function() {

    var baseURL = 'http://ianmcgregor.me/prototypes/assets/audio/';

    describe('single', function() {
        var sound,
            progress = 0;

        beforeEach(function(done) {
            Sono.load({
                url: [
                    baseURL + 'hit.ogg',
                    baseURL + 'hit.mp3'
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
                        baseURL + 'bullet.ogg',
                        baseURL + 'bullet.mp3'
                    ]
                },
                {
                    id: 'collect',
                    url: [
                        baseURL + 'collect.ogg',
                        baseURL + 'collect.mp3'
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
                baseURL + 'select.ogg',
                baseURL + 'select.mp3'
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
                    baseURL + 'hit.ogg',
                    baseURL + 'hit.mp3'
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
