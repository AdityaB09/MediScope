import React, { useState } from "react";
import { batchUploadCsv } from "../api";

export default function BatchPanel() {
  const [csv, setCsv] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setCsv(text);
  }

  async function upload() {
    setMsg("Uploading…");
    try {
      const res = await batchUploadCsv(csv);
      setMsg(typeof res === "string" ? res : JSON.stringify(res));
    } catch (e: any) {
      setMsg(e?.message || "upload failed");
    }
  }

  return (
    <div className="p-3 rounded-xl bg-[#111827]">
      <div className="font-semibold mb-2">Batch Scoring (CSV)</div>
      <input type="file" accept=".csv,text/csv" onChange={onFile} />
      <button
        onClick={upload}
        className="ml-2 btn"
        style={{ background: "var(--accent)", borderRadius: 10, padding: "6px 10px", fontWeight: 600 }}
      >
        Upload
      </button>
      {msg && <div className="mt-2 text-sm opacity-70 break-all">{msg}</div>}
    </div>
  );
}
