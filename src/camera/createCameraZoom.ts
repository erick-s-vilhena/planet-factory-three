import * as THREE from 'three'
import { MIN_VISIBLE_TILES } from './cameraConstants'

type CreateCameraZoomParams = {
  renderer: THREE.WebGLRenderer
  maxVisibleTiles: number
  getVisibleTiles: () => number
  setVisibleTiles: (value: number) => void
  updateViewport: () => void
  panByScreenDelta: (deltaX: number, deltaY: number) => void
  onZoomGestureChange: (active: boolean) => void
}

export function createCameraZoom({
  renderer,
  maxVisibleTiles,
  getVisibleTiles,
  setVisibleTiles,
  updateViewport,
  panByScreenDelta,
  onZoomGestureChange,
}: CreateCameraZoomParams) {
  const activeTouches = new Map<number, { x: number, y: number }>()
  let pinchStartDistance = 0
  let pinchStartVisibleTiles = 0
  let isPinching = false
  let shouldBlockSelection = false
  let lastPinchCenterX = 0
  let lastPinchCenterY = 0

  const applyZoom = (nextVisibleTiles: number) => {
    if (nextVisibleTiles === getVisibleTiles()) {
      return
    }

    setVisibleTiles(nextVisibleTiles)
    updateViewport()
  }

  const getFirstTwoTouches = () => {
    const touches = Array.from(activeTouches.values())
    return touches.length >= 2 ? [touches[0], touches[1]] as const : null
  }

  const beginPinch = () => {
    const touches = getFirstTwoTouches()

    if (!touches) {
      return
    }

    const [firstTouch, secondTouch] = touches
    pinchStartDistance = Math.hypot(
      secondTouch.x - firstTouch.x,
      secondTouch.y - firstTouch.y,
    )
    lastPinchCenterX = (firstTouch.x + secondTouch.x) / 2
    lastPinchCenterY = (firstTouch.y + secondTouch.y) / 2
    pinchStartVisibleTiles = getVisibleTiles()
    isPinching = pinchStartDistance > 0
    onZoomGestureChange(isPinching)
    shouldBlockSelection = true
  }

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault()

    const zoomStep = Math.max(0.5, Math.abs(event.deltaY) * 0.01)
    const direction = Math.sign(event.deltaY)
    const nextVisibleTiles = THREE.MathUtils.clamp(
      getVisibleTiles() + direction * zoomStep,
      MIN_VISIBLE_TILES,
      maxVisibleTiles,
    )

    applyZoom(nextVisibleTiles)
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      return
    }

    activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    renderer.domElement.setPointerCapture(event.pointerId)

    if (activeTouches.size === 2) {
      beginPinch()
    } else if (activeTouches.size > 2) {
      shouldBlockSelection = true
    }
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || !activeTouches.has(event.pointerId)) {
      return
    }

    activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (activeTouches.size < 2) {
      return
    }

    const touches = getFirstTwoTouches()

    if (!touches) {
      return
    }

    const [firstTouch, secondTouch] = touches
    const pinchDistance = Math.hypot(
      secondTouch.x - firstTouch.x,
      secondTouch.y - firstTouch.y,
    )
    const pinchCenterX = (firstTouch.x + secondTouch.x) / 2
    const pinchCenterY = (firstTouch.y + secondTouch.y) / 2

    if (!isPinching || pinchStartDistance <= 0 || pinchDistance <= 0) {
      beginPinch()
      return
    }

    event.preventDefault()

    panByScreenDelta(
      pinchCenterX - lastPinchCenterX,
      pinchCenterY - lastPinchCenterY,
    )
    lastPinchCenterX = pinchCenterX
    lastPinchCenterY = pinchCenterY

    const nextVisibleTiles = THREE.MathUtils.clamp(
      pinchStartVisibleTiles * (pinchStartDistance / pinchDistance),
      MIN_VISIBLE_TILES,
      maxVisibleTiles,
    )

    applyZoom(nextVisibleTiles)
  }

  const endTouch = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      return
    }

    activeTouches.delete(event.pointerId)

    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId)
    }

    if (activeTouches.size < 2) {
      isPinching = false
      onZoomGestureChange(false)
      pinchStartDistance = 0
      pinchStartVisibleTiles = 0
      lastPinchCenterX = 0
      lastPinchCenterY = 0
    }
  }

  return {
    isPinching: () => isPinching,
    consumeSelectionBlock: () => {
      const blocked = shouldBlockSelection
      shouldBlockSelection = false
      return blocked
    },
    attachZoom: () => {
      renderer.domElement.addEventListener('wheel', handleWheel, { passive: false })
      renderer.domElement.addEventListener('pointerdown', handlePointerDown)
      renderer.domElement.addEventListener('pointermove', handlePointerMove)
      renderer.domElement.addEventListener('pointerup', endTouch)
      renderer.domElement.addEventListener('pointercancel', endTouch)
    },
    detachZoom: () => {
      renderer.domElement.removeEventListener('wheel', handleWheel)
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerup', endTouch)
      renderer.domElement.removeEventListener('pointercancel', endTouch)
    },
  }
}
