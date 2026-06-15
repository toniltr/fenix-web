/**
 * Estado de juego + ejecución de eventos y evaluación de condiciones.
 * No sabe nada de three.js: pura lógica. El SceneManager le pasa los eventos.
 *
 * TRAVEL_TO es el único evento que NO se resuelve aquí (necesita cargar escena):
 * applyEvents lo delega vía el callback onTravel.
 */

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export class FenixState extends EventTarget {
  constructor(index) {
    super();
    this.index = index;

    // stats: arranca de los defaults del catálogo y aplica overrides del player
    this.stats = {};
    for (const s of index.stats.values()) this.stats[s.uuid] = s.default ?? 0;
    for (const s of index.player?.stats ?? []) this.stats[s.name] = s.value;

    // inventario como multiset {itemUuid: cantidad}
    this.inventory = {};
    for (const it of index.player?.inventory ?? []) {
      const id = typeof it === 'string' ? it : it.uuid;
      this.inventory[id] = (this.inventory[id] ?? 0) + (it.amount ?? 1);
    }

    // tiempo
    const [h, m] = (index.settings.start_time ?? '07:00').split(':').map(Number);
    this.time = { day: index.settings.start_day ?? 'MONDAY', hour: h, minute: m };

    // pasos de quest -> PENDING por defecto
    this.steps = {};
    for (const q of index.quests.values())
      for (const st of q.steps) this.steps[st.uuid] = 'PENDING';
  }

  // ---- stats ----
  getStat(id) { return this.stats[id] ?? 0; }
  setStat(id, v) { this.stats[id] = v; this.#changed('stat', { id, value: v }); }
  addStat(id, n) { this.setStat(id, this.getStat(id) + n); }
  takeStat(id, n) { this.setStat(id, Math.max(0, this.getStat(id) - n)); }

  // ---- inventario ----
  hasItem(id, n = 1) { return (this.inventory[id] ?? 0) >= n; }
  giveItem(id, n = 1) { this.inventory[id] = (this.inventory[id] ?? 0) + n; this.#changed('item', { id }); }
  takeItem(id, n = 1) {
    this.inventory[id] = Math.max(0, (this.inventory[id] ?? 0) - n);
    if (this.inventory[id] === 0) delete this.inventory[id];
    this.#changed('item', { id });
  }

  // ---- quests ----
  setStep(id, status) { this.steps[id] = status; this.#changed('step', { id, status }); }
  getStep(id) { return this.steps[id] ?? 'PENDING'; }

  // ---- tiempo ----
  advanceTime(minutes) {
    let total = this.time.hour * 60 + this.time.minute + minutes;
    while (total >= 1440) { total -= 1440; this.#nextDay(); }
    this.time.hour = Math.floor(total / 60);
    this.time.minute = total % 60;
    this.#changed('time', { ...this.time });
  }
  #nextDay() {
    const i = DAYS.indexOf(this.time.day);
    this.time.day = DAYS[(i + 1) % 7];
  }
  #minutesOf(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; }

  // ---- ejecución de eventos ----
  applyEvent(ev, { onTravel } = {}) {
    switch (ev.type) {
      case 'STAT_ADD':  this.addStat(ev.target, ev.amount); break;
      case 'STAT_TAKE': this.takeStat(ev.target, ev.amount); break;
      case 'ITEM_GIVE': this.giveItem(ev.target, ev.amount ?? 1); break;
      case 'ITEM_TAKE': this.takeItem(ev.target, ev.amount ?? 1); break;
      case 'ADVANCE_TIME': this.advanceTime(ev.amount ?? 0); break;
      case 'TRAVEL_TO': onTravel?.(ev.target, ev); break;
      default: console.warn('Evento no soportado:', ev.type);
    }
  }
  applyEvents(events = [], opts) { for (const ev of events) this.applyEvent(ev, opts); }

  // ---- condiciones (gating de items y nodos de diálogo) ----
  evaluateConditions(cond) {
    if (!cond || !cond.rules?.length) return true;
    const test = (r) => this.#rule(r);
    return cond.operator === 'OR' ? cond.rules.some(test) : cond.rules.every(test);
  }
  #rule(r) {
    switch (r.type) {
      case 'STAT_ABOVE': return this.getStat(r.target) > r.amount;
      case 'STAT_BELOW': return this.getStat(r.target) < r.amount;
      case 'PLAYER_HAS_ITEM': return this.hasItem(r.target, r.amount ?? 1);
      case 'PLAYER_NOT_HAS_ITEM': return !this.hasItem(r.target, r.amount ?? 1);
      case 'STEP': return this.getStep(r.target) === r.status;
      case 'TIME_AFTER': {
        const now = this.time.hour * 60 + this.time.minute;
        return now >= this.#minutesOf(r.target);
      }
      default: console.warn('Condición no soportada:', r.type); return false;
    }
  }

  #changed(kind, detail) {
    this.dispatchEvent(new CustomEvent('change', { detail: { kind, ...detail } }));
  }
}
