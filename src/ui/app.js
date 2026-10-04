// Presentation layer: reads inputs from the page, calls the domain, writes results.
// Browser globals are injected so the layer runs in tests without a real DOM.
import { auditPosting } from '../domain/audit.js';
import { normalizeBlogInput, buildBlogDraft } from '../domain/blog.js';
import { parseShots, buildReelVariants, applyReelEdits, formatReelScript } from '../domain/reels.js';
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
  const state = { variants: [], selected: null };

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
    byId('reelCards').innerHTML = reelCardsHtml(state.variants, state.selected?.id);
  }

  // Handlers referenced by onclick attributes in index.html.
  const handlers = {
    go(id) {
      byId(id).scrollIntoView({ behavior: 'smooth' });
    },

    auditPolicy() {
      byId('auditOut').textContent = auditPosting({
        text: byId('auditText').value,
        keyword: byId('auditKw').value,
        sponsorship: byId('auditSpon').value,
      });
      toast('Dr.포스팅 진단 완료');
    },

    genBlog() {
      const input = normalizeBlogInput({
        brand: byId('brand').value,
        keyword: byId('mainKw').value,
        target: byId('kwTarget').value,
        memo: byId('memo').value,
      });
      byId('blogOut').textContent = buildBlogDraft(input);
      toast('초안 처방 완료');
    },

    auditFromBlog() {
      byId('auditText').value = byId('blogOut').textContent;
      byId('auditKw').value = byId('mainKw').value;
      showTab('audit');
      handlers.auditPolicy();
      handlers.go('demo');
    },

    genReels() {
      state.variants = buildReelVariants({
        topic: byId('reelTopic').value,
        point: byId('reelPoint').value,
        shots: parseShots(byId('reelShots').value),
      });
      renderReelCards();
      toast('릴스 처방 3안 완료');
    },

    chooseReel(index) {
      state.selected = structuredClone(state.variants[index]);
      byId('customBox').classList.add('show');
      byId('customTitle').textContent = `${state.selected.id}안 · ${state.selected.name}`;
      byId('editHook').value = state.selected.hook;
      byId('editScenes').value = state.selected.scenes.join('\n');
      byId('editCaption').value = state.selected.caption;
      byId('editCta').value = DEFAULT_CTA;
      handlers.applyCustom();
      renderReelCards();
      byId('customBox').scrollIntoView({ behavior: 'smooth' });
    },

    applyCustom() {
      if (!state.selected) { toast('먼저 영상안을 선택하세요'); return; }
      state.selected = applyReelEdits(state.selected, {
        hook: byId('editHook').value,
        scenesText: byId('editScenes').value,
        caption: byId('editCaption').value,
      });
      byId('reelScript').textContent = formatReelScript(state.selected, byId('editCta').value);
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

  return { handlers, state, start };
}
