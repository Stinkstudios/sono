describe('Source', () => {

    const src = sono.__test.Sound.__source;

    console.log('sono.hasWebAudio', sono.hasWebAudio);
    const expectedMediaElSourceType = sono.hasWebAudio ? window.MediaElementAudioSourceNode : Object;
    const expectedAudioNodeType = sono.hasWebAudio ? window.AudioNode : Object;

    describe('Buffer', () => {
        const buffer = sono.context.createBuffer(1, 1, 22050);
        const source = new src.BufferSource(buffer, sono.context);

        it('should have controls', () => {
            expect(source.play).to.be.a('function');
            expect(source.pause).to.be.a('function');
            expect(source.stop).to.be.a('function');
        });

        it('should have destroy', () => {
            expect(source.destroy).to.be.a('function');
        });

        it('should have state', () => {
            expect(source.loop).to.be.a('boolean');
            expect(source.duration).to.be.a('number');
            expect(source.currentTime).to.be.a('number');
            expect(source.progress).to.be.a('number');
            expect(source.playing).to.be.a('boolean');
            expect(source.paused).to.be.a('boolean');
        });

        it('should have sourceNode', () => {
            const desc = Object.getOwnPropertyDescriptor(source, 'sourceNode');
            expect(desc.get).to.be.a('function');
            expect(desc.set).to.not.exist;
        });

        it('should be able to destroy', () => {
            expect(source.sourceNode).to.exist;
            source.destroy();
            expect(source.sourceNode).to.not.exist;
        });
    });

    describe('Media', () => {
        const el = document.createElement('audio');
        const source = new src.MediaSource(el, sono.context);

        it('should have controls', () => {
            expect(source.play).to.be.a('function');
            expect(source.pause).to.be.a('function');
            expect(source.stop).to.be.a('function');
        });

        it('should have destroy', () => {
            expect(source.destroy).to.be.a('function');
        });

        it('should have state', () => {
            expect(source.loop).to.be.a('boolean');
            expect(source.duration).to.be.a('number');
            expect(source.currentTime).to.be.a('number');
            expect(source.progress).to.be.a('number');
            expect(source.playing).to.be.a('boolean');
            expect(source.paused).to.be.a('boolean');
        });

        it('should have sourceNode', () => {
            const desc = Object.getOwnPropertyDescriptor(source, 'sourceNode');
            expect(desc.get).to.be.a('function');
            expect(desc.set).to.not.exist;
            expect(source.sourceNode).to.be.an.instanceof(expectedMediaElSourceType);
        });

        it('should be able to destroy', () => {
            expect(source.sourceNode).to.exist;
            source.destroy();
            expect(source.sourceNode).to.not.exist;
        });
    });

    describe('Microphone', () => {
        const source = new src.MicrophoneSource(null, sono.context);

        it('should have controls', () => {
            expect(source.play).to.be.a('function');
            expect(source.pause).to.be.a('function');
            expect(source.stop).to.be.a('function');
        });

        it('should have destroy', () => {
            expect(source.destroy).to.be.a('function');
        });

        it('should have state', () => {
            expect(source.duration).to.be.a('number');
            expect(source.currentTime).to.be.a('number');
            expect(source.progress).to.be.a('number');
            expect(source.playing).to.be.a('boolean');
            expect(source.paused).to.be.a('boolean');
        });

        it('should have sourceNode', () => {
            const desc = Object.getOwnPropertyDescriptor(source, 'sourceNode');
            expect(desc.get).to.be.a('function');
            expect(desc.set).to.not.exist;
        });

        it('should be able to destroy', () => {
            expect(source.destroy).to.be.a('function');
        });
    });

    describe('Oscillator', () => {
        const source = new src.OscillatorSource('sine', sono.context);

        it('should have controls', () => {
            expect(source.play).to.be.a('function');
            expect(source.pause).to.be.a('function');
            expect(source.stop).to.be.a('function');
        });

        it('should have destroy', () => {
            expect(source.destroy).to.be.a('function');
        });

        it('should have state', () => {
            expect(source.duration).to.be.a('number');
            expect(source.currentTime).to.be.a('number');
            expect(source.progress).to.be.a('number');
            expect(source.playing).to.be.a('boolean');
            expect(source.paused).to.be.a('boolean');
        });

        it('should have sourceNode', () => {
            const desc = Object.getOwnPropertyDescriptor(source, 'sourceNode');
            expect(desc.get).to.be.a('function');
            expect(desc.set).to.not.exist;
            expect(source.sourceNode).to.be.an.instanceOf(expectedAudioNodeType);
        });

        it('should be able to destroy', () => {
            expect(source.sourceNode).to.exist;
            source.destroy();
            expect(source.sourceNode).to.not.exist;
        });

    });

});
