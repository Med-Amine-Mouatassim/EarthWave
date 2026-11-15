import { PRESENTATION_URL, TEAM_PROFILES } from './footer-config.js';

const footer = document.getElementById('siteFooter');
if (footer) {
  footer.innerHTML = `
    <div class="site-footer__inner">
      <div class="site-footer__grid">
        <section class="site-footer__project" aria-labelledby="footer-project-title">
          <a class="site-footer__brand" href="index.html" aria-label="EarthWave home">
            <span class="site-footer__brand-mark" aria-hidden="true">EW</span>
            <span id="footer-project-title">EARTHWAVE</span>
          </a>
          <p>Explore places with NASA climate records, view Earth imagery, and turn selected environmental data into sound.</p>
          <p class="site-footer__slogan" data-t="slogan">Listen to the Planet. Understand the Earth.</p>
        </section>

        <section class="site-footer__team" aria-labelledby="footer-team-title">
          <p class="site-footer__eyebrow">REALIZED BY</p>
          <h2 id="footer-team-title">Project Team</h2>
          <div class="site-footer__members" id="footerMembers"></div>
        </section>

        <section class="site-footer__discover" aria-labelledby="footer-discover-title">
          <p class="site-footer__eyebrow">NASA SPACE APPS CHALLENGE</p>
          <h2 id="footer-discover-title">Discover Our Project</h2>
          <p>Take a closer look at our Earth data experience and the ideas behind EarthWave.</p>
          <a class="site-footer__presentation" href="${PRESENTATION_URL}" target="_blank" rel="noopener noreferrer">
            <span>View Project Presentation</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7M21 3l-9 9M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></svg>
          </a>
        </section>
      </div>

      <div class="site-footer__bottom">
        <nav aria-label="Footer navigation">
          <a href="index.html" data-t="navHome">Home</a>
          <a href="index.html#explore" data-t="navExplore">Earth Explorer</a>
          <a href="studio.html" data-t="navStudio">Studio</a>
          <a href="about.html" data-t="navAbout">About</a>
        </nav>
        <p>Independent educational project; not endorsed by NASA.</p>
        <span>© EarthWave</span>
      </div>
    </div>`;

  const members = footer.querySelector('#footerMembers');
  for (const member of TEAM_PROFILES) {
    const card = document.createElement('article');
    card.className = 'site-footer__member';
    const name = document.createElement('h3');
    name.textContent = member.name;
    card.append(name);

    const socials = document.createElement('div');
    socials.className = 'site-footer__socials';
    for (const network of ['linkedin', 'github']) {
      socials.append(createProfileControl(member, network));
    }
    card.append(socials);
    members.append(card);
  }
}

function createProfileControl(member, network) {
  const label = network === 'linkedin' ? 'LinkedIn' : 'GitHub';
  const rawUrl = member[network];
  let safeUrl = '';
  if (rawUrl && rawUrl !== 'TODO_PROFILE_URL') {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === 'https:') safeUrl = parsed.href;
    } catch { /* Invalid or incomplete profile URLs remain non-clickable. */ }
  }

  const control = document.createElement(safeUrl ? 'a' : 'span');
  control.className = `site-footer__social${safeUrl ? '' : ' is-unconfigured'}`;
  control.setAttribute('aria-label', safeUrl
    ? `${label} profile for ${member.name}`
    : `${label} profile URL for ${member.name} is not configured`);
  if (safeUrl) {
    control.href = safeUrl;
    control.target = '_blank';
    control.rel = 'noopener noreferrer';
  } else {
    control.title = `Add this profile URL in frontend/js/footer-config.js`;
  }

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', network === 'linkedin'
    ? 'M5 3.5A1.5 1.5 0 1 1 5 6.5a1.5 1.5 0 0 1 0-3ZM3.5 9h3v11h-3zM10 9h2.9v1.5h.1A3.2 3.2 0 0 1 16 8.8c3.2 0 3.8 2.1 3.8 4.8V20h-3v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V20h-3z'
    : 'M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.35 1.08 2.92.82.09-.65.35-1.08.64-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.98c.85 0 1.71.11 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.75c0 .26.18.57.69.48A10 10 0 0 0 12 2Z');
  icon.append(path);
  const text = document.createElement('span');
  text.textContent = label;
  control.append(icon, text);
  return control;
}
