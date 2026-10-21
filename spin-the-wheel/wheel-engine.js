import { THEME_PRESETS } from "./themes.js";
import { autoContrastColor, clamp, normalizeAngle } from "./utils.js";

const TAU = Math.PI * 2;
const FLASH_MS = 2600;
const FONT_WHEEL = '"Lexend", "Be Vietnam Pro", "Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function easeOutFriction(t) {
  return 1 - Math.pow(1 - t, 3.2);
}

export class WheelEngine {
  constructor({ canvas, container }) {
    this.canvas = canvas;
    this.container = container;
    this.ctx = canvas.getContext("2d");
    this.rotation = 0;
    this.segmentData = [];
    this.activeEntries = [];
    this.theme = null;
    this.settings = null;
    this.spinState = {
      phase: "idle",
      rafId: null,
      targetRotation: 0,
      startRotation: 0,
      startTime: 0,
      durationMs: 1000,
      lastTickSegment: -1
    };
    this.winnerFlash = { id: null, until: 0 };
    this.flashRafId = null;
    this.lastVelocity = 0;
    this.imageCache = new Map();
    this.idle = {
      enabled: true,
      rafId: null,
      lastFrameTime: 0
    };
    this.idlePausedByResult = false;

    this.handleResize = this.resize.bind(this);
    window.addEventListener("resize", this.handleResize);
    // Layout changes (stage mode, panels, fonts) resize the canvas without a window resize.
    this.resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(this.handleResize) : null;
    this.resizeObserver?.observe(this.canvas);
    this.resize();
  }

