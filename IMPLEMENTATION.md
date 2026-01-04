Eightfold AI Job Application Autofill Extension
Overview

This Chrome extension helps users quickly fill job application forms on Eightfold AI–based career pages, specifically PTC Careers.
It adds a floating “Autofill Application” button directly on the page, allowing autofill with a single click after confirmation.

How It Works

Detects when the user is on an Eightfold AI application page
Injects a floating button on the right side of the screen
On click, asks for confirmation and then autofills visible fields
Works across multi-step application flows
No popup interaction is required.

Technical Approach
Built using Chrome Manifest V3
Main logic runs in a content script
Uses multiple strategies to detect fields:

Labels

Placeholders
name and aria-label attributes
Dispatches proper events (input, change) so React-based forms register values correctly
Supported Sections
Contact Information
Source / Referral
Disability & Veteran Self-Identification
Relocation Preference
Address Details
Salary & Work Preference
Legal Authorization Questions
Resume and cover letter uploads are filled manually due to browser restrictions.

File Structure
autofill-extension/
├── manifest.json
├── background.js
├── content.js
├── popup.html (optional)
├── popup.js (optional)
├── test-data.json
└── IMPLEMENTATION.md

Usage

Load the extension via chrome://extensions
Open a PTC Eightfold AI application page
Click Autofill Application
Confirm and review the filled fields
Continue to the next step

Limitations

File uploads cannot be automated
CAPTCHA or login steps require manual action
Some custom questions may not be detected


Conclusion

This project demonstrates practical experience with:
Chrome extension development
SPA form automation

DOM manipulation in real-world ATS platforms