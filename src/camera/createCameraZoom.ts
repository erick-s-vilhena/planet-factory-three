import * as THREE from 'three'
import { MIN_VISIBLE_TILES } from './cameraConstants'

type CreateCameraZoomParams = {
  renderer: THREE.WebGLRenderer
  maxVisibleTiles: number
  getVisibleTiles: () => number
  setVisibleTiles: (value: number) => void
  updateViewport: () => void
}

export function createCameraZoom({
  renderer,
  maxVisibleTiles,
  getVisibleTiles,
  setVisibleTiles,
  updateViewport,
}: CreateCameraZoomParams) {
  const handleWheel = (event: WheelEvent) => {
    event.preventDefault()

    const zoomStep = Math.max(0.5, Math.abs(event.deltaY) * 0.01)
    const direction = Math.sign(event.deltaY)
    const nextVisibleTiles = THREE.MathUtils.clamp(
      getVisibleTiles() + direction * zoomStep,
      MIN_VISIBLE_TILES,
      maxVisibleTiles,
    )

    if (nextVisibleTiles === getVisibleTiles()) {
      return
    }

    setVisibleTiles(nextVisibleTiles)
    updateViewport()
  }

  return {
    attachZoom: () => {
      renderer.domElement.addEventListener('wheel', handleWheel, { passive: false })
    },
    detachZoom: () => {
      renderer.domElement.removeEventListener('wheel', handleWheel)
    },
  }
}
