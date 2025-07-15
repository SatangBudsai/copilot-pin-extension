// Simple fallback pin window
let pinnedDiv = null;
let updateInterval = null;

function createSimplePinWindow() {
  // ลบ widget เก่าถ้ามี
  if (pinnedDiv) {
    pinnedDiv.remove();
  }

  // สร้าง pin widget ใหม่
  pinnedDiv = document.createElement("div");
  pinnedDiv.id = "copilot-pin-widget";
  pinnedDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 320px;
    height: 140px;
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    z-index: 2147483647;
    overflow: hidden;
    user-select: none;
    cursor: move;
  `;

  // Header
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f6f8fa;
    border-bottom: 1px solid #e1e4e8;
    font-size: 12px;
    font-weight: 600;
    color: #24292f;
  `;

  const title = document.createElement("div");
  title.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
  `;
  title.innerHTML = `
    <div style="width: 6px; height: 6px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite;"></div>
    <span>Copilot Usage</span>
  `;

  const controls = document.createElement("div");
  controls.style.cssText = `display: flex; gap: 4px;`;

  const refreshBtn = document.createElement("button");
  refreshBtn.innerHTML = "🔄";
  refreshBtn.title = "Refresh";
  refreshBtn.style.cssText = `
    width: 24px; height: 24px; border: none; border-radius: 3px;
    background: transparent; cursor: pointer; display: flex;
    align-items: center; justify-content: center; font-size: 12px;
    transition: background-color 0.15s ease;
  `;
  refreshBtn.onmouseover = () => (refreshBtn.style.background = "#e1e4e8");
  refreshBtn.onmouseout = () => (refreshBtn.style.background = "transparent");

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "✕";
  closeBtn.title = "Close";
  closeBtn.style.cssText = `
    width: 24px; height: 24px; border: none; border-radius: 3px;
    background: transparent; cursor: pointer; display: flex;
    align-items: center; justify-content: center; font-size: 12px;
    transition: all 0.15s ease;
  `;
  closeBtn.onmouseover = () => {
    closeBtn.style.background = "#ff4757";
    closeBtn.style.color = "white";
  };
  closeBtn.onmouseout = () => {
    closeBtn.style.background = "transparent";
    closeBtn.style.color = "inherit";
  };

  controls.appendChild(refreshBtn);
  controls.appendChild(closeBtn);
  header.appendChild(title);
  header.appendChild(controls);

  // Content
  const content = document.createElement("div");
  content.style.cssText = `padding: 16px 12px 12px;`;

  const usageText = document.createElement("div");
  usageText.id = "usage-text";
  usageText.textContent = "--.--%";
  usageText.style.cssText = `
    font-size: 20px; font-weight: 700; color: #24292f; margin-bottom: 8px;
  `;

  const progressContainer = document.createElement("div");
  progressContainer.style.cssText = `
    width: 100%; height: 8px; background: #e1e4e8;
    border-radius: 4px; overflow: hidden; margin-bottom: 8px;
  `;

  const progressBar = document.createElement("div");
  progressBar.id = "progress-bar";
  progressBar.style.cssText = `
    height: 100%; background: #22c55e; border-radius: 4px;
    transition: width 0.3s ease; width: 0%;
  `;

  const status = document.createElement("div");
  status.id = "status";
  status.textContent = "Connecting...";
  status.style.cssText = `
    font-size: 11px; color: #656d76; text-align: center;
  `;

  progressContainer.appendChild(progressBar);
  content.appendChild(usageText);
  content.appendChild(progressContainer);
  content.appendChild(status);

  pinnedDiv.appendChild(header);
  pinnedDiv.appendChild(content);
  document.body.appendChild(pinnedDiv);

  // Add CSS animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Event handlers
  refreshBtn.onclick = async () => {
    refreshBtn.innerHTML = "⏳";
    refreshBtn.disabled = true;
    await updatePinData();
    setTimeout(() => {
      refreshBtn.innerHTML = "🔄";
      refreshBtn.disabled = false;
    }, 1000);
  };

  closeBtn.onclick = () => {
    pinnedDiv.remove();
    if (updateInterval) clearInterval(updateInterval);
  };

  // Drag functionality
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  pinnedDiv.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    dragOffset.x = e.clientX - pinnedDiv.offsetLeft;
    dragOffset.y = e.clientY - pinnedDiv.offsetTop;
    pinnedDiv.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      pinnedDiv.style.left = e.clientX - dragOffset.x + "px";
      pinnedDiv.style.top = e.clientY - dragOffset.y + "px";
      pinnedDiv.style.right = "auto";
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    pinnedDiv.style.cursor = "move";
  });

  // Start updating data
  updatePinData();
  updateInterval = setInterval(updatePinData, 2000);

  console.log("✅ Simple pin widget created");
}

async function updatePinData() {
  try {
    const result = await chrome.storage.local.get(["copilotData"]);
    if (result.copilotData) {
      const data = result.copilotData;
      document.getElementById(
        "usage-text"
      ).textContent = `${data.percent.toFixed(1)}%`;
      document.getElementById("progress-bar").style.width = `${Math.min(
        data.percent,
        100
      )}%`;
      document.getElementById("status").textContent = `Updated: ${new Date(
        data.timestamp
      ).toLocaleTimeString()}`;
      document.getElementById("status").style.color = "#656d76";
    } else {
      document.getElementById("status").textContent =
        "Waiting for GitHub data...";
      document.getElementById("status").style.color = "#fb8500";
    }
  } catch (error) {
    console.error("Error updating pin data:", error);
    document.getElementById("status").textContent = "Error loading data";
    document.getElementById("status").style.color = "#d73a49";
  }
}

// Export function for use
window.createSimplePinWindow = createSimplePinWindow;
