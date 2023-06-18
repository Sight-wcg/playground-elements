import { strToU8, zlibSync, strFromU8, unzlibSync } from 'fflate';
const code = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Demo</title>
  <link href="//unpkg.com/layui@2.8.7/dist/css/layui.css" rel="stylesheet">
</head>
<body>
  <button class="layui-btn">按钮</button>

  <script src="//unpkg.com/layui@2.8.7/dist/layui.js"></script>
  <script>
    console.log(layui.v)
  </script>
</body>
</html>
`.trim();

window.addEventListener('DOMContentLoaded', () => {
  const $ = document.body.querySelector.bind(document.body);
  const ide = $('playground-ide');

  const share = async () => {
    const files = Object.entries(ide.config?.files ?? {}).map(([name, file]) => ({
      name,
      content: file.content,
    }));
    window.location.hash = serialize(files);
    await navigator.clipboard.writeText(window.location.toString());
  };

  const syncStateFromUrlHash = async () => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));

    let urlFiles;
    const base64 = params.get('project');

    if (base64) {
      try {
        const json = atou(base64);
        try {
          urlFiles = JSON.parse(json);
        } catch {
          console.error('Invalid JSON in URL', JSON.stringify(json));
        }
      } catch {
        console.error('Invalid project base64 in URL');
      }
    }

    if (urlFiles) {
      ide.config = {
        files: Object.fromEntries(urlFiles.map(({ name, content }) => [name, { content }])),
      };
    }
  };

  syncStateFromUrlHash();
  window.addEventListener('hashchange', syncStateFromUrlHash);

  // Trigger URL sharing when Control-s or Command-s is pressed.
  let controlDown = false;
  let commandDown = false;
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Control') {
      controlDown = true;
    } else if (event.key === 'Meta') {
      commandDown = true;
    } else if (event.key === 's' && (controlDown || commandDown)) {
      share();
      event.preventDefault(); // Don't trigger "Save page as"
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.key === 'Control') {
      controlDown = false;
    } else if (event.key === 'Meta') {
      commandDown = false;
    }
  });
  window.addEventListener('blur', () => {
    controlDown = false;
    commandDown = false;
  });
});

export function setup(ide) {
  ide.config = {
    files: {
      'index.html': {
        content: code,
        selected: true,
      }
    },
  };
}

function debounce(fn, n = 100) {
  let handle;
  return (...args) => {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => {
      fn(...args);
    }, n);
  };
}

function serialize(code) {
  return '#project=' + utoa(JSON.stringify(code));
}

const encodeSafeBase64 = (str) => {
  const percentEscaped = encodeURIComponent(str);
  const utf8 = percentEscaped.replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const base64 = btoa(utf8);
  const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_');
  const padIdx = base64url.indexOf('=');
  return padIdx >= 0 ? base64url.slice(0, padIdx) : base64url;
};

const decodeSafeBase64 = (base64url) => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const utf8 = atob(base64);
  const percentEscaped = utf8
    .split('')
    .map((char) => '%' + char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

  const str = decodeURIComponent(percentEscaped);
  return str;
};

function utoa(data) {
  const buffer = strToU8(data);
  const zipped = zlibSync(buffer, { level: 9 });
  const binary = strFromU8(zipped, true);
  return encodeSafeBase64(binary);
}

function atou(base64) {
  const binary = decodeSafeBase64(base64);
  // zlib header (x78), level 9 (xDA)
  if (binary.startsWith('\x78\xDA')) {
    const buffer = strToU8(binary, true);
    const unzipped = unzlibSync(buffer);
    return strFromU8(unzipped);
  }
}
