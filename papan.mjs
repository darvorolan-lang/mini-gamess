import { getStore } from "@netlify/blobs";

export const config = { path: "/api/papan" };

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" }
});

// papan peringkat: hanya pemain sungguhan yang pernah menyimpan skor
export default async () => {
  const store = getStore("arcana");
  const { blobs } = await store.list({ prefix: "pemain/" });
  const pemain = [];
  for (const b of blobs) {
    const d = await store.get(b.key, { type: "json" });
    if (d) pemain.push({ id: b.key.slice("pemain/".length), nama: d.nama, power: d.power, lv: d.lv });
  }
  pemain.sort((a, b) => b.power - a.power);
  const m = await store.get("meta/musim", { type: "json" });
  return json({ musim: m ? Number(m.n) || 0 : 0, pemain: pemain.slice(0, 100) });
};
