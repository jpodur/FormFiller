/**
 * Simple Form Filler - Popup Script
 * Handles CSV parsing and communication with content script
 */

// State
let csvData = [];

// DOM Elements
const pastedText = document.getElementById('pastedText');
const keepInMemoryCheckbox = document.getElementById('keepInMemoryCheckbox');
const sessionAutofillCheckbox = document.getElementById('sessionAutofillCheckbox');
const persistentText = document.getElementById('persistentText');
const persistentAutofillCheckbox = document.getElementById('persistentAutofillCheckbox');
const fillButton = document.getElementById('fillButton');
const exportButton = document.getElementById('exportButton');
const versionElement = document.getElementById('version');
const snackbar = document.getElementById('snackbar');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadVersion();
  setupEventListeners();
  restoreState();
});

/**
 * Restore saved state from chrome.storage.session (short-term) and
 * chrome.storage.local (persistent) into the popup UI.
 */
function restoreState() {
  chrome.storage.session.get(['keepInMemory', 'sessionAutofill', 'sessionCsvText'], (data) => {
    if (data.keepInMemory) {
      keepInMemoryCheckbox.checked = true;
      sessionAutofillCheckbox.disabled = false;
      pastedText.value = data.sessionCsvText || '';
      sessionAutofillCheckbox.checked = !!data.sessionAutofill;
    }
    updateFillButtonState();
  });

  chrome.storage.local.get(['persistentCsvText', 'persistentAutofill'], (data) => {
    persistentText.value = data.persistentCsvText || '';
    persistentAutofillCheckbox.checked = !!data.persistentAutofill;
    updateFillButtonState();
  });
}

/**
 * Enable the Fill Form button if either text area has content.
 */
function updateFillButtonState() {
  const hasSessionData = pastedText.value.trim().length > 0;
  const hasPersistentData = persistentText.value.trim().length > 0;
  fillButton.disabled = !(hasSessionData || hasPersistentData);
}

/**
 * Combine parsed CSV data from the session field and the persistent field.
 * If the same field name appears in both, the session ("Copied") value wins
 * and the persistent duplicate is dropped - reported back as a conflict.
 */
function normalizeFieldName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mergeCsvData(sessionCsv, persistentCsv) {
  const sessionFieldNames = new Set(sessionCsv.map(([field]) => normalizeFieldName(field)));
  const conflicts = [];
  const filteredPersistent = [];

  persistentCsv.forEach(([field, value]) => {
    if (sessionFieldNames.has(normalizeFieldName(field))) {
      conflicts.push(field);
    } else {
      filteredPersistent.push([field, value]);
    }
  });

  return {
    combined: sessionCsv.concat(filteredPersistent),
    conflicts
  };
}

function getCombinedCsvData() {
  const sessionCsv = parseCSV(pastedText.value.trim());
  const persistentValue = persistentText.value.trim();
  const persistentCsv = persistentValue ? parseCSV(persistentValue) : [];
  return mergeCsvData(sessionCsv, persistentCsv);
}

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
  persistentText.addEventListener('input', handlePersistentTextInput);
  keepInMemoryCheckbox.addEventListener('change', handleKeepInMemoryChange);
  sessionAutofillCheckbox.addEventListener('change', handleSessionAutofillChange);
  persistentAutofillCheckbox.addEventListener('change', handlePersistentAutofillChange);
  fillButton.addEventListener('click', handleFillForm);
  exportButton.addEventListener('click', handleExportFields);
}

/**
 * Handle pasted text input (session field)
 */
function handleTextInput(event) {
  updateFillButtonState();

  if (keepInMemoryCheckbox.checked) {
    chrome.storage.session.set({ sessionCsvText: event.target.value });
  }
}

/**
 * Handle pasted text input (persistent field) - always saved
 */
function handlePersistentTextInput(event) {
  updateFillButtonState();
  chrome.storage.local.set({ persistentCsvText: event.target.value });
}

/**
 * Handle "Keep in Memory" checkbox toggle
 */
