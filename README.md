# Anki Quick Add (Anh ⇄ Việt)

**Tiếng Việt** | [English](README.en.md)

Tiện ích Chrome giúp bạn học từ vựng tiếng Anh ngay khi đọc báo, tài liệu: **nhấp đúp vào một từ** để xem nghĩa tiếng Việt, phát âm, các dạng từ, rồi **lưu thành thẻ Anki** chỉ với một cú nhấp. Từ điển chạy **offline**, không cần tài khoản.

![Bong bóng tra từ](store/screenshot-1.png)

## Mục lục

- [Tính năng](#tính-năng)
- [Cài đặt](#cài-đặt)
- [Chuẩn bị Anki](#chuẩn-bị-anki)
- [Cách dùng](#cách-dùng)
- [Thẻ Anki được tạo ra](#thẻ-anki-được-tạo-ra)
- [Học với Anki — hướng dẫn nhanh](#học-với-anki--hướng-dẫn-nhanh)
- [Dùng loại thẻ của riêng bạn](#dùng-loại-thẻ-của-riêng-bạn)
- [Từ điển: có sẵn và thêm từ điển của bạn](#từ-điển-có-sẵn-và-thêm-từ-điển-của-bạn)
- [Script tra từ](#script-tra-từ)
- [Cài đặt của tiện ích](#cài-đặt-của-tiện-ích)
- [Quyền riêng tư](#quyền-riêng-tư)
- [Dành cho lập trình viên](#dành-cho-lập-trình-viên)
- [Nguồn dữ liệu và giấy phép](#nguồn-dữ-liệu-và-giấy-phép)

## Tính năng

- **Tra từ tiếng Anh → tiếng Việt**: nghĩa theo từ loại, phiên âm IPA, phát âm, câu ví dụ, nghĩa chuyên ngành.
- **Dạng từ (word family)**: *necessary → necessity, necessarily…* kèm phiên âm, ví dụ và phát âm từng dạng.
- **Cụm nhiều từ**: bôi đen 2–8 từ (*not necessarily*, *take into account*) để tra cả cụm.
- **Từ tiếng Việt → tiếng Anh**: nhấp đúp vào từ tiếng Việt, chọn từ tiếng Anh muốn học.
- **Collocations** (cụm từ hay đi kèm) từ [ozdic.com](https://ozdic.com): chọn một cụm, câu ví dụ của nó thành câu trên thẻ.
- **Từ chưa có trong từ điển offline**: tự tra trên Oxford Learner's Dictionaries và dịch bằng Google Translate.
- **Lưu vào Anki**: sửa mặt trước, đáp án, câu ví dụ (in đậm, gạch chân, tô sáng) rồi bấm *Save to Anki*. Âm thanh của từ, các dạng từ và câu ví dụ được lưu kèm thẻ.
- **Nhiều từ điển cùng lúc**: thêm từ điển của bạn (Lingoes `.ld2`, StarDict, Yomitan, TSV, hoặc file `.zip` chứa nhiều từ điển) ngay trong trang Options; mỗi từ điển hiện một mục riêng trong bong bóng.
- **Script tra từ của riêng bạn** (JavaScript / TypeScript), chạy trong sandbox.
- **Tuỳ chỉnh thẻ**: bật/tắt từng phần của thẻ, hoặc dùng **loại thẻ (note type) của riêng bạn** và chọn dữ liệu cho từng trường. Giọng đọc Mỹ hoặc Anh.
- **Tắt trên từng trang**: ví dụ trang công ty, trang chat — một cú nhấp từ biểu tượng tiện ích.
- **CSS riêng** cho bong bóng tra từ.
- Giao diện sáng/tối, an toàn: bong bóng tra từ tách biệt khỏi trang web (xem [SECURITY.md](SECURITY.md)).

## Cài đặt

### Cách 1 — Tải bản đóng gói sẵn (dễ nhất)

1. Vào trang **Releases** của repo, tải `anki-quick-add-<phiên bản>.zip` và giải nén ra một thư mục.
2. Mở Chrome → gõ `chrome://extensions` → bật **Developer mode** (góc trên bên phải).
3. Bấm **Load unpacked** → chọn thư mục vừa giải nén.
4. Ghim tiện ích lên thanh công cụ (biểu tượng mảnh ghép 🧩 → ghim *Anki Quick Add*).

> Khi tiện ích có trên Chrome Web Store, bạn chỉ cần bấm *Thêm vào Chrome*.

### Cách 2 — Tự build từ mã nguồn

Cần: [Node.js](https://nodejs.org) 20 trở lên, Python 3.9 trở lên, `git`.

```bash
git clone <địa chỉ repo> anki-quick-add
cd anki-quick-add
npm install          # dùng registry công khai npmjs.org (xem .npmrc)
npm run dict         # tải và build từ điển offline vào data/dict (lần đầu mất vài phút)
npm run build        # build tiện ích vào thư mục dist/
```

Sau đó làm bước 2–4 ở Cách 1 nhưng chọn thư mục **`dist/`**.

**Cập nhật:** `git pull` → `npm install` → `npm run build` → bấm ↻ trên thẻ tiện ích trong `chrome://extensions` → tải lại các tab đang mở.

## Chuẩn bị Anki

Tiện ích lưu thẻ vào **Anki trên máy tính** qua add-on **AnkiConnect**.

1. Cài [Anki](https://apps.ankiweb.net) (Windows, macOS, Linux).
2. Trong Anki: **Tools → Add-ons → Get Add-ons…** → nhập mã **`2055492159`** (AnkiConnect) → **OK** → khởi động lại Anki.
3. **Để Anki mở** khi bạn lưu thẻ (có thể thu nhỏ cửa sổ).
4. Lần lưu thẻ đầu tiên, Anki hiện hộp thoại hỏi có cho tiện ích truy cập không → bấm **Yes**.

Tiện ích tự tạo bộ thẻ (deck, mặc định `English`) và loại thẻ **`EN-VI Vocab`**.

> **Lưu ý:** khi cửa sổ **Browse / Add / Edit / Cards** của Anki đang mở, AnkiConnect không cho tiện ích cập nhật mẫu thẻ. Hãy đóng các cửa sổ đó nếu tiện ích báo lỗi.

## Cách dùng

| Thao tác | Kết quả |
|---|---|
| **Nhấp đúp** vào một từ | Mở bong bóng tra từ |
| **Bôi đen 2–8 từ** bằng chuột | Tra cả cụm (từ điển offline, nếu không có thì Google Translate) |
| **⌥ Option + A** (macOS) / **Alt + A** (Windows, Linux) — mặc định | Tra từ đang bôi đen, hoặc từ dưới con trỏ chuột |
| Hoặc **một phím** Shift / Ctrl / Option (Alt) / Command — chọn trong Options | Nhấn riêng phím đó khi trỏ chuột vào một từ (giống ODH) |
| **Esc** hoặc nhấp ra ngoài | Đóng bong bóng |

Trong bong bóng:

- 🔊 nghe phát âm; mỗi dạng từ có nút phát âm riêng.
- **Collocations** — xem các cụm từ hay đi kèm (ozdic.com), bấm một cụm để làm thẻ cho cụm đó.
- **+ Anki** — mở trình soạn thẻ:
  - **Front**: từ hoặc cụm từ ở mặt trước.
  - **Answer (Vietnamese)**: đáp án ngắn bạn sẽ gõ khi ôn (đã điền sẵn).
  - **Sentence**: câu ví dụ lấy từ trang web; bôi đen chữ rồi bấm **B / I / U / Highlight** để định dạng.
  - **Save to Anki** — lưu thẻ.
- **⊘** — tắt tiện ích trên trang web này (trang được thêm vào danh sách chặn).

![Trình soạn thẻ](store/screenshot-2.png)

## Thẻ Anki được tạo ra

Mỗi thẻ dùng loại thẻ **`EN-VI Vocab`**:

- **Mặt trước:** từ, phiên âm, từ loại, âm thanh của từ (tự phát), **ô để gõ đáp án**, câu ví dụ (từ được tô sáng) với đường link bài báo ngay bên dưới, các dạng từ khác kèm ví dụ.
- **Mặt sau:** so sánh đáp án bạn gõ với đáp án đúng, đáp án, câu ví dụ kèm âm thanh, giải thích (nếu có), tất cả các nghĩa, các dạng từ (có nút ▶ phát âm từng dạng), nghĩa chuyên ngành.

![Mặt trước và mặt sau của thẻ](store/screenshot-3.png)

> Ô gõ đáp án chỉ xuất hiện khi bạn **học** (Study). Trong *Browse → Preview* Anki không vẽ ô này — thẻ hiện dòng gợi ý thay thế.

| Trường (field) | Nội dung |
|---|---|
| Word | Mặt trước (từ hoặc cụm từ) |
| IPA, POS, Audio | Phiên âm, từ loại, âm thanh của từ |
| Answer | Đáp án tiếng Việt (gõ ở mặt trước, hiện ở mặt sau) |
| Sentence, SentenceSound | Câu ví dụ và âm thanh của câu |
| Forms | Các dạng từ khác (phiên âm, ví dụ, ▶) |
| Meanings, Technical | Tất cả nghĩa, nghĩa chuyên ngành |
| Explanation, Level | Giải thích tiếng Anh và cấp độ CEFR (tự điền khi từ lấy từ Oxford; còn lại bạn tự điền nếu muốn) |
| Source | Link bài báo (tiêu đề trang) |
| Media, Data | Ẩn: danh sách file âm thanh (để *Check Media* không xoá) và dữ liệu gốc |

## Học với Anki — hướng dẫn nhanh

Anki dùng **lặp lại ngắt quãng** (spaced repetition): thẻ bạn nhớ tốt sẽ xuất hiện thưa dần, thẻ hay quên sẽ quay lại sớm.

1. **Học mỗi ngày.** Mở Anki → bấm vào bộ thẻ (ví dụ `English`) → **Study Now**. 10–15 phút/ngày hiệu quả hơn học dồn.
2. **Mặt trước:** nghe từ, đọc câu ví dụ, **gõ nghĩa tiếng Việt** vào ô rồi nhấn **Enter**.
3. **Mặt sau:** Anki tô xanh phần đúng, đỏ phần sai. Tự chấm:
   - **Again** — quên: thẻ quay lại ngay trong buổi học.
   - **Hard** — nhớ nhưng rất chật vật.
   - **Good** — nhớ được (chọn nút này nhiều nhất).
   - **Easy** — quá dễ: lần sau sẽ lâu hơn nhiều.
4. **Giới hạn thẻ mới:** biểu tượng ⚙ cạnh bộ thẻ → **Options** → *New cards/day* (gợi ý 10–20), *Maximum reviews/day* (gợi ý 200).
5. **Học trên điện thoại:** tạo tài khoản [AnkiWeb](https://ankiweb.net) miễn phí, bấm **Sync** trong Anki, rồi cài **AnkiDroid** (Android, miễn phí) hoặc **AnkiMobile** (iOS). Lưu thẻ trên máy tính, ôn trên điện thoại.
6. **Mẹo:** bật thuật toán **FSRS** (Options → *Advanced* → FSRS) để lịch ôn chính xác hơn; thêm *tag* (ví dụ `ielts`, `work`) để lọc thẻ khi cần.

## Dùng loại thẻ của riêng bạn

Mặc định tiện ích dùng loại thẻ `EN-VI Vocab` ở trên. Bạn có hai cách tuỳ chỉnh, đều ở **Options → Services**:

**1. Bật/tắt từng phần của thẻ `EN-VI Vocab`** — bỏ chọn những gì không cần: phiên âm, từ loại, âm thanh, ô gõ đáp án, câu ví dụ, âm thanh câu, dạng từ, nghĩa, nghĩa chuyên ngành, giải thích, link bài báo. Phần bị tắt để trống nên không hiện trên thẻ.

> Đừng sửa mẫu (template) của `EN-VI Vocab` trong Anki: tiện ích ghi đè mẫu và CSS mỗi khi cập nhật giao diện thẻ. Muốn kiểu thẻ khác thì dùng cách 2.

**2. Dùng loại thẻ của riêng bạn**

1. Trong Anki: **Tools → Manage Note Types → Add** → chọn **Add: Basic (type in the answer)** (hoặc *Clone: EN-VI Vocab*) → đặt tên, ví dụ `Từ vựng của tôi`.
2. **Fields…** — đặt các trường bạn muốn, ví dụ `Word`, `Meaning`, `Example`, `Audio`.
3. **Cards…** — sửa mẫu, ví dụ:
   - *Front Template*: `{{Word}} {{Audio}} {{type:Meaning}}`
   - *Back Template*: `{{FrontSide}}<hr id=answer>{{Meaning}}<br>{{Example}}`
   - *Styling*: CSS của thẻ.
4. Trong **Options → Services → Note type**, chọn loại thẻ vừa tạo. Bảng bên dưới liệt kê từng trường; chọn dữ liệu cho mỗi trường (tiện ích tự đoán theo tên trường):

   | Dữ liệu | Nội dung |
   |---|---|
   | Word / phrase | Mặt trước (từ hoặc cụm) |
   | Answer | Đáp án tiếng Việt |
   | IPA, Part of speech | Phiên âm, từ loại |
   | Word audio / Sentence audio | `[sound:…]` (âm thanh được lưu vào Anki) |
   | Sentence | Câu ví dụ (HTML, từ được tô sáng) |
   | Meanings (HTML) / Meanings (plain text) | Nghĩa của mọi từ điển / nghĩa dạng chữ thường |
   | Word forms, Technical meanings | Các dạng từ, nghĩa chuyên ngành |
   | Explanation, CEFR level | Từ Oxford (khi có) |
   | Article link, Page address, Page title | Nguồn bài báo |

5. Thẻ cũ có thể chuyển sang loại mới: **Browse** → chọn thẻ → **Notes → Change Note Type…**.

**Allow duplicates** (mặc định tắt): khi tắt, từ đã có trong bộ sưu tập sẽ không được thêm lần nữa.

## Từ điển: có sẵn và thêm từ điển của bạn

Tiện ích có sẵn từ điển offline (**Built-in**):

| Hướng | Từ điển | Ghi chú |
|---|---|---|
| Anh → Việt | [skypediacode/english-vietnamese-dictionary](https://github.com/skypediacode/english-vietnamese-dictionary) | ~105.000 từ, IPA và ví dụ cho mọi nghĩa; CC BY-SA 4.0 |
| Việt → Anh | OVDP, Hồ Ngọc Đức, VNEDICT (qua [thu-tram/viet-yomitan](https://github.com/thu-tram/viet-yomitan)) | ~60.000 từ |
| Dạng từ | WordNet 3.1 (gói npm `wordnet-db`) | Họ từ: danh/động/tính/trạng từ |

### Thêm từ điển (trong trang Options)

![Danh sách từ điển trong Options](store/screenshot-4.png)

1. Bấm biểu tượng tiện ích → **All options…** → tab **Extension** → mục **Dictionaries**.
2. Bấm **Add dictionary files…** và chọn một hoặc nhiều file — hoặc một file **`.zip`** chứa nhiều từ điển (zip lồng nhau cũng được).
3. Với mỗi từ điển tìm thấy: kiểm tra **tên** và **hướng** (Anh → Việt hay Việt → Anh, tiện ích tự đoán) → bấm **Import**. File lớn (200.000+ từ) mất khoảng 20–30 giây.
4. Trong danh sách: bật/tắt bằng công tắc, đổi thứ tự bằng ↑ ↓ (từ điển trên cùng là kết quả chính: phiên âm, đáp án gợi ý), **Delete** để xoá. Từ điển Built-in không xoá được nhưng có thể tắt.

Từ điển được lưu trong trình duyệt (IndexedDB) trên máy này, không đưa lên mạng.

**Định dạng hỗ trợ:**

| Định dạng | File |
|---|---|
| Lingoes | `.ld2` — dạng văn bản (`@từ /ipa/`, `*từ loại`, `-nghĩa`), dạng HTML, và từ điển chuyên ngành kiểu Prodict (thành mục *Technical*) — tự nhận ra |
| StarDict | `.ifo` + `.idx` (hoặc `.idx.gz`) + `.dict` (hoặc `.dict.dz`) — chọn cả 3 file, hoặc nén chung vào `.zip` |
| Yomitan / Yomichan | `.zip` có `index.json` + `term_bank_*.json` |
| TSV / TXT | Mỗi dòng: `từ<TAB>nghĩa 1; nghĩa 2<TAB>/ipa/<TAB>từ loại` (2 cột cuối không bắt buộc). Việt → Anh: `từ tiếng Việt<TAB>english, english` |

### Gợi ý từ điển nên thêm

- **Lingoes English-Vietnamese**, **Free English-Vietnamese** và **Prodict (chuyên ngành kỹ thuật, CNTT)** — file `.ld2` từ thư viện từ điển của [Lingoes](http://www.lingoes.net). Bổ sung ~30.000 từ và cụm từ, cùng hơn 200.000 thuật ngữ chuyên ngành.
- **Apple, Babylon, SPDict Việt → Anh**, **Từ điển Lạc Việt** — file Yomitan `.zip` trong [thu-tram/viet-yomitan](https://github.com/thu-tram/viet-yomitan) (tải `dictionaries/<tên>.zip` rồi Import).
- **Từ điển StarDict** Anh–Việt / Việt–Anh của dự án *Free Vietnamese Dictionary Project* (Hồ Ngọc Đức) hoặc OVDP.
- **Danh sách từ của riêng bạn** — file TSV, ví dụ từ vựng IELTS, thuật ngữ công việc; kéo lên đầu danh sách để nghĩa của bạn được ưu tiên.

> ⚖️ Lingoes, Prodict, Apple, Babylon, Lạc Việt **không phải** từ điển mở: chỉ dùng cho cá nhân, **không** đưa dữ liệu của chúng lên git hay phát hành lại.

### Dành cho người build từ mã nguồn

Từ điển Built-in được tạo bằng `npm run dict` từ **`dictionaries.json`** (chỉ nguồn mở). Muốn gộp sẵn từ điển của bạn vào Built-in (không cần Import trên từng máy): chép file vào `dictionaries/`, liệt kê trong **`dictionaries.local.json`** (không đưa lên git) rồi chạy `npm run dict` → `npm run build:data`:

```json
{
  "en-vi": [
    { "name": "Lingoes English-Vietnamese", "type": "lingoes", "file": "dictionaries/ev.ld2" },
    { "name": "Free English-Vietnamese", "type": "lingoes-html", "file": "dictionaries/free.ld2" },
    { "name": "Prodict technical", "type": "lingoes-technical", "file": "dictionaries/prodict.ld2" }
  ],
  "vi-en": [
    { "name": "Babylon Vietnamese-English (licence unclear — personal use)", "enabled": true }
  ]
}
```

Kiểu (`type`): `lingoes`, `lingoes-html`, `lingoes-technical`, `tsv`, `yomitan` (`"style"`: `definitions`, `words`, `babylon`, `spdict`). Nguồn của bạn đứng sau nguồn có sẵn (chỉ bổ sung từ còn thiếu); `"first": true` để đứng trước. `npm run package` luôn dùng nguồn mở, không bao giờ đóng gói `dictionaries.local.json`.

## Script tra từ

Script là từ điển bạn tự viết (JavaScript hoặc TypeScript) — ví dụ lấy nghĩa từ một trang web hay API. **Options → Scripts → User scripts**:

1. **New script** (mẫu trống) hoặc **Add example (Free Dictionary)** (ví dụ TypeScript dùng api.dictionaryapi.dev).
2. Viết hàm `lookup(word, api)`:

   ```ts
   // @name Từ điển của tôi
   // @host https://example.com
   async function lookup(word: string, api) {
     const doc = api.html(await api.fetch(`https://example.com/search?q=${encodeURIComponent(word)}`));
     const meanings = [...doc.querySelectorAll('.meaning')].map((e) => e.textContent.trim());
     return meanings.length ? { ipa: '', groups: [{ pos: 'noun', meanings, examples: [] }] } : null;
   }
   ```

   - `// @name` — tên hiện trong bong bóng; `// @host` — các trang script được phép tải (có thể nhiều dòng).
   - `api.fetch(url)` → chữ, `api.json(url)` → JSON, `api.html(text)` → Document để dùng `querySelector`.
   - Trả về `{ ipa?, groups: [{ pos?, meanings: [...], examples?: [...] }] }` hoặc `null`.
3. **Save** — Chrome hỏi bạn cho phép truy cập các trang trong `@host`. **Test** để thử với một từ.
4. Bật/tắt và sắp xếp script trong danh sách từ điển (tab **Extension**). Kết quả script hiện thành một mục riêng trong bong bóng và được lưu vào thẻ.

An toàn: script chạy trong một trang **sandbox** riêng — không truy cập được tiện ích, trang web bạn đang đọc hay cookie; chỉ tải được các trang trong `@host` mà bạn đã cho phép; kết quả chỉ là chữ thuần.

**System scripts** (cùng tab): bật/tắt các trợ giúp trực tuyến có sẵn — Oxford (từ không có offline), Google Translate (cụm từ), Collocations (ozdic). Tắt hết để chỉ dùng offline.

## Cài đặt của tiện ích

**Bấm biểu tượng tiện ích** trên thanh công cụ (cài đặt nhanh):

| Mục | Ý nghĩa |
|---|---|
| *tên trang* + **Block this site** / **Unblock** | Tắt / bật lại tiện ích trên trang đang xem chỉ với một cú nhấp |
| Enabled | Bật / tắt toàn bộ tiện ích |
| Mouse (double-click, select) | Tắt thì chỉ phím tắt hoạt động |
| Deck, Tags | Bộ thẻ Anki và nhãn cho thẻ mới |
| **All options…** | Mở trang Options đầy đủ |

**Trang Options** (từ popup, hoặc `chrome://extensions` → Anki Quick Add → Details → Extension options) có 4 tab:

| Tab | Nội dung |
|---|---|
| **Extension** | Enabled, Mouse selection, **Hotkey** (⌥A/Alt+A, hoặc một phím Shift/Ctrl/Option/Command nhấn riêng; Off), **Pronunciation** (Mỹ / Anh), **Dictionaries** (danh sách, thứ tự, Import), **Disabled sites** |
| **Services** | Trạng thái AnkiConnect và phiên bản, **Deck**, **Note type** (EN-VI Vocab với các phần bật/tắt, hoặc loại thẻ của bạn + bảng ghép trường), **Tags**, **Allow duplicates** |
| **Scripts** | System scripts (Oxford, Google Translate, Collocations), **User scripts** (viết / sửa / thử), **Custom CSS** cho bong bóng |
| **Logs** | Ghi log chi tiết và xem log để tìm lỗi |

**Danh sách trang bị tắt** (tab Extension), mỗi dòng một mẫu:

- `example.com` — trang đó và mọi tên miền con (`www.example.com`, `chat.example.com`)
- `*.example.com` — chỉ các tên miền con
- `example.com/chat` — chỉ các địa chỉ bắt đầu bằng đường dẫn này
- `https://example.com/page` — dán nguyên địa chỉ cũng được
- `192.168.1.10:8080` — địa chỉ có cổng

Trang cũng được thêm khi bạn bấm **⊘** trong bong bóng hoặc **Block this site** trong popup.

**Custom CSS** (tab Scripts): CSS áp dụng cho bong bóng tra từ, sau CSS mặc định. Ví dụ: `.bubble { width: 460px; font-size: 15px; }`. Các class chính: `.bubble .header .body .footer .word .ipa .label .section .example .dict .btn .chip`.

## Quyền riêng tư

Tiện ích không có máy chủ riêng, không thu thập dữ liệu. Những gì được gửi đi:

| Đến | Khi nào | Gửi gì |
|---|---|---|
| Anki trên máy bạn (`127.0.0.1:8765`) | Lưu thẻ, xem danh sách bộ thẻ | Nội dung thẻ, âm thanh |
| translate.google.com | Phát âm, lưu âm thanh | Từ / câu cần đọc |
| translate.googleapis.com | Từ hoặc cụm không có trong từ điển offline | Từ / cụm cần dịch |
| oxfordlearnersdictionaries.com | Từ không có trong từ điển offline | Từ cần tra |
| ozdic.com | Bấm *Collocations* | Từ cần tra |
| Các trang trong `@host` của script bạn viết | Khi tra từ (nếu script được bật) | Những gì script của bạn gửi (thường là từ cần tra) |

Từ điển bạn import, script và CSS chỉ lưu trong trình duyệt trên máy này. Không gửi cookie. Địa chỉ trang bạn đang đọc chỉ được lưu vào thẻ Anki trên máy bạn; riêng khi bấm 🔊 trong bong bóng, trình duyệt có thể gửi kèm tên miền của trang (Referer) tới Google. Chi tiết: [PRIVACY.md](PRIVACY.md).

## Dành cho lập trình viên

| Lệnh | Việc làm |
|---|---|
| `npm run dict` | Build từ điển offline → `data/dict` (Python 3) |
| `npm run build` | Build TypeScript → `dist/` (esbuild); chép dữ liệu nếu `dist/dict` chưa có |
| `npm run build:data` | Như trên, luôn chép lại dữ liệu từ điển |
| `npm run watch` | Tự build khi sửa code |
| `npm run check` | Kiểm tra kiểu (strict) + lint (luật bảo mật) + unit test |
| `npm run security` | `npm audit` + lint |
| `npm run package` | Đóng gói `release/anki-quick-add-<phiên bản>.zip` cho Chrome Web Store / GitHub Releases |

```
src/
  shared/      kiểu dữ liệu, mặc định (defaults.ts), escape/sanitize HTML, kiểm tra message, mẫu thẻ Anki
  background/  service worker: tra từ điển, AnkiConnect, tạo thẻ, ozdic, Oxford, Google
  content/     content script: ngữ cảnh nhấp, bong bóng (closed shadow DOM), trình soạn câu
  pages/       popup và trang Options (options/: các tab)
  sandbox/     trang sandbox chạy script của người dùng
  offscreen/   trang offscreen chứa sandbox, chuyển message với service worker
  shared/formats/  đọc từ điển: ZIP, Lingoes .ld2, StarDict, Yomitan, TSV
scripts/       build.mjs, package.mjs, make_icons.py, dict/build_dict.py
static/        manifest.json, trang HTML, icon
store/         nội dung và hình ảnh cho Chrome Web Store (xem PUBLISHING.md)
```

- Mặc định khi cài mới (deck, tags, danh sách trang bị tắt): `src/shared/defaults.ts`.
- Đổi giao diện thẻ: `src/shared/note-model.ts`, rồi **tăng `MODEL_VERSION`** — tiện ích cập nhật loại thẻ trong Anki ở lần lưu tiếp theo.
- Phiên bản: tag git `vX.Y.Z` trên nhánh `main`, ghi lại trong [CHANGELOG.md](CHANGELOG.md). Nhánh `local` là bản sao lưu bản 1.0.0.
- Bảo mật: [SECURITY.md](SECURITY.md). Phát hành: [PUBLISHING.md](PUBLISHING.md).

## Nguồn dữ liệu và giấy phép

- Mã nguồn: [MIT](LICENSE).
- Anh → Việt: skypediacode/english-vietnamese-dictionary (CC BY-SA 4.0; từ minhqnd/dictionary, Wiktionary, vntk, Hồ Ngọc Đức, WikDict).
- Việt → Anh: thu-tram/viet-yomitan (OVDP, Hồ Ngọc Đức, VNEDICT…).
- Dạng từ: Princeton WordNet 3.1 (giấy phép WordNet).
- Trực tuyến (không lưu trong tiện ích): Oxford Learner's Dictionaries, Google Translate, ozdic.com.

Tiện ích không liên kết với Anki, AnkiWeb, Oxford University Press, Google hay ozdic.