  destroy() {
    window.removeEventListener("resize", this.handleResize);
    this.resizeObserver?.disconnect();
    this.stopAnimation();
    this.stopIdleLoop();
    cancelAnimationFrame(this.flashRafId);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  setWheelState({ entries, settings, theme }) {
    this.settings = settings;
    this.theme = theme;
    this.activeEntries = entries.filter((entry) => entry.enabled && !entry.eliminated);
    this.segmentData = buildSegments(this.activeEntries, settings.showWeights, theme.preset);
    this.idle.enabled = settings?.idleAnimationEnabled !== false;
    this.render();
    this.syncIdleLoop();
  }

  getSegments() {
    return this.segmentData;
  }

  getRotation() {
    return this.rotation;
  }

  setRotation(nextRotation) {
    this.rotation = normalizeAngle(nextRotation);
    this.render();
  }

  computeTargetRotationForSegment(segmentIndex) {
    const segment = this.segmentData[segmentIndex];
    if (!segment) return this.rotation;
    const desiredNormalized = normalizeAngle(-segment.center);
    return desiredNormalized;
  }

  isSpinning() {
    return this.spinState.phase !== "idle";
  }

  spinTo({
    absoluteTargetRotation,
    durationMs,
    pauseAtEndMs = 0,
    reducedMotion = false,
    onTick = () => {},
    onResult = () => {}
  }) {
    if (!this.segmentData.length) return;
    this.idlePausedByResult = false;
    this.winnerFlash = { id: null, until: 0 };
    this.stopIdleLoop();
    this.stopAnimation();

    if (reducedMotion) {
      this.rotation = normalizeAngle(absoluteTargetRotation);
      this.render();
      this.flashWinner(this.getCurrentSegment()?.entry.id);
      onResult(this.getCurrentSegment());
      return;
    }

    this.spinState = {
      phase: "spinning",
      rafId: null,
      targetRotation: absoluteTargetRotation,
      startRotation: this.rotation,
      startTime: performance.now(),
      durationMs,
      lastTickSegment: this.getCurrentSegmentIndex()
    };

    this.container.classList.add("is-spinning");
    const travelDuration = Math.max(1, durationMs - pauseAtEndMs);
    const frame = (timestamp) => {
      const elapsed = timestamp - this.spinState.startTime;
      let nextRotation = this.spinState.startRotation;
      if (elapsed < travelDuration) {
        const progress = clamp(elapsed / travelDuration, 0, 1);
        const eased = easeOutFriction(progress);
        nextRotation = this.spinState.startRotation + (absoluteTargetRotation - this.spinState.startRotation) * eased;
      } else if (elapsed < durationMs) {
        // Hold at the true landing angle during cinematic pause to avoid a final snap.
        nextRotation = absoluteTargetRotation;
      } else {
        nextRotation = absoluteTargetRotation;
      }
      this.lastVelocity = nextRotation - this.rotation;
      this.rotation = normalizeAngle(nextRotation);

      const nextSegment = this.getCurrentSegmentIndex();
      if (nextSegment !== this.spinState.lastTickSegment) {
        this.spinState.lastTickSegment = nextSegment;
        onTick(nextSegment, Math.abs(this.lastVelocity));
      }

      this.render();
      if (elapsed < durationMs) {
        this.spinState.rafId = requestAnimationFrame(frame);
      } else {
        this.spinState.phase = "idle";
        this.container.classList.remove("is-spinning");
        const segment = this.getCurrentSegment();
        this.flashWinner(segment?.entry.id || null);
        onResult(segment);
        this.syncIdleLoop();
      }
    };

    this.spinState.rafId = requestAnimationFrame(frame);
  }

  flashWinner(entryId) {
    this.winnerFlash = {
      id: entryId,
      until: performance.now() + FLASH_MS
    };
    cancelAnimationFrame(this.flashRafId);
    const frame = (timestamp) => {
      this.render();
      if (timestamp < this.winnerFlash.until) {
        this.flashRafId = requestAnimationFrame(frame);
      }
    };
    this.flashRafId = requestAnimationFrame(frame);
  }

  stopAnimation() {
    if (this.spinState.rafId) {
      cancelAnimationFrame(this.spinState.rafId);
    }
    this.container.classList.remove("is-spinning");
    this.spinState.phase = "idle";
    this.spinState.rafId = null;
    this.syncIdleLoop();
  }

  startManualSpin({ onTick = () => {} } = {}) {
    if (!this.segmentData.length) return;
    this.idlePausedByResult = false;
    this.winnerFlash = { id: null, until: 0 };
    this.stopIdleLoop();
    this.stopAnimation();
    this.spinState = {
      phase: "manual-loop",
      rafId: null,
      targetRotation: 0,
      startRotation: this.rotation,
      startTime: performance.now(),
      durationMs: 0,
      lastTickSegment: this.getCurrentSegmentIndex(),
      lastFrameTime: performance.now(),
      velocity: 0.36,
      onTick
    };
    this.container.classList.add("is-spinning");

    const frame = (timestamp) => {
      if (this.spinState.phase !== "manual-loop") return;
      const dt = Math.max(8, Math.min(34, timestamp - this.spinState.lastFrameTime));
      this.spinState.lastFrameTime = timestamp;
      const wobble = 0.08 * Math.sin(timestamp / 520);
      const velocity = Math.max(0.28, this.spinState.velocity + wobble * 0.02);
      this.lastVelocity = velocity;
      this.rotation = normalizeAngle(this.rotation + velocity * (dt / 16.6667));

      const nextSegment = this.getCurrentSegmentIndex();
      if (nextSegment !== this.spinState.lastTickSegment) {
        this.spinState.lastTickSegment = nextSegment;
        onTick(nextSegment, Math.abs(this.lastVelocity));
      }

      this.render();
      this.spinState.rafId = requestAnimationFrame(frame);
    };

    this.spinState.rafId = requestAnimationFrame(frame);
  }

  decelerateTo({
    absoluteTargetRotation,
    durationMs,
    pauseAtEndMs = 0,
    reducedMotion = false,
    onTick = () => {},
    onResult = () => {}
  }) {
    if (!this.segmentData.length) return;
    this.idlePausedByResult = false;

    if (reducedMotion) {
      this.rotation = normalizeAngle(absoluteTargetRotation);
      this.render();
      this.flashWinner(this.getCurrentSegment()?.entry.id);
      onResult(this.getCurrentSegment());
      return;
    }

    if (this.spinState.rafId) {
      cancelAnimationFrame(this.spinState.rafId);
      this.spinState.rafId = null;
    }

    this.spinState = {
      phase: "decelerating",
      rafId: null,
      targetRotation: absoluteTargetRotation,
      startRotation: this.rotation,
      startTime: performance.now(),
      durationMs,
      lastTickSegment: this.getCurrentSegmentIndex()
    };

    const travelDuration = Math.max(1, durationMs - pauseAtEndMs);
    const frame = (timestamp) => {
      const elapsed = timestamp - this.spinState.startTime;
      let nextRotation = this.spinState.startRotation;
      if (elapsed < travelDuration) {
        const progress = clamp(elapsed / travelDuration, 0, 1);
        const eased = easeOutFriction(progress);
        nextRotation = this.spinState.startRotation + (absoluteTargetRotation - this.spinState.startRotation) * eased;
      } else if (elapsed < durationMs) {
        // Hold at the true landing angle during cinematic pause to avoid a final snap.
        nextRotation = absoluteTargetRotation;
      } else {
        nextRotation = absoluteTargetRotation;
      }
      this.lastVelocity = nextRotation - this.rotation;
      this.rotation = normalizeAngle(nextRotation);

      const nextSegment = this.getCurrentSegmentIndex();
      if (nextSegment !== this.spinState.lastTickSegment) {
        this.spinState.lastTickSegment = nextSegment;
        onTick(nextSegment, Math.abs(this.lastVelocity));
      }

      this.render();
      if (elapsed < durationMs) {
        this.spinState.rafId = requestAnimationFrame(frame);
      } else {
        this.spinState.phase = "idle";
        this.container.classList.remove("is-spinning");
        const segment = this.getCurrentSegment();
        this.flashWinner(segment?.entry.id || null);
        onResult(segment);
        this.syncIdleLoop();
      }
    };

    this.spinState.rafId = requestAnimationFrame(frame);
  }

  hitTestCenter(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const radius = Math.min(rect.width, rect.height) * 0.11;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const distance = Math.hypot(centerX - x, centerY - y);
    return distance <= radius;
  }

  getCurrentSegmentIndex() {
    if (!this.segmentData.length) return -1;
    const pointerInWheelCoords = normalizeAngle(-this.rotation);
    return this.segmentData.findIndex((segment) => inSegment(pointerInWheelCoords, segment.start, segment.end));
  }

  getCurrentSegment() {
    const index = this.getCurrentSegmentIndex();
    if (index < 0) return null;
    return this.segmentData[index];
  }

  render() {
    const ctx = this.ctx;
    const width = this.canvas.getBoundingClientRect().width;
    const height = this.canvas.getBoundingClientRect().height;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) * 0.495;
    const radius = Math.min(width, height) * 0.435;
    const now = performance.now();

    ctx.clearRect(0, 0, width, height);
    // Hidden canvases (display: none) report a zero size; there is nothing to draw.
    if (width < 2 || height < 2) return;

    if (!this.segmentData.length) {
      drawEmptyState(ctx, centerX, centerY, radius, this.theme);
      drawRim(ctx, centerX, centerY, radius, outerRadius, this.theme, { now, spinning: false, flashStrength: 0 });
      return;
    }

    const performanceMode = Boolean(this.settings?.performanceModeAuto && this.segmentData.length > 500);
    const overviewMode = Boolean(performanceMode && this.settings?.performanceOverview);
    const flashStrength = getWinnerFlashStrength(this.winnerFlash);
    const spotlight = getSpotlightStrength(this.winnerFlash);
    this.segmentData.forEach((segment, index) => {
      const start = segment.start + this.rotation - Math.PI / 2;
      const end = segment.end + this.rotation - Math.PI / 2;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();

      const isWinner = this.winnerFlash.id && this.winnerFlash.id === segment.entry.id;
      if (isWinner && flashStrength > 0) {
        ctx.save();
        ctx.globalAlpha = flashStrength * 0.33;
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();
      }

      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = performanceMode ? 0.6 : 2;
      ctx.stroke();

      if (this.theme?.preset === "colorblind-safe") {
        drawSegmentPattern(ctx, index, start, end, centerX, centerY, radius);
      }

      if (!performanceMode) {
        drawSegmentImage(ctx, this, segment, this.rotation, centerX, centerY, radius);
      }

      if (spotlight > 0 && !isWinner) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, start, end);
        ctx.closePath();
        ctx.globalAlpha = spotlight * 0.5;
        ctx.fillStyle = "#1a0508";
        ctx.fill();
        ctx.restore();
      }
    });

    drawWheelChrome(ctx, centerX, centerY, radius, flashStrength, this.theme, this, { performanceMode, overviewMode });
    drawRim(ctx, centerX, centerY, radius, outerRadius, this.theme, { now, spinning: this.isSpinning(), flashStrength });
    if (!overviewMode) {
      this.segmentData.forEach((segment) => {
        drawSegmentLabel(ctx, segment, this.settings, this.rotation, centerX, centerY, radius, {
          mysteryWheel: this.settings?.mysteryWheel,
          simplified: performanceMode
        });
      });
    } else {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.94)";
      ctx.font = `700 ${Math.max(14, radius * 0.08)}px ${FONT_WHEEL}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${this.segmentData.length} entries`, centerX, centerY + radius * 0.24);
      ctx.restore();
    }
  }

  getImageBySrc(src) {
    if (!src) return null;
    const existing = this.imageCache.get(src);
    if (existing?.status === "loaded") {
      return existing.image;
    }
    if (existing?.status === "loading") {
      return null;
    }

    const image = new Image();
    this.imageCache.set(src, { status: "loading", image: null });
    image.onload = () => {
      this.imageCache.set(src, { status: "loaded", image });
      this.render();
    };
    image.onerror = () => {
      this.imageCache.set(src, { status: "error", image: null });
    };
    image.src = src;
    return null;
  }

  syncIdleLoop() {
    if (this.idlePausedByResult || !this.idle.enabled || this.isSpinning() || !this.segmentData.length) {
      this.stopIdleLoop();
      return;
    }
    this.startIdleLoop();
  }

  holdStillAfterResult() {
    this.idlePausedByResult = true;
    this.stopIdleLoop();
  }

  startIdleLoop() {
    if (this.idle.rafId) return;
    this.idle.lastFrameTime = performance.now();
    const frame = (timestamp) => {
      if (!this.idle.enabled || this.isSpinning() || !this.segmentData.length) {
        this.stopIdleLoop();
        return;
      }
      const dt = Math.max(12, Math.min(34, timestamp - this.idle.lastFrameTime));
      this.idle.lastFrameTime = timestamp;
      this.rotation = normalizeAngle(this.rotation + dt * 0.00012);
      this.render();
      this.idle.rafId = requestAnimationFrame(frame);
    };
    this.idle.rafId = requestAnimationFrame(frame);
  }

  stopIdleLoop() {
    if (!this.idle.rafId) return;
    cancelAnimationFrame(this.idle.rafId);
    this.idle.rafId = null;
  }
}

