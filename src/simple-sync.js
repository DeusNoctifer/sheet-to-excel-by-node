require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class SheetSync {
  constructor() {
    this.spreadsheetId = process.env.SPREADSHEET_ID;
    this.outputDir = process.env.OUTPUT_DIR || './output';
    this.outputFileName = process.env.OUTPUT_FILE_NAME || 'datos_excel.xlsx';
    
    this.ensureDirectories();
    this.validateConfig();
    
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets.readonly'
      ],
    });
  }

  validateConfig() {
    const missing = [];
    if (!this.spreadsheetId) missing.push('SPREADSHEET_ID');
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    if (!process.env.GOOGLE_PRIVATE_KEY) missing.push('GOOGLE_PRIVATE_KEY');

    if (missing.length > 0) {
      throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
    }
  }
  
  ensureDirectories() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
  
  getFilePath() {
    return path.join(this.outputDir, this.outputFileName);
  }
  
  async downloadExcel() {
    const drive = google.drive({ version: 'v3', auth: await this.auth.getClient() });
    const filePath = this.getFilePath();
    
    console.log('📥 Descargando Google Sheet como Excel...');
    
    const response = await drive.files.export({
      fileId: this.spreadsheetId,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }, { responseType: 'stream' });
    
    return new Promise((resolve, reject) => {
      const stream = response.data.pipe(fs.createWriteStream(filePath));
      stream.on('finish', () => {
        console.log(`✅ Archivo guardado: ${filePath}`);
        resolve(filePath);
      });
      stream.on('error', reject);
    });
  }
  
  async sync() {
    try {
      console.log('\n🔄 Sincronizando Google Sheet...');
      console.log(`📑 Spreadsheet ID: ${this.spreadsheetId}`);
      
      const filePath = await this.downloadExcel();
      
      console.log('✅ Sincronización completada\n');
      return { success: true, filePath };
    } catch (error) {
      console.error('❌ Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

async function main() {
  const sync = new SheetSync();
  await sync.sync();
}

main().catch(console.error);