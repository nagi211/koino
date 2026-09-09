"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStory } from "@koino/core";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "./modal";

export function StoryComposer({
  open,
  onClose,
  authorId,
}: {
  open: boolean;
  onClose: () => void;
  authorId: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setPreviewUrl(picked ? URL.createObjectURL(picked) : null);
  }

  function handleClose() {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setDone(false);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a photo to share");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const client = createClient();
      const path = `${authorId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await client.storage.from("post-media").upload(path, file);
      if (uploadError) throw uploadError;
      const mediaUrl = client.storage.from("post-media").getPublicUrl(path).data.publicUrl;
      await createStory(client, authorId, mediaUrl);
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <h2 className="mb-4 text-lg font-semibold text-foreground">Add to your story</h2>
      {done ? (
        <p className="text-sm text-muted">Shared — visible to everyone for 24 hours.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm text-muted file:mr-3 file:rounded-xl file:border-0 file:bg-input file:px-3 file:py-1.5 file:text-foreground"
          />
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a stored asset
            <img src={previewUrl} alt="Preview" className="max-h-64 w-full rounded-xl object-cover" />
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-olive-dark px-4 py-3 font-medium text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
          >
            {pending ? "Sharing…" : "Share to story"}
          </button>
        </form>
      )}
    </Modal>
  );
}
