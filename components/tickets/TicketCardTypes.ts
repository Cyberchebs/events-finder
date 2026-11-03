export type TicketCardShape = "solid" | "torn";
export type TicketCardFinish = "normal" | "metallic";
export type TicketCardTextColor = "black" | "white";

export type TicketCardSceneProps = {
  color: string;
  finish: TicketCardFinish;
  imageUrl: string | null;
  onCanvasCreated: (canvas: HTMLCanvasElement) => void;
  onCanvasError: () => void;
  onQrTextureReady: (imageUrl: string) => void;
  qrImageUrl: string | null;
  rotation: {
    x: number;
    y: number;
  };
  shape: TicketCardShape;
};
