import axios from "axios";
import youtubedlPkg from "youtube-dl-exec";
import { DEFAULT_USER_AGENT, debugReport } from "./task-types.js";

const youtubedl = (youtubedlPkg as any).default || youtubedlPkg;

export interface AnalyzeFormat {
  id: string;
  quality: string;
  format: string;
  size: number;
  url: string;
  supportsRange: boolean;
  title?: string;
  note?: string;
}

const PLATFORM_MATCHERS: { key: string; name: string; match: (u: string) => boolean }[] = [
  { key: "youtube", name: "YouTube", match: (u) => /(?:youtube\.com|youtu\.be|yt\.be)/i.test(u) },
  { key: "facebook", name: "Facebook", match: (u) => /(?:facebook\.com|fb\.watch|fb\.com|fb\.me)/i.test(u) },
  { key: "instagram", name: "Instagram", match: (u) => /instagram\.com/i.test(u) },
  { key: "tiktok", name: "TikTok", match: (u) => /(?:tiktok\.com|vm\.tiktok\.com|musical\.ly)/i.test(u) },
  { key: "twitter", name: "Twitter/X", match: (u) => /(?:twitter\.com|x\.com|t\.co)/i.test(u) },
  { key: "reddit", name: "Reddit", match: (u) => /(?:reddit\.com|redd\.it|v\.redd\.it)/i.test(u) },
  { key: "vimeo", name: "Vimeo", match: (u) => /(?:vimeo\.com|player\.vimeo\.com)/i.test(u) },
  { key: "twitch", name: "Twitch", match: (u) => /(?:twitch\.tv|clips\.twitch\.tv)/i.test(u) },
  { key: "bilibili", name: "Bilibili", match: (u) => /(?:bilibili\.com|b23\.tv|bilibilivideo\.com)/i.test(u) },
  { key: "soundcloud", name: "SoundCloud", match: (u) => /(?:soundcloud\.com|on\.soundcloud\.com)/i.test(u) },
  { key: "pinterest", name: "Pinterest", match: (u) => /(?:pinterest\.(?:com|co\.uk|jp|de|fr|es|ca|au))/i.test(u) },
  { key: "imgur", name: "Imgur", match: (u) => /(?:imgur\.com|i\.imgur\.com)/i.test(u) },
  { key: "dailymotion", name: "Dailymotion", match: (u) => /(?:dailymotion\.com|dai\.ly)/i.test(u) },
  { key: "vk", name: "VK", match: (u) => /(?:vk\.com|vk\.video|vkontakte\.ru)/i.test(u) },
  { key: "odnoklassniki", name: "OK.RU", match: (u) => /(?:ok\.ru|odnoklassniki\.ru)/i.test(u) },
  { key: "linkedin", name: "LinkedIn", match: (u) => /(?:linkedin\.com|lnkd\.in)/i.test(u) },
  { key: "rumble", name: "Rumble", match: (u) => /rumble\.com/i.test(u) },
  { key: "kick", name: "Kick", match: (u) => /kick\.com/i.test(u) },
  { key: "telegram", name: "Telegram", match: (u) => /(?:t\.me|telegram\.me)/i.test(u) },
  { key: "doodstream", name: "DoodStream", match: (u) => /(?:dood\.(?:so|to|la|pm|sh|nu|wf|re)|doodstream\.com)/i.test(u) },
  { key: "streamtape", name: "Streamtape", match: (u) => /(?:streamtape\.com|strtapeadblocker\.xyz|streamta\.pe)/i.test(u) },
  { key: "hls_generic", name: "HLS Stream (.m3u8)", match: (u) => /\.m3u8(\?|$)/i.test(u) },
  { key: "dash_generic", name: "DASH Stream (.mpd)", match: (u) => /\.mpd(\?|$)/i.test(u) },
  { key: "direct_mp4", name: "Direct Video (.mp4/.mkv/.mov/.webm)", match: (u) => /\.(mp4|mkv|mov|webm|avi|flv|wmv|m4v|ts|m3u8)(\?|$)/i.test(u) },
  { key: "direct_audio", name: "Direct Audio (.mp3/.wav/.flac/.m4a)", match: (u) => /\.(mp3|wav|flac|m4a|aac|ogg|opus|wma)(\?|$)/i.test(u) },
  { key: "direct_image", name: "Direct Image (.jpg/.png/.gif/.webp)", match: (u) => /\.(jpe?g|png|gifv?|webp|svg|bmp|tiff?)(\?|$)/i.test(u) },
  { key: "direct_zip", name: "Direct Archive (.zip/.rar/.7z/.tar)", match: (u) => /\.(zip|rar|7z|tar|gz|bz2|xz|iso)(\?|$)/i.test(u) },
];

