            const KEY = CFG.key;
            const $ = s => document.querySelector(s);
            const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;'
            }[c]));
            let store = {};
            try {
                store = JSON.parse(localStorage.getItem(KEY) || '{}')
            } catch (e) {}
            const save = () => {
                try {
                    localStorage.setItem(KEY, JSON.stringify(store))
                } catch (e) {}
            }
            ;
            let myName = store._name || 'ミン';

            /* ---------- chuẩn hoá chữ nhận được: chữ Hán, số, giờ, tiền, tầng → kana ---------- */
            const KANJI = [['日本語学校', 'にほんごがっこう'], ['日本語', 'にほんご'], ['大学生', 'だいがくせい'], ['会社員', 'かいしゃいん'], ['桜大学', 'さくらだいがく'], ['大学', 'だいがく'], ['学生', 'がくせい'], ['先生', 'せんせい'], ['教師', 'きょうし'], ['社員', 'しゃいん'], ['医者', 'いしゃ'], ['銀行員', 'ぎんこういん'], ['花火', 'はなび'], ['旅行', 'りょこう'], ['映画', 'えいが'], ['読書', 'どくしょ'], ['音楽', 'おんがく'], ['料理', 'りょうり'], ['写真', 'しゃしん'], ['買い物', 'かいもの'], ['水泳', 'すいえい'], ['趣味', 'しゅみ'], ['誕生日', 'たんじょうび'], ['名前', 'なまえ'], ['仕事', 'しごと'], ['私', 'わたし'], ['中国', 'ちゅうごく'], ['韓国', 'かんこく'], ['日本', 'にほん'], ['人', 'じん'], ['二十歳', 'はたち'], ['火曜日', 'かようび'], ['月曜日', 'げつようび'], ['水曜日', 'すいようび'], ['木曜日', 'もくようび'], ['金曜日', 'きんようび'], ['土曜日', 'どようび'], ['日曜日', 'にちようび'], ['友達', 'ともだち'], ['学校', 'がっこう'], ['今', 'いま'], ['午前', 'ごぜん'], ['午後', 'ごご'], ['時計', 'とけい'], ['英語', 'えいご'], ['野菜', 'やさい'], ['財布', 'さいふ'], ['公園', 'こうえん'], ['携帯電話', 'けいたいでんわ'], ['電話', 'でんわ'], ['辞書', 'じしょ'], ['図書館', 'としょかん'], ['郵便局', 'ゆうびんきょく'], ['銀行', 'ぎんこう'], ['病院', 'びょういん'], ['体育館', 'たいいくかん'], ['会社', 'かいしゃ'], ['毎日', 'まいにち'], ['毎朝', 'まいあさ'], ['毎晩', 'まいばん'], ['夏休み', 'なつやすみ'], ['冬休み', 'ふゆやすみ'], ['休みの日', 'やすみのひ'], ['休み', 'やすみ'], ['勉強', 'べんきょう'], ['食べ', 'たべ'], ['飲み', 'のみ'], ['見ま', 'みま'], ['行き', 'いき'], ['読み', 'よみ'], ['帰り', 'かえり'], ['寝ま', 'ねま'], ['起き', 'おき'], ['働き', 'はたらき'], ['買い', 'かい'], ['聞き', 'きき'], ['書き', 'かき'], ['ご飯', 'ごはん'], ['御飯', 'ごはん'], ['卵', 'たまご'], ['魚', 'さかな'], ['牛肉', 'ぎゅうにく'], ['豚肉', 'ぶたにく'], ['お茶', 'おちゃ'], ['水', 'みず'], ['家', 'うち'], ['朝', 'あさ'], ['夜', 'よる'], ['本', 'ほん'], ['何', 'なに'], ['円', 'えん'], ['階', 'かい'], ['歳', 'さい'], ['才', 'さい'], ['時', 'じ'], ['分', 'ふん'], ['半', 'はん']].sort( (a, b) => b[0].length - a[0].length);
            /* thêm từ vựng: danh từ/tính từ đầy đủ (KANJI) và gốc động từ／tính từ có okurigana (VS) */
            if (CFG.kx && CFG.kx.length) {
                const have = new Set(KANJI.map(x => x[0]));
                CFG.kx.forEach(x => {
                    if (!have.has(x[0])) {
                        KANJI.push(x);
                        have.add(x[0])
                    }
                }
                );
                KANJI.sort( (a, b) => b[0].length - a[0].length)
            }
            const VS = Object.assign({}, CFG.vs || {});
            const VSRX = Object.keys(VS).length ? new RegExp('(?<![一-龯々])([' + Object.keys(VS).join('') + '])(?=[ぁ-ん])','g') : null;
            const KN = {
                '〇': 0,
                '一': 1,
                '二': 2,
                '三': 3,
                '四': 4,
                '五': 5,
                '六': 6,
                '七': 7,
                '八': 8,
                '九': 9
            };
            function kanjiNum(t) {
                return t.replace(/(?<!\d)([〇一二三四五六七八九十百千万]+)(?=月|日|歳|才|さい|がつ|にち|時|分|階|円|つ|ドル|ドン)/g, m => {
                    let v = 0
                      , cur = 0;
                    const U = {
                        '十': 10,
                        '百': 100,
                        '千': 1000
                    };
                    for (const c of m) {
                        if (c in KN)
                            cur = cur * 10 + KN[c];
                        else if (U[c]) {
                            v += (cur || 1) * U[c];
                            cur = 0
                        } else if (c === '万') {
                            v = (v + cur || 1) * 10000;
                            cur = 0
                        }
                    }
                    return String(v + cur)
                }
                )
            }
            const D1 = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
            function monthK(n) {
                const m = {
                    1: 'いち',
                    2: 'に',
                    3: 'さん',
                    4: 'し',
                    5: 'ご',
                    6: 'ろく',
                    7: 'しち',
                    8: 'はち',
                    9: 'く',
                    10: 'じゅう',
                    11: 'じゅういち',
                    12: 'じゅうに'
                };
                return m[n] ? m[n] + 'がつ' : null
            }
            function dayK(n) {
                const sp = {
                    1: 'ついたち',
                    2: 'ふつか',
                    3: 'みっか',
                    4: 'よっか',
                    5: 'いつか',
                    6: 'むいか',
                    7: 'なのか',
                    8: 'ようか',
                    9: 'ここのか',
                    10: 'とおか',
                    14: 'じゅうよっか',
                    20: 'はつか',
                    24: 'にじゅうよっか'
                };
                if (sp[n])
                    return sp[n];
                if (n < 1 || n > 31)
                    return null;
                const t = Math.floor(n / 10)
                  , o = n % 10;
                const od = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'しち', 'はち', 'く'];
                return (['', 'じゅう', 'にじゅう', 'さんじゅう'][t]) + od[o] + 'にち'
            }
            function ageK(n) {
                if (n == 20)
                    return 'はたち';
                if (n < 1 || n > 99)
                    return null;
                const t = Math.floor(n / 10)
                  , o = n % 10;
                const un = ['', 'いっ', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はっ', 'きゅう'];
                if (o == 0)
                    return (t == 1 ? 'じゅっ' : D1[t] + 'じゅっ') + 'さい';
                const tp = t == 0 ? '' : (t == 1 ? 'じゅう' : D1[t] + 'じゅう');
                return tp + un[o] + 'さい'
            }
            function hourK(n) {
                const h = {
                    1: 'いち',
                    2: 'に',
                    3: 'さん',
                    4: 'よ',
                    5: 'ご',
                    6: 'ろく',
                    7: 'しち',
                    8: 'はち',
                    9: 'く',
                    10: 'じゅう',
                    11: 'じゅういち',
                    12: 'じゅうに'
                };
                return h[n] ? h[n] + 'じ' : null
            }
            function minK(n) {
                if (n < 0 || n > 99)
                    return null;
                const t = Math.floor(n / 10)
                  , o = n % 10;
                const u = ['', 'いっぷん', 'にふん', 'さんぷん', 'よんぷん', 'ごふん', 'ろっぷん', 'ななふん', 'はっぷん', 'きゅうふん'];
                if (o == 0)
                    return t == 0 ? '' : (t == 1 ? '' : D1[t]) + 'じゅっぷん';
                const tp = t == 0 ? '' : (t == 1 ? 'じゅう' : D1[t] + 'じゅう');
                return tp + u[o]
            }
            function kaiK(n) {
                const m = {
                    1: 'いっかい',
                    2: 'にかい',
                    3: 'さんがい',
                    4: 'よんかい',
                    5: 'ごかい',
                    6: 'ろっかい',
                    7: 'ななかい',
                    8: 'はっかい',
                    9: 'きゅうかい',
                    10: 'じゅっかい'
                };
                return m[n] || null
            }
            function numK(n) {
                // 0 < n < 100,000,000
                if (n <= 0)
                    return '';
                let s = '';
                const man = Math.floor(n / 10000)
                  , r = n % 10000;
                if (man) {
                    s += (man === 1 ? 'いち' : numK(man)) + 'まん'
                }
                const th = Math.floor(r / 1000)
                  , h = Math.floor(r % 1000 / 100)
                  , te = Math.floor(r % 100 / 10)
                  , o = r % 10;
                if (th)
                    s += th === 1 ? 'せん' : th === 3 ? 'さんぜん' : th === 8 ? 'はっせん' : D1[th] + 'せん';
                if (h)
                    s += h === 1 ? 'ひゃく' : h === 3 ? 'さんびゃく' : h === 6 ? 'ろっぴゃく' : h === 8 ? 'はっぴゃく' : D1[h] + 'ひゃく';
                if (te)
                    s += te === 1 ? 'じゅう' : D1[te] + 'じゅう';
                if (o)
                    s += D1[o];
                return s
            }
            function tsuK(n) {
                return ['', 'ひとつ', 'ふたつ', 'みっつ', 'よっつ', 'いつつ', 'むっつ', 'ななつ', 'やっつ', 'ここのつ', 'とお'][n] || null
            }
            /* ---------- Romaji → hiragana (nhận Romaji kiểu Hepburn/Kunrei) ---------- */
            const VR = {
                'あ': 'あかさたなはまやらわがざだばぱぁゃ',
                'い': 'いきしちにひみりぎじぢびぴぃ',
                'う': 'うくすつぬふむゆるぐずづぶぷぅゅ',
                'え': 'えけせてねへめれげぜでべぺぇ',
                'お': 'おこそとのほもよろをごぞどぼぽぉょ'
            };
            const vowelOf = c => {
                for (const k in VR)
                    if (VR[k].includes(c))
                        return k;
                return ''
            }
            ;
            const lenFix = s => s.replace(/([ぁ-ゖ])ー/g, (m, p) => p + (vowelOf(p) || 'ー'));
            const RM = ( () => {
                const m = {};
                const v = 'aiueo';
                const rows = {
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
                    p: 'ぱぴぷぺぽ'
                };
                for (const c in rows)
                    [...v].forEach( (x, i) => m[c + x] = rows[c][i]);
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
                    we: 'うぇ'
                });
                for (const [c,k] of Object.entries({
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
                    dy: 'ぢ'
                })) {
                    m[c + 'a'] = k + 'ゃ';
                    m[c + 'u'] = k + 'ゅ';
                    m[c + 'o'] = k + 'ょ'
                }
                return m
            }
            )();
            function romaToKana(t) {
                t = t.toLowerCase().replace(/ā/g, 'aa').replace(/ī/g, 'ii').replace(/ū/g, 'uu').replace(/ē/g, 'ee').replace(/ō/g, 'ou');
                let o = ''
                  , i = 0;
                while (i < t.length) {
                    const c = t[i];
                    if (c === '-') {
                        o += 'ー';
                        i++;
                        continue
                    }
                    if (c === "'" || c === '’') {
                        i++;
                        continue
                    }
                    if (c === 'n') {
                        const nx = t[i + 1];
                        if (!nx || !'aiueoy'.includes(nx)) {
                            o += 'ん';
                            i++;
                            continue
                        }
                    }
                    if (i + 1 < t.length && t[i] === t[i + 1] && !'aiueon'.includes(c)) {
                        o += 'っ';
                        i++;
                        continue
                    }
                    if (t.startsWith('tch', i)) {
                        o += 'っ';
                        i++;
                        continue
                    }
                    let hit = false;
                    for (const L of [3, 2, 1]) {
                        const k = t.substr(i, L);
                        if (RM[k]) {
                            o += RM[k];
                            i += L;
                            hit = true;
                            break
                        }
                    }
                    if (!hit)
                        return null;
                }
                return o;
            }
            function romajiText(s) {
                if (!/[A-Za-zāīūēōĀĪŪĒŌ]/.test(s))
                    return s;
                return s.replace(/[A-Za-zāīūēōĀĪŪĒŌ'’\-]+/g, tok => {
                    if (!/[A-Za-zāīūēōĀĪŪĒŌ]/.test(tok))
                        return tok;
                    const l = tok.toLowerCase();
                    if (l === 'wa' || l === 'ha')
                        return 'は';
                    if (l === 'e' || l === 'he')
                        return 'へ';
                    if (l === 'o' || l === 'wo')
                        return 'を';
                    const k = romaToKana(tok);
                    return k == null ? tok : k
                }
                );
            }
            function norm(s) {
                s = String(s || '').normalize('NFKC');
                s = romajiText(s);
                s = s.replace(/時間半/g, '時かんはん').replace(/時間/g, '時かん');
                for (const [k,v] of KANJI) {
                    if (k === '時' || k === '分' || k === '円' || k === '階' || k === '歳' || k === '才' || k === '半')
                        continue;
                    s = s.split(k).join(v)
                }
                if (VSRX)
                    s = s.replace(VSRX, (m, k) => VS[k]);
                s = kanjiNum(s);
                s = s.replace(/(\d+)\s*千/g, (m, n) => String(+n * 1000)).replace(/(\d+)\s*百/g, (m, n) => String(+n * 100));
                s = s.replace(/(\d{1,2})[:：](\d{2})/g, (m, h, mi) => (hourK(+h) || m) + (+mi ? minK(+mi) : ''));
                s = s.replace(/(\d+)\s*分(?!間)/g, (m, n) => {
                    n = +n;
                    if (n < 60)
                        return m;
                    const h = Math.floor(n / 60)
                      , r = n % 60;
                    return (hourK(h) || h + 'じ') + 'かん' + (r === 30 ? 'はん' : (r ? r + '分' : ''))
                }
                );
                s = s.replace(/(\d{1,2})\s*(?:時|じ)\s*半/g, (m, h) => (hourK(+h) || m) + 'はん').replace(/(\d{1,2})\s*(?:時|じ)/g, (m, h) => hourK(+h) || m).replace(/(\d{1,2})\s*(?:分|ふん|ぷん)/g, (m, n) => minK(+n) || m);
                s = s.replace(/(\d+)\s*(?:歳|才|さい)/g, (m, n) => ageK(+n) || m).replace(/(\d+)\s*(?:月|がつ)/g, (m, n) => monthK(+n) || m).replace(/(\d+)\s*(?:日|にち)/g, (m, n) => dayK(+n) || m);
                s = s.replace(/(\d+)\s*(?:階|かい|がい)/g, (m, n) => kaiK(+n) || m);
                s = s.replace(/(\d+)\s*つ/g, (m, n) => tsuK(+n) || m);
                s = s.replace(/(\d{1,3}(?:,\d{3})+|\d+)(?=\s*(?:円|えん|ドル|ドン|どる|どん))/g, (m, n) => numK(+n.replace(/,/g, '')) || m).replace(/円/g, 'えん');
                s = s.replace(/(\d+)\s*万/g, (m, n) => numK(+n) + 'まん');
                s = s.replace(/じかんさんじゅっぷん/g, 'じかんはん');
                s = s.toLowerCase().replace(/[\s、。，．,.!！?？「」『』（）()〜~・…]/g, '');
                return lenFix(s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)));
            }

            /* ---------- giọng đọc ---------- */
            let voices = []
              , jpVoice = null
              , spkTok = 0;
            function vScore(v) {
                const n = (v.name || '').toLowerCase();
                let s = 0;
                if (/online|natural|neural/.test(n))
                    s += 60;
                if (/nanami|keita|aoi|mayu|daichi|naoki|shiori/.test(n))
                    s += 15;
                if (/google/.test(n))
                    s += 40;
                if (/premium|enhanced|siri/.test(n))
                    s += 35;
                if (/kyoko|otoya|o-ren|hattori/.test(n))
                    s += 10;
                if (/haruka|ayumi|ichiro|sayaka|zira/.test(n))
                    s -= 5;
                if (!v.localService)
                    s += 5;
                return s
            }
            function pickVoice() {
                try {
                    voices = speechSynthesis.getVoices().filter(x => /^ja/i.test(x.lang)).sort( (a, b) => vScore(b) - vScore(a));
                    jpVoice = voices.find(x => x.voiceURI === store._voice) || voices[0] || null;
                    renderVoiceBar()
                } catch (e) {}
            }
            function renderVoiceBar() {
                const sel = $('#voiceSel');
                if (!sel)
                    return;
                sel.innerHTML = voices.map(v => `<option value="${esc(v.voiceURI)}"${jpVoice && v.voiceURI === jpVoice.voiceURI ? ' selected' : ''}>${esc(v.name)}</option>`).join('');
                $('#voiceSel').hidden = !voices.length;
                $('#voiceTest').hidden = !voices.length;
                $('#voiceHint').textContent = voices.length ? 'Nếu giọng nghe còn máy móc, thử chọn giọng khác. Giọng có chữ Online, Natural hoặc Google thường tự nhiên hơn. Chrome và Edge thường có giọng tốt nhất.' : 'Máy này chưa có giọng tiếng Nhật. Em mở bằng Chrome hoặc Edge, hoặc cài thêm giọng tiếng Nhật trong cài đặt của máy. Phần đọc câu hỏi vẫn có nút “Hiện chữ”.';
            }
            function stopSpeak() {
                spkTok++;
                try {
                    speechSynthesis.cancel()
                } catch (e) {}
            }
            /* đọc từng câu một: ngắt nghỉ đều, mỗi câu tự có ngữ điệu cuối câu riêng */
            function speakSeq(sents, o) {
                o = o || {};
                if (!('speechSynthesis' in window))
                    return false;
                stopSpeak();
                const tok = spkTok;
                let i = 0;
                const slow = !!o.slow;
                const next = () => {
                    if (tok !== spkTok)
                        return;
                    if (i >= sents.length) {
                        o.onEnd && o.onEnd(true);
                        return
                    }
                    const idx = i++;
                    const u = new SpeechSynthesisUtterance(sents[idx]);
                    u.lang = 'ja-JP';
                    if (jpVoice)
                        u.voice = jpVoice;
                    u.rate = slow ? 0.68 : 0.88;
                    u.pitch = 1;
                    u.onstart = () => {
                        if (tok === spkTok)
                            o.onStart && o.onStart(idx)
                    }
                    ;
                    u.onend = () => {
                        if (tok === spkTok)
                            setTimeout(next, idx < sents.length - 1 ? (slow ? 500 : 300) : 0)
                    }
                    ;
                    u.onerror = e => {
                        if (tok === spkTok && e.error !== 'interrupted' && e.error !== 'canceled')
                            o.onEnd && o.onEnd(false)
                    }
                    ;
                    try {
                        speechSynthesis.speak(u)
                    } catch (e) {
                        o.onEnd && o.onEnd(false)
                    }
                }
                ;
                setTimeout(next, 80);
                return true;
            }
            /* câu hỏi kết thúc bằng か thì thêm ？ để giọng đọc lên giọng cuối câu */
            function qSents(t) {
                return String(t).replace(/[「」]/g, '').split(/(?<=[。？?])/).map(x => x.trim()).filter(Boolean).map(x => {
                    x = x.replace(/[。？?]+$/, '');
                    return /か$/.test(x) ? x + '？' : x + '。'
                }
                )
            }
            function speak(t, slow) {
                return speakSeq(qSents(t), {
                    slow
                })
            }

            /* ---------- chấm câu có tranh ---------- */
            const OK_END = CFG.code === 'JPD113' ? /(です|ます|でした|ました|ません|ください)$/ : /(です|ます|でした|ました|ません|ください|から|ましょう|ましょうか)(ね|よ)?$/;
            const PART = 'をへにがのとやは';
            const SAME = {
                'へ': 'へに',
                'に': 'へに',
                'や': 'やと',
                'と': 'やと'
            };
            const penOf = code => {
                const sc = DATA.scale[code];
                const m = sc && String(sc.pen).match(/(\d+(?:[.,]\d+)?)/);
                return m ? parseFloat(m[1].replace(',', '.')) : 3
            }
            ;
            function has(u, w) {
                let i = -1;
                while ((i = u.indexOf(w, i + 1)) >= 0) {
                    const p = u.slice(Math.max(0, i - 3), i);
                    if (w === 'くじ' && p.endsWith('ろ'))
                        continue;
                    if ((w === 'にじ' || w === 'いちじ' || w === 'ごじ') && p.endsWith('じゅう'))
                        continue;
                    return i
                }
                return -1
            }
            function lev(a, b) {
                const m = a.length
                  , n = b.length;
                const d = Array.from({
                    length: m + 1
                }, (_, i) => [i]);
                for (let j = 1; j <= n; j++)
                    d[0][j] = j;
                for (let i = 1; i <= m; i++)
                    for (let j = 1; j <= n; j++)
                        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
                return d[m][n]
            }
            function fuzzy(u, w) {
                if (w.length < 4)
                    return -1;
                for (const L of [w.length - 1, w.length, w.length + 1])
                    for (let i = 0; i + L <= u.length; i++)
                        if (lev(u.slice(i, i + L), w) <= 1)
                            return i;
                return -1
            }
            const UNIT = /(えん|どる|どん|がい|かい|さい|じ|ふん|ぷん|がつ|にち|つ)$/;
            const ALT7 = {
                'くじ': ['きゅうじ'],
                'じゅっぷん': ['じゅうぷん', 'じゅうふん', 'じゅっふん'],
                'じっぷん': ['じゅうぷん']
            };
            const lastTok = a => String(a || '').trim().split(/\s+/).pop().replace(/[。.]$/, '');
            const partOf = r => {
                const c = r[0];
                if (!c)
                    return null;
                if (c === 'で' && !/^(です|では|でし|でも)/.test(r))
                    return 'で';
                return PART.includes(c) ? c : null
            }
            ;
            const MARK = g => g.length === 1 && (g[0] === 'ごぜん' || g[0] === 'ごご');
            let _lex = null;
            const LEXW = () => _lex || (_lex = [...new Set(CFG.bais.flatMap(b => (DATA.bai[b] ? DATA.bai[b].pic : []).flatMap(q => (q.j.need || []).flat().map(norm))))].filter(w => w.length >= 2 && !/さん$/.test(w) && !/(ます|ません|ました|ています|です|ほう)$/.test(w) && !['はい', 'いいえ', 'ある', 'いる', 'する', 'して', 'できる'].includes(w)));
            const repOK = (u, r) => {
                if (/^re:/.test(r)) {
                    try {
                        return new RegExp(r.slice(3)).test(u)
                    } catch (e) {
                        return false
                    }
                }
                const n = norm(r)
                  , st = n.replace(/(ませんでした|ました|ません|ます)$/, '');
                return u.includes(n) || (st.length >= 2 && u.includes(st))
            }
            ;
            const PARTMAP = {
                'わ': 'は',
                'え': 'へ',
                'お': 'を'
            };
            function fixParticles(q, u) {
                if (!/[わえお]/.test(u))
                    return u;
                if (!q._ctx) {
                    const ctx = new Set();
                    [q.a1, q.a2, ...((q.j && q.j.accept) || [])].filter(Boolean).map(norm).forEach(s => {
                        for (let i = 1; i < s.length; i++) {
                            const c = s[i];
                            if (c === 'は' || c === 'へ' || c === 'を')
                                ctx.add(s.slice(Math.max(0, i - 2), i) + c)
                        }
                    }
                    );
                    q._ctx = ctx
                }
                let o = '';
                for (let i = 0; i < u.length; i++) {
                    const c = u[i]
                      , p = PARTMAP[c];
                    o += (p && i > 0 && q._ctx.has(u.slice(Math.max(0, i - 2), i) + p)) ? p : c
                }
                return o;
            }
            const ynTruth = t => t === 'yes' || t === 'no' ? t : (/^はい/.test(t || '') ? 'yes' : /^いいえ/.test(t || '') ? 'no' : null);
            const PAST = /(ました|ませんでした|でした|かったです|くなかったです)(ね|よ)?$/
              , PRES = /(ます|ません|です)(ね|よ)?$/;
            function gradePic(q, text, skip) {
                const u0 = norm(text);
                const u = fixParticles(q, u0);
                const L = q.lad;
                const j = q.j;
                const row = (code, why) => {
                    const r = L.find(x => x.c === code);
                    if (r)
                        return {
                            c: code,
                            pen: 15 - r.s,
                            why: r.why,
                            hint: r.hint
                        };
                    const sc = DATA.scale[code] || {};
                    return {
                        c: code,
                        pen: penOf(code),
                        why: why || sc.name || '',
                        hint: sc.ex || ''
                    }
                }
                ;
                const done = (arr) => {
                    const zero = arr.some(x => x.c === 'R0' || x.c === 'R1' || x.c === 'R2');
                    const pen = arr.reduce( (a, x) => a + x.pen, 0);
                    const s = zero ? 0 : Math.max(0, Math.round((15 - pen) * 10) / 10);
                    return {
                        s,
                        p: Math.round(s / 15 * 100),
                        items: arr,
                        zero
                    }
                }
                ;
                const full = () => {
                    const r = L.find(x => x.s === 15);
                    return {
                        s: 15,
                        p: 100,
                        items: [],
                        ok: r.hint
                    }
                }
                ;
                if (!u || /^(わかりません|わからない|しらない)/.test(u))
                    return done([row('R0')]);
                if (!skip) {
                    for (const r of L) {
                        if (r.a && r.a[0] !== '(' && (norm(r.a) === u || norm(r.a) === u0)) {
                            if (r.s === 15)
                                return full();
                            const z = r.c === 'R0' || r.c === 'R1' || r.c === 'R2';
                            return {
                                s: z ? 0 : r.s,
                                p: z ? 0 : Math.round(r.s / 15 * 100),
                                items: [{
                                    c: r.c,
                                    pen: 15 - r.s,
                                    why: r.why,
                                    hint: r.hint
                                }],
                                zero: z
                            }
                        }
                    }
                    if ((j.accept || []).some(a => norm(a) === u || norm(a) === u0))
                        return full()
                }
                if (L.some(x => x.c === 'R9b') && /^(はい|ええ|いいえ)?(そうです|ちがいます|そうじゃありません)?$/.test(u) && /^(はい|ええ|いいえ|そう|ちがい)/.test(u))
                    return done([row('R9b')]);
                const needs = (j.need || []).map(g => g.map(norm));
                const predTok = [lastTok(q.a1), lastTok(q.a2)].map(norm).filter(Boolean);
                const isPred = w => predTok.some(p => {
                    const st = p.replace(/(ませんでした|ました|ません|ます)$/, '');
                    return p.includes(w) || (st.length >= 2 && w.includes(st))
                }
                );
                const samples = [q.a1, q.a2, ...(j.accept || []), ...L.filter(x => x.s === 15 && x.a && x.a[0] !== '(').map(x => x.a)].map(norm);
                if (j.kind === 'YN') {
                    const tv = ynTruth(j.truth);
                    if (tv) {
                        const yes = /^(はい|ええ|うん|そう)/.test(u)
                          , no = /^(いいえ|いえ|ちがい)/.test(u);
                        if (!yes && !no)
                            return done([row('R3')]);
                        if (yes !== (tv === 'yes'))
                            return done([row('R2')]);
                        if (!needs.length)
                            return OK_END.test(u) ? full() : done([row('R4')]);
                    }
                }
                if (!needs.length)
                    return done([row('R2')]);
                const items = [];
                const add = (code, why) => {
                    if (!items.some(x => x.c === code))
                        items.push(row(code, why))
                }
                ;
                const pos = needs.map(g => {
                    for (const w of g) {
                        const i = has(u, w);
                        if (i >= 0)
                            return {
                                i,
                                w,
                                len: w.length
                            }
                    }
                    return null
                }
                );
                const TENSE = w => /ます$/.test(w) ? [w.slice(0, -2) + 'ました'] : /です$/.test(w) ? [w.slice(0, -2) + 'でした'] : /ました$/.test(w) ? [w.slice(0, -3) + 'ます'] : /でした$/.test(w) ? [w.slice(0, -3) + 'です'] : [];
                if (CFG.code !== 'JPD113')
                    needs.forEach( (g, k) => {
                        if (pos[k])
                            return;
                        for (const w of g) {
                            for (const alt of TENSE(w)) {
                                const i = has(u, alt);
                                if (i >= 0) {
                                    pos[k] = {
                                        i,
                                        w: alt,
                                        len: alt.length
                                    };
                                    return
                                }
                            }
                        }
                    }
                    );
                needs.forEach( (g, k) => {
                    if (pos[k])
                        return;
                    for (const w of g) {
                        for (const alt of (ALT7[w] || [])) {
                            const i = has(u, alt);
                            if (i >= 0) {
                                pos[k] = {
                                    i,
                                    w: alt,
                                    len: alt.length
                                };
                                add('R7a');
                                return
                            }
                        }
                    }
                }
                );
                // gần đúng (đọc sai nhẹ) chỉ cho từ hiragana: coi như có, trừ R7a
                needs.forEach( (g, k) => {
                    if (pos[k])
                        return;
                    for (let wi = 0; wi < g.length; wi++) {
                        const w = g[wi];
                        if (/[ァ-ヶ一-龯]/.test((j.need[k] || [])[wi] || ''))
                            continue;
                        const i = fuzzy(u, w);
                        if (i >= 0) {
                            pos[k] = {
                                i,
                                w,
                                len: w.length
                            };
                            add('R7a');
                            break
                        }
                    }
                }
                );
                const miss = needs.map( (g, k) => pos[k] ? -1 : k).filter(k => k >= 0);
                if (miss.length === needs.length) {
                    const vb = lastTok(q.a1);
                    if (vb && u === norm(vb) && /(ます|ません)$/.test(vb))
                        return done([row('R6b', 'Thiếu một thông tin theo tranh')]);
                    const stemOK = needs.length === 1 && needs[0].some(w => {
                        const m = w.match(UNIT);
                        return m && w.length - m[0].length >= 2 && u.includes(w.slice(0, w.length - m[0].length))
                    }
                    );
                    if (!stemOK)
                        return done([row('R2')]);
                }
                if (miss.length) {
                    const found = pos.filter(Boolean).map(p => p.w);
                    let rest = u;
                    found.forEach(w => {
                        rest = rest.replace(w, '')
                    }
                    );
                    const mm = miss.filter(k => !MARK(needs[k]));
                    if (!mm.length)
                        add('R6b', 'Thiếu một thông tin theo tranh');
                    else {
                        const unitMiss = mm.some(k => {
                            const w = needs[k][0];
                            const m = w.match(UNIT);
                            return m && w.length - m[0].length >= 2 && u.includes(w.slice(0, w.length - m[0].length))
                        }
                        );
                        const wrongVal = mm.some(k => {
                            const m = needs[k][0].match(UNIT);
                            if (!m)
                                return false;
                            const eq = (m[0] === 'ぷん' || m[0] === 'ふん') ? ['ぷん', 'ふん'] : [m[0]];
                            return eq.some(x => rest.includes(x))
                        }
                        );
                        const own = needs.flat();
                        const wrongLex = LEXW().some(w => rest.includes(w) && !own.some(n => n.includes(w) || w.includes(n)));
                        const verbAns = /(ませんでした|ました|ません|ます)$/.test(samples[0]);
                        const predMiss = verbAns && OK_END.test(u) && /です(ね|よ)?$/.test(u);
                        const predBare = !OK_END.test(u) && mm.every(k => needs[k].some(isPred));
                        const hoMiss = mm.some(k => needs[k].includes('ほう')) && OK_END.test(u) && (L.some(x => x.c === 'R5g') || DATA.scale.R5g);
                        if (unitMiss)
                            add('R6a');
                        else if (hoMiss)
                            add('R5g');
                        else if (predMiss && (L.some(x => x.c === 'R5f') || DATA.scale.R5f))
                            add('R5f');
                        else if (wrongVal || wrongLex)
                            add('R2');
                        else if (predBare && (L.some(x => x.c === 'R4') || DATA.scale.R4))
                            add('R4');
                        else
                            add('R6b', 'Thiếu một thông tin theo tranh');
                    }
                    return done(items);
                }
                // thứ tự giờ（から–まで）
                if (/^(HOURS|KHOANG|TIME)/.test(j.typ || '')) {
                    const sm = norm(q.a1);
                    const order = needs.map( (g, k) => ({
                        k,
                        i: g.map(w => sm.indexOf(w)).find(x => x >= 0)
                    })).filter(x => x.i !== undefined).sort( (a, b) => a.i - b.i).map(x => x.k);
                    const vals = order.filter(k => !MARK(needs[k]));
                    const inv = (arr) => arr.some( (k, t) => t && pos[k].i < pos[arr[t - 1]].i);
                    if (inv(vals))
                        return done([row('R2')]);
                    if (inv(order))
                        add('R2b');
                }
                if (j.typ === 'ORDER' && needs.length === 4) {
                    const P = pos.map(p => p.i);
                    const A = [Math.min(P[0], P[1]), Math.max(P[0], P[1])]
                      , Bq = [Math.min(P[2], P[3]), Math.max(P[2], P[3])];
                    if (!(A[1] < Bq[0] || Bq[1] < A[0]))
                        return done([row('R2')])
                }
                if (/じん/.test(u) && L.some(x => x.c === 'R11'))
                    add('R11');
                // trợ từ so với câu mẫu

                const allowed = new Set();
                needs.forEach(g => samples.forEach(sm => {
                    for (const w of g) {
                        const i = sm.indexOf(w);
                        if (i >= 0) {
                            const pc = partOf(sm.slice(i + w.length));
                            if (pc) {
                                allowed.add(pc);
                                (SAME[pc] || '').split('').forEach(x => allowed.add(x))
                            }
                        }
                    }
                }
                ));
                if (allowed.size) {
                    const starts = needs.flat();
                    needs.forEach( (g, k) => {
                        const {i, w} = pos[k];
                        const c = u[i + w.length];
                        const rest = u.slice(i + w.length);
                        if (/^(ね|よ)?$/.test(rest))
                            return;
                        const pc = partOf(rest);
                        if (pc) {
                            if (!allowed.has(pc) && !/^も/.test(rest.slice(1)))
                                add('R5b')
                        } else if (c && !starts.some(x => rest.startsWith(x)) && !rest.startsWith('から') && !rest.startsWith('ください') && !rest.startsWith('と') && !rest.startsWith('まで') && !rest.startsWith('も') && !OK_END.test(rest) && ![...allowed].some(x => rest.includes(x)) && !/^(さん|いん|たち|ちゃん|くん|じん)/.test(rest) && !samples.some(sm => sm.includes(w + rest)))
                            add('R5a')
                        else if (c && OK_END.test(rest) && rest.length <= 4 && !rest.startsWith('です') && !rest.startsWith('ます') && !rest.startsWith('ください') && !/^(さん|いん|たち|ちゃん|くん|じん)/.test(rest) && !isPred(w) && !samples.some(sm => sm.includes(w + rest)))
                            add('R5a')
                    }
                    );
                    // ví dụ: テレビみます (thiếu を)
                    if (!items.some(x => x.c === 'R5a' || x.c === 'R5b')) {
                        const last = pos[pos.length - 1];
                        const rest = u.slice(last.i + last.len);
                        if (rest && /^(み|た|の|よ|い|し|べ|か|お|ね|は)/.test(rest) && /ます|ません/.test(rest) && ![...allowed].some(x => rest.startsWith(x)) && !isPred(last.w) && !samples.some(sm => sm.includes(last.w + rest)))
                            add('R5a')
                    }
                }
                const a = samples[0];
                if (/から/.test(a) && !u.includes('から'))
                    add('R5a', 'Thiếu から');
                if (/まで/.test(a) && !u.includes('まで'))
                    add('R5a', 'Thiếu まで');
                if (L.some(x => x.c === 'R9') && /(ます|ません)$/.test(a) && /です$/.test(u) && !/(ます|ません)/.test(u))
                    return done([row('R9')]);
                if (j.rep && j.rep.length && OK_END.test(u) && !j.rep.some(r => repOK(u, r)) && (L.some(x => x.c === 'R5f') || DATA.scale.R5f))
                    add('R5f');
                if (L.some(x => x.c === 'R5e') || DATA.scale.R5e) {
                    const qs = norm(q.read || '');
                    const qPast = /(ました|ませんでした|でした|かったです)か$/.test(qs)
                      , qPres = /(ます|ません)か$|(?<!でした)です?か$/.test(qs) && !qPast;
                    if (!/(まだ|もう)/.test(u) && ((qPast && PRES.test(u) && !PAST.test(u)) || (qPres && PAST.test(u))))
                        add('R5e')
                }
                if (!OK_END.test(u))
                    add('R4');
                return items.length ? done(items) : full();
            }
            function labelOf(p) {
                return p >= 93 ? ['Rất tốt', 't-good'] : p >= 80 ? ['Khá ổn, chỉ cần sửa nhỏ', 't-mid'] : p >= 60 ? ['Cần chỉnh thêm', 't-mid'] : ['Chưa đạt, nghe lại và thử lần nữa', 't-low']
            }

            /* ---------- tự soát câu không tranh (theo chủ đề L01–L14) ---------- */
            const COUNTRY = ['ベトナム', 'にほん', 'ちゅうごく', 'かんこく', 'アメリカ', 'イタリア', 'オーストラリア', 'ロシア', 'タイ', 'ブラジル', 'フランス', 'ドイツ', 'インド', 'イギリス', 'スペイン', 'カナダ'].map(norm);
            const JOBS = ['がくせい', 'せんせい', 'きょうし', 'かいしゃいん', 'しゃいん', 'だいがく', 'fptだいがく', 'いしゃ', 'かんごし', 'エンジニア', 'ぎんこういん', 'こうむいん', 'てんいん'].map(norm);
            const HOBBY = ['サッカー', 'テニス', 'すいえい', 'えいが', 'おんがく', 'どくしょ', 'りょこう', 'りょうり', 'スポーツ', 'しゃしん', 'かいもの', 'ゲーム', 'バスケットボール', 'バレーボール', 'うた', 'ダンス', 'さんぽ', 'ジョギング'].map(norm);
            const BRAND = ['サムスン', 'アップル', 'デル', 'カシオ', 'ナイキ', 'ソニー', 'トヨタ', 'ホンダ', 'アディダス', 'ベトナム', 'にほん', 'アメリカ', 'ちゅうごく', 'かんこく', 'タイ', 'ドイツ', 'フランス', 'イタリア'].map(norm);
            const anyIn = (u, l) => l.some(w => u.includes(w));
            const DAYW = /(ついたち|ふつか|みっか|よっか|いつか|むいか|なのか|ようか|ここのか|とおか|はつか|にち)/;
            const VERB = /(ます|ません)$/;
            const ENDOK = u => /(です|ます|ません|ました|でした)$/.test(u);
            const okEnd = u => OK_END.test(u) || /(から|ちょっと|ましょう|ですね|ますね|ください|ですよ|ますよ)$/.test(u);
            const SIGS = ['ています', 'ていません', 'ましょう', 'ませんでした', 'ました', 'ません', 'ます', 'かったです', 'くないです', 'じゃありません', 'でした', 'たいです', 'ほしいです', 'ことができ', 'ことです', 'のほうが', 'いちばん', 'たり', 'にいきます', 'くなります', 'になります', 'ですから', 'ましたから', 'から', 'もう', 'まだ', 'よく', 'あまり', 'ぜんぜん', 'ときどき', 'いつも', 'て、', 'くて', 'なひと', 'ひとです', 'ところです', 'まちです', 'です'];
            const COUNTQ = [[/なんにん/, /(にん|ひとり|ふたり)/], [/なんさい/, /(さい|はたち)/], [/なんかい/, /かい/], [/なんびき/, /(ひき|ぴき|びき)/], [/なんがつ/, /がつ/], [/いくら/, /(えん|どる)/], [/なんじ/, /じ/], [/どのくらい/, /(じかん|ふん|ぷん|くらい)/], [/ごはんをたべ|なんぼん|なんまい/, /./]];
            function genericFree(q, u) {
                const qs = norm(q.cau_hoi_doc || '');
                let info = u.replace(/(です|ます|ました|ません)/g, '').length >= 2;
                for (const [a,b] of COUNTQ)
                    if (a.test(qs)) {
                        info = info && b.test(u);
                        break
                    }
                if (/^YN/.test(q.dang_hoi || ''))
                    info = /^(はい|いいえ|ええ|いえ|そうです|ちがいます|いいですね|すみません|ざんねん)/.test(u) || info;
                const model = [q.tra_loi_1, q.tra_loi_2].filter(Boolean).map(norm);
                const need = SIGS.filter(s => model.some(m => m.includes(s)) && s !== 'です' && s !== 'から');
                const st = need.length ? need.some(s => u.includes(s)) : ENDOK(u);
                return [info, info && st];
            }
            function gradeFree(q, text) {
                const u = norm(text);
                const c = q.chu_de;
                const yn = /^YN/.test(q.dang_hoi);
                let r;
                if (q.chu_de === 'L26') {
                    r = [/(いいですね|すみません|ざんねん|ちょっと|ぜひ|はい)/.test(u), /(ましょう|ちょっと|ありますから|ようじ|ざんねん)/.test(u)]
                } else if (yn) {
                    const a = /^(はい|いいえ|いえ|そうです|ちがいます|ええ)/.test(u);
                    r = [a, a && (/^(はい|ええ|そうです)/.test(u) ? ENDOK(u) : ENDOK(u) || /ちがいます/.test(u))]
                } else if (c === 'L01')
                    r = [u.replace(/(わたしは|わたしの|おなまえは|なまえは|です|ます)/g, '').length >= 1, /です$/.test(u)];
                else if (c === 'L02')
                    r = [anyIn(u, COUNTRY), anyIn(u, COUNTRY) && /です$/.test(u)];
                else if (c === 'L03')
                    r = [anyIn(u, JOBS), anyIn(u, JOBS) && /です$/.test(u)];
                else if (c === 'L04')
                    r = [/(さい|はたち)/.test(u), /(さい|はたち)です$/.test(u)];
                else if (c === 'L05')
                    r = [/がつ/.test(u) && DAYW.test(u), /がつ.*です$/.test(u)];
                else if (c === 'L06')
                    r = [anyIn(u, HOBBY), (anyIn(u, HOBBY) || /しゅみ/.test(u)) && /です$/.test(u)];
                else if (c === 'L07')
                    r = [/(かい|がい|ここ|そこ|あそこ)/.test(u), /(かい|がい|ここ|そこ|あそこ).*です$/.test(u)];
                else if (c === 'L08')
                    r = [/(えん|どる|どん)/.test(u), /(えん|どる|どん)です$/.test(u)];
                else if (c === 'L09')
                    r = [u.replace(/(です|の)/g, '').length >= 2, /です$/.test(u)];
                else if (c === 'L10')
                    r = [anyIn(u, BRAND) || /の/.test(u), (anyIn(u, BRAND) || /の/.test(u)) && /です$/.test(u)];
                else if (c === 'L11')
                    r = [/(じ|ふん|ぷん|ようび|がつ|にち|はつか|ついたち|ふつか|みっか|よっか|いつか|むいか|なのか|ようか|ここのか|とおか)/.test(u), /(から.*まで|まで)/.test(q.cau_hoi_doc) ? (u.includes('から') && u.includes('まで') || (!/から/.test(q.cau_hoi_doc) && u.includes('まで'))) : ENDOK(u)];
                else if (c === 'L12' || c === 'L13')
                    r = [VERB.test(u) || /(を|へ|に)/.test(u), VERB.test(u) && (/(を|へ|に|で|や)/.test(u) || /ません$/.test(u) || /(べんきょう|りょこう|さんぽ)/.test(u))];
                else
                    r = genericFree(q, u);
                const pl = q.cau_truc;
                return [{
                    ok: !!u && !!r[0],
                    t: q.tu_soat_thong_tin,
                    note: q.tu_soat_nhac
                }, {
                    ok: !!u && !!r[1],
                    t: 'Cấu trúc: ' + pl,
                    note: 'Thử nói theo mẫu: ' + pl
                }, {
                    ok: !!u && okEnd(u),
                    t: 'Có đuôi lịch sự (です／ます／ません)',
                    note: 'Máy chưa nghe thấy đuôi lịch sự です／ます. Em nghe lại câu gợi ý nhé.'
                }];
            }

            /* ---------- danh sách và câu ngẫu nhiên ---------- */
            let mode = 'read'
              , bai = CFG.bais[0]
              , tab = 'rand'
              , cur = null
              , bag = []
              , lastId = null;
            const B = () => DATA.bai[bai];
            const list = () => tab === 'pic' ? B().pic : B().free;
            const poolAll = () => [...B().pic.map(q => ({
                q,
                kind: 'pic'
            })), ...B().free.map(q => ({
                q,
                kind: 'free'
            }))];
            function nextRand() {
                if (!bag.length) {
                    bag = poolAll().sort( () => Math.random() - .5);
                    if (bag.length > 1 && bag[bag.length - 1].q.id === lastId)
                        bag.reverse()
                }
                const it = bag.pop();
                lastId = it.q.id;
                return it;
            }
            function renderList() {
                const all = poolAll();
                const done = all.filter(x => store[x.q.id]).length;
                $('#sumTxt').textContent = `Bài ${bai}: đã luyện ${done}/${all.length} câu`;
                $('#sumBar').style.width = Math.round(done / all.length * 100) + '%';
                syncB();
                $('#tabR').setAttribute('aria-selected', tab === 'rand');
                $('#tabP').setAttribute('aria-selected', tab === 'pic');
                $('#tabN').setAttribute('aria-selected', tab === 'free');
                $('#tabP').textContent = `Có tranh (${B().pic.length})`;
                $('#tabN').textContent = `Không tranh (${B().free.length})`;
                $('#nameBox').hidden = tab === 'pic';
                $('#randBox').hidden = tab !== 'rand';
                $('#grid').hidden = tab === 'rand';
                if (tab === 'rand')
                    return;
                $('#grid').innerHTML = !list().length ? '<p class="muted" style="grid-column:1/-1">Bài này chưa có câu ở mục này.</p>' : list().map( (q, i) => {
                    const s = store[q.id];
                    const st = s ? (tab === 'pic' ? `Tốt nhất ${s.best}% · ${s.n} lần` : `Đã luyện ${s.n} lần`) : 'Chưa luyện';
                    return `<button class="qcard${s ? ' done' : ''}" data-i="${i}"><span class="no">Câu ${i + 1}</span><span class="ty">${esc(tab === 'pic' ? q.type : q.ten_chu_de)}</span><span class="st" style="color:${s ? 'var(--good)' : 'var(--ink2)'}">${esc(st)}</span></button>`
                }
                ).join('');
                $('#grid').querySelectorAll('.qcard').forEach(b => b.onclick = () => open(+b.dataset.i));
            }
            $('#bSeg').style.gridTemplateColumns = 'repeat(' + CFG.bais.length + ',1fr)';
            $('#bSeg').innerHTML = CFG.bais.map(n => `<button data-b="${n}" aria-pressed="false">Bài ${n}</button>`).join('');
            function syncB() {
                document.querySelectorAll('#bSeg button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.b === bai))
            }
            document.querySelectorAll('#bSeg button').forEach(b => b.onclick = () => {
                bai = +b.dataset.b;
                bag = [];
                refresh()
            }
            );
            $('#mRead').onclick = () => {
                mode = 'read';
                screen('rList');
                refresh()
            }
            ;
            $('#mQA').onclick = () => {
                mode = 'qa';
                screen('vList');
                refresh()
            }
            ;
            $('#voiceSel').onchange = e => {
                jpVoice = voices.find(v => v.voiceURI === e.target.value) || jpVoice;
                store._voice = jpVoice && jpVoice.voiceURI;
                save()
            }
            ;
            $('#voiceTest').onclick = () => speakSeq(['はじめまして。わたしは たなかです。', 'おなまえは なんですか？'], {});
            try {
                pickVoice();
                speechSynthesis.onvoiceschanged = pickVoice
            } catch (e) {}
            $('#tabR').onclick = () => {
                tab = 'rand';
                renderList()
            }
            ;
            $('#tabP').onclick = () => {
                tab = 'pic';
                renderList()
            }
            ;
            $('#tabN').onclick = () => {
                tab = 'free';
                renderList()
            }
            ;
            $('#goRand').onclick = () => {
                const it = nextRand();
                cur = {
                    q: it.q,
                    kind: it.kind,
                    rand: true,
                    n: 1
                };
                show()
            }
            ;
            $('#nm').oninput = e => {
                myName = e.target.value.trim() || 'ミン';
                store._name = myName;
                save()
            }
            ;
            $('#nm').value = myName;

            /* ---------- màn một câu ---------- */
            const ICON = {
                spk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>',
                mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'
            };
            const helpBox = () => `<details class="help"><summary>Gõ Romaji thế nào? · Nói bằng micro bàn phím</summary><div class="hb small">
<p><b>Gõ Romaji</b> (không cần bàn phím tiếng Nhật): máy tự đổi sang hiragana rồi mới so với đáp án.</p>
<ul class="tight">
<li>Viết tách từng từ bằng dấu cách: <span class="jp">watashi wa Min desu</span></li>
<li>Trợ từ は gõ <b>wa</b>, へ gõ <b>e</b>, を gõ <b>o</b> (hoặc wo): <span class="jp">gakkou e ikimasu</span>, <span class="jp">terebi o mimasu</span></li>
<li>Âm kéo dài gõ như viết hiragana: <span class="jp">sensei</span> (せんせい), <span class="jp">toukyou</span> (とうきょう), <span class="jp">oneesan</span> (おねえさん)</li>
<li>Âm ngắt っ: gấp đôi phụ âm: <span class="jp">gakkou</span> (がっこう), <span class="jp">zasshi</span> (ざっし)</li>
<li>ん đứng trước nguyên âm hoặc y: thêm dấu ': <span class="jp">kin'en</span> (きんえん)</li>
<li>Kiểu Hepburn <span class="jp">shi, chi, tsu, fu, ji</span> hoặc kiểu Kunrei <span class="jp">si, ti, tu, hu, zi</span> đều được. Katakana cũng gõ Romaji bình thường: <span class="jp">terebi</span>.</li>
</ul>
<p><b>Nói bằng điện thoại</b> khi nút “Nói” không chạy: bấm vào ô trả lời, rồi bấm biểu tượng micro trên bàn phím.</p>
<ul class="tight">
<li>Android (Gboard): thêm tiếng Nhật trong Cài đặt → Ngôn ngữ và bàn phím. Trên bàn phím bấm giữ phím cách hoặc biểu tượng quả cầu để chọn 日本語, rồi bấm micro.</li>
<li>iPhone: Cài đặt → Cài đặt chung → Bàn phím → Thêm bàn phím mới → Tiếng Nhật, và bật “Đọc chính tả”. Bấm quả cầu để chọn 日本語, rồi bấm micro.</li>
<li>Máy tính Windows: bấm phím Windows + H để đọc chính tả vào ô trả lời.</li>
</ul></div></details>`;
            const qText = q => (q.read || q.cau_hoi_doc).replace(/^A/, myName);
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            let rec = null
              , micBlocked = false;
            function open(i) {
                cur = {
                    q: list()[i],
                    i,
                    kind: tab,
                    rand: false
                };
                show()
            }
            function show() {
                screen('vQ');
                renderAsk();
                window.scrollTo(0, 0)
            }
            function head() {
                const tag = cur.rand ? `<span class="tag">Câu ngẫu nhiên · Bài ${bai}</span>` : `<span class="tag">${cur.kind === 'pic' ? 'Có tranh' : 'Không tranh'}</span><span class="small muted">Câu ${cur.i + 1}/${list().length}</span>`;
                return `<button class="btn ghost back" id="bk">← Về danh sách</button><div class="row">${tag}</div>`
            }
            function renderAsk() {
                const q = cur.q;
                let h = head();
                h += `<section class="panel">`;
                if (cur.kind === 'pic')
                    h += `<img class="pic" alt="Tranh của câu hỏi" src="${IMG[q.pic]}">`;
                h += `<p class="qnote">${cur.kind === 'pic' ? 'Nhìn tranh, nghe câu hỏi (chưa hiện chữ) rồi trả lời.' : 'Nghe câu hỏi (chưa hiện chữ) rồi trả lời về chính em.'} Trả lời ngắn gọn, đúng trọng tâm.</p>
  <div class="row"><button class="btn primary" id="say">${ICON.spk}Nghe câu hỏi</button><label class="small row" style="gap:6px"><input type="checkbox" id="slow"> Đọc chậm</label></div>
  <p class="small muted" id="ttsNote" hidden>Trình duyệt này chưa có giọng đọc tiếng Nhật. Em bấm “Hiện chữ câu hỏi” bên dưới để đọc.</p>
  <button class="link small" id="peek" style="align-self:flex-start">Không nghe được? Hiện chữ câu hỏi (đề thật không có)</button>
  <div class="jline" id="peekTxt" hidden></div>
  </section>
  <section class="panel">
    <label for="ans"><b>Câu trả lời của em</b></label>
    <textarea id="ans" lang="ja" placeholder="Bấm Nói rồi trả lời, hoặc gõ tiếng Nhật hay Romaji. Xong bấm Chấm câu trả lời." autocomplete="off" spellcheck="false"></textarea>
    <div class="row"><button class="btn" id="mic" ${SR ? '' : 'hidden'}>${ICON.mic}<span>Nói</span></button><button class="btn primary" id="send">Chấm câu trả lời</button></div>
    ${helpBox()}
    <p class="small muted" id="micNote">${SR ? '' : 'Trình duyệt này không có micro tự nhận giọng (nên dùng Chrome hoặc Edge). '}Nút “Nói” dùng micro của trình duyệt và nghe liên tục cho đến khi em bấm dừng. Máy không tự chấm: em kiểm tra, sửa chữ nếu cần rồi bấm “Chấm câu trả lời”. Nếu micro không chạy, dùng micro của bàn phím (điện thoại), Windows+H, hoặc gõ Romaji.</p>
  </section>`;
                $('#vQ').innerHTML = h;
                $('#bk').onclick = toList;
                $('#say').onclick = () => {
                    const ok = speak(qText(q), $('#slow').checked);
                    if (!ok || !jpVoice)
                        $('#ttsNote').hidden = false
                }
                ;
                $('#peek').onclick = () => {
                    $('#peekTxt').hidden = false;
                    $('#peekTxt').textContent = qText(q)
                }
                ;
                $('#send').onclick = () => submit($('#ans').value);
                if (SR)
                    $('#mic').onclick = () => toggleMic();
            }
            function toggleMic(c) {
                c = c || {
                    btn: '#mic',
                    ta: '#ans',
                    note: '#micNote',
                    label: 'Nói'
                };
                const b = $(c.btn);
                if (rec) {
                    rec.__stop = true;
                    try {
                        rec.stop()
                    } catch (e) {}
                    ;return
                }
                if (micBlocked)
                    return;
                stopSpeak();
                let base = ($(c.ta).value || '').trim();
                base = base ? base + ' ' : '';
                let idle = 0;
                const start = () => {
                    const r = new SR();
                    rec = r;
                    r.lang = 'ja-JP';
                    r.interimResults = true;
                    r.continuous = true;
                    r.maxAlternatives = 1;
                    let got = false;
                    r.onstart = () => {
                        b.querySelector('span').innerHTML = '<span class="rec">Đang nghe… bấm để dừng</span>'
                    }
                    ;
                    r.onresult = e => {
                        got = true;
                        idle = 0;
                        let t = '';
                        for (const x of e.results)
                            t += x[0].transcript;
                        $(c.ta).value = base + t
                    }
                    ;
                    r.onerror = e => {
                        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                            micBlocked = true;
                            r.__stop = true;
                            b.disabled = true;
                            $(c.note).innerHTML = '<b>Trang này không được dùng micro của trình duyệt.</b> Em dùng micro của bàn phím (điện thoại) hoặc Windows+H để nói vào ô trên, hoặc gõ tiếng Nhật/Romaji, rồi bấm nút chấm.'
                        }
                    }
                    ;
                    r.onend = () => {
                        const bb = $(c.btn);
                        if (rec === r && !r.__stop && !micBlocked && bb) {
                            base = ($(c.ta).value || '').trim();
                            base = base ? base + ' ' : '';
                            if (!got)
                                idle++;
                            if (idle >= 4) {
                                rec = null;
                                bb.querySelector('span').textContent = c.label;
                                $(c.note).textContent = 'Máy chưa nghe thấy giọng nói. Bấm lại khi em sẵn sàng.';
                                return
                            }
                            setTimeout( () => {
                                if (rec === r && !r.__stop) {
                                    try {
                                        start()
                                    } catch (e) {
                                        rec = null;
                                        const b2 = $(c.btn);
                                        if (b2)
                                            b2.querySelector('span').textContent = c.label
                                    }
                                }
                            }
                            , 200);
                            return
                        }
                        if (rec === r)
                            rec = null;
                        if (bb)
                            bb.querySelector('span').textContent = c.label;
                    }
                    ;
                    try {
                        r.start()
                    } catch (e) {
                        rec = null;
                        b.querySelector('span').textContent = c.label
                    }
                }
                ;
                start();
            }
            function toList() {
                backList()
            }
            function backList() {
                stopSpeak();
                spkOn = false;
                if (rec) {
                    try {
                        rec.abort()
                    } catch (e) {}
                    ;rec = null
                }
                screen(mode === 'read' ? 'rList' : 'vList');
                refresh();
                window.scrollTo(0, 0)
            }
            function screen(n) {
                stopSpeak();
                const S = {
                    rList: ['#common', '#rList'],
                    vList: ['#common', '#vList'],
                    rQ: ['#vR'],
                    vQ: ['#vQ']
                }[n];
                ['#common', '#rList', '#vList', '#vR', '#vQ'].forEach(s => $(s).hidden = !S.includes(s));
            }
            function refresh() {
                $('#mRead').setAttribute('aria-selected', mode === 'read');
                $('#mQA').setAttribute('aria-selected', mode === 'qa');
                if (mode === 'read')
                    renderRList();
                else
                    renderList();
            }
            function submit(text) {
                stopSpeak();
                if (!String(text).trim()) {
                    $('#ans').focus();
                    return
                }
                const q = cur.q;
                const s = store[q.id] || {
                    n: 0,
                    best: 0
                };
                s.n++;
                let g;
                if (cur.kind === 'pic') {
                    g = gradePic(q, text);
                    s.best = Math.max(s.best, g.p)
                } else {
                    g = gradeFree(q, text)
                }
                s.last = text;
                store[q.id] = s;
                save();
                renderResult(text, g);
            }
            function mk(s) {
                return esc(s).replace(/【(.+?)】/g, '<mark>$1</mark>')
            }
            function lines(s, rx) {
                return String(s || '').split('\n').filter(x => x.trim()).map(x => `<li>${esc(x.replace(rx || /^•\s*/, ''))}</li>`).join('')
            }
            function renderResult(text, g) {
                const q = cur.q;
                let h = head();
                if (cur.kind === 'pic') {
                    const [lab,cls] = labelOf(g.p);
                    const ded = g.s === 15 ? `<div class="ded ok">Không bị trừ điểm nào. ${esc((g.ok || '').replace(/^Trọn điểm — không có gì phải sửa\. ?/, ''))}</div>` : g.items.map(x => `<div class="ded"><span class="code">${esc(x.c)}</span>${esc(x.why || '')}<br><span class="small">${esc((x.hint || '').replace(/^[−-]\d+(?:,\d+)?\s*/, ''))}</span></div>`).join('');
                    h += `<section class="panel res ${cls}"><div class="big"><span class="pct">${g.p}%</span><span class="lab">${lab}</span></div>
    ${g.zero ? '<p class="small"><b>Nội dung chưa đúng với tranh hoặc với câu hỏi nên câu này tính 0%.</b></p>' : ''}<p class="small muted">Kết quả do máy ước tính từ chữ nhận được, em dùng để tự luyện.</p>
    <div class="sec"><h3>1 · Câu hỏi này hỏi gì</h3><div class="jline">${mk((q.disp || '').replace(/^A/, myName))}</div><p>${esc(q.vn)}</p>
      <p class="small"><b>Từ hỏi:</b> ${esc(q.wh)}</p>
      <div class="small"><b>Em cần nghe 3 chỗ</b><ul class="tight">${lines(q.ear, /^$/)}</ul></div></div>
    <div class="sec"><h3>2 · Em đã nói</h3><div class="said">${esc(text)}</div></div>
    <div class="sec"><h3>3 · Điểm bị trừ và cách sửa</h3>${ded}</div>
    <div class="sec"><h3>4 · Cách trả lời để được trọn điểm</h3>
      <p><b>Mẫu câu:</b> <span class="jp">${esc(q.pat)}</span></p>
      <ol class="steps">${String(q.steps || '').split('\n').filter(x => /^\d\./.test(x)).map(x => `<li>${esc(x.replace(/^\d\.\s*/, ''))}</li>`).join('')}</ol>
      <div class="ans"><span class="jp">${esc(q.a1)}</span><span class="small muted">${esc(q.n1)}</span></div>
      <div class="ans"><span class="jp">${esc(q.a2)}</span><span class="small muted">${esc(q.n2)}</span></div>
      ${q.trap ? `<div class="small"><b>Bẫy hay gặp</b><ul class="tight">${lines(q.trap)}</ul></div>` : ''}
      ${q.pron ? `<div class="small"><b>Phát âm cần chú ý</b><ul class="tight">${lines(q.pron)}</ul></div>` : ''}
    </div></section>`;
                } else {
                    h += `<section class="panel"><h2>Phản hồi tham khảo</h2><p class="small muted">Câu này không tính điểm. Em tự so với bảng bên dưới.</p>
    <div class="sec"><h3>Câu hỏi</h3><div class="jline">${esc(qText(q))}</div><p>${esc(q.nghia_vn)}</p></div>
    <div class="sec"><h3>Máy nghe được</h3><div class="said">${esc(text)}</div></div>
    <div class="sec"><h3>Bảng tự soát</h3>${g.map(c => `<div class="chk ${c.ok ? 'y' : 'n'}"><b aria-hidden="true">${c.ok ? '✓' : '✗'}</b><div><div>${esc(c.t)}</div>${c.ok ? '' : `<div class="small muted">${esc(c.note)}</div>`}</div></div>`).join('')}</div>
    <div class="sec"><h3>Cấu trúc nên dùng</h3><p class="jp">${esc(q.cau_truc)}</p></div>
    <div class="sec"><h3>Từ vựng gợi ý</h3><ul class="tight">${String(q.tu_vung || '').split('；').map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="sec"><h3>Câu trả lời gợi ý</h3>
      <div class="ans"><span class="jp">${esc(q.tra_loi_1)}</span><span class="small muted">${esc(q.nghia_1)}</span></div>
      <div class="ans"><span class="jp">${esc(q.tra_loi_2)}</span><span class="small muted">${esc(q.nghia_2)}</span></div>
      <p class="small muted">Dấu ○○ là chỗ em tự điền thông tin của mình.</p></div></section>`;
                }
                const last = !cur.rand && cur.i >= list().length - 1;
                h += `<div class="row"><button class="btn" id="hear">${ICON.spk}Nghe lại câu hỏi</button><button class="btn" id="again">Nói lại câu này</button><button class="btn primary" id="next">${cur.rand ? 'Câu ngẫu nhiên khác' : last ? 'Về danh sách' : 'Câu tiếp theo'}</button></div>`;
                $('#vQ').innerHTML = h;
                $('#bk').onclick = toList;
                $('#hear').onclick = () => speak(qText(q), false);
                $('#again').onclick = renderAsk;
                $('#next').onclick = () => {
                    if (cur.rand) {
                        const it = nextRand();
                        cur = {
                            q: it.q,
                            kind: it.kind,
                            rand: true,
                            n: (cur.n || 1) + 1
                        };
                        renderAsk()
                    } else if (last)
                        toList();
                    else {
                        cur.i++;
                        cur.q = list()[cur.i];
                        renderAsk()
                    }
                    window.scrollTo(0, 0)
                }
                ;
                window.scrollTo(0, 0);
            }

            /* =================== LUYỆN ĐỌC =================== */
            const RD = {
                "1": [{
                    "id": "L1.1",
                    "mk": "かぞくの しごとです。ちちは {52才|ごじゅうにさい}の パイロットです。ははは しゃいんでは ありません。{日本語|にほんご}の きょうしです。あには カメラマンです。あねは ナースです。わたしは {学生|がくせい}です。",
                    "han": [["52才", "ごじゅうにさい"], ["日本語", "にほんご"], ["学生", "がくせい"]]
                }, {
                    "id": "L1.2",
                    "mk": "こちらは ミラーさんです。{日本人|にほんじん}じゃ ありません。イギリスじんです。ロンドンの がっこうの せんせいです。{日本語|にほんご}の きょうしです。{40才|よんじゅっさい}です。しゅみは えいがです。",
                    "han": [["日本人", "にほんじん"], ["日本語", "にほんご"], ["40才", "よんじゅっさい"]]
                }, {
                    "id": "L1.3",
                    "mk": "わたしの {学校|がっこう}の {学生|がくせい}は {4人|よにん}です。インドじんと ネパールじんと モンゴルじんです。みんな にじゅっさいです。せんせいは にほんじんの たなかさんです。しゅみは えいがです。",
                    "han": [["学校", "がっこう"], ["学生", "がくせい"], ["4人", "よにん"]]
                }, {
                    "id": "L1.4",
                    "mk": "わたしは ワンです。ちゅうごくから きました。シャンハイだいがくの {学生|がくせい}です。{18才|じゅうはっさい}です。たんじょうびは しがつ {10日|とおか}です。しゅみは ジョギングと どくしょです。よろしく。",
                    "han": [["学生", "がくせい"], ["18才", "じゅうはっさい"], ["10日", "とおか"]]
                }, {
                    "id": "L1.5",
                    "mk": "リサさんは ブラジルから きました。シドニーの {学校|がっこう}の {学生|がくせい}です。しゅみは えいがと どくしょです。にほんごの せんせいは たなかさん {1人|ひとり}です。たなかさんは にほんじんです。",
                    "han": [["学校", "がっこう"], ["学生", "がくせい"], ["1人", "ひとり"]]
                }, {
                    "id": "L1.6",
                    "mk": "{私|わたし}は アンです。ベトナムじんです。ハノイだいがくの がくせいでは ありません。きょうしです。{30才|さんじゅっさい}です。たんじょうびは ろくがつ {15日|じゅうごにち}です。しゅみは りょうりです。",
                    "han": [["私", "わたし"], ["30才", "さんじゅっさい"], ["15日", "じゅうごにち"]]
                }, {
                    "id": "L1.7",
                    "mk": "やまださんと すずきさんは {日本人|にほんじん}です。アユタヤの {えい語|えいご}の きょうしです。{2人|ふたり}の しゅみは どくしょです。ロマンティックの ほんが すきです。シュミットさんも きょうしです。",
                    "han": [["日本人", "にほんじん"], ["えい語", "えいご"], ["2人", "ふたり"]]
                }, {
                    "id": "L1.8",
                    "mk": "わたしは さくらです。{日本人|にほんじん}です。トヨタの エンジニアです。{25才|にじゅうごさい}です。たんじょうびは くがつ {20日|はつか}です。しゅみは どくしょと ピアノです。ははの しゅみも どくしょです。",
                    "han": [["日本人", "にほんじん"], ["25才", "にじゅうごさい"], ["20日", "はつか"]]
                }, {
                    "id": "L1.9",
                    "mk": "「ナタポンさんの たんじょうびは いつですか。」「ろくがつ {4日|よっか}です。」「{日本人|にほんじん}ですか。」「いいえ、わたしは タイから きました。{日本語|にほんご}の がくせいです。しゅみは バドミントンです。」",
                    "han": [["4日", "よっか"], ["日本人", "にほんじん"], ["日本語", "にほんご"]]
                }, {
                    "id": "L1.10",
                    "mk": "わたしは ミンジです。かんこく{人|じん}です。ソウルの かいしゃいんです。がくせいでは ありません。{28才|にじゅうはっさい}です。たんじょうびは じゅういちがつ {5日|いつか}です。しゅみは えと ダンスです。",
                    "han": [["人", "じん"], ["28才", "にじゅうはっさい"], ["5日", "いつか"]]
                }],
                "2": [{
                    "id": "L2.1",
                    "mk": "ここは わたしの {学校|がっこう}です。ロビーは いっかいです。エレベーターは そこです。{日本語|にほんご}の きょうしつは さんがいです。がくせいは みんなで {十人|じゅうにん}です。ラウンジは ごかいです。",
                    "han": [["学校", "がっこう"], ["日本語", "にほんご"], ["十人", "じゅうにん"]]
                }, {
                    "id": "L2.2",
                    "mk": "ここは くうこうの インフォメーションです。{日本人|にほんじん}は こちら、{えい語|えいご}の かたは そちらです。ちゅうごくじんは あちらです。{九人|きゅうにん}の ツアーも あちらです。トイレは あそこです。",
                    "han": [["日本人", "にほんじん"], ["えい語", "えいご"], ["九人", "きゅうにん"]]
                }, {
                    "id": "L2.3",
                    "mk": "ここは けいたいでんわの ショップです。この アイフォーンは {八万円|はちまんえん}です。あの ソニーは {日本|にほん}のです。{六万円|ろくまんえん}です。ははの けいたいでんわも あれです。じゃ、あれを ください。",
                    "han": [["八万円", "はちまんえん"], ["日本", "にほん"], ["六万円", "ろくまんえん"]]
                }, {
                    "id": "L2.4",
                    "mk": "これは ともだちの とけいです。わたしのじゃ ありません。スイスの とけいです。{三百|さんびゃく}ドルです。にほんでは {四万五千円|よんまんごせんえん}です。ユーロでは {二百七十|にひゃくななじゅう}です。わたしのは にほんのです。",
                    "han": [["三百", "さんびゃく"], ["四万五千円", "よんまんごせんえん"], ["二百七十", "にひゃくななじゅう"]]
                }, {
                    "id": "L2.5",
                    "mk": "ちちの たんじょうびは じゅうにがつ {三日|みっか}です。ちちは {四十五才|よんじゅうごさい}です。これは ちちへの おくりものです。ネクタイと マフラーと セーターです。ぜんぶで {一万二千円|いちまんにせんえん}です。",
                    "han": [["三日", "みっか"], ["四十五才", "よんじゅうごさい"], ["一万二千円", "いちまんにせんえん"]]
                }, {
                    "id": "L2.6",
                    "mk": "わたしの かぞくは {六人|ろくにん}です。ちちと ははと あにと あねと いもうとと わたしです。ここは レストランです。メニューは そこです。ステーキを {六つ|むっつ} ください。ぜんぶで {三万円|さんまんえん}です。",
                    "han": [["六人", "ろくにん"], ["六つ", "むっつ"], ["三万円", "さんまんえん"]]
                }, {
                    "id": "L2.7",
                    "mk": "ここは がっこうの じむしつです。この ペンは たなかさんのです。たなかさんは {十六才|じゅうろくさい}です。その ファイルと ゴムは やまださんのです。あの {本|ほん}は {日本語|にほんご}の せんせいのです。",
                    "han": [["十六才", "じゅうろくさい"], ["本", "ほん"], ["日本語", "にほんご"]]
                }, {
                    "id": "L2.8",
                    "mk": "ここは がっきの みせです。この ギターは スペインのです。{二万円|にまんえん}です。あの たいこは ちゅうごくのです。その バイオリンは にほんのです。{九千円|きゅうせんえん}です。じゃ、それを {一つ|ひとつ} ください。",
                    "han": [["二万円", "にまんえん"], ["九千円", "きゅうせんえん"], ["一つ", "ひとつ"]]
                }, {
                    "id": "L2.9",
                    "mk": "これは わたしの えいごの ほんです。ちゅうごくごの ほんでは ありません。この ほんでは、{人|ひと}は えいごで パーソンです。{円|えん}は えいごで イェンです。{日本|にほん}は えいごで ジャパンです。",
                    "han": [["人", "ひと"], ["円", "えん"], ["日本", "にほん"]]
                }, {
                    "id": "L2.10",
                    "mk": "わたしは サムです。ラオスから きました。{二十三才|にじゅうさんさい}です。がくせいでは ありません。いまは ブックストアの てんいんです。この みせの {日本語|にほんご}の じしょは {一万円|いちまんえん}です。",
                    "han": [["二十三才", "にじゅうさんさい"], ["日本語", "にほんご"], ["一万円", "いちまんえん"]]
                }],
                "3": [{
                    "id": "L3.1",
                    "mk": "ここは だいがくの カフェです。ごぜん ななじはんから ごご {十時|じゅうじ}までです。やすみは {日曜日|にちようび}です。まいにち、ここで コーヒーや マッチャを のみます。どちらも {四百円|よんひゃくえん}です。",
                    "han": [["十時", "じゅうじ"], ["日曜日", "にちようび"], ["四百円", "よんひゃくえん"]]
                }, {
                    "id": "L3.2",
                    "mk": "ここは ニコニコの スーパーです。ごぜん くじから ごご {十一時|じゅういちじ}までです。やすみは {土曜日|どようび}です。まいあさ、ここで ぎゅうにゅうと チーズを かいます。ぎゅうにゅうは {百円|ひゃくえん}です。",
                    "han": [["十一時", "じゅういちじ"], ["土曜日", "どようび"], ["百円", "ひゃくえん"]]
                }, {
                    "id": "L3.3",
                    "mk": "わたしは ヒマワリ{日本語|にほんご}がっこうの がくせいです。{月曜日|げつようび}から きんようびまで、がっこうへ いきます。クラスは {九時|くじ}からです。まいにち、テストの べんきょうも します。",
                    "han": [["日本語", "にほんご"], ["月曜日", "げつようび"], ["九時", "くじ"]]
                }, {
                    "id": "L3.4",
                    "mk": "ここは コロンビアだいがくの としょかんです。わたしは この だいがくの {四年生|よねんせい}です。まいにち、ここで {本|ほん}を よみます。{三時間|さんじかん}、ノートと パソコンで べんきょうします。",
                    "han": [["四年生", "よねんせい"], ["本", "ほん"], ["三時間", "さんじかん"]]
                }, {
                    "id": "L3.5",
                    "mk": "しゅうまつ、としょかんへ いきます。そこで マンガを よみます。{水曜日|すいようび}と きんようび、えきの コンビニで アルバイトを します。ごご {四時|よじ}から {八時|はちじ}まで はたらきます。",
                    "han": [["水曜日", "すいようび"], ["四時", "よじ"], ["八時", "はちじ"]]
                }, {
                    "id": "L3.6",
                    "mk": "わたしは ホンダの しゃいんです。げつようびから きんようびまで、かいしゃで メールを よみます。コピーも します。{十二時|じゅうにじ}から {一時|いちじ}まで やすみです。{五時|ごじ}に かえります。",
                    "han": [["十二時", "じゅうにじ"], ["一時", "いちじ"], ["五時", "ごじ"]]
                }, {
                    "id": "L3.7",
                    "mk": "しゅうまつ、こうえんへ いきます。サンドイッチを たべます。げつようびと {木曜日|もくようび}、ハンバーガーの みせで ウェイターの しごとを します。{三時|さんじ}から {七時|しちじ}まで はたらきます。",
                    "han": [["木曜日", "もくようび"], ["三時", "さんじ"], ["七時", "しちじ"]]
                }, {
                    "id": "L3.8",
                    "mk": "まいあさ、いえで あさごはんを たべません。いえから ベーカリーまで {三分|さんぷん}です。パンと サラダと {水|みず}を かいます。それから {学校|がっこう}で たべます。ごぜん くじから べんきょうします。",
                    "han": [["三分", "さんぷん"], ["水", "みず"], ["学校", "がっこう"]]
                }, {
                    "id": "L3.9",
                    "mk": "わたしは だいがくの {一年生|いちねんせい}です。まいあさ、ろくじに おきます。ミルクと ヨーグルトと トーストを たべます。いえから だいがくまで {二十分|にじゅっぷん}です。{二時|にじ}まで べんきょうします。",
                    "han": [["一年生", "いちねんせい"], ["二十分", "にじゅっぷん"], ["二時", "にじ"]]
                }, {
                    "id": "L3.10",
                    "mk": "ひる、うちへ かえります。ルームメートと {二人|ふたり}で {三百円|さんびゃくえん}の カレーを たべます。ごご、どこへも いきません。{一時間|いちじかん}、ラジオを ききます。それから うちで しゅくだいを します。",
                    "han": [["二人", "ふたり"], ["三百円", "さんびゃくえん"], ["一時間", "いちじかん"]]
                }, {
                    "id": "L3.11",
                    "mk": "わたしは マリアです。フランスじんです。{火曜日|かようび}から きんようびまで、がっこうへ いきます。がっこうは ななじからです。{四月|しがつ}から {九月|くがつ}まで、まいあさ プールで すいえいを します。",
                    "han": [["火曜日", "かようび"], ["四月", "しがつ"], ["九月", "くがつ"]]
                }, {
                    "id": "L3.12",
                    "mk": "わたしは カリナです。かんこくじんです。{二十才|はたち}の {三年生|さんねんせい}です。もくようびに、だいがくの としょかんで {二時間|にじかん}、ドイツごを べんきょうします。やすみの ひは テニスを します。",
                    "han": [["二十才", "はたち"], ["三年生", "さんねんせい"], ["二時間", "にじかん"]]
                }, {
                    "id": "L3.13",
                    "mk": "わたしは アンナです。ホーチミンの だいがくの {二年生|にねんせい}です。まいあさ、ろくじに おきます。バイクで だいがくへ いきます。いえから {十五分|じゅうごふん}です。あさ、{三十分|さんじゅっぷん} しゅくだいを します。",
                    "han": [["二年生", "にねんせい"], ["十五分", "じゅうごふん"], ["三十分", "さんじゅっぷん"]]
                }, {
                    "id": "L3.14",
                    "mk": "わたしは かんこくの がくせいです。{十月二十日|じゅうがつはつか}から {日本|にほん}の とうきょうへ いきます。ホテルは {八千円|はっせんえん}です。デパートで チョコレートを かいます。それから さんぽを します。",
                    "han": [["十月二十日", "じゅうがつはつか"], ["日本", "にほん"], ["八千円", "はっせんえん"]]
                }, {
                    "id": "L3.15",
                    "mk": "どようび、にほんじんの かたと ラーメンやで ひるごはんを たべます。ごはんは {七百円|ななひゃくえん}です。それから ディズニーランドへ いきます。チケットは {五千円|ごせんえん}です。{一日|いちにち}、さんぽを します。",
                    "han": [["七百円", "ななひゃくえん"], ["五千円", "ごせんえん"], ["一日", "いちにち"]]
                }, {
                    "id": "L3.16",
                    "mk": "わたしの たんじょうびは {十月八日|じゅうがつようか}、にちようびです。うちで かぞく{三人|さんにん}と パーティーを します。みせで {千円|せんえん}の ケーキと ジュースを かいます。ごご ろくじに たべます。",
                    "han": [["十月八日", "じゅうがつようか"], ["三人", "さんにん"], ["千円", "せんえん"]]
                }, {
                    "id": "L3.17",
                    "mk": "ははの たんじょうびは {十二月三日|じゅうにがつみっか}です。ははは {五十才|ごじっさい}です。ショッピングモールで ハンカチと スカーフを かいます。ふたつで {千五百円|せんごひゃくえん}です。よる、ごはんを たべます。",
                    "han": [["十二月三日", "じゅうにがつみっか"], ["五十才", "ごじっさい"], ["千五百円", "せんごひゃくえん"]]
                }, {
                    "id": "L3.18",
                    "mk": "はるやすみは {三月十五日|さんがつじゅうごにち}からです。バスりょこうで オオキワこうえんへ いきます。りょこうは {六時間|ろくじかん}で {二千円|にせんえん}です。こうえんで はなみを します。カメラも つかいます。",
                    "han": [["三月十五日", "さんがつじゅうごにち"], ["六時間", "ろくじかん"], ["二千円", "にせんえん"]]
                }, {
                    "id": "L3.19",
                    "mk": "どようび、{一人|ひとり}で みせへ いきます。ランチは オヤコドンです。{九百円|きゅうひゃくえん}です。とりにくと たまごの りょうりです。みせから アサヒこうえんまで {五分|ごふん}です。さんぽを します。",
                    "han": [["一人", "ひとり"], ["九百円", "きゅうひゃくえん"], ["五分", "ごふん"]]
                }, {
                    "id": "L3.20",
                    "mk": "にちようび、はちじに おきます。あさごはんは たべません。イタリアごを {一年|いちねん}、べんきょうします。ひるごはんは かぞく{四人|よにん}で パスタと ピザを たべます。どちらも {六百円|ろっぴゃくえん}です。",
                    "han": [["一年", "いちねん"], ["四人", "よにん"], ["六百円", "ろっぴゃくえん"]]
                }, {
                    "id": "L3.21",
                    "mk": "わたしは {十月一日|じゅうがつついたち}から ホームステイを します。ホストファミリーの いえは えきから {十分|じゅっぷん}です。よる、かぞくと いっしょに テレビを みます。{二十五日|にじゅうごにち}に うちへ かえります。",
                    "han": [["十月一日", "じゅうがつついたち"], ["十分", "じゅっぷん"], ["二十五日", "にじゅうごにち"]]
                }, {
                    "id": "L3.22",
                    "mk": "グプタさんの しゅみは サッカーです。だいがくの たいいくかんで {十一人|じゅういちにん}で します。れんしゅうは {四時間|よじかん}です。れんしゅうの あと、スポーツドリンクを のみます。{二百円|にひゃくえん}です。",
                    "han": [["十一人", "じゅういちにん"], ["四時間", "よじかん"], ["二百円", "にひゃくえん"]]
                }, {
                    "id": "L3.23",
                    "mk": "{十一月|じゅういちがつ}から、もくようびに ごご {六時|ろくじ}まで バスケットボールを します。いえへ かえります。{四十分|よんじゅっぷん}の ドラマを みます。アイスクリームも たべます。おふろに はいります。",
                    "han": [["十一月", "じゅういちがつ"], ["六時", "ろくじ"], ["四十分", "よんじゅっぷん"]]
                }, {
                    "id": "L3.24",
                    "mk": "ゴールデンウィークは {金曜日|きんようび}からです。{四日間|よっかかん}、くにへ かえります。かぞく{五人|ごにん}で ダナンへ いきます。ごぜんは ビーチで さんぽを します。よる、いっしょに はなびを みます。",
                    "han": [["金曜日", "きんようび"], ["四日間", "よっかかん"], ["五人", "ごにん"]]
                }]
            };
            const k2h = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
            const PAL = {
                'は': 'わ',
                'へ': 'え',
                'を': 'お'
            };
            const F133 = CFG.fmt === '133';
            if (F133)
                document.body.classList.add('fmt133');
            function segs(mk) {
                const out = [];
                const re = /\{(.+?)\|(.+?)\}|\[(.+?)\|(.+?)\]/g;
                let last = 0, m;
                const plain = s => {
                    const r = /([ァ-ヶー]+)|([^ァ-ヶー]+)/g;
                    let a;
                    while ((a = r.exec(s)))
                        out.push(a[1] ? {
                            t: 'k',
                            s: a[1]
                        } : {
                            t: 'x',
                            s: a[2]
                        })
                }
                ;
                while ((m = re.exec(mk))) {
                    if (m.index > last)
                        plain(mk.slice(last, m.index));
                    if (m[1] != null)
                        out.push({
                            t: 'h',
                            k: m[1],
                            y: m[2]
                        });
                    else
                        out.push({
                            t: 'f',
                            k: m[3],
                            y: m[4]
                        });
                    last = re.lastIndex
                }
                if (last < mk.length)
                    plain(mk.slice(last));
                return out
            }
            const splitS = mk => (mk.match(/[^。]*。」?|[^。]+$/g) || [mk]).map(x => x.trim()).filter(Boolean);
            const PLAINY = s => s.replace(/\{(.+?)\|(.+?)\}|\[(.+?)\|(.+?)\]/g, (m, a, b, c, d) => b != null ? b : d);
            const PLAINK = s => s.replace(/\{(.+?)\|(.+?)\}|\[(.+?)\|(.+?)\]/g, (m, a, b, c, d) => a != null ? a : c);
            function ttsSents(sents) {
                return sents.map(p => {
                    let t = PLAINY(p).replace(/[「」]/g, '').trim();
                    if (/か。?$/.test(t))
                        t = t.replace(/。$/, '') + '？';
                    else if (!/[。？]$/.test(t))
                        t += '。';
                    return t
                }
                )
            }
            const BRK = /[\s「」。、！？…・〜~（）()]/;
            function buildRef(mk) {
                const items = [];
                let hw = 0
                  , kw = 0;
                for (const s of segs(mk)) {
                    if (s.t === 'h') {
                        items.push({
                            ph: 'h',
                            w: hw++,
                            y: s.y
                        })
                    } else if (s.t === 'k') {
                        items.push({
                            ph: 'k',
                            w: kw++,
                            y: s.s
                        })
                    } else if (s.t === 'f') {
                        items.push({
                            ph: 'i',
                            y: s.y
                        })
                    } else
                        for (const c of s.s)
                            items.push({
                                c
                            });
                }
                const ref = [];
                items.forEach( (it, ix) => {
                    if (it.ph) {
                        let pv = '';
                        for (const c0 of k2h(it.y)) {
                            let c = c0, a;
                            if (c0 === 'ー' && pv) {
                                const v = vowelOf(pv);
                                if (v) {
                                    c = v;
                                    if (v === 'お')
                                        a = 'う';
                                    else if (v === 'え')
                                        a = 'い'
                                }
                            }
                            ref.push({
                                c,
                                g: it.ph,
                                w: it.w,
                                a
                            });
                            pv = c0 === 'ー' ? pv : c0
                        }
                        return
                    }
                    const c = it.c;
                    if (BRK.test(c))
                        return;
                    let a;
                    if (c === 'を')
                        a = 'お';
                    else if (c === 'は' || c === 'へ') {
                        const pv = items[ix - 1]
                          , nx = items[ix + 1];
                        const prevWord = pv && (pv.ph || (pv.c && !BRK.test(pv.c)));
                        const nextBrk = !nx || (nx.c && BRK.test(nx.c));
                        if (F133 ? prevWord : (prevWord && nextBrk))
                            a = PAL[c];
                    }
                    ref.push({
                        c,
                        g: 'i',
                        a
                    });
                }
                );
                return ref;
            }
            RD.all = CFG.bais.flatMap(b => RD[b] || []);
            RD.all.forEach(p => {
                p.sents = (p.title ? ['「' + p.title + '」'] : []).concat(splitS(p.mk));
                p.ref = buildRef(p.sents.join(' '));
                p.tts = ttsSents(p.sents);
                p.nh = new Set(p.ref.filter(t => t.g === 'h').map(t => t.w)).size;
                p.nk = new Set(p.ref.filter(t => t.g === 'k').map(t => t.w)).size;
            }
            );

            /* chữ nhận được → dạng kana để so với bản mẫu */
            const VOC = [['家族', 'かぞく'], ['仕事', 'しごと'], ['父', 'ちち'], ['母', 'はは'], ['兄', 'あに'], ['姉', 'あね'], ['会社員', 'かいしゃいん'], ['社員', 'しゃいん'], ['趣味', 'しゅみ'], ['映画', 'えいが'], ['教師', 'きょうし'], ['先生', 'せんせい'], ['私', 'わたし'], ['誕生日', 'たんじょうび'], ['中国', 'ちゅうごく'], ['大学', 'だいがく'], ['学生', 'がくせい'], ['学校', 'がっこう'], ['日本語', 'にほんご'], ['日本人', 'にほんじん'], ['日本', 'にほん'], ['読書', 'どくしょ'], ['料理', 'りょうり'], ['好き', 'すき'], ['皆', 'みんな'], ['絵', 'え'], ['来ました', 'きました'], ['来ま', 'きま'], ['本が', 'ほんが'], ['桜', 'さくら'], ['田中', 'たなか'], ['鈴木', 'すずき'], ['山田', 'やまだ'], ['韓国人', 'かんこくじん'], ['韓国', 'かんこく'], ['宜しく', 'よろしく'], ['英語', 'えいご'], ['英国人', 'えいこくじん'], ['朝', 'あさ'], ['昼', 'ひる'], ['晩', 'ばん'], ['夜', 'よる'], ['ご飯', 'ごはん'], ['御飯', 'ごはん'], ['家', 'いえ'], ['一階', 'いっかい'], ['一緒に', 'いっしょに'], ['今', 'いま'], ['妹', 'いもうと'], ['駅', 'えき'], ['起き', 'おき'], ['贈り物', 'おくりもの'], ['お風呂', 'おふろ'], ['会社', 'かいしゃ'], ['買い', 'かい'], ['買っ', 'かっ'], ['帰り', 'かえり'], ['帰っ', 'かえっ'], ['方', 'かた'], ['楽器', 'がっき'], ['聞き', 'きき'], ['教室', 'きょうしつ'], ['牛乳', 'ぎゅうにゅう'], ['空港', 'くうこう'], ['国', 'くに'], ['散歩', 'さんぽ'], ['週末', 'しゅうまつ'], ['宿題', 'しゅくだい'], ['辞書', 'じしょ'], ['事務室', 'じむしつ'], ['全部', 'ぜんぶ'], ['体育館', 'たいいくかん'], ['太鼓', 'たいこ'], ['食べ', 'たべ'], ['飲み', 'のみ'], ['卵', 'たまご'], ['父', 'ちち'], ['中国語', 'ちゅうごくご'], ['中国人', 'ちゅうごくじん'], ['使い', 'つかい'], ['店員', 'てんいん'], ['店', 'みせ'], ['東京', 'とうきょう'], ['図書館', 'としょかん'], ['友達', 'ともだち'], ['友だち', 'ともだち'], ['鶏肉', 'とりにく'], ['入り', 'はいり'], ['働き', 'はたらき'], ['花火', 'はなび'], ['花見', 'はなみ'], ['春休み', 'はるやすみ'], ['勉強', 'べんきょう'], ['本', 'ほん'], ['毎朝', 'まいあさ'], ['毎日', 'まいにち'], ['見ま', 'みま'], ['見て', 'みて'], ['休み', 'やすみ'], ['読み', 'よみ'], ['旅行', 'りょこう'], ['練習', 'れんしゅう'], ['行き', 'いき'], ['行っ', 'いっ'], ['行か', 'いか'], ['行く', 'いく'], ['来て', 'きて'], ['来', 'き'], ['二つ', 'ふたつ'], ['姉', 'あね'], ['兄', 'あに'], ['金曜日', 'きんようび'], ['月曜日', 'げつようび'], ['木曜日', 'もくようび'], ['土曜日', 'どようび'], ['日曜日', 'にちようび'], ['水曜日', 'すいようび'], ['火曜日', 'かようび'], ['昼ご飯', 'ひるごはん'], ['語', 'ご'], ['屋', 'や']];
            if (CFG.vx && CFG.vx.length) {
                const hv = new Set(VOC.map(x => x[0]));
                CFG.vx.forEach(x => {
                    if (!hv.has(x[0])) {
                        VOC.push(x);
                        hv.add(x[0])
                    }
                }
                )
            }
            const D2K = n => {
                const d = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
                if (n < 10)
                    return d[n];
                if (n < 20)
                    return '十' + d[n - 10];
                return d[Math.floor(n / 10)] + '十' + d[n % 10]
            }
            ;
            function hanVariants(k) {
                const v = new Set([k]);
                const a = k.replace(/\d+/g, m => D2K(+m));
                v.add(a);
                v.add(k.replace(/[〇一二三四五六七八九十百千万]+/g, m => {
                    let t = 0
                      , cur = 0;
                    const U = {
                        '十': 10,
                        '百': 100,
                        '千': 1000
                    };
                    for (const c of m) {
                        if (c in KN)
                            cur = cur * 10 + KN[c];
                        else if (U[c]) {
                            t += (cur || 1) * U[c];
                            cur = 0
                        } else if (c === '万') {
                            t = (t + cur || 1) * 10000;
                            cur = 0
                        }
                    }
                    return String(t + cur)
                }
                ));
                [...v].forEach(x => v.add(x.replace(/才/g, '歳')));
                return [...v];
            }
            const ninK = n => ({
                1: 'ひとり',
                2: 'ふたり',
                3: 'さんにん',
                4: 'よにん',
                5: 'ごにん',
                6: 'ろくにん',
                7: 'ななにん',
                8: 'はちにん',
                9: 'きゅうにん',
                10: 'じゅうにん'
            })[n] || (typeof numK === 'function' ? numK(n) + 'にん' : null);
            function readNorm(p, text) {
                let s = String(text || '').normalize('NFKC');
                const pairs = [];
                for (const [k,y] of p.han)
                    hanVariants(k).forEach(v => pairs.push([v, y]));
                VOC.forEach(x => pairs.push(x));
                const map = new Map();
                pairs.forEach( ([k,v]) => {
                    if (!map.has(k))
                        map.set(k, v)
                }
                );
                // từ dài thay trước (trên toàn chuỗi), rồi đến từ ngắn; mọi từ khoá đều có chữ Hán nên phần đã thay không bị thay lại
                const byLen = new Map();
                [...map.keys()].forEach(k => {
                    const n = k.length;
                    if (!byLen.has(n))
                        byLen.set(n, []);
                    byLen.get(n).push(k)
                }
                );
                for (const n of [...byLen.keys()].sort( (a, b) => b - a)) {
                    const rx = new RegExp(byLen.get(n).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),'g');
                    s = s.replace(rx, m => map.get(m))
                }
                s = s.replace(/([一二三四五六七八九十]+)(?=人)/g, m => {
                    let v = 0;
                    const U = {
                        '十': 10
                    };
                    let cur = 0;
                    for (const c of m) {
                        if (c === '十') {
                            v += (cur || 1) * 10;
                            cur = 0
                        } else
                            cur = cur * 10 + (KN[c] ?? 0)
                    }
                    return String(v + cur)
                }
                );
                s = s.replace(/(\d+)\s*人/g, (m, n) => ninK(+n) || m);
                s = s.replace(/([ァ-ヶー])人/g, '$1じん').replace(/こく人/g, 'こくじん');
                s = norm(s);
                const rs = p.ref.map(t => t.c).join('');
                return lenFix(rs.includes('はたち') ? s : s.replace(/はたち/g, 'にじゅっさい'));
            }

            /* đối chiếu từng chữ (căn hàng kiểu khoảng cách chỉnh sửa) */
            function align(ref, rec) {
                const n = ref.length
                  , m = rec.length;
                const eq = (i, j) => rec[j] === ref[i].c || (ref[i].a && rec[j] === ref[i].a);
                const D = Array.from({
                    length: n + 1
                }, () => new Int16Array(m + 1));
                for (let i = 0; i <= n; i++)
                    D[i][0] = i;
                for (let j = 0; j <= m; j++)
                    D[0][j] = j;
                for (let i = 1; i <= n; i++)
                    for (let j = 1; j <= m; j++)
                        D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (eq(i - 1, j - 1) ? 0 : 1));
                const st = new Array(n);
                let i = n
                  , j = m;
                while (i > 0 || j > 0) {
                    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (eq(i - 1, j - 1) ? 0 : 1)) {
                        st[i - 1] = {
                            ok: eq(i - 1, j - 1),
                            j: j - 1
                        };
                        i--;
                        j--
                    } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) {
                        st[i - 1] = {
                            ok: false,
                            j: -1
                        };
                        i--
                    } else
                        j--;
                }
                return st;
            }
            const OROW = 'おこそとのほもよろをごぞどぼぽょ'
              , EROW = 'えけせてねへめれげぜでべぺ'
              , UROW = 'うくすつぬふむゆるぐずづぶぷゅ';
            const DAKU = s => s.normalize('NFD').replace(/[゙゚]/g, '');
            const CONF = [['し', 'ち'], ['つ', 'す'], ['つ', 'ち'], ['ら', 'だ'], ['ら', 'れ'], ['り', 'じ'], ['ふ', 'ひ'], ['い', 'え'], ['お', 'う'], ['ん', 'む']];
            function ops(a, b) {
                // sửa nhỏ giữa hai chuỗi ngắn
                const n = a.length
                  , m = b.length;
                const D = Array.from({
                    length: n + 1
                }, () => new Int16Array(m + 1));
                for (let i = 0; i <= n; i++)
                    D[i][0] = i;
                for (let j = 0; j <= m; j++)
                    D[0][j] = j;
                for (let i = 1; i <= n; i++)
                    for (let j = 1; j <= m; j++)
                        D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
                const out = [];
                let i = n
                  , j = m;
                while (i > 0 || j > 0) {
                    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
                        if (a[i - 1] !== b[j - 1])
                            out.push({
                                t: 'sub',
                                a: a[i - 1],
                                b: b[j - 1],
                                p: a[i - 2]
                            });
                        i--;
                        j--
                    } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) {
                        out.push({
                            t: 'del',
                            a: a[i - 1],
                            p: a[i - 2]
                        });
                        i--
                    } else {
                        out.push({
                            t: 'ins',
                            b: b[j - 1],
                            p: b[j - 2]
                        });
                        j--
                    }
                }
                return out;
            }
            function classify(r, s) {
                if (!s)
                    return ['Máy không nghe thấy chữ này'];
                const L = [];
                const add = x => {
                    if (!L.includes(x))
                        L.push(x)
                }
                ;
                for (const o of ops([...r], [...s])) {
                    if (o.t === 'del') {
                        if ('っゃゅょ'.includes(o.a))
                            add('Thiếu っ hoặc ゃ/ゅ/ょ');
                        else if (o.a === 'ー' || ((o.a === 'う') && (OROW + UROW).includes(o.p || '_')) || (o.a === 'お' && OROW.includes(o.p || '_')) || (o.a === 'え' && EROW.includes(o.p || '_')) || (o.a === 'い' && EROW.includes(o.p || '_')) || (o.a === 'あ' && o.p === 'あ'))
                            add('Trường âm: đọc ngắn hơn mẫu');
                        else
                            add('Thiếu chữ');
                    } else if (o.t === 'ins') {
                        if ('っゃゅょ'.includes(o.b))
                            add('Thừa っ hoặc ゃ/ゅ/ょ');
                        else if (o.b === 'ー' || ((o.b === 'う' || o.b === 'お') && (OROW + UROW).includes(o.p || '_')) || ((o.b === 'い' || o.b === 'え') && EROW.includes(o.p || '_')))
                            add('Trường âm: đọc dài hơn mẫu');
                        else
                            add('Thừa chữ');
                    } else {
                        if (DAKU(o.a) === DAKU(o.b))
                            add(`Âm trong/đục: ${o.a} và ${o.b}`);
                        else if (CONF.some(p => (p[0] === o.a && p[1] === o.b) || (p[1] === o.a && p[0] === o.b)))
                            add(`Âm hay nhầm: ${o.a} và ${o.b}`);
                        else if (PAL[o.a] && false)
                            add('Trợ từ');
                        else
                            add('Khác với mẫu');
                    }
                }
                return L.slice(0, 2);
            }
            function gradeRead(p, text) {
                const norm_ = readNorm(p, text);
                const rec = [...norm_];
                const ref = p.ref;
                const st = rec.length ? align(ref, rec) : ref.map( () => ({
                    ok: false,
                    j: -1
                }));
                const segOf = (a, b) => {
                    let l = -1
                      , r = rec.length;
                    for (let k = a - 1; k >= 0; k--)
                        if (st[k].j >= 0) {
                            l = st[k].j;
                            break
                        }
                    for (let k = b + 1; k < ref.length; k++)
                        if (st[k].j >= 0) {
                            r = st[k].j;
                            break
                        }
                    return rec.slice(l + 1, r).join('')
                }
                ;
                const grp = {
                    h: [],
                    k: []
                };
                const words = {
                    h: new Map(),
                    k: new Map()
                };
                ref.forEach( (t, i) => {
                    if (t.g === 'i')
                        return;
                    const m = words[t.g];
                    if (!m.has(t.w))
                        m.set(t.w, []);
                    m.get(t.w).push(i)
                }
                );
                const res = {};
                const errs = [];
                for (const g of ['h', 'k']) {
                    let sum = 0;
                    const arr = [];
                    for (const [w,idx] of words[g]) {
                        const full = idx.every(i => st[i].ok) && idx.every( (i, q) => q === 0 || st[i].j === st[idx[q - 1]].j + 1);
                        const sc = full ? 1 : (CFG.partial ? idx.filter(i => st[i].ok).length / idx.length : 0);
                        sum += sc;
                        const word = idx.map(i => ref[i].c).join('');
                        if (sc < 1) {
                            const seg = segOf(idx[0], idx[idx.length - 1]);
                            errs.push({
                                g,
                                word,
                                seg,
                                lab: classify(word, seg),
                                sc
                            })
                        }
                        arr.push({
                            word,
                            sc
                        });
                    }
                    res[g] = {
                        pct: Math.round(sum / Math.max(1, words[g].size) * 100),
                        words: arr,
                        right: Math.round(sum * 10) / 10,
                        n: words[g].size
                    };
                }
                const hi = ref.map( (t, i) => i).filter(i => ref[i].g === 'i');
                const hok = hi.filter(i => st[i].ok).length;
                res.i = {
                    pct: Math.round(hok / Math.max(1, hi.length) * 100),
                    ok: hok,
                    n: hi.length
                };
                // gom các chữ hiragana sai thành cụm
                let k = 0;
                while (k < ref.length) {
                    if (ref[k].g === 'i' && !st[k].ok) {
                        let e = k;
                        while (e + 1 < ref.length && ref[e + 1].g === 'i' && !st[e + 1].ok)
                            e++;
                        const a = Math.max(0, k - 1)
                          , b = Math.min(ref.length - 1, e + 1);
                        const word = ref.slice(a, b + 1).map(t => t.c).join('');
                        const seg = segOf(a, b);
                        errs.push({
                            g: 'i',
                            word,
                            seg,
                            lab: classify(ref.slice(k, e + 1).map(t => t.c).join(''), segOf(k, e)),
                            sc: 0,
                            bad: [k, e]
                        });
                        k = e + 1;
                    } else
                        k++;
                }
                res.total = Math.round(CFG.w[0] * res.h.pct + CFG.w[1] * res.k.pct + CFG.w[2] * res.i.pct);
                res.errs = errs;
                res.st = st;
                res.norm = norm_;
                const tally = {};
                errs.forEach(e => e.lab.forEach(l => {
                    const key = l.replace(/:.*$/, '');
                    tally[key] = (tally[key] || 0) + 1
                }
                ));
                res.tally = tally;
                return res;
            }

            /* hiển thị đoạn văn */
            function dispPassage(p) {
                return p.sents.map( (s, i) => {
                    const h = `<span class="snt" data-s="${i}">${segs(s).map(x => x.t === 'h' ? `<span class="han">${esc(x.k)}</span>` : x.t === 'f' ? `<ruby>${esc(x.k)}<rt>${esc(x.y)}</rt></ruby>` : x.t === 'k' ? `<span class="kat">${esc(x.s)}</span>` : esc(x.s)).join('')}</span>`;
                    return (i === 0 && p.title) ? `<div class="ptitle">${h}</div>` : h
                }
                ).join(' ');
            }
            function refPassage(p, st) {
                // bản mẫu có cách đọc; chữ đọc sai tô đỏ
                let ix = 0;
                const cell = (c, hi) => `<span class="${st && st[hi] && !st[hi].ok ? 'x' : ''}">${esc(c)}</span>`;
                return p.sents.map( (s, si) => {
                    const h = segs(s).map(x => {
                        if (x.t === 'h' || x.t === 'f') {
                            const ys = [...k2h(x.y)];
                            const h = ys.map( (c, q) => cell(c, ix + q)).join('');
                            ix += ys.length;
                            return `<ruby>${esc(x.k)}<rt>${h}</rt></ruby>`
                        }
                        if (x.t === 'k') {
                            const cs = [...x.s];
                            const h = cs.map( (c, q) => cell(c, ix + q)).join('');
                            ix += cs.length;
                            return `<span class="kat">${h}</span>`
                        }
                        let o = '';
                        for (const c of x.s) {
                            if (BRK.test(c)) {
                                o += esc(c);
                                continue
                            }
                            const t = p.ref[ix];
                            const sp = t && t.a && !F133 ? `<ruby>${cell(c, ix)}<rt>${t.a}</rt></ruby>` : cell(c, ix);
                            o += sp;
                            ix++
                        }
                        return o;
                    }
                    ).join('');
                    return (si === 0 && p.title) ? `<div class="ptitle">${h}</div>` : h
                }
                ).join(' ');
            }
            const nwHtml = p => (p.nw && p.nw.length) ? `<p class="small"><b>Từ mới:</b> ${p.nw.map(w => (w[1] ? `<ruby>${esc(w[0])}<rt>${esc(w[1])}</rt></ruby>` : esc(w[0])) + '（' + esc(w[2]) + '）').join('　')}</p>` : '';

            /* màn danh sách bài đọc */
            const rl = () => RD[bai] || [];
            function renderRList() {
                const all = rl();
                syncB();
                const done = all.filter(p => store['R:' + p.id]).length;
                $('#sumTxt').textContent = all.length ? `Bài ${bai}: đã đọc ${done}/${all.length} đoạn` : `Bài ${bai}`;
                $('#sumBar').style.width = all.length ? Math.round(done / all.length * 100) + '%' : '0%';
                $('#rEmpty').hidden = all.length > 0;
                $('#rBox').hidden = !all.length;
                if (all.length) {
                    const f = all[0];
                    $('#rIntro').textContent = `Mỗi đoạn có ${f.nh} từ Hán và ${f.nk} từ Katakana${F133 ? ', kèm tiêu đề' : ''}. Em nghe mẫu, đọc thành tiếng rồi để máy chấm theo từng nhóm: chữ Hán, Katakana, Hiragana.`
                }
                $('#rGrid').innerHTML = all.map( (p, i) => {
                    const s = store['R:' + p.id];
                    return `<button class="qcard${s ? ' done' : ''}" data-i="${i}"><span class="no">Đoạn ${i + 1}</span><span class="ty jp">${esc(PLAINK(p.sents[0]).replace(/[「」]/g, '').slice(0, 14))}…</span><span class="st" style="color:${s ? 'var(--good)' : 'var(--ink2)'}">${s ? `Tốt nhất ${s.best}% · ${s.n} lần` : 'Chưa luyện'}</span></button>`
                }
                ).join('');
                $('#rGrid').querySelectorAll('.qcard').forEach(b => b.onclick = () => openR(+b.dataset.i));
            }
            let rcur = null;
            function openR(i) {
                rcur = {
                    p: rl()[i],
                    i
                };
                screen('rQ');
                renderRAsk()
            }
            function rhead() {
                return `<button class="btn ghost back" id="bk">← Về danh sách</button><div class="row"><span class="tag">Luyện đọc · Bài ${bai}</span><span class="small muted">Đoạn ${rcur.i + 1}/${rl().length}</span></div>`
            }
            function playPassage(p, slow) {
                const ps = [...document.querySelectorAll('#vR .snt')];
                const btn = $('#rplay');
                if (spkOn) {
                    stopSpeak();
                    spkOn = false;
                    if (btn)
                        btn.querySelector('span').textContent = 'Nghe mẫu';
                    ps.forEach(x => x.classList.remove('on'));
                    return
                }
                spkOn = true;
                btn.querySelector('span').textContent = 'Dừng';
                const fin = () => {
                    spkOn = false;
                    const b = $('#rplay');
                    if (b)
                        b.querySelector('span').textContent = 'Nghe mẫu';
                    document.querySelectorAll('.snt.on').forEach(x => x.classList.remove('on'))
                }
                ;
                const ok = speakSeq(p.tts, {
                    slow,
                    onStart: i => {
                        ps.forEach(x => x.classList.toggle('on', +x.dataset.s === i))
                    }
                    ,
                    onEnd: fin
                });
                if (!ok) {
                    fin();
                    $('#ttsNote2').hidden = false
                }
            }
            let spkOn = false;
            const readNote = () => `Đọc thành tiếng đoạn văn dưới đây${F133 ? ', kể cả tiêu đề trong 「」' : ''}. <span class="han">Chữ Hán gạch chân đỏ</span> và <span class="kat">Katakana ${F133 ? 'in nghiêng' : 'màu xanh'}</span> được chấm theo từng từ: ${CFG.partial ? 'đọc đúng chữ nào được tính chữ đó' : 'sai một chữ là sai cả từ'}. ${F133 ? 'Chữ Hán có furigana nhỏ ở trên đầu: em đọc theo furigana, phần này tính vào hiragana. ' : ''}Phần còn lại là hiragana, chấm theo từng chữ. Trợ từ は, へ, を đọc là わ, え, お.`;
            function renderRAsk() {
                const p = rcur.p;
                $('#vR').innerHTML = rhead() + `
  <section class="panel">
    <p class="qnote">${readNote()}</p>
    <div class="passage jp" id="passage">${dispPassage(p)}</div>
    <div class="row"><button class="btn primary" id="rplay">${ICON.spk}<span>Nghe mẫu</span></button><label class="small row" style="gap:6px"><input type="checkbox" id="rslow"> Đọc chậm</label></div>
    <p class="small muted" id="ttsNote2" hidden>Trình duyệt này chưa phát được giọng tiếng Nhật. Em vẫn luyện đọc bình thường.</p>
    ${nwHtml(p)}
  </section>
  <section class="panel">
    <label for="rans"><b>Em đọc</b></label>
    <textarea id="rans" lang="ja" style="min-height:110px" placeholder="Bấm Đọc rồi đọc cả đoạn. Hoặc gõ cách đọc bằng hiragana/katakana hoặc Romaji. Xong bấm Chấm bài đọc." autocomplete="off" spellcheck="false"></textarea>
    <div class="row"><button class="btn" id="rmic" ${SR ? '' : 'hidden'}>${ICON.mic}<span>Đọc</span></button><button class="btn primary" id="rsend">Chấm bài đọc</button></div>
    ${helpBox()}
    <p class="small muted" id="rmicNote">${SR ? '' : 'Trình duyệt này không có micro tự nhận giọng (nên dùng Chrome hoặc Edge). '}Nút “Đọc” dùng micro của trình duyệt (Chrome, Edge). Nếu không chạy, em dùng micro của bàn phím (điện thoại) hoặc Windows+H để đọc vào ô trên, hoặc gõ cách đọc bằng hiragana. Máy nghe liên tục cho đến khi em bấm “Đọc” lần nữa để dừng, và không tự chấm. Em sửa chữ nếu máy nghe sai rồi mới bấm Chấm bài đọc.</p>
  </section>`;
                $('#bk').onclick = backList;
                $('#rplay').onclick = () => playPassage(p, $('#rslow').checked);
                $('#rsend').onclick = () => submitR($('#rans').value);
                if (SR)
                    $('#rmic').onclick = () => toggleMic({
                        btn: '#rmic',
                        ta: '#rans',
                        note: '#rmicNote',
                        cont: true,
                        label: 'Đọc'
                    });
            }
            function submitR(text) {
                stopSpeak();
                spkOn = false;
                if (!String(text).trim()) {
                    $('#rans').focus();
                    return
                }
                const p = rcur.p;
                const g = gradeRead(p, text);
                const s = store['R:' + p.id] || {
                    n: 0,
                    best: 0
                };
                s.n++;
                s.best = Math.max(s.best, g.total);
                s.last = text;
                store['R:' + p.id] = s;
                save();
                renderRResult(text, g);
            }
            const GN = {
                h: ['Chữ Hán', 'var(--red)'],
                k: ['Katakana', 'var(--blue)'],
                i: ['Hiragana', 'var(--accent)']
            };
            function renderRResult(text, g) {
                const p = rcur.p;
                const [lab,cls] = labelOf(g.total);
                const bar = k => `<div class="gbar"><span class="small"><b>${GN[k][0]}</b></span><div class="track"><i style="width:${g[k].pct}%;background:${GN[k][1]}"></i></div><span class="small"><b>${g[k].pct}%</b></span></div>`;
                const errs = g.errs.slice(0, 14).map(e => `<div class="ded"><span class="code" style="background:var(--surface)">${GN[e.g][0]}</span><span class="jp">${esc(e.word)}</span> → máy nghe được: <span class="jp">${e.seg ? esc(e.seg) : '(không có)'}</span><br><span class="small">${e.lab.map(esc).join(' · ')}</span></div>`).join('');
                const tal = Object.entries(g.tally).sort( (a, b) => b[1] - a[1]).map( ([k,v]) => `${esc(k)} (${v} lần)`).join('; ');
                $('#vR').innerHTML = rhead() + `
  <section class="panel res ${cls}">
    <div class="big"><span class="pct">${g.total}%</span><span class="lab">${lab}</span></div>
    <p class="small muted">Tổng theo tỷ trọng thi thật: Chữ Hán ${CFG.wt[0]}%, Katakana ${CFG.wt[1]}%, Hiragana ${CFG.wt[2]}%. ${CFG.partial ? 'Từ Hán và Katakana được tính một phần theo số chữ đọc đúng.' : 'Từ Hán và Katakana chỉ đúng khi đọc đúng toàn bộ từ.'} Máy chỉ so chữ nhận được với bản mẫu nên có thể nghe sai; em dùng để tự luyện, không phải điểm thi.</p>
    <div class="sec"><h3>1 · Ba nhóm</h3>${bar('h')}${bar('k')}${bar('i')}<p class="small muted">Chữ Hán: đúng ${g.h.right}/${g.h.n} từ. Katakana: đúng ${g.k.right}/${g.k.n} từ. Hiragana: đúng ${g.i.ok}/${g.i.n} chữ.</p></div>
    <div class="sec"><h3>2 · Máy nghe được</h3><div class="said">${esc(text)}</div></div>
    <div class="sec"><h3>3 · Chỗ cần sửa</h3>${errs || '<div class="ded ok">Em đọc khớp hoàn toàn với bản mẫu.</div>'}${g.errs.length > 14 ? `<p class="small muted">Còn ${g.errs.length - 14} chỗ nữa. Em đọc lại từ đầu sẽ thấy rõ hơn.</p>` : ''}</div>
    ${tal ? `<div class="sec"><h3>4 · Lỗi em hay gặp</h3><p>${tal}</p></div>` : ''}
    <div class="sec"><h3>${tal ? '5' : '4'} · Bản mẫu có cách đọc</h3><div class="passage jp" id="refp">${refPassage(p, g.st)}</div><p class="small muted">Chữ đỏ là chỗ máy chưa nghe khớp. ${F133 ? 'Cách đọc nhỏ ở trên đầu chữ Hán.' : 'Trợ từ có cách đọc nhỏ ở trên đầu.'}</p>${nwHtml(p)}
    <div class="row"><button class="btn" id="rplay">${ICON.spk}<span>Nghe mẫu</span></button></div></div>
  </section>
  <div class="row"><button class="btn" id="ragain">Đọc lại đoạn này</button><button class="btn primary" id="rnext">${rcur.i >= rl().length - 1 ? 'Về danh sách' : 'Đoạn tiếp theo'}</button></div>`;
                $('#bk').onclick = backList;
                $('#rplay').onclick = () => {
                    const ps = [...document.querySelectorAll('#refp')];
                    if (spkOn) {
                        stopSpeak();
                        spkOn = false;
                        $('#rplay span').textContent = 'Nghe mẫu';
                        return
                    }
                    spkOn = true;
                    $('#rplay span').textContent = 'Dừng';
                    speakSeq(p.tts, {
                        onEnd: () => {
                            spkOn = false;
                            const b = $('#rplay');
                            if (b)
                                b.querySelector('span').textContent = 'Nghe mẫu'
                        }
                    })
                }
                ;
                $('#ragain').onclick = renderRAsk;
                $('#rnext').onclick = () => {
                    if (rcur.i >= rl().length - 1)
                        backList();
                    else {
                        rcur.i++;
                        rcur.p = rl()[rcur.i];
                        renderRAsk();
                        window.scrollTo(0, 0)
                    }
                }
                ;
                window.scrollTo(0, 0);
            }

            /* gợi ý trình duyệt／thiết bị */
            (function() {
                const UA = navigator.userAgent || '';
                const inApp = /(Zalo|FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|MicroMessenger|TikTok|Twitter|KAKAOTALK)/i.test(UA);
                const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(UA) || (navigator.maxTouchPoints > 1 && innerWidth < 900);
                if (inApp)
                    $('#appBanner').hidden = false;
                if (mobile && !inApp && !store._pcOff)
                    $('#pcBanner').hidden = false;
                $('#pcOff').onclick = () => {
                    $('#pcBanner').hidden = true;
                    store._pcOff = 1;
                    save()
                }
                ;
                $('#copyUrl').onclick = async e => {
                    const b = e.currentTarget;
                    try {
                        await navigator.clipboard.writeText(location.href);
                        b.textContent = 'Đã sao chép. Dán vào Chrome hoặc Safari.'
                    } catch (x) {
                        const t = document.createElement('textarea');
                        t.value = location.href;
                        document.body.appendChild(t);
                        t.select();
                        try {
                            document.execCommand('copy');
                            b.textContent = 'Đã sao chép. Dán vào Chrome hoặc Safari.'
                        } catch (y) {
                            b.textContent = location.href
                        }
                        t.remove()
                    }
                }
                ;
            }
            )();
            screen('rList');
            refresh();
