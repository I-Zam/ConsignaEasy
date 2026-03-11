// ============================================
// CONSIGNAEASY - GOOGLE APPS SCRIPT
// API REST para gestionar inventario de consignación
// ============================================

const SPREADSHEET_ID = '1087dwmhk12RM-YFRYxKO2VEO2DPIkTRjNbhokm9GDJA';
const sheet = SpreadsheetApp.openById(SPREADSHEET_ID);

// ============================================
// PUNTO DE ENTRADA - doPost
// ============================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    console.log('Acción recibida:', action);
    
    switch(action) {
      case 'getVendors':
        return getVendors();
      case 'getProducts':
        return getProducts();
      case 'getInventory':
        return getInventory(data.vendedor);
      case 'getMovements':
        return getMovements(data.vendedor);
      case 'addVendor':
        return addVendor(data);
      case 'addProduct':
        return addProduct(data);
      case 'addMovement':
        return addMovement(data);
      case 'getVisitSummary':
        return getVisitSummary(data.vendedor, data.fecha);
      case 'getAllInventory':
        return getAllInventory();
      case 'getAllMovements':
        return getAllMovements();
      default:
        return createResponse(false, null, 'Acción no reconocida: ' + action);
    }
  } catch (error) {
    console.error('Error en doPost:', error);
    return createResponse(false, null, error.toString());
  }
}

// ============================================
// UTILIDADES
// ============================================

function createResponse(success, data, error = null) {
  const response = {
    success: success,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  if (error) {
    response.error = error;
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// VENDEDORES
// ============================================

function getVendors() {
  try {
    const vendedoresSheet = sheet.getSheetByName('VENDEDORES');
    const data = vendedoresSheet.getDataRange().getValues();
    const vendors = [];
    
    // Saltar encabezado (fila 0)
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Si hay ID
        vendors.push({
          id: String(data[i][0]).trim(),
          nombre: String(data[i][1] || '').trim(),
          comision: parseFloat(data[i][2]) || 0
        });
      }
    }
    
    console.log('Vendedores obtenidos:', vendors.length);
    return createResponse(true, vendors);
  } catch (error) {
    console.error('Error en getVendors:', error);
    return createResponse(false, null, error.toString());
  }
}

function addVendor(data) {
  try {
    if (!data.id || !data.nombre) {
      return createResponse(false, null, 'ID y nombre son requeridos');
    }
    
    const vendedoresSheet = sheet.getSheetByName('VENDEDORES');
    const comision = parseFloat(data.comision) || 0;
    
    vendedoresSheet.appendRow([data.id, data.nombre, comision]);
    
    console.log('Vendedor agregado:', data.id);
    return createResponse(true, { id: data.id, nombre: data.nombre, comision: comision });
  } catch (error) {
    console.error('Error en addVendor:', error);
    return createResponse(false, null, error.toString());
  }
}

// ============================================
// PRODUCTOS
// ============================================

function getProducts() {
  try {
    const productosSheet = sheet.getSheetByName('PRODUCTOS');
    const data = productosSheet.getDataRange().getValues();
    const products = [];
    
    // Saltar encabezado (fila 0)
    for (let i = 1; i < data.length; i++) {
      if (data[i][1]) { // Si hay nombre de producto
        products.push({
          categoria: String(data[i][0] || '').trim(),
          producto: String(data[i][1]).trim(),
          precio: parseFloat(data[i][2]) || 0
        });
      }
    }
    
    console.log('Productos obtenidos:', products.length);
    return createResponse(true, products);
  } catch (error) {
    console.error('Error en getProducts:', error);
    return createResponse(false, null, error.toString());
  }
}

function addProduct(data) {
  try {
    if (!data.producto) {
      return createResponse(false, null, 'Nombre de producto es requerido');
    }
    
    const productosSheet = sheet.getSheetByName('PRODUCTOS');
    const precio = parseFloat(data.precio) || 0;
    
    productosSheet.appendRow([data.categoria || '', data.producto, precio]);
    
    console.log('Producto agregado:', data.producto);
    return createResponse(true, { 
      categoria: data.categoria || '', 
      producto: data.producto, 
      precio: precio 
    });
  } catch (error) {
    console.error('Error en addProduct:', error);
    return createResponse(false, null, error.toString());
  }
}

// ============================================
// INVENTARIO
// ============================================

function getInventory(vendedor) {
  try {
    const inventarioSheet = sheet.getSheetByName('INVENTARIO');
    const data = inventarioSheet.getDataRange().getValues();
    const inventory = [];
    
    // Saltar encabezado (fila 0)
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === vendedor) {
        inventory.push({
          vendedor: String(data[i][0]).trim(),
          producto: String(data[i][1]).trim(),
          cantidad: parseInt(data[i][2]) || 0
        });
      }
    }
    
    console.log('Inventario obtenido para vendedor:', vendedor, 'Items:', inventory.length);
    return createResponse(true, inventory);
  } catch (error) {
    console.error('Error en getInventory:', error);
    return createResponse(false, null, error.toString());
  }
}

