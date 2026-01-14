function doGet(e) {
    // If ?api=true, return JSON data (same as before)
    if (e.parameter && e.parameter.api === "true") {
        return handleApiRequest(e);
    }

    // Otherwise serve the HTML game
    return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('Block Blast Clone')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

function doPost(e) {
    // Post requests are always API calls
    return handleApiRequest(e);
}

function handleApiRequest(e) {
    // CORS Headers
    var headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    try {
        // GET: Fetch all stages
        if (!e.postData) {
            var stages = getRemoteStages();
            return ContentService.createTextOutput(JSON.stringify(stages))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // POST: Save new stage
        else {
            var content = e.postData.contents;
            var payload = JSON.parse(content);
            var result = saveStage(payload);
            return ContentService.createTextOutput(JSON.stringify(result))
                .setMimeType(ContentService.MimeType.JSON);
        }

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// --- Public Functions for google.script.run ---

function getRemoteStages() {
    var sheet = getSheet();
    var data = sheet.getDataRange().getValues();
    var stages = {};

    // Skip header row if exists, or handle if empty
    if (data.length > 1) {
        for (var i = 1; i < data.length; i++) {
            var row = data[i];
            // Columns: 0:ID, 1:Title, 2:GridJSON, 3:BlocksJSON, 4:Date
            try {
                var id = row[0];
                stages[id] = {
                    title: row[1],
                    grid: JSON.parse(row[2]),
                    blocks: JSON.parse(row[3])
                };
            } catch (err) {
                console.error("Error parsing row " + i, err);
            }
        }
    }
    return stages;
}

function saveStage(stageData) {
    var sheet = getSheet();

    var id = stageData.id || new Date().getTime();
    var title = stageData.title || "Untitled Stage";
    var grid = JSON.stringify(stageData.grid);
    var blocks = JSON.stringify(stageData.blocks);
    var date = new Date();

    // For simplicity, we just append. Later could implement update.
    // Note: This logic duplicates IDs if saved multiple times, but keeps history.
    sheet.appendRow([id, title, grid, blocks, date]);

    return { status: "success", id: id };
}

// ----------------------------------------------

function getSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Stages");
    if (!sheet) {
        sheet = ss.insertSheet("Stages");
        sheet.appendRow(["ID", "Title", "Grid", "Blocks", "Created At"]); // Header
    }
    return sheet;
}

// Helper to include other HTML files
function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
