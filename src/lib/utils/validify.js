function number(value, defaultValue) {
    if (arguments.length < 2) {
        defaultValue = 0;
    }
    if (typeof value !== 'number' || isNaN(value)) {
        return defaultValue;
    }
    return value;
}

export {number};
