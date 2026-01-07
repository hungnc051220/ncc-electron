import fs from "fs";
import path from "path";

export async function GET() {
  const dir = path.join(process.cwd(), "public/background");
  const files = fs.readdirSync(dir);

  return Response.json(files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f)));
}
