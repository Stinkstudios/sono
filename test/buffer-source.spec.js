'use strict';

//var Sono = require('../src/sono.js');
var BufferSource = require('../src/lib/source/buffer-source.js');

describe('Buffer Source', function() {
    var source = new BufferSource();

    it('should have expected members (id)', function() {
        expect(source).to.have.property('id');
    });

    it('should have expected members (controls)', function() {
        expect(source.play).to.be.a('function');
        expect(source.pause).to.be.a('function');
        expect(source.stop).to.be.a('function');
    });

    it('should have expected members (ended callback)', function() {
        expect(source.onEnded).to.be.a('function');
    });

    it('should have expected members (state)', function() {
        expect(source.loop).to.be.a('boolean');
        expect(source.duration).to.be.a('number');
        expect(source.currentTime).to.be.a('number');
        expect(source.progress).to.be.a('number');
        expect(source.playing).to.be.a('boolean');
        expect(source.paused).to.be.a('boolean');
    });

    it('should have get sourceNode', function() {
        var desc = Object.getOwnPropertyDescriptor(source.constructor.prototype, 'sourceNode');
        expect(desc.get).to.be.a('function');
        expect(desc.set).to.not.exist;
    });
});
