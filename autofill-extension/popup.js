// Popup script for Eightfold AI Autofill Extension

document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const autofillBtn = document.getElementById('autofillBtn');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if we're on an Eightfold AI page
  if (tab.url && tab.url.includes('eightfold.ai')) {
    statusDiv.textContent = 'Ready to autofill this page!';
    statusDiv.className = 'status ready';
    autofillBtn.disabled = false;
  } else {
    statusDiv.textContent = 'Not on an Eightfold AI page. Navigate to a job application first.';
    statusDiv.className = 'status not-ready';
    autofillBtn.disabled = true;
  }

  // Handle autofill button click
  autofillBtn.addEventListener('click', async () => {
    autofillBtn.textContent = 'Running...';
    autofillBtn.disabled = true;

    try {
      // Send message to content script (it's already injected via manifest)
      await chrome.tabs.sendMessage(tab.id, { action: 'startAutofill' });
      statusDiv.textContent = 'Autofill started! Check the page.';
      statusDiv.className = 'status ready';

      // Close popup after a short delay
      setTimeout(() => window.close(), 1500);
    } catch (error) {
      console.error('Error:', error);
      statusDiv.innerHTML = 'Error: Please <b>refresh the page</b> and try again.';
      statusDiv.className = 'status not-ready';
      autofillBtn.textContent = 'Retry';
      autofillBtn.disabled = false;
    }
  });
});
