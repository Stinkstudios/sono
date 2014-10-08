'use strict';

var Sono = require('../src/sono.js');
var NodeManager = require('../src/lib/node-manager.js');

function nodeManagerTest(node, name) {

    describe('Node Manager ' + name, function() {
        var audioNode = window.AudioNode;

        describe('initialization', function() {
            it('should be able to set source and destination', function() {
                node.setSource(Sono.context.createGain());
                node.setDestination(Sono.context.destination);
            });
        });

        describe('add', function() {
            it('should have expected api', function() {
                expect(node.add).to.be.a('function');
                expect(node.add.length).to.eql(1);
            });
            it('should add a node', function() {
                var panner = node.add(Sono.context.createPanner());
                expect(panner).to.be.an.instanceof(audioNode);
                expect(node._nodeList.length).to.eql(1);
                node.remove(panner);
            });
        });

        describe('remove', function() {
            it('should have expected api', function() {
                expect(node.remove).to.be.a('function');
                expect(node.remove.length).to.eql(1);
            });
            it('should remove a node', function() {
                var panner = node.add(Sono.context.createPanner());
                expect(node._nodeList.length).to.eql(1);
                node.remove(panner);
                expect(node._nodeList.length).to.eql(0);
            });
        });

        describe('removeAll', function() {
            it('should have expected api', function() {
                expect(node.removeAll).to.be.a('function');
                expect(node.removeAll.length).to.eql(0);
            });
            it('should remove all nodes', function() {
                node.add(Sono.context.createPanner());
                node.add(Sono.context.createGain());
                expect(node._nodeList.length).to.eql(2);
                node.removeAll();
                expect(node._nodeList.length).to.eql(0);
            });
        });

        describe('panning', function() {
            it('should have expected api', function() {
                expect(node.panning).to.be.an('object');
                expect(node.panning.setDefaults).to.be.a('function');
                expect(node.panning.setListenerPosition).to.be.a('function');
                expect(node.panning.setListenerOrientation).to.be.a('function');
                expect(node.panning.setListenerVelocity).to.be.a('function');
            });
        });

        describe('analyser', function() {
            it('should have expected api', function() {
                expect(node.analyser).to.be.a('function');
                expect(node.analyser.length).to.eql(4);
                expect(node.analyser()).to.be.an.instanceof(audioNode);
            });
        });

        describe('compressor', function() {
            it('should have expected api', function() {
                expect(node.compressor).to.be.a('function');
                expect(node.compressor.length).to.eql(6);
                expect(node.compressor()).to.be.an.instanceof(audioNode);
            });
        });

        describe('convolver', function() {
            it('should have expected api', function() {
                expect(node.convolver).to.be.a('function');
                expect(node.convolver.length).to.eql(1);
                expect(node.convolver()).to.be.an.instanceof(audioNode);
            });
        });

        describe('delay', function() {
            it('should have expected api', function() {
                expect(node.delay).to.be.a('function');
                expect(node.delay.length).to.eql(1);
                expect(node.delay()).to.be.an.instanceof(audioNode);
            });
        });

        describe('distortion', function() {
            it('should have expected api', function() {
                expect(node.distortion).to.be.a('function');
                expect(node.distortion.length).to.eql(1);
                expect(node.distortion()).to.be.an.instanceof(audioNode);
            });
        });

        describe('echo', function() {
            it('should have expected api', function() {
                expect(node.echo).to.be.a('function');
                expect(node.echo.length).to.eql(2);
                expect(node.echo()).to.be.an.instanceof(audioNode);
            });
            it('should add and remove node', function() {
                node.removeAll();
                var echo = node.echo();
                expect(echo).to.be.an.instanceof(audioNode);
                expect(node._nodeList).to.include(echo);
                node.remove(echo);
                expect(node._nodeList).to.not.include(echo);
            });
        });

        describe('filter', function() {
            it('should have expected api', function() {
                expect(node.filter).to.be.a('function');

                expect(node.lowpass).to.be.a('function');
                expect(node.lowpass()).to.be.an.instanceof(audioNode);

                expect(node.highpass).to.be.an('function');
                expect(node.highpass()).to.be.an.instanceof(audioNode);

                expect(node.bandpass).to.be.an('function');
                expect(node.bandpass()).to.be.an.instanceof(audioNode);

                expect(node.lowshelf).to.be.an('function');
                expect(node.lowshelf()).to.be.an.instanceof(audioNode);

                expect(node.highshelf).to.be.an('function');
                expect(node.highshelf()).to.be.an.instanceof(audioNode);

                expect(node.peaking).to.be.an('function');
                expect(node.peaking()).to.be.an.instanceof(audioNode);

                expect(node.notch).to.be.an('function');
                expect(node.notch()).to.be.an.instanceof(audioNode);

                expect(node.allpass).to.be.an('function');
                expect(node.allpass()).to.be.an.instanceof(audioNode);
            });
        });

        describe('gain', function() {
            it('should have expected api', function() {
                expect(node.gain).to.be.a('function');
                expect(node.gain()).to.be.an.instanceof(audioNode);
            });
        });

        describe('panner', function() {
            it('should have expected api', function() {
                expect(node.panner).to.be.a('function');
                var panner = node.panner();
                expect(panner).to.be.an.instanceof(audioNode);
                expect(panner.setListenerPosition).to.be.a('function');
                expect(panner.setListenerOrientation).to.be.a('function');
                expect(panner.setListenerVelocity).to.be.a('function');
                expect(panner.setSourcePosition).to.be.a('function');
                expect(panner.setSourceOrientation).to.be.a('function');
                expect(panner.setSourceVelocity).to.be.a('function');
                expect(panner.calculateVelocity).to.be.a('function');
            });
        });

        describe('recorder', function() {
            it('should have expected api', function() {
                expect(node.recorder).to.be.a('function');
                expect(node.recorder()).to.be.an.instanceof(audioNode);
            }); 
        });

        describe('reverb', function() {
            it('should have expected api', function() {
                expect(node.reverb).to.be.a('function');
                expect(node.reverb()).to.be.an.instanceof(audioNode);
            });
        });

        describe('scriptProcessor', function() {
            it('should have expected api', function() {
                expect(node.scriptProcessor).to.be.a('function');
                expect(node.scriptProcessor()).to.be.an.instanceof(audioNode);
            }); 
        });
       
    });
}

// test with webaudio
nodeManagerTest(new NodeManager(Sono.context), 'WebAudio');

// test without webaudio
//nodeFactoryTest(nodeFactory(), 'NOT WebAudio');