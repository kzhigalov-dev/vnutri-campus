import {
  getEmailJSConfig,
  saveEmailJSConfig,
  validateContactPayload,
  formatContactTemplateParams,
  formatBookingTemplateParams
} from './emailjs-config.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

/**
 * Инициализация формы обратной связи и модального окна
 */
export function initContactForm() {
  const modal = document.getElementById('nav-contact-modal');
  const form = document.getElementById('contact-form');
  if (!modal || !form) return;

  const statusEl = document.getElementById('contact-status');
  const submitBtn = document.getElementById('contact-submit-btn');
  const submitText = document.getElementById('contact-submit-text');

  function showStatus(html, type = 'is-info') {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.className = `contact-status ${type}`;
    statusEl.innerHTML = html;
  }

  function clearStatus() {
    if (!statusEl) return;
    statusEl.hidden = true;
    statusEl.textContent = '';
  }

  function openModal(options = {}) {
    clearStatus();
    if (options.room) {
      const roomInput = document.getElementById('contact-room');
      if (roomInput) roomInput.value = options.room;
    }
    if (options.subject) {
      const subjSelect = document.getElementById('contact-subject');
      if (subjSelect) subjSelect.value = options.subject;
    }
    if (!modal.open) {
      modal.showModal();
    }
    // Фокус на имя
    setTimeout(() => {
      document.getElementById('contact-name')?.focus();
    }, 50);
  }

  window.openContactModal = openModal;

  // Слушатели открытия
  document.querySelectorAll('#nav-contact-open, #nav-contact-footer-btn, [data-open-contact]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const room = btn.getAttribute('data-contact-room') || '';
      const subject = btn.getAttribute('data-contact-subject') || '';
      openModal({ room, subject });
    });
  });

  // Закрытие
  const closeBtn = document.getElementById('nav-contact-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.close());
  }

  // Клик по подложке (backdrop) закрывает диалог
  modal.addEventListener('click', (e) => {
    const rect = modal.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      modal.close();
    }
  });

  // Проверка хэша страницы
  function checkHash() {
    if (location.hash === '#contact' || location.hash === '#feedback') {
      openModal();
    }
  }
  window.addEventListener('hashchange', checkHash);
  checkHash();

  // Отправка формы
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();

    const name = document.getElementById('contact-name')?.value;
    const email = document.getElementById('contact-email')?.value;
    const subject = document.getElementById('contact-subject')?.value;
    const room = document.getElementById('contact-room')?.value;
    const message = document.getElementById('contact-message')?.value;

    const validation = validateContactPayload({ name, email, message });
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      showStatus(escapeHTML(firstError), 'is-error');
      if (validation.errors.name) document.getElementById('contact-name')?.focus();
      else if (validation.errors.email) document.getElementById('contact-email')?.focus();
      else if (validation.errors.message) document.getElementById('contact-message')?.focus();
      return;
    }

    const templateParams = formatContactTemplateParams({
      name,
      email,
      subject,
      room,
      message,
    });

    const config = getEmailJSConfig();
    const hasKeys = Boolean(config.publicKey && config.serviceId && config.templateId);

    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.textContent = 'Отправка…';

    try {
      if (hasKeys && typeof window.emailjs !== 'undefined') {
        window.emailjs.init({ publicKey: config.publicKey });
        await window.emailjs.send(
          config.serviceId,
          config.templateId,
          templateParams,
          config.publicKey
        );
        showStatus('<strong>Сообщение успешно отправлено!</strong> Копия направлена в сервис почты.', 'is-success');
        form.reset();
        const roomInput = document.getElementById('contact-room');
        if (roomInput) roomInput.value = '';
      } else {
        // Режим демонстрации без указанных ключей (валидация прошла)
        await new Promise(resolve => setTimeout(resolve, 500));
        const helpText = !hasKeys
          ? '<strong>Данные формы успешно проверены!</strong><br>Ключи EmailJS настраиваются в файле <code>public/js/emailjs-config.js</code>.'
          : 'Библиотека EmailJS инициализируется, повторите отправку через секунду.';
        showStatus(helpText, 'is-info');
        form.reset();
        const roomInput = document.getElementById('contact-room');
        if (roomInput) roomInput.value = '';
      }
    } catch (error) {
      console.error('Ошибка EmailJS:', error);
      const errText = error?.text || error?.message || 'Не удалось отправить данные';
      showStatus(
        `<strong>Ошибка отправки:</strong> ${escapeHTML(errText)}.<br><small>Для Gmail / Яндекса убедитесь, что в Email Services сервис подключен (Connect Account для Google или пароль приложения), а также верно указаны Service ID, Template ID и Public Key.</small>`,
        'is-error'
      );
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (submitText) submitText.textContent = 'Отправить через EmailJS';
    }
  });
}

/**
 * Отправка подтверждения бронирования на Email через EmailJS
 */
export async function sendBookingNotification(booking, toEmail) {
  const config = getEmailJSConfig();
  if (!config.publicKey || !config.serviceId || !config.templateId) {
    return {
      success: false,
      reason: 'no_config',
      message: 'Ключи EmailJS не настроены в файле public/js/emailjs-config.js.'
    };
  }
  if (typeof window.emailjs === 'undefined') {
    return {
      success: false,
      reason: 'no_sdk',
      message: 'Библиотека EmailJS ещё не загрузилась.'
    };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!toEmail || !emailPattern.test(toEmail)) {
    return {
      success: false,
      reason: 'invalid_email',
      message: 'Укажите корректный адрес электронной почты.'
    };
  }

  const templateParams = formatBookingTemplateParams(booking, toEmail);

  try {
    window.emailjs.init({ publicKey: config.publicKey });
    await window.emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      config.publicKey
    );
    return { success: true };
  } catch (error) {
    console.error('EmailJS booking error:', error);
    return {
      success: false,
      reason: 'send_error',
      message: error?.text || error?.message || 'Не удалось отправить подтверждение бронирования.'
    };
  }
}
