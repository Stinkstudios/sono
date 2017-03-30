describe('Effects (' + (sono.hasWebAudio ? 'Web Audio' : 'No Web Audio') + ')', () => {

    const effects = new sono.__test.Effects(sono.context);
    const ctx = effects.context;
    const expectedType = ctx.isFake ? Object : window.AudioNode;

    describe('initialization', () => {
        it('should be able to set source and destination', () => {
            effects.setSource(ctx.createGain());
            effects.setDestination(ctx.destination);
        });
    });

    describe('add', () => {
        it('should have expected api', () => {
            expect(effects.add).to.be.a('function');
            expect(effects.add.length).to.eql(1);
        });

        it('should add a node', () => {
            const panner = effects.add(effects.panner());
            expect(panner).to.exist;
            expect(panner._in).to.be.an.instanceof(expectedType);
            expect(panner._out).to.be.an.instanceof(expectedType);
            expect(effects._nodes.length).to.eql(1);
            effects.remove(panner);
        });
    });

    describe('remove', () => {
        it('should have expected api', () => {
            expect(effects.remove).to.be.a('function');
            expect(effects.remove.length).to.eql(1);
        });

        it('should remove a node', () => {
            const panner = effects.add(ctx.createPanner());
            expect(effects._nodes.length).to.eql(1);
            effects.remove(panner);
            expect(effects._nodes.length).to.eql(0);
        });
    });

    describe('removeAll', () => {
        it('should have expected api', () => {
            expect(effects.removeAll).to.be.a('function');
            expect(effects.removeAll.length).to.eql(0);
        });

        it('should remove all nodes', () => {
            effects.add(ctx.createPanner());
            effects.add(ctx.createGain());
            expect(effects._nodes.length).to.eql(2);
            effects.removeAll();
            expect(effects._nodes.length).to.eql(0);
        });
    });

    describe('destroy', () => {
        it('should have expected api', () => {
            expect(effects.destroy).to.be.a('function');
            expect(effects.destroy.length).to.eql(0);
        });
    });

    function testEffectAPI(name, opts) {
        describe(name, () => {
            const effect = effects[name];
            const instance = effect(opts);

            it('should exist', () => {
                expect(effect).to.be.a('function');
            });

            it('should have single param', () => {
                expect(effect.length).to.be.below(2);
            });

            it('should return object', () => {
                expect(instance).to.be.an('object');
            });

            it('should have input and output', () => {
                expect(instance._in).to.be.an.instanceof(expectedType);
                expect(instance._out).to.be.an.instanceof(expectedType);
            });

            it('should have update method', () => {
                expect(instance.update).to.be.a('function');
                expect(instance.update.length).to.be.below(2);
            });

            it('should add node', () => {
                effects.removeAll();
                const eff = effects.add(instance);
                expect(eff).to.exist;
                expect(effects._nodes).to.include(eff);
                effects.remove(eff);
                expect(effects._nodes).to.not.include(eff);
            });

        });
    }

    const undef = undefined;

    const effectNames = [
        ['analyser', undef],
        ['compressor', undef],
        ['convolver', undef],
        ['distortion', {samples: 1000}],
        ['echo', undef],
        ['filter', undef],
        ['lowpass', undef],
        ['highpass', undef],
        ['bandpass', undef],
        ['lowshelf', undef],
        ['highshelf', undef],
        ['peaking', undef],
        ['notch', undef],
        ['allpass', undef],
        ['flanger', undef],
        ['monoFlanger', undef],
        ['stereoFlanger', undef],
        ['panner', undef],
        ['phaser', undef],
        ['reverb', undef]
    ];

    effectNames.forEach(arr => {
        const name = arr[0];
        for (let i = 1; i < arr.length; i++) {
            testEffectAPI(name, arr[i]);
        }
    });

    describe('analyser', () => {
        it('should have functions and properties', () => {
            const effect = effects.analyser();
            expect(effect.getWaveform).to.be.a('function');
            expect(effect.getAmplitude).to.be.a('function');
            expect(effect.getFrequencies).to.be.a('function');
            expect(effect.getPitch).to.be.a('function');
            expect(effect.frequencyBinCount).to.be.a('number');
            expect(effect.maxDecibels).to.be.a('number');
            expect(effect.smoothing).to.be.a('number');
        });
    });

    describe('compressor', () => {
        it('should have functions and properties', () => {
            const effect = effects.compressor();
            expect(effect.threshold).to.be.a('number');
            expect(effect.knee).to.be.a('number');
            expect(effect.ratio).to.be.a('number');
            expect(effect.attack).to.be.a('number');
            expect(effect.release).to.be.a('number');
        });
    });

    describe('convolver', () => {
        it('should have functions and properties', () => {
            const effect = effects.convolver();
            expect(effect).to.have.property('impulse');
        });
    });

    describe('distortion', () => {
        it('should have functions and properties', () => {
            const effect = effects.distortion({samples: 1000});
            expect(effect.level).to.be.a('number');
        });
    });

    describe('echo', () => {
        it('should have functions and properties', () => {
            const effect = effects.echo();
            expect(effect.delay).to.be.a('number');
            expect(effect.feedback).to.be.a('number');
        });
    });

    describe('filter', () => {
        it('should have functions and properties', () => {
            const effect = effects.filter();
            expect(effect.type).to.be.a('string');
            expect(effect.frequency).to.be.a('number');
            expect(effect.gain).to.be.a('number');
            expect(effect.detune).to.be.a('number');
            expect(effect.q).to.be.a('number');
            expect(effect.peak).to.be.a('number');
            expect(effect.boost).to.be.a('number');
            expect(effect.width).to.be.a('number');
            expect(effect.sharpness).to.be.a('number');
        });
    });

    describe('flanger', () => {
        it('should have functions and properties', () => {
            const effect = effects.flanger();
            expect(effect.delay).to.be.a('number');
            expect(effect.feedback).to.be.a('number');
            expect(effect.frequency).to.be.a('number');
            expect(effect.gain).to.be.a('number');
        });
    });

    describe('panner', () => {
        it('should have functions and properties', () => {
            const effect = effects.panner();
            expect(effect.set).to.be.a('function');
            expect(effect.setPosition).to.be.a('function');
            expect(effect.setOrientation).to.be.a('function');
            expect(effect.setListenerPosition).to.be.a('function');
            expect(effect.setListenerOrientation).to.be.a('function');
            expect(effect.defaults).to.be.an('object');
        });

        it('should have static methods', () => {
            const effect = effects.panner;
            expect(effect.setListenerPosition).to.be.a('function');
            expect(effect.setListenerOrientation).to.be.a('function');
            expect(effect.defaults).to.be.an('object');
            const desc = Object.getOwnPropertyDescriptor(effect, 'defaults');
            expect(desc.get).to.be.a('function');
            expect(desc.set).to.be.a('function');
        });
    });

    describe('phaser', () => {
        it('should have functions and properties', () => {
            const effect = effects.phaser();
            expect(effect.stages).to.be.a('number');
            expect(effect.feedback).to.be.a('number');
            expect(effect.frequency).to.be.a('number');
            expect(effect.gain).to.be.a('number');
        });
    });

    describe('reverb', () => {
        it('should have functions and properties', () => {
            const effect = effects.reverb();
            expect(effect.time).to.be.a('number');
            expect(effect.decay).to.be.a('number');
            expect(effect.reverse).to.be.a('boolean');
        });
    });

});
