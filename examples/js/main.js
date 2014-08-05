(function() {
    'use strict';

    console.log('Sono:', Sono);

    var url;
    //url = sounds[Math.floor(Math.random() * sounds.length)];
    // will load this file
    //url = 'audio/TEST.ogg';
    // will load first key compatible with browser
    //url = { foo: 'audio/TEST.ogg', bar: 'audio/TEST.mp3' };
    // will load first index compatible with browser
    url = ['audio/TEST.ogg', 'audio/TEST.mp3'];
    // will add first compatible extension
    //url = 'audio/TEST';

    var soundLoadProgress = function(progress) {
        console.log('soundLoadProgress', progress);
    };

    var soundLoaded = function(sound) {
        console.log('soundLoaded', sound.name);
        //sound.play();
    };
    // test no WebAudio
    //SONO.context = null;
    var sound = Sono.load('test', url, false, soundLoaded, this, false).play();
    sound.loader.onProgress.add(soundLoadProgress, this);
    //this.sound.loop = true;
    //this.sound.addNode(SONO.create.reverb(0.2, 0.5));
    var delay = Sono.create.delay(sound._gain, 0.5, 0.5);

}());