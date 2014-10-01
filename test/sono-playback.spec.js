'use strict';

var Sono = require('../src/sono.js');

describe('Sono playback', function() {

    describe('create', function() {
        var config = {
                id: 'foo',
                url: [
                    'http://ianmcgregor.me/prototypes/assets/audio/bullet.ogg',
                    'http://ianmcgregor.me/prototypes/assets/audio/bullet.mp3'
                ]
            },
            sound;

        beforeEach(function(done) {
            sound = Sono.createSound(config);
            sound.onEnded(function() {
                done();
            });
            sound.play();
        });

        afterEach(function() {
            Sono.destroy(sound.id);
        });

        it('should get ended callback', function(){
            expect(sound).to.exist;
        });
    });

    describe('play and end', function() {
        var sound,
            ended = false;

        beforeEach(function(done) {
            var onComplete = function(loadedSound) {
                sound = loadedSound;
                sound.onEnded(function() {
                    ended = true;
                    done();
                });
                sound.play();
            };
            Sono.load({
                url: [
                    'http://ianmcgregor.me/prototypes/assets/audio/hit.ogg',
                    'http://ianmcgregor.me/prototypes/assets/audio/hit.mp3'
                ],
                onComplete: onComplete
            });
        });

        afterEach(function() {
            Sono.destroy(sound.id);
        });

        it('should get ended callback', function(){
            expect(sound).to.exist;
            expect(ended).to.be.true;
        });
    });

});
