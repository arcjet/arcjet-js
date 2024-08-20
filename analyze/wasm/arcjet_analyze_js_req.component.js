function instantiate(getCoreModule, imports, instantiateCore = WebAssembly.instantiate) {
  
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
  
  const utf8Decoder = new TextDecoder();
  
  const utf8Encoder = new TextEncoder();
  
  let utf8EncodedLen = 0;
  function utf8Encode(s, realloc, memory) {
    if (typeof s !== 'string') throw new TypeError('expected a string');
    if (s.length === 0) {
      utf8EncodedLen = 0;
      return 1;
    }
    let buf = utf8Encoder.encode(s);
    let ptr = realloc(0, 0, 1, buf.length);
    new Uint8Array(memory.buffer).set(buf, ptr);
    utf8EncodedLen = buf.length;
    return ptr;
  }
  
  
  const module0 = getCoreModule('arcjet_analyze_js_req.component.core.wasm');
  const module1 = getCoreModule('arcjet_analyze_js_req.component.core2.wasm');
  const module2 = getCoreModule('arcjet_analyze_js_req.component.core3.wasm');
  
  const { hasGravatar, hasMxRecords, isDisposableEmail, isFreeEmail } = imports['arcjet:js-req/email-validator-overrides'];
  const { debug, error } = imports['arcjet:js-req/logger'];
  let gen = (function* init () {
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
    
    function trampoline2(arg0, arg1) {
      var ptr0 = arg0;
      var len0 = arg1;
      var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
      const ret = isFreeEmail(result0);
      var val1 = ret;
      let enum1;
      switch (val1) {
        case 'yes': {
          enum1 = 0;
          break;
        }
        case 'no': {
          enum1 = 1;
          break;
        }
        case 'unknown': {
          enum1 = 2;
          break;
        }
        default: {
          if ((ret) instanceof Error) {
            console.error(ret);
          }
          
          throw new TypeError(`"${val1}" is not one of the cases of validator-response`);
        }
      }
      return enum1;
    }
    
    function trampoline3(arg0, arg1) {
      var ptr0 = arg0;
      var len0 = arg1;
      var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
      const ret = isDisposableEmail(result0);
      var val1 = ret;
      let enum1;
      switch (val1) {
        case 'yes': {
          enum1 = 0;
          break;
        }
        case 'no': {
          enum1 = 1;
          break;
        }
        case 'unknown': {
          enum1 = 2;
          break;
        }
        default: {
          if ((ret) instanceof Error) {
            console.error(ret);
          }
          
          throw new TypeError(`"${val1}" is not one of the cases of validator-response`);
        }
      }
      return enum1;
    }
    
    function trampoline4(arg0, arg1) {
      var ptr0 = arg0;
      var len0 = arg1;
      var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
      const ret = hasMxRecords(result0);
      var val1 = ret;
      let enum1;
      switch (val1) {
        case 'yes': {
          enum1 = 0;
          break;
        }
        case 'no': {
          enum1 = 1;
          break;
        }
        case 'unknown': {
          enum1 = 2;
          break;
        }
        default: {
          if ((ret) instanceof Error) {
            console.error(ret);
          }
          
          throw new TypeError(`"${val1}" is not one of the cases of validator-response`);
        }
      }
      return enum1;
    }
    
    function trampoline5(arg0, arg1) {
      var ptr0 = arg0;
      var len0 = arg1;
      var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
      const ret = hasGravatar(result0);
      var val1 = ret;
      let enum1;
      switch (val1) {
        case 'yes': {
          enum1 = 0;
          break;
        }
        case 'no': {
          enum1 = 1;
          break;
        }
        case 'unknown': {
          enum1 = 2;
          break;
        }
        default: {
          if ((ret) instanceof Error) {
            console.error(ret);
          }
          
          throw new TypeError(`"${val1}" is not one of the cases of validator-response`);
        }
      }
      return enum1;
    }
    let realloc0;
    let postReturn0;
    let postReturn1;
    let postReturn2;
    Promise.all([module0, module1, module2]).catch(() => {});
    ({ exports: exports0 } = yield instantiateCore(yield module1));
    ({ exports: exports1 } = yield instantiateCore(yield module0, {
      'arcjet:js-req/email-validator-overrides': {
        'has-gravatar': exports0['5'],
        'has-mx-records': exports0['4'],
        'is-disposable-email': exports0['3'],
        'is-free-email': exports0['2'],
      },
      'arcjet:js-req/logger': {
        debug: exports0['0'],
        error: exports0['1'],
      },
    }));
    memory0 = exports1.memory;
    (yield instantiateCore(yield module2, {
      '': {
        $imports: exports0.$imports,
        '0': trampoline0,
        '1': trampoline1,
        '2': trampoline2,
        '3': trampoline3,
        '4': trampoline4,
        '5': trampoline5,
      },
    }));
    realloc0 = exports1.cabi_realloc;
    postReturn0 = exports1['cabi_post_detect-bot'];
    postReturn1 = exports1['cabi_post_generate-fingerprint'];
    postReturn2 = exports1['cabi_post_is-valid-email'];
    
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
      const retVal = variant5;
      postReturn0(ret);
      if (typeof retVal === 'object' && retVal.tag === 'err') {
        throw new ComponentError(retVal.val);
      }
      return retVal.val;
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
      const retVal = result3;
      postReturn1(ret);
      return retVal;
    }
    
    function isValidEmail(arg0, arg1) {
      var ptr0 = utf8Encode(arg0, realloc0, memory0);
      var len0 = utf8EncodedLen;
      var {requireTopLevelDomain: v1_0, allowDomainLiteral: v1_1, blockedEmails: v1_2 } = arg1;
      var vec3 = v1_2;
      var len3 = vec3.length;
      var result3 = realloc0(0, 0, 4, len3 * 8);
      for (let i = 0; i < vec3.length; i++) {
        const e = vec3[i];
        const base = result3 + i * 8;var ptr2 = utf8Encode(e, realloc0, memory0);
        var len2 = utf8EncodedLen;
        dataView(memory0).setInt32(base + 4, len2, true);
        dataView(memory0).setInt32(base + 0, ptr2, true);
      }
      const ret = exports1['is-valid-email'](ptr0, len0, v1_0 ? 1 : 0, v1_1 ? 1 : 0, result3, len3);
      let variant8;
      switch (dataView(memory0).getUint8(ret + 0, true)) {
        case 0: {
          let enum4;
          switch (dataView(memory0).getUint8(ret + 4, true)) {
            case 0: {
              enum4 = 'valid';
              break;
            }
            case 1: {
              enum4 = 'invalid';
              break;
            }
            default: {
              throw new TypeError('invalid discriminant specified for EmailValidity');
            }
          }
          var len6 = dataView(memory0).getInt32(ret + 12, true);
          var base6 = dataView(memory0).getInt32(ret + 8, true);
          var result6 = [];
          for (let i = 0; i < len6; i++) {
            const base = base6 + i * 8;
            var ptr5 = dataView(memory0).getInt32(base + 0, true);
            var len5 = dataView(memory0).getInt32(base + 4, true);
            var result5 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr5, len5));
            result6.push(result5);
          }
          variant8= {
            tag: 'ok',
            val: {
              validity: enum4,
              blocked: result6,
            }
          };
          break;
        }
        case 1: {
          var ptr7 = dataView(memory0).getInt32(ret + 4, true);
          var len7 = dataView(memory0).getInt32(ret + 8, true);
          var result7 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr7, len7));
          variant8= {
            tag: 'err',
            val: result7
          };
          break;
        }
        default: {
          throw new TypeError('invalid variant discriminant for expected');
        }
      }
      const retVal = variant8;
      postReturn2(ret);
      if (typeof retVal === 'object' && retVal.tag === 'err') {
        throw new ComponentError(retVal.val);
      }
      return retVal.val;
    }
    
    return { detectBot, generateFingerprint, isValidEmail,  };
  })();
  let promise, resolve, reject;
  function runNext (value) {
    try {
      let done;
      do {
        ({ value, done } = gen.next(value));
      } while (!(value instanceof Promise) && !done);
      if (done) {
        if (resolve) resolve(value);
        else return value;
      }
      if (!promise) promise = new Promise((_resolve, _reject) => (resolve = _resolve, reject = _reject));
      value.then(nextVal => done ? resolve() : runNext(nextVal), reject);
    }
    catch (e) {
      if (reject) reject(e);
      else throw e;
    }
  }
  const maybeSyncReturn = runNext(null);
  return promise || maybeSyncReturn;
}

export { instantiate };
