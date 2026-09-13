/**
 * ArchiveOps - Google Apps Script Connector
 * 
 * This script connects Google Sheets to the ArchiveOps platform,
 * enabling AppSheet integration and Google Drive export.
 * 
 * Deploy as a Google Apps Script Web App to enable:
 * 1. REST API access to Google Sheets data
 * 2. AppSheet data source integration
 * 3. Google Drive PDF/Excel export
 * 
 * Setup:
 * 1. Create a Google Sheet with tabs: Projects, DailyReports, Users, ExceptionLogs, NudgeLogs
 * 2. Open Extensions > Apps Script
 * 3. Paste this code into Code.gs
 * 4. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 5. Copy the deployment URL into your .env file as GOOGLE_APPS_SCRIPT_URL
 */

// Configuration
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || SpreadsheetApp.getActiveSpreadsheet().getId();

// Sheet names
const SHEETS = {
  PROJECTS: 'Projects',
  DAILY_REPORTS: 'DailyReports',
  USERS: 'Users',
  EXCEPTION_LOGS: 'ExceptionLogs',
  NUDGE_LOGS: 'NudgeLogs',
  EXECUTIVE_SUMMARIES: 'ExecutiveSummaries'
};

/**
 * Handle GET requests - Read data from sheets
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'ping';
    const sheet_name = e.parameter.sheet;
    
    let result;
    
    switch (action) {
      case 'ping':
        result = { status: 'ok', message: 'ArchiveOps Google Apps Script connector is running', timestamp: new Date().toISOString() };
        break;
      
      case 'read':
        if (!sheet_name) {
          return jsonResponse({ error: 'Missing sheet parameter' }, 400);
        }
        result = readSheet(sheet_name);
        break;
      
      case 'schema':
        result = getSchema();
        break;
      
      default:
        result = { error: 'Unknown action: ' + action };
    }
    
    return jsonResponse(result);
    
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * Handle POST requests - Write data to sheets
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    let result;
    
    switch (action) {
      case 'append':
        result = appendRow(payload.sheet, payload.data);
        break;
      
      case 'update':
        result = updateRow(payload.sheet, payload.row_id, payload.data);
        break;
      
      case 'sync':
        result = syncFromBackend(payload.data);
        break;
      
      default:
        result = { error: 'Unknown action: ' + action };
    }
    
    return jsonResponse(result);
    
  } catch (error) {
    return jsonResponse({ error: error.toString() }, 500);
  }
}

/**
 * Read all data from a sheet and return as JSON array
 */
function readSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return { error: 'Sheet not found: ' + sheetName, available_sheets: ss.getSheets().map(s => s.getName()) };
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return { headers: data[0] || [], rows: [] };
  }
  
  const headers = data[0];
  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
  
  return { headers: headers, rows: rows, count: rows.length };
}

/**
 * Append a new row to a sheet
 */
function appendRow(sheetName, rowData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return { error: 'Sheet not found: ' + sheetName };
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => rowData[header] || '');
  
  sheet.appendRow(newRow);
  
  return { 
    success: true, 
    message: 'Row appended to ' + sheetName,
    row_number: sheet.getLastRow()
  };
}

/**
 * Update an existing row by ID
 */
function updateRow(sheetName, rowId, updateData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return { error: 'Sheet not found: ' + sheetName };
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColIndex = headers.indexOf('id');
  
  if (idColIndex === -1) {
    return { error: 'No id column found in ' + sheetName };
  }
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(rowId)) {
      headers.forEach((header, j) => {
        if (updateData.hasOwnProperty(header)) {
          sheet.getRange(i + 1, j + 1).setValue(updateData[header]);
        }
      });
      return { success: true, message: 'Row updated', row_number: i + 1 };
    }
  }
  
  return { error: 'Row not found with id: ' + rowId };
}

/**
 * Sync all data from backend (bulk replace)
 */
function syncFromBackend(syncData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const results = {};
  
  Object.keys(syncData).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    const rows = syncData[sheetName];
    if (!rows || rows.length === 0) {
      results[sheetName] = { synced: 0 };
      return;
    }
    
    const headers = Object.keys(rows[0]);
    const values = [headers, ...rows.map(row => headers.map(h => row[h] || ''))];
    
    // Clear and replace
    sheet.clear();
    sheet.getRange(1, 1, values.length, headers.length).setValues(values);
    
    results[sheetName] = { synced: rows.length };
  });
  
  return { success: true, results: results };
}

/**
 * Get the schema of all sheets
 */
function getSchema() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const schema = {};
  
  ss.getSheets().forEach(sheet => {
    const name = sheet.getName();
    const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].filter(h => h);
    schema[name] = {
      headers: headers,
      row_count: Math.max(sheet.getLastRow() - 1, 0)
    };
  });
  
  return schema;
}

/**
 * Initialize sheets with headers (run once during setup)
 */
function initializeSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const schemas = {
    'Projects': ['id', 'name', 'client_name', 'activity_type', 'container_unit', 'target_velocity', 'daily_baseline_boxes', 'daily_baseline_files', 'daily_baseline_pages', 'status', 'health'],
    'DailyReports': ['id', 'project_id', 'submitted_by', 'submitted_by_name', 'report_date', 'boxes_count', 'files_count', 'pages_count', 'indexing_count', 'status', 'anomaly_score', 'anomaly_reason', 'created_at'],
    'Users': ['id', 'name', 'email', 'phone', 'role', 'working_days', 'is_on_leave'],
    'ExceptionLogs': ['id', 'project_id', 'reported_by', 'category', 'description', 'reported_at'],
    'NudgeLogs': ['id', 'target_user_id', 'target_user_name', 'project_id', 'nudge_type', 'channel', 'status', 'message_body', 'sent_at'],
    'ExecutiveSummaries': ['id', 'period', 'summary_text', 'total_boxes', 'total_files', 'total_pages', 'overall_health', 'key_bottlenecks', 'generated_at']
  };
  
  Object.keys(schemas).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    sheet.getRange(1, 1, 1, schemas[sheetName].length).setValues([schemas[sheetName]]);
  });
  
  Logger.log('All sheets initialized successfully.');
}

/**
 * Helper: Create JSON response
 */
function jsonResponse(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Export weekly report to Google Drive as PDF
 */
function exportWeeklyReport(folderName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const folder = DriveApp.createFolder(folderName || 'ArchiveOps Reports');
  
  const blob = ss.getAs('application/pdf');
  blob.setName('ArchiveOps_Weekly_Report_' + Utilities.formatDate(new Date(), 'Africa/Lagos', 'yyyy-MM-dd') + '.pdf');
  
  const file = folder.createFile(blob);
  
  return {
    success: true,
    file_id: file.getId(),
    file_url: file.getUrl(),
    folder_url: folder.getUrl()
  };
}
