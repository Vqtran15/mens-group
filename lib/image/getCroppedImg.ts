export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OUTPUT_SIZE = 480;

// react-easy-crop only reports *where* to crop (in source-image pixels) -
// actually producing the cropped image is left to the caller. Output is
// always re-sampled to a fixed OUTPUT_SIZE square regardless of the crop's
// source resolution, since an avatar is never displayed larger than a few
// hundred px anywhere in the app.
export async function getCroppedImg(imageSrc: string, crop: PixelCrop): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("Canvas encoding failed");
  return blob;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
