# BẢNG THEO DÕI TIẾN ĐỘ TỔNG THỂ (MASTER TASK CHECKLIST)

*Sử dụng file này để đánh dấu tiến độ `[x]` khi các Agent hoàn thành công việc. AI cũng có thể tự đọc file này để biết việc gì chưa làm.*

> Lượt đang triển khai có checkpoint để tiếp tục khi bị ngắt: [Rule/10_live_progress_upgrade.md](10_live_progress_upgrade.md). Sau mỗi mốc kiểm thử hoặc giao agent, cập nhật checkpoint và chỉ đánh dấu hoàn tất khi có kết quả xác nhận.

## 📌 Giai đoạn 1: Khởi tạo & Schema (Agent 1)
- [x] Khởi tạo dự án Next.js (App Router), Tailwind CSS, Zustand, Zod.
- [x] Cài đặt các thư viện: `mammoth`, `jszip`, `lucide-react`, `@dnd-kit/core`.
- [x] Hoàn thiện `src/schema/portfolio.schema.ts` (Định nghĩa dữ liệu Portfolio).
- [x] Hoàn thiện `src/schema/docx-ingestion.schema.ts` (Định nghĩa dữ liệu bóc tách Word).
- [x] Tạo file `references/sample-assignments.docx` chứa bài tập mẫu (có chữ + có ảnh).
- [x] Tạo file mock data `src/data/presets/tuthivananh-sample.json`.

## 🎨 Giai đoạn 2: UI Engine & Templates (Agent 2)
- [x] Xây dựng các Visual Primitives (`<AvatarFrame>`, `<MediaFrame>`, `<ImageSourceBadge>`).
- [x] Code block `<ProjectsShowcaseBlock>` chuyên hiển thị bài tập (hỗ trợ layout 1 ảnh, lưới nhiều ảnh).
- [x] Code `<AssignmentDetailModal>` để xem toàn bộ nội dung bài tập gốc.
- [x] Hoàn thiện 6 Archetype Templates (ưu tiên `canva-editorial`).
- [x] Code `<PortfolioRenderer>` (Hiển thị View Mode & Edit Mode).

## 🎛️ Giai đoạn 3: Studio Editor & DOCX Wizard (Agent 3)
- [x] Code giao diện Studio 3 cột (Sidebar, Canvas, Inspector) tại `/studio`.
- [x] Code Modal `DocxImportWizard`: Kéo thả file, chọn chế độ sinh ảnh AI.
- [x] Code component `ProjectImageManager`: Trình quản lý ảnh AI / ảnh gốc từ DOCX.
- [x] Tích hợp tính năng kéo thả thay đổi thứ tự Section (Dnd-kit).

## 🧠 Giai đoạn 4: AI & Backend Pipeline (Agent 4)
- [x] Code dịch vụ giải nén & đọc file DOCX `src/services/docx/docx-parser.ts` (lấy chữ + lưu ảnh ra `public/uploads/docx-media`).
- [x] Code API `POST /api/docx-ingest`: Nhận file, trả về cấu trúc đã parse.
- [x] Code AI Summarizer `src/services/ai/summarize-assignments.ts`: Tóm tắt bài tập, suy luận Kỹ năng.
- [x] Code AI Image Generator `src/services/ai/image-generator.ts` (Hỗ trợ API key trả phí hoặc Pollinations AI miễn phí).
- [x] Code giao diện sản xuất hàng loạt `/batch`.

## 🚀 Giai đoạn 5: Export & QA (Agent 5)
- [x] Code trang Public hiển thị tĩnh tại `/[portfolioSlug]`.
- [x] Code dịch vụ đóng gói ZIP (HTML tĩnh + thư mục ảnh nội bộ) `src/services/export/zip-exporter.ts`.
- [x] Code API xuất PDF.
- [x] Viết & chạy Playwright E2E Tests (5/5 pass).
- [x] Fix toàn bộ lỗi TypeScript (`tsc --noEmit` & `next build`).

