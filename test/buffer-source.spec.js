'use strict';

//var Sono = require('../src/sono.js');
var BufferSource = require('../src/lib/buffer-source.js');

describe('Buffer Source', function() {
    var source = new BufferSource();

    it('should have expected API', function() {
        expect(source).to.have.property('id');
        expect(source.add).to.be.a('function');

        expect(source.play).to.be.a('function');
        expect(source.pause).to.be.a('function');
        expect(source.stop).to.be.a('function');

        expect(source.onEnded).to.be.a('function');
        expect(source.addEndedListener).to.be.a('function');
        expect(source.removeEndedListener).to.be.a('function');

        //expect(source.source).to.be.an('object');
        
        expect(source.loop).to.be.a('boolean');
        expect(source.duration).to.be.a('number');
        expect(source.currentTime).to.be.a('number');
        expect(source.progress).to.be.a('number');
        // DOESN'T HAVE VOLUME expect(source.volume).to.be.a('number');
        expect(source.playing).to.be.a('boolean');
        expect(source.paused).to.be.a('boolean');
    });
});
