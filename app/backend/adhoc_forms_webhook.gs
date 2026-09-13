/**
 * Setup Instructions:
 * 1. Open your Google Sheet linked to the Google Form.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any existing code and paste this entire script.
 * 4. Update the API_BASE_URL to your production endpoint.
 * 5. Run setupTrigger() manually once. It will ask for permissions.
 * 6. Create a new sheet tab named 'WebhookLog' in your spreadsheet.
 */

const API_BASE_URL = 'https://archiveops.dataguardng.com';
const WEBHOOK_SECRET = 'your_webhook_secret'; // Match with backend

function setupTrigger() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(sheet)
    .onFormSubmit()
    .create();
}

function onFormSubmit(e) {
  try {
    const responses = e.namedValues;
    
    // Normalize phone number (0xxx -> +234xxx)
    let phone = responses['Phone Number'] ? responses['Phone Number'][0].trim() : '';
    if (phone.startsWith('0')) {
      phone = '+234' + phone.substring(1);
    }

    // Map project name to ID
    const projectName = responses['Project'] ? responses['Project'][0] : '';
    let projectId = '';
    if (projectName.includes('Stanbic')) projectId = 'p1';
    else if (projectName.includes('Airtel')) projectId = 'p2';
    else if (projectName.includes('First Bank')) projectId = 'p3';
    else if (projectName.includes('Majekodunmi')) projectId = 'p4';

    const payload = {
      worker_phone: phone,
      worker_name: responses['Full Name'] ? responses['Full Name'][0] : '',
      project_id: projectId,
      boxes_count: parseInt(responses['Boxes/Bags/Crates Processed']?.[0] || '0', 10),
      files_count: parseInt(responses['Files Processed']?.[0] || '0', 10),
      pages_count: parseInt(responses['Pages Scanned']?.[0] || '0', 10),
      indexing_count: parseInt(responses['Records Indexed']?.[0] || '0', 10),
      report_date: responses['Date of Work'] ? formatDate(responses['Date of Work'][0]) : new Date().toISOString().split('T')[0]
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers: {
        'X-Webhook-Secret': WEBHOOK_SECRET
      },
      muteHttpExceptions: true
    };

    let success = false;
    let retries = 3;
    let response;

    while (retries > 0 && !success) {
      try {
        response = UrlFetchApp.fetch(`${API_BASE_URL}/api/webhooks/adhoc-intake`, options);
        if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
          success = true;
        } else {
          retries--;
          Utilities.sleep(1000); // Wait 1 second before retry
        }
      } catch (err) {
        retries--;
        Utilities.sleep(1000);
      }
    }

    logResult(success ? 'SUCCESS' : 'FAILED', JSON.stringify(payload), response ? response.getContentText() : 'Network Error');
  } catch (error) {
    logResult('ERROR', 'N/A', error.toString());
  }
}

function formatDate(dateString) {
  // Try to parse typical Google Forms date format (MM/DD/YYYY) to YYYY-MM-DD
  try {
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  return new Date().toISOString().split('T')[0];
}

function logResult(status, payload, response) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName('WebhookLog');
  if (!logSheet) {
    logSheet = ss.insertSheet('WebhookLog');
    logSheet.appendRow(['Timestamp', 'Status', 'Payload', 'Response']);
  }
  logSheet.appendRow([new Date(), status, payload, response]);
}
