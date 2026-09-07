/**
 * FillJoy Simple Form Filler - Improved Content Script
 * Modern, readable implementation with better field detection
 */

(function() {
  'use strict';

  let csvData = [];
  let fieldsFilled = 0;
  let shouldRepeat = false;

  /**
   * Normalize text for comparison
   * Converts underscores/hyphens to spaces for consistent matching
   */
  function normalizeText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/\s]/gi, '') // Remove all special chars (including underscores and spaces)
      .trim();
  }

  /**
   * Find label text for a field using multiple strategies
   */
  function findLabelForField(field) {
    let labelText = '';

    // Strategy 1: name attribute (check this FIRST - most reliable, matches old script)
    if (field.name) {
      return field.name.trim();
    }

    // Strategy 2: id attribute
    if (field.id) {
      return field.id.trim();
    }

    // Strategy 3: <label for="fieldId">
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) {
        labelText = label.textContent.trim();
        if (labelText) return labelText;
      }
    }

    // Strategy 4: Field wrapped in <label>
    const parentLabel = field.closest('label');
    if (parentLabel) {
      labelText = parentLabel.textContent.trim();
      if (labelText) return labelText;
    }

    // Strategy 5: aria-label attribute
    if (field.getAttribute('aria-label')) {
      return field.getAttribute('aria-label').trim();
    }

    // Strategy 6: aria-labelledby
    const labelledBy = field.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) {
        return labelElement.textContent.trim();
      }
    }

    // Strategy 7: placeholder (check this late - often not useful for matching)
    if (field.placeholder && field.placeholder.length < 50) {
      // Only use placeholder if it's reasonable (not just format hints like "MM/DD/YYYY")
      const placeholder = field.placeholder.trim();
      if (!/^[^a-zA-Z]*$/.test(placeholder)) { // Has at least some letters
        return placeholder;
      }
    }

    // Strategy 8: Previous sibling text (for table layouts)
    const prevSibling = field.previousElementSibling;
    if (prevSibling && prevSibling.textContent) {
      const text = prevSibling.textContent.trim();
      if (text.length < 100) { // Reasonable label length
        return text;
      }
    }

    // Strategy 9: Parent's previous sibling (common in form layouts)
    const parent = field.parentElement;
    if (parent) {
      const parentPrevSibling = parent.previousElementSibling;
      if (parentPrevSibling && parentPrevSibling.textContent) {
        const text = parentPrevSibling.textContent.trim();
        if (text.length < 100) {
          return text;
        }
      }
    }

    // Strategy 10: Table cell label (for table-based forms)
    const td = field.closest('td');
    if (td) {
      const prevTd = td.previousElementSibling;
      if (prevTd && prevTd.textContent) {
        const text = prevTd.textContent.trim();
        if (text.length < 100) {
          return text;
        }
      }
    }

    // Strategy 11: Look for nearby text nodes
    if (parent) {
      const walker = document.createTreeWalker(
        parent,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text && text.length < 100) {
          textNodes.push(text);
        }
      }

      if (textNodes.length > 0) {
        return textNodes[0];
      }
    }

    return '';
  }

  /**
   * Check if label matches CSV field name
   */
  function matchesField(labelText, csvFieldName) {
    const normalizedLabel = normalizeText(labelText);
    const normalizedField = normalizeText(csvFieldName);

    if (!normalizedLabel || !normalizedField) return false;

    // Exact match
    if (normalizedLabel === normalizedField) return true;

    // Contains match (for longer labels)
    if (normalizedLabel.includes(normalizedField)) return true;
    if (normalizedField.includes(normalizedLabel)) return true;

    // Word-by-word match
    const labelWords = normalizedLabel.split(/\s+/);
    const fieldWords = normalizedField.split(/\s+/);

    // Check if all field words are in label
    if (fieldWords.every(word => labelWords.includes(word))) return true;

    // Check if all label words are in field
    if (labelWords.every(word => fieldWords.includes(word))) return true;

    return false;
  }

  /**
   * Fill a text input or textarea
   * Using the simple approach that works with PowerSchool
   */
  function fillTextField(field, value) {
    if (field.disabled || field.readOnly) return false;

    // Simple approach - just like the old script that worked
    field.value = value;

    // Fire ONE change event - that's all the old script did
    field.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
  }

  /**
   * Fill a select dropdown
   * Matches the old script logic: uses field name length to determine match type
   */
  function fillSelectField(field, value, fieldName) {
    if (field.disabled) return false;

    const normalizedValue = normalizeText(value);
    const normalizedFieldName = normalizeText(fieldName);
    const options = Array.from(field.options);

    let matchedOption = null;
    let matchedIndex = -1;

    // Match logic from old script:
    // If FIELD NAME length < 3, use exact match
    // Otherwise use contains match
    // This is checked against option TEXT only (not value)

    if (normalizedFieldName.length < 3) {
      matchedIndex = options.findIndex(opt =>
        normalizeText(opt.text) === normalizedValue
      );
    } else {
      matchedIndex = options.findIndex(opt =>
        normalizeText(opt.text).includes(normalizedValue)
      );
    }

    if (matchedIndex >= 0) {
      matchedOption = options[matchedIndex];
    }

    if (matchedOption) {
      matchedOption.selected = true;
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    return false;
  }

  /**
   * Fill a radio button or checkbox
   */
  function fillCheckableField(field, value) {
    if (field.disabled) return false;

    const normalizedValue = normalizeText(value);

    // Check if value suggests "yes", "true", "checked"
    const shouldCheck = normalizedValue === 'yes' ||
                       normalizedValue === 'true' ||
                       normalizedValue === '1' ||
                       normalizedValue === 'checked' ||
                       normalizedValue === 'on';

    if (shouldCheck && !field.checked) {
      field.click();
      return true;
    }

    return false;
  }

  /**
   * Fill all form fields based on CSV data
   */
  function fillFormFields() {
    fieldsFilled = 0;
    const filledFields = new Set(); // Track filled fields to avoid duplicates
    const matchedCsvIndices = new Set(); // Track which CSV entries were matched

    // Get all fillable fields
    const allFields = document.querySelectorAll('input, textarea, select');

    allFields.forEach(field => {
      // Skip if already filled in this run
      if (filledFields.has(field)) return;

      // Only skip actual hidden/submit/button input types
      if (field.type === 'submit' || field.type === 'button' || field.type === 'hidden') return;

      // Get label for this field
      const fieldLabel = findLabelForField(field);
      if (!fieldLabel) return;

      // Try to match with CSV data
      for (let i = 0; i < csvData.length; i++) {
        const [csvFieldName, csvValue] = csvData[i];

        if (matchesField(fieldLabel, csvFieldName)) {
          console.log(`✓ Matched "${csvFieldName}" → "${fieldLabel}" [${field.id || field.name}]`);
          let filled = false;

          // Fill based on field type
          if (field.tagName === 'SELECT') {
            filled = fillSelectField(field, csvValue, csvFieldName);
          } else if (field.type === 'checkbox' || field.type === 'radio') {
            filled = fillCheckableField(field, csvValue);
          } else if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
            filled = fillTextField(field, csvValue);
          }

          if (filled) {
            fieldsFilled++;
            filledFields.add(field);
            matchedCsvIndices.add(i); // Mark this CSV entry as matched
            break; // Move to next field
          }
        }
      }
    });

    // Identify unfilled CSV entries
    const unfilledEntries = [];
    for (let i = 0; i < csvData.length; i++) {
      if (!matchedCsvIndices.has(i)) {
        unfilledEntries.push(csvData[i][0]); // Just the field name
      }
    }

    return {
      filled: fieldsFilled,
      unfilled: unfilledEntries
    };
  }

  /**
   * Export all fields on the page with their information
   */
  function exportFieldsInfo() {
    const allFields = document.querySelectorAll('input, textarea, select');
    const fieldsData = [];

    allFields.forEach((field, index) => {
      // Skip hidden/submit/button types
      if (field.type === 'submit' || field.type === 'button' || field.type === 'hidden') return;

      // Find label
      const fieldLabel = findLabelForField(field);

      // Get all associated labels
      const labels = [];
      if (field.id) {
        const labelElements = document.querySelectorAll(`label[for="${field.id}"]`);
        labelElements.forEach(l => labels.push(l.textContent.trim()));
      }
      const parentLabel = field.closest('label');
      if (parentLabel) {
        const labelText = parentLabel.textContent.trim();
        if (labelText && !labels.includes(labelText)) {
          labels.push(labelText);
        }
      }

      // Gather field information
      const fieldInfo = {
        index: index + 1,
        tag: field.tagName,
        type: field.type || 'N/A',
        id: field.id || '',
        name: field.name || '',
        placeholder: field.placeholder || '',
        ariaLabel: field.getAttribute('aria-label') || '',
        ariaLabelledBy: field.getAttribute('aria-labelledby') || '',
        autocomplete: field.autocomplete || '',
        labels: labels,
        detectedLabel: fieldLabel || 'NOT DETECTED',
        normalizedLabel: normalizeText(fieldLabel || ''),
        value: field.value || '',
        disabled: field.disabled,
        readOnly: field.readOnly || false,
        required: field.required || false
      };

      // For select fields, add options
      if (field.tagName === 'SELECT') {
        fieldInfo.options = Array.from(field.options).map(opt => ({
          text: opt.text,
          value: opt.value,
          selected: opt.selected,
          normalizedText: normalizeText(opt.text),
          normalizedValue: normalizeText(opt.value)
        }));
      }

      fieldsData.push(fieldInfo);
    });

    // Generate copy-pasteable CSV format
    const csvLines = [];
    fieldsData.forEach(field => {
      const fieldName = field.detectedLabel;
      let fieldValue = field.value || '';

      // If no value present, use the first visible label as a placeholder
      if (!fieldValue && field.labels && field.labels.length > 0) {
        fieldValue = field.labels[0];
      }

      // For select fields with no value, use the selected option text or first option
      if (!fieldValue && field.tag === 'SELECT' && field.options && field.options.length > 0) {
        const selectedOption = field.options.find(opt => opt.selected);
        if (selectedOption) {
          fieldValue = selectedOption.text;
        } else {
          fieldValue = field.options[0].text;
        }
      }

      // Only add fields that have a detectable label
      if (fieldName && fieldName !== 'NOT DETECTED') {
        csvLines.push(`${fieldName},${fieldValue}`);
      }
    });

    return {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      totalFields: allFields.length,
      exportedFields: fieldsData.length,
      fields: fieldsData,
      csvFormat: csvLines.join('\n')
    };
  }

  /**
   * Parse CSV text into array of [field, value] pairs
   * (Duplicated from popup.js - content scripts can't share modules with the popup)
   */
  function parseCSV(text) {
    text = text.trim();

    if ((text.startsWith('"') && text.endsWith('"')) ||
        (text.startsWith('“') && text.endsWith('”')) ||
        (text.startsWith('‘') && text.endsWith('’'))) {
      text = text.slice(1, -1);
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim());
    const result = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      line = line.replace(/^[“‘]|[”’]$/g, '');

      let field = '';
      let value = '';
      let inQuotes = false;
      let pastComma = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"' || char === '“' || char === '”') {
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

      field = field.trim().replace(/^[“‘]|[”’]$/g, '');
      value = value.trim().replace(/^[“‘]|[”’]$/g, '');

      if (field) {
        result.push([field, value]);
      }
    }

    return result;
  }

  /**
   * Combine session and persistent CSV data, resolving conflicts in favor
   * of the session ("Copied") data - mirrors popup.js's merge logic.
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

  /**
   * Check stored Autofill settings (session + persistent) and fill the page
   * automatically if either is enabled. Runs once per script injection -
   * either the automatic page-load injection declared in manifest.json, or
   * a manual injection triggered from the popup.
   */
  async function checkAutofillOnLoad() {
    try {
      const sessionData = await chrome.storage.session.get(['keepInMemory', 'sessionAutofill', 'sessionCsvText']);
      const localData = await chrome.storage.local.get(['persistentAutofill', 'persistentCsvText']);

      const sessionEnabled = !!(sessionData.keepInMemory && sessionData.sessionAutofill && sessionData.sessionCsvText);
      const persistentEnabled = !!(localData.persistentAutofill && localData.persistentCsvText);

      const sessionCsv = sessionEnabled ? parseCSV(sessionData.sessionCsvText) : [];
      const persistentCsv = persistentEnabled ? parseCSV(localData.persistentCsvText) : [];

      if (sessionCsv.length === 0 && persistentCsv.length === 0) return;

      const { combined, conflicts } = mergeCsvData(sessionCsv, persistentCsv);

      if (conflicts.length > 0) {
        conflicts.forEach((field) => {
          console.warn(`FillJoy: Conflict: "${field}" in both Copied & Persistent \u2014 using Copied.`);
        });
      }

      if (combined.length > 0) {
        csvData = combined;
        const result = fillFormFields();
        console.log(`FillJoy: Autofilled ${result.filled} field(s) on page load`);
      }
    } catch (error) {
      console.error('FillJoy: Autofill check failed', error);
    }
  }

  /**
   * Message listener from popup
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle export request
    if (message.form === 'export') {
      const exportData = exportFieldsInfo();
      console.log('FillJoy: Exported', exportData.exportedFields, 'fields');
      sendResponse(exportData);
      return true;
    }

    // Handle fill form request
    if (message.form !== '0') return;

    csvData = message.csv || [];
    shouldRepeat = message.repeat || false;

    // Fill the form
    const result = fillFormFields();

    console.log(`FillJoy: Filled ${result.filled} field(s)`);
    if (result.unfilled.length > 0) {
      console.log('FillJoy: Unfilled CSV entries:', result.unfilled);
    }

    // Send response back
    sendResponse(result);

    // Return true to indicate async response
    return true;
  });

  checkAutofillOnLoad();

  console.log('FillJoy: Content script loaded');
})();
