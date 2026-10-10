// partos.js — Partos, crías nacidas y alta de las crías en el inventario

function partosConIntervalo() {
  const porMadre = {};
  store.partos.forEach(p => (porMadre[p.id_madre] = porMadre[p.id_madre] || []).push(p));
  Object.values(porMadre).forEach(l => l.sort((a, b) => a.fecha_parto.localeCompare(b.fecha_parto)));
  return store.partos.map(p => {
    const l = porMadre[p.id_madre], i = l.indexOf(p);
    return { ...p, _intervalo: i > 0 ? diffDays(p.fecha_parto, l[i - 1].fecha_parto) : null };
  });
}
const padreDeParto = p => (store.empadres.find(e => e.id === p.id_empadre) || {}).id_macho || null;

registrarSeccion({
  key: 'partos', titulo: 'Partos', icono: 'sprout',
  subtitulo: 'Registro de partos y crías: prolificidad, mortalidad al nacimiento e intervalo entre partos.',
  botones: [{ label: 'Registrar parto', primario: true, accion: () => formParto() }],
  orden: { key: 'fecha', dir: 'desc' },
  csv: 'partos',
  vacio: { titulo: 'Sin partos registrados', texto: 'Cuando una cabra para, regístralo aquí y da de alta a sus crías en el mismo paso.' },
  filas: partosConIntervalo,
  filtros: [
    { id: 'q', tipo: 'buscar', placeholder: 'Madre, padre, notas…', texto: r => [animalTexto(r.id_madre), animalTexto(padreDeParto(r)), r.notas] },
    { id: 'madre', tipo: 'select', label: 'Madre', opciones: () => [...new Set(store.partos.map(p => p.id_madre))].map(id => [id, animalTexto(id)]), prueba: (r, v) => r.id_madre === v },
    { id: 'tipo', tipo: 'select', label: 'Tipo de parto', opciones: () => opts('parto'), prueba: (r, v) => r.tipo_parto === v },
    { id: 'dif', tipo: 'select', label: 'Dificultad', opciones: () => opts('dificultad'), prueba: (r, v) => r.dificultad === v },
    { id: 'raza', tipo: 'select', label: 'Raza de la madre', opciones: () => razas().map(x => [x, x]), prueba: (r, v) => animal(r.id_madre)?.raza === v },
    { id: 'fechas', tipo: 'fechas', label: 'Fecha de parto', valor: r => r.fecha_parto },
    { id: 'crias', tipo: 'rango', label: 'Total de crías', valor: r => r.total_nacidos },
    { id: 'muertas', tipo: 'check', label: 'Con nacidos muertos', prueba: r => r.nacidos_muertos > 0 },
  ],
  columnas: [
    { key: 'fecha', label: 'Fecha', orden: r => r.fecha_parto, html: r => esc(fmtDate(r.fecha_parto)), csv: r => r.fecha_parto },
    { key: 'madre', label: 'Madre', texto: r => animalTexto(r.id_madre), html: r => animalHtml(r.id_madre) },
    { key: 'padre', label: 'Padre', texto: r => animalTexto(padreDeParto(r)), html: r => padreDeParto(r) ? animalHtml(padreDeParto(r)) : '' },
    { key: 'tipo', label: 'Tipo', orden: r => r.total_nacidos, html: r => badge('parto', r.tipo_parto), csv: r => lbl('parto', r.tipo_parto) },
    { key: 'm', label: 'Machos', clase: 'num', orden: r => r.machos, html: r => String(r.machos), csv: r => r.machos },
    { key: 'h', label: 'Hembras', clase: 'num', orden: r => r.hembras, html: r => String(r.hembras), csv: r => r.hembras },
    { key: 'x', label: 'Muertos', clase: 'num', orden: r => r.nacidos_muertos, html: r => r.nacidos_muertos ? `<span class="neg">${r.nacidos_muertos}</span>` : '0', csv: r => r.nacidos_muertos },
    { key: 'total', label: 'Total', clase: 'num', orden: r => r.total_nacidos, html: r => `<strong>${r.total_nacidos}</strong>`, csv: r => r.total_nacidos },
    { key: 'dif', label: 'Dificultad', orden: r => r.dificultad, html: r => badge('dificultad', r.dificultad), csv: r => lbl('dificultad', r.dificultad) },
    { key: 'int', label: 'Días desde el parto anterior', clase: 'num', orden: r => r._intervalo, html: r => r._intervalo == null ? '' : String(r._intervalo), csv: r => r._intervalo },
    { key: 'notas', label: 'Notas', clase: 'wrap', texto: r => r.notas },
  ],
  resumen: f => {
    const total = sum(f, r => r.total_nacidos), vivos = sum(f, r => r.machos + r.hembras), muertos = sum(f, r => r.nacidos_muertos);
    return [
      { label: 'Partos', valor: fmtNum(f.length, 0) },
      { label: 'Crías nacidas vivas', valor: fmtNum(vivos, 0), nota: `${fmtNum(sum(f, r => r.machos), 0)} machos · ${fmtNum(sum(f, r => r.hembras), 0)} hembras` },
      { label: 'Prolificidad', valor: f.length ? fmtNum(total / f.length, 2) : '—', unidad: 'crías/parto' },
      { label: 'Mortalidad al nacer', valor: total ? fmtNum(muertos / total * 100, 1) : '—', unidad: '%' },
      { label: 'Partos asistidos', valor: fmtNum(f.filter(r => r.dificultad !== 'normal').length, 0), nota: 'Asistidos o con distocia' },
      { label: 'Intervalo promedio', valor: fmtNum(avg(f, r => r._intervalo), 0), unidad: 'días' },
    ];
  },
  acciones: () => [{ act: 'editar', label: 'Editar', icono: 'edit' }, { act: 'borrar', label: 'Eliminar', icono: 'trash', peligro: true }],
  manejadores: {
    editar: r => formPartoEditar(r),
    borrar: async r => {
      if (!await confirmar({ titulo: 'Eliminar parto', mensaje: 'Se eliminará el registro del parto. Las crías ya dadas de alta se conservan en Animales.', etiqueta: 'Eliminar', peligro: true })) return;
      const { error } = await db.from('partos').delete().eq('id', r.id);
      if (error) return showToast(errMsg(error), 'error');
      showToast('Parto eliminado'); recargar(['partos', 'empadres', 'animales']);
    },
  },
});