## 🎨 Giai đoạn 6: Nâng cấp Canva Parity 1:1 & Fixed Layout - Creative Theme (`/teamwork` + Subagents)
- [x] Khóa khung bố cục Canva Editorial 1:1 (`#FFF3E6`, Cover SVG, `About me`, `project` TOC 6 chương `01`–`06`, `Conclusion`, `Thank You !`, dải chân trang đen) qua `HeroBlock`, `AboutBlock`, `SkillsBlock`, `EducationBlock`, `ProjectsShowcaseBlock`, `ContactBlock`, `CanvaOrnaments`.
- [x] Bảng quy tắc theme ngữ cảnh 7 lĩnh vực `AUTOMATED_THEME_RULE_TABLE` & `resolveThemeFromContext` tại `src/schema/theme.schema.ts` đồng bộ Studio, AI Summarizer, Batch (`/api/batch`), Public route & ZIP Export.
- [x] Hệ thống chuyển động mượt zero-dependency (`@keyframes fadeInUp`, `.reveal-on-scroll`, `.hover-lift`, `.glass-panel`) đồng nhất giữa Next.js client (`TemplateShell.tsx`) và gói ZIP tĩnh (`zip-exporter.ts`).
- [x] Chuẩn hóa toàn bộ token màu động (gỡ màu mocha cứng trong `zip-exporter.ts`, `ProjectsShowcaseBlock.tsx`, `ExperienceBlock.tsx`, `ArchetypeDivider.tsx`) & tối ưu `IntersectionObserver` (`threshold: 0.01`, kích hoạt phần tử trong viewport ngay khi tải).
- [x] Bổ sung Test 5 Playwright E2E kiểm chứng ZIP theme phi-Canva, motion/glass CSS, DOM background/reveal và `resolveThemeFromContext`.

## ✨ Giai đoạn 7: Mở rộng Đa Mẫu Canva, Studio Kéo thả/In-line, Chi tiết Dự án & Chuẩn Rubric INF2501 (`/teamwork`)
- [x] **UX/UI & Ảnh chân dung chủ nhân (`AvatarFrame.tsx`)**: 7 kiểu khung chân dung (`arch-window`, `polaroid`, `cutout-blob`, `circle`, `geometric-badge`, `clean-card`, `none`), tỉ lệ 3:4 / 1:1 / 4:5, monogram fallback, quản lý trong `SectionInspector.tsx`.
- [x] **Studio Nâng cao (`DraggableUnitList.tsx`, `InlineEditableText.tsx`, `VisualEffectsLayer.tsx`, `BackgroundIllustrationLayer.tsx`)**: Kéo thả đơn vị (`@dnd-kit`), sửa chữ trực tiếp trên canvas, đổi bố cục nhiều khung, hiệu ứng bật/tắt (float/glow/tilt/sparkles/parallax/reveal), kho 8 SVG nền (`background-presets.ts`) + upload ảnh nền tùy ý (opacity/blur).
- [x] **Chuyển động nội dung**: Mục Tools/Skills có hiệu ứng reveal và nâng nhẹ khi hover; nội dung highlight dài chạy qua lại, hỗ trợ giảm chuyển động theo cài đặt hệ điều hành.
- [x] **6 Mẫu Canva Sáng tạo Mới (`canva-creative-presets.ts`)**: `warm-editorial`, `creative-bold`, `minimal-chic`, `vibrant-student`, `artistic-organic`, `academic-presentation`.
- [x] **Chi tiết Dự án 2 Chế độ + Next/Prev (`/[portfolioSlug]/projects/[projectSlug]/page.tsx`, `ProjectDetailClientView.tsx`, `AssignmentDetailModal.tsx`, `zip-exporter.ts`)**: Mặc định mở trang Route riêng để cuộn toàn trang; Fullscreen Modal vẫn là lựa chọn tùy chỉnh. Hỗ trợ Next/Prev, Back to Projects, không hiển thị mục kê khai AI/liêm chính trong bài làm, đồng bộ HTML tĩnh `projects/*.html` trong ZIP.
- [x] **Chuẩn Rubric INF2501**: Mục tiêu học tập & Mục tiêu Portfolio, 6 chương bài tập riêng + bảng so sánh Prompt, Footer SV/MSSV/Lớp/Học phần. Danh sách công cụ trong Skills có thể kéo-thả/xóa; không hiển thị video giới thiệu hoặc bảng kê khai công cụ AI.
- [x] Mở rộng & chạy **10/10 Playwright E2E Tests** (Test 1–10 pass) + `tsc --noEmit` + `next build`.

