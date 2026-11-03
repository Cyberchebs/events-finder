"use client";

import { Canvas } from "@react-three/fiber";
import { TicketCardCanvasBoundary } from "@/components/tickets/TicketCardCanvasBoundary";
import { TicketCardObject } from "@/components/tickets/TicketCardObject";
import type { TicketCardSceneProps } from "@/components/tickets/TicketCardTypes";

export function TicketCardScene({
  color,
  finish,
  imageUrl,
  onCanvasCreated,
  onCanvasError,
  onQrTextureReady,
  qrImageUrl,
  rotation,
  shape,
}: TicketCardSceneProps) {
  return (
    <TicketCardCanvasBoundary onError={onCanvasError}>
      <Canvas
        camera={{ fov: 25, far: 100, near: 0.1, position: [0, 0, 5] }}
        className="pointer-events-none absolute inset-0 !h-full !w-full"
        dpr={[1, 1.25]}
        fallback={<span className="sr-only">3D ticket preview unavailable</span>}
        frameloop="demand"
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => onCanvasCreated(gl.domElement)}
      >
        <ambientLight intensity={0.8} />
        <directionalLight intensity={2.2} position={[-2, 3, 5]} />
        <pointLight intensity={22} position={[2, 1, 3]} />
        <TicketCardObject
          color={color}
          finish={finish}
          imageUrl={imageUrl}
          onQrTextureReady={onQrTextureReady}
          qrImageUrl={qrImageUrl}
          rotation={rotation}
          shape={shape}
          key={`${imageUrl ?? ""}:${qrImageUrl ?? ""}`}
        />
      </Canvas>
    </TicketCardCanvasBoundary>
  );
}
