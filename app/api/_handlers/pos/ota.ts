import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, verifyRoles } from '@/lib/api/auth-guard';

const TRUSTED_GITHUB_OWNER = 'muhammadhafla';
const TRUSTED_GITHUB_REPO = 'bms-native-pos';
const SAFE_SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

const safeSegmentSchema = z
  .string()
  .trim()
  .min(1)
  .max(150)
  .regex(SAFE_SEGMENT_RE)
  .refine((val) => !val.includes('..'));

const otaQuerySchema = z.object({
  asset: safeSegmentSchema.optional(),
  tag: safeSegmentSchema.optional(),
  platform: safeSegmentSchema.optional().default('win-x64'),
  channel: safeSegmentSchema.optional().default('win'),
  appId: safeSegmentSchema.optional().default('BMSPOS'),
});

interface GitHubReleaseAsset {
  id: number;
  name: string;
  size: number;
  content_type?: string;
}

interface GitHubReleaseResponse {
  tag_name: string;
  name?: string;
  published_at?: string;
  body?: string;
  assets?: GitHubReleaseAsset[];
}

interface VelopackFeedEntry {
  PackageId?: string;
  Version?: string;
  Type?: string;
  FileName?: string;
  SHA1?: string;
  SHA256?: string;
  Size?: number;
  NotesMarkdown?: string;
  NotesHTML?: string;
}

interface VelopackFeedJson {
  Assets?: VelopackFeedEntry[];
}

async function resolveGithubOtaToken(): Promise<string | null> {
  const envToken = process.env.GITHUB_UPDATE_TOKEN?.trim();
  if (envToken) return envToken;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'github_update_token')
    .maybeSingle();

  if (error || !data?.value) {
    return null;
  }

  const trimmed = String(data.value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildGithubHeaders(token: string, accept: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    'User-Agent': 'BMS-Inventory-OTA-Proxy/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function resolveOrigin(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl && (envUrl.startsWith('https://') || envUrl.startsWith('http://localhost'))) {
    return envUrl.replace(/\/+$/, '');
  }
  return new URL(request.url).origin;
}

async function fetchRelease(token: string, tagOrVersion?: string | null): Promise<Response> {
  const base = `https://api.github.com/repos/${TRUSTED_GITHUB_OWNER}/${TRUSTED_GITHUB_REPO}/releases`;
  if (!tagOrVersion) {
    return fetch(`${base}/latest`, {
      headers: buildGithubHeaders(token, 'application/vnd.github+json'),
      cache: 'no-store',
    });
  }

  const res = await fetch(`${base}/tags/${encodeURIComponent(tagOrVersion)}`, {
    headers: buildGithubHeaders(token, 'application/vnd.github+json'),
    cache: 'no-store',
  });

  if (res.status === 404 && !tagOrVersion.startsWith('v') && !tagOrVersion.startsWith('V')) {
    return fetch(`${base}/tags/${encodeURIComponent(`v${tagOrVersion}`)}`, {
      headers: buildGithubHeaders(token, 'application/vnd.github+json'),
      cache: 'no-store',
    });
  }

  return res;
}

function buildAssetProxyUrl(
  origin: string,
  platform: string,
  tag: string,
  fileName: string,
): string {
  const params = new URLSearchParams({
    platform,
    tag,
    asset: fileName,
  });
  return `${origin}/api/pos/ota?${params.toString()}`;
}

/**
 * Proxy server OTA untuk aplikasi POS Desktop (Windows Velopack & Linux x64).
 * Mengambil manifest rilis terbaru atau melakukan streaming aset biner dari GitHub
 * tanpa pernah mengekspos `github_update_token` ke klien.
 */
