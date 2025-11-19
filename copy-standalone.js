const fs = require("fs");
const path = require("path");

// Script để copy static files và public folder vào standalone
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy static files
const staticSrc = path.join(__dirname, ".next", "static");
const staticDest = path.join(
  __dirname,
  ".next",
  "standalone",
  ".next",
  "static"
);

if (fs.existsSync(staticSrc)) {
  console.log("Copying static files...");
  copyRecursiveSync(staticSrc, staticDest);
}

// Copy public folder
const publicSrc = path.join(__dirname, "public");
const publicDest = path.join(__dirname, ".next", "standalone", "public");

if (fs.existsSync(publicSrc)) {
  console.log("Copying public folder...");
  copyRecursiveSync(publicSrc, publicDest);
}

console.log("Build files copied successfully!");
