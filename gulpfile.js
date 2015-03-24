/* jshint strict: false */
var browserify = require('browserify'),
    browserSync = require('browser-sync'),
    buffer = require('vinyl-buffer'),
    chalk = require('chalk'),
    collapse = require('bundle-collapser/plugin'),
    cssnext = require('gulp-cssnext'),
    derequire = require('gulp-derequire'),
    exorcist = require('exorcist'),
    gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    rename = require('gulp-rename'),
    source = require('vinyl-source-stream'),
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
  standalone: 'sono',
  debug: true
}, watchify.args));

function bundle() {
  return bundler
    .bundle()
    .pipe(exorcist('./dist/sono.js.map'))
    .on('error', logError)
    .pipe(source('sono.js'))
    .pipe(buffer())
    .pipe(derequire())
    .pipe(gulp.dest('./dist/'))
    .pipe(rename({ extname: '.min.js' }))
    .pipe(strip())
    .pipe(uglify())
    .pipe(gulp.dest('./dist/'))
    .pipe(browserSync.reload({stream: true}));
}

bundler.on('update', bundle); // on any dep update, runs the bundler
gulp.task('bundle', ['jshint'], bundle);

// release bundle with extra compression (can't get collapse to work with watchify)
gulp.task('release', function() {
  return browserify({
      entries: ['./src/sono.js'],
      standalone: 'sono',
      debug: true
    })
    .plugin(collapse)
    .bundle()
    .on('error', logError)
    .pipe(exorcist('./dist/sono.js.map'))
    .pipe(source('sono.js'))
    .pipe(buffer())
    .pipe(derequire())
    .pipe(strip())
    .pipe(gulp.dest('./dist/'))
    .pipe(rename({ extname: '.min.js' }))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/'));
});

// connect browsers
gulp.task('connect', function() {
  browserSync.init({
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
  gulp.watch('test/**/*.js', ['jshint']);
  gulp.watch('examples/**/*.css', ['stylesheets']);
  gulp.watch('examples/**/*.html', ['reload']);
  gulp.watch('examples/**/*.js', ['reload']);
});

// default
gulp.task('default', ['connect', 'watch', 'bundle']);


// examples

gulp.task('stylesheets', function() {
  gulp.src('examples/css/index.css')
    .pipe(cssnext({
        compress: false
    }))
    .on('error', logError)
    .pipe(rename('styles.css'))
    .pipe(gulp.dest('./examples/css/'))
    .pipe(browserSync.reload({stream: true}));
});
