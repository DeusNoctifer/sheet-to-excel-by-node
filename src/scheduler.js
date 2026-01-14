// scheduler.js
require('dotenv').config();
const cron = require('node-cron');

const SYNC_MINUTES = parseInt(process.env.SYNC_EVERY_MINUTES) || 15;
const cronExpression = `*/${SYNC_MINUTES} * * * *`;

console.log('🔧 Scheduler Google Sheets Sync');
console.log('='.repeat(50));
console.log(`⏰ Intervalo: cada ${SYNC_MINUTES} minutos`);
console.log('='.repeat(50));

async function executeSync() {
    const startTime = new Date();
    console.log(`\n[${startTime.toLocaleTimeString()}] 🔄 Sincronizando...`);
    
    try {
        delete require.cache[require.resolve('./sync-intelligent.js')];
        const SheetSync = require('./sync-intelligent.js');
        const sync = new SheetSync();
        
        const result = await sync.sync();
        
        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        
        if (result.success) {
            if (result.changed) {
                console.log(`[${endTime.toLocaleTimeString()}] ✅ Sincronizado en ${duration.toFixed(1)}s`);
                console.log(`   📑 Hojas: ${result.sheetsProcessed || 'N/A'}`);
            } else {
                console.log(`[${endTime.toLocaleTimeString()}] 📭 Sin cambios (${duration.toFixed(1)}s)`);
            }
        } else {
            console.error(`[${endTime.toLocaleTimeString()}] ❌ Error: ${result.error}`);
        }
        
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] 💥 Error: ${error.message}`);
    }
}

// Ejecutar inmediatamente
executeSync();

// Programar ejecuciones futuras
const task = cron.schedule(cronExpression, () => {
    executeSync();
});

console.log(`\n✅ Scheduler activo. Próxima ejecución en ~${SYNC_MINUTES} minutos.`);

process.on('SIGINT', () => {
    console.log('\n👋 Deteniendo scheduler...');
    task.stop();
    process.exit(0);
});