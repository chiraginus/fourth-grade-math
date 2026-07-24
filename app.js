const QUESTIONS_PER_ROUND = 20;
const STORAGE_KEY = 'fourthGradeMathStats';
const MAX_SESSIONS = 300;
const RECENT_QUESTIONS_LIMIT = 30;

const TOPIC_LABELS = {
  multiplication: 'Multiplication',
  division: 'Division',
  addition: 'Addition',
  subtraction: 'Subtraction',
  fractions: 'Fractions',
  mixed: 'Mixed Review',
};

const state = {
  topic: 'multiplication',
  questions: [],
  currentIndex: 0,
  correctCount: 0,
  streak: 0,
  answered: false,
  sessionAnswers: [],
  stats: loadStats(),
};

function defaultStats() {
  return { stars: 0, bestStreak: 0, sessions: [], recentQuestionKeys: [] };
}

function loadStats() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data) return defaultStats();
    return {
      stars: data.stars || 0,
      bestStreak: data.bestStreak || 0,
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      recentQuestionKeys: Array.isArray(data.recentQuestionKeys) ? data.recentQuestionKeys : [],
    };
  } catch {
    return defaultStats();
  }
}

function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = localDateString();
  const yesterday = localDateString(new Date(Date.now() - 86400000));
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAnswer(q, answer) {
  if (answer === null || answer === undefined || answer === '') return '—';
  return q.type === 'choice' ? String(answer) : String(answer);
}

function recordAnswer(userAnswer, isCorrect, correctAnswer) {
  const q = state.questions[state.currentIndex];
  state.sessionAnswers.push({
    question: q.text.replace(/\n/g, ' '),
    userAnswer: formatAnswer(q, userAnswer),
    correctAnswer: formatAnswer(q, correctAnswer),
    correct: isCorrect,
  });
}

function saveSession() {
  const session = {
    id: Date.now(),
    date: localDateString(),
    timestamp: new Date().toISOString(),
    topic: state.topic,
    correct: state.correctCount,
    total: QUESTIONS_PER_ROUND,
    answers: state.sessionAnswers,
  };
  state.stats.sessions.unshift(session);
  if (state.stats.sessions.length > MAX_SESSIONS) {
    state.stats.sessions = state.stats.sessions.slice(0, MAX_SESSIONS);
  }
  updateRecentQuestions(session);
}

function questionKey(question) {
  return question.text.replace(/\s+/g, ' ').trim();
}

function updateRecentQuestions(session) {
  session.answers.forEach((answer) => {
    state.stats.recentQuestionKeys = state.stats.recentQuestionKeys.filter(
      (key) => key !== answer.question
    );
    state.stats.recentQuestionKeys.unshift(answer.question);
  });
  state.stats.recentQuestionKeys = state.stats.recentQuestionKeys.slice(
    0,
    RECENT_QUESTIONS_LIMIT
  );
}

function getDailySummaries(sessions) {
  const byDay = {};
  sessions.forEach((session) => {
    if (!byDay[session.date]) {
      byDay[session.date] = {
        date: session.date,
        rounds: 0,
        correct: 0,
        total: 0,
        sessions: [],
      };
    }
    byDay[session.date].rounds++;
    byDay[session.date].correct += session.correct;
    byDay[session.date].total += session.total;
    byDay[session.date].sessions.push(session);
  });
  return Object.values(byDay).sort((a, b) => b.date.localeCompare(a.date));
}

function getProgressOverview(sessions) {
  const today = localDateString();
  const weekAgo = localDateString(new Date(Date.now() - 6 * 86400000));

  let todayCorrect = 0;
  let todayTotal = 0;
  let todayRounds = 0;
  let weekCorrect = 0;
  let weekTotal = 0;
  let weekRounds = 0;
  let weekDays = new Set();

  sessions.forEach((session) => {
    if (session.date === today) {
      todayRounds++;
      todayCorrect += session.correct;
      todayTotal += session.total;
    }
    if (session.date >= weekAgo) {
      weekRounds++;
      weekCorrect += session.correct;
      weekTotal += session.total;
      weekDays.add(session.date);
    }
  });

  const allCorrect = sessions.reduce((sum, s) => sum + s.correct, 0);
  const allTotal = sessions.reduce((sum, s) => sum + s.total, 0);

  return {
    todayRounds,
    todayCorrect,
    todayTotal,
    todayAccuracy: todayTotal ? Math.round((todayCorrect / todayTotal) * 100) : null,
    weekRounds,
    weekCorrect,
    weekTotal,
    weekDays: weekDays.size,
    weekAccuracy: weekTotal ? Math.round((weekCorrect / weekTotal) * 100) : null,
    allCorrect,
    allTotal,
    allAccuracy: allTotal ? Math.round((allCorrect / allTotal) * 100) : null,
    totalRounds: sessions.length,
  };
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.stats));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function simplifyFraction(num, den) {
  const g = gcd(Math.abs(num), Math.abs(den));
  return { num: num / g, den: den / g };
}

