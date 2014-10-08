'use strict';

var Sono = require('../src/sono.js');

describe('Sono playback', function() {

    var baseURL = 'http://ianmcgregor.me/prototypes/assets/audio/';

    describe('create', function() {
        var config = {
                id: 'foo',
                url: [
                    baseURL + 'bullet.ogg',
                    baseURL + 'bullet.mp3'
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
            Sono.destroySound(sound.id);
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
                    baseURL + 'hit.ogg',
                    baseURL + 'hit.mp3'
                ],
                onComplete: onComplete
            });
        });

        afterEach(function() {
            Sono.destroySound(sound.id);
        });

        it('should get ended callback', function(){
            expect(sound).to.exist;
            expect(ended).to.be.true;
        });
    });

});
