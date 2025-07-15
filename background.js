let pinnedWindow = null;
let keepOnTopInterval = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log("Copilot Premium Pin Extension Installed");
});

// ฟังก์ชันเพื่อทำให้ window อยู่บนสุด (best effort)
async function keepWindowOnTop() {
  if (pinnedWindow) {
    try {
      // ดึงข้อมูล window ปัจจุบัน
      const window = await chrome.windows.get(pinnedWindow.id);

      // ถ้า window ยังเปิดอยู่ ให้ focus มันอีกครั้ง
      if (window && !window.focused) {
        await chrome.windows.update(pinnedWindow.id, { focused: true });
      }
    } catch (error) {
      // Window ถูกปิดแล้ว ให้หยุด interval
      if (keepOnTopInterval) {
        clearInterval(keepOnTopInterval);
        keepOnTopInterval = null;
      }
      pinnedWindow = null;
    }
  }
}

// เมื่อกด extension icon ให้เปิด pin window เลย
chrome.action.onClicked.addListener(async (tab) => {
  console.log("Extension icon clicked, creating pin window...");

  // ตรวจสอบว่าเป็น GitHub tab หรือไม่
  if (!tab.url.includes("github.com")) {
    // แสดง notification ถ้าไม่ใช่ GitHub
    try {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Copilot Pin Extension",
        message: "Please open a GitHub page first!",
      });
    } catch (error) {
      console.log("Notification not supported, using fallback");
    }
    return;
  }

  // ลองสร้าง popup window ก่อน
  try {
    await createPinnedWindow();
  } catch (error) {
    console.log("Popup window failed, using fallback pin widget");
    // ถ้าไม่ได้ ให้ inject simple pin widget
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["simple-pin.js"],
      });

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (window.createSimplePinWindow) {
            window.createSimplePinWindow();
          }
        },
      });

      console.log("✅ Fallback pin widget created");
    } catch (fallbackError) {
      console.error("All pin methods failed:", fallbackError);
    }
  }
});

async function createPinnedWindow() {
  // ปิด window เก่าถ้ามี
  if (pinnedWindow) {
    try {
      await chrome.windows.remove(pinnedWindow.id);
    } catch (error) {
      console.log("Previous window already closed");
    }
  }

  // หยุด interval เก่า
  if (keepOnTopInterval) {
    clearInterval(keepOnTopInterval);
    keepOnTopInterval = null;
  }

  // สร้าง window ใหม่
  try {
    // ดึงขนาดหน้าจอปัจจุบัน
    const displays = await chrome.system.display.getInfo();
    const primaryDisplay = displays[0];
    const screenWidth = primaryDisplay.workArea.width;

    pinnedWindow = await chrome.windows.create({
      url: "pin-window.html",
      type: "popup",
      width: 320,
      height: 140,
      left: screenWidth - 340,
      top: 20,
      focused: true,
    });

    console.log("Pin window created:", pinnedWindow.id);

    // เริ่ม interval เพื่อทำให้ window อยู่บนสุด
    keepOnTopInterval = setInterval(keepWindowOnTop, 3000); // ทุก 3 วินาที
  } catch (error) {
    console.error("Error creating pin window:", error);

    // ถ้า system.display ไม่ทำงาน ใช้ค่าเริ่มต้น
    try {
      pinnedWindow = await chrome.windows.create({
        url: "pin-window.html",
        type: "popup",
        width: 320,
        height: 140,
        left: 800, // ค่าเริ่มต้น
        top: 20,
        focused: true,
      });

      console.log("Pin window created with default position:", pinnedWindow.id);

      // เริ่ม interval เพื่อทำให้ window อยู่บนสุด
      keepOnTopInterval = setInterval(keepWindowOnTop, 3000); // ทุก 3 วินาที
    } catch (fallbackError) {
      console.error("Failed to create pin window:", fallbackError);
    }
  }
}

// ฟังเมื่อ window ถูกปิด
chrome.windows.onRemoved.addListener((windowId) => {
  if (pinnedWindow && pinnedWindow.id === windowId) {
    console.log("Pin window closed");
    pinnedWindow = null;

    // หยุด interval
    if (keepOnTopInterval) {
      clearInterval(keepOnTopInterval);
      keepOnTopInterval = null;
    }
  }
});
