import { DEFAULT_STATE, SCHEMA_VERSION } from "./defaults.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function encodeWheelConfig(config, { spinOnly = false } = {}) {
  const stripped = stripDefaults(config, DEFAULT_STATE);
  if (spinOnly) {
    stripped.settings = {
      ...(stripped.settings || {}),
      spinOnly: true
    };
  }

  stripped.schemaVersion = SCHEMA_VERSION;
  const json = JSON.stringify(stripped);
  const compressed = LZString.compressToEncodedURIComponent(json);
  const payload = `${SCHEMA_VERSION}|${compressed}`;
  const checksum = crc32(payload).toString(16).padStart(8, "0");
  const bytes = textEncoder.encode(`${payload}|${checksum}`);
  return toBase64Url(bytes);
}

export function decodeWheelConfig(encoded) {
  const decoded = textDecoder.decode(fromBase64Url(encoded));
  const [versionText, compressed, checksum] = decoded.split("|");
  if (!versionText || !compressed || !checksum) {
    throw new Error("Malformed payload");
  }

  const payload = `${versionText}|${compressed}`;
  const expectedChecksum = crc32(payload).toString(16).padStart(8, "0");
  if (expectedChecksum !== checksum) {
    throw new Error("Checksum mismatch");
  }

  const version = Number.parseInt(versionText, 10);
  if (!Number.isFinite(version) || version > SCHEMA_VERSION) {
    throw new Error("Unsupported schema version");
  }

  const json = LZString.decompressFromEncodedURIComponent(compressed);
  if (!json) {
    throw new Error("Unable to decompress payload");
  }

  const parsed = JSON.parse(json);
  parsed.schemaVersion = SCHEMA_VERSION;
  return parsed;
}

export function buildShareUrl(encodedValue) {
  const url = new URL(window.location.href);
  url.searchParams.set("w", encodedValue);
  return url.toString();
}

export function readSharePayload() {
  const url = new URL(window.location.href);
  return url.searchParams.get("w");
}

export function estimateShareSize(url) {
  return new Blob([url]).size;
}

function stripDefaults(value, defaults) {
  if (Array.isArray(value)) {
    return value.map((item) => stripDefaults(item, defaults?.[0]));
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  const output = {};
  Object.keys(value).forEach((key) => {
    const next = value[key];
    const defaultValue = defaults?.[key];
    if (Array.isArray(next)) {
      output[key] = next.map((item) => stripDefaults(item, defaultValue?.[0]));
      return;
    }
    if (typeof next === "object" && next !== null) {
      const child = stripDefaults(next, defaultValue || {});
      if (Object.keys(child).length > 0) {
        output[key] = child;
      }
      return;
    }
    if (next !== defaultValue) {
      output[key] = next;
    }
  });
  return output;
}

function toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  const binary = atob(padded);
  const output = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    output[i] = binary.charCodeAt(i);
  }
  return output;
}

