import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type {
  BlockCoord,
  BlockMap,
  CameraAngles,
  CameraPreset,
  ProjectionType,
  ToolMode,
} from '../types/blocks';
import { LAYER_COLORS } from '../types/blocks';
import { coordKey } from '../utils/projections';

interface Viewport3DProps {
  blocks: BlockMap;
  gridSize: number;
  toolMode: ToolMode;
  selectedColor: string;
  layerColorMode: boolean;
  xrayMode: boolean;
  gravityEnabled: boolean;
  shortRightClickErase: boolean;
  readOnly?: boolean;
  highlightLayer: number | null;
  projectionType: ProjectionType;
  cameraPresetTrigger: { preset: CameraPreset; seq: number } | null;
  onPlaceBlock: (coord: BlockCoord) => void;
  onRemoveBlock: (coord: BlockCoord) => void;
  onBlockedAction: (message: string) => void;
  onCameraAngleChange: (angles: CameraAngles) => void;
  onShiftStateChange: (shiftHeld: boolean) => void;
}

/** Generate crisp Tinkercad-style blue workplane texture */
function createWorkplaneTexture(gridSize: number): THREE.CanvasTexture {
  const cellPx = 128;
  const size = gridSize * cellPx;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Soft Tinkercad sky-blue background
  ctx.fillStyle = '#e0f2fe';
  ctx.fillRect(0, 0, size, size);

  // Subtle 4x4 sub-grid inside each block cell (Tinkercad mm feel)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.24)';
  ctx.lineWidth = 1;
  const subStep = cellPx / 4;
  for (let i = 0; i <= gridSize * 4; i++) {
    const pos = i * subStep;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  // Main unit-block grid lines
  ctx.strokeStyle = 'rgba(2, 132, 199, 0.55)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= gridSize; i++) {
    const pos = i * cellPx;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  // Outer crisp border
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Generate high-DPI directional plaque texture for workplane edges */
function createLabelPlaque(
  text: string,
  bgColor: string,
  textColor: string,
  borderColor: string
): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Rounded rectangle pill
  const r = 28;
  const x = 16;
  const y = 16;
  const w = canvas.width - 32;
  const h = canvas.height - 32;

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  ctx.fillStyle = bgColor;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = borderColor;
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = '800 50px "Noto Sans KR", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;

  const geo = new THREE.PlaneGeometry(2.3, 0.58);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function normalizeAngleDelta(from: number, to: number): number {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  blocks,
  gridSize,
  toolMode,
  selectedColor,
  layerColorMode,
  xrayMode,
  gravityEnabled,
  shortRightClickErase,
  readOnly = false,
  highlightLayer,
  projectionType,
  cameraPresetTrigger,
  onPlaceBlock,
  onRemoveBlock,
  onBlockedAction,
  onCameraAngleChange,
  onShiftStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep latest props accessible inside event listeners without recreating Three.js scene
  const propsRef = useRef({
    blocks,
    gridSize,
    toolMode,
    selectedColor,
    layerColorMode,
    xrayMode,
    gravityEnabled,
    shortRightClickErase,
    readOnly,
    highlightLayer,
    projectionType,
    onPlaceBlock,
    onRemoveBlock,
    onBlockedAction,
    onCameraAngleChange,
    onShiftStateChange,
  });
  propsRef.current = {
    blocks,
    gridSize,
    toolMode,
    selectedColor,
    layerColorMode,
    xrayMode,
    gravityEnabled,
    shortRightClickErase,
    readOnly,
    highlightLayer,
    projectionType,
    onPlaceBlock,
    onRemoveBlock,
    onBlockedAction,
    onCameraAngleChange,
    onShiftStateChange,
  };

  // Three.js object refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const blocksGroupRef = useRef<THREE.Group | null>(null);
  const workplaneGroupRef = useRef<THREE.Group | null>(null);
  const floorPlaneRef = useRef<THREE.Mesh | null>(null);
  const ghostPlaceRef = useRef<THREE.Mesh | null>(null);
  const ghostEraseRef = useRef<THREE.Mesh | null>(null);

  // Camera spherical orbit state
  const camStateRef = useRef({
    theta: Math.PI * 0.22,
    phi: Math.PI * 0.34,
    radius: 11.5,
    target: new THREE.Vector3(0, 1.0, 0),
    anim: null as null | {
      theta: number;
      phi: number;
      radius?: number;
      target?: THREE.Vector3;
    },
  });

  const shiftHeldRef = useRef(false);
  const lastPointerNdcRef = useRef<THREE.Vector2 | null>(null);

  // Convert grid (x, y, z) <-> world coordinates
  const gridToWorld = (x: number, y: number, z: number, n: number) => {
    const half = (n - 1) / 2;
    return new THREE.Vector3(x - half, y + 0.5, z - half);
  };

  const worldToGridXZ = (wx: number, wz: number, n: number) => {
    const half = n / 2;
    const x = Math.floor(wx + half);
    const z = Math.floor(wz + half);
    return { x, z };
  };

  // Trigger camera preset animation whenever preset prop updates
  useEffect(() => {
    if (!cameraPresetTrigger) return;
    const n = propsRef.current.gridSize;
    const preset = cameraPresetTrigger.preset;
    const defaultTarget = new THREE.Vector3(0, Math.min(1.2, n * 0.24), 0);
    const defaultRadius = n * 2.25;

    switch (preset) {
      case 'home':
        camStateRef.current.anim = {
          theta: Math.PI * 0.22,
          phi: Math.PI * 0.34,
          radius: defaultRadius,
          target: defaultTarget,
        };
        break;
      case 'front':
        camStateRef.current.anim = {
          theta: 0,
          phi: Math.PI / 2,
          target: defaultTarget,
        };
        break;
      case 'right':
        camStateRef.current.anim = {
          theta: Math.PI / 2,
          phi: Math.PI / 2,
          target: defaultTarget,
        };
        break;
      case 'back':
        camStateRef.current.anim = {
          theta: Math.PI,
          phi: Math.PI / 2,
          target: defaultTarget,
        };
        break;
      case 'left':
        camStateRef.current.anim = {
          theta: -Math.PI / 2,
          phi: Math.PI / 2,
          target: defaultTarget,
        };
        break;
      case 'top':
        camStateRef.current.anim = {
          theta: 0,
          phi: 0.002,
          target: new THREE.Vector3(0, 0, 0),
        };
        break;
    }
  }, [cameraPresetTrigger]);

  // Initialize Three.js Scene & Tinkercad Mouse Interaction
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f1f5f9');
    sceneRef.current = scene;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const aspect = width / height;

    const perspCam = new THREE.PerspectiveCamera(42, aspect, 0.1, 150);
    const orthoCam = new THREE.OrthographicCamera(-6 * aspect, 6 * aspect, 6, -6, 0.1, 150);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Bright classroom / Tinkercad studio lighting
    const hemiLight = new THREE.HemisphereLight('#ffffff', '#cbd5e1', 0.85);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 0.95);
    dirLight.position.set(8, 16, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 45;
    const d = 10;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight('#e0f2fe', 0.35);
    fillLight.position.set(-10, 8, -8);
    scene.add(fillLight);

    // Groups
    const workplaneGroup = new THREE.Group();
    scene.add(workplaneGroup);
    workplaneGroupRef.current = workplaneGroup;

    const blocksGroup = new THREE.Group();
    scene.add(blocksGroup);
    blocksGroupRef.current = blocksGroup;

    // Ghost preview mesh for placing a block
    const ghostPlaceGeo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const ghostPlaceMat = new THREE.MeshStandardMaterial({
      color: '#0ea5e9',
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const ghostPlace = new THREE.Mesh(ghostPlaceGeo, ghostPlaceMat);
    const ghostPlaceEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(ghostPlaceGeo),
      new THREE.LineBasicMaterial({ color: '#0284c7' })
    );
    ghostPlace.add(ghostPlaceEdges);
    ghostPlace.visible = false;
    scene.add(ghostPlace);
    ghostPlaceRef.current = ghostPlace;

    // Ghost highlight mesh for erasing a block
    const ghostEraseGeo = new THREE.BoxGeometry(1.04, 1.04, 1.04);
    const ghostEraseMat = new THREE.MeshBasicMaterial({
      color: '#ef4444',
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const ghostErase = new THREE.Mesh(ghostEraseGeo, ghostEraseMat);
    const ghostEraseEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(ghostEraseGeo),
      new THREE.LineBasicMaterial({ color: '#dc2626' })
    );
    ghostErase.add(ghostEraseEdges);
    ghostErase.visible = false;
    scene.add(ghostErase);
    ghostEraseRef.current = ghostErase;

    const raycaster = new THREE.Raycaster();

    const getActiveCamera = () =>
      propsRef.current.projectionType === 'orthographic' ? orthoCam : perspCam;

    const syncCameras = () => {
      const s = camStateRef.current;
      const sinPhi = Math.sin(s.phi);
      const x = s.target.x + s.radius * sinPhi * Math.sin(s.theta);
      const y = s.target.y + s.radius * Math.cos(s.phi);
      const z = s.target.z + s.radius * sinPhi * Math.cos(s.theta);

      perspCam.position.set(x, y, z);
      perspCam.lookAt(s.target);

      const curW = container.clientWidth || 800;
      const curH = container.clientHeight || 600;
      const curAspect = curW / curH;
      const halfH = s.radius * Math.tan(THREE.MathUtils.degToRad(perspCam.fov / 2));
      orthoCam.left = -halfH * curAspect;
      orthoCam.right = halfH * curAspect;
      orthoCam.top = halfH;
      orthoCam.bottom = -halfH;
      orthoCam.position.set(x, y, z);
      orthoCam.lookAt(s.target);
      orthoCam.updateProjectionMatrix();
    };

    const getHoverTarget = (ndc: THREE.Vector2) => {
      const p = propsRef.current;
      const cam = getActiveCamera();
      raycaster.setFromCamera(ndc, cam);

      const blockMeshes = blocksGroup.children.filter(
        (obj): obj is THREE.Mesh => obj instanceof THREE.Mesh && !!obj.userData.coord
      );
      const hits = raycaster.intersectObjects(blockMeshes, false);

      if (hits.length > 0) {
        const hit = hits[0];
        const hitCoord = hit.object.userData.coord as BlockCoord;
        const normal = hit.face?.normal;
        let placeCoord: BlockCoord | null = null;
        if (normal) {
          const nx = hitCoord.x + Math.round(normal.x);
          const ny = hitCoord.y + Math.round(normal.y);
          const nz = hitCoord.z + Math.round(normal.z);
          if (
            nx >= 0 && nx < p.gridSize &&
            ny >= 0 && ny < p.gridSize &&
            nz >= 0 && nz < p.gridSize &&
            !p.blocks[coordKey(nx, ny, nz)]
          ) {
            placeCoord = { x: nx, y: ny, z: nz };
          }
        }
        return { hitBlock: hitCoord, placeCoord };
      }

      if (floorPlaneRef.current) {
        const floorHits = raycaster.intersectObject(floorPlaneRef.current, false);
        if (floorHits.length > 0) {
          const pt = floorHits[0].point;
          const { x, z } = worldToGridXZ(pt.x, pt.z, p.gridSize);
          if (
            x >= 0 && x < p.gridSize &&
            z >= 0 && z < p.gridSize &&
            !p.blocks[coordKey(x, 0, z)]
          ) {
            return { hitBlock: null, placeCoord: { x, y: 0, z } };
          }
        }
      }

      return { hitBlock: null, placeCoord: null };
    };

    const updateHoverPreview = () => {
      const p = propsRef.current;
      if (p.readOnly || !lastPointerNdcRef.current) {
        ghostPlace.visible = false;
        ghostErase.visible = false;
        return;
      }

      const isErasing = p.toolMode === 'erase' || shiftHeldRef.current;
      const { hitBlock, placeCoord } = getHoverTarget(lastPointerNdcRef.current);

      if (isErasing) {
        ghostPlace.visible = false;
        if (hitBlock) {
          const pos = gridToWorld(hitBlock.x, hitBlock.y, hitBlock.z, p.gridSize);
          ghostErase.position.copy(pos);
          ghostErase.visible = true;
        } else {
          ghostErase.visible = false;
        }
      } else {
        ghostErase.visible = false;
        if (placeCoord) {
          const pos = gridToWorld(placeCoord.x, placeCoord.y, placeCoord.z, p.gridSize);
          ghostPlace.position.copy(pos);
          const floatingBlocked =
            p.gravityEnabled &&
            placeCoord.y > 0 &&
            !p.blocks[coordKey(placeCoord.x, placeCoord.y - 1, placeCoord.z)];
          (ghostPlace.material as THREE.MeshStandardMaterial).color.set(
            floatingBlocked ? '#f87171' : '#0ea5e9'
          );
          ghostPlace.visible = true;
        } else {
          ghostPlace.visible = false;
        }
      }
    };

    // Mouse / Pointer interaction state (Tinkercad mapping)
    type DragMode = 'none' | 'orbit' | 'pan' | 'left';
    let dragMode: DragMode = 'none';
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;
    let movedDist = 0;

    const getNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      // Prevent middle-click auto-scroll in Windows browsers
      if (e.button === 1) {
        e.preventDefault();
      }

      downX = e.clientX;
      downY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      movedDist = 0;

      if (e.button === 2) {
        // Right mouse button: Tinkercad Orbit (or Shift + Right = Pan)
        dragMode = e.shiftKey ? 'pan' : 'orbit';
        camStateRef.current.anim = null;
        renderer.domElement.setPointerCapture(e.pointerId);
      } else if (e.button === 1) {
        // Middle mouse button (wheel click): Tinkercad Pan
        dragMode = 'pan';
        camStateRef.current.anim = null;
        renderer.domElement.setPointerCapture(e.pointerId);
      } else if (e.button === 0) {
        dragMode = 'left';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      movedDist += Math.hypot(dx, dy);

      lastPointerNdcRef.current = getNdc(e.clientX, e.clientY);

      if (dragMode === 'orbit') {
        const rotateSpeed = 0.0075;
        camStateRef.current.theta -= dx * rotateSpeed;
        camStateRef.current.phi = THREE.MathUtils.clamp(
          camStateRef.current.phi - dy * rotateSpeed,
          0.02,
          Math.PI * 0.498
        );
        syncCameras();
        propsRef.current.onCameraAngleChange({
          theta: camStateRef.current.theta,
          phi: camStateRef.current.phi,
        });
        ghostPlace.visible = false;
        ghostErase.visible = false;
        return;
      }

      if (dragMode === 'pan') {
        const s = camStateRef.current;
        const cam = getActiveCamera();
        const panScale = s.radius * 0.0014;
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        cam.matrixWorld.extractBasis(right, up, new THREE.Vector3());

        s.target.addScaledVector(right, -dx * panScale);
        s.target.addScaledVector(up, dy * panScale);

        // Soft clamp pan so user never loses the workplane completely
        const limit = propsRef.current.gridSize * 1.4;
        s.target.x = THREE.MathUtils.clamp(s.target.x, -limit, limit);
        s.target.y = THREE.MathUtils.clamp(s.target.y, -1, limit);
        s.target.z = THREE.MathUtils.clamp(s.target.z, -limit, limit);

        syncCameras();
        ghostPlace.visible = false;
        ghostErase.visible = false;
        return;
      }

      updateHoverPreview();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (renderer.domElement.hasPointerCapture(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }

      const isClick = movedDist < 6 && Math.hypot(e.clientX - downX, e.clientY - downY) < 6;
      const p = propsRef.current;

      if (dragMode === 'left' && isClick && !p.readOnly) {
        const ndc = getNdc(e.clientX, e.clientY);
        const { hitBlock, placeCoord } = getHoverTarget(ndc);
        const isErasing = p.toolMode === 'erase' || e.shiftKey;

        if (isErasing) {
          if (hitBlock) {
            p.onRemoveBlock(hitBlock);
          }
        } else if (placeCoord) {
          const isFloating =
            p.gravityEnabled &&
            placeCoord.y > 0 &&
            !p.blocks[coordKey(placeCoord.x, placeCoord.y - 1, placeCoord.z)];
          if (isFloating) {
            p.onBlockedAction('중력 규칙이 켜져 있어 공중에 띄워 쌓을 수 없어요!');
          } else {
            p.onPlaceBlock(placeCoord);
          }
        }
      } else if (
        dragMode === 'orbit' &&
        isClick &&
        !p.readOnly &&
        p.shortRightClickErase &&
        !e.shiftKey
      ) {
        // Optional user setting: short right-click without drag removes block
        const ndc = getNdc(e.clientX, e.clientY);
        const { hitBlock } = getHoverTarget(ndc);
        if (hitBlock) {
          p.onRemoveBlock(hitBlock);
        }
      }

      dragMode = 'none';
      updateHoverPreview();
    };

    const onPointerLeave = () => {
      lastPointerNdcRef.current = null;
      ghostPlace.visible = false;
      ghostErase.visible = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camStateRef.current.anim = null;
      const zoomFactor = e.deltaY > 0 ? 1.09 : 0.915;
      camStateRef.current.radius = THREE.MathUtils.clamp(
        camStateRef.current.radius * zoomFactor,
        4.2,
        28
      );
      syncCameras();
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !shiftHeldRef.current) {
        shiftHeldRef.current = true;
        propsRef.current.onShiftStateChange(true);
        updateHoverPreview();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && shiftHeldRef.current) {
        shiftHeldRef.current = false;
        propsRef.current.onShiftStateChange(false);
        updateHoverPreview();
      }
    };

    const onBlur = () => {
      if (shiftHeldRef.current) {
        shiftHeldRef.current = false;
        propsRef.current.onShiftStateChange(false);
        updateHoverPreview();
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointerleave', onPointerLeave);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      perspCam.aspect = w / h;
      perspCam.updateProjectionMatrix();
      renderer.setSize(w, h);
      syncCameras();
    });
    resizeObserver.observe(container);

    // Animation loop
    let animId = 0;
    let lastTime = performance.now();
    syncCameras();
    propsRef.current.onCameraAngleChange({
      theta: camStateRef.current.theta,
      phi: camStateRef.current.phi,
    });

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const s = camStateRef.current;
      if (s.anim) {
        const lerpAlpha = 1 - Math.exp(-10 * dt);
        const dTheta = normalizeAngleDelta(s.theta, s.anim.theta);
        const dPhi = s.anim.phi - s.phi;
        s.theta += dTheta * lerpAlpha;
        s.phi += dPhi * lerpAlpha;

        let done = Math.abs(dTheta) < 0.002 && Math.abs(dPhi) < 0.002;

        if (s.anim.radius !== undefined) {
          const dR = s.anim.radius - s.radius;
          s.radius += dR * lerpAlpha;
          done = done && Math.abs(dR) < 0.01;
        }
        if (s.anim.target) {
          s.target.lerp(s.anim.target, lerpAlpha);
          done = done && s.target.distanceTo(s.anim.target) < 0.01;
        }

        if (done) {
          s.theta = s.anim.theta;
          s.phi = s.anim.phi;
          if (s.anim.radius !== undefined) s.radius = s.anim.radius;
          if (s.anim.target) s.target.copy(s.anim.target);
          s.anim = null;
        }

        syncCameras();
        propsRef.current.onCameraAngleChange({ theta: s.theta, phi: s.phi });
      }

      renderer.render(scene, getActiveCamera());
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointerleave', onPointerLeave);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      renderer.dispose();
      if (dom.parentNode === container) {
        container.removeChild(dom);
      }
    };
  }, []);

  // Rebuild Workplane whenever gridSize changes
  useEffect(() => {
    const wpGroup = workplaneGroupRef.current;
    if (!wpGroup) return;

    while (wpGroup.children.length > 0) {
      const child = wpGroup.children[0];
      wpGroup.remove(child);
    }

    // Main Tinkercad blue workplane
    const wpTex = createWorkplaneTexture(gridSize);
    const floorGeo = new THREE.PlaneGeometry(gridSize, gridSize);
    const floorMat = new THREE.MeshStandardMaterial({
      map: wpTex,
      roughness: 0.85,
      metalness: 0.0,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    wpGroup.add(floorMesh);
    floorPlaneRef.current = floorMesh;

    // Subtle platform base plate under workplane for depth
    const baseGeo = new THREE.BoxGeometry(gridSize + 0.16, 0.14, gridSize + 0.16);
    const baseMat = new THREE.MeshStandardMaterial({ color: '#bae6fd', roughness: 0.9 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.075;
    baseMesh.receiveShadow = true;
    wpGroup.add(baseMesh);

    // Directional edge plaques (초6-2 방향 감각 핵심 가이드)
    const offset = gridSize / 2 + 0.56;

    // 앞 (Front, +Z)
    const frontLabel = createLabelPlaque('▲ 앞 (정면)', '#0284c7', '#ffffff', '#0369a1');
    frontLabel.position.set(0, 0.01, offset);
    wpGroup.add(frontLabel);

    // 뒤 (Back, -Z)
    const backLabel = createLabelPlaque('뒤', '#f8fafc', '#64748b', '#cbd5e1');
    backLabel.position.set(0, 0.01, -offset);
    backLabel.rotation.z = Math.PI;
    wpGroup.add(backLabel);

    // 오른쪽 옆 (+X)
    const rightLabel = createLabelPlaque('오른쪽 옆', '#059669', '#ffffff', '#047857');
    rightLabel.position.set(offset, 0.01, 0);
    rightLabel.rotation.z = Math.PI / 2;
    wpGroup.add(rightLabel);

    // 왼쪽 옆 (-X)
    const leftLabel = createLabelPlaque('왼쪽 옆', '#f8fafc', '#64748b', '#cbd5e1');
    leftLabel.position.set(-offset, 0.01, 0);
    leftLabel.rotation.z = -Math.PI / 2;
    wpGroup.add(leftLabel);
  }, [gridSize]);

  // Rebuild 3D Block Meshes whenever blocks / visual options change
  useEffect(() => {
    const group = blocksGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    const boxGeo = new THREE.BoxGeometry(0.985, 0.985, 0.985);
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);

    for (const block of Object.values(blocks)) {
      const colorHex = layerColorMode
        ? LAYER_COLORS[block.y % LAYER_COLORS.length]
        : block.color;

      const isDimmedByLayer = highlightLayer !== null && block.y !== highlightLayer;
      const isHighlightedLayer = highlightLayer !== null && block.y === highlightLayer;

      const opacity = isDimmedByLayer ? 0.16 : xrayMode ? 0.42 : 1.0;
      const transparent = opacity < 1.0;

      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.42,
        metalness: 0.04,
        transparent,
        opacity,
        depthWrite: !transparent,
        emissive: isHighlightedLayer ? new THREE.Color(colorHex) : new THREE.Color('#000000'),
        emissiveIntensity: isHighlightedLayer ? 0.18 : 0,
      });

      const mesh = new THREE.Mesh(boxGeo, mat);
      const pos = gridToWorld(block.x, block.y, block.z, gridSize);
      mesh.position.copy(pos);
      mesh.castShadow = !transparent;
      mesh.receiveShadow = !transparent;
      mesh.userData = { coord: { x: block.x, y: block.y, z: block.z } };

      const lineMat = new THREE.LineBasicMaterial({
        color: isDimmedByLayer ? '#94a3b8' : '#1e293b',
        transparent: isDimmedByLayer,
        opacity: isDimmedByLayer ? 0.28 : 0.72,
      });
      const edges = new THREE.LineSegments(edgesGeo, lineMat);
      mesh.add(edges);

      group.add(mesh);
    }
  }, [blocks, gridSize, layerColorMode, xrayMode, highlightLayer]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative cursor-crosshair select-none touch-none"
      aria-label="3D 쌓기나무 작업공간"
    />
  );
};
