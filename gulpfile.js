var gulp = require('gulp');
var babel = require('gulp-babel');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var gulp = require('gulp');
var path = require('path');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');

// gulp.task('default', ['babel']);

gulp.task('default', () => {
  return browserify({
    entries: './src/main.js',
    extensions: ['.js'],
    debug: true,
  })
  .transform(babelify)
  .bundle()
  .pipe(source('index.js'))
  .pipe(gulp.dest('dist'));
});

gulp.task('babel', () => {
  return gulp.src('src/main.js')
    .pipe(babel({ presets: ['es2015'] }))
    .pipe(gulp.dest('./'));
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
