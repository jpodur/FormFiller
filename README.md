# JPod's Simple Form Filler

A Chrome extension that automatically fills web forms with CSV data. Perfect for quickly filling out repetitive forms with data from spreadsheets.

## Features

- **Simple CSV Input**: Paste data directly from Google Sheets or Excel
- **Smart Field Matching**: Automatically matches CSV field names to form fields using multiple detection strategies
- **Flexible Matching**: Handles field names with underscores, hyphens, and special characters
- **Dropdown Support**: Intelligently fills select dropdowns with partial or exact matches
- **Google Sheets Compatible**: Handles quotation marks from Google Sheets copy-paste

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `FormFiller` directory

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
FormFiller/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup UI
├── css/
│   └── popup.css         # Popup styling
├── js/
│   ├── popup.js          # Popup logic and CSV parsing
│   └── fillFormsImproved.js  # Content script for form filling
└── assets/
    └── images/
        └── iconOnly.png  # Extension icon
```

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

### v3.4.0
- Improved field detection with 11 strategies
- Added Google Sheets quotation handling
- Enhanced dropdown matching logic
- Cleaned up and refactored code for maintainability
- Removed multi-form and file generation features (simplified to single form filling)

## License

This extension is provided as-is for personal and educational use.

## Credits

Developed by JPod
