var gulp = require('gulp');
var babel = require('gulp-babel');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');

gulp.task('default', ['babel']);

gulp.task('babel', () => {
  return gulp.src('src/**/*')
    .pipe(babel({ presets: ['es2015'] }))
    .pipe(gulp.dest('dist'));
});

gulp.task('test', ['babel'], () => {
  return gulp.src('test/*.js')
    .pipe(mocha())
    .on('error', () => {
      gulp.emit('end');
    });
});

gulp.task('watch', ['babel'], () => {
  return gulp.watch(['src/**'], ['babel']);
});

gulp.task('watch-test', () => {
  return gulp.watch(['src/**', 'test/**'], ['test']);
});
