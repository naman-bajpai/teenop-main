"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Pause, Play, Sparkles } from "lucide-react";
import * as THREE from "three"; 

import { cn } from "@/lib/utils";

interface LiquidGradientProps {
  title?: string;
  showPauseButton?: boolean;
  ctaText?: string;
  onCtaClick?: () => void;
  className?: string;
  showContent?: boolean;
  showFooter?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
}

interface TouchTrailPoint extends TouchPoint {
  age: number;
  force: number;
  vx: number;
  vy: number;
}

class TouchTexture {
  size = 64;
  width = 64;
  height = 64;
  maxAge = 64;
  radius = 0.1;
  speed = 1 / 64;
  trail: TouchTrailPoint[] = [];
  last: TouchPoint | null = null;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.Texture;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.texture = new THREE.Texture(this.canvas);
  }

  update() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.trail.length - 1; i >= 0; i -= 1) {
      const point = this.trail[i];
      const force = point.force * this.speed * (1 - point.age / this.maxAge);

      point.x += point.vx * force;
      point.y += point.vy * force;
      point.age += 1;

      if (point.age > this.maxAge) {
        this.trail.splice(i, 1);
      } else {
        this.drawPoint(point);
      }
    }

    this.texture.needsUpdate = true;
  }

  addTouch(point: TouchPoint) {
    let force = 0;
    let vx = 0;
    let vy = 0;

    if (this.last) {
      const dx = point.x - this.last.x;
      const dy = point.y - this.last.y;

      if (dx === 0 && dy === 0) {
        return;
      }

      const distance = Math.sqrt(dx * dx + dy * dy);
      vx = dx / distance;
      vy = dy / distance;
      force = Math.min((dx * dx + dy * dy) * 20000, 2);
    }

    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  drawPoint(point: TouchTrailPoint) {
    const position = {
      x: point.x * this.width,
      y: (1 - point.y) * this.height,
    };

    let intensity =
      point.age < this.maxAge * 0.3
        ? Math.sin((point.age / (this.maxAge * 0.3)) * (Math.PI / 2))
        : -(
            (1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7)) *
            ((1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7)) - 2)
          );

    intensity *= point.force;

    const color = `${((point.vx + 1) / 2) * 255}, ${((point.vy + 1) / 2) * 255}, ${intensity * 255}`;
    const radius = this.radius * this.width;

    this.ctx.shadowOffsetX = this.size * 5;
    this.ctx.shadowOffsetY = this.size * 5;
    this.ctx.shadowBlur = radius;
    this.ctx.shadowColor = `rgba(${color},${0.2 * intensity})`;
    this.ctx.beginPath();
    this.ctx.fillStyle = "rgba(255, 114, 90, 1)";
    this.ctx.arc(
      position.x - this.size * 5,
      position.y - this.size * 5,
      radius,
      0,
      Math.PI * 2,
    );
    this.ctx.fill();
  }
}

class GradientBackground {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null = null;
  isPaused = false;
  sceneManager: App;
  uniforms: {
    uTime: { value: number };
    uResolution: { value: THREE.Vector2 };
    uColor1: { value: THREE.Vector3 };
    uColor2: { value: THREE.Vector3 };
    uColor3: { value: THREE.Vector3 };
    uColor4: { value: THREE.Vector3 };
    uColor5: { value: THREE.Vector3 };
    uColor6: { value: THREE.Vector3 };
    uSpeed: { value: number };
    uIntensity: { value: number };
    uTouchTexture: { value: THREE.Texture | null };
    uGrainIntensity: { value: number };
    uDarkNavy: { value: THREE.Vector3 };
    uGradientSize: { value: number };
    uColor1Weight: { value: number };
    uColor2Weight: { value: number };
  };

  constructor(sceneManager: App) {
    this.sceneManager = sceneManager;
    this.uniforms = {
      uTime: { value: 0 },
      uResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      uColor1: { value: new THREE.Vector3(1.0, 0.447, 0.353) },
      uColor2: { value: new THREE.Vector3(0.263, 0.298, 0.616) },
      uColor3: { value: new THREE.Vector3(0.588, 0.796, 0.765) },
      uColor4: { value: new THREE.Vector3(0.973, 0.576, 0.235) },
      uColor5: { value: new THREE.Vector3(1.0, 0.447, 0.353) },
      uColor6: { value: new THREE.Vector3(0.263, 0.298, 0.616) },
      uSpeed: { value: 0.72 },
      uIntensity: { value: 1.12 },
      uTouchTexture: { value: null },
      uGrainIntensity: { value: 0.045 },
      uDarkNavy: { value: new THREE.Vector3(0.965, 0.976, 1.0) },
      uGradientSize: { value: 0.5 },
      uColor1Weight: { value: 1.05 },
      uColor2Weight: { value: 1.18 },
    };
  }

