let pinnedWindow = null;
let keepOnTopInterval = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log("Copilot Premium Pin Extension Installed");
});

// ฟังก์ชันเพื่อทำให้ window อยู่บนสุด (aggressive mode)
async function keepWindowOnTop() {
  if (pinnedWindow) {
    try {
      // ดึงข้อมูล window ปัจจุบัน
      const window = await chrome.windows.get(pinnedWindow.id);

      // ให้ focus และ bring to front อย่างต่อเนื่อง
      if (window) {
        await chrome.windows.update(pinnedWindow.id, {
          focused: true,
          drawAttention: true,
          state: "normal",
        });

        // Force bring to front อีกครั้ง
        setTimeout(async () => {
          try {
            await chrome.windows.update(pinnedWindow.id, { focused: true });
          } catch (e) {
            /* ignore */
          }
        }, 100);

        console.log("🔝 Forced window to stay on top");
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
      width: 200, // ลดจาก 280 เป็น 200 (เล็กมาก)
      height: 80, // ลดจาก 120 เป็น 80 (เล็กมาก)
      left: screenWidth - 220, // ปรับตำแหน่งตามขนาดใหม่
      top: 20,
      focused: true,
      // ลบ alwaysOnTop: true ออก (ไม่ support ใน Chrome extension API)
    });

    console.log("Pin window created:", pinnedWindow.id);

    // เริ่ม interval เพื่อทำให้ window อยู่บนสุด (ทุก 800ms - aggressive)
    keepOnTopInterval = setInterval(keepWindowOnTop, 800);
  } catch (error) {
    console.error("Error creating pin window:", error);

    // ถ้า system.display ไม่ทำงาน ใช้ค่าเริ่มต้น
    try {
      pinnedWindow = await chrome.windows.create({
        url: "pin-window.html",
        type: "popup",
        width: 200, // ลดขนาดเริ่มต้น (เล็กมาก)
        height: 80, // ลดขนาดเริ่มต้น (เล็กมาก)
        left: 800, // ค่าเริ่มต้น
        top: 20,
        focused: true,
        // ลบ alwaysOnTop: true ออก (ไม่ support ใน Chrome extension API)
      });

      console.log("Pin window created with default position:", pinnedWindow.id);

      // เริ่ม interval เพื่อทำให้ window อยู่บนสุด (ทุก 800ms - aggressive)
      keepOnTopInterval = setInterval(keepWindowOnTop, 800);
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

// ฟังเมื่อมีการเปลี่ยน focus ของ window (aggressive refocus)
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (
    pinnedWindow &&
    windowId !== pinnedWindow.id &&
    windowId !== chrome.windows.WINDOW_ID_NONE
  ) {
    // ทันทีที่มี window อื่นได้ focus ให้ bring pin window กลับมาทันที
    setTimeout(async () => {
      try {
        await chrome.windows.update(pinnedWindow.id, {
          focused: true,
          drawAttention: true,
        });

        // Force อีกครั้งหลัง 100ms
        setTimeout(async () => {
          try {
            await chrome.windows.update(pinnedWindow.id, { focused: true });
          } catch (e) {
            /* ignore */
          }
        }, 100);

        console.log("🔄 Aggressively refocused pin window");
      } catch (error) {
        console.log("Pin window might be closed");
      }
    }, 100); // ลด delay ลงเป็น 100ms เพื่อ response เร็วขึ้น
  }
});
