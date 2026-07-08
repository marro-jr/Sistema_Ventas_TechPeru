/**
 * @file server.js
 * @description Archivo principal del Backend (Node.js + Express).
 * Maneja todas las rutas CRUD, seguridad contra inyecciones SQL,
 * restricciones lógicas y físicas de eliminación y control transaccional.
 */
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const app = express();
// Configuración del servidor y middlewares
// Se incluye protección de rutas y parseo JSON
app.use(cors());
app.use(bodyParser.json());

const puerto = 3000;

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "12345",
  database: "db_tech_peru",
  port: 3306,
});

db.connect((err) => {
  if (err) {
    console.error(` Error al conectar a la base de datos: ${err}`);
  } else {
    console.log("Conexión a la base de datos establecida");
  }
});

// RUTAS PARA INICIO DE SESIÓN

// Ruta para iniciar sesión y obtener rol
app.post("/login", (req, res) => {
  const { correo, contrasena } = req.body;

  const query = `
    SELECT 
        u.id_usuario,
        u.correo,
        u.nombre,
        u.estado,
        a.id_administrador,
        v.id_vendedor
    FROM usuario u
    LEFT JOIN administrador a
    ON u.id_usuario = a.id_usuario
    LEFT JOIN vendedor v
    ON u.id_usuario = v.id_usuario
    WHERE u.correo = ? 
    AND u.contrasena = ?
    AND LOWER(u.estado) = 'activo';
    `;

  db.query(query, [correo, contrasena], (err, results) => {
    if (err) {
      console.error(`Error al ejecutar la consulta: ${err}`);
      res.status(500).json({ error: `Error al ejecutar la consulta: ${err}` });
    } else {
      if (results.length > 0) {
        const usuario = results[0];

        let rol = "";

        if (usuario.id_administrador) {
          rol = "administrador";
        } else if (usuario.id_vendedor) {
          rol = "vendedor";
        }

        res.json({
          success: true,
          usuario: {
            id_usuario: usuario.id_usuario,
            correo: usuario.correo,
            nombre: usuario.nombre,
            estado: usuario.estado,
            rol: rol,
          }
        });
      } else {
        res.status(401).json({ success: false, error: "Correo o contraseña incorrectos, o usuario inactivo" });
      }
    }
  });
});

// RUTAS PARA REGISTRO DE USUARIOS

app.post("/registro", (req, res) => {
  const { correo, nombre, contrasena, estado } = req.body;

  const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{9,50}$/;
  if (!passRegex.test(contrasena)) {
    return res.status(400).json({ error: "La contraseña no cumple con los requisitos de seguridad." });
  }

  const query = `insert into usuario (correo, nombre, contrasena, estado) values (?, ?, ?, ?);`;

  db.query(query, [correo, nombre, contrasena, estado], (err, results) => {
    if (err) {
      res.status(500).json({ error: `Error al ejecutar la consulta: ${err}` });
    } else {
      res.json({
        message: "Usuario registrado exitosamente",
        id_usuario: results.insertId,
      });
    }
  });
});

// Ruta para obtener todos los usuarios
app.get("/usuarios", (req, res) => {
  const query = `select id_usuario, correo, nombre, estado from usuario;`;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: `Error al ejecutar la consulta: ${err}` });
    } else {
      res.json(results);
    }
  });
});

// Ruta para insertar usuario en la tabla de administrador o vendedor;

app.post("/registro/:rol", (req, res) => {
  const { rol } = req.params;

  if (rol !== 'administrador' && rol !== 'vendedor') {
    return res.status(400).json({ error: "Rol inválido. Posibles ataques de inyección SQL bloqueados." });
  }

  const { id_usuario, turno, area } = req.body;

  const query = `
    insert into ${rol} (id_usuario, turno, area)
    values (?, ?, ?);
    `;

  db.query(query, [id_usuario, turno, area], (err, results) => {
    if (err) {
      console.error(`Error al ejecutar la consulta: ${err}`);
      res.status(500).json({ error: `Error al ejecutar la consulta: ${err}` });
    } else {
      res.json({ message: `Usuario registrado exitosamente como ${rol}` });
    }
  });
});

