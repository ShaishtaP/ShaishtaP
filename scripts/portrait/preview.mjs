// Rasterise an SVG (generate it with STATIC=1 first) to PNG for a quick look.
//   node preview.mjs <in.svg> <out.png>
import sharp from "sharp";
const [inp, out] = process.argv.slice(2);
await sharp(inp, { density: 150 }).flatten({ background: "#ffffff" }).png().toFile(out);
console.log(out);
