describe('Source', function() {

    const src = sono.Sound.__source;

    describe('Buffer', function() {
        const buffer = sono.context.createBuffer(1, 1, 22050);
        const source = new src.BufferSource(buffer, sono.context);

        it('should have controls', function() {
            expect(source.play)
                .to.be.a('function');
            expect(source.pause)
                .to.be.a('function');
            expect(source.stop)
                .to.be.a('function');
        });

        it('should have destroy', function() {
            expect(source.destroy)
                .to.be.a('function');
        });

        it('should have state', function() {
            expect(source.loop)
                .to.be.a('boolean');
            expect(source.duration)
                .to.be.a('number');
            expect(source.currentTime)
                .to.be.a('number');
            expect(source.progress)
                .to.be.a('number');
            expect(source.playing)
                .to.be.a('boolean');
            expect(source.paused)
                .to.be.a('boolean');
        });

        it('should have sourceNode', function() {
            const desc = Object.getOwnPropertyDescriptor(source, 'sourceNode');
            expect(desc.get)
                .to.be.a('function');
            expect(desc.set)
                .to.not.exist;
        });

        it('should be able to destroy', function() {
            expect(source.sourceNode)
                .to.exist;
            source.destroy();
            expect(source.sourceNode)
                .to.not.exist;
        });
    });

    describe('Media', function() {
        const el = document.createElement('audio');
        const source = new src.MediaSource(el, sono.context);

        it('should have controls', function() {
            expect(source.play)
                .to.be.a('function');
            expect(source.pause)
                .to.be.a('function');
            expect(source.stop)
                .to.be.a('function');
        });

        it('should have destroy', function() {
            expect(source.destroy)
                .to.be.a('function');
        });

        it('should have state', function() {
            expect(source.loop)
                .to.be.a('boolean');
            expect(source.duration)
                .to.be.a('number');
            expect(source.currentTime)
                .to.be.a('number');
            expect(source.progress)
                .to.be.a('number');
            expect(source.playing)
                .to.be.a('boolean');
            expect(source.paused)
                .to.be.a('boolean');
        });

        it('should have sourceNode', function() {
            const desc = Object.getOwnPropertyDescriptor(source, 'sourceNode');
            expect(desc.get)
                .to.be.a('function');
            expect(desc.set)
                .to.not.exist;
            expect(source.sourceNode instanceof window.MediaElementAudioSourceNode)
                .to.be.true;
        });

        it('should be able to destroy', function() {
            expect(source.sourceNode)
                .to.exist;
            source.destroy();
            expect(source.sourceNode)
                .to.not.exist;
        });
    });

    describe('Microphone', function() {
        const source = new src.MicrophoneSource(null, sono.context);

        it('should have controls', function() {
            expect(source.play)
                .to.be.a('function');
            expect(source.pause)
                .to.be.a('function');
            expect(source.stop)
                .to.be.a('function');
        });

        it('should have destroy', function() {
            expect(source.destroy)
                .to.be.a('function');
        });

        it('should have state', function() {
            //expect(source.loop).to.be.a('boolean');
            expect(source.duration)
                .to.be.a('number');
            expect(source.currentTime)
                .to.be.a('number');
            expect(source.progress)
                .to.be.a('number');
            expect(source.playing)
                .to.be.a('boolean');
            expect(source.paused)
                .to.be.a('boolean');
        });

        it('should have sourceNode', function() {
            const desc = Object.getOwnPropertyDescriptor(source, 'sourceNode');
            expect(desc.get)
                .to.be.a('function');
            expect(desc.set)
                .to.not.exist;
        });

        it('should be able to destroy', function() {
            expect(source.destroy)
                .to.be.a('function');
        });
    });

    describe('Oscillator', function() {
        const source = new src.OscillatorSource('sine', sono.context);

        it('should have controls', function() {
            expect(source.play)
                .to.be.a('function');
            expect(source.pause)
                .to.be.a('function');
            expect(source.stop)
                .to.be.a('function');
        });

        it('should have destroy', function() {
            expect(source.destroy)
                .to.be.a('function');
        });

        it('should have state', function() {
            //expect(source.loop).to.be.a('boolean');
            expect(source.duration)
                .to.be.a('number');
            expect(source.currentTime)
                .to.be.a('number');
            expect(source.progress)
                .to.be.a('number');
            expect(source.playing)
                .to.be.a('boolean');
            expect(source.paused)
                .to.be.a('boolean');
        });

        it('should have sourceNode', function() {
            const desc = Object.getOwnPropertyDescriptor(source, 'sourceNode');
            expect(desc.get)
                .to.be.a('function');
            expect(desc.set)
                .to.not.exist;
            expect(source.sourceNode instanceof window.AudioNode)
                .to.be.true;
        });

        it('should be able to destroy', function() {
            expect(source.sourceNode)
                .to.exist;
            source.destroy();
            expect(source.sourceNode)
                .to.not.exist;
        });

    });

    describe('Script Source', function() {
        const source = new src.ScriptSource({
            callback: function() {}
        }, sono.context);

        it('should have controls', function() {
            expect(source.play)
                .to.be.a('function');
            expect(source.pause)
                .to.be.a('function');
            expect(source.stop)
                .to.be.a('function');
        });

        it('should have destroy', function() {
            expect(source.destroy)
                .to.be.a('function');
        });

        it('should have state', function() {
            //expect(source.loop).to.be.a('boolean');
            expect(source.duration)
                .to.be.a('number');
            expect(source.currentTime)
                .to.be.a('number');
            expect(source.progress)
                .to.be.a('number');
            expect(source.playing)
                .to.be.a('boolean');
            expect(source.paused)
                .to.be.a('boolean');
        });

        it('should have sourceNode', function() {
            const desc = Object.getOwnPropertyDescriptor(source, 'sourceNode');
            expect(desc.get)
                .to.be.a('function');
            expect(desc.set)
                .to.not.exist;
            expect(source.sourceNode instanceof window.AudioNode)
                .to.be.true;
        });

        it('should be able to destroy', function() {
            expect(source.sourceNode)
                .to.exist;
            source.destroy();
            expect(source.sourceNode)
                .to.not.exist;
        });
    });

});