  init() {
    const viewSize = this.sceneManager.getViewSize();
    const geometry = new THREE.PlaneGeometry(
      viewSize.width,
      viewSize.height,
      1,
      1,
    );
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;

        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vUv = uv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uIntensity;
        uniform float uGrainIntensity;
        uniform float uGradientSize;
        uniform float uColor1Weight;
        uniform float uColor2Weight;
        uniform vec2 uResolution;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec3 uColor4;
        uniform vec3 uColor5;
        uniform vec3 uColor6;
        uniform vec3 uDarkNavy;
        uniform sampler2D uTouchTexture;
        varying vec2 vUv;

        float grain(vec2 uv, float t) {
          return fract(sin(dot(uv * uResolution * 0.5 + t, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
        }

        vec3 getGradientColor(vec2 uv, float time) {
          vec2 c1 = vec2(0.5 + sin(time * uSpeed * 0.4) * 0.4, 0.5 + cos(time * uSpeed * 0.5) * 0.4);
          vec2 c2 = vec2(0.5 + cos(time * uSpeed * 0.6) * 0.5, 0.5 + sin(time * uSpeed * 0.45) * 0.5);
          vec2 c3 = vec2(0.5 + sin(time * uSpeed * 0.35) * 0.45, 0.5 + cos(time * uSpeed * 0.55) * 0.45);
          vec2 c4 = vec2(0.5 + cos(time * uSpeed * 0.5) * 0.4, 0.5 + sin(time * uSpeed * 0.4) * 0.4);
          vec2 c5 = vec2(0.5 + sin(time * uSpeed * 0.7) * 0.35, 0.5 + cos(time * uSpeed * 0.6) * 0.35);
          vec2 c6 = vec2(0.5 + cos(time * uSpeed * 0.45) * 0.5, 0.5 + sin(time * uSpeed * 0.65) * 0.5);

          float i1 = 1.0 - smoothstep(0.0, uGradientSize, length(uv - c1));
          float i2 = 1.0 - smoothstep(0.0, uGradientSize, length(uv - c2));
          float i3 = 1.0 - smoothstep(0.0, uGradientSize, length(uv - c3));
          float i4 = 1.0 - smoothstep(0.0, uGradientSize, length(uv - c4));
          float i5 = 1.0 - smoothstep(0.0, uGradientSize, length(uv - c5));
          float i6 = 1.0 - smoothstep(0.0, uGradientSize, length(uv - c6));

          vec3 color = vec3(0.0);
          color += uColor1 * i1 * (0.55 + 0.45 * sin(time * uSpeed)) * uColor1Weight;
          color += uColor2 * i2 * (0.55 + 0.45 * cos(time * uSpeed * 1.2)) * uColor2Weight;
          color += uColor3 * i3 * (0.55 + 0.45 * sin(time * uSpeed * 0.8)) * 0.95;
          color += uColor4 * i4 * (0.55 + 0.45 * cos(time * uSpeed * 1.3)) * 0.8;
          color += uColor5 * i5 * (0.55 + 0.45 * sin(time * uSpeed * 1.1)) * 0.85;
          color += uColor6 * i6 * (0.55 + 0.45 * cos(time * uSpeed * 0.9)) * 0.9;

          color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;
          float lum = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(vec3(lum), color, 1.18);
          color = pow(color, vec3(0.92));
          float brightness = length(color);
          color = mix(uDarkNavy, color, max(brightness * 0.95, 0.24));
          return color;
        }

        void main() {
          vec2 uv = vUv;
          vec4 touchTex = texture2D(uTouchTexture, uv);
          uv.x -= (touchTex.r * 2.0 - 1.0) * 0.35 * touchTex.b;
          uv.y -= (touchTex.g * 2.0 - 1.0) * 0.35 * touchTex.b;

          vec2 center = vec2(0.5);
          float dist = length(uv - center);
          float ripple = sin(dist * 20.0 - uTime * 3.0) * 0.018 * touchTex.b;
          uv += vec2(ripple);

          vec3 color = getGradientColor(uv, uTime);
          color += grain(uv, uTime) * uGrainIntensity;
          color = clamp(color, vec3(0.0), vec3(1.0));

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.sceneManager.scene.add(this.mesh);
  }

  update(delta: number) {
    if (!this.isPaused) {
      this.uniforms.uTime.value += delta;
    }
  }

  setTheme() {
    this.uniforms.uColor1.value.set(1.0, 0.447, 0.353);
    this.uniforms.uColor2.value.set(0.263, 0.298, 0.616);
    this.uniforms.uColor3.value.set(0.588, 0.796, 0.765);
    this.uniforms.uColor4.value.set(0.973, 0.576, 0.235);
    this.uniforms.uColor5.value.set(1.0, 0.447, 0.353);
    this.uniforms.uColor6.value.set(0.263, 0.298, 0.616);
    this.uniforms.uDarkNavy.value.set(0.965, 0.976, 1.0);
    this.sceneManager.scene.background = new THREE.Color(0xf8fbff);
  }

  onResize(width: number, height: number) {
    const viewSize = this.sceneManager.getViewSize();

    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(
        viewSize.width,
        viewSize.height,
        1,
        1,
      );
    }

    this.uniforms.uResolution.value.set(width, height);
  }
}

class App {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  clock: THREE.Clock;
  touchTexture: TouchTexture;
  gradientBackground: GradientBackground;
  animationId: number | null = null;
  container: HTMLElement;
  private handleMouseMove: (event: MouseEvent) => void;
  private handleTouchMove: (event: TouchEvent) => void;
  private handleResize: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      10000,
    );
    this.camera.position.z = 50;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8fbff);
    this.clock = new THREE.Clock();
    this.touchTexture = new TouchTexture();
    this.gradientBackground = new GradientBackground(this);
    this.gradientBackground.uniforms.uTouchTexture.value = this.touchTexture.texture;

    this.handleMouseMove = (event) => {
      this.onMove(event.offsetX, event.offsetY);
    };

    this.handleTouchMove = (event) => {
      const rect = this.container.getBoundingClientRect();
      this.onMove(
        event.touches[0].clientX - rect.left,
        event.touches[0].clientY - rect.top,
      );
    };

    this.handleResize = () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
      this.gradientBackground.onResize(
        this.container.clientWidth,
        this.container.clientHeight,
      );
    };