function fractionToString(num, den) {
  if (den === 1) return String(num);
  return `${num}/${den}`;
}

function generateMultiplication() {
  const multiDigit = Math.random() < 0.35;
  if (multiDigit) {
    const a = randInt(12, 99);
    const b = randInt(2, 9);
    return {
      type: 'input',
      text: `${a} × ${b} = ?`,
      answer: a * b,
      hint: 'Multiply step by step',
    };
  }
  const a = randInt(2, 12);
  const b = randInt(2, 12);
  return {
    type: 'input',
    text: `${a} × ${b} = ?`,
    answer: a * b,
  };
}

function generateDivision() {
  const b = randInt(2, 12);
  const quotient = randInt(2, 12);
  const a = b * quotient;
  return {
    type: 'input',
    text: `${a} ÷ ${b} = ?`,
    answer: quotient,
    hint: 'Think: what times the divisor equals the dividend?',
  };
}

function generateAddition() {
  const multiDigit = Math.random() < 0.5;
  if (multiDigit) {
    const a = randInt(100, 9999);
    const b = randInt(100, 9999);
    return {
      type: 'input',
      text: `${a.toLocaleString()} + ${b.toLocaleString()} = ?`,
      answer: a + b,
      hint: 'Line up the place values',
    };
  }
  const a = randInt(10, 99);
  const b = randInt(10, 99);
  return {
    type: 'input',
    text: `${a} + ${b} = ?`,
    answer: a + b,
  };
}

function generateSubtraction() {
  const multiDigit = Math.random() < 0.5;
  if (multiDigit) {
    const b = randInt(100, 4999);
    const a = b + randInt(100, 4999);
    return {
      type: 'input',
      text: `${a.toLocaleString()} − ${b.toLocaleString()} = ?`,
      answer: a - b,
      hint: 'You may need to regroup',
    };
  }
  const b = randInt(10, 89);
  const a = b + randInt(10, 99);
  return {
    type: 'input',
    text: `${a} − ${b} = ?`,
    answer: a - b,
  };
}

function generateFractionQuestion() {
  const kind = pick(['compare', 'add', 'equivalent']);

  if (kind === 'compare') {
    const den = pick([2, 3, 4, 5, 6, 8, 10, 12]);
    let n1 = randInt(1, den - 1);
    let n2 = randInt(1, den - 1);
    while (n1 === n2) n2 = randInt(1, den - 1);
    const larger = n1 > n2 ? fractionToString(n1, den) : fractionToString(n2, den);
    const choices = shuffle([
      fractionToString(n1, den),
      fractionToString(n2, den),
      'They are equal',
    ]);
    return {
      type: 'choice',
      text: `Which is larger?\n${fractionToString(n1, den)}  or  ${fractionToString(n2, den)}`,
      answer: larger,
      choices,
    };
  }

  if (kind === 'add') {
    const den = pick([2, 3, 4, 5, 6, 8, 10]);
    const n1 = randInt(1, den - 1);
    const n2 = randInt(1, den - 1);
    const sum = simplifyFraction(n1 + n2, den);
    const wrong1 = simplifyFraction(n1 + n2, den * 2);
    const wrong2 = simplifyFraction(n1 + n2 + 1, den);
    const answerStr = fractionToString(sum.num, sum.den);
    const choices = shuffle([
      answerStr,
      fractionToString(wrong1.num, wrong1.den),
      fractionToString(wrong2.num, wrong2.den),
      fractionToString(n1 + n2, den + den),
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4));
    while (choices.length < 4) {
      const extra = fractionToString(randInt(1, 5), den);
      if (!choices.includes(extra)) choices.push(extra);
    }
    return {
      type: 'choice',
      text: `${fractionToString(n1, den)} + ${fractionToString(n2, den)} = ?`,
      answer: answerStr,
      choices: shuffle(choices),
      hint: 'Add the numerators; keep the same denominator',
    };
  }

  const den = pick([2, 3, 4, 5, 6, 8]);
  const num = randInt(1, den - 1);
  const mult = randInt(2, 3);
  const eq = simplifyFraction(num * mult, den * mult);
  const answerStr = fractionToString(eq.num, eq.den);
  const choices = shuffle([
    answerStr,
    fractionToString(num + 1, den),
    fractionToString(num, den + 1),
    fractionToString(num * mult, den),
  ].filter((v, i, a) => a.indexOf(v) === i));
  return {
    type: 'choice',
    text: `${fractionToString(num, den)} = ?`,
    answer: answerStr,
    choices,
    hint: 'Find an equivalent fraction',
  };
}

