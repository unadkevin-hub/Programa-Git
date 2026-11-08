/* =========================================================
   Mini Market Bamer - historial.js
   Consulta de ventas por fecha, vendedor y estado.
   El vendedor solo ve sus propias ventas; el administrador
   puede ver todas y anular una venta.
   ========================================================= */
'use strict';

(() => {
  if (!Bamer.usuario) return;
  const { dinero, esc, numeroVenta, fechaHora } = Bamer;
  const esAdmin = Bamer.usuario.rol === 'admin';
  const POR_PAGINA = 10;

  const $desde = document.getElementById('desde');
  const $hasta = document.getElementById('hasta');
  const $vendedor = document.getElementById('filtroVendedor');
  const $estado = document.getElementById('filtroEstado');
  const $tabla = document.getElementById('tablaHistorial');
  const $pag = document.getElementById('paginacion');
  let pagina = 1;

  if (esAdmin) {
    Bamer.usuarios().filter((u) => u.rol === 'vendedor' || u.rol === 'admin')
      .forEach((u) => $vendedor.insertAdjacentHTML('beforeend', `<option value="${u.id}">${esc(u.nombre)}</option>`));
  } else {
    document.getElementById('campoVendedor').classList.add('oculto');
    document.getElementById('tituloPagina').textContent = 'Mis ventas';
    document.title = 'Mis ventas | Mini Market Bamer';
  }

  function rangoPorDefecto() {
    const hoy = new Date();
    const hace7 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6);
    $desde.value = Bamer.fechaInput(hace7);
    $hasta.value = Bamer.fechaInput(hoy);
    $vendedor.value = '';
    $estado.value = '';
  }

  function filtrar() {
    const desde = $desde.value ? new Date($desde.value + 'T00:00:00') : null;
    const hasta = $hasta.value ? new Date($hasta.value + 'T23:59:59') : null;
    return Bamer.ventas()
      .filter((v) => esAdmin || v.vendedorId === Bamer.usuario.id)
      .filter((v) => !$vendedor.value || v.vendedorId === Number($vendedor.value))
      .filter((v) => !$estado.value || v.estado === $estado.value)
      .filter((v) => { const f = new Date(v.fecha); return (!desde || f >= desde) && (!hasta || f <= hasta); })
      .sort((a, b) => b.id - a.id);
  }

  function pintar() {
    if ($desde.value && $hasta.value && $desde.value > $hasta.value) {
      $tabla.innerHTML = '<tr><td colspan="7" class="vacio">La fecha “Desde” es posterior a “Hasta”. Cambia una de las dos.</td></tr>';
      $pag.innerHTML = '';
      document.getElementById('totalHistorial').textContent = dinero(0);
      return;
    }
    const lista = filtrar();
    const pagadas = lista.filter((v) => v.estado === 'pagada');
    document.getElementById('totalHistorial').textContent = dinero(pagadas.reduce((s, v) => s + v.total, 0));
    document.getElementById('resumenHistorial').textContent = `${pagadas.length} venta${pagadas.length === 1 ? '' : 's'} pagada${pagadas.length === 1 ? '' : 's'} en el periodo`;

    const trozo = Bamer.paginar(lista, pagina, POR_PAGINA, $pag, (p) => { pagina = p; pintar(); });
    if (!trozo.length) {
      $tabla.innerHTML = '<tr><td colspan="7" class="vacio">No hay ventas con estos filtros. Prueba con otro rango de fechas.</td></tr>';
      return;
    }
    $tabla.innerHTML = trozo.map((v) => `
      <tr class="${v.estado === 'anulada' ? 'anulada' : ''}">
        <td class="mono">${numeroVenta(v.id)}</td>
        <td>${fechaHora(v.fecha)}</td>
        <td>${esc(v.vendedor)}</td>
        <td class="derecha">${v.items.reduce((s, i) => s + i.cant, 0)}</td>
        <td class="derecha total-venta">${dinero(v.total)}</td>
        <td><span class="insignia ${v.estado === 'pagada' ? 'ok' : 'neutra'}">${v.estado === 'pagada' ? 'Pagada' : 'Anulada'}</span></td>
        <td><div class="acciones-fila"><button class="btn btn-icono" type="button" data-ver="${v.id}" aria-label="Ver detalle de la venta ${numeroVenta(v.id)}" title="Ver detalle">${Bamer.iconos.ver}</button></div></td>
      </tr>`).join('');
  }

  function verDetalle(id) {
    const v = Bamer.ventas().find((x) => x.id === id);
    if (!v) return;
    const dlg = document.createElement('dialog');
    dlg.className = 'modal ancho';
    dlg.innerHTML = `
      <form method="dialog" class="modal-cuerpo">
        <h2>Venta ${numeroVenta(v.id)} <span class="insignia ${v.estado === 'pagada' ? 'ok' : 'neutra'}">${v.estado === 'pagada' ? 'Pagada' : 'Anulada'}</span></h2>
        <div class="detalle-cab">
          <div><span>Fecha</span>${fechaHora(v.fecha)}</div>
          <div><span>Vendedor</span>${esc(v.vendedor)}</div>
          <div><span>Recibido / cambio</span>${dinero(v.recibido)} / ${dinero(v.recibido - v.total)}</div>
        </div>
        <div class="tabla-envoltura">
          <table class="tabla">
            <thead><tr><th>Producto</th><th class="derecha">Precio</th><th class="derecha">Cant.</th><th class="derecha">Subtotal</th></tr></thead>
            <tbody>${v.items.map((i) => `<tr><td>${esc(i.nombre)}</td><td class="derecha">${dinero(i.precio)}</td><td class="derecha">${i.cant}</td><td class="derecha">${dinero(i.precio * i.cant)}</td></tr>`).join('')}</tbody>
            <tfoot><tr><td colspan="3">Total</td><td class="derecha">${dinero(v.total)}</td></tr></tfoot>
          </table>
        </div>
        <menu>
          ${esAdmin && v.estado === 'pagada' ? '<button class="btn btn-peligro" value="anular" style="margin-right:auto">Anular venta</button>' : ''}
          <button class="btn btn-primario" value="cerrar">Cerrar</button>
        </menu>
      </form>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('close', async () => {
      const accion = dlg.returnValue;
      dlg.remove();
      if (accion === 'anular') anular(v.id);
    });
    dlg.showModal();
  }

  async function anular(id) {
    const ok = await Bamer.confirmar({
      titulo: `¿Anular la venta ${numeroVenta(id)}?`,
      mensaje: 'Los productos vuelven al inventario y la venta deja de contar en los reportes.',
      aceptar: 'Anular venta', peligro: true,
    });
    if (!ok) return;
    const ventas = Bamer.ventas();
    const productos = Bamer.productos();
    const v = ventas.find((x) => x.id === id);
    v.estado = 'anulada';
    v.items.forEach((i) => { const p = productos.find((x) => x.id === i.id); if (p) p.stock += i.cant; });
    Bamer.guardarVentas(ventas);
    Bamer.guardarProductos(productos);
    Bamer.toast(`Venta ${numeroVenta(id)} anulada.`);
    pintar();
  }

  [$desde, $hasta, $vendedor, $estado].forEach((el) => el.addEventListener('change', () => { pagina = 1; pintar(); }));
  document.getElementById('btnLimpiar').addEventListener('click', () => { rangoPorDefecto(); pagina = 1; pintar(); });
  $tabla.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ver]');
    if (b) verDetalle(Number(b.dataset.ver));
  });

  rangoPorDefecto();
  pintar();
})();