    this.init();
  }

  setTheme() {
    this.gradientBackground.setTheme();
  }

  setPaused(paused: boolean) {
    this.gradientBackground.isPaused = paused;
  }

  getViewSize() {
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = Math.abs(this.camera.position.z * Math.tan(fov / 2) * 2);

    return {
      width: height * this.camera.aspect,
      height,
    };
  }

  private onMove(x: number, y: number) {
    this.touchTexture.addTouch({
      x: x / this.container.clientWidth,
      y: 1 - y / this.container.clientHeight,
    });
  }

  init() {
    this.gradientBackground.init();
    this.gradientBackground.setTheme();

    this.container.addEventListener("mousemove", this.handleMouseMove);
    this.container.addEventListener("touchmove", this.handleTouchMove, {
      passive: true,
    });
    window.addEventListener("resize", this.handleResize);

    this.tick();
  }

  tick() {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.touchTexture.update();
    this.gradientBackground.update(delta);
    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(() => this.tick());
  }

  cleanup() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.container.removeEventListener("mousemove", this.handleMouseMove);
    this.container.removeEventListener("touchmove", this.handleTouchMove);
    window.removeEventListener("resize", this.handleResize);

    this.gradientBackground.mesh?.geometry.dispose();
    this.gradientBackground.mesh?.material.dispose();
    this.touchTexture.texture.dispose();
    this.renderer.dispose();

    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

export default function LiquidGradient({
  title = "Liquid Gradient",
  showPauseButton = true,
  ctaText = "Explore More",
  onCtaClick,
  className,
  showContent = true,
  showFooter = false,
}: LiquidGradientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showCursor, setShowCursor] = useState(false);
  const appRef = useRef<App | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const cursor = cursorRef.current;
    const dot = cursorDotRef.current;

    if (!cursor || !dot) {
      return;
    }

    let cursorX = 0;
    let cursorY = 0;
    let dotX = 0;
    let dotY = 0;
    let animationId = 0;

    const animate = () => {
      cursorX += (mousePos.current.x - cursorX) * 0.12;
      cursorY += (mousePos.current.y - cursorY) * 0.12;
      dotX += (mousePos.current.x - dotX) * 0.3;
      dotY += (mousePos.current.y - dotY) * 0.3;

      cursor.style.transform = `translate(${cursorX - 20}px, ${cursorY - 20}px)`;
      dot.style.transform = `translate(${dotX - 4}px, ${dotY - 4}px)`;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    appRef.current?.cleanup();
    appRef.current = new App(container);
    appRef.current.setTheme();

    return () => {
      appRef.current?.cleanup();
      appRef.current = null;
    };
  }, []);

  useEffect(() => {
    appRef.current?.setPaused(!isPlaying);
  }, [isPlaying]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mousePos.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  return (
    <div
      className={cn("liquid-container", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowCursor(true)}
      onMouseLeave={() => setShowCursor(false)}
    >
      <div ref={containerRef} className="liquid-canvas-wrapper" />

      {showContent ? (
        <>
          <div
            ref={cursorRef}
            className="cursor-ring"
            style={{ opacity: showCursor ? 1 : 0 }}
          />
          <div
            ref={cursorDotRef}
            className="cursor-dot-element"
            style={{ opacity: showCursor ? 1 : 0 }}
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-6 pt-14 text-center">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-4 py-2 text-sm font-semibold text-[#434c9d] shadow-sm backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-[#ff725a]" />
                TeenOp Motion Background
              </div>
              <h1 className="title-main">{title}</h1>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-8 z-10 flex items-center justify-center gap-4 px-6">
            <button
              className="cta-btn"
              onClick={onCtaClick}
              type="button"
            >
              {ctaText}
              <ArrowRight className="h-4 w-4" />
            </button>

            {showPauseButton ? (
              <button
                onClick={() => setIsPlaying((value) => !value)}
                className="pause-btn"
                aria-label={isPlaying ? "Pause animation" : "Play animation"}
                type="button"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
            ) : null}
          </div>

          {showFooter ? (
            <footer className="footer-main">
              <span>Interactive gradient powered by Three.js</span>
            </footer>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export { LiquidGradient as Component };
