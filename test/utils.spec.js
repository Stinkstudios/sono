'use strict';

var Utils = require('../src/lib/utils/utils.js');

describe('Utils', function() {

    it('should format timecode', function() {
        expect(Utils.timeCode(217.8)).to.eql('03:37');
    });
});