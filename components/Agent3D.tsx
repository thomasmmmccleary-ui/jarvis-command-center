'use client'

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { LiveAgent } from '@/app/api/agents/route'

// ─── Color palette ────────────────────────────────────────────────────────
const CHAR_COLORS = [
  '#06b6d4','#a855f7','#22c55e','#f59e0b','#f97316',
  '#3b82f6','#ec4899','#84cc16','#14b8a6','#8b5cf6',
  '#ef4444','#0ea5e9','#d946ef','#10b981','#f43f5e',
]

// Hair colors per agent index mod
const HAIR_COLORS = [
  '#1a0a00','#2d1b00','#0f0f0f','#1a1a2e','#3d2000',
  '#0a0030','#2d0f1e','#001a10','#1a0a2e','#0a1a00',
]

export function nameToColor3D(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return CHAR_COLORS[Math.abs(hash) % CHAR_COLORS.length]
}

function nameToHairColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) * 31 + ((hash << 3) - hash)
  }
  return HAIR_COLORS[Math.abs(hash) % HAIR_COLORS.length]
}

// ─── Personality walk styles ──────────────────────────────────────────────
interface WalkStyle {
  name: string
  strideLen: number
  strideSpeed: number
  bounce: number
  lean: number
  armSwing: number
  sway: number
  stepHeight: number
}

const WALK_STYLES: WalkStyle[] = [
  { name: 'Speedwalker',    strideLen: 0.7,  strideSpeed: 3.2, bounce: 0.04, lean: 0.12, armSwing: 0.9,  sway: 0.02, stepHeight: 0.15 },
  { name: 'Shuffler',       strideLen: 0.25, strideSpeed: 1.0, bounce: 0.01, lean: 0.01, armSwing: 0.15, sway: 0.01, stepHeight: 0.03 },
  { name: 'Bouncer',        strideLen: 0.45, strideSpeed: 2.0, bounce: 0.14, lean: 0.04, armSwing: 0.55, sway: 0.04, stepHeight: 0.25 },
  { name: 'Stoic',          strideLen: 0.40, strideSpeed: 1.6, bounce: 0.02, lean: 0.00, armSwing: 0.10, sway: 0.00, stepHeight: 0.08 },
  { name: 'Phone Walker',   strideLen: 0.30, strideSpeed: 1.2, bounce: 0.02, lean: 0.18, armSwing: 0.12, sway: 0.02, stepHeight: 0.05 },
  { name: 'Coffee Carrier', strideLen: 0.35, strideSpeed: 1.4, bounce: 0.03, lean: 0.02, armSwing: 0.20, sway: 0.01, stepHeight: 0.06 },
  { name: 'Enthusiast',     strideLen: 0.65, strideSpeed: 2.8, bounce: 0.10, lean: 0.08, armSwing: 1.1,  sway: 0.06, stepHeight: 0.22 },
  { name: 'Wanderer',       strideLen: 0.38, strideSpeed: 1.3, bounce: 0.05, lean: 0.02, armSwing: 0.40, sway: 0.12, stepHeight: 0.10 },
]

