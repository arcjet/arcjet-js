function instantiate(getCoreModule, imports, instantiateCore = WebAssembly.instantiate) {
  
  let dv = new DataView(new ArrayBuffer());
  const dataView = mem => dv.buffer === mem.buffer ? dv : dv = new DataView(mem.buffer);
  
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
    let buf = utf8Encoder.encode(s);
    let ptr = realloc(0, 0, 1, buf.length);
    new Uint8Array(memory.buffer).set(buf, ptr);
    utf8EncodedLen = buf.length;
    return ptr;
  }
  
  
  const module0 = getCoreModule('arcjet_analyze_bindings_redact.component.core.wasm');
  const module1 = getCoreModule('arcjet_analyze_bindings_redact.component.core2.wasm');
  const module2 = getCoreModule('arcjet_analyze_bindings_redact.component.core3.wasm');
  
  const { debug } = imports['arcjet:sensitive-info/logger'];
  const { detect } = imports['arcjet:sensitive-info/sensitive-information-identifier'];
  let gen = (function* init () {
    let exports0;
    let exports1;
    let memory0;
    let realloc0;
    
    function trampoline0(arg0, arg1) {
      var ptr0 = arg0;
      var len0 = arg1;
      var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
      debug(result0);
    }
    
    function trampoline1(arg0, arg1, arg2) {
      var len1 = arg1;
      var base1 = arg0;
      var result1 = [];
      for (let i = 0; i < len1; i++) {
        const base = base1 + i * 8;
        var ptr0 = dataView(memory0).getInt32(base + 0, true);
        var len0 = dataView(memory0).getInt32(base + 4, true);
        var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
        result1.push(result0);
      }
      const ret = detect(result1);
      var vec5 = ret;
      var len5 = vec5.length;
      var result5 = realloc0(0, 0, 4, len5 * 16);
      for (let i = 0; i < vec5.length; i++) {
        const e = vec5[i];
        const base = result5 + i * 16;var variant4 = e;
        if (variant4 === null || variant4=== undefined) {
          dataView(memory0).setInt8(base + 0, 0, true);
        } else {
          const e = variant4;
          dataView(memory0).setInt8(base + 0, 1, true);
          var variant3 = e;
          switch (variant3.tag) {
            case 'email': {
              dataView(memory0).setInt8(base + 4, 0, true);
              break;
            }
            case 'phone-number': {
              dataView(memory0).setInt8(base + 4, 1, true);
              break;
            }
            case 'ip-address': {
              dataView(memory0).setInt8(base + 4, 2, true);
              break;
            }
            case 'credit-card-number': {
              dataView(memory0).setInt8(base + 4, 3, true);
              break;
            }
            case 'custom': {
              const e = variant3.val;
              dataView(memory0).setInt8(base + 4, 4, true);
              var ptr2 = utf8Encode(e, realloc0, memory0);
              var len2 = utf8EncodedLen;
              dataView(memory0).setInt32(base + 12, len2, true);
              dataView(memory0).setInt32(base + 8, ptr2, true);
              break;
            }
            default: {
              throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant3.tag)}\` (received \`${variant3}\`) specified for \`SensitiveInfoEntity\``);
            }
          }
        }
      }
      dataView(memory0).setInt32(arg2 + 4, len5, true);
      dataView(memory0).setInt32(arg2 + 0, result5, true);
    }
    let postReturn0;
    Promise.all([module0, module1, module2]).catch(() => {});
    ({ exports: exports0 } = yield instantiateCore(yield module1));
    ({ exports: exports1 } = yield instantiateCore(yield module0, {
      'arcjet:sensitive-info/logger': {
        debug: exports0['0'],
      },
      'arcjet:sensitive-info/sensitive-information-identifier': {
        detect: exports0['1'],
      },
    }));
    memory0 = exports1.memory;
    realloc0 = exports1.cabi_realloc;
    (yield instantiateCore(yield module2, {
      '': {
        $imports: exports0.$imports,
        '0': trampoline0,
        '1': trampoline1,
      },
    }));
    postReturn0 = exports1['cabi_post_detect-sensitive-info'];
    
    function detectSensitiveInfo(arg0, arg1) {
      var ptr0 = utf8Encode(arg0, realloc0, memory0);
      var len0 = utf8EncodedLen;
      var {entities: v1_0, contextWindowSize: v1_1, skipCustomDetect: v1_2 } = arg1;
      var vec4 = v1_0;
      var len4 = vec4.length;
      var result4 = realloc0(0, 0, 4, len4 * 12);
      for (let i = 0; i < vec4.length; i++) {
        const e = vec4[i];
        const base = result4 + i * 12;var variant3 = e;
        switch (variant3.tag) {
          case 'email': {
            dataView(memory0).setInt8(base + 0, 0, true);
            break;
          }
          case 'phone-number': {
            dataView(memory0).setInt8(base + 0, 1, true);
            break;
          }
          case 'ip-address': {
            dataView(memory0).setInt8(base + 0, 2, true);
            break;
          }
          case 'credit-card-number': {
            dataView(memory0).setInt8(base + 0, 3, true);
            break;
          }
          case 'custom': {
            const e = variant3.val;
            dataView(memory0).setInt8(base + 0, 4, true);
            var ptr2 = utf8Encode(e, realloc0, memory0);
            var len2 = utf8EncodedLen;
            dataView(memory0).setInt32(base + 8, len2, true);
            dataView(memory0).setInt32(base + 4, ptr2, true);
            break;
          }
          default: {
            throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant3.tag)}\` (received \`${variant3}\`) specified for \`SensitiveInfoEntity\``);
          }
        }
      }
      var variant5 = v1_1;
      let variant5_0;
      let variant5_1;
      if (variant5 === null || variant5=== undefined) {
        variant5_0 = 0;
        variant5_1 = 0;
      } else {
        const e = variant5;
        variant5_0 = 1;
        variant5_1 = toUint32(e);
      }
      const ret = exports1['detect-sensitive-info'](ptr0, len0, result4, len4, variant5_0, variant5_1, v1_2 ? 1 : 0);
      var len8 = dataView(memory0).getInt32(ret + 4, true);
      var base8 = dataView(memory0).getInt32(ret + 0, true);
      var result8 = [];
      for (let i = 0; i < len8; i++) {
        const base = base8 + i * 20;
        let variant7;
        switch (dataView(memory0).getUint8(base + 8, true)) {
          case 0: {
            variant7= {
              tag: 'email',
            };
            break;
          }
          case 1: {
            variant7= {
              tag: 'phone-number',
            };
            break;
          }
          case 2: {
            variant7= {
              tag: 'ip-address',
            };
            break;
          }
          case 3: {
            variant7= {
              tag: 'credit-card-number',
            };
            break;
          }
          case 4: {
            var ptr6 = dataView(memory0).getInt32(base + 12, true);
            var len6 = dataView(memory0).getInt32(base + 16, true);
            var result6 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr6, len6));
            variant7= {
              tag: 'custom',
              val: result6
            };
            break;
          }
          default: {
            throw new TypeError('invalid variant discriminant for SensitiveInfoEntity');
          }
        }
        result8.push({
          start: dataView(memory0).getInt32(base + 0, true) >>> 0,
          end: dataView(memory0).getInt32(base + 4, true) >>> 0,
          identifiedType: variant7,
        });
      }
      const retVal = result8;
      postReturn0(ret);
      return retVal;
    }
    
    return { detectSensitiveInfo,  };
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
