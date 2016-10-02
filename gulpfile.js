const browserSync = require('browser-sync');
const gulp = require('gulp');
const postcss = require('gulp-postcss');
const rename = require('gulp-rename');

// connect browsers
gulp.task('connect', function() {
    browserSync.init({
        server: {
            baseDir: ['./']
        },
        files: [
            'dist/*',
            'examples/**/*'
        ],
        reloadDebounce: 500
    });
});

// watch
gulp.task('watch', function() {
    gulp.watch('examples/**/*.css', ['stylesheets']);
});

// default
gulp.task('default', ['connect', 'watch']);

// css for examples
gulp.task('stylesheets', function() {
    gulp.src('examples/css/index.css')
        .pipe(postcss([
            require('postcss-import')(),
            require('postcss-custom-media')(),
            require('postcss-custom-properties')(),
            require('postcss-calc')(),
            require('autoprefixer')({
                browsers: ['last 2 version'],
                cascade: false
            })
        ]))
        .pipe(rename('styles.css'))
        .pipe(gulp.dest('./examples/css/'));
});