// ─── Walk path definitions ────────────────────────────────────────────────
function buildPaths(): THREE.Vector3[][] {
  const paths: THREE.Vector3[][] = []

  paths.push([
    new THREE.Vector3(-8, 0, -4), new THREE.Vector3(-4, 0, -4),
    new THREE.Vector3(0, 0, -4),  new THREE.Vector3(4, 0, -2),
    new THREE.Vector3(6, 0, 0),   new THREE.Vector3(4, 0, 2),
    new THREE.Vector3(0, 0, 2),   new THREE.Vector3(-4, 0, 0),
    new THREE.Vector3(-8, 0, -2), new THREE.Vector3(-8, 0, -4),
  ])

  paths.push([
    new THREE.Vector3(2, 0, 6),   new THREE.Vector3(6, 0, 4),
    new THREE.Vector3(8, 0, 0),   new THREE.Vector3(6, 0, -4),
    new THREE.Vector3(2, 0, -6),  new THREE.Vector3(-2, 0, -6),
    new THREE.Vector3(-6, 0, -4), new THREE.Vector3(-8, 0, 0),
    new THREE.Vector3(-6, 0, 4),  new THREE.Vector3(-2, 0, 6),
    new THREE.Vector3(2, 0, 6),
  ])

  paths.push([
    new THREE.Vector3(-3, 0, 0), new THREE.Vector3(0, 0, -3),
    new THREE.Vector3(3, 0, 0),  new THREE.Vector3(0, 0, 3),
    new THREE.Vector3(-3, 0, 0),
  ])

  paths.push([
    new THREE.Vector3(-6, 0, 5), new THREE.Vector3(-4, 0, 5),
    new THREE.Vector3(-2, 0, 6), new THREE.Vector3(0, 0, 5),
    new THREE.Vector3(-2, 0, 4), new THREE.Vector3(-4, 0, 4),
    new THREE.Vector3(-6, 0, 5),
  ])

  paths.push([
    new THREE.Vector3(9, 0, -7),  new THREE.Vector3(9, 0, 0),
    new THREE.Vector3(9, 0, 7),   new THREE.Vector3(5, 0, 7),
    new THREE.Vector3(0, 0, 7),   new THREE.Vector3(-5, 0, 7),
    new THREE.Vector3(-9, 0, 7),  new THREE.Vector3(-9, 0, 0),
    new THREE.Vector3(-9, 0, -7), new THREE.Vector3(-5, 0, -7),
    new THREE.Vector3(0, 0, -7),  new THREE.Vector3(5, 0, -7),
    new THREE.Vector3(9, 0, -7),
  ])

  paths.push([
    new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 0, -1),
    new THREE.Vector3(2, 0, 0),   new THREE.Vector3(1, 0, 1),
    new THREE.Vector3(-1, 0, 1),  new THREE.Vector3(-2, 0, 0),
    new THREE.Vector3(-1, 0, -1),
  ])

  paths.push([
    new THREE.Vector3(0, 0, 0),  new THREE.Vector3(3, 0, -2),
    new THREE.Vector3(5, 0, 0),  new THREE.Vector3(3, 0, 2),
    new THREE.Vector3(0, 0, 0),  new THREE.Vector3(-3, 0, -2),
    new THREE.Vector3(-5, 0, 0), new THREE.Vector3(-3, 0, 2),
    new THREE.Vector3(0, 0, 0),
  ])

  paths.push([
    new THREE.Vector3(-5, 0, -5), new THREE.Vector3(-3, 0, -5),
    new THREE.Vector3(-1, 0, -4), new THREE.Vector3(0, 0, -5),
    new THREE.Vector3(-1, 0, -6), new THREE.Vector3(-3, 0, -6),
    new THREE.Vector3(-5, 0, -5),
  ])

  paths.push([
    new THREE.Vector3(-8, 0, 1),  new THREE.Vector3(-4, 0, 1),
    new THREE.Vector3(0, 0, 1),   new THREE.Vector3(4, 0, 1),
    new THREE.Vector3(8, 0, 1),   new THREE.Vector3(8, 0, -1),
    new THREE.Vector3(4, 0, -1),  new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(-4, 0, -1), new THREE.Vector3(-8, 0, -1),
    new THREE.Vector3(-8, 0, 1),
  ])

  paths.push([
    new THREE.Vector3(7, 0, 5),  new THREE.Vector3(7, 0, -5),
    new THREE.Vector3(-7, 0, -5),new THREE.Vector3(-7, 0, 5),
    new THREE.Vector3(7, 0, 5),
  ])

  return paths
}

let _walkPaths: THREE.Vector3[][] | null = null
function getWalkPaths(): THREE.Vector3[][] {
  if (!_walkPaths) _walkPaths = buildPaths()
  return _walkPaths
}

// ─── Geometry cache — high-quality segments ───────────────────────────────
let _geoCache: {
  head: THREE.SphereGeometry
  eye: THREE.SphereGeometry
  eyeWhite: THREE.SphereGeometry
  iris: THREE.SphereGeometry
  nose: THREE.SphereGeometry
  ear: THREE.SphereGeometry
  hair: THREE.SphereGeometry
  body: THREE.CapsuleGeometry
  arm: THREE.CapsuleGeometry
  leg: THREE.CapsuleGeometry
  pants: THREE.CapsuleGeometry
  foot: THREE.SphereGeometry
  neck: THREE.CylinderGeometry
  particle: THREE.SphereGeometry
} | null = null

function getGeoCache() {
  if (!_geoCache) {
    _geoCache = {
      head: new THREE.SphereGeometry(0.22, 16, 16),
      eye: new THREE.SphereGeometry(0.045, 8, 6),
      eyeWhite: new THREE.SphereGeometry(0.055, 8, 6),
      iris: new THREE.SphereGeometry(0.025, 6, 4),
      nose: new THREE.SphereGeometry(0.03, 6, 4),
      ear: new THREE.SphereGeometry(0.055, 8, 6),
      hair: new THREE.SphereGeometry(0.195, 12, 10),
      body: new THREE.CapsuleGeometry(0.14, 0.3, 6, 16),
      arm: new THREE.CapsuleGeometry(0.045, 0.28, 6, 16),
      leg: new THREE.CapsuleGeometry(0.055, 0.3, 6, 16),
      pants: new THREE.CapsuleGeometry(0.065, 0.28, 6, 16),
      foot: new THREE.SphereGeometry(0.065, 8, 6),
      neck: new THREE.CylinderGeometry(0.065, 0.075, 0.08, 12),
      particle: new THREE.SphereGeometry(0.025, 6, 4),
    }
  }
  return _geoCache
}

