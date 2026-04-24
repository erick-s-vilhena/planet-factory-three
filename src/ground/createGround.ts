import * as THREE from 'three'

export const GRID_SIZE = 40
export const TILE_SIZE = 1
export const TILE_HEIGHT = 0.22
export const UNLOCKED_RADIUS = 10

export type TileMesh = THREE.Mesh<
  THREE.BoxGeometry,
  THREE.MeshStandardMaterial
> & {
  userData: {
    baseColor: THREE.ColorRepresentation
    isUnlocked: boolean
  }
}

type GroundSetup = {
  gridGroup: THREE.Group
  tiles: TileMesh[]
  dispose: () => void
}

type GrassTextureVariant = {
  baseColor: string
  accentColor: string
  highlightColor: string
  seed: number
}

const createGrassTexture = ({
  baseColor,
  accentColor,
  highlightColor,
  seed,
}: GrassTextureVariant) => {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Nao foi possivel criar o contexto 2D para a textura de grama.')
  }

  context.fillStyle = baseColor
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let index = 0; index < 700; index += 1) {
    const angle = ((Math.sin(seed * 13.7 + index * 0.73) + 1) * Math.PI) / 2
    const x = (Math.sin(seed * 3.1 + index * 12.53) * 0.5 + 0.5) * canvas.width
    const y = (Math.cos(seed * 5.9 + index * 7.17) * 0.5 + 0.5) * canvas.height
    const length = 6 + ((Math.sin(seed + index * 1.37) + 1) * 0.5) * 10
    const width = 1 + ((Math.cos(seed * 2 + index * 1.91) + 1) * 0.5) * 1.6

    context.strokeStyle = index % 4 === 0 ? highlightColor : accentColor
    context.globalAlpha = index % 4 === 0 ? 0.22 : 0.18
    context.lineWidth = width
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
    context.stroke()
  }

  for (let index = 0; index < 2200; index += 1) {
    const x = (Math.sin(seed * 11.3 + index * 4.73) * 0.5 + 0.5) * canvas.width
    const y = (Math.cos(seed * 17.2 + index * 3.19) * 0.5 + 0.5) * canvas.height
    const radius = 0.4 + ((Math.sin(seed * 7.7 + index * 2.41) + 1) * 0.5) * 0.9

    context.fillStyle = index % 5 === 0 ? highlightColor : accentColor
    context.globalAlpha = index % 5 === 0 ? 0.12 : 0.08
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  context.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)
  texture.needsUpdate = true

  return texture
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
  const tiles: TileMesh[] = []
  const disposables: Array<{ dispose: () => void }> = []
  const grassTextureVariants = [
    {
      baseColor: '#8faa42',
      accentColor: '#7f9d39',
      highlightColor: '#b7cb59',
      seed: 0.91,
    },
    {
      baseColor: '#98b348',
      accentColor: '#88a33f',
      highlightColor: '#c3d663',
      seed: 2.37,
    },
    {
      baseColor: '#a2bc4f',
      accentColor: '#92aa45',
      highlightColor: '#cadc6b',
      seed: 4.18,
    },
  ] as const
  const grassTextures = grassTextureVariants.map((variant) => createGrassTexture(variant))
  const fogTexture = createFogTexture()
  const fogGeometry = new THREE.PlaneGeometry(TILE_SIZE * 1.02, TILE_SIZE * 1.02)
  const fogMaterial = new THREE.MeshBasicMaterial({
    color: '#090909',
    transparent: true,
    opacity: 0.82,
    alphaMap: fogTexture,
    depthWrite: false,
  })
  const fogGroup = new THREE.Group()
  const fogDummy = new THREE.Object3D()

  const tileGeometry = new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE)
  disposables.push(tileGeometry, fogGeometry, fogMaterial, fogTexture, ...grassTextures)

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: '#0f172a',
    transparent: true,
    opacity: 0.35,
  })
  disposables.push(edgeMaterial)

  const gridGroup = new THREE.Group()
  scene.add(gridGroup)
  scene.add(fogGroup)

  let lockedTileCount = 0

  for (let x = 0; x < GRID_SIZE; x += 1) {
    for (let z = 0; z < GRID_SIZE; z += 1) {
      const textureIndex = Math.floor(Math.random() * grassTextures.length)
      const tileTexture = grassTextures[textureIndex]
      const tileTone = grassTextureVariants[textureIndex].baseColor
      const offsetX = x - (GRID_SIZE - 1) / 2
      const offsetZ = z - (GRID_SIZE - 1) / 2
      const isUnlocked = Math.hypot(offsetX, offsetZ) <= UNLOCKED_RADIUS
      const material = new THREE.MeshStandardMaterial({
        color: tileTone,
        map: tileTexture,
        roughness: 0.9,
        metalness: 0.06,
      })
      disposables.push(material)

      const tile = new THREE.Mesh(tileGeometry, material) as TileMesh

      tile.position.set(offsetX * TILE_SIZE, 0, offsetZ * TILE_SIZE)
      tile.castShadow = true
      tile.receiveShadow = true
      tile.userData.baseColor = tileTone
      tile.userData.isUnlocked = isUnlocked
      gridGroup.add(tile)
      tiles.push(tile)

      const edgesGeometry = new THREE.EdgesGeometry(tileGeometry)
      disposables.push(edgesGeometry)

      const edges = new THREE.LineSegments(edgesGeometry, edgeMaterial)
      edges.position.copy(tile.position)
      gridGroup.add(edges)

      if (!isUnlocked) {
        lockedTileCount += 1
      }
    }
  }

  const fogMesh = new THREE.InstancedMesh(fogGeometry, fogMaterial, lockedTileCount)
  fogMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)
  fogMesh.renderOrder = 2

  let fogIndex = 0

  for (const tile of tiles) {
    if (tile.userData.isUnlocked) {
      continue
    }

    fogDummy.position.set(tile.position.x, TILE_HEIGHT / 2 + 0.012, tile.position.z)
    fogDummy.rotation.set(-Math.PI / 2, 0, 0)
    fogDummy.scale.set(1, 1, 1)
    fogDummy.updateMatrix()
    fogMesh.setMatrixAt(fogIndex, fogDummy.matrix)
    fogIndex += 1
  }

  fogGroup.add(fogMesh)

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

  return {
    gridGroup,
    tiles,
    dispose: () => {
      scene.remove(gridGroup)
      scene.remove(fogGroup)
      scene.remove(base)
      scene.remove(centerMarker)
      disposables.forEach((item) => item.dispose())
    },
  }
}
