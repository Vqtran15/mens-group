"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area } from "react-easy-crop";
import { motion } from "framer-motion";
import { CircleNotch, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { getCroppedImg } from "@/lib/image/getCroppedImg";

export function AvatarCropModal({
  imageSrc,
  saving,
  onCancel,
  onSave,
}: {
  imageSrc: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels) return;
    const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
    onSave(blob);
  }

  // Portaled to document.body for the same reason as ImageLightbox - a
  // fixed-position overlay rendered inline would get trapped inside the
  // Settings page's own animated containing block instead of covering
  // the viewport.
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
    >
      <div className="flex items-center justify-between p-4">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          disabled={saving}
          className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 disabled:opacity-50"
        >
          <X size={20} />
        </button>
        <p className="text-sm font-medium text-white/80">Drag to move · Pinch or slide to zoom</p>
      </div>

      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="space-y-4 p-4">
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="w-full accent-white"
        />
        <Button type="button" onClick={handleSave} disabled={saving || !croppedAreaPixels} className="w-full">
          {saving ? (
            <>
              <CircleNotch size={18} className="animate-spin" /> Saving...
            </>
          ) : (
            "Save photo"
          )}
        </Button>
      </div>
    </motion.div>,
    document.body
  );
}
