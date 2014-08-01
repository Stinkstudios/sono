'use strict';

var WebAudioSound = require('./webaudio-sound.js'),
    HTMLSound = require('./html-sound.js');

function WebAudioPlayer(context, buffer, destination) {
    this.name = '';
    this._context = context;
    this._source = null; // AudioBufferSourceNode
    this._nodeList = [];
    this._gain = this._context.createGain();
    this._gain.connect(destination || this._context.destination);
    this._loop = false;
    this._startedAt = 0;
    this._pausedAt = 0;
    this._playWhenReady = false;
    this._onEnded = null;

    this.add(buffer);
}

WebAudioPlayer.prototype.add = function(buffer) {
    if(!buffer) { return; }
    this._buffer = buffer; // AudioBuffer or Media Element

    if(this._buffer.tagName) {
      this._sound = new HTMLSound(buffer);
      this.getSource();
    }
    else {
      this._sound = new WebAudioSound(buffer, this._context);
      this.getSource();
    }
    this._sound.addEndedListener(this.onEnded, this);

    // should this take account of delay and offset?
    if(this._playWhenReady) {
        this.play();
    }
};

WebAudioPlayer.prototype.play = function(delay, offset) {
    if(!this._sound) {
        this._playWhenReady = true;
        return this;
    }
    this.getSource();
    this._sound.loop = this._loop;

    // volume update?
    this._sound.play(delay, offset);
};

WebAudioPlayer.prototype.pause = function() {
    this._sound.pause();
};

WebAudioPlayer.prototype.stop = function() {
  this._sound.stop();
};

WebAudioPlayer.prototype.addNode = function(node) {
    this._nodeList.push(node);
    this.updateConnections();
    return node;
};

WebAudioPlayer.prototype.removeNode = function(node) {
    var l = this._nodeList.length;
    for (var i = 0; i < l; i++) {
        if(node === this._nodeList[i]) {
            this._nodeList.splice(i, 1);
        }
    }
    node.disconnect(0);
    this.updateConnections();
};

// should source be item 0 in nodelist and desination last
// prob is addNode needs to add before destination
// + should it be called chain or something nicer?
// feels like node list could be a linked list??
// if list.last is destination addbefore

/*WebAudioPlayer.prototype.updateConnections = function() {
    if(!this._source) {
        return;
    }
    var l = this._nodeList.length;
    for (var i = 1; i < l; i++) {
      this._nodeList[i-1].connect(this._nodeList[i]);
    }
};*/
/*WebAudioPlayer.prototype.updateConnections = function() {
    if(!this._source) {
        return;
    }
    console.log('updateConnections');
    this._source.disconnect(0);
    this._source.connect(this._gain);
    var l = this._nodeList.length;

    for (var i = 0; i < l; i++) {
        if(i === 0) {
            console.log(' - connect source to node:', this._nodeList[i]);
            this._gain.disconnect(0);
            this._gain.connect(this._nodeList[i]);
        }
        else {
            console.log('connect:', this._nodeList[i-1], 'to', this._nodeList[i]);
            this._nodeList[i-1].disconnect(0);
            this._nodeList[i-1].connect(this._nodeList[i]);
        }
    }
    this.connectTo(this._context.destination);
};*/
WebAudioPlayer.prototype.updateConnections = function() {
    if(!this._source) {
        return;
    }
    //console.log('updateConnections');
    var l = this._nodeList.length;
    for (var i = 0; i < l; i++) {
        if(i === 0) {
            //console.log(' - connect source to node:', this._nodeList[i]);
            //this._source.disconnect(0);
            this._source.connect(this._nodeList[i]);
        }
        else {
            //console.log('connect:', this._nodeList[i-1], 'to', this._nodeList[i]);
            //this._nodeList[i-1].disconnect(0);
            this._nodeList[i-1].connect(this._nodeList[i]);
        }
    }
    //console.log(this.destination)
    if(this.destination) {
        this.connectTo(this.destination);
    }
    else if (this._gain) {
        this.connectTo(this._gain);
    }
};

// or setter for destination?
/*WebAudioPlayer.prototype.connectTo = function(node) {
    var l = this._nodeList.length;
    if(l > 0) {
      console.log('connect:', this._nodeList[l - 1], 'to', node);
        this._nodeList[l - 1].disconnect(0);
        this._nodeList[l - 1].connect(node);
    }
    else {
        console.log(' x connect source to node:', node);
        this._gain.disconnect(0);
        this._gain.connect(node);
    }
    this.destination = node;
};*/
WebAudioPlayer.prototype.connectTo = function(node) {
    var l = this._nodeList.length;
    if(l > 0) {
        //console.log('connect:', this._nodeList[l - 1], 'to', node);
        //this._nodeList[l - 1].disconnect(0);
        this._nodeList[l - 1].connect(node);
    }
    else {
        //console.log(' x connect source to node:', node);
        //this._source.disconnect(0);
        this._source.connect(node);
    }
    this.destination = node;
};

WebAudioPlayer.prototype.onEnded = function() {
    //console.log('p onended');
    //this.stop();
    if(typeof this._onEnded === 'function') {

        this._onEnded();
    }
};

WebAudioPlayer.prototype.addEndedListener = function(fn, context) {
    this._onEnded = fn.bind(context || this);
};

WebAudioPlayer.prototype.removeEndedListener = function() {
    this._onEnded = null;
};

WebAudioPlayer.prototype.getSource = function() {
    //console.log('get source', this._source);
    if(this._buffer.tagName) {
        // audio or video tag
        if(!this._source) {
            this._source = this._context.createMediaElementSource(this._buffer);
            this.updateConnections();
        }
    }
    else {
        // array buffer
        this._source = this._sound.source;
        this.updateConnections();
    }
    return this._source;
};

/*
 * Getters & Setters
 */

/*
 * TODO: set up so source can be stream, oscillator, etc
 */


Object.defineProperty(WebAudioPlayer.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = !!value;
        if(this._sound) {
          this._sound.loop = this._loop;
        }
    }
});

Object.defineProperty(WebAudioPlayer.prototype, 'duration', {
    get: function() {
        return this._sound.duration;
    }
});

Object.defineProperty(WebAudioPlayer.prototype, 'currentTime', {
    get: function() {
        return this._sound.currentTime;
    }
});

Object.defineProperty(WebAudioPlayer.prototype, 'progress', {
  get: function() {
    return this._sound.progress;
  }
});

Object.defineProperty(WebAudioPlayer.prototype, 'volume', {
    get: function() {
        return this._gain.gain.value;
    },
    set: function(value) {
        if(isNaN(value)) { return; }
        this._gain.gain.value = value;
    }
});

Object.defineProperty(WebAudioPlayer.prototype, 'playing', {
    get: function() {
        return this._sound.playing;
    }
});

Object.defineProperty(WebAudioPlayer.prototype, 'paused', {
    get: function() {
        return this._sound.paused;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = WebAudioPlayer;
}
