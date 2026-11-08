/* DAYEN Video Production Core v1.0 -- pure data transforms; no remote AI calls. */
export const VERSION = "dayen.video.v1";
export const BRAND = {
  name: "DAYEN CONTENT LAB", character: "닥터냥",
  appearance: "흰색·라일락 털, 보라색 학사모, 둥근 안경, 흰 연구 가운, 핑크 플라스크. 구름 캐릭터로 바꾸지 않는다.",
  palette: ["#7A54CB", "#EBE2FC", "#E6F0FF", "#F8D8EB", "#2E2456"],
  rules: "첨부한 같은 캐릭터를 재사용한다. 새로운 얼굴·팔다리·꼬리를 임의로 생성하지 않는다. 텍스트는 이미지에 그리지 않고 편집 가능한 자막 레이어로 쓴다.",
  disclaimers: "상황극과 과학적 사실을 구분한다. 특정 개인의 진단·치료를 지시하지 않는다."
};
const labels = ["질문", "상황극", "과학적 설명", "오늘의 관찰", "한계", "다음 화"];
export function episodeKey(season, episode) {
  return `s${String(season+1).padStart(2,"0")}e${String(episode+1).padStart(2,"0")}`;
}
export function makeDraft(e, seasonTitle, key, target=45) {
  const voice = [e.hook || e.title, e.scene, e.twist, e.action, e.caution, e.cliff].map(x => String(x || "").trim());
  const captions = [e.hook || e.title, "닥터냥의 일상 수사노트", "오늘의 과학적 단서", "오늘 한 가지 관찰해요", "개인차와 한계가 있어요", e.cliff || "다음 화에서 이어집니다"];
  const visuals = [
    `닥터냥과 ${e.prop || "실험 노트"} 클로즈업. 질문을 큰 타이포그래피로 표시. 느린 5% 줌.`,
    "가상의 일상 상황을 작은 삽화/도형으로 보여주고 '상황극' 라벨. 시끄러운 효과는 금지.",
    "검토된 설명만 간단한 도식으로 표현. 수치·뇌 영상·실험결과를 만들지 않는다.",
    "한 가지 관찰 행동을 체크리스트로 보여준다. 결과·치료효과를 보장하지 않는다.",
    "한계를 읽을 수 있는 속도로 표시. 의료 조언을 대신하지 않는다는 각주.",
    "닥터냥, 다음 질문, 회차를 함께 표시. 이번 화 답은 이미 제공하고 다음 의문으로 마친다."
  ];
  const weights=voice.map((t,i)=>Math.max(i===0?14:18, Array.from(t.replace(/\s/g,"")).length));
  const sum=weights.reduce((a,b)=>a+b,0);
  const durations=weights.map(w=>Math.max(3, Math.round(target*w/sum)));
  let delta=target-durations.reduce((a,b)=>a+b,0);
  for(let i=2; delta!==0; i=(i+1)%6) {
    if(delta>0){durations[i]++;delta--;}
    else if(durations[i]>3){durations[i]--;delta++;}
  }
  return {
    schema_version: VERSION, id:key, series:seasonTitle, title:e.title, target_seconds:target,
    voice_style:"차분하고 호기심 많은 한국어 성인 목소리. 과장된 아기 목소리·허가 없는 음성 복제 금지.",
    scenes:voice.map((n,i)=>({id:`scene-${i+1}`,label:labels[i],duration_seconds:durations[i],narration:n,caption:captions[i],visual:visuals[i],source_ids:[2,3,4].includes(i)?["source-1"]:[],fiction:i===1})),
    sources:[{id:"source-1",title:e.sourceTitle || "원문 제목 확인 필요",url:e.url || "",review:"pending"}],
    source_reviewed:false, rights_reviewed:false, mode:"claude-motion",
    updated_at:new Date().toISOString()
  };
}
export function revision(d) {
  const json=JSON.stringify({id:d.id,title:d.title,scenes:d.scenes,sources:d.sources,voice:d.voice_style,mode:d.mode});
  let h=2166136261;
  for (const c of json) {h^=c.codePointAt(0);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,"0");
}
export function validate(d) {
  const errors=[], warnings=[];
  if(!d?.id || !Array.isArray(d.scenes) || d.scenes.length!==6) errors.push("6개 장면이 필요합니다.");
  let duration=0, chars=0;
  for(const s of d.scenes || []) {
    if(!s.narration?.trim()) errors.push(`${s.label}: 내레이션이 비어 있습니다.`);
    if(!s.caption?.trim()) errors.push(`${s.label}: 화면 문구가 비어 있습니다.`);
    if(!Number.isFinite(+s.duration_seconds) || +s.duration_seconds<2 || +s.duration_seconds>35) errors.push(`${s.label}: 2~35초로 설정하세요.`);
    duration+=Number(s.duration_seconds)||0;
    chars+=Array.from(String(s.narration||"").replace(/\s/g,"")).length;
    if(/도파민\s*중독|뇌가\s*망가|100%\s*완치|무조건\s*효과/.test(s.narration)) warnings.push(`${s.label}: 과장되거나 단정적인 표현을 다시 확인하세요.`);
  }
  if(duration>90 || duration<20) errors.push("전체 길이는 20~90초 안에서 구성하세요.");
  for (const source of d.sources || []) {
    try {const u=new URL(source.url); if(u.protocol!=="https:")throw 0;}
    catch {errors.push("출처에는 유효한 HTTPS 원문 주소를 넣으세요.");}
  }
  if(!d.sources?.length) errors.push("검토할 출처가 최소 1개 필요합니다.");
  const estimated=Math.ceil(chars/6);
  if(estimated>duration) warnings.push(`대사량을 기준으로 약 ${estimated}초가 필요할 수 있습니다. 6글자/초는 편집용 추정이며 실제 음성 후 시간을 다시 맞춰야 합니다.`);
  if(d.scenes?.some(s=>Array.from(s.caption).length>54)) warnings.push("긴 화면 문구가 있습니다. 2줄 단위로 나눠 최종 영상에서 확인하세요.");
  if(!d.source_reviewed) warnings.push("과학적 근거 검토 전입니다. 출처 링크가 있다는 사실은 검증 완료가 아닙니다.");
  return {errors,warnings,duration,estimated,ready:errors.length===0 && !!d.source_reviewed && !!d.rights_reviewed};
}
export function buildPlan(d, assetName="mascot-reference.svg") {
  const qa=validate(d); let time=0;
  const scenes=d.scenes.map(s=>{
    const start=time; time+=Number(s.duration_seconds);
    return {...s,start_seconds:start,end_seconds:time};
  });
  return {
    schema_version:VERSION, episode_id:d.id,revision:revision(d),title:d.title,series:d.series,
    execution_mode:"manual_handoff",job_status:qa.ready?"ready_for_handoff":"draft",
    render:{width:1080,height:1920,fps:30,target_seconds:qa.duration,codec:"h264",audio_codec:"aac",format:"mp4",
      timing_status:"estimated_before_audio",adapt_timing_to_real_narration:true},
    brand:{...BRAND,reference_asset:assetName},
    audio:{voice_style:d.voice_style,voice_file:null,voice_status:"not_generated",music:"none_by_default"},
    sources:d.sources.map(x=>({...x,review:d.source_reviewed?"user_checked":"pending"})),
    scenes,
    quality_gate:{evidence_checked_by_user:!!d.source_reviewed,asset_rights_checked_by_user:!!d.rights_reviewed,
      final_video_reviewed:false,publication_approved:false,auto_publish:false},
    qa,created_at:new Date().toISOString()
  };
}
export function buildPrompt(d, assetName="mascot-reference.svg") {
  const p=buildPlan(d,assetName);
  const route=d.mode==="claude-motion"
    ? "Claude Motion을 사용할 수 있으면 Motion 아티팩트로 제작해 주세요. 현재 계정에 Motion이 없다면 있다고 가정하지 말고 Claude Code + Remotion 또는 연결된 편집 도구 경로를 알려주세요."
    : d.mode==="claude-code"
    ? "Claude Code 환경에서 재사용 가능한 Remotion 템플릿을 사용해 MP4를 렌더링해 주세요. 실행 환경이나 의존성이 없다면 요구사항과 실패 원인을 정확히 밝히고 렌더링 완료로 표시하지 마세요."
    : "현재 계정에 Descript 연결 도구가 실제로 있으면 활용해 비공개 프로젝트로 제작해 주세요. 연결되어 있지 않으면 자동 전송했다고 말하지 마세요. 외부 공개 공유와 SNS 게시를 하지 마세요.";
  return `당신은 DAYEN CONTENT LAB의 영상 제작 담당입니다.
${route}

[이번 요청의 산출물]
대본 설명이나 포스터가 아니라 재생 가능한 9:16 짧은 영상입니다.
가능하면 실제 MP4와 수정 가능한 프로젝트, 최종 음성과 동기화된 SRT를 제공하세요.
첨부한 episode.json이 단일 기준입니다. 아래 정보와 다른 제목·수치·결론을 새로 만들지 마세요.

[캐릭터 고정]
${BRAND.appearance}
${BRAND.rules}
참조 파일: ${assetName}. 참조를 읽지 못하면 새 캐릭터로 대체하지 말고 알려주세요.
테마: 라벤더·하늘색·핑크. 가독성 높은 어두운 글자. 한 화면의 자막은 2줄 이내.
모서리와 하단 플랫폼 UI 영역을 피하는 여백을 확보하세요. 최종 모바일 화면에서 확인하세요.

[음성·자막·길이]
한국어 내레이션: ${d.voice_style}
음성 생성 기능이 실제로 있으면 사용하고, 없으면 무음 미리보기임을 명시하세요.
BGM은 기본 없음. 허가되지 않은 음악·음성복제를 사용하지 마세요.
현재 ${p.render.target_seconds}초 타임라인은 가안입니다. 실제 음성 길이를 먼저 측정해 자막·컷을 맞추세요.
문장을 잘라내거나 부자연스럽게 빠르게 읽게 하지 마세요. 더 긴 길이가 필요하면 변경 사유를 기록하세요.
captions-draft.srt는 참고용 가안이며, 최종 음성 동기화가 된 자막이 아닙니다.

[검수]
${p.quality_gate.evidence_checked_by_user?"사용자가 근거 검토를 표시했습니다.":"아직 근거 검토 전입니다. 검토용 초안으로만 다루세요."}
핵심 사실은 연결된 원문 범위 안에서만 설명하세요. 상황극은 허구 예시입니다.
${BRAND.disclaimers}
주장을 확인하지 못하면 근거 확인 필요라고 표시하고, 의학적 결론을 새로 만들지 마세요.
다음 화 예고는 마지막 장면에만 넣고, 이번 화의 답을 숨기지 마세요.
실제 파일을 재생하고 자막 잘림·캐릭터 변형·무음 여부를 확인하기 전 완료했다고 말하지 마세요.
공개 공유, YouTube/Instagram 업로드는 사용자 최종 승인 전 금지입니다.
유료 API 호출이나 새 구독이 필요하면 먼저 비용 범위와 필요한 연결을 알려주세요.

[작업 데이터]
${JSON.stringify(p,null,2)}
`;
}
const ts=n=>{const ms=Math.round(n*1000);return `${String(Math.floor(ms/3600000)).padStart(2,"0")}:${String(Math.floor(ms/60000)%60).padStart(2,"0")}:${String(Math.floor(ms/1000)%60).padStart(2,"0")},${String(ms%1000).padStart(3,"0")}`};
export function buildSrt(d) {
  let n=0,time=0; const out=[];
  for(const s of d.scenes) {
    const text=s.narration.trim();
    const parts=text.match(/.{1,26}(?:\s|$)|.{1,26}/gu) || [text];
    const slice=Number(s.duration_seconds)/parts.length;
    for(let i=0;i<parts.length;i++) out.push(`${++n}\n${ts(time+i*slice)} --> ${ts(time+(i+1)*slice)}\n${parts[i].trim()}\n`);
    time+=Number(s.duration_seconds);
  }
  return out.join("\n");
}
/** ZIP STORE, UTF-8 filenames, no dependencies. */
export function zipFiles(files) {
  const enc=new TextEncoder(),chunks=[],central=[];let offset=0;
  const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
  for(const f of files) {
    const name=enc.encode(f.name),data=typeof f.data==="string"?enc.encode(f.data):f.data;
    const checksum=crc(data),h=new Uint8Array(30+name.length),v=new DataView(h.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);
    v.setUint32(14,checksum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);
    v.setUint16(26,name.length,true);h.set(name,30);chunks.push(h,data);
    const c=new Uint8Array(46+name.length),cv=new DataView(c.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);
    cv.setUint32(16,checksum,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);
    cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=h.length+data.length;
  }
  const sz=central.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
  ev.setUint32(12,sz,true);ev.setUint32(16,offset,true);
  return new Blob([...chunks,...central,end],{type:"application/zip"});
}
