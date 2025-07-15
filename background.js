let pinnedWindow = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log("Copilot Premium Pin Extension Installed");
});

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
    } catch (fallbackError) {
      console.error("Failed to create pin window:", fallbackError);
    }
  }
}