// ─── Floating particles above active agents ───────────────────────────────
function AgentParticles({ color, active }: { color: string; active: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const geo = getGeoCache().particle

  const particleData = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    angle: (i / 6) * Math.PI * 2,
    radius: 0.12 + (i % 3) * 0.04,
    speed: 0.8 + i * 0.15,
    phase: i * 1.1,
    startY: 0.8 + i * 0.1,
  })), [])

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: 1.5,
    transparent: true,
    opacity: 0.85,
  }), [color])

  useFrame(({ clock }) => {
    if (!groupRef.current || !active) return
    const t = clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const pd = particleData[i]
      const drift = (t * pd.speed + pd.phase) % 1.2
      child.position.y = pd.startY + drift * 0.8
      child.position.x = Math.sin(t * pd.speed + pd.phase) * pd.radius
      child.position.z = Math.cos(t * pd.speed * 0.7 + pd.phase) * pd.radius
      const scale = Math.max(0, 1 - drift / 1.2)
      child.scale.setScalar(scale)
    })
  })

  if (!active) return null

  return (
    <group ref={groupRef}>
      {particleData.map((_, i) => (
        <mesh key={i} geometry={geo} material={mat} />
      ))}
    </group>
  )
}

// ─── Single 3D Character ──────────────────────────────────────────────────
interface CharacterProps {
  agent: LiveAgent
  agentIndex: number
  isActive: boolean
  activePosition?: THREE.Vector3
  onHover?: (name: string | null) => void
}

