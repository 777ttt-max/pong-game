const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const playerScoreEl = document.getElementById('playerScore');
const opponentScoreEl = document.getElementById('opponentScore');
const opponentLabelEl = document.getElementById('opponentLabel');
const playerStatsEl = document.getElementById('playerStats');
const aiStatsEl = document.getElementById('aiStats');
const modeDisplayEl = document.getElementById('modeDisplay');
const difficultyDisplayEl = document.getElementById('difficultyDisplay');
const statusTextEl = document.getElementById('gameStatusText');
const statusActionEl = document.getElementById('gameStatusAction');
const statsRoundsEl = document.getElementById('statsRounds');
const statsHitsEl = document.getElementById('statsHits');
const statsWinRateEl = document.getElementById('statsWinRate');
const statsHighScoreEl = document.getElementById('statsHighScore');

const leftPaddle = {
  x: 36,
  y: canvas.height / 2 - 80,
  width: 22,
  height: 160,
  speed: 8,
};

const rightPaddle = {
  x: canvas.width - 58,
  y: canvas.height / 2 - 80,
  width: 22,
  height: 160,
  speed: 6,
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 12,
  vx: 0,
  vy: 0,
  trail: [],
};

const keyboard = {
  ArrowUp: false,
  ArrowDown: false,
  KeyW: false,
  KeyS: false,
};

const difficulties = {
  easy: { label: '简单', ai: 5.3, ball: 6.5, angle: 0.7, target: 5 },
  medium: { label: '中等', ai: 6.8, ball: 7.4, angle: 0.9, target: 6 },
  hard: { label: '困难', ai: 8.1, ball: 8.6, angle: 1.1, target: 7 },
  impossible: { label: '地狱', ai: 10.2, ball: 10.1, angle: 1.35, target: 8 },
};

const modes = {
  'vs-ai': { label: 'VS AI', opponent: 'AI', target: 7 },
  'vs-player': { label: 'VS 玩家', opponent: '玩家2', target: 7 },
  survival: { label: '生存模式', opponent: '机器', target: 5 },
  'time-attack': { label: '限时模式', opponent: 'AI', target: 0 },
};

let currentDifficulty = 'easy';
let currentMode = 'vs-ai';
let playerScore = 0;
let opponentScore = 0;
let rounds = 0;
let totalHits = 0;
let winCount = 0;
let highScore = 0;
let isPlaying = false;
let isPaused = false;
let isGameOver = false;
let timeLeft = 60;
let lastTimestamp = 0;
let lastServeDirection = 1;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatDifficultyStars(level) {
  const starCount = {
    easy: 1,
    medium: 2,
    hard: 3,
    impossible: 4,
  };

  const stars = Array.from({ length: 4 }, (_, index) => {
    return index < starCount[level] ? '★' : '☆';
  }).join('');

  return stars;
}

function getDifficultyConfig() {
  return difficulties[currentDifficulty];
}

function getModeConfig() {
  return modes[currentMode];
}

function setStatus(text, action) {
  statusTextEl.textContent = text;
  statusActionEl.textContent = action;
}

function updateDifficultyUI() {
  document.querySelectorAll('.difficulty-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.difficulty === currentDifficulty);
  });

  difficultyDisplayEl.innerHTML = formatDifficultyStars(currentDifficulty);
  const cfg = getDifficultyConfig();
  aiStatsEl.textContent = `难度: ${cfg.label}`;
}

function updateModeUI() {
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === currentMode);
  });

  const modeCfg = getModeConfig();
  modeDisplayEl.textContent = modeCfg.label;
  opponentLabelEl.textContent = modeCfg.opponent;

  if (currentMode === 'time-attack') {
    setStatus('倒计时模式', '按 SPACE 开始');
  } else if (!isPlaying && !isGameOver) {
    setStatus('准备就绪', '按 SPACE 开始游戏');
  }
}

function updateStats() {
  playerScoreEl.textContent = playerScore;
  opponentScoreEl.textContent = opponentScore;
  statsRoundsEl.textContent = rounds;
  statsHitsEl.textContent = totalHits;

  const totalGames = Math.max(1, rounds);
  const winRate = ((winCount / totalGames) * 100).toFixed(0);
  statsWinRateEl.textContent = `${winRate}%`;
  statsHighScoreEl.textContent = highScore;

  const speedValue = Math.round(Math.abs(ball.vx) * 10);
  playerStatsEl.textContent = `速度: ${speedValue}`;
}

function resetBall(direction = lastServeDirection) {
  lastServeDirection = direction;
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.radius = 12;
  ball.trail = [];

  const cfg = getDifficultyConfig();
  const speed = cfg.ball + (currentMode === 'survival' ? Math.min(5, rounds * 0.35) : 0);
  const angle = (Math.random() * 1.6 - 0.8) * cfg.angle;

  ball.vx = direction * speed * Math.cos(angle);
  ball.vy = speed * Math.sin(angle);
}

