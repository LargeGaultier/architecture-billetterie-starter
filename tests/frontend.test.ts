import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createContext, runInContext } from 'node:vm';

// Petit DOM de test : le vrai script navigateur et ses handlers sont exécutés.
// Le transport reproduit le refus Fastify d'un POST JSON vide.
class Element {
  value = '';
  private text = '';
  get textContent() { return this.text; }
  set textContent(value: string) { this.text = value; this.children = []; }
  hidden = false;
  disabled = false;
  children: Element[] = [];
  handlers = new Map<string, (event?: { preventDefault(): void }) => Promise<void>>();
  addEventListener(name: string, handler: (event?: { preventDefault(): void }) => Promise<void>) { this.handlers.set(name, handler); }
  querySelectorAll() { return []; }
  replaceChildren() { this.children = []; }
  append(...children: Element[]) { this.children.push(...children); }
}

const reservation = { id: 'reservation-test', status: 'PENDING' };
async function browser() {
  const elements = new Map<string, Element>();
  const element = (id: string) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id)!;
  };
  let complete: ((body: unknown) => void) | undefined;
  const context = createContext({
    document: { querySelector: element, createElement: () => new Element() },
    Intl,
    fetch: async (url: string, options: { headers?: Record<string, string>; body?: string } = {}) => {
      const response = (status: number, body: unknown) => ({ status, ok: status < 400, json: async () => body });
      if (url === '/api/auth/me') return response(200, { user: { id: 'user-alice', login: 'alice' } });
      if (url === '/api/events') return response(200, { events: [] });
      if (url === '/api/auth/logout') {
        return options.headers?.['content-type'] === 'application/json' && options.body === undefined
          ? response(503, { error: { message: 'JSON vide' } }) : response(204, null);
      }
      if (url.startsWith('/api/reservations')) {
        return new Promise(resolve => { complete = body => resolve(response(200, body)); });
      }
      throw new Error(`Route inattendue ${url}`);
    },
  });
  await runInContext(await readFile('public/app.js', 'utf8'), context);
  return { context, element, finish: () => complete!({ reservation, paymentAttempt: { status: 'PENDING' } }) };
}

test('le bouton de déconnexion envoie un POST sans JSON vide et revient au formulaire', async () => {
  const ui = await browser();
  await ui.element('#logout').handlers.get('click')!();
  assert.equal(ui.element('#login-form').hidden, false);
  assert.equal(ui.element('#logout').hidden, true);
  assert.equal(ui.element('#auth-feedback').textContent, 'Vous êtes déconnecté.');
});

for (const action of ['reserve', 'checkout', 'lookup']) {
  test(`une réponse ${action} tardive ne réaffiche pas une réservation après déconnexion`, async () => {
    const ui = await browser();
    runInContext(`displayReservation(${JSON.stringify(reservation)})`, ui.context);
    let pending: Promise<void>;
    if (action === 'reserve') pending = runInContext('reserve("test", { disabled: false })', ui.context);
    else if (action === 'checkout') pending = ui.element('#checkout').handlers.get('click')!();
    else pending = ui.element('#lookup-form').handlers.get('submit')!({ preventDefault() {} });
    await ui.element('#logout').handlers.get('click')!();
    ui.finish();
    await pending;
    assert.equal(ui.element('#checkout-controls').hidden, true);
    assert.equal(ui.element('#reservation-state').textContent, 'Connectez-vous pour retrouver vos réservations.');
    assert.equal(ui.element('#reservation-state').children.length, 0);
    assert.equal(ui.element('#lookup-id').value, '');
  });
}
