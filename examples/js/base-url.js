window.isLocalHost = /^(?:https?:\/\/)?(?:localhost|192\.168)/.test(window.location.href);
window.baseURL = window.isLocalHost ? '/examples/audio/' : 'https://ianmcgregor.co/prototypes/audio/';
