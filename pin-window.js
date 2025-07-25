let currentData = { percent: 0, title: "GitHub", timestamp: Date.now() };
let updateInterval = null;
let windowResizeObserver = null;

document.addEventListener("DOMContentLoaded", function () {
  const usageText = document.getElementById("usageText");
  const progressBar = document.getElementById("progressBar");
  const status = document.getElementById("status");
  const refreshBtn = document.getElementById("refreshBtn");
  // ลบการอ้างอิง closeBtn

  // ฟังก์ชันจัดการ window resize สำหรับขนาดเล็กมากๆ
  function handleWindowResize() {
    // ตรวจสอบขนาดหน้าต่างปัจจุบัน
    const width = window.innerWidth;
    const height = window.innerHeight;

    console.log(`📏 Window resized to: ${width}x${height}`);

    // ปรับ font size ตามขนาดเล็กมากๆ
    if (width < 180) {
      document.body.style.fontSize = "0.7em";
    } else if (width < 200) {
      document.body.style.fontSize = "0.8em";
    } else {
      document.body.style.fontSize = "0.9em";
    }

    // Force repaint เพื่อให้ CSS ทำงานใหม่
    document.body.style.display = "none";
    document.body.offsetHeight; // trigger reflow
    document.body.style.display = "flex";
  }

  // ตั้งค่า ResizeObserver สำหรับตรวจจับการเปลี่ยนขนาด
  if (window.ResizeObserver) {
    windowResizeObserver = new ResizeObserver((entries) => {
      handleWindowResize();
    });

    windowResizeObserver.observe(document.body);
  } else {
    // Fallback สำหรับบราวเซอร์เก่า
    window.addEventListener("resize", handleWindowResize);
  }

  // ฟังก์ชันอัปเดตการแสดงผล
  function updateDisplay(data) {
    if (data && typeof data.percent === "number") {
      usageText.textContent = `${data.percent.toFixed(1)}%`;
      progressBar.style.width = `${Math.min(data.percent, 100)}%`;
      status.textContent = `Updated: ${new Date(
        data.timestamp
      ).toLocaleTimeString()}`;
      status.className = "status";

      console.log("✅ Display updated:", data.percent);
    } else {
      usageText.textContent = "--.--%";
      progressBar.style.width = "0%";
      status.textContent = "No data available";
      status.className = "status error";
    }
  }

  // ฟังก์ชันดึงข้อมูลจาก storage
  async function fetchData() {
    try {
      console.log("🔍 Fetching data from storage...");

      // ตรวจสอบว่า chrome API ยังใช้ได้หรือไม่
      if (!chrome || !chrome.storage || !chrome.storage.local) {
        console.warn("⚠️ Chrome extension context invalidated");
        status.textContent = "Extension context lost";
        status.className = "status error";
        return false;
      }

      const result = await chrome.storage.local.get(["copilotData"]);

      if (result.copilotData) {
        console.log("📊 Data found:", result.copilotData);
        currentData = result.copilotData;
        updateDisplay(currentData);
        return true;
      } else {
        console.log("⚠️ No data found in storage");
        status.textContent = "Waiting for GitHub data...";
        status.className = "status connecting";
        return false;
      }
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      status.textContent = "Error loading data";
      status.className = "status error";
      return false;
    }
  }

  // Event Listeners
  refreshBtn.addEventListener("click", async () => {
    refreshBtn.textContent = "⏳";
    refreshBtn.disabled = true;

    try {
      // ตรวจสอบ chrome API ก่อน
      if (!chrome || !chrome.tabs) {
        throw new Error("Chrome extension context invalidated");
      }

      // หา GitHub tabs ทั้งหมด
      const tabs = await chrome.tabs.query({ url: "https://github.com/*" });
      console.log("🔍 Found GitHub tabs:", tabs.length);

      if (tabs.length > 0) {
        // ส่ง message ไปยัง tab แรกที่เจอ
        await chrome.tabs.sendMessage(tabs[0].id, { action: "forceUpdate" });
        console.log("📤 Force update sent to tab:", tabs[0].id);
      }

      // รอสักครู่แล้วดึงข้อมูลใหม่
      setTimeout(async () => {
        await fetchData();
        refreshBtn.textContent = "🔄";
        refreshBtn.disabled = false;
      }, 1000);
    } catch (error) {
      console.error("Error refreshing:", error);
      // ลองดึงข้อมูลใหม่อยู่ดี
      await fetchData();
      refreshBtn.textContent = "🔄";
      refreshBtn.disabled = false;
    }
  });

  // ลบ event listener สำหรับ closeBtn

  // ทำให้ window ลากได้ (แบบง่าย)
  let isDragging = false;
  let isResizing = false;
  let startX, startY, initialLeft, initialTop, initialWidth, initialHeight;

  const resizeHandle = document.getElementById("resizeHandle");

  // จัดการการลากเพื่อย้าย window
  document.addEventListener("mousedown", (e) => {
    // ไม่ให้ลากถ้ากดที่ปุ่มหรือ resize handle
    if (e.target.tagName === "BUTTON" || e.target.id === "resizeHandle") return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    // เก็บตำแหน่งเริ่มต้นของ window
    chrome.windows.getCurrent((currentWindow) => {
      initialLeft = currentWindow.left;
      initialTop = currentWindow.top;
    });

    document.body.style.cursor = "move";
    e.preventDefault();
  });

  // จัดการการลากเพื่อปรับขนาด window
  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;

    // เก็บขนาดเริ่มต้นของ window
    chrome.windows.getCurrent((currentWindow) => {
      initialWidth = currentWindow.width;
      initialHeight = currentWindow.height;
    });

    e.stopPropagation();
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging && !isResizing) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // อัปเดตตำแหน่ง window
      chrome.windows.getCurrent((currentWindow) => {
        chrome.windows.update(currentWindow.id, {
          left: initialLeft + deltaX,
          top: initialTop + deltaY,
        });
      });
    } else if (isResizing) {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // คำนวณขนาดใหม่ (ขั้นต่ำ 160x60 สำหรับขนาดเล็กมากๆ)
      const newWidth = Math.max(160, initialWidth + deltaX);
      const newHeight = Math.max(60, initialHeight + deltaY);

      // อัปเดตขนาด window
      chrome.windows.getCurrent((currentWindow) => {
        chrome.windows.update(currentWindow.id, {
          width: newWidth,
          height: newHeight,
        });
      });
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    isResizing = false;
    document.body.style.cursor = "default";
  });

  // เริ่มต้น
  fetchData();

  // อัปเดตข้อมูลทุก 2 วินาที (ตรวจสอบ extension context)
  updateInterval = setInterval(async () => {
    try {
      const success = await fetchData();
      if (!success) {
        // หยุดการทำงานถ้า extension context invalidated
        clearInterval(updateInterval);
        console.log(
          "🛑 Stopped update interval due to extension context invalidation"
        );
      }
    } catch (error) {
      console.error("Error in update interval:", error);
      if (error.message.includes("Extension context invalidated")) {
        clearInterval(updateInterval);
        console.log(
          "🛑 Stopped update interval due to extension context invalidation"
        );
      }
    }
  }, 2000);

  // ทำความสะอาดเมื่อปิด window
  window.addEventListener("beforeunload", () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }

    if (windowResizeObserver) {
      windowResizeObserver.disconnect();
    }
  });

  // เรียกใช้การปรับขนาดครั้งแรก
  handleWindowResize();

  console.log("🚀 Pin window initialized");
});
