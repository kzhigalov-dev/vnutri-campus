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

async function sendEmailPayload(templateParams, statusEl, submitBtn, submitText, formEl) {
  const originalLabel = submitText?.textContent || 'Отправить сообщение';
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
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.className = 'contact-status is-success';
        statusEl.innerHTML = '<strong>Сообщение отправлено.</strong>';
      }
      formEl.reset();
      const roomInput = formEl.querySelector('[name="room"]');
      if (roomInput) roomInput.value = '';
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.className = 'contact-status is-info';
        statusEl.innerHTML = !hasKeys
          ? 'Отправка пока недоступна. Текст сохранён в форме — попробуйте позже.'
          : 'Сервис отправки ещё загружается. Повторите попытку через несколько секунд.';
      }
    }
  } catch (error) {
    console.error('Ошибка EmailJS:', error);
    const errText = error?.text || error?.message || 'Не удалось отправить сообщение';
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.className = 'contact-status is-error';
      statusEl.innerHTML = `<strong>Ошибка отправки:</strong> ${escapeHTML(errText)}.<br><small>Текст остался в форме. Попробуйте отправить его позже.</small>`;
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = originalLabel;
  }
}

function bindForm(form) {
  if (!form || form.dataset.bound) return;
  form.dataset.bound = 'true';

  const statusEl = form.querySelector('.contact-status') || form.parentElement?.querySelector('.contact-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  const submitText = submitBtn?.querySelector('span') || submitBtn;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (statusEl) {
      statusEl.hidden = true;
      statusEl.textContent = '';
    }

    const nameInput = form.querySelector('[name="user_name"]') || form.querySelector('#contact-name');
    const emailInput = form.querySelector('[name="user_email"]') || form.querySelector('#contact-email');
    const subjectInput = form.querySelector('[name="subject"]') || form.querySelector('#contact-subject');
    const roomInput = form.querySelector('[name="room"]') || form.querySelector('#contact-room');
    const messageInput = form.querySelector('[name="message"]') || form.querySelector('#contact-message');

    const name = nameInput?.value;
    const email = emailInput?.value;
    const subject = subjectInput?.value;
    const room = roomInput?.value;
    const message = messageInput?.value;

    const validation = validateContactPayload({ name, email, message });
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.className = 'contact-status is-error';
        statusEl.innerHTML = escapeHTML(firstError);
      }
      if (validation.errors.name) nameInput?.focus();
      else if (validation.errors.email) emailInput?.focus();
      else if (validation.errors.message) messageInput?.focus();
      return;
    }

    const templateParams = formatContactTemplateParams({
      name,
      email,
      subject,
      room,
      message,
    });

    await sendEmailPayload(templateParams, statusEl, submitBtn, submitText, form);
  });
}

export function openContactModal(options = {}) {
  document.getElementById('nav-project-menu')?.hidePopover?.();
  if (typeof window.activateContactMode === 'function') {
    window.activateContactMode(options);
    return;
  }
  const modal = document.getElementById('nav-contact-modal');
  if (modal) {
    if (options.room) {
      const roomInput = modal.querySelector('[name="room"]');
      if (roomInput) roomInput.value = options.room;
    }
    if (options.subject) {
      const subjSelect = modal.querySelector('[name="subject"]');
      if (subjSelect) subjSelect.value = options.subject;
    }
    try {
      if (typeof modal.showModal === 'function') {
        if (!modal.open) modal.showModal();
      } else {
        modal.setAttribute('open', '');
        modal.style.display = 'block';
      }
    } catch {
      modal.setAttribute('open', '');
      modal.style.display = 'block';
    }
    setTimeout(() => {
      modal.querySelector('[name="user_name"]')?.focus();
    }, 50);
  }

  // Также активируем вкладку связи на боковой панели главной страницы
  if (typeof window.activateContactMode === 'function') {
    window.activateContactMode(options);
  } else {
    const sidebarForm = document.getElementById('sidebar-contact-form');
    if (sidebarForm) {
      if (options.room) {
        const roomInput = sidebarForm.querySelector('[name="room"]');
        if (roomInput) roomInput.value = options.room;
      }
      if (options.subject) {
        const subjSelect = sidebarForm.querySelector('[name="subject"]');
        if (subjSelect) subjSelect.value = options.subject;
      }
    }
  }
}

/**
 * Инициализация всех форм на странице
 */
let contactInitialized = false;
export function initContactForm() {
  if (contactInitialized) return;
  contactInitialized = true;
  document.querySelectorAll('form.contact-form, #contact-form, #sidebar-contact-form, #feedback-page-form').forEach(bindForm);

  const modal = document.getElementById('nav-contact-modal');
  const closeBtn = document.getElementById('nav-contact-close');
  if (modal && closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (typeof modal.close === 'function') modal.close();
      else { modal.removeAttribute('open'); modal.style.display = 'none'; }
    });
    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const inDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!inDialog) {
        if (typeof modal.close === 'function') modal.close();
        else { modal.removeAttribute('open'); modal.style.display = 'none'; }
      }
    });
  }

  // Слушатели открытия
  document.querySelectorAll('#nav-contact-open, #nav-contact-footer-btn, [data-open-contact]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const room = btn.getAttribute('data-contact-room') || '';
      const subject = btn.getAttribute('data-contact-subject') || '';
      openContactModal({ room, subject });
    });
  });

  // Проверка хэша
  function checkHash() {
    if (location.hash === '#contact' || location.hash === '#feedback') {
      openContactModal();
    }
  }
  window.addEventListener('hashchange', checkHash);
  checkHash();
}

window.openContactModal = openContactModal;

// Автоматический запуск при загрузке документа
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactForm);
  } else {
    initContactForm();
  }
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
