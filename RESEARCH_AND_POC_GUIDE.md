# BÁO CÁO NGHIÊN CỨU & NGUYÊN MẪU BACKEND SPRING BOOT (JAVA)
## TÍNH NĂNG GIÁM SÁT THI TRỰC TIẾP (MỤC 29: CAMERA & SCREEN STREAMING)

---

## 1. ĐẶT VẤN ĐỀ VÀ PHẠM VI DÀNH CHO LẬP TRÌNH VIÊN BACKEND

Theo tài liệu yêu cầu `(INCIT) MÔ TẢ YÊU CẦU - PHẤN MỀM TỔ CHỨC & THI ONLINE.pdf` (Mục 29: Giám sát thi trực tiếp), lập trình viên Backend (phụ trách Spring Boot `incit_backend`) cần thiết kế và xây dựng giải pháp máy chủ phục vụ tính năng **xem camera và màn hình của thí sinh theo thời gian thực (real-time)**.

### Yêu cầu vai trò Backend:
1. **Phát triển WebRTC Signaling Server bằng Spring Boot (Java 21 LTS)**.
2. **Quản lý danh sách thí sinh live và phiên giám sát (Live Proctoring Sessions)**.
3. **Cung cấp REST API kiểm tra sức khỏe hệ thống, lấy danh sách thí sinh đang thi và phát cảnh báo**.
4. **Xây dựng kiến trúc mở rộng hỗ trợ tích hợp WebRTC SFU Server trong giai đoạn Production**.

---

## 2. PHÂN TÍCH VÀ SO SÁNH CÁC GIAO THỨC STREAMING CHO BACKEND SPRING BOOT

| Tiêu chí | WebRTC Mesh (Spring WebSocket) | WebRTC SFU (Spring Boot + MediaSoup / LiveKit) | WebRTC MCU | WebSocket + Canvas / MediaRecorder | HLS / RTSP / RTMP |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Độ trễ (Latency)** | **Siêu thấp (100 - 300ms)** | **Siêu thấp (100 - 300ms)** | Thấp (300 - 500ms) | Trung bình (1 - 3s) | Cao (5 - 15s) |
| **Tải CPU Server** | **Gần như bằng 0** (Spring Boot làm Signaling) | Trung bình (Forward gói RTP qua SFU) | Cực kỳ cao (Decode & Encode ghép video) | Cao (Xử lý frame/chunk) | Cao (HLS Segmenting) |
| **Băng thông Server** | Cực thấp (Chỉ gửi WebSocket Signal) | Tỷ lệ thuận với số Receiver | Trung bình | Rất cao | Rất cao |
| **Băng thông Client Thí sinh** | $2 \times M$ (M là số giám thị) | $2$ luồng (Up cho SFU) | $2$ luồng | Cao (Gửi JPEG/WebM) | 2 luồng |
| **Băng thông Client Giám thị** | $2 \times N$ (N là số thí sinh) | $2 \times N$ (Hỗ trợ Simulcast giảm chất lượng grid) | 1 luồng duy nhất (Ghép màn hình) | $2 \times N$ | $2 \times N$ |
| **Khả năng mở rộng (Scalability)** | Phù hợp $< 10$ thí sinh/phòng | **Rất cao ($50 - 100+$ thí sinh/phòng)** | Thấp (Do tốn CPU server) | Trung bình | Cực cao (CDN Broadcast) |
| **Đánh giá & Kết luận** | **CHỌN CHO DỰ ÁN POC NÀY** | **KHUYÊN DÙNG CHO PRODUCTION** | Không khuyến khích | Không đạt độ trễ | **LOẠI (Độ trễ quá cao)** |

---

## 3. CẤU TRÚC MÃ NGUỒN CÁC LỚP SPRING BOOT (JAVA) DÃ HOÀN THÀNH

Mã nguồn dịch vụ máy chủ Spring Boot đã được xây dựng hoàn chỉnh và biên dịch thành công (`BUILD SUCCESS`) nằm tại thư mục `spring-boot-signaling/`:

```
spring-boot-signaling/
├── pom.xml                                  # Maven dependencies (Spring Boot WebSocket, Jackson)
└── src/main/java/com/incit/camera/
    ├── CameraStreamingApplication.java       # Class khởi chạy Spring Boot (Port 8080)
    ├── config/
    │   └── WebSocketConfig.java             # Đăng ký WebSocket Handler (/ws/signaling)
    ├── handler/
    │   └── SignalingHandler.java           # Quản lý WebSocket sessions & relay tín hiệu WebRTC
    ├── model/
    │   ├── ExamineeDTO.java                 # Model thí sinh đang thi
    │   └── SignalingMessage.java            # DTO định dạng tin nhắn Signaling JSON
    └── controller/
        └── ProctoringController.java        # REST API endpoint cho giám sát & cảnh báo
```

---

## 4. BẢNG TẢI TRUYỀN NHẬN JSON VÀ REST API BACKEND

### 4.1 Giao thức WebSocket Signaling (`ws://localhost:8080/ws/signaling`)

- **Giám thị tham gia phòng**:
  ```json
  { "type": "join-proctor" }
  ```
- **Thí sinh tham gia phòng**:
  ```json
  {
    "type": "join-examinee",
    "studentId": "SV001",
    "name": "Nguyễn Văn A",
    "cameraEnabled": true,
    "screenSharing": true
  }
  ```
- **Trung chuyển WebRTC Offer / Answer / ICE Candidates**:
  ```json
  {
    "type": "signal-offer",
    "targetSocketId": "session-123",
    "senderId": "SV001",
    "streamType": "camera",
    "offer": { "type": "offer", "sdp": "..." }
  }
  ```

### 4.2 Các Endpoint REST API (`http://localhost:8080/api/v1/proctoring`)

- **`GET /api/v1/proctoring/active-candidates`**: Lấy danh sách thí sinh đang trực tiếp kết nối.
- **`POST /api/v1/proctoring/warnings`**: Gửi tin nhắn cảnh báo tới thí sinh (`{ "studentId": "SV001", "message": "Vui lòng giữ webcam hiển thị rõ mặt" }`).
- **`GET /api/v1/proctoring/health`**: Kiểm tra trạng thái sức khỏe máy chủ và số lượng kết nối live.

---

## 5. HƯỚNG DẪN CHẠY MÁY CHỦ SPRING BOOT

1. Mở cửa sổ Terminal tại thư mục `spring-boot-signaling`:
   ```bash
   mvn clean compile spring-boot:run
   ```
2. Server sẽ khởi chạy tại cổng **8080**:
   - WebSocket URL: `ws://localhost:8080/ws/signaling`
   - REST API URL: `http://localhost:8080/api/v1/proctoring/health`
