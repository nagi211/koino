export type PixelCrop = { x: number; y: number; width: number; height: number };

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.src = url;
  });
}

function getRadianAngle(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function rotatedSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

// pixelCrop is in the SOURCE image's own pixel space (react-easy-crop doesn't
// downscale it), so a crop from a real phone camera photo (commonly
// 4000x3000+) exported at that resolution produced multi-ten-MB PNGs —
// comfortably over the avatars bucket's size limit, which is what "Saving…
// then silently reverts to Use photo" on Android turned out to be (the
// upload's actual 400 was invisible until the error-propagation fix
// alongside this one). Avatars only ever render at a few hundred px at
// most, so downscaling the crop output to MAX_AVATAR_OUTPUT_SIZE fixes the
// size problem at the source regardless of how large the original photo was.
const MAX_AVATAR_OUTPUT_SIZE = 512;

/** Renders the rotated + cropped region to a canvas and returns it as a PNG blob, downscaled to at most MAX_AVATAR_OUTPUT_SIZE per side. */
export async function getCroppedImageBlob(imageSrc: string, pixelCrop: PixelCrop, rotation = 0): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const { width: boxWidth, height: boxHeight } = rotatedSize(image.width, image.height, rotation);
  canvas.width = boxWidth;
  canvas.height = boxHeight;

  ctx.translate(boxWidth / 2, boxHeight / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(data, 0, 0);

  const scale = Math.min(1, MAX_AVATAR_OUTPUT_SIZE / Math.max(pixelCrop.width, pixelCrop.height));
  let outputCanvas = canvas;
  if (scale < 1) {
    outputCanvas = document.createElement("canvas");
    outputCanvas.width = Math.round(pixelCrop.width * scale);
    outputCanvas.height = Math.round(pixelCrop.height * scale);
    const outputCtx = outputCanvas.getContext("2d");
    if (!outputCtx) throw new Error("Could not get canvas context");
    outputCtx.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height);
  }

  return new Promise((resolve, reject) => {
    outputCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export cropped image"));
    }, "image/png");
  });
}