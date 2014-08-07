'use strict';

var BufferSource = require('./buffer-source.js'),
    ElementSource = require('./element-source.js');

function Sound(context, data, destination) {
    this.id = '';
    this._context = context;
    this._loop = false;
    this._nodeList = [];
    this._onEnded = null;
    this._pausedAt = 0;
    this._playWhenReady = false;
    this._source = null;
    this._sourceNode = null;
    this._startedAt = 0;

    if(this._context) {
        this._gain = this._context.createGain();
        this._gain.connect(destination || this._context.destination);
    }

    this.add(data);
}

Sound.prototype.add = function(data) {
    if(!data) { return; }
    this._data = data; // AudioBuffer or Media Element
    console.log('data:', this._data);
    if(this._data.tagName) {
      this._source = new ElementSource(data);
    }
    else {
      this._source = new BufferSource(data, this._context);
    }
    this.createSourceNode();
    this._source.addEndedListener(this.onEnded, this);

    // should this take account of delay and offset?
    if(this._playWhenReady) {
        this.play();
    }
};

Sound.prototype.play = function(delay, offset) {
    if(!this._source) {
        this._playWhenReady = true;
        return this;
    }
    this.createSourceNode();
    this._source.loop = this._loop;

    // volume update?
    this._source.play(delay, offset);
};

Sound.prototype.pause = function() {
    if(!this._source) { return; }
    this._source.pause();
};

Sound.prototype.stop = function() {
    if(!this._source) { return; }
    this._source.stop();
};

Sound.prototype.addNode = function(node) {
    this._nodeList.push(node);
    this.updateConnections();
    return node;
};

Sound.prototype.removeNode = function(node) {
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

/*Sound.prototype.updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    var l = this._nodeList.length;
    for (var i = 1; i < l; i++) {
      this._nodeList[i-1].connect(this._nodeList[i]);
    }
};*/
/*Sound.prototype.updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    console.log('updateConnections');
    this._sourceNode.disconnect(0);
    this._sourceNode.connect(this._gain);
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
Sound.prototype.updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    //console.log('updateConnections');
    var l = this._nodeList.length;
    for (var i = 0; i < l; i++) {
        if(i === 0) {
            //console.log(' - connect source to node:', this._nodeList[i]);
            //this._sourceNode.disconnect(0);
            this._sourceNode.connect(this._nodeList[i]);
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
/*Sound.prototype.connectTo = function(node) {
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
Sound.prototype.connectTo = function(node) {
    var l = this._nodeList.length;
    if(l > 0) {
        //console.log('connect:', this._nodeList[l - 1], 'to', node);
        //this._nodeList[l - 1].disconnect(0);
        this._nodeList[l - 1].connect(node);
    }
    else {
        //console.log(' x connect source to node:', node);
        //this._sourceNode.disconnect(0);
        this._sourceNode.connect(node);
    }
    this.destination = node;
};

Sound.prototype.onEnded = function() {
    //console.log('p onended');
    //this.stop();
    if(typeof this._onEnded === 'function') {

        this._onEnded();
    }
};

Sound.prototype.addEndedListener = function(fn, context) {
    this._onEnded = fn.bind(context || this);
};

Sound.prototype.removeEndedListener = function() {
    this._onEnded = null;
};

Sound.prototype.createSourceNode = function() {
    //console.log('get source', this._sourceNode);
    if(!this._context) {
        return;
    }
    else if(this._data.tagName) {
        // audio or video tag
        if(!this._sourceNode) {
            this._sourceNode = this._context.createMediaElementSource(this._data);
            this.updateConnections();
        }
    }
    else {
        // array buffer source
        this._sourceNode = this._source.source;
        this.updateConnections();
    }
    return this._sourceNode;
};

/*
 * Getters & Setters
 */

/*
 * TODO: set up so source can be stream, oscillator, etc
 */


Object.defineProperty(Sound.prototype, 'loop', {
    get: function() {
        return this._loop;
    },
    set: function(value) {
        this._loop = !!value;
        if(this._source) {
          this._source.loop = this._loop;
        }
    }
});

Object.defineProperty(Sound.prototype, 'duration', {
    get: function() {
        return this._source ? this._source.duration : 0;
    }
});

Object.defineProperty(Sound.prototype, 'currentTime', {
    get: function() {
        return this._source ? this._source.currentTime : 0;
    }
});

Object.defineProperty(Sound.prototype, 'progress', {
  get: function() {
    return this._source ? this._source.progress : 0;
  }
});

Object.defineProperty(Sound.prototype, 'volume', {
    get: function() {
        return this._gain ? this._gain.gain.value : this._source.volume;
    },
    set: function(value) {
        if(isNaN(value)) { return; }

        if(this._gain) {
            this._gain.gain.value = value;
        }
        else {
            this._source.volume = value;
        }
    }
});

Object.defineProperty(Sound.prototype, 'playing', {
    get: function() {
        return this._source ? this._source.playing : false;
    }
});

Object.defineProperty(Sound.prototype, 'paused', {
    get: function() {
        return this._source ? this._source.paused : false;
    }
});

/*
 * Exports
 */

if (typeof module === 'object' && module.exports) {
    module.exports = Sound;
}
