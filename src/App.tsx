import { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// UI 컴포넌트 및 아이콘
const CameraIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 mr-2"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const RecordIcon = ({ isRecording }: { isRecording: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-6 w-6 mr-2 ${isRecording ? "text-red-500" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.25 12a3.25 3.25 0 11-6.5 0 3.25 3.25 0 016.5 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 21a9 9 0 100-18 9 9 0 000 18z"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 mr-2"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const UploadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 mr-2"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0L8 8m4-4v12"
    />
  </svg>
);

// 메인 애플리케이션 컴포넌트
export default function App() {
  // 상태 관리
  const [isFfmpegLoaded, setIsFfmpegLoaded] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(
    null
  );
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "FFmpeg 라이브러리 초기화 중..."
  );

  // Ref 관리
  const ffmpegRef = useRef<any>(null); // FFmpeg 인스턴스를 저장하기 위한 Ref
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const processedVideoBlobRef = useRef<Blob | null>(null);
  const thumbnailBlobRef = useRef<Blob | null>(null);

  // FFmpeg 로딩 (최신 v0.12 API 적용)
  useEffect(() => {
    const initializeFFmpeg = async () => {
      try {
        ffmpegRef.current = new FFmpeg();
        const ffmpeg = ffmpegRef.current;

        ffmpeg.on("log", ({ message }: { message: string }) => {
          console.log(message);
        });
        ffmpeg.on("progress", ({ progress }: { progress: number }) => {
          setProcessingProgress(Math.round(progress * 100));
        });

        setStatusMessage("FFmpeg 코어 로딩 중... (수십초 소요될 수 있습니다)");

        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
        await ffmpeg.load({
          coreURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            "text/javascript"
          ),
          wasmURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            "application/wasm"
          ),
        });

        setIsFfmpegLoaded(true);
        setStatusMessage("FFmpeg 로딩 완료. 카메라를 시작하세요.");
      } catch (error) {
        console.error("FFmpeg 초기화 실패:", error);
        setStatusMessage(
          "오류: FFmpeg을 불러올 수 없습니다. 브라우저 콘솔과 Vite 설정을 확인해주세요."
        );
      }
    };

    initializeFFmpeg();
  }, []);

  // 미디어 스트림을 비디오 요소에 연결하는 useEffect
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && mediaStream) {
      videoElement.srcObject = mediaStream;
      // 메타데이터가 로드된 후 재생을 시도하여 안정성을 높입니다.
      videoElement.onloadedmetadata = () => {
        videoElement.play().catch((playError) => {
          console.error("비디오 자동 재생 실패:", playError);
          setStatusMessage(
            "카메라는 켜졌지만, 비디오를 자동 재생할 수 없습니다."
          );
        });
      };
    } else if (videoElement) {
      videoElement.srcObject = null;
    }

    // 컴포넌트 언마운트 또는 스트림이 변경될 때 자원을 정리합니다.
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  // 카메라 시작/중지 함수
  const toggleCamera = async () => {
    if (isCameraOn) {
      // 카메라 끄기
      setMediaStream(null); // useEffect 훅이 스트림을 정리하고 중지시킵니다.
      setIsCameraOn(false);
      setStatusMessage("카메라가 꺼졌습니다. 다시 시작할 수 있습니다.");
    } else {
      // 카메라 켜기
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatusMessage(
          "오류: 이 브라우저에서는 카메라 기능을 지원하지 않습니다."
        );
        console.error("getUserMedia is not supported on this browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setMediaStream(stream);
        setIsCameraOn(true);
        setStatusMessage("카메라 준비 완료. 녹화를 시작하세요.");
      } catch (error) {
        console.error("카메라 접근 실패:", error);
        let message = "오류: 카메라에 접근할 수 없습니다. 권한을 확인해주세요.";
        if (error instanceof DOMException) {
          if (error.name === "NotAllowedError") {
            message =
              "오류: 카메라 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.";
          } else if (error.name === "NotFoundError") {
            message = "오류: 연결된 카메라나 마이크를 찾을 수 없습니다.";
          } else if (error.name === "NotReadableError") {
            message = "오류: 하드웨어 문제로 카메라를 사용할 수 없습니다.";
          }
        }
        setStatusMessage(message);
      }
    }
  };

  // 녹화 시작/중지 함수
  const toggleRecording = () => {
    if (isRecording) {
      // 녹화 중지
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setStatusMessage("녹화가 중지되었습니다. 영상 처리 중...");
    } else {
      // 녹화 시작
      if (!videoRef.current?.srcObject) {
        setStatusMessage("오류: 먼저 카메라를 시작해야 합니다.");
        return;
      }
      // 이전 결과 초기화
      setProcessedVideoUrl(null);
      setThumbnailUrl(null);
      processedVideoBlobRef.current = null;
      thumbnailBlobRef.current = null;

      recordedChunksRef.current = [];
      const stream = videoRef.current.srcObject as MediaStream;
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        // 녹화가 중지되면 이 함수가 호출됩니다.
        processVideo();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatusMessage("녹화 중... 중지하려면 버튼을 다시 누르세요.");
    }
  };

  // FFmpeg으로 비디오 처리 함수
  const processVideo = async () => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) {
      setStatusMessage("오류: FFmpeg이 아직 로드되지 않았습니다.");
      return;
    }

    // const { fetchFile } = window.FFmpegUtil;

    setIsProcessing(true);
    setProcessingProgress(0);

    const recordedBlob = new Blob(recordedChunksRef.current, {
      type: "video/webm",
    });

    try {
      // 1. 녹화된 파일을 FFmpeg의 가상 파일 시스템에 씁니다.
      setStatusMessage("FFmpeg 가상 파일 시스템에 파일 쓰는 중...");
      await ffmpeg.writeFile("input.webm", await fetchFile(recordedBlob));

      // 2. FFmpeg 명령 실행: MP4로 변환
      setStatusMessage("MP4로 변환 중... (진행률 확인)");
      await ffmpeg.exec(["-i", "input.webm", "-c:v", "libx264", "output.mp4"]);

      // 3. FFmpeg 명령 실행: 썸네일 추출 (영상 1초 지점에서 1프레임)
      setStatusMessage("썸네일 추출 중...");
      await ffmpeg.exec([
        "-i",
        "output.mp4",
        "-ss",
        "00:00:01.000",
        "-vframes",
        "1",
        "thumbnail.jpg",
      ]);

      // 4. 결과 파일을 가상 파일 시스템에서 읽어옵니다.
      setStatusMessage("결과 파일 읽는 중...");
      const mp4Data = await ffmpeg.readFile("output.mp4");
      const thumbData = await ffmpeg.readFile("thumbnail.jpg");

      // 5. Blob 객체 및 URL 생성
      const videoBlob = new Blob([mp4Data], { type: "video/mp4" });
      processedVideoBlobRef.current = videoBlob;
      setProcessedVideoUrl(URL.createObjectURL(videoBlob));

      const thumbBlob = new Blob([thumbData], { type: "image/jpeg" });
      thumbnailBlobRef.current = thumbBlob;
      setThumbnailUrl(URL.createObjectURL(thumbBlob));

      setStatusMessage(
        "처리 완료! 결과를 확인하고 다운로드 또는 업로드하세요."
      );
    } catch (error) {
      console.error("비디오 처리 중 오류 발생:", error);
      setStatusMessage("오류: 비디오 처리 중 문제가 발생했습니다.");
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      // 가상 파일 시스템 정리 (선택 사항)
      try {
        await ffmpeg.deleteFile("input.webm");
        await ffmpeg.deleteFile("output.mp4");
        await ffmpeg.deleteFile("thumbnail.jpg");
      } catch (e) {
        console.warn("FS 정리 중 작은 오류 발생", e);
      }
    }
  };

  // 파일 다운로드 함수
  const downloadFile = (blob: Blob | null, filename: string) => {
    if (!blob) {
      setStatusMessage("오류: 다운로드할 파일이 없습니다.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 서버 업로드 함수 (실제 업로드 로직)
  const uploadToServer = async () => {
    if (!processedVideoBlobRef.current || !thumbnailBlobRef.current) {
      setStatusMessage("오류: 업로드할 파일이 없습니다.");
      return;
    }

    setStatusMessage("서버로 업로드 중...");

    const formData = new FormData();
    formData.append("video", processedVideoBlobRef.current, "recording.mp4");
    formData.append("thumbnail", thumbnailBlobRef.current, "thumbnail.jpg");

    try {
      // 여기에 실제 서버 API 엔드포인트를 입력하세요.
      const response = await fetch("https://your-server.com/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log("업로드 성공:", result);
        setStatusMessage(`업로드 성공! 파일 URL: ${result.videoUrl}`);
      } else {
        console.error("업로드 실패:", response.statusText);
        setStatusMessage(`오류: 업로드 실패 (${response.statusText})`);
      }
    } catch (error) {
      console.error("업로드 중 네트워크 오류:", error);
      setStatusMessage("오류: 업로드 중 네트워크 문제가 발생했습니다.");
    }
  };

  const isLoading = !isFfmpegLoaded || isProcessing;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <header className="p-6 bg-gray-700 border-b border-gray-600">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-cyan-400">
            WebAssembly 비디오 레코더 (FFmpeg)
          </h1>
          <p className="text-center text-gray-300 mt-2">{statusMessage}</p>
        </header>

        <main className="p-4 md:p-6">
          {/* 비디오 미리보기 영역 */}
          <div className="bg-black rounded-lg mb-4 overflow-hidden aspect-video">
            <video ref={videoRef} className="w-full h-full" muted playsInline />
          </div>

          {/* 컨트롤 버튼 영역 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <button
              onClick={toggleCamera}
              disabled={isLoading}
              className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
            >
              <CameraIcon />
              {isCameraOn ? "카메라 끄기" : "카메라 시작"}
            </button>

            <button
              onClick={toggleRecording}
              disabled={isLoading || !isCameraOn}
              className={`flex items-center justify-center w-full font-bold py-3 px-4 rounded-lg transition-colors duration-300 ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              } disabled:bg-gray-500`}
            >
              <RecordIcon isRecording={isRecording} />
              {isRecording ? "녹화 중지" : "녹화 시작"}
            </button>
            <div className="sm:col-span-2 lg:col-span-1">
              <button
                onClick={uploadToServer}
                disabled={isLoading || !processedVideoUrl}
                className="flex items-center justify-center w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
              >
                <UploadIcon />
                서버로 업로드
              </button>
            </div>
          </div>

          {/* 처리 진행률 */}
          {isProcessing && (
            <div className="w-full bg-gray-600 rounded-full h-4 mb-4">
              <div
                className="bg-cyan-400 h-4 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
              <p className="text-center text-sm mt-1">
                {processingProgress}% 완료
              </p>
            </div>
          )}

          {/* 결과물 표시 영역 */}
          {processedVideoUrl && thumbnailUrl && (
            <div className="mt-6">
              <h2 className="text-xl font-bold text-center mb-4">처리 결과</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 처리된 비디오 */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">MP4 비디오</h3>
                  <video
                    src={processedVideoUrl}
                    controls
                    className="w-full rounded-md"
                  />
                  <button
                    onClick={() =>
                      downloadFile(processedVideoBlobRef.current, "video.mp4")
                    }
                    className="mt-3 w-full flex items-center justify-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    <DownloadIcon /> MP4 다운로드
                  </button>
                </div>
                {/* 생성된 썸네일 */}
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">JPEG 썸네일</h3>
                  <img
                    src={thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full rounded-md"
                  />
                  <button
                    onClick={() =>
                      downloadFile(thumbnailBlobRef.current, "thumbnail.jpg")
                    }
                    className="mt-3 w-full flex items-center justify-center bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    <DownloadIcon /> JPG 다운로드
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <footer className="text-center mt-6 text-gray-500 text-sm">
        <p>FFmpeg.wasm을 사용하여 브라우저에서 비디오를 처리합니다.</p>
        <p>
          이 애플리케이션은 서버에 영상을 저장하지 않습니다 (업로드 버튼 제외).
        </p>
      </footer>
    </div>
  );
}
