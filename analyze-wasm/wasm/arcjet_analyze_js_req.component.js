function instantiate(getCoreModule, imports, instantiateCore = WebAssembly.instantiate) {
  
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
  
  
  const module0 = getCoreModule('arcjet_analyze_js_req.component.core.wasm');
  const module1 = getCoreModule('arcjet_analyze_js_req.component.core2.wasm');
  const module2 = getCoreModule('arcjet_analyze_js_req.component.core3.wasm');
  
  const { hasGravatar, hasMxRecords, isDisposableEmail, isFreeEmail } = imports['arcjet:js-req/email-validator-overrides'];
  const { detect } = imports['arcjet:js-req/sensitive-information-identifier'];
  const { verify } = imports['arcjet:js-req/verify-bot'];
  let gen = (function* init () {
    let exports0;
    let exports1;
    let memory0;
    let realloc0;
    
    function trampoline0(arg0, arg1, arg2, arg3) {
      var ptr0 = arg0;
      var len0 = arg1;
      var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
      var ptr1 = arg2;
      var len1 = arg3;
      var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
      const ret = verify(result0, result1);
      var val2 = ret;
      let enum2;
      switch (val2) {
        case 'verified': {
          enum2 = 0;
          break;
        }
        case 'spoofed': {
          enum2 = 1;
          break;
        }
        case 'unverifiable': {
          enum2 = 2;
          break;
        }
        default: {
          if ((ret) instanceof Error) {
            console.error(ret);
          }
          
          throw new TypeError(`"${val2}" is not one of the cases of validator-response`);
        }
      }
      return enum2;
    }
    
    function trampoline1(arg0, arg1) {
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
    
    function trampoline2(arg0, arg1) {
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
    
    function trampoline3(arg0, arg1) {
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
    
    function trampoline4(arg0, arg1) {
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
    
    function trampoline5(arg0, arg1, arg2) {
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
    let exports2;
    let postReturn0;
    let postReturn1;
    let postReturn2;
    let postReturn3;
    let postReturn4;
    Promise.all([module0, module1, module2]).catch(() => {});
    ({ exports: exports0 } = yield instantiateCore(yield module1));
    ({ exports: exports1 } = yield instantiateCore(yield module0, {
      'arcjet:js-req/email-validator-overrides': {
        'has-gravatar': exports0['4'],
        'has-mx-records': exports0['3'],
        'is-disposable-email': exports0['2'],
        'is-free-email': exports0['1'],
      },
      'arcjet:js-req/sensitive-information-identifier': {
        detect: exports0['5'],
      },
      'arcjet:js-req/verify-bot': {
        verify: exports0['0'],
      },
    }));
    memory0 = exports1.memory;
    realloc0 = exports1.cabi_realloc;
    ({ exports: exports2 } = yield instantiateCore(yield module2, {
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
    postReturn0 = exports1['cabi_post_detect-bot'];
    postReturn1 = exports1['cabi_post_generate-fingerprint'];
    postReturn2 = exports1['cabi_post_validate-characteristics'];
    postReturn3 = exports1['cabi_post_is-valid-email'];
    postReturn4 = exports1['cabi_post_detect-sensitive-info'];
    
    function detectBot(arg0, arg1) {
      var ptr0 = utf8Encode(arg0, realloc0, memory0);
      var len0 = utf8EncodedLen;
      var variant7 = arg1;
      let variant7_0;
      let variant7_1;
      let variant7_2;
      let variant7_3;
      switch (variant7.tag) {
        case 'allowed-bot-config': {
          const e = variant7.val;
          var {entities: v1_0, skipCustomDetect: v1_1 } = e;
          var vec3 = v1_0;
          var len3 = vec3.length;
          var result3 = realloc0(0, 0, 4, len3 * 8);
          for (let i = 0; i < vec3.length; i++) {
            const e = vec3[i];
            const base = result3 + i * 8;var ptr2 = utf8Encode(e, realloc0, memory0);
            var len2 = utf8EncodedLen;
            dataView(memory0).setInt32(base + 4, len2, true);
            dataView(memory0).setInt32(base + 0, ptr2, true);
          }
          variant7_0 = 0;
          variant7_1 = result3;
          variant7_2 = len3;
          variant7_3 = v1_1 ? 1 : 0;
          break;
        }
        case 'denied-bot-config': {
          const e = variant7.val;
          var {entities: v4_0, skipCustomDetect: v4_1 } = e;
          var vec6 = v4_0;
          var len6 = vec6.length;
          var result6 = realloc0(0, 0, 4, len6 * 8);
          for (let i = 0; i < vec6.length; i++) {
            const e = vec6[i];
            const base = result6 + i * 8;var ptr5 = utf8Encode(e, realloc0, memory0);
            var len5 = utf8EncodedLen;
            dataView(memory0).setInt32(base + 4, len5, true);
            dataView(memory0).setInt32(base + 0, ptr5, true);
          }
          variant7_0 = 1;
          variant7_1 = result6;
          variant7_2 = len6;
          variant7_3 = v4_1 ? 1 : 0;
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant7.tag)}\` (received \`${variant7}\`) specified for \`BotConfig\``);
        }
      }
      const ret = exports1['detect-bot'](ptr0, len0, variant7_0, variant7_1, variant7_2, variant7_3);
      let variant15;
      switch (dataView(memory0).getUint8(ret + 0, true)) {
        case 0: {
          var len9 = dataView(memory0).getInt32(ret + 8, true);
          var base9 = dataView(memory0).getInt32(ret + 4, true);
          var result9 = [];
          for (let i = 0; i < len9; i++) {
            const base = base9 + i * 8;
            var ptr8 = dataView(memory0).getInt32(base + 0, true);
            var len8 = dataView(memory0).getInt32(base + 4, true);
            var result8 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr8, len8));
            result9.push(result8);
          }
          var len11 = dataView(memory0).getInt32(ret + 16, true);
          var base11 = dataView(memory0).getInt32(ret + 12, true);
          var result11 = [];
          for (let i = 0; i < len11; i++) {
            const base = base11 + i * 8;
            var ptr10 = dataView(memory0).getInt32(base + 0, true);
            var len10 = dataView(memory0).getInt32(base + 4, true);
            var result10 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr10, len10));
            result11.push(result10);
          }
          var bool12 = dataView(memory0).getUint8(ret + 20, true);
          var bool13 = dataView(memory0).getUint8(ret + 21, true);
          variant15= {
            tag: 'ok',
            val: {
              allowed: result9,
              denied: result11,
              verified: bool12 == 0 ? false : (bool12 == 1 ? true : throwInvalidBool()),
              spoofed: bool13 == 0 ? false : (bool13 == 1 ? true : throwInvalidBool()),
            }
          };
          break;
        }
        case 1: {
          var ptr14 = dataView(memory0).getInt32(ret + 4, true);
          var len14 = dataView(memory0).getInt32(ret + 8, true);
          var result14 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr14, len14));
          variant15= {
            tag: 'err',
            val: result14
          };
          break;
        }
        default: {
          throw new TypeError('invalid variant discriminant for expected');
        }
      }
      const retVal = variant15;
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
      let variant5;
      switch (dataView(memory0).getUint8(ret + 0, true)) {
        case 0: {
          var ptr3 = dataView(memory0).getInt32(ret + 4, true);
          var len3 = dataView(memory0).getInt32(ret + 8, true);
          var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
          variant5= {
            tag: 'ok',
            val: result3
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
      postReturn1(ret);
      if (typeof retVal === 'object' && retVal.tag === 'err') {
        throw new ComponentError(retVal.val);
      }
      return retVal.val;
    }
    
    function validateCharacteristics(arg0, arg1) {
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
      const ret = exports1['validate-characteristics'](ptr0, len0, result2, len2);
      let variant4;
      switch (dataView(memory0).getUint8(ret + 0, true)) {
        case 0: {
          variant4= {
            tag: 'ok',
            val: undefined
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
      const retVal = variant4;
      postReturn2(ret);
      if (typeof retVal === 'object' && retVal.tag === 'err') {
        throw new ComponentError(retVal.val);
      }
      return retVal.val;
    }
    
    function isValidEmail(arg0, arg1) {
      var ptr0 = utf8Encode(arg0, realloc0, memory0);
      var len0 = utf8EncodedLen;
      var variant7 = arg1;
      let variant7_0;
      let variant7_1;
      let variant7_2;
      let variant7_3;
      let variant7_4;
      switch (variant7.tag) {
        case 'allow-email-validation-config': {
          const e = variant7.val;
          var {requireTopLevelDomain: v1_0, allowDomainLiteral: v1_1, allow: v1_2 } = e;
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
          variant7_0 = 0;
          variant7_1 = v1_0 ? 1 : 0;
          variant7_2 = v1_1 ? 1 : 0;
          variant7_3 = result3;
          variant7_4 = len3;
          break;
        }
        case 'deny-email-validation-config': {
          const e = variant7.val;
          var {requireTopLevelDomain: v4_0, allowDomainLiteral: v4_1, deny: v4_2 } = e;
          var vec6 = v4_2;
          var len6 = vec6.length;
          var result6 = realloc0(0, 0, 4, len6 * 8);
          for (let i = 0; i < vec6.length; i++) {
            const e = vec6[i];
            const base = result6 + i * 8;var ptr5 = utf8Encode(e, realloc0, memory0);
            var len5 = utf8EncodedLen;
            dataView(memory0).setInt32(base + 4, len5, true);
            dataView(memory0).setInt32(base + 0, ptr5, true);
          }
          variant7_0 = 1;
          variant7_1 = v4_0 ? 1 : 0;
          variant7_2 = v4_1 ? 1 : 0;
          variant7_3 = result6;
          variant7_4 = len6;
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant7.tag)}\` (received \`${variant7}\`) specified for \`EmailValidationConfig\``);
        }
      }
      const ret = exports1['is-valid-email'](ptr0, len0, variant7_0, variant7_1, variant7_2, variant7_3, variant7_4);
      let variant12;
      switch (dataView(memory0).getUint8(ret + 0, true)) {
        case 0: {
          let enum8;
          switch (dataView(memory0).getUint8(ret + 4, true)) {
            case 0: {
              enum8 = 'valid';
              break;
            }
            case 1: {
              enum8 = 'invalid';
              break;
            }
            default: {
              throw new TypeError('invalid discriminant specified for EmailValidity');
            }
          }
          var len10 = dataView(memory0).getInt32(ret + 12, true);
          var base10 = dataView(memory0).getInt32(ret + 8, true);
          var result10 = [];
          for (let i = 0; i < len10; i++) {
            const base = base10 + i * 8;
            var ptr9 = dataView(memory0).getInt32(base + 0, true);
            var len9 = dataView(memory0).getInt32(base + 4, true);
            var result9 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr9, len9));
            result10.push(result9);
          }
          variant12= {
            tag: 'ok',
            val: {
              validity: enum8,
              blocked: result10,
            }
          };
          break;
        }
        case 1: {
          var ptr11 = dataView(memory0).getInt32(ret + 4, true);
          var len11 = dataView(memory0).getInt32(ret + 8, true);
          var result11 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr11, len11));
          variant12= {
            tag: 'err',
            val: result11
          };
          break;
        }
        default: {
          throw new TypeError('invalid variant discriminant for expected');
        }
      }
      const retVal = variant12;
      postReturn3(ret);
      if (typeof retVal === 'object' && retVal.tag === 'err') {
        throw new ComponentError(retVal.val);
      }
      return retVal.val;
    }
    
    function detectSensitiveInfo(arg0, arg1) {
      var ptr0 = utf8Encode(arg0, realloc0, memory0);
      var len0 = utf8EncodedLen;
      var {entities: v1_0, contextWindowSize: v1_1, skipCustomDetect: v1_2 } = arg1;
      var variant8 = v1_0;
      let variant8_0;
      let variant8_1;
      let variant8_2;
      switch (variant8.tag) {
        case 'allow': {
          const e = variant8.val;
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
          variant8_0 = 0;
          variant8_1 = result4;
          variant8_2 = len4;
          break;
        }
        case 'deny': {
          const e = variant8.val;
          var vec7 = e;
          var len7 = vec7.length;
          var result7 = realloc0(0, 0, 4, len7 * 12);
          for (let i = 0; i < vec7.length; i++) {
            const e = vec7[i];
            const base = result7 + i * 12;var variant6 = e;
            switch (variant6.tag) {
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
                const e = variant6.val;
                dataView(memory0).setInt8(base + 0, 4, true);
                var ptr5 = utf8Encode(e, realloc0, memory0);
                var len5 = utf8EncodedLen;
                dataView(memory0).setInt32(base + 8, len5, true);
                dataView(memory0).setInt32(base + 4, ptr5, true);
                break;
              }
              default: {
                throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant6.tag)}\` (received \`${variant6}\`) specified for \`SensitiveInfoEntity\``);
              }
            }
          }
          variant8_0 = 1;
          variant8_1 = result7;
          variant8_2 = len7;
          break;
        }
        default: {
          throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant8.tag)}\` (received \`${variant8}\`) specified for \`SensitiveInfoEntities\``);
        }
      }
      var variant9 = v1_1;
      let variant9_0;
      let variant9_1;
      if (variant9 === null || variant9=== undefined) {
        variant9_0 = 0;
        variant9_1 = 0;
      } else {
        const e = variant9;
        variant9_0 = 1;
        variant9_1 = toUint32(e);
      }
      const ret = exports1['detect-sensitive-info'](ptr0, len0, variant8_0, variant8_1, variant8_2, variant9_0, variant9_1, v1_2 ? 1 : 0);
      var len12 = dataView(memory0).getInt32(ret + 4, true);
      var base12 = dataView(memory0).getInt32(ret + 0, true);
      var result12 = [];
      for (let i = 0; i < len12; i++) {
        const base = base12 + i * 20;
        let variant11;
        switch (dataView(memory0).getUint8(base + 8, true)) {
          case 0: {
            variant11= {
              tag: 'email',
            };
            break;
          }
          case 1: {
            variant11= {
              tag: 'phone-number',
            };
            break;
          }
          case 2: {
            variant11= {
              tag: 'ip-address',
            };
            break;
          }
          case 3: {
            variant11= {
              tag: 'credit-card-number',
            };
            break;
          }
          case 4: {
            var ptr10 = dataView(memory0).getInt32(base + 12, true);
            var len10 = dataView(memory0).getInt32(base + 16, true);
            var result10 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr10, len10));
            variant11= {
              tag: 'custom',
              val: result10
            };
            break;
          }
          default: {
            throw new TypeError('invalid variant discriminant for SensitiveInfoEntity');
          }
        }
        result12.push({
          start: dataView(memory0).getInt32(base + 0, true) >>> 0,
          end: dataView(memory0).getInt32(base + 4, true) >>> 0,
          identifiedType: variant11,
        });
      }
      var len15 = dataView(memory0).getInt32(ret + 12, true);
      var base15 = dataView(memory0).getInt32(ret + 8, true);
      var result15 = [];
      for (let i = 0; i < len15; i++) {
        const base = base15 + i * 20;
        let variant14;
        switch (dataView(memory0).getUint8(base + 8, true)) {
          case 0: {
            variant14= {
              tag: 'email',
            };
            break;
          }
          case 1: {
            variant14= {
              tag: 'phone-number',
            };
            break;
          }
          case 2: {
            variant14= {
              tag: 'ip-address',
            };
            break;
          }
          case 3: {
            variant14= {
              tag: 'credit-card-number',
            };
            break;
          }
          case 4: {
            var ptr13 = dataView(memory0).getInt32(base + 12, true);
            var len13 = dataView(memory0).getInt32(base + 16, true);
            var result13 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr13, len13));
            variant14= {
              tag: 'custom',
              val: result13
            };
            break;
          }
          default: {
            throw new TypeError('invalid variant discriminant for SensitiveInfoEntity');
          }
        }
        result15.push({
          start: dataView(memory0).getInt32(base + 0, true) >>> 0,
          end: dataView(memory0).getInt32(base + 4, true) >>> 0,
          identifiedType: variant14,
        });
      }
      const retVal = {
        allowed: result12,
        denied: result15,
      };
      postReturn4(ret);
      return retVal;
    }
    
    return { detectBot, detectSensitiveInfo, generateFingerprint, isValidEmail, validateCharacteristics,  };
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
