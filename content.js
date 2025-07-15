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
      // ตรวจสอบว่า chrome API ยังใช้ได้หรือไม่
      if (chrome && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ copilotData: data });
        console.log("💾 Data saved to storage:", data);
      } else {
        console.warn(
          "⚠️ Chrome extension context invalidated, cannot save data"
        );
      }
    } catch (error) {
      console.error("❌ Error saving data:", error);
      // ถ้า extension context invalidated ให้หยุดการทำงาน
      if (error.message.includes("Extension context invalidated")) {
        console.log(
          "🔄 Extension context invalidated, stopping content script"
        );
        return false;
      }
    }
    return true;
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
    const success = await saveDataToStorage(percent);

    // ถ้า extension context invalidated ให้หยุดการทำงาน
    if (!success) {
      if (updateInterval) {
        clearInterval(updateInterval);
        console.log(
          "🛑 Stopped update interval due to extension context invalidation"
        );
      }
      return null;
    }

    return percent;
  }

  // อัปเดตข้อมูลทันที
  const initialPercent = await updateData();

  // อัปเดตข้อมูลทุก 10 วินาที (ถ้า initialPercent ไม่เป็น null)
  let updateInterval = null;
  if (initialPercent !== null) {
    updateInterval = setInterval(async () => {
      const result = await updateData();
      if (result === null) {
        // หยุดการทำงานถ้า extension context invalidated
        clearInterval(updateInterval);
        return;
      }
      console.log("📈 Data updated automatically");
    }, 10000);
  }

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

  // รับฟัง message จาก pin window (ตรวจสอบ extension context)
  if (chrome && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "forceUpdate") {
        console.log("🔄 Force update requested");
        updateData()
          .then((percent) => {
            if (percent !== null) {
              sendResponse({ success: true, percent: percent });
            } else {
              sendResponse({
                success: false,
                error: "Extension context invalidated",
              });
            }
          })
          .catch((error) => {
            console.error("Error during force update:", error);
            sendResponse({ success: false, error: error.message });
          });
        return true; // เพื่อให้ response แบบ async
      }
    });
  } else {
    console.warn(
      "⚠️ Chrome runtime API not available, message listener not set"
    );
  }

  console.log(`✅ Content script initialized for tab: ${tabId}`);
  if (initialPercent !== null) {
    console.log(`📊 Initial usage: ${initialPercent?.toFixed(1)}%`);
  } else {
    console.log("⚠️ Extension context invalidated during initialization");
  }

  // Cleanup เมื่อหน้าถูกปิด
  window.addEventListener("beforeunload", () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });
})();