function Agent3DCharacter({ agent, agentIndex, isActive, activePosition, onHover }: CharacterProps) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const headRef = useRef<THREE.Mesh>(null)
  const neckRef = useRef<THREE.Mesh>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Group>(null)
  const rightLegRef = useRef<THREE.Group>(null)
  const leftFootRef = useRef<THREE.Mesh>(null)
  const rightFootRef = useRef<THREE.Mesh>(null)

  const walkStyle = WALK_STYLES[agentIndex % 8]
  const pathIdx = agentIndex % getWalkPaths().length
  const path = getWalkPaths()[pathIdx]

  const pathOffset = useMemo(() => (agentIndex * 0.73) % 1, [agentIndex])
  const walkTime = useRef(pathOffset * 100)
  const celebrateTime = useRef(0)

  const hexColor = useMemo(() => nameToColor3D(agent.name), [agent.name])
  const hairHex = useMemo(() => nameToHairColor(agent.name), [agent.name])
  const color = useMemo(() => new THREE.Color(hexColor), [hexColor])
  const emissiveColor = useMemo(() => new THREE.Color(hexColor).multiplyScalar(0.25), [hexColor])

  // Skin/shirt material — glossy
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    emissive: emissiveColor,
    roughness: 0.4,
    metalness: 0.1,
    envMapIntensity: 0.5,
  }), [color, emissiveColor])

  // Darker "pants" color
  const pantsColor = useMemo(() => new THREE.Color(hexColor).multiplyScalar(0.45), [hexColor])
  const pantsMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: pantsColor,
    roughness: 0.6,
    metalness: 0.05,
  }), [pantsColor])

  // Hair material
  const hairMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(hairHex),
    roughness: 0.7,
    metalness: 0.0,
  }), [hairHex])

  // Eye white
  const eyeWhiteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f0f0f0'),
    roughness: 0.3,
    metalness: 0.0,
  }), [])

  // Colored iris
  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(hexColor),
    emissive: new THREE.Color(hexColor),
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.0,
  }), [hexColor])

  // Dark pupil
  const pupilMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#050505'),
    roughness: 0.1,
    metalness: 0.0,
  }), [])

  const skinFaceMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e8c99a').lerp(color, 0.25),
    roughness: 0.5,
    metalness: 0.0,
  }), [color])

  const targetPos = useMemo(() => {
    if (isActive && activePosition) return activePosition
    return null
  }, [isActive, activePosition])

  const getPathPosition = useCallback((t: number): THREE.Vector3 => {
    const pts = path
    const totalLen = pts.length - 1
    const rawT = t % 1
    const segT = rawT * totalLen
    const seg = Math.floor(segT)
    const segFrac = segT - seg
    const a = pts[Math.min(seg, pts.length - 1)]
    const b = pts[Math.min(seg + 1, pts.length - 1)]
    return a.clone().lerp(b, segFrac)
  }, [path])

  const getPathDirection = useCallback((t: number): THREE.Vector3 => {
    const ahead = getPathPosition(t + 0.001)
    const now = getPathPosition(t)
    return ahead.sub(now).normalize()
  }, [getPathPosition])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    const ws = walkStyle

    if (isActive && targetPos) {
      groupRef.current.position.lerp(targetPos, 0.05)
      const dir = new THREE.Vector3(0, 0, 0).sub(groupRef.current.position).normalize()
      const angle = Math.atan2(dir.x, dir.z)
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, angle, 0.05)

      if (bodyRef.current) {
        bodyRef.current.rotation.x = Math.sin(t * 4) * 0.05 + 0.1
      }
      if (headRef.current) {
        headRef.current.rotation.x = Math.sin(t * 3) * 0.06 + 0.08
        headRef.current.rotation.y = Math.sin(t * 0.7) * 0.1
      }

      if (leftArmRef.current) leftArmRef.current.rotation.x = -0.8 + Math.sin(t * 4) * 0.15
      if (rightArmRef.current) rightArmRef.current.rotation.x = -0.8 + Math.sin(t * 4 + Math.PI) * 0.15
      if (leftLegRef.current) leftLegRef.current.rotation.x = 1.4
      if (rightLegRef.current) rightLegRef.current.rotation.x = 1.4

      if (celebrateTime.current > 0) {
        celebrateTime.current -= delta
        if (leftArmRef.current) leftArmRef.current.rotation.x = -2.5 + Math.sin(t * 8) * 0.3
        if (rightArmRef.current) rightArmRef.current.rotation.x = -2.5 + Math.sin(t * 8 + 0.5) * 0.3
        groupRef.current.position.y = (targetPos?.y ?? 0) + Math.abs(Math.sin(t * 6)) * 0.2
      }
    } else {
      walkTime.current += delta * 0.012 * ws.strideSpeed
      const pos = getPathPosition(walkTime.current)
      const dir = getPathDirection(walkTime.current)

      groupRef.current.position.lerp(pos, 0.08)
      groupRef.current.position.y = Math.abs(Math.sin(t * ws.strideSpeed * Math.PI)) * ws.bounce

      if (dir.lengthSq() > 0.0001) {
        const targetAngle = Math.atan2(dir.x, dir.z)
        const currentAngle = groupRef.current.rotation.y
        let diff = targetAngle - currentAngle
        while (diff > Math.PI) diff -= 2 * Math.PI
        while (diff < -Math.PI) diff += 2 * Math.PI
        groupRef.current.rotation.y += diff * 0.1
      }

      if (bodyRef.current) {
        bodyRef.current.rotation.x = ws.lean + Math.sin(t * ws.strideSpeed * Math.PI * 2) * 0.02
        bodyRef.current.rotation.z = Math.sin(t * ws.strideSpeed * Math.PI * 2 + Math.PI * 0.5) * ws.sway
      }

      if (headRef.current) {
        headRef.current.rotation.x = Math.sin(t * ws.strideSpeed * Math.PI) * 0.06
        headRef.current.rotation.y = Math.sin(t * 0.5) * 0.12
      }

      const stridePhase = t * ws.strideSpeed * Math.PI * 2
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = Math.sin(stridePhase + Math.PI) * ws.armSwing
        leftArmRef.current.rotation.z = 0.12
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = Math.sin(stridePhase) * ws.armSwing
        rightArmRef.current.rotation.z = -0.12
      }
      if (leftLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(stridePhase) * ws.strideLen
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.x = Math.sin(stridePhase + Math.PI) * ws.strideLen
      }
      if (leftFootRef.current) {
        leftFootRef.current.position.y = Math.max(0, Math.sin(stridePhase) * ws.stepHeight) - 0.2
      }
      if (rightFootRef.current) {
        rightFootRef.current.position.y = Math.max(0, Math.sin(stridePhase + Math.PI) * ws.stepHeight) - 0.2
      }

      if (ws.name === 'Phone Walker' && rightArmRef.current) {
        rightArmRef.current.rotation.x = -1.8 + Math.sin(t * 0.3) * 0.1
        rightArmRef.current.rotation.z = -0.3
      }

      if (ws.name === 'Coffee Carrier') {
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = -0.6 + Math.sin(t * ws.strideSpeed * Math.PI * 2) * 0.08
          leftArmRef.current.rotation.z = 0.15
        }
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = -0.6 + Math.sin(t * ws.strideSpeed * Math.PI * 2) * 0.08
          rightArmRef.current.rotation.z = -0.15
        }
      }

      if (ws.name === 'Wanderer' && bodyRef.current) {
        bodyRef.current.rotation.z = Math.sin(t * 0.8) * 0.15
      }
    }
  })

  const bodyY = 0.62
  const geo = getGeoCache()

  return (
    <group
      ref={groupRef}
      position={[0, 0, 0]}
      onPointerOver={() => onHover?.(agent.name)}
      onPointerOut={() => onHover?.(null)}
    >
      {/* Active glow ring */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.35, 0.42, 24]} />
          <meshStandardMaterial
            color={hexColor}
            emissive={hexColor}
            emissiveIntensity={1.2}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Floating particles above active agents */}
      <AgentParticles color={hexColor} active={isActive} />

      {/* Floating name label */}
      {isActive && (
        <Text
          position={[0, bodyY + 0.85, 0]}
          fontSize={0.12}
          color={hexColor}
          anchorX="center"
          anchorY="bottom"
          renderOrder={10}
          depthOffset={-1}
        >
          {agent.name.split('-').slice(0, 2).join('-')}
        </Text>
      )}

      <group ref={bodyRef} position={[0, bodyY, 0]}>
        {/* Neck */}
        <mesh ref={neckRef} geometry={geo.neck} material={skinFaceMat} position={[0, 0.27, 0]} castShadow />

        {/* Head */}
        <mesh ref={headRef} geometry={geo.head} material={skinFaceMat} position={[0, 0.46, 0]} castShadow receiveShadow>
          {/* Left ear */}
          <mesh geometry={geo.ear} material={skinFaceMat} position={[-0.22, 0.0, 0.0]} scale={[0.7, 1, 0.5]} />
          {/* Right ear */}
          <mesh geometry={geo.ear} material={skinFaceMat} position={[0.22, 0.0, 0.0]} scale={[0.7, 1, 0.5]} />

          {/* Left eye — white + iris + pupil */}
          <group position={[-0.09, 0.04, 0.18]}>
            <mesh geometry={geo.eyeWhite} material={eyeWhiteMat} />
            <mesh geometry={geo.iris} material={irisMat} position={[0, 0, 0.032]} />
            <mesh geometry={geo.iris} material={pupilMat} position={[0, 0, 0.048]} scale={0.6} />
          </group>

          {/* Right eye */}
          <group position={[0.09, 0.04, 0.18]}>
            <mesh geometry={geo.eyeWhite} material={eyeWhiteMat} />
            <mesh geometry={geo.iris} material={irisMat} position={[0, 0, 0.032]} />
            <mesh geometry={geo.iris} material={pupilMat} position={[0, 0, 0.048]} scale={0.6} />
          </group>

          {/* Nose */}
          <mesh geometry={geo.nose} material={skinFaceMat} position={[0, -0.02, 0.21]} />

          {/* Smile — ring geometry arc */}
          <mesh position={[0, -0.095, 0.2]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.055, 0.012, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#c0503a" roughness={0.4} />
          </mesh>

          {/* Phone walker: phone near head */}
          {walkStyle.name === 'Phone Walker' && (
            <mesh position={[0.22, -0.02, 0.12]}>
              <boxGeometry args={[0.07, 0.12, 0.015]} />
              <meshStandardMaterial color="#1e293b" emissive="#3b82f6" emissiveIntensity={0.6} />
            </mesh>
          )}
        </mesh>

        {/* Hair — flattened sphere on top, color varies by agent */}
        <mesh geometry={geo.hair} material={hairMat} position={[0, 0.62, -0.02]} scale={[1, 0.55, 0.95]} castShadow />

        {/* Body/Torso — shirt color = agent color */}
        <mesh geometry={geo.body} material={skinMat} position={[0, 0, 0]} castShadow receiveShadow />

        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.21, 0.1, 0]}>
          <mesh geometry={geo.arm} material={skinMat} position={[0, -0.16, 0]} castShadow />
          {walkStyle.name === 'Coffee Carrier' && (
            <mesh position={[-0.04, -0.36, 0]}>
              <cylinderGeometry args={[0.045, 0.035, 0.09, 10]} />
              <meshStandardMaterial color="#78350f" emissive="#f59e0b" emissiveIntensity={0.5} />
            </mesh>
          )}
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[0.21, 0.1, 0]}>
          <mesh geometry={geo.arm} material={skinMat} position={[0, -0.16, 0]} castShadow />
        </group>

        {/* Left Leg — pants (wider, darker) */}
        <group ref={leftLegRef} position={[-0.09, -0.26, 0]}>
          <mesh geometry={geo.pants} material={pantsMat} position={[0, -0.17, 0]} castShadow />
          <mesh ref={leftFootRef} geometry={geo.foot} material={pantsMat} position={[0, -0.2, 0.04]} castShadow />
        </group>

        {/* Right Leg */}
        <group ref={rightLegRef} position={[0.09, -0.26, 0]}>
          <mesh geometry={geo.pants} material={pantsMat} position={[0, -0.17, 0]} castShadow />
          <mesh ref={rightFootRef} geometry={geo.foot} material={pantsMat} position={[0, -0.2, 0.04]} castShadow />
        </group>
      </group>
    </group>
  )
}

