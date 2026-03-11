// ============================================
// CONSIGNAEASY - APP-ADMIN.JS (REFACTORIZADO)
// Lógica del panel de administrador
// ============================================

// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================

const CONFIG = {
    appsScriptUrl: localStorage.getItem('appsScriptUrl') || '',
    cacheExpiry: 5 * 60 * 1000, // 5 minutos
    lastSync: 0
};

let appState = {
    vendors: [],
    products: [],
    inventory: [],
    movements: [],
    currentVisit: null
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
        localStorage.removeItem('vendors');
        localStorage.removeItem('products');
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
            showError('⚠️ Configura la URL del Google Apps Script primero');
            return null;
        }

        try {
            console.log('📤 Enviando:', { action, ...data });
            
            const response = await fetch(CONFIG.appsScriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, ...data })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('📥 Respuesta:', result);
            
            return result;
        } catch (error) {
            console.error('❌ Error en API:', error);
            showError('Error al conectar con Google Sheets: ' + error.message);
            return null;
        }
    },

    async getVendors() {
        let cached = Cache.getData('vendors');
        if (cached) {
            console.log('📦 Vendedores desde cache');
            return cached;
        }

        const result = await this.call('getVendors');
        if (result && result.success) {
            Cache.setData('vendors', result.data);
            return result.data || [];
        }
        return [];
    },

    async getProducts() {
        let cached = Cache.getData('products');
        if (cached) {
            console.log('📦 Productos desde cache');
            return cached;
        }

        const result = await this.call('getProducts');
        if (result && result.success) {
            Cache.setData('products', result.data);
            return result.data || [];
        }
        return [];
    },

    async getInventory() {
        let cached = Cache.getData('inventory');
        if (cached) {
            console.log('📦 Inventario desde cache');
            return cached;
        }

        const result = await this.call('getAllInventory');
        if (result && result.success) {
            Cache.setData('inventory', result.data);
            return result.data || [];
        }
        return [];
    },

    async getMovements() {
        let cached = Cache.getData('movements');
        if (cached) {
            console.log('📦 Movimientos desde cache');
            return cached;
        }

        const result = await this.call('getAllMovements');
        if (result && result.success) {
            Cache.setData('movements', result.data);
            return result.data || [];
        }
        return [];
    },

    async addVendor(vendor) {
        const result = await this.call('addVendor', vendor);
        if (result && result.success) {
            Cache.clear();
            await this.syncAll();
            return true;
        }
        return false;
    },

    async addProduct(product) {
        const result = await this.call('addProduct', product);
        if (result && result.success) {
            Cache.clear();
            await this.syncAll();
            return true;
        }
        return false;
    },

    async addMovement(movement) {
        const result = await this.call('addMovement', movement);
        if (result && result.success) {
            Cache.clear();
            await this.syncAll();
            return true;
        }
        return false;
    },

    async getVisitSummary(vendedor, fecha) {
        const result = await this.call('getVisitSummary', { vendedor, fecha });
        if (result && result.success) {
            return result.data;
        }
        return null;
    },

    async syncAll() {
        console.log('🔄 Sincronizando todos los datos...');
        const [vendors, products, inventory, movements] = await Promise.all([
            this.call('getVendors'),
            this.call('getProducts'),
            this.call('getAllInventory'),
            this.call('getAllMovements')
        ]);

        if (vendors && vendors.success) {
            appState.vendors = vendors.data || [];
            Cache.setData('vendors', appState.vendors);
        }
        if (products && products.success) {
            appState.products = products.data || [];
            Cache.setData('products', appState.products);
        }
        if (inventory && inventory.success) {
            appState.inventory = inventory.data || [];
            Cache.setData('inventory', appState.inventory);
        }
        if (movements && movements.success) {
            appState.movements = movements.data || [];
            Cache.setData('movements', appState.movements);
        }

        CONFIG.lastSync = Date.now();
        console.log('✅ Sincronización completada');
    }
};

