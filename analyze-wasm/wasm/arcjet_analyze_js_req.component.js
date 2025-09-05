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
  
  let NEXT_TASK_ID = 0n;
  function startCurrentTask(componentIdx, isAsync, entryFnName) {
    _debugLog('[startCurrentTask()] args', { componentIdx, isAsync });
    const tasks = ASYNC_TASKS_BY_COMPONENT_IDX.get(componentIdx);
    
    const nextId = ++NEXT_TASK_ID;
    const newTask = new AsyncTask({ id: nextId, componentIdx, isAsync, entryFnName });
    const newTaskMeta = { id: nextId, componentIdx, task: newTask };
    
    ASYNC_CURRENT_TASK_IDS.push(nextId);
    ASYNC_CURRENT_COMPONENT_IDXS.push(componentIdx);
    
    if (!tasks) {
      ASYNC_TASKS_BY_COMPONENT_IDX.set(componentIdx, [newTaskMeta]);
      return nextId;
    } else {
      tasks.push(newTaskMeta);
    }
    
    return nextId;
  }
  
  function endCurrentTask(componentIdx, taskId) {
    _debugLog('[endCurrentTask()] args', { componentIdx });
    componentIdx ??= ASYNC_CURRENT_COMPONENT_IDXS.at(-1);
    taskId ??= ASYNC_CURRENT_TASK_IDS.at(-1);
    if (componentIdx === undefined || componentIdx === null) {
      throw new Error('missing/invalid component instance index while ending current task');
    }
    const tasks = ASYNC_TASKS_BY_COMPONENT_IDX.get(componentIdx);
    if (!tasks || !Array.isArray(tasks)) {
      throw new Error('missing/invalid tasks for component instance while ending task');
    }
    if (tasks.length == 0) {
      throw new Error('no current task(s) for component instance while ending task');
    }
    
    if (taskId) {
      const last = tasks[tasks.length - 1];
      if (last.id !== taskId) {
        throw new Error('current task does not match expected task ID');
      }
    }
    
    ASYNC_CURRENT_TASK_IDS.pop();
    ASYNC_CURRENT_COMPONENT_IDXS.pop();
    
    return tasks.pop();
  }
  const ASYNC_TASKS_BY_COMPONENT_IDX = new Map();
  const ASYNC_CURRENT_TASK_IDS = [];
  const ASYNC_CURRENT_COMPONENT_IDXS = [];
  
  class AsyncTask {
    static State = {
      INITIAL: 'initial',
      CANCELLED: 'cancelled',
      CANCEL_PENDING: 'cancel-pending',
      CANCEL_DELIVERED: 'cancel-delivered',
      RESOLVED: 'resolved',
    }
    
    static BlockResult = {
      CANCELLED: 'block.cancelled',
      NOT_CANCELLED: 'block.not-cancelled',
    }
    
    #id;
    #componentIdx;
    #state;
    #isAsync;
    #onResolve = null;
    #entryFnName = null;
    #subtasks = [];
    #completionPromise = null;
    
    cancelled = false;
    requested = false;
    alwaysTaskReturn = false;
    
    returnCalls =  0;
    storage = [0, 0];
    borrowedHandles = {};
    
    awaitableResume = null;
    awaitableCancel = null;
    
    
    constructor(opts) {
      if (opts?.id === undefined) { throw new TypeError('missing task ID during task creation'); }
      this.#id = opts.id;
      if (opts?.componentIdx === undefined) {
        throw new TypeError('missing component id during task creation');
      }
      this.#componentIdx = opts.componentIdx;
      this.#state = AsyncTask.State.INITIAL;
      this.#isAsync = opts?.isAsync ?? false;
      this.#entryFnName = opts.entryFnName;
      
      const {
        promise: completionPromise,
        resolve: resolveCompletionPromise,
        reject: rejectCompletionPromise,
      } = Promise.withResolvers();
      this.#completionPromise = completionPromise;
      
      this.#onResolve = (results) => {
        // TODO: handle external facing cancellation (should likely be a rejection)
        resolveCompletionPromise(results);
      };
    }
    
    taskState() { return this.#state.slice(); }
    id() { return this.#id; }
    componentIdx() { return this.#componentIdx; }
    isAsync() { return this.#isAsync; }
    entryFnName() { return this.#entryFnName; }
    completionPromise() { return this.#completionPromise; }
    
    mayEnter(task) {
      const cstate = getOrCreateAsyncState(this.#componentIdx);
      if (!cstate.backpressure) {
        _debugLog('[AsyncTask#mayEnter()] disallowed due to backpressure', { taskID: this.#id });
        return false;
      }
      if (!cstate.callingSyncImport()) {
        _debugLog('[AsyncTask#mayEnter()] disallowed due to sync import call', { taskID: this.#id });
        return false;
      }
      const callingSyncExportWithSyncPending = cstate.callingSyncExport && !task.isAsync;
      if (!callingSyncExportWithSyncPending) {
        _debugLog('[AsyncTask#mayEnter()] disallowed due to sync export w/ sync pending', { taskID: this.#id });
        return false;
      }
      return true;
    }
    
    async enter() {
      _debugLog('[AsyncTask#enter()] args', { taskID: this.#id });
      
      // TODO: assert scheduler locked
      // TODO: trap if on the stack
      
      const cstate = getOrCreateAsyncState(this.#componentIdx);
      
      let mayNotEnter = !this.mayEnter(this);
      const componentHasPendingTasks = cstate.pendingTasks > 0;
      if (mayNotEnter || componentHasPendingTasks) {
        throw new Error('in enter()'); // TODO: remove
      }
      
      if (!this.isAsync) { cstate.callingSyncExport = true; }
      
      return true;
    }
    
    async waitForEvent(opts) {
      const { waitableSetRep, isAsync } = opts;
      _debugLog('[AsyncTask#waitForEvent()] args', { taskID: this.#id, waitableSetRep, isAsync });
      
      if (this.#isAsync !== isAsync) {
        throw new Error('async waitForEvent called on non-async task');
      }
      
      if (this.status === AsyncTask.State.CANCEL_PENDING) {
        this.#state = AsyncTask.State.CANCEL_DELIVERED;
        return {
          code: ASYNC_EVENT_CODE.TASK_CANCELLED,
        };
      }
      
      const state = getOrCreateAsyncState(this.#componentIdx);
      const waitableSet = state.waitableSets.get(waitableSetRep);
      if (!waitableSet) { throw new Error('missing/invalid waitable set'); }
      
      waitableSet.numWaiting += 1;
      let event = null;
      
      while (event == null) {
        const awaitable = new Awaitable(waitableSet.getPendingEvent());
        const waited = await this.blockOn({ awaitable, isAsync, isCancellable: true });
        if (waited) {
          if (this.#state !== AsyncTask.State.INITIAL) {
            throw new Error('task should be in initial state found [' + this.#state + ']');
          }
          this.#state = AsyncTask.State.CANCELLED;
          return {
            code: ASYNC_EVENT_CODE.TASK_CANCELLED,
          };
        }
        
        event = waitableSet.poll();
      }
      
      waitableSet.numWaiting -= 1;
      return event;
    }
    
    waitForEventSync(opts) {
      throw new Error('AsyncTask#yieldSync() not implemented')
    }
    
    async pollForEvent(opts) {
      const { waitableSetRep, isAsync } = opts;
      _debugLog('[AsyncTask#pollForEvent()] args', { taskID: this.#id, waitableSetRep, isAsync });
      
      if (this.#isAsync !== isAsync) {
        throw new Error('async pollForEvent called on non-async task');
      }
      
      throw new Error('AsyncTask#pollForEvent() not implemented');
    }
    
    pollForEventSync(opts) {
      throw new Error('AsyncTask#yieldSync() not implemented')
    }
    
    async blockOn(opts) {
      const { awaitable, isCancellable, forCallback } = opts;
      _debugLog('[AsyncTask#blockOn()] args', { taskID: this.#id, awaitable, isCancellable, forCallback });
      
      if (awaitable.resolved() && false) ;
      
      const cstate = getOrCreateAsyncState(this.#componentIdx);
      if (forCallback) { cstate.exclusiveRelease(); }
      
      let cancelled = await this.onBlock(awaitable);
      if (cancelled === AsyncTask.BlockResult.CANCELLED && !isCancellable) {
        const secondCancel = await this.onBlock(awaitable);
        if (secondCancel !== AsyncTask.BlockResult.NOT_CANCELLED) {
          throw new Error('uncancellable task was canceled despite second onBlock()');
        }
      }
      
      if (forCallback) {
        const acquired = new Awaitable(cstate.exclusiveLock());
        cancelled = await this.onBlock(acquired);
        if (cancelled === AsyncTask.BlockResult.CANCELLED) {
          const secondCancel = await this.onBlock(acquired);
          if (secondCancel !== AsyncTask.BlockResult.NOT_CANCELLED) {
            throw new Error('uncancellable callback task was canceled despite second onBlock()');
          }
        }
      }
      
      if (cancelled === AsyncTask.BlockResult.CANCELLED) {
        if (this.#state !== AsyncTask.State.INITIAL) {
          throw new Error('cancelled task is not at initial state');
        }
        if (isCancellable) {
          this.#state = AsyncTask.State.CANCELLED;
          return AsyncTask.BlockResult.CANCELLED;
        } else {
          this.#state = AsyncTask.State.CANCEL_PENDING;
          return AsyncTask.BlockResult.NOT_CANCELLED;
        }
      }
      
      return AsyncTask.BlockResult.NOT_CANCELLED;
    }
    
    async onBlock(awaitable) {
      _debugLog('[AsyncTask#onBlock()] args', { taskID: this.#id, awaitable });
      if (!(awaitable instanceof Awaitable)) {
        throw new Error('invalid awaitable during onBlock');
      }
      
      // Build a promise that this task can await on which resolves when it is awoken
      const { promise, resolve, reject } = Promise.withResolvers();
      this.awaitableResume = () => {
        _debugLog('[AsyncTask] resuming after onBlock', { taskID: this.#id });
        resolve();
      };
      this.awaitableCancel = (err) => {
        _debugLog('[AsyncTask] rejecting after onBlock', { taskID: this.#id, err });
        reject(err);
      };
      
      // Park this task/execution to be handled later
      const state = getOrCreateAsyncState(this.#componentIdx);
      state.parkTaskOnAwaitable({ awaitable, task: this });
      
      try {
        await promise;
        return AsyncTask.BlockResult.NOT_CANCELLED;
      } catch (err) {
        // rejection means task cancellation
        return AsyncTask.BlockResult.CANCELLED;
      }
    }
    
    async asyncOnBlock(awaitable) {
      _debugLog('[AsyncTask#asyncOnBlock()] args', { taskID: this.#id, awaitable });
      if (!(awaitable instanceof Awaitable)) {
        throw new Error('invalid awaitable during onBlock');
      }
      // TODO: watch for waitable AND cancellation
      // TODO: if it WAS cancelled:
      // - return true
      // - only once per subtask
      // - do not wait on the scheduler
      // - control flow should go to the subtask (only once)
      // - Once subtask blocks/resolves, reqlinquishControl() will tehn resolve request_cancel_end (without scheduler lock release)
      // - control flow goes back to request_cancel
      //
      // Subtask cancellation should work similarly to an async import call -- runs sync up until
      // the subtask blocks or resolves
      //
      throw new Error('AsyncTask#asyncOnBlock() not yet implemented');
    }
    
    async yield(opts) {
      const { isCancellable, forCallback } = opts;
      _debugLog('[AsyncTask#yield()] args', { taskID: this.#id, isCancellable, forCallback });
      
      if (isCancellable && this.status === AsyncTask.State.CANCEL_PENDING) {
        this.#state = AsyncTask.State.CANCELLED;
        return {
          code: ASYNC_EVENT_CODE.TASK_CANCELLED,
          payload: [0, 0],
        };
      }
      
      // TODO: Awaitables need to *always* trigger the parking mechanism when they're done...?
      // TODO: Component async state should remember which awaitables are done and work to clear tasks waiting
      
      const blockResult = await this.blockOn({
        awaitable: new Awaitable(new Promise(resolve => setTimeout(resolve, 0))),
        isCancellable,
        forCallback,
      });
      
      if (blockResult === AsyncTask.BlockResult.CANCELLED) {
        if (this.#state !== AsyncTask.State.INITIAL) {
          throw new Error('task should be in initial state found [' + this.#state + ']');
        }
        this.#state = AsyncTask.State.CANCELLED;
        return {
          code: ASYNC_EVENT_CODE.TASK_CANCELLED,
          payload: [0, 0],
        };
      }
      
      return {
        code: ASYNC_EVENT_CODE.NONE,
        payload: [0, 0],
      };
    }
    
    yieldSync(opts) {
      throw new Error('AsyncTask#yieldSync() not implemented')
    }
    
    cancel() {
      _debugLog('[AsyncTask#cancel()] args', { });
      if (!this.taskState() !== AsyncTask.State.CANCEL_DELIVERED) {
        throw new Error('invalid task state for cancellation');
      }
      if (this.borrowedHandles.length > 0) { throw new Error('task still has borrow handles'); }
      
      this.#onResolve(new Error('cancelled'));
      this.#state = AsyncTask.State.RESOLVED;
    }
    
    resolve(results) {
      _debugLog('[AsyncTask#resolve()] args', { results });
      if (this.#state === AsyncTask.State.RESOLVED) {
        throw new Error('task is already resolved');
      }
      if (this.borrowedHandles.length > 0) { throw new Error('task still has borrow handles'); }
      this.#onResolve(results.length === 1 ? results[0] : results);
      this.#state = AsyncTask.State.RESOLVED;
    }
    
    exit() {
      _debugLog('[AsyncTask#exit()] args', { });
      
      // TODO: ensure there is only one task at a time (scheduler.lock() functionality)
      if (this.#state !== AsyncTask.State.RESOLVED) {
        throw new Error('task exited without resolution');
      }
      if (this.borrowedHandles > 0) {
        throw new Error('task exited without clearing borrowed handles');
      }
      
      const state = getOrCreateAsyncState(this.#componentIdx);
      if (!state) { throw new Error('missing async state for component [' + this.#componentIdx + ']'); }
      if (!this.#isAsync && !state.inSyncExportCall) {
        throw new Error('sync task must be run from components known to be in a sync export call');
      }
      state.inSyncExportCall = false;
      
      this.startPendingTask();
    }
    
    startPendingTask(args) {
      _debugLog('[AsyncTask#startPendingTask()] args', args);
      throw new Error('AsyncTask#startPendingTask() not implemented');
    }
    
    createSubtask(args) {
      _debugLog('[AsyncTask#createSubtask()] args', args);
      const newSubtask = new AsyncSubtask({
        componentIdx: this.componentIdx(),
        taskID: this.id(),
        memoryIdx: args?.memoryIdx,
      });
      this.#subtasks.push(newSubtask);
      return newSubtask;
    }
    
    currentSubtask() {
      _debugLog('[AsyncTask#currentSubtask()]');
      if (this.#subtasks.length === 0) { throw new Error('no current subtask'); }
      return this.#subtasks.at(-1);
    }
    
    endCurrentSubtask() {
      _debugLog('[AsyncTask#endCurrentSubtask()]');
      if (this.#subtasks.length === 0) { throw new Error('cannot end current subtask: no current subtask'); }
      const subtask = this.#subtasks.pop();
      subtask.drop();
      return subtask;
    }
  }
  const ASYNC_STATE = new Map();
  
  function getOrCreateAsyncState(componentIdx, init) {
    if (!ASYNC_STATE.has(componentIdx)) {
      ASYNC_STATE.set(componentIdx, new ComponentAsyncState());
    }
    return ASYNC_STATE.get(componentIdx);
  }
  
  class ComponentAsyncState {
    #callingAsyncImport = false;
    #syncImportWait = Promise.withResolvers();
    #lock = null;
    
    mayLeave = true;
    waitableSets = new RepTable();
    waitables = new RepTable();
    
    #parkedTasks = new Map();
    
    callingSyncImport(val) {
      if (val === undefined) { return this.#callingAsyncImport; }
      if (typeof val !== 'boolean') { throw new TypeError('invalid setting for async import'); }
      const prev = this.#callingAsyncImport;
      this.#callingAsyncImport = val;
      if (prev === true && this.#callingAsyncImport === false) {
        this.#notifySyncImportEnd();
      }
    }
    
    #notifySyncImportEnd() {
      const existing = this.#syncImportWait;
      this.#syncImportWait = Promise.withResolvers();
      existing.resolve();
    }
    
    async waitForSyncImportCallEnd() {
      await this.#syncImportWait.promise;
    }
    
    parkTaskOnAwaitable(args) {
      if (!args.awaitable) { throw new TypeError('missing awaitable when trying to park'); }
      if (!args.task) { throw new TypeError('missing task when trying to park'); }
      const { awaitable, task } = args;
      
      let taskList = this.#parkedTasks.get(awaitable.id());
      if (!taskList) {
        taskList = [];
        this.#parkedTasks.set(awaitable.id(), taskList);
      }
      taskList.push(task);
      
      this.wakeNextTaskForAwaitable(awaitable);
    }
    
    wakeNextTaskForAwaitable(awaitable) {
      if (!awaitable) { throw new TypeError('missing awaitable when waking next task'); }
      const awaitableID = awaitable.id();
      
      const taskList = this.#parkedTasks.get(awaitableID);
      if (!taskList || taskList.length === 0) {
        _debugLog('[ComponentAsyncState] no tasks waiting for awaitable', { awaitableID: awaitable.id() });
        return;
      }
      
      let task = taskList.shift(); // todo(perf)
      if (!task) { throw new Error('no task in parked list despite previous check'); }
      
      if (!task.awaitableResume) {
        throw new Error('task ready due to awaitable is missing resume', { taskID: task.id(), awaitableID });
      }
      task.awaitableResume();
    }
    
    async exclusiveLock() {  // TODO: use atomics
    if (this.#lock === null) {
      this.#lock = { ticket: 0n };
    }
    
    // Take a ticket for the next valid usage
    const ticket = ++this.#lock.ticket;
    
    _debugLog('[ComponentAsyncState#exclusiveLock()] locking', {
      currentTicket: ticket - 1n,
      ticket
    });
    
    // If there is an active promise, then wait for it
    let finishedTicket;
    while (this.#lock.promise) {
      finishedTicket = await this.#lock.promise;
      if (finishedTicket === ticket - 1n) { break; }
    }
    
    const { promise, resolve } = Promise.withResolvers();
    this.#lock = {
      ticket,
      promise,
      resolve,
    };
    
    return this.#lock.promise;
  }
  
  exclusiveRelease() {
    _debugLog('[ComponentAsyncState#exclusiveRelease()] releasing', {
      currentTicket: this.#lock === null ? 'none' : this.#lock.ticket,
    });
    
    if (this.#lock === null) { return; }
    
    const existingLock = this.#lock;
    this.#lock = null;
    existingLock.resolve(existingLock.ticket);
  }
  
  isExclusivelyLocked() { return this.#lock !== null; }
  
}

if (!Promise.withResolvers) {
  Promise.withResolvers = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

const _debugLog = (...args) => {
  if (!globalThis?.process?.env?.JCO_DEBUG) { return; }
  console.debug(...args);
};

const fetchCompile = url => fetch(url).then(WebAssembly.compileStreaming);

class ComponentError extends Error {
  constructor (value) {
    const enumerable = typeof value !== 'string';
    super(enumerable ? `${String(value)} (see error.payload)` : value);
    Object.defineProperty(this, 'payload', { value, enumerable });
  }
}

class RepTable {
  #data = [0, null];
  
  insert(val) {
    _debugLog('[RepTable#insert()] args', { val });
    const freeIdx = this.#data[0];
    if (freeIdx === 0) {
      this.#data.push(val);
      this.#data.push(null);
      return (this.#data.length >> 1) - 1;
    }
    this.#data[0] = this.#data[freeIdx << 1];
    const placementIdx = freeIdx << 1;
    this.#data[placementIdx] = val;
    this.#data[placementIdx + 1] = null;
    return freeIdx;
  }
  
  get(rep) {
    _debugLog('[RepTable#get()] args', { rep });
    const baseIdx = rep << 1;
    const val = this.#data[baseIdx];
    return val;
  }
  
  contains(rep) {
    _debugLog('[RepTable#contains()] args', { rep });
    const baseIdx = rep << 1;
    return !!this.#data[baseIdx];
  }
  
  remove(rep) {
    _debugLog('[RepTable#remove()] args', { rep });
    if (this.#data.length === 2) { throw new Error('invalid'); }
    
    const baseIdx = rep << 1;
    const val = this.#data[baseIdx];
    if (val === 0) { throw new Error('invalid resource rep (cannot be 0)'); }
    
    this.#data[baseIdx] = this.#data[0];
    this.#data[0] = rep;
    
    return val;
  }
  
  clear() {
    _debugLog('[RepTable#clear()] args', { rep });
    this.#data = [0, null];
  }
}

function throwInvalidBool() {
  throw new TypeError('invalid variant discriminant for bool');
}


if (!getCoreModule) getCoreModule = (name) => fetchCompile(new URL(`./${name}`, import.meta.url));
const module0 = getCoreModule('arcjet_analyze_js_req.component.core.wasm');
const module1 = getCoreModule('arcjet_analyze_js_req.component.core2.wasm');
const module2 = getCoreModule('arcjet_analyze_js_req.component.core3.wasm');

const { detect } = imports['arcjet:js-req/bot-identifier'];
const { hasGravatar, hasMxRecords, isDisposableEmail, isFreeEmail } = imports['arcjet:js-req/email-validator-overrides'];
const { ipLookup } = imports['arcjet:js-req/filter-overrides'];
const { detect: detect$1 } = imports['arcjet:js-req/sensitive-information-identifier'];
const { verify } = imports['arcjet:js-req/verify-bot'];
let gen = (function* _initGenerator () {
  let exports0;
  let exports1;
  let memory0;
  let realloc0;
  
  function trampoline0(arg0, arg1, arg2) {
    var ptr0 = arg0;
    var len0 = arg1;
    var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
    _debugLog('[iface="arcjet:js-req/bot-identifier", function="detect"] [Instruction::CallInterface] (async? sync, @ enter)');
    startCurrentTask(0, false, 'detect');
    const ret = detect(result0);
    _debugLog('[iface="arcjet:js-req/bot-identifier", function="detect"] [Instruction::CallInterface] (sync, @ post-call)');
    endCurrentTask(0);
    var vec2 = ret;
    var len2 = vec2.length;
    var result2 = realloc0(0, 0, 4, len2 * 8);
    for (let i = 0; i < vec2.length; i++) {
      const e = vec2[i];
      const base = result2 + i * 8;var ptr1 = utf8Encode(e, realloc0, memory0);
      var len1 = utf8EncodedLen;
      dataView(memory0).setUint32(base + 4, len1, true);
      dataView(memory0).setUint32(base + 0, ptr1, true);
    }
    dataView(memory0).setUint32(arg2 + 4, len2, true);
    dataView(memory0).setUint32(arg2 + 0, result2, true);
    _debugLog('[iface="arcjet:js-req/bot-identifier", function="detect"][Instruction::Return]', {
      funcName: 'detect',
      paramCount: 0,
      async: false,
      postReturn: false
    });
  }
  
  
  function trampoline1(arg0, arg1, arg2, arg3) {
    var ptr0 = arg0;
    var len0 = arg1;
    var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
    var ptr1 = arg2;
    var len1 = arg3;
    var result1 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr1, len1));
    _debugLog('[iface="arcjet:js-req/verify-bot", function="verify"] [Instruction::CallInterface] (async? sync, @ enter)');
    startCurrentTask(0, false, 'verify');
    const ret = verify(result0, result1);
    _debugLog('[iface="arcjet:js-req/verify-bot", function="verify"] [Instruction::CallInterface] (sync, @ post-call)');
    endCurrentTask(0);
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
    _debugLog('[iface="arcjet:js-req/verify-bot", function="verify"][Instruction::Return]', {
      funcName: 'verify',
      paramCount: 1,
      async: false,
      postReturn: false
    });
    return enum2;
  }
  
  
  function trampoline2(arg0, arg1, arg2) {
    var ptr0 = arg0;
    var len0 = arg1;
    var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
    _debugLog('[iface="arcjet:js-req/filter-overrides", function="ip-lookup"] [Instruction::CallInterface] (async? sync, @ enter)');
    startCurrentTask(0, false, 'ip-lookup');
    const ret = ipLookup(result0);
    _debugLog('[iface="arcjet:js-req/filter-overrides", function="ip-lookup"] [Instruction::CallInterface] (sync, @ post-call)');
    endCurrentTask(0);
    var variant2 = ret;
    if (variant2 === null || variant2=== undefined) {
      dataView(memory0).setInt8(arg2 + 0, 0, true);
    } else {
      const e = variant2;
      dataView(memory0).setInt8(arg2 + 0, 1, true);
      var ptr1 = utf8Encode(e, realloc0, memory0);
      var len1 = utf8EncodedLen;
      dataView(memory0).setUint32(arg2 + 8, len1, true);
      dataView(memory0).setUint32(arg2 + 4, ptr1, true);
    }
    _debugLog('[iface="arcjet:js-req/filter-overrides", function="ip-lookup"][Instruction::Return]', {
      funcName: 'ip-lookup',
      paramCount: 0,
      async: false,
      postReturn: false
    });
  }
  
  
  function trampoline3(arg0, arg1, arg2) {
    var len1 = arg1;
    var base1 = arg0;
    var result1 = [];
    for (let i = 0; i < len1; i++) {
      const base = base1 + i * 8;
      var ptr0 = dataView(memory0).getUint32(base + 0, true);
      var len0 = dataView(memory0).getUint32(base + 4, true);
      var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
      result1.push(result0);
    }
    _debugLog('[iface="arcjet:js-req/sensitive-information-identifier", function="detect"] [Instruction::CallInterface] (async? sync, @ enter)');
    startCurrentTask(0, false, 'detect');
    const ret = detect$1(result1);
    _debugLog('[iface="arcjet:js-req/sensitive-information-identifier", function="detect"] [Instruction::CallInterface] (sync, @ post-call)');
    endCurrentTask(0);
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
            dataView(memory0).setUint32(base + 12, len2, true);
            dataView(memory0).setUint32(base + 8, ptr2, true);
            break;
          }
          default: {
            throw new TypeError(`invalid variant tag value \`${JSON.stringify(variant3.tag)}\` (received \`${variant3}\`) specified for \`SensitiveInfoEntity\``);
          }
        }
      }
    }
    dataView(memory0).setUint32(arg2 + 4, len5, true);
    dataView(memory0).setUint32(arg2 + 0, result5, true);
    _debugLog('[iface="arcjet:js-req/sensitive-information-identifier", function="detect"][Instruction::Return]', {
      funcName: 'detect',
      paramCount: 0,
      async: false,
      postReturn: false
    });
  }
  
  
  function trampoline4(arg0, arg1) {
    var ptr0 = arg0;
    var len0 = arg1;
    var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
    _debugLog('[iface="arcjet:js-req/email-validator-overrides", function="is-free-email"] [Instruction::CallInterface] (async? sync, @ enter)');
    startCurrentTask(0, false, 'is-free-email');
    const ret = isFreeEmail(result0);
    _debugLog('[iface="arcjet:js-req/email-validator-overrides", function="is-free-email"] [Instruction::CallInterface] (sync, @ post-call)');
    endCurrentTask(0);
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
    _debugLog('[iface="arcjet:js-req/email-validator-overrides", function="is-free-email"][Instruction::Return]', {
      funcName: 'is-free-email',
      paramCount: 1,
      async: false,
      postReturn: false
    });
    return enum1;
  }
  
  
  function trampoline5(arg0, arg1) {
    var ptr0 = arg0;
    var len0 = arg1;
    var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
    _debugLog('[iface="arcjet:js-req/email-validator-overrides", function="is-disposable-email"] [Instruction::CallInterface] (async? sync, @ enter)');
    startCurrentTask(0, false, 'is-disposable-email');
    const ret = isDisposableEmail(result0);
    _debugLog('[iface="arcjet:js-req/email-validator-overrides", function="is-disposable-email"] [Instruction::CallInterface] (sync, @ post-call)');
    endCurrentTask(0);
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
    _debugLog('[iface="arcjet:js-req/email-validator-overrides", function="is-disposable-email"][Instruction::Return]', {
      funcName: 'is-disposable-email',
      paramCount: 1,
      async: false,
      postReturn: false
    });
    return enum1;
  }
  
  
  function trampoline6(arg0, arg1) {
    var ptr0 = arg0;
    var len0 = arg1;
    var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
    _debugLog('[iface="arcjet:js-req/email-validator-overrides", function="has-mx-records"] [Instruction::CallInterface] (async? sync, @ enter)');
    startCurrentTask(0, false, 'has-mx-records');
    const ret = hasMxRecords(result0);
    _debugLog('[iface="arcjet:js-req/email-validator-overrides", function="has-mx-records"] [Instruction::CallInterface] (sync, @ post-call)');
    endCurrentTask(0);
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
    _debugLog('[iface="arcjet:js-req/email-validator-overrides", function="has-mx-records"][Instruction::Return]', {
      funcName: 'has-mx-records',
      paramCount: 1,
      async: false,
      postReturn: false
    });
    return enum1;
  }
  
  
  function trampoline7(arg0, arg1) {
    var ptr0 = arg0;
    var len0 = arg1;
    var result0 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr0, len0));
    _debugLog('[iface="arcjet:js-req/email-validator-overrides", function="has-gravatar"] [Instruction::CallInterface] (async? sync, @ enter)');
    startCurrentTask(0, false, 'has-gravatar');
    const ret = hasGravatar(result0);
    _debugLog('[iface="arcjet:js-req/email-validator-overrides", function="has-gravatar"] [Instruction::CallInterface] (sync, @ post-call)');
    endCurrentTask(0);
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
    _debugLog('[iface="arcjet:js-req/email-validator-overrides", function="has-gravatar"][Instruction::Return]', {
      funcName: 'has-gravatar',
      paramCount: 1,
      async: false,
      postReturn: false
    });
    return enum1;
  }
  
  let exports2;
  let postReturn0;
  let postReturn1;
  let postReturn2;
  let postReturn3;
  let postReturn4;
  let postReturn5;
  Promise.all([module0, module1, module2]).catch(() => {});
  ({ exports: exports0 } = yield instantiateCore(yield module1));
  ({ exports: exports1 } = yield instantiateCore(yield module0, {
    'arcjet:js-req/bot-identifier': {
      detect: exports0['0'],
    },
    'arcjet:js-req/email-validator-overrides': {
      'has-gravatar': exports0['7'],
      'has-mx-records': exports0['6'],
      'is-disposable-email': exports0['5'],
      'is-free-email': exports0['4'],
    },
    'arcjet:js-req/filter-overrides': {
      'ip-lookup': exports0['2'],
    },
    'arcjet:js-req/sensitive-information-identifier': {
      detect: exports0['3'],
    },
    'arcjet:js-req/verify-bot': {
      verify: exports0['1'],
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
      '6': trampoline6,
      '7': trampoline7,
    },
  }));
  postReturn0 = exports1['cabi_post_detect-bot'];
  postReturn1 = exports1['cabi_post_match-filters'];
  postReturn2 = exports1['cabi_post_generate-fingerprint'];
  postReturn3 = exports1['cabi_post_validate-characteristics'];
  postReturn4 = exports1['cabi_post_is-valid-email'];
  postReturn5 = exports1['cabi_post_detect-sensitive-info'];
  let exports1DetectBot;
  
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
          dataView(memory0).setUint32(base + 4, len2, true);
          dataView(memory0).setUint32(base + 0, ptr2, true);
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
          dataView(memory0).setUint32(base + 4, len5, true);
          dataView(memory0).setUint32(base + 0, ptr5, true);
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
    _debugLog('[iface="detect-bot", function="detect-bot"][Instruction::CallWasm] enter', {
      funcName: 'detect-bot',
      paramCount: 6,
      async: false,
      postReturn: true,
    });
    startCurrentTask(0, false, 'exports1DetectBot');
    const ret = exports1DetectBot(ptr0, len0, variant7_0, variant7_1, variant7_2, variant7_3);
    endCurrentTask(0);
    let variant15;
    switch (dataView(memory0).getUint8(ret + 0, true)) {
      case 0: {
        var len9 = dataView(memory0).getUint32(ret + 8, true);
        var base9 = dataView(memory0).getUint32(ret + 4, true);
        var result9 = [];
        for (let i = 0; i < len9; i++) {
          const base = base9 + i * 8;
          var ptr8 = dataView(memory0).getUint32(base + 0, true);
          var len8 = dataView(memory0).getUint32(base + 4, true);
          var result8 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr8, len8));
          result9.push(result8);
        }
        var len11 = dataView(memory0).getUint32(ret + 16, true);
        var base11 = dataView(memory0).getUint32(ret + 12, true);
        var result11 = [];
        for (let i = 0; i < len11; i++) {
          const base = base11 + i * 8;
          var ptr10 = dataView(memory0).getUint32(base + 0, true);
          var len10 = dataView(memory0).getUint32(base + 4, true);
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
        var ptr14 = dataView(memory0).getUint32(ret + 4, true);
        var len14 = dataView(memory0).getUint32(ret + 8, true);
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
    _debugLog('[iface="detect-bot", function="detect-bot"][Instruction::Return]', {
      funcName: 'detect-bot',
      paramCount: 1,
      async: false,
      postReturn: true
    });
    const retCopy = variant15;
    
    let cstate = getOrCreateAsyncState(0);
    cstate.mayLeave = false;
    postReturn0(ret);
    cstate.mayLeave = true;
    
    
    
    if (typeof retCopy === 'object' && retCopy.tag === 'err') {
      throw new ComponentError(retCopy.val);
    }
    return retCopy.val;
    
  }
  let exports1MatchFilters;
  
  function matchFilters(arg0, arg1, arg2) {
    var ptr0 = utf8Encode(arg0, realloc0, memory0);
    var len0 = utf8EncodedLen;
    var vec2 = arg1;
    var len2 = vec2.length;
    var result2 = realloc0(0, 0, 4, len2 * 8);
    for (let i = 0; i < vec2.length; i++) {
      const e = vec2[i];
      const base = result2 + i * 8;var ptr1 = utf8Encode(e, realloc0, memory0);
      var len1 = utf8EncodedLen;
      dataView(memory0).setUint32(base + 4, len1, true);
      dataView(memory0).setUint32(base + 0, ptr1, true);
    }
    _debugLog('[iface="match-filters", function="match-filters"][Instruction::CallWasm] enter', {
      funcName: 'match-filters',
      paramCount: 5,
      async: false,
      postReturn: true,
    });
    startCurrentTask(0, false, 'exports1MatchFilters');
    const ret = exports1MatchFilters(ptr0, len0, result2, len2, arg2 ? 1 : 0);
    endCurrentTask(0);
    let variant9;
    switch (dataView(memory0).getUint8(ret + 0, true)) {
      case 0: {
        var bool3 = dataView(memory0).getUint8(ret + 4, true);
        var len5 = dataView(memory0).getUint32(ret + 12, true);
        var base5 = dataView(memory0).getUint32(ret + 8, true);
        var result5 = [];
        for (let i = 0; i < len5; i++) {
          const base = base5 + i * 8;
          var ptr4 = dataView(memory0).getUint32(base + 0, true);
          var len4 = dataView(memory0).getUint32(base + 4, true);
          var result4 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr4, len4));
          result5.push(result4);
        }
        var len7 = dataView(memory0).getUint32(ret + 20, true);
        var base7 = dataView(memory0).getUint32(ret + 16, true);
        var result7 = [];
        for (let i = 0; i < len7; i++) {
          const base = base7 + i * 8;
          var ptr6 = dataView(memory0).getUint32(base + 0, true);
          var len6 = dataView(memory0).getUint32(base + 4, true);
          var result6 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr6, len6));
          result7.push(result6);
        }
        variant9= {
          tag: 'ok',
          val: {
            allowed: bool3 == 0 ? false : (bool3 == 1 ? true : throwInvalidBool()),
            matchedExpressions: result5,
            undeterminedExpressions: result7,
          }
        };
        break;
      }
      case 1: {
        var ptr8 = dataView(memory0).getUint32(ret + 4, true);
        var len8 = dataView(memory0).getUint32(ret + 8, true);
        var result8 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr8, len8));
        variant9= {
          tag: 'err',
          val: result8
        };
        break;
      }
      default: {
        throw new TypeError('invalid variant discriminant for expected');
      }
    }
    _debugLog('[iface="match-filters", function="match-filters"][Instruction::Return]', {
      funcName: 'match-filters',
      paramCount: 1,
      async: false,
      postReturn: true
    });
    const retCopy = variant9;
    
    let cstate = getOrCreateAsyncState(0);
    cstate.mayLeave = false;
    postReturn1(ret);
    cstate.mayLeave = true;
    
    
    
    if (typeof retCopy === 'object' && retCopy.tag === 'err') {
      throw new ComponentError(retCopy.val);
    }
    return retCopy.val;
    
  }
  let exports1GenerateFingerprint;
  
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
      dataView(memory0).setUint32(base + 4, len1, true);
      dataView(memory0).setUint32(base + 0, ptr1, true);
    }
    _debugLog('[iface="generate-fingerprint", function="generate-fingerprint"][Instruction::CallWasm] enter', {
      funcName: 'generate-fingerprint',
      paramCount: 4,
      async: false,
      postReturn: true,
    });
    startCurrentTask(0, false, 'exports1GenerateFingerprint');
    const ret = exports1GenerateFingerprint(ptr0, len0, result2, len2);
    endCurrentTask(0);
    let variant5;
    switch (dataView(memory0).getUint8(ret + 0, true)) {
      case 0: {
        var ptr3 = dataView(memory0).getUint32(ret + 4, true);
        var len3 = dataView(memory0).getUint32(ret + 8, true);
        var result3 = utf8Decoder.decode(new Uint8Array(memory0.buffer, ptr3, len3));
        variant5= {
          tag: 'ok',
          val: result3
        };
        break;
      }
      case 1: {
        var ptr4 = dataView(memory0).getUint32(ret + 4, true);
        var len4 = dataView(memory0).getUint32(ret + 8, true);
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
    _debugLog('[iface="generate-fingerprint", function="generate-fingerprint"][Instruction::Return]', {
      funcName: 'generate-fingerprint',
      paramCount: 1,
      async: false,
      postReturn: true
    });
    const retCopy = variant5;
    
    let cstate = getOrCreateAsyncState(0);
    cstate.mayLeave = false;
    postReturn2(ret);
    cstate.mayLeave = true;
    
    
    
    if (typeof retCopy === 'object' && retCopy.tag === 'err') {
      throw new ComponentError(retCopy.val);
    }
    return retCopy.val;
    
  }
  let exports1ValidateCharacteristics;
  
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
      dataView(memory0).setUint32(base + 4, len1, true);
      dataView(memory0).setUint32(base + 0, ptr1, true);
    }
    _debugLog('[iface="validate-characteristics", function="validate-characteristics"][Instruction::CallWasm] enter', {
      funcName: 'validate-characteristics',
      paramCount: 4,
      async: false,
      postReturn: true,
    });
    startCurrentTask(0, false, 'exports1ValidateCharacteristics');
    const ret = exports1ValidateCharacteristics(ptr0, len0, result2, len2);
    endCurrentTask(0);
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
        var ptr3 = dataView(memory0).getUint32(ret + 4, true);
        var len3 = dataView(memory0).getUint32(ret + 8, true);
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
    _debugLog('[iface="validate-characteristics", function="validate-characteristics"][Instruction::Return]', {
      funcName: 'validate-characteristics',
      paramCount: 1,
      async: false,
      postReturn: true
    });
    const retCopy = variant4;
    
    let cstate = getOrCreateAsyncState(0);
    cstate.mayLeave = false;
    postReturn3(ret);
    cstate.mayLeave = true;
    
    
    
    if (typeof retCopy === 'object' && retCopy.tag === 'err') {
      throw new ComponentError(retCopy.val);
    }
    return retCopy.val;
    
  }
  let exports1IsValidEmail;
  
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
          dataView(memory0).setUint32(base + 4, len2, true);
          dataView(memory0).setUint32(base + 0, ptr2, true);
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
          dataView(memory0).setUint32(base + 4, len5, true);
          dataView(memory0).setUint32(base + 0, ptr5, true);
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
    _debugLog('[iface="is-valid-email", function="is-valid-email"][Instruction::CallWasm] enter', {
      funcName: 'is-valid-email',
      paramCount: 7,
      async: false,
      postReturn: true,
    });
    startCurrentTask(0, false, 'exports1IsValidEmail');
    const ret = exports1IsValidEmail(ptr0, len0, variant7_0, variant7_1, variant7_2, variant7_3, variant7_4);
    endCurrentTask(0);
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
        var len10 = dataView(memory0).getUint32(ret + 12, true);
        var base10 = dataView(memory0).getUint32(ret + 8, true);
        var result10 = [];
        for (let i = 0; i < len10; i++) {
          const base = base10 + i * 8;
          var ptr9 = dataView(memory0).getUint32(base + 0, true);
          var len9 = dataView(memory0).getUint32(base + 4, true);
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
        var ptr11 = dataView(memory0).getUint32(ret + 4, true);
        var len11 = dataView(memory0).getUint32(ret + 8, true);
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
    _debugLog('[iface="is-valid-email", function="is-valid-email"][Instruction::Return]', {
      funcName: 'is-valid-email',
      paramCount: 1,
      async: false,
      postReturn: true
    });
    const retCopy = variant12;
    
    let cstate = getOrCreateAsyncState(0);
    cstate.mayLeave = false;
    postReturn4(ret);
    cstate.mayLeave = true;
    
    
    
    if (typeof retCopy === 'object' && retCopy.tag === 'err') {
      throw new ComponentError(retCopy.val);
    }
    return retCopy.val;
    
  }
  let exports1DetectSensitiveInfo;
  
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
              dataView(memory0).setUint32(base + 8, len2, true);
              dataView(memory0).setUint32(base + 4, ptr2, true);
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
              dataView(memory0).setUint32(base + 8, len5, true);
              dataView(memory0).setUint32(base + 4, ptr5, true);
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
    _debugLog('[iface="detect-sensitive-info", function="detect-sensitive-info"][Instruction::CallWasm] enter', {
      funcName: 'detect-sensitive-info',
      paramCount: 8,
      async: false,
      postReturn: true,
    });
    startCurrentTask(0, false, 'exports1DetectSensitiveInfo');
    const ret = exports1DetectSensitiveInfo(ptr0, len0, variant8_0, variant8_1, variant8_2, variant9_0, variant9_1, v1_2 ? 1 : 0);
    endCurrentTask(0);
    var len12 = dataView(memory0).getUint32(ret + 4, true);
    var base12 = dataView(memory0).getUint32(ret + 0, true);
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
          var ptr10 = dataView(memory0).getUint32(base + 12, true);
          var len10 = dataView(memory0).getUint32(base + 16, true);
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
    var len15 = dataView(memory0).getUint32(ret + 12, true);
    var base15 = dataView(memory0).getUint32(ret + 8, true);
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
          var ptr13 = dataView(memory0).getUint32(base + 12, true);
          var len13 = dataView(memory0).getUint32(base + 16, true);
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
    _debugLog('[iface="detect-sensitive-info", function="detect-sensitive-info"][Instruction::Return]', {
      funcName: 'detect-sensitive-info',
      paramCount: 1,
      async: false,
      postReturn: true
    });
    const retCopy = {
      allowed: result12,
      denied: result15,
    };
    
    let cstate = getOrCreateAsyncState(0);
    cstate.mayLeave = false;
    postReturn5(ret);
    cstate.mayLeave = true;
    return retCopy;
    
  }
  exports1DetectBot = exports1['detect-bot'];
  exports1MatchFilters = exports1['match-filters'];
  exports1GenerateFingerprint = exports1['generate-fingerprint'];
  exports1ValidateCharacteristics = exports1['validate-characteristics'];
  exports1IsValidEmail = exports1['is-valid-email'];
  exports1DetectSensitiveInfo = exports1['detect-sensitive-info'];
  
  return { detectBot, detectSensitiveInfo, generateFingerprint, isValidEmail, matchFilters, validateCharacteristics,  };
})();
let promise, resolve, reject;
function runNext (value) {
  try {
    let done;
    do {
      ({ value, done } = gen.next(value));
    } while (!(value instanceof Promise) && !done);
    if (done) {
      if (resolve) return resolve(value);
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
