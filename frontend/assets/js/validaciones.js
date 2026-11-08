/* =========================================================
   Mini Market Bamer - validaciones.js
   Valida los formularios antes de enviarlos y muestra el
   mensaje de error debajo de cada campo.
   ========================================================= */
'use strict';

const Validar = {
  /* Pinta o limpia el error de un campo. Devuelve true si no hay error. */
  marcar(control, mensaje) {
    const campo = control.closest('.campo');
    if (!campo) return !mensaje;
    campo.classList.toggle('error', Boolean(mensaje));
    const span = campo.querySelector('.msg-error');
    if (span) span.textContent = mensaje || '';
    control.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
    return !mensaje;
  },

  /* reglas: { idDelCampo: (valor, control) => 'mensaje de error' | '' } */
  formulario(form, reglas) {
    let primero = null;
    Object.entries(reglas).forEach(([id, regla]) => {
      const control = form.querySelector('#' + id);
      if (!control) return;
      const valor = control.type === 'checkbox' ? control.checked : control.value.trim();
      const mensaje = regla(valor, control) || '';
      if (!Validar.marcar(control, mensaje) && !primero) primero = control;
    });
    if (primero) primero.focus();
    return !primero;
  },

  /* Quita el error de un campo apenas el usuario lo corrige */
  limpiarAlEscribir(form) {
    form.addEventListener('input', (e) => {
      if (e.target.closest('.campo.error')) Validar.marcar(e.target, '');
    });
  },

  limpiar(form) {
    form.querySelectorAll('.campo.error').forEach((c) => c.classList.remove('error'));
    form.querySelectorAll('.msg-error').forEach((s) => { s.textContent = ''; });
  },

  /* Reglas reutilizables */
  requerido: (nombre) => (v) => (v === '' ? `Escribe ${nombre}.` : ''),
  numero: (nombre, min = 0) => (v) => {
    if (v === '') return `Escribe ${nombre}.`;
    const n = Number(v);
    if (Number.isNaN(n)) return `${nombre[0].toUpperCase() + nombre.slice(1)} debe ser un número.`;
    if (n < min) return `${nombre[0].toUpperCase() + nombre.slice(1)} no puede ser menor que ${min}.`;
    return '';
  },
};
