// The live camera inside your seat (Check it's you). It runs only after "Start" (getUserMedia; Permissions-Policy
// camera=self). Nothing is captured or kept: the stream is shown, then stopped (B #4: Pods stores no images).
"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/cn";

export interface CameraHandle {
  /** Grab the current frame as a small JPEG data URL (or null). Not used by first run. */
  grab: () => string | null;
}

export const CameraView = forwardRef<CameraHandle, { facing: "user" | "environment"; on: boolean; onError: () => void; className?: string; mirror?: boolean }>(
  function CameraView({ facing, on, onError, className, mirror }, ref) {
    const video = useRef<HTMLVideoElement>(null);
    const errRef = useRef(onError);
    useEffect(() => {
      errRef.current = onError;
    });
    useImperativeHandle(ref, () => ({
      grab: () => {
        const v = video.current;
        if (!v || !v.videoWidth) return null;
        const c = document.createElement("canvas");
        const s = 480 / Math.min(v.videoWidth, v.videoHeight);
        c.width = Math.round(v.videoWidth * s);
        c.height = Math.round(v.videoHeight * s);
        c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", 0.85);
      },
    }));
    useEffect(() => {
      if (!on) return;
      let stream: MediaStream | null = null;
      let cancelled = false;
      (async () => {
        try {
          if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
          if (cancelled) return stream.getTracks().forEach((t) => t.stop());
          if (video.current) {
            video.current.srcObject = stream;
            await video.current.play().catch(() => {});
          }
        } catch {
          if (!cancelled) errRef.current();
        }
      })();
      return () => {
        cancelled = true;
        stream?.getTracks().forEach((t) => t.stop());
      };
    }, [on, facing]);
    if (!on) return null;
    return <video ref={video} playsInline muted className={cn("absolute inset-0 size-full object-cover", mirror && "-scale-x-100", className)} />;
  },
);