function formParto({ empadre } = {}) {
  const vigentes = store.empadres.filter(vigente);
  abrirFormulario({
    titulo: 'Registrar parto', tam: 'wide',
    sub: 'Al guardar, el empadre se cierra y la madre queda como "lactando". Puedes dar de alta a las crías aquí mismo.',
    valores: { id_empadre: empadre?.id || '', fecha_parto: hoy(), machos: 0, hembras: 0, nacidos_muertos: 0, dificultad: 'normal', crias: [] },
    campos: [
      { name: 'id_empadre', label: 'Empadre', tipo: 'select', vacio: 'Sin empadre registrado', full: true,
        opciones: () => vigentes.map(e => [e.id, `${animalTexto(e.id_hembra)} — monta ${fmtDate(e.fecha_monta)}, parto estimado ${fmtDate(e.fecha_parto_estimada)}`]) },
      { name: 'id_madre', label: 'Madre', tipo: 'select', requerido: true, mostrarSi: v => !v.id_empadre, opciones: () => animalesActivos(a => a.sexo === 'hembra').map(a => [a.id, animalTexto(a.id)]) },
      { name: 'fecha_parto', label: 'Fecha del parto', tipo: 'date', requerido: true },
      { name: 'machos', label: 'Machos vivos', tipo: 'number', min: 0, paso: 1, requerido: true },
      { name: 'hembras', label: 'Hembras vivas', tipo: 'number', min: 0, paso: 1, requerido: true },
      { name: 'nacidos_muertos', label: 'Nacidos muertos', tipo: 'number', min: 0, paso: 1, requerido: true },
      { name: 'dificultad', label: 'Dificultad', tipo: 'select', sinVacio: true, opciones: opts('dificultad') },
      { name: 'total', tipo: 'info', calcular: v => { const t = (v.machos || 0) + (v.hembras || 0) + (v.nacidos_muertos || 0); return t ? `Total: ${t} (${lbl('parto', t >= 4 ? 'multiple' : t === 3 ? 'triple' : t === 2 ? 'doble' : 'sencillo').toLowerCase()})` : ''; } },
      { name: 'notas', label: 'Notas', tipo: 'textarea' },
      { name: 's', tipo: 'section', label: 'Crías (opcional)' },
      { name: 'crias', label: 'Dar de alta a las crías en Animales', tipo: 'crias', contar: v => ({ machos: v.machos || 0, hembras: v.hembras || 0 }) },
    ],
    validar: v => {
      const e = v.id_empadre ? vigentes.find(x => x.id === v.id_empadre) : null;
      const madre = e ? e.id_hembra : v.id_madre;
      if (!madre) return { id_madre: 'Elige la madre.' };
      if (e && v.fecha_parto < e.fecha_monta) return { fecha_parto: 'La fecha del parto no puede ser anterior a la monta.' };
      if ((v.machos || 0) + (v.hembras || 0) + (v.nacidos_muertos || 0) < 1) return { machos: 'Indica al menos una cría (viva o muerta).' };
      const filas = v.crias || [];
      if (filas.length > (v.machos || 0) + (v.hembras || 0)) return { crias: 'Hay más crías para dar de alta que crías vivas indicadas.' };
      const usados = new Set(store.animales.map(a => a.identificador.toLowerCase()));
      const vistos = new Set();
      for (const f of filas) {
        const id = f.identificador.toLowerCase();
        if (!id) return { crias: 'Cada cría necesita su número de arete.' };
        if (usados.has(id)) return { crias: `El arete ${f.identificador} ya existe en Animales.` };
        if (vistos.has(id)) return { crias: `El arete ${f.identificador} está repetido.` };
        vistos.add(id);
      }
    },
    alGuardar: async v => {
      const e = v.id_empadre ? vigentes.find(x => x.id === v.id_empadre) : null;
      const idMadre = e ? e.id_hembra : v.id_madre;
      const { data: parto, error } = await db.from('partos').insert({ id_empadre: v.id_empadre, id_madre: idMadre, fecha_parto: v.fecha_parto, machos: v.machos || 0, hembras: v.hembras || 0, nacidos_muertos: v.nacidos_muertos || 0, dificultad: v.dificultad, notas: v.notas }).select('id').single();
      if (error) throw error;
      let aviso = null;
      const filas = v.crias || [];
      if (filas.length) {
        const madre = animal(idMadre), idPadre = e ? e.id_macho : null;
        const { data: nuevas, error: e2 } = await db.from('animales').insert(filas.map(f => ({
          identificador: f.identificador, nombre: f.nombre || null, sexo: f.sexo, raza: madre?.raza || null, fecha_nacimiento: v.fecha_parto,
          estado_productivo: 'cria', origen: 'nacido_en_rancho', id_madre: idMadre, id_padre: idPadre, nombre_padre: idPadre ? null : (e?.macho_externo || null),
          id_parto: parto.id, peso_inicial: f.peso ? Number(f.peso) : null,
        }))).select('id, identificador');
        if (e2) aviso = 'El parto se guardó, pero no se pudieron dar de alta las crías: ' + errMsg(e2);
        else {
          const pesos = nuevas.map((n, i) => filas[i].peso ? { id_animal: n.id, fecha: v.fecha_parto, peso: Number(filas[i].peso), tipo: 'nacimiento', observaciones: 'Peso al nacer' } : null).filter(Boolean);
          if (pesos.length) await db.from('pesajes').insert(pesos);
        }
      }
      await recargar(['partos', 'animales', 'pesajes']);
      if (aviso) throw new Error(aviso);
      showToast(filas.length ? `Parto registrado y ${filas.length} cría(s) dadas de alta` : 'Parto registrado');
    },
  });
}

