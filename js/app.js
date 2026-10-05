(function () {
  'use strict';

  var data = window.GEO_DATA;
  var app = document.getElementById('app');
  var progressNode = document.getElementById('globalProgress');
  var mapTemplate = document.getElementById('map-template');
  var STORE_KEY = 'geoExpeditionDeutschlandProgress.v1';
  var MISSION_RUN_SIZES = {
    orientierung: 4,
    kuesten: 7,
    tiefland: 6,
    mittelgebirge: 6,
    quiz: 8
  };

  var runner = null;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function categoryClass(category) {
    var map = {
      'Küsten': 'coast',
      'Tiefland': 'tiefland',
      'Mittelgebirge': 'mittelgebirge',
      'Gewässer': 'gewaesser',
      'Bundesländer': 'bundeslaender',
      'Orientierung': 'orientierung'
    };
    return map[category] || normalize(category);
  }

  function loadProgress() {
    var fallback = { completedTasks: [], badges: [], lastQuiz: null, mistakes: [] };
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return Object.assign(fallback, parsed, {
        completedTasks: Array.isArray(parsed.completedTasks) ? parsed.completedTasks : [],
        badges: Array.isArray(parsed.badges) ? parsed.badges : [],
        mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : []
      });
    } catch (e) {
      return fallback;
    }
  }

  var progress = loadProgress();

  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch (e) {
      // Приложение должно работать даже без localStorage.
    }
    updateProgressPill();
  }

  function has(arr, item) { return arr.indexOf(item) !== -1; }
  function addUnique(arr, item) { if (!has(arr, item)) arr.push(item); }
  function removeFrom(arr, item) { var i = arr.indexOf(item); if (i !== -1) arr.splice(i, 1); }

  function updateProgressPill() {
    var total = data.tasks.length;
    var done = progress.completedTasks.filter(function (id) { return data.tasks.some(function (t) { return t.id === id; }); }).length;
    var pct = Math.round(done / total * 100);
    progressNode.textContent = 'Прогресс: ' + pct + '%';
  }

  function setActiveNav(route) {
    document.querySelectorAll('.topnav button').forEach(function (btn) {
      var r = btn.getAttribute('data-route');
      btn.classList.toggle('active', route === r || (route === 'mission' && r === 'missions'));
    });
  }

  function navigate(route) {
    window.location.hash = route;
  }

  document.body.addEventListener('click', function (event) {
    var routeButton = event.target.closest('[data-route]');
    if (routeButton) {
      event.preventDefault();
      navigate(routeButton.getAttribute('data-route'));
      return;
    }

    var missionButton = event.target.closest('[data-mission]');
    if (missionButton) {
      event.preventDefault();
      navigate('mission/' + missionButton.getAttribute('data-mission'));
    }
  });

  window.addEventListener('hashchange', renderFromHash);

  function renderFromHash() {
    runner = null;
    var hash = (window.location.hash || '#home').slice(1) || 'home';
    var parts = hash.split('/');
    var route = parts[0];
    setActiveNav(route);

    if (route === 'home') renderHome();
    else if (route === 'map') renderMapScreen();
    else if (route === 'missions') renderMissionsScreen();
    else if (route === 'mission') renderMissionIntro(parts[1] || 'orientierung');
    else if (route === 'dictionary') renderDictionaryScreen();
    else if (route === 'answers') renderAnswersScreen();
    else if (route === 'quiz') renderQuizScreen();
    else renderHome();

    app.focus({ preventScroll: true });
    updateProgressPill();
  }

  function countDone(missionId) {
    return data.tasks.filter(function (t) { return t.mission === missionId && has(progress.completedTasks, t.id); }).length;
  }

  function missionTasks(missionId) {
    return data.tasks.filter(function (t) { return t.mission === missionId; });
  }

  function badgeForMission(missionId) {
    return data.badges.find(function (b) { return b.mission === missionId; });
  }

  function renderHome() {
    var badgesHtml = data.badges.map(function (badge) {
      var done = has(progress.badges, badge.id);
      return '<div class="badge-chip ' + (done ? 'done' : '') + '"><span>' + esc(badge.emoji) + '</span><strong>' + esc(badge.label) + '</strong></div>';
    }).join('');
    var doneTasks = progress.completedTasks.length;
    var totalTasks = data.tasks.length;
    var doneBadges = progress.badges.length;

    app.innerHTML = '' +
      '<section class="hero">' +
        '<div class="hero-card">' +
          '<div>' +
            '<span class="kicker">🗺️ Учебная офлайн-игра для Klasse 5</span>' +
            '<h1>Geo-Expedition Deutschland</h1>' +
            '<p class="subtitle"><strong>Küsten · Tiefland · Mittelgebirge</strong></p>' +
            '<p class="lead">Ты будешь исследовать Германию по карте: побережья, низменности, средневысотные горы, реки и озёра. Сначала поймёшь смысл по-русски, затем выучишь немецкие термины и короткие ответы.</p>' +
          '</div>' +
          '<div class="hero-actions">' +
            '<button class="primary-btn" data-mission="orientierung">Начать игру</button>' +
            '<button class="soft-btn" data-route="map">Открыть карту</button>' +
            '<button class="soft-btn" data-route="dictionary">Словарь терминов</button>' +
            '<button class="soft-btn" data-route="answers">Готовые ответы</button>' +
            '<button class="soft-btn" data-route="quiz">Повторение / Quiz</button>' +
            '<button class="danger-btn" id="resetProgress">Сбросить прогресс</button>' +
          '</div>' +
        '</div>' +
        '<aside class="side-card">' +
          '<h2>Твой маршрут</h2>' +
          '<p class="subtitle">Мягкий режим: подсказки, повторная попытка и объяснение после ошибки.</p>' +
          '<div class="quick-grid">' +
            '<div class="quick-stat"><strong>' + doneTasks + '/' + totalTasks + '</strong><span>заданий отмечено</span></div>' +
            '<div class="quick-stat"><strong>' + doneBadges + '/' + data.badges.length + '</strong><span>значков собрано</span></div>' +
          '</div>' +
          '<h3 style="margin-top:22px">Значки</h3>' +
          '<div class="badge-grid">' + badgesHtml + '</div>' +
          '<p class="footer-note">Данные сохраняются в браузере через localStorage. Если сохранение недоступно, игра всё равно работает.</p>' +
        '</aside>' +
      '</section>';

    var reset = document.getElementById('resetProgress');
    reset.addEventListener('click', function () {
      if (confirm('Сбросить весь прогресс?')) {
        progress = { completedTasks: [], badges: [], lastQuiz: null, mistakes: [] };
        saveProgress();
        renderHome();
      }
    });
  }

  function renderMissionsScreen() {
    var cards = data.missions.map(function (mission) {
      var tasks = missionTasks(mission.id);
      var done = countDone(mission.id);
      var badge = badgeForMission(mission.id);
      var badgeDone = badge && has(progress.badges, badge.id);
      var terms = mission.terms.map(function (t) { return '<span class="term-pill">' + esc(t) + '</span>'; }).join('');
      return '<article class="mission-card ' + (badgeDone ? 'done' : '') + '">' +
        '<div class="mission-meta">' + (badge ? esc(badge.emoji + ' ' + badge.label) : 'Миссия') + '</div>' +
        '<h3>' + esc(mission.title) + '</h3>' +
        '<p>' + esc(mission.goal) + '</p>' +
        '<div class="term-list">' + terms + '</div>' +
        '<div class="mission-meta">Прогресс: ' + done + '/' + tasks.length + '</div>' +
        '<button class="primary-btn" data-mission="' + esc(mission.id) + '">' + (done ? 'Продолжить / повторить' : 'Открыть') + '</button>' +
      '</article>';
    }).join('');

    app.innerHTML = '<section>' +
      '<div class="screen-head"><div><h2>Миссии</h2><p>Каждая миссия связывает карту, признаки природы, использование человеком, проблему и короткий немецкий ответ.</p></div><button class="soft-btn" data-route="home">На старт</button></div>' +
      '<div class="mission-grid">' + cards + '</div>' +
    '</section>';
  }

  function renderMissionIntro(missionId) {
    var mission = data.missions.find(function (m) { return m.id === missionId; }) || data.missions[0];
    var tasks = missionTasks(mission.id);
    var done = countDone(mission.id);
    var badge = badgeForMission(mission.id);
    var badgeDone = badge && has(progress.badges, badge.id);
    var terms = mission.terms.map(function (t) { return '<span class="term-pill">' + esc(t) + '</span>'; }).join('');
    var taskRows = tasks.map(function (task, index) {
      var doneTask = has(progress.completedTasks, task.id);
      return '<div class="review-item"><strong>' + (index + 1) + '. ' + esc(typeLabel(task.type)) + '</strong><br>' + esc(task.prompt) + (doneTask ? ' <span class="tag tiefland">готово</span>' : '') + '</div>';
    }).join('');

    app.innerHTML = '<section>' +
      '<div class="screen-head"><div><h2>' + esc(mission.title) + '</h2><p>' + esc(mission.goal) + '</p></div><button class="soft-btn" data-route="missions">Все миссии</button></div>' +
      '<div class="task-shell">' +
        '<article class="task-card">' +
          '<div class="mission-meta">' + (badge ? esc(badge.emoji + ' Значок: ' + badge.label) : '') + (badgeDone ? ' · уже получен' : '') + '</div>' +
          '<h3>Цель</h3><p>' + esc(mission.goal) + '</p>' +
          '<h3>Ключевые термины</h3><div class="term-list">' + terms + '</div>' +
          '<h3 style="margin-top:18px">Финальная немецкая фраза</h3><p class="answer-text">' + esc(mission.finalPhrase) + '</p>' +
          '<div class="button-row"><button class="primary-btn" id="startMission">Начать / повторить миссию</button><button class="soft-btn" data-route="map">Открыть карту перед миссией</button></div>' +
        '</article>' +
        '<aside class="side-card"><h3>Задания: ' + done + '/' + tasks.length + '</h3><div class="review-list">' + taskRows + '</div></aside>' +
      '</div>' +
    '</section>';

    document.getElementById('startMission').addEventListener('click', function () {
      startMissionRun(mission.id, null);
    });
  }

  function typeLabel(type) {
    return {
      map: 'Найди на карте',
      choice: 'Выбери термин',
      match: 'Соедини пары',
      trio: 'Природа → использование → проблема',
      order: 'Собери ответ'
    }[type] || type;
  }

  function selectMissionRunTasks(missionId, onlyIds) {
    var tasks = missionTasks(missionId);
    if (onlyIds && onlyIds.length) {
      return onlyIds.map(function (id) {
        return tasks.find(function (t) { return t.id === id; });
      }).filter(Boolean);
    }
    var runSize = MISSION_RUN_SIZES[missionId] || tasks.length;
    return shuffle(tasks).slice(0, Math.min(runSize, tasks.length));
  }

  function startMissionRun(missionId, onlyIds) {
    var tasks = selectMissionRunTasks(missionId, onlyIds);
    runner = {
      missionId: missionId,
      tasks: tasks,
      index: 0,
      correct: 0,
      wrongIds: [],
      onlyIds: onlyIds || null
    };
    renderRunnerTask();
  }

  function renderRunnerTask() {
    if (!runner) return;
    if (runner.index >= runner.tasks.length) {
      finishRunner();
      return;
    }
    var mission = data.missions.find(function (m) { return m.id === runner.missionId; });
    var task = runner.tasks[runner.index];

    app.innerHTML = '<section>' +
      '<div class="screen-head"><div><h2>' + esc(mission.title) + '</h2><p>Задание ' + (runner.index + 1) + ' из ' + runner.tasks.length + ' · ' + esc(typeLabel(task.type)) + '</p></div><button class="soft-btn" data-mission="' + esc(mission.id) + '">Выйти к миссии</button></div>' +
      '<div id="taskMount"></div>' +
    '</section>';

    renderTask(document.getElementById('taskMount'), task, runner.index + 1, runner.tasks.length, function (wasCorrect) {
      addUnique(progress.completedTasks, task.id);
      if (wasCorrect) runner.correct += 1;
      else addUnique(runner.wrongIds, task.id);
      saveProgress();
      runner.index += 1;
      renderRunnerTask();
    });
  }

  function finishRunner() {
    var mission = data.missions.find(function (m) { return m.id === runner.missionId; });
    var badge = badgeForMission(runner.missionId);
    if (badge) addUnique(progress.badges, badge.id);

    if (runner.missionId === 'quiz') {
      var topics = topicsForMistakes(runner.wrongIds);
      progress.lastQuiz = {
        correct: runner.correct,
        total: runner.tasks.length,
        date: new Date().toISOString(),
        wrongIds: runner.wrongIds,
        topics: topics
      };
      progress.mistakes = runner.wrongIds.slice();
    }
    saveProgress();

    var wrongRows = runner.wrongIds.length ? runner.wrongIds.map(function (id) {
      var task = data.tasks.find(function (t) { return t.id === id; });
      return '<div class="review-item"><strong>' + esc(task ? task.prompt : id) + '</strong><br><span class="subtitle">' + esc(task ? task.explanation : '') + '</span></div>';
    }).join('') : '<p>Ошибок нет. Отличная работа!</p>';

    app.innerHTML = '<section>' +
      '<div class="result-card">' +
        '<p class="kicker">' + (badge ? esc(badge.emoji + ' ' + badge.label) : 'Миссия завершена') + '</p>' +
        '<h2>' + esc(mission.title) + ' завершена</h2>' +
        '<div class="result-score">' + runner.correct + '/' + runner.tasks.length + '</div>' +
        '<p>Задания можно повторять без штрафа. Главное — понять связь: место на карте → тип ландшафта → природные признаки → использование → проблема → немецкий ответ.</p>' +
        '<h3>Что повторить</h3>' +
        '<div class="review-list">' + wrongRows + '</div>' +
        '<div class="button-row" style="margin-top:18px">' +
          '<button class="primary-btn" data-mission="' + esc(mission.id) + '">Повторить миссию</button>' +
          '<button class="soft-btn" data-route="missions">Все миссии</button>' +
          '<button class="soft-btn" data-route="answers">Готовые ответы</button>' +
        '</div>' +
      '</div>' +
    '</section>';
    runner = null;
  }

  function topicsForMistakes(ids) {
    var set = [];
    ids.forEach(function (id) {
      var task = data.tasks.find(function (t) { return t.id === id; });
      if (!task) return;
      var mission = data.missions.find(function (m) { return m.id === task.mission; });
      addUnique(set, mission ? mission.title : task.mission);
    });
    return set;
  }

  function renderTask(mount, task, number, total, onComplete) {
    var wrong = false;
    var completed = false;

    mount.innerHTML = '<div class="task-shell">' +
      '<div class="task-card" id="taskMain">' +
        '<div class="task-topline"><span>' + esc(typeLabel(task.type)) + '</span><span>' + number + '/' + total + '</span></div>' +
        '<h3 class="task-prompt">' + esc(task.prompt) + '</h3>' +
        '<div id="taskBody"></div>' +
        '<div id="feedback" class="feedback" hidden></div>' +
        '<div class="task-actions" id="taskActions" style="margin-top:12px"></div>' +
      '</div>' +
      '<aside class="side-card">' +
        '<h3>Помощь</h3>' +
        '<p>При ошибке можно открыть подсказку, попробовать ещё раз или показать правильный ответ.</p>' +
        '<p><strong>Подсказка:</strong> ' + esc(task.hint || 'Посмотри на ключевые слова в задании.') + '</p>' +
        '<button class="soft-btn" id="openDictionaryFromTask">Открыть словарь</button>' +
      '</aside>' +
    '</div>';

    document.getElementById('openDictionaryFromTask').addEventListener('click', function () { navigate('dictionary'); });

    var body = document.getElementById('taskBody');
    var feedback = document.getElementById('feedback');
    var actions = document.getElementById('taskActions');
    var restoreActions = null;

    function setFeedback(kind, title, text) {
      feedback.hidden = false;
      feedback.className = 'feedback ' + kind;
      feedback.innerHTML = '<p><strong>' + esc(title) + '</strong></p><p>' + esc(text) + '</p>';
    }

    function setActions(html) {
      actions.innerHTML = html;
    }

    function complete(ok) {
      if (completed) return;
      completed = true;
      setActions('<button class="primary-btn" id="nextTask">Дальше</button>');
      document.getElementById('nextTask').addEventListener('click', function () { onComplete(ok); });
    }

    function mistake(customText) {
      wrong = true;
      setFeedback('bad', 'Noch nicht ganz. Schau dir den Begriff noch einmal an.', customText || task.explanation || 'Попробуй ещё раз с подсказкой.');
      setActions('<button class="soft-btn" id="hintBtn">Подсказка</button><button class="ghost-btn" id="tryAgainBtn">Попробовать ещё раз</button><button class="danger-btn" id="showAnswerBtn">Показать правильный ответ</button>');
      document.getElementById('hintBtn').addEventListener('click', function () {
        setFeedback('warn', 'Подсказка', task.hint || 'Посмотри на ключевые слова в задании.');
      });
      document.getElementById('tryAgainBtn').addEventListener('click', function () {
        setFeedback('warn', 'Попробуй ещё раз', task.hint || 'Ты можешь ещё раз выбрать ответ.');
        if (restoreActions) restoreActions();
      });
      document.getElementById('showAnswerBtn').addEventListener('click', function () {
        revealAnswer();
        setFeedback('warn', 'Правильный ответ', task.explanation || answerText(task));
        complete(false);
      });
    }

    function success() {
      setFeedback('ok', 'Richtig! Gut gemacht.', task.success || task.explanation || answerText(task));
      complete(true);
    }

    function revealAnswer() {}

    if (task.type === 'map') {
      body.innerHTML = '<div class="task-map" id="taskMapMount"></div>';
      var mapNode = cloneMapNode();
      document.getElementById('taskMapMount').appendChild(mapNode);
      var controller = initMap(mapNode, {
        layer: task.layer || 'physical',
        filter: 'Alle',
        onObjectClick: function (id) {
          if (completed) return;
          if (task.targetIds.indexOf(id) !== -1) {
            controller.highlight(task.targetIds, 'selected');
            success();
          } else {
            controller.highlight([id], 'selected');
            mistake('Ты кликнул по другому объекту. ' + (task.hint || 'Посмотри на карту ещё раз.'));
          }
        }
      });
      revealAnswer = function () { controller.highlight(task.targetIds, 'correct-target'); };
      setActions('<button class="soft-btn" id="taskHintOnly">Подсказка</button>');
      document.getElementById('taskHintOnly').addEventListener('click', function () {
        setFeedback('warn', 'Подсказка', task.hint || 'Посмотри на слой карты.');
      });
    }

    if (task.type === 'choice') {
      var selected = [];
      var isMulti = !!task.multi;
      body.innerHTML = '<div class="choice-grid">' + task.options.map(function (option) {
        return '<button class="choice-btn" data-value="' + esc(option) + '">' + esc(option) + '</button>';
      }).join('') + '</div>';
      if (isMulti) {
        restoreActions = function () {
          setActions('<button class="primary-btn" id="checkMulti">Проверить</button><button class="soft-btn" id="taskHintOnly">Подсказка</button>');
          document.getElementById('taskHintOnly').addEventListener('click', function () { setFeedback('warn', 'Подсказка', task.hint); });
          document.getElementById('checkMulti').addEventListener('click', function () {
            var ok = sameSet(selected, task.answer);
            markChoices(task.answer, selected);
            ok ? success() : mistake('Выбраны не все подходящие карточки или есть лишняя карточка.');
          });
        };
        restoreActions();
      } else {
        setActions('<button class="soft-btn" id="taskHintOnly">Подсказка</button>');
        document.getElementById('taskHintOnly').addEventListener('click', function () { setFeedback('warn', 'Подсказка', task.hint); });
      }

      body.querySelectorAll('.choice-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (completed) return;
          var value = btn.getAttribute('data-value');
          if (isMulti) {
            btn.classList.toggle('selected');
            if (has(selected, value)) removeFrom(selected, value);
            else selected.push(value);
          } else {
            body.querySelectorAll('.choice-btn').forEach(function (b) { b.classList.remove('selected', 'correct', 'wrong'); });
            btn.classList.add('selected');
            if (value === task.answer) {
              btn.classList.add('correct');
              success();
            } else {
              btn.classList.add('wrong');
              markChoices([task.answer], [value]);
              mistake(task.explanation || 'Это не подходит. Попробуй связать термин с объяснением.');
            }
          }
        });
      });
      function markChoices(correct, current) {
        body.querySelectorAll('.choice-btn').forEach(function (btn) {
          var value = btn.getAttribute('data-value');
          btn.classList.toggle('correct', correct.indexOf(value) !== -1);
          btn.classList.toggle('wrong', current.indexOf(value) !== -1 && correct.indexOf(value) === -1);
        });
      }
      revealAnswer = function () { markChoices(Array.isArray(task.answer) ? task.answer : [task.answer], selected); };
    }

    if (task.type === 'match') {
      var left = task.pairs.map(function (p) { return p[0]; });
      var right = shuffle(task.pairs.map(function (p) { return p[1]; }));
      var matched = [];
      var selectedLeft = null;
      body.innerHTML = '<div class="pair-grid"><div class="pair-column" id="leftPairs">' + left.map(function (v) {
        return '<button class="pair-btn" data-left="' + esc(v) + '">' + esc(v) + '</button>';
      }).join('') + '</div><div class="pair-column" id="rightPairs">' + right.map(function (v) {
        return '<button class="pair-btn" data-right="' + esc(v) + '">' + esc(v) + '</button>';
      }).join('') + '</div></div>';
      setActions('<button class="soft-btn" id="taskHintOnly">Подсказка</button>');
      document.getElementById('taskHintOnly').addEventListener('click', function () { setFeedback('warn', 'Подсказка', task.hint); });

      body.querySelectorAll('[data-left]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (completed || btn.classList.contains('matched')) return;
          body.querySelectorAll('[data-left]').forEach(function (b) { b.classList.remove('active'); });
          selectedLeft = btn.getAttribute('data-left');
          btn.classList.add('active');
        });
      });
      body.querySelectorAll('[data-right]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (completed || btn.classList.contains('matched')) return;
          if (!selectedLeft) {
            setFeedback('warn', 'Сначала выбери термин слева', 'Потом нажми подходящее объяснение справа.');
            return;
          }
          var selectedRight = btn.getAttribute('data-right');
          if (pairIsCorrect(task.pairs, selectedLeft, selectedRight)) {
            addUnique(matched, selectedLeft);
            body.querySelector('[data-left="' + cssEscape(selectedLeft) + '"]').classList.add('matched');
            btn.classList.add('matched');
            selectedLeft = null;
            body.querySelectorAll('[data-left]').forEach(function (b) { b.classList.remove('active'); });
            if (matched.length === task.pairs.length) success();
            else setFeedback('ok', 'Richtig!', 'Пара найдена. Продолжай.');
          } else {
            mistake('Эта пара не подходит. ' + (task.hint || 'Сравни термин и объяснение ещё раз.'));
          }
        });
      });
      revealAnswer = function () {
        task.pairs.forEach(function (p) {
          var leftBtn = body.querySelector('[data-left="' + cssEscape(p[0]) + '"]');
          var rightBtn = body.querySelector('[data-right="' + cssEscape(p[1]) + '"]');
          if (leftBtn) leftBtn.classList.add('matched');
          if (rightBtn) rightBtn.classList.add('matched');
        });
      };
    }

    if (task.type === 'trio') {
      var selections = {};
      body.innerHTML = '<div class="trio-grid">' + task.groups.map(function (group, groupIndex) {
        var options = shuffle(group.options.slice());
        if (options.length > 1 && options[0] === group.answer) {
          var swapIndex = Math.floor(Math.random() * (options.length - 1)) + 1;
          var first = options[0];
          options[0] = options[swapIndex];
          options[swapIndex] = first;
        }
        return '<div class="trio-group"><h4>' + esc(group.label) + '</h4>' + options.map(function (option) {
          return '<button class="choice-btn" data-group="' + groupIndex + '" data-value="' + esc(option) + '">' + esc(option) + '</button>';
        }).join('') + '</div>';
      }).join('') + '</div>';
      restoreActions = function () {
        setActions('<button class="primary-btn" id="checkTrio">Проверить</button><button class="soft-btn" id="taskHintOnly">Подсказка</button>');
        document.getElementById('taskHintOnly').addEventListener('click', function () { setFeedback('warn', 'Подсказка', task.hint); });
        document.getElementById('checkTrio').addEventListener('click', function () {
          var ok = task.groups.every(function (group, index) { return selections[index] === group.answer; });
          markTrio();
          if (ok) {
            setFeedback('ok', 'Richtig! Gut gemacht.', task.success + ' ' + (task.final || ''));
            complete(true);
          } else {
            mistake('Проверь цепочку: природный признак → использование человеком → возможная проблема.');
          }
        });
      };
      restoreActions();
      body.querySelectorAll('.choice-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (completed) return;
          var group = btn.getAttribute('data-group');
          body.querySelectorAll('[data-group="' + group + '"]').forEach(function (b) { b.classList.remove('selected'); });
          btn.classList.add('selected');
          selections[group] = btn.getAttribute('data-value');
        });
      });
      function markTrio() {
        body.querySelectorAll('.choice-btn').forEach(function (btn) {
          var group = task.groups[Number(btn.getAttribute('data-group'))];
          var value = btn.getAttribute('data-value');
          btn.classList.toggle('correct', value === group.answer);
          btn.classList.toggle('wrong', btn.classList.contains('selected') && value !== group.answer);
        });
      }
      revealAnswer = markTrio;
    }

    if (task.type === 'order') {
      var bank = shuffle(task.pieces.slice());
      var answer = [];
      body.innerHTML = '<p class="subtitle">Нажимай кусочки в правильном порядке.</p><div class="piece-bank" id="pieceBank">' + bank.map(function (piece, index) {
        return '<button class="piece-btn" data-index="' + index + '" data-piece="' + esc(piece) + '">' + esc(piece) + '</button>';
      }).join('') + '</div><h4>Твой ответ:</h4><div class="answer-bank" id="answerBank"></div>';
      restoreActions = function () {
        setActions('<button class="primary-btn" id="checkOrder">Проверить</button><button class="soft-btn" id="resetOrder">Сбросить</button><button class="soft-btn" id="taskHintOnly">Подсказка</button>');
        document.getElementById('taskHintOnly').addEventListener('click', function () { setFeedback('warn', 'Подсказка', task.hint); });
        document.getElementById('resetOrder').addEventListener('click', resetOrder);
        document.getElementById('checkOrder').addEventListener('click', function () {
          if (arraysEqual(answer, task.answer)) success();
          else mistake('Порядок пока не совпадает. Подумай: сначала определение или причина, потом следствие.');
        });
      };
      restoreActions();
      function resetOrder() {
        answer = [];
        renderAnswerBank();
        body.querySelectorAll('.piece-btn').forEach(function (b) { b.classList.remove('used'); b.disabled = false; });
      }
      body.querySelectorAll('.piece-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (completed || btn.classList.contains('used')) return;
          answer.push(btn.getAttribute('data-piece'));
          btn.classList.add('used');
          btn.disabled = true;
          renderAnswerBank();
        });
      });
      function renderAnswerBank() {
        document.getElementById('answerBank').innerHTML = answer.map(function (piece, index) {
          return '<button class="piece-btn" data-remove="' + index + '">' + esc(piece) + '</button>';
        }).join('') || '<span class="subtitle">Здесь появится собранная фраза.</span>';
        document.querySelectorAll('[data-remove]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var idx = Number(btn.getAttribute('data-remove'));
            var piece = answer[idx];
            answer.splice(idx, 1);
            body.querySelectorAll('.piece-btn[data-piece]').forEach(function (b) {
              if (b.getAttribute('data-piece') === piece && b.classList.contains('used')) {
                b.classList.remove('used'); b.disabled = false;
              }
            });
            renderAnswerBank();
          });
        });
      }
      renderAnswerBank();
      revealAnswer = function () {
        answer = task.answer.slice();
        renderAnswerBank();
        body.querySelectorAll('.piece-btn[data-piece]').forEach(function (b) { b.classList.add('used'); b.disabled = true; });
      };
    }
  }

  function answerText(task) {
    if (task.answer) return Array.isArray(task.answer) ? task.answer.join(' ') : task.answer;
    if (task.targetIds) return task.targetIds.join(', ');
    if (task.final) return task.final;
    return task.explanation || '';
  }

  function pairIsCorrect(pairs, left, right) {
    return pairs.some(function (p) { return p[0] === left && p[1] === right; });
  }

  function sameSet(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every(function (item) { return b.indexOf(item) !== -1; });
  }

  function arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every(function (value, index) { return value === b[index]; });
  }

  function shuffle(items) {
    var copy = items.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i]; copy[i] = copy[j]; copy[j] = temp;
    }
    return copy;
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  function cloneMapNode() {
    return mapTemplate.content.firstElementChild.cloneNode(true);
  }

  function initMap(mapFigure, options) {
    options = options || {};
    var state = {
      layer: options.layer || 'physical',
      filter: options.filter || 'Alle'
    };
    var svg = mapFigure.querySelector('.germany-map');
    var objects = Array.prototype.slice.call(mapFigure.querySelectorAll('.map-object'));

    objects.forEach(function (el) {
      var id = el.getAttribute('data-id');
      var obj = data.mapObjects.find(function (o) { return o.id === id; });
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', obj ? obj.label : id);
      el.addEventListener('click', function (event) {
        event.stopPropagation();
        handleObjectClick(id, el);
      });
      el.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleObjectClick(id, el);
        }
      });
    });

    svg.addEventListener('click', function () {
      if (options.onEmptyClick) options.onEmptyClick();
    });

    function handleObjectClick(id, el) {
      if (options.onObjectClick) {
        options.onObjectClick(id, el, api);
        return;
      }
      api.highlight([id], 'selected');
      if (options.onSelect) options.onSelect(id, el, api);
    }

    function apply() {
      mapFigure.querySelectorAll('[data-map-layer]').forEach(function (layer) {
        layer.classList.toggle('hidden', layer.getAttribute('data-map-layer') !== state.layer);
      });
      mapFigure.querySelectorAll('[data-label-layer]').forEach(function (layer) {
        layer.classList.toggle('hidden', layer.getAttribute('data-label-layer') !== state.layer);
      });
      objects.forEach(function (el) {
        var category = el.getAttribute('data-category') || 'Alle';
        var dim = state.filter !== 'Alle' && category !== state.filter;
        el.classList.toggle('dimmed', dim);
      });
    }

    var api = {
      setLayer: function (layer) { state.layer = layer; apply(); },
      setFilter: function (filter) { state.filter = filter; apply(); },
      highlight: function (ids, className) {
        className = className || 'selected';
        objects.forEach(function (el) { el.classList.remove('selected', 'correct-target'); });
        objects.forEach(function (el) {
          if (ids.indexOf(el.getAttribute('data-id')) !== -1) el.classList.add(className);
        });
      },
      clearHighlight: function () { objects.forEach(function (el) { el.classList.remove('selected', 'correct-target'); }); },
      getLayer: function () { return state.layer; },
      getFilter: function () { return state.filter; }
    };

    apply();
    return api;
  }

  function renderMapScreen() {
    app.innerHTML = '<section>' +
      '<div class="screen-head"><div><h2>Интерактивная карта Германии</h2><p>Переключай слои, фильтруй объекты и кликай по карте, чтобы открыть карточку.</p></div><button class="soft-btn" data-route="home">На старт</button></div>' +
      '<div class="map-layout">' +
        '<div class="map-panel">' +
          '<div class="map-toolbar">' +
            '<div class="layer-row" aria-label="Слои карты">' +
              '<button class="map-control-btn active" data-layer="physical">Physische Karte</button>' +
              '<button class="map-control-btn" data-layer="political">Politische Karte</button>' +
              '<button class="map-control-btn" data-layer="water">Gewässerkarte</button>' +
            '</div>' +
            '<label>Фильтр <select id="mapFilter"><option>Alle</option><option>Küsten</option><option>Tiefland</option><option>Mittelgebirge</option><option>Gewässer</option><option>Bundesländer</option></select></label>' +
          '</div>' +
          '<div id="mapMount"></div>' +
        '</div>' +
        '<aside class="info-panel" id="objectInfo"><div class="empty-state"><div><h3>Выбери объект на карте</h3><p>Здесь появится немецкий термин, русское объяснение и короткая немецкая формулировка.</p></div></div></aside>' +
      '</div>' +
    '</section>';

    var mapNode = cloneMapNode();
    document.getElementById('mapMount').appendChild(mapNode);
    var controller = initMap(mapNode, {
      layer: 'physical',
      filter: 'Alle',
      onSelect: function (id) { renderObjectInfo(id, controller); }
    });

    document.querySelectorAll('[data-layer]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-layer]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        controller.setLayer(btn.getAttribute('data-layer'));
      });
    });
    document.getElementById('mapFilter').addEventListener('change', function (event) {
      controller.setFilter(event.target.value);
    });
  }

  function renderObjectInfo(id, controller) {
    var obj = data.mapObjects.find(function (o) { return o.id === id; });
    var panel = document.getElementById('objectInfo');
    if (!obj || !panel) return;
    var missionId = missionForCategory(obj.category);
    var terms = obj.terms.map(function (t) { return '<span class="term-pill">' + esc(t) + '</span>'; }).join('');
    var layers = obj.layer.map(function (l) { return '<span class="tag">' + esc(layerName(l)) + '</span>'; }).join('');
    panel.innerHTML = '<div class="object-card">' +
      '<div class="tag-row"><span class="tag ' + categoryClass(obj.category) + '">' + esc(obj.category) + '</span>' + layers + '</div>' +
      '<h3 class="object-title">' + esc(obj.label) + '</h3>' +
      '<div class="object-section"><strong>Русское объяснение</strong><p>' + esc(obj.ru) + '</p></div>' +
      '<div class="object-section"><strong>Kurze deutsche Formulierung</strong><p class="de-term">' + esc(obj.de) + '</p></div>' +
      '<div class="object-section"><strong>Связанные термины</strong><div class="term-list" style="margin-top:8px">' + terms + '</div></div>' +
      '<div class="button-row">' + (missionId ? '<button class="primary-btn" data-mission="' + esc(missionId) + '">Потренироваться</button>' : '') + '<button class="soft-btn" data-route="dictionary">Открыть словарь</button></div>' +
    '</div>';
  }

  function layerName(layer) {
    return { physical: 'Physische Karte', political: 'Politische Karte', water: 'Gewässerkarte' }[layer] || layer;
  }

  function missionForCategory(category) {
    if (category === 'Küsten') return 'kuesten';
    if (category === 'Tiefland') return 'tiefland';
    if (category === 'Mittelgebirge') return 'mittelgebirge';
    if (category === 'Bundesländer' || category === 'Gewässer' || category === 'Orientierung') return 'orientierung';
    return null;
  }

  function renderDictionaryScreen() {
    var categories = ['Alle', 'Orientierung', 'Küsten', 'Tiefland', 'Mittelgebirge', 'Gewässer'];
    app.innerHTML = '<section>' +
      '<div class="screen-head"><div><h2>Словарь терминов</h2><p>Немецкие термины с артиклем, русским смыслом, простым определением и примером.</p></div><button class="soft-btn" data-route="home">На старт</button></div>' +
      '<div class="dictionary-toolbar">' +
        '<input type="search" id="termSearch" placeholder="Поиск: Watt, Relief, Ackerbau..." aria-label="Поиск по словарю">' +
        '<div class="category-chips">' + categories.map(function (cat) { return '<button class="chip ' + (cat === 'Alle' ? 'active' : '') + '" data-category-filter="' + esc(cat) + '">' + esc(cat) + '</button>'; }).join('') + '</div>' +
      '</div>' +
      '<div id="termsCount" class="subtitle"></div>' +
      '<div class="term-grid" id="termGrid"></div>' +
    '</section>';

    var search = document.getElementById('termSearch');
    var activeCategory = 'Alle';
    document.querySelectorAll('[data-category-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-category-filter]').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-category-filter');
        drawTerms();
      });
    });
    search.addEventListener('input', drawTerms);

    function drawTerms() {
      var q = normalize(search.value);
      var terms = data.terms.filter(function (term) {
        var text = normalize(term.term + ' ' + term.ru + ' ' + term.de + ' ' + term.example);
        var categoryOk = activeCategory === 'Alle' || term.category === activeCategory;
        var queryOk = !q || text.indexOf(q) !== -1;
        return categoryOk && queryOk;
      });
      document.getElementById('termsCount').textContent = 'Найдено карточек: ' + terms.length;
      document.getElementById('termGrid').innerHTML = terms.map(function (term) {
        return '<article class="term-card">' +
          '<div class="tag-row"><span class="tag ' + categoryClass(term.category) + '">' + esc(term.category) + '</span><span class="tag">' + esc(term.article) + '</span></div>' +
          '<h3>' + esc(term.term) + '</h3>' +
          '<p><strong>По-русски:</strong> ' + esc(term.ru) + '</p>' +
          '<p><strong>Deutsch:</strong> <span class="de-term">' + esc(term.de) + '</span></p>' +
          '<p><strong>Beispiel:</strong> ' + esc(term.example) + '</p>' +
        '</article>';
      }).join('') || '<div class="empty-state"><div><h3>Ничего не найдено</h3><p>Попробуй другое слово или категорию.</p></div></div>';
    }
    drawTerms();
  }

  function renderAnswersScreen() {
    app.innerHTML = '<section>' +
      '<div class="screen-head"><div><h2>Готовые ответы</h2><p>Короткие немецкие формулировки, которые можно повторять перед уроком или контрольной.</p></div><button class="soft-btn" data-route="home">На старт</button></div>' +
      '<div class="answers-grid">' + data.readyAnswers.map(function (item, index) {
        return '<article class="answer-card">' +
          '<div class="tag-row"><span class="tag">' + (index + 1) + '</span><span class="tag ' + categoryClass(topicCategory(item.topic)) + '">' + esc(item.topic) + '</span></div>' +
          '<h3>' + esc(item.topic) + '</h3>' +
          '<p class="answer-text de-term">' + esc(item.answer) + '</p>' +
          '<p><strong>Смысл:</strong> ' + esc(item.ru) + '</p>' +
          '<button class="soft-btn" data-keywords="' + index + '">Показать ключевые слова</button>' +
          '<div class="keywords" id="keywords-' + index + '">' + item.keywords.map(function (k) { return '<span class="keyword">' + esc(k) + '</span>'; }).join('') + '</div>' +
        '</article>';
      }).join('') + '</div>' +
    '</section>';

    document.querySelectorAll('[data-keywords]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = 'keywords-' + btn.getAttribute('data-keywords');
        var box = document.getElementById(id);
        box.classList.toggle('open');
        btn.textContent = box.classList.contains('open') ? 'Скрыть ключевые слова' : 'Показать ключевые слова';
      });
    });
  }

  function topicCategory(topic) {
    if (/Küste|Nordsee|Ostsee|Watt|Küstenschutz/.test(topic)) return 'Küsten';
    if (/Tiefland|Braunkohle/.test(topic)) return 'Tiefland';
    if (/Mittelgebirge|Talsperren|Forstwirtschaft/.test(topic)) return 'Mittelgebirge';
    return 'Orientierung';
  }

  function renderQuizScreen() {
    var last = progress.lastQuiz;
    var lastHtml = last ? '<div class="result-card"><h3>Последний результат</h3><div class="result-score">' + last.correct + '/' + last.total + '</div><p class="subtitle">Дата: ' + esc(new Date(last.date).toLocaleString('ru-RU')) + '</p>' +
      (last.topics && last.topics.length ? '<p><strong>Повторить:</strong> ' + esc(last.topics.join(', ')) + '</p>' : '<p>Ошибок не было.</p>') + '</div>' : '<div class="result-card"><h3>Quiz ещё не пройден</h3><p>Здесь появится последний результат и список тем для повторения.</p></div>';
    var repeatButton = progress.mistakes && progress.mistakes.length ? '<button class="soft-btn" id="repeatMistakes">Повторить ошибки</button>' : '';
    app.innerHTML = '<section>' +
      '<div class="screen-head"><div><h2>Abschlussquiz / Wiederholung</h2><p>Смешанные задания: карта, термины, пары, цепочки и немецкие ответы.</p></div><button class="soft-btn" data-route="home">На старт</button></div>' +
      '<div class="task-shell">' +
        '<article class="task-card"><h3>Финальный quiz</h3><p>В quiz 8 заданий по всем темам. Ошибки сохраняются для режима «Повторить ошибки».</p><div class="button-row"><button class="primary-btn" id="startQuiz">Начать quiz</button>' + repeatButton + '</div></article>' +
        lastHtml +
      '</div>' +
    '</section>';
    document.getElementById('startQuiz').addEventListener('click', function () { startMissionRun('quiz', null); });
    var repeat = document.getElementById('repeatMistakes');
    if (repeat) repeat.addEventListener('click', function () { startMissionRun('quiz', progress.mistakes); });
  }

  updateProgressPill();
  renderFromHash();
})();
