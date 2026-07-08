const mysql = require('mysql2/promise');

async function testAll() {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "12345",
    database: "db_tech_peru",
    port: 3306,
  });

  try {
    console.log("--- INICIANDO TEST CRUD EN BASE DE DATOS ---");

    // 1. Crear Usuario
    const [userRes] = await db.query(
      "INSERT INTO usuario (correo, nombre, contrasena, estado) VALUES (?, ?, ?, ?)",
      ["test_auto@example.com", "Test User", "1234", "Activo"]
    );
    const userId = userRes.insertId;
    console.log(`✅ Usuario Creado (ID: ${userId})`);

    // 2. Modificar Estado Usuario
    await db.query("UPDATE usuario SET estado = ? WHERE id_usuario = ?", ["Inactivo", userId]);
    console.log(`✅ Estado de Usuario modificado a Inactivo`);

    // 3. Crear Producto
    const [prodRes] = await db.query(
      "INSERT INTO producto (nombre, marca, modelo, tipo_switch, tipo_layout, precio, estado) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["Test Keyboard", "Logi", "MX", "Red", "ISO", 99.99, "Activo"]
    );
    const prodId = prodRes.insertId;
    console.log(`✅ Producto Creado (ID: ${prodId})`);

    // 4. Modificar Estado Producto
    await db.query("UPDATE producto SET estado = ? WHERE id_producto = ?", ["Inactivo", prodId]);
    console.log(`✅ Estado de Producto modificado a Inactivo`);

    // 5. Crear Cliente
    const [clientRes] = await db.query(
      "INSERT INTO cliente (nombre, telefono, direccion, correo) VALUES (?, ?, ?, ?)",
      ["Test Client", "123456789", "Av Test", "client@test.com"]
    );
    const clientId = clientRes.insertId;
    console.log(`✅ Cliente Creado (ID: ${clientId})`);

    // 6. Eliminar Cliente (Fisico) - no tiene FK de venta aún
    await db.query("DELETE FROM cliente WHERE id_cliente = ?", [clientId]);
    console.log(`✅ Cliente Eliminado físicamente`);

    // 7. Eliminar Producto (Fisico) - no tiene FK de detalle_venta aún
    // Pero espera, al crear producto también hay que crear su inventario? 
    // Para simplificar, solo borramos producto
    await db.query("DELETE FROM producto WHERE id_producto = ?", [prodId]);
    console.log(`✅ Producto Eliminado físicamente`);

    // 8. Eliminar Usuario (Fisico) - no tiene FK de admin/vendedor ni ventas
    await db.query("DELETE FROM usuario WHERE id_usuario = ?", [userId]);
    console.log(`✅ Usuario Eliminado físicamente`);

    console.log("--- TODAS LAS PRUEBAS CRUD Y ELIMINACION PASARON ---");
  } catch (error) {
    console.error("❌ Error en las pruebas:", error);
  } finally {
    await db.end();
  }
}

testAll();