export function detectPlatform(url: string): { key: string; name: string } {
  for (const p of PLATFORM_MATCHERS) {
    try { if (p.match(url)) return { key: p.key, name: p.name }; } catch { /* ignore */ }
  }
  return { key: "generic", name: "Generic Web URL" };
}

export function listSupportedPlatforms(): { key: string; name: string; category: "social" | "stream" | "direct" }[] {
  const socials = ["youtube","facebook","instagram","tiktok","twitter","reddit","vimeo","twitch","bilibili","soundcloud","pinterest","imgur","dailymotion","vk","odnoklassniki","linkedin","rumble","kick","telegram"];
  const streams = ["hls_generic","dash_generic","doodstream","streamtape"];
  return PLATFORM_MATCHERS.map((p) => ({
    key: p.key,
    name: p.name,
    category: socials.includes(p.key) ? "social" : streams.includes(p.key) ? "stream" : "direct",
  }));
}

async function ytdlDumpFormats(url: string, extra: any = {}): Promise<any> {
  return youtubedl(url, {
    dumpSingleJson: true,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    noPlaylist: true,
    addHeader: [`referer:https://www.google.com`, `user-agent:${DEFAULT_USER_AGENT}`],
    ...extra,
  });
}

function estimateSize(fmt: any): number {
  if (!fmt) return 0;
  if (typeof fmt.filesize === "number" && fmt.filesize > 0) return fmt.filesize;
  if (typeof fmt.filesize_approx === "number" && fmt.filesize_approx > 0) return fmt.filesize_approx;
  if (fmt.tbr && fmt.duration) return Math.floor(((fmt.tbr * 1000) * fmt.duration) / 8);
  if (fmt.vbr && fmt.duration) return Math.floor(((fmt.vbr * 1000) * fmt.duration) / 8);
  if (fmt.abr && fmt.duration) return Math.floor(((fmt.abr * 1000) * fmt.duration) / 8);
  return 0;
}

export interface UniversalAnalyzeResult {
  platform: { key: string; name: string };
  title: string;
  thumbnail?: string;
  durationSec?: number;
  formats: AnalyzeFormat[];
  requiresYtDlpDownload: boolean;
}

