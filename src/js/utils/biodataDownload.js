/** Turn a data: URL or http(s) URL into a Blob and trigger a file download. */
function dataUrlToBlob(dataUrl) {
  const trimmed = String(dataUrl).trim();
  if (!trimmed.startsWith('data:')) return null;

  const comma = trimmed.indexOf(',');
  if (comma < 0) return null;

  const header = trimmed.slice(0, comma);
  const payload = trimmed.slice(comma + 1).replace(/\s/g, '');
  const mime = header.match(/^data:([^;,]+)/i)?.[1] || 'application/pdf';
  const isBase64 = /;base64/i.test(header);

  let bytes;
  if (isBase64) {
    const binary = atob(payload);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(payload));
  }

  return new Blob([bytes], { type: mime || 'application/pdf' });
}

function triggerBlobDownload(blob, filename) {
  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 200);
}

export function biodataFileName(displayName) {
  const base = String(displayName || 'profile')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${base || 'biodata'}-biodata.pdf`;
}

/**
 * Download biodata stored as data:application/pdf;base64,... or a remote URL.
 * @returns {Promise<boolean>}
 */
export async function downloadBiodataPdf(biodataUrl, displayName) {
  const source = String(biodataUrl || '').trim();
  if (!source) return false;

  const filename = biodataFileName(displayName);

  try {
    if (source.startsWith('data:')) {
      const blob = dataUrlToBlob(source);
      if (!blob) return false;
      triggerBlobDownload(blob, filename);
      return true;
    }

    if (source.startsWith('http://') || source.startsWith('https://')) {
      const res = await fetch(source);
      if (!res.ok) return false;
      const blob = await res.blob();
      triggerBlobDownload(blob, filename);
      return true;
    }

    return false;
  } catch (err) {
    console.warn('Biodata download:', err);
    return false;
  }
}