---
**Trạng thái dự án:** Các giai đoạn 1–7 là mốc lịch sử. Kết quả `10/10` E2E trước đây không đại diện cho trạng thái kiểm thử hiện tại; theo dõi đợt nâng cấp mới ở Giai đoạn 8.

## 🧰 Giai đoạn 8: Public root, DOCX/Batch Factory, Studio recovery và editable ZIP

### Định tuyến và public mode (Agent 5)
- [x] Local root giữ trang AI Portfolio Factory; Netlify root render portfolio trực tiếp bằng deployment mode, không chuyển URL sang slug.
- [x] Chặn Studio, Batch và API riêng bằng layout/API guard ở public mode; giữ API export cần cho portfolio công khai.
- [x] Xác minh build public cô lập: `/` và slug đều mở portfolio; Studio/Batch/API riêng trả 404; API export không bị public guard chặn.
- [x] Xác minh build local cô lập: `/` mở AI Portfolio Factory, Studio và Batch vẫn truy cập được.
- [ ] Kiểm chứng trên Netlify deploy preview thực tế sau khi có deploy mới.

### Batch và nhận diện DOCX (Agent 4, Agent 1 contract)
- [x] Batch lưu file/job/kết quả trong IndexedDB, hỗ trợ folder/CSV, trạng thái từng file, retry riêng và khôi phục sau refresh.
- [x] Studio DOCX có lựa chọn một file chứa nhiều bài hoặc nhiều file của các bài khác nhau; mỗi file vẫn có thể chứa nhiều bài. Tách nhóm theo file nguồn, lọc và chọn từng bài trước khi nhập.
- [x] Test chọn/lọc bài từ nhiều file DOCX và test batch resume sau refresh pass.

### Studio, local storage và thư viện ảnh (Agent 3)
- [x] Nhiều bản nháp, draft picker ở Studio/home, auto-save cục bộ, history qua refresh và backup/restore; test khôi phục draft/undo sau refresh pass.
- [x] Thư viện ảnh dùng chung, chọn file/folder/clipboard và dùng ảnh của bài khác; E2E xác nhận ảnh chỉ gắn vào bài sau khi chọn.
- [x] Autosave báo đúng lỗi lưu/quota, không hiện trạng thái thành công giả; E2E mô phỏng IndexedDB `QuotaExceededError`.
- [x] Draft/Undo khôi phục sau refresh; giao diện chỉnh sửa template, bố cục, nội dung, ảnh và theme tiếp tục dùng các inspector hiện có.

### ZIP round-trip và QA (Agent 5)
- [x] ZIP mới có source manifest phiên bản hóa và asset nội bộ; importer xác thực và phục hồi ảnh.
- [x] Tích hợp importer vào Studio; test ZIP import vào thư viện draft pass.
- [x] Test trọn vòng export → import Studio → sửa nội dung/ảnh → export lại → mở offline; xác minh assets, CSS, trang chi tiết và liên kết DOCX.
- [x] Bộ E2E tập trung cuối lượt **11/11 pass** cho routing, Batch, DOCX một/nhiều file, ZIP round-trip, thư viện ảnh, khôi phục draft/Undo và lỗi quota. Agent Batch xác nhận thêm test cấu hình theo file pass.
- [x] `npm.cmd run typecheck` pass; production build cô lập `NETLIFY=true` và `PORTFOLIO_PUBLIC_ONLY=false` đều pass (không ghi vào `.next` server đang dùng).

### Giao việc và handover (Master)
- [x] Cập nhật ranh giới sở hữu/contract cho Master và Agent 1–5 trong Rule; đồng bộ prompt Antigravity đang được handover tham chiếu.
- [x] Tạo và cập nhật file live progress; đồng bộ checklist/handover theo kết quả test/build thực tế.
- [x] Tháo remote `origin` theo yêu cầu; giữ `.git`, lịch sử commit và file người dùng `das`.
- [ ] Xác minh URL Netlify sau deploy preview thực tế; phiên này không có quyền truy cập site/deploy.

## 🎨 Giai đoạn 9: Kết luận, tùy biến toàn cục và Batch → Studio

