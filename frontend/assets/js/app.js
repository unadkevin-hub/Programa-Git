/* =========================================================
   Mini Market Bamer - app.js
   Datos de prueba, sesión, menú por rol, permisos y utilidades
   que usan todas las pantallas.
   Los datos se guardan en el navegador (localStorage) porque
   este es el prototipo front-end; el back-end vendrá después.
   ========================================================= */
'use strict';

const Bamer = (() => {
  const CLAVES = { productos: 'mb_productos', usuarios: 'mb_usuarios', ventas: 'mb_ventas', sesion: 'mb_sesion', version: 'mb_version' };
  const VERSION = '1';
  const memoria = {}; // respaldo si el navegador bloquea localStorage

  /* ---------- Almacenamiento ---------- */
  function leer(clave, porDefecto) {
    try {
      const v = localStorage.getItem(clave);
      return v === null ? porDefecto : JSON.parse(v);
    } catch (e) {
      return clave in memoria ? memoria[clave] : porDefecto;
    }
  }
  function guardar(clave, valor) {
    memoria[clave] = valor;
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* queda en memoria */ }
  }
  function borrar(clave) {
    delete memoria[clave];
    try { localStorage.removeItem(clave); } catch (e) { /* nada */ }
  }

  /* ---------- Datos de demostración ---------- */
  const PRODUCTOS_BASE = [
    ['7702001000011', 'Arroz Diana 500 g', 'Granos', 2100, 2600, 45, 10],
    ['7702001000028', 'Fríjol cargamanto 500 g', 'Granos', 5200, 6500, 18, 6],
    ['7702001000035', 'Leche Colanta 1 L', 'Lácteos', 3600, 4300, 24, 10],
    ['7702001000042', 'Huevos AA x 12', 'Huevos', 9800, 11900, 6, 8],
    ['7702001000059', 'Café Sello Rojo 250 g', 'Despensa', 7900, 9600, 4, 6],
    ['7702001000066', 'Azúcar Manuelita 1 kg', 'Despensa', 3900, 4700, 5, 8],
    ['7702001000073', 'Aceite Premier 900 ml', 'Despensa', 9200, 11200, 12, 5],
    ['7702001000080', 'Gaseosa Coca-Cola 1,5 L', 'Bebidas', 4300, 5500, 30, 10],
    ['7702001000097', 'Agua Brisa 600 ml', 'Bebidas', 1100, 1800, 28, 10],
    ['7702001000103', 'Jabón Rey x 3', 'Aseo', 4800, 6200, 14, 5],
    ['7702001000110', 'Pan tajado Bimbo', 'Panadería', 5600, 7000, 9, 4],
    ['7702001000127', 'Atún Van Camps 175 g', 'Enlatados', 5300, 6800, 0, 4],
  ];
  const USUARIOS_BASE = [
    { id: 1, nombre: 'Kevin Oliveros', usuario: 'kevin.admin', clave: 'admin123', rol: 'admin', activo: true },
    { id: 2, nombre: 'Carlos Pérez', usuario: 'carlos.ventas', clave: 'venta123', rol: 'vendedor', activo: true },
    { id: 3, nombre: 'Ana Martínez', usuario: 'ana.ventas', clave: 'venta123', rol: 'vendedor', activo: true },
    { id: 4, nombre: 'Luis Gómez', usuario: 'luis.ventas', clave: 'venta123', rol: 'vendedor', activo: false },
  ];

  // Generador pseudoaleatorio con semilla: los datos salen iguales cada vez
  function aleatorio(semilla) {
    return () => {
      semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0;
      let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generarVentas(productos, usuarios) {
    const rnd = aleatorio(2026);
    const entero = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const vendedores = usuarios.filter((u) => u.activo);
    const ahora = new Date();
    const ventas = [];
    for (let d = 13; d >= 0; d--) {
      const dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - d);
      const cantidad = entero(3, 7);
      const horas = Array.from({ length: cantidad }, () => entero(7 * 60, 20 * 60)).sort((a, b) => a - b);
      horas.forEach((min) => {
        const fecha = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(min / 60), min % 60);
        if (fecha > ahora) return;
        const items = [];
        const n = entero(1, 4);
        for (let i = 0; i < n; i++) {
          const p = productos[entero(0, productos.length - 1)];
          if (items.some((it) => it.id === p.id)) continue;
          items.push({ id: p.id, codigo: p.codigo, nombre: p.nombre, precio: p.venta, cant: entero(1, 3) });
        }
        const v = vendedores[entero(0, vendedores.length - 1)];
        const total = items.reduce((s, it) => s + it.precio * it.cant, 0);
        ventas.push({ fecha: fecha.toISOString(), vendedorId: v.id, vendedor: v.nombre, items, total, recibido: Math.ceil(total / 10000) * 10000, estado: 'pagada' });
      });
    }
    ventas.forEach((v, i) => { v.id = 100 + i + 1; });
    return ventas;
  }

  function cargarDemo() {
    const productos = PRODUCTOS_BASE.map((p, i) => ({
      id: i + 1, codigo: p[0], nombre: p[1], categoria: p[2], compra: p[3], venta: p[4], stock: p[5], minimo: p[6], descripcion: '',
    }));
    guardar(CLAVES.productos, productos);
    guardar(CLAVES.usuarios, USUARIOS_BASE);
    guardar(CLAVES.ventas, generarVentas(productos, USUARIOS_BASE));
    guardar(CLAVES.version, VERSION);
  }
  if (leer(CLAVES.version, null) !== VERSION) cargarDemo();

  /* ---------- Acceso a datos ---------- */
  const productos = () => leer(CLAVES.productos, []);
  const usuarios = () => leer(CLAVES.usuarios, []);
  const ventas = () => leer(CLAVES.ventas, []);
  const guardarProductos = (l) => guardar(CLAVES.productos, l);
  const guardarUsuarios = (l) => guardar(CLAVES.usuarios, l);
  const guardarVentas = (l) => guardar(CLAVES.ventas, l);
  const siguienteId = (lista) => lista.reduce((m, x) => Math.max(m, x.id), 0) + 1;
  const categorias = () => [...new Set(productos().map((p) => p.categoria))].sort((a, b) => a.localeCompare(b, 'es'));

  /* ---------- Formatos ---------- */
  const dinero = (n) => '$ ' + Math.round(n).toLocaleString('es-CO');
  const dos = (n) => String(n).padStart(2, '0');
  const fecha = (iso) => { const d = new Date(iso); return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const fechaHora = (iso) => { const d = new Date(iso); return `${fecha(iso)} ${dos(d.getHours())}:${dos(d.getMinutes())}`; };
  const fechaInput = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
  const numeroVenta = (id) => '#' + String(id).padStart(5, '0');
  const iniciales = (nombre) => nombre.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mismoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function estadoStock(p) {
    if (p.stock <= 0) return { clase: 'agotado', texto: 'Agotado' };
    if (p.stock <= p.minimo) return { clase: 'bajo', texto: 'Bajo stock' };
    return { clase: 'ok', texto: 'Disponible' };
  }

  /* ---------- Íconos (SVG en línea) ---------- */
  const trazo = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const iconos = {
    inicio: trazo('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>'),
    ventas: trazo('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/>'),
    historial: trazo('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>'),
    inventario: trazo('<path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>'),
    usuarios: trazo('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14a6.5 6.5 0 0 1 3.5 6"/>'),
    reportes: trazo('<path d="M3 21h18"/><path d="M6 17v-5"/><path d="M11 17V7"/><path d="M16 17v-8"/><path d="M21 17V4"/>'),
    salir: trazo('<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h11"/>'),
    menu: trazo('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    buscar: trazo('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    editar: trazo('<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'),
    borrar: trazo('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'),
    ver: trazo('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
    alerta: trazo('<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4"/><path d="M12 17h.01"/>'),
  };

  /* ---------- Sesión y permisos ---------- */
  const sesion = () => leer(CLAVES.sesion, null);

  function iniciarSesion(usuario, clave) {
    const u = usuarios().find((x) => x.usuario.toLowerCase() === usuario.toLowerCase());
    if (!u || u.clave !== clave) return { ok: false, error: 'El usuario o la contraseña no coinciden.' };
    if (!u.activo) return { ok: false, error: 'Este usuario está desactivado. Pídele al administrador que lo active.' };
    guardar(CLAVES.sesion, { id: u.id, nombre: u.nombre, rol: u.rol });
    return { ok: true, destino: u.rol === 'admin' ? 'admin.html' : 'venta.html' };
  }

  function cerrarSesion() {
    borrar(CLAVES.sesion);
    location.href = 'index.html';
  }

  const MENU = {
    admin: [
      ['admin.html', 'Inicio', 'inicio'], ['venta.html', 'Ventas', 'ventas'], ['historial.html', 'Historial', 'historial'],
      ['inventario.html', 'Inventario', 'inventario'], ['usuarios.html', 'Usuarios', 'usuarios'], ['reportes.html', 'Reportes', 'reportes'],
    ],
    vendedor: [['venta.html', 'Registrar venta', 'ventas'], ['historial.html', 'Mis ventas', 'historial']],
  };

  function paginaActual() {
    const archivo = location.pathname.split('/').pop() || 'index.html';
    return archivo === 'producto.html' ? 'inventario.html' : archivo;
  }

  function pintarPlantilla(u) {
    const menu = document.getElementById('menu');
    const actual = paginaActual();
    menu.innerHTML = `
      <a class="menu-marca" href="${u.rol === 'admin' ? 'admin.html' : 'venta.html'}"><strong>Mini Market</strong><small>BAMER</small></a>
      <nav aria-label="Módulos">
        <ul>${MENU[u.rol].map(([href, texto, icono]) => `
          <li><a class="menu-item" href="${href}"${href === actual ? ' aria-current="page"' : ''}>${iconos[icono]}<span>${texto}</span></a></li>`).join('')}
        </ul>
      </nav>
      <button class="menu-item menu-salir" type="button" id="btnSalir">${iconos.salir}<span>Cerrar sesión</span></button>`;

    document.getElementById('usuario').innerHTML = `
      <div><strong>${esc(u.nombre.split(' ')[0])} ${esc((u.nombre.split(' ')[1] || '')[0] || '')}.</strong>
      <small>${u.rol === 'admin' ? 'Administrador' : 'Vendedor'}</small></div>
      <span class="avatar" aria-hidden="true">${iniciales(u.nombre)}</span>`;

    const btnMenu = document.getElementById('btnMenu');
    btnMenu.innerHTML = iconos.menu;
    const alternar = (abrir) => {
      document.body.classList.toggle('menu-abierto', abrir);
      btnMenu.setAttribute('aria-expanded', String(abrir));
    };
    btnMenu.addEventListener('click', () => alternar(!document.body.classList.contains('menu-abierto')));
    document.getElementById('menuFondo').addEventListener('click', () => alternar(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') alternar(false); });

    document.getElementById('btnSalir').addEventListener('click', async () => {
      if (await confirmar({ titulo: '¿Cerrar sesión?', mensaje: 'Vas a volver a la pantalla de inicio de sesión.', aceptar: 'Cerrar sesión' })) cerrarSesion();
    });
  }

  /* Revisa que haya sesión y que el rol pueda ver la página */
  function proteger() {
    const roles = (document.body.dataset.roles || '').split(' ').filter(Boolean);
    if (!roles.length) return null;
    const s = sesion();
    if (!s) { location.replace('index.html'); return null; }
    const u = usuarios().find((x) => x.id === s.id);
    if (!u || !u.activo) { borrar(CLAVES.sesion); location.replace('index.html'); return null; }
    if (!roles.includes(u.rol)) { location.replace(u.rol === 'admin' ? 'admin.html' : 'venta.html'); return null; }
    pintarPlantilla(u);
    return u;
  }

  /* ---------- Notificación ---------- */
  let temporizador;
  function toast(mensaje, tipo = '') {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = mensaje;
    el.className = 'toast ' + tipo;
    requestAnimationFrame(() => el.classList.add('visible'));
    clearTimeout(temporizador);
    temporizador = setTimeout(() => el.classList.remove('visible'), 3200);
  }

  /* ---------- Ventana de confirmación (<dialog>) ---------- */
  function confirmar({ titulo, mensaje, aceptar = 'Aceptar', peligro = false }) {
    const dlg = document.createElement('dialog');
    if (typeof dlg.showModal !== 'function') return Promise.resolve(window.confirm(titulo + '\n' + mensaje));
    dlg.className = 'modal';
    dlg.innerHTML = `
      <form method="dialog" class="modal-cuerpo">
        <h2>${esc(titulo)}</h2>
        <p>${esc(mensaje)}</p>
        <menu>
          <button class="btn" value="cancelar">Cancelar</button>
          <button class="btn ${peligro ? 'btn-peligro' : 'btn-primario'}" value="ok">${esc(aceptar)}</button>
        </menu>
      </form>`;
    document.body.appendChild(dlg);
    dlg.showModal();
    dlg.querySelector('[value="ok"]').focus();
    return new Promise((resolver) => {
      dlg.addEventListener('close', () => { resolver(dlg.returnValue === 'ok'); dlg.remove(); });
    });
  }

  /* ---------- Paginación ---------- */
  function paginar(lista, pagina, porPagina, contenedor, alCambiar) {
    const total = Math.max(1, Math.ceil(lista.length / porPagina));
    pagina = Math.min(Math.max(1, pagina), total);
    const desde = (pagina - 1) * porPagina;
    const trozo = lista.slice(desde, desde + porPagina);
    if (lista.length <= porPagina) {
      contenedor.innerHTML = lista.length ? `<span>${lista.length} registro${lista.length === 1 ? '' : 's'}</span>` : '';
    } else {
      let botones = '';
      for (let i = 1; i <= total; i++) botones += `<li><button type="button" data-pag="${i}"${i === pagina ? ' aria-current="page"' : ''}>${i}</button></li>`;
      contenedor.innerHTML = `
        <span>Mostrando ${desde + 1}–${desde + trozo.length} de ${lista.length}</span>
        <ul>
          <li><button type="button" data-pag="${pagina - 1}" aria-label="Página anterior"${pagina === 1 ? ' disabled' : ''}>‹</button></li>
          ${botones}
          <li><button type="button" data-pag="${pagina + 1}" aria-label="Página siguiente"${pagina === total ? ' disabled' : ''}>›</button></li>
        </ul>`;
      contenedor.onclick = (e) => {
        const b = e.target.closest('[data-pag]');
        if (b && !b.disabled) alCambiar(Number(b.dataset.pag));
      };
    }
    return trozo;
  }

  /* ---------- Pantalla de inicio de sesión ---------- */
  function iniciarLogin() {
    const s = sesion();
    if (s) { location.replace(s.rol === 'admin' ? 'admin.html' : 'venta.html'); return; }
    const form = document.getElementById('formLogin');
    const alerta = document.getElementById('alertaLogin');
    Validar.limpiarAlEscribir(form);

    const entrar = (usuario, clave) => {
      const r = iniciarSesion(usuario, clave);
      if (r.ok) { location.href = r.destino; return; }
      alerta.querySelector('span').textContent = r.error;
      alerta.classList.remove('oculto');
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      alerta.classList.add('oculto');
      const ok = Validar.formulario(form, {
        usuario: Validar.requerido('tu usuario'),
        clave: Validar.requerido('tu contraseña'),
      });
      if (ok) entrar(form.usuario.value.trim(), form.clave.value);
    });
    document.getElementById('btnDemo').addEventListener('click', () => entrar('carlos.ventas', 'venta123'));
    document.getElementById('btnOlvido').addEventListener('click', () =>
      toast('Pídele al administrador que te asigne una contraseña nueva.'));
    document.getElementById('btnRestablecer').addEventListener('click', async () => {
      if (await confirmar({ titulo: '¿Restablecer los datos?', mensaje: 'Se borran las ventas, productos y usuarios que hayas creado y se cargan los datos de demostración.', aceptar: 'Restablecer', peligro: true })) {
        cargarDemo();
        toast('Datos de demostración restablecidos.');
      }
    });
  }

  const usuario = document.body.dataset.pagina === 'login' ? null : proteger();
  if (document.body.dataset.pagina === 'login') iniciarLogin();

  return {
    usuario, productos, usuarios, ventas, guardarProductos, guardarUsuarios, guardarVentas, siguienteId, categorias,
    dinero, fecha, fechaHora, fechaInput, numeroVenta, esc, mismoDia, estadoStock, iconos, toast, confirmar, paginar,
  };
})();