// ============================================
// UTILIDADES UI
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

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
    const btn = event.target;
    if (btn) {
        btn.classList.add('active');
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando ConsignaEasy Admin...');
    
    // Cargar URL del Apps Script
    const savedUrl = localStorage.getItem('appsScriptUrl');
    if (savedUrl) {
        CONFIG.appsScriptUrl = savedUrl;
        const urlInput = document.getElementById('appsScriptUrl');
        if (urlInput) urlInput.value = savedUrl;
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
        appState.vendors = await API.getVendors();
        appState.products = await API.getProducts();
        appState.movements = await API.getMovements();

        const vendorCount = appState.vendors.length;
        const productCount = appState.products.length;
        const movementCount = appState.movements.length;
        
        let totalSales = 0;
        appState.movements.forEach(m => {
            if (m.tipo === 'venta') {
                const product = appState.products.find(p => p.producto === m.producto);
                if (product) {
                    totalSales += m.cantidad * product.precio;
                }
            }
        });

        const vendorCountEl = document.getElementById('vendor-count');
        const productCountEl = document.getElementById('product-count');
        const movementCountEl = document.getElementById('movement-count');
        const totalSalesEl = document.getElementById('total-sales');

        if (vendorCountEl) vendorCountEl.textContent = vendorCount;
        if (productCountEl) productCountEl.textContent = productCount;
        if (movementCountEl) movementCountEl.textContent = movementCount;
        if (totalSalesEl) totalSalesEl.textContent = '$' + totalSales.toFixed(2);

        console.log('📊 Dashboard actualizado');
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showError('Error al cargar dashboard');
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
    updateAllSelects();
    showSuccess('✅ Sincronización completada');
}

// ============================================
// VENDEDORES
// ============================================

async function loadVendors() {
    appState.vendors = await API.getVendors();
    const container = document.getElementById('vendors-list');
    
    if (!appState.vendors || appState.vendors.length === 0) {
        container.innerHTML = '<p>No hay vendedores. Crea uno primero.</p>';
        return;
    }

    container.innerHTML = appState.vendors.map(v => `
        <div class="vendor-item">
            <div>
                <strong>${v.nombre}</strong>
                <p>ID: ${v.id} | Comisión: ${v.comision}%</p>
            </div>
        </div>
    `).join('');
}

async function addVendor() {
    const id = document.getElementById('vendor-id').value.trim();
    const nombre = document.getElementById('vendor-nombre').value.trim();
    const comision = document.getElementById('vendor-comision').value.trim();

    if (!id || !nombre || !comision) {
        showError('Completa todos los campos');
        return;
    }

    const success = await API.addVendor({ 
        id, 
        nombre, 
        comision: parseFloat(comision) 
    });

    if (success) {
        showSuccess('✅ Vendedor agregado');
        document.getElementById('vendor-id').value = '';
        document.getElementById('vendor-nombre').value = '';
        document.getElementById('vendor-comision').value = '';
        await loadVendors();
        updateAllSelects();
    } else {
        showError('Error al agregar vendedor');
    }
}

// ============================================
// PRODUCTOS
// ============================================

async function loadProducts() {
    appState.products = await API.getProducts();
    const container = document.getElementById('products-list');
    
    if (!appState.products || appState.products.length === 0) {
        container.innerHTML = '<p>No hay productos. Importa o crea uno.</p>';
        return;
    }

    container.innerHTML = appState.products.map(p => `
        <div class="product-item">
            <div>
                <strong>${p.producto}</strong>
                <p>${p.categoria} - $${p.precio}</p>
            </div>
        </div>
    `).join('');
}

async function addProduct() {
    const categoria = document.getElementById('product-categoria').value.trim();
    const producto = document.getElementById('product-nombre').value.trim();
    const precio = document.getElementById('product-precio').value.trim();

    if (!producto || !precio) {
        showError('Completa los campos requeridos');
        return;
    }

    const success = await API.addProduct({ 
        categoria, 
        producto, 
        precio: parseFloat(precio) 
    });

    if (success) {
        showSuccess('✅ Producto agregado');
        document.getElementById('product-categoria').value = '';
        document.getElementById('product-nombre').value = '';
        document.getElementById('product-precio').value = '';
        await loadProducts();
        updateAllSelects();
    } else {
        showError('Error al agregar producto');
    }
}

// ============================================
// EXPRESS VISIT - WORKFLOW COMPLETO
// ============================================

async function loadExpressVisit() {
    appState.vendors = await API.getVendors();
    const select = document.getElementById('express-vendor');
    
    select.innerHTML = '<option value="">-- Selecciona un vendedor --</option>';
    appState.vendors.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = `${v.nombre} (${v.comision}%)`;
        select.appendChild(option);
    });
}