// Ruta para obtener todos los usuarios depndiendo de su rol (administrador o vendedor)

app.get("/registro/:rol", (req, res) => {
  const rol = req.params.rol;

  if (rol !== 'administrador' && rol !== 'vendedor') {
    return res.status(400).json({ error: "Rol inválido." });
  }

  const query = `
    select 
    u.id_usuario as id_usuario, u.correo as correo,
    u.nombre as nombre, a.turno as turno, a.area as rol
    from usuario u
    join ${rol} a
    on u.id_usuario = a.id_usuario;
    `;

  db.query(query, (err, results) => {
    if (err) {
      console.error(`Error al ejecutar la consulta: ${err}`);
      res.status(500).json({ error: `Error al ejecutar la consulta: ${err}` });
    } else {
      res.json(results);
    }
  });
});

// Ruta para modificaciones y elimininaciones de usuarios (lógica y física)

// Ruta para modificar nombre y estado de usuario
app.put("/usuarios/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, estado } = req.body;

  const query = `
        UPDATE usuario
        SET nombre = ?, estado = ?
        WHERE id_usuario = ?;
    `;

  db.query(query, [nombre, estado, id], (err) => {
    if (err) {
      res.status(500).json({ error: `Error al modificar usuario: ${err}` });
    } else {
      res.json({ message: "Usuario modificado exitosamente" });
    }
  });
});

// Ruta para eliminar físicamente un usuario
app.delete("/usuarios/:id", (req, res) => {
  const { id } = req.params;

  // Error handling centralizado para FK
  const handleFKError = (err, res, contexto) => {
    if (err.errno === 1451) {
      return res.status(409).json({ error: `No se puede eliminar físicamente este usuario porque tiene dependencias en el sistema (ej. Ventas, Reportes). Usa la eliminación lógica (inactivar).` });
    }
    return res.status(500).json({ error: `Error al eliminar ${contexto}: ${err}` });
  };

  const deleteAdmin = `DELETE FROM administrador WHERE id_usuario = ?;`;
  db.query(deleteAdmin, [id], (err) => {
    if (err) return handleFKError(err, res, "administrador");

    const deleteVendedor = `DELETE FROM vendedor WHERE id_usuario = ?;`;
    db.query(deleteVendedor, [id], (err) => {
      if (err) return handleFKError(err, res, "vendedor");

      const deleteUsuario = `DELETE FROM usuario WHERE id_usuario = ?;`;
      db.query(deleteUsuario, [id], (err) => {
        if (err) return handleFKError(err, res, "usuario");

        res.json({ message: "Usuario eliminado físicamente con éxito" });
      });
    });
  });
});

//Rutas para modificar y eliminar administrador/vendedor (lógica y física)

// Ruta para modificar turno de administrador o vendedor
app.put("/registro/:rol/:id_usuario", (req, res) => {
  const { rol, id_usuario } = req.params;

  if (rol !== 'administrador' && rol !== 'vendedor') {
    return res.status(400).json({ error: "Rol inválido." });
  }

  const { turno, area } = req.body;

  const query = `
        UPDATE ${rol}
        SET turno = ?, area = ?
        WHERE id_usuario = ?;
    `;

  db.query(query, [turno, area, id_usuario], (err) => {
    if (err) {
      res.status(500).json({ error: `Error al modificar ${rol}: ${err}` });
    } else {
      res.json({ message: `${rol} modificado exitosamente` });
    }
  });
});

// RUTAS PARA MANTENIMIENTO DE PRODUCTOS E INVENTARIO

