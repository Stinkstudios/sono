module.exports = function(config) {

    const files = [];

    if (process.env.WA === 'no') {
        files.push('test/kill-wa.js');
    }

    if (process.env.TRAVIS) {
        files.push('test/is-travis.js');
    }

    config.set({

        // How long to wait for a message from a browser before disconnecting
        browserNoActivityTimeout: 30000,

        // base path, that will be used to resolve files and exclude
        basePath: '',

        client: {
            mocha: {
                timeout: 10000
            }
        },

        plugins: [
            'karma-mocha',
            'karma-chai',
            'karma-chrome-launcher',
            'karma-firefox-launcher'
        ],

        // frameworks to use
        frameworks: ['mocha', 'chai'],

        // list of files / patterns to load in the browser
        files: files.concat([
            {pattern: 'test/audio/*.ogg', watched: false, included: false, served: true, nocache: false},
            'test/helper.js',
            'dist/sono.js',
            'test/**/*.spec.js'
        ]),

        // list of files to exclude
        exclude: [
            // 'test/playback.spec.js'
        ],

        // test results reporter to use
        // possible values: 'dots', 'progress'
        reporters: ['progress'],

        // web server port
        port: 9876,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR ||
        // config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_WARN,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,

        // Start these browsers, currently available:
        browsers: [
            'Chrome',
            'Firefox'
        ],

        // If browser does not capture in given timeout [ms], kill it
        captureTimeout: 60000,

        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: false
    });
};
