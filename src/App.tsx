import { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Video, CircleDot, Upload, RotateCcw, Download } from "lucide-react";
import messages from "./messages";

export default function App() {
  const [language, setLanguage] = useState<"ko" | "en">("en");
  type MessageKey = keyof typeof messages;
  const t = (key: MessageKey) => messages[key][language];

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
  const [statusMessage, setStatusMessage] = useState(t("initializing"));

  // Update status message when language changes
  useEffect(() => {
    setStatusMessage((prev) => {
      const key = Object.keys(messages).find(
        (k) =>
          messages[k as MessageKey].ko === prev.split(" / ")[0] ||
          messages[k as MessageKey].en === prev
      ) as MessageKey;
      return key ? t(key) : t("initializing");
    });
  }, [language]);

  // Refs for FFmpeg instance and video elements
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const processedVideoBlobRef = useRef<Blob | null>(null);
  const thumbnailBlobRef = useRef<Blob | null>(null);

  // Initialize FFmpeg on component mount
  useEffect(() => {
    const initializeFFmpeg = async () => {
      try {
        ffmpegRef.current = new FFmpeg();
        const ffmpeg = ffmpegRef.current;
        ffmpeg.on("log", ({ message }) => console.log(message));
        ffmpeg.on("progress", ({ progress }) =>
          setProcessingProgress(Math.round(progress * 100))
        );
        setStatusMessage(t("loadingCore"));
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
        setStatusMessage(t("loaded"));
      } catch (error) {
        setStatusMessage(t("loadError"));
      }
    };
    initializeFFmpeg();
  }, []);

  // Toggle camera state
  const toggleCamera = async () => {
    if (isCameraOn) {
      if (mediaStream) mediaStream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setMediaStream(null);
      setIsCameraOn(false);
      setStatusMessage(t("cameraOff"));
    } else {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatusMessage(t("cameraUnsupported"));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setMediaStream(stream);
        setIsCameraOn(true);
        setStatusMessage(t("cameraReady"));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((e) => {
              setStatusMessage(t("cameraPlayError"));
            });
          };
        }
      } catch (error) {
        console.error("카메라 접근 실패:", error);
        let key: MessageKey = "cameraAccessError";
        if (error instanceof DOMException) {
          if (error.name === "NotAllowedError") key = "permissionDenied";
          else if (error.name === "NotFoundError") key = "deviceNotFound";
          else if (error.name === "NotReadableError") key = "deviceNotReadable";
        }
        setStatusMessage(t(key));
      }
    }
  };

  // Toggle recording state
  const toggleRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setStatusMessage(t("recordingStopped"));
    } else {
      if (!mediaStream) {
        setStatusMessage(t("recordingStartError"));
        return;
      }
      setProcessedVideoUrl(null);
      setThumbnailUrl(null);
      processedVideoBlobRef.current = null;
      thumbnailBlobRef.current = null;
      recordedChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(mediaStream, {
        mimeType: "video/webm",
      });
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => processVideo();
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatusMessage(t("recording"));
    }
  };

  // Process the recorded video
  const processVideo = async () => {
    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) {
      setStatusMessage(t("ffmpegNotLoaded"));
      return;
    }
    setIsProcessing(true);
    setProcessingProgress(0);

    const recordedBlob = new Blob(recordedChunksRef.current, {
      type: "video/webm",
    });

    try {
      // 1. save recorded file into virtual file system of FFmpeg
      setStatusMessage(t("writingFile"));
      await ffmpeg.writeFile("input.webm", await fetchFile(recordedBlob));

      // 2. convert webm to mp4 and extract thumbnail
      setStatusMessage(t("converting"));
      await ffmpeg.exec(["-i", "input.webm", "-c:v", "libx264", "output.mp4"]);

      // 3. extract thumbnail from the video
      setStatusMessage(t("extractingThumbnail"));
      await ffmpeg.exec([
        "-i",
        "output.mp4",
        "-ss",
        "00:00:01.000",
        "-vframes",
        "1",
        "thumbnail.jpg",
      ]);

      // 4. read the processed files from FFmpeg's virtual file system
      const mp4Data: any = await ffmpeg.readFile("output.mp4");
      const thumbData: any = await ffmpeg.readFile("thumbnail.jpg");

      // 5. create Blobs and URLs for the processed video and thumbnail
      const videoBlob = new Blob([mp4Data], { type: "video/mp4" });
      processedVideoBlobRef.current = videoBlob;
      setProcessedVideoUrl(URL.createObjectURL(videoBlob));

      const thumbBlob = new Blob([thumbData], { type: "image/jpeg" });
      thumbnailBlobRef.current = thumbBlob;
      setThumbnailUrl(URL.createObjectURL(thumbBlob));

      setStatusMessage(t("processingComplete"));
    } catch (error) {
      setStatusMessage(t("processingError"));
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);

      try {
        await ffmpeg.deleteFile("input.webm");
        await ffmpeg.deleteFile("output.mp4");
        await ffmpeg.deleteFile("thumbnail.jpg");
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // Download processed video or thumbnail
  const downloadFile = (blob: Blob | null, filename: string) => {
    if (!blob) {
      setStatusMessage(t("downloadError"));
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

  // Upload processed video and thumbnail to server
  const uploadToServer = async () => {
    if (!processedVideoBlobRef.current || !thumbnailBlobRef.current) {
      setStatusMessage(t("uploadErrorNoFile"));
      return;
    }
    setStatusMessage(t("uploading"));
    const formData = new FormData();
    formData.append("video", processedVideoBlobRef.current, "recording.mp4");
    formData.append("thumbnail", thumbnailBlobRef.current, "thumbnail.jpg");

    try {
      const response = await fetch("https://your-server.com/api/upload", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        setStatusMessage(t("uploadSuccess"));
      } else {
        setStatusMessage(`${t("uploadFail")} (${response.statusText})`);
      }
    } catch (error) {
      setStatusMessage(t("uploadNetworkError"));
    }
  };

  // Reset the application state
  const handleReset = () => {
    setStatusMessage(t("resetting"));
    if (isCameraOn) toggleCamera();

    setProcessedVideoUrl(null);
    setThumbnailUrl(null);
    processedVideoBlobRef.current = null;
    thumbnailBlobRef.current = null;
    recordedChunksRef.current = [];
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
    setStatusMessage(t("loaded"));
  };

  const isLoading = !isFfmpegLoaded || isProcessing;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 font-sans">
      <div className="w-full max-w-3xl mx-auto bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
        <header className="p-6 bg-gray-700/50 border-b border-gray-600">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-cyan-300">{t("title")}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage("ko")}
                className={`px-2 py-1 text-sm rounded-md mr-2 transition-colors ${
                  language === "ko"
                    ? "bg-cyan-500 text-black"
                    : "bg-gray-600 hover:bg-gray-500"
                }`}
              >
                한국어
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  language === "en"
                    ? "bg-cyan-500 text-black"
                    : "bg-gray-600 hover:bg-gray-500"
                }`}
              >
                English
              </button>
            </div>
          </div>
          <p className="text-center text-gray-400 mt-4 h-5">{statusMessage}</p>
        </header>

        <main className="p-6 md:p-8">
          <div className="bg-black rounded-lg mb-6 overflow-hidden aspect-video flex items-center justify-center border border-gray-700">
            <video ref={videoRef} className="w-full h-full" muted playsInline />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={toggleCamera}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-400/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-400"
            >
              <Video className="mr-2" size={20} />
              {isCameraOn ? t("stopCamera") : t("startCamera")}
            </button>
            <button
              onClick={toggleRecording}
              disabled={isLoading || !isCameraOn}
              className={`flex items-center justify-center gap-2 w-full font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording
                  ? "bg-red-600 hover:bg-red-500 hover:shadow-red-400/50 focus:ring-red-400"
                  : "bg-green-600 hover:bg-green-500 hover:shadow-green-400/50 focus:ring-green-400"
              } disabled:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800`}
            >
              <CircleDot className="mr-2" size={20} />
              {isRecording ? t("stopRecording") : t("startRecording")}
            </button>
            <button
              onClick={uploadToServer}
              disabled={isLoading || !processedVideoUrl}
              className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-400/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-400"
            >
              <Upload className="mr-2" size={20} />
              {t("uploadToServer")}
            </button>
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full bg-gray-500 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-gray-400/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-400"
            >
              <RotateCcw className="mr-2" size={20} />
              {t("reset")}
            </button>
          </div>
          {isProcessing && (
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
              <div
                className="bg-cyan-400 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
              <p className="text-center text-xs text-gray-400 mt-2">
                {processingProgress}% {t("progressComplete")}
              </p>
            </div>
          )}
          {processedVideoUrl && thumbnailUrl && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-center mb-4 text-cyan-300">
                {t("resultsTitle")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold mb-3 text-white">
                    {t("videoTitle")}
                  </h3>
                  <video
                    src={processedVideoUrl}
                    controls
                    className="w-full rounded-md"
                  />
                  <button
                    onClick={() =>
                      downloadFile(processedVideoBlobRef.current, "video.mp4")
                    }
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    <Download className="mr-2" size={16} /> {t("downloadMp4")}
                  </button>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold mb-3 text-white">
                    {t("thumbnailTitle")}
                  </h3>
                  <img
                    src={thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full rounded-md"
                  />
                  <button
                    onClick={() =>
                      downloadFile(thumbnailBlobRef.current, "thumbnail.jpg")
                    }
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    <Download className="mr-2" size={16} />
                    {t("downloadJpg")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <footer className="text-center mt-8 text-gray-500 text-sm">
        <p>{t("footerNote1")}</p>
        <p>{t("footerNote2")}</p>
      </footer>
    </div>
  );
}
