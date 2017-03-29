describe('Destroy', () => {

    let sound;

    beforeEach(() => {
        sono.destroyAll();
    });

    it('should have one sound', () => {
        sound = sono.createSound({
            id: 'sine',
            type: 'sine'
        });
        expect(sono.sounds.length).to.eql(1);
    });

    it('should have zero sounds', () => {
        sound.destroy();
        expect(sono.sounds.length).to.eql(0);
    });

});
