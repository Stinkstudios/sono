export default function pageVisibility(onHidden, onShown) {
    let enabled = false;
    let hidden = null;
    let visibilityChange = null;

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

    function enable(value) {
        enabled = value;

        if (enabled) {
            document.addEventListener(visibilityChange, onChange, false);
        } else {
            document.removeEventListener(visibilityChange, onChange);
        }
    }

    if (typeof visibilityChange !== 'undefined') {
        enable(true);
    }

    return {
        get enabled() {
            return enabled;
        },
        set enabled(value) {
            enable(value);
        }
    };
}
