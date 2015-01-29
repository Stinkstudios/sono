/* jshint strict: false */
var browserify = require('browserify'),
    browserSync = require('browser-sync'),
    chalk = require('chalk'),
    gulp = require('gulp'),
    gulpIf = require('gulp-if'),
    jshint = require('gulp-jshint'),
    rename = require('gulp-rename'),
    source = require('vinyl-source-stream'),
    streamify = require('gulp-streamify'),
    strip = require('gulp-strip-debug'),
    uglify = require('gulp-uglify'),
    watchify = require('watchify');

// log
function logError(msg) {
  console.log(chalk.bold.red('[ERROR] ' + msg.toString()));
}

// bundler
var bundler = watchify(browserify({
  entries: ['./src/sono.js'],
  standalone: 'Sono'
}, watchify.args));

function bundle(debug) {
  return bundler
    .bundle()
    .on('error', logError)
    .pipe(source('sono.js'))
    .pipe(gulp.dest('./dist/'))
    .pipe(rename({ extname: '.min.js' }))
    .pipe(streamify(strip()))
    .pipe(streamify(uglify()))
    .pipe(gulp.dest('./dist/'))
    .pipe(browserSync.reload({ stream: true }));
}

bundler.on('update', bundle); // on any dep update, runs the bundler

gulp.task('bundle', ['jshint'], function() {
  bundle(true);
});

// connect browsers
gulp.task('connect', function() {
  browserSync.init(null, {
    browser: 'google chrome',
    server: {
      baseDir: './',
      startPath: 'examples/index.html'
    },
    reloadDelay: 100
  });
});

// reload browsers
gulp.task('reload', function() {
  browserSync.reload();
});

// build bundled js using browserify
// function buildJS(debug, minify) {
//   var bundleName = minify ? 'sono.min.js' : 'sono.js';

//   return browserify('./src/sono.js', {
//       debug: debug,
//       standalone: 'Sono'
//     })
//     .bundle()
//     .on('error', logError)
//     .pipe(source(bundleName))
//     .pipe(gulpIf(!debug, streamify(strip())))
//     .pipe(gulpIf(minify, streamify(uglify())))
//     .pipe(gulp.dest('./dist/'))
//     .pipe(browserSync.reload({ stream: true }));
// }
// gulp.task('bundle-debug', function() {
//   buildJS(true, false);
//   buildJS(true, true);
// });
// gulp.task('bundle', function() {
//   buildJS(false, false);
//   buildJS(false, true);
// });

// js hint
gulp.task('jshint', function() {
  return gulp.src([
      './gulpfile.js',
      'src/**/*.js',
      'test/**/*.js',
      'examples/**/*.js'
    ])
    .pipe(jshint({
      'node': true,
      'browser': true,
      'es5': false,
      'esnext': true,
      'bitwise': false,
      'camelcase': false,
      'curly': true,
      'eqeqeq': true,
      'immed': true,
      'latedef': true,
      'newcap': true,
      'noarg': true,
      'quotmark': 'single',
      'regexp': true,
      'undef': true,
      'unused': true,
      'strict': true,
      'expr': true, // stops complaints about 'to.be.true' etc in chai

      'predef': [
          'Modernizr',
          'ga',
          'describe',
          'it',
          'expect',
          'beforeEach',
          'afterEach'
      ]
  }))
  .pipe(jshint.reporter('jshint-stylish'));
});

// watch
gulp.task('watch', function() {
  // gulp.watch('src/**/*.js', ['jshint', 'bundle']);
  gulp.watch('test/**/*.js', ['jshint']);
  gulp.watch('examples/**/*.css', ['reload']);
  gulp.watch('examples/**/*.html', ['reload']);
  gulp.watch('examples/**/*.js', ['reload']);
});

// default
// gulp.task('default', ['connect', 'watch']);
gulp.task('default', ['connect', 'watch', 'bundle']);
