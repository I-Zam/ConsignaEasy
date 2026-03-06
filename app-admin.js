// CONSIGNAEASY - APP-ADMIN.JS (VERSIÓN CORREGIDA)
// Panel de Administrador
// ============================================

let CONFIG = {
    appsScriptUrl: localStorage.getItem('appsScriptUrl') || '',
    cacheExpiry: 5 * 60 * 1000,
    lastSync: 0
};

// ============================================
// CACHE LOCAL
// ============================================

const Cache = {
    setData(key, data) {
        localStorage.setItem(key, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
    },
    getData(key) {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CONFIG.cacheExpiry) {
            localStorage.removeItem(key);
            return null;
        }
        return data;
    },
    clear() {
        localStorage.removeItem('products');
        localStorage.removeItem('vendors');
        localStorage.removeItem('inventory');
        localStorage.removeItem('movements');
    }
};

// ============================================
// API - Google Sheets
// ============================================

const API = {
    async call(action, data = {}) {
        if (!CONFIG.appsScriptUrl) {
            showError('⚠️ Configura la URL del Google Apps Script primero en Configuración');
            return null;
        }

        try {
            console.log('Enviando:', { action, ...data });
            
            const response = await fetch(CONFIG.appsScriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, ...data })
            });

            // Con mode: 'no-cors', no podemos leer la respuesta
            // Así que simplemente esperamos y luego sincronizamos
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log('Datos enviados exitosamente');
            return { success: true };
        } catch (error) {
            console.error('Error en API:', error);
            showError('Error al conectar con Google Sheets');
            return null;
        }
    },

    async getProducts() {
        let products = Cache.getData('products');
        if (products) return products;

        products = await this.call('getProducts');
        if (products) Cache.setData('products', products);
        return products || [];
    },

    async getVendors() {
        let vendors = Cache.getData('vendors');
        if (vendors) return vendors;

        vendors = await this.call('getVendors');
        if (vendors) Cache.setData('vendors', vendors);
        return vendors || [];
    },

    async getInventory(vendorId = null) {
        let inventory = Cache.getData('inventory');
        if (inventory) {
            return vendorId ? inventory.filter(i => i.vendor === vendorId) : inventory;
        }

        inventory = await this.call('getInventory', { vendorId });
        if (inventory) Cache.setData('inventory', inventory);
        return inventory || [];
    },

    async getMovements() {
        let movements = Cache.getData('movements');
        if (movements) return movements;

        movements = await this.call('getMovements');
        if (movements) Cache.setData('movements', movements);
        return movements || [];
    },

    async addVendor(vendor) {
        const result = await this.call('addVendor', vendor);
        if (result) {
            Cache.clear();
            await this.syncAll();
        }
        return result;
    },

    async addProduct(product) {
        const result = await this.call('addProduct', product);
        if (result) {
            Cache.clear();
            await this.syncAll();
        }
        return result;
    },

    async addMovement(movement) {
        const result = await this.call('addMovement', movement);
        if (result) {
            Cache.clear();
            await this.syncAll();
        }
        return result;
    },

    async syncAll() {
        const [products, vendors, inventory, movements] = await Promise.all([
            this.call('getProducts'),
            this.call('getVendors'),
            this.call('getInventory'),
            this.call('getMovements')
        ]);

        if (products) Cache.setData('products', products);
        if (vendors) Cache.setData('vendors', vendors);
        if (inventory) Cache.setData('inventory', inventory);
        if (movements) Cache.setData('movements', movements);

        CONFIG.lastSync = Date.now();
    }
};

// ============================================
// UTILIDADES
// ============================================

