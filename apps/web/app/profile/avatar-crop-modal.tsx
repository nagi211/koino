"use client";

import { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Modal } from "../modal";
import { getCroppedImageBlob } from "./crop-image";

export function AvatarCropModal({
  imageSrc,
  onCancel,
  onSave,
}: {
  imageSrc: string;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // react-easy-crop's onCropComplete isn't guaranteed to have fired by the
  // time someone taps "Use photo" (it depends on the image finishing its own
  // load/layout pass) — gating the button on that with `disabled` meant a fast
  // first tap was silently swallowed (disabled buttons don't fire onClick at
  // all), and only a second tap after it quietly became enabled would work.
  // A ref (not state) plus waiting inside handleSave keeps the button always
  // tappable and gives real "Saving…" feedback instead of a dead first tap.
  const croppedAreaRef = useRef<Area | null>(null);
  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    croppedAreaRef.current = areaPixels;
  }, []);

  function waitForCropArea(): Promise<Area> {
    if (croppedAreaRef.current) return Promise.resolve(croppedAreaRef.current);
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (croppedAreaRef.current) {
          resolve(croppedAreaRef.current);
        } else if (Date.now() - start > 5000) {
          reject(new Error("Photo is still loading — try again in a moment"));
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const area = await waitForCropArea();
      const blob = await getCroppedImageBlob(imageSrc, area, rotation);
      onSave(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onCancel} widthClassName="max-w-md">
      <h2 className="mb-4 text-lg font-semibold text-foreground">Adjust photo</h2>

      <div className="relative h-72 w-full overflow-hidden rounded-xl bg-black">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={handleCropComplete}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex items-center gap-3 text-sm">
          <span className="w-14 text-muted">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-olive-dark"
          />
        </label>
        <label className="flex items-center gap-3 text-sm">
          <span className="w-14 text-muted">Rotate</span>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="flex-1 accent-olive-dark"
          />
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-card-border px-4 py-2 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex-1 rounded-xl bg-olive-dark px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Use photo"}
        </button>
      </div>
    </Modal>
  );
}