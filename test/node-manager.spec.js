'use strict';

var Sono = require('../src/sono.js');
var NodeManager = require('../src/lib/node-manager.js');

function nodeManagerTest(node, name) {

    describe('Node Manager ' + name, function() {

        it('should have expected members (gain, pan)', function() {
            expect(node.gain).to.be.a('function');
            expect(node.gain()).to.be.an('object');

            expect(node.panner).to.be.a('function');
            expect(node.panner()).to.be.an('object');
        });

        it('should have expected members (filters)', function() {
            expect(node.filter).to.be.a('function');

            expect(node.lowpass).to.be.a('function');
            expect(node.lowpass()).to.be.an('object');

            expect(node.highpass).to.be.an('function');
            expect(node.highpass()).to.be.an('object');

            expect(node.bandpass).to.be.an('function');
            expect(node.bandpass()).to.be.an('object');

            expect(node.lowshelf).to.be.an('function');
            expect(node.lowshelf()).to.be.an('object');

            expect(node.highshelf).to.be.an('function');
            expect(node.highshelf()).to.be.an('object');

            expect(node.peaking).to.be.an('function');
            expect(node.peaking()).to.be.an('object');

            expect(node.notch).to.be.an('function');
            expect(node.notch()).to.be.an('object');

            expect(node.allpass).to.be.an('function');
            expect(node.allpass()).to.be.an('object');

        });

        it('should have expected members (effects)', function() {

            expect(node.delay).to.be.a('function');
            expect(node.delay()).to.be.an('object');

            expect(node.convolver).to.be.a('function');
            expect(node.convolver()).to.be.an('object');

            expect(node.reverb).to.be.a('function');
            expect(node.reverb()).to.be.an('object');

            expect(node.echo).to.be.a('function');
            expect(node.echo()).to.be.an('object');

            expect(node.analyser).to.be.a('function');
            expect(node.analyser()).to.be.an('object');

            expect(node.compressor).to.be.a('function');
            expect(node.compressor()).to.be.an('object');

            expect(node.distortion).to.be.a('function');
            expect(node.distortion()).to.be.an('object');

            expect(node.scriptProcessor).to.be.a('function');
            expect(node.scriptProcessor()).to.be.an('object');

        });
    });
}

// test with webaudio
nodeManagerTest(new NodeManager(Sono.context), 'WebAudio');

// test without webaudio
//nodeFactoryTest(nodeFactory(), 'NOT WebAudio');