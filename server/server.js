const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const app = express();

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
app.get("/login/:correo/:contrasena", (req, res) => {
  const { correo, contrasena } = req.params;

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

        res.json([
          {
            id_usuario: usuario.id_usuario,
            correo: usuario.correo,
            nombre: usuario.nombre,
            estado: usuario.estado,
            rol: rol,
          },
        ]);
      } else {
        res.json([]);
      }
    }
  });
});

// RUTAS PARA REGISTRO DE USUARIOS

app.post("/registro", (req, res) => {
  const { correo, nombre, contrasena, estado } = req.body;

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

  const query = `
    select 
    u.id_usuario as ID, u.correo as Correo,
    u.nombre as Nombre, a.turno as Turno, a.area as Rol
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

  const deleteAdmin = `
        DELETE FROM administrador
        WHERE id_usuario = ?;
    `;

  db.query(deleteAdmin, [id], (err) => {
    if (err) {
      res
        .status(500)
        .json({ error: `Error al eliminar administrador: ${err}` });
      return;
    }

    const deleteVendedor = `
            DELETE FROM vendedor
            WHERE id_usuario = ?;
        `;

    db.query(deleteVendedor, [id], (err) => {
      if (err) {
        res.status(500).json({ error: `Error al eliminar vendedor: ${err}` });
        return;
      }

      const deleteUsuario = `
                DELETE FROM usuario
                WHERE id_usuario = ?;
            `;

      db.query(deleteUsuario, [id], (err) => {
        if (err) {
          res.status(500).json({ error: `Error al eliminar usuario: ${err}` });
        } else {
          res.json({ message: "Usuario eliminado físicamente" });
        }
      });
    });
  });
});

//Rutas para modificar y eliminar administrador/vendedor (lógica y física)

// Ruta para modificar turno de administrador o vendedor
app.put("/registro/:rol/:id_usuario", (req, res) => {
  const { rol, id_usuario } = req.params;
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
        WHEN estado = 'Disponible' THEN 'Inactivo'
        ELSE 'Disponible'
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

  const deleteInventario = `
        DELETE FROM inventario
        WHERE id_producto = ?;
    `;

  db.query(deleteInventario, [id], (err) => {
    if (err) {
      res.status(500).json({ error: `Error al eliminar inventario: ${err}` });
      return;
    }

    const deleteProducto = `
            DELETE FROM producto
            WHERE id_producto = ?;
        `;

    db.query(deleteProducto, [id], (err) => {
      if (err) {
        res.status(500).json({ error: `Error al eliminar producto: ${err}` });
      } else {
        res.json({ message: "Producto eliminado físicamente" });
      }
    });
  });
});

// RUTA PARA VENTAS

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
  const {
    fecha,
    subtotal,
    descuento,
    total,
    estado,
    id_cliente,
    id_vendedor,
    id_producto,
    cantidad,
    precio_unitario,
    descuento_detalle,
    subtotal_detalle,
    metodo_pago,
    monto,
    moneda,
    estado_pago,
    fecha_pago,
    referencia,
  } = req.body;

  const stockQuery = `
    SELECT stock_actual
    FROM inventario
    WHERE id_producto = ?;
  `;

  db.query(stockQuery, [id_producto], (err, stockResult) => {
    if (err) {
      return res.status(500).json({
        error: `Error al verificar stock: ${err}`,
      });
    }

    if (stockResult.length === 0) {
      return res.status(404).json({
        error: "Producto no encontrado en inventario",
      });
    }

    const stockActual = stockResult[0].stock_actual;

    if (cantidad > stockActual) {
      return res.status(400).json({
        error: `Stock insuficiente. Disponible: ${stockActual}`,
      });
    }

    const ventaQuery = `
      INSERT INTO venta
      (fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `;

    db.query(
      ventaQuery,
      [fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor],
      (err, ventaResult) => {
        if (err) {
          return res.status(500).json({
            error: `Error al registrar venta: ${err}`,
          });
        }

        const idVenta = ventaResult.insertId;

        const detalleQuery = `
          INSERT INTO detalleventa
          (id_venta, id_producto, cantidad, precio_unitario, descuento, subtotal)
          VALUES (?, ?, ?, ?, ?, ?);
        `;

        db.query(
          detalleQuery,
          [
            idVenta,
            id_producto,
            cantidad,
            precio_unitario,
            descuento_detalle,
            subtotal_detalle,
          ],
          (err) => {
            if (err) {
              return res.status(500).json({
                error: `Error al registrar detalle de venta: ${err}`,
              });
            }

            const pagoQuery = `
              INSERT INTO pago
              (metodo_pago, monto, moneda, estado_pago, fecha_pago, referencia, id_venta)
              VALUES (?, ?, ?, ?, ?, ?, ?);
            `;

            db.query(
              pagoQuery,
              [
                metodo_pago,
                monto,
                moneda,
                estado_pago,
                fecha_pago,
                referencia,
                idVenta,
              ],
              (err) => {
                if (err) {
                  return res.status(500).json({
                    error: `Error al registrar pago: ${err}`,
                  });
                }

                const actualizarStock = `
                  UPDATE inventario
                  SET stock_actual = stock_actual - ?
                  WHERE id_producto = ?;
                `;

                db.query(
                  actualizarStock,
                  [cantidad, id_producto],
                  (err) => {
                    if (err) {
                      return res.status(500).json({
                        error: `Venta registrada pero error al actualizar stock: ${err}`,
                      });
                    }

                    res.json({
                      message: "Venta registrada exitosamente",
                      id_venta: idVenta,
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

// Modificar venta con detalle y pago
app.put("/ventas/:id", (req, res) => {
  const { id } = req.params;

  const {
    fecha,
    subtotal,
    descuento,
    total,
    estado,
    id_cliente,
    id_vendedor,
    id_producto,
    cantidad,
    precio_unitario,
    descuento_detalle,
    subtotal_detalle,
    metodo_pago,
    monto,
    moneda,
    estado_pago,
    fecha_pago,
    referencia,
  } = req.body;

  const ventaQuery = `
        UPDATE venta
        SET fecha = ?, subtotal = ?, descuento = ?, total = ?, estado = ?, id_cliente = ?, id_vendedor = ?
        WHERE id_venta = ?;
    `;

  db.query(
    ventaQuery,
    [fecha, subtotal, descuento, total, estado, id_cliente, id_vendedor, id],
    (err) => {
      if (err) {
        res.status(500).json({ error: `Error al modificar venta: ${err}` });
        return;
      }

      const detalleQuery = `
                UPDATE detalleventa
                SET id_producto = ?, cantidad = ?, precio_unitario = ?, descuento = ?, subtotal = ?
                WHERE id_venta = ?;
            `;

      db.query(
        detalleQuery,
        [
          id_producto,
          cantidad,
          precio_unitario,
          descuento_detalle,
          subtotal_detalle,
          id,
        ],
        (err) => {
          if (err) {
            res
              .status(500)
              .json({ error: `Error al modificar detalle: ${err}` });
            return;
          }

          const pagoQuery = `
                        UPDATE pago
                        SET metodo_pago = ?, monto = ?, moneda = ?, estado_pago = ?, fecha_pago = ?, referencia = ?
                        WHERE id_venta = ?;
                    `;

          db.query(
            pagoQuery,
            [
              metodo_pago,
              monto,
              moneda,
              estado_pago,
              fecha_pago,
              referencia,
              id,
            ],
            (err) => {
              if (err) {
                res
                  .status(500)
                  .json({ error: `Error al modificar pago: ${err}` });
              } else {
                res.json({ message: "Venta modificada exitosamente" });
              }
            },
          );
        },
      );
    },
  );
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

// Eliminación física de venta
app.delete("/ventas/:id", (req, res) => {
  const { id } = req.params;

  const deletePago = `
        DELETE FROM pago
        WHERE id_venta = ?;
    `;

  db.query(deletePago, [id], (err) => {
    if (err) {
      res.status(500).json({ error: `Error al eliminar pago: ${err}` });
      return;
    }

    const deleteDetalle = `
            DELETE FROM detalleventa
            WHERE id_venta = ?;
        `;

    db.query(deleteDetalle, [id], (err) => {
      if (err) {
        res
          .status(500)
          .json({ error: `Error al eliminar detalle de venta: ${err}` });
        return;
      }

      const deleteVenta = `
                DELETE FROM venta
                WHERE id_venta = ?;
            `;

      db.query(deleteVenta, [id], (err) => {
        if (err) {
          res.status(500).json({ error: `Error al eliminar venta: ${err}` });
        } else {
          res.json({ message: "Venta eliminada físicamente" });
        }
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

  const query = `
        DELETE FROM cliente
        WHERE id_cliente = ?;
    `;

  db.query(query, [id], (err) => {
    if (err) {
      res.status(500).json({ error: `Error al eliminar cliente: ${err}` });
    } else {
      res.json({ message: "Cliente eliminado físicamente" });
    }
  });
});

app.listen(puerto, (err) => {
  if (err) {
    console.error(`Error al iniciar el servidor: ${err}`);
  } else {
    console.log(`Servidor corriendo en el puerto ${puerto}`);
  }
});
