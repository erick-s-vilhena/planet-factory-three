import * as THREE from 'three'
import type { TileGrid } from './createGround'

type TileInteraction = {
  attach: () => void
  detach: () => void
}

export function createTileInteraction(
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  tileGrid: TileGrid,
  isPanning: () => boolean,
  consumeSelectionBlock: () => boolean,
): TileInteraction {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  let hoveredTileId: number | null = null
  let selectedTileId: number | null = null

  const refreshTiles = () => {
    const hoverTarget = hoveredTileId === selectedTileId ? null : hoveredTileId
    tileGrid.setHoveredTile(hoverTarget)
    tileGrid.setSelectedTile(selectedTileId)
  }

  const pickTileId = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObject(tileGrid.mesh, false)
      .find((intersection) => {
        if (intersection.instanceId == null) {
          return false
        }

        return tileGrid.tiles[intersection.instanceId].isUnlocked
      })

    return hit?.instanceId ?? null
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      return
    }

    if (isPanning()) {
      return
    }

    const nextHoveredTileId = pickTileId(event)

    if (hoveredTileId === nextHoveredTileId) {
      return
    }

    hoveredTileId = nextHoveredTileId
    refreshTiles()
  }

  const handlePointerLeave = () => {
    if (hoveredTileId == null) {
      return
    }

    hoveredTileId = null
    refreshTiles()
  }

  const handlePointerUp = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    if (consumeSelectionBlock()) {
      return
    }

    selectedTileId = pickTileId(event)
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
