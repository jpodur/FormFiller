# Privacy Policy for FillJoy Simple Form Filler

**Last Updated: September 7, 2026**

## Overview

FillJoy Simple Form Filler ("the Extension") is committed to protecting your privacy. This privacy policy explains our data practices for the Extension.

## Data Collection

**We do not collect, transmit, or share any user data with anyone — not the developer, not a server, not any third party.**

The Extension operates entirely locally on your device. No information is ever sent anywhere outside your own browser.

## How the Extension Works

1. **User Input**: You manually paste CSV data into the extension popup
2. **Local Processing**: The extension processes this data locally in your browser
3. **Form Filling**: The extension fills form fields on the current webpage, either when you click "Fill Form" or automatically on page load if you've enabled an Autofill option
4. **On-Device Storage Only, By Your Choice**: If you check "Keep in Memory," your pasted data is held in your browser's local session storage so it survives a page refresh; it is automatically cleared the moment Chrome is closed. If you enter data into the "Saved Form Fill Entries (Persistent)" field, it is saved in your browser's local storage on this device so it's available across browser restarts, until you clear it yourself. In both cases, this data never leaves your device — it is not synced, uploaded, or transmitted anywhere.

## What We Don't Collect

The Extension does NOT collect or transmit to any server, developer, or third party:

- Personal information (names, addresses, emails, phone numbers)
- Financial information (credit cards, bank accounts)
- Authentication credentials (passwords, usernames)
- Health information
- Location data
- Browsing history
- Website content
- Form data you enter
- Any user activity or behavior data

Any data the Extension does retain (per the Autofill features above) stays exclusively in local browser storage on your own device.

## Permissions

The Extension requests the following permissions:

### activeTab Permission
- **Purpose**: To access the current webpage where you want to fill a form
- **Usage**: Only activates when you click the extension icon and click "Fill Form"
- **Data Access**: Reads form fields only to match them with your CSV data
- **Data Transmission**: No data is transmitted anywhere

### scripting Permission
- **Purpose**: To inject the content script into web pages
- **Usage**: Required to interact with form elements on the page
- **Data Access**: Only accesses form fields you are actively filling
- **Data Transmission**: No data is transmitted anywhere

### Host Permissions (<all_urls>)
- **Purpose**: To work on any website where you need to fill forms, and to support the optional Autofill feature, which fills forms automatically as soon as a page loads (rather than only when you click the extension icon)
- **Usage**: The Extension's content script loads on pages you visit so Autofill can work without a click. It only actively fills a form if you have separately enabled "Autofill" for the session field or the persistent field
- **Data Access**: Only reads form field attributes to match with your CSV data
- **Data Transmission**: No data is transmitted anywhere

### Storage Permission
- **Purpose**: To support "Keep in Memory" and the persistent "Saved Form Fill Entries" feature
- **Usage**: Stores your pasted CSV data locally in the browser only when you opt in to one of these features
- **Data Access**: Only the Extension itself can read this locally stored data
- **Data Transmission**: No data is transmitted anywhere; "Keep in Memory" data clears automatically when Chrome closes, and persistent data stays on-device until you clear it

## Data Security

Since the Extension never transmits data anywhere, there is no data-in-transit or server-side risk. Any data the Extension retains (only with your opt-in, via "Keep in Memory" or the persistent Saved Form Fill Entries field) is stored exclusively in your browser's local storage on your own device, and is never accessible to the developer or any third party.

## Third-Party Services

The Extension does not use any third-party services, analytics, tracking, or external APIs.

## Children's Privacy

The Extension does not knowingly collect any information from anyone, including children under the age of 13.

## Changes to This Privacy Policy

We may update this privacy policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date.

## Open Source

FillJoy Simple Form Filler is open source. You can review the complete source code at:
https://github.com/jpodur/FillJoy

## Contact

If you have any questions about this privacy policy, please contact:

**GitHub**: https://github.com/jpodur/FillJoy/issues

---

## Summary

**FillJoy Simple Form Filler does not collect any user data. Period.**

Your data stays on your device. We don't collect it, we don't store it, we don't transmit it, and we don't share it. Your privacy is completely protected.

---

*This privacy policy is effective as of November 5, 2024*
