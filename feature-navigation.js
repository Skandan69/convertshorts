const menuToggle = document.querySelector('.feature-menu-toggle');
const toolLinks = document.getElementById('feature-links');
menuToggle?.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(expanded));
  toolLinks.classList.toggle('is-open', expanded);
});
