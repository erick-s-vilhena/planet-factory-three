import * as THREE from 'three'
import { MIN_VISIBLE_TILES } from './cameraConstants'
import { createCameraMovement } from './createCameraMovement'
import { createCameraZoom } from './createCameraZoom'
import { createIsometricPerspective } from './createIsometricPerspective'

type IsometricCameraController = {
  camera: THREE.OrthographicCamera
  updateViewport: () => void
  isPanning: () => boolean
  consumeSelectionBlock: () => boolean
  attachPan: () => void
  detachPan: () => void
  attachZoom: () => void
  detachZoom: () => void
}

export function createIsometricCamera(
  mount: HTMLDivElement,
  renderer: THREE.WebGLRenderer,
  gridSize: number,
): IsometricCameraController {
  const camera = new THREE.OrthographicCamera()
  const chunkCenter = new THREE.Vector3(0, 0, 0)
  const maxVisibleTiles = gridSize

  let visibleTiles = MIN_VISIBLE_TILES

  const { updateViewport } = createIsometricPerspective({
    camera,
    mount,
    renderer,
    gridSize,
    target: chunkCenter,
    visibleTiles: () => visibleTiles,
  })

  const { attachZoom, detachZoom } = createCameraZoom({
    renderer,
    maxVisibleTiles,
    getVisibleTiles: () => visibleTiles,
    setVisibleTiles: (value: number) => {
      visibleTiles = value
    },
    updateViewport,
  })

  const { isPanning, consumeSelectionBlock, attachPan, detachPan } = createCameraMovement({
    camera,
    mount,
    renderer,
    target: chunkCenter,
    updateViewport,
  })

  return {
    camera,
    updateViewport,
    isPanning,
    consumeSelectionBlock,
    attachPan,
    detachPan,
    attachZoom,
    detachZoom,
  }
}
