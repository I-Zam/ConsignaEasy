
let products=[];

async function loadDashboard(){

const vendors = await api("getVendors");
const products = await api("getProducts");
const movements = await api("getAllMovements");

let total=0;
const priceMap={};

products.forEach(p=>priceMap[p.producto]=p.precio);

movements.forEach(m=>{
if(m.tipo==="venta"){
total+=m.cantidad*(priceMap[m.producto]||0);
}
});

document.getElementById("dashboard").innerHTML=`
Vendedores: ${vendors.length}<br>
Productos: ${products.length}<br>
Movimientos: ${movements.length}<br>
Ventas: $${total}
`;

loadVendorSelect();

}

async function loadVendorSelect(){

const vendors=await api("getVendors");

const sel=document.getElementById("visit-vendor");

sel.innerHTML="";

vendors.forEach(v=>{

const o=document.createElement("option");
o.value=v.id;
o.textContent=v.nombre;
sel.appendChild(o);

});

}

async function addVendor(){

const id = document.getElementById("vendor-id").value;
const nombre = document.getElementById("vendor-name").value;
const comision = document.getElementById("vendor-commission").value;

if(!id || !nombre || !comision){
alert("Completa todos los campos");
return;
}

await api("addVendor",{
id,
nombre,
comision: parseFloat(comision)
});

alert("Vendedor creado");
loadDashboard();

}

async function addProduct(){

const categoria = document.getElementById("product-category").value;
const producto = document.getElementById("product-name").value;
const precio = document.getElementById("product-price").value;

if(!producto || !precio){
alert("Completa los campos requeridos");
return;
}

await api("addProduct",{
categoria: categoria || "Sin categoría",
producto,
precio: parseFloat(precio)
});

alert("Producto creado");
loadDashboard();

}

async function loadInventory(){

const inv=await api("getAllInventory");

let html="<table><tr><th>Vendedor</th><th>Producto</th><th>Cantidad</th></tr>";

inv.forEach(i=>{

html+=`
<tr>
<td>${i.vendedor}</td>
<td>${i.producto}</td>
<td>${i.cantidad}</td>
</tr>
`;

});

html+="</table>";

document.getElementById("inventory").innerHTML=html;

}

async function startVisit(){

const vendor=document.getElementById("visit-vendor").value;

if(!vendor){
alert("Selecciona un vendedor");
return;
}

products=await api("getProducts");
const inventory=await api("getInventory",{vendedor:vendor});

let html="<table><tr><th>Producto</th><th>Stock</th><th>Vendidos</th><th>Restock</th></tr>";

products.forEach(p=>{

const stock=inventory.find(i=>i.producto===p.producto)?.cantidad||0;

html+=`
<tr>
<td>${p.producto}</td>
<td>${stock}</td>
<td><input type="number" id="sell_${p.producto}" value="0"></td>
<td><input type="number" id="restock_${p.producto}" value="0"></td>
</tr>
`;

});

html+="</table>";

html+=`<button onclick="saveVisit('${vendor}')">Guardar Visita</button>`;

document.getElementById("visit-area").innerHTML=html;

}

async function saveVisit(vendor){

const fecha=new Date().toISOString().split("T")[0];

for(const p of products){

const sell=parseInt(document.getElementById("sell_"+p.producto).value)||0;
const restock=parseInt(document.getElementById("restock_"+p.producto).value)||0;

if(sell>0){

await api("addMovement",{
fecha:fecha,
vendedor:vendor,
producto:p.producto,
tipo:"venta",
cantidad:sell
});

}

if(restock>0){

await api("addMovement",{
fecha:fecha,
vendedor:vendor,
producto:p.producto,
tipo:"restock",
cantidad:restock
});

}

}

// Get vendor info for summary
const vendors = await api("getVendors");
const vendorInfo = vendors.find(v => v.id === vendor);

// Calculate summary
const fecha = new Date().toISOString().split("T")[0];
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

alert("Visita registrada");

document.getElementById("visit-area").innerHTML = summary;

}

loadDashboard();
