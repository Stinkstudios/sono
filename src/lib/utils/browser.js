'use strict';

var Browser = {};

Browser.handlePageVisibility = function(onHidden, onShown, thisArg) {
    var hidden,
        visibilityChange;

    if (typeof document.hidden !== 'undefined') {
        hidden = 'hidden';
        visibilityChange = 'visibilitychange';
    }
    else if (typeof document.mozHidden !== 'undefined') {
        hidden = 'mozHidden';
        visibilityChange = 'mozvisibilitychange';
    }
    else if (typeof document.msHidden !== 'undefined') {
        hidden = 'msHidden';
        visibilityChange = 'msvisibilitychange';
    }
    else if (typeof document.webkitHidden !== 'undefined') {
        hidden = 'webkitHidden';
        visibilityChange = 'webkitvisibilitychange';
    }

    function onChange() {
        if (document[hidden]) {
            onHidden.call(thisArg);
        }
        else {
            onShown.call(thisArg);
        }
    }

    if(visibilityChange !== undefined) {
        document.addEventListener(visibilityChange, onChange, false);
    }
};

Browser.handleTouchLock = function(onUnlock, thisArg) {
    var ua = navigator.userAgent,
        locked = !!ua.match(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i);

    var unlock = function() {
        document.body.removeEventListener('touchstart', unlock);

        if(this._context) {
            var buffer = this._context.createBuffer(1, 1, 22050);
            var unlockSource = this._context.createBufferSource();
            unlockSource.buffer = buffer;
            unlockSource.connect(this._context.destination);
            unlockSource.start(0);
        }

        onUnlock.call(thisArg);

    }.bind(this);

    if(locked) {
        document.body.addEventListener('touchstart', unlock, false);
    }
    return locked;
};

module.exports = Browser;
