import * as THREE from 'three'

export const GRID_SIZE = 40
export const TILE_SIZE = 1
export const TILE_HEIGHT = 0.22

export type TileMesh = THREE.Mesh<
  THREE.BoxGeometry,
  THREE.MeshStandardMaterial
> & {
  userData: {
    baseColor: THREE.ColorRepresentation
  }
}

type GroundSetup = {
  gridGroup: THREE.Group
  tiles: TileMesh[]
  dispose: () => void
}

export function createGround(scene: THREE.Scene): GroundSetup {
  const tiles: TileMesh[] = []
  const disposables: Array<{ dispose: () => void }> = []

  const tileGeometry = new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE)
  disposables.push(tileGeometry)

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: '#0f172a',
    transparent: true,
    opacity: 0.35,
  })
  disposables.push(edgeMaterial)

  const gridGroup = new THREE.Group()
  scene.add(gridGroup)

  for (let x = 0; x < GRID_SIZE; x += 1) {
    for (let z = 0; z < GRID_SIZE; z += 1) {
      const tileTone = (x + z) % 2 === 0 ? '#7fbe5c' : '#6aa84f'
      const material = new THREE.MeshStandardMaterial({
        color: tileTone,
        roughness: 0.9,
        metalness: 0.06,
      })
      disposables.push(material)

      const tile = new THREE.Mesh(tileGeometry, material) as TileMesh
      const offsetX = x - (GRID_SIZE - 1) / 2
      const offsetZ = z - (GRID_SIZE - 1) / 2

      tile.position.set(offsetX * TILE_SIZE, 0, offsetZ * TILE_SIZE)
      tile.castShadow = true
      tile.receiveShadow = true
      tile.userData.baseColor = tileTone
      gridGroup.add(tile)
      tiles.push(tile)

      const edgesGeometry = new THREE.EdgesGeometry(tileGeometry)
      disposables.push(edgesGeometry)

      const edges = new THREE.LineSegments(edgesGeometry, edgeMaterial)
      edges.position.copy(tile.position)
      gridGroup.add(edges)
    }
  }

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

  return {
    gridGroup,
    tiles,
    dispose: () => {
      scene.remove(gridGroup)
      scene.remove(base)
      disposables.forEach((item) => item.dispose())
    },
  }
}
