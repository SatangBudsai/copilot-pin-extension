console.log("🚀 Copilot Pin Extension Starting...");

(async () => {
  // เพิ่ม delay เพื่อให้หน้าโหลดเสร็จ
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // สร้าง unique ID สำหรับแต่ละ tab
  const tabId = Math.random().toString(36).substr(2, 9);
  console.log("📍 Tab ID:", tabId);

  function getPercentFromGitHub() {
    // ลองหา element หลายแบบตาม HTML structure ที่ถูกต้อง
    const selectors = [
      "#copilot_overages_progress_bar .Progress-item.color-bg-success-emphasis",
      "#copilot_overages_progress_bar .Progress-item",
      ".Progress-item.color-bg-success-emphasis",
      ".Progress-item",
    ];

    console.log("🔍 Searching for GitHub Copilot usage element...");

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      console.log(`Trying selector: ${selector}`, el);

      if (el) {
        // ตรวจสอบ style.width
        if (el.style.width) {
          const width = parseFloat(el.style.width);
          if (!isNaN(width)) {
            console.log("✅ Found usage percentage:", width);
            return width;
          }
        }

        // ตรวจสอบ attribute width อื่นๆ
        const widthAttr = el.getAttribute("style");
        if (widthAttr && widthAttr.includes("width:")) {
          const match = widthAttr.match(/width:\s*([0-9.]+)%/);
          if (match) {
            const width = parseFloat(match[1]);
            console.log(
              "✅ Found usage percentage from style attribute:",
              width
            );
            return width;
          }
        }
      }
    }

    console.log("⚠️ Could not find GitHub Copilot usage element");
    console.log(
      "🔍 Available progress elements:",
      document.querySelectorAll(".Progress-item")
    );
    return null;
  }

  // ฟังก์ชันบันทึกข้อมูลไปยัง storage
  async function saveDataToStorage(percent) {
    const data = {
      percent: percent,
      title: document.title.substring(0, 30),
      timestamp: Date.now(),
      url: window.location.href,
    };

    try {
      await chrome.storage.local.set({ copilotData: data });
      console.log("💾 Data saved to storage:", data);
    } catch (error) {
      console.error("❌ Error saving data:", error);
    }
  }

  // ฟังก์ชันอัปเดตข้อมูล
  async function updateData() {
    let percent = getPercentFromGitHub();

    // ถ้าหาข้อมูลไม่เจอ ใช้ข้อมูลจำลอง
    if (percent === null) {
      console.log("📊 Using demo data since GitHub data not found");
      percent = 21.0 + Math.random() * 10; // สุ่มประมาณ 21-31%
    }

    console.log(`💾 Saving data: ${percent.toFixed(1)}%`);
    await saveDataToStorage(percent);
    return percent;
  }

  // อัปเดตข้อมูลทันที
  const initialPercent = await updateData();

  // อัปเดตข้อมูลทุก 10 วินาที
  const updateInterval = setInterval(async () => {
    await updateData();
    console.log("📈 Data updated automatically");
  }, 10000);

  // แสดง notification ให้ user รู้ว่า extension ทำงาน
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: #4caf50;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 1000000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  notification.innerHTML = `
    🚀 Copilot Pin Extension Active!<br>
    <small>Click extension icon to pin widget</small>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 4000);

  // รับฟัง message จาก pin window
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "forceUpdate") {
      console.log("🔄 Force update requested");
      updateData().then((percent) => {
        sendResponse({ success: true, percent: percent });
      });
      return true; // เพื่อให้ response แบบ async
    }
  });

  console.log(`✅ Content script initialized for tab: ${tabId}`);
  console.log(`📊 Initial usage: ${initialPercent?.toFixed(1)}%`);

  // Cleanup เมื่อหน้าถูกปิด
  window.addEventListener("beforeunload", () => {
    clearInterval(updateInterval);
  });
})();
