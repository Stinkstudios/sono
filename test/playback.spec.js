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

    describe('play when ready', function() {
        var sound,
            ended = false;

        beforeEach(function(done) {
            sound = Sono.createSound({
                url: [baseURL + 'select.ogg', baseURL + 'select.mp3']
            }).onEnded(function() {
                ended = true;
                done();
            }).play(0.1, 0.1);
        });

        afterEach(function() {
            Sono.destroySound(sound);
        });

        it('should have played', function(){
            expect(sound).to.exist;
            expect(ended).to.be.true;
        });
    });

    describe('fade master', function() {
        beforeEach(function(done) {
            setTimeout(function() {
                done();
            }, 500);
        });

        it('should fade Sono master volume', function() {
            expect(Sono.volume).to.eql(1);
            Sono.fade(0, 0.2);
        });

        it('should be at zero volume', function() {
            expect(Sono.volume).to.eql(0);
        });

    });

    describe('fade sound', function() {
        var sound = Sono.createSound('sine');

        beforeEach(function(done) {
            setTimeout(function() {
                done();
            }, 500);
        });

        it('should fade Sound volume', function() {
            expect(sound.volume).to.eql(1);
            sound.fade(0, 0.2);
        });

        it('should be at zero volume', function() {
            expect(sound.volume).to.eql(0);
            Sono.destroySound(sound);
        });

    });

});
