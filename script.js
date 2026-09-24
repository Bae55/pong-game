const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const playerScoreElement = document.getElementById('playerScore');
const computerScoreElement = document.getElementById('computerScore');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');

const paddle = { width: 14, height: 96, inset: 24, speed: 7 };
const ball = { radius: 9, speed: 5.5, maxSpeed: 12 };
const player = { x: paddle.inset, y: canvas.height / 2 - paddle.height / 2, score: 0 };
const computer = { x: canvas.width - paddle.inset - paddle.width, y: player.y, score: 0 };

let animationId;
let lastTime = 0;
let running = false;
let paused = false;
let upPressed = false;
let downPressed = false;
let ballState;

function resetBall(direction = Math.random() < 0.5 ? -1 : 1) {
  const angle = (Math.random() * 0.8 - 0.4);
  ballState = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    velocityX: direction * ball.speed * Math.cos(angle),
    velocityY: ball.speed * Math.sin(angle)
  };
}

function resetGame() {
  player.score = 0;
  computer.score = 0;
  playerScoreElement.textContent = '0';
  computerScoreElement.textContent = '0';
  player.y = computer.y = canvas.height / 2 - paddle.height / 2;
  resetBall();
}

function clampPaddle(paddleObject) {
  paddleObject.y = Math.max(0, Math.min(canvas.height - paddle.height, paddleObject.y));
}

function movePlayer() {
  if (upPressed) player.y -= paddle.speed;
  if (downPressed) player.y += paddle.speed;
  clampPaddle(player);
}

function moveComputer() {
  // The computer tracks the ball with a small reaction limit so it remains beatable.
  const target = ballState.y - paddle.height / 2;
  const difference = target - computer.y;
  computer.y += Math.max(-4.4, Math.min(4.4, difference));
  clampPaddle(computer);
}

function intersectsPaddle(paddleObject) {
  return ballState.x - ball.radius < paddleObject.x + paddle.width &&
    ballState.x + ball.radius > paddleObject.x &&
    ballState.y - ball.radius < paddleObject.y + paddle.height &&
    ballState.y + ball.radius > paddleObject.y;
}

function bounceFromPaddle(paddleObject, direction) {
  const relativeHit = (ballState.y - (paddleObject.y + paddle.height / 2)) / (paddle.height / 2);
  const angle = relativeHit * Math.PI / 3;
  const newSpeed = Math.min(ball.maxSpeed, Math.hypot(ballState.velocityX, ballState.velocityY) + 0.25);
  ballState.velocityX = direction * newSpeed * Math.cos(angle);
  ballState.velocityY = newSpeed * Math.sin(angle);
  ballState.x = direction > 0 ? paddleObject.x + paddle.width + ball.radius : paddleObject.x - ball.radius;
}

function update(delta) {
  const timeScale = Math.min(delta / 16.67, 2);
  movePlayer();
  moveComputer();
  ballState.x += ballState.velocityX * timeScale;
  ballState.y += ballState.velocityY * timeScale;

  if (ballState.y - ball.radius <= 0 || ballState.y + ball.radius >= canvas.height) {
    ballState.velocityY *= -1;
    ballState.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ballState.y));
  }

  if (ballState.velocityX < 0 && intersectsPaddle(player)) bounceFromPaddle(player, 1);
  if (ballState.velocityX > 0 && intersectsPaddle(computer)) bounceFromPaddle(computer, -1);

  if (ballState.x < -ball.radius) {
    computer.score++;
    computerScoreElement.textContent = computer.score;
    resetBall(-1);
  } else if (ballState.x > canvas.width + ball.radius) {
    player.score++;
    playerScoreElement.textContent = player.score;
    resetBall(1);
  }
}

function draw() {
  context.fillStyle = '#091827';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.setLineDash([10, 14]);
  context.strokeStyle = '#24445f';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(canvas.width / 2, 0);
  context.lineTo(canvas.width / 2, canvas.height);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = '#6ee7ff';
  context.fillRect(player.x, player.y, paddle.width, paddle.height);
  context.fillStyle = '#ffb86b';
  context.fillRect(computer.x, computer.y, paddle.width, paddle.height);

  context.beginPath();
  context.arc(ballState.x, ballState.y, ball.radius, 0, Math.PI * 2);
  context.fillStyle = '#fff7d6';
  context.shadowColor = '#fff7d6';
  context.shadowBlur = 14;
  context.fill();
  context.shadowBlur = 0;
}

function frame(timestamp) {
  if (!running) return;
  if (!paused) {
    update(timestamp - lastTime);
    draw();
  }
  lastTime = timestamp;
  animationId = requestAnimationFrame(frame);
}

function startGame() {
  if (running) return;
  resetGame();
  running = true;
  paused = false;
  startButton.disabled = true;
  pauseButton.disabled = false;
  pauseButton.textContent = 'Pause';
  lastTime = performance.now();
  animationId = requestAnimationFrame(frame);
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseButton.textContent = paused ? 'Resume' : 'Pause';
}

function setPlayerPosition(event) {
  const bounds = canvas.getBoundingClientRect();
  const scale = canvas.height / bounds.height;
  player.y = (event.clientY - bounds.top) * scale - paddle.height / 2;
  clampPaddle(player);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp') { upPressed = true; event.preventDefault(); }
  if (event.key === 'ArrowDown') { downPressed = true; event.preventDefault(); }
  if (event.key.toLowerCase() === 'p') togglePause();
});
window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowUp') upPressed = false;
  if (event.key === 'ArrowDown') downPressed = false;
});
canvas.addEventListener('mousemove', setPlayerPosition);
canvas.addEventListener('touchmove', (event) => { setPlayerPosition(event.touches[0]); event.preventDefault(); }, { passive: false });
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePause);

resetBall();
draw();
