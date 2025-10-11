// scripts/upload-images.js
// يحفظ 20 صورة داخل مجلدات مصنفة تحت public/images
// يحتاج node-fetch v3 (ESM). شغّل:  npm i node-fetch@3

import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const images = [
  // === cabins ===
  { url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab", out: "cabins/cabin01.jpg" },
  { url: "https://images.unsplash.com/photo-1529336953121-ad5a0d43d0f2", out: "cabins/cabin02.jpg" },
  { url: "https://images.unsplash.com/photo-1501183638710-841dd1904471", out: "cabins/cabin03.jpg" },
  { url: "https://images.unsplash.com/photo-1497875192079-8c04d1a3be1c", out: "cabins/cabin04.jpg" },
  { url: "https://images.unsplash.com/photo-1491553895911-0055eca6402d", out: "cabins/cabin05.jpg" },

  // === maintenance (field / inspection) ===
  { url: "https://images.pexels.com/photos/3862613/pexels-photo-3862613.jpeg", out: "maintenance/maint01.jpg" },
  { url: "https://images.pexels.com/photos/6494431/pexels-photo-6494431.jpeg", out: "maintenance/maint02.jpg" },
  { url: "https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg", out: "maintenance/maint03.jpg" },
  { url: "https://images.pexels.com/photos/8961064/pexels-photo-8961064.jpeg", out: "maintenance/maint04.jpg" },
  { url: "https://images.pexels.com/photos/4314201/pexels-photo-4314201.jpeg", out: "maintenance/maint05.jpg" },

  // === machine-room (equipment / motors / controllers) ===
  { url: "https://images.unsplash.com/photo-1518773553398-650c184e0bb3", out: "machine-room/machine01.jpg" },
  { url: "https://images.unsplash.com/photo-1518770660439-4636190af475", out: "machine-room/machine02.jpg" },
  { url: "https://images.unsplash.com/photo-1518770660439-4636190af475", out: "machine-room/machine03.jpg" },
  { url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c", out: "machine-room/machine04.jpg" },
  { url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085", out: "machine-room/machine05.jpg" },

  // === glass / panoramic elevators ===
  { url: "https://images.unsplash.com/photo-1465479423260-c4afc24172c6", out: "glass-elevators/glass01.jpg" },
  { url: "https://images.unsplash.com/photo-1508050919630-b135583b29ab", out: "glass-elevators/glass02.jpg" },
  { url: "https://images.unsplash.com/photo-1491555103944-7c647fd857e6", out: "glass-elevators/glass03.jpg" },
  { url: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa", out: "glass-elevators/glass04.jpg" },
  { url: "https://images.unsplash.com/photo-1512295767273-ac109ac3acfa", out: "glass-elevators/glass05.jpg" }
];

const base = "public/images";

async function ensureDir(fileRelativePath) {
  const dir = path.dirname(path.join(base, fileRelativePath));
  fs.mkdirSync(dir, { recursive: true });
}

async function downloadOne({ url, out }) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const ab = await res.arrayBuffer();
  await ensureDir(out);
  fs.writeFileSync(path.join(base, out), Buffer.from(ab));
  console.log("✅ saved:", out);
}

async function run() {
  console.log("Starting download of", images.length, "images…");
  for (const img of images) {
    try { await downloadOne(img); }
    catch (e) { console.error("❌ failed:", img.out, e.message); }
  }
  console.log("Done.");
}
run();