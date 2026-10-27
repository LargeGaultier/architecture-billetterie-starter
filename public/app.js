const eventsElement = document.querySelector('#events');
const feedback = document.querySelector('#feedback');
const stateElement = document.querySelector('#reservation-state');
const controls = document.querySelector('#checkout-controls');
const checkoutButton = document.querySelector('#checkout');
let currentReservationId = null;
let currentUser = null;
let authGeneration = 0;
const loginForm = document.querySelector('#login-form');
const logoutButton = document.querySelector('#logout');
const authFeedback = document.querySelector('#auth-feedback');

function setUser(user) {
  authGeneration++;
  currentUser = user;
  loginForm.hidden = Boolean(user);
  logoutButton.hidden = !user;
  document.querySelector('#account-status').textContent = user
    ? `Connecté : ${user.login}` : 'Connectez-vous pour réserver et acheter. Le catalogue est public.';
  currentReservationId = null;
  document.querySelector('#lookup-id').value = '';
  stateElement.textContent = user ? 'Choisissez un événement pour commencer.' : 'Connectez-vous pour retrouver vos réservations.';
  controls.hidden = true;
  for (const button of eventsElement.querySelectorAll('button')) button.disabled = true;
}

async function api(path, options = {}) {
  const generation = authGeneration;
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body === undefined ? {} : { 'content-type': 'application/json' }), ...(options.headers || {}) },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if (body.error?.code === 'AUTH_REQUIRED' && generation === authGeneration) setUser(null);
    throw new Error(body.error?.message || 'La demande n’a pas abouti.');
  }
  return body;
}

function showFeedback(message = '') { feedback.textContent = message; }

function displayReservation(reservation) {
  currentReservationId = reservation.id;
  document.querySelector('#lookup-id').value = reservation.id;
  const labels = {
    PENDING: 'En attente de paiement',
    CONFIRMED: 'Achat confirmé',
    FAILED: 'Paiement refusé',
    EXPIRED: 'Réservation expirée',
  };
  stateElement.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = labels[reservation.status] || reservation.status;
  const id = document.createElement('span');
  id.className = 'reservation-id';
  id.textContent = `Référence : ${reservation.id}`;
  const detail = document.createElement('span');
  detail.textContent = reservation.status === 'PENDING'
    ? 'La place est retenue provisoirement. Une réponse lente ne confirme pas l’achat.'
    : reservation.status === 'CONFIRMED'
      ? 'Votre place est confirmée.'
      : 'Cette réservation ne retient plus de place.';
  stateElement.append(title, id, detail);
  controls.hidden = reservation.status !== 'PENDING';
}

async function loadEvents() {
  try {
    const { events } = await api('/api/events');
    eventsElement.replaceChildren();
    for (const event of events) {
      const card = document.createElement('article');
      card.className = 'event-card';
      const info = document.createElement('div');
      const date = document.createElement('p');
      date.className = 'event-date';
      date.textContent = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(event.startsAt));
      const title = document.createElement('h3');
      title.textContent = event.title;
      const venue = document.createElement('p');
      venue.className = 'event-place';
      venue.textContent = event.venue;
      const availability = document.createElement('p');
      availability.className = 'availability';
      availability.textContent = event.status === 'CANCELLED' ? 'Événement annulé'
        : event.available > 0 ? `${event.available} place${event.available > 1 ? 's' : ''} affichée${event.available > 1 ? 's' : ''}` : 'Complet';
      info.append(date, title, venue, availability);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = currentUser ? 'Réserver' : 'Connexion requise';
      button.disabled = !currentUser || event.available <= 0 || event.status === 'CANCELLED';
      button.addEventListener('click', () => reserve(event.id, button));
      card.append(info, button);
      eventsElement.append(card);
    }
  } catch (error) {
    eventsElement.textContent = 'Impossible de charger les événements.';
    showFeedback(error.message);
  }
}

async function reserve(eventId, button) {
  const generation = authGeneration;
  showFeedback();
  button.disabled = true;
  try {
    const { reservation } = await api('/api/reservations', {
      method: 'POST', body: JSON.stringify({ eventId }),
    });
    if (generation !== authGeneration) return;
    displayReservation(reservation);
  } catch (error) { if (generation === authGeneration) showFeedback(error.message); }
  finally { await loadEvents(); }
}

checkoutButton.addEventListener('click', async () => {
  if (!currentReservationId) return;
  const generation = authGeneration;
  checkoutButton.disabled = true;
  showFeedback();
  try {
    const scenario = document.querySelector('#scenario').value;
    const { reservation, paymentAttempt } = await api(`/api/reservations/${currentReservationId}/checkout`, {
      method: 'POST', body: JSON.stringify({ scenario }),
    });
    if (generation !== authGeneration) return;
    displayReservation(reservation);
    if (paymentAttempt.status === 'PENDING') showFeedback('Résultat du paiement inconnu : consultez de nouveau l’état avant de conclure.');
    await loadEvents();
  } catch (error) { if (generation === authGeneration) showFeedback(error.message); }
  finally { checkoutButton.disabled = false; }
});

document.querySelector('#lookup-form').addEventListener('submit', async event => {
  event.preventDefault();
  const generation = authGeneration;
  showFeedback();
  const id = document.querySelector('#lookup-id').value.trim();
  if (!id) { showFeedback('Saisissez une référence de réservation.'); return; }
  try {
    const { reservation } = await api(`/api/reservations/${encodeURIComponent(id)}`);
    if (generation !== authGeneration) return;
    displayReservation(reservation);
    await loadEvents();
  } catch (error) { if (generation === authGeneration) showFeedback(error.message); }
});

document.querySelector('#refresh-events').addEventListener('click', loadEvents);

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = document.querySelector('#login-button');
  button.disabled = true;
  authFeedback.textContent = '';
  try {
    const { user } = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({
      login: document.querySelector('#login').value.trim(), password: document.querySelector('#password').value,
    }) });
    document.querySelector('#password').value = '';
    setUser(user);
    showFeedback();
    await loadEvents();
  } catch (error) { authFeedback.textContent = error.message; }
  finally { button.disabled = false; }
});

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
    authFeedback.textContent = 'Vous êtes déconnecté.';
    showFeedback();
    await loadEvents();
  } catch (error) { authFeedback.textContent = error.message; }
  finally { logoutButton.disabled = false; }
});

async function initialize() {
  try { setUser((await api('/api/auth/me')).user); }
  catch (error) { authFeedback.textContent = error.message === 'Connectez-vous pour continuer.' ? '' : error.message; }
  await loadEvents();
}
initialize();
