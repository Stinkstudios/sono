'use strict';

var Sono = require('../src/sono.js');

describe('Sono loader', function() {

    var files = [
            'http://ianmcgregor.me/prototypes/assets/audio/hit.ogg',
            'http://ianmcgregor.me/prototypes/assets/audio/hit.mp3'
        ],
        sound;

    beforeEach(function(done) {
        //load = function(url, callback, callbackContext, asBuffer)
        Sono.load(files, function(loadedSound) {
            sound = loadedSound;
            done();
        });
    });

    it('should have loaded sound', function(){
        expect(sound).to.exist;
        expect(Sono.get(sound.id)).to.exist;
        expect(sound.loader).to.exist;
        expect(sound.loader.data).to.exist;
        expect(sound.play).to.be.a('function');

        Sono.destroy(sound);
        expect(Sono.get(sound.id)).to.not.exist;
    });

});
