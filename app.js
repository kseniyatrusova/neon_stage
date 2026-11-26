(() => {
  'use strict';

  const STORAGE_KEY = 'neon-stage-demo-v2';
  const concerts = [
    { id: 'dk', artist: 'Даня Кашин', mark: 'DK', image: 'dk.png', genre: 'Рэп / стрим-культура', date: '14 ФЕВ 2027', time: '20:00', venue: 'Клуб Север', address: 'Лиговский проспект, 50', accent: '#fb3aab', minPrice: 1500, badge: 'LIVE SET', layout: 'sides' },
    { id: 'mk', artist: 'Madk1d', mark: 'MADK1D', image: 'mk.png', genre: 'Альтернатива', date: '20 ФЕВ 2027', time: '19:30', venue: 'Порт 22', address: 'Набережная Обводного канала, 22', accent: '#b59aff', minPrice: 1800, badge: 'NEW WAVE', layout: 'rear-vip' },
    { id: 'husky', artist: 'Хаски', mark: 'Х', image: 'haski.png', genre: 'Хип-хоп', date: '27 ФЕВ 2027', time: '20:00', venue: 'Зал Маяк', address: 'Большой проспект П.С., 84', accent: '#d6fa53', minPrice: 2200, badge: 'LIVE', layout: 'sides' },
    { id: 'lsp', artist: 'ЛСП', mark: 'ЛСП', image: 'lsp.png', genre: 'Хип-хоп / поп', date: '06 МАР 2027', time: '20:30', venue: 'Клуб Север', address: 'Лиговский проспект, 50', accent: '#51e4df', minPrice: 2500, badge: 'SPECIAL SHOW', layout: 'rear-vip' },
    { id: 'dark-prince', artist: 'Тёмный Принц', mark: 'ТЁМНЫЙ\nПРИНЦ', image: 'tp.png', genre: 'Альтернатива', date: '13 МАР 2027', time: '19:00', venue: 'Порт 22', address: 'Набережная Обводного канала, 22', accent: '#ff784f', minPrice: 1400, badge: 'AFTER DARK', layout: 'sides' },
    { id: 'slava', artist: 'Слава КПСС', mark: 'КПСС', image: 'kpss.png', genre: 'Рэп / баттл-рэп', date: '20 МАР 2027', time: '20:00', venue: 'Зал Маяк', address: 'Большой проспект П.С., 84', accent: '#71a7ff', minPrice: 1900, badge: 'LIVE SET', layout: 'rear-vip' }
  ];
  const sectorLabels = { L: 'VIP левая сторона', R: 'VIP правая сторона', B: 'VIP сзади' };
  const FLOOR_CAPACITY = 150;
  function getSeatsForConcert(concertId = selectedConcertId) {
    const concert = getConcert(concertId);
    const sideCount = concert.layout === 'rear-vip' ? 20 : 25;
    const seats = [];
    ['L', 'R'].forEach((side) => {
      for (let number = 1; number <= sideCount; number++) {
        seats.push({ id: `${side}${String(number).padStart(2, '0')}`, number, side });
      }
    });
    if (concert.layout === 'rear-vip') {
      for (let number = 1; number <= 10; number++) seats.push({ id: `B${String(number).padStart(2, '0')}`, number, side: 'B' });
    }
    return seats;
  }
  const seededOccupied = {
    dk: ['L02', 'L07', 'L18', 'R04', 'R16'], mk: ['L01', 'L12', 'R02', 'R17', 'B02'],
    husky: ['L03', 'L15', 'R01', 'R08', 'R20'], lsp: ['L04', 'L05', 'R03', 'R19', 'B04', 'B08'],
    'dark-prince': ['L01', 'L19', 'R05', 'R06'], slava: ['L06', 'R02', 'R15', 'B05', 'B09']
  };
  let state = loadState();
  let selectedConcertId = concerts[0].id;
  let selectedSeats = new Set();
  let selectedFloorTickets = 0;
  let toastTimer;
  const $ = (id) => document.getElementById(id);

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { bookings: [] };
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.bookings)) throw new Error('Invalid saved data');
      return { bookings: parsed.bookings.filter((booking) => booking && typeof booking.id === 'string' && typeof booking.concertId === 'string' && Array.isArray(booking.seats)) };
    } catch (error) {
      return { bookings: [], storageError: true };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ bookings: state.bookings }));
      state.storageError = false;
      return true;
    } catch (error) {
      state.storageError = true;
      return false;
    }
  }

  function getConcert(id = selectedConcertId) { return concerts.find((item) => item.id === id) || concerts[0]; }
  function getFloorPrice(concertId = selectedConcertId) { return getConcert(concertId).minPrice; }
  function getSeatPrice(seat, concertId = selectedConcertId) { return getConcert(concertId).minPrice + (seat.side === 'R' ? 1000 : seat.side === 'B' ? 3000 : 0); }
  function getBookedSeatIds(concertId) {
    return state.bookings.filter((booking) => booking.concertId === concertId).flatMap((booking) => booking.seats);
  }
  function getBookedFloorTickets(concertId) { return state.bookings.filter((booking) => booking.concertId === concertId).reduce((sum, booking) => sum + (Number(booking.floorTickets) || 0), 0); }
  function isOccupied(concertId, seatId) { return seededOccupied[concertId].includes(seatId) || getBookedSeatIds(concertId).includes(seatId); }
  function formatPrice(price) { return `${new Intl.NumberFormat('ru-RU').format(price)} ₽`; }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function renderFilters() {
    const genreFilter = $('genre-filter');
    const genres = [...new Set(concerts.map((concert) => concert.genre))];
    genres.forEach((genre) => genreFilter.add(new Option(genre, genre)));
  }

  function renderEvents() {
    const selectedGenre = $('genre-filter').value;
    const maxPrice = $('price-filter').value === 'all' ? Infinity : Number($('price-filter').value);
    const filtered = concerts.filter((concert) => (selectedGenre === 'all' || concert.genre === selectedGenre) && concert.minPrice <= maxPrice);
    $('results-count').textContent = `${String(filtered.length).padStart(2, '0')} СОБЫТИЙ`;
    $('empty-events').classList.toggle('hidden', filtered.length > 0);
    $('event-grid').innerHTML = filtered.map((concert, index) => {
      const badge = concert.id === selectedConcertId ? 'ВЫБРАНО' : concert.badge;
      const longName = concert.artist.length > 12 ? ' long' : '';
      return `<article class="event-card ${concert.id === selectedConcertId ? 'is-active' : ''}" style="--card-accent:${concert.accent};--pulse-delay:${index * -0.42}s" data-concert="${concert.id}" role="button" tabindex="0" aria-label="Выбрать концерт: ${escapeHtml(concert.artist)}, ${concert.date}, от ${formatPrice(concert.minPrice)}">
        <div class="poster has-artist-image"><span class="poster-index">SPB / 0${index + 1}</span><span class="poster-badge">${escapeHtml(badge)}</span><span class="poster-mark ${concert.mark.includes('\n') || concert.mark.length > 4 ? 'word' : ''}">${escapeHtml(concert.mark).replace(/\n/g, '<br>')}</span><img class="artist-cutout" src="img/${escapeHtml(concert.image)}" alt="" aria-hidden="true" loading="lazy" decoding="async"><strong class="poster-name${longName}">${escapeHtml(concert.artist)}</strong></div>
        <div class="card-info"><div class="event-meta">${escapeHtml(concert.date)} <span class="meta-dot">✳</span> ${concert.time} <span class="meta-dot">✳</span> ${escapeHtml(concert.genre.toUpperCase())}</div><div class="event-venue">${escapeHtml(concert.venue)} · Санкт-Петербург</div><div class="card-bottom"><span class="card-price">от ${formatPrice(concert.minPrice)}</span><span class="choose-link">ВЫБРАТЬ <i>↗</i></span></div></div></article>`;
    }).join('');
  }

  function selectConcert(id, scroll = true) {
    if (!concerts.some((concert) => concert.id === id)) return;
    selectedConcertId = id;
    selectedSeats.clear();
    selectedFloorTickets = 0;
    renderEvents();
    renderBooking();
    if (scroll) $('booking').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderBooking() {
    const concert = getConcert();
    $('hall-name').textContent = concert.venue.toUpperCase();
    $('hall-date').textContent = `${concert.date} · ${concert.time}`;
    $('selected-event-card').style.borderLeftColor = concert.accent;
    $('selected-event-card').innerHTML = `<h3>${escapeHtml(concert.artist)}</h3><p>${escapeHtml(concert.date)} <span class="event-dot">✳</span> ${concert.time}<br>${escapeHtml(concert.venue)} · Санкт-Петербург</p>`;
    const sector = $('sector-filter').value;
    const maxPrice = $('seat-price-filter').value === 'all' ? Infinity : Number($('seat-price-filter').value);
    const seatData = getSeatsForConcert(concert.id);
    const renderZone = (side) => {
      const seats = seatData.filter((seat) => seat.side === side);
      if (!seats.length) return '';
      const zoneValue = side === 'L' ? 'left' : side === 'R' ? 'right' : 'back';
      const title = side === 'L' ? 'VIP · ЛЕВАЯ СТОРОНА' : side === 'R' ? 'VIP · ПРАВАЯ СТОРОНА' : 'VIP · СЗАДИ ЗАЛА';
      const visible = sector === 'all' || sector === zoneValue;
      const seatsHtml = seats.map((seat) => {
        const occupied = isOccupied(concert.id, seat.id);
        const selected = selectedSeats.has(seat.id);
        const stateClass = occupied ? 'occupied' : selected ? 'selected' : 'free';
        const hiddenClass = (sector !== 'all' && sector !== zoneValue) || getSeatPrice(seat) > maxPrice ? 'filtered-out' : '';
        const label = `${sectorLabels[side]}, место ${seat.number}, ${formatPrice(getSeatPrice(seat))}${occupied ? ', занято' : selected ? ', выбрано' : ', свободно'}`;
        const stateMark = occupied ? '×' : selected ? '✓' : '○';
        return `<button type="button" class="seat sector-${side.toLowerCase()} ${stateClass} ${hiddenClass}" data-seat="${seat.id}" aria-label="${label}" aria-pressed="${selected}" ${occupied ? 'disabled' : ''} title="${label}"><span class="seat-number">${String(seat.number).padStart(2, '0')}</span><span class="seat-status-icon" aria-hidden="true">${stateMark}</span></button>`;
      }).join('');
      return `<section class="seat-zone vip-zone vip-${side.toLowerCase()} ${visible ? '' : 'zone-filtered'}"><div class="zone-heading"><span>${title}</span><small>${seats.length} МЕСТ · ОТ ${formatPrice(Math.min(...seats.map((seat) => getSeatPrice(seat))))}</small></div><div class="zone-seats">${seatsHtml}</div></section>`;
    };
    const seats = seatData.filter((seat) => {
      const zoneValue = seat.side === 'L' ? 'left' : seat.side === 'R' ? 'right' : 'back';
      return (sector === 'all' || zoneValue === sector) && getSeatPrice(seat) <= maxPrice;
    });
    const visibleSeatIds = new Set(seats.map((seat) => seat.id));
    const hiddenSelectedSeats = [...selectedSeats].filter((seatId) => !visibleSeatIds.has(seatId));
    if (hiddenSelectedSeats.length) {
      hiddenSelectedSeats.forEach((seatId) => selectedSeats.delete(seatId));
      $('form-message').textContent = 'Фильтр скрыл выбранное VIP-место — выбор сброшен.';
      $('form-message').classList.remove('error');
    }
    const availableFloor = Math.max(0, FLOOR_CAPACITY - getBookedFloorTickets(concert.id));
    selectedFloorTickets = Math.min(selectedFloorTickets, availableFloor);
    $('seat-map').innerHTML = `<div class="seat-layout">${concert.layout === 'rear-vip' ? renderZone('B') : ''}${renderZone('L')}<div class="dance-floor"><span class="floor-caption">ТАНЦПОЛ</span><span class="floor-note">БЕЗ НУМЕРОВАННЫХ МЕСТ · ${formatPrice(getFloorPrice(concert.id))} / БИЛЕТ</span><span class="floor-mark">✳</span><div class="floor-capacity">${availableFloor} БИЛЕТОВ ДОСТУПНО</div><div class="floor-counter"><button type="button" data-floor-action="minus" aria-label="Уменьшить количество билетов на танцпол" ${selectedFloorTickets === 0 ? 'disabled' : ''}>−</button><output id="floor-ticket-count" aria-live="polite">${selectedFloorTickets}</output><button type="button" data-floor-action="plus" aria-label="Добавить билет на танцпол" ${selectedFloorTickets >= availableFloor ? 'disabled' : ''}>+</button></div></div>${renderZone('R')}<div class="floor-map-legend">Танцпол свободной планировки · место на схеме не закрепляется</div></div>`;
    const floorRow = `<div class="floor-ticket-row"><div class="floor-ticket-description"><b>ТАНЦПОЛ</b><small>Без нумерованного места · ${availableFloor} доступно</small></div><div class="floor-counter list-floor-counter"><button type="button" data-floor-action="minus" aria-label="Уменьшить количество билетов на танцпол" ${selectedFloorTickets === 0 ? 'disabled' : ''}>−</button><output aria-live="polite">${selectedFloorTickets}</output><button type="button" data-floor-action="plus" aria-label="Добавить билет на танцпол" ${selectedFloorTickets >= availableFloor ? 'disabled' : ''}>+</button></div><span class="row-price">${formatPrice(getFloorPrice(concert.id))} / билет</span></div>`;
    const seatRows = seats.length ? seats.map((seat) => {
      const occupied = isOccupied(concert.id, seat.id);
      const selected = selectedSeats.has(seat.id);
      const statusLabel = occupied ? '× ЗАНЯТО' : selected ? '✓ ВЫБРАНО' : '○ СВОБОДНО';
      return `<button type="button" class="seat-row ${selected ? 'selected-row' : ''} ${occupied ? 'occupied-row' : ''}" data-seat="${seat.id}" ${occupied ? 'disabled' : ''} aria-pressed="${selected}"><span><span class="row-sector">${seat.side} · </span>${String(seat.number).padStart(2, '0')} <span class="row-sector">${sectorLabels[seat.side]}</span><small class="row-status">${statusLabel}</small></span><span class="row-price">${formatPrice(getSeatPrice(seat))}</span></button>`;
    }).join('') : '<p class="empty-events">VIP-мест по этим фильтрам нет. Танцпол доступен.</p>';
    $('seat-list').innerHTML = floorRow + seatRows;
    $('seat-result-count').textContent = `${String(seats.length).padStart(2, '0')} VIP + ТАНЦПОЛ`;
    updateTotal();
  }

  function updateTotal() {
    const chosen = getSeatsForConcert().filter((seat) => selectedSeats.has(seat.id));
    const count = chosen.length + selectedFloorTickets;
    $('selected-count').textContent = String(count);
    $('total-price').textContent = formatPrice(chosen.reduce((sum, seat) => sum + getSeatPrice(seat), selectedFloorTickets * getFloorPrice()));
    const button = $('confirm-booking');
    button.disabled = false;
    button.style.opacity = '1';
  }

  function toggleSeat(seatId) {
    const seat = getSeatsForConcert().find((item) => item.id === seatId);
    if (!seat || isOccupied(selectedConcertId, seat.id)) return;
    if (selectedSeats.has(seatId)) selectedSeats.delete(seatId);
    else selectedSeats.add(seatId);
    $('form-message').textContent = 'Выбери одно или несколько свободных мест';
    $('form-message').classList.remove('error');
    renderBooking();
  }

  function changeFloorTickets(delta) {
    const available = Math.max(0, FLOOR_CAPACITY - getBookedFloorTickets(selectedConcertId));
    selectedFloorTickets = Math.max(0, Math.min(available, selectedFloorTickets + delta));
    $('form-message').textContent = 'Выбери танцпол или свободные VIP-места';
    $('form-message').classList.remove('error');
    renderBooking();
  }

  function renderBookings() {
    const bookings = [...state.bookings].sort((a, b) => b.createdAt - a.createdAt);
    $('booking-count').textContent = String(bookings.length).padStart(2, '0');
    $('reset-demo').classList.toggle('hidden', bookings.length === 0);
    if (!bookings.length) {
      $('bookings-list').innerHTML = '<div class="empty-bookings">Пока билетов нет — выбери концерт и займи своё место ✳</div>';
      return;
    }
    $('bookings-list').innerHTML = bookings.map((booking) => {
      const concert = getConcert(booking.concertId);
      const seats = booking.seats.map((seatId) => `${seatId} (${sectorLabels[seatId[0]]})`).join(', ');
      const floor = Number(booking.floorTickets) || 0;
      const ticketInfo = [floor ? `Танцпол × ${floor}` : '', seats].filter(Boolean).join(' · ');
      return `<article class="booking-item"><div class="booking-item-date"><b>${escapeHtml(concert.date.split(' ')[0])}</b>${escapeHtml(concert.date.split(' ')[1])}</div><div class="booking-item-copy"><h3>${escapeHtml(concert.artist)}</h3><p>${escapeHtml(concert.venue)} · ${ticketInfo}<br>Код ${escapeHtml(booking.code)}</p></div><div class="booking-item-total">${formatPrice(booking.total)}</div><button type="button" class="cancel-button" data-cancel="${escapeHtml(booking.id)}">ОТМЕНИТЬ БИЛЕТ</button></article>`;
    }).join('');
  }

  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function announceStorageIssue() {
    if (state.storageError) {
      $('form-message').textContent = 'Браузер не сохранил данные. Проверь разрешение на localStorage.';
      $('form-message').classList.add('error');
    }
  }

  function confirmBooking() {
    const chosen = getSeatsForConcert().filter((seat) => selectedSeats.has(seat.id));
    const message = $('form-message');
    if (!chosen.length && selectedFloorTickets === 0) {
      message.textContent = 'Сначала выбери танцпол или хотя бы одно свободное VIP-место';
      message.classList.add('error');
      return;
    }
    if (chosen.some((seat) => isOccupied(selectedConcertId, seat.id))) {
      message.textContent = 'Одно из мест уже занято. Обнови выбор.';
      message.classList.add('error');
      selectedSeats.clear();
      renderBooking();
      return;
    }
    const booking = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      code: Math.random().toString(36).slice(2, 7).toUpperCase(),
      concertId: selectedConcertId,
      seats: chosen.map((seat) => seat.id),
      floorTickets: selectedFloorTickets,
      total: chosen.reduce((sum, seat) => sum + getSeatPrice(seat), selectedFloorTickets * getFloorPrice()),
      createdAt: Date.now()
    };
    state.bookings.push(booking);
    const saved = saveState();
    selectedSeats.clear();
    selectedFloorTickets = 0;
    renderBooking();
    renderBookings();
    if (!saved) {
      message.textContent = 'Билет создан до обновления страницы, но браузер не сохранил его.';
      message.classList.add('error');
      showToast('Не удалось сохранить бронь');
      return;
    }
    message.textContent = `Готово! Код учебного билета: ${booking.code}`;
    message.classList.remove('error');
    showToast(`Билет забронирован · ${booking.code}`);
  }

  function cancelBooking(id) {
    const booking = state.bookings.find((item) => item.id === id);
    if (!booking) return;
    if (!window.confirm(`Отменить учебную бронь ${booking.code}? Места снова станут свободны.`)) return;
    state.bookings = state.bookings.filter((item) => item.id !== id);
    saveState();
    renderBookings();
    renderBooking();
    showToast('Бронь отменена · места свободны');
    announceStorageIssue();
  }

  function resetDemo() {
    if (!window.confirm('Удалить все учебные брони и освободить выбранные места?')) return;
    state.bookings = [];
    saveState();
    selectedSeats.clear();
    selectedFloorTickets = 0;
    renderBookings();
    renderBooking();
    showToast('Учебные брони сброшены');
    announceStorageIssue();
  }

  $('genre-filter').addEventListener('change', renderEvents);
  $('price-filter').addEventListener('change', renderEvents);
  $('reset-filters').addEventListener('click', () => {
    $('genre-filter').value = 'all';
    $('price-filter').value = 'all';
    renderEvents();
  });
  $('event-grid').addEventListener('click', (event) => {
    const card = event.target.closest('[data-concert]');
    if (card) selectConcert(card.dataset.concert);
  });
  $('event-grid').addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-concert]')) {
      event.preventDefault();
      selectConcert(event.target.dataset.concert);
    }
  });
  $('event-grid').addEventListener('error', (event) => {
    if (event.target.matches('.artist-cutout')) {
      event.target.closest('.poster')?.classList.remove('has-artist-image');
      event.target.remove();
    }
  }, true);
  $('sector-filter').addEventListener('change', renderBooking);
  $('seat-price-filter').addEventListener('change', renderBooking);
  $('seat-map').addEventListener('click', (event) => {
    const seat = event.target.closest('[data-seat]');
    if (seat && !seat.disabled) toggleSeat(seat.dataset.seat);
    const floorButton = event.target.closest('[data-floor-action]');
    if (floorButton && !floorButton.disabled) changeFloorTickets(floorButton.dataset.floorAction === 'plus' ? 1 : -1);
  });
  $('seat-list').addEventListener('click', (event) => {
    const seat = event.target.closest('[data-seat]');
    if (seat && !seat.disabled) toggleSeat(seat.dataset.seat);
    const floorButton = event.target.closest('[data-floor-action]');
    if (floorButton && !floorButton.disabled) changeFloorTickets(floorButton.dataset.floorAction === 'plus' ? 1 : -1);
  });
  $('confirm-booking').addEventListener('click', confirmBooking);
  $('bookings-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-cancel]');
    if (button) cancelBooking(button.dataset.cancel);
  });
  $('reset-demo').addEventListener('click', resetDemo);

  renderFilters();
  renderEvents();
  renderBooking();
  renderBookings();
  announceStorageIssue();
})();
