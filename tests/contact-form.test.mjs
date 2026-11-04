import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_EMAILJS_CONFIG,
  getEmailJSConfig,
  saveEmailJSConfig,
  validateContactPayload,
  formatContactTemplateParams,
  formatBookingTemplateParams,
  CONFIG_STORAGE_KEY
} from '../public/js/emailjs-config.js';

test('validateContactPayload catches empty and invalid fields', () => {
  const emptyRes = validateContactPayload({});
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.errors.name);
  assert.ok(emptyRes.errors.email);
  assert.ok(emptyRes.errors.message);

  const invalidEmailRes = validateContactPayload({
    name: 'Иван',
    email: 'not-an-email',
    message: 'Приветствую, есть вопрос по аудитории 452'
  });
  assert.equal(invalidEmailRes.valid, false);
  assert.ok(invalidEmailRes.errors.email);
  assert.equal(invalidEmailRes.errors.name, undefined);

  const validRes = validateContactPayload({
    name: 'Анна',
    email: 'anna@sutd.ru',
    message: 'Подскажите, пожалуйста, открыт ли коворкинг?'
  });
  assert.equal(validRes.valid, true);
  assert.deepEqual(validRes.errors, {});
});

test('formatContactTemplateParams formats data for EmailJS templates', () => {
  const params = formatContactTemplateParams({
    name: '  Петр Васильев  ',
    email: 'petr@example.com',
    subject: 'Вопрос по аудитории',
    room: '452',
    message: 'Будет ли занятие в этой аудитории?',
    date: '4 ноября 2026, 23:00 (МСК)'
  });

  assert.equal(params.name, 'Петр Васильев');
  assert.equal(params.user_name, 'Петр Васильев');
  assert.equal(params.email, 'petr@example.com');
  assert.equal(params.user_email, 'petr@example.com');
  assert.equal(params.reply_to, 'petr@example.com');
  assert.equal(params.room, '452');
  assert.equal(params.message, 'Будет ли занятие в этой аудитории?');
  assert.equal(params.date, '4 ноября 2026, 23:00 (МСК)');
  assert.equal(params.source, 'СПбГУПТД · Вознесенский, 44–46');
});

test('formatBookingTemplateParams generates readable email parameters', () => {
  const booking = {
    id: 'abc123xyz',
    roomId: 'room-4',
    roomName: 'Читальный зал',
    roomNumber: '459',
    date: '2026-11-05',
    start: 13,
    hours: 2,
    seatIds: [1, 2]
  };

  const params = formatBookingTemplateParams(booking, 'student@sutd.ru');
  assert.equal(params.email, 'student@sutd.ru');
  assert.equal(params.booking_id, 'ABC123');
  assert.equal(params.time, '13:00–15:00');
  assert.equal(params.seats, '1, 2');
  assert.ok(params.message.includes('Бронь №ABC123'));
  assert.ok(params.message.includes('Читальный зал'));
});

test('getEmailJSConfig and saveEmailJSConfig manage persistence', () => {
  const mockStorage = {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); }
  };

  // Initially uses default config
  const initial = getEmailJSConfig(mockStorage);
  assert.equal(initial.serviceId, DEFAULT_EMAILJS_CONFIG.serviceId);
  assert.equal(initial.templateId, DEFAULT_EMAILJS_CONFIG.templateId);
  assert.equal(initial.publicKey, DEFAULT_EMAILJS_CONFIG.publicKey);

  // Save new configuration
  saveEmailJSConfig({
    serviceId: 'service_yandex',
    templateId: 'template_campus',
    publicKey: 'pub_test_123'
  }, mockStorage);

  const updated = getEmailJSConfig(mockStorage);
  assert.equal(updated.serviceId, 'service_yandex');
  assert.equal(updated.templateId, 'template_campus');
  assert.equal(updated.publicKey, 'pub_test_123');
});
