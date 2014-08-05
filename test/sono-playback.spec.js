'use strict';

var Sono = require('../src/sono.js');

describe('Sono', function() {
    beforeEach(function() {
    });
    afterEach(function() {
    });

    it('should play a sound', function() {
        var key = 'a',
            files = [
                'http://ianmcgregor.me/prototypes/assets/audio/hit.ogg',
                'http://ianmcgregor.me/prototypes/assets/audio/hit.mp3'
            ];
        //load = function(key, url, loop, callback, callbackContext, asBuffer)
        Sono.load(key, files);
        expect(Sono.get(key)).to.be.an('object');
        expect(Sono.get(key).play).to.be.a('function');
        Sono.destroy(key);
        expect(Sono.get(key)).to.not.exist;
    });
});
