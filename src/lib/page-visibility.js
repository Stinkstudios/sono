'use strict';

var signals = require('signals');

var onPageHidden = new signals.Signal(),
    onPageShown = new signals.Signal(),
    hidden, visibilityChange;

function onVisibilityChange() {
    if (document[hidden]) {
        onPageHidden.dispatch();
    } else {
        onPageShown.dispatch();
    }
}

if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support 
    hidden = 'hidden';
    visibilityChange = 'visibilitychange';
} else if (typeof document.mozHidden !== 'undefined') {
    hidden = 'mozHidden';
    visibilityChange = 'mozvisibilitychange';
} else if (typeof document.msHidden !== 'undefined') {
    hidden = 'msHidden';
    visibilityChange = 'msvisibilitychange';
} else if (typeof document.webkitHidden !== 'undefined') {
    hidden = 'webkitHidden';
    visibilityChange = 'webkitvisibilitychange';
}

if(visibilityChange !== undefined) {
    document.addEventListener(visibilityChange, onVisibilityChange, false);
}

module.exports = {
    onPageShown: onPageShown,
    onPageHidden: onPageHidden
};