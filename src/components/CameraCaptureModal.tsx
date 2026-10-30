import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, Check, AlertCircle, Ghost } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  photoSlotLabel?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  photoSlotLabel = 'Foto da Fantasia',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isLoading, setIsLoading] = useState(false);

  const stopTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async () => {
    stopTracks();
    setCameraError(null);
    setIsLoading(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      setStream(media);
      if (videoRef.current) {
        videoRef.current.srcObject = media;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Não foi possível acessar a câmera. Verifique as permissões do seu navegador.');
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stopTracks]);

  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      startCamera();
    } else {
      stopTracks();
    }
    return () => {
      stopTracks();
    };
  }, [isOpen, startCamera, stopTracks]);

  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    // Limit maximum dimension to 900px for optimal speed and size in Firestore
    const maxDim = 900;
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;

    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      // Mirror horizontally for natural selfie experience
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setCapturedPhoto(dataUrl);
    stopTracks();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      onClose();
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#11091d] border border-orange-500/40 rounded-2xl overflow-hidden shadow-2xl glow-orange">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-orange-500/20 bg-black/40">
          <div className="flex items-center gap-2 text-orange-400">
            <Camera className="w-5 h-5" />
            <h3 className="font-cinzel font-bold text-base text-gray-100">
              Tirar Foto Agora ({photoSlotLabel})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview */}
        <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-red-400 flex flex-col items-center gap-2">
              <AlertCircle className="w-10 h-10" />
              <p className="text-sm font-medium">{cameraError}</p>
              <button
                onClick={startCamera}
                className="mt-3 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold"
              >
                Tentar Novamente
              </button>
            </div>
          ) : capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Prévia capturada"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Halloween viewfinder markings */}
              <div className="absolute inset-4 pointer-events-none border border-orange-500/30 rounded-xl">
                <div className="absolute top-2 left-2 text-xs font-creepster text-orange-400/80 tracking-widest">
                  🎃 T99 VIEW
                </div>
                <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-gray-400">
                  <Ghost className="w-3 h-3 text-orange-400" />
                  <span>Enquadre a fantasia</span>
                </div>
              </div>

              {isLoading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-orange-400 text-sm">
                  Iniciando lente amaldiçoada...
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-black/60 flex items-center justify-between gap-3">
          {capturedPhoto ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tirar Outra</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/30 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Usar Esta Foto</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleFacingMode}
                title="Trocar câmera"
                className="p-2.5 rounded-xl border border-white/10 hover:border-orange-500/40 text-gray-300 hover:text-orange-400 text-sm flex items-center justify-center gap-1 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-xs">Virar</span>
              </button>

              <button
                type="button"
                onClick={handleSnap}
                disabled={isLoading || !!cameraError}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 text-white font-cinzel font-bold text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/40 disabled:opacity-50 transition-all"
              >
                <Camera className="w-5 h-5" />
                <span>CAPTURAR FOTO</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
