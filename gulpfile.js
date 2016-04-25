var gulp = require('gulp');
var babel = require('gulp-babel');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var gulp = require('gulp');
var webpack = require('webpack-stream');
var path = require('path');

// gulp.task('default', ['babel']);

gulp.task('default', function () {
  return gulp.src('src/main.js')
  // .pipe(babel({ presets: ['es2015'] }))
  .pipe(webpack({
    devtool: 'cheap-source-map',
    target: 'node',
    watch: true,
    output: {
      path: path.join(__dirname),
      filename: 'index.js',
    },
    resolve: {
      extensions: ['', '.js', '.jsx', '.json']
    },
    module: {
      loaders: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loaders: ['babel-loader'],
        },
        {
          test: /\.json$/,
          loaders: ['json-loader']
        },
      ]
    },
  }))
  .pipe(gulp.dest('dist/'));

  // return gulp.src('src/main.js')
  // // .pipe(babel({ presets: ['es2015'] }))
  // .pipe(webpack({
  //   target: 'node',
  //   watch: true,
    // resolve: {
    //   extensions: ['', '.js', '.jsx', '.json']
    // },
    // module: {
    //   loaders: [
    //     {
    //       test: /\.js$/,
    //       exclude: /node_modules/,
    //       loaders: ['babel-loader'],
    //     },
    //     {
    //       test: /\.json$/,
    //       loaders: ['json-loader']
    //     },
    //   ]
    // },
  //   output: {
  //     path: path.join(__dirname),
  //     filename: 'index.js',
  //   },
  // }))
  // .on('error', notify)
  // .pipe(gulp.dest('./'));
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
