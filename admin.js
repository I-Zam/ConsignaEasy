// ============================================
// CONSIGNAEASY - ADMIN PANEL
// ============================================

let products = [];

// ============================================
// DASHBOARD
// ============================================

async function loadDashboard(){
    try {
        const vendors = await api("getVendors");
        const products = await api("getProducts");
        const movements = await api("getAllMovements");

        let total = 0;
        const priceMap = {};

        if(products && products.length > 0) {
            products.forEach(p => priceMap[p.producto] = p.precio);
        }

        if(movements && movements.length > 0) {
            movements.forEach(m => {
                if(m.tipo === "venta"){
                    total += m.cantidad * (priceMap[m.producto] || 0);
                }
            });
        }

        document.getElementById("dashboard").innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #667eea;">${vendors ? vendors.length : 0}</div>
                    <div style="color: #666; font-size: 12px;">Vendedores</div>
                </div>
                <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #667eea;">${products ? products.length : 0}</div>
                    <div style="color: #666; font-size: 12px;">Productos</div>
                </div>
                <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #667eea;">${movements ? movements.length : 0}</div>
                    <div style="color: #666; font-size: 12px;">Movimientos</div>
                </div>
                <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; color: #667eea;">$${total.toFixed(2)}</div>
                    <div style="color: #666; font-size: 12px;">Ventas</div>
                </div>
            </div>
        `;

        loadVendorSelect();

    } catch(e) {
        console.error("Error en loadDashboard:", e);
        document.getElementById("dashboard").innerHTML = "<p style='color: red;'>Error al cargar dashboard</p>";
    }
}

// ============================================
// VENDOR SELECT
// ============================================

async function loadVendorSelect(){
    try {
        const vendors = await api("getVendors");
        const sel = document.getElementById("visit-vendor");

        if(!sel) return;

        sel.innerHTML = '<option value="">-- Selecciona un vendedor --</option>';

        if(vendors && vendors.length > 0) {
            vendors.forEach(v => {
                const o = document.createElement("option");
                o.value = v.id;
                o.textContent = v.nombre;
                sel.appendChild(o);
            });
        }
    } catch(e) {
        console.error("Error en loadVendorSelect:", e);
    }
}

// ============================================
// ADD VENDOR
// ============================================

async function addVendor(){
    try {
        const id = document.getElementById("vendor-id").value;
        const nombre = document.getElementById("vendor-name").value;
        const comision = document.getElementById("vendor-commission").value;

        if(!id || !nombre || !comision){
            alert("Completa todos los campos");
            return;
        }

        const result = await api("addVendor", {
            id: id,
            nombre: nombre,
            comision: parseFloat(comision)
        });

        if(result) {
            alert("✅ Vendedor creado");
            document.getElementById("vendor-id").value = "";
            document.getElementById("vendor-name").value = "";
            document.getElementById("vendor-commission").value = "";
            loadDashboard();
        }
    } catch(e) {
        console.error("Error en addVendor:", e);
        alert("❌ Error al crear vendedor");
    }
}

// ============================================
// ADD PRODUCT
// ============================================

async function addProduct(){
    try {
        const categoria = document.getElementById("product-category").value;
        const producto = document.getElementById("product-name").value;
        const precio = document.getElementById("product-price").value;

        if(!producto || !precio){
            alert("Completa los campos requeridos");
            return;
        }

        const result = await api("addProduct", {
            categoria: categoria || "Sin categoría",
            producto: producto,
            precio: parseFloat(precio)
        });

        if(result) {
            alert("✅ Producto creado");
            document.getElementById("product-category").value = "";
            document.getElementById("product-name").value = "";
            document.getElementById("product-price").value = "";
            loadDashboard();
        }
    } catch(e) {
        console.error("Error en addProduct:", e);
        alert("❌ Error al crear producto");
    }
}

// ============================================
// LOAD INVENTORY
// ============================================

async function loadInventory(){
    try {
        const inv = await api("getAllInventory");

        let html = "<table style='width: 100%; border-collapse: collapse;'>";
        html += "<tr style='background: #667eea; color: white;'><th style='padding: 10px; text-align: left;'>Vendedor</th><th style='padding: 10px; text-align: left;'>Producto</th><th style='padding: 10px; text-align: left;'>Cantidad</th></tr>";

        if(inv && inv.length > 0) {
            inv.forEach(i => {
                html += `<tr style='border-bottom: 1px solid #ddd;'>
                    <td style='padding: 10px;'>${i.vendedor}</td>
                    <td style='padding: 10px;'>${i.producto}</td>
                    <td style='padding: 10px;'>${i.cantidad}</td>
                </tr>`;
            });
        } else {
            html += "<tr><td colspan='3' style='padding: 10px; text-align: center; color: #999;'>No hay inventario</td></tr>";
        }

        html += "</table>";

        document.getElementById("inventory").innerHTML = html;

    } catch(e) {
        console.error("Error en loadInventory:", e);
        document.getElementById("inventory").innerHTML = "<p style='color: red;'>Error al cargar inventario</p>";
    }
}

// ============================================
// START VISIT
// ============================================

async function startVisit(){
    try {
        const vendor = document.getElementById("visit-vendor").value;

        if(!vendor){
            alert("Selecciona un vendedor");
            return;
        }

        products = await api("getProducts");
        const inventory = await api("getInventory", {vendedor: vendor});

        let html = "<table style='width: 100%; border-collapse: collapse; margin-top: 15px;'>";
        html += "<tr style='background: #667eea; color: white;'>";
        html += "<th style='padding: 10px; text-align: left;'>Producto</th>";
        html += "<th style='padding: 10px; text-align: center;'>Stock</th>";
        html += "<th style='padding: 10px; text-align: center;'>Vendidos</th>";
        html += "<th style='padding: 10px; text-align: center;'>Restock</th>";
        html += "</tr>";

        if(products && products.length > 0) {
            products.forEach(p => {
                const stock = inventory && inventory.find(i => i.producto === p.producto) ? inventory.find(i => i.producto === p.producto).cantidad : 0;

                html += `<tr style='border-bottom: 1px solid #ddd;'>
                    <td style='padding: 10px;'>${p.producto}</td>
                    <td style='padding: 10px; text-align: center;'>${stock}</td>
                    <td style='padding: 10px; text-align: center;'><input type="number" id="sell_${p.producto}" value="0" style='width: 60px; padding: 5px;'></td>
                    <td style='padding: 10px; text-align: center;'><input type="number" id="restock_${p.producto}" value="0" style='width: 60px; padding: 5px;'></td>
                </tr>`;
            });
        }

        html += "</table>";
        html += `<button onclick="saveVisit('${vendor}')" style='margin-top: 15px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;'>💾 Guardar Visita</button>`;

        document.getElementById("visit-area").innerHTML = html;

    } catch(e) {
        console.error("Error en startVisit:", e);
        alert("❌ Error al iniciar visita");
    }
}

// ============================================
// SAVE VISIT
// ============================================

async function saveVisit(vendor){
    try {
        const fecha = new Date().toISOString().split("T")[0];

        for(const p of products){
            const sell = parseInt(document.getElementById("sell_" + p.producto).value) || 0;
            const restock = parseInt(document.getElementById("restock_" + p.producto).value) || 0;

            if(sell > 0){
                await api("addMovement", {
                    fecha: fecha,
                    vendedor: vendor,
                    producto: p.producto,
                    tipo: "venta",
                    cantidad: sell
                });
            }

            if(restock > 0){
                await api("addMovement", {
                    fecha: fecha,
                    vendedor: vendor,
                    producto: p.producto,
                    tipo: "restock",
                    cantidad: restock
                });
            }
        }

        // Get vendor info for summary
        const vendors = await api("getVendors");
        const vendorInfo = vendors.find(v => v.id === vendor);

        // Calculate summary
        let totalSales = 0;
        let totalItems = 0;

        for(const p of products){
            const sell = parseInt(document.getElementById("sell_" + p.producto).value) || 0;
            if(sell > 0){
                totalItems += sell;
                totalSales += sell * p.precio;
            }
        }

        const commission = vendorInfo ? (totalSales * vendorInfo.comision / 100) : 0;
        const amountToPay = totalSales - commission;

        const summary = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3>📋 Resumen de Visita</h3>
            <p><strong>Vendedor:</strong> ${vendorInfo?.nombre || vendor}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
            <p><strong>Artículos vendidos:</strong> ${totalItems}</p>
            <p><strong>Total ventas:</strong> $${totalSales.toFixed(2)}</p>
            <p><strong>Comisión (${vendorInfo?.comision || 0}%):</strong> $${commission.toFixed(2)}</p>
            <p style="font-size: 1.3em; margin-top: 15px; padding-top: 15px; border-top: 2px solid rgba(255,255,255,0.3);"><strong>💰 Monto a pagar:</strong> $${amountToPay.toFixed(2)}</p>
        </div>
        `;

        alert("✅ Visita registrada");

        document.getElementById("visit-area").innerHTML = summary;

    } catch(e) {
        console.error("Error en saveVisit:", e);
        alert("❌ Error al guardar visita");
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", function() {
    console.log("✅ Admin panel loaded");
    loadDashboard();
});
