/**
 * Simple Form Filler - Popup Script
 * Handles CSV parsing and communication with content script
 */

// State
let csvData = [];

// DOM Elements
const pastedText = document.getElementById('pastedText');
const repeatCheckbox = document.getElementById('repeatCheckbox');
const fillButton = document.getElementById('fillButton');
const versionElement = document.getElementById('version');
const snackbar = document.getElementById('snackbar');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadVersion();
  setupEventListeners();
});

/**
 * Load and display extension version
 */
function loadVersion() {
  const manifest = chrome.runtime.getManifest();
  versionElement.textContent = `v${manifest.version}`;
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  pastedText.addEventListener('input', handleTextInput);
  fillButton.addEventListener('click', handleFillForm);
}

/**
 * Handle pasted text input
 */
function handleTextInput(event) {
  const text = event.target.value.trim();

  if (text) {
    // Parse the pasted text
    csvData = parseCSV(text);

    if (csvData.length > 0) {
      fillButton.disabled = false;
    } else {
      fillButton.disabled = true;
    }
  } else {
    csvData = [];
    fillButton.disabled = true;
  }
}

/**
 * Handle fill form button click
 */
async function handleFillForm() {
  if (csvData.length === 0) {
    showSnackbar('No data to fill');
    return;
  }

  fillButton.disabled = true;
  fillButton.textContent = 'Filling...';

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script
    chrome.tabs.sendMessage(
      tab.id,
      {
        form: '0', // Simple form mode
        csv: csvData,
        repeat: repeatCheckbox.checked,
        filesToUpload: [] // No file uploads
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError.message);

          // Check if content script is not loaded
          if (chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
            showSnackbar('Please refresh the page first');
          } else if (chrome.runtime.lastError.message.includes('message port closed')) {
            showSnackbar('Extension reloaded - please refresh page');
          } else {
            console.error('Full error:', chrome.runtime.lastError);
            showSnackbar('Error: ' + chrome.runtime.lastError.message);
          }
        } else {
          console.log('Success! Filled:', response, 'fields');
          showSnackbar(`Filled: ${response} field(s)`);
        }

        fillButton.disabled = false;
        fillButton.textContent = 'Fill Form';
      }
    );
  } catch (error) {
    console.error('Error:', error);
    showSnackbar('Error filling form');
    fillButton.disabled = false;
    fillButton.textContent = 'Fill Form';
  }
}

/**
 * Parse CSV text into array of [field, value] pairs
 * Handles Google Sheets quotations and simple CSV formats
 */
function parseCSV(text) {
  // First, trim the entire text
  text = text.trim();

  // Remove leading and trailing quotes from Google Sheets copy-paste
  // Google Sheets often wraps the entire selection in quotes
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1);
  }

  // Split into lines and filter empty ones
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  const result = [];

  for (let line of lines) {
    // Trim leading/trailing whitespace from each line
    line = line.trim();

    // Skip empty lines
    if (!line) continue;

    // Simple CSV parsing - handle quoted values
    let field = '';
    let value = '';
    let inQuotes = false;
    let pastComma = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes && !pastComma) {
        pastComma = true;
      } else {
        if (!pastComma) {
          field += char;
        } else {
          value += char;
        }
      }
    }

    // Clean up field and value
    field = field.trim().replace(/^"|"$/g, '');
    value = value.trim().replace(/^"|"$/g, '');

    if (field) {
      result.push([field, value]);
    }
  }

  return result;
}

/**
 * Show snackbar notification
 */
function showSnackbar(message) {
  snackbar.textContent = message;
  snackbar.className = 'show';

  setTimeout(() => {
    snackbar.className = snackbar.className.replace('show', '');
  }, 3000);
}
