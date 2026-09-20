/** Copy original pages intact, or fit rotated page content onto a new sheet. */
export async function appendPDFPage(output, source, index, target, api) {
  if (!target) {
    const [page] = await output.copyPages(source, [index]);
    output.addPage(page);
    return;
  }
  const page = source.getPage(index);
  const crop = page.getCropBox();
  const embedded = await output.embedPage(page, {
    left: crop.x, bottom: crop.y, right: crop.x + crop.width, top: crop.y + crop.height,
  });
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  const sideways = rotation === 90 || rotation === 270;
  const visualWidth = sideways ? crop.height : crop.width;
  const visualHeight = sideways ? crop.width : crop.height;
  const scale = Math.min(target[0] / visualWidth, target[1] / visualHeight);
  const width = embedded.width * scale, height = embedded.height * scale;
  let x = (target[0] - visualWidth * scale) / 2;
  let y = (target[1] - visualHeight * scale) / 2;
  if (rotation === 90) y += width;
  if (rotation === 180) { x += width; y += height; }
  if (rotation === 270) x += height;
  output.addPage(target).drawPage(embedded, { x, y, width, height, rotate: api.degrees(-rotation) });
}
