const messages = {
  cameraAccessError: {
    ko: "오류: 카메라에 접근할 수 없습니다.",
    en: "Error: Could not access the camera.",
  },
  cameraOff: {
    ko: "카메라가 꺼졌습니다. 다시 시작할 수 있습니다.",
    en: "Camera is off. You can start it again.",
  },
  cameraPlayError: {
    ko: "카메라 재생에 실패했습니다.",
    en: "Failed to play camera.",
  },
  cameraReady: {
    ko: "카메라 준비 완료. 녹화를 시작하세요.",
    en: "Camera ready. Start recording.",
  },
  cameraUnsupported: {
    ko: "오류: 이 브라우저에서는 카메라 기능을 지원하지 않습니다.",
    en: "Error: Camera feature is not supported on this browser.",
  },
  converting: { ko: "MP4로 변환 중...", en: "Converting to MP4..." },
  deviceNotFound: {
    ko: "오류: 연결된 카메라나 마이크를 찾을 수 없습니다.",
    en: "Error: No camera or microphone found.",
  },
  deviceNotReadable: {
    ko: "오류: 하드웨어 문제로 카메라를 사용할 수 없습니다.",
    en: "Error: Cannot use the camera due to a hardware issue.",
  },
  downloadError: {
    ko: "오류: 다운로드할 파일이 없습니다.",
    en: "Error: No file to download.",
  },
  downloadJpg: { ko: "JPG 다운로드", en: "Download JPG" },
  downloadMp4: { ko: "MP4 다운로드", en: "Download MP4" },
  extractingThumbnail: {
    ko: "썸네일 추출 중...",
    en: "Extracting thumbnail...",
  },
  ffmpegNotLoaded: {
    ko: "오류: FFmpeg이 아직 로드되지 않았습니다.",
    en: "Error: FFmpeg is not loaded yet.",
  },
  footerNote1: {
    ko: "브라우저에서 FFmpeg.wasm을 사용하여 비디오를 처리합니다.",
    en: "Processing video in the browser using FFmpeg.wasm.",
  },
  footerNote2: {
    ko: "이 애플리케이션은 서버에 영상을 저장하지 않습니다.",
    en: "This application does not save videos to the server.",
  },
  initializing: {
    ko: "FFmpeg 라이브러리 초기화 중...",
    en: "Initializing FFmpeg library...",
  },
  loaded: {
    ko: "FFmpeg 로딩 완료. 카메라를 시작하세요.",
    en: "FFmpeg loaded. Please start the camera.",
  },
  loadError: {
    ko: "오류: FFmpeg을 불러올 수 없습니다.",
    en: "Error: Could not load FFmpeg.",
  },
  loadingCore: {
    ko: "FFmpeg 코어 로딩 중... (수십초 소요될 수 있습니다)",
    en: "Loading FFmpeg core... (may take some time)",
  },
  permissionDenied: {
    ko: "오류: 카메라 권한이 거부되었습니다.",
    en: "Error: Camera permission denied.",
  },
  processingComplete: { ko: "처리 완료!", en: "Processing complete!" },
  processingError: {
    ko: "오류: 비디오 처리 중 문제가 발생했습니다.",
    en: "Error: An issue occurred during video processing.",
  },
  progressComplete: { ko: "완료", en: "Complete" },
  recording: { ko: "녹화 중...", en: "Recording..." },
  recordingStartError: {
    ko: "오류: 먼저 카메라를 시작해야 합니다.",
    en: "Error: You must start the camera first.",
  },
  recordingStopped: {
    ko: "녹화가 중지되었습니다. 영상 처리 중...",
    en: "Recording stopped. Processing video...",
  },
  reset: { ko: "초기화", en: "Reset" },
  resetting: { ko: "초기화 중...", en: "Resetting..." },
  resultsTitle: { ko: "처리 결과", en: "Processing Results" },
  startCamera: { ko: "카메라 시작", en: "Start Camera" },
  startRecording: { ko: "녹화 시작", en: "Start Recording" },
  stopCamera: { ko: "카메라 끄기", en: "Stop Camera" },
  stopRecording: { ko: "녹화 중지", en: "Stop Recording" },
  thumbnailTitle: { ko: "JPEG 썸네일", en: "JPEG Thumbnail" },
  title: {
    ko: "비디오 레코더 (FFmpeg)",
    en: "Video Recorder (FFmpeg)",
  },
  uploadErrorNoFile: {
    ko: "오류: 업로드할 파일이 없습니다.",
    en: "Error: No file to upload.",
  },
  uploadFail: { ko: "오류: 업로드 실패", en: "Error: Upload failed" },
  uploading: { ko: "서버로 업로드 중...", en: "Uploading to server..." },
  uploadNetworkError: {
    ko: "오류: 업로드 중 네트워크 문제가 발생했습니다.",
    en: "Error: Network issue during upload.",
  },
  uploadSuccess: { ko: "업로드 성공!", en: "Upload successful!" },
  uploadToServer: { ko: "서버로 업로드", en: "Upload to Server" },
  videoTitle: { ko: "MP4 비디오", en: "MP4 Video" },
  writingFile: { ko: "파일 쓰는 중...", en: "Writing file..." },
};
export default messages;
