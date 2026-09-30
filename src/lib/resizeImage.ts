// 사진을 올리기 전에 줄이고 JPEG로 바꾼다 (작업 1-10, briefs/1-10.md 4장 [한비]).
//
// 왜 필요한가: 휴대폰 사진은 대개 3~8MB이고 아이폰은 HEIC라서, 그대로 올리면 서버 규칙(5MB·jpg/png)에 막혀
// 413/415가 난다. 화면에서 긴 변 1600px·JPEG 품질 0.8로 줄이면 보통 1MB 안팎이 되어 서버 규칙은 그대로 둘 수 있다.
// 다시 그리면 촬영 위치(GPS) 같은 EXIF도 사라지는데, 개인정보 면에서 오히려 좋은 부수 효과라 그대로 둔다.

/** 긴 변이 이 값보다 크면 비율을 유지해 이 값으로 줄인다 */
export const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;
/** 이미 JPEG이고 크기·용량이 이 안이면 다시 압축하지 않고 그대로 올린다 */
const KEEP_AS_IS_MAX_BYTES = 1024 * 1024;

export const PHOTO_DECODE_MESSAGE =
  "이 사진 형식은 올릴 수 없어요. 다른 사진을 골라 주세요.";

/** 사진을 열지 못했을 때(지원하지 않는 형식·깨진 파일) 던진다. message를 그대로 사용자에게 보여주면 된다. */
export class PhotoDecodeError extends Error {
  constructor() {
    super(PHOTO_DECODE_MESSAGE);
  }
}

/** 긴 변이 max를 넘으면 비율을 유지해 줄인 크기를, 아니면 그대로를 돌려준다 (예: 4000×3000 → 1600×1200, 800×600은 그대로). */
export function fitWithin(
  width: number,
  height: number,
  max: number = MAX_SIDE,
): { width: number; height: number } {
  const longSide = Math.max(width, height);
  if (longSide <= max) return { width, height };
  const scale = max / longSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

/** 파일을 그릴 수 있는 이미지로 연다. 촬영 방향(EXIF)은 보정된 상태로 열린다. */
async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // 옵션·형식을 지원하지 않는 브라우저 → 아래 <img> 방식으로 다시 시도
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => undefined,
    };
  } catch {
    throw new PhotoDecodeError();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new PhotoDecodeError())),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/**
 * 올릴 사진을 준비한다: 긴 변 1600px 이하로 줄이고 JPEG(품질 0.8)로 바꾼다.
 * 이미 JPEG이고 1600px 이하·1MB 이하면 그대로 돌려준다. 결과 파일 이름은 photo.jpg.
 * 열지 못하면 PhotoDecodeError를 던진다.
 */
export async function resizeImage(file: File): Promise<File> {
  const decoded = await decode(file);
  try {
    const { width, height } = fitWithin(decoded.width, decoded.height);
    const unchanged = width === decoded.width && height === decoded.height;
    if (
      file.type === "image/jpeg" &&
      unchanged &&
      file.size <= KEEP_AS_IS_MAX_BYTES
    ) {
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PhotoDecodeError();
    // PNG처럼 투명한 부분이 있으면 JPEG로 바꿀 때 검게 되므로 흰 바탕을 먼저 깐다
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(decoded.source, 0, 0, width, height);
    const blob = await toJpegBlob(canvas);
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } finally {
    decoded.release();
  }
}