// Ruta para traer todos los productos sin inventario
app.get("/productos", (req, res) => {
  const query = `
    SELECT id_producto, nombre, marca, modelo, tipo_switch, tipo_layout, precio, estado
    FROM producto;
    `;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: `Error al consultar productos: ${err}` });
    } else {
      res.json(results);
    }
  });
});

// Ruta para traer todos los productos con su inventario

app.get("/productos-inventario", (req, res) => {
  const query = `
        SELECT
            p.id_producto,
            p.nombre,
            p.marca,
            p.modelo,
            p.tipo_switch,
            p.tipo_layout,
            p.precio,
            p.estado,
            i.id_inventario,
            i.stock_actual,
            i.stock_minimo,
            i.fecha_actualizacion
        FROM producto p
        INNER JOIN inventario i
        ON p.id_producto = i.id_producto
    `;

  db.query(query, (err, results) => {
    if (err) {
      res
        .status(500)
        .json({ error: `Error al consultar productos con inventario: ${err}` });
    } else {
      res.json(results);
    }
  });
});

// Ruta para registrar un nuevo producto junto con su inventario
app.post("/productos", (req, res) => {
  const {
    nombre,
    marca,
    modelo,
    tipo_switch,
    tipo_layout,
    precio,
    estado,
    stock_actual,
    stock_minimo,
  } = req.body;

  const productoQuery = `
        INSERT INTO producto (nombre, marca, modelo, tipo_switch, tipo_layout, precio, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?);    
    `;

  db.query(
    productoQuery,
    [nombre, marca, modelo, tipo_switch, tipo_layout, precio, estado],
    (err, productoResult) => {
      if (err) {
        res.status(500).json({ error: `Error al registrar producto: ${err}` });
        return;
      }

      const idProducto = productoResult.insertId;

      const inventarioQuery = `
                INSERT INTO inventario (id_producto, stock_actual, stock_minimo, fecha_actualizacion)
                VALUES (?, ?, ?, CURDATE());
            `;

      db.query(
        inventarioQuery,
        [idProducto, stock_actual, stock_minimo],
        (err) => {
          if (err) {
            res
              .status(500)
              .json({ error: `Error al registrar inventario: ${err}` });
          } else {
            res.json({
              message: "Producto registrado exitosamente",
              id_producto: idProducto,
            });
          }
        },
      );
    },
  );
});

//Ruta para modificar un producto junto con su inventario

app.put("/productos/:id", (req, res) => {
  const { id } = req.params;

  const {
    nombre,
    marca,
    modelo,
    tipo_switch,
    tipo_layout,
    precio,
    estado,
    stock_actual,
    stock_minimo,
  } = req.body;

  const productoQuery = `
        UPDATE producto
        SET nombre = ?, marca = ?, modelo = ?, tipo_switch = ?, tipo_layout = ?, precio = ?, estado = ?
        WHERE id_producto = ?;
    `;

  db.query(
    productoQuery,
    [nombre, marca, modelo, tipo_switch, tipo_layout, precio, estado, id],
    (err) => {
      if (err) {
        res.status(500).json({ error: `Error al modificar producto: ${err}` });
        return;
      }

      const inventarioQuery = `
                UPDATE inventario
                SET stock_actual = ?, stock_minimo = ?, fecha_actualizacion = CURDATE()
                WHERE id_producto = ?;
            `;

      db.query(inventarioQuery, [stock_actual, stock_minimo, id], (err) => {
        if (err) {
          res
            .status(500)
            .json({ error: `Error al modificar inventario: ${err}` });
        } else {
          res.json({ message: "Producto modificado exitosamente" });
        }
      });
    },
  );
});

// Ruta para eliminar un producto lógicamente (cambiar estado a 'Inactivo')

app.put("/productos/:id/eliminar-logico", (req, res) => {
  const { id } = req.params;

  const query = `
    UPDATE producto
    SET estado =
      CASE
        WHEN estado = 'Activo' THEN 'Inactivo'
        ELSE 'Activo'
      END
    WHERE id_producto = ?;
  `;
  db.query(query, [id], (err) => {
    if (err) {
      res.status(500).json({ error: `Error al eliminar lógicamente: ${err}` });
    } else {
      res.json({ message: "Producto eliminado lógicamente" });
    }
  });
});

