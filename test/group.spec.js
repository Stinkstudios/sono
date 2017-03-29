describe('Group', () => {

    describe('group', () => {
        it('should have expected api', () => {
            expect(sono.group).to.be.a('function');
            expect(sono.group.length).to.eql(1);
        });
        it('should return new Group', () => {
            const group = sono.group();
            expect(group).to.exist;
        });
    });

    describe('add sound', () => {
        let sound;

        beforeEach((done) => {
            sono.load({
                id: 'foo',
                url: [
                    '/base/test/audio/blip.ogg',
                    '/base/test/audio/blip.mp3'
                ],
                onComplete: function(s) {
                    sound = s;
                    done();
                }
            });
        });

        afterEach(() => {
            sono.destroy(sound.id);
        });

        it('should return new Group', () => {
            const group = sono.group();
            expect(group).to.exist;
            group.add(sound);
            expect(group.sounds.length).to.eql(1);
        });
    });

    describe('control', () => {
        const group = sono.group();

        it('should have zero volume', () => {
            group.volume = 0;
            expect(group.volume).to.eql(0);
        });

        it('should have 1 volume', () => {
            group.volume = 1;
            expect(group.volume).to.eql(1);
        });
    });

});
