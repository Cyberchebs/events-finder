"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ExtrudeGeometry,
  SRGBColorSpace,
  Shape,
  TextureLoader,
  type Texture,
} from "three";
import type {
  TicketCardFinish,
  TicketCardShape,
} from "@/components/tickets/TicketCardTypes";

type Props = {
  color: string;
  finish: TicketCardFinish;
  imageUrl: string | null;
  onQrTextureReady: (imageUrl: string) => void;
  qrImageUrl: string | null;
  rotation: {
    x: number;
    y: number;
  };
  shape: TicketCardShape;
};

type TicketTextures = {
  artwork: Texture | null;
  qr: Texture | null;
};

function createTicketShape(shape: TicketCardShape): Shape {
  const ticket = new Shape();
  if (shape === "solid") {
    ticket.moveTo(-1.45, -1);
    ticket.lineTo(1.45, -1);
    ticket.quadraticCurveTo(1.6, -1, 1.6, -0.85);
    ticket.lineTo(1.6, 0.85);
    ticket.quadraticCurveTo(1.6, 1, 1.45, 1);
    ticket.lineTo(-1.45, 1);
    ticket.quadraticCurveTo(-1.6, 1, -1.6, 0.85);
    ticket.lineTo(-1.6, -0.85);
    ticket.quadraticCurveTo(-1.6, -1, -1.45, -1);
    ticket.closePath();
    return ticket;
  }

  ticket.moveTo(-1.6, -1);
  ticket.lineTo(1.6, -1);
  ticket.lineTo(1.6, -0.72);
  ticket.lineTo(1.42, -0.63);
  ticket.lineTo(1.6, -0.54);
  ticket.lineTo(1.6, -0.17);
  ticket.lineTo(1.42, -0.08);
  ticket.lineTo(1.6, 0.01);
  ticket.lineTo(1.6, 0.48);
  ticket.lineTo(1.42, 0.57);
  ticket.lineTo(1.6, 0.66);
  ticket.lineTo(1.6, 1);
  ticket.lineTo(-1.6, 1);
  ticket.lineTo(-1.6, 0.66);
  ticket.lineTo(-1.42, 0.57);
  ticket.lineTo(-1.6, 0.48);
  ticket.lineTo(-1.6, 0.01);
  ticket.lineTo(-1.42, -0.08);
  ticket.lineTo(-1.6, -0.17);
  ticket.lineTo(-1.6, -0.54);
  ticket.lineTo(-1.42, -0.63);
  ticket.lineTo(-1.6, -0.72);
  ticket.closePath();
  return ticket;
}

export function TicketCardObject({
  color,
  finish,
  imageUrl,
  onQrTextureReady,
  qrImageUrl,
  rotation,
  shape,
}: Props) {
  const [textures, setTextures] = useState<TicketTextures>({
    artwork: null,
    qr: null,
  });
  const geometry = useMemo(
    () =>
      new ExtrudeGeometry(createTicketShape(shape), {
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: 0.025,
        bevelThickness: 0.025,
        depth: 0.12,
        steps: 1,
      }),
    [shape],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    let active = true;
    const loadedTextures: Texture[] = [];

    function loadTexture(
      source: string | null,
      key: keyof TicketTextures,
    ) {
      if (!source) {
        return;
      }

      const texture = new TextureLoader().load(
        source,
        (loadedTexture) => {
          if (!active) {
            loadedTexture.dispose();
            return;
          }

          loadedTexture.colorSpace = SRGBColorSpace;
          loadedTexture.needsUpdate = true;
          setTextures((current) => ({ ...current, [key]: loadedTexture }));
          if (key === "qr") {
            onQrTextureReady(source);
          }
        },
        undefined,
        (error: unknown) => {
          console.error(`[tickets:TicketCardObject] ${key} texture failed`, error);
        },
      );
      loadedTextures.push(texture);
    }

    loadTexture(imageUrl, "artwork");
    loadTexture(qrImageUrl, "qr");

    return () => {
      active = false;
      loadedTextures.forEach((texture) => texture.dispose());
    };
  }, [imageUrl, onQrTextureReady, qrImageUrl]);

  const metalness = finish === "metallic" ? 0.68 : 0.04;
  const roughness = finish === "metallic" ? 0.28 : 0.72;

  return (
    <group rotation={[(rotation.x * Math.PI) / 180, (rotation.y * Math.PI) / 180, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          clearcoat={finish === "metallic" ? 0.9 : 0.18}
          clearcoatRoughness={finish === "metallic" ? 0.2 : 0.7}
          color={color}
          metalness={metalness}
          roughness={roughness}
        />
      </mesh>
      {textures.artwork ? (
        <mesh position={[0, 0, 0.15]}>
          <planeGeometry args={[2.8, 1.7]} />
          <meshBasicMaterial
            map={textures.artwork}
            opacity={0.42}
            depthWrite={false}
            transparent
            toneMapped={false}
          />
        </mesh>
      ) : null}
      {textures.qr ? (
        <>
          <mesh position={[1.02, 0, 0.17]}>
            <planeGeometry args={[0.78, 0.78]} />
            <meshBasicMaterial color="white" toneMapped={false} />
          </mesh>
          <mesh position={[1.02, 0, 0.18]}>
            <planeGeometry args={[0.68, 0.68]} />
            <meshBasicMaterial
              map={textures.qr}
              toneMapped={false}
            />
          </mesh>
        </>
      ) : null}
    </group>
  );
}
