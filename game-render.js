function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground();
  drawItems();
  drawPlayerShots();
  drawEnemyShots();
  drawBeams();
  drawBoss();
  drawEnemies();
  drawPlayer();
  drawBursts();
  drawStatus();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#03080e");
  gradient.addColorStop(0.55, "#06121b");
  gradient.addColorStop(1, "#0b1111");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#d7ffff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(87, 217, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let y = 40; y < HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
}

function drawStatus() {
  const parts = [];

  if (boss) {
    parts.push(`Boss ${Math.ceil((boss.hp / boss.maxHp) * 100)}%`);
  }

  if (shieldCharges > 0) {
    parts.push(`Shield ${shieldCharges}`);
  }
  if (weaponTimer > 0) {
    parts.push(`Weapon ${weaponCatalog[currentWeapon].label}`);
  }
  if (rapidFireTimer > 0) {
    parts.push(`Rapid ${Math.ceil(rapidFireTimer / 1000)}s`);
  }
  if (scoreBoostTimer > 0) {
    parts.push("Score x2");
  }
  if (comboTimer > 0 && comboStreak > 1) {
    parts.push(`Combo x${getComboMultiplier()}`);
  }

  if (parts.length === 0) {
    return;
  }

  const paddingX = 12;
  const text = parts.join("  ");
  ctx.save();
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  const width = Math.min(WIDTH - 24, ctx.measureText(text).width + paddingX * 2);
  const x = 12;
  const y = 12;
  ctx.fillStyle = "rgba(4, 9, 13, 0.72)";
  roundedRect(x, y, width, 28, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(87, 217, 255, 0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#eaf7f5";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + paddingX, y + 14);
  ctx.restore();
}

function drawBoss() {
  if (!boss) {
    return;
  }

  ctx.save();
  ctx.translate(boss.x, boss.y);

  ctx.fillStyle = "#d77bff";
  roundedRect(-boss.width / 2, -boss.height / 2, boss.width, boss.height, 18);
  ctx.fill();

  ctx.fillStyle = "#041018";
  roundedRect(-56, -10, 28, 16, 6);
  ctx.fill();
  roundedRect(28, -10, 28, 16, 6);
  ctx.fill();

  ctx.strokeStyle = "#ffcc4d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const barX = 52;
  const barY = 50;
  const barWidth = WIDTH - 104;
  const fill = clamp(boss.hp / boss.maxHp, 0, 1);

  ctx.save();
  ctx.fillStyle = "rgba(4, 9, 13, 0.78)";
  roundedRect(barX, barY, barWidth, 14, 7);
  ctx.fill();
  ctx.fillStyle = "#d77bff";
  roundedRect(barX + 2, barY + 2, (barWidth - 4) * fill, 10, 5);
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  const blinking = playerInvincible > 0 && Math.floor(playerInvincible / 120) % 2 === 0;
  if (blinking) {
    return;
  }

  ctx.save();
  ctx.translate(player.x, player.y);

  if (shieldCharges > 0) {
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = "#57d9ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "#57d9ff";
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(20, 18);
  ctx.lineTo(6, 12);
  ctx.lineTo(0, 22);
  ctx.lineTo(-6, 12);
  ctx.lineTo(-20, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#eaf7f5";
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(7, 5);
  ctx.lineTo(-7, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffcc4d";
  ctx.fillRect(-4, 18, 8, 8);
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of enemies) {
    const spec = enemyCatalog[enemy.type];
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.fillStyle = spec.color;
    ctx.beginPath();
    if (enemy.type === "brute") {
      roundedRect(-17, -12, 34, 24, 6);
      ctx.fill();
    } else if (enemy.type === "splitter") {
      ctx.moveTo(0, -14);
      ctx.lineTo(16, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-16, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.moveTo(-15, 4);
      ctx.lineTo(-8, -12);
      ctx.lineTo(0, -6);
      ctx.lineTo(8, -12);
      ctx.lineTo(15, 4);
      ctx.lineTo(7, 12);
      ctx.lineTo(-7, 12);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#071014";
    ctx.fillRect(-8, 1, 5, 4);
    ctx.fillRect(3, 1, 5, 4);
    ctx.restore();
  }
}

function drawPlayerShots() {
  for (const shot of playerShots) {
    if (shot.kind === "homing") {
      drawHomingShot(shot);
      continue;
    }
    ctx.save();
    ctx.translate(shot.x, shot.y);
    ctx.rotate(Math.atan2(-shot.vx, -shot.vy));
    ctx.fillStyle = "#eaf7f5";
    roundedRect(-shot.width / 2, -shot.height / 2, shot.width, shot.height, 3);
    ctx.fill();
    ctx.restore();
  }
}

function drawHomingShot(shot) {
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.fillStyle = "#ffcc4d";
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemyShots() {
  ctx.fillStyle = "#ff5a68";
  for (const shot of enemyShots) {
    ctx.save();
    ctx.translate(shot.x, shot.y);
    ctx.rotate(Math.atan2(shot.vx, shot.vy));
    roundedRect(-shot.width / 2, -shot.height / 2, shot.width, shot.height, 3);
    ctx.fill();
    ctx.restore();
  }
}

function drawBeams() {
  for (const beam of beams) {
    const alpha = Math.max(0, beam.life / 0.14);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ffcc4d";
    ctx.lineWidth = beam.width;
    ctx.beginPath();
    ctx.moveTo(beam.x, beam.y);
    ctx.lineTo(beam.x, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function drawItems() {
  for (const item of items) {
    const meta = itemCatalog[item.type];
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.fillStyle = meta.color;
    ctx.strokeStyle = "#041018";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#041018";
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(meta.label, 0, 1);
    ctx.restore();
  }
}

function drawBursts() {
  for (const burst of bursts) {
    ctx.globalAlpha = Math.max(0, burst.life * 2);
    ctx.strokeStyle = burst.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, burst.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
