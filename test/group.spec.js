'use strict';

var Sono = require('../src/sono.js');

var baseURL = 'http://ianmcgregor.me/prototypes/assets/audio/';

describe('Group', function() {

    describe('createGroup', function() {
        it('should have expected api', function() {
            expect(Sono.createGroup).to.be.a('function');
            expect(Sono.createGroup.length).to.eql(1);
        });
        it('should return new Group', function() {
            var group = Sono.createGroup();
            expect(group).to.exist;
        });
    });

    describe('add sound', function() {
        var sound;

        beforeEach(function(done) {
            sound = Sono.load({
                id: 'foo',
                url: [
                    baseURL + 'bullet.ogg',
                    baseURL + 'bullet.mp3'
                ],
                onComplete: function() {
                    done();
                }
            });
        });

        afterEach(function() {
            Sono.destroySound(sound.id);
        });

        it('should return new Group', function() {
            var group = Sono.createGroup();
            expect(group).to.exist;
            group.add(sound);
            expect(group.sounds.length).to.eql(1);
        });
    });

});
