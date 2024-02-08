class ComponentError extends Error {
  constructor (value) {
    const enumerable = typeof value !== 'string';
    super(enumerable ? `${String(value)} (see error.payload)` : value);
    Object.defineProperty(this, 'payload', { value, enumerable });
  }
}

let dv = new DataView(new ArrayBuffer());
const dataView = mem => dv.buffer === mem.buffer ? dv : dv = new DataView(mem.buffer);

function getErrorPayload(e) {
  if (e && hasOwnProperty.call(e, 'payload')) return e.payload;
  return e;
}

const hasOwnProperty = Object.prototype.hasOwnProperty;

function toUint32(val) {
  return val >>> 0;
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
  const module0 = getCoreModule('arcjet_analyze_bindings_rate_limit.component.core.wasm');
  const module1 = getCoreModule('arcjet_analyze_bindings_rate_limit.component.core2.wasm');
  const module2 = getCoreModule('arcjet_analyze_bindings_rate_limit.component.core3.wasm');
  
  const { get, set } = imports['arcjet:rate-limit/storage'];
  const { now } = imports['arcjet:rate-limit/time'];
  let exports0;
  
  function trampoline0() {
    const ret = now();
    return toUint32(ret);
  }
  let exports1;
  
  function trampoline1(arg0, arg1, arg2) {
    var ptr0 = arg0;
    var len0 = arg1;
    var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
    const ret = get(result0);
    var variant2 = ret;
    if (variant2 === null || variant2=== undefined) {
      dataView(memory0).setInt8(arg2 + 0, 0, true);
    } else {
      const e = variant2;
      dataView(memory0).setInt8(arg2 + 0, 1, true);
      var ptr1 = utf8Encode(e, realloc0, memory0);
      var len1 = utf8EncodedLen;
      dataView(memory0).setInt32(arg2 + 8, len1, true);
      dataView(memory0).setInt32(arg2 + 4, ptr1, true);
    }
  }
  let memory0;
  let realloc0;
  
  function trampoline2(arg0, arg1, arg2, arg3, arg4, arg5) {
    var ptr0 = arg0;
    var len0 = arg1;
    var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
    var ptr1 = arg2;
    var len1 = arg3;
    var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
    let ret;
    try {
      ret = { tag: 'ok', val: set(result0, result1, arg4 >>> 0) };
    } catch (e) {
      ret = { tag: 'err', val: getErrorPayload(e) };
    }
    var variant3 = ret;
    switch (variant3.tag) {
      case 'ok': {
        variant3.val;
        dataView(memory0).setInt8(arg5 + 0, 0, true);
        break;
      }
      case 'err': {
        const e = variant3.val;
        dataView(memory0).setInt8(arg5 + 0, 1, true);
        var ptr2 = utf8Encode(e, realloc0, memory0);
        var len2 = utf8EncodedLen;
        dataView(memory0).setInt32(arg5 + 8, len2, true);
        dataView(memory0).setInt32(arg5 + 4, ptr2, true);
        break;
      }
      default: {
        throw new TypeError('invalid variant specified for result');
      }
    }
  }
  let postReturn0;
  Promise.all([module0, module1, module2]).catch(() => {});
  ({ exports: exports0 } = await instantiateCore(await module1));
  ({ exports: exports1 } = await instantiateCore(await module0, {
    'arcjet:rate-limit/storage': {
      get: exports0['0'],
      set: exports0['1'],
    },
    'arcjet:rate-limit/time': {
      now: trampoline0,
    },
  }));
  memory0 = exports1.memory;
  realloc0 = exports1.cabi_realloc;
  (await instantiateCore(await module2, {
    '': {
      $imports: exports0.$imports,
      '0': trampoline1,
      '1': trampoline2,
    },
  }));
  postReturn0 = exports1['cabi_post_fixed-window'];
  
  function tokenBucket(arg0, arg1) {
    var ptr0 = utf8Encode(arg0, realloc0, memory0);
    var len0 = utf8EncodedLen;
    var ptr1 = utf8Encode(arg1, realloc0, memory0);
    var len1 = utf8EncodedLen;
    const ret = exports1['token-bucket'](ptr0, len0, ptr1, len1);
    let variant4;
    switch (dataView(memory0).getUint8(ret + 0, true)) {
      case 0: {
        var ptr2 = dataView(memory0).getInt32(ret + 4, true);
        var len2 = dataView(memory0).getInt32(ret + 8, true);
        var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        variant4= {
          tag: 'ok',
          val: result2
        };
        break;
      }
      case 1: {
        var ptr3 = dataView(memory0).getInt32(ret + 4, true);
        var len3 = dataView(memory0).getInt32(ret + 8, true);
        var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        variant4= {
          tag: 'err',
          val: result3
        };
        break;
      }
      default: {
        throw new TypeError('invalid variant discriminant for expected');
      }
    }
    postReturn0(ret);
    if (variant4.tag === 'err') {
      throw new ComponentError(variant4.val);
    }
    return variant4.val;
  }
  
  function fixedWindow(arg0, arg1) {
    var ptr0 = utf8Encode(arg0, realloc0, memory0);
    var len0 = utf8EncodedLen;
    var ptr1 = utf8Encode(arg1, realloc0, memory0);
    var len1 = utf8EncodedLen;
    const ret = exports1['fixed-window'](ptr0, len0, ptr1, len1);
    let variant4;
    switch (dataView(memory0).getUint8(ret + 0, true)) {
      case 0: {
        var ptr2 = dataView(memory0).getInt32(ret + 4, true);
        var len2 = dataView(memory0).getInt32(ret + 8, true);
        var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        variant4= {
          tag: 'ok',
          val: result2
        };
        break;
      }
      case 1: {
        var ptr3 = dataView(memory0).getInt32(ret + 4, true);
        var len3 = dataView(memory0).getInt32(ret + 8, true);
        var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        variant4= {
          tag: 'err',
          val: result3
        };
        break;
      }
      default: {
        throw new TypeError('invalid variant discriminant for expected');
      }
    }
    postReturn0(ret);
    if (variant4.tag === 'err') {
      throw new ComponentError(variant4.val);
    }
    return variant4.val;
  }
  
  function slidingWindow(arg0, arg1) {
    var ptr0 = utf8Encode(arg0, realloc0, memory0);
    var len0 = utf8EncodedLen;
    var ptr1 = utf8Encode(arg1, realloc0, memory0);
    var len1 = utf8EncodedLen;
    const ret = exports1['sliding-window'](ptr0, len0, ptr1, len1);
    let variant4;
    switch (dataView(memory0).getUint8(ret + 0, true)) {
      case 0: {
        var ptr2 = dataView(memory0).getInt32(ret + 4, true);
        var len2 = dataView(memory0).getInt32(ret + 8, true);
        var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
        variant4= {
          tag: 'ok',
          val: result2
        };
        break;
      }
      case 1: {
        var ptr3 = dataView(memory0).getInt32(ret + 4, true);
        var len3 = dataView(memory0).getInt32(ret + 8, true);
        var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        variant4= {
          tag: 'err',
          val: result3
        };
        break;
      }
      default: {
        throw new TypeError('invalid variant discriminant for expected');
      }
    }
    postReturn0(ret);
    if (variant4.tag === 'err') {
      throw new ComponentError(variant4.val);
    }
    return variant4.val;
  }
  
  return { fixedWindow, slidingWindow, tokenBucket,  };
}

export { instantiate };
