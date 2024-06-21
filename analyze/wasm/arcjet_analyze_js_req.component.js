function clampGuest(i, min, max) {
  if (i < min || i > max) throw new TypeError(`must be between ${min} and ${max}`);
  return i;
}

class ComponentError extends Error {
  constructor (value) {
    const enumerable = typeof value !== 'string';
    super(enumerable ? `${String(value)} (see error.payload)` : value);
    Object.defineProperty(this, 'payload', { value, enumerable });
  }
}

let dv = new DataView(new ArrayBuffer());
const dataView = mem => dv.buffer === mem.buffer ? dv : dv = new DataView(mem.buffer);

function throwInvalidBool() {
  throw new TypeError('invalid variant discriminant for bool');
}

const utf8Decoder = new TextDecoder();

const utf8Encoder = new TextEncoder();

let utf8EncodedLen = 0;
function utf8Encode(s, realloc, memory) {
  if (typeof s !== 'string') throw new TypeError('expected a string');
  if (s.length === 0) {
    utf8EncodedLen = 0;
    return 1;
  }
  let allocLen = 0;
  let ptr = 0;
  let writtenTotal = 0;
  while (s.length > 0) {
    ptr = realloc(ptr, allocLen, 1, allocLen += s.length * 2);
    const { read, written } = utf8Encoder.encodeInto(
    s,
    new Uint8Array(memory.buffer, ptr + writtenTotal, allocLen - writtenTotal),
    );
    writtenTotal += written;
    s = s.slice(read);
  }
  utf8EncodedLen = writtenTotal;
  return ptr;
}


