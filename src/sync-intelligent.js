require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class SheetSync {
  constructor() {
    this.spreadsheetId = process.env.SPREADSHEET_ID;
    this.outputDir = process.env.OUTPUT_DIR || './output';
    this.baseFileName = process.env.OUTPUT_FILE_NAME || 'current_sheet.xlsx';
    this.lastContentFile = path.join(this.outputDir, 'last_content.json');
    
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
      const msg = `Faltan variables de entorno: ${missing.join(', ')}`;
      console.error(msg);
      throw new Error(msg);
    }
  }
  
  ensureDirectories() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
  
  getBaseFilePath() {
    return path.join(this.outputDir, this.baseFileName);
  }
  
  async downloadExcel() {
    try {
      const drive = google.drive({ version: 'v3', auth: await this.auth.getClient() });
      const filePath = this.getBaseFilePath();
      
      console.log('⬇️  Descargando desde Google Sheets...');
      
      const response = await drive.files.export({
        fileId: this.spreadsheetId,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }, { responseType: 'stream' });
      
      return new Promise((resolve, reject) => {
        const stream = response.data.pipe(fs.createWriteStream(filePath));
        stream.on('finish', () => {
          console.log(`✅ Archivo descargado: ${filePath}`);
          resolve({ success: true, filePath });
        });
        stream.on('error', (err) => {
          console.error('❌ Error descargando archivo:', err);
          reject(err);
        });
      });
    } catch (error) {
      console.error('❌ Error en downloadExcel():', error);
      throw error;
    }
  }
  
  async getSheetContent() {
    try {
      console.log('📊 Obteniendo datos de la hoja...');
      console.log(`   Spreadsheet ID: ${this.spreadsheetId}`);
      
      const auth = await this.auth.getClient();
      console.log('✅ Autenticación exitosa');
      
      const sheets = google.sheets({ version: 'v4', auth });
      
      // Paso 1: Obtener metadata sin gridData (más rápido)
      console.log('   Paso 1: Obteniendo metadata...');
      const metadataResponse = await Promise.race([
        sheets.spreadsheets.get({
          spreadsheetId: this.spreadsheetId,
          includeGridData: false,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout en metadata (30s)')), 30000)
        )
      ]);
      
      console.log('✅ Metadata recibida');
      
      const content = {
        title: metadataResponse.data.properties.title,
        sheets: []
      };
      
      const sheetList = metadataResponse.data.sheets || [];
      console.log(`   ${sheetList.length} hojas encontradas`);
      
      // Paso 2: Obtener datos de cada hoja
      console.log('   Paso 2: Obteniendo datos de hojas...');
      for (let i = 0; i < sheetList.length; i++) {
        const sheetMetadata = sheetList[i];
        const sheetTitle = sheetMetadata.properties.title;
        const sheetId = sheetMetadata.properties.sheetId;
        
        console.log(`   • Descargando "${sheetTitle}"...`);
        
        try {
          const valuesResponse = await Promise.race([
            sheets.spreadsheets.values.get({
              spreadsheetId: this.spreadsheetId,
              range: `'${sheetTitle}'`,
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Timeout en hoja "${sheetTitle}" (60s)`)), 60000)
            )
          ]);
          
          const sheet = {
            title: sheetTitle,
            rows: valuesResponse.data.values || []
          };
          
          // Normalizar y trimear valores
          sheet.rows = sheet.rows.map(row => 
            row.map(cell => String(cell || '').trim())
          );
          
          content.sheets.push(sheet);
          console.log(`     ✅ ${sheet.rows.length} filas`);
          
        } catch (sheetError) {
          console.error(`     ⚠️  Error en "${sheetTitle}": ${sheetError.message}`);
          // Continuar con las siguientes hojas
        }
      }
      
      console.log(`✅ Descargadas ${content.sheets.length} hojas exitosamente`);
      return content;
      
    } catch (error) {
      console.error('❌ Error en getSheetContent():', error.message);
      if (error.code === 'ENOTFOUND') {
        console.error('   ⚠️  No se puede conectar a Google API (problema de red)');
      } else if (error.message.includes('invalid_grant')) {
        console.error('   ⚠️  Credenciales inválidas o expiradas');
      } else if (error.message.includes('404')) {
        console.error('   ⚠️  Spreadsheet no encontrado. Verifica SPREADSHEET_ID');
      }
      throw error;
    }
  }
  
  async getLastSyncContent() {
    try {
      if (fs.existsSync(this.lastContentFile)) {
        const data = fs.readFileSync(this.lastContentFile, 'utf-8');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('⚠️  No se pudo leer contenido anterior:', error);
      return null;
    }
  }
  
  saveCurrentContent(content) {
    try {
      fs.writeFileSync(this.lastContentFile, JSON.stringify(content, null, 2), 'utf-8');
      console.log(`✅ Estado guardado en ${this.lastContentFile}`);
    } catch (error) {
      console.error('❌ Error guardando estado:', error);
    }
  }
  
  compareContent(oldContent, newContent) {
    if (!oldContent) {
      console.log('📝 Primera sincronización - no hay contenido previo para comparar');
      return true;
    }
    
    if (!newContent || !newContent.sheets) {
      console.log('❌ Contenido nuevo inválido');
      return false;
    }
    
    if (oldContent.sheets.length !== newContent.sheets.length) {
      console.log(`📝 Cambio: número de hojas diferente (${oldContent.sheets.length} → ${newContent.sheets.length})`);
      return true;
    }
    
    for (let i = 0; i < oldContent.sheets.length; i++) {
      const oldSheet = oldContent.sheets[i];
      const newSheet = newContent.sheets[i];
      
      if (oldSheet.title !== newSheet.title) {
        console.log(`📝 Cambio: título de hoja modificado`);
        return true;
      }
      
      if (oldSheet.rows.length !== newSheet.rows.length) {
        console.log(`📝 Cambio en "${oldSheet.title}": número de filas (${oldSheet.rows.length} → ${newSheet.rows.length})`);
        return true;
      }
      
      for (let j = 0; j < oldSheet.rows.length; j++) {
        const oldRow = oldSheet.rows[j];
        const newRow = newSheet.rows[j];
        
        if (oldRow.length !== newRow.length) {
          console.log(`📝 Cambio en "${oldSheet.title}" fila ${j + 1}: número de columnas diferente`);
          return true;
        }
        
        for (let k = 0; k < oldRow.length; k++) {
          if (oldRow[k] !== newRow[k]) {
            console.log(`📝 Cambio en "${oldSheet.title}" celda [${j + 1},${k + 1}]`);
            return true;
          }
        }
      }
    }
    
    console.log('✅ No hay cambios');
    return false;
  }
  
  async sync() {
    try {
      console.log('\n🔄 Iniciando sincronización...');
      const startTime = Date.now();
      
      const currentContent = await this.getSheetContent();
      const lastContent = await this.getLastSyncContent();
      const hasChanges = this.compareContent(lastContent, currentContent);
      
      if (!hasChanges) {
        console.log('✅ Sincronización completada - sin cambios');
        return { success: true, changed: false, duration: Date.now() - startTime };
      }
      
      console.log('📥 Descargando actualización...');
      await this.downloadExcel();
      this.saveCurrentContent(currentContent);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Sincronización completada en ${duration}ms`);
      return { success: true, changed: true, duration };
    } catch (error) {
      console.error('❌ Error en sync():', error.message);
      return { success: false, error: error.message };
    }
  }
  
  async forceSync() {
    try {
      console.log('\n🔄 Forzando sincronización...');
      const startTime = Date.now();
      
      const currentContent = await this.getSheetContent();
      console.log('📥 Descargando...');
      await this.downloadExcel();
      this.saveCurrentContent(currentContent);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Sincronización completada en ${duration}ms`);
      return { success: true, duration };
    } catch (error) {
      console.error('❌ Error en forceSync():', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SheetSync;
