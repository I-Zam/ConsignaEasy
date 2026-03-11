// ============================================
// CONSIGNAEASY - APP-VENDOR.JS (REFACTORIZADO)
// Panel de Vendedor (Solo Lectura)
// ============================================

const CONFIG = {
    appsScriptUrl: localStorage.getItem('appsScriptUrl') || '',
    currentVendor: null,
    cacheExpiry: 5 * 60 * 1000
};

let appState = {
    vendors: [],
    products: [],
    inventory: [],
    movements: []
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
    }
};

// ============================================
// API - Google Sheets
// ============================================

const API = {
    async call(action, data = {}) {
        if (!CONFIG.appsScriptUrl) {
            showError('Error de configuración. Contacta al administrador.');
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
            showError('Error al conectar: ' + error.message);
            return null;
        }
    },

    async getProducts() {
        let cached = Cache.getData('products');
        if (cached) return cached;

        const result = await this.call('getProducts');
        if (result && result.success) {
            Cache.setData('products', result.data);
            return result.data || [];
        }
        return [];
    },

    async getVendors() {
        let cached = Cache.getData('vendors');
        if (cached) return cached;

        const result = await this.call('getVendors');
        if (result && result.success) {
            Cache.setData('vendors', result.data);
            return result.data || [];
        }
        return [];
    },

    async getInventory(vendorId) {
        const result = await this.call('getInventory', { vendedor: vendorId });
        if (result && result.success) {
            return result.data || [];
        }
        return [];
    },

    async getMovements(vendorId) {
        const result = await this.call('getMovements', { vendedor: vendorId });
        if (result && result.success) {
            return result.data || [];
        }
        return [];
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

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando ConsignaEasy Vendor...');
    
    // Cargar URL del Apps Script
    const savedUrl = localStorage.getItem('appsScriptUrl');
    if (savedUrl) {
        CONFIG.appsScriptUrl = savedUrl;
    }

    // Cargar datos
    await loadVendorSelection();
});

// ============================================
// SELECCIÓN DE VENDEDOR
// ============================================

