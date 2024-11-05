// ==UserScript==
// @name         Анализ переписки
// @namespace    http://vk.com/
// @version      1.1.2
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


(function flyInkVkConversationStatistics() {
// import React from 'react';
// import ReactDOM from 'react-dom';

class App extends React.Component {
  constructor(props) {
    super(props);

    props.onCloseCallback(() => {
      this.onClose();
    });

    this.state = {
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
  static callMethod(method, data) {
    return vkApi.api(method, data).then(response => {
      return { response };
    });
  }

  /**
   * Список слов необходимых для анализа
   *
   * @return {{comings: RegExp, skip: string[], hello: RegExp, abuses: RegExp}}
   */
  static getWords() {
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
  static loadAllOwners(owner_ids) {
    const { user_ids, group_ids } = owner_ids.reduce((prev, id) => {
      if (id > 0) {
        prev.user_ids.push(id);
      } else {
        prev.group_ids.push(-id);
      }
      return prev;
    }, { user_ids: [], group_ids: [] });

    return Promise.all([this.loadOwnersByType('users.get', 'user_ids', user_ids), this.loadOwnersByType('groups.getById', 'group_ids', group_ids)]).then(([users, groups]) => {
      return groups.map(group => {
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
  static loadOwnersByType(method, field_name, owner_ids) {
    const owner_ids_splice = [];

    while (owner_ids.length) {
      owner_ids_splice.push(owner_ids.splice(0, 100));
    }

    return owner_ids_splice.reduce((prevPromise, user_ids) => {
      return prevPromise.then(prevResponse => {
        return App.callMethod(method, {
          [field_name]: user_ids.join(','),
          fields: 'last_name,first_name,last_name_acc,first_name_acc,sex'
        }).catch(error => {
          console.error(error);
          return { response: [] };
        }).then(({ response }) => {
          return prevResponse.concat(response);
        });
      });
    }, Promise.resolve([]));
  }

  /**
   * Загружает информацию о пользователях и группах или получает из кеша
   *
   * @param owner_ids
   * @return {Promise}
   */
  async loadOwnersIfNeed(owner_ids) {
    const { ownersInfo } = this.state;

    const newOwnerIds = owner_ids.filter(owner_id => {
      return !ownersInfo[owner_id];
    });

    const newOwners = await App.loadAllOwners(newOwnerIds);

    newOwners.forEach(owner => {
      ownersInfo[owner.id] = owner;
    });

    return this.setStatePromise({ ownersInfo });
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
  static getHistoryWithExecute(peer_id, offset) {
    return App.callMethod("execute", {
      code: `// VKScript
        var i = 0;
        var lastResponse;
        var offset = parseInt(Args.offset);
        
        var req = {
            "peer_id": parseInt(Args.peer_id),
            "count": 200,
            "rev": 1,
            "offset": offset
        };
        var res = {
          historyBatches: []
        };
        
        while (i < 25) {
            i = i + 1;
            lastResponse = API.messages.getHistory(req);
            
            if (lastResponse.count < req.offset) {
              return res;
            }
            
            res.historyBatches.push(lastResponse.items);
            req.offset = req.offset + 200;
            res.nextOffset = req.offset;
            res.totalCount = lastResponse.count;
        }
        return res;`,
      peer_id: peer_id,
      offset: offset,
      v: '5.103'
    }).then(({ response: { historyBatches, nextOffset, totalCount } }) => {
      return {
        batchItems: [].concat(...historyBatches),
        nextOffset,
        totalCount
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
  static findHistoryOffset(peer_id, date) {
    if (!date) {
      return Promise.resolve(0);
    }

    return App.callMethod("execute", {
      date: date,
      peer_id: peer_id,
      code: `// VKScript
        var iterations = 23;
        
        var search_date = parseInt(Args.date);
        var req = {
          rev: 1,
          peer_id: Args.peer_id,
          offset: 0,
          count: 1
        };
        
        var history = API.messages.getHistory(req);
        var count = history.count;
        var total = history.count;
        var cur_date = history.items[0].date;
        
        if (cur_date > search_date) {
          return {
            total: total,
            count: count,
            cur_date: cur_date,
            search_date: search_date,
            diff: search_date - cur_date,
            offset: req.offset
          };
        }
        
        while (iterations > 0 && count > 200) {
          iterations = iterations - 1;
          count = parseInt(count / 2);
          req.offset = req.offset + count;
          cur_date = API.messages.getHistory(req).items[0].date;
          if (cur_date > search_date) {
            count = count * 2;
            req.offset = req.offset - count;
          }
        }
        
        cur_date = API.messages.getHistory(req).items[0].date;
        
        return {
          total: total,
          count: count,
          cur_date: cur_date,
          search_date: search_date,
          diff: search_date - cur_date,
          offset: req.offset
        };
      `
    }).then(({ response, response: { diff, offset } }) => {
      if (diff < 0) {
        throw response;
      }

      return offset;
    }).catch(error => {
      console.error(error);
      return 0;
    });
  }

  /**
   * Быстрая выгрузка переписки через execute
   * @param {number} peer_id
   * @param {number} date
   * @param {function} onStep
   * @return {Promise<{batchItems: *[], nextOffset, totalCount}>}
   */
  async getAllHistory(peer_id, date, onStep) {
    let offset = await App.findHistoryOffset(peer_id, date);
    let count = 0;

    while ((!count || offset < count) && !this.closed) {
      const { batchItems, nextOffset, totalCount } = await App.getHistoryWithExecute(peer_id, offset);
      await onStep({ batchItems, nextOffset, totalCount });

      offset = nextOffset;
      count = totalCount;
    }
  }

  // endregion

  /**
   * Что делать при закрытии приложения
   */
  onClose() {
    this.closed = true;
  }

  /**
   * Аналог setState, только на промисах
   * @param {object} data
   * @return {Promise}
   */
  setStatePromise(data) {
    return new Promise(resolve => {
      this.setState(data, resolve);
    });
  }

  // endregion
  // region DOM

  /**
   * Ищет в элементах необходимое нам меню и встраивает туда новый пункт
   *
   * @param elements
   */
  static searchMenuElement(elements) {
    elements.forEach(el => {
      if (!el || !el.querySelector) {
        return;
      }

      const actions_selector = '._im_dialog_action_wrapper .ui_actions_menu';
      const actions_menu = el.querySelector(actions_selector) || el.closest(actions_selector);
      if (!actions_menu) {
        return;
      }

      const action_search = actions_menu.querySelector('.im-action_search');
      if (!action_search || action_search.classList.contains('im-action_pin_unhide')) {
        return;
      }

      const action_stat = action_search.cloneNode();

      action_stat.textContent = 'Анализ переписки';
      action_stat.className += ' im-action_pin_unhide';
      action_stat.onclick = App.onMenuClick;

      action_search.parentElement.insertBefore(action_stat, action_search);
    });
  }

  static searchReforgedMenu() {
    const observer = new MutationObserver(mutationList => {
      const reforgedPeer = location.href.match(/^https:\/\/vk.com\/im\/convo\/(\d+)/);
      if (!reforgedPeer) return;
      for (const mutation of mutationList) {
        if (mutation.type !== "childList") continue;
        if (mutation.target.id === "reforged-modal-root") continue;
        if (!mutation.addedNodes.length) continue;
        const getAction = el => el && el.querySelector ? el.querySelector('.ActionsMenuAction:has(.vkuiIcon--attach_20)') : null;
        const actionButton = getAction(mutation.addedNodes[0]);
        if (!actionButton) continue;
        const newButton = actionButton.cloneNode(true);

        const newBTitle = newButton.querySelector('.ActionsMenuAction__title');
        newBTitle.textContent = 'Анализ переписки';

        const newBIcon = newButton.querySelector('svg');
        newBIcon.innerHTML = newBIcon.innerHTML.replaceAll('attach_20', 'statistics_outline_20');
        newBIcon.innerHTML = `<path fill="currentColor" fill-rule="evenodd" d="M17 3.75a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L10.5 8.44 9.03 6.97a.75.75 0 0 0-1.06 0l-4.75 4.75a.75.75 0 1 0 1.06 1.06L8.5 8.56l1.47 1.47a.75.75 0 0 0 1.06 0l4.47-4.47v1.69a.75.75 0 0 0 1.5 0zM2 16.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75" clip-rule="evenodd"></path>`;

        newButton.onclick = App.onMenuClick;

        actionButton.after(newButton);
      }
    });

    // Start observing the target node for configured mutations
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Ищет меню по интервалу
   */
  static initMenuSearch() {
    App.searchReforgedMenu();
    setInterval(() => {
      if (!/^\/im/.test(window.location.pathname)) {
        return;
      }

      App.searchMenuElement([document.body]);
    }, 1000);
  }

  static getPeerId(event) {
    const reforgedPeer = location.href.match(/^https:\/\/vk.com\/im\/convo\/(\d+)/);
    if (reforgedPeer) {
      return Number(reforgedPeer[1]);
    }

    const currentTarget = event.currentTarget;
    const history = currentTarget ? currentTarget.closest('.im-page-history-w') : 0;
    const message = history ? history.querySelector('[data-msgid]') : 0;
    const peer_id = message ? message.dataset.peer : 0;

    return peer_id;
  }

  /**
   * Запускает приложение по клику на пункт меню
   * @param event
   * @return {boolean}
   */
  static onMenuClick(event) {
    const peer_id = App.getPeerId(event);
    if (!peer_id) {
      alert('Invalid peer_id');
      return false;
    }

    const onCloseCallback = onClose => {
      if (onCloseCallback.callback) {
        onCloseCallback.callback();
      } else {
        onCloseCallback.callback = onClose;
      }
    };

    const statWindow = new MessageBox({
      title: 'Анализ переписки',
      onHide: onCloseCallback,
      width: 550
    });

    ReactDOM.render(React.createElement(App, { peer_id: peer_id, onCloseCallback: onCloseCallback }), statWindow.bodyNode);

    statWindow.setButtons().show();
    return false;
  }

  // endregion
  // region logic

  /**
   * Подсчет статистики при поступлении новой порции сообщений
   * @param batchItems
   * @param nextOffset
   * @param totalCount
   * @return {Promise<unknown>}
   */
  async onStep({ batchItems, nextOffset, totalCount }) {
    const { counters, limitDate } = this.state;
    const timeZone = new Date().getTimezoneOffset() * 60;
    let firstDate = this.state.firstDate;
    let lastMessage = {};

    batchItems.forEach(message => {
      lastMessage = message;

      if (limitDate && limitDate > message.date) {
        return;
      }

      firstDate = Math.min(firstDate || message.date, message.date);

      const from_id = message.from_id;

      counters.total++;

      // others
      counters.users[from_id] = (counters.users[from_id] || 0) + 1;

      const messageDate = (message.date + timeZone) * 1000;
      message.day = new Date(messageDate).toISOString().split('T')[0];

      counters.days[message.day] = counters.days[message.day] || { count: 0, words: {} };
      const dailyCounters = counters.days[message.day];

      dailyCounters.count++;

      // text
      (message.text || '').toLocaleLowerCase().replace(/\.(\w{2,5}|рф)/, '&#46;$1').replace(/[\(\)\[\]\{\}<>\s,.:'"\/\\\|\?\*\+!@$%\^=\~—¯_-]+/igm, ' ').replace(/&#\d+;/gmi, char => {
        return String.fromCodePoint(parseInt(char.substr(2)));
      }).replace(/\s{2,}/gm, '').split(' ').filter(word => {
        return App.getWords().skip.indexOf(word) === -1 && /^[^\d]{3,25}$/i.test(word);
      }).forEach(word => {
        counters.words[word] = (counters.words[word] || 0) + 1;
        dailyCounters.words[word] = (dailyCounters.words[word] || 0) + 1;
        counters.types.words++;
      });

      // attachments
      counters.types.forwards += message.fwd_messages.length;

      if (message.reply_message) {
        counters.types.reply_messages++;
      }

      (message.attachments || []).forEach(attachment => {
        const type = attachment.type;
        counters.types[type] = (counters.types[type] || 0) + 1;

        if (type === 'sticker') {
          const sticker_id = attachment.sticker.sticker_id;
          counters.stickers[sticker_id] = (counters.stickers[sticker_id] || 0) + 1;
        }
      });
    });

    await this.setStatePromise({
      progress: `${nextOffset} / ${totalCount} (${~~(nextOffset / totalCount * 100)}%)`,
      counters,
      lastMessage,
      firstDate
    });

    const owner_ids = Object.keys(counters.users);
    await this.loadOwnersIfNeed(owner_ids);
  }

  /**
   * Инициализация загрузки истории переписки
   */
  loadStats() {
    const { peer_id } = this.state;
    let limitDate = 0;

    if (this.state.date) {
      const date = new Date(this.state.date);
      const timeZone = date.getTimezoneOffset() * 60;
      limitDate = date / 1000 + timeZone;
    }

    this.setStatePromise({
      progress: 'Загрузка...',
      limitDate
    }).then(() => {
      return this.getAllHistory(peer_id, limitDate, data => {
        return this.onStep(data);
      });
    }).then(() => {
      return this.setStatePromise({
        progress: 'Готово'
      });
    }).catch(error => {
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
  renderLink(rawUser_id) {
    const owner_id = parseInt(rawUser_id, 10);
    const owner = this.state.ownersInfo[owner_id] || {};

    if (owner_id > 0) {
      owner.name = owner.first_name ? `${owner.first_name} ${owner.last_name}` : `@id${owner_id}`;
      owner.link = owner.screen_name ? `/${owner.screen_name}` : `/id${owner_id}`;
    } else {
      owner.name = owner.name ? `${owner.name}` : `@club${-owner_id}`;
      owner.link = owner.screen_name ? `/${owner.screen_name}` : `/club${-owner_id}`;
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
  renderSettings() {
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
        onChange: e => {
          const date = e.target.value;
          this.setState({ date });
        }
      }),
      React.createElement(
        'button',
        { className: 'flat_button', onClick: () => this.loadStats() },
        '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C'
      )
    );
  }

  /**
   * Рендер заголовка анализа переписки
   * @return {*}
   */
  renderHeader() {
    const { progress, date, counters, lastMessage, firstDate } = this.state;
    const lostMessages = lastMessage.conversation_message_id - counters.total || 0;

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
  renderTopList(list, title, render, count, limit_id) {
    const topList = Object.entries(list).sort(([, count_a], [, count_b]) => {
      if (typeof count_a === 'object') {
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
  renderList(list, title, render, count, limit_id) {
    const limit = this.state.limits[limit_id] || count;

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
            onClick: () => {
              const { limits } = this.state;
              limits[limit_id] = limits[limit_id] || count;
              limits[limit_id] += count;
              this.setState({ limits });
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
  renderStat() {
    const { counters } = this.state;

    return React.createElement(
      'div',
      null,
      this.renderHeader(),
      React.createElement('br', null),
      this.renderTopList(counters.users, 'Топ пользователей:', ([user_id, count], index) => {
        return React.createElement(
          'div',
          null,
          index + 1,
          ') ',
          this.renderLink(user_id),
          ' - ',
          count
        );
      }, 25, 'users'),
      this.renderTopList(counters.days, 'Топ дней:', ([item_id, { count, words }], index) => {
        const dailyWord = Object.entries(words).sort(([, count_a], [, count_b]) => count_b - count_a).splice(0, 5).map(([word]) => word).join(', ');

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
      this.renderTopList(counters.stickers, 'Топ стикеров:', ([item_id, count], index) => {
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
          React.createElement('img', { src: `https://vk.com/sticker/1-${item_id}-256`, width: 68, alt: item_id + ' sticker' })
        );
      }, 14, 'stickers'),
      this.renderTopList(counters.words, 'Топ слов:', ([item_id, count], index) => {
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
  render() {
    const { progress } = this.state;

    return React.createElement(
      'div',
      null,
      progress ? this.renderStat() : this.renderSettings()
    );
  }

  // endregion
}

App.initMenuSearch();
})();
