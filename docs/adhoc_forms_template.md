# Google Forms Template Specification for Ad-hoc Workers

This document provides the specification for creating Google Forms for ad-hoc worker daily reporting.

## Form Title
**DataGuard Daily Production Report - [Project Name]**

## Form Fields
1. **Full Name**
   - Type: Short answer
   - Requirement: Required
2. **Phone Number**
   - Type: Short answer
   - Requirement: Required
   - Validation: Regular expression matches `^(\+234|0)[0-9]{10}$` (Custom error text: "Must start with +234 or 0 and be followed by 10 digits")
3. **Date of Work**
   - Type: Date picker
   - Requirement: Required
   - Note: Must not be a future date (add this constraint via validation if possible, or instruct users)
4. **Project**
   - Type: Dropdown
   - Options:
     - Stanbic IBTC Records - Ilupeju Phase
     - Airtel Nigeria Archives
     - First Bank Digitization
     - Majekodunmi & Associates Indexing
5. **Boxes/Bags/Crates Processed**
   - Type: Number
   - Requirement: Required
   - Validation: Minimum 0
   - Help text: "Container type depends on the specific project."
6. **Files Processed**
   - Type: Number
   - Requirement: Required
   - Validation: Minimum 0
7. **Pages Scanned**
   - Type: Number
   - Requirement: Required (for scanning projects, enter 0 for others)
   - Validation: Minimum 0
8. **Records Indexed**
   - Type: Number
   - Requirement: Required (for indexing projects, enter 0 for others)
   - Validation: Minimum 0
9. **Exception/Issue Notes**
   - Type: Paragraph (Long answer)
   - Requirement: Optional
   - Help text: "Describe any problems like equipment failure, power outage, etc."

## Setup Instructions

### 1. Creating the Form
1. Go to [Google Forms](https://forms.google.com).
2. Click on **Blank** to create a new form.
3. Set the title to **DataGuard Daily Production Report - [Project Name]**.
4. Add the fields exactly as specified above.
5. **Important NDPA Compliance Note:** Do **NOT** add any file upload fields for photos. No photos of documents are allowed under NDPA compliance.

### 2. Setting Up Response Destination
1. Go to the **Responses** tab at the top of your form.
2. Click the green **Link to Sheets** icon.
3. Select **Create a new spreadsheet** (or select an existing one if you have a master sheet).
4. Click **Create**.

### 3. Sharing the Form via WhatsApp
1. Click the **Send** button in the top right corner of the form editor.
2. Select the **Link** tab (chain icon).
3. Check the **Shorten URL** box.
4. Click **Copy**.
5. Paste this link into your WhatsApp broadcast list or group for ad-hoc workers.
