'use strict';

var Source = require('./source.js');

function BufferSource(buffer, context) {
    Source.call(this, buffer, context);
}

BufferSource.prototype = Object.create(Source.prototype);
BufferSource.prototype.constructor = BufferSource;

/*
 * Controls
 */

// BufferSource.prototype.play = function(delay, offset) {
//     Source.prototype.play.call(this, delay, offset);
// };

// BufferSource.prototype.pause = function() {
//     Source.prototype.pause.call(this);
// };

// BufferSource.prototype.stop = function() {
//     Source.prototype.stop.call(this);
// };

/*
 * Ended handler
 */

// BufferSource.prototype.onEnded = function(fn, context) {
//     Source.prototype.onEnded.call(this, fn, context);
// };

// BufferSource.prototype._endedHandler = function() {
//     Source.prototype._endedHandler.call(this);
// };

/*
 * Destroy
 */

// BufferSource.prototype.destroy = function() {
//     Source.prototype.foo.call(this);
// };

/*
 * Getters & Setters
 */

Object.defineProperties(BufferSource.prototype, {
    'sourceNode': {
        get: function() {
            if(!this._sourceNode) {
                this._sourceNode = this._context.createBufferSource();
                this._sourceNode.buffer = this._data;
            }
            return this._sourceNode;
        }
    }
});

module.exports = BufferSource;
