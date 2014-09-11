/* jshint strict: false */
var autoprefix = require('gulp-autoprefixer'),
    browserify = require('browserify'),
    browserSync = require('browser-sync'),
    chalk = require('chalk'),
    csslint = require('gulp-csslint'),
    gulp = require('gulp'),
    gulpIf = require('gulp-if'),
    jshint = require('gulp-jshint'),
    minifyCSS = require('gulp-minify-css'),
    rename = require('gulp-rename'),
    rework = require('gulp-rework'),
    source = require('vinyl-source-stream'),
    streamify = require('gulp-streamify'),
    strip = require('gulp-strip-debug'),
    suit = require('rework-suit'),
    uglify = require('gulp-uglify');

// paths and file names
var src = './src/',
    dist = './dist/',
    index = 'sono.js',
    bundle = 'sono.js',
    bundleMin = 'sono.min.js';

//log
function logError(msg) {
  console.log(chalk.bold.red('[ERROR] ' + msg.toString()));
}

// build bundled js using browserify
function buildJS(debug, minify) {
  var bundleName = minify ? bundleMin : bundle;

  var bundler = browserify(src + index);
  return bundler.bundle({debug: debug, standalone: 'Sono'})
    .on('error', logError)
    .pipe(source(bundleName))
    .pipe(gulpIf(!debug, streamify(strip())))
    .pipe(gulpIf(minify, streamify(uglify())))
    .pipe(gulp.dest(dist))
    .pipe(browserSync.reload({ stream: true }));
}
gulp.task('bundle-debug', function() {
  buildJS(true, false);
  buildJS(true, true);
});
gulp.task('bundle', function() {
  buildJS(false, false);
  buildJS(false, true);
});

// js hint - ignore libraries and bundled
gulp.task('jshint', function() {
  return gulp.src([
      './gulpfile.js',
      src+'**/*.js',
      'test/**/*.js'
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
      'expr': true, // stops complaints about 'to.be.true' etc in tests

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

var cssSrc = 'examples/css/',
    cssIndex = 'main.css',
    cssDist = 'examples/css/',
    cssBundle = 'styles.css';

// build css using minify and autoprefixer
gulp.task('css', function() {
  gulp.src(cssSrc+cssIndex)
    .on('error', logError)
    .pipe(minifyCSS({ keepBreaks: true }))
    .pipe(rework(
      suit()
    ))
    .on('error', logError)
    .pipe(autoprefix('last 1 version'))
    .on('error', logError)
    .pipe(rename(cssBundle))
    .pipe(gulp.dest(cssDist))
    .pipe(browserSync.reload({ stream: true }));
});

// csslint - ignore bundled
gulp.task('csslint', function() {
  gulp.src([
      cssSrc+'**/*.css',
      '!'+cssSrc+cssIndex,
      '!'+cssDist+cssBundle
    ])
    .pipe(csslint({
      'adjoining-classes': false,
      'box-model': false,
      'box-sizing': false,
      'compatible-vendor-prefixes': false,
      'bulletproof-font-face': false,
      'empty-rules': false,
      'font-faces': false,
      'font-sizes': false,
      'important': false,
      'known-properties': false,
      'outline-none': false,
      'regex-selectors': false,
      'star-property-hack': false,
      'unique-headings': false,
      'universal-selector': false,
      'unqualified-attributes': false
    }))
    .pipe(csslint.reporter());
});

// connect with live reload
gulp.task('connect', function() {
  browserSync.init(null, {
    browser: 'google chrome',
    server: {
      baseDir: './',
      startPath: 'examples/index.html'
    }

  });
});

// watch
gulp.task('watch', function() {
  gulp.watch(cssSrc+'**/*.css', ['css']);
  gulp.watch(src+'**/*.js', ['jshint', 'bundle-debug']);
  gulp.watch('test/**/*.js', ['jshint']);
});

// default
gulp.task('default', ['connect', 'watch']);
