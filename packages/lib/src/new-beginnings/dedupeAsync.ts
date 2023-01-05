// dedup-async https://github.com/nanw1103/dedup-async

// Copyright (c) 2017 Nan Wang

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

class PromiseHolder<V> {
  resolve: ((value: V | PromiseLike<V>) => void) | undefined;
  reject: ((reason?: any) => void) | undefined;

  promise(): Promise<V> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  onResolve(data: any) {
    this.resolve?.(data);
  }

  onReject(err: any) {
    this.reject?.(err);
  }
}

class DedupeAsync<T extends () => Promise<void>, V = Awaited<ReturnType<T>>> {
  callbacks: PromiseHolder<V>[] = [];

  constructor(private task: T) {
    if (typeof task !== "function")
      throw (
        "DedupAsync: incorrect c'tor argument. Expect function, but: " +
        typeof task
      );
  }

  async run(me: any) {
    if (this.callbacks.length === 0) {
      process.nextTick(() => {
        try {
          const ret = this.task.apply(me);
          if (!ret.then || typeof ret.then !== "function") this.onResolve(ret);
          else
            ret.then((d) => this.onResolve(d)).catch((e) => this.onReject(e));
        } catch (e) {
          this.onReject(e);
        }
      });
    }
    const ph = new PromiseHolder<V>();
    this.callbacks.push(ph);
    return ph.promise();
  }

  onResolve(data: any) {
    this.callbacks.forEach((p) => p.onResolve(data));
    this.callbacks = [];
  }

  onReject(err: any) {
    this.callbacks.forEach((p) => p.onReject(err));
    this.callbacks = [];
  }
}

interface DedupedFn {
  (): Promise<any>;
  _dedupasync?: DedupeAsync<this>;
}

export function dedupeAsync<T extends DedupedFn>(this: void, impl: T) {
  if (!impl._dedupasync)
    Object.defineProperty(impl, "_dedupasync", {
      value: new DedupeAsync(impl),
    });

  return impl._dedupasync!.run(this);
}
