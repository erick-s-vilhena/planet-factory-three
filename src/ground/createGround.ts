import * as THREE from 'three'

export const GRID_SIZE = 30
export const TILE_SIZE = 1
export const TILE_HEIGHT = 0.22
export const UNLOCKED_RADIUS = 10

export type TileData = {
  isUnlocked: boolean
  position: THREE.Vector3
}

export type TileGrid = {
  mesh: THREE.InstancedMesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
  tiles: TileData[]
  setHoveredTile: (tileIndex: number | null) => void
  setSelectedTile: (tileIndex: number | null) => void
}

type GroundSetup = {
  tileGrid: TileGrid
  dispose: () => void
}

const createFogTexture = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Nao foi possivel criar o contexto 2D para a textura de nevoa.')
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let index = 0; index < 1600; index += 1) {
    const x = (Math.sin(index * 12.9898) * 43758.5453 % 1 + 1) % 1 * canvas.width
    const y = (Math.sin(index * 78.233) * 12741.371 % 1 + 1) % 1 * canvas.height
    const radius = 1.6 + (((Math.sin(index * 3.17) + 1) * 0.5) * 2.4)

    context.globalAlpha = 0.05 + (((Math.cos(index * 1.93) + 1) * 0.5) * 0.08)
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  for (let index = 0; index < 340; index += 1) {
    const y = (index / 339) * canvas.height
    context.globalAlpha = 0.02
    context.fillRect(0, y, canvas.width, 1)
  }

  context.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.needsUpdate = true

  return texture
}

export function createGround(scene: THREE.Scene): GroundSetup {
  const disposables: Array<{ dispose: () => void }> = []
  const tileCount = GRID_SIZE * GRID_SIZE
  const tiles: TileData[] = []
  const tileDummy = new THREE.Object3D()
  const fogDummy = new THREE.Object3D()

  const tileGeometry = new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE)
  const tileMaterial = new THREE.MeshStandardMaterial({
    color: '#88b94a',
    roughness: 0.92,
    metalness: 0.02,
  })
  const tileMesh = new THREE.InstancedMesh(tileGeometry, tileMaterial, tileCount)
  tileMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
  tileMesh.castShadow = true
  tileMesh.receiveShadow = true
  scene.add(tileMesh)
  disposables.push(tileGeometry, tileMaterial)

  const indicatorGeometry = new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT + 0.03, TILE_SIZE)
  const hoverMaterial = new THREE.MeshBasicMaterial({
    color: '#d9f3ff',
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })
  const selectionMaterial = new THREE.MeshBasicMaterial({
    color: '#f8fafc',
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  })
  disposables.push(indicatorGeometry, hoverMaterial, selectionMaterial)

  const hoverIndicator = new THREE.Mesh(indicatorGeometry, hoverMaterial)
  hoverIndicator.visible = false
  hoverIndicator.position.y = 0.015
  scene.add(hoverIndicator)

  const selectionIndicator = new THREE.Mesh(indicatorGeometry, selectionMaterial)
  selectionIndicator.visible = false
  selectionIndicator.position.y = 0.02
  scene.add(selectionIndicator)

  let lockedTileCount = 0
  let tileIndex = 0

  for (let x = 0; x < GRID_SIZE; x += 1) {
    for (let z = 0; z < GRID_SIZE; z += 1) {
      const offsetX = x - (GRID_SIZE - 1) / 2
      const offsetZ = z - (GRID_SIZE - 1) / 2
      const position = new THREE.Vector3(offsetX * TILE_SIZE, 0, offsetZ * TILE_SIZE)
      const isUnlocked = Math.hypot(offsetX, offsetZ) <= UNLOCKED_RADIUS

      tileDummy.position.copy(position)
      tileDummy.rotation.set(0, 0, 0)
      tileDummy.scale.set(1, 1, 1)
      tileDummy.updateMatrix()
      tileMesh.setMatrixAt(tileIndex, tileDummy.matrix)

      tiles.push({
        isUnlocked,
        position,
      })

      if (!isUnlocked) {
        lockedTileCount += 1
      }

      tileIndex += 1
    }
  }

  tileMesh.instanceMatrix.needsUpdate = true

  const fogTexture = createFogTexture()
  const fogGeometry = new THREE.PlaneGeometry(TILE_SIZE * 1.02, TILE_SIZE * 1.02)
  const fogMaterial = new THREE.MeshBasicMaterial({
    color: '#090909',
    transparent: true,
    opacity: 0.82,
    alphaMap: fogTexture,
    depthWrite: false,
  })
  const fogMesh = new THREE.InstancedMesh(fogGeometry, fogMaterial, lockedTileCount)
  fogMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
  fogMesh.renderOrder = 2
  scene.add(fogMesh)
  disposables.push(fogTexture, fogGeometry, fogMaterial)

  let fogIndex = 0

  tiles.forEach((tile) => {
    if (tile.isUnlocked) {
      return
    }

    fogDummy.position.set(tile.position.x, TILE_HEIGHT / 2 + 0.012, tile.position.z)
    fogDummy.rotation.set(-Math.PI / 2, 0, 0)
    fogDummy.scale.set(1, 1, 1)
    fogDummy.updateMatrix()
    fogMesh.setMatrixAt(fogIndex, fogDummy.matrix)
    fogIndex += 1
  })

  fogMesh.instanceMatrix.needsUpdate = true

  const baseGeometry = new THREE.BoxGeometry(GRID_SIZE + 2, 0.5, GRID_SIZE + 2)
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 1,
    metalness: 0,
  })
  disposables.push(baseGeometry, baseMaterial)

  const base = new THREE.Mesh(baseGeometry, baseMaterial)
  base.position.y = -0.38
  base.receiveShadow = true
  scene.add(base)

  const centerMarkerGeometry = new THREE.SphereGeometry(0.2, 20, 20)
  const centerMarkerMaterial = new THREE.MeshStandardMaterial({
    color: '#f97316',
    emissive: '#fb923c',
    emissiveIntensity: 0.35,
    roughness: 0.45,
    metalness: 0.1,
  })
  disposables.push(centerMarkerGeometry, centerMarkerMaterial)

  const centerMarker = new THREE.Mesh(centerMarkerGeometry, centerMarkerMaterial)
  centerMarker.position.set(0, TILE_HEIGHT / 2 + 0.14, 0)
  centerMarker.castShadow = true
  centerMarker.receiveShadow = true
  scene.add(centerMarker)

  const setIndicatorPosition = (
    indicator: THREE.Mesh,
    tileIndex: number | null,
    yOffset: number,
  ) => {
    if (tileIndex == null) {
      indicator.visible = false
      return
    }

    indicator.visible = true
    indicator.position.set(
      tiles[tileIndex].position.x,
      yOffset,
      tiles[tileIndex].position.z,
    )
  }

  return {
    tileGrid: {
      mesh: tileMesh,
      tiles,
      setHoveredTile: (tileIndex) => {
        setIndicatorPosition(hoverIndicator, tileIndex, TILE_HEIGHT / 2 + 0.015)
      },
      setSelectedTile: (tileIndex) => {
        setIndicatorPosition(selectionIndicator, tileIndex, TILE_HEIGHT / 2 + 0.02)
      },
    },
    dispose: () => {
      scene.remove(tileMesh)
      scene.remove(hoverIndicator)
      scene.remove(selectionIndicator)
      scene.remove(fogMesh)
      scene.remove(base)
      scene.remove(centerMarker)
      disposables.forEach((item) => item.dispose())
    },
  }
}
