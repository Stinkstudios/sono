'use strict';

var Sono = require('../src/sono.js');
var Effect = require('../src/lib/effect.js');

function effectTest(isWebAudio) {

    var name = isWebAudio ? 'Web Audio' : 'No Web Audio';

    describe('Effect (' + name + ')', function() {

        var effect = isWebAudio ? new Effect(Sono.context) : new Effect();
        var audioContext = effect._context;
        var audioNode = isWebAudio ? window.AudioNode : Object;

        describe('initialization', function() {
            it('should be able to set source and destination', function() {
                effect.setSource(effect.gain());
                effect.setDestination(audioContext.destination);
            });
        });

        describe('add', function() {
            it('should have expected api', function() {
                expect(effect.add).to.be.a('function');
                expect(effect.add.length).to.eql(1);
            });
            it('should add a node', function() {
                var panner = effect.add(effect.gain());
                expect(panner).to.be.an.instanceof(audioNode);
                expect(effect._nodeList.length).to.eql(1);
                effect.remove(panner);
            });
        });

        describe('remove', function() {
            it('should have expected api', function() {
                expect(effect.remove).to.be.a('function');
                expect(effect.remove.length).to.eql(1);
            });
            it('should remove a node', function() {
                var panner = effect.add(audioContext.createPanner());
                expect(effect._nodeList.length).to.eql(1);
                effect.remove(panner);
                expect(effect._nodeList.length).to.eql(0);
            });
        });

        describe('removeAll', function() {
            it('should have expected api', function() {
                expect(effect.removeAll).to.be.a('function');
                expect(effect.removeAll.length).to.eql(0);
            });
            it('should remove all nodes', function() {
                effect.add(audioContext.createPanner());
                effect.add(audioContext.createGain());
                expect(effect._nodeList.length).to.eql(2);
                effect.removeAll();
                expect(effect._nodeList.length).to.eql(0);
            });
        });

        describe('panning', function() {
            it('should have expected api', function() {
                expect(effect.panning).to.be.an('object');
                expect(effect.panning.setDefaults).to.be.a('function');
                expect(effect.panning.setListenerPosition).to.be.a('function');
                expect(effect.panning.setListenerOrientation).to.be.a('function');
                expect(effect.panning.setListenerVelocity).to.be.a('function');
            });
        });

        describe('analyser', function() {
            it('should have expected api', function() {
                expect(effect.analyser).to.be.a('function');
                expect(effect.analyser.length).to.eql(4);
                expect(effect.analyser()).to.be.an.instanceof(audioNode);
            });
        });

        describe('compressor', function() {
            it('should have expected api', function() {
                expect(effect.compressor).to.be.a('function');
                expect(effect.compressor.length).to.eql(6);
                expect(effect.compressor()).to.be.an.instanceof(audioNode);
            });
        });

        describe('convolver', function() {
            it('should have expected api', function() {
                expect(effect.convolver).to.be.a('function');
                expect(effect.convolver.length).to.eql(1);
                expect(effect.convolver()).to.be.an.instanceof(audioNode);
            });
        });

        describe('delay', function() {
            it('should have expected api', function() {
                expect(effect.delay).to.be.a('function');
                expect(effect.delay.length).to.eql(1);
                expect(effect.delay()).to.be.an.instanceof(audioNode);
            });
        });

        describe('distortion', function() {
            it('should have expected api', function() {
                expect(effect.distortion).to.be.a('function');
                expect(effect.distortion.length).to.eql(1);
                expect(effect.distortion()).to.be.an.instanceof(audioNode);
            });
        });

        describe('echo', function() {
            it('should have expected api', function() {
                expect(effect.echo).to.be.a('function');
                expect(effect.echo.length).to.eql(2);
                expect(effect.echo()).to.be.an.instanceof(audioNode);
            });
            it('should add and remove node', function() {
                effect.removeAll();
                var echo = effect.echo();
                expect(echo).to.be.an.instanceof(audioNode);
                expect(effect._nodeList).to.include(echo);
                effect.remove(echo);
                expect(effect._nodeList).to.not.include(echo);
            });
        });

        describe('filter', function() {
            it('should have expected api', function() {
                expect(effect.filter).to.be.a('function');

                expect(effect.lowpass).to.be.a('function');
                expect(effect.lowpass()).to.be.an.instanceof(audioNode);

                expect(effect.highpass).to.be.an('function');
                expect(effect.highpass()).to.be.an.instanceof(audioNode);

                expect(effect.bandpass).to.be.an('function');
                expect(effect.bandpass()).to.be.an.instanceof(audioNode);

                expect(effect.lowshelf).to.be.an('function');
                expect(effect.lowshelf()).to.be.an.instanceof(audioNode);

                expect(effect.highshelf).to.be.an('function');
                expect(effect.highshelf()).to.be.an.instanceof(audioNode);

                expect(effect.peaking).to.be.an('function');
                expect(effect.peaking()).to.be.an.instanceof(audioNode);

                expect(effect.notch).to.be.an('function');
                expect(effect.notch()).to.be.an.instanceof(audioNode);

                expect(effect.allpass).to.be.an('function');
                expect(effect.allpass()).to.be.an.instanceof(audioNode);
            });
        });

        describe('gain', function() {
            it('should have expected api', function() {
                expect(effect.gain).to.be.a('function');
                expect(effect.gain()).to.be.an.instanceof(audioNode);
            });
        });

        describe('panner', function() {
            it('should have expected api', function() {
                expect(effect.panner).to.be.a('function');
                var panner = effect.panner();
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
                expect(effect.recorder).to.be.a('function');
                expect(effect.recorder()).to.be.an.instanceof(audioNode);
            }); 
        });

        describe('reverb', function() {
            it('should have expected api', function() {
                expect(effect.reverb).to.be.a('function');
                expect(effect.reverb()).to.be.an.instanceof(audioNode);
            });
        });

        describe('scriptProcessor', function() {
            it('should have expected api', function() {
                expect(effect.scriptProcessor).to.be.a('function');
                expect(effect.scriptProcessor()).to.be.an.instanceof(audioNode);
            }); 
        });
       
    });
}

// test with webaudio
effectTest(true);

// test without webaudio
effectTest(false);
