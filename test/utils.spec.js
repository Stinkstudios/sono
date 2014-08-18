'use strict';

var Sono = require('../src/sono.js');
var Utils = require('../src/lib/utils.js');

describe('Support', function() {

    var utils = new Utils(Sono.context);
    var el = document.createElement('audio');

    it('should get audio type', function() {
        expect(utils.isAudioBuffer(el)).to.be.false;
        expect(utils.isMediaElement(el)).to.be.true;
    });

    it('should format timecode', function() {
        expect(utils.timeCode(217.8)).to.eql('03:37');
    });
});