function drawEmptyState(ctx, centerX, centerY, radius, theme) {
  const colors = getPresetColors(theme?.preset);
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, TAU);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Ghost slices hint at what the wheel will look like once entries are added.
  const ghostCount = 12;
  for (let i = 0; i < ghostCount; i += 1) {
    const start = (i / ghostCount) * TAU - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, start + TAU / ghostCount);
    ctx.closePath();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#7a1f2b";
  ctx.font = `800 ${clamp(radius * 0.085, 13, 26)}px ${FONT_WHEEL}`;
  ctx.fillText("✨ Vòng quay đang trống", centerX, centerY + radius * 0.46);
  ctx.fillStyle = "#9b5560";
  ctx.font = `600 ${clamp(radius * 0.055, 11, 17)}px ${FONT_WHEEL}`;
  ctx.fillText("Thêm mục để bắt đầu quay nhé!", centerX, centerY + radius * 0.6);
  ctx.restore();
}

function getPresetColors(preset) {
  return (THEME_PRESETS[preset] || THEME_PRESETS.tnty).colors;
}

// Glossy bezel with marquee bulbs: chase while spinning, blink together on a win.
function drawRim(ctx, centerX, centerY, radius, outerRadius, theme, { now, spinning, flashStrength }) {
  let rimColor = getPresetColors(theme?.preset)[0];
  if (autoContrastColor(rimColor) !== "#f4f8ff") {
    rimColor = shadeHex(rimColor, -70);
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius, 0, TAU);
  ctx.arc(centerX, centerY, radius, 0, TAU, true);
  const gradient = ctx.createLinearGradient(centerX - outerRadius, centerY - outerRadius, centerX + outerRadius, centerY + outerRadius);
  gradient.addColorStop(0, shadeHex(rimColor, 55));
  gradient.addColorStop(0.5, rimColor);
  gradient.addColorStop(1, shadeHex(rimColor, -45));
  ctx.fillStyle = gradient;
  ctx.fill("evenodd");
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 1, 0, TAU);
  ctx.stroke();

  const rimWidth = outerRadius - radius;
  const ringRadius = radius + rimWidth / 2;
  const bulbRadius = Math.max(1.6, rimWidth * 0.2);
  const count = clamp(Math.round(outerRadius / 22) * 2, 12, 28);
  const step = Math.floor(now / (spinning ? 85 : 700));
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU - Math.PI / 2;
    let lit;
    if (flashStrength > 0) {
      lit = flashStrength > 0.5;
    } else if (spinning) {
      lit = (i + step) % 3 === 0;
    } else {
      lit = (i + step) % 2 === 0;
    }
    ctx.beginPath();
    ctx.arc(centerX + Math.cos(angle) * ringRadius, centerY + Math.sin(angle) * ringRadius, bulbRadius, 0, TAU);
    if (lit) {
      ctx.fillStyle = "#fff6d5";
      ctx.shadowColor = "rgba(255,226,140,0.95)";
      ctx.shadowBlur = bulbRadius * 3.2;
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.shadowBlur = 0;
    }
    ctx.fill();
  }
  ctx.restore();
}