async function instantiate(getCoreModule, imports, instantiateCore = WebAssembly.instantiate) {
  const module0 = getCoreModule('arcjet_analyze_js_req.component.core.wasm');
  const module1 = getCoreModule('arcjet_analyze_js_req.component.core2.wasm');
  const module2 = getCoreModule('arcjet_analyze_js_req.component.core3.wasm');
  
  const { debug, error } = imports['arcjet:js-req/logger'];
  let exports0;
  let exports1;
  let memory0;
  
  function trampoline0(arg0, arg1) {
    var ptr0 = arg0;
    var len0 = arg1;
    var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
    debug(result0);
  }
  
  function trampoline1(arg0, arg1) {
    var ptr0 = arg0;
    var len0 = arg1;
    var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
    error(result0);
  }
  let realloc0;
  let postReturn0;
  let postReturn1;
  Promise.all([module0, module1, module2]).catch(() => {});
  ({ exports: exports0 } = await instantiateCore(await module1));
  ({ exports: exports1 } = await instantiateCore(await module0, {
    'arcjet:js-req/logger': {
      debug: exports0['0'],
      error: exports0['1'],
    },
  }));
  memory0 = exports1.memory;
  (await instantiateCore(await module2, {
    '': {
      $imports: exports0.$imports,
      '0': trampoline0,
      '1': trampoline1,
    },
  }));
  realloc0 = exports1.cabi_realloc;
  postReturn0 = exports1['cabi_post_detect-bot'];
  postReturn1 = exports1['cabi_post_generate-fingerprint'];
  
  function detectBot(arg0, arg1, arg2) {
    var ptr0 = utf8Encode(arg0, realloc0, memory0);
    var len0 = utf8EncodedLen;
    var ptr1 = utf8Encode(arg1, realloc0, memory0);
    var len1 = utf8EncodedLen;
    var ptr2 = utf8Encode(arg2, realloc0, memory0);
    var len2 = utf8EncodedLen;
    const ret = exports1['detect-bot'](ptr0, len0, ptr1, len1, ptr2, len2);
    let variant5;
    switch (dataView(memory0).getUint8(ret + 0, true)) {
      case 0: {
        let enum3;
        switch (dataView(memory0).getUint8(ret + 4, true)) {
          case 0: {
            enum3 = 'unspecified';
            break;
          }
          case 1: {
            enum3 = 'not-analyzed';
            break;
          }
          case 2: {
            enum3 = 'automated';
            break;
          }
          case 3: {
            enum3 = 'likely-automated';
            break;
          }
          case 4: {
            enum3 = 'likely-not-a-bot';
            break;
          }
          case 5: {
            enum3 = 'verified-bot';
            break;
          }
          default: {
            throw new TypeError('invalid discriminant specified for BotType');
          }
        }
        variant5= {
          tag: 'ok',
          val: {
            botType: enum3,
            botScore: clampGuest(dataView(memory0).getUint8(ret + 5, true), 0, 255),
          }
        };
        break;
      }
      case 1: {
        var ptr4 = dataView(memory0).getInt32(ret + 4, true);
        var len4 = dataView(memory0).getInt32(ret + 8, true);
        var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
        variant5= {
          tag: 'err',
          val: result4
        };
        break;
      }
      default: {
        throw new TypeError('invalid variant discriminant for expected');
      }
    }
    postReturn0(ret);
    if (variant5.tag === 'err') {
      throw new ComponentError(variant5.val);
    }
    return variant5.val;
  }
  
  function generateFingerprint(arg0, arg1) {
    var ptr0 = utf8Encode(arg0, realloc0, memory0);
    var len0 = utf8EncodedLen;
    var vec2 = arg1;
    var len2 = vec2.length;
    var result2 = realloc0(0, 0, 4, len2 * 8);
    for (let i = 0; i < vec2.length; i++) {
      const e = vec2[i];
      const base = result2 + i * 8;var ptr1 = utf8Encode(e, realloc0, memory0);
      var len1 = utf8EncodedLen;
      dataView(memory0).setInt32(base + 4, len1, true);
      dataView(memory0).setInt32(base + 0, ptr1, true);
    }
    const ret = exports1['generate-fingerprint'](ptr0, len0, result2, len2);
    var ptr3 = dataView(memory0).getInt32(ret + 0, true);
    var len3 = dataView(memory0).getInt32(ret + 4, true);
    var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
    postReturn1(ret);
    return result3;
  }
  
  function isValidEmail(arg0, arg1) {
    var ptr0 = utf8Encode(arg0, realloc0, memory0);
    var len0 = utf8EncodedLen;
    var variant4 = arg1;
    let variant4_0;
    let variant4_1;
    let variant4_2;
    let variant4_3;
    let variant4_4;
    if (variant4 === null || variant4=== undefined) {
      variant4_0 = 0;
      variant4_1 = 0;
      variant4_2 = 0;
      variant4_3 = 0;
      variant4_4 = 0;
    } else {
      const e = variant4;
      var {requireTopLevelDomain: v1_0, allowDomainLiteral: v1_1 } = e;
      var variant2 = v1_0;
      let variant2_0;
      let variant2_1;
      if (variant2 === null || variant2=== undefined) {
        variant2_0 = 0;
        variant2_1 = 0;
      } else {
        const e = variant2;
        variant2_0 = 1;
        variant2_1 = e ? 1 : 0;
      }
      var variant3 = v1_1;
      let variant3_0;
      let variant3_1;
      if (variant3 === null || variant3=== undefined) {
        variant3_0 = 0;
        variant3_1 = 0;
      } else {
        const e = variant3;
        variant3_0 = 1;
        variant3_1 = e ? 1 : 0;
      }
      variant4_0 = 1;
      variant4_1 = variant2_0;
      variant4_2 = variant2_1;
      variant4_3 = variant3_0;
      variant4_4 = variant3_1;
    }
    const ret = exports1['is-valid-email'](ptr0, len0, variant4_0, variant4_1, variant4_2, variant4_3, variant4_4);
    let variant7;
    switch (dataView(memory0).getUint8(ret + 0, true)) {
      case 0: {
        var bool5 = dataView(memory0).getUint8(ret + 4, true);
        variant7= {
          tag: 'ok',
          val: bool5 == 0 ? false : (bool5 == 1 ? true : throwInvalidBool())
        };
        break;
      }
      case 1: {
        var ptr6 = dataView(memory0).getInt32(ret + 4, true);
        var len6 = dataView(memory0).getInt32(ret + 8, true);
        var result6 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr6, len6));
        variant7= {
          tag: 'err',
          val: result6
        };
        break;
      }
      default: {
        throw new TypeError('invalid variant discriminant for expected');
      }
    }
    postReturn0(ret);
    if (variant7.tag === 'err') {
      throw new ComponentError(variant7.val);
    }
    return variant7.val;
  }
  
  return { detectBot, generateFingerprint, isValidEmail,  };
}

export { instantiate };