// ─── Canvas-generated grid texture for floor ─────────────────────────────
function createFloorTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#050514'
  ctx.fillRect(0, 0, size, size)

  // Fine grid
  ctx.strokeStyle = 'rgba(0,40,80,0.5)'
  ctx.lineWidth = 0.5
  const step = size / 16
  for (let i = 0; i <= 16; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke()
  }

  // Bold grid (every 4)
  ctx.strokeStyle = 'rgba(0,100,180,0.25)'
  ctx.lineWidth = 1.5
  for (let i = 0; i <= 4; i++) {
    const p = i * (size / 4)
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(6, 4.5)
  return tex
}

// ─── Desk with glowing monitor ────────────────────────────────────────────
function Desk({ position, isActive, color }: { position: THREE.Vector3; isActive: boolean; color: string }) {
  const screenColor = isActive ? new THREE.Color(color) : new THREE.Color('#1e293b')
  const emissiveIntensity = isActive ? 2.5 : 0.2

  return (
    <group position={position}>
      {/* Desk surface */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.05, 0.7]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.15} />
      </mesh>
      {/* 4 legs */}
      {([[-0.45, 0.15, -0.28], [0.45, 0.15, -0.28], [-0.45, 0.15, 0.28], [0.45, 0.15, 0.28]] as [number,number,number][]).map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
      ))}
      {/* Monitor stand */}
      <mesh position={[0, 0.45, -0.15]}>
        <cylinderGeometry args={[0.02, 0.04, 0.28, 8]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* Monitor frame */}
      <mesh position={[0, 0.7, -0.17]}>
        <boxGeometry args={[0.6, 0.43, 0.02]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Monitor screen — emissive glow */}
      <mesh position={[0, 0.7, -0.18]}>
        <boxGeometry args={[0.55, 0.38, 0.025]} />
        <meshStandardMaterial
          color={screenColor}
          emissive={screenColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.05}
          metalness={0.1}
        />
      </mesh>
      {/* Keyboard */}
      <mesh position={[0, 0.33, 0.05]}>
        <boxGeometry args={[0.38, 0.02, 0.14]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      {/* Active desk glow */}
      {isActive && (
        <>
          <pointLight position={[0, 0.85, -0.18]} color={color} intensity={1.2} distance={3.0} decay={2} castShadow={false} />
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[1.12, 0.06, 0.72]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
              transparent
              opacity={0.1}
            />
          </mesh>
        </>
      )}
    </group>
  )
}

