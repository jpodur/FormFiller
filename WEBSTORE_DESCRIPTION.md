# Chrome Web Store Description

## Short Description (132 characters max)
Automatically fill web forms with CSV data. Perfect for repetitive data entry from spreadsheets like Google Sheets or Excel.

---

## Detailed Description

**FillJoy Simple Form Filler** makes form filling effortless! Copy data from your spreadsheet and paste it into any web form. Perfect for teachers, admins, testers, and anyone who fills out repetitive forms.

### ✨ Key Features

**📋 Simple CSV Input**
Copy directly from Google Sheets, Excel, or any spreadsheet. Just paste and fill!

**🎯 Smart Field Matching**
Automatically matches your data to form fields using intelligent detection:
- Field names and IDs
- Form labels
- ARIA labels
- Placeholders

**📝 Works with All Field Types**
- Text inputs and textareas
- Dropdowns and select menus
- Checkboxes and radio buttons

**🔄 Flexible Matching**
Handles field names with underscores, hyphens, spaces, and special characters. Works even when your CSV field names don't exactly match the form.

**🧠 Keep in Memory & Autofill**
Keep your pasted data across page refreshes for the rest of your browser session (it clears automatically when Chrome closes), and optionally have it fill in automatically the instant a page loads - no click required.

**💾 Saved Form Fill Entries (Persistent)**
A second, dedicated field for data you use over and over across many forms - like your email address. It's saved on your device and survives Chrome restarts, with its own independent Autofill toggle.

**🎨 Google Sheets Compatible**
Automatically handles quotation marks and formatting from Google Sheets copy-paste.

---

### 🚀 How to Use

1. **Prepare your data** in CSV format:
   ```
   first_name,John
   last_name,Smith
   email,john.smith@example.com
   grade_level,12
   ```

2. **Copy the data** from your spreadsheet

3. **Navigate** to the form you want to fill

4. **Click the FillJoy icon** in your toolbar

5. **Paste your CSV data** and click "Fill Form"

Done! Your form is filled in seconds.

---

### 💡 Use Cases

**📚 Teachers & Education Staff**
Quickly fill student enrollment forms, grade entry, or attendance records.

**👔 HR & Administrative Professionals**
Speed through employee onboarding forms, data entry tasks, or system updates.

**🧪 QA Testers & Developers**
Test forms rapidly with different data sets. Perfect for regression testing.

**📊 Data Entry Specialists**
Process large batches of forms efficiently from spreadsheet data.

---

### 📖 CSV Format

Each line should contain: `field_name,value`

**Examples:**

Text fields:
```
first_name,Jane
email,jane@example.com
phone,555-1234
address,123 Main St
```

Dropdowns (use full text or partial match):
```
country,United States
state,California
grade_level,12
status,Active
```

For dropdowns, you can use:
- Full option text: `status,Pupil of the Board (01)`
- Partial text: `status,Pupil`
- Option value: `status,01`

---

### 🔒 Privacy & Security

- **No data collection**: We never see, transmit, or share your data - it never leaves your browser
- **No tracking**: We don't track your usage
- **No internet required**: Works completely offline
- **No server uploads**: Data is never sent anywhere
- **On-device storage only, by your choice**: If you enable Keep in Memory or Saved Form Fill Entries, your data is stored locally in your own browser - never synced, uploaded, or shared - and Keep in Memory data clears automatically when Chrome closes

Your privacy is our priority. This extension processes and stores everything locally in your browser.

---

### 🎓 Tips & Tricks

**Field Name Matching:**
The extension is smart about matching fields. If your form has a field called "First Name" you can use any of these in your CSV:
- `first_name,John`
- `First Name,John`
- `firstname,John`
- `FIRST_NAME,John`

**Dropdown Shortcuts:**
For dropdown menus, you can use short codes instead of typing the full option text:
- `ON_Brd_Res_Status,1` matches "Pupil of the Board (01)"
- `grade_level,12` matches "Grade 12"

**Autofill for Repeat Visits:**
Enable "Autofill" (session or persistent) to have FillJoy fill a matching page automatically the moment it loads - handy for forms you fill out the same way every time.

---

### 🛠️ Technical Details

- **Manifest V3**: Built with the latest Chrome extension standards
- **No external dependencies**: Lightweight and fast
- **11 field detection strategies**: Finds fields even on complex forms
- **Intelligent normalization**: Handles different naming conventions
- **On-device storage**: Uses Chrome's local `storage` API for Keep in Memory and Saved Form Fill Entries - nothing is ever transmitted externally

---

### 💬 Support & Feedback

Found a form that doesn't work? Have suggestions?

Visit our GitHub: https://github.com/jpodur/FillJoy

We're actively improving FillJoy and love hearing from our users!

---

### 📜 Version History

**v3.7.0** - Current Release
- Replaced non-functional "Repeat" checkbox with **Keep in Memory** and **Autofill**
- Added **Saved Form Fill Entries (Persistent)** for data reused across many forms
- Smart conflict handling when the same field appears in both saved data sets

**v3.4.0**
- Enhanced field detection with 11 strategies
- Improved dropdown matching logic
- Google Sheets quotation handling
- Clean, maintainable codebase
- Simplified to focus on single form filling

---

**Made with ❤️ by Jason Podur**

Enjoy faster, easier form filling with FillJoy!