async function startExpressVisit() {
    const vendorId = document.getElementById('express-vendor').value;
    if (!vendorId) {
        showError('Selecciona un vendedor');
        return;
    }

    appState.products = await API.getProducts();
    appState.inventory = await API.getInventory();

    // Agrupar productos por categoría
    const grouped = {};
    appState.products.forEach(p => {
        const cat = p.categoria || 'Sin categoría';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
    });

    // Generar HTML para entrada de datos
    let html = '<div class="visit-form">';
    
    Object.keys(grouped).forEach(category => {
        html += `<h4>${category}</h4>`;
        grouped[category].forEach(p => {
            const currentStock = appState.inventory.find(i => i.vendedor === vendorId && i.producto === p.producto)?.cantidad || 0;
            html += `
                <div class="product-row">
                    <div class="product-info">
                        <strong>${p.producto}</strong>
                        <p>Precio: $${p.precio} | Stock actual: ${currentStock}</p>
                    </div>
                    <div class="product-inputs">
                        <input type="number" class="sold-qty" data-product="${p.producto}" placeholder="Vendido" min="0" value="0">
                        <input type="number" class="restock-qty" data-product="${p.producto}" placeholder="Restock" min="0" value="0">
                    </div>
                </div>
            `;
        });
    });

    html += '</div>';
    html += '<button class="btn btn-success" onclick="completeExpressVisit(\'' + vendorId + '\')">✅ Guardar Visita</button>';

    document.getElementById('express-products').innerHTML = html;
    document.getElementById('express-products').style.display = 'block';
}

async function completeExpressVisit(vendorId) {
    const fecha = new Date().toISOString().split('T')[0];
    const vendor = appState.vendors.find(v => v.id === vendorId);
    
    if (!vendor) {
        showError('Vendedor no encontrado');
        return;
    }

    let totalSales = 0;
    let totalRestock = 0;
    const movements = [];

    // Procesar ventas
    document.querySelectorAll('.sold-qty').forEach(input => {
        const cantidad = parseInt(input.value) || 0;
        if (cantidad > 0) {
            const producto = input.dataset.product;
            const product = appState.products.find(p => p.producto === producto);
            
            movements.push({
                fecha,
                vendedor: vendorId,
                producto,
                tipo: 'venta',
                cantidad
            });
            
            if (product) {
                totalSales += cantidad * product.precio;
            }
        }
    });

    // Procesar restock
    document.querySelectorAll('.restock-qty').forEach(input => {
        const cantidad = parseInt(input.value) || 0;
        if (cantidad > 0) {
            const producto = input.dataset.product;
            
            movements.push({
                fecha,
                vendedor: vendorId,
                producto,
                tipo: 'restock',
                cantidad
            });
            
            totalRestock += cantidad;
        }
    });

    if (movements.length === 0) {
        showError('Registra al menos una venta o restock');
        return;
    }

    // Guardar todos los movimientos
    for (let movement of movements) {
        await API.addMovement(movement);
    }

    // Obtener resumen
    const summary = await API.getVisitSummary(vendorId, fecha);

    // Mostrar resumen
    let summaryHtml = `
        <div class="visit-summary">
            <h3>📋 Resumen de Visita</h3>
            <p><strong>Vendedor:</strong> ${vendor.nombre}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
            <p><strong>Productos vendidos:</strong> ${summary.totalSalesQty} unidades</p>
            <p><strong>Total ventas:</strong> $${summary.totalSales.toFixed(2)}</p>
            <p><strong>Comisión (${summary.vendorCommission}%):</strong> $${summary.commission.toFixed(2)}</p>
            <p style="font-weight: bold; color: #667eea;"><strong>Monto a pagar:</strong> $${summary.amountToPay.toFixed(2)}</p>
        </div>
    `;

    document.getElementById('express-products').innerHTML = summaryHtml;
    
    showSuccess('✅ Visita guardada correctamente');
    await loadDashboard();
    
    // Limpiar después de 3 segundos
    setTimeout(() => {
        document.getElementById('express-vendor').value = '';
        document.getElementById('express-products').style.display = 'none';
        document.getElementById('express-products').innerHTML = '';
    }, 3000);
}