const GENERATORS = {
  multiplication: generateMultiplication,
  division: generateDivision,
  addition: generateAddition,
  subtraction: generateSubtraction,
  fractions: generateFractionQuestion,
};

function generateQuestions(topic) {
  const questions = [];
  const usedThisRound = new Set();
  const recent = new Set(state.stats.recentQuestionKeys || []);
  const generators =
    topic === 'mixed'
      ? Object.values(GENERATORS)
      : [GENERATORS[topic]];

  for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
    let question;
    let attempts = 0;
    do {
      question = pick(generators)();
      attempts++;
    } while (
      attempts < 50 &&
      (usedThisRound.has(questionKey(question)) || recent.has(questionKey(question)))
    );

    usedThisRound.add(questionKey(question));
    questions.push(question);
  }
  return questions;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function updateHomeStats() {
  document.getElementById('total-stars').textContent = state.stats.stars;
  document.getElementById('best-streak').textContent = state.stats.bestStreak;
}

function startQuiz(topic) {
  state.topic = topic;
  state.questions = generateQuestions(topic);
  state.currentIndex = 0;
  state.correctCount = 0;
  state.streak = 0;
  state.answered = false;
  state.sessionAnswers = [];

  document.getElementById('quiz-topic-label').textContent = TOPIC_LABELS[topic];
  showScreen('screen-quiz');
  showQuestion();
}

function showQuestion() {
  const q = state.questions[state.currentIndex];
  state.answered = false;

  document.getElementById('quiz-progress').textContent =
    `${state.currentIndex + 1} / ${QUESTIONS_PER_ROUND}`;
  document.getElementById('streak-badge').textContent = `🔥 ${state.streak}`;
  document.getElementById('question-text').textContent = q.text;
  document.getElementById('question-hint').textContent = q.hint || '';

  const feedback = document.getElementById('feedback');
  feedback.classList.add('hidden');
  feedback.classList.remove('correct', 'wrong');

  const answerArea = document.querySelector('.answer-area');
  const choicesGrid = document.getElementById('choices-grid');
  const input = document.getElementById('answer-input');

  if (q.type === 'choice') {
    answerArea.classList.add('hidden');
    choicesGrid.classList.remove('hidden');
    choicesGrid.innerHTML = '';
    q.choices.forEach((choice) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = choice;
      btn.addEventListener('click', () => checkChoice(choice, btn));
      choicesGrid.appendChild(btn);
    });
  } else {
    answerArea.classList.remove('hidden');
    choicesGrid.classList.add('hidden');
    input.value = '';
    input.disabled = false;
    input.focus();
  }
}

function normalizeAnswer(val) {
  return String(val).trim().replace(/,/g, '');
}

function checkInput() {
  if (state.answered) return;
  const q = state.questions[state.currentIndex];
  const input = document.getElementById('answer-input');
  const userAnswer = normalizeAnswer(input.value);

  if (userAnswer === '') return;

  state.answered = true;
  input.disabled = true;

  const isCorrect = Number(userAnswer) === q.answer;
  recordAnswer(userAnswer, isCorrect, q.answer);
  showFeedback(isCorrect, q.answer);
}

