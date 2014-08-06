'use strict';

var Sono = require('../src/sono.js');
var WebAudioPlayer = require('../src/lib/webaudio-player.js');

describe('WebAudio Player', function() {
    var player = new WebAudioPlayer(Sono.context);

    it('should have expected API', function() {
        expect(player).to.have.property('id');
        expect(player.add).to.be.a('function');

        expect(player.play).to.be.a('function');
        expect(player.pause).to.be.a('function');
        expect(player.stop).to.be.a('function');

        expect(player.onEnded).to.be.a('function');
        expect(player.addEndedListener).to.be.a('function');
        expect(player.removeEndedListener).to.be.a('function');

        expect(player.loop).to.be.a('boolean');
        expect(player.duration).to.be.a('number');
        expect(player.currentTime).to.be.a('number');
        expect(player.progress).to.be.a('number');
        expect(player.volume).to.be.a('number');
        expect(player.playing).to.be.a('boolean');
        expect(player.paused).to.be.a('boolean');

        expect(player.getSource).to.be.a('function');
        expect(player.addNode).to.be.a('function');
        expect(player.removeNode).to.be.a('function');
        expect(player.updateConnections).to.be.a('function');
        expect(player.connectTo).to.be.a('function');
    });
});
