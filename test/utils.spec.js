describe('utils', function() {
    const utils = sono.utils;

    describe('buffer', function() {
        const buffer = sono.context.createBuffer(1, 4096, sono.context.sampleRate);

        it('should clone buffer', function() {
            const cloned = utils.cloneBuffer(buffer);
            expect(cloned)
                .to.be.an.instanceof(window.AudioBuffer);
            expect(cloned)
                .to.eql(buffer);
        });

        it('should reverse buffer', function() {
            const data = buffer.getChannelData(0);
            data[0] = 1;
            expect(data[0])
                .to.eql(1);
            utils.reverseBuffer(buffer);
            expect(data[0])
                .to.eql(0);
            expect(data[data.length - 1])
                .to.eql(1);
        });
    });

    describe('timecode', function() {
        it('should format timecode', function() {
            expect(utils.timeCode(217.8))
                .to.eql('03:37');
        });
    });
});
