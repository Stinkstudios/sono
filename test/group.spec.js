describe('Group', function() {

    describe('createGroup', function() {
        it('should have expected api', function() {
            expect(sono.createGroup).to.be.a('function');
            expect(sono.createGroup.length).to.eql(1);
        });
        it('should return new Group', function() {
            const group = sono.createGroup();
            expect(group).to.exist;
        });
    });

    describe('add sound', function() {
        var sound;

        beforeEach(function(done) {
            sound = sono.load({
                id: 'foo',
                url: [
                    window.baseURL + 'bullet.ogg',
                    window.baseURL + 'bullet.mp3'
                ],
                onComplete: function() {
                    done();
                }
            });
        });

        afterEach(function() {
            sono.destroySound(sound.id);
        });

        it('should return new Group', function() {
            const group = sono.createGroup();
            expect(group).to.exist;
            group.add(sound);
            expect(group.sounds.length).to.eql(1);
        });
    });

    describe('control', function() {
        const group = sono.createGroup();

        it('should have zero volume', function() {
            group.volume = 0;
            expect(group.volume).to.eql(0);
        });

        it('should have 1 volume', function() {
            group.volume = 1;
            expect(group.volume).to.eql(1);
        });
    });

});