function drawWheelChrome(ctx, centerX, centerY, radius, flashStrength, theme, engine, options = {}) {
  const performanceMode = Boolean(options.performanceMode);
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 5, 0, TAU);
  ctx.strokeStyle = "#f5f9ff22";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();

  const centerRadius = radius * 0.13;
  ctx.beginPath();
  ctx.arc(centerX, centerY, centerRadius, 0, TAU);
  const centerStart = theme?.centerColor || "#ff6b76";
  const centerEnd = theme?.centerColor
    ? shadeHex(theme.centerColor, -26)
    : "#c1121f";
  const centerGradient = ctx.createRadialGradient(centerX - centerRadius * 0.3, centerY - centerRadius * 0.4, centerRadius * 0.2, centerX, centerY, centerRadius);
  centerGradient.addColorStop(0, centerStart);
  centerGradient.addColorStop(1, centerEnd);
  ctx.fillStyle = centerGradient;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (theme?.centerImage) {
    const image = engine.getImageBySrc(theme.centerImage);
    if (image) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerRadius - 2, 0, TAU);
      ctx.clip();
      const drawSize = centerRadius * 2;
      ctx.drawImage(image, centerX - drawSize / 2, centerY - drawSize / 2, drawSize, drawSize);
      ctx.restore();
    }
  }

  if (flashStrength > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, TAU);
    ctx.strokeStyle = `rgba(255,255,255,${0.22 * flashStrength})`;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();
  }

  if (!performanceMode) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, TAU);
    ctx.clip();
    const shadowGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.56, centerX, centerY, radius);
    shadowGradient.addColorStop(0, "rgba(0,0,0,0)");
    shadowGradient.addColorStop(1, "rgba(0,0,0,0.2)");
    ctx.fillStyle = shadowGradient;
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    const gloss = ctx.createRadialGradient(centerX - radius * 0.35, centerY - radius * 0.45, 0, centerX - radius * 0.35, centerY - radius * 0.45, radius * 1.1);
    gloss.addColorStop(0, "rgba(255,255,255,0.22)");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gloss;
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.restore();
  }
}