// ============================================
// INVENTARIO
// ============================================

async function loadInventory() {
    appState.inventory = await API.getInventory();
    appState.vendors = await API.getVendors();
    appState.products = await API.getProducts();

    const container = document.getElementById('inventory-list');
    
    if (!appState.inventory || appState.inventory.length === 0) {
        container.innerHTML = '<p>No hay inventario registrado.</p>';
        return;
    }

    let html = '<table class="table"><thead><tr><th>Vendedor</th><th>Producto</th><th>Stock</th></tr></thead><tbody>';
    
    appState.inventory.forEach(item => {
        const vendor = appState.vendors.find(v => v.id === item.vendedor);
        const product = appState.products.find(p => p.producto === item.producto);
        
        html += `
            <tr>
                <td>${vendor?.nombre || item.vendedor}</td>
                <td>${item.producto}</td>
                <td>${item.cantidad}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ============================================
// PREPARAR VISITA
// ============================================

async function loadPrepareVisit() {
    appState.vendors = await API.getVendors();
    const select = document.getElementById('prepare-vendor');
    
    select.innerHTML = '<option value="">-- Selecciona un vendedor --</option>';
    appState.vendors.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = v.nombre;
        select.appendChild(option);
    });
}

async function showPrepareVisitDetails() {
    const vendorId = document.getElementById('prepare-vendor').value;
    if (!vendorId) {
        showError('Selecciona un vendedor');
        return;
    }

    appState.inventory = await API.getInventory();
    appState.products = await API.getProducts();
    appState.vendors = await API.getVendors();

    const vendor = appState.vendors.find(v => v.id === vendorId);
    const container = document.getElementById('prepare-details');

    let html = `<h3>📦 Preparar visita a ${vendor.nombre}</h3>`;
    html += '<table class="table"><thead><tr><th>Producto</th><th>Stock Esperado</th><th>Stock Actual</th><th>Llevar</th></tr></thead><tbody>';

    // Asumir que cada producto debe tener stock de 10 (configurable)
    const expectedStock = 10;

    appState.products.forEach(p => {
        const currentStock = appState.inventory.find(i => i.vendedor === vendorId && i.producto === p.producto)?.cantidad || 0;
        const toCarry = Math.max(0, expectedStock - currentStock);

        html += `
            <tr>
                <td>${p.producto}</td>
                <td>${expectedStock}</td>
                <td>${currentStock}</td>
                <td style="font-weight: bold; color: ${toCarry > 0 ? '#e74c3c' : '#27ae60'}">${toCarry}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ============================================
// UTILIDADES
// ============================================

async function updateAllSelects() {
    await loadExpressVisit();
    await loadPrepareVisit();
}

function setupEventListeners() {
    // Los event listeners se configuran desde el HTML
    console.log('✅ Event listeners configurados');
}
