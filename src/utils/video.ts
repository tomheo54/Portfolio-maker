export function parseVideoEmbedUrl(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // YouTube standard: https://www.youtube.com/watch?v=VIDEO_ID
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID
  const ytShortsMatch = trimmed.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/i);
  if (ytShortsMatch && ytShortsMatch[1]) {
    return `https://www.youtube.com/embed/${ytShortsMatch[1]}`;
  }

  // Google Drive: https://drive.google.com/file/d/FILE_ID/view...
  const gDriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gDriveMatch && gDriveMatch[1]) {
    return `https://drive.google.com/file/d/${gDriveMatch[1]}/preview`;
  }

  // Vimeo: https://vimeo.com/VIDEO_ID
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // If already an embed URL or raw video file
  if (trimmed.includes('/embed/') || trimmed.includes('/preview') || trimmed.match(/\.(mp4|webm|ogg)$/i)) {
    return trimmed;
  }

  return trimmed;
}
