// ============================================
// CONSIGNAEASY - APP-ADMIN.JS
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
            alert('Configura la URL del Google Apps Script primero');
            return null;
        }

        try {
            const response = await fetch(CONFIG.appsScriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, ...data })
            });

            const result = await response.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('Error en API:', error);
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

    async addProduct(category, name, price) {
        const result = await this.call('addProduct', { category, name, price });
        if (result) Cache.clear();
        return result;
    },

    async addVendor(id, name, commission) {
        const result = await this.call('addVendor', { id, name, commission });
        if (result) Cache.clear();
        return result;
    },

    async addMovement(date, vendor, product, type, quantity) {
        const result = await this.call('addMovement', { date, vendor, product, type, quantity });
        if (result) Cache.clear();
        return result;
    },

    async updateInventory(vendor, product, quantity) {
        const result = await this.call('updateInventory', { vendor, product, quantity });
        if (result) Cache.clear();
        return result;
    }
};

// ============================================
// UTILS
// ============================================

const Utils = {
    formatCurrency(value) {
        return '$' + parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    getCurrentDate() {
        const d = new Date();
        return d.toISOString().split('T')[0];
    },
    formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }
};

// ============================================
// APP
// ============================================

const App = {
    async init() {
        this.setupEventListeners();
        await this.loadDashboard();
    },

    setupEventListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showPage(e.target.dataset.page);
            });
        });

        document.getElementById('express-vendor').addEventListener('change', (e) => {
            this.loadExpressVisit(e.target.value);
        });

        document.getElementById('product-search').addEventListener('input', (e) => {
            this.filterProducts(e.target.value);
        });

        document.getElementById('sales-search').addEventListener('input', (e) => {
            this.filterExpressSales(e.target.value);
        });

        document.getElementById('inventory-vendor-filter').addEventListener('change', (e) => {
            this.loadInventory(e.target.value);
        });
    },

    showPage(pageName) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(pageName).classList.add('active');

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

        if (pageName === 'vendors') this.loadVendors();
        if (pageName === 'products') this.loadProducts();
        if (pageName === 'express') this.loadExpressVendors();
        if (pageName === 'inventory') this.loadInventoryFilter();
    },

    // ============================================
    // DASHBOARD
    // ============================================

    async loadDashboard() {
        const vendors = await API.getVendors();
        const products = await API.getProducts();
        const movements = await API.getMovements();

        document.getElementById('stat-vendors').textContent = vendors.length;
        document.getElementById('stat-products').textContent = products.length;
        document.getElementById('stat-movements').textContent = movements.length;

        let totalSales = 0;
        movements.forEach(m => {
            if (m.type === 'venta') {
                const product = products.find(p => p.name === m.product);
                if (product) {
                    totalSales += m.quantity * product.price;
                }
            }
        });

        document.getElementById('stat-sales').textContent = Utils.formatCurrency(totalSales);
        this.renderRecentMovements(movements.slice(-10));
    },

    renderRecentMovements(movements) {
        const container = document.getElementById('recent-movements');
        
        if (movements.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">No hay movimientos</div></div>';
            return;
        }

        container.innerHTML = movements.reverse().map(m => `
            <div class="movement-card">
                <div class="movement-header">
                    <div class="movement-vendor">${m.vendor}</div>
                    <div class="movement-date">${Utils.formatDate(m.date)}</div>
                </div>
                <div class="movement-details">
                    <div class="movement-detail-item">
                        <div class="movement-detail-label">${m.type === 'venta' ? 'Vendido' : 'Restock'}</div>
                        <div class="movement-detail-value">${m.product} (${m.quantity})</div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // ============================================
    // VENDEDORES
    // ============================================

    showVendorForm() {
        document.getElementById('vendor-form').style.display = 'block';
        document.getElementById('vendor-id').focus();
    },

    hideVendorForm() {
        document.getElementById('vendor-form').style.display = 'none';
        document.getElementById('vendor-id').value = '';
        document.getElementById('vendor-name').value = '';
        document.getElementById('vendor-commission').value = '';
    },

    async saveVendor() {
        const id = document.getElementById('vendor-id').value.trim();
        const name = document.getElementById('vendor-name').value.trim();
        const commission = parseFloat(document.getElementById('vendor-commission').value) || 0;

        if (!id || !name) {
            alert('Completa todos los campos');
            return;
        }

        await API.addVendor(id, name, commission);
        this.hideVendorForm();
        this.loadVendors();
        this.loadExpressVendors();
    },

    async loadVendors() {
        const vendors = await API.getVendors();
        const container = document.getElementById('vendors-list');

        if (vendors.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">No hay vendedores</div></div>';
            return;
        }

        container.innerHTML = vendors.map(v => `
            <div class="list-item">
                <div class="list-item-content">
                    <div class="list-item-title">${v.name}</div>
                    <div class="list-item-subtitle">ID: ${v.id} | Comisión: ${v.commission}%</div>
                </div>
            </div>
        `).join('');
    },

    // ============================================
    // PRODUCTOS
    // ============================================

    showImportForm() {
        document.getElementById('import-form').style.display = 'block';
    },

    hideImportForm() {
        document.getElementById('import-form').style.display = 'none';
        document.getElementById('csv-file').value = '';
    },

    async importCSV() {
        const file = document.getElementById('csv-file').files[0];
        if (!file) {
            alert('Selecciona un archivo CSV');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const csv = e.target.result;
            const lines = csv.trim().split('\n');
            let imported = 0;

            for (let i = 1; i < lines.length; i++) {
                const [category, name, price] = lines[i].split(',').map(s => s.trim());
                if (name && price) {
                    await API.addProduct(category, name, parseFloat(price));
                    imported++;
                }
            }

            alert(`Se importaron ${imported} productos`);
            this.hideImportForm();
            this.loadProducts();
            this.loadExpressVisit(document.getElementById('express-vendor').value);
        };
        reader.readAsText(file);
    },

    showProductForm() {
        document.getElementById('product-form').style.display = 'block';
    },

    hideProductForm() {
        document.getElementById('product-form').style.display = 'none';
        document.getElementById('product-category').value = '';
        document.getElementById('product-name').value = '';
        document.getElementById('product-price').value = '';
    },

    async saveProduct() {
        const category = document.getElementById('product-category').value.trim();
        const name = document.getElementById('product-name').value.trim();
        const price = parseFloat(document.getElementById('product-price').value) || 0;

        if (!category || !name || !price) {
            alert('Completa todos los campos');
            return;
        }

        await API.addProduct(category, name, price);
        this.hideProductForm();
        this.loadProducts();
    },

    async loadProducts(filter = '') {
        const products = await API.getProducts();
        const container = document.getElementById('products-list');

        let filtered = products;
        if (filter) {
            filtered = products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">No hay productos</div></div>';
            return;
        }

        const grouped = {};
        filtered.forEach(p => {
            if (!grouped[p.category]) grouped[p.category] = [];
            grouped[p.category].push(p);
        });

        let html = '';
        Object.keys(grouped).sort().forEach(category => {
            html += `<h3>${category}</h3>`;
            html += grouped[category].map(p => `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">${p.name}</div>
                        <div class="list-item-subtitle">Precio: ${Utils.formatCurrency(p.price)}</div>
                    </div>
                </div>
            `).join('');
        });

        container.innerHTML = html;
    },

    filterProducts(query) {
        this.loadProducts(query);
    },

    // ============================================
    // INVENTARIO
    // ============================================

    async loadInventoryFilter() {
        const vendors = await API.getVendors();
        const select = document.getElementById('inventory-vendor-filter');

        select.innerHTML = '<option value="">-- Todos los vendedores --</option>';
        vendors.forEach(v => {
            const option = document.createElement('option');
            option.value = v.id;
            option.textContent = v.name;
            select.appendChild(option);
        });
    },

    async loadInventory(vendorId = '') {
        const inventory = await API.getInventory(vendorId);
        const vendors = await API.getVendors();
        const products = await API.getProducts();
        const container = document.getElementById('inventory-list');

        if (inventory.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">No hay inventario</div></div>';
            return;
        }

        container.innerHTML = inventory.map(inv => {
            const product = products.find(p => p.name === inv.product);
            const vendor = vendors.find(v => v.id === inv.vendor || v.name === inv.vendor);
            return `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">${inv.product}</div>
                        <div class="list-item-subtitle">
                            Vendedor: ${vendor ? vendor.name : inv.vendor} | 
                            Cantidad: ${inv.quantity} | 
                            Precio: ${product ? Utils.formatCurrency(product.price) : 'N/A'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ============================================
    // EXPRESS VISIT
    // ============================================

    async loadExpressVendors() {
        const vendors = await API.getVendors();
        const select = document.getElementById('express-vendor');

        select.innerHTML = '<option value="">-- Selecciona vendedor --</option>';
        vendors.forEach(v => {
            const option = document.createElement('option');
            option.value = v.id;
            option.textContent = v.name;
            select.appendChild(option);
        });
    },

    async loadExpressVisit(vendorId) {
        if (!vendorId) {
            document.getElementById('express-content').style.display = 'none';
            return;
        }

        const products = await API.getProducts();
        const vendors = await API.getVendors();
        const vendor = vendors.find(v => v.id === vendorId);
        const inventory = await API.getInventory(vendorId);

        document.getElementById('express-commission-pct').textContent = vendor.commission;

        // Renderizar ventas
        let salesHtml = '';
        products.forEach(p => {
            const inv = inventory.find(i => i.product === p.name);
            const current = inv ? inv.quantity : 0;
            salesHtml += `
                <div class="product-row">
                    <div class="product-info">
                        <div class="product-name">${p.name}</div>
                        <div class="product-category">${p.category}</div>
                        <div class="product-current">Esperado: ${current}</div>
                    </div>
                    <div class="product-inputs">
                        <input type="number" class="input-qty sales-qty" data-product="${p.name}" data-price="${p.price}" inputmode="numeric" min="0" value="0" onchange="App.updateExpressTotals()">
                    </div>
                </div>
            `;
        });
        document.getElementById('express-sales').innerHTML = salesHtml;

        // Renderizar restock
        let restockHtml = '';
        products.forEach(p => {
            restockHtml += `
                <div class="product-row">
                    <div class="product-info">
                        <div class="product-name">${p.name}</div>
                        <div class="product-category">${p.category}</div>
                    </div>
                    <div class="product-inputs">
                        <input type="number" class="input-qty restock-qty" data-product="${p.name}" inputmode="numeric" min="0" value="0" onchange="App.updateExpressTotals()">
                    </div>
                </div>
            `;
        });
        document.getElementById('express-restock').innerHTML = restockHtml;

        document.getElementById('express-content').style.display = 'block';
        this.updateExpressTotals();
    },

    filterExpressSales(query) {
        const rows = document.querySelectorAll('#express-sales .product-row');
        rows.forEach(row => {
            const name = row.querySelector('.product-name').textContent.toLowerCase();
            row.style.display = name.includes(query.toLowerCase()) ? 'flex' : 'none';
        });
    },

    updateExpressTotals() {
        const vendorId = document.getElementById('express-vendor').value;
        let totalSales = 0;

        document.querySelectorAll('.sales-qty').forEach(input => {
            const qty = parseInt(input.value) || 0;
            const price = parseFloat(input.dataset.price) || 0;
            totalSales += qty * price;
        });

        API.getVendors().then(vendors => {
            const vendor = vendors.find(v => v.id === vendorId);
            const commission = totalSales * (vendor.commission / 100);
            const toPay = totalSales - commission;

            document.getElementById('express-total-sales').textContent = Utils.formatCurrency(totalSales);
            document.getElementById('express-commission').textContent = Utils.formatCurrency(commission);
            document.getElementById('express-to-pay').textContent = Utils.formatCurrency(toPay);
        });
    },

    async saveExpressVisit() {
        const vendorId = document.getElementById('express-vendor').value;
        const vendors = await API.getVendors();
        const vendor = vendors.find(v => v.id === vendorId);

        if (!vendor) {
            alert('Selecciona un vendedor');
            return;
        }

        const date = Utils.getCurrentDate();

        // Registrar ventas
        document.querySelectorAll('.sales-qty').forEach(async (input) => {
            const qty = parseInt(input.value) || 0;
            if (qty > 0) {
                await API.addMovement(date, vendor.name, input.dataset.product, 'venta', qty);
            }
        });

        // Registrar restock
        document.querySelectorAll('.restock-qty').forEach(async (input) => {
            const qty = parseInt(input.value) || 0;
            if (qty > 0) {
                await API.addMovement(date, vendor.name, input.dataset.product, 'restock', qty);
            }
        });

        alert('✓ Visita guardada correctamente');
        document.getElementById('express-vendor').value = '';
        document.getElementById('express-content').style.display = 'none';
        this.loadDashboard();
    },

    // ============================================
    // CONFIGURACIÓN
    // ============================================

    saveScriptUrl() {
        const url = document.getElementById('apps-script-url').value.trim();
        if (!url) {
            alert('Ingresa la URL del Google Apps Script');
            return;
        }

        CONFIG.appsScriptUrl = url;
        localStorage.setItem('appsScriptUrl', url);
        alert('✓ URL guardada correctamente');
    },

    async syncData() {
        Cache.clear();
        await this.loadDashboard();
        alert('✓ Datos sincronizados');
    },

    clearCache() {
        if (!confirm('¿Limpiar cache local?')) return;
        Cache.clear();
        alert('✓ Cache limpiado');
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
