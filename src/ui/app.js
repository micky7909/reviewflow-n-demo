// Presentation layer: reads inputs from the page, calls the domain, writes results.
// Browser globals are injected so the layer runs in tests without a real DOM.
import { auditPosting } from '../domain/audit.js';
import { buildDraft, draftToText } from '../domain/blog.js';
import { createCampaignSpec } from '../domain/campaign.js';
import { Keyword } from '../domain/keyword.js';
import { Sponsorship } from '../domain/sponsorship.js';
import { parseShots, formatReelScript, ReelSession } from '../domain/reels.js';
import { WAITLIST_STORAGE_KEY, buildWaitlistRecord, formatWaitlistConfirmation } from '../domain/waitlist.js';

const DEFAULT_CTA = '저장해두고 방문 전 확인하세요';

function reelCardsHtml(variants, selectedId) {
  return variants.map((variant, i) => `<div class="reelCard ${selectedId === variant.id ? 'selected' : ''}"><span class="badge">${variant.id}안 · ${variant.tag}</span><h3>${variant.name}</h3><div class="mockVideo"><div><div class="big">${variant.hook}</div><p class="sub">${variant.caption}</p></div><div>${variant.scenes.slice(0, 4).map(s => `<span class="sceneChip">${s}</span>`).join('')}</div></div><div class="timeline">${variant.scenes.map((s, idx) => `<div class="cut">${idx + 1}. ${s}</div>`).join('')}</div><button class="primary" onclick="chooseReel(${i})">선택하고 수정</button></div>`).join('');
}

/**
 * @param {{document: Document, storage: Pick<Storage,'setItem'>,
 *          clipboard: Pick<Clipboard,'writeText'>, setTimeout: typeof setTimeout, now: () => Date}} env
 */
export function createApp({ document, storage, clipboard, setTimeout, now }) {
  const byId = id => document.getElementById(id);
  const reels = new ReelSession();
  // The last generated draft and the campaign it was built from; read by auditFromBlog
  // instead of reaching into the blog tab's inputs.
  let lastDraft = null;

  function toast(message) {
    const el = byId('toast');
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2200);
  }

  function showTab(name) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('on', tab.dataset.tab === name));
    document.querySelectorAll('.pane').forEach(pane => { pane.style.display = pane.id === name ? 'block' : 'none'; });
  }

  function renderReelCards() {
    byId('reelCards').innerHTML = reelCardsHtml(reels.variants, reels.selected?.id);
  }

  // Handlers referenced by onclick attributes in index.html.
  const handlers = {
    go(id) {
      byId(id).scrollIntoView({ behavior: 'smooth' });
    },

    auditPolicy() {
      byId('auditOut').textContent = auditPosting({
        text: byId('auditText').value,
        keyword: new Keyword(byId('auditKw').value),
        sponsorship: Sponsorship.from(byId('auditSpon').value),
      }).report;
      toast('Dr.포스팅 진단 완료');
    },

    genBlog() {
      const spec = createCampaignSpec({
        brand: byId('brand').value,
        keyword: byId('mainKw').value,
        keywordTarget: byId('kwTarget').value,
      });
      const draft = buildDraft(spec, byId('memo').value);
      lastDraft = { spec, text: draftToText(draft) };
      byId('blogOut').textContent = lastDraft.text;
      toast('초안 처방 완료');
    },

    auditFromBlog() {
      if (!lastDraft) { toast('먼저 초안을 만드세요'); return; }
      byId('auditText').value = lastDraft.text;
      byId('auditKw').value = lastDraft.spec.keyword.text;
      byId('auditSpon').value = lastDraft.spec.sponsorship.type;
      showTab('audit');
      handlers.auditPolicy();
      handlers.go('demo');
    },

    genReels() {
      reels.generate({
        topic: byId('reelTopic').value,
        point: byId('reelPoint').value,
        shots: parseShots(byId('reelShots').value),
      });
      renderReelCards();
      toast('릴스 처방 3안 완료');
    },

    chooseReel(index) {
      const selected = reels.choose(index);
      byId('customBox').classList.add('show');
      byId('customTitle').textContent = `${selected.id}안 · ${selected.name}`;
      byId('editHook').value = selected.hook;
      byId('editScenes').value = selected.scenes.join('\n');
      byId('editCaption').value = selected.caption;
      byId('editCta').value = DEFAULT_CTA;
      handlers.applyCustom();
      renderReelCards();
      byId('customBox').scrollIntoView({ behavior: 'smooth' });
    },

    applyCustom() {
      const edited = reels.edit({
        hook: byId('editHook').value,
        scenesText: byId('editScenes').value,
        caption: byId('editCaption').value,
      });
      if (!edited) { toast('먼저 영상안을 선택하세요'); return; }
      byId('reelScript').textContent = formatReelScript(edited, byId('editCta').value);
      toast('수정 반영 완료');
    },

    joinWaitlist() {
      const record = buildWaitlistRecord({
        name: byId('wlName').value,
        use: byId('wlUse').value,
        need: byId('wlNeed').value,
      }, now());
      storage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(record));
      byId('wlOut').textContent = formatWaitlistConfirmation(record);
      toast('로컬 베타 신청 저장 완료');
    },

    copyText(id) {
      clipboard.writeText(byId(id).textContent);
      toast('복사되었습니다');
    },
  };

  function start() {
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => showTab(tab.dataset.tab)));
    handlers.auditPolicy();
  }

  return { handlers, reels, start };
}