function drawSegmentLabel(ctx, segment, settings, rotation, centerX, centerY, radius, options = {}) {
  const mysteryWheel = Boolean(options.mysteryWheel);
  const simplified = Boolean(options.simplified);
  if (segment.entry.imageMode === "image-only" && !mysteryWheel && !simplified) {
    return;
  }
  const worldAngle = segment.center + rotation - Math.PI / 2;
  const labelRadius = radius * 0.58;
  const maxLabelWidth = radius * 0.50;

  let label = resolveLabel(segment.entry, mysteryWheel);
  if (simplified && label.length > 12) {
    label = `${label.slice(0, 11)}…`;
  }
  let fontSize = clamp(radius * (simplified ? 0.08 : 0.095), 11, simplified ? 18 : 26);
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(worldAngle);
  ctx.translate(labelRadius, 0);

  ctx.font = `700 ${fontSize}px ${FONT_WHEEL}`;
  while (fontSize > (simplified ? 9 : 10)) {
    if (ctx.measureText(label).width <= maxLabelWidth) break;
    fontSize -= 1;
    ctx.font = `700 ${fontSize}px ${FONT_WHEEL}`;
  }

  let renderLabel = label;
  if (ctx.measureText(renderLabel).width > maxLabelWidth) {
    renderLabel = truncateToFit(ctx, renderLabel, maxLabelWidth);
  }

  const textColor = segment.textColor || "#ffffff";
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (!simplified && autoContrastColor(textColor) === "#0b1224") {
    // Light text on a colored slice: a soft shadow keeps it readable.
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
  }
  ctx.fillText(renderLabel, 0, 0);
  ctx.restore();
}

