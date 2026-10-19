import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'

/** Caméra de la vue : décalage écran puis facteur d'échelle. */
export type Camera = {
  x: number
  y: number
  scale: number
}

/** Boîte englobante de l'arbre dans l'espace monde. */
export type FitBounds = {
  x: number
  y: number
  width: number
  height: number
}

const MIN_SCALE = 0.15
const MAX_SCALE = 2.5
/** Marge conservée entre l'arbre et le bord du cadre lors d'un ajustement. */
const FIT_PADDING = 36
/** Écart entre deux points de contact déclenchant le mode panoramique. */
const DRAG_THRESHOLD = 4
/** Pas de déplacement au clavier (en pixels écran). */
const KEYBOARD_STEP = 64

type PointerPosition = { x: number; y: number }

type DragState = {
  pointerId: number
  startX: number
  startY: number
  cameraX: number
  cameraY: number
  moved: boolean
}

type PinchState = {
  distance: number
  scale: number
  cameraX: number
  cameraY: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

type UseTreeViewportOptions = {
  bounds: FitBounds | null
  /** Change lorsque l'on souhaite recadrer automatiquement (personne, profondeur). */
  fitKey: string
}

/**
 * Gestion du zoom et du déplacement (pan/drag, molette, pincement, clavier)
 * pour le canevas de l'arbre.
 */
export function useTreeViewport({ bounds, fitKey }: UseTreeViewportOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 })
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [isPanning, setIsPanning] = useState(false)

  const cameraRef = useRef(camera)
  cameraRef.current = camera
  const boundsRef = useRef(bounds)
  boundsRef.current = bounds

  const pointersRef = useRef(new Map<number, PointerPosition>())
  const dragRef = useRef<DragState | null>(null)
  const pinchRef = useRef<PinchState | null>(null)
  const movedRef = useRef(false)
  const fittedKeyRef = useRef<string | null>(null)

  /** Recadre l'arbre pour qu'il tienne entièrement dans le cadre. */
  const fit = useCallback(() => {
    const element = containerRef.current
    const box = boundsRef.current
    if (!element || !box) return
    const { width, height } = element.getBoundingClientRect()
    if (width === 0 || height === 0) return
    const scale = clamp(
      Math.min(
        (width - FIT_PADDING * 2) / box.width,
        (height - FIT_PADDING * 2) / box.height,
      ),
      MIN_SCALE,
      MAX_SCALE,
    )
    setCamera({
      scale,
      x: (width - box.width * scale) / 2 - box.x * scale,
      y: (height - box.height * scale) / 2 - box.y * scale,
    })
  }, [])

  /** Zoom en conservant le point `(screenX, screenY)` fixe. */
  const zoomTo = useCallback(
    (nextScale: number, screenX: number, screenY: number) => {
      setCamera((previous) => {
        const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE)
        const ratio = scale / previous.scale
        return {
          scale,
          x: screenX - (screenX - previous.x) * ratio,
          y: screenY - (screenY - previous.y) * ratio,
        }
      })
    },
    [],
  )

  /** Zoom centré sur le cadre (boutons). */
  const zoomBy = useCallback(
    (factor: number) => {
      const element = containerRef.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      zoomTo(cameraRef.current.scale * factor, rect.width / 2, rect.height / 2)
    },
    [zoomTo],
  )

  // Suivi de la taille du cadre (pour l'ajustement automatique).
  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries.at(0)
      if (!entry) return
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(element)
    const rect = element.getBoundingClientRect()
    setSize({ width: rect.width, height: rect.height })
    return () => observer.disconnect()
  }, [])

  // Ajustement automatique au chargement d'un nouvel arbre.
  useEffect(() => {
    if (!bounds || size.width === 0 || size.height === 0) return
    if (fittedKeyRef.current === fitKey) return
    fittedKeyRef.current = fitKey
    fit()
  }, [bounds, fitKey, fit, size.width, size.height])

  // Zoom à la molette (écouteur non passif pour pouvoir bloquer le scroll).
  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      const factor = Math.exp(-event.deltaY * 0.0015)
      zoomTo(
        cameraRef.current.scale * factor,
        event.clientX - rect.left,
        event.clientY - rect.top,
      )
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [zoomTo])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const element = containerRef.current
      if (!element) return
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      })
      movedRef.current = false

      if (pointersRef.current.size === 1) {
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          cameraX: cameraRef.current.x,
          cameraY: cameraRef.current.y,
          moved: false,
        }
        setIsPanning(true)
      } else if (pointersRef.current.size === 2) {
        // Le pincement capture les deux pointeurs pour continuer à suivre les
        // doigts même s'ils sortent du cadre.
        for (const pointerId of pointersRef.current.keys()) {
          try {
            element.setPointerCapture(pointerId)
          } catch {
            // Pointeur déjà relâché : rien à faire.
          }
        }
        const [first, second] = [...pointersRef.current.values()]
        pinchRef.current = {
          distance: Math.hypot(first.x - second.x, first.y - second.y),
          scale: cameraRef.current.scale,
          cameraX: cameraRef.current.x,
          cameraY: cameraRef.current.y,
        }
        dragRef.current = null
      }
    },
    [],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) return
      const element = containerRef.current
      if (!element) return
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      })

      if (pointersRef.current.size === 2 && pinchRef.current) {
        const [first, second] = [...pointersRef.current.values()]
        const rect = element.getBoundingClientRect()
        const distance = Math.hypot(first.x - second.x, first.y - second.y)
        const centerX = (first.x + second.x) / 2 - rect.left
        const centerY = (first.y + second.y) / 2 - rect.top
        const pinch = pinchRef.current
        const scale = clamp(
          pinch.scale * (distance / Math.max(pinch.distance, 1)),
          MIN_SCALE,
          MAX_SCALE,
        )
        const ratio = scale / pinch.scale
        movedRef.current = true
        setCamera({
          scale,
          x: centerX - (centerX - pinch.cameraX) * ratio,
          y: centerY - (centerY - pinch.cameraY) * ratio,
        })
        return
      }

      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        drag.moved = true
        // Capture seulement après le seuil : un simple clic sur une carte reste
        // un clic de navigation, sans interception des événements.
        try {
          element.setPointerCapture(event.pointerId)
        } catch {
          // Pointeur déjà relâché : rien à faire.
        }
      }
      if (!drag.moved) return
      movedRef.current = true
      setCamera({
        scale: cameraRef.current.scale,
        x: drag.cameraX + dx,
        y: drag.cameraY + dy,
      })
    },
    [],
  )

  const endPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null

    if (pointersRef.current.size === 0) {
      dragRef.current = null
      setIsPanning(false)
      return
    }
    if (pointersRef.current.size === 1) {
      const [pointerId, position] = [...pointersRef.current.entries()][0]
      dragRef.current = {
        pointerId,
        startX: position.x,
        startY: position.y,
        cameraX: cameraRef.current.x,
        cameraY: cameraRef.current.y,
        moved: false,
      }
    }
  }, [])

  /** Bloque la navigation d'un lien lorsqu'un déplacement vient d'avoir lieu. */
  const onClickCapture = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!movedRef.current) return
      event.preventDefault()
      event.stopPropagation()
      movedRef.current = false
    },
    [],
  )

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          setCamera((previous) => ({
            ...previous,
            x: previous.x + KEYBOARD_STEP,
          }))
          break
        case 'ArrowRight':
          event.preventDefault()
          setCamera((previous) => ({
            ...previous,
            x: previous.x - KEYBOARD_STEP,
          }))
          break
        case 'ArrowUp':
          event.preventDefault()
          setCamera((previous) => ({
            ...previous,
            y: previous.y + KEYBOARD_STEP,
          }))
          break
        case 'ArrowDown':
          event.preventDefault()
          setCamera((previous) => ({
            ...previous,
            y: previous.y - KEYBOARD_STEP,
          }))
          break
        case '+':
        case '=':
          event.preventDefault()
          zoomBy(1.2)
          break
        case '-':
          event.preventDefault()
          zoomBy(1 / 1.2)
          break
        case '0':
          event.preventDefault()
          fit()
          break
        default:
          break
      }
    },
    [fit, zoomBy],
  )

  return {
    containerRef,
    camera,
    isPanning,
    fit,
    zoomBy,
    onPointerDown,
    onPointerMove,
    onPointerUp: endPointer,
    onPointerCancel: endPointer,
    onClickCapture,
    onKeyDown,
  }
}