// ─── Ceiling rect-area light panel ───────────────────────────────────────
function CeilingLight({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 5.4, z]}>
      {/* Visible panel geometry */}
      <mesh>
        <boxGeometry args={[1.4, 0.04, 0.35]} />
        <meshStandardMaterial
          color="#c8e6ff"
          emissive="#c8e6ff"
          emissiveIntensity={0.9}
          roughness={0.1}
        />
      </mesh>
      {/* Point light beneath panel */}
      <pointLight
        position={[0, -0.3, 0]}
        color="#d0e8ff"
        intensity={0.7}
        distance={9}
        decay={2}
        castShadow={false}
      />
    </group>
  )
}

// ─── Office floor & walls ─────────────────────────────────────────────────
function OfficeEnvironment() {
  const [floorTex, setFloorTex] = useState<THREE.CanvasTexture | null>(null)

  useEffect(() => {
    setFloorTex(createFloorTexture())
  }, [])

  return (
    <>
      {/* Floor with canvas-generated grid texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 18]} />
        <meshStandardMaterial
          map={floorTex ?? undefined}
          color="#0a0a1a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Grid helper overlay */}
      <gridHelper args={[24, 24, '#0a2040', '#06122a']} position={[0, 0.002, 0]} />

      {/* Walls */}
      <mesh position={[0, 3, -9]} receiveShadow>
        <planeGeometry args={[24, 6]} />
        <meshStandardMaterial color="#030310" roughness={1.0} metalness={0.0} />
      </mesh>
      <mesh position={[-12, 3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[18, 6]} />
        <meshStandardMaterial color="#030310" roughness={1.0} metalness={0.0} />
      </mesh>

      {/* Ceiling light strips — visible emissive geometry */}
      {[-6, 0, 6].map((x) => (
        <mesh key={x} position={[x, 5.5, 0]}>
          <boxGeometry args={[0.15, 0.05, 16]} />
          <meshStandardMaterial color="#00f5ff" emissive="#00f5ff" emissiveIntensity={0.6} />
        </mesh>
      ))}

      {/* Ceiling light panels with point lights */}
      {([ [-6, -4], [0, -4], [6, -4], [-6, 4], [0, 4], [6, 4] ] as [number,number][]).map(([x, z], i) => (
        <CeilingLight key={i} x={x} z={z} />
      ))}

      {/* Main lighting */}
      <ambientLight intensity={0.3} color="#0a1020" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048] as unknown as THREE.Vector2}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      {/* Cyan fill light */}
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#00f5ff" />
      {/* Purple accent */}
      <pointLight position={[-10, 5, -10]} intensity={0.3} color="#7c3aed" />
      <hemisphereLight args={['#050510', '#1a0530', 0.4]} />
    </>
  )
}

