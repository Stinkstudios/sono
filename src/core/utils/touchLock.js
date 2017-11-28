import iOS from './iOS';
import dummy from './dummy';

export default function touchLock(context, callback) {
    const locked = iOS;

    function unlock() {
        if (context && context.state === 'suspended') {
            context.resume()
                .then(() => {
                    dummy(context);
                    unlocked();
                });
        } else {
            unlocked();
        }
    }

    function unlocked() {
        document.body.removeEventListener('touchstart', unlock);
        document.body.removeEventListener('touchend', unlock);
        callback();
    }

    function addListeners() {
        document.body.addEventListener('touchstart', unlock, false);
        document.body.addEventListener('touchend', unlock, false);
    }

    if (locked) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addListeners);
        } else {
            addListeners();
        }
    }

    return locked;
}
