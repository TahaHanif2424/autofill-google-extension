// Background service worker for Eightfold AI Autofill Extension

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  // Check if we're on an Eightfold AI page
  if (tab.url && tab.url.includes('eightfold.ai')) {
    try {
      // Send message to content script to trigger autofill
      await chrome.tabs.sendMessage(tab.id, { action: 'startAutofill' });
    } catch (error) {
      console.error('Error triggering autofill:', error);
      // If content script isn't loaded, inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        // Try sending the message again after injection
        await chrome.tabs.sendMessage(tab.id, { action: 'startAutofill' });
      } catch (injectError) {
        console.error('Error injecting content script:', injectError);
      }
    }
  } else {
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autofillComplete') {
  } else if (message.action === 'autofillError') {
    console.error('Autofill error:', message.error);
  }
  return true;
});