// ─── Office furniture ─────────────────────────────────────────────────────
function OfficeFurniture() {
  return (
    <>
      {/* Coffee station */}
      <group position={[-9, 0, 5]}>
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.9, 0.6]} />
          <meshStandardMaterial color="#1e1006" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.95, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.25, 12]} />
          <meshStandardMaterial color="#78350f" emissive="#f59e0b" emissiveIntensity={0.4} />
        </mesh>
        {/* Small box cluster */}
        <mesh position={[0.3, 0.95, 0.1]}>
          <boxGeometry args={[0.18, 0.22, 0.18]} />
          <meshStandardMaterial color="#1c0e04" roughness={0.9} />
        </mesh>
        <mesh position={[-0.28, 1.0, -0.05]}>
          <boxGeometry args={[0.15, 0.28, 0.15]} />
          <meshStandardMaterial color="#2d1a08" roughness={0.9} />
        </mesh>
        <pointLight position={[0, 1.5, 0]} color="#f59e0b" intensity={0.5} distance={3.5} />
      </group>

      {/* Couch */}
      <group position={[-7, 0, 6.5]}>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 0.55, 0.9]} />
          <meshStandardMaterial color="#4c1d95" roughness={0.8} metalness={0.0} emissive="#2d0f63" emissiveIntensity={0.1} />
        </mesh>
        <mesh position={[0, 0.68, -0.35]}>
          <boxGeometry args={[2.5, 0.5, 0.18]} />
          <meshStandardMaterial color="#5b21b6" roughness={0.8} metalness={0.0} />
        </mesh>
        {[-0.6, 0.6].map((x, i) => (
          <mesh key={i} position={[x, 0.62, 0]}>
            <boxGeometry args={[0.7, 0.18, 0.75]} />
            <meshStandardMaterial color="#6d28d9" roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Conference table */}
      <group position={[8, 0, 5]}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.8, 1.8, 0.07, 24]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.1, 0.3, 0.4, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2
          const r = 2.2
          return (
            <mesh key={i} position={[Math.sin(angle) * r, 0.22, Math.cos(angle) * r]} castShadow>
              <boxGeometry args={[0.4, 0.44, 0.4]} />
              <meshStandardMaterial color="#0f172a" roughness={0.9} />
            </mesh>
          )
        })}
        <pointLight position={[0, 2, 0]} color="#00f5ff" intensity={0.4} distance={6} />
      </group>

      {/* TV/monitor on wall */}
      <group position={[0, 2.4, -8.7]}>
        <mesh castShadow>
          <boxGeometry args={[3.2, 1.8, 0.1]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[2.9, 1.55]} />
          <meshStandardMaterial
            color="#00f5ff"
            emissive="#00f5ff"
            emissiveIntensity={0.5}
            roughness={0.05}
          />
        </mesh>
        <pointLight position={[0, 0, 1]} color="#00f5ff" intensity={0.8} distance={7} />
      </group>

      {/* Plants — cone trunk + sphere top */}
      {([[-10, 0, -7], [10, 0, -7], [-10, 0, 7]] as [number,number,number][]).map((pos, i) => (
        <group key={i} position={pos}>
          {/* Pot */}
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.15, 0.4, 10]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {/* Trunk cone */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <coneGeometry args={[0.07, 0.25, 8]} />
            <meshStandardMaterial color="#3d2000" roughness={0.95} />
          </mesh>
          {/* Main foliage */}
          <mesh position={[0, 0.75, 0]} castShadow>
            <sphereGeometry args={[0.38, 10, 8]} />
            <meshStandardMaterial color="#166534" roughness={0.7} emissive="#14532d" emissiveIntensity={0.15} />
          </mesh>
          {/* Secondary foliage */}
          <mesh position={[0.2, 0.9, 0.1]} castShadow>
            <sphereGeometry args={[0.24, 8, 6]} />
            <meshStandardMaterial color="#15803d" roughness={0.75} emissive="#14532d" emissiveIntensity={0.1} />
          </mesh>
        </group>
      ))}

      {/* Water cooler */}
      <group position={[10, 0, -2]}>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 1.2, 12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.35} />
        </mesh>
        <mesh position={[0, 1.25, 0]}>
          <sphereGeometry args={[0.22, 12, 10]} />
          <meshStandardMaterial color="#1d4ed8" transparent opacity={0.65} roughness={0.08} metalness={0.25} />
        </mesh>
        <pointLight position={[0, 1.5, 0]} color="#3b82f6" intensity={0.35} distance={2.5} />
      </group>
    </>
  )
}

// ─── Desk pod arrangement ─────────────────────────────────────────────────
const POD_CONFIG_STATIC = [
  { center: { x: -7, y: 0, z: -5 }, color: '#00f5ff', label: 'RESEARCH' },
  { center: { x: -2, y: 0, z: -5 }, color: '#ec4899', label: 'CREATIVE' },
  { center: { x:  3, y: 0, z: -5 }, color: '#8b5cf6', label: 'STRATEGY' },
  { center: { x:  8, y: 0, z: -5 }, color: '#3b82f6', label: 'ENGINEERING' },
  { center: { x: -7, y: 0, z:  1 }, color: '#10b981', label: 'ANALYTICS' },
  { center: { x: -2, y: 0, z:  1 }, color: '#f59e0b', label: 'CONTENT' },
  { center: { x:  3, y: 0, z:  1 }, color: '#7c3aed', label: 'MARKETING' },
  { center: { x:  8, y: 0, z:  1 }, color: '#f97316', label: 'SOCIAL' },
]

let _deskPositions: { pos: THREE.Vector3; label: string; color: string }[] | null = null
function getDeskPositions() {
  if (!_deskPositions) {
    _deskPositions = []
    for (const pod of POD_CONFIG_STATIC) {
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          _deskPositions.push({
            pos: new THREE.Vector3(pod.center.x + (col - 1) * 1.5, 0, pod.center.z + row * 1.6),
            label: pod.label,
            color: pod.color,
          })
        }
      }
    }
  }
  return _deskPositions
}

// ─── Pod zone labels ──────────────────────────────────────────────────────
function PodLabels() {
  return (
    <>
      {POD_CONFIG_STATIC.map((pod, i) => (
        <mesh key={i} position={[pod.center.x, 0.01, pod.center.z - 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.2, 3.6]} />
          <meshStandardMaterial
            color={pod.color}
            emissive={pod.color}
            emissiveIntensity={0.1}
            transparent
            opacity={0.06}
          />
        </mesh>
      ))}
    </>
  )
}

