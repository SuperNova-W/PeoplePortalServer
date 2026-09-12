import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parent folder containing all project folders
const parentDir = path.resolve(
  __dirname,
  "../../public/images/projects/spring-25",
);

const subdirs = fs
  .readdirSync(parentDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(parentDir, d.name));

for (const dir of subdirs) {
  const backupDir = path.join(dir, "_originals");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f));

  for (const file of files) {
    const input = path.join(dir, file);
    const output = path.join(dir, file.replace(/\.(jpe?g|png)$/i, ".webp"));

    try {
      await sharp(input)
        .resize(400, 400, { fit: "inside" })
        .webp({ quality: 80 })
        .toFile(output);

      // Move original to _originals (Windows-safe)
      fs.renameSync(input, path.join(backupDir, file));

      console.log(
        `✔ [${path.basename(dir)}] ${file} → ${path.basename(output)} (original moved)`,
      );
    } catch (err) {
      console.error(`✖ Failed on ${file} in ${dir}:`, err);
    }
  }
}

console.log("✅ All done!");
