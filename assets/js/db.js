/* ============================================================
   CAPA DE ACCESO A DATOS
   ------------------------------------------------------------
   Hoy usa localStorage. El día que quieras migrar a una API
   real (Firebase, Supabase, REST propio), solo reemplaza el
   cuerpo de cada método manteniendo la misma firma.
   ============================================================ */

const DB = (() => {

  let items = [];

  function load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (raw) {
        items = JSON.parse(raw);
        if (!Array.isArray(items) || items.length === 0) {
          items = JSON.parse(JSON.stringify(CONFIG.SEED_DATA));
        }
      } else {
        items = JSON.parse(JSON.stringify(CONFIG.SEED_DATA));
      }
    } catch (e) {
      items = JSON.parse(JSON.stringify(CONFIG.SEED_DATA));
    }
    items.forEach(i => { if (!i.comentarios) i.comentarios = []; });
    return items;
  }

  function save() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('No se pudo guardar', e);
    }
  }

  function getAll()       { return items; }
  function getByIndex(i)  { return items[i]; }
  function count()        { return items.length; }
  function length()       { return items.length; }

  function findBySku(sku) {
    const key = String(sku).toLowerCase();
    return items.findIndex(it => String(it.sku).toLowerCase() === key);
  }

  function add(item) {
    items.unshift(item);
    save();
    return item;
  }

  function update(index, item) {
    items[index] = item;
    save();
    return item;
  }

  function remove(index) {
    const removed = items.splice(index, 1)[0];
    save();
    return removed;
  }

  function replaceAll(newItems) {
    items = newItems;
    save();
  }

  function bulkInsert(newItems) {
    items.push(...newItems);
    save();
  }

  function getUniqueAreas() {
    return [...new Set(items.map(i => i.area).filter(Boolean))].sort();
  }

  function getUniqueMarcas() {
    return [...new Set(items.map(i => i.marca).filter(Boolean))];
  }

  return {
    load, save,
    getAll, getByIndex, count, length, findBySku,
    add, update, remove, replaceAll, bulkInsert,
    getUniqueAreas, getUniqueMarcas
  };
})();