// Ruta para eliminar un producto físicamente (eliminar de la base de datos)
app.delete("/productos/:id", (req, res) => {
  const { id } = req.params;

  const handleFKError = (err, res, contexto) => {
    if (err.errno === 1451) {
      return res.status(409).json({ error: `No se puede eliminar físicamente este ${contexto} porque tiene dependencias en el sistema (ej. Ventas). Usa la eliminación lógica.` });
    }
    return res.status(500).json({ error: `Error al eliminar ${contexto}: ${err}` });
  };

  const deleteInventario = `DELETE FROM inventario WHERE id_producto = ?;`;
  db.query(deleteInventario, [id], (err) => {
    if (err) return handleFKError(err, res, "inventario");

    const deleteProducto = `DELETE FROM producto WHERE id_producto = ?;`;
    db.query(deleteProducto, [id], (err) => {
      if (err) return handleFKError(err, res, "producto");
      res.json({ message: "Producto eliminado físicamente" });
    });
  });
});

// ==========================================
// RUTAS PARA REPORTES ADMINISTRATIVOS
// ==========================================

// 1. Reporte Analítico de Ventas (Max, Min, Avg, Sum, Count) por Rango de Fechas
app.get("/reportes/ventas-analitico", (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;
  let dateCondition = "";
  let queryParams = [];

  if (fecha_inicio && fecha_fin) {
    dateCondition = `WHERE DATE(fecha) >= ? AND DATE(fecha) <= ? AND estado != 'Cancelada'`;
    queryParams = [fecha_inicio, fecha_fin];
  } else {
    dateCondition = `WHERE estado != 'Cancelada'`;
  }

  const queryResumen = `
    SELECT 
      SUM(total) as ingresos_totales,
      COUNT(id_venta) as total_ventas,
      MAX(total) as venta_maxima, 
      MIN(total) as venta_minima, 
      AVG(total) as venta_promedio
    FROM venta
    ${dateCondition}
  `;

  const queryDesgloseDiario = `
    SELECT 
      DATE(fecha) as fecha_diaria,
      SUM(total) as total_diario,
      COUNT(id_venta) as cantidad_diaria
    FROM venta
    ${dateCondition}
    GROUP BY DATE(fecha)
    ORDER BY DATE(fecha) ASC
  `;

  const queryTopVentas = `
    SELECT 
      id_venta,
      fecha,
      total,
      id_vendedor
    FROM venta
    ${dateCondition}
    ORDER BY total DESC
    LIMIT 5
  `;

  const queryBottomVentas = `
    SELECT 
      id_venta,
      fecha,
      total,
      id_vendedor
    FROM venta
    ${dateCondition}
    ORDER BY total ASC
    LIMIT 5
  `;

  db.query(queryResumen, queryParams, (err, resultadosResumen) => {
    if (err) return res.status(500).json({ error: `Error resumen: ${err}` });

    db.query(queryDesgloseDiario, queryParams, (err2, resultadosDesglose) => {
      if (err2) return res.status(500).json({ error: `Error desglose: ${err2}` });

      db.query(queryTopVentas, queryParams, (err3, resultadosTop) => {
        if (err3) return res.status(500).json({ error: `Error top: ${err3}` });

        db.query(queryBottomVentas, queryParams, (err4, resultadosBottom) => {
          if (err4) return res.status(500).json({ error: `Error bottom: ${err4}` });

          res.json({
            resumen: resultadosResumen[0],
            desgloseDiario: resultadosDesglose,
            topVentas: resultadosTop,
            bottomVentas: resultadosBottom
          });
        });
      });
    });
  });
});

