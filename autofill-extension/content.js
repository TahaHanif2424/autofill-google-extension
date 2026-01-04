const AUTOFILL_BUTTON_ID = 'zapply-autofill-floating-btn';
const EIGHTFOLD_APPLY_URL_PATTERN = /\.eightfold\.ai\/careers/i;
const NOTIFICATION_ID = 'autofill-notification';
const KEYFRAMES_ID = 'zapply-keyframes';

// =============================================================================
// USER DATA CONFIGURATION
// =============================================================================

const userData = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phoneType: "mobile",
  phoneNumber: "5551234567",
  fullName: "John Michael Doe",
  disabilityStatus: "No",
  veteranStatus: "Not a Veteran",
  willingToRelocate: true,
  currentAddress: {
    street: "123 Main Street",
    city: "San Francisco",
    state: "California",
    zipCode: "94101",
    country: "United States"
  },
  desiredSalary: "150000",
  remoteWorkPreference: "hybrid",
  authorizedToWork: true,
  requireSponsorship: false,
  commonQuestions: {
    howDidYouHear: "LinkedIn"
  }
};

let stats = {
  fieldsFound: 0,
  fieldsFilled: 0
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Wait for specified milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Trigger input events for React/Vue/Angular compatibility
 * @param {HTMLElement} element - The input element
 */
function triggerInputEvents(element) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set;
  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set;

  if (element.tagName === 'INPUT' && nativeInputValueSetter) {
    nativeInputValueSetter.call(element, element.value);
  } else if (element.tagName === 'TEXTAREA' && nativeTextareaValueSetter) {
    nativeTextareaValueSetter.call(element, element.value);
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
}

/**
 * Find input element by label text
 * @param {string} labelText - Text to search for in labels
 * @param {Document|HTMLElement} container - Container to search within
 * @returns {HTMLElement|null}
 */
function findInputByLabel(labelText, container = document) {
  const labelLower = labelText.toLowerCase();

  // Search by label text
  const labels = container.querySelectorAll('label');
  for (const label of labels) {
    if (label.textContent.toLowerCase().includes(labelLower)) {
      if (label.htmlFor) {
        const input = container.querySelector(`#${CSS.escape(label.htmlFor)}`);
        if (input) return input;
      }
      const nestedInput = label.querySelector('input, select, textarea');
      if (nestedInput) return nestedInput;

      const parent = label.closest('.form-group, .field, .input-group, [class*="field"], [class*="input"]');
      if (parent) {
        const input = parent.querySelector('input, select, textarea');
        if (input) return input;
      }
    }
  }

  // Search by placeholder
  const allInputs = container.querySelectorAll('input, textarea');
  for (const input of allInputs) {
    if (input.placeholder?.toLowerCase().includes(labelLower)) {
      return input;
    }
  }

  // Search by aria-label
  const ariaInputs = container.querySelectorAll(`[aria-label*="${labelText}" i]`);
  if (ariaInputs.length > 0) return ariaInputs[0];

  // Search by name attribute
  const namedInputs = container.querySelectorAll(`input[name*="${labelText}" i], select[name*="${labelText}" i]`);
  if (namedInputs.length > 0) return namedInputs[0];

  return null;
}

// =============================================================================
// NOTIFICATION SYSTEM
// =============================================================================

/**
 * Show notification overlay to user
 * @param {string} message - HTML message content
 * @param {string} type - Notification type (info, success, warning, error)
 * @param {number} duration - Duration in ms (0 for permanent)
 * @returns {HTMLElement}
 */
function showNotification(message, type = 'info', duration = 5000) {
  const existing = document.getElementById(NOTIFICATION_ID);
  if (existing) existing.remove();

  const colors = {
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#f44336'
  };

  const notification = document.createElement('div');
  notification.id = NOTIFICATION_ID;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 400px;
    line-height: 1.5;
  `;
  notification.innerHTML = message;
  document.body.appendChild(notification);

  if (duration > 0) {
    setTimeout(() => notification.remove(), duration);
  }

  return notification;
}

// =============================================================================
// FIELD FILLING FUNCTIONS
// =============================================================================

/**
 * Fill a text input field
 * @param {HTMLInputElement} input - Input element
 * @param {string} value - Value to fill
 * @returns {Promise<boolean>}
 */
async function fillTextField(input, value) {
  if (!input || !value) return false;

  try {
    input.focus();
    await wait(100);
    input.value = '';
    input.value = value;
    triggerInputEvents(input);
    await wait(50);
    input.blur();
    stats.fieldsFilled++;
    return true;
  } catch (error) {
    console.error('[Zapply] Error filling text field:', error);
    return false;
  }
}

/**
 * Fill a native select dropdown
 * @param {HTMLSelectElement} select - Select element
 * @param {string} value - Value to select
 * @returns {Promise<boolean>}
 */
async function fillSelectField(select, value) {
  if (!select || !value) return false;

  try {
    const valueLower = value.toLowerCase();

    // Try exact match first
    for (const option of select.options) {
      if (option.text.toLowerCase() === valueLower || option.value.toLowerCase() === valueLower) {
        select.value = option.value;
        triggerInputEvents(select);
        stats.fieldsFilled++;
        return true;
      }
    }

    // Try partial match
    for (const option of select.options) {
      if (option.text.toLowerCase().includes(valueLower) || option.value.toLowerCase().includes(valueLower)) {
        select.value = option.value;
        triggerInputEvents(select);
        stats.fieldsFilled++;
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[Zapply] Error filling select field:', error);
    return false;
  }
}

/**
 * Fill a checkbox field
 * @param {HTMLInputElement} checkbox - Checkbox element
 * @param {boolean} shouldCheck - Whether to check or uncheck
 * @returns {Promise<boolean>}
 */
async function fillCheckbox(checkbox, shouldCheck) {
  if (!checkbox) return false;

  try {
    if (checkbox.checked !== shouldCheck) {
      checkbox.click();
      await wait(50);
      triggerInputEvents(checkbox);
      stats.fieldsFilled++;
    }
    return true;
  } catch (error) {
    console.error('[Zapply] Error filling checkbox:', error);
    return false;
  }
}

// =============================================================================
// EIGHTFOLD-SPECIFIC FIELD HANDLERS
// =============================================================================

/**
 * Handle Eightfold custom dropdowns (React Select components)
 */
async function fillEightfoldDropdowns() {
  const dropdownInputs = document.querySelectorAll('input[placeholder="Select"]');
  const processedSections = new Set();

  for (const input of dropdownInputs) {
    if (input.offsetParent === null) continue;
    if (input.value && input.value !== 'Select' && input.value.length > 0) continue;

    // Identify dropdown type by traversing up the DOM
    let labelText = '';
    let container = input.parentElement;

    for (let i = 0; i < 8; i++) {
      if (!container) break;
      const text = container.textContent.toLowerCase();

      if (text.includes('how did you learn') || text.includes('how did you hear')) {
        labelText = 'source';
        break;
      } else if (text.includes('disability status') && text.length < 500) {
        labelText = 'disability';
        break;
      } else if (text.includes('vevraa') || (text.includes('veteran') && text.includes('protected'))) {
        labelText = 'veteran';
        break;
      } else if (text.includes('open to relocation') && text.length < 200) {
        labelText = 'relocation';
        break;
      } else if (text.includes('legally permitted') || text.includes('work in the country') || text.includes('permitted to work')) {
        labelText = 'workpermit';
        break;
      } else if (text.includes('require sponsorship') || text.includes('will you now or in the future')) {
        labelText = 'sponsorship';
        break;
      } else if (text.includes('prefer to work') || text.includes('on-site, hybrid')) {
        labelText = 'workpreference';
        break;
      } else if (text.includes('country') && text.length < 100 && !text.includes('address') && !text.includes('permitted') && !text.includes('legally')) {
        labelText = 'country';
        break;
      }

      container = container.parentElement;
    }

    if (!labelText || processedSections.has(labelText)) continue;
    processedSections.add(labelText);

    // Map label to value
    const valueMap = {
      source: userData.commonQuestions.howDidYouHear,
      disability: userData.disabilityStatus === 'No'
        ? "No, I don't have a disability, or a history/record of having a disability"
        : userData.disabilityStatus === 'Yes'
          ? 'Yes, I have a disability, or have a history/record of having a disability'
          : "I don't wish to answer",
      veteran: 'not a protected veteran',
      relocation: userData.willingToRelocate ? 'Yes' : 'No',
      country: userData.currentAddress.country,
      workpreference: 'Hybrid',
      workpermit: userData.authorizedToWork ? 'Yes' : 'No',
      sponsorship: userData.requireSponsorship ? 'Yes' : 'No'
    };

    const valueToSelect = valueMap[labelText];
    if (!valueToSelect) continue;

    try {
      input.click();
      input.focus();
      await wait(400);

      // Search for matching option
      const optionSelectors = [
        '[role="listbox"] [role="option"]',
        '[role="listbox"] > div',
        '[class*="menu"] [class*="option"]',
        '[class*="dropdown"] [class*="option"]',
        '[class*="select"] [class*="option"]'
      ];

      let found = false;
      for (const selector of optionSelectors) {
        if (found) break;
        const options = document.querySelectorAll(selector);

        for (const option of options) {
          if (option.offsetParent === null) continue;
          const optionText = option.textContent.trim();

          if (optionText.toLowerCase().includes(valueToSelect.toLowerCase()) ||
              valueToSelect.toLowerCase().includes(optionText.toLowerCase())) {
            option.click();
            stats.fieldsFilled++;
            found = true;
            await wait(300);
            break;
          }
        }
      }

      document.body.click();
      await wait(150);
    } catch (e) {
      document.body.click();
    }
  }
}

/**
 * Handle date picker fields
 */
async function fillDateFields() {
  const dateInputs = document.querySelectorAll('input[placeholder*="date" i], input[placeholder*="Select date" i], input[type="date"]');

  for (const input of dateInputs) {
    if (input.offsetParent === null) continue;
    if (input.value && input.value !== 'Select date') continue;

    const today = new Date();
    const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;

    input.click();
    input.focus();
    await wait(300);

    // Try to find and click "Today" button
    const todayButtons = document.querySelectorAll('button, div, span');
    let clicked = false;

    for (const btn of todayButtons) {
      if (btn.offsetParent !== null && btn.textContent.trim().toLowerCase() === 'today') {
        btn.click();
        stats.fieldsFilled++;
        clicked = true;
        await wait(200);
        break;
      }
    }

    // Fallback to direct value setting
    if (!clicked && (!input.value || input.value === 'Select date')) {
      input.value = formattedDate;
      triggerInputEvents(input);
    }

    document.body.click();
    await wait(100);
  }
}

/**
 * Fill all visible fields on the current page
 */
async function fillAllVisibleFields() {
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');

  for (const input of inputs) {
    if (input.offsetParent === null || input.type === 'file') continue;

    const labelEl = input.closest('label') || document.querySelector(`label[for="${input.id}"]`);
    let label = labelEl?.textContent?.toLowerCase() || '';
    if (!label) label = input.placeholder?.toLowerCase() || '';
    if (!label) label = input.name?.toLowerCase() || '';
    if (!label) label = input.getAttribute('aria-label')?.toLowerCase() || '';

    // Skip already filled fields (except radio/checkbox)
    if (input.value && input.value.length > 0 && input.type !== 'radio' && input.type !== 'checkbox') {
      continue;
    }

    stats.fieldsFound++;
    const placeholder = input.placeholder?.toLowerCase() || '';

    // Handle text/email/tel inputs
    if (['text', 'email', 'tel'].includes(input.type) || input.tagName === 'TEXTAREA') {
      if (label.includes('first name') || placeholder.includes('first name')) {
        await fillTextField(input, userData.firstName);
      } else if (label.includes('last name') || placeholder.includes('last name')) {
        await fillTextField(input, userData.lastName);
      } else if ((label.includes('email') || placeholder.includes('email')) && !label.includes('address')) {
        await fillTextField(input, userData.email);
      } else if (label.includes('phone number') || placeholder.includes('phone number')) {
        await fillTextField(input, userData.phoneNumber);
      } else if (label.includes('address line 1') || placeholder.includes('address line 1')) {
        await fillTextField(input, userData.currentAddress.street);
      } else if (label.includes('city') || placeholder.includes('city')) {
        await fillTextField(input, userData.currentAddress.city);
      } else if (label.includes('postal') || label.includes('zip') || placeholder.includes('postal')) {
        await fillTextField(input, userData.currentAddress.zipCode);
      } else if ((label.includes('state') || placeholder.includes('state')) && !label.includes('united')) {
        await fillTextField(input, userData.currentAddress.state);
      } else if (label.includes('salary') || placeholder.includes('salary')) {
        await fillTextField(input, userData.desiredSalary);
      } else if (label.includes('full name') || label === 'name:' || placeholder === 'name:') {
        await fillTextField(input, userData.fullName);
      } else if (label.includes('date:') || placeholder.includes('date:') || label === 'date') {
        const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        await fillTextField(input, today);
      }
      await wait(100);
    }

    // Handle native select dropdowns
    if (input.tagName === 'SELECT') {
      if (label.includes('country')) {
        await fillSelectField(input, userData.currentAddress.country);
      } else if (label.includes('state') || label.includes('province')) {
        await fillSelectField(input, userData.currentAddress.state);
      } else if (label.includes('phone') && label.includes('type')) {
        await fillSelectField(input, userData.phoneType);
      } else if (label.includes('hear') || label.includes('source')) {
        await fillSelectField(input, userData.commonQuestions.howDidYouHear);
      }
      await wait(100);
    }

    // Handle radio buttons
    if (input.type === 'radio') {
      const radioLabel = label;

      if (radioLabel.includes('authorized') || radioLabel.includes('legally') || radioLabel.includes('permit') || radioLabel.includes('eligible to work')) {
        if ((userData.authorizedToWork && radioLabel.includes('yes')) || (!userData.authorizedToWork && radioLabel.includes('no'))) {
          input.click();
          stats.fieldsFilled++;
        }
      } else if (radioLabel.includes('sponsor') || radioLabel.includes('visa')) {
        if ((userData.requireSponsorship && radioLabel.includes('yes')) || (!userData.requireSponsorship && radioLabel.includes('no'))) {
          input.click();
          stats.fieldsFilled++;
        }
      } else if (radioLabel.includes('relocat') || radioLabel.includes('willing to move')) {
        if ((userData.willingToRelocate && radioLabel.includes('yes')) || (!userData.willingToRelocate && radioLabel.includes('no'))) {
          input.click();
          stats.fieldsFilled++;
        }
      } else if (radioLabel.includes('disability')) {
        if (userData.disabilityStatus === 'No' && (radioLabel.includes('do not have') || radioLabel.includes('no, i do'))) {
          input.click();
          stats.fieldsFilled++;
        }
      } else if (radioLabel.includes('veteran') || radioLabel.includes('military')) {
        if (userData.veteranStatus.toLowerCase().includes('not') && (radioLabel.includes('not a') || radioLabel.includes('i am not'))) {
          input.click();
          stats.fieldsFilled++;
        }
      }
      await wait(50);
    }
  }

  // Handle custom Eightfold dropdowns and date fields
  await fillEightfoldDropdowns();
  await fillDateFields();
}

// =============================================================================
// MAIN AUTOFILL FUNCTION
// =============================================================================

/**
 * Main autofill function - fills all visible fields on current page
 */
async function runAutofill() {

  // Remove existing notifications
  const existing = document.getElementById(NOTIFICATION_ID);
  if (existing) existing.remove();

  // Reset stats
  stats = { fieldsFound: 0, fieldsFilled: 0 };

  // Fill all visible fields
  await fillAllVisibleFields();

  // Show completion notification
  showNotification(
    `<strong>Fields Filled: ${stats.fieldsFilled}</strong><br><p>Please review the filled fields.</p>`,
    'success',
    5000
  );

  // Notify background script
  chrome.runtime.sendMessage({
    action: 'autofillComplete',
    stats: stats
  });
}

// =============================================================================
// FLOATING BUTTON UI
// =============================================================================

/**
 * SVG icon for the autofill button
 */
const MAGIC_WAND_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M15 4V2"></path>
  <path d="M15 16v-2"></path>
  <path d="M8 9h2"></path>
  <path d="M20 9h2"></path>
  <path d="M17.8 11.8L19 13"></path>
  <path d="M15 9h0"></path>
  <path d="M17.8 6.2L19 5"></path>
  <path d="M3 21l9-9"></path>
  <path d="M12.2 6.2L11 5"></path>
</svg>`;

const LOADING_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: zapply-spin 1s linear infinite;">
  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
</svg>`;

/**
 * Inject the floating autofill button into the page
 */
function injectFloatingButton() {
  if (document.getElementById(AUTOFILL_BUTTON_ID)) return;

  // Create button structure
  const button = document.createElement('button');
  button.id = AUTOFILL_BUTTON_ID;

  const icon = document.createElement('span');
  icon.className = 'zapply-icon';
  icon.innerHTML = MAGIC_WAND_ICON;
  icon.style.cssText = 'display:flex;align-items:center;justify-content:center;flex-shrink:0;';

  const text = document.createElement('span');
  text.className = 'zapply-text';
  text.textContent = 'Autofill Application';
  text.style.cssText = 'max-width:0;overflow:hidden;white-space:nowrap;opacity:0;margin-left:0;transition:all 0.3s ease;';

  button.appendChild(icon);
  button.appendChild(text);

  // Button styles
  button.style.cssText = `
    position:fixed;top:50%;right:24px;transform:translateY(-50%);z-index:2147483647;
    width:56px;height:56px;padding:0;font-size:14px;font-weight:600;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    color:#fff;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
    border:none;border-radius:50%;cursor:pointer;
    box-shadow:0 4px 15px rgba(102,126,234,0.4),0 2px 6px rgba(0,0,0,0.15);
    transition:all 0.3s cubic-bezier(0.4,0,0.2,1);outline:none;user-select:none;
    display:flex;align-items:center;justify-content:center;overflow:hidden;
  `;

  // Hover state tracking
  let isHovered = false;

  button.addEventListener('mouseenter', () => {
    isHovered = true;
    button.style.width = '200px';
    button.style.paddingLeft = '16px';
    button.style.paddingRight = '20px';
    button.style.borderRadius = '28px';
    button.style.boxShadow = '0 6px 20px rgba(102,126,234,0.5),0 4px 10px rgba(0,0,0,0.2)';
    text.style.maxWidth = '150px';
    text.style.opacity = '1';
    text.style.marginLeft = '10px';
  });

  button.addEventListener('mouseleave', () => {
    isHovered = false;
    button.style.width = '56px';
    button.style.paddingLeft = '0';
    button.style.paddingRight = '0';
    button.style.borderRadius = '50%';
    button.style.boxShadow = '0 4px 15px rgba(102,126,234,0.4),0 2px 6px rgba(0,0,0,0.15)';
    button.style.transform = 'translateY(-50%)';
    text.style.maxWidth = '0';
    text.style.opacity = '0';
    text.style.marginLeft = '0';
  });

  button.addEventListener('mousedown', () => {
    button.style.transform = 'translateY(-50%) scale(0.95)';
  });

  button.addEventListener('mouseup', () => {
    if (isHovered) button.style.transform = 'translateY(-50%)';
  });

  button.addEventListener('click', handleAutofillButtonClick);

  document.body.appendChild(button);
}

/**
 * Handle autofill button click
 */
async function handleAutofillButtonClick() {
  const confirmed = confirm(
    'Do you want to autofill this application?\n\n' +
    'This will automatically fill in your saved information into the form fields.'
  );

  if (!confirmed) return;

  const button = document.getElementById(AUTOFILL_BUTTON_ID);
  const icon = button?.querySelector('.zapply-icon');
  const text = button?.querySelector('.zapply-text');

  // Show loading state
  if (button) {
    button.disabled = true;
    button.style.opacity = '0.7';
    button.style.cursor = 'wait';

    if (icon) {
      icon.innerHTML = LOADING_ICON;
      if (!document.getElementById(KEYFRAMES_ID)) {
        const style = document.createElement('style');
        style.id = KEYFRAMES_ID;
        style.textContent = '@keyframes zapply-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
        document.head.appendChild(style);
      }
    }
    if (text) text.textContent = 'Autofilling...';
  }

  try {
    await runAutofill();
  } catch (error) {
    console.error('[Zapply] Autofill error:', error);
    showNotification('An error occurred during autofill. Please try again.', 'error', 5000);
  } finally {
    // Reset button state
    if (button) {
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      if (icon) icon.innerHTML = MAGIC_WAND_ICON;
      if (text) text.textContent = 'Autofill Application';
    }
  }
}

/**
 * Remove the floating button
 */
function removeFloatingButton() {
  document.getElementById(AUTOFILL_BUTTON_ID)?.remove();
}

/**
 * Check if current page is an Eightfold application page
 */
function isEightfoldApplicationPage() {
  return EIGHTFOLD_APPLY_URL_PATTERN.test(window.location.href);
}

/**
 * Initialize or remove floating button based on current page
 */
function initializeFloatingButton() {
  if (isEightfoldApplicationPage()) {
    injectFloatingButton();
  } else {
    removeFloatingButton();
  }
}

// =============================================================================
// OBSERVERS AND LISTENERS
// =============================================================================

/**
 * Set up MutationObserver for dynamic content
 */
function setupMutationObserver() {
  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      if (isEightfoldApplicationPage() && !document.getElementById(AUTOFILL_BUTTON_ID)) {
        injectFloatingButton();
      }
    }, 300);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}

/**
 * Set up URL change listener for SPA navigation
 */
function setupUrlChangeListener() {
  let lastUrl = window.location.href;

  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      initializeFloatingButton();
    }
  }, 1000);

  window.addEventListener('popstate', () => {
    setTimeout(initializeFloatingButton, 100);
  });
}

// Message listener for popup/background communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startAutofill') {
    runAutofill();
    sendResponse({ status: 'started' });
  }
  return true;
});

// =============================================================================
// INITIALIZATION
// =============================================================================

function initialize() {
  if (window.location.href.includes('eightfold.ai')) {
    initializeFloatingButton();
    setupMutationObserver();
    setupUrlChangeListener();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
