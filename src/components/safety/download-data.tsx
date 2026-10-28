// Download my data (Apple 5.1.1(v) companion to delete): one row, one tap. The file holds only the person's own data
// (repo.exportMyData). The row says "Getting it" while the file is built, then the browser saves it.
"use client";

import { useState } from "react";
import { notify } from "@/components/ui";
import { useRepo } from "@/lib/db/hooks";
import { SheetRow } from "@/components/profile/kit";

export function DownloadData() {
  const repo = useRepo();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (busy) return;
    setBusy(true);
    const r = await repo.exportMyData();
    setBusy(false);
    if (!r.ok) {
      notify.error("Not ready. Try again.", { retry: go });
      return;
    }
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pods-my-data.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    notify("Saved to your downloads");
  }

  return <SheetRow icon="send" label="Download my data" value={busy ? "Getting it" : undefined} onClick={go} />;
}