// 2. Reporte de Eliminados/Anulados
app.get("/reportes/eliminaciones", (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;
  let dateConditionVenta = "";
  let dateConditionHistorial = "";
  let queryParamsVenta = [];
  let queryParamsHistorial = [];

  if (fecha_inicio && fecha_fin) {
    dateConditionVenta = `AND DATE(fecha) >= ? AND DATE(fecha) <= ?`;
    dateConditionHistorial = `WHERE DATE(fecha_eliminacion) >= ? AND DATE(fecha_eliminacion) <= ?`;
    queryParamsVenta = [fecha_inicio, fecha_fin];
    queryParamsHistorial = [fecha_inicio, fecha_fin];
  }

  // Traer historial físico (solo si existe)
  const queryHistorial = `
    SELECT id_registro_eliminado as id_registro, tabla_afectada as tabla, fecha_eliminacion as fecha, 'Eliminación Física' as accion, '' as detalle
    FROM historialEliminacion
    ${dateConditionHistorial}
    ORDER BY fecha_eliminacion DESC
  `;

  db.query(queryHistorial, queryParamsHistorial, (errHistorial, resultadosHistorial) => {
    if (errHistorial) {
      if (errHistorial.errno === 1146) {
         return res.json([]);
      }
      return res.status(500).json({ error: errHistorial.message });
    }

    res.json(resultadosHistorial);
  });
});

// ==========================================
// RUTAS PARA VENTAS
// ==========================================

// Ruta para traer clientes
app.get("/clientes", (req, res) => {
  const query = `
        SELECT id_cliente, nombre, telefono, direccion, correo
        FROM cliente;
    `;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: `Error al consultar clientes: ${err}` });
    } else {
      res.json(results);
    }
  });
});

// Ruta para traer vendedores con datos de usuario
app.get("/vendedores", (req, res) => {
  const query = `
        SELECT 
            v.id_vendedor,
            u.nombre,
            u.correo,
            v.turno,
            v.area
        FROM vendedor v
        INNER JOIN usuario u
        ON v.id_usuario = u.id_usuario;
    `;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: `Error al consultar vendedores: ${err}` });
    } else {
      res.json(results);
    }
  });
});

// Consulta usando una tabla: Venta
app.get("/ventas", (req, res) => {
  const query = `
        SELECT id_venta, fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor
        FROM venta;
    `;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: `Error al consultar ventas: ${err}` });
    } else {
      res.json(results);
    }
  });
});

// Consulta usando varias tablas
app.get("/ventas-detalle", (req, res) => {
  const query = `
        SELECT 
            v.id_venta,
            v.fecha,
            c.nombre AS cliente,
            u.nombre AS vendedor,
            p.id_producto,
            p.nombre AS producto,
            dv.cantidad,
            dv.precio_unitario,
            dv.descuento AS descuento_detalle,
            dv.subtotal AS subtotal_detalle,
            v.subtotal,
            v.descuento,
            v.total,
            v.estado,
            pa.metodo_pago,
            pa.monto,
            pa.moneda,
            pa.estado_pago,
            pa.fecha_pago,
            pa.referencia,
            v.id_cliente,
            v.id_vendedor
        FROM venta v
        INNER JOIN cliente c
        ON v.id_cliente = c.id_cliente
        INNER JOIN vendedor ve
        ON v.id_vendedor = ve.id_vendedor
        INNER JOIN usuario u
        ON ve.id_usuario = u.id_usuario
        INNER JOIN detalleventa dv
        ON v.id_venta = dv.id_venta
        INNER JOIN producto p
        ON dv.id_producto = p.id_producto
        INNER JOIN pago pa
        ON v.id_venta = pa.id_venta;
    `;

  db.query(query, (err, results) => {
    if (err) {
      res
        .status(500)
        .json({ error: `Error al consultar ventas con detalle: ${err}` });
    } else {
      res.json(results);
    }
  });
});

