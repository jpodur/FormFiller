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
const exportButton = document.getElementById('exportButton');
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
  exportButton.addEventListener('click', handleExportFields);
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

/**
 * Handle export fields button click
 */
async function handleExportFields() {
  exportButton.disabled = true;
  exportButton.textContent = 'Exporting...';

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script to export fields
    chrome.tabs.sendMessage(
      tab.id,
      { form: 'export' },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError.message);

          if (chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
            showSnackbar('Please refresh the page first');
          } else {
            showSnackbar('Error: ' + chrome.runtime.lastError.message);
          }
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

    ${data.fields.map(field => `
      <div class="field">
        <div class="field-header">
          <span class="field-index">#${field.index}</span>
          <span class="field-tag">${field.tag}</span>
          <span class="field-type">${field.type}</span>
          <span class="field-detected">${escapeHtml(field.detectedLabel)}</span>
        </div>
        <div class="field-info">
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

          ${field.labels && field.labels.length > 0 ? `
            <div class="field-label">Labels:</div>
            <div class="labels-list">
              ${field.labels.map(label => `<span class="label-badge">${escapeHtml(label)}</span>`).join('')}
            </div>
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
    function copyJSON() {
      const jsonText = document.getElementById('jsonData').textContent;
      navigator.clipboard.writeText(jsonText).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = 'Copy JSON', 2000);
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
