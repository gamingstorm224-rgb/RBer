// yeah

let ffmpeg = null;

  Initializes and loads FFmpeg.wasm engine.
 
export async function initFFmpeg(onProgress = () => {}) {
  if (ffmpeg) return ffmpeg;

  onProgress("Loading FFmpeg engine...");

  // Load FFmpeg from Unpkg CDN
  const { createFFmpeg } = window.FFmpeg;
  ffmpeg = createFFmpeg({
    log: true,
    corePath: "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js"
  });

  await ffmpeg.load();
  onProgress("FFmpeg loaded and ready!");
  return ffmpeg;
}

 * @param {File} file - File object from an HTML file input
 * @param {Object} options - Configuration parameters
 * @param {number} options.fps - Frames per second (default: 15)
 * @param {number} options.width - Output pixel width (default: 480)
 * @param {Function} onProgress - Callback for user feedback text
 * @returns {Promise<string>} Blob URL of generated GIF
 */
export async function convertMp4ToGif(file, options = {}, onProgress = () => {}) {
  const { fps = 15, width = 480 } = options;

  if (!ffmpeg || !ffmpeg.isLoaded()) {
    await initFFmpeg(onProgress);
  }

  onProgress("Reading input video file...");
  const fileData = new Uint8Array(await file.arrayBuffer());
  ffmpeg.FS("writeFile", "input.mp4", fileData);

  onProgress("Generating high-quality palette...");
  // Step 1: build palette 
  await ffmpeg.run(
    "-i", "input.mp4",
    "-vf", `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
    "-y", "palette.png"
  );

  onProgress("Rendering GIF frames...");
  await ffmpeg.run(
    "-i", "input.mp4",
    "-i", "palette.png",
    "-filter_complex", `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
    "-y", "output.gif"
  );

  onProgress("Finalizing GIF binary...");
  const gifData = ffmpeg.FS("readFile", "output.gif");

  // cleanup 
  ffmpeg.FS("unlink", "input.mp4");
  ffmpeg.FS("unlink", "palette.png");
  ffmpeg.FS("unlink", "output.gif");

  onProgress("Done!");

  // return
  const blob = new Blob([gifData.buffer], { type: "image/gif" });
  return URL.createObjectURL(blob);
}
