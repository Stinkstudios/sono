function effectsTest(isWebAudio) {
    const name = isWebAudio ? 'Web Audio' : 'No Web Audio';

    describe('Effects (' + name + ')', function() {

        const ctx = sono.context;
        const effects = new sono.Group.Effects(ctx);
        const audioContext = effects.context;
        const audioNode = isWebAudio ? window.AudioNode : Object;

        describe('initialization', function() {
            it('should be able to set source and destination', function() {
                console.log(audioContext.createGain());
                effects.setSource(audioContext.createGain());
                effects.setDestination(audioContext.destination);
            });
        });

        describe('add', function() {
            it('should have expected api', function() {
                expect(effects.add)
                    .to.be.a('function');
                expect(effects.add.length)
                    .to.eql(1);
            });
            it('should add a node', function() {
                const panner = effects.add(effects.panner());
                console.log(panner);
                expect(panner).to.exist;
                expect(panner._in).to.be.an.instanceof(audioNode);
                expect(panner._out).to.be.an.instanceof(audioNode);
                expect(effects._nodes.length)
                    .to.eql(1);
                effects.remove(panner);
            });
        });

        describe('remove', function() {
            it('should have expected api', function() {
                expect(effects.remove)
                    .to.be.a('function');
                expect(effects.remove.length)
                    .to.eql(1);
            });
            it('should remove a node', function() {
                const panner = effects.add(audioContext.createPanner());
                expect(effects._nodes.length)
                    .to.eql(1);
                effects.remove(panner);
                expect(effects._nodes.length)
                    .to.eql(0);
            });
        });

        describe('removeAll', function() {
            it('should have expected api', function() {
                expect(effects.removeAll)
                    .to.be.a('function');
                expect(effects.removeAll.length)
                    .to.eql(0);
            });
            it('should remove all nodes', function() {
                effects.add(audioContext.createPanner());
                effects.add(audioContext.createGain());
                expect(effects._nodes.length)
                    .to.eql(2);
                effects.removeAll();
                expect(effects._nodes.length)
                    .to.eql(0);
            });
        });

        describe('destroy', function() {
            it('should have expected api', function() {
                expect(effects.destroy)
                    .to.be.a('function');
                expect(effects.destroy.length)
                    .to.eql(0);
            });
        });

        // describe('panning', function() {
        //     it('should have expected api', function() {
        //         expect(effects.panning)
        //             .to.exist;
        //         expect(effects.panning.setDefaults)
        //             .to.be.a('function');
        //         expect(effects.panning.setListenerPosition)
        //             .to.be.a('function');
        //         expect(effects.panning.setListenerOrientation)
        //             .to.be.a('function');
        //     });
        // });

        describe('analyser', function() {
            it('should have expected api', function() {
                expect(effects.analyser).to.be.a('function');
                expect(effects.analyser.length).to.eql(1);
                expect(effects.analyser()).to.be.an('object');
                expect(effects.analyser()._in).to.be.an.instanceof(audioNode);
                expect(effects.analyser()._out).to.be.an.instanceof(audioNode);
            });
        });

        describe('compressor', function() {
            // console.log('effects.compressor.length', effects.compressor.length)
            it('should have expected api', function() {
                expect(effects.compressor).to.be.a('function');
                expect(effects.compressor.length).to.eql(1);
                expect(effects.compressor()).to.exist;
                expect(effects.compressor()._in).to.be.an.instanceof(audioNode);
                expect(effects.compressor()._out).to.be.an.instanceof(audioNode);
            });
        });

        // describe('convolver', function() {
        //     it('should have expected api', function() {
        //         expect(effects.convolver)
        //             .to.be.a('function');
        //         expect(effects.convolver.length)
        //             .to.eql(1);
        //         expect(effects.convolver())
        //             .to.exist;
        //     });
        // });

        // describe('delay', function() {
        //     it('should have expected api', function() {
        //         expect(effects.delay)
        //             .to.be.a('function');
        //         expect(effects.delay.length)
        //             .to.eql(1);
        //         expect(effects.delay())
        //             .to.exist;
        //     });
        // });

        describe('distortion', function() {
            it('should have expected api', function() {
                expect(effects.distortion)
                    .to.be.a('function');
                expect(effects.distortion.length)
                    .to.eql(1);
                expect(effects.distortion())
                    .to.exist;
            });
        });

        describe('echo', function() {
            it('should have expected api', function() {
                expect(effects.echo)
                    .to.be.a('function');
                expect(effects.echo.length)
                    .to.eql(1);
                expect(effects.echo())
                    .to.exist;
            });
            it('should add and remove node', function() {
                effects.removeAll();
                const echo = effects.echo();
                expect(echo)
                    .to.exist;
                expect(effects._nodes)
                    .to.include(echo);
                effects.remove(echo);
                expect(effects._nodes)
                    .to.not.include(echo);
            });
        });

        describe('filter', function() {
            it('should have expected api', function() {
                expect(effects.filter)
                    .to.be.a('function');

                expect(effects.lowpass)
                    .to.be.a('function');
                expect(effects.lowpass())
                    .to.exist;

                expect(effects.highpass)
                    .to.be.an('function');
                expect(effects.highpass())
                    .to.exist;

                expect(effects.bandpass)
                    .to.be.an('function');
                expect(effects.bandpass())
                    .to.exist;

                expect(effects.lowshelf)
                    .to.be.an('function');
                expect(effects.lowshelf())
                    .to.exist;

                expect(effects.highshelf)
                    .to.be.an('function');
                expect(effects.highshelf())
                    .to.exist;

                expect(effects.peaking)
                    .to.be.an('function');
                expect(effects.peaking())
                    .to.exist;

                expect(effects.notch)
                    .to.be.an('function');
                expect(effects.notch())
                    .to.exist;

                expect(effects.allpass)
                    .to.be.an('function');
                expect(effects.allpass())
                    .to.exist;
            });
        });

        // describe('gain', function() {
        //     it('should have expected api', function() {
        //         expect(effects.gain)
        //             .to.be.a('function');
        //         expect(audioContext.createGain())
        //             .to.exist;
        //     });
        // });

        describe('panner', function() {
            it('should have expected api', function() {
                expect(effects.panner)
                    .to.be.a('function');
                const panner = effects.panner();
                expect(panner)
                    .to.exist;
                expect(panner.setListenerPosition)
                    .to.be.a('function');
                expect(panner.setListenerOrientation)
                    .to.be.a('function');
                expect(panner.setSourcePosition)
                    .to.be.a('function');
                expect(panner.setSourceOrientation)
                    .to.be.a('function');
            });
        });

        describe('reverb', function() {
            it('should have expected api', function() {
                expect(effects.reverb)
                    .to.be.a('function');
                expect(effects.reverb())
                    .to.exist;
            });
        });

        describe('script', function() {
            it('should have expected api', function() {
                expect(effects.script)
                    .to.be.a('function');
                expect(effects.script())
                    .to.exist;
            });
        });

    });
}

// test with webaudio
effectsTest(true);

// test without webaudio
effectsTest(false);
