export default function isSafeNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}