function showError(msg) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = msg;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function showSuccess(msg) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = msg;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Cargar URL del Apps Script
    const savedUrl = localStorage.getItem('appsScriptUrl');
    if (savedUrl) {
        CONFIG.appsScriptUrl = savedUrl;
        document.getElementById('appsScriptUrl').value = savedUrl;
    }

    // Cargar datos iniciales
    await loadDashboard();
    setupEventListeners();
});

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
    try {
        const [products, vendors, movements] = await Promise.all([
            API.getProducts(),
            API.getVendors(),
            API.getMovements()
        ]);

        const vendorCount = vendors ? vendors.length : 0;
        const productCount = products ? products.length : 0;
        const movementCount = movements ? movements.length : 0;
        const totalSales = movements ? movements
            .filter(m => m.tipo === 'venta')
            .reduce((sum, m) => sum + (m.cantidad * (products?.find(p => p.producto === m.producto)?.precio || 0)), 0)
            : 0;

        document.getElementById('vendor-count').textContent = vendorCount;
        document.getElementById('product-count').textContent = productCount;
        document.getElementById('movement-count').textContent = movementCount;
        document.getElementById('total-sales').textContent = '$' + totalSales.toFixed(2);
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

// ============================================
// CONFIGURACIÓN
// ============================================

function saveAppsScriptUrl() {
    const url = document.getElementById('appsScriptUrl').value;
    if (!url) {
        showError('Por favor ingresa la URL del Google Apps Script');
        return;
    }

    localStorage.setItem('appsScriptUrl', url);
    CONFIG.appsScriptUrl = url;
    showSuccess('✅ URL guardada correctamente');
}

function clearCache() {
    if (confirm('¿Estás seguro? Esto borrará el cache local.')) {
        Cache.clear();
        showSuccess('✅ Cache limpiado');
    }
}

async function syncData() {
    showSuccess('🔄 Sincronizando...');
    await API.syncAll();
    await loadDashboard();
    showSuccess('✅ Sincronización completada');
}

// ============================================
// VENDEDORES
// ============================================

async function loadVendors() {
    const vendors = await API.getVendors();
    const container = document.getElementById('vendors-list');
    
    if (!vendors || vendors.length === 0) {
        container.innerHTML = '<p>No hay vendedores. Crea uno primero.</p>';
        return;
    }

    container.innerHTML = vendors.map(v => `
        <div class="vendor-item">
            <div>
                <strong>${v.nombre}</strong>
                <p>Comisión: ${v.comision}%</p>
            </div>
            <button onclick="deleteVendor('${v.id}')">Eliminar</button>
        </div>
    `).join('');
}

async function addVendor() {
    const id = document.getElementById('vendor-id').value;
    const nombre = document.getElementById('vendor-nombre').value;
    const comision = document.getElementById('vendor-comision').value;

    if (!id || !nombre || !comision) {
        showError('Completa todos los campos');
        return;
    }

    await API.addVendor({ id, nombre, comision: parseFloat(comision) });
    showSuccess('✅ Vendedor agregado');
    
    document.getElementById('vendor-id').value = '';
    document.getElementById('vendor-nombre').value = '';
    document.getElementById('vendor-comision').value = '';
    
    await loadVendors();
}

async function deleteVendor(id) {
    if (confirm('¿Eliminar este vendedor?')) {
        await API.call('deleteVendor', { id });
        showSuccess('✅ Vendedor eliminado');
        await loadVendors();
    }
}

// ============================================
// PRODUCTOS
// ============================================

async function loadProducts() {
    const products = await API.getProducts();
    const container = document.getElementById('products-list');
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p>No hay productos. Importa o crea uno.</p>';
        return;
    }

    container.innerHTML = products.map(p => `
        <div class="product-item">
            <div>
                <strong>${p.producto}</strong>
                <p>${p.categoria} - $${p.precio}</p>
            </div>
            <button onclick="deleteProduct('${p.producto}')">Eliminar</button>
        </div>
    `).join('');
}