- [x] Conclusion: sửa toàn bộ nội dung, sáu layout, kéo-thả/sắp xếp, resize, màu/font/nền; Contact tách biệt và portfolio cũ có fallback.
- [x] Màu/font/nền section hoạt động trong preview; có màu riêng theo vùng/thẻ Conclusion và font riêng cho nội dung/thẻ About.
- [x] Batch: mở portfolio đã tạo trong Studio như draft cục bộ; chỉnh sửa phục hồi sau refresh.
- [x] Sửa hiệu ứng/ảnh nền từ preset/upload đến preview và ZIP; tôn trọng reduced-motion.
- [x] 10 focused E2E pass, typecheck và isolated production build pass; xem live progress để biết coverage section-style còn thiếu fixture Experience.

## 📄 Giai đoạn 10: Hai nhánh nhập DOCX ở Batch và Studio

- [x] Batch: nhiều file DOCX, mỗi file chọn đúng một bài; thêm/xóa file để điều chỉnh số bài.
- [x] Batch: một file DOCX, quét và chọn nhiều bài từ cùng tài liệu; nhánh này chỉ nhận một file.
- [x] Studio: nhiều DOCX đóng góp đúng một bài/file; một DOCX quét và cho chọn nhiều bài. Có thể thêm/bỏ file hoặc bài theo nhánh.
- [x] Đổi header CSV mặc định thành `tenfile,hoten,chucdanh,email` (không dấu); vẫn đọc header tiếng Anh cũ.
- [x] 4 focused E2E hai nhánh pass, Batch → Studio 2/2 pass, typecheck và isolated production build pass.

## 🚀 Giai đoạn 11: Nâng cấp trải nghiệm Studio, Bố cục bài tập và Xuất bản thực tế (14–15/11/2026)

- [x] **Git Automation (.bat):** Cung cấp script đẩy git nhanh `push_to_git.bat` với thông báo tiếng Việt không dấu chuẩn Unicode console.
- [x] **Scroll Offset TOC:** Sửa khoảng cách nhảy cuộn `scroll-mt` cho Kỹ năng, Học vấn, Bài tập để click từ Mục lục không bị trôi/chạy quá vị trí.
- [x] **Footer & Thank You (Canva Editorial):** Chỉnh sửa tùy biến nội dung Thank You, bổ sung trường Giảng viên hướng dẫn (`instructorName`) hiển thị linh hoạt giữa MSSV và Lớp.
- [x] **Tự động tràn trang 100% khi bài tập không có ảnh:** Xóa bỏ hoàn toàn khung nét đứt "Bài tập chưa có ảnh minh họa" trên trang showcase và modal; tự động mở rộng nội dung chi tiết đạt `100%` (`lg:col-span-12 w-full`) trên mọi template và file xuất bản ZIP/HTML.
- [x] **Ẩn hoàn toàn Headline khi xóa rỗng:** Hero Section ẩn triệt để cả nhãn tiêu đề và icon lấp lánh (sparkle pill) khi người dùng xóa trống trường Headline.
- [x] **Đổi vị trí Ảnh / Chữ mục Giới thiệu (About):** Hỗ trợ `mediaPosition` (`left`, `right`, `top`, `bottom`) và nút bấm đổi vị trí nhanh ⇄ trong Studio Inspector tương tự mục Bài tập.
- [x] **Nhập DOCX bảo toàn bố cục (Non-destructive import):** Giữ nguyên 100% theme, variant, vị trí ảnh, thứ tự card, headline; tự động điền thông tin hiện tại và không ghi đè nếu để trống.
- [x] **Tùy chỉnh Width & Height thẻ Kỹ năng (Skills):** Bổ sung bộ điều khiển chọn nhanh %, kéo thanh trượt slider px, ô nhập trực tiếp, số cột (1–4) và căn lề (Trái/Giữa/Phải) trong Studio Inspector và đồng bộ sang file ZIP/HTML.
- [x] **Kiểm thử Typecheck & Deploy Vercel:** Khắc phục lỗi cú pháp JSON và các lỗi TypeScript (`ProfileOwner`, `mediaPosition`), `tsc --noEmit` pass 100%, deploy an toàn trên Vercel / GitHub.
- [x] **Quy tắc vận hành nghiêm ngặt:** Tuyệt đối không dừng/chạy đè build gây gián đoạn server cổng 3000 khi người dùng đang thao tác.

> Xem [live progress](10_live_progress_upgrade.md) và [handover](08_b_n_giao_c_ng_vi_c_cho_ai_handover.md) để biết chi tiết các cập nhật mới nhất.
