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
  
  const { detectSensitiveInfo, redactSensitiveInfo } = imports['arcjet:redact/custom-redact'];
  let gen = (function* init () {
    let exports0;
    let exports1;
    let memory0;
    let realloc0;
    
    function trampoline0(arg0, arg1, arg2) {
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
      const ret = detectSensitiveInfo(result1);
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
    
    function trampoline1(arg0, arg1, arg2, arg3, arg4, arg5) {
      let variant1;
      switch (arg0) {
        case 0: {
          variant1= {
            tag: 'email',
          };
          break;
        }
        case 1: {
          variant1= {
            tag: 'phone-number',
          };
          break;
        }
        case 2: {
          variant1= {
            tag: 'ip-address',
          };
          break;
        }
        case 3: {
          variant1= {
            tag: 'credit-card-number',
          };
          break;
        }
        case 4: {
          var ptr0 = arg1;
          var len0 = arg2;
          var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
          variant1= {
            tag: 'custom',
            val: result0
          };
          break;
        }
        default: {
          throw new TypeError('invalid variant discriminant for SensitiveInfoEntity');
        }
      }
      var ptr2 = arg3;
      var len2 = arg4;
      var result2 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr2, len2));
      const ret = redactSensitiveInfo(variant1, result2);
      var variant4 = ret;
      if (variant4 === null || variant4=== undefined) {
        dataView(memory0).setInt8(arg5 + 0, 0, true);
      } else {
        const e = variant4;
        dataView(memory0).setInt8(arg5 + 0, 1, true);
        var ptr3 = utf8Encode(e, realloc0, memory0);
        var len3 = utf8EncodedLen;
        dataView(memory0).setInt32(arg5 + 8, len3, true);
        dataView(memory0).setInt32(arg5 + 4, ptr3, true);
      }
    }
    let exports2;
    let postReturn0;
    Promise.all([module0, module1, module2]).catch(() => {});
    ({ exports: exports0 } = yield instantiateCore(yield module1));
    ({ exports: exports1 } = yield instantiateCore(yield module0, {
      'arcjet:redact/custom-redact': {
        'detect-sensitive-info': exports0['0'],
        'redact-sensitive-info': exports0['1'],
      },
    }));
    memory0 = exports1.memory;
    realloc0 = exports1.cabi_realloc;
    ({ exports: exports2 } = yield instantiateCore(yield module2, {
      '': {
        $imports: exports0.$imports,
        '0': trampoline0,
        '1': trampoline1,
      },
    }));
    postReturn0 = exports1.cabi_post_redact;
    
    function redact(arg0, arg1) {
      var ptr0 = utf8Encode(arg0, realloc0, memory0);
      var len0 = utf8EncodedLen;
      var {entities: v1_0, contextWindowSize: v1_1, skipCustomDetect: v1_2, skipCustomRedact: v1_3 } = arg1;
      var variant5 = v1_0;
      let variant5_0;
      let variant5_1;
      let variant5_2;
      if (variant5 === null || variant5=== undefined) {
        variant5_0 = 0;
        variant5_1 = 0;
        variant5_2 = 0;
      } else {
        const e = variant5;
        var vec4 = e;
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
        variant5_0 = 1;
        variant5_1 = result4;
        variant5_2 = len4;
      }
      var variant6 = v1_1;
      let variant6_0;
      let variant6_1;
      if (variant6 === null || variant6=== undefined) {
        variant6_0 = 0;
        variant6_1 = 0;
      } else {
        const e = variant6;
        variant6_0 = 1;
        variant6_1 = toUint32(e);
      }
      const ret = exports1.redact(ptr0, len0, variant5_0, variant5_1, variant5_2, variant6_0, variant6_1, v1_2 ? 1 : 0, v1_3 ? 1 : 0);
      var len11 = dataView(memory0).getInt32(ret + 4, true);
      var base11 = dataView(memory0).getInt32(ret + 0, true);
      var result11 = [];
      for (let i = 0; i < len11; i++) {
        const base = base11 + i * 36;
        var ptr7 = dataView(memory0).getInt32(base + 0, true);
        var len7 = dataView(memory0).getInt32(base + 4, true);
        var result7 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr7, len7));
        var ptr8 = dataView(memory0).getInt32(base + 8, true);
        var len8 = dataView(memory0).getInt32(base + 12, true);
        var result8 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr8, len8));
        let variant10;
        switch (dataView(memory0).getUint8(base + 24, true)) {
          case 0: {
            variant10= {
              tag: 'email',
            };
            break;
          }
          case 1: {
            variant10= {
              tag: 'phone-number',
            };
            break;
          }
          case 2: {
            variant10= {
              tag: 'ip-address',
            };
            break;
          }
          case 3: {
            variant10= {
              tag: 'credit-card-number',
            };
            break;
          }
          case 4: {
            var ptr9 = dataView(memory0).getInt32(base + 28, true);
            var len9 = dataView(memory0).getInt32(base + 32, true);
            var result9 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr9, len9));
            variant10= {
              tag: 'custom',
              val: result9
            };
            break;
          }
          default: {
            throw new TypeError('invalid variant discriminant for SensitiveInfoEntity');
          }
        }
        result11.push({
          original: result7,
          redacted: result8,
          start: dataView(memory0).getInt32(base + 16, true) >>> 0,
          end: dataView(memory0).getInt32(base + 20, true) >>> 0,
          identifiedType: variant10,
        });
      }
      const retVal = result11;
      postReturn0(ret);
      return retVal;
    }
    
    return { redact,  };
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
