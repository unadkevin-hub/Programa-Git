/* =========================================================
   Mini Market Bamer - inventario.js
   Tabla de inventario (buscar, filtrar, eliminar) y
   formulario de nuevo / editar producto.
   ========================================================= */
'use strict';

(() => {
  if (!Bamer.usuario) return;
  const { dinero, esc } = Bamer;
  const pagina = document.body.dataset.pagina;

  /* =================== Inventario =================== */
  if (pagina === 'inventario') {
    const POR_PAGINA = 8;
    const $buscar = document.getElementById('buscar');
    const $categoria = document.getElementById('filtroCategoria');
    const $estado = document.getElementById('filtroEstado');
    const $tabla = document.getElementById('tablaInventario');
    const $pag = document.getElementById('paginacion');
    let actual = 1;

    Bamer.categorias().forEach((c) => $categoria.insertAdjacentHTML('beforeend', `<option>${esc(c)}</option>`));
    const params = new URLSearchParams(location.search);
    if (params.get('estado')) $estado.value = params.get('estado');

    function filtrar() {
      const texto = $buscar.value.trim().toLowerCase();
      return Bamer.productos()
        .filter((p) => !$categoria.value || p.categoria === $categoria.value)
        .filter((p) => {
          const e = Bamer.estadoStock(p).clase;
          if (!$estado.value) return true;
          if ($estado.value === 'bajo') return e === 'bajo' || e === 'agotado';
          return e === $estado.value;
        })
        .filter((p) => !texto || p.nombre.toLowerCase().includes(texto) || p.codigo.includes(texto))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    }

    function pintar() {
      const lista = filtrar();
      const todos = Bamer.productos();
      const unidades = todos.reduce((s, p) => s + p.stock, 0);
      document.getElementById('resumenInventario').textContent =
        `${todos.length} productos, ${unidades} unidades en total`;

      const trozo = Bamer.paginar(lista, actual, POR_PAGINA, $pag, (p) => { actual = p; pintar(); });
      if (!trozo.length) {
        $tabla.innerHTML = '<tr><td colspan="7" class="vacio">No hay productos con estos filtros. <a href="producto.html">Crea un producto nuevo</a> o cambia la búsqueda.</td></tr>';
        return;
      }
      $tabla.innerHTML = trozo.map((p) => {
        const e = Bamer.estadoStock(p);
        return `
          <tr>
            <td class="mono">${p.codigo}</td>
            <td><strong>${esc(p.nombre)}</strong></td>
            <td>${esc(p.categoria)}</td>
            <td class="derecha">${dinero(p.venta)}</td>
            <td class="derecha">${p.stock}</td>
            <td><span class="insignia ${e.clase}">${e.texto}</span></td>
            <td><div class="acciones-fila">
              <a class="btn btn-icono" href="producto.html?id=${p.id}" aria-label="Editar ${esc(p.nombre)}" title="Editar">${Bamer.iconos.editar}</a>
              <button class="btn btn-icono peligro" type="button" data-eliminar="${p.id}" aria-label="Eliminar ${esc(p.nombre)}" title="Eliminar">${Bamer.iconos.borrar}</button>
            </div></td>
          </tr>`;
      }).join('');
    }

    async function eliminar(id) {
      const p = Bamer.productos().find((x) => x.id === id);
      if (!p) return;
      const ok = await Bamer.confirmar({
        titulo: '¿Eliminar producto?',
        mensaje: `${p.nombre} sale del inventario. Las ventas que ya tiene se conservan en el historial.`,
        aceptar: 'Eliminar', peligro: true,
      });
      if (!ok) return;
      Bamer.guardarProductos(Bamer.productos().filter((x) => x.id !== id));
      Bamer.toast(`${p.nombre} eliminado.`);
      pintar();
    }

    $buscar.addEventListener('input', () => { actual = 1; pintar(); });
    [$categoria, $estado].forEach((el) => el.addEventListener('change', () => { actual = 1; pintar(); }));
    $tabla.addEventListener('click', (e) => {
      const b = e.target.closest('[data-eliminar]');
      if (b) eliminar(Number(b.dataset.eliminar));
    });
    pintar();
  }

  /* =================== Nuevo / editar producto =================== */
  if (pagina === 'producto') {
    const form = document.getElementById('formProducto');
    const id = Number(new URLSearchParams(location.search).get('id')) || null;
    const campos = ['codigo', 'nombre', 'categoria', 'descripcion', 'compra', 'venta', 'stock', 'minimo'];
    const $ = (x) => document.getElementById(x);

    Bamer.categorias().forEach((c) => $('listaCategorias').insertAdjacentHTML('beforeend', `<option value="${esc(c)}">`));

    if (id) {
      const p = Bamer.productos().find((x) => x.id === id);
      if (!p) { location.replace('inventario.html'); return; }
      campos.forEach((c) => { $(c).value = p[c]; });
      $('tituloPagina').textContent = 'Editar producto';
      document.title = 'Editar producto | Mini Market Bamer';
      $('btnGuardar').textContent = 'Guardar cambios';
    }

    function mostrarMargen() {
      const compra = Number($('compra').value);
      const venta = Number($('venta').value);
      $('margen').textContent = compra > 0 && venta > compra
        ? `Ganancia por unidad: ${dinero(venta - compra)} (${Math.round(((venta - compra) / venta) * 100)} %)`
        : '';
    }
    $('compra').addEventListener('input', mostrarMargen);
    $('venta').addEventListener('input', mostrarMargen);
    mostrarMargen();

    Validar.limpiarAlEscribir(form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const productos = Bamer.productos();
      const ok = Validar.formulario(form, {
        codigo: (v) => {
          if (!v) return 'Escribe o escanea el código de barras.';
          if (!/^\d{4,14}$/.test(v)) return 'El código lleva solo números, entre 4 y 14 dígitos.';
          if (productos.some((p) => p.codigo === v && p.id !== id)) return 'Ya hay un producto con este código.';
          return '';
        },
        nombre: (v) => (v.length < 3 ? 'Escribe el nombre del producto (mínimo 3 letras).' : ''),
        categoria: Validar.requerido('la categoría'),
        compra: Validar.numero('el precio de compra'),
        venta: (v) => {
          const base = Validar.numero('el precio de venta', 1)(v);
          if (base) return base;
          if (Number(v) < Number($('compra').value)) return 'El precio de venta es menor que el de compra.';
          return '';
        },
        stock: (v) => Validar.numero('el stock')(v) || (!Number.isInteger(Number(v)) ? 'El stock va en unidades enteras.' : ''),
        minimo: (v) => Validar.numero('el stock mínimo')(v) || (!Number.isInteger(Number(v)) ? 'El mínimo va en unidades enteras.' : ''),
      });
      if (!ok) return;

      const datos = {
        codigo: $('codigo').value.trim(),
        nombre: $('nombre').value.trim(),
        categoria: $('categoria').value.trim(),
        descripcion: $('descripcion').value.trim(),
        compra: Number($('compra').value),
        venta: Number($('venta').value),
        stock: Number($('stock').value),
        minimo: Number($('minimo').value),
      };
      if (id) {
        Object.assign(productos.find((p) => p.id === id), datos);
      } else {
        productos.push({ id: Bamer.siguienteId(productos), ...datos });
      }
      Bamer.guardarProductos(productos);
      Bamer.toast(id ? 'Cambios guardados.' : 'Producto guardado.');
      setTimeout(() => { location.href = 'inventario.html'; }, 700);
    });
  }
})();
