const { google } = require("googleapis");
const keys = JSON.parse(process.env.GOOGLE_SHEET_KEY);
keys.private_key = keys.private_key.replace(/\\n/g, "\n");

const sheets = google.sheets({
    version: "v4",
    auth: new google.auth.GoogleAuth({
        credentials: keys,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }),
});

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME;


async function addToGoogleSheet(data) {
    try {
        console.log("ลบข้อมูลเก่าทั้งหมดจาก Google Sheets...");
        
        // 1. ล้างข้อมูลทั้งหมดในชีต
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SHEET_ID,
            range: `${SHEET_NAME}!A2:H2`,
        });
        
        console.log("ลบข้อมูลเก่าเสร็จสิ้น กำลังเพิ่มข้อมูลใหม่...");
        
        // 2. เพิ่มข้อมูลใหม่ทั้งหมด
        if (data.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: `${SHEET_NAME}!A2:H2`,
                valueInputOption: "USER_ENTERED",
                resource: { values: data },
            });
            console.log(`เพิ่มข้อมูลใหม่จำนวน ${data.length} รายการ`);
        } else {
            console.log("ไม่มีข้อมูลใหม่ให้เพิ่ม");
        }

        return { added: data.length };
    } catch (error) {
        console.error("ไม่สามารถอัปเดตข้อมูลใน Google Sheets:", error.response ? error.response.data : error);
        throw error;
    }
}

module.exports = { addToGoogleSheet };