'use strict';

var HTMLSound = require('../src/lib/html-sound.js');

describe('HTML Sound', function() {
	var htmlSound = new HTMLSound();

	it('should have name prop', function() {
		expect(htmlSound).to.have.property('name');
	});

    it('should have play fn', function() {
        expect(htmlSound.play).to.be.a('function');
    });
});
