# Google Sheets to Excel Sync <img src="https://www.svgrepo.com/show/223056/sheets-sheet.svg"  width="25" height="25"> <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" alt="Node.js" width="25" height="25"> <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" alt="Docker" width="25" height="25">

Sistema automatizado para sincronizar Google Sheets a Excel usando Node.js y Docker. Monitorea cambios en tiempo real y descarga actualizaciones automáticamente.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-27%2B-blue?logo=docker&logoColor=white)
![Google Sheets API](https://img.shields.io/badge/Google_Sheets_API-v4-4285F4?logo=google&logoColor=white)
![Google Drive API](https://img.shields.io/badge/Google_Drive_API-v3-4285F4?logo=google&logoColor=white)
![node-cron](https://img.shields.io/badge/node--cron-3.0.3-orange?logo=npm&logoColor=white)

## 🎯 ¿Qué hace?

Este sistema:
- **Descarga automáticamente** tu Google Sheet completa como archivo XLSX
- **Detecta cambios** comparando el contenido actual con el anterior (celda por celda)
- **Ejecuta sincronización programada** a intervalos configurables (default: cada 15 minutos)
- **Preserva formato** descargando el archivo nativo desde Google Drive
- **Maneja todas las hojas** de tu Google Sheet automáticamente
- **Genera logs detallados** para monitorear el proceso
- **Corre en Docker** sin necesidad de instalar Node.js localmente
- **Configurable** - elige dónde guardar archivos y cómo nombrarlos

### 📁 Archivos generados

- `current_sheet.xlsx` - La última versión descargada de tu Google Sheet
- `last_content.json` - Estado anterior para detectar cambios

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

**En Linux/Mac:**
```env
# ID de tu Google Sheet (de la URL)
SPREADSHEET_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p

# Credenciales de Google Cloud Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=google-sheets-sync@my-project.iam.gserviceaccount.com

# Clave privada (reemplazar \n con saltos de línea)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE....\n-----END PRIVATE KEY-----\n"

# Intervalo de sincronización en minutos (optional, default: 15)
SYNC_EVERY_MINUTES=15

# Carpeta de salida (ruta absoluta o relativa)
OUTPUT_DIR=/home/usuario/datos/sheets
OUTPUT_FILE_NAME=mi_hoja_datos.xlsx
```

**En Windows:**
```env
# ID de tu Google Sheet (de la URL)
SPREADSHEET_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p

# Credenciales de Google Cloud Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=google-sheets-sync@my-project.iam.gserviceaccount.com

# Clave privada (reemplazar \n con saltos de línea)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE....\n-----END PRIVATE KEY-----\n"

# Intervalo de sincronización en minutos (optional, default: 15)
SYNC_EVERY_MINUTES=15

# Carpeta de salida (usa \ o / ambas funcionan)
OUTPUT_DIR=C:\Users\Usuario\Documents\sheets
OUTPUT_FILE_NAME=mi_hoja_datos.xlsx

# Alternativas válidas:
# OUTPUT_DIR=D:/datos/excel
# OUTPUT_DIR=\\servidor\compartido\sheets
```

### 3. Variables de entorno

| Variable | Descripción | Default | Ejemplo |
|----------|-------------|---------|---------|
| `SPREADSHEET_ID` | ID de tu Google Sheet | - | `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email de Service Account | - | `google-sheets-sync@my-project.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Clave privada (formato JSON) | - | `-----BEGIN PRIVATE KEY-----\n...` |
| `SYNC_EVERY_MINUTES` | Intervalo de sincronización | `15` | `5`, `30`, `60` |
| `OUTPUT_DIR` | Carpeta donde guardar archivos | `./output` | `/home/user/datos` o `C:\data` |
| `OUTPUT_FILE_NAME` | Nombre del archivo Excel | `current_sheet.xlsx` | `datos_excel.xlsx` |

### 4. Obtener credenciales de Google Cloud

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

### 5. Obtener el ID de tu Google Sheet

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
# Iniciar el servicio en background (se ejecuta cada N minutos)
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

### Cambiar ubicación de salida

En el archivo `.env`:

**Linux/Mac:**
```env
OUTPUT_DIR=/ruta/externa/sheets
OUTPUT_FILE_NAME=datos_$(date +%Y%m%d).xlsx
```

**Windows:**
```env
OUTPUT_DIR=D:\datos\excel
OUTPUT_FILE_NAME=datos_excel.xlsx
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
├── output/                     # Carpeta por defecto (configurable)
│   ├── current_sheet.xlsx      # Descarga más reciente
│   └── last_content.json       # Estado anterior
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

### ❌ "Los archivos no se guardan en OUTPUT_DIR"
- **Causa**: Docker no tiene acceso a la carpeta externa
- **Solución**: Verificar que el path en `OUTPUT_DIR` es correcto y accesible

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
- ✨ Guardar descargas en ubicación personalizada (USB, servidor, nube)

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
docker-compose run --rm sheets-sync env | grep -E "OUTPUT|SYNC"

# Verificar si los archivos se generaron
docker-compose run --rm sheets-sync ls -la /app/output
```

---

## 📄 Licencia

GPL-3.0 - Libre para usar y modificar
