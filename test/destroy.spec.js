'use strict';

var Sono = require('../src/sono.js');
// var Sound = require('../src/lib/sound.js');

describe('Destroy', function() {

    var sound;

    beforeEach(function() {
        Sono.destroyAll();
    });

    it('should have one sound', function() {
        sound = Sono.createSound({
            id: 'sine',
            type: 'sine'
        });
        expect(Sono.sounds.length).to.eql(1);
    });

    it('should have zero sounds', function() {
        sound.destroy();
        expect(Sono.sounds.length).to.eql(0);
    });

});