// ─── Hover label overlay ──────────────────────────────────────────────────
function HoverLabel({ name }: { name: string | null }) {
  if (!name) return null
  return (
    <div style={{
      position: 'absolute',
      bottom: 12,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,10,30,0.9)',
      border: '1px solid rgba(0,245,255,0.4)',
      borderRadius: 6,
      padding: '4px 12px',
      color: '#00f5ff',
      fontSize: 11,
      fontFamily: 'JetBrains Mono, monospace',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      zIndex: 20,
    }}>
      {name}
    </div>
  )
}

// ─── Post-processing effects ──────────────────────────────────────────────
function PostFX() {
  return (
    <EffectComposer>
      <Bloom
        intensity={1.5}
        luminanceThreshold={0.6}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.1} darkness={0.8} />
      <ChromaticAberration
        offset={[0.0005, 0.0005] as unknown as THREE.Vector2}
        radialModulation={false}
        modulationOffset={0}
      />
    </EffectComposer>
  )
}

// ─── Scene root ───────────────────────────────────────────────────────────
interface SceneProps {
  agents: LiveAgent[]
  activeAgents: LiveAgent[]
  onHover: (name: string | null) => void
}

function Scene({ agents, activeAgents, onHover }: SceneProps) {
  const activeIds = useMemo(() => new Set(activeAgents.map(a => a.id)), [activeAgents])

  return (
    <>
      <OfficeEnvironment />
      <OfficeFurniture />
      <PodLabels />

      {getDeskPositions().map((desk, i) => {
        const occupant = i < activeAgents.length ? activeAgents[i] : null
        return (
          <Desk
            key={i}
            position={desk.pos}
            isActive={occupant !== null}
            color={occupant ? nameToColor3D(occupant.name) : desk.color}
          />
        )
      })}

      {agents.slice(0, 60).map((agent, i) => {
        const isActive = activeIds.has(agent.id)
        const activeIdx = activeAgents.findIndex(a => a.id === agent.id)
        const deskPos = isActive && activeIdx >= 0 && activeIdx < getDeskPositions().length
          ? getDeskPositions()[activeIdx].pos.clone().add(new THREE.Vector3(0, 0, 0.5))
          : undefined

        return (
          <Agent3DCharacter
            key={agent.id}
            agent={agent}
            agentIndex={i}
            isActive={isActive}
            activePosition={deskPos}
            onHover={onHover}
          />
        )
      })}

      <PostFX />
    </>
  )
}

// ─── Camera control ───────────────────────────────────────────────────────
function IsometricCamera() {
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[0, 16, 14]}
        fov={45}
        near={0.1}
        far={200}
      />
      <OrbitControls
        autoRotate
        autoRotateSpeed={0.3}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI / 2.5}
        minDistance={8}
        maxDistance={40}
        target={[0, 0, 0]}
      />
    </>
  )
}

// ─── Perf monitor ─────────────────────────────────────────────────────────
function PerfThrottle() {
  const { gl } = useThree()
  useEffect(() => {
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }, [gl])
  return null
}

// ─── WebGL fallback ──────────────────────────────────────────────────────
function WebGLUnavailable() {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#050510', borderRadius: 10,
      border: '1px solid rgba(0,245,255,0.08)',
    }}>
      <div style={{ color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, marginBottom: 8 }}>
        ⚠ WebGL Unavailable
      </div>
      <div style={{ color: 'rgba(148,163,184,0.5)', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, textAlign: 'center', maxWidth: 300 }}>
        3D rendering requires WebGL. Your browser or environment does not support it.
        Switch to 2D mode above.
      </div>
    </div>
  )
}

// ─── Error boundary ───────────────────────────────────────────────────────
interface ErrorBoundaryState { hasError: boolean }
class Scene3DErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// ─── Public export ────────────────────────────────────────────────────────
interface Office3DSceneProps {
  agents: LiveAgent[]
  activeAgents: LiveAgent[]
  style?: React.CSSProperties
}

export function Office3DScene({ agents, activeAgents, style }: Office3DSceneProps) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      setWebglSupported(!!gl)
    } catch {
      setWebglSupported(false)
    }
  }, [])

  if (webglSupported === null) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050510', borderRadius: 10, ...style }}>
        <div style={{ color: '#00f5ff', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, opacity: 0.5 }}>Initializing 3D…</div>
      </div>
    )
  }

  if (!webglSupported) {
    return <div style={{ width: '100%', height: '100%', ...style }}><WebGLUnavailable /></div>
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <Scene3DErrorBoundary fallback={<WebGLUnavailable />}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false,
          }}
          style={{ background: '#050510' }}
          frameloop="always"
        >
          <PerfThrottle />
          <IsometricCamera />
          <Scene agents={agents} activeAgents={activeAgents} onHover={setHoveredAgent} />
        </Canvas>
      </Scene3DErrorBoundary>

      <HoverLabel name={hoveredAgent} />

      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        background: 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(124,58,237,0.15))',
        border: '1px solid rgba(0,245,255,0.3)',
        borderRadius: 6,
        padding: '3px 8px',
        fontSize: 8,
        color: '#00f5ff',
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: 1,
        pointerEvents: 'none',
      }}>
        3D · WebGL · Bloom · Shadows · react-three-fiber
      </div>
    </div>
  )
}

export default Office3DScene
