// ============================================
// CONSIGNAEASY - APP-VENDOR.JS
// Panel de Vendedor (Solo Lectura)
// ============================================

let CONFIG = {
    appsScriptUrl: localStorage.getItem('appsScriptUrl') || '',
    currentVendor: null,
    cacheExpiry: 5 * 60 * 1000
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
            alert('Error de configuración. Contacta al administrador.');
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

    async getInventory(vendorId) {
        const inventory = await this.call('getInventory', { vendorId });
        return inventory || [];
    },

    async getMovements() {
        let movements = Cache.getData('movements');
        if (movements) return movements;

        movements = await this.call('getMovements');
        if (movements) Cache.setData('movements', movements);
        return movements || [];
    }
};

// ============================================
// UTILS
// ============================================

const Utils = {
    formatCurrency(value) {
        return '$' + parseFloat(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    },
    isThisMonth(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    },
    isThisWeek(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return d >= startOfWeek && d <= endOfWeek;
    }
};

// ============================================
// APP
// ============================================

const App = {
    async init() {
        this.setupEventListeners();
        await this.loadVendorList();
    },

    setupEventListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showPage(e.target.dataset.page);
            });
        });
    },

    // ============================================
    // LOGIN
    // ============================================

    async loadVendorList() {
        const vendors = await API.getVendors();
        const select = document.getElementById('vendor-select');

        select.innerHTML = '<option value="">-- Selecciona tu código --</option>';
        vendors.forEach(v => {
            const option = document.createElement('option');
            option.value = v.id;
            option.textContent = `${v.name} (${v.id})`;
            select.appendChild(option);
        });
    },

    async loginVendor() {
        const vendorId = document.getElementById('vendor-select').value;
        if (!vendorId) {
            alert('Selecciona tu código de vendedor');
            return;
        }

        const vendors = await API.getVendors();
        const vendor = vendors.find(v => v.id === vendorId);

        if (!vendor) {
            alert('Vendedor no encontrado');
            return;
        }

        CONFIG.currentVendor = vendor;
        localStorage.setItem('currentVendor', JSON.stringify(vendor));

        // Mostrar panel de vendedor
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('nav-section').style.display = 'flex';
        document.getElementById('main-section').style.display = 'block';

        // Actualizar header
        document.querySelector('.header-subtitle').textContent = `Hola, ${vendor.name}`;

        // Cargar datos
        this.loadMyInventory();
    },

    logout() {
        CONFIG.currentVendor = null;
        localStorage.removeItem('currentVendor');

        document.getElementById('login-section').style.display = 'block';
        document.getElementById('nav-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'none';

        document.querySelector('.header-subtitle').textContent = 'Mi Inventario';
        document.getElementById('vendor-select').value = '';

        this.loadVendorList();
    },

    // ============================================
    // PAGES
    // ============================================

    showPage(pageName) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(pageName).classList.add('active');

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

        if (pageName === 'my-inventory') this.loadMyInventory();
        if (pageName === 'my-sales') this.loadMySales();
        if (pageName === 'my-info') this.loadMyInfo();
    },

    // ============================================
    // MI INVENTARIO
    // ============================================

    async loadMyInventory() {
        const vendor = CONFIG.currentVendor;
        const inventory = await API.getInventory(vendor.id);
        const products = await API.getProducts();
        const container = document.getElementById('my-inventory-list');

        if (inventory.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">No hay inventario asignado</div></div>';
            return;
        }

        container.innerHTML = inventory.map(inv => {
            const product = products.find(p => p.name === inv.product);
            const status = inv.quantity > 5 ? 'good' : inv.quantity > 0 ? 'warning' : 'critical';
            const statusText = inv.quantity > 5 ? '✓ Bien' : inv.quantity > 0 ? '⚠️ Bajo' : '❌ Agotado';

            return `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">${inv.product}</div>
                        <div class="list-item-subtitle">
                            Cantidad: ${inv.quantity} | 
                            Precio: ${product ? Utils.formatCurrency(product.price) : 'N/A'} | 
                            ${statusText}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ============================================
    // MIS VENTAS
    // ============================================

    async loadMySales() {
        const vendor = CONFIG.currentVendor;
        const movements = await API.getMovements();
        const products = await API.getProducts();
        const period = document.getElementById('sales-period').value;

        // Filtrar ventas del vendedor
        let sales = movements.filter(m => m.type === 'venta' && m.vendor === vendor.name);

        // Filtrar por período
        if (period === 'month') {
            sales = sales.filter(m => Utils.isThisMonth(m.date));
        } else if (period === 'week') {
            sales = sales.filter(m => Utils.isThisWeek(m.date));
        }

        const container = document.getElementById('my-sales-list');

        if (sales.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No hay ventas en este período</div></div>';
            this.updateMySalesSummary([], products);
            return;
        }

        container.innerHTML = sales.map(sale => {
            const product = products.find(p => p.name === sale.product);
            const saleTotal = sale.quantity * (product ? product.price : 0);

            return `
                <div class="list-item">
                    <div class="list-item-content">
                        <div class="list-item-title">${sale.product}</div>
                        <div class="list-item-subtitle">
                            ${sale.quantity} unidades × ${product ? Utils.formatCurrency(product.price) : 'N/A'} = ${Utils.formatCurrency(saleTotal)} | 
                            ${Utils.formatDate(sale.date)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.updateMySalesSummary(sales, products);
    },

    updateMySalesSummary(sales, products) {
        const vendor = CONFIG.currentVendor;
        let totalSales = 0;

        sales.forEach(sale => {
            const product = products.find(p => p.name === sale.product);
            if (product) {
                totalSales += sale.quantity * product.price;
            }
        });

        const commission = totalSales * (vendor.commission / 100);
        const toReceive = totalSales - commission;

        document.getElementById('my-total-sales').textContent = Utils.formatCurrency(totalSales);
        document.getElementById('my-commission').textContent = Utils.formatCurrency(commission);
        document.getElementById('my-to-receive').textContent = Utils.formatCurrency(toReceive);
    },

    // ============================================
    // MI INFORMACIÓN
    // ============================================

    async loadMyInfo() {
        const vendor = CONFIG.currentVendor;
        const inventory = await API.getInventory(vendor.id);
        const movements = await API.getMovements();
        const products = await API.getProducts();

        // Información básica
        document.getElementById('my-name').textContent = vendor.name;
        document.getElementById('my-id').textContent = vendor.id;
        document.getElementById('my-commission-pct').textContent = `${vendor.commission}%`;

        // Estadísticas
        document.getElementById('my-product-count').textContent = inventory.length;

        let totalValue = 0;
        const mySales = movements.filter(m => m.type === 'venta' && m.vendor === vendor.name);
        mySales.forEach(sale => {
            const product = products.find(p => p.name === sale.product);
            if (product) {
                totalValue += sale.quantity * product.price;
            }
        });

        document.getElementById('my-total-value').textContent = Utils.formatCurrency(totalValue);
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Verificar si hay sesión guardada
    const savedVendor = localStorage.getItem('currentVendor');
    if (savedVendor) {
        CONFIG.currentVendor = JSON.parse(savedVendor);
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('nav-section').style.display = 'flex';
        document.getElementById('main-section').style.display = 'block';
        document.querySelector('.header-subtitle').textContent = `Hola, ${CONFIG.currentVendor.name}`;
        App.loadMyInventory();
    } else {
        App.init();
    }
});