function drawSegmentPattern(ctx, segmentIndex, start, end, centerX, centerY, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, start, end);
  ctx.closePath();
  ctx.clip();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;

  const pattern = segmentIndex % 4;
  if (pattern === 0) {
    for (let x = centerX - radius; x <= centerX + radius; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, centerY - radius);
      ctx.lineTo(x, centerY + radius);
      ctx.stroke();
    }
  } else if (pattern === 1) {
    for (let y = centerY - radius; y <= centerY + radius; y += 10) {
      ctx.beginPath();
      ctx.moveTo(centerX - radius, y);
      ctx.lineTo(centerX + radius, y);
      ctx.stroke();
    }
  } else if (pattern === 2) {
    for (let offset = -radius; offset <= radius; offset += 12) {
      ctx.beginPath();
      ctx.moveTo(centerX - radius + offset, centerY - radius);
      ctx.lineTo(centerX + offset, centerY + radius);
      ctx.stroke();
    }
  } else {
    for (let offset = -radius; offset <= radius; offset += 12) {
      ctx.beginPath();
      ctx.moveTo(centerX + radius - offset, centerY - radius);
      ctx.lineTo(centerX - offset, centerY + radius);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawSegmentImage(ctx, engine, segment, rotation, centerX, centerY, radius) {
  if (!segment.entry.image || segment.entry.imageMode === "text-only") return;
  const image = engine.getImageBySrc(segment.entry.image);
  if (!image) return;

  const start = segment.start + rotation - Math.PI / 2;
  const end = segment.end + rotation - Math.PI / 2;
  const worldAngle = segment.center + rotation - Math.PI / 2;
  const centerDistance = radius * 0.6;
  const widthByArc = Math.max(28, (segment.end - segment.start) * radius * 0.72);
  const drawSize = clamp(widthByArc, 28, radius * 0.48);
  const x = centerX + Math.cos(worldAngle) * centerDistance;
  const y = centerY + Math.sin(worldAngle) * centerDistance;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, start, end);
  ctx.closePath();
  ctx.clip();
  ctx.globalAlpha = segment.entry.imageMode === "image-text" ? 0.95 : 1;
  ctx.drawImage(image, x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);

  if (segment.entry.imageMode === "image-text") {
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = "#000";
    ctx.fillRect(x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
  }
  ctx.restore();
}

function resolveLabel(entry, mysteryWheel) {
  if (mysteryWheel) return "?";
  return entry.label;
}

function truncateToFit(ctx, label, maxWidth) {
  let next = label;
  while (next.length > 1 && ctx.measureText(`${next}…`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}…`;
}

function inSegment(value, start, end) {
  if (start <= end) {
    return value >= start && value < end;
  }
  return value >= start || value < end;
}

function getWinnerFlashStrength(flash) {
  if (!flash.id) return 0;
  const left = flash.until - performance.now();
  if (left <= 0) return 0;
  const normalized = left / FLASH_MS;
  return Math.sin((1 - normalized) * Math.PI * 6) * 0.5 + 0.5;
}

function getSpotlightStrength(flash) {
  if (!flash.id) return 0;
  const left = flash.until - performance.now();
  if (left <= 0) return 0;
  // Ease in quickly, hold, then fade out over the last 600ms.
  return Math.min(1, (FLASH_MS - left) / 200, left / 600);
}

function shadeHex(hex, amount) {
  const value = (hex || "").replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((c) => `${c}${c}`).join("") : value;
  if (normalized.length !== 6) return hex;
  const channel = (offset) => {
    const raw = Number.parseInt(normalized.slice(offset, offset + 2), 16);
    const next = clamp(raw + amount, 0, 255);
    return Math.round(next).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

export function buildSegments(entries, weighted, themePreset) {
  const presetColors = getPresetColors(themePreset);
  const weights = entries.map((entry) => weighted ? clamp(Number(entry.weight) || 1, 0.1, 100) : 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursor = 0;
  const segments = [];
  entries.forEach((entry, index) => {
    const ratio = weights[index] / totalWeight;
    const span = ratio * TAU;
    const start = cursor;
    const end = cursor + span;
    cursor = end;
    let color = entry.sliceColor || presetColors[index % presetColors.length];
    // When the palette wraps, the last slice can land next to an identical first slice.
    if (!entry.sliceColor && index > 0 && index === entries.length - 1 && color === segments[0].color) {
      color = presetColors.find((c) => c !== segments[0].color && c !== segments[index - 1].color) || color;
    }
    const textColor = entry.textColor || autoContrastColor(color);
    segments.push({
      entry,
      start,
      end,
      center: start + span / 2,
      color,
      textColor,
      chance: ratio
    });
  });
  return segments;
}
