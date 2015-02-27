'use strict';

var Sono = require('../src/sono.js');

describe('Sono playback', function() {

    this.timeout(5000);

    var baseURL = 'https://dl.dropboxusercontent.com/u/15470024/prototypes/audio/';

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
            sound.on('ended', function() {
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
                sound.on('ended', function() {
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
            }).on('ended', function() {
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

    // Firefox 35 and less has a bug where audio param ramping does not change the readable value in the param itself
    // Fading still audibly affects the sound, but the value is untouched
    if(navigator.userAgent.toLowerCase().indexOf('firefox') > -1) { return; }

    describe('fade master', function() {
        beforeEach(function(done) {
            setTimeout(function() {
                done();
            }, 500);
        });
        afterEach(function() {
            Sono.volume = 1;
        });

        Sono.volume = 1;
        Sono.fade(0, 0.2);

        it('should have faded to zero volume', function() {
            expect(Sono.volume).to.eql(0);
        });

    });

    describe('fade sound', function() {

        var sound;

        beforeEach(function(done) {
            sound = Sono.createSound({
                type: 'sine'
            }).play().fade(0, 0.2);
            setTimeout(function() {
                done();
            }, 500);
        });

        it('should have faded to zero volume', function() {
            expect(sound.volume).to.eql(0);
        });

    });

});
