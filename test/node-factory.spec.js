'use strict';

var Sono = require('../src/sono.js');
var nodeFactory = require('../src/lib/node-factory.js');

function nodeFactoryTest(create, name) {

    describe('Node Factory ' + name, function() {

        it('should have expected members (gain, pan)', function() {
            expect(create.gain).to.be.a('function');
            expect(create.gain()).to.be.an('object');

            expect(create.pan).to.be.a('function');
            expect(create.pan()).to.be.an('object');
        });

        it('should have expected members (filters)', function() {
            expect(create.filter).to.be.a('object');

            expect(create.filter.lowpass).to.be.a('function');
            expect(create.filter.lowpass()).to.be.an('object');

            expect(create.filter.highpass).to.be.an('function');
            expect(create.filter.highpass()).to.be.an('object');

            expect(create.filter.bandpass).to.be.an('function');
            expect(create.filter.bandpass()).to.be.an('object');

            expect(create.filter.lowshelf).to.be.an('function');
            expect(create.filter.lowshelf()).to.be.an('object');

            expect(create.filter.highshelf).to.be.an('function');
            expect(create.filter.highshelf()).to.be.an('object');

            expect(create.filter.peaking).to.be.an('function');
            expect(create.filter.peaking()).to.be.an('object');

            expect(create.filter.notch).to.be.an('function');
            expect(create.filter.notch()).to.be.an('object');

            expect(create.filter.allpass).to.be.an('function');
            expect(create.filter.allpass()).to.be.an('object');

        });

        it('should have expected members (effects)', function() {

            expect(create.delay).to.be.a('function');
            expect(create.delay()).to.be.an('object');

            expect(create.convolver).to.be.a('function');
            expect(create.convolver()).to.be.an('object');

            expect(create.reverb).to.be.a('function');
            expect(create.reverb()).to.be.an('object');

            expect(create.impulseResponse).to.be.a('function');
            expect(create.impulseResponse()).to.exist;

            expect(create.analyser).to.be.a('function');
            expect(create.analyser()).to.be.an('object');

            expect(create.compressor).to.be.a('function');
            expect(create.compressor()).to.be.an('object');

            expect(create.distortion).to.be.a('function');
            expect(create.distortion()).to.be.an('object');

            expect(create.scriptProcessor).to.be.a('function');
            expect(create.scriptProcessor()).to.be.an('object');

            expect(create.microphoneSource).to.be.a('function');
        });
    });
}

// test with webaudio
nodeFactoryTest(nodeFactory(Sono.context), 'WebAudio');

// test without webaudio
nodeFactoryTest(nodeFactory(), 'NOT WebAudio');