'use strict';

var Sono = require('../src/sono.js');

describe('Sono playback', function() {

    var files = [
            'http://ianmcgregor.me/prototypes/assets/audio/hit.ogg',
            'http://ianmcgregor.me/prototypes/assets/audio/hit.mp3'
        ],
        sound,
        ended = false;

    beforeEach(function(done) {
        //load = function(url, callback, callbackContext, asBuffer)
        Sono.loadArrayBuffer(files, function(loadedSound) {
            sound = loadedSound;
            sound.onEnded(function() {
                ended = true;
                done();
            });
            sound.play();
            // TODO: this test seem pretty flaky!
            /*setTimeout(function() {
                done();
            }, 200);*/
        });
    });

    afterEach(function() {
        Sono.destroy(sound.id);
    });

    it('should play a sound', function(){
        expect(sound).to.exist;
        expect(ended).to.be.true;
        //console.log(sound.currentTime)
        //expect(sound.currentTime).to.be.at.least(0.1);
    });
});
