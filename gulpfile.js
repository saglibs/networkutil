var gulp = require('gulp');
var gulpTask = require('coreutil/gulptask');

gulp.task('default', function () {
    return gulpTask(['./network.js'], [], "./src/main/resources/dist");
});