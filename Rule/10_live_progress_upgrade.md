# Live Progress — AI Portfolio Factory Upgrade

**Cập nhật:** 13/11/2026 (Asia/Bangkok)  
**Mục tiêu:** checkpoint đầy đủ để agent tiếp theo tiếp tục nếu phiên bị gián đoạn. Đọc file này trước, sau đó đối chiếu [checklist](07_master_task_checklist.md) và [handover](08_b_n_giao_c_ng_vi_c_cho_ai_handover.md).

## Trạng thái hiện tại

Giai đoạn 8–10 đã tích hợp và kiểm tra cục bộ. Còn một kiểm tra ngoài repo cần quyền truy cập Netlify: xác nhận URL sau deploy preview thực tế. Phiên làm việc không có quyền site/deploy nên không thể tự deploy hoặc xác minh URL đó.

## Đã tích hợp

- **Local/public:** local `/` là AI Portfolio Factory; public build trên Netlify `/` render portfolio ngay tại URL gốc, slug cũ vẫn hoạt động. Public mode ẩn/chặn Studio, Batch và các API tạo/chỉnh sửa riêng; giữ `/api/export` cho tải ZIP.
- **DOCX/Batch:** một DOCX có thể có nhiều bài và người dùng chọn từng bài; nhiều DOCX được xử lý thành portfolio tách theo file, mỗi file cũng hỗ trợ nhiều bài. Có đếm bài/ảnh nhận diện, lọc/chọn, folder/CSV, trạng thái/retry theo tác vụ và resume sau refresh.
- **Tách nhánh nhập DOCX (Giai đoạn 10):** Batch và Studio đều có hai luồng tách biệt: nhiều DOCX, mỗi file chọn đúng một bài (thêm/xóa file để đổi số bài); hoặc một DOCX, quét rồi chọn nhiều bài từ cùng tài liệu. CSV Batch mặc định dùng cột không dấu `tenfile,hoten,chucdanh,email`; các cột tiếng Anh cũ vẫn được chấp nhận.
- **Studio:** lưu nhiều draft/history/undo-redo trong IndexedDB, tự khôi phục sau refresh, có backup/restore và importer ZIP. Lỗi quota lưu nháp hiện trạng thái lỗi thực, không báo thành công nhầm.
- **Ảnh:** thư viện chung hỗ trợ file/folder/clipboard; ảnh ở bài này hiện trong thư viện của bài khác và chỉ được gắn khi người dùng chọn. Các vị trí ảnh vẫn là dữ liệu media riêng theo project.
- **ZIP:** manifest có version giữ dữ liệu nguồn và asset. Studio import ZIP mới thành draft; E2E đã import, sửa nội dung/ảnh, export lại rồi giả lập mở offline để xác minh CSS, ảnh, trang chi tiết và DOCX links. ZIP cũ thiếu manifest được báo rõ.
- **Điều phối:** Rule Master, Agent 1–5, checklist, handover và prompt agent được đồng bộ. `origin` đã gỡ theo yêu cầu; `.git`/lịch sử được giữ. Không push, không gắn remote mới. File `das` được giữ nguyên.

## Xác minh lượt này

- `npm.cmd run typecheck`: pass sau khi sửa type trong E2E kiểm tra ảnh offline.
- Studio draft/Undo sau refresh và IndexedDB `QuotaExceededError`: **2/2 pass**.
- Thư viện ảnh được dùng chéo giữa hai bài, không tự gắn: **1/1 pass**.
- ZIP archive/import/edit/re-export/offline: **2/2 pass**.
- Batch/DOCX selection, nhiều file và recovery nằm trong bộ chạy cuối; Batch agent xác nhận thêm test per-file settings pass.
- Public routing policy: **2/2 pass** theo routing agent.
- `git diff --check`: không phát hiện whitespace error; Git có cảnh báo line-ending LF/CRLF trên các file được sửa.
- Port 3000 được giữ hoạt động, không build vào `.next` đang dùng. Test agent để lại các file portfolio/media do test sinh ra; không xóa vì chúng cần được chủ repo rà soát. Không sửa `das`.
- Bộ Playwright tập trung cuối lượt chạy liên tục: **11/11 pass**.
- Giai đoạn 9: **10/10** focused E2E pass (theme/ZIP parity, Conclusion/legacy fallback, Batch → Studio, effects/backgrounds, section colors).
- Giai đoạn 10: **4/4** focused E2E pass cho hai nhánh Batch/Studio (thêm/bớt file hoặc bài và quy tắc một bài/file); Batch → Studio được chạy lại **2/2 pass**.
- `npm.cmd run typecheck`: pass sau thay đổi Giai đoạn 10; production build cô lập `.next-validation-g9`: pass và thư mục build tạm đã được dọn. `.next` của server không bị ghi đè.
- Test ZIP round-trip đã được củng cố: fixture có hai ảnh để thực sự test đổi ảnh chính; bộ mô phỏng offline trả MIME `image/svg+xml` cho SVG. Test import/export ZIP pass.
- Agent 5 build hai bản sao nguồn mới nhất: `NETLIFY=true` pass; `PORTFOLIO_PUBLIC_ONLY=false` pass. Local server kiểm tra cuối `/`, `/studio`, `/batch`, `/nguyenngocdiepportfolio` đều HTTP 200. Không dùng Netlify credentials hoặc deploy site.

## Kiểm tra ngoài repo còn lại

1. Khi người dùng deploy branch hiện tại lên Netlify, mở deployment preview:
   - `/` phải mở portfolio tại URL gốc;
   - `/nguyenngocdiepportfolio` vẫn mở portfolio;
   - `/studio`, `/batch` và API riêng trả 404;
   - tải ZIP công khai vẫn hoạt động qua `/api/export`.