function getAllInventory() {
  try {
    const inventarioSheet = sheet.getSheetByName('INVENTARIO');
    const data = inventarioSheet.getDataRange().getValues();
    const inventory = [];
    
    // Saltar encabezado (fila 0)
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        inventory.push({
          vendedor: String(data[i][0]).trim(),
          producto: String(data[i][1]).trim(),
          cantidad: parseInt(data[i][2]) || 0
        });
      }
    }
    
    console.log('Inventario completo obtenido. Items:', inventory.length);
    return createResponse(true, inventory);
  } catch (error) {
    console.error('Error en getAllInventory:', error);
    return createResponse(false, null, error.toString());
  }
}

function updateInventory(vendedor, producto, tipo, cantidad) {
  try {
    const inventarioSheet = sheet.getSheetByName('INVENTARIO');
    const data = inventarioSheet.getDataRange().getValues();
    
    let found = false;
    
    // Buscar registro existente
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === vendedor && data[i][1] === producto) {
        const currentQty = parseInt(data[i][2]) || 0;
        let newQty;
        
        if (tipo === 'restock') {
          newQty = currentQty + cantidad;
        } else if (tipo === 'venta') {
          newQty = currentQty - cantidad;
        } else {
          newQty = currentQty;
        }
        
        inventarioSheet.getRange(i + 1, 3).setValue(newQty);
        console.log('Inventario actualizado:', vendedor, producto, 'Nueva cantidad:', newQty);
        found = true;
        break;
      }
    }
    
    // Si no existe, crear nuevo registro
    if (!found) {
      const qty = tipo === 'restock' ? cantidad : -cantidad;
      inventarioSheet.appendRow([vendedor, producto, qty]);
      console.log('Nuevo registro de inventario creado:', vendedor, producto, qty);
    }
    
    return true;
  } catch (error) {
    console.error('Error en updateInventory:', error);
    return false;
  }
}

// ============================================
// MOVIMIENTOS
// ============================================

function getMovements(vendedor) {
  try {
    const movimientosSheet = sheet.getSheetByName('MOVIMIENTOS');
    const data = movimientosSheet.getDataRange().getValues();
    const movements = [];
    
    // Saltar encabezado (fila 0)
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === vendedor) {
        movements.push({
          fecha: String(data[i][0] || '').trim(),
          vendedor: String(data[i][1]).trim(),
          producto: String(data[i][2]).trim(),
          tipo: String(data[i][3] || '').trim(),
          cantidad: parseInt(data[i][4]) || 0
        });
      }
    }
    
    console.log('Movimientos obtenidos para vendedor:', vendedor, 'Movimientos:', movements.length);
    return createResponse(true, movements);
  } catch (error) {
    console.error('Error en getMovements:', error);
    return createResponse(false, null, error.toString());
  }
}

