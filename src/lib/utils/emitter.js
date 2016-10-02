import events from 'events';
const {EventEmitter} = events;

export default class Emitter extends EventEmitter {
    constructor() {
        super();
    }

    off (type, listener) {
        if (listener) {
            return this.removeListener(type, listener);
        }
        if (type) {
            return this.removeAllListeners(type);
        }
        return this.removeAllListeners();
    }
}