// Registrar venta con detalle y pago
app.post("/ventas", (req, res) => {
  const { fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor, id_producto, cantidad, precio_unitario, descuento_detalle, subtotal_detalle, metodo_pago, monto, moneda, estado_pago, fecha_pago, referencia } = req.body;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: "Error al iniciar la transacción." });

    const stockQuery = `SELECT stock_actual FROM inventario WHERE id_producto = ? FOR UPDATE;`;
    db.query(stockQuery, [id_producto], (err, stockResult) => {
      if (err) return db.rollback(() => res.status(500).json({ error: `Error al verificar stock: ${err}` }));
      if (stockResult.length === 0) return db.rollback(() => res.status(404).json({ error: "Producto no encontrado en inventario" }));
      
      const stockActual = stockResult[0].stock_actual;
      if (cantidad > stockActual) return db.rollback(() => res.status(400).json({ error: `Stock insuficiente. Disponible: ${stockActual}` }));

      const ventaQuery = `INSERT INTO venta (fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor) VALUES (?, ?, ?, ?, ?, ?, ?);`;
      db.query(ventaQuery, [fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor], (err, ventaResult) => {
        if (err) return db.rollback(() => res.status(500).json({ error: `Error al registrar venta: ${err}` }));
        
        const idVenta = ventaResult.insertId;
        const detalleQuery = `INSERT INTO detalleventa (id_venta, id_producto, cantidad, precio_unitario, descuento, subtotal) VALUES (?, ?, ?, ?, ?, ?);`;
        
        db.query(detalleQuery, [idVenta, id_producto, cantidad, precio_unitario, descuento_detalle, subtotal_detalle], (err) => {
          if (err) return db.rollback(() => res.status(500).json({ error: `Error al registrar detalle: ${err}` }));
          
          const pagoQuery = `INSERT INTO pago (metodo_pago, monto, moneda, estado_pago, fecha_pago, referencia, id_venta) VALUES (?, ?, ?, ?, ?, ?, ?);`;
          db.query(pagoQuery, [metodo_pago, monto, moneda, estado_pago, fecha_pago, referencia, idVenta], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: `Error al registrar pago: ${err}` }));
            
            const actualizarStock = `UPDATE inventario SET stock_actual = stock_actual - ? WHERE id_producto = ?;`;
            db.query(actualizarStock, [cantidad, id_producto], (err) => {
              if (err) return db.rollback(() => res.status(500).json({ error: `Error al actualizar stock: ${err}` }));
              
              db.commit((err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: `Error al procesar la transacción: ${err}` }));
                res.json({ message: "Venta registrada exitosamente", id_venta: idVenta });
              });
            });
          });
        });
      });
    });
  });
});