function checkChoice(choice, btn) {
  if (state.answered) return;
  state.answered = true;

  const q = state.questions[state.currentIndex];
  const isCorrect = choice === q.answer;

  document.querySelectorAll('.choice-btn').forEach((b) => {
    b.disabled = true;
    if (b.textContent === q.answer) b.classList.add('correct');
    else if (b === btn) b.classList.add('wrong');
  });

  recordAnswer(choice, isCorrect, q.answer);
  showFeedback(isCorrect, q.answer);
}

function showFeedback(isCorrect, correctAnswer) {
  const feedback = document.getElementById('feedback');
  const feedbackText = document.getElementById('feedback-text');

  feedback.classList.remove('hidden');
  feedback.classList.add(isCorrect ? 'correct' : 'wrong');

  if (isCorrect) {
    state.correctCount++;
    state.streak++;
    if (state.streak > state.stats.bestStreak) {
      state.stats.bestStreak = state.streak;
    }
    feedbackText.textContent = pick([
      'Correct! 🎉',
      'Nice work! ⭐',
      'You got it! 💪',
      'Awesome! 🌟',
    ]);
  } else {
    state.streak = 0;
    const q = state.questions[state.currentIndex];
    const displayAnswer =
      q.type === 'choice' ? correctAnswer : String(correctAnswer);
    feedbackText.textContent = `Not quite. The answer is ${displayAnswer}.`;
  }

  document.getElementById('streak-badge').textContent = `🔥 ${state.streak}`;
}

function nextQuestion() {
  state.currentIndex++;
  if (state.currentIndex >= QUESTIONS_PER_ROUND) {
    finishQuiz();
  } else {
    showQuestion();
  }
}

function finishQuiz() {
  const score = state.correctCount;
  const starsEarned = Math.max(1, Math.floor(score / 2));
  state.stats.stars += starsEarned;
  saveSession();
  saveStats();
  updateHomeStats();

  const pct = score / QUESTIONS_PER_ROUND;
  let emoji = '🎉';
  let title = 'Great job!';
  if (pct === 1) {
    emoji = '🏆';
    title = 'Perfect score!';
  } else if (pct >= 0.8) {
    emoji = '🌟';
    title = 'Excellent!';
  } else if (pct >= 0.6) {
    emoji = '👍';
    title = 'Good effort!';
  } else {
    emoji = '💪';
    title = 'Keep practicing!';
  }

  document.getElementById('results-emoji').textContent = emoji;
  document.getElementById('results-title').textContent = title;
  document.getElementById('results-score').textContent =
    `${score} / ${QUESTIONS_PER_ROUND} correct`;
  document.getElementById('results-stars').textContent =
    `+${starsEarned} star${starsEarned === 1 ? '' : 's'} earned!`;

  showScreen('screen-results');
}

