const browser = {};

browser.handlePageVisibility = function(onHidden, onShown) {
    let hidden,
        visibilityChange;

    if (typeof document.hidden !== 'undefined') {
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

    function onChange() {
        if (document[hidden]) {
            onHidden();
        } else {
            onShown();
        }
    }

    if (typeof visibilityChange !== 'undefined') {
        document.addEventListener(visibilityChange, onChange, false);
    }
};

browser.handleTouchLock = function(context, onUnlock) {
    const ua = navigator.userAgent,
        locked = !!ua.match(
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|SymbianOS/i);

    function unlock() {
        if (context && context.state === 'suspended') {
            context.resume()
                .then(function() {
                    const buffer = context.createBuffer(1, 1, 22050);
                    const source = context.createBufferSource();
                    source.buffer = buffer;
                    source.connect(context.destination);
                    source.start(0);
                    source.stop(0);
                    source.disconnect();

                    document.body.removeEventListener('touchend', unlock);
                    onUnlock();
                });
        } else {
            document.body.removeEventListener('touchend', unlock);
            onUnlock();
        }
    }

    if (locked) {
        document.body.addEventListener('touchend', unlock, false);
    }

    return locked;
};

export default browser;
