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
            break; // Move to next field
          }
        }
      }
    });

    return fieldsFilled;
  }

  /**
   * Message listener from popup
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.form !== '0') return;

    csvData = message.csv || [];
    shouldRepeat = message.repeat || false;

    // Fill the form
    const filled = fillFormFields();

    console.log(`FillJoy: Filled ${filled} field(s)`);

    // Send response back
    sendResponse(filled);

    // Return true to indicate async response
    return true;
  });

  console.log('FillJoy: Content script loaded');
})();
