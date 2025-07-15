(async () => {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 100;
  const ctx = canvas.getContext("2d");

  function drawProgress(pct) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ddd";
    ctx.fillRect(10, 40, 300, 20);

    ctx.fillStyle = "#4caf50";
    ctx.fillRect(10, 40, 3 * pct, 20);

    ctx.fillStyle = "#000";
    ctx.font = "16px Arial";
    ctx.fillText(`Used: ${pct.toFixed(1)}%`, 10, 30);
  }

  function getPercentFromGitHub() {
    const el = document.querySelector(
      "#copilot_overages_progress_bar .Progress-item"
    );
    if (!el || !el.style.width) return null;
    const width = parseFloat(el.style.width);
    return isNaN(width) ? null : width;
  }

  let percent = getPercentFromGitHub() || 0;
  drawProgress(percent);

  setInterval(() => {
    const updated = getPercentFromGitHub();
    if (updated != null) {
      percent = updated;
      drawProgress(percent);
    }
  }, 10000); // อัปเดตทุก 10 วินาที

  const stream = canvas.captureStream(1);
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.style.display = "none";
  document.body.appendChild(video);
  await video.play();

  try {
    await video.requestPictureInPicture();
    console.log("✅ Picture-in-Picture started");
  } catch (err) {
    console.error("❌ Failed to enter PiP", err);
  }
})();
