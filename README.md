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
- [Tự tạo loại thẻ từ vựng trong Anki](#tự-tạo-loại-thẻ-từ-vựng-trong-anki)
- [Từ điển: có sẵn và thêm từ điển của bạn](#từ-điển-có-sẵn-và-thêm-từ-điển-của-bạn)
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
- **Tắt trên từng trang**: ví dụ trang công ty, trang chat.
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
| **⌥ Option + A** (macOS) / **Alt + A** (Windows, Linux) | Tra từ đang bôi đen, hoặc từ dưới con trỏ chuột |
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

## Tự tạo loại thẻ từ vựng trong Anki

Tiện ích luôn lưu vào loại thẻ `EN-VI Vocab` và **ghi đè mẫu thẻ (template) và CSS của nó mỗi khi tiện ích cập nhật giao diện thẻ**. Nếu muốn một kiểu thẻ riêng, hãy tạo một loại thẻ mới thay vì sửa `EN-VI Vocab`:

1. **Tools → Manage Note Types → Add**.
2. Chọn **Clone: EN-VI Vocab** (giữ nguyên các trường) hoặc **Add: Basic (type in the answer)** (thẻ gõ đáp án đơn giản) → đặt tên, ví dụ `Từ vựng của tôi`.
3. Bấm **Fields…** để thêm / đổi tên trường, ví dụ: `Word`, `Meaning`, `Example`, `Audio`.
4. Bấm **Cards…** để sửa mẫu:
   - *Front Template*, ví dụ: `{{Word}} {{Audio}} {{type:Meaning}}`
   - *Back Template*, ví dụ: `{{FrontSide}}<hr id=answer>{{Meaning}}<br>{{Example}}`
   - *Styling*: CSS cho thẻ (màu, cỡ chữ…).
5. Để chuyển thẻ cũ sang loại mới: **Browse** → chọn thẻ → **Notes → Change Note Type…**.

> Phiên bản sau của tiện ích sẽ cho chọn loại thẻ và ghép trường (giống ODH).

## Từ điển: có sẵn và thêm từ điển của bạn

`npm run dict` tạo từ điển offline từ các nguồn trong **`dictionaries.json`**. Nguồn mặc định là các từ điển **mở** (được phép chia sẻ):

| Hướng | Từ điển | Ghi chú |
|---|---|---|
| Anh → Việt | [skypediacode/english-vietnamese-dictionary](https://github.com/skypediacode/english-vietnamese-dictionary) | ~105.000 từ, IPA và ví dụ cho mọi nghĩa; CC BY-SA 4.0 |
| Việt → Anh | OVDP, Hồ Ngọc Đức, VNEDICT (qua [thu-tram/viet-yomitan](https://github.com/thu-tram/viet-yomitan)) | ~60.000 từ |
| Dạng từ | WordNet 3.1 (gói npm `wordnet-db`) | Họ từ: danh/động/tính/trạng từ |

### Thêm từ điển

1. Chép file từ điển vào thư mục **`dictionaries/`** (không đưa lên git).
2. Tạo file **`dictionaries.local.json`** (không đưa lên git), ví dụ:

   ```json
   {
     "en-vi": [
       { "name": "Lingoes English-Vietnamese", "type": "lingoes", "file": "dictionaries/ev.ld2" },
       { "name": "Free English-Vietnamese", "type": "lingoes-html", "file": "dictionaries/free.ld2" },
       { "name": "Prodict technical", "type": "lingoes-technical", "file": "dictionaries/prodict.ld2" },
       { "name": "Từ của tôi", "type": "tsv", "file": "dictionaries/my-words.tsv", "first": true }
     ],
     "vi-en": [
       { "name": "Babylon Vietnamese-English (licence unclear — personal use)", "enabled": true }
     ]
   }
   ```

3. Chạy `npm run dict` rồi `npm run build:data` và bấm ↻ trên tiện ích.

**Thứ tự ưu tiên:** nguồn đứng trước thắng. Nguồn của bạn mặc định đứng **sau** nguồn có sẵn (chỉ bổ sung từ còn thiếu); thêm `"first": true` để nó đứng **trước**. Muốn bật một nguồn có sẵn đang tắt, ghi đúng `name` của nó với `"enabled": true`.

**Định dạng hỗ trợ:**

| `type` | Dùng cho |
|---|---|
| `lingoes` | File Lingoes `.ld2` dạng văn bản (`@từ /ipa/`, `*từ loại`, `-nghĩa`), ví dụ *Lingoes English-Vietnamese* |
| `lingoes-html` | File Lingoes `.ld2` dạng HTML, ví dụ *Free English-Vietnamese Dictionary* |
| `lingoes-technical` | Từ điển chuyên ngành dạng Prodict: thêm mục *Technical* |
| `tsv` | File văn bản, mỗi dòng: `từ<TAB>nghĩa 1; nghĩa 2<TAB>/ipa/<TAB>từ loại` (2 cột cuối không bắt buộc). Với `vi-en`: `từ tiếng Việt<TAB>english, english` |
| `yomitan` | File `.zip` của Yomitan/Yomichan (Việt → Anh); `"style"`: `definitions`, `words`, `babylon`, `spdict` |

### Gợi ý từ điển nên thêm

- **Lingoes English-Vietnamese**, **Free English-Vietnamese** và **Prodict (chuyên ngành kỹ thuật, CNTT)** — file `.ld2` từ thư viện từ điển của [Lingoes](http://www.lingoes.net). Bổ sung ~30.000 từ và cụm từ, cùng hơn 200.000 thuật ngữ chuyên ngành.
- **Apple, Babylon, SPDict Việt → Anh** — có sẵn trong `dictionaries.json` nhưng đang tắt; bật bằng `"enabled": true` (tăng lên ~126.000 từ tiếng Việt, thêm thuật ngữ kỹ thuật).
- **Từ điển Lạc Việt** (định dạng Yomitan) — link trong [README của viet-yomitan](https://github.com/thu-tram/viet-yomitan).
- **Danh sách từ của riêng bạn** — file `tsv`, ví dụ từ vựng IELTS, thuật ngữ công việc; đặt `"first": true` để nghĩa của bạn được ưu tiên.

> ⚖️ Lingoes, Prodict, Apple, Babylon, Lạc Việt **không phải** từ điển mở: chỉ dùng cho cá nhân, **không** đưa dữ liệu của chúng lên git hay phát hành lại. `npm run package` sẽ từ chối đóng gói khi từ điển có nguồn riêng tư.

## Cài đặt của tiện ích

**Bấm biểu tượng tiện ích** trên thanh công cụ:

| Mục | Ý nghĩa |
|---|---|
| Enabled | Bật / tắt toàn bộ tiện ích |
| On *trang này* | Bật / tắt riêng trang web đang xem |
| Mouse (double-click) | Tắt thì chỉ phím tắt ⌥A / Alt+A hoạt động |
| Deck | Bộ thẻ Anki để lưu (danh sách lấy từ Anki) |
| Tags | Nhãn gắn vào mỗi thẻ, cách nhau bằng dấu phẩy |

**`chrome://extensions` → Anki Quick Add → Details → Extension options** có thêm:

- **Danh sách trang bị tắt**, mỗi dòng một mẫu:
  - `example.com` — trang đó và mọi tên miền con (`www.example.com`, `chat.example.com`)
  - `*.example.com` — chỉ các tên miền con
  - `example.com/chat` — chỉ các địa chỉ bắt đầu bằng đường dẫn này
  - `https://example.com/page` — dán nguyên địa chỉ cũng được
  - `192.168.1.10:8080` — địa chỉ có cổng
- **Record detailed logs** và **Logs** — để tìm lỗi.

Trang được thêm vào danh sách khi bạn bấm **⊘** trong bong bóng hoặc tắt *On trang này* trong popup.

## Quyền riêng tư

Tiện ích không có máy chủ riêng, không thu thập dữ liệu. Những gì được gửi đi:

| Đến | Khi nào | Gửi gì |
|---|---|---|
| Anki trên máy bạn (`127.0.0.1:8765`) | Lưu thẻ, xem danh sách bộ thẻ | Nội dung thẻ, âm thanh |
| translate.google.com | Phát âm, lưu âm thanh | Từ / câu cần đọc |
| translate.googleapis.com | Từ hoặc cụm không có trong từ điển offline | Từ / cụm cần dịch |
| oxfordlearnersdictionaries.com | Từ không có trong từ điển offline | Từ cần tra |
| ozdic.com | Bấm *Collocations* | Từ cần tra |

Không gửi cookie. Địa chỉ trang bạn đang đọc chỉ được lưu vào thẻ Anki trên máy bạn; riêng khi bấm 🔊 trong bong bóng, trình duyệt có thể gửi kèm tên miền của trang (Referer) tới Google. Chi tiết: [PRIVACY.md](PRIVACY.md).

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
  pages/       popup và trang Options
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
