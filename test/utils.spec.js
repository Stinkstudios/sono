'use strict';

var Utils = require('../src/lib/utils.js');

describe('Support', function() {

    var el = document.createElement('audio');

    it('should get audio type', function() {
        expect(Utils.isAudioBuffer(el)).to.be.false;
        expect(Utils.isMediaElement(el)).to.be.true;
    });

    it('should format timecode', function() {
        expect(Utils.timeCode(217.8)).to.eql('03:37');
    });
});