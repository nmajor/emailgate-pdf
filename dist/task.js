'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.planFactory = planFactory;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _EmailPdfPlan = require('./plans/EmailPdfPlan');

var _EmailPdfPlan2 = _interopRequireDefault(_EmailPdfPlan);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _connection = require('./connection');

var _connection2 = _interopRequireDefault(_connection);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function planFactory(task) {
  switch (task.kind) {
    case 'email-pdf':
      return _EmailPdfPlan2.default;
    default:
      return null;
  }
}

var Task = function () {
  function Task(props) {
    var _this = this;

    _classCallCheck(this, Task);

    _lodash2.default.forEach(props, function (value, key) {
      _this[key] = value;
    });

    this.Plan = planFactory(this);
  }

  _createClass(Task, [{
    key: 'addLog',
    value: function addLog(type, message, payload) {
      var _this2 = this;

      (0, _connection2.default)(function (db) {
        var collection = db.collection('tasks');
        var entry = {
          type: type,
          message: message
        };
        if (payload) {
          entry.payload = payload;
        }
        console.log(entry);

        collection.update({ _id: _this2._id }, { $push: { log: entry } }, function (err, result) {
          _assert2.default.equal(err, null);
          _assert2.default.equal(1, result.result.n);
        });
      });
    }
  }, {
    key: 'start',
    value: function start() {
      var _this3 = this;

      return new Promise(function (resolve) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('tasks');

          collection.update({ _id: _this3._id }, { $set: { startedAt: new Date() } }, function (err, result) {
            if (err) {
              _this3.addLog('error', 'Error happened when updating startedAt', err);
              resolve();
              return;
            }

            if (result.result.n !== 1) {
              _this3.addLog('error', 'Error happened when updating startedAt. Update query didnt seem to update anythig.', result);
              resolve();
              return;
            }

            resolve(new _this3.Plan({ task: _this3 }).start());
          });
        });
      });
    }
  }], [{
    key: 'findNextTasks',
    value: function findNextTasks() {
      return new Promise(function (resolve) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('tasks');
          // const query = { startedAt: null, finishedAt: null };
          var query = {};

          collection.find(query).sort({ priority: -1, createdAt: -1 }).limit(5).toArray(function (err, docs) {
            // if (err) { log('error', 'An error happened while getting emails.', err.message); return; }

            resolve(docs.map(function (doc) {
              return new Task(doc);
            }));
          });
        });
      });
    }
  }]);

  return Task;
}();

exports.default = Task;