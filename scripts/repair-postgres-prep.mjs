import fs from "node:fs";

const path = "scripts/prepare-postgres-migration.mjs";
const source = fs.readFileSync(path, "utf8");
fs.writeFileSync(path, source.replaceAll("\\\\`", "\\`"));
