export default class Effects {
    constructor(context) {
        this.context = context;
        this._destination = null;
        this._source = null;

        this._nodes = [];
        this._nodes.has = node => this.has(node);
        this._nodes.add = node => this.add(node);
        this._nodes.remove = node => this.remove(node);
        this._nodes.toggle = (node, force) => this.toggle(node, force);
        this._nodes.removeAll = () => this.removeAll();

        Object.keys(Effects.prototype).forEach(key => {
            if (!this._nodes.hasOwnProperty(key) && typeof Effects.prototype[key] === 'function') {
                this._nodes[key] = this[key].bind(this);
            }
        });
    }

    setSource(node) {
        this._source = node;
        this._updateConnections();
        return node;
    }

    setDestination(node) {
        this._connectToDestination(node);
        return node;
    }

    has(node) {
        if (!node) {
            return false;
        }
        return this._nodes.indexOf(node) > -1;
    }

    add(node) {
        if (!node) {
            return null;
        }
        if (this.has(node)) {
            return node;
        }
        if (Array.isArray(node)) {
            let n;
            for (let i = 0; i < node.length; i++) {
                n = this.add(node[i]);
            }
            return n;
        }
        this._nodes.push(node);
        this._updateConnections();
        return node;
    }

    remove(node) {
        if (!node) {
            return null;
        }
        if (!this.has(node)) {
            return node;
        }
        const l = this._nodes.length;
        for (let i = 0; i < l; i++) {
            if (node === this._nodes[i]) {
                this._nodes.splice(i, 1);
                break;
            }
        }
        node.disconnect();
        this._updateConnections();
        return node;
    }

    toggle(node, force) {
        force = !!force;
        const hasNode = this.has(node);
        if (arguments.length > 1 && hasNode === force) {
            return this;
        }
        if (hasNode) {
            this.remove(node);
        } else {
            this.add(node);
        }
        return this;
    }

    removeAll() {
        while (this._nodes.length) {
            const node = this._nodes.pop();
            node.disconnect();
        }
        this._updateConnections();
        return this;
    }

    destroy() {
        this.removeAll();
        this.context = null;
        this._destination = null;
        if (this._source) {
            this._source.disconnect();
        }
        this._source = null;
    }

    _connect(a, b) {
        a.disconnect();
        // console.log('> connect output', (a.name || a.constructor.name), 'to input', (b.name || b.constructor.name));
        a.connect(b._in || b);
    }

    _connectToDestination(node) {
        const lastNode = this._nodes[this._nodes.length - 1] || this._source;

        if (lastNode) {
            this._connect(lastNode, node);
        }

        this._destination = node;
    }

    _updateConnections() {
        if (!this._source) {
            return;
        }

        // console.log('updateConnections');

        let node,
            prev;

        for (let i = 0; i < this._nodes.length; i++) {
            node = this._nodes[i];
            prev = i === 0 ? this._source : this._nodes[i - 1];
            this._connect(prev, node);
        }

        if (this._destination) {
            this._connectToDestination(this._destination);
        }
    }
}
