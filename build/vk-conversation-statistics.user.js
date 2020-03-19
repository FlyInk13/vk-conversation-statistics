// ==UserScript==
// @name         Анализ переписки
// @namespace    http://vk.com/
// @version      1.1.0
// @description  Пользовательский скрипт для анализа сообщений в диалоге
// @author       FlyInk13
// @require      https://unpkg.com/react@16/umd/react.development.js
// @require      https://unpkg.com/react-dom@16/umd/react-dom.development.js
// @require      https://ifx.su/~va
// @match        https://vk.com/*
// @grant        GM.xmlHttpRequest
// @noframes
// @updateURL    https://raw.githubusercontent.com/FlyInk13/vk-conversation-statistics/master/build/vk-conversation-statistics.user.js
// ==/UserScript==


'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

// import React from 'react';
// import ReactDOM from 'react-dom';

var App = function (_React$Component) {
  _inherits(App, _React$Component);

  function App(props) {
    _classCallCheck(this, App);

    var _this = _possibleConstructorReturn(this, (App.__proto__ || Object.getPrototypeOf(App)).call(this, props));

    props.onCloseCallback(function () {
      _this.onClose();
    });

    _this.state = {
      peer_id: props.peer_id,
      progress: false,
      ownersInfo: {},
      lastMessage: {},
      limitDate: 0,
      firstDate: 0,

      limits: {},

      counters: {
        users: {},

        total: 0,

        words: {},
        actions: {},
        stickers: {},
        days: {},
        types: {
          words: 0,
          attachments: 0,
          maps: 0,
          forwards: 0,
          reply_messages: 0,
          censored: 0,
          welcomes: 0,
          comings: 0,
          abuses: 0
        }
      }
    };
    return _this;
  }

  // region API
  // region utils

  /**
   * Вызывает метод API
   *
   * @param {string} method
   * @param {object} data
   * @return {Promise}
   */


  _createClass(App, [{
    key: 'loadOwnersIfNeed',


    /**
     * Загружает информацию о пользователях и группах или получает из кеша
     *
     * @param owner_ids
     * @return {Promise}
     */
    value: async function loadOwnersIfNeed(owner_ids) {
      var ownersInfo = this.state.ownersInfo;


      var newOwnerIds = owner_ids.filter(function (owner_id) {
        return !ownersInfo[owner_id];
      });

      var newOwners = await App.loadAllOwners(newOwnerIds);

      newOwners.forEach(function (owner) {
        ownersInfo[owner.id] = owner;
      });

      return this.setStatePromise({ ownersInfo: ownersInfo });
    }

    // endregion
    // region history loader

    /**
     * Быстрая выгрузка переписки через execute
     *
     * @param {number} peer_id
     * @param {number} offset
     * @return {Promise<{batchItems: *[], nextOffset, totalCount}>}
     */

  }, {
    key: 'getAllHistory',


    /**
     * Быстрая выгрузка переписки через execute
     * @param {number} peer_id
     * @param {number} date
     * @param {function} onStep
     * @return {Promise<{batchItems: *[], nextOffset, totalCount}>}
     */
    value: async function getAllHistory(peer_id, date, onStep) {
      var offset = await App.findHistoryOffset(peer_id, date);
      var count = 0;

      while ((!count || offset < count) && !this.closed) {
        var _ref = await App.getHistoryWithExecute(peer_id, offset),
            batchItems = _ref.batchItems,
            nextOffset = _ref.nextOffset,
            totalCount = _ref.totalCount;

        await onStep({ batchItems: batchItems, nextOffset: nextOffset, totalCount: totalCount });

        offset = nextOffset;
        count = totalCount;
      }
    }

    // endregion

    /**
     * Что делать при закрытии приложения
     */

  }, {
    key: 'onClose',
    value: function onClose() {
      this.closed = true;
    }

    /**
     * Аналог setState, только на промисах
     * @param {object} data
     * @return {Promise}
     */

  }, {
    key: 'setStatePromise',
    value: function setStatePromise(data) {
      var _this2 = this;

      return new Promise(function (resolve) {
        _this2.setState(data, resolve);
      });
    }

    // endregion
    // region DOM

    /**
     * Ищет в элементах необходимое нам меню и встраивает туда новый пункт
     *
     * @param elements
     */

  }, {
    key: 'onStep',


    // endregion
    // region logic

    /**
     * Подсчет статистики при поступлении новой порции сообщений
     * @param batchItems
     * @param nextOffset
     * @param totalCount
     * @return {Promise<unknown>}
     */
    value: async function onStep(_ref2) {
      var batchItems = _ref2.batchItems,
          nextOffset = _ref2.nextOffset,
          totalCount = _ref2.totalCount;
      var _state = this.state,
          counters = _state.counters,
          limitDate = _state.limitDate;

      var timeZone = new Date().getTimezoneOffset() * 60;
      var firstDate = this.state.firstDate;
      var lastMessage = {};

      batchItems.forEach(function (message) {
        lastMessage = message;

        if (limitDate && limitDate > message.date) {
          return;
        }

        firstDate = Math.min(firstDate || message.date, message.date);

        var from_id = message.from_id;

        counters.total++;

        // others
        counters.users[from_id] = (counters.users[from_id] || 0) + 1;

        var messageDate = (message.date + timeZone) * 1000;
        message.day = new Date(messageDate).toISOString().split('T')[0];

        counters.days[message.day] = counters.days[message.day] || { count: 0, words: {} };
        var dailyCounters = counters.days[message.day];

        dailyCounters.count++;

        // text
        (message.text || '').toLocaleLowerCase().replace(/\.(\w{2,5}|рф)/, '&#46;$1').replace(/[\(\)\[\]\{\}<>\s,.:'"\/\\\|\?\*\+!@$%\^=\~—¯_-]+/igm, ' ').replace(/&#\d+;/gmi, function (char) {
          return String.fromCodePoint(parseInt(char.substr(2)));
        }).replace(/\s{2,}/gm, '').split(' ').filter(function (word) {
          return App.getWords().skip.indexOf(word) === -1 && /^[^\d]{3,25}$/i.test(word);
        }).forEach(function (word) {
          counters.words[word] = (counters.words[word] || 0) + 1;
          dailyCounters.words[word] = (dailyCounters.words[word] || 0) + 1;
          counters.types.words++;
        });

        // attachments
        counters.types.forwards += message.fwd_messages.length;

        if (message.reply_message) {
          counters.types.reply_messages++;
        }

        (message.attachments || []).forEach(function (attachment) {
          var type = attachment.type;
          counters.types[type] = (counters.types[type] || 0) + 1;

          if (type === 'sticker') {
            var sticker_id = attachment.sticker.sticker_id;
            counters.stickers[sticker_id] = (counters.stickers[sticker_id] || 0) + 1;
          }
        });
      });

      await this.setStatePromise({
        progress: nextOffset + ' / ' + totalCount + ' (' + ~~(nextOffset / totalCount * 100) + '%)',
        counters: counters,
        lastMessage: lastMessage,
        firstDate: firstDate
      });

      var owner_ids = Object.keys(counters.users);
      await this.loadOwnersIfNeed(owner_ids);
    }

    /**
     * Инициализация загрузки истории переписки
     */

  }, {
    key: 'loadStats',
    value: function loadStats() {
      var _this3 = this;

      var peer_id = this.state.peer_id;

      var limitDate = 0;

      if (this.state.date) {
        var date = new Date(this.state.date);
        var timeZone = date.getTimezoneOffset() * 60;
        limitDate = date / 1000 + timeZone;
      }

      this.setStatePromise({
        progress: 'Загрузка...',
        limitDate: limitDate
      }).then(function () {
        return _this3.getAllHistory(peer_id, limitDate, function (data) {
          return _this3.onStep(data);
        });
      }).then(function () {
        return _this3.setStatePromise({
          progress: 'Готово'
        });
      }).catch(function (error) {
        console.error(error);
      });
    }

    // endregion
    // region render

    /**
     * Рендер ссылки на овнера
     * @param rawUser_id
     * @return {*}
     */

  }, {
    key: 'renderLink',
    value: function renderLink(rawUser_id) {
      var owner_id = parseInt(rawUser_id, 10);
      var owner = this.state.ownersInfo[owner_id] || {};

      if (owner_id > 0) {
        owner.name = owner.first_name ? owner.first_name + ' ' + owner.last_name : '@id' + owner_id;
        owner.link = owner.screen_name ? '/' + owner.screen_name : '/id' + owner_id;
      } else {
        owner.name = owner.name ? '' + owner.name : '@club' + -owner_id;
        owner.link = owner.screen_name ? '/' + owner.screen_name : '/club' + -owner_id;
      }

      return React.createElement(
        'a',
        { href: owner.link },
        owner.name
      );
    }

    /**
     * Рендер стартового экрана
     * @return {*}
     */

  }, {
    key: 'renderSettings',
    value: function renderSettings() {
      var _this4 = this;

      return React.createElement(
        'div',
        { className: 'im_stat_window' },
        React.createElement(
          'div',
          { style: { marginBottom: '6px' } },
          '\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0442\u0430\u0440\u0442\u043E\u0432\u0443\u044E \u0434\u0430\u0442\u0443 \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0438.',
          React.createElement('br', null),
          '\u0424\u0438\u043B\u044C\u0442\u0440\u0430\u0446\u0438\u044F \u043F\u043E \u0434\u0430\u0442\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u043F\u043E\u0441\u043B\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0432\u0441\u0435\u0445 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439.',
          React.createElement('br', null),
          '\u041C\u043E\u0436\u043D\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0430\u043D\u0430\u043B\u0438\u0437 \u0432\u0441\u0435\u0439 \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0438 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u0432 \u0434\u0430\u0442\u0443.'
        ),
        React.createElement('input', {
          type: 'date',
          className: 'dark',
          style: {
            width: '300px',
            marginRight: '9px'
          },
          onChange: function onChange(e) {
            var date = e.target.value;
            _this4.setState({ date: date });
          }
        }),
        React.createElement(
          'button',
          { className: 'flat_button', onClick: function onClick() {
              return _this4.loadStats();
            } },
          '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C'
        )
      );
    }

    /**
     * Рендер заголовка анализа переписки
     * @return {*}
     */

  }, {
    key: 'renderHeader',
    value: function renderHeader() {
      var _state2 = this.state,
          progress = _state2.progress,
          date = _state2.date,
          counters = _state2.counters,
          lastMessage = _state2.lastMessage,
          firstDate = _state2.firstDate;

      var lostMessages = lastMessage.conversation_message_id - counters.total || 0;

      return React.createElement(
        'div',
        null,
        '\u0414\u0430\u0442\u0430: ',
        date || 'За все время',
        React.createElement('br', null),
        '\u041F\u0435\u0440\u0432\u043E\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435: ',
        firstDate ? new Date(firstDate * 1000).toISOString() : '???',
        React.createElement('br', null),
        '\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441: ',
        progress,
        React.createElement('br', null),
        '\u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439: ',
        lostMessages,
        React.createElement('br', null),
        '\u0412\u0441\u0435\u0433\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439: ',
        counters.total,
        React.createElement('br', null),
        '\u041F\u0435\u0440\u0435\u0441\u043B\u0430\u043D\u043D\u044B\u0445: ',
        counters.types.forwards,
        React.createElement('br', null),
        '\u041E\u0442\u0432\u0435\u0442\u043E\u0432: ',
        counters.types.reply_messages,
        React.createElement('br', null),
        '\u0421\u0442\u0438\u043A\u0435\u0440\u043E\u0432: ',
        counters.types.sticker || 0,
        React.createElement('br', null),
        '\u0424\u043E\u0442\u043E: ',
        counters.types.photo || 0,
        React.createElement('br', null),
        '\u0412\u0438\u0434\u0435\u043E: ',
        counters.types.video || 0,
        React.createElement('br', null),
        '\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u043E\u0432: ',
        counters.types.doc || 0,
        React.createElement('br', null),
        '\u0413\u0440\u0430\u0444\u0444\u0438\u0442\u0438: ',
        counters.types.graffiti || 0,
        React.createElement('br', null),
        '\u0410\u0443\u0434\u0438\u043E: ',
        counters.types.audio || 0,
        React.createElement('br', null),
        '\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u044B\u0445: ',
        counters.types.audio_message || 0
      );
    }

    /**
     * Рендер таблицы с рейтингом
     * @param {object} list
     * @param {string} title
     * @param {function} render
     * @param {number} count
     * @param {string} limit_id
     * @return {string|*}
     */

  }, {
    key: 'renderTopList',
    value: function renderTopList(list, title, render, count, limit_id) {
      var topList = Object.entries(list).sort(function (_ref3, _ref4) {
        var _ref6 = _slicedToArray(_ref3, 2),
            count_a = _ref6[1];

        var _ref5 = _slicedToArray(_ref4, 2),
            count_b = _ref5[1];

        if ((typeof count_a === 'undefined' ? 'undefined' : _typeof(count_a)) === 'object') {
          return count_b.count - count_a.count;
        } else {
          return count_b - count_a;
        }
      });

      return this.renderList(topList, title, render, count, limit_id);
    }

    /**
     * Рендер таблицы с рейтингом
     * @param {object} list
     * @param {string} title
     * @param {function} render
     * @param {number} count
     * @param {string} limit_id
     * @return {string|*}
     */

  }, {
    key: 'renderList',
    value: function renderList(list, title, render, count, limit_id) {
      var _this5 = this;

      var limit = this.state.limits[limit_id] || count;

      if (!list || !list.length) {
        return '';
      }

      return React.createElement(
        'div',
        { style: { marginTop: '6px' } },
        React.createElement(
          'div',
          { style: { padding: '6px', textAlign: 'center' } },
          React.createElement(
            'b',
            null,
            title
          ),
          ' ',
          list.length,
          ':'
        ),
        React.createElement(
          'div',
          null,
          list.splice(0, limit).map(render)
        ),
        list.length < limit ? '' : React.createElement(
          'div',
          { style: { textAlign: 'center', marginTop: '6px' } },
          React.createElement(
            'button',
            {
              className: 'flat_button secondary',
              onClick: function onClick() {
                var limits = _this5.state.limits;

                limits[limit_id] = limits[limit_id] || count;
                limits[limit_id] += count;
                _this5.setState({ limits: limits });
              }
            },
            '\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0435'
          )
        )
      );
    }

    /**
     * Рендер таблиц с различными рейтингами
     * @return {*}
     */

  }, {
    key: 'renderStat',
    value: function renderStat() {
      var _this6 = this;

      var counters = this.state.counters;


      return React.createElement(
        'div',
        null,
        this.renderHeader(),
        React.createElement('br', null),
        this.renderTopList(counters.users, 'Топ пользователей:', function (_ref7, index) {
          var _ref8 = _slicedToArray(_ref7, 2),
              user_id = _ref8[0],
              count = _ref8[1];

          return React.createElement(
            'div',
            null,
            index + 1,
            ') ',
            _this6.renderLink(user_id),
            ' - ',
            count
          );
        }, 25, 'users'),
        this.renderTopList(counters.days, 'Топ дней:', function (_ref9, index) {
          var _ref10 = _slicedToArray(_ref9, 2),
              item_id = _ref10[0],
              _ref10$ = _ref10[1],
              count = _ref10$.count,
              words = _ref10$.words;

          var dailyWord = Object.entries(words).sort(function (_ref11, _ref12) {
            var _ref14 = _slicedToArray(_ref11, 2),
                count_a = _ref14[1];

            var _ref13 = _slicedToArray(_ref12, 2),
                count_b = _ref13[1];

            return count_b - count_a;
          }).splice(0, 5).map(function (_ref15) {
            var _ref16 = _slicedToArray(_ref15, 1),
                word = _ref16[0];

            return word;
          }).join(', ');

          return React.createElement(
            'div',
            null,
            index + 1,
            ') ',
            item_id,
            ' - ',
            count,
            ' - ',
            dailyWord
          );
        }, 25, 'days'),
        this.renderTopList(counters.stickers, 'Топ стикеров:', function (_ref17, index) {
          var _ref18 = _slicedToArray(_ref17, 2),
              item_id = _ref18[0],
              count = _ref18[1];

          return React.createElement(
            'div',
            { title: index + 1, style: { display: 'inline-block', position: 'relative', width: 68 } },
            React.createElement(
              'div',
              {
                style: {
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  background: '#eee',
                  padding: '3px'
                }
              },
              count
            ),
            React.createElement('img', { src: 'https://vk.com/sticker/1-' + item_id + '-256', width: 68, alt: item_id + ' sticker' })
          );
        }, 14, 'stickers'),
        this.renderTopList(counters.words, 'Топ слов:', function (_ref19, index) {
          var _ref20 = _slicedToArray(_ref19, 2),
              item_id = _ref20[0],
              count = _ref20[1];

          return React.createElement(
            'div',
            null,
            index + 1,
            ') ',
            item_id,
            ' - ',
            count
          );
        }, 200, 'words')
      );
    }

    /**
     * Рендер приложения
     * @return {*}
     */

  }, {
    key: 'render',
    value: function render() {
      var progress = this.state.progress;


      return React.createElement(
        'div',
        null,
        progress ? this.renderStat() : this.renderSettings()
      );
    }

    // endregion

  }], [{
    key: 'callMethod',
    value: function callMethod(method, data) {
      return window.API(method, data);
    }

    /**
     * Список слов необходимых для анализа
     *
     * @return {{comings: RegExp, skip: string[], hello: RegExp, abuses: RegExp}}
     */

  }, {
    key: 'getWords',
    value: function getWords() {
      return {
        hello: /(прив(ет)?|зда?р([ао])в(ствуй(те)?)?|hi|hello|qq|добр(ый|ой|ого|ое)\s(день|ночи|вечер|утро))/i,
        comings: /(пока|до\s?св([ие])дания|спок(ойной ночи|и)?|пэздуй с мопэда|до (завтр([ао])|встречи))/i,
        abuses: /(\s|^)((д([еи])+б(и+л)?|д([оа])+лб([оа])+е+б|(ху|на+ху+)+([еий])+((с([оа])+с)|ло)?|у?еб(ла+(н|сос)|ок)|му+да+к|п([ие])+д(о+)?р(ила+)?|даун.+|с(у+|у+ч)ка+?)|чмо+(шни+к)?)($|\s)/i,
        skip: ['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'бы', 'по', 'только', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'из', 'ему', 'теперь', 'когда', 'даже', 'ну', 'вдруг', 'ли', 'если', 'уже', 'или', 'ни', 'быть', 'был', 'него', 'до', 'вас', 'нибудь', 'опять', 'уж', 'вам', 'ведь', 'там', 'потом', 'себя', 'ничего', 'ей', 'может', 'они', 'тут', 'где', 'есть', 'надо', 'ней', 'для', 'мы', 'тебя', 'их', 'чем', 'была', 'сам', 'чтоб', 'без', 'будто', 'чего', 'раз', 'тоже', 'себе', 'под', 'будет', 'ж', 'тогда', 'кто', 'этот', 'того', 'потому', 'этого', 'какой', 'совсем', 'ним', 'здесь', 'этом', 'один', 'почти', 'мой', 'тем', 'чтобы', 'нее', 'сейчас', 'были', 'куда', 'зачем', 'всех', 'никогда', 'можно', 'при', 'наконец', 'два', 'об', 'другой', 'хоть', 'после', 'над', 'больше', 'тот', 'через', 'эти', 'нас', 'про', 'всего', 'них', 'какая', 'много', 'разве', 'три', 'эту', 'моя', 'впрочем', 'хорошо', 'свою', 'этой', 'перед', 'иногда', 'лучше', 'чуть', 'том', 'нельзя', 'такой', 'им', 'более', 'всегда', 'конечно', 'всю', 'между', 'это', 'просто', 'очень', 'всё', 'ещё', 'кстати', 'вроде', 'вообще', 'кажется', 'почему', 'https', 'http', 'www', 'ru', 'com']
      };
    }

    // endregion
    // region owners loader

    /**
     * Загружает информацию о пользователях и группах из API
     *
     * @param {number[]} owner_ids
     * @return {Promise}
     */

  }, {
    key: 'loadAllOwners',
    value: function loadAllOwners(owner_ids) {
      var _owner_ids$reduce = owner_ids.reduce(function (prev, id) {
        if (id > 0) {
          prev.user_ids.push(id);
        } else {
          prev.group_ids.push(-id);
        }
        return prev;
      }, { user_ids: [], group_ids: [] }),
          user_ids = _owner_ids$reduce.user_ids,
          group_ids = _owner_ids$reduce.group_ids;

      return Promise.all([this.loadOwnersByType('users.get', 'user_ids', user_ids), this.loadOwnersByType('groups.getById', 'group_ids', group_ids)]).then(function (_ref21) {
        var _ref22 = _slicedToArray(_ref21, 2),
            users = _ref22[0],
            groups = _ref22[1];

        return groups.map(function (group) {
          group.id *= -1;
          return group;
        }).concat(users);
      });
    }

    /**
     * Получает информацию о пользователях или группах из API
     *
     * @param {string} method
     * @param {string} field_name
     * @param {number[]} owner_ids
     * @return {*}
     */

  }, {
    key: 'loadOwnersByType',
    value: function loadOwnersByType(method, field_name, owner_ids) {
      var owner_ids_splice = [];

      while (owner_ids.length) {
        owner_ids_splice.push(owner_ids.splice(0, 100));
      }

      return owner_ids_splice.reduce(function (prevPromise, user_ids) {
        return prevPromise.then(function (prevResponse) {
          var _App$callMethod;

          return App.callMethod(method, (_App$callMethod = {}, _defineProperty(_App$callMethod, field_name, user_ids.join(',')), _defineProperty(_App$callMethod, 'fields', 'last_name,first_name,last_name_acc,first_name_acc,sex'), _App$callMethod)).catch(function (error) {
            console.error(error);
            return { response: [] };
          }).then(function (_ref23) {
            var response = _ref23.response;

            return prevResponse.concat(response);
          });
        });
      }, Promise.resolve([]));
    }
  }, {
    key: 'getHistoryWithExecute',
    value: function getHistoryWithExecute(peer_id, offset) {
      return App.callMethod("execute", {
        code: '// VKScript\n        var i = 0;\n        var lastResponse;\n        var offset = parseInt(Args.offset);\n        \n        var req = {\n            "peer_id": parseInt(Args.peer_id),\n            "count": 200,\n            "rev": 1,\n            "offset": offset\n        };\n        var res = {\n          historyBatches: []\n        };\n        \n        while (i < 25) {\n            i = i + 1;\n            lastResponse = API.messages.getHistory(req);\n            \n            if (lastResponse.count < req.offset) {\n              return res;\n            }\n            \n            res.historyBatches.push(lastResponse.items);\n            req.offset = req.offset + 200;\n            res.nextOffset = req.offset;\n            res.totalCount = lastResponse.count;\n        }\n        return res;',
        peer_id: peer_id,
        offset: offset,
        v: '5.103'
      }).then(function (_ref24) {
        var _ref25;

        var _ref24$response = _ref24.response,
            historyBatches = _ref24$response.historyBatches,
            nextOffset = _ref24$response.nextOffset,
            totalCount = _ref24$response.totalCount;

        return {
          batchItems: (_ref25 = []).concat.apply(_ref25, _toConsumableArray(historyBatches)),
          nextOffset: nextOffset,
          totalCount: totalCount
        };
      });
    }

    /**
     * Ищет offset для истории с определенной даты
     * Ищет приблезительно, далее работает фильтрация по дате
     * В случае ошибки выдает 0 - и скрипт будет загружать всю историю
     *
     * @param {number} peer_id
     * @param {number} date
     * @return {Promise<number>}
     */

  }, {
    key: 'findHistoryOffset',
    value: function findHistoryOffset(peer_id, date) {
      if (!date) {
        return Promise.resolve(0);
      }

      return App.callMethod("execute", {
        date: date,
        peer_id: peer_id,
        code: '// VKScript\n        var iterations = 23;\n        \n        var search_date = parseInt(Args.date);\n        var req = {\n          rev: 1,\n          peer_id: Args.peer_id,\n          offset: 0,\n          count: 1\n        };\n        \n        var history = API.messages.getHistory(req);\n        var count = history.count;\n        var total = history.count;\n        var cur_date = history.items[0].date;\n        \n        if (cur_date > search_date) {\n          return {\n            total: total,\n            count: count,\n            cur_date: cur_date,\n            search_date: search_date,\n            diff: search_date - cur_date,\n            offset: req.offset\n          };\n        }\n        \n        while (iterations > 0 && count > 200) {\n          iterations = iterations - 1;\n          count = parseInt(count / 2);\n          req.offset = req.offset + count;\n          cur_date = API.messages.getHistory(req).items[0].date;\n          if (cur_date > search_date) {\n            count = count * 2;\n            req.offset = req.offset - count;\n          }\n        }\n        \n        cur_date = API.messages.getHistory(req).items[0].date;\n        \n        return {\n          total: total,\n          count: count,\n          cur_date: cur_date,\n          search_date: search_date,\n          diff: search_date - cur_date,\n          offset: req.offset\n        };\n      '
      }).then(function (_ref26) {
        var response = _ref26.response,
            _ref26$response = _ref26.response,
            diff = _ref26$response.diff,
            offset = _ref26$response.offset;

        if (diff < 0) {
          throw response;
        }

        return offset;
      }).catch(function (error) {
        console.error(error);
        return 0;
      });
    }
  }, {
    key: 'searchMenuElement',
    value: function searchMenuElement(elements) {
      elements.forEach(function (el) {
        if (!el || !el.querySelector) {
          return;
        }

        var actions_selector = '._im_dialog_action_wrapper .ui_actions_menu';
        var actions_menu = el.querySelector(actions_selector) || el.closest(actions_selector);
        if (!actions_menu) {
          return;
        }

        var action_search = actions_menu.querySelector('.im-action_search');
        if (!action_search || action_search.classList.contains('im-action_pin_unhide')) {
          return;
        }

        var action_stat = action_search.cloneNode();

        action_stat.textContent = 'Анализ переписки';
        action_stat.className += ' im-action_pin_unhide';
        action_stat.onclick = App.onMenuClick;

        action_search.parentElement.insertBefore(action_stat, action_search);
      });
    }

    /**
     * Ищет меню по интервалу
     */

  }, {
    key: 'initMenuSearch',
    value: function initMenuSearch() {
      setInterval(function () {
        if (!/^\/im/.test(window.location.pathname)) {
          return;
        }

        App.searchMenuElement([document.body]);
      }, 1000);
    }

    /**
     * Запускает приложение по клику на пункт меню
     * @param event
     * @return {boolean}
     */

  }, {
    key: 'onMenuClick',
    value: function onMenuClick(event) {
      var currentTarget = event.currentTarget;
      var history = currentTarget ? currentTarget.closest('.im-page-history-w') : 0;
      var message = history ? history.querySelector('[data-msgid]') : 0;
      var peer_id = message ? message.dataset.peer : 0;

      if (!peer_id) {
        alert('Invalid peer_id');
        return false;
      }

      var onCloseCallback = function onCloseCallback(onClose) {
        if (onCloseCallback.callback) {
          onCloseCallback.callback();
        } else {
          onCloseCallback.callback = onClose;
        }
      };

      var statWindow = new MessageBox({
        title: 'Анализ переписки',
        onHide: onCloseCallback,
        width: 550
      });

      ReactDOM.render(React.createElement(App, { peer_id: peer_id, onCloseCallback: onCloseCallback }), statWindow.bodyNode);

      statWindow.setButtons().show();
      return false;
    }
  }]);

  return App;
}(React.Component);

App.initMenuSearch();