function resetPaddles() {
  leftPaddle.y = canvas.height / 2 - leftPaddle.height / 2;
  rightPaddle.y = canvas.height / 2 - rightPaddle.height / 2;
}

function restartMatch() {
  playerScore = 0;
  opponentScore = 0;
  totalHits = 0;
  rounds = 0;
  timeLeft = 60;
  winCount = 0;
  isPlaying = false;
  isPaused = false;
  isGameOver = false;
  highScore = Math.max(highScore, Math.max(playerScore, opponentScore));
  resetPaddles();
  resetBall(1);
  setStatus('准备就绪', '按 SPACE 开始游戏');
  updateStats();
}

function endRound(winnerText) {
  const modeCfg = getModeConfig();
  const target = modeCfg.target || 7;

  if (currentMode === 'survival' || currentMode === 'vs-ai' || currentMode === 'vs-player') {
    if (playerScore >= target || opponentScore >= target) {
      isPlaying = false;
      isPaused = false;
      isGameOver = true;
      const finalWinner = playerScore > opponentScore ? '玩家胜' : '对手胜';
      winCount += playerScore > opponentScore ? 1 : 0;
      highScore = Math.max(highScore, Math.max(playerScore, opponentScore));
      setStatus(`${winnerText || finalWinner}，比赛结束`, '按 R 重新开始');
      updateStats();
      return true;
    }
  }

  if (currentMode === 'time-attack') {
    if (timeLeft <= 0) {
      isPlaying = false;
      isPaused = false;
      isGameOver = true;
      const finalWinner = playerScore > opponentScore ? '玩家胜' : opponentScore > playerScore ? 'AI 胜' : '平局';
      winCount += playerScore > opponentScore ? 1 : 0;
      highScore = Math.max(highScore, Math.max(playerScore, opponentScore));
      setStatus(`${finalWinner}，时间到`, '按 R 重新开始');
      updateStats();
      return true;
    }
  }

  return false;
}

function moveLeftPaddle(dt) {
  const moveDir = (keyboard.ArrowDown ? 1 : 0) - (keyboard.ArrowUp ? 1 : 0);

  if (moveDir !== 0) {
    leftPaddle.y += moveDir * leftPaddle.speed * dt * 60;
  }

  leftPaddle.y = clamp(leftPaddle.y, 0, canvas.height - leftPaddle.height);
}

function moveRightPaddle(dt) {
  if (currentMode === 'vs-player') {
    const moveDir = (keyboard.KeyS ? 1 : 0) - (keyboard.KeyW ? 1 : 0);
    if (moveDir !== 0) {
      rightPaddle.y += moveDir * rightPaddle.speed * dt * 60;
    }
    rightPaddle.y = clamp(rightPaddle.y, 0, canvas.height - rightPaddle.height);
    return;
  }

  const cfg = getDifficultyConfig();
  const targetY = ball.y - rightPaddle.height / 2;
  const delta = targetY - rightPaddle.y;
  const step = Math.abs(delta) < 0.5 ? 0 : (delta > 0 ? cfg.ai : -cfg.ai);
  rightPaddle.y += step * dt * 60;
  rightPaddle.y = clamp(rightPaddle.y, 0, canvas.height - rightPaddle.height);
}

function applyPaddleBounce(paddle, isLeft) {
  const relativeImpact = (ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
  const boost = currentMode === 'survival' ? 1.15 : 1;
  const cfg = getDifficultyConfig();

  ball.x = isLeft
    ? paddle.x + paddle.width + ball.radius
    : paddle.x - ball.radius;

  ball.vx = isLeft
    ? Math.abs(ball.vx) * boost + 0.3
    : -Math.abs(ball.vx) * boost - 0.3;

  ball.vy = relativeImpact * (7.5 + cfg.ball * 0.3);
  totalHits += 1;
  updateStats();
}

function moveBall(dt) {
  ball.x += ball.vx * dt * 60;
  ball.y += ball.vy * dt * 60;

  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 18) {
    ball.trail.shift();
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy *= -1;
  }

  if (ball.y + ball.radius >= canvas.height) {
    ball.y = canvas.height - ball.radius;
    ball.vy *= -1;
  }

  const leftHit =
    ball.x - ball.radius <= leftPaddle.x + leftPaddle.width &&
    ball.x + ball.radius >= leftPaddle.x &&
    ball.y >= leftPaddle.y &&
    ball.y <= leftPaddle.y + leftPaddle.height &&
    ball.vx < 0;

  const rightHit =
    ball.x + ball.radius >= rightPaddle.x &&
    ball.x - ball.radius <= rightPaddle.x + rightPaddle.width &&
    ball.y >= rightPaddle.y &&
    ball.y <= rightPaddle.y + rightPaddle.height &&
    ball.vx > 0;

  if (leftHit) {
    applyPaddleBounce(leftPaddle, true);
  }

  if (rightHit) {
    applyPaddleBounce(rightPaddle, false);
  }

  if (ball.x < -ball.radius) {
    opponentScore += 1;
    updateStats();
    if (endRound()) return;
    resetBall(1);
  }

  if (ball.x > canvas.width + ball.radius) {
    playerScore += 1;
    updateStats();
    if (endRound()) return;
    resetBall(-1);
  }
}

