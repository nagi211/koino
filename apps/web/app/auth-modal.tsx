"use client";

import { AuthForm } from "./auth-form";
import { Modal } from "./modal";

export function AuthModal({
  open,
  onClose,
  initialMode,
}: {
  open: boolean;
  onClose: () => void;
  initialMode: "sign-in" | "sign-up";
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="mb-4 text-lg font-semibold text-foreground">
        {initialMode === "sign-up" ? "Join Koino" : "Welcome back"}
      </h2>
      <AuthForm initialMode={initialMode} onSuccess={onClose} />
    </Modal>
  );
}
