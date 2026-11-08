/* =========================================================
   Mini Market Bamer - venta.js
   Buscador de productos, carrito y cobro de la venta.
   ========================================================= */
'use strict';

(() => {
  if (!Bamer.usuario) return;
  const { dinero, esc, numeroVenta } = Bamer;

  const $buscar = document.getElementById('buscar');
  const $categoria = document.getElementById('filtroCategoria');
  const $lista = document.getElementById('listaProductos');
  const $carrito = document.getElementById('carritoLista');
  const $total = document.getElementById('total');
  const $recibido = document.getElementById('recibido');
  const $cambio = document.getElementById('cambio');
  const $cobrar = document.getElementById('btnCobrar');
  const $vaciar = document.getElementById('btnVaciar');

  let carrito = []; // [{ id, cant }]

  const producto = (id) => Bamer.productos().find((p) => p.id === id);
  const enCarrito = (id) => (carrito.find((i) => i.id === id) || { cant: 0 }).cant;
  const totalVenta = () => carrito.reduce((s, i) => s + producto(i.id).venta * i.cant, 0);

  Bamer.categorias().forEach((c) => $categoria.insertAdjacentHTML('beforeend', `<option>${esc(c)}</option>`));

  /* ---------- Lista de productos ---------- */
  function filtrar() {
    const texto = $buscar.value.trim().toLowerCase();
    const cat = $categoria.value;
    return Bamer.productos().filter((p) =>
      (!cat || p.categoria === cat) &&
      (!texto || p.nombre.toLowerCase().includes(texto) || p.codigo.includes(texto)));
  }

  function pintarProductos() {
    const lista = filtrar();
    if (!lista.length) {
      $lista.innerHTML = '<li class="carrito-vacio" style="grid-column:1/-1">No hay productos con ese nombre o código. Revisa lo que escribiste o busca en otra categoría.</li>';
      return;
    }
    $lista.innerHTML = lista.map((p) => {
      const disponible = p.stock - enCarrito(p.id);
      const estado = Bamer.estadoStock(p);
      return `
        <li class="producto${p.stock <= 0 ? ' sin-stock' : ''}">
          <strong>${esc(p.nombre)}</strong>
          <span class="mono texto-suave">${p.codigo}</span>
          <span class="precio">${dinero(p.venta)}</span>
          <span class="stock${estado.clase !== 'ok' ? ' bajo' : ''}">${p.stock <= 0 ? 'Agotado' : `Quedan ${p.stock}`}</span>
          <button class="btn btn-sm" type="button" data-agregar="${p.id}"${disponible <= 0 ? ' disabled' : ''}>
            ${disponible <= 0 && p.stock > 0 ? 'Sin más unidades' : 'Agregar'}
          </button>
        </li>`;
    }).join('');
  }

  /* ---------- Carrito ---------- */
  function agregar(id) {
    const p = producto(id);
    if (!p) return;
    if (enCarrito(id) >= p.stock) { Bamer.toast(`Solo hay ${p.stock} unidades de ${p.nombre}.`, 'error'); return; }
    const item = carrito.find((i) => i.id === id);
    if (item) item.cant++; else carrito.push({ id, cant: 1 });
    pintar();
  }

  function cambiarCantidad(id, delta) {
    const item = carrito.find((i) => i.id === id);
    if (!item) return;
    const p = producto(id);
    if (delta > 0 && item.cant >= p.stock) { Bamer.toast(`Solo hay ${p.stock} unidades de ${p.nombre}.`, 'error'); return; }
    item.cant += delta;
    if (item.cant <= 0) carrito = carrito.filter((i) => i.id !== id);
    pintar();
  }

  function pintarCarrito() {
    if (!carrito.length) {
      $carrito.innerHTML = '<li class="carrito-vacio">Busca un producto o escanea el código para empezar la venta.</li>';
    } else {
      $carrito.innerHTML = carrito.map((i) => {
        const p = producto(i.id);
        return `
          <li class="carrito-item">
            <div><strong>${esc(p.nombre)}</strong><small>${dinero(p.venta)} c/u</small></div>
            <div class="cantidad" role="group" aria-label="Cantidad de ${esc(p.nombre)}">
              <button type="button" data-menos="${p.id}" aria-label="Quitar una unidad">−</button>
              <span>${i.cant}</span>
              <button type="button" data-mas="${p.id}" aria-label="Agregar una unidad">+</button>
            </div>
            <span class="carrito-subtotal">${dinero(p.venta * i.cant)}</span>
          </li>`;
      }).join('');
    }
    $total.textContent = dinero(totalVenta());
    $cobrar.disabled = $vaciar.disabled = !carrito.length;
    calcularCambio();
  }

  function calcularCambio() {
    const total = totalVenta();
    const recibido = Number($recibido.value);
    Validar.marcar($recibido, '');
    if (!$recibido.value || !total) { $cambio.textContent = dinero(0); $cambio.style.color = ''; return; }
    const diferencia = recibido - total;
    $cambio.textContent = diferencia >= 0 ? dinero(diferencia) : 'Faltan ' + dinero(-diferencia);
    $cambio.style.color = diferencia >= 0 ? '' : 'var(--rojo)';
  }

  function pintar() {
    pintarProductos();
    pintarCarrito();
    document.getElementById('numeroVenta').textContent = 'N° ' + numeroVenta(Bamer.siguienteId(Bamer.ventas()));
  }

  /* ---------- Cobrar ---------- */
  async function cobrar() {
    if (!carrito.length) return;
    const total = totalVenta();
    const recibido = $recibido.value ? Number($recibido.value) : total;
    if (recibido < total) {
      Validar.marcar($recibido, `Faltan ${dinero(total - recibido)} para completar el pago.`);
      $recibido.focus();
      return;
    }
    const ok = await Bamer.confirmar({
      titulo: `¿Cobrar ${dinero(total)}?`,
      mensaje: `${carrito.reduce((s, i) => s + i.cant, 0)} productos. Se descuentan del inventario al cobrar.`,
      aceptar: 'Cobrar venta',
    });
    if (!ok) return;

    const productos = Bamer.productos();
    const items = carrito.map((i) => {
      const p = productos.find((x) => x.id === i.id);
      p.stock -= i.cant;
      return { id: p.id, codigo: p.codigo, nombre: p.nombre, precio: p.venta, cant: i.cant };
    });
    const ventas = Bamer.ventas();
    const venta = {
      id: Bamer.siguienteId(ventas), fecha: new Date().toISOString(),
      vendedorId: Bamer.usuario.id, vendedor: Bamer.usuario.nombre,
      items, total, recibido, estado: 'pagada',
    };
    ventas.push(venta);
    Bamer.guardarProductos(productos);
    Bamer.guardarVentas(ventas);

    carrito = [];
    $recibido.value = '';
    pintar();
    mostrarComprobante(venta);
    Bamer.toast(`Venta ${numeroVenta(venta.id)} registrada.`);
  }

  function mostrarComprobante(v) {
    const dlg = document.createElement('dialog');
    if (typeof dlg.showModal !== 'function') return;
    dlg.className = 'modal ancho';
    dlg.innerHTML = `
      <form method="dialog" class="modal-cuerpo">
        <h2>Venta ${numeroVenta(v.id)} registrada</h2>
        <div class="detalle-cab">
          <div><span>Fecha</span>${Bamer.fechaHora(v.fecha)}</div>
          <div><span>Recibido</span>${dinero(v.recibido)}</div>
          <div><span>Cambio</span><strong>${dinero(v.recibido - v.total)}</strong></div>
        </div>
        <div class="tabla-envoltura">
          <table class="tabla">
            <thead><tr><th>Producto</th><th class="derecha">Cant.</th><th class="derecha">Subtotal</th></tr></thead>
            <tbody>${v.items.map((i) => `<tr><td>${esc(i.nombre)}</td><td class="derecha">${i.cant}</td><td class="derecha">${dinero(i.precio * i.cant)}</td></tr>`).join('')}</tbody>
            <tfoot><tr><td colspan="2">Total</td><td class="derecha">${dinero(v.total)}</td></tr></tfoot>
          </table>
        </div>
        <menu><button class="btn btn-primario" value="ok">Nueva venta</button></menu>
      </form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', () => { dlg.remove(); $buscar.focus(); });
    dlg.showModal();
  }

  /* ---------- Eventos ---------- */
  $buscar.addEventListener('input', pintarProductos);
  $categoria.addEventListener('change', pintarProductos);

  // Con lector de código de barras: el lector escribe el código y manda Enter
  $buscar.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const texto = $buscar.value.trim();
    const exacto = Bamer.productos().find((p) => p.codigo === texto);
    const lista = filtrar();
    const elegido = exacto || (lista.length === 1 ? lista[0] : null);
    if (elegido) { agregar(elegido.id); $buscar.value = ''; pintarProductos(); }
  });

  $lista.addEventListener('click', (e) => {
    const b = e.target.closest('[data-agregar]');
    if (b) agregar(Number(b.dataset.agregar));
  });
  $carrito.addEventListener('click', (e) => {
    const mas = e.target.closest('[data-mas]');
    const menos = e.target.closest('[data-menos]');
    if (mas) cambiarCantidad(Number(mas.dataset.mas), 1);
    if (menos) cambiarCantidad(Number(menos.dataset.menos), -1);
  });
  $recibido.addEventListener('input', calcularCambio);
  $cobrar.addEventListener('click', cobrar);
  $vaciar.addEventListener('click', async () => {
    if (await Bamer.confirmar({ titulo: '¿Vaciar la venta?', mensaje: 'Se quitan todos los productos del carrito.', aceptar: 'Vaciar', peligro: true })) {
      carrito = []; $recibido.value = ''; pintar();
    }
  });

  pintar();
  $buscar.focus();
})();