async function loadVendorSelection() {
    appState.vendors = await API.getVendors();
    const container = document.getElementById('vendor-selection');
    
    if (!appState.vendors || appState.vendors.length === 0) {
        container.innerHTML = '<p>No hay vendedores disponibles.</p>';
        return;
    }

    let html = '<div class="vendor-grid">';
    
    appState.vendors.forEach(v => {
        html += `
            <div class="vendor-card" onclick="selectVendor('${v.id}')">
                <h3>${v.nombre}</h3>
                <p>Código: ${v.id}</p>
                <p>Comisión: ${v.comision}%</p>
                <button class="btn btn-primary">Ver Detalles</button>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

async function selectVendor(vendorId) {
    CONFIG.currentVendor = vendorId;
    const vendor = appState.vendors.find(v => v.id === vendorId);
    
    if (!vendor) {
        showError('Vendedor no encontrado');
        return;
    }

    localStorage.setItem('currentVendor', vendorId);
    
    // Ocultar selección y mostrar panel
    document.getElementById('vendor-selection').style.display = 'none';
    document.getElementById('vendor-panel').style.display = 'block';
    
    // Cargar datos del vendedor
    await loadVendorDashboard(vendor);
}

function backToSelection() {
    CONFIG.currentVendor = null;
    localStorage.removeItem('currentVendor');
    
    document.getElementById('vendor-selection').style.display = 'block';
    document.getElementById('vendor-panel').style.display = 'none';
}

// ============================================
// DASHBOARD DEL VENDEDOR
// ============================================

async function loadVendorDashboard(vendor) {
    try {
        const inventory = await API.getInventory(vendor.id);
        const movements = await API.getMovements(vendor.id);
        appState.products = await API.getProducts();

        // Actualizar encabezado
        const headerName = document.getElementById('vendor-name');
        if (headerName) headerName.textContent = vendor.nombre;

        // Calcular estadísticas
        const totalItems = inventory.reduce((sum, item) => sum + item.cantidad, 0);
        const totalSales = movements
            .filter(m => m.tipo === 'venta')
            .reduce((sum, m) => {
                const product = appState.products.find(p => p.producto === m.producto);
                return sum + (m.cantidad * (product?.precio || 0));
            }, 0);

        const totalRestocks = movements
            .filter(m => m.tipo === 'restock')
            .reduce((sum, m) => sum + m.cantidad, 0);

        // Actualizar cards
        const totalItemsEl = document.getElementById('total-items');
        const totalSalesEl = document.getElementById('total-sales');
        const totalRestocksEl = document.getElementById('total-restocks');

        if (totalItemsEl) totalItemsEl.textContent = totalItems;
        if (totalSalesEl) totalSalesEl.textContent = '$' + totalSales.toFixed(2);
        if (totalRestocksEl) totalRestocksEl.textContent = totalRestocks;

        // Cargar tablas
        await loadInventoryTable(vendor.id, inventory);
        await loadMovementsTable(vendor.id, movements);

        console.log('✅ Dashboard del vendedor cargado');
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        showError('Error al cargar datos');
    }
}

// ============================================
// INVENTARIO
// ============================================

async function loadInventoryTable(vendorId, inventory) {
    const container = document.getElementById('inventory-table');
    
    if (!inventory || inventory.length === 0) {
        container.innerHTML = '<p>No hay inventario registrado.</p>';
        return;
    }

    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Stock</th>
                    <th>Precio</th>
                    <th>Valor Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    let totalValue = 0;

    inventory.forEach(item => {
        const product = appState.products.find(p => p.producto === item.producto);
        const price = product?.precio || 0;
        const value = item.cantidad * price;
        totalValue += value;

        html += `
            <tr>
                <td>${item.producto}</td>
                <td>${item.cantidad}</td>
                <td>$${price.toFixed(2)}</td>
                <td>$${value.toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        <div style="text-align: right; padding: 15px; background: #f5f5f5; border-radius: 6px; margin-top: 10px;">
            <strong>Valor Total del Inventario: $${totalValue.toFixed(2)}</strong>
        </div>
    `;

    container.innerHTML = html;
}

// ============================================
// MOVIMIENTOS
// ============================================

async function loadMovementsTable(vendorId, movements) {
    const container = document.getElementById('movements-table');
    
    if (!movements || movements.length === 0) {
        container.innerHTML = '<p>No hay movimientos registrados.</p>';
        return;
    }

    // Agrupar por fecha
    const grouped = {};
    movements.forEach(m => {
        if (!grouped[m.fecha]) grouped[m.fecha] = [];
        grouped[m.fecha].push(m);
    });

    let html = '';

    Object.keys(grouped).sort().reverse().forEach(fecha => {
        const dayMovements = grouped[fecha];
        let dayTotal = 0;

        html += `
            <div class="movement-day">
                <h4>📅 ${fecha}</h4>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Tipo</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        dayMovements.forEach(m => {
            const product = appState.products.find(p => p.producto === m.producto);
            const price = product?.precio || 0;
            const total = m.cantidad * price;
            
            if (m.tipo === 'venta') {
                dayTotal += total;
            }

            const typeLabel = m.tipo === 'venta' ? '📤 Venta' : '📥 Restock';
            const typeColor = m.tipo === 'venta' ? '#e74c3c' : '#27ae60';

            html += `
                <tr>
                    <td>${m.producto}</td>
                    <td><span style="color: ${typeColor}; font-weight: bold;">${typeLabel}</span></td>
                    <td>${m.cantidad}</td>
                    <td>$${price.toFixed(2)}</td>
                    <td>$${total.toFixed(2)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
        `;

        if (dayTotal > 0) {
            html += `
                <div style="text-align: right; padding: 10px; background: #fff3cd; border-radius: 4px; margin-bottom: 20px;">
                    <strong>Ventas del día: $${dayTotal.toFixed(2)}</strong>
                </div>
            `;
        }

        html += '</div>';
    });

    container.innerHTML = html;
}

// ============================================
// UTILIDADES
// ============================================

async function refreshData() {
    if (!CONFIG.currentVendor) {
        showError('Selecciona un vendedor primero');
        return;
    }

    const vendor = appState.vendors.find(v => v.id === CONFIG.currentVendor);
    if (vendor) {
        showSuccess('🔄 Actualizando...');
        await loadVendorDashboard(vendor);
        showSuccess('✅ Datos actualizados');
    }
}

// Restaurar vendedor si estaba seleccionado
window.addEventListener('load', async () => {
    const savedVendor = localStorage.getItem('currentVendor');
    if (savedVendor) {
        appState.vendors = await API.getVendors();
        const vendor = appState.vendors.find(v => v.id === savedVendor);
        if (vendor) {
            await selectVendor(savedVendor);
        }
    }
});