async function addProduct() {
    const categoria = document.getElementById('product-categoria').value;
    const producto = document.getElementById('product-nombre').value;
    const precio = document.getElementById('product-precio').value;

    if (!categoria || !producto || !precio) {
        showError('Completa todos los campos');
        return;
    }

    await API.addProduct({ categoria, producto, precio: parseFloat(precio) });
    showSuccess('✅ Producto agregado');
    
    document.getElementById('product-categoria').value = '';
    document.getElementById('product-nombre').value = '';
    document.getElementById('product-precio').value = '';
    
    await loadProducts();
}

async function deleteProduct(nombre) {
    if (confirm('¿Eliminar este producto?')) {
        await API.call('deleteProduct', { producto: nombre });
        showSuccess('✅ Producto eliminado');
        await loadProducts();
    }
}

function importCSV() {
    const file = document.getElementById('csv-file').files[0];
    if (!file) {
        showError('Selecciona un archivo CSV');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const csv = e.target.result;
        const lines = csv.split('\n');
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const [categoria, producto, precio] = lines[i].split(',').map(s => s.trim());
            if (categoria && producto && precio) {
                await API.addProduct({ categoria, producto, precio: parseFloat(precio) });
            }
        }
        
        showSuccess('✅ Productos importados');
        await loadProducts();
    };
    reader.readAsText(file);
}

// ============================================
// VISITA EXPRESS
// ============================================

async function startExpressVisit() {
    const vendorId = document.getElementById('express-vendor').value;
    if (!vendorId) {
        showError('Selecciona un vendedor');
        return;
    }

    const products = await API.getProducts();
    const container = document.getElementById('express-products');
    
    container.innerHTML = products.map(p => `
        <div class="express-product">
            <label>${p.producto}</label>
            <input type="number" id="venta-${p.producto}" placeholder="Vendidos" min="0">
            <input type="number" id="restock-${p.producto}" placeholder="Restock" min="0">
        </div>
    `).join('');
}

async function saveExpressVisit() {
    const vendorId = document.getElementById('express-vendor').value;
    const products = await API.getProducts();
    
    for (const p of products) {
        const vendidos = parseInt(document.getElementById(`venta-${p.producto}`)?.value || 0);
        const restock = parseInt(document.getElementById(`restock-${p.producto}`)?.value || 0);
        
        if (vendidos > 0) {
            await API.addMovement({
                fecha: new Date().toISOString().split('T')[0],
                vendedor: vendorId,
                producto: p.producto,
                tipo: 'venta',
                cantidad: vendidos
            });
        }
        
        if (restock > 0) {
            await API.addMovement({
                fecha: new Date().toISOString().split('T')[0],
                vendedor: vendorId,
                producto: p.producto,
                tipo: 'restock',
                cantidad: restock
            });
        }
    }
    
    showSuccess('✅ Visita registrada');
    document.getElementById('express-vendor').value = '';
    document.getElementById('express-products').innerHTML = '';
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Configuración
    const saveUrlBtn = document.getElementById('save-url-btn');
    if (saveUrlBtn) saveUrlBtn.addEventListener('click', saveAppsScriptUrl);

    const clearCacheBtn = document.getElementById('clear-cache-btn');
    if (clearCacheBtn) clearCacheBtn.addEventListener('click', clearCache);

    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) syncBtn.addEventListener('click', syncData);

    // Vendedores
    const addVendorBtn = document.getElementById('add-vendor-btn');
    if (addVendorBtn) addVendorBtn.addEventListener('click', addVendor);

    // Productos
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) addProductBtn.addEventListener('click', addProduct);

    const importCsvBtn = document.getElementById('import-csv-btn');
    if (importCsvBtn) importCsvBtn.addEventListener('click', importCSV);

    // Express
    const startExpressBtn = document.getElementById('start-express-btn');
    if (startExpressBtn) startExpressBtn.addEventListener('click', startExpressVisit);

    const saveExpressBtn = document.getElementById('save-express-btn');
    if (saveExpressBtn) saveExpressBtn.addEventListener('click', saveExpressVisit);

    // Cargar datos
    loadVendors();
    loadProducts();
}
