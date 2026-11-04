/**
 * Конфигурация и утилиты для работы с EmailJS на сайте внутри. (СПбГУПТД)
 * 
 * Параметры можно настроить:
 * 1. Прямо в этом файле (DEFAULT_EMAILJS_CONFIG)
 * 2. Либо через визуальный блок настроек в форме обратной связи на сайте (сохраняется в localStorage)
 */

export const DEFAULT_EMAILJS_CONFIG = {
  // Service ID из личного кабинета EmailJS (Email Services -> Yandex / SMTP)
  serviceId: '',
  // Template ID из EmailJS (Email Templates)
  templateId: '',
  // Public Key (Account -> Public Key / User ID)
  publicKey: '',
};

export const CONFIG_STORAGE_KEY = 'vnutri_campus_emailjs_config';

/**
 * Получение текущей конфигурации EmailJS (с приоритетом сохранённых в браузере значений)
 */
export function getEmailJSConfig(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (storage) {
    try {
      const raw = storage.getItem(CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          serviceId: parsed.serviceId || DEFAULT_EMAILJS_CONFIG.serviceId || '',
          templateId: parsed.templateId || DEFAULT_EMAILJS_CONFIG.templateId || '',
          publicKey: parsed.publicKey || DEFAULT_EMAILJS_CONFIG.publicKey || '',
        };
      }
    } catch {
      // Игнорируем ошибку чтения storage
    }
  }
  return { ...DEFAULT_EMAILJS_CONFIG };
}

/**
 * Сохранение конфигурации EmailJS в хранилище браузера
 */
export function saveEmailJSConfig(cfg, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  const normalized = {
    serviceId: String(cfg.serviceId || '').trim(),
    templateId: String(cfg.templateId || '').trim(),
    publicKey: String(cfg.publicKey || '').trim(),
  };
  if (storage) {
    try {
      storage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Игнорируем ошибку записи storage
    }
  }
  return normalized;
}

/**
 * Валидация данных формы обратной связи
 */
export function validateContactPayload(payload) {
  const errors = {};
  const name = String(payload?.name || '').trim();
  const email = String(payload?.email || '').trim();
  const message = String(payload?.message || '').trim();

  if (!name || name.length < 2) {
    errors.name = 'Укажите ваше имя (минимум 2 символа)';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailPattern.test(email)) {
    errors.email = 'Укажите корректный адрес электронной почты';
  }

  if (!message || message.length < 5) {
    errors.message = 'Введите текст сообщения (минимум 5 символов)';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Формирование параметров шаблона для отправки обращения через EmailJS
 */
export function formatContactTemplateParams({ name, email, subject, room, message, date }) {
  const formattedDate = date || new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(new Date()) + ' (МСК)';

  return {
    name: String(name || '').trim(),
    user_name: String(name || '').trim(),
    email: String(email || '').trim(),
    user_email: String(email || '').trim(),
    reply_to: String(email || '').trim(),
    subject: String(subject || 'Обращение с сайта внутри.').trim(),
    title: String(subject || 'Обращение с сайта внутри.').trim(),
    room: String(room || 'Не указана').trim(),
    message: String(message || '').trim(),
    date: formattedDate,
    source: 'СПбГУПТД · Вознесенский, 44–46',
  };
}

/**
 * Формирование параметров шаблона для отправки подтверждения бронирования через EmailJS
 */
export function formatBookingTemplateParams(booking, toEmail) {
  const roomName = booking.roomName || booking.roomNumber || booking.roomId || 'Место для работы';
  const startHour = Number(booking.start) || 0;
  const hours = Number(booking.hours) || 1;
  const time = `${String(startHour).padStart(2, '0')}:00–${String(startHour + hours).padStart(2, '0')}:00`;
  const bookingId = (booking.id || '').slice(0, 6).toUpperCase();

  const textSummary = `Бронь №${bookingId}\nАудитория: ${roomName}\nДата: ${booking.date}\nВремя: ${time} (Москва)\nМеста: ${(booking.seatIds || []).join(', ')}\nТариф: Бесплатно`;

  return {
    name: 'Студент',
    user_name: 'Студент',
    email: String(toEmail || '').trim(),
    user_email: String(toEmail || '').trim(),
    reply_to: String(toEmail || '').trim(),
    subject: `Бронь №${bookingId} · внутри. СПбГУПТД`,
    title: `Бронь №${bookingId}`,
    room: roomName,
    date: booking.date,
    time,
    seats: (booking.seatIds || []).join(', '),
    booking_id: bookingId,
    message: textSummary,
    source: 'внутри. — СПбГУПТД · Вознесенский, 44–46',
  };
}
