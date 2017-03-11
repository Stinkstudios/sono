describe('utils', () => {
    const utils = sono.utils;

    describe('buffer', () => {
        const expectedAudioBufferType = sono.hasWebAudio ? window.AudioBuffer : Object;
        const expectedValue = sono.hasWebAudio ? 1 : 0;
        const buffer = sono.context.createBuffer(1, 4096, sono.context.sampleRate);

        it('should clone buffer', () => {
            const cloned = utils.cloneBuffer(buffer);
            expect(cloned).to.be.an.instanceof(expectedAudioBufferType);
            expect(cloned).to.eql(buffer);
        });

        it('should reverse buffer', () => {
            const data = buffer.getChannelData(0);
            data[0] = expectedValue;
            expect(data[0]).to.eql(expectedValue);
            utils.reverseBuffer(buffer);
            expect(data[0]).to.eql(0);
            expect(data[data.length - 1]).to.eql(expectedValue);
        });
    });

    describe('timecode', () => {
        it('should format timecode', () => {
            expect(utils.timeCode(217.8)).to.eql('03:37');
        });
    });

    describe('recorder', () => {
        it('should have expected api', () => {
            expect(utils.recorder).to.be.a('function');
            expect(utils.recorder()).to.exist;
        });
    });
});
