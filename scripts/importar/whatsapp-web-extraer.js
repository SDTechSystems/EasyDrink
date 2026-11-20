/*
 * EasyDrink — Extraer ventas de un chat de WhatsApp Web, con reacciones.
 *
 * La opción "Exportar chat" de WhatsApp no incluye las reacciones (✅ / ❗).
 * Este script lee el chat abierto en web.whatsapp.com y descarga un CSV con
 * fecha, texto y reacciones de cada mensaje. No envía nada a ningún servidor.
 *
 * Uso (en un computador, con Google Chrome):
 *   1. Abre https://web.whatsapp.com y entra al chat donde registras las ventas.
 *   2. Pulsa F12 (o Ctrl+Shift+J) y ve a la pestaña "Console".
 *   3. Si Chrome lo pide, escribe:  allow pasting  y pulsa Enter.
 *   4. Pega todo este archivo y pulsa Enter.
 *   5. El script sube solo por el chat hasta el primer mensaje. Cuando no
 *      encuentra mensajes nuevos durante unos segundos, descarga
 *      "ventas-whatsapp.csv". No cambies de chat mientras trabaja.
 *
 * Comandos opcionales en la consola:
 *   EDdescargar()  descarga lo recolectado hasta ahora
 *   EDdetener()    detiene la subida automática y descarga
 */
(() => {
  const messages = new Map();
  const PAUSA_MS = 700;
  const ESPERA_SIN_NUEVOS = 15; // ciclos sin mensajes nuevos antes de terminar (~10 s)

  const main = document.querySelector('#main');
  if (!main) {
    console.error('EasyDrink: abre primero el chat de ventas en WhatsApp Web.');
    return;
  }

  // Texto de un nodo, convirtiendo los emojis (imágenes) en su carácter.
  const textOf = (node) => {
    let out = '';
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) out += child.textContent;
      else if (child.nodeName === 'IMG') out += child.getAttribute('alt') || child.getAttribute('data-plain-text') || '';
      else if (child.nodeName === 'BR') out += ' ';
      else out += textOf(child);
    });
    return out;
  };

  const collect = () => {
    let added = 0;
    main.querySelectorAll('[data-pre-plain-text]').forEach((copyable) => {
      const meta = copyable.getAttribute('data-pre-plain-text') || '';
      const holder = copyable.closest('[data-id]');
      const row = copyable.closest('[role="row"]') || holder || copyable.parentElement;
      const id = holder?.getAttribute('data-id') || `${meta}|${copyable.textContent}`;

      const textNode = copyable.querySelector('.selectable-text') || copyable;
      const text = textOf(textNode).replace(/\s+/g, ' ').trim();

      // Reacciones: emojis y etiquetas de la fila que están fuera del texto del mensaje.
      const reactions = new Set();
      row.querySelectorAll('img[alt]').forEach((img) => {
        if (!copyable.contains(img)) reactions.add(img.getAttribute('alt'));
      });
      row.querySelectorAll('[aria-label]').forEach((el) => {
        if (copyable.contains(el)) return;
        const label = el.getAttribute('aria-label') || '';
        const emojis = label.match(/\p{Extended_Pictographic}/gu);
        if (emojis && /reac/i.test(label)) emojis.forEach((e) => reactions.add(e));
      });

      const record = { id, meta, text, reactions: [...reactions].join(' ') };
      const previous = messages.get(id);
      if (!previous) added++;
      if (!previous || record.reactions.length >= previous.reactions.length) messages.set(id, record);
    });
    return added;
  };

  const scroller = () => {
    const first = main.querySelector('[data-pre-plain-text]');
    let el = first;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) return el;
      el = el.parentElement;
    }
    return null;
  };

  const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const download = () => {
    collect();
    const rows = [['id', 'meta', 'texto', 'reacciones']];
    messages.forEach((m) => rows.push([m.id, m.meta, m.text, m.reactions]));
    const csv = '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'ventas-whatsapp.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    const withReaction = [...messages.values()].filter((m) => m.reactions).length;
    console.log(`EasyDrink: ${messages.size} mensajes descargados (${withReaction} con reacción).`);
  };

  let idle = 0;
  let stopped = false;
  const loadOlderButton = () =>
    [...main.querySelectorAll('button, [role="button"], div')].find((el) =>
      /(mensajes anteriores|older messages|cargar|load)/i.test(el.textContent || '') && el.children.length < 4,
    );

  const step = () => {
    if (stopped) return;
    const added = collect();
    idle = added > 0 ? 0 : idle + 1;
    const box = scroller();
    if (box) box.scrollTop = 0;
    const older = loadOlderButton();
    if (older && idle > 2) older.click();
    console.log(`EasyDrink: ${messages.size} mensajes recolectados…`);
    if (idle >= ESPERA_SIN_NUEVOS) {
      console.log('EasyDrink: llegué al inicio del chat.');
      download();
      return;
    }
    setTimeout(step, PAUSA_MS);
  };

  window.EDdescargar = download;
  window.EDdetener = () => {
    stopped = true;
    download();
  };

  console.log('EasyDrink: recolectando mensajes. Escribe EDdetener() para parar y descargar.');
  step();
})();
