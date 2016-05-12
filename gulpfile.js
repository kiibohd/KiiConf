var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var path = require('path');
var del = require('del');

var revAll = new $.revAll({
    dontGlobal: [/^\/favicon.ico$/g, /.php$/g, /.bash$/g, /.json$/g],
    dontRenameFile: ['.html'],
    // Right now we have overlapping js filenames and css classes causing
    // a rash misnamings. Since we don't use links in js currently we can
    // simply exclude the js files from the renaming.
    dontSearchFile: ['.js']
});

gulp.task('html', function() {
    return gulp.src(['./*.html', './*.php'])
        .pipe(gulp.dest('dist'));
});

gulp.task('images', function() {
    return gulp.src('img/*.png')
        .pipe(gulp.dest('dist/img'));
});

gulp.task('js', function(){
    return gulp.src(['./@(js|lib)/*.js'])
        .pipe($.babel())
        .pipe(gulp.dest('dist'))
});

gulp.task('extras', function() {
    return gulp.src(['./**/*.@(json|bash)', '!./*.json', '!./@(node_modules|dist|controller|tmp|.*)/**/*.*'])
        .pipe(gulp.dest('dist'));
});

gulp.task('less', function () {
    return gulp.src('./css/**/*.less')
        .pipe($.less({
            paths: [ './css/' ]
        }))
        .pipe(gulp.dest('./dist/css'));
});

gulp.task('build', ['less', 'html', 'js', 'images', 'extras'], function () {
    return gulp.src('dist/**/*', {base: 'dist'})
        .pipe(revAll.revision())
        .pipe($.revDeleteOriginal())
        .pipe(gulp.dest('dist'));
});

gulp.task('dev', ['clean', 'build'], $.shell.task([
    // We're making absolute links instead of relative to be safe
    'ln -sf "$PWD/controller" dist/controller',
    'ln -sf "$PWD/tmp" dist/tmp'
]));

gulp.task('clean', function() {
    return del.sync(['dist/**']);
});

gulp.task('default', ['clean'], function () {
    gulp.start('build');
});