function drawBackground() {
  ctx.fillStyle = '#09152d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    20,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.7
  );
  gradient.addColorStop(0, '#122043');
  gradient.addColorStop(1, '#070d1d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 18]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < canvas.height; i += 40) {
    ctx.fillRect(0, i, canvas.width, 1);
  }
}

function drawPaddle(paddle, color) {
  const glow = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y + paddle.height);
  glow.addColorStop(0, color);
  glow.addColorStop(1, '#dff2ff');

  ctx.fillStyle = glow;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.shadowBlur = 0;
}

function drawBall() {
  for (let i = 0; i < ball.trail.length; i++) {
    const p = ball.trail[i];
    ctx.fillStyle = `rgba(255,255,255,${i / ball.trail.length * 0.4})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ball.radius * (0.3 + i / ball.trail.length), 0, Math.PI * 2);
    ctx.fill();
  }

  const gradient = ctx.createRadialGradient(
    ball.x - 4,
    ball.y - 5,
    2,
    ball.x,
    ball.y,
    ball.radius + 10
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(1, '#7ae7ff');

  ctx.fillStyle = gradient;
  ctx.shadowBlur = 25;
  ctx.shadowColor = '#7ae7ff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawTimer() {
  if (currentMode !== 'time-attack') return;

  const x = canvas.width / 2;
  const y = 34;

  ctx.fillStyle = 'rgba(17, 24, 39, 0.8)';
  ctx.fillRect(x - 90, y - 18, 180, 36);
  ctx.strokeStyle = '#00d9ff';
  ctx.strokeRect(x - 90, y - 18, 180, 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`TIME ${Math.max(0, Math.ceil(timeLeft))}s`, x, y + 7);
}

function draw() {
  drawBackground();
  drawPaddle(leftPaddle, '#00d9ff');
  drawPaddle(rightPaddle, '#ff5d8f');
  drawBall();
  drawTimer();
}

function update(dt) {
  if (!isPlaying || isPaused || isGameOver) return;

  if (currentMode === 'time-attack') {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endRound();
      return;
    }
  }

  moveLeftPaddle(dt);
  moveRightPaddle(dt);
  moveBall(dt);
}

function animate(ts) {
  const dt = (ts - lastTimestamp) / 1000 || 0.016;
  lastTimestamp = ts;

  update(dt);
  draw();
  requestAnimationFrame(animate);
}

function togglePause() {
  if (isGameOver) {
    return;
  }

  if (!isPlaying) {
    isPlaying = true;
    isPaused = false;
    setStatus('游戏进行中', '按 SPACE 暂停');
    if (ball.vx === 0 && ball.vy === 0) {
      resetBall(Math.random() < 0.5 ? -1 : 1);
    }
    return;
  }

  isPaused = !isPaused;
  setStatus(isPaused ? '已暂停' : '游戏进行中', isPaused ? '按 SPACE 继续' : '按 SPACE 暂停');
}

function handleKeyDown(event) {
  if (event.code === 'Space') {
    event.preventDefault();
    togglePause();
    return;
  }

  if (event.key === 'r' || event.key === 'R') {
    restartMatch();
    return;
  }

  if (keyboard.hasOwnProperty(event.code)) {
    keyboard[event.code] = true;
  }
}

function handleKeyUp(event) {
  if (keyboard.hasOwnProperty(event.code)) {
    keyboard[event.code] = false;
  }
}

function attachMouseControl() {
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    leftPaddle.y = mouseY - leftPaddle.height / 2;
    leftPaddle.y = clamp(leftPaddle.y, 0, canvas.height - leftPaddle.height);
  });
}

function attachModeButtons() {
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentMode = btn.dataset.mode;
      updateModeUI();
      restartMatch();
      if (currentMode === 'time-attack') {
        timeLeft = 60;
      }
    });
  });

  document.querySelectorAll('.difficulty-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentDifficulty = btn.dataset.difficulty;
      updateDifficultyUI();
      if (isPlaying || isPaused || isGameOver) {
        resetBall(Math.random() < 0.5 ? -1 : 1);
      }
    });
  });
}

document.getElementById('resetBtn').addEventListener('click', () => {
  restartMatch();
});

document.getElementById('pauseBtn').addEventListener('click', () => {
  togglePause();
});

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
attachMouseControl();
attachModeButtons();
updateDifficultyUI();
updateModeUI();
updateStats();
resetBall(1);
requestAnimationFrame(animate);
