import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourcePath = path.join(projectRoot, "Beauty-Sphia-app-logo.png")
const backgroundPath = path.join(projectRoot, "android", "app", "src", "main", "res", "values", "ic_launcher_background.xml")
const source = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { data, info } = source

if (info.channels !== 4 || info.width !== 886 || info.height !== 896) {
	throw new Error(`Unexpected launcher logo format: ${info.width}x${info.height}, ${info.channels} channels.`)
}

const readRgb = (x, y) => {
	const offset = (y * info.width + x) * info.channels
	return [data[offset], data[offset + 1], data[offset + 2]]
}
const matte = readRgb(0, 0)
const corners = [readRgb(info.width - 1, 0), readRgb(0, info.height - 1), readRgb(info.width - 1, info.height - 1)]
if (!corners.every((corner) => corner.every((channel, index) => channel === matte[index]))) {
	throw new Error("Logo edge matte is not uniform; inspect the source before regenerating launcher layers.")
}

const matteHex = `#${matte.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
const backgroundXml = await readFile(backgroundPath, "utf8")
if (!backgroundXml.toLowerCase().includes(matteHex)) {
	throw new Error(`The icon background ${backgroundPath} must match the logo matte ${matteHex}.`)
}

// Exact matte pixels become transparent; Android supplies the same color in
// its adaptive background layer, keeping the original artwork and palette.
for (let offset = 0; offset < data.length; offset += info.channels) {
	if (data[offset] === matte[0] && data[offset + 1] === matte[1] && data[offset + 2] === matte[2]) {
		data[offset + 3] = 0
	}
}

const artworkDp = 64
const densities = [
	{ name: "mdpi", factor: 1 },
	{ name: "hdpi", factor: 1.5 },
	{ name: "xhdpi", factor: 2 },
	{ name: "xxhdpi", factor: 3 },
	{ name: "xxxhdpi", factor: 4 },
]

for (const density of densities) {
	const canvasPx = Math.round(108 * density.factor)
	const artworkPx = Math.round(artworkDp * density.factor)
	const insetPx = Math.floor((canvasPx - artworkPx) / 2)
	const foreground = await sharp(data, {
		raw: { width: info.width, height: info.height, channels: info.channels },
	})
		.resize(artworkPx, artworkPx, {
			fit: "contain",
			kernel: "lanczos3",
			background: { r: matte[0], g: matte[1], b: matte[2], alpha: 0 },
		})
		.png()
		.toBuffer()
	const outputPath = path.join(
		projectRoot, "android", "app", "src", "main", "res", `mipmap-${density.name}`, "ic_launcher_foreground.png",
	)
	await sharp({
		create: {
			width: canvasPx,
			height: canvasPx,
			channels: 4,
			background: { r: matte[0], g: matte[1], b: matte[2], alpha: 0 },
		},
	})
		.composite([{ input: foreground, left: insetPx, top: insetPx }])
		.png()
		.toFile(outputPath)
	console.log(`${path.relative(projectRoot, outputPath)}: ${artworkDp}dp artwork centered on a 108dp adaptive canvas.`)
}