function handleKeepInMemoryChange() {
  if (keepInMemoryCheckbox.checked) {
    sessionAutofillCheckbox.disabled = false;
    chrome.storage.session.set({
      keepInMemory: true,
      sessionCsvText: pastedText.value
    });
  } else {
    sessionAutofillCheckbox.checked = false;
    sessionAutofillCheckbox.disabled = true;
    chrome.storage.session.remove(['keepInMemory', 'sessionAutofill', 'sessionCsvText']);
  }
}

/**
 * Handle session "Autofill" checkbox toggle
 */
function handleSessionAutofillChange() {
  chrome.storage.session.set({ sessionAutofill: sessionAutofillCheckbox.checked });
}

/**
 * Handle persistent "Autofill" checkbox toggle
 */
function handlePersistentAutofillChange() {
  chrome.storage.local.set({ persistentAutofill: persistentAutofillCheckbox.checked });
}

/**
 * Handle fill form button click
 */
async function handleFillForm() {
  const { combined, conflicts } = getCombinedCsvData();
  csvData = combined;

  if (csvData.length === 0) {
    showSnackbar('No data to fill');
    return;
  }

  fillButton.disabled = true;
  fillButton.textContent = 'Filling...';

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject the content script first
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['js/fillFormsImproved.js']
    });

    // Send message to content script
    chrome.tabs.sendMessage(
      tab.id,
      {
        form: '0', // Simple form mode
        csv: csvData,
        filesToUpload: [] // No file uploads
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError.message);
          showSnackbar('Error: ' + chrome.runtime.lastError.message);
        } else {
          // Handle new response format (object with filled/unfilled)
          const filled = typeof response === 'number' ? response : response.filled;
          const unfilled = typeof response === 'object' ? response.unfilled : [];

          console.log('Success! Filled:', filled, 'fields');

          const messageLines = [];

          if (conflicts.length > 0) {
            conflicts.forEach((field) => {
              messageLines.push(`Conflict: "${field}" in both Copied & Persistent \u2014 using Copied.`);
            });
          }

          if (unfilled && unfilled.length > 0) {
            const unfilledList = unfilled.join(', ');
            messageLines.push(`Filled: ${filled} field(s)`);
            messageLines.push(`Not found: ${unfilledList}`);
            console.log('Unfilled CSV entries:', unfilled);
          } else {
            messageLines.push(`Filled: ${filled} field(s)`);
          }

          const duration = conflicts.length > 0 ? 6000 : (unfilled && unfilled.length > 0 ? 5000 : 3000);
          showSnackbar(messageLines.join('\n'), duration);
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
  // Handle both straight quotes (") and curly/smart quotes ("")
  if ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith('"') && text.endsWith('"'))) {
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

    // Remove any leading/trailing quotes from the entire line first
    // This handles cases where Google Sheets adds quotes around individual lines
    line = line.replace(/^[""]|[""]$/g, '');

    // Simple CSV parsing - handle quoted values
    let field = '';
    let value = '';
    let inQuotes = false;
    let pastComma = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"' || char === '"' || char === '"') {
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

    // Clean up field and value - remove both straight and curly quotes
    field = field.trim().replace(/^[""]|[""]$/g, '');
    value = value.trim().replace(/^[""]|[""]$/g, '');

    if (field) {
      result.push([field, value]);
    }
  }

  return result;
}

/**
 * Show snackbar notification
 */
function showSnackbar(message, duration = 3000) {
  snackbar.textContent = message;
  snackbar.className = 'show';

  setTimeout(() => {
    snackbar.className = snackbar.className.replace('show', '');
  }, duration);
}

/**
 * Handle export fields button click
 */
async function handleExportFields() {
  exportButton.disabled = true;
  exportButton.textContent = 'Exporting...';

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject the content script first
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['js/fillFormsImproved.js']
    });

    // Send message to content script to export fields
    chrome.tabs.sendMessage(
      tab.id,
      { form: 'export' },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError.message);
          showSnackbar('Error: ' + chrome.runtime.lastError.message);
        } else {
          // Create HTML page to display the data
          const html = createExportHTML(response);
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);

          // Open in new tab
          chrome.tabs.create({ url: url });

          showSnackbar(`Exported ${response.fields.length} fields`);
        }

        exportButton.disabled = false;
        exportButton.textContent = '🔍 Export Fields';
      }
    );
  } catch (error) {
    console.error('Error:', error);
    showSnackbar('Error exporting fields');
    exportButton.disabled = false;
    exportButton.textContent = '🔍 Export Fields';
  }
}