function formPartoEditar(p) {
  abrirFormulario({
    titulo: 'Editar parto', sub: `Madre: ${animalTexto(p.id_madre)}`, valores: p,
    campos: [
      { name: 'fecha_parto', label: 'Fecha del parto', tipo: 'date', requerido: true },
      { name: 'dificultad', label: 'Dificultad', tipo: 'select', sinVacio: true, opciones: opts('dificultad') },
      { name: 'machos', label: 'Machos vivos', tipo: 'number', min: 0, paso: 1, requerido: true },
      { name: 'hembras', label: 'Hembras vivas', tipo: 'number', min: 0, paso: 1, requerido: true },
      { name: 'nacidos_muertos', label: 'Nacidos muertos', tipo: 'number', min: 0, paso: 1, requerido: true },
      { name: 'notas', label: 'Notas', tipo: 'textarea', full: true },
    ],
    validar: v => ((v.machos || 0) + (v.hembras || 0) + (v.nacidos_muertos || 0)) < 1 ? { machos: 'Indica al menos una cría.' } : null,
    alGuardar: async v => {
      const { error } = await db.from('partos').update({ fecha_parto: v.fecha_parto, dificultad: v.dificultad, machos: v.machos, hembras: v.hembras, nacidos_muertos: v.nacidos_muertos, notas: v.notas }).eq('id', p.id);
      if (error) throw error;
      showToast('Parto actualizado'); await recargar(['partos', 'animales']);
    },
  });
}
