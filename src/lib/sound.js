'use strict';

var BufferSource = require('./buffer-source.js'),
    MediaSource = require('./media-source.js'),
    nodeFactory = require('./node-factory.js');

function Sound(context, data, destination) {
    this.id = '';
    this._context = context;
    this._data = null;
    this._endedCallback = null;
    this._loop = false;
    this._nodeList = [];
    this._pausedAt = 0;
    this._playWhenReady = false;
    this._source = null;
    this._sourceNode = null;
    this._startedAt = 0;

    this._gain = nodeFactory(this._context).gain();
    this._gain.connect(destination || this._context.destination);

    this.add(data);
}

Sound.prototype.add = function(data) {
    if(!data) { return this; }
    this._data = data; // AudioBuffer or Media Element
    //console.log('data:', this._data);
    if(this._data.tagName) {
      this._source = new MediaSource(data, this._context);
    }
    else {
      this._source = new BufferSource(data, this._context);
    }
    this._createSourceNode();
    this._source.onEnded(this._endedHandler, this);

    // should this take account of delay and offset?
    if(this._playWhenReady) {
        this.play();
    }
    return this;
};

/*
 * Controls
 */

Sound.prototype.play = function(delay, offset) {
    if(!this._source) {
        this._playWhenReady = true;
        return this;
    }
    this._createSourceNode();
    this._source.loop = this._loop;

    // update volume needed for no webaudio
    if(!this._context) { this.volume = this.volume; }

    this._source.play(delay, offset);

    return this;
};

Sound.prototype.pause = function() {
    if(!this._source) { return this; }
    this._source.pause();
    return this;  
};

Sound.prototype.stop = function() {
    if(!this._source) { return this; }
    this._source.stop();
    return this;
};

Sound.prototype.seek = function(percent) {
    if(!this._source) { return this; }
    this.stop();
    this.play(0, this._source.duration * percent);
    return this;
};

/*
 * Nodes
 */

Sound.prototype.addNode = function(node) {
    this._nodeList.push(node);
    this._updateConnections();
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
    this._updateConnections();
    return this;
};

// should source be item 0 in nodelist and desination last
// prob is addNode needs to add before destination
// + should it be called chain or something nicer?
// feels like node list could be a linked list??
// if list.last is destination addbefore

/*Sound.prototype._updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    var l = this._nodeList.length;
    for (var i = 1; i < l; i++) {
      this._nodeList[i-1].connect(this._nodeList[i]);
    }
};*/
/*Sound.prototype._updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    console.log('_updateConnections');
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
Sound.prototype._updateConnections = function() {
    if(!this._sourceNode) {
        return;
    }
    //console.log('_updateConnections');
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
    else if(this._sourceNode) {
        //console.log(' x connect source to node:', node);
        //this._sourceNode.disconnect(0);
        this._sourceNode.connect(node);
    }
    this.destination = node;

    return this;
};

Sound.prototype._createSourceNode = function() {
    //console.log('get source', this._sourceNode);
    if(!this._context) {
        return;
    }

    this._sourceNode = this._source.sourceNode;
    this._updateConnections();

    return this._sourceNode;
};

/*
 * Ended handler
 */

Sound.prototype.onEnded = function(fn, context) {
    this._endedCallback = fn ? fn.bind(context || this) : null;
    return this;
};

Sound.prototype._endedHandler = function() {
    if(typeof this._endedCallback === 'function') {
        this._endedCallback(this);
    }
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
        return this._gain.gain.value;
    },
    set: function(value) {
        if(isNaN(value)) { return; }

        this._gain.gain.value = value;

        if(this._data && this._data.volume !== undefined) {
            this._data.volume = value;
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
