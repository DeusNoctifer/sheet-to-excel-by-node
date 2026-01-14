# 📊 Google Sheets to Excel Sync

Sistema automatizado para sincronizar Google Sheets a Excel usando Node.js y Docker. Monitorea cambios en tiempo real y descarga actualizaciones automáticamente.

## 🎯 ¿Qué hace?

Este sistema:
- **Descarga automáticamente** tu Google Sheet completa como archivo XLSX
- **Detecta cambios** comparando el contenido actual con el anterior (celda por celda)
- **Ejecuta sincronización programada** a intervalos configurables (default: cada 15 minutos)
- **Preserva formato** descargando el archivo nativo desde Google Drive
- **Maneja todas las hojas** de tu Google Sheet automáticamente
- **Genera logs detallados** para monitorear el proceso
- **Corre en Docker** sin necesidad de instalar Node.js localmente

### 📁 Archivos generados

- `output/current_sheet.xlsx` - La última versión descargada de tu Google Sheet
- `output/last_content.json` - Estado anterior para detectar cambios

---

## 🚀 Instalación rápida

### 1. Prerrequisitos

- **Docker** instalado ([descargar](https://www.docker.com/products/docker-desktop))
- **Google Cloud Service Account** con acceso a:
  - Google Sheets API v4
  - Google Drive API v3
- **Google Sheet ID** de tu hoja compartida

### 2. Configurar credenciales

Crea un archivo `.env` en la raíz del proyecto:

```env
# ID de tu Google Sheet (de la URL)
SPREADSHEET_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p

# Credenciales de Google Cloud Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=google-sheets-sync@my-project.iam.gserviceaccount.com

# Clave privada (reemplazar \n con saltos de línea)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE....\n-----END PRIVATE KEY-----\n"

# Intervalo de sincronización en minutos (opcional, default: 15)
SYNC_EVERY_MINUTES=15
```

### 3. Obtener credenciales de Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto
3. Activa las APIs:
   - Google Sheets API
   - Google Drive API
4. Crea una **Service Account**:
   - Tipo: Service Account
   - Genera una clave JSON
5. Comparte tu Google Sheet con el email de la Service Account
6. Copia el `client_email` y `private_key` a tu `.env`

### 4. Obtener el ID de tu Google Sheet

En la URL de tu Google Sheet:
```
https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p/edit
                                       ^^^ Este es el ID
```

---

## 📖 Guía de uso

### Ejecutar sincronización manual

```bash
# Una sola sincronización (sin programación)
docker-compose run --rm sheets-sync node src/scheduler.js

# Forzar descarga sin verificar cambios
docker-compose run --rm sheets-sync node -e "
  require('dotenv').config();
  const SheetSync = require('./src/sync-intelligent.js');
  new SheetSync().forceSync();
"
```

### Ejecutar scheduler automático (recomendado)

```bash
# Iniciar el servicio en background (se ejecuta cada 15 min)
docker-compose up -d

# Ver logs en vivo
docker-compose logs -f sheets-sync

# Detener el servicio
docker-compose down
```

### Estado del servicio

```bash
# Ver si está corriendo
docker-compose ps

# Ver logs completos
docker-compose logs sheets-sync

# Ver últimas 50 líneas
docker-compose logs --tail=50 sheets-sync
```

### Cambiar intervalo de sincronización

En el archivo `.env`:
```env
# Cada 5 minutos
SYNC_EVERY_MINUTES=5

# Cada hora
SYNC_EVERY_MINUTES=60
```

Luego reinicia:
```bash
docker-compose restart sheets-sync
```

---

## 📊 Estructura del proyecto

```
sheet-to-excel-by-node/
├── src/
│   ├── sync-intelligent.js    # Lógica principal de sincronización
│   └── scheduler.js            # Programación con cron
├── output/
│   ├── current_sheet.xlsx      # Descarga más reciente
│   └── last_content.json       # Estado anterior (para detectar cambios)
├── docker-compose.yml          # Configuración de Docker
├── package.json                # Dependencias Node.js
├── .env                        # Credenciales (git-ignored)
└── README.md                   # Este archivo
```

---

## 🔧 Cómo funciona

### Flujo de sincronización

```
1. Obtener contenido actual de Google Sheet (API Sheets)
   └─> Metadata + valores de cada hoja

2. Comparar con estado anterior (last_content.json)
   └─> Detectar cambios: filas, columnas, celdas

3. Si hay cambios:
   └─> Descargar XLSX completo desde Google Drive
   └─> Guardar estado actual en last_content.json

4. Si sin cambios:
   └─> Skip de descarga (optimización)
```

### Detección de cambios

El sistema detecta automáticamente:
- ✅ Nuevas filas/columnas
- ✅ Filas/columnas eliminadas
- ✅ Celdas modificadas
- ✅ Cambios de título de hojas
- ✅ Hojas agregadas/eliminadas

---

## 📦 Dependencias

- **googleapis** - Cliente de Google APIs
- **node-cron** - Programación de tareas
- **dotenv** - Gestión de variables de entorno

---

## 🐛 Solución de problemas

### ❌ "Timeout en API"
- **Causa**: Google Sheet muy grande o conexión lenta
- **Solución**: Aumentar timeout en `src/sync-intelligent.js` o reducir `SYNC_EVERY_MINUTES`

### ❌ "Credenciales inválidas"
- **Causa**: `GOOGLE_PRIVATE_KEY` mal formateado
- **Solución**: Asegurar que los `\n` son literales (no espacios)

### ❌ "Spreadsheet no encontrado"
- **Causa**: `SPREADSHEET_ID` incorrecto o Sheet no compartida con Service Account
- **Solución**: Verificar ID y compartir Sheet con `GOOGLE_SERVICE_ACCOUNT_EMAIL`

### ❌ El contenedor no inicia
```bash
# Ver logs de error
docker-compose logs sheets-sync

# Reiniciar desde cero
docker-compose down
docker-compose up -d
```

---

## 💡 Casos de uso

- ✨ Mantener Excel sincronizado con datos en Google Sheets
- ✨ Automatizar reportes desde Google Sheets
- ✨ Backup automático de Google Sheets a XLSX
- ✨ Integración con procesos que consumen Excel

---

## 📝 Comandos útiles

```bash
# Construir imagen Docker
docker-compose build

# Ejecutar una sincronización de prueba
docker-compose run --rm sheets-sync node src/scheduler.js

# Acceder a la terminal del contenedor
docker-compose run --rm sheets-sync sh

# Eliminar todo (limpieza completa)
docker-compose down -v

# Ver variables de entorno en el contenedor
docker-compose run --rm sheets-sync env | grep SYNC
```

---

## 📄 Licencia

 GPL-3.0 - Libre para usar y modificar