function renderProgress() {
  const sessions = state.stats.sessions;
  const overview = getProgressOverview(sessions);
  const days = getDailySummaries(sessions);

  const summaryEl = document.getElementById('progress-summary');
  const daysEl = document.getElementById('progress-days');
  const emptyEl = document.getElementById('progress-empty');

  if (sessions.length === 0) {
    summaryEl.innerHTML = '';
    daysEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');

  summaryEl.innerHTML = `
    <div class="summary-card highlight">
      <span class="summary-label">Today</span>
      <span class="summary-value">${overview.todayRounds} round${overview.todayRounds === 1 ? '' : 's'}</span>
      <span class="summary-detail">${overview.todayTotal} problems · ${overview.todayAccuracy ?? '—'}% correct</span>
    </div>
    <div class="summary-card">
      <span class="summary-label">Last 7 days</span>
      <span class="summary-value">${overview.weekDays} day${overview.weekDays === 1 ? '' : 's'} active</span>
      <span class="summary-detail">${overview.weekTotal} problems · ${overview.weekAccuracy ?? '—'}% correct</span>
    </div>
    <div class="summary-card">
      <span class="summary-label">All time</span>
      <span class="summary-value">${overview.totalRounds} round${overview.totalRounds === 1 ? '' : 's'}</span>
      <span class="summary-detail">${overview.allTotal} problems · ${overview.allAccuracy ?? '—'}% correct</span>
    </div>
  `;

  daysEl.innerHTML = days.map((day) => {
    const accuracy = Math.round((day.correct / day.total) * 100);
    const sessionsHtml = day.sessions.map((session) => {
      const sessionAccuracy = Math.round((session.correct / session.total) * 100);
      const answersHtml = session.answers.map((a) => `
        <li class="answer-row ${a.correct ? 'correct' : 'wrong'}">
          <span class="answer-question">${a.question}</span>
          <span class="answer-detail">
            His answer: <strong>${a.userAnswer}</strong>
            ${a.correct ? '✓' : `· Correct: <strong>${a.correctAnswer}</strong>`}
          </span>
        </li>
      `).join('');

      return `
        <details class="session-details">
          <summary>
            <span class="session-time">${formatTime(session.timestamp)}</span>
            <span class="session-topic">${TOPIC_LABELS[session.topic]}</span>
            <span class="session-score">${session.correct}/${session.total} (${sessionAccuracy}%)</span>
          </summary>
          <ul class="answer-list">${answersHtml}</ul>
        </details>
      `;
    }).join('');

    return `
      <details class="day-card" ${day.date === localDateString() ? 'open' : ''}>
        <summary>
          <span class="day-date">${formatDisplayDate(day.date)}</span>
          <span class="day-stats">${day.rounds} round${day.rounds === 1 ? '' : 's'} · ${day.total} problems · ${accuracy}%</span>
        </summary>
        <div class="day-sessions">${sessionsHtml}</div>
      </details>
    `;
  }).join('');
}

function exportReport() {
  const sessions = state.stats.sessions;
  if (sessions.length === 0) return;

  const days = getDailySummaries(sessions);
  const overview = getProgressOverview(sessions);
  const lines = [
    'Math Practice — Progress Report',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    'SUMMARY',
    `Today: ${overview.todayRounds} rounds, ${overview.todayTotal} problems, ${overview.todayAccuracy ?? 0}% correct`,
    `Last 7 days: ${overview.weekDays} active days, ${overview.weekTotal} problems, ${overview.weekAccuracy ?? 0}% correct`,
    `All time: ${overview.totalRounds} rounds, ${overview.allTotal} problems, ${overview.allAccuracy ?? 0}% correct`,
    '',
    'DAILY DETAIL',
  ];

  days.forEach((day) => {
    const accuracy = Math.round((day.correct / day.total) * 100);
    lines.push('');
    lines.push(`${formatDisplayDate(day.date)} (${day.date}) — ${day.rounds} rounds, ${day.total} problems, ${accuracy}% correct`);
    day.sessions.forEach((session) => {
      const sessionAccuracy = Math.round((session.correct / session.total) * 100);
      lines.push(`  ${formatTime(session.timestamp)} | ${TOPIC_LABELS[session.topic]} | ${session.correct}/${session.total} (${sessionAccuracy}%)`);
      session.answers.forEach((a, i) => {
        const mark = a.correct ? 'OK' : 'MISS';
        lines.push(`    ${i + 1}. [${mark}] ${a.question}`);
        lines.push(`       Answer: ${a.userAnswer}${a.correct ? '' : ` (correct: ${a.correctAnswer})`}`);
      });
    });
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `math-progress-${localDateString()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function init() {
  updateHomeStats();

  document.querySelectorAll('.topic-btn').forEach((btn) => {
    btn.addEventListener('click', () => startQuiz(btn.dataset.topic));
  });

  document.getElementById('btn-back').addEventListener('click', () => {
    showScreen('screen-home');
  });

  document.getElementById('btn-submit').addEventListener('click', checkInput);

  document.getElementById('answer-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkInput();
  });

  document.getElementById('btn-next').addEventListener('click', nextQuestion);

  document.getElementById('btn-play-again').addEventListener('click', () => {
    startQuiz(state.topic);
  });

  document.getElementById('btn-home').addEventListener('click', () => {
    showScreen('screen-home');
  });

  document.getElementById('btn-progress').addEventListener('click', () => {
    renderProgress();
    showScreen('screen-progress');
  });

  document.getElementById('btn-progress-back').addEventListener('click', () => {
    showScreen('screen-home');
  });

  document.getElementById('btn-export').addEventListener('click', exportReport);
}

init();
