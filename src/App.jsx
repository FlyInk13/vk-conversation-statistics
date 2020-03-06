import React from 'react';
import ReactDOM from 'react-dom';

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
          abuses: 0,
        },
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
    return window.API(method, data);
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
      skip: [
        'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
        'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
        'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
        'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do',
        'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while',
        'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before',
        'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
        'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
        'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
        'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now',
        'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все', 'она', 'так', 'его', 'но',
        'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'бы', 'по', 'только', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще',
        'нет', 'о', 'из', 'ему', 'теперь', 'когда', 'даже', 'ну', 'вдруг', 'ли', 'если', 'уже', 'или', 'ни', 'быть',
        'был', 'него', 'до', 'вас', 'нибудь', 'опять', 'уж', 'вам', 'ведь', 'там', 'потом', 'себя', 'ничего', 'ей',
        'может', 'они', 'тут', 'где', 'есть', 'надо', 'ней', 'для', 'мы', 'тебя', 'их', 'чем', 'была', 'сам', 'чтоб',
        'без', 'будто', 'чего', 'раз', 'тоже', 'себе', 'под', 'будет', 'ж', 'тогда', 'кто', 'этот', 'того', 'потому',
        'этого', 'какой', 'совсем', 'ним', 'здесь', 'этом', 'один', 'почти', 'мой', 'тем', 'чтобы', 'нее', 'сейчас',
        'были', 'куда', 'зачем', 'всех', 'никогда', 'можно', 'при', 'наконец', 'два', 'об', 'другой', 'хоть', 'после',
        'над', 'больше', 'тот', 'через', 'эти', 'нас', 'про', 'всего', 'них', 'какая', 'много', 'разве', 'три', 'эту',
        'моя', 'впрочем', 'хорошо', 'свою', 'этой', 'перед', 'иногда', 'лучше', 'чуть', 'том', 'нельзя', 'такой', 'им',
        'более', 'всегда', 'конечно', 'всю', 'между',
        'это', 'просто', 'очень', 'всё', 'ещё', 'кстати', 'вроде', 'вообще', 'кажется', 'почему',
        'https', 'http', 'www', 'ru', 'com'
      ],
    }
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

    return Promise.all([
      this.loadOwnersByType('users.get', 'user_ids', user_ids),
      this.loadOwnersByType('groups.getById', 'group_ids', group_ids),
    ]).then(([users, groups]) => {
      return groups.map((group) => {
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
      return prevPromise.then((prevResponse) => {
        return App.callMethod(method, {
          [field_name]: user_ids.join(','),
          fields: 'last_name,first_name,last_name_acc,first_name_acc,sex'
        }).catch((error) => {
          console.error(error);
          return { response: [] }
        }).then(({ response }) => {
          return prevResponse.concat(response);
        })
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

    const newOwnerIds = owner_ids.filter((owner_id) => {
      return !ownersInfo[owner_id];
    });

    const newOwners = await App.loadAllOwners(newOwnerIds);

    newOwners.forEach((owner) => {
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
      code: "\
                var offset = parseInt(Args.offset);\n\
                var req = {\n\
                    \"peer_id\": parseInt(Args.peer_id),\n\
                    \"count\":200,\"rev\":1,\"offset\":offset\n\
                };\n\
                var ret = {};\n\
                ret.historyBatches = [];\n\
                var i = 0;\n\
                var lastResponse;\n\
                while(i < 25){\n\
                    i = i + 1;\n\
                    lastResponse = API.messages.getHistory(req);\n\
                    if(lastResponse.count < req.offset) return ret;\n\
                    ret.historyBatches.push(lastResponse.items);\n\
                    req.offset = req.offset + 200;\n\
                    ret.nextOffset = req.offset;\n\
                    ret.totalCount = lastResponse.count;\n\
                }\n\
                return ret;",
      peer_id: peer_id,
      offset: offset,
      v: '5.103',
    }).then(({ response: { historyBatches, nextOffset, totalCount } }) => {
      return {
        batchItems: [].concat(...historyBatches),
        nextOffset,
        totalCount
      };
    })
  }

  /**
   * Быстрая выгрузка переписки через execute
   * @param {number} peer_id
   * @param {function} onStep
   * @return {Promise<{batchItems: *[], nextOffset, totalCount}>}
   */
  async getAllHistory(peer_id, onStep) {
    let offset = 0;
    let count = 1;

    while (offset < count && !this.closed) {
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
    return new Promise((resolve) => {
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
    elements.forEach((el) => {
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
    })
  }

  /**
   * Ищет меню по интервалу
   */
  static initMenuSearch() {
    setInterval(() => {
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
  static onMenuClick(event) {
    const currentTarget = event.currentTarget;
    const history = currentTarget ? currentTarget.closest('.im-page-history-w') : 0;
    const message = history ? history.querySelector('[data-msgid]') : 0;
    const peer_id = message ? message.dataset.peer : 0;

    if (!peer_id) {
      alert('Invalid peer_id');
      return false;
    }

    const onCloseCallback = (onClose) => {
      if (onCloseCallback.callback) {
        onCloseCallback.callback();
      } else {
        onCloseCallback.callback = onClose
      }
    };

    const statWindow = new MessageBox({
      title: 'Анализ переписки',
      onHide: onCloseCallback,
      width: 550,
    });

    ReactDOM.render(<App peer_id={peer_id} onCloseCallback={onCloseCallback}/>, statWindow.bodyNode);

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
    let firstDate = this.state.firstDate;
    let lastMessage = {};

    batchItems.forEach((message) => {
      lastMessage = message;

      if (limitDate && limitDate > message.date) {
        return;
      }

      firstDate = Math.min(firstDate || message.date, message.date);

      const from_id = message.from_id;

      counters.total++;

      // others
      counters.users[from_id] = (counters.users[from_id] || 0) + 1;

      message.day = new Date(message.date * 1000).toISOString().split('T')[0];

      counters.days[message.day] = counters.days[message.day] || { count: 0, words: {} };
      const dailyCounters = counters.days[message.day];

      dailyCounters.count++;

      // text
      (message.text || '')
        .toLocaleLowerCase()
        .replace(/\.(\w{2,5}|рф)/, '&#46;$1')
        .replace(/[\(\)\[\]\{\}<>\s,.:'"\/\\\|\?\*\+!@$%\^=\~—¯_-]+/igm, ' ')
        .replace(/&#\d+;/gmi, (char) => {
          return String.fromCodePoint(parseInt(char.substr(2)));
        })
        .replace(/\s{2,}/gm, '')
        .split(' ')
        .filter((word) => {
          return App.getWords().skip.indexOf(word) === -1 && /^[^\d]{3,25}$/i.test(word);
        })
        .forEach((word) => {
          counters.words[word] = (counters.words[word] || 0) + 1;
          dailyCounters.words[word] = (dailyCounters.words[word] || 0) + 1;
          counters.types.words++;
        });

      // attachments
      counters.types.forwards += message.fwd_messages.length;

      if (message.reply_message) {
        counters.types.reply_messages++;
      }

      (message.attachments || []).forEach((attachment) => {
        const type = attachment.type;
        counters.types[type] = (counters.types[type] || 0) + 1;

        if (type === 'sticker') {
          const sticker_id = attachment.sticker.sticker_id;
          counters.stickers[sticker_id] = (counters.stickers[sticker_id] || 0) + 1
        }
      });
    });

    const owner_ids = Object.keys(counters.users);
    await this.loadOwnersIfNeed(owner_ids);

    return this.setStatePromise({
      progress: `${nextOffset} / ${totalCount} (${~~(nextOffset / totalCount * 100)}%)`,
      counters,
      lastMessage,
      firstDate
    });
  }

  /**
   * Инициализация загрузки истории переписки
   */
  loadStats() {
    const { peer_id } = this.state;
    let limitDate = 0;

    if (this.state.date) {
      const date = new Date(this.state.date);
      limitDate = date / 1000;
    }

    this.setStatePromise({
      progress: 'Загрузка...',
      limitDate
    }).then(() => {
      return this.getAllHistory(peer_id, (data) => {
        return this.onStep(data);
      });
    }).then(() => {
      this.setState({
        progress: 'Готово',
      });
    }).catch((error) => {
      console.error(error);
    })
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

    return (
      <a href={owner.link}>{owner.name}</a>
    );
  }

  /**
   * Рендер стартового экрана
   * @return {*}
   */
  renderDateSelect() {
    return (
      <div className="im_stat_window">
        <div style={{ marginBottom: '6px' }}>
          Выберите стартовую дату для анализа переписки.<br/>
          Фильтрация по дате работает после загрузки всех сообщений.<br/>
          Можно сделать анализ всей переписки не указав дату.
        </div>
        <input
          type="date"
          className="dark"
          style={{
            width: '300px',
            marginRight: '9px',
          }}
          onChange={(e) => {
            const date = e.target.value;
            this.setState({ date });
          }}
        />
        <button className="flat_button" onClick={() => this.loadStats()}>Загрузить</button>
      </div>
    );
  }

  /**
   * Рендер заголовка анализа переписки
   * @return {*}
   */
  renderHeader() {
    const { progress, date, counters, lastMessage, firstDate } = this.state;
    const lostMessages = (lastMessage.conversation_message_id - counters.total) || 0;

    return (
      <div>
        Дата: {date || 'За все время'}<br/>
        Первое сообщение: {firstDate ? new Date(firstDate * 1000).toISOString() : '???'}<br/>
        Прогресс: {progress}<br/>
        Пропущено сообщений: {lostMessages}<br/>
        Всего сообщений: {counters.total}<br/>
        Пересланных: {counters.types.forwards}<br/>
        Ответов: {counters.types.reply_messages}<br/>
        Стикеров: {counters.types.sticker || 0}<br/>
        Фото: {counters.types.photo || 0}<br/>
        Видео: {counters.types.video || 0}<br/>
        Документов: {counters.types.doc || 0}<br/>
        Граффити: {counters.types.graffiti || 0}<br/>
        Аудио: {counters.types.audio || 0}<br/>
        Голосовых: {counters.types.audio_message || 0}
      </div>
    );
  }

  /**
   * Рендер таблицы с рейтингом
   * @param {object} list
   * @param {string} type
   * @param {function} render
   * @param {number} count
   * @return {string|*}
   */
  renderTopList(list, type, render, count) {
    const topList = Object.entries(list)
      .sort(([, count_a], [, count_b]) => {
        if (typeof count_a === 'object') {
          return count_b.count - count_a.count;
        } else {
          return count_b - count_a;
        }
      })
      .splice(0, count || 25);

    if (!topList.length) {
      return '';
    }

    return (
      <div style={{ marginTop: '6px' }}>
        <div style={{ padding: '6px', textAlign: 'center' }}>
          Топ <b>{topList.length} {type}</b>:
        </div>
        <div>
          {topList.map(render)}
        </div>
      </div>
    );
  }

  /**
   * Рендер таблиц с различными рейтингами
   * @return {*}
   */
  renderStat() {
    const { counters } = this.state;

    return (
      <div>
        {this.renderHeader()}<br/>
        {this.renderTopList(counters.users, 'пользователей', ([user_id, count]) => {
          return (
            <div>
              {this.renderLink(user_id)} - {count}
            </div>
          );
        })}
        {this.renderTopList(counters.days, 'дней', ([item_id, { count, words }]) => {
          const dailyWord = Object.entries(words)
            .sort(([, count_a], [, count_b]) => count_b - count_a)
            .splice(0, 5)
            .map(([word]) => word)
            .join(', ');

          return (
            <div>
              {item_id} - {count} - {dailyWord}
            </div>
          );
        }, 30)}
        {this.renderTopList(counters.stickers, 'стикеров', ([item_id, count]) => {
          return (
            <div style={{ display: 'inline-block', position: 'relative', width: 68 }}>
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  background: '#eee',
                  padding: '3px'
                }}
              >{count}</div>
              <img src={`https://vk.com/sticker/1-${item_id}-256`} width={68}/>
            </div>
          );
        }, 14)}
        {this.renderTopList(counters.words, 'слов', ([item_id, count]) => {
          return (
            <div>
              {item_id} - {count}
            </div>
          );
        }, 200)}
      </div>
    );
  }

  /**
   * Рендер приложения
   * @return {*}
   */
  render() {
    const { progress } = this.state;

    return (
      <div>
        {progress ? this.renderStat() : this.renderDateSelect()}
      </div>
    );
  }

  // endregion
}

App.initMenuSearch();
