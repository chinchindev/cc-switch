# macOS Apple Silicon Development Release Design

## Mục tiêu

Bổ sung bản development release cho macOS Apple Silicon vào luồng build của fork, không cần Apple Developer certificate. Một artifact ARM64 duy nhất phải chạy native trên toàn bộ dòng chip M1, M2, M3 và M4, với macOS 12 trở lên theo cấu hình Tauri hiện tại.

Luồng Windows đang hoạt động phải được giữ nguyên. Mỗi commit có `[release]` sẽ publish Windows ZIP và macOS ARM64 DMG vào cùng một GitHub prerelease.

## Phạm vi

### Bao gồm

- Build target `aarch64-apple-darwin` trên runner GitHub-hosted ARM64 `macos-14`.
- Ad-hoc sign ứng dụng bằng signing identity `-`.
- Tạo artifact `cc-switch-macos-arm64-release.dmg`.
- Giữ artifact Windows hiện tại `cc-switch-windows-release.zip`.
- Publish cả hai artifact vào cùng tag `dev-release-<run_number>` khi profile là release.
- Ghi hướng dẫn bỏ quarantine bằng `xattr` trong release notes.
- Cache Cargo tách riêng theo hệ điều hành, kiến trúc và profile.
- Chạy Rust tests trên macOS trước khi build để xác nhận mã native tương thích.

### Không bao gồm

- Apple Developer certificate.
- Notarization hoặc stapling.
- Mac Intel hoặc Universal binary.
- Auto-updater artifact và chữ ký updater.
- Thay đổi workflow release chính thức theo tag `v*`.
- Thay đổi minimum macOS version hiện tại là 12.0.

## Kiến trúc workflow

Workflow development build hiện tại được mở rộng thành ba job:

1. `build-windows`: giữ nguyên hành vi build EXE và tạo Windows ZIP.
2. `build-macos-arm64`: chạy trên `macos-14`, cài Node/pnpm/Rust, thêm target `aarch64-apple-darwin`, chạy Rust tests, build Tauri DMG với ad-hoc signing và upload DMG dưới dạng workflow artifact.
3. `publish-release`: chỉ chạy với profile `release`, phụ thuộc vào hai job build, tải hai workflow artifact và publish chúng vào cùng một GitHub prerelease.

Việc tách riêng job publish tránh hai runner đồng thời tạo hoặc cập nhật cùng một release. Với push không có `[release]`, các job vẫn thực hiện kiểm tra/build debug theo hành vi development hiện tại nhưng không publish GitHub Release. macOS debug build không cần tạo DMG; chỉ release profile tạo bundle DMG.

## Cấu hình Tauri

Không thay đổi `src-tauri/tauri.conf.json` vì workflow release chính thức đang dùng cấu hình này để ký và notarize.

Thêm một config override dành riêng cho development macOS. Override chỉ đặt:

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "-"
    }
  }
}
```

Workflow truyền config override khi chạy Tauri và chỉ build bundle `dmg` cho target `aarch64-apple-darwin`. Ad-hoc signing bảo đảm Mach-O và app bundle có chữ ký hợp lệ về mặt kỹ thuật trên Apple Silicon, nhưng không tạo trust chain của Apple.

## Artifact và trải nghiệm cài đặt

Tên artifact phát hành:

- `cc-switch-windows-release.zip`
- `cc-switch-macos-arm64-release.dmg`

Release notes phải ghi rõ bản macOS chưa notarize và hướng dẫn:

```bash
xattr -dr com.apple.quarantine "/Applications/CC Switch.app"
open "/Applications/CC Switch.app"
```

Người dùng kéo ứng dụng từ DMG vào `/Applications` trước, sau đó chạy hai lệnh trên. Không hướng dẫn tắt Gatekeeper toàn hệ thống.

## Xử lý lỗi

- Thiếu `.dmg` sau build: job macOS thất bại ngay và không publish release thiếu artifact.
- Ad-hoc signing hoặc verification thất bại: job macOS thất bại.
- Windows hoặc macOS thất bại: `publish-release` không chạy.
- Publish thất bại: hai build artifact vẫn còn trong GitHub Actions để chẩn đoán, nhưng release không được coi là thành công.
- Không có Apple secrets: workflow vẫn phải chạy vì không tham chiếu certificate, Apple ID, team ID hoặc notarization password.

## Xác minh

Workflow macOS phải kiểm tra:

```bash
file "CC Switch.app/Contents/MacOS/cc-switch"
codesign --verify --deep --strict --verbose=2 "CC Switch.app"
codesign -dv --verbose=4 "CC Switch.app"
```

Kết quả `file` phải chứa `arm64`; `codesign --verify` phải thành công. Không chạy `spctl` như điều kiện pass vì app ad-hoc chưa notarize dự kiến sẽ không được Gatekeeper tin cậy khi còn quarantine.

Kiểm tra YAML tĩnh và test CI hiện có phải tiếp tục thành công. Sau khi push release trigger, tiêu chí hoàn tất là:

- GitHub Actions Windows và macOS ARM64 đều xanh.
- Release chứa đúng hai artifact với tên ổn định.
- Release gắn đúng commit và nhánh.
- Thử nghiệm thủ công trên ít nhất một máy M1–M4: mount DMG, kéo app, chạy `xattr`, mở app thành công.

## Rủi ro và giới hạn

- Bản ARM64 không chạy native trên Mac Intel.
- Gatekeeper có thể thay đổi UX theo phiên bản macOS; `xattr` chỉ áp dụng cho bản development người dùng tin cậy.
- DMG chưa notarize không phù hợp để phát hành rộng rãi.
- macOS runner tiêu tốn Actions minutes cao hơn Windows/Linux; chỉ bundle và publish DMG cho `[release]` để hạn chế chi phí.
