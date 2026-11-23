const VR: Readonly<Record<string, string>> = {
  あ: 'あかさたなはまやらわがざだばぱぁゃ',
  い: 'いきしちにひみりぎじぢびぴぃ',
  う: 'うくすつぬふむゆるぐずづぶぷぅゅ',
  え: 'えけせてねへめれげぜでべぺぇ',
  お: 'おこそとのほもよろをごぞどぼぽぉょ',
};

export function vowelOf(c: string): string {
  for (const k of Object.keys(VR)) {
    if ((VR[k] ?? '').includes(c)) return k;
  }
  return '';
}

export function lenFix(s: string): string {
  return s.replace(/([ぁ-ゖ])ー/g, (_m, p: string) => p + (vowelOf(p) || 'ー'));
}

export function kataToHira(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

const RM: Readonly<Record<string, string>> = (() => {
  const m: Record<string, string> = {};
  const v = 'aiueo';
  const rows: Record<string, string> = {
    '': 'あいうえお',
    k: 'かきくけこ',
    s: 'さしすせそ',
    t: 'たちつてと',
    n: 'なにぬねの',
    h: 'はひふへほ',
    m: 'まみむめも',
    r: 'らりるれろ',
    g: 'がぎぐげご',
    z: 'ざじずぜぞ',
    d: 'だぢづでど',
    b: 'ばびぶべぼ',
    p: 'ぱぴぷぺぽ',
  };
  for (const c of Object.keys(rows)) {
    const row = rows[c] ?? '';
    [...v].forEach((x, i) => {
      m[c + x] = row[i] ?? '';
    });
  }
  Object.assign(m, {
    ya: 'や',
    yu: 'ゆ',
    yo: 'よ',
    wa: 'わ',
    wo: 'を',
    shi: 'し',
    chi: 'ち',
    tsu: 'つ',
    ji: 'じ',
    sha: 'しゃ',
    shu: 'しゅ',
    sho: 'しょ',
    she: 'しぇ',
    cha: 'ちゃ',
    chu: 'ちゅ',
    cho: 'ちょ',
    che: 'ちぇ',
    ja: 'じゃ',
    ju: 'じゅ',
    jo: 'じょ',
    je: 'じぇ',
    fa: 'ふぁ',
    fi: 'ふぃ',
    fe: 'ふぇ',
    fo: 'ふぉ',
    fu: 'ふ',
    di: 'でぃ',
    thi: 'てぃ',
    dhi: 'でぃ',
    wi: 'うぃ',
    we: 'うぇ',
  });
  const palatal: Record<string, string> = {
    ky: 'き',
    sy: 'し',
    ty: 'ち',
    ny: 'に',
    hy: 'ひ',
    my: 'み',
    ry: 'り',
    gy: 'ぎ',
    zy: 'じ',
    jy: 'じ',
    by: 'び',
    py: 'ぴ',
    dy: 'ぢ',
  };
  for (const [c, k] of Object.entries(palatal)) {
    m[`${c}a`] = `${k}ゃ`;
    m[`${c}u`] = `${k}ゅ`;
    m[`${c}o`] = `${k}ょ`;
  }
  return m;
})();

export function romaToKana(input: string): string | null {
  const t = input
    .toLowerCase()
    .replace(/ā/g, 'aa')
    .replace(/ī/g, 'ii')
    .replace(/ū/g, 'uu')
    .replace(/ē/g, 'ee')
    .replace(/ō/g, 'ou');

  let o = '';
  let i = 0;
  while (i < t.length) {
    const c = t[i] ?? '';
    if (c === '-') {
      o += 'ー';
      i++;
      continue;
    }
    if (c === "'" || c === '’') {
      i++;
      continue;
    }
    if (c === 'n') {
      const nx = t[i + 1];
      if (!nx || !'aiueoy'.includes(nx)) {
        o += 'ん';
        i++;
        continue;
      }
    }
    if (i + 1 < t.length && t[i] === t[i + 1] && !'aiueon'.includes(c)) {
      o += 'っ';
      i++;
      continue;
    }
    if (t.startsWith('tch', i)) {
      o += 'っ';
      i++;
      continue;
    }
    let hit = false;
    for (const L of [3, 2, 1]) {
      const k = t.slice(i, i + L);
      const mapped = RM[k];
      if (mapped) {
        o += mapped;
        i += L;
        hit = true;
        break;
      }
    }
    if (!hit) return null;
  }
  return o;
}

export function romajiText(s: string): string {
  if (!/[A-Za-zāīūēōĀĪŪĒŌ]/.test(s)) return s;
  return s.replace(/[A-Za-zāīūēōĀĪŪĒŌ'’-]+/g, (tok) => {
    if (!/[A-Za-zāīūēōĀĪŪĒŌ]/.test(tok)) return tok;
    const l = tok.toLowerCase();
    if (l === 'wa' || l === 'ha') return 'は';
    if (l === 'e' || l === 'he') return 'へ';
    if (l === 'o' || l === 'wo') return 'を';
    const k = romaToKana(tok);
    return k == null ? tok : k;
  });
}
