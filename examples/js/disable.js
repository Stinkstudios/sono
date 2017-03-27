if (window.location.search.slice(1) === 'nowebaudio') {
    window.AudioContext = window.webkitAudioContext = undefined;
}