function getAllMovements() {
  try {
    const movimientosSheet = sheet.getSheetByName('MOVIMIENTOS');
    const data = movimientosSheet.getDataRange().getValues();
    const movements = [];
    
    // Saltar encabezado (fila 0)
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
    
    console.log('Todos los movimientos obtenidos. Total:', movements.length);
    return createResponse(true, movements);
  } catch (error) {
    console.error('Error en getAllMovements:', error);
    return createResponse(false, null, error.toString());
  }
}

function addMovement(data) {
  try {
    if (!data.fecha || !data.vendedor || !data.producto || !data.tipo) {
      return createResponse(false, null, 'Faltan campos requeridos');
    }
    
    const cantidad = parseInt(data.cantidad) || 0;
    const movimientosSheet = sheet.getSheetByName('MOVIMIENTOS');
    
    movimientosSheet.appendRow([data.fecha, data.vendedor, data.producto, data.tipo, cantidad]);
    
    // Actualizar inventario
    updateInventory(data.vendedor, data.producto, data.tipo, cantidad);
    
    console.log('Movimiento agregado:', data.tipo, data.producto, cantidad);
    return createResponse(true, {
      fecha: data.fecha,
      vendedor: data.vendedor,
      producto: data.producto,
      tipo: data.tipo,
      cantidad: cantidad
    });
  } catch (error) {
    console.error('Error en addMovement:', error);
    return createResponse(false, null, error.toString());
  }
}

// ============================================
// RESUMEN DE VISITA
// ============================================

function getVisitSummary(vendedor, fecha) {
  try {
    const movimientosSheet = sheet.getSheetByName('MOVIMIENTOS');
    const movData = movimientosSheet.getDataRange().getValues();
    
    const productosSheet = sheet.getSheetByName('PRODUCTOS');
    const prodData = productosSheet.getDataRange().getValues();
    
    const vendedoresSheet = sheet.getSheetByName('VENDEDORES');
    const vendData = vendedoresSheet.getDataRange().getValues();
    
    // Obtener comisión del vendedor
    let vendorCommission = 0;
    for (let i = 1; i < vendData.length; i++) {
      if (vendData[i][0] === vendedor) {
        vendorCommission = parseFloat(vendData[i][2]) || 0;
        break;
      }
    }
    
    // Crear mapa de precios
    const priceMap = {};
    for (let i = 1; i < prodData.length; i++) {
      if (prodData[i][1]) {
        priceMap[prodData[i][1]] = parseFloat(prodData[i][2]) || 0;
      }
    }
    
    // Calcular totales para la fecha
    let totalSales = 0;
    let totalSalesQty = 0;
    const details = [];
    
    for (let i = 1; i < movData.length; i++) {
      if (movData[i][1] === vendedor && movData[i][0] === fecha && movData[i][3] === 'venta') {
        const producto = movData[i][2];
        const cantidad = parseInt(movData[i][4]) || 0;
        const precio = priceMap[producto] || 0;
        const subtotal = cantidad * precio;
        
        totalSales += subtotal;
        totalSalesQty += cantidad;
        
        details.push({
          producto: producto,
          cantidad: cantidad,
          precio: precio,
          subtotal: subtotal
        });
      }
    }
    
    const commission = (totalSales * vendorCommission) / 100;
    const amountToPay = totalSales - commission;
    
    const summary = {
      vendedor: vendedor,
      fecha: fecha,
      totalSalesQty: totalSalesQty,
      totalSales: totalSales,
      vendorCommission: vendorCommission,
      commission: commission,
      amountToPay: amountToPay,
      details: details
    };
    
    console.log('Resumen de visita generado:', summary);
    return createResponse(true, summary);
  } catch (error) {
    console.error('Error en getVisitSummary:', error);
    return createResponse(false, null, error.toString());
  }
}
