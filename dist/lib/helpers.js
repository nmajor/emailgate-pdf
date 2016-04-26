'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sortedEmails = sortedEmails;
exports.sortedPages = sortedPages;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function sortedEmails(emails) {
  return _lodash2.default.sortBy(emails, 'date');
}

function sortedPages(pages) {
  return _lodash2.default.sortBy(pages, function (page) {
    return pageMeta(page).position;
  });
}