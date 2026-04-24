import * as THREE from 'three'
import type { TileMesh } from './createGround'

type TileInteraction = {
  attach: () => void
  detach: () => void
}

export function createTileInteraction(
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  tiles: TileMesh[],
  isPanning: () => boolean,
  consumeSelectionBlock: () => boolean,
): TileInteraction {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  let hoveredTile: TileMesh | null = null
  let selectedTile: TileMesh | null = null

  const applyTileState = (tile: TileMesh) => {
    if (tile === selectedTile) {
      tile.material.color.set('#f8fafc')
      tile.material.emissive.set('#fde68a')
      tile.material.emissiveIntensity = 0.5
      return
    }

    if (tile === hoveredTile) {
      tile.material.color.set('#d9f3ff')
      tile.material.emissive.set('#7dd3fc')
      tile.material.emissiveIntensity = 0.2
      return
    }

    tile.material.color.set(tile.userData.baseColor)
    tile.material.emissive.set('#000000')
    tile.material.emissiveIntensity = 0
  }

  const refreshTiles = () => {
    tiles.forEach((tile) => applyTileState(tile))
  }

  const pickTile = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(tiles, false)
      .find((intersection) => (intersection.object as TileMesh).userData.isUnlocked)

    return (hit?.object as TileMesh | undefined) ?? null
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      return
    }

    if (isPanning()) {
      return
    }

    const nextHoveredTile = pickTile(event)

    if (hoveredTile === nextHoveredTile) {
      return
    }

    hoveredTile = nextHoveredTile
    refreshTiles()
  }

  const handlePointerLeave = () => {
    if (!hoveredTile) {
      return
    }

    hoveredTile = null
    refreshTiles()
  }

  const handlePointerUp = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    if (consumeSelectionBlock()) {
      return
    }

    selectedTile = pickTile(event)
    refreshTiles()
  }

  return {
    attach: () => {
      renderer.domElement.addEventListener('pointermove', handlePointerMove)
      renderer.domElement.addEventListener('pointerleave', handlePointerLeave)
      renderer.domElement.addEventListener('pointerup', handlePointerUp)
      refreshTiles()
    },
    detach: () => {
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
    },
  }
}