2. Nếu cần sửa Netlify deploy, dùng repo mới do người dùng cung cấp sau này; workspace hiện không còn remote `origin`.

## Quy tắc khi tiếp tục

- Giữ server người dùng trên cổng 3000; không stop/kill process đó.
- Không chạy production build vào `.next` workspace. Dùng bản sao tạm/output riêng cho build public/local.
- Không sửa/xóa `das`, `.git`, lịch sử hoặc file test artifacts chưa rõ nguồn gốc. Không push hoặc thêm remote mới nếu chưa có repo đích.
- Các test dùng file DOCX có thể tạo portfolio JSON và media trong `data/portfolios` hoặc `public/uploads/docx-media`; rà trạng thái Git trước khi dọn.
- File portfolio/media do bộ kiểm thử sinh ở lượt này vẫn được giữ dưới dạng untracked để tránh xóa nhầm; rà các fixture `sampleassignments`, `studentone`, `studenttwo`, `lesson-*` trước khi đưa lên repo/deploy.
- Nếu thêm API, cập nhật `src/services/deployment/private-api-guard.ts` và `tests/public-mode-routing.spec.ts`.

## Agent ownership

| Agent | Ranh giới sở hữu | Tài liệu |
| --- | --- | --- |
| 1 | Schema, versioned source manifest, contract dữ liệu | `Rule/01_agent_1_template_extractor_schema_architect.md` |
| 2 | Template engine, block, layout renderer | `Rule/02_agent_2_modular_template_engine_visual_block_library.md` |
| 3 | Studio, local drafts/history, customization, image library | `Rule/03_agent_3_visual_studio_builder_theme_customizer_ui.md` |
| 4 | DOCX parsing/assignment selection, AI, Batch job matching/retry | `Rule/04_agent_4_ai_content_generator_vision_cloner_mass_production_engine.md` |
| 5 | Deployment routing, ZIP export/import, production QA | `Rule/05_agent_5_publisher_static_exporter_automated_qa.md` |

---

## Giai đoạn 9 — Conclusion, style, Batch → Studio và effects (đã tích hợp)

Đọc shared chat: `https://chatgpt.com/s/cx_6af6b48bdbb08191b13da73b60bc558d`. Yêu cầu mới nhất yêu cầu:

- Conclusion có thể chỉnh mọi văn bản, chọn khoảng 6 bố cục, kéo-thả/sắp xếp và đổi kích thước các ô.
- Màu/font/nền có thể tùy biến rộng; các màu/font ở cấp section phải thực sự áp dụng trên từng block, không chỉ đổi giá trị trong Inspector.
- Từ Batch có thể đưa portfolio đã tạo vào Studio chỉnh tiếp; thay đổi phải lưu draft và phục hồi sau refresh.
- Kiểm tra hiệu ứng và ảnh nền để khớp mục đích, preview, public rendering và ZIP.
- Thẻ “Thông tin liên hệ” About đã có quản lý các mục hiện có (ẩn/hiện, thêm mục icon, sửa, xóa) theo thay đổi từ cùng chat.

### Trạng thái hiện tại của Giai đoạn 9

- [x] Đọc shared chat và checkpoint live này; đọc checklist/handover.
- [x] Xác nhận Giai đoạn 8 đã có Batch job persistence/Studio draft library/ZIP importer; cần kiểm tra riêng luồng đưa **kết quả mới từ Batch** vào Studio, không xây lại hệ thống nháp.
- [x] Conclusion: sáu layout, sửa văn bản/thẻ/link/ghi chú công cụ, kéo sắp xếp, chỉnh kích thước, màu/font/nền và giữ fallback portfolio cũ.
- [x] Tùy biến section: màu nền/thẻ/tiêu đề/nội dung và font tiêu đề/nội dung được áp dụng trong preview; Conclusion có màu theo vùng/thẻ và About hỗ trợ font cho tiêu đề/nội dung thẻ.
- [x] Batch → Studio: kết quả hợp lệ được lưu vào draft store hiện có trước khi mở Studio; test sửa sau refresh và báo lỗi dữ liệu/storage pass.
- [x] Effects/backgrounds: preset SVG theo cover/position; ZIP render preset và upload background cùng position/opacity/blur; hiệu ứng motion/tilt/parallax tôn trọng reduced-motion.
- [x] Xác minh: 10 focused E2E pass, typecheck và production build cô lập pass. Test parity so sánh màu theme/thank-you text với portfolio hiện tại để hỗ trợ tùy chỉnh.
- [ ] Ghi chú coverage: E2E section-style hiện chưa có fixture Experience; agent cũng ghi nhận Canva-cover Hero không có card surface để assert.
- [ ] Xác minh URL Netlify sau deployment preview.

## Giai đoạn 10 — Hai nhánh nhập DOCX (đã tích hợp)

- [x] Batch: nhánh nhiều file, mỗi file phải chọn đúng một bài; thêm file tăng số đầu vào, xóa file giảm số đầu vào.
- [x] Batch: nhánh một file, quét nhiều bài và chọn/bỏ chọn bài trước khi tạo portfolio; từ chối thêm file thứ hai ở nhánh này.
- [x] Studio DOCX wizard: nhiều DOCX chọn đúng một bài/file và có thể thêm/bỏ file; một DOCX quét và chọn nhiều bài.
- [x] Đổi các header CSV hiển thị mặc định sang `tenfile,hoten,chucdanh,email`; vẫn tương thích dữ liệu cũ với `filename,fullName,roleTitle,email`.
- [x] E2E hai nhánh Batch/Studio **4/4 pass**, Batch → Studio **2/2 pass**, typecheck và isolated production build pass.