// Modificar venta con detalle y pago
app.put("/ventas/:id", (req, res) => {
  const { id } = req.params;
  const { fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor, id_producto, cantidad, precio_unitario, descuento_detalle, subtotal_detalle, metodo_pago, monto, moneda, estado_pago, fecha_pago, referencia } = req.body;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: "Error al iniciar la transacción." });

    // BUG-15 Fix: Obtener cantidad original para recalcular el stock
    db.query('SELECT cantidad FROM detalleventa WHERE id_venta = ? LIMIT 1', [id], (err, results) => {
      if (err) return db.rollback(() => res.status(500).json({ error: `Error al obtener detalle: ${err}` }));
      
      const cantidadOriginal = results.length > 0 ? results[0].cantidad : cantidad;
      const diferencia = cantidadOriginal - cantidad; // Si original 5, nueva 2, diff 3 (se suman 3 al stock). Si original 2, nueva 5, diff -3 (se restan 3).

      const ventaQuery = `UPDATE venta SET fecha = ?, subtotal = ?, descuento = ?, total = ?, estado = ?, id_cliente = ?, id_vendedor = ? WHERE id_venta = ?;`;
      db.query(ventaQuery, [fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor, id], (err) => {
        if (err) return db.rollback(() => res.status(500).json({ error: `Error al modificar venta: ${err}` }));

        const detalleQuery = `UPDATE detalleventa SET id_producto = ?, cantidad = ?, precio_unitario = ?, descuento = ?, subtotal = ? WHERE id_venta = ?;`;
        db.query(detalleQuery, [id_producto, cantidad, precio_unitario, descuento_detalle, subtotal_detalle, id], (err) => {
          if (err) return db.rollback(() => res.status(500).json({ error: `Error al modificar detalle: ${err}` }));

          const pagoQuery = `UPDATE pago SET metodo_pago = ?, monto = ?, moneda = ?, estado_pago = ?, fecha_pago = ?, referencia = ? WHERE id_venta = ?;`;
          db.query(pagoQuery, [metodo_pago, monto, moneda, estado_pago, fecha_pago, referencia, id], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: `Error al modificar pago: ${err}` }));
            
            if (diferencia !== 0) {
              const inventarioQuery = `UPDATE inventario SET stock_actual = stock_actual + ? WHERE id_producto = ?;`;
              db.query(inventarioQuery, [diferencia, id_producto], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: `Error al ajustar inventario: ${err}` }));
                
                db.commit((err) => {
                  if (err) return db.rollback(() => res.status(500).json({ error: `Error al procesar la transacción: ${err}` }));
                  res.json({ message: "Venta modificada exitosamente" });
                });
              });
            } else {
              db.commit((err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: `Error al procesar la transacción: ${err}` }));
                res.json({ message: "Venta modificada exitosamente" });
              });
            }
          });
        });
      });
    });
  });
});

// Eliminación lógica de venta
app.put("/ventas/:id/eliminar-logico", (req, res) => {
  const { id } = req.params;

  const query = `
        UPDATE venta
        SET estado = 'Cancelada'
        WHERE id_venta = ?;
    `;

  db.query(query, [id], (err) => {
    if (err) {
      res
        .status(500)
        .json({ error: `Error al eliminar lógicamente la venta: ${err}` });
    } else {
      res.json({ message: "Venta eliminada lógicamente" });
    }
  });
});

// Eliminación física de venta (Con historial y transacción)
app.delete("/ventas/:id", (req, res) => {
  const { id } = req.params;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: "Error al iniciar la transacción." });

    const getDetalleQuery = `SELECT id_producto, cantidad FROM detalleventa WHERE id_venta = ?;`;
    db.query(getDetalleQuery, [id], (err, detalleResult) => {
      if (err) return db.rollback(() => res.status(500).json({ error: `Error al consultar detalle: ${err}` }));
      
      const id_producto = detalleResult[0]?.id_producto;
      const cantidad = detalleResult[0]?.cantidad || 0;

      const deletePago = `DELETE FROM pago WHERE id_venta = ?;`;
      db.query(deletePago, [id], (err) => {
        if (err) return db.rollback(() => res.status(500).json({ error: `Error al eliminar pago: ${err}` }));

        const deleteDetalle = `DELETE FROM detalleventa WHERE id_venta = ?;`;
        db.query(deleteDetalle, [id], (err) => {
          if (err) return db.rollback(() => res.status(500).json({ error: `Error al eliminar detalle de venta: ${err}` }));

          const deleteVenta = `DELETE FROM venta WHERE id_venta = ?;`;
          db.query(deleteVenta, [id], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: `Error al eliminar venta: ${err}` }));

            if (id_producto) {
              const actualizarStock = `UPDATE inventario SET stock_actual = stock_actual + ? WHERE id_producto = ?;`;
              db.query(actualizarStock, [cantidad, id_producto], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: `Error al revertir inventario: ${err}` }));
                
                const insertHistorial = `INSERT INTO HistorialEliminacion (tabla_afectada, id_registro_eliminado, motivo) VALUES ('Venta', ?, 'Eliminado permanentemente');`;
                db.query(insertHistorial, [id], (err) => {
                  if (err) return db.rollback(() => res.status(500).json({ error: `Error al guardar en historial: ${err}` }));
                  
                  db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: "Error al hacer commit." }));
                    res.json({ message: "Venta eliminada físicamente (Stock restaurado)." });
                  });
                });
              });
            } else {
               const insertHistorial = `INSERT INTO HistorialEliminacion (tabla_afectada, id_registro_eliminado, motivo) VALUES ('Venta', ?, 'Eliminado permanentemente sin detalle');`;
               db.query(insertHistorial, [id], (err) => {
                  if (err) return db.rollback(() => res.status(500).json({ error: `Error al guardar en historial: ${err}` }));
                  
                  db.commit((err) => {
                    if (err) return db.rollback(() => res.status(500).json({ error: "Error al hacer commit." }));
                    res.json({ message: "Venta eliminada físicamente." });
                  });
                });
            }
          });
        });
      });
    });
  });
});

