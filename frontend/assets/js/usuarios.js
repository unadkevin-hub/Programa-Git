/* =========================================================
   Mini Market Bamer - usuarios.js
   Listar, crear, editar y activar / desactivar usuarios.
   ========================================================= */
'use strict';

(() => {
  if (!Bamer.usuario) return;
  const { esc } = Bamer;
  const $tabla = document.getElementById('tablaUsuarios');
  const form = document.getElementById('formUsuario');
  const $ = (x) => document.getElementById(x);
  let editando = null;

  function pintar() {
    const lista = Bamer.usuarios().sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, 'es'));
    $tabla.innerHTML = lista.map((u) => {
      const yo = u.id === Bamer.usuario.id;
      return `
        <tr>
          <td><strong>${esc(u.nombre)}</strong>${yo ? ' <span class="texto-suave">(tú)</span>' : ''}</td>
          <td class="mono">${esc(u.usuario)}</td>
          <td>${u.rol === 'admin' ? 'Administrador' : 'Vendedor'}</td>
          <td><span class="insignia ${u.activo ? 'ok' : 'neutra'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td><div class="acciones-fila">
            <button class="btn btn-icono" type="button" data-editar="${u.id}" aria-label="Editar ${esc(u.nombre)}" title="Editar">${Bamer.iconos.editar}</button>
            ${yo ? '' : `<button class="btn btn-sm" type="button" data-estado="${u.id}">${u.activo ? 'Desactivar' : 'Activar'}</button>`}
          </div></td>
        </tr>`;
    }).join('');
  }

  function limpiarFormulario() {
    editando = null;
    form.reset();
    Validar.limpiar(form);
    $('tituloForm').textContent = 'Nuevo usuario';
    $('btnGuardar').textContent = 'Crear usuario';
    $('ayudaClave').textContent = 'Mínimo 6 caracteres.';
    form.querySelectorAll('[name="rol"], #activo').forEach((el) => { el.disabled = false; });
  }

  function editar(id) {
    const u = Bamer.usuarios().find((x) => x.id === id);
    if (!u) return;
    limpiarFormulario();
    editando = id;
    $('nombre').value = u.nombre;
    $('usuario').value = u.usuario;
    form.querySelector(`[name="rol"][value="${u.rol}"]`).checked = true;
    $('activo').checked = u.activo;
    $('tituloForm').textContent = 'Editar usuario';
    $('btnGuardar').textContent = 'Guardar cambios';
    $('ayudaClave').textContent = 'Déjala vacía para no cambiarla.';
    // Nadie se puede quitar a sí mismo el rol de administrador ni desactivarse
    if (id === Bamer.usuario.id) form.querySelectorAll('[name="rol"], #activo').forEach((el) => { el.disabled = true; });
    $('nombre').focus();
  }

  async function cambiarEstado(id) {
    const usuarios = Bamer.usuarios();
    const u = usuarios.find((x) => x.id === id);
    if (u.activo) {
      const ok = await Bamer.confirmar({
        titulo: `¿Desactivar a ${u.nombre}?`,
        mensaje: 'No va a poder iniciar sesión hasta que lo vuelvas a activar. Sus ventas se conservan.',
        aceptar: 'Desactivar', peligro: true,
      });
      if (!ok) return;
    }
    u.activo = !u.activo;
    Bamer.guardarUsuarios(usuarios);
    Bamer.toast(`${u.nombre} ${u.activo ? 'activado' : 'desactivado'}.`);
    pintar();
  }

  Validar.limpiarAlEscribir(form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const usuarios = Bamer.usuarios();
    const ok = Validar.formulario(form, {
      nombre: (v) => (v.split(' ').filter(Boolean).length < 2 ? 'Escribe nombre y apellido.' : ''),
      usuario: (v) => {
        if (!v) return 'Escribe el usuario con el que va a entrar.';
        if (!/^[a-z0-9._]{4,30}$/.test(v)) return 'Usa solo minúsculas, números, punto o guion bajo (mínimo 4).';
        if (usuarios.some((u) => u.usuario === v && u.id !== editando)) return 'Ese usuario ya existe. Escoge otro.';
        return '';
      },
      clave: (v) => {
        if (editando && !v) return '';
        return v.length < 6 ? 'La contraseña debe tener mínimo 6 caracteres.' : '';
      },
    });
    if (!ok) return;

    const datos = {
      nombre: $('nombre').value.trim(),
      usuario: $('usuario').value.trim(),
      rol: form.querySelector('[name="rol"]:checked').value,
      activo: $('activo').checked,
    };
    if (editando) {
      const u = usuarios.find((x) => x.id === editando);
      if (editando === Bamer.usuario.id) { datos.rol = u.rol; datos.activo = true; }
      Object.assign(u, datos);
      if ($('clave').value) u.clave = $('clave').value;
    } else {
      usuarios.push({ id: Bamer.siguienteId(usuarios), clave: $('clave').value, ...datos });
    }
    Bamer.guardarUsuarios(usuarios);
    Bamer.toast(editando ? 'Cambios guardados.' : `Usuario ${datos.usuario} creado.`);
    limpiarFormulario();
    pintar();
  });
  $('btnCancelar').addEventListener('click', (e) => { e.preventDefault(); limpiarFormulario(); });

  $tabla.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-editar]');
    const es = e.target.closest('[data-estado]');
    if (ed) editar(Number(ed.dataset.editar));
    if (es) cambiarEstado(Number(es.dataset.estado));
  });

  pintar();
})();
