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
  port: 3306
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
      IFNULL(SUM(total), 0) as ingresos_totales,
      COUNT(id_venta) as total_ventas,
      IFNULL(MAX(total), 0) as venta_maxima, 
      IFNULL(MIN(total), 0) as venta_minima, 
      IFNULL(AVG(total), 0) as venta_promedio
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
    ORDER BY DATE(fecha) DESC
  `;

  const queryTodasVentas = `
    SELECT 
      id_venta,
      fecha,
      total,
      id_vendedor
    FROM venta
    ${dateCondition}
    ORDER BY fecha DESC
  `;

  const queryVentasPorMes = `
    SELECT 
      DATE_FORMAT(fecha, '%Y-%m') as mes,
      COUNT(id_venta) as cantidad,
      IFNULL(SUM(total), 0) as total_mes,
      IFNULL(MAX(total), 0) as max_mes,
      IFNULL(MIN(total), 0) as min_mes
    FROM venta
    ${dateCondition}
    GROUP BY DATE_FORMAT(fecha, '%Y-%m')
    ORDER BY mes DESC
  `;

  db.query(queryResumen, queryParams, (err, resultadosResumen) => {
    if (err) return res.status(500).json({ error: `Error resumen: ${err}` });

    db.query(queryDesgloseDiario, queryParams, (err2, resultadosDesglose) => {
      if (err2) return res.status(500).json({ error: `Error desglose: ${err2}` });

      db.query(queryTodasVentas, queryParams, (err3, resultadosTodas) => {
        if (err3) return res.status(500).json({ error: `Error todas las ventas: ${err3}` });

        db.query(queryVentasPorMes, queryParams, (err4, resultadosMes) => {
          if (err4) return res.status(500).json({ error: `Error ventas por mes: ${err4}` });

          let idMax = null;
          let idMin = null;
          if (resultadosTodas && resultadosTodas.length > 0) {
            let maxObj = resultadosTodas[0];
            let minObj = resultadosTodas[0];
            for (let v of resultadosTodas) {
              if (v.total > maxObj.total) maxObj = v;
              if (v.total < minObj.total) minObj = v;
            }
            idMax = maxObj.id_venta;
            idMin = minObj.id_venta;
          }

          res.json({
            resumen: {
              ...resultadosResumen[0],
              id_venta_maxima: idMax,
              id_venta_minima: idMin
            },
            desgloseDiario: resultadosDesglose,
            todasVentas: resultadosTodas,
            ventasPorMes: resultadosMes
          });
        });
      });
    });
  });
});

// 2. Reporte de Ventas Canceladas / Eliminación Lógica
app.get("/reportes/eliminaciones", (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;
  let dateCondition = "WHERE h.tabla_afectada = 'Venta'";
  let queryParams = [];

  if (fecha_inicio && fecha_fin) {
    dateCondition += ` AND DATE(h.fecha_eliminacion) >= ? AND DATE(h.fecha_eliminacion) <= ?`;
    queryParams = [fecha_inicio, fecha_fin];
  }

  // Traer ventas canceladas desde la tabla HistorialEliminacion
  const queryCanceladas = `
    SELECT 
      h.id_registro_eliminado as id_registro,
      h.tabla_afectada as tabla,
      h.fecha_eliminacion as fecha,
      v.total as monto,
      c.nombre as cliente
    FROM HistorialEliminacion h
    LEFT JOIN venta v ON h.id_registro_eliminado = v.id_venta
    LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
    ${dateCondition}
    ORDER BY h.fecha_eliminacion DESC
  `;

  db.query(queryCanceladas, queryParams, (err, resultados) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(resultados);
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
            GROUP_CONCAT(p.nombre SEPARATOR ', ') AS producto,
            SUM(dv.cantidad) AS cantidad,
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
        ON v.id_venta = pa.id_venta
        GROUP BY v.id_venta;
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

// Obtener recibo completo
app.get("/ventas/:id/recibo", async (req, res) => {
  try {
    const id = req.params.id;
    const vResult = await new Promise((resolve, reject) => {
      db.query(`SELECT v.id_venta, v.fecha, c.nombre AS cliente, c.telefono AS cliente_telefono, c.dni AS cliente_dni, c.correo AS cliente_correo, u.nombre AS vendedor, pa.metodo_pago, pa.moneda, v.total
                FROM venta v JOIN cliente c ON v.id_cliente = c.id_cliente
                JOIN vendedor ve ON v.id_vendedor = ve.id_vendedor JOIN usuario u ON ve.id_usuario = u.id_usuario
                JOIN pago pa ON v.id_venta = pa.id_venta WHERE v.id_venta = ?`, [id], (err, r) => err ? reject(err) : resolve(r));
    });
    if(!vResult.length) return res.status(404).json({error:"No encontrado"});
    const pResult = await new Promise((resolve, reject) => {
      db.query(`SELECT p.nombre, dv.precio_unitario AS precio, dv.cantidad, dv.subtotal
                FROM detalleventa dv JOIN producto p ON dv.id_producto = p.id_producto WHERE dv.id_venta = ?`, [id], (err, r) => err ? reject(err) : resolve(r));
    });
    const recibo = { ...vResult[0], productos: pResult };
    res.json(recibo);
  } catch (error) { res.status(500).json({error: error.message}); }
});

// Registrar venta con detalle y pago
app.post("/ventas", async (req, res) => {
  const { fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor, productos, metodo_pago, monto, moneda, estado_pago, fecha_pago } = req.body;

  db.beginTransaction(async (err) => {
    if (err) return res.status(500).json({ error: "Error al iniciar la transacción." });

    try {
      // 1. Insertar Venta
      const ventaResult = await new Promise((resolve, reject) => {
        db.query(`INSERT INTO venta (fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor) VALUES (?, ?, ?, ?, ?, ?, ?);`, 
        [fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor], (err, result) => err ? reject(err) : resolve(result));
      });
      const idVenta = ventaResult.insertId;

      // 2. Insertar Pago
      await new Promise((resolve, reject) => {
        db.query(`INSERT INTO pago (metodo_pago, monto, moneda, estado_pago, fecha_pago, referencia, id_venta) VALUES (?, ?, ?, ?, ?, NULL, ?);`, 
        [metodo_pago, monto, moneda, estado_pago, fecha_pago, idVenta], (err, result) => err ? reject(err) : resolve(result));
      });

      // 3. Procesar Productos
      for (const prod of productos) {
        const stockResult = await new Promise((resolve, reject) => {
          db.query(`SELECT stock_actual FROM inventario WHERE id_producto = ? FOR UPDATE;`, [prod.id_producto], (err, res) => err ? reject(err) : resolve(res));
        });
        
        if (stockResult.length === 0) throw new Error(`Producto no encontrado.`);
        if (prod.cantidad > stockResult[0].stock_actual) throw new Error(`Stock insuficiente para el producto.`);

        await new Promise((resolve, reject) => {
          db.query(`INSERT INTO detalleventa (id_venta, id_producto, cantidad, precio_unitario, descuento, subtotal) VALUES (?, ?, ?, ?, ?, ?);`, 
          [idVenta, prod.id_producto, prod.cantidad, prod.precio_unitario, 0, prod.subtotal], (err, result) => err ? reject(err) : resolve(result));
        });

        await new Promise((resolve, reject) => {
          db.query(`UPDATE inventario SET stock_actual = stock_actual - ? WHERE id_producto = ?;`, 
          [prod.cantidad, prod.id_producto], (err, result) => err ? reject(err) : resolve(result));
        });
      }

      db.commit((err) => {
        if (err) throw err;
        res.json({ message: "Venta registrada exitosamente", id_venta: idVenta });
      });

    } catch (error) {
      db.rollback(() => {
        res.status(500).json({ error: error.message || `Error al procesar la transacción` });
      });
    }
  });
});

// Modificar venta con detalle y pago
app.put("/ventas/:id", (req, res) => {
  const { id } = req.params;
  const { fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor, metodo_pago, monto, moneda, estado_pago, fecha_pago } = req.body;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: "Error al iniciar la transacción." });

    const ventaQuery = `UPDATE venta SET fecha = ?, subtotal = ?, descuento = ?, total = ?, estado = ?, id_cliente = ?, id_vendedor = ? WHERE id_venta = ?;`;
    db.query(ventaQuery, [fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor, id], (err) => {
      if (err) return db.rollback(() => res.status(500).json({ error: `Error al modificar venta: ${err}` }));

      const pagoQuery = `UPDATE pago SET metodo_pago = ?, monto = ?, moneda = ?, estado_pago = ?, fecha_pago = ? WHERE id_venta = ?;`;
      db.query(pagoQuery, [metodo_pago, monto, moneda, estado_pago, fecha_pago, id], (err) => {
        if (err) return db.rollback(() => res.status(500).json({ error: `Error al modificar pago: ${err}` }));
        
        db.commit((err) => {
          if (err) return db.rollback(() => res.status(500).json({ error: `Error al procesar la transacción: ${err}` }));
          res.json({ message: "Venta modificada exitosamente" });
        });
      });
    });
  });
});

// Eliminación lógica de venta
app.put("/ventas/:id/eliminar-logico", (req, res) => {
  const { id } = req.params;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: "Error al iniciar la transacción." });

    const queryUpdate = `
          UPDATE venta
          SET estado = 'Cancelada'
          WHERE id_venta = ?;
      `;

    db.query(queryUpdate, [id], (err) => {
      if (err) return db.rollback(() => res.status(500).json({ error: `Error al cancelar la venta: ${err}` }));
      
      const getDetalleQuery = `SELECT id_producto, cantidad FROM detalleventa WHERE id_venta = ?;`;
      db.query(getDetalleQuery, [id], (err, detalles) => {
        if (err) return db.rollback(() => res.status(500).json({ error: `Error al consultar detalle para restaurar stock: ${err}` }));

        const restorePromises = detalles.map(prod => {
          return new Promise((resolve, reject) => {
            db.query(`UPDATE inventario SET stock_actual = stock_actual + ? WHERE id_producto = ?;`, 
            [prod.cantidad, prod.id_producto], (err, result) => err ? reject(err) : resolve(result));
          });
        });

        Promise.all(restorePromises).then(() => {
          const insertHistorial = `INSERT INTO HistorialEliminacion (tabla_afectada, id_registro_eliminado, motivo) VALUES ('Venta', ?, 'Venta Cancelada');`;
          db.query(insertHistorial, [id], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: `Error al guardar en historial: ${err}` }));
            
            db.commit((err) => {
              if (err) return db.rollback(() => res.status(500).json({ error: "Error al hacer commit." }));
              res.json({ message: "Venta cancelada exitosamente y stock restaurado." });
            });
          });
        }).catch(err => {
           db.rollback(() => res.status(500).json({ error: `Error al restaurar stock de inventario: ${err}` }));
        });
      });
    });
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
        SELECT id_cliente, nombre, dni, telefono, direccion, correo
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
            c.dni,
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
  const { nombre, dni, telefono, direccion, correo } = req.body;

  const query = `
        INSERT INTO cliente (nombre, dni, telefono, direccion, correo)
        VALUES (?, ?, ?, ?, ?);
    `;
  db.query(
    query,
    [nombre, dni, telefono, direccion, correo], (err, results) => {
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
  const { nombre, dni, telefono, direccion, correo } = req.body;

  const query = `
        UPDATE cliente
        SET nombre = ?, dni = ?, telefono = ?, direccion = ?, correo = ?
        WHERE id_cliente = ?;
    `;
  db.query(
    query,
    [nombre, dni, telefono, direccion, correo, id], (err) => {
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

// 3. Reporte de Ventas, Inventario e Indicadores por Rango de Fechas
app.get("/reportes/ventas-inventario-indicadores", (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  let condicionVentas = "WHERE v.estado != 'Cancelada'";
  let parametrosVentas = [];

  if (fecha_inicio && fecha_fin) {
    condicionVentas += " AND DATE(v.fecha) >= ? AND DATE(v.fecha) <= ?";
    parametrosVentas = [fecha_inicio, fecha_fin];
  }

  // Detalle de ventas por fecha
  const queryVentasDetalle = `
    SELECT 
      v.id_venta,
      v.fecha,
      c.nombre AS cliente,
      u.nombre AS vendedor,
      p.nombre AS producto,
      dv.cantidad,
      dv.precio_unitario,
      dv.subtotal AS subtotal_detalle,
      v.total,
      pa.metodo_pago
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
      ON v.id_venta = pa.id_venta
    ${condicionVentas}
    ORDER BY v.fecha DESC;
  `;

  // Indicadores generales del periodo
  const queryIndicadoresVentas = `
    SELECT
      COUNT(v.id_venta) AS total_ventas,
      IFNULL(SUM(v.total), 0) AS ingresos_periodo,
      IFNULL(AVG(v.total), 0) AS promedio_venta
    FROM venta v
    ${condicionVentas};
  `;

  // Total de unidades vendidas
  const queryUnidadesVendidas = `
    SELECT
      IFNULL(SUM(dv.cantidad), 0) AS unidades_vendidas
    FROM venta v
    INNER JOIN detalleventa dv
      ON v.id_venta = dv.id_venta
    ${condicionVentas};
  `;

  // Producto más vendido en el periodo
  const queryProductoMasVendido = `
    SELECT
      p.nombre AS producto,
      IFNULL(SUM(dv.cantidad), 0) AS cantidad_vendida
    FROM venta v
    INNER JOIN detalleventa dv
      ON v.id_venta = dv.id_venta
    INNER JOIN producto p
      ON dv.id_producto = p.id_producto
    ${condicionVentas}
    GROUP BY p.id_producto, p.nombre
    ORDER BY cantidad_vendida DESC
    LIMIT 1;
  `;

  // Control de inventario general
  const queryInventario = `
    SELECT
      p.id_producto,
      p.nombre AS producto,
      p.marca,
      p.modelo,
      p.precio,
      i.stock_actual,
      i.stock_minimo,
      CASE
        WHEN i.stock_actual <= i.stock_minimo THEN 'Bajo stock'
        ELSE 'Stock suficiente'
      END AS estado_stock
    FROM producto p
    INNER JOIN inventario i
      ON p.id_producto = i.id_producto
    ORDER BY i.stock_actual ASC;
  `;

  // Producto con menor stock
  const queryProductoMenorStock = `
    SELECT
      p.nombre AS producto,
      i.stock_actual,
      i.stock_minimo
    FROM producto p
    INNER JOIN inventario i
      ON p.id_producto = i.id_producto
    ORDER BY i.stock_actual ASC
    LIMIT 1;
  `;

  db.query(queryVentasDetalle, parametrosVentas, (errVentas, ventasDetalle) => {
    if (errVentas) {
      return res.status(500).json({ error: `Error al obtener ventas por fecha: ${errVentas}` });
    }

    db.query(queryIndicadoresVentas, parametrosVentas, (errIndicadores, indicadoresVentas) => {
      if (errIndicadores) {
        return res.status(500).json({ error: `Error al obtener indicadores de ventas: ${errIndicadores}` });
      }

      db.query(queryUnidadesVendidas, parametrosVentas, (errUnidades, unidadesVendidas) => {
        if (errUnidades) {
          return res.status(500).json({ error: `Error al obtener unidades vendidas: ${errUnidades}` });
        }

        db.query(queryProductoMasVendido, parametrosVentas, (errMasVendido, productoMasVendido) => {
          if (errMasVendido) {
            return res.status(500).json({ error: `Error al obtener producto más vendido: ${errMasVendido}` });
          }

          db.query(queryInventario, (errInventario, inventario) => {
            if (errInventario) {
              return res.status(500).json({ error: `Error al obtener inventario: ${errInventario}` });
            }

            db.query(queryProductoMenorStock, (errMenorStock, productoMenorStock) => {
              if (errMenorStock) {
                return res.status(500).json({ error: `Error al obtener producto con menor stock: ${errMenorStock}` });
              }

              res.json({
                ventasDetalle: ventasDetalle,
                inventario: inventario,
                indicadores: {
                  total_ventas: indicadoresVentas[0]?.total_ventas || 0,
                  ingresos_periodo: indicadoresVentas[0]?.ingresos_periodo || 0,
                  promedio_venta: indicadoresVentas[0]?.promedio_venta || 0,
                  unidades_vendidas: unidadesVendidas[0]?.unidades_vendidas || 0,
                  producto_mas_vendido: productoMasVendido[0]?.producto || 'Sin datos',
                  cantidad_producto_mas_vendido: productoMasVendido[0]?.cantidad_vendida || 0,
                  producto_menor_stock: productoMenorStock[0]?.producto || 'Sin datos',
                  stock_menor: productoMenorStock[0]?.stock_actual || 0
                }
              });
            });
          });
        });
      });
    });
  });
});

// 3. Reporte de Ventas por Fechas
app.get("/reportes/ventas-por-fechas", (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  let condicion = "WHERE v.estado != 'Cancelada'";
  let parametros = [];

  if (fecha_inicio && fecha_fin) {
    condicion += " AND DATE(v.fecha) >= ? AND DATE(v.fecha) <= ?";
    parametros = [fecha_inicio, fecha_fin];
  }

  const query = `
    SELECT 
      v.id_venta,
      v.fecha,
      c.nombre AS cliente,
      u.nombre AS vendedor,
      p.nombre AS producto,
      dv.cantidad,
      dv.precio_unitario,
      dv.subtotal AS subtotal_detalle,
      v.descuento,
      v.total,
      pa.metodo_pago
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
      ON v.id_venta = pa.id_venta
    ${condicion}
    ORDER BY v.fecha DESC;
  `;

  db.query(query, parametros, (err, results) => {
    if (err) {
      return res.status(500).json({ error: `Error al obtener ventas por fechas: ${err}` });
    }

    res.json(results);
  });
});


// 4. Reporte de Indicadores de Ventas según el Word
app.get("/reportes/indicadores-ventas", (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  let condicionCompletadas = "WHERE v.estado != 'Cancelada'";
  let parametros = [];

  if (fecha_inicio && fecha_fin) {
    condicionCompletadas += " AND DATE(v.fecha) >= ? AND DATE(v.fecha) <= ?";
    parametros = [fecha_inicio, fecha_fin];
  }

  // INDICADOR 1: CONCENTRACIÓN DE VENTAS POR PRODUCTO
  // Concentración % = (Unidades vendidas del producto más vendido / Total de unidades vendidas) * 100
  const queryConcentracionProducto = `
    SELECT
      p.nombre AS producto,
      SUM(dv.cantidad) AS unidades_vendidas
    FROM venta v
    INNER JOIN detalleventa dv ON v.id_venta = dv.id_venta
    INNER JOIN producto p ON dv.id_producto = p.id_producto
    ${condicionCompletadas}
    GROUP BY p.id_producto, p.nombre
    ORDER BY unidades_vendidas DESC;
  `;

  // INDICADOR 2: MÉTODO DE PAGO PREFERIDO
  // Método Preferido % = (Nro. de ventas con el método X / Total de ventas del periodo) * 100
  const queryMetodoPago = `
    SELECT
      pa.metodo_pago,
      COUNT(pa.id_pago) AS cantidad
    FROM venta v
    INNER JOIN pago pa ON v.id_venta = pa.id_venta
    ${condicionCompletadas}
    GROUP BY pa.metodo_pago
    ORDER BY cantidad DESC;
  `;

  // INDICADOR 3: NIVEL DE STOCK CRÍTICO
  // Stock Crítico % = (Nro. de productos con stock actual <= stock mínimo / Total de productos) * 100
  const queryStockCritico = `
    SELECT
      p.id_producto,
      p.nombre AS producto,
      i.stock_actual,
      i.stock_minimo
    FROM producto p
    INNER JOIN inventario i ON p.id_producto = i.id_producto;
  `;

  // INDICADOR 4: TAMAÑO PROMEDIO DE LA CANASTA DE COMPRA
  // Canasta Promedio = Σ(Nro. de productos distintos por venta) / Nro. total de ventas
  const queryCanastaPromedio = `
    SELECT
      dv.id_venta,
      COUNT(DISTINCT dv.id_producto) AS productos_distintos
    FROM venta v
    INNER JOIN detalleventa dv ON v.id_venta = dv.id_venta
    ${condicionCompletadas}
    GROUP BY dv.id_venta;
  `;

  // INDICADOR 5: TASA DE CLIENTES RECURRENTES
  // Tasa de Recurrencia % = (Nro. de clientes con más de una compra / Total de clientes distintos) * 100
  const queryClientesRecurrentes = `
    SELECT
      v.id_cliente,
      COUNT(v.id_venta) AS compras
    FROM venta v
    ${condicionCompletadas}
    GROUP BY v.id_cliente;
  `;

  db.query(queryConcentracionProducto, parametros, (err1, concentracionResult) => {
    if (err1) {
      return res.status(500).json({
        error: `Error al obtener concentración de ventas por producto: ${err1}`
      });
    }

    db.query(queryMetodoPago, parametros, (err2, metodoPagoResult) => {
      if (err2) {
        return res.status(500).json({
          error: `Error al obtener método de pago preferido: ${err2}`
        });
      }

      db.query(queryStockCritico, (err3, stockResult) => {
        if (err3) {
          return res.status(500).json({
            error: `Error al obtener nivel de stock crítico: ${err3}`
          });
        }

        db.query(queryCanastaPromedio, parametros, (err4, canastaResult) => {
          if (err4) {
            return res.status(500).json({
              error: `Error al obtener tamaño promedio de canasta: ${err4}`
            });
          }

          db.query(queryClientesRecurrentes, parametros, (err5, clientesResult) => {
            if (err5) {
              return res.status(500).json({
                error: `Error al obtener tasa de clientes recurrentes: ${err5}`
              });
            }

            // --- Cálculo 1: Concentración de ventas por producto ---
            const totalUnidades = concentracionResult.reduce(
              (acc, item) => acc + Number(item.unidades_vendidas || 0), 0
            );
            const productoTop = concentracionResult[0] || null;
            const concentracionPorcentaje = totalUnidades > 0 && productoTop
              ? ((productoTop.unidades_vendidas / totalUnidades) * 100).toFixed(2)
              : "0.00";

            // --- Cálculo 2: Método de pago preferido ---
            const totalPagos = metodoPagoResult.reduce(
              (acc, item) => acc + Number(item.cantidad || 0), 0
            );
            const metodoTop = metodoPagoResult[0] || null;
            const metodoPorcentaje = totalPagos > 0 && metodoTop
              ? ((metodoTop.cantidad / totalPagos) * 100).toFixed(2)
              : "0.00";

            // --- Cálculo 3: Nivel de stock crítico ---
            const totalProductos = stockResult.length;
            const productosCriticos = stockResult.filter(
              p => Number(p.stock_actual) <= Number(p.stock_minimo)
            );
            const stockCriticoPorcentaje = totalProductos > 0
              ? ((productosCriticos.length / totalProductos) * 100).toFixed(2)
              : "0.00";

            // --- Cálculo 4: Tamaño promedio de canasta ---
            const totalVentasCanasta = canastaResult.length;
            const sumaProductosDistintos = canastaResult.reduce(
              (acc, item) => acc + Number(item.productos_distintos || 0), 0
            );
            const canastaPromedioValor = totalVentasCanasta > 0
              ? (sumaProductosDistintos / totalVentasCanasta).toFixed(2)
              : "0.00";

            // --- Cálculo 5: Tasa de clientes recurrentes ---
            const totalClientesDistintos = clientesResult.length;
            const clientesRecurrentes = clientesResult.filter(c => Number(c.compras) > 1);
            const tasaRecurrenciaPorcentaje = totalClientesDistintos > 0
              ? ((clientesRecurrentes.length / totalClientesDistintos) * 100).toFixed(2)
              : "0.00";
              
            // --- Cálculo 6: Cobertura de catálogo vendido ---
            const productosVendidosDistintos = concentracionResult.length;
            const coberturaCatalogoPorcentaje = totalProductos > 0
              ? ((productosVendidosDistintos / totalProductos) * 100).toFixed(2)
              : "0.00";

            res.json({
              concentracionProducto: {
                tipo: "Indicador de Producto",
                nombre: "Concentración de ventas por producto",
                descripcion:
                  "Mide qué porcentaje de las unidades vendidas corresponde al producto más demandado, evidenciando el nivel de dependencia del negocio hacia un solo artículo del catálogo.",
                formula:
                  "Concentración % = (Unidades vendidas del producto más vendido / Total de unidades vendidas del periodo) * 100",
                producto_top: productoTop?.producto || "Sin datos",
                unidades_producto_top: productoTop?.unidades_vendidas || 0,
                total_unidades_vendidas: totalUnidades,
                concentracion_porcentaje: concentracionPorcentaje,
                detalle: concentracionResult
              },

              metodoPago: {
                tipo: "Indicador Comercial",
                nombre: "Método de pago preferido",
                descripcion:
                  "Mide cuál es la forma de pago más utilizada por los clientes al concretar sus compras, permitiendo orientar decisiones sobre convenios con pasarelas de pago o promociones.",
                formula:
                  "Método Preferido % = (Nro. de ventas pagadas con el método X / Total de ventas del periodo) * 100",
                metodo_top: metodoTop?.metodo_pago || "Sin datos",
                cantidad_metodo_top: metodoTop?.cantidad || 0,
                total_pagos: totalPagos,
                metodo_porcentaje: metodoPorcentaje,
                detalle: metodoPagoResult
              },

              stockCritico: {
                tipo: "Indicador de Insumo",
                nombre: "Nivel de stock crítico",
                descripcion:
                  "Mide el porcentaje de productos cuyo stock actual se encuentra en o por debajo del mínimo establecido, alertando sobre el riesgo de desabastecimiento en el catálogo.",
                formula:
                  "Stock Crítico % = (Nro. de productos con stock actual <= stock mínimo / Total de productos registrados) * 100",
                productos_criticos: productosCriticos.length,
                total_productos: totalProductos,
                stock_critico_porcentaje: stockCriticoPorcentaje,
                detalle: stockResult
              },

              canastaPromedio: {
                tipo: "Indicador de Proceso",
                nombre: "Tamaño promedio de la canasta de compra",
                descripcion:
                  "Mide el número promedio de productos distintos que un cliente incluye en una sola venta, permitiendo evaluar el comportamiento de compra más allá del monto o la cantidad total de unidades.",
                formula:
                  "Canasta Promedio = Σ(Nro. de productos distintos por venta) / Nro. total de ventas del periodo",
                total_ventas: totalVentasCanasta,
                suma_productos_distintos: sumaProductosDistintos,
                canasta_promedio: canastaPromedioValor
              },

              clientesRecurrentes: {
                tipo: "Indicador de Resultado",
                nombre: "Tasa de clientes recurrentes",
                descripcion:
                  "Mide el porcentaje de clientes que realizaron más de una compra durante el periodo analizado, permitiendo evaluar el nivel de fidelización de la cartera de clientes.",
                formula:
                  "Tasa de Recurrencia % = (Nro. de clientes con más de una compra / Total de clientes distintos del periodo) * 100",
                clientes_recurrentes: clientesRecurrentes.length,
                total_clientes: totalClientesDistintos,
                tasa_recurrencia_porcentaje: tasaRecurrenciaPorcentaje
              },

              coberturaCatalogo: {
                tipo: "Indicador de Producto",
                nombre: "Cobertura de catálogo vendido",
                descripcion:
                  "Mide qué porcentaje del catálogo total de productos registró al menos una venta durante el periodo, permitiendo detectar productos sin rotación.",
                formula:
                  "Cobertura % = (Nro. de productos distintos vendidos en el periodo / Total de productos registrados) * 100",
                productos_vendidos_distintos: productosVendidosDistintos,
                total_productos_catalogo: totalProductos,
                cobertura_porcentaje: coberturaCatalogoPorcentaje
              }
            });
          });
        });
      });
    });
  });
});