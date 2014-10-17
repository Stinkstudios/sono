'use strict';

var Sono = require('../src/sono.js');
var Utils = require('../src/lib/utils/utils.js');

describe('Utils', function() {

    Utils.setContext(Sono.context);

    describe('buffer', function() {
        var buffer = Sono.context.createBuffer(1, 4096, Sono.context.sampleRate);
        
        it('should clone buffer', function() {
            var cloned = Utils.cloneBuffer(buffer);
            expect(cloned).to.be.an.instanceof(window.AudioBuffer);
            expect(cloned).to.eql(buffer);
        });

        it('should reverse buffer', function() {
            var data = buffer.getChannelData(0);
            data[0] = 1;
            expect(data[0]).to.eql(1);
            Utils.reverseBuffer(buffer);
            expect(data[0]).to.eql(0);
            expect(data[data.length-1]).to.eql(1);
        });
    });

    describe('timecode', function() {
        it('should format timecode', function() {
            expect(Utils.timeCode(217.8)).to.eql('03:37');
        });
    });
});