export async function GET(request: Request) {
  try {
    const { error: roleError } = await verifyRoles(request, [
      'admin',
      'kasir',
      'kepala_cabang',
      'kepala_gudang',
    ]);
    if (roleError) return roleError;

    const token = await resolveGithubOtaToken();
    if (!token) {
      return NextResponse.json(
        { error: 'Konfigurasi OTA GitHub belum tersedia di server.' },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = otaQuerySchema.safeParse({
      asset: searchParams.get('asset')?.trim() || undefined,
      tag: (searchParams.get('tag') || searchParams.get('version'))?.trim() || undefined,
      platform: searchParams.get('platform')?.trim().toLowerCase() || undefined,
      channel: searchParams.get('channel')?.trim().toLowerCase() || undefined,
      appId: searchParams.get('appId')?.trim() || undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'Parameter query OTA tidak valid.' }, { status: 400 });
    }

    const {
      asset: requestedAsset,
      tag: requestedTag,
      platform,
      channel,
      appId,
    } = parsedQuery.data;

    const releaseRes = await fetchRelease(token, requestedAsset ? requestedTag : null);

    if (!releaseRes.ok) {
      console.error('[api/pos/ota] GitHub release fetch failed:', releaseRes.status);
      return NextResponse.json(
        { error: 'Gagal memeriksa pembaruan rilis POS.' },
        { status: releaseRes.status === 404 ? 404 : 502 },
      );
    }

    const release = (await releaseRes.json()) as GitHubReleaseResponse;
    const assets = release.assets || [];

    // Mode 1: Proxy streaming download asset (Velopack *.nupkg / Linux binary / .deb)
    if (requestedAsset) {
      const targetAsset = assets.find((a) => a.name === requestedAsset);
      if (!targetAsset) {
        return NextResponse.json({ error: 'Aset rilis tidak ditemukan.' }, { status: 404 });
      }

      const assetApiUrl = `https://api.github.com/repos/${TRUSTED_GITHUB_OWNER}/${TRUSTED_GITHUB_REPO}/releases/assets/${targetAsset.id}`;
      const assetRes = await fetch(assetApiUrl, {
        headers: buildGithubHeaders(token, 'application/octet-stream'),
        redirect: 'follow',
        cache: 'no-store',
      });

      if (!assetRes.ok || !assetRes.body) {
        console.error('[api/pos/ota] GitHub asset stream failed:', assetRes.status);
        return NextResponse.json(
          { error: 'Gagal mengunduh aset pembaruan POS.' },
          { status: 502 },
        );
      }

      const contentType = requestedAsset.endsWith('.json')
        ? 'application/json; charset=utf-8'
        : targetAsset.content_type || 'application/octet-stream';

      const headers = new Headers({
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="${targetAsset.name}"`,
      });
      if (targetAsset.size > 0) {
        headers.set('Content-Length', String(targetAsset.size));
      }

      return new Response(assetRes.body, {
        status: 200,
        headers,
      });
    }

    // Mode 2: Manifest JSON kompatibel BmsOtaClient (Windows Velopack & Linux)
    const origin = resolveOrigin(request);
    const cleanVersion = release.tag_name.replace(/^v/i, '');

    if (platform.startsWith('linux')) {
      const linuxAssets = assets.filter((a) => {
        const lower = a.name.toLowerCase();
        return (
          lower === 'bmspos.linux' ||
          lower.endsWith('.deb') ||
          lower.endsWith('.appimage') ||
          lower.endsWith('.tar.gz')
        );
      });

      // Prioritaskan biner standalone BMSPOS.Linux bila tersedia (sesuai LinuxAutoUpdateService.DownloadAndApplyUpdateAsync)
      const sortedLinux = [...linuxAssets].sort((a, b) => {
        if (a.name.toLowerCase() === 'bmspos.linux') return -1;
        if (b.name.toLowerCase() === 'bmspos.linux') return 1;
        return 0;
      });

      const mappedAssets = sortedLinux.map((asset) => ({
        packageId: 'BMSPOS.Linux',
        version: cleanVersion,
        type: 'Full',
        fileName: asset.name,
        size: asset.size,
        notesMarkdown: release.body || '',
        downloadUrl: buildAssetProxyUrl(origin, platform, release.tag_name, asset.name),
      }));

      return NextResponse.json(
        {
          platform,
          version: cleanVersion,
          tag: release.tag_name,
          changelog: release.body || '',
          isMandatory: false,
          downloadUrl: mappedAssets[0]?.downloadUrl || null,
          assets: mappedAssets,
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // Windows Velopack: prioritaskan metadata resmi dari releases.<channel>.json / releases.win.json
    const feedAsset =
      assets.find((a) => a.name.toLowerCase() === `releases.${channel}.json`) ||
      assets.find((a) => a.name.toLowerCase() === 'releases.win.json');

    let mappedWinAssets: Array<{
      packageId: string;
      version: string;
      type: string;
      fileName: string;
      sha1: string;
      sha256: string;
      size: number;
      notesMarkdown?: string;
      notesHtml?: string;
      downloadUrl: string;
    }> = [];

    if (feedAsset) {
      const feedUrl = `https://api.github.com/repos/${TRUSTED_GITHUB_OWNER}/${TRUSTED_GITHUB_REPO}/releases/assets/${feedAsset.id}`;
      const feedRes = await fetch(feedUrl, {
        headers: buildGithubHeaders(token, 'application/octet-stream'),
        redirect: 'follow',
        cache: 'no-store',
      });

      if (feedRes.ok) {
        const feedJson = (await feedRes.json().catch(() => null)) as VelopackFeedJson | null;
        if (feedJson?.Assets && Array.isArray(feedJson.Assets)) {
          mappedWinAssets = feedJson.Assets.filter((entry) => Boolean(entry.FileName)).map(
            (entry) => {
              const fileName = entry.FileName!;
              return {
                packageId: entry.PackageId || appId,
                version: entry.Version || cleanVersion,
                type: entry.Type || (fileName.toLowerCase().includes('-delta.') ? 'Delta' : 'Full'),
                fileName,
                sha1: entry.SHA1 || '',
                sha256: entry.SHA256 || '',
                size: entry.Size || 0,
                notesMarkdown: entry.NotesMarkdown || release.body || '',
                notesHtml: entry.NotesHTML,
                downloadUrl: buildAssetProxyUrl(origin, platform, release.tag_name, fileName),
              };
            },
          );
        }
      }
    }

    // Fallback apabila releases.<channel>.json tidak ada di aset rilis GitHub
    if (mappedWinAssets.length === 0) {
      mappedWinAssets = assets
        .filter((a) => a.name.toLowerCase().endsWith('.nupkg'))
        .map((asset) => ({
          packageId: appId,
          version: cleanVersion,
          type: asset.name.toLowerCase().includes('-delta.') ? 'Delta' : 'Full',
          fileName: asset.name,
          sha1: '',
          sha256: '',
          size: asset.size,
          notesMarkdown: release.body || '',
          downloadUrl: buildAssetProxyUrl(origin, platform, release.tag_name, asset.name),
        }));
    }

    return NextResponse.json(
      {
        platform,
        version: cleanVersion,
        tag: release.tag_name,
        changelog: release.body || '',
        isMandatory: false,
        downloadUrl: mappedWinAssets[0]?.downloadUrl || null,
        assets: mappedWinAssets,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[api/pos/ota] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal pada layanan OTA.' },
      { status: 500 },
    );
  }
}