export async function analyzeUniversalMedia(url: string): Promise<UniversalAnalyzeResult> {
  const platform = detectPlatform(url);
  debugReport("A", "universal-extractors.ts:analyzeUniversalMedia", "Analyzing URL", { url, platform: platform.key });

  let info: any = null;
  let ytdlSuccess = false;

  if (platform.key !== "generic" || /^https?:\/\//i.test(url)) {
    try {
      info = await ytdlDumpFormats(url);
      ytdlSuccess = !!info;
    } catch (e: any) {
      const err = String(e?.message || e?.stderr || e);
      debugReport("C", "universal-extractors.ts:analyzeUniversalMedia", "yt-dl universal analyze fallback attempt failed", { platform: platform.key, error: err.substring(0, 200) });
      if (err.includes("Sign in to confirm")) {
        throw new Error("Platform ini membutuhkan login (cookies). Silakan isi cookies di Settings.");
      }
    }
  }

  if (ytdlSuccess && info) {
    const formatsList: any[] = Array.isArray(info.formats) ? info.formats : [];
    const normalizedTitle = String(info.title || info.description || platform.name + "_Media").substring(0, 120);
    const durationSec: number | undefined = typeof info.duration === "number" ? info.duration : undefined;
    const thumbnail: string | undefined = info.thumbnail || info.thumbnails?.[0]?.url || undefined;

    const uniqueStreams: AnalyzeFormat[] = [];
    const seen = new Set<string>();

    const directCombined = formatsList
      .filter((f) => f.vcodec && f.vcodec !== "none" && f.acodec && f.acodec !== "none" && f.url)
      .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0));

    for (const f of directCombined.slice(0, 8)) {
      const sig = `${f.format_id}-c`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      uniqueStreams.push({
        id: `fmt-${sig}`,
        quality: f.resolution || f.format_note || f.quality || `${f.height || 0}p`,
        format: f.ext ? `video/${f.ext}` : f.acodec ? "video/mp4" : "video/mp4",
        size: estimateSize(f),
        url: f.url,
        supportsRange: f.protocol === "https" || f.protocol === "http" || !f.protocol,
        title: normalizedTitle,
        note: "Video + Audio (recommended)",
      });
    }

    if (uniqueStreams.length === 0 && formatsList.length > 0) {
      const bestVideo = formatsList.filter((f) => f.vcodec && f.vcodec !== "none" && f.url).sort((a, b) => (b.height || 0) - (a.height || 0))[0];
      const bestAudio = formatsList.filter((f) => f.acodec && f.acodec !== "none" && f.url).sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];
      const combinedUrl = info.url || bestVideo?.url || bestAudio?.url || url;
      const combinedSize = estimateSize(bestVideo) + estimateSize(bestAudio);
      if (combinedUrl) {
        uniqueStreams.push({
          id: "ytdl-combined",
          quality: (bestVideo?.format_note || bestVideo?.resolution || "Best Quality") + " + Audio",
          format: bestVideo?.ext ? `video/${bestVideo.ext}` : "video/mp4",
          size: combinedSize,
          url: combinedUrl,
          supportsRange: true,
          title: normalizedTitle,
          note: "yt-dlp multi-track DASH merge (required)",
        });
      }
    }

    if (info.url && !uniqueStreams.some((s) => s.url === info.url)) {
      uniqueStreams.unshift({
        id: "ytdl-best",
        quality: info.format_note || info.resolution || "Best Combined",
        format: info.ext ? `video/${info.ext}` : "video/mp4",
        size: estimateSize(info),
        url: info.url,
        supportsRange: true,
        title: normalizedTitle,
        note: "yt-dlp auto-selected format",
      });
    }

    if (uniqueStreams.length === 0) {
      uniqueStreams.push({
        id: "ytdl-generic",
        quality: "yt-dlp Download",
        format: info.ext ? `video/${info.ext}` : "video/mp4",
        size: estimateSize(info),
        url: url,
        supportsRange: true,
        title: normalizedTitle,
        note: "Force yt-dlp engine extraction",
      });
    }

    return {
      platform,
      title: normalizedTitle,
      thumbnail,
      durationSec,
      formats: uniqueStreams,
      requiresYtDlpDownload: true,
    };
  }

  let size = 0;
  let contentType = "application/octet-stream";
  let acceptRanges = false;
  try {
    const resp = await axios.head(url, { timeout: 8000, headers: { "User-Agent": DEFAULT_USER_AGENT } });
    const cl = resp.headers["content-length"] as string | undefined;
    contentType = (resp.headers["content-type"] as string) || contentType;
    acceptRanges = resp.headers["accept-ranges"] === "bytes";
    size = cl ? parseInt(cl, 10) : 0;
  } catch {
    /* head not supported - fallthrough */
  }

  return {
    platform,
    title: url.split("/").pop()?.split("?")[0]?.substring(0, 80) || "download",
    formats: [{ id: "direct", quality: "Direct Source", format: contentType, size, url, supportsRange: acceptRanges, title: platform.name }],
    requiresYtDlpDownload: platform.key !== "generic" && !platform.key.startsWith("direct_"),
  };
}
