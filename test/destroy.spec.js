describe('Destroy', function() {

    var sound;

    beforeEach(function() {
        sono.destroyAll();
    });

    it('should have one sound', function() {
        sound = sono.createSound({
            id: 'sine',
            type: 'sine'
        });
        expect(sono.sounds.length).to.eql(1);
    });

    it('should have zero sounds', function() {
        sound.destroy();
        expect(sono.sounds.length).to.eql(0);
    });

});
