var browserify = require('browserify');
var es         = require('event-stream');
var gulp       = require('gulp');
var buffer     = require('gulp-buffer');
var sourcemaps = require('gulp-sourcemaps');
var tap        = require('gulp-tap');
var uglify     = require('gulp-uglify');
var gutil      = require('gulp-util');
var source     = require('vinyl-source-stream');
var del        = require('del');

gulp.task('default', function () {

    del(['./dist/**/*']);

    //noinspection JSUnresolvedFunction
    var coreStream = browserify('./network.js').bundle()
        .pipe(source('network.bundle.js'))
        .pipe(gulp.dest('./dist'));

    var minStream = gulp.src(['./network.js'], {read: false}) // no need of reading file because browserify does.
        // transform file objects using gulp-tap plugin
        .pipe(tap(function (file) {
            gutil.log('bundling ' + file.path);
            // replace file contents with browserify's bundle stream
            //noinspection JSUnresolvedFunction
            file.contents = browserify(file.path, {debug: false}).bundle();
        }))
        // transform streaming contents into buffer contents (because gulp-sourcemaps does not support streaming contents)
        .pipe(buffer())
        // load and init sourcemaps
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        // write sourcemaps
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./dist'));

    return es.concat(coreStream, minStream);
});