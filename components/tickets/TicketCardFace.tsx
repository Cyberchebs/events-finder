"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { TicketCardFallback } from "@/components/tickets/TicketCardFallback";
import type {
  TicketCardFinish,
  TicketCardSceneProps,
  TicketCardShape,
  TicketCardTextColor,
} from "@/components/tickets/TicketCardTypes";

type Props = {
  children: ReactNode;
  color: string | null;
  finish: TicketCardFinish;
  imageUrl: string | null;
  label: string;
  qrImageUrl?: string | null;
  shape: TicketCardShape;
  textColor: TicketCardTextColor;
};

const TicketCardScene = dynamic<TicketCardSceneProps>(
  () =>
    import("@/components/tickets/TicketCardScene").then(
      (module) => module.TicketCardScene,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

const swatchColorVariables: Record<string, string> = {
  "tier-a": "--color-tier-a-1",
  "tier-b": "--color-tier-b-1",
  "tier-c": "--color-tier-c-1",
  ink: "--color-ink",
  yellow: "--color-warn",
  red: "--color-live",
};

type Tilt = {
  x: number;
  y: number;
};

function supportsWebGL2(): boolean {
  return typeof WebGL2RenderingContext !== "undefined";
}

function isCustomHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function TicketCardFace({
  children,
  color,
  finish,
  imageUrl,
  label,
  qrImageUrl = null,
  shape,
  textColor,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [canRender3D, setCanRender3D] = useState(false);
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [qrTextureUrl, setQrTextureUrl] = useState<string | null>(null);
  const [tilt, setTilt] = useState<Tilt>({ x: 0, y: 0 });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        setCanRender3D(entry.isIntersecting && supportsWebGL2());
        if (!entry.isIntersecting) {
          setCanvasElement(null);
          setIsCanvasReady(false);
          setQrTextureUrl(null);
        }
      },
      { rootMargin: "120px", threshold: 0.1 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasElement) {
      return;
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setIsCanvasReady(false);
      setQrTextureUrl(null);
    };
    const handleContextRestored = () => {
      setIsCanvasReady(true);
      setQrTextureUrl(qrImageUrl);
    };

    canvasElement.addEventListener("webglcontextlost", handleContextLost);
    canvasElement.addEventListener("webglcontextrestored", handleContextRestored);
    return () => {
      canvasElement.removeEventListener("webglcontextlost", handleContextLost);
      canvasElement.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [canvasElement, qrImageUrl]);

  const resolvedColor = useMemo(() => {
    if (color && isCustomHexColor(color)) {
      return color;
    }

    const token = color
      ? swatchColorVariables[color]
      : swatchColorVariables["tier-a"];
    if (!token || typeof document === "undefined") {
      return "white";
    }

    return (
      getComputedStyle(document.documentElement).getPropertyValue(token).trim() ||
      "white"
    );
  }, [color]);

  function updateTilt(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      return;
    }

    const horizontal = (event.clientX - bounds.left) / bounds.width;
    const vertical = (event.clientY - bounds.top) / bounds.height;
    setTilt({
      x: (0.5 - vertical) * 20,
      y: (horizontal - 0.5) * 24,
    });
  }

  function resetTilt() {
    setTilt({ x: 0, y: 0 });
  }

  function handleCanvasCreated(canvas: HTMLCanvasElement) {
    setCanvasElement(canvas);
    setIsCanvasReady(true);
  }

  function handleCanvasError() {
    setCanvasElement(null);
    setIsCanvasReady(false);
    setQrTextureUrl(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = 6;
    if (event.key === "Home") {
      event.preventDefault();
      resetTilt();
      return;
    }

    const changes: Partial<Tilt> = {
      ArrowDown: { x: tilt.x - step },
      ArrowLeft: { y: tilt.y - step },
      ArrowRight: { y: tilt.y + step },
      ArrowUp: { x: tilt.x + step },
    }[event.key] ?? {};
    if (Object.keys(changes).length === 0) {
      return;
    }

    event.preventDefault();
    setTilt((current) => ({
      x: Math.max(-18, Math.min(18, changes.x ?? current.x)),
      y: Math.max(-18, Math.min(18, changes.y ?? current.y)),
    }));
  }

  const textColorClass =
    textColor === "black" ? "text-ticket-black" : "text-ticket-white";
  const isThreeDimensionalQr =
    isCanvasReady && Boolean(qrImageUrl) && qrTextureUrl === qrImageUrl;

  return (
    <div
      aria-label={`${label}. 3D ticket. Use the arrow keys to rotate it and Home to reset.`}
      className={`ticket-card-stage relative isolate aspect-[1.58] min-h-[152px] w-full outline-none focus-visible:ring-2 focus-visible:ring-brand-line ${
        isThreeDimensionalQr ? "ticket-card-3d-ready" : ""
      }`}
      onKeyDown={handleKeyDown}
      onPointerLeave={resetTilt}
      onPointerMove={updateTilt}
      ref={stageRef}
      role="group"
      tabIndex={0}
    >
      <TicketCardFallback
        color={color}
        finish={finish}
        imageUrl={imageUrl}
        shape={shape}
        textColor={textColor}
        visible={!isCanvasReady}
      />
      {isVisible && canRender3D ? (
        <TicketCardScene
          color={resolvedColor}
          finish={finish}
          imageUrl={imageUrl}
          onCanvasCreated={handleCanvasCreated}
          onCanvasError={handleCanvasError}
          onQrTextureReady={setQrTextureUrl}
          qrImageUrl={qrImageUrl}
          rotation={tilt}
          shape={shape}
        />
      ) : null}
      <div
        className={`ticket-card-face ${textColorClass} ${
          shape === "torn" ? "ticket-card-face--torn" : ""
        }`}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