// RUTAS PARA CLIENTES

// Ruta para traer todos los clientes
app.get("/clientes", (req, res) => {
  const query = `
        SELECT id_cliente, nombre, telefono, direccion, correo
        FROM cliente;
    `;

  db.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: `Error al consultar clientes: ${err}` });
    } else {
      res.json(results);
    }
  });
});

// Consulta usando dos tablas: Cliente + Venta
app.get("/clientes-ventas", (req, res) => {
  const query = `
        SELECT
            c.id_cliente,
            c.nombre,
            c.telefono,
            c.direccion,
            c.correo,
            v.id_venta,
            v.fecha,
            v.total,
            v.estado
        FROM cliente c
        LEFT JOIN venta v
        ON c.id_cliente = v.id_cliente;
    `;

  db.query(query, (err, results) => {
    if (err) {
      res
        .status(500)
        .json({ error: `Error al consultar clientes con ventas: ${err}` });
    } else {
      res.json(results);
    }
  });
});

// Ruta para registrar cliente
app.post("/clientes", (req, res) => {
  const { nombre, telefono, direccion, correo } = req.body;

  const query = `
        INSERT INTO cliente (nombre, telefono, direccion, correo)
        VALUES (?, ?, ?, ?);
    `;

  db.query(query, [nombre, telefono, direccion, correo], (err, results) => {
    if (err) {
      res.status(500).json({ error: `Error al registrar cliente: ${err}` });
    } else {
      res.json({
        message: "Cliente registrado exitosamente",
        id_cliente: results.insertId,
      });
    }
  });
});

// Ruta para modificar cliente
app.put("/clientes/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, direccion, correo } = req.body;

  const query = `
        UPDATE cliente
        SET nombre = ?, telefono = ?, direccion = ?, correo = ?
        WHERE id_cliente = ?;
    `;

  db.query(query, [nombre, telefono, direccion, correo, id], (err) => {
    if (err) {
      res.status(500).json({ error: `Error al modificar cliente: ${err}` });
    } else {
      res.json({ message: "Cliente modificado exitosamente" });
    }
  });
});

// Ruta para eliminar físicamente cliente
app.delete("/clientes/:id", (req, res) => {
  const { id } = req.params;

  const handleFKError = (err, res, contexto) => {
    if (err.errno === 1451) {
      return res.status(409).json({ error: `No se puede eliminar físicamente este ${contexto} porque tiene ventas asociadas en el sistema.` });
    }
    return res.status(500).json({ error: `Error al eliminar ${contexto}: ${err}` });
  };

  const query = `DELETE FROM cliente WHERE id_cliente = ?;`;

  db.query(query, [id], (err) => {
    if (err) return handleFKError(err, res, "cliente");
    res.json({ message: "Cliente eliminado físicamente" });
  });
});

app.listen(puerto, (err) => {
  if (err) {
    console.error(`Error al iniciar el servidor: ${err}`);
  } else {
    console.log(`Servidor corriendo en el puerto ${puerto}`);
  }
});