function crc32(input) {
  let crc = 0 ^ -1;
  for (let i = 0; i < input.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ input.charCodeAt(i)) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const LZString = (function lzStringFactory() {
  function getBaseValue(alphabet, character) {
    if (!getBaseValue.dictionary) {
      getBaseValue.dictionary = {};
    }
    if (!getBaseValue.dictionary[alphabet]) {
      getBaseValue.dictionary[alphabet] = {};
      for (let i = 0; i < alphabet.length; i += 1) {
        getBaseValue.dictionary[alphabet][alphabet.charAt(i)] = i;
      }
    }
    return getBaseValue.dictionary[alphabet][character];
  }

  const keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";

  function compressToEncodedURIComponent(input) {
    if (input == null) return "";
    return _compress(input, 6, (a) => keyStrUriSafe.charAt(a));
  }

  function decompressFromEncodedURIComponent(input) {
    if (input == null) return "";
    if (input === "") return null;
    input = input.replace(/ /g, "+");
    return _decompress(input.length, 32, (index) => getBaseValue(keyStrUriSafe, input.charAt(index)));
  }

  function _compress(uncompressed, bitsPerChar, getCharFromInt) {
    if (uncompressed == null) return "";
    let i;
    let value;
    const context_dictionary = {};
    const context_dictionaryToCreate = {};
    let context_c = "";
    let context_wc = "";
    let context_w = "";
    let context_enlargeIn = 2;
    let context_dictSize = 3;
    let context_numBits = 2;
    let context_data = [];
    let context_data_val = 0;
    let context_data_position = 0;

    for (let ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }

      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
        context_w = context_wc;
      } else {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
          if (context_w.charCodeAt(0) < 256) {
            for (i = 0; i < context_numBits; i += 1) {
              context_data_val = (context_data_val << 1);
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position += 1;
              }
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 8; i += 1) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position += 1;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i = 0; i < context_numBits; i += 1) {
              context_data_val = (context_data_val << 1) | value;
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position += 1;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 16; i += 1) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position += 1;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn -= 1;
          if (context_enlargeIn === 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits += 1;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i = 0; i < context_numBits; i += 1) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position += 1;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn -= 1;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits += 1;
        }
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }

    if (context_w !== "") {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
        if (context_w.charCodeAt(0) < 256) {
          for (i = 0; i < context_numBits; i += 1) {
            context_data_val = (context_data_val << 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position += 1;
            }
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 8; i += 1) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position += 1;
            }
            value = value >> 1;
          }
        } else {
          value = 1;
          for (i = 0; i < context_numBits; i += 1) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position += 1;
            }
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 16; i += 1) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position += 1;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn -= 1;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits += 1;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i = 0; i < context_numBits; i += 1) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position === bitsPerChar - 1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position += 1;
          }
          value = value >> 1;
        }
      }
      context_enlargeIn -= 1;
      if (context_enlargeIn === 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits += 1;
      }
    }

    value = 2;
    for (i = 0; i < context_numBits; i += 1) {
      context_data_val = (context_data_val << 1) | (value & 1);
      if (context_data_position === bitsPerChar - 1) {
        context_data_position = 0;
        context_data.push(getCharFromInt(context_data_val));
        context_data_val = 0;
      } else {
        context_data_position += 1;
      }
      value = value >> 1;
    }

    while (true) {
      context_data_val = (context_data_val << 1);
      if (context_data_position === bitsPerChar - 1) {
        context_data.push(getCharFromInt(context_data_val));
        break;
      } else {
        context_data_position += 1;
      }
    }
    return context_data.join("");
  }

  function _decompress(length, resetValue, getNextValue) {
    const dictionary = [];
    let next;
    let enlargeIn = 4;
    let dictSize = 4;
    let numBits = 3;
    let entry = "";
    const result = [];
    let i;
    let w;
    let bits;
    let resb;
    let maxpower;
    let power;
    let c;
    const data = { val: getNextValue(0), position: resetValue, index: 1 };

    for (i = 0; i < 3; i += 1) {
      dictionary[i] = i;
    }

    bits = 0;
    maxpower = Math.pow(2, 2);
    power = 1;
    while (power !== maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index++);
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    switch (next = bits) {
      case 0:
        bits = 0;
        maxpower = Math.pow(2, 8);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 1:
        bits = 0;
        maxpower = Math.pow(2, 16);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 2:
        return "";
      default:
        break;
    }

    dictionary[3] = c;
    w = c;
    result.push(c);
    while (true) {
      if (data.index > length) {
        return "";
      }

      bits = 0;
      maxpower = Math.pow(2, numBits);
      power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch (c = bits) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2, 8);
          power = 1;
          while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = String.fromCharCode(bits);
          c = dictSize - 1;
          enlargeIn -= 1;
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2, 16);
          power = 1;
          while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = String.fromCharCode(bits);
          c = dictSize - 1;
          enlargeIn -= 1;
          break;
        case 2:
          return result.join("");
        default:
          break;
      }

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits += 1;
      }

      if (dictionary[c]) {
        entry = dictionary[c];
      } else if (c === dictSize) {
        entry = w + w.charAt(0);
      } else {
        return null;
      }
      result.push(entry);

      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn -= 1;
      w = entry;

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits += 1;
      }
    }
  }

  return {
    compressToEncodedURIComponent,
    decompressFromEncodedURIComponent
  };
}());
