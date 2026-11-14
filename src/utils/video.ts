export function isVideoUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Ignore docx, pdf, standard non-video images
  if (trimmed.match(/\.(docx?|pdf|pptx?|xlsx?|png|jpe?g|webp|gif|svg)(\?.*)?$/i)) {
    return false;
  }

  // Common video platforms
  if (
    /(?:youtube\.com|youtu\.be|drive\.google\.com|vimeo\.com|loom\.com|tiktok\.com|facebook\.com\/reel)/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  // Direct video file extensions
  if (trimmed.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i)) {
    return true;
  }

  // Embed or preview paths
  if (trimmed.includes('/embed/') || trimmed.includes('/preview')) {
    return true;
  }

  return false;
}

export function parseVideoEmbedUrl(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Extract from <iframe> snippet if user pasted full embed HTML
  const iframeSrcMatch = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const targetUrl = (iframeSrcMatch ? iframeSrcMatch[1] : trimmed).trim();

  // YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID or youtu.be/shorts/VIDEO_ID
  const ytShortsMatch = targetUrl.match(
    /(?:youtube\.com|youtu\.be)\/shorts\/([a-zA-Z0-9_-]{11})/i,
  );
  if (ytShortsMatch && ytShortsMatch[1]) {
    return `https://www.youtube.com/embed/${ytShortsMatch[1]}`;
  }

  // YouTube standard / live / embed:
  // e.g. https://www.youtube.com/watch?v=VIDEO_ID, https://youtu.be/VIDEO_ID, https://www.youtube.com/live/VIDEO_ID
  const ytMatch = targetUrl.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  );
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // Google Drive:
  // Matches:
  // https://drive.google.com/file/d/FILE_ID/view...
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  // https://docs.google.com/file/d/FILE_ID/...
  const gDriveMatch = targetUrl.match(
    /(?:drive|docs)\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?(?:.*&)?id=([a-zA-Z0-9_-]+)|uc\?(?:.*&)?id=([a-zA-Z0-9_-]+))/i,
  );
  if (gDriveMatch) {
    const fileId = gDriveMatch[1] || gDriveMatch[2] || gDriveMatch[3];
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
  }

  // Vimeo: https://vimeo.com/VIDEO_ID
  const vimeoMatch = targetUrl.match(
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i,
  );
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  // Loom: https://www.loom.com/share/VIDEO_ID or https://www.loom.com/embed/VIDEO_ID
  const loomMatch = targetUrl.match(
    /loom\.com\/(?:share|embed)\/([a-zA-Z0-9_-]+)/i,
  );
  if (loomMatch && loomMatch[1]) {
    return `https://www.loom.com/embed/${loomMatch[1]}`;
  }

  // If already an embed URL or preview
  if (targetUrl.includes('/embed/') || targetUrl.includes('/preview')) {
    return targetUrl;
  }

  // Direct video file
  if (targetUrl.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i)) {
    return targetUrl;
  }

  // If starts with http(s)
  if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
    return targetUrl;
  }

  return null;
}
