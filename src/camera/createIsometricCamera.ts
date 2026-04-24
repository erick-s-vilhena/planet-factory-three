import * as THREE from 'three'
import { MAX_VISIBLE_TILES, MIN_VISIBLE_TILES } from './cameraConstants'
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
  const maxVisibleTiles = Math.min(gridSize, MAX_VISIBLE_TILES)

  let visibleTiles = MIN_VISIBLE_TILES

  const { updateViewport } = createIsometricPerspective({
    camera,
    mount,
    renderer,
    gridSize,
    target: chunkCenter,
    visibleTiles: () => visibleTiles,
  })

  let isZoomGestureActive = false

  const {
    isPanning,
    panByScreenDelta,
    consumeSelectionBlock: consumePanSelectionBlock,
    attachPan,
    detachPan,
  } = createCameraMovement({
    camera,
    mount,
    renderer,
    target: chunkCenter,
    updateViewport,
    isZooming: () => isZoomGestureActive,
  })

  const zoomController = createCameraZoom({
    renderer,
    maxVisibleTiles,
    getVisibleTiles: () => visibleTiles,
    setVisibleTiles: (value: number) => {
      visibleTiles = value
    },
    updateViewport,
    panByScreenDelta,
    onZoomGestureChange: (active: boolean) => {
      isZoomGestureActive = active
    },
  })

  return {
    camera,
    updateViewport,
    isPanning,
    consumeSelectionBlock: () => (
      consumePanSelectionBlock() || zoomController.consumeSelectionBlock()
    ),
    attachPan,
    detachPan,
    attachZoom: zoomController.attachZoom,
    detachZoom: zoomController.detachZoom,
  }
}