/**
 * Create HTML page for exported field data
 */
function createExportHTML(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Form Fields Export - ${data.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { color: #2196f3; margin-bottom: 12px; font-size: 24px; }
    .meta { color: #666; font-size: 14px; }
    .meta-item { margin: 4px 0; }
    .summary {
      background: #e3f2fd;
      padding: 16px;
      border-radius: 6px;
      margin-top: 16px;
      font-size: 14px;
    }
    .csv-container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .csv-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .csv-title {
      font-size: 20px;
      font-weight: 600;
      color: #4caf50;
    }
    .csv-description {
      color: #666;
      font-size: 14px;
      margin-bottom: 12px;
      line-height: 1.5;
    }
    .csv-content {
      background: #f5f5f5;
      border: 2px solid #4caf50;
      border-radius: 6px;
      padding: 16px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.8;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 400px;
      overflow-y: auto;
      color: #1b5e20;
    }
    .field {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .field-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid #f0f0f0;
    }
    .field-index {
      background: #2196f3;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 14px;
    }
    .field-tag {
      background: #4caf50;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .field-type {
      background: #ff9800;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .field-detected {
      font-weight: 600;
      color: #2196f3;
      flex: 1;
    }
    .field-info { display: grid; grid-template-columns: 150px 1fr; gap: 8px; font-size: 14px; }
    .use-in-csv-section {
      background: #e8f5e9;
      border: 2px solid #4caf50;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 16px;
      grid-column: 1 / -1;
    }
    .use-in-csv-label {
      font-weight: 700;
      color: #2e7d32;
      font-size: 12px;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .use-in-csv-value {
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: #1b5e20;
      font-weight: 600;
      word-break: break-all;
    }
    .use-in-csv-normalized {
      font-size: 11px;
      color: #558b2f;
      font-style: italic;
      margin-top: 4px;
    }
    .field-label { font-weight: 600; color: #666; }
    .field-value {
      font-family: 'Courier New', monospace;
      background: #f5f5f5;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .field-value.empty { color: #999; font-style: italic; }
    .options-list {
      margin-top: 8px;
      padding-left: 0;
      list-style: none;
    }
    .options-list li {
      padding: 6px 12px;
      margin: 4px 0;
      background: #f9f9f9;
      border-left: 3px solid #2196f3;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }
    .labels-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .label-badge {
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      border: 1px solid #90caf9;
    }
    .json-container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .json-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .copy-btn {
      background: #2196f3;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .copy-btn:hover { background: #1976d2; }
    pre {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Form Fields Export</h1>
      <div class="meta">
        <div class="meta-item"><strong>Page:</strong> ${escapeHtml(data.title)}</div>
        <div class="meta-item"><strong>URL:</strong> <a href="${escapeHtml(data.url)}" target="_blank">${escapeHtml(data.url)}</a></div>
        <div class="meta-item"><strong>Exported:</strong> ${new Date(data.timestamp).toLocaleString()}</div>
      </div>
      <div class="summary">
        <strong>Summary:</strong> Found ${data.totalFields} total fields, exported ${data.exportedFields} fields (excluding hidden/submit/button fields)
      </div>
    </div>

    <div class="csv-container">
      <div class="csv-header">
        <h2 class="csv-title">📋 Ready-to-Paste CSV Format</h2>
        <button class="copy-btn" onclick="copyCSV()">Copy CSV</button>
      </div>
      <p class="csv-description">
        <strong>Copy this and paste directly into FillJoy!</strong>
        Fields with existing values show their current values.
        Empty fields show their labels as placeholders (replace with your data).
      </p>
      <div class="csv-content" id="csvContent">${escapeHtml(data.csvFormat || 'No fields available')}</div>
    </div>

    ${data.fields.map(field => `
      <div class="field">
        <div class="field-header">
          <span class="field-index">#${field.index}</span>
          <span class="field-tag">${field.tag}</span>
          <span class="field-type">${field.type}</span>
          ${field.labels && field.labels.length > 0 ? `
            <span class="field-detected">${escapeHtml(field.labels[0])}</span>
          ` : `
            <span class="field-detected">${escapeHtml(field.detectedLabel)}</span>
          `}
        </div>
        <div class="field-info">
          <div class="use-in-csv-section">
            <div class="use-in-csv-label">✓ USE THIS IN YOUR CSV:</div>
            <div class="use-in-csv-value">${escapeHtml(field.detectedLabel)}</div>
            <div class="use-in-csv-normalized">(normalized for matching: ${escapeHtml(field.normalizedLabel)})</div>
          </div>

          ${field.labels && field.labels.length > 0 ? `
            <div class="field-label">Visible Label:</div>
            <div class="labels-list">
              ${field.labels.map(label => `<span class="label-badge">${escapeHtml(label)}</span>`).join('')}
            </div>
          ` : ''}

          <div class="field-label">ID:</div>
          <div class="field-value ${field.id ? '' : 'empty'}">${escapeHtml(field.id) || '(none)'}</div>

          <div class="field-label">Name:</div>
          <div class="field-value ${field.name ? '' : 'empty'}">${escapeHtml(field.name) || '(none)'}</div>

          <div class="field-label">Normalized:</div>
          <div class="field-value">${escapeHtml(field.normalizedLabel)}</div>

          ${field.placeholder ? `
            <div class="field-label">Placeholder:</div>
            <div class="field-value">${escapeHtml(field.placeholder)}</div>
          ` : ''}

          ${field.ariaLabel ? `
            <div class="field-label">ARIA Label:</div>
            <div class="field-value">${escapeHtml(field.ariaLabel)}</div>
          ` : ''}

          ${field.autocomplete ? `
            <div class="field-label">Autocomplete:</div>
            <div class="field-value">${escapeHtml(field.autocomplete)}</div>
          ` : ''}

          ${field.value ? `
            <div class="field-label">Current Value:</div>
            <div class="field-value">${escapeHtml(field.value)}</div>
          ` : ''}

          ${field.disabled ? '<div class="field-label">Status:</div><div class="field-value">DISABLED</div>' : ''}
          ${field.readOnly ? '<div class="field-label">Status:</div><div class="field-value">READ-ONLY</div>' : ''}
          ${field.required ? '<div class="field-label">Status:</div><div class="field-value">REQUIRED</div>' : ''}

          ${field.options ? `
            <div class="field-label">Options:</div>
            <div>
              <ul class="options-list">
                ${field.options.map(opt => `
                  <li>
                    <strong>Text:</strong> ${escapeHtml(opt.text)}
                    <strong>Value:</strong> ${escapeHtml(opt.value)}
                    ${opt.normalizedText ? `<br><strong>Normalized:</strong> ${escapeHtml(opt.normalizedText)}` : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('')}

    <div class="json-container">
      <div class="json-header">
        <h2>Raw JSON Data</h2>
        <button class="copy-btn" onclick="copyJSON()">Copy JSON</button>
      </div>
      <pre id="jsonData">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    </div>
  </div>

  <script>
    function copyCSV() {
      const csvText = document.getElementById('csvContent').textContent;
      navigator.clipboard.writeText(csvText).then(() => {
        const btns = document.querySelectorAll('.copy-btn');
        btns[0].textContent = '✓ Copied!';
        setTimeout(() => btns[0].textContent = 'Copy CSV', 2000);
      });
    }

    function copyJSON() {
      const jsonText = document.getElementById('jsonData').textContent;
      navigator.clipboard.writeText(jsonText).then(() => {
        const btns = document.querySelectorAll('.copy-btn');
        btns[1].textContent = '✓ Copied!';
        setTimeout(() => btns[1].textContent = 'Copy JSON', 2000);
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
