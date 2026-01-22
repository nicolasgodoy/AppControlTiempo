/**
 * App Principal - Punto de entrada de la aplicación
 */
import dataManager from './data-manager.js';
import UIController from './ui-controller.js';

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Configurar toggle de tema PRIMERO para que responda siempre
    setupThemeToggle();

    // 2. Detectar si queremos modo local (vía URL ?local=true)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('local') === 'true') {
        dataManager.setLocalMode(true);
        console.log("🛠️ Modo Local activado (usando data.json)");
    }

    // 3. Crear instancia del controlador de UI
    const uiController = new UIController(dataManager);
    window.uiController = uiController; // Exponer globalmente para cross-access

    // 4. Inicializar datos
    try {
        await uiController.initialize();
    } catch (e) {
        console.error("Error al inicializar datos:", e);
    }

    // 5. Demás listeners
    setupModalListeners(uiController);
    setupDataManagement();
});

/**
 * Configura los event listeners del modal
 */
function setupModalListeners(uiController) {
    const modal = document.getElementById('addTimeModal');
    const btnClose = document.querySelector('.modal-close');
    const btnCancel = document.getElementById('btnCancelTime');
    const btnSave = document.getElementById('btnSaveTime');

    // Cerrar modal con X
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            uiController.closeAddTimeModal();
        });
    }

    // Cerrar modal con botón Cancelar
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            uiController.closeAddTimeModal();
        });
    }

    // Guardar tiempo
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            uiController.saveAddedTime();
        });
    }

    // Cerrar modal al hacer click fuera
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                uiController.closeAddTimeModal();
            }
        });
    }

    // Guardar con Enter en el input
    const hoursInput = document.getElementById('hoursInput');
    if (hoursInput) {
        hoursInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                uiController.saveAddedTime();
            }
        });
    }
}

/**
 * Configura la gestión de datos (exportar/importar)
 */
function setupDataManagement() {
    const btnExport = document.getElementById('btnExport');
    const btnExportExcel = document.getElementById('btnExportExcel');
    const btnImport = document.getElementById('btnImport');
    const fileInput = document.getElementById('fileInput');

    // Exportar datos a JSON
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            dataManager.exportToJSON();
        });
    }

    // Exportar datos a Excel (CSV)
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => {
            dataManager.exportToExcel();
        });
    }

    // Importar datos
    if (btnImport && fileInput) {
        btnImport.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await dataManager.importFromJSON(file);
                    location.reload(); // Recargar para mostrar nuevos datos
                } catch (error) {
                    alert('Error al importar datos: ' + error.message);
                }
            }
        });
    }
}

/**
 * Configura el toggle de tema oscuro/claro
 */
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.querySelector('.theme-icon');

    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (themeIcon) themeIcon.textContent = '☀️';
    }

    // Toggle al hacer click
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');

            const isLightMode = document.body.classList.contains('light-mode');
            if (themeIcon) {
                themeIcon.textContent = isLightMode ? '☀️' : '🌙';
            }

            // Guardar preferencia
            localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
        });
    }
}
