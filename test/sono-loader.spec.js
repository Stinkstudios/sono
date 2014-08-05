'use strict';

var Sono = require('../src/sono.js');

describe('Sono loader', function() {

    var key = 'a',
        files = [
            'http://ianmcgregor.me/prototypes/assets/audio/hit.ogg',
            'http://ianmcgregor.me/prototypes/assets/audio/hit.mp3'
        ],
        sound;

    beforeEach(function(done) {
        //load = function(key, url, loop, callback, callbackContext, asBuffer)
        Sono.load(key, files, false, function(loadedSound) {
            sound = loadedSound;
            done();
        });
    });

    it('should have loaded sound', function(){
        expect(sound).to.exist;
        expect(sound.name).to.eql(key);
        expect(sound.loader).to.exist;
        expect(sound.loader.data).to.exist;
    });

});
