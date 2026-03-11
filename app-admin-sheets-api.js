// ============================================
// CONSIGNAEASY - GOOGLE SHEETS API
// Lee directamente de Google Sheets sin CORS
// ============================================

const SPREADSHEET_ID = '1087dwmhk12RM-YFRYxKO2VEO2DPIkTRjNbhokm9GDJA';
const API_KEY = 'AIzaSyDZHqKpKm_0qDVLzVMEVqKCvPFPL7oCZKE'; // Public API key

const SHEETS = {
    PRODUCTOS: 'PRODUCTOS!A:C',
    VENDEDORES: 'VENDEDORES!A:C',
    INVENTARIO: 'INVENTARIO!A:C',
    MOVIMIENTOS: 'MOVIMIENTOS!A:E'
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
        if (Date.now() - timestamp > 5 * 60 * 1000) {
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
// GOOGLE SHEETS API
// ============================================

const SheetsAPI = {
    async getRange(range) {
        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data.values || [];
        } catch (error) {
            console.error('Error en getRange:', error);
            return [];
        }
    },

    async appendRow(sheetName, values) {
        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:Z:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [values]
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error en appendRow:', error);
            return false;
        }
    },

    async updateCell(sheetName, row, col, value) {
        try {
            const colLetter = String.fromCharCode(65 + col);
            const cell = `${sheetName}!${colLetter}${row}`;
            
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${cell}?valueInputOption=USER_ENTERED&key=${API_KEY}`;
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [[value]]
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error en updateCell:', error);
            return false;
        }
    }
};

// ============================================
// FUNCIONES CRUD - LECTURA
// ============================================

async function loadProducts() {
    try {
        const cached = Cache.getData('products');
        if (cached) {
            console.log('📦 Productos desde cache');
            appState.products = cached;
            return cached;
        }

        const data = await SheetsAPI.getRange(SHEETS.PRODUCTOS);
        const products = [];
        
        for (let i = 1; i < data.length; i++) {
            if (data[i][1]) {
                products.push({
                    categoria: String(data[i][0] || '').trim(),
                    producto: String(data[i][1]).trim(),
                    precio: parseFloat(data[i][2]) || 0
                });
            }
        }
        
        Cache.setData('products', products);
        appState.products = products;
        console.log('✅ Productos cargados:', products.length);
        return products;
    } catch (error) {
        console.error('Error en loadProducts:', error);
        return [];
    }
}

async function loadVendors() {
    try {
        const cached = Cache.getData('vendors');
        if (cached) {
            console.log('📦 Vendedores desde cache');
            appState.vendors = cached;
            return cached;
        }

        const data = await SheetsAPI.getRange(SHEETS.VENDEDORES);
        const vendors = [];
        
        for (let i = 1; i < data.length; i++) {
            if (data[i][0]) {
                vendors.push({
                    id: String(data[i][0]).trim(),
                    nombre: String(data[i][1] || '').trim(),
                    comision: parseFloat(data[i][2]) || 0
                });
            }
        }
        
        Cache.setData('vendors', vendors);
        appState.vendors = vendors;
        console.log('✅ Vendedores cargados:', vendors.length);
        return vendors;
    } catch (error) {
        console.error('Error en loadVendors:', error);
        return [];
    }
}

async function loadInventory() {
    try {
        const cached = Cache.getData('inventory');
        if (cached) {
            console.log('📦 Inventario desde cache');
            appState.inventory = cached;
            return cached;
        }

        const data = await SheetsAPI.getRange(SHEETS.INVENTARIO);
        const inventory = [];
        
        for (let i = 1; i < data.length; i++) {
            if (data[i][0]) {
                inventory.push({
                    vendedor: String(data[i][0]).trim(),
                    producto: String(data[i][1]).trim(),
                    cantidad: parseInt(data[i][2]) || 0
                });
            }
        }
        
        Cache.setData('inventory', inventory);
        appState.inventory = inventory;
        console.log('✅ Inventario cargado:', inventory.length);
        return inventory;
    } catch (error) {
        console.error('Error en loadInventory:', error);
        return [];
    }
}

async function loadMovements() {
    try {
        const cached = Cache.getData('movements');
        if (cached) {
            console.log('📦 Movimientos desde cache');
            appState.movements = cached;
            return cached;
        }

        const data = await SheetsAPI.getRange(SHEETS.MOVIMIENTOS);
        const movements = [];
        
        for (let i = 1; i < data.length; i++) {
            if (data[i][0]) {
                movements.push({
                    fecha: String(data[i][0] || '').trim(),
                    vendedor: String(data[i][1]).trim(),
                    producto: String(data[i][2]).trim(),
                    tipo: String(data[i][3] || '').trim(),
                    cantidad: parseInt(data[i][4]) || 0
                });
            }
        }
        
        Cache.setData('movements', movements);
        appState.movements = movements;
        console.log('✅ Movimientos cargados:', movements.length);
        return movements;
    } catch (error) {
        console.error('Error en loadMovements:', error);
        return [];
    }
}

// ============================================
// FUNCIONES CRUD - ESCRITURA
// ============================================

async function addVendor(id, nombre, comision) {
    try {
        const success = await SheetsAPI.appendRow('VENDEDORES', [id, nombre, comision]);
        if (success) {
            Cache.clear();
            await loadVendors();
            showSuccess('✅ Vendedor agregado');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error en addVendor:', error);
        showError('Error al agregar vendedor');
        return false;
    }
}

async function addProduct(categoria, producto, precio) {
    try {
        const success = await SheetsAPI.appendRow('PRODUCTOS', [categoria, producto, precio]);
        if (success) {
            Cache.clear();
            await loadProducts();
            showSuccess('✅ Producto agregado');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error en addProduct:', error);
        showError('Error al agregar producto');
        return false;
    }
}

async function addMovement(fecha, vendedor, producto, tipo, cantidad) {
    try {
        const success = await SheetsAPI.appendRow('MOVIMIENTOS', [fecha, vendedor, producto, tipo, cantidad]);
        if (success) {
            Cache.clear();
            await loadMovements();
            await updateInventoryLocal(vendedor, producto, tipo, cantidad);
            showSuccess('✅ Movimiento registrado');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error en addMovement:', error);
        showError('Error al registrar movimiento');
        return false;
    }
}

async function updateInventoryLocal(vendedor, producto, tipo, cantidad) {
    try {
        const data = await SheetsAPI.getRange(SHEETS.INVENTARIO);
        
        // Buscar registro existente
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === vendedor && data[i][1] === producto) {
                const currentQty = parseInt(data[i][2]) || 0;
                const newQty = tipo === 'restock' ? currentQty + cantidad : currentQty - cantidad;
                
                await SheetsAPI.updateCell('INVENTARIO', i + 1, 2, Math.max(0, newQty));
                Cache.clear();
                await loadInventory();
                return;
            }
        }
        
        // Si no existe, crear nuevo registro
        const qty = tipo === 'restock' ? cantidad : -cantidad;
        await SheetsAPI.appendRow('INVENTARIO', [vendedor, producto, Math.max(0, qty)]);
        Cache.clear();
        await loadInventory();
    } catch (error) {
        console.error('Error en updateInventoryLocal:', error);
    }
}

// ============================================
// UI UTILITIES
// ============================================

function showError(msg) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = msg;
        errorDiv.classList.add('show');
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 5000);
    }
}

function showSuccess(msg) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = msg;
        successDiv.classList.add('show');
        setTimeout(() => {
            successDiv.classList.remove('show');
        }, 3000);
    }
}

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard() {
    try {
        await Promise.all([
            loadProducts(),
            loadVendors(),
            loadMovements(),
            loadInventory()
        ]);

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

        document.getElementById('vendor-count').textContent = vendorCount;
        document.getElementById('product-count').textContent = productCount;
        document.getElementById('movement-count').textContent = movementCount;
        document.getElementById('total-sales').textContent = '$' + totalSales.toFixed(2);

        console.log('📊 Dashboard actualizado');
    } catch (error) {
        console.error('Error en loadDashboard:', error);
    }
}

// ============================================
// VENDEDORES
// ============================================

async function displayVendors() {
    const vendors = await loadVendors();
    const container = document.getElementById('vendors-list');
    
    if (!vendors || vendors.length === 0) {
        container.innerHTML = '<p>No hay vendedores. Crea uno primero.</p>';
        return;
    }

    container.innerHTML = vendors.map(v => `
        <div class="product-row">
            <div class="product-info">
                <strong>${v.nombre}</strong>
                <p>ID: ${v.id} | Comisión: ${v.comision}%</p>
            </div>
        </div>
    `).join('');
}

async function handleAddVendor() {
    const id = document.getElementById('vendor-id').value.trim();
    const nombre = document.getElementById('vendor-nombre').value.trim();
    const comision = document.getElementById('vendor-comision').value.trim();

    if (!id || !nombre || !comision) {
        showError('Completa todos los campos');
        return;
    }

    const success = await addVendor(id, nombre, parseFloat(comision));
    if (success) {
        document.getElementById('vendor-id').value = '';
        document.getElementById('vendor-nombre').value = '';
        document.getElementById('vendor-comision').value = '';
        await displayVendors();
        await loadExpressVisit();
    }
}

// ============================================
// PRODUCTOS
// ============================================

async function displayProducts() {
    const products = await loadProducts();
    const container = document.getElementById('products-list');
    
    if (!products || products.length === 0) {
        container.innerHTML = '<p>No hay productos. Importa o crea uno.</p>';
        return;
    }

    container.innerHTML = products.map(p => `
        <div class="product-row">
            <div class="product-info">
                <strong>${p.producto}</strong>
                <p>${p.categoria} - $${p.precio}</p>
            </div>
        </div>
    `).join('');
}

async function handleAddProduct() {
    const categoria = document.getElementById('product-categoria').value.trim();
    const producto = document.getElementById('product-nombre').value.trim();
    const precio = document.getElementById('product-precio').value.trim();

    if (!producto || !precio) {
        showError('Completa los campos requeridos');
        return;
    }

    const success = await addProduct(categoria, producto, parseFloat(precio));
    if (success) {
        document.getElementById('product-categoria').value = '';
        document.getElementById('product-nombre').value = '';
        document.getElementById('product-precio').value = '';
        await displayProducts();
        await loadExpressVisit();
    }
}

// ============================================
// EXPRESS VISIT
// ============================================

async function loadExpressVisit() {
    const vendors = await loadVendors();
    const select = document.getElementById('express-vendor');
    
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Selecciona un vendedor --</option>';
    vendors.forEach(v => {
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

    const products = await loadProducts();
    const inventory = await loadInventory();

    const grouped = {};
    products.forEach(p => {
        const cat = p.categoria || 'Sin categoría';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(p);
    });

    let html = '<div class="visit-form">';
    
    Object.keys(grouped).forEach(category => {
        html += `<h4>${category}</h4>`;
        grouped[category].forEach(p => {
            const currentStock = inventory.find(i => i.vendedor === vendorId && i.producto === p.producto)?.cantidad || 0;
            html += `
                <div class="product-row">
                    <div class="product-info">
                        <strong>${p.producto}</strong>
                        <p>Precio: $${p.precio} | Stock actual: ${currentStock}</p>
                    </div>
                    <div class="product-inputs">
                        <input type="number" class="sold-qty" data-product="${p.producto}" data-price="${p.precio}" placeholder="Vendido" min="0" value="0">
                        <input type="number" class="restock-qty" data-product="${p.producto}" placeholder="Restock" min="0" value="0">
                    </div>
                </div>
            `;
        });
    });

    html += '</div>';
    html += '<button class="btn btn-success" onclick="completeExpressVisit(\'' + vendorId + '\')">✅ Guardar Visita</button>';

    const container = document.getElementById('express-products');
    if (container) {
        container.innerHTML = html;
        container.style.display = 'block';
    }
}

async function completeExpressVisit(vendorId) {
    const fecha = new Date().toISOString().split('T')[0];
    const vendor = appState.vendors.find(v => v.id === vendorId);
    
    if (!vendor) {
        showError('Vendedor no encontrado');
        return;
    }

    let totalSales = 0;
    const movements = [];

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
        }
    });

    if (movements.length === 0) {
        showError('Registra al menos una venta o restock');
        return;
    }

    for (let movement of movements) {
        await addMovement(movement.fecha, movement.vendedor, movement.producto, movement.tipo, movement.cantidad);
    }

    const commission = (totalSales * vendor.comision) / 100;
    const amountToPay = totalSales - commission;

    let summaryHtml = `
        <div class="visit-summary">
            <h3>📋 Resumen de Visita</h3>
            <p><strong>Vendedor:</strong> ${vendor.nombre}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
            <p><strong>Total ventas:</strong> $${totalSales.toFixed(2)}</p>
            <p><strong>Comisión (${vendor.comision}%):</strong> $${commission.toFixed(2)}</p>
            <p style="font-weight: bold; color: #667eea;"><strong>Monto a pagar:</strong> $${amountToPay.toFixed(2)}</p>
        </div>
    `;

    const container = document.getElementById('express-products');
    if (container) {
        container.innerHTML = summaryHtml;
    }
    
    await loadDashboard();
}

// ============================================
// INVENTARIO
// ============================================

async function displayInventory() {
    const inventory = await loadInventory();
    const vendors = await loadVendors();
    const products = await loadProducts();

    const container = document.getElementById('inventory-list');
    
    if (!inventory || inventory.length === 0) {
        container.innerHTML = '<p>No hay inventario registrado.</p>';
        return;
    }

    let html = '<table class="table"><thead><tr><th>Vendedor</th><th>Producto</th><th>Stock</th></tr></thead><tbody>';
    
    inventory.forEach(item => {
        const vendor = vendors.find(v => v.id === item.vendedor);
        
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
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando ConsignaEasy Admin (Sheets API)...');
    await loadDashboard();
    await loadExpressVisit();
    await displayVendors();
    await displayProducts();
});
