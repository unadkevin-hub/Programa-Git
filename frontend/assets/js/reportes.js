/* =========================================================
   Mini Market Bamer - reportes.js
   Indicadores del panel principal y reportes por periodo
   (totales, gráfico de ventas por día, más vendidos).
   ========================================================= */
'use strict';

(() => {
  if (!Bamer.usuario) return;
  const { dinero, esc, numeroVenta, fechaHora, mismoDia } = Bamer;
  const pagina = document.body.dataset.pagina;
  const $ = (x) => document.getElementById(x);
  const pagadas = () => Bamer.ventas().filter((v) => v.estado === 'pagada');
  const totalDe = (lista) => lista.reduce((s, v) => s + v.total, 0);
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  /* =================== Panel principal =================== */
  if (pagina === 'panel') {
    const hoy = new Date();
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
    const ventas = pagadas();
    const deHoy = ventas.filter((v) => mismoDia(new Date(v.fecha), hoy));
    const deAyer = ventas.filter((v) => mismoDia(new Date(v.fecha), ayer));
    const tHoy = totalDe(deHoy);
    const tAyer = totalDe(deAyer);

    $('indVentas').textContent = dinero(tHoy);
    const det = $('indVentasDet');
    if (tAyer > 0) {
      const cambio = Math.round(((tHoy - tAyer) / tAyer) * 100);
      det.textContent = `${cambio >= 0 ? '+' : ''}${cambio} % frente a ayer`;
      det.classList.toggle('baja', cambio < 0);
    } else {
      det.textContent = plural(deHoy.length, 'venta hoy', 'ventas hoy');
    }

    const productos = Bamer.productos();
    $('indStock').textContent = productos.reduce((s, p) => s + p.stock, 0);
    $('indStockDet').textContent = `${plural(productos.length, 'producto', 'productos')} en ${plural(Bamer.categorias().length, 'categoría', 'categorías')}`;

    const porAgotarse = productos.filter((p) => Bamer.estadoStock(p).clase !== 'ok');
    $('indAgotar').textContent = porAgotarse.length;

    const activos = Bamer.usuarios().filter((u) => u.activo);
    const admins = activos.filter((u) => u.rol === 'admin').length;
    $('indUsuarios').textContent = activos.length;
    $('indUsuariosDet').textContent = `${plural(admins, 'admin', 'admins')} y ${plural(activos.length - admins, 'vendedor', 'vendedores')}`;

    const ultimas = [...ventas].sort((a, b) => b.id - a.id).slice(0, 5);
    $('tablaUltimas').innerHTML = ultimas.length ? ultimas.map((v) => `
      <tr>
        <td class="mono">${numeroVenta(v.id)}</td>
        <td>${fechaHora(v.fecha)}</td>
        <td>${esc(v.vendedor)}</td>
        <td class="derecha">${v.items.reduce((s, i) => s + i.cant, 0)}</td>
        <td class="derecha">${dinero(v.total)}</td>
      </tr>`).join('')
      : '<tr><td colspan="5" class="vacio">Todavía no hay ventas. <a href="venta.html">Registra la primera</a>.</td></tr>';

    if (porAgotarse.length) {
      const nombres = porAgotarse.slice(0, 3).map((p) => esc(p.nombre)).join(', ');
      $('alertaStockTexto').innerHTML = `<strong>${plural(porAgotarse.length, 'producto está por agotarse.', 'productos están por agotarse.')}</strong>
        ${nombres}${porAgotarse.length > 3 ? ' y otros' : ''}. Revisa el <a href="inventario.html?estado=bajo">inventario</a> para hacer el pedido al proveedor.`;
      $('alertaStock').classList.remove('oculto');
    }
  }

  /* =================== Reportes =================== */
  if (pagina === 'reportes') {
    const $desde = $('desde');
    const $hasta = $('hasta');
    const canvas = $('grafico');
    let dias = [];

    function rango(n) {
      const hoy = new Date();
      $desde.value = Bamer.fechaInput(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - n));
      $hasta.value = Bamer.fechaInput(hoy);
      pintar();
    }

    function pintar() {
      if (!$desde.value || !$hasta.value || $desde.value > $hasta.value) {
        $('periodo').textContent = 'Escoge un rango válido: la fecha “Desde” debe ser igual o anterior a “Hasta”.';
        return;
      }
      const desde = new Date($desde.value + 'T00:00:00');
      const hasta = new Date($hasta.value + 'T23:59:59');
      const enRango = (v) => { const f = new Date(v.fecha); return f >= desde && f <= hasta; };
      const todas = Bamer.ventas().filter(enRango);
      const ventas = todas.filter((v) => v.estado === 'pagada');
      const anuladas = todas.length - ventas.length;
      const total = totalDe(ventas);
      const productos = Bamer.productos();

      $('periodo').textContent = `Periodo del ${Bamer.fecha(desde)} al ${Bamer.fecha(hasta)}`;

      // Totales
      let ganancia = 0;
      const porProducto = {};
      ventas.forEach((v) => v.items.forEach((i) => {
        const p = productos.find((x) => x.id === i.id);
        if (p) ganancia += (i.precio - p.compra) * i.cant;
        porProducto[i.id] = porProducto[i.id] || { nombre: i.nombre, cant: 0, total: 0 };
        porProducto[i.id].cant += i.cant;
        porProducto[i.id].total += i.precio * i.cant;
      }));
      const unidades = Object.values(porProducto).reduce((s, p) => s + p.cant, 0);
      $('repTotal').textContent = dinero(total);
      $('repGanancia').textContent = `Ganancia aproximada ${dinero(ganancia)}`;
      $('repNumero').textContent = ventas.length;
      $('repAnuladas').textContent = anuladas ? plural(anuladas, 'anulada', 'anuladas') : 'Ninguna anulada';
      $('repPromedio').textContent = dinero(ventas.length ? total / ventas.length : 0);
      $('repUnidades').textContent = unidades;
      $('repProductos').textContent = plural(Object.keys(porProducto).length, 'producto distinto', 'productos distintos');

      // Ventas por día (para el gráfico)
      dias = [];
      for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
        const dia = new Date(d);
        dias.push({ fecha: dia, total: totalDe(ventas.filter((v) => mismoDia(new Date(v.fecha), dia))) });
      }
      dibujar();

      // Más vendidos
      const top = Object.values(porProducto).sort((a, b) => b.cant - a.cant).slice(0, 6);
      const maxCant = top.length ? top[0].cant : 1;
      $('tablaTop').innerHTML = top.length ? top.map((p) => `
        <tr>
          <td>${esc(p.nombre)}</td>
          <td class="derecha">${p.cant}</td>
          <td class="derecha">${dinero(p.total)}</td>
          <td><div class="barra-progreso"><span style="width:${Math.round((p.cant / maxCant) * 100)}%"></span></div></td>
        </tr>`).join('') : '<tr><td colspan="4" class="vacio">No hay ventas en este periodo.</td></tr>';

      // Por vendedor
      const porVendedor = {};
      ventas.forEach((v) => {
        porVendedor[v.vendedor] = porVendedor[v.vendedor] || { n: 0, total: 0 };
        porVendedor[v.vendedor].n++;
        porVendedor[v.vendedor].total += v.total;
      });
      const filas = Object.entries(porVendedor).sort((a, b) => b[1].total - a[1].total);
      $('tablaVendedores').innerHTML = filas.length ? filas.map(([nombre, d]) => `
        <tr><td>${esc(nombre)}</td><td class="derecha">${d.n}</td><td class="derecha">${dinero(d.total)}</td></tr>`).join('')
        : '<tr><td colspan="3" class="vacio">No hay ventas en este periodo.</td></tr>';

      // Bajo stock (no depende del periodo)
      const bajos = productos.filter((p) => Bamer.estadoStock(p).clase !== 'ok').sort((a, b) => a.stock - b.stock);
      $('tablaBajo').innerHTML = bajos.length ? bajos.map((p) => {
        const e = Bamer.estadoStock(p);
        return `<tr><td>${esc(p.nombre)}</td><td>${esc(p.categoria)}</td><td class="derecha">${p.stock}</td><td class="derecha">${p.minimo}</td><td><span class="insignia ${e.clase}">${e.texto}</span></td></tr>`;
      }).join('') : '<tr><td colspan="5" class="vacio">Todos los productos tienen stock suficiente.</td></tr>';
    }

    /* Gráfico de barras dibujado en <canvas> */
    function dibujar() {
      const caja = canvas.parentElement.getBoundingClientRect();
      const escala = window.devicePixelRatio || 1;
      canvas.width = caja.width * escala;
      canvas.height = caja.height * escala;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      const W = caja.width;
      const H = caja.height;
      const m = { arriba: 16, derecha: 8, abajo: 28, izquierda: 64 };
      const ancho = W - m.izquierda - m.derecha;
      const alto = H - m.arriba - m.abajo;
      const estilo = getComputedStyle(document.documentElement);
      const verde = estilo.getPropertyValue('--verde').trim() || '#16794A';
      const suave = estilo.getPropertyValue('--texto-suave').trim() || '#6B7280';
      ctx.clearRect(0, 0, W, H);
      ctx.font = '12px Inter, Segoe UI, sans-serif';

      const max = Math.max(...dias.map((d) => d.total), 1);
      // escala del eje Y con números redondos
      const paso = Math.pow(10, Math.floor(Math.log10(max)));
      const tope = Math.ceil(max / paso) * paso;
      const lineas = 4;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let i = 0; i <= lineas; i++) {
        const valor = (tope / lineas) * i;
        const y = m.arriba + alto - (valor / tope) * alto;
        ctx.strokeStyle = i === 0 ? '#D1D5DB' : '#F0F1F3';
        ctx.beginPath(); ctx.moveTo(m.izquierda, y); ctx.lineTo(W - m.derecha, y); ctx.stroke();
        ctx.fillStyle = suave;
        ctx.fillText(valor >= 1000 ? '$ ' + Math.round(valor / 1000) + ' mil' : '$ ' + valor, m.izquierda - 8, y);
      }

      const n = dias.length;
      const hueco = ancho / n;
      const barra = Math.min(42, hueco * 0.6);
      const saltoEtiqueta = Math.ceil(n / Math.max(1, Math.floor(ancho / 46)));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      dias.forEach((d, i) => {
        const x = m.izquierda + hueco * i + (hueco - barra) / 2;
        const h = (d.total / tope) * alto;
        const y = m.arriba + alto - h;
        ctx.fillStyle = mismoDia(d.fecha, new Date()) ? '#0F5A37' : verde;
        const r = Math.min(4, barra / 2, h);
        ctx.beginPath();
        ctx.moveTo(x, m.arriba + alto);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.lineTo(x + barra - r, y); ctx.quadraticCurveTo(x + barra, y, x + barra, y + r);
        ctx.lineTo(x + barra, m.arriba + alto); ctx.closePath(); ctx.fill();
        if (i % saltoEtiqueta === 0) {
          ctx.fillStyle = suave;
          ctx.fillText(`${d.fecha.getDate()}/${d.fecha.getMonth() + 1}`, x + barra / 2, m.arriba + alto + 8);
        }
      });
      canvas.setAttribute('aria-label', 'Total vendido por día: ' +
        dias.map((d) => `${d.fecha.getDate()}/${d.fecha.getMonth() + 1} ${dinero(d.total)}`).join('; '));
    }

    [$desde, $hasta].forEach((el) => el.addEventListener('change', pintar));
    document.querySelectorAll('[data-rango]').forEach((b) => b.addEventListener('click', () => rango(Number(b.dataset.rango))));
    $('btnImprimir').addEventListener('click', () => window.print());
    let espera;
    window.addEventListener('resize', () => { clearTimeout(espera); espera = setTimeout(dibujar, 120); });

    rango(6);
  }
})();
