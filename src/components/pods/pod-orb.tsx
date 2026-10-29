// <PodOrb>: the pod's mark for lists, headers and heroes. Drawn by the one pod primitive, <PodSphere> (brand): a glossy
// sphere in the pod's hue with one white bead per person (founder 2026-10-29: "I would prefer the pods be 3D glossy").
// Kept as a name so every screen keeps its import; props are PodSphere's.
import { PodSphere, type PodSphereProps } from "@/components/brand/pod-sphere";

export function PodOrb(props: PodSphereProps) {
  return <PodSphere {...props} />;
}
