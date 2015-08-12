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
    .pipe(gulp.dest('./dist/'));
}

bundler.on('update', bundle); // on any dep update, runs the bundler
gulp.task('bundle', ['jshint'], bundle);

// release bundle with extra compression (can't get collapse to work with watchify)
function bundleRelease(min) {
  var bundler = browserify({
    entries: ['./src/sono.js'],
    standalone: 'sono',
    debug: !min
  });

  if(min) {
    bundler = bundler.plugin(collapse);
  }

  var stream = bundler.bundle()
    .on('error', logError);

  if(!min) {
    stream = stream.pipe(exorcist('./dist/sono.js.map'));
  }

  stream = stream.pipe(source('sono.js'))
    .pipe(buffer())
    .pipe(derequire())
    .pipe(strip());

  if(min) {
    return stream.pipe(rename({ extname: '.min.js' }))
      .pipe(uglify())
      .pipe(gulp.dest('./dist/'));
  } else {
    return stream.pipe(gulp.dest('./dist/'));
  }
}

gulp.task('release', function() {
  bundleRelease(true);
  bundleRelease(false);
});

// connect browsers
gulp.task('connect', function() {
  browserSync.init({
    server: {
      baseDir: ['./', 'examples']
    },
    files: [
      'dist/*',
      'examples/**/*'
    ],
    reloadDebounce: 500
  });
});

// js hint
gulp.task('jshint', function() {
  return gulp.src([
      './gulpfile.js',
      'src/**/*.js',
      'test/**/*.js',
      'examples/**/*.js',
      '!examples/js/highlight.pack.js'
  ])
  .pipe(jshint())
  .pipe(jshint.reporter('jshint-stylish'));
});

// watch
gulp.task('watch', function() {
  gulp.watch('test/**/*.js', ['jshint']);
  gulp.watch('examples/**/*.css', ['stylesheets']);
});

// default
gulp.task('default', ['connect', 'watch', 'bundle']);

// css for examples
gulp.task('stylesheets', function() {
  gulp.src('examples/css/index.css')
    .pipe(cssnext({
        compress: false
    }))
    .on('error', logError)
    .pipe(rename('styles.css'))
    .pipe(gulp.dest('./examples/css/'));
});
