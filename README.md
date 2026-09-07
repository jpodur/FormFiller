# FillJoy Simple Form Filler

A Chrome extension that automatically fills web forms with CSV data. Perfect for quickly filling out repetitive forms with data from spreadsheets.

## Features

- **Simple CSV Input**: Paste data directly from Google Sheets or Excel
- **Smart Field Matching**: Automatically matches CSV field names to form fields using multiple detection strategies
- **Flexible Matching**: Handles field names with underscores, hyphens, and special characters
- **Dropdown Support**: Intelligently fills select dropdowns with partial or exact matches
- **Google Sheets Compatible**: Handles quotation marks from Google Sheets copy-paste
- **Keep in Memory**: Optionally keep your pasted data across page refreshes for the current browser session (cleared automatically when Chrome closes)
- **Saved Form Fill Entries (Persistent)**: A second, always-on-device field for data you reuse across many forms (like your email address) - persists across browser restarts until you clear it
- **Autofill**: Automatically fill a page's form the moment it loads, for either the session data or the persistent data (or both combined)
- **Conflict Handling**: If the same field name appears in both the session and persistent data, the session ("Copied") value is used and the extension warns you about the conflict

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `FillJoy` directory

## Usage

1. **Prepare your data** in CSV format:
   ```
   first_name,John
   last_name,Smith
   email,john.smith@example.com
   grade_level,12
   ```

2. **Copy the data** from your spreadsheet (Google Sheets, Excel, etc.)

3. **Navigate** to the form you want to fill

4. **Click the extension icon** and paste your CSV data

5. **Click "Fill Form"** - the extension will automatically match and fill fields

### Optional: Keep in Memory & Autofill

- Check **Keep in Memory** to have your pasted data survive a page refresh for the rest of the browser session (it's cleared automatically when Chrome closes)
- With Keep in Memory on, you can also check **Autofill** to have that data fill automatically the instant a matching page loads, with no click needed

### Optional: Saved Form Fill Entries (Persistent)

Use the second text field (below the instructions) for data you reuse across many different forms, like your email address. This data is saved on your device and survives Chrome restarts. Check its **Autofill** box to have it fill automatically on page load, independent of the session field above.

If the same field name appears in both the session and persistent fields, the session ("Copied") value always wins, and FillJoy shows a warning telling you which field conflicted.

## CSV Format

- Each line should contain: `field_name,value`
- Field names are matched against:
  - Input/select `name` attributes
  - Input/select `id` attributes
  - Associated `<label>` text
  - ARIA labels
  - Placeholders

## Field Matching

The extension uses intelligent matching:
- **Exact match**: Tries to match field names exactly
- **Normalized match**: Ignores case, special characters, and spaces
- **Contains match**: For longer field names, uses partial matching
- **Dropdown matching**: For select fields, matches option text or value

## Examples

### Text Fields
```
first_name,Jane
email,jane@example.com
phone,555-1234
```

### Dropdowns
```
country,United States
state,CA
grade_level,12
```

You can use either the full option text or a partial match:
```
ON_Brd_Res_Status,1        # Matches "Pupil of the Board (01)"
status,Pupil               # Also works with partial text
```

## Development

### File Structure
```
FillJoy/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup UI
├── css/
│   └── popup.css         # Popup styling
├── js/
│   ├── popup.js          # Popup logic, CSV parsing, and storage handling
│   └── fillFormsImproved.js  # Content script for form filling + autofill-on-load
└── assets/
    └── images/
        └── iconOnly.png  # Extension icon
```

### Permissions

- `activeTab` / `scripting`: fill and read the active tab's form fields when you click Fill Form or Export Fields
- `storage`: back the Keep in Memory (session) and Saved Form Fill Entries (persistent) features
- `<all_urls>` host permission + a declared content script: required so Autofill can run automatically when a page loads, not just when you click the extension icon

### Key Functions

**popup.js**
- `parseCSV(text)`: Parses CSV data from clipboard
- `handleFillForm()`: Sends data to content script

**fillFormsImproved.js**
- `normalizeText(text)`: Normalizes text for matching
- `findLabelForField(field)`: Finds label text using multiple strategies
- `matchesField(labelText, csvFieldName)`: Matches field to CSV data
- `fillTextField/fillSelectField/fillCheckableField`: Fill different field types

## Troubleshooting

**Fields not filling:**
- Check the browser console (F12) for messages
- Ensure CSV field names match form field names, IDs, or labels
- Try using the actual `name` or `id` attribute from the HTML

**"Please refresh the page first":**
- The content script needs to be injected - refresh the page and try again

**Dropdowns not selecting:**
- Try using the option value instead of text
- Check if the option text includes extra characters or formatting

## Version History

### v3.7.0
- Replaced "Repeat" checkbox (which had no effect) with **Keep in Memory** and **Autofill** for the session field
- Added **Saved Form Fill Entries (Persistent)** - a second, on-device-persistent field with its own Autofill toggle
- Manual "Fill Form" now combines session + persistent data, with the session value winning on field-name conflicts and a warning shown for any conflicts
- Added `storage` permission and a declared content script (`<all_urls>`) to support autofill on page load

### v3.4.0
- Improved field detection with 11 strategies
- Added Google Sheets quotation handling
- Enhanced dropdown matching logic
- Cleaned up and refactored code for maintainability
- Removed multi-form and file generation features (simplified to single form filling)

## License

This extension is provided as-is for personal and educational use.
